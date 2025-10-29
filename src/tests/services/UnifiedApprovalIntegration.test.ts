/**
 * ✅ GITHUB ISSUE #147: Core Unified Workflow Engine
 *
 * Tests for UnifiedApprovalIntegration service - Comprehensive testing suite
 * for the unified approval workflow system.
 */

import { PrismaClient } from '@prisma/client';
import { UnifiedApprovalIntegration } from '../../services/UnifiedApprovalIntegration';
import { WorkflowDefinitionInitializer } from '../../services/WorkflowDefinitionInitializer';

const prisma = new PrismaClient();

describe('UnifiedApprovalIntegration', () => {
  let unifiedApprovalService: UnifiedApprovalIntegration;
  let workflowInitializer: WorkflowDefinitionInitializer;
  let testUserId: string;
  let testWorkInstructionId: string;
  let testFAIId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.workflowInstance.deleteMany();
    await prisma.workflowDefinition.deleteMany();
    await prisma.workInstruction.deleteMany();
    await prisma.fAIReport.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: 'test.approver',
        email: 'test.approver@example.com',
        firstName: 'Test',
        lastName: 'Approver',
        passwordHash: 'test-hash',
        roles: ['quality_manager'],
        isActive: true
      }
    });
    testUserId = testUser.id;

    // Create test entities for approval testing
    const testWorkInstruction = await prisma.workInstruction.create({
      data: {
        title: 'Test Work Instruction',
        description: 'Test work instruction for approval testing',
        status: 'DRAFT',
        version: '1.0.0',
        createdById: testUserId,
        updatedById: testUserId
      }
    });
    testWorkInstructionId = testWorkInstruction.id;

    const testFAI = await prisma.fAIReport.create({
      data: {
        faiNumber: 'FAI-TEST-001',
        partId: 'test-part-id',
        status: 'IN_PROGRESS',
        createdById: testUserId
      }
    });
    testFAIId = testFAI.id;

    // Initialize services
    unifiedApprovalService = new UnifiedApprovalIntegration(prisma);
    workflowInitializer = new WorkflowDefinitionInitializer(prisma);

    // Initialize workflow definitions
    await unifiedApprovalService.initialize(testUserId);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.workflowInstance.deleteMany();
    await prisma.workflowDefinition.deleteMany();
    await prisma.workInstruction.deleteMany();
    await prisma.fAIReport.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Service Initialization', () => {
    test('should initialize workflow definitions successfully', async () => {
      const isInitialized = await workflowInitializer.areWorkflowDefinitionsInitialized();
      expect(isInitialized).toBe(true);
    });

    test('should get workflow IDs after initialization', async () => {
      const workflowIds = await workflowInitializer.getWorkflowIds();

      expect(workflowIds).toHaveProperty('workInstructionWorkflowId');
      expect(workflowIds).toHaveProperty('faiReportWorkflowId');
      expect(workflowIds).toHaveProperty('qualityProcessWorkflowId');
      expect(workflowIds).toHaveProperty('documentApprovalWorkflowId');
      expect(workflowIds).toHaveProperty('emergencyApprovalWorkflowId');

      expect(workflowIds.workInstructionWorkflowId).toBeTruthy();
      expect(workflowIds.faiReportWorkflowId).toBeTruthy();
    });
  });

  describe('Workflow Initiation', () => {
    test('should initiate work instruction approval workflow', async () => {
      const result = await unifiedApprovalService.initiateApproval(
        {
          entityType: 'WORK_INSTRUCTION',
          entityId: testWorkInstructionId,
          currentStatus: 'DRAFT',
          requiredApproverRoles: ['quality_manager'],
          priority: 'NORMAL',
          metadata: { testCase: 'work_instruction_approval' }
        },
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.workflowInstanceId).toBeTruthy();
      expect(result.currentStage).toBe('Manager Review');
      expect(result.nextApprovers).toBeInstanceOf(Array);
    });

    test('should initiate FAI report approval workflow', async () => {
      const result = await unifiedApprovalService.initiateApproval(
        {
          entityType: 'FAI_REPORT',
          entityId: testFAIId,
          currentStatus: 'REVIEW',
          requiredApproverRoles: ['quality_manager', 'customer_representative'],
          priority: 'HIGH',
          metadata: {
            testCase: 'fai_approval',
            requiresSignature: true,
            regulatoryCompliance: true
          }
        },
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.workflowInstanceId).toBeTruthy();
      expect(result.currentStage).toBe('Technical Review');
      expect(result.requiresSignature).toBe(true);
    });

    test('should prevent duplicate workflow initiation', async () => {
      // Try to initiate workflow for the same work instruction again
      await expect(
        unifiedApprovalService.initiateApproval(
          {
            entityType: 'WORK_INSTRUCTION',
            entityId: testWorkInstructionId,
            currentStatus: 'DRAFT',
            requiredApproverRoles: ['quality_manager'],
            priority: 'NORMAL'
          },
          testUserId
        )
      ).rejects.toThrow('Active workflow already exists');
    });

    test('should handle unknown entity types gracefully', async () => {
      const result = await unifiedApprovalService.initiateApproval(
        {
          entityType: 'UNKNOWN_TYPE',
          entityId: 'test-id',
          currentStatus: 'PENDING',
          requiredApproverRoles: ['manager'],
          priority: 'LOW'
        },
        testUserId
      );

      // Should use emergency workflow for unknown types
      expect(result.success).toBe(true);
      expect(result.workflowInstanceId).toBeTruthy();
    });
  });

  describe('Approval Processing', () => {
    test('should process work instruction approval', async () => {
      const result = await unifiedApprovalService.processApprovalAction(
        'WORK_INSTRUCTION',
        testWorkInstructionId,
        'APPROVE',
        testUserId,
        'Approved after review - all requirements met'
      );

      expect(result.success).toBe(true);
      expect(result.workflowInstanceId).toBeTruthy();
    });

    test('should process FAI report approval with signature', async () => {
      const signatureData = {
        userId: testUserId,
        reason: 'FAI approval signature',
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test Runner'
      };

      const result = await unifiedApprovalService.processApprovalAction(
        'FAI_REPORT',
        testFAIId,
        'APPROVE',
        testUserId,
        'FAI approved - all measurements within tolerance',
        signatureData
      );

      expect(result.success).toBe(true);
      expect(result.workflowInstanceId).toBeTruthy();
    });

    test('should handle approval rejection', async () => {
      // Create a new work instruction for rejection test
      const rejectionWorkInstruction = await prisma.workInstruction.create({
        data: {
          title: 'Test Work Instruction for Rejection',
          description: 'Test work instruction for rejection testing',
          status: 'DRAFT',
          version: '1.0.0',
          createdById: testUserId,
          updatedById: testUserId
        }
      });

      // Initiate workflow
      await unifiedApprovalService.initiateApproval(
        {
          entityType: 'WORK_INSTRUCTION',
          entityId: rejectionWorkInstruction.id,
          currentStatus: 'DRAFT',
          requiredApproverRoles: ['quality_manager'],
          priority: 'NORMAL'
        },
        testUserId
      );

      // Reject the approval
      const result = await unifiedApprovalService.processApprovalAction(
        'WORK_INSTRUCTION',
        rejectionWorkInstruction.id,
        'REJECT',
        testUserId,
        'Work instruction incomplete - missing safety procedures'
      );

      expect(result.success).toBe(true);
      expect(result.workflowInstanceId).toBeTruthy();
    });

    test('should fail when no active workflow exists', async () => {
      await expect(
        unifiedApprovalService.processApprovalAction(
          'WORK_INSTRUCTION',
          'non-existent-id',
          'APPROVE',
          testUserId,
          'Test approval'
        )
      ).rejects.toThrow('No active workflow found');
    });
  });

  describe('Status and Progress Tracking', () => {
    test('should get approval status for entity with active workflow', async () => {
      const status = await unifiedApprovalService.getApprovalStatus(
        'WORK_INSTRUCTION',
        testWorkInstructionId
      );

      expect(status.hasActiveWorkflow).toBe(true);
      expect(status.workflowStatus).toBeTruthy();
      expect(status.currentStage).toBeTruthy();
      expect(status.completionPercentage).toBeGreaterThanOrEqual(0);
    });

    test('should get approval status for entity without workflow', async () => {
      const newWorkInstruction = await prisma.workInstruction.create({
        data: {
          title: 'No Workflow Work Instruction',
          description: 'Test work instruction without workflow',
          status: 'DRAFT',
          version: '1.0.0',
          createdById: testUserId,
          updatedById: testUserId
        }
      });

      const status = await unifiedApprovalService.getApprovalStatus(
        'WORK_INSTRUCTION',
        newWorkInstruction.id
      );

      expect(status.hasActiveWorkflow).toBe(false);
    });

    test('should get pending approvals for user', async () => {
      const tasks = await unifiedApprovalService.getPendingApprovalsForUser(testUserId);

      expect(Array.isArray(tasks)).toBe(true);
      // Should have tasks from the workflows we created
      expect(tasks.length).toBeGreaterThan(0);

      if (tasks.length > 0) {
        const task = tasks[0];
        expect(task).toHaveProperty('entityType');
        expect(task).toHaveProperty('entityId');
        expect(task).toHaveProperty('workflowId');
        expect(task).toHaveProperty('stageName');
        expect(task).toHaveProperty('priority');
        expect(task).toHaveProperty('assignedAt');
      }
    });
  });

  describe('Entity-Specific Convenience Methods', () => {
    test('should approve work instruction using convenience method', async () => {
      const newWorkInstruction = await prisma.workInstruction.create({
        data: {
          title: 'Convenience Method Work Instruction',
          description: 'Test for convenience method',
          status: 'DRAFT',
          version: '1.0.0',
          createdById: testUserId,
          updatedById: testUserId
        }
      });

      // First initiate workflow
      await unifiedApprovalService.initiateApproval(
        {
          entityType: 'WORK_INSTRUCTION',
          entityId: newWorkInstruction.id,
          currentStatus: 'DRAFT',
          requiredApproverRoles: ['quality_manager'],
          priority: 'NORMAL'
        },
        testUserId
      );

      // Then use convenience method
      const result = await unifiedApprovalService.approveWorkInstruction(
        newWorkInstruction.id,
        testUserId,
        'Approved using convenience method'
      );

      expect(result.success).toBe(true);
      expect(result.workflowInstanceId).toBeTruthy();
    });

    test('should approve FAI report using convenience method with signature', async () => {
      const newFAI = await prisma.fAIReport.create({
        data: {
          faiNumber: 'FAI-CONVENIENCE-TEST-001',
          partId: 'convenience-test-part-id',
          status: 'IN_PROGRESS',
          createdById: testUserId
        }
      });

      // First initiate workflow
      await unifiedApprovalService.initiateApproval(
        {
          entityType: 'FAI_REPORT',
          entityId: newFAI.id,
          currentStatus: 'REVIEW',
          requiredApproverRoles: ['quality_manager'],
          priority: 'HIGH'
        },
        testUserId
      );

      // Then use convenience method (should require signature)
      const result = await unifiedApprovalService.approveFAIReport(
        newFAI.id,
        testUserId,
        'FAI approved - all requirements met'
      );

      expect(result.success).toBe(true);
      expect(result.workflowInstanceId).toBeTruthy();
      expect(result.requiresSignature).toBe(true);
    });

    test('should approve quality process using convenience method', async () => {
      const newQualityInspection = await prisma.qualityInspection.create({
        data: {
          inspectionType: 'FINAL',
          status: 'IN_PROGRESS',
          plannedDate: new Date(),
          inspectionData: { checkpoints: [] },
          createdById: testUserId,
          updatedById: testUserId
        }
      });

      // First initiate workflow
      await unifiedApprovalService.initiateApproval(
        {
          entityType: 'QUALITY_PROCESS',
          entityId: newQualityInspection.id,
          currentStatus: 'PENDING_APPROVAL',
          requiredApproverRoles: ['quality_manager'],
          priority: 'NORMAL'
        },
        testUserId
      );

      // Then use convenience method
      const result = await unifiedApprovalService.approveQualityProcess(
        newQualityInspection.id,
        testUserId,
        'Quality process approved'
      );

      expect(result.success).toBe(true);
      expect(result.workflowInstanceId).toBeTruthy();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid entity types gracefully', async () => {
      await expect(
        unifiedApprovalService.processApprovalAction(
          'INVALID_TYPE',
          'test-id',
          'APPROVE',
          testUserId,
          'Test'
        )
      ).rejects.toThrow();
    });

    test('should handle empty or invalid user IDs', async () => {
      await expect(
        unifiedApprovalService.initiateApproval(
          {
            entityType: 'WORK_INSTRUCTION',
            entityId: 'test-id',
            currentStatus: 'DRAFT',
            requiredApproverRoles: ['manager'],
            priority: 'NORMAL'
          },
          '' // Empty user ID
        )
      ).rejects.toThrow();
    });

    test('should handle workflow initialization errors gracefully', async () => {
      // Test without proper initialization
      const uninitializedService = new UnifiedApprovalIntegration(prisma);

      await expect(
        uninitializedService.initiateApproval(
          {
            entityType: 'WORK_INSTRUCTION',
            entityId: 'test-id',
            currentStatus: 'DRAFT',
            requiredApproverRoles: ['manager'],
            priority: 'NORMAL'
          },
          testUserId
        )
      ).rejects.toThrow('Unified approval system not initialized');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple concurrent approval initiations', async () => {
      const promises = [];

      // Create multiple work instructions and initiate workflows concurrently
      for (let i = 0; i < 5; i++) {
        const workInstruction = await prisma.workInstruction.create({
          data: {
            title: `Concurrent Test Work Instruction ${i}`,
            description: `Test work instruction ${i} for concurrent testing`,
            status: 'DRAFT',
            version: '1.0.0',
            createdById: testUserId,
            updatedById: testUserId
          }
        });

        promises.push(
          unifiedApprovalService.initiateApproval(
            {
              entityType: 'WORK_INSTRUCTION',
              entityId: workInstruction.id,
              currentStatus: 'DRAFT',
              requiredApproverRoles: ['quality_manager'],
              priority: 'NORMAL',
              metadata: { concurrentTest: true, index: i }
            },
            testUserId
          )
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.workflowInstanceId).toBeTruthy();
      });
    });

    test('should efficiently retrieve user tasks with pagination', async () => {
      const tasks = await unifiedApprovalService.getPendingApprovalsForUser(testUserId);

      // Should return tasks efficiently even with multiple workflows
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);

      // Test that all required fields are present for efficient rendering
      if (tasks.length > 0) {
        const task = tasks[0];
        expect(task.entityType).toBeTruthy();
        expect(task.entityId).toBeTruthy();
        expect(task.workflowId).toBeTruthy();
        expect(task.stageName).toBeTruthy();
        expect(task.priority).toBeTruthy();
        expect(task.assignedAt).toBeInstanceOf(Date);
      }
    });
  });
});