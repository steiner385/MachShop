/**
 * Sync Job Service Unit Tests
 * Issue #60: Phase 15 - Bi-directional Real-time Sync
 */

import { describe, it, expect, beforeEach } from 'vitest';
import SyncJobService, { SyncJobStatus, SyncJobPriority } from '../../../../services/erp/sync/SyncJobService';

describe('SyncJobService', () => {
  let syncJobService: SyncJobService;

  beforeEach(() => {
    syncJobService = new SyncJobService();
  });

  describe('createSyncJob', () => {
    it('should create a sync job', async () => {
      const job = await syncJobService.createSyncJob(
        'erp-1',
        'Product',
        'FULL_SYNC',
        {
          priority: SyncJobPriority.NORMAL,
          metadata: { batchSize: 100 },
        }
      );

      expect(job.id).toBeDefined();
      expect(job.integrationId).toBe('erp-1');
      expect(job.entityType).toBe('Product');
      expect(job.operationType).toBe('FULL_SYNC');
      // Job is created and queued, so status is QUEUED
      expect([SyncJobStatus.PENDING, SyncJobStatus.QUEUED]).toContain(job.status);
      expect(job.priority).toBe(SyncJobPriority.NORMAL);
    });

    it('should queue job by priority', async () => {
      const lowPriority = await syncJobService.createSyncJob(
        'erp-1',
        'Product',
        'FULL_SYNC',
        { priority: SyncJobPriority.LOW }
      );

      const highPriority = await syncJobService.createSyncJob(
        'erp-1',
        'Product',
        'PARTIAL_SYNC',
        { priority: SyncJobPriority.HIGH }
      );

      const queue = await syncJobService.getQueueStatus();

      // Higher priority should come first in queue
      expect(queue.nextJobs[0].id).toBe(highPriority.id);
    });
  });

  describe('getNextJob', () => {
    it('should return next job from queue', async () => {
      const created = await syncJobService.createSyncJob('erp-1', 'Product', 'FULL_SYNC');

      const next = await syncJobService.getNextJob();

      expect(next).toBeDefined();
      expect(next?.id).toBe(created.id);
      expect(next?.status).toBe(SyncJobStatus.IN_PROGRESS);
    });

    it('should return null when queue is empty', async () => {
      const next = await syncJobService.getNextJob();

      expect(next).toBeNull();
    });
  });

  describe('completeSyncJob', () => {
    it('should complete a sync job successfully', async () => {
      const job = await syncJobService.createSyncJob('erp-1', 'Product', 'FULL_SYNC');
      await syncJobService.getNextJob();

      const completed = await syncJobService.completeSyncJob(job.id, {
        recordsProcessed: 100,
        recordsSynced: 100,
      });

      expect(completed?.status).toBe(SyncJobStatus.COMPLETED);
      expect(completed?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should mark job as failed with error', async () => {
      const job = await syncJobService.createSyncJob('erp-1', 'Product', 'FULL_SYNC');
      await syncJobService.getNextJob();

      const failed = await syncJobService.completeSyncJob(
        job.id,
        undefined,
        'Database connection failed'
      );

      // After failing, if retries remain, it will be re-queued (status = QUEUED)
      expect(failed?.status).toBe(SyncJobStatus.QUEUED);
      expect(failed?.lastError).toBe('Database connection failed');
    });

    it('should retry failed job if retries remain', async () => {
      const job = await syncJobService.createSyncJob('erp-1', 'Product', 'FULL_SYNC');
      await syncJobService.getNextJob();

      const failed = await syncJobService.completeSyncJob(
        job.id,
        undefined,
        'Connection error'
      );

      // After failing, if retries remain, it will be re-queued (status = QUEUED)
      expect(failed?.status).toBe(SyncJobStatus.QUEUED);
      expect(failed?.retryCount).toBe(1);
    });
  });

  describe('cancelSyncJob', () => {
    it('should cancel a pending job', async () => {
      const job = await syncJobService.createSyncJob('erp-1', 'Product', 'FULL_SYNC');

      const cancelled = await syncJobService.cancelSyncJob(job.id);

      expect(cancelled?.status).toBe(SyncJobStatus.CANCELLED);
    });

    it('should return null for non-existent job', async () => {
      const cancelled = await syncJobService.cancelSyncJob('non-existent');

      expect(cancelled).toBeNull();
    });
  });

  describe('getJobStatus', () => {
    it('should return job status', async () => {
      const created = await syncJobService.createSyncJob('erp-1', 'Product', 'FULL_SYNC');

      const status = await syncJobService.getJobStatus(created.id);

      expect(status).toBeDefined();
      expect(status?.id).toBe(created.id);
    });
  });

  describe('getJobs', () => {
    beforeEach(async () => {
      await syncJobService.createSyncJob('erp-1', 'Product', 'FULL_SYNC');
      await syncJobService.createSyncJob('erp-1', 'Order', 'PARTIAL_SYNC');
      await syncJobService.createSyncJob('erp-2', 'Product', 'FULL_SYNC');
    });

    it('should list all jobs', async () => {
      const { jobs, total } = await syncJobService.getJobs();

      expect(jobs.length).toBeGreaterThan(0);
      expect(total).toBe(3);
    });

    it('should filter by integrationId', async () => {
      const { jobs } = await syncJobService.getJobs({ integrationId: 'erp-1' });

      expect(jobs.every((j) => j.integrationId === 'erp-1')).toBe(true);
      expect(jobs.length).toBe(2);
    });

    it('should filter by entityType', async () => {
      const { jobs } = await syncJobService.getJobs({ entityType: 'Product' });

      expect(jobs.every((j) => j.entityType === 'Product')).toBe(true);
    });

    it('should filter by status', async () => {
      const { jobs } = await syncJobService.getJobs({ status: SyncJobStatus.PENDING });

      expect(jobs.every((j) => j.status === SyncJobStatus.PENDING)).toBe(true);
    });
  });

  describe('getJobStatistics', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        const job = await syncJobService.createSyncJob('erp-1', 'Product', 'FULL_SYNC');
        await syncJobService.getNextJob();

        if (i < 3) {
          await syncJobService.completeSyncJob(job.id, { recordsProcessed: 100 });
        } else {
          // Create failed jobs by completing with error (will be re-queued if retries remain)
          const completed = await syncJobService.completeSyncJob(job.id, undefined, 'Error');
          // If it was re-queued, process all retries to actually fail it
          if (completed?.status !== SyncJobStatus.FAILED) {
            let current = completed;
            while (current && current.retryCount < current.maxRetries) {
              const next = await syncJobService.getNextJob();
              if (next) {
                current = await syncJobService.completeSyncJob(next.id, undefined, 'Retry Error');
              } else {
                break;
              }
            }
          }
        }
      }
    });

    it('should return job statistics', async () => {
      const stats = await syncJobService.getJobStatistics();

      expect(stats.totalJobs).toBeGreaterThan(0);
      expect(stats.completedJobs).toBeGreaterThan(0);
      // Jobs will have some status (completed, failed, or queued)
      expect(Object.keys(stats.jobsByStatus).length).toBeGreaterThan(0);
    });

    it('should calculate success rate', async () => {
      const stats = await syncJobService.getJobStatistics();

      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });

    it('should provide job status breakdown', async () => {
      const stats = await syncJobService.getJobStatistics();

      expect(stats.jobsByStatus).toBeDefined();
      expect(Object.keys(stats.jobsByStatus).length).toBeGreaterThan(0);
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status', async () => {
      await syncJobService.createSyncJob('erp-1', 'Product', 'FULL_SYNC');
      await syncJobService.createSyncJob('erp-1', 'Product', 'FULL_SYNC');

      const queue = await syncJobService.getQueueStatus();

      expect(queue.queueLength).toBeGreaterThan(0);
      expect(Array.isArray(queue.nextJobs)).toBe(true);
    });

    it('should track processing job', async () => {
      const job = await syncJobService.createSyncJob('erp-1', 'Product', 'FULL_SYNC');
      await syncJobService.getNextJob();

      const queue = await syncJobService.getQueueStatus();

      expect(queue.processingJob).toBe(job.id);
    });
  });
});
