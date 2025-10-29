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
import { ElectronicSignatureService } from './ElectronicSignatureService';
import { CreateSignatureInput } from '../types/signature';

export class WorkflowEngineService {
  private prisma: PrismaClient;
  private signatureService: ElectronicSignatureService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.signatureService = new ElectronicSignatureService(prisma);
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
   * Complete workflow (public method for direct workflow completion)
   */
  async completeWorkflow(instanceId: string, performedById?: string): Promise<void> {
    try {
      logger.info(`Completing workflow ${instanceId}`, { performedById });

      await this.prisma.$transaction(async (tx) => {
        await tx.workflowInstance.update({
          where: { id: instanceId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            progressPercentage: 100,
            currentStageNumber: null
          }
        });

        await tx.workflowHistory.create({
          data: {
            workflowInstanceId: instanceId,
            eventType: 'WORKFLOW_COMPLETED',
            eventDescription: 'Workflow completed successfully',
            performedById: performedById || 'system',
            performedByName: 'System' // TODO: Get actual user name
          }
        });
      });

      logger.info(`Workflow ${instanceId} completed successfully`);
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
            cancellationReason: reason,
            cancelledAt: new Date(),
            cancelledById: performedById
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
      await this.createStageAssignments(stageInstance, this.prisma);

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
   * Assign users to a stage instance
   */
  async assignUsersToStage(
    stageInstanceId: string,
    assignments: Array<{ userId: string; roleId: string; assignmentType: AssignmentType }>
  ): Promise<WorkflowAssignmentResponse[]> {
    try {
      logger.info(`Assigning users to stage ${stageInstanceId}`, {
        assignmentCount: assignments.length
      });

      const stageInstance = await this.prisma.workflowStageInstance.findUnique({
        where: { id: stageInstanceId }
      });

      if (!stageInstance) {
        throw new WorkflowValidationError(`Stage instance ${stageInstanceId} not found`);
      }

      const results = await this.prisma.$transaction(async (tx) => {
        const assignmentResults: any[] = [];

        for (const assignment of assignments) {
          const result = await tx.workflowAssignment.create({
            data: {
              stageInstanceId,
              assignedToId: assignment.userId,
              assignedToRole: assignment.roleId,
              assignmentType: assignment.assignmentType,
              assignedAt: new Date(),
              dueDate: this.calculateAssignmentDeadline(),
              escalationLevel: 0
            }
          });

          assignmentResults.push(result);
        }

        return assignmentResults;
      });

      logger.info(`Successfully assigned ${results.length} users to stage ${stageInstanceId}`);
      return results.map(this.mapAssignmentResponse.bind(this));
    } catch (error: any) {
      logger.error('Failed to assign users to stage:', {
        error: error?.message || 'Unknown error',
        stageInstanceId,
        assignments
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to assign users to stage', 'ASSIGN_USERS_ERROR', error);
    }
  }

  /**
   * Process approval action (public method)
   */
  async processApprovalAction(
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
        throw new WorkflowValidationError(`Assignment ${input.assignmentId} not found`);
      }

      if (assignment.assignedToId !== performedById) {
        throw new WorkflowPermissionError('Permission denied');
      }

      if (assignment.action) {
        throw new WorkflowStateError('Assignment already has an action');
      }

      // Update assignment
      await this.prisma.$transaction(async (tx) => {
        await tx.workflowAssignment.update({
          where: { id: input.assignmentId },
          data: {
            action: input.action,
            actionTakenAt: new Date(),
            actionTakenById: performedById,
            notes: input.comments
          }
        });

        // Create history entry
        await tx.workflowHistory.create({
          data: {
            workflowInstanceId: assignment.stageInstance.workflowInstanceId,
            eventType: input.action === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
            eventDescription: `${input.action} by user ${performedById}`,
            stageNumber: assignment.stageInstance.stageNumber,
            performedById,
            performedByName: 'User',
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
      logger.error('Failed to process approval action:', {
        error: error?.message || 'Unknown error',
        input,
        performedById
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to process approval action', 'PROCESS_APPROVAL_ERROR', error);
    }
  }

  /**
   * Process approval action (internal method, kept for backwards compatibility)
   */
  async processApproval(
    input: ApprovalActionInput,
    performedById: string
  ): Promise<void> {
    return this.processApprovalAction(input, performedById);
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
   * Get user's task queue with filtering and pagination
   */
  async getMyTasks(
    userId: string,
    filters: { status?: any; priority?: any; page?: number; limit?: number } = {}
  ): Promise<{ tasks: any[]; pagination: { total: number; page: number; limit: number } }> {
    try {
      const where: any = {
        assignedToId: userId,
        action: null // Only pending assignments
      };

      if (filters.status) {
        where.stageInstance = {
          status: filters.status
        };
      }

      if (filters.priority) {
        where.stageInstance = {
          ...where.stageInstance,
          workflowInstance: {
            priority: filters.priority
          }
        };
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;

      const [assignments, total] = await Promise.all([
        this.prisma.workflowAssignment.findMany({
          where,
          include: {
            stageInstance: {
              include: {
                workflowInstance: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        }),
        this.prisma.workflowAssignment.count({ where })
      ]);

      const tasks = assignments.map((assignment: any) => ({
        id: assignment.id,
        stageInstance: {
          stageName: assignment.stageInstance.stageName,
          deadline: assignment.stageInstance.deadline,
          workflowInstance: {
            id: assignment.stageInstance.workflowInstance.id,
            entityType: assignment.stageInstance.workflowInstance.entityType,
            priority: assignment.stageInstance.workflowInstance.priority
          }
        }
      }));

      return {
        tasks,
        pagination: {
          total,
          page,
          limit
        }
      };
    } catch (error: any) {
      logger.error('Failed to get user tasks:', {
        error: error?.message || 'Unknown error',
        userId,
        filters
      });
      throw new WorkflowEngineError('Failed to get user tasks', 'GET_TASKS_ERROR', error);
    }
  }

  /**
   * Get workflow progress information
   */
  async getWorkflowProgress(workflowInstanceId: string): Promise<{
    completedStages: number;
    totalStages: number;
    percentage: number;
    completedAssignments: number;
    totalAssignments: number;
  }> {
    try {
      const workflowInstance = await this.prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: {
          stageInstances: {
            include: {
              assignments: true
            }
          }
        }
      });

      if (!workflowInstance) {
        throw new WorkflowValidationError(`Workflow instance ${workflowInstanceId} not found`);
      }

      const totalStages = workflowInstance.stageInstances.length;
      const completedStages = workflowInstance.stageInstances.filter(
        (s: any) => s.status === 'COMPLETED'
      ).length;

      const totalAssignments = workflowInstance.stageInstances.reduce(
        (sum: number, stage: any) => sum + stage.assignments.length,
        0
      );
      const completedAssignments = workflowInstance.stageInstances.reduce(
        (sum: number, stage: any) =>
          sum + stage.assignments.filter((a: any) => a.action).length,
        0
      );

      const percentage = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

      return {
        completedStages,
        totalStages,
        percentage,
        completedAssignments,
        totalAssignments
      };
    } catch (error: any) {
      logger.error('Failed to get workflow progress:', {
        error: error?.message || 'Unknown error',
        workflowInstanceId
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to get workflow progress', 'GET_PROGRESS_ERROR', error);
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

  /**
   * ✅ PHASE 5A: Enhanced Sequential Stage Processing
   * Check if a stage is complete and handle stage transitions
   */
  private async checkStageCompletion(stageInstanceId: string): Promise<void> {
    try {
      logger.info(`Checking completion for stage ${stageInstanceId}`);

      const stageInstance = await this.prisma.workflowStageInstance.findUnique({
        where: { id: stageInstanceId },
        include: {
          stage: true,
          assignments: true,
          workflowInstance: {
            include: {
              workflowDefinition: {
                include: {
                  stages: {
                    orderBy: { stageNumber: 'asc' }
                  }
                }
              },
              stageInstances: {
                include: {
                  assignments: true
                },
                orderBy: { stageNumber: 'asc' }
              }
            }
          }
        }
      });

      if (!stageInstance) {
        throw new WorkflowValidationError(`Stage instance ${stageInstanceId} not found`);
      }

      // Check if stage meets completion criteria
      const completionResult = await this.evaluateStageCompletion(stageInstance);

      if (completionResult.isComplete) {
        await this.completeStage(stageInstance, completionResult.outcome);

        // Check if workflow is complete or start next stage
        await this.processWorkflowProgression(stageInstance.workflowInstance);
      } else if (completionResult.isRejected) {
        await this.rejectStage(stageInstance, completionResult.rejectionReason);

        // Handle workflow rejection
        await this.handleWorkflowRejection(stageInstance.workflowInstance, completionResult.rejectionReason);
      }

      logger.info(`Stage completion check completed`, {
        stageInstanceId,
        isComplete: completionResult.isComplete,
        isRejected: completionResult.isRejected
      });
    } catch (error: any) {
      logger.error('Failed to check stage completion:', {
        error: error?.message || 'Unknown error',
        stageInstanceId
      });
      throw new WorkflowEngineError('Failed to check stage completion', 'STAGE_COMPLETION_CHECK_ERROR', error);
    }
  }

  /**
   * ✅ PHASE 5A: Evaluate if a stage meets completion criteria
   */
  private async evaluateStageCompletion(stageInstance: any): Promise<{
    isComplete: boolean;
    isRejected: boolean;
    outcome?: 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
  }> {
    const stage = stageInstance.stage;
    const assignments = stageInstance.assignments;

    // Count approval actions
    const approvals = assignments.filter((a: any) => a.action === 'APPROVED');
    const rejections = assignments.filter((a: any) => a.action === 'REJECTED');
    const pending = assignments.filter((a: any) => !a.action);

    logger.info(`Evaluating stage completion`, {
      stageId: stageInstance.id,
      approvalType: stage.approvalType,
      totalAssignments: assignments.length,
      approvals: approvals.length,
      rejections: rejections.length,
      pending: pending.length,
      minimumApprovals: stage.minimumApprovals,
      approvalThreshold: stage.approvalThreshold
    });

    // Handle different approval types
    switch (stage.approvalType) {
      case 'UNANIMOUS':
        // All must approve, any rejection fails
        if (rejections.length > 0) {
          return {
            isComplete: false,
            isRejected: true,
            outcome: 'REJECTED',
            rejectionReason: `Unanimous approval required but ${rejections.length} rejection(s) received`
          };
        }
        if (approvals.length === assignments.length) {
          return { isComplete: true, isRejected: false, outcome: 'APPROVED' };
        }
        break;

      case 'MAJORITY':
        const majority = Math.ceil(assignments.length / 2);
        if (approvals.length >= majority) {
          return { isComplete: true, isRejected: false, outcome: 'APPROVED' };
        }
        if (rejections.length >= majority) {
          return {
            isComplete: false,
            isRejected: true,
            outcome: 'REJECTED',
            rejectionReason: `Majority rejection: ${rejections.length} of ${assignments.length} rejected`
          };
        }
        break;

      case 'THRESHOLD':
        const threshold = stage.approvalThreshold || 50;
        const approvalPercentage = (approvals.length / assignments.length) * 100;
        const rejectionPercentage = (rejections.length / assignments.length) * 100;

        if (approvalPercentage >= threshold) {
          return { isComplete: true, isRejected: false, outcome: 'APPROVED' };
        }
        if (rejectionPercentage > (100 - threshold)) {
          return {
            isComplete: false,
            isRejected: true,
            outcome: 'REJECTED',
            rejectionReason: `Threshold not met: ${approvalPercentage.toFixed(1)}% approved (required: ${threshold}%)`
          };
        }
        break;

      case 'MINIMUM':
        const minimum = stage.minimumApprovals || 1;
        if (approvals.length >= minimum) {
          return { isComplete: true, isRejected: false, outcome: 'APPROVED' };
        }
        // Check if it's impossible to reach minimum
        if ((approvals.length + pending.length) < minimum) {
          return {
            isComplete: false,
            isRejected: true,
            outcome: 'REJECTED',
            rejectionReason: `Cannot reach minimum approvals: ${approvals.length} approved, ${pending.length} pending, need ${minimum}`
          };
        }
        break;

      case 'ANY':
        // Any single approval completes the stage
        if (approvals.length > 0) {
          return { isComplete: true, isRejected: false, outcome: 'APPROVED' };
        }
        // Only reject if all have explicitly rejected
        if (rejections.length === assignments.length && assignments.length > 0) {
          return {
            isComplete: false,
            isRejected: true,
            outcome: 'REJECTED',
            rejectionReason: 'All assignees rejected'
          };
        }
        break;

      default:
        logger.warn(`Unknown approval type: ${stage.approvalType}`);
        break;
    }

    // Not complete and not rejected - still in progress
    return { isComplete: false, isRejected: false };
  }

  /**
   * ✅ PHASE 5A: Complete a stage and update workflow
   */
  private async completeStage(stageInstance: any, outcome: 'APPROVED' | 'REJECTED'): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Update stage instance
      await tx.workflowStageInstance.update({
        where: { id: stageInstance.id },
        data: {
          status: 'COMPLETED',
          outcome,
          completedAt: new Date(),
          notes: `Stage completed with outcome: ${outcome}`
        }
      });

      // Add workflow history
      await tx.workflowHistory.create({
        data: {
          workflowInstanceId: stageInstance.workflowInstanceId,
          eventType: 'STAGE_COMPLETED',
          eventDescription: `Stage ${stageInstance.stageNumber}: ${stageInstance.stageName} completed with outcome: ${outcome}`,
          stageNumber: stageInstance.stageNumber,
          fromStatus: 'IN_PROGRESS',
          toStatus: 'COMPLETED',
          performedById: 'system',
          performedByName: 'System',
          details: { outcome, stageId: stageInstance.id }
        }
      });

      // Update workflow instance progress
      await this.updateWorkflowProgress(stageInstance.workflowInstanceId, tx);
    });

    logger.info(`Stage ${stageInstance.id} completed with outcome: ${outcome}`);
  }

  /**
   * ✅ PHASE 5A: Reject a stage
   */
  private async rejectStage(stageInstance: any, rejectionReason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.workflowStageInstance.update({
        where: { id: stageInstance.id },
        data: {
          status: 'REJECTED',
          outcome: 'REJECTED',
          completedAt: new Date(),
          notes: rejectionReason
        }
      });

      await tx.workflowHistory.create({
        data: {
          workflowInstanceId: stageInstance.workflowInstanceId,
          eventType: 'STAGE_REJECTED',
          eventDescription: `Stage ${stageInstance.stageNumber}: ${stageInstance.stageName} rejected - ${rejectionReason}`,
          stageNumber: stageInstance.stageNumber,
          fromStatus: 'IN_PROGRESS',
          toStatus: 'REJECTED',
          performedById: 'system',
          performedByName: 'System',
          details: { rejectionReason, stageId: stageInstance.id }
        }
      });

      await this.updateWorkflowProgress(stageInstance.workflowInstanceId, tx);
    });
  }

  /**
   * ✅ PHASE 5C: Enhanced Process workflow progression with conditional routing
   */
  private async processWorkflowProgression(workflowInstance: any): Promise<void> {
    const completedStages = workflowInstance.stageInstances.filter((s: any) => s.status === 'COMPLETED');
    const totalStages = workflowInstance.stageInstances.length;

    // Check if workflow is complete
    if (completedStages.length === totalStages) {
      await this.completeWorkflow(workflowInstance.id);
      return;
    }

    // Apply conditional routing to determine next stage(s)
    const nextStages = await this.evaluateConditionalRouting(workflowInstance, completedStages);

    // Start all determined next stages (supports parallel branching)
    for (const stageInstance of nextStages) {
      await this.startNextStage(stageInstance.id);
    }
  }

  /**
   * ✅ PHASE 5C: Conditional Routing Rules Engine
   * Evaluates workflow rules to determine next stage(s) to activate
   */
  private async evaluateConditionalRouting(workflowInstance: any, completedStages: any[]): Promise<any[]> {
    try {
      logger.info(`Evaluating conditional routing for workflow ${workflowInstance.id}`);

      // Build rule evaluation context
      const context = await this.buildRuleContext(workflowInstance, completedStages);

      // Get applicable rules for this workflow stage transition
      const applicableRules = await this.getApplicableRules(workflowInstance.workflowDefinition.id, context);

      // If no rules found, fall back to sequential progression
      if (applicableRules.length === 0) {
        logger.info('No applicable rules found, using sequential progression');
        return this.getSequentialNextStages(workflowInstance, completedStages);
      }

      // Evaluate rules and determine next stages
      const nextStages = await this.executeRulesEngine(applicableRules, context, workflowInstance);

      logger.info(`Conditional routing determined ${nextStages.length} next stages`, {
        workflowInstanceId: workflowInstance.id,
        nextStageIds: nextStages.map(s => s.id)
      });

      return nextStages;
    } catch (error: any) {
      logger.error('Error in conditional routing evaluation:', {
        error: error?.message || 'Unknown error',
        workflowInstanceId: workflowInstance.id
      });

      // Fall back to sequential progression on error
      logger.warn('Falling back to sequential progression due to routing error');
      return this.getSequentialNextStages(workflowInstance, completedStages);
    }
  }

  /**
   * ✅ PHASE 5C: Build context for rule evaluation
   */
  private async buildRuleContext(workflowInstance: any, completedStages: any[]): Promise<RuleContext> {
    const lastCompletedStage = completedStages.reduce((latest, stage) =>
      stage.stageNumber > (latest?.stageNumber || 0) ? stage : latest, null);

    // Get entity data for context
    const entityData = await this.getEntityContextData(workflowInstance);

    // Calculate approval statistics
    const approvalStats = this.calculateApprovalStatistics(completedStages);

    return {
      workflowId: workflowInstance.id,
      workflowType: workflowInstance.workflowDefinition.workflowType,
      entityType: workflowInstance.entityType,
      entityId: workflowInstance.entityId,
      entityData,
      currentStageNumber: lastCompletedStage?.stageNumber || 0,
      lastStageOutcome: lastCompletedStage?.outcome,
      completedStageCount: completedStages.length,
      totalStageCount: workflowInstance.stageInstances.length,
      workflowStatus: workflowInstance.status,
      priority: workflowInstance.priority,
      requestedById: workflowInstance.requestedById,
      approvalStats,
      metadata: workflowInstance.metadata || {},
      timestamp: new Date()
    };
  }

  /**
   * ✅ PHASE 5C: Get applicable rules for current workflow state
   */
  private async getApplicableRules(workflowDefinitionId: string, context: RuleContext): Promise<any[]> {
    const rules = await this.prisma.workflowRule.findMany({
      where: {
        workflowDefinitionId,
        isActive: true
      },
      orderBy: {
        priority: 'desc'
      }
    });

    // Filter rules that apply to current context
    const applicableRules = rules.filter(rule => {
      return this.evaluateRuleCondition(rule, context);
    });

    logger.info(`Found ${applicableRules.length} applicable rules out of ${rules.length} total rules`);
    return applicableRules;
  }

  /**
   * ✅ PHASE 5C: Execute rules engine to determine actions
   */
  private async executeRulesEngine(rules: any[], context: RuleContext, workflowInstance: any): Promise<any[]> {
    const nextStages: any[] = [];
    const executedActions: Set<string> = new Set();

    for (const rule of rules) {
      try {
        const actions = this.parseRuleActions(rule.actions);

        for (const action of actions) {
          const actionKey = `${action.type}-${action.targetStageId || action.stageNumber}`;

          // Prevent duplicate actions
          if (executedActions.has(actionKey)) {
            continue;
          }

          const stageInstances = await this.executeRuleAction(action, workflowInstance, context);
          nextStages.push(...stageInstances);
          executedActions.add(actionKey);

          logger.info(`Executed rule action`, {
            ruleId: rule.id,
            actionType: action.type,
            stageCount: stageInstances.length
          });
        }
      } catch (error: any) {
        logger.error(`Error executing rule ${rule.id}:`, {
          error: error?.message || 'Unknown error',
          ruleId: rule.id
        });
        // Continue with other rules
      }
    }

    return nextStages;
  }

  /**
   * ✅ PHASE 5C: Evaluate if a rule condition matches current context
   */
  private evaluateRuleCondition(rule: any, context: RuleContext): boolean {
    try {
      if (!rule.conditions) return true;

      const conditions = typeof rule.conditions === 'string'
        ? JSON.parse(rule.conditions)
        : rule.conditions;

      return this.evaluateConditionGroup(conditions, context);
    } catch (error: any) {
      logger.error(`Error evaluating rule condition for rule ${rule.id}:`, {
        error: error?.message || 'Unknown error'
      });
      return false;
    }
  }

  /**
   * ✅ PHASE 5C: Evaluate condition group (AND/OR logic)
   */
  private evaluateConditionGroup(conditions: any, context: RuleContext): boolean {
    if (!conditions || typeof conditions !== 'object') return true;

    // Handle logical operators
    if (conditions.AND) {
      return conditions.AND.every((cond: any) => this.evaluateConditionGroup(cond, context));
    }

    if (conditions.OR) {
      return conditions.OR.some((cond: any) => this.evaluateConditionGroup(cond, context));
    }

    if (conditions.NOT) {
      return !this.evaluateConditionGroup(conditions.NOT, context);
    }

    // Handle individual conditions
    return this.evaluateIndividualCondition(conditions, context);
  }

  /**
   * ✅ PHASE 5C: Evaluate individual condition
   */
  private evaluateIndividualCondition(condition: any, context: RuleContext): boolean {
    const { field, operator, value } = condition;

    if (!field || !operator) return false;

    const contextValue = this.getContextValue(field, context);

    switch (operator) {
      case 'equals':
      case 'eq':
        return contextValue === value;

      case 'not_equals':
      case 'ne':
        return contextValue !== value;

      case 'greater_than':
      case 'gt':
        return Number(contextValue) > Number(value);

      case 'greater_than_or_equal':
      case 'gte':
        return Number(contextValue) >= Number(value);

      case 'less_than':
      case 'lt':
        return Number(contextValue) < Number(value);

      case 'less_than_or_equal':
      case 'lte':
        return Number(contextValue) <= Number(value);

      case 'in':
        return Array.isArray(value) && value.includes(contextValue);

      case 'not_in':
        return Array.isArray(value) && !value.includes(contextValue);

      case 'contains':
        return String(contextValue).includes(String(value));

      case 'starts_with':
        return String(contextValue).startsWith(String(value));

      case 'ends_with':
        return String(contextValue).endsWith(String(value));

      case 'regex':
        try {
          const regex = new RegExp(String(value));
          return regex.test(String(contextValue));
        } catch {
          return false;
        }

      default:
        logger.warn(`Unknown condition operator: ${operator}`);
        return false;
    }
  }

  /**
   * ✅ PHASE 5C: Get value from rule context by field path
   */
  private getContextValue(field: string, context: RuleContext): any {
    try {
      // Support dot notation for nested access
      const parts = field.split('.');
      let value: any = context;

      for (const part of parts) {
        if (value === null || value === undefined) {
          return undefined;
        }
        value = value[part];
      }

      return value;
    } catch (error: any) {
      logger.error(`Error getting context value for field ${field}:`, {
        error: error?.message || 'Unknown error'
      });
      return undefined;
    }
  }

  /**
   * ✅ PHASE 5C: Parse rule actions from JSON
   */
  private parseRuleActions(actionsJson: any): RuleAction[] {
    try {
      const actions = typeof actionsJson === 'string'
        ? JSON.parse(actionsJson)
        : actionsJson;

      if (!Array.isArray(actions)) {
        return [];
      }

      return actions.map((action: any) => ({
        type: action.type,
        stageNumber: action.stageNumber,
        targetStageId: action.targetStageId,
        skipToStageNumber: action.skipToStageNumber,
        parameters: action.parameters || {}
      }));
    } catch (error: any) {
      logger.error('Error parsing rule actions:', {
        error: error?.message || 'Unknown error',
        actionsJson
      });
      return [];
    }
  }

  /**
   * ✅ PHASE 5C: Execute specific rule action
   */
  private async executeRuleAction(action: RuleAction, workflowInstance: any, context: RuleContext): Promise<any[]> {
    switch (action.type) {
      case 'ACTIVATE_STAGE':
        return this.activateSpecificStage(workflowInstance, action.stageNumber);

      case 'SKIP_TO_STAGE':
        return this.skipToStage(workflowInstance, action.skipToStageNumber);

      case 'ACTIVATE_PARALLEL':
        return this.activateParallelStages(workflowInstance, action.parameters?.stageNumbers || []);

      case 'CONDITIONAL_BRANCH':
        return this.executeConditionalBranch(workflowInstance, action.parameters);

      case 'ESCALATE':
        return this.escalateToStage(workflowInstance, action.parameters);

      default:
        logger.warn(`Unknown rule action type: ${action.type}`);
        return [];
    }
  }

  /**
   * ✅ PHASE 5C: Fallback to sequential progression
   */
  private getSequentialNextStages(workflowInstance: any, completedStages: any[]): any[] {
    const maxCompletedStage = Math.max(...completedStages.map((cs: any) => cs.stageNumber), 0);

    const nextStage = workflowInstance.stageInstances.find((s: any) =>
      s.status === 'PENDING' && s.stageNumber === (maxCompletedStage + 1)
    );

    return nextStage ? [nextStage] : [];
  }

  /**
   * ✅ PHASE 5C: Activate specific stage by number
   */
  private async activateSpecificStage(workflowInstance: any, stageNumber?: number): Promise<any[]> {
    if (!stageNumber) return [];

    const stageInstance = workflowInstance.stageInstances.find((s: any) =>
      s.status === 'PENDING' && s.stageNumber === stageNumber
    );

    return stageInstance ? [stageInstance] : [];
  }

  /**
   * ✅ PHASE 5C: Skip to specific stage
   */
  private async skipToStage(workflowInstance: any, stageNumber?: number): Promise<any[]> {
    if (!stageNumber) return [];

    // Mark intermediate stages as skipped
    const intermediateStages = workflowInstance.stageInstances.filter((s: any) =>
      s.status === 'PENDING' && s.stageNumber < stageNumber
    );

    for (const stage of intermediateStages) {
      await this.prisma.workflowStageInstance.update({
        where: { id: stage.id },
        data: {
          status: 'SKIPPED',
          outcome: 'SKIPPED',
          completedAt: new Date()
        }
      });
    }

    return this.activateSpecificStage(workflowInstance, stageNumber);
  }

  /**
   * ✅ PHASE 5C: Activate multiple stages in parallel
   */
  private async activateParallelStages(workflowInstance: any, stageNumbers: number[]): Promise<any[]> {
    const stages = workflowInstance.stageInstances.filter((s: any) =>
      s.status === 'PENDING' && stageNumbers.includes(s.stageNumber)
    );

    return stages;
  }

  /**
   * ✅ PHASE 5C: Execute conditional branch logic
   */
  private async executeConditionalBranch(workflowInstance: any, parameters: any): Promise<any[]> {
    // Implementation depends on specific branching logic
    // This is a placeholder for complex branching scenarios
    if (parameters?.branchType === 'approval_threshold') {
      return this.handleApprovalThresholdBranch(workflowInstance, parameters);
    }

    return [];
  }

  /**
   * ✅ PHASE 5C: Handle approval threshold branching
   */
  private async handleApprovalThresholdBranch(workflowInstance: any, parameters: any): Promise<any[]> {
    const { approvalThreshold = 50, approvedStageNumber, rejectedStageNumber } = parameters;

    // Calculate overall approval percentage from context
    const completedStages = workflowInstance.stageInstances.filter((s: any) => s.status === 'COMPLETED');
    const approvalStats = this.calculateApprovalStatistics(completedStages);

    if (approvalStats.approvalPercentage >= approvalThreshold) {
      return this.activateSpecificStage(workflowInstance, approvedStageNumber);
    } else {
      return this.activateSpecificStage(workflowInstance, rejectedStageNumber);
    }
  }

  /**
   * ✅ PHASE 5C: Escalate to specific stage
   */
  private async escalateToStage(workflowInstance: any, parameters: any): Promise<any[]> {
    const escalationStageNumber = parameters?.escalationStageNumber;
    return this.activateSpecificStage(workflowInstance, escalationStageNumber);
  }

  /**
   * ✅ PHASE 5C: Get entity context data for rule evaluation
   */
  private async getEntityContextData(workflowInstance: any): Promise<any> {
    try {
      switch (workflowInstance.entityType) {
        case 'work_instruction':
          return await this.prisma.workInstruction.findUnique({
            where: { id: workflowInstance.entityId },
            include: {
              workOrder: true,
              procedure: true
            }
          });

        case 'quality_check':
          return await this.prisma.qualityCheck.findUnique({
            where: { id: workflowInstance.entityId }
          });

        default:
          return {};
      }
    } catch (error: any) {
      logger.error('Error getting entity context data:', {
        error: error?.message || 'Unknown error',
        entityType: workflowInstance.entityType,
        entityId: workflowInstance.entityId
      });
      return {};
    }
  }

  /**
   * ✅ PHASE 5C: Calculate approval statistics for context
   */
  private calculateApprovalStatistics(completedStages: any[]): any {
    const totalAssignments = completedStages.reduce((sum, stage) => sum + stage.assignments.length, 0);
    const approvedAssignments = completedStages.reduce((sum, stage) =>
      sum + stage.assignments.filter((a: any) => a.action === 'APPROVED').length, 0);
    const rejectedAssignments = completedStages.reduce((sum, stage) =>
      sum + stage.assignments.filter((a: any) => a.action === 'REJECTED').length, 0);

    return {
      totalAssignments,
      approvedAssignments,
      rejectedAssignments,
      approvalPercentage: totalAssignments > 0 ? (approvedAssignments / totalAssignments) * 100 : 0,
      rejectionPercentage: totalAssignments > 0 ? (rejectedAssignments / totalAssignments) * 100 : 0
    };
  }

  /**
   * ✅ PHASE 5A: Start the next stage in sequence
   */
  private async startNextStage(stageInstanceId: string): Promise<void> {
    try {
      const stageInstance = await this.prisma.workflowStageInstance.findUnique({
        where: { id: stageInstanceId },
        include: {
          stage: true,
          workflowInstance: {
            include: {
              workflowDefinition: true
            }
          }
        }
      });

      if (!stageInstance) {
        throw new WorkflowValidationError(`Stage instance ${stageInstanceId} not found`);
      }

      await this.prisma.$transaction(async (tx) => {
        // Update stage status
        await tx.workflowStageInstance.update({
          where: { id: stageInstanceId },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            deadline: this.calculateStageDeadline(stageInstance.stage.deadlineHours)
          }
        });

        // Update workflow current stage
        await tx.workflowInstance.update({
          where: { id: stageInstance.workflowInstanceId },
          data: {
            currentStageNumber: stageInstance.stageNumber
          }
        });

        // Create assignments for this stage
        await this.createStageAssignments(stageInstance, tx);

        // Add workflow history
        await tx.workflowHistory.create({
          data: {
            workflowInstanceId: stageInstance.workflowInstanceId,
            eventType: 'STAGE_STARTED',
            eventDescription: `Stage ${stageInstance.stageNumber}: ${stageInstance.stageName} started`,
            stageNumber: stageInstance.stageNumber,
            fromStatus: 'PENDING',
            toStatus: 'IN_PROGRESS',
            performedById: 'system',
            performedByName: 'System',
            details: { stageId: stageInstanceId }
          }
        });

        await this.updateWorkflowProgress(stageInstance.workflowInstanceId, tx);
      });

      logger.info(`Next stage started: ${stageInstanceId}`);
    } catch (error: any) {
      logger.error('Failed to start next stage:', {
        error: error?.message || 'Unknown error',
        stageInstanceId
      });
      throw new WorkflowEngineError('Failed to start next stage', 'START_NEXT_STAGE_ERROR', error);
    }
  }

  /**
   * ✅ PHASE 5A: Complete the entire workflow
   */
  private async completeWorkflow(workflowInstanceId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.workflowInstance.update({
        where: { id: workflowInstanceId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          progressPercentage: 100
        }
      });

      await tx.workflowHistory.create({
        data: {
          workflowInstanceId,
          eventType: 'WORKFLOW_COMPLETED',
          eventDescription: 'Workflow completed successfully',
          performedById: 'system',
          performedByName: 'System',
          details: { completionTime: new Date().toISOString() }
        }
      });
    });

    logger.info(`Workflow ${workflowInstanceId} completed successfully`);
  }

  /**
   * ✅ PHASE 5A: Handle workflow rejection
   */
  private async handleWorkflowRejection(workflowInstance: any, rejectionReason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.workflowInstance.update({
        where: { id: workflowInstance.id },
        data: {
          status: 'REJECTED',
          completedAt: new Date()
        }
      });

      await tx.workflowHistory.create({
        data: {
          workflowInstanceId: workflowInstance.id,
          eventType: 'WORKFLOW_REJECTED',
          eventDescription: `Workflow rejected: ${rejectionReason}`,
          performedById: 'system',
          performedByName: 'System',
          details: { rejectionReason }
        }
      });

      await this.updateWorkflowProgress(workflowInstance.id, tx);
    });

    logger.info(`Workflow ${workflowInstance.id} rejected: ${rejectionReason}`);
  }

  /**
   * ✅ PHASE 5B: Enhanced assignment creation with parallel coordination
   */
  private async createStageAssignments(stageInstance: any, tx: any): Promise<void> {
    const stage = stageInstance.stage;

    // Enhanced assignment strategy for parallel processing
    const assignmentStrategy = stage.assignmentStrategy || 'ROLE_BASED';

    switch (assignmentStrategy) {
      case 'PARALLEL_ALL':
        await this.createParallelAssignments(stageInstance, stage, tx);
        break;
      case 'PARALLEL_ROLE_GROUP':
        await this.createParallelRoleGroupAssignments(stageInstance, stage, tx);
        break;
      case 'ROUND_ROBIN':
        await this.createRoundRobinAssignments(stageInstance, stage, tx);
        break;
      case 'LOAD_BALANCED':
        await this.createLoadBalancedAssignments(stageInstance, stage, tx);
        break;
      case 'ROLE_BASED':
      default:
        await this.createRoleBasedAssignments(stageInstance, stage, tx);
        break;
    }

    // Create parallel coordination metadata
    await this.initializeParallelCoordination(stageInstance.id, tx);
  }

  /**
   * ✅ PHASE 5B: Create parallel assignments for all eligible users
   */
  private async createParallelAssignments(stageInstance: any, stage: any, tx: any): Promise<void> {
    logger.info(`Creating parallel assignments for stage ${stageInstance.id}`);

    // Get all users with required roles
    const eligibleUsers = await this.getEligibleUsers(stage.requiredRoles, tx);

    for (const user of eligibleUsers) {
      await tx.workflowAssignment.create({
        data: {
          stageInstanceId: stageInstance.id,
          assignedToId: user.id,
          assignedToRole: user.primaryRole,
          assignmentType: 'PARALLEL_REQUIRED',
          assignedAt: new Date(),
          dueDate: this.calculateStageDeadline(stage.deadlineHours),
          escalationLevel: 0
        }
      });
    }

    // Create optional parallel assignments
    const optionalUsers = await this.getEligibleUsers(stage.optionalRoles || [], tx);
    for (const user of optionalUsers) {
      await tx.workflowAssignment.create({
        data: {
          stageInstanceId: stageInstance.id,
          assignedToId: user.id,
          assignedToRole: user.primaryRole,
          assignmentType: 'PARALLEL_OPTIONAL',
          assignedAt: new Date(),
          dueDate: this.calculateStageDeadline(stage.deadlineHours),
          escalationLevel: 0
        }
      });
    }
  }

  /**
   * ✅ PHASE 5B: Create parallel assignments grouped by role
   */
  private async createParallelRoleGroupAssignments(stageInstance: any, stage: any, tx: any): Promise<void> {
    logger.info(`Creating parallel role group assignments for stage ${stageInstance.id}`);

    let groupIndex = 0;

    // Create parallel groups for each required role
    for (const role of stage.requiredRoles) {
      const usersInRole = await this.getUsersByRole(role, tx);
      groupIndex++;

      for (const user of usersInRole) {
        await tx.workflowAssignment.create({
          data: {
            stageInstanceId: stageInstance.id,
            assignedToId: user.id,
            assignedToRole: role,
            assignmentType: 'PARALLEL_ROLE_GROUP',
            assignedAt: new Date(),
            dueDate: this.calculateStageDeadline(stage.deadlineHours),
            escalationLevel: 0
          }
        });
      }
    }
  }

  /**
   * ✅ PHASE 5B: Create round-robin assignments for load distribution
   */
  private async createRoundRobinAssignments(stageInstance: any, stage: any, tx: any): Promise<void> {
    logger.info(`Creating round-robin assignments for stage ${stageInstance.id}`);

    const eligibleUsers = await this.getEligibleUsers(stage.requiredRoles, tx);
    const workloadStats = await this.getUserWorkloadStats(eligibleUsers.map(u => u.id), tx);

    // Sort users by current workload (ascending)
    const sortedUsers = eligibleUsers.sort((a, b) =>
      (workloadStats[a.id]?.activeAssignments || 0) - (workloadStats[b.id]?.activeAssignments || 0)
    );

    // Assign to user with lowest workload
    if (sortedUsers.length > 0) {
      const selectedUser = sortedUsers[0];
      await tx.workflowAssignment.create({
        data: {
          stageInstanceId: stageInstance.id,
          assignedToId: selectedUser.id,
          assignedToRole: selectedUser.primaryRole,
          assignmentType: 'ROUND_ROBIN',
          assignedAt: new Date(),
          dueDate: this.calculateStageDeadline(stage.deadlineHours),
          escalationLevel: 0
        }
      });
    }
  }

  /**
   * ✅ PHASE 5B: Create load-balanced assignments with dynamic allocation
   */
  private async createLoadBalancedAssignments(stageInstance: any, stage: any, tx: any): Promise<void> {
    logger.info(`Creating load-balanced assignments for stage ${stageInstance.id}`);

    const requiredApprovals = stage.minimumApprovals || 1;
    const eligibleUsers = await this.getEligibleUsers(stage.requiredRoles, tx);
    const workloadStats = await this.getUserWorkloadStats(eligibleUsers.map(u => u.id), tx);

    // Calculate optimal assignment distribution
    const optimalAssignments = this.calculateOptimalAssignments(
      eligibleUsers,
      workloadStats,
      requiredApprovals
    );

    for (const assignment of optimalAssignments) {
      await tx.workflowAssignment.create({
        data: {
          stageInstanceId: stageInstance.id,
          assignedToId: assignment.userId,
          assignedToRole: assignment.role,
          assignmentType: 'LOAD_BALANCED',
          assignedAt: new Date(),
          dueDate: this.calculateStageDeadline(stage.deadlineHours),
          escalationLevel: 0,
          loadBalanceWeight: assignment.weight
        }
      });
    }
  }

  /**
   * ✅ PHASE 5B: Create traditional role-based assignments
   */
  private async createRoleBasedAssignments(stageInstance: any, stage: any, tx: any): Promise<void> {
    logger.info(`Creating role-based assignments for stage ${stageInstance.id}`);

    // Create assignments based on stage configuration
    for (const role of stage.requiredRoles) {
      const users = await this.getUsersByRole(role, tx);

      // For role-based, assign to all users in the role
      for (const user of users) {
        await tx.workflowAssignment.create({
          data: {
            stageInstanceId: stageInstance.id,
            assignedToId: user.id,
            assignedToRole: role,
            assignmentType: 'REQUIRED',
            assignedAt: new Date(),
            dueDate: this.calculateStageDeadline(stage.deadlineHours),
            escalationLevel: 0
          }
        });
      }
    }

    for (const role of stage.optionalRoles || []) {
      const users = await this.getUsersByRole(role, tx);

      for (const user of users) {
        await tx.workflowAssignment.create({
          data: {
            stageInstanceId: stageInstance.id,
            assignedToId: user.id,
            assignedToRole: role,
            assignmentType: 'OPTIONAL',
            assignedAt: new Date(),
            dueDate: this.calculateStageDeadline(stage.deadlineHours),
            escalationLevel: 0
          }
        });
      }
    }
  }

  /**
   * ✅ PHASE 5B: Initialize parallel coordination metadata
   * TODO: Commented out because workflowParallelCoordination table doesn't exist in schema
   */
  private async initializeParallelCoordination(stageInstanceId: string, tx: any): Promise<void> {
    // TODO: Re-enable this when workflowParallelCoordination table is added to schema
    /*
    const assignments = await tx.workflowAssignment.findMany({
      where: { stageInstanceId }
    });

    // Group assignments by parallel group
    const parallelGroups = new Map<string, any[]>();
    for (const assignment of assignments) {
      const group = assignment.parallelGroup || 'DEFAULT';
      if (!parallelGroups.has(group)) {
        parallelGroups.set(group, []);
      }
      parallelGroups.get(group)!.push(assignment);
    }

    // Create coordination records for each parallel group
    for (const [groupName, groupAssignments] of parallelGroups) {
      await tx.workflowParallelCoordination.create({
        data: {
          stageInstanceId,
          parallelGroup: groupName,
          totalAssignments: groupAssignments.length,
          completedAssignments: 0,
          approvedAssignments: 0,
          rejectedAssignments: 0,
          coordinationStatus: 'ACTIVE',
          coordinationMetadata: {
            assignmentIds: groupAssignments.map(a => a.id),
            groupType: groupAssignments[0]?.assignmentType || 'UNKNOWN',
            createdAt: new Date().toISOString()
          }
        }
      });
    }
    */

    // For now, just return without doing anything
    return Promise.resolve();
  }

  /**
   * ✅ PHASE 5B: Enhanced stage completion evaluation with parallel coordination
   */
  private async evaluateStageCompletion(stageInstance: any): Promise<{
    isComplete: boolean;
    isRejected: boolean;
    outcome?: 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
  }> {
    const stage = stageInstance.stage;
    const assignments = stageInstance.assignments;

    // Get parallel coordination data
    const parallelCoordination = await this.getParallelCoordinationData(stageInstance.id);

    // Enhanced evaluation considering parallel groups
    const evaluationResult = await this.evaluateParallelCompletion(
      stage,
      assignments,
      parallelCoordination
    );

    if (evaluationResult.isComplete || evaluationResult.isRejected) {
      // Update parallel coordination status
      await this.updateParallelCoordinationStatus(
        stageInstance.id,
        evaluationResult.isComplete ? 'COMPLETED' : 'REJECTED'
      );
    }

    return evaluationResult;
  }

  /**
   * ✅ PHASE 5B: Evaluate parallel completion across groups
   */
  private async evaluateParallelCompletion(
    stage: any,
    assignments: any[],
    parallelCoordination: any[]
  ): Promise<{
    isComplete: boolean;
    isRejected: boolean;
    outcome?: 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
  }> {
    logger.info(`Evaluating parallel completion`, {
      stageId: stage.id,
      approvalType: stage.approvalType,
      parallelGroups: parallelCoordination.length,
      totalAssignments: assignments.length
    });

    // Group-based evaluation for parallel workflows
    const groupResults = new Map<string, any>();

    for (const coordination of parallelCoordination) {
      const groupAssignments = assignments.filter(a =>
        coordination.coordinationMetadata?.assignmentIds?.includes(a.id)
      );

      const groupEvaluation = this.evaluateParallelGroup(
        stage,
        groupAssignments,
        coordination
      );

      groupResults.set(coordination.parallelGroup, groupEvaluation);
    }

    // Apply stage-level approval logic considering parallel groups
    return this.applyParallelStageLogic(stage, groupResults);
  }

  /**
   * ✅ PHASE 5B: Evaluate a single parallel group
   */
  private evaluateParallelGroup(stage: any, assignments: any[], coordination: any): any {
    const approvals = assignments.filter((a: any) => a.action === 'APPROVED');
    const rejections = assignments.filter((a: any) => a.action === 'REJECTED');
    const pending = assignments.filter((a: any) => !a.action);

    const groupType = coordination.coordinationMetadata?.groupType || 'UNKNOWN';

    // Different logic based on group type
    switch (groupType) {
      case 'PARALLEL_REQUIRED':
        return {
          isComplete: approvals.length >= Math.ceil(assignments.length * 0.6), // 60% threshold
          isRejected: rejections.length > assignments.length * 0.4, // 40% rejection threshold
          approvalRatio: approvals.length / assignments.length,
          groupType
        };

      case 'PARALLEL_ROLE_GROUP':
        return {
          isComplete: approvals.length > 0, // Any approval in role group
          isRejected: rejections.length === assignments.length && assignments.length > 0,
          approvalRatio: approvals.length / assignments.length,
          groupType
        };

      case 'LOAD_BALANCED':
        const weightedApprovals = approvals.reduce((sum: number, a: any) =>
          sum + (a.loadBalanceWeight || 1), 0);
        const totalWeight = assignments.reduce((sum: number, a: any) =>
          sum + (a.loadBalanceWeight || 1), 0);

        return {
          isComplete: weightedApprovals >= totalWeight * 0.5, // 50% weighted threshold
          isRejected: false, // Load balanced rarely rejects
          approvalRatio: weightedApprovals / totalWeight,
          groupType
        };

      default:
        return {
          isComplete: approvals.length >= (stage.minimumApprovals || 1),
          isRejected: rejections.length > assignments.length - (stage.minimumApprovals || 1),
          approvalRatio: approvals.length / assignments.length,
          groupType
        };
    }
  }

  /**
   * ✅ PHASE 5B: Apply stage-level logic considering all parallel groups
   */
  private applyParallelStageLogic(stage: any, groupResults: Map<string, any>): {
    isComplete: boolean;
    isRejected: boolean;
    outcome?: 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
  } {
    const requiredGroups = Array.from(groupResults.values()).filter(g =>
      g.groupType?.includes('REQUIRED') || g.groupType === 'ROLE_BASED'
    );

    const optionalGroups = Array.from(groupResults.values()).filter(g =>
      g.groupType?.includes('OPTIONAL')
    );

    // Check if all required groups are complete
    const requiredComplete = requiredGroups.every(g => g.isComplete);
    const anyRejected = Array.from(groupResults.values()).some(g => g.isRejected);

    // Apply approval type logic
    switch (stage.approvalType) {
      case 'UNANIMOUS':
        if (anyRejected) {
          return {
            isComplete: false,
            isRejected: true,
            outcome: 'REJECTED',
            rejectionReason: 'Unanimous approval required but parallel groups contain rejections'
          };
        }
        return {
          isComplete: requiredComplete,
          isRejected: false,
          outcome: requiredComplete ? 'APPROVED' : undefined
        };

      case 'MAJORITY':
        const completeGroups = Array.from(groupResults.values()).filter(g => g.isComplete);
        const totalGroups = groupResults.size;
        const majority = Math.ceil(totalGroups / 2);

        return {
          isComplete: completeGroups.length >= majority,
          isRejected: false,
          outcome: completeGroups.length >= majority ? 'APPROVED' : undefined
        };

      case 'THRESHOLD':
        const threshold = stage.approvalThreshold || 50;
        const overallApprovalRatio = Array.from(groupResults.values())
          .reduce((sum, g) => sum + g.approvalRatio, 0) / groupResults.size;

        return {
          isComplete: (overallApprovalRatio * 100) >= threshold,
          isRejected: false,
          outcome: (overallApprovalRatio * 100) >= threshold ? 'APPROVED' : undefined
        };

      case 'MINIMUM':
        return {
          isComplete: requiredComplete,
          isRejected: false,
          outcome: requiredComplete ? 'APPROVED' : undefined
        };

      case 'ANY':
        const anyComplete = Array.from(groupResults.values()).some(g => g.isComplete);
        return {
          isComplete: anyComplete,
          isRejected: false,
          outcome: anyComplete ? 'APPROVED' : undefined
        };

      default:
        return {
          isComplete: requiredComplete,
          isRejected: anyRejected,
          outcome: requiredComplete ? 'APPROVED' : anyRejected ? 'REJECTED' : undefined
        };
    }
  }

  // ============================================================================
  // Phase 5B: Helper Methods for Parallel Coordination
  // ============================================================================

  /**
   * Get eligible users for roles (placeholder implementation)
   */
  private async getEligibleUsers(roles: string[], tx: any): Promise<any[]> {
    // TODO: Implement actual user lookup by roles
    // For now, return mock users
    return roles.flatMap(role => [
      { id: `user-${role}-1`, primaryRole: role, name: `User ${role} 1` },
      { id: `user-${role}-2`, primaryRole: role, name: `User ${role} 2` }
    ]);
  }

  /**
   * Get users by specific role (placeholder implementation)
   */
  private async getUsersByRole(role: string, tx: any): Promise<any[]> {
    // TODO: Implement actual user lookup by role
    return [
      { id: `user-${role}-1`, primaryRole: role, name: `User ${role} 1` },
      { id: `user-${role}-2`, primaryRole: role, name: `User ${role} 2` }
    ];
  }

  /**
   * Get user workload statistics for load balancing
   */
  private async getUserWorkloadStats(userIds: string[], tx: any): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const userId of userIds) {
      const activeAssignments = await tx.workflowAssignment.count({
        where: {
          assignedToId: userId,
          action: null // Pending assignments
        }
      });

      stats[userId] = {
        activeAssignments,
        averageResponseTime: 24, // Mock data
        completionRate: 0.85     // Mock data
      };
    }

    return stats;
  }

  /**
   * Calculate optimal assignment distribution for load balancing
   */
  private calculateOptimalAssignments(
    users: any[],
    workloadStats: Record<string, any>,
    requiredApprovals: number
  ): any[] {
    // Sort users by workload and performance metrics
    const sortedUsers = users.sort((a, b) => {
      const aStats = workloadStats[a.id] || { activeAssignments: 0, completionRate: 0.5 };
      const bStats = workloadStats[b.id] || { activeAssignments: 0, completionRate: 0.5 };

      // Weight = (1 / (activeAssignments + 1)) * completionRate
      const aWeight = (1 / (aStats.activeAssignments + 1)) * aStats.completionRate;
      const bWeight = (1 / (bStats.activeAssignments + 1)) * bStats.completionRate;

      return bWeight - aWeight; // Descending order
    });

    // Assign to top N users based on required approvals
    const assignments = [];
    const assignCount = Math.min(requiredApprovals + 1, sortedUsers.length); // +1 for redundancy

    for (let i = 0; i < assignCount; i++) {
      const user = sortedUsers[i];
      const stats = workloadStats[user.id] || { activeAssignments: 0, completionRate: 0.5 };

      assignments.push({
        userId: user.id,
        role: user.primaryRole,
        priority: i + 1,
        weight: (1 / (stats.activeAssignments + 1)) * stats.completionRate
      });
    }

    return assignments;
  }

  /**
   * Get parallel coordination data for a stage
   */
  private async getParallelCoordinationData(stageInstanceId: string): Promise<any[]> {
    return await this.prisma.workflowParallelCoordination.findMany({
      where: { stageInstanceId }
    });
  }

  /**
   * Update parallel coordination status
   */
  private async updateParallelCoordinationStatus(
    stageInstanceId: string,
    status: 'ACTIVE' | 'COMPLETED' | 'REJECTED'
  ): Promise<void> {
    await this.prisma.workflowParallelCoordination.updateMany({
      where: { stageInstanceId },
      data: { coordinationStatus: status }
    });
  }

  /**
   * ✅ PHASE 5A: Update workflow progress
   */
  private async updateWorkflowProgress(workflowInstanceId: string, tx: any): Promise<void> {
    const stageInstances = await tx.workflowStageInstance.findMany({
      where: { workflowInstanceId }
    });

    const progress = this.calculateEnhancedProgress(stageInstances);

    await tx.workflowInstance.update({
      where: { id: workflowInstanceId },
      data: { progressPercentage: progress }
    });
  }

  /**
   * ✅ PHASE 5A: Calculate stage deadline
   */
  private calculateStageDeadline(deadlineHours?: number): Date {
    const hours = deadlineHours || 24; // Default 24 hours
    return new Date(Date.now() + hours * 60 * 60 * 1000);
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
      stageInstances: instance.stageInstances?.map(s => this.mapStageInstanceResponse(s)) || [],
      history: instance.history?.map(h => this.mapHistoryResponse(h)) || [],
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
      assignments: stage.assignments?.map(a => this.mapAssignmentResponse(a)) || [],
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

  /**
   * ✅ PHASE 5A: Enhanced progress calculation with partial stage completion
   */
  private calculateProgress(stages: any[]): number {
    return this.calculateEnhancedProgress(stages);
  }

  /**
   * ✅ PHASE 5A: Calculate enhanced progress considering partial completion
   */
  private calculateEnhancedProgress(stages: any[]): number {
    if (!stages.length) return 0;

    let totalWeight = 0;
    let completedWeight = 0;

    for (const stage of stages) {
      const stageWeight = 1; // Equal weight for all stages

      totalWeight += stageWeight;

      if (stage.status === 'COMPLETED') {
        completedWeight += stageWeight;
      } else if (stage.status === 'IN_PROGRESS') {
        // Calculate partial completion based on assignments
        const assignments = stage.assignments || [];
        if (assignments.length > 0) {
          const completedAssignments = assignments.filter((a: any) => a.action);
          const partialCompletion = completedAssignments.length / assignments.length;
          completedWeight += stageWeight * partialCompletion * 0.5; // 50% max for in-progress
        }
      }
      // PENDING and REJECTED stages contribute 0
    }

    return Math.round((completedWeight / totalWeight) * 100);
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

  // ============================================================================
  // ✅ PHASE 6A: Electronic Signature Integration
  // ============================================================================

  /**
   * ✅ PHASE 6A: Process approval action with electronic signature verification
   */
  async processApprovalWithSignature(
    input: ApprovalActionInput,
    signatureInput: CreateSignatureInput,
    performedById: string
  ): Promise<void> {
    try {
      logger.info('Processing approval with electronic signature', {
        assignmentId: input.assignmentId,
        action: input.action,
        userId: signatureInput.userId
      });

      // First verify the signature before processing approval
      const signatureResponse = await this.signatureService.createSignature({
        ...signatureInput,
        signedEntityType: 'workflow_assignment',
        signedEntityId: input.assignmentId,
        signatureReason: `Workflow approval: ${input.action}`,
        signedDocument: {
          assignmentId: input.assignmentId,
          action: input.action,
          notes: input.notes,
          timestamp: new Date()
        }
      });

      logger.info('Electronic signature created successfully', {
        signatureId: signatureResponse.id,
        signatureHash: signatureResponse.signatureHash
      });

      // Process the approval action (existing logic)
      await this.processApprovalAction(input, performedById);

      // Store signature reference in assignment
      await this.prisma.workflowAssignment.update({
        where: { id: input.assignmentId },
        data: {
          metadata: {
            ...((await this.prisma.workflowAssignment.findUnique({
              where: { id: input.assignmentId },
              select: { metadata: true }
            }))?.metadata as any || {}),
            signatureId: signatureResponse.id,
            signatureHash: signatureResponse.signatureHash,
            signatureTimestamp: signatureResponse.timestamp
          }
        }
      });

      logger.info('Approval with signature processed successfully', {
        assignmentId: input.assignmentId,
        signatureId: signatureResponse.id
      });
    } catch (error: any) {
      logger.error('Failed to process approval with signature:', {
        error: error?.message || 'Unknown error',
        input,
        signatureInput
      });
      throw new WorkflowEngineError('Failed to process approval with signature', 'SIGNATURE_APPROVAL_ERROR', error);
    }
  }

  /**
   * ✅ PHASE 6A: Check if signature is required for workflow assignment
   */
  async isSignatureRequired(assignmentId: string): Promise<boolean> {
    try {
      const assignment = await this.prisma.workflowAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          stageInstance: {
            include: {
              stage: true,
              workflowInstance: {
                include: {
                  workflowDefinition: true
                }
              }
            }
          }
        }
      });

      if (!assignment) {
        throw new WorkflowValidationError(`Assignment ${assignmentId} not found`);
      }

      // Check if stage requires signature
      const stage = assignment.stageInstance.stage;
      const workflowDefinition = assignment.stageInstance.workflowInstance.workflowDefinition;

      // Check stage-level signature requirement
      if (stage.metadata && typeof stage.metadata === 'object') {
        const stageMetadata = stage.metadata as any;
        if (stageMetadata.requireSignature === true) {
          return true;
        }
      }

      // Check workflow-level signature requirement
      if (workflowDefinition.metadata && typeof workflowDefinition.metadata === 'object') {
        const workflowMetadata = workflowDefinition.metadata as any;
        if (workflowMetadata.requireSignature === true) {
          return true;
        }
      }

      // Check assignment-level signature requirement
      if (assignment.metadata && typeof assignment.metadata === 'object') {
        const assignmentMetadata = assignment.metadata as any;
        if (assignmentMetadata.requireSignature === true) {
          return true;
        }
      }

      return false;
    } catch (error: any) {
      logger.error('Error checking signature requirement:', {
        error: error?.message || 'Unknown error',
        assignmentId
      });
      throw new WorkflowEngineError('Failed to check signature requirement', 'SIGNATURE_CHECK_ERROR', error);
    }
  }

  /**
   * ✅ PHASE 6A: Get signature details for workflow assignment
   */
  async getAssignmentSignature(assignmentId: string): Promise<any | null> {
    try {
      const assignment = await this.prisma.workflowAssignment.findUnique({
        where: { id: assignmentId },
        select: { metadata: true }
      });

      if (!assignment?.metadata) {
        return null;
      }

      const metadata = assignment.metadata as any;
      const signatureId = metadata.signatureId;

      if (!signatureId) {
        return null;
      }

      // Get signature details from ElectronicSignatureService
      const signatureDetails = await this.signatureService.getSignatureById(signatureId);

      return {
        signatureId,
        signatureHash: metadata.signatureHash,
        signatureTimestamp: metadata.signatureTimestamp,
        signatureDetails
      };
    } catch (error: any) {
      logger.error('Error getting assignment signature:', {
        error: error?.message || 'Unknown error',
        assignmentId
      });
      return null;
    }
  }

  /**
   * ✅ PHASE 6A: Verify signatures for completed workflow instance
   */
  async verifyWorkflowSignatures(workflowInstanceId: string): Promise<{
    isValid: boolean;
    signatureCount: number;
    invalidSignatures: string[];
    verificationErrors: string[];
  }> {
    try {
      logger.info(`Verifying signatures for workflow ${workflowInstanceId}`);

      const workflowInstance = await this.prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: {
          stageInstances: {
            include: {
              assignments: true
            }
          }
        }
      });

      if (!workflowInstance) {
        throw new WorkflowValidationError(`Workflow instance ${workflowInstanceId} not found`);
      }

      let signatureCount = 0;
      const invalidSignatures: string[] = [];
      const verificationErrors: string[] = [];

      // Check signatures for all assignments
      for (const stageInstance of workflowInstance.stageInstances) {
        for (const assignment of stageInstance.assignments) {
          if (assignment.metadata && typeof assignment.metadata === 'object') {
            const metadata = assignment.metadata as any;
            const signatureId = metadata.signatureId;

            if (signatureId) {
              signatureCount++;

              try {
                const verificationResult = await this.signatureService.verifySignature({
                  signatureId,
                  userId: assignment.assignedToId,
                  signedEntityType: 'workflow_assignment',
                  signedEntityId: assignment.id
                });

                if (!verificationResult.isValid) {
                  invalidSignatures.push(signatureId);
                  verificationErrors.push(
                    verificationResult.error ||
                    verificationResult.invalidationReason ||
                    'Signature verification failed'
                  );
                }
              } catch (error: any) {
                invalidSignatures.push(signatureId);
                verificationErrors.push(`Verification error: ${error?.message || 'Unknown error'}`);
              }
            }
          }
        }
      }

      const isValid = invalidSignatures.length === 0;

      logger.info(`Workflow signature verification completed`, {
        workflowInstanceId,
        signatureCount,
        invalidCount: invalidSignatures.length,
        isValid
      });

      return {
        isValid,
        signatureCount,
        invalidSignatures,
        verificationErrors
      };
    } catch (error: any) {
      logger.error('Error verifying workflow signatures:', {
        error: error?.message || 'Unknown error',
        workflowInstanceId
      });
      throw new WorkflowEngineError('Failed to verify workflow signatures', 'SIGNATURE_VERIFICATION_ERROR', error);
    }
  }

  /**
   * ✅ PHASE 6A: Get all signatures for a workflow instance
   */
  async getWorkflowSignatures(workflowInstanceId: string): Promise<any[]> {
    try {
      const workflowInstance = await this.prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: {
          stageInstances: {
            include: {
              assignments: {
                include: {
                  assignedTo: {
                    select: {
                      id: true,
                      username: true,
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!workflowInstance) {
        throw new WorkflowValidationError(`Workflow instance ${workflowInstanceId} not found`);
      }

      const signatures: any[] = [];

      for (const stageInstance of workflowInstance.stageInstances) {
        for (const assignment of stageInstance.assignments) {
          if (assignment.metadata && typeof assignment.metadata === 'object') {
            const metadata = assignment.metadata as any;
            const signatureId = metadata.signatureId;

            if (signatureId) {
              try {
                const signatureDetails = await this.signatureService.getSignatureById(signatureId);

                signatures.push({
                  assignmentId: assignment.id,
                  stageNumber: stageInstance.stageNumber,
                  stageName: stageInstance.stageName,
                  assignedTo: assignment.assignedTo,
                  action: assignment.action,
                  actionTakenAt: assignment.actionTakenAt,
                  signatureId,
                  signatureHash: metadata.signatureHash,
                  signatureTimestamp: metadata.signatureTimestamp,
                  signatureDetails
                });
              } catch (error: any) {
                logger.error(`Error getting signature details for ${signatureId}:`, {
                  error: error?.message || 'Unknown error'
                });
              }
            }
          }
        }
      }

      return signatures.sort((a, b) => a.stageNumber - b.stageNumber);
    } catch (error: any) {
      logger.error('Error getting workflow signatures:', {
        error: error?.message || 'Unknown error',
        workflowInstanceId
      });
      throw new WorkflowEngineError('Failed to get workflow signatures', 'GET_SIGNATURES_ERROR', error);
    }
  }

  /**
   * ✅ PHASE 6A: Generate signature audit report for workflow
   */
  async generateSignatureAuditReport(workflowInstanceId: string): Promise<{
    workflowInfo: any;
    signatureSummary: any;
    signatureDetails: any[];
    verificationResult: any;
  }> {
    try {
      const workflowInstance = await this.prisma.workflowInstance.findUnique({
        where: { id: workflowInstanceId },
        include: {
          workflowDefinition: true,
          requestedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!workflowInstance) {
        throw new WorkflowValidationError(`Workflow instance ${workflowInstanceId} not found`);
      }

      // Get all signatures
      const signatures = await this.getWorkflowSignatures(workflowInstanceId);

      // Verify all signatures
      const verificationResult = await this.verifyWorkflowSignatures(workflowInstanceId);

      // Generate summary
      const signatureSummary = {
        totalSignatures: signatures.length,
        validSignatures: signatures.length - verificationResult.invalidSignatures.length,
        invalidSignatures: verificationResult.invalidSignatures.length,
        signatureIntegrityStatus: verificationResult.isValid ? 'VERIFIED' : 'COMPROMISED',
        lastSignatureDate: signatures.length > 0
          ? Math.max(...signatures.map(s => new Date(s.signatureTimestamp).getTime()))
          : null
      };

      return {
        workflowInfo: {
          id: workflowInstance.id,
          workflowType: workflowInstance.workflowDefinition.workflowType,
          status: workflowInstance.status,
          priority: workflowInstance.priority,
          requestedBy: workflowInstance.requestedBy,
          createdAt: workflowInstance.createdAt,
          completedAt: workflowInstance.completedAt
        },
        signatureSummary,
        signatureDetails: signatures,
        verificationResult
      };
    } catch (error: any) {
      logger.error('Error generating signature audit report:', {
        error: error?.message || 'Unknown error',
        workflowInstanceId
      });
      throw new WorkflowEngineError('Failed to generate signature audit report', 'AUDIT_REPORT_ERROR', error);
    }
  }
}

export default WorkflowEngineService;