/**
 * Reconciliation Routes
 * Issue #60: Phase 12 - Data Reconciliation System
 *
 * Routes for data reconciliation, discrepancy management, and reporting.
 */

import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import ReconciliationController from '../controllers/ReconciliationController';
import { PrismaClient } from '@prisma/client';
import { requireERPAccess } from '../middleware/erpAuth';

const router = express.Router();
const prisma = new PrismaClient();
const reconciliationController = new ReconciliationController(prisma);

/**
 * @route POST /api/v1/reconciliation/integrations/:integrationId/trigger
 * @desc Trigger reconciliation for specific entity type
 * @access Private (requires erp:reconciliation)
 * @body {type: SUPPLIER|PURCHASE_ORDER|WORK_ORDER|INVENTORY|FULL_SYNC, periodStart?: Date, periodEnd?: Date}
 */
router.post(
  '/integrations/:integrationId/trigger',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await reconciliationController.triggerReconciliation(req, res);
  })
);

/**
 * @route GET /api/v1/reconciliation/integrations/:integrationId/reports/:reportId
 * @desc Get reconciliation report details
 * @access Private (requires erp:view)
 */
router.get(
  '/integrations/:integrationId/reports/:reportId',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await reconciliationController.getReport(req, res);
  })
);

/**
 * @route GET /api/v1/reconciliation/integrations/:integrationId/history
 * @desc Get reconciliation history
 * @access Private (requires erp:view)
 * @query {type?: SUPPLIER|PURCHASE_ORDER|WORK_ORDER|INVENTORY|FULL_SYNC, limit?: number}
 */
router.get(
  '/integrations/:integrationId/history',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await reconciliationController.getHistory(req, res);
  })
);

/**
 * @route GET /api/v1/reconciliation/integrations/:integrationId/trends
 * @desc Get reconciliation trends and analysis
 * @access Private (requires erp:view)
 * @query {type: SUPPLIER|PURCHASE_ORDER|WORK_ORDER|INVENTORY|FULL_SYNC, days?: number}
 */
router.get(
  '/integrations/:integrationId/trends',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await reconciliationController.getTrends(req, res);
  })
);

/**
 * @route GET /api/v1/reconciliation/integrations/:integrationId/reports/:reportId/discrepancies
 * @desc Get discrepancies for a report
 * @access Private (requires erp:view)
 * @query {severity?: LOW|MEDIUM|HIGH|CRITICAL, entityType?: string, limit?: number}
 */
router.get(
  '/integrations/:integrationId/reports/:reportId/discrepancies',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await reconciliationController.getDiscrepancies(req, res);
  })
);

/**
 * @route POST /api/v1/reconciliation/integrations/:integrationId/discrepancies/:discrepancyId/resolve
 * @desc Resolve a discrepancy
 * @access Private (requires erp:reconciliation)
 * @body {resolutionType: string, correctedValue?: any, correctionDetails?: string}
 */
router.post(
  '/integrations/:integrationId/discrepancies/:discrepancyId/resolve',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await reconciliationController.resolveDiscrepancy(req, res);
  })
);

/**
 * @route GET /api/v1/reconciliation/integrations/:integrationId/discrepancies/:discrepancyId/suggestions
 * @desc Get suggested resolution for discrepancy
 * @access Private (requires erp:view)
 */
router.get(
  '/integrations/:integrationId/discrepancies/:discrepancyId/suggestions',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await reconciliationController.getSuggestions(req, res);
  })
);

/**
 * @route GET /api/v1/reconciliation/integrations/:integrationId/dashboard
 * @desc Get reconciliation dashboard summary
 * @access Private (requires erp:view)
 */
router.get(
  '/integrations/:integrationId/dashboard',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await reconciliationController.getDashboardSummary(req, res);
  })
);

export default router;
