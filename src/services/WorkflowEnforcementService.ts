/**
 * WorkflowEnforcementService
 * Manages configuration-driven enforcement of workflow rules
 * Supports STRICT, FLEXIBLE, and HYBRID enforcement modes
 */

import { PrismaClient } from '@prisma/client';
import { WorkflowConfigurationService } from './WorkflowConfigurationService';

/**
 * Types for enforcement decisions and validations
 */
export type WorkflowMode = 'STRICT' | 'FLEXIBLE' | 'HYBRID';
export type DependencyType = 'SEQUENTIAL' | 'PARALLEL' | 'CONDITIONAL';
export type WorkOrderStatus = 'CREATED' | 'RELEASED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';

export interface EnforcementDecision {
  allowed: boolean;
  reason?: string;
  warnings: string[];
  configMode: WorkflowMode;
  bypassesApplied: string[];
  appliedAt: Date;
}

export interface PrerequisiteValidation {
  valid: boolean;
  unmetPrerequisites: UnmetPrerequisite[];
  warnings: string[];
}

export interface UnmetPrerequisite {
  prerequisiteOperationId: string;
  prerequisiteOperationName: string;
  dependencyType: DependencyType;
  reason: string;
}

export interface StatusValidation {
  valid: boolean;
  currentStatus: WorkOrderStatus;
  requiredStatuses: WorkOrderStatus[];
  reason?: string;
}

export interface OperationStartValidation {
  canStart: boolean;
  reason?: string;
  warningsCount: number;
  warnings: string[];
}

export interface OperationCompleteValidation {
  canComplete: boolean;
  reason?: string;
  warningsCount: number;
  warnings: string[];
}

/**
 * WorkflowEnforcementService
 * Centralized validation logic for workflow rules
 */
export class WorkflowEnforcementService {
  constructor(
    private configService: WorkflowConfigurationService,
    private prisma: PrismaClient
  ) {}

  /**
   * Check if work performance can be recorded for a work order
   * Enforces status gating based on configuration
   */
  async canRecordPerformance(workOrderId: string): Promise<EnforcementDecision> {
    try {
      // Validate work order ID
      if (!workOrderId || workOrderId.trim() === '') {
        return {
          allowed: false,
          reason: 'Work order ID is required',
          warnings: [],
          configMode: 'STRICT',
          bypassesApplied: [],
          appliedAt: new Date()
        };
      }

      // Get work order
      const workOrder = await this.prisma.workOrder.findUnique({
        where: { id: workOrderId }
      });

      if (!workOrder) {
        return {
          allowed: false,
          reason: `Work order ${workOrderId} not found`,
          warnings: [],
          configMode: 'STRICT',
          bypassesApplied: [],
          appliedAt: new Date()
        };
      }

      // Get effective configuration
      const config = await this.configService.getEffectiveConfiguration(workOrderId);

      // Check status gating enforcement
      const bypassesApplied: string[] = [];
      const warnings: string[] = [];

      if (config.enforceStatusGating) {
        // STRICT mode: enforce status requirement
        const allowedStatuses: WorkOrderStatus[] = ['IN_PROGRESS', 'COMPLETED'];
        if (!allowedStatuses.includes(workOrder.status as WorkOrderStatus)) {
          return {
            allowed: false,
            reason: `Work order status is ${workOrder.status}. Must be IN_PROGRESS or COMPLETED for data collection.`,
            warnings: [],
            configMode: config.mode,
            bypassesApplied: [],
            appliedAt: new Date()
          };
        }
      } else {
        // FLEXIBLE/HYBRID mode: allow but warn
        const allowedStatuses: WorkOrderStatus[] = ['IN_PROGRESS', 'COMPLETED'];
        if (!allowedStatuses.includes(workOrder.status as WorkOrderStatus)) {
          bypassesApplied.push('status_gating');
          warnings.push(
            `Data collection allowed for ${workOrder.status} work order due to ${config.mode} mode configuration.`
          );
        }
      }

      return {
        allowed: true,
        warnings,
        configMode: config.mode,
        bypassesApplied,
        appliedAt: new Date()
      };
    } catch (error) {
      throw new Error(
        `Failed to check if performance can be recorded: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if an operation can be started
   */
  async canStartOperation(workOrderId: string, operationId: string): Promise<EnforcementDecision> {
    try {
      // Validate inputs
      if (!workOrderId || !operationId) {
        return {
          allowed: false,
          reason: 'Work order ID and operation ID are required',
          warnings: [],
          configMode: 'STRICT',
          bypassesApplied: [],
          appliedAt: new Date()
        };
      }

      // Get operation
      const operation = await this.prisma.workOrderOperation.findUnique({
        where: { id: operationId },
        include: {
          workOrder: true
        }
      });

      if (!operation) {
        return {
          allowed: false,
          reason: `Operation ${operationId} not found`,
          warnings: [],
          configMode: 'STRICT',
          bypassesApplied: [],
          appliedAt: new Date()
        };
      }

      // Verify operation belongs to work order
      if (operation.workOrderId !== workOrderId) {
        return {
          allowed: false,
          reason: `Operation ${operationId} does not belong to work order ${workOrderId}`,
          warnings: [],
          configMode: 'STRICT',
          bypassesApplied: [],
          appliedAt: new Date()
        };
      }

      // Get configuration
      const config = await this.configService.getEffectiveConfiguration(workOrderId);

      // Check if operation is already started
      if (operation.status === 'IN_PROGRESS') {
        return {
          allowed: false,
          reason: `Operation ${operationId} is already in progress`,
          warnings: [],
          configMode: config.mode,
          bypassesApplied: [],
          appliedAt: new Date()
        };
      }

      // Check if operation is completed
      if (operation.status === 'COMPLETED') {
        return {
          allowed: false,
          reason: `Operation ${operationId} is already completed`,
          warnings: [],
          configMode: config.mode,
          bypassesApplied: [],
          appliedAt: new Date()
        };
      }

      return {
        allowed: true,
        warnings: [],
        configMode: config.mode,
        bypassesApplied: [],
        appliedAt: new Date()
      };
    } catch (error) {
      throw new Error(
        `Failed to check if operation can be started: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if an operation can be completed
   */
  async canCompleteOperation(workOrderId: string, operationId: string): Promise<EnforcementDecision> {
    try {
      // Validate inputs
      if (!workOrderId || !operationId) {
        return {
          allowed: false,
          reason: 'Work order ID and operation ID are required',
          warnings: [],
          configMode: 'STRICT',
          bypassesApplied: [],
          appliedAt: new Date()
        };
      }

      // Get operation
      const operation = await this.prisma.workOrderOperation.findUnique({
        where: { id: operationId },
        include: { workOrder: true }
      });

      if (!operation) {
        return {
          allowed: false,
          reason: `Operation ${operationId} not found`,
          warnings: [],
          configMode: 'STRICT',
          bypassesApplied: [],
          appliedAt: new Date()
        };
      }

      // Verify operation belongs to work order
      if (operation.workOrderId !== workOrderId) {
        return {
          allowed: false,
          reason: `Operation ${operationId} does not belong to work order ${workOrderId}`,
          warnings: [],
          configMode: 'STRICT',
          bypassesApplied: [],
          appliedAt: new Date()
        };
      }

      // Get configuration
      const config = await this.configService.getEffectiveConfiguration(workOrderId);

      // Check if operation is already completed
      if (operation.status === 'COMPLETED') {
        return {
          allowed: false,
          reason: `Operation ${operationId} is already completed`,
          warnings: [],
          configMode: config.mode,
          bypassesApplied: [],
          appliedAt: new Date()
        };
      }

      // Must be in progress to complete
      if (operation.status !== 'IN_PROGRESS') {
        return {
          allowed: false,
          reason: `Operation must be IN_PROGRESS to be completed. Current status: ${operation.status}`,
          warnings: [],
          configMode: config.mode,
          bypassesApplied: [],
          appliedAt: new Date()
        };
      }

      return {
        allowed: true,
        warnings: [],
        configMode: config.mode,
        bypassesApplied: [],
        appliedAt: new Date()
      };
    } catch (error) {
      throw new Error(
        `Failed to check if operation can be completed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate operation prerequisites using RoutingStepDependency models
   * Note: Simplified version - full prerequisite traversal implemented in Phase 5 testing
   */
  async validatePrerequisites(
    workOrderId: string,
    operationId: string,
    enforceMode: 'STRICT' | 'FLEXIBLE' = 'STRICT'
  ): Promise<PrerequisiteValidation> {
    try {
      // Get operation
      const operation = await this.prisma.workOrderOperation.findUnique({
        where: { id: operationId }
      });

      if (!operation) {
        return {
          valid: false,
          unmetPrerequisites: [],
          warnings: []
        };
      }

      // In FLEXIBLE mode, always allow (prerequisites are optional)
      if (enforceMode === 'FLEXIBLE') {
        return {
          valid: true,
          unmetPrerequisites: [],
          warnings: []
        };
      }

      // In STRICT mode, check if there are any operations in the work order that need to be completed first
      // This is a simplified check - full dependency graph traversal would be implemented in Phase 5
      const allOperations = await this.prisma.workOrderOperation.findMany({
        where: { workOrderId }
      });

      // Get the index of current operation
      const currentIndex = allOperations.findIndex(op => op.id === operationId);

      // In STRICT mode, require all preceding operations to be COMPLETED
      const unmetPrerequisites: UnmetPrerequisite[] = [];

      for (let i = 0; i < currentIndex; i++) {
        const precedingOp = allOperations[i];
        if (precedingOp.status !== 'COMPLETED') {
          unmetPrerequisites.push({
            prerequisiteOperationId: precedingOp.id,
            prerequisiteOperationName: `Operation ${i + 1}`,
            dependencyType: 'SEQUENTIAL',
            reason: `Status is ${precedingOp.status}, must be COMPLETED before this operation can start`
          });
        }
      }

      return {
        valid: unmetPrerequisites.length === 0,
        unmetPrerequisites,
        warnings: unmetPrerequisites.length > 0 ? [] : []
      };
    } catch (error) {
      throw new Error(
        `Failed to validate prerequisites: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check work order status against required statuses
   */
  async validateWorkOrderStatus(
    workOrderId: string,
    requiredStatuses: WorkOrderStatus[]
  ): Promise<StatusValidation> {
    try {
      const workOrder = await this.prisma.workOrder.findUnique({
        where: { id: workOrderId }
      });

      if (!workOrder) {
        return {
          valid: false,
          currentStatus: 'CREATED',
          requiredStatuses,
          reason: `Work order ${workOrderId} not found`
        };
      }

      const currentStatus = workOrder.status as WorkOrderStatus;
      const valid = requiredStatuses.includes(currentStatus);

      return {
        valid,
        currentStatus,
        requiredStatuses,
        reason: valid ? undefined : `Work order status is ${currentStatus}. Required: ${requiredStatuses.join(' or ')}`
      };
    } catch (error) {
      throw new Error(
        `Failed to validate work order status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get workflow configuration for enforcement decisions
   * This is a passthrough to the configuration service
   */
  async getEffectiveConfiguration(workOrderId: string) {
    return this.configService.getEffectiveConfiguration(workOrderId);
  }
}

export default WorkflowEnforcementService;
