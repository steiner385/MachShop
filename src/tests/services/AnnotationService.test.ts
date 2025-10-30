import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient, DocumentAnnotation, AnnotationType } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';
import annotationService from '../../services/AnnotationService';
import logger from '../../utils/logger';

// Mock the PrismaClient
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    documentAnnotation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    documentComment: {
      count: vi.fn(),
    },
    $on: vi.fn(),
    $disconnect: vi.fn(),
  };

  return {
    PrismaClient: vi.fn(() => mockPrisma),
    AnnotationType: {
      ARROW: 'ARROW',
      RECTANGLE: 'RECTANGLE',
      CIRCLE: 'CIRCLE',
      FREEHAND: 'FREEHAND',
      TEXT_LABEL: 'TEXT_LABEL',
      HIGHLIGHT: 'HIGHLIGHT',
      CALLOUT: 'CALLOUT',
    },
  };
});

// Mock the logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AnnotationService', () => {
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = (annotationService as any).prisma;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createAnnotation', () => {
    it('should create a new annotation successfully', async () => {
      const mockInput = {
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        mediaType: 'image/jpeg',
        mediaUrl: 'https://example.com/image.jpg',
        annotationType: AnnotationType.RECTANGLE,
        annotationData: { x: 10, y: 20, width: 100, height: 50 },
        text: 'Test annotation',
        color: '#FF0000',
        strokeWidth: 2,
        opacity: 1.0,
        fontSize: 14,
        authorId: 'user-123',
        authorName: 'John Doe',
      };

      const mockCreatedAnnotation: DocumentAnnotation = {
        id: 'annotation-123',
        documentType: mockInput.documentType,
        documentId: mockInput.documentId,
        mediaType: mockInput.mediaType,
        mediaUrl: mockInput.mediaUrl,
        annotationType: mockInput.annotationType,
        annotationData: mockInput.annotationData,
        text: mockInput.text,
        color: mockInput.color,
        strokeWidth: mockInput.strokeWidth,
        opacity: mockInput.opacity,
        fontSize: mockInput.fontSize,
        timestamp: null,
        authorId: mockInput.authorId,
        authorName: mockInput.authorName,
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.documentAnnotation.create.mockResolvedValue(mockCreatedAnnotation);

      const result = await annotationService.createAnnotation(mockInput);

      expect(mockPrisma.documentAnnotation.create).toHaveBeenCalledWith({
        data: {
          documentType: mockInput.documentType,
          documentId: mockInput.documentId,
          mediaType: mockInput.mediaType,
          mediaUrl: mockInput.mediaUrl,
          annotationType: mockInput.annotationType,
          annotationData: mockInput.annotationData,
          text: mockInput.text,
          color: mockInput.color,
          strokeWidth: mockInput.strokeWidth,
          opacity: mockInput.opacity,
          fontSize: mockInput.fontSize,
          timestamp: mockInput.timestamp,
          authorId: mockInput.authorId,
          authorName: mockInput.authorName,
        }
      });

      expect(result).toEqual(mockCreatedAnnotation);
      expect(logger.info).toHaveBeenCalledWith('Creating annotation', {
        documentType: mockInput.documentType,
        documentId: mockInput.documentId,
        annotationType: mockInput.annotationType,
        authorId: mockInput.authorId
      });
    });

    it('should apply default values for color, strokeWidth, opacity, and fontSize', async () => {
      const mockInput = {
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        annotationType: AnnotationType.TEXT_LABEL,
        annotationData: { x: 10, y: 20 },
        authorId: 'user-123',
        authorName: 'John Doe',
      };

      const mockCreatedAnnotation: DocumentAnnotation = {
        id: 'annotation-123',
        documentType: mockInput.documentType,
        documentId: mockInput.documentId,
        mediaType: null,
        mediaUrl: null,
        annotationType: mockInput.annotationType,
        annotationData: mockInput.annotationData,
        text: null,
        color: '#FF0000',
        strokeWidth: 2,
        opacity: 1.0,
        fontSize: 14,
        timestamp: null,
        authorId: mockInput.authorId,
        authorName: mockInput.authorName,
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.documentAnnotation.create.mockResolvedValue(mockCreatedAnnotation);

      await annotationService.createAnnotation(mockInput);

      expect(mockPrisma.documentAnnotation.create).toHaveBeenCalledWith({
        data: {
          documentType: mockInput.documentType,
          documentId: mockInput.documentId,
          mediaType: undefined,
          mediaUrl: undefined,
          annotationType: mockInput.annotationType,
          annotationData: mockInput.annotationData,
          text: undefined,
          color: '#FF0000',
          strokeWidth: 2,
          opacity: 1.0,
          fontSize: 14,
          timestamp: undefined,
          authorId: mockInput.authorId,
          authorName: mockInput.authorName,
        }
      });
    });

    it('should throw AppError when annotation validation fails', async () => {
      const mockInput = {
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        annotationType: AnnotationType.ARROW,
        annotationData: { startX: 10 }, // Missing required fields
        authorId: 'user-123',
        authorName: 'John Doe',
      };

      await expect(annotationService.createAnnotation(mockInput)).rejects.toThrow(AppError);
      expect(mockPrisma.documentAnnotation.create).not.toHaveBeenCalled();
    });

    it('should throw AppError when database operation fails', async () => {
      const mockInput = {
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        annotationType: AnnotationType.TEXT_LABEL,
        annotationData: { x: 10, y: 20 },
        authorId: 'user-123',
        authorName: 'John Doe',
      };

      const dbError = new Error('Database connection failed');
      mockPrisma.documentAnnotation.create.mockRejectedValue(dbError);

      await expect(annotationService.createAnnotation(mockInput)).rejects.toThrow(AppError);
      expect(logger.error).toHaveBeenCalledWith('Failed to create annotation', {
        error: dbError.message,
        input: mockInput
      });
    });
  });

  describe('updateAnnotation', () => {
    it('should update an annotation successfully', async () => {
      const annotationId = 'annotation-123';
      const userId = 'user-123';
      const updates = {
        text: 'Updated text',
        color: '#00FF00',
        isResolved: true,
      };

      const existingAnnotation: DocumentAnnotation = {
        id: annotationId,
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        mediaType: null,
        mediaUrl: null,
        annotationType: AnnotationType.TEXT_LABEL,
        annotationData: { x: 10, y: 20 },
        text: 'Original text',
        color: '#FF0000',
        strokeWidth: 2,
        opacity: 1.0,
        fontSize: 14,
        timestamp: null,
        authorId: userId,
        authorName: 'John Doe',
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedAnnotation = { ...existingAnnotation, ...updates };

      mockPrisma.documentAnnotation.findUnique.mockResolvedValue(existingAnnotation);
      mockPrisma.documentAnnotation.update.mockResolvedValue(updatedAnnotation);

      const result = await annotationService.updateAnnotation(annotationId, updates, userId);

      expect(mockPrisma.documentAnnotation.findUnique).toHaveBeenCalledWith({
        where: { id: annotationId }
      });
      expect(mockPrisma.documentAnnotation.update).toHaveBeenCalledWith({
        where: { id: annotationId },
        data: updates,
      });
      expect(result).toEqual(updatedAnnotation);
    });

    it('should throw AppError when annotation not found', async () => {
      const annotationId = 'non-existent';
      const userId = 'user-123';
      const updates = { text: 'Updated text' };

      mockPrisma.documentAnnotation.findUnique.mockResolvedValue(null);

      await expect(annotationService.updateAnnotation(annotationId, updates, userId)).rejects.toThrow(
        new AppError('Annotation not found', 404, 'ANNOTATION_NOT_FOUND')
      );
      expect(mockPrisma.documentAnnotation.update).not.toHaveBeenCalled();
    });

    it('should throw AppError when user is not authorized', async () => {
      const annotationId = 'annotation-123';
      const userId = 'user-456';
      const updates = { text: 'Updated text' };

      const existingAnnotation: DocumentAnnotation = {
        id: annotationId,
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        mediaType: null,
        mediaUrl: null,
        annotationType: AnnotationType.TEXT_LABEL,
        annotationData: { x: 10, y: 20 },
        text: 'Original text',
        color: '#FF0000',
        strokeWidth: 2,
        opacity: 1.0,
        fontSize: 14,
        timestamp: null,
        authorId: 'user-123', // Different user
        authorName: 'John Doe',
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.documentAnnotation.findUnique.mockResolvedValue(existingAnnotation);

      await expect(annotationService.updateAnnotation(annotationId, updates, userId)).rejects.toThrow(
        new AppError('Not authorized to update this annotation', 403, 'UNAUTHORIZED')
      );
      expect(mockPrisma.documentAnnotation.update).not.toHaveBeenCalled();
    });

    it('should validate annotation data when updating', async () => {
      const annotationId = 'annotation-123';
      const userId = 'user-123';
      const updates = {
        annotationData: { startX: 10 }, // Invalid for ARROW type
      };

      const existingAnnotation: DocumentAnnotation = {
        id: annotationId,
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        mediaType: null,
        mediaUrl: null,
        annotationType: AnnotationType.ARROW,
        annotationData: { startX: 10, startY: 20, endX: 100, endY: 200 },
        text: null,
        color: '#FF0000',
        strokeWidth: 2,
        opacity: 1.0,
        fontSize: 14,
        timestamp: null,
        authorId: userId,
        authorName: 'John Doe',
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.documentAnnotation.findUnique.mockResolvedValue(existingAnnotation);

      await expect(annotationService.updateAnnotation(annotationId, updates, userId)).rejects.toThrow(AppError);
      expect(mockPrisma.documentAnnotation.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteAnnotation', () => {
    it('should delete an annotation successfully', async () => {
      const annotationId = 'annotation-123';
      const userId = 'user-123';

      const existingAnnotation: DocumentAnnotation = {
        id: annotationId,
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        mediaType: null,
        mediaUrl: null,
        annotationType: AnnotationType.TEXT_LABEL,
        annotationData: { x: 10, y: 20 },
        text: 'Test annotation',
        color: '#FF0000',
        strokeWidth: 2,
        opacity: 1.0,
        fontSize: 14,
        timestamp: null,
        authorId: userId,
        authorName: 'John Doe',
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.documentAnnotation.findUnique.mockResolvedValue(existingAnnotation);
      mockPrisma.documentAnnotation.delete.mockResolvedValue(existingAnnotation);

      await annotationService.deleteAnnotation(annotationId, userId);

      expect(mockPrisma.documentAnnotation.findUnique).toHaveBeenCalledWith({
        where: { id: annotationId }
      });
      expect(mockPrisma.documentAnnotation.delete).toHaveBeenCalledWith({
        where: { id: annotationId }
      });
    });

    it('should throw AppError when annotation not found', async () => {
      const annotationId = 'non-existent';
      const userId = 'user-123';

      mockPrisma.documentAnnotation.findUnique.mockResolvedValue(null);

      await expect(annotationService.deleteAnnotation(annotationId, userId)).rejects.toThrow(
        new AppError('Annotation not found', 404, 'ANNOTATION_NOT_FOUND')
      );
      expect(mockPrisma.documentAnnotation.delete).not.toHaveBeenCalled();
    });

    it('should throw AppError when user is not authorized', async () => {
      const annotationId = 'annotation-123';
      const userId = 'user-456';

      const existingAnnotation: DocumentAnnotation = {
        id: annotationId,
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        mediaType: null,
        mediaUrl: null,
        annotationType: AnnotationType.TEXT_LABEL,
        annotationData: { x: 10, y: 20 },
        text: 'Test annotation',
        color: '#FF0000',
        strokeWidth: 2,
        opacity: 1.0,
        fontSize: 14,
        timestamp: null,
        authorId: 'user-123', // Different user
        authorName: 'John Doe',
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.documentAnnotation.findUnique.mockResolvedValue(existingAnnotation);

      await expect(annotationService.deleteAnnotation(annotationId, userId)).rejects.toThrow(
        new AppError('Not authorized to delete this annotation', 403, 'UNAUTHORIZED')
      );
      expect(mockPrisma.documentAnnotation.delete).not.toHaveBeenCalled();
    });
  });

  describe('getAnnotations', () => {
    it('should get annotations for a document successfully', async () => {
      const documentType = 'WORK_ORDER';
      const documentId = 'wo-123';

      const mockAnnotations: DocumentAnnotation[] = [
        {
          id: 'annotation-1',
          documentType,
          documentId,
          mediaType: null,
          mediaUrl: null,
          annotationType: AnnotationType.TEXT_LABEL,
          annotationData: { x: 10, y: 20 },
          text: 'First annotation',
          color: '#FF0000',
          strokeWidth: 2,
          opacity: 1.0,
          fontSize: 14,
          timestamp: null,
          authorId: 'user-123',
          authorName: 'John Doe',
          isResolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'annotation-2',
          documentType,
          documentId,
          mediaType: null,
          mediaUrl: null,
          annotationType: AnnotationType.RECTANGLE,
          annotationData: { x: 50, y: 60, width: 100, height: 50 },
          text: 'Second annotation',
          color: '#00FF00',
          strokeWidth: 3,
          opacity: 0.8,
          fontSize: 16,
          timestamp: null,
          authorId: 'user-456',
          authorName: 'Jane Smith',
          isResolved: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.documentAnnotation.findMany.mockResolvedValue(mockAnnotations);
      mockPrisma.documentComment.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

      const result = await annotationService.getAnnotations(documentType, documentId);

      expect(mockPrisma.documentAnnotation.findMany).toHaveBeenCalledWith({
        where: { documentType, documentId },
        orderBy: { createdAt: 'desc' },
        take: undefined,
        skip: undefined,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ ...mockAnnotations[0], commentCount: 2 });
      expect(result[1]).toEqual({ ...mockAnnotations[1], commentCount: 1 });
    });

    it('should apply filters correctly', async () => {
      const documentType = 'WORK_ORDER';
      const documentId = 'wo-123';
      const filters = {
        mediaType: 'image/jpeg',
        annotationType: AnnotationType.RECTANGLE,
        authorId: 'user-123',
        isResolved: false,
        createdAfter: new Date('2023-01-01'),
        createdBefore: new Date('2023-12-31'),
        limit: 10,
        offset: 5,
      };

      mockPrisma.documentAnnotation.findMany.mockResolvedValue([]);

      await annotationService.getAnnotations(documentType, documentId, filters);

      expect(mockPrisma.documentAnnotation.findMany).toHaveBeenCalledWith({
        where: {
          documentType,
          documentId,
          mediaType: filters.mediaType,
          annotationType: filters.annotationType,
          authorId: filters.authorId,
          isResolved: filters.isResolved,
          createdAt: {
            gte: filters.createdAfter,
            lte: filters.createdBefore,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      });
    });

    it('should throw AppError when database operation fails', async () => {
      const documentType = 'WORK_ORDER';
      const documentId = 'wo-123';
      const dbError = new Error('Database query failed');

      mockPrisma.documentAnnotation.findMany.mockRejectedValue(dbError);

      await expect(annotationService.getAnnotations(documentType, documentId)).rejects.toThrow(AppError);
      expect(logger.error).toHaveBeenCalledWith('Failed to get annotations', {
        error: dbError.message,
        documentType,
        documentId
      });
    });
  });

  describe('getAnnotationsForMedia', () => {
    it('should get annotations for specific media', async () => {
      const documentType = 'WORK_ORDER';
      const documentId = 'wo-123';
      const mediaUrl = 'https://example.com/image.jpg';

      const mockAnnotations: DocumentAnnotation[] = [];
      mockPrisma.documentAnnotation.findMany.mockResolvedValue(mockAnnotations);

      const result = await annotationService.getAnnotationsForMedia(documentType, documentId, mediaUrl);

      expect(result).toEqual([]);
      expect(logger.info).toHaveBeenCalledWith('Getting annotations for media', {
        documentType,
        documentId,
        mediaUrl
      });
    });
  });

  describe('resolveAnnotation', () => {
    it('should resolve an annotation successfully', async () => {
      const annotationId = 'annotation-123';
      const mockResolvedAnnotation: DocumentAnnotation = {
        id: annotationId,
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        mediaType: null,
        mediaUrl: null,
        annotationType: AnnotationType.TEXT_LABEL,
        annotationData: { x: 10, y: 20 },
        text: 'Test annotation',
        color: '#FF0000',
        strokeWidth: 2,
        opacity: 1.0,
        fontSize: 14,
        timestamp: null,
        authorId: 'user-123',
        authorName: 'John Doe',
        isResolved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.documentAnnotation.update.mockResolvedValue(mockResolvedAnnotation);

      const result = await annotationService.resolveAnnotation(annotationId);

      expect(mockPrisma.documentAnnotation.update).toHaveBeenCalledWith({
        where: { id: annotationId },
        data: { isResolved: true }
      });
      expect(result).toEqual(mockResolvedAnnotation);
    });

    it('should throw AppError when database operation fails', async () => {
      const annotationId = 'annotation-123';
      const dbError = new Error('Database update failed');

      mockPrisma.documentAnnotation.update.mockRejectedValue(dbError);

      await expect(annotationService.resolveAnnotation(annotationId)).rejects.toThrow(AppError);
      expect(logger.error).toHaveBeenCalledWith('Failed to resolve annotation', {
        error: dbError.message,
        annotationId
      });
    });
  });

  describe('getAnnotationStats', () => {
    it('should return annotation statistics', async () => {
      const documentType = 'WORK_ORDER';
      const documentId = 'wo-123';

      const mockAnnotations = [
        {
          annotationType: AnnotationType.TEXT_LABEL,
          authorName: 'John Doe',
          isResolved: false,
        },
        {
          annotationType: AnnotationType.RECTANGLE,
          authorName: 'John Doe',
          isResolved: true,
        },
        {
          annotationType: AnnotationType.TEXT_LABEL,
          authorName: 'Jane Smith',
          isResolved: false,
        },
      ];

      mockPrisma.documentAnnotation.findMany.mockResolvedValue(mockAnnotations);

      const result = await annotationService.getAnnotationStats(documentType, documentId);

      expect(result).toEqual({
        totalAnnotations: 3,
        resolvedAnnotations: 1,
        annotationsByType: {
          [AnnotationType.TEXT_LABEL]: 2,
          [AnnotationType.RECTANGLE]: 1,
        },
        annotationsByAuthor: {
          'John Doe': 2,
          'Jane Smith': 1,
        },
      });
    });
  });

  describe('createAnnotationTemplate', () => {
    it('should create an annotation template', async () => {
      const name = 'Quality Issue';
      const annotationType = AnnotationType.CALLOUT;
      const defaultProperties = {
        color: '#FFFF00',
        strokeWidth: 3,
        text: 'Quality Issue Detected',
      };

      const result = await annotationService.createAnnotationTemplate(name, annotationType, defaultProperties);

      expect(result.name).toBe(name);
      expect(result.annotationType).toBe(annotationType);
      expect(result.defaultProperties).toEqual({
        color: '#FFFF00',
        strokeWidth: 3,
        opacity: 1.0,
        fontSize: 14,
        text: 'Quality Issue Detected',
      });
      expect(result.id).toMatch(/^template_\d+$/);
    });
  });

  describe('validateAnnotationData', () => {
    it('should validate ARROW annotation data', async () => {
      const validArrowData = { startX: 10, startY: 20, endX: 100, endY: 200 };
      const invalidArrowData = { startX: 10, startY: 20 }; // Missing endX, endY

      const validInput = {
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        annotationType: AnnotationType.ARROW,
        annotationData: validArrowData,
        authorId: 'user-123',
        authorName: 'John Doe',
      };

      const invalidInput = {
        ...validInput,
        annotationData: invalidArrowData,
      };

      mockPrisma.documentAnnotation.create.mockResolvedValue({} as DocumentAnnotation);

      // Valid data should work
      await expect(annotationService.createAnnotation(validInput)).resolves.toBeDefined();

      // Invalid data should throw
      await expect(annotationService.createAnnotation(invalidInput)).rejects.toThrow(
        new AppError('Arrow annotation requires start and end coordinates', 400, 'INVALID_ANNOTATION_DATA')
      );
    });

    it('should validate RECTANGLE annotation data', async () => {
      const validRectData = { x: 10, y: 20, width: 100, height: 50 };
      const invalidRectData = { x: 10, y: 20 }; // Missing width, height

      const validInput = {
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        annotationType: AnnotationType.RECTANGLE,
        annotationData: validRectData,
        authorId: 'user-123',
        authorName: 'John Doe',
      };

      const invalidInput = {
        ...validInput,
        annotationData: invalidRectData,
      };

      mockPrisma.documentAnnotation.create.mockResolvedValue({} as DocumentAnnotation);

      // Valid data should work
      await expect(annotationService.createAnnotation(validInput)).resolves.toBeDefined();

      // Invalid data should throw
      await expect(annotationService.createAnnotation(invalidInput)).rejects.toThrow(
        new AppError('Rectangle annotation requires x, y, width, and height', 400, 'INVALID_ANNOTATION_DATA')
      );
    });

    it('should validate CIRCLE annotation data', async () => {
      const validCircleData = { centerX: 50, centerY: 60, radius: 25 };
      const invalidCircleData = { centerX: 50, centerY: 60 }; // Missing radius

      const validInput = {
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        annotationType: AnnotationType.CIRCLE,
        annotationData: validCircleData,
        authorId: 'user-123',
        authorName: 'John Doe',
      };

      const invalidInput = {
        ...validInput,
        annotationData: invalidCircleData,
      };

      mockPrisma.documentAnnotation.create.mockResolvedValue({} as DocumentAnnotation);

      // Valid data should work
      await expect(annotationService.createAnnotation(validInput)).resolves.toBeDefined();

      // Invalid data should throw
      await expect(annotationService.createAnnotation(invalidInput)).rejects.toThrow(
        new AppError('Circle annotation requires center coordinates and radius', 400, 'INVALID_ANNOTATION_DATA')
      );
    });

    it('should validate FREEHAND annotation data', async () => {
      const validFreehandData = { path: [{ x: 10, y: 20 }, { x: 30, y: 40 }] };
      const invalidFreehandData = { path: 'not-an-array' };

      const validInput = {
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        annotationType: AnnotationType.FREEHAND,
        annotationData: validFreehandData,
        authorId: 'user-123',
        authorName: 'John Doe',
      };

      const invalidInput = {
        ...validInput,
        annotationData: invalidFreehandData,
      };

      mockPrisma.documentAnnotation.create.mockResolvedValue({} as DocumentAnnotation);

      // Valid data should work
      await expect(annotationService.createAnnotation(validInput)).resolves.toBeDefined();

      // Invalid data should throw
      await expect(annotationService.createAnnotation(invalidInput)).rejects.toThrow(
        new AppError('Freehand annotation requires a path array', 400, 'INVALID_ANNOTATION_DATA')
      );
    });

    it('should validate TEXT_LABEL annotation data', async () => {
      const validTextData = { x: 10, y: 20 };
      const invalidTextData = { x: 10 }; // Missing y

      const validInput = {
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        annotationType: AnnotationType.TEXT_LABEL,
        annotationData: validTextData,
        authorId: 'user-123',
        authorName: 'John Doe',
      };

      const invalidInput = {
        ...validInput,
        annotationData: invalidTextData,
      };

      mockPrisma.documentAnnotation.create.mockResolvedValue({} as DocumentAnnotation);

      // Valid data should work
      await expect(annotationService.createAnnotation(validInput)).resolves.toBeDefined();

      // Invalid data should throw
      await expect(annotationService.createAnnotation(invalidInput)).rejects.toThrow(
        new AppError('Text label annotation requires x and y coordinates', 400, 'INVALID_ANNOTATION_DATA')
      );
    });

    it('should validate HIGHLIGHT annotation data', async () => {
      const validHighlightData = { startOffset: 10, endOffset: 50 };
      const invalidHighlightData = { startOffset: 10 }; // Missing endOffset

      const validInput = {
        documentType: 'WORK_ORDER',
        documentId: 'wo-123',
        annotationType: AnnotationType.HIGHLIGHT,
        annotationData: validHighlightData,
        authorId: 'user-123',
        authorName: 'John Doe',
      };

      const invalidInput = {
        ...validInput,
        annotationData: invalidHighlightData,
      };

      mockPrisma.documentAnnotation.create.mockResolvedValue({} as DocumentAnnotation);

      // Valid data should work
      await expect(annotationService.createAnnotation(validInput)).resolves.toBeDefined();

      // Invalid data should throw
      await expect(annotationService.createAnnotation(invalidInput)).rejects.toThrow(
        new AppError('Highlight annotation requires start and end offsets', 400, 'INVALID_ANNOTATION_DATA')
      );
    });
  });

  describe('exportAnnotations', () => {
    it('should export annotations in JSON format', async () => {
      const documentType = 'WORK_ORDER';
      const documentId = 'wo-123';

      const mockAnnotations = [
        {
          id: 'annotation-1',
          annotationType: AnnotationType.TEXT_LABEL,
          authorName: 'John Doe',
          text: 'Test annotation',
          createdAt: new Date('2023-01-01T10:00:00Z'),
          isResolved: false,
          commentCount: 2,
          annotationData: { x: 10, y: 20 },
        },
      ];

      // Mock the getAnnotations method
      const getAnnotationsSpy = vi.spyOn(annotationService, 'getAnnotations').mockResolvedValue(mockAnnotations as any);

      const result = await annotationService.exportAnnotations(documentType, documentId, 'JSON');

      expect(getAnnotationsSpy).toHaveBeenCalledWith(documentType, documentId);
      expect(result).toEqual({
        documentType,
        documentId,
        exportDate: expect.any(String),
        annotations: [
          {
            id: 'annotation-1',
            type: AnnotationType.TEXT_LABEL,
            author: 'John Doe',
            text: 'Test annotation',
            createdAt: new Date('2023-01-01T10:00:00Z'),
            isResolved: false,
            commentCount: 2,
            data: { x: 10, y: 20 },
          },
        ],
      });
    });

    it('should export annotations in CSV format', async () => {
      const documentType = 'WORK_ORDER';
      const documentId = 'wo-123';

      const mockAnnotations = [
        {
          id: 'annotation-1',
          annotationType: AnnotationType.TEXT_LABEL,
          authorName: 'John Doe',
          text: 'Test annotation',
          createdAt: new Date('2023-01-01T10:00:00Z'),
          isResolved: false,
          commentCount: 2,
        },
        {
          id: 'annotation-2',
          annotationType: AnnotationType.RECTANGLE,
          authorName: 'Jane Smith',
          text: null,
          createdAt: new Date('2023-01-02T11:00:00Z'),
          isResolved: true,
          commentCount: 0,
        },
      ];

      const getAnnotationsSpy = vi.spyOn(annotationService, 'getAnnotations').mockResolvedValue(mockAnnotations as any);

      const result = await annotationService.exportAnnotations(documentType, documentId, 'CSV');

      expect(getAnnotationsSpy).toHaveBeenCalledWith(documentType, documentId);
      // The CSV export uses Date.toString() which gives local time format
      expect(result).toContain('ID,Type,Author,Text,Created,Resolved,Comments');
      expect(result).toContain('"annotation-1","TEXT_LABEL","John Doe","Test annotation"');
      expect(result).toContain('"annotation-2","RECTANGLE","Jane Smith",""');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from database', async () => {
      await annotationService.disconnect();
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});