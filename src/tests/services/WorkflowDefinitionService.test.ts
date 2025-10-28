/**
 * ✅ GITHUB ISSUE #21: Advanced Multi-Stage Approval Workflow Engine
 *
 * Comprehensive unit tests for WorkflowDefinitionService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient, WorkflowType, ApprovalType } from '@prisma/client';
import { WorkflowDefinitionService } from '@/services/WorkflowDefinitionService';

// Mock logger to avoid config validation issues
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    workflowDefinition: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    workflowStage: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workflowRule: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workflowTemplate: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
    WorkflowType: {
      QUALITY_REVIEW: 'QUALITY_REVIEW',
      CHANGE_CONTROL: 'CHANGE_CONTROL',
      DOCUMENT_APPROVAL: 'DOCUMENT_APPROVAL',
      PRODUCTION_APPROVAL: 'PRODUCTION_APPROVAL',
    },
    ApprovalType: {
      UNANIMOUS: 'UNANIMOUS',
      MAJORITY: 'MAJORITY',
      THRESHOLD: 'THRESHOLD',
      MINIMUM: 'MINIMUM',
      ANY: 'ANY',
    },
  };
});

describe('WorkflowDefinitionService', () => {
  let workflowDefinitionService: WorkflowDefinitionService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = new PrismaClient();
    workflowDefinitionService = new WorkflowDefinitionService(mockPrisma);

    // Setup transaction mock
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return await callback(mockPrisma);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createWorkflow', () => {
    it('should create workflow definition with stages', async () => {
      const workflowInput = {
        name: 'Quality Review Workflow',
        description: 'Multi-stage quality review process',
        workflowType: 'QUALITY_REVIEW' as const,
        version: '1.0',
        stages: [
          {
            stageNumber: 1,
            stageName: 'Initial Review',
            description: 'First stage review',
            assignees: ['user-1', 'user-2'],
            approvalType: 'MAJORITY' as const,
            deadlineHours: 24,
            isOptional: false,
            allowDelegation: true,
            allowSkip: false,
            requiresSignature: false
          },
          {
            stageNumber: 2,
            stageName: 'Final Approval',
            description: 'Final approval stage',
            assignees: ['manager-1'],
            approvalType: 'UNANIMOUS' as const,
            deadlineHours: 48,
            isOptional: false,
            allowDelegation: false,
            allowSkip: false,
            requiresSignature: true,
            signatureType: 'ADVANCED'
          }
        ],
        connections: [
          {
            fromStage: 1,
            toStage: 2,
            condition: 'APPROVED'
          }
        ],
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          createdBy: 'admin-user',
          tags: ['quality', 'review']
        },
        isActive: true
      };

      const mockWorkflowDefinition = {
        id: 'workflow-def-1',
        name: 'Quality Review Workflow',
        workflowType: 'QUALITY_REVIEW',
        version: '1.0'
      };

      const mockStages = [
        { id: 'stage-1', stageNumber: 1, stageName: 'Initial Review' },
        { id: 'stage-2', stageNumber: 2, stageName: 'Final Approval' }
      ];

      mockPrisma.workflowDefinition.create.mockResolvedValue(mockWorkflowDefinition);
      mockPrisma.workflowStage.create.mockResolvedValueOnce(mockStages[0]);
      mockPrisma.workflowStage.create.mockResolvedValueOnce(mockStages[1]);

      const result = await workflowDefinitionService.createWorkflow(workflowInput);

      expect(result).toEqual(mockWorkflowDefinition);
      expect(mockPrisma.workflowDefinition.create).toHaveBeenCalledWith({
        data: {
          name: 'Quality Review Workflow',
          description: 'Multi-stage quality review process',
          workflowType: 'QUALITY_REVIEW',
          version: '1.0',
          metadata: workflowInput.metadata,
          isActive: true
        }
      });
      expect(mockPrisma.workflowStage.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error for duplicate workflow name', async () => {
      const workflowInput = {
        name: 'Existing Workflow',
        workflowType: 'QUALITY_REVIEW' as const,
        stages: [],
        connections: [],
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          createdBy: 'user',
          tags: []
        }
      };

      const duplicateError = new Error('Unique constraint failed');
      (duplicateError as any).code = 'P2002';
      mockPrisma.workflowDefinition.create.mockRejectedValue(duplicateError);

      await expect(workflowDefinitionService.createWorkflow(workflowInput))
        .rejects.toThrow('A workflow with this name already exists');
    });
  });

  describe('getWorkflow', () => {
    it('should return workflow with stages and rules', async () => {
      const workflowId = 'workflow-1';
      const mockWorkflow = {
        id: workflowId,
        name: 'Test Workflow',
        stages: [
          { id: 'stage-1', stageNumber: 1, stageName: 'Review' }
        ],
        rules: [
          { id: 'rule-1', name: 'Skip on Low Priority' }
        ]
      };

      mockPrisma.workflowDefinition.findUnique.mockResolvedValue(mockWorkflow);

      const result = await workflowDefinitionService.getWorkflow(workflowId);

      expect(result).toEqual(mockWorkflow);
      expect(mockPrisma.workflowDefinition.findUnique).toHaveBeenCalledWith({
        where: { id: workflowId },
        include: {
          stages: {
            orderBy: { stageNumber: 'asc' }
          },
          rules: {
            where: { isActive: true },
            orderBy: { priority: 'desc' }
          }
        }
      });
    });

    it('should throw error when workflow not found', async () => {
      const workflowId = 'non-existent';
      mockPrisma.workflowDefinition.findUnique.mockResolvedValue(null);

      await expect(workflowDefinitionService.getWorkflow(workflowId))
        .rejects.toThrow('Workflow definition non-existent not found');
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow definition and stages', async () => {
      const workflowId = 'workflow-1';
      const updateData = {
        name: 'Updated Workflow',
        description: 'Updated description',
        stages: [
          {
            stageNumber: 1,
            stageName: 'Updated Stage',
            assignees: ['user-1'],
            approvalType: 'MAJORITY' as const,
            deadlineHours: 48
          }
        ]
      };

      const mockUpdatedWorkflow = {
        id: workflowId,
        name: 'Updated Workflow',
        description: 'Updated description'
      };

      mockPrisma.workflowDefinition.findUnique.mockResolvedValue({
        id: workflowId,
        name: 'Original Workflow'
      });
      mockPrisma.workflowDefinition.update.mockResolvedValue(mockUpdatedWorkflow);
      mockPrisma.workflowStage.delete.mockResolvedValue({});
      mockPrisma.workflowStage.create.mockResolvedValue({
        id: 'new-stage-1',
        stageNumber: 1
      });

      const result = await workflowDefinitionService.updateWorkflow(workflowId, updateData);

      expect(result).toEqual(mockUpdatedWorkflow);
      expect(mockPrisma.workflowDefinition.update).toHaveBeenCalledWith({
        where: { id: workflowId },
        data: {
          name: 'Updated Workflow',
          description: 'Updated description'
        }
      });
    });
  });

  describe('deleteWorkflow', () => {
    it('should soft delete workflow by marking as inactive', async () => {
      const workflowId = 'workflow-1';

      mockPrisma.workflowDefinition.findUnique.mockResolvedValue({
        id: workflowId,
        isActive: true
      });
      mockPrisma.workflowDefinition.update.mockResolvedValue({
        id: workflowId,
        isActive: false
      });

      await workflowDefinitionService.deleteWorkflow(workflowId);

      expect(mockPrisma.workflowDefinition.update).toHaveBeenCalledWith({
        where: { id: workflowId },
        data: { isActive: false }
      });
    });

    it('should throw error when workflow not found', async () => {
      const workflowId = 'non-existent';
      mockPrisma.workflowDefinition.findUnique.mockResolvedValue(null);

      await expect(workflowDefinitionService.deleteWorkflow(workflowId))
        .rejects.toThrow('Workflow definition non-existent not found');
    });
  });

  describe('listWorkflows', () => {
    it('should return paginated list of workflows with filters', async () => {
      const filters = {
        workflowType: 'QUALITY_REVIEW' as const,
        isActive: true,
        search: 'quality',
        page: 1,
        limit: 10,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
      };

      const mockWorkflows = [
        {
          id: 'workflow-1',
          name: 'Quality Review Workflow',
          workflowType: 'QUALITY_REVIEW',
          isActive: true
        }
      ];

      mockPrisma.workflowDefinition.findMany.mockResolvedValue(mockWorkflows);
      mockPrisma.workflowDefinition.count.mockResolvedValue(1);

      const result = await workflowDefinitionService.listWorkflows(filters);

      expect(result.workflows).toEqual(mockWorkflows);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      });

      expect(mockPrisma.workflowDefinition.findMany).toHaveBeenCalledWith({
        where: {
          workflowType: 'QUALITY_REVIEW',
          isActive: true,
          OR: [
            { name: { contains: 'quality', mode: 'insensitive' } },
            { description: { contains: 'quality', mode: 'insensitive' } }
          ]
        },
        include: {
          stages: { orderBy: { stageNumber: 'asc' } },
          _count: { select: { instances: true } }
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10
      });
    });
  });

  describe('createRule', () => {
    it('should create workflow rule with conditions and actions', async () => {
      const workflowId = 'workflow-1';
      const ruleInput = {
        name: 'Skip on Low Priority',
        description: 'Skip stage 2 for low priority items',
        priority: 10,
        conditions: {
          AND: [
            { field: 'priority', operator: 'eq', value: 'LOW' },
            { field: 'currentStageNumber', operator: 'eq', value: 1 }
          ]
        },
        actions: [
          { type: 'SKIP_TO_STAGE', skipToStageNumber: 3 }
        ],
        isActive: true
      };

      const mockRule = {
        id: 'rule-1',
        name: 'Skip on Low Priority',
        workflowDefinitionId: workflowId
      };

      mockPrisma.workflowDefinition.findUnique.mockResolvedValue({
        id: workflowId,
        name: 'Test Workflow'
      });
      mockPrisma.workflowRule.create.mockResolvedValue(mockRule);

      const result = await workflowDefinitionService.createRule(workflowId, ruleInput);

      expect(result).toEqual(mockRule);
      expect(mockPrisma.workflowRule.create).toHaveBeenCalledWith({
        data: {
          workflowDefinitionId: workflowId,
          name: 'Skip on Low Priority',
          description: 'Skip stage 2 for low priority items',
          priority: 10,
          conditions: ruleInput.conditions,
          actions: ruleInput.actions,
          isActive: true
        }
      });
    });
  });

  describe('createTemplate', () => {
    it('should create workflow template from existing workflow', async () => {
      const workflowId = 'workflow-1';
      const templateInput = {
        name: 'Quality Review Template',
        description: 'Template for quality reviews',
        category: 'Quality',
        tags: ['quality', 'template']
      };

      const mockWorkflow = {
        id: workflowId,
        name: 'Source Workflow',
        workflowType: 'QUALITY_REVIEW',
        stages: [
          { stageName: 'Review', approvalType: 'MAJORITY' }
        ]
      };

      const mockTemplate = {
        id: 'template-1',
        name: 'Quality Review Template',
        category: 'Quality'
      };

      mockPrisma.workflowDefinition.findUnique.mockResolvedValue(mockWorkflow);
      mockPrisma.workflowTemplate.create.mockResolvedValue(mockTemplate);

      const result = await workflowDefinitionService.createTemplate(workflowId, templateInput);

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.workflowTemplate.create).toHaveBeenCalledWith({
        data: {
          name: 'Quality Review Template',
          description: 'Template for quality reviews',
          category: 'Quality',
          tags: ['quality', 'template'],
          templateData: {
            name: 'Source Workflow',
            workflowType: 'QUALITY_REVIEW',
            stages: mockWorkflow.stages
          }
        }
      });
    });
  });

  describe('validateWorkflow', () => {
    it('should validate workflow definition successfully', async () => {
      const workflowData = {
        name: 'Valid Workflow',
        workflowType: 'QUALITY_REVIEW' as const,
        stages: [
          {
            stageNumber: 1,
            stageName: 'Review',
            assignees: ['user-1'],
            approvalType: 'MAJORITY' as const
          },
          {
            stageNumber: 2,
            stageName: 'Approval',
            assignees: ['manager-1'],
            approvalType: 'UNANIMOUS' as const
          }
        ],
        connections: [
          { fromStage: 1, toStage: 2 }
        ]
      };

      const result = await workflowDefinitionService.validateWorkflow(workflowData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should detect validation errors', async () => {
      const invalidWorkflowData = {
        name: '',
        workflowType: 'QUALITY_REVIEW' as const,
        stages: [
          {
            stageNumber: 1,
            stageName: '',
            assignees: [],
            approvalType: 'MAJORITY' as const
          }
        ],
        connections: [
          { fromStage: 1, toStage: 3 } // Invalid: stage 3 doesn't exist
        ]
      };

      const result = await workflowDefinitionService.validateWorkflow(invalidWorkflowData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Workflow name is required');
      expect(result.errors).toContain('Stage name is required for stage 1');
      expect(result.errors).toContain('At least one assignee is required for stage 1');
      expect(result.errors).toContain('Connection from stage 1 to stage 3: target stage does not exist');
    });

    it('should detect validation warnings', async () => {
      const workflowData = {
        name: 'Workflow with Warnings',
        workflowType: 'QUALITY_REVIEW' as const,
        stages: [
          {
            stageNumber: 1,
            stageName: 'Review',
            assignees: ['user-1'],
            approvalType: 'MAJORITY' as const,
            deadlineHours: 0 // Warning: no deadline
          }
        ],
        connections: []
      };

      const result = await workflowDefinitionService.validateWorkflow(workflowData);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Stage 1 has no deadline specified');
      expect(result.warnings).toContain('Workflow has no stage connections defined');
    });
  });

  describe('cloneWorkflow', () => {
    it('should clone workflow with incremented version', async () => {
      const sourceWorkflowId = 'workflow-1';
      const cloneOptions = {
        name: 'Cloned Workflow',
        version: '2.0'
      };

      const mockSourceWorkflow = {
        id: sourceWorkflowId,
        name: 'Original Workflow',
        workflowType: 'QUALITY_REVIEW',
        version: '1.0',
        stages: [
          { stageName: 'Review', approvalType: 'MAJORITY' }
        ]
      };

      const mockClonedWorkflow = {
        id: 'workflow-2',
        name: 'Cloned Workflow',
        version: '2.0'
      };

      mockPrisma.workflowDefinition.findUnique.mockResolvedValue(mockSourceWorkflow);
      mockPrisma.workflowDefinition.create.mockResolvedValue(mockClonedWorkflow);
      mockPrisma.workflowStage.create.mockResolvedValue({
        id: 'new-stage-1',
        stageName: 'Review'
      });

      const result = await workflowDefinitionService.cloneWorkflow(sourceWorkflowId, cloneOptions);

      expect(result).toEqual(mockClonedWorkflow);
      expect(mockPrisma.workflowDefinition.create).toHaveBeenCalledWith({
        data: {
          name: 'Cloned Workflow',
          workflowType: 'QUALITY_REVIEW',
          version: '2.0',
          description: undefined,
          metadata: undefined,
          isActive: true
        }
      });
    });
  });
});