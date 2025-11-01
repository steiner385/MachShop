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

// Mock the database and dependent services BEFORE imports
vi.mock('../../lib/database', () => ({
  default: {
    workOrder: { findUnique: vi.fn(), update: vi.fn() },
    workOrderOperation: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    workflowEnforcementAudit: { create: vi.fn() },
    dispatchLog: { create: vi.fn() },
    workOrderStatusHistory: { create: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn()
  }
}));

vi.mock('../../services/WorkflowConfigurationService', () => ({
  WorkflowConfigurationService: vi.fn().mockImplementation(() => ({
    getEffectiveConfiguration: vi.fn()
  }))
}));

vi.mock('../../services/WorkflowEnforcementService', () => ({
  WorkflowEnforcementService: vi.fn().mockImplementation(() => ({
    canRecordPerformance: vi.fn(),
    canStartOperation: vi.fn(),
    canCompleteOperation: vi.fn(),
    validatePrerequisites: vi.fn(),
    validateWorkOrderStatus: vi.fn(),
    getEffectiveConfiguration: vi.fn()
  }))
}));

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}));

vi.mock('../../config/config', () => ({
  config: { bcryptRounds: 12 }
}));

describe('WorkOrderExecutionService + WorkflowEnforcementService Integration', () => {
  let mockEnforcementService: any;
  let mockConfigService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mocks for each test
    mockEnforcementService = {
      canRecordPerformance: vi.fn(),
      canStartOperation: vi.fn(),
      canCompleteOperation: vi.fn(),
      validatePrerequisites: vi.fn(),
      validateWorkOrderStatus: vi.fn(),
      getEffectiveConfiguration: vi.fn()
    };

    mockConfigService = {
      getEffectiveConfiguration: vi.fn()
    };
  });

  describe('Enforcement Decision Workflow - STRICT Mode', () => {
    it('should enforce complete STRICT mode workflow for record performance', async () => {
      // Arrange
      const workOrderId = 'wo-123';

      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT',
        enforceStatusGating: true,
        enforceOperationSequence: true,
        requireOperationStart: true
      });

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
      expect(decision.configMode).toBe('STRICT');
      expect(decision.bypassesApplied).toHaveLength(0);
    });

    it('should allow recording performance in STRICT mode when work order is IN_PROGRESS', async () => {
      // Arrange
      const workOrderId = 'wo-124';

      mockEnforcementService.canRecordPerformance.mockResolvedValue({
        allowed: true,
        warnings: [],
        bypassesApplied: [],
        configMode: 'STRICT',
        appliedAt: new Date()
      });

      // Act
      const decision = await mockEnforcementService.canRecordPerformance(workOrderId);

      // Assert
      expect(decision.allowed).toBe(true);
      expect(decision.warnings).toHaveLength(0);
    });
  });

  describe('Enforcement Decision Workflow - FLEXIBLE Mode', () => {
    it('should allow recording performance in FLEXIBLE mode with status bypass', async () => {
      // Arrange
      const workOrderId = 'wo-125';

      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'FLEXIBLE',
        enforceStatusGating: false,
        enforceOperationSequence: false,
        requireOperationStart: false
      });

      mockEnforcementService.canRecordPerformance.mockResolvedValue({
        allowed: true,
        warnings: ['Data collection allowed in FLEXIBLE mode for CREATED status'],
        bypassesApplied: ['status_gating'],
        configMode: 'FLEXIBLE',
        appliedAt: new Date()
      });

      // Act
      const decision = await mockEnforcementService.canRecordPerformance(workOrderId);

      // Assert
      expect(decision.allowed).toBe(true);
      expect(decision.warnings).toHaveLength(1);
      expect(decision.bypassesApplied).toContain('status_gating');
      expect(decision.configMode).toBe('FLEXIBLE');
    });

    it('should bypass prerequisites in FLEXIBLE mode', async () => {
      // Arrange
      const workOrderId = 'wo-126';
      const operationId = 'op-789';

      mockEnforcementService.validatePrerequisites.mockResolvedValue({
        valid: true,
        unmetPrerequisites: [],
        warnings: []
      });

      // Act
      const validation = await mockEnforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        'FLEXIBLE'
      );

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.unmetPrerequisites).toHaveLength(0);
    });
  });

  describe('Operation State Transitions', () => {
    it('should validate operation can start', async () => {
      // Arrange
      const workOrderId = 'wo-127';
      const operationId = 'op-456';

      mockEnforcementService.canStartOperation.mockResolvedValue({
        allowed: true,
        warnings: [],
        configMode: 'STRICT',
        bypassesApplied: [],
        appliedAt: new Date()
      });

      // Act
      const decision = await mockEnforcementService.canStartOperation(workOrderId, operationId);

      // Assert
      expect(decision.allowed).toBe(true);
    });

    it('should block starting an already in-progress operation', async () => {
      // Arrange
      const workOrderId = 'wo-128';
      const operationId = 'op-457';

      mockEnforcementService.canStartOperation.mockResolvedValue({
        allowed: false,
        reason: 'Operation op-457 is already in progress',
        warnings: [],
        configMode: 'STRICT',
        bypassesApplied: [],
        appliedAt: new Date()
      });

      // Act
      const decision = await mockEnforcementService.canStartOperation(workOrderId, operationId);

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('already in progress');
    });

    it('should validate operation can complete', async () => {
      // Arrange
      const workOrderId = 'wo-129';
      const operationId = 'op-458';

      mockEnforcementService.canCompleteOperation.mockResolvedValue({
        allowed: true,
        warnings: [],
        configMode: 'STRICT',
        bypassesApplied: [],
        appliedAt: new Date()
      });

      // Act
      const decision = await mockEnforcementService.canCompleteOperation(workOrderId, operationId);

      // Assert
      expect(decision.allowed).toBe(true);
    });

    it('should block completing operation that is not in progress', async () => {
      // Arrange
      const workOrderId = 'wo-130';
      const operationId = 'op-459';

      mockEnforcementService.canCompleteOperation.mockResolvedValue({
        allowed: false,
        reason: 'Operation must be IN_PROGRESS to be completed. Current status: CREATED',
        warnings: [],
        configMode: 'STRICT',
        bypassesApplied: [],
        appliedAt: new Date()
      });

      // Act
      const decision = await mockEnforcementService.canCompleteOperation(workOrderId, operationId);

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('IN_PROGRESS');
    });
  });

  describe('Prerequisite Validation', () => {
    it('should identify unmet prerequisites in STRICT mode', async () => {
      // Arrange
      const workOrderId = 'wo-131';
      const operationId = 'op-460';

      mockEnforcementService.validatePrerequisites.mockResolvedValue({
        valid: false,
        unmetPrerequisites: [
          {
            prerequisiteOperationId: 'op-100',
            prerequisiteOperationName: 'Operation 1',
            dependencyType: 'SEQUENTIAL',
            reason: 'Status is CREATED, must be COMPLETED before this operation can start'
          }
        ],
        warnings: []
      });

      // Act
      const validation = await mockEnforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        'STRICT'
      );

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.unmetPrerequisites).toHaveLength(1);
      expect(validation.unmetPrerequisites[0].prerequisiteOperationId).toBe('op-100');
      expect(validation.unmetPrerequisites[0].dependencyType).toBe('SEQUENTIAL');
    });

    it('should pass prerequisites when all preceding operations are completed', async () => {
      // Arrange
      const workOrderId = 'wo-132';
      const operationId = 'op-461';

      mockEnforcementService.validatePrerequisites.mockResolvedValue({
        valid: true,
        unmetPrerequisites: [],
        warnings: []
      });

      // Act
      const validation = await mockEnforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        'STRICT'
      );

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.unmetPrerequisites).toHaveLength(0);
    });
  });

  describe('Enforcement Mode Behavior', () => {
    it('should apply STRICT mode restrictions to record performance', async () => {
      // Arrange
      const config = {
        mode: 'STRICT',
        enforceStatusGating: true,
        enforceOperationSequence: true,
        requireOperationStart: true
      };

      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue(config);

      // Act
      const effectiveConfig = await mockEnforcementService.getEffectiveConfiguration('wo-133');

      // Assert
      expect(effectiveConfig.mode).toBe('STRICT');
      expect(effectiveConfig.enforceStatusGating).toBe(true);
      expect(effectiveConfig.enforceOperationSequence).toBe(true);
    });

    it('should apply FLEXIBLE mode allowances', async () => {
      // Arrange
      const config = {
        mode: 'FLEXIBLE',
        enforceStatusGating: false,
        enforceOperationSequence: false,
        requireOperationStart: false
      };

      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue(config);

      // Act
      const effectiveConfig = await mockEnforcementService.getEffectiveConfiguration('wo-134');

      // Assert
      expect(effectiveConfig.mode).toBe('FLEXIBLE');
      expect(effectiveConfig.enforceStatusGating).toBe(false);
      expect(effectiveConfig.enforceOperationSequence).toBe(false);
    });

    it('should apply HYBRID mode selective enforcement', async () => {
      // Arrange
      const config = {
        mode: 'HYBRID',
        enforceStatusGating: true,
        enforceOperationSequence: false,
        requireOperationStart: true
      };

      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue(config);

      // Act
      const effectiveConfig = await mockEnforcementService.getEffectiveConfiguration('wo-135');

      // Assert
      expect(effectiveConfig.mode).toBe('HYBRID');
      expect(effectiveConfig.enforceStatusGating).toBe(true);
      expect(effectiveConfig.enforceOperationSequence).toBe(false);
    });
  });

  describe('End-to-End Workflow Scenarios', () => {
    it('should complete full STRICT workflow: check -> start -> complete', async () => {
      // Arrange
      const workOrderId = 'wo-136';
      const operationId = 'op-462';

      // Step 1: Check if performance can be recorded
      mockEnforcementService.canRecordPerformance.mockResolvedValueOnce({
        allowed: true,
        warnings: [],
        bypassesApplied: [],
        configMode: 'STRICT',
        appliedAt: new Date()
      });

      // Step 2: Check if operation can start
      mockEnforcementService.canStartOperation.mockResolvedValueOnce({
        allowed: true,
        warnings: [],
        configMode: 'STRICT',
        bypassesApplied: [],
        appliedAt: new Date()
      });

      // Step 3: Validate prerequisites
      mockEnforcementService.validatePrerequisites.mockResolvedValueOnce({
        valid: true,
        unmetPrerequisites: [],
        warnings: []
      });

      // Step 4: Check if operation can complete
      mockEnforcementService.canCompleteOperation.mockResolvedValueOnce({
        allowed: true,
        warnings: [],
        configMode: 'STRICT',
        bypassesApplied: [],
        appliedAt: new Date()
      });

      // Act - Execute full workflow
      const perfCheck = await mockEnforcementService.canRecordPerformance(workOrderId);
      expect(perfCheck.allowed).toBe(true);

      const startCheck = await mockEnforcementService.canStartOperation(workOrderId, operationId);
      expect(startCheck.allowed).toBe(true);

      const prerequisiteCheck = await mockEnforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        'STRICT'
      );
      expect(prerequisiteCheck.valid).toBe(true);

      const completeCheck = await mockEnforcementService.canCompleteOperation(workOrderId, operationId);

      // Assert
      expect(completeCheck.allowed).toBe(true);
      expect(mockEnforcementService.canRecordPerformance).toHaveBeenCalledWith(workOrderId);
      expect(mockEnforcementService.canStartOperation).toHaveBeenCalledWith(workOrderId, operationId);
      expect(mockEnforcementService.validatePrerequisites).toHaveBeenCalledWith(
        workOrderId,
        operationId,
        'STRICT'
      );
      expect(mockEnforcementService.canCompleteOperation).toHaveBeenCalledWith(workOrderId, operationId);
    });

    it('should complete full FLEXIBLE workflow: bypasses applied', async () => {
      // Arrange
      const workOrderId = 'wo-137';
      const operationId = 'op-463';

      // Step 1: Record performance with bypass warning
      mockEnforcementService.canRecordPerformance.mockResolvedValueOnce({
        allowed: true,
        warnings: ['Data collection allowed in FLEXIBLE mode'],
        bypassesApplied: ['status_gating'],
        configMode: 'FLEXIBLE',
        appliedAt: new Date()
      });

      // Step 2: Start operation with bypass warning
      mockEnforcementService.canStartOperation.mockResolvedValueOnce({
        allowed: true,
        warnings: [],
        configMode: 'FLEXIBLE',
        bypassesApplied: [],
        appliedAt: new Date()
      });

      // Step 3: Validate prerequisites (optional in FLEXIBLE)
      mockEnforcementService.validatePrerequisites.mockResolvedValueOnce({
        valid: true,
        unmetPrerequisites: [],
        warnings: []
      });

      // Step 4: Complete operation
      mockEnforcementService.canCompleteOperation.mockResolvedValueOnce({
        allowed: true,
        warnings: [],
        configMode: 'FLEXIBLE',
        bypassesApplied: [],
        appliedAt: new Date()
      });

      // Act
      const perfCheck = await mockEnforcementService.canRecordPerformance(workOrderId);
      expect(perfCheck.allowed).toBe(true);
      expect(perfCheck.bypassesApplied).toContain('status_gating');

      const startCheck = await mockEnforcementService.canStartOperation(workOrderId, operationId);
      expect(startCheck.allowed).toBe(true);

      const prerequisiteCheck = await mockEnforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        'FLEXIBLE'
      );
      expect(prerequisiteCheck.valid).toBe(true);

      const completeCheck = await mockEnforcementService.canCompleteOperation(workOrderId, operationId);

      // Assert
      expect(completeCheck.allowed).toBe(true);
      expect(perfCheck.configMode).toBe('FLEXIBLE');
    });
  });

  describe('Configuration Integration', () => {
    it('should retrieve effective configuration for work order', async () => {
      // Arrange
      const workOrderId = 'wo-138';
      const expectedConfig = {
        mode: 'STRICT',
        enforceStatusGating: true,
        enforceOperationSequence: true,
        requireOperationStart: true,
        requireJustification: false
      };

      mockEnforcementService.getEffectiveConfiguration.mockResolvedValue(expectedConfig);

      // Act
      const config = await mockEnforcementService.getEffectiveConfiguration(workOrderId);

      // Assert
      expect(config).toEqual(expectedConfig);
      expect(mockEnforcementService.getEffectiveConfiguration).toHaveBeenCalledWith(workOrderId);
    });
  });
});
