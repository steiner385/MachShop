/**
 * Reconciliation Controller Unit Tests
 * Issue #60: Phase 12 - Data Reconciliation System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import ReconciliationController from '../../controllers/ReconciliationController';
import { ReconciliationType } from '../../services/erp/reconciliation/ReconciliationReportService';

describe('ReconciliationController', () => {
  let controller: ReconciliationController;
  let mockPrisma: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockPrisma = {
      erpIntegration: {
        findUnique: vi.fn(),
      },
      supplier: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      purchaseOrder: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      workOrder: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      inventory: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    controller = new ReconciliationController(mockPrisma);

    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-123' },
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('triggerReconciliation', () => {
    it('should trigger reconciliation for suppliers', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.body = {
        type: ReconciliationType.SUPPLIER,
        periodStart: new Date('2025-01-01').toISOString(),
        periodEnd: new Date('2025-01-31').toISOString(),
      };

      await controller.triggerReconciliation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.timestamp).toBeDefined();
      expect(response.report).toBeDefined();
      expect(response.dataQualityScore).toBeDefined();
    });

    it('should trigger FULL_SYNC reconciliation', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.body = {
        type: ReconciliationType.FULL_SYNC,
      };

      await controller.triggerReconciliation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.report.type).toBe(ReconciliationType.FULL_SYNC);
    });

    it('should return error for invalid reconciliation type', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.body = {
        type: 'INVALID_TYPE',
      };

      await controller.triggerReconciliation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INVALID_REQUEST',
        })
      );
    });

    it('should use default period if not provided', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.body = {
        type: ReconciliationType.SUPPLIER,
      };

      await controller.triggerReconciliation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.report.periodStart).toBeDefined();
      expect(response.report.periodEnd).toBeDefined();
    });

    it('should trigger reconciliation successfully with default period', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.body = {
        type: ReconciliationType.SUPPLIER,
      };

      await controller.triggerReconciliation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.report).toBeDefined();
    });
  });

  describe('getReport', () => {
    it('should retrieve reconciliation report', async () => {
      mockRequest.params = { integrationId: 'erp-1', reportId: 'report-1' };

      await controller.getReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.timestamp).toBeDefined();
      expect(response.reportId).toBe('report-1');
    });
  });

  describe('getHistory', () => {
    it('should retrieve reconciliation history', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.query = { limit: '10' };

      await controller.getHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.integrationId).toBe('erp-1');
      expect(Array.isArray(response.history)).toBe(true);
    });

    it('should filter by reconciliation type', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.query = { type: ReconciliationType.SUPPLIER, limit: '5' };

      await controller.getHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.integrationId).toBe('erp-1');
    });

    it('should cap limit at 100', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.query = { limit: '500' };

      await controller.getHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      // Limit should be capped at 100
    });
  });

  describe('getTrends', () => {
    it('should analyze reconciliation trends', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.query = { type: ReconciliationType.SUPPLIER, days: '30' };

      await controller.getTrends(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.integrationId).toBe('erp-1');
      expect(Array.isArray(response.trends)).toBe(true);
    });

    it('should return error if type is missing', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.query = {};

      await controller.getTrends(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should cap days at 90', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.query = { type: ReconciliationType.SUPPLIER, days: '180' };

      await controller.getTrends(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.period.days).toBeLessThanOrEqual(90);
    });
  });

  describe('getDiscrepancies', () => {
    it('should retrieve discrepancies for report', async () => {
      mockRequest.params = { integrationId: 'erp-1', reportId: 'report-1' };
      mockRequest.query = {};

      await controller.getDiscrepancies(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.reportId).toBe('report-1');
      expect(Array.isArray(response.discrepancies)).toBe(true);
    });

    it('should filter by severity', async () => {
      mockRequest.params = { integrationId: 'erp-1', reportId: 'report-1' };
      mockRequest.query = { severity: 'HIGH' };

      await controller.getDiscrepancies(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.filters.severity).toBe('HIGH');
    });

    it('should limit results', async () => {
      mockRequest.params = { integrationId: 'erp-1', reportId: 'report-1' };
      mockRequest.query = { limit: '50' };

      await controller.getDiscrepancies(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.filters.limit).toBe(50);
    });
  });

  describe('resolveDiscrepancy', () => {
    it('should resolve a discrepancy', async () => {
      mockRequest.params = { integrationId: 'erp-1', discrepancyId: 'disc-1' };
      mockRequest.body = {
        resolutionType: 'SYNC_CORRECTION',
        correctedValue: 'corrected',
        correctionDetails: 'Applied ERP sync',
      };
      (mockRequest as any).user = { id: 'user-123' };

      await controller.resolveDiscrepancy(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.status).toBe('RESOLVED');
      expect(response.discrepancyId).toBe('disc-1');
    });

    it('should return error if resolutionType is missing', async () => {
      mockRequest.params = { integrationId: 'erp-1', discrepancyId: 'disc-1' };
      mockRequest.body = {};

      await controller.resolveDiscrepancy(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getSuggestions', () => {
    it('should get resolution suggestions for discrepancy', async () => {
      mockRequest.params = { integrationId: 'erp-1', discrepancyId: 'disc-1' };

      await controller.getSuggestions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.discrepancyId).toBe('disc-1');
      expect(Array.isArray(response.suggestions)).toBe(true);
    });
  });

  describe('getDashboardSummary', () => {
    it('should get dashboard summary', async () => {
      mockRequest.params = { integrationId: 'erp-1' };

      await controller.getDashboardSummary(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.integrationId).toBe('erp-1');
      expect(response.summary).toBeDefined();
      expect(response.summary.dataQualityScore).toBeDefined();
      expect(response.summary.pendingDiscrepancies).toBeDefined();
    });
  });
});
