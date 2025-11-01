/**
 * Extension Compatibility Matrix Service
 * Manages compatibility matrix for extensions, provides pre-installation validation
 * Prevents conflicting extensions from being deployed together
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';
import {
  CompatibilityCheckResult,
  CompatibilityContext,
  CompatibilityTestResult,
  CompatibilityTestSuite,
  ConflictDetail,
  DependencyCompatibilityRecord,
  ExtensionCompatibilityRecord,
  ExtensionInstallRequest,
  InstallationCompatibilityResult,
  CapabilityCompatibilityRecord,
  CompatibilityError,
} from '../types/extensionCompatibility';

/**
 * ExtensionCompatibilityMatrixService
 * Central service for managing extension compatibility
 */
export class ExtensionCompatibilityMatrixService {
  private readonly prisma: PrismaClient;
  private readonly logger: Logger;
  private compatibilityCache: Map<string, CompatibilityCheckResult> = new Map();
  private cacheExpireMs = 3600000; // 1 hour

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Check if a single extension is compatible with the current environment
   */
  async checkCompatibility(
    extensionId: string,
    version: string,
    context: CompatibilityContext
  ): Promise<CompatibilityCheckResult> {
    const cacheKey = `${extensionId}:${version}:${context.mesVersion}`;

    // Check cache
    const cached = this.compatibilityCache.get(cacheKey);
    if (cached && cached.checkedAt.getTime() + this.cacheExpireMs > Date.now()) {
      this.logger.debug(`Using cached compatibility result for ${cacheKey}`);
      return { ...cached, cached: true };
    }

    this.logger.info(`Checking compatibility for ${extensionId}@${version} on MES ${context.mesVersion}`);

    const conflicts: ConflictDetail[] = [];
    const warnings: ConflictDetail[] = [];
    const suggestions: string[] = [];

    // 1. Check MES version compatibility
    const mesCompatible = await this.checkMESVersionCompatibility(extensionId, version, context.mesVersion);
    if (!mesCompatible.compatible) {
      conflicts.push(...mesCompatible.issues);
      suggestions.push(...mesCompatible.suggestions);
    }

    // 2. Check platform capability requirements
    const capabilityCheck = await this.checkPlatformCapabilities(
      extensionId,
      version,
      context.platformCapabilities
    );
    if (!capabilityCheck.compatible) {
      conflicts.push(...capabilityCheck.issues);
      suggestions.push(...capabilityCheck.suggestions);
    }

    // 3. Check for conflicts with installed extensions
    const extensionConflicts = await this.checkInstalledExtensionConflicts(
      extensionId,
      version,
      context.installedExtensions
    );
    if (extensionConflicts.conflicts.length > 0) {
      conflicts.push(...extensionConflicts.conflicts);
      suggestions.push(...extensionConflicts.suggestions);
    }
    if (extensionConflicts.warnings.length > 0) {
      warnings.push(...extensionConflicts.warnings);
    }

    // 4. Check for hook conflicts
    const hookConflicts = await this.checkHookConflicts(
      extensionId,
      version,
      context.installedExtensions
    );
    if (hookConflicts.conflicts.length > 0) {
      conflicts.push(...hookConflicts.conflicts);
      suggestions.push(...hookConflicts.suggestions);
    }
    if (hookConflicts.warnings.length > 0) {
      warnings.push(...hookConflicts.warnings);
    }

    // 5. Check for route collisions
    const routeConflicts = await this.checkRouteCollisions(
      extensionId,
      version,
      context.installedExtensions
    );
    if (routeConflicts.conflicts.length > 0) {
      conflicts.push(...routeConflicts.conflicts);
      suggestions.push(...routeConflicts.suggestions);
    }

    const result: CompatibilityCheckResult = {
      compatible: conflicts.length === 0,
      extensionId,
      extensionVersion: version,
      mesVersion: context.mesVersion,
      conflicts,
      warnings,
      suggestions,
      checkedAt: new Date(),
      cached: false,
    };

    // Store in cache
    this.compatibilityCache.set(cacheKey, result);

    // Store in database for audit trail
    await this.storeCompatibilityCheck(result);

    return result;
  }

  /**
   * Check MES version compatibility for an extension
   */
  private async checkMESVersionCompatibility(
    extensionId: string,
    version: string,
    mesVersion: string
  ): Promise<{
    compatible: boolean;
    issues: ConflictDetail[];
    suggestions: string[];
  }> {
    const matrix = await this.prisma.extensionCompatibilityMatrix.findUnique({
      where: {
        extensionId_extensionVersion: {
          extensionId,
          extensionVersion: version,
        },
      },
    });

    if (!matrix) {
      return {
        compatible: false,
        issues: [
          {
            type: 'error',
            code: 'NO_COMPATIBILITY_RECORD',
            extension1Id: extensionId,
            extension1Version: version,
            message: `No compatibility record found for ${extensionId}@${version}`,
            suggestion: 'Extension may not be tested or registered in compatibility matrix',
          },
        ],
        suggestions: [
          'Register extension in compatibility matrix',
          'Run compatibility tests for this extension version',
        ],
      };
    }

    const mesVersionNum = this.parseVersion(mesVersion);
    const minVersionNum = this.parseVersion(matrix.mesVersionMin);
    const maxVersionNum = matrix.mesVersionMax ? this.parseVersion(matrix.mesVersionMax) : null;

    const tooOld = mesVersionNum < minVersionNum;
    const tooNew = maxVersionNum && mesVersionNum > maxVersionNum;

    if (tooOld || tooNew) {
      return {
        compatible: false,
        issues: [
          {
            type: 'error',
            code: 'MES_VERSION_INCOMPATIBLE',
            extension1Id: extensionId,
            extension1Version: version,
            message: `${extensionId}@${version} requires MES ${matrix.mesVersionMin}${maxVersionNum ? `-${matrix.mesVersionMax}` : ' or higher'}. Current: ${mesVersion}`,
          },
        ],
        suggestions: [
          tooOld
            ? `Upgrade MES to at least ${matrix.mesVersionMin}`
            : `Upgrade to ${extensionId} version compatible with MES ${mesVersion}`,
        ],
      };
    }

    return {
      compatible: true,
      issues: [],
      suggestions: [],
    };
  }

  /**
   * Check if platform has required capabilities
   */
  private async checkPlatformCapabilities(
    extensionId: string,
    version: string,
    availableCapabilities: string[]
  ): Promise<{
    compatible: boolean;
    issues: ConflictDetail[];
    suggestions: string[];
  }> {
    const matrix = await this.prisma.extensionCompatibilityMatrix.findUnique({
      where: {
        extensionId_extensionVersion: {
          extensionId,
          extensionVersion: version,
        },
      },
    });

    if (!matrix?.platformCapabilities) {
      return {
        compatible: true,
        issues: [],
        suggestions: [],
      };
    }

    const requiredCapabilities = Array.isArray(matrix.platformCapabilities)
      ? matrix.platformCapabilities
      : [];
    const missingCapabilities = requiredCapabilities.filter((cap) => !availableCapabilities.includes(cap));

    if (missingCapabilities.length > 0) {
      return {
        compatible: false,
        issues: missingCapabilities.map((cap) => ({
          type: 'error' as const,
          code: 'MISSING_PLATFORM_CAPABILITY',
          extension1Id: extensionId,
          extension1Version: version,
          resource: cap,
          message: `Extension requires platform capability '${cap}' which is not available`,
        })),
        suggestions: [
          `Enable or install the following platform capabilities: ${missingCapabilities.join(', ')}`,
        ],
      };
    }

    return {
      compatible: true,
      issues: [],
      suggestions: [],
    };
  }

  /**
   * Check for conflicts with already installed extensions
   */
  private async checkInstalledExtensionConflicts(
    extensionId: string,
    version: string,
    installedExtensions: any[]
  ): Promise<{
    conflicts: ConflictDetail[];
    warnings: ConflictDetail[];
    suggestions: string[];
  }> {
    const conflicts: ConflictDetail[] = [];
    const warnings: ConflictDetail[] = [];
    const suggestions: string[] = [];

    for (const installed of installedExtensions) {
      if (installed.status !== 'active') continue;

      const depCompat = await this.prisma.extensionDependencyCompatibility.findFirst({
        where: {
          OR: [
            {
              sourceExtensionId: extensionId,
              sourceVersion: version,
              targetExtensionId: installed.extensionId,
            },
            {
              sourceExtensionId: installed.extensionId,
              targetExtensionId: extensionId,
              targetVersionMin: version,
            },
          ],
        },
      });

      if (depCompat && depCompat.compatibilityType === 'incompatible') {
        conflicts.push({
          type: 'error',
          code: 'EXTENSION_INCOMPATIBLE',
          extension1Id: extensionId,
          extension1Version: version,
          extension2Id: installed.extensionId,
          extension2Version: installed.version,
          message: `${extensionId}@${version} is incompatible with installed ${installed.extensionId}@${installed.version}`,
          suggestion: depCompat.notes,
        });

        suggestions.push(`Uninstall ${installed.extensionId} before installing ${extensionId}`);
      } else if (depCompat && depCompat.compatibilityType === 'requires') {
        // Check version requirement
        const installedVersionNum = this.parseVersion(installed.version);
        const minRequired = this.parseVersion(depCompat.targetVersionMin);
        const maxRequired = depCompat.targetVersionMax
          ? this.parseVersion(depCompat.targetVersionMax)
          : null;

        if (installedVersionNum < minRequired || (maxRequired && installedVersionNum > maxRequired)) {
          conflicts.push({
            type: 'error',
            code: 'DEPENDENCY_VERSION_MISMATCH',
            extension1Id: extensionId,
            extension1Version: version,
            extension2Id: installed.extensionId,
            extension2Version: installed.version,
            message: `${extensionId}@${version} requires ${installed.extensionId}@${depCompat.targetVersionMin}${maxRequired ? `-${depCompat.targetVersionMax}` : '+'}. Installed: ${installed.version}`,
          });

          suggestions.push(
            `Upgrade ${installed.extensionId} to version ${depCompat.targetVersionMin} or higher`
          );
        }
      }
    }

    return {
      conflicts,
      warnings,
      suggestions,
    };
  }

  /**
   * Check for hook execution conflicts
   */
  private async checkHookConflicts(
    extensionId: string,
    version: string,
    installedExtensions: any[]
  ): Promise<{
    conflicts: ConflictDetail[];
    warnings: ConflictDetail[];
    suggestions: string[];
  }> {
    const warnings: ConflictDetail[] = [];
    const suggestions: string[] = [];

    // Check if manifest declares hooks and any installed extensions also declare same hooks
    // This is a warning, not an error - hooks can have multiple handlers with priorities
    // For now, we'll log it as a warning
    const hookConflictWarnings = installedExtensions
      .filter((ext) => ext.hooked && ext.hooked.length > 0)
      .map((ext) => ({
        type: 'warning' as const,
        code: 'HOOK_EXECUTION_ORDER',
        extension1Id: extensionId,
        extension1Version: version,
        extension2Id: ext.extensionId,
        extension2Version: ext.version,
        message: `Both ${extensionId} and ${ext.extensionId} register hooks. Execution order will be priority-based.`,
        suggestion: 'Review hook priorities in extension manifest to ensure desired execution order',
      }));

    warnings.push(...hookConflictWarnings);

    if (hookConflictWarnings.length > 0) {
      suggestions.push('Configure hook priorities in extension manifest');
    }

    return {
      conflicts: [],
      warnings,
      suggestions,
    };
  }

  /**
   * Check for route collisions
   */
  private async checkRouteCollisions(
    extensionId: string,
    version: string,
    installedExtensions: any[]
  ): Promise<{
    conflicts: ConflictDetail[];
    suggestions: string[];
  }> {
    const conflicts: ConflictDetail[] = [];
    const suggestions: string[] = [];

    // Check for route collisions with installed extensions
    for (const installed of installedExtensions) {
      if (!installed.registeredRoutes || installed.registeredRoutes.length === 0) continue;

      // This would require analyzing the new extension's routes
      // For now, we'll create the infrastructure for it
      const depCompat = await this.prisma.extensionDependencyCompatibility.findFirst({
        where: {
          sourceExtensionId: extensionId,
          sourceVersion: version,
          targetExtensionId: installed.extensionId,
          conflictType: 'route',
        },
      });

      if (depCompat && depCompat.compatibilityType === 'incompatible') {
        conflicts.push({
          type: 'error',
          code: 'ROUTE_COLLISION',
          extension1Id: extensionId,
          extension1Version: version,
          extension2Id: installed.extensionId,
          extension2Version: installed.version,
          message: `${extensionId} and ${installed.extensionId} have conflicting routes`,
          suggestion: 'Use route namespacing or modify one extension to avoid collision',
        });

        suggestions.push(
          `Namespace routes in ${extensionId} or uninstall ${installed.extensionId}`
        );
      }
    }

    return { conflicts, suggestions };
  }

  /**
   * Check compatibility for bulk installation of multiple extensions
   */
  async checkInstallationCompatibility(
    extensionsToInstall: ExtensionInstallRequest[],
    context: CompatibilityContext
  ): Promise<InstallationCompatibilityResult> {
    this.logger.info(
      `Checking installation compatibility for ${extensionsToInstall.length} extensions`
    );

    const results: CompatibilityCheckResult[] = [];
    const allConflicts: ConflictDetail[] = [];
    const allWarnings: ConflictDetail[] = [];
    const allSuggestions: Set<string> = new Set();

    // Check each extension individually
    for (const ext of extensionsToInstall) {
      const result = await this.checkCompatibility(ext.extensionId, ext.version, context);
      results.push(result);

      if (!result.compatible) {
        allConflicts.push(...result.conflicts);
        allSuggestions.add(...result.suggestions);
      }
      if (result.warnings.length > 0) {
        allWarnings.push(...result.warnings);
        allSuggestions.add(...result.suggestions);
      }
    }

    // Check compatibility between extensions being installed
    for (let i = 0; i < extensionsToInstall.length; i++) {
      for (let j = i + 1; j < extensionsToInstall.length; j++) {
        const ext1 = extensionsToInstall[i];
        const ext2 = extensionsToInstall[j];

        const depCompat = await this.prisma.extensionDependencyCompatibility.findFirst({
          where: {
            OR: [
              {
                sourceExtensionId: ext1.extensionId,
                sourceVersion: ext1.version,
                targetExtensionId: ext2.extensionId,
              },
              {
                sourceExtensionId: ext2.extensionId,
                sourceVersion: ext2.version,
                targetExtensionId: ext1.extensionId,
              },
            ],
          },
        });

        if (depCompat && depCompat.compatibilityType === 'incompatible') {
          allConflicts.push({
            type: 'error',
            code: 'EXTENSION_PAIR_INCOMPATIBLE',
            extension1Id: ext1.extensionId,
            extension1Version: ext1.version,
            extension2Id: ext2.extensionId,
            extension2Version: ext2.version,
            message: `Cannot install ${ext1.extensionId} and ${ext2.extensionId} together`,
          });
        }
      }
    }

    // Determine installation order (topological sort by dependencies)
    const installationOrder = this.determineInstallationOrder(extensionsToInstall);

    const result: InstallationCompatibilityResult = {
      compatible: allConflicts.length === 0,
      totalExtensions: extensionsToInstall.length,
      compatibleCount: extensionsToInstall.length - results.filter((r) => !r.compatible).length,
      conflictingCount: results.filter((r) => !r.compatible).length,
      installationOrder,
      conflicts: allConflicts,
      warnings: allWarnings,
      suggestions: Array.from(allSuggestions),
      checkedAt: new Date(),
    };

    return result;
  }

  /**
   * Determine the correct order to install extensions based on dependencies
   */
  private determineInstallationOrder(extensions: ExtensionInstallRequest[]): string[] {
    // Simple topological sort
    // In a real implementation, this would use the dependency resolver
    const order: string[] = [];
    const added = new Set<string>();

    const addWithDependencies = (ext: ExtensionInstallRequest) => {
      const key = `${ext.extensionId}@${ext.version}`;
      if (added.has(key)) return;

      // Add this extension
      order.push(key);
      added.add(key);
    };

    for (const ext of extensions) {
      addWithDependencies(ext);
    }

    return order;
  }

  /**
   * Parse semantic version string to comparable number
   */
  private parseVersion(version: string): number {
    const parts = version.split('.');
    return (
      parseInt(parts[0] || '0', 10) * 10000 +
      parseInt(parts[1] || '0', 10) * 100 +
      parseInt(parts[2] || '0', 10)
    );
  }

  /**
   * Store compatibility check result in database for audit trail
   */
  private async storeCompatibilityCheck(result: CompatibilityCheckResult): Promise<void> {
    try {
      await this.prisma.extensionInstallationCompatibility.create({
        data: {
          installationRequestId: `${result.extensionId}:${result.extensionVersion}:${Date.now()}`,
          extensionId: result.extensionId,
          extensionVersion: result.extensionVersion,
          mesVersion: result.mesVersion,
          compatible: result.compatible,
          checkStatus: 'completed',
          conflictCount: result.conflicts.length,
          warningCount: result.warnings.length,
          conflicts: result.conflicts,
          warnings: result.warnings,
          suggestions: result.suggestions,
          expiresAt: new Date(Date.now() + 86400000), // 24 hours
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to store compatibility check: ${error}`);
      // Don't fail the operation if storage fails
    }
  }

  /**
   * Update compatibility matrix record
   */
  async updateCompatibilityRecord(record: ExtensionCompatibilityRecord): Promise<void> {
    await this.prisma.extensionCompatibilityMatrix.upsert({
      where: {
        extensionId_extensionVersion: {
          extensionId: record.extensionId,
          extensionVersion: record.extensionVersion,
        },
      },
      update: {
        mesVersionMin: record.mesVersionMin,
        mesVersionMax: record.mesVersionMax,
        platformCapabilities: record.platformCapabilities,
        tested: record.tested,
        testDate: record.testDate,
        testStatus: record.testStatus,
        testResults: record.testResults,
        notes: record.notes,
      },
      create: {
        extensionId: record.extensionId,
        extensionVersion: record.extensionVersion,
        mesVersionMin: record.mesVersionMin,
        mesVersionMax: record.mesVersionMax,
        platformCapabilities: record.platformCapabilities,
        tested: record.tested,
        testDate: record.testDate,
        testStatus: record.testStatus,
        testResults: record.testResults,
        notes: record.notes,
      },
    });

    // Invalidate cache
    const cacheKey = `${record.extensionId}:${record.extensionVersion}:*`;
    for (const [key] of this.compatibilityCache) {
      if (key.startsWith(`${record.extensionId}:${record.extensionVersion}:`)) {
        this.compatibilityCache.delete(key);
      }
    }

    this.logger.info(`Updated compatibility record for ${record.extensionId}@${record.extensionVersion}`);
  }

  /**
   * Clear compatibility cache
   */
  clearCache(): void {
    this.compatibilityCache.clear();
    this.logger.info('Cleared compatibility cache');
  }
}
