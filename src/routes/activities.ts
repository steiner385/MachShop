/**
 * Document Activities API Routes
 * GitHub Issue #24: Document Collaboration & Review Features
 *
 * REST API endpoints for document activity tracking and feeds
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { activityService } from '../services/ActivityService';
import { logger } from '../utils/logger';
import { ActivityType } from '@prisma/client';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const logActivitySchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  documentId: z.string().min(1, 'Document ID is required'),
  activityType: z.nativeEnum(ActivityType),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  details: z.any().optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
  metadata: z.any().optional()
});

const getActivitiesSchema = z.object({
  documentType: z.string().optional(),
  documentId: z.string().optional(),
  activityTypes: z.array(z.nativeEnum(ActivityType)).optional(),
  userId: z.string().optional(),
  relatedEntityType: z.string().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).optional().default(25),
  offset: z.number().int().nonnegative().optional().default(0)
});

const getStatisticsSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  documentType: z.string().optional()
});

const contentChangeSchema = z.object({
  documentType: z.string().min(1),
  documentId: z.string().min(1),
  changeData: z.any()
});

// ============================================================================
// ACTIVITY LOGGING ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/activities
 * @desc    Log a document activity
 * @access  Private
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = logActivitySchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const activity = await activityService.logActivity({
      ...validatedData,
      userId,
      userName
    });

    logger.info('Activity logged', {
      userId,
      activityId: activity.id,
      activityType: validatedData.activityType,
      documentType: validatedData.documentType,
      documentId: validatedData.documentId
    });

    res.status(201).json(activity);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

// ============================================================================
// ACTIVITY RETRIEVAL ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/activities/document/:documentType/:documentId
 * @desc    Get activities for a specific document
 * @access  Private
 */
router.get('/document/:documentType/:documentId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;

    // Parse query parameters
    const queryFilters = {
      activityTypes: req.query.activityTypes ? (req.query.activityTypes as string).split(',') as ActivityType[] : undefined,
      userId: req.query.userId as string,
      relatedEntityType: req.query.relatedEntityType as string,
      createdAfter: req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined,
      createdBefore: req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 25,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const activities = await activityService.getDocumentActivities(documentType, documentId, queryFilters);

    res.json(activities);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/activities/user/:userId
 * @desc    Get activities for a specific user
 * @access  Private
 */
router.get('/user/:userId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { userId } = req.params;

    // Check if user can access these activities
    const requestingUserId = (req as any).user?.id;
    if (requestingUserId !== userId && !(req as any).user?.isAdmin) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Parse query parameters
    const queryFilters = {
      documentType: req.query.documentType as string,
      documentId: req.query.documentId as string,
      activityTypes: req.query.activityTypes ? (req.query.activityTypes as string).split(',') as ActivityType[] : undefined,
      relatedEntityType: req.query.relatedEntityType as string,
      createdAfter: req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined,
      createdBefore: req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 25,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const activities = await activityService.getUserActivities(userId, queryFilters);

    res.json(activities);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/activities/feed
 * @desc    Get global activity feed
 * @access  Private
 */
router.get('/feed', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Parse query parameters
    const queryFilters = {
      documentType: req.query.documentType as string,
      activityTypes: req.query.activityTypes ? (req.query.activityTypes as string).split(',') as ActivityType[] : undefined,
      userId: req.query.userId as string,
      relatedEntityType: req.query.relatedEntityType as string,
      createdAfter: req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined,
      createdBefore: req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const activities = await activityService.getGlobalActivityFeed(queryFilters);

    res.json(activities);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ACTIVITY SUMMARY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/activities/document/:documentType/:documentId/summary
 * @desc    Get activity summary for a document
 * @access  Private
 */
router.get('/document/:documentType/:documentId/summary', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;

    // Parse time range from query parameters
    const timeRange = req.query.startDate && req.query.endDate ? {
      start: new Date(req.query.startDate as string),
      end: new Date(req.query.endDate as string)
    } : undefined;

    const summary = await activityService.getDocumentActivitySummary(documentType, documentId, timeRange);

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/activities/user/:userId/summary
 * @desc    Get activity summary for a user
 * @access  Private
 */
router.get('/user/:userId/summary', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { userId } = req.params;

    // Check if user can access this summary
    const requestingUserId = (req as any).user?.id;
    if (requestingUserId !== userId && !(req as any).user?.isAdmin) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Parse time range from query parameters
    const timeRange = req.query.startDate && req.query.endDate ? {
      start: new Date(req.query.startDate as string),
      end: new Date(req.query.endDate as string)
    } : undefined;

    const summary = await activityService.getUserActivitySummary(userId, timeRange);

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SPECIALIZED ACTIVITY LOGGING ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/activities/document-created
 * @desc    Log document creation activity
 * @access  Private
 */
router.post('/document-created', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId, documentTitle } = req.body;

    if (!documentType || !documentId || !documentTitle) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const activity = await activityService.logDocumentCreated(documentType, documentId, documentTitle, userId, userName);

    logger.info('Document creation activity logged', {
      userId,
      activityId: activity.id,
      documentType,
      documentId,
      documentTitle
    });

    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/activities/document-updated
 * @desc    Log document update activity
 * @access  Private
 */
router.post('/document-updated', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId, documentTitle, changes } = req.body;

    if (!documentType || !documentId || !documentTitle || !changes) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const activity = await activityService.logDocumentUpdated(documentType, documentId, documentTitle, userId, userName, changes);

    logger.info('Document update activity logged', {
      userId,
      activityId: activity.id,
      documentType,
      documentId,
      changeCount: Object.keys(changes).length
    });

    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/activities/document-approved
 * @desc    Log document approval activity
 * @access  Private
 */
router.post('/document-approved', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId, documentTitle } = req.body;

    if (!documentType || !documentId || !documentTitle) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const activity = await activityService.logDocumentApproved(documentType, documentId, documentTitle, userId, userName);

    logger.info('Document approval activity logged', {
      userId,
      activityId: activity.id,
      documentType,
      documentId
    });

    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/activities/document-rejected
 * @desc    Log document rejection activity
 * @access  Private
 */
router.post('/document-rejected', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId, documentTitle, reason } = req.body;

    if (!documentType || !documentId || !documentTitle) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const activity = await activityService.logDocumentRejected(documentType, documentId, documentTitle, userId, userName, reason);

    logger.info('Document rejection activity logged', {
      userId,
      activityId: activity.id,
      documentType,
      documentId,
      reason
    });

    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/activities/comment-created
 * @desc    Log comment creation activity
 * @access  Private
 */
router.post('/comment-created', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId, commentId, commentText } = req.body;

    if (!documentType || !documentId || !commentId || !commentText) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const activity = await activityService.logCommentCreated(documentType, documentId, commentId, commentText, userId, userName);

    logger.info('Comment creation activity logged', {
      userId,
      activityId: activity.id,
      commentId,
      documentType,
      documentId
    });

    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/activities/annotation-created
 * @desc    Log annotation creation activity
 * @access  Private
 */
router.post('/annotation-created', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId, annotationId, annotationType } = req.body;

    if (!documentType || !documentId || !annotationId || !annotationType) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const activity = await activityService.logAnnotationCreated(documentType, documentId, annotationId, annotationType, userId, userName);

    logger.info('Annotation creation activity logged', {
      userId,
      activityId: activity.id,
      annotationId,
      annotationType,
      documentType,
      documentId
    });

    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/activities/user-accessed
 * @desc    Log user access activity
 * @access  Private
 */
router.post('/user-accessed', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.body;

    if (!documentType || !documentId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const activity = await activityService.logUserAccessed(documentType, documentId, userId, userName);

    // Note: This endpoint doesn't log success as it would be too noisy
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// CONTENT CHANGE TRACKING ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/activities/content-change
 * @desc    Handle content change event for real-time collaboration
 * @access  Private
 */
router.post('/content-change', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = contentChangeSchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // This is handled by the CollaborationService, but we can log it as an activity too
    const activity = await activityService.logActivity({
      documentType: validatedData.documentType,
      documentId: validatedData.documentId,
      activityType: ActivityType.DOCUMENT_UPDATED,
      description: `Real-time content change`,
      userId,
      userName,
      details: validatedData.changeData,
      metadata: { realTimeChange: true }
    });

    res.status(201).json(activity);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

// ============================================================================
// STATISTICS AND ANALYTICS ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/activities/statistics
 * @desc    Get activity statistics for a time period
 * @access  Private
 */
router.post('/statistics', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = getStatisticsSchema.parse(req.body);

    const timeRange = {
      start: new Date(validatedData.startDate),
      end: new Date(validatedData.endDate)
    };

    const statistics = await activityService.getActivityStatistics(timeRange, validatedData.documentType);

    res.json(statistics);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

// ============================================================================
// MAINTENANCE ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/activities/cleanup
 * @desc    Clean up old activities (admin only)
 * @access  Private (Admin)
 */
router.post('/cleanup', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Check if user is admin
    if (!(req as any).user?.isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { retentionDays = 365 } = req.body;

    const count = await activityService.cleanupOldActivities(retentionDays);

    logger.info('Old activities cleaned up', {
      count,
      retentionDays,
      adminUserId: (req as any).user?.id
    });

    res.json({ message: 'Old activities cleaned up', count, retentionDays });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/activities/types
 * @desc    Get available activity types
 * @access  Private
 */
router.get('/types', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const activityTypes = Object.values(ActivityType).map(type => ({
      value: type,
      label: type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      description: getActivityTypeDescription(type)
    }));

    res.json(activityTypes);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getActivityTypeDescription(type: ActivityType): string {
  const descriptions: Record<ActivityType, string> = {
    [ActivityType.DOCUMENT_CREATED]: 'Document was created',
    [ActivityType.DOCUMENT_UPDATED]: 'Document content was modified',
    [ActivityType.DOCUMENT_APPROVED]: 'Document was approved',
    [ActivityType.DOCUMENT_REJECTED]: 'Document was rejected',
    [ActivityType.COMMENT_ADDED]: 'Comment was added to document',
    [ActivityType.ANNOTATION_ADDED]: 'Annotation was added to document',
    [ActivityType.REVIEW_ASSIGNED]: 'Review was assigned to user',
    [ActivityType.REVIEW_COMPLETED]: 'Review was completed',
    [ActivityType.USER_ACCESSED]: 'User accessed the document'
  };

  return descriptions[type] || 'Custom activity type';
}

export default router;