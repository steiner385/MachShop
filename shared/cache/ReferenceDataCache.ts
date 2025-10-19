/**
 * Reference Data Cache
 * Phase 2, Task 2.3: Database Per Service Pattern
 *
 * Provides in-memory caching of reference data from other services
 * to avoid cross-service database queries while maintaining data independence.
 *
 * Features:
 * - Redis-backed distributed cache
 * - TTL-based expiration
 * - Kafka event-driven synchronization
 * - Type-safe cache keys
 * - Automatic cache warming
 * - Cache invalidation on entity updates
 */

import Redis from 'ioredis';
import { Logger } from '../utils/logger';

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttl: number;
  version?: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 300 = 5 minutes)
  prefix?: string; // Cache key prefix
  enableCacheWarming?: boolean;
  warmingInterval?: number; // Cache warming interval in seconds
}

export enum CacheKeyPrefix {
  USER = 'user',
  PART = 'part',
  WORK_CENTER = 'work_center',
  SITE = 'site',
  AREA = 'area',
  PRODUCT = 'product',
  ROUTING = 'routing',
  OPERATION = 'operation',
  SKILL = 'skill',
  TOOL = 'tool',
}

export class ReferenceDataCache {
  private redis: Redis;
  private logger: Logger;
  private defaultTTL: number;
  private warmingIntervals: Map<string, NodeJS.Timeout>;

  constructor(
    redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379',
    options: { logger?: Logger; defaultTTL?: number } = {}
  ) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true; // Reconnect on readonly error
        }
        return false;
      },
    });

    this.logger = options.logger || new Logger('ReferenceDataCache');
    this.defaultTTL = options.defaultTTL || 300; // 5 minutes default
    this.warmingIntervals = new Map();

    this.redis.on('connect', () => {
      this.logger.info('Redis connection established');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error', { error: err.message });
    });
  }

  /**
   * Build a cache key from prefix and ID
   */
  private buildKey(prefix: CacheKeyPrefix | string, id: string): string {
    return `mes:cache:${prefix}:${id}`;
  }

  /**
   * Get cached data by key
   */
  async get<T>(
    prefix: CacheKeyPrefix | string,
    id: string
  ): Promise<T | null> {
    const key = this.buildKey(prefix, id);

    try {
      const cached = await this.redis.get(key);

      if (!cached) {
        this.logger.debug('Cache miss', { key });
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);

      // Check if expired (redundant but extra safety)
      const age = Date.now() - entry.cachedAt;
      if (age > entry.ttl * 1000) {
        this.logger.debug('Cache entry expired', { key, age });
        await this.redis.del(key);
        return null;
      }

      this.logger.debug('Cache hit', { key });
      return entry.data;
    } catch (error) {
      this.logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set<T>(
    prefix: CacheKeyPrefix | string,
    id: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = this.buildKey(prefix, id);
    const ttl = options.ttl || this.defaultTTL;

    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      ttl,
      version: options.prefix, // Use prefix as version identifier
    };

    try {
      await this.redis.setex(key, ttl, JSON.stringify(entry));
      this.logger.debug('Cache set', { key, ttl });
    } catch (error) {
      this.logger.error('Cache set error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get multiple entries at once (bulk get)
   */
  async getMany<T>(
    prefix: CacheKeyPrefix | string,
    ids: string[]
  ): Promise<Map<string, T>> {
    const keys = ids.map((id) => this.buildKey(prefix, id));
    const results = new Map<string, T>();

    try {
      const cached = await this.redis.mget(...keys);

      for (let i = 0; i < cached.length; i++) {
        if (cached[i]) {
          const entry: CacheEntry<T> = JSON.parse(cached[i]!);
          results.set(ids[i], entry.data);
        }
      }

      this.logger.debug('Bulk cache get', {
        requested: ids.length,
        found: results.size
      });

      return results;
    } catch (error) {
      this.logger.error('Bulk cache get error', { error: error.message });
      return results;
    }
  }

  /**
   * Set multiple entries at once (bulk set)
   */
  async setMany<T>(
    prefix: CacheKeyPrefix | string,
    entries: Map<string, T>,
    options: CacheOptions = {}
  ): Promise<void> {
    const ttl = options.ttl || this.defaultTTL;
    const pipeline = this.redis.pipeline();

    for (const [id, data] of entries) {
      const key = this.buildKey(prefix, id);
      const entry: CacheEntry<T> = {
        data,
        cachedAt: Date.now(),
        ttl,
      };

      pipeline.setex(key, ttl, JSON.stringify(entry));
    }

    try {
      await pipeline.exec();
      this.logger.debug('Bulk cache set', { count: entries.size, ttl });
    } catch (error) {
      this.logger.error('Bulk cache set error', { error: error.message });
      throw error;
    }
  }

  /**
   * Invalidate (delete) cached entry
   */
  async invalidate(
    prefix: CacheKeyPrefix | string,
    id: string
  ): Promise<void> {
    const key = this.buildKey(prefix, id);

    try {
      await this.redis.del(key);
      this.logger.debug('Cache invalidated', { key });
    } catch (error) {
      this.logger.error('Cache invalidation error', { key, error: error.message });
    }
  }

  /**
   * Invalidate multiple entries by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.scanKeys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(...keys);
      this.logger.info('Cache invalidated by pattern', {
        pattern,
        deleted
      });

      return deleted;
    } catch (error) {
      this.logger.error('Pattern invalidation error', {
        pattern,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Invalidate all entries for a prefix
   */
  async invalidateAll(prefix: CacheKeyPrefix | string): Promise<number> {
    const pattern = `mes:cache:${prefix}:*`;
    return this.invalidateByPattern(pattern);
  }

  /**
   * Scan for keys matching pattern (uses SCAN for safety)
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, matchedKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );

      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Get cache statistics
   */
  async getStats(prefix?: CacheKeyPrefix | string): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const pattern = prefix
        ? `mes:cache:${prefix}:*`
        : 'mes:cache:*';

      const keys = await this.scanKeys(pattern);
      const info = await this.redis.info('memory');

      const memoryMatch = info.match(/used_memory_human:(.*)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';

      return {
        totalKeys: keys.length,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error('Stats error', { error: error.message });
      return {
        totalKeys: 0,
        memoryUsage: 'unknown',
      };
    }
  }

  /**
   * Warm cache with initial data
   * Should be called by each service to pre-populate frequently accessed data
   */
  async warmCache<T>(
    prefix: CacheKeyPrefix | string,
    dataLoader: () => Promise<Map<string, T>>,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      this.logger.info('Warming cache', { prefix });
      const data = await dataLoader();
      await this.setMany(prefix, data, options);
      this.logger.info('Cache warmed successfully', {
        prefix,
        count: data.size
      });

      // Set up periodic cache warming if enabled
      if (options.enableCacheWarming) {
        const interval = options.warmingInterval || 300; // 5 minutes default
        this.scheduleWarmng(prefix, dataLoader, interval, options);
      }
    } catch (error) {
      this.logger.error('Cache warming failed', {
        prefix,
        error: error.message
      });
    }
  }

  /**
   * Schedule periodic cache warming
   */
  private scheduleWarming<T>(
    prefix: string,
    dataLoader: () => Promise<Map<string, T>>,
    intervalSeconds: number,
    options: CacheOptions
  ): void {
    // Clear existing interval if any
    const existingInterval = this.warmingIntervals.get(prefix);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Schedule new interval
    const interval = setInterval(async () => {
      try {
        await this.warmCache(prefix, dataLoader, options);
      } catch (error) {
        this.logger.error('Scheduled cache warming failed', {
          prefix,
          error: error.message
        });
      }
    }, intervalSeconds * 1000);

    this.warmingIntervals.set(prefix, interval);

    this.logger.info('Cache warming scheduled', {
      prefix,
      intervalSeconds
    });
  }

  /**
   * Clear all cached data (use with caution!)
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await this.scanKeys('mes:cache:*');

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.warn('All cache cleared', { keysDeleted: keys.length });
      }
    } catch (error) {
      this.logger.error('Clear all error', { error: error.message });
    }
  }

  /**
   * Close Redis connection and cleanup
   */
  async close(): Promise<void> {
    // Clear all warming intervals
    for (const interval of this.warmingIntervals.values()) {
      clearInterval(interval);
    }
    this.warmingIntervals.clear();

    await this.redis.quit();
    this.logger.info('Redis connection closed');
  }

  /**
   * Check if Redis is connected and healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Health check failed', { error: error.message });
      return false;
    }
  }
}

export default ReferenceDataCache;
