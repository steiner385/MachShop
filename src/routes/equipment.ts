import express from 'express';
import { z } from 'zod';
import prisma from '../lib/database';
import { requireMaintenanceAccess, requireSiteAccess } from '../middleware/auth';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { auditLogger } from '../middleware/requestLogger';
import { logger } from '../utils/logger';
import EquipmentService from '../services/EquipmentService';
import OEECalculationService from '../services/OEECalculationService';
import { EquipmentClass, EquipmentState, PerformancePeriodType } from '@prisma/client';

const router = express.Router();

// Validation schemas
const querySchema = z.object({
  status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'DOWN', 'AVAILABLE']).optional(),
  equipmentClass: z.enum(['PRODUCTION', 'QUALITY', 'MATERIAL_HANDLING', 'STORAGE', 'TRANSPORT', 'PACKAGING']).optional(),
  equipmentType: z.string().optional(),
  type: z.string().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  siteId: z.string().optional(),
  areaId: z.string().optional(),
  workCenterId: z.string().optional(),
  parentEquipmentId: z.string().optional(),
  includeRelations: z.enum(['true', 'false']).optional()
});

const updateStatusSchema = z.object({
  status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'DOWN']),
  notes: z.string().optional()
});

const scheduleMaintenanceSchema = z.object({
  maintenanceDate: z.string().datetime(),
  notes: z.string().optional()
});

/**
 * @route GET /api/v1/equipment
 * @desc Get equipment list with filtering and pagination
 * @access Private
 */
router.get('/',
  requireMaintenanceAccess,
  requireSiteAccess,
  asyncHandler(async (req, res) => {
    // Validate query parameters
    const validationResult = querySchema.safeParse(req.query);
    if (!validationResult.success) {
      throw new ValidationError('Invalid query parameters', validationResult.error.errors);
    }

    const {
      status,
      equipmentClass,
      equipmentType,
      type,
      search,
      page = 1,
      limit = 20,
      siteId,
      areaId,
      workCenterId,
      parentEquipmentId,
      includeRelations
    } = validationResult.data;

    // Build filters object for EquipmentService
    const filters: any = {};
    if (status) filters.status = status;
    if (equipmentClass) filters.equipmentClass = equipmentClass;
    if (equipmentType) filters.equipmentType = equipmentType;
    if (type) filters.equipmentType = type; // legacy support
    if (siteId) filters.siteId = siteId;
    if (areaId) filters.areaId = areaId;
    if (workCenterId) filters.workCenterId = workCenterId;
    if (search) filters.search = search;

    // Handle parentEquipmentId (null or specific ID)
    if (parentEquipmentId !== undefined) {
      filters.parentEquipmentId = parentEquipmentId === 'null' ? null : parentEquipmentId;
    }

    // Get equipment using service
    const result = await EquipmentService.getAllEquipment(filters, {
      skip: (page - 1) * limit,
      take: limit,
      includeRelations: includeRelations === 'true'
    });

    const totalPages = Math.ceil(result.total / limit);

    logger.info('Equipment list retrieved', {
      userId: req.user?.id,
      total: result.total,
      page,
      limit,
      filters
    });

    return res.status(200).json({
      equipment: result.equipment,
      total: result.total,
      page,
      limit,
      totalPages
    });
  })
);

/**
 * @route GET /api/v1/equipment/:id
 * @desc Get equipment by ID
 * @access Private
 */
router.get('/:id',
  requireMaintenanceAccess,
  requireSiteAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { includeRelations } = req.query;

    // Use EquipmentService which includes all relations by default
    const equipment = await EquipmentService.getEquipmentById(id);

    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }

    logger.info('Equipment retrieved', {
      userId: req.user?.id,
      equipmentId: id,
      equipmentName: equipment.name
    });

    return res.status(200).json(equipment);
  })
);

/**
 * @route POST /api/v1/equipment
 * @desc Create new equipment
 * @access Private
 */
router.post('/',
  requireMaintenanceAccess,
  requireSiteAccess,
  auditLogger('equipment', 'CREATE'),
  asyncHandler(async (req, res) => {
    const equipment = await EquipmentService.createEquipment(req.body);

    logger.info('Equipment created', {
      userId: req.user?.id,
      equipmentId: equipment.id,
      equipmentNumber: equipment.equipmentNumber
    });

    return res.status(201).json(equipment);
  })
);

/**
 * @route PUT /api/v1/equipment/:id
 * @desc Update equipment
 * @access Private
 */
router.put('/:id',
  requireMaintenanceAccess,
  requireSiteAccess,
  auditLogger('equipment', 'UPDATE'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const equipment = await EquipmentService.updateEquipment(id, req.body);

    logger.info('Equipment updated', {
      userId: req.user?.id,
      equipmentId: id
    });

    return res.status(200).json(equipment);
  })
);

/**
 * @route DELETE /api/v1/equipment/:id
 * @desc Delete equipment
 * @access Private
 */
router.delete('/:id',
  requireMaintenanceAccess,
  requireSiteAccess,
  auditLogger('equipment', 'DELETE'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const equipment = await EquipmentService.deleteEquipment(id);

    logger.info('Equipment deleted', {
      userId: req.user?.id,
      equipmentId: id
    });

    return res.status(200).json(equipment);
  })
);

/**
 * @route GET /api/v1/equipment/statistics
 * @desc Get equipment statistics (counts and averages)
 * @access Private
 */
router.get('/statistics',
  requireMaintenanceAccess,
  requireSiteAccess,
  asyncHandler(async (req, res) => {
    const { siteId } = req.query;

    const where = siteId ? { siteId: siteId as string } : {};

    const [total, operational, maintenance, down, utilizationStats] = await Promise.all([
      prisma.equipment.count({ where }),
      prisma.equipment.count({ where: { ...where, status: 'OPERATIONAL' } }),
      prisma.equipment.count({ where: { ...where, status: 'MAINTENANCE' } }),
      prisma.equipment.count({ where: { ...where, status: 'DOWN' } }),
      prisma.equipment.aggregate({
        _avg: { utilizationRate: true },
        where
      })
    ]);

    const statistics = {
      total,
      operational,
      maintenance,
      down,
      averageUtilization: Number((utilizationStats._avg.utilizationRate || 0).toFixed(1))
    };

    logger.info('Equipment statistics retrieved', {
      userId: req.user?.id,
      siteId,
      statistics
    });

    return res.status(200).json(statistics);
  })
);

/**
 * @route GET /api/v1/equipment/:id/status
 * @desc Get equipment status and current information
 * @access Private
 */
router.get('/:id/status',
  requireMaintenanceAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      select: {
        status: true,
        utilizationRate: true,
        // lastMaintenanceDate: true, // TODO: Add to Equipment model if needed
        // nextMaintenanceDate: true // TODO: Add to Equipment model if needed
      }
    });

    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }

    logger.info('Equipment status retrieved', {
      userId: req.user?.id,
      equipmentId: id
    });

    return res.status(200).json(equipment);
  })
);

/**
 * @route GET /api/v1/equipment/:id/history
 * @desc Get equipment status history
 * @access Private
 */
router.get('/:id/history',
  requireMaintenanceAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { id }
    });

    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }

    // Get status history from audit log
    const history = await prisma.auditLog.findMany({
      where: {
        tableName: 'equipment',
        recordId: id,
        action: { in: ['UPDATE', 'STATUS_CHANGE'] }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 50
    });

    // Transform audit logs to status history format
    const statusHistory = history.map(log => ({
      id: log.id,
      equipmentId: id,
      status: (log.newValues as any)?.status || equipment.status,
      notes: (log.newValues as any)?.notes,
      recordedAt: log.timestamp.toISOString(),
      recordedBy: log.userId
    }));

    logger.info('Equipment history retrieved', {
      userId: req.user?.id,
      equipmentId: id,
      recordCount: statusHistory.length
    });

    return res.status(200).json(statusHistory);
  })
);

/**
 * @route POST /api/v1/equipment/:id/status
 * @desc Update equipment status
 * @access Private
 */
router.post('/:id/status',
  requireMaintenanceAccess,
  requireSiteAccess,
  auditLogger('equipment', 'STATUS_CHANGE'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid status update data', validationResult.error.errors);
    }

    const { status, notes } = validationResult.data;

    // Check if equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id }
    });

    if (!existingEquipment) {
      throw new NotFoundError('Equipment not found');
    }

    // Update equipment status
    const updatedEquipment = await prisma.equipment.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date()
      }
    });

    logger.info('Equipment status updated', {
      userId: req.user?.id,
      equipmentId: id,
      oldStatus: existingEquipment.status,
      newStatus: status,
      notes
    });

    return res.status(200).json(updatedEquipment);
  })
);

/**
 * @route POST /api/v1/equipment/:id/maintenance
 * @desc Schedule equipment maintenance
 * @access Private
 */
router.post('/:id/maintenance',
  requireMaintenanceAccess,
  requireSiteAccess,
  auditLogger('equipment', 'MAINTENANCE_SCHEDULE'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate request body
    const validationResult = scheduleMaintenanceSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid maintenance schedule data', validationResult.error.errors);
    }

    const { maintenanceDate, notes } = validationResult.data;

    // Check if equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id }
    });

    if (!existingEquipment) {
      throw new NotFoundError('Equipment not found');
    }

    // Update equipment with maintenance date
    // TODO: Add nextMaintenanceDate field to Equipment model
    const updatedEquipment = await prisma.equipment.update({
      where: { id },
      data: {
        // nextMaintenanceDate: new Date(maintenanceDate),
        updatedAt: new Date()
      }
    });

    logger.info('Equipment maintenance scheduled', {
      userId: req.user?.id,
      equipmentId: id,
      maintenanceDate,
      notes
    });

    return res.status(200).json(updatedEquipment);
  })
);

/**
 * NEW ISA-95 EQUIPMENT HIERARCHY ENDPOINTS
 */

/**
 * @route GET /api/v1/equipment/:id/children
 * @desc Get child equipment (ISA-95 hierarchy)
 * @access Private
 */
router.get('/:id/children',
  requireMaintenanceAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const equipment = await EquipmentService.getEquipmentById(id);
    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }

    logger.info('Child equipment retrieved', {
      userId: req.user?.id,
      equipmentId: id,
      childCount: equipment.childEquipment?.length || 0
    });

    return res.status(200).json(equipment.childEquipment || []);
  })
);

/**
 * @route GET /api/v1/equipment/:id/hierarchy
 * @desc Get equipment hierarchy (all descendants - ISA-95)
 * @access Private
 */
router.get('/:id/hierarchy',
  requireMaintenanceAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const hierarchy = await EquipmentService.getEquipmentHierarchy(id);

    logger.info('Equipment hierarchy retrieved', {
      userId: req.user?.id,
      equipmentId: id,
      descendantCount: hierarchy.length
    });

    return res.status(200).json(hierarchy);
  })
);

/**
 * @route GET /api/v1/equipment/:id/ancestors
 * @desc Get equipment ancestors (parent chain - ISA-95)
 * @access Private
 */
router.get('/:id/ancestors',
  requireMaintenanceAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const ancestors = await EquipmentService.getEquipmentAncestors(id);

    logger.info('Equipment ancestors retrieved', {
      userId: req.user?.id,
      equipmentId: id,
      ancestorCount: ancestors.length
    });

    return res.status(200).json(ancestors);
  })
);

/**
 * @route GET /api/v1/equipment/:id/state-history
 * @desc Get equipment state history (ISA-95 state transitions)
 * @access Private
 */
router.get('/:id/state-history',
  requireMaintenanceAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { from, to, limit } = req.query;

    const options: any = {};
    if (from) options.from = new Date(from as string);
    if (to) options.to = new Date(to as string);
    if (limit) options.limit = parseInt(limit as string);

    const stateHistory = await EquipmentService.getEquipmentStateHistory(id, options);

    logger.info('Equipment state history retrieved', {
      userId: req.user?.id,
      equipmentId: id,
      recordCount: stateHistory.length
    });

    return res.status(200).json(stateHistory);
  })
);

/**
 * @route POST /api/v1/equipment/:id/state
 * @desc Change equipment state (ISA-95 state management)
 * @access Private
 */
router.post('/:id/state',
  requireMaintenanceAccess,
  requireSiteAccess,
  auditLogger('equipment', 'STATE_CHANGE'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { newState, reason, workOrderId, operationId } = req.body;

    if (!newState) {
      throw new ValidationError('newState is required');
    }

    if (!Object.values(EquipmentState).includes(newState)) {
      throw new ValidationError(
        `Invalid state. Must be one of: ${Object.values(EquipmentState).join(', ')}`
      );
    }

    const equipment = await EquipmentService.changeEquipmentState({
      equipmentId: id,
      newState,
      reason,
      changedBy: req.user?.id,
      workOrderId,
      operationId,
    });

    logger.info('Equipment state changed', {
      userId: req.user?.id,
      equipmentId: id,
      newState,
      reason
    });

    return res.status(200).json(equipment);
  })
);

/**
 * @route GET /api/v1/equipment/:id/oee
 * @desc Get OEE metrics for equipment
 * @access Private
 */
router.get('/:id/oee',
  requireMaintenanceAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { periodType, from, to, limit, aggregate } = req.query;

    const equipment = await EquipmentService.getEquipmentById(id);
    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }

    // If requesting aggregated data
    if (aggregate === 'true' && periodType && from && to) {
      const result = await OEECalculationService.getAggregatedOEE(
        id,
        periodType as PerformancePeriodType,
        new Date(from as string),
        new Date(to as string)
      );

      logger.info('Aggregated OEE data retrieved', {
        userId: req.user?.id,
        equipmentId: id,
        periodType,
        averageOEE: result.average.oee
      });

      return res.status(200).json(result);
    }

    // Get individual performance logs
    const query: any = { equipmentId: id };
    if (periodType) query.periodType = periodType as PerformancePeriodType;
    if (from) query.from = new Date(from as string);
    if (to) query.to = new Date(to as string);
    if (limit) query.limit = parseInt(limit as string);

    const performanceLogs = await OEECalculationService.getOEEPerformance(query);

    logger.info('OEE performance logs retrieved', {
      userId: req.user?.id,
      equipmentId: id,
      recordCount: performanceLogs.length
    });

    return res.status(200).json(performanceLogs);
  })
);

/**
 * @route POST /api/v1/equipment/:id/oee
 * @desc Record OEE performance data
 * @access Private
 */
router.post('/:id/oee',
  requireMaintenanceAccess,
  requireSiteAccess,
  auditLogger('equipment', 'OEE_RECORD'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const performanceData = req.body;

    const requiredFields = [
      'periodStart',
      'periodEnd',
      'periodType',
      'plannedProductionTime',
      'totalUnitsProduced',
      'goodUnits',
      'rejectedUnits',
      'scrapUnits',
      'reworkUnits',
    ];

    const missingFields = requiredFields.filter((field) => !(field in performanceData));
    if (missingFields.length > 0) {
      throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }

    performanceData.periodStart = new Date(performanceData.periodStart);
    performanceData.periodEnd = new Date(performanceData.periodEnd);
    performanceData.equipmentId = id;

    const performanceLog = await OEECalculationService.recordOEEPerformance(performanceData);
    await OEECalculationService.updateEquipmentOEE(id);

    logger.info('OEE performance recorded', {
      userId: req.user?.id,
      equipmentId: id,
      oee: performanceLog.oee,
      periodType: performanceLog.periodType
    });

    return res.status(201).json(performanceLog);
  })
);

/**
 * @route GET /api/v1/equipment/:id/oee/current
 * @desc Get current/latest OEE for equipment
 * @access Private
 */
router.get('/:id/oee/current',
  requireMaintenanceAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const currentOEE = await OEECalculationService.getCurrentOEE(id);

    if (!currentOEE) {
      return res.status(404).json({ message: 'No OEE data found for this equipment' });
    }

    logger.info('Current OEE retrieved', {
      userId: req.user?.id,
      equipmentId: id,
      oee: currentOEE.oee
    });

    return res.status(200).json(currentOEE);
  })
);

/**
 * ISA-95 EQUIPMENT CAPABILITY ENDPOINTS (Task 1.1)
 */

/**
 * @route GET /api/v1/equipment/:id/capabilities
 * @desc Get equipment capabilities
 * @access Private
 */
router.get('/:id/capabilities',
  requireMaintenanceAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const equipment = await EquipmentService.getEquipmentById(id);
    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }

    const capabilities = await EquipmentService.getEquipmentCapabilities(id);

    logger.info('Equipment capabilities retrieved', {
      userId: req.user?.id,
      equipmentId: id,
      capabilityCount: capabilities.length
    });

    return res.status(200).json(capabilities);
  })
);

/**
 * @route POST /api/v1/equipment/:id/capabilities
 * @desc Add capability to equipment
 * @access Private
 */
router.post('/:id/capabilities',
  requireMaintenanceAccess,
  requireSiteAccess,
  auditLogger('equipment', 'ADD_CAPABILITY'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { capabilityType, capability, description, parameters, certifiedDate, expiryDate } = req.body;

    if (!capabilityType || !capability) {
      throw new ValidationError('capabilityType and capability are required');
    }

    const newCapability = await EquipmentService.addCapability({
      equipmentId: id,
      capabilityType,
      capability,
      description,
      parameters,
      certifiedDate: certifiedDate ? new Date(certifiedDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    });

    logger.info('Equipment capability added', {
      userId: req.user?.id,
      equipmentId: id,
      capabilityId: newCapability.id,
      capability: newCapability.capability
    });

    return res.status(201).json(newCapability);
  })
);

/**
 * @route PUT /api/v1/equipment/:id/capabilities/:capabilityId
 * @desc Update equipment capability
 * @access Private
 */
router.put('/:id/capabilities/:capabilityId',
  requireMaintenanceAccess,
  requireSiteAccess,
  auditLogger('equipment', 'UPDATE_CAPABILITY'),
  asyncHandler(async (req, res) => {
    const { capabilityId } = req.params;

    const updateData: any = {};
    if (req.body.capabilityType) updateData.capabilityType = req.body.capabilityType;
    if (req.body.capability) updateData.capability = req.body.capability;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.parameters !== undefined) updateData.parameters = req.body.parameters;
    if (req.body.certifiedDate) updateData.certifiedDate = new Date(req.body.certifiedDate);
    if (req.body.expiryDate) updateData.expiryDate = new Date(req.body.expiryDate);
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    const updatedCapability = await EquipmentService.updateCapability(capabilityId, updateData);

    logger.info('Equipment capability updated', {
      userId: req.user?.id,
      capabilityId,
      updates: Object.keys(updateData)
    });

    return res.status(200).json(updatedCapability);
  })
);

/**
 * @route DELETE /api/v1/equipment/:id/capabilities/:capabilityId
 * @desc Remove capability from equipment
 * @access Private
 */
router.delete('/:id/capabilities/:capabilityId',
  requireMaintenanceAccess,
  requireSiteAccess,
  auditLogger('equipment', 'REMOVE_CAPABILITY'),
  asyncHandler(async (req, res) => {
    const { capabilityId } = req.params;

    const removedCapability = await EquipmentService.removeCapability(capabilityId);

    logger.info('Equipment capability removed', {
      userId: req.user?.id,
      capabilityId
    });

    return res.status(200).json(removedCapability);
  })
);

/**
 * @route GET /api/v1/equipment/by-capability/:capability
 * @desc Find equipment by capability
 * @access Private
 */
router.get('/by-capability/:capability',
  requireMaintenanceAccess,
  asyncHandler(async (req, res) => {
    const { capability } = req.params;
    const { capabilityType, includeInactive } = req.query;

    const equipment = await EquipmentService.getEquipmentByCapability(capability, {
      capabilityType: capabilityType as string | undefined,
      includeInactive: includeInactive === 'true',
    });

    logger.info('Equipment by capability retrieved', {
      userId: req.user?.id,
      capability,
      equipmentCount: equipment.length
    });

    return res.status(200).json(equipment);
  })
);

/**
 * @route GET /api/v1/equipment/:id/hierarchy-path
 * @desc Get full ISA-95 hierarchy path (Enterprise → Site → Area → WorkCenter → WorkUnit → Equipment)
 * @access Private
 */
router.get('/:id/hierarchy-path',
  requireMaintenanceAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const hierarchyPath = await EquipmentService.getFullHierarchyPath(id);

    logger.info('Equipment hierarchy path retrieved', {
      userId: req.user?.id,
      equipmentId: id
    });

    return res.status(200).json(hierarchyPath);
  })
);

/**
 * @route GET /api/v1/equipment/oee/dashboard
 * @desc Get OEE dashboard data - aggregated metrics for all equipment
 * @access Private
 * @query equipmentClass - Filter by equipment class
 * @query siteId - Filter by site
 * @query areaId - Filter by area
 * @query limit - Limit number of equipment in topPerformers/bottomPerformers
 */
router.get('/oee/dashboard',
  requireMaintenanceAccess,
  asyncHandler(async (req, res) => {
    const { equipmentClass, siteId, areaId, limit = 5 } = req.query;

    // Get all equipment with filters
    const equipmentList = await prisma.equipment.findMany({
      where: {
        isActive: true,
        ...(equipmentClass && { equipmentClass: equipmentClass as any }),
        ...(siteId && { siteId: siteId as string }),
        ...(areaId && { areaId: areaId as string }),
      },
      select: {
        id: true,
        equipmentNumber: true,
        name: true,
        equipmentClass: true,
        oee: true,
        availability: true,
        performance: true,
        quality: true,
        status: true,
        currentState: true,
      },
      orderBy: {
        oee: 'desc',
      },
    });

    // Calculate aggregated metrics
    const totalEquipment = equipmentList.length;
    const equipmentWithOEE = equipmentList.filter(e => e.oee !== null && e.oee !== undefined);

    const averageOEE = equipmentWithOEE.length > 0
      ? equipmentWithOEE.reduce((sum, e) => sum + (e.oee || 0), 0) / equipmentWithOEE.length
      : 0;

    const averageAvailability = equipmentWithOEE.length > 0
      ? equipmentWithOEE.reduce((sum, e) => sum + (e.availability || 0), 0) / equipmentWithOEE.length
      : 0;

    const averagePerformance = equipmentWithOEE.length > 0
      ? equipmentWithOEE.reduce((sum, e) => sum + (e.performance || 0), 0) / equipmentWithOEE.length
      : 0;

    const averageQuality = equipmentWithOEE.length > 0
      ? equipmentWithOEE.reduce((sum, e) => sum + (e.quality || 0), 0) / equipmentWithOEE.length
      : 0;

    // Count by status
    const byStatus = equipmentList.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count by state
    const byState = equipmentList.reduce((acc, e) => {
      acc[e.currentState] = (acc[e.currentState] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top performers (highest OEE)
    const topPerformers = equipmentWithOEE.slice(0, parseInt(limit as string)).map(e => ({
      id: e.id,
      equipmentNumber: e.equipmentNumber,
      name: e.name,
      equipmentClass: e.equipmentClass,
      oee: e.oee,
      availability: e.availability,
      performance: e.performance,
      quality: e.quality,
      status: e.status,
    }));

    // Bottom performers (lowest OEE)
    const bottomPerformers = equipmentWithOEE
      .slice(-parseInt(limit as string))
      .reverse()
      .map(e => ({
        id: e.id,
        equipmentNumber: e.equipmentNumber,
        name: e.name,
        equipmentClass: e.equipmentClass,
        oee: e.oee,
        availability: e.availability,
        performance: e.performance,
        quality: e.quality,
        status: e.status,
      }));

    // OEE distribution (categorize equipment by OEE thresholds)
    const oeeDistribution = {
      excellent: equipmentWithOEE.filter(e => (e.oee || 0) >= 85).length, // ≥ 85%
      good: equipmentWithOEE.filter(e => (e.oee || 0) >= 70 && (e.oee || 0) < 85).length, // 70-85%
      fair: equipmentWithOEE.filter(e => (e.oee || 0) >= 50 && (e.oee || 0) < 70).length, // 50-70%
      poor: equipmentWithOEE.filter(e => (e.oee || 0) < 50).length, // < 50%
      noData: equipmentList.length - equipmentWithOEE.length,
    };

    const dashboardData = {
      summary: {
        totalEquipment,
        equipmentWithOEE: equipmentWithOEE.length,
        averageOEE: Math.round(averageOEE * 10) / 10,
        averageAvailability: Math.round(averageAvailability * 10) / 10,
        averagePerformance: Math.round(averagePerformance * 10) / 10,
        averageQuality: Math.round(averageQuality * 10) / 10,
      },
      distribution: oeeDistribution,
      byStatus,
      byState,
      topPerformers,
      bottomPerformers,
    };

    logger.info('OEE dashboard data retrieved', {
      userId: req.user?.id,
      totalEquipment,
      averageOEE: dashboardData.summary.averageOEE,
    });

    return res.status(200).json(dashboardData);
  })
);

export default router;