/**
 * ✅ GITHUB ISSUE #175: EffectivityService Unit Tests
 *
 * Comprehensive unit tests for EffectivityService - Part of Epic 1: Backend Service Testing
 * Testing ECO effectivity dates, version transitions, and interchangeability rules
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EffectivityService } from '../../services/EffectivityService';
import {
  EffectivityType,
  ECOStatus,
  ECOEventType,
  ECOPriority,
  ECOTaskStatus
} from '@prisma/client';
import {
  EffectivityInput,
  EffectivityContext,
  ECOError,
  ECOValidationError
} from '../../types/eco';

// Mock Prisma Client
const mockPrisma = {
  engineeringChangeOrder: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  eCOHistory: {
    create: vi.fn(),
  },
  workInstruction: {
    findUnique: vi.fn(),
  },
  setupSheet: {
    findUnique: vi.fn(),
  },
  $on: vi.fn(),
  $disconnect: vi.fn(),
};

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock PrismaClient
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn(() => mockPrisma),
    EffectivityType: {
      BY_DATE: 'BY_DATE',
      BY_SERIAL_NUMBER: 'BY_SERIAL_NUMBER',
      BY_WORK_ORDER: 'BY_WORK_ORDER',
      BY_LOT_BATCH: 'BY_LOT_BATCH',
      IMMEDIATE: 'IMMEDIATE',
    },
    ECOStatus: {
      DRAFT: 'DRAFT',
      SUBMITTED: 'SUBMITTED',
      CRB_REVIEW: 'CRB_REVIEW',
      CRB_APPROVED: 'CRB_APPROVED',
      IMPLEMENTATION: 'IMPLEMENTATION',
      COMPLETED: 'COMPLETED',
      REJECTED: 'REJECTED',
      CANCELLED: 'CANCELLED',
    },
    ECOEventType: {
      CREATED: 'CREATED',
      SUBMITTED: 'SUBMITTED',
      EFFECTIVITY_SET: 'EFFECTIVITY_SET',
      STATUS_CHANGED: 'STATUS_CHANGED',
    },
    ECOPriority: {
      EMERGENCY: 'EMERGENCY',
      CRITICAL: 'CRITICAL',
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'LOW',
    },
    ECOTaskStatus: {
      PENDING: 'PENDING',
      IN_PROGRESS: 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
      BLOCKED: 'BLOCKED',
    },
  };
});

describe('EffectivityService', () => {
  let effectivityService: EffectivityService;

  beforeEach(() => {
    effectivityService = new EffectivityService(mockPrisma as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('setEffectivity', () => {
    const mockECO = {
      id: 'eco-123',
      ecoNumber: 'ECO-2024-001',
      status: ECOStatus.CRB_APPROVED,
      affectedParts: ['part-1', 'part-2'],
    };

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days in the future

    const mockEffectivityInput: EffectivityInput = {
      effectivityType: EffectivityType.BY_DATE,
      effectivityValue: futureDate.toISOString().split('T')[0], // YYYY-MM-DD format
      isInterchangeable: true,
      plannedEffectiveDate: futureDate,
    };

    it('should set effectivity for an ECO successfully', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);
      mockPrisma.engineeringChangeOrder.update.mockResolvedValue({});
      mockPrisma.eCOHistory.create.mockResolvedValue({});

      await effectivityService.setEffectivity('eco-123', mockEffectivityInput);

      expect(mockPrisma.engineeringChangeOrder.findUnique).toHaveBeenCalledWith({
        where: { id: 'eco-123' }
      });

      expect(mockPrisma.engineeringChangeOrder.update).toHaveBeenCalledWith({
        where: { id: 'eco-123' },
        data: expect.objectContaining({
          effectivityType: EffectivityType.BY_DATE,
          effectivityValue: expect.any(String),
          isInterchangeable: true,
          plannedEffectiveDate: expect.any(Date),
        })
      });

      expect(mockPrisma.eCOHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ecoId: 'eco-123',
          eventType: ECOEventType.EFFECTIVITY_SET,
          eventDescription: expect.stringContaining('Effectivity set: BY_DATE'),
          details: expect.any(Object),
          performedById: expect.any(String),
          performedByName: expect.any(String),
          performedByRole: expect.any(String),
        })
      });
    });

    it('should throw ECOError when ECO not found', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(null);

      await expect(effectivityService.setEffectivity('eco-999', mockEffectivityInput))
        .rejects.toThrow(ECOError);

      expect(mockPrisma.engineeringChangeOrder.update).not.toHaveBeenCalled();
    });

    it('should throw ECOValidationError for invalid effectivity value', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const invalidInput: EffectivityInput = {
        effectivityType: EffectivityType.BY_DATE,
        effectivityValue: 'invalid-date',
        isInterchangeable: false,
      };

      await expect(effectivityService.setEffectivity('eco-123', invalidInput))
        .rejects.toThrow(ECOError);
    });

    it('should throw ECOValidationError for past effective date', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const pastDateInput: EffectivityInput = {
        effectivityType: EffectivityType.BY_DATE,
        effectivityValue: '2024-01-15',
        isInterchangeable: false,
        plannedEffectiveDate: new Date('2020-01-01'), // Past date
      };

      await expect(effectivityService.setEffectivity('eco-123', pastDateInput))
        .rejects.toThrow(ECOError);
    });

    it('should throw ECOValidationError for immediate effectivity on non-approved ECO', async () => {
      const draftECO = { ...mockECO, status: ECOStatus.DRAFT };
      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(draftECO);

      const immediateInput: EffectivityInput = {
        effectivityType: EffectivityType.IMMEDIATE,
        effectivityValue: '',
        isInterchangeable: false,
      };

      await expect(effectivityService.setEffectivity('eco-123', immediateInput))
        .rejects.toThrow(ECOError);
    });

    it('should handle database errors', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);
      mockPrisma.engineeringChangeOrder.update.mockRejectedValue(new Error('Database error'));

      await expect(effectivityService.setEffectivity('eco-123', mockEffectivityInput))
        .rejects.toThrow(ECOError);
    });
  });

  describe('getEffectiveVersion', () => {
    const mockAffectingECOs = [{
      id: 'eco-123',
      actualEffectiveDate: new Date('2024-01-15'),
      plannedEffectiveDate: new Date('2024-01-15'),
      effectivityType: EffectivityType.BY_DATE,
      effectivityValue: '2024-01-15',
      affectedDocuments: [{
        documentType: 'WorkInstruction',
        documentId: 'wi-456',
        targetVersion: '2.0.0'
      }]
    }];

    it('should return effective version when ECO is effective', async () => {
      // Setup mock affecting ECOs with proper status
      const mockAffectingECOsWithStatus = mockAffectingECOs.map(eco => ({
        ...eco,
        status: ECOStatus.COMPLETED, // Ensure the ECO has a proper status
        affectedParts: ['part-1', 'part-2'] // Add the missing affectedParts
      }));

      mockPrisma.engineeringChangeOrder.findMany.mockResolvedValue(mockAffectingECOsWithStatus);
      // Mock checkEffectivity to return true so that the ECO is considered effective
      vi.spyOn(effectivityService, 'checkEffectivity').mockResolvedValue(true);

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
        date: new Date('2024-01-20'),
      };

      const result = await effectivityService.getEffectiveVersion('WorkInstruction', 'wi-456', context);

      expect(result).toBe('2.0.0');
      expect(mockPrisma.engineeringChangeOrder.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: { in: [ECOStatus.CRB_APPROVED, ECOStatus.IMPLEMENTATION, ECOStatus.COMPLETED] }
        }),
        include: expect.any(Object),
        orderBy: { actualEffectiveDate: 'desc' }
      });
    });

    it('should return current version when no effective ECO found', async () => {
      mockPrisma.engineeringChangeOrder.findMany.mockResolvedValue([]);
      mockPrisma.workInstruction.findUnique.mockResolvedValue({ version: '1.5.0' });

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
      };

      const result = await effectivityService.getEffectiveVersion('WorkInstruction', 'wi-456', context);

      expect(result).toBe('1.5.0');
    });

    it('should return default version when entity not found', async () => {
      mockPrisma.engineeringChangeOrder.findMany.mockResolvedValue([]);
      mockPrisma.workInstruction.findUnique.mockResolvedValue(null);

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-999',
      };

      const result = await effectivityService.getEffectiveVersion('WorkInstruction', 'wi-999', context);

      expect(result).toBe('1.0.0');
    });

    it('should handle database errors', async () => {
      mockPrisma.engineeringChangeOrder.findMany.mockRejectedValue(new Error('Database error'));

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
      };

      await expect(effectivityService.getEffectiveVersion('WorkInstruction', 'wi-456', context))
        .rejects.toThrow(ECOError);
    });
  });

  describe('checkEffectivity', () => {
    it('should return true for BY_DATE effectivity when date is past effective date', async () => {
      const mockECO = {
        id: 'eco-123',
        effectivityType: EffectivityType.BY_DATE,
        effectivityValue: '2024-01-15',
        actualEffectiveDate: new Date('2024-01-15'),
        plannedEffectiveDate: new Date('2024-01-15'),
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
        date: new Date('2024-01-20'),
      };

      const result = await effectivityService.checkEffectivity('eco-123', context);

      expect(result).toBe(true);
    });

    it('should return false for BY_DATE effectivity when date is before effective date', async () => {
      const mockECO = {
        id: 'eco-123',
        effectivityType: EffectivityType.BY_DATE,
        effectivityValue: '2024-01-15',
        actualEffectiveDate: new Date('2024-01-15'),
        plannedEffectiveDate: new Date('2024-01-15'),
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
        date: new Date('2024-01-10'),
      };

      const result = await effectivityService.checkEffectivity('eco-123', context);

      expect(result).toBe(false);
    });

    it('should return true for BY_SERIAL_NUMBER effectivity when serial is greater than or equal', async () => {
      const mockECO = {
        id: 'eco-123',
        effectivityType: EffectivityType.BY_SERIAL_NUMBER,
        effectivityValue: '1000',
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
        serialNumber: '1005',
      };

      const result = await effectivityService.checkEffectivity('eco-123', context);

      expect(result).toBe(true);
    });

    it('should return false for BY_SERIAL_NUMBER effectivity when serial is less', async () => {
      const mockECO = {
        id: 'eco-123',
        effectivityType: EffectivityType.BY_SERIAL_NUMBER,
        effectivityValue: '1000',
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
        serialNumber: '995',
      };

      const result = await effectivityService.checkEffectivity('eco-123', context);

      expect(result).toBe(false);
    });

    it('should return true for BY_WORK_ORDER effectivity when work order is greater than or equal', async () => {
      const mockECO = {
        id: 'eco-123',
        effectivityType: EffectivityType.BY_WORK_ORDER,
        effectivityValue: '5000',
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
        workOrderNumber: '5010',
      };

      const result = await effectivityService.checkEffectivity('eco-123', context);

      expect(result).toBe(true);
    });

    it('should return true for BY_LOT_BATCH effectivity when lot batch is greater than or equal', async () => {
      const mockECO = {
        id: 'eco-123',
        effectivityType: EffectivityType.BY_LOT_BATCH,
        effectivityValue: 'LOT-2024-001',
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
        lotBatch: 'LOT-2024-002',
      };

      const result = await effectivityService.checkEffectivity('eco-123', context);

      expect(result).toBe(true);
    });

    it('should return true for IMMEDIATE effectivity when ECO is completed', async () => {
      const mockECO = {
        id: 'eco-123',
        effectivityType: EffectivityType.IMMEDIATE,
        effectivityValue: 'IMMEDIATE',
        status: ECOStatus.COMPLETED,
        actualEffectiveDate: new Date('2024-01-15'), // Add actual effective date
        affectedParts: ['part-1', 'part-2'], // Add affected parts for consistency
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
      };

      const result = await effectivityService.checkEffectivity('eco-123', context);

      expect(result).toBe(true);
    });

    it('should return false when ECO not found', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(null);

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
      };

      const result = await effectivityService.checkEffectivity('eco-999', context);

      expect(result).toBe(false);
    });

    it('should return false when no effectivity type is set', async () => {
      const mockECO = {
        id: 'eco-123',
        effectivityType: null,
        effectivityValue: null,
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
      };

      const result = await effectivityService.checkEffectivity('eco-123', context);

      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockRejectedValue(new Error('Database error'));

      const context: EffectivityContext = {
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
      };

      await expect(effectivityService.checkEffectivity('eco-123', context))
        .rejects.toThrow(ECOError);
    });
  });

  describe('getTransitionPlan', () => {
    const mockECO = {
      id: 'eco-123',
      ecoNumber: 'ECO-2024-001',
      plannedEffectiveDate: new Date('2024-01-15'),
      priority: ECOPriority.MEDIUM,
      isInterchangeable: true,
      affectedParts: ['part-1', 'part-2'],
      affectedDocuments: []
    };

    it('should generate transition plan successfully', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const result = await effectivityService.getTransitionPlan('eco-123');

      expect(result).toEqual(expect.objectContaining({
        ecoId: 'eco-123',
        newVersionStart: expect.any(Date),
        oldVersionDepletion: expect.any(Date),
        transitionPeriod: expect.any(Number),
        affectedInventory: expect.objectContaining({
          wip: expect.any(Number),
          finished: expect.any(Number),
          raw: expect.any(Number),
        }),
        exceptions: expect.any(Array),
      }));

      expect(mockPrisma.engineeringChangeOrder.findUnique).toHaveBeenCalledWith({
        where: { id: 'eco-123' },
        include: { affectedDocuments: true }
      });
    });

    it('should throw ECOError when ECO not found', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(null);

      await expect(effectivityService.getTransitionPlan('eco-999'))
        .rejects.toThrow(ECOError);
    });

    it('should calculate different transition periods based on priority', async () => {
      const emergencyECO = { ...mockECO, priority: ECOPriority.EMERGENCY };
      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(emergencyECO);

      const result = await effectivityService.getTransitionPlan('eco-123');

      expect(result.transitionPeriod).toBeLessThan(30); // Emergency should be less than default
    });

    it('should handle database errors', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(effectivityService.getTransitionPlan('eco-123'))
        .rejects.toThrow(ECOError);
    });
  });

  describe('validateEffectivity', () => {
    const mockECO = {
      id: 'eco-123',
      effectivityType: EffectivityType.BY_DATE,
      effectivityValue: '2024-01-15',
      affectedParts: ['part-1', 'part-2'],
      affectedDocuments: [
        { targetVersion: '2.0.0' },
        { targetVersion: null }
      ],
      tasks: [
        { status: ECOTaskStatus.COMPLETED },
        { status: ECOTaskStatus.IN_PROGRESS }
      ]
    };

    it('should return validation result with errors and warnings', async () => {
      const mockECOWithParts = {
        ...mockECO,
        affectedParts: [
          { part: { id: 'part-1' }, quantity: 10 },
          { part: { id: 'part-2' }, quantity: 5 }
        ]
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECOWithParts);

      const result = await effectivityService.validateEffectivity('eco-123');

      expect(result).toEqual(expect.objectContaining({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      }));

      expect(result.warnings.some(w => w.includes('target version'))).toBe(true);
      expect(result.warnings.some(w => w.includes('implementation') || w.includes('task'))).toBe(true);
    });

    it('should return valid result when all requirements are met', async () => {
      const validECO = {
        ...mockECO,
        affectedDocuments: [{ targetVersion: '2.0.0' }],
        tasks: [{ status: ECOTaskStatus.COMPLETED }],
        affectedParts: [
          { part: { id: 'part-1' }, quantity: 10 },
          { part: { id: 'part-2' }, quantity: 5 }
        ]
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(validECO);

      const result = await effectivityService.validateEffectivity('eco-123');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', async () => {
      const invalidECO = {
        ...mockECO,
        effectivityType: null,
        effectivityValue: null,
        affectedParts: [
          { part: { id: 'part-1' }, quantity: 10 }
        ]
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(invalidECO);

      const result = await effectivityService.validateEffectivity('eco-123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Effectivity type is required');
      expect(result.errors).toContain('Effectivity value is required');
    });

    it('should return errors for invalid effectivity value format', async () => {
      const invalidValueECO = {
        ...mockECO,
        effectivityValue: 'invalid-date-format',
        affectedParts: [
          { part: { id: 'part-1' }, quantity: 10 }
        ]
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(invalidValueECO);

      const result = await effectivityService.validateEffectivity('eco-123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date effectivity value must be in YYYY-MM-DD format');
    });

    it('should throw ECOError when ECO not found', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(null);

      await expect(effectivityService.validateEffectivity('eco-999'))
        .rejects.toThrow(ECOError);
    });

    it('should handle database errors', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(effectivityService.validateEffectivity('eco-123'))
        .rejects.toThrow(ECOError);
    });
  });

  describe('getVersionInfo', () => {
    it('should return version information for multiple entities', async () => {
      const mockCurrentVersion = { version: '1.5.0' };
      const mockAffectingECO = {
        plannedEffectiveDate: new Date('2024-01-15'),
        isInterchangeable: true,
        affectedDocuments: [{ targetVersion: '2.0.0' }]
      };

      mockPrisma.workInstruction.findUnique.mockResolvedValue(mockCurrentVersion);
      mockPrisma.engineeringChangeOrder.findFirst.mockResolvedValue(mockAffectingECO);

      const result = await effectivityService.getVersionInfo('WorkInstruction', ['wi-456', 'wi-789']);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        entityType: 'WorkInstruction',
        entityId: 'wi-456',
        currentVersion: '1.5.0',
        effectiveVersion: '2.0.0',
        isTransitioning: true,
        effectiveDate: expect.any(Date),
        interchangeable: true,
      }));
    });

    it('should handle entities without affecting ECOs', async () => {
      const mockCurrentVersion = { version: '1.5.0' };

      mockPrisma.workInstruction.findUnique.mockResolvedValue(mockCurrentVersion);
      mockPrisma.engineeringChangeOrder.findFirst.mockResolvedValue(null);

      const result = await effectivityService.getVersionInfo('WorkInstruction', ['wi-456']);

      expect(result[0]).toEqual(expect.objectContaining({
        currentVersion: '1.5.0',
        effectiveVersion: '1.5.0',
        isTransitioning: false,
        effectiveDate: undefined,
        interchangeable: false,
      }));
    });

    it('should handle entities that do not exist', async () => {
      mockPrisma.workInstruction.findUnique.mockResolvedValue(null);
      mockPrisma.engineeringChangeOrder.findFirst.mockResolvedValue(null);

      const result = await effectivityService.getVersionInfo('WorkInstruction', ['wi-999']);

      expect(result[0]).toEqual(expect.objectContaining({
        currentVersion: '1.0.0',
        effectiveVersion: '1.0.0',
        isTransitioning: false,
      }));
    });

    it('should handle SetupSheet entities', async () => {
      const mockSetupSheet = { version: '1.2.0' };
      mockPrisma.setupSheet.findUnique.mockResolvedValue(mockSetupSheet);
      mockPrisma.engineeringChangeOrder.findFirst.mockResolvedValue(null);

      const result = await effectivityService.getVersionInfo('SetupSheet', ['ss-123']);

      expect(result[0].currentVersion).toBe('1.2.0');
      expect(mockPrisma.setupSheet.findUnique).toHaveBeenCalledWith({
        where: { id: 'ss-123' },
        select: { version: true }
      });
    });

    it('should handle database errors', async () => {
      // Mock all database operations to fail
      mockPrisma.workInstruction.findUnique.mockRejectedValue(new Error('Database error'));
      mockPrisma.setupSheet.findUnique.mockRejectedValue(new Error('Database error'));
      mockPrisma.engineeringChangeOrder.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(effectivityService.getVersionInfo('WorkInstruction', ['wi-456']))
        .rejects.toThrow(ECOError);
    });
  });

  describe('validateEffectivityValue', () => {
    it('should validate BY_DATE effectivity values', () => {
      const service = new EffectivityService(mockPrisma as any);

      // Valid date format
      expect(service['validateEffectivityValue'](EffectivityType.BY_DATE, '2024-01-15')).toEqual({
        isValid: true,
        errors: []
      });

      // Invalid date format
      expect(service['validateEffectivityValue'](EffectivityType.BY_DATE, '01/15/2024')).toEqual({
        isValid: false,
        errors: ['Date effectivity value must be in YYYY-MM-DD format']
      });
    });

    it('should validate BY_SERIAL_NUMBER effectivity values', () => {
      const service = new EffectivityService(mockPrisma as any);

      // Valid serial number
      expect(service['validateEffectivityValue'](EffectivityType.BY_SERIAL_NUMBER, '1000')).toEqual({
        isValid: true,
        errors: []
      });

      // Invalid serial number
      expect(service['validateEffectivityValue'](EffectivityType.BY_SERIAL_NUMBER, 'SN-1000')).toEqual({
        isValid: false,
        errors: ['Serial number effectivity value must be numeric']
      });
    });

    it('should validate BY_WORK_ORDER effectivity values', () => {
      const service = new EffectivityService(mockPrisma as any);

      // Valid work order
      expect(service['validateEffectivityValue'](EffectivityType.BY_WORK_ORDER, '5000')).toEqual({
        isValid: true,
        errors: []
      });

      // Invalid work order
      expect(service['validateEffectivityValue'](EffectivityType.BY_WORK_ORDER, 'WO-5000')).toEqual({
        isValid: false,
        errors: ['Work order effectivity value must be numeric']
      });
    });

    it('should validate BY_LOT_BATCH effectivity values', () => {
      const service = new EffectivityService(mockPrisma as any);

      // Valid lot/batch
      expect(service['validateEffectivityValue'](EffectivityType.BY_LOT_BATCH, 'LOT-2024-001')).toEqual({
        isValid: true,
        errors: []
      });

      // Invalid lot/batch (empty)
      expect(service['validateEffectivityValue'](EffectivityType.BY_LOT_BATCH, '')).toEqual({
        isValid: false,
        errors: ['Lot/batch effectivity value cannot be empty']
      });
    });

    it('should validate IMMEDIATE effectivity values', () => {
      const service = new EffectivityService(mockPrisma as any);

      // IMMEDIATE effectivity needs no validation
      expect(service['validateEffectivityValue'](EffectivityType.IMMEDIATE, '')).toEqual({
        isValid: true,
        errors: []
      });
    });
  });

  describe('getCurrentEntityVersion', () => {
    it('should return WorkInstruction version', async () => {
      const service = new EffectivityService(mockPrisma as any);
      const mockVersion = { version: '2.1.0' };

      mockPrisma.workInstruction.findUnique.mockResolvedValue(mockVersion);

      const result = await service['getCurrentEntityVersion']('WorkInstruction', 'wi-123');

      expect(result).toEqual({ version: '2.1.0' });
      expect(mockPrisma.workInstruction.findUnique).toHaveBeenCalledWith({
        where: { id: 'wi-123' },
        select: { version: true }
      });
    });

    it('should return SetupSheet version with default fallback', async () => {
      const service = new EffectivityService(mockPrisma as any);
      const mockSetupSheet = { version: null }; // version is nullable

      mockPrisma.setupSheet.findUnique.mockResolvedValue(mockSetupSheet);

      const result = await service['getCurrentEntityVersion']('SetupSheet', 'ss-123');

      expect(result).toEqual({ version: '1.0.0' });
    });

    it('should return null for unknown entity types', async () => {
      const service = new EffectivityService(mockPrisma as any);

      const result = await service['getCurrentEntityVersion']('UnknownType', 'unknown-123');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const service = new EffectivityService(mockPrisma as any);

      mockPrisma.workInstruction.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await service['getCurrentEntityVersion']('WorkInstruction', 'wi-123');

      expect(result).toBeNull();
    });
  });

  describe('analyzeInventoryImpact', () => {
    it('should analyze inventory impact for ECO', async () => {
      const service = new EffectivityService(mockPrisma as any);
      const mockECO = {
        id: 'eco-123',
        affectedParts: ['part-1', 'part-2'],
        isInterchangeable: true
      };

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(mockECO);

      const result = await service['analyzeInventoryImpact']('eco-123');

      expect(result).toEqual(expect.objectContaining({
        wipItems: expect.any(Array),
        finishedGoods: expect.any(Array),
        rawMaterials: expect.any(Array),
        totalImpactValue: expect.any(Number),
      }));

      expect(result.wipItems).toHaveLength(2); // One for each affected part
      expect(result.finishedGoods).toHaveLength(2);
      expect(result.rawMaterials).toHaveLength(2);
    });

    it('should throw ECOError when ECO not found', async () => {
      const service = new EffectivityService(mockPrisma as any);

      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(null);

      await expect(service['analyzeInventoryImpact']('eco-999'))
        .rejects.toThrow(ECOError);
    });
  });

  describe('calculateTransitionPeriod', () => {
    it('should calculate transition period based on priority and inventory impact', () => {
      const service = new EffectivityService(mockPrisma as any);

      const mockECO = {
        priority: ECOPriority.HIGH,
        isInterchangeable: false
      };

      const mockInventoryImpact = {
        totalImpactValue: 250000,
        wipItems: [],
        finishedGoods: [],
        rawMaterials: []
      };

      const result = service['calculateTransitionPeriod'](mockECO, mockInventoryImpact);

      expect(result).toBeGreaterThan(21); // HIGH priority base + high impact + non-interchangeable
    });

    it('should return shorter period for EMERGENCY priority', () => {
      const service = new EffectivityService(mockPrisma as any);

      const emergencyECO = {
        priority: ECOPriority.EMERGENCY,
        isInterchangeable: true
      };

      const lowImpact = {
        totalImpactValue: 50000,
        wipItems: [],
        finishedGoods: [],
        rawMaterials: []
      };

      const result = service['calculateTransitionPeriod'](emergencyECO, lowImpact);

      expect(result).toBe(7); // EMERGENCY base period
    });
  });

  describe('findApprovedExceptions', () => {
    it('should return empty array for now', async () => {
      const service = new EffectivityService(mockPrisma as any);

      const result = await service['findApprovedExceptions']('eco-123');

      expect(result).toEqual([]);
    });
  });
});