// GitHub Issue #94: Equipment Registry & Maintenance Management System
// DowntimeService Unit Tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DowntimeService } from '@/services/DowntimeService';
import { DowntimeCategory, DowntimeImpact } from '@prisma/client';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  default: {
    downtimeEvent: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    downtimeReason: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    equipment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('DowntimeService', () => {
  let downtimeService: DowntimeService;

  beforeEach(() => {
    downtimeService = new DowntimeService();
    vi.clearAllMocks();
  });

  describe('validateDowntimeEventData', () => {
    it('should pass validation for valid downtime event data', () => {
      const validData = {
        equipmentId: 'eq-123',
        downtimeReasonId: 'reason-456',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        description: 'Hydraulic system failure',
        impact: DowntimeImpact.HIGH,
        estimatedRepairTime: 120,
        reportedById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeEventData(validData)).not.toThrow();
    });

    it('should accept undefined end time for ongoing downtime', () => {
      const validData = {
        equipmentId: 'eq-123',
        downtimeReasonId: 'reason-456',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: undefined,
        description: 'Hydraulic system failure',
        reportedById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeEventData(validData)).not.toThrow();
    });

    it('should reject end time before start time', () => {
      const invalidData = {
        equipmentId: 'eq-123',
        downtimeReasonId: 'reason-456',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T08:00:00Z'), // Before start time
        reportedById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeEventData(invalidData))
        .toThrow('End time must be after start time');
    });

    it('should reject same start and end time', () => {
      const sameTime = new Date('2024-01-01T10:00:00Z');
      const invalidData = {
        equipmentId: 'eq-123',
        downtimeReasonId: 'reason-456',
        startTime: sameTime,
        endTime: sameTime,
        reportedById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeEventData(invalidData))
        .toThrow('End time must be after start time');
    });

    it('should reject negative estimated repair time', () => {
      const invalidData = {
        equipmentId: 'eq-123',
        downtimeReasonId: 'reason-456',
        startTime: new Date('2024-01-01T08:00:00Z'),
        estimatedRepairTime: -60,
        reportedById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeEventData(invalidData))
        .toThrow('Estimated repair time must be positive');
    });

    it('should reject zero estimated repair time', () => {
      const invalidData = {
        equipmentId: 'eq-123',
        downtimeReasonId: 'reason-456',
        startTime: new Date('2024-01-01T08:00:00Z'),
        estimatedRepairTime: 0,
        reportedById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeEventData(invalidData))
        .toThrow('Estimated repair time must be positive');
    });

    it('should accept undefined estimated repair time', () => {
      const validData = {
        equipmentId: 'eq-123',
        downtimeReasonId: 'reason-456',
        startTime: new Date('2024-01-01T08:00:00Z'),
        estimatedRepairTime: undefined,
        reportedById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeEventData(validData)).not.toThrow();
    });

    it('should reject negative actual repair time', () => {
      const invalidData = {
        equipmentId: 'eq-123',
        downtimeReasonId: 'reason-456',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        actualRepairTime: -30,
        reportedById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeEventData(invalidData))
        .toThrow('Actual repair time must be positive');
    });

    it('should accept zero actual repair time', () => {
      const validData = {
        equipmentId: 'eq-123',
        downtimeReasonId: 'reason-456',
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        actualRepairTime: 0,
        reportedById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeEventData(validData)).not.toThrow();
    });
  });

  describe('validateDowntimeReasonData', () => {
    it('should pass validation for valid downtime reason data', () => {
      const validData = {
        code: 'HYDR-FAIL',
        name: 'Hydraulic System Failure',
        description: 'Failure in hydraulic system components',
        category: DowntimeCategory.EQUIPMENT_FAILURE,
        isActive: true,
        createdById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeReasonData(validData)).not.toThrow();
    });

    it('should reject empty reason code', () => {
      const invalidData = {
        code: '',
        name: 'Hydraulic System Failure',
        category: DowntimeCategory.EQUIPMENT_FAILURE,
        createdById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeReasonData(invalidData))
        .toThrow('Downtime reason code is required');
    });

    it('should reject whitespace-only reason code', () => {
      const invalidData = {
        code: '   ',
        name: 'Hydraulic System Failure',
        category: DowntimeCategory.EQUIPMENT_FAILURE,
        createdById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeReasonData(invalidData))
        .toThrow('Downtime reason code is required');
    });

    it('should reject reason code exceeding 50 characters', () => {
      const invalidData = {
        code: 'A'.repeat(51),
        name: 'Hydraulic System Failure',
        category: DowntimeCategory.EQUIPMENT_FAILURE,
        createdById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeReasonData(invalidData))
        .toThrow('Downtime reason code cannot exceed 50 characters');
    });

    it('should reject empty reason name', () => {
      const invalidData = {
        code: 'HYDR-FAIL',
        name: '',
        category: DowntimeCategory.EQUIPMENT_FAILURE,
        createdById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeReasonData(invalidData))
        .toThrow('Downtime reason name is required');
    });

    it('should reject whitespace-only reason name', () => {
      const invalidData = {
        code: 'HYDR-FAIL',
        name: '   ',
        category: DowntimeCategory.EQUIPMENT_FAILURE,
        createdById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeReasonData(invalidData))
        .toThrow('Downtime reason name is required');
    });

    it('should reject reason name exceeding 255 characters', () => {
      const invalidData = {
        code: 'HYDR-FAIL',
        name: 'A'.repeat(256),
        category: DowntimeCategory.EQUIPMENT_FAILURE,
        createdById: 'user-123',
      };

      expect(() => downtimeService.validateDowntimeReasonData(invalidData))
        .toThrow('Downtime reason name cannot exceed 255 characters');
    });
  });

  describe('calculateDowntimeDuration', () => {
    it('should calculate duration correctly for completed downtime', () => {
      const startTime = new Date('2024-01-01T08:00:00Z');
      const endTime = new Date('2024-01-01T12:00:00Z');

      const duration = downtimeService.calculateDowntimeDuration(startTime, endTime);
      expect(duration).toBe(240); // 4 hours = 240 minutes
    });

    it('should handle downtime spanning multiple days', () => {
      const startTime = new Date('2024-01-01T23:00:00Z');
      const endTime = new Date('2024-01-02T01:00:00Z');

      const duration = downtimeService.calculateDowntimeDuration(startTime, endTime);
      expect(duration).toBe(120); // 2 hours = 120 minutes
    });

    it('should handle fractional minutes correctly', () => {
      const startTime = new Date('2024-01-01T08:00:00Z');
      const endTime = new Date('2024-01-01T08:30:30Z'); // 30.5 minutes

      const duration = downtimeService.calculateDowntimeDuration(startTime, endTime);
      expect(duration).toBeCloseTo(30.5, 1);
    });

    it('should handle same start and end time', () => {
      const sameTime = new Date('2024-01-01T08:00:00Z');

      const duration = downtimeService.calculateDowntimeDuration(sameTime, sameTime);
      expect(duration).toBe(0);
    });

    it('should calculate duration from start to current time when no end time', () => {
      const startTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const currentTime = new Date();

      const duration = downtimeService.calculateDowntimeDuration(startTime, undefined, currentTime);
      expect(duration).toBeCloseTo(60, 1); // Approximately 60 minutes
    });

    it('should use current time when both end time and current time are undefined', () => {
      const startTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

      const duration = downtimeService.calculateDowntimeDuration(startTime);
      expect(duration).toBeCloseTo(30, 1); // Approximately 30 minutes
    });
  });

  describe('calculateMTTR', () => {
    it('should calculate MTTR correctly with multiple repairs', () => {
      const downtimeEvents = [
        { startTime: new Date('2024-01-01T08:00:00Z'), endTime: new Date('2024-01-01T10:00:00Z') }, // 120 min
        { startTime: new Date('2024-01-01T14:00:00Z'), endTime: new Date('2024-01-01T15:30:00Z') }, // 90 min
        { startTime: new Date('2024-01-02T09:00:00Z'), endTime: new Date('2024-01-02T10:00:00Z') }, // 60 min
      ];

      const mttr = downtimeService.calculateMTTR(downtimeEvents);
      expect(mttr).toBe(90); // (120 + 90 + 60) / 3
    });

    it('should return null for empty events list', () => {
      const mttr = downtimeService.calculateMTTR([]);
      expect(mttr).toBeNull();
    });

    it('should exclude ongoing downtime events', () => {
      const downtimeEvents = [
        { startTime: new Date('2024-01-01T08:00:00Z'), endTime: new Date('2024-01-01T10:00:00Z') }, // 120 min
        { startTime: new Date('2024-01-01T14:00:00Z'), endTime: null }, // Ongoing, should be excluded
        { startTime: new Date('2024-01-02T09:00:00Z'), endTime: new Date('2024-01-02T10:00:00Z') }, // 60 min
      ];

      const mttr = downtimeService.calculateMTTR(downtimeEvents);
      expect(mttr).toBe(90); // (120 + 60) / 2
    });

    it('should handle single repair event', () => {
      const downtimeEvents = [
        { startTime: new Date('2024-01-01T08:00:00Z'), endTime: new Date('2024-01-01T10:00:00Z') }, // 120 min
      ];

      const mttr = downtimeService.calculateMTTR(downtimeEvents);
      expect(mttr).toBe(120);
    });

    it('should return null when all events are ongoing', () => {
      const downtimeEvents = [
        { startTime: new Date('2024-01-01T08:00:00Z'), endTime: null },
        { startTime: new Date('2024-01-01T14:00:00Z'), endTime: undefined },
      ];

      const mttr = downtimeService.calculateMTTR(downtimeEvents);
      expect(mttr).toBeNull();
    });
  });

  describe('calculateTotalDowntime', () => {
    it('should calculate total downtime correctly', () => {
      const downtimeEvents = [
        { startTime: new Date('2024-01-01T08:00:00Z'), endTime: new Date('2024-01-01T10:00:00Z') }, // 120 min
        { startTime: new Date('2024-01-01T14:00:00Z'), endTime: new Date('2024-01-01T15:30:00Z') }, // 90 min
        { startTime: new Date('2024-01-02T09:00:00Z'), endTime: new Date('2024-01-02T10:00:00Z') }, // 60 min
      ];

      const totalDowntime = downtimeService.calculateTotalDowntime(downtimeEvents);
      expect(totalDowntime).toBe(270); // 120 + 90 + 60
    });

    it('should return 0 for empty events list', () => {
      const totalDowntime = downtimeService.calculateTotalDowntime([]);
      expect(totalDowntime).toBe(0);
    });

    it('should exclude ongoing downtime events', () => {
      const downtimeEvents = [
        { startTime: new Date('2024-01-01T08:00:00Z'), endTime: new Date('2024-01-01T10:00:00Z') }, // 120 min
        { startTime: new Date('2024-01-01T14:00:00Z'), endTime: null }, // Ongoing, should be excluded
        { startTime: new Date('2024-01-02T09:00:00Z'), endTime: new Date('2024-01-02T10:00:00Z') }, // 60 min
      ];

      const totalDowntime = downtimeService.calculateTotalDowntime(downtimeEvents);
      expect(totalDowntime).toBe(180); // 120 + 60
    });

    it('should include ongoing downtime when specified', () => {
      const downtimeEvents = [
        { startTime: new Date('2024-01-01T08:00:00Z'), endTime: new Date('2024-01-01T10:00:00Z') }, // 120 min
        { startTime: new Date(Date.now() - 30 * 60 * 1000), endTime: null }, // 30 min ongoing
      ];

      const totalDowntime = downtimeService.calculateTotalDowntime(downtimeEvents, true);
      expect(totalDowntime).toBeCloseTo(150, 0); // 120 + ~30
    });

    it('should handle zero duration events', () => {
      const downtimeEvents = [
        { startTime: new Date('2024-01-01T08:00:00Z'), endTime: new Date('2024-01-01T08:00:00Z') }, // 0 min
        { startTime: new Date('2024-01-01T14:00:00Z'), endTime: new Date('2024-01-01T15:00:00Z') }, // 60 min
      ];

      const totalDowntime = downtimeService.calculateTotalDowntime(downtimeEvents);
      expect(totalDowntime).toBe(60);
    });
  });

  describe('calculateDowntimeFrequency', () => {
    it('should calculate frequency correctly with multiple events in period', () => {
      const downtimeEvents = [
        { startTime: new Date('2024-01-01T08:00:00Z'), endTime: new Date('2024-01-01T10:00:00Z') },
        { startTime: new Date('2024-01-15T14:00:00Z'), endTime: new Date('2024-01-15T15:00:00Z') },
        { startTime: new Date('2024-01-25T09:00:00Z'), endTime: new Date('2024-01-25T10:00:00Z') },
      ];

      const frequency = downtimeService.calculateDowntimeFrequency(downtimeEvents, 30); // 30 days
      expect(frequency).toBe(3); // 3 events in 30 days
    });

    it('should return 0 for empty events list', () => {
      const frequency = downtimeService.calculateDowntimeFrequency([], 30);
      expect(frequency).toBe(0);
    });

    it('should only count events within the specified period', () => {
      const downtimeEvents = [
        { startTime: new Date('2024-01-01T08:00:00Z'), endTime: new Date('2024-01-01T10:00:00Z') }, // Within period
        { startTime: new Date('2023-12-15T14:00:00Z'), endTime: new Date('2023-12-15T15:00:00Z') }, // Outside period
        { startTime: new Date('2024-01-15T09:00:00Z'), endTime: new Date('2024-01-15T10:00:00Z') }, // Within period
      ];

      // Assuming current date is around 2024-01-20 for a 30-day lookback
      const frequency = downtimeService.calculateDowntimeFrequency(downtimeEvents, 30);
      expect(frequency).toBe(2); // Only 2 events within the last 30 days
    });

    it('should include ongoing events in frequency count', () => {
      const downtimeEvents = [
        { startTime: new Date('2024-01-01T08:00:00Z'), endTime: new Date('2024-01-01T10:00:00Z') },
        { startTime: new Date('2024-01-15T14:00:00Z'), endTime: null }, // Ongoing
      ];

      const frequency = downtimeService.calculateDowntimeFrequency(downtimeEvents, 30);
      expect(frequency).toBe(2); // Both completed and ongoing events count
    });

    it('should handle single event correctly', () => {
      const downtimeEvents = [
        { startTime: new Date('2024-01-01T08:00:00Z'), endTime: new Date('2024-01-01T10:00:00Z') },
      ];

      const frequency = downtimeService.calculateDowntimeFrequency(downtimeEvents, 30);
      expect(frequency).toBe(1);
    });
  });

  describe('categorizeDowntimeByReason', () => {
    it('should categorize downtime events by reason correctly', () => {
      const downtimeEvents = [
        {
          startTime: new Date('2024-01-01T08:00:00Z'),
          endTime: new Date('2024-01-01T10:00:00Z'), // 120 min
          downtimeReason: {
            id: 'reason-1',
            name: 'Hydraulic Failure',
            category: DowntimeCategory.EQUIPMENT_FAILURE
          }
        },
        {
          startTime: new Date('2024-01-01T14:00:00Z'),
          endTime: new Date('2024-01-01T15:30:00Z'), // 90 min
          downtimeReason: {
            id: 'reason-2',
            name: 'Scheduled Maintenance',
            category: DowntimeCategory.PLANNED_MAINTENANCE
          }
        },
        {
          startTime: new Date('2024-01-02T09:00:00Z'),
          endTime: new Date('2024-01-02T10:00:00Z'), // 60 min
          downtimeReason: {
            id: 'reason-1',
            name: 'Hydraulic Failure',
            category: DowntimeCategory.EQUIPMENT_FAILURE
          }
        },
      ];

      const categorized = downtimeService.categorizeDowntimeByReason(downtimeEvents);

      expect(categorized).toHaveLength(2);

      const hydraulicFailure = categorized.find(c => c.reasonId === 'reason-1');
      expect(hydraulicFailure?.totalDuration).toBe(180); // 120 + 60
      expect(hydraulicFailure?.eventCount).toBe(2);
      expect(hydraulicFailure?.reasonName).toBe('Hydraulic Failure');

      const scheduledMaintenance = categorized.find(c => c.reasonId === 'reason-2');
      expect(scheduledMaintenance?.totalDuration).toBe(90);
      expect(scheduledMaintenance?.eventCount).toBe(1);
      expect(scheduledMaintenance?.reasonName).toBe('Scheduled Maintenance');
    });

    it('should return empty array for empty events list', () => {
      const categorized = downtimeService.categorizeDowntimeByReason([]);
      expect(categorized).toHaveLength(0);
    });

    it('should exclude ongoing events from duration calculation', () => {
      const downtimeEvents = [
        {
          startTime: new Date('2024-01-01T08:00:00Z'),
          endTime: new Date('2024-01-01T10:00:00Z'), // 120 min
          downtimeReason: {
            id: 'reason-1',
            name: 'Hydraulic Failure',
            category: DowntimeCategory.EQUIPMENT_FAILURE
          }
        },
        {
          startTime: new Date('2024-01-01T14:00:00Z'),
          endTime: null, // Ongoing
          downtimeReason: {
            id: 'reason-1',
            name: 'Hydraulic Failure',
            category: DowntimeCategory.EQUIPMENT_FAILURE
          }
        },
      ];

      const categorized = downtimeService.categorizeDowntimeByReason(downtimeEvents);

      expect(categorized).toHaveLength(1);
      expect(categorized[0].totalDuration).toBe(120); // Only the completed event
      expect(categorized[0].eventCount).toBe(2); // Both events count
    });

    it('should handle events without downtime reason', () => {
      const downtimeEvents = [
        {
          startTime: new Date('2024-01-01T08:00:00Z'),
          endTime: new Date('2024-01-01T10:00:00Z'), // 120 min
          downtimeReason: null
        },
        {
          startTime: new Date('2024-01-01T14:00:00Z'),
          endTime: new Date('2024-01-01T15:00:00Z'), // 60 min
          downtimeReason: {
            id: 'reason-1',
            name: 'Hydraulic Failure',
            category: DowntimeCategory.EQUIPMENT_FAILURE
          }
        },
      ];

      const categorized = downtimeService.categorizeDowntimeByReason(downtimeEvents);

      expect(categorized).toHaveLength(2);

      const unknownReason = categorized.find(c => c.reasonId === 'unknown');
      expect(unknownReason?.totalDuration).toBe(120);
      expect(unknownReason?.reasonName).toBe('Unknown');

      const hydraulicFailure = categorized.find(c => c.reasonId === 'reason-1');
      expect(hydraulicFailure?.totalDuration).toBe(60);
    });
  });

  describe('isDowntimeOngoing', () => {
    it('should return true for downtime without end time', () => {
      const downtimeEvent = {
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: null,
      };

      const isOngoing = downtimeService.isDowntimeOngoing(downtimeEvent);
      expect(isOngoing).toBe(true);
    });

    it('should return true for downtime with undefined end time', () => {
      const downtimeEvent = {
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: undefined,
      };

      const isOngoing = downtimeService.isDowntimeOngoing(downtimeEvent);
      expect(isOngoing).toBe(true);
    });

    it('should return false for completed downtime', () => {
      const downtimeEvent = {
        startTime: new Date('2024-01-01T08:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
      };

      const isOngoing = downtimeService.isDowntimeOngoing(downtimeEvent);
      expect(isOngoing).toBe(false);
    });
  });

  describe('calculateDowntimeImpactScore', () => {
    it('should calculate impact score correctly', () => {
      const duration = 120; // minutes
      const impact = DowntimeImpact.HIGH;
      const criticality = 'HIGH';

      const score = downtimeService.calculateDowntimeImpactScore(duration, impact, criticality);

      // HIGH impact = 3, HIGH criticality = 3, duration factor = 120/60 = 2
      // Score = (3 + 3) * 2 = 12
      expect(score).toBe(12);
    });

    it('should handle different impact levels', () => {
      const duration = 60;
      const criticality = 'MEDIUM';

      const lowScore = downtimeService.calculateDowntimeImpactScore(duration, DowntimeImpact.LOW, criticality);
      const mediumScore = downtimeService.calculateDowntimeImpactScore(duration, DowntimeImpact.MEDIUM, criticality);
      const highScore = downtimeService.calculateDowntimeImpactScore(duration, DowntimeImpact.HIGH, criticality);
      const criticalScore = downtimeService.calculateDowntimeImpactScore(duration, DowntimeImpact.CRITICAL, criticality);

      expect(lowScore).toBeLessThan(mediumScore);
      expect(mediumScore).toBeLessThan(highScore);
      expect(highScore).toBeLessThan(criticalScore);
    });

    it('should handle different criticality levels', () => {
      const duration = 60;
      const impact = DowntimeImpact.MEDIUM;

      const lowScore = downtimeService.calculateDowntimeImpactScore(duration, impact, 'LOW');
      const mediumScore = downtimeService.calculateDowntimeImpactScore(duration, impact, 'MEDIUM');
      const highScore = downtimeService.calculateDowntimeImpactScore(duration, impact, 'HIGH');

      expect(lowScore).toBeLessThan(mediumScore);
      expect(mediumScore).toBeLessThan(highScore);
    });

    it('should handle zero duration', () => {
      const score = downtimeService.calculateDowntimeImpactScore(0, DowntimeImpact.HIGH, 'HIGH');
      expect(score).toBe(0); // Should be 0 regardless of impact/criticality
    });

    it('should handle undefined values gracefully', () => {
      const score1 = downtimeService.calculateDowntimeImpactScore(60, undefined, 'MEDIUM');
      const score2 = downtimeService.calculateDowntimeImpactScore(60, DowntimeImpact.MEDIUM, undefined);

      expect(score1).toBeGreaterThan(0); // Should still calculate with defaults
      expect(score2).toBeGreaterThan(0); // Should still calculate with defaults
    });
  });
});