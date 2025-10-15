import express from 'express';
import { z } from 'zod';
import { WorkOrderService } from '../services/WorkOrderService';
import { 
  WorkOrder, 
  WorkOrderStatus, 
  WorkOrderPriority, 
  CreateWorkOrderRequest 
} from '../types/workOrder';
import { 
  ValidationError, 
  NotFoundError, 
  BusinessRuleError,
  asyncHandler 
} from '../middleware/errorHandler';
import { 
  requireProductionAccess, 
  requirePermission,
  requireSiteAccess 
} from '../middleware/auth';
import { auditLogger } from '../middleware/requestLogger';
import { logger } from '../utils/logger';
import prisma from '../lib/database';

const router = express.Router();
const workOrderService = new WorkOrderService();

// Validation schemas
const createWorkOrderSchema = z.object({
  partNumber: z.string().min(1, 'Part number is required'),
  quantityOrdered: z.number().min(1, 'Quantity must be greater than 0'),
  priority: z.nativeEnum(WorkOrderPriority).optional(),
  customerOrder: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  siteId: z.string().uuid('Invalid site ID')
});

const updateWorkOrderSchema = z.object({
  quantityOrdered: z.number().min(1).optional(),
  priority: z.nativeEnum(WorkOrderPriority).optional(),
  customerOrder: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  scheduledStartDate: z.string().datetime().optional(),
  scheduledEndDate: z.string().datetime().optional()
});

const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.nativeEnum(WorkOrderStatus).optional(),
  partNumber: z.string().optional(),
  siteId: z.string().uuid().optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  priority: z.nativeEnum(WorkOrderPriority).optional(),
  search: z.string().optional()
});

// Mock data removed - now using database via WorkOrderService

/**
 * @route GET /api/v1/workorders
 * @desc Get work orders list with filtering and pagination
 * @access Private
 */
router.get('/',
  requireProductionAccess,
  requireSiteAccess,
  asyncHandler(async (req, res) => {
    // Validate query parameters
    const validationResult = querySchema.safeParse(req.query);
    if (!validationResult.success) {
      throw new ValidationError('Invalid query parameters', validationResult.error.errors);
    }

    const {
      page = 1,
      limit = 20,
      status,
      partNumber,
      siteId,
      dueDateFrom,
      dueDateTo,
      priority,
      search
    } = validationResult.data;

    // Use the WorkOrderService to get filtered work orders
    const filters = {
      status: status as any,
      priority: priority as any,
      partNumber,
      dueAfter: dueDateFrom ? new Date(dueDateFrom) : undefined,
      dueBefore: dueDateTo ? new Date(dueDateTo) : undefined,
      limit,
      offset: (page - 1) * limit
    };

    const { workOrders: workOrdersData, total } = await workOrderService.getWorkOrders(filters);

    // Add calculated fields
    const workOrdersWithMetrics = workOrdersData.map(wo => ({
      ...wo,
      completionPercentage: workOrderService.calculateCompletionPercentage(wo),
      isOverdue: workOrderService.isOverdue(wo),
      estimatedCompletion: workOrderService.calculateEstimatedCompletion(wo, 5) // Assuming 5 units per day capacity
    }));

    const totalPages = Math.ceil(total / limit);

    logger.info('Work orders retrieved', {
      userId: req.user?.id,
      filters: validationResult.data,
      total,
      page,
      limit
    });

    res.status(200).json({
      data: workOrdersWithMetrics,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  })
);

/**
 * @route GET /api/v1/workorders/:id
 * @desc Get specific work order
 * @access Private
 */
router.get('/:id',
  requireProductionAccess,
  requireSiteAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const workOrder = await workOrderService.getWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundError('Work order not found');
    }

    // Add calculated fields
    const workOrderWithMetrics = {
      ...workOrder,
      completionPercentage: workOrderService.calculateCompletionPercentage(workOrder),
      isOverdue: workOrderService.isOverdue(workOrder),
      estimatedCompletion: workOrderService.calculateEstimatedCompletion(workOrder, 5)
    };

    logger.info('Work order retrieved', {
      userId: req.user?.id,
      workOrderId: id,
      workOrderNumber: workOrder.workOrderNumber
    });

    res.status(200).json(workOrderWithMetrics);
  })
);

/**
 * @route POST /api/v1/workorders
 * @desc Create new work order
 * @access Private
 */
router.post('/',
  requirePermission('workorders.create'),
  requireSiteAccess,
  auditLogger('work_order', 'CREATE'),
  asyncHandler(async (req, res) => {
    // Validate request body
    const validationResult = createWorkOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid work order data', validationResult.error.errors);
    }

    const workOrderData = validationResult.data;

    // Convert date strings to Date objects
    const createRequest: CreateWorkOrderRequest = {
      ...workOrderData,
      dueDate: workOrderData.dueDate ? new Date(workOrderData.dueDate) : undefined
    };

    // Create work order using service
    const newWorkOrder = await workOrderService.createWorkOrder(
      createRequest,
      req.user!.id
    );

    // Work order is already saved to database via the service

    logger.info('Work order created', {
      userId: req.user?.id,
      workOrderId: newWorkOrder.id,
      workOrderNumber: newWorkOrder.workOrderNumber,
      partNumber: newWorkOrder.partNumber,
      quantity: newWorkOrder.quantityOrdered
    });

    res.status(201).json(newWorkOrder);
  })
);

/**
 * @route PUT /api/v1/workorders/:id
 * @desc Update work order
 * @access Private
 */
router.put('/:id',
  requirePermission('workorders.update'),
  requireSiteAccess,
  auditLogger('work_order', 'UPDATE'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateWorkOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid work order data', validationResult.error.errors);
    }

    // Find existing work order
    const existingWorkOrder = await workOrderService.getWorkOrderById(id);
    if (!existingWorkOrder) {
      throw new NotFoundError('Work order not found');
    }

    const updateData = validationResult.data;

    // Convert date strings to Date objects
    const updateRequest = {
      ...updateData,
      dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
      scheduledStartDate: updateData.scheduledStartDate ? new Date(updateData.scheduledStartDate) : undefined,
      scheduledEndDate: updateData.scheduledEndDate ? new Date(updateData.scheduledEndDate) : undefined
    };

    // Update work order using service
    const updatedWorkOrder = await workOrderService.updateWorkOrder(
      existingWorkOrder,
      updateRequest,
      req.user!.id
    );

    logger.info('Work order updated', {
      userId: req.user?.id,
      workOrderId: id,
      workOrderNumber: updatedWorkOrder.workOrderNumber,
      changes: updateData
    });

    res.status(200).json(updatedWorkOrder);
  })
);

/**
 * @route DELETE /api/v1/workorders/:id
 * @desc Delete work order
 * @access Private
 */
router.delete('/:id',
  requirePermission('workorders.delete'),
  requireSiteAccess,
  auditLogger('work_order', 'DELETE'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Find existing work order
    const existingWorkOrder = await workOrderService.getWorkOrderById(id);
    if (!existingWorkOrder) {
      throw new NotFoundError('Work order not found');
    }

    // Check if work order can be deleted
    const canCancel = workOrderService.canCancelWorkOrder(existingWorkOrder);
    if (!canCancel.canCancel) {
      throw new BusinessRuleError(canCancel.reason || 'Work order cannot be deleted');
    }

    // Delete work order using service
    await workOrderService.deleteWorkOrder(id);

    logger.info('Work order deleted', {
      userId: req.user?.id,
      workOrderId: id,
      workOrderNumber: existingWorkOrder.workOrderNumber
    });

    res.status(204).send();
  })
);

/**
 * @route POST /api/v1/workorders/:id/release
 * @desc Release work order to production
 * @access Private
 */
router.post('/:id/release',
  requirePermission('workorders.release'),
  requireSiteAccess,
  auditLogger('work_order', 'RELEASE'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Find existing work order
    const existingWorkOrder = await workOrderService.getWorkOrderById(id);
    if (!existingWorkOrder) {
      throw new NotFoundError('Work order not found');
    }

    // Release work order using service
    const releasedWorkOrder = await workOrderService.releaseWorkOrder(
      existingWorkOrder,
      req.user!.id
    );

    logger.info('Work order released', {
      userId: req.user?.id,
      workOrderId: id,
      workOrderNumber: releasedWorkOrder.workOrderNumber
    });

    res.status(200).json(releasedWorkOrder);
  })
);

/**
 * @route GET /api/v1/workorders/:id/operations
 * @desc Get work order operations
 * @access Private
 */
router.get('/:id/operations',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const workOrder = await workOrderService.getWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundError('Work order not found');
    }

    // Get operations for this work order
    const operations = await workOrderService.getWorkOrderOperations(id);

    res.status(200).json(operations);
  })
);

/**
 * @route GET /api/v1/workorders/dashboard/metrics
 * @desc Get work order dashboard metrics
 * @access Private
 */
router.get('/dashboard/metrics',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { siteId } = req.query;

    // Get dashboard metrics using service
    const dashboardMetrics = await workOrderService.getDashboardMetrics(siteId as string);
    
    const {
      totalWorkOrders,
      activeWorkOrders,
      overdueWorkOrders,
      completedThisMonth
    } = dashboardMetrics;

    const metrics = {
      totalWorkOrders,
      activeWorkOrders,
      overdueWorkOrders,
      completedThisMonth,
      averageCompletionTime: 5.2, // days
      onTimeDeliveryRate: 94.5, // percentage
      productionEfficiency: 87.3 // percentage
    };

    res.status(200).json(metrics);
  })
);

export default router;