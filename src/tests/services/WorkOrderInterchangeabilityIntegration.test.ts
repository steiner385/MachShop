import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkOrderInterchangeabilityIntegration } from '../../services/WorkOrderInterchangeabilityIntegration';
import { PartInterchangeabilityService } from '../../services/PartInterchangeabilityService';
import {
  WorkPerformanceType,
  SubstitutionReason,
  SubstitutionType,
  GroupStatus
} from '@prisma/client';

// Import the database module
import prisma from '../../lib/database';

// Mock the database module
vi.mock('../../lib/database', () => ({
  default: {
    workOrder: {
      findUnique: vi.fn(),
    },
    operation: {
      findUnique: vi.fn(),
    },
    part: {
      findUnique: vi.fn(),
    },
    workPerformance: {
      create: vi.fn(),
    },
    workOrderPartSubstitution: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock the PartInterchangeabilityService
vi.mock('../../services/PartInterchangeabilityService', () => ({
  PartInterchangeabilityService: {
    getInstance: vi.fn(() => ({
      validateSubstitution: vi.fn(),
      getAvailableSubstitutes: vi.fn(),
      logWorkOrderSubstitution: vi.fn(),
      getWorkOrderSubstitutions: vi.fn(),
      getAuditLogs: vi.fn(),
      getPartUsageHistory: vi.fn(),
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

describe('WorkOrderInterchangeabilityIntegration', () => {
  let service: WorkOrderInterchangeabilityIntegration;
  let mockInterchangeabilityService: any;
  const mockPrisma = prisma as any;

  beforeEach(() => {
    service = WorkOrderInterchangeabilityIntegration.getInstance();
    mockInterchangeabilityService = PartInterchangeabilityService.getInstance();
    vi.clearAllMocks();
  });

  // ==================== ENHANCED MATERIAL CONSUMPTION ====================

  describe('consumeMaterialWithInterchangeability', () => {
    it('should consume material successfully without substitution when part is available', async () => {
      const mockWorkOrder = {
        id: 'wo-123',
        workOrderNumber: 'WO001',
        status: 'IN_PROGRESS',
        part: { id: 'part-1', partNumber: 'P001' }
      };

      const mockPerformanceRecord = {
        id: 'perf-123',
        workOrderId: 'wo-123',
        partId: 'part-1',
        quantityConsumed: 10,
        performanceType: WorkPerformanceType.MATERIAL
      };

      vi.mocked(mockPrisma.workOrder.findUnique).mockResolvedValue(mockWorkOrder);
      vi.mocked(mockPrisma.workPerformance.create).mockResolvedValue(mockPerformanceRecord);

      const request = {
        workOrderId: 'wo-123',
        originalPartId: 'part-1',
        requestedQuantity: 10,
        recordedBy: 'user-123',
        unitCost: 25.00
      };

      const result = await service.consumeMaterialWithInterchangeability(request);

      expect(result.success).toBe(true);
      expect(result.substitutionUsed).toBe(false);
      expect(result.originalPartId).toBe('part-1');
      expect(result.actualPartUsed).toBe('part-1');
      expect(result.quantityConsumed).toBe(10);
      expect(result.performanceRecordId).toBe('perf-123');
    });

    it('should consume material with substitution when original part is unavailable', async () => {
      const mockWorkOrder = {
        id: 'wo-123',
        workOrderNumber: 'WO001',
        status: 'IN_PROGRESS',
        part: { id: 'part-1', partNumber: 'P001' }
      };

      const mockSubstitutes = [{
        toPartId: 'part-2',
        partNumber: 'P002',
        quantityRatio: 1.0,
        priority: 1,
        requiresApproval: false,
        substitutionType: SubstitutionType.DIRECT,
        groupName: 'Test Group'
      }];

      const mockWorkOrderSubstitution = {
        id: 'wo-sub-123',
        workOrderId: 'wo-123',
        fromPartId: 'part-1',
        toPartId: 'part-2',
        quantitySubstituted: 10,
        reason: SubstitutionReason.UNAVAILABLE
      };

      const mockPerformanceRecord = {
        id: 'perf-123',
        workOrderId: 'wo-123',
        partId: 'part-2',
        quantityConsumed: 10,
        performanceType: WorkPerformanceType.MATERIAL
      };

      vi.mocked(mockPrisma.workOrder.findUnique).mockResolvedValue(mockWorkOrder);
      vi.mocked(mockInterchangeabilityService.getAvailableSubstitutes).mockResolvedValue(mockSubstitutes);
      vi.mocked(mockInterchangeabilityService.logWorkOrderSubstitution).mockResolvedValue(mockWorkOrderSubstitution);
      vi.mocked(mockPrisma.workPerformance.create).mockResolvedValue(mockPerformanceRecord);

      // Mock part availability check to simulate unavailable part
      const originalCheckPartAvailability = service['checkPartAvailability'];
      service['checkPartAvailability'] = vi.fn()
        .mockResolvedValueOnce({
          partId: 'part-1',
          partNumber: 'P001',
          availableQuantity: 5, // Less than requested
          isAvailable: false
        })
        .mockResolvedValueOnce({
          partId: 'part-2',
          partNumber: 'P002',
          availableQuantity: 20,
          isAvailable: true
        });

      const request = {
        workOrderId: 'wo-123',
        originalPartId: 'part-1',
        requestedQuantity: 10,
        recordedBy: 'user-123',
        unitCost: 25.00
      };

      const result = await service.consumeMaterialWithInterchangeability(request);

      expect(result.success).toBe(true);
      expect(result.substitutionUsed).toBe(true);
      expect(result.originalPartId).toBe('part-1');
      expect(result.actualPartUsed).toBe('part-2');
      expect(result.quantityConsumed).toBe(10);
      expect(result.workOrderSubstitutionId).toBe('wo-sub-123');
      expect(result.messages).toContain('Material consumed with substitution: part-1 → part-2 (ratio: 1)');

      // Restore original method
      service['checkPartAvailability'] = originalCheckPartAvailability;
    });

    it('should throw error if work order not found', async () => {
      vi.mocked(mockPrisma.workOrder.findUnique).mockResolvedValue(null);

      const request = {
        workOrderId: 'invalid-wo',
        originalPartId: 'part-1',
        requestedQuantity: 10,
        recordedBy: 'user-123'
      };

      await expect(service.consumeMaterialWithInterchangeability(request))
        .rejects.toThrow('Work order invalid-wo not found');
    });

    it('should throw error if work order status is invalid', async () => {
      const mockWorkOrder = {
        id: 'wo-123',
        workOrderNumber: 'WO001',
        status: 'CREATED', // Invalid status for material consumption
        part: { id: 'part-1', partNumber: 'P001' }
      };

      vi.mocked(mockPrisma.workOrder.findUnique).mockResolvedValue(mockWorkOrder);

      const request = {
        workOrderId: 'wo-123',
        originalPartId: 'part-1',
        requestedQuantity: 10,
        recordedBy: 'user-123'
      };

      await expect(service.consumeMaterialWithInterchangeability(request))
        .rejects.toThrow('Work order wo-123 must be IN_PROGRESS or COMPLETED for material consumption');
    });
  });

  // ==================== MATERIAL CONSUMPTION VALIDATION ====================

  describe('validateMaterialConsumption', () => {
    it('should validate material consumption successfully when part is available', async () => {
      const mockWorkOrder = {
        id: 'wo-123',
        status: 'IN_PROGRESS',
        part: { id: 'part-1', partNumber: 'P001' }
      };

      vi.mocked(mockPrisma.workOrder.findUnique).mockResolvedValue(mockWorkOrder);

      // Mock part availability check to simulate available part
      const originalCheckPartAvailability = service['checkPartAvailability'];
      service['checkPartAvailability'] = vi.fn().mockResolvedValue({
        partId: 'part-1',
        partNumber: 'P001',
        availableQuantity: 20,
        isAvailable: true
      });

      const request = {
        workOrderId: 'wo-123',
        originalPartId: 'part-1',
        requestedQuantity: 10,
        recordedBy: 'user-123'
      };

      const result = await service.validateMaterialConsumption(request);

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.substitutionRequired).toBe(false);
      expect(result.originalPartAvailable).toBe(true);

      // Restore original method
      service['checkPartAvailability'] = originalCheckPartAvailability;
    });

    it('should suggest substitutes when original part is unavailable', async () => {
      const mockWorkOrder = {
        id: 'wo-123',
        status: 'IN_PROGRESS',
        part: { id: 'part-1', partNumber: 'P001' }
      };

      const mockSubstitutes = [{
        toPartId: 'part-2',
        partNumber: 'P002',
        quantityRatio: 1.0,
        priority: 1,
        requiresApproval: false,
        substitutionType: SubstitutionType.DIRECT,
        groupName: 'Test Group'
      }];

      vi.mocked(mockPrisma.workOrder.findUnique).mockResolvedValue(mockWorkOrder);
      vi.mocked(mockInterchangeabilityService.getAvailableSubstitutes).mockResolvedValue(mockSubstitutes);

      // Mock part availability check to simulate unavailable part
      const originalCheckPartAvailability = service['checkPartAvailability'];
      const originalEnhanceSubstituteOptions = service['enhanceSubstituteOptions'];

      service['checkPartAvailability'] = vi.fn().mockResolvedValue({
        partId: 'part-1',
        partNumber: 'P001',
        availableQuantity: 5, // Less than requested
        isAvailable: false
      });

      service['enhanceSubstituteOptions'] = vi.fn().mockResolvedValue([{
        partId: 'part-2',
        partNumber: 'P002',
        description: 'Part 2',
        quantityRatio: 1.0,
        priority: 1,
        substitutionType: SubstitutionType.DIRECT,
        requiresApproval: false,
        availableQuantity: 20,
        groupName: 'Test Group'
      }]);

      const request = {
        workOrderId: 'wo-123',
        originalPartId: 'part-1',
        requestedQuantity: 10,
        recordedBy: 'user-123'
      };

      const result = await service.validateMaterialConsumption(request);

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.substitutionRequired).toBe(true);
      expect(result.originalPartAvailable).toBe(false);
      expect(result.suggestedSubstitutes).toHaveLength(1);
      expect(result.validationMessages).toContain(
        'Original part part-1 not available (required: 10, available: 5)'
      );

      // Restore original methods
      service['checkPartAvailability'] = originalCheckPartAvailability;
      service['enhanceSubstituteOptions'] = originalEnhanceSubstituteOptions;
    });

    it('should prevent proceeding if no substitutes available', async () => {
      const mockWorkOrder = {
        id: 'wo-123',
        status: 'IN_PROGRESS',
        part: { id: 'part-1', partNumber: 'P001' }
      };

      vi.mocked(mockPrisma.workOrder.findUnique).mockResolvedValue(mockWorkOrder);
      vi.mocked(mockInterchangeabilityService.getAvailableSubstitutes).mockResolvedValue([]);

      // Mock part availability check to simulate unavailable part
      const originalCheckPartAvailability = service['checkPartAvailability'];
      service['checkPartAvailability'] = vi.fn().mockResolvedValue({
        partId: 'part-1',
        partNumber: 'P001',
        availableQuantity: 5, // Less than requested
        isAvailable: false
      });

      const request = {
        workOrderId: 'wo-123',
        originalPartId: 'part-1',
        requestedQuantity: 10,
        recordedBy: 'user-123'
      };

      const result = await service.validateMaterialConsumption(request);

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(false);
      expect(result.substitutionRequired).toBe(true);
      expect(result.originalPartAvailable).toBe(false);
      expect(result.validationMessages).toContain('No valid substitutes available for this part');

      // Restore original method
      service['checkPartAvailability'] = originalCheckPartAvailability;
    });
  });

  // ==================== SUBSTITUTE OPTIONS ====================

  describe('getSubstituteOptions', () => {
    it('should return enhanced substitute options', async () => {
      const mockSubstitutes = [{
        toPartId: 'part-2',
        toPart: { partNumber: 'P002', description: 'Part 2' },
        quantityRatio: 1.0,
        priority: 1,
        type: SubstitutionType.DIRECT,
        requiresApproval: false,
        group: { name: 'Test Group' }
      }];

      vi.mocked(mockInterchangeabilityService.getAvailableSubstitutes).mockResolvedValue(mockSubstitutes);

      // Mock enhanced substitute options
      const originalEnhanceSubstituteOptions = service['enhanceSubstituteOptions'];
      service['enhanceSubstituteOptions'] = vi.fn().mockResolvedValue([{
        partId: 'part-2',
        partNumber: 'P002',
        description: 'Part 2',
        quantityRatio: 1.0,
        priority: 1,
        substitutionType: SubstitutionType.DIRECT,
        requiresApproval: false,
        availableQuantity: 20,
        estimatedCost: 30.00,
        groupName: 'Test Group'
      }]);

      const result = await service.getSubstituteOptions('part-1', 'wo-123', 'op-123', 10);

      expect(result).toHaveLength(1);
      expect(result[0].partId).toBe('part-2');
      expect(result[0].partNumber).toBe('P002');
      expect(result[0].availableQuantity).toBe(20);
      expect(result[0].estimatedCost).toBe(30.00);

      // Restore original method
      service['enhanceSubstituteOptions'] = originalEnhanceSubstituteOptions;
    });

    it('should return empty array if service fails', async () => {
      vi.mocked(mockInterchangeabilityService.getAvailableSubstitutes)
        .mockRejectedValue(new Error('Service error'));

      const result = await service.getSubstituteOptions('part-1', 'wo-123');

      expect(result).toEqual([]);
    });
  });

  // ==================== WORK ORDER SUBSTITUTION STATS ====================

  describe('getWorkOrderSubstitutionStats', () => {
    it('should return substitution statistics', async () => {
      const mockSubstitutions = [
        {
          id: 'sub-1',
          fromPartId: 'part-1',
          toPartId: 'part-2',
          reason: SubstitutionReason.UNAVAILABLE,
          quantitySubstituted: 10
        },
        {
          id: 'sub-2',
          fromPartId: 'part-3',
          toPartId: 'part-4',
          reason: SubstitutionReason.COST_REDUCTION,
          quantitySubstituted: 5
        }
      ];

      // Mock the service method
      const originalGetWorkOrderSubstitutions = mockInterchangeabilityService.getWorkOrderSubstitutions;
      mockInterchangeabilityService.getWorkOrderSubstitutions = vi.fn().mockResolvedValue(mockSubstitutions);

      const result = await service.getWorkOrderSubstitutionStats('wo-123');

      expect(result.totalSubstitutions).toBe(2);
      expect(result.substitutionsByReason['UNAVAILABLE']).toBe(1);
      expect(result.substitutionsByReason['COST_REDUCTION']).toBe(1);
      expect(result.partsAffected).toContain('part-1');
      expect(result.partsAffected).toContain('part-3');

      // Restore original method
      mockInterchangeabilityService.getWorkOrderSubstitutions = originalGetWorkOrderSubstitutions;
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      vi.mocked(mockPrisma.workOrder.findUnique).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = {
        workOrderId: 'wo-123',
        originalPartId: 'part-1',
        requestedQuantity: 10,
        recordedBy: 'user-123'
      };

      const result = await service.validateMaterialConsumption(request);

      expect(result.isValid).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.validationMessages).toContain('Validation error: Database connection failed');
    });

    it('should handle consumption errors with fallback', async () => {
      const mockWorkOrder = {
        id: 'wo-123',
        status: 'IN_PROGRESS',
        part: { id: 'part-1', partNumber: 'P001' }
      };

      vi.mocked(mockPrisma.workOrder.findUnique).mockResolvedValue(mockWorkOrder);
      vi.mocked(mockInterchangeabilityService.getAvailableSubstitutes)
        .mockRejectedValue(new Error('Interchangeability service failed'));

      // Mock standard material consumption to succeed
      const mockPerformanceRecord = {
        id: 'perf-123',
        workOrderId: 'wo-123',
        partId: 'part-1',
        quantityConsumed: 10
      };
      vi.mocked(mockPrisma.workPerformance.create).mockResolvedValue(mockPerformanceRecord);

      const request = {
        workOrderId: 'wo-123',
        originalPartId: 'part-1',
        requestedQuantity: 10,
        recordedBy: 'user-123'
      };

      const result = await service.consumeMaterialWithInterchangeability(request);

      expect(result.success).toBe(true);
      expect(result.substitutionUsed).toBe(false);
      expect(result.performanceRecordId).toBe('perf-123');
    });
  });

  // ==================== SINGLETON PATTERN ====================

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = WorkOrderInterchangeabilityIntegration.getInstance();
      const instance2 = WorkOrderInterchangeabilityIntegration.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});