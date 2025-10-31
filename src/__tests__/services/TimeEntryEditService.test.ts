/**
 * TimeEntryEditService Tests
 * Comprehensive test suite for time entry editing functionality
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import {
  TimeEntryEditService,
  TimeEntryEditRequest,
  SplitTimeEntryRequest,
  MergeTimeEntriesRequest
} from '../../services/TimeEntryEditService';
import {
  TimeEntryType,
  EditType,
  EditReasonCategory,
  ApprovalStatus,
  TimeEntryStatus
} from '@prisma/client';
import prisma from '../../lib/database';

// Mock Prisma
vi.mock('../../lib/database', () => ({
  default: {
    timeEntryEdit: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    laborTimeEntry: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    machineTimeEntry: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    timeTrackingConfiguration: {
      findUnique: vi.fn(),
    },
    timeEntryLock: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    equipment: {
      findUnique: vi.fn(),
    },
  }
}));

// Mock TimeTrackingService
vi.mock('../../services/TimeTrackingService', () => ({
  timeTrackingService: {
    getTimeTrackingConfiguration: vi.fn(),
  }
}));

describe('TimeEntryEditService', () => {
  let service: TimeEntryEditService;

  beforeEach(() => {
    service = new TimeEntryEditService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createEdit', () => {
    const mockTimeEntry = {
      id: 'entry-1',
      userId: 'user-1',
      clockInTime: new Date('2023-01-01T09:00:00Z'),
      clockOutTime: new Date('2023-01-01T17:00:00Z'),
      duration: 8.0,
      laborRate: 25.0,
      laborCost: 200.0,
      status: TimeEntryStatus.COMPLETED,
    };

    const mockSiteConfig = {
      enableAutoApproval: true,
      autoApprovalRiskThreshold: 30,
      lockAfterHours: 24,
      smallAdjustmentMinutes: 15,
      recentEditHours: 24,
    };

    const baseEditRequest: TimeEntryEditRequest = {
      timeEntryId: 'entry-1',
      timeEntryType: TimeEntryType.LABOR,
      editType: EditType.MODIFIED,
      originalValues: { duration: 8.0 },
      newValues: { duration: 8.25 },
      changedFields: ['duration'],
      reason: 'Forgot to clock out for break',
      reasonCategory: EditReasonCategory.TIME_CORRECTION,
      editedBy: 'user-1',
    };

    beforeEach(() => {
      (prisma.laborTimeEntry.findUnique as Mock).mockResolvedValue(mockTimeEntry);
      (service as any).getSiteConfigurationForTimeEntry = vi.fn().mockResolvedValue(mockSiteConfig);
      (service as any).isTimeEntryLocked = vi.fn().mockResolvedValue(false);
      (service as any).checkForOverlappingEntries = vi.fn().mockResolvedValue(false);
    });

    it('should create a valid edit with auto-approval', async () => {
      const mockCreatedEdit = {
        id: 'edit-1',
        ...baseEditRequest,
        approvalRequired: false,
        approvalStatus: ApprovalStatus.AUTO_APPROVED,
        autoApproved: true,
        riskScore: 15,
      };

      (prisma.timeEntryEdit.create as Mock).mockResolvedValue(mockCreatedEdit);
      (service as any).applyEdit = vi.fn().mockResolvedValue(undefined);

      const result = await service.createEdit(baseEditRequest);

      expect(result).toEqual(mockCreatedEdit);
      expect(prisma.timeEntryEdit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timeEntryId: 'entry-1',
          timeEntryType: TimeEntryType.LABOR,
          editType: EditType.MODIFIED,
          approvalStatus: ApprovalStatus.AUTO_APPROVED,
          autoApproved: true,
        }),
        include: expect.any(Object),
      });
      expect((service as any).applyEdit).toHaveBeenCalledWith('edit-1');
    });

    it('should create edit requiring manual approval for high-risk changes', async () => {
      const highRiskRequest = {
        ...baseEditRequest,
        newValues: { duration: 12.0 }, // Large change
        changedFields: ['duration'],
      };

      const mockCreatedEdit = {
        id: 'edit-2',
        ...highRiskRequest,
        approvalRequired: true,
        approvalStatus: ApprovalStatus.PENDING,
        autoApproved: false,
        riskScore: 85,
      };

      (prisma.timeEntryEdit.create as Mock).mockResolvedValue(mockCreatedEdit);

      const result = await service.createEdit(highRiskRequest);

      expect(result).toEqual(mockCreatedEdit);
      expect(prisma.timeEntryEdit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          approvalStatus: ApprovalStatus.PENDING,
          autoApproved: false,
          approvalRequired: true,
        }),
        include: expect.any(Object),
      });
      expect((service as any).applyEdit).not.toHaveBeenCalled();
    });

    it('should reject edit if time entry is locked', async () => {
      (service as any).isTimeEntryLocked = vi.fn().mockResolvedValue(true);

      await expect(service.createEdit(baseEditRequest)).rejects.toThrow(
        'Edit validation failed: Time entry is locked and cannot be edited'
      );
    });

    it('should reject edit with invalid duration', async () => {
      const invalidRequest = {
        ...baseEditRequest,
        newValues: { duration: -1 },
      };

      await expect(service.createEdit(invalidRequest)).rejects.toThrow(
        'Edit validation failed: Duration cannot be negative'
      );
    });

    it('should reject edit that creates overlapping entries', async () => {
      (service as any).checkForOverlappingEntries = vi.fn().mockResolvedValue(true);

      const timeChangeRequest = {
        ...baseEditRequest,
        newValues: { clockInTime: '2023-01-01T08:00:00Z' },
        changedFields: ['clockInTime'],
      };

      await expect(service.createEdit(timeChangeRequest)).rejects.toThrow(
        'Edit validation failed: Edit would create overlapping time entries'
      );
    });
  });

  describe('validateEdit', () => {
    const mockTimeEntry = {
      id: 'entry-1',
      userId: 'user-1',
      clockInTime: new Date('2023-01-01T09:00:00Z'),
      clockOutTime: new Date('2023-01-01T17:00:00Z'),
      duration: 8.0,
    };

    beforeEach(() => {
      (service as any).getTimeEntry = vi.fn().mockResolvedValue(mockTimeEntry);
      (service as any).getSiteConfigurationForTimeEntry = vi.fn().mockResolvedValue({
        enableAutoApproval: true,
        autoApprovalRiskThreshold: 30,
        smallAdjustmentMinutes: 15,
      });
      (service as any).isTimeEntryLocked = vi.fn().mockResolvedValue(false);
      (service as any).checkForOverlappingEntries = vi.fn().mockResolvedValue(false);
    });

    it('should validate a valid edit request', async () => {
      const request: TimeEntryEditRequest = {
        timeEntryId: 'entry-1',
        timeEntryType: TimeEntryType.LABOR,
        editType: EditType.MODIFIED,
        originalValues: { duration: 8.0 },
        newValues: { duration: 8.25 },
        changedFields: ['duration'],
        reason: 'Small time correction',
        reasonCategory: EditReasonCategory.TIME_CORRECTION,
        editedBy: 'user-1',
      };

      const result = await service.validateEdit(request);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.autoApprovalEvaluation.shouldAutoApprove).toBe(true);
      expect(result.autoApprovalEvaluation.riskScore).toBeLessThan(30);
    });

    it('should identify high-risk edits', async () => {
      const request: TimeEntryEditRequest = {
        timeEntryId: 'entry-1',
        timeEntryType: TimeEntryType.LABOR,
        editType: EditType.MODIFIED,
        originalValues: { duration: 8.0 },
        newValues: { duration: 12.0 }, // Large change
        changedFields: ['duration'],
        reason: 'Major time correction',
        reasonCategory: EditReasonCategory.TIME_CORRECTION,
        editedBy: 'supervisor-1', // Different user
      };

      const result = await service.validateEdit(request);

      expect(result.isValid).toBe(true);
      expect(result.autoApprovalEvaluation.shouldAutoApprove).toBe(false);
      expect(result.autoApprovalEvaluation.riskScore).toBeGreaterThan(30);
      expect(result.autoApprovalEvaluation.appliedRules).not.toContain('SMALL_TIME_ADJUSTMENT');
    });

    it('should detect invalid clock times', async () => {
      const request: TimeEntryEditRequest = {
        timeEntryId: 'entry-1',
        timeEntryType: TimeEntryType.LABOR,
        editType: EditType.MODIFIED,
        originalValues: {
          clockInTime: '2023-01-01T09:00:00Z',
          clockOutTime: '2023-01-01T17:00:00Z'
        },
        newValues: {
          clockInTime: '2023-01-01T18:00:00Z', // After clock out
          clockOutTime: '2023-01-01T17:00:00Z'
        },
        changedFields: ['clockInTime'],
        reason: 'Time correction',
        reasonCategory: EditReasonCategory.TIME_CORRECTION,
        editedBy: 'user-1',
      };

      const result = await service.validateEdit(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Clock out time must be after clock in time');
    });
  });

  describe('applyEdit', () => {
    const mockEdit = {
      id: 'edit-1',
      timeEntryId: 'entry-1',
      timeEntryType: TimeEntryType.LABOR,
      editType: EditType.MODIFIED,
      newValues: { duration: 8.25, laborRate: 26.0 },
      changedFields: ['duration', 'laborRate'],
      approvalStatus: ApprovalStatus.APPROVED,
      editedBy: 'user-1',
      reason: 'Rate and time correction',
    };

    const mockTimeEntry = {
      id: 'entry-1',
      duration: 8.0,
      laborRate: 25.0,
    };

    it('should apply approved labor time edit', async () => {
      (prisma.timeEntryEdit.findUnique as Mock).mockResolvedValue(mockEdit);
      (prisma.laborTimeEntry.findUnique as Mock).mockResolvedValue(mockTimeEntry);
      (prisma.laborTimeEntry.update as Mock).mockResolvedValue({});
      (prisma.timeEntryEdit.update as Mock).mockResolvedValue({});

      await service.applyEdit('edit-1');

      expect(prisma.laborTimeEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: {
          duration: 8.25,
          laborRate: 26.0,
          laborCost: 214.5, // 8.25 * 26.0
          editReason: 'Rate and time correction',
          editedAt: expect.any(Date),
          editedBy: 'user-1',
        }
      });

      expect(prisma.timeEntryEdit.update).toHaveBeenCalledWith({
        where: { id: 'edit-1' },
        data: {
          appliedAt: expect.any(Date),
          appliedBy: 'user-1',
        }
      });
    });

    it('should reject applying non-approved edit', async () => {
      const pendingEdit = {
        ...mockEdit,
        approvalStatus: ApprovalStatus.PENDING,
      };

      (prisma.timeEntryEdit.findUnique as Mock).mockResolvedValue(pendingEdit);

      await expect(service.applyEdit('edit-1')).rejects.toThrow(
        'Edit edit-1 is not approved for application'
      );
    });

    it('should handle missing edit', async () => {
      (prisma.timeEntryEdit.findUnique as Mock).mockResolvedValue(null);

      await expect(service.applyEdit('edit-1')).rejects.toThrow(
        'Time entry edit edit-1 not found'
      );
    });
  });

  describe('splitTimeEntry', () => {
    const mockTimeEntry = {
      id: 'entry-1',
      userId: 'user-1',
      clockInTime: new Date('2023-01-01T09:00:00Z'),
      clockOutTime: new Date('2023-01-01T17:00:00Z'),
      duration: 8.0,
      workOrderId: 'wo-1',
    };

    const splitRequest: SplitTimeEntryRequest = {
      timeEntryId: 'entry-1',
      timeEntryType: TimeEntryType.LABOR,
      splitPoints: [
        {
          endTime: new Date('2023-01-01T13:00:00Z'),
          workOrderId: 'wo-1',
        },
        {
          endTime: new Date('2023-01-01T17:00:00Z'),
          workOrderId: 'wo-2',
        },
      ],
      reason: 'Split between different work orders',
      editedBy: 'user-1',
    };

    beforeEach(() => {
      (service as any).getTimeEntry = vi.fn().mockResolvedValue(mockTimeEntry);
      (service as any).extractTimeEntryValues = vi.fn().mockReturnValue(mockTimeEntry);
    });

    it('should create edit records for split operation', async () => {
      const mockSplitEdits = [
        { id: 'edit-1', editType: EditType.SPLIT },
        { id: 'edit-2', editType: EditType.SPLIT },
        { id: 'edit-3', editType: EditType.SPLIT },
      ];

      (service.createEdit as any) = vi.fn()
        .mockResolvedValueOnce(mockSplitEdits[0])
        .mockResolvedValueOnce(mockSplitEdits[1])
        .mockResolvedValueOnce(mockSplitEdits[2]);

      const result = await service.splitTimeEntry(splitRequest);

      expect(result).toHaveLength(3); // Original + 2 split points
      expect(service.createEdit).toHaveBeenCalledTimes(3);

      // Check that original entry is marked as split parent
      expect(service.createEdit).toHaveBeenNthCalledWith(1, expect.objectContaining({
        editType: EditType.SPLIT,
        newValues: { status: 'SPLIT_PARENT' },
      }));
    });

    it('should handle non-existent time entry', async () => {
      (service as any).getTimeEntry = vi.fn().mockResolvedValue(null);

      await expect(service.splitTimeEntry(splitRequest)).rejects.toThrow(
        'Time entry entry-1 not found'
      );
    });
  });

  describe('mergeTimeEntries', () => {
    const mockTimeEntries = [
      {
        id: 'entry-1',
        workOrderId: 'wo-1',
        duration: 4.0,
      },
      {
        id: 'entry-2',
        workOrderId: 'wo-1',
        duration: 4.0,
      },
    ];

    const mergeRequest: MergeTimeEntriesRequest = {
      timeEntryIds: ['entry-1', 'entry-2'],
      timeEntryType: TimeEntryType.LABOR,
      targetWorkOrderId: 'wo-2',
      reason: 'Consolidate entries to correct work order',
      editedBy: 'user-1',
    };

    beforeEach(() => {
      (service as any).getTimeEntry = vi.fn()
        .mockResolvedValueOnce(mockTimeEntries[0])
        .mockResolvedValueOnce(mockTimeEntries[1]);
      (service as any).extractTimeEntryValues = vi.fn()
        .mockReturnValueOnce(mockTimeEntries[0])
        .mockReturnValueOnce(mockTimeEntries[1]);
    });

    it('should create merge edit records for all entries', async () => {
      const mockMergeEdits = [
        { id: 'edit-1', editType: EditType.MERGED },
        { id: 'edit-2', editType: EditType.MERGED },
      ];

      (service.createEdit as any) = vi.fn()
        .mockResolvedValueOnce(mockMergeEdits[0])
        .mockResolvedValueOnce(mockMergeEdits[1]);

      const result = await service.mergeTimeEntries(mergeRequest);

      expect(result).toHaveLength(2);
      expect(service.createEdit).toHaveBeenCalledTimes(2);

      // Check that entries are assigned to target work order
      expect(service.createEdit).toHaveBeenCalledWith(expect.objectContaining({
        editType: EditType.MERGED,
        newValues: expect.objectContaining({
          workOrderId: 'wo-2',
          status: 'MERGED',
        }),
      }));
    });

    it('should handle missing time entries', async () => {
      (service as any).getTimeEntry = vi.fn()
        .mockResolvedValueOnce(mockTimeEntries[0])
        .mockResolvedValueOnce(null);

      await expect(service.mergeTimeEntries(mergeRequest)).rejects.toThrow(
        'Some time entries were not found'
      );
    });
  });

  describe('Auto-approval evaluation', () => {
    const mockTimeEntry = {
      id: 'entry-1',
      userId: 'user-1',
      clockInTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      clockOutTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      duration: 1.0,
    };

    const mockSiteConfig = {
      enableAutoApproval: true,
      autoApprovalRiskThreshold: 30,
      smallAdjustmentMinutes: 15,
      recentEditHours: 24,
    };

    beforeEach(() => {
      (service as any).getSiteConfigurationForTimeEntry = vi.fn().mockResolvedValue(mockSiteConfig);
    });

    it('should auto-approve small recent changes by owner', async () => {
      const request: TimeEntryEditRequest = {
        timeEntryId: 'entry-1',
        timeEntryType: TimeEntryType.LABOR,
        editType: EditType.MODIFIED,
        originalValues: { duration: 1.0 },
        newValues: { duration: 1.1 }, // 6 minutes = small change
        changedFields: ['duration'],
        reason: 'Minor correction',
        reasonCategory: EditReasonCategory.TIME_CORRECTION,
        editedBy: 'user-1', // Same as owner
      };

      const evaluation = await (service as any).evaluateAutoApproval(request, mockTimeEntry);

      expect(evaluation.shouldAutoApprove).toBe(true);
      expect(evaluation.riskScore).toBeLessThan(30);
      expect(evaluation.appliedRules).toContain('SMALL_TIME_ADJUSTMENT');
      expect(evaluation.appliedRules).toContain('RECENT_ENTRY');
      expect(evaluation.appliedRules).toContain('OWNER_EDIT');
    });

    it('should require approval for large changes', async () => {
      const request: TimeEntryEditRequest = {
        timeEntryId: 'entry-1',
        timeEntryType: TimeEntryType.LABOR,
        editType: EditType.MODIFIED,
        originalValues: { duration: 1.0 },
        newValues: { duration: 8.0 }, // 7 hours = large change
        changedFields: ['duration'],
        reason: 'Major correction',
        reasonCategory: EditReasonCategory.TIME_CORRECTION,
        editedBy: 'user-1',
      };

      const evaluation = await (service as any).evaluateAutoApproval(request, mockTimeEntry);

      expect(evaluation.shouldAutoApprove).toBe(false);
      expect(evaluation.riskScore).toBeGreaterThan(30);
      expect(evaluation.requiresManualApproval).toBeDefined();
    });

    it('should require approval when auto-approval is disabled', async () => {
      const disabledConfig = {
        ...mockSiteConfig,
        enableAutoApproval: false,
      };

      (service as any).getSiteConfigurationForTimeEntry = vi.fn().mockResolvedValue(disabledConfig);

      const request: TimeEntryEditRequest = {
        timeEntryId: 'entry-1',
        timeEntryType: TimeEntryType.LABOR,
        editType: EditType.MODIFIED,
        originalValues: { duration: 1.0 },
        newValues: { duration: 1.1 },
        changedFields: ['duration'],
        reason: 'Small correction',
        reasonCategory: EditReasonCategory.TIME_CORRECTION,
        editedBy: 'user-1',
      };

      const evaluation = await (service as any).evaluateAutoApproval(request, mockTimeEntry);

      expect(evaluation.shouldAutoApprove).toBe(false);
      expect(evaluation.reason).toBe('Auto-approval disabled for site');
    });
  });
});