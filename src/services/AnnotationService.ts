import { PrismaClient, DocumentAnnotation, AnnotationType } from '@prisma/client';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * TypeScript interfaces for Annotation Operations
 */
export interface AnnotationInput {
  documentType: string;
  documentId: string;
  mediaType?: string;
  mediaUrl?: string;
  annotationType: AnnotationType;
  annotationData: any; // SVG path, coordinates, etc.
  text?: string;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  fontSize?: number;
  timestamp?: number; // for video annotations
  authorId: string;
  authorName: string;
}

export interface AnnotationUpdate {
  annotationData?: any;
  text?: string;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  fontSize?: number;
  isResolved?: boolean;
}

export interface AnnotationFilters {
  mediaType?: string;
  annotationType?: AnnotationType;
  authorId?: string;
  isResolved?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface AnnotationWithComments extends DocumentAnnotation {
  commentCount: number;
}

/**
 * Annotation Service - Manages visual annotations on documents and media
 */
class AnnotationService {
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
   * Create a new annotation
   */
  async createAnnotation(input: AnnotationInput): Promise<DocumentAnnotation> {
    try {
      logger.info('Creating annotation', {
        documentType: input.documentType,
        documentId: input.documentId,
        annotationType: input.annotationType,
        authorId: input.authorId
      });

      // Validate annotation data based on type
      this.validateAnnotationData(input.annotationType, input.annotationData);

      const annotation = await this.prisma.documentAnnotation.create({
        data: {
          documentType: input.documentType,
          documentId: input.documentId,
          mediaType: input.mediaType,
          mediaUrl: input.mediaUrl,
          annotationType: input.annotationType,
          annotationData: input.annotationData,
          text: input.text,
          color: input.color || '#FF0000',
          strokeWidth: input.strokeWidth || 2,
          opacity: input.opacity || 1.0,
          fontSize: input.fontSize || 14,
          timestamp: input.timestamp,
          authorId: input.authorId,
          authorName: input.authorName,
        }
      });

      logger.info('Annotation created successfully', { annotationId: annotation.id });
      return annotation;
    } catch (error: any) {
      logger.error('Failed to create annotation', { error: error.message, input });
      throw new AppError('Failed to create annotation', 500, 'ANNOTATION_CREATE_FAILED', error);
    }
  }

  /**
   * Update an existing annotation
   */
  async updateAnnotation(annotationId: string, updates: AnnotationUpdate, userId: string): Promise<DocumentAnnotation> {
    try {
      logger.info('Updating annotation', { annotationId, userId });

      // Verify the annotation exists and user has permission to update
      const existingAnnotation = await this.prisma.documentAnnotation.findUnique({
        where: { id: annotationId }
      });

      if (!existingAnnotation) {
        throw new AppError('Annotation not found', 404, 'ANNOTATION_NOT_FOUND');
      }

      if (existingAnnotation.authorId !== userId) {
        throw new AppError('Not authorized to update this annotation', 403, 'UNAUTHORIZED');
      }

      // Validate annotation data if being updated
      if (updates.annotationData) {
        this.validateAnnotationData(existingAnnotation.annotationType, updates.annotationData);
      }

      const updatedAnnotation = await this.prisma.documentAnnotation.update({
        where: { id: annotationId },
        data: updates,
      });

      logger.info('Annotation updated successfully', { annotationId });
      return updatedAnnotation;
    } catch (error: any) {
      logger.error('Failed to update annotation', { error: error.message, annotationId });
      throw new AppError('Failed to update annotation', 500, 'ANNOTATION_UPDATE_FAILED', error);
    }
  }

  /**
   * Delete an annotation
   */
  async deleteAnnotation(annotationId: string, userId: string): Promise<void> {
    try {
      logger.info('Deleting annotation', { annotationId, userId });

      // Verify the annotation exists and user has permission to delete
      const existingAnnotation = await this.prisma.documentAnnotation.findUnique({
        where: { id: annotationId }
      });

      if (!existingAnnotation) {
        throw new AppError('Annotation not found', 404, 'ANNOTATION_NOT_FOUND');
      }

      if (existingAnnotation.authorId !== userId) {
        throw new AppError('Not authorized to delete this annotation', 403, 'UNAUTHORIZED');
      }

      await this.prisma.documentAnnotation.delete({
        where: { id: annotationId }
      });

      logger.info('Annotation deleted successfully', { annotationId });
    } catch (error: any) {
      logger.error('Failed to delete annotation', { error: error.message, annotationId });
      throw new AppError('Failed to delete annotation', 500, 'ANNOTATION_DELETE_FAILED', error);
    }
  }

  /**
   * Get annotations for a document
   */
  async getAnnotations(documentType: string, documentId: string, filters: AnnotationFilters = {}): Promise<AnnotationWithComments[]> {
    try {
      logger.info('Getting annotations', { documentType, documentId, filters });

      const whereClause: any = {
        documentType,
        documentId,
      };

      // Apply filters
      if (filters.mediaType) {
        whereClause.mediaType = filters.mediaType;
      }
      if (filters.annotationType) {
        whereClause.annotationType = filters.annotationType;
      }
      if (filters.authorId) {
        whereClause.authorId = filters.authorId;
      }
      if (filters.isResolved !== undefined) {
        whereClause.isResolved = filters.isResolved;
      }
      if (filters.createdAfter) {
        whereClause.createdAt = { ...whereClause.createdAt, gte: filters.createdAfter };
      }
      if (filters.createdBefore) {
        whereClause.createdAt = { ...whereClause.createdAt, lte: filters.createdBefore };
      }

      const annotations = await this.prisma.documentAnnotation.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      });

      // Get comment counts for each annotation
      const annotationsWithComments: AnnotationWithComments[] = await Promise.all(
        annotations.map(async (annotation) => {
          const commentCount = await this.prisma.documentComment.count({
            where: {
              documentType: annotation.documentType,
              documentId: annotation.documentId,
              contextType: 'ANNOTATION',
              contextId: annotation.id,
            }
          });

          return {
            ...annotation,
            commentCount
          };
        })
      );

      logger.info('Annotations retrieved successfully', {
        documentType,
        documentId,
        count: annotationsWithComments.length
      });

      return annotationsWithComments;
    } catch (error: any) {
      logger.error('Failed to get annotations', { error: error.message, documentType, documentId });
      throw new AppError('Failed to get annotations', 500, 'ANNOTATION_GET_FAILED', error);
    }
  }

  /**
   * Get annotations for a specific media item
   */
  async getAnnotationsForMedia(documentType: string, documentId: string, mediaUrl: string): Promise<AnnotationWithComments[]> {
    try {
      logger.info('Getting annotations for media', { documentType, documentId, mediaUrl });

      return this.getAnnotations(documentType, documentId, { mediaUrl });
    } catch (error: any) {
      logger.error('Failed to get annotations for media', { error: error.message, mediaUrl });
      throw new AppError('Failed to get annotations for media', 500, 'ANNOTATION_MEDIA_GET_FAILED', error);
    }
  }

  /**
   * Resolve an annotation
   */
  async resolveAnnotation(annotationId: string): Promise<DocumentAnnotation> {
    try {
      logger.info('Resolving annotation', { annotationId });

      const resolvedAnnotation = await this.prisma.documentAnnotation.update({
        where: { id: annotationId },
        data: {
          isResolved: true,
        }
      });

      logger.info('Annotation resolved successfully', { annotationId });
      return resolvedAnnotation;
    } catch (error: any) {
      logger.error('Failed to resolve annotation', { error: error.message, annotationId });
      throw new AppError('Failed to resolve annotation', 500, 'ANNOTATION_RESOLVE_FAILED', error);
    }
  }

  /**
   * Get annotation statistics for a document
   */
  async getAnnotationStats(documentType: string, documentId: string): Promise<{
    totalAnnotations: number;
    resolvedAnnotations: number;
    annotationsByType: Record<AnnotationType, number>;
    annotationsByAuthor: Record<string, number>;
  }> {
    try {
      const annotations = await this.prisma.documentAnnotation.findMany({
        where: { documentType, documentId },
        select: {
          annotationType: true,
          authorName: true,
          isResolved: true,
        }
      });

      const totalAnnotations = annotations.length;
      const resolvedAnnotations = annotations.filter(a => a.isResolved).length;

      const annotationsByType: Record<AnnotationType, number> = {} as Record<AnnotationType, number>;
      const annotationsByAuthor: Record<string, number> = {};

      annotations.forEach(annotation => {
        // Count by type
        annotationsByType[annotation.annotationType] =
          (annotationsByType[annotation.annotationType] || 0) + 1;

        // Count by author
        annotationsByAuthor[annotation.authorName] =
          (annotationsByAuthor[annotation.authorName] || 0) + 1;
      });

      return {
        totalAnnotations,
        resolvedAnnotations,
        annotationsByType,
        annotationsByAuthor
      };
    } catch (error: any) {
      logger.error('Failed to get annotation statistics', { error: error.message, documentType, documentId });
      throw new AppError('Failed to get annotation statistics', 500, 'ANNOTATION_STATS_FAILED', error);
    }
  }

  /**
   * Create predefined annotation templates
   */
  async createAnnotationTemplate(
    name: string,
    annotationType: AnnotationType,
    defaultProperties: Partial<AnnotationInput>
  ): Promise<{ id: string; name: string; template: any }> {
    try {
      logger.info('Creating annotation template', { name, annotationType });

      // This could be stored in database or configuration
      const template = {
        id: `template_${Date.now()}`,
        name,
        annotationType,
        defaultProperties: {
          color: defaultProperties.color || '#FF0000',
          strokeWidth: defaultProperties.strokeWidth || 2,
          opacity: defaultProperties.opacity || 1.0,
          fontSize: defaultProperties.fontSize || 14,
          ...defaultProperties
        }
      };

      logger.info('Annotation template created', { templateId: template.id });
      return template;
    } catch (error: any) {
      logger.error('Failed to create annotation template', { error: error.message, name });
      throw new AppError('Failed to create annotation template', 500, 'TEMPLATE_CREATE_FAILED', error);
    }
  }

  /**
   * Validate annotation data based on type
   */
  private validateAnnotationData(annotationType: AnnotationType, annotationData: any): void {
    switch (annotationType) {
      case AnnotationType.ARROW:
        if (!annotationData.startX || !annotationData.startY || !annotationData.endX || !annotationData.endY) {
          throw new AppError('Arrow annotation requires start and end coordinates', 400, 'INVALID_ANNOTATION_DATA');
        }
        break;
      case AnnotationType.RECTANGLE:
      case AnnotationType.CALLOUT:
        if (!annotationData.x || !annotationData.y || !annotationData.width || !annotationData.height) {
          throw new AppError('Rectangle annotation requires x, y, width, and height', 400, 'INVALID_ANNOTATION_DATA');
        }
        break;
      case AnnotationType.CIRCLE:
        if (!annotationData.centerX || !annotationData.centerY || !annotationData.radius) {
          throw new AppError('Circle annotation requires center coordinates and radius', 400, 'INVALID_ANNOTATION_DATA');
        }
        break;
      case AnnotationType.FREEHAND:
        if (!annotationData.path || !Array.isArray(annotationData.path)) {
          throw new AppError('Freehand annotation requires a path array', 400, 'INVALID_ANNOTATION_DATA');
        }
        break;
      case AnnotationType.TEXT_LABEL:
        if (!annotationData.x || !annotationData.y) {
          throw new AppError('Text label annotation requires x and y coordinates', 400, 'INVALID_ANNOTATION_DATA');
        }
        break;
      case AnnotationType.HIGHLIGHT:
        if (!annotationData.startOffset || !annotationData.endOffset) {
          throw new AppError('Highlight annotation requires start and end offsets', 400, 'INVALID_ANNOTATION_DATA');
        }
        break;
      // Add more validation as needed
    }
  }

  /**
   * Export annotations for a document
   */
  async exportAnnotations(documentType: string, documentId: string, format: 'JSON' | 'CSV' = 'JSON'): Promise<any> {
    try {
      logger.info('Exporting annotations', { documentType, documentId, format });

      const annotations = await this.getAnnotations(documentType, documentId);

      if (format === 'JSON') {
        return {
          documentType,
          documentId,
          exportDate: new Date().toISOString(),
          annotations: annotations.map(a => ({
            id: a.id,
            type: a.annotationType,
            author: a.authorName,
            text: a.text,
            createdAt: a.createdAt,
            isResolved: a.isResolved,
            commentCount: a.commentCount,
            data: a.annotationData
          }))
        };
      } else if (format === 'CSV') {
        // Convert to CSV format
        const csvHeaders = 'ID,Type,Author,Text,Created,Resolved,Comments\n';
        const csvRows = annotations.map(a =>
          `"${a.id}","${a.annotationType}","${a.authorName}","${a.text || ''}","${a.createdAt}","${a.isResolved}","${a.commentCount}"`
        ).join('\n');

        return csvHeaders + csvRows;
      }

      logger.info('Annotations exported successfully', { count: annotations.length });
      return annotations;
    } catch (error: any) {
      logger.error('Failed to export annotations', { error: error.message, documentType, documentId });
      throw new AppError('Failed to export annotations', 500, 'ANNOTATION_EXPORT_FAILED', error);
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const annotationService = new AnnotationService();
export default annotationService;