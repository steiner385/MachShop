import express from 'express';
import { z } from 'zod';
import prisma from '../lib/database';
import { requireMaintenanceAccess, requireSiteAccess } from '../middleware/auth';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { auditLogger } from '../middleware/requestLogger';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const querySchema = z.object({
  status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'DOWN']).optional(),
  type: z.string().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  siteId: z.string().uuid().optional()
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
      type,
      search,
      page = 1,
      limit = 20,
      siteId
    } = validationResult.data;

    // Build where clause
    const where: any = {
      ...(status && { status }),
      ...(type && { type }),
      ...(siteId && { siteId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { type: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [equipment, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.equipment.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    logger.info('Equipment list retrieved', {
      userId: req.user?.id,
      total,
      page,
      limit,
      filters: { status, type, search, siteId }
    });

    res.status(200).json({
      equipment,
      total,
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

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }

    logger.info('Equipment retrieved', {
      userId: req.user?.id,
      equipmentId: id,
      equipmentName: equipment.name
    });

    res.status(200).json(equipment);
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

    res.status(200).json(statistics);
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
        lastMaintenanceDate: true,
        nextMaintenanceDate: true
      }
    });

    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }

    logger.info('Equipment status retrieved', {
      userId: req.user?.id,
      equipmentId: id
    });

    res.status(200).json(equipment);
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
        entityType: 'equipment',
        entityId: id,
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
      status: (log.newData as any)?.status || equipment.status,
      notes: (log.newData as any)?.notes,
      recordedAt: log.timestamp.toISOString(),
      recordedBy: log.userId
    }));

    logger.info('Equipment history retrieved', {
      userId: req.user?.id,
      equipmentId: id,
      recordCount: statusHistory.length
    });

    res.status(200).json(statusHistory);
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

    res.status(200).json(updatedEquipment);
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
    const updatedEquipment = await prisma.equipment.update({
      where: { id },
      data: {
        nextMaintenanceDate: new Date(maintenanceDate),
        updatedAt: new Date()
      }
    });

    logger.info('Equipment maintenance scheduled', {
      userId: req.user?.id,
      equipmentId: id,
      maintenanceDate,
      notes
    });

    res.status(200).json(updatedEquipment);
  })
);

export default router;