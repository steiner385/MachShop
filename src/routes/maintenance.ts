// GitHub Issue #94: Equipment Registry & Maintenance Management System
// Maintenance Work Order API Routes

import express from 'express';
import { z } from 'zod';
import { MaintenanceService } from '../services/MaintenanceService';
import { logger } from '../utils/logger';
import { MaintenanceStatus, Priority, MaintenanceType } from '@prisma/client';

const router = express.Router();
const maintenanceService = new MaintenanceService();

// Validation schemas
const createMaintenanceWorkOrderSchema = z.object({
  equipmentId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  workOrderNumber: z.string().optional(),
  maintenanceType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'EMERGENCY']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
  scheduledDate: z.string().datetime().optional(),
  estimatedDuration: z.number().int().positive().optional(),
  assignedToId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
});

const updateMaintenanceWorkOrderSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  maintenanceType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'EMERGENCY']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  scheduledDate: z.string().datetime().optional(),
  estimatedDuration: z.number().int().positive().optional(),
  actualDuration: z.number().int().positive().optional(),
  assignedToId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const addMaintenancePartSchema = z.object({
  partNumber: z.string().min(1),
  description: z.string().min(1),
  quantityUsed: z.number().positive(),
  unitCost: z.number().positive().optional(),
  supplierPartNumber: z.string().optional(),
  notes: z.string().optional(),
});

const addLaborEntrySchema = z.object({
  userId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  hourlyRate: z.number().positive().optional(),
  description: z.string().optional(),
});

const maintenanceFiltersSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
  maintenanceType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'EMERGENCY']).optional(),
  equipmentId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  overdue: z.enum(['true', 'false']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

/**
 * GET /api/v1/maintenance/work-orders
 * Get maintenance work orders with filtering and pagination
 */
router.get('/work-orders', async (req, res) => {
  try {
    const filters = maintenanceFiltersSchema.parse(req.query);

    const options = {
      status: filters.status as MaintenanceStatus | undefined,
      priority: filters.priority as Priority | undefined,
      maintenanceType: filters.maintenanceType as MaintenanceType | undefined,
      equipmentId: filters.equipmentId,
      assignedToId: filters.assignedToId,
      siteId: filters.siteId,
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
      overdue: filters.overdue === 'true',
      page: filters.page ? parseInt(filters.page) : 1,
      limit: filters.limit ? parseInt(filters.limit) : 10,
    };

    const result = await maintenanceService.getMaintenanceWorkOrders(options);

    res.json({
      success: true,
      data: result.workOrders,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / options.limit),
      },
    });
  } catch (error) {
    logger.error('Error getting maintenance work orders:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to get maintenance work orders',
    });
  }
});

/**
 * POST /api/v1/maintenance/work-orders
 * Create a new maintenance work order
 */
router.post('/work-orders', async (req, res) => {
  try {
    const data = createMaintenanceWorkOrderSchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const workOrder = await maintenanceService.createMaintenanceWorkOrder({
      ...data,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
      createdById: userId,
    });

    res.status(201).json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    logger.error('Error creating maintenance work order:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create maintenance work order',
    });
  }
});

/**
 * GET /api/v1/maintenance/work-orders/:id
 * Get maintenance work order by ID
 */
router.get('/work-orders/:id', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const workOrder = await maintenanceService.getMaintenanceWorkOrderById(workOrderId);

    if (!workOrder) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance work order not found',
      });
    }

    res.json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    logger.error('Error getting maintenance work order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get maintenance work order',
    });
  }
});

/**
 * PUT /api/v1/maintenance/work-orders/:id
 * Update maintenance work order
 */
router.put('/work-orders/:id', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const data = updateMaintenanceWorkOrderSchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const updateData = {
      ...data,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
      updatedById: userId,
    };

    const workOrder = await maintenanceService.updateMaintenanceWorkOrder(workOrderId, updateData);

    res.json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    logger.error('Error updating maintenance work order:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update maintenance work order',
    });
  }
});

/**
 * DELETE /api/v1/maintenance/work-orders/:id
 * Delete maintenance work order
 */
router.delete('/work-orders/:id', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    await maintenanceService.deleteMaintenanceWorkOrder(workOrderId);

    res.json({
      success: true,
      message: 'Maintenance work order deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting maintenance work order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete maintenance work order',
    });
  }
});

/**
 * POST /api/v1/maintenance/work-orders/:id/start
 * Start maintenance work order
 */
router.post('/work-orders/:id/start', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const workOrder = await maintenanceService.startMaintenanceWorkOrder(workOrderId, userId);

    res.json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    logger.error('Error starting maintenance work order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start maintenance work order',
    });
  }
});

/**
 * POST /api/v1/maintenance/work-orders/:id/complete
 * Complete maintenance work order
 */
router.post('/work-orders/:id/complete', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const userId = (req as any).user?.id;
    const { notes } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const workOrder = await maintenanceService.completeMaintenanceWorkOrder(workOrderId, userId, notes);

    res.json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    logger.error('Error completing maintenance work order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete maintenance work order',
    });
  }
});

/**
 * POST /api/v1/maintenance/work-orders/:id/cancel
 * Cancel maintenance work order
 */
router.post('/work-orders/:id/cancel', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const userId = (req as any).user?.id;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const workOrder = await maintenanceService.cancelMaintenanceWorkOrder(workOrderId, userId, reason);

    res.json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    logger.error('Error cancelling maintenance work order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel maintenance work order',
    });
  }
});

/**
 * POST /api/v1/maintenance/work-orders/:id/parts
 * Add parts to maintenance work order
 */
router.post('/work-orders/:id/parts', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const data = addMaintenancePartSchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const part = await maintenanceService.addMaintenancePart(workOrderId, {
      ...data,
      addedById: userId,
    });

    res.status(201).json({
      success: true,
      data: part,
    });
  } catch (error) {
    logger.error('Error adding maintenance part:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to add maintenance part',
    });
  }
});

/**
 * POST /api/v1/maintenance/work-orders/:id/labor
 * Add labor entry to maintenance work order
 */
router.post('/work-orders/:id/labor', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const data = addLaborEntrySchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const laborEntry = await maintenanceService.addLaborEntry(workOrderId, {
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      recordedById: userId,
    });

    res.status(201).json({
      success: true,
      data: laborEntry,
    });
  } catch (error) {
    logger.error('Error adding labor entry:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to add labor entry',
    });
  }
});

/**
 * GET /api/v1/maintenance/work-orders/:id/parts
 * Get parts for maintenance work order
 */
router.get('/work-orders/:id/parts', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const parts = await maintenanceService.getMaintenanceParts(workOrderId);

    res.json({
      success: true,
      data: parts,
    });
  } catch (error) {
    logger.error('Error getting maintenance parts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get maintenance parts',
    });
  }
});

/**
 * GET /api/v1/maintenance/work-orders/:id/labor
 * Get labor entries for maintenance work order
 */
router.get('/work-orders/:id/labor', async (req, res) => {
  try {
    const workOrderId = req.params.id;
    const laborEntries = await maintenanceService.getLaborEntries(workOrderId);

    res.json({
      success: true,
      data: laborEntries,
    });
  } catch (error) {
    logger.error('Error getting labor entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get labor entries',
    });
  }
});

/**
 * DELETE /api/v1/maintenance/parts/:id
 * Remove maintenance part
 */
router.delete('/parts/:id', async (req, res) => {
  try {
    const partId = req.params.id;
    await maintenanceService.removeMaintenancePart(partId);

    res.json({
      success: true,
      message: 'Maintenance part removed successfully',
    });
  } catch (error) {
    logger.error('Error removing maintenance part:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove maintenance part',
    });
  }
});

/**
 * DELETE /api/v1/maintenance/labor/:id
 * Remove labor entry
 */
router.delete('/labor/:id', async (req, res) => {
  try {
    const laborId = req.params.id;
    await maintenanceService.removeLaborEntry(laborId);

    res.json({
      success: true,
      message: 'Labor entry removed successfully',
    });
  } catch (error) {
    logger.error('Error removing labor entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove labor entry',
    });
  }
});

/**
 * GET /api/v1/maintenance/statistics
 * Get maintenance statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { equipmentId, siteId, days } = req.query;

    const options = {
      equipmentId: equipmentId as string | undefined,
      siteId: siteId as string | undefined,
      days: days ? parseInt(days as string) : 30,
    };

    const statistics = await maintenanceService.getMaintenanceStatistics(options);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    logger.error('Error getting maintenance statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get maintenance statistics',
    });
  }
});

/**
 * GET /api/v1/maintenance/overdue
 * Get overdue maintenance work orders
 */
router.get('/overdue', async (req, res) => {
  try {
    const { siteId, assignedToId } = req.query;

    const options = {
      siteId: siteId as string | undefined,
      assignedToId: assignedToId as string | undefined,
    };

    const workOrders = await maintenanceService.getOverdueMaintenanceWorkOrders(options);

    res.json({
      success: true,
      data: workOrders,
    });
  } catch (error) {
    logger.error('Error getting overdue maintenance work orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get overdue maintenance work orders',
    });
  }
});

/**
 * GET /api/v1/maintenance/scheduled
 * Get scheduled maintenance work orders
 */
router.get('/scheduled', async (req, res) => {
  try {
    const { days, siteId, assignedToId } = req.query;

    const options = {
      days: days ? parseInt(days as string) : 7,
      siteId: siteId as string | undefined,
      assignedToId: assignedToId as string | undefined,
    };

    const workOrders = await maintenanceService.getScheduledMaintenanceWorkOrders(options);

    res.json({
      success: true,
      data: workOrders,
    });
  } catch (error) {
    logger.error('Error getting scheduled maintenance work orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduled maintenance work orders',
    });
  }
});

export default router;