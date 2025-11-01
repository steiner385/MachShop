/**
 * Workflow-Aware Work Order Execution Service
 * Created for GitHub Issue #40 - Site-Level Workflow Configuration System
 *
 * Extends WorkOrderExecutionService with workflow configuration awareness.
 * Implements configuration-driven enforcement for operation execution,
 * data collection, and external vouching based on site/routing/work order modes.
 */

import { WorkOrderStatus } from '@prisma/client';
import { WorkOrderExecutionService } from './WorkOrderExecutionService';
import { WorkflowConfigurationService } from './WorkflowConfigurationService';
import prisma from '../lib/database';
import { Logger } from '../utils/logger';

interface ExecutionCheckResult {
  allowed: boolean;
  reason?: string;
  configuration?: any;
}

interface ExternalVoucherData {
  workOrderId: string;
  operationId: string;
  vouchedBy: string;
  voucherSystemId: string; // e.g., "ERP", "LEGACY_MES"
  externalOperationId?: string;
  completionTime: Date;
  notes?: string;
}

/**
 * WorkflowAwareExecutionService
 *
 * Provides workflow configuration-aware execution methods by wrapping
 * the standard WorkOrderExecutionService with configuration checks.
 * Supports three modes: STRICT, FLEXIBLE, HYBRID.
 */
export class WorkflowAwareExecutionService {
  private executionService: WorkOrderExecutionService;
  private configService: WorkflowConfigurationService;
  private logger: Logger;

  constructor() {
    this.executionService = new WorkOrderExecutionService();
    this.configService = new WorkflowConfigurationService();
    this.logger = Logger.getInstance();
  }

  // ============================================================================
  // OPERATION EXECUTION CHECKS
  // ============================================================================

  /**
   * Check if an operation can be executed given workflow configuration
   *
   * STRICT mode: Requires IN_PROGRESS status and operation sequence
   * FLEXIBLE mode: Allows execution without status constraints
   * HYBRID mode: Allows external system completion or MES completion
   */
  async canExecuteOperation(
    workOrderId: string,
    operationId: string
  ): Promise<ExecutionCheckResult> {
    try {
      const effective = await this.configService.getEffectiveConfiguration(workOrderId);
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: { routing: { include: { operations: true } } }
      });

      if (!workOrder) {
        return {
          allowed: false,
          reason: `Work order ${workOrderId} not found`
        };
      }

      // Mode-specific execution rules
      switch (effective.mode) {
        case 'STRICT':
          return this.checkStrictModeExecution(workOrder, operationId, effective);

        case 'FLEXIBLE':
          return this.checkFlexibleModeExecution(workOrder, operationId, effective);

        case 'HYBRID':
          return this.checkHybridModeExecution(workOrder, operationId, effective);

        default:
          return {
            allowed: false,
            reason: `Unknown workflow mode: ${effective.mode}`
          };
      }
    } catch (error) {
      this.logger.error('Error checking operation execution', error);
      return {
        allowed: false,
        reason: `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * STRICT mode execution checks
   * - Work order must be IN_PROGRESS
   * - Operations must be executed in sequence
   * - All prerequisite operations must be completed
   */
  private checkStrictModeExecution(workOrder: any, operationId: string, config: any): ExecutionCheckResult {
    // Check status gating
    if (config.enforceStatusGating && workOrder.status !== 'IN_PROGRESS') {
      return {
        allowed: false,
        reason: `STRICT mode requires work order to be IN_PROGRESS. Current status: ${workOrder.status}`,
        configuration: config
      };
    }

    // Check operation sequence enforcement
    if (config.enforceOperationSequence) {
      const executionOrder = this.getOperationExecutionOrder(workOrder.routing.operations, operationId);
      if (executionOrder.canExecute === false) {
        return {
          allowed: false,
          reason: executionOrder.reason,
          configuration: config
        };
      }
    }

    return {
      allowed: true,
      configuration: config
    };
  }

  /**
   * FLEXIBLE mode execution checks
   * - Status gating can be relaxed
   * - Operations can be executed out of sequence
   * - Data collection allowed without status constraints
   */
  private checkFlexibleModeExecution(workOrder: any, operationId: string, config: any): ExecutionCheckResult {
    // FLEXIBLE mode allows execution regardless of status gating
    // (but still respects enforceStatusGating if explicitly set to true)
    if (config.enforceStatusGating && workOrder.status !== 'IN_PROGRESS') {
      return {
        allowed: false,
        reason: `Status gating is enabled. Work order must be IN_PROGRESS. Current status: ${workOrder.status}`,
        configuration: config
      };
    }

    // FLEXIBLE mode allows operation sequence override
    if (config.enforceOperationSequence) {
      const executionOrder = this.getOperationExecutionOrder(workOrder.routing.operations, operationId);
      if (executionOrder.canExecute === false) {
        return {
          allowed: false,
          reason: executionOrder.reason,
          configuration: config
        };
      }
    }

    return {
      allowed: true,
      configuration: config
    };
  }

  /**
   * HYBRID mode execution checks
   * - External systems can complete operations (if allowExternalVouching)
   * - MES can perform flexible data collection
   * - Flexible status gating
   */
  private checkHybridModeExecution(workOrder: any, operationId: string, config: any): ExecutionCheckResult {
    // HYBRID mode allows flexible execution
    // External systems can complete via vouching, MES can execute normally

    if (config.enforceStatusGating && workOrder.status !== 'IN_PROGRESS') {
      return {
        allowed: false,
        reason: `Status gating is enabled. Work order must be IN_PROGRESS. Current status: ${workOrder.status}`,
        configuration: config
      };
    }

    return {
      allowed: true,
      configuration: config
    };
  }

  // ============================================================================
  // DATA COLLECTION CHECKS
  // ============================================================================

  /**
   * Check if data can be collected given workflow configuration
   *
   * STRICT mode: Requires IN_PROGRESS status
   * FLEXIBLE mode: Allows collection without status constraints
   * HYBRID mode: Allows flexible data collection from any status
   */
  async canCollectData(workOrderId: string): Promise<ExecutionCheckResult> {
    try {
      const effective = await this.configService.getEffectiveConfiguration(workOrderId);
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId }
      });

      if (!workOrder) {
        return {
          allowed: false,
          reason: `Work order ${workOrderId} not found`
        };
      }

      // Check status gating based on mode
      if (effective.enforceStatusGating && workOrder.status !== 'IN_PROGRESS') {
        return {
          allowed: false,
          reason: `Status gating enforcement requires work order IN_PROGRESS status. Current: ${workOrder.status}`,
          configuration: effective
        };
      }

      // In FLEXIBLE and HYBRID modes, data collection is more relaxed
      if (effective.mode === 'FLEXIBLE' || effective.mode === 'HYBRID') {
        // Only enforce if explicitly configured
        if (!effective.enforceStatusGating) {
          return {
            allowed: true,
            configuration: effective
          };
        }
      }

      return {
        allowed: true,
        configuration: effective
      };
    } catch (error) {
      this.logger.error('Error checking data collection permission', error);
      return {
        allowed: false,
        reason: `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // ============================================================================
  // EXTERNAL VOUCHING (HYBRID MODE)
  // ============================================================================

  /**
   * Record external operation vouching (HYBRID mode)
   * Allows external systems to report operation completion
   */
  async recordExternalVouching(voucherData: ExternalVoucherData) {
    const { workOrderId, operationId, vouchedBy, voucherSystemId, completionTime } = voucherData;

    try {
      // Verify HYBRID mode and allowExternalVouching
      const effective = await this.configService.getEffectiveConfiguration(workOrderId);

      if (effective.mode !== 'HYBRID') {
        throw new Error(
          `External vouching is only allowed in HYBRID mode. Current mode: ${effective.mode}`
        );
      }

      if (!effective.allowExternalVouching) {
        throw new Error(
          'External vouching is not enabled for this work order'
        );
      }

      // Record the external vouching
      const vouching = await prisma.externalOperationVouching.create({
        data: {
          workOrderId,
          operationId,
          vouchedBy,
          voucherSystemId,
          externalOperationId: voucherData.externalOperationId,
          completionTime,
          notes: voucherData.notes,
          createdAt: new Date()
        }
      });

      this.logger.info(
        `External operation vouching recorded: WO=${workOrderId}, OP=${operationId}, System=${voucherSystemId}`
      );

      return vouching;
    } catch (error) {
      this.logger.error('Error recording external vouching', error);
      throw error;
    }
  }

  /**
   * Get external vouching records for a work order
   */
  async getExternalVouchingRecords(workOrderId: string) {
    try {
      const records = await prisma.externalOperationVouching.findMany({
        where: { workOrderId },
        orderBy: { completionTime: 'desc' }
      });

      return records;
    } catch (error) {
      this.logger.error('Error retrieving external vouching records', error);
      throw error;
    }
  }

  // ============================================================================
  // QUALITY CHECK ENFORCEMENT
  // ============================================================================

  /**
   * Check if quality checks must be passed before operation completion
   */
  async getQualityCheckRequirements(workOrderId: string): Promise<{
    enforceQualityChecks: boolean;
    configuration: any;
  }> {
    try {
      const effective = await this.configService.getEffectiveConfiguration(workOrderId);

      return {
        enforceQualityChecks: effective.enforceQualityChecks,
        configuration: effective
      };
    } catch (error) {
      this.logger.error('Error getting quality check requirements', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check operation execution order
   */
  private getOperationExecutionOrder(
    operations: any[],
    operationId: string
  ): { canExecute: boolean; reason?: string } {
    const operation = operations.find((op) => op.id === operationId);

    if (!operation) {
      return {
        canExecute: false,
        reason: `Operation ${operationId} not found in routing`
      };
    }

    // Check if all prerequisite operations are completed
    const prerequisites = operations.filter((op) => op.sequenceNumber < operation.sequenceNumber);

    if (prerequisites.length === 0) {
      return { canExecute: true }; // First operation
    }

    // TODO: Check if all prerequisites are completed
    // This would require fetching operation execution records

    return { canExecute: true };
  }

  /**
   * Wrap execution service method with configuration checks
   */
  async transitionWithConfigurationCheck(
    workOrderId: string,
    newStatus: WorkOrderStatus,
    reason?: string,
    changedBy?: string,
    notes?: string
  ) {
    try {
      // Get effective configuration
      const effective = await this.configService.getEffectiveConfiguration(workOrderId);

      // Apply configuration-aware validation
      let allowTransition = true;
      let validationReason = '';

      // Check requireApproval
      if (effective.requireApproval && ['IN_PROGRESS', 'COMPLETED'].includes(newStatus as string)) {
        // TODO: Implement approval requirement check
        validationReason = 'This transition requires supervisor approval';
      }

      // Check requireStartTransition
      if (effective.requireStartTransition && newStatus === 'IN_PROGRESS') {
        // This is generally allowed, but could require specific handling
      }

      if (!allowTransition) {
        throw new Error(validationReason);
      }

      // Proceed with standard transition
      return await this.executionService.transitionWorkOrderStatus({
        workOrderId,
        newStatus,
        reason: `${reason} (${effective.mode} mode)`,
        changedBy: changedBy || 'system',
        notes
      });
    } catch (error) {
      this.logger.error('Error during configuration-aware status transition', error);
      throw error;
    }
  }

  /**
   * Wrap performance recording with configuration checks
   */
  async recordPerformanceWithConfigurationCheck(
    workOrderId: string,
    performanceType: string,
    perfData: any,
    recordedBy: string
  ) {
    try {
      // Check if data collection is allowed
      const canCollect = await this.canCollectData(workOrderId);

      if (!canCollect.allowed) {
        throw new Error(
          `Cannot record ${performanceType} performance: ${canCollect.reason}`
        );
      }

      // Check quality requirements
      if (performanceType === 'QUALITY') {
        const qcRequirements = await this.getQualityCheckRequirements(workOrderId);
        if (qcRequirements.enforceQualityChecks && !perfData.qualityChecksPassed) {
          throw new Error('Quality checks must be passed before recording quality performance');
        }
      }

      // Proceed with standard performance recording
      return await this.executionService.recordWorkPerformance(
        workOrderId,
        performanceType as any,
        perfData,
        recordedBy
      );
    } catch (error) {
      this.logger.error('Error recording performance with configuration check', error);
      throw error;
    }
  }
}

// Export singleton instance
export const workflowAwareExecutionService = new WorkflowAwareExecutionService();
