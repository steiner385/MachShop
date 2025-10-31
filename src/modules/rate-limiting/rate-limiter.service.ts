/**
 * Rate Limiter Service
 *
 * Implements distributed rate limiting using Redis with the token bucket algorithm.
 * Supports multiple rate limit windows (minute, hour, day) and resource-specific limits.
 *
 * @module modules/rate-limiting/rate-limiter.service
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../../utils/logger';
import { ApiTier } from '../../constants/api-tiers';
import {
  getRateLimitConfig,
  RateLimitWindow,
  calculateResetTime,
  REDIS_KEY_PATTERNS
} from '../../config/rate-limits';

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp when window resets
  retryAfter?: number; // Seconds to wait before retrying (if not allowed)
}

/**
 * Rate limit status for all windows
 */
export interface RateLimitStatus {
  minute: RateLimitResult;
  hour: RateLimitResult;
  day: RateLimitResult;
}

/**
 * Rate Limiter Service Class
 */
export class RateLimiterService {
  private redisClient: RedisClientType | null = null;
  private isConnected = false;

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.redisClient = createClient({
        url: redisUrl,
        password: process.env.REDIS_PASSWORD || undefined
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis client error', { error: err });
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis client connected for rate limiting');
      });

      await this.redisClient.connect();
      this.isConnected = true;

      logger.info('Rate limiter service initialized');
    } catch (error) {
      logger.error('Failed to initialize rate limiter service', { error });
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redisClient && this.isConnected) {
      await this.redisClient.quit();
      this.isConnected = false;
      logger.info('Rate limiter service disconnected');
    }
  }

  /**
   * Check if a request is allowed under rate limits
   *
   * @param apiKeyId - API key ID
   * @param tier - API tier
   * @param resource - Optional specific resource
   * @returns Rate limit result for each window
   */
  async checkRateLimit(
    apiKeyId: string,
    tier: ApiTier,
    resource?: string
  ): Promise<RateLimitStatus> {
    if (!this.redisClient || !this.isConnected) {
      // Fail open if Redis is not available
      logger.warn('Redis not connected, allowing request without rate limiting');
      return this.createFailOpenResult();
    }

    // Get rate limit configuration
    const config = getRateLimitConfig(tier, resource);

    // Check all windows
    const [minute, hour, day] = await Promise.all([
      this.checkWindow(apiKeyId, RateLimitWindow.MINUTE, config.requestsPerMinute, resource),
      this.checkWindow(apiKeyId, RateLimitWindow.HOUR, config.requestsPerHour, resource),
      this.checkWindow(apiKeyId, RateLimitWindow.DAY, config.requestsPerDay, resource)
    ]);

    return { minute, hour, day };
  }

  /**
   * Check rate limit for a specific window
   *
   * @param apiKeyId - API key ID
   * @param window - Rate limit window
   * @param limit - Maximum requests allowed in window
   * @param resource - Optional specific resource
   * @returns Rate limit result
   */
  private async checkWindow(
    apiKeyId: string,
    window: RateLimitWindow,
    limit: number,
    resource?: string
  ): Promise<RateLimitResult> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    // Generate Redis key
    const key = resource
      ? REDIS_KEY_PATTERNS.RESOURCE_LIMIT(apiKeyId, resource, window)
      : REDIS_KEY_PATTERNS.RATE_LIMIT(apiKeyId, window);

    // Get current count
    const currentStr = await this.redisClient.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;

    // Check if limit exceeded
    const allowed = current < limit;
    const remaining = Math.max(0, limit - current - 1);

    // Increment counter if allowed
    if (allowed) {
      const multi = this.redisClient.multi();
      multi.incr(key);

      // Set expiration on first increment
      if (current === 0) {
        const ttl = this.getWindowTTL(window);
        multi.expire(key, ttl);
      }

      await multi.exec();
    }

    // Calculate reset time
    const resetTime = Math.floor(Date.now() / 1000) + calculateResetTime(window);

    return {
      allowed,
      limit,
      remaining: allowed ? remaining : 0,
      resetTime,
      retryAfter: allowed ? undefined : calculateResetTime(window)
    };
  }

  /**
   * Get TTL (in seconds) for a rate limit window
   *
   * @param window - Rate limit window
   * @returns TTL in seconds
   */
  private getWindowTTL(window: RateLimitWindow): number {
    switch (window) {
      case RateLimitWindow.MINUTE:
        return 60;
      case RateLimitWindow.HOUR:
        return 3600;
      case RateLimitWindow.DAY:
        return 86400;
      default:
        return 60;
    }
  }

  /**
   * Get remaining quota for all windows
   *
   * @param apiKeyId - API key ID
   * @param tier - API tier
   * @param resource - Optional specific resource
   * @returns Remaining quota for each window
   */
  async getRemainingQuota(
    apiKeyId: string,
    tier: ApiTier,
    resource?: string
  ): Promise<{
    minute: { limit: number; remaining: number; resetTime: number };
    hour: { limit: number; remaining: number; resetTime: number };
    day: { limit: number; remaining: number; resetTime: number };
  }> {
    if (!this.redisClient || !this.isConnected) {
      // Return unlimited if Redis not available
      return this.createUnlimitedQuota();
    }

    const config = getRateLimitConfig(tier, resource);

    const [minute, hour, day] = await Promise.all([
      this.getWindowQuota(apiKeyId, RateLimitWindow.MINUTE, config.requestsPerMinute, resource),
      this.getWindowQuota(apiKeyId, RateLimitWindow.HOUR, config.requestsPerHour, resource),
      this.getWindowQuota(apiKeyId, RateLimitWindow.DAY, config.requestsPerDay, resource)
    ]);

    return { minute, hour, day };
  }

  /**
   * Get remaining quota for a specific window
   *
   * @param apiKeyId - API key ID
   * @param window - Rate limit window
   * @param limit - Maximum requests allowed in window
   * @param resource - Optional specific resource
   * @returns Quota information
   */
  private async getWindowQuota(
    apiKeyId: string,
    window: RateLimitWindow,
    limit: number,
    resource?: string
  ): Promise<{ limit: number; remaining: number; resetTime: number }> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }

    const key = resource
      ? REDIS_KEY_PATTERNS.RESOURCE_LIMIT(apiKeyId, resource, window)
      : REDIS_KEY_PATTERNS.RATE_LIMIT(apiKeyId, window);

    const currentStr = await this.redisClient.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    const remaining = Math.max(0, limit - current);
    const resetTime = Math.floor(Date.now() / 1000) + calculateResetTime(window);

    return { limit, remaining, resetTime };
  }

  /**
   * Reset rate limits for an API key (admin function)
   *
   * @param apiKeyId - API key ID
   */
  async resetRateLimits(apiKeyId: string): Promise<void> {
    if (!this.redisClient || !this.isConnected) {
      return;
    }

    // Delete all rate limit keys for this API key
    const patterns = [
      `ratelimit:${apiKeyId}:*`,
      `quota:${apiKeyId}:*`
    ];

    for (const pattern of patterns) {
      const keys = await this.scanKeys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
    }

    logger.info('Rate limits reset for API key', { apiKeyId });
  }

  /**
   * Scan Redis keys matching a pattern
   *
   * @param pattern - Key pattern
   * @returns Array of matching keys
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    if (!this.redisClient) {
      return [];
    }

    const keys: string[] = [];
    let cursor = 0;

    do {
      const result = await this.redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });

      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);

    return keys;
  }

  /**
   * Create a fail-open result (allow request if Redis is down)
   */
  private createFailOpenResult(): RateLimitStatus {
    const now = Math.floor(Date.now() / 1000);
    const result: RateLimitResult = {
      allowed: true,
      limit: 999999,
      remaining: 999999,
      resetTime: now + 60
    };

    return {
      minute: result,
      hour: result,
      day: result
    };
  }

  /**
   * Create an unlimited quota result
   */
  private createUnlimitedQuota() {
    const now = Math.floor(Date.now() / 1000);
    const quota = {
      limit: 999999,
      remaining: 999999,
      resetTime: now + 60
    };

    return {
      minute: quota,
      hour: quota,
      day: quota
    };
  }

  /**
   * Get rate limiter health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    redisConnected: boolean;
    message: string;
  }> {
    if (!this.redisClient || !this.isConnected) {
      return {
        healthy: false,
        redisConnected: false,
        message: 'Redis not connected'
      };
    }

    try {
      // Ping Redis to check connection
      await this.redisClient.ping();

      return {
        healthy: true,
        redisConnected: true,
        message: 'Rate limiter service healthy'
      };
    } catch (error) {
      return {
        healthy: false,
        redisConnected: false,
        message: `Redis connection error: ${error}`
      };
    }
  }
}

// Export singleton instance
export const rateLimiterService = new RateLimiterService();
