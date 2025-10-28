import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CommentService } from '../../services/CommentService';
import { prisma } from '../../lib/prisma';

// Mock prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    documentComment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    commentReaction: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe('CommentService', () => {
  let commentService: CommentService;

  beforeEach(() => {
    commentService = new CommentService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createComment', () => {
    it('should create a new comment successfully', async () => {
      const mockComment = {
        id: 'comment-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'Test comment',
        type: 'GENERAL',
        authorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.documentComment.create as any).mockResolvedValue(mockComment);

      const input = {
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'Test comment',
        type: 'GENERAL' as const,
        authorId: 'user-1',
      };

      const result = await commentService.createComment(input);

      expect(prisma.documentComment.create).toHaveBeenCalledWith({
        data: {
          documentType: input.documentType,
          documentId: input.documentId,
          content: input.content,
          type: input.type,
          authorId: input.authorId,
          parentId: undefined,
          contextType: undefined,
          contextId: undefined,
          metadata: undefined,
        },
        include: {
          reactions: true,
          replies: {
            include: {
              reactions: true,
              replies: true,
            },
          },
        },
      });

      expect(result).toEqual(mockComment);
    });

    it('should create a reply comment with parentId', async () => {
      const mockReply = {
        id: 'reply-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'Test reply',
        type: 'GENERAL',
        authorId: 'user-2',
        parentId: 'comment-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.documentComment.create as any).mockResolvedValue(mockReply);

      const input = {
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'Test reply',
        type: 'GENERAL' as const,
        authorId: 'user-2',
        parentId: 'comment-1',
      };

      const result = await commentService.createComment(input);

      expect(prisma.documentComment.create).toHaveBeenCalledWith({
        data: {
          documentType: input.documentType,
          documentId: input.documentId,
          content: input.content,
          type: input.type,
          authorId: input.authorId,
          parentId: input.parentId,
          contextType: undefined,
          contextId: undefined,
          metadata: undefined,
        },
        include: {
          reactions: true,
          replies: {
            include: {
              reactions: true,
              replies: true,
            },
          },
        },
      });

      expect(result).toEqual(mockReply);
    });

    it('should throw error for empty content', async () => {
      const input = {
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: '',
        type: 'GENERAL' as const,
        authorId: 'user-1',
      };

      await expect(commentService.createComment(input)).rejects.toThrow('Comment content cannot be empty');
    });

    it('should throw error for content exceeding maximum length', async () => {
      const input = {
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'a'.repeat(5001), // Exceeds 5000 character limit
        type: 'GENERAL' as const,
        authorId: 'user-1',
      };

      await expect(commentService.createComment(input)).rejects.toThrow('Comment content exceeds maximum length of 5000 characters');
    });
  });

  describe('getComments', () => {
    it('should retrieve comments for a document', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          documentType: 'work-instruction',
          documentId: 'doc-1',
          content: 'Test comment 1',
          type: 'GENERAL',
          authorId: 'user-1',
          parentId: null,
          reactions: [],
          replies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'comment-2',
          documentType: 'work-instruction',
          documentId: 'doc-1',
          content: 'Test comment 2',
          type: 'GENERAL',
          authorId: 'user-2',
          parentId: null,
          reactions: [],
          replies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.documentComment.findMany as any).mockResolvedValue(mockComments);

      const result = await commentService.getComments('work-instruction', 'doc-1');

      expect(prisma.documentComment.findMany).toHaveBeenCalledWith({
        where: {
          documentType: 'work-instruction',
          documentId: 'doc-1',
          parentId: null,
        },
        include: {
          reactions: true,
          replies: {
            include: {
              reactions: true,
              replies: {
                include: {
                  reactions: true,
                  replies: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(result).toEqual(mockComments);
    });

    it('should filter comments by type', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          documentType: 'work-instruction',
          documentId: 'doc-1',
          content: 'Test mention',
          type: 'MENTION',
          authorId: 'user-1',
          parentId: null,
          reactions: [],
          replies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.documentComment.findMany as any).mockResolvedValue(mockComments);

      const filters = { type: 'MENTION' as const };
      const result = await commentService.getComments('work-instruction', 'doc-1', filters);

      expect(prisma.documentComment.findMany).toHaveBeenCalledWith({
        where: {
          documentType: 'work-instruction',
          documentId: 'doc-1',
          parentId: null,
          type: 'MENTION',
        },
        include: {
          reactions: true,
          replies: {
            include: {
              reactions: true,
              replies: {
                include: {
                  reactions: true,
                  replies: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(result).toEqual(mockComments);
    });
  });

  describe('toggleReaction', () => {
    it('should add reaction if not exists', async () => {
      (prisma.commentReaction.findFirst as any).mockResolvedValue(null);

      const mockReaction = {
        id: 'reaction-1',
        commentId: 'comment-1',
        userId: 'user-1',
        type: 'LIKE',
        createdAt: new Date(),
      };

      (prisma.commentReaction.create as any).mockResolvedValue(mockReaction);

      const result = await commentService.toggleReaction('comment-1', 'user-1', 'LIKE');

      expect(prisma.commentReaction.findFirst).toHaveBeenCalledWith({
        where: {
          commentId: 'comment-1',
          userId: 'user-1',
          type: 'LIKE',
        },
      });

      expect(prisma.commentReaction.create).toHaveBeenCalledWith({
        data: {
          commentId: 'comment-1',
          userId: 'user-1',
          type: 'LIKE',
        },
      });

      expect(result).toEqual({ added: true, reaction: mockReaction });
    });

    it('should remove reaction if exists', async () => {
      const existingReaction = {
        id: 'reaction-1',
        commentId: 'comment-1',
        userId: 'user-1',
        type: 'LIKE',
        createdAt: new Date(),
      };

      (prisma.commentReaction.findFirst as any).mockResolvedValue(existingReaction);
      (prisma.commentReaction.delete as any).mockResolvedValue(existingReaction);

      const result = await commentService.toggleReaction('comment-1', 'user-1', 'LIKE');

      expect(prisma.commentReaction.delete).toHaveBeenCalledWith({
        where: { id: 'reaction-1' },
      });

      expect(result).toEqual({ added: false, reaction: existingReaction });
    });
  });

  describe('updateComment', () => {
    it('should update comment content', async () => {
      const mockUpdatedComment = {
        id: 'comment-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'Updated content',
        type: 'GENERAL',
        authorId: 'user-1',
        parentId: null,
        reactions: [],
        replies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.documentComment.update as any).mockResolvedValue(mockUpdatedComment);

      const result = await commentService.updateComment('comment-1', { content: 'Updated content' });

      expect(prisma.documentComment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { content: 'Updated content' },
        include: {
          reactions: true,
          replies: {
            include: {
              reactions: true,
              replies: true,
            },
          },
        },
      });

      expect(result).toEqual(mockUpdatedComment);
    });

    it('should throw error for empty content update', async () => {
      await expect(commentService.updateComment('comment-1', { content: '' })).rejects.toThrow('Comment content cannot be empty');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      const mockDeletedComment = {
        id: 'comment-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'Test comment',
        type: 'GENERAL',
        authorId: 'user-1',
        parentId: null,
        reactions: [],
        replies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.documentComment.delete as any).mockResolvedValue(mockDeletedComment);

      const result = await commentService.deleteComment('comment-1');

      expect(prisma.documentComment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });

      expect(result).toEqual(mockDeletedComment);
    });
  });

  describe('getCommentStatistics', () => {
    it('should return comment statistics', async () => {
      (prisma.documentComment.findMany as any).mockResolvedValue([
        { id: 'comment-1', type: 'GENERAL', authorId: 'user-1', createdAt: new Date('2023-01-01') },
        { id: 'comment-2', type: 'MENTION', authorId: 'user-2', createdAt: new Date('2023-01-02') },
        { id: 'comment-3', type: 'GENERAL', authorId: 'user-1', createdAt: new Date() },
      ]);

      const result = await commentService.getCommentStatistics('work-instruction', 'doc-1');

      expect(result).toEqual({
        totalComments: 3,
        commentsByType: {
          GENERAL: 2,
          MENTION: 1,
        },
        uniqueContributors: 2,
        recentActivity: 1, // Comments from today
      });
    });
  });
});