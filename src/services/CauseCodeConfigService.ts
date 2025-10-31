/**
 * ✅ GITHUB ISSUE #54: Hierarchical Cause Code System - Phase 1-2
 * CauseCodeConfigService
 *
 * Manages cause code hierarchy configuration per site with:
 * - Site-specific and global configuration
 * - Configuration caching with TTL
 * - Validation of configuration rules
 * - Default configuration management
 */

import {
  CauseCodeHierarchyConfig,
  CauseCodeStatus,
  CauseCodeScope,
} from '@/types/quality';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cached configuration entry with timestamp
 */
interface CachedConfig {
  config: CauseCodeHierarchyConfig;
  timestamp: number;
}

/**
 * CauseCodeConfigService
 * Manages hierarchy configuration with caching and validation
 */
export class CauseCodeConfigService {
  private cache: Map<string, CachedConfig> = new Map();
  private readonly CACHE_TTL_MS = 3600000; // 1 hour

  /**
   * Default global configuration (if not set in database)
   */
  private readonly DEFAULT_GLOBAL_CONFIG: Omit<CauseCodeHierarchyConfig, 'id' | 'siteId' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
    numberOfLevels: 3,
    levelNames: ['Category', 'Subcategory', 'Specific Cause'],
    isActive: true
  };

  /**
   * Default site configuration (if not set in database)
   */
  private readonly DEFAULT_SITE_CONFIG: Omit<CauseCodeHierarchyConfig, 'id' | 'siteId' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
    numberOfLevels: 3,
    levelNames: ['Category', 'Subcategory', 'Specific Cause'],
    isActive: true
  };

  constructor(private prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Get or create global hierarchy configuration
   */
  async getGlobalConfig(refreshCache: boolean = false): Promise<CauseCodeHierarchyConfig> {
    const cacheKey = 'GLOBAL_CONFIG';

    // Return cached config if available and not expired
    if (!refreshCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.config;
      }
    }

    // Get from database
    let config = await this.prisma?.causeCodeHierarchyConfig.findFirst({
      where: { siteId: null }
    });

    // Create default if doesn't exist
    if (!config) {
      config = await this.createGlobalConfig();
    }

    // Cache the result
    this.cache.set(cacheKey, {
      config,
      timestamp: Date.now()
    });

    return config;
  }

  /**
   * Get or create site-specific hierarchy configuration
   */
  async getSiteConfig(siteId: string, refreshCache: boolean = false): Promise<CauseCodeHierarchyConfig> {
    const cacheKey = `SITE_CONFIG_${siteId}`;

    // Return cached config if available and not expired
    if (!refreshCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.config;
      }
    }

    // Try to get site-specific config
    let config = await this.prisma?.causeCodeHierarchyConfig.findFirst({
      where: { siteId }
    });

    // Fall back to global config if site doesn't have its own
    if (!config) {
      config = await this.getGlobalConfig();
    }

    // Cache the result
    this.cache.set(cacheKey, {
      config,
      timestamp: Date.now()
    });

    return config;
  }

  /**
   * Create a global configuration
   */
  async createGlobalConfig(
    numberOfLevels: number = this.DEFAULT_GLOBAL_CONFIG.numberOfLevels,
    levelNames: string[] = this.DEFAULT_GLOBAL_CONFIG.levelNames,
    createdBy: string = 'system'
  ): Promise<CauseCodeHierarchyConfig> {
    // Validate configuration
    this.validateConfig(numberOfLevels, levelNames);

    const config: CauseCodeHierarchyConfig = {
      id: uuidv4(),
      siteId: undefined,
      numberOfLevels,
      levelNames,
      isActive: true,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    const saved = await this.prisma?.causeCodeHierarchyConfig.create({
      data: {
        id: config.id,
        siteId: null,
        numberOfLevels: config.numberOfLevels,
        levelNames: config.levelNames,
        isActive: config.isActive,
        createdBy: config.createdBy,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }
    });

    if (saved) {
      // Invalidate cache
      this.cache.delete('GLOBAL_CONFIG');
      return saved;
    }

    return config;
  }

  /**
   * Create a site-specific configuration
   */
  async createSiteConfig(
    siteId: string,
    numberOfLevels: number = this.DEFAULT_SITE_CONFIG.numberOfLevels,
    levelNames: string[] = this.DEFAULT_SITE_CONFIG.levelNames,
    createdBy: string = 'system'
  ): Promise<CauseCodeHierarchyConfig> {
    // Check if already exists
    const existing = await this.prisma?.causeCodeHierarchyConfig.findFirst({
      where: { siteId }
    });

    if (existing) {
      throw new Error(`Configuration already exists for site ${siteId}`);
    }

    // Validate configuration
    this.validateConfig(numberOfLevels, levelNames);

    const config: CauseCodeHierarchyConfig = {
      id: uuidv4(),
      siteId,
      numberOfLevels,
      levelNames,
      isActive: true,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to database
    const saved = await this.prisma?.causeCodeHierarchyConfig.create({
      data: {
        id: config.id,
        siteId: config.siteId,
        numberOfLevels: config.numberOfLevels,
        levelNames: config.levelNames,
        isActive: config.isActive,
        createdBy: config.createdBy,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }
    });

    if (saved) {
      // Invalidate cache
      this.cache.delete(`SITE_CONFIG_${siteId}`);
      return saved;
    }

    return config;
  }

  /**
   * Update configuration
   */
  async updateConfig(
    configId: string,
    numberOfLevels?: number,
    levelNames?: string[],
    isActive?: boolean,
    updatedBy: string = 'system'
  ): Promise<CauseCodeHierarchyConfig> {
    const existing = await this.prisma?.causeCodeHierarchyConfig.findUnique({
      where: { id: configId }
    });

    if (!existing) {
      throw new Error(`Configuration ${configId} not found`);
    }

    // If changing number of levels, validate
    const newLevelNames = levelNames || existing.levelNames;
    const newNumberOfLevels = numberOfLevels || existing.numberOfLevels;

    if (numberOfLevels || levelNames) {
      this.validateConfig(newNumberOfLevels, newLevelNames);
    }

    const updated = await this.prisma?.causeCodeHierarchyConfig.update({
      where: { id: configId },
      data: {
        numberOfLevels: newNumberOfLevels,
        levelNames: newLevelNames,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        updatedAt: new Date()
      }
    });

    if (updated) {
      // Invalidate cache
      if (existing.siteId) {
        this.cache.delete(`SITE_CONFIG_${existing.siteId}`);
      } else {
        this.cache.delete('GLOBAL_CONFIG');
      }
    }

    return updated!;
  }

  /**
   * Validate configuration
   */
  private validateConfig(numberOfLevels: number, levelNames: string[]): void {
    // Validate number of levels
    if (numberOfLevels < 2 || numberOfLevels > 10) {
      throw new Error('Number of levels must be between 2 and 10');
    }

    // Validate level names array
    if (!Array.isArray(levelNames)) {
      throw new Error('Level names must be an array');
    }

    if (levelNames.length !== numberOfLevels) {
      throw new Error(`Level names count (${levelNames.length}) must match numberOfLevels (${numberOfLevels})`);
    }

    // Validate each level name
    for (const name of levelNames) {
      if (!name || name.trim().length === 0) {
        throw new Error('Level names cannot be empty');
      }

      if (name.length > 50) {
        throw new Error('Level names cannot exceed 50 characters');
      }
    }

    // Validate uniqueness of level names
    const uniqueNames = new Set(levelNames.map(n => n.toLowerCase()));
    if (uniqueNames.size !== levelNames.length) {
      throw new Error('Level names must be unique');
    }
  }

  /**
   * Get all configurations
   */
  async getAllConfigs(): Promise<CauseCodeHierarchyConfig[]> {
    const configs = await this.prisma?.causeCodeHierarchyConfig.findMany({
      orderBy: [{ siteId: 'asc' }]
    });

    return configs || [];
  }

  /**
   * Get configuration by ID
   */
  async getConfigById(id: string): Promise<CauseCodeHierarchyConfig | null> {
    const config = await this.prisma?.causeCodeHierarchyConfig.findUnique({
      where: { id }
    });

    return config || null;
  }

  /**
   * Validate level count for a given config
   * Returns true if the level is valid for the configuration
   */
  async isValidLevel(
    level: number,
    siteId?: string
  ): Promise<boolean> {
    const config = siteId
      ? await this.getSiteConfig(siteId)
      : await this.getGlobalConfig();

    return level >= 1 && level <= config.numberOfLevels;
  }

  /**
   * Get level name for a given level number
   */
  async getLevelName(
    level: number,
    siteId?: string
  ): Promise<string | null> {
    const config = siteId
      ? await this.getSiteConfig(siteId)
      : await this.getGlobalConfig();

    // levelNames is 0-indexed, levels are 1-indexed
    if (level >= 1 && level <= config.levelNames.length) {
      return config.levelNames[level - 1];
    }

    return null;
  }

  /**
   * Get all level names for a configuration
   */
  async getLevelNames(siteId?: string): Promise<string[]> {
    const config = siteId
      ? await this.getSiteConfig(siteId)
      : await this.getGlobalConfig();

    return config.levelNames;
  }

  /**
   * Get maximum number of levels in configuration
   */
  async getMaxLevels(siteId?: string): Promise<number> {
    const config = siteId
      ? await this.getSiteConfig(siteId)
      : await this.getGlobalConfig();

    return config.numberOfLevels;
  }

  /**
   * Check if configuration is active
   */
  async isConfigActive(siteId?: string): Promise<boolean> {
    const config = siteId
      ? await this.getSiteConfig(siteId)
      : await this.getGlobalConfig();

    return config.isActive;
  }

  /**
   * Activate configuration
   */
  async activateConfig(configId: string): Promise<CauseCodeHierarchyConfig> {
    return this.updateConfig(configId, undefined, undefined, true);
  }

  /**
   * Deactivate configuration
   */
  async deactivateConfig(configId: string): Promise<CauseCodeHierarchyConfig> {
    return this.updateConfig(configId, undefined, undefined, false);
  }

  /**
   * Clear cache for a specific site
   */
  clearSiteCache(siteId: string): void {
    this.cache.delete(`SITE_CONFIG_${siteId}`);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: string[];
  } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Initialize default configurations if they don't exist
   */
  async initializeDefaults(): Promise<void> {
    // Check if global config exists
    const globalConfig = await this.prisma?.causeCodeHierarchyConfig.findFirst({
      where: { siteId: null }
    });

    if (!globalConfig) {
      await this.createGlobalConfig();
    }
  }

  /**
   * Get configuration usage statistics
   */
  async getConfigStats(): Promise<{
    globalConfigId: string | null;
    siteConfigsCount: number;
    totalConfigs: number;
  }> {
    const globalConfig = await this.prisma?.causeCodeHierarchyConfig.findFirst({
      where: { siteId: null }
    });

    const allConfigs = await this.prisma?.causeCodeHierarchyConfig.findMany();

    return {
      globalConfigId: globalConfig?.id || null,
      siteConfigsCount: (allConfigs?.length || 1) - 1,
      totalConfigs: allConfigs?.length || 1
    };
  }

  /**
   * Delete configuration (only if no cause codes are using it)
   */
  async deleteConfig(configId: string): Promise<void> {
    const config = await this.getConfigById(configId);
    if (!config) {
      throw new Error(`Configuration ${configId} not found`);
    }

    // Check if any cause codes are using this configuration
    // This is done by checking if any cause codes exist with this site/level structure
    const causeCodes = await this.prisma?.causeCode.findMany({
      where: {
        scope: CauseCodeScope.SITE_SPECIFIC,
        siteId: config.siteId || undefined,
        status: { not: CauseCodeStatus.DEPRECATED }
      },
      take: 1
    });

    if (causeCodes && causeCodes.length > 0) {
      throw new Error('Cannot delete configuration that has active cause codes');
    }

    // Delete the configuration
    await this.prisma?.causeCodeHierarchyConfig.delete({
      where: { id: configId }
    });

    // Invalidate cache
    if (config.siteId) {
      this.cache.delete(`SITE_CONFIG_${config.siteId}`);
    } else {
      this.cache.delete('GLOBAL_CONFIG');
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}
