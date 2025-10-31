/**
 * AutoStopService Tests
 * Comprehensive test suite for auto-stop functionality
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import {
  AutoStopService,
  AutoStopCondition,
  PromptResponse,
} from '../../services/AutoStopService';
import {
  AutoStopBehavior,
  AutoStopConfiguration,
  TimeEntryStatus,
  TimeType,
  LaborTimeEntry,
  MachineTimeEntry,
} from '@prisma/client';
import prisma from '../../lib/database';

// Mock Prisma
vi.mock('../../lib/database', () => ({
  default: {
    autoStopConfiguration: {
      findMany: vi.fn(),
    },
    laborTimeEntry: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    machineTimeEntry: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    autoStopEvent: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    workOrder: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  }
}));

// Mock TimeTrackingService
vi.mock('../../services/TimeTrackingService', () => ({
  timeTrackingService: {
    stopAllActiveEntries: vi.fn(),
    clockOut: vi.fn(),
    stopMachineTime: vi.fn(),
  }
}));

// Mock TimeEntryEditService
vi.mock('../../services/TimeEntryEditService', () => ({
  timeEntryEditService: {
    createEdit: vi.fn(),
  }
}));

describe('AutoStopService', () => {
  let service: AutoStopService;

  beforeEach(() => {
    service = new AutoStopService();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
    service.stopMonitoring();
  });

  describe('startMonitoring', () => {
    it('should start monitoring with interval', () => {
      const checkSpy = vi.spyOn(service, 'checkAutoStopConditions').mockResolvedValue();

      service.startMonitoring();

      // Fast-forward 1 minute
      vi.advanceTimersByTime(60000);

      expect(checkSpy).toHaveBeenCalledTimes(1);

      // Fast-forward another minute
      vi.advanceTimersByTime(60000);

      expect(checkSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in monitoring gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(service, 'checkAutoStopConditions').mockRejectedValue(new Error('Check failed'));

      service.startMonitoring();

      // Fast-forward to trigger check
      vi.advanceTimersByTime(60000);

      // Wait for promise to resolve
      return new Promise(resolve => {
        setTimeout(() => {
          expect(consoleSpy).toHaveBeenCalledWith('Auto-stop monitoring error:', expect.any(Error));
          resolve(undefined);
        }, 0);
      });
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring interval', () => {
      const checkSpy = vi.spyOn(service, 'checkAutoStopConditions').mockResolvedValue();

      service.startMonitoring();
      service.stopMonitoring();

      // Fast-forward time - should not trigger checks
      vi.advanceTimersByTime(120000);

      expect(checkSpy).not.toHaveBeenCalled();
    });
  });

  describe('checkAutoStopConditions', () => {
    const mockConfiguration: AutoStopConfiguration = {
      id: 'config-1',
      name: 'Duration Limit',
      isActive: true,
      behavior: AutoStopBehavior.STOP_ALL,
      conditions: [
        {
          type: 'DURATION_EXCEEDED',
          parameters: { maxHours: 8 },
          operator: 'GREATER_THAN',
          threshold: 8,
          unit: 'HOURS',
        }
      ] as AutoStopCondition[],
      scope: {
        siteIds: ['site-1'],
        timeTypes: ['DIRECT_LABOR'],
      },
      notifications: [],
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockActiveEntry: LaborTimeEntry = {
      id: 'entry-1',
      userId: 'user-1',
      workOrderId: 'wo-1',
      operationId: 'op-1',
      indirectCodeId: null,
      timeType: TimeType.DIRECT_LABOR,
      clockInTime: new Date(Date.now() - 9 * 60 * 60 * 1000), // 9 hours ago
      clockOutTime: null,
      duration: null,
      laborRate: 25.0,
      laborCost: null,
      status: TimeEntryStatus.ACTIVE,
      entrySource: 'MANUAL',
      deviceId: null,
      location: null,
      editReason: null,
      editedAt: null,
      editedBy: null,
      costCenter: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      (service as any).getActiveAutoStopConfigurations = vi.fn().mockResolvedValue([mockConfiguration]);
      (service as any).getActiveEntriesInScope = vi.fn().mockResolvedValue([mockActiveEntry]);
      (service as any).getRecentAutoStopEvent = vi.fn().mockResolvedValue(null);
      (service as any).isWithinCooldownPeriod = vi.fn().mockReturnValue(false);
      (service as any).createAutoStopEvent = vi.fn().mockResolvedValue({
        id: 'event-1',
        triggerCondition: 'DURATION_EXCEEDED: 9 hours',
      });
      (service as any).stopAllActiveEntries = vi.fn();
    });

    it('should evaluate and trigger auto-stop for exceeded duration', async () => {
      await service.checkAutoStopConditions();

      expect((service as any).getActiveAutoStopConfigurations).toHaveBeenCalled();
      expect((service as any).getActiveEntriesInScope).toHaveBeenCalledWith(mockConfiguration);
      expect((service as any).createAutoStopEvent).toHaveBeenCalledWith(
        mockActiveEntry,
        mockConfiguration,
        expect.objectContaining({
          type: 'DURATION_EXCEEDED',
          threshold: 8,
        })
      );
      expect((service as any).stopAllActiveEntries).toHaveBeenCalledWith(
        mockActiveEntry,
        expect.objectContaining({ id: 'event-1' })
      );
    });

    it('should skip entries with recent auto-stop events', async () => {
      const recentEvent = {
        id: 'recent-event',
        triggeredAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      };

      (service as any).getRecentAutoStopEvent = vi.fn().mockResolvedValue(recentEvent);
      (service as any).isWithinCooldownPeriod = vi.fn().mockReturnValue(true);

      await service.checkAutoStopConditions();

      expect((service as any).createAutoStopEvent).not.toHaveBeenCalled();
      expect((service as any).stopAllActiveEntries).not.toHaveBeenCalled();
    });

    it('should handle multiple configurations', async () => {
      const secondConfig = {
        ...mockConfiguration,
        id: 'config-2',
        behavior: AutoStopBehavior.PROMPT_OPERATOR,
      };

      (service as any).getActiveAutoStopConfigurations = vi.fn().mockResolvedValue([
        mockConfiguration,
        secondConfig,
      ]);

      await service.checkAutoStopConditions();

      expect((service as any).getActiveEntriesInScope).toHaveBeenCalledTimes(2);
    });
  });

  describe('evaluateCondition', () => {
    const mockEntry: LaborTimeEntry = {
      id: 'entry-1',
      userId: 'user-1',
      clockInTime: new Date(Date.now() - 9 * 60 * 60 * 1000), // 9 hours ago
      status: TimeEntryStatus.ACTIVE,
    } as LaborTimeEntry;

    it('should evaluate DURATION_EXCEEDED condition correctly', async () => {
      const condition: AutoStopCondition = {
        type: 'DURATION_EXCEEDED',
        parameters: {},
        operator: 'GREATER_THAN',
        threshold: 8,
        unit: 'HOURS',
      };

      const result = await (service as any).evaluateCondition(mockEntry, condition);

      expect(result).toBe(true);
    });

    it('should evaluate TIME_OF_DAY condition correctly', async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const thresholdHour = currentHour - 1; // 1 hour ago

      const condition: AutoStopCondition = {
        type: 'TIME_OF_DAY',
        parameters: {},
        operator: 'GREATER_THAN',
        threshold: `${thresholdHour.toString().padStart(2, '0')}:00`,
        unit: undefined,
      };

      const result = await (service as any).evaluateCondition(mockEntry, condition);

      expect(result).toBe(true);
    });

    it('should evaluate WORK_ORDER_COMPLETED condition', async () => {
      const entryWithWorkOrder = {
        ...mockEntry,
        workOrderId: 'wo-1',
      };

      const condition: AutoStopCondition = {
        type: 'WORK_ORDER_COMPLETED',
        parameters: {},
        operator: 'EQUALS',
        threshold: 'COMPLETED',
      };

      (prisma.workOrder.findUnique as Mock).mockResolvedValue({
        id: 'wo-1',
        status: 'COMPLETED',
      });

      const result = await (service as any).evaluateCondition(entryWithWorkOrder, condition);

      expect(result).toBe(true);
      expect(prisma.workOrder.findUnique).toHaveBeenCalledWith({
        where: { id: 'wo-1' }
      });
    });

    it('should handle SHIFT_END condition', async () => {
      const condition: AutoStopCondition = {
        type: 'SHIFT_END',
        parameters: { shiftEndHour: 17 },
        operator: 'GREATER_THAN',
        threshold: 17,
      };

      const mockUser = {
        id: 'user-1',
        personnelClass: { id: 'class-1' },
      };

      (prisma.user.findUnique as Mock).mockResolvedValue(mockUser);

      // Mock current time to be after 5 PM
      const mockDate = new Date();
      mockDate.setHours(18);
      vi.setSystemTime(mockDate);

      const result = await (service as any).evaluateCondition(mockEntry, condition);

      expect(result).toBe(true);
    });

    it('should return false for unknown condition types', async () => {
      const condition: AutoStopCondition = {
        type: 'UNKNOWN_TYPE' as any,
        parameters: {},
        operator: 'EQUALS',
        threshold: 'test',
      };

      const result = await (service as any).evaluateCondition(mockEntry, condition);

      expect(result).toBe(false);
    });
  });

  describe('triggerAutoStop', () => {
    const mockEntry: LaborTimeEntry = {
      id: 'entry-1',
      userId: 'user-1',
      timeType: TimeType.DIRECT_LABOR,
      status: TimeEntryStatus.ACTIVE,
    } as LaborTimeEntry;

    const mockConfig: AutoStopConfiguration = {
      id: 'config-1',
      behavior: AutoStopBehavior.STOP_ALL,
      notifications: [],
    } as AutoStopConfiguration;

    const mockCondition: AutoStopCondition = {
      type: 'DURATION_EXCEEDED',
      parameters: { maxHours: 8 },
      operator: 'GREATER_THAN',
      threshold: 8,
    };

    const mockEvent = {
      id: 'event-1',
      triggerCondition: 'DURATION_EXCEEDED: 8 hours',
    };

    beforeEach(() => {
      (service as any).createAutoStopEvent = vi.fn().mockResolvedValue(mockEvent);
      (service as any).stopAllActiveEntries = vi.fn();
      (service as any).stopDirectLaborOnly = vi.fn();
      (service as any).promptOperatorForAction = vi.fn();
      (service as any).logAutoStopEvent = vi.fn();
      (service as any).sendAutoStopNotifications = vi.fn();
      (service as any).updateAutoStopEvent = vi.fn();
    });

    it('should handle STOP_ALL behavior', async () => {
      await (service as any).triggerAutoStop(mockEntry, mockConfig, mockCondition);

      expect((service as any).createAutoStopEvent).toHaveBeenCalledWith(
        mockEntry,
        mockConfig,
        mockCondition
      );
      expect((service as any).stopAllActiveEntries).toHaveBeenCalledWith(mockEntry, mockEvent);
      expect((service as any).sendAutoStopNotifications).toHaveBeenCalledWith(
        mockConfig,
        mockEntry,
        mockEvent
      );
    });

    it('should handle STOP_DIRECT_ONLY behavior', async () => {
      const directOnlyConfig = {
        ...mockConfig,
        behavior: AutoStopBehavior.STOP_DIRECT_ONLY,
      };

      await (service as any).triggerAutoStop(mockEntry, directOnlyConfig, mockCondition);

      expect((service as any).stopDirectLaborOnly).toHaveBeenCalledWith(mockEntry, mockEvent);
    });

    it('should handle PROMPT_OPERATOR behavior', async () => {
      const promptConfig = {
        ...mockConfig,
        behavior: AutoStopBehavior.PROMPT_OPERATOR,
      };

      await (service as any).triggerAutoStop(mockEntry, promptConfig, mockCondition);

      expect((service as any).promptOperatorForAction).toHaveBeenCalledWith(mockEntry, mockEvent);
    });

    it('should handle DO_NOTHING behavior', async () => {
      const doNothingConfig = {
        ...mockConfig,
        behavior: AutoStopBehavior.DO_NOTHING,
      };

      await (service as any).triggerAutoStop(mockEntry, doNothingConfig, mockCondition);

      expect((service as any).logAutoStopEvent).toHaveBeenCalledWith(mockEntry, mockEvent);
      expect((service as any).stopAllActiveEntries).not.toHaveBeenCalled();
    });

    it('should handle errors during auto-stop action', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (service as any).stopAllActiveEntries = vi.fn().mockRejectedValue(new Error('Stop failed'));

      await (service as any).triggerAutoStop(mockEntry, mockConfig, mockCondition);

      expect(consoleSpy).toHaveBeenCalledWith(
        `Auto-stop action failed for entry ${mockEntry.id}:`,
        expect.any(Error)
      );
      expect((service as any).updateAutoStopEvent).toHaveBeenCalledWith(mockEvent.id, {
        error: 'Stop failed',
        completed: false,
      });
    });
  });

  describe('processOperatorResponse', () => {
    const mockPrompt = {
      id: 'prompt-1',
      timeEntryId: 'entry-1',
    };

    beforeEach(() => {
      (service as any).getOperatorPrompt = vi.fn().mockResolvedValue(mockPrompt);
      (service as any).extendTimeEntry = vi.fn();
      (service as any).stopTimeEntryFromPrompt = vi.fn();
      (service as any).updateOperatorPrompt = vi.fn();
    });

    it('should handle CONTINUE response', async () => {
      const response: PromptResponse = {
        timeEntryId: 'entry-1',
        response: 'CONTINUE',
        extensionMinutes: 60,
        userId: 'user-1',
      };

      await service.processOperatorResponse(response);

      expect((service as any).extendTimeEntry).toHaveBeenCalledWith('entry-1', 60);
      expect((service as any).updateOperatorPrompt).toHaveBeenCalledWith(mockPrompt.id, {
        respondedAt: expect.any(Date),
        response: 'CONTINUE',
        responseReason: undefined,
      });
    });

    it('should handle STOP response', async () => {
      const response: PromptResponse = {
        timeEntryId: 'entry-1',
        response: 'STOP',
        reason: 'Work completed',
        userId: 'user-1',
      };

      await service.processOperatorResponse(response);

      expect((service as any).stopTimeEntryFromPrompt).toHaveBeenCalledWith('entry-1', 'Work completed');
      expect((service as any).updateOperatorPrompt).toHaveBeenCalledWith(mockPrompt.id, {
        respondedAt: expect.any(Date),
        response: 'STOP',
        responseReason: 'Work completed',
      });
    });

    it('should handle EXTEND response', async () => {
      const response: PromptResponse = {
        timeEntryId: 'entry-1',
        response: 'EXTEND',
        extensionMinutes: 120,
        userId: 'user-1',
      };

      await service.processOperatorResponse(response);

      expect((service as any).extendTimeEntry).toHaveBeenCalledWith('entry-1', 120);
    });

    it('should handle missing prompt', async () => {
      (service as any).getOperatorPrompt = vi.fn().mockResolvedValue(null);

      const response: PromptResponse = {
        timeEntryId: 'entry-1',
        response: 'CONTINUE',
        userId: 'user-1',
      };

      await expect(service.processOperatorResponse(response)).rejects.toThrow(
        'Prompt not found for time entry entry-1'
      );
    });
  });

  describe('condition evaluation helpers', () => {
    describe('convertToMilliseconds', () => {
      it('should convert minutes correctly', () => {
        const result = (service as any).convertToMilliseconds(30, 'MINUTES');
        expect(result).toBe(30 * 60 * 1000);
      });

      it('should convert hours correctly', () => {
        const result = (service as any).convertToMilliseconds(2, 'HOURS');
        expect(result).toBe(2 * 60 * 60 * 1000);
      });

      it('should convert days correctly', () => {
        const result = (service as any).convertToMilliseconds(1, 'DAYS');
        expect(result).toBe(24 * 60 * 60 * 1000);
      });

      it('should return original value for unknown units', () => {
        const result = (service as any).convertToMilliseconds(100, 'UNKNOWN');
        expect(result).toBe(100);
      });
    });

    describe('parseTimeToMinutes', () => {
      it('should parse HH:mm format correctly', () => {
        const result = (service as any).parseTimeToMinutes('14:30');
        expect(result).toBe(14 * 60 + 30); // 870 minutes
      });

      it('should handle midnight correctly', () => {
        const result = (service as any).parseTimeToMinutes('00:00');
        expect(result).toBe(0);
      });

      it('should handle end of day correctly', () => {
        const result = (service as any).parseTimeToMinutes('23:59');
        expect(result).toBe(23 * 60 + 59); // 1439 minutes
      });
    });
  });

  describe('integration with TimeTrackingService', () => {
    const mockEntry: LaborTimeEntry = {
      id: 'entry-1',
      userId: 'user-1',
      timeType: TimeType.DIRECT_LABOR,
    } as LaborTimeEntry;

    const mockEvent = {
      id: 'event-1',
      triggerCondition: 'Test condition',
    };

    beforeEach(() => {
      const { timeTrackingService } = require('../../services/TimeTrackingService');
      const { timeEntryEditService } = require('../../services/TimeEntryEditService');

      timeTrackingService.stopAllActiveEntries.mockResolvedValue([
        { id: 'entry-1', status: TimeEntryStatus.COMPLETED, clockOutTime: new Date() }
      ]);
      timeTrackingService.clockOut.mockResolvedValue({
        id: 'entry-1', status: TimeEntryStatus.COMPLETED
      });

      timeEntryEditService.createEdit.mockResolvedValue({ id: 'edit-1' });
      (service as any).updateAutoStopEvent = vi.fn();
    });

    it('should integrate with TimeTrackingService for stopping all entries', async () => {
      const { timeTrackingService } = require('../../services/TimeTrackingService');
      const { timeEntryEditService } = require('../../services/TimeEntryEditService');

      await (service as any).stopAllActiveEntries(mockEntry, mockEvent);

      expect(timeTrackingService.stopAllActiveEntries).toHaveBeenCalledWith(
        'user-1',
        'Auto-stop triggered: Test condition'
      );

      expect(timeEntryEditService.createEdit).toHaveBeenCalledWith({
        timeEntryId: 'entry-1',
        timeEntryType: 'LABOR',
        editType: 'MODIFIED',
        originalValues: { status: TimeEntryStatus.ACTIVE },
        newValues: expect.objectContaining({
          status: TimeEntryStatus.COMPLETED,
        }),
        changedFields: ['status', 'clockOutTime'],
        reason: 'Auto-stop: Test condition',
        reasonCategory: 'SYSTEM_AUTOMATED',
        editedBy: 'SYSTEM',
        entrySource: 'AUTO_STOP',
      });

      expect((service as any).updateAutoStopEvent).toHaveBeenCalledWith(mockEvent.id, {
        actionTaken: AutoStopBehavior.STOP_ALL,
        completed: true,
      });
    });

    it('should handle direct labor only stopping', async () => {
      const { timeTrackingService } = require('../../services/TimeTrackingService');
      const { timeEntryEditService } = require('../../services/TimeEntryEditService');

      await (service as any).stopDirectLaborOnly(mockEntry, mockEvent);

      expect(timeTrackingService.clockOut).toHaveBeenCalledWith({
        timeEntryId: 'entry-1',
      });

      expect(timeEntryEditService.createEdit).toHaveBeenCalledWith({
        timeEntryId: 'entry-1',
        timeEntryType: 'LABOR',
        editType: 'MODIFIED',
        originalValues: { status: TimeEntryStatus.ACTIVE },
        newValues: { status: TimeEntryStatus.COMPLETED },
        changedFields: ['status'],
        reason: 'Auto-stop direct labor: Test condition',
        reasonCategory: 'SYSTEM_AUTOMATED',
        editedBy: 'SYSTEM',
        entrySource: 'AUTO_STOP',
      });
    });

    it('should skip indirect time when stopping direct labor only', async () => {
      const { timeTrackingService } = require('../../services/TimeTrackingService');

      const indirectEntry = {
        ...mockEntry,
        timeType: TimeType.INDIRECT,
      };

      await (service as any).stopDirectLaborOnly(indirectEntry, mockEvent);

      expect(timeTrackingService.clockOut).not.toHaveBeenCalled();
      expect((service as any).updateAutoStopEvent).toHaveBeenCalledWith(mockEvent.id, {
        actionTaken: AutoStopBehavior.STOP_DIRECT_ONLY,
        completed: true,
      });
    });
  });
});