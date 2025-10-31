/**
 * Unit Tests: TimeTrackingService
 * Comprehensive tests for the time tracking service functionality
 *
 * GitHub Issue #46: Time Tracking Infrastructure
 */

import { TimeTrackingService, ClockInRequest, ClockOutRequest } from '../../services/TimeTrackingService';
import { PrismaClient } from '@prisma/client';
import {
  TimeType,
  TimeEntrySource,
  TimeEntryStatus,
  TimeTrackingGranularity,
  CostingModel,
  IndirectCategory
} from '@prisma/client';

// Mock Prisma Client
import { vi } from 'vitest';

// Mock the database import directly with the proven pattern
vi.mock('../../lib/database', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    laborTimeEntry: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    machineTimeEntry: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    timeTrackingConfiguration: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    equipment: {
      findUnique: vi.fn(),
    },
    indirectCostCode: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import prisma from '../../lib/database';

describe('TimeTrackingService', () => {
  let service: TimeTrackingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = prisma as any;
    // Create a new service instance for each test
    service = new TimeTrackingService();
    vi.clearAllMocks();
  });

  describe('clockIn', () => {
    const mockUser = {
      id: 'user-1',
      username: 'test.operator',
      laborRate: 25.0,
      costCenter: 'PRODUCTION',
      personnelClassId: 'operator-class',
      userSiteRoles: [{
        site: { id: 'site-1' }
      }]
    };

    const mockConfig = {
      id: 'config-1',
      siteId: 'site-1',
      timeTrackingEnabled: true,
      trackingGranularity: TimeTrackingGranularity.OPERATION,
      allowMultiTasking: false,
      requireTimeApproval: true,
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.timeTrackingConfiguration.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.laborTimeEntry.findMany.mockResolvedValue([]); // No active entries
    });

    it('should successfully clock in to a work order', async () => {
      const clockInRequest: ClockInRequest = {
        userId: 'user-1',
        workOrderId: 'wo-123',
        entrySource: TimeEntrySource.MANUAL,
      };

      const expectedTimeEntry = {
        id: 'entry-1',
        userId: 'user-1',
        workOrderId: 'wo-123',
        timeType: TimeType.DIRECT_LABOR,
        clockInTime: new Date(),
        status: TimeEntryStatus.ACTIVE,
        laborRate: 25.0,
        costCenter: 'PRODUCTION',
      };

      mockPrisma.laborTimeEntry.create.mockResolvedValue(expectedTimeEntry);

      const result = await service.clockIn(clockInRequest);

      expect(mockPrisma.laborTimeEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          workOrderId: 'wo-123',
          timeType: TimeType.DIRECT_LABOR,
          entrySource: TimeEntrySource.MANUAL,
          status: TimeEntryStatus.ACTIVE,
          laborRate: 25.0,
          costCenter: 'PRODUCTION',
        }),
        include: expect.any(Object),
      });

      expect(result).toEqual(expectedTimeEntry);
    });

    it('should successfully clock in to an operation', async () => {
      const clockInRequest: ClockInRequest = {
        userId: 'user-1',
        operationId: 'op-456',
        entrySource: TimeEntrySource.KIOSK,
        deviceId: 'kiosk-001',
      };

      const expectedTimeEntry = {
        id: 'entry-2',
        userId: 'user-1',
        operationId: 'op-456',
        timeType: TimeType.DIRECT_LABOR,
        entrySource: TimeEntrySource.KIOSK,
        deviceId: 'kiosk-001',
      };

      mockPrisma.laborTimeEntry.create.mockResolvedValue(expectedTimeEntry);

      const result = await service.clockIn(clockInRequest);

      expect(mockPrisma.laborTimeEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operationId: 'op-456',
          entrySource: TimeEntrySource.KIOSK,
          deviceId: 'kiosk-001',
        }),
        include: expect.any(Object),
      });
    });

    it('should successfully clock in to indirect activity', async () => {
      const clockInRequest: ClockInRequest = {
        userId: 'user-1',
        indirectCodeId: 'break-15',
      };

      const expectedTimeEntry = {
        id: 'entry-3',
        userId: 'user-1',
        indirectCodeId: 'break-15',
        timeType: TimeType.INDIRECT,
      };

      mockPrisma.laborTimeEntry.create.mockResolvedValue(expectedTimeEntry);

      const result = await service.clockIn(clockInRequest);

      expect(mockPrisma.laborTimeEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          indirectCodeId: 'break-15',
          timeType: TimeType.INDIRECT,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const clockInRequest: ClockInRequest = {
        userId: 'invalid-user',
        workOrderId: 'wo-123',
      };

      await expect(service.clockIn(clockInRequest)).rejects.toThrow('User invalid-user not found');
    });

    it('should throw error if time tracking is disabled', async () => {
      mockPrisma.timeTrackingConfiguration.findUnique.mockResolvedValue({
        ...mockConfig,
        timeTrackingEnabled: false,
      });

      const clockInRequest: ClockInRequest = {
        userId: 'user-1',
        workOrderId: 'wo-123',
      };

      await expect(service.clockIn(clockInRequest)).rejects.toThrow('Time tracking is disabled for this site');
    });

    it('should throw error if multi-tasking not allowed and user has active entry', async () => {
      const activeEntry = {
        id: 'active-1',
        userId: 'user-1',
        workOrderId: 'wo-999',
        status: TimeEntryStatus.ACTIVE,
      };

      mockPrisma.laborTimeEntry.findMany.mockResolvedValue([activeEntry]);

      const clockInRequest: ClockInRequest = {
        userId: 'user-1',
        workOrderId: 'wo-123',
      };

      await expect(service.clockIn(clockInRequest)).rejects.toThrow(
        'Cannot clock in. Active time entry exists for work order wo-999'
      );
    });

    it('should throw error if operation-level tracking not enabled', async () => {
      mockPrisma.timeTrackingConfiguration.findUnique.mockResolvedValue({
        ...mockConfig,
        trackingGranularity: TimeTrackingGranularity.WORK_ORDER,
      });

      const clockInRequest: ClockInRequest = {
        userId: 'user-1',
        operationId: 'op-456',
      };

      await expect(service.clockIn(clockInRequest)).rejects.toThrow(
        'Operation-level tracking not enabled for this site'
      );
    });

    it('should throw error if no work order, operation, or indirect code provided', async () => {
      const clockInRequest: ClockInRequest = {
        userId: 'user-1',
      };

      await expect(service.clockIn(clockInRequest)).rejects.toThrow(
        'Must provide either work order, operation, or indirect code'
      );
    });
  });

  describe('clockOut', () => {
    const mockActiveEntry = {
      id: 'entry-1',
      userId: 'user-1',
      workOrderId: 'wo-123',
      status: TimeEntryStatus.ACTIVE,
      clockInTime: new Date('2024-10-29T08:00:00Z'),
      laborRate: 25.0,
      user: {
        userSiteRoles: [{
          site: { id: 'site-1' }
        }]
      }
    };

    const mockConfig = {
      siteId: 'site-1',
      autoSubtractBreaks: false,
      requireTimeApproval: true,
    };

    beforeEach(() => {
      mockPrisma.laborTimeEntry.findUnique.mockResolvedValue(mockActiveEntry);
      mockPrisma.timeTrackingConfiguration.findUnique.mockResolvedValue(mockConfig);
    });

    it('should successfully clock out and calculate duration', async () => {
      const clockOutTime = new Date('2024-10-29T16:00:00Z'); // 8 hours later
      const clockOutRequest: ClockOutRequest = {
        timeEntryId: 'entry-1',
        clockOutTime,
      };

      const expectedUpdatedEntry = {
        ...mockActiveEntry,
        clockOutTime,
        duration: 8.0,
        laborCost: 200.0, // 8 hours * $25/hour
        status: TimeEntryStatus.PENDING_APPROVAL,
      };

      mockPrisma.laborTimeEntry.update.mockResolvedValue(expectedUpdatedEntry);

      const result = await service.clockOut(clockOutRequest);

      expect(mockPrisma.laborTimeEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: {
          clockOutTime,
          duration: 8.0,
          laborCost: 200.0,
          status: TimeEntryStatus.PENDING_APPROVAL,
        },
        include: expect.any(Object),
      });

      expect(result).toEqual(expectedUpdatedEntry);
    });

    it('should use current time if clockOutTime not provided', async () => {
      const clockOutRequest: ClockOutRequest = {
        timeEntryId: 'entry-1',
      };

      const mockCurrentTime = new Date('2024-10-29T12:00:00Z');
      const dateSpy = vi.spyOn(global, 'Date').mockImplementation(() => mockCurrentTime as any);

      await service.clockOut(clockOutRequest);

      expect(mockPrisma.laborTimeEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: expect.objectContaining({
          clockOutTime: mockCurrentTime,
        }),
        include: expect.any(Object),
      });

      // Restore the Date constructor to prevent affecting subsequent tests
      dateSpy.mockRestore();
    });

    it('should subtract break time when configured', async () => {
      mockPrisma.timeTrackingConfiguration.findUnique.mockResolvedValue({
        ...mockConfig,
        autoSubtractBreaks: true,
        standardBreakMinutes: 30, // 0.5 hours
      });

      const clockOutTime = new Date('2024-10-29T16:00:00Z'); // 8 hours total
      const clockOutRequest: ClockOutRequest = {
        timeEntryId: 'entry-1',
        clockOutTime,
      };

      await service.clockOut(clockOutRequest);

      expect(mockPrisma.laborTimeEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: expect.objectContaining({
          duration: 7.5, // 8 hours - 0.5 hour break
          laborCost: 187.5, // 7.5 hours * $25/hour
        }),
        include: expect.any(Object),
      });
    });

    it('should set status to COMPLETED when approval not required', async () => {
      mockPrisma.timeTrackingConfiguration.findUnique.mockResolvedValue({
        ...mockConfig,
        requireTimeApproval: false,
      });

      const clockOutRequest: ClockOutRequest = {
        timeEntryId: 'entry-1',
      };

      await service.clockOut(clockOutRequest);

      expect(mockPrisma.laborTimeEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: expect.objectContaining({
          status: TimeEntryStatus.COMPLETED,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw error if time entry not found', async () => {
      mockPrisma.laborTimeEntry.findUnique.mockResolvedValue(null);

      const clockOutRequest: ClockOutRequest = {
        timeEntryId: 'invalid-entry',
      };

      await expect(service.clockOut(clockOutRequest)).rejects.toThrow('Time entry invalid-entry not found');
    });

    it('should throw error if time entry is not active', async () => {
      mockPrisma.laborTimeEntry.findUnique.mockResolvedValue({
        ...mockActiveEntry,
        status: TimeEntryStatus.COMPLETED,
      });

      const clockOutRequest: ClockOutRequest = {
        timeEntryId: 'entry-1',
      };

      await expect(service.clockOut(clockOutRequest)).rejects.toThrow(
        'Time entry is not active (status: COMPLETED)'
      );
    });
  });

  describe('getActiveTimeEntries', () => {
    it('should return active time entries for user', async () => {
      const mockActiveEntries = [
        {
          id: 'entry-1',
          userId: 'user-1',
          workOrderId: 'wo-123',
          status: TimeEntryStatus.ACTIVE,
        },
        {
          id: 'entry-2',
          userId: 'user-1',
          operationId: 'op-456',
          status: TimeEntryStatus.ACTIVE,
        },
      ];

      mockPrisma.laborTimeEntry.findMany.mockResolvedValue(mockActiveEntries);

      const result = await service.getActiveTimeEntries('user-1');

      expect(mockPrisma.laborTimeEntry.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: TimeEntryStatus.ACTIVE,
        },
        include: expect.any(Object),
        orderBy: {
          clockInTime: 'desc'
        }
      });

      expect(result).toEqual(mockActiveEntries);
    });

    it('should return empty array if no active entries', async () => {
      mockPrisma.laborTimeEntry.findMany.mockResolvedValue([]);

      const result = await service.getActiveTimeEntries('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('stopAllActiveEntries', () => {
    it('should stop all active entries for user', async () => {
      const mockActiveEntries = [
        {
          id: 'entry-1',
          userId: 'user-1',
          status: TimeEntryStatus.ACTIVE,
          clockInTime: new Date(),
          laborRate: 25.0,
          user: {
            userSiteRoles: [{ site: { id: 'site-1' } }]
          }
        },
        {
          id: 'entry-2',
          userId: 'user-1',
          status: TimeEntryStatus.ACTIVE,
          clockInTime: new Date(),
          laborRate: 25.0,
          user: {
            userSiteRoles: [{ site: { id: 'site-1' } }]
          }
        },
      ];

      const mockConfig = {
        siteId: 'site-1',
        autoSubtractBreaks: false,
        requireTimeApproval: false,
      };

      // Mock the sequence of calls
      mockPrisma.laborTimeEntry.findMany.mockResolvedValue(mockActiveEntries);
      mockPrisma.timeTrackingConfiguration.findUnique.mockResolvedValue(mockConfig);

      // Mock findUnique for each clockOut call
      mockPrisma.laborTimeEntry.findUnique
        .mockResolvedValueOnce(mockActiveEntries[0])
        .mockResolvedValueOnce(mockActiveEntries[1]);

      // Mock update for each clockOut call
      mockPrisma.laborTimeEntry.update
        .mockResolvedValueOnce({ ...mockActiveEntries[0], status: TimeEntryStatus.COMPLETED })
        .mockResolvedValueOnce({ ...mockActiveEntries[1], status: TimeEntryStatus.COMPLETED })
        .mockResolvedValueOnce({ id: 'entry-1' }) // For edit reason update
        .mockResolvedValueOnce({ id: 'entry-2' }); // For edit reason update

      const result = await service.stopAllActiveEntries('user-1', 'Emergency stop');

      expect(result).toHaveLength(2);
      expect(mockPrisma.laborTimeEntry.update).toHaveBeenCalledTimes(4); // 2 clockouts + 2 edit reason updates
    });
  });

  describe('validateTimeEntry', () => {
    const mockTimeEntry = {
      id: 'entry-1',
      userId: 'user-1',
      clockInTime: new Date('2024-10-29T08:00:00Z'),
      clockOutTime: new Date('2024-10-29T16:00:00Z'),
      duration: 8.0,
      status: TimeEntryStatus.COMPLETED,
    } as any;

    it('should validate a good time entry', async () => {
      mockPrisma.laborTimeEntry.findMany.mockResolvedValue([]); // No overlapping entries

      const result = await service.validateTimeEntry(mockTimeEntry);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should detect duration too long', async () => {
      const longEntry = {
        ...mockTimeEntry,
        duration: 25.0, // More than 24 hours
      };

      const result = await service.validateTimeEntry(longEntry);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Time entry duration cannot exceed 24 hours');
    });

    it('should detect negative duration', async () => {
      const negativeEntry = {
        ...mockTimeEntry,
        duration: -1.0,
      };

      const result = await service.validateTimeEntry(negativeEntry);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Time entry duration cannot be negative');
    });

    it('should warn about long active entries', async () => {
      const now = new Date();
      const longActiveEntry = {
        ...mockTimeEntry,
        status: TimeEntryStatus.ACTIVE,
        clockInTime: new Date(now.getTime() - 17 * 60 * 60 * 1000), // 17 hours ago
        clockOutTime: null,
      };

      const result = await service.validateTimeEntry(longActiveEntry);

      expect(result.warnings).toContain('Time entry has been active for more than 16 hours');
    });

    it('should detect overlapping entries', async () => {
      const overlappingEntry = {
        id: 'other-entry',
        userId: 'user-1',
        clockInTime: new Date('2024-10-29T07:00:00Z'),
        clockOutTime: new Date('2024-10-29T09:00:00Z'), // Overlaps with mock entry
      };

      mockPrisma.laborTimeEntry.findMany.mockResolvedValue([overlappingEntry]);

      const result = await service.validateTimeEntry(mockTimeEntry);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Time entry overlaps with existing entries');
    });
  });

  describe('calculateLaborCost', () => {
    it('should calculate labor cost correctly', async () => {
      const mockEntry = {
        id: 'entry-1',
        duration: 8.0,
        laborRate: 25.0,
        user: { laborRate: 30.0 },
      };

      mockPrisma.laborTimeEntry.findUnique.mockResolvedValue(mockEntry);

      const result = await service.calculateLaborCost('entry-1');

      expect(result).toBe(200.0); // 8 hours * $25/hour (entry rate takes precedence)
    });

    it('should use user rate if entry rate not set', async () => {
      const mockEntry = {
        id: 'entry-1',
        duration: 6.0,
        laborRate: null,
        user: { laborRate: 30.0 },
      };

      mockPrisma.laborTimeEntry.findUnique.mockResolvedValue(mockEntry);

      const result = await service.calculateLaborCost('entry-1');

      expect(result).toBe(180.0); // 6 hours * $30/hour
    });

    it('should return 0 if entry not found', async () => {
      mockPrisma.laborTimeEntry.findUnique.mockResolvedValue(null);

      const result = await service.calculateLaborCost('invalid-entry');

      expect(result).toBe(0);
    });

    it('should return 0 if no duration', async () => {
      const mockEntry = {
        id: 'entry-1',
        duration: null,
        laborRate: 25.0,
        user: { laborRate: 30.0 },
      };

      mockPrisma.laborTimeEntry.findUnique.mockResolvedValue(mockEntry);

      const result = await service.calculateLaborCost('entry-1');

      expect(result).toBe(0);
    });
  });

  describe('getTimeEntries', () => {
    it('should return filtered time entries with pagination', async () => {
      const mockEntries = [
        { id: 'entry-1', userId: 'user-1', workOrderId: 'wo-123' },
        { id: 'entry-2', userId: 'user-1', operationId: 'op-456' },
      ];

      mockPrisma.laborTimeEntry.findMany.mockResolvedValue(mockEntries);
      mockPrisma.laborTimeEntry.count.mockResolvedValue(25);

      const filters = {
        userId: 'user-1',
        status: TimeEntryStatus.COMPLETED,
        limit: 10,
        offset: 0,
      };

      const result = await service.getTimeEntries(filters);

      expect(mockPrisma.laborTimeEntry.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: TimeEntryStatus.COMPLETED,
        },
        include: expect.any(Object),
        orderBy: { clockInTime: 'desc' },
        take: 10,
        skip: 0,
      });

      expect(result).toEqual({
        entries: mockEntries,
        total: 25,
        hasMore: true,
      });
    });

    it('should handle date range filters', async () => {
      const startDate = new Date('2024-10-01');
      const endDate = new Date('2024-10-31');

      const filters = {
        startDate,
        endDate,
      };

      mockPrisma.laborTimeEntry.findMany.mockResolvedValue([]);
      mockPrisma.laborTimeEntry.count.mockResolvedValue(0);

      await service.getTimeEntries(filters);

      expect(mockPrisma.laborTimeEntry.findMany).toHaveBeenCalledWith({
        where: {
          clockInTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: expect.any(Object),
        orderBy: { clockInTime: 'desc' },
        take: 50,
        skip: 0,
      });
    });
  });
});