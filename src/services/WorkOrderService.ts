import { 
  WorkOrder, 
  WorkOrderStatus, 
  WorkOrderPriority, 
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  WorkOrderValidationError
} from '@/types/workOrder';
import prisma from '@/lib/database';

// Static counter for unique number generation
let workOrderCounter = 0;

export class WorkOrderService {
  constructor() {}

  /**
   * Generates a unique work order number
   */
  generateWorkOrderNumber(siteCode: string = 'MFG'): string {
    workOrderCounter++;
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-4);
    return `WO-${siteCode}-${year}-${timestamp}${workOrderCounter.toString().padStart(3, '0')}`;
  }

  /**
   * Validates work order data
   */
  validateWorkOrder(request: CreateWorkOrderRequest): WorkOrderValidationError[] {
    const errors: WorkOrderValidationError[] = [];

    if (!request.partNumber || request.partNumber.trim().length === 0) {
      errors.push({
        field: 'partNumber',
        message: 'Part number is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (request.quantityOrdered <= 0) {
      errors.push({
        field: 'quantityOrdered',
        message: 'Quantity ordered must be greater than 0',
        code: 'INVALID_QUANTITY'
      });
    }

    if (request.quantityOrdered > 10000) {
      errors.push({
        field: 'quantityOrdered',
        message: 'Quantity ordered cannot exceed 10,000 per work order',
        code: 'QUANTITY_LIMIT_EXCEEDED'
      });
    }

    if (!request.siteId || request.siteId.trim().length === 0) {
      errors.push({
        field: 'siteId',
        message: 'Site ID is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (request.dueDate && request.dueDate < new Date()) {
      errors.push({
        field: 'dueDate',
        message: 'Due date cannot be in the past',
        code: 'INVALID_DATE'
      });
    }

    return errors;
  }

  /**
   * Creates a new work order
   */
  async createWorkOrder(request: CreateWorkOrderRequest, createdBy: string): Promise<WorkOrder> {
    const validationErrors = this.validateWorkOrder(request);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // Look up part by part number
    const part = await prisma.part.findUnique({
      where: { partNumber: request.partNumber }
    });

    if (!part) {
      throw new Error(`Part with number ${request.partNumber} not found`);
    }

    // Create work order in database
    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber: this.generateWorkOrderNumber(),
        partId: part.id,
        quantity: request.quantityOrdered,
        priority: request.priority || 'NORMAL',
        status: 'CREATED',
        dueDate: request.dueDate || null,
        customerOrder: request.customerOrder,
        createdById: createdBy
      },
      include: {
        part: true,
        createdBy: true,
        assignedTo: true
      }
    });

    // Transform to application model
    return this.transformToWorkOrder(workOrder);
  }

  /**
   * Updates an existing work order
   */
  async updateWorkOrder(
    workOrder: WorkOrder, 
    updates: UpdateWorkOrderRequest,
    _updatedBy: string
  ): Promise<WorkOrder> {
    // Validate status transitions
    if (workOrder.status === WorkOrderStatus.COMPLETED) {
      throw new Error('Cannot update completed work order');
    }

    if (workOrder.status === WorkOrderStatus.CANCELLED) {
      throw new Error('Cannot update cancelled work order');
    }

    // Validate quantity update
    if (updates.quantityOrdered !== undefined) {
      if (updates.quantityOrdered <= 0) {
        throw new Error('Quantity ordered must be greater than 0');
      }
      
      if (updates.quantityOrdered < workOrder.quantityCompleted) {
        throw new Error('Cannot reduce quantity below completed quantity');
      }
    }

    // Apply updates
    const updatedWorkOrder: WorkOrder = {
      ...workOrder,
      ...updates,
      updatedAt: new Date()
    };

    return updatedWorkOrder;
  }

  /**
   * Releases work order to production
   */
  async releaseWorkOrder(workOrder: WorkOrder, _releasedBy: string): Promise<WorkOrder> {
    if (workOrder.status !== WorkOrderStatus.CREATED) {
      throw new Error(`Cannot release work order with status: ${workOrder.status}`);
    }

    // Validate prerequisites
    if (!workOrder.partId) {
      throw new Error('Part information is required before release');
    }

    if (!workOrder.routeId) {
      throw new Error('Manufacturing route is required before release');
    }

    const releasedWorkOrder: WorkOrder = {
      ...workOrder,
      status: WorkOrderStatus.RELEASED,
      updatedAt: new Date()
    };

    return releasedWorkOrder;
  }

  /**
   * Calculates work order completion percentage
   */
  calculateCompletionPercentage(workOrder: WorkOrder): number {
    if (workOrder.quantityOrdered === 0) {
      return 0;
    }
    
    return Math.round((workOrder.quantityCompleted / workOrder.quantityOrdered) * 100);
  }

  /**
   * Checks if work order is overdue
   */
  isOverdue(workOrder: WorkOrder): boolean {
    if (!workOrder.dueDate) {
      return false;
    }

    if (workOrder.status === WorkOrderStatus.COMPLETED) {
      return false;
    }

    return new Date() > workOrder.dueDate;
  }

  /**
   * Calculates estimated completion date based on remaining work
   */
  calculateEstimatedCompletion(workOrder: WorkOrder, dailyCapacity: number): Date | null {
    if (workOrder.status === WorkOrderStatus.COMPLETED) {
      return null;
    }

    if (dailyCapacity <= 0) {
      return null;
    }

    const remainingQuantity = workOrder.quantityOrdered - workOrder.quantityCompleted;
    const daysToComplete = Math.ceil(remainingQuantity / dailyCapacity);
    
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysToComplete);
    
    return estimatedDate;
  }

  /**
   * Validates if work order can be cancelled
   */
  canCancelWorkOrder(workOrder: WorkOrder): { canCancel: boolean; reason?: string } {
    if (workOrder.status === WorkOrderStatus.COMPLETED) {
      return { canCancel: false, reason: 'Cannot cancel completed work order' };
    }

    if (workOrder.status === WorkOrderStatus.CANCELLED) {
      return { canCancel: false, reason: 'Work order is already cancelled' };
    }

    if (workOrder.quantityCompleted > 0) {
      return { canCancel: false, reason: 'Cannot cancel work order with completed quantities' };
    }

    return { canCancel: true };
  }

  /**
   * Gets work order priority weight for scheduling
   */
  getPriorityWeight(priority: WorkOrderPriority): number {
    switch (priority) {
      case WorkOrderPriority.URGENT:
        return 1000;
      case WorkOrderPriority.HIGH:
        return 100;
      case WorkOrderPriority.NORMAL:
        return 10;
      case WorkOrderPriority.LOW:
        return 1;
      default:
        return 10;
    }
  }

  /**
   * Gets all work orders with filtering
   */
  async getWorkOrders(filters?: {
    status?: WorkOrderStatus;
    priority?: WorkOrderPriority;
    partNumber?: string;
    dueAfter?: Date;
    dueBefore?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ workOrders: WorkOrder[]; total: number }> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.partNumber) {
      where.part = {
        partNumber: {
          contains: filters.partNumber,
          mode: 'insensitive'
        }
      };
    }

    if (filters?.dueAfter || filters?.dueBefore) {
      where.dueDate = {};
      if (filters.dueAfter) {
        where.dueDate.gte = filters.dueAfter;
      }
      if (filters.dueBefore) {
        where.dueDate.lte = filters.dueBefore;
      }
    }

    const [workOrders, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        include: {
          part: true,
          createdBy: true,
          assignedTo: true,
          operations: {
            include: {
              routingOperation: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ],
        take: filters?.limit || 50,
        skip: filters?.offset || 0
      }),
      prisma.workOrder.count({ where })
    ]);

    return {
      workOrders: workOrders.map(wo => this.transformToWorkOrder(wo)),
      total
    };
  }

  /**
   * Gets a work order by ID
   */
  async getWorkOrderById(id: string): Promise<WorkOrder | null> {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        part: true,
        createdBy: true,
        assignedTo: true,
        operations: {
          include: {
            routingOperation: true
          }
        },
        qualityInspections: {
          include: {
            inspector: true,
            plan: true
          }
        }
      }
    });

    return workOrder ? this.transformToWorkOrder(workOrder) : null;
  }

  /**
   * Updates work order status and quantities
   */
  async updateWorkOrderProgress(
    id: string,
    updates: {
      quantityCompleted?: number;
      quantityScrap?: number;
      status?: WorkOrderStatus;
    }
  ): Promise<WorkOrder> {
    const existingWorkOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: { part: true }
    });

    if (!existingWorkOrder) {
      throw new Error('Work order not found');
    }

    // Validate quantity updates
    if (updates.quantityCompleted !== undefined) {
      if (updates.quantityCompleted < 0) {
        throw new Error('Completed quantity cannot be negative');
      }
      if (updates.quantityCompleted > existingWorkOrder.quantity) {
        throw new Error('Completed quantity cannot exceed ordered quantity');
      }
    }

    if (updates.quantityScrap !== undefined && updates.quantityScrap < 0) {
      throw new Error('Scrap quantity cannot be negative');
    }

    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        part: true,
        createdBy: true,
        assignedTo: true
      }
    });

    return this.transformToWorkOrder(updatedWorkOrder);
  }

  /**
   * Deletes a work order
   */
  async deleteWorkOrder(id: string): Promise<void> {
    await prisma.workOrder.delete({
      where: { id }
    });
  }

  /**
   * Gets work order operations
   */
  async getWorkOrderOperations(workOrderId: string): Promise<any[]> {
    const operations = await prisma.workOrderOperation.findMany({
      where: { workOrderId },
      include: {
        routingOperation: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return operations.map((op, index) => ({
      id: op.id,
      operationNumber: (index + 1) * 10, // Generate operation numbers
      operationName: `Operation ${index + 1}`,
      status: op.status,
      quantityCompleted: op.quantityCompleted,
      quantityScrapped: op.quantityScrap
    }));
  }

  /**
   * Gets dashboard metrics
   */
  async getDashboardMetrics(siteId?: string): Promise<{
    totalWorkOrders: number;
    activeWorkOrders: number;
    overdueWorkOrders: number;
    completedThisMonth: number;
  }> {
    const where: any = {};
    if (siteId) {
      // Add site filtering when site management is implemented
    }

    const [
      totalWorkOrders,
      activeWorkOrders,
      completedThisMonth,
      allWorkOrders
    ] = await Promise.all([
      prisma.workOrder.count({ where }),
      prisma.workOrder.count({
        where: {
          ...where,
          status: {
            in: [WorkOrderStatus.RELEASED, WorkOrderStatus.IN_PROGRESS]
          }
        }
      }),
      prisma.workOrder.count({
        where: {
          ...where,
          status: WorkOrderStatus.COMPLETED,
          updatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.workOrder.findMany({
        where,
        select: {
          dueDate: true,
          status: true
        }
      })
    ]);

    // Calculate overdue work orders
    const overdueWorkOrders = allWorkOrders.filter(wo => 
      wo.dueDate && 
      wo.status !== WorkOrderStatus.COMPLETED && 
      new Date() > wo.dueDate
    ).length;

    return {
      totalWorkOrders,
      activeWorkOrders,
      overdueWorkOrders,
      completedThisMonth
    };
  }

  /**
   * Transforms Prisma model to application WorkOrder type
   */
  private transformToWorkOrder(prismaWorkOrder: any): WorkOrder {
    return {
      id: prismaWorkOrder.id,
      workOrderNumber: prismaWorkOrder.workOrderNumber,
      partId: prismaWorkOrder.partId,
      partNumber: prismaWorkOrder.part?.partNumber || '',
      routeId: prismaWorkOrder.routingId,
      quantityOrdered: prismaWorkOrder.quantity,
      quantityCompleted: prismaWorkOrder.operations?.reduce(
        (sum: number, op: any) => sum + op.quantityCompleted, 0
      ) || 0,
      quantityScrapped: prismaWorkOrder.operations?.reduce(
        (sum: number, op: any) => sum + op.quantityScrap, 0
      ) || 0,
      status: prismaWorkOrder.status as WorkOrderStatus,
      priority: prismaWorkOrder.priority as WorkOrderPriority,
      customerOrder: prismaWorkOrder.customerOrder,
      dueDate: prismaWorkOrder.dueDate,
      siteId: 'default', // Add site management later
      createdBy: prismaWorkOrder.createdBy?.username || '',
      createdAt: prismaWorkOrder.createdAt,
      updatedAt: prismaWorkOrder.updatedAt
    };
  }
}