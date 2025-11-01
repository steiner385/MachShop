/**
 * NCR State Transition Service
 *
 * Manages NCR workflow state machine transitions with validation, approvals,
 * and business rule enforcement for Enhanced NCR Workflow States (Issue #55).
 *
 * @module services/NCRStateTransitionService
 * @see GitHub Issue #55: Enhanced NCR Workflow States & Disposition Management
 */

import { PrismaClient, NCRStatus, NCRSeverity } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * State transition configuration
 */
export interface StateTransitionConfig {
  from: NCRStatus;
  to: NCRStatus;
  requiredFields?: string[];
  requiresApproval?: boolean;
  requiredRole?: string;
  automaticApproval?: boolean;
  description: string;
}

/**
 * State transition request
 */
export interface StateTransitionRequest {
  ncrId: string;
  fromState: NCRStatus;
  toState: NCRStatus;
  userId: string;
  reason?: string;
  requiresApproval?: boolean;
  autoApprove?: boolean;
}

/**
 * State transition result
 */
export interface StateTransitionResult {
  success: boolean;
  ncrId: string;
  fromState: NCRStatus;
  toState: NCRStatus;
  message: string;
  approvalRequired?: boolean;
  approvalRequestId?: string;
  errors?: string[];
}

/**
 * NCR State Transition Service
 */
export class NCRStateTransitionService {
  /**
   * Default state transition rules for NCR workflow
   */
  private defaultTransitions: Map<string, StateTransitionConfig[]> = new Map([
    ['DRAFT', [
      {
        from: NCRStatus.DRAFT,
        to: NCRStatus.SUBMITTED,
        requiredFields: ['partNumber', 'defectType', 'description', 'severity'],
        requiresApproval: false,
        description: 'Submit NCR for review'
      }
    ]],
    ['SUBMITTED', [
      {
        from: NCRStatus.SUBMITTED,
        to: NCRStatus.UNDER_INVESTIGATION,
        requiredFields: [],
        requiresApproval: true,
        requiredRole: 'QUALITY_ENGINEER',
        description: 'Start root cause investigation'
      },
      {
        from: NCRStatus.SUBMITTED,
        to: NCRStatus.CANCELLED,
        requiredFields: ['description'],
        requiresApproval: false,
        description: 'Cancel NCR (incorrect submission)'
      }
    ]],
    ['UNDER_INVESTIGATION', [
      {
        from: NCRStatus.UNDER_INVESTIGATION,
        to: NCRStatus.CONTAINMENT,
        requiredFields: [],
        requiresApproval: true,
        requiredRole: 'QUALITY_MANAGER',
        description: 'Implement containment actions'
      },
      {
        from: NCRStatus.UNDER_INVESTIGATION,
        to: NCRStatus.PENDING_DISPOSITION,
        requiredFields: ['rootCauseId'],
        requiresApproval: false,
        description: 'Complete investigation, proceed to disposition'
      }
    ]],
    ['CONTAINMENT', [
      {
        from: NCRStatus.CONTAINMENT,
        to: NCRStatus.PENDING_DISPOSITION,
        requiredFields: [],
        requiresApproval: false,
        description: 'Containment complete, proceed to disposition'
      }
    ]],
    ['PENDING_DISPOSITION', [
      {
        from: NCRStatus.PENDING_DISPOSITION,
        to: NCRStatus.CTP,
        requiredFields: [],
        requiresApproval: true,
        requiredRole: 'QUALITY_ENGINEER',
        description: 'Authorize Continue to Process'
      },
      {
        from: NCRStatus.PENDING_DISPOSITION,
        to: NCRStatus.DDR,
        requiredFields: ['ddrExpectedDate'],
        requiresApproval: false,
        description: 'Delayed Disposition Required'
      },
      {
        from: NCRStatus.PENDING_DISPOSITION,
        to: NCRStatus.MRB,
        requiredFields: ['mrbMeetingDate'],
        requiresApproval: true,
        requiredRole: 'QUALITY_MANAGER',
        description: 'Schedule Material Review Board'
      },
      {
        from: NCRStatus.PENDING_DISPOSITION,
        to: NCRStatus.CORRECTIVE_ACTION,
        requiredFields: ['disposition', 'correctiveAction'],
        requiresApproval: true,
        requiredRole: 'QUALITY_ENGINEER',
        description: 'Approve disposition and CAPA'
      }
    ]],
    ['CTP', [
      {
        from: NCRStatus.CTP,
        to: NCRStatus.CORRECTIVE_ACTION,
        requiredFields: ['disposition'],
        requiresApproval: true,
        requiredRole: 'QUALITY_ENGINEER',
        description: 'CTP complete, proceed to CAPA'
      },
      {
        from: NCRStatus.CTP,
        to: NCRStatus.CLOSED,
        requiredFields: [],
        requiresApproval: true,
        requiredRole: 'QUALITY_MANAGER',
        description: 'Close NCR with CTP-only disposition'
      }
    ]],
    ['DDR', [
      {
        from: NCRStatus.DDR,
        to: NCRStatus.CORRECTIVE_ACTION,
        requiredFields: ['disposition', 'correctiveAction'],
        requiresApproval: true,
        requiredRole: 'QUALITY_ENGINEER',
        description: 'Disposition determined, proceed to CAPA'
      },
      {
        from: NCRStatus.DDR,
        to: NCRStatus.CLOSED,
        requiredFields: ['disposition'],
        requiresApproval: true,
        requiredRole: 'QUALITY_ENGINEER',
        description: 'Close NCR with DDR disposition'
      }
    ]],
    ['MRB', [
      {
        from: NCRStatus.MRB,
        to: NCRStatus.CORRECTIVE_ACTION,
        requiredFields: ['mrbDecision', 'disposition', 'correctiveAction'],
        requiresApproval: false,
        description: 'MRB decision made, proceed to CAPA'
      },
      {
        from: NCRStatus.MRB,
        to: NCRStatus.CLOSED,
        requiredFields: ['mrbDecision', 'disposition'],
        requiresApproval: false,
        description: 'MRB decision made, close NCR'
      }
    ]],
    ['CORRECTIVE_ACTION', [
      {
        from: NCRStatus.CORRECTIVE_ACTION,
        to: NCRStatus.VERIFICATION,
        requiredFields: [],
        requiresApproval: true,
        requiredRole: 'QUALITY_ENGINEER',
        description: 'CAPA complete, verify effectiveness'
      }
    ]],
    ['VERIFICATION', [
      {
        from: NCRStatus.VERIFICATION,
        to: NCRStatus.CLOSED,
        requiredFields: [],
        requiresApproval: true,
        requiredRole: 'QUALITY_MANAGER',
        description: 'Verification complete, close NCR'
      }
    ]]
  ]);

  /**
   * Validate and execute state transition
   *
   * @param request - State transition request
   * @returns State transition result
   */
  async executeTransition(request: StateTransitionRequest): Promise<StateTransitionResult> {
    try {
      // Get NCR
      const ncr = await prisma.nCR.findUnique({
        where: { id: request.ncrId },
      });

      if (!ncr) {
        return {
          success: false,
          ncrId: request.ncrId,
          fromState: request.fromState,
          toState: request.toState,
          message: 'NCR not found',
          errors: ['NCR not found'],
        };
      }

      // Verify current state matches request
      if (ncr.status !== request.fromState) {
        return {
          success: false,
          ncrId: request.ncrId,
          fromState: ncr.status,
          toState: request.toState,
          message: `Invalid state transition. Current state is ${ncr.status}, not ${request.fromState}`,
          errors: [`Current state ${ncr.status} does not match expected ${request.fromState}`],
        };
      }

      // Get transition config
      const transitionConfigs = this.defaultTransitions.get(ncr.status.toString());
      if (!transitionConfigs) {
        return {
          success: false,
          ncrId: request.ncrId,
          fromState: ncr.status,
          toState: request.toState,
          message: `No transitions configured for state ${ncr.status}`,
          errors: [`No transitions available from ${ncr.status}`],
        };
      }

      // Find matching transition
      const transitionConfig = transitionConfigs.find(t => t.to === request.toState);
      if (!transitionConfig) {
        return {
          success: false,
          ncrId: request.ncrId,
          fromState: ncr.status,
          toState: request.toState,
          message: `Invalid transition from ${ncr.status} to ${request.toState}`,
          errors: [`Transition from ${ncr.status} to ${request.toState} is not allowed`],
        };
      }

      // Validate required fields
      const validationErrors = this.validateRequiredFields(ncr, transitionConfig.requiredFields || []);
      if (validationErrors.length > 0) {
        return {
          success: false,
          ncrId: request.ncrId,
          fromState: ncr.status,
          toState: request.toState,
          message: 'Required fields missing for transition',
          errors: validationErrors,
        };
      }

      // Check if approval is required
      const approvalRequired = transitionConfig.requiresApproval && !request.autoApprove;

      if (approvalRequired) {
        // Create approval request
        const approvalRequest = await prisma.nCRApprovalRequest.create({
          data: {
            ncrId: request.ncrId,
            requestType: 'STATE_TRANSITION' as any,
            requestedBy: request.userId,
            approverUserId: request.userId, // In real system, would determine based on role
            status: 'PENDING' as any,
            approvalNotes: `Transition from ${ncr.status} to ${request.toState}: ${request.reason || transitionConfig.description}`,
          },
        });

        return {
          success: true,
          ncrId: request.ncrId,
          fromState: ncr.status,
          toState: request.toState,
          message: 'State transition requires approval',
          approvalRequired: true,
          approvalRequestId: approvalRequest.id,
        };
      }

      // Execute transition
      const updatedNCR = await prisma.nCR.update({
        where: { id: request.ncrId },
        data: {
          status: request.toState,
        },
      });

      // Record state history
      await prisma.nCRStateHistory.create({
        data: {
          ncrId: request.ncrId,
          fromState: ncr.status,
          toState: request.toState,
          changedBy: request.userId,
          changeReason: request.reason || transitionConfig.description,
          approvalRequired,
          approvedBy: request.userId,
          approvedAt: new Date(),
        },
      });

      logger.info('NCR state transition executed', {
        ncrId: request.ncrId,
        fromState: ncr.status,
        toState: request.toState,
        userId: request.userId,
      });

      return {
        success: true,
        ncrId: request.ncrId,
        fromState: ncr.status,
        toState: request.toState,
        message: `NCR transitioned from ${ncr.status} to ${request.toState}`,
      };
    } catch (error) {
      logger.error('Failed to execute state transition', { error });
      return {
        success: false,
        ncrId: request.ncrId,
        fromState: request.fromState,
        toState: request.toState,
        message: 'Failed to execute state transition',
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Validate required fields for state transition
   *
   * @param ncr - NCR record
   * @param requiredFields - List of required field names
   * @returns Array of validation errors
   */
  private validateRequiredFields(ncr: any, requiredFields: string[]): string[] {
    const errors: string[] = [];

    for (const field of requiredFields) {
      const value = (ncr as any)[field];
      if (value === null || value === undefined || value === '') {
        errors.push(`Required field missing: ${field}`);
      }
    }

    return errors;
  }

  /**
   * Get available transitions from current state
   *
   * @param currentState - Current NCR status
   * @returns Array of available transitions
   */
  getAvailableTransitions(currentState: NCRStatus): StateTransitionConfig[] {
    return this.defaultTransitions.get(currentState.toString()) || [];
  }

  /**
   * Check if transition is allowed
   *
   * @param fromState - Current state
   * @param toState - Target state
   * @returns true if transition is allowed
   */
  isTransitionAllowed(fromState: NCRStatus, toState: NCRStatus): boolean {
    const transitions = this.defaultTransitions.get(fromState.toString());
    if (!transitions) {
      return false;
    }
    return transitions.some(t => t.to === toState);
  }

  /**
   * Get state transition configuration
   *
   * @param fromState - Current state
   * @param toState - Target state
   * @returns Transition configuration or undefined
   */
  getTransitionConfig(fromState: NCRStatus, toState: NCRStatus): StateTransitionConfig | undefined {
    const transitions = this.defaultTransitions.get(fromState.toString());
    if (!transitions) {
      return undefined;
    }
    return transitions.find(t => t.to === toState);
  }
}

// Export singleton instance
export const ncrStateTransitionService = new NCRStateTransitionService();
