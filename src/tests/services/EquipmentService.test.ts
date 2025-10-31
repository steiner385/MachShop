// GitHub Issue #94: Equipment Registry & Maintenance Management System
// EquipmentService Unit Tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EquipmentService } from '@/services/EquipmentService';
import { CriticalityLevel, MaintenanceStatus, Priority } from '@prisma/client';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  default: {
    equipment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    equipmentType: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    maintenanceWorkOrder: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    downtimeEvent: {
      findMany: vi.fn(),
    },
  },
}));

describe('EquipmentService', () => {
  let equipmentService: EquipmentService;

  beforeEach(() => {
    equipmentService = new EquipmentService();
    vi.clearAllMocks();
  });

  describe('validateEquipmentData', () => {
    it('should pass validation for valid equipment data', () => {
      const validData = {
        name: 'CNC Machine 001',
        manufacturer: 'Haas Automation',
        model: 'VF-2',
        serialNumber: 'SN123456',
        assetTag: 'AT-001',
        siteId: 'site-123',
        equipmentTypeId: 'type-456',
        criticality: CriticalityLevel.HIGH,
        isActive: true,
      };

      expect(() => equipmentService.validateEquipmentData(validData)).not.toThrow();
    });

    it('should reject empty equipment name', () => {
      const invalidData = {
        name: '',
        manufacturer: 'Haas Automation',
        model: 'VF-2',
        serialNumber: 'SN123456',
        siteId: 'site-123',
      };

      expect(() => equipmentService.validateEquipmentData(invalidData))
        .toThrow('Equipment name is required');
    });

    it('should reject whitespace-only equipment name', () => {
      const invalidData = {
        name: '   ',
        manufacturer: 'Haas Automation',
        model: 'VF-2',
        serialNumber: 'SN123456',
        siteId: 'site-123',
      };

      expect(() => equipmentService.validateEquipmentData(invalidData))
        .toThrow('Equipment name is required');
    });

    it('should reject equipment name exceeding 255 characters', () => {
      const invalidData = {
        name: 'A'.repeat(256),
        manufacturer: 'Haas Automation',
        model: 'VF-2',
        serialNumber: 'SN123456',
        siteId: 'site-123',
      };

      expect(() => equipmentService.validateEquipmentData(invalidData))
        .toThrow('Equipment name cannot exceed 255 characters');
    });

    it('should reject empty manufacturer', () => {
      const invalidData = {
        name: 'CNC Machine 001',
        manufacturer: '',
        model: 'VF-2',
        serialNumber: 'SN123456',
        siteId: 'site-123',
      };

      expect(() => equipmentService.validateEquipmentData(invalidData))
        .toThrow('Manufacturer is required');
    });

    it('should reject negative maintenance interval', () => {
      const invalidData = {
        name: 'CNC Machine 001',
        manufacturer: 'Haas Automation',
        model: 'VF-2',
        serialNumber: 'SN123456',
        siteId: 'site-123',
        maintenanceInterval: -30,
      };

      expect(() => equipmentService.validateEquipmentData(invalidData))
        .toThrow('Maintenance interval must be positive');
    });

    it('should reject zero maintenance interval', () => {
      const invalidData = {
        name: 'CNC Machine 001',
        manufacturer: 'Haas Automation',
        model: 'VF-2',
        serialNumber: 'SN123456',
        siteId: 'site-123',
        maintenanceInterval: 0,
      };

      expect(() => equipmentService.validateEquipmentData(invalidData))
        .toThrow('Maintenance interval must be positive');
    });

    it('should accept valid maintenance interval', () => {
      const validData = {
        name: 'CNC Machine 001',
        manufacturer: 'Haas Automation',
        model: 'VF-2',
        serialNumber: 'SN123456',
        siteId: 'site-123',
        maintenanceInterval: 90,
      };

      expect(() => equipmentService.validateEquipmentData(validData)).not.toThrow();
    });
  });

  describe('generateAssetTag', () => {
    it('should generate asset tag with correct format', () => {
      const assetTag = equipmentService.generateAssetTag();
      expect(assetTag).toMatch(/^EQ-\d{8}$/);
    });

    it('should generate unique asset tags', () => {
      const tag1 = equipmentService.generateAssetTag();
      const tag2 = equipmentService.generateAssetTag();
      expect(tag1).not.toBe(tag2);
    });

    it('should generate asset tags with proper length', () => {
      const assetTag = equipmentService.generateAssetTag();
      expect(assetTag.length).toBe(11); // EQ- + 8 digits
    });
  });

  describe('calculateNextMaintenanceDate', () => {
    it('should calculate next maintenance date correctly', () => {
      const lastMaintenanceDate = new Date('2024-01-01');
      const maintenanceInterval = 90; // days

      const nextDate = equipmentService.calculateNextMaintenanceDate(
        lastMaintenanceDate,
        maintenanceInterval
      );

      const expectedDate = new Date('2024-04-01'); // 90 days later
      expect(nextDate.getTime()).toBe(expectedDate.getTime());
    });

    it('should handle leap year calculations', () => {
      const lastMaintenanceDate = new Date('2024-02-01'); // Leap year
      const maintenanceInterval = 60; // days

      const nextDate = equipmentService.calculateNextMaintenanceDate(
        lastMaintenanceDate,
        maintenanceInterval
      );

      const expectedDate = new Date('2024-04-01'); // 60 days later (considering leap year)
      expect(nextDate.getTime()).toBe(expectedDate.getTime());
    });

    it('should handle year boundary calculations', () => {
      const lastMaintenanceDate = new Date('2023-12-01');
      const maintenanceInterval = 60; // days

      const nextDate = equipmentService.calculateNextMaintenanceDate(
        lastMaintenanceDate,
        maintenanceInterval
      );

      const expectedDate = new Date('2024-01-30'); // 60 days later, crossing year boundary
      expect(nextDate.getTime()).toBe(expectedDate.getTime());
    });

    it('should handle zero interval', () => {
      const lastMaintenanceDate = new Date('2024-01-01');
      const maintenanceInterval = 0;

      const nextDate = equipmentService.calculateNextMaintenanceDate(
        lastMaintenanceDate,
        maintenanceInterval
      );

      expect(nextDate.getTime()).toBe(lastMaintenanceDate.getTime());
    });
  });

  describe('calculateMTBF', () => {
    it('should calculate MTBF correctly with multiple failures', () => {
      const totalRunTime = 1000; // hours
      const numberOfFailures = 5;

      const mtbf = equipmentService.calculateMTBF(totalRunTime, numberOfFailures);
      expect(mtbf).toBe(200); // 1000 / 5
    });

    it('should return null for zero failures', () => {
      const totalRunTime = 1000; // hours
      const numberOfFailures = 0;

      const mtbf = equipmentService.calculateMTBF(totalRunTime, numberOfFailures);
      expect(mtbf).toBeNull();
    });

    it('should return null for zero runtime', () => {
      const totalRunTime = 0;
      const numberOfFailures = 5;

      const mtbf = equipmentService.calculateMTBF(totalRunTime, numberOfFailures);
      expect(mtbf).toBeNull();
    });

    it('should handle single failure', () => {
      const totalRunTime = 500; // hours
      const numberOfFailures = 1;

      const mtbf = equipmentService.calculateMTBF(totalRunTime, numberOfFailures);
      expect(mtbf).toBe(500);
    });

    it('should handle fractional results', () => {
      const totalRunTime = 1000; // hours
      const numberOfFailures = 3;

      const mtbf = equipmentService.calculateMTBF(totalRunTime, numberOfFailures);
      expect(mtbf).toBeCloseTo(333.33, 2);
    });
  });

  describe('calculateMTTR', () => {
    it('should calculate MTTR correctly with multiple repairs', () => {
      const totalDownTime = 100; // hours
      const numberOfRepairs = 5;

      const mttr = equipmentService.calculateMTTR(totalDownTime, numberOfRepairs);
      expect(mttr).toBe(20); // 100 / 5
    });

    it('should return null for zero repairs', () => {
      const totalDownTime = 100; // hours
      const numberOfRepairs = 0;

      const mttr = equipmentService.calculateMTTR(totalDownTime, numberOfRepairs);
      expect(mttr).toBeNull();
    });

    it('should return null for zero downtime', () => {
      const totalDownTime = 0;
      const numberOfRepairs = 5;

      const mttr = equipmentService.calculateMTTR(totalDownTime, numberOfRepairs);
      expect(mttr).toBeNull();
    });

    it('should handle single repair', () => {
      const totalDownTime = 50; // hours
      const numberOfRepairs = 1;

      const mttr = equipmentService.calculateMTTR(totalDownTime, numberOfRepairs);
      expect(mttr).toBe(50);
    });

    it('should handle fractional results', () => {
      const totalDownTime = 100; // hours
      const numberOfRepairs = 3;

      const mttr = equipmentService.calculateMTTR(totalDownTime, numberOfRepairs);
      expect(mttr).toBeCloseTo(33.33, 2);
    });
  });

  describe('calculateAvailability', () => {
    it('should calculate availability correctly', () => {
      const totalRunTime = 900; // hours
      const totalDownTime = 100; // hours

      const availability = equipmentService.calculateAvailability(totalRunTime, totalDownTime);
      expect(availability).toBe(90); // (900 / 1000) * 100
    });

    it('should return 100% for zero downtime', () => {
      const totalRunTime = 1000; // hours
      const totalDownTime = 0;

      const availability = equipmentService.calculateAvailability(totalRunTime, totalDownTime);
      expect(availability).toBe(100);
    });

    it('should return 0% for zero runtime', () => {
      const totalRunTime = 0;
      const totalDownTime = 100; // hours

      const availability = equipmentService.calculateAvailability(totalRunTime, totalDownTime);
      expect(availability).toBe(0);
    });

    it('should handle edge case of both values zero', () => {
      const totalRunTime = 0;
      const totalDownTime = 0;

      const availability = equipmentService.calculateAvailability(totalRunTime, totalDownTime);
      expect(availability).toBe(100); // Assume 100% if no data
    });

    it('should handle decimal precision', () => {
      const totalRunTime = 999; // hours
      const totalDownTime = 1; // hours

      const availability = equipmentService.calculateAvailability(totalRunTime, totalDownTime);
      expect(availability).toBeCloseTo(99.9, 1);
    });
  });

  describe('validateEquipmentTypeData', () => {
    it('should pass validation for valid equipment type data', () => {
      const validData = {
        name: 'CNC Machine',
        description: 'Computer Numerical Control Machine',
        category: 'Manufacturing Equipment',
        defaultMaintenanceInterval: 90,
      };

      expect(() => equipmentService.validateEquipmentTypeData(validData)).not.toThrow();
    });

    it('should reject empty type name', () => {
      const invalidData = {
        name: '',
        description: 'Computer Numerical Control Machine',
        category: 'Manufacturing Equipment',
      };

      expect(() => equipmentService.validateEquipmentTypeData(invalidData))
        .toThrow('Equipment type name is required');
    });

    it('should reject whitespace-only type name', () => {
      const invalidData = {
        name: '   ',
        description: 'Computer Numerical Control Machine',
        category: 'Manufacturing Equipment',
      };

      expect(() => equipmentService.validateEquipmentTypeData(invalidData))
        .toThrow('Equipment type name is required');
    });

    it('should reject type name exceeding 255 characters', () => {
      const invalidData = {
        name: 'A'.repeat(256),
        description: 'Computer Numerical Control Machine',
        category: 'Manufacturing Equipment',
      };

      expect(() => equipmentService.validateEquipmentTypeData(invalidData))
        .toThrow('Equipment type name cannot exceed 255 characters');
    });

    it('should reject negative default maintenance interval', () => {
      const invalidData = {
        name: 'CNC Machine',
        description: 'Computer Numerical Control Machine',
        category: 'Manufacturing Equipment',
        defaultMaintenanceInterval: -30,
      };

      expect(() => equipmentService.validateEquipmentTypeData(invalidData))
        .toThrow('Default maintenance interval must be positive');
    });

    it('should reject zero default maintenance interval', () => {
      const invalidData = {
        name: 'CNC Machine',
        description: 'Computer Numerical Control Machine',
        category: 'Manufacturing Equipment',
        defaultMaintenanceInterval: 0,
      };

      expect(() => equipmentService.validateEquipmentTypeData(invalidData))
        .toThrow('Default maintenance interval must be positive');
    });

    it('should accept undefined default maintenance interval', () => {
      const validData = {
        name: 'CNC Machine',
        description: 'Computer Numerical Control Machine',
        category: 'Manufacturing Equipment',
        defaultMaintenanceInterval: undefined,
      };

      expect(() => equipmentService.validateEquipmentTypeData(validData)).not.toThrow();
    });
  });

  describe('prioritizeMaintenanceWork', () => {
    it('should prioritize critical equipment with overdue maintenance', () => {
      const equipmentList = [
        {
          id: 'eq-1',
          name: 'Machine A',
          criticality: CriticalityLevel.LOW,
          nextMaintenanceDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day future
          isActive: true,
        },
        {
          id: 'eq-2',
          name: 'Machine B',
          criticality: CriticalityLevel.HIGH,
          nextMaintenanceDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day overdue
          isActive: true,
        },
        {
          id: 'eq-3',
          name: 'Machine C',
          criticality: CriticalityLevel.MEDIUM,
          nextMaintenanceDate: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days overdue
          isActive: true,
        },
      ];

      const prioritized = equipmentService.prioritizeMaintenanceWork(equipmentList);

      // Critical equipment with overdue maintenance should be first
      expect(prioritized[0].id).toBe('eq-2');
      // Medium criticality with longer overdue should be second
      expect(prioritized[1].id).toBe('eq-3');
      // Low criticality with future maintenance should be last
      expect(prioritized[2].id).toBe('eq-1');
    });

    it('should filter out inactive equipment', () => {
      const equipmentList = [
        {
          id: 'eq-1',
          name: 'Machine A',
          criticality: CriticalityLevel.HIGH,
          nextMaintenanceDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          isActive: false, // Inactive
        },
        {
          id: 'eq-2',
          name: 'Machine B',
          criticality: CriticalityLevel.LOW,
          nextMaintenanceDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isActive: true,
        },
      ];

      const prioritized = equipmentService.prioritizeMaintenanceWork(equipmentList);

      expect(prioritized).toHaveLength(1);
      expect(prioritized[0].id).toBe('eq-2');
    });

    it('should handle equipment without maintenance dates', () => {
      const equipmentList = [
        {
          id: 'eq-1',
          name: 'Machine A',
          criticality: CriticalityLevel.HIGH,
          nextMaintenanceDate: null,
          isActive: true,
        },
        {
          id: 'eq-2',
          name: 'Machine B',
          criticality: CriticalityLevel.LOW,
          nextMaintenanceDate: new Date(),
          isActive: true,
        },
      ];

      const prioritized = equipmentService.prioritizeMaintenanceWork(equipmentList);

      expect(prioritized).toHaveLength(2);
      // Equipment without maintenance dates should be included but ranked lower
      expect(prioritized[1].id).toBe('eq-1');
    });

    it('should handle empty equipment list', () => {
      const equipmentList: any[] = [];
      const prioritized = equipmentService.prioritizeMaintenanceWork(equipmentList);

      expect(prioritized).toHaveLength(0);
    });
  });

  describe('isMaintenanceOverdue', () => {
    it('should return true for overdue maintenance', () => {
      const equipment = {
        nextMaintenanceDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      const isOverdue = equipmentService.isMaintenanceOverdue(equipment);
      expect(isOverdue).toBe(true);
    });

    it('should return false for future maintenance', () => {
      const equipment = {
        nextMaintenanceDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day future
      };

      const isOverdue = equipmentService.isMaintenanceOverdue(equipment);
      expect(isOverdue).toBe(false);
    });

    it('should return false for maintenance due today', () => {
      const equipment = {
        nextMaintenanceDate: new Date(), // Today
      };

      const isOverdue = equipmentService.isMaintenanceOverdue(equipment);
      expect(isOverdue).toBe(false);
    });

    it('should return false for equipment without maintenance date', () => {
      const equipment = {
        nextMaintenanceDate: null,
      };

      const isOverdue = equipmentService.isMaintenanceOverdue(equipment);
      expect(isOverdue).toBe(false);
    });

    it('should return false for equipment with undefined maintenance date', () => {
      const equipment = {
        nextMaintenanceDate: undefined,
      };

      const isOverdue = equipmentService.isMaintenanceOverdue(equipment);
      expect(isOverdue).toBe(false);
    });
  });

  describe('calculateMaintenanceCost', () => {
    it('should calculate total maintenance cost correctly', () => {
      const workOrders = [
        {
          id: 'wo-1',
          totalCost: 1500.00,
          status: MaintenanceStatus.COMPLETED,
        },
        {
          id: 'wo-2',
          totalCost: 2500.50,
          status: MaintenanceStatus.COMPLETED,
        },
        {
          id: 'wo-3',
          totalCost: 800.25,
          status: MaintenanceStatus.IN_PROGRESS, // Should not be included
        },
      ];

      const totalCost = equipmentService.calculateMaintenanceCost(workOrders);
      expect(totalCost).toBe(4000.50); // Only completed work orders
    });

    it('should return 0 for empty work orders', () => {
      const workOrders: any[] = [];
      const totalCost = equipmentService.calculateMaintenanceCost(workOrders);
      expect(totalCost).toBe(0);
    });

    it('should return 0 for work orders without completed status', () => {
      const workOrders = [
        {
          id: 'wo-1',
          totalCost: 1500.00,
          status: MaintenanceStatus.PENDING,
        },
        {
          id: 'wo-2',
          totalCost: 2500.50,
          status: MaintenanceStatus.CANCELLED,
        },
      ];

      const totalCost = equipmentService.calculateMaintenanceCost(workOrders);
      expect(totalCost).toBe(0);
    });

    it('should handle null total cost values', () => {
      const workOrders = [
        {
          id: 'wo-1',
          totalCost: null,
          status: MaintenanceStatus.COMPLETED,
        },
        {
          id: 'wo-2',
          totalCost: 1500.00,
          status: MaintenanceStatus.COMPLETED,
        },
      ];

      const totalCost = equipmentService.calculateMaintenanceCost(workOrders);
      expect(totalCost).toBe(1500.00); // Only count non-null costs
    });

    it('should handle undefined total cost values', () => {
      const workOrders = [
        {
          id: 'wo-1',
          totalCost: undefined,
          status: MaintenanceStatus.COMPLETED,
        },
        {
          id: 'wo-2',
          totalCost: 1500.00,
          status: MaintenanceStatus.COMPLETED,
        },
      ];

      const totalCost = equipmentService.calculateMaintenanceCost(workOrders);
      expect(totalCost).toBe(1500.00); // Only count defined costs
    });
  });
});