import { PrismaClient, Equipment, EquipmentClass, EquipmentState, EquipmentStatus, Area, CriticalityLevel, EquipmentType, Prisma } from '@prisma/client';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Equipment with related data
export interface EquipmentWithRelations extends Equipment {
  parentEquipment?: Equipment | null;
  childEquipment?: Equipment[];
  site?: any;
  area?: Area | null;
  workCenter?: any;
  stateHistory?: any[];
  performanceData?: any[];
  equipmentTypeRef?: EquipmentType | null;
  downtimeEvents?: any[];
  maintenanceWorkOrders?: any[];
}

// Create equipment data type
export interface CreateEquipmentData {
  equipmentNumber: string;
  name: string;
  description?: string;
  equipmentClass: EquipmentClass;
  equipmentType?: string;
  equipmentLevel?: number;
  parentEquipmentId?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: Date;
  commissionDate?: Date;
  siteId?: string;
  areaId?: string;
  workCenterId?: string;
  status: EquipmentStatus;
  currentState?: EquipmentState;
  ratedCapacity?: number;
  currentCapacity?: number;

  // Enhanced maintenance fields for Issue #94
  equipmentTypeId?: string;
  assetTag?: string;
  purchaseDate?: Date;
  warrantyExpiration?: Date;
  criticality?: CriticalityLevel;
  capacityUnit?: string;
  acquisitionCost?: number;
  currentValue?: number;
  depreciationMethod?: string;
  maintenanceInterval?: number; // Days
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  requiresCalibration?: boolean;
}

// Update equipment data type
export interface UpdateEquipmentData {
  name?: string;
  description?: string;
  equipmentClass?: EquipmentClass;
  equipmentType?: string;
  equipmentLevel?: number;
  parentEquipmentId?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: Date;
  commissionDate?: Date;
  siteId?: string;
  areaId?: string;
  workCenterId?: string;
  status?: EquipmentStatus;
  ratedCapacity?: number;
  currentCapacity?: number;
  utilizationRate?: number;
  availability?: number;
  performance?: number;
  quality?: number;
  oee?: number;

  // Enhanced maintenance fields for Issue #94
  equipmentTypeId?: string;
  assetTag?: string;
  purchaseDate?: Date;
  warrantyExpiration?: Date;
  criticality?: CriticalityLevel;
  capacityUnit?: string;
  acquisitionCost?: number;
  currentValue?: number;
  depreciationMethod?: string;
  maintenanceInterval?: number; // Days
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  totalRunTime?: number;
  totalDownTime?: number;
  mtbf?: number;
  mttr?: number;
  requiresCalibration?: boolean;
}

// Equipment state change data
export interface EquipmentStateChange {
  equipmentId: string;
  newState: EquipmentState;
  reason?: string;
  changedBy?: string;
  workOrderId?: string;
  operationId?: string;
}

// Equipment query filters
export interface EquipmentFilters {
  equipmentClass?: EquipmentClass;
  equipmentType?: string;
  status?: EquipmentStatus;
  currentState?: EquipmentState;
  siteId?: string;
  areaId?: string;
  workCenterId?: string;
  parentEquipmentId?: string;
  search?: string; // Search by name or equipment number

  // Enhanced maintenance filters for Issue #94
  equipmentTypeId?: string;
  criticality?: CriticalityLevel;
  maintenanceDue?: boolean;
  requiresCalibration?: boolean;
  assetTag?: string;
}

// Equipment type interfaces for Issue #94
export interface CreateEquipmentTypeData {
  code: string;
  name: string;
  description?: string;
  category?: string;
  defaultMaintenanceInterval?: number;
  defaultMaintenanceProcedure?: string;
}

export interface UpdateEquipmentTypeData {
  code?: string;
  name?: string;
  description?: string;
  category?: string;
  defaultMaintenanceInterval?: number;
  defaultMaintenanceProcedure?: string;
}

// Equipment maintenance metrics for Issue #94
export interface EquipmentMetrics {
  equipmentId: string;
  totalRunTime: number;
  totalDownTime: number;
  mtbf?: number; // Mean Time Between Failures (hours)
  mttr?: number; // Mean Time To Repair (hours)
  availability: number;
  reliability: number;
  maintainability: number;
  lastCalculated: Date;
}

class EquipmentService {
  /**
   * Get all equipment with optional filtering and pagination
   */
  async getAllEquipment(
    filters?: EquipmentFilters,
    options?: { skip?: number; take?: number; includeRelations?: boolean }
  ): Promise<{ equipment: EquipmentWithRelations[]; total: number }> {
    const where: Prisma.EquipmentWhereInput = {};

    if (filters) {
      if (filters.equipmentClass) where.equipmentClass = filters.equipmentClass;
      if (filters.equipmentType) where.equipmentType = filters.equipmentType;
      if (filters.status) where.status = filters.status;
      if (filters.currentState) where.currentState = filters.currentState;
      if (filters.siteId) where.siteId = filters.siteId;
      if (filters.areaId) where.areaId = filters.areaId;
      if (filters.workCenterId) where.workCenterId = filters.workCenterId;
      if (filters.parentEquipmentId !== undefined) {
        where.parentEquipmentId = filters.parentEquipmentId || null;
      }

      // Enhanced maintenance filters for Issue #94
      if (filters.equipmentTypeId) where.equipmentTypeId = filters.equipmentTypeId;
      if (filters.criticality) where.criticality = filters.criticality;
      if (filters.requiresCalibration !== undefined) where.requiresCalibration = filters.requiresCalibration;
      if (filters.assetTag) where.assetTag = { contains: filters.assetTag, mode: 'insensitive' };

      if (filters.maintenanceDue) {
        where.nextMaintenanceDate = {
          lte: new Date(), // Maintenance is due if next maintenance date is today or in the past
        };
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { equipmentNumber: { contains: filters.search, mode: 'insensitive' } },
          { assetTag: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
    }

    const include = options?.includeRelations
      ? {
          parentEquipment: true,
          childEquipment: true,
          site: true,
          area: true,
          workCenter: true,
          equipmentTypeRef: true,
          downtimeEvents: {
            take: 10,
            orderBy: { startTime: 'desc' },
          },
          maintenanceWorkOrders: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        }
      : undefined;

    const [equipment, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        include,
        skip: options?.skip,
        take: options?.take,
        orderBy: { equipmentNumber: 'asc' },
      }),
      prisma.equipment.count({ where }),
    ]);

    return { equipment, total };
  }

  /**
   * Get equipment by ID with full relations
   */
  async getEquipmentById(id: string): Promise<EquipmentWithRelations | null> {
    // ✅ PHASE 8 FIX: Enhanced equipment ID validation to prevent business logic conflicts
    if (!id || typeof id !== 'string' || id.trim() === '' || id === 'undefined' || id === 'null') {
      throw new Error(`Invalid equipment ID provided: "${id}". Equipment ID must be a non-empty string.`);
    }

    const cleanId = id.trim();

    return prisma.equipment.findUnique({
      where: { id: cleanId },
      include: {
        parentEquipment: true,
        childEquipment: true,
        site: true,
        area: true,
        workCenter: true,
        equipmentTypeRef: true,
        stateHistory: {
          orderBy: { stateStartTime: 'desc' },
          take: 10, // Last 10 state changes
        },
        performanceData: {
          orderBy: { periodStart: 'desc' },
          take: 30, // Last 30 periods
        },
        downtimeEvents: {
          orderBy: { startTime: 'desc' },
          take: 20, // Last 20 downtime events
          include: {
            downtimeReason: true,
          },
        },
        maintenanceWorkOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20, // Last 20 maintenance work orders
          include: {
            assignedTo: {
              select: { id: true, firstName: true, lastName: true, username: true },
            },
          },
        },
      },
    });
  }

  /**
   * Get equipment by equipment number
   */
  async getEquipmentByNumber(equipmentNumber: string): Promise<Equipment | null> {
    return prisma.equipment.findUnique({
      where: { equipmentNumber },
    });
  }

  /**
   * Create new equipment
   */
  async createEquipment(data: CreateEquipmentData): Promise<Equipment> {
    // Validate equipment number is unique
    const existing = await this.getEquipmentByNumber(data.equipmentNumber);
    if (existing) {
      throw new ConflictError(`Equipment with number ${data.equipmentNumber} already exists`);
    }

    // Validate parent equipment exists if specified
    if (data.parentEquipmentId) {
      const parent = await this.getEquipmentById(data.parentEquipmentId);
      if (!parent) {
        throw new NotFoundError(`Parent equipment with ID ${data.parentEquipmentId} not found`);
      }
    }

    // Validate references exist
    if (data.siteId) {
      const site = await prisma.site.findUnique({ where: { id: data.siteId } });
      if (!site) {
        throw new NotFoundError(`Site with ID ${data.siteId} not found`);
      }
    }

    if (data.areaId) {
      const area = await prisma.area.findUnique({ where: { id: data.areaId } });
      if (!area) {
        throw new NotFoundError(`Area with ID ${data.areaId} not found`);
      }
    }

    if (data.workCenterId) {
      const workCenter = await prisma.workCenter.findUnique({ where: { id: data.workCenterId } });
      if (!workCenter) {
        throw new NotFoundError(`Work center with ID ${data.workCenterId} not found`);
      }
    }

    // ✅ PHASE 9D FIX: Map legacy field names to current schema
    const mappedData = { ...data };

    // Handle legacy field mapping: type -> equipmentType
    if ('type' in mappedData && !mappedData.equipmentType) {
      mappedData.equipmentType = (mappedData as any).type;
      delete (mappedData as any).type;
    }

    // Create equipment
    return prisma.equipment.create({
      data: {
        ...mappedData,
        currentState: mappedData.currentState || EquipmentState.IDLE,
        equipmentLevel: mappedData.equipmentLevel || 1,
      },
    });
  }

  /**
   * Update equipment
   */
  async updateEquipment(id: string, data: UpdateEquipmentData): Promise<Equipment> {
    const equipment = await this.getEquipmentById(id);
    if (!equipment) {
      throw new NotFoundError(`Equipment with ID ${id} not found`);
    }

    // Validate parent equipment if changing
    if (data.parentEquipmentId !== undefined) {
      if (data.parentEquipmentId) {
        // Prevent circular references
        if (data.parentEquipmentId === id) {
          throw new ValidationError('Equipment cannot be its own parent');
        }

        const parent = await this.getEquipmentById(data.parentEquipmentId);
        if (!parent) {
          throw new NotFoundError(`Parent equipment with ID ${data.parentEquipmentId} not found`);
        }

        // Check if this would create a circular reference
        const isCircular = await this.wouldCreateCircularReference(id, data.parentEquipmentId);
        if (isCircular) {
          throw new ValidationError('Cannot set parent: would create circular reference in hierarchy');
        }
      }
    }

    return prisma.equipment.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete equipment (only if no children)
   */
  async deleteEquipment(id: string): Promise<Equipment> {
    const equipment = await this.getEquipmentById(id);
    if (!equipment) {
      throw new NotFoundError(`Equipment with ID ${id} not found`);
    }

    // Check for child equipment
    if (equipment.childEquipment && equipment.childEquipment.length > 0) {
      throw new ValidationError(
        `Cannot delete equipment: has ${equipment.childEquipment.length} child equipment. Remove children first.`
      );
    }

    return prisma.equipment.delete({
      where: { id },
    });
  }

  /**
   * Get equipment hierarchy (children at all levels)
   */
  async getEquipmentHierarchy(equipmentId: string): Promise<EquipmentWithRelations[]> {
    const equipment = await this.getEquipmentById(equipmentId);
    if (!equipment) {
      throw new NotFoundError(`Equipment with ID ${equipmentId} not found`);
    }

    return this.getDescendants(equipmentId);
  }

  /**
   * Get all descendants recursively
   */
  private async getDescendants(equipmentId: string): Promise<EquipmentWithRelations[]> {
    const children = await prisma.equipment.findMany({
      where: { parentEquipmentId: equipmentId },
      include: {
        childEquipment: true,
        parentEquipment: true,
      },
    });

    const descendants: EquipmentWithRelations[] = [...children];

    for (const child of children) {
      const childDescendants = await this.getDescendants(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  /**
   * Get equipment ancestors (parent chain)
   */
  async getEquipmentAncestors(equipmentId: string): Promise<Equipment[]> {
    const equipment = await this.getEquipmentById(equipmentId);
    if (!equipment) {
      throw new NotFoundError(`Equipment with ID ${equipmentId} not found`);
    }

    const ancestors: Equipment[] = [];
    let current = equipment;

    while (current.parentEquipmentId) {
      const parent = await prisma.equipment.findUnique({
        where: { id: current.parentEquipmentId },
      });
      if (!parent) break;
      ancestors.push(parent);
      current = parent;
    }

    return ancestors;
  }

  /**
   * Change equipment state (with history tracking)
   */
  async changeEquipmentState(stateChange: EquipmentStateChange): Promise<Equipment> {
    const { equipmentId, newState, reason, changedBy, workOrderId, operationId } = stateChange;

    // ✅ PHASE 8B FIX: Validate equipment state enum values
    // Valid states: IDLE, RUNNING, BLOCKED, STARVED, FAULT, MAINTENANCE, SETUP, EMERGENCY
    const validStates = Object.values(EquipmentState) as string[];
    if (!validStates.includes(newState as string)) {
      throw new ValidationError(`Invalid equipment state: ${newState}. Valid states are: ${validStates.join(', ')}`);
    }

    const equipment = await this.getEquipmentById(equipmentId);
    if (!equipment) {
      throw new NotFoundError(`Equipment with ID ${equipmentId} not found`);
    }

    const previousState = equipment.currentState;

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Close previous state history entry
      await tx.equipmentStateHistory.updateMany({
        where: {
          equipmentId,
          stateEndTime: null,
        },
        data: {
          stateEndTime: new Date(),
          duration: Math.floor((Date.now() - equipment.stateChangedAt.getTime()) / 1000),
        },
      });

      // Create new state history entry
      await tx.equipmentStateHistory.create({
        data: {
          equipmentId,
          previousState,
          newState,
          reason,
          changedBy,
          workOrderId,
          operationId,
          downtime: this.isDowntimeState(newState),
          stateStartTime: new Date(),
        },
      });

      // Update equipment current state
      return tx.equipment.update({
        where: { id: equipmentId },
        data: {
          currentState: newState,
          stateChangedAt: new Date(),
          // Update status based on state
          status: this.getStatusFromState(newState),
        },
      });
    });

    return result;
  }

  /**
   * Get equipment state history
   */
  async getEquipmentStateHistory(
    equipmentId: string,
    options?: { from?: Date; to?: Date; limit?: number }
  ) {
    const where: Prisma.EquipmentStateHistoryWhereInput = { equipmentId };

    if (options?.from || options?.to) {
      where.stateStartTime = {};
      if (options.from) where.stateStartTime.gte = options.from;
      if (options.to) where.stateStartTime.lte = options.to;
    }

    return prisma.equipmentStateHistory.findMany({
      where,
      orderBy: { stateStartTime: 'desc' },
      take: options?.limit || 100,
    });
  }

  /**
   * Check if a state represents downtime for OEE calculations
   */
  private isDowntimeState(state: EquipmentState): boolean {
    return ([
      EquipmentState.BLOCKED,
      EquipmentState.STARVED,
      EquipmentState.FAULT,
      EquipmentState.EMERGENCY,
    ] as EquipmentState[]).includes(state);
  }

  /**
   * Map equipment state to equipment status
   */
  private getStatusFromState(state: EquipmentState): EquipmentStatus {
    switch (state) {
      case EquipmentState.RUNNING:
        return EquipmentStatus.OPERATIONAL;
      case EquipmentState.IDLE:
        return EquipmentStatus.AVAILABLE;
      case EquipmentState.MAINTENANCE:
      case EquipmentState.SETUP:
        return EquipmentStatus.MAINTENANCE;
      case EquipmentState.FAULT:
      case EquipmentState.EMERGENCY:
      case EquipmentState.BLOCKED:
      case EquipmentState.STARVED:
        return EquipmentStatus.DOWN;
      default:
        return EquipmentStatus.AVAILABLE;
    }
  }

  /**
   * Check if setting parentId would create a circular reference
   */
  private async wouldCreateCircularReference(
    equipmentId: string,
    proposedParentId: string
  ): Promise<boolean> {
    // Get all ancestors of the proposed parent
    const ancestors = await this.getEquipmentAncestors(proposedParentId);

    // If equipmentId is in the ancestor chain, it would be circular
    return ancestors.some((ancestor) => ancestor.id === equipmentId);
  }

  /**
   * Add capability to equipment (ISA-95 Task 1.1)
   */
  async addCapability(data: {
    equipmentId: string;
    capabilityType: string;
    capability: string;
    description?: string;
    parameters?: any;
    certifiedDate?: Date;
    expiryDate?: Date;
  }) {
    // Verify equipment exists
    const equipment = await this.getEquipmentById(data.equipmentId);
    if (!equipment) {
      throw new NotFoundError(`Equipment with ID ${data.equipmentId} not found`);
    }

    // Create capability
    return prisma.equipmentCapability.create({
      data: {
        equipmentId: data.equipmentId,
        capabilityType: data.capabilityType,
        capability: data.capability,
        description: data.description,
        parameters: data.parameters,
        certifiedDate: data.certifiedDate,
        expiryDate: data.expiryDate,
      },
    });
  }

  /**
   * Remove capability from equipment
   */
  async removeCapability(capabilityId: string) {
    const capability = await prisma.equipmentCapability.findUnique({
      where: { id: capabilityId },
    });

    if (!capability) {
      throw new NotFoundError(`Capability with ID ${capabilityId} not found`);
    }

    return prisma.equipmentCapability.delete({
      where: { id: capabilityId },
    });
  }

  /**
   * Get capabilities for equipment
   */
  async getEquipmentCapabilities(equipmentId: string) {
    return prisma.equipmentCapability.findMany({
      where: {
        equipmentId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get equipment by capability
   */
  async getEquipmentByCapability(
    capability: string,
    options?: { capabilityType?: string; includeInactive?: boolean }
  ) {
    const where: Prisma.EquipmentCapabilityWhereInput = {
      capability: { contains: capability, mode: 'insensitive' },
      isActive: options?.includeInactive ? undefined : true,
    };

    if (options?.capabilityType) {
      where.capabilityType = options.capabilityType;
    }

    const capabilities = await prisma.equipmentCapability.findMany({
      where,
      include: {
        equipment: {
          include: {
            workUnit: true,
            workCenter: true,
            area: true,
            site: true,
          },
        },
      },
    });

    // Return unique equipment (remove duplicates)
    const equipmentMap = new Map();
    capabilities.forEach((cap) => {
      if (!equipmentMap.has(cap.equipment.id)) {
        equipmentMap.set(cap.equipment.id, cap.equipment);
      }
    });

    return Array.from(equipmentMap.values());
  }

  /**
   * Update capability
   */
  async updateCapability(
    capabilityId: string,
    data: {
      capabilityType?: string;
      capability?: string;
      description?: string;
      parameters?: any;
      certifiedDate?: Date;
      expiryDate?: Date;
      isActive?: boolean;
    }
  ) {
    const capability = await prisma.equipmentCapability.findUnique({
      where: { id: capabilityId },
    });

    if (!capability) {
      throw new NotFoundError(`Capability with ID ${capabilityId} not found`);
    }

    return prisma.equipmentCapability.update({
      where: { id: capabilityId },
      data,
    });
  }

  /**
   * Get full hierarchy path for equipment (ISA-95 6-level hierarchy)
   * Returns: Enterprise → Site → Area → WorkCenter → WorkUnit → Equipment
   */
  async getFullHierarchyPath(equipmentId: string) {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        workUnit: {
          include: {
            workCenter: {
              include: {
                area: {
                  include: {
                    site: {
                      include: {
                        enterprise: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!equipment) {
      throw new NotFoundError(`Equipment with ID ${equipmentId} not found`);
    }

    return {
      enterprise: equipment.workUnit?.workCenter?.area?.site?.enterprise || null,
      site: equipment.workUnit?.workCenter?.area?.site || null,
      area: equipment.workUnit?.workCenter?.area || null,
      workCenter: equipment.workUnit?.workCenter || null,
      workUnit: equipment.workUnit || null,
      equipment: equipment,
    };
  }

  /**
   * Get equipment by hierarchy level
   */
  async getEquipmentByLevel(level: number) {
    return prisma.equipment.findMany({
      where: { equipmentLevel: level },
      include: {
        workUnit: true,
        workCenter: true,
        area: true,
        site: true,
      },
      orderBy: { equipmentNumber: 'asc' },
    });
  }

  // ============================================================================
  // ENHANCED MAINTENANCE METHODS FOR ISSUE #94
  // ============================================================================

  /**
   * Get equipment by asset tag
   */
  async getEquipmentByAssetTag(assetTag: string): Promise<Equipment | null> {
    return prisma.equipment.findUnique({
      where: { assetTag },
    });
  }

  /**
   * Get equipment that require maintenance (due or overdue)
   */
  async getEquipmentRequiringMaintenance(options?: { overdue?: boolean; siteId?: string }) {
    const where: Prisma.EquipmentWhereInput = {
      nextMaintenanceDate: {
        lte: options?.overdue ? new Date(Date.now() - 24 * 60 * 60 * 1000) : new Date(), // Overdue = past due date
      },
      isActive: true,
    };

    if (options?.siteId) {
      where.siteId = options.siteId;
    }

    return prisma.equipment.findMany({
      where,
      include: {
        equipmentTypeRef: true,
        site: true,
        area: true,
        workCenter: true,
        maintenanceWorkOrders: {
          where: {
            status: { not: 'COMPLETED' },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: [
        { criticality: 'desc' },
        { nextMaintenanceDate: 'asc' },
      ],
    });
  }

  /**
   * Update equipment maintenance schedule
   */
  async updateMaintenanceSchedule(
    equipmentId: string,
    data: {
      maintenanceInterval?: number;
      lastMaintenanceDate?: Date;
      nextMaintenanceDate?: Date;
    }
  ): Promise<Equipment> {
    const equipment = await this.getEquipmentById(equipmentId);
    if (!equipment) {
      throw new NotFoundError(`Equipment with ID ${equipmentId} not found`);
    }

    // Auto-calculate next maintenance date if not provided
    if (data.lastMaintenanceDate && data.maintenanceInterval && !data.nextMaintenanceDate) {
      const nextDate = new Date(data.lastMaintenanceDate);
      nextDate.setDate(nextDate.getDate() + data.maintenanceInterval);
      data.nextMaintenanceDate = nextDate;
    }

    return prisma.equipment.update({
      where: { id: equipmentId },
      data,
    });
  }

  /**
   * Calculate and update equipment metrics (MTBF, MTTR, availability)
   */
  async calculateEquipmentMetrics(equipmentId: string): Promise<EquipmentMetrics> {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        downtimeEvents: {
          where: {
            endTime: { not: null },
          },
          orderBy: { startTime: 'desc' },
        },
        maintenanceWorkOrders: {
          where: {
            status: 'COMPLETED',
            type: { in: ['CORRECTIVE', 'EMERGENCY'] },
          },
          orderBy: { completedAt: 'desc' },
        },
      },
    });

    if (!equipment) {
      throw new NotFoundError(`Equipment with ID ${equipmentId} not found`);
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter events from last 30 days
    const recentDowntimeEvents = equipment.downtimeEvents.filter(
      event => event.startTime >= thirtyDaysAgo
    );

    const recentMaintenanceOrders = equipment.maintenanceWorkOrders.filter(
      order => order.completedAt && order.completedAt >= thirtyDaysAgo
    );

    // Calculate total downtime (minutes)
    const totalDownTime = recentDowntimeEvents.reduce((sum, event) => {
      return sum + (event.durationMinutes || 0);
    }, 0);

    // Calculate total runtime (assume 24/7 operation minus downtime)
    const totalPossibleTime = 30 * 24 * 60; // 30 days in minutes
    const totalRunTime = totalPossibleTime - totalDownTime;

    // Calculate MTBF (Mean Time Between Failures)
    let mtbf: number | undefined;
    if (recentMaintenanceOrders.length > 1) {
      const failures = recentMaintenanceOrders.length;
      mtbf = totalRunTime / failures / 60; // Convert to hours
    }

    // Calculate MTTR (Mean Time To Repair)
    let mttr: number | undefined;
    if (recentMaintenanceOrders.length > 0) {
      const totalRepairTime = recentMaintenanceOrders.reduce((sum, order) => {
        if (order.startedAt && order.completedAt) {
          return sum + (order.completedAt.getTime() - order.startedAt.getTime());
        }
        return sum;
      }, 0);
      mttr = totalRepairTime / recentMaintenanceOrders.length / (1000 * 60 * 60); // Convert to hours
    }

    // Calculate availability
    const availability = totalRunTime / totalPossibleTime;

    // Calculate reliability (based on MTBF)
    const reliability = mtbf ? Math.exp(-24 / mtbf) : 0; // 24-hour reliability

    // Calculate maintainability (based on MTTR)
    const maintainability = mttr ? 1 - Math.exp(-4 / mttr) : 0; // 4-hour maintainability

    // Update equipment with calculated metrics
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        totalRunTime: equipment.totalRunTime + totalRunTime,
        totalDownTime: equipment.totalDownTime + totalDownTime,
        mtbf,
        mttr,
      },
    });

    return {
      equipmentId,
      totalRunTime: equipment.totalRunTime + totalRunTime,
      totalDownTime: equipment.totalDownTime + totalDownTime,
      mtbf,
      mttr,
      availability,
      reliability,
      maintainability,
      lastCalculated: now,
    };
  }

  /**
   * Get equipment maintenance history
   */
  async getMaintenanceHistory(equipmentId: string, options?: { limit?: number; from?: Date; to?: Date }) {
    const where: Prisma.MaintenanceWorkOrderWhereInput = {
      equipmentId,
    };

    if (options?.from || options?.to) {
      where.createdAt = {};
      if (options.from) where.createdAt.gte = options.from;
      if (options.to) where.createdAt.lte = options.to;
    }

    return prisma.maintenanceWorkOrder.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
        createdBy: {
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
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  /**
   * Get equipment downtime analysis
   */
  async getDowntimeAnalysis(equipmentId: string, options?: { days?: number }) {
    const days = options?.days || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const downtimeEvents = await prisma.downtimeEvent.findMany({
      where: {
        equipmentId,
        startTime: { gte: startDate },
      },
      include: {
        downtimeReason: true,
      },
      orderBy: { startTime: 'desc' },
    });

    // Group by reason category
    const reasonAnalysis = downtimeEvents.reduce((acc: any, event) => {
      const category = event.downtimeReason.category || 'Unknown';
      if (!acc[category]) {
        acc[category] = {
          category,
          count: 0,
          totalMinutes: 0,
          events: [],
        };
      }
      acc[category].count++;
      acc[category].totalMinutes += event.durationMinutes || 0;
      acc[category].events.push(event);
      return acc;
    }, {});

    return {
      equipmentId,
      analysisPeriod: `${days} days`,
      totalEvents: downtimeEvents.length,
      totalDowntimeMinutes: downtimeEvents.reduce((sum, event) => sum + (event.durationMinutes || 0), 0),
      reasonAnalysis: Object.values(reasonAnalysis),
    };
  }

  // ============================================================================
  // EQUIPMENT TYPE MANAGEMENT METHODS FOR ISSUE #94
  // ============================================================================

  /**
   * Create equipment type
   */
  async createEquipmentType(data: CreateEquipmentTypeData): Promise<EquipmentType> {
    // Check if code already exists
    const existing = await prisma.equipmentType.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictError(`Equipment type with code ${data.code} already exists`);
    }

    return prisma.equipmentType.create({
      data,
    });
  }

  /**
   * Get all equipment types
   */
  async getAllEquipmentTypes(options?: { includeEquipmentCount?: boolean }): Promise<EquipmentType[]> {
    const include = options?.includeEquipmentCount ? {
      equipment: {
        select: { id: true },
      },
    } : undefined;

    return prisma.equipmentType.findMany({
      include,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get equipment type by ID
   */
  async getEquipmentTypeById(id: string): Promise<EquipmentType | null> {
    return prisma.equipmentType.findUnique({
      where: { id },
      include: {
        equipment: {
          select: { id: true, equipmentNumber: true, name: true, status: true },
          take: 10,
        },
      },
    });
  }

  /**
   * Update equipment type
   */
  async updateEquipmentType(id: string, data: UpdateEquipmentTypeData): Promise<EquipmentType> {
    const equipmentType = await prisma.equipmentType.findUnique({
      where: { id },
    });

    if (!equipmentType) {
      throw new NotFoundError(`Equipment type with ID ${id} not found`);
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== equipmentType.code) {
      const existing = await prisma.equipmentType.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new ConflictError(`Equipment type with code ${data.code} already exists`);
      }
    }

    return prisma.equipmentType.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete equipment type
   */
  async deleteEquipmentType(id: string): Promise<EquipmentType> {
    const equipmentType = await this.getEquipmentTypeById(id);
    if (!equipmentType) {
      throw new NotFoundError(`Equipment type with ID ${id} not found`);
    }

    // Check if any equipment uses this type
    const equipmentCount = await prisma.equipment.count({
      where: { equipmentTypeId: id },
    });

    if (equipmentCount > 0) {
      throw new ValidationError(
        `Cannot delete equipment type: ${equipmentCount} equipment items are using this type`
      );
    }

    return prisma.equipmentType.delete({
      where: { id },
    });
  }
}

export { EquipmentService };
export default new EquipmentService();
