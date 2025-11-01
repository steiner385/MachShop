/**
 * Audit Trail Controller Unit Tests
 * Issue #60: Phase 14 - Audit Trail & Change History
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import AuditTrailController from '../../controllers/AuditTrailController';

describe('AuditTrailController', () => {
  let controller: AuditTrailController;
  let mockPrisma: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockPrisma = {
      erpIntegration: {
        findUnique: vi.fn(),
      },
    };

    controller = new AuditTrailController(mockPrisma);

    mockRequest = {
      params: {},
      query: {},
      user: { id: 'user-123' },
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  describe('getAuditEvents', () => {
    it('should get audit events', async () => {
      mockRequest.query = {
        limit: '50',
        offset: '0',
      };

      await controller.getAuditEvents(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.events).toBeDefined();
      expect(Array.isArray(response.events)).toBe(true);
      expect(response.count).toBeDefined();
      expect(response.total).toBeDefined();
    });

    it('should filter by userId', async () => {
      mockRequest.query = {
        userId: 'user-1',
        limit: '50',
        offset: '0',
      };

      await controller.getAuditEvents(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.events).toBeDefined();
    });

    it('should filter by integrationId', async () => {
      mockRequest.query = {
        integrationId: 'erp-1',
        limit: '50',
        offset: '0',
      };

      await controller.getAuditEvents(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.events).toBeDefined();
    });
  });

  describe('getEntityHistory', () => {
    it('should get entity history', async () => {
      mockRequest.params = { entityType: 'Schedule', entityId: 'sched-1' };

      await controller.getEntityHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.entityType).toBe('Schedule');
      expect(response.entityId).toBe('sched-1');
      expect(response.events).toBeDefined();
    });

    it('should return error for missing entityType', async () => {
      mockRequest.params = { entityId: 'sched-1' };

      await controller.getEntityHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should return error for missing entityId', async () => {
      mockRequest.params = { entityType: 'Schedule' };

      await controller.getEntityHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getUserActivity', () => {
    it('should get user activity', async () => {
      mockRequest.params = { userId: 'user-1' };

      await controller.getUserActivity(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.userId).toBe('user-1');
      expect(response.events).toBeDefined();
    });

    it('should return error for missing userId', async () => {
      mockRequest.params = {};

      await controller.getUserActivity(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCriticalEvents', () => {
    it('should get critical events', async () => {
      mockRequest.query = { limit: '100' };

      await controller.getCriticalEvents(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.events).toBeDefined();
      expect(Array.isArray(response.events)).toBe(true);
    });

    it('should filter by integrationId', async () => {
      mockRequest.query = { integrationId: 'erp-1', limit: '100' };

      await controller.getCriticalEvents(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getAuditStatistics', () => {
    it('should get audit statistics', async () => {
      mockRequest.query = {};

      await controller.getAuditStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.stats).toBeDefined();
      expect(response.stats.totalEvents).toBeDefined();
      expect(response.stats.successfulEvents).toBeDefined();
      expect(response.stats.failedEvents).toBeDefined();
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate compliance report', async () => {
      mockRequest.query = {};

      await controller.generateComplianceReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.report).toBeDefined();
      expect(response.report.reportId).toBeDefined();
      expect(response.report.summary).toBeDefined();
      expect(response.report.summary.totalOperations).toBeDefined();
      expect(response.report.recommendations).toBeDefined();
    });

    it('should filter by integrationId', async () => {
      mockRequest.query = { integrationId: 'erp-1' };

      await controller.generateComplianceReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.report).toBeDefined();
    });
  });

  describe('getChangeSummary', () => {
    it('should return 404 when no changes exist', async () => {
      mockRequest.params = { entityType: 'Schedule', entityId: 'sched-1' };

      await controller.getChangeSummary(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 for non-existent entity changes', async () => {
      mockRequest.params = { entityType: 'Schedule', entityId: 'non-existent' };

      await controller.getChangeSummary(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return error for missing entityType', async () => {
      mockRequest.params = { entityId: 'sched-1' };

      await controller.getChangeSummary(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getEntityTimeline', () => {
    it('should get entity timeline', async () => {
      mockRequest.params = { entityType: 'Schedule', entityId: 'sched-1' };
      mockRequest.query = { limit: '100' };

      await controller.getEntityTimeline(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.timeline).toBeDefined();
      expect(Array.isArray(response.timeline)).toBe(true);
    });
  });

  describe('getChangeStatistics', () => {
    it('should get change statistics', async () => {
      mockRequest.query = {};

      await controller.getChangeStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.stats).toBeDefined();
      expect(response.stats.totalChanges).toBeDefined();
      expect(response.stats.changesByType).toBeDefined();
      expect(response.stats.uniqueUsers).toBeDefined();
    });

    it('should filter by entityType', async () => {
      mockRequest.query = { entityType: 'Schedule' };

      await controller.getChangeStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getChangeImpactAnalysis', () => {
    it('should get change impact analysis', async () => {
      mockRequest.query = {};

      await controller.getChangeImpactAnalysis(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.analysis).toBeDefined();
      expect(response.analysis.highImpactChanges).toBeDefined();
      expect(response.analysis.affectedEntities).toBeDefined();
      expect(response.analysis.potentialIssues).toBeDefined();
    });
  });

  describe('exportChangesCSV', () => {
    it('should export changes as CSV', async () => {
      mockRequest.query = {};

      await controller.exportChangesCSV(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalled();
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should set correct CSV headers', async () => {
      mockRequest.query = {};

      await controller.exportChangesCSV(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        expect.stringContaining('Content-Disposition'),
        expect.stringContaining('changes-')
      );
    });
  });
});
