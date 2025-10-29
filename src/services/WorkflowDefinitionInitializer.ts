/**
 * ✅ GITHUB ISSUE #147: Core Unified Workflow Engine
 *
 * Workflow Definition Initializer - Creates predefined workflow definitions
 * for all approval types to support the unified approval integration.
 *
 * This service creates standardized workflow templates that can be used
 * by the UnifiedApprovalIntegration service.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { WorkflowDefinitionService } from './WorkflowDefinitionService';
import {
  WorkflowDefinitionInput,
  WorkflowStructure,
  WorkflowStageConfig
} from '../types/workflow';

export class WorkflowDefinitionInitializer {
  private prisma: PrismaClient;
  private workflowDefinitionService: WorkflowDefinitionService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.workflowDefinitionService = new WorkflowDefinitionService(prisma);
  }

  /**
   * Initialize all predefined workflow definitions for unified approval system
   */
  async initializeAllWorkflowDefinitions(createdById: string): Promise<void> {
    try {
      logger.info('Initializing predefined workflow definitions for unified approval system');

      // Create workflow definitions for each approval type
      await Promise.all([
        this.createWorkInstructionWorkflow(createdById),
        this.createFAIReportWorkflow(createdById),
        this.createQualityProcessWorkflow(createdById),
        this.createDocumentApprovalWorkflow(createdById),
        this.createEmergencyApprovalWorkflow(createdById)
      ]);

      logger.info('Successfully initialized all predefined workflow definitions');

    } catch (error) {
      logger.error('Failed to initialize workflow definitions', { error: error.message });
      throw error;
    }
  }

  /**
   * Work Instruction Approval Workflow
   * Simple 2-stage: Manager Review → Final Approval
   */
  private async createWorkInstructionWorkflow(createdById: string): Promise<string> {
    const structure: WorkflowStructure = {
      stages: [
        {
          stageNumber: 1,
          name: 'Manager Review',
          description: 'Department manager review of work instruction',
          approvalType: 'ANY_ONE',
          assignmentStrategy: 'ROLE_BASED',
          requiredRoles: ['department_manager', 'process_engineer'],
          allowParallel: false,
          timeoutHours: 48,
          isRequired: true,
          canDelegate: true,
          requiresComments: false,
          requiresSignature: false
        },
        {
          stageNumber: 2,
          name: 'Quality Approval',
          description: 'Quality manager final approval',
          approvalType: 'ALL_REQUIRED',
          assignmentStrategy: 'ROLE_BASED',
          requiredRoles: ['quality_manager'],
          allowParallel: false,
          timeoutHours: 24,
          isRequired: true,
          canDelegate: true,
          requiresComments: false,
          requiresSignature: false
        }
      ],
      connections: [
        {
          fromStage: 1,
          toStage: 2,
          condition: 'APPROVED',
          order: 1
        }
      ],
      metadata: {
        estimatedDuration: '3 days',
        description: 'Standard work instruction approval process',
        category: 'manufacturing',
        requiresTraining: false
      }
    };

    const definition: WorkflowDefinitionInput = {
      name: 'Work Instruction Approval',
      description: 'Standard approval workflow for work instructions',
      workflowType: 'WORK_INSTRUCTION',
      version: '1.0.0',
      structure,
      isActive: true,
      isTemplate: true
    };

    const result = await this.workflowDefinitionService.createWorkflowDefinition(definition, createdById);
    logger.info(`Created Work Instruction workflow definition: ${result.id}`);
    return result.id;
  }

  /**
   * FAI Report Approval Workflow
   * 3-stage: Technical Review → Quality Review → Customer Approval
   */
  private async createFAIReportWorkflow(createdById: string): Promise<string> {
    const structure: WorkflowStructure = {
      stages: [
        {
          stageNumber: 1,
          name: 'Technical Review',
          description: 'Engineering review of FAI measurements and documentation',
          approvalType: 'ALL_REQUIRED',
          assignmentStrategy: 'ROLE_BASED',
          requiredRoles: ['quality_engineer', 'process_engineer'],
          allowParallel: true,
          timeoutHours: 48,
          isRequired: true,
          canDelegate: true,
          requiresComments: true,
          requiresSignature: false
        },
        {
          stageNumber: 2,
          name: 'Quality Manager Approval',
          description: 'Quality manager certification of FAI compliance',
          approvalType: 'ALL_REQUIRED',
          assignmentStrategy: 'ROLE_BASED',
          requiredRoles: ['quality_manager'],
          allowParallel: false,
          timeoutHours: 24,
          isRequired: true,
          canDelegate: false, // Quality manager cannot delegate FAI approval
          requiresComments: true,
          requiresSignature: true // FAI requires electronic signature
        },
        {
          stageNumber: 3,
          name: 'Customer Approval',
          description: 'Customer representative review and acceptance',
          approvalType: 'ANY_ONE',
          assignmentStrategy: 'ROLE_BASED',
          requiredRoles: ['customer_representative', 'customer_quality'],
          allowParallel: false,
          timeoutHours: 120, // 5 days for customer response
          isRequired: true,
          canDelegate: false,
          requiresComments: true,
          requiresSignature: true
        }
      ],
      connections: [
        {
          fromStage: 1,
          toStage: 2,
          condition: 'APPROVED',
          order: 1
        },
        {
          fromStage: 2,
          toStage: 3,
          condition: 'APPROVED',
          order: 2
        }
      ],
      metadata: {
        estimatedDuration: '7-10 days',
        description: 'First Article Inspection approval with customer validation',
        category: 'quality',
        requiresTraining: true,
        regulatoryCompliance: ['AS9100', 'ISO9001']
      }
    };

    const definition: WorkflowDefinitionInput = {
      name: 'FAI Report Approval',
      description: 'First Article Inspection approval workflow with customer validation',
      workflowType: 'FAI_REPORT',
      version: '1.0.0',
      structure,
      isActive: true,
      isTemplate: true
    };

    const result = await this.workflowDefinitionService.createWorkflowDefinition(definition, createdById);
    logger.info(`Created FAI Report workflow definition: ${result.id}`);
    return result.id;
  }

  /**
   * Quality Process Approval Workflow
   * 2-stage: QC Review → Quality Manager Approval
   */
  private async createQualityProcessWorkflow(createdById: string): Promise<string> {
    const structure: WorkflowStructure = {
      stages: [
        {
          stageNumber: 1,
          name: 'QC Inspector Review',
          description: 'Quality control inspector verification',
          approvalType: 'ANY_ONE',
          assignmentStrategy: 'ROLE_BASED',
          requiredRoles: ['qc_inspector', 'quality_technician'],
          allowParallel: false,
          timeoutHours: 24,
          isRequired: true,
          canDelegate: true,
          requiresComments: true,
          requiresSignature: false
        },
        {
          stageNumber: 2,
          name: 'Quality Manager Approval',
          description: 'Quality manager final approval',
          approvalType: 'ALL_REQUIRED',
          assignmentStrategy: 'ROLE_BASED',
          requiredRoles: ['quality_manager'],
          allowParallel: false,
          timeoutHours: 24,
          isRequired: true,
          canDelegate: true,
          requiresComments: false,
          requiresSignature: false
        }
      ],
      connections: [
        {
          fromStage: 1,
          toStage: 2,
          condition: 'APPROVED',
          order: 1
        }
      ],
      metadata: {
        estimatedDuration: '2 days',
        description: 'Standard quality process approval',
        category: 'quality',
        requiresTraining: false
      }
    };

    const definition: WorkflowDefinitionInput = {
      name: 'Quality Process Approval',
      description: 'Standard approval workflow for quality processes and inspections',
      workflowType: 'QUALITY_PROCESS',
      version: '1.0.0',
      structure,
      isActive: true,
      isTemplate: true
    };

    const result = await this.workflowDefinitionService.createWorkflowDefinition(definition, createdById);
    logger.info(`Created Quality Process workflow definition: ${result.id}`);
    return result.id;
  }

  /**
   * Document Approval Workflow
   * 2-stage: Document Controller → Department Manager
   */
  private async createDocumentApprovalWorkflow(createdById: string): Promise<string> {
    const structure: WorkflowStructure = {
      stages: [
        {
          stageNumber: 1,
          name: 'Document Control Review',
          description: 'Document controller review for compliance and formatting',
          approvalType: 'ALL_REQUIRED',
          assignmentStrategy: 'ROLE_BASED',
          requiredRoles: ['document_controller'],
          allowParallel: false,
          timeoutHours: 24,
          isRequired: true,
          canDelegate: true,
          requiresComments: true,
          requiresSignature: false
        },
        {
          stageNumber: 2,
          name: 'Department Approval',
          description: 'Department manager content approval',
          approvalType: 'ANY_ONE',
          assignmentStrategy: 'ROLE_BASED',
          requiredRoles: ['department_manager', 'document_owner'],
          allowParallel: false,
          timeoutHours: 48,
          isRequired: true,
          canDelegate: true,
          requiresComments: false,
          requiresSignature: false
        }
      ],
      connections: [
        {
          fromStage: 1,
          toStage: 2,
          condition: 'APPROVED',
          order: 1
        }
      ],
      metadata: {
        estimatedDuration: '3 days',
        description: 'Standard document approval process',
        category: 'document_management',
        requiresTraining: false
      }
    };

    const definition: WorkflowDefinitionInput = {
      name: 'Document Approval',
      description: 'Standard approval workflow for document control',
      workflowType: 'DOCUMENT_APPROVAL',
      version: '1.0.0',
      structure,
      isActive: true,
      isTemplate: true
    };

    const result = await this.workflowDefinitionService.createWorkflowDefinition(definition, createdById);
    logger.info(`Created Document Approval workflow definition: ${result.id}`);
    return result.id;
  }

  /**
   * Emergency Approval Workflow
   * Fast-track 1-stage approval for urgent situations
   */
  private async createEmergencyApprovalWorkflow(createdById: string): Promise<string> {
    const structure: WorkflowStructure = {
      stages: [
        {
          stageNumber: 1,
          name: 'Emergency Approval',
          description: 'Expedited approval for emergency situations',
          approvalType: 'ANY_ONE',
          assignmentStrategy: 'ROLE_BASED',
          requiredRoles: ['plant_manager', 'quality_manager', 'production_manager'],
          allowParallel: true,
          timeoutHours: 4, // 4 hours for emergency
          isRequired: true,
          canDelegate: false, // No delegation in emergency
          requiresComments: true,
          requiresSignature: true // Electronic signature required for audit trail
        }
      ],
      connections: [], // Single stage workflow
      metadata: {
        estimatedDuration: '4 hours',
        description: 'Emergency approval workflow for urgent situations',
        category: 'emergency',
        requiresTraining: false,
        emergencyUse: true
      }
    };

    const definition: WorkflowDefinitionInput = {
      name: 'Emergency Approval',
      description: 'Fast-track approval workflow for emergency situations',
      workflowType: 'CHANGE_REQUEST', // Using existing type for emergency
      version: '1.0.0',
      structure,
      isActive: true,
      isTemplate: true
    };

    const result = await this.workflowDefinitionService.createWorkflowDefinition(definition, createdById);
    logger.info(`Created Emergency Approval workflow definition: ${result.id}`);
    return result.id;
  }

  /**
   * Get workflow definition IDs for use in UnifiedApprovalIntegration
   */
  async getWorkflowIds(): Promise<{
    workInstructionWorkflowId: string;
    faiReportWorkflowId: string;
    qualityProcessWorkflowId: string;
    documentApprovalWorkflowId: string;
    emergencyApprovalWorkflowId: string;
  }> {
    try {
      const workflowIds = await this.prisma.workflowDefinition.findMany({
        where: {
          isTemplate: true,
          isActive: true,
          name: {
            in: [
              'Work Instruction Approval',
              'FAI Report Approval',
              'Quality Process Approval',
              'Document Approval',
              'Emergency Approval'
            ]
          }
        },
        select: {
          id: true,
          name: true,
          workflowType: true
        }
      });

      const mapping = workflowIds.reduce((acc, workflow) => {
        switch (workflow.name) {
          case 'Work Instruction Approval':
            acc.workInstructionWorkflowId = workflow.id;
            break;
          case 'FAI Report Approval':
            acc.faiReportWorkflowId = workflow.id;
            break;
          case 'Quality Process Approval':
            acc.qualityProcessWorkflowId = workflow.id;
            break;
          case 'Document Approval':
            acc.documentApprovalWorkflowId = workflow.id;
            break;
          case 'Emergency Approval':
            acc.emergencyApprovalWorkflowId = workflow.id;
            break;
        }
        return acc;
      }, {} as any);

      // Validate all IDs are present
      const requiredFields = [
        'workInstructionWorkflowId',
        'faiReportWorkflowId',
        'qualityProcessWorkflowId',
        'documentApprovalWorkflowId',
        'emergencyApprovalWorkflowId'
      ];

      for (const field of requiredFields) {
        if (!mapping[field]) {
          throw new Error(`Missing workflow definition for ${field}`);
        }
      }

      return mapping;

    } catch (error) {
      logger.error('Failed to get workflow IDs', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if workflow definitions are already initialized
   */
  async areWorkflowDefinitionsInitialized(): Promise<boolean> {
    try {
      const count = await this.prisma.workflowDefinition.count({
        where: {
          isTemplate: true,
          isActive: true,
          name: {
            in: [
              'Work Instruction Approval',
              'FAI Report Approval',
              'Quality Process Approval',
              'Document Approval',
              'Emergency Approval'
            ]
          }
        }
      });

      return count === 5; // All 5 workflow definitions should exist

    } catch (error) {
      logger.error('Failed to check workflow definition initialization status', { error: error.message });
      return false;
    }
  }
}