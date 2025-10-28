import { PrismaClient, UserNotification, NotificationType, NotificationChannel, NotificationStatus } from '@prisma/client';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * TypeScript interfaces for Notification Operations
 */
export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  relatedUserId?: string;
  actionUrl?: string;
  metadata?: any;
  channels?: NotificationChannel[];
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  expiresAt?: Date;
}

export interface NotificationFilters {
  types?: NotificationType[];
  status?: NotificationStatus[];
  isRead?: boolean;
  priority?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface NotificationPreferences {
  userId: string;
  commentMentions: NotificationChannel[];
  commentReplies: NotificationChannel[];
  reviewAssignments: NotificationChannel[];
  reviewDeadlines: NotificationChannel[];
  documentChanges: NotificationChannel[];
  systemUpdates: NotificationChannel[];
  weeklyDigest: boolean;
  dailyDigest: boolean;
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
}

export interface NotificationStats {
  totalNotifications: number;
  unreadNotifications: number;
  notificationsByType: Record<NotificationType, number>;
  notificationsByStatus: Record<NotificationStatus, number>;
}

/**
 * Notification Service - Manages user notifications and preferences
 */
class NotificationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Log Prisma events
    this.prisma.$on('query', (e) => {
      logger.debug('Prisma Query', { query: e.query, params: e.params, duration: e.duration });
    });

    this.prisma.$on('error', (e) => {
      logger.error('Prisma Error', { error: e.message, target: e.target });
    });
  }

  /**
   * Create a new notification
   */
  async createNotification(input: NotificationInput): Promise<UserNotification> {
    try {
      logger.info('Creating notification', {
        userId: input.userId,
        type: input.type,
        title: input.title
      });

      const notification = await this.prisma.userNotification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          relatedUserId: input.relatedUserId,
          actionUrl: input.actionUrl,
          metadata: input.metadata,
          channels: input.channels || [NotificationChannel.IN_APP],
          priority: input.priority || 'MEDIUM',
          expiresAt: input.expiresAt,
        }
      });

      // Send notification through configured channels
      await this.sendNotificationThroughChannels(notification);

      logger.info('Notification created successfully', { notificationId: notification.id });
      return notification;
    } catch (error: any) {
      logger.error('Failed to create notification', { error: error.message, input });
      throw new AppError('Failed to create notification', 500, 'NOTIFICATION_CREATE_FAILED', error);
    }
  }

  /**
   * Create multiple notifications for multiple users
   */
  async createBulkNotifications(users: string[], notificationData: Omit<NotificationInput, 'userId'>): Promise<UserNotification[]> {
    try {
      logger.info('Creating bulk notifications', { userCount: users.length, type: notificationData.type });

      const notifications = await Promise.all(
        users.map(userId =>
          this.createNotification({
            ...notificationData,
            userId
          })
        )
      );

      logger.info('Bulk notifications created successfully', { count: notifications.length });
      return notifications;
    } catch (error: any) {
      logger.error('Failed to create bulk notifications', { error: error.message, userCount: users.length });
      throw new AppError('Failed to create bulk notifications', 500, 'BULK_NOTIFICATION_FAILED', error);
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, filters: NotificationFilters = {}): Promise<UserNotification[]> {
    try {
      logger.info('Getting user notifications', { userId, filters });

      const whereClause: any = {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      };

      // Apply filters
      if (filters.types && filters.types.length > 0) {
        whereClause.type = { in: filters.types };
      }
      if (filters.status && filters.status.length > 0) {
        whereClause.status = { in: filters.status };
      }
      if (filters.isRead !== undefined) {
        whereClause.isRead = filters.isRead;
      }
      if (filters.priority && filters.priority.length > 0) {
        whereClause.priority = { in: filters.priority };
      }
      if (filters.createdAfter) {
        whereClause.createdAt = { ...whereClause.createdAt, gte: filters.createdAfter };
      }
      if (filters.createdBefore) {
        whereClause.createdAt = { ...whereClause.createdAt, lte: filters.createdBefore };
      }

      const notifications = await this.prisma.userNotification.findMany({
        where: whereClause,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: filters.limit,
        skip: filters.offset,
      });

      logger.info('User notifications retrieved successfully', { userId, count: notifications.length });
      return notifications;
    } catch (error: any) {
      logger.error('Failed to get user notifications', { error: error.message, userId });
      throw new AppError('Failed to get user notifications', 500, 'NOTIFICATION_GET_FAILED', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<UserNotification> {
    try {
      logger.info('Marking notification as read', { notificationId, userId });

      const notification = await this.prisma.userNotification.findFirst({
        where: { id: notificationId, userId }
      });

      if (!notification) {
        throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
      }

      const updatedNotification = await this.prisma.userNotification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        }
      });

      logger.info('Notification marked as read', { notificationId });
      return updatedNotification;
    } catch (error: any) {
      logger.error('Failed to mark notification as read', { error: error.message, notificationId });
      throw new AppError('Failed to mark notification as read', 500, 'NOTIFICATION_READ_FAILED', error);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      logger.info('Marking all notifications as read', { userId });

      const result = await this.prisma.userNotification.updateMany({
        where: {
          userId,
          isRead: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        data: {
          isRead: true,
          readAt: new Date(),
        }
      });

      logger.info('All notifications marked as read', { userId, count: result.count });
      return result.count;
    } catch (error: any) {
      logger.error('Failed to mark all notifications as read', { error: error.message, userId });
      throw new AppError('Failed to mark all notifications as read', 500, 'NOTIFICATION_READ_ALL_FAILED', error);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      logger.info('Deleting notification', { notificationId, userId });

      const notification = await this.prisma.userNotification.findFirst({
        where: { id: notificationId, userId }
      });

      if (!notification) {
        throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
      }

      await this.prisma.userNotification.delete({
        where: { id: notificationId }
      });

      logger.info('Notification deleted successfully', { notificationId });
    } catch (error: any) {
      logger.error('Failed to delete notification', { error: error.message, notificationId });
      throw new AppError('Failed to delete notification', 500, 'NOTIFICATION_DELETE_FAILED', error);
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      const notifications = await this.prisma.userNotification.findMany({
        where: {
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        select: {
          type: true,
          status: true,
          isRead: true,
        }
      });

      const totalNotifications = notifications.length;
      const unreadNotifications = notifications.filter(n => !n.isRead).length;

      const notificationsByType: Record<NotificationType, number> = {} as Record<NotificationType, number>;
      const notificationsByStatus: Record<NotificationStatus, number> = {} as Record<NotificationStatus, number>;

      notifications.forEach(notification => {
        notificationsByType[notification.type] = (notificationsByType[notification.type] || 0) + 1;
        notificationsByStatus[notification.status] = (notificationsByStatus[notification.status] || 0) + 1;
      });

      return {
        totalNotifications,
        unreadNotifications,
        notificationsByType,
        notificationsByStatus
      };
    } catch (error: any) {
      logger.error('Failed to get notification statistics', { error: error.message, userId });
      throw new AppError('Failed to get notification statistics', 500, 'NOTIFICATION_STATS_FAILED', error);
    }
  }

  /**
   * Create comment mention notification
   */
  async createCommentMentionNotification(
    mentionedUserId: string,
    mentionerName: string,
    commentText: string,
    documentType: string,
    documentId: string,
    commentId: string
  ): Promise<UserNotification> {
    return this.createNotification({
      userId: mentionedUserId,
      type: NotificationType.COMMENT_MENTION,
      title: `${mentionerName} mentioned you in a comment`,
      message: `"${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}"`,
      relatedEntityType: 'COMMENT',
      relatedEntityId: commentId,
      relatedUserId: mentionerName,
      actionUrl: `/documents/${documentType.toLowerCase()}/${documentId}#comment-${commentId}`,
      metadata: {
        documentType,
        documentId,
        commentId,
        mentionerName
      },
      priority: 'MEDIUM'
    });
  }

  /**
   * Create comment reply notification
   */
  async createCommentReplyNotification(
    originalAuthorId: string,
    replierName: string,
    replyText: string,
    documentType: string,
    documentId: string,
    parentCommentId: string,
    replyCommentId: string
  ): Promise<UserNotification> {
    return this.createNotification({
      userId: originalAuthorId,
      type: NotificationType.COMMENT_REPLY,
      title: `${replierName} replied to your comment`,
      message: `"${replyText.substring(0, 100)}${replyText.length > 100 ? '...' : ''}"`,
      relatedEntityType: 'COMMENT',
      relatedEntityId: replyCommentId,
      relatedUserId: replierName,
      actionUrl: `/documents/${documentType.toLowerCase()}/${documentId}#comment-${replyCommentId}`,
      metadata: {
        documentType,
        documentId,
        parentCommentId,
        replyCommentId,
        replierName
      },
      priority: 'MEDIUM'
    });
  }

  /**
   * Create review assignment notification
   */
  async createReviewAssignmentNotification(
    assigneeId: string,
    assigner: string,
    documentTitle: string,
    documentType: string,
    documentId: string,
    reviewId: string,
    dueDate?: Date
  ): Promise<UserNotification> {
    const dueDateText = dueDate ? ` (due ${dueDate.toLocaleDateString()})` : '';

    return this.createNotification({
      userId: assigneeId,
      type: NotificationType.REVIEW_ASSIGNED,
      title: 'New review assignment',
      message: `${assigner} assigned you to review "${documentTitle}"${dueDateText}`,
      relatedEntityType: 'REVIEW',
      relatedEntityId: reviewId,
      relatedUserId: assigner,
      actionUrl: `/reviews/${reviewId}`,
      metadata: {
        documentType,
        documentId,
        documentTitle,
        reviewId,
        assigner,
        dueDate: dueDate?.toISOString()
      },
      priority: 'HIGH',
      expiresAt: dueDate ? new Date(dueDate.getTime() + 24 * 60 * 60 * 1000) : undefined // Expire 1 day after due date
    });
  }

  /**
   * Create review deadline reminder notification
   */
  async createReviewDeadlineNotification(
    reviewerId: string,
    documentTitle: string,
    documentType: string,
    documentId: string,
    reviewId: string,
    dueDate: Date,
    hoursRemaining: number
  ): Promise<UserNotification> {
    const urgency = hoursRemaining <= 24 ? 'URGENT' : hoursRemaining <= 72 ? 'HIGH' : 'MEDIUM';
    const timeText = hoursRemaining <= 24 ? `${hoursRemaining} hours` : `${Math.ceil(hoursRemaining / 24)} days`;

    return this.createNotification({
      userId: reviewerId,
      type: NotificationType.REVIEW_DEADLINE,
      title: 'Review deadline approaching',
      message: `Review for "${documentTitle}" is due in ${timeText}`,
      relatedEntityType: 'REVIEW',
      relatedEntityId: reviewId,
      actionUrl: `/reviews/${reviewId}`,
      metadata: {
        documentType,
        documentId,
        documentTitle,
        reviewId,
        dueDate: dueDate.toISOString(),
        hoursRemaining
      },
      priority: urgency,
      expiresAt: new Date(dueDate.getTime() + 24 * 60 * 60 * 1000) // Expire 1 day after due date
    });
  }

  /**
   * Create document update notification
   */
  async createDocumentUpdateNotification(
    subscriberId: string,
    updaterName: string,
    documentTitle: string,
    documentType: string,
    documentId: string,
    changeDescription: string
  ): Promise<UserNotification> {
    return this.createNotification({
      userId: subscriberId,
      type: NotificationType.DOCUMENT_UPDATED,
      title: 'Document updated',
      message: `${updaterName} updated "${documentTitle}": ${changeDescription}`,
      relatedEntityType: documentType,
      relatedEntityId: documentId,
      relatedUserId: updaterName,
      actionUrl: `/documents/${documentType.toLowerCase()}/${documentId}`,
      metadata: {
        documentType,
        documentId,
        documentTitle,
        updaterName,
        changeDescription
      },
      priority: 'LOW'
    });
  }

  /**
   * Send notification through configured channels
   */
  private async sendNotificationThroughChannels(notification: UserNotification): Promise<void> {
    try {
      const channels = notification.channels as NotificationChannel[];

      for (const channel of channels) {
        switch (channel) {
          case NotificationChannel.IN_APP:
            // Already stored in database
            break;
          case NotificationChannel.EMAIL:
            await this.sendEmailNotification(notification);
            break;
          case NotificationChannel.SMS:
            await this.sendSMSNotification(notification);
            break;
          case NotificationChannel.PUSH:
            await this.sendPushNotification(notification);
            break;
          case NotificationChannel.SLACK:
            await this.sendSlackNotification(notification);
            break;
        }
      }
    } catch (error: any) {
      logger.error('Failed to send notification through channels', {
        error: error.message,
        notificationId: notification.id
      });
      // Don't throw error - notification is still created in database
    }
  }

  /**
   * Send email notification (placeholder implementation)
   */
  private async sendEmailNotification(notification: UserNotification): Promise<void> {
    // TODO: Implement email sending (e.g., using SendGrid, AWS SES, etc.)
    logger.info('Email notification would be sent', {
      notificationId: notification.id,
      userId: notification.userId,
      title: notification.title
    });
  }

  /**
   * Send SMS notification (placeholder implementation)
   */
  private async sendSMSNotification(notification: UserNotification): Promise<void> {
    // TODO: Implement SMS sending (e.g., using Twilio, AWS SNS, etc.)
    logger.info('SMS notification would be sent', {
      notificationId: notification.id,
      userId: notification.userId,
      title: notification.title
    });
  }

  /**
   * Send push notification (placeholder implementation)
   */
  private async sendPushNotification(notification: UserNotification): Promise<void> {
    // TODO: Implement push notifications (e.g., using Firebase, APNs, etc.)
    logger.info('Push notification would be sent', {
      notificationId: notification.id,
      userId: notification.userId,
      title: notification.title
    });
  }

  /**
   * Send Slack notification (placeholder implementation)
   */
  private async sendSlackNotification(notification: UserNotification): Promise<void> {
    // TODO: Implement Slack integration
    logger.info('Slack notification would be sent', {
      notificationId: notification.id,
      userId: notification.userId,
      title: notification.title
    });
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      logger.info('Cleaning up expired notifications');

      const result = await this.prisma.userNotification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      logger.info('Expired notifications cleaned up', { count: result.count });
      return result.count;
    } catch (error: any) {
      logger.error('Failed to cleanup expired notifications', { error: error.message });
      throw new AppError('Failed to cleanup expired notifications', 500, 'NOTIFICATION_CLEANUP_FAILED', error);
    }
  }

  /**
   * Get overdue review notifications that need to be sent
   */
  async getOverdueReviewNotifications(): Promise<Array<{
    reviewId: string;
    assigneeId: string;
    documentTitle: string;
    documentType: string;
    documentId: string;
    dueDate: Date;
    hoursOverdue: number;
  }>> {
    try {
      // This would typically query the ReviewAssignment table
      // For now, return empty array as placeholder
      logger.info('Getting overdue review notifications');
      return [];
    } catch (error: any) {
      logger.error('Failed to get overdue review notifications', { error: error.message });
      throw new AppError('Failed to get overdue review notifications', 500, 'OVERDUE_REVIEWS_FAILED', error);
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const notificationService = new NotificationService();
export default notificationService;