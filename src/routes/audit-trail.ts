/**
 * Audit Trail Routes
 * Issue #60: Phase 14 - Audit Trail & Change History
 *
 * Routes for audit trail and change history operations.
 */

import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import AuditTrailController from '../controllers/AuditTrailController';
import { PrismaClient } from '@prisma/client';
import { requireERPAccess } from '../middleware/erpAuth';

const router = express.Router();
const prisma = new PrismaClient();
const auditController = new AuditTrailController(prisma);

/**
 * @route GET /api/v1/audit/events
 * @desc Get audit events with filters
 * @access Private (requires erp:view)
 * @query {userId, integrationId, entityType, entityId, eventType, severity, status, startDate, endDate, limit, offset}
 */
router.get(
  '/events',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await auditController.getAuditEvents(req, res);
  })
);

/**
 * @route GET /api/v1/audit/entities/:entityType/:entityId/history
 * @desc Get entity history
 * @access Private (requires erp:view)
 * @query {limit}
 */
router.get(
  '/entities/:entityType/:entityId/history',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await auditController.getEntityHistory(req, res);
  })
);

/**
 * @route GET /api/v1/audit/users/:userId/activity
 * @desc Get user activity
 * @access Private (requires erp:view)
 * @query {limit}
 */
router.get(
  '/users/:userId/activity',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await auditController.getUserActivity(req, res);
  })
);

/**
 * @route GET /api/v1/audit/critical-events
 * @desc Get critical events
 * @access Private (requires erp:view)
 * @query {integrationId, startDate, endDate, limit}
 */
router.get(
  '/critical-events',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await auditController.getCriticalEvents(req, res);
  })
);

/**
 * @route GET /api/v1/audit/statistics
 * @desc Get audit statistics
 * @access Private (requires erp:view)
 * @query {integrationId, startDate, endDate}
 */
router.get(
  '/statistics',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await auditController.getAuditStatistics(req, res);
  })
);

/**
 * @route GET /api/v1/audit/compliance-report
 * @desc Generate compliance report
 * @access Private (requires erp:view)
 * @query {integrationId, startDate, endDate}
 */
router.get(
  '/compliance-report',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await auditController.generateComplianceReport(req, res);
  })
);

/**
 * @route GET /api/v1/audit/changes/:entityType/:entityId/summary
 * @desc Get change summary for entity
 * @access Private (requires erp:view)
 */
router.get(
  '/changes/:entityType/:entityId/summary',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await auditController.getChangeSummary(req, res);
  })
);

/**
 * @route GET /api/v1/audit/changes/:entityType/:entityId/timeline
 * @desc Get entity timeline
 * @access Private (requires erp:view)
 * @query {limit}
 */
router.get(
  '/changes/:entityType/:entityId/timeline',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await auditController.getEntityTimeline(req, res);
  })
);

/**
 * @route GET /api/v1/audit/changes/statistics
 * @desc Get change statistics
 * @access Private (requires erp:view)
 * @query {entityType, startDate, endDate}
 */
router.get(
  '/changes/statistics',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await auditController.getChangeStatistics(req, res);
  })
);

/**
 * @route GET /api/v1/audit/changes/impact-analysis
 * @desc Get change impact analysis
 * @access Private (requires erp:view)
 * @query {entityType, startDate, endDate}
 */
router.get(
  '/changes/impact-analysis',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await auditController.getChangeImpactAnalysis(req, res);
  })
);

/**
 * @route GET /api/v1/audit/changes/export.csv
 * @desc Export changes as CSV
 * @access Private (requires erp:view)
 * @query {entityType, startDate, endDate}
 */
router.get(
  '/changes/export.csv',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await auditController.exportChangesCSV(req, res);
  })
);

export default router;
