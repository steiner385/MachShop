/**
 * B2M Integration API Routes
 * Task 1.8: Level 4 (ERP) Integration Model
 *
 * REST API endpoints for ISA-95 B2M (Business to Manufacturing) integration.
 * Handles bidirectional data exchange between MES (Level 3) and ERP (Level 4)
 *
 * Endpoints:
 * Production Performance:
 * - POST   /api/b2m/production-performance/export/:workOrderId - Export work order actuals to ERP
 * - GET    /api/b2m/production-performance/:messageId         - Get export status
 * - GET    /api/b2m/production-performance/work-order/:id     - Get all exports for work order
 * - POST   /api/b2m/production-performance/:messageId/retry   - Retry failed export
 *
 * Material Transactions:
 * - POST   /api/b2m/material-transactions/export              - Export material transaction to ERP
 * - POST   /api/b2m/material-transactions/inbound             - Process inbound transaction from ERP
 * - GET    /api/b2m/material-transactions/:messageId          - Get transaction status
 * - GET    /api/b2m/material-transactions/part/:partId        - Get part transactions
 * - GET    /api/b2m/material-transactions/work-order/:id      - Get work order transactions
 * - POST   /api/b2m/material-transactions/:messageId/retry    - Retry failed transaction
 * - POST   /api/b2m/material-transactions/bulk-export/:workOrderId - Bulk export work order materials
 *
 * Personnel Information:
 * - POST   /api/b2m/personnel/export                          - Export personnel info to ERP
 * - POST   /api/b2m/personnel/inbound                         - Process inbound personnel info from ERP
 * - GET    /api/b2m/personnel/:messageId                      - Get exchange status
 * - GET    /api/b2m/personnel/user/:userId                    - Get user exchanges
 * - GET    /api/b2m/personnel/external/:externalId            - Get exchanges by external ID
 * - POST   /api/b2m/personnel/:messageId/retry                - Retry failed exchange
 * - POST   /api/b2m/personnel/bulk-sync                       - Bulk sync personnel from ERP
 * - POST   /api/b2m/personnel/sync-all                        - Sync all active users to ERP
 */

import express, { Request, Response } from 'express';
import { PrismaClient, ERPTransactionType, PersonnelActionType } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import ProductionPerformanceExportService from '../services/ProductionPerformanceExportService';
import MaterialTransactionService from '../services/MaterialTransactionService';
import PersonnelInfoSyncService from '../services/PersonnelInfoSyncService';

const router = express.Router();
const prisma = new PrismaClient();

// Require authentication for all B2M routes
router.use(authMiddleware);

// ============================================================================
// Production Performance Endpoints
// ============================================================================

/**
 * POST /api/b2m/production-performance/export/:workOrderId
 * Export work order production actuals to ERP
 */
router.post('/production-performance/export/:workOrderId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { workOrderId } = req.params;
    const { configId } = req.body;
    const userId = (req as any).user?.id;

    if (!configId) {
      return res.status(400).json({ error: 'configId is required' });
    }

    const result = await ProductionPerformanceExportService.exportWorkOrderActuals({
      workOrderId,
      configId,
      createdBy: userId || 'SYSTEM',
    });

    res.status(200).json({
      success: true,
      message: 'Work order actuals exported successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error exporting production performance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export production performance',
    });
  }
});

/**
 * GET /api/b2m/production-performance/:messageId
 * Get production performance export status
 */
router.get('/production-performance/:messageId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { messageId } = req.params;

    const status = await ProductionPerformanceExportService.getExportStatus(messageId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Error fetching export status:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Export not found',
    });
  }
});

/**
 * GET /api/b2m/production-performance/work-order/:workOrderId
 * Get all production performance exports for a work order
 */
router.get('/production-performance/work-order/:workOrderId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { workOrderId } = req.params;

    const exports = await ProductionPerformanceExportService.getWorkOrderExports(workOrderId);

    res.json({
      success: true,
      data: exports,
    });
  } catch (error: any) {
    console.error('Error fetching work order exports:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch exports',
    });
  }
});

/**
 * POST /api/b2m/production-performance/:messageId/retry
 * Retry failed production performance export
 */
router.post('/production-performance/:messageId/retry', async (req: Request, res: Response): Promise<any> => {
  try {
    const { messageId } = req.params;
    const userId = (req as any).user?.id;

    const result = await ProductionPerformanceExportService.retryExport(messageId, userId || 'SYSTEM');

    res.json({
      success: true,
      message: 'Export retried successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error retrying export:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retry export',
    });
  }
});

// ============================================================================
// Material Transaction Endpoints
// ============================================================================

/**
 * POST /api/b2m/material-transactions/export
 * Export material transaction to ERP (MES → ERP)
 */
router.post('/material-transactions/export', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      configId,
      transactionType,
      partId,
      quantity,
      unitOfMeasure,
      fromLocation,
      toLocation,
      workOrderId,
      lotNumber,
      serialNumber,
      unitCost,
      movementType,
      reasonCode,
    } = req.body;
    const userId = (req as any).user?.id;

    // Validate required fields
    if (!configId || !transactionType || !partId || !quantity || !unitOfMeasure || !movementType) {
      return res.status(400).json({
        error: 'Missing required fields: configId, transactionType, partId, quantity, unitOfMeasure, movementType',
      });
    }

    const result = await MaterialTransactionService.exportMaterialTransaction({
      configId,
      transactionType: transactionType as ERPTransactionType,
      partId,
      quantity: parseFloat(quantity),
      unitOfMeasure,
      fromLocation,
      toLocation,
      workOrderId,
      lotNumber,
      serialNumber,
      unitCost: unitCost ? parseFloat(unitCost) : undefined,
      movementType,
      reasonCode,
      createdBy: userId || 'SYSTEM',
    });

    res.status(200).json({
      success: true,
      message: 'Material transaction exported successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error exporting material transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export material transaction',
    });
  }
});

/**
 * POST /api/b2m/material-transactions/inbound
 * Process inbound material transaction from ERP (ERP → MES)
 */
router.post('/material-transactions/inbound', async (req: Request, res: Response): Promise<any> => {
  try {
    const { configId, messagePayload } = req.body;
    const userId = (req as any).user?.id;

    if (!configId || !messagePayload) {
      return res.status(400).json({
        error: 'Missing required fields: configId, messagePayload',
      });
    }

    const result = await MaterialTransactionService.processInboundTransaction({
      configId,
      messagePayload,
      createdBy: userId || 'SYSTEM',
    });

    res.status(200).json({
      success: true,
      message: 'Inbound material transaction processed successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error processing inbound transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process inbound transaction',
    });
  }
});

/**
 * GET /api/b2m/material-transactions/:messageId
 * Get material transaction status
 */
router.get('/material-transactions/:messageId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { messageId } = req.params;

    const status = await MaterialTransactionService.getTransactionStatus(messageId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Error fetching transaction status:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Transaction not found',
    });
  }
});

/**
 * GET /api/b2m/material-transactions/part/:partId
 * Get all material transactions for a part
 */
router.get('/material-transactions/part/:partId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { partId } = req.params;
    const { transactionType, direction, status, startDate, endDate } = req.query;

    const filters: any = {};

    if (transactionType) {
      filters.transactionType = transactionType as ERPTransactionType;
    }

    if (direction) {
      filters.direction = direction;
    }

    if (status) {
      filters.status = status;
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    const transactions = await MaterialTransactionService.getPartTransactions(partId, filters);

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error: any) {
    console.error('Error fetching part transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transactions',
    });
  }
});

/**
 * GET /api/b2m/material-transactions/work-order/:workOrderId
 * Get all material transactions for a work order
 */
router.get('/material-transactions/work-order/:workOrderId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { workOrderId } = req.params;

    const transactions = await MaterialTransactionService.getWorkOrderTransactions(workOrderId);

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error: any) {
    console.error('Error fetching work order transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transactions',
    });
  }
});

/**
 * POST /api/b2m/material-transactions/:messageId/retry
 * Retry failed material transaction
 */
router.post('/material-transactions/:messageId/retry', async (req: Request, res: Response): Promise<any> => {
  try {
    const { messageId } = req.params;
    const userId = (req as any).user?.id;

    const result = await MaterialTransactionService.retryTransaction(messageId, userId || 'SYSTEM');

    res.json({
      success: true,
      message: 'Transaction retried successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error retrying transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retry transaction',
    });
  }
});

/**
 * POST /api/b2m/material-transactions/bulk-export/:workOrderId
 * Bulk export all material transactions for a work order
 */
router.post('/material-transactions/bulk-export/:workOrderId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { workOrderId } = req.params;
    const { configId } = req.body;
    const userId = (req as any).user?.id;

    if (!configId) {
      return res.status(400).json({ error: 'configId is required' });
    }

    const results = await MaterialTransactionService.bulkExportWorkOrderMaterials({
      workOrderId,
      configId,
      createdBy: userId || 'SYSTEM',
    });

    res.json({
      success: true,
      message: `Bulk export completed: ${results.filter(r => r.status === 'PROCESSED').length} successful, ${results.filter(r => r.status === 'FAILED').length} failed`,
      data: results,
    });
  } catch (error: any) {
    console.error('Error bulk exporting materials:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to bulk export materials',
    });
  }
});

// ============================================================================
// Personnel Information Endpoints
// ============================================================================

/**
 * POST /api/b2m/personnel/export
 * Export personnel information to ERP (MES → ERP)
 */
router.post('/personnel/export', async (req: Request, res: Response): Promise<any> => {
  try {
    const { configId, userId: targetUserId, actionType } = req.body;
    const requestingUserId = (req as any).user?.id;

    if (!configId || !targetUserId || !actionType) {
      return res.status(400).json({
        error: 'Missing required fields: configId, userId, actionType',
      });
    }

    const result = await PersonnelInfoSyncService.exportPersonnelInfo({
      configId,
      userId: targetUserId,
      actionType: actionType as PersonnelActionType,
      createdBy: requestingUserId || 'SYSTEM',
    });

    res.status(200).json({
      success: true,
      message: 'Personnel information exported successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error exporting personnel info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export personnel information',
    });
  }
});

/**
 * POST /api/b2m/personnel/inbound
 * Process inbound personnel information from ERP (ERP → MES)
 */
router.post('/personnel/inbound', async (req: Request, res: Response): Promise<any> => {
  try {
    const { configId, messagePayload } = req.body;
    const userId = (req as any).user?.id;

    if (!configId || !messagePayload) {
      return res.status(400).json({
        error: 'Missing required fields: configId, messagePayload',
      });
    }

    const result = await PersonnelInfoSyncService.processInboundPersonnelInfo({
      configId,
      messagePayload,
      createdBy: userId || 'SYSTEM',
    });

    res.status(200).json({
      success: true,
      message: 'Inbound personnel information processed successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error processing inbound personnel info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process inbound personnel information',
    });
  }
});

/**
 * GET /api/b2m/personnel/:messageId
 * Get personnel information exchange status
 */
router.get('/personnel/:messageId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { messageId } = req.params;

    const status = await PersonnelInfoSyncService.getExchangeStatus(messageId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Error fetching exchange status:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Exchange not found',
    });
  }
});

/**
 * GET /api/b2m/personnel/user/:userId
 * Get all personnel exchanges for a user
 */
router.get('/personnel/user/:userId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const { actionType, direction, status, startDate, endDate } = req.query;

    const filters: any = {};

    if (actionType) {
      filters.actionType = actionType as PersonnelActionType;
    }

    if (direction) {
      filters.direction = direction;
    }

    if (status) {
      filters.status = status;
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    const exchanges = await PersonnelInfoSyncService.getUserExchanges(userId, filters);

    res.json({
      success: true,
      data: exchanges,
    });
  } catch (error: any) {
    console.error('Error fetching user exchanges:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch exchanges',
    });
  }
});

/**
 * GET /api/b2m/personnel/external/:externalId
 * Get all personnel exchanges by external personnel ID
 */
router.get('/personnel/external/:externalId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { externalId } = req.params;

    const exchanges = await PersonnelInfoSyncService.getExternalPersonnelExchanges(externalId);

    res.json({
      success: true,
      data: exchanges,
    });
  } catch (error: any) {
    console.error('Error fetching external personnel exchanges:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch exchanges',
    });
  }
});

/**
 * POST /api/b2m/personnel/:messageId/retry
 * Retry failed personnel information exchange
 */
router.post('/personnel/:messageId/retry', async (req: Request, res: Response): Promise<any> => {
  try {
    const { messageId } = req.params;
    const userId = (req as any).user?.id;

    const result = await PersonnelInfoSyncService.retryExchange(messageId, userId || 'SYSTEM');

    res.json({
      success: true,
      message: 'Exchange retried successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error retrying exchange:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retry exchange',
    });
  }
});

/**
 * POST /api/b2m/personnel/bulk-sync
 * Bulk sync personnel from ERP to MES
 */
router.post('/personnel/bulk-sync', async (req: Request, res: Response): Promise<any> => {
  try {
    const { configId, personnelData } = req.body;
    const userId = (req as any).user?.id;

    if (!configId || !personnelData || !Array.isArray(personnelData)) {
      return res.status(400).json({
        error: 'Missing required fields: configId, personnelData (array)',
      });
    }

    const results = await PersonnelInfoSyncService.bulkSyncPersonnel({
      configId,
      personnelData,
      createdBy: userId || 'SYSTEM',
    });

    res.json({
      success: true,
      message: `Bulk sync completed: ${results.filter(r => r.status === 'PROCESSED').length} successful, ${results.filter(r => r.status === 'FAILED').length} failed`,
      data: results,
    });
  } catch (error: any) {
    console.error('Error bulk syncing personnel:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to bulk sync personnel',
    });
  }
});

/**
 * POST /api/b2m/personnel/sync-all
 * Sync all active MES users to ERP
 */
router.post('/personnel/sync-all', async (req: Request, res: Response): Promise<any> => {
  try {
    const { configId } = req.body;
    const userId = (req as any).user?.id;

    if (!configId) {
      return res.status(400).json({ error: 'configId is required' });
    }

    const results = await PersonnelInfoSyncService.syncAllActiveUsers({
      configId,
      createdBy: userId || 'SYSTEM',
    });

    res.json({
      success: true,
      message: `Sync all completed: ${results.filter(r => r.status === 'PROCESSED').length} successful, ${results.filter(r => r.status === 'FAILED').length} failed`,
      data: results,
    });
  } catch (error: any) {
    console.error('Error syncing all users:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync all users',
    });
  }
});

export default router;
