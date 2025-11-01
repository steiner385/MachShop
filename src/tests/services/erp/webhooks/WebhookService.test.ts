/**
 * Webhook Service Unit Tests
 * Issue #60: Phase 9 - Webhook Support for Real-Time Sync Notifications
 *
 * Tests for webhook registration, delivery, retry logic, and signature verification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { WebhookService, WebhookEventType } from '../../../../services/erp/webhooks/WebhookService';
import crypto from 'crypto';

// Mock dependencies
vi.mock('../../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('axios', () => {
  return {
    default: {
      post: vi.fn().mockResolvedValue({ status: 200, data: {} }),
    },
  };
});

describe('WebhookService', () => {
  let service: WebhookService;
  let mockPrisma: any;

  beforeEach(() => {
    // Setup mock Prisma
    mockPrisma = {
      erpIntegration: {
        findUnique: vi.fn(),
      },
      erpWebhookEndpoint: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      erpWebhookEvent: {
        create: vi.fn(),
      },
      erpWebhookDelivery: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new WebhookService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // WEBHOOK REGISTRATION TESTS
  // ========================================

  describe('registerWebhook', () => {
    it('should register a webhook with valid input', async () => {
      const integrationId = 'integration-1';
      const webhookData = {
        url: 'https://example.com/webhooks',
        integrationId,
        eventTypes: [WebhookEventType.SYNC_COMPLETED],
        description: 'Test webhook',
      };

      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce({ id: integrationId });
      mockPrisma.erpWebhookEndpoint.create.mockResolvedValueOnce({
        id: 'webhook-1',
        ...webhookData,
        secret: 'secret123',
        isActive: true,
        failureCount: 0,
        lastDeliveryAt: null,
      });

      const result = await service.registerWebhook(webhookData);

      expect(result).toBeDefined();
      expect(result.url).toBe(webhookData.url);
      expect(result.id).toBe('webhook-1');
      expect(mockPrisma.erpWebhookEndpoint.create).toHaveBeenCalled();
    });

    it('should reject invalid webhook URL in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const webhookData = {
        url: 'http://localhost:3000/webhooks', // HTTP not allowed
        integrationId: 'integration-1',
        eventTypes: [WebhookEventType.SYNC_COMPLETED],
      };

      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce({ id: 'integration-1' });

      await expect(service.registerWebhook(webhookData)).rejects.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should reject non-existent integration', async () => {
      const webhookData = {
        url: 'https://example.com/webhooks',
        integrationId: 'non-existent',
        eventTypes: [WebhookEventType.SYNC_COMPLETED],
      };

      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce(null);

      await expect(service.registerWebhook(webhookData)).rejects.toThrow('Integration not found');
    });

    it('should generate secret if not provided', async () => {
      const integrationId = 'integration-1';
      const webhookData = {
        url: 'https://example.com/webhooks',
        integrationId,
        eventTypes: [WebhookEventType.SYNC_COMPLETED],
      };

      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce({ id: integrationId });
      mockPrisma.erpWebhookEndpoint.create.mockResolvedValueOnce({
        id: 'webhook-1',
        ...webhookData,
        secret: expect.any(String),
        isActive: true,
        failureCount: 0,
      });

      const result = await service.registerWebhook(webhookData);

      expect(result.secret).toBeDefined();
      expect(result.secret.length).toBeGreaterThan(0);
    });
  });

  // ========================================
  // WEBHOOK UPDATE TESTS
  // ========================================

  describe('updateWebhook', () => {
    it('should update webhook with valid data', async () => {
      const webhookId = 'webhook-1';
      const updates = {
        url: 'https://updated.example.com/webhooks',
      };

      mockPrisma.erpWebhookEndpoint.findUnique.mockResolvedValueOnce({ id: webhookId });
      mockPrisma.erpWebhookEndpoint.update.mockResolvedValueOnce({
        id: webhookId,
        ...updates,
      });

      const result = await service.updateWebhook(webhookId, updates);

      expect(result).toBeDefined();
      expect(mockPrisma.erpWebhookEndpoint.update).toHaveBeenCalled();
    });

    it('should reject non-existent webhook', async () => {
      mockPrisma.erpWebhookEndpoint.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateWebhook('non-existent', { url: 'https://example.com' })
      ).rejects.toThrow('Webhook not found');
    });
  });

  // ========================================
  // WEBHOOK DELETION TESTS
  // ========================================

  describe('deleteWebhook', () => {
    it('should delete webhook', async () => {
      const webhookId = 'webhook-1';

      mockPrisma.erpWebhookEndpoint.delete.mockResolvedValueOnce({ id: webhookId });

      await service.deleteWebhook(webhookId);

      expect(mockPrisma.erpWebhookEndpoint.delete).toHaveBeenCalledWith({
        where: { id: webhookId },
      });
    });
  });

  // ========================================
  // WEBHOOK RETRIEVAL TESTS
  // ========================================

  describe('getWebhooks', () => {
    it('should get all webhooks for integration', async () => {
      const integrationId = 'integration-1';
      const webhooks = [
        { id: 'webhook-1', integrationId, url: 'https://example.com/webhooks' },
        { id: 'webhook-2', integrationId, url: 'https://example.org/webhooks' },
      ];

      mockPrisma.erpWebhookEndpoint.findMany.mockResolvedValueOnce(webhooks);

      const result = await service.getWebhooks(integrationId);

      expect(result).toEqual(webhooks);
      expect(result.length).toBe(2);
    });
  });

  // ========================================
  // WEBHOOK TESTING TESTS
  // ========================================

  describe('testWebhook', () => {
    it('should test webhook endpoint', async () => {
      const webhookId = 'webhook-1';
      const webhook = {
        id: webhookId,
        url: 'https://example.com/webhooks',
        integrationId: 'integration-1',
        secret: 'secret123',
        isActive: true,
      };

      mockPrisma.erpWebhookEndpoint.findUnique.mockResolvedValueOnce(webhook);

      const result = await service.testWebhook(webhookId);

      expect(typeof result).toBe('boolean');
    });

    it('should reject non-existent webhook', async () => {
      mockPrisma.erpWebhookEndpoint.findUnique.mockResolvedValueOnce(null);

      await expect(service.testWebhook('non-existent')).rejects.toThrow('Webhook not found');
    });
  });

  // ========================================
  // EVENT EMISSION TESTS
  // ========================================

  describe('emitEvent', () => {
    it('should emit event to matching webhooks', async () => {
      const integrationId = 'integration-1';
      const webhook = {
        id: 'webhook-1',
        integrationId,
        eventTypes: [WebhookEventType.SYNC_COMPLETED],
        url: 'https://example.com/webhooks',
        secret: 'secret123',
        isActive: true,
      };

      mockPrisma.erpWebhookEndpoint.findMany.mockResolvedValueOnce([webhook]);
      mockPrisma.erpWebhookEvent.create.mockResolvedValueOnce({
        eventId: 'evt_123',
        eventType: WebhookEventType.SYNC_COMPLETED,
      });
      mockPrisma.erpWebhookDelivery.create.mockResolvedValueOnce({
        id: 'delivery-1',
        webhookId: 'webhook-1',
        status: 'PENDING',
      });

      await service.emitEvent(
        integrationId,
        WebhookEventType.SYNC_COMPLETED,
        { status: 'success' }
      );

      // Event should be created
      expect(mockPrisma.erpWebhookEvent.create).toHaveBeenCalled();
    });

    it('should not emit to inactive webhooks', async () => {
      const integrationId = 'integration-1';

      mockPrisma.erpWebhookEndpoint.findMany.mockResolvedValueOnce([]);

      await service.emitEvent(integrationId, WebhookEventType.SYNC_COMPLETED, {});

      // No event should be created
      expect(mockPrisma.erpWebhookEvent.create).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // SIGNATURE VERIFICATION TESTS
  // ========================================

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const secret = 'test-secret';
      const payload = JSON.stringify({ test: 'data' });
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const result = WebhookService.verifySignature(secret, payload, signature);

      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const secret = 'test-secret';
      const payload = JSON.stringify({ test: 'data' });
      const invalidSignature = 'invalid-signature';

      expect(() => {
        WebhookService.verifySignature(secret, payload, invalidSignature);
      }).toThrow();
    });
  });

  // ========================================
  // DELIVERY HISTORY TESTS
  // ========================================

  describe('getDeliveryHistory', () => {
    it('should get delivery history for webhook', async () => {
      const webhookId = 'webhook-1';
      const deliveries = [
        { id: 'delivery-1', webhookId, status: 'DELIVERED' },
        { id: 'delivery-2', webhookId, status: 'FAILED' },
      ];

      mockPrisma.erpWebhookDelivery.findMany.mockResolvedValueOnce(deliveries);

      const result = await service.getDeliveryHistory(webhookId);

      expect(result).toEqual(deliveries);
      expect(result.length).toBe(2);
    });
  });

  // ========================================
  // DELIVERY STATISTICS TESTS
  // ========================================

  describe('getDeliveryStats', () => {
    it('should calculate delivery statistics', async () => {
      const webhookId = 'webhook-1';

      mockPrisma.erpWebhookDelivery.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95) // successful
        .mockResolvedValueOnce(5) // failed
        .mockResolvedValueOnce(0); // retrying

      const result = await service.getDeliveryStats(webhookId);

      expect(result.total).toBe(100);
      expect(result.successful).toBe(95);
      expect(result.failed).toBe(5);
      expect(result.retrying).toBe(0);
      expect(result.successRate).toBe('95.00%');
    });

    it('should handle no deliveries', async () => {
      const webhookId = 'webhook-1';

      mockPrisma.erpWebhookDelivery.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getDeliveryStats(webhookId);

      expect(result.total).toBe(0);
      expect(result.successRate).toBe('0%');
    });
  });
});
