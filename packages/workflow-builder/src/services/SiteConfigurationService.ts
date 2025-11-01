/**
 * Site Configuration Service
 * Manages site-level configuration inheritance, overrides, and management
 */

import { Workflow } from '../types/workflow';

/**
 * Site information
 */
export interface Site {
  id: string;
  name: string;
  location: string;
  region: string;
  environment: 'production' | 'staging' | 'development';
  parentSiteId?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

/**
 * Configuration parameter definition
 */
export interface ConfigParameter {
  key: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'select';
  defaultValue?: any;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: any) => boolean;
  requiredAtLevel?: 'global' | 'regional' | 'site';
  category?: string;
}

/**
 * Configuration value
 */
export interface ConfigValue {
  key: string;
  value: any;
  type: ConfigParameter['type'];
  scope: 'global' | 'regional' | 'site';
  inheritedFrom?: string;
  overriddenAt?: string;
  setBy: string;
  setAt: number;
}

/**
 * Site configuration
 */
export interface SiteConfig {
  siteId: string;
  globalConfig: Map<string, ConfigValue>;
  regionalConfig: Map<string, ConfigValue>;
  siteConfig: Map<string, ConfigValue>;
}

/**
 * Configuration change record
 */
export interface ConfigChangeRecord {
  id: string;
  siteId: string;
  key: string;
  oldValue: any;
  newValue: any;
  scope: 'global' | 'regional' | 'site';
  changedBy: string;
  reason?: string;
  changedAt: number;
}

/**
 * Site Hierarchy
 */
export interface SiteHierarchy {
  globalConfig: Map<string, ConfigValue>;
  regions: Map<string, RegionalConfig>;
}

/**
 * Regional configuration
 */
export interface RegionalConfig {
  regionId: string;
  regionName: string;
  config: Map<string, ConfigValue>;
  sites: Map<string, SiteConfig>;
}

/**
 * Site Configuration Service
 */
export class SiteConfigurationService {
  private sites: Map<string, Site> = new Map();
  private siteConfigs: Map<string, SiteConfig> = new Map();
  private hierarchy: SiteHierarchy = {
    globalConfig: new Map(),
    regions: new Map(),
  };
  private changeHistory: ConfigChangeRecord[] = [];
  private configParameters: Map<string, ConfigParameter> = new Map();
  private maxHistorySize = 10000;

  /**
   * Register configuration parameter
   */
  registerParameter(param: ConfigParameter): boolean {
    try {
      this.configParameters.set(param.key, param);
      return true;
    } catch (error) {
      console.error(`Failed to register parameter ${param.key}:`, error);
      return false;
    }
  }

  /**
   * Create site
   */
  createSite(site: Site): boolean {
    try {
      if (this.sites.has(site.id)) {
        throw new Error(`Site ${site.id} already exists`);
      }

      this.sites.set(site.id, site);
      this.siteConfigs.set(site.id, {
        siteId: site.id,
        globalConfig: new Map(),
        regionalConfig: new Map(),
        siteConfig: new Map(),
      });

      return true;
    } catch (error) {
      console.error(`Failed to create site ${site.id}:`, error);
      return false;
    }
  }

  /**
   * Get site by ID
   */
  getSite(siteId: string): Site | undefined {
    return this.sites.get(siteId);
  }

  /**
   * Get all sites
   */
  getAllSites(): Site[] {
    return Array.from(this.sites.values());
  }

  /**
   * Get sites by region
   */
  getSitesByRegion(region: string): Site[] {
    return Array.from(this.sites.values()).filter(s => s.region === region);
  }

  /**
   * Set global configuration
   */
  setGlobalConfig(key: string, value: any, setBy: string, reason?: string): boolean {
    try {
      const param = this.configParameters.get(key);

      if (!param) {
        throw new Error(`Parameter ${key} not registered`);
      }

      if (param.validation && !param.validation(value)) {
        throw new Error(`Validation failed for ${key}`);
      }

      const oldValue = this.hierarchy.globalConfig.get(key)?.value;

      const configValue: ConfigValue = {
        key,
        value,
        type: param.type,
        scope: 'global',
        setBy,
        setAt: Date.now(),
      };

      this.hierarchy.globalConfig.set(key, configValue);

      // Record change
      this.recordChange({
        id: `change-${Date.now()}`,
        siteId: 'global',
        key,
        oldValue,
        newValue: value,
        scope: 'global',
        changedBy: setBy,
        reason,
        changedAt: Date.now(),
      });

      return true;
    } catch (error) {
      console.error(`Failed to set global config ${key}:`, error);
      return false;
    }
  }

  /**
   * Set regional configuration
   */
  setRegionalConfig(
    region: string,
    key: string,
    value: any,
    setBy: string,
    reason?: string
  ): boolean {
    try {
      const param = this.configParameters.get(key);

      if (!param) {
        throw new Error(`Parameter ${key} not registered`);
      }

      if (param.validation && !param.validation(value)) {
        throw new Error(`Validation failed for ${key}`);
      }

      // Create region if doesn't exist
      if (!this.hierarchy.regions.has(region)) {
        this.hierarchy.regions.set(region, {
          regionId: region,
          regionName: region,
          config: new Map(),
          sites: new Map(),
        });
      }

      const regionalConfig = this.hierarchy.regions.get(region)!;
      const oldValue = regionalConfig.config.get(key)?.value;

      const configValue: ConfigValue = {
        key,
        value,
        type: param.type,
        scope: 'regional',
        inheritedFrom: 'global',
        setBy,
        setAt: Date.now(),
      };

      regionalConfig.config.set(key, configValue);

      // Record change
      this.recordChange({
        id: `change-${Date.now()}`,
        siteId: region,
        key,
        oldValue,
        newValue: value,
        scope: 'regional',
        changedBy: setBy,
        reason,
        changedAt: Date.now(),
      });

      return true;
    } catch (error) {
      console.error(`Failed to set regional config for ${region}.${key}:`, error);
      return false;
    }
  }

  /**
   * Set site configuration
   */
  setSiteConfig(
    siteId: string,
    key: string,
    value: any,
    setBy: string,
    reason?: string
  ): boolean {
    try {
      const siteConfig = this.siteConfigs.get(siteId);
      if (!siteConfig) {
        throw new Error(`Site ${siteId} not found`);
      }

      const param = this.configParameters.get(key);
      if (!param) {
        throw new Error(`Parameter ${key} not registered`);
      }

      if (param.validation && !param.validation(value)) {
        throw new Error(`Validation failed for ${key}`);
      }

      const oldValue = siteConfig.siteConfig.get(key)?.value;

      const configValue: ConfigValue = {
        key,
        value,
        type: param.type,
        scope: 'site',
        overriddenAt: siteId,
        setBy,
        setAt: Date.now(),
      };

      siteConfig.siteConfig.set(key, configValue);

      // Record change
      this.recordChange({
        id: `change-${Date.now()}`,
        siteId,
        key,
        oldValue,
        newValue: value,
        scope: 'site',
        changedBy: setBy,
        reason,
        changedAt: Date.now(),
      });

      return true;
    } catch (error) {
      console.error(`Failed to set site config for ${siteId}.${key}:`, error);
      return false;
    }
  }

  /**
   * Get configuration value with inheritance
   */
  getConfig(siteId: string, key: string): ConfigValue | undefined {
    const site = this.sites.get(siteId);
    if (!site) {
      return undefined;
    }

    const siteConfig = this.siteConfigs.get(siteId);
    if (!siteConfig) {
      return undefined;
    }

    // Check site-level config first
    if (siteConfig.siteConfig.has(key)) {
      return siteConfig.siteConfig.get(key);
    }

    // Check regional config
    if (site.region) {
      const regionalConfig = this.hierarchy.regions.get(site.region);
      if (regionalConfig?.config.has(key)) {
        return regionalConfig.config.get(key);
      }
    }

    // Check global config
    if (this.hierarchy.globalConfig.has(key)) {
      return this.hierarchy.globalConfig.get(key);
    }

    return undefined;
  }

  /**
   * Get all configuration for site
   */
  getFullConfig(siteId: string): Record<string, any> {
    const config: Record<string, any> = {};

    const site = this.sites.get(siteId);
    if (!site) {
      return config;
    }

    const siteConfig = this.siteConfigs.get(siteId);
    if (!siteConfig) {
      return config;
    }

    // Start with global config
    for (const [key, value] of this.hierarchy.globalConfig) {
      config[key] = value.value;
    }

    // Override with regional config
    if (site.region) {
      const regionalConfig = this.hierarchy.regions.get(site.region);
      if (regionalConfig) {
        for (const [key, value] of regionalConfig.config) {
          config[key] = value.value;
        }
      }
    }

    // Override with site config
    for (const [key, value] of siteConfig.siteConfig) {
      config[key] = value.value;
    }

    return config;
  }

  /**
   * Delete site configuration
   */
  deleteSiteConfig(siteId: string, key: string, deletedBy: string): boolean {
    try {
      const siteConfig = this.siteConfigs.get(siteId);
      if (!siteConfig) {
        return false;
      }

      const oldValue = siteConfig.siteConfig.get(key)?.value;
      const deleted = siteConfig.siteConfig.delete(key);

      if (deleted) {
        this.recordChange({
          id: `change-${Date.now()}`,
          siteId,
          key,
          oldValue,
          newValue: undefined,
          scope: 'site',
          changedBy: deletedBy,
          changedAt: Date.now(),
        });
      }

      return deleted;
    } catch (error) {
      console.error(`Failed to delete site config ${siteId}.${key}:`, error);
      return false;
    }
  }

  /**
   * Record configuration change
   */
  private recordChange(record: ConfigChangeRecord): void {
    this.changeHistory.push(record);

    // Trim history if too large
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory.shift();
    }
  }

  /**
   * Get configuration change history
   */
  getChangeHistory(filters?: {
    siteId?: string;
    key?: string;
    scope?: 'global' | 'regional' | 'site';
    startTime?: number;
    endTime?: number;
  }): ConfigChangeRecord[] {
    let history = this.changeHistory;

    if (filters) {
      history = history.filter(record => {
        if (filters.siteId && record.siteId !== filters.siteId) {
          return false;
        }
        if (filters.key && record.key !== filters.key) {
          return false;
        }
        if (filters.scope && record.scope !== filters.scope) {
          return false;
        }
        if (filters.startTime && record.changedAt < filters.startTime) {
          return false;
        }
        if (filters.endTime && record.changedAt > filters.endTime) {
          return false;
        }
        return true;
      });
    }

    return history;
  }

  /**
   * Validate configuration
   */
  validateConfig(siteId: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getFullConfig(siteId);

    for (const [key, param] of this.configParameters) {
      // Check required parameters
      if (param.requiredAtLevel) {
        if (!(key in config)) {
          errors.push(`Missing required parameter: ${key}`);
        }
      }

      // Validate parameter value
      if (key in config && param.validation) {
        if (!param.validation(config[key])) {
          errors.push(`Invalid value for ${key}: ${config[key]}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clone site configuration
   */
  cloneSiteConfig(sourceSiteId: string, targetSiteId: string, clonedBy: string): boolean {
    try {
      const sourceConfig = this.getFullConfig(sourceSiteId);
      const targetSite = this.sites.get(targetSiteId);

      if (!targetSite) {
        throw new Error(`Target site ${targetSiteId} not found`);
      }

      for (const [key, value] of Object.entries(sourceConfig)) {
        this.setSiteConfig(targetSiteId, key, value, clonedBy, `Cloned from ${sourceSiteId}`);
      }

      return true;
    } catch (error) {
      console.error(
        `Failed to clone config from ${sourceSiteId} to ${targetSiteId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get configuration statistics
   */
  getConfigStats(): {
    totalSites: number;
    totalRegions: number;
    globalParams: number;
    registeredParams: number;
    changeRecords: number;
  } {
    return {
      totalSites: this.sites.size,
      totalRegions: this.hierarchy.regions.size,
      globalParams: this.hierarchy.globalConfig.size,
      registeredParams: this.configParameters.size,
      changeRecords: this.changeHistory.length,
    };
  }

  /**
   * Export site configuration
   */
  exportSiteConfig(siteId: string): Record<string, any> | null {
    return this.getFullConfig(siteId);
  }

  /**
   * Import site configuration
   */
  importSiteConfig(
    siteId: string,
    config: Record<string, any>,
    importedBy: string
  ): { success: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(config)) {
      if (!this.setSiteConfig(siteId, key, value, importedBy, 'Imported configuration')) {
        errors.push(`Failed to import ${key}`);
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Get hierarchy overview
   */
  getHierarchyOverview(): {
    global: number;
    regions: Array<{ name: string; sites: number; params: number }>;
  } {
    const regions = Array.from(this.hierarchy.regions.values()).map(region => ({
      name: region.regionName,
      sites: region.sites.size,
      params: region.config.size,
    }));

    return {
      global: this.hierarchy.globalConfig.size,
      regions,
    };
  }

  /**
   * Audit site configuration
   */
  auditSiteConfig(siteId: string): {
    site: Site | undefined;
    config: Record<string, any>;
    inheritance: Record<string, string>;
    overrides: Record<string, string>;
    lastModified: number;
  } | null {
    const site = this.sites.get(siteId);
    if (!site) {
      return null;
    }

    const config = this.getFullConfig(siteId);
    const inheritance: Record<string, string> = {};
    const overrides: Record<string, string> = {};

    const siteConfig = this.siteConfigs.get(siteId);
    if (siteConfig) {
      for (const [key] of this.configParameters) {
        if (siteConfig.siteConfig.has(key)) {
          overrides[key] = 'site';
        } else if (site.region && this.hierarchy.regions.get(site.region)?.config.has(key)) {
          inheritance[key] = 'regional';
        } else if (this.hierarchy.globalConfig.has(key)) {
          inheritance[key] = 'global';
        }
      }
    }

    const lastModified = this.changeHistory
      .filter(r => r.siteId === siteId)
      .reduce((max, r) => Math.max(max, r.changedAt), 0);

    return {
      site,
      config,
      inheritance,
      overrides,
      lastModified,
    };
  }
}

export default SiteConfigurationService;
