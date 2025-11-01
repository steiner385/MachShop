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
   */
  async validatePrerequisites(
    workOrderId: string,
    operationId: string,
    enforceMode: 'STRICT' | 'FLEXIBLE' = 'STRICT'
  ): Promise<PrerequisiteValidation> {
    try {
      // Get operation with routing details
      const operation = await this.prisma.workOrderOperation.findUnique({
        where: { id: operationId },
        include: {
          routingOperation: {
            include: {
              routingStep: {
                include: {
                  dependentOn: {
                    include: {
                      prerequisiteStep: {
                        include: {
                          operation: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!operation) {
        return {
          valid: false,
          unmetPrerequisites: [],
          warnings: []
        };
      }

      if (!operation.routingOperation) {
        return {
          valid: true,
          unmetPrerequisites: [],
          warnings: []
        };
      }

      // Get dependencies
      const dependencies = operation.routingOperation.routingStep.dependentOn || [];

      if (dependencies.length === 0) {
        return {
          valid: true,
          unmetPrerequisites: [],
          warnings: []
        };
      }

      // Check which dependencies are not met
      const unmetPrerequisites: UnmetPrerequisite[] = [];

      for (const dep of dependencies) {
        // Find corresponding work order operation for prerequisite
        const prerequisiteOp = await this.prisma.workOrderOperation.findFirst({
          where: {
            workOrderId,
            routingOperationId: dep.prerequisiteStep.operationId
          }
        });

        if (!prerequisiteOp) {
          unmetPrerequisites.push({
            prerequisiteOperationId: 'unknown',
            prerequisiteOperationName: dep.prerequisiteStep.operation.operationName,
            dependencyType: (dep.dependencyType as unknown as DependencyType) || 'SEQUENTIAL',
            reason: 'Operation not found in work order'
          });
        } else if (prerequisiteOp.status !== 'COMPLETED') {
          unmetPrerequisites.push({
            prerequisiteOperationId: prerequisiteOp.id,
            prerequisiteOperationName: dep.prerequisiteStep.operation.operationName,
            dependencyType: (dep.dependencyType as unknown as DependencyType) || 'SEQUENTIAL',
            reason: `Status is ${prerequisiteOp.status}, must be COMPLETED`
          });
        }
      }

      // Determine validity based on mode
      if (enforceMode === 'STRICT') {
        return {
          valid: unmetPrerequisites.length === 0,
          unmetPrerequisites,
          warnings: []
        };
      } else {
        // FLEXIBLE: warn but allow
        const warnings =
          unmetPrerequisites.length > 0
            ? [`${unmetPrerequisites.length} prerequisite(s) not met but allowed in FLEXIBLE mode`]
            : [];

        return {
          valid: true,
          unmetPrerequisites,
          warnings
        };
      }
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
