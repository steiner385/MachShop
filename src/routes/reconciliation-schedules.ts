/**
 * Reconciliation Schedule Routes
 * Issue #60: Phase 13 - Scheduled Reconciliation Jobs
 *
 * Routes for creating and managing reconciliation schedules.
 */

import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import ReconciliationScheduleController from '../controllers/ReconciliationScheduleController';
import { PrismaClient } from '@prisma/client';
import { requireERPAccess } from '../middleware/erpAuth';

const router = express.Router();
const prisma = new PrismaClient();
const scheduleController = new ReconciliationScheduleController(prisma);

/**
 * @route POST /api/v1/reconciliation/integrations/:integrationId/schedules
 * @desc Create a new reconciliation schedule
 * @access Private (requires erp:reconciliation)
 * @body {entityTypes: string[], frequency: DAILY|WEEKLY|MONTHLY|CUSTOM, cronExpression?: string, maxConcurrentJobs?: number, timeout?: number, retryAttempts?: number}
 */
router.post(
  '/integrations/:integrationId/schedules',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await scheduleController.createSchedule(req, res);
  })
);

/**
 * @route GET /api/v1/reconciliation/integrations/:integrationId/schedules
 * @desc List all schedules for integration
 * @access Private (requires erp:view)
 */
router.get(
  '/integrations/:integrationId/schedules',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await scheduleController.listSchedules(req, res);
  })
);

/**
 * @route GET /api/v1/reconciliation/schedules/:scheduleId
 * @desc Get schedule details
 * @access Private (requires erp:view)
 */
router.get(
  '/schedules/:scheduleId',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await scheduleController.getSchedule(req, res);
  })
);

/**
 * @route PATCH /api/v1/reconciliation/schedules/:scheduleId
 * @desc Update a schedule
 * @access Private (requires erp:reconciliation)
 */
router.patch(
  '/schedules/:scheduleId',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await scheduleController.updateSchedule(req, res);
  })
);

/**
 * @route DELETE /api/v1/reconciliation/schedules/:scheduleId
 * @desc Delete a schedule
 * @access Private (requires erp:reconciliation)
 */
router.delete(
  '/schedules/:scheduleId',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await scheduleController.deleteSchedule(req, res);
  })
);

/**
 * @route POST /api/v1/reconciliation/schedules/:scheduleId/enable
 * @desc Enable a schedule
 * @access Private (requires erp:reconciliation)
 */
router.post(
  '/schedules/:scheduleId/enable',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await scheduleController.enableSchedule(req, res);
  })
);

/**
 * @route POST /api/v1/reconciliation/schedules/:scheduleId/disable
 * @desc Disable a schedule
 * @access Private (requires erp:reconciliation)
 */
router.post(
  '/schedules/:scheduleId/disable',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await scheduleController.disableSchedule(req, res);
  })
);

/**
 * @route POST /api/v1/reconciliation/schedules/:scheduleId/trigger
 * @desc Manually trigger a reconciliation for schedule
 * @access Private (requires erp:reconciliation)
 */
router.post(
  '/schedules/:scheduleId/trigger',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await scheduleController.triggerScheduleNow(req, res);
  })
);

/**
 * @route GET /api/v1/reconciliation/schedules/:scheduleId/jobs
 * @desc Get active jobs for schedule
 * @access Private (requires erp:view)
 */
router.get(
  '/schedules/:scheduleId/jobs',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await scheduleController.getActiveJobs(req, res);
  })
);

/**
 * @route GET /api/v1/reconciliation/jobs/:jobId
 * @desc Get job status
 * @access Private (requires erp:view)
 */
router.get(
  '/jobs/:jobId',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await scheduleController.getJobStatus(req, res);
  })
);

/**
 * @route GET /api/v1/reconciliation/schedules/:scheduleId/stats
 * @desc Get schedule statistics
 * @access Private (requires erp:view)
 */
router.get(
  '/schedules/:scheduleId/stats',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await scheduleController.getScheduleStats(req, res);
  })
);

export default router;
