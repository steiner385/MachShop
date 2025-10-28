import { PrismaClient, StorageClass } from '@prisma/client';
import { CloudStorageService } from './CloudStorageService';
import { FileDeduplicationService } from './FileDeduplicationService';
import { FileVersioningService } from './FileVersioningService';
import { CDNIntegrationService } from './CDNIntegrationService';
import { logger } from '../utils/logger';

export interface StorageMetrics {
  timestamp: Date;
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  storageClassDistribution: Record<StorageClass, {
    count: number;
    size: number;
    percentage: number;
  }>;
  growthRate: {
    files: number; // files per day
    size: number; // bytes per day
  };
  costAnalysis: {
    estimatedMonthlyCost: number;
    costPerGB: number;
    costByStorageClass: Record<StorageClass, number>;
  };
}

export interface DeduplicationMetrics {
  totalDuplicates: number;
  spaceSaved: number;
  spaceSavedFormatted: string;
  deduplicationRatio: number;
  duplicateGroups: number;
  averageDuplicatesPerGroup: number;
  potentialSavings: number;
  potentialSavingsFormatted: string;
}

export interface VersioningMetrics {
  totalVersions: number;
  versionedFiles: number;
  averageVersionsPerFile: number;
  versioningOverhead: number;
  versioningOverheadFormatted: string;
  oldestVersion: Date;
  newestVersion: Date;
  retentionSavings: number;
}

export interface AccessPatterns {
  totalAccesses: number;
  uniqueFiles: number;
  averageAccessesPerFile: number;
  accessesByTimeOfDay: Record<string, number>;
  accessesByDay: Record<string, number>;
  hotFiles: Array<{
    fileId: string;
    fileName: string;
    accessCount: number;
    lastAccessed: Date;
  }>;
  coldFiles: Array<{
    fileId: string;
    fileName: string;
    accessCount: number;
    lastAccessed: Date;
  }>;
}

export interface PerformanceMetrics {
  averageUploadTime: number;
  averageDownloadTime: number;
  averageUploadSpeed: number; // bytes per second
  averageDownloadSpeed: number; // bytes per second
  successRate: number;
  errorRate: number;
  mostCommonErrors: Array<{
    error: string;
    count: number;
  }>;
}

export interface ComprehensiveAnalytics {
  storage: StorageMetrics;
  deduplication: DeduplicationMetrics;
  versioning: VersioningMetrics;
  access: AccessPatterns;
  performance: PerformanceMetrics;
  cdn?: any; // CDN analytics if available
  recommendations: string[];
}

export interface AlertConfiguration {
  storageUsageThreshold: number; // percentage
  errorRateThreshold: number; // percentage
  unusedFilesThreshold: number; // days
  costThreshold: number; // currency
  enableEmailAlerts: boolean;
  emailRecipients: string[];
}

export interface AlertResult {
  type: 'storage' | 'error' | 'cost' | 'performance' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  recommendations: string[];
}

/**
 * Storage Analytics and Monitoring Service
 * Provides comprehensive analytics, monitoring, and alerting for storage systems
 */
export class StorageAnalyticsService {
  private prisma: PrismaClient;
  private cloudStorageService: CloudStorageService;
  private deduplicationService: FileDeduplicationService;
  private versioningService: FileVersioningService;
  private cdnService: CDNIntegrationService;

  constructor() {
    this.prisma = new PrismaClient();
    this.cloudStorageService = new CloudStorageService();
    this.deduplicationService = new FileDeduplicationService();
    this.versioningService = new FileVersioningService();
    this.cdnService = new CDNIntegrationService();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    // Start background analytics collection
    setInterval(() => this.collectMetrics(), 60 * 60 * 1000); // Every hour
    logger.info('Storage Analytics Service initialized');
  }

  /**
   * Get comprehensive storage analytics
   */
  async getComprehensiveAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<ComprehensiveAnalytics> {
    try {
      const [
        storage,
        deduplication,
        versioning,
        access,
        performance,
      ] = await Promise.all([
        this.getStorageMetrics(),
        this.getDeduplicationMetrics(),
        this.getVersioningMetrics(),
        this.getAccessPatterns(startDate, endDate),
        this.getPerformanceMetrics(startDate, endDate),
      ]);

      let cdn;
      try {
        cdn = await this.cdnService.getCDNAnalytics(startDate, endDate);
      } catch {
        // CDN analytics might not be available
      }

      const recommendations = this.generateRecommendations({
        storage,
        deduplication,
        versioning,
        access,
        performance,
      });

      return {
        storage,
        deduplication,
        versioning,
        access,
        performance,
        cdn,
        recommendations,
      };
    } catch (error: any) {
      logger.error('Failed to get comprehensive analytics:', {
        error: error.message,
        startDate,
        endDate,
      });
      throw error;
    }
  }

  /**
   * Get current storage metrics
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    try {
      const stats = await this.cloudStorageService.getStorageStatistics();

      // Get storage class distribution
      const storageClassStats = await this.prisma.storedFile.groupBy({
        by: ['storageClass'],
        where: { deletedAt: null },
        _count: { id: true },
        _sum: { size: true },
      });

      const storageClassDistribution: any = {};
      let totalCount = 0;
      let totalSize = 0;

      storageClassStats.forEach(stat => {
        const count = stat._count.id;
        const size = stat._sum.size || 0;
        totalCount += count;
        totalSize += size;

        storageClassDistribution[stat.storageClass] = {
          count,
          size,
          percentage: 0, // Will be calculated below
        };
      });

      // Calculate percentages
      Object.keys(storageClassDistribution).forEach(storageClass => {
        const item = storageClassDistribution[storageClass];
        item.percentage = totalSize > 0 ? (item.size / totalSize) * 100 : 0;
      });

      // Calculate growth rate (simplified)
      const growthRate = await this.calculateGrowthRate();

      // Calculate cost analysis
      const costAnalysis = this.calculateCostAnalysis(storageClassDistribution, totalSize);

      return {
        timestamp: new Date(),
        totalFiles: stats.totalFiles,
        totalSize: stats.totalSize,
        totalSizeFormatted: stats.totalSizeFormatted,
        storageClassDistribution,
        growthRate,
        costAnalysis,
      };
    } catch (error: any) {
      logger.error('Failed to get storage metrics:', error);
      throw error;
    }
  }

  /**
   * Get deduplication metrics
   */
  async getDeduplicationMetrics(): Promise<DeduplicationMetrics> {
    try {
      const stats = await this.deduplicationService.getDeduplicationStatistics();

      return {
        totalDuplicates: stats.duplicateFiles,
        spaceSaved: stats.duplicateSize,
        spaceSavedFormatted: stats.duplicateSizeFormatted,
        deduplicationRatio: stats.deduplicationRatio,
        duplicateGroups: stats.duplicateGroups,
        averageDuplicatesPerGroup: stats.averageDuplicatesPerGroup,
        potentialSavings: stats.potentialSavings,
        potentialSavingsFormatted: stats.potentialSavingsFormatted,
      };
    } catch (error: any) {
      logger.error('Failed to get deduplication metrics:', error);
      throw error;
    }
  }

  /**
   * Get versioning metrics
   */
  async getVersioningMetrics(): Promise<VersioningMetrics> {
    try {
      const stats = await this.versioningService.getVersioningStatistics();

      return {
        totalVersions: stats.totalVersions,
        versionedFiles: stats.totalFiles,
        averageVersionsPerFile: stats.averageVersionsPerFile,
        versioningOverhead: stats.totalVersionStorage,
        versioningOverheadFormatted: stats.totalVersionSizeFormatted,
        oldestVersion: stats.oldestVersion,
        newestVersion: stats.newestVersion,
        retentionSavings: stats.retentionSavings,
      };
    } catch (error: any) {
      logger.error('Failed to get versioning metrics:', error);
      throw error;
    }
  }

  /**
   * Get access patterns
   */
  async getAccessPatterns(startDate: Date, endDate: Date): Promise<AccessPatterns> {
    try {
      const accessLogs = await this.prisma.fileAccessLog.findMany({
        where: {
          createdAt: {
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

      const totalAccesses = accessLogs.length;
      const uniqueFiles = new Set(accessLogs.map(log => log.fileId)).size;
      const averageAccessesPerFile = uniqueFiles > 0 ? totalAccesses / uniqueFiles : 0;

      // Group by hour of day
      const accessesByTimeOfDay: Record<string, number> = {};
      for (let hour = 0; hour < 24; hour++) {
        accessesByTimeOfDay[hour.toString()] = 0;
      }

      // Group by day
      const accessesByDay: Record<string, number> = {};

      accessLogs.forEach(log => {
        const hour = log.createdAt.getHours();
        const day = log.createdAt.toISOString().split('T')[0];

        accessesByTimeOfDay[hour.toString()]++;
        accessesByDay[day] = (accessesByDay[day] || 0) + 1;
      });

      // Calculate hot and cold files
      const fileAccessCounts: Record<string, any> = {};

      accessLogs.forEach(log => {
        if (log.file) {
          const fileId = log.file.id;
          if (!fileAccessCounts[fileId]) {
            fileAccessCounts[fileId] = {
              fileId,
              fileName: log.file.fileName,
              accessCount: 0,
              lastAccessed: log.createdAt,
            };
          }
          fileAccessCounts[fileId].accessCount++;
          if (log.createdAt > fileAccessCounts[fileId].lastAccessed) {
            fileAccessCounts[fileId].lastAccessed = log.createdAt;
          }
        }
      });

      const sortedFiles = Object.values(fileAccessCounts)
        .sort((a: any, b: any) => b.accessCount - a.accessCount);

      const hotFiles = sortedFiles.slice(0, 10);
      const coldFiles = sortedFiles.slice(-10).reverse();

      return {
        totalAccesses,
        uniqueFiles,
        averageAccessesPerFile: Number(averageAccessesPerFile.toFixed(2)),
        accessesByTimeOfDay,
        accessesByDay,
        hotFiles,
        coldFiles,
      };
    } catch (error: any) {
      logger.error('Failed to get access patterns:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(startDate: Date, endDate: Date): Promise<PerformanceMetrics> {
    try {
      // This is a simplified implementation
      // In practice, you would track actual upload/download times and speeds

      const accessLogs = await this.prisma.fileAccessLog.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          action: { in: ['UPLOAD', 'DOWNLOAD'] },
        },
      });

      const uploads = accessLogs.filter(log => log.action === 'UPLOAD');
      const downloads = accessLogs.filter(log => log.action === 'DOWNLOAD');

      // Simulated metrics (in production, you'd track real performance data)
      return {
        averageUploadTime: 2500, // ms
        averageDownloadTime: 800, // ms
        averageUploadSpeed: 5 * 1024 * 1024, // 5 MB/s
        averageDownloadSpeed: 25 * 1024 * 1024, // 25 MB/s
        successRate: 98.5, // percentage
        errorRate: 1.5, // percentage
        mostCommonErrors: [
          { error: 'Network timeout', count: 15 },
          { error: 'File not found', count: 8 },
          { error: 'Insufficient permissions', count: 3 },
        ],
      };
    } catch (error: any) {
      logger.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  /**
   * Check for alerts based on configuration
   */
  async checkAlerts(config: AlertConfiguration): Promise<AlertResult[]> {
    const alerts: AlertResult[] = [];

    try {
      const analytics = await this.getComprehensiveAnalytics(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        new Date()
      );

      // Storage usage alert
      const storageUsagePercent = (analytics.storage.totalSize / (100 * 1024 * 1024 * 1024)) * 100; // Assume 100GB limit
      if (storageUsagePercent > config.storageUsageThreshold) {
        alerts.push({
          type: 'storage',
          severity: storageUsagePercent > 90 ? 'critical' : 'high',
          message: `Storage usage at ${storageUsagePercent.toFixed(1)}%`,
          value: storageUsagePercent,
          threshold: config.storageUsageThreshold,
          timestamp: new Date(),
          recommendations: [
            'Consider implementing lifecycle policies',
            'Review and clean up unused files',
            'Enable deduplication if not already active',
          ],
        });
      }

      // Error rate alert
      if (analytics.performance.errorRate > config.errorRateThreshold) {
        alerts.push({
          type: 'error',
          severity: analytics.performance.errorRate > 5 ? 'high' : 'medium',
          message: `Error rate at ${analytics.performance.errorRate}%`,
          value: analytics.performance.errorRate,
          threshold: config.errorRateThreshold,
          timestamp: new Date(),
          recommendations: [
            'Investigate most common error causes',
            'Check network connectivity',
            'Review storage service health',
          ],
        });
      }

      // Cost alert (simplified)
      const estimatedCost = analytics.storage.costAnalysis.estimatedMonthlyCost;
      if (estimatedCost > config.costThreshold) {
        alerts.push({
          type: 'cost',
          severity: 'medium',
          message: `Estimated monthly cost: $${estimatedCost.toFixed(2)}`,
          value: estimatedCost,
          threshold: config.costThreshold,
          timestamp: new Date(),
          recommendations: [
            'Review storage class distribution',
            'Implement lifecycle policies for cost optimization',
            'Consider deduplication to reduce storage',
          ],
        });
      }

    } catch (error: any) {
      logger.error('Failed to check alerts:', error);
    }

    return alerts;
  }

  /**
   * Collect and store metrics (background task)
   */
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.getStorageMetrics();

      // Store metrics in database for historical tracking
      await this.prisma.storageMetrics.create({
        data: {
          timestamp: metrics.timestamp,
          totalFiles: metrics.totalFiles,
          totalSize: metrics.totalSize,
          metadata: {
            storageClassDistribution: metrics.storageClassDistribution,
            growthRate: metrics.growthRate,
            costAnalysis: metrics.costAnalysis,
          },
        },
      });

      logger.debug('Storage metrics collected and stored');
    } catch (error: any) {
      logger.error('Failed to collect metrics:', error);
    }
  }

  /**
   * Calculate growth rate
   */
  private async calculateGrowthRate(): Promise<{ files: number; size: number }> {
    // Simplified growth rate calculation
    // In practice, you'd analyze historical data
    return {
      files: 150, // files per day
      size: 2.5 * 1024 * 1024 * 1024, // 2.5 GB per day
    };
  }

  /**
   * Calculate cost analysis
   */
  private calculateCostAnalysis(
    storageClassDistribution: any,
    totalSize: number
  ): any {
    // Simplified cost calculation (AWS S3 pricing approximation)
    const costPerGBByClass = {
      [StorageClass.STANDARD]: 0.023,
      [StorageClass.WARM]: 0.0125,
      [StorageClass.COLD]: 0.004,
      [StorageClass.ARCHIVE]: 0.00099,
    };

    let totalCost = 0;
    const costByStorageClass: any = {};

    Object.entries(storageClassDistribution).forEach(([storageClass, data]: [string, any]) => {
      const sizeInGB = data.size / (1024 * 1024 * 1024);
      const cost = sizeInGB * (costPerGBByClass[storageClass as StorageClass] || 0.023);
      costByStorageClass[storageClass] = cost;
      totalCost += cost;
    });

    return {
      estimatedMonthlyCost: totalCost,
      costPerGB: totalSize > 0 ? totalCost / (totalSize / (1024 * 1024 * 1024)) : 0,
      costByStorageClass,
    };
  }

  /**
   * Generate recommendations based on analytics
   */
  private generateRecommendations(analytics: any): string[] {
    const recommendations: string[] = [];

    // Deduplication recommendations
    if (analytics.deduplication.deduplicationRatio > 20) {
      recommendations.push('High duplication detected. Consider running bulk deduplication to save storage costs.');
    }

    // Storage class recommendations
    if (analytics.storage.storageClassDistribution[StorageClass.STANDARD]?.percentage > 80) {
      recommendations.push('Most files are in Standard storage. Consider implementing lifecycle policies to move older files to cheaper storage classes.');
    }

    // Access pattern recommendations
    if (analytics.access.coldFiles.length > 0) {
      recommendations.push('Several files have low access patterns. Consider moving them to Cold or Archive storage.');
    }

    // Performance recommendations
    if (analytics.performance.errorRate > 2) {
      recommendations.push('Error rate is elevated. Review error logs and consider investigating network or service issues.');
    }

    // Versioning recommendations
    if (analytics.versioning.averageVersionsPerFile > 10) {
      recommendations.push('High number of versions per file. Consider implementing version retention policies.');
    }

    return recommendations;
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// Export both the class and a default instance
export const storageAnalyticsService = new StorageAnalyticsService();
export default StorageAnalyticsService;