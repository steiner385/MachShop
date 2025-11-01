/**
 * Extension Lifecycle Manager
 *
 * Manages extension lifecycle, versioning, and state transitions.
 */

import type {
  ExtensionWithLifecycle,
  ExtensionState,
  ExtensionLifecycleEvent,
  DeprecationInfo,
  CompatibilityStatus,
  MigrationInfo,
  ExtensionManifest,
  LifecycleManagerConfig,
  ExtensionVersion,
} from './types';
import { ExtensionState as ExtensionStateEnum } from './types';
import { VersionManager } from './version';
import { DependencyResolver } from './dependencies';

/**
 * Extension Lifecycle Manager
 *
 * Handles:
 * - Extension installation, update, and uninstallation
 * - State transitions and validation
 * - Version management and compatibility
 * - Deprecation tracking and notifications
 * - Health monitoring
 */
export class ExtensionLifecycleManager {
  private extensions: Map<string, ExtensionWithLifecycle> = new Map();
  private versionManager: VersionManager;
  private dependencyResolver: DependencyResolver;
  private config: LifecycleManagerConfig;
  private eventListeners: ((event: ExtensionLifecycleEvent) => void)[] = [];
  private healthCheckIntervals: Map<string, NodeJS.Timer> = new Map();

  constructor(config: LifecycleManagerConfig = {}) {
    this.config = {
      checkHealthInterval: 60000, // 1 minute
      maxConcurrentOperations: 5,
      enableAutoUpdates: false,
      autoUpdateCheckInterval: 3600000, // 1 hour
      deprecationWarningDays: 30,
      notifyUsers: true,
      enableRollback: true,
      maxBackupVersions: 5,
      ...config,
    };

    this.versionManager = new VersionManager();
    this.dependencyResolver = new DependencyResolver();
  }

  /**
   * Install an extension
   */
  async installExtension(
    manifest: ExtensionManifest,
    targetVersion: string
  ): Promise<ExtensionWithLifecycle> {
    const extensionId = manifest.id;

    try {
      // Check if already installed
      if (this.extensions.has(extensionId)) {
        throw new Error(`Extension ${extensionId} is already installed`);
      }

      // Validate version
      const semver = this.versionManager.parseSemver(targetVersion);
      if (!semver) {
        throw new Error(`Invalid version format: ${targetVersion}`);
      }

      // Check compatibility
      const compatibility = this.checkCompatibility(manifest, targetVersion);
      if (!compatibility.compatible) {
        throw new Error(`Incompatible: ${compatibility.incompatibilityReason}`);
      }

      // Resolve dependencies
      const depResolution = await this.dependencyResolver.resolve(
        manifest.dependencies || {}
      );
      if (!depResolution.resolvable) {
        throw new Error(
          `Dependency conflicts: ${depResolution.conflicts.map((c) => c.conflictReason).join(', ')}`
        );
      }

      // Create extension record
      const extension: ExtensionWithLifecycle = {
        id: extensionId,
        name: manifest.name,
        description: manifest.description,
        currentVersion: targetVersion,
        state: ExtensionStateEnum.ACTIVE,
        installedAt: new Date(),
        versions: [this.createVersionInfo(manifest, targetVersion)],
        dependencies: Object.entries(manifest.dependencies || {}).map(([id, version]) => ({
          extensionId: id,
          minVersion: version,
          optional: false,
        })),
        compatibilityStatus: compatibility,
        deprecated: manifest.deprecation,
      };

      this.extensions.set(extensionId, extension);

      // Emit event
      this.emitEvent({
        extensionId,
        version: targetVersion,
        eventType: 'installed',
        timestamp: new Date(),
        success: true,
      });

      // Start health checks
      this.startHealthCheck(extensionId);

      return extension;
    } catch (error) {
      this.emitEvent({
        extensionId,
        version: targetVersion,
        eventType: 'installed',
        timestamp: new Date(),
        success: false,
        error: String(error),
      });

      throw error;
    }
  }

  /**
   * Update an extension to a new version
   */
  async updateExtension(extensionId: string, targetVersion: string): Promise<ExtensionWithLifecycle> {
    try {
      const extension = this.getExtension(extensionId);
      if (!extension) {
        throw new Error(`Extension ${extensionId} not found`);
      }

      // Validate new version
      const semver = this.versionManager.parseSemver(targetVersion);
      if (!semver) {
        throw new Error(`Invalid version format: ${targetVersion}`);
      }

      // Check if newer version
      const comparison = this.versionManager.compare(extension.currentVersion, targetVersion);
      if (!comparison.isNewer) {
        throw new Error(
          `Target version ${targetVersion} is not newer than current ${extension.currentVersion}`
        );
      }

      // Check compatibility
      const manifest = this.createManifestFromExtension(extension);
      const compatibility = this.checkCompatibility(manifest, targetVersion);
      if (!compatibility.compatible) {
        throw new Error(`Incompatible: ${compatibility.incompatibilityReason}`);
      }

      // Get migration info
      const migration = this.getMigrationInfo(extension.currentVersion, targetVersion);

      // Create version backup if rollback enabled
      if (this.config.enableRollback) {
        this.createVersionBackup(extension);
      }

      // Store previous version
      extension.previousVersion = extension.currentVersion;

      // Update version
      extension.currentVersion = targetVersion;
      extension.state = ExtensionStateEnum.ACTIVE;
      extension.lastUpdatedAt = new Date();
      extension.versions.push(this.createVersionInfo(manifest, targetVersion));

      // Keep only max backup versions
      if (extension.versions.length > this.config.maxBackupVersions!) {
        extension.versions = extension.versions.slice(-this.config.maxBackupVersions);
      }

      // Update in store
      this.extensions.set(extensionId, extension);

      // Emit event
      this.emitEvent({
        extensionId,
        version: targetVersion,
        eventType: 'updated',
        timestamp: new Date(),
        details: { previousVersion: extension.previousVersion, migration },
        success: true,
      });

      return extension;
    } catch (error) {
      this.emitEvent({
        extensionId,
        version: targetVersion,
        eventType: 'updated',
        timestamp: new Date(),
        success: false,
        error: String(error),
      });

      throw error;
    }
  }

  /**
   * Disable an extension
   */
  async disableExtension(extensionId: string, reason?: string): Promise<ExtensionWithLifecycle> {
    try {
      const extension = this.getExtension(extensionId);
      if (!extension) {
        throw new Error(`Extension ${extensionId} not found`);
      }

      if (extension.state === ExtensionStateEnum.DISABLED) {
        throw new Error(`Extension ${extensionId} is already disabled`);
      }

      extension.state = ExtensionStateEnum.DISABLED;
      extension.disabledAt = new Date();

      this.extensions.set(extensionId, extension);

      this.emitEvent({
        extensionId,
        version: extension.currentVersion,
        eventType: 'disabled',
        timestamp: new Date(),
        details: { reason },
        success: true,
      });

      return extension;
    } catch (error) {
      this.emitEvent({
        extensionId,
        version: this.getExtension(extensionId)?.currentVersion || 'unknown',
        eventType: 'disabled',
        timestamp: new Date(),
        success: false,
        error: String(error),
      });

      throw error;
    }
  }

  /**
   * Enable a disabled extension
   */
  async enableExtension(extensionId: string): Promise<ExtensionWithLifecycle> {
    const extension = this.getExtension(extensionId);
    if (!extension) {
      throw new Error(`Extension ${extensionId} not found`);
    }

    if (extension.state !== ExtensionStateEnum.DISABLED) {
      throw new Error(`Extension ${extensionId} is not disabled`);
    }

    extension.state = ExtensionStateEnum.ACTIVE;
    extension.disabledAt = undefined;

    this.extensions.set(extensionId, extension);

    this.emitEvent({
      extensionId,
      version: extension.currentVersion,
      eventType: 'enabled',
      timestamp: new Date(),
      success: true,
    });

    return extension;
  }

  /**
   * Uninstall an extension
   */
  async uninstallExtension(extensionId: string): Promise<void> {
    try {
      const extension = this.getExtension(extensionId);
      if (!extension) {
        throw new Error(`Extension ${extensionId} not found`);
      }

      // Stop health checks
      this.stopHealthCheck(extensionId);

      // Check dependent extensions
      const dependents = this.findDependentExtensions(extensionId);
      if (dependents.length > 0) {
        throw new Error(`Other extensions depend on ${extensionId}: ${dependents.join(', ')}`);
      }

      // Remove extension
      this.extensions.delete(extensionId);

      this.emitEvent({
        extensionId,
        version: extension.currentVersion,
        eventType: 'uninstalled',
        timestamp: new Date(),
        success: true,
      });
    } catch (error) {
      this.emitEvent({
        extensionId,
        version: this.getExtension(extensionId)?.currentVersion || 'unknown',
        eventType: 'uninstalled',
        timestamp: new Date(),
        success: false,
        error: String(error),
      });

      throw error;
    }
  }

  /**
   * Get extension by ID
   */
  getExtension(extensionId: string): ExtensionWithLifecycle | undefined {
    return this.extensions.get(extensionId);
  }

  /**
   * Get all extensions
   */
  getAllExtensions(): ExtensionWithLifecycle[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get extensions in a specific state
   */
  getExtensionsByState(state: ExtensionState): ExtensionWithLifecycle[] {
    return this.getAllExtensions().filter((ext) => ext.state === state);
  }

  /**
   * Check extension compatibility
   */
  checkCompatibility(manifest: ExtensionManifest, version: string): CompatibilityStatus {
    // This would check against current MachShop version
    // For now, return a simple check
    const machShopVersion = '1.0.0'; // Would come from system

    return {
      compatible: true,
      machShopVersion,
    };
  }

  /**
   * Check for deprecated features
   */
  checkDeprecations(extensionId: string): DeprecationInfo | undefined {
    const extension = this.getExtension(extensionId);
    return extension?.deprecated;
  }

  /**
   * Get migration info between versions
   */
  getMigrationInfo(fromVersion: string, toVersion: string): MigrationInfo {
    return {
      fromVersion,
      toVersion,
      steps: [],
      estimatedDuration: 5,
      rollbackPossible: this.config.enableRollback || false,
      riskLevel: 'low',
      testingRequired: false,
      backupRequired: this.config.enableRollback || false,
    };
  }

  /**
   * Listen to lifecycle events
   */
  onLifecycleEvent(listener: (event: ExtensionLifecycleEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Start health checks for an extension
   */
  private startHealthCheck(extensionId: string): void {
    if (this.healthCheckIntervals.has(extensionId)) {
      return;
    }

    const interval = setInterval(() => {
      // Perform health check
      // This would be implemented based on actual health check logic
    }, this.config.checkHealthInterval || 60000);

    this.healthCheckIntervals.set(extensionId, interval);
  }

  /**
   * Stop health checks for an extension
   */
  private stopHealthCheck(extensionId: string): void {
    const interval = this.healthCheckIntervals.get(extensionId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(extensionId);
    }
  }

  /**
   * Find extensions that depend on a given extension
   */
  private findDependentExtensions(extensionId: string): string[] {
    return this.getAllExtensions()
      .filter((ext) => ext.dependencies.some((dep) => dep.extensionId === extensionId))
      .map((ext) => ext.id);
  }

  /**
   * Create version backup
   */
  private createVersionBackup(extension: ExtensionWithLifecycle): void {
    // This would create a backup of the current version
    // Implementation depends on storage mechanism
  }

  /**
   * Emit a lifecycle event
   */
  private emitEvent(event: ExtensionLifecycleEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }

  /**
   * Create version info from manifest
   */
  private createVersionInfo(manifest: ExtensionManifest, version: string): ExtensionVersion {
    return {
      version,
      semver: this.versionManager.parseSemver(version)!,
      releaseDate: new Date(),
      changelog: '',
      compatibleWith: {
        minMachShopVersion: manifest.engines.machshop,
      },
      dependencies: manifest.dependencies,
      breakingChanges: manifest.breakingChanges,
      deprecations: manifest.deprecation ? { [version]: manifest.deprecation } : undefined,
    };
  }

  /**
   * Create manifest from extension (for updates)
   */
  private createManifestFromExtension(extension: ExtensionWithLifecycle): ExtensionManifest {
    return {
      id: extension.id,
      name: extension.name,
      version: extension.currentVersion,
      description: extension.description,
      author: 'unknown',
      license: 'unknown',
      main: 'index.js',
      engines: {
        machshop: '>=1.0.0',
      },
      dependencies: Object.fromEntries(
        extension.dependencies.map((dep) => [dep.extensionId, dep.minVersion])
      ),
      deprecation: extension.deprecated,
    };
  }
}
