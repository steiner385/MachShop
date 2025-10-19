import { PrismaClient } from '@prisma/client';
import type {
  MaterialClass,
  MaterialDefinition,
  MaterialLot,
  MaterialSublot,
  MaterialLotGenealogy,
  MaterialStateHistory,
  MaterialProperty,
  MaterialLotStatus,
  MaterialLotState,
  QualityLotStatus,
  GenealogyRelationType,
  StateTransitionType,
} from '@prisma/client';

/**
 * MaterialService
 * ISA-95 Material Hierarchy Service (Task 1.3)
 *
 * Provides comprehensive material management with:
 * - Material class hierarchy
 * - Material definition (master data)
 * - Lot/batch tracking with full genealogy
 * - Material properties and specifications
 * - Expiration tracking
 * - Split/merge operations
 * - State transition management
 */
export class MaterialService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  // ==================== MATERIAL CLASSES ====================

  /**
   * Get all material classes with optional filtering
   */
  async getAllMaterialClasses(options?: {
    includeChildren?: boolean;
    level?: number;
    isActive?: boolean;
  }) {
    const where: any = {};
    if (options?.level !== undefined) where.level = options.level;
    if (options?.isActive !== undefined) where.isActive = options.isActive;

    return this.prisma.materialClass.findMany({
      where,
      include: {
        parentClass: true,
        childClasses: options?.includeChildren || false,
        materials: false,
      },
      orderBy: [{ level: 'asc' }, { className: 'asc' }],
    });
  }

  /**
   * Get material class by ID
   */
  async getMaterialClassById(id: string) {
    return this.prisma.materialClass.findUnique({
      where: { id },
      include: {
        parentClass: true,
        childClasses: true,
        materials: true,
      },
    });
  }

  /**
   * Get material class hierarchy (parent chain)
   */
  async getMaterialClassHierarchy(classId: string): Promise<MaterialClass[]> {
    const materialClass = await this.getMaterialClassById(classId);
    if (!materialClass) return [];

    const hierarchy: MaterialClass[] = [materialClass];
    let current = materialClass;

    while (current.parentClassId) {
      const parent = await this.prisma.materialClass.findUnique({
        where: { id: current.parentClassId },
        include: {
          parentClass: true,
          childClasses: false,
          materials: false,
        },
      });
      if (!parent) break;
      hierarchy.push(parent);
      current = parent;
    }

    return hierarchy.reverse(); // Top-down order
  }

  // ==================== MATERIAL DEFINITIONS ====================

  /**
   * Get all material definitions with optional filtering
   */
  async getAllMaterialDefinitions(options?: {
    materialClassId?: string;
    materialType?: string;
    isActive?: boolean;
    includeRelations?: boolean;
  }) {
    const where: any = {};
    if (options?.materialClassId) where.materialClassId = options.materialClassId;
    if (options?.materialType) where.materialType = options.materialType;
    if (options?.isActive !== undefined) where.isActive = options.isActive;

    return this.prisma.materialDefinition.findMany({
      where,
      include: options?.includeRelations ? {
        materialClass: true,
        properties: true,
        lots: true,
        replacementMaterial: true,
      } : undefined,
      orderBy: { materialNumber: 'asc' },
    });
  }

  /**
   * Get material definition by ID
   */
  async getMaterialDefinitionById(id: string) {
    return this.prisma.materialDefinition.findUnique({
      where: { id },
      include: {
        materialClass: true,
        properties: true,
        lots: {
          where: { isQuarantined: false },
          take: 10,
          orderBy: { receivedDate: 'desc' },
        },
        replacementMaterial: true,
        replacedMaterials: true,
      },
    });
  }

  /**
   * Get material definition by material number
   */
  async getMaterialDefinitionByNumber(materialNumber: string) {
    return this.prisma.materialDefinition.findUnique({
      where: { materialNumber },
      include: {
        materialClass: true,
        properties: true,
        lots: {
          where: { status: 'AVAILABLE' },
          orderBy: { receivedDate: 'asc' }, // FIFO
        },
      },
    });
  }

  /**
   * Update material definition
   */
  async updateMaterialDefinition(id: string, data: Partial<MaterialDefinition>) {
    return this.prisma.materialDefinition.update({
      where: { id },
      data,
      include: {
        materialClass: true,
        properties: true,
      },
    });
  }

  // ==================== MATERIAL PROPERTIES ====================

  /**
   * Get material properties for a material
   */
  async getMaterialProperties(materialId: string) {
    return this.prisma.materialProperty.findMany({
      where: { materialId },
      orderBy: { propertyName: 'asc' },
    });
  }

  /**
   * Create material property
   */
  async createMaterialProperty(data: any) {
    return this.prisma.materialProperty.create({
      data,
      include: { material: true },
    });
  }

  // ==================== MATERIAL LOTS ====================

  /**
   * Get all material lots with optional filtering
   */
  async getAllMaterialLots(options?: {
    materialId?: string;
    status?: MaterialLotStatus;
    qualityStatus?: QualityLotStatus;
    location?: string;
    includeRelations?: boolean;
  }) {
    const where: any = {};
    if (options?.materialId) where.materialId = options.materialId;
    if (options?.status) where.status = options.status;
    if (options?.qualityStatus) where.qualityStatus = options.qualityStatus;
    if (options?.location) where.location = { contains: options.location };

    return this.prisma.materialLot.findMany({
      where,
      include: options?.includeRelations ? {
        material: true,
        parentLot: true,
        childLots: true,
        sublots: true,
        stateHistory: { take: 5, orderBy: { changedAt: 'desc' } },
      } : undefined,
      orderBy: { receivedDate: 'desc' },
    });
  }

  /**
   * Get material lot by ID
   */
  async getMaterialLotById(id: string) {
    return this.prisma.materialLot.findUnique({
      where: { id },
      include: {
        material: {
          include: {
            materialClass: true,
            properties: true,
          },
        },
        parentLot: true,
        childLots: true,
        sublots: true,
        stateHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
        genealogyAsParent: {
          include: { childLot: true },
        },
        genealogyAsChild: {
          include: { parentLot: true },
        },
      },
    });
  }

  /**
   * Get material lot by lot number
   */
  async getMaterialLotByLotNumber(lotNumber: string) {
    return this.prisma.materialLot.findUnique({
      where: { lotNumber },
      include: {
        material: true,
        sublots: true,
        stateHistory: {
          orderBy: { changedAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Update material lot
   */
  async updateMaterialLot(id: string, data: Partial<MaterialLot>) {
    return this.prisma.materialLot.update({
      where: { id },
      data,
      include: {
        material: true,
        stateHistory: { take: 5, orderBy: { changedAt: 'desc' } },
      },
    });
  }

  /**
   * Get expiring lots (within specified days)
   */
  async getExpiringLots(daysAhead: number = 30): Promise<MaterialLot[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.prisma.materialLot.findMany({
      where: {
        status: { in: ['AVAILABLE', 'RESERVED'] },
        expirationDate: {
          gte: today,
          lte: futureDate,
        },
      },
      include: {
        material: true,
      },
      orderBy: { expirationDate: 'asc' },
    });
  }

  /**
   * Get expired lots
   */
  async getExpiredLots(): Promise<MaterialLot[]> {
    const today = new Date();

    return this.prisma.materialLot.findMany({
      where: {
        status: { not: 'EXPIRED' },
        expirationDate: {
          lt: today,
        },
      },
      include: {
        material: true,
      },
      orderBy: { expirationDate: 'asc' },
    });
  }

  /**
   * Mark lot as expired (automated expiration check)
   */
  async markLotAsExpired(lotId: string, reason?: string) {
    // Create state transition
    await this.createStateTransition({
      lotId,
      previousStatus: 'AVAILABLE',
      newStatus: 'EXPIRED',
      reason: reason || 'Lot expired based on expiration date',
      transitionType: 'AUTOMATIC',
      changedAt: new Date(),
    });

    // Update lot status
    return this.prisma.materialLot.update({
      where: { id: lotId },
      data: {
        status: 'EXPIRED',
        state: 'DISPOSED',
      },
    });
  }

  // ==================== MATERIAL SUBLOTS (Split/Merge) ====================

  /**
   * Split material lot into sublot
   */
  async splitMaterialLot(data: {
    parentLotId: string;
    sublotNumber: string;
    quantity: number;
    workOrderId?: string;
    operationId?: string;
    location?: string;
    splitReason?: string;
    createdById?: string;
  }): Promise<MaterialSublot> {
    // Validate parent lot has sufficient quantity
    const parentLot = await this.prisma.materialLot.findUnique({
      where: { id: data.parentLotId },
    });

    if (!parentLot) {
      throw new Error(`Parent lot ${data.parentLotId} not found`);
    }

    if (parentLot.currentQuantity < data.quantity) {
      throw new Error(
        `Insufficient quantity. Available: ${parentLot.currentQuantity}, Requested: ${data.quantity}`
      );
    }

    // Create sublot
    const sublot = await this.prisma.materialSublot.create({
      data: {
        sublotNumber: data.sublotNumber,
        parentLotId: data.parentLotId,
        operationType: 'SPLIT',
        quantity: data.quantity,
        unitOfMeasure: parentLot.unitOfMeasure,
        workOrderId: data.workOrderId,
        operationId: data.operationId,
        location: data.location || parentLot.location,
        status: 'AVAILABLE',
        splitReason: data.splitReason,
        createdById: data.createdById,
      },
      include: {
        parentLot: true,
      },
    });

    // Update parent lot quantity
    await this.prisma.materialLot.update({
      where: { id: data.parentLotId },
      data: {
        currentQuantity: { decrement: data.quantity },
        isSplit: true,
      },
    });

    return sublot;
  }

  /**
   * Get sublots for a lot
   */
  async getSublotsForLot(lotId: string) {
    return this.prisma.materialSublot.findMany({
      where: { parentLotId: lotId },
      include: {
        parentLot: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== MATERIAL LOT GENEALOGY ====================

  /**
   * Create genealogy record (material consumption/production relationship)
   */
  async createGenealogyRecord(data: {
    parentLotId: string;
    childLotId: string;
    relationshipType: GenealogyRelationType;
    quantityConsumed: number;
    quantityProduced?: number;
    unitOfMeasure: string;
    workOrderId?: string;
    operationId?: string;
    operatorId?: string;
    processDate?: Date;
    notes?: string;
  }): Promise<MaterialLotGenealogy> {
    return this.prisma.materialLotGenealogy.create({
      data: {
        ...data,
        processDate: data.processDate || new Date(),
      },
      include: {
        parentLot: { include: { material: true } },
        childLot: { include: { material: true } },
      },
    });
  }

  /**
   * Get genealogy for a lot (forward and backward traceability)
   */
  async getLotGenealogy(lotId: string): Promise<{
    consumed: MaterialLotGenealogy[];
    produced: MaterialLotGenealogy[];
  }> {
    const consumed = await this.prisma.materialLotGenealogy.findMany({
      where: { parentLotId: lotId },
      include: {
        childLot: { include: { material: true } },
      },
      orderBy: { processDate: 'desc' },
    });

    const produced = await this.prisma.materialLotGenealogy.findMany({
      where: { childLotId: lotId },
      include: {
        parentLot: { include: { material: true } },
      },
      orderBy: { processDate: 'desc' },
    });

    return { consumed, produced };
  }

  /**
   * Get full genealogy tree (recursive traceability)
   * Forward: What was produced from this lot
   * Backward: What materials went into this lot
   */
  async getFullGenealogyTree(lotId: string, direction: 'forward' | 'backward' = 'forward') {
    const visited = new Set<string>();
    const tree: any[] = [];

    const traverse = async (currentLotId: string, depth: number = 0) => {
      if (visited.has(currentLotId) || depth > 10) return; // Prevent infinite loops
      visited.add(currentLotId);

      const lot = await this.getMaterialLotById(currentLotId);
      if (!lot) return;

      const genealogy = await this.getLotGenealogy(currentLotId);
      const records = direction === 'forward' ? genealogy.consumed : genealogy.produced;

      for (const record of records) {
        const nextLotId = direction === 'forward' ? record.childLotId : record.parentLotId;
        const nextLot = direction === 'forward' ? record.childLot : record.parentLot;

        tree.push({
          depth,
          lot: nextLot,
          relationship: record,
        });

        await traverse(nextLotId, depth + 1);
      }
    };

    await traverse(lotId);
    return tree;
  }

  // ==================== MATERIAL STATE HISTORY ====================

  /**
   * Create state transition record
   */
  async createStateTransition(data: {
    lotId: string;
    previousState?: MaterialLotState | null;
    newState: MaterialLotState;
    previousStatus?: MaterialLotStatus | null;
    newStatus?: MaterialLotStatus | null;
    reason?: string;
    transitionType: StateTransitionType;
    quantity?: number;
    unitOfMeasure?: string;
    workOrderId?: string;
    operationId?: string;
    inspectionId?: string;
    changedById?: string | null;
    changedAt?: Date;
    fromLocation?: string;
    toLocation?: string;
    qualityNotes?: string;
    notes?: string;
  }): Promise<MaterialStateHistory> {
    return this.prisma.materialStateHistory.create({
      data: {
        ...data,
        changedAt: data.changedAt || new Date(),
      },
      include: {
        lot: { include: { material: true } },
      },
    });
  }

  /**
   * Get state history for a lot
   */
  async getStateHistory(lotId: string) {
    return this.prisma.materialStateHistory.findMany({
      where: { lotId },
      orderBy: { changedAt: 'desc' },
    });
  }

  /**
   * Update lot state with automatic history tracking
   */
  async updateLotState(
    lotId: string,
    newState: MaterialLotState,
    newStatus: MaterialLotStatus,
    options?: {
      reason?: string;
      changedById?: string;
      workOrderId?: string;
      fromLocation?: string;
      toLocation?: string;
      notes?: string;
    }
  ) {
    // Get current lot state
    const lot = await this.getMaterialLotById(lotId);
    if (!lot) {
      throw new Error(`Lot ${lotId} not found`);
    }

    // Create state transition record
    await this.createStateTransition({
      lotId,
      previousState: lot.state,
      newState,
      previousStatus: lot.status,
      newStatus,
      reason: options?.reason,
      transitionType: 'MANUAL',
      changedById: options?.changedById,
      workOrderId: options?.workOrderId,
      fromLocation: options?.fromLocation || lot.location,
      toLocation: options?.toLocation,
      notes: options?.notes,
    });

    // Update lot
    return this.prisma.materialLot.update({
      where: { id: lotId },
      data: {
        state: newState,
        status: newStatus,
        location: options?.toLocation || lot.location,
      },
      include: {
        material: true,
        stateHistory: { take: 5, orderBy: { changedAt: 'desc' } },
      },
    });
  }

  // ==================== QUALITY MANAGEMENT ====================

  /**
   * Quarantine material lot
   */
  async quarantineLot(lotId: string, reason: string, changedById?: string) {
    await this.createStateTransition({
      lotId,
      newState: 'RECEIVED',
      newStatus: 'QUARANTINED',
      reason,
      transitionType: 'MANUAL',
      changedById,
    });

    return this.prisma.materialLot.update({
      where: { id: lotId },
      data: {
        status: 'QUARANTINED',
        isQuarantined: true,
        quarantineReason: reason,
        quarantinedAt: new Date(),
      },
    });
  }

  /**
   * Release lot from quarantine (approve for use)
   */
  async releaseFromQuarantine(lotId: string, changedById?: string) {
    await this.createStateTransition({
      lotId,
      newState: 'APPROVED',
      newStatus: 'AVAILABLE',
      reason: 'Released from quarantine - inspection passed',
      transitionType: 'MANUAL',
      changedById,
    });

    return this.prisma.materialLot.update({
      where: { id: lotId },
      data: {
        status: 'AVAILABLE',
        state: 'APPROVED',
        isQuarantined: false,
        qualityStatus: 'APPROVED',
      },
    });
  }

  /**
   * Reject material lot
   */
  async rejectLot(lotId: string, reason: string, changedById?: string) {
    await this.createStateTransition({
      lotId,
      newState: 'DISPOSED',
      newStatus: 'REJECTED',
      reason,
      transitionType: 'MANUAL',
      changedById,
      qualityNotes: reason,
    });

    return this.prisma.materialLot.update({
      where: { id: lotId },
      data: {
        status: 'REJECTED',
        state: 'DISPOSED',
        qualityStatus: 'REJECTED',
      },
    });
  }

  // ==================== REPORTING & ANALYTICS ====================

  /**
   * Get material lot statistics by material
   */
  async getMaterialLotStatistics(materialId: string) {
    const lots = await this.prisma.materialLot.findMany({
      where: { materialId },
    });

    const stats = {
      totalLots: lots.length,
      availableQuantity: 0,
      reservedQuantity: 0,
      inUseQuantity: 0,
      totalValue: 0,
      averageCost: 0,
      oldestLot: null as MaterialLot | null,
      newestLot: null as MaterialLot | null,
      expiringLots: 0,
      expiredLots: 0,
    };

    lots.forEach((lot) => {
      if (lot.status === 'AVAILABLE') stats.availableQuantity += lot.currentQuantity;
      if (lot.status === 'RESERVED') stats.reservedQuantity += lot.currentQuantity;
      if (lot.status === 'IN_USE') stats.inUseQuantity += lot.currentQuantity;
      if (lot.totalCost) stats.totalValue += lot.totalCost;
      if (lot.status === 'EXPIRED') stats.expiredLots++;
    });

    if (lots.length > 0) {
      stats.averageCost = stats.totalValue / lots.length;
      stats.oldestLot = lots.reduce((oldest, lot) =>
        lot.receivedDate < oldest.receivedDate ? lot : oldest
      );
      stats.newestLot = lots.reduce((newest, lot) =>
        lot.receivedDate > newest.receivedDate ? lot : newest
      );
    }

    // Count expiring lots (within 30 days)
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 30);
    stats.expiringLots = lots.filter(
      (lot) =>
        lot.expirationDate &&
        lot.expirationDate > new Date() &&
        lot.expirationDate <= expiringDate
    ).length;

    return stats;
  }

  /**
   * Get material usage by work order
   */
  async getMaterialUsageByWorkOrder(workOrderId: string) {
    // Get sublots allocated to work order
    const sublots = await this.prisma.materialSublot.findMany({
      where: { workOrderId },
      include: {
        parentLot: {
          include: { material: true },
        },
      },
    });

    // Get genealogy records for work order
    const genealogy = await this.prisma.materialLotGenealogy.findMany({
      where: { workOrderId },
      include: {
        parentLot: { include: { material: true } },
        childLot: { include: { material: true } },
      },
    });

    return {
      sublots,
      genealogy,
      totalMaterialsConsumed: genealogy.length,
      totalSublotsAllocated: sublots.length,
    };
  }
}

export default new MaterialService();
