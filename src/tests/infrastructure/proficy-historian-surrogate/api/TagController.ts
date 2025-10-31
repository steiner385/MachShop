import { Request, Response } from 'express';
import { TagRegistry, TagListFilters } from '../storage/TagRegistry';
import { ErrorSimulator } from '../simulation/ErrorSimulator';
import { SurrogateTag, TagDataType, CompressionType, StorageType } from '../storage/schemas';

/**
 * Tag Controller
 * Handles REST API endpoints for tag management (CRUD operations)
 */
export class TagController {
  constructor(
    private tagRegistry: TagRegistry,
    private errorSimulator: ErrorSimulator
  ) {}

  /**
   * POST /historian/tags
   * Create a new tag
   */
  async createTag(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      if (!req.body || !req.body.TagName) {
        res.status(400).json({
          error: 'Invalid request body. TagName is required.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Convert input format to internal format
      const tagConfig = this.convertToTagConfig(req.body);

      // Create the tag
      const createdTag = await this.tagRegistry.createTag(tagConfig);

      // Format response
      const response = this.formatTagResponse(createdTag);

      res.status(201).json({
        Success: true,
        Tag: response,
        Message: `Tag created successfully: ${createdTag.tagName}`,
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Tag creation failed:', error);

      if (error.message.includes('already exists')) {
        res.status(409).json({
          error: 'Tag already exists',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      } else if (error.message.includes('invalid') || error.message.includes('validation')) {
        res.status(400).json({
          error: 'Invalid tag configuration',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          error: 'Failed to create tag',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * GET /historian/tags
   * List tags with optional filtering and pagination
   */
  async listTags(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters
      const filters = this.parseListFilters(req.query);
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 100, 1000);

      // Get tags from registry
      const result = await this.tagRegistry.listTags(filters, page, pageSize);

      // Format response
      const response = {
        Success: true,
        Tags: result.tags.map(tag => this.formatTagResponse(tag)),
        Pagination: {
          Page: result.page,
          PageSize: result.pageSize,
          TotalPages: result.totalPages,
          TotalTags: result.total
        },
        Filters: filters,
        Timestamp: new Date().toISOString()
      };

      res.status(200).json(response);

    } catch (error: any) {
      console.error('Tag listing failed:', error);
      res.status(400).json({
        error: 'Invalid list parameters',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/tags/:tagName
   * Get a specific tag by name
   */
  async getTag(req: Request, res: Response): Promise<void> {
    try {
      const tagName = req.params.tagName;
      if (!tagName) {
        res.status(400).json({
          error: 'Tag name is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get tag from registry
      const tag = await this.tagRegistry.getTag(tagName);
      if (!tag) {
        res.status(404).json({
          error: 'Tag not found',
          tagName,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Format response
      const response = this.formatTagResponse(tag);

      res.status(200).json({
        Success: true,
        Tag: response,
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Tag retrieval failed:', error);
      res.status(500).json({
        error: 'Failed to retrieve tag',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * PUT /historian/tags/:tagName
   * Update an existing tag
   */
  async updateTag(req: Request, res: Response): Promise<void> {
    try {
      const tagName = req.params.tagName;
      if (!tagName) {
        res.status(400).json({
          error: 'Tag name is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if tag exists
      const existingTag = await this.tagRegistry.getTag(tagName);
      if (!existingTag) {
        res.status(404).json({
          error: 'Tag not found',
          tagName,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Convert input to updates
      const updates = this.convertToTagUpdates(req.body);

      // Update the tag
      const updatedTag = await this.tagRegistry.updateTag(tagName, updates);

      // Format response
      const response = this.formatTagResponse(updatedTag);

      res.status(200).json({
        Success: true,
        Tag: response,
        Message: `Tag updated successfully: ${tagName}`,
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Tag update failed:', error);
      res.status(400).json({
        error: 'Failed to update tag',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * DELETE /historian/tags/:tagName
   * Delete a tag
   */
  async deleteTag(req: Request, res: Response): Promise<void> {
    try {
      const tagName = req.params.tagName;
      if (!tagName) {
        res.status(400).json({
          error: 'Tag name is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Delete the tag
      const deleted = await this.tagRegistry.deleteTag(tagName);
      if (!deleted) {
        res.status(404).json({
          error: 'Tag not found',
          tagName,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        Success: true,
        Message: `Tag deleted successfully: ${tagName}`,
        TagName: tagName,
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Tag deletion failed:', error);
      res.status(500).json({
        error: 'Failed to delete tag',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /historian/tags/bulk
   * Create multiple tags in bulk
   */
  async bulkCreateTags(req: Request, res: Response): Promise<void> {
    try {
      if (!req.body || !Array.isArray(req.body.Tags)) {
        res.status(400).json({
          error: 'Invalid request body. Expected { Tags: [...] }',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const tagConfigs = req.body.Tags.map((tag: any) => this.convertToTagConfig(tag));

      // Bulk create tags
      const result = await this.tagRegistry.bulkCreateTags(tagConfigs);

      res.status(201).json({
        Success: true,
        Created: result.created.map(tag => this.formatTagResponse(tag)),
        Failed: result.failed,
        Summary: {
          TotalRequested: result.totalRequested,
          SuccessfullyCreated: result.created.length,
          Failed: result.failed.length
        },
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Bulk tag creation failed:', error);
      res.status(400).json({
        error: 'Bulk tag creation failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/tags/search
   * Search tags by pattern
   */
  async searchTags(req: Request, res: Response): Promise<void> {
    try {
      const pattern = req.query.pattern as string;
      if (!pattern) {
        res.status(400).json({
          error: 'Search pattern is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Search tags
      const tags = await this.tagRegistry.searchTags(pattern);

      res.status(200).json({
        Success: true,
        Tags: tags.map(tag => this.formatTagResponse(tag)),
        SearchPattern: pattern,
        ResultCount: tags.length,
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Tag search failed:', error);
      res.status(400).json({
        error: 'Tag search failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/tags/statistics
   * Get tag registry statistics
   */
  async getTagStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = this.tagRegistry.getStatistics();

      res.status(200).json({
        Success: true,
        Statistics: statistics,
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Failed to get tag statistics:', error);
      res.status(500).json({
        error: 'Failed to retrieve tag statistics',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /historian/tags/auto-configure
   * Auto-configure standard equipment tags
   */
  async autoConfigureTags(req: Request, res: Response): Promise<void> {
    try {
      const equipmentIds = req.body?.EquipmentIds;
      if (!equipmentIds || !Array.isArray(equipmentIds)) {
        res.status(400).json({
          error: 'EquipmentIds array is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Auto-configure tags
      const result = await this.tagRegistry.autoConfigureEquipmentTags(equipmentIds);

      res.status(201).json({
        Success: true,
        Created: result.created.map(tag => this.formatTagResponse(tag)),
        Failed: result.failed,
        Summary: {
          EquipmentCount: equipmentIds.length,
          TagsCreated: result.created.length,
          TagsFailed: result.failed.length
        },
        Timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Auto-configure failed:', error);
      res.status(500).json({
        error: 'Auto-configuration failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Private helper methods

  /**
   * Convert API input format to internal tag configuration
   */
  private convertToTagConfig(input: any): Partial<SurrogateTag> {
    return {
      tagName: input.TagName,
      description: input.Description || '',
      dataType: this.parseDataType(input.DataType),
      engineeringUnits: input.EngineeringUnits || '',
      collector: input.Collector || 'MES',
      minValue: input.MinValue,
      maxValue: input.MaxValue,
      compressionType: this.parseCompressionType(input.CompressionType),
      compressionDeviation: input.CompressionDeviation || 0.1,
      storageType: this.parseStorageType(input.StorageType),
      retentionHours: input.RetentionHours || 24,
      isActive: input.IsActive !== undefined ? input.IsActive : true,
      defaultQuality: input.DefaultQuality || 100,
      qualityThreshold: input.QualityThreshold || 50
    };
  }

  /**
   * Convert API input to tag updates
   */
  private convertToTagUpdates(input: any): Partial<SurrogateTag> {
    const updates: Partial<SurrogateTag> = {};

    if (input.Description !== undefined) updates.description = input.Description;
    if (input.EngineeringUnits !== undefined) updates.engineeringUnits = input.EngineeringUnits;
    if (input.Collector !== undefined) updates.collector = input.Collector;
    if (input.MinValue !== undefined) updates.minValue = input.MinValue;
    if (input.MaxValue !== undefined) updates.maxValue = input.MaxValue;
    if (input.CompressionType !== undefined) updates.compressionType = this.parseCompressionType(input.CompressionType);
    if (input.CompressionDeviation !== undefined) updates.compressionDeviation = input.CompressionDeviation;
    if (input.StorageType !== undefined) updates.storageType = this.parseStorageType(input.StorageType);
    if (input.RetentionHours !== undefined) updates.retentionHours = input.RetentionHours;
    if (input.IsActive !== undefined) updates.isActive = input.IsActive;
    if (input.DefaultQuality !== undefined) updates.defaultQuality = input.DefaultQuality;
    if (input.QualityThreshold !== undefined) updates.qualityThreshold = input.QualityThreshold;

    return updates;
  }

  /**
   * Parse list filters from query parameters
   */
  private parseListFilters(query: any): TagListFilters {
    const filters: TagListFilters = {};

    if (query.dataType) filters.dataType = this.parseDataType(query.dataType);
    if (query.collector) filters.collector = query.collector;
    if (query.isActive !== undefined) filters.isActive = query.isActive === 'true';
    if (query.pattern) filters.pattern = query.pattern;
    if (query.createdAfter) filters.createdAfter = new Date(query.createdAfter);
    if (query.createdBefore) filters.createdBefore = new Date(query.createdBefore);
    if (query.sortBy) filters.sortBy = query.sortBy;
    if (query.sortOrder) filters.sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

    return filters;
  }

  /**
   * Parse data type from string
   */
  private parseDataType(dataType: string | undefined): TagDataType {
    if (!dataType) return TagDataType.FLOAT;

    switch (dataType.toUpperCase()) {
      case 'FLOAT': return TagDataType.FLOAT;
      case 'INTEGER': return TagDataType.INTEGER;
      case 'STRING': return TagDataType.STRING;
      case 'BOOLEAN': return TagDataType.BOOLEAN;
      case 'DATETIME': return TagDataType.DATETIME;
      default: return TagDataType.FLOAT;
    }
  }

  /**
   * Parse compression type from string
   */
  private parseCompressionType(compressionType: string | undefined): CompressionType {
    if (!compressionType) return CompressionType.SWINGING_DOOR;

    switch (compressionType.toUpperCase().replace(/\s+/g, '_')) {
      case 'NONE': return CompressionType.NONE;
      case 'SWINGING_DOOR': return CompressionType.SWINGING_DOOR;
      case 'BOXCAR': return CompressionType.BOXCAR;
      default: return CompressionType.SWINGING_DOOR;
    }
  }

  /**
   * Parse storage type from string
   */
  private parseStorageType(storageType: string | undefined): StorageType {
    if (!storageType) return StorageType.NORMAL;

    switch (storageType.toUpperCase()) {
      case 'NORMAL': return StorageType.NORMAL;
      case 'LAB': return StorageType.LAB;
      default: return StorageType.NORMAL;
    }
  }

  /**
   * Format tag for API response
   */
  private formatTagResponse(tag: SurrogateTag): any {
    return {
      Id: tag.id,
      TagName: tag.tagName,
      Description: tag.description,
      DataType: tag.dataType,
      EngineeringUnits: tag.engineeringUnits,
      Collector: tag.collector,
      MinValue: tag.minValue,
      MaxValue: tag.maxValue,
      CompressionType: tag.compressionType,
      CompressionDeviation: tag.compressionDeviation,
      StorageType: tag.storageType,
      RetentionHours: tag.retentionHours,
      CreatedAt: tag.createdAt.toISOString(),
      UpdatedAt: tag.updatedAt.toISOString(),
      CreatedBy: tag.createdBy,
      IsActive: tag.isActive,
      DefaultQuality: tag.defaultQuality,
      QualityThreshold: tag.qualityThreshold
    };
  }
}