/**
 * Workflow Enforcement Service (Issue #41)
 * Enforces site-level workflow configuration rules for data collection and operation execution
 * Supports STRICT, FLEXIBLE, and HYBRID enforcement modes
 */

import { prisma } from '../db/client';
import { Logger } from '../utils/logger';
import { WorkflowConfigurationService, EffectiveWorkflowConfiguration } from './WorkflowConfigurationService';

const logger = Logger.getInstance();

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface EnforcementDecision {
  allowed: boolean;
  reason?: string;
  warnings: string[];
  configMode: string;
  bypassesApplied: string[];
  enforcementChecks: EnforcementCheck[];
}

export interface EnforcementCheck {
  name: string;
  enforced: boolean;
  passed: boolean;
  reason?: string;
}

export interface PrerequisiteValidation {
  valid: boolean;
  unmetPrerequisites: UnmetPrerequisite[];
  warnings: string[];
  enforcementMode: 'STRICT' | 'FLEXIBLE';
}

export interface UnmetPrerequisite {
  prerequisiteOperationId: string;
  prerequisiteOperationName: string;
  prerequisiteOperationSeq: number;
  currentOperationSeq: number;
  dependencyType: string;
  reason: string;
}

export interface StatusValidation {
  valid: boolean;
  currentStatus: string;
  requiredStatuses: string[];
  reason?: string;
}

// ============================================================================
// Workflow Enforcement Service
// ============================================================================

export class WorkflowEnforcementService {
  private configService: WorkflowConfigurationService;

  constructor(configService?: WorkflowConfigurationService) {
    this.configService = configService || new WorkflowConfigurationService();
  }

  /**
   * Check if work performance can be recorded for a work order
   */
  async canRecordPerformance(workOrderId: string): Promise<EnforcementDecision> {
    try {
      // Get configuration
      const config = await this.configService.getEffectiveConfiguration(workOrderId);
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
      });

      if (!workOrder) {
        return {
          allowed: false,
          reason: `Work order ${workOrderId} not found`,
          warnings: [],
          configMode: config.mode,
          bypassesApplied: [],
          enforcementChecks: [],
        };
      }

      const checks: EnforcementCheck[] = [];
      const bypassesApplied: string[] = [];
      const warnings: string[] = [];

      // ======================================================================
      // Check 1: Status Gating (Required Status)
      // ======================================================================
      const statusCheck = this.validateWorkOrderStatus(
        workOrder.status,
        ['IN_PROGRESS', 'COMPLETED'],
        !config.enforceStatusGating // bypass allowed if enforcement disabled
      );

      checks.push({
        name: 'Status Gating',
        enforced: config.enforceStatusGating,
        passed: statusCheck.valid,
        reason: statusCheck.reason,
      });

      if (!statusCheck.valid && config.enforceStatusGating) {
        return {
          allowed: false,
          reason: statusCheck.reason,
          warnings: [],
          configMode: config.mode,
          bypassesApplied: [],
          enforcementChecks: checks,
        };
      }

      if (!statusCheck.valid && !config.enforceStatusGating) {
        bypassesApplied.push('status_gating');
        warnings.push(
          `Data collection allowed for ${workOrder.status} work order due to FLEXIBLE enforcement mode.`
        );
      }

      // ======================================================================
      // Check 2: Quality Check Requirements
      // ======================================================================
      if (config.enforceQualityChecks) {
        const qualityCheckPassed = await this.validateQualityChecks(workOrderId);
        checks.push({
          name: 'Quality Checks',
          enforced: true,
          passed: qualityCheckPassed,
          reason: qualityCheckPassed ? undefined : 'Quality checks incomplete',
        });

        if (!qualityCheckPassed) {
          return {
            allowed: false,
            reason: 'Quality checks must be completed before data collection in STRICT mode',
            warnings: [],
            configMode: config.mode,
            bypassesApplied: [],
            enforcementChecks: checks,
          };
        }
      } else {
        checks.push({
          name: 'Quality Checks',
          enforced: false,
          passed: true,
        });
      }

      // ======================================================================
      // All checks passed
      // ======================================================================
      return {
        allowed: true,
        warnings,
        configMode: config.mode,
        bypassesApplied,
        enforcementChecks: checks,
      };
    } catch (error) {
      logger.error('Error checking performance recording permission', error);
      throw error;
    }
  }

  /**
   * Check if an operation can be started
   */
  async canStartOperation(
    workOrderId: string,
    operationId: string
  ): Promise<EnforcementDecision> {
    try {
      const config = await this.configService.getEffectiveConfiguration(workOrderId);
      const operation = await prisma.workOrderOperation.findUnique({
        where: { id: operationId },
        include: {
          workOrder: true,
        },
      });

      if (!operation) {
        return {
          allowed: false,
          reason: `Operation ${operationId} not found`,
          warnings: [],
          configMode: config.mode,
          bypassesApplied: [],
          enforcementChecks: [],
        };
      }

      const checks: EnforcementCheck[] = [];
      const bypassesApplied: string[] = [];
      const warnings: string[] = [];

      // ======================================================================
      // Check 1: Operation Status
      // ======================================================================
      const statusCheck = this.validateOperationStatus(operation.status, 'CREATED');
      checks.push({
        name: 'Operation Status',
        enforced: true,
        passed: statusCheck.valid,
        reason: statusCheck.reason,
      });

      if (!statusCheck.valid) {
        return {
          allowed: false,
          reason: statusCheck.reason,
          warnings: [],
          configMode: config.mode,
          bypassesApplied: [],
          enforcementChecks: checks,
        };
      }

      // ======================================================================
      // Check 2: Prerequisites (if enforced)
      // ======================================================================
      const enforceSequence = config.enforceOperationSequence;
      const prereqValidation = await this.validatePrerequisites(
        workOrderId,
        operationId,
        enforceSequence ? 'STRICT' : 'FLEXIBLE'
      );

      checks.push({
        name: 'Prerequisites',
        enforced: enforceSequence,
        passed: prereqValidation.valid,
        reason: prereqValidation.unmetPrerequisites.length > 0
          ? `${prereqValidation.unmetPrerequisites.length} unmet prerequisites`
          : undefined,
      });

      if (!prereqValidation.valid && enforceSequence) {
        return {
          allowed: false,
          reason: `Cannot start operation. Unmet prerequisites:\n${prereqValidation.unmetPrerequisites
            .map((p) => `- ${p.prerequisiteOperationName} (seq ${p.prerequisiteOperationSeq}): ${p.reason}`)
            .join('\n')}`,
          warnings: [],
          configMode: config.mode,
          bypassesApplied: [],
          enforcementChecks: checks,
        };
      }

      if (!prereqValidation.valid && !enforceSequence) {
        bypassesApplied.push('operation_sequence');
        warnings.push(
          `${prereqValidation.unmetPrerequisites.length} prerequisite(s) not met, but allowed in FLEXIBLE mode`
        );
        warnings.push(...prereqValidation.warnings);
      }

      // ======================================================================
      // All checks passed
      // ======================================================================
      return {
        allowed: true,
        warnings,
        configMode: config.mode,
        bypassesApplied,
        enforcementChecks: checks,
      };
    } catch (error) {
      logger.error('Error checking operation start permission', error);
      throw error;
    }
  }

  /**
   * Check if an operation can be completed
   */
  async canCompleteOperation(
    workOrderId: string,
    operationId: string
  ): Promise<EnforcementDecision> {
    try {
      const config = await this.configService.getEffectiveConfiguration(workOrderId);
      const operation = await prisma.workOrderOperation.findUnique({
        where: { id: operationId },
      });

      if (!operation) {
        return {
          allowed: false,
          reason: `Operation ${operationId} not found`,
          warnings: [],
          configMode: config.mode,
          bypassesApplied: [],
          enforcementChecks: [],
        };
      }

      const checks: EnforcementCheck[] = [];
      const bypassesApplied: string[] = [];
      const warnings: string[] = [];

      // ======================================================================
      // Check 1: Operation Status (must be IN_PROGRESS)
      // ======================================================================
      const statusCheck = this.validateOperationStatus(operation.status, 'IN_PROGRESS');
      checks.push({
        name: 'Operation Status',
        enforced: true,
        passed: statusCheck.valid,
        reason: statusCheck.reason,
      });

      if (!statusCheck.valid) {
        return {
          allowed: false,
          reason: statusCheck.reason,
          warnings: [],
          configMode: config.mode,
          bypassesApplied: [],
          enforcementChecks: checks,
        };
      }

      // ======================================================================
      // Check 2: Required Data Collection (if quality checks enforced)
      // ======================================================================
      if (config.enforceQualityChecks) {
        const hasPerformanceData = await this.hasPerformanceData(operationId);
        checks.push({
          name: 'Performance Data Collected',
          enforced: true,
          passed: hasPerformanceData,
          reason: hasPerformanceData ? undefined : 'No performance data collected',
        });

        if (!hasPerformanceData) {
          return {
            allowed: false,
            reason: 'Performance data must be collected before completing operation',
            warnings: [],
            configMode: config.mode,
            bypassesApplied: [],
            enforcementChecks: checks,
          };
        }
      } else {
        checks.push({
          name: 'Performance Data Collected',
          enforced: false,
          passed: true,
        });
      }

      // ======================================================================
      // All checks passed
      // ======================================================================
      return {
        allowed: true,
        warnings,
        configMode: config.mode,
        bypassesApplied,
        enforcementChecks: checks,
      };
    } catch (error) {
      logger.error('Error checking operation completion permission', error);
      throw error;
    }
  }

  /**
   * Validate operation prerequisites using RoutingStepDependency models
   */
  async validatePrerequisites(
    workOrderId: string,
    operationId: string,
    enforceMode: 'STRICT' | 'FLEXIBLE'
  ): Promise<PrerequisiteValidation> {
    try {
      // Get the operation and its routing step
      const operation = await prisma.workOrderOperation.findUnique({
        where: { id: operationId },
        include: {
          routingOperation: {
            include: {
              routingStep: {
                include: {
                  dependencies: {
                    include: {
                      prerequisiteStep: {
                        include: {
                          operation: true,
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

      if (!operation) {
        return {
          valid: false,
          unmetPrerequisites: [],
          warnings: [],
          enforcementMode: enforceMode,
        };
      }

      const unmetPrerequisites: UnmetPrerequisite[] = [];
      const warnings: string[] = [];

      // Check each dependency
      const dependencies = operation.routingOperation?.routingStep?.dependencies || [];

      for (const dep of dependencies) {
        // Find the prerequisite operation in this work order
        const prereqOp = await prisma.workOrderOperation.findFirst({
          where: {
            workOrderId,
            routingOperationId: dep.prerequisiteStep.operation.id,
          },
        });

        // Check if prerequisite is met (completed)
        if (!prereqOp || prereqOp.status !== 'COMPLETED') {
          unmetPrerequisites.push({
            prerequisiteOperationId: prereqOp?.id || 'unknown',
            prerequisiteOperationName: dep.prerequisiteStep.operation.operationName,
            prerequisiteOperationSeq: dep.prerequisiteStep.operation.sequenceNumber,
            currentOperationSeq: operation.routingOperation.routingStep.operation.sequenceNumber,
            dependencyType: dep.dependencyType || 'SEQUENTIAL',
            reason: prereqOp ? `Status is ${prereqOp.status}, must be COMPLETED` : 'Operation not found in work order',
          });
        }
      }

      // Determine validity
      if (enforceMode === 'STRICT') {
        return {
          valid: unmetPrerequisites.length === 0,
          unmetPrerequisites,
          warnings: [],
          enforcementMode: enforceMode,
        };
      } else {
        // FLEXIBLE mode: warn but allow
        if (unmetPrerequisites.length > 0) {
          warnings.push(
            `${unmetPrerequisites.length} prerequisite(s) not met, but allowed in FLEXIBLE mode`
          );
        }
        return {
          valid: true,
          unmetPrerequisites,
          warnings,
          enforcementMode: enforceMode,
        };
      }
    } catch (error) {
      logger.error('Error validating prerequisites', error);
      throw error;
    }
  }

  /**
   * Validate work order status
   */
  private validateWorkOrderStatus(
    currentStatus: string,
    requiredStatuses: string[],
    bypassAllowed: boolean
  ): StatusValidation {
    const valid = requiredStatuses.includes(currentStatus);

    if (!valid && !bypassAllowed) {
      return {
        valid: false,
        currentStatus,
        requiredStatuses,
        reason: `Work order status is ${currentStatus}. Required: ${requiredStatuses.join(' or ')}`,
      };
    }

    return {
      valid: true,
      currentStatus,
      requiredStatuses,
    };
  }

  /**
   * Validate operation status
   */
  private validateOperationStatus(currentStatus: string, requiredStatus: string): StatusValidation {
    const valid = currentStatus === requiredStatus;

    if (!valid) {
      return {
        valid: false,
        currentStatus,
        requiredStatuses: [requiredStatus],
        reason: `Operation status is ${currentStatus}. Required: ${requiredStatus}`,
      };
    }

    return {
      valid: true,
      currentStatus,
      requiredStatuses: [requiredStatus],
    };
  }

  /**
   * Check if quality checks are complete for work order
   */
  private async validateQualityChecks(workOrderId: string): Promise<boolean> {
    try {
      // Check if all required quality checks have been completed
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: {
          qualityCheckResults: true,
        },
      });

      if (!workOrder || !workOrder.qualityCheckResults || workOrder.qualityCheckResults.length === 0) {
        return false;
      }

      // Check if any quality check results are FAILED
      const hasFailed = workOrder.qualityCheckResults.some((r: any) => r.status === 'FAILED');
      return !hasFailed;
    } catch (error) {
      logger.warn('Error validating quality checks', error);
      return false;
    }
  }

  /**
   * Check if operation has performance data recorded
   */
  private async hasPerformanceData(operationId: string): Promise<boolean> {
    try {
      const performanceData = await prisma.workPerformance.findFirst({
        where: {
          workOrderOperationId: operationId,
        },
      });

      return !!performanceData;
    } catch (error) {
      logger.warn('Error checking performance data', error);
      return false;
    }
  }

  /**
   * Record enforcement bypass in audit log
   */
  async recordEnforcementBypass(
    workOrderId: string,
    operationId: string | undefined,
    action: string,
    enforcement: EnforcementDecision,
    userId?: string
  ): Promise<void> {
    try {
      await prisma.workflowEnforcementAudit.create({
        data: {
          workOrderId,
          operationId,
          action,
          enforcementMode: enforcement.configMode,
          bypassesApplied: enforcement.bypassesApplied,
          warnings: enforcement.warnings,
          userId,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error recording enforcement bypass', error);
      // Don't throw, just log the error
    }
  }

  /**
   * Get enforcement audit trail for work order
   */
  async getAuditTrail(workOrderId: string): Promise<any[]> {
    try {
      return await prisma.workflowEnforcementAudit.findMany({
        where: { workOrderId },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });
    } catch (error) {
      logger.error('Error fetching audit trail', error);
      return [];
    }
  }
}
