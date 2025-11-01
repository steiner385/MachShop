/**
 * Sync Routes
 * Issue #60: Phase 15 - Bi-directional Real-time Sync
 *
 * Routes for bi-directional sync operations.
 */

import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import SyncController from '../controllers/SyncController';
import { PrismaClient } from '@prisma/client';
import { requireERPAccess } from '../middleware/erpAuth';

const router = express.Router();
const prisma = new PrismaClient();
const syncController = new SyncController(prisma);

/**
 * @route POST /api/v1/sync/trigger
 * @desc Trigger manual sync
 * @access Private (requires erp:reconciliation)
 * @body {integrationId, entityType, entityId, sourceData, targetData, direction, forceSync}
 */
router.post(
  '/trigger',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await syncController.triggerManualSync(req, res);
  })
);

/**
 * @route GET /api/v1/sync/operations/:operationId
 * @desc Get sync operation status
 * @access Private (requires erp:view)
 */
router.get(
  '/operations/:operationId',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await syncController.getSyncStatus(req, res);
  })
);

/**
 * @route GET /api/v1/sync/operations
 * @desc List sync operations
 * @access Private (requires erp:view)
 * @query {integrationId, entityType, status, direction, limit, offset}
 */
router.get(
  '/operations',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await syncController.listSyncOperations(req, res);
  })
);

/**
 * @route GET /api/v1/sync/statistics
 * @desc Get sync statistics
 * @access Private (requires erp:view)
 * @query {integrationId, startDate, endDate}
 */
router.get(
  '/statistics',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await syncController.getSyncStatistics(req, res);
  })
);

/**
 * @route GET /api/v1/sync/conflicts
 * @desc Get conflicts
 * @access Private (requires erp:view)
 * @query {operationId, entityType, entityId, status, severity, limit, offset}
 */
router.get(
  '/conflicts',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await syncController.getConflicts(req, res);
  })
);

/**
 * @route POST /api/v1/sync/conflicts/:conflictId/resolve
 * @desc Resolve a conflict
 * @access Private (requires erp:reconciliation)
 * @body {strategy, customValue, notes}
 */
router.post(
  '/conflicts/:conflictId/resolve',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await syncController.resolveConflict(req, res);
  })
);

/**
 * @route POST /api/v1/sync/conflicts/:conflictId/approve
 * @desc Approve conflict resolution
 * @access Private (requires erp:reconciliation)
 * @body {notes}
 */
router.post(
  '/conflicts/:conflictId/approve',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await syncController.approveConflictResolution(req, res);
  })
);

/**
 * @route GET /api/v1/sync/conflicts/statistics
 * @desc Get conflict statistics
 * @access Private (requires erp:view)
 * @query {entityType, startDate, endDate}
 */
router.get(
  '/conflicts/statistics',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await syncController.getConflictStatistics(req, res);
  })
);

/**
 * @route GET /api/v1/sync/jobs
 * @desc Get sync jobs
 * @access Private (requires erp:view)
 * @query {integrationId, entityType, status, priority, limit, offset}
 */
router.get(
  '/jobs',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await syncController.getSyncJobs(req, res);
  })
);

/**
 * @route GET /api/v1/sync/jobs/:jobId
 * @desc Get job status
 * @access Private (requires erp:view)
 */
router.get(
  '/jobs/:jobId',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await syncController.getJobStatus(req, res);
  })
);

/**
 * @route GET /api/v1/sync/jobs/statistics
 * @desc Get job statistics
 * @access Private (requires erp:view)
 * @query {integrationId, startDate, endDate}
 */
router.get(
  '/jobs/statistics',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await syncController.getJobStatistics(req, res);
  })
);

/**
 * @route GET /api/v1/sync/queue
 * @desc Get queue status
 * @access Private (requires erp:view)
 */
router.get(
  '/queue',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await syncController.getQueueStatus(req, res);
  })
);

export default router;
