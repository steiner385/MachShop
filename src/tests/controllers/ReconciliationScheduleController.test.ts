/**
 * Reconciliation Schedule Controller Unit Tests
 * Issue #60: Phase 13 - Scheduled Reconciliation Jobs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import ReconciliationScheduleController from '../../controllers/ReconciliationScheduleController';
import { ScheduleFrequency } from '../../services/erp/reconciliation/ReconciliationScheduler';

describe('ReconciliationScheduleController', () => {
  let controller: ReconciliationScheduleController;
  let mockPrisma: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockPrisma = {
      erpIntegration: {
        findUnique: vi.fn(),
      },
    };

    controller = new ReconciliationScheduleController(mockPrisma);

    mockRequest = {
      params: {},
      body: {},
      user: { id: 'user-123' },
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('createSchedule', () => {
    it('should create a reconciliation schedule', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.body = {
        entityTypes: ['Supplier', 'PurchaseOrder'],
        frequency: ScheduleFrequency.DAILY,
      };

      await controller.createSchedule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.schedule).toBeDefined();
      expect(response.schedule.integrationId).toBe('erp-1');
    });

    it('should create schedule with custom options', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.body = {
        entityTypes: ['Supplier'],
        frequency: ScheduleFrequency.WEEKLY,
        maxConcurrentJobs: 5,
        timeout: 60000,
        retryAttempts: 5,
      };

      await controller.createSchedule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.schedule.maxConcurrentJobs).toBe(5);
      expect(response.schedule.timeout).toBe(60000);
      expect(response.schedule.retryAttempts).toBe(5);
    });

    it('should return error for missing entityTypes', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.body = {
        frequency: ScheduleFrequency.DAILY,
      };

      await controller.createSchedule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INVALID_REQUEST',
        })
      );
    });

    it('should return error for invalid frequency', async () => {
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.body = {
        entityTypes: ['Supplier'],
        frequency: 'INVALID_FREQUENCY',
      };

      await controller.createSchedule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INVALID_REQUEST',
        })
      );
    });
  });

  describe('getSchedule', () => {
    it('should return 404 for non-existent schedule', async () => {
      mockRequest.params = { scheduleId: 'non-existent' };

      await controller.getSchedule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'NOT_FOUND',
        })
      );
    });
  });

  describe('listSchedules', () => {
    it('should list schedules for integration', async () => {
      mockRequest.params = { integrationId: 'erp-1' };

      await controller.listSchedules(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.integrationId).toBe('erp-1');
      expect(response.count).toBeDefined();
      expect(Array.isArray(response.schedules)).toBe(true);
    });
  });

  describe('updateSchedule', () => {
    it('should handle update errors gracefully', async () => {
      mockRequest.params = { scheduleId: 'non-existent' };
      mockRequest.body = { isEnabled: false };

      await controller.updateSchedule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteSchedule', () => {
    it('should delete a schedule successfully', async () => {
      mockRequest.params = { scheduleId: 'sched-1' };

      await controller.deleteSchedule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.message).toContain('deleted');
    });
  });

  describe('enableSchedule', () => {
    it('should handle enable errors gracefully', async () => {
      mockRequest.params = { scheduleId: 'non-existent' };

      await controller.enableSchedule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('disableSchedule', () => {
    it('should handle disable errors gracefully', async () => {
      mockRequest.params = { scheduleId: 'non-existent' };

      await controller.disableSchedule(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('triggerScheduleNow', () => {
    it('should handle trigger errors gracefully', async () => {
      mockRequest.params = { scheduleId: 'non-existent' };

      await controller.triggerScheduleNow(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getActiveJobs', () => {
    it('should list active jobs for schedule', async () => {
      mockRequest.params = { scheduleId: 'sched-1' };

      await controller.getActiveJobs(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.scheduleId).toBe('sched-1');
      expect(response.count).toBeDefined();
      expect(Array.isArray(response.jobs)).toBe(true);
    });
  });

  describe('getJobStatus', () => {
    it('should get status of a job', async () => {
      // First create a schedule and start a job
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.body = {
        entityTypes: ['Supplier'],
        frequency: ScheduleFrequency.DAILY,
      };

      await controller.createSchedule(mockRequest as Request, mockResponse as Response);
      const scheduleResponse = (mockResponse.json as any).mock.calls[0][0];
      const scheduleId = scheduleResponse.schedule.id;

      // Reset mocks and trigger the schedule to create a job
      vi.clearAllMocks();
      mockRequest.params = { scheduleId };

      await controller.triggerScheduleNow(mockRequest as Request, mockResponse as Response);
      const jobResponse = (mockResponse.json as any).mock.calls[0][0];
      const jobId = jobResponse.job.id;

      // Now get the job status
      vi.clearAllMocks();
      mockRequest.params = { jobId };

      await controller.getJobStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.job).toBeDefined();
      expect(response.job.id).toBe(jobId);
    });
  });

  describe('getScheduleStats', () => {
    it('should get schedule statistics', async () => {
      // First create a schedule
      mockRequest.params = { integrationId: 'erp-1' };
      mockRequest.body = {
        entityTypes: ['Supplier'],
        frequency: ScheduleFrequency.DAILY,
      };

      await controller.createSchedule(mockRequest as Request, mockResponse as Response);
      const scheduleResponse = (mockResponse.json as any).mock.calls[0][0];
      const scheduleId = scheduleResponse.schedule.id;

      // Now get the schedule stats
      vi.clearAllMocks();
      mockRequest.params = { scheduleId };

      await controller.getScheduleStats(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const response = (mockResponse.json as any).mock.calls[0][0];
      expect(response.stats).toBeDefined();
      expect(response.stats.scheduleId).toBe(scheduleId);
      expect(response.stats.totalRuns).toBeDefined();
    });
  });
});
