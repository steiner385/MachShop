import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import EquipmentService from '../../services/EquipmentService';

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    equipment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    equipmentCapability: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
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
    workUnit: {
      findUnique: vi.fn(),
    },
    enterprise: {
      findUnique: vi.fn(),
    },
  };

  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe('EquipmentService - ISA-95 Hierarchy & Capabilities', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getFullHierarchyPath - ISA-95 6-Level Hierarchy', () => {
    it('should return complete 6-level hierarchy path: Enterprise → Site → Area → WorkCenter → WorkUnit → Equipment', async () => {
      const mockEquipment = {
        id: 'eq-001',
        equipmentNumber: 'CNC-001',
        name: 'Haas CNC Mill',
        workUnitId: 'wu-001',
        workUnit: {
          id: 'wu-001',
          workUnitCode: 'WU-MILL',
          workUnitName: 'Milling Unit 1',
          workCenterId: 'wc-001',
          workCenter: {
            id: 'wc-001',
            workCenterCode: 'WC-MACH',
            workCenterName: 'Machining Center',
            areaId: 'area-001',
            area: {
              id: 'area-001',
              areaCode: 'AREA-PROD',
              areaName: 'Production Floor',
              siteId: 'site-001',
              site: {
                id: 'site-001',
                siteCode: 'SITE-CA',
                siteName: 'California Plant',
                enterpriseId: 'ent-001',
                enterprise: {
                  id: 'ent-001',
                  enterpriseCode: 'ENT-ACME',
                  enterpriseName: 'Acme Manufacturing',
                  headquarters: 'San Francisco, CA',
                },
              },
            },
          },
        },
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);

      const result = await EquipmentService.getFullHierarchyPath('eq-001');

      expect(result.enterprise).toBeDefined();
      expect(result.enterprise?.enterpriseCode).toBe('ENT-ACME');
      expect(result.site).toBeDefined();
      expect(result.site?.siteCode).toBe('SITE-CA');
      expect(result.area).toBeDefined();
      expect(result.area?.areaCode).toBe('AREA-PROD');
      expect(result.workCenter).toBeDefined();
      expect(result.workCenter?.workCenterCode).toBe('WC-MACH');
      expect(result.workUnit).toBeDefined();
      expect(result.workUnit?.workUnitCode).toBe('WU-MILL');
      expect(result.equipment).toBeDefined();
      expect(result.equipment.equipmentNumber).toBe('CNC-001');
    });

    it('should handle equipment with partial hierarchy (no enterprise)', async () => {
      const mockEquipment = {
        id: 'eq-002',
        equipmentNumber: 'CNC-002',
        name: 'Mazak Lathe',
        workUnitId: 'wu-002',
        workUnit: {
          id: 'wu-002',
          workUnitCode: 'WU-TURN',
          workCenterId: 'wc-002',
          workCenter: {
            id: 'wc-002',
            workCenterCode: 'WC-TURN',
            areaId: 'area-002',
            area: {
              id: 'area-002',
              areaCode: 'AREA-TURN',
              siteId: 'site-002',
              site: {
                id: 'site-002',
                siteCode: 'SITE-TX',
                enterpriseId: null, // No enterprise
                enterprise: null,
              },
            },
          },
        },
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);

      const result = await EquipmentService.getFullHierarchyPath('eq-002');

      expect(result.enterprise).toBeNull();
      expect(result.site).toBeDefined();
      expect(result.area).toBeDefined();
      expect(result.workCenter).toBeDefined();
      expect(result.workUnit).toBeDefined();
      expect(result.equipment).toBeDefined();
    });

    it('should handle equipment not assigned to work unit', async () => {
      const mockEquipment = {
        id: 'eq-003',
        equipmentNumber: 'CNC-003',
        name: 'Standalone Equipment',
        workUnitId: null,
        workUnit: null,
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);

      const result = await EquipmentService.getFullHierarchyPath('eq-003');

      expect(result.enterprise).toBeNull();
      expect(result.site).toBeNull();
      expect(result.area).toBeNull();
      expect(result.workCenter).toBeNull();
      expect(result.workUnit).toBeNull();
      expect(result.equipment).toBeDefined();
      expect(result.equipment.equipmentNumber).toBe('CNC-003');
    });

    it('should throw error for non-existent equipment', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(null);

      await expect(EquipmentService.getFullHierarchyPath('non-existent'))
        .rejects
        .toThrow('Equipment with ID non-existent not found');
    });

    it('should verify correct Prisma query with nested includes', async () => {
      const mockEquipment = {
        id: 'eq-001',
        workUnitId: 'wu-001',
        workUnit: {
          id: 'wu-001',
          workCenter: {
            id: 'wc-001',
            area: {
              id: 'area-001',
              site: {
                id: 'site-001',
                enterprise: {
                  id: 'ent-001',
                },
              },
            },
          },
        },
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);

      await EquipmentService.getFullHierarchyPath('eq-001');

      const findUniqueCall = mockPrisma.equipment.findUnique.mock.calls[0][0];
      expect(findUniqueCall.include.workUnit.include.workCenter.include.area.include.site.include.enterprise).toBe(true);
    });
  });

  describe('getEquipmentByLevel', () => {
    it('should retrieve equipment filtered by hierarchy level', async () => {
      const mockLevel2Equipment = [
        {
          id: 'eq-001',
          equipmentNumber: 'CNC-001',
          name: 'Haas CNC Mill',
          equipmentLevel: 2,
          workUnit: { workUnitName: 'Milling Unit 1' },
        },
        {
          id: 'eq-002',
          equipmentNumber: 'CNC-002',
          name: 'Mazak Lathe',
          equipmentLevel: 2,
          workUnit: { workUnitName: 'Turning Unit 1' },
        },
      ];

      mockPrisma.equipment.findMany.mockResolvedValue(mockLevel2Equipment);

      const result = await EquipmentService.getEquipmentByLevel(2);

      expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith({
        where: { equipmentLevel: 2 },
        include: {
          workUnit: true,
          workCenter: true,
          area: true,
          site: true,
        },
        orderBy: { equipmentNumber: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].equipmentLevel).toBe(2);
      expect(result[1].equipmentLevel).toBe(2);
    });

    it('should return empty array if no equipment at specified level', async () => {
      mockPrisma.equipment.findMany.mockResolvedValue([]);

      const result = await EquipmentService.getEquipmentByLevel(99);

      expect(result).toHaveLength(0);
    });
  });

  describe('addCapability - Equipment Capability Management', () => {
    it('should add capability to equipment successfully', async () => {
      const mockEquipment = {
        id: 'eq-001',
        equipmentNumber: 'CNC-001',
        name: 'Haas CNC Mill',
      };

      const mockCapability = {
        id: 'cap-001',
        equipmentId: 'eq-001',
        capabilityType: 'OPERATION',
        capability: 'CNC_MILLING',
        description: '5-axis CNC milling capability',
        parameters: {
          maxSpindleSpeed: 15000,
          axisCount: 5,
          toolPositions: 40,
        },
        certifiedDate: new Date('2025-01-15'),
        expiryDate: new Date('2026-01-15'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.equipmentCapability.create.mockResolvedValue(mockCapability);

      const result = await EquipmentService.addCapability({
        equipmentId: 'eq-001',
        capabilityType: 'OPERATION',
        capability: 'CNC_MILLING',
        description: '5-axis CNC milling capability',
        parameters: {
          maxSpindleSpeed: 15000,
          axisCount: 5,
          toolPositions: 40,
        },
        certifiedDate: new Date('2025-01-15'),
        expiryDate: new Date('2026-01-15'),
      });

      expect(mockPrisma.equipment.findUnique).toHaveBeenCalledWith({
        where: { id: 'eq-001' },
        include: expect.any(Object),
      });
      expect(mockPrisma.equipmentCapability.create).toHaveBeenCalled();
      expect(result.capability).toBe('CNC_MILLING');
      expect(result.capabilityType).toBe('OPERATION');
      expect(result.parameters).toHaveProperty('maxSpindleSpeed', 15000);
    });

    it('should support different capability types', async () => {
      const mockEquipment = { id: 'eq-001' };
      const capabilityTypes = [
        'OPERATION',
        'PROCESS',
        'QUALITY_CHECK',
        'STORAGE',
        'ASSEMBLY',
      ];

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);

      for (const capType of capabilityTypes) {
        mockPrisma.equipmentCapability.create.mockResolvedValue({
          id: `cap-${capType}`,
          equipmentId: 'eq-001',
          capabilityType: capType,
          capability: `TEST_${capType}`,
        });

        const result = await EquipmentService.addCapability({
          equipmentId: 'eq-001',
          capabilityType: capType,
          capability: `TEST_${capType}`,
        });

        expect(result.capabilityType).toBe(capType);
      }
    });

    it('should throw error if equipment does not exist', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(null);

      await expect(
        EquipmentService.addCapability({
          equipmentId: 'non-existent',
          capabilityType: 'OPERATION',
          capability: 'TEST',
        })
      ).rejects.toThrow('Equipment with ID non-existent not found');
    });

    it('should handle capabilities with complex parameters', async () => {
      const mockEquipment = { id: 'eq-001' };
      const complexParameters = {
        processes: ['drilling', 'boring', 'reaming'],
        tolerances: {
          positional: '±0.001',
          dimensional: '±0.0005',
        },
        materials: ['aluminum', 'steel', 'titanium'],
        certifications: ['AS9100', 'ISO 9001'],
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.equipmentCapability.create.mockResolvedValue({
        id: 'cap-001',
        equipmentId: 'eq-001',
        capabilityType: 'PROCESS',
        capability: 'PRECISION_MACHINING',
        parameters: complexParameters,
      });

      const result = await EquipmentService.addCapability({
        equipmentId: 'eq-001',
        capabilityType: 'PROCESS',
        capability: 'PRECISION_MACHINING',
        parameters: complexParameters,
      });

      expect(result.parameters).toEqual(complexParameters);
      expect(result.parameters.certifications).toContain('AS9100');
    });
  });

  describe('removeCapability', () => {
    it('should remove capability successfully', async () => {
      const mockCapability = {
        id: 'cap-001',
        equipmentId: 'eq-001',
        capabilityType: 'OPERATION',
        capability: 'CNC_MILLING',
      };

      mockPrisma.equipmentCapability.findUnique.mockResolvedValue(mockCapability);
      mockPrisma.equipmentCapability.delete.mockResolvedValue(mockCapability);

      await EquipmentService.removeCapability('cap-001');

      expect(mockPrisma.equipmentCapability.delete).toHaveBeenCalledWith({
        where: { id: 'cap-001' },
      });
    });

    it('should throw error if capability does not exist', async () => {
      mockPrisma.equipmentCapability.findUnique.mockResolvedValue(null);

      await expect(EquipmentService.removeCapability('non-existent'))
        .rejects
        .toThrow('Capability with ID non-existent not found');
    });
  });

  describe('getEquipmentCapabilities', () => {
    it('should retrieve all active capabilities for equipment', async () => {
      const mockCapabilities = [
        {
          id: 'cap-001',
          equipmentId: 'eq-001',
          capabilityType: 'OPERATION',
          capability: 'CNC_MILLING',
          isActive: true,
          createdAt: new Date('2025-01-15'),
        },
        {
          id: 'cap-002',
          equipmentId: 'eq-001',
          capabilityType: 'PROCESS',
          capability: '5_AXIS_MACHINING',
          isActive: true,
          createdAt: new Date('2025-01-10'),
        },
        {
          id: 'cap-003',
          equipmentId: 'eq-001',
          capabilityType: 'QUALITY_CHECK',
          capability: 'IN_PROCESS_MEASUREMENT',
          isActive: true,
          createdAt: new Date('2025-01-05'),
        },
      ];

      mockPrisma.equipmentCapability.findMany.mockResolvedValue(mockCapabilities);

      const result = await EquipmentService.getEquipmentCapabilities('eq-001');

      expect(mockPrisma.equipmentCapability.findMany).toHaveBeenCalledWith({
        where: {
          equipmentId: 'eq-001',
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(3);
      expect(result[0].createdAt).toEqual(new Date('2025-01-15')); // Most recent first
    });

    it('should return empty array if equipment has no capabilities', async () => {
      mockPrisma.equipmentCapability.findMany.mockResolvedValue([]);

      const result = await EquipmentService.getEquipmentCapabilities('eq-new');

      expect(result).toHaveLength(0);
    });

    it('should exclude inactive capabilities', async () => {
      const mockCapabilities = [
        {
          id: 'cap-001',
          equipmentId: 'eq-001',
          capability: 'ACTIVE_CAP',
          isActive: true,
        },
      ];

      mockPrisma.equipmentCapability.findMany.mockResolvedValue(mockCapabilities);

      const result = await EquipmentService.getEquipmentCapabilities('eq-001');

      const findManyCall = mockPrisma.equipmentCapability.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBe(true);
      expect(result.every((cap: any) => cap.isActive)).toBe(true);
    });
  });

  describe('getEquipmentByCapability', () => {
    it('should find equipment with specific capability', async () => {
      const mockCapabilities = [
        {
          id: 'cap-001',
          equipmentId: 'eq-001',
          capability: 'CNC_MILLING',
          equipment: {
            id: 'eq-001',
            equipmentNumber: 'CNC-001',
            name: 'Haas CNC Mill',
            workUnit: { workUnitName: 'Milling Unit 1' },
            workCenter: { workCenterName: 'Machining Center' },
            area: { areaName: 'Production Floor' },
            site: { siteName: 'California Plant' },
          },
        },
        {
          id: 'cap-002',
          equipmentId: 'eq-002',
          capability: 'CNC_MILLING',
          equipment: {
            id: 'eq-002',
            equipmentNumber: 'CNC-002',
            name: 'DMG MORI Mill',
            workUnit: { workUnitName: 'Milling Unit 2' },
            workCenter: { workCenterName: 'Machining Center' },
            area: { areaName: 'Production Floor' },
            site: { siteName: 'California Plant' },
          },
        },
      ];

      mockPrisma.equipmentCapability.findMany.mockResolvedValue(mockCapabilities);

      const result = await EquipmentService.getEquipmentByCapability('CNC_MILLING');

      expect(result).toHaveLength(2);
      expect(result[0].equipmentNumber).toBe('CNC-001');
      expect(result[1].equipmentNumber).toBe('CNC-002');
    });

    it('should filter by capability type', async () => {
      const mockCapabilities = [
        {
          id: 'cap-001',
          capability: 'PRECISION_GRINDING',
          capabilityType: 'PROCESS',
          equipment: {
            id: 'eq-001',
            equipmentNumber: 'GRIND-001',
          },
        },
      ];

      mockPrisma.equipmentCapability.findMany.mockResolvedValue(mockCapabilities);

      const result = await EquipmentService.getEquipmentByCapability('PRECISION_GRINDING', {
        capabilityType: 'PROCESS',
      });

      const findManyCall = mockPrisma.equipmentCapability.findMany.mock.calls[0][0];
      expect(findManyCall.where.capabilityType).toBe('PROCESS');
      expect(result).toHaveLength(1);
    });

    it('should use case-insensitive search', async () => {
      mockPrisma.equipmentCapability.findMany.mockResolvedValue([
        {
          id: 'cap-001',
          capability: 'CNC_MILLING',
          equipment: { id: 'eq-001', equipmentNumber: 'CNC-001' },
        },
      ]);

      await EquipmentService.getEquipmentByCapability('cnc_milling');

      const findManyCall = mockPrisma.equipmentCapability.findMany.mock.calls[0][0];
      expect(findManyCall.where.capability.mode).toBe('insensitive');
    });

    it('should remove duplicate equipment when same equipment has multiple matching capabilities', async () => {
      const mockCapabilities = [
        {
          id: 'cap-001',
          capability: 'CNC_MILLING',
          equipment: { id: 'eq-001', equipmentNumber: 'CNC-001', name: 'Mill 1' },
        },
        {
          id: 'cap-002',
          capability: 'CNC_MILLING_5AXIS',
          equipment: { id: 'eq-001', equipmentNumber: 'CNC-001', name: 'Mill 1' }, // Same equipment
        },
      ];

      mockPrisma.equipmentCapability.findMany.mockResolvedValue(mockCapabilities);

      const result = await EquipmentService.getEquipmentByCapability('MILLING');

      expect(result).toHaveLength(1); // Should deduplicate
      expect(result[0].id).toBe('eq-001');
    });

    it('should include inactive capabilities when requested', async () => {
      mockPrisma.equipmentCapability.findMany.mockResolvedValue([]);

      await EquipmentService.getEquipmentByCapability('TEST', {
        includeInactive: true,
      });

      const findManyCall = mockPrisma.equipmentCapability.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBeUndefined();
    });

    it('should exclude inactive capabilities by default', async () => {
      mockPrisma.equipmentCapability.findMany.mockResolvedValue([]);

      await EquipmentService.getEquipmentByCapability('TEST');

      const findManyCall = mockPrisma.equipmentCapability.findMany.mock.calls[0][0];
      expect(findManyCall.where.isActive).toBe(true);
    });
  });

  describe('updateCapability', () => {
    it('should update capability successfully', async () => {
      const mockExistingCapability = {
        id: 'cap-001',
        equipmentId: 'eq-001',
        capabilityType: 'OPERATION',
        capability: 'CNC_MILLING',
        description: 'Old description',
        isActive: true,
      };

      const mockUpdatedCapability = {
        ...mockExistingCapability,
        description: 'Updated description',
        parameters: { maxSpindleSpeed: 18000 },
      };

      mockPrisma.equipmentCapability.findUnique.mockResolvedValue(mockExistingCapability);
      mockPrisma.equipmentCapability.update.mockResolvedValue(mockUpdatedCapability);

      const result = await EquipmentService.updateCapability('cap-001', {
        description: 'Updated description',
        parameters: { maxSpindleSpeed: 18000 },
      });

      expect(mockPrisma.equipmentCapability.update).toHaveBeenCalledWith({
        where: { id: 'cap-001' },
        data: {
          description: 'Updated description',
          parameters: { maxSpindleSpeed: 18000 },
        },
      });
      expect(result.description).toBe('Updated description');
    });

    it('should update capability certification dates', async () => {
      const mockCapability = {
        id: 'cap-001',
        certifiedDate: new Date('2025-01-15'),
        expiryDate: new Date('2026-01-15'),
      };

      const newCertDate = new Date('2025-10-18');
      const newExpiryDate = new Date('2026-10-18');

      mockPrisma.equipmentCapability.findUnique.mockResolvedValue(mockCapability);
      mockPrisma.equipmentCapability.update.mockResolvedValue({
        ...mockCapability,
        certifiedDate: newCertDate,
        expiryDate: newExpiryDate,
      });

      const result = await EquipmentService.updateCapability('cap-001', {
        certifiedDate: newCertDate,
        expiryDate: newExpiryDate,
      });

      expect(result.certifiedDate).toEqual(newCertDate);
      expect(result.expiryDate).toEqual(newExpiryDate);
    });

    it('should deactivate capability', async () => {
      const mockCapability = {
        id: 'cap-001',
        isActive: true,
      };

      mockPrisma.equipmentCapability.findUnique.mockResolvedValue(mockCapability);
      mockPrisma.equipmentCapability.update.mockResolvedValue({
        ...mockCapability,
        isActive: false,
      });

      const result = await EquipmentService.updateCapability('cap-001', {
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });

    it('should throw error if capability does not exist', async () => {
      mockPrisma.equipmentCapability.findUnique.mockResolvedValue(null);

      await expect(
        EquipmentService.updateCapability('non-existent', {
          description: 'Test',
        })
      ).rejects.toThrow('Capability with ID non-existent not found');
    });
  });

  describe('ISA-95 Hierarchy Integration Tests', () => {
    it('should support complete enterprise-to-equipment traceability', async () => {
      // Full hierarchy path from Enterprise → Equipment
      const mockEquipment = {
        id: 'eq-001',
        equipmentNumber: 'CNC-001',
        name: 'Haas VF-4',
        workUnitId: 'wu-001',
        workUnit: {
          id: 'wu-001',
          workUnitCode: 'WU-MILL-01',
          workUnitName: 'Vertical Milling Unit 1',
          workCenterId: 'wc-001',
          workCenter: {
            id: 'wc-001',
            workCenterCode: 'WC-MACHINE',
            workCenterName: 'Machine Shop',
            areaId: 'area-001',
            area: {
              id: 'area-001',
              areaCode: 'AREA-PRODUCTION',
              areaName: 'Production Area',
              siteId: 'site-001',
              site: {
                id: 'site-001',
                siteCode: 'SITE-CA-SF',
                siteName: 'San Francisco Manufacturing Site',
                location: 'San Francisco, CA',
                enterpriseId: 'ent-001',
                enterprise: {
                  id: 'ent-001',
                  enterpriseCode: 'ACME-CORP',
                  enterpriseName: 'Acme Manufacturing Corporation',
                  headquarters: 'San Francisco, CA',
                  isActive: true,
                },
              },
            },
          },
        },
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);

      const hierarchy = await EquipmentService.getFullHierarchyPath('eq-001');

      // Verify 6-level hierarchy
      expect(hierarchy.enterprise?.enterpriseCode).toBe('ACME-CORP');
      expect(hierarchy.site?.siteCode).toBe('SITE-CA-SF');
      expect(hierarchy.area?.areaCode).toBe('AREA-PRODUCTION');
      expect(hierarchy.workCenter?.workCenterCode).toBe('WC-MACHINE');
      expect(hierarchy.workUnit?.workUnitCode).toBe('WU-MILL-01');
      expect(hierarchy.equipment.equipmentNumber).toBe('CNC-001');

      // Verify hierarchical relationships
      expect(hierarchy.workUnit?.workCenterId).toBe('wc-001');
      expect(hierarchy.workCenter?.areaId).toBe('area-001');
      expect(hierarchy.area?.siteId).toBe('site-001');
      expect(hierarchy.site?.enterpriseId).toBe('ent-001');
    });

    it('should retrieve equipment with multiple capabilities across hierarchy', async () => {
      const mockCapabilities = [
        {
          id: 'cap-001',
          capability: '3_AXIS_MACHINING',
          capabilityType: 'PROCESS',
          equipment: {
            id: 'eq-001',
            equipmentNumber: 'CNC-001',
            workUnit: { workUnitName: 'Milling Unit 1' },
            workCenter: { workCenterName: 'Machine Shop' },
            area: { areaName: 'Production' },
            site: { siteName: 'Site A' },
          },
        },
      ];

      mockPrisma.equipmentCapability.findMany.mockResolvedValue(mockCapabilities);

      const equipment = await EquipmentService.getEquipmentByCapability('3_AXIS_MACHINING', {
        capabilityType: 'PROCESS',
      });

      expect(equipment).toHaveLength(1);
      expect(equipment[0].workUnit).toBeDefined();
      expect(equipment[0].workCenter).toBeDefined();
      expect(equipment[0].area).toBeDefined();
      expect(equipment[0].site).toBeDefined();
    });
  });

  describe('Capability Parameter Validation', () => {
    it('should store and retrieve JSON capability parameters correctly', async () => {
      const mockEquipment = { id: 'eq-001' };
      const parameters = {
        toolTypes: ['endmill', 'drill', 'reamer'],
        maxWorkpieceSize: {
          length: 1000,
          width: 500,
          height: 500,
          unit: 'mm',
        },
        tolerances: {
          linear: '±0.01mm',
          angular: '±0.1°',
        },
        supportedMaterials: [
          { material: 'Aluminum', hardness: 'HB 150-200' },
          { material: 'Steel', hardness: 'HB 200-300' },
        ],
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.equipmentCapability.create.mockResolvedValue({
        id: 'cap-001',
        equipmentId: 'eq-001',
        capabilityType: 'PROCESS',
        capability: 'PRECISION_MACHINING',
        parameters,
      });

      const result = await EquipmentService.addCapability({
        equipmentId: 'eq-001',
        capabilityType: 'PROCESS',
        capability: 'PRECISION_MACHINING',
        parameters,
      });

      expect(result.parameters.toolTypes).toEqual(['endmill', 'drill', 'reamer']);
      expect(result.parameters.maxWorkpieceSize.length).toBe(1000);
      expect(result.parameters.supportedMaterials).toHaveLength(2);
    });
  });
});
