/**
 * Test Suite for TimeEntryNotificationService
 * Tests notification functionality for time entry management and approvals
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  TimeEntryNotificationService,
  NotificationRequest,
  NotificationChannel,
  NotificationType,
  NotificationPreferences,
} from '../../services/TimeEntryNotificationService';
import {
  TimeEntryEdit,
  TimeEntryApproval,
  User,
  ApprovalStatus,
  AutoStopBehavior,
  TimeEntryType,
  EditType,
  Priority,
  TimeEntryStatus,
} from '@prisma/client';
import prisma from '../../lib/database';

// Mock the database
vi.mock('../../lib/database', () => ({
  default: {
    timeEntryEdit: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    timeEntryApproval: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('TimeEntryNotificationService', () => {
  let service: TimeEntryNotificationService;
  let mockPrisma: any;

  // Mock data
  const mockUser: User = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+1234567890',
    employeeNumber: 'EMP001',
    username: 'jdoe',
    password: 'hashed-password',
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSupervisor: User = {
    id: 'supervisor-1',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phoneNumber: '+1234567891',
    employeeNumber: 'SUP001',
    username: 'jsmith',
    password: 'hashed-password',
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTimeEntryEdit: TimeEntryEdit = {
    id: 'edit-1',
    editType: EditType.CORRECTION,
    reason: 'Clock error correction',
    changedFields: ['endTime'],
    originalValues: { endTime: '2023-10-01T17:00:00Z' },
    newValues: { endTime: '2023-10-01T17:30:00Z' },
    riskScore: 25,
    approvalRequired: true,
    approvalStatus: ApprovalStatus.PENDING,
    autoApproved: false,
    editedBy: 'user-1',
    editedAt: new Date(),
    laborTimeEntryId: 'labor-1',
    machineTimeEntryId: null,
    batchId: null,
    priority: Priority.NORMAL,
    impactAnalysis: {
      affectedRecords: 1,
      potentialIssues: [],
      suggestedReviews: [],
    },
    auditLog: [],
    tags: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTimeEntryApproval: TimeEntryApproval = {
    id: 'approval-1',
    timeEntryEditId: 'edit-1',
    approvedBy: 'supervisor-1',
    status: ApprovalStatus.APPROVED,
    comments: 'Looks good',
    approvedAt: new Date(),
    escalatedTo: null,
    delegatedTo: null,
    reviewedFields: ['endTime'],
    approvalLevel: 1,
    isAutoApproval: false,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new TimeEntryNotificationService();
    mockPrisma = prisma as any;

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock returns
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.findMany.mockResolvedValue([mockSupervisor]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Template Initialization', () => {
    it('should initialize notification templates', () => {
      expect(service).toBeDefined();
      // Templates are private, but we can test through public methods
    });
  });

  describe('notifyEditSubmitted', () => {
    beforeEach(() => {
      mockPrisma.timeEntryEdit.findUnique.mockResolvedValue({
        ...mockTimeEntryEdit,
        editor: mockUser,
        laborTimeEntry: {
          user: mockUser,
          workOrder: { id: 'wo-1', number: 'WO001' },
          operation: { id: 'op-1', operationNumber: '010' },
          indirectCode: null,
        },
      });
    });

    it('should send notification for regular edit submission', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.notifyEditSubmitted(mockTimeEntryEdit, false);

      expect(sendNotificationSpy).toHaveBeenCalledTimes(2);

      // First call - notify editor
      expect(sendNotificationSpy).toHaveBeenNthCalledWith(1, {
        type: 'EDIT_SUBMITTED',
        recipients: ['user-1'],
        context: expect.any(Object),
        channels: ['IN_APP', 'EMAIL'],
        priority: 'NORMAL',
      });

      // Second call - notify supervisors
      expect(sendNotificationSpy).toHaveBeenNthCalledWith(2, {
        type: 'APPROVAL_REQUIRED',
        recipients: ['supervisor-1'],
        context: expect.any(Object),
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH',
        groupKey: 'approval-required-edit-1',
      });
    });

    it('should send auto-approval notification when edit is auto-approved', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.notifyEditSubmitted(mockTimeEntryEdit, true);

      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'EDIT_AUTO_APPROVED',
        recipients: ['user-1'],
        context: expect.any(Object),
        channels: ['IN_APP', 'EMAIL'],
        priority: 'NORMAL',
      });
    });

    it('should not notify supervisors when auto-approved', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.notifyEditSubmitted(mockTimeEntryEdit, true);

      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
      expect(sendNotificationSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'APPROVAL_REQUIRED' })
      );
    });

    it('should not notify supervisors when approval not required', async () => {
      const editWithoutApproval = { ...mockTimeEntryEdit, approvalRequired: false };
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.notifyEditSubmitted(editWithoutApproval, false);

      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'EDIT_SUBMITTED',
        recipients: ['user-1'],
        context: expect.any(Object),
        channels: ['IN_APP', 'EMAIL'],
        priority: 'NORMAL',
      });
    });
  });

  describe('notifyApprovalDecision', () => {
    beforeEach(() => {
      mockPrisma.timeEntryApproval.findUnique.mockResolvedValue({
        ...mockTimeEntryApproval,
        approver: mockSupervisor,
        timeEntryEdit: {
          ...mockTimeEntryEdit,
          editor: mockUser,
          laborTimeEntry: {
            user: mockUser,
            workOrder: { id: 'wo-1' },
            operation: { id: 'op-1' },
          },
        },
      });
    });

    it('should send approved notification', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');
      const approvedApproval = { ...mockTimeEntryApproval, status: ApprovalStatus.APPROVED };

      await service.notifyApprovalDecision(approvedApproval);

      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'EDIT_APPROVED',
        recipients: ['user-1'],
        context: expect.any(Object),
        channels: ['IN_APP', 'EMAIL'],
        priority: 'NORMAL',
      });
    });

    it('should send rejected notification with high priority', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');
      const rejectedApproval = { ...mockTimeEntryApproval, status: ApprovalStatus.REJECTED };

      await service.notifyApprovalDecision(rejectedApproval);

      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'EDIT_REJECTED',
        recipients: ['user-1'],
        context: expect.any(Object),
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH',
      });
    });

    it('should send more info needed notification', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');
      const moreInfoApproval = { ...mockTimeEntryApproval, status: ApprovalStatus.MORE_INFO_NEEDED };

      await service.notifyApprovalDecision(moreInfoApproval);

      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'EDIT_MORE_INFO_NEEDED',
        recipients: ['user-1'],
        context: expect.any(Object),
        channels: ['IN_APP', 'EMAIL'],
        priority: 'NORMAL',
      });
    });

    it('should send escalated notification and notify escalation target', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');
      const escalatedApproval = {
        ...mockTimeEntryApproval,
        status: ApprovalStatus.ESCALATED,
        escalatedTo: 'manager-1',
      };

      await service.notifyApprovalDecision(escalatedApproval);

      expect(sendNotificationSpy).toHaveBeenCalledTimes(2);

      // First call - notify original editor
      expect(sendNotificationSpy).toHaveBeenNthCalledWith(1, {
        type: 'EDIT_ESCALATED',
        recipients: ['user-1'],
        context: expect.any(Object),
        channels: ['IN_APP', 'EMAIL'],
        priority: 'NORMAL',
      });

      // Second call - notify escalation target
      expect(sendNotificationSpy).toHaveBeenNthCalledWith(2, {
        type: 'APPROVAL_REQUIRED',
        recipients: ['manager-1'],
        context: expect.any(Object),
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH',
      });
    });

    it('should not send notification for pending status', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');
      const pendingApproval = { ...mockTimeEntryApproval, status: ApprovalStatus.PENDING };

      await service.notifyApprovalDecision(pendingApproval);

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });
  });

  describe('notifyAutoStop', () => {
    it('should send prompt notification for PROMPT_OPERATOR behavior', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.notifyAutoStop(
        'time-entry-1',
        TimeEntryType.LABOR,
        AutoStopBehavior.PROMPT_OPERATOR,
        'Exceeded 12 hour limit',
        'user-1'
      );

      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'AUTO_STOP_WARNING',
        recipients: ['user-1'],
        context: {
          timeEntryId: 'time-entry-1',
          timeEntryType: TimeEntryType.LABOR,
          behavior: AutoStopBehavior.PROMPT_OPERATOR,
          reason: 'Exceeded 12 hour limit',
          timestamp: expect.any(Date),
        },
        channels: ['IN_APP', 'PUSH', 'SMS'],
        priority: 'URGENT',
      });
    });

    it('should send execution notification for STOP_WITH_CONFIRMATION behavior', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');
      const getSupervisorsSpy = vi.spyOn(service as any, 'getSupervisorsByUserId')
        .mockResolvedValue([mockSupervisor]);

      await service.notifyAutoStop(
        'time-entry-1',
        TimeEntryType.LABOR,
        AutoStopBehavior.STOP_WITH_CONFIRMATION,
        'Exceeded 12 hour limit',
        'user-1'
      );

      expect(sendNotificationSpy).toHaveBeenCalledTimes(2);

      // First call - notify user
      expect(sendNotificationSpy).toHaveBeenNthCalledWith(1, {
        type: 'AUTO_STOP_EXECUTED',
        recipients: ['user-1'],
        context: expect.any(Object),
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH',
      });

      // Second call - notify supervisors
      expect(sendNotificationSpy).toHaveBeenNthCalledWith(2, {
        type: 'AUTO_STOP_EXECUTED',
        recipients: ['supervisor-1'],
        context: expect.any(Object),
        channels: ['IN_APP'],
        priority: 'NORMAL',
      });
    });

    it('should not send notification for DO_NOTHING behavior', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.notifyAutoStop(
        'time-entry-1',
        TimeEntryType.LABOR,
        AutoStopBehavior.DO_NOTHING,
        'No action required',
        'user-1'
      );

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('should not send notification when userId is not provided', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.notifyAutoStop(
        'time-entry-1',
        TimeEntryType.LABOR,
        AutoStopBehavior.STOP_WITH_CONFIRMATION,
        'No user context'
      );

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });
  });

  describe('notifyBulkApprovalCompleted', () => {
    it('should send bulk approval completion notification', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.notifyBulkApprovalCompleted('batch-1', 'supervisor-1', 10, 0);

      expect(sendNotificationSpy).toHaveBeenCalledTimes(1);
      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'BULK_APPROVAL_COMPLETED',
        recipients: ['supervisor-1'],
        context: {
          batchId: 'batch-1',
          successCount: 10,
          errorCount: 0,
          totalCount: 10,
          timestamp: expect.any(Date),
        },
        channels: ['IN_APP', 'EMAIL'],
        priority: 'NORMAL',
      });
    });

    it('should set high priority when there are errors', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.notifyBulkApprovalCompleted('batch-1', 'supervisor-1', 8, 2);

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'BULK_APPROVAL_COMPLETED',
        recipients: ['supervisor-1'],
        context: {
          batchId: 'batch-1',
          successCount: 8,
          errorCount: 2,
          totalCount: 10,
          timestamp: expect.any(Date),
        },
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH',
      });
    });
  });

  describe('sendApprovalReminders', () => {
    it('should send reminders for pending approvals older than 24 hours', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const pendingEdits = [{
        ...mockTimeEntryEdit,
        editedAt: oldDate,
        editor: mockUser,
        laborTimeEntry: { user: mockUser },
      }];

      mockPrisma.timeEntryEdit.findMany.mockResolvedValue(pendingEdits);

      const getSupervisorsSpy = vi.spyOn(service as any, 'getSupervisors')
        .mockResolvedValue([mockSupervisor]);
      const getUserPreferencesSpy = vi.spyOn(service as any, 'getUserNotificationPreferences')
        .mockResolvedValue({
          userId: 'supervisor-1',
          approvalRequired: ['EMAIL', 'IN_APP'],
          reminderFrequency: 'DAILY',
        });
      const shouldSendReminderSpy = vi.spyOn(service as any, 'shouldSendReminder')
        .mockReturnValue(true);
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.sendApprovalReminders();

      expect(mockPrisma.timeEntryEdit.findMany).toHaveBeenCalledWith({
        where: {
          approvalStatus: ApprovalStatus.PENDING,
          editedAt: {
            lt: expect.any(Date),
          },
        },
        include: {
          editor: true,
          laborTimeEntry: {
            include: { user: true }
          },
        },
      });

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'APPROVAL_REMINDER',
        recipients: ['supervisor-1'],
        context: {
          pendingCount: 1,
          oldestDays: expect.any(Number),
          edits: expect.any(Array),
        },
        channels: ['EMAIL', 'IN_APP'],
        priority: 'NORMAL',
        groupKey: 'reminder-supervisor-1',
      });
    });

    it('should not send reminders when shouldSendReminder returns false', async () => {
      const pendingEdits = [mockTimeEntryEdit];
      mockPrisma.timeEntryEdit.findMany.mockResolvedValue(pendingEdits);

      const getSupervisorsSpy = vi.spyOn(service as any, 'getSupervisors')
        .mockResolvedValue([mockSupervisor]);
      const shouldSendReminderSpy = vi.spyOn(service as any, 'shouldSendReminder')
        .mockReturnValue(false);
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.sendApprovalReminders();

      expect(sendNotificationSpy).not.toHaveBeenCalled();
    });

    it('should set high priority for reminders with more than 10 edits', async () => {
      const pendingEdits = Array(12).fill(mockTimeEntryEdit);
      mockPrisma.timeEntryEdit.findMany.mockResolvedValue(pendingEdits);

      const getSupervisorsSpy = vi.spyOn(service as any, 'getSupervisors')
        .mockResolvedValue([mockSupervisor]);
      const getUserPreferencesSpy = vi.spyOn(service as any, 'getUserNotificationPreferences')
        .mockResolvedValue({
          userId: 'supervisor-1',
          approvalRequired: ['EMAIL'],
          reminderFrequency: 'DAILY',
        });
      const shouldSendReminderSpy = vi.spyOn(service as any, 'shouldSendReminder')
        .mockReturnValue(true);
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.sendApprovalReminders();

      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'HIGH' })
      );
    });
  });

  describe('notifyDelegation', () => {
    it('should send delegation notification', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      await service.notifyDelegation('supervisor-1', 'user-2', 'TEMPORARY', expiryDate);

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'DELEGATION_GRANTED',
        recipients: ['user-2'],
        context: {
          delegationType: 'TEMPORARY',
          expiryDate,
          fromUser: mockUser,
          toUser: mockUser,
        },
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH',
      });
    });

    it('should handle permanent delegation without expiry date', async () => {
      const sendNotificationSpy = vi.spyOn(service as any, 'sendNotification');

      await service.notifyDelegation('supervisor-1', 'user-2', 'PERMANENT');

      expect(sendNotificationSpy).toHaveBeenCalledWith({
        type: 'DELEGATION_GRANTED',
        recipients: ['user-2'],
        context: {
          delegationType: 'PERMANENT',
          expiryDate: undefined,
          fromUser: mockUser,
          toUser: mockUser,
        },
        channels: ['IN_APP', 'EMAIL'],
        priority: 'HIGH',
      });
    });
  });

  describe('Helper Methods', () => {
    describe('getUserNotificationPreferences', () => {
      it('should return default preferences', async () => {
        const preferences = await (service as any).getUserNotificationPreferences('user-1');

        expect(preferences).toEqual({
          userId: 'user-1',
          editSubmitted: ['IN_APP'],
          editApproved: ['IN_APP', 'EMAIL'],
          editRejected: ['IN_APP', 'EMAIL'],
          approvalRequired: ['IN_APP', 'EMAIL'],
          autoStopWarning: ['IN_APP', 'PUSH', 'SMS'],
          reminderFrequency: 'DAILY',
          quietHours: {
            enabled: true,
            startTime: '22:00',
            endTime: '06:00',
            timezone: 'UTC',
          },
        });
      });
    });

    describe('determineChannels', () => {
      it('should use request channels when provided', () => {
        const request: NotificationRequest = {
          type: 'EDIT_SUBMITTED',
          recipients: ['user-1'],
          context: {},
          channels: ['EMAIL'],
        };
        const preferences: NotificationPreferences = {
          userId: 'user-1',
          editSubmitted: ['IN_APP'],
          editApproved: ['IN_APP', 'EMAIL'],
          editRejected: ['IN_APP', 'EMAIL'],
          approvalRequired: ['IN_APP', 'EMAIL'],
          autoStopWarning: ['IN_APP', 'PUSH', 'SMS'],
          reminderFrequency: 'DAILY',
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '06:00',
            timezone: 'UTC',
          },
        };

        const channels = (service as any).determineChannels(request, preferences);
        expect(channels).toEqual(['EMAIL']);
      });

      it('should use preferences when no request channels provided', () => {
        const request: NotificationRequest = {
          type: 'EDIT_APPROVED',
          recipients: ['user-1'],
          context: {},
        };
        const preferences: NotificationPreferences = {
          userId: 'user-1',
          editSubmitted: ['IN_APP'],
          editApproved: ['IN_APP', 'EMAIL'],
          editRejected: ['IN_APP', 'EMAIL'],
          approvalRequired: ['IN_APP', 'EMAIL'],
          autoStopWarning: ['IN_APP', 'PUSH', 'SMS'],
          reminderFrequency: 'DAILY',
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '06:00',
            timezone: 'UTC',
          },
        };

        const channels = (service as any).determineChannels(request, preferences);
        expect(channels).toEqual(['IN_APP', 'EMAIL']);
      });

      it('should default to IN_APP for unknown notification types', () => {
        const request: NotificationRequest = {
          type: 'UNKNOWN_TYPE' as NotificationType,
          recipients: ['user-1'],
          context: {},
        };
        const preferences: NotificationPreferences = {
          userId: 'user-1',
          editSubmitted: ['IN_APP'],
          editApproved: ['IN_APP', 'EMAIL'],
          editRejected: ['IN_APP', 'EMAIL'],
          approvalRequired: ['IN_APP', 'EMAIL'],
          autoStopWarning: ['IN_APP', 'PUSH', 'SMS'],
          reminderFrequency: 'DAILY',
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '06:00',
            timezone: 'UTC',
          },
        };

        const channels = (service as any).determineChannels(request, preferences);
        expect(channels).toEqual(['IN_APP']);
      });
    });

    describe('isInQuietHours', () => {
      it('should return false when quiet hours disabled', () => {
        const preferences: NotificationPreferences = {
          userId: 'user-1',
          editSubmitted: ['IN_APP'],
          editApproved: ['IN_APP', 'EMAIL'],
          editRejected: ['IN_APP', 'EMAIL'],
          approvalRequired: ['IN_APP', 'EMAIL'],
          autoStopWarning: ['IN_APP', 'PUSH', 'SMS'],
          reminderFrequency: 'DAILY',
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '06:00',
            timezone: 'UTC',
          },
        };

        const result = (service as any).isInQuietHours(preferences);
        expect(result).toBe(false);
      });

      it('should detect same-day quiet hours correctly', () => {
        // Mock time to be 14:00 (2 PM)
        vi.spyOn(Date.prototype, 'toTimeString').mockReturnValue('14:00:00 GMT');

        const preferences: NotificationPreferences = {
          userId: 'user-1',
          editSubmitted: ['IN_APP'],
          editApproved: ['IN_APP', 'EMAIL'],
          editRejected: ['IN_APP', 'EMAIL'],
          approvalRequired: ['IN_APP', 'EMAIL'],
          autoStopWarning: ['IN_APP', 'PUSH', 'SMS'],
          reminderFrequency: 'DAILY',
          quietHours: {
            enabled: true,
            startTime: '13:00',
            endTime: '15:00',
            timezone: 'UTC',
          },
        };

        const result = (service as any).isInQuietHours(preferences);
        expect(result).toBe(true);
      });

      it('should detect overnight quiet hours correctly', () => {
        // Mock time to be 01:00 (1 AM)
        vi.spyOn(Date.prototype, 'toTimeString').mockReturnValue('01:00:00 GMT');

        const preferences: NotificationPreferences = {
          userId: 'user-1',
          editSubmitted: ['IN_APP'],
          editApproved: ['IN_APP', 'EMAIL'],
          editRejected: ['IN_APP', 'EMAIL'],
          approvalRequired: ['IN_APP', 'EMAIL'],
          autoStopWarning: ['IN_APP', 'PUSH', 'SMS'],
          reminderFrequency: 'DAILY',
          quietHours: {
            enabled: true,
            startTime: '22:00',
            endTime: '06:00',
            timezone: 'UTC',
          },
        };

        const result = (service as any).isInQuietHours(preferences);
        expect(result).toBe(true);
      });
    });

    describe('shouldSendReminder', () => {
      it('should return false for weekly frequency with high probability', () => {
        const preferences: NotificationPreferences = {
          userId: 'user-1',
          editSubmitted: ['IN_APP'],
          editApproved: ['IN_APP', 'EMAIL'],
          editRejected: ['IN_APP', 'EMAIL'],
          approvalRequired: ['IN_APP', 'EMAIL'],
          autoStopWarning: ['IN_APP', 'PUSH', 'SMS'],
          reminderFrequency: 'WEEKLY',
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '06:00',
            timezone: 'UTC',
          },
        };

        // Mock Math.random to return > 0.8 to test the false case
        vi.spyOn(Math, 'random').mockReturnValue(0.9);

        const result = (service as any).shouldSendReminder(preferences);
        expect(result).toBe(false);
      });

      it('should return true for non-weekly frequency', () => {
        const preferences: NotificationPreferences = {
          userId: 'user-1',
          editSubmitted: ['IN_APP'],
          editApproved: ['IN_APP', 'EMAIL'],
          editRejected: ['IN_APP', 'EMAIL'],
          approvalRequired: ['IN_APP', 'EMAIL'],
          autoStopWarning: ['IN_APP', 'PUSH', 'SMS'],
          reminderFrequency: 'DAILY',
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '06:00',
            timezone: 'UTC',
          },
        };

        const result = (service as any).shouldSendReminder(preferences);
        expect(result).toBe(true);
      });
    });

    describe('renderTemplate', () => {
      it('should interpolate template variables correctly', () => {
        const template = {
          id: 'test',
          name: 'Test Template',
          type: 'EDIT_SUBMITTED' as NotificationType,
          subject: 'Edit by {{recipient.name}}',
          htmlBody: '<p>Reason: {{timeEntryEdit.reason}}</p>',
          textBody: 'Reason: {{timeEntryEdit.reason}}',
          variables: ['timeEntryEdit', 'recipient'],
        };

        const context = {
          timeEntryEdit: { reason: 'Clock error' },
        };

        const recipient = {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          preferredChannels: ['EMAIL'] as NotificationChannel[],
        };

        const result = (service as any).renderTemplate(template, context, recipient);

        expect(result).toEqual({
          subject: 'Edit by John Doe',
          htmlBody: '<p>Reason: Clock error</p>',
          textBody: 'Reason: Clock error',
        });
      });

      it('should handle missing variables gracefully', () => {
        const template = {
          id: 'test',
          name: 'Test Template',
          type: 'EDIT_SUBMITTED' as NotificationType,
          subject: 'Edit by {{recipient.name}} - {{missing.variable}}',
          htmlBody: '<p>{{undefined.property}}</p>',
          textBody: 'Text content',
          variables: ['recipient'],
        };

        const context = {};
        const recipient = {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          preferredChannels: ['EMAIL'] as NotificationChannel[],
        };

        const result = (service as any).renderTemplate(template, context, recipient);

        expect(result.subject).toBe('Edit by John Doe - {{missing.variable}}');
        expect(result.htmlBody).toBe('<p>{{undefined.property}}</p>');
      });
    });

    describe('getRecipient', () => {
      it('should return formatted recipient when user exists', async () => {
        const result = await (service as any).getRecipient('user-1');

        expect(result).toEqual({
          id: 'user-1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          preferredChannels: ['IN_APP', 'EMAIL'],
        });
      });

      it('should return null when user does not exist', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const result = await (service as any).getRecipient('nonexistent');

        expect(result).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in sendNotification gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock template to exist but cause error in processing
      vi.spyOn(service as any, 'getRecipient').mockRejectedValue(new Error('Database error'));

      await expect(
        service.notifyEditSubmitted(mockTimeEntryEdit, false)
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to send notification:', expect.any(Error));
    });

    it('should handle missing template gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create a new service instance with empty templates
      const emptyService = new (class extends TimeEntryNotificationService {
        constructor() {
          super();
          (this as any).templates.clear(); // Clear templates to simulate missing template
        }
      })();

      await emptyService.notifyEditSubmitted(mockTimeEntryEdit, false);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'No template found for notification type: EDIT_SUBMITTED'
      );
    });
  });

  describe('Integration', () => {
    it('should properly build edit context with all relations', async () => {
      const fullEditData = {
        ...mockTimeEntryEdit,
        editor: mockUser,
        laborTimeEntry: {
          user: mockUser,
          workOrder: { id: 'wo-1', number: 'WO001' },
          operation: { id: 'op-1', operationNumber: '010' },
          indirectCode: null,
        },
        machineTimeEntry: null,
      };

      mockPrisma.timeEntryEdit.findUnique.mockResolvedValue(fullEditData);

      const context = await (service as any).buildEditContext(mockTimeEntryEdit);

      expect(context).toEqual({
        timeEntryEdit: fullEditData,
        workOrder: { id: 'wo-1', number: 'WO001' },
        operation: { id: 'op-1', operationNumber: '010' },
      });
    });

    it('should properly build approval context with all relations', async () => {
      const fullApprovalData = {
        ...mockTimeEntryApproval,
        approver: mockSupervisor,
        timeEntryEdit: {
          ...mockTimeEntryEdit,
          editor: mockUser,
          laborTimeEntry: {
            user: mockUser,
            workOrder: { id: 'wo-1' },
            operation: { id: 'op-1' },
          },
        },
      };

      mockPrisma.timeEntryApproval.findUnique.mockResolvedValue(fullApprovalData);

      const context = await (service as any).buildApprovalContext(mockTimeEntryApproval);

      expect(context).toEqual({
        approval: fullApprovalData,
        timeEntryEdit: fullApprovalData.timeEntryEdit,
      });
    });
  });
});