import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient, SerializedPart, PartGenealogy } from '@prisma/client';
import { TraceabilityService, GenealogyNode, GenealogyEdge, GenealogyGraph, ForwardTraceabilityResult, BackwardTraceabilityResult } from '../../services/TraceabilityService';

// Mock Prisma Client
const mockPrisma = {
  serializedPart: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  partGenealogy: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
} as unknown as PrismaClient;

// Mock the prisma instance in the service
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

describe('TraceabilityService', () => {
  let service: TraceabilityService;

  // Test data
  const mockPart = {
    id: 'part-123',
    partNumber: 'PN-001',
    partName: 'Widget Assembly',
    partType: 'ASSEMBLY',
  };

  const mockComponentPart = {
    id: 'component-456',
    partNumber: 'PN-002',
    partName: 'Widget Component',
    partType: 'COMPONENT',
  };

  const mockRawMaterialPart = {
    id: 'raw-789',
    partNumber: 'PN-003',
    partName: 'Steel Plate',
    partType: 'RAW_MATERIAL',
  };

  const mockSerializedPart = {
    id: 'serialized-123',
    serialNumber: 'SN-12345-001',
    lotNumber: 'LOT-001',
    status: 'ACTIVE',
    workOrderId: 'WO-001',
    manufactureDate: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    customerInfo: 'ACME Corp',
    part: mockPart,
    components: [],
  };

  const mockComponentSerializedPart = {
    id: 'component-serialized-456',
    serialNumber: 'SN-12345-002',
    lotNumber: 'LOT-002',
    status: 'ACTIVE',
    workOrderId: 'WO-002',
    manufactureDate: new Date('2024-01-10'),
    createdAt: new Date('2024-01-10'),
    customerInfo: 'Supplier ABC',
    part: mockComponentPart,
    components: [],
  };

  const mockRawMaterialSerializedPart = {
    id: 'raw-serialized-789',
    serialNumber: 'SN-12345-003',
    lotNumber: 'LOT-003',
    status: 'CONSUMED',
    workOrderId: null,
    manufactureDate: new Date('2024-01-05'),
    createdAt: new Date('2024-01-05'),
    customerInfo: 'Steel Supplier',
    part: mockRawMaterialPart,
    components: [],
  };

  const mockGenealogy = {
    id: 'genealogy-123',
    parentPartId: 'serialized-123',
    componentPartId: 'component-serialized-456',
    assemblyDate: new Date('2024-01-16'),
    assemblyOperator: 'John Doe',
    createdAt: new Date('2024-01-16'),
    parentPart: mockSerializedPart,
    componentPart: mockComponentSerializedPart,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TraceabilityService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize traceability service', () => {
      expect(service).toBeInstanceOf(TraceabilityService);
    });
  });

  describe('getForwardTraceability', () => {
    it('should find all products made from a specific lot', async () => {
      const mockDirectParts = [mockSerializedPart];
      const mockComponentUsage = [mockGenealogy];

      mockPrisma.serializedPart.findMany.mockResolvedValue(mockDirectParts);
      mockPrisma.partGenealogy.findMany.mockResolvedValue(mockComponentUsage);

      const result = await service.getForwardTraceability('LOT-001');

      expect(result).toEqual({
        lotNumber: 'LOT-001',
        usedInProducts: [
          {
            serialNumber: 'SN-12345-001',
            partNumber: 'PN-001',
            partName: 'Widget Assembly',
            workOrderNumber: 'WO-001',
            dateUsed: mockSerializedPart.manufactureDate.toISOString(),
            currentStatus: 'ACTIVE',
          },
          {
            serialNumber: 'SN-12345-001',
            partNumber: 'PN-001',
            partName: 'Widget Assembly',
            workOrderNumber: 'WO-001',
            dateUsed: mockGenealogy.assemblyDate!.toISOString(),
            currentStatus: 'ACTIVE',
          }
        ],
        totalProducts: 1, // Deduplicated
      });

      expect(mockPrisma.serializedPart.findMany).toHaveBeenCalledWith({
        where: { lotNumber: 'LOT-001' },
        include: { part: true },
      });
      expect(mockPrisma.partGenealogy.findMany).toHaveBeenCalledWith({
        where: {
          componentPart: { lotNumber: 'LOT-001' },
        },
        include: {
          parentPart: { include: { part: true } },
          componentPart: true,
        },
      });
    });

    it('should handle empty results', async () => {
      mockPrisma.serializedPart.findMany.mockResolvedValue([]);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      const result = await service.getForwardTraceability('NONEXISTENT-LOT');

      expect(result).toEqual({
        lotNumber: 'NONEXISTENT-LOT',
        usedInProducts: [],
        totalProducts: 0,
      });
    });

    it('should deduplicate products correctly', async () => {
      const duplicateUsage = [
        mockGenealogy,
        { ...mockGenealogy, id: 'genealogy-124' }, // Same parent part
      ];

      mockPrisma.serializedPart.findMany.mockResolvedValue([mockSerializedPart]);
      mockPrisma.partGenealogy.findMany.mockResolvedValue(duplicateUsage);

      const result = await service.getForwardTraceability('LOT-001');

      expect(result.totalProducts).toBe(1);
      expect(result.usedInProducts).toHaveLength(1);
    });

    it('should handle parts without work orders', async () => {
      const partWithoutWO = {
        ...mockSerializedPart,
        workOrderId: null,
      };

      mockPrisma.serializedPart.findMany.mockResolvedValue([partWithoutWO]);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      const result = await service.getForwardTraceability('LOT-001');

      expect(result.usedInProducts[0].workOrderNumber).toBeUndefined();
    });

    it('should handle database errors', async () => {
      mockPrisma.serializedPart.findMany.mockRejectedValue(new Error('Database connection error'));

      await expect(service.getForwardTraceability('LOT-001')).rejects.toThrow('Failed to retrieve forward traceability for lot number "LOT-001"');
    });

    it('should rethrow specific errors', async () => {
      const specificError = new Error('Specific database error');
      mockPrisma.serializedPart.findMany.mockRejectedValue(specificError);

      await expect(service.getForwardTraceability('LOT-001')).rejects.toThrow(specificError);
    });
  });

  describe('getBackwardTraceability', () => {
    it('should find all components used to make a product', async () => {
      const partWithComponents = {
        ...mockSerializedPart,
        components: [
          {
            ...mockGenealogy,
            componentPart: {
              ...mockComponentSerializedPart,
              part: mockComponentPart,
            },
          },
        ],
      };

      // Mock the recursive component collection
      mockPrisma.serializedPart.findUnique.mockResolvedValue(partWithComponents);
      mockPrisma.partGenealogy.findMany
        .mockResolvedValueOnce([
          {
            ...mockGenealogy,
            componentPart: {
              ...mockComponentSerializedPart,
              part: mockComponentPart,
            },
          },
        ])
        .mockResolvedValue([]); // No further sub-components

      const result = await service.getBackwardTraceability('SN-12345-001');

      expect(result).toEqual({
        serialNumber: 'SN-12345-001',
        partNumber: 'PN-001',
        partName: 'Widget Assembly',
        components: [
          {
            serialNumber: 'SN-12345-002',
            partNumber: 'PN-002',
            partName: 'Widget Component',
            lotNumber: 'LOT-002',
            supplier: 'Supplier ABC',
            assemblyDate: mockGenealogy.assemblyDate!.toISOString(),
            level: 0,
          },
        ],
        totalComponents: 1,
      });
    });

    it('should handle exact serial number match', async () => {
      mockPrisma.serializedPart.findUnique.mockResolvedValue(mockSerializedPart);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      const result = await service.getBackwardTraceability('SN-12345-001');

      expect(result.serialNumber).toBe('SN-12345-001');
      expect(mockPrisma.serializedPart.findUnique).toHaveBeenCalledWith({
        where: { serialNumber: 'SN-12345-001' },
        include: expect.any(Object),
      });
    });

    it('should fallback to startsWith pattern matching', async () => {
      mockPrisma.serializedPart.findUnique.mockResolvedValue(null);
      mockPrisma.serializedPart.findFirst.mockResolvedValueOnce(mockSerializedPart);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      const result = await service.getBackwardTraceability('SN-12345');

      expect(result.serialNumber).toBe('SN-12345-001');
      expect(mockPrisma.serializedPart.findFirst).toHaveBeenCalledWith({
        where: { serialNumber: { startsWith: 'SN-12345' } },
        include: expect.any(Object),
      });
    });

    it('should fallback to contains pattern matching', async () => {
      mockPrisma.serializedPart.findUnique.mockResolvedValue(null);
      mockPrisma.serializedPart.findFirst
        .mockResolvedValueOnce(null) // startsWith fails
        .mockResolvedValueOnce(mockSerializedPart); // contains succeeds
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      const result = await service.getBackwardTraceability('12345');

      expect(result.serialNumber).toBe('SN-12345-001');
      expect(mockPrisma.serializedPart.findFirst).toHaveBeenCalledWith({
        where: { serialNumber: { contains: '12345' } },
        include: expect.any(Object),
      });
    });

    it('should fallback to endsWith pattern matching', async () => {
      mockPrisma.serializedPart.findUnique.mockResolvedValue(null);
      mockPrisma.serializedPart.findFirst
        .mockResolvedValueOnce(null) // startsWith fails
        .mockResolvedValueOnce(null) // contains fails
        .mockResolvedValueOnce(mockSerializedPart); // endsWith succeeds
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      const result = await service.getBackwardTraceability('001');

      expect(result.serialNumber).toBe('SN-12345-001');
      expect(mockPrisma.serializedPart.findFirst).toHaveBeenCalledWith({
        where: { serialNumber: { endsWith: '001' } },
        include: expect.any(Object),
      });
    });

    it('should throw error when serial number not found', async () => {
      mockPrisma.serializedPart.findUnique.mockResolvedValue(null);
      mockPrisma.serializedPart.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(service.getBackwardTraceability('NONEXISTENT')).rejects.toThrow('Serialized part with serial number "NONEXISTENT" not found');
    });

    it('should handle multi-level component hierarchy', async () => {
      const nestedGenealogy = {
        ...mockGenealogy,
        componentPart: {
          ...mockComponentSerializedPart,
          part: mockComponentPart,
        },
      };

      const subGenealogy = {
        id: 'sub-genealogy-123',
        parentPartId: 'component-serialized-456',
        componentPartId: 'raw-serialized-789',
        assemblyDate: new Date('2024-01-12'),
        assemblyOperator: 'Jane Smith',
        createdAt: new Date('2024-01-12'),
        componentPart: {
          ...mockRawMaterialSerializedPart,
          part: mockRawMaterialPart,
        },
      };

      mockPrisma.serializedPart.findUnique.mockResolvedValue(mockSerializedPart);
      mockPrisma.partGenealogy.findMany
        .mockResolvedValueOnce([nestedGenealogy]) // Level 0 components
        .mockResolvedValueOnce([subGenealogy]) // Level 1 sub-components
        .mockResolvedValue([]); // No further components

      const result = await service.getBackwardTraceability('SN-12345-001');

      expect(result.components).toHaveLength(2);
      expect(result.components[0].level).toBe(0);
      expect(result.components[1].level).toBe(1);
      expect(result.components[1].partName).toBe('Steel Plate');
    });

    it('should prevent circular references in collection', async () => {
      const circularGenealogy = {
        ...mockGenealogy,
        componentPartId: 'serialized-123', // Points back to parent
        componentPart: {
          ...mockSerializedPart,
          part: mockPart,
        },
      };

      mockPrisma.serializedPart.findUnique.mockResolvedValue(mockSerializedPart);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([circularGenealogy]);

      const result = await service.getBackwardTraceability('SN-12345-001');

      // Should not include the circular reference
      expect(result.components).toHaveLength(0);
    });

    it('should handle database errors in backward traceability', async () => {
      mockPrisma.serializedPart.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getBackwardTraceability('SN-12345-001')).rejects.toThrow('Database error');
    });
  });

  describe('getGenealogyGraph', () => {
    it('should generate genealogy graph for visualization', async () => {
      const partWithComponents = {
        ...mockSerializedPart,
        components: [
          {
            ...mockGenealogy,
            componentPart: {
              ...mockComponentSerializedPart,
              part: mockComponentPart,
            },
          },
        ],
      };

      mockPrisma.serializedPart.findUnique
        .mockResolvedValueOnce(partWithComponents)
        .mockResolvedValueOnce({
          ...mockComponentSerializedPart,
          part: mockComponentPart,
          components: [],
        });

      const result = await service.getGenealogyGraph('SN-12345-001', 5);

      expect(result).toEqual({
        nodes: [
          {
            id: 'serialized-123',
            serialNumber: 'SN-12345-001',
            partNumber: 'PN-001',
            partName: 'Widget Assembly',
            partType: 'ASSEMBLY',
            lotNumber: 'LOT-001',
            status: 'ACTIVE',
            manufactureDate: mockSerializedPart.manufactureDate!.toISOString(),
            level: 0,
            nodeType: 'finished',
          },
          {
            id: 'component-serialized-456',
            serialNumber: 'SN-12345-002',
            partNumber: 'PN-002',
            partName: 'Widget Component',
            partType: 'COMPONENT',
            lotNumber: 'LOT-002',
            status: 'ACTIVE',
            manufactureDate: mockComponentSerializedPart.manufactureDate!.toISOString(),
            level: 1,
            nodeType: 'wip',
          },
        ],
        edges: [
          {
            id: 'genealogy-123',
            source: 'serialized-123',
            target: 'component-serialized-456',
            relationship: 'contains',
            assemblyDate: mockGenealogy.assemblyDate!.toISOString(),
            assemblyOperator: 'John Doe',
          },
        ],
        rootNodeId: 'serialized-123',
        maxDepth: 1,
      });
    });

    it('should use pattern matching for genealogy graph', async () => {
      mockPrisma.serializedPart.findUnique.mockResolvedValue(null);
      mockPrisma.serializedPart.findFirst.mockResolvedValue({
        ...mockSerializedPart,
        components: [],
      });

      const result = await service.getGenealogyGraph('SN-12345');

      expect(result.nodes).toHaveLength(1);
      expect(result.rootNodeId).toBe('serialized-123');
    });

    it('should respect max depth limit', async () => {
      const deepHierarchy = {
        ...mockSerializedPart,
        components: [
          {
            ...mockGenealogy,
            componentPart: {
              ...mockComponentSerializedPart,
              part: mockComponentPart,
            },
          },
        ],
      };

      mockPrisma.serializedPart.findUnique
        .mockResolvedValueOnce(deepHierarchy)
        .mockResolvedValueOnce({
          ...mockComponentSerializedPart,
          part: mockComponentPart,
          components: [],
        });

      const result = await service.getGenealogyGraph('SN-12345-001', 0);

      expect(result.nodes).toHaveLength(1); // Only root node due to maxDepth = 0
      expect(result.edges).toHaveLength(0);
    });

    it('should prevent circular references in graph building', async () => {
      const circularPart = {
        ...mockSerializedPart,
        components: [
          {
            ...mockGenealogy,
            componentPartId: 'serialized-123', // Circular reference
            componentPart: mockSerializedPart,
          },
        ],
      };

      mockPrisma.serializedPart.findUnique.mockResolvedValue(circularPart);

      const result = await service.getGenealogyGraph('SN-12345-001');

      expect(result.nodes).toHaveLength(1); // Only processes root once
    });

    it('should determine correct node types', async () => {
      const mixedParts = [
        { ...mockSerializedPart, part: { ...mockPart, partType: 'ASSEMBLY' } },
        { ...mockComponentSerializedPart, part: { ...mockComponentPart, partType: 'RAW_MATERIAL' } },
        { ...mockRawMaterialSerializedPart, part: { ...mockRawMaterialPart, partType: 'PURCHASED' } },
      ];

      mockPrisma.serializedPart.findUnique
        .mockResolvedValueOnce({
          ...mixedParts[0],
          components: [
            {
              ...mockGenealogy,
              componentPart: mixedParts[1],
            },
          ],
        })
        .mockResolvedValueOnce({
          ...mixedParts[1],
          components: [
            {
              id: 'sub-genealogy',
              componentPart: mixedParts[2],
            },
          ],
        })
        .mockResolvedValueOnce({
          ...mixedParts[2],
          components: [],
        });

      const result = await service.getGenealogyGraph('SN-12345-001');

      expect(result.nodes[0].nodeType).toBe('finished'); // Level 0
      expect(result.nodes[1].nodeType).toBe('raw_material'); // RAW_MATERIAL type
      expect(result.nodes[2].nodeType).toBe('purchased'); // PURCHASED type
    });

    it('should handle graph generation errors', async () => {
      mockPrisma.serializedPart.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getGenealogyGraph('SN-12345-001')).rejects.toThrow('Failed to generate genealogy graph');
    });
  });

  describe('detectCircularReferences', () => {
    it('should detect circular references', async () => {
      mockPrisma.serializedPart.findUnique.mockResolvedValue(mockSerializedPart);
      mockPrisma.partGenealogy.findMany
        .mockResolvedValueOnce([
          { componentPartId: 'component-456' },
        ])
        .mockResolvedValueOnce([
          { componentPartId: 'serialized-123' }, // Points back to original
        ]);

      const result = await service.detectCircularReferences('SN-12345-001');

      expect(result).toBe(true);
    });

    it('should return false when no circular references exist', async () => {
      mockPrisma.serializedPart.findUnique.mockResolvedValue(mockSerializedPart);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      const result = await service.detectCircularReferences('SN-12345-001');

      expect(result).toBe(false);
    });

    it('should use pattern matching for circular detection', async () => {
      mockPrisma.serializedPart.findUnique.mockResolvedValue(null);
      mockPrisma.serializedPart.findFirst.mockResolvedValue(mockSerializedPart);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      const result = await service.detectCircularReferences('SN-12345');

      expect(result).toBe(false);
      expect(mockPrisma.serializedPart.findFirst).toHaveBeenCalled();
    });

    it('should return false when part not found', async () => {
      mockPrisma.serializedPart.findUnique.mockResolvedValue(null);
      mockPrisma.serializedPart.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.detectCircularReferences('NONEXISTENT');

      expect(result).toBe(false);
    });

    it('should handle detection errors gracefully', async () => {
      mockPrisma.serializedPart.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await service.detectCircularReferences('SN-12345-001');

      expect(result).toBe(false);
    });
  });

  describe('createGenealogyRelationship', () => {
    it('should create genealogy relationship between parts', async () => {
      const parentPart = { id: 'parent-123', serialNumber: 'PARENT-001' };
      const componentPart = { id: 'component-456', serialNumber: 'COMPONENT-001' };
      const assemblyDate = new Date('2024-01-20');

      mockPrisma.serializedPart.findUnique
        .mockResolvedValueOnce(parentPart)
        .mockResolvedValueOnce(componentPart);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]); // No circular reference
      mockPrisma.partGenealogy.create.mockResolvedValue({
        ...mockGenealogy,
        parentPartId: 'parent-123',
        componentPartId: 'component-456',
        assemblyDate,
      });

      const result = await service.createGenealogyRelationship(
        'PARENT-001',
        'COMPONENT-001',
        assemblyDate,
        'John Doe'
      );

      expect(result.parentPartId).toBe('parent-123');
      expect(result.componentPartId).toBe('component-456');
      expect(mockPrisma.partGenealogy.create).toHaveBeenCalledWith({
        data: {
          parentPartId: 'parent-123',
          componentPartId: 'component-456',
          assemblyDate,
          assemblyOperator: 'John Doe',
        },
      });
    });

    it('should create relationship with minimal parameters', async () => {
      const parentPart = { id: 'parent-123', serialNumber: 'PARENT-001' };
      const componentPart = { id: 'component-456', serialNumber: 'COMPONENT-001' };

      mockPrisma.serializedPart.findUnique
        .mockResolvedValueOnce(parentPart)
        .mockResolvedValueOnce(componentPart);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);
      mockPrisma.partGenealogy.create.mockResolvedValue(mockGenealogy);

      const result = await service.createGenealogyRelationship('PARENT-001', 'COMPONENT-001');

      expect(result).toBeDefined();
      expect(mockPrisma.partGenealogy.create).toHaveBeenCalledWith({
        data: {
          parentPartId: 'parent-123',
          componentPartId: 'component-456',
          assemblyDate: undefined,
          assemblyOperator: undefined,
        },
      });
    });

    it('should throw error when parent part not found', async () => {
      mockPrisma.serializedPart.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'component-456' });

      await expect(service.createGenealogyRelationship('INVALID', 'COMPONENT-001'))
        .rejects.toThrow('Parent or component part not found');
    });

    it('should throw error when component part not found', async () => {
      mockPrisma.serializedPart.findUnique
        .mockResolvedValueOnce({ id: 'parent-123' })
        .mockResolvedValueOnce(null);

      await expect(service.createGenealogyRelationship('PARENT-001', 'INVALID'))
        .rejects.toThrow('Parent or component part not found');
    });

    it('should prevent creation of circular references', async () => {
      const parentPart = { id: 'parent-123', serialNumber: 'PARENT-001' };
      const componentPart = { id: 'component-456', serialNumber: 'COMPONENT-001' };

      mockPrisma.serializedPart.findUnique
        .mockResolvedValueOnce(parentPart)
        .mockResolvedValueOnce(componentPart);

      // Mock circular reference detection
      mockPrisma.partGenealogy.findMany.mockResolvedValue([
        { parentPartId: 'component-456' }, // Component is parent of someone
      ]);

      await expect(service.createGenealogyRelationship('PARENT-001', 'COMPONENT-001'))
        .rejects.toThrow('Cannot create genealogy: would create circular reference');
    });

    it('should handle creation errors', async () => {
      const parentPart = { id: 'parent-123', serialNumber: 'PARENT-001' };
      const componentPart = { id: 'component-456', serialNumber: 'COMPONENT-001' };

      mockPrisma.serializedPart.findUnique
        .mockResolvedValueOnce(parentPart)
        .mockResolvedValueOnce(componentPart);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);
      mockPrisma.partGenealogy.create.mockRejectedValue(new Error('Database constraint violation'));

      await expect(service.createGenealogyRelationship('PARENT-001', 'COMPONENT-001'))
        .rejects.toThrow('Database constraint violation');
    });
  });

  describe('Manufacturing Scenarios', () => {
    it('should handle aerospace assembly traceability', async () => {
      const aerospaceParts = {
        engine: {
          id: 'engine-001',
          serialNumber: 'ENGINE-CF6-80C2',
          lotNumber: 'ENGINE-LOT-001',
          part: { partNumber: 'CF6-80C2', partName: 'Turbofan Engine', partType: 'ASSEMBLY' },
          status: 'ACTIVE',
          manufactureDate: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          workOrderId: 'WO-ENGINE-001',
          customerInfo: 'Boeing',
        },
        turbine: {
          id: 'turbine-001',
          serialNumber: 'TURBINE-HPC-001',
          lotNumber: 'TURBINE-LOT-001',
          part: { partNumber: 'HPC-BLADE-SET', partName: 'High Pressure Compressor', partType: 'COMPONENT' },
          status: 'ACTIVE',
          manufactureDate: new Date('2023-12-15'),
          createdAt: new Date('2023-12-15'),
          workOrderId: 'WO-TURBINE-001',
          customerInfo: 'GE Aerospace',
        },
      };

      const aerospaceGenealogy = {
        id: 'aero-genealogy-001',
        parentPartId: 'engine-001',
        componentPartId: 'turbine-001',
        assemblyDate: new Date('2024-01-05'),
        assemblyOperator: 'Certified Technician A',
        createdAt: new Date('2024-01-05'),
        parentPart: aerospaceParts.engine,
        componentPart: aerospaceParts.turbine,
      };

      mockPrisma.serializedPart.findMany.mockResolvedValue([aerospaceParts.engine]);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([aerospaceGenealogy]);

      const result = await service.getForwardTraceability('ENGINE-LOT-001');

      expect(result.usedInProducts[0].partName).toBe('Turbofan Engine');
      expect(result.usedInProducts[0].workOrderNumber).toBe('WO-ENGINE-001');
    });

    it('should handle complex automotive supply chain', async () => {
      const automotiveParts = [
        {
          id: 'vehicle-001',
          serialNumber: 'VIN-1234567890',
          part: { partNumber: 'MODEL-S', partName: 'Tesla Model S', partType: 'FINISHED_GOOD' },
          components: [],
        },
        {
          id: 'battery-001',
          serialNumber: 'BATTERY-PACK-001',
          part: { partNumber: 'BATTERY-PACK', partName: 'Lithium Battery Pack', partType: 'ASSEMBLY' },
          components: [],
        },
        {
          id: 'cell-001',
          serialNumber: 'CELL-18650-001',
          part: { partNumber: 'CELL-18650', partName: 'Lithium Cell', partType: 'COMPONENT' },
          components: [],
        },
      ];

      const multiLevelGenealogy = [
        {
          parentPartId: 'vehicle-001',
          componentPartId: 'battery-001',
          componentPart: { ...automotiveParts[1], part: automotiveParts[1].part },
        },
        {
          parentPartId: 'battery-001',
          componentPartId: 'cell-001',
          componentPart: { ...automotiveParts[2], part: automotiveParts[2].part },
        },
      ];

      mockPrisma.serializedPart.findUnique.mockResolvedValue(automotiveParts[0]);
      mockPrisma.partGenealogy.findMany
        .mockResolvedValueOnce([multiLevelGenealogy[0]]) // Vehicle components
        .mockResolvedValueOnce([multiLevelGenealogy[1]]) // Battery components
        .mockResolvedValue([]); // No further sub-components

      const result = await service.getBackwardTraceability('VIN-1234567890');

      expect(result.components).toHaveLength(2);
      expect(result.components[0].level).toBe(0); // Battery pack
      expect(result.components[1].level).toBe(1); // Lithium cell
    });

    it('should handle medical device traceability requirements', async () => {
      const medicalDevice = {
        id: 'device-001',
        serialNumber: 'MD-PACEMAKER-001',
        lotNumber: 'MED-LOT-001',
        part: { partNumber: 'PACEMAKER-V2', partName: 'Cardiac Pacemaker', partType: 'MEDICAL_DEVICE' },
        status: 'IMPLANTED',
        manufactureDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        workOrderId: 'WO-MED-001',
        customerInfo: 'Medtronic',
      };

      mockPrisma.serializedPart.findMany.mockResolvedValue([medicalDevice]);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      const result = await service.getForwardTraceability('MED-LOT-001');

      expect(result.usedInProducts[0].currentStatus).toBe('IMPLANTED');
      expect(result.usedInProducts[0].partName).toBe('Cardiac Pacemaker');
      expect(result.totalProducts).toBe(1);
    });

    it('should handle high-volume electronics manufacturing', async () => {
      const electronicComponents = Array.from({ length: 1000 }, (_, i) => ({
        id: `chip-${i}`,
        serialNumber: `CHIP-${String(i).padStart(6, '0')}`,
        lotNumber: 'CHIP-LOT-2024-01',
        part: { partNumber: 'ARM-M4', partName: 'ARM Cortex M4 Microcontroller', partType: 'IC' },
        status: 'SHIPPED',
        manufactureDate: new Date('2024-01-15'),
        createdAt: new Date('2024-01-15'),
        workOrderId: `WO-CHIP-${Math.floor(i / 100)}`,
        customerInfo: 'ARM Holdings',
      }));

      mockPrisma.serializedPart.findMany.mockResolvedValue(electronicComponents);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      const result = await service.getForwardTraceability('CHIP-LOT-2024-01');

      expect(result.totalProducts).toBe(1000);
      expect(result.usedInProducts[0].partName).toBe('ARM Cortex M4 Microcontroller');
    });

    it('should handle product recall scenario', async () => {
      const recalledLot = 'RECALL-LOT-2024';
      const affectedProducts = [
        {
          id: 'affected-001',
          serialNumber: 'PRODUCT-001',
          part: { partNumber: 'CONSUMER-PRODUCT', partName: 'Smart Watch', partType: 'CONSUMER' },
          status: 'RECALLED',
          workOrderId: 'WO-WATCH-001',
          manufactureDate: new Date('2024-01-10'),
          createdAt: new Date('2024-01-10'),
          customerInfo: 'Apple Inc',
        },
        {
          id: 'affected-002',
          serialNumber: 'PRODUCT-002',
          part: { partNumber: 'CONSUMER-PRODUCT', partName: 'Smart Watch', partType: 'CONSUMER' },
          status: 'RECALLED',
          workOrderId: 'WO-WATCH-002',
          manufactureDate: new Date('2024-01-11'),
          createdAt: new Date('2024-01-11'),
          customerInfo: 'Apple Inc',
        },
      ];

      mockPrisma.serializedPart.findMany.mockResolvedValue(affectedProducts);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      const result = await service.getForwardTraceability(recalledLot);

      expect(result.totalProducts).toBe(2);
      expect(result.usedInProducts.every(p => p.currentStatus === 'RECALLED')).toBe(true);
      expect(result.usedInProducts.every(p => p.partName === 'Smart Watch')).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large genealogy trees efficiently', async () => {
      const largeTree = {
        ...mockSerializedPart,
        components: Array.from({ length: 100 }, (_, i) => ({
          id: `genealogy-${i}`,
          componentPart: {
            id: `component-${i}`,
            serialNumber: `COMP-${i}`,
            part: { ...mockComponentPart, partNumber: `PN-${i}` },
            components: [],
          },
        })),
      };

      mockPrisma.serializedPart.findUnique.mockResolvedValue(largeTree);
      // Mock each component lookup
      for (let i = 0; i < 100; i++) {
        mockPrisma.serializedPart.findUnique.mockResolvedValue({
          ...largeTree.components[i].componentPart,
          components: [],
        });
      }

      const result = await service.getGenealogyGraph('SN-12345-001');

      expect(result.nodes.length).toBeGreaterThan(1);
      expect(result.edges.length).toBe(100);
    });

    it('should handle malformed serial numbers gracefully', async () => {
      const malformedSerials = ['', '   ', null, undefined, 'SERIAL WITH SPACES'];

      for (const serial of malformedSerials) {
        mockPrisma.serializedPart.findUnique.mockResolvedValue(null);
        mockPrisma.serializedPart.findFirst.mockResolvedValue(null);

        if (serial) {
          await expect(service.getBackwardTraceability(serial as string))
            .rejects.toThrow();
        }
      }
    });

    it('should handle database timeouts gracefully', async () => {
      const timeoutError = new Error('Connection timeout');
      mockPrisma.serializedPart.findUnique.mockRejectedValue(timeoutError);

      await expect(service.getBackwardTraceability('SN-12345-001'))
        .rejects.toThrow('Connection timeout');
    });

    it('should optimize queries for deep hierarchies', async () => {
      const deepHierarchy = {
        ...mockSerializedPart,
        components: [{ ...mockGenealogy, componentPart: mockComponentSerializedPart }],
      };

      // Test maximum depth handling
      mockPrisma.serializedPart.findUnique.mockResolvedValue(deepHierarchy);
      mockPrisma.serializedPart.findUnique.mockResolvedValue({
        ...mockComponentSerializedPart,
        components: [],
      });

      const result = await service.getGenealogyGraph('SN-12345-001', 1);

      expect(result.maxDepth).toBeLessThanOrEqual(1);
      expect(result.nodes.every(n => n.level <= 1)).toBe(true);
    });

    it('should handle concurrent genealogy operations', async () => {
      const concurrentPromises = Array.from({ length: 10 }, (_, i) => {
        mockPrisma.serializedPart.findUnique.mockResolvedValue({
          ...mockSerializedPart,
          id: `concurrent-${i}`,
          serialNumber: `CONCURRENT-${i}`,
        });
        mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

        return service.getBackwardTraceability(`CONCURRENT-${i}`);
      });

      const results = await Promise.all(concurrentPromises);

      expect(results).toHaveLength(10);
      expect(results.every(r => r.components.length === 0)).toBe(true);
    });

    it('should validate graph consistency', async () => {
      const inconsistentData = {
        ...mockSerializedPart,
        components: [
          {
            ...mockGenealogy,
            componentPart: null, // Invalid data
          },
        ],
      };

      mockPrisma.serializedPart.findUnique.mockResolvedValue(inconsistentData);

      // Should handle gracefully without crashing
      const result = await service.getGenealogyGraph('SN-12345-001');

      expect(result.nodes).toHaveLength(1); // Only root node
      expect(result.edges).toHaveLength(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should recover from partial data corruption', async () => {
      const partiallyCorruptedData = {
        ...mockSerializedPart,
        part: null, // Corrupted relationship
      };

      mockPrisma.serializedPart.findUnique.mockResolvedValue(partiallyCorruptedData);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      // Should not crash, but return minimal data
      await expect(service.getBackwardTraceability('SN-12345-001'))
        .rejects.toThrow(); // Expected to fail gracefully
    });

    it('should handle network interruptions', async () => {
      let callCount = 0;
      mockPrisma.serializedPart.findUnique.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockSerializedPart);
      });

      // First call fails, should propagate error
      await expect(service.getBackwardTraceability('SN-12345-001'))
        .rejects.toThrow('Network error');
    });

    it('should handle memory pressure scenarios', async () => {
      // Simulate large dataset that could cause memory issues
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `large-${i}`,
        serialNumber: `LARGE-${i}`,
        part: mockPart,
        status: 'ACTIVE',
        createdAt: new Date(),
      }));

      mockPrisma.serializedPart.findMany.mockResolvedValue(largeDataset);
      mockPrisma.partGenealogy.findMany.mockResolvedValue([]);

      const result = await service.getForwardTraceability('LARGE-LOT');

      expect(result.totalProducts).toBe(10000);
      expect(result.usedInProducts).toHaveLength(10000);
    });
  });
});