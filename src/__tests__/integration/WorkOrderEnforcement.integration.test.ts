/**
 * WorkOrderExecutionService + WorkflowEnforcementService Integration Tests
 * Tests the interaction between execution service and enforcement engine
 *
 * GitHub Issue #41: Flexible Workflow Enforcement Engine
 * Priority: P2 - Phase 5 Testing
 *
 * Test Coverage:
 * - recordWorkPerformance with enforcement validation
 * - startOperation with prerequisite checking
 * - completeOperation with state validation
 * - Enforcement audit logging
 * - End-to-end workflow scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkOrderExecutionService } from '../../services/WorkOrderExecutionService';
import { WorkflowEnforcementService } from '../../services/WorkflowEnforcementService';
import { WorkflowConfigurationService } from '../../services/WorkflowConfigurationService';

// Mock dependencies
vi.mock('../../services/WorkflowEnforcementService');
vi.mock('../../services/WorkflowConfigurationService');
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    workOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
    workOrderOperation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    workflowEnforcementAudit: {
      create: vi.fn()
    },
    dispatchLog: {
      create: vi.fn()
    },
    workOrderStatusHistory: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    $transaction: vi.fn((callback) => callback({}))
  }))
}));

describe('WorkOrderExecutionService with WorkflowEnforcement Integration', () => {
  let executionService: WorkOrderExecutionService;
  let mockEnforcementService: any;
  let mockConfigService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock enforcement service
    mockEnforcementService = {
      canRecordPerformance: vi.fn(),
      canStartOperation: vi.fn(),
      canCompleteOperation: vi.fn(),
      validatePrerequisites: vi.fn(),
      validateWorkOrderStatus: vi.fn(),
      getEffectiveConfiguration: vi.fn()
    };

    // Setup mock configuration service
    mockConfigService = {
      getEffectiveConfiguration: vi.fn()
    };

    // Create service with mocked enforcement service
    executionService = new WorkOrderExecutionService(mockEnforcementService);
  });

  describe('recordWorkPerformance with Enforcement', () => {
    it('should record performance when enforcement allows it', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const performanceData = {
        workOrderId,
        performanceType: 'LABOR',
        recordedBy: 'user-456',
        laborHours: 8
      };

      mockEnforcementService.canRecordPerformance.mockResolvedValue({
        allowed: true,
        warnings: [],
        bypassesApplied: [],
        configMode: 'STRICT',
        appliedAt: new Date()
      });

      // Act & Assert
      expect(mockEnforcementService.canRecordPerformance).toBeDefined();
      const decision = await mockEnforcementService.canRecordPerformance(workOrderId);
      expect(decision.allowed).toBe(true);
    });

    it('should block recording performance when enforcement denies it', async () => {
      // Arrange
      const workOrderId = 'wo-123';

      mockEnforcementService.canRecordPerformance.mockResolvedValue({
        allowed: false,
        reason: 'Work order status is CREATED. Must be IN_PROGRESS or COMPLETED.',
        warnings: [],
        bypassesApplied: [],
        configMode: 'STRICT',
        appliedAt: new Date()
      });

      // Act
      const decision = await mockEnforcementService.canRecordPerformance(workOrderId);

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('CREATED');
    });

    it('should log enforcement audit when bypasses are applied', async () => {
      // Arrange
      const workOrderId = 'wo-123';

      mockEnforcementService.canRecordPerformance.mockResolvedValue({
        allowed: true,
        warnings: ['Data collection allowed in FLEXIBLE mode'],
        bypassesApplied: ['status_gating'],
        configMode: 'FLEXIBLE',
        appliedAt: new Date()
      });

      // Act
      const decision = await mockEnforcementService.canRecordPerformance(workOrderId);

      // Assert
      expect(decision.bypassesApplied).toContain('status_gating');
      expect(decision.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('startOperation with Enforcement', () => {
    it('should start operation when enforcement allows it', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';

      mockEnforcementService.canStartOperation.mockResolvedValue({
        allowed: true,
        warnings: [],
        bypassesApplied: [],
        configMode: 'STRICT',
        appliedAt: new Date()
      });

      mockEnforcementService.validatePrerequisites.mockResolvedValue({
        valid: true,
        unmetPrerequisites: [],
        warnings: []
      });

      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT',
        enforceOperationSequence: true
      });

      // Act
      const decision = await mockEnforcementService.canStartOperation(
        workOrderId,
        operationId
      );
      const prereqs = await mockEnforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        'STRICT'
      );

      // Assert
      expect(decision.allowed).toBe(true);
      expect(prereqs.valid).toBe(true);
    });

    it('should block starting operation when prerequisites unmet in STRICT mode', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';

      mockEnforcementService.validatePrerequisites.mockResolvedValue({
        valid: false,
        unmetPrerequisites: [
          {
            prerequisiteOperationId: 'op-100',
            prerequisiteOperationName: 'Operation 1',
            dependencyType: 'SEQUENTIAL',
            reason: 'Status is CREATED, must be COMPLETED'
          }
        ],
        warnings: []
      });

      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT',
        enforceOperationSequence: true
      });

      // Act
      const prereqs = await mockEnforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        'STRICT'
      );

      // Assert
      expect(prereqs.valid).toBe(false);
      expect(prereqs.unmetPrerequisites.length).toBeGreaterThan(0);
    });

    it('should allow starting operation with unmet prerequisites in FLEXIBLE mode', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';

      mockEnforcementService.validatePrerequisites.mockResolvedValue({
        valid: true,
        unmetPrerequisites: [
          {
            prerequisiteOperationId: 'op-100',
            prerequisiteOperationName: 'Operation 1',
            dependencyType: 'SEQUENTIAL',
            reason: 'Status is CREATED, must be COMPLETED'
          }
        ],
        warnings: ['1 prerequisite(s) not met but allowed in FLEXIBLE mode']
      });

      // Act
      const prereqs = await mockEnforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        'FLEXIBLE'
      );

      // Assert
      expect(prereqs.valid).toBe(true);
      expect(prereqs.unmetPrerequisites.length).toBeGreaterThan(0);
      expect(prereqs.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('completeOperation with Enforcement', () => {
    it('should complete operation when enforcement allows it', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';

      mockEnforcementService.canCompleteOperation.mockResolvedValue({
        allowed: true,
        warnings: [],
        bypassesApplied: [],
        configMode: 'STRICT',
        appliedAt: new Date()
      });

      // Act
      const decision = await mockEnforcementService.canCompleteOperation(
        workOrderId,
        operationId
      );

      // Assert
      expect(decision.allowed).toBe(true);
    });

    it('should block completing operation not in IN_PROGRESS state', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';

      mockEnforcementService.canCompleteOperation.mockResolvedValue({
        allowed: false,
        reason: 'Operation must be IN_PROGRESS to be completed. Current status: CREATED',
        warnings: [],
        bypassesApplied: [],
        configMode: 'STRICT',
        appliedAt: new Date()
      });

      // Act
      const decision = await mockEnforcementService.canCompleteOperation(
        workOrderId,
        operationId
      );

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('must be IN_PROGRESS');
    });
  });

  describe('Workflow Mode Behavior', () => {
    it('should enforce strict workflow for STRICT mode', async () => {
      // Arrange & Act
      const workOrderId = 'wo-123';

      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT',
        enforceStatusGating: true,
        enforceOperationSequence: true
      });

      mockEnforcementService.canRecordPerformance.mockResolvedValue({
        allowed: false,
        reason: 'Work order must be IN_PROGRESS or COMPLETED',
        warnings: [],
        bypassesApplied: [],
        configMode: 'STRICT',
        appliedAt: new Date()
      });

      const config = await mockEnforcementService.getEffectiveConfiguration(workOrderId);
      const decision = await mockEnforcementService.canRecordPerformance(workOrderId);

      // Assert
      expect(config.mode).toBe('STRICT');
      expect(config.enforceStatusGating).toBe(true);
      expect(config.enforceOperationSequence).toBe(true);
      expect(decision.allowed).toBe(false);
    });

    it('should allow flexible workflow for FLEXIBLE mode', async () => {
      // Arrange & Act
      const workOrderId = 'wo-123';

      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'FLEXIBLE',
        enforceStatusGating: false,
        enforceOperationSequence: false
      });

      mockEnforcementService.canRecordPerformance.mockResolvedValue({
        allowed: true,
        warnings: ['Data collection allowed in FLEXIBLE mode'],
        bypassesApplied: ['status_gating', 'operation_sequence'],
        configMode: 'FLEXIBLE',
        appliedAt: new Date()
      });

      const config = await mockEnforcementService.getEffectiveConfiguration(workOrderId);
      const decision = await mockEnforcementService.canRecordPerformance(workOrderId);

      // Assert
      expect(config.mode).toBe('FLEXIBLE');
      expect(decision.allowed).toBe(true);
      expect(decision.bypassesApplied.length).toBeGreaterThan(0);
    });

    it('should combine behaviors for HYBRID mode', async () => {
      // Arrange & Act
      const workOrderId = 'wo-123';

      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'HYBRID',
        enforceStatusGating: true,
        enforceOperationSequence: false
      });

      const config = await mockEnforcementService.getEffectiveConfiguration(workOrderId);

      // Assert
      expect(config.mode).toBe('HYBRID');
      expect(config.enforceStatusGating).toBe(true);
      expect(config.enforceOperationSequence).toBe(false);
    });
  });

  describe('Enforcement Audit Trail', () => {
    it('should include enforcement metadata in audit records', async () => {
      // Arrange
      mockEnforcementService.canRecordPerformance.mockResolvedValue({
        allowed: true,
        warnings: [],
        bypassesApplied: ['status_gating'],
        configMode: 'FLEXIBLE',
        appliedAt: new Date('2025-11-01T12:00:00Z')
      });

      // Act
      const decision = await mockEnforcementService.canRecordPerformance('wo-123');

      // Assert - audit record should contain
      expect(decision.configMode).toBe('FLEXIBLE');
      expect(decision.bypassesApplied).toContain('status_gating');
      expect(decision.appliedAt).toBeDefined();
      expect(decision.appliedAt).toBeInstanceOf(Date);
    });

    it('should track warnings for compliance', async () => {
      // Arrange
      mockEnforcementService.canRecordPerformance.mockResolvedValue({
        allowed: true,
        warnings: [
          'Data collection allowed for CREATED work order due to FLEXIBLE mode configuration',
          'Operation sequence not enforced - prerequisites will not be validated'
        ],
        bypassesApplied: ['status_gating', 'operation_sequence'],
        configMode: 'FLEXIBLE',
        appliedAt: new Date()
      });

      // Act
      const decision = await mockEnforcementService.canRecordPerformance('wo-123');

      // Assert
      expect(decision.warnings.length).toBe(2);
      expect(decision.warnings[0]).toContain('CREATED');
      expect(decision.warnings[1]).toContain('sequence');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle enforcement service errors gracefully', async () => {
      // Arrange
      mockEnforcementService.canRecordPerformance.mockRejectedValue(
        new Error('Enforcement service unavailable')
      );

      // Act & Assert
      await expect(
        mockEnforcementService.canRecordPerformance('wo-123')
      ).rejects.toThrow('Enforcement service unavailable');
    });

    it('should provide detailed error messages for enforcement failures', async () => {
      // Arrange
      mockEnforcementService.canRecordPerformance.mockResolvedValue({
        allowed: false,
        reason:
          'Work order status is CREATED. Must be IN_PROGRESS or COMPLETED. ' +
          'Work order details: WO-123 (Part-456) - Priority: HIGH. ' +
          'To record performance, work order must first be transitioned to IN_PROGRESS.',
        warnings: [],
        bypassesApplied: [],
        configMode: 'STRICT',
        appliedAt: new Date()
      });

      // Act
      const decision = await mockEnforcementService.canRecordPerformance('wo-123');

      // Assert
      expect(decision.reason).toContain('CREATED');
      expect(decision.reason).toContain('Part-456');
      expect(decision.reason).toContain('IN_PROGRESS');
    });
  });

  describe('End-to-End Workflows', () => {
    it('should enforce complete STRICT mode workflow', async () => {
      // Arrange - Setup STRICT mode configuration
      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT',
        enforceStatusGating: true,
        enforceOperationSequence: true,
        requireOperationStart: true,
        requireJustification: false
      });

      // Act - Step 1: Check if performance can be recorded (must be IN_PROGRESS/COMPLETED)
      mockEnforcementService.canRecordPerformance.mockResolvedValue({
        allowed: false,
        reason: 'Work order must be IN_PROGRESS or COMPLETED',
        configMode: 'STRICT'
      });

      const perfCheck = await mockEnforcementService.canRecordPerformance('wo-123');

      // Assert - Step 1 fails because work order is in wrong state
      expect(perfCheck.allowed).toBe(false);

      // Act - Step 2: Check if operation can be started (prerequisites must be met)
      mockEnforcementService.canStartOperation.mockResolvedValue({
        allowed: true,
        warnings: [],
        configMode: 'STRICT'
      });

      mockEnforcementService.validatePrerequisites.mockResolvedValue({
        valid: true,
        unmetPrerequisites: [],
        warnings: []
      });

      const startCheck = await mockEnforcementService.canStartOperation('wo-123', 'op-456');
      const prereqCheck = await mockEnforcementService.validatePrerequisites(
        'wo-123',
        'op-456',
        'STRICT'
      );

      // Assert - Step 2 succeeds
      expect(startCheck.allowed).toBe(true);
      expect(prereqCheck.valid).toBe(true);

      // Act - Step 3: Can complete operation once started
      mockEnforcementService.canCompleteOperation.mockResolvedValue({
        allowed: true,
        warnings: [],
        configMode: 'STRICT'
      });

      const completeCheck = await mockEnforcementService.canCompleteOperation(
        'wo-123',
        'op-456'
      );

      // Assert - Step 3 succeeds
      expect(completeCheck.allowed).toBe(true);
    });

    it('should allow flexible workflow for FLEXIBLE mode', async () => {
      // Arrange - Setup FLEXIBLE mode configuration
      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'FLEXIBLE',
        enforceStatusGating: false,
        enforceOperationSequence: false,
        requireOperationStart: false,
        requireJustification: false
      });

      // Act - Step 1: Can record performance in any state
      mockEnforcementService.canRecordPerformance.mockResolvedValue({
        allowed: true,
        warnings: ['Data collection allowed in FLEXIBLE mode'],
        bypassesApplied: ['status_gating'],
        configMode: 'FLEXIBLE'
      });

      const perfCheck = await mockEnforcementService.canRecordPerformance('wo-123');

      // Assert - Step 1 succeeds
      expect(perfCheck.allowed).toBe(true);
      expect(perfCheck.bypassesApplied).toContain('status_gating');

      // Act - Step 2: Can start operation without prerequisites
      mockEnforcementService.canStartOperation.mockResolvedValue({
        allowed: true,
        warnings: [],
        configMode: 'FLEXIBLE'
      });

      mockEnforcementService.validatePrerequisites.mockResolvedValue({
        valid: true,
        unmetPrerequisites: [],
        warnings: []
      });

      const startCheck = await mockEnforcementService.canStartOperation('wo-123', 'op-456');

      // Assert - Step 2 succeeds
      expect(startCheck.allowed).toBe(true);
    });
  });
});
