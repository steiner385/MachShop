import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActivityType } from '@prisma/client';

// Mock the database module - create mock inside the factory function
vi.mock('../../lib/database', () => ({
  default: {
    documentActivity: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

import activityService, { ActivityInput, ActivityFilters, ActivitySummary, UserActivitySummary } from '../../services/ActivityService';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../lib/database';

// Get reference to the mocked prisma for easy access in tests
const mockPrisma = prisma as any;


// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock AppError
vi.mock('../../middleware/errorHandler', () => ({
  AppError: class extends Error {
    constructor(message: string, statusCode: number, errorCode: string, details?: any) {
      super(message);
      this.name = 'AppError';
    }
  },
}));

describe('ActivityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('singleton instance', () => {
    it('should be defined and have expected methods', () => {
      expect(activityService).toBeDefined();
      expect(typeof activityService.logActivity).toBe('function');
      expect(typeof activityService.getDocumentActivities).toBe('function');
      expect(typeof activityService.disconnect).toBe('function');
    });
  });

  describe('logActivity', () => {
    const mockActivity = {
      id: 'activity-1',
      documentType: 'work-instruction',
      documentId: 'doc-1',
      activityType: ActivityType.DOCUMENT_CREATED,
      description: 'Created document',
      userId: 'user-1',
      userName: 'John Doe',
      details: null,
      relatedEntityType: null,
      relatedEntityId: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should log activity successfully', async () => {
      const input: ActivityInput = {
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_CREATED,
        description: 'Created document',
        userId: 'user-1',
        userName: 'John Doe',
      };

      (mockPrisma.documentActivity.create as any).mockResolvedValueOnce(mockActivity);

      const result = await activityService.logActivity(input);

      expect(result).toEqual(mockActivity);
      expect(mockPrisma.documentActivity.create).toHaveBeenCalledWith({
        data: {
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: ActivityType.DOCUMENT_CREATED,
          description: 'Created document',
          userId: 'user-1',
          userName: 'John Doe',
          details: undefined,
          relatedEntityType: undefined,
          relatedEntityId: undefined,
          metadata: undefined,
        }
      });
    });

    it('should log activity with all optional fields', async () => {
      const input: ActivityInput = {
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_UPDATED,
        description: 'Updated document',
        userId: 'user-1',
        userName: 'John Doe',
        details: { field: 'value' },
        relatedEntityType: 'COMMENT',
        relatedEntityId: 'comment-1',
        metadata: { key: 'value' },
      };

      (mockPrisma.documentActivity.create as any).mockResolvedValueOnce(mockActivity);

      const result = await activityService.logActivity(input);

      expect(result).toEqual(mockActivity);
      expect(mockPrisma.documentActivity.create).toHaveBeenCalledWith({
        data: {
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: ActivityType.DOCUMENT_UPDATED,
          description: 'Updated document',
          userId: 'user-1',
          userName: 'John Doe',
          details: { field: 'value' },
          relatedEntityType: 'COMMENT',
          relatedEntityId: 'comment-1',
          metadata: { key: 'value' },
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      const input: ActivityInput = {
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_CREATED,
        description: 'Created document',
        userId: 'user-1',
        userName: 'John Doe',
      };

      (mockPrisma.documentActivity.create as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(activityService.logActivity(input)).rejects.toThrow(AppError);
    });
  });

  describe('getDocumentActivities', () => {
    const mockActivities = [
      {
        id: 'activity-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_CREATED,
        description: 'Created document',
        userId: 'user-1',
        userName: 'John Doe',
        createdAt: new Date(),
      },
      {
        id: 'activity-2',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_UPDATED,
        description: 'Updated document',
        userId: 'user-2',
        userName: 'Jane Smith',
        createdAt: new Date(),
      },
    ];

    it('should get document activities without filters', async () => {
      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce(mockActivities);

      const result = await activityService.getDocumentActivities('work-instruction', 'doc-1');

      expect(result).toEqual(mockActivities);
      expect(mockPrisma.documentActivity.findMany).toHaveBeenCalledWith({
        where: {
          documentType: 'work-instruction',
          documentId: 'doc-1',
        },
        orderBy: { createdAt: 'desc' },
        take: undefined,
        skip: undefined,
      });
    });

    it('should get document activities with activity type filter', async () => {
      const filters: ActivityFilters = {
        activityTypes: [ActivityType.DOCUMENT_CREATED],
      };

      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce([mockActivities[0]]);

      const result = await activityService.getDocumentActivities('work-instruction', 'doc-1', filters);

      expect(result).toEqual([mockActivities[0]]);
      expect(mockPrisma.documentActivity.findMany).toHaveBeenCalledWith({
        where: {
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: { in: [ActivityType.DOCUMENT_CREATED] },
        },
        orderBy: { createdAt: 'desc' },
        take: undefined,
        skip: undefined,
      });
    });

    it('should get document activities with user filter', async () => {
      const filters: ActivityFilters = {
        userId: 'user-1',
      };

      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce([mockActivities[0]]);

      const result = await activityService.getDocumentActivities('work-instruction', 'doc-1', filters);

      expect(result).toEqual([mockActivities[0]]);
      expect(mockPrisma.documentActivity.findMany).toHaveBeenCalledWith({
        where: {
          documentType: 'work-instruction',
          documentId: 'doc-1',
          userId: 'user-1',
        },
        orderBy: { createdAt: 'desc' },
        take: undefined,
        skip: undefined,
      });
    });

    it('should get document activities with date range filter', async () => {
      const filters: ActivityFilters = {
        createdAfter: new Date('2023-01-01'),
        createdBefore: new Date('2023-12-31'),
      };

      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce(mockActivities);

      const result = await activityService.getDocumentActivities('work-instruction', 'doc-1', filters);

      expect(result).toEqual(mockActivities);
      expect(mockPrisma.documentActivity.findMany).toHaveBeenCalledWith({
        where: {
          documentType: 'work-instruction',
          documentId: 'doc-1',
          createdAt: {
            gte: new Date('2023-01-01'),
            lte: new Date('2023-12-31'),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: undefined,
        skip: undefined,
      });
    });

    it('should get document activities with pagination', async () => {
      const filters: ActivityFilters = {
        limit: 10,
        offset: 20,
      };

      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce(mockActivities);

      const result = await activityService.getDocumentActivities('work-instruction', 'doc-1', filters);

      expect(result).toEqual(mockActivities);
      expect(mockPrisma.documentActivity.findMany).toHaveBeenCalledWith({
        where: {
          documentType: 'work-instruction',
          documentId: 'doc-1',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.documentActivity.findMany as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(activityService.getDocumentActivities('work-instruction', 'doc-1'))
        .rejects.toThrow(AppError);
    });
  });

  describe('getUserActivities', () => {
    const mockActivities = [
      {
        id: 'activity-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_CREATED,
        userId: 'user-1',
        userName: 'John Doe',
        createdAt: new Date(),
      },
    ];

    it('should get user activities without filters', async () => {
      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce(mockActivities);

      const result = await activityService.getUserActivities('user-1');

      expect(result).toEqual(mockActivities);
      expect(mockPrisma.documentActivity.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
        },
        orderBy: { createdAt: 'desc' },
        take: undefined,
        skip: undefined,
      });
    });

    it('should get user activities with document type filter', async () => {
      const filters: ActivityFilters = {
        documentType: 'work-instruction',
      };

      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce(mockActivities);

      const result = await activityService.getUserActivities('user-1', filters);

      expect(result).toEqual(mockActivities);
      expect(mockPrisma.documentActivity.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          documentType: 'work-instruction',
        },
        orderBy: { createdAt: 'desc' },
        take: undefined,
        skip: undefined,
      });
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.documentActivity.findMany as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(activityService.getUserActivities('user-1'))
        .rejects.toThrow(AppError);
    });
  });

  describe('getDocumentActivitySummary', () => {
    const mockActivities = [
      {
        id: 'activity-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_CREATED,
        userId: 'user-1',
        userName: 'John Doe',
        createdAt: new Date(),
      },
      {
        id: 'activity-2',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_UPDATED,
        userId: 'user-1',
        userName: 'John Doe',
        createdAt: new Date(),
      },
      {
        id: 'activity-3',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_CREATED,
        userId: 'user-2',
        userName: 'Jane Smith',
        createdAt: new Date(),
      },
    ];

    it('should generate document activity summary', async () => {
      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce(mockActivities);

      const result = await activityService.getDocumentActivitySummary('work-instruction', 'doc-1');

      expect(result).toEqual({
        documentType: 'work-instruction',
        documentId: 'doc-1',
        totalActivities: 3,
        activitiesByType: {
          [ActivityType.DOCUMENT_CREATED]: 2,
          [ActivityType.DOCUMENT_UPDATED]: 1,
        },
        activitiesByUser: {
          'John Doe': 2,
          'Jane Smith': 1,
        },
        recentActivities: mockActivities,
        mostActiveUsers: [
          { userId: 'user-1', userName: 'John Doe', activityCount: 2 },
          { userId: 'user-2', userName: 'Jane Smith', activityCount: 1 },
        ],
      });
    });

    it('should generate document activity summary with time range', async () => {
      const timeRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-12-31'),
      };

      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce(mockActivities);

      const result = await activityService.getDocumentActivitySummary('work-instruction', 'doc-1', timeRange);

      expect(result.totalActivities).toBe(3);
      expect(mockPrisma.documentActivity.findMany).toHaveBeenCalledWith({
        where: {
          documentType: 'work-instruction',
          documentId: 'doc-1',
          createdAt: {
            gte: timeRange.start,
            lte: timeRange.end,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.documentActivity.findMany as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(activityService.getDocumentActivitySummary('work-instruction', 'doc-1'))
        .rejects.toThrow(AppError);
    });
  });

  describe('getUserActivitySummary', () => {
    const mockActivities = [
      {
        id: 'activity-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_CREATED,
        userId: 'user-1',
        createdAt: new Date(),
      },
      {
        id: 'activity-2',
        documentType: 'routing',
        documentId: 'doc-2',
        activityType: ActivityType.DOCUMENT_UPDATED,
        userId: 'user-1',
        createdAt: new Date(),
      },
    ];

    it('should generate user activity summary', async () => {
      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce(mockActivities);

      const result = await activityService.getUserActivitySummary('user-1');

      expect(result).toEqual({
        userId: 'user-1',
        totalActivities: 2,
        activitiesByType: {
          [ActivityType.DOCUMENT_CREATED]: 1,
          [ActivityType.DOCUMENT_UPDATED]: 1,
        },
        activitiesByDocument: {
          'work-instruction:doc-1': 1,
          'routing:doc-2': 1,
        },
        recentActivities: mockActivities,
      });
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.documentActivity.findMany as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(activityService.getUserActivitySummary('user-1'))
        .rejects.toThrow(AppError);
    });
  });

  describe('getGlobalActivityFeed', () => {
    const mockActivities = [
      {
        id: 'activity-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_CREATED,
        createdAt: new Date(),
      },
    ];

    it('should get global activity feed without filters', async () => {
      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce(mockActivities);

      const result = await activityService.getGlobalActivityFeed();

      expect(result).toEqual(mockActivities);
      expect(mockPrisma.documentActivity.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: undefined,
      });
    });

    it('should get global activity feed with filters', async () => {
      const filters: ActivityFilters = {
        documentType: 'work-instruction',
        limit: 10,
      };

      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce(mockActivities);

      const result = await activityService.getGlobalActivityFeed(filters);

      expect(result).toEqual(mockActivities);
      expect(mockPrisma.documentActivity.findMany).toHaveBeenCalledWith({
        where: {
          documentType: 'work-instruction',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: undefined,
      });
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.documentActivity.findMany as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(activityService.getGlobalActivityFeed())
        .rejects.toThrow(AppError);
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      vi.spyOn(activityService, 'logActivity').mockResolvedValue({
        id: 'activity-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_CREATED,
        description: 'Test activity',
        userId: 'user-1',
        userName: 'John Doe',
        details: null,
        relatedEntityType: null,
        relatedEntityId: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    describe('logDocumentCreated', () => {
      it('should log document creation activity', async () => {
        await activityService.logDocumentCreated('work-instruction', 'doc-1', 'Test Doc', 'user-1', 'John Doe');

        expect(activityService.logActivity).toHaveBeenCalledWith({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: ActivityType.DOCUMENT_CREATED,
          description: 'Created document "Test Doc"',
          userId: 'user-1',
          userName: 'John Doe',
          metadata: { documentTitle: 'Test Doc' },
        });
      });
    });

    describe('logDocumentUpdated', () => {
      it('should log document update activity', async () => {
        const changes = { field1: 'value1', field2: 'value2' };

        await activityService.logDocumentUpdated('work-instruction', 'doc-1', 'Test Doc', 'user-1', 'John Doe', changes);

        expect(activityService.logActivity).toHaveBeenCalledWith({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: ActivityType.DOCUMENT_UPDATED,
          description: 'Updated document "Test Doc"',
          userId: 'user-1',
          userName: 'John Doe',
          details: changes,
          metadata: { documentTitle: 'Test Doc', changeCount: 2 },
        });
      });
    });

    describe('logDocumentApproved', () => {
      it('should log document approval activity', async () => {
        await activityService.logDocumentApproved('work-instruction', 'doc-1', 'Test Doc', 'user-1', 'John Doe');

        expect(activityService.logActivity).toHaveBeenCalledWith({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: ActivityType.DOCUMENT_APPROVED,
          description: 'Approved document "Test Doc"',
          userId: 'user-1',
          userName: 'John Doe',
          metadata: { documentTitle: 'Test Doc' },
        });
      });
    });

    describe('logDocumentRejected', () => {
      it('should log document rejection activity without reason', async () => {
        await activityService.logDocumentRejected('work-instruction', 'doc-1', 'Test Doc', 'user-1', 'John Doe');

        expect(activityService.logActivity).toHaveBeenCalledWith({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: ActivityType.DOCUMENT_REJECTED,
          description: 'Rejected document "Test Doc"',
          userId: 'user-1',
          userName: 'John Doe',
          metadata: { documentTitle: 'Test Doc', reason: undefined },
        });
      });

      it('should log document rejection activity with reason', async () => {
        await activityService.logDocumentRejected('work-instruction', 'doc-1', 'Test Doc', 'user-1', 'John Doe', 'Incomplete information');

        expect(activityService.logActivity).toHaveBeenCalledWith({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: ActivityType.DOCUMENT_REJECTED,
          description: 'Rejected document "Test Doc": Incomplete information',
          userId: 'user-1',
          userName: 'John Doe',
          metadata: { documentTitle: 'Test Doc', reason: 'Incomplete information' },
        });
      });
    });

    describe('logCommentCreated', () => {
      it('should log comment creation activity with short text', async () => {
        await activityService.logCommentCreated('work-instruction', 'doc-1', 'comment-1', 'Short comment', 'user-1', 'John Doe');

        expect(activityService.logActivity).toHaveBeenCalledWith({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: ActivityType.COMMENT_ADDED,
          description: 'Added comment: "Short comment"',
          userId: 'user-1',
          userName: 'John Doe',
          relatedEntityType: 'COMMENT',
          relatedEntityId: 'comment-1',
          metadata: { commentId: 'comment-1', commentLength: 13 },
        });
      });

      it('should log comment creation activity with long text', async () => {
        const longComment = 'This is a very long comment that exceeds the 50 character limit';

        await activityService.logCommentCreated('work-instruction', 'doc-1', 'comment-1', longComment, 'user-1', 'John Doe');

        expect(activityService.logActivity).toHaveBeenCalledWith({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: ActivityType.COMMENT_ADDED,
          description: 'Added comment: "This is a very long comment that exceeds the 50 cha..."',
          userId: 'user-1',
          userName: 'John Doe',
          relatedEntityType: 'COMMENT',
          relatedEntityId: 'comment-1',
          metadata: { commentId: 'comment-1', commentLength: longComment.length },
        });
      });
    });

    describe('logAnnotationCreated', () => {
      it('should log annotation creation activity', async () => {
        await activityService.logAnnotationCreated('work-instruction', 'doc-1', 'annotation-1', 'HIGHLIGHT', 'user-1', 'John Doe');

        expect(activityService.logActivity).toHaveBeenCalledWith({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: ActivityType.ANNOTATION_ADDED,
          description: 'Added highlight annotation',
          userId: 'user-1',
          userName: 'John Doe',
          relatedEntityType: 'ANNOTATION',
          relatedEntityId: 'annotation-1',
          metadata: { annotationId: 'annotation-1', annotationType: 'HIGHLIGHT' },
        });
      });
    });

    describe('logReviewAssigned', () => {
      it('should log review assignment activity', async () => {
        await activityService.logReviewAssigned('work-instruction', 'doc-1', 'review-1', 'user-2', 'Jane Smith', 'user-1', 'John Doe');

        expect(activityService.logActivity).toHaveBeenCalledWith({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: ActivityType.REVIEW_ASSIGNED,
          description: 'John Doe assigned review to Jane Smith',
          userId: 'user-1',
          userName: 'John Doe',
          relatedEntityType: 'REVIEW',
          relatedEntityId: 'review-1',
          metadata: {
            reviewId: 'review-1',
            assigneeId: 'user-2',
            assigneeName: 'Jane Smith',
            assignerId: 'user-1',
            assignerName: 'John Doe',
          },
        });
      });
    });

    describe('logReviewCompleted', () => {
      it('should log review completion activity', async () => {
        await activityService.logReviewCompleted('work-instruction', 'doc-1', 'review-1', 'user-2', 'Jane Smith', 'APPROVED');

        expect(activityService.logActivity).toHaveBeenCalledWith({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          activityType: ActivityType.REVIEW_COMPLETED,
          description: 'Jane Smith completed review with outcome: APPROVED',
          userId: 'user-2',
          userName: 'Jane Smith',
          relatedEntityType: 'REVIEW',
          relatedEntityId: 'review-1',
          metadata: { reviewId: 'review-1', outcome: 'APPROVED' },
        });
      });
    });
  });

  describe('logUserAccessed', () => {
    it('should log user access when no recent access exists', async () => {
      (mockPrisma.documentActivity.findFirst as any).mockResolvedValueOnce(null);

      const mockActivity = {
        id: 'activity-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.USER_ACCESSED,
        description: 'John Doe accessed document',
        userId: 'user-1',
        userName: 'John Doe',
        metadata: { accessTime: expect.any(String) },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(activityService, 'logActivity').mockResolvedValueOnce(mockActivity as any);

      const result = await activityService.logUserAccessed('work-instruction', 'doc-1', 'user-1', 'John Doe');

      expect(result).toEqual(mockActivity);
      expect(mockPrisma.documentActivity.findFirst).toHaveBeenCalledWith({
        where: {
          documentType: 'work-instruction',
          documentId: 'doc-1',
          userId: 'user-1',
          activityType: ActivityType.USER_ACCESSED,
          createdAt: {
            gte: expect.any(Date),
          },
        },
      });
    });

    it('should return existing access when recent access exists', async () => {
      const recentAccess = {
        id: 'activity-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.USER_ACCESSED,
        userId: 'user-1',
        createdAt: new Date(),
      };

      (mockPrisma.documentActivity.findFirst as any).mockResolvedValueOnce(recentAccess);

      const result = await activityService.logUserAccessed('work-instruction', 'doc-1', 'user-1', 'John Doe');

      expect(result).toEqual(recentAccess);
    });
  });

  describe('cleanupOldActivities', () => {
    it('should cleanup old activities with default retention', async () => {
      (mockPrisma.documentActivity.deleteMany as any).mockResolvedValueOnce({ count: 100 });

      const result = await activityService.cleanupOldActivities();

      expect(result).toBe(100);
      expect(mockPrisma.documentActivity.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should cleanup old activities with custom retention', async () => {
      (mockPrisma.documentActivity.deleteMany as any).mockResolvedValueOnce({ count: 50 });

      const result = await activityService.cleanupOldActivities(30);

      expect(result).toBe(50);
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.documentActivity.deleteMany as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(activityService.cleanupOldActivities())
        .rejects.toThrow(AppError);
    });
  });

  describe('getActivityStatistics', () => {
    const mockActivities = [
      {
        activityType: ActivityType.DOCUMENT_CREATED,
        createdAt: new Date('2023-01-01'),
        userId: 'user-1',
        userName: 'John Doe',
        documentType: 'work-instruction',
        documentId: 'doc-1',
      },
      {
        activityType: ActivityType.DOCUMENT_UPDATED,
        createdAt: new Date('2023-01-02'),
        userId: 'user-1',
        userName: 'John Doe',
        documentType: 'work-instruction',
        documentId: 'doc-1',
      },
      {
        activityType: ActivityType.DOCUMENT_CREATED,
        createdAt: new Date('2023-01-01'),
        userId: 'user-2',
        userName: 'Jane Smith',
        documentType: 'routing',
        documentId: 'doc-2',
      },
    ];

    it('should get activity statistics without document type filter', async () => {
      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce(mockActivities);

      const timeRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31'),
      };

      const result = await activityService.getActivityStatistics(timeRange);

      expect(result).toEqual({
        totalActivities: 3,
        activitiesByType: {
          [ActivityType.DOCUMENT_CREATED]: 2,
          [ActivityType.DOCUMENT_UPDATED]: 1,
        },
        activitiesByDay: [
          { date: '2023-01-01', count: 2 },
          { date: '2023-01-02', count: 1 },
        ],
        mostActiveUsers: [
          { userId: 'user-1', userName: 'John Doe', count: 2 },
          { userId: 'user-2', userName: 'Jane Smith', count: 1 },
        ],
        mostActiveDocuments: [
          { documentType: 'work-instruction', documentId: 'doc-1', count: 2 },
          { documentType: 'routing', documentId: 'doc-2', count: 1 },
        ],
      });
    });

    it('should get activity statistics with document type filter', async () => {
      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce(mockActivities.filter(a => a.documentType === 'work-instruction'));

      const timeRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31'),
      };

      const result = await activityService.getActivityStatistics(timeRange, 'work-instruction');

      expect(result.totalActivities).toBe(2);
      expect(mockPrisma.documentActivity.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: timeRange.start,
            lte: timeRange.end,
          },
          documentType: 'work-instruction',
        },
        select: {
          activityType: true,
          createdAt: true,
          userId: true,
          userName: true,
          documentType: true,
          documentId: true,
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.documentActivity.findMany as any).mockRejectedValueOnce(new Error('DB Error'));

      const timeRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-01-31'),
      };

      await expect(activityService.getActivityStatistics(timeRange))
        .rejects.toThrow(AppError);
    });
  });

  describe('disconnect', () => {
    it('should disconnect prisma client', async () => {
      // Mock the private prisma property
      const mockDisconnect = vi.fn();
      (activityService as any).prisma = { $disconnect: mockDisconnect };

      await activityService.disconnect();

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty activity arrays in summary generation', async () => {
      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce([]);

      const result = await activityService.getDocumentActivitySummary('work-instruction', 'doc-1');

      expect(result).toEqual({
        documentType: 'work-instruction',
        documentId: 'doc-1',
        totalActivities: 0,
        activitiesByType: {},
        activitiesByUser: {},
        recentActivities: [],
        mostActiveUsers: [],
      });
    });

    it('should handle special characters in document IDs', async () => {
      const specialId = 'doc-123-äöü-@#$%';
      const mockActivity = {
        id: 'activity-1',
        documentType: 'work-instruction',
        documentId: specialId,
        activityType: ActivityType.DOCUMENT_CREATED,
        description: 'Test activity',
        userId: 'user-1',
        userName: 'John Doe',
        createdAt: new Date(),
      };

      (mockPrisma.documentActivity.findMany as any).mockResolvedValueOnce([mockActivity]);

      const result = await activityService.getDocumentActivities('work-instruction', specialId);

      expect(result).toEqual([mockActivity]);
    });

    it('should handle very long descriptions gracefully', async () => {
      const longDescription = 'a'.repeat(1000);
      const input: ActivityInput = {
        documentType: 'work-instruction',
        documentId: 'doc-1',
        activityType: ActivityType.DOCUMENT_CREATED,
        description: longDescription,
        userId: 'user-1',
        userName: 'John Doe',
      };

      const mockActivity = { ...input, id: 'activity-1', createdAt: new Date(), updatedAt: new Date() };
      (mockPrisma.documentActivity.create as any).mockResolvedValueOnce(mockActivity);

      const result = await activityService.logActivity(input);

      expect(result.description).toBe(longDescription);
    });
  });
});