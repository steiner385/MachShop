/**
 * Notifications API Routes
 * GitHub Issue #24: Document Collaboration & Review Features
 *
 * REST API endpoints for notification management system
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { notificationService } from '../services/NotificationService';
import { logger } from '../utils/logger';
import { NotificationType, NotificationChannel, NotificationStatus } from '@prisma/client';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createNotificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
  relatedUserId: z.string().optional(),
  actionUrl: z.string().optional(),
  metadata: z.any().optional(),
  channels: z.array(z.nativeEnum(NotificationChannel)).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  expiresAt: z.string().datetime().optional()
});

const bulkNotificationSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
  relatedUserId: z.string().optional(),
  actionUrl: z.string().optional(),
  metadata: z.any().optional(),
  channels: z.array(z.nativeEnum(NotificationChannel)).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  expiresAt: z.string().datetime().optional()
});

const getNotificationsSchema = z.object({
  types: z.array(z.nativeEnum(NotificationType)).optional(),
  status: z.array(z.nativeEnum(NotificationStatus)).optional(),
  isRead: z.boolean().optional(),
  priority: z.array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).optional().default(25),
  offset: z.number().int().nonnegative().optional().default(0)
});

const commentMentionNotificationSchema = z.object({
  mentionedUserId: z.string().min(1),
  mentionerName: z.string().min(1),
  commentText: z.string().min(1),
  documentType: z.string().min(1),
  documentId: z.string().min(1),
  commentId: z.string().min(1)
});

const reviewAssignmentNotificationSchema = z.object({
  assigneeId: z.string().min(1),
  assigner: z.string().min(1),
  documentTitle: z.string().min(1),
  documentType: z.string().min(1),
  documentId: z.string().min(1),
  reviewId: z.string().min(1),
  dueDate: z.string().datetime().optional()
});

// ============================================================================
// NOTIFICATION CRUD ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/notifications
 * @desc    Create a new notification
 * @access  Private
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = createNotificationSchema.parse(req.body);

    const notification = await notificationService.createNotification({
      ...validatedData,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
    });

    logger.info('Notification created', {
      notificationId: notification.id,
      userId: validatedData.userId,
      type: validatedData.type,
      createdBy: (req as any).user?.id
    });

    res.status(201).json(notification);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications/bulk
 * @desc    Create notifications for multiple users
 * @access  Private
 */
router.post('/bulk', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = bulkNotificationSchema.parse(req.body);

    const notifications = await notificationService.createBulkNotifications(
      validatedData.userIds,
      {
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        relatedEntityType: validatedData.relatedEntityType,
        relatedEntityId: validatedData.relatedEntityId,
        relatedUserId: validatedData.relatedUserId,
        actionUrl: validatedData.actionUrl,
        metadata: validatedData.metadata,
        channels: validatedData.channels,
        priority: validatedData.priority,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
        userId: '' // Will be set per user
      }
    );

    logger.info('Bulk notifications created', {
      userCount: validatedData.userIds.length,
      type: validatedData.type,
      createdBy: (req as any).user?.id
    });

    res.status(201).json({
      message: 'Bulk notifications created successfully',
      count: notifications.length,
      notifications
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/notifications/user/:userId
 * @desc    Get notifications for a user
 * @access  Private
 */
router.get('/user/:userId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { userId } = req.params;

    // Check if user can access these notifications
    const requestingUserId = (req as any).user?.id;
    if (requestingUserId !== userId && !(req as any).user?.isAdmin) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Parse query parameters
    const queryFilters = {
      types: req.query.types ? (req.query.types as string).split(',') as NotificationType[] : undefined,
      status: req.query.status ? (req.query.status as string).split(',') as NotificationStatus[] : undefined,
      isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
      priority: req.query.priority ? (req.query.priority as string).split(',') as ('LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')[] : undefined,
      createdAfter: req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined,
      createdBefore: req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 25,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const notifications = await notificationService.getUserNotifications(userId, queryFilters);

    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/notifications/:notificationId/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put('/:notificationId/read', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { notificationId } = req.params;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const notification = await notificationService.markAsRead(notificationId, userId);

    logger.info('Notification marked as read', {
      userId,
      notificationId
    });

    res.json(notification);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/notifications/user/:userId/read-all
 * @desc    Mark all notifications as read for a user
 * @access  Private
 */
router.put('/user/:userId/read-all', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { userId } = req.params;

    // Check if user can mark these notifications as read
    const requestingUserId = (req as any).user?.id;
    if (requestingUserId !== userId && !(req as any).user?.isAdmin) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const count = await notificationService.markAllAsRead(userId);

    logger.info('All notifications marked as read', { userId, count });

    res.json({ message: 'All notifications marked as read', count });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/notifications/:notificationId
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:notificationId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { notificationId } = req.params;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await notificationService.deleteNotification(notificationId, userId);

    logger.info('Notification deleted', { userId, notificationId });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SPECIALIZED NOTIFICATION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/notifications/comment-mention
 * @desc    Create notification for comment mention
 * @access  Private
 */
router.post('/comment-mention', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = commentMentionNotificationSchema.parse(req.body);

    const notification = await notificationService.createCommentMentionNotification(
      validatedData.mentionedUserId,
      validatedData.mentionerName,
      validatedData.commentText,
      validatedData.documentType,
      validatedData.documentId,
      validatedData.commentId
    );

    logger.info('Comment mention notification created', {
      mentionedUserId: validatedData.mentionedUserId,
      mentionerName: validatedData.mentionerName,
      commentId: validatedData.commentId
    });

    res.status(201).json(notification);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications/comment-reply
 * @desc    Create notification for comment reply
 * @access  Private
 */
router.post('/comment-reply', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      originalAuthorId,
      replierName,
      replyText,
      documentType,
      documentId,
      parentCommentId,
      replyCommentId
    } = req.body;

    if (!originalAuthorId || !replierName || !replyText || !documentType || !documentId || !parentCommentId || !replyCommentId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const notification = await notificationService.createCommentReplyNotification(
      originalAuthorId,
      replierName,
      replyText,
      documentType,
      documentId,
      parentCommentId,
      replyCommentId
    );

    logger.info('Comment reply notification created', {
      originalAuthorId,
      replierName,
      parentCommentId,
      replyCommentId
    });

    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications/review-assignment
 * @desc    Create notification for review assignment
 * @access  Private
 */
router.post('/review-assignment', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = reviewAssignmentNotificationSchema.parse(req.body);

    const notification = await notificationService.createReviewAssignmentNotification(
      validatedData.assigneeId,
      validatedData.assigner,
      validatedData.documentTitle,
      validatedData.documentType,
      validatedData.documentId,
      validatedData.reviewId,
      validatedData.dueDate ? new Date(validatedData.dueDate) : undefined
    );

    logger.info('Review assignment notification created', {
      assigneeId: validatedData.assigneeId,
      assigner: validatedData.assigner,
      reviewId: validatedData.reviewId
    });

    res.status(201).json(notification);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications/review-deadline
 * @desc    Create notification for review deadline reminder
 * @access  Private
 */
router.post('/review-deadline', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      reviewerId,
      documentTitle,
      documentType,
      documentId,
      reviewId,
      dueDate,
      hoursRemaining
    } = req.body;

    if (!reviewerId || !documentTitle || !documentType || !documentId || !reviewId || !dueDate || hoursRemaining === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const notification = await notificationService.createReviewDeadlineNotification(
      reviewerId,
      documentTitle,
      documentType,
      documentId,
      reviewId,
      new Date(dueDate),
      hoursRemaining
    );

    logger.info('Review deadline notification created', {
      reviewerId,
      reviewId,
      hoursRemaining
    });

    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications/document-update
 * @desc    Create notification for document update
 * @access  Private
 */
router.post('/document-update', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      subscriberId,
      updaterName,
      documentTitle,
      documentType,
      documentId,
      changeDescription
    } = req.body;

    if (!subscriberId || !updaterName || !documentTitle || !documentType || !documentId || !changeDescription) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const notification = await notificationService.createDocumentUpdateNotification(
      subscriberId,
      updaterName,
      documentTitle,
      documentType,
      documentId,
      changeDescription
    );

    logger.info('Document update notification created', {
      subscriberId,
      updaterName,
      documentType,
      documentId
    });

    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// STATISTICS AND ANALYTICS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/notifications/user/:userId/stats
 * @desc    Get notification statistics for a user
 * @access  Private
 */
router.get('/user/:userId/stats', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { userId } = req.params;

    // Check if user can access these statistics
    const requestingUserId = (req as any).user?.id;
    if (requestingUserId !== userId && !(req as any).user?.isAdmin) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const stats = await notificationService.getNotificationStats(userId);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// MAINTENANCE ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/notifications/cleanup-expired
 * @desc    Clean up expired notifications (admin only)
 * @access  Private (Admin)
 */
router.post('/cleanup-expired', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Check if user is admin
    if (!(req as any).user?.isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const count = await notificationService.cleanupExpiredNotifications();

    logger.info('Expired notifications cleaned up', {
      count,
      adminUserId: (req as any).user?.id
    });

    res.json({ message: 'Expired notifications cleaned up', count });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/notifications/overdue-reviews
 * @desc    Get overdue review notifications (admin only)
 * @access  Private (Admin)
 */
router.get('/overdue-reviews', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Check if user is admin
    if (!(req as any).user?.isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const overdueReviews = await notificationService.getOverdueReviewNotifications();

    res.json(overdueReviews);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/notifications/types
 * @desc    Get available notification types
 * @access  Private
 */
router.get('/types', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const notificationTypes = Object.values(NotificationType).map(type => ({
      value: type,
      label: type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      description: getNotificationTypeDescription(type)
    }));

    res.json(notificationTypes);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/notifications/channels
 * @desc    Get available notification channels
 * @access  Private
 */
router.get('/channels', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const notificationChannels = Object.values(NotificationChannel).map(channel => ({
      value: channel,
      label: channel.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      description: getNotificationChannelDescription(channel)
    }));

    res.json(notificationChannels);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getNotificationTypeDescription(type: NotificationType): string {
  const descriptions: Record<NotificationType, string> = {
    [NotificationType.COMMENT_MENTION]: 'User mentioned in a comment',
    [NotificationType.COMMENT_REPLY]: 'Reply to user\'s comment',
    [NotificationType.REVIEW_ASSIGNED]: 'Review assignment notification',
    [NotificationType.REVIEW_DEADLINE]: 'Review deadline reminder',
    [NotificationType.DOCUMENT_UPDATED]: 'Document update notification',
    [NotificationType.SYSTEM_ANNOUNCEMENT]: 'System-wide announcement'
  };

  return descriptions[type] || 'Custom notification type';
}

function getNotificationChannelDescription(channel: NotificationChannel): string {
  const descriptions: Record<NotificationChannel, string> = {
    [NotificationChannel.IN_APP]: 'In-application notifications',
    [NotificationChannel.EMAIL]: 'Email notifications',
    [NotificationChannel.SMS]: 'SMS text messages',
    [NotificationChannel.PUSH]: 'Push notifications',
    [NotificationChannel.SLACK]: 'Slack workspace notifications'
  };

  return descriptions[channel] || 'Custom notification channel';
}

export default router;