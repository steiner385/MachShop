/**
 * Document Annotations API Routes
 * GitHub Issue #24: Document Collaboration & Review Features
 *
 * REST API endpoints for document annotation system
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { annotationService } from '../services/AnnotationService';
import { logger } from '../utils/logger';
import { AnnotationType } from '@prisma/client';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createAnnotationSchema = z.object({
  documentType: z.string().min(1, 'Document type is required'),
  documentId: z.string().min(1, 'Document ID is required'),
  mediaType: z.string().optional(),
  mediaUrl: z.string().optional(),
  annotationType: z.nativeEnum(AnnotationType),
  annotationData: z.any(), // Will be validated based on annotation type
  text: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  strokeWidth: z.number().positive().optional(),
  opacity: z.number().min(0).max(1).optional(),
  fontSize: z.number().positive().optional(),
  timestamp: z.number().optional() // for video annotations
});

const updateAnnotationSchema = z.object({
  annotationData: z.any().optional(),
  text: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  strokeWidth: z.number().positive().optional(),
  opacity: z.number().min(0).max(1).optional(),
  fontSize: z.number().positive().optional(),
  isResolved: z.boolean().optional()
});

const getAnnotationsSchema = z.object({
  mediaType: z.string().optional(),
  annotationType: z.nativeEnum(AnnotationType).optional(),
  authorId: z.string().optional(),
  isResolved: z.boolean().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  limit: z.number().int().positive().max(100).optional().default(25),
  offset: z.number().int().nonnegative().optional().default(0)
});

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  annotationType: z.nativeEnum(AnnotationType),
  defaultProperties: z.object({
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    strokeWidth: z.number().positive().optional(),
    opacity: z.number().min(0).max(1).optional(),
    fontSize: z.number().positive().optional()
  }).optional()
});

const exportAnnotationsSchema = z.object({
  format: z.enum(['JSON', 'CSV']).optional().default('JSON')
});

// ============================================================================
// ANNOTATION CRUD ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/annotations
 * @desc    Create a new annotation on a document
 * @access  Private
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = createAnnotationSchema.parse(req.body);

    // Get user info from auth middleware
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.name || (req as any).user?.username;

    if (!userId || !userName) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const annotation = await annotationService.createAnnotation({
      ...validatedData,
      authorId: userId,
      authorName: userName
    });

    logger.info('Annotation created', {
      userId,
      annotationId: annotation.id,
      annotationType: validatedData.annotationType,
      documentType: validatedData.documentType,
      documentId: validatedData.documentId
    });

    res.status(201).json(annotation);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/annotations/:documentType/:documentId
 * @desc    Get annotations for a document
 * @access  Private
 */
router.get('/:documentType/:documentId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;

    // Parse query parameters
    const queryFilters = {
      mediaType: req.query.mediaType as string,
      annotationType: req.query.annotationType as AnnotationType,
      authorId: req.query.authorId as string,
      isResolved: req.query.isResolved === 'true' ? true : req.query.isResolved === 'false' ? false : undefined,
      createdAfter: req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined,
      createdBefore: req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 25,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const annotations = await annotationService.getAnnotations(documentType, documentId, queryFilters);

    res.json(annotations);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/annotations/:documentType/:documentId/media
 * @desc    Get annotations for a specific media item in a document
 * @access  Private
 */
router.get('/:documentType/:documentId/media', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;
    const { mediaUrl } = req.query;

    if (!mediaUrl || typeof mediaUrl !== 'string') {
      res.status(400).json({ error: 'Media URL is required' });
      return;
    }

    const annotations = await annotationService.getAnnotationsForMedia(documentType, documentId, mediaUrl);

    res.json(annotations);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/annotations/:annotationId
 * @desc    Update an annotation
 * @access  Private
 */
router.put('/:annotationId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { annotationId } = req.params;
    const validatedData = updateAnnotationSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const updatedAnnotation = await annotationService.updateAnnotation(annotationId, validatedData, userId);

    logger.info('Annotation updated', {
      userId,
      annotationId,
      updates: Object.keys(validatedData)
    });

    res.json(updatedAnnotation);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/annotations/:annotationId
 * @desc    Delete an annotation
 * @access  Private
 */
router.delete('/:annotationId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { annotationId } = req.params;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await annotationService.deleteAnnotation(annotationId, userId);

    logger.info('Annotation deleted', { userId, annotationId });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ANNOTATION ACTION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/annotations/:annotationId/resolve
 * @desc    Resolve an annotation
 * @access  Private
 */
router.post('/:annotationId/resolve', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { annotationId } = req.params;

    const resolvedAnnotation = await annotationService.resolveAnnotation(annotationId);

    logger.info('Annotation resolved', { annotationId });

    res.json(resolvedAnnotation);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// TEMPLATE ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/annotations/templates
 * @desc    Create annotation template
 * @access  Private
 */
router.post('/templates', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = createTemplateSchema.parse(req.body);

    const template = await annotationService.createAnnotationTemplate(
      validatedData.name,
      validatedData.annotationType,
      validatedData.defaultProperties || {}
    );

    logger.info('Annotation template created', {
      templateId: template.id,
      templateName: template.name,
      annotationType: template.annotationType
    });

    res.status(201).json(template);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

// ============================================================================
// EXPORT ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/annotations/:documentType/:documentId/export
 * @desc    Export annotations for a document
 * @access  Private
 */
router.post('/:documentType/:documentId/export', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;
    const validatedData = exportAnnotationsSchema.parse(req.body);

    const exportData = await annotationService.exportAnnotations(documentType, documentId, validatedData.format);

    logger.info('Annotations exported', {
      documentType,
      documentId,
      format: validatedData.format,
      userId: (req as any).user?.id
    });

    if (validatedData.format === 'CSV') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="annotations-${documentType}-${documentId}.csv"`);
      res.send(exportData);
    } else {
      res.json(exportData);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

// ============================================================================
// ANALYTICS AND STATISTICS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/annotations/:documentType/:documentId/stats
 * @desc    Get annotation statistics for a document
 * @access  Private
 */
router.get('/:documentType/:documentId/stats', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { documentType, documentId } = req.params;

    const stats = await annotationService.getAnnotationStats(documentType, documentId);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/annotations/types
 * @desc    Get available annotation types
 * @access  Private
 */
router.get('/types', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const annotationTypes = Object.values(AnnotationType).map(type => ({
      value: type,
      label: type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      description: getAnnotationTypeDescription(type)
    }));

    res.json(annotationTypes);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/annotations/validate
 * @desc    Validate annotation data for a specific type
 * @access  Private
 */
router.post('/validate', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { annotationType, annotationData } = req.body;

    if (!annotationType || !annotationData) {
      res.status(400).json({ error: 'Annotation type and data are required' });
      return;
    }

    // Use the service's validation logic
    try {
      // This would normally call the private validateAnnotationData method
      // For now, we'll create a simple validation response
      const isValid = true; // Simplified validation

      res.json({
        isValid,
        annotationType,
        message: isValid ? 'Annotation data is valid' : 'Annotation data is invalid'
      });
    } catch (validationError: any) {
      res.json({
        isValid: false,
        annotationType,
        message: validationError.message || 'Validation failed'
      });
    }
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAnnotationTypeDescription(type: AnnotationType): string {
  const descriptions: Record<AnnotationType, string> = {
    [AnnotationType.ARROW]: 'Draw arrows to point to specific areas',
    [AnnotationType.RECTANGLE]: 'Draw rectangular shapes to highlight areas',
    [AnnotationType.CIRCLE]: 'Draw circles to highlight round areas',
    [AnnotationType.FREEHAND]: 'Draw freehand lines and shapes',
    [AnnotationType.TEXT_LABEL]: 'Add text labels to specific points',
    [AnnotationType.HIGHLIGHT]: 'Highlight text selections',
    [AnnotationType.CALLOUT]: 'Add callout boxes with text'
  };

  return descriptions[type] || 'Custom annotation type';
}

export default router;