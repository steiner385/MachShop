import express from 'express';
import { requireProductionAccess } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import MaterialService from '../services/MaterialService';

const router = express.Router();

// ========================================
// MATERIAL CLASS ROUTES
// ========================================

/**
 * @route GET /api/v1/materials/classes
 * @desc Get all material classes
 * @access Private
 */
router.get('/classes',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const includeRelations = req.query.includeRelations === 'true';
    const classes = await MaterialService.getAllMaterialClasses(includeRelations);
    return res.status(200).json(classes);
  })
);

/**
 * @route GET /api/v1/materials/classes/:id
 * @desc Get material class by ID
 * @access Private
 */
router.get('/classes/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const includeRelations = req.query.includeRelations === 'true';
    const materialClass = await MaterialService.getMaterialClassById(req.params.id, includeRelations);

    if (!materialClass) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Material class with ID ${req.params.id} not found`
      });
    }

    return res.status(200).json(materialClass);
  })
);

/**
 * @route GET /api/v1/materials/classes/:id/hierarchy
 * @desc Get material class hierarchy (parent chain)
 * @access Private
 */
router.get('/classes/:id/hierarchy',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const hierarchy = await MaterialService.getMaterialClassHierarchy(req.params.id);
    return res.status(200).json(hierarchy);
  })
);

/**
 * @route GET /api/v1/materials/classes/:id/children
 * @desc Get child material classes
 * @access Private
 */
router.get('/classes/:id/children',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const children = await MaterialService.getChildMaterialClasses(req.params.id);
    return res.status(200).json(children);
  })
);

// ========================================
// MATERIAL DEFINITION ROUTES
// ========================================

/**
 * @route GET /api/v1/materials/definitions
 * @desc Get all material definitions with optional filtering
 * @access Private
 * @query materialClassId - Filter by material class
 * @query materialType - Filter by material type (RAW_MATERIAL, COMPONENT, WIP, FINISHED_GOOD, CONSUMABLE, PACKAGING, TOOLING)
 * @query includeRelations - Include related data
 */
router.get('/definitions',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { materialClassId, materialType, includeRelations } = req.query;

    const filters: any = {};
    if (materialClassId) filters.materialClassId = materialClassId as string;
    if (materialType) filters.materialType = materialType as string;

    const definitions = await MaterialService.getAllMaterialDefinitions(
      filters,
      includeRelations === 'true'
    );

    return res.status(200).json(definitions);
  })
);

/**
 * @route GET /api/v1/materials/definitions/:id
 * @desc Get material definition by ID
 * @access Private
 */
router.get('/definitions/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const includeRelations = req.query.includeRelations === 'true';
    const material = await MaterialService.getMaterialDefinitionById(req.params.id, includeRelations);

    if (!material) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Material definition with ID ${req.params.id} not found`
      });
    }

    return res.status(200).json(material);
  })
);

/**
 * @route GET /api/v1/materials/definitions/number/:materialNumber
 * @desc Get material definition by material number
 * @access Private
 */
router.get('/definitions/number/:materialNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const includeRelations = req.query.includeRelations === 'true';
    const material = await MaterialService.getMaterialDefinitionByNumber(
      req.params.materialNumber,
      includeRelations
    );

    if (!material) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Material with number ${req.params.materialNumber} not found`
      });
    }

    return res.status(200).json(material);
  })
);

/**
 * @route PUT /api/v1/materials/definitions/:id
 * @desc Update material definition
 * @access Private
 */
router.put('/definitions/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const updatedMaterial = await MaterialService.updateMaterialDefinition(req.params.id, req.body);
    return res.status(200).json(updatedMaterial);
  })
);

// ========================================
// MATERIAL PROPERTY ROUTES
// ========================================

/**
 * @route GET /api/v1/materials/definitions/:materialId/properties
 * @desc Get properties for a material definition
 * @access Private
 */
router.get('/definitions/:materialId/properties',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const properties = await MaterialService.getMaterialProperties(req.params.materialId);
    return res.status(200).json(properties);
  })
);

/**
 * @route POST /api/v1/materials/properties
 * @desc Create material property
 * @access Private
 */
router.post('/properties',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const property = await MaterialService.createMaterialProperty(req.body);
    return res.status(201).json(property);
  })
);

// ========================================
// MATERIAL LOT ROUTES
// ========================================

/**
 * @route GET /api/v1/materials/lots
 * @desc Get all material lots with optional filtering
 * @access Private
 * @query materialId - Filter by material definition
 * @query status - Filter by lot status (AVAILABLE, CONSUMED, SCRAPPED, QUARANTINE, EXPIRED)
 * @query state - Filter by lot state (RECEIVED, INSPECTED, APPROVED, QUARANTINED, ISSUED, CONSUMED, SCRAPPED)
 * @query qualityStatus - Filter by quality status (PENDING, APPROVED, REJECTED, ON_HOLD)
 * @query includeRelations - Include related data
 */
router.get('/lots',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { materialId, status, state, qualityStatus, includeRelations } = req.query;

    const filters: any = {};
    if (materialId) filters.materialId = materialId as string;
    if (status) filters.status = status as string;
    if (state) filters.state = state as string;
    if (qualityStatus) filters.qualityStatus = qualityStatus as string;

    const lots = await MaterialService.getAllMaterialLots(
      filters,
      includeRelations === 'true'
    );

    return res.status(200).json(lots);
  })
);

/**
 * @route GET /api/v1/materials/lots/:id
 * @desc Get material lot by ID
 * @access Private
 */
router.get('/lots/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const includeRelations = req.query.includeRelations === 'true';
    const lot = await MaterialService.getMaterialLotById(req.params.id, includeRelations);

    if (!lot) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Material lot with ID ${req.params.id} not found`
      });
    }

    return res.status(200).json(lot);
  })
);

/**
 * @route GET /api/v1/materials/lots/number/:lotNumber
 * @desc Get material lot by lot number
 * @access Private
 */
router.get('/lots/number/:lotNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const includeRelations = req.query.includeRelations === 'true';
    const lot = await MaterialService.getMaterialLotByNumber(req.params.lotNumber, includeRelations);

    if (!lot) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Material lot with number ${req.params.lotNumber} not found`
      });
    }

    return res.status(200).json(lot);
  })
);

/**
 * @route PUT /api/v1/materials/lots/:id
 * @desc Update material lot
 * @access Private
 */
router.put('/lots/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const updatedLot = await MaterialService.updateMaterialLot(req.params.id, req.body);
    return res.status(200).json(updatedLot);
  })
);

/**
 * @route GET /api/v1/materials/lots/expiring/soon
 * @desc Get lots expiring within specified days
 * @access Private
 * @query daysAhead - Number of days to look ahead (default: 30)
 */
router.get('/lots/expiring/soon',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const daysAhead = parseInt(req.query.daysAhead as string) || 30;
    const expiringLots = await MaterialService.getExpiringLots(daysAhead);
    return res.status(200).json(expiringLots);
  })
);

/**
 * @route GET /api/v1/materials/lots/expired/all
 * @desc Get all expired lots
 * @access Private
 */
router.get('/lots/expired/all',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const expiredLots = await MaterialService.getExpiredLots();
    return res.status(200).json(expiredLots);
  })
);

/**
 * @route GET /api/v1/materials/lots/statistics/summary
 * @desc Get material lot statistics
 * @access Private
 */
router.get('/lots/statistics/summary',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const stats = await MaterialService.getMaterialLotStatistics();
    return res.status(200).json(stats);
  })
);

// ========================================
// MATERIAL SUBLOT ROUTES
// ========================================

/**
 * @route GET /api/v1/materials/lots/:lotId/sublots
 * @desc Get sublots for a material lot
 * @access Private
 */
router.get('/lots/:lotId/sublots',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const sublots = await MaterialService.getMaterialSublots(req.params.lotId);
    return res.status(200).json(sublots);
  })
);

/**
 * @route POST /api/v1/materials/lots/:lotId/split
 * @desc Split material lot into sublot
 * @access Private
 * @body sublotNumber - Sublot identifier
 * @body quantity - Quantity to split
 * @body workOrderId - Optional work order ID
 */
router.post('/lots/:lotId/split',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { sublotNumber, quantity, workOrderId } = req.body;

    if (!sublotNumber || !quantity) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'sublotNumber and quantity are required'
      });
    }

    const sublot = await MaterialService.splitMaterialLot({
      parentLotId: req.params.lotId,
      sublotNumber,
      quantity: parseFloat(quantity),
      workOrderId
    });

    return res.status(201).json(sublot);
  })
);

/**
 * @route POST /api/v1/materials/lots/merge
 * @desc Merge multiple sublots back into parent lot
 * @access Private
 * @body sublotIds - Array of sublot IDs to merge
 * @body workOrderId - Optional work order ID
 */
router.post('/lots/merge',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { sublotIds, workOrderId } = req.body;

    if (!sublotIds || !Array.isArray(sublotIds) || sublotIds.length === 0) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'sublotIds array is required'
      });
    }

    const result = await MaterialService.mergeMaterialSublots({
      sublotIds,
      workOrderId
    });

    return res.status(200).json(result);
  })
);

// ========================================
// MATERIAL GENEALOGY ROUTES
// ========================================

/**
 * @route GET /api/v1/materials/lots/:lotId/genealogy
 * @desc Get material lot genealogy (direct parents and children)
 * @access Private
 */
router.get('/lots/:lotId/genealogy',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const genealogy = await MaterialService.getLotGenealogy(req.params.lotId);
    return res.status(200).json(genealogy);
  })
);

/**
 * @route GET /api/v1/materials/lots/:lotId/genealogy/tree
 * @desc Get full genealogy tree (recursive traceability)
 * @access Private
 * @query direction - forward (consumed materials) or backward (produced materials) (default: forward)
 */
router.get('/lots/:lotId/genealogy/tree',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const direction = (req.query.direction as 'forward' | 'backward') || 'forward';
    const tree = await MaterialService.getFullGenealogyTree(req.params.lotId, direction);
    return res.status(200).json(tree);
  })
);

/**
 * @route POST /api/v1/materials/genealogy
 * @desc Create material genealogy record (record material consumption/production)
 * @access Private
 * @body parentLotId - Parent lot ID (material consumed)
 * @body childLotId - Child lot ID (material produced)
 * @body relationshipType - CONSUMED_BY, PRODUCED_FROM, TRANSFORMED_INTO, SPLIT_FROM, MERGED_INTO
 * @body quantityConsumed - Quantity consumed from parent
 * @body quantityProduced - Quantity produced in child
 * @body workOrderId - Work order ID
 * @body operationId - Optional operation ID
 * @body processDate - Process timestamp
 */
router.post('/genealogy',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const {
      parentLotId,
      childLotId,
      relationshipType,
      quantityConsumed,
      quantityProduced,
      workOrderId,
      operationId,
      processDate
    } = req.body;

    if (!parentLotId || !childLotId || !relationshipType || !quantityConsumed || !quantityProduced || !workOrderId) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'parentLotId, childLotId, relationshipType, quantityConsumed, quantityProduced, and workOrderId are required'
      });
    }

    const genealogy = await MaterialService.createGenealogyRecord({
      parentLotId,
      childLotId,
      relationshipType,
      quantityConsumed: parseFloat(quantityConsumed),
      quantityProduced: parseFloat(quantityProduced),
      workOrderId,
      operationId,
      processDate: processDate ? new Date(processDate) : new Date()
    });

    return res.status(201).json(genealogy);
  })
);

// ========================================
// MATERIAL STATE MANAGEMENT ROUTES
// ========================================

/**
 * @route GET /api/v1/materials/lots/:lotId/history
 * @desc Get state transition history for material lot
 * @access Private
 */
router.get('/lots/:lotId/history',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const history = await MaterialService.getLotStateHistory(req.params.lotId);
    return res.status(200).json(history);
  })
);

/**
 * @route PUT /api/v1/materials/lots/:lotId/state
 * @desc Update material lot state (with automatic history tracking)
 * @access Private
 * @body state - New state (RECEIVED, INSPECTED, APPROVED, QUARANTINED, ISSUED, CONSUMED, SCRAPPED)
 * @body transitionType - RECEIVE, INSPECT, APPROVE, REJECT, QUARANTINE, RELEASE, ISSUE, CONSUME, SCRAP, TRANSFER, RETURN
 * @body userId - User performing the transition
 * @body reason - Optional reason for state change
 * @body workOrderId - Optional work order ID
 */
router.put('/lots/:lotId/state',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { state, transitionType, userId, reason, workOrderId } = req.body;

    if (!state || !transitionType || !userId) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'state, transitionType, and userId are required'
      });
    }

    const updatedLot = await MaterialService.updateLotState({
      lotId: req.params.lotId,
      newState: state,
      transitionType,
      userId,
      reason,
      workOrderId
    });

    return res.status(200).json(updatedLot);
  })
);

// ========================================
// QUALITY MANAGEMENT ROUTES
// ========================================

/**
 * @route POST /api/v1/materials/lots/:lotId/quarantine
 * @desc Quarantine material lot (quality hold)
 * @access Private
 * @body userId - User ID placing quarantine
 * @body reason - Reason for quarantine
 */
router.post('/lots/:lotId/quarantine',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { userId, reason } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'userId and reason are required'
      });
    }

    const quarantinedLot = await MaterialService.quarantineLot(req.params.lotId, userId, reason);
    return res.status(200).json(quarantinedLot);
  })
);

/**
 * @route POST /api/v1/materials/lots/:lotId/release
 * @desc Release material lot from quarantine
 * @access Private
 * @body userId - User ID releasing from quarantine
 * @body reason - Reason for release
 */
router.post('/lots/:lotId/release',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { userId, reason } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'userId and reason are required'
      });
    }

    const releasedLot = await MaterialService.releaseLot(req.params.lotId, userId, reason);
    return res.status(200).json(releasedLot);
  })
);

/**
 * @route POST /api/v1/materials/lots/:lotId/reject
 * @desc Reject material lot (quality failure)
 * @access Private
 * @body userId - User ID rejecting the lot
 * @body reason - Reason for rejection
 */
router.post('/lots/:lotId/reject',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { userId, reason } = req.body;

    if (!userId || !reason) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'userId and reason are required'
      });
    }

    const rejectedLot = await MaterialService.rejectLot(req.params.lotId, userId, reason);
    return res.status(200).json(rejectedLot);
  })
);

// ========================================
// WORK ORDER INTEGRATION ROUTES
// ========================================

/**
 * @route GET /api/v1/materials/work-orders/:workOrderId/usage
 * @desc Get material usage for work order
 * @access Private
 */
router.get('/work-orders/:workOrderId/usage',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const usage = await MaterialService.getMaterialUsageByWorkOrder(req.params.workOrderId);
    return res.status(200).json(usage);
  })
);

// ========================================
// LEGACY ROUTES (for backward compatibility)
// ========================================

/**
 * @route GET /api/v1/materials/inventory
 * @desc Get inventory levels (legacy route - redirects to lots)
 * @access Private
 */
router.get('/inventory',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const lots = await MaterialService.getAllMaterialLots({}, true);
    return res.status(200).json(lots);
  })
);

/**
 * @route POST /api/v1/materials/consumption
 * @desc Record material consumption (legacy route)
 * @access Private
 */
router.post('/consumption',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { lotId, quantity, workOrderId, userId } = req.body;

    if (!lotId || !quantity || !workOrderId || !userId) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'lotId, quantity, workOrderId, and userId are required'
      });
    }

    // Update lot state to CONSUMED
    const updatedLot = await MaterialService.updateLotState({
      lotId,
      newState: 'CONSUMED',
      transitionType: 'CONSUME',
      userId,
      reason: `Consumed ${quantity} for work order ${workOrderId}`,
      workOrderId
    });

    return res.status(201).json({
      id: updatedLot.id,
      message: 'Material consumption recorded',
      lot: updatedLot
    });
  })
);

export default router;
