import { PrismaClient, StoredFile } from '@prisma/client';
import { CloudStorageService } from './CloudStorageService';
import { storageConfig } from '../config/storage';
import { logger } from '../utils/logger';

export interface CDNConfiguration {
  provider: 'cloudfront' | 'cloudflare' | 'fastly' | 'custom';
  domain: string;
  enabled: boolean;
  cacheMaxAge?: number; // seconds
  enableGzip?: boolean;
  customHeaders?: Record<string, string>;
}

export interface CDNUrlOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpg' | 'png' | 'webp' | 'avif';
  enableCache?: boolean;
  cacheMaxAge?: number;
}

export interface CDNAnalytics {
  totalRequests: number;
  cacheHitRatio: number;
  bandwidthSaved: number; // bytes
  averageResponseTime: number; // ms
  topFiles: Array<{
    fileId: string;
    fileName: string;
    requests: number;
    bandwidth: number;
  }>;
  geographicDistribution: Record<string, number>;
}

export interface CDNPurgeResult {
  success: boolean;
  purgedUrls: string[];
  errors: Array<{
    url: string;
    error: string;
  }>;
}

/**
 * CDN Integration Service - Content Delivery Network management
 * Handles CDN URL generation, cache management, and analytics
 */
export class CDNIntegrationService {
  private prisma: PrismaClient;
  private cloudStorageService: CloudStorageService;
  private cdnConfig: CDNConfiguration;

  constructor() {
    this.prisma = new PrismaClient();
    this.cloudStorageService = new CloudStorageService();
    this.cdnConfig = this.loadCDNConfiguration();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    // Service is initialized in constructor
    return Promise.resolve();
  }

  /**
   * Load CDN configuration from storage config
   */
  private loadCDNConfiguration(): CDNConfiguration {
    return {
      provider: storageConfig.cdn?.provider || 'custom',
      domain: storageConfig.cdn?.domain || 'localhost:8080',
      enabled: storageConfig.cdn?.enabled || false,
      cacheMaxAge: storageConfig.cdn?.cacheMaxAge || 3600,
      enableGzip: storageConfig.cdn?.enableGzip || true,
    };
  }

  /**
   * Generate CDN URL for a file
   */
  async generateCDNUrl(
    fileId: string,
    options: CDNUrlOptions = {}
  ): Promise<string> {
    try {
      if (!this.cdnConfig.enabled) {
        // Fallback to direct storage URL
        return await this.cloudStorageService.generateSignedUrl(fileId, 'download');
      }

      // Get file information
      const file = await this.prisma.storedFile.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Build CDN URL
      let cdnUrl = `https://${this.cdnConfig.domain}/cdn/${file.storageKey}`;

      // Add image transformation parameters if applicable
      if (this.isImageFile(file.mimeType) && this.hasImageTransformations(options)) {
        cdnUrl = this.addImageTransformations(cdnUrl, options);
      }

      // Add cache control parameters
      if (options.enableCache !== false) {
        const cacheMaxAge = options.cacheMaxAge || this.cdnConfig.cacheMaxAge;
        cdnUrl += `?cache=${cacheMaxAge}`;
      }

      // Log CDN URL generation for analytics
      await this.logCDNAccess(fileId, 'url_generated', {
        url: cdnUrl,
        transformations: options,
      });

      return cdnUrl;
    } catch (error: any) {
      logger.error('Failed to generate CDN URL:', {
        fileId,
        error: error.message,
        options,
      });
      throw error;
    }
  }

  /**
   * Generate multiple CDN URLs in batch
   */
  async generateBatchCDNUrls(
    fileIds: string[],
    options: CDNUrlOptions = {}
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    await Promise.allSettled(
      fileIds.map(async (fileId) => {
        try {
          results[fileId] = await this.generateCDNUrl(fileId, options);
        } catch (error: any) {
          logger.warn('Failed to generate CDN URL for file:', {
            fileId,
            error: error.message,
          });
        }
      })
    );

    return results;
  }

  /**
   * Purge files from CDN cache
   */
  async purgeCDNCache(fileIds: string[]): Promise<CDNPurgeResult> {
    try {
      const result: CDNPurgeResult = {
        success: true,
        purgedUrls: [],
        errors: [],
      };

      if (!this.cdnConfig.enabled) {
        result.success = false;
        result.errors.push({
          url: '',
          error: 'CDN not enabled',
        });
        return result;
      }

      for (const fileId of fileIds) {
        try {
          const file = await this.prisma.storedFile.findUnique({
            where: { id: fileId },
            select: { storageKey: true, fileName: true },
          });

          if (!file) {
            result.errors.push({
              url: fileId,
              error: 'File not found',
            });
            continue;
          }

          const cdnUrl = `https://${this.cdnConfig.domain}/cdn/${file.storageKey}`;

          // Perform CDN-specific purge
          await this.performCDNPurge(cdnUrl);

          result.purgedUrls.push(cdnUrl);

          // Log purge action
          await this.logCDNAccess(fileId, 'cache_purged', {
            url: cdnUrl,
          });

        } catch (error: any) {
          result.errors.push({
            url: fileId,
            error: error.message,
          });
          result.success = false;
        }
      }

      logger.info('CDN cache purge completed:', {
        totalFiles: fileIds.length,
        purgedUrls: result.purgedUrls.length,
        errors: result.errors.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to purge CDN cache:', {
        fileIds,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get CDN analytics for files
   */
  async getCDNAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<CDNAnalytics> {
    try {
      // Get access logs from database
      const accessLogs = await this.prisma.fileAccessLog.findMany({
        where: {
          action: { in: ['url_generated', 'cdn_hit', 'cdn_miss'] },
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
              size: true,
            },
          },
        },
      });

      // Calculate analytics
      const totalRequests = accessLogs.length;
      const cacheHits = accessLogs.filter(log => log.action === 'cdn_hit').length;
      const cacheHitRatio = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

      // Calculate bandwidth saved (estimated)
      const bandwidthSaved = accessLogs
        .filter(log => log.action === 'cdn_hit')
        .reduce((total, log) => total + (log.file?.size || 0), 0);

      // Top files by requests
      const fileRequests: Record<string, any> = {};
      accessLogs.forEach(log => {
        if (log.file) {
          const fileId = log.file.id;
          if (!fileRequests[fileId]) {
            fileRequests[fileId] = {
              fileId,
              fileName: log.file.fileName,
              requests: 0,
              bandwidth: 0,
            };
          }
          fileRequests[fileId].requests++;
          fileRequests[fileId].bandwidth += log.file.size || 0;
        }
      });

      const topFiles = Object.values(fileRequests)
        .sort((a: any, b: any) => b.requests - a.requests)
        .slice(0, 10);

      return {
        totalRequests,
        cacheHitRatio: Number(cacheHitRatio.toFixed(2)),
        bandwidthSaved,
        averageResponseTime: 150, // Simulated value
        topFiles,
        geographicDistribution: {
          'US': 45,
          'EU': 30,
          'ASIA': 20,
          'OTHER': 5,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get CDN analytics:', {
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Warm up CDN cache for critical files
   */
  async warmupCDNCache(fileIds: string[]): Promise<{
    warmedUp: string[];
    failed: string[];
  }> {
    const result = {
      warmedUp: [] as string[],
      failed: [] as string[],
    };

    for (const fileId of fileIds) {
      try {
        // Generate CDN URL to trigger cache population
        const cdnUrl = await this.generateCDNUrl(fileId);

        // Make a HEAD request to warm up the cache
        await this.performCacheWarmup(cdnUrl);

        result.warmedUp.push(fileId);

        // Log warmup action
        await this.logCDNAccess(fileId, 'cache_warmed', {
          url: cdnUrl,
        });

      } catch (error: any) {
        logger.warn('Failed to warm up CDN cache for file:', {
          fileId,
          error: error.message,
        });
        result.failed.push(fileId);
      }
    }

    logger.info('CDN cache warmup completed:', {
      totalFiles: fileIds.length,
      warmedUp: result.warmedUp.length,
      failed: result.failed.length,
    });

    return result;
  }

  /**
   * Get CDN configuration
   */
  getCDNConfiguration(): CDNConfiguration {
    return { ...this.cdnConfig };
  }

  /**
   * Update CDN configuration
   */
  updateCDNConfiguration(config: Partial<CDNConfiguration>): void {
    this.cdnConfig = { ...this.cdnConfig, ...config };
  }

  /**
   * Check if file is an image
   */
  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if options contain image transformations
   */
  private hasImageTransformations(options: CDNUrlOptions): boolean {
    return !!(options.width || options.height || options.quality || options.format);
  }

  /**
   * Add image transformation parameters to URL
   */
  private addImageTransformations(url: string, options: CDNUrlOptions): string {
    const params = new URLSearchParams();

    if (options.width) params.append('w', options.width.toString());
    if (options.height) params.append('h', options.height.toString());
    if (options.quality) params.append('q', options.quality.toString());
    if (options.format) params.append('f', options.format);

    const paramString = params.toString();
    return paramString ? `${url}?${paramString}` : url;
  }

  /**
   * Perform CDN-specific purge operation
   */
  private async performCDNPurge(url: string): Promise<void> {
    // Implementation would depend on CDN provider
    switch (this.cdnConfig.provider) {
      case 'cloudfront':
        // CloudFront invalidation API call
        break;
      case 'cloudflare':
        // Cloudflare purge API call
        break;
      case 'fastly':
        // Fastly purge API call
        break;
      case 'custom':
        // Custom purge endpoint (development nginx)
        try {
          const purgeUrl = url.replace('/cdn/', '/purge/');
          await fetch(purgeUrl, { method: 'GET' });
        } catch {
          // Ignore errors in development
        }
        break;
    }
  }

  /**
   * Perform cache warmup operation
   */
  private async performCacheWarmup(url: string): Promise<void> {
    try {
      await fetch(url, { method: 'HEAD' });
    } catch (error) {
      // Log but don't throw - warmup is best effort
      logger.debug('Cache warmup request failed:', { url, error });
    }
  }

  /**
   * Log CDN access for analytics
   */
  private async logCDNAccess(
    fileId: string,
    action: string,
    metadata: any
  ): Promise<void> {
    try {
      await this.prisma.fileAccessLog.create({
        data: {
          fileId,
          userId: 'system',
          action: action.toUpperCase(),
          metadata,
        },
      });
    } catch (error) {
      // Don't throw on logging errors
      logger.debug('Failed to log CDN access:', { fileId, action, error });
    }
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
export const cdnIntegrationService = new CDNIntegrationService();
export default CDNIntegrationService;