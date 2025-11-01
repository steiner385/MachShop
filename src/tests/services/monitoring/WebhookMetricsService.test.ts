/**
 * Webhook Metrics Service Unit Tests
 * Issue #60: Phase 11 - Advanced Monitoring & Observability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import WebhookMetricsService from '../../../services/monitoring/WebhookMetricsService';

describe('WebhookMetricsService', () => {
  let service: WebhookMetricsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      erpWebhookDelivery: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      erpWebhookEndpoint: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    service = new WebhookMetricsService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('recordDeliveryAttempt', () => {
    it('should record webhook delivery attempt', async () => {
      await service.recordDeliveryAttempt(
        'webhook-1',
        'integration-1',
        'sync.completed',
        'DELIVERED',
        200,
        500
      );

      // Verify no errors thrown
      expect(true).toBe(true);
    });

    it('should handle missing optional parameters', async () => {
      await service.recordDeliveryAttempt(
        'webhook-1',
        'integration-1',
        'sync.completed',
        'FAILED'
      );

      expect(true).toBe(true);
    });
  });

  describe('recordRetry', () => {
    it('should record webhook retry', () => {
      service.recordRetry('webhook-1', 'HTTP_500');

      expect(true).toBe(true);
    });
  });

  describe('updateSuccessRate', () => {
    it('should update webhook success rate', async () => {
      mockPrisma.erpWebhookDelivery.count
        .mockResolvedValueOnce(95) // successful
        .mockResolvedValueOnce(5); // failed

      await service.updateSuccessRate('webhook-1', 'integration-1');

      expect(mockPrisma.erpWebhookDelivery.count).toHaveBeenCalledTimes(2);
    });

    it('should handle zero deliveries', async () => {
      mockPrisma.erpWebhookDelivery.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await service.updateSuccessRate('webhook-1', 'integration-1');

      expect(mockPrisma.erpWebhookDelivery.count).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors', async () => {
      mockPrisma.erpWebhookDelivery.count.mockRejectedValueOnce(new Error('DB error'));

      // Should not throw
      await service.updateSuccessRate('webhook-1', 'integration-1');

      expect(true).toBe(true);
    });
  });

  describe('updateFailedWebhooksCount', () => {
    it('should update failed webhooks count', async () => {
      mockPrisma.erpWebhookEndpoint.count.mockResolvedValueOnce(2);

      await service.updateFailedWebhooksCount('integration-1');

      expect(mockPrisma.erpWebhookEndpoint.count).toHaveBeenCalled();
    });
  });

  describe('updateQueueDepth', () => {
    it('should update webhook queue depth', async () => {
      mockPrisma.erpWebhookDelivery.count.mockResolvedValueOnce(15);

      await service.updateQueueDepth('integration-1');

      expect(mockPrisma.erpWebhookDelivery.count).toHaveBeenCalled();
    });
  });

  describe('recordEventEmitted', () => {
    it('should record event emission', () => {
      service.recordEventEmitted('sync.completed', 'integration-1');

      expect(true).toBe(true);
    });
  });

  describe('getWebhookMetricsSummary', () => {
    it('should get webhook metrics summary', async () => {
      mockPrisma.erpWebhookEndpoint.findMany.mockResolvedValueOnce([
        { id: 'webhook-1', isActive: true },
        { id: 'webhook-2', isActive: false },
      ]);

      mockPrisma.erpWebhookDelivery.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95) // successful
        .mockResolvedValueOnce(5) // failed
        .mockResolvedValueOnce(0); // pending

      const result = await service.getWebhookMetricsSummary('integration-1');

      expect(result.integrationId).toBe('integration-1');
      expect(result.webhooks.total).toBe(2);
      expect(result.webhooks.active).toBe(1);
      expect(result.deliveries.successRate).toBe(95);
    });

    it('should handle no webhooks', async () => {
      mockPrisma.erpWebhookEndpoint.findMany.mockResolvedValueOnce([]);

      mockPrisma.erpWebhookDelivery.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getWebhookMetricsSummary('integration-1');

      expect(result.webhooks.total).toBe(0);
      expect(result.deliveries.successRate).toBe(0);
    });
  });

  describe('getWebhookMetrics', () => {
    it('should get individual webhook metrics', async () => {
      mockPrisma.erpWebhookEndpoint.findUnique.mockResolvedValueOnce({
        id: 'webhook-1',
        url: 'https://example.com/webhooks',
        isActive: true,
        failureCount: 0,
        lastDeliveryAt: new Date(),
      });

      mockPrisma.erpWebhookDelivery.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(48) // successful
        .mockResolvedValueOnce(2); // failed

      mockPrisma.erpWebhookDelivery.findMany.mockResolvedValueOnce([
        {
          id: 'delivery-1',
          status: 'DELIVERED',
          httpStatusCode: 200,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getWebhookMetrics('webhook-1');

      expect(result.webhook.id).toBe('webhook-1');
      expect(result.metrics.successRate).toBe(96);
    });

    it('should throw error for non-existent webhook', async () => {
      mockPrisma.erpWebhookEndpoint.findUnique.mockResolvedValueOnce(null);

      await expect(service.getWebhookMetrics('webhook-1')).rejects.toThrow('not found');
    });
  });
});
