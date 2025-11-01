/**
 * ERP Integration Routes
 * Issue #60: Phase 7 - REST API for ERP Integration Management
 *
 * Routes for managing ERP system integrations, field mappings, sync operations,
 * reconciliation, and discrepancy resolution
 */

import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import ERPController from '../controllers/ERPController';
import { PrismaClient } from '@prisma/client';
import ERPIntegrationService from '../services/erp/ERPIntegrationService';
import { SyncJobScheduler } from '../services/erp/SyncJobScheduler';
import {
  requireERPAccess,
  requireERPModification,
  requireERPSyncPermission,
  requireERPReconciliationPermission,
  requireERPCorrectionPermission,
  syncRateLimiter,
  reconciliationRateLimiter,
  validateERPIntegration,
  erpAuditLogger,
  validateSyncJobRequest,
  validateReconciliationRequest,
} from '../middleware/erpAuth';

const router = express.Router();

// Initialize controller with dependencies
const prisma = new PrismaClient();
const erpService = new ERPIntegrationService(prisma);
const scheduler = new SyncJobScheduler(prisma, erpService);
const erpController = new ERPController(prisma, erpService, scheduler);

// ========================================
// ERP INTEGRATION MANAGEMENT ROUTES
// ========================================

/**
 * @route POST /api/v1/erp/integrations
 * @desc Create a new ERP integration
 * @access Private (requires erp:create)
 * @body { name, erpSystem, config, description }
 */
router.post('/integrations',
  requireERPAccess,
  requireERPModification,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.createIntegration(req, res);
  })
);

/**
 * @route GET /api/v1/erp/integrations
 * @desc List all ERP integrations with pagination
 * @access Private (requires erp:view)
 * @query { limit: number, offset: number }
 */
router.get('/integrations',
  requireERPAccess,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.listIntegrations(req, res);
  })
);

/**
 * @route GET /api/v1/erp/integrations/:id
 * @desc Get ERP integration by ID with related data
 * @access Private (requires erp:view)
 */
router.get('/integrations/:id',
  requireERPAccess,
  validateERPIntegration,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.getIntegration(req, res);
  })
);

/**
 * @route PATCH /api/v1/erp/integrations/:id
 * @desc Update ERP integration configuration
 * @access Private (requires erp:update)
 * @body { updates object }
 */
router.patch('/integrations/:id',
  requireERPAccess,
  requireERPModification,
  validateERPIntegration,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.updateIntegration(req, res);
  })
);

/**
 * @route DELETE /api/v1/erp/integrations/:id
 * @desc Delete ERP integration (fails if active syncs)
 * @access Private (requires erp:delete)
 */
router.delete('/integrations/:id',
  requireERPAccess,
  requireERPModification,
  validateERPIntegration,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.deleteIntegration(req, res);
  })
);

// ========================================
// CONNECTION & CONFIGURATION ROUTES
// ========================================

/**
 * @route POST /api/v1/erp/integrations/:id/test
 * @desc Test connection to ERP system
 * @access Private (requires erp:view)
 */
router.post('/integrations/:id/test',
  requireERPAccess,
  validateERPIntegration,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.testConnection(req, res);
  })
);

/**
 * @route POST /api/v1/erp/integrations/:id/mappings
 * @desc Set field mappings for an entity type
 * @access Private (requires erp:update)
 * @body { entityType: string, mappings: array }
 */
router.post('/integrations/:id/mappings',
  requireERPAccess,
  requireERPModification,
  validateERPIntegration,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.setFieldMappings(req, res);
  })
);

/**
 * @route GET /api/v1/erp/integrations/:id/mappings
 * @desc Get field mappings for an entity type
 * @access Private (requires erp:view)
 * @query { entityType: string }
 */
router.get('/integrations/:id/mappings',
  requireERPAccess,
  validateERPIntegration,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.getFieldMappings(req, res);
  })
);

// ========================================
// SYNC OPERATION ROUTES
// ========================================

/**
 * @route POST /api/v1/erp/integrations/:id/sync
 * @desc Trigger a manual sync job
 * @access Private (requires erp:sync)
 * @body { jobType: string, batchSize?: number, dryRun?: boolean, filters?: object }
 */
router.post('/integrations/:id/sync',
  requireERPAccess,
  requireERPSyncPermission,
  syncRateLimiter,
  validateERPIntegration,
  validateSyncJobRequest,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.triggerSync(req, res);
  })
);

/**
 * @route GET /api/v1/erp/integrations/:id/transactions
 * @desc Get sync transaction log with filtering and pagination
 * @access Private (requires erp:view)
 * @query { limit: number, offset: number, status?: string, entityType?: string }
 */
router.get('/integrations/:id/transactions',
  requireERPAccess,
  validateERPIntegration,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.getSyncTransactions(req, res);
  })
);

/**
 * @route GET /api/v1/erp/integrations/:id/queue-stats
 * @desc Get queue statistics for sync jobs
 * @access Private (requires erp:view)
 */
router.get('/integrations/:id/queue-stats',
  requireERPAccess,
  validateERPIntegration,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.getQueueStats(req, res);
  })
);

// ========================================
// RECONCILIATION ROUTES
// ========================================

/**
 * @route GET /api/v1/erp/integrations/:id/reconciliation/reports
 * @desc Get reconciliation reports with pagination and filtering
 * @access Private (requires erp:view)
 * @query { limit: number, offset: number, entityType?: string }
 */
router.get('/integrations/:id/reconciliation/reports',
  requireERPAccess,
  requireERPReconciliationPermission,
  validateERPIntegration,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.getReconciliationReports(req, res);
  })
);

/**
 * @route POST /api/v1/erp/integrations/:id/reconciliation
 * @desc Trigger reconciliation manually for an entity type
 * @access Private (requires erp:reconciliation)
 * @body { entityType: string }
 */
router.post('/integrations/:id/reconciliation',
  requireERPAccess,
  requireERPReconciliationPermission,
  reconciliationRateLimiter,
  validateERPIntegration,
  validateReconciliationRequest,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.triggerReconciliation(req, res);
  })
);

/**
 * @route GET /api/v1/erp/integrations/:id/discrepancies
 * @desc Get pending discrepancies for an integration
 * @access Private (requires erp:view)
 */
router.get('/integrations/:id/discrepancies',
  requireERPAccess,
  requireERPReconciliationPermission,
  validateERPIntegration,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.getPendingDiscrepancies(req, res);
  })
);

/**
 * @route POST /api/v1/erp/discrepancies/:discrepancyId/correction
 * @desc Apply correction to a discrepancy
 * @access Private (requires erp:correction)
 * @body { action: 'UPDATE_MES' | 'UPDATE_ERP' | 'ACCEPT_DISCREPANCY' }
 */
router.post('/discrepancies/:discrepancyId/correction',
  requireERPAccess,
  requireERPCorrectionPermission,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.applyCorrection(req, res);
  })
);

// ========================================
// SYSTEM/INFO ROUTES
// ========================================

/**
 * @route GET /api/v1/erp/adapters
 * @desc Get available ERP adapters and their statistics
 * @access Private (requires erp:view)
 */
router.get('/adapters',
  requireERPAccess,
  erpAuditLogger,
  asyncHandler(async (req: Request, res: Response) => {
    await erpController.getAvailableAdapters(req, res);
  })
);

// ========================================
// HEALTH CHECK ENDPOINT
// ========================================

/**
 * @route GET /api/v1/erp/health
 * @desc Health check for ERP service
 * @access Public
 */
router.get('/health',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'ERP Integration Service',
      });
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'ERP Integration Service',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

// ========================================
// CLEANUP ON SHUTDOWN
// ========================================

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down ERP service gracefully');
  await scheduler.shutdown();
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down ERP service gracefully');
  await scheduler.shutdown();
  await prisma.$disconnect();
});

export default router;
