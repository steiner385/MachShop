/**
 * Reconciliation Schedule Controller
 * Issue #60: Phase 13 - Scheduled Reconciliation Jobs
 *
 * REST endpoints for managing reconciliation schedules.
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import ReconciliationScheduler, { ScheduleFrequency } from '../services/erp/reconciliation/ReconciliationScheduler';
import { logger } from '../utils/logger';

/**
 * Reconciliation Schedule Controller
 */
export class ReconciliationScheduleController {
  private prisma: PrismaClient;
  private scheduler: ReconciliationScheduler;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.scheduler = new ReconciliationScheduler(this.prisma);
  }

  /**
   * Create a new reconciliation schedule
   */
  async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;
      const { entityTypes, frequency, cronExpression, maxConcurrentJobs, timeout, retryAttempts } = req.body;

      // Validate input
      if (!entityTypes || !Array.isArray(entityTypes) || entityTypes.length === 0) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'entityTypes must be a non-empty array',
        });
        return;
      }

      if (!frequency || !Object.values(ScheduleFrequency).includes(frequency)) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: `Invalid frequency. Must be one of: ${Object.values(ScheduleFrequency).join(', ')}`,
        });
        return;
      }

      const schedule = await this.scheduler.createSchedule(
        integrationId,
        entityTypes,
        frequency,
        cronExpression,
        {
          maxConcurrentJobs,
          timeout,
          retryAttempts,
        }
      );

      logger.info('Schedule created via API', {
        integrationId,
        scheduleId: schedule.id,
      });

      res.status(201).json({
        timestamp: new Date(),
        schedule,
      });
    } catch (error) {
      logger.error('Failed to create schedule', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'SCHEDULE_CREATE_FAILED',
        message: 'Failed to create reconciliation schedule',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get schedule details
   */
  async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;

      const schedule = await this.scheduler.getSchedule(scheduleId);
      if (!schedule) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `Schedule ${scheduleId} not found`,
        });
        return;
      }

      res.json({
        timestamp: new Date(),
        schedule,
      });
    } catch (error) {
      logger.error('Failed to get schedule', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'SCHEDULE_FETCH_FAILED',
        message: 'Failed to retrieve schedule',
      });
    }
  }

  /**
   * List all schedules for integration
   */
  async listSchedules(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;

      const schedules = await this.scheduler.getSchedules(integrationId);

      res.json({
        timestamp: new Date(),
        integrationId,
        count: schedules.length,
        schedules,
      });
    } catch (error) {
      logger.error('Failed to list schedules', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'SCHEDULE_LIST_FAILED',
        message: 'Failed to retrieve schedules',
      });
    }
  }

  /**
   * Update a schedule
   */
  async updateSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;
      const updates = req.body;

      const schedule = await this.scheduler.updateSchedule(scheduleId, updates);

      logger.info('Schedule updated via API', {
        scheduleId,
        fields: Object.keys(updates),
      });

      res.json({
        timestamp: new Date(),
        schedule,
      });
    } catch (error) {
      logger.error('Failed to update schedule', {
        error: error instanceof Error ? error.message : String(error),
        scheduleId: req.params.scheduleId,
      });

      res.status(500).json({
        error: 'SCHEDULE_UPDATE_FAILED',
        message: 'Failed to update schedule',
      });
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;

      await this.scheduler.deleteSchedule(scheduleId);

      logger.info('Schedule deleted via API', {
        scheduleId,
      });

      res.json({
        timestamp: new Date(),
        message: 'Schedule deleted successfully',
        scheduleId,
      });
    } catch (error) {
      logger.error('Failed to delete schedule', {
        error: error instanceof Error ? error.message : String(error),
        scheduleId: req.params.scheduleId,
      });

      res.status(500).json({
        error: 'SCHEDULE_DELETE_FAILED',
        message: 'Failed to delete schedule',
      });
    }
  }

  /**
   * Enable a schedule
   */
  async enableSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;

      const schedule = await this.scheduler.enableSchedule(scheduleId);

      logger.info('Schedule enabled via API', {
        scheduleId,
      });

      res.json({
        timestamp: new Date(),
        schedule,
      });
    } catch (error) {
      logger.error('Failed to enable schedule', {
        error: error instanceof Error ? error.message : String(error),
        scheduleId: req.params.scheduleId,
      });

      res.status(500).json({
        error: 'SCHEDULE_ENABLE_FAILED',
        message: 'Failed to enable schedule',
      });
    }
  }

  /**
   * Disable a schedule
   */
  async disableSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;

      const schedule = await this.scheduler.disableSchedule(scheduleId);

      logger.info('Schedule disabled via API', {
        scheduleId,
      });

      res.json({
        timestamp: new Date(),
        schedule,
      });
    } catch (error) {
      logger.error('Failed to disable schedule', {
        error: error instanceof Error ? error.message : String(error),
        scheduleId: req.params.scheduleId,
      });

      res.status(500).json({
        error: 'SCHEDULE_DISABLE_FAILED',
        message: 'Failed to disable schedule',
      });
    }
  }

  /**
   * Manually trigger a reconciliation for a schedule
   */
  async triggerScheduleNow(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;

      const job = await this.scheduler.startJob(scheduleId);

      logger.info('Schedule triggered manually via API', {
        scheduleId,
        jobId: job.id,
      });

      res.json({
        timestamp: new Date(),
        job,
      });
    } catch (error) {
      logger.error('Failed to trigger schedule', {
        error: error instanceof Error ? error.message : String(error),
        scheduleId: req.params.scheduleId,
      });

      res.status(500).json({
        error: 'SCHEDULE_TRIGGER_FAILED',
        message: 'Failed to trigger reconciliation',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get active jobs for a schedule
   */
  async getActiveJobs(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;

      const jobs = await this.scheduler.getActiveJobs(scheduleId);

      res.json({
        timestamp: new Date(),
        scheduleId,
        count: jobs.length,
        jobs,
      });
    } catch (error) {
      logger.error('Failed to get active jobs', {
        error: error instanceof Error ? error.message : String(error),
        scheduleId: req.params.scheduleId,
      });

      res.status(500).json({
        error: 'JOBS_FETCH_FAILED',
        message: 'Failed to retrieve active jobs',
      });
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      const job = await this.scheduler.getJobStatus(jobId);
      if (!job) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `Job ${jobId} not found`,
        });
        return;
      }

      res.json({
        timestamp: new Date(),
        job,
      });
    } catch (error) {
      logger.error('Failed to get job status', {
        error: error instanceof Error ? error.message : String(error),
        jobId: req.params.jobId,
      });

      res.status(500).json({
        error: 'JOB_STATUS_FAILED',
        message: 'Failed to retrieve job status',
      });
    }
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStats(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;

      const stats = await this.scheduler.getScheduleStats(scheduleId);

      res.json({
        timestamp: new Date(),
        stats,
      });
    } catch (error) {
      logger.error('Failed to get schedule statistics', {
        error: error instanceof Error ? error.message : String(error),
        scheduleId: req.params.scheduleId,
      });

      res.status(500).json({
        error: 'STATS_FETCH_FAILED',
        message: 'Failed to retrieve statistics',
      });
    }
  }
}

export default ReconciliationScheduleController;
