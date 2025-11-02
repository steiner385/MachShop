/**
 * Multi-Site Manager Implementation (#487)
 * Configuration inheritance and form synchronization
 */

import {
  MultiSiteFormManager,
  FormTemplate,
  SiteConfiguration,
  FormVersion,
  SyncStatus,
  InheritanceLevel,
} from '../types';

export class MultiSiteManager {
  private formManagers: Map<string, MultiSiteFormManager> = new Map();
  private listeners: Set<() => void> = new Set();

  // ========== Form Management ==========

  public registerForm(formId: string, globalTemplate: FormTemplate): void {
    const manager: MultiSiteFormManager = {
      formId,
      globalTemplate,
      siteConfigs: new Map(),
      versionHistory: [
        {
          version: '1.0.0',
          formId,
          template: globalTemplate,
          createdAt: new Date(),
          createdBy: 'system',
          isActive: true,
          rolloutStrategy: 'immediate',
        },
      ],
      synchronizationStatus: {
        status: 'synced',
        syncedSites: [],
        pendingSites: [],
        lastSyncTime: new Date(),
      },
    };

    this.formManagers.set(formId, manager);
    this.notifyListeners();
  }

  public getFormManager(formId: string): MultiSiteFormManager | undefined {
    return this.formManagers.get(formId);
  }

  // ========== Site Configuration ==========

  public createSiteConfig(
    formId: string,
    siteId: string,
    siteName: string,
    region: string,
    inheritsFrom: InheritanceLevel = InheritanceLevel.GLOBAL
  ): SiteConfiguration | undefined {
    const manager = this.formManagers.get(formId);
    if (!manager) return undefined;

    const config: SiteConfiguration = {
      siteId,
      siteName,
      region,
      inheritsFrom,
      customizations: new Map(),
      overrides: new Map(),
      permissions: {},
      timezone: 'UTC',
      locale: 'en-US',
    };

    manager.siteConfigs.set(siteId, config);
    this.notifyListeners();
    return config;
  }

  public getSiteConfig(formId: string, siteId: string): SiteConfiguration | undefined {
    const manager = this.formManagers.get(formId);
    return manager?.siteConfigs.get(siteId);
  }

  public updateSiteConfig(formId: string, siteId: string, overrides: Record<string, unknown>): void {
    const manager = this.formManagers.get(formId);
    const config = manager?.siteConfigs.get(siteId);

    if (config) {
      config.overrides.set('updates', overrides);

      // Mark as pending sync
      if (manager) {
        manager.synchronizationStatus.status = 'pending';
        manager.synchronizationStatus.pendingSites.push(siteId);
        this.notifyListeners();
      }
    }
  }

  // ========== Configuration Inheritance ==========

  public getResolvedConfig(formId: string, siteId: string): Record<string, unknown> {
    const manager = this.formManagers.get(formId);
    if (!manager) return {};

    const resolved: Record<string, unknown> = { ...manager.globalTemplate } as any;
    const siteConfig = manager.siteConfigs.get(siteId);

    if (siteConfig && siteConfig.inheritsFrom !== InheritanceLevel.GLOBAL) {
      // Apply site-level overrides
      for (const [key, value] of siteConfig.overrides) {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  public setInheritanceLevel(
    formId: string,
    siteId: string,
    level: InheritanceLevel
  ): void {
    const manager = this.formManagers.get(formId);
    const config = manager?.siteConfigs.get(siteId);

    if (config) {
      config.inheritsFrom = level;
      this.notifyListeners();
    }
  }

  // ========== Versioning ==========

  public createVersion(
    formId: string,
    version: string,
    template: FormTemplate,
    releaseNotes?: string
  ): FormVersion | undefined {
    const manager = this.formManagers.get(formId);
    if (!manager) return undefined;

    const formVersion: FormVersion = {
      version,
      formId,
      template,
      createdAt: new Date(),
      createdBy: 'system',
      releaseNotes,
      isActive: false,
      rolloutStrategy: 'staged',
    };

    manager.versionHistory.push(formVersion);
    this.notifyListeners();
    return formVersion;
  }

  public getVersion(formId: string, version: string): FormVersion | undefined {
    const manager = this.formManagers.get(formId);
    return manager?.versionHistory.find((v) => v.version === version);
  }

  public listVersions(formId: string): FormVersion[] {
    const manager = this.formManagers.get(formId);
    return manager?.versionHistory || [];
  }

  public activateVersion(formId: string, version: string): void {
    const manager = this.formManagers.get(formId);
    if (!manager) return;

    // Deactivate current version
    for (const v of manager.versionHistory) {
      v.isActive = false;
    }

    // Activate new version
    const targetVersion = manager.versionHistory.find((v) => v.version === version);
    if (targetVersion) {
      targetVersion.isActive = true;
      this.notifyListeners();
    }
  }

  public rollbackVersion(formId: string, version: string): boolean {
    const manager = this.formManagers.get(formId);
    if (!manager) return false;

    const targetVersion = manager.versionHistory.find((v) => v.version === version);
    if (targetVersion) {
      this.activateVersion(formId, version);
      return true;
    }

    return false;
  }

  // ========== Synchronization ==========

  public async syncForm(formId: string): Promise<boolean> {
    const manager = this.formManagers.get(formId);
    if (!manager) return false;

    try {
      manager.synchronizationStatus.status = 'pending';
      this.notifyListeners();

      // Simulate sync operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update sync status
      manager.synchronizationStatus.status = 'synced';
      manager.synchronizationStatus.syncedSites = Array.from(manager.siteConfigs.keys());
      manager.synchronizationStatus.pendingSites = [];
      manager.synchronizationStatus.lastSyncTime = new Date();

      this.notifyListeners();
      return true;
    } catch (error) {
      manager.synchronizationStatus.status = 'error';
      manager.synchronizationStatus.error = {
        code: 'SYNC_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      this.notifyListeners();
      return false;
    }
  }

  public getSyncStatus(formId: string): SyncStatus | undefined {
    return this.formManagers.get(formId)?.synchronizationStatus;
  }

  // ========== Rollout Strategies ==========

  public scheduleRollout(
    formId: string,
    version: string,
    strategy: 'immediate' | 'staged' | 'canary' | 'scheduled',
    options?: {
      targetSites?: string[];
      startDate?: Date;
      endDate?: Date;
      canaryPercentage?: number;
    }
  ): FormVersion | undefined {
    const versionObj = this.getVersion(formId, version);
    if (!versionObj) return undefined;

    versionObj.rolloutStrategy = strategy;
    versionObj.rolloutDates = {
      startDate: options?.startDate || new Date(),
      endDate: options?.endDate,
      targetSites: options?.targetSites,
    };

    this.notifyListeners();
    return versionObj;
  }

  public getActiveVersionForSite(formId: string, siteId: string): FormVersion | undefined {
    const manager = this.formManagers.get(formId);
    if (!manager) return undefined;

    // Return active version that applies to this site
    return manager.versionHistory.find((v) => {
      if (!v.isActive) return false;

      if (v.rolloutDates?.targetSites) {
        return v.rolloutDates.targetSites.includes(siteId);
      }

      return true;
    });
  }

  // ========== Conflict Resolution ==========

  public resolveConflict(
    formId: string,
    siteId: string,
    fieldId: string,
    resolution: 'use-global' | 'use-site' | 'merge'
  ): void {
    const manager = this.formManagers.get(formId);
    if (!manager || !manager.synchronizationStatus.conflicts) return;

    const conflict = manager.synchronizationStatus.conflicts.find(
      (c) => c.siteId === siteId && c.fieldId === fieldId
    );

    if (conflict) {
      conflict.resolution = resolution;
      this.notifyListeners();
    }
  }

  // ========== Statistics ==========

  public getStatistics(formId: string): {
    totalSites: number;
    syncedSites: number;
    pendingSites: number;
    versions: number;
    activeVersion?: string;
  } | undefined {
    const manager = this.formManagers.get(formId);
    if (!manager) return undefined;

    const activeVersion = manager.versionHistory.find((v) => v.isActive);

    return {
      totalSites: manager.siteConfigs.size,
      syncedSites: manager.synchronizationStatus.syncedSites.length,
      pendingSites: manager.synchronizationStatus.pendingSites.length,
      versions: manager.versionHistory.length,
      activeVersion: activeVersion?.version,
    };
  }

  // ========== State Management ==========

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}
