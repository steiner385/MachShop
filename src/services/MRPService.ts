/**
 * Material Requirements Planning (MRP) Service
 * Issue #84: Inventory Transaction Engine & Cycle Counting System
 *
 * Provides comprehensive MRP functionality including:
 * - BOM explosion for multi-level requirements
 * - Net requirements calculation (gross demand minus available supply)
 * - Lead time offsetting for order timing
 * - Lot sizing strategies (LOT_FOR_LOT, EOQ, FIXED_LOT_SIZE, etc.)
 * - Pegging for traceability from requirements to sources
 * - Exception detection and reporting
 */

import { PrismaClient } from '@prisma/client';
import {
  MRPRun, PlannedOrder, MRPPegging, MRPException,
  MRPStatus, OrderType, PlannedOrderStatus, LotSizingRule,
  ExceptionType, ExceptionSeverity, PegStatus
} from '@prisma/client';

interface BOMExplosionItem {
  partId: string;
  partNumber: string;
  level: number;
  parentPartId?: string;
  quantityRequired: number;
  scrapFactor: number;
  leadTimeDays: number;
  lotSizeMin: number;
  lotSizeMultiple: number;
}

interface ScheduleDemand {
  partId: string;
  partNumber: string;
  quantity: number;
  demandDate: Date;
  sourceScheduleId: string;
  sourceEntryNumber: number;
}

interface NetRequirementsResult {
  partId: string;
  level: number;
  demandDate: Date;
  grossDemand: number;
  projectedAvailable: number;
  netRequirement: number;
  safetyStock: number;
  orderQuantity: number;
  orderDate: Date;
  dueDate: Date;
  leadTimeDays: number;
  lotSizingRule: LotSizingRule;
  fixedLotSize?: number;
  economicOrderQty?: number;
}

export class MRPService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Execute MRP for a production schedule
   */
  async runMRP(input: {
    siteId?: string;
    scheduleId?: string;
    horizonDays?: number;
    safetyStockLevel?: number;
    includeScrapFactor?: boolean;
    runBy?: string;
    notes?: string;
  }): Promise<MRPRun> {
    try {
      // Create MRP run record
      const runNumber = `MRP-${Date.now()}`;
      const horizonDays = input.horizonDays || 90;
      const safetyStockLevel = input.safetyStockLevel || 0;
      const includeScrapFactor = input.includeScrapFactor !== false;

      const mrpRun = await this.prisma.mRPRun.create({
        data: {
          runNumber,
          siteId: input.siteId,
          scheduleId: input.scheduleId,
          status: MRPStatus.RUNNING,
          horizonDays,
          safetyStockLevel,
          includeScrapFactor,
          runBy: input.runBy,
          notes: input.notes,
          startDate: new Date(),
        },
      });

      try {
        // Get schedule demands
        const demands = await this.getScheduleDemands(input.scheduleId, horizonDays);

        // Explode BOMs for all demanded parts
        const bomExplosion = await this.explodesAllBOMs(demands);

        // Calculate net requirements
        const netRequirements = await this.calculateNetRequirements(
          bomExplosion,
          safetyStockLevel,
          input.scheduleId
        );

        // Generate planned orders
        const plannedOrders = await this.generatePlannedOrders(
          mrpRun.id,
          netRequirements
        );

        // Generate pegging records
        await this.generatePegging(mrpRun.id, demands, plannedOrders);

        // Detect exceptions
        const exceptions = await this.detectExceptions(
          mrpRun.id,
          netRequirements,
          plannedOrders
        );

        // Update MRP run with results
        const completionStatus = exceptions.some(e => e.severity === ExceptionSeverity.CRITICAL)
          ? MRPStatus.COMPLETED_WITH_ERRORS
          : MRPStatus.COMPLETED;

        await this.prisma.mRPRun.update({
          where: { id: mrpRun.id },
          data: {
            status: completionStatus,
            completionDate: new Date(),
            plannedOrdersCount: plannedOrders.length,
            totalRequirements: netRequirements.length,
            exceptionCount: exceptions.length,
          },
        });

        return await this.prisma.mRPRun.findUniqueOrThrow({
          where: { id: mrpRun.id },
          include: {
            plannedOrders: true,
            exceptions: true,
            pegging: true,
          },
        });
      } catch (error) {
        // Mark run as failed
        await this.prisma.mRPRun.update({
          where: { id: mrpRun.id },
          data: {
            status: MRPStatus.FAILED,
            completionDate: new Date(),
          },
        });
        throw error;
      }
    } catch (error) {
      console.error('MRP Run Failed:', error);
      throw error;
    }
  }

  /**
   * Get all demands from production schedule within horizon
   */
  private async getScheduleDemands(
    scheduleId: string | undefined,
    horizonDays: number
  ): Promise<ScheduleDemand[]> {
    if (!scheduleId) {
      return [];
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + horizonDays);

    const schedule = await this.prisma.productionSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        entries: {
          where: {
            plannedStartDate: {
              lte: futureDate,
            },
          },
        },
      },
    });

    if (!schedule) {
      return [];
    }

    return schedule.entries.map((entry) => ({
      partId: entry.partId,
      partNumber: entry.partNumber,
      quantity: entry.plannedQuantity,
      demandDate: entry.plannedStartDate,
      sourceScheduleId: scheduleId,
      sourceEntryNumber: entry.entryNumber,
    }));
  }

  /**
   * Explode BOMs for all demanded parts
   */
  private async explodesAllBOMs(demands: ScheduleDemand[]): Promise<BOMExplosionItem[]> {
    const explosion: BOMExplosionItem[] = [];
    const partIds = new Set(demands.map(d => d.partId));

    for (const partId of partIds) {
      const items = await this.exploseBOMForPart(partId, 0);
      explosion.push(...items);
    }

    return explosion;
  }

  /**
   * Recursively explode BOM for a single part
   */
  private async exploseBOMForPart(
    partId: string,
    level: number
  ): Promise<BOMExplosionItem[]> {
    const items: BOMExplosionItem[] = [];

    const bomItems = await this.prisma.bOMItem.findMany({
      where: {
        parentPartId: partId,
        isActive: true,
      },
      include: {
        componentPart: true,
      },
    });

    for (const bomItem of bomItems) {
      const part = bomItem.componentPart;
      const scrapFactor = bomItem.scrapFactor || 0;
      const leadTimeDays = part.leadTimeDays || 0;
      const lotSizeMin = part.lotSizeMin || 1;
      const lotSizeMultiple = part.lotSizeMultiple || 1;

      // Add the component
      items.push({
        partId: part.id,
        partNumber: part.partNumber,
        level,
        parentPartId: partId,
        quantityRequired: bomItem.quantity,
        scrapFactor,
        leadTimeDays,
        lotSizeMin,
        lotSizeMultiple,
      });

      // Recursively explode sub-components if not optional
      if (!bomItem.isOptional) {
        const subItems = await this.exploseBOMForPart(part.id, level + 1);
        items.push(...subItems);
      }
    }

    return items;
  }

  /**
   * Calculate net requirements for all parts
   */
  private async calculateNetRequirements(
    bomExplosion: BOMExplosionItem[],
    safetyStockLevel: number,
    scheduleId: string | undefined
  ): Promise<NetRequirementsResult[]> {
    const requirements: NetRequirementsResult[] = [];
    const partRequirements = new Map<string, NetRequirementsResult[]>();

    // Group explosion items by part
    for (const item of bomExplosion) {
      if (!partRequirements.has(item.partId)) {
        partRequirements.set(item.partId, []);
      }
    }

    // Get current inventory for each part
    const inventory = await this.prisma.inventory.groupBy({
      by: ['partId'],
      _sum: {
        quantity: true,
      },
      where: {
        isActive: true,
      },
    });

    const inventoryMap = new Map(
      inventory.map(inv => [inv.partId, inv._sum.quantity || 0])
    );

    // Calculate net requirements for schedule demands
    if (scheduleId) {
      const schedule = await this.prisma.productionSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          entries: {
            where: {
              plannedStartDate: {
                lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      });

      if (schedule) {
        for (const entry of schedule.entries) {
          const part = await this.prisma.part.findUniqueOrThrow({
            where: { id: entry.partId },
          });

          const onHand = inventoryMap.get(entry.partId) || 0;
          const safetyStock = Math.ceil((entry.plannedQuantity * safetyStockLevel) / 100);
          const netReq = Math.max(0, entry.plannedQuantity + safetyStock - onHand);

          if (netReq > 0) {
            const leadTimeDays = part.leadTimeDays || 0;
            const orderDate = this.offsetDateByLeadTime(entry.plannedStartDate, -leadTimeDays);
            const lotSizingRule = this.determineLotSizingRule(part);
            const { orderQuantity, fixedLotSize, economicOrderQty } = this.calculateLotSize(
              netReq,
              lotSizingRule,
              part
            );

            requirements.push({
              partId: entry.partId,
              level: 0,
              demandDate: entry.plannedStartDate,
              grossDemand: entry.plannedQuantity,
              projectedAvailable: onHand,
              netRequirement: netReq,
              safetyStock,
              orderQuantity,
              orderDate,
              dueDate: entry.plannedStartDate,
              leadTimeDays,
              lotSizingRule,
              fixedLotSize,
              economicOrderQty,
            });
          }
        }
      }
    }

    return requirements;
  }

  /**
   * Generate planned orders from net requirements
   */
  private async generatePlannedOrders(
    mrpRunId: string,
    netRequirements: NetRequirementsResult[]
  ): Promise<PlannedOrder[]> {
    const plannedOrders: PlannedOrder[] = [];

    for (const req of netRequirements) {
      const part = await this.prisma.part.findUniqueOrThrow({
        where: { id: req.partId },
      });

      // Determine order type based on part's makeOrBuy
      const orderType = part.makeOrBuy === 'BUY' ? OrderType.PURCHASE : OrderType.PRODUCTION;

      const plannedOrder = await this.prisma.plannedOrder.create({
        data: {
          mrpRunId,
          partId: req.partId,
          orderType,
          quantity: req.orderQuantity,
          unitOfMeasure: part.unitOfMeasure,
          unitOfMeasureId: part.unitOfMeasureId,
          demandDate: req.demandDate,
          orderDate: req.orderDate,
          dueDate: req.dueDate,
          lotSizingRule: req.lotSizingRule,
          fixedLotSize: req.fixedLotSize,
          economicOrderQty: req.economicOrderQty,
          status: PlannedOrderStatus.PLANNED,
        },
      });

      plannedOrders.push(plannedOrder);
    }

    return plannedOrders;
  }

  /**
   * Generate pegging records linking demands to supplies
   */
  private async generatePegging(
    mrpRunId: string,
    demands: ScheduleDemand[],
    plannedOrders: PlannedOrder[]
  ): Promise<void> {
    const plannedOrderMap = new Map(plannedOrders.map(po => [po.partId, po]));

    for (const demand of demands) {
      const plannedOrder = plannedOrderMap.get(demand.partId);

      if (plannedOrder) {
        await this.prisma.mRPPegging.create({
          data: {
            mrpRunId,
            demandPartId: demand.partId,
            demandQuantity: demand.quantity,
            demandDate: demand.demandDate,
            suppliedBy: 'PLANNED',
            suppliedByPlanId: plannedOrder.id,
            level: 0,
            pegStatus: PegStatus.OPEN,
          },
        });
      }
    }
  }

  /**
   * Detect exceptions and create exception records
   */
  private async detectExceptions(
    mrpRunId: string,
    netRequirements: NetRequirementsResult[],
    plannedOrders: PlannedOrder[]
  ): Promise<MRPException[]> {
    const exceptions: MRPException[] = [];

    // Check for late orders
    for (const req of netRequirements) {
      if (req.orderDate < new Date()) {
        const exception = await this.prisma.mRPException.create({
          data: {
            mrpRunId,
            exceptionType: ExceptionType.LATE_ORDER,
            severity: ExceptionSeverity.WARNING,
            partId: req.partId,
            affectedQuantity: req.netRequirement,
            affectedDate: req.orderDate,
            message: `Order for part ${req.partId} should have been placed on ${req.orderDate.toDateString()}`,
            suggestedAction: 'Expedite order or adjust demand date',
          },
        });
        exceptions.push(exception);
      }

      // Check for safety stock violations
      if (req.projectedAvailable < req.safetyStock) {
        const exception = await this.prisma.mRPException.create({
          data: {
            mrpRunId,
            exceptionType: ExceptionType.SAFETY_STOCK_VIOLATION,
            severity: ExceptionSeverity.WARNING,
            partId: req.partId,
            affectedQuantity: req.safetyStock - req.projectedAvailable,
            affectedDate: req.demandDate,
            message: `Safety stock level violated for part ${req.partId}`,
            suggestedAction: 'Increase available inventory or adjust safety stock level',
          },
        });
        exceptions.push(exception);
      }
    }

    return exceptions;
  }

  /**
   * Determine lot sizing rule for a part
   */
  private determineLotSizingRule(part: { id: string; lotSizeMin?: number | null }): LotSizingRule {
    // Default to LOT_FOR_LOT; can be enhanced with part-specific configuration
    return LotSizingRule.LOT_FOR_LOT;
  }

  /**
   * Calculate order quantity based on lot sizing rule
   */
  private calculateLotSize(
    netRequired: number,
    rule: LotSizingRule,
    part: { lotSizeMin?: number | null; lotSizeMultiple?: number | null }
  ): { orderQuantity: number; fixedLotSize?: number; economicOrderQty?: number } {
    switch (rule) {
      case LotSizingRule.LOT_FOR_LOT:
        return {
          orderQuantity: netRequired,
        };

      case LotSizingRule.FIXED_LOT_SIZE:
        return {
          orderQuantity: part.lotSizeMin || netRequired,
          fixedLotSize: part.lotSizeMin || netRequired,
        };

      case LotSizingRule.MIN_REQUIRED:
        return {
          orderQuantity: Math.max(netRequired, part.lotSizeMin || 0),
        };

      case LotSizingRule.PERIOD_ORDER_QUANTITY:
        return {
          orderQuantity: Math.ceil(netRequired / (part.lotSizeMultiple || 1)) * (part.lotSizeMultiple || 1),
        };

      case LotSizingRule.EOQ:
      default:
        // Simplified EOQ calculation
        const eoq = Math.sqrt((2 * netRequired * 10) / 0.1); // Placeholder
        return {
          orderQuantity: eoq,
          economicOrderQty: eoq,
        };
    }
  }

  /**
   * Offset a date by lead time (in days)
   */
  private offsetDateByLeadTime(date: Date, days: number): Date {
    const offsetDate = new Date(date);
    offsetDate.setDate(offsetDate.getDate() + days);
    return offsetDate;
  }

  /**
   * Get MRP run by ID
   */
  async getMRPRun(id: string): Promise<MRPRun | null> {
    return this.prisma.mRPRun.findUnique({
      where: { id },
      include: {
        plannedOrders: true,
        exceptions: true,
        pegging: true,
      },
    });
  }

  /**
   * List MRP runs
   */
  async listMRPRuns(input?: { siteId?: string; status?: MRPStatus; limit?: number; offset?: number }) {
    return this.prisma.mRPRun.findMany({
      where: {
        siteId: input?.siteId,
        status: input?.status,
      },
      include: {
        plannedOrders: {
          take: 5,
        },
        exceptions: {
          take: 5,
        },
      },
      orderBy: {
        startDate: 'desc',
      },
      take: input?.limit || 20,
      skip: input?.offset || 0,
    });
  }

  /**
   * Get planned orders for an MRP run
   */
  async getPlannedOrders(mrpRunId: string): Promise<PlannedOrder[]> {
    return this.prisma.plannedOrder.findMany({
      where: { mrpRunId },
      include: {
        part: true,
        mrpRun: true,
      },
    });
  }

  /**
   * Convert planned order to work order
   */
  async convertPlannedOrderToWorkOrder(
    plannedOrderId: string,
    workOrderData: {
      priority: string;
      status: string;
      createdById: string;
      routingId?: string;
      siteId?: string;
    }
  ): Promise<PlannedOrder> {
    const plannedOrder = await this.prisma.plannedOrder.findUniqueOrThrow({
      where: { id: plannedOrderId },
    });

    // Create work order
    const workOrder = await this.prisma.workOrder.create({
      data: {
        workOrderNumber: `WO-${plannedOrder.id.substring(0, 8)}`,
        partId: plannedOrder.partId,
        quantity: Math.floor(plannedOrder.quantity),
        priority: workOrderData.priority as any,
        status: workOrderData.status as any,
        createdById: workOrderData.createdById,
        routingId: workOrderData.routingId,
        siteId: workOrderData.siteId,
        dueDate: plannedOrder.dueDate,
      },
    });

    // Link planned order to work order
    return this.prisma.plannedOrder.update({
      where: { id: plannedOrderId },
      data: {
        convertedToWoId: workOrder.id,
        status: PlannedOrderStatus.CONVERTED_TO_WO,
      },
    });
  }
}

export default MRPService;
