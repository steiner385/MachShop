/**
 * Work Order Routes
 * HTTP endpoints for work order management
 * Extracted from monolith with full feature parity
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { WorkOrderService } from '../services/WorkOrderService';
import {
  WorkOrderStatus,
  WorkOrderPriority,
  CreateWorkOrderRequest
} from '../types';

const router = express.Router();
const workOrderService = new WorkOrderService();

// ============================================================================
// Validation Schemas
// ============================================================================

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

// ============================================================================
// Routes
// ============================================================================

/**
 * @route GET /api/v1/workorders
 * @desc Get work orders list with filtering and pagination
 * @access Private (requires authentication)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const validationResult = querySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validationResult.error.errors
      });
    }

    const {
      page = 1,
      limit = 20,
      status,
      partNumber,
      dueDateFrom,
      dueDateTo,
      priority
    } = validationResult.data;

    // Get filtered work orders
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
      estimatedCompletion: workOrderService.calculateEstimatedCompletion(wo, 100)
    }));

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      data: workOrdersWithMetrics,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('[WORK_ORDERS] Error fetching work orders:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * @route GET /api/v1/workorders/:id
 * @desc Get specific work order
 * @access Private (requires authentication)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const workOrder = await workOrderService.getWorkOrderById(id);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Add calculated fields
    const workOrderWithMetrics = {
      ...workOrder,
      completionPercentage: workOrderService.calculateCompletionPercentage(workOrder),
      isOverdue: workOrderService.isOverdue(workOrder),
      estimatedCompletion: workOrderService.calculateEstimatedCompletion(workOrder, 100)
    };

    res.status(200).json(workOrderWithMetrics);
  } catch (error: any) {
    console.error(`[WORK_ORDERS] Error fetching work order ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * @route POST /api/v1/workorders
 * @desc Create new work order
 * @access Private (requires workorders.create permission)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = createWorkOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid work order data',
        details: validationResult.error.errors
      });
    }

    const workOrderData = validationResult.data;

    // Convert date strings to Date objects
    const createRequest: CreateWorkOrderRequest = {
      ...workOrderData,
      dueDate: workOrderData.dueDate ? new Date(workOrderData.dueDate) : undefined
    };

    // Create work order using service (userId from JWT)
    const userId = (req as any).user?.id || 'system';
    const newWorkOrder = await workOrderService.createWorkOrder(createRequest, userId);

    res.status(201).json(newWorkOrder);
  } catch (error: any) {
    console.error('[WORK_ORDERS] Error creating work order:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Validation failed')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * @route PUT /api/v1/workorders/:id
 * @desc Update work order
 * @access Private (requires workorders.update permission)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateWorkOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid work order data',
        details: validationResult.error.errors
      });
    }

    // Find existing work order
    const existingWorkOrder = await workOrderService.getWorkOrderById(id);
    if (!existingWorkOrder) {
      return res.status(404).json({ error: 'Work order not found' });
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
    const userId = (req as any).user?.id || 'system';
    const updatedWorkOrder = await workOrderService.updateWorkOrder(
      existingWorkOrder,
      updateRequest,
      userId
    );

    res.status(200).json(updatedWorkOrder);
  } catch (error: any) {
    console.error(`[WORK_ORDERS] Error updating work order ${req.params.id}:`, error);

    if (error.message.includes('Cannot update')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * @route DELETE /api/v1/workorders/:id
 * @desc Delete work order
 * @access Private (requires workorders.delete permission)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find existing work order
    const existingWorkOrder = await workOrderService.getWorkOrderById(id);
    if (!existingWorkOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Check if work order can be deleted
    const canCancel = workOrderService.canCancelWorkOrder(existingWorkOrder);
    if (!canCancel.canCancel) {
      return res.status(400).json({ error: canCancel.reason || 'Work order cannot be deleted' });
    }

    // Delete work order using service
    await workOrderService.deleteWorkOrder(id);

    res.status(204).send();
  } catch (error: any) {
    console.error(`[WORK_ORDERS] Error deleting work order ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * @route POST /api/v1/workorders/:id/release
 * @desc Release work order to production
 * @access Private (requires workorders.release permission)
 */
router.post('/:id/release', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find existing work order
    const existingWorkOrder = await workOrderService.getWorkOrderById(id);
    if (!existingWorkOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Release work order using service
    const userId = (req as any).user?.id || 'system';
    const releasedWorkOrder = await workOrderService.releaseWorkOrder(existingWorkOrder, userId);

    res.status(200).json(releasedWorkOrder);
  } catch (error: any) {
    console.error(`[WORK_ORDERS] Error releasing work order ${req.params.id}:`, error);

    if (error.message.includes('Cannot release')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * @route GET /api/v1/workorders/:id/operations
 * @desc Get work order operations
 * @access Private
 */
router.get('/:id/operations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const workOrder = await workOrderService.getWorkOrderById(id);
    if (!workOrder) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    // Get operations for this work order
    const operations = await workOrderService.getWorkOrderOperations(id);

    res.status(200).json(operations);
  } catch (error: any) {
    console.error(`[WORK_ORDERS] Error fetching operations for work order ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * @route GET /api/v1/workorders/dashboard/metrics
 * @desc Get work order dashboard metrics
 * @access Private
 */
router.get('/dashboard/metrics', async (req: Request, res: Response) => {
  try {
    const { siteId } = req.query;

    // Get dashboard metrics using service
    const metrics = await workOrderService.getDashboardMetrics(siteId as string);

    res.status(200).json(metrics);
  } catch (error: any) {
    console.error('[WORK_ORDERS] Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

export default router;
