/**
 * NotificationService Tests
 * Comprehensive test suite for notification management and multi-channel delivery
 *
 * GitHub Issue #176: Epic 2: Backend Service Testing - Phase 2 (Business Critical)
 * Priority: P1 - Milestone 2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import NotificationService, {
  NotificationInput,
  NotificationFilters,
  NotificationPreferences,
  NotificationStats
} from '../../services/NotificationService';
import {
  UserNotification,
  NotificationType,
  NotificationChannel,
  NotificationStatus
} from '@prisma/client';
import prisma from '../../lib/database';
import logger from '../../utils/logger';

// Mock dependencies
vi.mock('../../lib/database', () => ({
  default: {
    userNotification: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    notificationPreferences: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('NotificationService', () => {
  let service: NotificationService;
  let mockPrisma: any;
  let mockLogger: any;

  // Mock data
  const mockNotification: UserNotification = {
    id: 'notif-1',
    userId: 'user-1',
    type: NotificationType.COMMENT_MENTION,
    title: 'You were mentioned',
    message: 'John mentioned you in a comment',
    relatedEntityType: 'comment',
    relatedEntityId: 'comment-123',
    relatedUserId: 'user-2',
    actionUrl: '/comments/123',
    metadata: { commentId: 'comment-123' },
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: 'MEDIUM',
    status: NotificationStatus.UNREAD,
    isRead: false,
    readAt: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNotificationInput: NotificationInput = {
    userId: 'user-1',
    type: NotificationType.COMMENT_MENTION,
    title: 'You were mentioned',
    message: 'John mentioned you in a comment',
    relatedEntityType: 'comment',
    relatedEntityId: 'comment-123',
    relatedUserId: 'user-2',
    actionUrl: '/comments/123',
    metadata: { commentId: 'comment-123' },
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    priority: 'MEDIUM',
  };

  const mockUser = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+1234567890',
  };

  beforeEach(() => {
    service = new NotificationService();
    mockPrisma = prisma as any;
    mockLogger = logger as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(NotificationService);
    });
  });

  describe('Notification Creation', () => {
    describe('createNotification', () => {
      beforeEach(() => {
        mockPrisma.userNotification.create.mockResolvedValue(mockNotification);
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      });

      it('should create notification with valid input', async () => {
        const result = await service.createNotification(mockNotificationInput);

        expect(result).toEqual(mockNotification);
        expect(mockPrisma.userNotification.create).toHaveBeenCalledWith({
          data: {
            userId: mockNotificationInput.userId,
            type: mockNotificationInput.type,
            title: mockNotificationInput.title,
            message: mockNotificationInput.message,
            relatedEntityType: mockNotificationInput.relatedEntityType,
            relatedEntityId: mockNotificationInput.relatedEntityId,
            relatedUserId: mockNotificationInput.relatedUserId,
            actionUrl: mockNotificationInput.actionUrl,
            metadata: mockNotificationInput.metadata,
            channels: mockNotificationInput.channels,
            priority: mockNotificationInput.priority,
            expiresAt: mockNotificationInput.expiresAt,
            status: NotificationStatus.UNREAD,
          },
        });
      });

      it('should handle minimum required fields', async () => {
        const minimalInput: NotificationInput = {
          userId: 'user-1',
          type: NotificationType.SYSTEM_ALERT,
          title: 'System Alert',
          message: 'System maintenance scheduled',
        };

        await service.createNotification(minimalInput);

        expect(mockPrisma.userNotification.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-1',
            type: NotificationType.SYSTEM_ALERT,
            title: 'System Alert',
            message: 'System maintenance scheduled',
            relatedEntityType: undefined,
            relatedEntityId: undefined,
            relatedUserId: undefined,
            actionUrl: undefined,
            metadata: undefined,
            channels: undefined,
            priority: undefined,
            expiresAt: undefined,
            status: NotificationStatus.UNREAD,
          },
        });
      });

      it('should set expiration date when provided', async () => {
        const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        const inputWithExpiry = {
          ...mockNotificationInput,
          expiresAt: expiryDate,
        };

        await service.createNotification(inputWithExpiry);

        expect(mockPrisma.userNotification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            expiresAt: expiryDate,
          }),
        });
      });

      it('should handle database errors gracefully', async () => {
        mockPrisma.userNotification.create.mockRejectedValue(new Error('Database error'));

        await expect(service.createNotification(mockNotificationInput)).rejects.toThrow(
          'Database error'
        );
      });

      it('should validate required fields', async () => {
        const invalidInput = {
          userId: '',
          type: NotificationType.COMMENT_MENTION,
          title: '',
          message: '',
        };

        await expect(service.createNotification(invalidInput)).rejects.toThrow();
      });
    });

    describe('createBulkNotifications', () => {
      beforeEach(() => {
        mockPrisma.userNotification.createMany.mockResolvedValue({ count: 3 });
        mockPrisma.userNotification.findMany.mockResolvedValue([
          { ...mockNotification, id: 'notif-1', userId: 'user-1' },
          { ...mockNotification, id: 'notif-2', userId: 'user-2' },
          { ...mockNotification, id: 'notif-3', userId: 'user-3' },
        ]);
      });

      it('should create bulk notifications for multiple users', async () => {
        const userIds = ['user-1', 'user-2', 'user-3'];
        const notificationData = {
          type: NotificationType.SYSTEM_ALERT,
          title: 'System Maintenance',
          message: 'System will be down for maintenance',
          priority: 'HIGH' as const,
        };

        const result = await service.createBulkNotifications(userIds, notificationData);

        expect(result).toHaveLength(3);
        expect(mockPrisma.userNotification.createMany).toHaveBeenCalledWith({
          data: userIds.map(userId => ({
            userId,
            ...notificationData,
            status: NotificationStatus.UNREAD,
          })),
        });
      });

      it('should handle empty user array', async () => {
        const result = await service.createBulkNotifications([], mockNotificationInput);

        expect(result).toEqual([]);
        expect(mockPrisma.userNotification.createMany).not.toHaveBeenCalled();
      });

      it('should limit bulk operation size', async () => {
        const largeUserArray = Array.from({ length: 1001 }, (_, i) => `user-${i}`);

        await expect(
          service.createBulkNotifications(largeUserArray, mockNotificationInput)
        ).rejects.toThrow('Cannot create more than 1000 notifications at once');
      });
    });
  });

  describe('Notification Retrieval', () => {
    describe('getUserNotifications', () => {
      beforeEach(() => {
        mockPrisma.userNotification.findMany.mockResolvedValue([mockNotification]);
      });

      it('should get user notifications without filters', async () => {
        const result = await service.getUserNotifications('user-1');

        expect(result).toEqual([mockNotification]);
        expect(mockPrisma.userNotification.findMany).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
          take: 50,
          skip: 0,
        });
      });

      it('should apply filters correctly', async () => {
        const filters: NotificationFilters = {
          types: [NotificationType.COMMENT_MENTION, NotificationType.REVIEW_ASSIGNMENT],
          status: [NotificationStatus.UNREAD],
          isRead: false,
          priority: ['HIGH', 'URGENT'],
          createdAfter: new Date('2023-11-01'),
          createdBefore: new Date('2023-11-30'),
          limit: 25,
          offset: 10,
        };

        await service.getUserNotifications('user-1', filters);

        expect(mockPrisma.userNotification.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-1',
            type: { in: filters.types },
            status: { in: filters.status },
            isRead: false,
            priority: { in: filters.priority },
            createdAt: {
              gte: filters.createdAfter,
              lte: filters.createdBefore,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 25,
          skip: 10,
        });
      });

      it('should handle partial filters', async () => {
        const partialFilters: NotificationFilters = {
          types: [NotificationType.SYSTEM_ALERT],
          limit: 10,
        };

        await service.getUserNotifications('user-1', partialFilters);

        expect(mockPrisma.userNotification.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-1',
            type: { in: partialFilters.types },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          skip: 0,
        });
      });

      it('should apply default pagination limits', async () => {
        await service.getUserNotifications('user-1', { limit: 200 });

        expect(mockPrisma.userNotification.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 100, // Should be capped at maximum
          })
        );
      });
    });
  });

  describe('Notification Status Management', () => {
    describe('markAsRead', () => {
      beforeEach(() => {
        mockPrisma.userNotification.findUnique.mockResolvedValue(mockNotification);
        mockPrisma.userNotification.update.mockResolvedValue({
          ...mockNotification,
          isRead: true,
          readAt: new Date(),
          status: NotificationStatus.READ,
        });
      });

      it('should mark notification as read', async () => {
        const result = await service.markAsRead('notif-1', 'user-1');

        expect(result.isRead).toBe(true);
        expect(result.readAt).toBeDefined();
        expect(mockPrisma.userNotification.update).toHaveBeenCalledWith({
          where: { id: 'notif-1' },
          data: {
            isRead: true,
            readAt: expect.any(Date),
            status: NotificationStatus.READ,
          },
        });
      });

      it('should verify notification ownership', async () => {
        mockPrisma.userNotification.findUnique.mockResolvedValue({
          ...mockNotification,
          userId: 'different-user',
        });

        await expect(service.markAsRead('notif-1', 'user-1')).rejects.toThrow(
          'Notification not found or access denied'
        );
      });

      it('should handle non-existent notification', async () => {
        mockPrisma.userNotification.findUnique.mockResolvedValue(null);

        await expect(service.markAsRead('non-existent', 'user-1')).rejects.toThrow(
          'Notification not found or access denied'
        );
      });
    });

    describe('markAllAsRead', () => {
      beforeEach(() => {
        mockPrisma.userNotification.updateMany.mockResolvedValue({ count: 5 });
      });

      it('should mark all user notifications as read', async () => {
        const count = await service.markAllAsRead('user-1');

        expect(count).toBe(5);
        expect(mockPrisma.userNotification.updateMany).toHaveBeenCalledWith({
          where: {
            userId: 'user-1',
            isRead: false,
          },
          data: {
            isRead: true,
            readAt: expect.any(Date),
            status: NotificationStatus.READ,
          },
        });
      });

      it('should return zero when no unread notifications', async () => {
        mockPrisma.userNotification.updateMany.mockResolvedValue({ count: 0 });

        const count = await service.markAllAsRead('user-1');

        expect(count).toBe(0);
      });
    });

    describe('deleteNotification', () => {
      beforeEach(() => {
        mockPrisma.userNotification.findUnique.mockResolvedValue(mockNotification);
        mockPrisma.userNotification.delete.mockResolvedValue(mockNotification);
      });

      it('should delete notification with ownership verification', async () => {
        await service.deleteNotification('notif-1', 'user-1');

        expect(mockPrisma.userNotification.delete).toHaveBeenCalledWith({
          where: { id: 'notif-1' },
        });
      });

      it('should prevent deletion of other users notifications', async () => {
        mockPrisma.userNotification.findUnique.mockResolvedValue({
          ...mockNotification,
          userId: 'different-user',
        });

        await expect(service.deleteNotification('notif-1', 'user-1')).rejects.toThrow(
          'Notification not found or access denied'
        );
      });
    });
  });

  describe('Notification Statistics', () => {
    describe('getNotificationStats', () => {
      beforeEach(() => {
        mockPrisma.userNotification.aggregate.mockResolvedValue({
          _count: { id: 25 },
        });
        mockPrisma.userNotification.count
          .mockResolvedValueOnce(10) // unread count
          .mockResolvedValueOnce(15) // read count
          .mockResolvedValueOnce(3)  // urgent count
          .mockResolvedValueOnce(7)  // high priority count
          .mockResolvedValueOnce(8); // today count
      });

      it('should return comprehensive notification statistics', async () => {
        const stats = await service.getNotificationStats('user-1');

        expect(stats).toEqual({
          total: 25,
          unread: 10,
          read: 15,
          urgent: 3,
          high: 7,
          today: 8,
        });
      });

      it('should handle zero counts correctly', async () => {
        mockPrisma.userNotification.aggregate.mockResolvedValue({ _count: { id: 0 } });
        mockPrisma.userNotification.count.mockResolvedValue(0);

        const stats = await service.getNotificationStats('user-1');

        expect(stats.total).toBe(0);
        expect(stats.unread).toBe(0);
      });
    });
  });

  describe('Specialized Notification Types', () => {
    describe('createCommentMentionNotification', () => {
      beforeEach(() => {
        mockPrisma.userNotification.create.mockResolvedValue(mockNotification);
      });

      it('should create comment mention notification', async () => {
        await service.createCommentMentionNotification(
          'user-1',
          'commenter-2',
          'comment-123',
          'Check this out!'
        );

        expect(mockPrisma.userNotification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            type: NotificationType.COMMENT_MENTION,
            title: expect.stringContaining('mentioned you'),
            relatedEntityType: 'comment',
            relatedEntityId: 'comment-123',
            relatedUserId: 'commenter-2',
          }),
        });
      });

      it('should generate appropriate action URL', async () => {
        await service.createCommentMentionNotification(
          'user-1',
          'commenter-2',
          'comment-123',
          'Check this out!'
        );

        expect(mockPrisma.userNotification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            actionUrl: '/comments/comment-123',
          }),
        });
      });
    });

    describe('createCommentReplyNotification', () => {
      it('should create comment reply notification', async () => {
        await service.createCommentReplyNotification(
          'original-commenter',
          'replier-2',
          'parent-comment-123',
          'reply-comment-456'
        );

        expect(mockPrisma.userNotification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            type: NotificationType.COMMENT_REPLY,
            title: expect.stringContaining('replied to your comment'),
            relatedEntityType: 'comment',
            relatedEntityId: 'reply-comment-456',
          }),
        });
      });
    });

    describe('createReviewAssignmentNotification', () => {
      it('should create review assignment notification', async () => {
        await service.createReviewAssignmentNotification(
          'reviewer-1',
          'assigner-2',
          'review-123',
          'Code Review',
          new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days deadline
        );

        expect(mockPrisma.userNotification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            type: NotificationType.REVIEW_ASSIGNMENT,
            title: expect.stringContaining('assigned you a review'),
            relatedEntityType: 'review',
            relatedEntityId: 'review-123',
            priority: 'MEDIUM',
          }),
        });
      });

      it('should set high priority for urgent deadlines', async () => {
        const urgentDeadline = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

        await service.createReviewAssignmentNotification(
          'reviewer-1',
          'assigner-2',
          'review-123',
          'Urgent Review',
          urgentDeadline
        );

        expect(mockPrisma.userNotification.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            priority: 'HIGH',
          }),
        });
      });
    });
  });

  describe('Multi-Channel Delivery', () => {
    describe('sendNotificationThroughChannels', () => {
      beforeEach(() => {
        // Mock private methods
        vi.spyOn(service as any, 'sendEmailNotification').mockResolvedValue(undefined);
        vi.spyOn(service as any, 'sendSMSNotification').mockResolvedValue(undefined);
        vi.spyOn(service as any, 'sendPushNotification').mockResolvedValue(undefined);
        vi.spyOn(service as any, 'sendSlackNotification').mockResolvedValue(undefined);
      });

      it('should send through all specified channels', async () => {
        const notification = {
          ...mockNotification,
          channels: [
            NotificationChannel.EMAIL,
            NotificationChannel.SMS,
            NotificationChannel.PUSH,
            NotificationChannel.SLACK,
          ],
        };

        await (service as any).sendNotificationThroughChannels(notification);

        expect((service as any).sendEmailNotification).toHaveBeenCalledWith(notification);
        expect((service as any).sendSMSNotification).toHaveBeenCalledWith(notification);
        expect((service as any).sendPushNotification).toHaveBeenCalledWith(notification);
        expect((service as any).sendSlackNotification).toHaveBeenCalledWith(notification);
      });

      it('should handle channel delivery errors gracefully', async () => {
        const notification = {
          ...mockNotification,
          channels: [NotificationChannel.EMAIL],
        };

        (service as any).sendEmailNotification.mockRejectedValue(new Error('Email failed'));

        await expect(
          (service as any).sendNotificationThroughChannels(notification)
        ).resolves.not.toThrow();

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to send notification via EMAIL'),
          expect.any(Error)
        );
      });
    });

    describe('Channel-specific delivery methods', () => {
      it('should handle email notification delivery', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        await (service as any).sendEmailNotification(mockNotification);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Email notification sent'),
          expect.objectContaining({
            notificationId: mockNotification.id,
            email: mockUser.email,
          })
        );
      });

      it('should handle SMS notification delivery', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        await (service as any).sendSMSNotification(mockNotification);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('SMS notification sent'),
          expect.objectContaining({
            notificationId: mockNotification.id,
            phone: mockUser.phoneNumber,
          })
        );
      });

      it('should handle push notification delivery', async () => {
        await (service as any).sendPushNotification(mockNotification);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Push notification sent'),
          expect.objectContaining({
            notificationId: mockNotification.id,
            userId: mockNotification.userId,
          })
        );
      });

      it('should skip channels when user info missing', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, email: null });

        await (service as any).sendEmailNotification(mockNotification);

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('No email address')
        );
      });
    });
  });

  describe('Maintenance and Cleanup', () => {
    describe('cleanupExpiredNotifications', () => {
      beforeEach(() => {
        mockPrisma.userNotification.deleteMany.mockResolvedValue({ count: 15 });
      });

      it('should delete expired notifications', async () => {
        const deletedCount = await service.cleanupExpiredNotifications();

        expect(deletedCount).toBe(15);
        expect(mockPrisma.userNotification.deleteMany).toHaveBeenCalledWith({
          where: {
            expiresAt: {
              lt: expect.any(Date),
            },
          },
        });
      });

      it('should return zero when no expired notifications', async () => {
        mockPrisma.userNotification.deleteMany.mockResolvedValue({ count: 0 });

        const deletedCount = await service.cleanupExpiredNotifications();

        expect(deletedCount).toBe(0);
      });
    });

    describe('getOverdueReviewNotifications', () => {
      beforeEach(() => {
        mockPrisma.userNotification.findMany.mockResolvedValue([
          {
            ...mockNotification,
            type: NotificationType.REVIEW_ASSIGNMENT,
            metadata: { reviewId: 'review-123', deadline: new Date() },
          },
        ]);
      });

      it('should find overdue review notifications', async () => {
        const overdueNotifications = await service.getOverdueReviewNotifications();

        expect(overdueNotifications).toHaveLength(1);
        expect(mockPrisma.userNotification.findMany).toHaveBeenCalledWith({
          where: {
            type: NotificationType.REVIEW_ASSIGNMENT,
            status: NotificationStatus.UNREAD,
            createdAt: {
              lt: expect.any(Date),
            },
          },
          include: {
            user: true,
          },
        });
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null/undefined user IDs gracefully', async () => {
      await expect(service.getUserNotifications('')).resolves.toEqual([]);
      await expect(service.getNotificationStats('')).resolves.toBeDefined();
    });

    it('should handle malformed metadata gracefully', async () => {
      const notificationWithBadMetadata = {
        ...mockNotificationInput,
        metadata: 'invalid-json-string',
      };

      mockPrisma.userNotification.create.mockResolvedValue(mockNotification);

      await expect(
        service.createNotification(notificationWithBadMetadata)
      ).resolves.toBeDefined();
    });

    it('should handle large notification volumes', async () => {
      const largeUserList = Array.from({ length: 500 }, (_, i) => `user-${i}`);
      mockPrisma.userNotification.createMany.mockResolvedValue({ count: 500 });
      mockPrisma.userNotification.findMany.mockResolvedValue([]);

      const result = await service.createBulkNotifications(largeUserList, mockNotificationInput);

      expect(result).toHaveLength(0); // findMany returns empty array
      expect(mockPrisma.userNotification.createMany).toHaveBeenCalled();
    });

    it('should handle database connection failures', async () => {
      mockPrisma.userNotification.create.mockRejectedValue(new Error('Connection failed'));

      await expect(service.createNotification(mockNotificationInput)).rejects.toThrow(
        'Connection failed'
      );
    });
  });

  describe('Performance and Scalability', () => {
    it('should efficiently handle bulk notification creation', async () => {
      const startTime = Date.now();
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);

      mockPrisma.userNotification.createMany.mockResolvedValue({ count: 100 });
      mockPrisma.userNotification.findMany.mockResolvedValue([]);

      await service.createBulkNotifications(userIds, mockNotificationInput);

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should use appropriate pagination defaults', async () => {
      await service.getUserNotifications('user-1', { limit: undefined });

      expect(mockPrisma.userNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50, // Default limit
          skip: 0,  // Default offset
        })
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should support workflow notification integration', async () => {
      const workflowNotification: NotificationInput = {
        userId: 'user-1',
        type: NotificationType.WORKFLOW_STATUS_CHANGE,
        title: 'Workflow Status Changed',
        message: 'Your work order has been approved',
        relatedEntityType: 'workorder',
        relatedEntityId: 'wo-123',
        actionUrl: '/workorders/wo-123',
        priority: 'MEDIUM',
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      };

      mockPrisma.userNotification.create.mockResolvedValue({
        ...mockNotification,
        ...workflowNotification,
      });

      const result = await service.createNotification(workflowNotification);

      expect(result.type).toBe(NotificationType.WORKFLOW_STATUS_CHANGE);
      expect(result.relatedEntityType).toBe('workorder');
    });

    it('should support system maintenance notifications', async () => {
      const maintenanceUsers = ['user-1', 'user-2', 'user-3'];
      const maintenanceNotification = {
        type: NotificationType.SYSTEM_ALERT,
        title: 'Scheduled Maintenance',
        message: 'System will be unavailable from 2:00 AM to 4:00 AM UTC',
        priority: 'HIGH' as const,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      mockPrisma.userNotification.createMany.mockResolvedValue({ count: 3 });
      mockPrisma.userNotification.findMany.mockResolvedValue([]);

      const result = await service.createBulkNotifications(maintenanceUsers, maintenanceNotification);

      expect(mockPrisma.userNotification.createMany).toHaveBeenCalledWith({
        data: maintenanceUsers.map(userId => ({
          userId,
          ...maintenanceNotification,
          status: NotificationStatus.UNREAD,
        })),
      });
    });
  });
});