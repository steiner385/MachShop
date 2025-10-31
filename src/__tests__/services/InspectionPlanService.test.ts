/**
 * InspectionPlanService Tests
 * Comprehensive test suite for quality inspection plan management and execution
 *
 * GitHub Issue #176: Epic 2: Backend Service Testing - Phase 2 (Business Critical)
 * Priority: P1 - Milestone 3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InspectionPlanService } from '../../services/InspectionPlanService';
import {
  InspectionType,
  InspectionFrequency,
  MeasurementType,
  InspectionResult,
  Disposition,
  InspectionPlanStatus
} from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

// Mock dependencies
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    inspectionPlan: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    inspectionCharacteristic: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    inspectionStep: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    inspectionExecution: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  })),
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('InspectionPlanService', () => {
  let service: InspectionPlanService;
  let mockPrisma: any;
  let mockLogger: any;

  // Mock data
  const mockInspectionPlan = {
    id: 'plan-1',
    documentNumber: 'IP-2023-001',
    revision: 'A',
    title: 'Turbine Blade Inspection',
    description: 'Critical dimension inspection for turbine blades',
    partId: 'part-123',
    operationId: 'op-456',
    inspectionType: InspectionType.DIMENSIONAL,
    frequency: InspectionFrequency.EVERY_PART,
    status: InspectionPlanStatus.ACTIVE,
    samplingPlan: { sampleSize: 5, frequency: 'hourly' },
    dispositionRules: { acceptanceLimit: 0.01 },
    gageRRRequired: true,
    gageRRFrequency: 'monthly',
    imageUrls: ['https://example.com/image1.jpg'],
    videoUrls: ['https://example.com/video1.mp4'],
    attachmentUrls: ['https://example.com/spec.pdf'],
    tags: ['critical', 'aerospace'],
    categories: ['dimensional', 'qa'],
    createdById: 'user-1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    part: {
      id: 'part-123',
      partNumber: 'TB-001',
      description: 'Turbine Blade Stage 1',
    },
    operation: {
      id: 'op-456',
      operationNumber: '030',
      description: 'Final Machining',
    },
    characteristics: [],
    steps: [],
    executions: [],
  };

  const mockInspectionCharacteristic = {
    id: 'char-1',
    inspectionPlanId: 'plan-1',
    characteristicNumber: 'C001',
    name: 'Overall Length',
    description: 'Measure overall blade length',
    measurementType: MeasurementType.CONTINUOUS,
    nominalValue: 150.0,
    tolerancePlus: 0.05,
    toleranceMinus: 0.05,
    units: 'mm',
    samplingFrequency: InspectionFrequency.EVERY_PART,
    measurementMethod: 'Caliper measurement at datum A',
    acceptanceCriteria: 'Within ±0.05mm of nominal',
    gageType: 'Digital Caliper',
    gageId: 'CAL-001',
    imageUrls: ['https://example.com/char1.jpg'],
    isRequired: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInspectionStep = {
    id: 'step-1',
    inspectionPlanId: 'plan-1',
    stepNumber: 1,
    title: 'Setup Part',
    description: 'Mount part in fixture with datum A down',
    instructions: 'Ensure part is properly seated and clamped',
    estimatedDuration: 5,
    imageUrls: ['https://example.com/setup.jpg'],
    videoUrls: [],
    attachmentUrls: [],
    isRequired: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInspectionExecution = {
    id: 'exec-1',
    inspectionPlanId: 'plan-1',
    workOrderId: 'wo-789',
    serialNumber: 'SN-001',
    inspectorId: 'inspector-1',
    startedAt: new Date(),
    completedAt: new Date(),
    result: InspectionResult.PASS,
    disposition: Disposition.ACCEPT,
    notes: 'All characteristics within tolerance',
    signatureId: 'sig-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new InspectionPlanService();
    mockPrisma = service['prisma'] as any;
    mockLogger = logger as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(InspectionPlanService);
    });

    it('should initialize with Prisma client', () => {
      expect(mockPrisma).toBeDefined();
    });
  });

  describe('Inspection Plan Creation', () => {
    describe('createInspectionPlan', () => {
      beforeEach(() => {
        mockPrisma.inspectionPlan.create.mockResolvedValue(mockInspectionPlan);
      });

      it('should create inspection plan with valid input', async () => {
        const createInput = {
          title: 'Turbine Blade Inspection',
          description: 'Critical dimension inspection',
          partId: 'part-123',
          operationId: 'op-456',
          inspectionType: InspectionType.DIMENSIONAL,
          frequency: InspectionFrequency.EVERY_PART,
          gageRRRequired: true,
          gageRRFrequency: 'monthly',
          tags: ['critical', 'aerospace'],
          categories: ['dimensional'],
          createdById: 'user-1',
        };

        const result = await service.createInspectionPlan(createInput);

        expect(result).toEqual(mockInspectionPlan);
        expect(mockPrisma.inspectionPlan.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            title: createInput.title,
            inspectionType: createInput.inspectionType,
            frequency: createInput.frequency,
            status: InspectionPlanStatus.DRAFT,
            documentNumber: expect.any(String),
            revision: 'A',
            isActive: true,
          }),
          include: expect.any(Object),
        });
      });

      it('should generate unique document number', async () => {
        const createInput = {
          title: 'Test Plan',
          inspectionType: InspectionType.VISUAL,
          frequency: InspectionFrequency.FIRST_PIECE,
          createdById: 'user-1',
        };

        await service.createInspectionPlan(createInput);

        expect(mockPrisma.inspectionPlan.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            documentNumber: expect.stringMatching(/^IP-\d{4}-\d{3}$/),
          }),
          include: expect.any(Object),
        });
      });

      it('should handle optional fields correctly', async () => {
        const minimalInput = {
          title: 'Minimal Plan',
          inspectionType: InspectionType.FUNCTIONAL,
          frequency: InspectionFrequency.SAMPLING,
          createdById: 'user-1',
        };

        await service.createInspectionPlan(minimalInput);

        expect(mockPrisma.inspectionPlan.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            title: 'Minimal Plan',
            description: undefined,
            partId: undefined,
            operationId: undefined,
            gageRRRequired: false,
          }),
          include: expect.any(Object),
        });
      });

      it('should validate inspection type enum', async () => {
        const invalidInput = {
          title: 'Invalid Plan',
          inspectionType: 'INVALID_TYPE' as InspectionType,
          frequency: InspectionFrequency.EVERY_PART,
          createdById: 'user-1',
        };

        await expect(service.createInspectionPlan(invalidInput)).rejects.toThrow();
      });

      it('should handle database errors', async () => {
        mockPrisma.inspectionPlan.create.mockRejectedValue(new Error('Database error'));

        const createInput = {
          title: 'Test Plan',
          inspectionType: InspectionType.DIMENSIONAL,
          frequency: InspectionFrequency.EVERY_PART,
          createdById: 'user-1',
        };

        await expect(service.createInspectionPlan(createInput)).rejects.toThrow(
          'Failed to create inspection plan'
        );
      });
    });
  });

  describe('Inspection Plan Retrieval', () => {
    describe('getInspectionPlanById', () => {
      beforeEach(() => {
        mockPrisma.inspectionPlan.findUnique.mockResolvedValue(mockInspectionPlan);
      });

      it('should retrieve inspection plan by ID', async () => {
        const result = await service.getInspectionPlanById('plan-1');

        expect(result).toEqual(mockInspectionPlan);
        expect(mockPrisma.inspectionPlan.findUnique).toHaveBeenCalledWith({
          where: { id: 'plan-1' },
          include: {
            part: true,
            operation: true,
            characteristics: { orderBy: { sortOrder: 'asc' } },
            steps: { orderBy: { stepNumber: 'asc' } },
            executions: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              include: { inspector: true },
            },
            createdBy: true,
          },
        });
      });

      it('should return null for non-existent plan', async () => {
        mockPrisma.inspectionPlan.findUnique.mockResolvedValue(null);

        const result = await service.getInspectionPlanById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('getInspectionPlanByDocumentNumber', () => {
      it('should retrieve plan by document number', async () => {
        mockPrisma.inspectionPlan.findUnique.mockResolvedValue(mockInspectionPlan);

        const result = await service.getInspectionPlanByDocumentNumber('IP-2023-001');

        expect(result).toEqual(mockInspectionPlan);
        expect(mockPrisma.inspectionPlan.findUnique).toHaveBeenCalledWith({
          where: { documentNumber: 'IP-2023-001' },
          include: expect.any(Object),
        });
      });
    });

    describe('getInspectionPlans', () => {
      beforeEach(() => {
        mockPrisma.inspectionPlan.findMany.mockResolvedValue([mockInspectionPlan]);
        mockPrisma.inspectionPlan.count.mockResolvedValue(1);
      });

      it('should retrieve plans with filters', async () => {
        const filters = {
          partId: 'part-123',
          inspectionType: InspectionType.DIMENSIONAL,
          status: InspectionPlanStatus.ACTIVE,
          tags: ['critical'],
          isActive: true,
        };

        const result = await service.getInspectionPlans(filters);

        expect(result.plans).toEqual([mockInspectionPlan]);
        expect(result.total).toBe(1);
        expect(mockPrisma.inspectionPlan.findMany).toHaveBeenCalledWith({
          where: {
            partId: 'part-123',
            inspectionType: InspectionType.DIMENSIONAL,
            status: InspectionPlanStatus.ACTIVE,
            tags: { hasSome: ['critical'] },
            isActive: true,
          },
          include: expect.any(Object),
          orderBy: { createdAt: 'desc' },
          take: 50,
          skip: 0,
        });
      });

      it('should handle pagination', async () => {
        const filters = { limit: 25, offset: 50 };

        await service.getInspectionPlans(filters);

        expect(mockPrisma.inspectionPlan.findMany).toHaveBeenCalledWith({
          where: {},
          include: expect.any(Object),
          orderBy: { createdAt: 'desc' },
          take: 25,
          skip: 50,
        });
      });

      it('should handle text search', async () => {
        const filters = { search: 'turbine blade' };

        await service.getInspectionPlans(filters);

        expect(mockPrisma.inspectionPlan.findMany).toHaveBeenCalledWith({
          where: {
            OR: [
              { title: { contains: 'turbine blade', mode: 'insensitive' } },
              { description: { contains: 'turbine blade', mode: 'insensitive' } },
              { documentNumber: { contains: 'turbine blade', mode: 'insensitive' } },
            ],
          },
          include: expect.any(Object),
          orderBy: { createdAt: 'desc' },
          take: 50,
          skip: 0,
        });
      });
    });
  });

  describe('Inspection Plan Updates', () => {
    describe('updateInspectionPlan', () => {
      beforeEach(() => {
        mockPrisma.inspectionPlan.findUnique.mockResolvedValue(mockInspectionPlan);
        mockPrisma.inspectionPlan.update.mockResolvedValue({
          ...mockInspectionPlan,
          title: 'Updated Title',
          revision: 'B',
        });
      });

      it('should update inspection plan with revision increment', async () => {
        const updateInput = {
          title: 'Updated Title',
          description: 'Updated description',
          gageRRRequired: false,
        };

        const result = await service.updateInspectionPlan('plan-1', updateInput, 'user-1');

        expect(result.title).toBe('Updated Title');
        expect(mockPrisma.inspectionPlan.update).toHaveBeenCalledWith({
          where: { id: 'plan-1' },
          data: expect.objectContaining({
            title: 'Updated Title',
            description: 'Updated description',
            gageRRRequired: false,
            revision: 'B',
          }),
          include: expect.any(Object),
        });
      });

      it('should handle revision increment logic', async () => {
        // Test revision A -> B
        let currentPlan = { ...mockInspectionPlan, revision: 'A' };
        mockPrisma.inspectionPlan.findUnique.mockResolvedValue(currentPlan);

        await service.updateInspectionPlan('plan-1', { title: 'Test' }, 'user-1');

        expect(mockPrisma.inspectionPlan.update).toHaveBeenCalledWith({
          where: { id: 'plan-1' },
          data: expect.objectContaining({ revision: 'B' }),
          include: expect.any(Object),
        });
      });

      it('should require plan to exist', async () => {
        mockPrisma.inspectionPlan.findUnique.mockResolvedValue(null);

        await expect(
          service.updateInspectionPlan('non-existent', { title: 'Test' }, 'user-1')
        ).rejects.toThrow('Inspection plan not found');
      });
    });

    describe('deleteInspectionPlan', () => {
      beforeEach(() => {
        mockPrisma.inspectionPlan.findUnique.mockResolvedValue(mockInspectionPlan);
        mockPrisma.inspectionPlan.update.mockResolvedValue({
          ...mockInspectionPlan,
          isActive: false,
        });
      });

      it('should soft delete inspection plan', async () => {
        await service.deleteInspectionPlan('plan-1', 'user-1');

        expect(mockPrisma.inspectionPlan.update).toHaveBeenCalledWith({
          where: { id: 'plan-1' },
          data: {
            isActive: false,
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should require plan to exist', async () => {
        mockPrisma.inspectionPlan.findUnique.mockResolvedValue(null);

        await expect(service.deleteInspectionPlan('non-existent', 'user-1')).rejects.toThrow(
          'Inspection plan not found'
        );
      });
    });
  });

  describe('Inspection Characteristics Management', () => {
    describe('addInspectionCharacteristic', () => {
      beforeEach(() => {
        mockPrisma.inspectionCharacteristic.create.mockResolvedValue(mockInspectionCharacteristic);
      });

      it('should add characteristic to inspection plan', async () => {
        const characteristicInput = {
          characteristicNumber: 'C001',
          name: 'Overall Length',
          measurementType: MeasurementType.CONTINUOUS,
          nominalValue: 150.0,
          tolerancePlus: 0.05,
          toleranceMinus: 0.05,
          units: 'mm',
          samplingFrequency: InspectionFrequency.EVERY_PART,
          measurementMethod: 'Caliper measurement',
          acceptanceCriteria: 'Within tolerance',
          gageType: 'Digital Caliper',
          isRequired: true,
        };

        const result = await service.addInspectionCharacteristic('plan-1', characteristicInput);

        expect(result).toEqual(mockInspectionCharacteristic);
        expect(mockPrisma.inspectionCharacteristic.create).toHaveBeenCalledWith({
          data: {
            inspectionPlanId: 'plan-1',
            ...characteristicInput,
            sortOrder: 1,
          },
        });
      });

      it('should auto-increment sort order', async () => {
        mockPrisma.inspectionCharacteristic.findMany.mockResolvedValue([
          { sortOrder: 1 },
          { sortOrder: 2 },
        ]);

        const characteristicInput = {
          characteristicNumber: 'C003',
          name: 'Width',
          measurementType: MeasurementType.CONTINUOUS,
          nominalValue: 50.0,
          tolerancePlus: 0.02,
          toleranceMinus: 0.02,
          units: 'mm',
        };

        await service.addInspectionCharacteristic('plan-1', characteristicInput);

        expect(mockPrisma.inspectionCharacteristic.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            sortOrder: 3,
          }),
        });
      });
    });

    describe('updateInspectionCharacteristic', () => {
      beforeEach(() => {
        mockPrisma.inspectionCharacteristic.update.mockResolvedValue({
          ...mockInspectionCharacteristic,
          nominalValue: 155.0,
        });
      });

      it('should update characteristic properties', async () => {
        const updateInput = {
          nominalValue: 155.0,
          tolerancePlus: 0.1,
          toleranceMinus: 0.1,
          acceptanceCriteria: 'Updated criteria',
        };

        const result = await service.updateInspectionCharacteristic('char-1', updateInput);

        expect(result.nominalValue).toBe(155.0);
        expect(mockPrisma.inspectionCharacteristic.update).toHaveBeenCalledWith({
          where: { id: 'char-1' },
          data: updateInput,
        });
      });
    });
  });

  describe('Inspection Steps Management', () => {
    describe('addInspectionStep', () => {
      beforeEach(() => {
        mockPrisma.inspectionStep.create.mockResolvedValue(mockInspectionStep);
      });

      it('should add step to inspection plan', async () => {
        const stepInput = {
          title: 'Setup Part',
          description: 'Mount part in fixture',
          instructions: 'Ensure proper seating',
          estimatedDuration: 5,
          isRequired: true,
        };

        const result = await service.addInspectionStep('plan-1', stepInput);

        expect(result).toEqual(mockInspectionStep);
        expect(mockPrisma.inspectionStep.create).toHaveBeenCalledWith({
          data: {
            inspectionPlanId: 'plan-1',
            stepNumber: 1,
            ...stepInput,
          },
        });
      });

      it('should auto-increment step number', async () => {
        mockPrisma.inspectionStep.findMany.mockResolvedValue([
          { stepNumber: 1 },
          { stepNumber: 2 },
        ]);

        const stepInput = {
          title: 'Measure',
          description: 'Take measurements',
          instructions: 'Use calibrated gage',
        };

        await service.addInspectionStep('plan-1', stepInput);

        expect(mockPrisma.inspectionStep.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            stepNumber: 3,
          }),
        });
      });
    });
  });

  describe('Inspection Execution Management', () => {
    describe('createInspectionExecution', () => {
      beforeEach(() => {
        mockPrisma.inspectionExecution.create.mockResolvedValue(mockInspectionExecution);
      });

      it('should create inspection execution record', async () => {
        const executionInput = {
          workOrderId: 'wo-789',
          serialNumber: 'SN-001',
          inspectorId: 'inspector-1',
          notes: 'All characteristics within tolerance',
        };

        const result = await service.createInspectionExecution('plan-1', executionInput);

        expect(result).toEqual(mockInspectionExecution);
        expect(mockPrisma.inspectionExecution.create).toHaveBeenCalledWith({
          data: {
            inspectionPlanId: 'plan-1',
            ...executionInput,
            startedAt: expect.any(Date),
            result: InspectionResult.IN_PROGRESS,
            disposition: Disposition.PENDING,
          },
          include: {
            inspectionPlan: true,
            inspector: true,
            workOrder: true,
          },
        });
      });

      it('should validate required fields', async () => {
        const incompleteInput = {
          workOrderId: 'wo-789',
          // missing serialNumber and inspectorId
        };

        await expect(
          service.createInspectionExecution('plan-1', incompleteInput)
        ).rejects.toThrow();
      });
    });

    describe('completeInspectionExecution', () => {
      beforeEach(() => {
        mockPrisma.inspectionExecution.update.mockResolvedValue({
          ...mockInspectionExecution,
          completedAt: new Date(),
          result: InspectionResult.PASS,
          disposition: Disposition.ACCEPT,
        });
      });

      it('should complete inspection with result and disposition', async () => {
        const completionInput = {
          result: InspectionResult.PASS,
          disposition: Disposition.ACCEPT,
          notes: 'Inspection completed successfully',
          signatureId: 'sig-123',
        };

        const result = await service.completeInspectionExecution('exec-1', completionInput);

        expect(result.result).toBe(InspectionResult.PASS);
        expect(result.disposition).toBe(Disposition.ACCEPT);
        expect(mockPrisma.inspectionExecution.update).toHaveBeenCalledWith({
          where: { id: 'exec-1' },
          data: {
            ...completionInput,
            completedAt: expect.any(Date),
          },
          include: expect.any(Object),
        });
      });

      it('should validate completion data', async () => {
        const invalidInput = {
          result: 'INVALID_RESULT' as InspectionResult,
          disposition: Disposition.ACCEPT,
        };

        await expect(
          service.completeInspectionExecution('exec-1', invalidInput)
        ).rejects.toThrow();
      });
    });
  });

  describe('Advanced Query Operations', () => {
    describe('getInspectionExecutions', () => {
      beforeEach(() => {
        mockPrisma.inspectionExecution.findMany.mockResolvedValue([mockInspectionExecution]);
      });

      it('should retrieve executions with filters', async () => {
        const filters = {
          inspectionPlanId: 'plan-1',
          workOrderId: 'wo-789',
          inspectorId: 'inspector-1',
          result: InspectionResult.PASS,
          startDate: new Date('2023-11-01'),
          endDate: new Date('2023-11-30'),
        };

        const result = await service.getInspectionExecutions(filters);

        expect(result).toEqual([mockInspectionExecution]);
        expect(mockPrisma.inspectionExecution.findMany).toHaveBeenCalledWith({
          where: {
            inspectionPlanId: 'plan-1',
            workOrderId: 'wo-789',
            inspectorId: 'inspector-1',
            result: InspectionResult.PASS,
            startedAt: {
              gte: filters.startDate,
              lte: filters.endDate,
            },
          },
          include: expect.any(Object),
          orderBy: { startedAt: 'desc' },
        });
      });
    });

    describe('getInspectionStatistics', () => {
      beforeEach(() => {
        mockPrisma.inspectionExecution.count
          .mockResolvedValueOnce(100) // total
          .mockResolvedValueOnce(85)  // passed
          .mockResolvedValueOnce(10)  // failed
          .mockResolvedValueOnce(5);  // in progress
      });

      it('should calculate inspection statistics', async () => {
        const stats = await service.getInspectionStatistics('plan-1');

        expect(stats).toEqual({
          total: 100,
          passed: 85,
          failed: 10,
          inProgress: 5,
          passRate: 0.85,
        });
      });

      it('should handle zero executions', async () => {
        mockPrisma.inspectionExecution.count.mockResolvedValue(0);

        const stats = await service.getInspectionStatistics('plan-1');

        expect(stats.total).toBe(0);
        expect(stats.passRate).toBe(0);
      });
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle missing required fields', async () => {
      const invalidInput = {
        // missing title, inspectionType, frequency
        createdById: 'user-1',
      };

      await expect(service.createInspectionPlan(invalidInput as any)).rejects.toThrow();
    });

    it('should handle database constraint violations', async () => {
      mockPrisma.inspectionPlan.create.mockRejectedValue(
        new Error('Unique constraint violation')
      );

      const input = {
        title: 'Test Plan',
        inspectionType: InspectionType.DIMENSIONAL,
        frequency: InspectionFrequency.EVERY_PART,
        createdById: 'user-1',
      };

      await expect(service.createInspectionPlan(input)).rejects.toThrow(
        'Failed to create inspection plan'
      );
    });

    it('should validate measurement type consistency', async () => {
      const invalidCharacteristic = {
        characteristicNumber: 'C001',
        name: 'Pass/Fail Check',
        measurementType: MeasurementType.ATTRIBUTE,
        nominalValue: 150.0, // Invalid for attribute type
        tolerancePlus: 0.05,  // Invalid for attribute type
        units: 'mm',          // Invalid for attribute type
      };

      await expect(
        service.addInspectionCharacteristic('plan-1', invalidCharacteristic)
      ).rejects.toThrow();
    });

    it('should handle concurrent access scenarios', async () => {
      // Simulate concurrent update scenario
      mockPrisma.inspectionPlan.findUnique
        .mockResolvedValueOnce(mockInspectionPlan)
        .mockResolvedValueOnce({ ...mockInspectionPlan, revision: 'B' });

      const updateInput = { title: 'Updated Title' };

      await expect(
        service.updateInspectionPlan('plan-1', updateInput, 'user-1')
      ).resolves.toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should support aerospace inspection requirements', async () => {
      const aerospaceInput = {
        title: 'AS9102 First Article Inspection',
        description: 'Dimensional inspection per AS9102 requirements',
        partId: 'aerospace-part-001',
        inspectionType: InspectionType.DIMENSIONAL,
        frequency: InspectionFrequency.FIRST_PIECE,
        gageRRRequired: true,
        gageRRFrequency: 'annually',
        categories: ['aerospace', 'fai', 'as9102'],
        tags: ['critical', 'flight-safety'],
        createdById: 'qa-engineer-1',
      };

      mockPrisma.inspectionPlan.create.mockResolvedValue({
        ...mockInspectionPlan,
        ...aerospaceInput,
      });

      const result = await service.createInspectionPlan(aerospaceInput);

      expect(result.categories).toContain('aerospace');
      expect(result.tags).toContain('flight-safety');
      expect(result.gageRRRequired).toBe(true);
    });

    it('should support batch inspection workflow', async () => {
      const batchExecutions = Array.from({ length: 5 }, (_, i) => ({
        ...mockInspectionExecution,
        id: `exec-${i + 1}`,
        serialNumber: `SN-00${i + 1}`,
      }));

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        return await fn({
          inspectionExecution: {
            createMany: vi.fn().mockResolvedValue({ count: 5 }),
            findMany: vi.fn().mockResolvedValue(batchExecutions),
          },
        });
      });

      const batchInput = {
        workOrderId: 'wo-batch-001',
        serialNumbers: ['SN-001', 'SN-002', 'SN-003', 'SN-004', 'SN-005'],
        inspectorId: 'inspector-1',
        notes: 'Batch inspection for lot LOT-123',
      };

      const result = await service.createBatchInspectionExecution('plan-1', batchInput);

      expect(result).toHaveLength(5);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should support statistical sampling plans', async () => {
      const samplingInput = {
        title: 'Statistical Sampling Inspection',
        inspectionType: InspectionType.DIMENSIONAL,
        frequency: InspectionFrequency.SAMPLING,
        samplingPlan: {
          sampleSize: 13,
          lotSize: 1000,
          acceptanceLevel: 1.5,
          rejectionLevel: 4.0,
          samplingMethod: 'MIL-STD-105E',
        },
        createdById: 'qa-engineer-1',
      };

      mockPrisma.inspectionPlan.create.mockResolvedValue({
        ...mockInspectionPlan,
        ...samplingInput,
      });

      const result = await service.createInspectionPlan(samplingInput);

      expect(result.samplingPlan.samplingMethod).toBe('MIL-STD-105E');
      expect(result.samplingPlan.sampleSize).toBe(13);
    });
  });

  describe('Performance and Scalability', () => {
    it('should efficiently handle large characteristic lists', async () => {
      const largeCharacteristicList = Array.from({ length: 50 }, (_, i) => ({
        ...mockInspectionCharacteristic,
        id: `char-${i + 1}`,
        characteristicNumber: `C${String(i + 1).padStart(3, '0')}`,
        sortOrder: i + 1,
      }));

      mockPrisma.inspectionCharacteristic.findMany.mockResolvedValue(largeCharacteristicList);

      const result = await service.getInspectionPlanById('plan-1');

      expect(mockPrisma.inspectionCharacteristic.findMany).not.toHaveBeenCalled();
      // Characteristics should be included via the plan query
    });

    it('should use appropriate pagination for executions', async () => {
      const filters = { limit: 1000 }; // Large limit

      await service.getInspectionExecutions(filters);

      expect(mockPrisma.inspectionExecution.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { startedAt: 'desc' },
        take: 500, // Should be capped at maximum
      });
    });
  });
});