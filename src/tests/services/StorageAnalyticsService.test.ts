/**
 * Comprehensive tests for StorageAnalyticsService
 * Epic 1: Backend Service Testing - Phase 1
 *
 * Tests storage analytics and monitoring functionality including:
 * - Storage metrics collection and analysis
 * - Deduplication statistics and optimization
 * - File versioning analytics
 * - Access pattern analysis
 * - Performance metrics monitoring
 * - Alert generation and thresholds
 * - Comprehensive analytics aggregation
 * - Cost analysis and optimization recommendations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies with proper hoisting
// Mock the database module
vi.mock('../../lib/database', () => ({
  default: {
    storedFile: {
      groupBy: vi.fn(),
    },
    fileAccessLog: {
      findMany: vi.fn(),
    },
    storageMetrics: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../services/CloudStorageService', () => ({
  CloudStorageService: vi.fn().mockImplementation(() => ({
    getStorageStatistics: vi.fn(),
  })),
}));

vi.mock('../../services/FileDeduplicationService', () => ({
  FileDeduplicationService: vi.fn().mockImplementation(() => ({
    getDeduplicationStatistics: vi.fn(),
  })),
}));

vi.mock('../../services/FileVersioningService', () => ({
  FileVersioningService: vi.fn().mockImplementation(() => ({
    getVersioningStatistics: vi.fn(),
  })),
}));

vi.mock('../../services/CDNIntegrationService', () => ({
  CDNIntegrationService: vi.fn().mockImplementation(() => ({
    getCDNAnalytics: vi.fn(),
  })),
}));

import { StorageAnalyticsService } from '../../services/StorageAnalyticsService';
import type {
  StorageMetrics,
  DeduplicationMetrics,
  VersioningMetrics,
  AccessPatterns,
  PerformanceMetrics,
  ComprehensiveAnalytics,
  AlertConfiguration,
  AlertResult
} from '../../services/StorageAnalyticsService';
import { StorageClass } from '@prisma/client';
import { logger } from '../../utils/logger';

// Get the mocked instances
const mockLogger = logger as any;
const mockPrisma = vi.mocked(await import('../../lib/database')).default;

describe('StorageAnalyticsService', () => {
  let storageAnalyticsService: StorageAnalyticsService;
  const mockDate = new Date('2024-01-15T10:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(mockDate);

    storageAnalyticsService = new StorageAnalyticsService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Service Initialization', () => {
    it('should create a new instance with all required dependencies', () => {
      expect(storageAnalyticsService).toBeInstanceOf(StorageAnalyticsService);
      expect(storageAnalyticsService).toBeDefined();
    });

    it('should initialize service and start background metric collection', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      await storageAnalyticsService.initialize();

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        60 * 60 * 1000 // Every hour
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Storage Analytics Service initialized');
    });
  });

  describe('getStorageMetrics', () => {
    it('should get current storage metrics with class distribution', async () => {
      // Mock CloudStorageService response
      const mockCloudService = storageAnalyticsService['cloudStorageService'];
      mockCloudService.getStorageStatistics = vi.fn().mockResolvedValue({
        totalFiles: 1000,
        totalSize: 5368709120, // 5GB
        totalSizeFormatted: '5.00 GB',
      });

      // Mock Prisma groupBy response
      mockPrisma.storedFile.groupBy.mockResolvedValue([
        {
          storageClass: StorageClass.HOT,
          _count: { id: 400 },
          _sum: { fileSize: 2147483648 }, // 2GB
        },
        {
          storageClass: StorageClass.WARM,
          _count: { id: 300 },
          _sum: { fileSize: 1610612736 }, // 1.5GB
        },
        {
          storageClass: StorageClass.COLD,
          _count: { id: 200 },
          _sum: { fileSize: 1073741824 }, // 1GB
        },
        {
          storageClass: StorageClass.ARCHIVE,
          _count: { id: 100 },
          _sum: { fileSize: 536870912 }, // 0.5GB
        },
      ]);

      const result = await storageAnalyticsService.getStorageMetrics();

      expect(result).toEqual({
        timestamp: mockDate,
        totalFiles: 1000,
        totalSize: 5368709120,
        totalSizeFormatted: '5.00 GB',
        storageClassDistribution: {
          [StorageClass.HOT]: {
            count: 400,
            size: 2147483648,
            percentage: 40,
          },
          [StorageClass.WARM]: {
            count: 300,
            size: 1610612736,
            percentage: 30,
          },
          [StorageClass.COLD]: {
            count: 200,
            size: 1073741824,
            percentage: 20,
          },
          [StorageClass.ARCHIVE]: {
            count: 100,
            size: 536870912,
            percentage: 10,
          },
        },
        growthRate: {
          files: 150,
          size: 2684354560, // 2.5GB
        },
        costAnalysis: expect.objectContaining({
          estimatedMonthlyCost: expect.any(Number),
          costPerGB: expect.any(Number),
          costByStorageClass: expect.any(Object),
        }),
      });

      expect(mockPrisma.storedFile.groupBy).toHaveBeenCalledWith({
        by: ['storageClass'],
        _count: { id: true },
        _sum: { fileSize: true },
      });
    });

    it('should handle zero total size gracefully', async () => {
      const mockCloudService = storageAnalyticsService['cloudStorageService'];
      mockCloudService.getStorageStatistics = vi.fn().mockResolvedValue({
        totalFiles: 0,
        totalSize: 0,
        totalSizeFormatted: '0 B',
      });

      mockPrisma.storedFile.groupBy.mockResolvedValue([]);

      const result = await storageAnalyticsService.getStorageMetrics();

      expect(result.totalFiles).toBe(0);
      expect(result.totalSize).toBe(0);
      expect(result.storageClassDistribution).toEqual({});
    });

    it('should handle errors and rethrow them', async () => {
      const mockCloudService = storageAnalyticsService['cloudStorageService'];
      mockCloudService.getStorageStatistics = vi.fn().mockRejectedValue(
        new Error('Cloud service error')
      );

      await expect(storageAnalyticsService.getStorageMetrics()).rejects.toThrow(
        'Cloud service error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get storage metrics:',
        expect.any(Error)
      );
    });
  });

  describe('getDeduplicationMetrics', () => {
    it('should get deduplication statistics and metrics', async () => {
      const mockDeduplicationService = storageAnalyticsService['deduplicationService'];
      const mockStats = {
        duplicateFiles: 150,
        duplicateSize: 1073741824, // 1GB
        duplicateSizeFormatted: '1.00 GB',
        deduplicationRatio: 15.5,
        duplicateGroups: 25,
        averageDuplicatesPerGroup: 6,
        potentialSavings: 805306368, // 768MB
        potentialSavingsFormatted: '768.00 MB',
      };

      mockDeduplicationService.getDeduplicationStatistics = vi.fn().mockResolvedValue(mockStats);

      const result = await storageAnalyticsService.getDeduplicationMetrics();

      expect(result).toEqual({
        totalDuplicates: 150,
        spaceSaved: 1073741824,
        spaceSavedFormatted: '1.00 GB',
        deduplicationRatio: 15.5,
        duplicateGroups: 25,
        averageDuplicatesPerGroup: 6,
        potentialSavings: 805306368,
        potentialSavingsFormatted: '768.00 MB',
      });

      expect(mockDeduplicationService.getDeduplicationStatistics).toHaveBeenCalled();
    });

    it('should handle deduplication service errors', async () => {
      const mockDeduplicationService = storageAnalyticsService['deduplicationService'];
      mockDeduplicationService.getDeduplicationStatistics = vi.fn().mockRejectedValue(
        new Error('Deduplication service error')
      );

      await expect(storageAnalyticsService.getDeduplicationMetrics()).rejects.toThrow(
        'Deduplication service error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get deduplication metrics:',
        expect.any(Error)
      );
    });
  });

  describe('getVersioningMetrics', () => {
    it('should get versioning statistics and overhead metrics', async () => {
      const mockVersioningService = storageAnalyticsService['versioningService'];
      const mockStats = {
        totalVersions: 2500,
        totalFiles: 500,
        averageVersionsPerFile: 5,
        totalVersionStorage: 2147483648, // 2GB
        totalVersionSizeFormatted: '2.00 GB',
        oldestVersion: new Date('2023-01-01T00:00:00Z'),
        newestVersion: new Date('2024-01-15T09:00:00Z'),
        retentionSavings: 536870912, // 512MB
      };

      mockVersioningService.getVersioningStatistics = vi.fn().mockResolvedValue(mockStats);

      const result = await storageAnalyticsService.getVersioningMetrics();

      expect(result).toEqual({
        totalVersions: 2500,
        versionedFiles: 500,
        averageVersionsPerFile: 5,
        versioningOverhead: 2147483648,
        versioningOverheadFormatted: '2.00 GB',
        oldestVersion: new Date('2023-01-01T00:00:00Z'),
        newestVersion: new Date('2024-01-15T09:00:00Z'),
        retentionSavings: 536870912,
      });

      expect(mockVersioningService.getVersioningStatistics).toHaveBeenCalled();
    });

    it('should handle versioning service errors', async () => {
      const mockVersioningService = storageAnalyticsService['versioningService'];
      mockVersioningService.getVersioningStatistics = vi.fn().mockRejectedValue(
        new Error('Versioning service error')
      );

      await expect(storageAnalyticsService.getVersioningMetrics()).rejects.toThrow(
        'Versioning service error'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get versioning metrics:',
        expect.any(Error)
      );
    });
  });

  describe('getAccessPatterns', () => {
    it('should analyze file access patterns and identify hot/cold files', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      const mockAccessLogs = [
        {
          id: 'log1',
          fileId: 'file1',
          accessedAt: new Date('2024-01-15T08:30:00Z'),
          file: { id: 'file1', fileName: 'document1.pdf' },
        },
        {
          id: 'log2',
          fileId: 'file1',
          accessedAt: new Date('2024-01-15T14:15:00Z'),
          file: { id: 'file1', fileName: 'document1.pdf' },
        },
        {
          id: 'log3',
          fileId: 'file2',
          accessedAt: new Date('2024-01-15T09:45:00Z'),
          file: { id: 'file2', fileName: 'image1.jpg' },
        },
        {
          id: 'log4',
          fileId: 'file3',
          accessedAt: new Date('2024-01-15T16:20:00Z'),
          file: { id: 'file3', fileName: 'report1.xlsx' },
        },
      ];

      mockPrisma.fileAccessLog.findMany.mockResolvedValue(mockAccessLogs);

      const result = await storageAnalyticsService.getAccessPatterns(startDate, endDate);

      expect(result.totalAccesses).toBe(4);
      expect(result.uniqueFiles).toBe(3);
      expect(result.averageAccessesPerFile).toBe(1.33);

      // Check time-based access patterns
      expect(result.accessesByTimeOfDay['8']).toBe(1);
      expect(result.accessesByTimeOfDay['9']).toBe(1);
      expect(result.accessesByTimeOfDay['14']).toBe(1);
      expect(result.accessesByTimeOfDay['16']).toBe(1);

      expect(result.accessesByDay['2024-01-15']).toBe(4);

      // Check hot files (most accessed first)
      expect(result.hotFiles[0]).toEqual({
        fileId: 'file1',
        fileName: 'document1.pdf',
        accessCount: 2,
        lastAccessed: new Date('2024-01-15T14:15:00Z'),
      });

      expect(mockPrisma.fileAccessLog.findMany).toHaveBeenCalledWith({
        where: {
          accessedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          file: {
            select: {
              id: true,
              fileName: true,
            },
          },
        },
      });
    });

    it('should handle empty access logs', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      mockPrisma.fileAccessLog.findMany.mockResolvedValue([]);

      const result = await storageAnalyticsService.getAccessPatterns(startDate, endDate);

      expect(result.totalAccesses).toBe(0);
      expect(result.uniqueFiles).toBe(0);
      expect(result.averageAccessesPerFile).toBe(0);
      expect(result.hotFiles).toEqual([]);
      expect(result.coldFiles).toEqual([]);
    });

    it('should handle access pattern analysis errors', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      mockPrisma.fileAccessLog.findMany.mockRejectedValue(
        new Error('Database access error')
      );

      await expect(
        storageAnalyticsService.getAccessPatterns(startDate, endDate)
      ).rejects.toThrow('Database access error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get access patterns:',
        expect.any(Error)
      );
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return simulated performance metrics', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      const mockAccessLogs = [
        { id: 'log1', action: 'UPLOAD', createdAt: mockDate },
        { id: 'log2', action: 'DOWNLOAD', createdAt: mockDate },
        { id: 'log3', action: 'UPLOAD', createdAt: mockDate },
      ];

      mockPrisma.fileAccessLog.findMany.mockResolvedValue(mockAccessLogs);

      const result = await storageAnalyticsService.getPerformanceMetrics(startDate, endDate);

      expect(result).toEqual({
        averageUploadTime: 2500,
        averageDownloadTime: 800,
        averageUploadSpeed: 5 * 1024 * 1024, // 5 MB/s
        averageDownloadSpeed: 25 * 1024 * 1024, // 25 MB/s
        successRate: 98.5,
        errorRate: 1.5,
        mostCommonErrors: [
          { error: 'Network timeout', count: 15 },
          { error: 'File not found', count: 8 },
          { error: 'Insufficient permissions', count: 3 },
        ],
      });

      expect(mockPrisma.fileAccessLog.findMany).toHaveBeenCalledWith({
        where: {
          accessedAt: {
            gte: startDate,
            lte: endDate,
          },
          accessType: { in: ['READ', 'WRITE'] },
        },
      });
    });

    it('should handle performance metrics errors', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      mockPrisma.fileAccessLog.findMany.mockRejectedValue(
        new Error('Performance query error')
      );

      await expect(
        storageAnalyticsService.getPerformanceMetrics(startDate, endDate)
      ).rejects.toThrow('Performance query error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get performance metrics:',
        expect.any(Error)
      );
    });
  });

  describe('getComprehensiveAnalytics', () => {
    beforeEach(() => {
      // Mock all service methods
      const mockCloudService = storageAnalyticsService['cloudStorageService'];
      mockCloudService.getStorageStatistics = vi.fn().mockResolvedValue({
        totalFiles: 1000,
        totalSize: 5368709120,
        totalSizeFormatted: '5.00 GB',
      });

      const mockDeduplicationService = storageAnalyticsService['deduplicationService'];
      mockDeduplicationService.getDeduplicationStatistics = vi.fn().mockResolvedValue({
        duplicateFiles: 150,
        duplicateSize: 1073741824,
        duplicateSizeFormatted: '1.00 GB',
        deduplicationRatio: 15.5,
        duplicateGroups: 25,
        averageDuplicatesPerGroup: 6,
        potentialSavings: 805306368,
        potentialSavingsFormatted: '768.00 MB',
      });

      const mockVersioningService = storageAnalyticsService['versioningService'];
      mockVersioningService.getVersioningStatistics = vi.fn().mockResolvedValue({
        totalVersions: 2500,
        totalFiles: 500,
        averageVersionsPerFile: 5,
        totalVersionStorage: 2147483648,
        totalVersionSizeFormatted: '2.00 GB',
        oldestVersion: new Date('2023-01-01T00:00:00Z'),
        newestVersion: new Date('2024-01-15T09:00:00Z'),
        retentionSavings: 536870912,
      });

      const mockCdnService = storageAnalyticsService['cdnService'];
      mockCdnService.getCDNAnalytics = vi.fn().mockResolvedValue({
        hitRate: 85.5,
        bandwidth: 1024 * 1024 * 100, // 100MB
      });

      mockPrisma.storedFile.groupBy.mockResolvedValue([
        {
          storageClass: StorageClass.HOT,
          _count: { id: 400 },
          _sum: { size: 2147483648 },
        },
      ]);

      mockPrisma.fileAccessLog.findMany.mockResolvedValue([
        {
          id: 'log1',
          fileId: 'file1',
          accessedAt: mockDate,
          file: { id: 'file1', fileName: 'test.pdf' },
          accessType: 'READ',
        },
      ]);
    });

    it('should aggregate all analytics data successfully', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      const result = await storageAnalyticsService.getComprehensiveAnalytics(
        startDate,
        endDate
      );

      expect(result).toEqual({
        storage: expect.objectContaining({
          totalFiles: 1000,
          totalSize: 5368709120,
        }),
        deduplication: expect.objectContaining({
          totalDuplicates: 150,
          deduplicationRatio: 15.5,
        }),
        versioning: expect.objectContaining({
          totalVersions: 2500,
          versionedFiles: 500,
        }),
        access: expect.objectContaining({
          totalAccesses: 1,
          uniqueFiles: 1,
        }),
        performance: expect.objectContaining({
          successRate: 98.5,
          errorRate: 1.5,
        }),
        cdn: expect.objectContaining({
          hitRate: 85.5,
        }),
        recommendations: expect.arrayContaining([
          expect.any(String),
        ]),
      });
    });

    it('should handle CDN analytics unavailability gracefully', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      const mockCdnService = storageAnalyticsService['cdnService'];
      mockCdnService.getCDNAnalytics = vi.fn().mockRejectedValue(
        new Error('CDN service unavailable')
      );

      const result = await storageAnalyticsService.getComprehensiveAnalytics(
        startDate,
        endDate
      );

      expect(result.cdn).toBeUndefined();
      expect(result.storage).toBeDefined();
      expect(result.deduplication).toBeDefined();
      expect(result.versioning).toBeDefined();
      expect(result.access).toBeDefined();
      expect(result.performance).toBeDefined();
    });

    it('should handle comprehensive analytics errors', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      const mockCloudService = storageAnalyticsService['cloudStorageService'];
      mockCloudService.getStorageStatistics = vi.fn().mockRejectedValue(
        new Error('Cloud service failure')
      );

      await expect(
        storageAnalyticsService.getComprehensiveAnalytics(startDate, endDate)
      ).rejects.toThrow('Cloud service failure');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get comprehensive analytics:',
        expect.objectContaining({
          error: 'Cloud service failure',
          startDate,
          endDate,
        })
      );
    });
  });

  describe('checkAlerts', () => {
    const mockAlertConfig: AlertConfiguration = {
      storageUsageThreshold: 75, // 75%
      errorRateThreshold: 2, // 2%
      unusedFilesThreshold: 30, // 30 days
      costThreshold: 100, // $100
      enableEmailAlerts: true,
      emailRecipients: ['admin@example.com'],
    };

    beforeEach(() => {
      // Mock comprehensive analytics for alert checking
      vi.spyOn(storageAnalyticsService, 'getComprehensiveAnalytics').mockResolvedValue({
        storage: {
          timestamp: mockDate,
          totalFiles: 1000,
          totalSize: 85899345920, // ~80GB (assuming 100GB limit)
          totalSizeFormatted: '80.00 GB',
          storageClassDistribution: {},
          growthRate: { files: 150, size: 2684354560 },
          costAnalysis: {
            estimatedMonthlyCost: 120, // $120
            costPerGB: 0.023,
            costByStorageClass: {},
          },
        },
        deduplication: {
          totalDuplicates: 150,
          spaceSaved: 1073741824,
          spaceSavedFormatted: '1.00 GB',
          deduplicationRatio: 15.5,
          duplicateGroups: 25,
          averageDuplicatesPerGroup: 6,
          potentialSavings: 805306368,
          potentialSavingsFormatted: '768.00 MB',
        },
        versioning: {
          totalVersions: 2500,
          versionedFiles: 500,
          averageVersionsPerFile: 5,
          versioningOverhead: 2147483648,
          versioningOverheadFormatted: '2.00 GB',
          oldestVersion: new Date('2023-01-01T00:00:00Z'),
          newestVersion: new Date('2024-01-15T09:00:00Z'),
          retentionSavings: 536870912,
        },
        access: {
          totalAccesses: 1000,
          uniqueFiles: 500,
          averageAccessesPerFile: 2,
          accessesByTimeOfDay: {},
          accessesByDay: {},
          hotFiles: [],
          coldFiles: [],
        },
        performance: {
          averageUploadTime: 2500,
          averageDownloadTime: 800,
          averageUploadSpeed: 5242880,
          averageDownloadSpeed: 26214400,
          successRate: 97, // Below threshold
          errorRate: 3, // Above threshold
          mostCommonErrors: [],
        },
        recommendations: [],
      } as ComprehensiveAnalytics);
    });

    it('should generate storage usage alert when threshold exceeded', async () => {
      const alerts = await storageAnalyticsService.checkAlerts(mockAlertConfig);

      const storageAlert = alerts.find(alert => alert.type === 'storage');
      expect(storageAlert).toBeDefined();
      expect(storageAlert?.severity).toBe('high');
      expect(storageAlert?.message).toContain('Storage usage at');
      expect(storageAlert?.value).toBeGreaterThan(mockAlertConfig.storageUsageThreshold);
      expect(storageAlert?.recommendations).toContain('Consider implementing lifecycle policies');
    });

    it('should generate error rate alert when threshold exceeded', async () => {
      const alerts = await storageAnalyticsService.checkAlerts(mockAlertConfig);

      const errorAlert = alerts.find(alert => alert.type === 'error');
      expect(errorAlert).toBeDefined();
      expect(errorAlert?.severity).toBe('medium');
      expect(errorAlert?.message).toContain('Error rate at 3%');
      expect(errorAlert?.value).toBe(3);
      expect(errorAlert?.threshold).toBe(2);
      expect(errorAlert?.recommendations).toContain('Investigate most common error causes');
    });

    it('should generate cost alert when threshold exceeded', async () => {
      const alerts = await storageAnalyticsService.checkAlerts(mockAlertConfig);

      const costAlert = alerts.find(alert => alert.type === 'cost');
      expect(costAlert).toBeDefined();
      expect(costAlert?.severity).toBe('medium');
      expect(costAlert?.message).toContain('Estimated monthly cost: $120.00');
      expect(costAlert?.value).toBe(120);
      expect(costAlert?.threshold).toBe(100);
      expect(costAlert?.recommendations).toContain('Review storage class distribution');
    });

    it('should return empty alerts when all thresholds are met', async () => {
      // Mock analytics with values below thresholds
      vi.spyOn(storageAnalyticsService, 'getComprehensiveAnalytics').mockResolvedValue({
        storage: {
          timestamp: mockDate,
          totalFiles: 500,
          totalSize: 53687091200, // ~50GB (below 75% of 100GB)
          totalSizeFormatted: '50.00 GB',
          storageClassDistribution: {},
          growthRate: { files: 150, size: 2684354560 },
          costAnalysis: {
            estimatedMonthlyCost: 80, // Below $100 threshold
            costPerGB: 0.023,
            costByStorageClass: {},
          },
        },
        performance: {
          averageUploadTime: 2500,
          averageDownloadTime: 800,
          averageUploadSpeed: 5242880,
          averageDownloadSpeed: 26214400,
          successRate: 99, // Above threshold
          errorRate: 1, // Below threshold
          mostCommonErrors: [],
        },
      } as any);

      const alerts = await storageAnalyticsService.checkAlerts(mockAlertConfig);

      expect(alerts).toHaveLength(0);
    });

    it('should handle alert checking errors gracefully', async () => {
      vi.spyOn(storageAnalyticsService, 'getComprehensiveAnalytics').mockRejectedValue(
        new Error('Analytics service error')
      );

      const alerts = await storageAnalyticsService.checkAlerts(mockAlertConfig);

      expect(alerts).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to check alerts:',
        expect.any(Error)
      );
    });

    it('should set critical severity for very high storage usage', async () => {
      // Mock analytics with 95% storage usage
      vi.spyOn(storageAnalyticsService, 'getComprehensiveAnalytics').mockResolvedValue({
        storage: {
          timestamp: mockDate,
          totalFiles: 1000,
          totalSize: 101449891840, // ~95GB (95% of 100GB limit)
          totalSizeFormatted: '95.00 GB',
          storageClassDistribution: {},
          growthRate: { files: 150, size: 2684354560 },
          costAnalysis: {
            estimatedMonthlyCost: 50,
            costPerGB: 0.023,
            costByStorageClass: {},
          },
        },
        performance: {
          averageUploadTime: 2500,
          averageDownloadTime: 800,
          averageUploadSpeed: 5242880,
          averageDownloadSpeed: 26214400,
          successRate: 99,
          errorRate: 1,
          mostCommonErrors: [],
        },
      } as any);

      const alerts = await storageAnalyticsService.checkAlerts(mockAlertConfig);

      const storageAlert = alerts.find(alert => alert.type === 'storage');
      expect(storageAlert?.severity).toBe('critical');
    });
  });

  describe('Recommendations Generation', () => {
    it('should generate deduplication recommendations for high duplication ratio', async () => {
      const mockAnalytics = {
        storage: {
          storageClassDistribution: {
            [StorageClass.HOT]: { percentage: 60 },
          },
        },
        deduplication: {
          deduplicationRatio: 25, // High duplication
        },
        access: {
          coldFiles: [],
        },
        performance: {
          errorRate: 1,
        },
        versioning: {
          averageVersionsPerFile: 3,
        },
      };

      const recommendations = storageAnalyticsService['generateRecommendations'](mockAnalytics);

      expect(recommendations).toContain(
        'High duplication detected. Consider running bulk deduplication to save storage costs.'
      );
    });

    it('should generate storage class recommendations for high standard usage', async () => {
      const mockAnalytics = {
        storage: {
          storageClassDistribution: {
            [StorageClass.HOT]: { percentage: 85 }, // High standard usage
          },
        },
        deduplication: {
          deduplicationRatio: 5,
        },
        access: {
          coldFiles: [],
        },
        performance: {
          errorRate: 1,
        },
        versioning: {
          averageVersionsPerFile: 3,
        },
      };

      const recommendations = storageAnalyticsService['generateRecommendations'](mockAnalytics);

      expect(recommendations).toContain(
        'Most files are in Standard storage. Consider implementing lifecycle policies to move older files to cheaper storage classes.'
      );
    });

    it('should generate access pattern recommendations for cold files', async () => {
      const mockAnalytics = {
        storage: {
          storageClassDistribution: {
            [StorageClass.HOT]: { percentage: 60 },
          },
        },
        deduplication: {
          deduplicationRatio: 5,
        },
        access: {
          coldFiles: [
            { fileId: 'file1', fileName: 'old-file.pdf' },
            { fileId: 'file2', fileName: 'archive.zip' },
          ],
        },
        performance: {
          errorRate: 1,
        },
        versioning: {
          averageVersionsPerFile: 3,
        },
      };

      const recommendations = storageAnalyticsService['generateRecommendations'](mockAnalytics);

      expect(recommendations).toContain(
        'Several files have low access patterns. Consider moving them to Cold or Archive storage.'
      );
    });

    it('should generate performance recommendations for high error rate', async () => {
      const mockAnalytics = {
        storage: {
          storageClassDistribution: {
            [StorageClass.HOT]: { percentage: 60 },
          },
        },
        deduplication: {
          deduplicationRatio: 5,
        },
        access: {
          coldFiles: [],
        },
        performance: {
          errorRate: 3, // High error rate
        },
        versioning: {
          averageVersionsPerFile: 3,
        },
      };

      const recommendations = storageAnalyticsService['generateRecommendations'](mockAnalytics);

      expect(recommendations).toContain(
        'Error rate is elevated. Review error logs and consider investigating network or service issues.'
      );
    });

    it('should generate versioning recommendations for high version count', async () => {
      const mockAnalytics = {
        storage: {
          storageClassDistribution: {
            [StorageClass.HOT]: { percentage: 60 },
          },
        },
        deduplication: {
          deduplicationRatio: 5,
        },
        access: {
          coldFiles: [],
        },
        performance: {
          errorRate: 1,
        },
        versioning: {
          averageVersionsPerFile: 12, // High version count
        },
      };

      const recommendations = storageAnalyticsService['generateRecommendations'](mockAnalytics);

      expect(recommendations).toContain(
        'High number of versions per file. Consider implementing version retention policies.'
      );
    });
  });

  describe('Cost Analysis', () => {
    it('should calculate accurate cost analysis for different storage classes', () => {
      const storageClassDistribution = {
        [StorageClass.HOT]: { count: 100, size: 1073741824 }, // 1GB
        [StorageClass.WARM]: { count: 50, size: 536870912 }, // 0.5GB
        [StorageClass.COLD]: { count: 25, size: 268435456 }, // 0.25GB
        [StorageClass.ARCHIVE]: { count: 10, size: 107374182 }, // 0.1GB
      };
      const totalSize = 1985646654; // ~1.85GB

      const result = storageAnalyticsService['calculateCostAnalysis'](
        storageClassDistribution,
        totalSize
      );

      expect(result.estimatedMonthlyCost).toBeCloseTo(0.023 + 0.00625 + 0.001 + 0.000099, 4);
      expect(result.costPerGB).toBeCloseTo(
        result.estimatedMonthlyCost / (totalSize / (1024 * 1024 * 1024)),
        4
      );
      expect(result.costByStorageClass[StorageClass.HOT]).toBeCloseTo(0.023, 4);
      expect(result.costByStorageClass[StorageClass.WARM]).toBeCloseTo(0.00625, 4);
      expect(result.costByStorageClass[StorageClass.COLD]).toBeCloseTo(0.001, 4);
      expect(result.costByStorageClass[StorageClass.ARCHIVE]).toBeCloseTo(0.000099, 6);
    });

    it('should handle empty storage class distribution', () => {
      const result = storageAnalyticsService['calculateCostAnalysis']({}, 0);

      expect(result.estimatedMonthlyCost).toBe(0);
      expect(result.costPerGB).toBe(0);
      expect(result.costByStorageClass).toEqual({});
    });
  });

  describe('Background Metrics Collection', () => {
    it('should collect and store metrics in database', async () => {
      const mockCloudService = storageAnalyticsService['cloudStorageService'];
      mockCloudService.getStorageStatistics = vi.fn().mockResolvedValue({
        totalFiles: 1000,
        totalSize: 5368709120,
        totalSizeFormatted: '5.00 GB',
      });

      mockPrisma.storedFile.groupBy.mockResolvedValue([
        {
          storageClass: StorageClass.HOT,
          _count: { id: 500 },
          _sum: { fileSize: 2684354560 },
        },
      ]);

      mockPrisma.storageMetrics.create.mockResolvedValue({
        id: 'metrics-1',
        timestamp: mockDate,
      });

      await storageAnalyticsService['collectMetrics']();

      expect(mockPrisma.storageMetrics.create).toHaveBeenCalledWith({
        data: {
          timestamp: mockDate,
          totalFiles: 1000,
          totalSize: 5368709120,
          metadata: expect.objectContaining({
            storageClassDistribution: expect.any(Object),
            growthRate: expect.any(Object),
            costAnalysis: expect.any(Object),
          }),
        },
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Storage metrics collected and stored');
    });

    it('should handle metrics collection errors gracefully', async () => {
      const mockCloudService = storageAnalyticsService['cloudStorageService'];
      mockCloudService.getStorageStatistics = vi.fn().mockRejectedValue(
        new Error('Metrics collection failed')
      );

      await storageAnalyticsService['collectMetrics']();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to collect metrics:',
        expect.any(Error)
      );
    });
  });

  describe('Utility Methods', () => {
    it('should format bytes to human readable string', () => {
      const formatBytes = storageAnalyticsService['formatBytes'];

      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1048576)).toBe('1.00 MB');
      expect(formatBytes(1073741824)).toBe('1.00 GB');
      expect(formatBytes(1099511627776)).toBe('1.00 TB');
      expect(formatBytes(1536)).toBe('1.50 KB'); // 1.5KB
    });

    it('should handle negative bytes gracefully', () => {
      const formatBytes = storageAnalyticsService['formatBytes'];

      expect(formatBytes(-1024)).toBe('0 B'); // Should handle negative gracefully
    });
  });

  describe('Growth Rate Calculation', () => {
    it('should return simplified growth rate values', async () => {
      const result = await storageAnalyticsService['calculateGrowthRate']();

      expect(result).toEqual({
        files: 150, // files per day
        size: 2.5 * 1024 * 1024 * 1024, // 2.5 GB per day
      });
    });
  });
});