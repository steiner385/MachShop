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
import productionPerformanceExportService from '../services/ProductionPerformanceExportService';
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

    // ✅ GITHUB ISSUE #14 FIX: Enhanced input validation with detailed feedback
    // Handle URL-decoded spaces and empty strings
    const decodedWorkOrderId = decodeURIComponent(workOrderId || '');
    if (!workOrderId || typeof workOrderId !== 'string' || decodedWorkOrderId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Work order ID is required and must be a valid non-empty string',
        details: {
          field: 'workOrderId',
          provided: decodedWorkOrderId,
          expected: 'Non-empty string work order identifier'
        }
      });
    }

    if (!configId || typeof configId !== 'string' || configId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Integration configuration ID is required for B2M export operations',
        details: {
          field: 'configId',
          provided: configId,
          expected: 'Valid integration configuration ID',
          suggestion: 'Use GET /api/v1/integration-configs to list available configurations'
        }
      });
    }

    const result = await productionPerformanceExportService.exportWorkOrderActuals({
      workOrderId: decodedWorkOrderId.trim(),
      configId: configId.trim(),
      createdBy: userId || 'SYSTEM',
    });

    res.status(200).json({
      success: true,
      message: 'Work order actuals exported successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error exporting production performance:', error);

    // ✅ GITHUB ISSUE #14 FIX: Enhanced error response with proper status codes and context
    // Check for specific error types and provide appropriate HTTP status codes
    if (error.message?.includes('not found in the system')) {
      return res.status(404).json({
        success: false,
        error: 'RESOURCE_NOT_FOUND',
        message: error.message,
        context: 'B2M Production Performance Export',
        endpoint: `/api/b2m/production-performance/export/${req.params.workOrderId}`,
        troubleshooting: 'Verify work order ID and ensure the work order exists before attempting export'
      });
    }

    if (error.message?.includes('cannot be exported') || error.message?.includes('has not been completed')) {
      return res.status(422).json({
        success: false,
        error: 'BUSINESS_LOGIC_ERROR',
        message: error.message,
        context: 'B2M Production Performance Export',
        endpoint: `/api/b2m/production-performance/export/${req.params.workOrderId}`,
        troubleshooting: 'Complete the work order execution process before attempting B2M export'
      });
    }

    if (error.message?.includes('Integration config') && error.message?.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'CONFIG_NOT_FOUND',
        message: error.message,
        context: 'B2M Integration Configuration',
        troubleshooting: 'Verify the integration configuration ID and ensure it exists and is enabled'
      });
    }

    if (error.message?.includes('disabled')) {
      return res.status(403).json({
        success: false,
        error: 'CONFIG_DISABLED',
        message: error.message,
        context: 'B2M Integration Configuration',
        troubleshooting: 'Enable the integration configuration or use a different configuration'
      });
    }

    // Generic server error for unexpected issues
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Failed to export production performance data to ERP system',
      context: 'B2M Production Performance Export',
      endpoint: `/api/b2m/production-performance/export/${req.params.workOrderId}`,
      troubleshooting: 'Contact system administrator if the issue persists'
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

    const status = await productionPerformanceExportService.getExportStatus(messageId);

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

    const exports = await productionPerformanceExportService.getWorkOrderExports(workOrderId);

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

    const result = await productionPerformanceExportService.retryExport(messageId, userId || 'SYSTEM');

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

    // ✅ GITHUB ISSUE #14 FIX: Enhanced input validation for material transactions
    const missingFields = [];
    if (!configId) missingFields.push('configId');
    if (!transactionType) missingFields.push('transactionType');
    if (!partId) missingFields.push('partId');
    if (quantity === undefined || quantity === null) missingFields.push('quantity');
    if (!unitOfMeasure) missingFields.push('unitOfMeasure');
    if (!movementType) missingFields.push('movementType');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `Material transaction export requires all mandatory fields to be provided for proper B2M integration`,
        details: {
          missingFields,
          provided: Object.keys(req.body),
          suggestion: 'Ensure all required fields are included in the request body'
        }
      });
    }

    // Validate quantity is a valid number
    const parsedQuantity = parseFloat(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Quantity must be a positive number for material transaction export',
        details: {
          field: 'quantity',
          provided: quantity,
          expected: 'Positive numeric value'
        }
      });
    }

    // Validate unit cost if provided
    let parsedUnitCost: number | undefined;
    if (unitCost !== undefined && unitCost !== null) {
      parsedUnitCost = parseFloat(unitCost);
      if (isNaN(parsedUnitCost) || parsedUnitCost < 0) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Unit cost must be a non-negative number when provided',
          details: {
            field: 'unitCost',
            provided: unitCost,
            expected: 'Non-negative numeric value or null'
          }
        });
      }
    }

    const result = await MaterialTransactionService.exportMaterialTransaction({
      configId,
      transactionType: transactionType as ERPTransactionType,
      partId,
      quantity: parsedQuantity,
      unitOfMeasure,
      fromLocation,
      toLocation,
      workOrderId,
      lotNumber,
      serialNumber,
      unitCost: parsedUnitCost,
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

    // ✅ GITHUB ISSUE #14 FIX: Enhanced error response for material transactions
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'RESOURCE_NOT_FOUND',
        message: error.message,
        context: 'B2M Material Transaction Export',
        troubleshooting: 'Verify all referenced resources (part, work order, locations) exist in the system'
      });
    }

    if (error.message?.includes('Invalid') || error.message?.includes('validation')) {
      return res.status(422).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.message,
        context: 'B2M Material Transaction Export',
        troubleshooting: 'Review transaction data and ensure all values meet system requirements'
      });
    }

    if (error.message?.includes('Integration config') && error.message?.includes('disabled')) {
      return res.status(403).json({
        success: false,
        error: 'CONFIG_DISABLED',
        message: error.message,
        context: 'B2M Integration Configuration'
      });
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Failed to export material transaction to ERP system',
      context: 'B2M Material Transaction Export',
      troubleshooting: 'Contact system administrator if the issue persists'
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
