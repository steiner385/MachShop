/**
 * OSP (Outside Processing/Farmout) Routes
 * Issue #59: Core OSP/Farmout Operations Management System
 */

import { Router, Request, Response } from 'express';
import OSPService from '../services/OSPService';
import OSPShipmentService from '../services/OSPShipmentService';
import SupplierPerformanceService from '../services/SupplierPerformanceService';
import { logger } from '../utils/logger';

const router = Router();
const ospService = new OSPService();
const shipmentService = new OSPShipmentService();
const performanceService = new SupplierPerformanceService();

// ============================================================================
// OSP Operation Endpoints
// ============================================================================

/**
 * POST /osp/operations
 * Create a new OSP operation
 */
router.post('/operations', async (req: Request, res: Response) => {
  try {
    const result = await ospService.createOSPOperation(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to create OSP operation:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create OSP operation'
    });
  }
});

/**
 * GET /osp/operations/:ospId
 * Get OSP operation by ID
 */
router.get('/operations/:ospId', async (req: Request, res: Response) => {
  try {
    const result = await ospService.getOSPOperation(req.params.ospId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to get OSP operation:', error);
    res.status(404).json({
      success: false,
      error: 'OSP operation not found'
    });
  }
});

/**
 * PUT /osp/operations/:ospId
 * Update OSP operation
 */
router.put('/operations/:ospId', async (req: Request, res: Response) => {
  try {
    const result = await ospService.updateOSPOperation(req.params.ospId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to update OSP operation:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update OSP operation'
    });
  }
});

/**
 * GET /osp/operations
 * List OSP operations by status or for a supplier
 */
router.get('/operations', async (req: Request, res: Response) => {
  try {
    const { status, vendorId, workOrderId, limit = 50 } = req.query;

    let results;

    if (vendorId) {
      results = await ospService.getSupplierOSPOperations(
        vendorId as string,
        status as any
      );
    } else if (workOrderId) {
      results = await ospService.getWorkOrderOSPOperations(workOrderId as string);
    } else if (status) {
      results = await ospService.getOSPOperationsByStatus(status as any, parseInt(limit as string) || 50);
    } else {
      results = [];
    }

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Failed to list OSP operations:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list OSP operations'
    });
  }
});

/**
 * POST /osp/operations/:ospId/transition
 * Transition OSP operation status
 */
router.post('/operations/:ospId/transition', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const result = await ospService.transitionStatus(req.params.ospId, status);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to transition OSP operation status:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transition status'
    });
  }
});

/**
 * POST /osp/operations/:ospId/cancel
 * Cancel an OSP operation
 */
router.post('/operations/:ospId/cancel', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const result = await ospService.cancelOSPOperation(req.params.ospId, reason);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to cancel OSP operation:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel OSP operation'
    });
  }
});

/**
 * GET /osp/candidates
 * Get OSP operation candidates
 */
router.get('/candidates', async (req: Request, res: Response) => {
  try {
    const candidates = await ospService.getOSPCandidates();
    res.json({ success: true, data: candidates });
  } catch (error) {
    logger.error('Failed to get OSP candidates:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get OSP candidates'
    });
  }
});

// ============================================================================
// OSP Shipment Endpoints
// ============================================================================

/**
 * POST /osp/shipments
 * Create a new shipment
 */
router.post('/shipments', async (req: Request, res: Response) => {
  try {
    const result = await shipmentService.createShipment(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to create shipment:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create shipment'
    });
  }
});

/**
 * GET /osp/shipments/:shipmentId
 * Get shipment by ID
 */
router.get('/shipments/:shipmentId', async (req: Request, res: Response) => {
  try {
    const result = await shipmentService.getShipment(req.params.shipmentId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to get shipment:', error);
    res.status(404).json({
      success: false,
      error: 'Shipment not found'
    });
  }
});

/**
 * PUT /osp/shipments/:shipmentId
 * Update shipment
 */
router.put('/shipments/:shipmentId', async (req: Request, res: Response) => {
  try {
    const result = await shipmentService.updateShipment(req.params.shipmentId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to update shipment:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update shipment'
    });
  }
});

/**
 * GET /osp/shipments
 * List shipments by status or operation
 */
router.get('/shipments', async (req: Request, res: Response) => {
  try {
    const { status, ospOperationId, supplierId, direction } = req.query;

    let results;

    if (ospOperationId) {
      results = await shipmentService.getOSPOperationShipments(ospOperationId as string);
    } else if (status) {
      results = await shipmentService.getShipmentsByStatus(status as any);
    } else if (supplierId && direction === 'inbound') {
      results = await shipmentService.getInboundShipments(supplierId as string);
    } else if (supplierId && direction === 'outbound') {
      results = await shipmentService.getOutboundShipments(supplierId as string);
    } else {
      results = [];
    }

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Failed to list shipments:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list shipments'
    });
  }
});

/**
 * POST /osp/shipments/:shipmentId/mark-shipped
 * Mark shipment as shipped
 */
router.post('/shipments/:shipmentId/mark-shipped', async (req: Request, res: Response) => {
  try {
    const { trackingNumber, carrierName } = req.body;
    const result = await shipmentService.markShipped(req.params.shipmentId, trackingNumber, carrierName);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to mark shipment as shipped:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark shipment as shipped'
    });
  }
});

/**
 * POST /osp/shipments/:shipmentId/mark-received
 * Mark shipment as received
 */
router.post('/shipments/:shipmentId/mark-received', async (req: Request, res: Response) => {
  try {
    const result = await shipmentService.markReceived(req.params.shipmentId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to mark shipment as received:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark shipment as received'
    });
  }
});

/**
 * GET /osp/shipments/track/:trackingNumber
 * Track shipment by tracking number
 */
router.get('/shipments/track/:trackingNumber', async (req: Request, res: Response) => {
  try {
    const result = await shipmentService.getShipmentByTracking(req.params.trackingNumber);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Shipment not found' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to track shipment:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to track shipment'
    });
  }
});

// ============================================================================
// Supplier Performance Endpoints
// ============================================================================

/**
 * POST /osp/suppliers/:vendorId/metrics
 * Record supplier performance metrics
 */
router.post('/suppliers/:vendorId/metrics', async (req: Request, res: Response) => {
  try {
    const result = await performanceService.recordMetrics({
      vendorId: req.params.vendorId,
      ...req.body
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to record metrics:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record metrics'
    });
  }
});

/**
 * GET /osp/suppliers/:vendorId/metrics
 * Get supplier metrics
 */
router.get('/suppliers/:vendorId/metrics', async (req: Request, res: Response) => {
  try {
    const results = await performanceService.getSupplierAllMetrics(req.params.vendorId);
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Failed to get supplier metrics:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get metrics'
    });
  }
});

/**
 * GET /osp/suppliers/:vendorId/scorecard
 * Get supplier performance scorecard
 */
router.get('/suppliers/:vendorId/scorecard', async (req: Request, res: Response) => {
  try {
    const result = await performanceService.getSupplierScorecard(req.params.vendorId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed to get supplier scorecard:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get scorecard'
    });
  }
});

/**
 * GET /osp/suppliers/rankings
 * Get supplier rankings
 */
router.get('/suppliers/rankings', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const results = await performanceService.rankSuppliers(parseInt(limit as string) || 20);
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Failed to get supplier rankings:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get rankings'
    });
  }
});

/**
 * POST /osp/suppliers/:vendorId/calculate-metrics
 * Calculate metrics from OSP operations
 */
router.post('/suppliers/:vendorId/calculate-metrics', async (req: Request, res: Response) => {
  try {
    const { metricType = 'MONTHLY' } = req.body;
    await performanceService.calculateFromOSPOperations(req.params.vendorId, metricType);
    res.json({ success: true, message: 'Metrics calculated' });
  } catch (error) {
    logger.error('Failed to calculate metrics:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate metrics'
    });
  }
});

export default router;
