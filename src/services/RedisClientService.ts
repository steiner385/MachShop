/**
 * Redis Client Service (Issue #75 Phase 4)
 *
 * Provides singleton Redis client with connection pooling and automatic reconnection.
 * Manages pub/sub subscriptions and queue operations for event bus.
 */

import { createClient, RedisClientType, RedisFunctions } from 'redis';
import { logger } from '../utils/logger';

type RedisClient = ReturnType<typeof createClient>;

class RedisClientService {
  private static instance: RedisClientService;
  private client: RedisClient | null = null;
  private subscribeClient: RedisClient | null = null;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxRetries: number = 5;
  private retryDelay: number = 1000;

  private constructor() {}

  static getInstance(): RedisClientService {
    if (!RedisClientService.instance) {
      RedisClientService.instance = new RedisClientService();
    }
    return RedisClientService.instance;
  }

  /**
   * Initialize Redis connection with automatic reconnection
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      // Main client for commands
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.maxRetries) {
              logger.error(`[Redis] Max reconnection attempts exceeded`);
              return new Error('Max reconnection attempts exceeded');
            }
            const delay = Math.min(retries * this.retryDelay, 30000);
            logger.warn(`[Redis] Reconnecting... Attempt ${retries + 1}/${this.maxRetries} (delay: ${delay}ms)`);
            return delay;
          },
        },
      });

      // Separate client for pub/sub (required by redis library)
      this.subscribeClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.maxRetries) {
              return new Error('Max reconnection attempts exceeded');
            }
            return Math.min(retries * this.retryDelay, 30000);
          },
        },
      });

      // Setup event handlers
      this.client.on('error', (err) => {
        logger.error('[Redis] Client error:', err);
      });

      this.client.on('connect', () => {
        logger.info('[Redis] Connected');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.client.on('disconnect', () => {
        logger.warn('[Redis] Disconnected');
        this.isConnected = false;
      });

      this.subscribeClient.on('error', (err) => {
        logger.error('[Redis] Subscribe client error:', err);
      });

      // Connect both clients
      await this.client.connect();
      await this.subscribeClient.connect();

      this.isConnected = true;
      logger.info('[Redis] Successfully connected and ready for operations');
    } catch (error) {
      logger.error('[Redis] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Get main Redis client for commands
   */
  getClient(): RedisClient {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Get subscribe client for pub/sub
   */
  getSubscribeClient(): RedisClient {
    if (!this.subscribeClient) {
      throw new Error('Redis subscribe client not initialized. Call connect() first.');
    }
    return this.subscribeClient;
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Gracefully disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.disconnect();
      }
      if (this.subscribeClient) {
        await this.subscribeClient.disconnect();
      }
      this.isConnected = false;
      logger.info('[Redis] Disconnected');
    } catch (error) {
      logger.error('[Redis] Disconnect failed:', error);
    }
  }

  /**
   * Publish event to Redis pub/sub channel
   */
  async publish(channel: string, message: string): Promise<number> {
    const client = this.getClient();
    try {
      const numSubscribers = await client.publish(channel, message);
      return numSubscribers;
    } catch (error) {
      logger.error(`[Redis] Failed to publish to channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to Redis pub/sub channel
   */
  async subscribe(
    channel: string,
    handler: (message: string, channel: string) => Promise<void>
  ): Promise<void> {
    const client = this.getSubscribeClient();
    try {
      await client.subscribe(channel, async (message, channel) => {
        try {
          await handler(message, channel);
        } catch (error) {
          logger.error(`[Redis] Handler error on channel ${channel}:`, error);
        }
      });
      logger.info(`[Redis] Subscribed to channel: ${channel}`);
    } catch (error) {
      logger.error(`[Redis] Failed to subscribe to channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from Redis channel
   */
  async unsubscribe(channel: string): Promise<void> {
    const client = this.getSubscribeClient();
    try {
      await client.unsubscribe(channel);
      logger.info(`[Redis] Unsubscribed from channel: ${channel}`);
    } catch (error) {
      logger.error(`[Redis] Failed to unsubscribe from channel ${channel}:`, error);
    }
  }

  /**
   * Publish to pattern (broadcast to multiple channels)
   */
  async publishPattern(pattern: string, message: string): Promise<number> {
    const client = this.getClient();
    try {
      // Get all keys matching pattern
      const keys = await client.keys(pattern);
      let total = 0;
      for (const key of keys) {
        const count = await client.publish(key, message);
        total += count;
      }
      return total;
    } catch (error) {
      logger.error(`[Redis] Failed to publish to pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Set key with expiration
   */
  async setWithExpiry(key: string, value: string, expirySeconds: number): Promise<void> {
    const client = this.getClient();
    try {
      await client.setEx(key, expirySeconds, value);
    } catch (error) {
      logger.error(`[Redis] Failed to set key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get value from Redis
   */
  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    try {
      return await client.get(key);
    } catch (error) {
      logger.error(`[Redis] Failed to get key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete key from Redis
   */
  async delete(key: string): Promise<number> {
    const client = this.getClient();
    try {
      return await client.del(key);
    } catch (error) {
      logger.error(`[Redis] Failed to delete key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Push to Redis list (queue)
   */
  async pushToQueue(queueKey: string, value: string): Promise<number> {
    const client = this.getClient();
    try {
      return await client.rPush(queueKey, value);
    } catch (error) {
      logger.error(`[Redis] Failed to push to queue ${queueKey}:`, error);
      throw error;
    }
  }

  /**
   * Pop from Redis list (dequeue)
   */
  async popFromQueue(queueKey: string): Promise<string | null> {
    const client = this.getClient();
    try {
      return await client.lPop(queueKey);
    } catch (error) {
      logger.error(`[Redis] Failed to pop from queue ${queueKey}:`, error);
      throw error;
    }
  }

  /**
   * Get queue length
   */
  async getQueueLength(queueKey: string): Promise<number> {
    const client = this.getClient();
    try {
      return await client.lLen(queueKey);
    } catch (error) {
      logger.error(`[Redis] Failed to get queue length ${queueKey}:`, error);
      throw error;
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string): Promise<number> {
    const client = this.getClient();
    try {
      return await client.incr(key);
    } catch (error) {
      logger.error(`[Redis] Failed to increment key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get queue items (for monitoring)
   */
  async getQueueItems(queueKey: string, start: number = 0, stop: number = -1): Promise<string[]> {
    const client = this.getClient();
    try {
      return await client.lRange(queueKey, start, stop);
    } catch (error) {
      logger.error(`[Redis] Failed to get queue items ${queueKey}:`, error);
      throw error;
    }
  }

  /**
   * Clear all data (use with caution, mainly for testing)
   */
  async flushAll(): Promise<void> {
    const client = this.getClient();
    try {
      await client.flushAll();
      logger.warn('[Redis] All data flushed');
    } catch (error) {
      logger.error('[Redis] Failed to flush all:', error);
    }
  }
}

export default RedisClientService.getInstance();
