/**
 * Webhook Queue Service (Issue #75 Phase 4)
 *
 * Redis-backed queue for reliable webhook delivery with exponential backoff retry logic.
 * Handles failed webhook deliveries, tracks metrics, and manages webhook lifecycle.
 */

import redisClient from './RedisClientService';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import crypto from 'crypto';

interface QueuedWebhookPayload {
  webhookId: string;
  pluginId: string;
  event: {
    id: string;
    eventType: string;
    eventData: Record<string, any>;
    timestamp: Date;
  };
  attempt: number;
  maxRetries: number;
  queuedAt: Date;
}

interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  duration: number;
  error?: string;
}

class WebhookQueueService {
  private static instance: WebhookQueueService;
  private processingInterval: NodeJS.Timer | null = null;
  private isProcessing: boolean = false;
  private batchSize: number = 10;
  private pollIntervalMs: number = 5000; // 5 seconds

  private constructor() {}

  static getInstance(): WebhookQueueService {
    if (!WebhookQueueService.instance) {
      WebhookQueueService.instance = new WebhookQueueService();
    }
    return WebhookQueueService.instance;
  }

  /**
   * Start webhook queue processor
   */
  async startProcessor(): Promise<void> {
    if (this.processingInterval) {
      return; // Already running
    }

    logger.info('[WebhookQueue] Starting processor...');

    // Start processing loop
    this.processingInterval = setInterval(async () => {
      try {
        await this.processBatch();
      } catch (error) {
        logger.error('[WebhookQueue] Processing error:', error);
      }
    }, this.pollIntervalMs);

    logger.info('[WebhookQueue] Processor started');
  }

  /**
   * Stop webhook queue processor
   */
  stopProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('[WebhookQueue] Processor stopped');
    }
  }

  /**
   * Process batch of queued webhooks
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }

    this.isProcessing = true;

    try {
      // Get all plugin queues
      const keys = await redisClient.getClient().keys('webhook:queue:*');

      for (const queueKey of keys) {
        const pluginId = queueKey.replace('webhook:queue:', '');

        // Process batch from this plugin's queue
        for (let i = 0; i < this.batchSize; i++) {
          const item = await redisClient.popFromQueue(queueKey);
          if (!item) {
            break; // Queue empty
          }

          try {
            const payload = JSON.parse(item) as {
              event: any;
              webhook: { id: string; url: string };
            };

            await this.deliverWebhook(
              payload.webhook.id,
              pluginId,
              payload.event,
              0,
              3
            );
          } catch (error) {
            logger.error('[WebhookQueue] Failed to parse webhook item:', error);
          }
        }
      }
    } catch (error) {
      logger.error('[WebhookQueue] Batch processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Deliver webhook with retry logic
   */
  private async deliverWebhook(
    webhookId: string,
    pluginId: string,
    event: any,
    attempt: number,
    maxRetries: number
  ): Promise<void> {
    try {
      const webhook = await prisma.pluginWebhook.findUnique({
        where: { id: webhookId },
      });

      if (!webhook || !webhook.isActive) {
        logger.debug(`[WebhookQueue] Webhook ${webhookId} not found or inactive`);
        return;
      }

      // Deliver webhook
      const result = await this.sendWebhook(webhook, event);

      if (result.success) {
        // Update success count
        await prisma.pluginWebhook.update({
          where: { id: webhookId },
          data: {
            successCount: { increment: 1 },
            lastTriggeredAt: new Date(),
          },
        });

        logger.debug(
          `[WebhookQueue] Webhook ${webhookId} delivered successfully (${result.duration}ms)`
        );
      } else {
        // Handle retry logic
        if (attempt < maxRetries) {
          // Calculate exponential backoff
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 30000);
          const retryAt = new Date(Date.now() + delayMs);

          // Store failed delivery and re-queue
          await prisma.pluginWebhook.update({
            where: { id: webhookId },
            data: {
              failureCount: { increment: 1 },
              failedDeliveries: webhook.failedDeliveries || [],
            },
          });

          // Re-queue with delay
          setTimeout(async () => {
            await redisClient.pushToQueue(
              `webhook:queue:${pluginId}`,
              JSON.stringify({
                event,
                webhook: { id: webhookId, url: webhook.webhookUrl },
              })
            );
          }, delayMs);

          logger.debug(
            `[WebhookQueue] Webhook ${webhookId} failed (${result.error}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
          );
        } else {
          // Max retries exceeded
          await prisma.pluginWebhook.update({
            where: { id: webhookId },
            data: {
              failureCount: { increment: 1 },
              failedDeliveries: [
                ...(webhook.failedDeliveries as any[] || []),
                {
                  eventType: event.eventType,
                  error: result.error,
                  timestamp: new Date(),
                  attempts: maxRetries,
                },
              ],
            },
          });

          logger.error(
            `[WebhookQueue] Webhook ${webhookId} failed after ${maxRetries} attempts: ${result.error}`
          );
        }
      }
    } catch (error) {
      logger.error(`[WebhookQueue] Webhook delivery error for ${webhookId}:`, error);
    }
  }

  /**
   * Send webhook HTTP request with signature
   */
  private async sendWebhook(
    webhook: any,
    event: any
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();

    try {
      // Create HMAC signature
      const payload = JSON.stringify(event);
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(payload)
        .digest('hex');

      // Send webhook
      const response = await fetch(webhook.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-ID': webhook.id,
          'X-Event-Type': event.eventType,
          'X-Timestamp': new Date().toISOString(),
        },
        body: payload,
        timeout: 30000,
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          duration,
        };
      } else {
        return {
          success: false,
          statusCode: response.status,
          duration,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get queue stats
   */
  async getQueueStats(): Promise<{
    totalQueued: number;
    pluginQueues: Record<string, number>;
  }> {
    try {
      const keys = await redisClient.getClient().keys('webhook:queue:*');
      const pluginQueues: Record<string, number> = {};
      let totalQueued = 0;

      for (const queueKey of keys) {
        const pluginId = queueKey.replace('webhook:queue:', '');
        const count = await redisClient.getQueueLength(queueKey);
        pluginQueues[pluginId] = count;
        totalQueued += count;
      }

      return {
        totalQueued,
        pluginQueues,
      };
    } catch (error) {
      logger.error('[WebhookQueue] Failed to get queue stats:', error);
      return { totalQueued: 0, pluginQueues: {} };
    }
  }

  /**
   * Get webhook delivery metrics
   */
  async getWebhookMetrics(webhookId: string): Promise<any> {
    try {
      const webhook = await prisma.pluginWebhook.findUnique({
        where: { id: webhookId },
      });

      if (!webhook) {
        return null;
      }

      const successRate =
        webhook.successCount + webhook.failureCount > 0
          ? (
              (webhook.successCount /
                (webhook.successCount + webhook.failureCount)) *
              100
            ).toFixed(2) + '%'
          : 'N/A';

      return {
        webhookId,
        eventType: webhook.eventType,
        url: webhook.webhookUrl,
        isActive: webhook.isActive,
        successCount: webhook.successCount,
        failureCount: webhook.failureCount,
        successRate,
        lastTriggeredAt: webhook.lastTriggeredAt,
        failedDeliveries: webhook.failedDeliveries,
      };
    } catch (error) {
      logger.error('[WebhookQueue] Failed to get webhook metrics:', error);
      return null;
    }
  }

  /**
   * Retry failed webhook
   */
  async retryWebhook(webhookId: string, pluginId: string): Promise<void> {
    try {
      const webhook = await prisma.pluginWebhook.findUnique({
        where: { id: webhookId },
      });

      if (!webhook) {
        throw new Error(`Webhook ${webhookId} not found`);
      }

      // Get last event (simplified - in production would need better tracking)
      const recentEvent = await prisma.pluginEvent.findFirst({
        where: { eventType: webhook.eventType },
        orderBy: { timestamp: 'desc' },
      });

      if (recentEvent) {
        await redisClient.pushToQueue(
          `webhook:queue:${pluginId}`,
          JSON.stringify({
            event: {
              id: recentEvent.id,
              eventType: recentEvent.eventType,
              eventData: recentEvent.eventData,
              timestamp: recentEvent.timestamp,
            },
            webhook: { id: webhookId, url: webhook.webhookUrl },
          })
        );

        logger.info(`[WebhookQueue] Webhook ${webhookId} queued for retry`);
      }
    } catch (error) {
      logger.error('[WebhookQueue] Failed to retry webhook:', error);
      throw error;
    }
  }
}

export default WebhookQueueService.getInstance();
export type { QueuedWebhookPayload, WebhookDeliveryResult };
