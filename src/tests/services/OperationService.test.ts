import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OperationService } from '../../services/OperationService';
import {
  OperationType,
  ParameterType,
  ParameterDataType,
  DependencyType,
  DependencyTimingType,
} from '@prisma/client';

// Mock PrismaClient
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');

  const mockPrisma = {
    operation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    operationParameter: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    operationDependency: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    personnelOperationSpecification: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    equipmentOperationSpecification: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    materialOperationSpecification: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    physicalAssetOperationSpecification: {
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

describe('OperationService', () => {
  let operationService: OperationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    operationService = new OperationService(mockPrisma);
    vi.clearAllMocks();
  });

  // ==================== OPERATION CRUD ====================

  describe('createOperation', () => {
    it('should create a new operation', async () => {
      const mockOperation = {
        id: 'op-1',
        operationCode: 'OP-010-MILL',
        operationName: 'Milling Operation',
        description: 'Mill the part to specifications',
        level: 1,
        operationType: OperationType.PRODUCTION,
        parentOperationId: null,
        childOperations: [],
        parameters: [],
        dependencies: [],
        personnelSpecs: [],
        equipmentSpecs: [],
        materialSpecs: [],
        assetSpecs: [],
      };

      vi.mocked(mockPrisma.operation.create).mockResolvedValue(mockOperation as any);

      const result = await operationService.createOperation({
        operationCode: 'OP-010-MILL',
        operationName: 'Milling Operation',
        description: 'Mill the part to specifications',
        operationType: OperationType.PRODUCTION,
      });

      expect(result).toEqual(mockOperation);
      expect(mockPrisma.operation.create).toHaveBeenCalled();
    });

    it('should create operation with parent and auto-increment level', async () => {
      const mockParent = {
        id: 'parent-1',
        level: 1,
      };
      const mockOperation = {
        id: 'seg-2',
        operationCode: 'OP-010-SUB',
        level: 2,
        parentOperationId: 'parent-1',
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockParent as any);
      vi.mocked(mockPrisma.operation.create).mockResolvedValue(mockOperation as any);

      const result = await operationService.createOperation({
        operationCode: 'OP-010-SUB',
        operationName: 'Sub Operation',
        parentOperationId: 'parent-1',
        operationType: OperationType.PRODUCTION,
      });

      expect(result.level).toBe(2);
    });

    it('should throw error if parent operation not found', async () => {
      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(null);

      await expect(
        operationService.createOperation({
          operationCode: 'OP-020',
          operationName: 'Operation',
          parentOperationId: 'nonexistent',
          operationType: OperationType.PRODUCTION,
        })
      ).rejects.toThrow('Parent operation nonexistent not found');
    });
  });

  describe('getOperationById', () => {
    it('should get operation by ID with relations', async () => {
      const mockOperation = {
        id: 'seg-1',
        operationCode: 'OP-010',
        operationName: 'Operation 10',
        parentOperation: null,
        childOperations: [],
        parameters: [],
        dependencies: [],
        personnelSpecs: [],
        equipmentSpecs: [],
        materialSpecs: [],
        assetSpecs: [],
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);

      const result = await operationService.getOperationById('seg-1');

      expect(result).toEqual(mockOperation);
      expect(mockPrisma.operation.findUnique).toHaveBeenCalledWith({
        where: { id: 'seg-1' },
        include: expect.any(Object),
      });
    });

    it('should throw error if operation not found', async () => {
      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(null);

      await expect(
        operationService.getOperationById('nonexistent')
      ).rejects.toThrow('Operation nonexistent not found');
    });
  });

  describe('getOperationByCode', () => {
    it('should get operation by code', async () => {
      const mockOperation = {
        id: 'seg-1',
        operationCode: 'OP-010-MILL',
        operationName: 'Milling Operation',
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);

      const result = await operationService.getOperationByCode('OP-010-MILL');

      expect(result).toEqual(mockOperation);
      expect(mockPrisma.operation.findUnique).toHaveBeenCalledWith({
        where: { operationCode: 'OP-010-MILL' },
        include: expect.any(Object),
      });
    });
  });

  describe('getAllOperations', () => {
    it('should get all operations', async () => {
      const mockOperations = [
        { id: 'seg-1', operationCode: 'OP-010', operationType: OperationType.PRODUCTION },
        { id: 'seg-2', operationCode: 'OP-020', operationType: OperationType.QUALITY },
      ];

      vi.mocked(mockPrisma.operation.findMany).mockResolvedValue(mockOperations as any);

      const result = await operationService.getAllOperations();

      expect(result).toEqual(mockOperations);
      expect(mockPrisma.operation.findMany).toHaveBeenCalled();
    });

    it('should filter by operation type', async () => {
      const mockOperations = [
        { id: 'seg-1', operationType: OperationType.PRODUCTION },
      ];

      vi.mocked(mockPrisma.operation.findMany).mockResolvedValue(mockOperations as any);

      await operationService.getAllOperations({
        operationType: OperationType.PRODUCTION,
      });

      expect(mockPrisma.operation.findMany).toHaveBeenCalledWith({
        where: { operationType: OperationType.PRODUCTION },
        include: undefined,
        orderBy: [{ level: 'asc' }, { operationCode: 'asc' }],
      });
    });

    it('should filter by level', async () => {
      const mockOperations = [{ id: 'seg-1', level: 2 }];

      vi.mocked(mockPrisma.operation.findMany).mockResolvedValue(mockOperations as any);

      await operationService.getAllOperations({ level: 2 });

      expect(mockPrisma.operation.findMany).toHaveBeenCalledWith({
        where: { level: 2 },
        include: undefined,
        orderBy: [{ level: 'asc' }, { operationCode: 'asc' }],
      });
    });
  });

  describe('updateOperation', () => {
    it('should update operation', async () => {
      const mockUpdated = {
        id: 'seg-1',
        operationName: 'Updated Operation',
      };

      vi.mocked(mockPrisma.operation.update).mockResolvedValue(mockUpdated as any);

      const result = await operationService.updateOperation('seg-1', {
        operationName: 'Updated Operation',
      });

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.operation.update).toHaveBeenCalledWith({
        where: { id: 'seg-1' },
        data: expect.any(Object),
      });
    });

    it('should prevent circular references when updating parent', async () => {
      const mockParent = { id: 'parent-1', parentOperationId: null };

      // Mock findUnique for parent check in updateOperation
      vi.mocked(mockPrisma.operation.findUnique)
        .mockResolvedValueOnce(mockParent as any)
        // Mock for getAncestorChain called by isDescendant - checking if parent-1 is descendant of seg-1
        // This simulates: seg-1 -> parent-1 (parent-1 is a child of seg-1)
        // Now trying to make parent-1 the parent of seg-1 would create a circle
        .mockResolvedValueOnce({ id: 'parent-1', parentOperationId: 'seg-1' } as any)
        .mockResolvedValueOnce({ id: 'seg-1', parentOperationId: null } as any);

      await expect(
        operationService.updateOperation('seg-1', {
          parentOperationId: 'parent-1',
        })
      ).rejects.toThrow('Circular reference detected');
    });
  });

  describe('deleteOperation', () => {
    it('should soft delete operation', async () => {
      vi.mocked(mockPrisma.operation.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.operation.update).mockResolvedValue({} as any);

      const result = await operationService.deleteOperation('seg-1');

      expect(result).toEqual({ deleted: true, hardDelete: false });
      expect(mockPrisma.operation.update).toHaveBeenCalledWith({
        where: { id: 'seg-1' },
        data: { isActive: false },
      });
    });

    it('should hard delete operation when requested', async () => {
      vi.mocked(mockPrisma.operation.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.operation.delete).mockResolvedValue({} as any);

      const result = await operationService.deleteOperation('seg-1', true);

      expect(result).toEqual({ deleted: true, hardDelete: true });
      expect(mockPrisma.operation.delete).toHaveBeenCalled();
    });

    it('should throw error if operation has children', async () => {
      vi.mocked(mockPrisma.operation.count).mockResolvedValue(2);

      await expect(
        operationService.deleteOperation('seg-1')
      ).rejects.toThrow('Cannot delete operation: 2 child operations exist');
    });
  });

  // ==================== HIERARCHY MANAGEMENT ====================

  describe('getChildOperations', () => {
    it('should get child operations of a operation', async () => {
      const mockChildren = [
        { id: 'child-1', operationCode: 'OP-010-A', parentOperationId: 'seg-1' },
        { id: 'child-2', operationCode: 'OP-010-B', parentOperationId: 'seg-1' },
      ];

      vi.mocked(mockPrisma.operation.findMany).mockResolvedValue(mockChildren as any);

      const result = await operationService.getChildOperations('seg-1');

      expect(result).toEqual(mockChildren);
      expect(mockPrisma.operation.findMany).toHaveBeenCalledWith({
        where: { parentOperationId: 'seg-1' },
        include: { childOperations: true, parameters: true },
        orderBy: { operationCode: 'asc' },
      });
    });
  });

  describe('getRootOperations', () => {
    it('should get root operations (no parent)', async () => {
      const mockRoots = [
        { id: 'root-1', operationCode: 'OP-010', parentOperationId: null },
        { id: 'root-2', operationCode: 'OP-020', parentOperationId: null },
      ];

      vi.mocked(mockPrisma.operation.findMany).mockResolvedValue(mockRoots as any);

      const result = await operationService.getRootOperations();

      expect(result).toEqual(mockRoots);
      expect(mockPrisma.operation.findMany).toHaveBeenCalledWith({
        where: { parentOperationId: null },
        include: { childOperations: true, parameters: true },
        orderBy: { operationCode: 'asc' },
      });
    });
  });

  describe('getOperationHierarchyTree', () => {
    it('should get full hierarchy tree starting from operation', async () => {
      const mockChild = {
        id: 'child-1',
        operationCode: 'OP-010-A',
        childOperations: [],
        parameters: [],
      };
      const mockOperation = {
        id: 'seg-1',
        operationCode: 'OP-010',
        childOperations: [
          { id: 'child-1', operationCode: 'OP-010-A' },
        ],
        parameters: [],
      };

      vi.mocked(mockPrisma.operation.findUnique)
        .mockResolvedValueOnce(mockOperation as any)
        .mockResolvedValueOnce(mockChild as any);

      const result = await operationService.getOperationHierarchyTree('seg-1');

      expect(result.id).toBe('seg-1');
      expect(result.children).toBeDefined();
      expect(result.children.length).toBe(1);
    });

    it('should throw error if operation not found', async () => {
      vi.mocked(mockPrisma.operation.findUnique).mockReset().mockResolvedValue(null);

      await expect(
        operationService.getOperationHierarchyTree('nonexistent')
      ).rejects.toThrow('Operation nonexistent not found');
    });
  });

  describe('getAncestorChain', () => {
    it('should get ancestor chain (path to root)', async () => {
      const mockGrandchild = {
        id: 'seg-3',
        operationCode: 'OP-010-A-1',
        parentOperationId: 'seg-2',
      };
      const mockChild = {
        id: 'seg-2',
        operationCode: 'OP-010-A',
        parentOperationId: 'seg-1',
      };
      const mockRoot = {
        id: 'seg-1',
        operationCode: 'OP-010',
        parentOperationId: null,
      };

      vi.mocked(mockPrisma.operation.findUnique)
        .mockResolvedValueOnce(mockGrandchild as any)
        .mockResolvedValueOnce(mockChild as any)
        .mockResolvedValueOnce(mockRoot as any);

      const result = await operationService.getAncestorChain('seg-3');

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('seg-1'); // Root first
      expect(result[2].id).toBe('seg-3'); // Current last
    });

    it('should detect circular references and throw error', async () => {
      const mockOperation = {
        id: 'seg-1',
        parentOperationId: 'seg-1', // Circular!
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);

      await expect(
        operationService.getAncestorChain('seg-1')
      ).rejects.toThrow('Circular reference detected');
    });
  });

  describe('isDescendant', () => {
    it('should return true if operation is descendant', async () => {
      // Hierarchy: seg-1 (root) -> seg-2 -> seg-3
      // isDescendant('seg-3', 'seg-1') should return true (seg-3 is a descendant of seg-1)

      vi.mocked(mockPrisma.operation.findUnique)
        .mockResolvedValueOnce({ id: 'seg-3', parentOperationId: 'seg-2' } as any)
        .mockResolvedValueOnce({ id: 'seg-2', parentOperationId: 'seg-1' } as any)
        .mockResolvedValueOnce({ id: 'seg-1', parentOperationId: null } as any);

      const result = await operationService.isDescendant('seg-3', 'seg-1');

      expect(result).toBe(true);
    });

    it('should return false if operation is not descendant', async () => {
      const mockAncestors = [
        { id: 'seg-3' },
        { id: 'seg-2' },
      ];

      vi.mocked(mockPrisma.operation.findUnique)
        .mockResolvedValueOnce({ id: 'seg-3', parentOperationId: 'seg-2' } as any)
        .mockResolvedValueOnce({ id: 'seg-2', parentOperationId: null } as any);

      const result = await operationService.isDescendant('seg-3', 'seg-1');

      expect(result).toBe(false);
    });
  });

  // ==================== PARAMETER MANAGEMENT ====================

  describe('addParameter', () => {
    it('should add parameter to operation', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockParameter = {
        id: 'param-1',
        operationId: 'seg-1',
        parameterName: 'Spindle Speed',
        parameterType: ParameterType.INPUT,
        dataType: ParameterDataType.NUMBER,
        minValue: 1000,
        maxValue: 5000,
        unitOfMeasure: 'RPM',
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.operationParameter.create).mockResolvedValue(mockParameter as any);

      const result = await operationService.addParameter('seg-1', {
        parameterName: 'Spindle Speed',
        parameterType: ParameterType.INPUT,
        dataType: ParameterDataType.NUMBER,
        minValue: 1000,
        maxValue: 5000,
        unitOfMeasure: 'RPM',
      });

      expect(result).toEqual(mockParameter);
      expect(mockPrisma.operationParameter.create).toHaveBeenCalled();
    });
  });

  describe('getOperationParameters', () => {
    it('should get all parameters for a operation', async () => {
      const mockParameters = [
        { id: 'param-1', parameterName: 'Speed', displayOrder: 1 },
        { id: 'param-2', parameterName: 'Feed', displayOrder: 2 },
      ];

      vi.mocked(mockPrisma.operationParameter.findMany).mockResolvedValue(mockParameters as any);

      const result = await operationService.getOperationParameters('seg-1');

      expect(result).toEqual(mockParameters);
      expect(mockPrisma.operationParameter.findMany).toHaveBeenCalledWith({
        where: { operationId: 'seg-1' },
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

      vi.mocked(mockPrisma.operationParameter.update).mockResolvedValue(mockUpdated as any);

      const result = await operationService.updateParameter('param-1', {
        minValue: 2000,
      });

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.operationParameter.update).toHaveBeenCalled();
    });
  });

  describe('deleteParameter', () => {
    it('should delete parameter', async () => {
      vi.mocked(mockPrisma.operationParameter.delete).mockResolvedValue({} as any);

      const result = await operationService.deleteParameter('param-1');

      expect(result).toEqual({ deleted: true });
      expect(mockPrisma.operationParameter.delete).toHaveBeenCalled();
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
      const mockOperation = { id: 'seg-1' };
      const mockParameter = {
        id: 'param-1',
        parameterName: 'Temperature',
        minValue: 100,
        maxValue: 500,
        unitOfMeasure: '°F',
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.operationParameter.create).mockResolvedValue(mockParameter as any);

      const result = await operationService.addParameter('seg-1', {
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
    it('should add dependency between operations', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockDependency = {
        id: 'dep-1',
        dependentOperationId: 'seg-2',
        prerequisiteOperationId: 'seg-1',
        dependencyType: DependencyType.MUST_COMPLETE,
        timingType: DependencyTimingType.FINISH_TO_START,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.operationDependency.create).mockResolvedValue(mockDependency as any);

      const result = await operationService.addDependency({
        dependentOperationId: 'seg-2',
        prerequisiteOperationId: 'seg-1',
        dependencyType: DependencyType.MUST_COMPLETE,
        timingType: DependencyTimingType.FINISH_TO_START,
      });

      expect(result).toEqual(mockDependency);
      expect(mockPrisma.operationDependency.create).toHaveBeenCalled();
    });

    it('should throw error for self-dependency', async () => {
      const mockOperation = { id: 'seg-1' };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);

      await expect(
        operationService.addDependency({
          dependentOperationId: 'seg-1',
          prerequisiteOperationId: 'seg-1',
          dependencyType: DependencyType.MUST_COMPLETE,
          timingType: DependencyTimingType.FINISH_TO_START,
        })
      ).rejects.toThrow('Operation cannot depend on itself');
    });
  });

  describe('getOperationDependencies', () => {
    it('should get both dependencies and prerequisites', async () => {
      const mockDependencies = [
        { id: 'dep-1', dependentOperationId: 'seg-2', prerequisiteOperationId: 'seg-1' },
      ];
      const mockPrerequisites = [
        { id: 'dep-2', dependentOperationId: 'seg-3', prerequisiteOperationId: 'seg-2' },
      ];

      vi.mocked(mockPrisma.operationDependency.findMany)
        .mockResolvedValueOnce(mockDependencies as any)
        .mockResolvedValueOnce(mockPrerequisites as any);

      const result = await operationService.getOperationDependencies('seg-2');

      expect(result.dependencies).toEqual(mockDependencies);
      expect(result.prerequisites).toEqual(mockPrerequisites);
    });
  });

  describe('deleteDependency', () => {
    it('should delete dependency', async () => {
      vi.mocked(mockPrisma.operationDependency.delete).mockResolvedValue({} as any);

      const result = await operationService.deleteDependency('dep-1');

      expect(result).toEqual({ deleted: true });
      expect(mockPrisma.operationDependency.delete).toHaveBeenCalled();
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
      const mockOperation = { id: 'seg-1' };
      const mockDependency = {
        id: 'dep-1',
        dependentOperationId: 'seg-2',
        prerequisiteOperationId: 'seg-1',
        lagTime: 3600, // 1 hour delay
        leadTime: 7200, // Max 2 hour gap
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.operationDependency.create).mockResolvedValue(mockDependency as any);

      const result = await operationService.addDependency({
        dependentOperationId: 'seg-2',
        prerequisiteOperationId: 'seg-1',
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
      const mockOperation = { id: 'seg-1' };
      const mockDependency = {
        id: 'dep-1',
        condition: 'quality_check = PASS',
        isOptional: true,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.operationDependency.create).mockResolvedValue(mockDependency as any);

      const result = await operationService.addDependency({
        dependentOperationId: 'seg-2',
        prerequisiteOperationId: 'seg-1',
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
    it('should add personnel specification to operation', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        operationId: 'seg-1',
        personnelClassId: 'class-1',
        skillId: 'skill-1',
        minimumCompetency: 3,
        quantity: 2,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.personnelOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addPersonnelSpec('seg-1', {
        personnelClassId: 'class-1',
        skillId: 'skill-1',
        minimumCompetency: 3,
        quantity: 2,
      });

      expect(result).toEqual(mockSpec);
      expect(mockPrisma.personnelOperationSpecification.create).toHaveBeenCalled();
    });
  });

  describe('Personnel Skill Requirements', () => {
    it('should specify minimum competency level', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        minimumCompetency: 4,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.personnelOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addPersonnelSpec('seg-1', {
        personnelClassId: 'class-1',
        minimumCompetency: 4,
      });

      expect(result.minimumCompetency).toBe(4);
    });
  });

  describe('Personnel Certifications', () => {
    it('should specify required certifications', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        requiredCertifications: ['CERT-001', 'CERT-002'],
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.personnelOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addPersonnelSpec('seg-1', {
        personnelClassId: 'class-1',
        requiredCertifications: ['CERT-001', 'CERT-002'],
      });

      expect(result.requiredCertifications).toEqual(['CERT-001', 'CERT-002']);
    });
  });

  describe('Personnel Quantity', () => {
    it('should specify personnel quantity required', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        quantity: 3,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.personnelOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addPersonnelSpec('seg-1', {
        personnelClassId: 'class-1',
        quantity: 3,
      });

      expect(result.quantity).toBe(3);
    });
  });

  describe('Optional Personnel', () => {
    it('should support optional personnel specifications', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        isOptional: true,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.personnelOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addPersonnelSpec('seg-1', {
        personnelClassId: 'class-1',
        isOptional: true,
      });

      expect(result.isOptional).toBe(true);
    });
  });

  describe('Personnel Role Descriptions', () => {
    it('should include role name and description', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        roleName: 'Machine Operator',
        roleDescription: 'Operates CNC milling machine',
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.personnelOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addPersonnelSpec('seg-1', {
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
    it('should add equipment specification to operation', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        operationId: 'seg-1',
        equipmentClass: 'PRODUCTION',
        equipmentType: 'MILLING_MACHINE',
        requiredCapabilities: ['5-AXIS', 'HIGH_SPEED'],
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.equipmentOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addEquipmentSpec('seg-1', {
        equipmentClass: 'PRODUCTION',
        equipmentType: 'MILLING_MACHINE',
        requiredCapabilities: ['5-AXIS', 'HIGH_SPEED'],
      });

      expect(result).toEqual(mockSpec);
      expect(mockPrisma.equipmentOperationSpecification.create).toHaveBeenCalled();
    });
  });

  describe('Equipment Capabilities', () => {
    it('should specify required capabilities', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        requiredCapabilities: ['LASER_CUTTING', 'AUTO_FEED'],
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.equipmentOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addEquipmentSpec('seg-1', {
        equipmentClass: 'PRODUCTION',
        requiredCapabilities: ['LASER_CUTTING', 'AUTO_FEED'],
      });

      expect(result.requiredCapabilities).toEqual(['LASER_CUTTING', 'AUTO_FEED']);
    });
  });

  describe('Specific Equipment', () => {
    it('should allow specifying specific equipment ID', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        specificEquipmentId: 'MILL-001',
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.equipmentOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addEquipmentSpec('seg-1', {
        equipmentClass: 'PRODUCTION',
        specificEquipmentId: 'MILL-001',
      });

      expect(result.specificEquipmentId).toBe('MILL-001');
    });
  });

  describe('Equipment Capacity', () => {
    it('should specify minimum capacity requirements', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        minimumCapacity: 5000,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.equipmentOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addEquipmentSpec('seg-1', {
        equipmentClass: 'PRODUCTION',
        minimumCapacity: 5000,
      });

      expect(result.minimumCapacity).toBe(5000);
    });
  });

  describe('Equipment Quantity', () => {
    it('should specify equipment quantity required', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        quantity: 2,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.equipmentOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addEquipmentSpec('seg-1', {
        equipmentClass: 'ASSEMBLY',
        quantity: 2,
      });

      expect(result.quantity).toBe(2);
    });
  });

  describe('Equipment Setup Requirements', () => {
    it('should specify setup time requirements', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        setupRequired: true,
        setupTime: 3600, // 1 hour
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.equipmentOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addEquipmentSpec('seg-1', {
        equipmentClass: 'PRODUCTION',
        setupRequired: true,
        setupTime: 3600,
      });

      expect(result.setupRequired).toBe(true);
      expect(result.setupTime).toBe(3600);
    });
  });

  // ==================== MATERIAL SPECIFICATIONS ====================

  describe('addMaterialSpec', () => {
    it('should add material specification to operation', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        operationId: 'seg-1',
        materialDefinitionId: 'mat-1',
        quantity: 100,
        unitOfMeasure: 'KG',
        consumptionType: 'CONSUMED',
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.materialOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addMaterialSpec('seg-1', {
        materialDefinitionId: 'mat-1',
        quantity: 100,
        unitOfMeasure: 'KG',
        consumptionType: 'CONSUMED',
      });

      expect(result).toEqual(mockSpec);
      expect(mockPrisma.materialOperationSpecification.create).toHaveBeenCalled();
    });
  });

  describe('Material Consumption Types', () => {
    it('should specify consumption type', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        consumptionType: 'VARIABLE',
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.materialOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addMaterialSpec('seg-1', {
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
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        qualityRequirements: 'Grade A, certified origin',
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.materialOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addMaterialSpec('seg-1', {
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
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        allowSubstitutes: true,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.materialOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addMaterialSpec('seg-1', {
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
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        requiredProperties: ['TENSILE_STRENGTH', 'HARDNESS'],
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.materialOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addMaterialSpec('seg-1', {
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
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        isOptional: true,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.materialOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addMaterialSpec('seg-1', {
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
    it('should add physical asset specification to operation', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        operationId: 'seg-1',
        assetType: 'TOOLING',
        assetCode: 'TOOL-001',
        assetName: 'End Mill 10mm',
        quantity: 5,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.physicalAssetOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addPhysicalAssetSpec('seg-1', {
        assetType: 'TOOLING',
        assetCode: 'TOOL-001',
        assetName: 'End Mill 10mm',
        quantity: 5,
      });

      expect(result).toEqual(mockSpec);
      expect(mockPrisma.physicalAssetOperationSpecification.create).toHaveBeenCalled();
    });
  });

  describe('Asset Calibration Requirements', () => {
    it('should specify calibration requirements', async () => {
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        requiresCalibration: true,
        calibrationInterval: 2592000, // 30 days in seconds
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.physicalAssetOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addPhysicalAssetSpec('seg-1', {
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
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        estimatedLifeCycles: 1000,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.physicalAssetOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addPhysicalAssetSpec('seg-1', {
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
      const mockOperation = { id: 'seg-1' };
      const mockSpec = {
        id: 'spec-1',
        quantity: 10,
      };

      vi.mocked(mockPrisma.operation.findUnique).mockResolvedValue(mockOperation as any);
      vi.mocked(mockPrisma.physicalAssetOperationSpecification.create).mockResolvedValue(mockSpec as any);

      const result = await operationService.addPhysicalAssetSpec('seg-1', {
        assetType: 'FIXTURE',
        assetCode: 'FIX-001',
        assetName: 'Vise Jaws',
        quantity: 10,
      });

      expect(result.quantity).toBe(10);
    });
  });

  // ==================== RESOURCE SPECS QUERY ====================

  describe('getOperationResourceSpecs', () => {
    it('should get all resource specs for operation', async () => {
      const mockPersonnel = [{ id: 'p-1', personnelClassId: 'class-1' }];
      const mockEquipment = [{ id: 'e-1', equipmentClass: 'PRODUCTION' }];
      const mockMaterials = [{ id: 'm-1', materialDefinitionId: 'mat-1' }];
      const mockAssets = [{ id: 'a-1', assetType: 'TOOLING' }];

      vi.mocked(mockPrisma.personnelOperationSpecification.findMany).mockResolvedValue(mockPersonnel as any);
      vi.mocked(mockPrisma.equipmentOperationSpecification.findMany).mockResolvedValue(mockEquipment as any);
      vi.mocked(mockPrisma.materialOperationSpecification.findMany).mockResolvedValue(mockMaterials as any);
      vi.mocked(mockPrisma.physicalAssetOperationSpecification.findMany).mockResolvedValue(mockAssets as any);

      const result = await operationService.getOperationResourceSpecs('seg-1');

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

      vi.mocked(mockPrisma.personnelOperationSpecification.findMany).mockResolvedValue(mockPersonnel as any);
      vi.mocked(mockPrisma.equipmentOperationSpecification.findMany).mockResolvedValue(mockEquipment as any);
      vi.mocked(mockPrisma.materialOperationSpecification.findMany).mockResolvedValue(mockMaterials as any);
      vi.mocked(mockPrisma.physicalAssetOperationSpecification.findMany).mockResolvedValue(mockAssets as any);

      const result = await operationService.getOperationResourceSpecs('seg-1');

      expect(result.personnel.length).toBe(2);
      expect(result.equipment.length).toBe(1);
      expect(result.materials.length).toBe(3);
      expect(result.assets.length).toBe(0);
    });
  });

  describe('Empty Resource Specs', () => {
    it('should handle operations with no resource specs', async () => {
      vi.mocked(mockPrisma.personnelOperationSpecification.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.equipmentOperationSpecification.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.materialOperationSpecification.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.physicalAssetOperationSpecification.findMany).mockResolvedValue([]);

      const result = await operationService.getOperationResourceSpecs('seg-1');

      expect(result.personnel).toEqual([]);
      expect(result.equipment).toEqual([]);
      expect(result.materials).toEqual([]);
      expect(result.assets).toEqual([]);
    });
  });

  // ==================== STATISTICS & REPORTING ====================

  describe('getStatistics', () => {
    it('should calculate operation statistics', async () => {
      const mockOperationsByType = [
        { operationType: OperationType.PRODUCTION, _count: 10 },
        { operationType: OperationType.QUALITY, _count: 5 },
      ];
      const mockOperationsByLevel = [
        { level: 1, _count: 8 },
        { level: 2, _count: 12 },
        { level: 3, _count: 5 },
      ];

      vi.mocked(mockPrisma.operation.count)
        .mockResolvedValueOnce(25) // total
        .mockResolvedValueOnce(20) // active
        .mockResolvedValueOnce(15); // approved

      vi.mocked(mockPrisma.operation.groupBy)
        .mockResolvedValueOnce(mockOperationsByType as any)
        .mockResolvedValueOnce(mockOperationsByLevel as any);

      const result = await operationService.getStatistics();

      expect(result.totalOperations).toBe(25);
      expect(result.activeOperations).toBe(20);
      expect(result.inactiveOperations).toBe(5);
      expect(result.approvedOperations).toBe(15);
      expect(result.operationsByType).toEqual(mockOperationsByType);
      expect(result.operationsByLevel).toEqual(mockOperationsByLevel);
    });
  });

  describe('getOperationTotalTime', () => {
    it('should calculate total time including children', async () => {
      const mockOperation = {
        id: 'seg-1',
        duration: 3600,
        setupTime: 600,
        teardownTime: 300,
        childOperations: [
          { id: 'child-1' },
        ],
      };
      const mockChild = {
        id: 'child-1',
        duration: 1800,
        setupTime: 300,
        teardownTime: 150,
        childOperations: [],
      };

      vi.mocked(mockPrisma.operation.findUnique)
        .mockResolvedValueOnce(mockOperation as any)
        .mockResolvedValueOnce(mockChild as any);

      const result = await operationService.getOperationTotalTime('seg-1');

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
        childOperations: [{ id: 'child-1' }, { id: 'child-2' }],
      };
      const mockChild1 = {
        id: 'child-1',
        duration: 500,
        setupTime: 0,
        teardownTime: 0,
        childOperations: [],
      };
      const mockChild2 = {
        id: 'child-2',
        duration: 300,
        setupTime: 0,
        teardownTime: 0,
        childOperations: [],
      };

      vi.mocked(mockPrisma.operation.findUnique)
        .mockResolvedValueOnce(mockParent as any)
        .mockResolvedValueOnce(mockChild1 as any)
        .mockResolvedValueOnce(mockChild2 as any);

      const result = await operationService.getOperationTotalTime('seg-1');

      // Parent: 1000 + 100 + 100 = 1200
      // Child1: 500
      // Child2: 300
      // Total: 2000
      expect(result).toBe(2000);
    });
  });
});
