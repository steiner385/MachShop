import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TimeSeriesStore } from '../../../../tests/infrastructure/proficy-historian-surrogate/storage/TimeSeriesStore';
import { TagRegistry } from '../../../../tests/infrastructure/proficy-historian-surrogate/storage/TagRegistry';
import { SurrogateDataPoint, SurrogateTag, TagDataType, AggregationType } from '../../../../tests/infrastructure/proficy-historian-surrogate/storage/schemas';

describe('TimeSeriesStore', () => {
  let timeSeriesStore: TimeSeriesStore;
  let mockTagRegistry: TagRegistry;

  beforeEach(() => {
    // Mock TagRegistry
    mockTagRegistry = {
      getTag: vi.fn(),
      getAllTags: vi.fn(),
      createTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
      clear: vi.fn(),
      getTagCount: vi.fn(),
      searchTags: vi.fn(),
      getHealthStatus: vi.fn(),
    } as any;

    timeSeriesStore = new TimeSeriesStore({
      maxDataPoints: 10000,
      retentionHours: 24,
      compressionEnabled: true,
      aggregationEnabled: true
    }, mockTagRegistry);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== DATA WRITING ====================

  describe('writeDataPoints', () => {
    const sampleTag: SurrogateTag = {
      id: 'tag-1',
      tagName: 'TEST.SENSOR.TEMP',
      description: 'Test temperature sensor',
      dataType: TagDataType.Float,
      engineeringUnits: '°C',
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

    const sampleDataPoints: SurrogateDataPoint[] = [
      {
        tagName: 'TEST.SENSOR.TEMP',
        timestamp: new Date('2025-01-01T10:00:00Z'),
        value: 25.5,
        quality: 100
      },
      {
        tagName: 'TEST.SENSOR.TEMP',
        timestamp: new Date('2025-01-01T10:01:00Z'),
        value: 26.0,
        quality: 100
      }
    ];

    it('should write data points successfully', async () => {
      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(sampleTag);

      const result = await timeSeriesStore.writeDataPoints(sampleDataPoints);

      expect(result.success).toBe(true);
      expect(result.pointsWritten).toBe(2);
      expect(result.pointsFailed).toBe(0);
      expect(mockTagRegistry.getTag).toHaveBeenCalledWith('TEST.SENSOR.TEMP');
    });

    it('should handle missing tags gracefully', async () => {
      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(null);

      const result = await timeSeriesStore.writeDataPoints(sampleDataPoints);

      expect(result.success).toBe(false);
      expect(result.pointsWritten).toBe(0);
      expect(result.pointsFailed).toBe(2);
      expect(result.errors).toContain('Tag TEST.SENSOR.TEMP not found');
    });

    it('should validate data point quality', async () => {
      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(sampleTag);

      const invalidDataPoints: SurrogateDataPoint[] = [
        {
          tagName: 'TEST.SENSOR.TEMP',
          timestamp: new Date(),
          value: 25.5,
          quality: -10 // Invalid quality
        }
      ];

      const result = await timeSeriesStore.writeDataPoints(invalidDataPoints);

      expect(result.pointsFailed).toBe(1);
      expect(result.errors).toContain('Quality must be between 0 and 100');
    });

    it('should handle compression when enabled', async () => {
      const tagWithCompression = { ...sampleTag, compressionType: 'Swinging Door', compressionDeviation: 1.0 };
      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(tagWithCompression);

      // Create data points that should compress (similar values)
      const compressibleData: SurrogateDataPoint[] = [
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date('2025-01-01T10:00:00Z'), value: 25.0, quality: 100 },
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date('2025-01-01T10:01:00Z'), value: 25.1, quality: 100 },
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date('2025-01-01T10:02:00Z'), value: 25.2, quality: 100 },
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date('2025-01-01T10:03:00Z'), value: 25.1, quality: 100 }
      ];

      const result = await timeSeriesStore.writeDataPoints(compressibleData);

      expect(result.success).toBe(true);
      expect(result.pointsWritten).toBe(4);
      expect(result.compressionApplied).toBe(true);
    });

    it('should reject duplicate timestamps for same tag', async () => {
      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(sampleTag);

      const duplicateData: SurrogateDataPoint[] = [
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date('2025-01-01T10:00:00Z'), value: 25.0, quality: 100 },
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date('2025-01-01T10:00:00Z'), value: 26.0, quality: 100 }
      ];

      const result = await timeSeriesStore.writeDataPoints(duplicateData);

      expect(result.pointsFailed).toBeGreaterThan(0);
    });

    it('should handle type conversion based on tag data type', async () => {
      const integerTag = { ...sampleTag, dataType: TagDataType.Integer };
      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(integerTag);

      const typeConversionData: SurrogateDataPoint[] = [
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date(), value: '25.7', quality: 100 } // String that should convert to integer
      ];

      const result = await timeSeriesStore.writeDataPoints(typeConversionData);

      expect(result.success).toBe(true);
      expect(result.pointsWritten).toBe(1);
    });
  });

  describe('writeSingleDataPoint', () => {
    it('should write single data point', async () => {
      const sampleTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.SENSOR.PRESSURE',
        description: 'Test pressure sensor',
        dataType: TagDataType.Float,
        engineeringUnits: 'psi',
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

      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(sampleTag);

      const dataPoint: SurrogateDataPoint = {
        tagName: 'TEST.SENSOR.PRESSURE',
        timestamp: new Date(),
        value: 150.5,
        quality: 100
      };

      const result = await timeSeriesStore.writeSingleDataPoint(dataPoint);

      expect(result.success).toBe(true);
      expect(mockTagRegistry.getTag).toHaveBeenCalledWith('TEST.SENSOR.PRESSURE');
    });
  });

  // ==================== DATA READING ====================

  describe('queryDataPoints', () => {
    beforeEach(async () => {
      // Setup test data
      const sampleTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.SENSOR.TEMP',
        description: 'Test temperature sensor',
        dataType: TagDataType.Float,
        engineeringUnits: '°C',
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

      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(sampleTag);

      // Write some test data
      const testData: SurrogateDataPoint[] = [];
      for (let i = 0; i < 10; i++) {
        testData.push({
          tagName: 'TEST.SENSOR.TEMP',
          timestamp: new Date(Date.now() + i * 60000), // 1 minute intervals
          value: 20 + i,
          quality: 100
        });
      }

      await timeSeriesStore.writeDataPoints(testData);
    });

    it('should query data points by tag name', async () => {
      const result = await timeSeriesStore.queryDataPoints({
        tagNames: ['TEST.SENSOR.TEMP'],
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date(Date.now() + 3600000) // 1 hour from now
      });

      expect(result.success).toBe(true);
      expect(result.dataPoints).toBeDefined();
      expect(result.dataPoints.length).toBeGreaterThan(0);
    });

    it('should filter by time range', async () => {
      const startTime = new Date(Date.now() + 120000); // 2 minutes from now
      const endTime = new Date(Date.now() + 480000);   // 8 minutes from now

      const result = await timeSeriesStore.queryDataPoints({
        tagNames: ['TEST.SENSOR.TEMP'],
        startTime,
        endTime
      });

      expect(result.success).toBe(true);
      expect(result.dataPoints.every(dp => dp.timestamp >= startTime && dp.timestamp <= endTime)).toBe(true);
    });

    it('should limit results when maxResults specified', async () => {
      const result = await timeSeriesStore.queryDataPoints({
        tagNames: ['TEST.SENSOR.TEMP'],
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 3600000),
        maxResults: 5
      });

      expect(result.success).toBe(true);
      expect(result.dataPoints.length).toBeLessThanOrEqual(5);
    });

    it('should filter by quality threshold', async () => {
      const result = await timeSeriesStore.queryDataPoints({
        tagNames: ['TEST.SENSOR.TEMP'],
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 3600000),
        qualityFilter: 90
      });

      expect(result.success).toBe(true);
      expect(result.dataPoints.every(dp => dp.quality >= 90)).toBe(true);
    });

    it('should handle invalid tag names', async () => {
      const result = await timeSeriesStore.queryDataPoints({
        tagNames: ['INVALID.TAG'],
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 3600000)
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No valid tags found');
    });
  });

  describe('getRecentDataPoints', () => {
    it('should get recent data points for tag', async () => {
      const sampleTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.SENSOR.TEMP',
        description: 'Test temperature sensor',
        dataType: TagDataType.Float,
        engineeringUnits: '°C',
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

      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(sampleTag);

      // Write test data
      const testData: SurrogateDataPoint[] = [
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date(Date.now() - 300000), value: 25.0, quality: 100 },
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date(Date.now() - 240000), value: 25.5, quality: 100 },
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date(Date.now() - 180000), value: 26.0, quality: 100 }
      ];
      await timeSeriesStore.writeDataPoints(testData);

      const result = await timeSeriesStore.getRecentDataPoints('TEST.SENSOR.TEMP', 2);

      expect(result.length).toBeLessThanOrEqual(2);
      // Should be ordered by timestamp descending (most recent first)
      if (result.length > 1) {
        expect(result[0].timestamp.getTime()).toBeGreaterThanOrEqual(result[1].timestamp.getTime());
      }
    });
  });

  // ==================== AGGREGATIONS ====================

  describe('calculateAggregation', () => {
    beforeEach(async () => {
      const sampleTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.SENSOR.TEMP',
        description: 'Test temperature sensor',
        dataType: TagDataType.Float,
        engineeringUnits: '°C',
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

      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(sampleTag);

      // Write test data with known values for aggregation testing
      const testData: SurrogateDataPoint[] = [
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date('2025-01-01T10:00:00Z'), value: 10, quality: 100 },
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date('2025-01-01T10:01:00Z'), value: 20, quality: 100 },
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date('2025-01-01T10:02:00Z'), value: 30, quality: 100 },
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date('2025-01-01T10:03:00Z'), value: 40, quality: 100 },
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date('2025-01-01T10:04:00Z'), value: 50, quality: 100 }
      ];

      await timeSeriesStore.writeDataPoints(testData);
    });

    it('should calculate average aggregation', async () => {
      const result = await timeSeriesStore.calculateAggregation({
        tagName: 'TEST.SENSOR.TEMP',
        aggregationType: AggregationType.Average,
        startTime: new Date('2025-01-01T09:59:00Z'),
        endTime: new Date('2025-01-01T10:05:00Z')
      });

      expect(result.success).toBe(true);
      expect(result.value).toBe(30); // (10+20+30+40+50)/5 = 30
      expect(result.count).toBe(5);
    });

    it('should calculate minimum aggregation', async () => {
      const result = await timeSeriesStore.calculateAggregation({
        tagName: 'TEST.SENSOR.TEMP',
        aggregationType: AggregationType.Minimum,
        startTime: new Date('2025-01-01T09:59:00Z'),
        endTime: new Date('2025-01-01T10:05:00Z')
      });

      expect(result.success).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should calculate maximum aggregation', async () => {
      const result = await timeSeriesStore.calculateAggregation({
        tagName: 'TEST.SENSOR.TEMP',
        aggregationType: AggregationType.Maximum,
        startTime: new Date('2025-01-01T09:59:00Z'),
        endTime: new Date('2025-01-01T10:05:00Z')
      });

      expect(result.success).toBe(true);
      expect(result.value).toBe(50);
    });

    it('should calculate sum aggregation', async () => {
      const result = await timeSeriesStore.calculateAggregation({
        tagName: 'TEST.SENSOR.TEMP',
        aggregationType: AggregationType.Sum,
        startTime: new Date('2025-01-01T09:59:00Z'),
        endTime: new Date('2025-01-01T10:05:00Z')
      });

      expect(result.success).toBe(true);
      expect(result.value).toBe(150); // 10+20+30+40+50 = 150
    });

    it('should calculate count aggregation', async () => {
      const result = await timeSeriesStore.calculateAggregation({
        tagName: 'TEST.SENSOR.TEMP',
        aggregationType: AggregationType.Count,
        startTime: new Date('2025-01-01T09:59:00Z'),
        endTime: new Date('2025-01-01T10:05:00Z')
      });

      expect(result.success).toBe(true);
      expect(result.value).toBe(5);
      expect(result.count).toBe(5);
    });

    it('should handle empty result set', async () => {
      const result = await timeSeriesStore.calculateAggregation({
        tagName: 'TEST.SENSOR.TEMP',
        aggregationType: AggregationType.Average,
        startTime: new Date('2025-01-01T08:00:00Z'),
        endTime: new Date('2025-01-01T08:30:00Z')
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No data points found for aggregation');
    });
  });

  // ==================== STORAGE MANAGEMENT ====================

  describe('getStorageStatistics', () => {
    it('should return storage statistics', async () => {
      const stats = await timeSeriesStore.getStorageStatistics();

      expect(stats).toHaveProperty('totalDataPoints');
      expect(stats).toHaveProperty('totalTags');
      expect(stats).toHaveProperty('storageSize');
      expect(stats).toHaveProperty('compressionRatio');
      expect(stats).toHaveProperty('oldestDataPoint');
      expect(stats).toHaveProperty('newestDataPoint');
      expect(typeof stats.totalDataPoints).toBe('number');
      expect(typeof stats.totalTags).toBe('number');
    });
  });

  describe('cleanupExpiredData', () => {
    it('should cleanup expired data based on retention policy', async () => {
      const sampleTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.SENSOR.TEMP',
        description: 'Test temperature sensor',
        dataType: TagDataType.Float,
        engineeringUnits: '°C',
        collector: 'TEST',
        compressionType: 'None',
        compressionDeviation: 0,
        storageType: 'Normal',
        retentionHours: 1, // 1 hour retention
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        isActive: true,
        defaultQuality: 100,
        qualityThreshold: 50
      };

      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(sampleTag);
      vi.mocked(mockTagRegistry.getAllTags).mockResolvedValue([sampleTag]);

      // Write expired test data
      const expiredData: SurrogateDataPoint[] = [
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date(Date.now() - 7200000), value: 25.0, quality: 100 }, // 2 hours ago
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date(Date.now() - 3600000), value: 26.0, quality: 100 }  // 1 hour ago
      ];

      await timeSeriesStore.writeDataPoints(expiredData);

      const result = await timeSeriesStore.cleanupExpiredData();

      expect(result.success).toBe(true);
      expect(result.pointsRemoved).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all data from store', async () => {
      // Write some test data first
      const sampleTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.SENSOR.TEMP',
        description: 'Test temperature sensor',
        dataType: TagDataType.Float,
        engineeringUnits: '°C',
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

      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(sampleTag);

      const testData: SurrogateDataPoint[] = [
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date(), value: 25.0, quality: 100 }
      ];

      await timeSeriesStore.writeDataPoints(testData);

      // Clear the store
      await timeSeriesStore.clear();

      // Verify data is cleared
      const stats = await timeSeriesStore.getStorageStatistics();
      expect(stats.totalDataPoints).toBe(0);
    });
  });

  // ==================== HEALTH MONITORING ====================

  describe('getHealthStatus', () => {
    it('should return health status information', async () => {
      const health = timeSeriesStore.getHealthStatus();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('totalDataPoints');
      expect(health).toHaveProperty('totalTags');
      expect(health).toHaveProperty('storageUtilization');
      expect(health).toHaveProperty('lastWriteTime');
      expect(health).toHaveProperty('performanceMetrics');
      expect(typeof health.healthy).toBe('boolean');
      expect(typeof health.totalDataPoints).toBe('number');
    });

    it('should indicate unhealthy when storage utilization is high', async () => {
      // Fill up the store close to capacity
      const timeSeriesStoreSmall = new TimeSeriesStore({
        maxDataPoints: 5, // Very small capacity
        retentionHours: 24,
        compressionEnabled: false,
        aggregationEnabled: true
      }, mockTagRegistry);

      const sampleTag: SurrogateTag = {
        id: 'tag-1',
        tagName: 'TEST.SENSOR.TEMP',
        description: 'Test temperature sensor',
        dataType: TagDataType.Float,
        engineeringUnits: '°C',
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

      vi.mocked(mockTagRegistry.getTag).mockResolvedValue(sampleTag);

      // Fill store to capacity
      const testData: SurrogateDataPoint[] = [];
      for (let i = 0; i < 10; i++) {
        testData.push({
          tagName: 'TEST.SENSOR.TEMP',
          timestamp: new Date(Date.now() + i * 1000),
          value: 25.0 + i,
          quality: 100
        });
      }

      await timeSeriesStoreSmall.writeDataPoints(testData);

      const health = timeSeriesStoreSmall.getHealthStatus();
      expect(health.storageUtilization).toBeGreaterThan(0.8); // Should be over 80%
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('error handling', () => {
    it('should handle invalid data gracefully', async () => {
      const invalidData: any[] = [
        { tagName: null, timestamp: new Date(), value: 25.0, quality: 100 },
        { tagName: 'TEST.TAG', timestamp: null, value: 25.0, quality: 100 },
        { tagName: 'TEST.TAG', timestamp: new Date(), value: null, quality: 100 }
      ];

      const result = await timeSeriesStore.writeDataPoints(invalidData);

      expect(result.success).toBe(false);
      expect(result.pointsFailed).toBe(3);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle tag registry errors', async () => {
      vi.mocked(mockTagRegistry.getTag).mockRejectedValue(new Error('Tag registry error'));

      const testData: SurrogateDataPoint[] = [
        { tagName: 'TEST.SENSOR.TEMP', timestamp: new Date(), value: 25.0, quality: 100 }
      ];

      const result = await timeSeriesStore.writeDataPoints(testData);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Tag registry error');
    });
  });
});