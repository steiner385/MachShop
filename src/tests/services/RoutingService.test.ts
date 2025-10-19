/**
 * RoutingService Unit Tests
 * Sprint 2: Backend Services & APIs
 *
 * Comprehensive tests for routing service functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoutingService } from '../../services/RoutingService';
import {
  RoutingLifecycleState,
  DependencyType,
  DependencyTimingType,
} from '../../types/routing';

// Mock PrismaClient
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');

  const mockPrisma = {
    routing: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    routingStep: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    routingStepDependency: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    partSiteAvailability: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workOrder: {
      count: vi.fn(),
    },
    part: {
      findUnique: vi.fn(),
    },
    site: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback),
  };

  return {
    ...actual,
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

import { PrismaClient } from '@prisma/client';

describe('RoutingService', () => {
  let routingService: RoutingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    routingService = new RoutingService();
    vi.clearAllMocks();
  });

  // ==================== ROUTING CRUD ====================

  describe('createRouting', () => {
    it('should create a new routing with default values', async () => {
      const mockRouting = {
        id: 'routing-1',
        routingNumber: 'RTG-DAL-001',
        partId: 'part-1',
        siteId: 'site-1',
        version: '1.0',
        lifecycleState: RoutingLifecycleState.DRAFT,
        description: 'Test routing',
        isPrimaryRoute: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        part: {
          id: 'part-1',
          partNumber: 'PN-001',
          name: 'Test Part',
        },
        site: {
          id: 'site-1',
          siteName: 'Dallas',
          siteCode: 'DAL',
        },
        steps: [],
      };

      vi.mocked(mockPrisma.routing.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.routing.create).mockResolvedValue(mockRouting as any);

      const result = await routingService.createRouting({
        routingNumber: 'RTG-DAL-001',
        partId: 'part-1',
        siteId: 'site-1',
        description: 'Test routing',
      });

      expect(result).toEqual(mockRouting);
      expect(mockPrisma.routing.create).toHaveBeenCalled();
      expect(mockPrisma.routing.findFirst).toHaveBeenCalledWith({
        where: {
          partId: 'part-1',
          siteId: 'site-1',
          version: '1.0',
        },
      });
    });

    it('should create routing with steps', async () => {
      const mockRouting = {
        id: 'routing-1',
        routingNumber: 'RTG-DAL-002',
        partId: 'part-1',
        siteId: 'site-1',
        version: '1.0',
        lifecycleState: RoutingLifecycleState.DRAFT,
        isPrimaryRoute: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        part: {
          id: 'part-1',
          partNumber: 'PN-001',
          name: 'Test Part',
        },
        site: {
          id: 'site-1',
          siteName: 'Dallas',
          siteCode: 'DAL',
        },
        steps: [
          {
            id: 'step-1',
            stepNumber: 10,
            processSegmentId: 'seg-1',
            isOptional: false,
            isQualityInspection: false,
            isCriticalPath: false,
          },
        ],
      };

      vi.mocked(mockPrisma.routing.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.routing.create).mockResolvedValue(mockRouting as any);

      const result = await routingService.createRouting({
        routingNumber: 'RTG-DAL-002',
        partId: 'part-1',
        siteId: 'site-1',
        steps: [
          {
            routingId: 'routing-1',
            stepNumber: 10,
            processSegmentId: 'seg-1',
          },
        ],
      });

      expect(result.steps).toHaveLength(1);
      expect(result.steps![0].stepNumber).toBe(10);
    });

    it('should throw error if routing already exists', async () => {
      const existingRouting = {
        id: 'routing-1',
        partId: 'part-1',
        siteId: 'site-1',
        version: '1.0',
      };

      vi.mocked(mockPrisma.routing.findFirst).mockResolvedValue(existingRouting as any);

      await expect(
        routingService.createRouting({
          routingNumber: 'RTG-DAL-001',
          partId: 'part-1',
          siteId: 'site-1',
        })
      ).rejects.toThrow('Routing already exists for part part-1 at site site-1 version 1.0');
    });
  });

  describe('getRoutingById', () => {
    it('should get routing by ID with steps', async () => {
      const mockRouting = {
        id: 'routing-1',
        routingNumber: 'RTG-DAL-001',
        partId: 'part-1',
        siteId: 'site-1',
        version: '1.0',
        lifecycleState: RoutingLifecycleState.DRAFT,
        part: {
          id: 'part-1',
          partNumber: 'PN-001',
          name: 'Test Part',
        },
        site: {
          id: 'site-1',
          siteName: 'Dallas',
          siteCode: 'DAL',
        },
        steps: [
          {
            id: 'step-1',
            stepNumber: 10,
            processSegment: {
              id: 'seg-1',
              segmentName: 'Milling',
              operationType: 'MACHINING',
            },
          },
        ],
      };

      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(mockRouting as any);

      const result = await routingService.getRoutingById('routing-1', true);

      expect(result).toEqual(mockRouting);
      expect(mockPrisma.routing.findUnique).toHaveBeenCalledWith({
        where: { id: 'routing-1' },
        include: expect.objectContaining({
          part: expect.any(Object),
          site: expect.any(Object),
          steps: expect.any(Object),
        }),
      });
    });

    it('should get routing without steps when includeSteps is false', async () => {
      const mockRouting = {
        id: 'routing-1',
        routingNumber: 'RTG-DAL-001',
      };

      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(mockRouting as any);

      await routingService.getRoutingById('routing-1', false);

      expect(mockPrisma.routing.findUnique).toHaveBeenCalledWith({
        where: { id: 'routing-1' },
        include: expect.objectContaining({
          steps: false,
        }),
      });
    });

    it('should return null if routing not found', async () => {
      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(null);

      const result = await routingService.getRoutingById('nonexistent', true);

      expect(result).toBeNull();
    });
  });

  describe('queryRoutings', () => {
    it('should query routings with filters', async () => {
      const mockRoutings = [
        {
          id: 'routing-1',
          partId: 'part-1',
          siteId: 'site-1',
          lifecycleState: RoutingLifecycleState.PRODUCTION,
          isActive: true,
        },
      ];

      vi.mocked(mockPrisma.routing.findMany).mockResolvedValue(mockRoutings as any);

      const result = await routingService.queryRoutings({
        partId: 'part-1',
        siteId: 'site-1',
        lifecycleState: RoutingLifecycleState.PRODUCTION,
        isActive: true,
      });

      expect(result).toEqual(mockRoutings);
      expect(mockPrisma.routing.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          partId: 'part-1',
          siteId: 'site-1',
          lifecycleState: RoutingLifecycleState.PRODUCTION,
          isActive: true,
        }),
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should exclude expired routes by default', async () => {
      vi.mocked(mockPrisma.routing.findMany).mockResolvedValue([]);

      await routingService.queryRoutings({});

      expect(mockPrisma.routing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { expirationDate: null },
              { expirationDate: { gt: expect.any(Date) } },
            ]),
          }),
        })
      );
    });

    it('should include expired routes when specified', async () => {
      vi.mocked(mockPrisma.routing.findMany).mockResolvedValue([]);

      await routingService.queryRoutings({ includeExpired: true });

      expect(mockPrisma.routing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('updateRouting', () => {
    it('should update routing', async () => {
      const existingRouting = {
        id: 'routing-1',
        partId: 'part-1',
        siteId: 'site-1',
        version: '1.0',
      };

      const updatedRouting = {
        ...existingRouting,
        description: 'Updated description',
        lifecycleState: RoutingLifecycleState.REVIEW,
      };

      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(existingRouting as any);
      vi.mocked(mockPrisma.routing.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.routing.update).mockResolvedValue(updatedRouting as any);

      const result = await routingService.updateRouting('routing-1', {
        description: 'Updated description',
        lifecycleState: RoutingLifecycleState.REVIEW,
      });

      expect(result.description).toBe('Updated description');
      expect(result.lifecycleState).toBe(RoutingLifecycleState.REVIEW);
    });

    it('should throw error if updating to duplicate version', async () => {
      const existingRouting = {
        id: 'routing-1',
        partId: 'part-1',
        siteId: 'site-1',
        version: '1.0',
      };

      const duplicateRouting = {
        id: 'routing-2',
        partId: 'part-1',
        siteId: 'site-1',
        version: '2.0',
      };

      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(existingRouting as any);
      vi.mocked(mockPrisma.routing.findFirst).mockResolvedValue(duplicateRouting as any);

      await expect(
        routingService.updateRouting('routing-1', { version: '2.0' })
      ).rejects.toThrow('Routing already exists for part part-1 at site site-1 version 2.0');
    });
  });

  describe('deleteRouting', () => {
    it('should delete routing if not used in work orders', async () => {
      vi.mocked(mockPrisma.workOrder.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.routing.delete).mockResolvedValue({} as any);

      await routingService.deleteRouting('routing-1');

      expect(mockPrisma.routing.delete).toHaveBeenCalledWith({
        where: { id: 'routing-1' },
      });
    });

    it('should throw error if routing is used in work orders', async () => {
      vi.mocked(mockPrisma.workOrder.count).mockResolvedValue(5);

      await expect(routingService.deleteRouting('routing-1')).rejects.toThrow(
        'Cannot delete routing routing-1: it is used by 5 work order(s)'
      );
    });
  });

  // ==================== ROUTING STEP CRUD ====================

  describe('createRoutingStep', () => {
    it('should create routing step', async () => {
      const mockStep = {
        id: 'step-1',
        routingId: 'routing-1',
        stepNumber: 10,
        processSegmentId: 'seg-1',
        isOptional: false,
        isQualityInspection: false,
        isCriticalPath: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.routingStep.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.routingStep.create).mockResolvedValue(mockStep as any);

      const result = await routingService.createRoutingStep({
        routingId: 'routing-1',
        stepNumber: 10,
        processSegmentId: 'seg-1',
      });

      expect(result).toEqual(mockStep);
      expect(mockPrisma.routingStep.create).toHaveBeenCalled();
    });

    it('should throw error if step number already exists', async () => {
      const existingStep = {
        id: 'step-1',
        routingId: 'routing-1',
        stepNumber: 10,
      };

      vi.mocked(mockPrisma.routingStep.findFirst).mockResolvedValue(existingStep as any);

      await expect(
        routingService.createRoutingStep({
          routingId: 'routing-1',
          stepNumber: 10,
          processSegmentId: 'seg-1',
        })
      ).rejects.toThrow('Step number 10 already exists in routing routing-1');
    });
  });

  describe('getRoutingSteps', () => {
    it('should get all steps for a routing ordered by step number', async () => {
      const mockSteps = [
        { id: 'step-1', stepNumber: 10 },
        { id: 'step-2', stepNumber: 20 },
        { id: 'step-3', stepNumber: 30 },
      ];

      vi.mocked(mockPrisma.routingStep.findMany).mockResolvedValue(mockSteps as any);

      const result = await routingService.getRoutingSteps('routing-1');

      expect(result).toEqual(mockSteps);
      expect(mockPrisma.routingStep.findMany).toHaveBeenCalledWith({
        where: { routingId: 'routing-1' },
        include: expect.any(Object),
        orderBy: { stepNumber: 'asc' },
      });
    });
  });

  describe('updateRoutingStep', () => {
    it('should update routing step', async () => {
      const existingStep = {
        id: 'step-1',
        routingId: 'routing-1',
        stepNumber: 10,
      };

      const updatedStep = {
        ...existingStep,
        stepNumber: 20,
        isCriticalPath: true,
      };

      vi.mocked(mockPrisma.routingStep.findUnique).mockResolvedValue(existingStep as any);
      vi.mocked(mockPrisma.routingStep.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.routingStep.update).mockResolvedValue(updatedStep as any);

      const result = await routingService.updateRoutingStep('step-1', {
        stepNumber: 20,
        isCriticalPath: true,
      });

      expect(result.stepNumber).toBe(20);
      expect(result.isCriticalPath).toBe(true);
    });

    it('should throw error if updating to duplicate step number', async () => {
      const existingStep = {
        id: 'step-1',
        routingId: 'routing-1',
        stepNumber: 10,
      };

      const duplicateStep = {
        id: 'step-2',
        routingId: 'routing-1',
        stepNumber: 20,
      };

      vi.mocked(mockPrisma.routingStep.findUnique).mockResolvedValue(existingStep as any);
      vi.mocked(mockPrisma.routingStep.findFirst).mockResolvedValue(duplicateStep as any);

      await expect(
        routingService.updateRoutingStep('step-1', { stepNumber: 20 })
      ).rejects.toThrow('Step number 20 already exists in routing routing-1');
    });
  });

  describe('resequenceSteps', () => {
    it('should resequence routing steps', async () => {
      const mockSteps = [
        { id: 'step-1', stepNumber: 20 },
        { id: 'step-2', stepNumber: 30 },
        { id: 'step-3', stepNumber: 10 },
      ];

      vi.mocked(mockPrisma.$transaction).mockImplementation((callback: any) =>
        callback.map((fn: any) => fn)
      );
      vi.mocked(mockPrisma.routingStep.findMany).mockResolvedValue(mockSteps as any);

      const result = await routingService.resequenceSteps({
        routingId: 'routing-1',
        stepOrder: [
          { stepId: 'step-3', newStepNumber: 10 },
          { stepId: 'step-1', newStepNumber: 20 },
          { stepId: 'step-2', newStepNumber: 30 },
        ],
      });

      expect(result).toEqual(mockSteps);
    });
  });

  // ==================== STEP DEPENDENCIES ====================

  describe('createStepDependency', () => {
    it('should create step dependency', async () => {
      const dependentStep = {
        id: 'step-2',
        routingId: 'routing-1',
        stepNumber: 20,
      };

      const prerequisiteStep = {
        id: 'step-1',
        routingId: 'routing-1',
        stepNumber: 10,
      };

      const mockDependency = {
        id: 'dep-1',
        dependentStepId: 'step-2',
        prerequisiteStepId: 'step-1',
        dependencyType: DependencyType.FINISH_TO_START,
        timingType: DependencyTimingType.AS_SOON_AS_POSSIBLE,
      };

      vi.mocked(mockPrisma.routingStep.findUnique)
        .mockResolvedValueOnce(dependentStep as any)
        .mockResolvedValueOnce(prerequisiteStep as any);
      vi.mocked(mockPrisma.routingStepDependency.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.routingStepDependency.create).mockResolvedValue(mockDependency as any);

      const result = await routingService.createStepDependency({
        dependentStepId: 'step-2',
        prerequisiteStepId: 'step-1',
        dependencyType: DependencyType.FINISH_TO_START,
        timingType: DependencyTimingType.AS_SOON_AS_POSSIBLE,
      });

      expect(result).toEqual(mockDependency);
    });

    it('should throw error if steps belong to different routings', async () => {
      const dependentStep = {
        id: 'step-2',
        routingId: 'routing-1',
      };

      const prerequisiteStep = {
        id: 'step-1',
        routingId: 'routing-2',
      };

      vi.mocked(mockPrisma.routingStep.findUnique)
        .mockResolvedValueOnce(dependentStep as any)
        .mockResolvedValueOnce(prerequisiteStep as any);

      await expect(
        routingService.createStepDependency({
          dependentStepId: 'step-2',
          prerequisiteStepId: 'step-1',
          dependencyType: DependencyType.FINISH_TO_START,
          timingType: DependencyTimingType.AS_SOON_AS_POSSIBLE,
        })
      ).rejects.toThrow('Dependency can only be created between steps in the same routing');
    });

    it.skip('should throw error if circular dependency detected', async () => {
      const dependentStep = {
        id: 'step-2',
        routingId: 'routing-1',
      };

      const prerequisiteStep = {
        id: 'step-1',
        routingId: 'routing-1',
      };

      // Mock circular dependency: step-1 depends on step-2
      // This creates a cycle: step-2 → step-1 → step-2
      const existingDependencies = [
        {
          dependentStepId: 'step-1',
          prerequisiteStepId: 'step-2',
        },
      ];

      vi.mocked(mockPrisma.routingStep.findUnique)
        .mockResolvedValueOnce(dependentStep as any)
        .mockResolvedValueOnce(prerequisiteStep as any);

      // First call: find dependencies where prerequisite is step-1
      // Second call: find dependencies where prerequisite is step-2 (circular!)
      vi.mocked(mockPrisma.routingStepDependency.findMany)
        .mockResolvedValueOnce([
          {
            dependentStepId: 'step-1',
            prerequisiteStepId: 'step-2',
          },
        ] as any)
        .mockResolvedValueOnce([
          {
            dependentStepId: 'step-2',
            prerequisiteStepId: 'step-1',
          },
        ] as any);

      await expect(
        routingService.createStepDependency({
          dependentStepId: 'step-2',
          prerequisiteStepId: 'step-1',
          dependencyType: DependencyType.FINISH_TO_START,
          timingType: DependencyTimingType.AS_SOON_AS_POSSIBLE,
        })
      ).rejects.toThrow('Cannot create dependency: would create a circular dependency');
    });
  });

  // ==================== PART SITE AVAILABILITY ====================

  describe('createPartSiteAvailability', () => {
    it('should create part site availability', async () => {
      const mockAvailability = {
        id: 'avail-1',
        partId: 'part-1',
        siteId: 'site-1',
        isPreferred: false,
        isActive: true,
        leadTimeDays: 5,
        minimumLotSize: 10,
        maximumLotSize: 1000,
        standardCost: 50.0,
        setupCost: 100.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockPrisma.partSiteAvailability.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.partSiteAvailability.create).mockResolvedValue(mockAvailability as any);

      const result = await routingService.createPartSiteAvailability({
        partId: 'part-1',
        siteId: 'site-1',
        leadTimeDays: 5,
        minimumLotSize: 10,
        maximumLotSize: 1000,
        standardCost: 50.0,
        setupCost: 100.0,
      });

      expect(result).toEqual(mockAvailability);
    });

    it('should throw error if availability already exists', async () => {
      const existingAvailability = {
        id: 'avail-1',
        partId: 'part-1',
        siteId: 'site-1',
      };

      vi.mocked(mockPrisma.partSiteAvailability.findFirst).mockResolvedValue(
        existingAvailability as any
      );

      await expect(
        routingService.createPartSiteAvailability({
          partId: 'part-1',
          siteId: 'site-1',
        })
      ).rejects.toThrow('Part site availability already exists for part part-1 at site site-1');
    });
  });

  describe('getPartAvailableSites', () => {
    it('should get all active sites where part is available', async () => {
      const mockAvailabilities = [
        {
          id: 'avail-1',
          partId: 'part-1',
          siteId: 'site-1',
          isPreferred: true,
          isActive: true,
          site: { siteName: 'Dallas' },
        },
        {
          id: 'avail-2',
          partId: 'part-1',
          siteId: 'site-2',
          isPreferred: false,
          isActive: true,
          site: { siteName: 'Austin' },
        },
      ];

      vi.mocked(mockPrisma.partSiteAvailability.findMany).mockResolvedValue(
        mockAvailabilities as any
      );

      const result = await routingService.getPartAvailableSites('part-1');

      expect(result).toEqual(mockAvailabilities);
      expect(mockPrisma.partSiteAvailability.findMany).toHaveBeenCalledWith({
        where: {
          partId: 'part-1',
          isActive: true,
        },
        include: expect.any(Object),
        orderBy: expect.arrayContaining([
          { isPreferred: 'desc' },
          { site: { siteName: 'asc' } },
        ]),
      });
    });
  });

  // ==================== BUSINESS LOGIC ====================

  describe('copyRouting', () => {
    it('should copy routing to new version', async () => {
      const sourceRouting = {
        id: 'routing-1',
        routingNumber: 'RTG-DAL-001-001',
        partId: 'part-1',
        siteId: 'site-1',
        version: '1.0',
        lifecycleState: RoutingLifecycleState.PRODUCTION,
        description: 'Original routing',
        part: { id: 'part-1', partNumber: 'PN-001' },
        site: { id: 'site-1', siteCode: 'DAL' },
        steps: [
          {
            id: 'step-1',
            stepNumber: 10,
            processSegmentId: 'seg-1',
          },
        ],
      };

      const newRouting = {
        id: 'routing-2',
        routingNumber: 'RTG-DAL-001-002',
        partId: 'part-1',
        siteId: 'site-1',
        version: '2.0',
        lifecycleState: RoutingLifecycleState.DRAFT,
        steps: [
          {
            id: 'step-2',
            stepNumber: 10,
            processSegmentId: 'seg-1',
          },
        ],
      };

      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(sourceRouting as any);
      vi.mocked(mockPrisma.routing.count).mockResolvedValue(1);
      vi.mocked(mockPrisma.part.findUnique).mockResolvedValue({ partNumber: 'PN-001' } as any);
      vi.mocked(mockPrisma.site.findUnique).mockResolvedValue({ siteCode: 'DAL' } as any);
      vi.mocked(mockPrisma.routing.create).mockResolvedValue(newRouting as any);

      const result = await routingService.copyRouting('routing-1', {
        includeSteps: true,
        includeDependencies: false,
      });

      expect(result.version).toBe('2.0');
      expect(result.lifecycleState).toBe(RoutingLifecycleState.DRAFT);
    });
  });

  describe('approveRouting', () => {
    it('should approve routing in REVIEW state', async () => {
      const routing = {
        id: 'routing-1',
        routingNumber: 'RTG-DAL-001',
        partId: 'part-1',
        siteId: 'site-1',
        lifecycleState: RoutingLifecycleState.REVIEW,
        part: { id: 'part-1' },
        site: { id: 'site-1' },
        steps: [{ id: 'step-1', stepNumber: 10 }],
      };

      const approvedRouting = {
        ...routing,
        lifecycleState: RoutingLifecycleState.RELEASED,
        approvedBy: 'user-1',
        approvedAt: new Date(),
      };

      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(routing as any);
      vi.mocked(mockPrisma.partSiteAvailability.findFirst).mockResolvedValue({
        id: 'avail-1',
      } as any);
      vi.mocked(mockPrisma.routing.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.routing.update).mockResolvedValue(approvedRouting as any);

      const result = await routingService.approveRouting({
        routingId: 'routing-1',
        approvedBy: 'user-1',
      });

      expect(result.lifecycleState).toBe(RoutingLifecycleState.RELEASED);
      expect(result.approvedBy).toBe('user-1');
    });

    it('should throw error if routing not in REVIEW state', async () => {
      const routing = {
        id: 'routing-1',
        lifecycleState: RoutingLifecycleState.DRAFT,
        part: { id: 'part-1' },
        site: { id: 'site-1' },
        steps: [{ id: 'step-1' }],
      };

      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(routing as any);

      await expect(
        routingService.approveRouting({
          routingId: 'routing-1',
          approvedBy: 'user-1',
        })
      ).rejects.toThrow('Routing must be in REVIEW state to be approved');
    });
  });

  describe('activateRouting', () => {
    it('should activate routing in RELEASED state', async () => {
      const routing = {
        id: 'routing-1',
        lifecycleState: RoutingLifecycleState.RELEASED,
        part: { id: 'part-1' },
        site: { id: 'site-1' },
        steps: [],
      };

      const activatedRouting = {
        ...routing,
        lifecycleState: RoutingLifecycleState.PRODUCTION,
        effectiveDate: new Date(),
      };

      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(routing as any);
      vi.mocked(mockPrisma.routing.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.routing.update).mockResolvedValue(activatedRouting as any);

      const result = await routingService.activateRouting('routing-1');

      expect(result.lifecycleState).toBe(RoutingLifecycleState.PRODUCTION);
    });
  });

  describe('calculateRoutingTiming', () => {
    it('should calculate total routing timing', async () => {
      const mockSteps = [
        {
          id: 'step-1',
          stepNumber: 10,
          setupTimeOverride: 300, // 5 minutes
          cycleTimeOverride: 600, // 10 minutes
          teardownTimeOverride: 180, // 3 minutes
          isCriticalPath: true,
          processSegment: {
            setupTime: 0,
            duration: 0,
            teardownTime: 0,
          },
        },
        {
          id: 'step-2',
          stepNumber: 20,
          setupTimeOverride: null,
          cycleTimeOverride: null,
          teardownTimeOverride: null,
          isCriticalPath: true,
          processSegment: {
            setupTime: 240, // 4 minutes
            duration: 480, // 8 minutes
            teardownTime: 120, // 2 minutes
          },
        },
      ];

      vi.mocked(mockPrisma.routingStep.findMany).mockResolvedValue(mockSteps as any);

      const result = await routingService.calculateRoutingTiming('routing-1');

      expect(result.totalSetupTime).toBe(540); // 300 + 240
      expect(result.totalCycleTime).toBe(1080); // 600 + 480
      expect(result.totalTeardownTime).toBe(300); // 180 + 120
      expect(result.totalTime).toBe(1920); // 540 + 1080 + 300
      expect(result.criticalPathTime).toBe(1920); // All steps are critical path
    });
  });

  describe('validateRouting', () => {
    it('should validate routing successfully', async () => {
      const routing = {
        id: 'routing-1',
        partId: 'part-1',
        siteId: 'site-1',
        lifecycleState: RoutingLifecycleState.REVIEW,
        effectiveDate: new Date('2025-01-01'),
        expirationDate: new Date('2025-12-31'),
        part: { id: 'part-1' },
        site: { id: 'site-1' },
        steps: [
          { id: 'step-1', stepNumber: 10 },
          { id: 'step-2', stepNumber: 20 },
        ],
      };

      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(routing as any);
      vi.mocked(mockPrisma.partSiteAvailability.findFirst).mockResolvedValue({
        id: 'avail-1',
      } as any);

      const result = await routingService.validateRouting('routing-1');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation if no steps', async () => {
      const routing = {
        id: 'routing-1',
        partId: 'part-1',
        siteId: 'site-1',
        part: { id: 'part-1' },
        site: { id: 'site-1' },
        steps: [],
      };

      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(routing as any);
      vi.mocked(mockPrisma.partSiteAvailability.findFirst).mockResolvedValue({
        id: 'avail-1',
      } as any);

      const result = await routingService.validateRouting('routing-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'steps',
        message: 'Routing must have at least one step',
      });
    });

    it('should fail validation if part not available at site', async () => {
      const routing = {
        id: 'routing-1',
        partId: 'part-1',
        siteId: 'site-1',
        part: { id: 'part-1' },
        site: { id: 'site-1' },
        steps: [{ id: 'step-1', stepNumber: 10 }],
      };

      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(routing as any);
      vi.mocked(mockPrisma.partSiteAvailability.findFirst).mockResolvedValue(null);

      const result = await routingService.validateRouting('routing-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'siteId',
        message: 'Part is not available at this site. Create PartSiteAvailability first.',
      });
    });

    it('should fail validation if expiration date before effective date', async () => {
      const routing = {
        id: 'routing-1',
        partId: 'part-1',
        siteId: 'site-1',
        effectiveDate: new Date('2025-12-31'),
        expirationDate: new Date('2025-01-01'),
        part: { id: 'part-1' },
        site: { id: 'site-1' },
        steps: [{ id: 'step-1', stepNumber: 10 }],
      };

      vi.mocked(mockPrisma.routing.findUnique).mockResolvedValue(routing as any);
      vi.mocked(mockPrisma.partSiteAvailability.findFirst).mockResolvedValue({
        id: 'avail-1',
      } as any);

      const result = await routingService.validateRouting('routing-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'expirationDate',
        message: 'Expiration date must be after effective date',
      });
    });
  });

  describe('getRoutingVersions', () => {
    it('should get all versions of a routing', async () => {
      const mockRoutings = [
        {
          version: '2.0',
          lifecycleState: RoutingLifecycleState.PRODUCTION,
          effectiveDate: new Date('2025-06-01'),
        },
        {
          version: '1.0',
          lifecycleState: RoutingLifecycleState.OBSOLETE,
          effectiveDate: new Date('2025-01-01'),
          expirationDate: new Date('2025-05-31'),
        },
      ];

      vi.mocked(mockPrisma.routing.findMany).mockResolvedValue(mockRoutings as any);

      const result = await routingService.getRoutingVersions('part-1', 'site-1');

      expect(result.currentVersion).toBe('2.0');
      expect(result.allVersions).toHaveLength(2);
      expect(result.allVersions[0].version).toBe('2.0');
      expect(result.allVersions[1].version).toBe('1.0');
    });
  });
});
