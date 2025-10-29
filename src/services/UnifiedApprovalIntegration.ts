/**
 * ✅ GITHUB ISSUE #147: Core Unified Workflow Engine
 *
 * Unified Approval Integration Service - Consolidates all disparate approval
 * implementations (Work Instructions, FAI, Quality, Documents) into the
 * existing sophisticated workflow engine.
 *
 * This service extends the ECOWorkflowIntegration pattern to provide a
 * single, consistent approval experience across all entity types.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { WorkflowEngineService } from './WorkflowEngineService';
import { WorkflowDefinitionInitializer } from './WorkflowDefinitionInitializer';
import {
  WorkflowType,
  WorkflowStatus,
  ApprovalAction,
  WorkflowInstanceStatus,
  WorkInstructionStatus,
  FAIStatus,
  QualityInspectionStatus,
  ReviewStatus
} from '@prisma/client';
import {
  WorkflowInstanceInput,
  ApprovalActionInput,
  WorkflowInstanceResponse
} from '../types/workflow';

// ============================================================================
// Core Configuration Types
// ============================================================================

export interface UnifiedApprovalConfig {
  workInstructionWorkflowId: string;
  faiReportWorkflowId: string;
  qualityProcessWorkflowId: string;
  documentApprovalWorkflowId: string;
  emergencyApprovalWorkflowId: string;
}

export interface ApprovalEntityMapping {
  entityType: string;
  entityId: string;
  currentStatus: string;
  requiredApproverRoles: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, any>;
}

export interface UnifiedApprovalResult {
  success: boolean;
  workflowInstanceId: string;
  currentStage: string;
  nextApprovers: string[];
  estimatedCompletionTime?: Date;
  requiresSignature: boolean;
}

// ============================================================================
// Core Service Class
// ============================================================================

export class UnifiedApprovalIntegration {
  private prisma: PrismaClient;
  private workflowEngine: WorkflowEngineService;
  private workflowInitializer: WorkflowDefinitionInitializer;
  private cachedWorkflowIds: UnifiedApprovalConfig | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.workflowEngine = new WorkflowEngineService(prisma);
    this.workflowInitializer = new WorkflowDefinitionInitializer(prisma);
  }

  /**
   * Initialize workflow definitions and cache the IDs
   */
  async initialize(createdById: string): Promise<void> {
    try {
      // Check if workflow definitions are already initialized
      const isInitialized = await this.workflowInitializer.areWorkflowDefinitionsInitialized();

      if (!isInitialized) {
        logger.info('Initializing workflow definitions for unified approval system');
        await this.workflowInitializer.initializeAllWorkflowDefinitions(createdById);
      }

      // Cache the workflow IDs
      this.cachedWorkflowIds = await this.workflowInitializer.getWorkflowIds();
      logger.info('Unified approval integration initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize unified approval integration', { error: error.message });
      throw error;
    }
  }

  /**
   * Get workflow configuration (with lazy initialization if needed)
   */
  private async getWorkflowConfig(config?: Partial<UnifiedApprovalConfig>): Promise<UnifiedApprovalConfig> {
    if (!this.cachedWorkflowIds) {
      // Attempt to get workflow IDs from database
      try {
        this.cachedWorkflowIds = await this.workflowInitializer.getWorkflowIds();
      } catch (error) {
        logger.error('Failed to get workflow IDs - system may not be initialized', { error: error.message });
        throw new Error('Unified approval system not initialized. Please call initialize() first.');
      }
    }

    return { ...this.cachedWorkflowIds, ...config };
  }

  // ============================================================================
  // Unified Approval Workflow Initiation
  // ============================================================================

  /**
   * Initiates approval workflow for any entity type
   * Replaces disparate approval logic across all services
   */
  async initiateApproval(
    entityMapping: ApprovalEntityMapping,
    createdById: string,
    config?: Partial<UnifiedApprovalConfig>
  ): Promise<UnifiedApprovalResult> {
    try {
      logger.info(`Initiating unified approval for ${entityMapping.entityType}:${entityMapping.entityId}`, {
        currentStatus: entityMapping.currentStatus,
        priority: entityMapping.priority,
        createdById
      });

      // Determine appropriate workflow based on entity type
      const workflowConfig = await this.getWorkflowConfig(config);
      const workflowId = this.getWorkflowIdForEntityType(entityMapping.entityType, workflowConfig);

      // Check if workflow already exists to prevent duplicates
      const existingWorkflow = await this.findExistingWorkflow(
        entityMapping.entityType,
        entityMapping.entityId
      );

      if (existingWorkflow && existingWorkflow.status === 'IN_PROGRESS') {
        logger.warn(`Active workflow already exists for ${entityMapping.entityType}:${entityMapping.entityId}`);
        return this.buildApprovalResult(existingWorkflow, true);
      }

      // Create workflow instance input
      const workflowInput: WorkflowInstanceInput = {
        workflowId,
        entityType: entityMapping.entityType,
        entityId: entityMapping.entityId,
        priority: entityMapping.priority,
        metadata: {
          ...entityMapping.metadata,
          originalStatus: entityMapping.currentStatus,
          requiredApproverRoles: entityMapping.requiredApproverRoles,
          initiatedAt: new Date().toISOString(),
          unifiedApproval: true
        }
      };

      // Start workflow through unified engine
      const workflowInstance = await this.workflowEngine.startWorkflow(workflowInput, createdById);

      // Update entity status to reflect workflow initiation
      await this.updateEntityStatus(entityMapping, 'REVIEW');

      logger.info(`Successfully initiated workflow ${workflowInstance.id} for ${entityMapping.entityType}:${entityMapping.entityId}`);

      return this.buildApprovalResult(workflowInstance, false);

    } catch (error) {
      logger.error('Failed to initiate unified approval workflow', {
        entityType: entityMapping.entityType,
        entityId: entityMapping.entityId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Processes approval actions (approve/reject/delegate) for any entity type
   * Replaces individual approval methods across all services
   */
  async processApprovalAction(
    entityType: string,
    entityId: string,
    action: ApprovalAction,
    userId: string,
    comments?: string,
    signatureData?: any
  ): Promise<UnifiedApprovalResult> {
    try {
      logger.info(`Processing approval action ${action} for ${entityType}:${entityId}`, {
        userId,
        hasComments: !!comments,
        hasSignature: !!signatureData
      });

      // Find active workflow for this entity
      const workflowInstance = await this.findExistingWorkflow(entityType, entityId);
      if (!workflowInstance || workflowInstance.status !== 'IN_PROGRESS') {
        throw new Error(`No active workflow found for ${entityType}:${entityId}`);
      }

      // Find the user's assignment in the current workflow
      const userAssignment = await this.findUserAssignmentInWorkflow(workflowInstance.id, userId);
      if (!userAssignment) {
        throw new Error(`No assignment found for user ${userId} in workflow ${workflowInstance.id}`);
      }

      // Create approval action input
      const approvalInput: ApprovalActionInput = {
        assignmentId: userAssignment.id,
        action,
        comments: comments || '',
        metadata: {
          entityType,
          entityId,
          processedAt: new Date().toISOString()
        }
      };

      // Process through workflow engine (with signature if provided)
      let result;
      if (signatureData) {
        result = await this.workflowEngine.processApprovalWithSignature(
          approvalInput,
          signatureData,
          userId
        );
      } else {
        result = await this.workflowEngine.processApproval(approvalInput, userId);
      }

      // Check if workflow is completed
      const updatedWorkflow = await this.workflowEngine.getWorkflowInstance(workflowInstance.id);

      if (updatedWorkflow.status === 'COMPLETED') {
        await this.handleWorkflowCompletion(entityType, entityId, 'APPROVED');
      } else if (updatedWorkflow.status === 'REJECTED') {
        await this.handleWorkflowCompletion(entityType, entityId, 'REJECTED');
      }

      return this.buildApprovalResult(updatedWorkflow, false);

    } catch (error) {
      logger.error('Failed to process approval action', {
        entityType,
        entityId,
        action,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  // ============================================================================
  // Entity-Specific Integration Methods
  // ============================================================================

  /**
   * Work Instruction approval integration
   */
  async approveWorkInstruction(
    workInstructionId: string,
    userId: string,
    comments?: string,
    requiresSignature: boolean = false
  ): Promise<UnifiedApprovalResult> {
    const mapping: ApprovalEntityMapping = {
      entityType: 'WORK_INSTRUCTION',
      entityId: workInstructionId,
      currentStatus: 'PENDING_REVIEW',
      requiredApproverRoles: ['quality_manager', 'process_engineer'],
      priority: 'MEDIUM',
      metadata: { requiresSignature }
    };

    if (requiresSignature) {
      // Handle signature requirement
      const signatureData = await this.prepareSignatureData(userId, 'work_instruction_approval');
      return this.processApprovalAction('WORK_INSTRUCTION', workInstructionId, 'APPROVE', userId, comments, signatureData);
    }

    return this.processApprovalAction('WORK_INSTRUCTION', workInstructionId, 'APPROVE', userId, comments);
  }

  /**
   * FAI Report approval integration
   */
  async approveFAIReport(
    faiId: string,
    userId: string,
    comments?: string,
    requiresSignature: boolean = true // FAI typically requires signatures
  ): Promise<UnifiedApprovalResult> {
    const mapping: ApprovalEntityMapping = {
      entityType: 'FAI_REPORT',
      entityId: faiId,
      currentStatus: 'REVIEW',
      requiredApproverRoles: ['quality_manager', 'customer_representative'],
      priority: 'HIGH',
      metadata: { requiresSignature, regulatoryCompliance: true }
    };

    const signatureData = requiresSignature
      ? await this.prepareSignatureData(userId, 'fai_approval')
      : undefined;

    return this.processApprovalAction('FAI_REPORT', faiId, 'APPROVE', userId, comments, signatureData);
  }

  /**
   * Quality Process approval integration
   */
  async approveQualityProcess(
    qualityProcessId: string,
    userId: string,
    comments?: string
  ): Promise<UnifiedApprovalResult> {
    const mapping: ApprovalEntityMapping = {
      entityType: 'QUALITY_PROCESS',
      entityId: qualityProcessId,
      currentStatus: 'PENDING_APPROVAL',
      requiredApproverRoles: ['quality_manager'],
      priority: 'MEDIUM'
    };

    return this.processApprovalAction('QUALITY_PROCESS', qualityProcessId, 'APPROVE', userId, comments);
  }

  /**
   * Document approval integration
   */
  async approveDocument(
    documentId: string,
    userId: string,
    comments?: string,
    requiresSignature: boolean = false
  ): Promise<UnifiedApprovalResult> {
    const mapping: ApprovalEntityMapping = {
      entityType: 'DOCUMENT',
      entityId: documentId,
      currentStatus: 'UNDER_REVIEW',
      requiredApproverRoles: ['document_controller', 'department_manager'],
      priority: 'LOW'
    };

    const signatureData = requiresSignature
      ? await this.prepareSignatureData(userId, 'document_approval')
      : undefined;

    return this.processApprovalAction('DOCUMENT', documentId, 'APPROVE', userId, comments, signatureData);
  }

  // ============================================================================
  // Unified Status and Progress Tracking
  // ============================================================================

  /**
   * Get unified approval status for any entity
   */
  async getApprovalStatus(entityType: string, entityId: string): Promise<{
    hasActiveWorkflow: boolean;
    workflowStatus?: WorkflowStatus;
    currentStage?: string;
    pendingApprovers?: string[];
    completionPercentage?: number;
    estimatedCompletion?: Date;
  }> {
    const workflow = await this.findExistingWorkflow(entityType, entityId);

    if (!workflow) {
      return { hasActiveWorkflow: false };
    }

    const progress = await this.workflowEngine.getApprovalProgress(workflow.id);

    return {
      hasActiveWorkflow: true,
      workflowStatus: workflow.status,
      currentStage: progress.currentStage?.name,
      pendingApprovers: progress.pendingApprovers,
      completionPercentage: progress.completionPercentage,
      estimatedCompletion: progress.estimatedCompletion
    };
  }

  /**
   * Get all pending approvals for a user across all entity types
   */
  async getPendingApprovalsForUser(userId: string): Promise<Array<{
    entityType: string;
    entityId: string;
    entityName?: string;
    workflowId: string;
    stageName: string;
    priority: string;
    assignedAt: Date;
    deadline?: Date;
  }>> {
    const tasks = await this.workflowEngine.getMyTasks(userId, {
      status: 'ASSIGNED',
      includeMetadata: true
    });

    return tasks.map(task => ({
      entityType: task.workflowInstance?.entityType || 'UNKNOWN',
      entityId: task.workflowInstance?.entityId || '',
      entityName: task.workflowInstance?.metadata?.entityName,
      workflowId: task.workflowInstance?.id || '',
      stageName: task.stage?.name || '',
      priority: task.workflowInstance?.priority || 'MEDIUM',
      assignedAt: task.assignedAt,
      deadline: task.deadline
    }));
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Find a user's pending assignment in a workflow
   */
  private async findUserAssignmentInWorkflow(workflowInstanceId: string, userId: string): Promise<any> {
    return await this.prisma.workflowAssignment.findFirst({
      where: {
        stageInstance: {
          workflowInstanceId: workflowInstanceId
        },
        assignedToId: userId,
        action: null // Assignment hasn't been completed yet
      },
      include: {
        stageInstance: {
          include: {
            stage: true
          }
        }
      }
    });
  }

  private getWorkflowIdForEntityType(entityType: string, config: UnifiedApprovalConfig): string {
    switch (entityType.toUpperCase()) {
      case 'WORK_INSTRUCTION':
        return config.workInstructionWorkflowId;
      case 'FAI_REPORT':
        return config.faiReportWorkflowId;
      case 'QUALITY_PROCESS':
        return config.qualityProcessWorkflowId;
      case 'DOCUMENT':
        return config.documentApprovalWorkflowId;
      default:
        logger.warn(`Unknown entity type ${entityType}, using emergency workflow`);
        return config.emergencyApprovalWorkflowId;
    }
  }

  private async findExistingWorkflow(entityType: string, entityId: string): Promise<WorkflowInstanceResponse | null> {
    try {
      const instance = await this.prisma.workflowInstance.findUnique({
        where: {
          entityType_entityId: {
            entityType,
            entityId
          }
        },
        include: {
          workflow: true,
          stageInstances: {
            include: {
              stage: true,
              assignments: true
            }
          }
        }
      });

      return instance as any; // Type assertion since Prisma types are complex
    } catch (error) {
      logger.error('Failed to find existing workflow', { entityType, entityId, error: error.message });
      return null;
    }
  }

  private async updateEntityStatus(mapping: ApprovalEntityMapping, newStatus: string): Promise<void> {
    try {
      switch (mapping.entityType.toUpperCase()) {
        case 'WORK_INSTRUCTION':
          await this.prisma.workInstruction.update({
            where: { id: mapping.entityId },
            data: { status: newStatus as WorkInstructionStatus }
          });
          break;
        case 'FAI_REPORT':
          await this.prisma.fAI.update({
            where: { id: mapping.entityId },
            data: { status: newStatus as FAIStatus }
          });
          break;
        case 'QUALITY_PROCESS':
          await this.prisma.qualityInspection.update({
            where: { id: mapping.entityId },
            data: { status: newStatus as QualityInspectionStatus }
          });
          break;
        case 'DOCUMENT':
          await this.prisma.review.update({
            where: { id: mapping.entityId },
            data: { status: newStatus as ReviewStatus }
          });
          break;
        default:
          logger.warn(`Cannot update status for unknown entity type: ${mapping.entityType}`);
      }
    } catch (error) {
      logger.error('Failed to update entity status', {
        entityType: mapping.entityType,
        entityId: mapping.entityId,
        newStatus,
        error: error.message
      });
      // Don't throw - entity status update failure shouldn't break workflow
    }
  }

  private async handleWorkflowCompletion(entityType: string, entityId: string, finalStatus: 'APPROVED' | 'REJECTED'): Promise<void> {
    const statusMapping = {
      'WORK_INSTRUCTION': finalStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      'FAI_REPORT': finalStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      'QUALITY_PROCESS': finalStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      'DOCUMENT': finalStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED'
    };

    const newStatus = statusMapping[entityType.toUpperCase()] || finalStatus;

    await this.updateEntityStatus({
      entityType,
      entityId,
      currentStatus: '',
      requiredApproverRoles: [],
      priority: 'MEDIUM'
    }, newStatus);

    logger.info(`Workflow completed for ${entityType}:${entityId} with status ${finalStatus}`);
  }

  private async prepareSignatureData(userId: string, signatureType: string): Promise<any> {
    // This would integrate with the ElectronicSignatureService
    // For now, return a placeholder structure
    return {
      userId,
      signatureType,
      timestamp: new Date(),
      metadata: {
        ipAddress: 'system', // Would get real IP
        userAgent: 'unified-approval-system'
      }
    };
  }

  private buildApprovalResult(workflowInstance: any, isExisting: boolean): UnifiedApprovalResult {
    return {
      success: true,
      workflowInstanceId: workflowInstance.id,
      currentStage: workflowInstance.stages?.[0]?.stage?.name || 'Initial Review',
      nextApprovers: workflowInstance.stages?.[0]?.assignments?.map((a: any) => a.user.email) || [],
      estimatedCompletionTime: workflowInstance.estimatedCompletionTime,
      requiresSignature: workflowInstance.metadata?.requiresSignature || false
    };
  }
}