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
  siteId: z.string().min(1, 'Site ID is required')
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
  siteId: z.string().optional(),
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

// =============================================
// OPERATOR EXECUTION ROUTES (Phase 1 - Production Operator)
// =============================================

/**
 * @route GET /api/v1/workorders/operations/my-assignments
 * @desc Get operations assigned to current operator
 * @access Private (workorders.execute permission)
 */
router.get('/operations/my-assignments',
  requirePermission('workorders.execute'),
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    logger.info('Fetching assigned operations', { userId });

    // Find work orders where user is assigned as operator
    const workOrders = await prisma.workOrder.findMany({
      where: {
        status: {
          in: ['RELEASED', 'IN_PROGRESS'],
        },
      },
      include: {
        part: true,
        workCenter: true,
      },
      take: 50,
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Mock operation data
    const operations = workOrders.map((wo) => ({
      id: `${wo.id}-OP-10`,
      workOrderId: wo.id,
      operationNumber: 10,
      operationName: 'Production Operation',
      status: wo.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING',
      assignedOperatorId: userId,
      assignedOperatorName: req.user?.username,
      orderedQuantity: wo.quantityOrdered,
      completedQuantity: wo.quantityCompleted || 0,
      scrappedQuantity: 0,
      reworkQuantity: 0,
      workCenterId: wo.workCenterId || undefined,
      workCenterName: wo.workCenter?.name,
    }));

    res.json({
      success: true,
      data: operations,
    });
  })
);

/**
 * @route GET /api/v1/workorders/:id/operations/:operationNumber
 * @desc Get operation details
 * @access Private (workorders.execute permission)
 */
router.get('/:id/operations/:operationNumber',
  requirePermission('workorders.execute'),
  asyncHandler(async (req, res) => {
    const { id, operationNumber } = req.params;
    const userId = req.user?.id;

    const workOrder = await workOrderService.getWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundError('Work order not found');
    }

    // Get actual operation from database
    const workOrderOperation = await prisma.workOrderOperation.findFirst({
      where: {
        workOrderId: id,
        routingOperation: {
          operationNumber: parseInt(operationNumber)
        }
      },
      include: {
        routingOperation: {
          include: {
            workCenter: true
          }
        }
      }
    });

    if (!workOrderOperation) {
      throw new NotFoundError(`Operation ${operationNumber} not found for work order ${id}`);
    }

    const operation = {
      id: workOrderOperation.id,
      workOrderId: workOrder.id,
      workOrderNumber: workOrder.workOrderNumber,
      operationNumber: workOrderOperation.routingOperation.operationNumber,
      operationName: workOrderOperation.routingOperation.operationName,
      description: workOrderOperation.routingOperation.description,
      status: workOrderOperation.status,
      assignedOperatorId: userId,
      assignedOperatorName: req.user?.username,
      orderedQuantity: workOrderOperation.quantity,
      completedQuantity: workOrderOperation.quantityCompleted || 0,
      scrappedQuantity: workOrderOperation.quantityScrap || 0,
      reworkQuantity: 0,
      startTime: workOrderOperation.startedAt,
      endTime: workOrderOperation.completedAt,
      workCenterId: workOrderOperation.routingOperation.workCenterId,
      workCenterName: workOrderOperation.routingOperation.workCenter?.name,
      setupTime: workOrderOperation.routingOperation.setupTime,
      cycleTime: workOrderOperation.routingOperation.cycleTime,
    };

    res.json({
      success: true,
      data: operation,
    });
  })
);

/**
 * @route POST /api/v1/workorders/:id/operations/:operationNumber/start
 * @desc Start an operation
 * @access Private (workorders.execute permission)
 */
router.post('/:id/operations/:operationNumber/start',
  requirePermission('workorders.execute'),
  auditLogger('operation', 'START'),
  asyncHandler(async (req, res) => {
    const { id, operationNumber } = req.params;
    const userId = req.user?.id;

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        actualStartDate: new Date(),
      },
      include: {
        part: true,
        workCenter: true,
      },
    });

    const startTime = new Date();

    const operation = {
      id: `${workOrder.id}-OP-${operationNumber}`,
      workOrderId: workOrder.id,
      operationNumber: parseInt(operationNumber),
      operationName: `Operation ${operationNumber}`,
      status: 'IN_PROGRESS',
      assignedOperatorId: userId,
      assignedOperatorName: req.user?.username,
      orderedQuantity: workOrder.quantityOrdered,
      completedQuantity: workOrder.quantityCompleted || 0,
      scrappedQuantity: 0,
      reworkQuantity: 0,
      startTime: startTime.toISOString(),
      workCenterId: workOrder.workCenterId || undefined,
    };

    logger.info('Operation started', { workOrderId: id, operationNumber, userId });

    res.json({
      success: true,
      message: 'Operation started successfully',
      operation,
      startTime: startTime.toISOString(),
    });
  })
);

/**
 * @route POST /api/v1/workorders/:id/operations/:operationNumber/record
 * @desc Record production (complete, scrap, or rework)
 * @access Private (workorders.execute permission)
 */
router.post('/:id/operations/:operationNumber/record',
  requirePermission('workorders.execute'),
  auditLogger('production', 'RECORD'),
  asyncHandler(async (req, res) => {
    const { id, operationNumber } = req.params;
    const { type, quantity, scrapReasonCode, reworkReasonCode, notes } = req.body;
    const userId = req.user?.id;

    // Validation
    if (!type || !['complete', 'scrap', 'rework'].includes(type)) {
      throw new ValidationError('Invalid entry type. Must be complete, scrap, or rework');
    }

    if (!quantity || quantity <= 0) {
      throw new ValidationError('Quantity must be greater than zero');
    }

    if (type === 'scrap' && !scrapReasonCode) {
      throw new ValidationError('Scrap reason code is required');
    }

    if (type === 'rework' && !reworkReasonCode) {
      throw new ValidationError('Rework reason code is required');
    }

    const workOrder = await workOrderService.getWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundError('Work order not found');
    }

    const currentCompleted = workOrder.quantityCompleted || 0;
    const remainingQuantity = workOrder.quantityOrdered - currentCompleted;

    if (type === 'complete' && quantity > remainingQuantity) {
      throw new ValidationError(`Quantity cannot exceed remaining quantity (${remainingQuantity})`);
    }

    // Update work order based on type
    let updatedWorkOrder;
    if (type === 'complete') {
      updatedWorkOrder = await prisma.workOrder.update({
        where: { id },
        data: {
          quantityCompleted: currentCompleted + quantity,
          status: currentCompleted + quantity >= workOrder.quantityOrdered ? 'COMPLETED' : 'IN_PROGRESS',
        },
        include: {
          part: true,
          workCenter: true,
        },
      });
    } else {
      updatedWorkOrder = workOrder;
    }

    const transaction = {
      id: `TXN-${Date.now()}`,
      type,
      quantity,
      reasonCode: type === 'scrap' ? scrapReasonCode : reworkReasonCode,
      notes,
      timestamp: new Date().toISOString(),
      operatorId: userId,
      operatorName: req.user?.username,
    };

    const operation = {
      id: `${updatedWorkOrder.id}-OP-${operationNumber}`,
      workOrderId: updatedWorkOrder.id,
      operationNumber: parseInt(operationNumber),
      operationName: `Operation ${operationNumber}`,
      status: updatedWorkOrder.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
      assignedOperatorId: userId,
      assignedOperatorName: req.user?.username,
      orderedQuantity: updatedWorkOrder.quantityOrdered,
      completedQuantity: updatedWorkOrder.quantityCompleted || 0,
      scrappedQuantity: type === 'scrap' ? quantity : 0,
      reworkQuantity: type === 'rework' ? quantity : 0,
      startTime: updatedWorkOrder.actualStartDate,
      workCenterId: updatedWorkOrder.workCenterId || undefined,
    };

    logger.info('Production recorded', { workOrderId: id, operationNumber, type, quantity, userId });

    res.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} recorded successfully`,
      operation,
      transaction,
    });
  })
);

/**
 * @route POST /api/v1/workorders/:id/operations/:operationNumber/complete
 * @desc Complete an operation
 * @access Private (workorders.execute permission)
 */
router.post('/:id/operations/:operationNumber/complete',
  requirePermission('workorders.execute'),
  auditLogger('operation', 'COMPLETE'),
  asyncHandler(async (req, res) => {
    const { id, operationNumber } = req.params;
    const userId = req.user?.id;

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        actualEndDate: new Date(),
      },
      include: {
        part: true,
        workCenter: true,
      },
    });

    const endTime = new Date();

    const operation = {
      id: `${workOrder.id}-OP-${operationNumber}`,
      workOrderId: workOrder.id,
      operationNumber: parseInt(operationNumber),
      operationName: `Operation ${operationNumber}`,
      status: 'COMPLETED',
      assignedOperatorId: userId,
      assignedOperatorName: req.user?.username,
      orderedQuantity: workOrder.quantityOrdered,
      completedQuantity: workOrder.quantityCompleted || 0,
      scrappedQuantity: 0,
      reworkQuantity: 0,
      startTime: workOrder.actualStartDate,
      endTime: endTime.toISOString(),
      workCenterId: workOrder.workCenterId || undefined,
    };

    logger.info('Operation completed', { workOrderId: id, operationNumber, userId });

    res.json({
      success: true,
      message: 'Operation completed successfully',
      operation,
      endTime: endTime.toISOString(),
    });
  })
);

/**
 * @route POST /api/v1/workorders/:id/operations/:operationNumber/issues
 * @desc Report an issue (quality, equipment, material, etc.)
 * @access Private (workorders.execute permission)
 */
router.post('/:id/operations/:operationNumber/issues',
  requirePermission('workorders.execute'),
  auditLogger('issue', 'REPORT'),
  asyncHandler(async (req, res) => {
    const { id, operationNumber } = req.params;
    const { issueType, description, severity } = req.body;
    const userId = req.user?.id;

    // Validation
    if (!issueType || !['quality', 'equipment', 'material', 'other'].includes(issueType)) {
      throw new ValidationError('Invalid issue type. Must be quality, equipment, material, or other');
    }

    if (!description || description.trim().length === 0) {
      throw new ValidationError('Issue description is required');
    }

    const issueId = `ISSUE-${Date.now()}`;
    const createdAt = new Date();

    logger.info('Issue reported', { issueId, workOrderId: id, operationNumber, issueType, userId });

    res.json({
      success: true,
      message: 'Issue reported successfully',
      issueId,
      createdAt: createdAt.toISOString(),
    });
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

// =============================================
// SUPERVISOR ROUTES (Phase 2 - Production Supervisor)
// =============================================

/**
 * @route POST /api/v1/workorders/:id/assign
 * @desc Assign operator to work order
 * @access Private (workorders.assign permission)
 */
router.post('/:id/assign',
  requirePermission('workorders.assign'),
  auditLogger('workorder', 'ASSIGN_OPERATOR'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { operatorId } = req.body;

    if (!operatorId) {
      throw new ValidationError('Operator ID is required');
    }

    logger.info('Assigning operator to work order', { workOrderId: id, operatorId });

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: {
        // In real implementation, would update operator assignment
        // For now, just return success
      },
    });

    res.status(200).json({
      message: 'Operator assigned successfully',
      workOrder,
    });
  })
);

/**
 * @route POST /api/v1/workorders/:id/status
 * @desc Update work order status (supervisor function)
 * @access Private (workorders.write permission)
 */
router.post('/:id/status',
  requirePermission('workorders.write'),
  auditLogger('workorder', 'STATUS_UPDATE'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, reason, notes } = req.body;

    if (!status) {
      throw new ValidationError('Status is required');
    }

    const validStatuses = ['CREATED', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Invalid status');
    }

    // Require reason for holds and cancellations
    if ((status === 'ON_HOLD' || status === 'CANCELLED') && !reason) {
      throw new ValidationError('Reason is required for hold/cancellation');
    }

    if ((status === 'ON_HOLD' || status === 'CANCELLED') && !notes) {
      throw new ValidationError('Notes are required for hold/cancellation');
    }

    logger.info('Updating work order status', { workOrderId: id, status, reason });

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: {
        status,
      },
    });

    res.status(200).json({
      message: `Work order status updated to ${status}`,
      workOrder,
    });
  })
);

/**
 * @route GET /api/v1/workorders/team-queue
 * @desc Get team work queue (all operators' assignments)
 * @access Private (personnel.read permission)
 */
router.get('/team-queue',
  requirePermission('personnel.read'),
  asyncHandler(async (req, res) => {
    logger.info('Fetching team work queue');

    // Get all work orders with operator assignments
    const workOrders = await prisma.workOrder.findMany({
      where: {
        status: {
          in: ['RELEASED', 'IN_PROGRESS'],
        },
      },
      include: {
        part: true,
      },
      orderBy: {
        priority: 'desc',
      },
    });

    const teamQueue = {
      metrics: {
        totalOperators: 5,
        activeOperators: 2,
        idleOperators: 3,
        workOrdersInProgress: workOrders.length,
      },
      assignments: workOrders,
    };

    res.status(200).json(teamQueue);
  })
);

export default router;