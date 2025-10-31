import {
  PrismaClient,
  MaintenanceWorkOrder,
  MaintenanceType,
  MaintenanceStatus,
  Priority,
  MaintenancePart,
  LaborEntry,
  Prisma
} from '@prisma/client';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Maintenance work order with related data
export interface MaintenanceWorkOrderWithRelations extends MaintenanceWorkOrder {
  equipment?: any;
  assignedTo?: any;
  createdBy?: any;
  updatedBy?: any;
  partsUsed?: MaintenancePart[];
  laborEntries?: LaborEntry[];
  downtimeEvents?: any[];
  followUpWorkOrder?: MaintenanceWorkOrder | null;
  parentWorkOrders?: MaintenanceWorkOrder[];
}

// Create maintenance work order data
export interface CreateMaintenanceWorkOrderData {
  workOrderNumber: string;
  equipmentId: string;
  type: MaintenanceType;
  priority?: Priority;
  status?: MaintenanceStatus;
  description: string;
  problemDescription?: string;
  assignedToId?: string;
  assignedTeam?: string;
  scheduledDate?: Date;
  dueDate?: Date;
  estimatedLaborHours?: number;
  estimatedPartsCost?: number;
  requiresFollowUp?: boolean;
  followUpDate?: Date;
  causedDowntime?: boolean;
  createdById: string;
}

// Update maintenance work order data
export interface UpdateMaintenanceWorkOrderData {
  type?: MaintenanceType;
  priority?: Priority;
  status?: MaintenanceStatus;
  description?: string;
  problemDescription?: string;
  rootCause?: string;
  correctiveAction?: string;
  workPerformed?: string;
  notes?: string;
  assignedToId?: string;
  assignedTeam?: string;
  scheduledDate?: Date;
  dueDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedLaborHours?: number;
  actualLaborHours?: number;
  estimatedPartsCost?: number;
  actualPartsCost?: number;
  downtimeMinutes?: number;
  requiresFollowUp?: boolean;
  followUpDate?: Date;
  followUpWorkOrderId?: string;
  causedDowntime?: boolean;
  updatedById: string;
}

// Maintenance work order filters
export interface MaintenanceWorkOrderFilters {
  equipmentId?: string;
  type?: MaintenanceType;
  priority?: Priority;
  status?: MaintenanceStatus;
  assignedToId?: string;
  createdById?: string;
  siteId?: string;
  areaId?: string;
  workCenterId?: string;
  dueDate?: { from?: Date; to?: Date };
  createdAt?: { from?: Date; to?: Date };
  search?: string;
  requiresFollowUp?: boolean;
  causedDowntime?: boolean;
}

// Add parts to work order
export interface AddMaintenancePartData {
  workOrderId: string;
  partNumber: string;
  partDescription?: string;
  quantity: number;
  unitCost?: number;
  lotNumber?: string;
  serialNumber?: string;
  issuedFrom?: string;
}

// Add labor entry to work order
export interface AddLaborEntryData {
  workOrderId: string;
  technicianId: string;
  startTime: Date;
  endTime?: Date;
  laborRate?: number;
  notes?: string;
}

class MaintenanceService {
  /**
   * Generate unique work order number
   */
  private async generateWorkOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WO${year}`;

    // Find the highest number for this year
    const lastWorkOrder = await prisma.maintenanceWorkOrder.findFirst({
      where: {
        workOrderNumber: { startsWith: prefix },
      },
      orderBy: { workOrderNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastWorkOrder) {
      const lastNumber = parseInt(lastWorkOrder.workOrderNumber.replace(prefix, ''));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }

  /**
   * Create maintenance work order
   */
  async createMaintenanceWorkOrder(data: CreateMaintenanceWorkOrderData): Promise<MaintenanceWorkOrder> {
    // Validate equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { id: data.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundError(`Equipment with ID ${data.equipmentId} not found`);
    }

    // Validate assigned user exists if specified
    if (data.assignedToId) {
      const user = await prisma.user.findUnique({
        where: { id: data.assignedToId },
      });

      if (!user) {
        throw new NotFoundError(`User with ID ${data.assignedToId} not found`);
      }
    }

    // Validate creator exists
    const creator = await prisma.user.findUnique({
      where: { id: data.createdById },
    });

    if (!creator) {
      throw new NotFoundError(`Creator user with ID ${data.createdById} not found`);
    }

    // Check if work order number already exists
    const existing = await prisma.maintenanceWorkOrder.findUnique({
      where: { workOrderNumber: data.workOrderNumber },
    });

    if (existing) {
      // Generate a new unique number
      data.workOrderNumber = await this.generateWorkOrderNumber();
    }

    return prisma.maintenanceWorkOrder.create({
      data: {
        ...data,
        status: data.status || MaintenanceStatus.PENDING,
        priority: data.priority || Priority.NORMAL,
        updatedById: data.createdById,
      },
    });
  }

  /**
   * Get all maintenance work orders with filtering and pagination
   */
  async getAllMaintenanceWorkOrders(
    filters?: MaintenanceWorkOrderFilters,
    options?: { skip?: number; take?: number; includeRelations?: boolean }
  ): Promise<{ workOrders: MaintenanceWorkOrderWithRelations[]; total: number }> {
    const where: Prisma.MaintenanceWorkOrderWhereInput = {};

    if (filters) {
      if (filters.equipmentId) where.equipmentId = filters.equipmentId;
      if (filters.type) where.type = filters.type;
      if (filters.priority) where.priority = filters.priority;
      if (filters.status) where.status = filters.status;
      if (filters.assignedToId) where.assignedToId = filters.assignedToId;
      if (filters.createdById) where.createdById = filters.createdById;
      if (filters.requiresFollowUp !== undefined) where.requiresFollowUp = filters.requiresFollowUp;
      if (filters.causedDowntime !== undefined) where.causedDowntime = filters.causedDowntime;

      // Equipment location filters
      if (filters.siteId || filters.areaId || filters.workCenterId) {
        where.equipment = {};
        if (filters.siteId) where.equipment.siteId = filters.siteId;
        if (filters.areaId) where.equipment.areaId = filters.areaId;
        if (filters.workCenterId) where.equipment.workCenterId = filters.workCenterId;
      }

      // Date range filters
      if (filters.dueDate) {
        where.dueDate = {};
        if (filters.dueDate.from) where.dueDate.gte = filters.dueDate.from;
        if (filters.dueDate.to) where.dueDate.lte = filters.dueDate.to;
      }

      if (filters.createdAt) {
        where.createdAt = {};
        if (filters.createdAt.from) where.createdAt.gte = filters.createdAt.from;
        if (filters.createdAt.to) where.createdAt.lte = filters.createdAt.to;
      }

      // Text search
      if (filters.search) {
        where.OR = [
          { workOrderNumber: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { problemDescription: { contains: filters.search, mode: 'insensitive' } },
          { equipment: { name: { contains: filters.search, mode: 'insensitive' } } },
          { equipment: { equipmentNumber: { contains: filters.search, mode: 'insensitive' } } },
        ];
      }
    }

    const include = options?.includeRelations
      ? {
          equipment: {
            select: {
              id: true,
              equipmentNumber: true,
              name: true,
              status: true,
              site: { select: { id: true, name: true } },
              area: { select: { id: true, name: true } },
              workCenter: { select: { id: true, name: true } },
            },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, username: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, username: true },
          },
          updatedBy: {
            select: { id: true, firstName: true, lastName: true, username: true },
          },
          partsUsed: true,
          laborEntries: {
            include: {
              technician: {
                select: { id: true, firstName: true, lastName: true, username: true },
              },
            },
          },
        }
      : undefined;

    const [workOrders, total] = await Promise.all([
      prisma.maintenanceWorkOrder.findMany({
        where,
        include,
        skip: options?.skip,
        take: options?.take,
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.maintenanceWorkOrder.count({ where }),
    ]);

    return { workOrders, total };
  }

  /**
   * Get maintenance work order by ID
   */
  async getMaintenanceWorkOrderById(id: string): Promise<MaintenanceWorkOrderWithRelations | null> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('Invalid work order ID provided');
    }

    return prisma.maintenanceWorkOrder.findUnique({
      where: { id: id.trim() },
      include: {
        equipment: {
          include: {
            site: true,
            area: true,
            workCenter: true,
            equipmentTypeRef: true,
          },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
        updatedBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
        partsUsed: true,
        laborEntries: {
          include: {
            technician: {
              select: { id: true, firstName: true, lastName: true, username: true },
            },
          },
          orderBy: { startTime: 'desc' },
        },
        downtimeEvents: {
          include: {
            downtimeReason: true,
          },
          orderBy: { startTime: 'desc' },
        },
        followUpWorkOrder: true,
        parentWorkOrders: {
          select: {
            id: true,
            workOrderNumber: true,
            description: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Get maintenance work order by work order number
   */
  async getMaintenanceWorkOrderByNumber(workOrderNumber: string): Promise<MaintenanceWorkOrder | null> {
    return prisma.maintenanceWorkOrder.findUnique({
      where: { workOrderNumber },
    });
  }

  /**
   * Update maintenance work order
   */
  async updateMaintenanceWorkOrder(id: string, data: UpdateMaintenanceWorkOrderData): Promise<MaintenanceWorkOrder> {
    const workOrder = await this.getMaintenanceWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundError(`Maintenance work order with ID ${id} not found`);
    }

    // Validate assigned user if changing
    if (data.assignedToId) {
      const user = await prisma.user.findUnique({
        where: { id: data.assignedToId },
      });

      if (!user) {
        throw new NotFoundError(`User with ID ${data.assignedToId} not found`);
      }
    }

    // Validate updater exists
    const updater = await prisma.user.findUnique({
      where: { id: data.updatedById },
    });

    if (!updater) {
      throw new NotFoundError(`Updater user with ID ${data.updatedById} not found`);
    }

    // Auto-calculate labor hours and costs
    if (data.status === MaintenanceStatus.COMPLETED && !data.actualLaborHours) {
      const laborEntries = await prisma.laborEntry.findMany({
        where: { workOrderId: id },
      });

      const totalHours = laborEntries.reduce((sum, entry) => {
        return sum + (entry.laborHours?.toNumber() || 0);
      }, 0);

      data.actualLaborHours = totalHours;
    }

    if (data.status === MaintenanceStatus.COMPLETED && !data.actualPartsCost) {
      const parts = await prisma.maintenancePart.findMany({
        where: { workOrderId: id },
      });

      const totalCost = parts.reduce((sum, part) => {
        return sum + (part.totalCost?.toNumber() || 0);
      }, 0);

      data.actualPartsCost = totalCost;
    }

    return prisma.maintenanceWorkOrder.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete maintenance work order
   */
  async deleteMaintenanceWorkOrder(id: string): Promise<MaintenanceWorkOrder> {
    const workOrder = await this.getMaintenanceWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundError(`Maintenance work order with ID ${id} not found`);
    }

    // Check if work order can be deleted (not in progress or completed)
    if (workOrder.status === MaintenanceStatus.IN_PROGRESS) {
      throw new ValidationError('Cannot delete work order that is in progress');
    }

    return prisma.maintenanceWorkOrder.delete({
      where: { id },
    });
  }

  /**
   * Start maintenance work order
   */
  async startMaintenanceWorkOrder(id: string, startedBy: string): Promise<MaintenanceWorkOrder> {
    const workOrder = await this.getMaintenanceWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundError(`Maintenance work order with ID ${id} not found`);
    }

    if (workOrder.status !== MaintenanceStatus.PENDING && workOrder.status !== MaintenanceStatus.SCHEDULED) {
      throw new ValidationError(`Cannot start work order with status ${workOrder.status}`);
    }

    return prisma.maintenanceWorkOrder.update({
      where: { id },
      data: {
        status: MaintenanceStatus.IN_PROGRESS,
        startedAt: new Date(),
        updatedById: startedBy,
      },
    });
  }

  /**
   * Complete maintenance work order
   */
  async completeMaintenanceWorkOrder(
    id: string,
    data: {
      workPerformed: string;
      notes?: string;
      completedBy: string;
      rootCause?: string;
      correctiveAction?: string;
    }
  ): Promise<MaintenanceWorkOrder> {
    const workOrder = await this.getMaintenanceWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundError(`Maintenance work order with ID ${id} not found`);
    }

    if (workOrder.status !== MaintenanceStatus.IN_PROGRESS) {
      throw new ValidationError(`Cannot complete work order with status ${workOrder.status}`);
    }

    // Calculate actual labor hours and costs
    const laborEntries = await prisma.laborEntry.findMany({
      where: { workOrderId: id },
    });

    const actualLaborHours = laborEntries.reduce((sum, entry) => {
      return sum + (entry.laborHours?.toNumber() || 0);
    }, 0);

    const parts = await prisma.maintenancePart.findMany({
      where: { workOrderId: id },
    });

    const actualPartsCost = parts.reduce((sum, part) => {
      return sum + (part.totalCost?.toNumber() || 0);
    }, 0);

    // Update equipment maintenance schedule if this was preventive maintenance
    if (workOrder.type === MaintenanceType.PREVENTIVE && workOrder.equipment) {
      const equipment = workOrder.equipment;
      if (equipment.maintenanceInterval) {
        const nextMaintenanceDate = new Date();
        nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + equipment.maintenanceInterval);

        await prisma.equipment.update({
          where: { id: workOrder.equipmentId },
          data: {
            lastMaintenanceDate: new Date(),
            nextMaintenanceDate,
          },
        });
      }
    }

    return prisma.maintenanceWorkOrder.update({
      where: { id },
      data: {
        status: MaintenanceStatus.COMPLETED,
        completedAt: new Date(),
        workPerformed: data.workPerformed,
        notes: data.notes,
        rootCause: data.rootCause,
        correctiveAction: data.correctiveAction,
        actualLaborHours,
        actualPartsCost,
        updatedById: data.completedBy,
      },
    });
  }

  /**
   * Add parts to maintenance work order
   */
  async addMaintenancePart(data: AddMaintenancePartData): Promise<MaintenancePart> {
    const workOrder = await this.getMaintenanceWorkOrderById(data.workOrderId);
    if (!workOrder) {
      throw new NotFoundError(`Maintenance work order with ID ${data.workOrderId} not found`);
    }

    const totalCost = data.unitCost ? data.quantity * data.unitCost : undefined;

    return prisma.maintenancePart.create({
      data: {
        ...data,
        totalCost,
      },
    });
  }

  /**
   * Update maintenance part
   */
  async updateMaintenancePart(
    partId: string,
    data: Partial<AddMaintenancePartData>
  ): Promise<MaintenancePart> {
    const part = await prisma.maintenancePart.findUnique({
      where: { id: partId },
    });

    if (!part) {
      throw new NotFoundError(`Maintenance part with ID ${partId} not found`);
    }

    const updateData: any = { ...data };
    if (data.quantity && data.unitCost) {
      updateData.totalCost = data.quantity * data.unitCost;
    } else if (data.quantity && part.unitCost) {
      updateData.totalCost = data.quantity * part.unitCost.toNumber();
    } else if (data.unitCost && part.quantity) {
      updateData.totalCost = data.unitCost * part.quantity.toNumber();
    }

    return prisma.maintenancePart.update({
      where: { id: partId },
      data: updateData,
    });
  }

  /**
   * Remove maintenance part
   */
  async removeMaintenancePart(partId: string): Promise<MaintenancePart> {
    const part = await prisma.maintenancePart.findUnique({
      where: { id: partId },
    });

    if (!part) {
      throw new NotFoundError(`Maintenance part with ID ${partId} not found`);
    }

    return prisma.maintenancePart.delete({
      where: { id: partId },
    });
  }

  /**
   * Add labor entry to maintenance work order
   */
  async addLaborEntry(data: AddLaborEntryData): Promise<LaborEntry> {
    const workOrder = await this.getMaintenanceWorkOrderById(data.workOrderId);
    if (!workOrder) {
      throw new NotFoundError(`Maintenance work order with ID ${data.workOrderId} not found`);
    }

    const technician = await prisma.user.findUnique({
      where: { id: data.technicianId },
    });

    if (!technician) {
      throw new NotFoundError(`Technician with ID ${data.technicianId} not found`);
    }

    // Calculate labor hours and cost if end time is provided
    let laborHours: number | undefined;
    let laborCost: number | undefined;

    if (data.endTime) {
      laborHours = (data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60 * 60); // Hours
      if (data.laborRate) {
        laborCost = laborHours * data.laborRate;
      }
    }

    return prisma.laborEntry.create({
      data: {
        ...data,
        laborHours,
        laborCost,
      },
    });
  }

  /**
   * Update labor entry
   */
  async updateLaborEntry(
    entryId: string,
    data: Partial<AddLaborEntryData>
  ): Promise<LaborEntry> {
    const entry = await prisma.laborEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundError(`Labor entry with ID ${entryId} not found`);
    }

    const updateData: any = { ...data };

    // Recalculate hours and cost if times or rate change
    const startTime = data.startTime || entry.startTime;
    const endTime = data.endTime || entry.endTime;
    const laborRate = data.laborRate || entry.laborRate?.toNumber();

    if (startTime && endTime) {
      const laborHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      updateData.laborHours = laborHours;

      if (laborRate) {
        updateData.laborCost = laborHours * laborRate;
      }
    }

    return prisma.laborEntry.update({
      where: { id: entryId },
      data: updateData,
    });
  }

  /**
   * Remove labor entry
   */
  async removeLaborEntry(entryId: string): Promise<LaborEntry> {
    const entry = await prisma.laborEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundError(`Labor entry with ID ${entryId} not found`);
    }

    return prisma.laborEntry.delete({
      where: { id: entryId },
    });
  }

  /**
   * Get maintenance work orders by equipment
   */
  async getMaintenanceWorkOrdersByEquipment(
    equipmentId: string,
    options?: { limit?: number; status?: MaintenanceStatus[] }
  ) {
    const where: Prisma.MaintenanceWorkOrderWhereInput = { equipmentId };

    if (options?.status) {
      where.status = { in: options.status };
    }

    return prisma.maintenanceWorkOrder.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
        partsUsed: true,
        laborEntries: true,
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 20,
    });
  }

  /**
   * Get overdue maintenance work orders
   */
  async getOverdueMaintenanceWorkOrders(siteId?: string) {
    const where: Prisma.MaintenanceWorkOrderWhereInput = {
      dueDate: { lt: new Date() },
      status: { not: MaintenanceStatus.COMPLETED },
    };

    if (siteId) {
      where.equipment = { siteId };
    }

    return prisma.maintenanceWorkOrder.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            equipmentNumber: true,
            name: true,
            criticality: true,
            site: { select: { id: true, name: true } },
          },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });
  }

  /**
   * Get maintenance statistics
   */
  async getMaintenanceStatistics(siteId?: string, days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: Prisma.MaintenanceWorkOrderWhereInput = {
      createdAt: { gte: startDate },
    };

    if (siteId) {
      where.equipment = { siteId };
    }

    const [
      totalWorkOrders,
      completedWorkOrders,
      inProgressWorkOrders,
      overdueWorkOrders,
      workOrdersByType,
      averageCompletionTime,
      totalMaintenanceCost,
    ] = await Promise.all([
      prisma.maintenanceWorkOrder.count({ where }),
      prisma.maintenanceWorkOrder.count({
        where: { ...where, status: MaintenanceStatus.COMPLETED },
      }),
      prisma.maintenanceWorkOrder.count({
        where: { ...where, status: MaintenanceStatus.IN_PROGRESS },
      }),
      prisma.maintenanceWorkOrder.count({
        where: {
          ...where,
          dueDate: { lt: new Date() },
          status: { not: MaintenanceStatus.COMPLETED },
        },
      }),
      prisma.maintenanceWorkOrder.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
      }),
      prisma.maintenanceWorkOrder.aggregate({
        where: {
          ...where,
          status: MaintenanceStatus.COMPLETED,
          startedAt: { not: null },
          completedAt: { not: null },
        },
        _avg: {
          actualLaborHours: true,
        },
      }),
      prisma.maintenanceWorkOrder.aggregate({
        where: { ...where, status: MaintenanceStatus.COMPLETED },
        _sum: {
          actualPartsCost: true,
        },
      }),
    ]);

    return {
      period: `${days} days`,
      totalWorkOrders,
      completedWorkOrders,
      inProgressWorkOrders,
      overdueWorkOrders,
      completionRate: totalWorkOrders > 0 ? (completedWorkOrders / totalWorkOrders) * 100 : 0,
      workOrdersByType: workOrdersByType.map((item) => ({
        type: item.type,
        count: item._count.type,
      })),
      averageCompletionTimeHours: averageCompletionTime._avg.actualLaborHours?.toNumber() || 0,
      totalMaintenanceCost: totalMaintenanceCost._sum.actualPartsCost?.toNumber() || 0,
    };
  }
}

export default new MaintenanceService();