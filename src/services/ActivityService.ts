import { PrismaClient, DocumentActivity, ActivityType } from '@prisma/client';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * TypeScript interfaces for Activity Operations
 */
export interface ActivityInput {
  documentType: string;
  documentId: string;
  activityType: ActivityType;
  description: string;
  userId: string;
  userName: string;
  details?: any;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: any;
}

export interface ActivityFilters {
  documentType?: string;
  documentId?: string;
  activityTypes?: ActivityType[];
  userId?: string;
  relatedEntityType?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface ActivitySummary {
  documentType: string;
  documentId: string;
  totalActivities: number;
  activitiesByType: Record<ActivityType, number>;
  activitiesByUser: Record<string, number>;
  recentActivities: DocumentActivity[];
  mostActiveUsers: Array<{
    userId: string;
    userName: string;
    activityCount: number;
  }>;
}

export interface UserActivitySummary {
  userId: string;
  totalActivities: number;
  activitiesByType: Record<ActivityType, number>;
  activitiesByDocument: Record<string, number>;
  recentActivities: DocumentActivity[];
}

/**
 * Activity Service - Tracks document activities and provides activity feeds
 */
class ActivityService {
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
   * Log a document activity
   */
  async logActivity(input: ActivityInput): Promise<DocumentActivity> {
    try {
      logger.info('Logging document activity', {
        documentType: input.documentType,
        documentId: input.documentId,
        activityType: input.activityType,
        userId: input.userId
      });

      const activity = await this.prisma.documentActivity.create({
        data: {
          documentType: input.documentType,
          documentId: input.documentId,
          activityType: input.activityType,
          description: input.description,
          userId: input.userId,
          userName: input.userName,
          details: input.details,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          metadata: input.metadata,
        }
      });

      logger.info('Activity logged successfully', { activityId: activity.id });
      return activity;
    } catch (error: any) {
      logger.error('Failed to log activity', { error: error.message, input });
      throw new AppError('Failed to log activity', 500, 'ACTIVITY_LOG_FAILED', error);
    }
  }

  /**
   * Get activities for a document
   */
  async getDocumentActivities(documentType: string, documentId: string, filters: ActivityFilters = {}): Promise<DocumentActivity[]> {
    try {
      logger.info('Getting document activities', { documentType, documentId, filters });

      const whereClause: any = {
        documentType,
        documentId,
      };

      // Apply filters
      if (filters.activityTypes && filters.activityTypes.length > 0) {
        whereClause.activityType = { in: filters.activityTypes };
      }
      if (filters.userId) {
        whereClause.userId = filters.userId;
      }
      if (filters.relatedEntityType) {
        whereClause.relatedEntityType = filters.relatedEntityType;
      }
      if (filters.createdAfter) {
        whereClause.createdAt = { ...whereClause.createdAt, gte: filters.createdAfter };
      }
      if (filters.createdBefore) {
        whereClause.createdAt = { ...whereClause.createdAt, lte: filters.createdBefore };
      }

      const activities = await this.prisma.documentActivity.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      });

      logger.info('Document activities retrieved successfully', {
        documentType,
        documentId,
        count: activities.length
      });

      return activities;
    } catch (error: any) {
      logger.error('Failed to get document activities', { error: error.message, documentType, documentId });
      throw new AppError('Failed to get document activities', 500, 'ACTIVITY_GET_FAILED', error);
    }
  }

  /**
   * Get activities for a user across all documents
   */
  async getUserActivities(userId: string, filters: ActivityFilters = {}): Promise<DocumentActivity[]> {
    try {
      logger.info('Getting user activities', { userId, filters });

      const whereClause: any = {
        userId,
      };

      // Apply filters
      if (filters.documentType) {
        whereClause.documentType = filters.documentType;
      }
      if (filters.documentId) {
        whereClause.documentId = filters.documentId;
      }
      if (filters.activityTypes && filters.activityTypes.length > 0) {
        whereClause.activityType = { in: filters.activityTypes };
      }
      if (filters.relatedEntityType) {
        whereClause.relatedEntityType = filters.relatedEntityType;
      }
      if (filters.createdAfter) {
        whereClause.createdAt = { ...whereClause.createdAt, gte: filters.createdAfter };
      }
      if (filters.createdBefore) {
        whereClause.createdAt = { ...whereClause.createdAt, lte: filters.createdBefore };
      }

      const activities = await this.prisma.documentActivity.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      });

      logger.info('User activities retrieved successfully', { userId, count: activities.length });
      return activities;
    } catch (error: any) {
      logger.error('Failed to get user activities', { error: error.message, userId });
      throw new AppError('Failed to get user activities', 500, 'USER_ACTIVITY_GET_FAILED', error);
    }
  }

  /**
   * Get activity summary for a document
   */
  async getDocumentActivitySummary(documentType: string, documentId: string, timeRange?: { start: Date; end: Date }): Promise<ActivitySummary> {
    try {
      logger.info('Getting document activity summary', { documentType, documentId, timeRange });

      const whereClause: any = {
        documentType,
        documentId,
      };

      if (timeRange) {
        whereClause.createdAt = {
          gte: timeRange.start,
          lte: timeRange.end
        };
      }

      const activities = await this.prisma.documentActivity.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      });

      const totalActivities = activities.length;

      // Count activities by type
      const activitiesByType: Record<ActivityType, number> = {} as Record<ActivityType, number>;
      activities.forEach(activity => {
        activitiesByType[activity.activityType] = (activitiesByType[activity.activityType] || 0) + 1;
      });

      // Count activities by user
      const activitiesByUser: Record<string, number> = {};
      activities.forEach(activity => {
        activitiesByUser[activity.userName] = (activitiesByUser[activity.userName] || 0) + 1;
      });

      // Get recent activities (last 10)
      const recentActivities = activities.slice(0, 10);

      // Get most active users
      const userActivityCounts = Object.entries(activitiesByUser)
        .map(([userName, count]) => {
          const userId = activities.find(a => a.userName === userName)?.userId || '';
          return { userId, userName, activityCount: count };
        })
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, 5);

      const summary: ActivitySummary = {
        documentType,
        documentId,
        totalActivities,
        activitiesByType,
        activitiesByUser,
        recentActivities,
        mostActiveUsers: userActivityCounts
      };

      logger.info('Document activity summary generated successfully', { documentType, documentId, totalActivities });
      return summary;
    } catch (error: any) {
      logger.error('Failed to get document activity summary', { error: error.message, documentType, documentId });
      throw new AppError('Failed to get document activity summary', 500, 'ACTIVITY_SUMMARY_FAILED', error);
    }
  }

  /**
   * Get activity summary for a user
   */
  async getUserActivitySummary(userId: string, timeRange?: { start: Date; end: Date }): Promise<UserActivitySummary> {
    try {
      logger.info('Getting user activity summary', { userId, timeRange });

      const whereClause: any = {
        userId,
      };

      if (timeRange) {
        whereClause.createdAt = {
          gte: timeRange.start,
          lte: timeRange.end
        };
      }

      const activities = await this.prisma.documentActivity.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      });

      const totalActivities = activities.length;

      // Count activities by type
      const activitiesByType: Record<ActivityType, number> = {} as Record<ActivityType, number>;
      activities.forEach(activity => {
        activitiesByType[activity.activityType] = (activitiesByType[activity.activityType] || 0) + 1;
      });

      // Count activities by document
      const activitiesByDocument: Record<string, number> = {};
      activities.forEach(activity => {
        const documentKey = `${activity.documentType}:${activity.documentId}`;
        activitiesByDocument[documentKey] = (activitiesByDocument[documentKey] || 0) + 1;
      });

      // Get recent activities (last 20)
      const recentActivities = activities.slice(0, 20);

      const summary: UserActivitySummary = {
        userId,
        totalActivities,
        activitiesByType,
        activitiesByDocument,
        recentActivities
      };

      logger.info('User activity summary generated successfully', { userId, totalActivities });
      return summary;
    } catch (error: any) {
      logger.error('Failed to get user activity summary', { error: error.message, userId });
      throw new AppError('Failed to get user activity summary', 500, 'USER_ACTIVITY_SUMMARY_FAILED', error);
    }
  }

  /**
   * Get global activity feed (across all documents)
   */
  async getGlobalActivityFeed(filters: ActivityFilters = {}): Promise<DocumentActivity[]> {
    try {
      logger.info('Getting global activity feed', { filters });

      const whereClause: any = {};

      // Apply filters
      if (filters.documentType) {
        whereClause.documentType = filters.documentType;
      }
      if (filters.activityTypes && filters.activityTypes.length > 0) {
        whereClause.activityType = { in: filters.activityTypes };
      }
      if (filters.userId) {
        whereClause.userId = filters.userId;
      }
      if (filters.relatedEntityType) {
        whereClause.relatedEntityType = filters.relatedEntityType;
      }
      if (filters.createdAfter) {
        whereClause.createdAt = { ...whereClause.createdAt, gte: filters.createdAfter };
      }
      if (filters.createdBefore) {
        whereClause.createdAt = { ...whereClause.createdAt, lte: filters.createdBefore };
      }

      const activities = await this.prisma.documentActivity.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset,
      });

      logger.info('Global activity feed retrieved successfully', { count: activities.length });
      return activities;
    } catch (error: any) {
      logger.error('Failed to get global activity feed', { error: error.message });
      throw new AppError('Failed to get global activity feed', 500, 'GLOBAL_ACTIVITY_FAILED', error);
    }
  }

  /**
   * Log document creation activity
   */
  async logDocumentCreated(documentType: string, documentId: string, documentTitle: string, userId: string, userName: string): Promise<DocumentActivity> {
    return this.logActivity({
      documentType,
      documentId,
      activityType: ActivityType.DOCUMENT_CREATED,
      description: `Created document "${documentTitle}"`,
      userId,
      userName,
      metadata: { documentTitle }
    });
  }

  /**
   * Log document update activity
   */
  async logDocumentUpdated(documentType: string, documentId: string, documentTitle: string, userId: string, userName: string, changes: any): Promise<DocumentActivity> {
    return this.logActivity({
      documentType,
      documentId,
      activityType: ActivityType.DOCUMENT_UPDATED,
      description: `Updated document "${documentTitle}"`,
      userId,
      userName,
      details: changes,
      metadata: { documentTitle, changeCount: Object.keys(changes).length }
    });
  }

  /**
   * Log document approval activity
   */
  async logDocumentApproved(documentType: string, documentId: string, documentTitle: string, userId: string, userName: string): Promise<DocumentActivity> {
    return this.logActivity({
      documentType,
      documentId,
      activityType: ActivityType.DOCUMENT_APPROVED,
      description: `Approved document "${documentTitle}"`,
      userId,
      userName,
      metadata: { documentTitle }
    });
  }

  /**
   * Log document rejection activity
   */
  async logDocumentRejected(documentType: string, documentId: string, documentTitle: string, userId: string, userName: string, reason?: string): Promise<DocumentActivity> {
    return this.logActivity({
      documentType,
      documentId,
      activityType: ActivityType.DOCUMENT_REJECTED,
      description: `Rejected document "${documentTitle}"${reason ? `: ${reason}` : ''}`,
      userId,
      userName,
      metadata: { documentTitle, reason }
    });
  }

  /**
   * Log comment creation activity
   */
  async logCommentCreated(documentType: string, documentId: string, commentId: string, commentText: string, userId: string, userName: string): Promise<DocumentActivity> {
    return this.logActivity({
      documentType,
      documentId,
      activityType: ActivityType.COMMENT_ADDED,
      description: `Added comment: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
      userId,
      userName,
      relatedEntityType: 'COMMENT',
      relatedEntityId: commentId,
      metadata: { commentId, commentLength: commentText.length }
    });
  }

  /**
   * Log annotation creation activity
   */
  async logAnnotationCreated(documentType: string, documentId: string, annotationId: string, annotationType: string, userId: string, userName: string): Promise<DocumentActivity> {
    return this.logActivity({
      documentType,
      documentId,
      activityType: ActivityType.ANNOTATION_ADDED,
      description: `Added ${annotationType.toLowerCase()} annotation`,
      userId,
      userName,
      relatedEntityType: 'ANNOTATION',
      relatedEntityId: annotationId,
      metadata: { annotationId, annotationType }
    });
  }

  /**
   * Log review assignment activity
   */
  async logReviewAssigned(documentType: string, documentId: string, reviewId: string, assigneeId: string, assigneeName: string, assignerId: string, assignerName: string): Promise<DocumentActivity> {
    return this.logActivity({
      documentType,
      documentId,
      activityType: ActivityType.REVIEW_ASSIGNED,
      description: `${assignerName} assigned review to ${assigneeName}`,
      userId: assignerId,
      userName: assignerName,
      relatedEntityType: 'REVIEW',
      relatedEntityId: reviewId,
      metadata: { reviewId, assigneeId, assigneeName, assignerId, assignerName }
    });
  }

  /**
   * Log review completion activity
   */
  async logReviewCompleted(documentType: string, documentId: string, reviewId: string, reviewerId: string, reviewerName: string, outcome: string): Promise<DocumentActivity> {
    return this.logActivity({
      documentType,
      documentId,
      activityType: ActivityType.REVIEW_COMPLETED,
      description: `${reviewerName} completed review with outcome: ${outcome}`,
      userId: reviewerId,
      userName: reviewerName,
      relatedEntityType: 'REVIEW',
      relatedEntityId: reviewId,
      metadata: { reviewId, outcome }
    });
  }

  /**
   * Log user access activity
   */
  async logUserAccessed(documentType: string, documentId: string, userId: string, userName: string): Promise<DocumentActivity> {
    // Check if there's already a recent access activity for this user (within last hour)
    const recentAccess = await this.prisma.documentActivity.findFirst({
      where: {
        documentType,
        documentId,
        userId,
        activityType: ActivityType.USER_ACCESSED,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }
    });

    // Only log if no recent access
    if (!recentAccess) {
      return this.logActivity({
        documentType,
        documentId,
        activityType: ActivityType.USER_ACCESSED,
        description: `${userName} accessed document`,
        userId,
        userName,
        metadata: { accessTime: new Date().toISOString() }
      });
    }

    return recentAccess;
  }

  /**
   * Clean up old activities (retention policy)
   */
  async cleanupOldActivities(retentionDays: number = 365): Promise<number> {
    try {
      logger.info('Cleaning up old activities', { retentionDays });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.prisma.documentActivity.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      logger.info('Old activities cleaned up', { count: result.count, cutoffDate });
      return result.count;
    } catch (error: any) {
      logger.error('Failed to cleanup old activities', { error: error.message, retentionDays });
      throw new AppError('Failed to cleanup old activities', 500, 'ACTIVITY_CLEANUP_FAILED', error);
    }
  }

  /**
   * Get activity statistics for a time period
   */
  async getActivityStatistics(timeRange: { start: Date; end: Date }, documentType?: string): Promise<{
    totalActivities: number;
    activitiesByType: Record<ActivityType, number>;
    activitiesByDay: Array<{ date: string; count: number }>;
    mostActiveUsers: Array<{ userId: string; userName: string; count: number }>;
    mostActiveDocuments: Array<{ documentType: string; documentId: string; count: number }>;
  }> {
    try {
      logger.info('Getting activity statistics', { timeRange, documentType });

      const whereClause: any = {
        createdAt: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      };

      if (documentType) {
        whereClause.documentType = documentType;
      }

      const activities = await this.prisma.documentActivity.findMany({
        where: whereClause,
        select: {
          activityType: true,
          createdAt: true,
          userId: true,
          userName: true,
          documentType: true,
          documentId: true
        }
      });

      const totalActivities = activities.length;

      // Count by type
      const activitiesByType: Record<ActivityType, number> = {} as Record<ActivityType, number>;
      activities.forEach(activity => {
        activitiesByType[activity.activityType] = (activitiesByType[activity.activityType] || 0) + 1;
      });

      // Count by day
      const activitiesByDay: Array<{ date: string; count: number }> = [];
      const dayMap = new Map<string, number>();
      activities.forEach(activity => {
        const day = activity.createdAt.toISOString().split('T')[0];
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
      });
      Array.from(dayMap.entries()).forEach(([date, count]) => {
        activitiesByDay.push({ date, count });
      });
      activitiesByDay.sort((a, b) => a.date.localeCompare(b.date));

      // Most active users
      const userMap = new Map<string, { userId: string; userName: string; count: number }>();
      activities.forEach(activity => {
        const key = activity.userId;
        if (userMap.has(key)) {
          userMap.get(key)!.count++;
        } else {
          userMap.set(key, { userId: activity.userId, userName: activity.userName, count: 1 });
        }
      });
      const mostActiveUsers = Array.from(userMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Most active documents
      const docMap = new Map<string, { documentType: string; documentId: string; count: number }>();
      activities.forEach(activity => {
        const key = `${activity.documentType}:${activity.documentId}`;
        if (docMap.has(key)) {
          docMap.get(key)!.count++;
        } else {
          docMap.set(key, { documentType: activity.documentType, documentId: activity.documentId, count: 1 });
        }
      });
      const mostActiveDocuments = Array.from(docMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      logger.info('Activity statistics generated successfully', { totalActivities });
      return {
        totalActivities,
        activitiesByType,
        activitiesByDay,
        mostActiveUsers,
        mostActiveDocuments
      };
    } catch (error: any) {
      logger.error('Failed to get activity statistics', { error: error.message, timeRange });
      throw new AppError('Failed to get activity statistics', 500, 'ACTIVITY_STATS_FAILED', error);
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const activityService = new ActivityService();
export default activityService;