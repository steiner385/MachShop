/**
 * Webhook Metrics Service
 * Issue #60: Phase 11 - Advanced Monitoring & Observability
 *
 * Tracks and collects metrics for webhook delivery, failures, and performance.
 * Integrates with Prometheus for time-series monitoring.
 */

import { PrismaClient } from '@prisma/client';
import promClient from 'prom-client';
import { logger } from '../../utils/logger';

export const webhookMetrics = {
  // Webhook delivery counters
  deliveryTotal: new promClient.Counter({
    name: 'erp_webhook_delivery_total',
    help: 'Total number of webhook delivery attempts',
    labelNames: ['webhook_id', 'integration_id', 'event_type', 'status'],
  }),

  // Webhook success rate gauge
  deliverySuccessRate: new promClient.Gauge({
    name: 'erp_webhook_delivery_success_rate',
    help: 'Success rate of webhook deliveries (0-1)',
    labelNames: ['webhook_id', 'integration_id'],
  }),

  // Webhook delivery duration histogram
  deliveryDuration: new promClient.Histogram({
    name: 'erp_webhook_delivery_duration_seconds',
    help: 'Duration of webhook delivery attempts in seconds',
    labelNames: ['webhook_id', 'event_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  }),

  // Webhook retry counter
  retryTotal: new promClient.Counter({
    name: 'erp_webhook_retry_total',
    help: 'Total number of webhook retry attempts',
    labelNames: ['webhook_id', 'reason'],
  }),

  // Failed webhooks gauge
  failedWebhooks: new promClient.Gauge({
    name: 'erp_webhook_failed_total',
    help: 'Total number of failed webhook endpoints (consecutive failures >= 10)',
    labelNames: ['integration_id'],
  }),

  // Webhook queue depth gauge
  queueDepth: new promClient.Gauge({
    name: 'erp_webhook_queue_depth',
    help: 'Current depth of pending webhook deliveries',
    labelNames: ['integration_id'],
  }),

  // HTTP status code distribution for webhook responses
  httpStatusCode: new promClient.Counter({
    name: 'erp_webhook_http_status_total',
    help: 'Webhook delivery HTTP response status codes',
    labelNames: ['webhook_id', 'status_code'],
  }),

  // Event emission counter
  eventEmitted: new promClient.Counter({
    name: 'erp_webhook_event_emitted_total',
    help: 'Total number of webhook events emitted',
    labelNames: ['event_type', 'integration_id'],
  }),
};

/**
 * Webhook Metrics Service
 */
export class WebhookMetricsService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Record webhook delivery attempt
   */
  async recordDeliveryAttempt(
    webhookId: string,
    integrationId: string,
    eventType: string,
    status: 'DELIVERED' | 'FAILED' | 'PENDING' | 'RETRYING',
    httpStatusCode?: number,
    duration?: number
  ): Promise<void> {
    try {
      // Record attempt
      webhookMetrics.deliveryTotal.inc({
        webhook_id: webhookId,
        integration_id: integrationId,
        event_type: eventType,
        status,
      });

      // Record HTTP status if provided
      if (httpStatusCode) {
        webhookMetrics.httpStatusCode.inc({
          webhook_id: webhookId,
          status_code: httpStatusCode.toString(),
        });
      }

      // Record duration if provided
      if (duration) {
        webhookMetrics.deliveryDuration.observe(
          { webhook_id: webhookId, event_type: eventType },
          duration / 1000 // Convert to seconds
        );
      }
    } catch (error) {
      logger.warn('Failed to record webhook delivery metric', {
        error: error instanceof Error ? error.message : String(error),
        webhookId,
      });
    }
  }

  /**
   * Record webhook retry
   */
  recordRetry(webhookId: string, reason: string): void {
    try {
      webhookMetrics.retryTotal.inc({ webhook_id: webhookId, reason });
    } catch (error) {
      logger.warn('Failed to record webhook retry metric', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update webhook success rate
   */
  async updateSuccessRate(webhookId: string, integrationId: string): Promise<void> {
    try {
      const [successful, failed] = await Promise.all([
        this.prisma.erpWebhookDelivery.count({
          where: {
            webhookId,
            status: 'DELIVERED',
          },
        }),
        this.prisma.erpWebhookDelivery.count({
          where: {
            webhookId,
            status: 'FAILED',
          },
        }),
      ]);

      const total = successful + failed;
      const successRate = total > 0 ? successful / total : 0;

      webhookMetrics.deliverySuccessRate.set(
        { webhook_id: webhookId, integration_id: integrationId },
        successRate
      );
    } catch (error) {
      logger.warn('Failed to update webhook success rate metric', {
        error: error instanceof Error ? error.message : String(error),
        webhookId,
      });
    }
  }

  /**
   * Update failed webhooks count
   */
  async updateFailedWebhooksCount(integrationId: string): Promise<void> {
    try {
      const failedCount = await this.prisma.erpWebhookEndpoint.count({
        where: {
          integrationId,
          isActive: false,
          failureCount: { gte: 10 },
        },
      });

      webhookMetrics.failedWebhooks.set(
        { integration_id: integrationId },
        failedCount
      );
    } catch (error) {
      logger.warn('Failed to update failed webhooks metric', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
    }
  }

  /**
   * Update webhook queue depth
   */
  async updateQueueDepth(integrationId: string): Promise<void> {
    try {
      const pendingCount = await this.prisma.erpWebhookDelivery.count({
        where: {
          webhook: {
            integrationId,
          },
          status: 'PENDING',
        },
      });

      webhookMetrics.queueDepth.set(
        { integration_id: integrationId },
        pendingCount
      );
    } catch (error) {
      logger.warn('Failed to update webhook queue depth metric', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
    }
  }

  /**
   * Record event emission
   */
  recordEventEmitted(eventType: string, integrationId: string): void {
    try {
      webhookMetrics.eventEmitted.inc({
        event_type: eventType,
        integration_id: integrationId,
      });
    } catch (error) {
      logger.warn('Failed to record event emission metric', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get webhook metrics summary for integration
   */
  async getWebhookMetricsSummary(integrationId: string): Promise<any> {
    try {
      const [webhooks, totalDeliveries, successfulDeliveries, failedDeliveries, pendingDeliveries] =
        await Promise.all([
          this.prisma.erpWebhookEndpoint.findMany({
            where: { integrationId },
          }),
          this.prisma.erpWebhookDelivery.count({
            where: {
              webhook: { integrationId },
            },
          }),
          this.prisma.erpWebhookDelivery.count({
            where: {
              webhook: { integrationId },
              status: 'DELIVERED',
            },
          }),
          this.prisma.erpWebhookDelivery.count({
            where: {
              webhook: { integrationId },
              status: 'FAILED',
            },
          }),
          this.prisma.erpWebhookDelivery.count({
            where: {
              webhook: { integrationId },
              status: 'PENDING',
            },
          }),
        ]);

      const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;
      const activeWebhooks = webhooks.filter((w) => w.isActive).length;
      const disabledWebhooks = webhooks.length - activeWebhooks;

      return {
        integrationId,
        webhooks: {
          total: webhooks.length,
          active: activeWebhooks,
          disabled: disabledWebhooks,
        },
        deliveries: {
          total: totalDeliveries,
          successful: successfulDeliveries,
          failed: failedDeliveries,
          pending: pendingDeliveries,
          successRate: parseFloat(successRate.toFixed(2)),
        },
        avgFailureRate: parseFloat(((failedDeliveries / Math.max(totalDeliveries, 1)) * 100).toFixed(2)),
      };
    } catch (error) {
      logger.error('Failed to get webhook metrics summary', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Get metrics for individual webhook
   */
  async getWebhookMetrics(webhookId: string): Promise<any> {
    try {
      const [webhook, totalDeliveries, successfulDeliveries, failedDeliveries, recentDeliveries] =
        await Promise.all([
          this.prisma.erpWebhookEndpoint.findUnique({
            where: { id: webhookId },
          }),
          this.prisma.erpWebhookDelivery.count({
            where: { webhookId },
          }),
          this.prisma.erpWebhookDelivery.count({
            where: {
              webhookId,
              status: 'DELIVERED',
            },
          }),
          this.prisma.erpWebhookDelivery.count({
            where: {
              webhookId,
              status: 'FAILED',
            },
          }),
          this.prisma.erpWebhookDelivery.findMany({
            where: { webhookId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              status: true,
              httpStatusCode: true,
              lastError: true,
              createdAt: true,
            },
          }),
        ]);

      if (!webhook) {
        throw new Error(`Webhook ${webhookId} not found`);
      }

      const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

      return {
        webhook: {
          id: webhook.id,
          url: webhook.url,
          isActive: webhook.isActive,
          failureCount: webhook.failureCount,
          lastDeliveryAt: webhook.lastDeliveryAt,
        },
        metrics: {
          totalDeliveries,
          successful: successfulDeliveries,
          failed: failedDeliveries,
          successRate: parseFloat(successRate.toFixed(2)),
          recentDeliveries,
        },
      };
    } catch (error) {
      logger.error('Failed to get webhook metrics', {
        error: error instanceof Error ? error.message : String(error),
        webhookId,
      });
      throw error;
    }
  }
}

export default WebhookMetricsService;
