/**
 * Sync Job Service
 * Issue #60: Phase 15 - Bi-directional Real-time Sync
 *
 * Manages sync job scheduling and execution.
 */

import { logger } from '../../../utils/logger';

/**
 * Sync job status
 */
export enum SyncJobStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

/**
 * Sync job priority
 */
export enum SyncJobPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

/**
 * Sync job record
 */
export interface SyncJob {
  id: string;
  integrationId: string;
  entityType: string;
  entityId?: string;
  operationType: 'FULL_SYNC' | 'PARTIAL_SYNC' | 'CONFLICT_RESOLUTION' | 'RECONCILIATION_SYNC';
  priority: SyncJobPriority;
  status: SyncJobStatus;
  scheduledTime: Date;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  result?: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sync Job Service
 */
export class SyncJobService {
  private jobs: Map<string, SyncJob> = new Map();
  private jobQueue: string[] = [];
  private processingJob: string | null = null;
  private jobCounter = 0;

  /**
   * Create and queue a sync job
   */
  async createSyncJob(
    integrationId: string,
    entityType: string,
    operationType: 'FULL_SYNC' | 'PARTIAL_SYNC' | 'CONFLICT_RESOLUTION' | 'RECONCILIATION_SYNC',
    options?: {
      entityId?: string;
      priority?: SyncJobPriority;
      scheduledTime?: Date;
      metadata?: Record<string, any>;
    }
  ): Promise<SyncJob> {
    try {
      const id = `sync-job-${Date.now()}-${++this.jobCounter}`;

      const job: SyncJob = {
        id,
        integrationId,
        entityType,
        entityId: options?.entityId,
        operationType,
        priority: options?.priority || SyncJobPriority.NORMAL,
        status: SyncJobStatus.PENDING,
        scheduledTime: options?.scheduledTime || new Date(),
        retryCount: 0,
        maxRetries: 3,
        metadata: options?.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.jobs.set(id, job);

      // Add to queue based on priority
      await this.queueJob(id, job.priority);

      logger.info('Sync job created', {
        jobId: id,
        integrationId,
        entityType,
        operationType,
        priority: job.priority,
      });

      return job;
    } catch (error) {
      logger.error('Failed to create sync job', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
        entityType,
      });
      throw error;
    }
  }

  /**
   * Queue a job with priority ordering
   */
  private async queueJob(jobId: string, priority: SyncJobPriority): Promise<void> {
    try {
      const job = this.jobs.get(jobId);

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      // Insert based on priority (higher priority comes first)
      let inserted = false;

      for (let i = 0; i < this.jobQueue.length; i++) {
        const queuedJobId = this.jobQueue[i];
        const queuedJob = this.jobs.get(queuedJobId);

        if (queuedJob && queuedJob.priority < priority) {
          this.jobQueue.splice(i, 0, jobId);
          inserted = true;
          break;
        }
      }

      if (!inserted) {
        this.jobQueue.push(jobId);
      }

      job.status = SyncJobStatus.QUEUED;
      job.updatedAt = new Date();

      logger.info('Job queued', {
        jobId,
        queuePosition: this.jobQueue.indexOf(jobId),
        queueLength: this.jobQueue.length,
      });
    } catch (error) {
      logger.error('Failed to queue job', {
        error: error instanceof Error ? error.message : String(error),
        jobId,
      });
      throw error;
    }
  }

  /**
   * Get next job from queue
   */
  async getNextJob(): Promise<SyncJob | null> {
    try {
      if (this.processingJob) {
        return null; // Another job is processing
      }

      if (this.jobQueue.length === 0) {
        return null; // Queue is empty
      }

      const jobId = this.jobQueue.shift();

      if (!jobId) {
        return null;
      }

      const job = this.jobs.get(jobId);

      if (!job) {
        return null;
      }

      this.processingJob = jobId;
      job.status = SyncJobStatus.IN_PROGRESS;
      job.startTime = new Date();
      job.updatedAt = new Date();

      logger.info('Job started processing', {
        jobId,
        operationType: job.operationType,
      });

      return job;
    } catch (error) {
      logger.error('Failed to get next job', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Complete a sync job
   */
  async completeSyncJob(
    jobId: string,
    result?: Record<string, any>,
    error?: string
  ): Promise<SyncJob | null> {
    try {
      const job = this.jobs.get(jobId);

      if (!job) {
        return null;
      }

      job.endTime = new Date();
      job.duration = job.endTime.getTime() - (job.startTime?.getTime() || Date.now());
      job.result = result;

      if (error) {
        job.lastError = error;

        // Retry if haven't exceeded max retries
        if (job.retryCount < job.maxRetries) {
          job.status = SyncJobStatus.PENDING;
          job.retryCount++;
          job.startTime = undefined;
          job.endTime = undefined;

          // Re-queue the job
          await this.queueJob(jobId, job.priority);

          logger.info('Job will be retried', {
            jobId,
            retryCount: job.retryCount,
            maxRetries: job.maxRetries,
          });
        } else {
          job.status = SyncJobStatus.FAILED;

          logger.error('Job failed permanently', {
            jobId,
            retryCount: job.retryCount,
            error,
          });
        }
      } else {
        job.status = SyncJobStatus.COMPLETED;

        logger.info('Job completed successfully', {
          jobId,
          duration: job.duration,
        });
      }

      job.updatedAt = new Date();
      this.processingJob = null;

      return job;
    } catch (error) {
      logger.error('Failed to complete sync job', {
        error: error instanceof Error ? error.message : String(error),
        jobId,
      });
      throw error;
    }
  }

  /**
   * Cancel a sync job
   */
  async cancelSyncJob(jobId: string): Promise<SyncJob | null> {
    try {
      const job = this.jobs.get(jobId);

      if (!job) {
        return null;
      }

      if (job.status === SyncJobStatus.COMPLETED || job.status === SyncJobStatus.FAILED) {
        throw new Error('Cannot cancel a completed or failed job');
      }

      job.status = SyncJobStatus.CANCELLED;
      job.updatedAt = new Date();

      // Remove from queue if pending
      if (job.status === SyncJobStatus.QUEUED || job.status === SyncJobStatus.PENDING) {
        const index = this.jobQueue.indexOf(jobId);
        if (index > -1) {
          this.jobQueue.splice(index, 1);
        }
      }

      if (this.processingJob === jobId) {
        this.processingJob = null;
      }

      logger.info('Job cancelled', {
        jobId,
      });

      return job;
    } catch (error) {
      logger.error('Failed to cancel sync job', {
        error: error instanceof Error ? error.message : String(error),
        jobId,
      });
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<SyncJob | null> {
    try {
      return this.jobs.get(jobId) || null;
    } catch (error) {
      logger.error('Failed to get job status', {
        error: error instanceof Error ? error.message : String(error),
        jobId,
      });
      throw error;
    }
  }

  /**
   * Get jobs
   */
  async getJobs(options?: {
    integrationId?: string;
    entityType?: string;
    status?: SyncJobStatus;
    priority?: SyncJobPriority;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: SyncJob[]; total: number }> {
    try {
      let jobs = Array.from(this.jobs.values());

      if (options?.integrationId) {
        jobs = jobs.filter((j) => j.integrationId === options.integrationId);
      }
      if (options?.entityType) {
        jobs = jobs.filter((j) => j.entityType === options.entityType);
      }
      if (options?.status) {
        jobs = jobs.filter((j) => j.status === options.status);
      }
      if (options?.priority) {
        jobs = jobs.filter((j) => j.priority === options.priority);
      }

      // Sort by creation date descending
      jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = jobs.length;
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      const sliced = jobs.slice(offset, offset + limit);

      return { jobs: sliced, total };
    } catch (error) {
      logger.error('Failed to get jobs', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get job statistics
   */
  async getJobStatistics(options?: {
    integrationId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    pendingJobs: number;
    queuedJobs: number;
    averageDuration: number;
    successRate: number;
    jobsByStatus: Record<string, number>;
    jobsByPriority: Record<string, number>;
  }> {
    try {
      let jobs = Array.from(this.jobs.values());

      if (options?.integrationId) {
        jobs = jobs.filter((j) => j.integrationId === options.integrationId);
      }

      if (options?.startDate) {
        jobs = jobs.filter((j) => j.createdAt >= options.startDate!);
      }

      if (options?.endDate) {
        jobs = jobs.filter((j) => j.createdAt <= options.endDate!);
      }

      const completed = jobs.filter((j) => j.status === SyncJobStatus.COMPLETED).length;
      const failed = jobs.filter((j) => j.status === SyncJobStatus.FAILED).length;
      const pending = jobs.filter((j) => j.status === SyncJobStatus.PENDING).length;
      const queued = jobs.filter((j) => j.status === SyncJobStatus.QUEUED).length;

      const totalDuration = jobs.reduce((sum, j) => sum + (j.duration || 0), 0);
      const completedWithDuration = jobs.filter((j) => j.duration).length;
      const averageDuration = completedWithDuration > 0 ? totalDuration / completedWithDuration : 0;

      // Count by status
      const jobsByStatus: Record<string, number> = {};
      jobs.forEach((j) => {
        jobsByStatus[j.status] = (jobsByStatus[j.status] || 0) + 1;
      });

      // Count by priority
      const jobsByPriority: Record<string, number> = {};
      jobs.forEach((j) => {
        const priorityName = Object.keys(SyncJobPriority).find(
          (k) => SyncJobPriority[k as keyof typeof SyncJobPriority] === j.priority
        ) || String(j.priority);
        jobsByPriority[priorityName] = (jobsByPriority[priorityName] || 0) + 1;
      });

      const successRate = jobs.length > 0 ? (completed / jobs.length) * 100 : 100;

      return {
        totalJobs: jobs.length,
        completedJobs: completed,
        failedJobs: failed,
        pendingJobs: pending,
        queuedJobs: queued,
        averageDuration,
        successRate,
        jobsByStatus,
        jobsByPriority,
      };
    } catch (error) {
      logger.error('Failed to get job statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    queueLength: number;
    processingJob: string | null;
    nextJobs: SyncJob[];
  }> {
    try {
      const nextJobs = this.jobQueue.slice(0, 5).map((jobId) => this.jobs.get(jobId)!).filter(Boolean);

      return {
        queueLength: this.jobQueue.length,
        processingJob: this.processingJob,
        nextJobs,
      };
    } catch (error) {
      logger.error('Failed to get queue status', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default SyncJobService;
