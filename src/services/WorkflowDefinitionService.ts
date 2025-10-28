/**
 * ✅ GITHUB ISSUE #21: Advanced Multi-Stage Approval Workflow Engine
 *
 * WorkflowDefinitionService - Service for managing workflow definitions,
 * templates, stages, rules, and versioning
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  WorkflowDefinitionInput,
  WorkflowDefinitionUpdate,
  WorkflowStructure,
  WorkflowStageConfig,
  WorkflowRuleInput,
  WorkflowTemplateInput,
  WorkflowTemplateResponse,
  WorkflowEngineError,
  WorkflowValidationError
} from '../types/workflow';
import {
  WorkflowType,
  ApprovalType,
  AssignmentStrategy,
  ConditionOperator,
  RuleActionType
} from '@prisma/client';

export class WorkflowDefinitionService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // Workflow Definition Management
  // ============================================================================

  /**
   * Create a new workflow definition
   */
  async createWorkflow(
    input: WorkflowDefinitionInput,
    createdById: string
  ): Promise<any> {
    try {
      logger.info(`Creating workflow definition: ${input.name}`, {
        workflowType: input.workflowType,
        createdById
      });

      // Validate workflow structure
      this.validateWorkflowStructure(input.structure);

      const workflow = await this.prisma.$transaction(async (tx) => {
        // Create workflow definition
        const definition = await tx.workflowDefinition.create({
          data: {
            name: input.name,
            description: input.description,
            workflowType: input.workflowType,
            version: input.version || '1.0.0',
            structure: input.structure,
            isActive: input.isActive ?? true,
            isTemplate: input.isTemplate ?? false,
            createdById,
            updatedById: createdById
          }
        });

        // Create stages
        for (const stageConfig of input.structure.stages) {
          await tx.workflowStage.create({
            data: {
              workflowId: definition.id,
              stageNumber: stageConfig.stageNumber,
              stageName: stageConfig.stageName,
              description: stageConfig.description,
              approvalType: stageConfig.approvalType,
              minimumApprovals: stageConfig.minimumApprovals,
              approvalThreshold: stageConfig.approvalThreshold,
              requiredRoles: stageConfig.requiredRoles,
              optionalRoles: stageConfig.optionalRoles,
              assignmentStrategy: stageConfig.assignmentStrategy,
              deadlineHours: stageConfig.deadlineHours,
              escalationRules: stageConfig.escalationRules || [],
              allowDelegation: stageConfig.allowDelegation,
              allowSkip: stageConfig.allowSkip,
              skipConditions: stageConfig.skipConditions || [],
              requiresSignature: stageConfig.requiresSignature,
              signatureType: stageConfig.signatureType
            }
          });
        }

        return definition;
      });

      logger.info(`Workflow definition created successfully: ${workflow.id}`);
      return workflow;
    } catch (error: any) {
      logger.error('Failed to create workflow definition:', {
        error: error?.message || 'Unknown error',
        input,
        createdById
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to create workflow definition', 'CREATE_WORKFLOW_ERROR', error);
    }
  }

  /**
   * Update an existing workflow definition
   */
  async updateWorkflow(
    id: string,
    updates: WorkflowDefinitionUpdate,
    updatedById: string
  ): Promise<any> {
    try {
      logger.info(`Updating workflow definition: ${id}`, { updatedById });

      const existing = await this.prisma.workflowDefinition.findUnique({
        where: { id },
        include: { instances: { where: { status: 'IN_PROGRESS' } } }
      });

      if (!existing) {
        throw new WorkflowValidationError('Workflow definition not found');
      }

      // Check if there are active instances
      if (existing.instances.length > 0 && updates.structure) {
        throw new WorkflowValidationError(
          'Cannot modify workflow structure while instances are in progress'
        );
      }

      if (updates.structure) {
        this.validateWorkflowStructure(updates.structure);
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        const workflow = await tx.workflowDefinition.update({
          where: { id },
          data: {
            name: updates.name,
            description: updates.description,
            isActive: updates.isActive,
            structure: updates.structure,
            updatedById
          }
        });

        // If structure changed, recreate stages
        if (updates.structure) {
          await tx.workflowStage.deleteMany({
            where: { workflowId: id }
          });

          for (const stageConfig of updates.structure.stages) {
            await tx.workflowStage.create({
              data: {
                workflowId: id,
                stageNumber: stageConfig.stageNumber,
                stageName: stageConfig.stageName,
                description: stageConfig.description,
                approvalType: stageConfig.approvalType,
                minimumApprovals: stageConfig.minimumApprovals,
                approvalThreshold: stageConfig.approvalThreshold,
                requiredRoles: stageConfig.requiredRoles,
                optionalRoles: stageConfig.optionalRoles,
                assignmentStrategy: stageConfig.assignmentStrategy,
                deadlineHours: stageConfig.deadlineHours,
                escalationRules: stageConfig.escalationRules || [],
                allowDelegation: stageConfig.allowDelegation,
                allowSkip: stageConfig.allowSkip,
                skipConditions: stageConfig.skipConditions || [],
                requiresSignature: stageConfig.requiresSignature,
                signatureType: stageConfig.signatureType
              }
            });
          }
        }

        return workflow;
      });

      logger.info(`Workflow definition updated successfully: ${id}`);
      return updated;
    } catch (error: any) {
      logger.error('Failed to update workflow definition:', {
        error: error?.message || 'Unknown error',
        id,
        updates,
        updatedById
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to update workflow definition', 'UPDATE_WORKFLOW_ERROR', error);
    }
  }

  /**
   * Create a new version of a workflow
   */
  async versionWorkflow(id: string, createdById: string): Promise<any> {
    try {
      logger.info(`Creating new version of workflow: ${id}`, { createdById });

      const original = await this.prisma.workflowDefinition.findUnique({
        where: { id },
        include: { stages: { orderBy: { stageNumber: 'asc' } } }
      });

      if (!original) {
        throw new WorkflowValidationError('Workflow definition not found');
      }

      // Parse current version and increment
      const currentVersion = original.version;
      const newVersion = this.incrementVersion(currentVersion);

      // Deactivate the original
      await this.prisma.workflowDefinition.update({
        where: { id },
        data: { isActive: false }
      });

      // Create new version
      const newWorkflow = await this.createWorkflow({
        name: original.name,
        description: original.description,
        workflowType: original.workflowType,
        version: newVersion,
        structure: original.structure as WorkflowStructure,
        isActive: true,
        isTemplate: original.isTemplate
      }, createdById);

      logger.info(`New workflow version created: ${newWorkflow.id} (v${newVersion})`);
      return newWorkflow;
    } catch (error: any) {
      logger.error('Failed to version workflow:', {
        error: error?.message || 'Unknown error',
        id,
        createdById
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to version workflow', 'VERSION_WORKFLOW_ERROR', error);
    }
  }

  /**
   * Activate a workflow definition
   */
  async activateWorkflow(id: string, updatedById: string): Promise<any> {
    try {
      logger.info(`Activating workflow: ${id}`, { updatedById });

      const workflow = await this.prisma.workflowDefinition.update({
        where: { id },
        data: {
          isActive: true,
          updatedById
        }
      });

      logger.info(`Workflow activated successfully: ${id}`);
      return workflow;
    } catch (error: any) {
      logger.error('Failed to activate workflow:', {
        error: error?.message || 'Unknown error',
        id,
        updatedById
      });
      throw new WorkflowEngineError('Failed to activate workflow', 'ACTIVATE_WORKFLOW_ERROR', error);
    }
  }

  /**
   * Deactivate a workflow definition
   */
  async deactivateWorkflow(id: string, updatedById: string): Promise<any> {
    try {
      logger.info(`Deactivating workflow: ${id}`, { updatedById });

      const workflow = await this.prisma.workflowDefinition.update({
        where: { id },
        data: {
          isActive: false,
          updatedById
        }
      });

      logger.info(`Workflow deactivated successfully: ${id}`);
      return workflow;
    } catch (error: any) {
      logger.error('Failed to deactivate workflow:', {
        error: error?.message || 'Unknown error',
        id,
        updatedById
      });
      throw new WorkflowEngineError('Failed to deactivate workflow', 'DEACTIVATE_WORKFLOW_ERROR', error);
    }
  }

  // ============================================================================
  // Stage Management
  // ============================================================================

  /**
   * Add a stage to workflow
   */
  async addStage(
    workflowId: string,
    stageConfig: WorkflowStageConfig,
    updatedById: string
  ): Promise<any> {
    try {
      logger.info(`Adding stage to workflow: ${workflowId}`, {
        stageNumber: stageConfig.stageNumber,
        stageName: stageConfig.stageName
      });

      // Check for active instances
      const activeInstances = await this.prisma.workflowInstance.count({
        where: { workflowId, status: 'IN_PROGRESS' }
      });

      if (activeInstances > 0) {
        throw new WorkflowValidationError(
          'Cannot modify stages while workflow instances are in progress'
        );
      }

      const stage = await this.prisma.workflowStage.create({
        data: {
          workflowId,
          stageNumber: stageConfig.stageNumber,
          stageName: stageConfig.stageName,
          description: stageConfig.description,
          approvalType: stageConfig.approvalType,
          minimumApprovals: stageConfig.minimumApprovals,
          approvalThreshold: stageConfig.approvalThreshold,
          requiredRoles: stageConfig.requiredRoles,
          optionalRoles: stageConfig.optionalRoles,
          assignmentStrategy: stageConfig.assignmentStrategy,
          deadlineHours: stageConfig.deadlineHours,
          escalationRules: stageConfig.escalationRules || [],
          allowDelegation: stageConfig.allowDelegation,
          allowSkip: stageConfig.allowSkip,
          skipConditions: stageConfig.skipConditions || [],
          requiresSignature: stageConfig.requiresSignature,
          signatureType: stageConfig.signatureType
        }
      });

      logger.info(`Stage added successfully: ${stage.id}`);
      return stage;
    } catch (error: any) {
      logger.error('Failed to add stage:', {
        error: error?.message || 'Unknown error',
        workflowId,
        stageConfig
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to add stage', 'ADD_STAGE_ERROR', error);
    }
  }

  /**
   * Update a stage
   */
  async updateStage(
    stageId: string,
    updates: Partial<WorkflowStageConfig>,
    updatedById: string
  ): Promise<any> {
    try {
      logger.info(`Updating stage: ${stageId}`, { updatedById });

      const stage = await this.prisma.workflowStage.update({
        where: { id: stageId },
        data: {
          stageName: updates.stageName,
          description: updates.description,
          approvalType: updates.approvalType,
          minimumApprovals: updates.minimumApprovals,
          approvalThreshold: updates.approvalThreshold,
          requiredRoles: updates.requiredRoles,
          optionalRoles: updates.optionalRoles,
          assignmentStrategy: updates.assignmentStrategy,
          deadlineHours: updates.deadlineHours,
          escalationRules: updates.escalationRules,
          allowDelegation: updates.allowDelegation,
          allowSkip: updates.allowSkip,
          skipConditions: updates.skipConditions,
          requiresSignature: updates.requiresSignature,
          signatureType: updates.signatureType
        }
      });

      logger.info(`Stage updated successfully: ${stageId}`);
      return stage;
    } catch (error: any) {
      logger.error('Failed to update stage:', {
        error: error?.message || 'Unknown error',
        stageId,
        updates
      });
      throw new WorkflowEngineError('Failed to update stage', 'UPDATE_STAGE_ERROR', error);
    }
  }

  /**
   * Delete a stage
   */
  async deleteStage(stageId: string): Promise<void> {
    try {
      logger.info(`Deleting stage: ${stageId}`);

      const stage = await this.prisma.workflowStage.findUnique({
        where: { id: stageId },
        include: { workflow: { include: { instances: { where: { status: 'IN_PROGRESS' } } } } }
      });

      if (!stage) {
        throw new WorkflowValidationError('Stage not found');
      }

      if (stage.workflow.instances.length > 0) {
        throw new WorkflowValidationError(
          'Cannot delete stage while workflow instances are in progress'
        );
      }

      await this.prisma.workflowStage.delete({
        where: { id: stageId }
      });

      logger.info(`Stage deleted successfully: ${stageId}`);
    } catch (error: any) {
      logger.error('Failed to delete stage:', {
        error: error?.message || 'Unknown error',
        stageId
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to delete stage', 'DELETE_STAGE_ERROR', error);
    }
  }

  /**
   * Reorder stages
   */
  async reorderStages(workflowId: string, stageOrder: string[]): Promise<void> {
    try {
      logger.info(`Reordering stages for workflow: ${workflowId}`, { stageOrder });

      await this.prisma.$transaction(async (tx) => {
        for (let i = 0; i < stageOrder.length; i++) {
          await tx.workflowStage.update({
            where: { id: stageOrder[i] },
            data: { stageNumber: i + 1 }
          });
        }
      });

      logger.info(`Stages reordered successfully for workflow: ${workflowId}`);
    } catch (error: any) {
      logger.error('Failed to reorder stages:', {
        error: error?.message || 'Unknown error',
        workflowId,
        stageOrder
      });
      throw new WorkflowEngineError('Failed to reorder stages', 'REORDER_STAGES_ERROR', error);
    }
  }

  // ============================================================================
  // Rule Management
  // ============================================================================

  /**
   * Add a rule to workflow
   */
  async addRule(
    workflowId: string,
    ruleInput: Omit<WorkflowRuleInput, 'workflowId'>
  ): Promise<any> {
    try {
      logger.info(`Adding rule to workflow: ${workflowId}`, {
        ruleName: ruleInput.ruleName
      });

      const rule = await this.prisma.workflowRule.create({
        data: {
          workflowId,
          ruleName: ruleInput.ruleName,
          description: ruleInput.description,
          conditionField: ruleInput.conditionField,
          conditionOperator: ruleInput.conditionOperator,
          conditionValue: ruleInput.conditionValue,
          actionType: ruleInput.actionType,
          actionConfig: ruleInput.actionConfig,
          priority: ruleInput.priority || 0,
          isActive: ruleInput.isActive ?? true
        }
      });

      logger.info(`Rule added successfully: ${rule.id}`);
      return rule;
    } catch (error: any) {
      logger.error('Failed to add rule:', {
        error: error?.message || 'Unknown error',
        workflowId,
        ruleInput
      });
      throw new WorkflowEngineError('Failed to add rule', 'ADD_RULE_ERROR', error);
    }
  }

  /**
   * Update a rule
   */
  async updateRule(
    ruleId: string,
    updates: Partial<Omit<WorkflowRuleInput, 'workflowId'>>
  ): Promise<any> {
    try {
      logger.info(`Updating rule: ${ruleId}`);

      const rule = await this.prisma.workflowRule.update({
        where: { id: ruleId },
        data: {
          ruleName: updates.ruleName,
          description: updates.description,
          conditionField: updates.conditionField,
          conditionOperator: updates.conditionOperator,
          conditionValue: updates.conditionValue,
          actionType: updates.actionType,
          actionConfig: updates.actionConfig,
          priority: updates.priority,
          isActive: updates.isActive
        }
      });

      logger.info(`Rule updated successfully: ${ruleId}`);
      return rule;
    } catch (error: any) {
      logger.error('Failed to update rule:', {
        error: error?.message || 'Unknown error',
        ruleId,
        updates
      });
      throw new WorkflowEngineError('Failed to update rule', 'UPDATE_RULE_ERROR', error);
    }
  }

  /**
   * Delete a rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    try {
      logger.info(`Deleting rule: ${ruleId}`);

      await this.prisma.workflowRule.delete({
        where: { id: ruleId }
      });

      logger.info(`Rule deleted successfully: ${ruleId}`);
    } catch (error: any) {
      logger.error('Failed to delete rule:', {
        error: error?.message || 'Unknown error',
        ruleId
      });
      throw new WorkflowEngineError('Failed to delete rule', 'DELETE_RULE_ERROR', error);
    }
  }

  // ============================================================================
  // Template Management
  // ============================================================================

  /**
   * Get workflow templates
   */
  async getWorkflowTemplates(workflowType?: WorkflowType): Promise<WorkflowTemplateResponse[]> {
    try {
      logger.info(`Getting workflow templates`, { workflowType });

      const templates = await this.prisma.workflowTemplate.findMany({
        where: {
          isActive: true,
          ...(workflowType && { workflowType })
        },
        orderBy: [
          { isBuiltIn: 'desc' },
          { usageCount: 'desc' },
          { name: 'asc' }
        ]
      });

      return templates.map(this.mapTemplateResponse);
    } catch (error: any) {
      logger.error('Failed to get workflow templates:', {
        error: error?.message || 'Unknown error',
        workflowType
      });
      throw new WorkflowEngineError('Failed to get workflow templates', 'GET_TEMPLATES_ERROR', error);
    }
  }

  /**
   * Clone a workflow
   */
  async cloneWorkflow(id: string, name: string, createdById: string): Promise<any> {
    try {
      logger.info(`Cloning workflow: ${id}`, { newName: name, createdById });

      const original = await this.prisma.workflowDefinition.findUnique({
        where: { id },
        include: { stages: { orderBy: { stageNumber: 'asc' } } }
      });

      if (!original) {
        throw new WorkflowValidationError('Workflow definition not found');
      }

      const cloned = await this.createWorkflow({
        name: name,
        description: `Cloned from: ${original.name}`,
        workflowType: original.workflowType,
        version: '1.0.0',
        structure: original.structure as WorkflowStructure,
        isActive: false, // Start as inactive
        isTemplate: false
      }, createdById);

      logger.info(`Workflow cloned successfully: ${cloned.id}`);
      return cloned;
    } catch (error: any) {
      logger.error('Failed to clone workflow:', {
        error: error?.message || 'Unknown error',
        id,
        name,
        createdById
      });
      throw error instanceof WorkflowEngineError
        ? error
        : new WorkflowEngineError('Failed to clone workflow', 'CLONE_WORKFLOW_ERROR', error);
    }
  }

  // ============================================================================
  // Built-in Templates
  // ============================================================================

  /**
   * Create built-in workflow templates
   */
  async createBuiltInTemplates(): Promise<void> {
    try {
      logger.info('Creating built-in workflow templates');

      const templates = this.getBuiltInTemplateDefinitions();

      for (const template of templates) {
        const existing = await this.prisma.workflowTemplate.findFirst({
          where: {
            name: template.name,
            isBuiltIn: true
          }
        });

        if (!existing) {
          await this.prisma.workflowTemplate.create({
            data: {
              ...template,
              isBuiltIn: true,
              createdById: 'system'
            }
          });
          logger.info(`Created built-in template: ${template.name}`);
        }
      }

      logger.info('Built-in templates created successfully');
    } catch (error: any) {
      logger.error('Failed to create built-in templates:', {
        error: error?.message || 'Unknown error'
      });
      // Don't throw - this is initialization, continue even if it fails
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private validateWorkflowStructure(structure: WorkflowStructure): void {
    if (!structure.stages || structure.stages.length === 0) {
      throw new WorkflowValidationError('Workflow must have at least one stage');
    }

    // Validate stage numbers are sequential
    const stageNumbers = structure.stages.map(s => s.stageNumber).sort((a, b) => a - b);
    for (let i = 0; i < stageNumbers.length; i++) {
      if (stageNumbers[i] !== i + 1) {
        throw new WorkflowValidationError('Stage numbers must be sequential starting from 1');
      }
    }

    // Validate each stage
    for (const stage of structure.stages) {
      if (!stage.stageName || stage.stageName.trim() === '') {
        throw new WorkflowValidationError('Stage name is required');
      }

      if (stage.requiredRoles.length === 0 && stage.optionalRoles.length === 0) {
        throw new WorkflowValidationError(`Stage "${stage.stageName}" must have at least one role assigned`);
      }

      if (stage.approvalType === 'THRESHOLD' && !stage.minimumApprovals) {
        throw new WorkflowValidationError(`Stage "${stage.stageName}" with THRESHOLD approval type must specify minimum approvals`);
      }

      if (stage.approvalType === 'PERCENTAGE' && !stage.approvalThreshold) {
        throw new WorkflowValidationError(`Stage "${stage.stageName}" with PERCENTAGE approval type must specify approval threshold`);
      }
    }
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0');
    return `${parts[0]}.${parts[1]}.${patch + 1}`;
  }

  private mapTemplateResponse(template: any): WorkflowTemplateResponse {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      workflowType: template.workflowType,
      category: template.category,
      templateDefinition: template.templateDefinition,
      usageCount: template.usageCount,
      lastUsedAt: template.lastUsedAt,
      isActive: template.isActive,
      isBuiltIn: template.isBuiltIn,
      createdAt: template.createdAt,
      createdById: template.createdById
    };
  }

  private getBuiltInTemplateDefinitions(): WorkflowTemplateInput[] {
    return [
      {
        name: 'Simple Approval',
        description: 'Basic two-stage approval: Author → Reviewer → Approver',
        workflowType: 'WORK_INSTRUCTION',
        category: 'STANDARD',
        templateDefinition: {
          stages: [
            {
              stageNumber: 1,
              stageName: 'Review',
              description: 'Technical review of content',
              approvalType: 'ANY_ONE',
              requiredRoles: ['REVIEWER'],
              optionalRoles: [],
              assignmentStrategy: 'ROLE_BASED',
              deadlineHours: 48,
              allowDelegation: true,
              allowSkip: false,
              requiresSignature: false
            },
            {
              stageNumber: 2,
              stageName: 'Approval',
              description: 'Final approval',
              approvalType: 'ANY_ONE',
              requiredRoles: ['APPROVER'],
              optionalRoles: [],
              assignmentStrategy: 'ROLE_BASED',
              deadlineHours: 24,
              allowDelegation: true,
              allowSkip: false,
              requiresSignature: true,
              signatureType: 'APPROVED'
            }
          ],
          connections: [
            { fromStage: 1, toStage: 2 }
          ],
          metadata: {
            version: '1.0.0',
            createdAt: new Date(),
            createdBy: 'system',
            tags: ['simple', 'standard']
          }
        }
      },
      {
        name: 'Complex Multi-Stage',
        description: 'Comprehensive approval: Peer → Technical → QA → Engineering → Management',
        workflowType: 'WORK_INSTRUCTION',
        category: 'CRITICAL',
        templateDefinition: {
          stages: [
            {
              stageNumber: 1,
              stageName: 'Peer Review',
              description: 'Peer review by colleagues',
              approvalType: 'ANY_ONE',
              requiredRoles: ['ENGINEER'],
              optionalRoles: [],
              assignmentStrategy: 'LOAD_BALANCED',
              deadlineHours: 72,
              allowDelegation: true,
              allowSkip: false,
              requiresSignature: false
            },
            {
              stageNumber: 2,
              stageName: 'Technical Review',
              description: 'Technical review by senior engineers',
              approvalType: 'ANY_ONE',
              requiredRoles: ['SENIOR_ENGINEER'],
              optionalRoles: [],
              assignmentStrategy: 'ROLE_BASED',
              deadlineHours: 48,
              allowDelegation: true,
              allowSkip: false,
              requiresSignature: true,
              signatureType: 'REVIEWED'
            },
            {
              stageNumber: 3,
              stageName: 'QA Review',
              description: 'Quality assurance review',
              approvalType: 'ANY_ONE',
              requiredRoles: ['QA_ENGINEER'],
              optionalRoles: [],
              assignmentStrategy: 'ROLE_BASED',
              deadlineHours: 48,
              allowDelegation: true,
              allowSkip: false,
              requiresSignature: true,
              signatureType: 'VERIFIED'
            },
            {
              stageNumber: 4,
              stageName: 'Engineering Approval',
              description: 'Engineering manager approval',
              approvalType: 'ANY_ONE',
              requiredRoles: ['ENGINEERING_MANAGER'],
              optionalRoles: [],
              assignmentStrategy: 'ROLE_BASED',
              deadlineHours: 24,
              allowDelegation: true,
              allowSkip: false,
              requiresSignature: true,
              signatureType: 'APPROVED'
            },
            {
              stageNumber: 5,
              stageName: 'Management Approval',
              description: 'Final management approval',
              approvalType: 'ANY_ONE',
              requiredRoles: ['PLANT_MANAGER'],
              optionalRoles: [],
              assignmentStrategy: 'ROLE_BASED',
              deadlineHours: 24,
              allowDelegation: false,
              allowSkip: false,
              requiresSignature: true,
              signatureType: 'APPROVED'
            }
          ],
          connections: [
            { fromStage: 1, toStage: 2 },
            { fromStage: 2, toStage: 3 },
            { fromStage: 3, toStage: 4 },
            { fromStage: 4, toStage: 5 }
          ],
          metadata: {
            version: '1.0.0',
            createdAt: new Date(),
            createdBy: 'system',
            tags: ['complex', 'critical', 'multi-stage']
          }
        }
      },
      {
        name: 'Parallel Cross-Functional',
        description: 'Parallel approval by Engineering, Quality, and Manufacturing',
        workflowType: 'WORK_INSTRUCTION',
        category: 'STANDARD',
        templateDefinition: {
          stages: [
            {
              stageNumber: 1,
              stageName: 'Cross-Functional Review',
              description: 'Parallel review by all functions',
              approvalType: 'ALL_REQUIRED',
              requiredRoles: ['ENGINEER', 'QA_ENGINEER', 'MANUFACTURING_ENGINEER'],
              optionalRoles: [],
              assignmentStrategy: 'ROLE_BASED',
              deadlineHours: 72,
              allowDelegation: true,
              allowSkip: false,
              requiresSignature: true,
              signatureType: 'REVIEWED'
            },
            {
              stageNumber: 2,
              stageName: 'Management Approval',
              description: 'Final approval by management',
              approvalType: 'ANY_ONE',
              requiredRoles: ['DEPARTMENT_MANAGER'],
              optionalRoles: [],
              assignmentStrategy: 'ROLE_BASED',
              deadlineHours: 24,
              allowDelegation: true,
              allowSkip: false,
              requiresSignature: true,
              signatureType: 'APPROVED'
            }
          ],
          connections: [
            { fromStage: 1, toStage: 2 }
          ],
          metadata: {
            version: '1.0.0',
            createdAt: new Date(),
            createdBy: 'system',
            tags: ['parallel', 'cross-functional']
          }
        }
      }
    ];
  }
}

export default WorkflowDefinitionService;