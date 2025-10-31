import {
  SurrogateTag,
  TagDataType,
  CompressionType,
  StorageType
} from './schemas';

/**
 * Tag Registry for managing tag metadata and configuration
 * Handles tag creation, validation, and lifecycle management
 */
export class TagRegistry {
  private tags: Map<string, SurrogateTag> = new Map();
  private tagsByPattern: Map<string, Set<string>> = new Map();

  constructor() {
    console.log('TagRegistry initialized');
  }

  /**
   * Create a new tag
   */
  async createTag(tagConfig: Partial<SurrogateTag>): Promise<SurrogateTag> {
    // Validate required fields
    if (!tagConfig.tagName) {
      throw new Error('Tag name is required');
    }

    // Check if tag already exists
    if (this.tags.has(tagConfig.tagName)) {
      throw new Error(`Tag already exists: ${tagConfig.tagName}`);
    }

    // Validate tag name format
    this.validateTagName(tagConfig.tagName);

    // Create tag with defaults
    const tag: SurrogateTag = {
      id: this.generateTagId(tagConfig.tagName),
      tagName: tagConfig.tagName,
      description: tagConfig.description || '',
      dataType: tagConfig.dataType || TagDataType.FLOAT,
      engineeringUnits: tagConfig.engineeringUnits || '',
      collector: tagConfig.collector || 'MES',
      minValue: tagConfig.minValue,
      maxValue: tagConfig.maxValue,
      compressionType: tagConfig.compressionType || CompressionType.SWINGING_DOOR,
      compressionDeviation: tagConfig.compressionDeviation || 0.1,
      storageType: tagConfig.storageType || StorageType.NORMAL,
      retentionHours: tagConfig.retentionHours || 24,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: tagConfig.createdBy || 'system',
      isActive: tagConfig.isActive !== undefined ? tagConfig.isActive : true,
      defaultQuality: tagConfig.defaultQuality || 100,
      qualityThreshold: tagConfig.qualityThreshold || 50
    };

    // Validate the complete tag configuration
    this.validateTagConfig(tag);

    // Store the tag
    this.tags.set(tag.tagName, tag);

    // Index by pattern for efficient searching
    this.indexTagByPattern(tag.tagName);

    console.log(`Tag created: ${tag.tagName} (${tag.dataType})`);
    return tag;
  }

  /**
   * Get a tag by name
   */
  async getTag(tagName: string): Promise<SurrogateTag | null> {
    return this.tags.get(tagName) || null;
  }

  /**
   * Update an existing tag
   */
  async updateTag(tagName: string, updates: Partial<SurrogateTag>): Promise<SurrogateTag> {
    const existingTag = this.tags.get(tagName);
    if (!existingTag) {
      throw new Error(`Tag not found: ${tagName}`);
    }

    // Prevent updating immutable fields
    const { id, tagName: newTagName, createdAt, createdBy, ...allowedUpdates } = updates;

    // Create updated tag
    const updatedTag: SurrogateTag = {
      ...existingTag,
      ...allowedUpdates,
      updatedAt: new Date()
    };

    // Validate the updated configuration
    this.validateTagConfig(updatedTag);

    // Update the tag
    this.tags.set(tagName, updatedTag);

    console.log(`Tag updated: ${tagName}`);
    return updatedTag;
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagName: string): Promise<boolean> {
    const tag = this.tags.get(tagName);
    if (!tag) {
      return false;
    }

    // Remove from maps
    this.tags.delete(tagName);
    this.removeTagFromPatternIndex(tagName);

    console.log(`Tag deleted: ${tagName}`);
    return true;
  }

  /**
   * List tags with filtering and pagination
   */
  async listTags(filters: TagListFilters = {}, page = 1, pageSize = 100): Promise<TagListResult> {
    let filteredTags = Array.from(this.tags.values());

    // Apply filters
    if (filters.dataType) {
      filteredTags = filteredTags.filter(tag => tag.dataType === filters.dataType);
    }

    if (filters.collector) {
      filteredTags = filteredTags.filter(tag => tag.collector === filters.collector);
    }

    if (filters.isActive !== undefined) {
      filteredTags = filteredTags.filter(tag => tag.isActive === filters.isActive);
    }

    if (filters.pattern) {
      const regex = new RegExp(filters.pattern, 'i');
      filteredTags = filteredTags.filter(tag =>
        regex.test(tag.tagName) || regex.test(tag.description)
      );
    }

    if (filters.createdAfter) {
      filteredTags = filteredTags.filter(tag => tag.createdAt >= filters.createdAfter!);
    }

    if (filters.createdBefore) {
      filteredTags = filteredTags.filter(tag => tag.createdAt <= filters.createdBefore!);
    }

    // Sort tags
    const sortBy = filters.sortBy || 'tagName';
    const sortOrder = filters.sortOrder || 'asc';

    filteredTags.sort((a, b) => {
      let aValue: any = a[sortBy as keyof SurrogateTag];
      let bValue: any = b[sortBy as keyof SurrogateTag];

      if (aValue instanceof Date) aValue = aValue.getTime();
      if (bValue instanceof Date) bValue = bValue.getTime();

      if (typeof aValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const total = filteredTags.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedTags = filteredTags.slice(startIndex, endIndex);

    return {
      tags: paginatedTags,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Search tags by pattern
   */
  async searchTags(pattern: string): Promise<SurrogateTag[]> {
    const regex = new RegExp(pattern, 'i');
    const matchingTags: SurrogateTag[] = [];

    for (const tag of this.tags.values()) {
      if (regex.test(tag.tagName) || regex.test(tag.description)) {
        matchingTags.push(tag);
      }
    }

    return matchingTags.sort((a, b) => a.tagName.localeCompare(b.tagName));
  }

  /**
   * Get tags by collector
   */
  async getTagsByCollector(collector: string): Promise<SurrogateTag[]> {
    const tags: SurrogateTag[] = [];
    for (const tag of this.tags.values()) {
      if (tag.collector === collector) {
        tags.push(tag);
      }
    }
    return tags;
  }

  /**
   * Get tags by data type
   */
  async getTagsByDataType(dataType: TagDataType): Promise<SurrogateTag[]> {
    const tags: SurrogateTag[] = [];
    for (const tag of this.tags.values()) {
      if (tag.dataType === dataType) {
        tags.push(tag);
      }
    }
    return tags;
  }

  /**
   * Validate if a tag exists
   */
  async tagExists(tagName: string): Promise<boolean> {
    return this.tags.has(tagName);
  }

  /**
   * Get tag count
   */
  getTagCount(): number {
    return this.tags.size;
  }

  /**
   * Get registry statistics
   */
  getStatistics(): TagRegistryStatistics {
    const stats: TagRegistryStatistics = {
      totalTags: this.tags.size,
      activeTagCount: 0,
      inactiveTagCount: 0,
      tagsByDataType: {},
      tagsByCollector: {},
      tagsByStorageType: {},
      oldestTag: null,
      newestTag: null
    };

    let oldestDate = new Date();
    let newestDate = new Date(0);

    for (const tag of this.tags.values()) {
      // Count active/inactive
      if (tag.isActive) {
        stats.activeTagCount++;
      } else {
        stats.inactiveTagCount++;
      }

      // Count by data type
      stats.tagsByDataType[tag.dataType] = (stats.tagsByDataType[tag.dataType] || 0) + 1;

      // Count by collector
      stats.tagsByCollector[tag.collector] = (stats.tagsByCollector[tag.collector] || 0) + 1;

      // Count by storage type
      stats.tagsByStorageType[tag.storageType] = (stats.tagsByStorageType[tag.storageType] || 0) + 1;

      // Track oldest/newest
      if (tag.createdAt < oldestDate) {
        oldestDate = tag.createdAt;
        stats.oldestTag = tag.tagName;
      }
      if (tag.createdAt > newestDate) {
        newestDate = tag.createdAt;
        stats.newestTag = tag.tagName;
      }
    }

    return stats;
  }

  /**
   * Clear all tags
   */
  async clear(): Promise<void> {
    this.tags.clear();
    this.tagsByPattern.clear();
    console.log('TagRegistry cleared');
  }

  /**
   * Bulk create tags
   */
  async bulkCreateTags(tagConfigs: Partial<SurrogateTag>[]): Promise<BulkCreateResult> {
    const result: BulkCreateResult = {
      created: [],
      failed: [],
      totalRequested: tagConfigs.length
    };

    for (const config of tagConfigs) {
      try {
        const tag = await this.createTag(config);
        result.created.push(tag);
      } catch (error: any) {
        result.failed.push({
          tagName: config.tagName || 'unknown',
          error: error.message
        });
      }
    }

    return result;
  }

  /**
   * Auto-configure standard equipment tags
   */
  async autoConfigureEquipmentTags(equipmentIds: string[]): Promise<BulkCreateResult> {
    const standardDataTypes = [
      { name: 'SENSOR', dataType: TagDataType.FLOAT, units: 'units' },
      { name: 'ALARM', dataType: TagDataType.BOOLEAN, units: '' },
      { name: 'STATUS', dataType: TagDataType.STRING, units: '' },
      { name: 'CYCLE_TIME', dataType: TagDataType.FLOAT, units: 'seconds' },
      { name: 'TEMPERATURE', dataType: TagDataType.FLOAT, units: '°C' },
      { name: 'PRESSURE', dataType: TagDataType.FLOAT, units: 'psi' },
      { name: 'SPEED', dataType: TagDataType.FLOAT, units: 'RPM' },
      { name: 'POSITION', dataType: TagDataType.FLOAT, units: 'mm' },
      { name: 'POWER', dataType: TagDataType.FLOAT, units: 'kW' },
      { name: 'VIBRATION', dataType: TagDataType.FLOAT, units: 'mm/s' }
    ];

    const tagConfigs: Partial<SurrogateTag>[] = [];

    for (const equipmentId of equipmentIds) {
      for (const dataType of standardDataTypes) {
        tagConfigs.push({
          tagName: `EQUIPMENT.${equipmentId}.${dataType.name}`,
          description: `${dataType.name} for equipment ${equipmentId}`,
          dataType: dataType.dataType,
          engineeringUnits: dataType.units,
          collector: 'PLC',
          compressionType: CompressionType.SWINGING_DOOR,
          compressionDeviation: 0.1,
          storageType: StorageType.NORMAL,
          retentionHours: 168, // 1 week
          isActive: true
        });
      }
    }

    return this.bulkCreateTags(tagConfigs);
  }

  // Private helper methods

  private validateTagName(tagName: string): void {
    // Basic validation rules
    if (tagName.length === 0) {
      throw new Error('Tag name cannot be empty');
    }

    if (tagName.length > 255) {
      throw new Error('Tag name too long (max 255 characters)');
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(tagName)) {
      throw new Error('Tag name contains invalid characters');
    }

    // Recommended format: EQUIPMENT.MACHINE_ID.DATA_TYPE
    const recommendedFormat = /^[A-Z_][A-Z0-9_]*(\.[A-Z_][A-Z0-9_]*)*$/;
    if (!recommendedFormat.test(tagName)) {
      console.warn(`Tag name "${tagName}" does not follow recommended format: EQUIPMENT.MACHINE_ID.DATA_TYPE`);
    }
  }

  private validateTagConfig(tag: SurrogateTag): void {
    // Validate compression deviation
    if (tag.compressionDeviation < 0 || tag.compressionDeviation > 1) {
      throw new Error('Compression deviation must be between 0 and 1');
    }

    // Validate retention hours
    if (tag.retentionHours <= 0) {
      throw new Error('Retention hours must be positive');
    }

    // Validate quality values
    if (tag.defaultQuality < 0 || tag.defaultQuality > 100) {
      throw new Error('Default quality must be between 0 and 100');
    }

    if (tag.qualityThreshold < 0 || tag.qualityThreshold > 100) {
      throw new Error('Quality threshold must be between 0 and 100');
    }

    // Validate min/max values for numeric types
    if (tag.dataType === TagDataType.FLOAT || tag.dataType === TagDataType.INTEGER) {
      if (tag.minValue !== undefined && tag.maxValue !== undefined && tag.minValue >= tag.maxValue) {
        throw new Error('Minimum value must be less than maximum value');
      }
    }
  }

  private generateTagId(tagName: string): string {
    return `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private indexTagByPattern(tagName: string): void {
    const parts = tagName.split('.');
    for (let i = 0; i < parts.length; i++) {
      const pattern = parts.slice(0, i + 1).join('.');
      if (!this.tagsByPattern.has(pattern)) {
        this.tagsByPattern.set(pattern, new Set());
      }
      this.tagsByPattern.get(pattern)!.add(tagName);
    }
  }

  private removeTagFromPatternIndex(tagName: string): void {
    for (const [pattern, tagSet] of this.tagsByPattern.entries()) {
      tagSet.delete(tagName);
      if (tagSet.size === 0) {
        this.tagsByPattern.delete(pattern);
      }
    }
  }
}

/**
 * Tag list filters
 */
export interface TagListFilters {
  dataType?: TagDataType;
  collector?: string;
  isActive?: boolean;
  pattern?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Tag list result
 */
export interface TagListResult {
  tags: SurrogateTag[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Registry statistics
 */
export interface TagRegistryStatistics {
  totalTags: number;
  activeTagCount: number;
  inactiveTagCount: number;
  tagsByDataType: { [key: string]: number };
  tagsByCollector: { [key: string]: number };
  tagsByStorageType: { [key: string]: number };
  oldestTag: string | null;
  newestTag: string | null;
}

/**
 * Bulk create result
 */
export interface BulkCreateResult {
  created: SurrogateTag[];
  failed: Array<{ tagName: string; error: string }>;
  totalRequested: number;
}