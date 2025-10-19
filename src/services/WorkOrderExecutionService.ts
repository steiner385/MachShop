/**
 * Work Order Execution Service (ISA-95 Production Dispatching & Execution - Task 1.7)
 *
 * This service handles the shop floor execution layer of ISA-95 Part 2:
 * - Work order dispatching (CREATED → RELEASED to shop floor)
 * - Real-time status tracking with audit trail
 * - Work performance actuals capture (labor, material, equipment, quality, downtime)
 * - Automatic variance calculation (planned vs actual)
 * - Production response reporting
 */

import { PrismaClient, WorkOrderStatus, WorkPerformanceType, VarianceType } from '@prisma/client';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface DispatchWorkOrderData {
  workOrderId: string;
  dispatchedBy: string;
  dispatchedFrom?: string;
  assignedToId?: string;
  workCenterId?: string;
  priorityOverride?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  expectedStartDate?: Date;
  expectedEndDate?: Date;
  materialReserved?: boolean;
  toolingReserved?: boolean;
  dispatchNotes?: string;
  metadata?: any;
}

interface StatusTransitionData {
  workOrderId: string;
  newStatus: WorkOrderStatus;
  reason?: string;
  changedBy: string;
  notes?: string;
}

interface WorkPerformanceData {
  workOrderId: string;
  operationId?: string;
  performanceType: WorkPerformanceType;
  recordedBy: string;

  // Labor fields
  personnelId?: string;
  laborHours?: number;
  laborCost?: number;
  laborEfficiency?: number;

  // Material fields
  partId?: string;
  quantityConsumed?: number;
  quantityPlanned?: number;
  materialVariance?: number;
  unitCost?: number;
  totalCost?: number;

  // Equipment fields
  equipmentId?: string;
  setupTime?: number;
  runTime?: number;
  plannedSetupTime?: number;
  plannedRunTime?: number;

  // Quality fields
  quantityProduced?: number;
  quantityGood?: number;
  quantityScrap?: number;
  quantityRework?: number;
  yieldPercentage?: number;
  scrapReason?: string;

  // Downtime fields
  downtimeMinutes?: number;
  downtimeReason?: string;
  downtimeCategory?: string;

  notes?: string;
  metadata?: any;
}

interface VarianceCalculationResult {
  varianceType: VarianceType;
  varianceName: string;
  plannedValue: number;
  actualValue: number;
  variance: number;
  variancePercent: number;
  isFavorable: boolean;
  costImpact?: number;
}

// Valid state transitions (ISA-95 compliant)
const VALID_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  CREATED: ['RELEASED', 'CANCELLED'],
  RELEASED: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'ON_HOLD', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'RELEASED', 'CANCELLED'],
  COMPLETED: [], // Terminal state (cannot transition)
  CANCELLED: [] // Terminal state (cannot transition)
};

// ============================================================================
// WORK ORDER EXECUTION SERVICE CLASS
// ============================================================================

export class WorkOrderExecutionService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  // ============================================================================
  // WORK ORDER DISPATCHING
  // ============================================================================

  /**
   * Dispatch a work order to the shop floor (CREATED → RELEASED)
   * This creates a dispatch log and transitions the work order to RELEASED status
   */
  async dispatchWorkOrder(data: DispatchWorkOrderData) {
    const { workOrderId, dispatchedBy, ...dispatchData } = data;

    // Verify work order exists and is in CREATED status
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { part: true, site: true }
    });

    if (!workOrder) {
      throw new Error(`Work order ${workOrderId} not found`);
    }

    if (workOrder.status !== 'CREATED') {
      throw new Error(`Work order ${workOrderId} cannot be dispatched. Current status: ${workOrder.status}. Only CREATED work orders can be dispatched.`);
    }

    // Create dispatch log and transition status in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create dispatch log
      const dispatchLog = await tx.dispatchLog.create({
        data: {
          workOrderId,
          dispatchedBy,
          quantityDispatched: workOrder.quantity,
          ...dispatchData
        }
      });

      // Transition work order to RELEASED
      const updatedWorkOrder = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: 'RELEASED',
          updatedAt: new Date()
        }
      });

      // Create status history record
      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId,
          previousStatus: 'CREATED',
          newStatus: 'RELEASED',
          reason: 'Work order dispatched to shop floor',
          changedBy: dispatchedBy,
          quantityAtTransition: workOrder.quantityCompleted,
          scrapAtTransition: workOrder.quantityScrapped,
          notes: dispatchData.dispatchNotes
        }
      });

      return { dispatchLog, workOrder: updatedWorkOrder };
    });

    return result;
  }

  /**
   * Get work orders ready for dispatch (CREATED status, no blockers)
   */
  async getWorkOrdersReadyForDispatch(siteId?: string) {
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        status: 'CREATED',
        ...(siteId ? { siteId } : {})
      },
      include: {
        part: true,
        site: true,
        routing: {
          include: {
            operations: true
          }
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    return workOrders;
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  /**
   * Transition work order to a new status with validation
   */
  async transitionWorkOrderStatus(data: StatusTransitionData) {
    const { workOrderId, newStatus, reason, changedBy, notes } = data;

    // Get current work order
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId }
    });

    if (!workOrder) {
      throw new Error(`Work order ${workOrderId} not found`);
    }

    const currentStatus = workOrder.status;

    // Validate transition
    const validNextStatuses = VALID_TRANSITIONS[currentStatus];
    if (!validNextStatuses.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
        `Valid transitions from ${currentStatus}: ${validNextStatuses.join(', ')}`
      );
    }

    // Perform transition in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update work order status
      const updatedWorkOrder = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: newStatus,
          ...(newStatus === 'IN_PROGRESS' && !workOrder.startedAt ? { startedAt: new Date(), actualStartDate: new Date() } : {}),
          ...(newStatus === 'COMPLETED' && !workOrder.completedAt ? { completedAt: new Date(), actualEndDate: new Date() } : {}),
          updatedAt: new Date()
        }
      });

      // Create status history record
      const statusHistory = await tx.workOrderStatusHistory.create({
        data: {
          workOrderId,
          previousStatus: currentStatus,
          newStatus,
          reason: reason || `Status transitioned from ${currentStatus} to ${newStatus}`,
          changedBy,
          quantityAtTransition: workOrder.quantityCompleted,
          scrapAtTransition: workOrder.quantityScrapped,
          notes
        }
      });

      return { workOrder: updatedWorkOrder, statusHistory };
    });

    return result;
  }

  /**
   * Get status history for a work order
   */
  async getWorkOrderStatusHistory(workOrderId: string) {
    const history = await this.prisma.workOrderStatusHistory.findMany({
      where: { workOrderId },
      orderBy: { transitionDate: 'asc' }
    });

    return history;
  }

  /**
   * Get work orders by status
   */
  async getWorkOrdersByStatus(status: WorkOrderStatus, siteId?: string) {
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        status,
        ...(siteId ? { siteId } : {})
      },
      include: {
        part: true,
        site: true,
        assignedTo: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' }
      ]
    });

    return workOrders;
  }

  // ============================================================================
  // WORK PERFORMANCE ACTUALS CAPTURE
  // ============================================================================

  /**
   * Record work performance actuals (labor, material, equipment, quality, downtime)
   */
  async recordWorkPerformance(data: WorkPerformanceData) {
    const { workOrderId, performanceType, recordedBy, ...perfData } = data;

    // Verify work order exists and is in progress or completed
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId }
    });

    if (!workOrder) {
      throw new Error(`Work order ${workOrderId} not found`);
    }

    if (!['IN_PROGRESS', 'COMPLETED'].includes(workOrder.status)) {
      throw new Error(`Cannot record performance for work order ${workOrderId}. Status: ${workOrder.status}. Work order must be IN_PROGRESS or COMPLETED.`);
    }

    // Calculate efficiency/variance for certain types
    let calculatedData: any = { ...perfData };

    if (performanceType === 'LABOR' && perfData.laborHours) {
      // Calculate efficiency if we have standard time (assuming 8 hours standard)
      const standardHours = 8;
      calculatedData.laborEfficiency = (standardHours / perfData.laborHours) * 100;
    }

    if (performanceType === 'MATERIAL' && perfData.quantityConsumed && perfData.quantityPlanned) {
      calculatedData.materialVariance = perfData.quantityPlanned - perfData.quantityConsumed;
    }

    if (performanceType === 'QUALITY' && perfData.quantityProduced && perfData.quantityGood) {
      calculatedData.yieldPercentage = (perfData.quantityGood / perfData.quantityProduced) * 100;
    }

    // Create performance record
    const performanceRecord = await this.prisma.workPerformance.create({
      data: {
        workOrderId,
        performanceType,
        recordedBy,
        ...calculatedData
      }
    });

    // Auto-calculate variances if applicable
    if (performanceType === 'LABOR' && perfData.laborHours) {
      await this.autoCalculateLaborVariance(workOrderId, performanceRecord.id, perfData.laborHours);
    }

    if (performanceType === 'MATERIAL' && perfData.quantityConsumed && perfData.quantityPlanned) {
      await this.autoCalculateMaterialVariance(workOrderId, performanceRecord.id, perfData.quantityConsumed, perfData.quantityPlanned, perfData.unitCost);
    }

    if (performanceType === 'QUALITY' && perfData.quantityProduced && perfData.quantityGood) {
      await this.autoCalculateYieldVariance(workOrderId, performanceRecord.id, perfData.quantityProduced, perfData.quantityGood);
    }

    return performanceRecord;
  }

  /**
   * Get all performance records for a work order
   */
  async getWorkPerformanceRecords(workOrderId: string, performanceType?: WorkPerformanceType) {
    const records = await this.prisma.workPerformance.findMany({
      where: {
        workOrderId,
        ...(performanceType ? { performanceType } : {})
      },
      include: {
        personnel: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { recordedAt: 'desc' }
    });

    return records;
  }

  // ============================================================================
  // VARIANCE CALCULATION
  // ============================================================================

  /**
   * Auto-calculate labor efficiency variance
   */
  private async autoCalculateLaborVariance(workOrderId: string, performanceRecordId: string, actualHours: number) {
    const standardHours = 8; // TODO: Get from routing
    const variance = standardHours - actualHours;
    const variancePercent = (variance / standardHours) * 100;
    const isFavorable = variance >= 0;
    const costImpact = Math.abs(variance) * 50; // Assume $50/hr labor rate

    await this.prisma.productionVariance.create({
      data: {
        workOrderId,
        varianceType: 'EFFICIENCY',
        varianceName: `Labor Efficiency Variance (Performance Record ${performanceRecordId.slice(-8)})`,
        plannedValue: standardHours,
        actualValue: actualHours,
        variance,
        variancePercent,
        isFavorable,
        costImpact,
        rootCause: isFavorable ? 'Better than standard efficiency' : 'Actual hours exceeded standard',
        calculatedAt: new Date()
      }
    });
  }

  /**
   * Auto-calculate material usage variance
   */
  private async autoCalculateMaterialVariance(
    workOrderId: string,
    performanceRecordId: string,
    actualQuantity: number,
    plannedQuantity: number,
    unitCost?: number
  ) {
    const variance = plannedQuantity - actualQuantity;
    const variancePercent = (variance / plannedQuantity) * 100;
    const isFavorable = variance >= 0;
    const costImpact = unitCost ? Math.abs(variance) * unitCost : undefined;

    await this.prisma.productionVariance.create({
      data: {
        workOrderId,
        varianceType: 'MATERIAL',
        varianceName: `Material Usage Variance (Performance Record ${performanceRecordId.slice(-8)})`,
        plannedValue: plannedQuantity,
        actualValue: actualQuantity,
        variance,
        variancePercent,
        isFavorable,
        costImpact,
        rootCause: isFavorable ? 'Material savings vs planned' : 'Material overrun vs planned',
        calculatedAt: new Date()
      }
    });
  }

  /**
   * Auto-calculate yield/quality variance
   */
  private async autoCalculateYieldVariance(
    workOrderId: string,
    performanceRecordId: string,
    quantityProduced: number,
    quantityGood: number
  ) {
    const actualYield = (quantityGood / quantityProduced) * 100;
    const plannedYield = 100; // Assume 100% planned yield
    const variance = actualYield - plannedYield;
    const variancePercent = variance;
    const isFavorable = variance >= 0;

    await this.prisma.productionVariance.create({
      data: {
        workOrderId,
        varianceType: 'YIELD',
        varianceName: `Yield Variance (Performance Record ${performanceRecordId.slice(-8)})`,
        plannedValue: plannedYield,
        actualValue: actualYield,
        variance,
        variancePercent,
        isFavorable,
        rootCause: isFavorable ? 'Yield meets or exceeds 100%' : `Scrap/rework reduced yield to ${actualYield.toFixed(1)}%`,
        calculatedAt: new Date()
      }
    });
  }

  /**
   * Get all variances for a work order
   */
  async getProductionVariances(workOrderId: string, varianceType?: VarianceType) {
    const variances = await this.prisma.productionVariance.findMany({
      where: {
        workOrderId,
        ...(varianceType ? { varianceType } : {})
      },
      orderBy: { calculatedAt: 'desc' }
    });

    return variances;
  }

  /**
   * Calculate comprehensive variance summary for a work order
   */
  async calculateVarianceSummary(workOrderId: string) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        workPerformance: true,
        variances: true
      }
    });

    if (!workOrder) {
      throw new Error(`Work order ${workOrderId} not found`);
    }

    // Aggregate variances by type
    const varianceSummary = {
      totalVariances: workOrder.variances.length,
      favorableVariances: workOrder.variances.filter(v => v.isFavorable).length,
      unfavorableVariances: workOrder.variances.filter(v => !v.isFavorable).length,
      totalCostImpact: workOrder.variances.reduce((sum, v) => sum + (v.costImpact || 0), 0),
      byType: {} as Record<VarianceType, any>
    };

    // Group by type
    const varianceTypes: VarianceType[] = ['QUANTITY', 'TIME', 'COST', 'EFFICIENCY', 'YIELD', 'MATERIAL'];
    varianceTypes.forEach(type => {
      const typeVariances = workOrder.variances.filter(v => v.varianceType === type);
      if (typeVariances.length > 0) {
        varianceSummary.byType[type] = {
          count: typeVariances.length,
          totalVariance: typeVariances.reduce((sum, v) => sum + v.variance, 0),
          averageVariancePercent: typeVariances.reduce((sum, v) => sum + v.variancePercent, 0) / typeVariances.length,
          favorableCount: typeVariances.filter(v => v.isFavorable).length,
          unfavorableCount: typeVariances.filter(v => !v.isFavorable).length,
          totalCostImpact: typeVariances.reduce((sum, v) => sum + (v.costImpact || 0), 0)
        };
      }
    });

    return varianceSummary;
  }

  // ============================================================================
  // REAL-TIME DASHBOARD & STATISTICS
  // ============================================================================

  /**
   * Get real-time execution dashboard statistics
   */
  async getExecutionDashboard(siteId?: string) {
    const workOrders = await this.prisma.workOrder.findMany({
      where: siteId ? { siteId } : {}
    });

    const statusCounts = {
      CREATED: workOrders.filter(wo => wo.status === 'CREATED').length,
      RELEASED: workOrders.filter(wo => wo.status === 'RELEASED').length,
      IN_PROGRESS: workOrders.filter(wo => wo.status === 'IN_PROGRESS').length,
      ON_HOLD: workOrders.filter(wo => wo.status === 'ON_HOLD').length,
      COMPLETED: workOrders.filter(wo => wo.status === 'COMPLETED').length,
      CANCELLED: workOrders.filter(wo => wo.status === 'CANCELLED').length
    };

    const priorityCounts = {
      LOW: workOrders.filter(wo => wo.priority === 'LOW').length,
      NORMAL: workOrders.filter(wo => wo.priority === 'NORMAL').length,
      HIGH: workOrders.filter(wo => wo.priority === 'HIGH').length,
      URGENT: workOrders.filter(wo => wo.priority === 'URGENT').length
    };

    // Performance summary
    const totalPerformanceRecords = await this.prisma.workPerformance.count();
    const performanceByType = await this.prisma.workPerformance.groupBy({
      by: ['performanceType'],
      _count: true
    });

    // Variance summary
    const totalVariances = await this.prisma.productionVariance.count();
    const favorableVariances = await this.prisma.productionVariance.count({
      where: { isFavorable: true }
    });
    const unfavorableVariances = await this.prisma.productionVariance.count({
      where: { isFavorable: false }
    });

    const varianceCostImpact = await this.prisma.productionVariance.aggregate({
      _sum: { costImpact: true }
    });

    return {
      totalWorkOrders: workOrders.length,
      statusCounts,
      priorityCounts,
      activeWorkOrders: statusCounts.IN_PROGRESS + statusCounts.RELEASED,
      completionRate: workOrders.length > 0 ? (statusCounts.COMPLETED / workOrders.length) * 100 : 0,
      performance: {
        totalRecords: totalPerformanceRecords,
        byType: performanceByType.reduce((acc, item) => {
          acc[item.performanceType] = item._count;
          return acc;
        }, {} as Record<string, number>)
      },
      variances: {
        total: totalVariances,
        favorable: favorableVariances,
        unfavorable: unfavorableVariances,
        totalCostImpact: varianceCostImpact._sum.costImpact || 0
      }
    };
  }
}

// Export singleton instance for backward compatibility
export default new WorkOrderExecutionService();
