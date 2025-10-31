import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkOrderExecutionEnhanced } from '../../services/WorkOrderExecutionEnhanced';
import { WorkOrderInterchangeabilityIntegration } from '../../services/WorkOrderInterchangeabilityIntegration';
import { WorkPerformanceType } from '@prisma/client';

// Import the database module
import prisma from '../../lib/database';

// Mock the database module
vi.mock('../../lib/database', () => ({
  default: {
    workPerformance: {
      create: vi.fn(),
    },
    workOrderPartSubstitution: {
      findMany: vi.fn(),
    },
  },
}));

// Mock the WorkOrderInterchangeabilityIntegration
vi.mock('../../services/WorkOrderInterchangeabilityIntegration', () => ({
  WorkOrderInterchangeabilityIntegration: {
    getInstance: vi.fn(() => ({
      consumeMaterialWithInterchangeability: vi.fn(),
      validateMaterialConsumption: vi.fn(),
      getSubstituteOptions: vi.fn(),
      getWorkOrderSubstitutionStats: vi.fn(),
    })),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('WorkOrderExecutionEnhanced', () => {
  let service: WorkOrderExecutionEnhanced;
  let mockInterchangeabilityIntegration: any;
  const mockPrisma = prisma as any;

  beforeEach(() => {
    service = WorkOrderExecutionEnhanced.getInstance();
    mockInterchangeabilityIntegration = WorkOrderInterchangeabilityIntegration.getInstance();
    vi.clearAllMocks();
  });

  // ==================== ENHANCED MATERIAL CONSUMPTION ====================

  describe('consumeMaterialWithValidation', () => {
    it('should consume material with interchangeability validation successfully', async () => {
      const mockResult = {
        success: true,
        performanceRecordId: 'perf-123',
        substitutionUsed: true,
        originalPartId: 'part-1',
        actualPartUsed: 'part-2',
        quantityConsumed: 10,
        costImpact: 5.50,
        quantityRatio: 1.0,
        substitutionReason: 'Part unavailable',
        workOrderSubstitutionId: 'wo-sub-123',
        messages: ['Material consumed with substitution: part-1 → part-2 (ratio: 1)']
      };

      vi.mocked(mockInterchangeabilityIntegration.consumeMaterialWithInterchangeability)
        .mockResolvedValue(mockResult);

      const data = {
        workOrderId: 'wo-123',
        operationId: 'op-123',
        partId: 'part-1',
        quantityConsumed: 10,
        unitCost: 25.00,
        recordedBy: 'user-123',
        allowSubstitution: true
      };

      const result = await service.consumeMaterialWithValidation(data);

      expect(result.success).toBe(true);
      expect(result.substitutionUsed).toBe(true);
      expect(result.originalPartId).toBe('part-1');
      expect(result.actualPartUsed).toBe('part-2');
      expect(result.costImpact).toBe(5.50);
      expect(result.approvalRequired).toBe(false);
      expect(result.substitutionDetails).toEqual({
        workOrderSubstitutionId: 'wo-sub-123',
        quantityRatio: 1.0,
        substitutionReason: 'Part unavailable',
        approvalId: undefined
      });

      expect(mockInterchangeabilityIntegration.consumeMaterialWithInterchangeability)
        .toHaveBeenCalledWith({
          workOrderId: 'wo-123',
          operationId: 'op-123',
          originalPartId: 'part-1',
          requestedQuantity: 10,
          recordedBy: 'user-123',
          unitCost: 25.00,
          notes: undefined
        });
    });

    it('should use standard consumption when substitution not allowed', async () => {
      const mockPerformanceRecord = {
        id: 'perf-123',
        workOrderId: 'wo-123',
        partId: 'part-1',
        quantityConsumed: 10,
        performanceType: WorkPerformanceType.MATERIAL
      };

      vi.mocked(mockPrisma.workPerformance.create).mockResolvedValue(mockPerformanceRecord);

      const data = {
        workOrderId: 'wo-123',
        operationId: 'op-123',
        partId: 'part-1',
        quantityConsumed: 10,
        quantityPlanned: 10,
        unitCost: 25.00,
        recordedBy: 'user-123',
        allowSubstitution: false
      };

      const result = await service.consumeMaterialWithValidation(data);

      expect(result.success).toBe(true);
      expect(result.substitutionUsed).toBe(false);
      expect(result.originalPartId).toBe('part-1');
      expect(result.actualPartUsed).toBe('part-1');
      expect(result.costImpact).toBe(0);
      expect(result.performanceRecordId).toBe('perf-123');
      expect(result.substitutionDetails).toBeUndefined();

      expect(mockPrisma.workPerformance.create).toHaveBeenCalledWith({
        data: {
          workOrderId: 'wo-123',
          operationId: 'op-123',
          performanceType: WorkPerformanceType.MATERIAL,
          partId: 'part-1',
          quantityConsumed: 10,
          quantityPlanned: 10,
          materialVariance: 0,
          unitCost: 25.00,
          totalCost: 250.00,
          recordedBy: 'user-123',
          notes: undefined,
          recordedAt: expect.any(Date)
        }
      });
    });

    it('should require approval when substitution is used and approval required', async () => {
      const mockResult = {
        success: true,
        performanceRecordId: 'perf-123',
        substitutionUsed: true,
        originalPartId: 'part-1',
        actualPartUsed: 'part-2',
        quantityConsumed: 10,
        costImpact: 5.50,
        quantityRatio: 1.0,
        substitutionReason: 'Part unavailable',
        workOrderSubstitutionId: 'wo-sub-123',
        approvalId: undefined, // No approval provided
        messages: ['Material consumed with substitution: part-1 → part-2 (ratio: 1)']
      };

      vi.mocked(mockInterchangeabilityIntegration.consumeMaterialWithInterchangeability)
        .mockResolvedValue(mockResult);

      const data = {
        workOrderId: 'wo-123',
        partId: 'part-1',
        quantityConsumed: 10,
        recordedBy: 'user-123',
        allowSubstitution: true,
        requireApprovalForSubstitution: true
      };

      const result = await service.consumeMaterialWithValidation(data);

      expect(result.success).toBe(true);
      expect(result.substitutionUsed).toBe(true);
      expect(result.approvalRequired).toBe(true); // Should require approval
    });

    it('should fallback to standard consumption if interchangeability fails', async () => {
      const mockPerformanceRecord = {
        id: 'perf-123',
        workOrderId: 'wo-123',
        partId: 'part-1',
        quantityConsumed: 10
      };

      vi.mocked(mockInterchangeabilityIntegration.consumeMaterialWithInterchangeability)
        .mockRejectedValue(new Error('Interchangeability service failed'));
      vi.mocked(mockPrisma.workPerformance.create).mockResolvedValue(mockPerformanceRecord);

      const data = {
        workOrderId: 'wo-123',
        partId: 'part-1',
        quantityConsumed: 10,
        recordedBy: 'user-123',
        allowSubstitution: true
      };

      const result = await service.consumeMaterialWithValidation(data);

      expect(result.success).toBe(true);
      expect(result.substitutionUsed).toBe(false);
      expect(result.performanceRecordId).toBe('perf-123');
      expect(result.messages).toContain('Standard material consumption completed successfully');
    });

    it('should throw error if both interchangeability and fallback fail', async () => {
      vi.mocked(mockInterchangeabilityIntegration.consumeMaterialWithInterchangeability)
        .mockRejectedValue(new Error('Interchangeability service failed'));
      vi.mocked(mockPrisma.workPerformance.create)
        .mockRejectedValue(new Error('Database error'));

      const data = {
        workOrderId: 'wo-123',
        partId: 'part-1',
        quantityConsumed: 10,
        recordedBy: 'user-123',
        allowSubstitution: true
      };

      await expect(service.consumeMaterialWithValidation(data))
        .rejects.toThrow('Material consumption failed: Interchangeability service failed. Fallback also failed: Database error');
    });

    it('should validate input parameters', async () => {
      const invalidData = {
        workOrderId: '',
        partId: 'part-1',
        quantityConsumed: 10,
        recordedBy: 'user-123'
      };

      await expect(service.consumeMaterialWithValidation(invalidData))
        .rejects.toThrow('Invalid work order ID provided');
    });
  });

  // ==================== PRE-VALIDATION ====================

  describe('preValidateMaterialConsumption', () => {
    it('should pre-validate material consumption successfully', async () => {
      const mockValidation = {
        canProceed: true,
        substitutionRequired: false,
        suggestedSubstitutes: [],
        approvalRequired: false,
        validationMessages: []
      };

      vi.mocked(mockInterchangeabilityIntegration.validateMaterialConsumption)
        .mockResolvedValue(mockValidation);

      const result = await service.preValidateMaterialConsumption(
        'wo-123',
        'part-1',
        10,
        'op-123'
      );

      expect(result.canProceedDirectly).toBe(true);
      expect(result.substitutionRequired).toBe(false);
      expect(result.availableSubstitutes).toBe(0);
      expect(result.approvalRequired).toBe(false);
      expect(result.suggestedAction).toBe('Proceed with standard consumption');

      expect(mockInterchangeabilityIntegration.validateMaterialConsumption)
        .toHaveBeenCalledWith({
          workOrderId: 'wo-123',
          operationId: 'op-123',
          originalPartId: 'part-1',
          requestedQuantity: 10,
          recordedBy: 'system'
        });
    });

    it('should suggest substitution when required', async () => {
      const mockValidation = {
        canProceed: true,
        substitutionRequired: true,
        suggestedSubstitutes: [{ partId: 'part-2' }, { partId: 'part-3' }],
        approvalRequired: false,
        validationMessages: ['Original part unavailable']
      };

      vi.mocked(mockInterchangeabilityIntegration.validateMaterialConsumption)
        .mockResolvedValue(mockValidation);

      const result = await service.preValidateMaterialConsumption(
        'wo-123',
        'part-1',
        10
      );

      expect(result.canProceedDirectly).toBe(false);
      expect(result.substitutionRequired).toBe(true);
      expect(result.availableSubstitutes).toBe(2);
      expect(result.approvalRequired).toBe(false);
      expect(result.suggestedAction).toBe('Substitution available - review options and proceed');
    });

    it('should require approval for substitution', async () => {
      const mockValidation = {
        canProceed: true,
        substitutionRequired: true,
        suggestedSubstitutes: [{ partId: 'part-2' }],
        approvalRequired: true,
        validationMessages: ['Original part unavailable', 'Approval required']
      };

      vi.mocked(mockInterchangeabilityIntegration.validateMaterialConsumption)
        .mockResolvedValue(mockValidation);

      const result = await service.preValidateMaterialConsumption(
        'wo-123',
        'part-1',
        10
      );

      expect(result.canProceedDirectly).toBe(false);
      expect(result.substitutionRequired).toBe(true);
      expect(result.availableSubstitutes).toBe(1);
      expect(result.approvalRequired).toBe(true);
      expect(result.suggestedAction).toBe('Substitution required with approval - submit approval request');
    });

    it('should handle validation errors gracefully', async () => {
      vi.mocked(mockInterchangeabilityIntegration.validateMaterialConsumption)
        .mockRejectedValue(new Error('Validation service failed'));

      const result = await service.preValidateMaterialConsumption(
        'wo-123',
        'part-1',
        10
      );

      expect(result.canProceedDirectly).toBe(false);
      expect(result.substitutionRequired).toBe(false);
      expect(result.availableSubstitutes).toBe(0);
      expect(result.approvalRequired).toBe(false);
      expect(result.validationMessages).toContain('Validation error: Validation service failed');
      expect(result.suggestedAction).toBe('Contact supervisor for manual review');
    });
  });

  // ==================== SUBSTITUTE OPTIONS ====================

  describe('getSubstituteOptions', () => {
    it('should return substitute options', async () => {
      const mockSubstitutes = [
        {
          partId: 'part-2',
          partNumber: 'P002',
          description: 'Substitute Part 2',
          quantityRatio: 1.0,
          priority: 1,
          requiresApproval: false,
          availableQuantity: 20,
          estimatedCost: 30.00
        }
      ];

      vi.mocked(mockInterchangeabilityIntegration.getSubstituteOptions)
        .mockResolvedValue(mockSubstitutes);

      const result = await service.getSubstituteOptions(
        'part-1',
        'wo-123',
        'op-123',
        10
      );

      expect(result).toEqual(mockSubstitutes);
      expect(mockInterchangeabilityIntegration.getSubstituteOptions)
        .toHaveBeenCalledWith('part-1', 'wo-123', 'op-123', 10);
    });

    it('should return empty array if service fails', async () => {
      vi.mocked(mockInterchangeabilityIntegration.getSubstituteOptions)
        .mockRejectedValue(new Error('Service error'));

      const result = await service.getSubstituteOptions('part-1', 'wo-123');

      expect(result).toEqual([]);
    });
  });

  // ==================== WORK ORDER SUBSTITUTION SUMMARY ====================

  describe('getWorkOrderSubstitutionSummary', () => {
    it('should return substitution summary', async () => {
      const mockStats = {
        totalSubstitutions: 2,
        substitutionsByReason: { 'UNAVAILABLE': 1, 'COST_REDUCTION': 1 },
        costImpact: 15.50,
        partsAffected: ['part-1', 'part-3']
      };

      const mockSubstitutionDetails = [
        {
          id: 'sub-1',
          fromPartId: 'part-1',
          toPartId: 'part-2',
          quantitySubstituted: 10,
          reason: 'UNAVAILABLE',
          createdAt: new Date('2024-01-01'),
          fromPart: { partNumber: 'P001' },
          toPart: { partNumber: 'P002' },
          authorizedByUser: { username: 'user1' }
        }
      ];

      vi.mocked(mockInterchangeabilityIntegration.getWorkOrderSubstitutionStats)
        .mockResolvedValue(mockStats);
      vi.mocked(mockPrisma.workOrderPartSubstitution.findMany)
        .mockResolvedValue(mockSubstitutionDetails);

      const result = await service.getWorkOrderSubstitutionSummary('wo-123');

      expect(result.totalSubstitutions).toBe(2);
      expect(result.substitutionsByReason).toEqual({ 'UNAVAILABLE': 1, 'COST_REDUCTION': 1 });
      expect(result.costImpact).toBe(15.50);
      expect(result.partsAffected).toEqual(['part-1', 'part-3']);
      expect(result.substitutionDetails).toHaveLength(1);
      expect(result.substitutionDetails[0]).toEqual({
        fromPartId: 'part-1',
        toPartId: 'part-2',
        quantity: 10,
        reason: 'UNAVAILABLE',
        timestamp: new Date('2024-01-01'),
        authorizedBy: 'user1'
      });
    });

    it('should handle errors and return empty summary', async () => {
      vi.mocked(mockInterchangeabilityIntegration.getWorkOrderSubstitutionStats)
        .mockRejectedValue(new Error('Stats service failed'));

      const result = await service.getWorkOrderSubstitutionSummary('wo-123');

      expect(result.totalSubstitutions).toBe(0);
      expect(result.substitutionsByReason).toEqual({});
      expect(result.costImpact).toBe(0);
      expect(result.partsAffected).toEqual([]);
      expect(result.substitutionDetails).toEqual([]);
    });
  });

  // ==================== INPUT VALIDATION ====================

  describe('input validation', () => {
    it('should validate work order ID', async () => {
      const data = {
        workOrderId: '',
        partId: 'part-1',
        quantityConsumed: 10,
        recordedBy: 'user-123'
      };

      await expect(service.consumeMaterialWithValidation(data))
        .rejects.toThrow('Invalid work order ID provided');
    });

    it('should validate part ID', async () => {
      const data = {
        workOrderId: 'wo-123',
        partId: '',
        quantityConsumed: 10,
        recordedBy: 'user-123'
      };

      await expect(service.consumeMaterialWithValidation(data))
        .rejects.toThrow('Invalid part ID provided');
    });

    it('should validate quantity', async () => {
      const data = {
        workOrderId: 'wo-123',
        partId: 'part-1',
        quantityConsumed: 0,
        recordedBy: 'user-123'
      };

      await expect(service.consumeMaterialWithValidation(data))
        .rejects.toThrow('Quantity consumed must be greater than 0');
    });

    it('should validate recorded by', async () => {
      const data = {
        workOrderId: 'wo-123',
        partId: 'part-1',
        quantityConsumed: 10,
        recordedBy: ''
      };

      await expect(service.consumeMaterialWithValidation(data))
        .rejects.toThrow('RecordedBy user ID is required');
    });
  });

  // ==================== SUGGESTED ACTION LOGIC ====================

  describe('determineSuggestedAction', () => {
    it('should suggest cannot proceed when validation fails', () => {
      const validation = { canProceed: false };
      const result = service['determineSuggestedAction'](validation);
      expect(result).toBe('Cannot proceed - contact supervisor');
    });

    it('should suggest substitution with approval', () => {
      const validation = {
        canProceed: true,
        substitutionRequired: true,
        approvalRequired: true
      };
      const result = service['determineSuggestedAction'](validation);
      expect(result).toBe('Substitution required with approval - submit approval request');
    });

    it('should suggest substitution without approval', () => {
      const validation = {
        canProceed: true,
        substitutionRequired: true,
        approvalRequired: false
      };
      const result = service['determineSuggestedAction'](validation);
      expect(result).toBe('Substitution available - review options and proceed');
    });

    it('should suggest standard consumption', () => {
      const validation = {
        canProceed: true,
        substitutionRequired: false
      };
      const result = service['determineSuggestedAction'](validation);
      expect(result).toBe('Proceed with standard consumption');
    });
  });

  // ==================== SINGLETON PATTERN ====================

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = WorkOrderExecutionEnhanced.getInstance();
      const instance2 = WorkOrderExecutionEnhanced.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});