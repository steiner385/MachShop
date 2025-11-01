/**
 * Reconciliation Scheduler
 * Issue #60: Phase 13 - Scheduled Reconciliation Jobs
 *
 * Manages automated reconciliation runs based on schedules.
 * Supports cron expressions for flexible scheduling.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

/**
 * Schedule frequency options
 */
export enum ScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM', // Uses cron expression
}

/**
 * Job execution status
 */
export enum JobStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

/**
 * Reconciliation schedule configuration
 */
export interface ReconciliationSchedule {
  id: string;
  integrationId: string;
  entityTypes: string[]; // Entity types to reconcile (Supplier, PO, WO, Inventory)
  frequency: ScheduleFrequency;
  cronExpression?: string; // Only for CUSTOM frequency
  isEnabled: boolean;
  maxConcurrentJobs: number;
  timeout?: number; // milliseconds
  retryAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

/**
 * Job execution record
 */
export interface ReconciliationJob {
  id: string;
  scheduleId: string;
  integrationId: string;
  entityTypes: string[];
  status: JobStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  recordsProcessed: number;
  discrepanciesFound: number;
  dataQualityScore?: number;
  error?: string;
  reportId?: string;
}

/**
 * Reconciliation Scheduler Service
 */
export class ReconciliationScheduler {
  private prisma: PrismaClient;
  private schedules: Map<string, ReconciliationSchedule> = new Map();
  private activeJobs: Map<string, ReconciliationJob> = new Map();
  private timers: Map<string, NodeJS.Timer> = new Map();

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create a new reconciliation schedule
   */
  async createSchedule(
    integrationId: string,
    entityTypes: string[],
    frequency: ScheduleFrequency,
    cronExpression?: string,
    options: {
      maxConcurrentJobs?: number;
      timeout?: number;
      retryAttempts?: number;
    } = {}
  ): Promise<ReconciliationSchedule> {
    try {
      const schedule: ReconciliationSchedule = {
        id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        integrationId,
        entityTypes,
        frequency,
        cronExpression: frequency === ScheduleFrequency.CUSTOM ? cronExpression : undefined,
        isEnabled: true,
        maxConcurrentJobs: options.maxConcurrentJobs || 1,
        timeout: options.timeout,
        retryAttempts: options.retryAttempts || 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validate cron expression if custom
      if (frequency === ScheduleFrequency.CUSTOM && !cronExpression) {
        throw new Error('cronExpression required for CUSTOM frequency');
      }

      this.schedules.set(schedule.id, schedule);

      logger.info('Reconciliation schedule created', {
        scheduleId: schedule.id,
        integrationId,
        frequency,
        entityTypes,
      });

      return schedule;
    } catch (error) {
      logger.error('Failed to create reconciliation schedule', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Get schedule details
   */
  async getSchedule(scheduleId: string): Promise<ReconciliationSchedule | null> {
    return this.schedules.get(scheduleId) || null;
  }

  /**
   * List all schedules for integration
   */
  async getSchedules(integrationId: string): Promise<ReconciliationSchedule[]> {
    try {
      const schedules = Array.from(this.schedules.values()).filter(
        (s) => s.integrationId === integrationId
      );

      logger.info('Retrieved reconciliation schedules', {
        integrationId,
        count: schedules.length,
      });

      return schedules;
    } catch (error) {
      logger.error('Failed to get reconciliation schedules', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Update a schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ReconciliationSchedule>
  ): Promise<ReconciliationSchedule> {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      const updated = {
        ...schedule,
        ...updates,
        id: schedule.id, // Preserve ID
        createdAt: schedule.createdAt, // Preserve creation time
        updatedAt: new Date(),
      };

      this.schedules.set(scheduleId, updated);

      logger.info('Reconciliation schedule updated', {
        scheduleId,
        updates: Object.keys(updates),
      });

      return updated;
    } catch (error) {
      logger.error('Failed to update reconciliation schedule', {
        error: error instanceof Error ? error.message : String(error),
        scheduleId,
      });
      throw error;
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      // Stop timer if running
      const timer = this.timers.get(scheduleId);
      if (timer) {
        clearInterval(timer);
        this.timers.delete(scheduleId);
      }

      this.schedules.delete(scheduleId);

      logger.info('Reconciliation schedule deleted', {
        scheduleId,
      });
    } catch (error) {
      logger.error('Failed to delete reconciliation schedule', {
        error: error instanceof Error ? error.message : String(error),
        scheduleId,
      });
      throw error;
    }
  }

  /**
   * Enable a schedule
   */
  async enableSchedule(scheduleId: string): Promise<ReconciliationSchedule> {
    return this.updateSchedule(scheduleId, { isEnabled: true });
  }

  /**
   * Disable a schedule
   */
  async disableSchedule(scheduleId: string): Promise<ReconciliationSchedule> {
    return this.updateSchedule(scheduleId, { isEnabled: false });
  }

  /**
   * Start a scheduled reconciliation job
   */
  async startJob(scheduleId: string): Promise<ReconciliationJob> {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      // Check if already running
      const activeScheduleJobs = Array.from(this.activeJobs.values()).filter(
        (j) => j.scheduleId === scheduleId && j.status === JobStatus.IN_PROGRESS
      );

      if (activeScheduleJobs.length >= schedule.maxConcurrentJobs) {
        throw new Error(
          `Cannot start job: ${schedule.maxConcurrentJobs} jobs already running`
        );
      }

      const job: ReconciliationJob = {
        id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        scheduleId,
        integrationId: schedule.integrationId,
        entityTypes: schedule.entityTypes,
        status: JobStatus.IN_PROGRESS,
        startTime: new Date(),
        recordsProcessed: 0,
        discrepanciesFound: 0,
      };

      this.activeJobs.set(job.id, job);

      logger.info('Reconciliation job started', {
        jobId: job.id,
        scheduleId,
        integrationId: schedule.integrationId,
      });

      return job;
    } catch (error) {
      logger.error('Failed to start reconciliation job', {
        error: error instanceof Error ? error.message : String(error),
        scheduleId,
      });
      throw error;
    }
  }

  /**
   * Complete a job
   */
  async completeJob(
    jobId: string,
    result: {
      recordsProcessed: number;
      discrepanciesFound: number;
      dataQualityScore?: number;
      reportId?: string;
      error?: string;
    }
  ): Promise<ReconciliationJob> {
    try {
      const job = this.activeJobs.get(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const endTime = new Date();
      const duration = endTime.getTime() - job.startTime.getTime();

      const completed: ReconciliationJob = {
        ...job,
        status: result.error ? JobStatus.FAILED : JobStatus.COMPLETED,
        endTime,
        duration,
        recordsProcessed: result.recordsProcessed,
        discrepanciesFound: result.discrepanciesFound,
        dataQualityScore: result.dataQualityScore,
        reportId: result.reportId,
        error: result.error,
      };

      // Update schedule's last run time
      if (job.scheduleId) {
        const schedule = this.schedules.get(job.scheduleId);
        if (schedule) {
          await this.updateSchedule(job.scheduleId, {
            lastRunAt: endTime,
          });
        }
      }

      // Remove from active jobs after short delay
      setTimeout(() => this.activeJobs.delete(jobId), 5000);

      logger.info('Reconciliation job completed', {
        jobId,
        status: completed.status,
        duration,
        discrepanciesFound: result.discrepanciesFound,
        dataQualityScore: result.dataQualityScore,
      });

      return completed;
    } catch (error) {
      logger.error('Failed to complete reconciliation job', {
        error: error instanceof Error ? error.message : String(error),
        jobId,
      });
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<ReconciliationJob | null> {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get active jobs for schedule
   */
  async getActiveJobs(scheduleId: string): Promise<ReconciliationJob[]> {
    try {
      const jobs = Array.from(this.activeJobs.values()).filter(
        (j) => j.scheduleId === scheduleId
      );

      logger.info('Retrieved active jobs for schedule', {
        scheduleId,
        count: jobs.length,
      });

      return jobs;
    } catch (error) {
      logger.error('Failed to get active jobs', {
        error: error instanceof Error ? error.message : String(error),
        scheduleId,
      });
      throw error;
    }
  }

  /**
   * Calculate next run time based on schedule
   */
  calculateNextRunTime(schedule: ReconciliationSchedule): Date {
    const now = new Date();

    switch (schedule.frequency) {
      case ScheduleFrequency.DAILY:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);

      case ScheduleFrequency.WEEKLY:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      case ScheduleFrequency.MONTHLY:
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;

      case ScheduleFrequency.CUSTOM:
        // For custom, would need cron parser in real implementation
        // For now, return in 1 hour
        return new Date(now.getTime() + 60 * 60 * 1000);

      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStats(scheduleId: string): Promise<{
    scheduleId: string;
    integrationId: string;
    isEnabled: boolean;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    averageDiscrepancies: number;
    averageDataQualityScore: number;
    lastRunAt?: Date;
  }> {
    try {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      // In real implementation, would query database for historical job data
      return {
        scheduleId,
        integrationId: schedule.integrationId,
        isEnabled: schedule.isEnabled,
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        averageDiscrepancies: 0,
        averageDataQualityScore: 0,
        lastRunAt: schedule.lastRunAt,
      };
    } catch (error) {
      logger.error('Failed to get schedule statistics', {
        error: error instanceof Error ? error.message : String(error),
        scheduleId,
      });
      throw error;
    }
  }
}

export default ReconciliationScheduler;
