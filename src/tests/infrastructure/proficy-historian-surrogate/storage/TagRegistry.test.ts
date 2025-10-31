import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TagRegistry } from '../../../../tests/infrastructure/proficy-historian-surrogate/storage/TagRegistry';
import { SurrogateTag, TagDataType } from '../../../../tests/infrastructure/proficy-historian-surrogate/storage/schemas';

describe('TagRegistry', () => {
  let tagRegistry: TagRegistry;

  beforeEach(() => {
    tagRegistry = new TagRegistry();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== TAG CREATION ====================

  describe('createTag', () => {
    const sampleTag: SurrogateTag = {
      id: 'tag-1',
      tagName: 'TEST.EQUIPMENT.SENSOR1',
      description: 'Test equipment sensor 1',
      dataType: TagDataType.Float,
      engineeringUnits: 'units',
      collector: 'TEST',
      compressionType: 'Swinging Door',
      compressionDeviation: 0.1,
      storageType: 'Normal',
      retentionHours: 24,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test',
      isActive: true,
      defaultQuality: 100,
      qualityThreshold: 50
    };

    it('should create a tag successfully', async () => {
      const result = await tagRegistry.createTag(sampleTag);

      expect(result.success).toBe(true);
      expect(result.tag).toEqual(expect.objectContaining({
        tagName: sampleTag.tagName,
        description: sampleTag.description,
        dataType: sampleTag.dataType
      }));
    });

    it('should generate an ID if not provided', async () => {
      const tagWithoutId = { ...sampleTag };
      delete tagWithoutId.id;

      const result = await tagRegistry.createTag(tagWithoutId);

      expect(result.success).toBe(true);
      expect(result.tag.id).toBeDefined();
      expect(typeof result.tag.id).toBe('string');
    });

    it('should prevent duplicate tag names', async () => {
      await tagRegistry.createTag(sampleTag);

      const duplicateTag = { ...sampleTag, id: 'tag-2' };
      const result = await tagRegistry.createTag(duplicateTag);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tag name already exists');
    });

    it('should validate required fields', async () => {
      const invalidTag = { ...sampleTag };
      delete invalidTag.tagName;

      const result = await tagRegistry.createTag(invalidTag as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tag name is required');
    });

    it('should validate tag name format', async () => {
      const invalidNameTag = { ...sampleTag, tagName: 'invalid tag name!' };

      const result = await tagRegistry.createTag(invalidNameTag);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid tag name format');
    });

    it('should validate data type', async () => {
      const invalidDataTypeTag = { ...sampleTag, dataType: 'InvalidType' as any };

      const result = await tagRegistry.createTag(invalidDataTypeTag);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid data type');
    });

    it('should validate quality values', async () => {
      const invalidQualityTag = { ...sampleTag, defaultQuality: 150 }; // > 100

      const result = await tagRegistry.createTag(invalidQualityTag);

      expect(result.success).toBe(false);
      expect(result.error).toContain('quality must be between 0 and 100');
    });

    it('should set default values for optional fields', async () => {
      const minimalTag: Partial<SurrogateTag> = {
        tagName: 'TEST.MINIMAL.TAG',
        description: 'Minimal test tag',
        dataType: TagDataType.Float
      };

      const result = await tagRegistry.createTag(minimalTag as SurrogateTag);

      expect(result.success).toBe(true);
      expect(result.tag.engineeringUnits).toBe('');
      expect(result.tag.isActive).toBe(true);
      expect(result.tag.defaultQuality).toBe(100);
      expect(result.tag.qualityThreshold).toBe(50);
      expect(result.tag.compressionType).toBe('None');
      expect(result.tag.storageType).toBe('Normal');
      expect(result.tag.retentionHours).toBe(24);
    });
  });

  // ==================== TAG RETRIEVAL ====================

  describe('getTag', () => {
    beforeEach(async () => {
      const sampleTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.EQUIPMENT.SENSOR1',
        description: 'Test equipment sensor 1',
        dataType: TagDataType.Float,
        engineeringUnits: 'units',
        collector: 'TEST',
        compressionType: 'Swinging Door',
        compressionDeviation: 0.1,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      await tagRegistry.createTag(sampleTag);
    });

    it('should retrieve tag by name', async () => {
      const tag = await tagRegistry.getTag('TEST.EQUIPMENT.SENSOR1');

      expect(tag).toBeDefined();
      expect(tag?.tagName).toBe('TEST.EQUIPMENT.SENSOR1');
      expect(tag?.dataType).toBe(TagDataType.Float);
    });

    it('should return null for non-existent tag', async () => {
      const tag = await tagRegistry.getTag('NON.EXISTENT.TAG');

      expect(tag).toBeNull();
    });

    it('should handle case-sensitive tag names', async () => {
      const tag = await tagRegistry.getTag('test.equipment.sensor1'); // lowercase

      expect(tag).toBeNull(); // Should not match uppercase
    });
  });

  describe('getAllTags', () => {
    beforeEach(async () => {
      const tags: SurrogateTag[] = [
        {
          id: 'tag-1',
          tagName: 'SYSTEM.CPU.USAGE',
          description: 'CPU usage percentage',
          dataType: TagDataType.Float,
          engineeringUnits: '%',
          collector: 'SYSTEM',
          compressionType: 'None',
          compressionDeviation: 0,
          storageType: 'Normal',
          retentionHours: 24,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'test',
          isActive: true,
          defaultQuality: 100,
          qualityThreshold: 50
        },
        {
          id: 'tag-2',
          tagName: 'SYSTEM.MEMORY.USAGE',
          description: 'Memory usage percentage',
          dataType: TagDataType.Float,
          engineeringUnits: '%',
          collector: 'SYSTEM',
          compressionType: 'None',
          compressionDeviation: 0,
          storageType: 'Normal',
          retentionHours: 24,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'test',
          isActive: false, // Inactive tag
          defaultQuality: 100,
          qualityThreshold: 50
        }
      ];

      for (const tag of tags) {
        await tagRegistry.createTag(tag);
      }
    });

    it('should return all tags', async () => {
      const tags = await tagRegistry.getAllTags();

      expect(tags.length).toBe(2);
      expect(tags.some(tag => tag.tagName === 'SYSTEM.CPU.USAGE')).toBe(true);
      expect(tags.some(tag => tag.tagName === 'SYSTEM.MEMORY.USAGE')).toBe(true);
    });

    it('should filter by active status', async () => {
      const activeTags = await tagRegistry.getAllTags({ activeOnly: true });

      expect(activeTags.length).toBe(1);
      expect(activeTags[0].tagName).toBe('SYSTEM.CPU.USAGE');
      expect(activeTags[0].isActive).toBe(true);
    });

    it('should filter by collector', async () => {
      const systemTags = await tagRegistry.getAllTags({ collector: 'SYSTEM' });

      expect(systemTags.length).toBe(2);
      expect(systemTags.every(tag => tag.collector === 'SYSTEM')).toBe(true);
    });

    it('should filter by data type', async () => {
      const floatTags = await tagRegistry.getAllTags({ dataType: TagDataType.Float });

      expect(floatTags.length).toBe(2);
      expect(floatTags.every(tag => tag.dataType === TagDataType.Float)).toBe(true);
    });

    it('should return empty array when no tags match filter', async () => {
      const noMatchTags = await tagRegistry.getAllTags({ collector: 'NONEXISTENT' });

      expect(noMatchTags.length).toBe(0);
    });
  });

  // ==================== TAG UPDATES ====================

  describe('updateTag', () => {
    beforeEach(async () => {
      const sampleTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.EQUIPMENT.SENSOR1',
        description: 'Test equipment sensor 1',
        dataType: TagDataType.Float,
        engineeringUnits: 'units',
        collector: 'TEST',
        compressionType: 'Swinging Door',
        compressionDeviation: 0.1,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      await tagRegistry.createTag(sampleTag);
    });

    it('should update tag successfully', async () => {
      const updates = {
        description: 'Updated description',
        engineeringUnits: 'updated_units',
        isActive: false
      };

      const result = await tagRegistry.updateTag('TEST.EQUIPMENT.SENSOR1', updates);

      expect(result.success).toBe(true);
      expect(result.tag?.description).toBe('Updated description');
      expect(result.tag?.engineeringUnits).toBe('updated_units');
      expect(result.tag?.isActive).toBe(false);
      expect(result.tag?.updatedAt).toBeInstanceOf(Date);
    });

    it('should prevent updating immutable fields', async () => {
      const updates = {
        tagName: 'NEW.TAG.NAME', // Should not be allowed
        id: 'new-id' // Should not be allowed
      };

      const result = await tagRegistry.updateTag('TEST.EQUIPMENT.SENSOR1', updates as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot update immutable field');
    });

    it('should return error for non-existent tag', async () => {
      const updates = { description: 'Updated description' };

      const result = await tagRegistry.updateTag('NON.EXISTENT.TAG', updates);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tag not found');
    });

    it('should validate updated values', async () => {
      const updates = { defaultQuality: 150 }; // Invalid quality

      const result = await tagRegistry.updateTag('TEST.EQUIPMENT.SENSOR1', updates);

      expect(result.success).toBe(false);
      expect(result.error).toContain('quality must be between 0 and 100');
    });
  });

  // ==================== TAG DELETION ====================

  describe('deleteTag', () => {
    beforeEach(async () => {
      const sampleTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.EQUIPMENT.SENSOR1',
        description: 'Test equipment sensor 1',
        dataType: TagDataType.Float,
        engineeringUnits: 'units',
        collector: 'TEST',
        compressionType: 'Swinging Door',
        compressionDeviation: 0.1,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      await tagRegistry.createTag(sampleTag);
    });

    it('should delete tag successfully', async () => {
      const result = await tagRegistry.deleteTag('TEST.EQUIPMENT.SENSOR1');

      expect(result.success).toBe(true);

      // Verify tag is deleted
      const deletedTag = await tagRegistry.getTag('TEST.EQUIPMENT.SENSOR1');
      expect(deletedTag).toBeNull();
    });

    it('should return error for non-existent tag', async () => {
      const result = await tagRegistry.deleteTag('NON.EXISTENT.TAG');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tag not found');
    });
  });

  // ==================== TAG SEARCH ====================

  describe('searchTags', () => {
    beforeEach(async () => {
      const tags: SurrogateTag[] = [
        {
          id: 'tag-1',
          tagName: 'PRODUCTION.LINE1.TEMPERATURE',
          description: 'Production line 1 temperature sensor',
          dataType: TagDataType.Float,
          engineeringUnits: '°C',
          collector: 'PRODUCTION',
          compressionType: 'None',
          compressionDeviation: 0,
          storageType: 'Normal',
          retentionHours: 24,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'test',
          isActive: true,
          defaultQuality: 100,
          qualityThreshold: 50
        },
        {
          id: 'tag-2',
          tagName: 'PRODUCTION.LINE1.PRESSURE',
          description: 'Production line 1 pressure sensor',
          dataType: TagDataType.Float,
          engineeringUnits: 'psi',
          collector: 'PRODUCTION',
          compressionType: 'None',
          compressionDeviation: 0,
          storageType: 'Normal',
          retentionHours: 24,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'test',
          isActive: true,
          defaultQuality: 100,
          qualityThreshold: 50
        },
        {
          id: 'tag-3',
          tagName: 'QUALITY.INSPECTOR.STATUS',
          description: 'Quality inspector status',
          dataType: TagDataType.Boolean,
          engineeringUnits: '',
          collector: 'QUALITY',
          compressionType: 'None',
          compressionDeviation: 0,
          storageType: 'Normal',
          retentionHours: 24,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'test',
          isActive: true,
          defaultQuality: 100,
          qualityThreshold: 50
        }
      ];

      for (const tag of tags) {
        await tagRegistry.createTag(tag);
      }
    });

    it('should search tags by partial name match', async () => {
      const results = await tagRegistry.searchTags('PRODUCTION');

      expect(results.length).toBe(2);
      expect(results.every(tag => tag.tagName.includes('PRODUCTION'))).toBe(true);
    });

    it('should search tags by description', async () => {
      const results = await tagRegistry.searchTags('temperature');

      expect(results.length).toBe(1);
      expect(results[0].tagName).toBe('PRODUCTION.LINE1.TEMPERATURE');
    });

    it('should search tags case-insensitively', async () => {
      const results = await tagRegistry.searchTags('production');

      expect(results.length).toBe(2);
    });

    it('should support wildcard patterns', async () => {
      const results = await tagRegistry.searchTags('PRODUCTION.*.TEMPERATURE');

      expect(results.length).toBe(1);
      expect(results[0].tagName).toBe('PRODUCTION.LINE1.TEMPERATURE');
    });

    it('should return empty array for no matches', async () => {
      const results = await tagRegistry.searchTags('NONEXISTENT');

      expect(results.length).toBe(0);
    });

    it('should limit search results', async () => {
      const results = await tagRegistry.searchTags('PRODUCTION', { limit: 1 });

      expect(results.length).toBe(1);
    });
  });

  // ==================== STATISTICS AND HEALTH ====================

  describe('getTagCount', () => {
    it('should return correct tag count', async () => {
      const initialCount = await tagRegistry.getTagCount();
      expect(initialCount).toBe(0);

      const sampleTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.COUNT.TAG',
        description: 'Test count tag',
        dataType: TagDataType.Float,
        engineeringUnits: 'units',
        collector: 'TEST',
        compressionType: 'None',
        compressionDeviation: 0,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      await tagRegistry.createTag(sampleTag);

      const countAfterAdd = await tagRegistry.getTagCount();
      expect(countAfterAdd).toBe(1);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status information', async () => {
      const health = tagRegistry.getHealthStatus();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('totalTags');
      expect(health).toHaveProperty('activeTags');
      expect(health).toHaveProperty('inactiveTags');
      expect(health).toHaveProperty('dataTypes');
      expect(health).toHaveProperty('collectors');
      expect(typeof health.healthy).toBe('boolean');
      expect(typeof health.totalTags).toBe('number');
    });
  });

  // ==================== DATA OPERATIONS ====================

  describe('clear', () => {
    beforeEach(async () => {
      const sampleTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.CLEAR.TAG',
        description: 'Test clear tag',
        dataType: TagDataType.Float,
        engineeringUnits: 'units',
        collector: 'TEST',
        compressionType: 'None',
        compressionDeviation: 0,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      await tagRegistry.createTag(sampleTag);
    });

    it('should clear all tags', async () => {
      await tagRegistry.clear();

      const tagCount = await tagRegistry.getTagCount();
      expect(tagCount).toBe(0);

      const allTags = await tagRegistry.getAllTags();
      expect(allTags.length).toBe(0);
    });
  });

  // ==================== DATA TYPE VALIDATION ====================

  describe('data type validation', () => {
    it('should support all data types', () => {
      const dataTypes = Object.values(TagDataType);
      expect(dataTypes).toContain(TagDataType.Float);
      expect(dataTypes).toContain(TagDataType.Integer);
      expect(dataTypes).toContain(TagDataType.Boolean);
      expect(dataTypes).toContain(TagDataType.String);
      expect(dataTypes).toContain(TagDataType.DateTime);
    });

    it('should validate data type specific properties', async () => {
      const floatTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.FLOAT.TAG',
        description: 'Test float tag',
        dataType: TagDataType.Float,
        engineeringUnits: 'units',
        collector: 'TEST',
        compressionType: 'Swinging Door',
        compressionDeviation: 0.1, // Valid for float
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      const result = await tagRegistry.createTag(floatTag);
      expect(result.success).toBe(true);
    });

    it('should reject invalid compression for boolean tags', async () => {
      const booleanTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.BOOLEAN.TAG',
        description: 'Test boolean tag',
        dataType: TagDataType.Boolean,
        engineeringUnits: '',
        collector: 'TEST',
        compressionType: 'Swinging Door', // Invalid for boolean
        compressionDeviation: 0.1,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      const result = await tagRegistry.createTag(booleanTag);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Compression not supported for Boolean data type');
    });
  });

  // ==================== EDGE CASES AND ERROR HANDLING ====================

  describe('edge cases and error handling', () => {
    it('should handle very long tag names', async () => {
      const longNameTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'A'.repeat(1000), // Very long name
        description: 'Test long name tag',
        dataType: TagDataType.Float,
        engineeringUnits: 'units',
        collector: 'TEST',
        compressionType: 'None',
        compressionDeviation: 0,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      const result = await tagRegistry.createTag(longNameTag);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tag name too long');
    });

    it('should handle special characters in tag names', async () => {
      const specialCharTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.TAG.WITH_SPECIAL-CHARS.123',
        description: 'Test special character tag',
        dataType: TagDataType.Float,
        engineeringUnits: 'units',
        collector: 'TEST',
        compressionType: 'None',
        compressionDeviation: 0,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      const result = await tagRegistry.createTag(specialCharTag);
      expect(result.success).toBe(true); // Should accept valid special characters
    });

    it('should handle concurrent tag creation', async () => {
      const tag1: SurrogateTag = {
        id: 'tag-1',
        tagName: 'CONCURRENT.TAG.1',
        description: 'Concurrent test tag 1',
        dataType: TagDataType.Float,
        engineeringUnits: 'units',
        collector: 'TEST',
        compressionType: 'None',
        compressionDeviation: 0,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      const tag2: SurrogateTag = {
        id: 'tag-2',
        tagName: 'CONCURRENT.TAG.2',
        description: 'Concurrent test tag 2',
        dataType: TagDataType.Float,
        engineeringUnits: 'units',
        collector: 'TEST',
        compressionType: 'None',
        compressionDeviation: 0,
        storageType: 'Normal',
        retentionHours: 24,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      const [result1, result2] = await Promise.all([
        tagRegistry.createTag(tag1),
        tagRegistry.createTag(tag2)
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const allTags = await tagRegistry.getAllTags();
      expect(allTags.length).toBe(2);
    });
  });
});