/**
 * ✅ GITHUB ISSUE #22: ECO Workflow Integration Service
 *
 * Integration service that connects ECO system with the existing workflow engine
 * for approval processes, CRB reviews, and implementation tracking.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { WorkflowEngineService } from './WorkflowEngineService';
import { ECOService } from './ECOService';
import { CRBService } from './CRBService';
import {
  ECOStatus,
  ECOPriority,
  WorkflowType,
  WorkflowStatus,
  ApprovalAction
} from '@prisma/client';
import {
  WorkflowInstanceInput,
  ApprovalActionInput
} from '../types/workflow';
import { ECOError } from '../types/eco';

export interface ECOWorkflowConfig {
  ecoApprovalWorkflowId: string;
  crbReviewWorkflowId: string;
  implementationWorkflowId: string;
  emergencyWorkflowId: string;
}

export class ECOWorkflowIntegration {
  private prisma: PrismaClient;
  private workflowEngine: WorkflowEngineService;
  private ecoService: ECOService;
  private crbService: CRBService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.workflowEngine = new WorkflowEngineService(prisma);
    this.ecoService = new ECOService(prisma);
    this.crbService = new CRBService(prisma);
  }

  // ============================================================================
  // ECO Approval Workflow Integration
  // ============================================================================

  /**
   * Start approval workflow for a new ECO
   */
  async startECOApprovalWorkflow(
    ecoId: string,
    createdById: string
  ): Promise<void> {
    try {
      const eco = await this.ecoService.getECOById(ecoId);
      const workflowId = this.getWorkflowIdForECO(eco);

      const workflowInput: WorkflowInstanceInput = {
        workflowId,
        entityType: 'ECO',
        entityId: ecoId,
        priority: this.mapECOPriorityToWorkflowPriority(eco.priority),
        metadata: {
          ecoNumber: eco.ecoNumber,
          ecoType: eco.ecoType,
          title: eco.title,
          estimatedCost: eco.estimatedCost,
          requestorName: eco.requestorName
        }
      };

      await this.workflowEngine.startWorkflow(workflowInput, createdById);

      // Update ECO status to UNDER_REVIEW
      await this.ecoService.changeECOStatus(
        ecoId,
        ECOStatus.UNDER_REVIEW,
        createdById,
        'Approval workflow started'
      );

      logger.info(`Approval workflow started for ECO ${eco.ecoNumber}`, {
        ecoId,
        workflowId
      });

    } catch (error) {
      logger.error('Error starting ECO approval workflow:', error);
      throw new ECOError(`Failed to start approval workflow: ${error.message}`);
    }
  }

  /**
   * Handle workflow approval decision
   */
  async handleWorkflowApproval(
    ecoId: string,
    action: ApprovalAction,
    assignmentId: string,
    userId: string,
    notes?: string
  ): Promise<void> {
    try {
      const eco = await this.ecoService.getECOById(ecoId);

      // Process the approval in the workflow engine
      const approvalInput: ApprovalActionInput = {
        assignmentId,
        action,
        notes: notes || `ECO ${action.toLowerCase()}`
      };

      await this.workflowEngine.processApprovalAction(approvalInput, userId);

      // Update ECO status based on workflow outcome
      await this.updateECOStatusFromWorkflow(ecoId, action, userId);

      // If approved and meets CRB criteria, schedule CRB review
      if (action === ApprovalAction.APPROVED && this.requiresCRBReview(eco)) {
        await this.scheduleAutomaticCRBReview(ecoId);
      }

      logger.info(`Workflow approval processed for ECO ${eco.ecoNumber}`, {
        ecoId,
        action,
        userId
      });

    } catch (error) {
      logger.error('Error handling workflow approval:', error);
      throw new ECOError(`Failed to process workflow approval: ${error.message}`);
    }
  }

  /**
   * Start CRB review workflow
   */
  async startCRBReviewWorkflow(ecoId: string, scheduledBy: string): Promise<void> {
    try {
      const eco = await this.ecoService.getECOById(ecoId);

      // Update ECO status to PENDING_CRB
      await this.ecoService.changeECOStatus(
        ecoId,
        ECOStatus.PENDING_CRB,
        scheduledBy,
        'CRB review scheduled'
      );

      // Schedule CRB review meeting (auto-schedule for next meeting date)
      const nextMeetingDate = await this.getNextCRBMeetingDate();
      await this.crbService.scheduleCRBReview(ecoId, nextMeetingDate);

      logger.info(`CRB review workflow started for ECO ${eco.ecoNumber}`, {
        ecoId,
        meetingDate: nextMeetingDate
      });

    } catch (error) {
      logger.error('Error starting CRB review workflow:', error);
      throw new ECOError(`Failed to start CRB review workflow: ${error.message}`);
    }
  }

  /**
   * Handle CRB decision and continue workflow
   */
  async handleCRBDecision(
    ecoId: string,
    decision: string,
    decidedBy: string
  ): Promise<void> {
    try {
      const eco = await this.ecoService.getECOById(ecoId);

      let newStatus: ECOStatus;
      let workflowAction: ApprovalAction;

      switch (decision) {
        case 'APPROVED':
          newStatus = ECOStatus.CRB_APPROVED;
          workflowAction = ApprovalAction.APPROVED;
          break;
        case 'REJECTED':
          newStatus = ECOStatus.REJECTED;
          workflowAction = ApprovalAction.REJECTED;
          break;
        case 'DEFERRED':
        case 'REQUEST_MORE_INFO':
          newStatus = ECOStatus.UNDER_REVIEW;
          workflowAction = ApprovalAction.PENDING;
          break;
        default:
          throw new ECOError(`Invalid CRB decision: ${decision}`);
      }

      // Update ECO status
      await this.ecoService.changeECOStatus(
        ecoId,
        newStatus,
        decidedBy,
        `CRB decision: ${decision}`
      );

      // If approved, start implementation workflow
      if (decision === 'APPROVED') {
        await this.startImplementationWorkflow(ecoId, decidedBy);
      }

      logger.info(`CRB decision processed for ECO ${eco.ecoNumber}`, {
        ecoId,
        decision,
        newStatus
      });

    } catch (error) {
      logger.error('Error handling CRB decision:', error);
      throw new ECOError(`Failed to process CRB decision: ${error.message}`);
    }
  }

  /**
   * Start implementation workflow after CRB approval
   */
  async startImplementationWorkflow(
    ecoId: string,
    approvedBy: string
  ): Promise<void> {
    try {
      const eco = await this.ecoService.getECOById(ecoId);

      // Update ECO status to IMPLEMENTATION
      await this.ecoService.changeECOStatus(
        ecoId,
        ECOStatus.IMPLEMENTATION,
        approvedBy,
        'Implementation phase started'
      );

      // Create implementation tasks automatically
      await this.createImplementationTasks(ecoId);

      // Start implementation tracking workflow
      const workflowInput: WorkflowInstanceInput = {
        workflowId: 'eco-implementation-workflow', // Should be configurable
        entityType: 'ECO_IMPLEMENTATION',
        entityId: ecoId,
        priority: this.mapECOPriorityToWorkflowPriority(eco.priority),
        metadata: {
          ecoNumber: eco.ecoNumber,
          phase: 'implementation'
        }
      };

      await this.workflowEngine.startWorkflow(workflowInput, approvedBy);

      logger.info(`Implementation workflow started for ECO ${eco.ecoNumber}`, {
        ecoId
      });

    } catch (error) {
      logger.error('Error starting implementation workflow:', error);
      throw new ECOError(`Failed to start implementation workflow: ${error.message}`);
    }
  }

  /**
   * Complete ECO workflow when all tasks are done
   */
  async completeECOWorkflow(ecoId: string, completedBy: string): Promise<void> {
    try {
      const eco = await this.ecoService.getECOById(ecoId);

      // Verify all tasks are completed
      const pendingTasks = await this.prisma.eCOTask.count({
        where: {
          ecoId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
      });

      if (pendingTasks > 0) {
        throw new ECOError(`Cannot complete ECO: ${pendingTasks} tasks are still pending`);
      }

      // Update ECO to verification status first
      await this.ecoService.changeECOStatus(
        ecoId,
        ECOStatus.VERIFICATION,
        completedBy,
        'All implementation tasks completed, verifying changes'
      );

      // After verification (could be automated or manual), complete the ECO
      setTimeout(async () => {
        await this.ecoService.completeECO(ecoId, completedBy);
      }, 1000); // Simplified verification

      logger.info(`ECO workflow completion initiated for ${eco.ecoNumber}`, {
        ecoId
      });

    } catch (error) {
      logger.error('Error completing ECO workflow:', error);
      throw new ECOError(`Failed to complete ECO workflow: ${error.message}`);
    }
  }

  // ============================================================================
  // Workflow Event Handlers
  // ============================================================================

  /**
   * Handle workflow status changes
   */
  async onWorkflowStatusChange(
    workflowInstanceId: string,
    newStatus: WorkflowStatus,
    entityType: string,
    entityId: string
  ): Promise<void> {
    if (entityType !== 'ECO') return;

    try {
      switch (newStatus) {
        case WorkflowStatus.COMPLETED:
          await this.handleWorkflowCompleted(entityId);
          break;
        case WorkflowStatus.CANCELLED:
          await this.handleWorkflowCancelled(entityId);
          break;
        case WorkflowStatus.ON_HOLD:
          await this.handleWorkflowOnHold(entityId);
          break;
      }
    } catch (error) {
      logger.error('Error handling workflow status change:', error);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private getWorkflowIdForECO(eco: any): string {
    // Return appropriate workflow ID based on ECO characteristics
    if (eco.priority === ECOPriority.EMERGENCY) {
      return 'eco-emergency-workflow';
    }

    if (eco.estimatedCost && eco.estimatedCost > 100000) {
      return 'eco-high-cost-workflow';
    }

    return 'eco-standard-workflow';
  }

  private mapECOPriorityToWorkflowPriority(ecoPriority: ECOPriority): string {
    const priorityMap: Record<ECOPriority, string> = {
      [ECOPriority.LOW]: 'LOW',
      [ECOPriority.MEDIUM]: 'MEDIUM',
      [ECOPriority.HIGH]: 'HIGH',
      [ECOPriority.CRITICAL]: 'HIGH',
      [ECOPriority.EMERGENCY]: 'CRITICAL'
    };

    return priorityMap[ecoPriority] || 'MEDIUM';
  }

  private requiresCRBReview(eco: any): boolean {
    // Determine if ECO requires CRB review based on business rules
    return (
      eco.estimatedCost > 50000 ||
      eco.priority === ECOPriority.CRITICAL ||
      eco.priority === ECOPriority.EMERGENCY ||
      eco.affectedParts.length > 10 ||
      eco.ecoType === 'COMPLIANCE'
    );
  }

  private async getNextCRBMeetingDate(): Promise<Date> {
    const config = await this.crbService.getCRBConfiguration();

    if (config?.meetingFrequency === 'weekly') {
      // Schedule for next week's meeting day
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 7);
      return nextDate;
    }

    // Default to next Monday if no schedule configured
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + (7 - nextMonday.getDay() + 1) % 7);
    return nextMonday;
  }

  private async updateECOStatusFromWorkflow(
    ecoId: string,
    action: ApprovalAction,
    userId: string
  ): Promise<void> {
    switch (action) {
      case ApprovalAction.APPROVED:
        // Status will be updated when workflow determines next steps
        break;
      case ApprovalAction.REJECTED:
        await this.ecoService.changeECOStatus(
          ecoId,
          ECOStatus.REJECTED,
          userId,
          'Rejected in approval workflow'
        );
        break;
      case ApprovalAction.DELEGATED:
        // No status change needed for delegation
        break;
    }
  }

  private async scheduleAutomaticCRBReview(ecoId: string): Promise<void> {
    try {
      const nextMeetingDate = await this.getNextCRBMeetingDate();
      await this.crbService.scheduleCRBReview(ecoId, nextMeetingDate);

      await this.ecoService.changeECOStatus(
        ecoId,
        ECOStatus.PENDING_CRB,
        'system',
        'Automatically scheduled for CRB review'
      );
    } catch (error) {
      logger.error('Error scheduling automatic CRB review:', error);
    }
  }

  private async createImplementationTasks(ecoId: string): Promise<void> {
    try {
      const eco = await this.ecoService.getECOById(ecoId);
      const tasks = [];

      // Create standard implementation tasks based on ECO details
      if (eco.affectedDocuments?.length > 0) {
        tasks.push({
          taskName: 'Update Affected Documents',
          description: 'Revise all affected work instructions and documentation',
          taskType: 'DOCUMENT_UPDATE' as any,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
      }

      if (eco.affectedParts?.length > 0) {
        tasks.push({
          taskName: 'Update Part Masters',
          description: 'Update part master data for affected parts',
          taskType: 'PART_MASTER_UPDATE' as any,
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
        });
      }

      if (eco.affectedOperations?.length > 0) {
        tasks.push({
          taskName: 'Update Routing Operations',
          description: 'Modify routing operations as specified in ECO',
          taskType: 'ROUTING_UPDATE' as any,
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days
        });
      }

      // Create training task if needed
      if (eco.ecoType === 'COMPLIANCE' || eco.priority === ECOPriority.CRITICAL) {
        tasks.push({
          taskName: 'Conduct Training',
          description: 'Train personnel on new procedures and changes',
          taskType: 'TRAINING' as any,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
        });
      }

      // Final verification task
      tasks.push({
        taskName: 'Verify Implementation',
        description: 'Verify all changes have been implemented correctly',
        taskType: 'VERIFICATION' as any,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // 21 days
      });

      // Create all tasks
      for (const task of tasks) {
        await this.ecoService.createTask(ecoId, task);
      }

      logger.info(`Created ${tasks.length} implementation tasks for ECO ${eco.ecoNumber}`);

    } catch (error) {
      logger.error('Error creating implementation tasks:', error);
    }
  }

  private async handleWorkflowCompleted(ecoId: string): Promise<void> {
    await this.ecoService.changeECOStatus(
      ecoId,
      ECOStatus.COMPLETED,
      'system',
      'Workflow completed successfully'
    );
  }

  private async handleWorkflowCancelled(ecoId: string): Promise<void> {
    await this.ecoService.changeECOStatus(
      ecoId,
      ECOStatus.CANCELLED,
      'system',
      'Workflow cancelled'
    );
  }

  private async handleWorkflowOnHold(ecoId: string): Promise<void> {
    await this.ecoService.changeECOStatus(
      ecoId,
      ECOStatus.ON_HOLD,
      'system',
      'Workflow put on hold'
    );
  }
}