import { prisma } from '../lib/prisma';
import { PluginPackageStatus, PluginInstallationStatus, PluginDeploymentType, PluginDeploymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as semver from 'semver';

/**
 * PluginRegistryService
 *
 * Manages plugin registry operations including:
 * - Package submission and validation
 * - Approval workflow
 * - Installation management
 * - License validation
 * - Version management
 * - Dependency resolution
 */
export class PluginRegistryService {
  /**
   * Create or get a plugin registry
   */
  static async getOrCreateRegistry(
    type: 'ENTERPRISE' | 'SITE' | 'DEVELOPER',
    name: string,
    options?: {
      storageUrl: string;
      storageBucket?: string;
      enterpriseId?: string;
      siteId?: string;
      isDefault?: boolean;
    }
  ) {
    if (!options?.storageUrl) {
      throw new Error('Storage URL is required for plugin registry');
    }

    const registry = await prisma.pluginRegistry.upsert({
      where: {
        id: `${type}-${options.siteId || options.enterpriseId || 'default'}`,
      },
      update: {},
      create: {
        type,
        name,
        storageUrl: options.storageUrl,
        storageBucket: options.storageBucket,
        isDefault: options.isDefault ?? false,
        enterpriseId: options.enterpriseId,
        siteId: options.siteId,
      },
    });

    return registry;
  }

  /**
   * Submit a plugin package for approval
   */
  static async submitPlugin(
    registryId: string,
    pluginId: string,
    version: string,
    manifest: any,
    packageUrl: string,
    checksum: string,
    author: string,
    submittedBy: string
  ) {
    // Validate manifest
    this.validateManifest(manifest);

    // Check version format (SemVer)
    if (!semver.valid(version)) {
      throw new Error(`Invalid version format: ${version}. Must follow semantic versioning (MAJOR.MINOR.PATCH)`);
    }

    // Check if this version already exists
    const existing = await prisma.pluginPackage.findFirst({
      where: {
        registryId,
        pluginId,
        version,
      },
    });

    if (existing) {
      throw new Error(`Plugin ${pluginId} version ${version} already exists in this registry`);
    }

    // Create package in PENDING_REVIEW status
    const packageRecord = await prisma.pluginPackage.create({
      data: {
        registryId,
        pluginId,
        name: manifest.name,
        version,
        description: manifest.description,
        author,
        license: manifest.license || 'Proprietary',
        manifest,
        packageUrl,
        packageSize: 0, // Would be calculated from actual package
        checksum,
        apiVersion: manifest.apiVersion || '1.0.0',
        mesVersion: manifest.mesVersion || '>=1.0.0',
        permissions: manifest.permissions || [],
        dependencies: manifest.dependencies,
        status: 'PENDING_REVIEW',
        uploadedBy: submittedBy,
      },
      include: {
        registry: true,
      },
    });

    // Also create a submission record
    await prisma.pluginSubmission.create({
      data: {
        pluginId,
        name: manifest.name,
        version,
        author,
        manifest,
        packageUrl,
        checksum,
        submittedBy,
      },
    });

    return packageRecord;
  }

  /**
   * Approve a plugin package
   */
  static async approvePlugin(packageId: string, approvedBy: string) {
    const pkg = await prisma.pluginPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new Error(`Plugin package not found: ${packageId}`);
    }

    if (pkg.status !== 'PENDING_REVIEW' && pkg.status !== 'IN_REVIEW') {
      throw new Error(`Cannot approve plugin in ${pkg.status} status`);
    }

    return prisma.pluginPackage.update({
      where: { id: packageId },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Reject a plugin package
   */
  static async rejectPlugin(packageId: string, rejectionReason: string, rejectedBy: string) {
    const pkg = await prisma.pluginPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new Error(`Plugin package not found: ${packageId}`);
    }

    if (pkg.status !== 'PENDING_REVIEW' && pkg.status !== 'IN_REVIEW') {
      throw new Error(`Cannot reject plugin in ${pkg.status} status`);
    }

    return prisma.pluginPackage.update({
      where: { id: packageId },
      data: {
        status: 'REJECTED',
        rejectionReason,
        approvedBy: rejectedBy,
      },
    });
  }

  /**
   * Revoke a plugin due to security issue
   */
  static async revokePlugin(packageId: string, reason: string) {
    return prisma.pluginPackage.update({
      where: { id: packageId },
      data: {
        status: 'REVOKED',
        rejectionReason: reason,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Install a plugin at a site
   */
  static async installPlugin(
    packageId: string,
    siteId: string,
    configuration?: any,
    installedBy?: string
  ) {
    // Get package info
    const pkg = await prisma.pluginPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new Error(`Plugin package not found: ${packageId}`);
    }

    if (pkg.status !== 'APPROVED') {
      throw new Error(`Can only install APPROVED plugins. Current status: ${pkg.status}`);
    }

    // Check compatibility
    const supportedMESVersion = process.env.MES_VERSION || '1.0.0';
    if (!semver.satisfies(supportedMESVersion, pkg.mesVersion)) {
      throw new Error(`Plugin requires MES version ${pkg.mesVersion}, current version is ${supportedMESVersion}`);
    }

    // Resolve and check dependencies
    await this.resolveDependencies(packageId, siteId);

    // Check license if required
    const manifest = pkg.manifest as any;
    if (manifest.license !== 'Free' && manifest.licenseType !== 'FREE') {
      const license = await this.validateLicense(packageId, siteId);
      if (!license) {
        throw new Error('No valid license found for this plugin');
      }
    }

    // Create installation
    const installation = await prisma.pluginInstallation.create({
      data: {
        packageId,
        siteId,
        installedVersion: pkg.version,
        installedBy: installedBy || 'system',
        configuration,
        status: 'INSTALLING',
      },
      include: {
        package: true,
      },
    });

    // In a real implementation, this would trigger actual installation
    // For now, mark as installed
    await prisma.pluginInstallation.update({
      where: { id: installation.id },
      data: { status: 'INSTALLED' },
    });

    // Increment install count
    await prisma.pluginPackage.update({
      where: { id: packageId },
      data: { installCount: { increment: 1 } },
    });

    return installation;
  }

  /**
   * Activate a plugin at a site
   */
  static async activatePlugin(installationId: string) {
    const installation = await prisma.pluginInstallation.findUnique({
      where: { id: installationId },
    });

    if (!installation) {
      throw new Error(`Installation not found: ${installationId}`);
    }

    if (installation.status !== 'INSTALLED') {
      throw new Error(`Can only activate INSTALLED plugins. Current status: ${installation.status}`);
    }

    return prisma.pluginInstallation.update({
      where: { id: installationId },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });
  }

  /**
   * Uninstall a plugin from a site
   */
  static async uninstallPlugin(installationId: string) {
    const installation = await prisma.pluginInstallation.findUnique({
      where: { id: installationId },
      include: { package: true },
    });

    if (!installation) {
      throw new Error(`Installation not found: ${installationId}`);
    }

    await prisma.pluginInstallation.update({
      where: { id: installationId },
      data: {
        status: 'UNINSTALLED',
        deactivatedAt: new Date(),
      },
    });

    // Decrement install count
    await prisma.pluginPackage.update({
      where: { id: installation.packageId },
      data: { installCount: { decrement: 1 } },
    });

    return installation;
  }

  /**
   * Upgrade a plugin to a newer version
   */
  static async upgradePlugin(
    currentInstallationId: string,
    newPackageId: string,
    configuration?: any
  ) {
    const current = await prisma.pluginInstallation.findUnique({
      where: { id: currentInstallationId },
      include: { package: true },
    });

    if (!current) {
      throw new Error(`Current installation not found: ${currentInstallationId}`);
    }

    const newPackage = await prisma.pluginPackage.findUnique({
      where: { id: newPackageId },
    });

    if (!newPackage) {
      throw new Error(`New package not found: ${newPackageId}`);
    }

    // Verify it's the same plugin
    if (current.package.pluginId !== newPackage.pluginId) {
      throw new Error('Can only upgrade to a different version of the same plugin');
    }

    // Verify new version is higher
    if (!semver.gt(newPackage.version, current.package.version)) {
      throw new Error(`New version (${newPackage.version}) must be higher than current (${current.package.version})`);
    }

    // Create new installation with new package
    const newInstallation = await prisma.pluginInstallation.create({
      data: {
        packageId: newPackageId,
        siteId: current.siteId,
        installedVersion: newPackage.version,
        installedBy: 'system',
        configuration: configuration || current.configuration,
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    // Mark old installation as inactive
    await prisma.pluginInstallation.update({
      where: { id: currentInstallationId },
      data: { status: 'INACTIVE' },
    });

    // Increment install count for new package
    await prisma.pluginPackage.update({
      where: { id: newPackageId },
      data: { installCount: { increment: 1 } },
    });

    // Decrement for old package
    await prisma.pluginPackage.update({
      where: { id: current.packageId },
      data: { installCount: { decrement: 1 } },
    });

    return newInstallation;
  }

  /**
   * Resolve plugin dependencies
   */
  static async resolveDependencies(packageId: string, siteId: string): Promise<string[]> {
    const pkg = await prisma.pluginPackage.findUnique({
      where: { id: packageId },
      include: { registry: true },
    });

    if (!pkg) {
      throw new Error(`Plugin package not found: ${packageId}`);
    }

    if (!pkg.dependencies) {
      return [];
    }

    const resolved: string[] = [];
    const dependencies = pkg.dependencies as Record<string, string>;

    for (const [depPluginId, versionRange] of Object.entries(dependencies)) {
      // Find approved versions of dependency
      const depVersions = await prisma.pluginPackage.findMany({
        where: {
          pluginId: depPluginId,
          registryId: pkg.registryId,
          status: 'APPROVED',
        },
        orderBy: { version: 'desc' },
      });

      if (depVersions.length === 0) {
        throw new Error(`Dependency not found: ${depPluginId}@${versionRange}`);
      }

      // Find compatible version
      const compatible = depVersions.find(v => semver.satisfies(v.version, versionRange));
      if (!compatible) {
        throw new Error(
          `No compatible version found for dependency ${depPluginId}@${versionRange}. ` +
          `Available versions: ${depVersions.map(v => v.version).join(', ')}`
        );
      }

      // Check if already installed
      const existing = await prisma.pluginInstallation.findFirst({
        where: {
          packageId: compatible.id,
          siteId,
          status: { notIn: ['UNINSTALLED', 'FAILED'] },
        },
      });

      if (!existing) {
        // Recursively install dependency
        await this.installPlugin(compatible.id, siteId, undefined, 'system');
      }

      resolved.push(compatible.id);
    }

    return resolved;
  }

  /**
   * Validate plugin manifest
   */
  private static validateManifest(manifest: any) {
    const required = ['id', 'name', 'version', 'author', 'apiVersion'];
    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Missing required manifest field: ${field}`);
      }
    }

    // Validate hook point names if present
    if (manifest.hooks) {
      const validHooks = [
        'workOrder.beforeCreate',
        'workOrder.afterCreate',
        'workOrder.beforeUpdate',
        'workOrder.afterUpdate',
        'material.beforeCreate',
        'material.afterCreate',
        'external.sync',
        'notification.send',
      ];

      for (const hook of manifest.hooks) {
        if (!validHooks.includes(hook)) {
          console.warn(`Warning: Unknown hook point: ${hook}`);
        }
      }
    }
  }

  /**
   * Validate plugin license
   */
  private static async validateLicense(packageId: string, siteId: string) {
    const license = await prisma.pluginLicense.findFirst({
      where: {
        packageId,
        OR: [
          { siteId },
          { expiresAt: { gte: new Date() } },
        ],
        isActive: true,
      },
    });

    return license;
  }

  /**
   * Get plugin installation status
   */
  static async getInstallationStatus(installationId: string) {
    return prisma.pluginInstallation.findUnique({
      where: { id: installationId },
      include: {
        package: true,
        healthLogs: {
          take: 10,
          orderBy: { recordedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Record plugin health metrics
   */
  static async recordHealth(installationId: string, metrics: {
    errorCount?: number;
    warningCount?: number;
    avgExecutionTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  }) {
    const installation = await prisma.pluginInstallation.findUnique({
      where: { id: installationId },
    });

    if (!installation) {
      throw new Error(`Installation not found: ${installationId}`);
    }

    // Record health log
    await prisma.pluginHealthLog.create({
      data: {
        installationId,
        errorCount: metrics.errorCount || 0,
        warningCount: metrics.warningCount || 0,
        avgExecutionTime: metrics.avgExecutionTime,
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage,
      },
    });

    // Update installation metrics
    await prisma.pluginInstallation.update({
      where: { id: installationId },
      data: {
        errorCount: metrics.errorCount || 0,
        lastHealthCheck: new Date(),
      },
    });
  }

  /**
   * Initiate multi-site deployment
   */
  static async deployToSites(
    packageId: string,
    siteIds: string[],
    deploymentType: 'INSTALL' | 'UPGRADE' | 'ROLLBACK',
    initiatedBy: string,
    scheduledFor?: Date
  ) {
    const pkg = await prisma.pluginPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new Error(`Plugin package not found: ${packageId}`);
    }

    return prisma.pluginDeployment.create({
      data: {
        packageId,
        deploymentType,
        targetSites: siteIds,
        scheduledFor,
        status: scheduledFor ? 'SCHEDULED' : 'IN_PROGRESS',
        initiatedBy,
      },
    });
  }

  /**
   * List approved plugins available for installation
   */
  static async getPluginCatalog(registryId?: string) {
    return prisma.pluginPackage.findMany({
      where: {
        status: 'APPROVED',
        ...(registryId && { registryId }),
      },
      orderBy: [{ installCount: 'desc' }, { uploadedAt: 'desc' }],
      include: {
        registry: true,
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}

export default PluginRegistryService;
