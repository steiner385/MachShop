/**
 * ✅ GITHUB ISSUE #21: Advanced Multi-Stage Approval Workflow Engine
 *
 * WorkflowEngineService - Core engine for managing workflow lifecycles,
 * stage transitions, parallel approvals, and conditional routing
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  WorkflowInstanceInput,
  WorkflowInstanceResponse,
  WorkflowStageInstanceResponse,
  WorkflowAssignmentResponse,
  AssignmentInput,
  ApprovalActionInput,
  DelegationInput,
  TaskFilters,
  WorkflowTaskResponse,
  WorkflowStatusSummary,
  RuleContext,
  RuleAction,
  ApprovalProgress,
  WorkflowEngineError,
  WorkflowValidationError,
  WorkflowStateError,
  WorkflowPermissionError
} from '../types/workflow';
import {
  WorkflowType,
  WorkflowStatus,
  StageStatus,
  StageOutcome,
  ApprovalAction,
  WorkflowEventType,
  TaskStatus,
  AssignmentType,
  ApprovalType
} from '@prisma/client';

export class WorkflowEngineService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // Workflow Lifecycle Management
  // ============================================================================

  /**
   * Start a new workflow instance for an entity
   */
  async startWorkflow(
    input: WorkflowInstanceInput,
    createdById: string
  ): Promise<WorkflowInstanceResponse> {
    try {
      logger.info(`Starting workflow for ${input.entityType}:${input.entityId}`, {
        workflowId: input.workflowId,
        createdById
      });

      // Check if workflow already exists for this entity
      const existingInstance = await this.prisma.workflowInstance.findUnique({
        where: {
          entityType_entityId: {
            entityType: input.entityType,
            entityId: input.entityId
          }
        }
      });

      if (existingInstance && existingInstance.status === 'IN_PROGRESS') {
        throw new WorkflowValidationError(
          `Active workflow already exists for ${input.entityType}:${input.entityId}`
        );
      }

      // Get workflow definition
      const workflowDefinition = await this.prisma.workflowDefinition.findUnique({
        where: { id: input.workflowId },
        include: { stages: { orderBy: { stageNumber: 'asc' } } }
      });

      if (!workflowDefinition || !workflowDefinition.isActive) {
        throw new WorkflowValidationError('Workflow definition not found or inactive');
      }

      // Create workflow instance in transaction
      const workflowInstance = await this.prisma.$transaction(async (tx) => {
        // Create the workflow instance
        const instance = await tx.workflowInstance.create({
          data: {
            workflowId: input.workflowId,
            entityType: input.entityType,
            entityId: input.entityId,
            status: 'IN_PROGRESS',
            currentStageNumber: 1,
            priority: input.priority || 'NORMAL',
            impactLevel: input.impactLevel,
            contextData: input.contextData || {},
            deadline: input.deadline,
            createdById
          }
        });

        // Create stage instances
        for (const stageDef of workflowDefinition.stages) {
          await tx.workflowStageInstance.create({
            data: {
              workflowInstanceId: instance.id,
              stageId: stageDef.id,
              stageNumber: stageDef.stageNumber,
              stageName: stageDef.stageName,
              status: stageDef.stageNumber === 1 ? 'IN_PROGRESS' : 'PENDING',
              deadline: this.calculateStageDeadline(stageDef.deadlineHours)
            }
          });
        }

        // Create workflow history entry
        await tx.workflowHistory.create({
          data: {
            workflowInstanceId: instance.id,
            eventType: 'WORKFLOW_STARTED',
            eventDescription: `Workflow started for ${input.entityType}:${input.entityId}`,
            performedById: createdById,
            performedByName: 'System', // TODO: Get actual user name
            details: { workflowDefinition: workflowDefinition.name }
          }
        });

        return instance;
      });

      // Start the first stage
      await this.startStage(workflowInstance.id, 1, createdById);

      return this.getWorkflowStatus(workflowInstance.id);
    } catch (error: any) {
      logger.error('Failed to start workflow:', {
        error: error?.message || 'Unknown error',
        input,
        createdById
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to start workflow', 'START_WORKFLOW_ERROR', error);
    }
  }

  /**
   * Advance workflow to the next stage
   */
  async advanceWorkflow(
    instanceId: string,
    stageOutcome: StageOutcome,
    performedById: string
  ): Promise<WorkflowInstanceResponse> {
    try {
      logger.info(`Advancing workflow ${instanceId}`, {
        stageOutcome,
        performedById
      });

      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: instanceId },
        include: {
          stageInstances: {
            orderBy: { stageNumber: 'asc' },
            include: { assignments: true }
          },
          workflow: { include: { stages: { orderBy: { stageNumber: 'asc' } } } }
        }
      });

      if (!instance) {
        throw new WorkflowValidationError('Workflow instance not found');
      }

      if (instance.status !== 'IN_PROGRESS') {
        throw new WorkflowStateError('Workflow is not in progress');
      }

      const currentStage = instance.stageInstances.find(
        s => s.stageNumber === instance.currentStageNumber
      );

      if (!currentStage) {
        throw new WorkflowStateError('Current stage not found');
      }

      // Complete current stage
      await this.completeStage(currentStage.id, stageOutcome, performedById);

      // Determine next action based on outcome
      if (stageOutcome === 'REJECTED') {
        await this.rejectWorkflow(instanceId, performedById);
      } else if (stageOutcome === 'APPROVED') {
        const nextStageNumber = instance.currentStageNumber! + 1;
        const hasNextStage = instance.workflow.stages.some(
          s => s.stageNumber === nextStageNumber
        );

        if (hasNextStage) {
          // Move to next stage
          await this.prisma.workflowInstance.update({
            where: { id: instanceId },
            data: { currentStageNumber: nextStageNumber }
          });

          await this.startStage(instanceId, nextStageNumber, performedById);
        } else {
          // Complete workflow
          await this.completeWorkflow(instanceId, performedById);
        }
      }

      return this.getWorkflowStatus(instanceId);
    } catch (error: any) {
      logger.error('Failed to advance workflow:', {
        error: error?.message || 'Unknown error',
        instanceId,
        stageOutcome,
        performedById
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to advance workflow', 'ADVANCE_WORKFLOW_ERROR', error);
    }
  }

  /**
   * Complete workflow
   */
  async completeWorkflow(instanceId: string, performedById: string): Promise<WorkflowInstanceResponse> {
    try {
      logger.info(`Completing workflow ${instanceId}`, { performedById });

      const instance = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.workflowInstance.update({
          where: { id: instanceId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            currentStageNumber: null
          }
        });

        await tx.workflowHistory.create({
          data: {
            workflowInstanceId: instanceId,
            eventType: 'WORKFLOW_COMPLETED',
            eventDescription: 'Workflow completed successfully',
            performedById,
            performedByName: 'System' // TODO: Get actual user name
          }
        });

        return updated;
      });

      logger.info(`Workflow ${instanceId} completed successfully`);
      return this.getWorkflowStatus(instanceId);
    } catch (error: any) {
      logger.error('Failed to complete workflow:', {
        error: error?.message || 'Unknown error',
        instanceId,
        performedById
      });
      throw new WorkflowEngineError('Failed to complete workflow', 'COMPLETE_WORKFLOW_ERROR', error);
    }
  }

  /**
   * Cancel workflow
   */
  async cancelWorkflow(instanceId: string, reason: string, performedById: string): Promise<void> {
    try {
      logger.info(`Cancelling workflow ${instanceId}`, { reason, performedById });

      await this.prisma.$transaction(async (tx) => {
        await tx.workflowInstance.update({
          where: { id: instanceId },
          data: {
            status: 'CANCELLED',
            completedAt: new Date()
          }
        });

        await tx.workflowHistory.create({
          data: {
            workflowInstanceId: instanceId,
            eventType: 'WORKFLOW_CANCELLED',
            eventDescription: `Workflow cancelled: ${reason}`,
            performedById,
            performedByName: 'System', // TODO: Get actual user name
            details: { reason }
          }
        });
      });

      logger.info(`Workflow ${instanceId} cancelled successfully`);
    } catch (error: any) {
      logger.error('Failed to cancel workflow:', {
        error: error?.message || 'Unknown error',
        instanceId,
        reason,
        performedById
      });
      throw new WorkflowEngineError('Failed to cancel workflow', 'CANCEL_WORKFLOW_ERROR', error);
    }
  }

  // ============================================================================
  // Stage Management
  // ============================================================================

  /**
   * Start a specific stage
   */
  async startStage(instanceId: string, stageNumber: number, performedById: string): Promise<void> {
    try {
      logger.info(`Starting stage ${stageNumber} for workflow ${instanceId}`);

      const stageInstance = await this.prisma.workflowStageInstance.findFirst({
        where: {
          workflowInstanceId: instanceId,
          stageNumber
        },
        include: { stage: true }
      });

      if (!stageInstance) {
        throw new WorkflowValidationError(`Stage ${stageNumber} not found`);
      }

      // Update stage status
      await this.prisma.workflowStageInstance.update({
        where: { id: stageInstance.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      });

      // Create assignments based on stage configuration
      await this.createStageAssignments(stageInstance.id, stageInstance.stage);

      // Create history entry
      await this.prisma.workflowHistory.create({
        data: {
          workflowInstanceId: instanceId,
          eventType: 'STAGE_STARTED',
          eventDescription: `Stage ${stageNumber}: ${stageInstance.stageName} started`,
          stageNumber,
          performedById,
          performedByName: 'System' // TODO: Get actual user name
        }
      });

      logger.info(`Stage ${stageNumber} started successfully for workflow ${instanceId}`);
    } catch (error: any) {
      logger.error('Failed to start stage:', {
        error: error?.message || 'Unknown error',
        instanceId,
        stageNumber,
        performedById
      });
      throw new WorkflowEngineError('Failed to start stage', 'START_STAGE_ERROR', error);
    }
  }

  /**
   * Complete a stage
   */
  async completeStage(stageInstanceId: string, outcome: StageOutcome, performedById: string): Promise<void> {
    try {
      logger.info(`Completing stage ${stageInstanceId}`, { outcome, performedById });

      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.workflowStageInstance.update({
          where: { id: stageInstanceId },
          data: {
            status: 'COMPLETED',
            outcome,
            completedAt: new Date()
          }
        });

        await tx.workflowHistory.create({
          data: {
            workflowInstanceId: updated.workflowInstanceId,
            eventType: 'STAGE_COMPLETED',
            eventDescription: `Stage ${updated.stageNumber}: ${updated.stageName} completed with outcome: ${outcome}`,
            stageNumber: updated.stageNumber,
            toStatus: 'COMPLETED',
            performedById,
            performedByName: 'System', // TODO: Get actual user name
            details: { outcome }
          }
        });
      });

      logger.info(`Stage ${stageInstanceId} completed successfully`);
    } catch (error: any) {
      logger.error('Failed to complete stage:', {
        error: error?.message || 'Unknown error',
        stageInstanceId,
        outcome,
        performedById
      });
      throw new WorkflowEngineError('Failed to complete stage', 'COMPLETE_STAGE_ERROR', error);
    }
  }

  // ============================================================================
  // Assignment Management
  // ============================================================================

  /**
   * Assign approvers to a stage
   */
  async assignApprovers(
    stageInstanceId: string,
    assignments: AssignmentInput[]
  ): Promise<WorkflowAssignmentResponse[]> {
    try {
      logger.info(`Assigning approvers to stage ${stageInstanceId}`, {
        assignmentCount: assignments.length
      });

      const results = await this.prisma.$transaction(async (tx) => {
        const assignmentResults: any[] = [];

        for (const assignment of assignments) {
          const result = await tx.workflowAssignment.create({
            data: {
              stageInstanceId: assignment.stageInstanceId,
              assignedToId: assignment.assignedToId,
              assignedToRole: assignment.assignedToRole,
              assignmentType: assignment.assignmentType,
              dueDate: assignment.dueDate || this.calculateAssignmentDeadline()
            }
          });

          // Create task queue entry
          await tx.workflowTask.create({
            data: {
              assignmentId: result.id,
              assignedToId: assignment.assignedToId,
              workflowInstanceId: '', // Will be populated via join
              stageNumber: 0, // Will be populated via join
              entityType: '', // Will be populated via join
              entityId: '', // Will be populated via join
              taskTitle: 'Approval Required',
              priority: 'NORMAL',
              status: 'PENDING',
              dueDate: result.dueDate
            }
          });

          assignmentResults.push(result);
        }

        return assignmentResults;
      });

      return results.map(this.mapAssignmentResponse);
    } catch (error: any) {
      logger.error('Failed to assign approvers:', {
        error: error?.message || 'Unknown error',
        stageInstanceId,
        assignments
      });
      throw new WorkflowEngineError('Failed to assign approvers', 'ASSIGN_APPROVERS_ERROR', error);
    }
  }

  /**
   * Process approval action
   */
  async processApproval(
    input: ApprovalActionInput,
    performedById: string
  ): Promise<void> {
    try {
      logger.info(`Processing approval action`, {
        assignmentId: input.assignmentId,
        action: input.action,
        performedById
      });

      const assignment = await this.prisma.workflowAssignment.findUnique({
        where: { id: input.assignmentId },
        include: {
          stageInstance: {
            include: {
              workflowInstance: true,
              stage: true,
              assignments: true
            }
          }
        }
      });

      if (!assignment) {
        throw new WorkflowValidationError('Assignment not found');
      }

      if (assignment.assignedToId !== performedById) {
        throw new WorkflowPermissionError('User not authorized for this assignment');
      }

      if (assignment.action) {
        throw new WorkflowStateError('Assignment already completed');
      }

      // Update assignment
      await this.prisma.$transaction(async (tx) => {
        await tx.workflowAssignment.update({
          where: { id: input.assignmentId },
          data: {
            action: input.action,
            actionTakenAt: new Date(),
            comments: input.comments,
            signatureId: input.signatureId,
            signatureType: input.signatureType
          }
        });

        // Update task status
        await tx.workflowTask.updateMany({
          where: { assignmentId: input.assignmentId },
          data: { status: 'COMPLETED' }
        });

        // Create history entry
        await tx.workflowHistory.create({
          data: {
            workflowInstanceId: assignment.stageInstance.workflowInstanceId,
            eventType: input.action === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
            eventDescription: `${input.action} by user ${performedById}`,
            stageNumber: assignment.stageInstance.stageNumber,
            performedById,
            performedByName: 'User', // TODO: Get actual user name
            details: {
              comments: input.comments,
              signatureId: input.signatureId
            }
          }
        });
      });

      // Check if stage is complete
      await this.checkStageCompletion(assignment.stageInstance.id);

      logger.info(`Approval action processed successfully`, {
        assignmentId: input.assignmentId,
        action: input.action
      });
    } catch (error: any) {
      logger.error('Failed to process approval:', {
        error: error?.message || 'Unknown error',
        input,
        performedById
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to process approval', 'PROCESS_APPROVAL_ERROR', error);
    }
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get workflow status
   */
  async getWorkflowStatus(instanceId: string): Promise<WorkflowInstanceResponse> {
    try {
      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: instanceId },
        include: {
          workflow: true,
          stageInstances: {
            orderBy: { stageNumber: 'asc' },
            include: {
              assignments: true,
              stage: true
            }
          },
          history: {
            orderBy: { occurredAt: 'desc' },
            take: 50
          }
        }
      });

      if (!instance) {
        throw new WorkflowValidationError('Workflow instance not found');
      }

      return this.mapWorkflowInstanceResponse(instance);
    } catch (error: any) {
      logger.error('Failed to get workflow status:', {
        error: error?.message || 'Unknown error',
        instanceId
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to get workflow status', 'GET_STATUS_ERROR', error);
    }
  }

  /**
   * Get user's task queue
   */
  async getMyTasks(userId: string, filters: TaskFilters = {}): Promise<WorkflowTaskResponse[]> {
    try {
      const where: Prisma.WorkflowTaskWhereInput = {
        assignedToId: userId,
        ...(filters.status && { status: { in: filters.status } }),
        ...(filters.priority && { priority: { in: filters.priority } }),
        ...(filters.entityType && { entityType: { in: filters.entityType } }),
        ...(filters.dueDateBefore && { dueDate: { lte: filters.dueDateBefore } }),
        ...(filters.dueDateAfter && { dueDate: { gte: filters.dueDateAfter } }),
        ...(filters.overdue && {
          dueDate: { lt: new Date() },
          status: { not: 'COMPLETED' }
        })
      };

      const tasks = await this.prisma.workflowTask.findMany({
        where,
        orderBy: {
          [filters.sortBy || 'dueDate']: filters.sortOrder || 'asc'
        },
        skip: filters.page ? (filters.page - 1) * (filters.limit || 20) : 0,
        take: filters.limit || 20
      });

      return tasks.map(this.mapTaskResponse);
    } catch (error: any) {
      logger.error('Failed to get user tasks:', {
        error: error?.message || 'Unknown error',
        userId,
        filters
      });
      throw new WorkflowEngineError('Failed to get user tasks', 'GET_TASKS_ERROR', error);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private calculateStageDeadline(deadlineHours?: number): Date | undefined {
    if (!deadlineHours) return undefined;
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + deadlineHours);
    return deadline;
  }

  private calculateAssignmentDeadline(): Date {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 72); // Default 72 hours
    return deadline;
  }

  private async createStageAssignments(stageInstanceId: string, stageDef: any): Promise<void> {
    // TODO: Implement role-based assignment logic
    // This is a simplified version - will be expanded in Phase 5
    logger.info(`Creating assignments for stage ${stageInstanceId}`);
  }

  private async checkStageCompletion(stageInstanceId: string): Promise<void> {
    // TODO: Implement parallel approval completion logic
    // This will be expanded in Phase 5B
    logger.info(`Checking completion for stage ${stageInstanceId}`);
  }

  private async rejectWorkflow(instanceId: string, performedById: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: 'REJECTED',
          completedAt: new Date()
        }
      });

      await tx.workflowHistory.create({
        data: {
          workflowInstanceId: instanceId,
          eventType: 'WORKFLOW_CANCELLED',
          eventDescription: 'Workflow rejected',
          performedById,
          performedByName: 'System' // TODO: Get actual user name
        }
      });
    });
  }

  private mapWorkflowInstanceResponse(instance: any): WorkflowInstanceResponse {
    return {
      id: instance.id,
      workflowId: instance.workflowId,
      entityType: instance.entityType,
      entityId: instance.entityId,
      status: instance.status,
      currentStageNumber: instance.currentStageNumber,
      priority: instance.priority,
      impactLevel: instance.impactLevel,
      startedAt: instance.startedAt,
      completedAt: instance.completedAt,
      deadline: instance.deadline,
      createdById: instance.createdById,
      stageInstances: instance.stageInstances?.map(this.mapStageInstanceResponse) || [],
      history: instance.history?.map(this.mapHistoryResponse) || [],
      progressPercentage: this.calculateProgress(instance.stageInstances || [])
    };
  }

  private mapStageInstanceResponse(stage: any): WorkflowStageInstanceResponse {
    return {
      id: stage.id,
      stageNumber: stage.stageNumber,
      stageName: stage.stageName,
      status: stage.status,
      outcome: stage.outcome,
      startedAt: stage.startedAt,
      completedAt: stage.completedAt,
      deadline: stage.deadline,
      notes: stage.notes,
      assignments: stage.assignments?.map(this.mapAssignmentResponse) || [],
      approvalProgress: this.calculateApprovalProgress(stage.assignments || [])
    };
  }

  private mapAssignmentResponse(assignment: any): WorkflowAssignmentResponse {
    return {
      id: assignment.id,
      assignedToId: assignment.assignedToId,
      assignedToRole: assignment.assignedToRole,
      assignmentType: assignment.assignmentType,
      action: assignment.action,
      actionTakenAt: assignment.actionTakenAt,
      comments: assignment.comments,
      signatureId: assignment.signatureId,
      signatureType: assignment.signatureType,
      assignedAt: assignment.assignedAt,
      dueDate: assignment.dueDate,
      escalationLevel: assignment.escalationLevel,
      escalatedAt: assignment.escalatedAt,
      escalatedToId: assignment.escalatedToId,
      isDelegated: !!assignment.delegatedFromId,
      delegatedFromId: assignment.delegatedFromId,
      delegationReason: assignment.delegationReason,
      delegationExpiry: assignment.delegationExpiry
    };
  }

  private mapHistoryResponse(history: any): any {
    return {
      id: history.id,
      eventType: history.eventType,
      eventDescription: history.eventDescription,
      stageNumber: history.stageNumber,
      fromStatus: history.fromStatus,
      toStatus: history.toStatus,
      performedById: history.performedById,
      performedByName: history.performedByName,
      performedByRole: history.performedByRole,
      details: history.details,
      occurredAt: history.occurredAt
    };
  }

  private mapTaskResponse(task: any): WorkflowTaskResponse {
    return {
      id: task.id,
      assignmentId: task.assignmentId,
      assignedToId: task.assignedToId,
      workflowInstanceId: task.workflowInstanceId,
      stageNumber: task.stageNumber,
      entityType: task.entityType,
      entityId: task.entityId,
      taskTitle: task.taskTitle,
      taskDescription: task.taskDescription,
      priority: task.priority,
      status: task.status,
      createdAt: task.createdAt,
      dueDate: task.dueDate,
      lastReminderSent: task.lastReminderSent,
      reminderCount: task.reminderCount
    };
  }

  private calculateProgress(stages: any[]): number {
    if (!stages.length) return 0;
    const completed = stages.filter(s => s.status === 'COMPLETED').length;
    return Math.round((completed / stages.length) * 100);
  }

  private calculateApprovalProgress(assignments: any[]): ApprovalProgress {
    const total = assignments.length;
    const completed = assignments.filter(a => a.action).length;
    const approved = assignments.filter(a => a.action === 'APPROVED').length;
    const rejected = assignments.filter(a => a.action === 'REJECTED').length;
    const pending = total - completed;

    return {
      total,
      completed,
      approved,
      rejected,
      pending,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }
}

export default WorkflowEngineService;