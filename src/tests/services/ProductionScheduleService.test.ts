import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductionScheduleService } from '../../services/ProductionScheduleService';
import type { PrismaClient } from '@prisma/client';

// Mock Prisma Client with actual enums preserved
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');

  const mockPrisma = {
    productionSchedule: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    scheduleEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    scheduleConstraint: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    scheduleStateHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    workOrder: {
      create: vi.fn(),
    },
  };

  return {
    ...actual,
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe('ProductionScheduleService', () => {
  let scheduleService: ProductionScheduleService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      productionSchedule: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      scheduleEntry: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      scheduleConstraint: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      scheduleStateHistory: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      workOrder: {
        create: vi.fn(),
      },
    };

    scheduleService = new ProductionScheduleService(mockPrisma as unknown as PrismaClient);
    vi.clearAllMocks();
  });

  // ========================================================================
  // SCHEDULE CRUD OPERATIONS
  // ========================================================================

  describe('createSchedule', () => {
    it('should create production schedule with initial FORECAST state', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        scheduleNumber: 'SCH-2025-001',
        scheduleName: 'January 2025 Production Schedule',
        description: 'Monthly production schedule for January',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        periodType: 'MONTHLY',
        siteId: 'site-1',
        state: 'FORECAST',
        priority: 'NORMAL',
        plannedBy: 'planner@example.com',
        totalEntries: 0,
        dispatchedCount: 0,
        isFeasible: true,
        isLocked: false,
        entries: [],
        stateHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.productionSchedule.create.mockResolvedValue(mockSchedule);
      mockPrisma.productionSchedule.findUnique.mockResolvedValue(mockSchedule);
      mockPrisma.scheduleStateHistory.create.mockResolvedValue({
        id: 'history-1',
        scheduleId: 'schedule-1',
        previousState: null,
        newState: 'FORECAST',
        transitionDate: new Date(),
        reason: 'Initial schedule creation',
        changedBy: 'planner@example.com',
      });

      const result = await scheduleService.createSchedule({
        scheduleNumber: 'SCH-2025-001',
        scheduleName: 'January 2025 Production Schedule',
        description: 'Monthly production schedule for January',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        siteId: 'site-1',
        plannedBy: 'planner@example.com',
      });

      expect(mockPrisma.productionSchedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scheduleNumber: 'SCH-2025-001',
          scheduleName: 'January 2025 Production Schedule',
          state: 'FORECAST',
          periodType: 'MONTHLY',
          priority: 'NORMAL',
          totalEntries: 0,
          dispatchedCount: 0,
          isFeasible: true,
        }),
        include: expect.any(Object),
      });

      expect(mockPrisma.scheduleStateHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scheduleId: 'schedule-1',
          previousState: null,
          newState: 'FORECAST',
          reason: 'Initial schedule creation',
        }),
      });

      expect(result.state).toBe('FORECAST');
      expect(result.scheduleNumber).toBe('SCH-2025-001');
    });

    it('should create schedule with high priority', async () => {
      const mockSchedule = {
        id: 'schedule-2',
        scheduleNumber: 'SCH-2025-002',
        scheduleName: 'Urgent Production Schedule',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        state: 'FORECAST',
        priority: 'HIGH',
        totalEntries: 0,
        dispatchedCount: 0,
        isFeasible: true,
        entries: [],
        stateHistory: [],
      };

      mockPrisma.productionSchedule.create.mockResolvedValue(mockSchedule);
      mockPrisma.productionSchedule.findUnique.mockResolvedValue(mockSchedule);
      mockPrisma.scheduleStateHistory.create.mockResolvedValue({});

      const result = await scheduleService.createSchedule({
        scheduleNumber: 'SCH-2025-002',
        scheduleName: 'Urgent Production Schedule',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        priority: 'HIGH',
      });

      expect(result.priority).toBe('HIGH');
    });
  });

  describe('getScheduleById', () => {
    it('should get schedule by ID with all relations', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        scheduleNumber: 'SCH-2025-001',
        scheduleName: 'Test Schedule',
        state: 'RELEASED',
        site: { id: 'site-1', siteName: 'Factory A' },
        entries: [
          { id: 'entry-1', entryNumber: 1, part: { partNumber: 'PN-001' } },
        ],
        stateHistory: [
          { id: 'history-1', newState: 'RELEASED', transitionDate: new Date() },
        ],
      };

      mockPrisma.productionSchedule.findUnique.mockResolvedValue(mockSchedule);

      const result = await scheduleService.getScheduleById('schedule-1');

      expect(mockPrisma.productionSchedule.findUnique).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        include: expect.objectContaining({
          site: true,
          entries: expect.any(Object),
          stateHistory: expect.any(Object),
        }),
      });

      expect(result.scheduleNumber).toBe('SCH-2025-001');
      expect(result.entries).toHaveLength(1);
    });

    it('should get schedule without relations', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        scheduleNumber: 'SCH-2025-001',
        scheduleName: 'Test Schedule',
      };

      mockPrisma.productionSchedule.findUnique.mockResolvedValue(mockSchedule);

      const result = await scheduleService.getScheduleById('schedule-1', false);

      expect(mockPrisma.productionSchedule.findUnique).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        include: undefined,
      });

      expect(result.scheduleNumber).toBe('SCH-2025-001');
    });

    it('should throw error when schedule not found', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue(null);

      await expect(scheduleService.getScheduleById('non-existent'))
        .rejects.toThrow('Production schedule with ID non-existent not found');
    });
  });

  describe('getScheduleByNumber', () => {
    it('should get schedule by schedule number', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        scheduleNumber: 'SCH-2025-001',
        scheduleName: 'Test Schedule',
        site: {},
        entries: [],
        stateHistory: [],
      };

      mockPrisma.productionSchedule.findUnique.mockResolvedValue(mockSchedule);

      const result = await scheduleService.getScheduleByNumber('SCH-2025-001');

      expect(mockPrisma.productionSchedule.findUnique).toHaveBeenCalledWith({
        where: { scheduleNumber: 'SCH-2025-001' },
        include: expect.any(Object),
      });

      expect(result.scheduleNumber).toBe('SCH-2025-001');
    });

    it('should throw error when schedule number not found', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue(null);

      await expect(scheduleService.getScheduleByNumber('INVALID'))
        .rejects.toThrow('Production schedule with number INVALID not found');
    });
  });

  describe('getAllSchedules', () => {
    it('should get all schedules with filters', async () => {
      const mockSchedules = [
        {
          id: 'schedule-1',
          scheduleNumber: 'SCH-001',
          state: 'RELEASED',
          priority: 'HIGH',
          isFeasible: true,
        },
        {
          id: 'schedule-2',
          scheduleNumber: 'SCH-002',
          state: 'RELEASED',
          priority: 'NORMAL',
          isFeasible: true,
        },
      ];

      mockPrisma.productionSchedule.findMany.mockResolvedValue(mockSchedules);

      const result = await scheduleService.getAllSchedules({
        state: 'RELEASED',
        isFeasible: true,
      });

      expect(mockPrisma.productionSchedule.findMany).toHaveBeenCalledWith({
        where: {
          state: 'RELEASED',
          isFeasible: true,
        },
        include: undefined,
        orderBy: [
          { priority: 'desc' },
          { periodStart: 'asc' },
        ],
      });

      expect(result).toHaveLength(2);
    });

    it('should filter by priority and site', async () => {
      const mockSchedules = [
        { id: 'schedule-1', priority: 'HIGH', siteId: 'site-1' },
      ];

      mockPrisma.productionSchedule.findMany.mockResolvedValue(mockSchedules);

      const result = await scheduleService.getAllSchedules({
        priority: 'HIGH',
        siteId: 'site-1',
      });

      expect(mockPrisma.productionSchedule.findMany).toHaveBeenCalledWith({
        where: {
          priority: 'HIGH',
          siteId: 'site-1',
        },
        include: undefined,
        orderBy: expect.any(Array),
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule fields', async () => {
      const mockExistingSchedule = {
        id: 'schedule-1',
        isLocked: false,
        state: 'FORECAST',
      };

      const mockUpdatedSchedule = {
        id: 'schedule-1',
        scheduleName: 'Updated Schedule Name',
        priority: 'HIGH',
        approvedBy: 'manager@example.com',
        approvedAt: new Date(),
        entries: [],
        stateHistory: [],
      };

      mockPrisma.productionSchedule.findUnique.mockResolvedValue(mockExistingSchedule);
      mockPrisma.productionSchedule.update.mockResolvedValue(mockUpdatedSchedule);

      const result = await scheduleService.updateSchedule('schedule-1', {
        scheduleName: 'Updated Schedule Name',
        priority: 'HIGH',
        approvedBy: 'manager@example.com',
        approvedAt: new Date(),
      });

      expect(mockPrisma.productionSchedule.update).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        data: expect.objectContaining({
          scheduleName: 'Updated Schedule Name',
          priority: 'HIGH',
        }),
        include: expect.any(Object),
      });

      expect(result.scheduleName).toBe('Updated Schedule Name');
    });

    it('should throw error when updating locked schedule not in FORECAST state', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        isLocked: true,
        state: 'RELEASED',
      });

      await expect(scheduleService.updateSchedule('schedule-1', { scheduleName: 'New Name' }))
        .rejects.toThrow('Cannot update locked schedule that is not in FORECAST state');
    });

    it('should throw error when schedule not found', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue(null);

      await expect(scheduleService.updateSchedule('non-existent', {}))
        .rejects.toThrow('Production schedule with ID non-existent not found');
    });
  });

  describe('deleteSchedule', () => {
    it('should soft delete schedule by locking it', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        id: 'schedule-1',
        dispatchedCount: 0,
      });
      mockPrisma.productionSchedule.update.mockResolvedValue({});

      const result = await scheduleService.deleteSchedule('schedule-1');

      expect(mockPrisma.productionSchedule.update).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        data: { isLocked: true, notes: 'Schedule locked for deletion' },
      });

      expect(result.message).toBe('Production schedule locked');
      expect(result.id).toBe('schedule-1');
    });

    it('should hard delete schedule when requested', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        id: 'schedule-1',
        dispatchedCount: 5,
      });
      mockPrisma.productionSchedule.delete.mockResolvedValue({});

      const result = await scheduleService.deleteSchedule('schedule-1', true);

      expect(mockPrisma.productionSchedule.delete).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
      });

      expect(result.message).toBe('Production schedule permanently deleted');
    });

    it('should prevent soft delete if entries have been dispatched', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        dispatchedCount: 5,
      });

      await expect(scheduleService.deleteSchedule('schedule-1'))
        .rejects.toThrow('Cannot delete schedule with dispatched entries');
    });
  });

  // ========================================================================
  // SCHEDULE ENTRY OPERATIONS
  // ========================================================================

  describe('addScheduleEntry', () => {
    it('should add entry to schedule', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        id: 'schedule-1',
        state: 'FORECAST',
        isLocked: false,
        totalEntries: 5,
      });

      const mockEntry = {
        id: 'entry-1',
        scheduleId: 'schedule-1',
        entryNumber: 6,
        partId: 'part-1',
        partNumber: 'PN-12345',
        plannedQuantity: 100,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date('2025-01-15'),
        plannedEndDate: new Date('2025-01-20'),
        priority: 'NORMAL',
        dispatchedQuantity: 0,
        completedQuantity: 0,
        isDispatched: false,
        isCancelled: false,
        part: {},
        workCenter: null,
        routing: null,
        constraints: [],
      };

      mockPrisma.scheduleEntry.create.mockResolvedValue(mockEntry);
      mockPrisma.productionSchedule.update.mockResolvedValue({});

      const result = await scheduleService.addScheduleEntry('schedule-1', {
        partId: 'part-1',
        partNumber: 'PN-12345',
        plannedQuantity: 100,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date('2025-01-15'),
        plannedEndDate: new Date('2025-01-20'),
      });

      expect(mockPrisma.scheduleEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scheduleId: 'schedule-1',
          entryNumber: 6,
          partNumber: 'PN-12345',
          plannedQuantity: 100,
          priority: 'NORMAL',
          isDispatched: false,
          isCancelled: false,
        }),
        include: expect.any(Object),
      });

      expect(mockPrisma.productionSchedule.update).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        data: { totalEntries: { increment: 1 } },
      });

      expect(result.entryNumber).toBe(6);
    });

    it('should throw error when adding to locked schedule', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        isLocked: true,
      });

      await expect(scheduleService.addScheduleEntry('schedule-1', {} as any))
        .rejects.toThrow('Cannot add entries to locked schedule');
    });

    it('should throw error when adding to closed schedule', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        state: 'CLOSED',
        isLocked: false,
      });

      await expect(scheduleService.addScheduleEntry('schedule-1', {} as any))
        .rejects.toThrow('Cannot add entries to closed schedule');
    });
  });

  describe('getScheduleEntries', () => {
    it('should get all entries for a schedule ordered by sequence', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          scheduleId: 'schedule-1',
          entryNumber: 1,
          sequenceNumber: 10,
          part: {},
          workCenter: {},
          routing: {},
          workOrder: null,
          constraints: [],
        },
        {
          id: 'entry-2',
          scheduleId: 'schedule-1',
          entryNumber: 2,
          sequenceNumber: 20,
          part: {},
          workCenter: {},
          routing: {},
          workOrder: null,
          constraints: [],
        },
      ];

      mockPrisma.scheduleEntry.findMany.mockResolvedValue(mockEntries);

      const result = await scheduleService.getScheduleEntries('schedule-1');

      expect(mockPrisma.scheduleEntry.findMany).toHaveBeenCalledWith({
        where: { scheduleId: 'schedule-1' },
        include: expect.objectContaining({
          part: true,
          workCenter: true,
          routing: true,
          workOrder: true,
          constraints: true,
        }),
        orderBy: [
          { sequenceNumber: 'asc' },
          { priority: 'desc' },
          { plannedStartDate: 'asc' },
        ],
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('updateScheduleEntry', () => {
    it('should update entry fields', async () => {
      mockPrisma.scheduleEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        isDispatched: false,
        scheduleId: 'schedule-1',
      });

      const mockUpdatedEntry = {
        id: 'entry-1',
        plannedQuantity: 150,
        priority: 'HIGH',
        part: {},
        workCenter: {},
        routing: {},
        constraints: [],
      };

      mockPrisma.scheduleEntry.update.mockResolvedValue(mockUpdatedEntry);

      const result = await scheduleService.updateScheduleEntry('entry-1', {
        plannedQuantity: 150,
        priority: 'HIGH',
      });

      expect(mockPrisma.scheduleEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: {
          plannedQuantity: 150,
          priority: 'HIGH',
        },
        include: expect.any(Object),
      });

      expect(result.plannedQuantity).toBe(150);
    });

    it('should throw error when updating dispatched entry', async () => {
      mockPrisma.scheduleEntry.findUnique.mockResolvedValue({
        isDispatched: true,
      });

      await expect(scheduleService.updateScheduleEntry('entry-1', {}))
        .rejects.toThrow('Cannot update dispatched schedule entry');
    });
  });

  describe('cancelScheduleEntry', () => {
    it('should cancel entry with reason', async () => {
      mockPrisma.scheduleEntry.findUnique.mockResolvedValue({
        id: 'entry-1',
        isDispatched: false,
        scheduleId: 'schedule-1',
      });

      const mockCancelledEntry = {
        id: 'entry-1',
        isCancelled: true,
        cancelledAt: new Date(),
        cancelledReason: 'Customer cancelled order',
        part: {},
        workCenter: {},
      };

      mockPrisma.scheduleEntry.update.mockResolvedValue(mockCancelledEntry);

      const result = await scheduleService.cancelScheduleEntry('entry-1', 'Customer cancelled order');

      expect(mockPrisma.scheduleEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: {
          isCancelled: true,
          cancelledAt: expect.any(Date),
          cancelledReason: 'Customer cancelled order',
        },
        include: expect.any(Object),
      });

      expect(result.isCancelled).toBe(true);
    });

    it('should throw error when cancelling dispatched entry', async () => {
      mockPrisma.scheduleEntry.findUnique.mockResolvedValue({
        isDispatched: true,
      });

      await expect(scheduleService.cancelScheduleEntry('entry-1', 'reason'))
        .rejects.toThrow('Cannot cancel dispatched schedule entry');
    });
  });

  // ========================================================================
  // CONSTRAINT OPERATIONS
  // ========================================================================

  describe('addConstraint', () => {
    it('should add capacity constraint to entry', async () => {
      const mockConstraint = {
        id: 'constraint-1',
        entryId: 'entry-1',
        constraintType: 'CAPACITY',
        constraintName: 'Work Center Capacity',
        resourceId: 'wc-1',
        resourceType: 'WORK_CENTER',
        requiredQuantity: 40,
        availableQuantity: 40,
        unitOfMeasure: 'hours',
        isViolated: false,
        isResolved: false,
      };

      mockPrisma.scheduleConstraint.create.mockResolvedValue(mockConstraint);
      mockPrisma.scheduleConstraint.findUnique.mockResolvedValue(mockConstraint);
      mockPrisma.scheduleConstraint.update.mockResolvedValue(mockConstraint);

      const result = await scheduleService.addConstraint('entry-1', {
        constraintType: 'CAPACITY',
        constraintName: 'Work Center Capacity',
        resourceId: 'wc-1',
        resourceType: 'WORK_CENTER',
        requiredQuantity: 40,
        availableQuantity: 40,
        unitOfMeasure: 'hours',
      });

      expect(mockPrisma.scheduleConstraint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entryId: 'entry-1',
          constraintType: 'CAPACITY',
          isViolated: false,
          isResolved: false,
        }),
      });

      expect(result.constraintType).toBe('CAPACITY');
    });

    it('should add material constraint', async () => {
      const mockConstraint = {
        id: 'constraint-2',
        entryId: 'entry-1',
        constraintType: 'MATERIAL',
        constraintName: 'Raw Material Availability',
        requiredQuantity: 1000,
        availableQuantity: 800,
        unitOfMeasure: 'kg',
        isViolated: false,
        isResolved: false,
      };

      mockPrisma.scheduleConstraint.create.mockResolvedValue(mockConstraint);
      mockPrisma.scheduleConstraint.findUnique.mockResolvedValue(mockConstraint);
      mockPrisma.scheduleConstraint.update.mockResolvedValue(mockConstraint);

      const result = await scheduleService.addConstraint('entry-1', {
        constraintType: 'MATERIAL',
        constraintName: 'Raw Material Availability',
        requiredQuantity: 1000,
        availableQuantity: 800,
        unitOfMeasure: 'kg',
      });

      expect(result.constraintType).toBe('MATERIAL');
    });
  });

  describe('getEntryConstraints', () => {
    it('should get constraints ordered by violation status', async () => {
      const mockConstraints = [
        {
          id: 'constraint-1',
          entryId: 'entry-1',
          constraintType: 'MATERIAL',
          isViolated: true,
        },
        {
          id: 'constraint-2',
          entryId: 'entry-1',
          constraintType: 'CAPACITY',
          isViolated: false,
        },
      ];

      mockPrisma.scheduleConstraint.findMany.mockResolvedValue(mockConstraints);

      const result = await scheduleService.getEntryConstraints('entry-1');

      expect(mockPrisma.scheduleConstraint.findMany).toHaveBeenCalledWith({
        where: { entryId: 'entry-1' },
        orderBy: [
          { isViolated: 'desc' },
          { constraintType: 'asc' },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result[0].isViolated).toBe(true);
    });
  });

  describe('updateConstraint', () => {
    it('should update constraint availability', async () => {
      const mockUpdatedConstraint = {
        id: 'constraint-1',
        availableQuantity: 1200,
        isViolated: false,
      };

      mockPrisma.scheduleConstraint.update.mockResolvedValue(mockUpdatedConstraint);

      const result = await scheduleService.updateConstraint('constraint-1', {
        availableQuantity: 1200,
        isViolated: false,
      });

      expect(mockPrisma.scheduleConstraint.update).toHaveBeenCalledWith({
        where: { id: 'constraint-1' },
        data: {
          availableQuantity: 1200,
          isViolated: false,
        },
      });

      expect(result.availableQuantity).toBe(1200);
    });
  });

  describe('resolveConstraint', () => {
    it('should resolve constraint violation', async () => {
      const mockResolvedConstraint = {
        id: 'constraint-1',
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: 'planner@example.com',
        resolutionNotes: 'Additional material ordered',
        isViolated: false,
      };

      mockPrisma.scheduleConstraint.update.mockResolvedValue(mockResolvedConstraint);

      const result = await scheduleService.resolveConstraint(
        'constraint-1',
        'planner@example.com',
        'Additional material ordered'
      );

      expect(mockPrisma.scheduleConstraint.update).toHaveBeenCalledWith({
        where: { id: 'constraint-1' },
        data: {
          isResolved: true,
          resolvedAt: expect.any(Date),
          resolvedBy: 'planner@example.com',
          resolutionNotes: 'Additional material ordered',
          isViolated: false,
        },
      });

      expect(result.isResolved).toBe(true);
    });
  });

  describe('checkConstraintViolation', () => {
    it('should detect capacity shortage violation', async () => {
      const mockConstraint = {
        id: 'constraint-1',
        constraintType: 'CAPACITY',
        requiredQuantity: 100,
        availableQuantity: 50,
        unitOfMeasure: 'hours',
        isViolated: false,
      };

      mockPrisma.scheduleConstraint.findUnique.mockResolvedValue(mockConstraint);
      mockPrisma.scheduleConstraint.update.mockResolvedValue({});

      const result = await scheduleService.checkConstraintViolation('constraint-1');

      expect(result.isViolated).toBe(true);
      expect(result.violationSeverity).toBe('HIGH');
      expect(result.violationMessage).toContain('Capacity shortage');
    });

    it('should detect material shortage violation', async () => {
      const mockConstraint = {
        id: 'constraint-2',
        constraintType: 'MATERIAL',
        requiredQuantity: 1000,
        availableQuantity: 900,
        unitOfMeasure: 'kg',
        isViolated: false,
      };

      mockPrisma.scheduleConstraint.findUnique.mockResolvedValue(mockConstraint);
      mockPrisma.scheduleConstraint.update.mockResolvedValue({});

      const result = await scheduleService.checkConstraintViolation('constraint-2');

      expect(result.isViolated).toBe(true);
      expect(result.violationMessage).toContain('Material shortage');
    });

    it('should detect date constraint violation', async () => {
      const pastDate = new Date('2024-01-01');
      const mockConstraint = {
        id: 'constraint-3',
        constraintType: 'DATE',
        constraintDate: pastDate,
        isViolated: false,
      };

      mockPrisma.scheduleConstraint.findUnique.mockResolvedValue(mockConstraint);
      mockPrisma.scheduleConstraint.update.mockResolvedValue({});

      const result = await scheduleService.checkConstraintViolation('constraint-3');

      expect(result.isViolated).toBe(true);
      expect(result.violationSeverity).toBe('HIGH');
      expect(result.violationMessage).toContain('Deadline');
      expect(result.violationMessage).toContain('has passed');
    });

    it('should return no violation when quantities are sufficient', async () => {
      const mockConstraint = {
        id: 'constraint-4',
        constraintType: 'CAPACITY',
        requiredQuantity: 50,
        availableQuantity: 100,
        unitOfMeasure: 'hours',
        isViolated: false,
      };

      mockPrisma.scheduleConstraint.findUnique.mockResolvedValue(mockConstraint);

      const result = await scheduleService.checkConstraintViolation('constraint-4');

      expect(result.isViolated).toBe(false);
    });
  });

  // ========================================================================
  // STATE MANAGEMENT OPERATIONS
  // ========================================================================

  describe('transitionScheduleState', () => {
    it('should transition from FORECAST to RELEASED', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        id: 'schedule-1',
        state: 'FORECAST',
        totalEntries: 10,
        isLocked: false,
      });

      const mockStateHistory = {
        id: 'history-1',
        scheduleId: 'schedule-1',
        previousState: 'FORECAST',
        newState: 'RELEASED',
        transitionDate: new Date(),
        reason: 'Schedule approved for release',
        changedBy: 'manager@example.com',
      };

      mockPrisma.scheduleStateHistory.create.mockResolvedValue(mockStateHistory);
      mockPrisma.productionSchedule.update.mockResolvedValue({});

      const result = await scheduleService.transitionScheduleState('schedule-1', {
        newState: 'RELEASED',
        reason: 'Schedule approved for release',
        changedBy: 'manager@example.com',
      });

      expect(mockPrisma.scheduleStateHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scheduleId: 'schedule-1',
          previousState: 'FORECAST',
          newState: 'RELEASED',
          reason: 'Schedule approved for release',
          changedBy: 'manager@example.com',
        }),
      });

      expect(mockPrisma.productionSchedule.update).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        data: expect.objectContaining({
          state: 'RELEASED',
          stateChangedAt: expect.any(Date),
          stateChangedBy: 'manager@example.com',
          isLocked: true,
        }),
      });

      expect(result.newState).toBe('RELEASED');
    });

    it('should transition from RELEASED back to FORECAST', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        state: 'RELEASED',
        totalEntries: 10,
        isLocked: true,
      });

      const mockStateHistory = {
        id: 'history-2',
        scheduleId: 'schedule-1',
        previousState: 'RELEASED',
        newState: 'FORECAST',
        transitionDate: new Date(),
      };

      mockPrisma.scheduleStateHistory.create.mockResolvedValue(mockStateHistory);
      mockPrisma.productionSchedule.update.mockResolvedValue({});

      const result = await scheduleService.transitionScheduleState('schedule-1', {
        newState: 'FORECAST',
        reason: 'Changes required, reverting to planning',
      });

      expect(result.previousState).toBe('RELEASED');
      expect(result.newState).toBe('FORECAST');
    });

    it('should throw error for invalid state transition', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        state: 'FORECAST',
      });

      await expect(
        scheduleService.transitionScheduleState('schedule-1', {
          newState: 'COMPLETED',
        })
      ).rejects.toThrow('Invalid state transition from FORECAST to COMPLETED');
    });

    it('should throw error when schedule not found', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue(null);

      await expect(
        scheduleService.transitionScheduleState('non-existent', {
          newState: 'RELEASED',
        })
      ).rejects.toThrow('Production schedule with ID non-existent not found');
    });
  });

  describe('getScheduleStateHistory', () => {
    it('should get state history ordered by transition date descending', async () => {
      const mockHistory = [
        {
          id: 'history-2',
          scheduleId: 'schedule-1',
          previousState: 'FORECAST',
          newState: 'RELEASED',
          transitionDate: new Date('2025-01-15'),
        },
        {
          id: 'history-1',
          scheduleId: 'schedule-1',
          previousState: null,
          newState: 'FORECAST',
          transitionDate: new Date('2025-01-01'),
        },
      ];

      mockPrisma.scheduleStateHistory.findMany.mockResolvedValue(mockHistory);

      const result = await scheduleService.getScheduleStateHistory('schedule-1');

      expect(mockPrisma.scheduleStateHistory.findMany).toHaveBeenCalledWith({
        where: { scheduleId: 'schedule-1' },
        orderBy: { transitionDate: 'desc' },
      });

      expect(result).toHaveLength(2);
      expect(result[0].newState).toBe('RELEASED');
    });
  });

  // ========================================================================
  // SCHEDULING ALGORITHMS
  // ========================================================================

  describe('applyPrioritySequencing', () => {
    it('should sequence entries by priority and due date', async () => {
      const mockEntries = [
        { id: 'entry-1', priority: 'HIGH', customerDueDate: new Date('2025-01-20') },
        { id: 'entry-2', priority: 'NORMAL', customerDueDate: new Date('2025-01-15') },
        { id: 'entry-3', priority: 'HIGH', customerDueDate: new Date('2025-01-10') },
      ];

      mockPrisma.scheduleEntry.findMany.mockResolvedValue(mockEntries);
      mockPrisma.scheduleEntry.update.mockResolvedValue({});

      const result = await scheduleService.applyPrioritySequencing('schedule-1');

      expect(mockPrisma.scheduleEntry.findMany).toHaveBeenCalledWith({
        where: { scheduleId: 'schedule-1', isCancelled: false },
        orderBy: [
          { priority: 'desc' },
          { customerDueDate: 'asc' },
          { plannedStartDate: 'asc' },
        ],
      });

      expect(mockPrisma.scheduleEntry.update).toHaveBeenCalledTimes(3);
      expect(result).toBe(3);
    });
  });

  describe('applyEDDSequencing', () => {
    it('should sequence entries by earliest due date', async () => {
      const mockEntries = [
        { id: 'entry-1', customerDueDate: new Date('2025-01-20'), priority: 'NORMAL' },
        { id: 'entry-2', customerDueDate: new Date('2025-01-10'), priority: 'HIGH' },
      ];

      mockPrisma.scheduleEntry.findMany.mockResolvedValue(mockEntries);
      mockPrisma.scheduleEntry.update.mockResolvedValue({});

      const result = await scheduleService.applyEDDSequencing('schedule-1');

      expect(mockPrisma.scheduleEntry.findMany).toHaveBeenCalledWith({
        where: { scheduleId: 'schedule-1', isCancelled: false },
        orderBy: [
          { customerDueDate: 'asc' },
          { priority: 'desc' },
        ],
      });

      expect(result).toBe(2);
    });
  });

  describe('checkScheduleFeasibility', () => {
    it('should return feasible when all constraints satisfied', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        entries: [
          {
            id: 'entry-1',
            entryNumber: 1,
            constraints: [],
          },
        ],
      };

      mockPrisma.productionSchedule.findUnique.mockResolvedValue(mockSchedule);
      mockPrisma.productionSchedule.update.mockResolvedValue({});

      const result = await scheduleService.checkScheduleFeasibility('schedule-1');

      expect(result.isFeasible).toBe(true);
      expect(result.feasibilityIssues).toHaveLength(0);
    });

    it('should return infeasible when constraints violated', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        entries: [
          {
            id: 'entry-1',
            entryNumber: 1,
            constraints: [
              {
                id: 'constraint-1',
                constraintName: 'Material Availability',
                constraintType: 'MATERIAL',
                requiredQuantity: 100,
                availableQuantity: 50,
                unitOfMeasure: 'kg',
                isViolated: false,
              },
            ],
          },
        ],
      };

      mockPrisma.productionSchedule.findUnique.mockResolvedValue(mockSchedule);
      mockPrisma.scheduleConstraint.findUnique.mockResolvedValue(mockSchedule.entries[0].constraints[0]);
      mockPrisma.scheduleConstraint.update.mockResolvedValue({});
      mockPrisma.productionSchedule.update.mockResolvedValue({});

      const result = await scheduleService.checkScheduleFeasibility('schedule-1');

      expect(result.isFeasible).toBe(false);
      expect(result.feasibilityIssues.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // DISPATCH OPERATIONS
  // ========================================================================

  describe('dispatchScheduleEntry', () => {
    it('should dispatch entry and create work order', async () => {
      const mockEntry = {
        id: 'entry-1',
        entryNumber: 1,
        scheduleId: 'schedule-1',
        partId: 'part-1',
        plannedQuantity: 100,
        unitOfMeasure: 'EA',
        priority: 'NORMAL',
        customerDueDate: new Date('2025-02-01'),
        plannedEndDate: new Date('2025-01-31'),
        customerOrder: 'CO-12345',
        isDispatched: false,
        isCancelled: false,
        part: { id: 'part-1', partNumber: 'PN-001' },
        schedule: {
          id: 'schedule-1',
          scheduleNumber: 'SCH-2025-001',
          scheduleName: 'January Schedule',
          state: 'RELEASED',
        },
        routing: null,
      };

      const mockWorkOrder = {
        id: 'wo-1',
        orderNumber: 'WO-SCH-2025-001-1',
        partId: 'part-1',
        quantity: 100,
        unitOfMeasure: 'EA',
        priority: 'NORMAL',
        status: 'CREATED',
        dueDate: new Date('2025-02-01'),
      };

      mockPrisma.scheduleEntry.findUnique.mockResolvedValue(mockEntry);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'operator@example.com',
        email: 'operator@example.com',
      });
      mockPrisma.workOrder.create.mockResolvedValue(mockWorkOrder);
      mockPrisma.scheduleEntry.update.mockResolvedValue({ ...mockEntry, isDispatched: true });
      mockPrisma.productionSchedule.update.mockResolvedValue({});
      mockPrisma.productionSchedule.findUnique.mockResolvedValue(mockEntry.schedule);
      mockPrisma.scheduleStateHistory.create.mockResolvedValue({});

      const result = await scheduleService.dispatchScheduleEntry('entry-1', 'operator@example.com');

      expect(mockPrisma.workOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderNumber: 'WO-SCH-2025-001-1',
          partId: 'part-1',
          quantity: 100,
          priority: 'NORMAL',
          status: 'CREATED',
          customerOrder: 'CO-12345',
        }),
      });

      expect(mockPrisma.scheduleEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: expect.objectContaining({
          isDispatched: true,
          dispatchedBy: 'operator@example.com',
          dispatchedQuantity: 100,
          workOrderId: 'wo-1',
        }),
      });

      expect(result.workOrder.orderNumber).toBe('WO-SCH-2025-001-1');
    });

    it('should throw error when entry already dispatched', async () => {
      mockPrisma.scheduleEntry.findUnique.mockResolvedValue({
        isDispatched: true,
      });

      await expect(scheduleService.dispatchScheduleEntry('entry-1', 'user'))
        .rejects.toThrow('Schedule entry already dispatched');
    });

    it('should throw error when entry is cancelled', async () => {
      mockPrisma.scheduleEntry.findUnique.mockResolvedValue({
        isDispatched: false,
        isCancelled: true,
      });

      await expect(scheduleService.dispatchScheduleEntry('entry-1', 'user'))
        .rejects.toThrow('Cannot dispatch cancelled schedule entry');
    });

    it('should throw error when schedule not in valid state for dispatch', async () => {
      mockPrisma.scheduleEntry.findUnique.mockResolvedValue({
        isDispatched: false,
        isCancelled: false,
        schedule: { state: 'FORECAST' },
      });

      await expect(scheduleService.dispatchScheduleEntry('entry-1', 'user'))
        .rejects.toThrow('Cannot dispatch entry from schedule in FORECAST state');
    });
  });

  describe('dispatchAllEntries', () => {
    it('should dispatch all undispatched entries', async () => {
      const mockSchedule = {
        id: 'schedule-1',
        scheduleNumber: 'SCH-2025-001',
        state: 'RELEASED',
        entries: [
          {
            id: 'entry-1',
            entryNumber: 1,
            partId: 'part-1',
            plannedQuantity: 100,
            unitOfMeasure: 'EA',
            isDispatched: false,
            isCancelled: false,
          },
          {
            id: 'entry-2',
            entryNumber: 2,
            partId: 'part-2',
            plannedQuantity: 50,
            unitOfMeasure: 'EA',
            isDispatched: false,
            isCancelled: false,
          },
        ],
      };

      mockPrisma.productionSchedule.findUnique
        .mockResolvedValueOnce(mockSchedule)
        .mockResolvedValue({ state: 'RELEASED' });

      mockPrisma.scheduleEntry.findUnique
        .mockResolvedValueOnce({
          ...mockSchedule.entries[0],
          schedule: mockSchedule,
          part: {},
          routing: null,
        })
        .mockResolvedValueOnce({
          ...mockSchedule.entries[1],
          schedule: mockSchedule,
          part: {},
          routing: null,
        });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'operator@example.com',
        email: 'operator@example.com',
      });
      mockPrisma.workOrder.create.mockResolvedValue({ id: 'wo-1' });
      mockPrisma.scheduleEntry.update.mockResolvedValue({ isDispatched: true });
      mockPrisma.productionSchedule.update.mockResolvedValue({});
      mockPrisma.scheduleStateHistory.create.mockResolvedValue({});

      const result = await scheduleService.dispatchAllEntries('schedule-1', 'operator@example.com');

      expect(result.dispatchedCount).toBe(2);
      expect(result.entries).toHaveLength(2);
    });

    it('should throw error if schedule not in RELEASED state', async () => {
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        state: 'FORECAST',
      });

      await expect(scheduleService.dispatchAllEntries('schedule-1', 'user'))
        .rejects.toThrow('Cannot dispatch entries from schedule in FORECAST state');
    });
  });

  // ========================================================================
  // STATISTICS AND REPORTING
  // ========================================================================

  describe('getStatistics', () => {
    it('should calculate comprehensive scheduling statistics', async () => {
      mockPrisma.productionSchedule.count.mockResolvedValue(50);

      mockPrisma.productionSchedule.groupBy
        .mockResolvedValueOnce([
          { state: 'FORECAST', _count: 10 },
          { state: 'RELEASED', _count: 20 },
          { state: 'DISPATCHED', _count: 15 },
          { state: 'COMPLETED', _count: 5 },
        ])
        .mockResolvedValueOnce([
          { priority: 'LOW', _count: 10 },
          { priority: 'NORMAL', _count: 30 },
          { priority: 'HIGH', _count: 10 },
        ]);

      mockPrisma.scheduleEntry.count
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(120) // dispatched
        .mockResolvedValueOnce(15); // cancelled

      mockPrisma.scheduleConstraint.count
        .mockResolvedValueOnce(150) // total
        .mockResolvedValueOnce(20)  // violated
        .mockResolvedValueOnce(130); // resolved

      mockPrisma.scheduleStateHistory.count.mockResolvedValue(75);

      const result = await scheduleService.getStatistics();

      expect(result).toEqual({
        schedules: {
          total: 50,
          byState: {
            FORECAST: 10,
            RELEASED: 20,
            DISPATCHED: 15,
            COMPLETED: 5,
          },
          byPriority: {
            LOW: 10,
            NORMAL: 30,
            HIGH: 10,
          },
        },
        entries: {
          total: 200,
          dispatched: 120,
          cancelled: 15,
          pending: 65,
        },
        constraints: {
          total: 150,
          violated: 20,
          resolved: 130,
        },
        stateTransitions: {
          total: 75,
        },
      });
    });
  });

  describe('getSchedulesByState', () => {
    it('should get schedules filtered by state', async () => {
      const mockSchedules = [
        {
          id: 'schedule-1',
          scheduleNumber: 'SCH-001',
          state: 'RELEASED',
          priority: 'HIGH',
          site: {},
          entries: [],
        },
        {
          id: 'schedule-2',
          scheduleNumber: 'SCH-002',
          state: 'RELEASED',
          priority: 'NORMAL',
          site: {},
          entries: [],
        },
      ];

      mockPrisma.productionSchedule.findMany.mockResolvedValue(mockSchedules);

      const result = await scheduleService.getSchedulesByState('RELEASED');

      expect(mockPrisma.productionSchedule.findMany).toHaveBeenCalledWith({
        where: { state: 'RELEASED' },
        include: expect.objectContaining({
          site: true,
          entries: expect.any(Object),
        }),
        orderBy: [
          { priority: 'desc' },
          { periodStart: 'asc' },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result[0].state).toBe('RELEASED');
    });
  });

  describe('getEntriesReadyForDispatch', () => {
    it('should get entries ready for dispatch', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          isDispatched: false,
          isCancelled: false,
          priority: 'HIGH',
          part: {},
          workCenter: {},
          schedule: { state: 'RELEASED' },
          constraints: [],
        },
        {
          id: 'entry-2',
          isDispatched: false,
          isCancelled: false,
          priority: 'NORMAL',
          part: {},
          workCenter: {},
          schedule: { state: 'RELEASED' },
          constraints: [],
        },
      ];

      mockPrisma.scheduleEntry.findMany.mockResolvedValue(mockEntries);

      const result = await scheduleService.getEntriesReadyForDispatch();

      expect(mockPrisma.scheduleEntry.findMany).toHaveBeenCalledWith({
        where: {
          isDispatched: false,
          isCancelled: false,
          schedule: {
            state: 'RELEASED',
          },
        },
        include: expect.objectContaining({
          part: true,
          workCenter: true,
          schedule: true,
          constraints: expect.any(Object),
        }),
        orderBy: [
          { priority: 'desc' },
          { sequenceNumber: 'asc' },
          { customerDueDate: 'asc' },
        ],
      });

      expect(result).toHaveLength(2);
    });

    it('should filter by site when provided', async () => {
      mockPrisma.scheduleEntry.findMany.mockResolvedValue([]);

      await scheduleService.getEntriesReadyForDispatch('site-1');

      expect(mockPrisma.scheduleEntry.findMany).toHaveBeenCalledWith({
        where: {
          isDispatched: false,
          isCancelled: false,
          schedule: {
            state: 'RELEASED',
            siteId: 'site-1',
          },
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });
  });

  // ========================================================================
  // INTEGRATION AND EDGE CASES
  // ========================================================================

  describe('Integration Tests', () => {
    it('should create schedule with entries and constraints', async () => {
      // Create schedule
      const mockSchedule = {
        id: 'schedule-1',
        scheduleNumber: 'SCH-INT-001',
        state: 'FORECAST',
        totalEntries: 0,
        entries: [],
        stateHistory: [],
      };

      mockPrisma.productionSchedule.create.mockResolvedValue(mockSchedule);
      mockPrisma.productionSchedule.findUnique.mockResolvedValue(mockSchedule);
      mockPrisma.scheduleStateHistory.create.mockResolvedValue({});

      const schedule = await scheduleService.createSchedule({
        scheduleNumber: 'SCH-INT-001',
        scheduleName: 'Integration Test Schedule',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
      });

      // Add entry
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        state: 'FORECAST',
        isLocked: false,
        totalEntries: 0,
      });

      const mockEntry = {
        id: 'entry-1',
        scheduleId: schedule.id,
        entryNumber: 1,
        part: {},
        workCenter: null,
        routing: null,
        constraints: [],
      };

      mockPrisma.scheduleEntry.create.mockResolvedValue(mockEntry);
      mockPrisma.productionSchedule.update.mockResolvedValue({});

      const entry = await scheduleService.addScheduleEntry(schedule.id, {
        partId: 'part-1',
        partNumber: 'PN-001',
        plannedQuantity: 100,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date('2025-01-15'),
        plannedEndDate: new Date('2025-01-20'),
      });

      // Add constraint
      const mockConstraint = {
        id: 'constraint-1',
        entryId: entry.id,
        constraintType: 'MATERIAL',
        isViolated: false,
      };

      mockPrisma.scheduleConstraint.create.mockResolvedValue(mockConstraint);
      mockPrisma.scheduleConstraint.findUnique.mockResolvedValue(mockConstraint);

      const constraint = await scheduleService.addConstraint(entry.id, {
        constraintType: 'MATERIAL',
        constraintName: 'Raw Material',
        requiredQuantity: 500,
        availableQuantity: 600,
        unitOfMeasure: 'kg',
      });

      expect(schedule.scheduleNumber).toBe('SCH-INT-001');
      expect(entry.entryNumber).toBe(1);
      expect(constraint.constraintType).toBe('MATERIAL');
    });

    it('should handle full lifecycle from FORECAST to COMPLETED', async () => {
      // Start in FORECAST
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        state: 'FORECAST',
        totalEntries: 5,
        isLocked: false,
      });
      mockPrisma.scheduleStateHistory.create.mockResolvedValue({
        previousState: 'FORECAST',
        newState: 'RELEASED',
      });
      mockPrisma.productionSchedule.update.mockResolvedValue({});

      // FORECAST → RELEASED
      const released = await scheduleService.transitionScheduleState('schedule-1', {
        newState: 'RELEASED',
      });
      expect(released.newState).toBe('RELEASED');

      // RELEASED → DISPATCHED
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        state: 'RELEASED',
        totalEntries: 5,
      });
      mockPrisma.scheduleStateHistory.create.mockResolvedValue({
        previousState: 'RELEASED',
        newState: 'DISPATCHED',
      });

      const dispatched = await scheduleService.transitionScheduleState('schedule-1', {
        newState: 'DISPATCHED',
      });
      expect(dispatched.newState).toBe('DISPATCHED');

      // DISPATCHED → RUNNING
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        state: 'DISPATCHED',
        totalEntries: 5,
      });
      mockPrisma.scheduleStateHistory.create.mockResolvedValue({
        previousState: 'DISPATCHED',
        newState: 'RUNNING',
      });

      const running = await scheduleService.transitionScheduleState('schedule-1', {
        newState: 'RUNNING',
      });
      expect(running.newState).toBe('RUNNING');

      // RUNNING → COMPLETED
      mockPrisma.productionSchedule.findUnique.mockResolvedValue({
        state: 'RUNNING',
        totalEntries: 5,
      });
      mockPrisma.scheduleStateHistory.create.mockResolvedValue({
        previousState: 'RUNNING',
        newState: 'COMPLETED',
      });

      const completed = await scheduleService.transitionScheduleState('schedule-1', {
        newState: 'COMPLETED',
      });
      expect(completed.newState).toBe('COMPLETED');
    });
  });

  describe('Edge Cases', () => {
    it('should handle schedule with no entries', async () => {
      mockPrisma.scheduleEntry.findMany.mockResolvedValue([]);

      const result = await scheduleService.getScheduleEntries('schedule-empty');

      expect(result).toEqual([]);
    });

    it('should handle entry with no constraints', async () => {
      mockPrisma.scheduleConstraint.findMany.mockResolvedValue([]);

      const result = await scheduleService.getEntryConstraints('entry-no-constraints');

      expect(result).toEqual([]);
    });

    it('should handle constraint with missing quantities', async () => {
      const mockConstraint = {
        id: 'constraint-1',
        constraintType: 'CAPACITY',
        requiredQuantity: null,
        availableQuantity: null,
        isViolated: false,
      };

      mockPrisma.scheduleConstraint.findUnique.mockResolvedValue(mockConstraint);

      const result = await scheduleService.checkConstraintViolation('constraint-1');

      expect(result.isViolated).toBe(false);
    });

    it('should handle date constraint at risk (within 3 days)', async () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 2); // 2 days from now

      const mockConstraint = {
        id: 'constraint-1',
        constraintType: 'DATE',
        constraintDate: soonDate,
        isViolated: false,
      };

      mockPrisma.scheduleConstraint.findUnique.mockResolvedValue(mockConstraint);
      mockPrisma.scheduleConstraint.update.mockResolvedValue({});

      const result = await scheduleService.checkConstraintViolation('constraint-1');

      expect(result.isViolated).toBe(true);
      expect(result.violationSeverity).toBe('MEDIUM');
      expect(result.violationMessage).toContain('at risk');
    });

    it('should handle empty schedule history', async () => {
      mockPrisma.scheduleStateHistory.findMany.mockResolvedValue([]);

      const result = await scheduleService.getScheduleStateHistory('schedule-new');

      expect(result).toEqual([]);
    });
  });
});
