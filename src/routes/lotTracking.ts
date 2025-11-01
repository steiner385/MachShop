/**
 * Lot Tracking & Serialization API Routes
 * Issue #90: Lot Tracking & Serialization System
 *
 * Endpoints for:
 * - Lot genealogy (splits, merges)
 * - Traceability queries (forward, backward, full)
 * - Lot holds and quarantine
 * - Lot recalls
 * - Serial number generation and assignment
 * - As-built BOM tracking
 */

import { Router, Request, Response } from 'express';
import LotTrackingService from '../services/LotTrackingService';
import SerialNumberService from '../services/SerialNumberService';
import { authenticateRequest, authorizeAction } from '../middleware/auth';

const router = Router();
const lotTrackingService = new LotTrackingService();
const serialNumberService = new SerialNumberService();

// ==================== LOT GENEALOGY ====================

/**
 * Split lot into multiple child lots
 * POST /lot-tracking/lots/:lotId/split
 */
router.post('/lots/:lotId/split', authenticateRequest, authorizeAction('lot_split'), async (req: Request, res: Response) => {
  try {
    const { quantities, operationId, notes } = req.body;

    if (!quantities || !Array.isArray(quantities) || quantities.length === 0) {
      return res.status(400).json({ error: 'Missing required field: quantities (array)' });
    }

    const childLots = await lotTrackingService.splitLot({
      parentLotId: req.params.lotId,
      quantities,
      operationId,
      operatorId: req.user?.id,
      notes,
    });

    res.json({ success: true, data: { childLots, count: childLots.length } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Merge multiple lots into one
 * POST /lot-tracking/lots/merge
 */
router.post('/lots/merge', authenticateRequest, authorizeAction('lot_merge'), async (req: Request, res: Response) => {
  try {
    const { childLotIds, targetQuantity, workOrderId, operationId, notes } = req.body;

    if (!childLotIds || !Array.isArray(childLotIds) || !targetQuantity) {
      return res.status(400).json({ error: 'Missing required fields: childLotIds (array), targetQuantity' });
    }

    const mergedLot = await lotTrackingService.mergeLots({
      childLotIds,
      targetQuantity,
      workOrderId,
      operationId,
      operatorId: req.user?.id,
      notes,
    });

    res.json({ success: true, data: mergedLot });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== TRACEABILITY ====================

/**
 * Get backward traceability
 * GET /lot-tracking/lots/:lotId/backward
 */
router.get('/lots/:lotId/backward', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const depth = parseInt(req.query.depth as string) || 10;
    const traceability = await lotTrackingService.getBackwardTraceability(req.params.lotId, depth);
    res.json({ success: true, data: traceability });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get forward traceability
 * GET /lot-tracking/lots/:lotId/forward
 */
router.get('/lots/:lotId/forward', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const depth = parseInt(req.query.depth as string) || 10;
    const traceability = await lotTrackingService.getForwardTraceability(req.params.lotId, depth);
    res.json({ success: true, data: traceability });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get full genealogy tree
 * GET /lot-tracking/lots/:lotId/genealogy
 */
router.get('/lots/:lotId/genealogy', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const depth = parseInt(req.query.depth as string) || 5;
    const genealogy = await lotTrackingService.getFullGenealogy(req.params.lotId, depth);
    res.json({ success: true, data: genealogy });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get lot genealogy depth
 * GET /lot-tracking/lots/:lotId/depth
 */
router.get('/lots/:lotId/depth', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const depth = await lotTrackingService.getLotGenealogyDepth(req.params.lotId);
    res.json({ success: true, data: depth });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== LOT HOLDS & QUARANTINE ====================

/**
 * Place lot on hold
 * POST /lot-tracking/lots/:lotId/hold
 */
router.post('/lots/:lotId/hold', authenticateRequest, authorizeAction('lot_hold'), async (req: Request, res: Response) => {
  try {
    const { reason, expiryDate } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Missing required field: reason' });
    }

    const lot = await lotTrackingService.placeLotOnHold({
      lotId: req.params.lotId,
      reason,
      heldBy: req.user?.id || 'SYSTEM',
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    });

    res.json({ success: true, data: lot });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Release lot from hold
 * POST /lot-tracking/lots/:lotId/release
 */
router.post('/lots/:lotId/release', authenticateRequest, authorizeAction('lot_release'), async (req: Request, res: Response) => {
  try {
    const { notes } = req.body;

    const lot = await lotTrackingService.releaseLotFromHold(req.params.lotId, req.user?.id || 'SYSTEM', notes);

    res.json({ success: true, data: lot });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get quarantined lots
 * GET /lot-tracking/quarantined
 */
router.get('/quarantined', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const lots = await lotTrackingService.getQuarantinedLots();
    res.json({ success: true, data: lots, count: lots.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== LOT RECALLS ====================

/**
 * Initiate lot recall
 * POST /lot-tracking/recalls
 */
router.post('/recalls', authenticateRequest, authorizeAction('lot_recall'), async (req: Request, res: Response) => {
  try {
    const { initiatingLotId, reason, severity, affectedPartNumbers, estimatedImpact } = req.body;

    if (!initiatingLotId || !reason || !severity) {
      return res.status(400).json({ error: 'Missing required fields: initiatingLotId, reason, severity' });
    }

    const recall = await lotTrackingService.initiateLotRecall({
      initiatingLotId,
      reason,
      severity,
      affectedPartNumbers,
      initiatedBy: req.user?.id || 'SYSTEM',
      estimatedImpact,
    });

    res.json({ success: true, data: recall });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== SERIAL NUMBERS ====================

/**
 * Generate serial numbers
 * POST /lot-tracking/serials/generate
 */
router.post('/serials/generate', authenticateRequest, authorizeAction('serial_generate'), async (req: Request, res: Response) => {
  try {
    const { partId, quantity, lotNumber, workOrderId, formatConfigId } = req.body;

    if (!partId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: partId, quantity' });
    }

    const serials = await serialNumberService.generateSerialNumbers({
      partId,
      quantity,
      lotNumber,
      workOrderId,
      formatConfigId,
    });

    res.json({ success: true, data: serials, count: serials.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Assign serial numbers
 * POST /lot-tracking/serials/assign
 */
router.post('/serials/assign', authenticateRequest, authorizeAction('serial_assign'), async (req: Request, res: Response) => {
  try {
    const { partId, quantity, lotNumber, workOrderId, formatConfigId, locationId } = req.body;

    if (!partId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: partId, quantity' });
    }

    const serialized = await serialNumberService.assignSerialNumbers({
      partId,
      quantity,
      lotNumber,
      workOrderId,
      formatConfigId,
      locationId,
    });

    res.json({ success: true, data: serialized, count: serialized.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get as-built BOM for serial number
 * GET /lot-tracking/serials/:serialNumber/bom
 */
router.get('/serials/:serialNumber/bom', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const bom = await serialNumberService.getAsBuiltBOM(req.params.serialNumber);
    res.json({ success: true, data: bom });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Record component usage in serial (as-built BOM)
 * POST /lot-tracking/serials/:serialNumber/components
 */
router.post('/serials/:serialNumber/components', authenticateRequest, authorizeAction('bom_record'), async (req: Request, res: Response) => {
  try {
    const { componentPartId, componentSerialNumber, quantity, workOrderId, operationId, assemblyDate } = req.body;

    if (!componentPartId || !workOrderId) {
      return res.status(400).json({ error: 'Missing required fields: componentPartId, workOrderId' });
    }

    const genealogy = await serialNumberService.recordComponentUsage({
      serialNumber: req.params.serialNumber,
      componentPartId,
      componentSerialNumber,
      quantity,
      workOrderId,
      operationId,
      assemblyDate: assemblyDate ? new Date(assemblyDate) : undefined,
      operatorId: req.user?.id,
    });

    res.json({ success: true, data: genealogy });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get serial lifecycle
 * GET /lot-tracking/serials/:serialNumber/lifecycle
 */
router.get('/serials/:serialNumber/lifecycle', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const lifecycle = await serialNumberService.getSerialLifecycle(req.params.serialNumber);
    res.json({ success: true, data: lifecycle });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update serial status
 * PATCH /lot-tracking/serials/:serialNumber/status
 */
router.patch('/serials/:serialNumber/status', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Missing required field: status' });
    }

    const updated = await serialNumberService.updateSerialStatus(
      req.params.serialNumber,
      status,
      req.user?.id || 'SYSTEM',
      notes
    );

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Find serials by lot number
 * GET /lot-tracking/serials/by-lot/:lotNumber
 */
router.get('/serials/by-lot/:lotNumber', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const serials = await serialNumberService.findSerialsByLot(req.params.lotNumber);
    res.json({ success: true, data: serials, count: serials.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Find serials by work order
 * GET /lot-tracking/serials/by-workorder/:workOrderId
 */
router.get('/serials/by-workorder/:workOrderId', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const serials = await serialNumberService.findSerialsByWorkOrder(req.params.workOrderId);
    res.json({ success: true, data: serials, count: serials.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get where-used analysis
 * GET /lot-tracking/where-used/:componentPartId
 */
router.get('/where-used/:componentPartId', authenticateRequest, async (req: Request, res: Response) => {
  try {
    const whereUsed = await serialNumberService.getWhereUsed(req.params.componentPartId);
    res.json({ success: true, data: whereUsed });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
