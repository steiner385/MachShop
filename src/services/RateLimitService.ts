/**
 * ✅ GITHUB ISSUE #74: API Access Control & Security Model - Phase 1-2
 * Rate Limiting Service
 *
 * Implements:
 * - Token bucket algorithm for rate limiting
 * - Multiple time windows (minute, hour, day)
 * - Quota tracking and reset
 * - Rate limit headers for response
 * - Burst handling with configurable burst size
 */

import { prisma } from '../lib/prisma';
import { RateLimitConfig, QuotaUsage, RateLimitHeaders } from '../types/security';
import { AppError } from '../middleware/errorHandler';

// In-memory token buckets for performance
const tokenBuckets = new Map<string, any>();

interface TokenBucket {
  minute: number;
  hour: number;
  day: number;
  lastRefill: Date;
}

/**
 * Rate Limit Service
 * Manages API rate limiting with token bucket algorithm
 */
export class RateLimitService {
  /**
   * Create rate limit configuration for an API key
   */
  async createRateLimitConfig(
    apiKeyId: string,
    config: {
      requestsPerMinute?: number;
      requestsPerHour?: number;
      requestsPerDay?: number;
      burstSize?: number;
    } = {},
  ): Promise<RateLimitConfig> {
    // Check if config already exists
    const existing = await prisma.rateLimitConfig.findUnique({
      where: { apiKeyId },
    });

    if (existing) {
      throw new AppError('Rate limit config already exists for this key', 409);
    }

    const rateLimitConfig = await prisma.rateLimitConfig.create({
      data: {
        apiKeyId,
        requestsPerMinute: config.requestsPerMinute || 100,
        requestsPerHour: config.requestsPerHour || 5000,
        requestsPerDay: config.requestsPerDay || 50000,
        burstSize: config.burstSize || 10,
        enabled: true,
        quotaResetAt: new Date(),
      },
    });

    // Initialize token bucket in memory
    this.initializeTokenBucket(apiKeyId, rateLimitConfig);

    return rateLimitConfig;
  }

  /**
   * Get rate limit configuration for an API key
   */
  async getRateLimitConfig(apiKeyId: string): Promise<RateLimitConfig | null> {
    const config = await prisma.rateLimitConfig.findUnique({
      where: { apiKeyId },
    });

    if (config) {
      // Initialize token bucket if not already done
      this.initializeTokenBucket(apiKeyId, config);
    }

    return config;
  }

  /**
   * Update rate limit configuration
   */
  async updateRateLimitConfig(
    apiKeyId: string,
    updates: {
      requestsPerMinute?: number;
      requestsPerHour?: number;
      requestsPerDay?: number;
      burstSize?: number;
      enabled?: boolean;
    },
  ): Promise<RateLimitConfig> {
    const config = await prisma.rateLimitConfig.update({
      where: { apiKeyId },
      data: updates,
    });

    // Reinitialize token bucket with new limits
    this.initializeTokenBucket(apiKeyId, config);

    return config;
  }

  /**
   * Check if a request should be allowed based on rate limits
   * Returns whether allowed and current quota usage
   */
  async checkRateLimit(apiKeyId: string): Promise<{
    allowed: boolean;
    usage: QuotaUsage;
    headers: RateLimitHeaders;
  }> {
    const config = await this.getRateLimitConfig(apiKeyId);

    if (!config || !config.enabled) {
      // No rate limiting configured
      return {
        allowed: true,
        usage: this.getDefaultQuotaUsage(),
        headers: this.getDefaultRateLimitHeaders(),
      };
    }

    // Get or create token bucket
    let bucket = tokenBuckets.get(apiKeyId);
    if (!bucket) {
      bucket = this.initializeTokenBucket(apiKeyId, config);
    }

    // Refill tokens based on time elapsed
    this.refillTokens(bucket, config);

    // Check if request can be allowed
    const usage = this.calculateQuotaUsage(bucket, config);

    if (bucket.minute < 1 || bucket.hour < 1 || bucket.day < 1) {
      // Rate limit exceeded
      return {
        allowed: false,
        usage,
        headers: this.generateRateLimitHeaders(usage, 'minute'),
      };
    }

    // Consume tokens
    bucket.minute--;
    bucket.hour--;
    bucket.day--;

    const updatedUsage = this.calculateQuotaUsage(bucket, config);

    return {
      allowed: true,
      usage: updatedUsage,
      headers: this.generateRateLimitHeaders(updatedUsage, this.getActiveWindow(bucket, config)),
    };
  }

  /**
   * Reset quota for an API key
   */
  async resetQuota(apiKeyId: string): Promise<RateLimitConfig> {
    const config = await prisma.rateLimitConfig.update({
      where: { apiKeyId },
      data: {
        quotaResetAt: new Date(),
      },
    });

    // Reset in-memory bucket
    const bucket = this.initializeTokenBucket(apiKeyId, config);
    return config;
  }

  /**
   * Get current quota usage for an API key
   */
  async getQuotaUsage(apiKeyId: string): Promise<QuotaUsage> {
    const config = await this.getRateLimitConfig(apiKeyId);

    if (!config) {
      return this.getDefaultQuotaUsage();
    }

    let bucket = tokenBuckets.get(apiKeyId);
    if (!bucket) {
      bucket = this.initializeTokenBucket(apiKeyId, config);
    }

    // Refill tokens
    this.refillTokens(bucket, config);

    return this.calculateQuotaUsage(bucket, config);
  }

  /**
   * Initialize token bucket for an API key
   */
  private initializeTokenBucket(apiKeyId: string, config: RateLimitConfig): TokenBucket {
    const bucket: TokenBucket = {
      minute: config.requestsPerMinute,
      hour: config.requestsPerHour,
      day: config.requestsPerDay,
      lastRefill: new Date(),
    };

    tokenBuckets.set(apiKeyId, bucket);
    return bucket;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens(bucket: TokenBucket, config: RateLimitConfig): void {
    const now = new Date();
    const elapsed = now.getTime() - bucket.lastRefill.getTime();

    // Refill minute bucket every 60 seconds
    if (elapsed >= 60000) {
      const minutesPassed = Math.floor(elapsed / 60000);
      bucket.minute = Math.min(
        config.requestsPerMinute,
        bucket.minute + config.requestsPerMinute * minutesPassed,
      );
    }

    // Refill hour bucket every 3600 seconds
    if (elapsed >= 3600000) {
      const hoursPassed = Math.floor(elapsed / 3600000);
      bucket.hour = Math.min(
        config.requestsPerHour,
        bucket.hour + config.requestsPerHour * hoursPassed,
      );
    }

    // Refill day bucket every 86400 seconds
    if (elapsed >= 86400000) {
      const daysPassed = Math.floor(elapsed / 86400000);
      bucket.day = Math.min(
        config.requestsPerDay,
        bucket.day + config.requestsPerDay * daysPassed,
      );
    }

    bucket.lastRefill = now;
  }

  /**
   * Calculate current quota usage
   */
  private calculateQuotaUsage(bucket: TokenBucket, config: RateLimitConfig): QuotaUsage {
    const now = new Date();

    return {
      minute: {
        used: Math.max(0, config.requestsPerMinute - bucket.minute),
        limit: config.requestsPerMinute,
        remaining: Math.max(0, bucket.minute),
        resetsAt: new Date(now.getTime() + 60000),
      },
      hour: {
        used: Math.max(0, config.requestsPerHour - bucket.hour),
        limit: config.requestsPerHour,
        remaining: Math.max(0, bucket.hour),
        resetsAt: new Date(now.getTime() + 3600000),
      },
      day: {
        used: Math.max(0, config.requestsPerDay - bucket.day),
        limit: config.requestsPerDay,
        remaining: Math.max(0, bucket.day),
        resetsAt: new Date(now.getTime() + 86400000),
      },
    };
  }

  /**
   * Generate rate limit response headers
   */
  private generateRateLimitHeaders(
    usage: QuotaUsage,
    window: 'minute' | 'hour' | 'day',
  ): RateLimitHeaders {
    const w = usage[window];

    return {
      'RateLimit-Limit': w.limit.toString(),
      'RateLimit-Remaining': w.remaining.toString(),
      'RateLimit-Reset': Math.ceil(w.resetsAt.getTime() / 1000).toString(),
      'RateLimit-Window': window,
    };
  }

  /**
   * Determine which quota window is most restrictive
   */
  private getActiveWindow(
    bucket: TokenBucket,
    config: RateLimitConfig,
  ): 'minute' | 'hour' | 'day' {
    const minutePercentage = bucket.minute / config.requestsPerMinute;
    const hourPercentage = bucket.hour / config.requestsPerHour;
    const dayPercentage = bucket.day / config.requestsPerDay;

    const min = Math.min(minutePercentage, hourPercentage, dayPercentage);

    if (min === minutePercentage) return 'minute';
    if (min === hourPercentage) return 'hour';
    return 'day';
  }

  /**
   * Get default quota usage (when no limits)
   */
  private getDefaultQuotaUsage(): QuotaUsage {
    const now = new Date();

    return {
      minute: {
        used: 0,
        limit: 0,
        remaining: Infinity,
        resetsAt: new Date(now.getTime() + 60000),
      },
      hour: {
        used: 0,
        limit: 0,
        remaining: Infinity,
        resetsAt: new Date(now.getTime() + 3600000),
      },
      day: {
        used: 0,
        limit: 0,
        remaining: Infinity,
        resetsAt: new Date(now.getTime() + 86400000),
      },
    };
  }

  /**
   * Get default rate limit headers
   */
  private getDefaultRateLimitHeaders(): RateLimitHeaders {
    return {
      'RateLimit-Limit': '0',
      'RateLimit-Remaining': 'unlimited',
      'RateLimit-Reset': '0',
      'RateLimit-Window': 'day',
    };
  }

  /**
   * Clear token buckets (useful for testing)
   */
  clearBuckets(): void {
    tokenBuckets.clear();
  }

  /**
   * Get all token buckets (for testing)
   */
  getBuckets(): Map<string, any> {
    return tokenBuckets;
  }
}

export const rateLimitService = new RateLimitService();
