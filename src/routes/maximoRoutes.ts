/**
 * IBM Maximo CMMS Integration Routes
 *
 * AS9100 Clause 7.1.3: Infrastructure
 * REST API endpoints for IBM Maximo CMMS integration.
 *
 * Endpoints:
 * - POST   /api/maximo/sync-work-orders         - Sync work orders from Maximo
 * - POST   /api/maximo/work-order-status        - Push work order status to Maximo
 * - POST   /api/maximo/create-cm-work-order     - Create corrective maintenance work order
 * - GET    /api/maximo/equipment/:assetnum/history - Get equipment maintenance history
 * - GET    /api/maximo/work-order/:wonum        - Get work order details
 * - GET    /api/maximo/health                   - Get Maximo connection health
 */

import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getIntegrationManager } from '../services/IntegrationManager';
import { IBMMaximoAdapter } from '../services/IBMMaximoAdapter';

const router = express.Router();

// Require authentication for all routes
router.use(authMiddleware);

/**
 * POST /api/maximo/sync-work-orders
 * Sync work orders from Maximo to MES
 */
router.post('/sync-work-orders', async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, worktype, dateFrom, dateTo } = req.body;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMMS') as IBMMaximoAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Maximo adapter not configured' });
    }

    const filters: any = {};
    if (status) filters.status = Array.isArray(status) ? status : [status];
    if (worktype) filters.worktype = Array.isArray(worktype) ? worktype : [worktype];
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    const result = await adapter.syncWorkOrdersFromMaximo(filters);

    res.json({
      message: `Synced work orders from Maximo`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error syncing work orders from Maximo:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync work orders from Maximo',
    });
  }
});

/**
 * POST /api/maximo/work-order-status
 * Push work order status update to Maximo
 */
router.post('/work-order-status', async (req: Request, res: Response): Promise<any> => {
  try {
    const { wonum, status, actualStart, actualFinish } = req.body;

    if (!wonum || !status) {
      return res.status(400).json({ error: 'Missing required fields: wonum, status' });
    }

    const validStatuses = ['INPRG', 'COMP', 'CLOSE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMMS') as IBMMaximoAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Maximo adapter not configured' });
    }

    const success = await adapter.pushWorkOrderStatus(
      wonum,
      status,
      actualStart ? new Date(actualStart) : undefined,
      actualFinish ? new Date(actualFinish) : undefined
    );

    if (success) {
      res.json({
        success: true,
        message: `Work order ${wonum} status updated to ${status}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update work order status',
      });
    }
  } catch (error: any) {
    console.error('Error updating work order status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update work order status',
    });
  }
});

/**
 * POST /api/maximo/create-cm-work-order
 * Create corrective maintenance work order in Maximo
 */
router.post('/create-cm-work-order', async (req: Request, res: Response): Promise<any> => {
  try {
    const { assetnum, description, failureCode, priority } = req.body;

    if (!assetnum || !description) {
      return res.status(400).json({
        error: 'Missing required fields: assetnum, description',
      });
    }

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMMS') as IBMMaximoAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Maximo adapter not configured' });
    }

    const wonum = await adapter.createCorrectiveMaintenanceWorkOrder(
      assetnum,
      description,
      failureCode,
      priority || 1
    );

    res.status(201).json({
      success: true,
      message: 'Corrective maintenance work order created',
      wonum,
    });
  } catch (error: any) {
    console.error('Error creating CM work order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create corrective maintenance work order',
    });
  }
});

/**
 * GET /api/maximo/equipment/:assetnum/history
 * Get equipment maintenance history from Maximo
 */
router.get('/equipment/:assetnum/history', async (req: Request, res: Response): Promise<any> => {
  try {
    const { assetnum } = req.params;
    const { dateFrom, dateTo } = req.query;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMMS') as IBMMaximoAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Maximo adapter not configured' });
    }

    const history = await adapter.getEquipmentMaintenanceHistory(
      assetnum,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    res.json({
      success: true,
      assetnum,
      history,
      count: history.length,
    });
  } catch (error: any) {
    console.error('Error fetching equipment maintenance history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch equipment maintenance history',
    });
  }
});

/**
 * GET /api/maximo/work-order/:wonum
 * Get work order details from Maximo
 */
router.get('/work-order/:wonum', async (req: Request, res: Response): Promise<any> => {
  try {
    const { wonum } = req.params;

    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMMS') as IBMMaximoAdapter | undefined;

    if (!adapter) {
      return res.status(400).json({ error: 'Maximo adapter not configured' });
    }

    const workOrder = await (adapter as any).getWorkOrderDetails(wonum);

    if (!workOrder) {
      return res.status(404).json({
        success: false,
        error: `Work order ${wonum} not found`,
      });
    }

    res.json({
      success: true,
      workOrder,
    });
  } catch (error: any) {
    console.error('Error fetching work order details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch work order details',
    });
  }
});

/**
 * GET /api/maximo/health
 * Get Maximo adapter health status
 */
router.get('/health', async (req: Request, res: Response): Promise<any> => {
  try {
    const manager = getIntegrationManager();
    const adapter = await manager.getAdapterByType('CMMS') as IBMMaximoAdapter | undefined;

    if (!adapter) {
      return res.json({
        connected: false,
        error: 'Maximo adapter not configured',
      });
    }

    const health = await adapter.getHealthStatus();

    res.json(health);
  } catch (error: any) {
    console.error('Error checking Maximo health:', error);
    res.status(500).json({
      connected: false,
      error: error.message || 'Failed to check health',
    });
  }
});

export default router;
