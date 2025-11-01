/**
 * Reconciliation Scheduler Unit Tests
 * Issue #60: Phase 13 - Scheduled Reconciliation Jobs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReconciliationScheduler, {
  ScheduleFrequency,
  JobStatus,
} from '../../../../services/erp/reconciliation/ReconciliationScheduler';

describe('ReconciliationScheduler', () => {
  let scheduler: ReconciliationScheduler;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      erpIntegration: {
        findUnique: vi.fn(),
      },
    };

    scheduler = new ReconciliationScheduler(mockPrisma);
  });

  describe('createSchedule', () => {
    it('should create a daily reconciliation schedule', async () => {
      const schedule = await scheduler.createSchedule(
        'erp-1',
        ['Supplier', 'PurchaseOrder'],
        ScheduleFrequency.DAILY
      );

      expect(schedule.id).toBeDefined();
      expect(schedule.integrationId).toBe('erp-1');
      expect(schedule.frequency).toBe(ScheduleFrequency.DAILY);
      expect(schedule.entityTypes).toEqual(['Supplier', 'PurchaseOrder']);
      expect(schedule.isEnabled).toBe(true);
      expect(schedule.maxConcurrentJobs).toBe(1);
      expect(schedule.retryAttempts).toBe(3);
    });

    it('should create a custom schedule with cron expression', async () => {
      const schedule = await scheduler.createSchedule(
        'erp-1',
        ['Inventory'],
        ScheduleFrequency.CUSTOM,
        '0 2 * * *' // 2 AM daily
      );

      expect(schedule.frequency).toBe(ScheduleFrequency.CUSTOM);
      expect(schedule.cronExpression).toBe('0 2 * * *');
    });

    it('should validate cron expression for custom frequency', async () => {
      try {
        await scheduler.createSchedule(
          'erp-1',
          ['Supplier'],
          ScheduleFrequency.CUSTOM
          // Missing cronExpression
        );
        expect(true).toBe(false); // Should throw
      } catch (error) {
        expect((error as Error).message).toContain('cronExpression required');
      }
    });

    it('should set custom options', async () => {
      const schedule = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.WEEKLY,
        undefined,
        {
          maxConcurrentJobs: 5,
          timeout: 60000,
          retryAttempts: 5,
        }
      );

      expect(schedule.maxConcurrentJobs).toBe(5);
      expect(schedule.timeout).toBe(60000);
      expect(schedule.retryAttempts).toBe(5);
    });
  });

  describe('getSchedule', () => {
    it('should retrieve a schedule by ID', async () => {
      const created = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.DAILY
      );

      const retrieved = await scheduler.getSchedule(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent schedule', async () => {
      const retrieved = await scheduler.getSchedule('non-existent');

      expect(retrieved).toBeNull();
    });
  });

  describe('getSchedules', () => {
    it('should list all schedules for integration', async () => {
      await scheduler.createSchedule('erp-1', ['Supplier'], ScheduleFrequency.DAILY);
      await scheduler.createSchedule('erp-1', ['PurchaseOrder'], ScheduleFrequency.WEEKLY);
      await scheduler.createSchedule('erp-2', ['Inventory'], ScheduleFrequency.MONTHLY);

      const schedules = await scheduler.getSchedules('erp-1');

      expect(schedules).toHaveLength(2);
      expect(schedules.every((s) => s.integrationId === 'erp-1')).toBe(true);
    });

    it('should return empty array for integration with no schedules', async () => {
      const schedules = await scheduler.getSchedules('erp-999');

      expect(schedules).toEqual([]);
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule properties', async () => {
      const created = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.DAILY
      );

      const updated = await scheduler.updateSchedule(created.id, {
        isEnabled: false,
        retryAttempts: 5,
      });

      expect(updated.isEnabled).toBe(false);
      expect(updated.retryAttempts).toBe(5);
      expect(updated.id).toBe(created.id);
    });

    it('should throw error for non-existent schedule', async () => {
      try {
        await scheduler.updateSchedule('non-existent', { isEnabled: false });
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toContain('not found');
      }
    });
  });

  describe('deleteSchedule', () => {
    it('should delete a schedule', async () => {
      const created = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.DAILY
      );

      await scheduler.deleteSchedule(created.id);

      const retrieved = await scheduler.getSchedule(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('enableSchedule/disableSchedule', () => {
    it('should enable a disabled schedule', async () => {
      const created = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.DAILY
      );
      await scheduler.disableSchedule(created.id);

      const enabled = await scheduler.enableSchedule(created.id);

      expect(enabled.isEnabled).toBe(true);
    });

    it('should disable an enabled schedule', async () => {
      const created = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.DAILY
      );

      const disabled = await scheduler.disableSchedule(created.id);

      expect(disabled.isEnabled).toBe(false);
    });
  });

  describe('startJob/completeJob', () => {
    it('should start a job for schedule', async () => {
      const schedule = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.DAILY
      );

      const job = await scheduler.startJob(schedule.id);

      expect(job.id).toBeDefined();
      expect(job.scheduleId).toBe(schedule.id);
      expect(job.status).toBe(JobStatus.IN_PROGRESS);
      expect(job.startTime).toBeDefined();
    });

    it('should complete a job with results', async () => {
      const schedule = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.DAILY
      );
      const job = await scheduler.startJob(schedule.id);

      const completed = await scheduler.completeJob(job.id, {
        recordsProcessed: 100,
        discrepanciesFound: 5,
        dataQualityScore: 95.5,
        reportId: 'report-1',
      });

      expect(completed.status).toBe(JobStatus.COMPLETED);
      expect(completed.endTime).toBeDefined();
      expect(completed.duration).toBeGreaterThanOrEqual(0);
      expect(completed.recordsProcessed).toBe(100);
      expect(completed.discrepanciesFound).toBe(5);
      expect(completed.dataQualityScore).toBe(95.5);
    });

    it('should mark job as failed on error', async () => {
      const schedule = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.DAILY
      );
      const job = await scheduler.startJob(schedule.id);

      const completed = await scheduler.completeJob(job.id, {
        recordsProcessed: 0,
        discrepanciesFound: 0,
        error: 'Database connection failed',
      });

      expect(completed.status).toBe(JobStatus.FAILED);
      expect(completed.error).toBe('Database connection failed');
    });

    it('should prevent concurrent jobs exceeding limit', async () => {
      const schedule = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.DAILY,
        undefined,
        { maxConcurrentJobs: 1 }
      );

      await scheduler.startJob(schedule.id);

      try {
        await scheduler.startJob(schedule.id);
        expect(true).toBe(false); // Should throw
      } catch (error) {
        expect((error as Error).message).toContain('Cannot start job');
      }
    });
  });

  describe('getActiveJobs', () => {
    it('should list active jobs for schedule', async () => {
      const schedule = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.DAILY,
        undefined,
        { maxConcurrentJobs: 3 }
      );

      const job1 = await scheduler.startJob(schedule.id);
      const job2 = await scheduler.startJob(schedule.id);

      const active = await scheduler.getActiveJobs(schedule.id);

      expect(active).toHaveLength(2);
      expect(active.map((j) => j.id)).toContain(job1.id);
      expect(active.map((j) => j.id)).toContain(job2.id);
    });
  });

  describe('getJobStatus', () => {
    it('should get status of active job', async () => {
      const schedule = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.DAILY
      );
      const job = await scheduler.startJob(schedule.id);

      const status = await scheduler.getJobStatus(job.id);

      expect(status).toBeDefined();
      expect(status?.id).toBe(job.id);
      expect(status?.status).toBe(JobStatus.IN_PROGRESS);
    });

    it('should return null for completed/non-existent job', async () => {
      const status = await scheduler.getJobStatus('non-existent');

      expect(status).toBeNull();
    });
  });

  describe('calculateNextRunTime', () => {
    it('should calculate next run for daily schedule', () => {
      const schedule = {
        id: 'sched-1',
        integrationId: 'erp-1',
        entityTypes: ['Supplier'],
        frequency: ScheduleFrequency.DAILY,
        isEnabled: true,
        maxConcurrentJobs: 1,
        retryAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nextRun = scheduler.calculateNextRunTime(schedule);

      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
    });

    it('should calculate next run for weekly schedule', () => {
      const schedule = {
        id: 'sched-1',
        integrationId: 'erp-1',
        entityTypes: ['Supplier'],
        frequency: ScheduleFrequency.WEEKLY,
        isEnabled: true,
        maxConcurrentJobs: 1,
        retryAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nextRun = scheduler.calculateNextRunTime(schedule);

      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
    });

    it('should calculate next run for monthly schedule', () => {
      const schedule = {
        id: 'sched-1',
        integrationId: 'erp-1',
        entityTypes: ['Supplier'],
        frequency: ScheduleFrequency.MONTHLY,
        isEnabled: true,
        maxConcurrentJobs: 1,
        retryAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nextRun = scheduler.calculateNextRunTime(schedule);

      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('getScheduleStats', () => {
    it('should retrieve schedule statistics', async () => {
      const schedule = await scheduler.createSchedule(
        'erp-1',
        ['Supplier'],
        ScheduleFrequency.DAILY
      );

      const stats = await scheduler.getScheduleStats(schedule.id);

      expect(stats.scheduleId).toBe(schedule.id);
      expect(stats.integrationId).toBe('erp-1');
      expect(stats.isEnabled).toBe(true);
      expect(stats.totalRuns).toBeDefined();
      expect(stats.successfulRuns).toBeDefined();
      expect(stats.failedRuns).toBeDefined();
    });

    it('should throw error for non-existent schedule', async () => {
      try {
        await scheduler.getScheduleStats('non-existent');
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toContain('not found');
      }
    });
  });
});
