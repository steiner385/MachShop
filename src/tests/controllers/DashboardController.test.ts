/**
 * Dashboard Controller Unit Tests
 * Issue #60: Phase 16 - Dashboard & Real-time Visualization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import DashboardController from '../../controllers/DashboardController';
import DashboardDataService from '../../services/erp/dashboard/DashboardDataService';
import AlertingService from '../../services/erp/dashboard/AlertingService';
import RealtimeEventService, { EventType } from '../../services/erp/dashboard/RealtimeEventService';

describe('DashboardController', () => {
  let controller: DashboardController;
  let mockDashboardService: any;
  let mockAlertingService: any;
  let mockEventService: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create real service instances (they work with in-memory data)
    mockEventService = new RealtimeEventService();
    mockAlertingService = new AlertingService(mockEventService);
    mockDashboardService = new DashboardDataService(undefined, undefined, undefined, undefined);

    controller = new DashboardController(
      mockDashboardService,
      mockAlertingService,
      mockEventService
    );

    mockRequest = {
      params: {},
      body: {},
      query: {},
      user: { id: 'user-123' },
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('getDashboardSummary', () => {
    it('should return comprehensive dashboard summary', async () => {
      await controller.getDashboardSummary(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.summary).toBeDefined();
      expect(response.summary.metrics).toBeDefined();
      expect(response.summary.activeAlerts).toBeDefined();
      expect(response.summary.recentOperations).toBeDefined();
      expect(response.summary.topIssues).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should include sync status metrics', async () => {
      await controller.getDashboardSummary(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      const metrics = response.summary.metrics;
      expect(metrics.syncStatus).toBeDefined();
      expect(metrics.syncStatus.totalOperations).toBeDefined();
      expect(metrics.syncStatus.successfulOperations).toBeDefined();
      expect(metrics.syncStatus.successRate).toBeDefined();
    });

    it('should include job status metrics', async () => {
      await controller.getDashboardSummary(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      const metrics = response.summary.metrics;
      expect(metrics.jobStatus).toBeDefined();
      expect(metrics.jobStatus.queueLength).toBeDefined();
      expect(metrics.jobStatus.completedJobs).toBeDefined();
      expect(metrics.jobStatus.successRate).toBeDefined();
    });

    it('should include system health status', async () => {
      await controller.getDashboardSummary(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      const metrics = response.summary.metrics;
      expect(metrics.systemHealth).toBeDefined();
      expect(['HEALTHY', 'DEGRADED', 'UNHEALTHY']).toContain(metrics.systemHealth.status);
    });
  });

  describe('getMetrics', () => {
    it('should return real-time metrics', async () => {
      await controller.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.metrics).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should include conflict status metrics', async () => {
      await controller.getMetrics(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      const metrics = response.metrics;
      expect(metrics.conflictStatus).toBeDefined();
      expect(metrics.conflictStatus.totalConflicts).toBeDefined();
      expect(metrics.conflictStatus.unresolvedConflicts).toBeDefined();
      expect(metrics.conflictStatus.resolutionRate).toBeDefined();
    });

    it('should include audit status metrics', async () => {
      await controller.getMetrics(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      const metrics = response.metrics;
      expect(metrics.auditStatus).toBeDefined();
      expect(metrics.auditStatus.totalEvents).toBeDefined();
      expect(metrics.auditStatus.criticalEvents).toBeDefined();
      expect(metrics.auditStatus.eventsByType).toBeDefined();
    });
  });

  describe('getAlerts', () => {
    it('should return list of active alerts', async () => {
      mockRequest.query = { limit: '50', offset: '0' };

      await controller.getAlerts(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.alerts).toBeDefined();
      expect(Array.isArray(response.alerts)).toBe(true);
      expect(response.count).toBeDefined();
      expect(response.total).toBeDefined();
      expect(response.offset).toBe(0);
      expect(response.limit).toBe(50);
    });

    it('should support pagination with limit and offset', async () => {
      mockRequest.query = { limit: '10', offset: '20' };

      await controller.getAlerts(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.limit).toBe(10);
      expect(response.offset).toBe(20);
    });

    it('should default to limit 50 and offset 0', async () => {
      mockRequest.query = {};

      await controller.getAlerts(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.limit).toBe(50);
      expect(response.offset).toBe(0);
    });
  });

  describe('createAlert', () => {
    it('should create an alert', async () => {
      mockRequest.body = {
        severity: 'CRITICAL',
        category: 'SYNC',
        title: 'Sync Failure',
        message: 'High failure rate detected',
        metadata: { errorCount: 5 },
      };

      await controller.createAlert(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.alert).toBeDefined();
      expect(response.alert.severity).toBe('CRITICAL');
      expect(response.alert.category).toBe('SYNC');
    });

    it('should return error for missing required fields', async () => {
      mockRequest.body = {
        severity: 'CRITICAL',
        // Missing category, title, message
      };

      await controller.createAlert(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should include metadata if provided', async () => {
      mockRequest.body = {
        severity: 'WARNING',
        category: 'CONFLICT',
        title: 'Conflicts Detected',
        message: 'Multiple unresolved conflicts',
        metadata: { conflictCount: 3, severity: 'MEDIUM' },
      };

      await controller.createAlert(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.alert.metadata).toBeDefined();
      expect(response.alert.metadata.conflictCount).toBe(3);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', async () => {
      // First create an alert
      mockRequest.body = {
        severity: 'INFO',
        category: 'JOB',
        title: 'Job Completed',
        message: 'Batch job completed successfully',
      };

      await controller.createAlert(mockRequest as Request, mockResponse as Response);
      const createdAlert = (mockResponse.json as any).mock.calls[0][0].alert;

      // Now resolve it
      vi.clearAllMocks();
      mockRequest.params = { alertId: createdAlert.id };

      await controller.resolveAlert(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.alert).toBeDefined();
      expect(response.alert.resolved).toBe(true);
      expect(response.alert.resolvedAt).toBeDefined();
    });

    it('should return 404 for non-existent alert', async () => {
      mockRequest.params = { alertId: 'non-existent' };

      await controller.resolveAlert(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should return error for missing alertId', async () => {
      mockRequest.params = {};

      await controller.resolveAlert(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getEventHistory', () => {
    it('should return event history', async () => {
      mockRequest.query = { limit: '50', offset: '0' };

      await controller.getEventHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.events).toBeDefined();
      expect(Array.isArray(response.events)).toBe(true);
      expect(response.count).toBeDefined();
      expect(response.total).toBeDefined();
    });

    it('should support filtering by eventType', async () => {
      mockRequest.query = {
        limit: '50',
        offset: '0',
        eventType: EventType.SYNC_COMPLETED,
      };

      await controller.getEventHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.events).toBeDefined();
    });

    it('should support filtering by source', async () => {
      mockRequest.query = {
        limit: '50',
        offset: '0',
        source: 'SyncService',
      };

      await controller.getEventHistory(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should support pagination', async () => {
      mockRequest.query = { limit: '10', offset: '20' };

      await controller.getEventHistory(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.limit).toBe(10);
      expect(response.offset).toBe(20);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics', async () => {
      await controller.getPerformanceMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.performanceMetrics).toBeDefined();
      expect(response.performanceMetrics.syncThroughput).toBeDefined();
      expect(response.performanceMetrics.avgSyncTime).toBeDefined();
      expect(response.performanceMetrics.jobProcessingRate).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should include conflict resolution time', async () => {
      await controller.getPerformanceMetrics(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.performanceMetrics.conflictResolutionTime).toBeDefined();
    });
  });

  describe('getAlertingRules', () => {
    it('should return active alerting rules', async () => {
      await controller.getAlertingRules(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.rules).toBeDefined();
      expect(Array.isArray(response.rules)).toBe(true);
      expect(response.count).toBeDefined();
    });

    it('should include default alert rules', async () => {
      await controller.getAlertingRules(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.rules.length).toBeGreaterThan(0);
      expect(response.rules[0].id).toBeDefined();
      expect(response.rules[0].name).toBeDefined();
      expect(response.rules[0].enabled).toBeDefined();
    });
  });

  describe('getEventStatistics', () => {
    it('should return event statistics', async () => {
      await controller.getEventStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.statistics).toBeDefined();
      expect(response.statistics.totalEvents).toBeDefined();
      expect(response.statistics.eventsByType).toBeDefined();
      expect(response.statistics.eventsBySource).toBeDefined();
      expect(response.statistics.subscriberCount).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should break down events by type', async () => {
      await controller.getEventStatistics(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(typeof response.statistics.eventsByType).toBe('object');
    });

    it('should break down events by source', async () => {
      await controller.getEventStatistics(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(typeof response.statistics.eventsBySource).toBe('object');
    });
  });

  describe('getNotificationStatistics', () => {
    it('should return notification statistics', async () => {
      await controller.getNotificationStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.statistics).toBeDefined();
      expect(response.statistics.totalNotifications).toBeDefined();
      expect(response.statistics.sentNotifications).toBeDefined();
      expect(response.statistics.failedNotifications).toBeDefined();
      expect(response.statistics.notificationsByChannel).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should break down notifications by channel', async () => {
      await controller.getNotificationStatistics(mockRequest as Request, mockResponse as Response);

      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(typeof response.statistics.notificationsByChannel).toBe('object');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in getDashboardSummary', async () => {
      const mockFailingService = {
        getDashboardSummary: vi.fn().mockRejectedValue(new Error('Database error')),
      };

      const failingController = new DashboardController(mockFailingService as any);

      await failingController.getDashboardSummary(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.error).toBeDefined();
    });

    it('should handle errors in getMetrics', async () => {
      const mockFailingService = {
        getMetrics: vi.fn().mockRejectedValue(new Error('Service error')),
      };

      const failingController = new DashboardController(mockFailingService as any);

      await failingController.getMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle errors in createAlert', async () => {
      mockRequest.body = {
        severity: 'CRITICAL',
        category: 'SYNC',
        title: 'Test',
        message: 'Test message',
      };

      const mockFailingService = {
        createAlert: vi.fn().mockRejectedValue(new Error('Creation error')),
      };

      const failingController = new DashboardController(mockFailingService as any);

      await failingController.createAlert(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
