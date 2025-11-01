/**
 * Webhook Service for ERP Integration Events
 * Issue #60: Phase 9 - Webhook Support for Real-Time Sync Notifications
 *
 * Manages webhook registration, event emission, delivery, and retry logic.
 * Provides secure webhook delivery with HMAC signature verification.
 */

import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

/**
 * Webhook event types
 */
export enum WebhookEventType {
  // Integration events
  INTEGRATION_CREATED = 'integration.created',
  INTEGRATION_UPDATED = 'integration.updated',
  INTEGRATION_DELETED = 'integration.deleted',
  INTEGRATION_TEST_SUCCESS = 'integration.test.success',
  INTEGRATION_TEST_FAILED = 'integration.test.failed',

  // Sync events
  SYNC_STARTED = 'sync.started',
  SYNC_COMPLETED = 'sync.completed',
  SYNC_FAILED = 'sync.failed',
  SYNC_PROGRESS = 'sync.progress',

  // Reconciliation events
  RECONCILIATION_STARTED = 'reconciliation.started',
  RECONCILIATION_COMPLETED = 'reconciliation.completed',
  RECONCILIATION_DISCREPANCY_FOUND = 'reconciliation.discrepancy_found',

  // Discrepancy events
  DISCREPANCY_CREATED = 'discrepancy.created',
  DISCREPANCY_RESOLVED = 'discrepancy.resolved',
  DISCREPANCY_CORRECTION_APPLIED = 'discrepancy.correction_applied',
}

/**
 * Webhook event payload structure
 */
export interface WebhookPayload {
  eventId: string;
  eventType: WebhookEventType;
  timestamp: Date;
  integrationId: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Webhook endpoint configuration
 */
export interface CreateWebhookInput {
  url: string;
  integrationId: string;
  eventTypes: WebhookEventType[];
  description?: string;
  isActive?: boolean;
  secret?: string; // Optional shared secret for HMAC
}

/**
 * Webhook delivery status
 */
export enum WebhookDeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
}

/**
 * Webhook Service
 */
export class WebhookService {
  private prisma: PrismaClient;
  private readonly baseUrl = process.env.WEBHOOK_BASE_URL || 'https://localhost:3001';
  private readonly maxRetries = 5;
  private readonly initialDelay = 1000; // 1 second
  private readonly maxDelay = 300000; // 5 minutes

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Register a webhook endpoint
   */
  async registerWebhook(input: CreateWebhookInput): Promise<any> {
    try {
      // Validate webhook URL
      this.validateWebhookUrl(input.url);

      // Generate webhook secret if not provided
      const secret = input.secret || this.generateSecret();

      // Validate integration exists
      const integration = await this.prisma.erpIntegration.findUnique({
        where: { id: input.integrationId },
      });

      if (!integration) {
        throw new Error(`Integration not found: ${input.integrationId}`);
      }

      // Create webhook endpoint
      const webhook = await this.prisma.erpWebhookEndpoint.create({
        data: {
          url: input.url,
          integrationId: input.integrationId,
          eventTypes: input.eventTypes,
          description: input.description,
          isActive: input.isActive ?? true,
          secret,
          lastDeliveryAt: null,
          failureCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Webhook registered', {
        webhookId: webhook.id,
        integrationId: input.integrationId,
        url: input.url,
        eventTypes: input.eventTypes,
      });

      return {
        id: webhook.id,
        url: webhook.url,
        integrationId: webhook.integrationId,
        eventTypes: webhook.eventTypes,
        secret, // Return secret only at creation time
        isActive: webhook.isActive,
      };
    } catch (error) {
      logger.error('Failed to register webhook', {
        error: error instanceof Error ? error.message : String(error),
        url: input.url,
      });
      throw error;
    }
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(webhookId: string, updates: Partial<CreateWebhookInput>): Promise<any> {
    try {
      const webhook = await this.prisma.erpWebhookEndpoint.findUnique({
        where: { id: webhookId },
      });

      if (!webhook) {
        throw new Error(`Webhook not found: ${webhookId}`);
      }

      if (updates.url) {
        this.validateWebhookUrl(updates.url);
      }

      const updated = await this.prisma.erpWebhookEndpoint.update({
        where: { id: webhookId },
        data: {
          ...(updates.url && { url: updates.url }),
          ...(updates.eventTypes && { eventTypes: updates.eventTypes }),
          ...(updates.description && { description: updates.description }),
          ...(updates.isActive !== undefined && { isActive: updates.isActive }),
          updatedAt: new Date(),
        },
      });

      logger.info('Webhook updated', {
        webhookId,
        updates: Object.keys(updates),
      });

      return updated;
    } catch (error) {
      logger.error('Failed to update webhook', {
        error: error instanceof Error ? error.message : String(error),
        webhookId,
      });
      throw error;
    }
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.prisma.erpWebhookEndpoint.delete({
        where: { id: webhookId },
      });

      logger.info('Webhook deleted', { webhookId });
    } catch (error) {
      logger.error('Failed to delete webhook', {
        error: error instanceof Error ? error.message : String(error),
        webhookId,
      });
      throw error;
    }
  }

  /**
   * Get webhooks for an integration
   */
  async getWebhooks(integrationId: string): Promise<any[]> {
    try {
      return await this.prisma.erpWebhookEndpoint.findMany({
        where: { integrationId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get webhooks', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(webhookId: string): Promise<boolean> {
    const webhook = await this.prisma.erpWebhookEndpoint.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    try {
      const testPayload: WebhookPayload = {
        eventId: this.generateEventId(),
        eventType: WebhookEventType.INTEGRATION_TEST_SUCCESS,
        timestamp: new Date(),
        integrationId: webhook.integrationId,
        data: {
          message: 'This is a test webhook delivery',
        },
      };

      const success = await this.deliverWebhook(webhook, testPayload, true);

      if (success) {
        logger.info('Webhook test successful', { webhookId, url: webhook.url });
      } else {
        logger.warn('Webhook test failed', { webhookId, url: webhook.url });
      }

      return success;
    } catch (error) {
      logger.error('Failed to test webhook', {
        error: error instanceof Error ? error.message : String(error),
        webhookId,
      });
      throw error;
    }
  }

  /**
   * Emit webhook event
   */
  async emitEvent(
    integrationId: string,
    eventType: WebhookEventType,
    data: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const webhooks = await this.prisma.erpWebhookEndpoint.findMany({
        where: {
          integrationId,
          isActive: true,
          eventTypes: {
            has: eventType,
          },
        },
      });

      if (webhooks.length === 0) {
        logger.debug('No active webhooks for event', { integrationId, eventType });
        return;
      }

      const payload: WebhookPayload = {
        eventId: this.generateEventId(),
        eventType,
        timestamp: new Date(),
        integrationId,
        data,
        metadata,
      };

      // Create event record
      const event = await this.prisma.erpWebhookEvent.create({
        data: {
          eventId: payload.eventId,
          eventType,
          integrationId,
          payload: data,
          createdAt: new Date(),
        },
      });

      logger.debug('Webhook event created', {
        eventId: payload.eventId,
        eventType,
        webhookCount: webhooks.length,
      });

      // Queue deliveries asynchronously
      for (const webhook of webhooks) {
        this.queueDelivery(webhook, payload);
      }
    } catch (error) {
      logger.error('Failed to emit webhook event', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
        eventType,
      });
    }
  }

  /**
   * Queue webhook delivery (fire and forget)
   */
  private queueDelivery(webhook: any, payload: WebhookPayload): void {
    // Use setImmediate to queue delivery asynchronously
    setImmediate(async () => {
      try {
        const delivery = await this.prisma.erpWebhookDelivery.create({
          data: {
            webhookId: webhook.id,
            eventId: payload.eventId,
            status: WebhookDeliveryStatus.PENDING,
            attempt: 0,
            lastError: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Begin delivery with retries
        await this.deliverWithRetry(webhook, payload, delivery.id);
      } catch (error) {
        logger.error('Failed to queue webhook delivery', {
          error: error instanceof Error ? error.message : String(error),
          webhookId: webhook.id,
          eventId: payload.eventId,
        });
      }
    });
  }

  /**
   * Deliver webhook with retry logic
   */
  private async deliverWithRetry(
    webhook: any,
    payload: WebhookPayload,
    deliveryId: string
  ): Promise<void> {
    let lastError: string | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const success = await this.deliverWebhook(webhook, payload);

        if (success) {
          // Update delivery as successful
          await this.prisma.erpWebhookDelivery.update({
            where: { id: deliveryId },
            data: {
              status: WebhookDeliveryStatus.DELIVERED,
              attempt: attempt + 1,
              lastError: null,
              updatedAt: new Date(),
            },
          });

          // Update webhook last delivery
          await this.prisma.erpWebhookEndpoint.update({
            where: { id: webhook.id },
            data: {
              lastDeliveryAt: new Date(),
              failureCount: 0,
            },
          });

          logger.info('Webhook delivered successfully', {
            webhookId: webhook.id,
            eventId: payload.eventId,
            attempt: attempt + 1,
          });

          return;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      // Check if we should retry
      if (attempt < this.maxRetries) {
        const delay = this.calculateBackoffDelay(attempt);

        await this.prisma.erpWebhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: WebhookDeliveryStatus.RETRYING,
            attempt: attempt + 1,
            lastError,
            updatedAt: new Date(),
          },
        });

        logger.warn('Retrying webhook delivery', {
          webhookId: webhook.id,
          eventId: payload.eventId,
          attempt: attempt + 1,
          delayMs: delay,
          error: lastError,
        });

        await this.sleep(delay);
      }
    }

    // Mark as failed after all retries
    await this.prisma.erpWebhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.FAILED,
        attempt: this.maxRetries + 1,
        lastError,
        updatedAt: new Date(),
      },
    });

    // Update webhook failure count
    await this.prisma.erpWebhookEndpoint.update({
      where: { id: webhook.id },
      data: {
        failureCount: webhook.failureCount + 1,
        // Disable webhook if too many failures
        isActive: webhook.failureCount < 10,
      },
    });

    logger.error('Webhook delivery failed after all retries', {
      webhookId: webhook.id,
      eventId: payload.eventId,
      maxRetries: this.maxRetries,
      lastError,
    });
  }

  /**
   * Deliver webhook to endpoint
   */
  private async deliverWebhook(
    webhook: any,
    payload: WebhookPayload,
    isTest: boolean = false
  ): Promise<boolean> {
    try {
      // Generate signature
      const signature = this.generateSignature(webhook.secret, payload);

      const response = await axios.post(webhook.url, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event-ID': payload.eventId,
          'X-Webhook-Event-Type': payload.eventType,
          'X-Webhook-Timestamp': payload.timestamp.toISOString(),
          'User-Agent': 'MachShop-WebhookDelivery/1.0',
        },
      });

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      logger.debug('Webhook delivery HTTP call failed', {
        webhookId: webhook.id,
        url: webhook.url,
        error: error instanceof AxiosError ? {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
        } : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate HMAC signature for webhook
   */
  private generateSignature(secret: string, payload: WebhookPayload): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(secret: string, payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Generate random secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Validate webhook URL
   */
  private validateWebhookUrl(url: string): void {
    try {
      const urlObj = new URL(url);

      // Only allow HTTPS in production
      if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:') {
        throw new Error('Webhooks must use HTTPS in production');
      }

      // Prevent webhook loops (disallow localhost in production)
      if (process.env.NODE_ENV === 'production' &&
          (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
        throw new Error('Webhooks cannot point to localhost in production');
      }
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.initialDelay * Math.pow(2, attempt);
    const jitterDelay = exponentialDelay + Math.random() * 1000;
    return Math.min(jitterDelay, this.maxDelay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get delivery history for webhook
   */
  async getDeliveryHistory(webhookId: string, limit: number = 50): Promise<any[]> {
    try {
      return await this.prisma.erpWebhookDelivery.findMany({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      logger.error('Failed to get delivery history', {
        error: error instanceof Error ? error.message : String(error),
        webhookId,
      });
      throw error;
    }
  }

  /**
   * Get delivery statistics for webhook
   */
  async getDeliveryStats(webhookId: string): Promise<any> {
    try {
      const [total, successful, failed, retrying] = await Promise.all([
        this.prisma.erpWebhookDelivery.count({
          where: { webhookId },
        }),
        this.prisma.erpWebhookDelivery.count({
          where: { webhookId, status: WebhookDeliveryStatus.DELIVERED },
        }),
        this.prisma.erpWebhookDelivery.count({
          where: { webhookId, status: WebhookDeliveryStatus.FAILED },
        }),
        this.prisma.erpWebhookDelivery.count({
          where: { webhookId, status: WebhookDeliveryStatus.RETRYING },
        }),
      ]);

      return {
        total,
        successful,
        failed,
        retrying,
        successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%',
      };
    } catch (error) {
      logger.error('Failed to get delivery stats', {
        error: error instanceof Error ? error.message : String(error),
        webhookId,
      });
      throw error;
    }
  }
}

export default WebhookService;
