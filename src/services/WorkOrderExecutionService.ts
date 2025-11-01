/**
 * Work Order Execution Service (ISA-95 Production Dispatching & Execution - Task 1.7)
 *
 * This service handles the shop floor execution layer of ISA-95 Part 2:
 * - Work order dispatching (CREATED → RELEASED to shop floor)
 * - Real-time status tracking with audit trail
 * - Work performance actuals capture (labor, material, equipment, quality, downtime)
 * - Automatic variance calculation (planned vs actual)
 * - Production response reporting
 *
 * Issue #41 Integration: Flexible Workflow Enforcement Engine
 * - Configuration-driven enforcement of workflow rules
 * - Audit trail tracking for all enforcement decisions
 * - Support for STRICT, FLEXIBLE, and HYBRID enforcement modes
 */

import { WorkOrderStatus, WorkPerformanceType, VarianceType } from '@prisma/client';
import prisma from '../lib/database';
import { WorkflowEnforcementService } from './WorkflowEnforcementService';
import { WorkflowConfigurationService } from './WorkflowConfigurationService';

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
  private enforcementService: WorkflowEnforcementService;

  constructor(enforcementService?: WorkflowEnforcementService) {
    // If not provided, create instance with configuration service
    if (!enforcementService) {
      const configService = new WorkflowConfigurationService();
      this.enforcementService = new WorkflowEnforcementService(configService, prisma);
    } else {
      this.enforcementService = enforcementService;
    }
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
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { part: true, site: true }
    });

    if (!workOrder) {
      // ✅ GITHUB ISSUE #11 FIX: Enhanced work order not found error for dispatch
      throw new Error(
        `Work order ${workOrderId} not found for dispatch operation. ` +
        `Verify the work order ID is correct and the work order exists in the system. ` +
        `Only existing work orders can be dispatched to the shop floor. ` +
        `Check work order management to confirm this work order exists.`
      );
    }

    if (workOrder.status !== 'CREATED') {
      // ✅ GITHUB ISSUE #11 FIX: Enhanced dispatch validation error with context
      throw new Error(
        `Work order ${workOrderId} cannot be dispatched. Current status: ${workOrder.status}. ` +
        `Only CREATED work orders can be dispatched. ` +
        `Work order details: ${workOrder.workOrderNumber} (${workOrder.part?.partNumber || 'No part'}) - ` +
        `Priority: ${workOrder.priority}. ` +
        `To dispatch this work order, it must first be reset to CREATED status.`
      );
    }

    // Validate assignedToId if provided
    if (dispatchData.assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: dispatchData.assignedToId }
      });
      if (!assignedUser) {
        // Set to undefined so it becomes NULL in database (nullable foreign key)
        dispatchData.assignedToId = undefined;
      }
    }

    // Validate workCenterId if provided
    if (dispatchData.workCenterId) {
      const workCenter = await prisma.workCenter.findUnique({
        where: { id: dispatchData.workCenterId }
      });
      if (!workCenter) {
        // Set to undefined so it becomes NULL in database (nullable foreign key)
        dispatchData.workCenterId = undefined;
      }
    }

    // Create dispatch log and transition status in a transaction
    const result = await prisma.$transaction(async (tx) => {
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
    const workOrders = await prisma.workOrder.findMany({
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

    // ✅ PHASE 8 FIX: Enhanced work order ID validation to prevent business logic conflicts
    if (!workOrderId || typeof workOrderId !== 'string' || workOrderId.trim() === '' || workOrderId === 'undefined' || workOrderId === 'null') {
      throw new Error(`Invalid work order ID provided: "${workOrderId}". Work order ID must be a non-empty string.`);
    }

    const cleanWorkOrderId = workOrderId.trim();

    // Get current work order
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: cleanWorkOrderId },
      include: { part: true }
    });

    if (!workOrder) {
      // ✅ GITHUB ISSUE #11 FIX: Enhanced work order not found error for status transitions
      throw new Error(
        `Work order ${cleanWorkOrderId} not found. ` +
        `Verify the work order ID is correct and the work order exists in the system. ` +
        `Common causes: work order may have been deleted, ID may be incorrect, or database connectivity issues. ` +
        `Check work order management to confirm this work order exists.`
      );
    }

    const currentStatus = workOrder.status;

    // ✅ PHASE 8B FIX: Validate work order status enum values
    // Valid statuses: CREATED, RELEASED, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED
    const validStatuses = Object.values(WorkOrderStatus) as string[];
    if (!validStatuses.includes(newStatus as string)) {
      throw new Error(`Invalid work order status: ${newStatus}. Valid statuses are: ${validStatuses.join(', ')}`);
    }

    // ✅ GITHUB ISSUE #11 FIX: Enhanced status transition validation with detailed context
    const validNextStatuses = VALID_TRANSITIONS[currentStatus];
    if (!validNextStatuses.includes(newStatus)) {
      throw new Error(
        `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
        `Valid transitions from ${currentStatus}: ${validNextStatuses.join(', ')}. ` +
        `Work order: ${workOrder.workOrderNumber} (${workOrder.part?.partNumber || 'No part'}). ` +
        `Status transition rules follow ISA-95 standard workflow. ` +
        `Use valid intermediate states if needed (e.g., ${currentStatus} → ON_HOLD → other states).`
      );
    }

    // Perform transition in transaction
    const result = await prisma.$transaction(async (tx) => {
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
    const history = await prisma.workOrderStatusHistory.findMany({
      where: { workOrderId },
      orderBy: { transitionDate: 'asc' }
    });

    return history;
  }

  /**
   * Get work orders by status
   */
  async getWorkOrdersByStatus(status: WorkOrderStatus, siteId?: string) {
    const workOrders = await prisma.workOrder.findMany({
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
   * Issue #41: Enforces workflow rules based on configuration
   */
  async recordWorkPerformance(data: WorkPerformanceData, enforcementBypass?: { userId: string; justification: string }) {
    const { workOrderId, performanceType, recordedBy, ...perfData } = data;

    // ✅ PHASE 8 FIX: Enhanced work order ID validation to prevent business logic conflicts
    if (!workOrderId || typeof workOrderId !== 'string' || workOrderId.trim() === '' || workOrderId === 'undefined' || workOrderId === 'null') {
      throw new Error(`Invalid work order ID provided: "${workOrderId}". Work order ID must be a non-empty string.`);
    }

    const cleanWorkOrderId = workOrderId.trim();

    // Verify work order exists
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: cleanWorkOrderId },
      include: { part: true }
    });

    if (!workOrder) {
      // ✅ GITHUB ISSUE #11 FIX: Enhanced work order not found error for performance recording
      throw new Error(
        `Work order ${cleanWorkOrderId} not found for performance recording. ` +
        `Verify the work order ID is correct and the work order exists in the system. ` +
        `Performance can only be recorded for existing work orders. ` +
        `Check work order management to confirm this work order exists.`
      );
    }

    // Issue #41: Check enforcement rules for recording performance
    const enforcementDecision = await this.enforcementService.canRecordPerformance(cleanWorkOrderId);

    if (!enforcementDecision.allowed) {
      throw new Error(
        `Cannot record performance for work order ${cleanWorkOrderId}. ` +
        `Reason: ${enforcementDecision.reason} ` +
        `Enforcement Mode: ${enforcementDecision.configMode}`
      );
    }

    // Log enforcement decision and any warnings
    if (enforcementDecision.warnings.length > 0 || enforcementDecision.bypassesApplied.length > 0) {
      await this.recordEnforcementAudit(cleanWorkOrderId, 'RECORD_PERFORMANCE', enforcementDecision, recordedBy, enforcementBypass?.justification);
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
    const performanceRecord = await prisma.workPerformance.create({
      data: {
        workOrderId: cleanWorkOrderId,
        performanceType,
        recordedBy,
        ...calculatedData
      }
    });

    // Auto-calculate variances if applicable
    if (performanceType === 'LABOR' && perfData.laborHours) {
      await this.autoCalculateLaborVariance(cleanWorkOrderId, performanceRecord.id, perfData.laborHours);
    }

    if (performanceType === 'MATERIAL' && perfData.quantityConsumed && perfData.quantityPlanned) {
      await this.autoCalculateMaterialVariance(cleanWorkOrderId, performanceRecord.id, perfData.quantityConsumed, perfData.quantityPlanned, perfData.unitCost);
    }

    if (performanceType === 'QUALITY' && perfData.quantityProduced && perfData.quantityGood) {
      await this.autoCalculateYieldVariance(cleanWorkOrderId, performanceRecord.id, perfData.quantityProduced, perfData.quantityGood);
    }

    return performanceRecord;
  }

  /**
   * Get all performance records for a work order
   */
  async getWorkPerformanceRecords(workOrderId: string, performanceType?: WorkPerformanceType) {
    const records = await prisma.workPerformance.findMany({
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
  // OPERATION MANAGEMENT (Issue #41: With Enforcement)
  // ============================================================================

  /**
   * Start an operation within a work order with enforcement validation
   * Issue #41: Validates prerequisites and enforces workflow rules
   */
  async startOperation(
    workOrderId: string,
    operationId: string,
    startedBy: string,
    notes?: string,
    enforcementBypass?: { userId: string; justification: string }
  ) {
    // Validate inputs
    if (!workOrderId || !operationId || !startedBy) {
      throw new Error('Work order ID, operation ID, and started by user are required');
    }

    // Get operation with work order context
    const operation = await prisma.workOrderOperation.findUnique({
      where: { id: operationId },
      include: {
        workOrder: true
      }
    });

    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    if (operation.workOrderId !== workOrderId) {
      throw new Error(`Operation ${operationId} does not belong to work order ${workOrderId}`);
    }

    // Issue #41: Check enforcement rules for starting operation
    const enforcementDecision = await this.enforcementService.canStartOperation(workOrderId, operationId);

    if (!enforcementDecision.allowed) {
      throw new Error(
        `Cannot start operation ${operationId}. ` +
        `Reason: ${enforcementDecision.reason} ` +
        `Enforcement Mode: ${enforcementDecision.configMode}`
      );
    }

    // Validate prerequisites
    const config = await this.enforcementService.getEffectiveConfiguration(workOrderId);
    if (config.enforceOperationSequence) {
      const prerequisiteValidation = await this.enforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        config.mode === 'STRICT' ? 'STRICT' : 'FLEXIBLE'
      );

      if (!prerequisiteValidation.valid && config.mode === 'STRICT') {
        const unmetNames = prerequisiteValidation.unmetPrerequisites
          .map(p => `${p.prerequisiteOperationName} (${p.reason})`)
          .join(', ');
        throw new Error(`Cannot start operation: unmet prerequisites - ${unmetNames}`);
      }

      // Log audit for prerequisite warnings
      if (prerequisiteValidation.warnings.length > 0) {
        await this.recordEnforcementAudit(
          workOrderId,
          'START_OPERATION',
          enforcementDecision,
          startedBy,
          enforcementBypass?.justification,
          operationId
        );
      }
    }

    // Start the operation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedOperation = await tx.workOrderOperation.update({
        where: { id: operationId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      });

      return updatedOperation;
    });

    // Log enforcement decision
    if (enforcementDecision.warnings.length > 0 || enforcementDecision.bypassesApplied.length > 0) {
      await this.recordEnforcementAudit(
        workOrderId,
        'START_OPERATION',
        enforcementDecision,
        startedBy,
        enforcementBypass?.justification,
        operationId
      );
    }

    return result;
  }

  /**
   * Complete an operation within a work order with enforcement validation
   * Issue #41: Validates operation state and enforces workflow rules
   */
  async completeOperation(
    workOrderId: string,
    operationId: string,
    completedBy: string,
    notes?: string,
    enforcementBypass?: { userId: string; justification: string }
  ) {
    // Validate inputs
    if (!workOrderId || !operationId || !completedBy) {
      throw new Error('Work order ID, operation ID, and completed by user are required');
    }

    // Get operation
    const operation = await prisma.workOrderOperation.findUnique({
      where: { id: operationId },
      include: { workOrder: true }
    });

    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    if (operation.workOrderId !== workOrderId) {
      throw new Error(`Operation ${operationId} does not belong to work order ${workOrderId}`);
    }

    // Issue #41: Check enforcement rules for completing operation
    const enforcementDecision = await this.enforcementService.canCompleteOperation(workOrderId, operationId);

    if (!enforcementDecision.allowed) {
      throw new Error(
        `Cannot complete operation ${operationId}. ` +
        `Reason: ${enforcementDecision.reason} ` +
        `Enforcement Mode: ${enforcementDecision.configMode}`
      );
    }

    // Complete the operation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedOperation = await tx.workOrderOperation.update({
        where: { id: operationId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      return updatedOperation;
    });

    // Log enforcement decision
    if (enforcementDecision.warnings.length > 0 || enforcementDecision.bypassesApplied.length > 0) {
      await this.recordEnforcementAudit(
        workOrderId,
        'COMPLETE_OPERATION',
        enforcementDecision,
        completedBy,
        enforcementBypass?.justification,
        operationId
      );
    }

    return result;
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

    await prisma.productionVariance.create({
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

    await prisma.productionVariance.create({
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

    await prisma.productionVariance.create({
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
    const variances = await prisma.productionVariance.findMany({
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
    // ✅ PHASE 8 FIX: Enhanced work order ID validation to prevent business logic conflicts
    if (!workOrderId || typeof workOrderId !== 'string' || workOrderId.trim() === '' || workOrderId === 'undefined' || workOrderId === 'null') {
      throw new Error(`Invalid work order ID provided: "${workOrderId}". Work order ID must be a non-empty string.`);
    }

    const cleanWorkOrderId = workOrderId.trim();

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: cleanWorkOrderId },
      include: {
        workPerformance: true,
        variances: true,
        part: true
      }
    });

    if (!workOrder) {
      // ✅ GITHUB ISSUE #11 FIX: Enhanced work order not found error for variance calculation
      throw new Error(
        `Work order ${cleanWorkOrderId} not found for variance calculation. ` +
        `Verify the work order ID is correct and the work order exists in the system. ` +
        `Variance calculations can only be performed for existing work orders with performance data. ` +
        `Check work order management to confirm this work order exists.`
      );
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
  // ENFORCEMENT AUDIT LOGGING (Issue #41)
  // ============================================================================

  /**
   * Record an enforcement decision to the audit table
   * Used for tracking all enforcement bypasses and warnings
   */
  private async recordEnforcementAudit(
    workOrderId: string,
    action: 'RECORD_PERFORMANCE' | 'START_OPERATION' | 'COMPLETE_OPERATION',
    decision: any,
    userId: string,
    justification?: string,
    operationId?: string
  ) {
    try {
      // Use optional chaining to safely access the model in case it's not yet available in Prisma client
      if (prisma && (prisma as any).workflowEnforcementAudit) {
        await (prisma as any).workflowEnforcementAudit.create({
          data: {
            workOrderId,
            operationId,
            action,
            enforcementMode: decision.configMode,
            bypassesApplied: decision.bypassesApplied,
            warnings: decision.warnings,
            decision: JSON.stringify(decision),
            userId,
            justification
          }
        });
      } else {
        // Model not available yet, log warning but continue
        console.warn('WorkflowEnforcementAudit model not available in Prisma client - audit not recorded');
      }
    } catch (error) {
      // Log error but don't block operation
      console.error(`Failed to record enforcement audit: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // REAL-TIME DASHBOARD & STATISTICS
  // ============================================================================

  /**
   * Get real-time execution dashboard statistics
   */
  async getExecutionDashboard(siteId?: string) {
    const workOrders = await prisma.workOrder.findMany({
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

    // Today's stats (work orders that transitioned today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const dispatchLogsToday = await prisma.dispatchLog.count({
      where: {
        dispatchedAt: {
          gte: today,
          lte: todayEnd
        }
      }
    });

    const workOrdersStartedToday = await prisma.workOrder.count({
      where: {
        startedAt: {
          gte: today,
          lte: todayEnd
        }
      }
    });

    const workOrdersCompletedToday = await prisma.workOrder.count({
      where: {
        completedAt: {
          gte: today,
          lte: todayEnd
        }
      }
    });

    // Performance summary
    const totalPerformanceRecords = await prisma.workPerformance.count();
    const performanceByType = await prisma.workPerformance.groupBy({
      by: ['performanceType'],
      _count: true
    });

    // Performance stats aggregation
    const laborPerformance = await prisma.workPerformance.aggregate({
      where: { performanceType: 'LABOR' },
      _sum: { laborHours: true }
    });

    const downtimePerformance = await prisma.workPerformance.aggregate({
      where: { performanceType: 'DOWNTIME' },
      _sum: { downtimeMinutes: true }
    });

    // Variance summary
    const totalVariances = await prisma.productionVariance.count();
    const favorableVariances = await prisma.productionVariance.count({
      where: { isFavorable: true }
    });
    const unfavorableVariances = await prisma.productionVariance.count({
      where: { isFavorable: false }
    });

    const varianceCostImpact = await prisma.productionVariance.aggregate({
      _sum: { costImpact: true }
    });

    return {
      totalWorkOrders: workOrders.length,
      statusCounts,
      priorityCounts,
      activeWorkOrders: statusCounts.IN_PROGRESS + statusCounts.RELEASED,
      completionRate: workOrders.length > 0 ? (statusCounts.COMPLETED / workOrders.length) * 100 : 0,
      todayStats: {
        dispatched: dispatchLogsToday,
        started: workOrdersStartedToday,
        completed: workOrdersCompletedToday
      },
      performance: {
        totalRecords: totalPerformanceRecords,
        byType: performanceByType.reduce((acc, item) => {
          acc[item.performanceType] = item._count;
          return acc;
        }, {} as Record<string, number>)
      },
      performanceStats: {
        totalLaborHours: laborPerformance._sum.laborHours || 0,
        totalDowntimeMinutes: downtimePerformance._sum.downtimeMinutes || 0
      },
      variances: {
        total: totalVariances,
        favorable: favorableVariances,
        unfavorable: unfavorableVariances,
        totalCostImpact: varianceCostImpact._sum.costImpact || 0
      },
      varianceStats: {
        totalVariances,
        favorableCount: favorableVariances,
        unfavorableCount: unfavorableVariances
      }
    };
  }
}

// Export singleton instance for backward compatibility
export default new WorkOrderExecutionService();
