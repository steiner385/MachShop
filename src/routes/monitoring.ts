/**
 * Monitoring Routes
 * Issue #60: Phase 11 - Advanced Monitoring & Observability
 *
 * Routes for webhook metrics, health checks, and integration monitoring
 */

import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import MonitoringController from '../controllers/MonitoringController';
import { PrismaClient } from '@prisma/client';
import { requireERPAccess } from '../middleware/erpAuth';

const router = express.Router();
const prisma = new PrismaClient();
const monitoringController = new MonitoringController(prisma);

/**
 * @route GET /api/v1/monitoring/health
 * @desc Get health status for all integrations
 * @access Private (requires erp:view)
 */
router.get(
  '/health',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await monitoringController.getHealthStatus(req, res);
  })
);

/**
 * @route GET /api/v1/monitoring/integrations/:integrationId/health
 * @desc Get health status for specific integration
 * @access Private (requires erp:view)
 */
router.get(
  '/integrations/:integrationId/health',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await monitoringController.getIntegrationHealth(req, res);
  })
);

/**
 * @route GET /api/v1/monitoring/integrations/:integrationId/summary
 * @desc Get complete integration summary (health + metrics)
 * @access Private (requires erp:view)
 */
router.get(
  '/integrations/:integrationId/summary',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await monitoringController.getIntegrationSummary(req, res);
  })
);

/**
 * @route GET /api/v1/monitoring/webhooks/:integrationId
 * @desc Get webhook metrics for integration
 * @access Private (requires erp:view)
 */
router.get(
  '/webhooks/:integrationId',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await monitoringController.getWebhookMetrics(req, res);
  })
);

/**
 * @route GET /api/v1/monitoring/webhooks/:webhookId/detail
 * @desc Get detailed metrics for specific webhook
 * @access Private (requires erp:view)
 */
router.get(
  '/webhooks/:webhookId/detail',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await monitoringController.getWebhookDetail(req, res);
  })
);

/**
 * @route GET /api/v1/monitoring/integrations/:integrationId/sync-metrics
 * @desc Get sync performance metrics with optional time period
 * @access Private (requires erp:view)
 * @query { days: number } - Number of days to include (1-90, default 7)
 */
router.get(
  '/integrations/:integrationId/sync-metrics',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await monitoringController.getSyncMetrics(req, res);
  })
);

/**
 * @route GET /api/v1/monitoring/integrations/:integrationId/reconciliation-metrics
 * @desc Get reconciliation performance metrics with optional time period
 * @access Private (requires erp:view)
 * @query { days: number } - Number of days to include (1-90, default 30)
 */
router.get(
  '/integrations/:integrationId/reconciliation-metrics',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await monitoringController.getReconciliationMetrics(req, res);
  })
);

export default router;
