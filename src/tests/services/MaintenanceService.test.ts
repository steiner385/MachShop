// GitHub Issue #94: Equipment Registry & Maintenance Management System
// MaintenanceService Unit Tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaintenanceService } from '@/services/MaintenanceService';
import { MaintenanceStatus, Priority, MaintenanceType } from '@prisma/client';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  default: {
    maintenanceWorkOrder: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    maintenancePart: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    laborEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    equipment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('MaintenanceService', () => {
  let maintenanceService: MaintenanceService;

  beforeEach(() => {
    maintenanceService = new MaintenanceService();
    vi.clearAllMocks();
  });

  describe('validateMaintenanceWorkOrderData', () => {
    it('should pass validation for valid work order data', () => {
      const validData = {
        equipmentId: 'eq-123',
        title: 'Preventive Maintenance - Oil Change',
        description: 'Change hydraulic oil and filters',
        maintenanceType: MaintenanceType.PREVENTIVE,
        priority: Priority.NORMAL,
        scheduledDate: new Date(),
        estimatedDuration: 120,
        createdById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenanceWorkOrderData(validData)).not.toThrow();
    });

    it('should reject empty title', () => {
      const invalidData = {
        equipmentId: 'eq-123',
        title: '',
        maintenanceType: MaintenanceType.PREVENTIVE,
        createdById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenanceWorkOrderData(invalidData))
        .toThrow('Work order title is required');
    });

    it('should reject whitespace-only title', () => {
      const invalidData = {
        equipmentId: 'eq-123',
        title: '   ',
        maintenanceType: MaintenanceType.PREVENTIVE,
        createdById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenanceWorkOrderData(invalidData))
        .toThrow('Work order title is required');
    });

    it('should reject title exceeding 255 characters', () => {
      const invalidData = {
        equipmentId: 'eq-123',
        title: 'A'.repeat(256),
        maintenanceType: MaintenanceType.PREVENTIVE,
        createdById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenanceWorkOrderData(invalidData))
        .toThrow('Work order title cannot exceed 255 characters');
    });

    it('should reject negative estimated duration', () => {
      const invalidData = {
        equipmentId: 'eq-123',
        title: 'Maintenance Task',
        maintenanceType: MaintenanceType.PREVENTIVE,
        estimatedDuration: -60,
        createdById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenanceWorkOrderData(invalidData))
        .toThrow('Estimated duration must be positive');
    });

    it('should reject zero estimated duration', () => {
      const invalidData = {
        equipmentId: 'eq-123',
        title: 'Maintenance Task',
        maintenanceType: MaintenanceType.PREVENTIVE,
        estimatedDuration: 0,
        createdById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenanceWorkOrderData(invalidData))
        .toThrow('Estimated duration must be positive');
    });

    it('should accept undefined estimated duration', () => {
      const validData = {
        equipmentId: 'eq-123',
        title: 'Maintenance Task',
        maintenanceType: MaintenanceType.PREVENTIVE,
        estimatedDuration: undefined,
        createdById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenanceWorkOrderData(validData)).not.toThrow();
    });
  });

  describe('generateWorkOrderNumber', () => {
    it('should generate work order number with correct format', () => {
      const workOrderNumber = maintenanceService.generateWorkOrderNumber();
      expect(workOrderNumber).toMatch(/^WO-\d{4}-\d{6}$/);
    });

    it('should generate unique work order numbers', () => {
      const number1 = maintenanceService.generateWorkOrderNumber();
      const number2 = maintenanceService.generateWorkOrderNumber();
      expect(number1).not.toBe(number2);
    });

    it('should generate work order numbers with proper length', () => {
      const workOrderNumber = maintenanceService.generateWorkOrderNumber();
      expect(workOrderNumber.length).toBe(13); // WO- + 4 digits + - + 6 digits
    });
  });

  describe('calculateWorkOrderDuration', () => {
    it('should calculate duration correctly for completed work order', () => {
      const workOrder = {
        startedAt: new Date('2024-01-01T08:00:00Z'),
        completedAt: new Date('2024-01-01T12:00:00Z'),
        status: MaintenanceStatus.COMPLETED,
      };

      const duration = maintenanceService.calculateWorkOrderDuration(workOrder);
      expect(duration).toBe(240); // 4 hours = 240 minutes
    });

    it('should return null for work order without start time', () => {
      const workOrder = {
        startedAt: null,
        completedAt: new Date('2024-01-01T12:00:00Z'),
        status: MaintenanceStatus.COMPLETED,
      };

      const duration = maintenanceService.calculateWorkOrderDuration(workOrder);
      expect(duration).toBeNull();
    });

    it('should return null for work order without completion time', () => {
      const workOrder = {
        startedAt: new Date('2024-01-01T08:00:00Z'),
        completedAt: null,
        status: MaintenanceStatus.IN_PROGRESS,
      };

      const duration = maintenanceService.calculateWorkOrderDuration(workOrder);
      expect(duration).toBeNull();
    });

    it('should handle work order spanning multiple days', () => {
      const workOrder = {
        startedAt: new Date('2024-01-01T23:00:00Z'),
        completedAt: new Date('2024-01-02T01:00:00Z'),
        status: MaintenanceStatus.COMPLETED,
      };

      const duration = maintenanceService.calculateWorkOrderDuration(workOrder);
      expect(duration).toBe(120); // 2 hours = 120 minutes
    });

    it('should handle same start and completion time', () => {
      const sameTime = new Date('2024-01-01T12:00:00Z');
      const workOrder = {
        startedAt: sameTime,
        completedAt: sameTime,
        status: MaintenanceStatus.COMPLETED,
      };

      const duration = maintenanceService.calculateWorkOrderDuration(workOrder);
      expect(duration).toBe(0);
    });
  });

  describe('calculateTotalWorkOrderCost', () => {
    it('should calculate total cost including parts and labor', () => {
      const parts = [
        { quantityUsed: 2, unitCost: 25.50 },
        { quantityUsed: 1, unitCost: 150.00 },
        { quantityUsed: 3, unitCost: null }, // Should be ignored
      ];

      const laborEntries = [
        {
          startTime: new Date('2024-01-01T08:00:00Z'),
          endTime: new Date('2024-01-01T10:00:00Z'),
          hourlyRate: 50.00
        },
        {
          startTime: new Date('2024-01-01T14:00:00Z'),
          endTime: new Date('2024-01-01T16:00:00Z'),
          hourlyRate: 60.00
        },
        {
          startTime: new Date('2024-01-01T18:00:00Z'),
          endTime: new Date('2024-01-01T20:00:00Z'),
          hourlyRate: null // Should be ignored
        },
      ];

      const totalCost = maintenanceService.calculateTotalWorkOrderCost(parts, laborEntries);

      // Parts: (2 * 25.50) + (1 * 150.00) = 201.00
      // Labor: (2 * 50.00) + (2 * 60.00) = 220.00
      // Total: 421.00
      expect(totalCost).toBe(421.00);
    });

    it('should return 0 for empty parts and labor', () => {
      const totalCost = maintenanceService.calculateTotalWorkOrderCost([], []);
      expect(totalCost).toBe(0);
    });

    it('should calculate parts cost only when no labor entries', () => {
      const parts = [
        { quantityUsed: 2, unitCost: 25.50 },
        { quantityUsed: 1, unitCost: 150.00 },
      ];

      const totalCost = maintenanceService.calculateTotalWorkOrderCost(parts, []);
      expect(totalCost).toBe(201.00); // (2 * 25.50) + (1 * 150.00)
    });

    it('should calculate labor cost only when no parts', () => {
      const laborEntries = [
        {
          startTime: new Date('2024-01-01T08:00:00Z'),
          endTime: new Date('2024-01-01T12:00:00Z'),
          hourlyRate: 50.00
        },
      ];

      const totalCost = maintenanceService.calculateTotalWorkOrderCost([], laborEntries);
      expect(totalCost).toBe(200.00); // 4 hours * 50.00
    });

    it('should ignore parts with null unit cost', () => {
      const parts = [
        { quantityUsed: 2, unitCost: 25.50 },
        { quantityUsed: 5, unitCost: null },
        { quantityUsed: 1, unitCost: undefined },
      ];

      const totalCost = maintenanceService.calculateTotalWorkOrderCost(parts, []);
      expect(totalCost).toBe(51.00); // Only count the first part
    });

    it('should ignore labor entries with null hourly rate', () => {
      const laborEntries = [
        {
          startTime: new Date('2024-01-01T08:00:00Z'),
          endTime: new Date('2024-01-01T10:00:00Z'),
          hourlyRate: 50.00
        },
        {
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T12:00:00Z'),
          hourlyRate: null
        },
        {
          startTime: new Date('2024-01-01T14:00:00Z'),
          endTime: new Date('2024-01-01T16:00:00Z'),
          hourlyRate: undefined
        },
      ];

      const totalCost = maintenanceService.calculateTotalWorkOrderCost([], laborEntries);
      expect(totalCost).toBe(100.00); // Only count the first labor entry
    });
  });

  describe('validateMaintenancePartData', () => {
    it('should pass validation for valid maintenance part data', () => {
      const validData = {
        partNumber: 'PN-12345',
        description: 'Hydraulic Filter',
        quantityUsed: 2,
        unitCost: 25.50,
        supplierPartNumber: 'SUP-67890',
        addedById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenancePartData(validData)).not.toThrow();
    });

    it('should reject empty part number', () => {
      const invalidData = {
        partNumber: '',
        description: 'Hydraulic Filter',
        quantityUsed: 2,
        addedById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenancePartData(invalidData))
        .toThrow('Part number is required');
    });

    it('should reject whitespace-only part number', () => {
      const invalidData = {
        partNumber: '   ',
        description: 'Hydraulic Filter',
        quantityUsed: 2,
        addedById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenancePartData(invalidData))
        .toThrow('Part number is required');
    });

    it('should reject empty description', () => {
      const invalidData = {
        partNumber: 'PN-12345',
        description: '',
        quantityUsed: 2,
        addedById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenancePartData(invalidData))
        .toThrow('Part description is required');
    });

    it('should reject zero quantity', () => {
      const invalidData = {
        partNumber: 'PN-12345',
        description: 'Hydraulic Filter',
        quantityUsed: 0,
        addedById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenancePartData(invalidData))
        .toThrow('Quantity used must be greater than 0');
    });

    it('should reject negative quantity', () => {
      const invalidData = {
        partNumber: 'PN-12345',
        description: 'Hydraulic Filter',
        quantityUsed: -2,
        addedById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenancePartData(invalidData))
        .toThrow('Quantity used must be greater than 0');
    });

    it('should reject negative unit cost', () => {
      const invalidData = {
        partNumber: 'PN-12345',
        description: 'Hydraulic Filter',
        quantityUsed: 2,
        unitCost: -25.50,
        addedById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenancePartData(invalidData))
        .toThrow('Unit cost must be non-negative');
    });

    it('should accept zero unit cost', () => {
      const validData = {
        partNumber: 'PN-12345',
        description: 'Hydraulic Filter',
        quantityUsed: 2,
        unitCost: 0,
        addedById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenancePartData(validData)).not.toThrow();
    });

    it('should accept undefined unit cost', () => {
      const validData = {
        partNumber: 'PN-12345',
        description: 'Hydraulic Filter',
        quantityUsed: 2,
        unitCost: undefined,
        addedById: 'user-123',
      };

      expect(() => maintenanceService.validateMaintenancePartData(validData)).not.toThrow();
    });
  });

  describe('validateLaborEntryData', () => {
    it('should pass validation for valid labor entry data', () => {
      const validData = {
        userId: 'user-123',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        hourlyRate: 50.00,
        description: 'Oil change maintenance',
        recordedById: 'user-456',
      };

      expect(() => maintenanceService.validateLaborEntryData(validData)).not.toThrow();
    });

    it('should reject end time before start time', () => {
      const invalidData = {
        userId: 'user-123',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T08:00:00Z'), // Before start time
        recordedById: 'user-456',
      };

      expect(() => maintenanceService.validateLaborEntryData(invalidData))
        .toThrow('End time must be after start time');
    });

    it('should reject same start and end time', () => {
      const sameTime = new Date('2024-01-01T10:00:00Z');
      const invalidData = {
        userId: 'user-123',
        startTime: sameTime,
        endTime: sameTime,
        recordedById: 'user-456',
      };

      expect(() => maintenanceService.validateLaborEntryData(invalidData))
        .toThrow('End time must be after start time');
    });

    it('should reject negative hourly rate', () => {
      const invalidData = {
        userId: 'user-123',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        hourlyRate: -50.00,
        recordedById: 'user-456',
      };

      expect(() => maintenanceService.validateLaborEntryData(invalidData))
        .toThrow('Hourly rate must be non-negative');
    });

    it('should accept zero hourly rate', () => {
      const validData = {
        userId: 'user-123',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        hourlyRate: 0,
        recordedById: 'user-456',
      };

      expect(() => maintenanceService.validateLaborEntryData(validData)).not.toThrow();
    });

    it('should accept undefined hourly rate', () => {
      const validData = {
        userId: 'user-123',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        hourlyRate: undefined,
        recordedById: 'user-456',
      };

      expect(() => maintenanceService.validateLaborEntryData(validData)).not.toThrow();
    });
  });

  describe('calculateLaborCost', () => {
    it('should calculate labor cost correctly', () => {
      const laborEntry = {
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        hourlyRate: 50.00,
      };

      const cost = maintenanceService.calculateLaborCost(laborEntry);
      expect(cost).toBe(200.00); // 4 hours * $50/hour
    });

    it('should return 0 for null hourly rate', () => {
      const laborEntry = {
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        hourlyRate: null,
      };

      const cost = maintenanceService.calculateLaborCost(laborEntry);
      expect(cost).toBe(0);
    });

    it('should return 0 for undefined hourly rate', () => {
      const laborEntry = {
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        hourlyRate: undefined,
      };

      const cost = maintenanceService.calculateLaborCost(laborEntry);
      expect(cost).toBe(0);
    });

    it('should handle fractional hours correctly', () => {
      const laborEntry = {
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T08:30:00Z'), // 30 minutes
        hourlyRate: 60.00,
      };

      const cost = maintenanceService.calculateLaborCost(laborEntry);
      expect(cost).toBe(30.00); // 0.5 hours * $60/hour
    });

    it('should handle labor spanning multiple days', () => {
      const laborEntry = {
        startTime: new Date('2024-01-01T23:00:00Z'),
        endTime: new Date('2024-01-02T02:00:00Z'), // 3 hours across days
        hourlyRate: 40.00,
      };

      const cost = maintenanceService.calculateLaborCost(laborEntry);
      expect(cost).toBe(120.00); // 3 hours * $40/hour
    });
  });

  describe('isWorkOrderOverdue', () => {
    it('should return true for overdue scheduled work order', () => {
      const workOrder = {
        scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        status: MaintenanceStatus.PENDING,
      };

      const isOverdue = maintenanceService.isWorkOrderOverdue(workOrder);
      expect(isOverdue).toBe(true);
    });

    it('should return false for future scheduled work order', () => {
      const workOrder = {
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day future
        status: MaintenanceStatus.PENDING,
      };

      const isOverdue = maintenanceService.isWorkOrderOverdue(workOrder);
      expect(isOverdue).toBe(false);
    });

    it('should return false for work order scheduled today', () => {
      const workOrder = {
        scheduledDate: new Date(), // Today
        status: MaintenanceStatus.PENDING,
      };

      const isOverdue = maintenanceService.isWorkOrderOverdue(workOrder);
      expect(isOverdue).toBe(false);
    });

    it('should return false for completed work order', () => {
      const workOrder = {
        scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        status: MaintenanceStatus.COMPLETED,
      };

      const isOverdue = maintenanceService.isWorkOrderOverdue(workOrder);
      expect(isOverdue).toBe(false);
    });

    it('should return false for cancelled work order', () => {
      const workOrder = {
        scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        status: MaintenanceStatus.CANCELLED,
      };

      const isOverdue = maintenanceService.isWorkOrderOverdue(workOrder);
      expect(isOverdue).toBe(false);
    });

    it('should return false for work order without scheduled date', () => {
      const workOrder = {
        scheduledDate: null,
        status: MaintenanceStatus.PENDING,
      };

      const isOverdue = maintenanceService.isWorkOrderOverdue(workOrder);
      expect(isOverdue).toBe(false);
    });
  });

  describe('prioritizeWorkOrders', () => {
    it('should prioritize by priority and overdue status', () => {
      const workOrders = [
        {
          id: 'wo-1',
          priority: Priority.NORMAL,
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future
          status: MaintenanceStatus.PENDING,
        },
        {
          id: 'wo-2',
          priority: Priority.CRITICAL,
          scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Overdue
          status: MaintenanceStatus.PENDING,
        },
        {
          id: 'wo-3',
          priority: Priority.HIGH,
          scheduledDate: new Date(Date.now() - 12 * 60 * 60 * 1000), // Overdue
          status: MaintenanceStatus.PENDING,
        },
      ];

      const prioritized = maintenanceService.prioritizeWorkOrders(workOrders);

      // Critical overdue should be first
      expect(prioritized[0].id).toBe('wo-2');
      // High priority overdue should be second
      expect(prioritized[1].id).toBe('wo-3');
      // Normal priority future should be last
      expect(prioritized[2].id).toBe('wo-1');
    });

    it('should filter out completed and cancelled work orders', () => {
      const workOrders = [
        {
          id: 'wo-1',
          priority: Priority.CRITICAL,
          scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: MaintenanceStatus.COMPLETED,
        },
        {
          id: 'wo-2',
          priority: Priority.HIGH,
          scheduledDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
          status: MaintenanceStatus.CANCELLED,
        },
        {
          id: 'wo-3',
          priority: Priority.NORMAL,
          scheduledDate: new Date(),
          status: MaintenanceStatus.PENDING,
        },
      ];

      const prioritized = maintenanceService.prioritizeWorkOrders(workOrders);

      expect(prioritized).toHaveLength(1);
      expect(prioritized[0].id).toBe('wo-3');
    });

    it('should handle work orders without scheduled dates', () => {
      const workOrders = [
        {
          id: 'wo-1',
          priority: Priority.HIGH,
          scheduledDate: null,
          status: MaintenanceStatus.PENDING,
        },
        {
          id: 'wo-2',
          priority: Priority.NORMAL,
          scheduledDate: new Date(),
          status: MaintenanceStatus.PENDING,
        },
      ];

      const prioritized = maintenanceService.prioritizeWorkOrders(workOrders);

      expect(prioritized).toHaveLength(2);
      // Higher priority should come first even without scheduled date
      expect(prioritized[0].id).toBe('wo-1');
    });

    it('should handle empty work orders list', () => {
      const workOrders: any[] = [];
      const prioritized = maintenanceService.prioritizeWorkOrders(workOrders);

      expect(prioritized).toHaveLength(0);
    });
  });
});