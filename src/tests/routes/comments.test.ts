import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import commentRoutes from '../../routes/comments';
import { CommentService } from '../../services/CommentService';

// Mock the CommentService
vi.mock('../../services/CommentService');

// Mock auth middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'test-user-1', name: 'Test User' };
  next();
};

describe('Comment Routes', () => {
  let app: express.Application;
  let mockCommentService: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    app.use('/comments', commentRoutes);

    mockCommentService = {
      createComment: vi.fn(),
      getComments: vi.fn(),
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
      toggleReaction: vi.fn(),
      getCommentStatistics: vi.fn(),
    };

    (CommentService as any).mockImplementation(() => mockCommentService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /comments', () => {
    it('should create a new comment', async () => {
      const mockComment = {
        id: 'comment-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'Test comment',
        type: 'GENERAL',
        authorId: 'test-user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockCommentService.createComment.mockResolvedValue(mockComment);

      const response = await request(app)
        .post('/comments')
        .send({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          content: 'Test comment',
          type: 'GENERAL',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockComment);
      expect(mockCommentService.createComment).toHaveBeenCalledWith({
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'Test comment',
        type: 'GENERAL',
        authorId: 'test-user-1',
      });
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/comments')
        .send({
          documentType: 'work-instruction',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for empty content', async () => {
      const response = await request(app)
        .post('/comments')
        .send({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          content: '',
          type: 'GENERAL',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle service errors', async () => {
      mockCommentService.createComment.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/comments')
        .send({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          content: 'Test comment',
          type: 'GENERAL',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /comments', () => {
    it('should retrieve comments for a document', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          documentType: 'work-instruction',
          documentId: 'doc-1',
          content: 'Test comment 1',
          type: 'GENERAL',
          authorId: 'test-user-1',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'comment-2',
          documentType: 'work-instruction',
          documentId: 'doc-1',
          content: 'Test comment 2',
          type: 'GENERAL',
          authorId: 'test-user-2',
          createdAt: new Date().toISOString(),
        },
      ];

      mockCommentService.getComments.mockResolvedValue(mockComments);

      const response = await request(app)
        .get('/comments')
        .query({
          documentType: 'work-instruction',
          documentId: 'doc-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockComments);
      expect(mockCommentService.getComments).toHaveBeenCalledWith(
        'work-instruction',
        'doc-1',
        {}
      );
    });

    it('should filter comments by type', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          documentType: 'work-instruction',
          documentId: 'doc-1',
          content: 'Test mention',
          type: 'MENTION',
          authorId: 'test-user-1',
          createdAt: new Date().toISOString(),
        },
      ];

      mockCommentService.getComments.mockResolvedValue(mockComments);

      const response = await request(app)
        .get('/comments')
        .query({
          documentType: 'work-instruction',
          documentId: 'doc-1',
          type: 'MENTION',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockComments);
      expect(mockCommentService.getComments).toHaveBeenCalledWith(
        'work-instruction',
        'doc-1',
        { type: 'MENTION' }
      );
    });

    it('should return 400 for missing required query parameters', async () => {
      const response = await request(app)
        .get('/comments')
        .query({
          documentType: 'work-instruction',
          // Missing documentId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /comments/:id', () => {
    it('should update a comment', async () => {
      const mockUpdatedComment = {
        id: 'comment-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'Updated content',
        type: 'GENERAL',
        authorId: 'test-user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockCommentService.updateComment.mockResolvedValue(mockUpdatedComment);

      const response = await request(app)
        .put('/comments/comment-1')
        .send({
          content: 'Updated content',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUpdatedComment);
      expect(mockCommentService.updateComment).toHaveBeenCalledWith(
        'comment-1',
        { content: 'Updated content' }
      );
    });

    it('should return 400 for invalid update data', async () => {
      const response = await request(app)
        .put('/comments/comment-1')
        .send({
          content: '', // Empty content
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /comments/:id', () => {
    it('should delete a comment', async () => {
      const mockDeletedComment = {
        id: 'comment-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'Test comment',
        type: 'GENERAL',
        authorId: 'test-user-1',
      };

      mockCommentService.deleteComment.mockResolvedValue(mockDeletedComment);

      const response = await request(app)
        .delete('/comments/comment-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Comment deleted successfully');
      expect(mockCommentService.deleteComment).toHaveBeenCalledWith('comment-1');
    });

    it('should handle delete errors', async () => {
      mockCommentService.deleteComment.mockRejectedValue(new Error('Comment not found'));

      const response = await request(app)
        .delete('/comments/comment-1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Comment not found');
    });
  });

  describe('POST /comments/:id/reactions', () => {
    it('should toggle a reaction on a comment', async () => {
      const mockReactionResult = {
        added: true,
        reaction: {
          id: 'reaction-1',
          commentId: 'comment-1',
          userId: 'test-user-1',
          type: 'LIKE',
          createdAt: new Date().toISOString(),
        },
      };

      mockCommentService.toggleReaction.mockResolvedValue(mockReactionResult);

      const response = await request(app)
        .post('/comments/comment-1/reactions')
        .send({
          type: 'LIKE',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReactionResult);
      expect(mockCommentService.toggleReaction).toHaveBeenCalledWith(
        'comment-1',
        'test-user-1',
        'LIKE'
      );
    });

    it('should return 400 for invalid reaction type', async () => {
      const response = await request(app)
        .post('/comments/comment-1/reactions')
        .send({
          type: 'INVALID_TYPE',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /comments/reply', () => {
    it('should create a reply to a comment', async () => {
      const mockReply = {
        id: 'reply-1',
        documentType: 'work-instruction',
        documentId: 'doc-1',
        content: 'Test reply',
        type: 'GENERAL',
        authorId: 'test-user-1',
        parentId: 'comment-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockCommentService.createComment.mockResolvedValue(mockReply);

      const response = await request(app)
        .post('/comments/reply')
        .send({
          parentId: 'comment-1',
          content: 'Test reply',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReply);
    });

    it('should return 400 for missing parentId', async () => {
      const response = await request(app)
        .post('/comments/reply')
        .send({
          content: 'Test reply',
          // Missing parentId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /comments/statistics', () => {
    it('should retrieve comment statistics', async () => {
      const mockStatistics = {
        totalComments: 10,
        commentsByType: {
          GENERAL: 8,
          MENTION: 2,
        },
        uniqueContributors: 5,
        recentActivity: 3,
      };

      mockCommentService.getCommentStatistics.mockResolvedValue(mockStatistics);

      const response = await request(app)
        .get('/comments/statistics')
        .query({
          documentType: 'work-instruction',
          documentId: 'doc-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatistics);
      expect(mockCommentService.getCommentStatistics).toHaveBeenCalledWith(
        'work-instruction',
        'doc-1'
      );
    });
  });
});