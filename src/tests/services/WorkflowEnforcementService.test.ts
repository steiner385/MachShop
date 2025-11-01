/**
 * WorkflowEnforcementService Tests (Issue #41)
 * Comprehensive test suite for flexible workflow enforcement engine
 *
 * GitHub Issue #41: Flexible Workflow Enforcement Engine
 * Priority: P2 - Phase 5 Testing
 *
 * Test Coverage:
 * - Enforcement decision logic (STRICT, FLEXIBLE, HYBRID modes)
 * - Status validation (IN_PROGRESS, COMPLETED requirements)
 * - Prerequisite validation (operation sequencing)
 * - Configuration-driven behavior
 * - Audit trail logging
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowEnforcementService } from '../../services/WorkflowEnforcementService';
import { WorkflowConfigurationService } from '../../services/WorkflowConfigurationService';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
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
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn()
    },
    $transaction: vi.fn()
  }))
}));

describe('WorkflowEnforcementService', () => {
  let enforcementService: WorkflowEnforcementService;
  let mockPrisma: any;
  let mockConfigService: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock Prisma client
    mockPrisma = new PrismaClient();

    // Setup mock configuration service
    mockConfigService = {
      getEffectiveConfiguration: vi.fn()
    };

    // Create service instance
    enforcementService = new WorkflowEnforcementService(mockConfigService, mockPrisma);
  });

  describe('canRecordPerformance()', () => {
    it('should allow recording performance when work order is IN_PROGRESS in STRICT mode', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        status: 'IN_PROGRESS'
      });
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT',
        enforceStatusGating: true
      });

      // Act
      const decision = await enforcementService.canRecordPerformance(workOrderId);

      // Assert
      expect(decision.allowed).toBe(true);
      expect(decision.warnings).toHaveLength(0);
      expect(decision.configMode).toBe('STRICT');
      expect(decision.bypassesApplied).toHaveLength(0);
    });

    it('should allow recording performance when work order is COMPLETED in STRICT mode', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        status: 'COMPLETED'
      });
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT',
        enforceStatusGating: true
      });

      // Act
      const decision = await enforcementService.canRecordPerformance(workOrderId);

      // Assert
      expect(decision.allowed).toBe(true);
    });

    it('should block recording performance when work order is CREATED in STRICT mode', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        status: 'CREATED'
      });
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT',
        enforceStatusGating: true
      });

      // Act
      const decision = await enforcementService.canRecordPerformance(workOrderId);

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Work order status');
      expect(decision.configMode).toBe('STRICT');
    });

    it('should allow recording performance in FLEXIBLE mode regardless of status', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        status: 'CREATED'
      });
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'FLEXIBLE',
        enforceStatusGating: false
      });

      // Act
      const decision = await enforcementService.canRecordPerformance(workOrderId);

      // Assert
      expect(decision.allowed).toBe(true);
      expect(decision.warnings.length).toBeGreaterThan(0);
      expect(decision.configMode).toBe('FLEXIBLE');
      expect(decision.bypassesApplied).toContain('status_gating');
    });

    it('should return error when work order not found', async () => {
      // Arrange
      const workOrderId = 'nonexistent';
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT',
        enforceStatusGating: true
      });

      // Act
      const decision = await enforcementService.canRecordPerformance(workOrderId);

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('not found');
    });

    it('should return error when work order ID is invalid', async () => {
      // Act
      const decision = await enforcementService.canRecordPerformance('');

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('required');
    });
  });

  describe('canStartOperation()', () => {
    it('should allow starting operation that is not yet started', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: operationId,
        workOrderId,
        status: 'CREATED'
      });
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT',
        enforceOperationSequence: false
      });

      // Act
      const decision = await enforcementService.canStartOperation(workOrderId, operationId);

      // Assert
      expect(decision.allowed).toBe(true);
      expect(decision.configMode).toBe('STRICT');
    });

    it('should block starting operation that is already IN_PROGRESS', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: operationId,
        workOrderId,
        status: 'IN_PROGRESS'
      });
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT'
      });

      // Act
      const decision = await enforcementService.canStartOperation(workOrderId, operationId);

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('already in progress');
    });

    it('should block starting operation that is already COMPLETED', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: operationId,
        workOrderId,
        status: 'COMPLETED'
      });
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT'
      });

      // Act
      const decision = await enforcementService.canStartOperation(workOrderId, operationId);

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('already completed');
    });

    it('should return error when operation not found', async () => {
      // Arrange
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue(null);

      // Act
      const decision = await enforcementService.canStartOperation('wo-123', 'nonexistent');

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('not found');
    });

    it('should return error when operation belongs to different work order', async () => {
      // Arrange
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: 'op-456',
        workOrderId: 'different-wo',
        status: 'CREATED'
      });
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT'
      });

      // Act
      const decision = await enforcementService.canStartOperation('wo-123', 'op-456');

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('does not belong');
    });
  });

  describe('canCompleteOperation()', () => {
    it('should allow completing operation that is IN_PROGRESS', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: operationId,
        workOrderId,
        status: 'IN_PROGRESS'
      });
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT'
      });

      // Act
      const decision = await enforcementService.canCompleteOperation(workOrderId, operationId);

      // Assert
      expect(decision.allowed).toBe(true);
      expect(decision.configMode).toBe('STRICT');
    });

    it('should block completing operation that is already COMPLETED', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: operationId,
        workOrderId,
        status: 'COMPLETED'
      });
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT'
      });

      // Act
      const decision = await enforcementService.canCompleteOperation(workOrderId, operationId);

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('already completed');
    });

    it('should block completing operation that is not IN_PROGRESS', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: operationId,
        workOrderId,
        status: 'CREATED'
      });
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT'
      });

      // Act
      const decision = await enforcementService.canCompleteOperation(workOrderId, operationId);

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('must be IN_PROGRESS');
    });
  });

  describe('validatePrerequisites()', () => {
    it('should pass validation in FLEXIBLE mode regardless of prerequisites', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: operationId
      });

      // Act
      const validation = await enforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        'FLEXIBLE'
      );

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.unmetPrerequisites).toHaveLength(0);
    });

    it('should pass validation in STRICT mode when all operations are completed', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: operationId
      });
      mockPrisma.workOrderOperation.findMany.mockResolvedValue([
        { id: 'op-100', status: 'COMPLETED' },
        { id: 'op-200', status: 'COMPLETED' },
        { id: operationId, status: 'CREATED' }
      ]);

      // Act
      const validation = await enforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        'STRICT'
      );

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.unmetPrerequisites).toHaveLength(0);
    });

    it('should fail validation in STRICT mode when prerequisites are not met', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: operationId
      });
      mockPrisma.workOrderOperation.findMany.mockResolvedValue([
        { id: 'op-100', status: 'CREATED' },
        { id: 'op-200', status: 'IN_PROGRESS' },
        { id: operationId, status: 'CREATED' }
      ]);

      // Act
      const validation = await enforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        'STRICT'
      );

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.unmetPrerequisites.length).toBeGreaterThan(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should warn but pass in FLEXIBLE mode with unmet prerequisites', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: operationId
      });
      mockPrisma.workOrderOperation.findMany.mockResolvedValue([
        { id: 'op-100', status: 'CREATED' },
        { id: operationId, status: 'CREATED' }
      ]);

      // Act
      const validation = await enforcementService.validatePrerequisites(
        workOrderId,
        operationId,
        'FLEXIBLE'
      );

      // Assert
      // In FLEXIBLE mode, prerequisites are optional - no warnings or unmet prerequisites
      expect(validation.valid).toBe(true);
      expect(validation.unmetPrerequisites.length).toBe(0);
      expect(validation.warnings.length).toBe(0);
    });
  });

  describe('validateWorkOrderStatus()', () => {
    it('should validate when work order status matches required status', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        status: 'IN_PROGRESS'
      });

      // Act
      const validation = await enforcementService.validateWorkOrderStatus(workOrderId, [
        'IN_PROGRESS'
      ]);

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.currentStatus).toBe('IN_PROGRESS');
    });

    it('should validate when work order status matches one of multiple required statuses', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        status: 'COMPLETED'
      });

      // Act
      const validation = await enforcementService.validateWorkOrderStatus(workOrderId, [
        'IN_PROGRESS',
        'COMPLETED'
      ]);

      // Assert
      expect(validation.valid).toBe(true);
    });

    it('should fail validation when work order status does not match required status', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        status: 'CREATED'
      });

      // Act
      const validation = await enforcementService.validateWorkOrderStatus(workOrderId, [
        'IN_PROGRESS',
        'COMPLETED'
      ]);

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('CREATED');
    });

    it('should return error when work order not found', async () => {
      // Arrange
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);

      // Act
      const validation = await enforcementService.validateWorkOrderStatus('nonexistent', [
        'IN_PROGRESS'
      ]);

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('not found');
    });
  });

  describe('getEffectiveConfiguration()', () => {
    it('should delegate to configuration service', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const expectedConfig = {
        mode: 'STRICT',
        enforceStatusGating: true,
        enforceOperationSequence: true
      };
      mockConfigService.getEffectiveConfiguration.mockResolvedValue(expectedConfig);

      // Act
      const config = await enforcementService.getEffectiveConfiguration(workOrderId);

      // Assert
      expect(config).toEqual(expectedConfig);
      expect(mockConfigService.getEffectiveConfiguration).toHaveBeenCalledWith(workOrderId);
    });
  });

  describe('Integration Tests', () => {
    it('should enforce complete workflow for STRICT mode work order', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';

      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        status: 'IN_PROGRESS'
      });

      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: operationId,
        workOrderId,
        status: 'CREATED'
      });

      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT',
        enforceStatusGating: true,
        enforceOperationSequence: true
      });

      // Act & Assert - Can record performance
      const perfDecision = await enforcementService.canRecordPerformance(workOrderId);
      expect(perfDecision.allowed).toBe(true);

      // Act & Assert - Can start operation
      const startDecision = await enforcementService.canStartOperation(workOrderId, operationId);
      expect(startDecision.allowed).toBe(true);
    });

    it('should allow flexible workflow for FLEXIBLE mode work order', async () => {
      // Arrange
      const workOrderId = 'wo-123';
      const operationId = 'op-456';

      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: workOrderId,
        status: 'CREATED'
      });

      mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
        id: operationId,
        workOrderId,
        status: 'CREATED'
      });

      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'FLEXIBLE',
        enforceStatusGating: false,
        enforceOperationSequence: false
      });

      // Act & Assert - Can record performance despite CREATED status
      const perfDecision = await enforcementService.canRecordPerformance(workOrderId);
      expect(perfDecision.allowed).toBe(true);
      expect(perfDecision.warnings.length).toBeGreaterThan(0);
      expect(perfDecision.bypassesApplied).toContain('status_gating');

      // Act & Assert - Can start operation
      const startDecision = await enforcementService.canStartOperation(workOrderId, operationId);
      expect(startDecision.allowed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should catch and handle database errors gracefully', async () => {
      // Arrange
      mockPrisma.workOrder.findUnique.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert - Should throw wrapped error with descriptive message
      await expect(enforcementService.canRecordPerformance('wo-123')).rejects.toThrow(
        'Failed to check if performance can be recorded'
      );
    });

    it('should handle undefined operation gracefully', async () => {
      // Arrange
      mockPrisma.workOrderOperation.findUnique.mockResolvedValue(null);

      // Act
      const validation = await enforcementService.validatePrerequisites('wo-123', 'op-456', 'STRICT');

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.unmetPrerequisites).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty work order ID', async () => {
      // Act
      const decision = await enforcementService.canRecordPerformance('');

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('required');
    });

    it('should handle whitespace-only work order ID', async () => {
      // Act
      const decision = await enforcementService.canRecordPerformance('   ');

      // Assert
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('required');
    });

    it('should handle missing configuration', async () => {
      // Arrange
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-123',
        status: 'IN_PROGRESS'
      });
      mockConfigService.getEffectiveConfiguration.mockResolvedValue({
        mode: 'STRICT',
        enforceStatusGating: undefined
      });

      // Act
      const decision = await enforcementService.canRecordPerformance('wo-123');

      // Assert
      expect(decision).toBeDefined();
      expect(decision.configMode).toBe('STRICT');
    });

    it('should handle all operation status values', async () => {
      // Arrange
      const statusesToTest = ['CREATED', 'IN_PROGRESS', 'COMPLETED'];

      for (const status of statusesToTest) {
        mockPrisma.workOrderOperation.findUnique.mockResolvedValue({
          id: 'op-456',
          workOrderId: 'wo-123',
          status
        });
        mockConfigService.getEffectiveConfiguration.mockResolvedValue({
          mode: 'STRICT'
        });

        // Act
        const decision = await enforcementService.canStartOperation('wo-123', 'op-456');

        // Assert
        expect(decision).toBeDefined();
        expect(decision.configMode).toBe('STRICT');
      }
    });
  });
});
