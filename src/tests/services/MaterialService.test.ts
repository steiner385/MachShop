import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaterialService } from '../../services/MaterialService';
import {
  MaterialType,
  MaterialLotStatus,
  MaterialLotState,
  QualityLotStatus,
  GenealogyRelationType,
  MaterialPropertyType,
  StateTransitionType,
} from '@prisma/client';

// Import the database module
import prisma from '../../lib/database';

// Mock the database module
vi.mock('../../lib/database', () => ({
  default: {
    materialClass: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    materialDefinition: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    materialProperty: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    materialLot: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    materialSublot: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    materialLotGenealogy: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    materialStateHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('MaterialService', () => {
  let materialService: MaterialService;
  const mockPrisma = prisma as any;

  beforeEach(() => {
    materialService = new MaterialService();
    vi.clearAllMocks();
  });

  // ==================== MATERIAL CLASSES ====================

  describe('getAllMaterialClasses', () => {
    it('should get all material classes', async () => {
      const mockClasses = [
        { id: '1', classCode: 'RAW', className: 'Raw Material', level: 1, isActive: true },
        { id: '2', classCode: 'FG', className: 'Finished Goods', level: 1, isActive: true },
      ];
      vi.mocked(mockPrisma.materialClass.findMany).mockResolvedValue(mockClasses as any);

      const result = await materialService.getAllMaterialClasses();

      expect(result).toEqual(mockClasses);
      expect(mockPrisma.materialClass.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          parentClass: true,
          childClasses: false,
          materials: false,
        },
        orderBy: [{ level: 'asc' }, { className: 'asc' }],
      });
    });

    it('should filter material classes by level', async () => {
      const mockClasses = [
        { id: '1', classCode: 'RAW', className: 'Raw Material', level: 1, isActive: true },
      ];
      vi.mocked(mockPrisma.materialClass.findMany).mockResolvedValue(mockClasses as any);

      await materialService.getAllMaterialClasses({ level: 1 });

      expect(mockPrisma.materialClass.findMany).toHaveBeenCalledWith({
        where: { level: 1 },
        include: {
          parentClass: true,
          childClasses: false,
          materials: false,
        },
        orderBy: [{ level: 'asc' }, { className: 'asc' }],
      });
    });

    it('should include children when requested', async () => {
      const mockClasses = [
        { id: '1', classCode: 'RAW', className: 'Raw Material', level: 1, isActive: true },
      ];
      vi.mocked(mockPrisma.materialClass.findMany).mockResolvedValue(mockClasses as any);

      await materialService.getAllMaterialClasses({ includeChildren: true });

      expect(mockPrisma.materialClass.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          parentClass: true,
          childClasses: true,
          materials: false,
        },
        orderBy: [{ level: 'asc' }, { className: 'asc' }],
      });
    });
  });

  describe('getMaterialClassById', () => {
    it('should get material class by ID with relations', async () => {
      const mockClass = {
        id: '1',
        classCode: 'RAW',
        className: 'Raw Material',
        level: 1,
        isActive: true,
        parentClass: null,
        childClasses: [],
        materials: [],
      };
      vi.mocked(mockPrisma.materialClass.findUnique).mockResolvedValue(mockClass as any);

      const result = await materialService.getMaterialClassById('1');

      expect(result).toEqual(mockClass);
      expect(mockPrisma.materialClass.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          parentClass: true,
          childClasses: true,
          materials: true,
        },
      });
    });
  });

  describe('getMaterialClassHierarchy', () => {
    it('should get material class hierarchy (parent chain)', async () => {
      const childClass = {
        id: '3',
        classCode: 'STEEL',
        className: 'Steel Alloys',
        level: 3,
        parentClassId: '2',
      };
      const parentClass = {
        id: '2',
        classCode: 'METAL',
        className: 'Metals',
        level: 2,
        parentClassId: '1',
      };
      const grandparentClass = {
        id: '1',
        classCode: 'RAW',
        className: 'Raw Materials',
        level: 1,
        parentClassId: null,
      };

      vi.mocked(mockPrisma.materialClass.findUnique)
        .mockResolvedValueOnce(childClass as any)
        .mockResolvedValueOnce(parentClass as any)
        .mockResolvedValueOnce(grandparentClass as any);

      const result = await materialService.getMaterialClassHierarchy('3');

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('1'); // Top-down order
      expect(result[1].id).toBe('2');
      expect(result[2].id).toBe('3');
    });

    it('should return empty array if class not found', async () => {
      vi.mocked(mockPrisma.materialClass.findUnique).mockResolvedValue(null);

      const result = await materialService.getMaterialClassHierarchy('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('ISA-95 Material Classification Compliance', () => {
    it('should support all ISA-95 material types', () => {
      const types = Object.values(MaterialType);
      expect(types).toContain(MaterialType.RAW_MATERIAL);
      expect(types).toContain(MaterialType.COMPONENT);
      expect(types).toContain(MaterialType.WIP);
      expect(types).toContain(MaterialType.FINISHED_GOODS);
      expect(types).toContain(MaterialType.CONSUMABLE);
      expect(types).toContain(MaterialType.PACKAGING);
      expect(types).toHaveLength(10);
    });
  });

  // ==================== MATERIAL DEFINITIONS ====================

  describe('getAllMaterialDefinitions', () => {
    it('should get all material definitions', async () => {
      const mockDefinitions = [
        { id: '1', materialNumber: 'MAT-001', materialName: 'Steel Bar', materialType: MaterialType.RAW_MATERIAL },
        { id: '2', materialNumber: 'MAT-002', materialName: 'Aluminum Sheet', materialType: MaterialType.RAW_MATERIAL },
      ];
      vi.mocked(mockPrisma.materialDefinition.findMany).mockResolvedValue(mockDefinitions as any);

      const result = await materialService.getAllMaterialDefinitions();

      expect(result).toEqual(mockDefinitions);
      expect(mockPrisma.materialDefinition.findMany).toHaveBeenCalledWith({
        where: {},
        include: undefined,
        orderBy: { materialNumber: 'asc' },
      });
    });

    it('should filter by material class', async () => {
      const mockDefinitions = [
        { id: '1', materialNumber: 'MAT-001', materialName: 'Steel Bar', materialClassId: 'class-1' },
      ];
      vi.mocked(mockPrisma.materialDefinition.findMany).mockResolvedValue(mockDefinitions as any);

      await materialService.getAllMaterialDefinitions({ materialClassId: 'class-1' });

      expect(mockPrisma.materialDefinition.findMany).toHaveBeenCalledWith({
        where: { materialClassId: 'class-1' },
        include: undefined,
        orderBy: { materialNumber: 'asc' },
      });
    });

    it('should filter by material type', async () => {
      const mockDefinitions = [
        { id: '1', materialNumber: 'MAT-001', materialType: MaterialType.RAW_MATERIAL },
      ];
      vi.mocked(mockPrisma.materialDefinition.findMany).mockResolvedValue(mockDefinitions as any);

      await materialService.getAllMaterialDefinitions({ materialType: MaterialType.RAW_MATERIAL });

      expect(mockPrisma.materialDefinition.findMany).toHaveBeenCalledWith({
        where: { materialType: MaterialType.RAW_MATERIAL },
        include: undefined,
        orderBy: { materialNumber: 'asc' },
      });
    });

    it('should include relations when requested', async () => {
      const mockDefinitions = [
        { id: '1', materialNumber: 'MAT-001', materialName: 'Steel Bar' },
      ];
      vi.mocked(mockPrisma.materialDefinition.findMany).mockResolvedValue(mockDefinitions as any);

      await materialService.getAllMaterialDefinitions({ includeRelations: true });

      expect(mockPrisma.materialDefinition.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          materialClass: true,
          properties: true,
          lots: true,
          replacementMaterial: true,
        },
        orderBy: { materialNumber: 'asc' },
      });
    });

    it('should filter by active status', async () => {
      const mockDefinitions = [
        { id: '1', materialNumber: 'MAT-001', isActive: true },
      ];
      vi.mocked(mockPrisma.materialDefinition.findMany).mockResolvedValue(mockDefinitions as any);

      await materialService.getAllMaterialDefinitions({ isActive: true });

      expect(mockPrisma.materialDefinition.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: undefined,
        orderBy: { materialNumber: 'asc' },
      });
    });
  });

  describe('getMaterialDefinitionById', () => {
    it('should get material definition by ID with relations', async () => {
      const mockDefinition = {
        id: '1',
        materialNumber: 'MAT-001',
        materialName: 'Steel Bar',
        materialClass: { id: 'class-1', className: 'Metals' },
        properties: [],
        lots: [],
      };
      vi.mocked(mockPrisma.materialDefinition.findUnique).mockResolvedValue(mockDefinition as any);

      const result = await materialService.getMaterialDefinitionById('1');

      expect(result).toEqual(mockDefinition);
      expect(mockPrisma.materialDefinition.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          materialClass: true,
          properties: true,
          lots: {
            where: { isQuarantined: false },
            take: 10,
            orderBy: { receivedDate: 'desc' },
          },
          replacementMaterial: true,
          replacedMaterials: true,
        },
      });
    });
  });

  describe('getMaterialDefinitionByNumber', () => {
    it('should get material definition by material number', async () => {
      const mockDefinition = {
        id: '1',
        materialNumber: 'MAT-001',
        materialName: 'Steel Bar',
      };
      vi.mocked(mockPrisma.materialDefinition.findUnique).mockResolvedValue(mockDefinition as any);

      const result = await materialService.getMaterialDefinitionByNumber('MAT-001');

      expect(result).toEqual(mockDefinition);
      expect(mockPrisma.materialDefinition.findUnique).toHaveBeenCalledWith({
        where: { materialNumber: 'MAT-001' },
        include: {
          materialClass: true,
          properties: true,
          lots: {
            where: { status: 'AVAILABLE' },
            orderBy: { receivedDate: 'asc' }, // FIFO
          },
        },
      });
    });
  });

  describe('updateMaterialDefinition', () => {
    it('should update material definition', async () => {
      const mockUpdated = {
        id: '1',
        materialNumber: 'MAT-001',
        materialName: 'Updated Steel Bar',
      };
      vi.mocked(mockPrisma.materialDefinition.update).mockResolvedValue(mockUpdated as any);

      const result = await materialService.updateMaterialDefinition('1', {
        materialName: 'Updated Steel Bar',
      });

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.materialDefinition.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { materialName: 'Updated Steel Bar' },
        include: {
          materialClass: true,
          properties: true,
        },
      });
    });
  });

  // ==================== MATERIAL PROPERTIES ====================

  describe('getMaterialProperties', () => {
    it('should get material properties for a material', async () => {
      const mockProperties = [
        { id: '1', materialId: 'mat-1', propertyName: 'Hardness', propertyType: MaterialPropertyType.MECHANICAL },
        { id: '2', materialId: 'mat-1', propertyName: 'Density', propertyType: MaterialPropertyType.PHYSICAL },
      ];
      vi.mocked(mockPrisma.materialProperty.findMany).mockResolvedValue(mockProperties as any);

      const result = await materialService.getMaterialProperties('mat-1');

      expect(result).toEqual(mockProperties);
      expect(mockPrisma.materialProperty.findMany).toHaveBeenCalledWith({
        where: { materialId: 'mat-1' },
        orderBy: { propertyName: 'asc' },
      });
    });
  });

  describe('createMaterialProperty', () => {
    it('should create material property', async () => {
      const mockProperty = {
        id: '1',
        materialId: 'mat-1',
        propertyName: 'Hardness',
        propertyType: MaterialPropertyType.MECHANICAL,
        propertyValue: 'HRC 60',
      };
      vi.mocked(mockPrisma.materialProperty.create).mockResolvedValue(mockProperty as any);

      const result = await materialService.createMaterialProperty({
        materialId: 'mat-1',
        propertyName: 'Hardness',
        propertyType: MaterialPropertyType.MECHANICAL,
        propertyValue: 'HRC 60',
      });

      expect(result).toEqual(mockProperty);
      expect(mockPrisma.materialProperty.create).toHaveBeenCalledWith({
        data: {
          material: {
            connect: { id: 'mat-1' }
          },
          propertyName: 'Hardness',
          propertyType: MaterialPropertyType.MECHANICAL,
          propertyValue: 'HRC 60',
        },
        include: { material: true },
      });
    });
  });

  describe('Material Property Types', () => {
    it('should support all property types', () => {
      const types = Object.values(MaterialPropertyType);
      expect(types).toContain(MaterialPropertyType.PHYSICAL);
      expect(types).toContain(MaterialPropertyType.CHEMICAL);
      expect(types).toContain(MaterialPropertyType.MECHANICAL);
      expect(types).toContain(MaterialPropertyType.THERMAL);
      expect(types).toContain(MaterialPropertyType.ELECTRICAL);
      expect(types).toContain(MaterialPropertyType.OPTICAL);
      expect(types).toContain(MaterialPropertyType.REGULATORY);
      expect(types).toHaveLength(8);
    });
  });

  // ==================== MATERIAL LOTS ====================

  describe('getAllMaterialLots', () => {
    it('should get all material lots', async () => {
      const mockLots = [
        { id: '1', lotNumber: 'LOT-001', materialId: 'mat-1', status: MaterialLotStatus.AVAILABLE },
        { id: '2', lotNumber: 'LOT-002', materialId: 'mat-2', status: MaterialLotStatus.AVAILABLE },
      ];
      vi.mocked(mockPrisma.materialLot.findMany).mockResolvedValue(mockLots as any);

      const result = await materialService.getAllMaterialLots();

      expect(result).toEqual(mockLots);
      expect(mockPrisma.materialLot.findMany).toHaveBeenCalledWith({
        where: {},
        include: undefined,
        orderBy: { receivedDate: 'desc' },
      });
    });

    it('should filter by material ID', async () => {
      const mockLots = [
        { id: '1', lotNumber: 'LOT-001', materialId: 'mat-1' },
      ];
      vi.mocked(mockPrisma.materialLot.findMany).mockResolvedValue(mockLots as any);

      await materialService.getAllMaterialLots({ materialId: 'mat-1' });

      expect(mockPrisma.materialLot.findMany).toHaveBeenCalledWith({
        where: { materialId: 'mat-1' },
        include: undefined,
        orderBy: { receivedDate: 'desc' },
      });
    });

    it('should filter by status', async () => {
      const mockLots = [
        { id: '1', lotNumber: 'LOT-001', status: MaterialLotStatus.AVAILABLE },
      ];
      vi.mocked(mockPrisma.materialLot.findMany).mockResolvedValue(mockLots as any);

      await materialService.getAllMaterialLots({ status: MaterialLotStatus.AVAILABLE });

      expect(mockPrisma.materialLot.findMany).toHaveBeenCalledWith({
        where: { status: MaterialLotStatus.AVAILABLE },
        include: undefined,
        orderBy: { receivedDate: 'desc' },
      });
    });

    it('should filter by quality status', async () => {
      const mockLots = [
        { id: '1', lotNumber: 'LOT-001', qualityStatus: QualityLotStatus.APPROVED },
      ];
      vi.mocked(mockPrisma.materialLot.findMany).mockResolvedValue(mockLots as any);

      await materialService.getAllMaterialLots({ qualityStatus: QualityLotStatus.APPROVED });

      expect(mockPrisma.materialLot.findMany).toHaveBeenCalledWith({
        where: { qualityStatus: QualityLotStatus.APPROVED },
        include: undefined,
        orderBy: { receivedDate: 'desc' },
      });
    });

    it('should include relations when requested', async () => {
      const mockLots = [
        { id: '1', lotNumber: 'LOT-001' },
      ];
      vi.mocked(mockPrisma.materialLot.findMany).mockResolvedValue(mockLots as any);

      await materialService.getAllMaterialLots({ includeRelations: true });

      expect(mockPrisma.materialLot.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          material: true,
          parentLot: true,
          childLots: true,
          sublots: true,
          stateHistory: { take: 5, orderBy: { changedAt: 'desc' } },
        },
        orderBy: { receivedDate: 'desc' },
      });
    });
  });

  describe('getMaterialLotById', () => {
    it('should get material lot by ID with full relations', async () => {
      const mockLot = {
        id: '1',
        lotNumber: 'LOT-001',
        material: { id: 'mat-1', materialNumber: 'MAT-001' },
        parentLot: null,
        childLots: [],
        sublots: [],
        stateHistory: [],
        genealogyAsParent: [],
        genealogyAsChild: [],
      };
      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(mockLot as any);

      const result = await materialService.getMaterialLotById('1');

      expect(result).toEqual(mockLot);
      expect(mockPrisma.materialLot.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          material: {
            include: {
              materialClass: true,
              properties: true,
            },
          },
          parentLot: true,
          childLots: true,
          sublots: true,
          stateHistory: {
            orderBy: { changedAt: 'desc' },
            take: 10,
          },
          genealogyAsParent: {
            include: { childLot: true },
          },
          genealogyAsChild: {
            include: { parentLot: true },
          },
        },
      });
    });
  });

  describe('getMaterialLotByLotNumber', () => {
    it('should get material lot by lot number', async () => {
      const mockLot = {
        id: '1',
        lotNumber: 'LOT-001',
        material: { id: 'mat-1', materialNumber: 'MAT-001' },
      };
      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(mockLot as any);

      const result = await materialService.getMaterialLotByLotNumber('LOT-001');

      expect(result).toEqual(mockLot);
      expect(mockPrisma.materialLot.findUnique).toHaveBeenCalledWith({
        where: { lotNumber: 'LOT-001' },
        include: {
          material: true,
          sublots: true,
          stateHistory: {
            orderBy: { changedAt: 'desc' },
            take: 5,
          },
        },
      });
    });
  });

  describe('updateMaterialLot', () => {
    it('should update material lot', async () => {
      const mockUpdated = {
        id: '1',
        lotNumber: 'LOT-001',
        currentQuantity: 50,
      };
      vi.mocked(mockPrisma.materialLot.update).mockResolvedValue(mockUpdated as any);

      const result = await materialService.updateMaterialLot('1', { currentQuantity: 50 });

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.materialLot.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { currentQuantity: 50 },
        include: {
          material: true,
          stateHistory: { take: 5, orderBy: { changedAt: 'desc' } },
        },
      });
    });
  });

  describe('Expiration Tracking', () => {
    it('should get expiring lots within specified days', async () => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const mockLots = [
        {
          id: '1',
          lotNumber: 'LOT-001',
          status: MaterialLotStatus.AVAILABLE,
          expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        },
      ];
      vi.mocked(mockPrisma.materialLot.findMany).mockResolvedValue(mockLots as any);

      const result = await materialService.getExpiringLots(30);

      expect(result).toEqual(mockLots);
      expect(mockPrisma.materialLot.findMany).toHaveBeenCalled();
    });

    it('should get expired lots', async () => {
      const mockLots = [
        {
          id: '1',
          lotNumber: 'LOT-001',
          status: MaterialLotStatus.AVAILABLE,
          expirationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
      ];
      vi.mocked(mockPrisma.materialLot.findMany).mockResolvedValue(mockLots as any);

      const result = await materialService.getExpiredLots();

      expect(result).toEqual(mockLots);
      expect(mockPrisma.materialLot.findMany).toHaveBeenCalled();
    });

    it('should mark lot as expired with automatic state transition', async () => {
      const mockUpdated = {
        id: '1',
        lotNumber: 'LOT-001',
        status: MaterialLotStatus.EXPIRED,
        state: MaterialLotState.DISPOSED,
      };
      vi.mocked(mockPrisma.materialStateHistory.create).mockResolvedValue({} as any);
      vi.mocked(mockPrisma.materialLot.update).mockResolvedValue(mockUpdated as any);

      const result = await materialService.markLotAsExpired('1', 'Past expiration date');

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.materialStateHistory.create).toHaveBeenCalled();
      expect(mockPrisma.materialLot.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: MaterialLotStatus.EXPIRED,
          state: MaterialLotState.DISPOSED,
        },
      });
    });
  });

  describe('Material Lot Status and State', () => {
    it('should support all lot statuses', () => {
      const statuses = Object.values(MaterialLotStatus);
      expect(statuses).toContain(MaterialLotStatus.AVAILABLE);
      expect(statuses).toContain(MaterialLotStatus.RESERVED);
      expect(statuses).toContain(MaterialLotStatus.IN_USE);
      expect(statuses).toContain(MaterialLotStatus.DEPLETED);
      expect(statuses).toContain(MaterialLotStatus.QUARANTINED);
      expect(statuses).toContain(MaterialLotStatus.EXPIRED);
      expect(statuses).toContain(MaterialLotStatus.REJECTED);
      expect(statuses).toContain(MaterialLotStatus.SCRAPPED);
      expect(statuses).toHaveLength(9);
    });

    it('should support all lot states', () => {
      const states = Object.values(MaterialLotState);
      expect(states).toContain(MaterialLotState.RECEIVED);
      expect(states).toContain(MaterialLotState.INSPECTED);
      expect(states).toContain(MaterialLotState.APPROVED);
      expect(states).toContain(MaterialLotState.ISSUED);
      expect(states).toContain(MaterialLotState.IN_PROCESS);
      expect(states).toContain(MaterialLotState.CONSUMED);
      expect(states).toContain(MaterialLotState.RETURNED);
      expect(states).toContain(MaterialLotState.DISPOSED);
      expect(states).toHaveLength(8);
    });
  });

  // ==================== MATERIAL SUBLOTS (Split/Merge) ====================

  describe('splitMaterialLot', () => {
    it('should split material lot into sublot', async () => {
      const parentLot = {
        id: 'lot-1',
        lotNumber: 'LOT-001',
        currentQuantity: 100,
        unitOfMeasure: 'KG',
        location: 'A-01',
      };
      const mockSublot = {
        id: 'sublot-1',
        sublotNumber: 'SUB-001',
        parentLotId: 'lot-1',
        quantity: 25,
        unitOfMeasure: 'KG',
      };

      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(parentLot as any);
      vi.mocked(mockPrisma.materialSublot.create).mockResolvedValue(mockSublot as any);
      vi.mocked(mockPrisma.materialLot.update).mockResolvedValue({} as any);

      const result = await materialService.splitMaterialLot({
        parentLotId: 'lot-1',
        sublotNumber: 'SUB-001',
        quantity: 25,
      });

      expect(result).toEqual(mockSublot);
      expect(mockPrisma.materialSublot.create).toHaveBeenCalled();
      expect(mockPrisma.materialLot.update).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
        data: {
          currentQuantity: { decrement: 25 },
          isSplit: true,
        },
      });
    });

    it('should throw error if parent lot not found', async () => {
      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(null);

      await expect(
        materialService.splitMaterialLot({
          parentLotId: 'nonexistent',
          sublotNumber: 'SUB-001',
          quantity: 25,
        })
      ).rejects.toThrow('Parent lot nonexistent not found');
    });

    it('should throw error if insufficient quantity', async () => {
      const parentLot = {
        id: 'lot-1',
        lotNumber: 'LOT-001',
        currentQuantity: 10,
        unitOfMeasure: 'KG',
      };
      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(parentLot as any);

      await expect(
        materialService.splitMaterialLot({
          parentLotId: 'lot-1',
          sublotNumber: 'SUB-001',
          quantity: 25,
        })
      ).rejects.toThrow('Insufficient quantity');
    });

    it('should create sublot with work order assignment', async () => {
      const parentLot = {
        id: 'lot-1',
        lotNumber: 'LOT-001',
        currentQuantity: 100,
        unitOfMeasure: 'KG',
        location: 'A-01',
      };
      const mockSublot = {
        id: 'sublot-1',
        sublotNumber: 'SUB-001',
        workOrderId: 'wo-1',
        quantity: 25,
      };

      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(parentLot as any);
      vi.mocked(mockPrisma.materialSublot.create).mockResolvedValue(mockSublot as any);
      vi.mocked(mockPrisma.materialLot.update).mockResolvedValue({} as any);

      const result = await materialService.splitMaterialLot({
        parentLotId: 'lot-1',
        sublotNumber: 'SUB-001',
        quantity: 25,
        workOrderId: 'wo-1',
      });

      expect(result.workOrderId).toBe('wo-1');
    });

    it('should update parent lot quantity on split', async () => {
      const parentLot = {
        id: 'lot-1',
        currentQuantity: 100,
        unitOfMeasure: 'KG',
        location: 'A-01',
      };

      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(parentLot as any);
      vi.mocked(mockPrisma.materialSublot.create).mockResolvedValue({} as any);
      vi.mocked(mockPrisma.materialLot.update).mockResolvedValue({} as any);

      await materialService.splitMaterialLot({
        parentLotId: 'lot-1',
        sublotNumber: 'SUB-001',
        quantity: 30,
      });

      expect(mockPrisma.materialLot.update).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
        data: {
          currentQuantity: { decrement: 30 },
          isSplit: true,
        },
      });
    });
  });

  describe('getSublotsForLot', () => {
    it('should get sublots for a lot', async () => {
      const mockSublots = [
        { id: 'sub-1', sublotNumber: 'SUB-001', parentLotId: 'lot-1', quantity: 25 },
        { id: 'sub-2', sublotNumber: 'SUB-002', parentLotId: 'lot-1', quantity: 30 },
      ];
      vi.mocked(mockPrisma.materialSublot.findMany).mockResolvedValue(mockSublots as any);

      const result = await materialService.getSublotsForLot('lot-1');

      expect(result).toEqual(mockSublots);
      expect(mockPrisma.materialSublot.findMany).toHaveBeenCalledWith({
        where: { parentLotId: 'lot-1' },
        include: {
          parentLot: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ==================== MATERIAL LOT GENEALOGY ====================

  describe('createGenealogyRecord', () => {
    it('should create genealogy record', async () => {
      const mockGenealogy = {
        id: 'gen-1',
        parentLotId: 'lot-1',
        childLotId: 'lot-2',
        relationshipType: GenealogyRelationType.CONSUMED_BY,
        quantityConsumed: 10,
        quantityProduced: 50,
        unitOfMeasure: 'KG',
        workOrderId: 'wo-1',
      };
      vi.mocked(mockPrisma.materialLotGenealogy.create).mockResolvedValue(mockGenealogy as any);

      const result = await materialService.createGenealogyRecord({
        parentLotId: 'lot-1',
        childLotId: 'lot-2',
        relationshipType: GenealogyRelationType.CONSUMED_BY,
        quantityConsumed: 10,
        quantityProduced: 50,
        unitOfMeasure: 'KG',
        workOrderId: 'wo-1',
      });

      expect(result).toEqual(mockGenealogy);
      expect(mockPrisma.materialLotGenealogy.create).toHaveBeenCalled();
    });
  });

  describe('getLotGenealogy', () => {
    it('should get direct genealogy (parents and children)', async () => {
      const consumed = [
        {
          id: 'gen-1',
          parentLotId: 'lot-1',
          childLotId: 'lot-2',
          relationshipType: GenealogyRelationType.CONSUMED_BY,
        },
      ];
      const produced = [
        {
          id: 'gen-2',
          parentLotId: 'lot-0',
          childLotId: 'lot-1',
          relationshipType: GenealogyRelationType.PRODUCED_FROM,
        },
      ];

      vi.mocked(mockPrisma.materialLotGenealogy.findMany)
        .mockResolvedValueOnce(consumed as any)
        .mockResolvedValueOnce(produced as any);

      const result = await materialService.getLotGenealogy('lot-1');

      expect(result).toEqual({ consumed, produced });
    });
  });

  describe('getFullGenealogyTree', () => {
    it('should get forward genealogy tree (what was consumed)', async () => {
      const mockLot = { id: 'lot-1', lotNumber: 'LOT-001' };
      const mockGenealogy = {
        consumed: [
          {
            childLotId: 'lot-2',
            childLot: { id: 'lot-2', lotNumber: 'LOT-002' },
          },
        ],
        produced: [],
      };

      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(mockLot as any);
      vi.mocked(mockPrisma.materialLotGenealogy.findMany)
        .mockResolvedValueOnce(mockGenealogy.consumed as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any);

      const result = await materialService.getFullGenealogyTree('lot-1', 'forward');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get backward genealogy tree (what materials went into)', async () => {
      const mockLot = { id: 'lot-2', lotNumber: 'LOT-002' };
      const mockGenealogy = {
        consumed: [],
        produced: [
          {
            parentLotId: 'lot-1',
            parentLot: { id: 'lot-1', lotNumber: 'LOT-001' },
          },
        ],
      };

      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(mockLot as any);
      vi.mocked(mockPrisma.materialLotGenealogy.findMany)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce(mockGenealogy.produced as any)
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any);

      const result = await materialService.getFullGenealogyTree('lot-2', 'backward');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should prevent infinite loops with circular references', async () => {
      const mockLot = { id: 'lot-1', lotNumber: 'LOT-001' };

      // Mock a circular reference scenario
      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(mockLot as any);
      vi.mocked(mockPrisma.materialLotGenealogy.findMany)
        .mockResolvedValue([
          { childLotId: 'lot-1', childLot: mockLot }, // Circular reference
        ] as any);

      const result = await materialService.getFullGenealogyTree('lot-1', 'forward');

      // Should complete without infinite loop
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should limit genealogy tree depth to 10 levels', async () => {
      const mockLot = { id: 'lot-1', lotNumber: 'LOT-001' };

      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(mockLot as any);
      vi.mocked(mockPrisma.materialLotGenealogy.findMany)
        .mockResolvedValue([
          { childLotId: 'lot-next', childLot: { id: 'lot-next' } },
        ] as any);

      const result = await materialService.getFullGenealogyTree('lot-1', 'forward');

      // Should stop at depth 10
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Genealogy Relationship Types', () => {
    it('should support all genealogy relationship types', () => {
      const types = Object.values(GenealogyRelationType);
      expect(types).toContain(GenealogyRelationType.CONSUMED_BY);
      expect(types).toContain(GenealogyRelationType.PRODUCED_FROM);
      expect(types).toContain(GenealogyRelationType.REWORKED_TO);
      expect(types).toContain(GenealogyRelationType.BLENDED_WITH);
      expect(types).toContain(GenealogyRelationType.SPLIT_FROM);
      expect(types).toContain(GenealogyRelationType.MERGED_INTO);
      expect(types).toContain(GenealogyRelationType.TRANSFERRED_TO);
      expect(types).toHaveLength(7);
    });
  });

  // ==================== MATERIAL STATE HISTORY ====================

  describe('createStateTransition', () => {
    it('should create state transition record', async () => {
      const mockTransition = {
        id: 'trans-1',
        lotId: 'lot-1',
        previousState: MaterialLotState.RECEIVED,
        newState: MaterialLotState.APPROVED,
        previousStatus: MaterialLotStatus.AVAILABLE,
        newStatus: MaterialLotStatus.AVAILABLE,
        reason: 'Quality inspection passed',
        transitionType: StateTransitionType.MANUAL,
      };
      vi.mocked(mockPrisma.materialStateHistory.create).mockResolvedValue(mockTransition as any);

      const result = await materialService.createStateTransition({
        lotId: 'lot-1',
        previousState: MaterialLotState.RECEIVED,
        newState: MaterialLotState.APPROVED,
        previousStatus: MaterialLotStatus.AVAILABLE,
        newStatus: MaterialLotStatus.AVAILABLE,
        reason: 'Quality inspection passed',
        transitionType: StateTransitionType.MANUAL,
      });

      expect(result).toEqual(mockTransition);
      expect(mockPrisma.materialStateHistory.create).toHaveBeenCalled();
    });
  });

  describe('getStateHistory', () => {
    it('should get state history for a lot', async () => {
      const mockHistory = [
        {
          id: 'hist-1',
          lotId: 'lot-1',
          previousState: MaterialLotState.RECEIVED,
          newState: MaterialLotState.INSPECTED,
          changedAt: new Date(),
        },
        {
          id: 'hist-2',
          lotId: 'lot-1',
          previousState: MaterialLotState.INSPECTED,
          newState: MaterialLotState.APPROVED,
          changedAt: new Date(),
        },
      ];
      vi.mocked(mockPrisma.materialStateHistory.findMany).mockResolvedValue(mockHistory as any);

      const result = await materialService.getStateHistory('lot-1');

      expect(result).toEqual(mockHistory);
      expect(mockPrisma.materialStateHistory.findMany).toHaveBeenCalledWith({
        where: { lotId: 'lot-1' },
        orderBy: { changedAt: 'desc' },
      });
    });
  });

  describe('updateLotState', () => {
    it('should update lot state with automatic history tracking', async () => {
      const mockLot = {
        id: 'lot-1',
        lotNumber: 'LOT-001',
        state: MaterialLotState.RECEIVED,
        status: MaterialLotStatus.AVAILABLE,
        location: 'A-01',
      };
      const mockUpdated = {
        ...mockLot,
        state: MaterialLotState.APPROVED,
        status: MaterialLotStatus.AVAILABLE,
      };

      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(mockLot as any);
      vi.mocked(mockPrisma.materialStateHistory.create).mockResolvedValue({} as any);
      vi.mocked(mockPrisma.materialLot.update).mockResolvedValue(mockUpdated as any);

      const result = await materialService.updateLotState(
        'lot-1',
        MaterialLotState.APPROVED,
        MaterialLotStatus.AVAILABLE,
        { reason: 'Quality approved' }
      );

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.materialStateHistory.create).toHaveBeenCalled();
      expect(mockPrisma.materialLot.update).toHaveBeenCalled();
    });

    it('should throw error if lot not found', async () => {
      vi.mocked(mockPrisma.materialLot.findUnique).mockResolvedValue(null);

      await expect(
        materialService.updateLotState('nonexistent', MaterialLotState.APPROVED, MaterialLotStatus.AVAILABLE)
      ).rejects.toThrow('Lot nonexistent not found');
    });
  });

  describe('State Transition Types', () => {
    it('should support all state transition types', () => {
      const types = Object.values(StateTransitionType);
      expect(types).toContain(StateTransitionType.MANUAL);
      expect(types).toContain(StateTransitionType.AUTOMATIC);
      expect(types).toContain(StateTransitionType.SYSTEM);
      expect(types).toContain(StateTransitionType.SCHEDULED);
      expect(types).toContain(StateTransitionType.INTEGRATION);
      expect(types).toHaveLength(5);
    });
  });

  describe('State History Ordering', () => {
    it('should order state history by changedAt descending', async () => {
      const mockHistory = [
        { id: 'hist-2', changedAt: new Date('2025-10-18T12:00:00Z') },
        { id: 'hist-1', changedAt: new Date('2025-10-18T11:00:00Z') },
      ];
      vi.mocked(mockPrisma.materialStateHistory.findMany).mockResolvedValue(mockHistory as any);

      await materialService.getStateHistory('lot-1');

      expect(mockPrisma.materialStateHistory.findMany).toHaveBeenCalledWith({
        where: { lotId: 'lot-1' },
        orderBy: { changedAt: 'desc' },
      });
    });
  });

  // ==================== QUALITY MANAGEMENT ====================

  describe('quarantineLot', () => {
    it('should quarantine material lot', async () => {
      const mockQuarantined = {
        id: 'lot-1',
        lotNumber: 'LOT-001',
        status: MaterialLotStatus.QUARANTINED,
        isQuarantined: true,
        quarantineReason: 'Failed incoming inspection',
      };

      vi.mocked(mockPrisma.materialStateHistory.create).mockResolvedValue({} as any);
      vi.mocked(mockPrisma.materialLot.update).mockResolvedValue(mockQuarantined as any);

      const result = await materialService.quarantineLot('lot-1', 'Failed incoming inspection', 'user-1');

      expect(result).toEqual(mockQuarantined);
      expect(mockPrisma.materialStateHistory.create).toHaveBeenCalled();
      expect(mockPrisma.materialLot.update).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
        data: {
          status: MaterialLotStatus.QUARANTINED,
          isQuarantined: true,
          quarantineReason: 'Failed incoming inspection',
          quarantinedAt: expect.any(Date),
        },
      });
    });
  });

  describe('releaseFromQuarantine', () => {
    it('should release lot from quarantine', async () => {
      const mockReleased = {
        id: 'lot-1',
        lotNumber: 'LOT-001',
        status: MaterialLotStatus.AVAILABLE,
        state: MaterialLotState.APPROVED,
        isQuarantined: false,
        qualityStatus: QualityLotStatus.APPROVED,
      };

      vi.mocked(mockPrisma.materialStateHistory.create).mockResolvedValue({} as any);
      vi.mocked(mockPrisma.materialLot.update).mockResolvedValue(mockReleased as any);

      const result = await materialService.releaseFromQuarantine('lot-1', 'user-1');

      expect(result).toEqual(mockReleased);
      expect(mockPrisma.materialStateHistory.create).toHaveBeenCalled();
      expect(mockPrisma.materialLot.update).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
        data: {
          status: MaterialLotStatus.AVAILABLE,
          state: MaterialLotState.APPROVED,
          isQuarantined: false,
          qualityStatus: QualityLotStatus.APPROVED,
        },
      });
    });
  });

  describe('rejectLot', () => {
    it('should reject material lot', async () => {
      const mockRejected = {
        id: 'lot-1',
        lotNumber: 'LOT-001',
        status: MaterialLotStatus.REJECTED,
        state: MaterialLotState.DISPOSED,
        qualityStatus: QualityLotStatus.REJECTED,
      };

      vi.mocked(mockPrisma.materialStateHistory.create).mockResolvedValue({} as any);
      vi.mocked(mockPrisma.materialLot.update).mockResolvedValue(mockRejected as any);

      const result = await materialService.rejectLot('lot-1', 'Material defect found', 'user-1');

      expect(result).toEqual(mockRejected);
      expect(mockPrisma.materialStateHistory.create).toHaveBeenCalled();
      expect(mockPrisma.materialLot.update).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
        data: {
          status: MaterialLotStatus.REJECTED,
          state: MaterialLotState.DISPOSED,
          qualityStatus: QualityLotStatus.REJECTED,
        },
      });
    });
  });

  describe('Quality Lot Status', () => {
    it('should support all quality statuses', () => {
      const statuses = Object.values(QualityLotStatus);
      expect(statuses).toContain(QualityLotStatus.PENDING);
      expect(statuses).toContain(QualityLotStatus.IN_INSPECTION);
      expect(statuses).toContain(QualityLotStatus.APPROVED);
      expect(statuses).toContain(QualityLotStatus.REJECTED);
      expect(statuses).toContain(QualityLotStatus.CONDITIONAL);
      expect(statuses).toHaveLength(5);
    });
  });

  // ==================== REPORTING & ANALYTICS ====================

  describe('getMaterialLotStatistics', () => {
    it('should calculate material lot statistics', async () => {
      const mockLots = [
        {
          id: '1',
          lotNumber: 'LOT-001',
          status: MaterialLotStatus.AVAILABLE,
          currentQuantity: 50,
          totalCost: 500,
          receivedDate: new Date('2025-01-01'),
          expirationDate: new Date('2025-12-01'),
        },
        {
          id: '2',
          lotNumber: 'LOT-002',
          status: MaterialLotStatus.RESERVED,
          currentQuantity: 30,
          totalCost: 300,
          receivedDate: new Date('2025-02-01'),
          expirationDate: new Date('2025-11-01'),
        },
        {
          id: '3',
          lotNumber: 'LOT-003',
          status: MaterialLotStatus.EXPIRED,
          currentQuantity: 0,
          totalCost: 100,
          receivedDate: new Date('2024-01-01'),
          expirationDate: new Date('2024-12-01'),
        },
      ];
      vi.mocked(mockPrisma.materialLot.findMany).mockResolvedValue(mockLots as any);

      const result = await materialService.getMaterialLotStatistics('mat-1');

      expect(result.totalLots).toBe(3);
      expect(result.availableQuantity).toBe(50);
      expect(result.reservedQuantity).toBe(30);
      expect(result.expiredLots).toBe(1);
    });
  });

  describe('getMaterialUsageByWorkOrder', () => {
    it('should get material usage for work order', async () => {
      const mockSublots = [
        { id: 'sub-1', sublotNumber: 'SUB-001', workOrderId: 'wo-1', quantity: 25 },
      ];
      const mockGenealogy = [
        {
          id: 'gen-1',
          parentLotId: 'lot-1',
          childLotId: 'lot-2',
          workOrderId: 'wo-1',
          quantityConsumed: 10,
        },
      ];

      vi.mocked(mockPrisma.materialSublot.findMany).mockResolvedValue(mockSublots as any);
      vi.mocked(mockPrisma.materialLotGenealogy.findMany).mockResolvedValue(mockGenealogy as any);

      const result = await materialService.getMaterialUsageByWorkOrder('wo-1');

      expect(result.sublots).toEqual(mockSublots);
      expect(result.genealogy).toEqual(mockGenealogy);
      expect(result.totalMaterialsConsumed).toBe(1);
      expect(result.totalSublotsAllocated).toBe(1);
    });
  });

  describe('Material Usage Tracking', () => {
    it('should track sublots by work order', async () => {
      const mockSublots = [
        { id: 'sub-1', workOrderId: 'wo-1' },
        { id: 'sub-2', workOrderId: 'wo-1' },
      ];
      vi.mocked(mockPrisma.materialSublot.findMany).mockResolvedValue(mockSublots as any);
      vi.mocked(mockPrisma.materialLotGenealogy.findMany).mockResolvedValue([] as any);

      const result = await materialService.getMaterialUsageByWorkOrder('wo-1');

      expect(mockPrisma.materialSublot.findMany).toHaveBeenCalledWith({
        where: { workOrderId: 'wo-1' },
        include: {
          parentLot: {
            include: { material: true },
          },
        },
      });
      expect(result.totalSublotsAllocated).toBe(2);
    });
  });
});
