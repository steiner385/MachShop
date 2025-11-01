import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient, EquipmentClass, EquipmentState, EquipmentStatus, Equipment } from '@prisma/client';
import { EquipmentService, CreateEquipmentData, UpdateEquipmentData, EquipmentStateChange, EquipmentFilters, EquipmentWithRelations } from '../../services/EquipmentService';
import { ValidationError, NotFoundError, ConflictError } from '../../middleware/errorHandler';

// Mock Prisma Client
const mockPrisma = {
  equipment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  site: {
    findUnique: vi.fn(),
  },
  area: {
    findUnique: vi.fn(),
  },
  workCenter: {
    findUnique: vi.fn(),
  },
  equipmentStateHistory: {
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  equipmentCapability: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
} as unknown as PrismaClient;

// Mock the prisma instance in the service
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe('EquipmentService', () => {
  let service: EquipmentService;

  // Test data
  const mockEquipment: Equipment = {
    id: 'equipment-123',
    equipmentNumber: 'EQ-001',
    name: 'CNC Machine 01',
    description: 'High precision CNC machine',
    equipmentClass: EquipmentClass.PRODUCTION,
    equipmentType: 'CNC_MACHINE',
    equipmentLevel: 5,
    parentEquipmentId: null,
    manufacturer: 'Haas Automation',
    model: 'VF-2',
    serialNumber: 'SN123456789',
    installDate: new Date('2023-01-15'),
    commissionDate: new Date('2023-02-01'),
    siteId: 'site-123',
    areaId: 'area-123',
    workCenterId: 'workcenter-123',
    workUnitId: null,
    status: EquipmentStatus.OPERATIONAL,
    currentState: EquipmentState.RUNNING,
    stateChangedAt: new Date(),
    ratedCapacity: 100,
    currentCapacity: 85,
    utilizationRate: 85,
    availability: 95,
    performance: 90,
    quality: 98,
    oee: 83.835,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChildEquipment: Equipment = {
    ...mockEquipment,
    id: 'equipment-456',
    equipmentNumber: 'EQ-001-SPINDLE',
    name: 'Main Spindle',
    parentEquipmentId: 'equipment-123',
    equipmentLevel: 6,
  };

  const mockEquipmentWithRelations: EquipmentWithRelations = {
    ...mockEquipment,
    parentEquipment: null,
    childEquipment: [mockChildEquipment],
    site: { id: 'site-123', name: 'Main Plant' },
    area: { id: 'area-123', name: 'Machining Area' },
    workCenter: { id: 'workcenter-123', name: 'CNC Work Center' },
    stateHistory: [],
    performanceData: [],
  };

  const mockCreateData: CreateEquipmentData = {
    equipmentNumber: 'EQ-002',
    name: 'Lathe Machine 01',
    description: 'Precision lathe machine',
    equipmentClass: EquipmentClass.PRODUCTION,
    equipmentType: 'LATHE',
    manufacturer: 'Okuma',
    model: 'LB-3000',
    serialNumber: 'SN987654321',
    siteId: 'site-123',
    areaId: 'area-123',
    workCenterId: 'workcenter-123',
    status: EquipmentStatus.AVAILABLE,
  };

  const mockStateChange: EquipmentStateChange = {
    equipmentId: 'equipment-123',
    newState: EquipmentState.MAINTENANCE,
    reason: 'Scheduled maintenance',
    changedBy: 'user-123',
    workOrderId: 'wo-123',
  };

  const mockCapability = {
    id: 'capability-123',
    equipmentId: 'equipment-123',
    capabilityType: 'MACHINING',
    capability: 'TURNING',
    description: 'Precision turning operations',
    parameters: { maxDiameter: 200, maxLength: 300 },
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Instantiate service with mock Prisma client for each test
    service = new EquipmentService(mockPrisma);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize equipment service', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getAllEquipment', () => {
    it('should get all equipment without filters', async () => {
      const mockEquipmentList = [mockEquipment, mockChildEquipment];
      mockPrisma.equipment.findMany.mockResolvedValue(mockEquipmentList);
      mockPrisma.equipment.count.mockResolvedValue(2);

      const result = await service.getAllEquipment();

      expect(result).toEqual({
        equipment: mockEquipmentList,
        total: 2,
      });
      expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith({
        where: {},
        include: undefined,
        skip: undefined,
        take: undefined,
        orderBy: { equipmentNumber: 'asc' },
      });
    });

    it('should get equipment with filters', async () => {
      const filters: EquipmentFilters = {
        equipmentClass: EquipmentClass.PRODUCTION,
        status: EquipmentStatus.OPERATIONAL,
        siteId: 'site-123',
        search: 'CNC',
      };
      const filteredEquipment = [mockEquipment];
      mockPrisma.equipment.findMany.mockResolvedValue(filteredEquipment);
      mockPrisma.equipment.count.mockResolvedValue(1);

      const result = await service.getAllEquipment(filters);

      expect(result.equipment).toEqual(filteredEquipment);
      expect(result.total).toBe(1);
      expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith({
        where: {
          equipmentClass: EquipmentClass.PRODUCTION,
          status: EquipmentStatus.OPERATIONAL,
          siteId: 'site-123',
          OR: [
            { name: { contains: 'CNC', mode: 'insensitive' } },
            { equipmentNumber: { contains: 'CNC', mode: 'insensitive' } },
          ],
        },
        include: undefined,
        skip: undefined,
        take: undefined,
        orderBy: { equipmentNumber: 'asc' },
      });
    });

    it('should support pagination options', async () => {
      mockPrisma.equipment.findMany.mockResolvedValue([mockEquipment]);
      mockPrisma.equipment.count.mockResolvedValue(1);

      const options = { skip: 10, take: 5, includeRelations: true };
      await service.getAllEquipment(undefined, options);

      expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          parentEquipment: true,
          childEquipment: true,
          site: true,
          area: true,
          workCenter: true,
        },
        skip: 10,
        take: 5,
        orderBy: { equipmentNumber: 'asc' },
      });
    });

    it('should handle parent equipment filter correctly', async () => {
      const filters: EquipmentFilters = { parentEquipmentId: '' };
      mockPrisma.equipment.findMany.mockResolvedValue([]);
      mockPrisma.equipment.count.mockResolvedValue(0);

      await service.getAllEquipment(filters);

      expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith({
        where: { parentEquipmentId: null },
        include: undefined,
        skip: undefined,
        take: undefined,
        orderBy: { equipmentNumber: 'asc' },
      });
    });

    it('should handle multiple filter combinations', async () => {
      const complexFilters: EquipmentFilters = {
        equipmentClass: EquipmentClass.PRODUCTION,
        equipmentType: 'CNC_MACHINE',
        currentState: EquipmentState.RUNNING,
        areaId: 'area-123',
        workCenterId: 'workcenter-123',
      };
      mockPrisma.equipment.findMany.mockResolvedValue([]);
      mockPrisma.equipment.count.mockResolvedValue(0);

      await service.getAllEquipment(complexFilters);

      expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith({
        where: {
          equipmentClass: EquipmentClass.PRODUCTION,
          equipmentType: 'CNC_MACHINE',
          currentState: EquipmentState.RUNNING,
          areaId: 'area-123',
          workCenterId: 'workcenter-123',
        },
        include: undefined,
        skip: undefined,
        take: undefined,
        orderBy: { equipmentNumber: 'asc' },
      });
    });
  });

  describe('getEquipmentById', () => {
    it('should get equipment by valid ID', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);

      const result = await service.getEquipmentById('equipment-123');

      expect(result).toEqual(mockEquipmentWithRelations);
      expect(mockPrisma.equipment.findUnique).toHaveBeenCalledWith({
        where: { id: 'equipment-123' },
        include: {
          parentEquipment: true,
          childEquipment: true,
          site: true,
          area: true,
          workCenter: true,
          stateHistory: {
            orderBy: { stateStartTime: 'desc' },
            take: 10,
          },
          performanceData: {
            orderBy: { periodStart: 'desc' },
            take: 30,
          },
        },
      });
    });

    it('should validate equipment ID and throw error for invalid IDs', async () => {
      const invalidIds = ['', '   ', 'undefined', 'null', null, undefined];

      for (const invalidId of invalidIds) {
        await expect(service.getEquipmentById(invalidId as string)).rejects.toThrow(
          /Invalid equipment ID provided/
        );
      }
    });

    it('should trim whitespace from equipment ID', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);

      await service.getEquipmentById('  equipment-123  ');

      expect(mockPrisma.equipment.findUnique).toHaveBeenCalledWith({
        where: { id: 'equipment-123' },
        include: expect.any(Object),
      });
    });

    it('should return null when equipment not found', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(null);

      const result = await service.getEquipmentById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getEquipmentByNumber', () => {
    it('should get equipment by equipment number', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);

      const result = await service.getEquipmentByNumber('EQ-001');

      expect(result).toEqual(mockEquipment);
      expect(mockPrisma.equipment.findUnique).toHaveBeenCalledWith({
        where: { equipmentNumber: 'EQ-001' },
      });
    });

    it('should return null when equipment number not found', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(null);

      const result = await service.getEquipmentByNumber('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('createEquipment', () => {
    it('should create equipment with valid data', async () => {
      mockPrisma.equipment.findUnique
        .mockResolvedValueOnce(null) // Equipment number check
        .mockResolvedValueOnce(null); // Parent equipment check (if any)
      mockPrisma.site.findUnique.mockResolvedValue({ id: 'site-123' });
      mockPrisma.area.findUnique.mockResolvedValue({ id: 'area-123' });
      mockPrisma.workCenter.findUnique.mockResolvedValue({ id: 'workcenter-123' });
      mockPrisma.equipment.create.mockResolvedValue(mockEquipment);

      const result = await service.createEquipment(mockCreateData);

      expect(result).toEqual(mockEquipment);
      expect(mockPrisma.equipment.create).toHaveBeenCalledWith({
        data: {
          ...mockCreateData,
          currentState: EquipmentState.IDLE,
          equipmentLevel: 1,
        },
      });
    });

    it('should throw ConflictError for duplicate equipment number', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);

      await expect(service.createEquipment(mockCreateData)).rejects.toThrow(ConflictError);
    });

    it('should validate parent equipment exists', async () => {
      const dataWithParent = { ...mockCreateData, parentEquipmentId: 'parent-123' };
      mockPrisma.equipment.findUnique
        .mockResolvedValueOnce(null) // Equipment number check
        .mockResolvedValueOnce(null); // Parent equipment check - not found

      await expect(service.createEquipment(dataWithParent)).rejects.toThrow(NotFoundError);
    });

    it('should validate site exists', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(null);
      mockPrisma.site.findUnique.mockResolvedValue(null);

      await expect(service.createEquipment(mockCreateData)).rejects.toThrow(NotFoundError);
    });

    it('should validate area exists', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(null);
      mockPrisma.site.findUnique.mockResolvedValue({ id: 'site-123' });
      mockPrisma.area.findUnique.mockResolvedValue(null);

      await expect(service.createEquipment(mockCreateData)).rejects.toThrow(NotFoundError);
    });

    it('should validate work center exists', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(null);
      mockPrisma.site.findUnique.mockResolvedValue({ id: 'site-123' });
      mockPrisma.area.findUnique.mockResolvedValue({ id: 'area-123' });
      mockPrisma.workCenter.findUnique.mockResolvedValue(null);

      await expect(service.createEquipment(mockCreateData)).rejects.toThrow(NotFoundError);
    });

    it('should handle legacy field mapping', async () => {
      const legacyData = { ...mockCreateData, type: 'LEGACY_TYPE' } as any;
      delete legacyData.equipmentType;

      mockPrisma.equipment.findUnique.mockResolvedValue(null);
      mockPrisma.site.findUnique.mockResolvedValue({ id: 'site-123' });
      mockPrisma.area.findUnique.mockResolvedValue({ id: 'area-123' });
      mockPrisma.workCenter.findUnique.mockResolvedValue({ id: 'workcenter-123' });
      mockPrisma.equipment.create.mockResolvedValue(mockEquipment);

      await service.createEquipment(legacyData);

      expect(mockPrisma.equipment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          equipmentType: 'LEGACY_TYPE',
        }),
      });
    });

    it('should set default values for optional fields', async () => {
      const minimalData = {
        equipmentNumber: 'EQ-MINIMAL',
        name: 'Minimal Equipment',
        equipmentClass: EquipmentClass.PRODUCTION,
        status: EquipmentStatus.AVAILABLE,
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(null);
      mockPrisma.equipment.create.mockResolvedValue(mockEquipment);

      await service.createEquipment(minimalData);

      expect(mockPrisma.equipment.create).toHaveBeenCalledWith({
        data: {
          ...minimalData,
          currentState: EquipmentState.IDLE,
          equipmentLevel: 1,
        },
      });
    });
  });

  describe('updateEquipment', () => {
    it('should update equipment with valid data', async () => {
      const updateData: UpdateEquipmentData = {
        name: 'Updated CNC Machine',
        description: 'Updated description',
        utilizationRate: 90,
      };
      const updatedEquipment = { ...mockEquipment, ...updateData };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);
      mockPrisma.equipment.update.mockResolvedValue(updatedEquipment);

      const result = await service.updateEquipment('equipment-123', updateData);

      expect(result).toEqual(updatedEquipment);
      expect(mockPrisma.equipment.update).toHaveBeenCalledWith({
        where: { id: 'equipment-123' },
        data: updateData,
      });
    });

    it('should throw NotFoundError when equipment does not exist', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(null);

      await expect(service.updateEquipment('nonexistent', {})).rejects.toThrow(NotFoundError);
    });

    it('should prevent equipment from being its own parent', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);

      const updateData = { parentEquipmentId: 'equipment-123' };

      await expect(service.updateEquipment('equipment-123', updateData)).rejects.toThrow(
        ValidationError
      );
    });

    it('should validate parent equipment exists when changing parent', async () => {
      mockPrisma.equipment.findUnique
        .mockResolvedValueOnce(mockEquipmentWithRelations) // Current equipment
        .mockResolvedValueOnce(null); // Parent equipment - not found

      const updateData = { parentEquipmentId: 'new-parent-123' };

      await expect(service.updateEquipment('equipment-123', updateData)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should prevent circular references in hierarchy', async () => {
      const parentEquipment = { ...mockEquipment, id: 'parent-123' };
      mockPrisma.equipment.findUnique
        .mockResolvedValueOnce(mockEquipmentWithRelations) // Current equipment
        .mockResolvedValueOnce(parentEquipment); // Parent equipment

      // Mock the ancestors check to return current equipment as ancestor
      const mockAncestors = [mockEquipment];
      vi.spyOn(service, 'getEquipmentAncestors').mockResolvedValue(mockAncestors);

      const updateData = { parentEquipmentId: 'parent-123' };

      await expect(service.updateEquipment('equipment-123', updateData)).rejects.toThrow(
        ValidationError
      );
    });

    it('should allow setting parent to null', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);
      mockPrisma.equipment.update.mockResolvedValue({
        ...mockEquipment,
        parentEquipmentId: null,
      });

      const updateData = { parentEquipmentId: null };
      await service.updateEquipment('equipment-123', updateData);

      expect(mockPrisma.equipment.update).toHaveBeenCalledWith({
        where: { id: 'equipment-123' },
        data: updateData,
      });
    });
  });

  describe('deleteEquipment', () => {
    it('should delete equipment without children', async () => {
      const equipmentWithoutChildren = {
        ...mockEquipmentWithRelations,
        childEquipment: [],
      };
      mockPrisma.equipment.findUnique.mockResolvedValue(equipmentWithoutChildren);
      mockPrisma.equipment.delete.mockResolvedValue(mockEquipment);

      const result = await service.deleteEquipment('equipment-123');

      expect(result).toEqual(mockEquipment);
      expect(mockPrisma.equipment.delete).toHaveBeenCalledWith({
        where: { id: 'equipment-123' },
      });
    });

    it('should throw NotFoundError when equipment does not exist', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(null);

      await expect(service.deleteEquipment('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should prevent deletion of equipment with children', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);

      await expect(service.deleteEquipment('equipment-123')).rejects.toThrow(ValidationError);
    });
  });

  describe('Hierarchy Management', () => {
    describe('getEquipmentHierarchy', () => {
      it('should get equipment hierarchy', async () => {
        const descendants = [mockChildEquipment];
        mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);
        mockPrisma.equipment.findMany.mockResolvedValue(descendants);

        const result = await service.getEquipmentHierarchy('equipment-123');

        expect(result).toEqual(descendants);
      });

      it('should throw NotFoundError for nonexistent equipment', async () => {
        mockPrisma.equipment.findUnique.mockResolvedValue(null);

        await expect(service.getEquipmentHierarchy('nonexistent')).rejects.toThrow(NotFoundError);
      });
    });

    describe('getEquipmentAncestors', () => {
      it('should get equipment ancestors', async () => {
        const parentEquipment = {
          ...mockEquipment,
          id: 'parent-123',
          parentEquipmentId: null,
        };
        const childWithParent = {
          ...mockEquipmentWithRelations,
          parentEquipmentId: 'parent-123',
        };

        mockPrisma.equipment.findUnique
          .mockResolvedValueOnce(childWithParent)
          .mockResolvedValueOnce(parentEquipment);

        const result = await service.getEquipmentAncestors('equipment-123');

        expect(result).toEqual([parentEquipment]);
      });

      it('should return empty array for root equipment', async () => {
        mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);

        const result = await service.getEquipmentAncestors('equipment-123');

        expect(result).toEqual([]);
      });

      it('should throw NotFoundError for nonexistent equipment', async () => {
        mockPrisma.equipment.findUnique.mockResolvedValue(null);

        await expect(service.getEquipmentAncestors('nonexistent')).rejects.toThrow(NotFoundError);
      });
    });

    describe('getFullHierarchyPath', () => {
      it('should get full ISA-95 hierarchy path', async () => {
        const fullHierarchyEquipment = {
          ...mockEquipment,
          workUnit: {
            id: 'workunit-123',
            workCenter: {
              id: 'workcenter-123',
              area: {
                id: 'area-123',
                site: {
                  id: 'site-123',
                  enterprise: {
                    id: 'enterprise-123',
                    name: 'Manufacturing Corp',
                  },
                },
              },
            },
          },
        };

        mockPrisma.equipment.findUnique.mockResolvedValue(fullHierarchyEquipment);

        const result = await service.getFullHierarchyPath('equipment-123');

        expect(result).toEqual({
          enterprise: fullHierarchyEquipment.workUnit.workCenter.area.site.enterprise,
          site: fullHierarchyEquipment.workUnit.workCenter.area.site,
          area: fullHierarchyEquipment.workUnit.workCenter.area,
          workCenter: fullHierarchyEquipment.workUnit.workCenter,
          workUnit: fullHierarchyEquipment.workUnit,
          equipment: fullHierarchyEquipment,
        });
      });

      it('should handle partial hierarchy paths', async () => {
        const partialHierarchyEquipment = {
          ...mockEquipment,
          workUnit: null,
        };

        mockPrisma.equipment.findUnique.mockResolvedValue(partialHierarchyEquipment);

        const result = await service.getFullHierarchyPath('equipment-123');

        expect(result).toEqual({
          enterprise: null,
          site: null,
          area: null,
          workCenter: null,
          workUnit: null,
          equipment: partialHierarchyEquipment,
        });
      });
    });

    describe('getEquipmentByLevel', () => {
      it('should get equipment by hierarchy level', async () => {
        const level5Equipment = [mockEquipment, mockChildEquipment];
        mockPrisma.equipment.findMany.mockResolvedValue(level5Equipment);

        const result = await service.getEquipmentByLevel(5);

        expect(result).toEqual(level5Equipment);
        expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith({
          where: { equipmentLevel: 5 },
          include: {
            workUnit: true,
            workCenter: true,
            area: true,
            site: true,
          },
          orderBy: { equipmentNumber: 'asc' },
        });
      });
    });
  });

  describe('State Management', () => {
    describe('changeEquipmentState', () => {
      it('should change equipment state with history tracking', async () => {
        const updatedEquipment = {
          ...mockEquipment,
          currentState: EquipmentState.MAINTENANCE,
          status: EquipmentStatus.MAINTENANCE,
        };

        mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);
        mockPrisma.$transaction.mockImplementation(async (callback) => {
          return callback({
            equipmentStateHistory: {
              updateMany: vi.fn(),
              create: vi.fn(),
            },
            equipment: {
              update: vi.fn().mockResolvedValue(updatedEquipment),
            },
          });
        });

        const result = await service.changeEquipmentState(mockStateChange);

        expect(result).toEqual(updatedEquipment);
        expect(mockPrisma.$transaction).toHaveBeenCalled();
      });

      it('should validate equipment state enum values', async () => {
        const invalidStateChange = {
          ...mockStateChange,
          newState: 'INVALID_STATE' as EquipmentState,
        };

        await expect(service.changeEquipmentState(invalidStateChange)).rejects.toThrow(
          ValidationError
        );
      });

      it('should throw NotFoundError for nonexistent equipment', async () => {
        mockPrisma.equipment.findUnique.mockResolvedValue(null);

        await expect(service.changeEquipmentState(mockStateChange)).rejects.toThrow(NotFoundError);
      });

      it('should handle all valid equipment states', async () => {
        const validStates = Object.values(EquipmentState);
        mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);
        mockPrisma.$transaction.mockImplementation(async (callback) => {
          return callback({
            equipmentStateHistory: { updateMany: vi.fn(), create: vi.fn() },
            equipment: { update: vi.fn().mockResolvedValue(mockEquipment) },
          });
        });

        for (const state of validStates) {
          const stateChange = { ...mockStateChange, newState: state };
          await expect(service.changeEquipmentState(stateChange)).resolves.toBeDefined();
        }
      });
    });

    describe('getEquipmentStateHistory', () => {
      it('should get equipment state history', async () => {
        const mockHistory = [
          {
            id: 'history-123',
            equipmentId: 'equipment-123',
            previousState: EquipmentState.RUNNING,
            newState: EquipmentState.MAINTENANCE,
            stateStartTime: new Date(),
          },
        ];
        mockPrisma.equipmentStateHistory.findMany.mockResolvedValue(mockHistory);

        const result = await service.getEquipmentStateHistory('equipment-123');

        expect(result).toEqual(mockHistory);
        expect(mockPrisma.equipmentStateHistory.findMany).toHaveBeenCalledWith({
          where: { equipmentId: 'equipment-123' },
          orderBy: { stateStartTime: 'desc' },
          take: 100,
        });
      });

      it('should support date range filtering', async () => {
        const options = {
          from: new Date('2024-01-01'),
          to: new Date('2024-12-31'),
          limit: 50,
        };
        mockPrisma.equipmentStateHistory.findMany.mockResolvedValue([]);

        await service.getEquipmentStateHistory('equipment-123', options);

        expect(mockPrisma.equipmentStateHistory.findMany).toHaveBeenCalledWith({
          where: {
            equipmentId: 'equipment-123',
            stateStartTime: {
              gte: options.from,
              lte: options.to,
            },
          },
          orderBy: { stateStartTime: 'desc' },
          take: 50,
        });
      });
    });
  });

  describe('Capability Management', () => {
    describe('addCapability', () => {
      it('should add capability to equipment', async () => {
        const capabilityData = {
          equipmentId: 'equipment-123',
          capabilityType: 'MACHINING',
          capability: 'TURNING',
          description: 'Precision turning operations',
          parameters: { maxDiameter: 200 },
        };

        mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);
        mockPrisma.equipmentCapability.create.mockResolvedValue(mockCapability);

        const result = await service.addCapability(capabilityData);

        expect(result).toEqual(mockCapability);
        expect(mockPrisma.equipmentCapability.create).toHaveBeenCalledWith({
          data: capabilityData,
        });
      });

      it('should throw NotFoundError for nonexistent equipment', async () => {
        mockPrisma.equipment.findUnique.mockResolvedValue(null);

        const capabilityData = {
          equipmentId: 'nonexistent',
          capabilityType: 'MACHINING',
          capability: 'TURNING',
        };

        await expect(service.addCapability(capabilityData)).rejects.toThrow(NotFoundError);
      });
    });

    describe('removeCapability', () => {
      it('should remove capability from equipment', async () => {
        mockPrisma.equipmentCapability.findUnique.mockResolvedValue(mockCapability);
        mockPrisma.equipmentCapability.delete.mockResolvedValue(mockCapability);

        const result = await service.removeCapability('capability-123');

        expect(result).toEqual(mockCapability);
        expect(mockPrisma.equipmentCapability.delete).toHaveBeenCalledWith({
          where: { id: 'capability-123' },
        });
      });

      it('should throw NotFoundError for nonexistent capability', async () => {
        mockPrisma.equipmentCapability.findUnique.mockResolvedValue(null);

        await expect(service.removeCapability('nonexistent')).rejects.toThrow(NotFoundError);
      });
    });

    describe('getEquipmentCapabilities', () => {
      it('should get capabilities for equipment', async () => {
        const capabilities = [mockCapability];
        mockPrisma.equipmentCapability.findMany.mockResolvedValue(capabilities);

        const result = await service.getEquipmentCapabilities('equipment-123');

        expect(result).toEqual(capabilities);
        expect(mockPrisma.equipmentCapability.findMany).toHaveBeenCalledWith({
          where: {
            equipmentId: 'equipment-123',
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      });
    });

    describe('getEquipmentByCapability', () => {
      it('should get equipment by capability', async () => {
        const capabilitiesWithEquipment = [
          {
            ...mockCapability,
            equipment: mockEquipmentWithRelations,
          },
        ];
        mockPrisma.equipmentCapability.findMany.mockResolvedValue(capabilitiesWithEquipment);

        const result = await service.getEquipmentByCapability('TURNING');

        expect(result).toEqual([mockEquipmentWithRelations]);
        expect(mockPrisma.equipmentCapability.findMany).toHaveBeenCalledWith({
          where: {
            capability: { contains: 'TURNING', mode: 'insensitive' },
            isActive: true,
          },
          include: {
            equipment: {
              include: {
                workUnit: true,
                workCenter: true,
                area: true,
                site: true,
              },
            },
          },
        });
      });

      it('should support capability type filtering', async () => {
        mockPrisma.equipmentCapability.findMany.mockResolvedValue([]);

        const options = { capabilityType: 'MACHINING', includeInactive: true };
        await service.getEquipmentByCapability('TURNING', options);

        expect(mockPrisma.equipmentCapability.findMany).toHaveBeenCalledWith({
          where: {
            capability: { contains: 'TURNING', mode: 'insensitive' },
            capabilityType: 'MACHINING',
            isActive: undefined,
          },
          include: expect.any(Object),
        });
      });

      it('should deduplicate equipment in results', async () => {
        const duplicateCapabilities = [
          { ...mockCapability, id: 'cap-1', equipment: mockEquipmentWithRelations },
          { ...mockCapability, id: 'cap-2', equipment: mockEquipmentWithRelations },
        ];
        mockPrisma.equipmentCapability.findMany.mockResolvedValue(duplicateCapabilities);

        const result = await service.getEquipmentByCapability('TURNING');

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockEquipmentWithRelations);
      });
    });

    describe('updateCapability', () => {
      it('should update capability', async () => {
        const updateData = {
          description: 'Updated description',
          parameters: { maxDiameter: 250 },
        };
        const updatedCapability = { ...mockCapability, ...updateData };

        mockPrisma.equipmentCapability.findUnique.mockResolvedValue(mockCapability);
        mockPrisma.equipmentCapability.update.mockResolvedValue(updatedCapability);

        const result = await service.updateCapability('capability-123', updateData);

        expect(result).toEqual(updatedCapability);
        expect(mockPrisma.equipmentCapability.update).toHaveBeenCalledWith({
          where: { id: 'capability-123' },
          data: updateData,
        });
      });

      it('should throw NotFoundError for nonexistent capability', async () => {
        mockPrisma.equipmentCapability.findUnique.mockResolvedValue(null);

        await expect(service.updateCapability('nonexistent', {})).rejects.toThrow(NotFoundError);
      });
    });
  });

  describe('Manufacturing Scenarios', () => {
    it('should handle automotive production line equipment', async () => {
      const automotiveEquipment = {
        ...mockCreateData,
        equipmentNumber: 'AUTO-LINE-01',
        name: 'Welding Robot Station 1',
        equipmentClass: EquipmentClass.PRODUCTION,
        equipmentType: 'WELDING_ROBOT',
        manufacturer: 'KUKA',
        model: 'KR 210 R3100',
        ratedCapacity: 50,
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(null);
      mockPrisma.site.findUnique.mockResolvedValue({ id: 'site-123' });
      mockPrisma.area.findUnique.mockResolvedValue({ id: 'area-123' });
      mockPrisma.workCenter.findUnique.mockResolvedValue({ id: 'workcenter-123' });
      mockPrisma.equipment.create.mockResolvedValue({
        ...mockEquipment,
        ...automotiveEquipment,
      });

      const result = await service.createEquipment(automotiveEquipment);

      expect(result.equipmentType).toBe('WELDING_ROBOT');
      expect(result.manufacturer).toBe('KUKA');
    });

    it('should handle aerospace manufacturing cell hierarchy', async () => {
      const aerospaceHierarchy = [
        {
          ...mockEquipment,
          equipmentNumber: 'AERO-CELL-01',
          name: 'Aerospace Manufacturing Cell',
          equipmentLevel: 3,
          parentEquipmentId: null,
        },
        {
          ...mockEquipment,
          equipmentNumber: 'AERO-CNC-01',
          name: '5-Axis CNC Machine',
          equipmentLevel: 4,
          parentEquipmentId: 'aero-cell-01',
        },
        {
          ...mockEquipment,
          equipmentNumber: 'AERO-CMM-01',
          name: 'Coordinate Measuring Machine',
          equipmentLevel: 4,
          parentEquipmentId: 'aero-cell-01',
        },
      ];

      mockPrisma.equipment.findMany.mockResolvedValue(aerospaceHierarchy);

      const result = await service.getEquipmentByLevel(4);

      expect(result).toHaveLength(3);
      expect(result.filter(eq => eq.equipmentLevel === 4)).toHaveLength(2);
    });

    it('should handle pharmaceutical cleanroom equipment states', async () => {
      const pharmaStates = [
        EquipmentState.RUNNING,
        EquipmentState.SETUP,
        EquipmentState.MAINTENANCE,
        EquipmentState.IDLE,
      ];

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          equipmentStateHistory: { updateMany: vi.fn(), create: vi.fn() },
          equipment: { update: vi.fn().mockResolvedValue(mockEquipment) },
        });
      });

      for (const state of pharmaStates) {
        const stateChange = {
          equipmentId: 'pharma-equipment-123',
          newState: state,
          reason: `Pharmaceutical compliance state change to ${state}`,
          changedBy: 'cleanroom-operator',
        };

        const result = await service.changeEquipmentState(stateChange);
        expect(result).toBeDefined();
      }
    });

    it('should handle semiconductor fab equipment capabilities', async () => {
      const semiFabCapabilities = [
        {
          capabilityType: 'LITHOGRAPHY',
          capability: 'EUV_EXPOSURE',
          description: 'Extreme ultraviolet lithography',
          parameters: { wavelength: '13.5nm', resolution: '7nm' },
        },
        {
          capabilityType: 'ETCHING',
          capability: 'PLASMA_ETCH',
          description: 'Plasma etching process',
          parameters: { chemistry: 'CF4/O2', selectivity: '>100:1' },
        },
        {
          capabilityType: 'DEPOSITION',
          capability: 'CVD',
          description: 'Chemical vapor deposition',
          parameters: { temperature: '400C', pressure: '1Torr' },
        },
      ];

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);

      for (const capData of semiFabCapabilities) {
        mockPrisma.equipmentCapability.create.mockResolvedValue({
          ...mockCapability,
          ...capData,
        });

        const result = await service.addCapability({
          equipmentId: 'semiconductor-fab-tool',
          ...capData,
        });

        expect(result.capabilityType).toBe(capData.capabilityType);
        expect(result.parameters).toEqual(capData.parameters);
      }
    });

    it('should handle food processing equipment sanitation states', async () => {
      const sanitationStates = [
        { state: EquipmentState.MAINTENANCE, reason: 'CIP (Clean-in-Place) cycle' },
        { state: EquipmentState.SETUP, reason: 'SIP (Sterilize-in-Place) cycle' },
        { state: EquipmentState.RUNNING, reason: 'Production run - validated' },
        { state: EquipmentState.IDLE, reason: 'Awaiting batch release' },
      ];

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          equipmentStateHistory: { updateMany: vi.fn(), create: vi.fn() },
          equipment: { update: vi.fn().mockResolvedValue(mockEquipment) },
        });
      });

      for (const { state, reason } of sanitationStates) {
        const stateChange = {
          equipmentId: 'food-processing-line',
          newState: state,
          reason,
          changedBy: 'sanitation-technician',
        };

        const result = await service.changeEquipmentState(stateChange);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      mockPrisma.equipment.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getAllEquipment()).rejects.toThrow('Database connection failed');
    });

    it('should handle concurrent state changes', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction conflict'));

      await expect(service.changeEquipmentState(mockStateChange)).rejects.toThrow(
        'Transaction conflict'
      );
    });

    it('should handle very deep equipment hierarchies', async () => {
      const deepHierarchy = Array.from({ length: 100 }, (_, i) => ({
        ...mockEquipment,
        id: `equipment-${i}`,
        equipmentNumber: `EQ-${i.toString().padStart(3, '0')}`,
        parentEquipmentId: i > 0 ? `equipment-${i - 1}` : null,
        equipmentLevel: i + 1,
      }));

      mockPrisma.equipment.findUnique.mockResolvedValue(deepHierarchy[0]);
      mockPrisma.equipment.findMany.mockResolvedValue(deepHierarchy.slice(1));

      const result = await service.getEquipmentHierarchy('equipment-0');

      expect(result).toHaveLength(99);
    });

    it('should handle empty search results', async () => {
      mockPrisma.equipment.findMany.mockResolvedValue([]);
      mockPrisma.equipment.count.mockResolvedValue(0);

      const result = await service.getAllEquipment({ search: 'NONEXISTENT' });

      expect(result.equipment).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle malformed equipment data', async () => {
      const malformedData = {
        equipmentNumber: '',
        name: '',
        equipmentClass: 'INVALID' as EquipmentClass,
        status: 'INVALID' as EquipmentStatus,
      } as CreateEquipmentData;

      // Should fail due to validation in the database or service layer
      mockPrisma.equipment.findUnique.mockResolvedValue(null);
      mockPrisma.equipment.create.mockRejectedValue(new Error('Validation failed'));

      await expect(service.createEquipment(malformedData)).rejects.toThrow('Validation failed');
    });

    it('should handle equipment with circular parent-child relationships detection', async () => {
      // Create a mock scenario where A -> B -> C and trying to make C -> A
      const equipmentA = { ...mockEquipment, id: 'eq-a' };
      const equipmentB = { ...mockEquipment, id: 'eq-b', parentEquipmentId: 'eq-a' };
      const equipmentC = { ...mockEquipment, id: 'eq-c', parentEquipmentId: 'eq-b' };

      mockPrisma.equipment.findUnique
        .mockResolvedValueOnce({ ...equipmentC, childEquipment: [] }) // Current equipment
        .mockResolvedValueOnce(equipmentA); // Proposed parent

      // Mock ancestors chain: C -> B -> A
      vi.spyOn(service, 'getEquipmentAncestors').mockResolvedValue([equipmentB, equipmentA]);

      const updateData = { parentEquipmentId: 'eq-a' };

      await expect(service.updateEquipment('eq-c', updateData)).rejects.toThrow(ValidationError);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large equipment datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        ...mockEquipment,
        id: `equipment-${i}`,
        equipmentNumber: `EQ-${i.toString().padStart(5, '0')}`,
      }));

      mockPrisma.equipment.findMany.mockResolvedValue(largeDataset);
      mockPrisma.equipment.count.mockResolvedValue(10000);

      const result = await service.getAllEquipment();

      expect(result.equipment).toHaveLength(10000);
      expect(result.total).toBe(10000);
    });

    it('should optimize queries with proper pagination', async () => {
      mockPrisma.equipment.findMany.mockResolvedValue([]);
      mockPrisma.equipment.count.mockResolvedValue(0);

      const options = { skip: 1000, take: 100 };
      await service.getAllEquipment(undefined, options);

      expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith({
        where: {},
        include: undefined,
        skip: 1000,
        take: 100,
        orderBy: { equipmentNumber: 'asc' },
      });
    });

    it('should handle concurrent capability operations', async () => {
      const concurrentCapabilities = Array.from({ length: 50 }, (_, i) => ({
        equipmentId: `equipment-${i}`,
        capabilityType: 'CONCURRENT',
        capability: `CAPABILITY-${i}`,
      }));

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipmentWithRelations);
      mockPrisma.equipmentCapability.create.mockResolvedValue(mockCapability);

      const promises = concurrentCapabilities.map(cap => service.addCapability(cap));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      expect(results.every(result => result.id === mockCapability.id)).toBe(true);
    });
  });
});