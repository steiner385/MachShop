import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessSegmentService } from '../../services/ProcessSegmentService';
import {
  ProcessSegmentType,
  ParameterType,
  ParameterDataType,
  DependencyType,
  DependencyTimingType,
} from '@prisma/client';

// Mock PrismaClient
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');

  const mockPrisma = {
    processSegment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    processSegmentParameter: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    processSegmentDependency: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    personnelSegmentSpecification: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    equipmentSegmentSpecification: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    materialSegmentSpecification: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    physicalAssetSegmentSpecification: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };

  return {
    ...actual,
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

import { PrismaClient } from '@prisma/client';

describe('ProcessSegmentService', () => {
  let processSegmentService: ProcessSegmentService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    processSegmentService = new ProcessSegmentService(mockPrisma);
    vi.clearAllMocks();
  });

  // ==================== PROCESS SEGMENT CRUD ====================

  describe('createProcessSegment', () => {
    it('should create a new process segment', async () => {
      const mockSegment = {
        id: 'seg-1',
        segmentCode: 'OP-010-MILL',
        segmentName: 'Milling Operation',
        description: 'Mill the part to specifications',
        level: 1,
        segmentType: ProcessSegmentType.PRODUCTION,
        parentSegmentId: null,
        childSegments: [],
        parameters: [],
        dependencies: [],
        personnelSpecs: [],
        equipmentSpecs: [],
        materialSpecs: [],
        assetSpecs: [],
      };

      vi.mocked(mockPrisma.processSegment.create).mockResolvedValue(mockSegment as any);

      const result = await processSegmentService.createProcessSegment({
        segmentCode: 'OP-010-MILL',
        segmentName: 'Milling Operation',
        description: 'Mill the part to specifications',
        segmentType: ProcessSegmentType.PRODUCTION,
      });

      expect(result).toEqual(mockSegment);
      expect(mockPrisma.processSegment.create).toHaveBeenCalled();
    });

    it('should create segment with parent and auto-increment level', async () => {
      const mockParent = {
        id: 'parent-1',
        level: 1,
      };
      const mockSegment = {
        id: 'seg-2',
        segmentCode: 'OP-010-SUB',
        level: 2,
        parentSegmentId: 'parent-1',
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockParent as any);
      vi.mocked(mockPrisma.processSegment.create).mockResolvedValue(mockSegment as any);

      const result = await processSegmentService.createProcessSegment({
        segmentCode: 'OP-010-SUB',
        segmentName: 'Sub Operation',
        parentSegmentId: 'parent-1',
        segmentType: ProcessSegmentType.PRODUCTION,
      });

      expect(result.level).toBe(2);
    });

    it('should throw error if parent segment not found', async () => {
      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(null);

      await expect(
        processSegmentService.createProcessSegment({
          segmentCode: 'OP-020',
          segmentName: 'Operation',
          parentSegmentId: 'nonexistent',
          segmentType: ProcessSegmentType.PRODUCTION,
        })
      ).rejects.toThrow('Parent segment nonexistent not found');
    });
  });

  describe('getProcessSegmentById', () => {
    it('should get process segment by ID with relations', async () => {
      const mockSegment = {
        id: 'seg-1',
        segmentCode: 'OP-010',
        segmentName: 'Operation 10',
        parentSegment: null,
        childSegments: [],
        parameters: [],
        dependencies: [],
        personnelSpecs: [],
        equipmentSpecs: [],
        materialSpecs: [],
        assetSpecs: [],
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);

      const result = await processSegmentService.getProcessSegmentById('seg-1');

      expect(result).toEqual(mockSegment);
      expect(mockPrisma.processSegment.findUnique).toHaveBeenCalledWith({
        where: { id: 'seg-1' },
        include: expect.any(Object),
      });
    });

    it('should throw error if segment not found', async () => {
      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(null);

      await expect(
        processSegmentService.getProcessSegmentById('nonexistent')
      ).rejects.toThrow('Process segment nonexistent not found');
    });
  });

  describe('getProcessSegmentByCode', () => {
    it('should get process segment by code', async () => {
      const mockSegment = {
        id: 'seg-1',
        segmentCode: 'OP-010-MILL',
        segmentName: 'Milling Operation',
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);

      const result = await processSegmentService.getProcessSegmentByCode('OP-010-MILL');

      expect(result).toEqual(mockSegment);
      expect(mockPrisma.processSegment.findUnique).toHaveBeenCalledWith({
        where: { segmentCode: 'OP-010-MILL' },
        include: expect.any(Object),
      });
    });
  });

  describe('getAllProcessSegments', () => {
    it('should get all process segments', async () => {
      const mockSegments = [
        { id: 'seg-1', segmentCode: 'OP-010', segmentType: ProcessSegmentType.PRODUCTION },
        { id: 'seg-2', segmentCode: 'OP-020', segmentType: ProcessSegmentType.QUALITY },
      ];

      vi.mocked(mockPrisma.processSegment.findMany).mockResolvedValue(mockSegments as any);

      const result = await processSegmentService.getAllProcessSegments();

      expect(result).toEqual(mockSegments);
      expect(mockPrisma.processSegment.findMany).toHaveBeenCalled();
    });

    it('should filter by segment type', async () => {
      const mockSegments = [
        { id: 'seg-1', segmentType: ProcessSegmentType.PRODUCTION },
      ];

      vi.mocked(mockPrisma.processSegment.findMany).mockResolvedValue(mockSegments as any);

      await processSegmentService.getAllProcessSegments({
        segmentType: ProcessSegmentType.PRODUCTION,
      });

      expect(mockPrisma.processSegment.findMany).toHaveBeenCalledWith({
        where: { segmentType: ProcessSegmentType.PRODUCTION },
        include: undefined,
        orderBy: [{ level: 'asc' }, { segmentCode: 'asc' }],
      });
    });

    it('should filter by level', async () => {
      const mockSegments = [{ id: 'seg-1', level: 2 }];

      vi.mocked(mockPrisma.processSegment.findMany).mockResolvedValue(mockSegments as any);

      await processSegmentService.getAllProcessSegments({ level: 2 });

      expect(mockPrisma.processSegment.findMany).toHaveBeenCalledWith({
        where: { level: 2 },
        include: undefined,
        orderBy: [{ level: 'asc' }, { segmentCode: 'asc' }],
      });
    });
  });

  describe('updateProcessSegment', () => {
    it('should update process segment', async () => {
      const mockUpdated = {
        id: 'seg-1',
        segmentName: 'Updated Operation',
      };

      vi.mocked(mockPrisma.processSegment.update).mockResolvedValue(mockUpdated as any);

      const result = await processSegmentService.updateProcessSegment('seg-1', {
        segmentName: 'Updated Operation',
      });

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.processSegment.update).toHaveBeenCalledWith({
        where: { id: 'seg-1' },
        data: expect.any(Object),
        include: expect.any(Object),
      });
    });

    it('should prevent circular references when updating parent', async () => {
      const mockParent = { id: 'parent-1', parentSegmentId: null };

      // Mock findUnique for parent check in updateProcessSegment
      vi.mocked(mockPrisma.processSegment.findUnique)
        .mockResolvedValueOnce(mockParent as any)
        // Mock for getAncestorChain called by isDescendant
        .mockResolvedValueOnce({ id: 'seg-1', parentSegmentId: 'parent-1' } as any)
        .mockResolvedValueOnce({ id: 'parent-1', parentSegmentId: null } as any);

      await expect(
        processSegmentService.updateProcessSegment('seg-1', {
          parentSegmentId: 'parent-1',
        })
      ).rejects.toThrow('Circular reference detected');
    });
  });

  describe('deleteProcessSegment', () => {
    it('should soft delete process segment', async () => {
      vi.mocked(mockPrisma.processSegment.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.processSegment.update).mockResolvedValue({} as any);

      const result = await processSegmentService.deleteProcessSegment('seg-1');

      expect(result).toEqual({ deleted: true, hardDelete: false });
      expect(mockPrisma.processSegment.update).toHaveBeenCalledWith({
        where: { id: 'seg-1' },
        data: { isActive: false },
      });
    });

    it('should hard delete process segment when requested', async () => {
      vi.mocked(mockPrisma.processSegment.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.processSegment.delete).mockResolvedValue({} as any);

      const result = await processSegmentService.deleteProcessSegment('seg-1', true);

      expect(result).toEqual({ deleted: true, hardDelete: true });
      expect(mockPrisma.processSegment.delete).toHaveBeenCalled();
    });

    it('should throw error if segment has children', async () => {
      vi.mocked(mockPrisma.processSegment.count).mockResolvedValue(2);

      await expect(
        processSegmentService.deleteProcessSegment('seg-1')
      ).rejects.toThrow('Cannot delete segment: 2 child segments exist');
    });
  });

  // ==================== HIERARCHY MANAGEMENT ====================

  describe('getChildSegments', () => {
    it('should get child segments of a process segment', async () => {
      const mockChildren = [
        { id: 'child-1', segmentCode: 'OP-010-A', parentSegmentId: 'seg-1' },
        { id: 'child-2', segmentCode: 'OP-010-B', parentSegmentId: 'seg-1' },
      ];

      vi.mocked(mockPrisma.processSegment.findMany).mockResolvedValue(mockChildren as any);

      const result = await processSegmentService.getChildSegments('seg-1');

      expect(result).toEqual(mockChildren);
      expect(mockPrisma.processSegment.findMany).toHaveBeenCalledWith({
        where: { parentSegmentId: 'seg-1' },
        include: { childSegments: true, parameters: true },
        orderBy: { segmentCode: 'asc' },
      });
    });
  });

  describe('getRootSegments', () => {
    it('should get root segments (no parent)', async () => {
      const mockRoots = [
        { id: 'root-1', segmentCode: 'OP-010', parentSegmentId: null },
        { id: 'root-2', segmentCode: 'OP-020', parentSegmentId: null },
      ];

      vi.mocked(mockPrisma.processSegment.findMany).mockResolvedValue(mockRoots as any);

      const result = await processSegmentService.getRootSegments();

      expect(result).toEqual(mockRoots);
      expect(mockPrisma.processSegment.findMany).toHaveBeenCalledWith({
        where: { parentSegmentId: null },
        include: { childSegments: true, parameters: true },
        orderBy: { segmentCode: 'asc' },
      });
    });
  });

  describe('getSegmentHierarchyTree', () => {
    it('should get full hierarchy tree starting from segment', async () => {
      const mockChild = {
        id: 'child-1',
        segmentCode: 'OP-010-A',
        childSegments: [],
        parameters: [],
      };
      const mockSegment = {
        id: 'seg-1',
        segmentCode: 'OP-010',
        childSegments: [
          { id: 'child-1', segmentCode: 'OP-010-A' },
        ],
        parameters: [],
      };

      vi.mocked(mockPrisma.processSegment.findUnique)
        .mockResolvedValueOnce(mockSegment as any)
        .mockResolvedValueOnce(mockChild as any);

      const result = await processSegmentService.getSegmentHierarchyTree('seg-1');

      expect(result.id).toBe('seg-1');
      expect(result.children).toBeDefined();
      expect(result.children.length).toBe(1);
    });

    it('should throw error if segment not found', async () => {
      vi.mocked(mockPrisma.processSegment.findUnique).mockReset().mockResolvedValue(null);

      await expect(
        processSegmentService.getSegmentHierarchyTree('nonexistent')
      ).rejects.toThrow('Segment nonexistent not found');
    });
  });

  describe('getAncestorChain', () => {
    it('should get ancestor chain (path to root)', async () => {
      const mockGrandchild = {
        id: 'seg-3',
        segmentCode: 'OP-010-A-1',
        parentSegmentId: 'seg-2',
      };
      const mockChild = {
        id: 'seg-2',
        segmentCode: 'OP-010-A',
        parentSegmentId: 'seg-1',
      };
      const mockRoot = {
        id: 'seg-1',
        segmentCode: 'OP-010',
        parentSegmentId: null,
      };

      vi.mocked(mockPrisma.processSegment.findUnique)
        .mockResolvedValueOnce(mockGrandchild as any)
        .mockResolvedValueOnce(mockChild as any)
        .mockResolvedValueOnce(mockRoot as any);

      const result = await processSegmentService.getAncestorChain('seg-3');

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('seg-1'); // Root first
      expect(result[2].id).toBe('seg-3'); // Current last
    });

    it('should detect circular references and throw error', async () => {
      const mockSegment = {
        id: 'seg-1',
        parentSegmentId: 'seg-1', // Circular!
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);

      await expect(
        processSegmentService.getAncestorChain('seg-1')
      ).rejects.toThrow('Circular reference detected');
    });
  });

  describe('isDescendant', () => {
    it('should return true if segment is descendant', async () => {
      const mockAncestors = [
        { id: 'seg-1' },
        { id: 'seg-2' },
        { id: 'seg-3' },
      ];

      vi.mocked(mockPrisma.processSegment.findUnique)
        .mockResolvedValueOnce({ id: 'seg-3', parentSegmentId: 'seg-2' } as any)
        .mockResolvedValueOnce({ id: 'seg-2', parentSegmentId: 'seg-1' } as any)
        .mockResolvedValueOnce({ id: 'seg-1', parentSegmentId: null } as any);

      const result = await processSegmentService.isDescendant('seg-3', 'seg-1');

      expect(result).toBe(true);
    });

    it('should return false if segment is not descendant', async () => {
      const mockAncestors = [
        { id: 'seg-3' },
        { id: 'seg-2' },
      ];

      vi.mocked(mockPrisma.processSegment.findUnique)
        .mockResolvedValueOnce({ id: 'seg-3', parentSegmentId: 'seg-2' } as any)
        .mockResolvedValueOnce({ id: 'seg-2', parentSegmentId: null } as any);

      const result = await processSegmentService.isDescendant('seg-3', 'seg-1');

      expect(result).toBe(false);
    });
  });

  // ==================== PARAMETER MANAGEMENT ====================

  describe('addParameter', () => {
    it('should add parameter to segment', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockParameter = {
        id: 'param-1',
        segmentId: 'seg-1',
        parameterName: 'Spindle Speed',
        parameterType: ParameterType.INPUT,
        dataType: ParameterDataType.NUMBER,
        minValue: 1000,
        maxValue: 5000,
        unitOfMeasure: 'RPM',
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.processSegmentParameter.create).mockResolvedValue(mockParameter as any);

      const result = await processSegmentService.addParameter('seg-1', {
        parameterName: 'Spindle Speed',
        parameterType: ParameterType.INPUT,
        dataType: ParameterDataType.NUMBER,
        minValue: 1000,
        maxValue: 5000,
        unitOfMeasure: 'RPM',
      });

      expect(result).toEqual(mockParameter);
      expect(mockPrisma.processSegmentParameter.create).toHaveBeenCalled();
    });
  });

  describe('getSegmentParameters', () => {
    it('should get all parameters for a segment', async () => {
      const mockParameters = [
        { id: 'param-1', parameterName: 'Speed', displayOrder: 1 },
        { id: 'param-2', parameterName: 'Feed', displayOrder: 2 },
      ];

      vi.mocked(mockPrisma.processSegmentParameter.findMany).mockResolvedValue(mockParameters as any);

      const result = await processSegmentService.getSegmentParameters('seg-1');

      expect(result).toEqual(mockParameters);
      expect(mockPrisma.processSegmentParameter.findMany).toHaveBeenCalledWith({
        where: { segmentId: 'seg-1' },
        orderBy: [{ displayOrder: 'asc' }, { parameterName: 'asc' }],
      });
    });
  });

  describe('updateParameter', () => {
    it('should update parameter', async () => {
      const mockUpdated = {
        id: 'param-1',
        minValue: 2000,
      };

      vi.mocked(mockPrisma.processSegmentParameter.update).mockResolvedValue(mockUpdated as any);

      const result = await processSegmentService.updateParameter('param-1', {
        minValue: 2000,
      });

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.processSegmentParameter.update).toHaveBeenCalled();
    });
  });

  describe('deleteParameter', () => {
    it('should delete parameter', async () => {
      vi.mocked(mockPrisma.processSegmentParameter.delete).mockResolvedValue({} as any);

      const result = await processSegmentService.deleteParameter('param-1');

      expect(result).toEqual({ deleted: true });
      expect(mockPrisma.processSegmentParameter.delete).toHaveBeenCalled();
    });
  });

  describe('Parameter Types', () => {
    it('should support all parameter types', () => {
      const types = Object.values(ParameterType);
      expect(types).toContain(ParameterType.INPUT);
      expect(types).toContain(ParameterType.OUTPUT);
      expect(types).toContain(ParameterType.SET_POINT);
      expect(types).toContain(ParameterType.MEASURED);
      expect(types).toContain(ParameterType.CALCULATED);
      expect(types).toHaveLength(5);
    });
  });

  describe('Parameter Data Types', () => {
    it('should support all data types', () => {
      const types = Object.values(ParameterDataType);
      expect(types).toContain(ParameterDataType.NUMBER);
      expect(types).toContain(ParameterDataType.STRING);
      expect(types).toContain(ParameterDataType.BOOLEAN);
      expect(types).toContain(ParameterDataType.ENUM);
      expect(types).toContain(ParameterDataType.DATE);
      expect(types).toContain(ParameterDataType.JSON);
      expect(types).toHaveLength(6);
    });
  });

  describe('Parameter Constraints', () => {
    it('should validate min/max constraints', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockParameter = {
        id: 'param-1',
        parameterName: 'Temperature',
        minValue: 100,
        maxValue: 500,
        unitOfMeasure: '°F',
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.processSegmentParameter.create).mockResolvedValue(mockParameter as any);

      const result = await processSegmentService.addParameter('seg-1', {
        parameterName: 'Temperature',
        parameterType: ParameterType.SET_POINT,
        dataType: ParameterDataType.NUMBER,
        minValue: 100,
        maxValue: 500,
        unitOfMeasure: '°F',
      });

      expect(result.minValue).toBe(100);
      expect(result.maxValue).toBe(500);
    });
  });

  // ==================== DEPENDENCY MANAGEMENT ====================

  describe('addDependency', () => {
    it('should add dependency between segments', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockDependency = {
        id: 'dep-1',
        dependentSegmentId: 'seg-2',
        prerequisiteSegmentId: 'seg-1',
        dependencyType: DependencyType.MUST_COMPLETE,
        timingType: DependencyTimingType.FINISH_TO_START,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.processSegmentDependency.create).mockResolvedValue(mockDependency as any);

      const result = await processSegmentService.addDependency({
        dependentSegmentId: 'seg-2',
        prerequisiteSegmentId: 'seg-1',
        dependencyType: DependencyType.MUST_COMPLETE,
        timingType: DependencyTimingType.FINISH_TO_START,
      });

      expect(result).toEqual(mockDependency);
      expect(mockPrisma.processSegmentDependency.create).toHaveBeenCalled();
    });

    it('should throw error for self-dependency', async () => {
      const mockSegment = { id: 'seg-1' };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);

      await expect(
        processSegmentService.addDependency({
          dependentSegmentId: 'seg-1',
          prerequisiteSegmentId: 'seg-1',
          dependencyType: DependencyType.MUST_COMPLETE,
          timingType: DependencyTimingType.FINISH_TO_START,
        })
      ).rejects.toThrow('Segment cannot depend on itself');
    });
  });

  describe('getSegmentDependencies', () => {
    it('should get both dependencies and prerequisites', async () => {
      const mockDependencies = [
        { id: 'dep-1', dependentSegmentId: 'seg-2', prerequisiteSegmentId: 'seg-1' },
      ];
      const mockPrerequisites = [
        { id: 'dep-2', dependentSegmentId: 'seg-3', prerequisiteSegmentId: 'seg-2' },
      ];

      vi.mocked(mockPrisma.processSegmentDependency.findMany)
        .mockResolvedValueOnce(mockDependencies as any)
        .mockResolvedValueOnce(mockPrerequisites as any);

      const result = await processSegmentService.getSegmentDependencies('seg-2');

      expect(result.dependencies).toEqual(mockDependencies);
      expect(result.prerequisites).toEqual(mockPrerequisites);
    });
  });

  describe('deleteDependency', () => {
    it('should delete dependency', async () => {
      vi.mocked(mockPrisma.processSegmentDependency.delete).mockResolvedValue({} as any);

      const result = await processSegmentService.deleteDependency('dep-1');

      expect(result).toEqual({ deleted: true });
      expect(mockPrisma.processSegmentDependency.delete).toHaveBeenCalled();
    });
  });

  describe('Dependency Types', () => {
    it('should support all dependency types', () => {
      const types = Object.values(DependencyType);
      expect(types).toContain(DependencyType.MUST_COMPLETE);
      expect(types).toContain(DependencyType.MUST_START);
      expect(types).toContain(DependencyType.OVERLAP_ALLOWED);
      expect(types).toContain(DependencyType.PARALLEL);
      expect(types).toHaveLength(4);
    });
  });

  describe('Dependency Timing Types', () => {
    it('should support all timing types', () => {
      const types = Object.values(DependencyTimingType);
      expect(types).toContain(DependencyTimingType.FINISH_TO_START);
      expect(types).toContain(DependencyTimingType.START_TO_START);
      expect(types).toContain(DependencyTimingType.FINISH_TO_FINISH);
      expect(types).toContain(DependencyTimingType.START_TO_FINISH);
      expect(types).toHaveLength(4);
    });
  });

  describe('Dependency Timing Constraints', () => {
    it('should support lag time and lead time', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockDependency = {
        id: 'dep-1',
        dependentSegmentId: 'seg-2',
        prerequisiteSegmentId: 'seg-1',
        lagTime: 3600, // 1 hour delay
        leadTime: 7200, // Max 2 hour gap
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.processSegmentDependency.create).mockResolvedValue(mockDependency as any);

      const result = await processSegmentService.addDependency({
        dependentSegmentId: 'seg-2',
        prerequisiteSegmentId: 'seg-1',
        dependencyType: DependencyType.MUST_COMPLETE,
        timingType: DependencyTimingType.FINISH_TO_START,
        lagTime: 3600,
        leadTime: 7200,
      });

      expect(result.lagTime).toBe(3600);
      expect(result.leadTime).toBe(7200);
    });
  });

  describe('Conditional Dependencies', () => {
    it('should support conditional dependencies', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockDependency = {
        id: 'dep-1',
        condition: 'quality_check = PASS',
        isOptional: true,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.processSegmentDependency.create).mockResolvedValue(mockDependency as any);

      const result = await processSegmentService.addDependency({
        dependentSegmentId: 'seg-2',
        prerequisiteSegmentId: 'seg-1',
        dependencyType: DependencyType.MUST_COMPLETE,
        timingType: DependencyTimingType.FINISH_TO_START,
        condition: 'quality_check = PASS',
        isOptional: true,
      });

      expect(result.condition).toBe('quality_check = PASS');
      expect(result.isOptional).toBe(true);
    });
  });

  // ==================== PERSONNEL SPECIFICATIONS ====================

  describe('addPersonnelSpec', () => {
    it('should add personnel specification to segment', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        segmentId: 'seg-1',
        personnelClassId: 'class-1',
        skillId: 'skill-1',
        minimumCompetency: 3,
        quantity: 2,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.personnelSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addPersonnelSpec('seg-1', {
        personnelClassId: 'class-1',
        skillId: 'skill-1',
        minimumCompetency: 3,
        quantity: 2,
      });

      expect(result).toEqual(mockSpec);
      expect(mockPrisma.personnelSegmentSpecification.create).toHaveBeenCalled();
    });
  });

  describe('Personnel Skill Requirements', () => {
    it('should specify minimum competency level', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        minimumCompetency: 4,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.personnelSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addPersonnelSpec('seg-1', {
        personnelClassId: 'class-1',
        minimumCompetency: 4,
      });

      expect(result.minimumCompetency).toBe(4);
    });
  });

  describe('Personnel Certifications', () => {
    it('should specify required certifications', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        requiredCertifications: ['CERT-001', 'CERT-002'],
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.personnelSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addPersonnelSpec('seg-1', {
        personnelClassId: 'class-1',
        requiredCertifications: ['CERT-001', 'CERT-002'],
      });

      expect(result.requiredCertifications).toEqual(['CERT-001', 'CERT-002']);
    });
  });

  describe('Personnel Quantity', () => {
    it('should specify personnel quantity required', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        quantity: 3,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.personnelSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addPersonnelSpec('seg-1', {
        personnelClassId: 'class-1',
        quantity: 3,
      });

      expect(result.quantity).toBe(3);
    });
  });

  describe('Optional Personnel', () => {
    it('should support optional personnel specifications', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        isOptional: true,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.personnelSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addPersonnelSpec('seg-1', {
        personnelClassId: 'class-1',
        isOptional: true,
      });

      expect(result.isOptional).toBe(true);
    });
  });

  describe('Personnel Role Descriptions', () => {
    it('should include role name and description', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        roleName: 'Machine Operator',
        roleDescription: 'Operates CNC milling machine',
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.personnelSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addPersonnelSpec('seg-1', {
        personnelClassId: 'class-1',
        roleName: 'Machine Operator',
        roleDescription: 'Operates CNC milling machine',
      });

      expect(result.roleName).toBe('Machine Operator');
      expect(result.roleDescription).toBe('Operates CNC milling machine');
    });
  });

  // ==================== EQUIPMENT SPECIFICATIONS ====================

  describe('addEquipmentSpec', () => {
    it('should add equipment specification to segment', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        segmentId: 'seg-1',
        equipmentClass: 'CNC_MILL',
        equipmentType: 'MILLING_MACHINE',
        requiredCapabilities: ['5-AXIS', 'HIGH_SPEED'],
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.equipmentSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addEquipmentSpec('seg-1', {
        equipmentClass: 'CNC_MILL',
        equipmentType: 'MILLING_MACHINE',
        requiredCapabilities: ['5-AXIS', 'HIGH_SPEED'],
      });

      expect(result).toEqual(mockSpec);
      expect(mockPrisma.equipmentSegmentSpecification.create).toHaveBeenCalled();
    });
  });

  describe('Equipment Capabilities', () => {
    it('should specify required capabilities', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        requiredCapabilities: ['LASER_CUTTING', 'AUTO_FEED'],
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.equipmentSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addEquipmentSpec('seg-1', {
        equipmentClass: 'LASER',
        requiredCapabilities: ['LASER_CUTTING', 'AUTO_FEED'],
      });

      expect(result.requiredCapabilities).toEqual(['LASER_CUTTING', 'AUTO_FEED']);
    });
  });

  describe('Specific Equipment', () => {
    it('should allow specifying specific equipment ID', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        specificEquipmentId: 'MILL-001',
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.equipmentSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addEquipmentSpec('seg-1', {
        equipmentClass: 'CNC_MILL',
        specificEquipmentId: 'MILL-001',
      });

      expect(result.specificEquipmentId).toBe('MILL-001');
    });
  });

  describe('Equipment Capacity', () => {
    it('should specify minimum capacity requirements', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        minimumCapacity: 5000,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.equipmentSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addEquipmentSpec('seg-1', {
        equipmentClass: 'PRESS',
        minimumCapacity: 5000,
      });

      expect(result.minimumCapacity).toBe(5000);
    });
  });

  describe('Equipment Quantity', () => {
    it('should specify equipment quantity required', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        quantity: 2,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.equipmentSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addEquipmentSpec('seg-1', {
        equipmentClass: 'ROBOT',
        quantity: 2,
      });

      expect(result.quantity).toBe(2);
    });
  });

  describe('Equipment Setup Requirements', () => {
    it('should specify setup time requirements', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        setupRequired: true,
        setupTime: 3600, // 1 hour
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.equipmentSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addEquipmentSpec('seg-1', {
        equipmentClass: 'CNC_MILL',
        setupRequired: true,
        setupTime: 3600,
      });

      expect(result.setupRequired).toBe(true);
      expect(result.setupTime).toBe(3600);
    });
  });

  // ==================== MATERIAL SPECIFICATIONS ====================

  describe('addMaterialSpec', () => {
    it('should add material specification to segment', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        segmentId: 'seg-1',
        materialDefinitionId: 'mat-1',
        quantity: 100,
        unitOfMeasure: 'KG',
        consumptionType: 'CONSUMED',
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.materialSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addMaterialSpec('seg-1', {
        materialDefinitionId: 'mat-1',
        quantity: 100,
        unitOfMeasure: 'KG',
        consumptionType: 'CONSUMED',
      });

      expect(result).toEqual(mockSpec);
      expect(mockPrisma.materialSegmentSpecification.create).toHaveBeenCalled();
    });
  });

  describe('Material Consumption Types', () => {
    it('should specify consumption type', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        consumptionType: 'VARIABLE',
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.materialSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addMaterialSpec('seg-1', {
        materialDefinitionId: 'mat-1',
        quantity: 50,
        unitOfMeasure: 'L',
        consumptionType: 'VARIABLE',
      });

      expect(result.consumptionType).toBe('VARIABLE');
    });
  });

  describe('Material Quality Requirements', () => {
    it('should specify quality requirements', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        qualityRequirements: 'Grade A, certified origin',
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.materialSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addMaterialSpec('seg-1', {
        materialDefinitionId: 'mat-1',
        quantity: 10,
        unitOfMeasure: 'KG',
        qualityRequirements: 'Grade A, certified origin',
      });

      expect(result.qualityRequirements).toBe('Grade A, certified origin');
    });
  });

  describe('Material Substitute Allowance', () => {
    it('should allow substitute materials', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        allowSubstitutes: true,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.materialSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addMaterialSpec('seg-1', {
        materialDefinitionId: 'mat-1',
        quantity: 100,
        unitOfMeasure: 'KG',
        allowSubstitutes: true,
      });

      expect(result.allowSubstitutes).toBe(true);
    });
  });

  describe('Material Required Properties', () => {
    it('should specify required material properties', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        requiredProperties: ['TENSILE_STRENGTH', 'HARDNESS'],
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.materialSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addMaterialSpec('seg-1', {
        materialDefinitionId: 'mat-1',
        quantity: 50,
        unitOfMeasure: 'KG',
        requiredProperties: ['TENSILE_STRENGTH', 'HARDNESS'],
      });

      expect(result.requiredProperties).toEqual(['TENSILE_STRENGTH', 'HARDNESS']);
    });
  });

  describe('Optional Materials', () => {
    it('should support optional material specifications', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        isOptional: true,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.materialSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addMaterialSpec('seg-1', {
        materialDefinitionId: 'mat-1',
        quantity: 10,
        unitOfMeasure: 'L',
        isOptional: true,
      });

      expect(result.isOptional).toBe(true);
    });
  });

  // ==================== PHYSICAL ASSET SPECIFICATIONS ====================

  describe('addPhysicalAssetSpec', () => {
    it('should add physical asset specification to segment', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        segmentId: 'seg-1',
        assetType: 'TOOLING',
        assetCode: 'TOOL-001',
        assetName: 'End Mill 10mm',
        quantity: 5,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.physicalAssetSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addPhysicalAssetSpec('seg-1', {
        assetType: 'TOOLING',
        assetCode: 'TOOL-001',
        assetName: 'End Mill 10mm',
        quantity: 5,
      });

      expect(result).toEqual(mockSpec);
      expect(mockPrisma.physicalAssetSegmentSpecification.create).toHaveBeenCalled();
    });
  });

  describe('Asset Calibration Requirements', () => {
    it('should specify calibration requirements', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        requiresCalibration: true,
        calibrationInterval: 2592000, // 30 days in seconds
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.physicalAssetSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addPhysicalAssetSpec('seg-1', {
        assetType: 'GAUGE',
        assetCode: 'GAUGE-001',
        assetName: 'CMM Probe',
        requiresCalibration: true,
        calibrationInterval: 2592000,
      });

      expect(result.requiresCalibration).toBe(true);
      expect(result.calibrationInterval).toBe(2592000);
    });
  });

  describe('Asset Life Cycles', () => {
    it('should specify estimated life cycles', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        estimatedLifeCycles: 1000,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.physicalAssetSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addPhysicalAssetSpec('seg-1', {
        assetType: 'TOOLING',
        assetCode: 'DRILL-001',
        assetName: 'Carbide Drill',
        estimatedLifeCycles: 1000,
      });

      expect(result.estimatedLifeCycles).toBe(1000);
    });
  });

  describe('Asset Quantity', () => {
    it('should specify asset quantity', async () => {
      const mockSegment = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        quantity: 10,
      };

      vi.mocked(mockPrisma.processSegment.findUnique).mockResolvedValue(mockSegment as any);
      vi.mocked(mockPrisma.physicalAssetSegmentSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await processSegmentService.addPhysicalAssetSpec('seg-1', {
        assetType: 'FIXTURE',
        assetCode: 'FIX-001',
        assetName: 'Vise Jaws',
        quantity: 10,
      });

      expect(result.quantity).toBe(10);
    });
  });

  // ==================== RESOURCE SPECS QUERY ====================

  describe('getSegmentResourceSpecs', () => {
    it('should get all resource specs for segment', async () => {
      const mockPersonnel = [{ id: 'p-1', personnelClassId: 'class-1' }];
      const mockEquipment = [{ id: 'e-1', equipmentClass: 'MILL' }];
      const mockMaterials = [{ id: 'm-1', materialDefinitionId: 'mat-1' }];
      const mockAssets = [{ id: 'a-1', assetType: 'TOOLING' }];

      vi.mocked(mockPrisma.personnelSegmentSpecification.findMany).mockResolvedValue(mockPersonnel as any);
      vi.mocked(mockPrisma.equipmentSegmentSpecification.findMany).mockResolvedValue(mockEquipment as any);
      vi.mocked(mockPrisma.materialSegmentSpecification.findMany).mockResolvedValue(mockMaterials as any);
      vi.mocked(mockPrisma.physicalAssetSegmentSpecification.findMany).mockResolvedValue(mockAssets as any);

      const result = await processSegmentService.getSegmentResourceSpecs('seg-1');

      expect(result.personnel).toEqual(mockPersonnel);
      expect(result.equipment).toEqual(mockEquipment);
      expect(result.materials).toEqual(mockMaterials);
      expect(result.assets).toEqual(mockAssets);
    });
  });

  describe('Resource Specs Aggregation', () => {
    it('should aggregate all resource types', async () => {
      const mockPersonnel = [{ id: 'p-1' }, { id: 'p-2' }];
      const mockEquipment = [{ id: 'e-1' }];
      const mockMaterials = [{ id: 'm-1' }, { id: 'm-2' }, { id: 'm-3' }];
      const mockAssets = [];

      vi.mocked(mockPrisma.personnelSegmentSpecification.findMany).mockResolvedValue(mockPersonnel as any);
      vi.mocked(mockPrisma.equipmentSegmentSpecification.findMany).mockResolvedValue(mockEquipment as any);
      vi.mocked(mockPrisma.materialSegmentSpecification.findMany).mockResolvedValue(mockMaterials as any);
      vi.mocked(mockPrisma.physicalAssetSegmentSpecification.findMany).mockResolvedValue(mockAssets as any);

      const result = await processSegmentService.getSegmentResourceSpecs('seg-1');

      expect(result.personnel.length).toBe(2);
      expect(result.equipment.length).toBe(1);
      expect(result.materials.length).toBe(3);
      expect(result.assets.length).toBe(0);
    });
  });

  describe('Empty Resource Specs', () => {
    it('should handle segments with no resource specs', async () => {
      vi.mocked(mockPrisma.personnelSegmentSpecification.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.equipmentSegmentSpecification.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.materialSegmentSpecification.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.physicalAssetSegmentSpecification.findMany).mockResolvedValue([]);

      const result = await processSegmentService.getSegmentResourceSpecs('seg-1');

      expect(result.personnel).toEqual([]);
      expect(result.equipment).toEqual([]);
      expect(result.materials).toEqual([]);
      expect(result.assets).toEqual([]);
    });
  });

  // ==================== STATISTICS & REPORTING ====================

  describe('getStatistics', () => {
    it('should calculate process segment statistics', async () => {
      const mockSegmentsByType = [
        { segmentType: ProcessSegmentType.PRODUCTION, _count: 10 },
        { segmentType: ProcessSegmentType.QUALITY, _count: 5 },
      ];
      const mockSegmentsByLevel = [
        { level: 1, _count: 8 },
        { level: 2, _count: 12 },
        { level: 3, _count: 5 },
      ];

      vi.mocked(mockPrisma.processSegment.count)
        .mockResolvedValueOnce(25) // total
        .mockResolvedValueOnce(20) // active
        .mockResolvedValueOnce(15); // approved

      vi.mocked(mockPrisma.processSegment.groupBy)
        .mockResolvedValueOnce(mockSegmentsByType as any)
        .mockResolvedValueOnce(mockSegmentsByLevel as any);

      const result = await processSegmentService.getStatistics();

      expect(result.totalSegments).toBe(25);
      expect(result.activeSegments).toBe(20);
      expect(result.inactiveSegments).toBe(5);
      expect(result.approvedSegments).toBe(15);
      expect(result.segmentsByType).toEqual(mockSegmentsByType);
      expect(result.segmentsByLevel).toEqual(mockSegmentsByLevel);
    });
  });

  describe('getSegmentTotalTime', () => {
    it('should calculate total time including children', async () => {
      const mockSegment = {
        id: 'seg-1',
        duration: 3600,
        setupTime: 600,
        teardownTime: 300,
        childSegments: [
          { id: 'child-1' },
        ],
      };
      const mockChild = {
        id: 'child-1',
        duration: 1800,
        setupTime: 300,
        teardownTime: 150,
        childSegments: [],
      };

      vi.mocked(mockPrisma.processSegment.findUnique)
        .mockResolvedValueOnce(mockSegment as any)
        .mockResolvedValueOnce(mockChild as any);

      const result = await processSegmentService.getSegmentTotalTime('seg-1');

      // Parent: 3600 + 600 + 300 = 4500
      // Child: 1800 + 300 + 150 = 2250
      // Total: 6750
      expect(result).toBe(6750);
    });
  });

  describe('Recursive Time Calculation', () => {
    it('should recursively calculate time for nested children', async () => {
      const mockParent = {
        id: 'seg-1',
        duration: 1000,
        setupTime: 100,
        teardownTime: 100,
        childSegments: [{ id: 'child-1' }, { id: 'child-2' }],
      };
      const mockChild1 = {
        id: 'child-1',
        duration: 500,
        setupTime: 0,
        teardownTime: 0,
        childSegments: [],
      };
      const mockChild2 = {
        id: 'child-2',
        duration: 300,
        setupTime: 0,
        teardownTime: 0,
        childSegments: [],
      };

      vi.mocked(mockPrisma.processSegment.findUnique)
        .mockResolvedValueOnce(mockParent as any)
        .mockResolvedValueOnce(mockChild1 as any)
        .mockResolvedValueOnce(mockChild2 as any);

      const result = await processSegmentService.getSegmentTotalTime('seg-1');

      // Parent: 1000 + 100 + 100 = 1200
      // Child1: 500
      // Child2: 300
      // Total: 2000
      expect(result).toBe(2000);
    });
  });
});
