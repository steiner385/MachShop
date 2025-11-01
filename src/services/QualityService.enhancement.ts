/**
 * Quality Service Enhancement - NCR Workflow Integration
 *
 * This file provides additional methods for QualityService to integrate
 * with the new NCR workflow system (Issue #55).
 *
 * This enhancement can be merged into QualityService.ts or used as
 * a composition pattern to extend the service.
 *
 * Methods added:
 * - NCR state transition with validation
 * - NCR disposition management with workflow
 * - Approval routing for NCR actions
 * - Workflow configuration retrieval
 * - State history and audit trail
 */

import { PrismaClient, NCRStatus, NCRSeverity, NCRDisposition } from '@prisma/client';
import { ncrStateTransitionService } from './NCRStateTransitionService';
import { ncrApprovalService } from './NCRApprovalService';
import { ncrWorkflowConfigService } from './NCRWorkflowConfigService';
import { emailNotificationService } from './EmailNotificationService';
import { logger } from '../utils/logger';

/**
 * Enhancement methods to add to QualityService
 */
export class NCRWorkflowEnhancement {
  constructor(private prisma: PrismaClient) {}

  /**
   * Transition NCR to new state with workflow validation
   *
   * @param ncrId - NCR ID
   * @param toState - Target state
   * @param userId - User initiating transition
   * @param reason - Reason for transition
   * @returns Transition result with approval details
   */
  async transitionNCRState(
    ncrId: string,
    toState: NCRStatus,
    userId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    message: string;
    approvalRequired: boolean;
    approvalRequestId?: string;
    errors?: string[];
  }> {
    try {
      // Get current NCR state
      const ncr = await this.prisma.nCR.findUnique({
        where: { id: ncrId },
      });

      if (!ncr) {
        return {
          success: false,
          message: 'NCR not found',
          approvalRequired: false,
          errors: ['NCR not found'],
        };
      }

      // Execute transition using state transition service
      const result = await ncrStateTransitionService.executeTransition({
        ncrId,
        fromState: ncr.status as NCRStatus,
        toState,
        userId,
        reason,
      });

      if (!result.success) {
        return result;
      }

      // Send notification if state changed
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });

        await emailNotificationService.sendStateTransitionEmail(
          ncr.ncrNumber,
          ncr.reportedBy, // Send to NCR reporter
          ncr.status.toString(),
          toState,
          user?.name || userId,
          reason
        );
      } catch (error) {
        logger.warn('Failed to send state transition email', { error });
      }

      return result;
    } catch (error) {
      logger.error('Error transitioning NCR state', { error });
      return {
        success: false,
        message: 'Failed to transition NCR state',
        approvalRequired: false,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Set NCR disposition with workflow approval
   *
   * @param ncrId - NCR ID
   * @param disposition - Disposition type
   * @param userId - User setting disposition
   * @param reason - Reason for disposition
   * @returns Disposition result with approval details
   */
  async setNCRDispositionWithWorkflow(
    ncrId: string,
    disposition: NCRDisposition,
    userId: string,
    reason: string,
    correctiveAction?: string
  ): Promise<{
    success: boolean;
    message: string;
    approvalRequired: boolean;
    approvalRequestId?: string;
    errors?: string[];
  }> {
    try {
      // Validate disposition is allowed
      const ncr = await this.prisma.nCR.findUnique({
        where: { id: ncrId },
      });

      if (!ncr) {
        return {
          success: false,
          message: 'NCR not found',
          approvalRequired: false,
          errors: ['NCR not found'],
        };
      }

      // Get configuration for this NCR's site and severity
      const config = await ncrWorkflowConfigService.getConfiguration(
        ncr.siteId,
        ncr.severity as NCRSeverity
      );

      // Check if disposition is allowed
      if (!config.allowedDispositions.includes(disposition)) {
        return {
          success: false,
          message: `Disposition ${disposition} not allowed for this site/severity`,
          approvalRequired: false,
          errors: [
            `Allowed dispositions: ${config.allowedDispositions.join(', ')}`,
          ],
        };
      }

      // Update NCR with disposition
      const updated = await this.prisma.nCR.update({
        where: { id: ncrId },
        data: {
          disposition,
          dispositionReason: reason,
          correctiveAction: correctiveAction,
        },
      });

      // Check if disposition requires approval
      const dispositionRules = config.dispositionApprovalRules?.[disposition];
      const requiresApproval =
        dispositionRules?.requiresApproval === true ||
        (disposition === 'SCRAP' || disposition === 'USE_AS_IS');

      if (requiresApproval) {
        // Create approval request
        const approval = await ncrApprovalService.createApprovalRequest(
          ncrId,
          'DISPOSITION',
          userId,
          userId, // In real system, would determine based on role
          `Disposition approval for ${disposition}: ${reason}`
        );

        // Send notification
        try {
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
          });

          await emailNotificationService.sendApprovalRequestEmail(
            approval.id,
            ncr.reportedBy,
            ncr.ncrNumber,
            'DISPOSITION',
            user?.name || userId,
            approval.dueDate,
            `Disposition: ${disposition}\nReason: ${reason}`
          );
        } catch (error) {
          logger.warn('Failed to send approval notification', { error });
        }

        return {
          success: true,
          message: `Disposition set, approval required`,
          approvalRequired: true,
          approvalRequestId: approval.id,
        };
      }

      return {
        success: true,
        message: `Disposition set to ${disposition}`,
        approvalRequired: false,
      };
    } catch (error) {
      logger.error('Error setting NCR disposition', { error });
      return {
        success: false,
        message: 'Failed to set NCR disposition',
        approvalRequired: false,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Get available transitions for NCR
   *
   * @param ncrId - NCR ID
   * @returns Available transitions with requirements
   */
  async getAvailableTransitions(ncrId: string) {
    try {
      const ncr = await this.prisma.nCR.findUnique({
        where: { id: ncrId },
      });

      if (!ncr) {
        throw new Error('NCR not found');
      }

      return ncrStateTransitionService.getAvailableTransitions(ncr.status as NCRStatus);
    } catch (error) {
      logger.error('Error getting available transitions', { error });
      throw error;
    }
  }

  /**
   * Get NCR workflow configuration
   *
   * @param ncrId - NCR ID
   * @returns Workflow configuration for NCR
   */
  async getNCRWorkflowConfig(ncrId: string) {
    try {
      const ncr = await this.prisma.nCR.findUnique({
        where: { id: ncrId },
      });

      if (!ncr) {
        throw new Error('NCR not found');
      }

      return ncrWorkflowConfigService.getConfiguration(
        ncr.siteId,
        ncr.severity as NCRSeverity
      );
    } catch (error) {
      logger.error('Error getting workflow configuration', { error });
      throw error;
    }
  }

  /**
   * Get NCR state history
   *
   * @param ncrId - NCR ID
   * @returns State change history
   */
  async getNCRStateHistory(ncrId: string) {
    try {
      const history = await this.prisma.nCRStateHistory.findMany({
        where: { ncrId },
        orderBy: { approvedAt: 'desc' },
        include: {
          changedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return history;
    } catch (error) {
      logger.error('Error getting NCR state history', { error });
      throw error;
    }
  }

  /**
   * Get NCR approval history
   *
   * @param ncrId - NCR ID
   * @returns Approval request history
   */
  async getNCRApprovalHistory(ncrId: string) {
    return ncrApprovalService.getApprovalHistory(ncrId);
  }

  /**
   * Close NCR with final approval
   *
   * @param ncrId - NCR ID
   * @param userId - User closing NCR
   * @param closureNotes - Closure notes
   * @returns Closure result
   */
  async closeNCRWithApproval(
    ncrId: string,
    userId: string,
    closureNotes: string
  ): Promise<{
    success: boolean;
    message: string;
    approvalRequired: boolean;
    approvalRequestId?: string;
  }> {
    try {
      const ncr = await this.prisma.nCR.findUnique({
        where: { id: ncrId },
      });

      if (!ncr) {
        return {
          success: false,
          message: 'NCR not found',
          approvalRequired: false,
        };
      }

      // Check if closure requires approval (usually does)
      const approval = await ncrApprovalService.createApprovalRequest(
        ncrId,
        'CLOSURE',
        userId,
        userId,
        `NCR Closure: ${closureNotes}`
      );

      return {
        success: true,
        message: 'Closure approval required',
        approvalRequired: true,
        approvalRequestId: approval.id,
      };
    } catch (error) {
      logger.error('Error closing NCR', { error });
      return {
        success: false,
        message: 'Failed to close NCR',
        approvalRequired: false,
      };
    }
  }

  /**
   * Escalate overdue NCR approvals
   *
   * @returns Count of escalated approvals
   */
  async escalateOverdueApprovals(): Promise<number> {
    return ncrApprovalService.escalateOverdueApprovals();
  }

  /**
   * Get NCR workflow statistics
   *
   * @param siteId - Optional site filter
   * @returns Workflow statistics
   */
  async getNCRWorkflowStats(siteId?: string) {
    try {
      const stats = {
        approvals: await ncrApprovalService.getApprovalStatistics(),
        ncrs: {
          total: await this.prisma.nCR.count({
            where: siteId ? { siteId } : {},
          }),
          bySeverity: await this.prisma.nCR.groupBy({
            by: ['severity'],
            where: siteId ? { siteId } : {},
            _count: true,
          }),
          byStatus: await this.prisma.nCR.groupBy({
            by: ['status'],
            where: siteId ? { siteId } : {},
            _count: true,
          }),
          byDisposition: await this.prisma.nCR.groupBy({
            by: ['disposition'],
            where: siteId ? { siteId } : {},
            _count: true,
          }),
        },
      };

      return stats;
    } catch (error) {
      logger.error('Error getting workflow statistics', { error });
      throw error;
    }
  }

  /**
   * Validate NCR can transition to state
   *
   * @param ncrId - NCR ID
   * @param toState - Target state
   * @returns Validation result with required fields
   */
  async validateTransition(ncrId: string, toState: NCRStatus) {
    try {
      const ncr = await this.prisma.nCR.findUnique({
        where: { id: ncrId },
      });

      if (!ncr) {
        return {
          valid: false,
          errors: ['NCR not found'],
        };
      }

      const transitionConfig = ncrStateTransitionService.getTransitionConfig(
        ncr.status as NCRStatus,
        toState
      );

      if (!transitionConfig) {
        return {
          valid: false,
          errors: ['Transition not allowed'],
        };
      }

      // Check required fields
      const missingFields = transitionConfig.requiredFields?.filter((field) => {
        const value = (ncr as any)[field];
        return value === null || value === undefined || value === '';
      }) || [];

      return {
        valid: missingFields.length === 0,
        transitionConfig,
        missingFields,
        requiresApproval: transitionConfig.requiresApproval,
      };
    } catch (error) {
      logger.error('Error validating transition', { error });
      throw error;
    }
  }
}

/**
 * Example of how to integrate this into QualityService:
 *
 * export class QualityService {
 *   private workflowEnhancement: NCRWorkflowEnhancement;
 *
 *   constructor(private prisma?: PrismaClient) {
 *     this.prisma = prisma || new PrismaClient();
 *     this.workflowEnhancement = new NCRWorkflowEnhancement(this.prisma);
 *   }
 *
 *   // Delegate NCR workflow methods to enhancement
 *   async transitionNCRState(...args: Parameters<NCRWorkflowEnhancement['transitionNCRState']>) {
 *     return this.workflowEnhancement.transitionNCRState(...args);
 *   }
 *
 *   async setNCRDispositionWithWorkflow(...args: Parameters<NCRWorkflowEnhancement['setNCRDispositionWithWorkflow']>) {
 *     return this.workflowEnhancement.setNCRDispositionWithWorkflow(...args);
 *   }
 *
 *   // ... other workflow methods
 * }
 */
