/**
 * Document Comments API Routes
 * GitHub Issue #24: Document Collaboration & Review Features
 *
 * REST API endpoints for document commenting system
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { commentService } from '../services/CommentService';
import { logger } from '../utils/logger';
import { CommentPriority, CommentStatus, ReactionType } from '@prisma/client';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createCommentSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  documentId: z.string().min(1, 'Document ID is required'),
  contextType: z.string().optional(),
  contextId: z.string().optional(),
  contextPath: z.string().optional(),
  commentText: z.string().min(1, 'Comment text is required').max(10000, 'Comment text too long'),
  attachments: z.array(z.string()).optional(),
  priority: z.nativeEnum(CommentPriority).optional(),
  tags: z.array(z.string()).optional(),
  mentionedUserIds: z.array(z.string()).optional()
});

const replyCommentSchema = z.object({
  parentCommentId: z.string().min(1, 'Parent comment ID is required'),
  commentText: z.string().min(1, 'Comment text is required').max(10000, 'Comment text too long'),
  attachments: z.array(z.string()).optional(),
  mentionedUserIds: z.array(z.string()).optional()
});

const updateCommentSchema = z.object({
  commentText: z.string().min(1).max(10000).optional(),
  attachments: z.array(z.string()).optional(),
  priority: z.nativeEnum(CommentPriority).optional(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional()
});

const getCommentsSchema = z.object({
  status: z.nativeEnum(CommentStatus).optional(),
  priority: z.nativeEnum(CommentPriority).optional(),
  authorId: z.string().optional(),
  contextType: z.string().optional(),
  isResolved: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).optional().default(25),
  offset: z.number().int().nonnegative().optional().default(0)
});

const reactionSchema = z.object({
  reactionType: z.nativeEnum(ReactionType)
});

// ============================================================================
// COMMENT CRUD ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/comments
 * @desc    Create a new comment on a document
 * @access  Private
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = createCommentSchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const comment = await commentService.createComment({
      ...validatedData,
      authorId: userId,
      authorName: userName
    });

    logger.info('Comment created', {
      userId,
      commentId: comment.id,
      documentType: validatedData.documentType,
      documentId: validatedData.documentId
    });

    res.status(201).json(comment);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/comments/reply
 * @desc    Reply to an existing comment
 * @access  Private
 */
router.post('/reply', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = replyCommentSchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const reply = await commentService.replyToComment({
      ...validatedData,
      authorId: userId,
      authorName: userName
    });

    logger.info('Comment reply created', {
      userId,
      replyId: reply.id,
      parentCommentId: validatedData.parentCommentId
    });

    res.status(201).json(reply);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/comments/:documentType/:documentId
 * @desc    Get comments for a document
 * @access  Private
 */
router.get('/:documentType/:documentId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;

    // Parse query parameters
    const queryFilters = {
      status: req.query.status as CommentStatus,
      priority: req.query.priority as CommentPriority,
      authorId: req.query.authorId as string,
      contextType: req.query.contextType as string,
      isResolved: req.query.isResolved === 'true' ? true : req.query.isResolved === 'false' ? false : undefined,
      isPinned: req.query.isPinned === 'true' ? true : req.query.isPinned === 'false' ? false : undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      createdAfter: req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined,
      createdBefore: req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 25,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const comments = await commentService.getComments(documentType, documentId, queryFilters);

    res.json(comments);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/comments/:commentId
 * @desc    Update a comment
 * @access  Private
 */
router.put('/:commentId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { commentId } = req.params;
    const validatedData = updateCommentSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const updatedComment = await commentService.updateComment(commentId, validatedData, userId);

    logger.info('Comment updated', {
      userId,
      commentId,
      updates: Object.keys(validatedData)
    });

    res.json(updatedComment);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/comments/:commentId
 * @desc    Delete a comment (soft delete)
 * @access  Private
 */
router.delete('/:commentId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { commentId } = req.params;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await commentService.deleteComment(commentId, userId);

    logger.info('Comment deleted', { userId, commentId });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// COMMENT ACTION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/comments/:commentId/resolve
 * @desc    Resolve a comment
 * @access  Private
 */
router.post('/:commentId/resolve', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { commentId } = req.params;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const resolvedComment = await commentService.resolveComment(commentId, userId);

    logger.info('Comment resolved', { userId, commentId });

    res.json(resolvedComment);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/comments/:commentId/pin
 * @desc    Pin/unpin a comment
 * @access  Private
 */
router.post('/:commentId/pin', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { commentId } = req.params;
    const { isPinned = true } = req.body;

    const pinnedComment = await commentService.pinComment(commentId, isPinned);

    logger.info('Comment pin status updated', { commentId, isPinned });

    res.json(pinnedComment);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// REACTION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/comments/:commentId/reactions
 * @desc    Add a reaction to a comment
 * @access  Private
 */
router.post('/:commentId/reactions', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { commentId } = req.params;
    const validatedData = reactionSchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await commentService.addReaction(commentId, userId, userName, validatedData.reactionType);

    logger.info('Reaction added to comment', {
      userId,
      commentId,
      reactionType: validatedData.reactionType
    });

    res.status(201).json({ message: 'Reaction added successfully' });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/comments/:commentId/reactions/:reactionType
 * @desc    Remove a reaction from a comment
 * @access  Private
 */
router.delete('/:commentId/reactions/:reactionType', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { commentId, reactionType } = req.params;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate reaction type
    if (!Object.values(ReactionType).includes(reactionType as ReactionType)) {
      res.status(400).json({ error: 'Invalid reaction type' });
      return;
    }

    await commentService.removeReaction(commentId, userId, reactionType as ReactionType);

    logger.info('Reaction removed from comment', {
      userId,
      commentId,
      reactionType
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ANALYTICS AND STATISTICS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/comments/:documentType/:documentId/stats
 * @desc    Get comment statistics for a document
 * @access  Private
 */
router.get('/:documentType/:documentId/stats', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;

    const stats = await commentService.getCommentStats(documentType, documentId);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/comments/extract-mentions
 * @desc    Extract mentioned users from comment text
 * @access  Private
 */
router.post('/extract-mentions', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { commentText } = req.body;

    if (!commentText || typeof commentText !== 'string') {
      res.status(400).json({ error: 'Comment text is required' });
      return;
    }

    const mentions = commentService.getMentionedUsers(commentText);

    res.json({ mentions });
  } catch (error) {
    next(error);
  }
});

export default router;