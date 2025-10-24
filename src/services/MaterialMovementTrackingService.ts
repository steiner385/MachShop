/**
 * Material Movement Tracking Service
 *
 * Tracks material movements through equipment for traceability,
 * inventory management, and process control.
 */

import { PrismaClient } from '@prisma/client';
import {
  RecordMaterialMovementInput,
  EquipmentMaterialMovementRecord,
  QueryMaterialMovementsInput,
  MaterialMovementSummary,
  MaterialTraceabilityChain,
} from '../types/l2equipment';

const prisma = new PrismaClient();

export class MaterialMovementTrackingService {
  /**
   * Record a material movement through equipment
   */
  static async recordMaterialMovement(
    input: RecordMaterialMovementInput
  ): Promise<EquipmentMaterialMovementRecord> {
    const {
      equipmentId,
      partId,
      partNumber,
      lotNumber,
      serialNumber,
      movementType,
      quantity,
      unitOfMeasure,
      workOrderId,
      operationId,
      fromLocation,
      toLocation,
      qualityStatus,
      upstreamTraceId,
      downstreamTraceId,
      recordedBy,
    } = input;

    // Validate equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment) {
      throw new Error(`Equipment with ID ${equipmentId} not found`);
    }

    // Validate part if partId provided
    if (partId) {
      const part = await prisma.part.findUnique({
        where: { id: partId },
      });

      if (!part) {
        throw new Error(`Part with ID ${partId} not found`);
      }
    }

    // Validate work order if provided
    if (workOrderId) {
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
      });

      if (!workOrder) {
        throw new Error(`Work order with ID ${workOrderId} not found`);
      }
    }

    // Auto-set qualityStatus to SCRAP when movementType is SCRAP
    let finalQualityStatus = qualityStatus || 'GOOD';
    if (movementType === 'SCRAP' && !qualityStatus) {
      finalQualityStatus = 'SCRAP';
    }

    // Create movement record
    const movement = await prisma.equipmentMaterialMovement.create({
      data: {
        equipmentId,
        partId,
        partNumber,
        lotNumber,
        serialNumber,
        movementType,
        quantity,
        unitOfMeasure,
        workOrderId,
        operationId,
        fromLocation,
        toLocation,
        qualityStatus: finalQualityStatus,
        upstreamTraceId,
        downstreamTraceId,
        recordedBy,
      },
    });

    return movement as EquipmentMaterialMovementRecord;
  }

  /**
   * Record material loaded into equipment
   */
  static async recordMaterialLoad(
    equipmentId: string,
    partNumber: string,
    quantity: number,
    unitOfMeasure: string,
    options?: {
      partId?: string;
      lotNumber?: string;
      serialNumber?: string;
      workOrderId?: string;
      fromLocation?: string;
      toLocation?: string;
      recordedBy?: string;
    }
  ): Promise<EquipmentMaterialMovementRecord> {
    return this.recordMaterialMovement({
      equipmentId,
      partNumber,
      quantity,
      unitOfMeasure,
      movementType: 'LOAD',
      partId: options?.partId,
      lotNumber: options?.lotNumber,
      serialNumber: options?.serialNumber,
      workOrderId: options?.workOrderId,
      fromLocation: options?.fromLocation,
      toLocation: options?.toLocation,
      recordedBy: (options?.recordedBy || 'EQUIPMENT') as any,
    });
  }

  /**
   * Record material unloaded from equipment
   */
  static async recordMaterialUnload(
    equipmentId: string,
    partNumber: string,
    quantity: number,
    unitOfMeasure: string,
    options?: {
      partId?: string;
      lotNumber?: string;
      serialNumber?: string;
      workOrderId?: string;
      fromLocation?: string;
      toLocation?: string;
      qualityStatus?: 'GOOD' | 'HOLD' | 'REJECT' | 'SCRAP';
      recordedBy?: string;
    }
  ): Promise<EquipmentMaterialMovementRecord> {
    return this.recordMaterialMovement({
      equipmentId,
      partNumber,
      quantity,
      unitOfMeasure,
      movementType: 'UNLOAD',
      partId: options?.partId,
      lotNumber: options?.lotNumber,
      serialNumber: options?.serialNumber,
      workOrderId: options?.workOrderId,
      fromLocation: options?.fromLocation,
      toLocation: options?.toLocation,
      qualityStatus: options?.qualityStatus,
      recordedBy: (options?.recordedBy || 'EQUIPMENT') as any,
    });
  }

  /**
   * Record material consumed by equipment during production
   */
  static async recordMaterialConsumption(
    equipmentId: string,
    partNumber: string,
    quantity: number,
    unitOfMeasure: string,
    workOrderId: string,
    options?: {
      partId?: string;
      lotNumber?: string;
      serialNumber?: string;
      operationId?: string;
      fromLocation?: string;
      recordedBy?: string;
    }
  ): Promise<EquipmentMaterialMovementRecord> {
    return this.recordMaterialMovement({
      equipmentId,
      partNumber,
      quantity,
      unitOfMeasure,
      workOrderId,
      movementType: 'CONSUME',
      partId: options?.partId,
      lotNumber: options?.lotNumber,
      serialNumber: options?.serialNumber,
      operationId: options?.operationId,
      fromLocation: options?.fromLocation,
      recordedBy: (options?.recordedBy || 'EQUIPMENT') as any,
    });
  }

  /**
   * Record material produced by equipment
   */
  static async recordMaterialProduction(
    equipmentId: string,
    partNumber: string,
    quantity: number,
    unitOfMeasure: string,
    workOrderId: string,
    options?: {
      partId?: string;
      lotNumber?: string;
      serialNumber?: string;
      operationId?: string;
      toLocation?: string;
      qualityStatus?: 'GOOD' | 'HOLD' | 'REJECT' | 'SCRAP';
      recordedBy?: string;
    }
  ): Promise<EquipmentMaterialMovementRecord> {
    return this.recordMaterialMovement({
      equipmentId,
      partNumber,
      quantity,
      unitOfMeasure,
      workOrderId,
      movementType: 'PRODUCE',
      partId: options?.partId,
      lotNumber: options?.lotNumber,
      serialNumber: options?.serialNumber,
      operationId: options?.operationId,
      toLocation: options?.toLocation,
      qualityStatus: options?.qualityStatus,
      recordedBy: (options?.recordedBy || 'EQUIPMENT') as any,
    });
  }

  /**
   * Record material scrapped at equipment
   */
  static async recordMaterialScrap(
    equipmentId: string,
    partNumber: string,
    quantity: number,
    unitOfMeasure: string,
    options?: {
      partId?: string;
      lotNumber?: string;
      serialNumber?: string;
      workOrderId?: string;
      operationId?: string;
      fromLocation?: string;
      recordedBy?: string;
    }
  ): Promise<EquipmentMaterialMovementRecord> {
    return this.recordMaterialMovement({
      equipmentId,
      partNumber,
      quantity,
      unitOfMeasure,
      movementType: 'SCRAP',
      partId: options?.partId,
      lotNumber: options?.lotNumber,
      serialNumber: options?.serialNumber,
      workOrderId: options?.workOrderId,
      operationId: options?.operationId,
      fromLocation: options?.fromLocation,
      qualityStatus: 'SCRAP',
      recordedBy: (options?.recordedBy || 'EQUIPMENT') as any,
    });
  }

  /**
   * Query material movements with filters
   */
  static async queryMaterialMovements(
    query: QueryMaterialMovementsInput
  ): Promise<EquipmentMaterialMovementRecord[]> {
    const {
      equipmentId,
      partNumber,
      lotNumber,
      serialNumber,
      movementType,
      workOrderId,
      startDate,
      endDate,
      limit,
    } = query;

    const where: any = {};

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (partNumber) {
      where.partNumber = partNumber;
    }

    if (lotNumber) {
      where.lotNumber = lotNumber;
    }

    if (serialNumber) {
      where.serialNumber = serialNumber;
    }

    if (movementType) {
      where.movementType = movementType;
    }

    if (workOrderId) {
      where.workOrderId = workOrderId;
    }

    if (startDate || endDate) {
      where.movementTimestamp = {};
      if (startDate) {
        where.movementTimestamp.gte = startDate;
      }
      if (endDate) {
        where.movementTimestamp.lte = endDate;
      }
    }

    const movements = await prisma.equipmentMaterialMovement.findMany({
      where,
      orderBy: { movementTimestamp: 'desc' },
      take: limit || 100,
    });

    return movements as EquipmentMaterialMovementRecord[];
  }

  /**
   * Generate material movement summary for equipment
   */
  static async generateMovementSummary(
    equipmentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<MaterialMovementSummary> {
    // Get equipment details
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: {
        id: true,
        equipmentNumber: true,
        name: true,
      },
    });

    if (!equipment) {
      throw new Error(`Equipment with ID ${equipmentId} not found`);
    }

    // Build query filters
    const where: any = { equipmentId };

    if (startDate || endDate) {
      where.movementTimestamp = {};
      if (startDate) {
        where.movementTimestamp.gte = startDate;
      }
      if (endDate) {
        where.movementTimestamp.lte = endDate;
      }
    }

    // Get total movements
    const totalMovements = await prisma.equipmentMaterialMovement.count({ where });

    // Get movements by type
    const movementsByTypeData = await prisma.equipmentMaterialMovement.groupBy({
      by: ['movementType'],
      where,
      _count: {
        movementType: true,
      },
    });

    const movementsByType: Record<string, number> = {};
    for (const group of movementsByTypeData) {
      movementsByType[group.movementType] = group._count.movementType;
    }

    // Get movements by part
    const movementsByPartData = await prisma.equipmentMaterialMovement.groupBy({
      by: ['partNumber'],
      where,
      _count: {
        partNumber: true,
      },
      _sum: {
        quantity: true,
      },
    });

    const movementsByPart = movementsByPartData.map((group) => ({
      partNumber: group.partNumber,
      quantity: group._sum.quantity || 0,
      movements: group._count.partNumber,
    }));

    return {
      equipmentId: equipment.id,
      equipmentNumber: equipment.equipmentNumber,
      equipmentName: equipment.name,
      totalMovements,
      movementsByType,
      movementsByPart,
      period: {
        start: startDate || new Date(0),
        end: endDate || new Date(),
      },
    };
  }

  /**
   * Build traceability chain for a specific material
   */
  static async buildTraceabilityChain(
    movementId: string
  ): Promise<MaterialTraceabilityChain> {
    const movement = await prisma.equipmentMaterialMovement.findUnique({
      where: { id: movementId },
    });

    if (!movement) {
      throw new Error(`Movement with ID ${movementId} not found`);
    }

    // Get all movements for this serial/lot
    const allMovements = await prisma.equipmentMaterialMovement.findMany({
      where: {
        OR: [
          { serialNumber: movement.serialNumber || undefined },
          { lotNumber: movement.lotNumber || undefined },
        ],
      },
      orderBy: { movementTimestamp: 'asc' },
    });

    // Build upstream chain (movements before this one)
    const upstreamChain: EquipmentMaterialMovementRecord[] = [];
    let currentMovement = movement;

    while (currentMovement.upstreamTraceId) {
      const upstream = await prisma.equipmentMaterialMovement.findUnique({
        where: { id: currentMovement.upstreamTraceId },
      });

      if (!upstream) break;

      upstreamChain.unshift(upstream as EquipmentMaterialMovementRecord);
      currentMovement = upstream;
    }

    // Build downstream chain (movements after this one)
    const downstreamChain: EquipmentMaterialMovementRecord[] = [];
    currentMovement = movement;

    while (currentMovement.downstreamTraceId) {
      const downstream = await prisma.equipmentMaterialMovement.findUnique({
        where: { id: currentMovement.downstreamTraceId },
      });

      if (!downstream) break;

      downstreamChain.push(downstream as EquipmentMaterialMovementRecord);
      currentMovement = downstream;
    }

    // Calculate totals
    const totalQuantity = allMovements.reduce(
      (sum, m) => sum + (m.movementType === 'PRODUCE' ? m.quantity : 0),
      0
    );

    const uniqueLots = [...new Set(
      allMovements
        .map((m) => m.lotNumber)
        .filter((lot): lot is string => lot !== null)
    )];

    const uniqueSerials = [...new Set(
      allMovements
        .map((m) => m.serialNumber)
        .filter((serial): serial is string => serial !== null)
    )];

    return {
      movements: allMovements as EquipmentMaterialMovementRecord[],
      upstreamChain,
      downstreamChain,
      totalQuantity,
      uniqueLots,
      uniqueSerials,
    };
  }

  /**
   * Get material movements for work order
   */
  static async getMovementsForWorkOrder(
    workOrderId: string,
    movementType?: string
  ): Promise<EquipmentMaterialMovementRecord[]> {
    const where: any = { workOrderId };

    if (movementType) {
      where.movementType = movementType;
    }

    const movements = await prisma.equipmentMaterialMovement.findMany({
      where,
      orderBy: { movementTimestamp: 'asc' },
    });

    return movements as EquipmentMaterialMovementRecord[];
  }

  /**
   * Get material balance for equipment (loaded - consumed - unloaded)
   */
  static async getMaterialBalance(
    equipmentId: string,
    partNumber?: string
  ): Promise<Array<{
    partNumber: string;
    loaded: number;
    consumed: number;
    produced: number;
    unloaded: number;
    scrapped: number;
    balance: number;
  }>> {
    const where: any = { equipmentId };
    if (partNumber) {
      where.partNumber = partNumber;
    }

    const movements = await prisma.equipmentMaterialMovement.findMany({
      where,
    });

    // Group by part number
    const partMap: Map<string, {
      loaded: number;
      consumed: number;
      produced: number;
      unloaded: number;
      scrapped: number;
    }> = new Map();

    for (const movement of movements) {
      const part = movement.partNumber;
      if (!partMap.has(part)) {
        partMap.set(part, {
          loaded: 0,
          consumed: 0,
          produced: 0,
          unloaded: 0,
          scrapped: 0,
        });
      }

      const balance = partMap.get(part)!;

      switch (movement.movementType) {
        case 'LOAD':
          balance.loaded += movement.quantity;
          break;
        case 'CONSUME':
          balance.consumed += movement.quantity;
          break;
        case 'PRODUCE':
          balance.produced += movement.quantity;
          break;
        case 'UNLOAD':
          balance.unloaded += movement.quantity;
          break;
        case 'SCRAP':
          balance.scrapped += movement.quantity;
          break;
      }
    }

    // Calculate final balance
    const result: Array<{
      partNumber: string;
      loaded: number;
      consumed: number;
      produced: number;
      unloaded: number;
      scrapped: number;
      balance: number;
    }> = [];

    for (const [part, data] of partMap.entries()) {
      result.push({
        partNumber: part,
        ...data,
        balance: data.loaded + data.produced - data.consumed - data.unloaded - data.scrapped,
      });
    }

    return result;
  }

  /**
   * Link two movements for traceability (upstream -> downstream)
   */
  static async linkMovements(
    upstreamMovementId: string,
    downstreamMovementId: string
  ): Promise<void> {
    await prisma.$transaction([
      prisma.equipmentMaterialMovement.update({
        where: { id: upstreamMovementId },
        data: { downstreamTraceId: downstreamMovementId },
      }),
      prisma.equipmentMaterialMovement.update({
        where: { id: downstreamMovementId },
        data: { upstreamTraceId: upstreamMovementId },
      }),
    ]);
  }

  /**
   * Get movements by serial number (full trace)
   */
  static async getMovementsBySerialNumber(
    serialNumber: string
  ): Promise<EquipmentMaterialMovementRecord[]> {
    const movements = await prisma.equipmentMaterialMovement.findMany({
      where: { serialNumber },
      orderBy: { movementTimestamp: 'asc' },
    });

    return movements as EquipmentMaterialMovementRecord[];
  }

  /**
   * Get movements by lot number (full trace)
   */
  static async getMovementsByLotNumber(
    lotNumber: string
  ): Promise<EquipmentMaterialMovementRecord[]> {
    const movements = await prisma.equipmentMaterialMovement.findMany({
      where: { lotNumber },
      orderBy: { movementTimestamp: 'asc' },
    });

    return movements as EquipmentMaterialMovementRecord[];
  }
}
