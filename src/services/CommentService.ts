import { PrismaClient, DocumentComment, CommentStatus, CommentPriority, ReactionType } from '@prisma/client';
import logger from '../lib/logger';
import { createError } from '../lib/errorHandler';

/**
 * TypeScript interfaces for Comment Operations
 */
export interface CommentInput {
  documentType: string;
  documentId: string;
  contextType?: string;
  contextId?: string;
  contextPath?: string;
  commentText: string;
  attachments?: string[];
  priority?: CommentPriority;
  tags?: string[];
  authorId: string;
  authorName: string;
  mentionedUserIds?: string[];
}

export interface CommentReplyInput {
  parentCommentId: string;
  commentText: string;
  attachments?: string[];
  authorId: string;
  authorName: string;
  mentionedUserIds?: string[];
}

export interface CommentUpdate {
  commentText?: string;
  attachments?: string[];
  priority?: CommentPriority;
  tags?: string[];
  isPinned?: boolean;
}

export interface CommentFilters {
  status?: CommentStatus;
  priority?: CommentPriority;
  authorId?: string;
  contextType?: string;
  isResolved?: boolean;
  isPinned?: boolean;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface CommentWithReplies extends DocumentComment {
  replies: CommentWithReplies[];
  reactions: Array<{
    id: string;
    userId: string;
    userName: string;
    reactionType: ReactionType;
    createdAt: Date;
  }>;
}

/**
 * Comment Service - Manages document comments and reactions
 */
class CommentService {
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
   * Create a new comment on a document
   */
  async createComment(input: CommentInput): Promise<DocumentComment> {
    try {
      logger.info('Creating comment', {
        documentType: input.documentType,
        documentId: input.documentId,
        authorId: input.authorId
      });

      const comment = await this.prisma.documentComment.create({
        data: {
          documentType: input.documentType,
          documentId: input.documentId,
          contextType: input.contextType,
          contextId: input.contextId,
          contextPath: input.contextPath,
          commentText: input.commentText,
          attachments: input.attachments || [],
          priority: input.priority || CommentPriority.MEDIUM,
          tags: input.tags || [],
          authorId: input.authorId,
          authorName: input.authorName,
          mentionedUserIds: input.mentionedUserIds || [],
        },
        include: {
          reactions: true,
          replies: {
            include: {
              reactions: true,
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      logger.info('Comment created successfully', { commentId: comment.id });
      return comment;
    } catch (error: any) {
      logger.error('Failed to create comment', { error: error.message, input });
      throw createError('Failed to create comment', 'COMMENT_CREATE_FAILED', 500, error);
    }
  }

  /**
   * Reply to an existing comment
   */
  async replyToComment(input: CommentReplyInput): Promise<DocumentComment> {
    try {
      logger.info('Creating comment reply', {
        parentCommentId: input.parentCommentId,
        authorId: input.authorId
      });

      // First, get the parent comment to inherit document context
      const parentComment = await this.prisma.documentComment.findUnique({
        where: { id: input.parentCommentId }
      });

      if (!parentComment) {
        throw createError('Parent comment not found', 'PARENT_COMMENT_NOT_FOUND', 404);
      }

      const reply = await this.prisma.documentComment.create({
        data: {
          documentType: parentComment.documentType,
          documentId: parentComment.documentId,
          contextType: parentComment.contextType,
          contextId: parentComment.contextId,
          contextPath: parentComment.contextPath,
          commentText: input.commentText,
          attachments: input.attachments || [],
          parentCommentId: input.parentCommentId,
          authorId: input.authorId,
          authorName: input.authorName,
          mentionedUserIds: input.mentionedUserIds || [],
        },
        include: {
          reactions: true,
          parentComment: true,
        }
      });

      logger.info('Comment reply created successfully', { replyId: reply.id });
      return reply;
    } catch (error: any) {
      logger.error('Failed to create comment reply', { error: error.message, input });
      throw createError('Failed to create comment reply', 'COMMENT_REPLY_FAILED', 500, error);
    }
  }

  /**
   * Update an existing comment
   */
  async updateComment(commentId: string, updates: CommentUpdate, userId: string): Promise<DocumentComment> {
    try {
      logger.info('Updating comment', { commentId, userId });

      // Verify the comment exists and user has permission to update
      const existingComment = await this.prisma.documentComment.findUnique({
        where: { id: commentId }
      });

      if (!existingComment) {
        throw createError('Comment not found', 'COMMENT_NOT_FOUND', 404);
      }

      if (existingComment.authorId !== userId) {
        throw createError('Not authorized to update this comment', 'UNAUTHORIZED', 403);
      }

      const updatedComment = await this.prisma.documentComment.update({
        where: { id: commentId },
        data: {
          ...updates,
          editedAt: new Date(),
        },
        include: {
          reactions: true,
          replies: {
            include: {
              reactions: true,
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      logger.info('Comment updated successfully', { commentId });
      return updatedComment;
    } catch (error: any) {
      logger.error('Failed to update comment', { error: error.message, commentId });
      throw createError('Failed to update comment', 'COMMENT_UPDATE_FAILED', 500, error);
    }
  }

  /**
   * Delete a comment (soft delete by setting status to ARCHIVED)
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    try {
      logger.info('Deleting comment', { commentId, userId });

      // Verify the comment exists and user has permission to delete
      const existingComment = await this.prisma.documentComment.findUnique({
        where: { id: commentId }
      });

      if (!existingComment) {
        throw createError('Comment not found', 'COMMENT_NOT_FOUND', 404);
      }

      if (existingComment.authorId !== userId) {
        throw createError('Not authorized to delete this comment', 'UNAUTHORIZED', 403);
      }

      await this.prisma.documentComment.update({
        where: { id: commentId },
        data: {
          status: CommentStatus.ARCHIVED,
        }
      });

      logger.info('Comment deleted successfully', { commentId });
    } catch (error: any) {
      logger.error('Failed to delete comment', { error: error.message, commentId });
      throw createError('Failed to delete comment', 'COMMENT_DELETE_FAILED', 500, error);
    }
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string, userId: string): Promise<DocumentComment> {
    try {
      logger.info('Resolving comment', { commentId, userId });

      const resolvedComment = await this.prisma.documentComment.update({
        where: { id: commentId },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedById: userId,
        },
        include: {
          reactions: true,
          replies: {
            include: {
              reactions: true,
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      logger.info('Comment resolved successfully', { commentId });
      return resolvedComment;
    } catch (error: any) {
      logger.error('Failed to resolve comment', { error: error.message, commentId });
      throw createError('Failed to resolve comment', 'COMMENT_RESOLVE_FAILED', 500, error);
    }
  }

  /**
   * Pin/unpin a comment
   */
  async pinComment(commentId: string, isPinned: boolean = true): Promise<DocumentComment> {
    try {
      logger.info('Pinning comment', { commentId, isPinned });

      const pinnedComment = await this.prisma.documentComment.update({
        where: { id: commentId },
        data: { isPinned },
        include: {
          reactions: true,
          replies: {
            include: {
              reactions: true,
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      logger.info('Comment pin status updated', { commentId, isPinned });
      return pinnedComment;
    } catch (error: any) {
      logger.error('Failed to update comment pin status', { error: error.message, commentId });
      throw createError('Failed to update comment pin status', 'COMMENT_PIN_FAILED', 500, error);
    }
  }

  /**
   * Get comments for a document
   */
  async getComments(documentType: string, documentId: string, filters: CommentFilters = {}): Promise<CommentWithReplies[]> {
    try {
      logger.info('Getting comments', { documentType, documentId, filters });

      const whereClause: any = {
        documentType,
        documentId,
        parentCommentId: null, // Only get top-level comments
      };

      // Apply filters
      if (filters.status) {
        whereClause.status = filters.status;
      }
      if (filters.priority) {
        whereClause.priority = filters.priority;
      }
      if (filters.authorId) {
        whereClause.authorId = filters.authorId;
      }
      if (filters.contextType) {
        whereClause.contextType = filters.contextType;
      }
      if (filters.isResolved !== undefined) {
        whereClause.isResolved = filters.isResolved;
      }
      if (filters.isPinned !== undefined) {
        whereClause.isPinned = filters.isPinned;
      }
      if (filters.tags && filters.tags.length > 0) {
        whereClause.tags = {
          hasSome: filters.tags
        };
      }
      if (filters.createdAfter) {
        whereClause.createdAt = { ...whereClause.createdAt, gte: filters.createdAfter };
      }
      if (filters.createdBefore) {
        whereClause.createdAt = { ...whereClause.createdAt, lte: filters.createdBefore };
      }

      const comments = await this.prisma.documentComment.findMany({
        where: whereClause,
        include: {
          reactions: {
            orderBy: { createdAt: 'asc' }
          },
          replies: {
            include: {
              reactions: {
                orderBy: { createdAt: 'asc' }
              },
              replies: {
                include: {
                  reactions: {
                    orderBy: { createdAt: 'asc' }
                  }
                },
                orderBy: { createdAt: 'asc' }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' }
        ],
        take: filters.limit,
        skip: filters.offset,
      }) as CommentWithReplies[];

      logger.info('Comments retrieved successfully', {
        documentType,
        documentId,
        count: comments.length
      });

      return comments;
    } catch (error: any) {
      logger.error('Failed to get comments', { error: error.message, documentType, documentId });
      throw createError('Failed to get comments', 'COMMENT_GET_FAILED', 500, error);
    }
  }

  /**
   * Add a reaction to a comment
   */
  async addReaction(commentId: string, userId: string, userName: string, reactionType: ReactionType): Promise<void> {
    try {
      logger.info('Adding reaction to comment', { commentId, userId, reactionType });

      await this.prisma.commentReaction.upsert({
        where: {
          commentId_userId_reactionType: {
            commentId,
            userId,
            reactionType
          }
        },
        create: {
          commentId,
          userId,
          userName,
          reactionType,
        },
        update: {
          // No update needed if it already exists
        }
      });

      logger.info('Reaction added successfully', { commentId, userId, reactionType });
    } catch (error: any) {
      logger.error('Failed to add reaction', { error: error.message, commentId, userId });
      throw createError('Failed to add reaction', 'REACTION_ADD_FAILED', 500, error);
    }
  }

  /**
   * Remove a reaction from a comment
   */
  async removeReaction(commentId: string, userId: string, reactionType: ReactionType): Promise<void> {
    try {
      logger.info('Removing reaction from comment', { commentId, userId, reactionType });

      await this.prisma.commentReaction.delete({
        where: {
          commentId_userId_reactionType: {
            commentId,
            userId,
            reactionType
          }
        }
      });

      logger.info('Reaction removed successfully', { commentId, userId, reactionType });
    } catch (error: any) {
      // Ignore if reaction doesn't exist
      if (error.code !== 'P2025') {
        logger.error('Failed to remove reaction', { error: error.message, commentId, userId });
        throw createError('Failed to remove reaction', 'REACTION_REMOVE_FAILED', 500, error);
      }
    }
  }

  /**
   * Extract mentioned users from comment text
   */
  getMentionedUsers(commentText: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(commentText)) !== null) {
      mentions.push(match[1]); // Extract username without @
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  /**
   * Get comment statistics for a document
   */
  async getCommentStats(documentType: string, documentId: string): Promise<{
    totalComments: number;
    openComments: number;
    resolvedComments: number;
    pinnedComments: number;
  }> {
    try {
      const [totalComments, openComments, resolvedComments, pinnedComments] = await Promise.all([
        this.prisma.documentComment.count({
          where: { documentType, documentId }
        }),
        this.prisma.documentComment.count({
          where: { documentType, documentId, status: CommentStatus.OPEN }
        }),
        this.prisma.documentComment.count({
          where: { documentType, documentId, isResolved: true }
        }),
        this.prisma.documentComment.count({
          where: { documentType, documentId, isPinned: true }
        })
      ]);

      return {
        totalComments,
        openComments,
        resolvedComments,
        pinnedComments
      };
    } catch (error: any) {
      logger.error('Failed to get comment statistics', { error: error.message, documentType, documentId });
      throw createError('Failed to get comment statistics', 'COMMENT_STATS_FAILED', 500, error);
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const commentService = new CommentService();
export default commentService;