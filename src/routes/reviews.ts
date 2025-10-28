/**
 * Document Reviews API Routes
 * GitHub Issue #24: Document Collaboration & Review Features
 *
 * REST API endpoints for document review and assignment system
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { reviewService } from '../services/ReviewService';
import { logger } from '../utils/logger';
import { ReviewType, ReviewStatus } from '@prisma/client';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const assignReviewSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  documentId: z.string().min(1, 'Document ID is required'),
  reviewType: z.nativeEnum(ReviewType),
  assigneeId: z.string().min(1, 'Assignee ID is required'),
  assigneeName: z.string().min(1, 'Assignee name is required'),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  instructions: z.string().optional(),
  checklist: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    isRequired: z.boolean().optional().default(false),
    category: z.string().optional()
  })).optional(),
  customFields: z.record(z.any()).optional()
});

const updateReviewSchema = z.object({
  status: z.nativeEnum(ReviewStatus).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  instructions: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  customFields: z.record(z.any()).optional()
});

const completeReviewSchema = z.object({
  outcome: z.enum(['APPROVED', 'REJECTED', 'NEEDS_CHANGES']),
  comments: z.string().optional(),
  checklist: z.array(z.object({
    id: z.string(),
    completed: z.boolean(),
    notes: z.string().optional()
  })).optional(),
  attachments: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional()
});

const getReviewsSchema = z.object({
  status: z.nativeEnum(ReviewStatus).optional(),
  reviewType: z.nativeEnum(ReviewType).optional(),
  assigneeId: z.string().optional(),
  assignerId: z.string().optional(),
  documentType: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  overdue: z.boolean().optional(),
  dueDateAfter: z.string().datetime().optional(),
  dueDateBefore: z.string().datetime().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).optional().default(25),
  offset: z.number().int().nonnegative().optional().default(0)
});

const bulkAssignSchema = z.object({
  documentIds: z.array(z.string()).min(1, 'At least one document ID is required'),
  reviewType: z.nativeEnum(ReviewType),
  assigneeIds: z.array(z.string()).min(1, 'At least one assignee is required'),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  instructions: z.string().optional()
});

// ============================================================================
// REVIEW ASSIGNMENT ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/reviews/assign
 * @desc    Assign a review to a user
 * @access  Private
 */
router.post('/assign', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = assignReviewSchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const review = await reviewService.assignReview({
      ...validatedData,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
      assignerId: userId,
      assignerName: userName
    });

    logger.info('Review assigned', {
      userId,
      reviewId: review.id,
      assigneeId: validatedData.assigneeId,
      documentType: validatedData.documentType,
      documentId: validatedData.documentId,
      reviewType: validatedData.reviewType
    });

    res.status(201).json(review);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/reviews/bulk-assign
 * @desc    Bulk assign reviews for multiple documents
 * @access  Private
 */
router.post('/bulk-assign', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = bulkAssignSchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await reviewService.bulkAssignReviews({
      ...validatedData,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
      assignerId: userId,
      assignerName: userName
    });

    logger.info('Bulk reviews assigned', {
      userId,
      documentCount: validatedData.documentIds.length,
      assigneeCount: validatedData.assigneeIds.length,
      successCount: result.successCount,
      failureCount: result.failureCount
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

// ============================================================================
// REVIEW MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/reviews
 * @desc    Get reviews with filtering
 * @access  Private
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Parse query parameters
    const queryFilters = {
      status: req.query.status as ReviewStatus,
      reviewType: req.query.reviewType as ReviewType,
      assigneeId: req.query.assigneeId as string,
      assignerId: req.query.assignerId as string,
      documentType: req.query.documentType as string,
      priority: req.query.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
      overdue: req.query.overdue === 'true' ? true : req.query.overdue === 'false' ? false : undefined,
      dueDateAfter: req.query.dueDateAfter ? new Date(req.query.dueDateAfter as string) : undefined,
      dueDateBefore: req.query.dueDateBefore ? new Date(req.query.dueDateBefore as string) : undefined,
      createdAfter: req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined,
      createdBefore: req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 25,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const reviews = await reviewService.getReviews(queryFilters);

    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/reviews/:reviewId
 * @desc    Get a specific review by ID
 * @access  Private
 */
router.get('/:reviewId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { reviewId } = req.params;

    const review = await reviewService.getReviewById(reviewId);

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    res.json(review);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/reviews/:reviewId
 * @desc    Update a review
 * @access  Private
 */
router.put('/:reviewId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { reviewId } = req.params;
    const validatedData = updateReviewSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const updatedReview = await reviewService.updateReview(reviewId, {
      ...validatedData,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined
    }, userId);

    logger.info('Review updated', {
      userId,
      reviewId,
      updates: Object.keys(validatedData)
    });

    res.json(updatedReview);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/reviews/:reviewId
 * @desc    Cancel a review
 * @access  Private
 */
router.delete('/:reviewId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { reviewId } = req.params;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await reviewService.cancelReview(reviewId, userId);

    logger.info('Review cancelled', { userId, reviewId });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// REVIEW COMPLETION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/reviews/:reviewId/complete
 * @desc    Complete a review
 * @access  Private
 */
router.post('/:reviewId/complete', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { reviewId } = req.params;
    const validatedData = completeReviewSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const completedReview = await reviewService.completeReview(reviewId, validatedData, userId);

    logger.info('Review completed', {
      userId,
      reviewId,
      outcome: validatedData.outcome
    });

    res.json(completedReview);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/reviews/:reviewId/start
 * @desc    Start working on a review
 * @access  Private
 */
router.post('/:reviewId/start', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { reviewId } = req.params;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const startedReview = await reviewService.startReview(reviewId, userId);

    logger.info('Review started', { userId, reviewId });

    res.json(startedReview);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// REVIEW PROGRESS AND ANALYTICS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/reviews/:reviewId/progress
 * @desc    Get review progress
 * @access  Private
 */
router.get('/:reviewId/progress', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { reviewId } = req.params;

    const progress = await reviewService.getReviewProgress(reviewId);

    res.json(progress);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/reviews/user/:userId/dashboard
 * @desc    Get user's review dashboard
 * @access  Private
 */
router.get('/user/:userId/dashboard', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { userId } = req.params;

    // Check if user can access this dashboard
    const requestingUserId = (req as any).user?.id;
    if (requestingUserId !== userId && !(req as any).user?.isAdmin) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const dashboard = await reviewService.getUserReviewDashboard(userId);

    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/reviews/document/:documentType/:documentId
 * @desc    Get reviews for a specific document
 * @access  Private
 */
router.get('/document/:documentType/:documentId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;
    const includeHistory = req.query.includeHistory === 'true';

    const reviews = await reviewService.getDocumentReviews(documentType, documentId, includeHistory);

    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// OVERDUE AND REMINDER ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/reviews/overdue
 * @desc    Get overdue reviews
 * @access  Private
 */
router.get('/overdue', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const overdueReviews = await reviewService.getOverdueReviews();

    res.json(overdueReviews);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/reviews/:reviewId/remind
 * @desc    Send reminder for a review
 * @access  Private
 */
router.post('/:reviewId/remind', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { reviewId } = req.params;
    const { message } = req.body;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await reviewService.sendReviewReminder(reviewId, message, userId);

    logger.info('Review reminder sent', { userId, reviewId });

    res.json({ message: 'Reminder sent successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// STATISTICS AND ANALYTICS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/reviews/stats/summary
 * @desc    Get review statistics summary
 * @access  Private
 */
router.get('/stats/summary', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const timeRange = req.query.timeRange ? {
      start: new Date(req.query.startDate as string),
      end: new Date(req.query.endDate as string)
    } : undefined;

    const reviewType = req.query.reviewType as ReviewType;
    const departmentFilter = req.query.department as string;

    const stats = await reviewService.getReviewStatistics(timeRange, reviewType, departmentFilter);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/reviews/stats/performance
 * @desc    Get review performance metrics
 * @access  Private
 */
router.get('/stats/performance', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.query.userId as string;
    const timeRange = req.query.timeRange ? {
      start: new Date(req.query.startDate as string),
      end: new Date(req.query.endDate as string)
    } : undefined;

    const performance = await reviewService.getReviewPerformanceMetrics(userId, timeRange);

    res.json(performance);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// TEMPLATE ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/reviews/templates/:reviewType
 * @desc    Get review checklist template for a review type
 * @access  Private
 */
router.get('/templates/:reviewType', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { reviewType } = req.params;

    // Validate review type
    if (!Object.values(ReviewType).includes(reviewType as ReviewType)) {
      res.status(400).json({ error: 'Invalid review type' });
      return;
    }

    const template = await reviewService.createChecklistTemplate(reviewType as ReviewType);

    res.json(template);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/reviews/types
 * @desc    Get available review types
 * @access  Private
 */
router.get('/types', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const reviewTypes = Object.values(ReviewType).map(type => ({
      value: type,
      label: type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      description: getReviewTypeDescription(type)
    }));

    res.json(reviewTypes);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getReviewTypeDescription(type: ReviewType): string {
  const descriptions: Record<ReviewType, string> = {
    [ReviewType.TECHNICAL_REVIEW]: 'Technical accuracy and compliance review',
    [ReviewType.SAFETY_REVIEW]: 'Safety protocols and hazard assessment',
    [ReviewType.QUALITY_REVIEW]: 'Quality standards and specifications review',
    [ReviewType.FINAL_APPROVAL]: 'Final approval before document activation'
  };

  return descriptions[type] || 'Custom review type';
}

export default router;