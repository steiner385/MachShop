/**
 * Monitoring Controller Unit Tests
 * Issue #60: Phase 11 - Advanced Monitoring & Observability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response } from 'express';
import MonitoringController from '../../controllers/MonitoringController';
import { HealthStatus } from '../../services/monitoring/IntegrationHealthService';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let mockPrisma: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockPrisma = {
      erpIntegration: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'integration-1',
          name: 'Test Integration',
          enabled: true,
          lastSync: new Date(),
        }),
        findMany: vi.fn(),
      },
      erpLog: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      erpWebhookEndpoint: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      erpWebhookDelivery: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      erpReconciliationReport: {
        findMany: vi.fn(),
      },
    };

    controller = new MonitoringController(mockPrisma);

    mockRequest = {
      params: {},
      query: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getHealthStatus', () => {
    it('should get health status for all integrations', async () => {
      mockPrisma.erpIntegration.findMany.mockResolvedValueOnce([
        { id: 'integration-1', name: 'Integration 1', enabled: true, lastSync: new Date() },
      ]);

      mockPrisma.erpLog.count
        .mockResolvedValueOnce(90)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(100);

      mockPrisma.erpWebhookEndpoint.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      mockPrisma.erpWebhookDelivery.count.mockResolvedValueOnce(0);

      await controller.getHealthStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const call = (mockResponse.json as any).mock.calls[0][0];
      expect(call.timestamp).toBeDefined();
      expect(Array.isArray(call.integrations)).toBe(true);
    });

    it('should return 500 on error', async () => {
      mockPrisma.erpIntegration.findMany.mockRejectedValueOnce(new Error('DB error'));

      await controller.getHealthStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'HEALTH_CHECK_FAILED',
        })
      );
    });
  });

  describe('getIntegrationHealth', () => {
    it('should get health for specific integration', async () => {
      mockRequest.params = { integrationId: 'integration-1' };

      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce({
        id: 'integration-1',
        name: 'Test Integration',
        enabled: true,
        lastSync: new Date(),
      });

      mockPrisma.erpLog.count
        .mockResolvedValueOnce(90)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(100);

      mockPrisma.erpWebhookEndpoint.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      mockPrisma.erpWebhookDelivery.count.mockResolvedValueOnce(0);

      await controller.getIntegrationHealth(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const call = (mockResponse.json as any).mock.calls[0][0];
      expect(call.integrationId).toBe('integration-1');
      expect(call.status).toBeDefined();
    });
  });

  describe('getWebhookMetrics', () => {
    it('should get webhook metrics for integration', async () => {
      mockRequest.params = { integrationId: 'integration-1' };

      mockPrisma.erpWebhookEndpoint.findMany.mockResolvedValueOnce([
        { id: 'webhook-1', isActive: true },
        { id: 'webhook-2', isActive: false },
      ]);

      mockPrisma.erpWebhookDelivery.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(95)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      await controller.getWebhookMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const call = (mockResponse.json as any).mock.calls[0][0];
      expect(call.metrics).toBeDefined();
      expect(call.metrics.deliveries.successful).toBe(95);
    });

    it('should return 500 on error', async () => {
      mockRequest.params = { integrationId: 'integration-1' };

      mockPrisma.erpWebhookEndpoint.findMany.mockRejectedValueOnce(new Error('DB error'));

      await controller.getWebhookMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getWebhookDetail', () => {
    it('should get detailed metrics for webhook', async () => {
      mockRequest.params = { webhookId: 'webhook-1' };

      mockPrisma.erpWebhookEndpoint.findUnique.mockResolvedValueOnce({
        id: 'webhook-1',
        url: 'https://example.com',
        isActive: true,
        failureCount: 0,
        lastDeliveryAt: new Date(),
      });

      mockPrisma.erpWebhookDelivery.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(48)
        .mockResolvedValueOnce(2);

      mockPrisma.erpWebhookDelivery.findMany.mockResolvedValueOnce([
        {
          id: 'delivery-1',
          status: 'DELIVERED',
          httpStatusCode: 200,
          createdAt: new Date(),
        },
      ]);

      await controller.getWebhookDetail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const call = (mockResponse.json as any).mock.calls[0][0];
      expect(call.data.webhook.id).toBe('webhook-1');
    });
  });

  describe('getIntegrationSummary', () => {
    it('should get complete integration summary', async () => {
      mockRequest.params = { integrationId: 'integration-1' };

      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce({
        id: 'integration-1',
        name: 'Test Integration',
        enabled: true,
        lastSync: new Date(),
      });

      mockPrisma.erpLog.count
        .mockResolvedValueOnce(96)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(100);

      mockPrisma.erpWebhookEndpoint.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      mockPrisma.erpWebhookDelivery.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(95)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      await controller.getIntegrationSummary(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getSyncMetrics', () => {
    it('should get sync performance metrics', async () => {
      mockRequest.params = { integrationId: 'integration-1' };
      mockRequest.query = { days: '7' };

      mockPrisma.erpLog.findMany.mockResolvedValueOnce([
        {
          id: 'log-1',
          operation: 'SYNC',
          status: 'SUCCESS',
          duration: 5000,
          recordCount: 100,
          successCount: 100,
          errorCount: 0,
          createdAt: new Date(),
        },
      ]);

      await controller.getSyncMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const call = (mockResponse.json as any).mock.calls[0][0];
      expect(call.summary).toBeDefined();
      expect(call.summary.totalSyncs).toBe(1);
      expect(call.summary.successful).toBe(1);
    });

    it('should cap days parameter at 90', async () => {
      mockRequest.params = { integrationId: 'integration-1' };
      mockRequest.query = { days: '180' };

      mockPrisma.erpLog.findMany.mockResolvedValueOnce([]);

      await controller.getSyncMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.erpLog.findMany).toHaveBeenCalled();
      const call = (mockPrisma.erpLog.findMany as any).mock.calls[0][0];
      // Should use 90 days max
      expect(call.where.createdAt.gte).toBeDefined();
    });
  });

  describe('getReconciliationMetrics', () => {
    it('should get reconciliation performance metrics', async () => {
      mockRequest.params = { integrationId: 'integration-1' };
      mockRequest.query = { days: '30' };

      mockPrisma.erpReconciliationReport.findMany.mockResolvedValueOnce([
        {
          id: 'report-1',
          entityType: 'PurchaseOrder',
          status: 'COMPLETED',
          totalRecords: 100,
          matchedRecords: 95,
          discrepancyCount: 5,
          createdAt: new Date(),
        },
      ]);

      await controller.getReconciliationMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const call = (mockResponse.json as any).mock.calls[0][0];
      expect(call.summary).toBeDefined();
      expect(call.summary.totalReports).toBe(1);
      expect(call.summary.totalDiscrepancies).toBe(5);
    });
  });
});
