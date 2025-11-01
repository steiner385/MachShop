/**
 * Webhook Controller Unit Tests
 * Issue #60: Phase 9 - Webhook Support for Real-Time Sync Notifications
 *
 * Tests webhook registration, management, delivery tracking, and event type retrieval
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response } from 'express';
import WebhookController from '../../controllers/WebhookController';
import { WebhookEventType } from '../../services/erp/webhooks/WebhookService';

describe('WebhookController', () => {
  let controller: WebhookController;
  let mockPrisma: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: any;

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

    controller = new WebhookController(mockPrisma);

    // Setup mock request and response
    mockRequest = {
      params: {},
      body: {},
      query: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // CREATE WEBHOOK TESTS
  // ========================================

  describe('createWebhook', () => {
    it('should create webhook with valid input', async () => {
      mockRequest.params = { integrationId: 'integration-1' };
      mockRequest.body = {
        url: 'https://example.com/webhooks',
        eventTypes: [WebhookEventType.SYNC_COMPLETED],
        description: 'Test webhook',
      };

      // Mock the integration exists
      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce({
        id: 'integration-1',
      });

      mockPrisma.erpWebhookEndpoint.create.mockResolvedValueOnce({
        id: 'webhook-1',
        ...mockRequest.body,
        secret: 'secret123',
        isActive: true,
        failureCount: 0,
      });

      await controller.createWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Webhook registered successfully',
          webhook: expect.any(Object),
        })
      );
    });

    it('should return 400 when URL is missing', async () => {
      mockRequest.params = { integrationId: 'integration-1' };
      mockRequest.body = {
        eventTypes: [WebhookEventType.SYNC_COMPLETED],
      };

      await controller.createWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: expect.stringContaining('url'),
        })
      );
    });

    it('should return 400 when eventTypes is not array', async () => {
      mockRequest.params = { integrationId: 'integration-1' };
      mockRequest.body = {
        url: 'https://example.com/webhooks',
        eventTypes: 'not-an-array',
      };

      await controller.createWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
        })
      );
    });

    it('should return 400 when eventTypes is empty array', async () => {
      mockRequest.params = { integrationId: 'integration-1' };
      mockRequest.body = {
        url: 'https://example.com/webhooks',
        eventTypes: [],
      };

      await controller.createWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: expect.stringContaining('At least one event type'),
        })
      );
    });

    it('should return 400 when event types are invalid', async () => {
      mockRequest.params = { integrationId: 'integration-1' };
      mockRequest.body = {
        url: 'https://example.com/webhooks',
        eventTypes: ['invalid.event.type'],
      };

      await controller.createWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'Invalid event types',
        })
      );
    });

    it('should return 500 on service error', async () => {
      mockRequest.params = { integrationId: 'integration-1' };
      mockRequest.body = {
        url: 'https://example.com/webhooks',
        eventTypes: [WebhookEventType.SYNC_COMPLETED],
      };

      mockPrisma.erpWebhookEndpoint.create.mockRejectedValueOnce(new Error('Database error'));

      await controller.createWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'WEBHOOK_CREATION_FAILED',
        })
      );
    });
  });

  // ========================================
  // UPDATE WEBHOOK TESTS
  // ========================================

  describe('updateWebhook', () => {
    it('should update webhook with valid data', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };
      mockRequest.body = {
        url: 'https://updated.example.com/webhooks',
      };

      mockPrisma.erpWebhookEndpoint.findUnique.mockResolvedValueOnce({ id: 'webhook-1' });
      mockPrisma.erpWebhookEndpoint.update.mockResolvedValueOnce({
        id: 'webhook-1',
        ...mockRequest.body,
      });

      await controller.updateWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Webhook updated successfully',
          webhook: expect.any(Object),
        })
      );
    });

    it('should return 400 when no fields to update', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };
      mockRequest.body = {};

      await controller.updateWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'No fields to update',
        })
      );
    });

    it('should validate event types when updating', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };
      mockRequest.body = {
        eventTypes: ['invalid.type'],
      };

      await controller.updateWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'Invalid event types',
        })
      );
    });

    it('should return 500 on service error', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };
      mockRequest.body = { url: 'https://example.com' };

      mockPrisma.erpWebhookEndpoint.update.mockRejectedValueOnce(new Error('Database error'));

      await controller.updateWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'WEBHOOK_UPDATE_FAILED',
        })
      );
    });
  });

  // ========================================
  // DELETE WEBHOOK TESTS
  // ========================================

  describe('deleteWebhook', () => {
    it('should delete webhook', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };

      mockPrisma.erpWebhookEndpoint.delete.mockResolvedValueOnce({ id: 'webhook-1' });

      await controller.deleteWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Webhook deleted successfully',
      });
    });

    it('should return 500 on service error', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };

      mockPrisma.erpWebhookEndpoint.delete.mockRejectedValueOnce(new Error('Database error'));

      await controller.deleteWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'WEBHOOK_DELETION_FAILED',
        })
      );
    });
  });

  // ========================================
  // GET WEBHOOKS TESTS
  // ========================================

  describe('getWebhooks', () => {
    it('should get all webhooks for integration', async () => {
      mockRequest.params = { integrationId: 'integration-1' };

      const webhooks = [
        { id: 'webhook-1', integrationId: 'integration-1', url: 'https://example.com/webhooks' },
        { id: 'webhook-2', integrationId: 'integration-1', url: 'https://example.org/webhooks' },
      ];

      mockPrisma.erpWebhookEndpoint.findMany.mockResolvedValueOnce(webhooks);

      await controller.getWebhooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        webhooks,
        count: 2,
      });
    });

    it('should return empty array when no webhooks exist', async () => {
      mockRequest.params = { integrationId: 'integration-1' };

      mockPrisma.erpWebhookEndpoint.findMany.mockResolvedValueOnce([]);

      await controller.getWebhooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        webhooks: [],
        count: 0,
      });
    });

    it('should return 500 on service error', async () => {
      mockRequest.params = { integrationId: 'integration-1' };

      mockPrisma.erpWebhookEndpoint.findMany.mockRejectedValueOnce(new Error('Database error'));

      await controller.getWebhooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'WEBHOOK_FETCH_FAILED',
        })
      );
    });
  });

  // ========================================
  // TEST WEBHOOK TESTS
  // ========================================

  describe('testWebhook', () => {
    it('should test webhook and return success', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };

      mockPrisma.erpWebhookEndpoint.findUnique.mockResolvedValueOnce({
        id: 'webhook-1',
        url: 'https://example.com/webhooks',
        integrationId: 'integration-1',
        secret: 'secret123',
        isActive: true,
      });

      await controller.testWebhook(mockRequest as Request, mockResponse as Response);

      // The response should indicate webhook test was called
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return 500 on service error', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };

      mockPrisma.erpWebhookEndpoint.findUnique.mockRejectedValueOnce(new Error('Database error'));

      await controller.testWebhook(mockRequest as Request, mockResponse as Response);

      // Verify error handling
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'WEBHOOK_TEST_FAILED',
        })
      );
    });
  });

  // ========================================
  // DELIVERY HISTORY TESTS
  // ========================================

  describe('getDeliveryHistory', () => {
    it('should get delivery history for webhook', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };
      mockRequest.query = { limit: '50' };

      const deliveries = [
        { id: 'delivery-1', webhookId: 'webhook-1', status: 'DELIVERED' },
        { id: 'delivery-2', webhookId: 'webhook-1', status: 'FAILED' },
      ];

      mockPrisma.erpWebhookDelivery.findMany.mockResolvedValueOnce(deliveries);

      await controller.getDeliveryHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        deliveries,
        count: 2,
      });
    });

    it('should use default limit when not provided', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };
      mockRequest.query = {};

      mockPrisma.erpWebhookDelivery.findMany.mockResolvedValueOnce([]);

      await controller.getDeliveryHistory(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.erpWebhookDelivery.findMany).toHaveBeenCalled();
    });

    it('should return 500 on service error', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };
      mockRequest.query = {};

      mockPrisma.erpWebhookDelivery.findMany.mockRejectedValueOnce(new Error('Database error'));

      await controller.getDeliveryHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'DELIVERY_HISTORY_FETCH_FAILED',
        })
      );
    });
  });

  // ========================================
  // DELIVERY STATISTICS TESTS
  // ========================================

  describe('getDeliveryStats', () => {
    it('should get delivery statistics', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };

      mockPrisma.erpWebhookDelivery.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95) // successful
        .mockResolvedValueOnce(5); // failed

      await controller.getDeliveryStats(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stats: expect.any(Object),
        })
      );
    });

    it('should return 500 on service error', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };

      mockPrisma.erpWebhookDelivery.count.mockRejectedValueOnce(new Error('Database error'));

      await controller.getDeliveryStats(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'DELIVERY_STATS_FETCH_FAILED',
        })
      );
    });
  });

  // ========================================
  // EVENT TYPES TESTS
  // ========================================

  describe('getEventTypes', () => {
    it('should get available event types', async () => {
      await controller.getEventTypes(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          eventTypes: expect.any(Array),
          count: expect.any(Number),
        })
      );
    });

    it('should include all webhook event types', async () => {
      await controller.getEventTypes(mockRequest as Request, mockResponse as Response);

      const call = (mockResponse.json as any).mock.calls[0][0];
      expect(call.eventTypes).toContain(WebhookEventType.SYNC_COMPLETED);
      expect(call.eventTypes).toContain(WebhookEventType.SYNC_FAILED);
      expect(call.eventTypes).toContain(WebhookEventType.RECONCILIATION_COMPLETED);
    });
  });
});
