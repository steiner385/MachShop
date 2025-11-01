/**
 * Event Bus Service (Issue #75 Phase 4)
 *
 * Real-time event distribution using Redis pub/sub.
 * Handles event publishing, subscriptions, and multi-channel broadcasting.
 * Integrates with plugin webhooks and event callbacks.
 */

import redisClient from './RedisClientService';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

interface EventSubscription {
  id: string;
  channel: string;
  handler: (event: PluginEvent) => Promise<void>;
}

interface PluginEvent {
  id: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  sourceUserId?: string;
  sourceRequestId?: string;
}

class EventBusService {
  private static instance: EventBusService;
  private subscriptions: Map<string, EventSubscription> = new Map();
  private channelHandlers: Map<string, Set<string>> = new Map(); // Channel -> Subscription IDs
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService();
    }
    return EventBusService.instance;
  }

  /**
   * Initialize event bus subscriptions
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check if Redis is available
      if (!redisClient.isRedisConnected()) {
        logger.warn('[EventBus] Redis not connected, skipping initialization');
        return;
      }

      // Subscribe to plugin event channel for all active plugins
      await this.subscribeToPluginEvents();

      this.isInitialized = true;
      logger.info('[EventBus] Initialized and ready for event distribution');
    } catch (error) {
      logger.error('[EventBus] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Subscribe to plugin events from Redis
   */
  private async subscribeToPluginEvents(): Promise<void> {
    try {
      await redisClient.subscribe('plugin:events', async (message) => {
        try {
          const event = JSON.parse(message) as PluginEvent;
          await this.handleEvent(event);
        } catch (error) {
          logger.error('[EventBus] Failed to handle event:', error);
        }
      });
    } catch (error) {
      logger.error('[EventBus] Failed to subscribe to plugin events:', error);
      throw error;
    }
  }

  /**
   * Handle incoming event and dispatch to subscribers
   */
  private async handleEvent(event: PluginEvent): Promise<void> {
    try {
      // Get channel-specific handlers
      const handlers = this.channelHandlers.get(event.eventType) || new Set();

      // Dispatch to all registered handlers
      const promises: Promise<void>[] = [];
      for (const subscriptionId of handlers) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
          promises.push(
            subscription.handler(event).catch((error) => {
              logger.error(`[EventBus] Handler error for subscription ${subscriptionId}:`, error);
            })
          );
        }
      }

      // Execute all handlers in parallel
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }

      // Dispatch webhooks for this event
      await this.dispatchWebhooks(event);
    } catch (error) {
      logger.error('[EventBus] Event handling failed:', error);
    }
  }

  /**
   * Dispatch webhooks registered for event type
   */
  private async dispatchWebhooks(event: PluginEvent): Promise<void> {
    try {
      const webhooks = await prisma.pluginWebhook.findMany({
        where: {
          eventType: event.eventType,
          isActive: true,
        },
        include: {
          plugin: true,
        },
      });

      if (webhooks.length === 0) {
        return;
      }

      // Queue webhooks for delivery (non-blocking)
      for (const webhook of webhooks) {
        const webhookPayload = {
          event,
          webhook: {
            id: webhook.id,
            url: webhook.webhookUrl,
          },
        };

        // Queue for WebhookQueueService to process
        await redisClient.pushToQueue(
          `webhook:queue:${webhook.pluginId}`,
          JSON.stringify(webhookPayload)
        );
      }

      logger.debug(`[EventBus] Queued ${webhooks.length} webhooks for event ${event.eventType}`);
    } catch (error) {
      logger.error('[EventBus] Failed to dispatch webhooks:', error);
    }
  }

  /**
   * Publish event to event bus
   */
  async publishEvent(
    eventType: string,
    eventData: Record<string, any>,
    sourceUserId?: string,
    sourceRequestId?: string
  ): Promise<string> {
    try {
      // Create event record in database
      const event = await prisma.pluginEvent.create({
        data: {
          eventType,
          eventData,
          timestamp: new Date(),
          sourceUserId,
          sourceRequestId,
        },
      });

      const eventPayload: PluginEvent = {
        id: event.id,
        eventType: event.eventType,
        eventData: event.eventData as Record<string, any>,
        timestamp: event.timestamp,
        sourceUserId: event.sourceUserId || undefined,
        sourceRequestId: event.sourceRequestId || undefined,
      };

      // Publish to Redis for real-time distribution
      if (redisClient.isRedisConnected()) {
        await redisClient.publish('plugin:events', JSON.stringify(eventPayload));

        // Also publish to event-type specific channel
        await redisClient.publish(`plugin:events:${eventType}`, JSON.stringify(eventPayload));
      }

      logger.debug(`[EventBus] Published event ${event.id} of type ${eventType}`);
      return event.id;
    } catch (error) {
      logger.error('[EventBus] Failed to publish event:', error);
      throw error;
    }
  }

  /**
   * Subscribe to events with callback
   */
  subscribe(
    eventType: string,
    handler: (event: PluginEvent) => Promise<void>
  ): string {
    try {
      const subscriptionId = `sub:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;

      const subscription: EventSubscription = {
        id: subscriptionId,
        channel: eventType,
        handler,
      };

      this.subscriptions.set(subscriptionId, subscription);

      // Track handlers by event type
      if (!this.channelHandlers.has(eventType)) {
        this.channelHandlers.set(eventType, new Set());
      }
      this.channelHandlers.get(eventType)!.add(subscriptionId);

      logger.debug(`[EventBus] Subscription ${subscriptionId} registered for ${eventType}`);
      return subscriptionId;
    } catch (error) {
      logger.error('[EventBus] Failed to subscribe:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        return false;
      }

      const handlers = this.channelHandlers.get(subscription.channel);
      if (handlers) {
        handlers.delete(subscriptionId);
        if (handlers.size === 0) {
          this.channelHandlers.delete(subscription.channel);
        }
      }

      this.subscriptions.delete(subscriptionId);
      logger.debug(`[EventBus] Subscription ${subscriptionId} removed`);
      return true;
    } catch (error) {
      logger.error('[EventBus] Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Get subscription stats
   */
  getStats(): {
    totalSubscriptions: number;
    channelsWithHandlers: number;
    channels: Record<string, number>;
  } {
    const channels: Record<string, number> = {};
    for (const [channel, handlers] of this.channelHandlers.entries()) {
      channels[channel] = handlers.size;
    }

    return {
      totalSubscriptions: this.subscriptions.size,
      channelsWithHandlers: this.channelHandlers.size,
      channels,
    };
  }

  /**
   * Get active subscriptions for a channel
   */
  getChannelSubscriptions(eventType: string): string[] {
    const handlers = this.channelHandlers.get(eventType);
    return handlers ? Array.from(handlers) : [];
  }

  /**
   * Clear all subscriptions (for testing/cleanup)
   */
  clearAllSubscriptions(): void {
    this.subscriptions.clear();
    this.channelHandlers.clear();
    logger.warn('[EventBus] All subscriptions cleared');
  }
}

export default EventBusService.getInstance();
export type { PluginEvent };
