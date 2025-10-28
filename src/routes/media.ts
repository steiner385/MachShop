/**
 * Media Library Routes
 *
 * Part of GitHub Issue #18: Multi-Format Document Management & Native Work Instruction Editor
 *
 * Provides comprehensive media library API for managing media assets including:
 * - Media upload and management
 * - Media search and filtering
 * - Media annotations (arrows, callouts, highlights)
 * - Usage tracking and statistics
 * - Cleanup and maintenance
 */

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { MediaLibraryService } from '../services/MediaLibraryService';
import { logger } from '../utils/logger';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, documents, and CAD files
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/dwg', 'application/dxf', 'model/step', 'model/iges'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// Initialize service
const mediaService = new MediaLibraryService();

// Validation schemas
const MediaUploadSchema = z.object({
  fileName: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  instructionId: z.string().min(1),
  mediaType: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT', 'DIAGRAM', 'CAD_MODEL', 'ANIMATION']).optional()
});

const AnnotationSchema = z.object({
  id: z.string(),
  type: z.enum(['arrow', 'callout', 'highlight', 'circle', 'rectangle', 'text']),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional()
  }),
  content: z.string().optional(),
  style: z.object({
    color: z.string().optional(),
    strokeWidth: z.number().optional(),
    fontSize: z.number().optional()
  }).optional()
});

const MediaSearchSchema = z.object({
  query: z.string().optional(),
  mediaType: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT', 'DIAGRAM', 'CAD_MODEL', 'ANIMATION']).optional(),
  tags: z.array(z.string()).optional(),
  instructionId: z.string().optional(),
  hasAnnotations: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

const UpdateMetadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional()
});

/**
 * @route   POST /api/v1/media/upload
 * @desc    Upload media file to library
 * @access  Private
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Media file is required' });
      return;
    }

    // Validate request body
    const validatedData = MediaUploadSchema.parse(req.body);

    // Determine media type from MIME type if not provided
    let mediaType = validatedData.mediaType;
    if (!mediaType) {
      if (req.file.mimetype.startsWith('image/')) {
        mediaType = 'IMAGE';
      } else if (req.file.mimetype.startsWith('video/')) {
        mediaType = 'VIDEO';
      } else if (req.file.mimetype.includes('dwg') || req.file.mimetype.includes('dxf') ||
                 req.file.mimetype.includes('step') || req.file.mimetype.includes('iges')) {
        mediaType = 'CAD_MODEL';
      } else {
        mediaType = 'DOCUMENT';
      }
    }

    // Prepare metadata
    const metadata = {
      fileName: validatedData.fileName,
      title: validatedData.title,
      description: validatedData.description,
      tags: validatedData.tags || [],
      instructionId: validatedData.instructionId,
      mediaType,
      mimeType: req.file.mimetype
    };

    const media = await mediaService.uploadMedia(req.file.buffer, metadata);

    logger.info('Media uploaded to library', {
      mediaId: media.id,
      fileName: metadata.fileName,
      mediaType,
      fileSize: req.file.size
    });

    res.status(201).json(media);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/media/search
 * @desc    Search media library with filters
 * @access  Private
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Validate query parameters
    const validatedQuery = MediaSearchSchema.parse(req.query);

    // Prepare filters
    const filters = {
      mediaType: validatedQuery.mediaType,
      tags: validatedQuery.tags,
      instructionId: validatedQuery.instructionId,
      hasAnnotations: validatedQuery.hasAnnotations
    };

    const media = await mediaService.searchMedia(validatedQuery.query || '', filters);

    // Apply pagination if specified
    const offset = validatedQuery.offset || 0;
    const limit = validatedQuery.limit || 50;
    const paginatedMedia = media.slice(offset, offset + limit);

    res.json({
      data: paginatedMedia,
      pagination: {
        offset,
        limit,
        total: media.length
      }
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/media/:id/annotations
 * @desc    Add annotations to media (images/diagrams)
 * @access  Private
 */
router.post('/:id/annotations', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    // Validate annotations
    const annotations = z.array(AnnotationSchema).parse(req.body);

    const updatedMedia = await mediaService.annotateMedia(id, annotations);

    logger.info('Media annotations added', {
      mediaId: id,
      annotationCount: annotations.length
    });

    res.json(updatedMedia);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/media/:id/usage
 * @desc    Get usage statistics for media
 * @access  Private
 */
router.get('/:id/usage', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const usageStats = await mediaService.getMediaUsage(id);

    res.json(usageStats);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/media/:id/metadata
 * @desc    Update media metadata
 * @access  Private
 */
router.put('/:id/metadata', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    // Validate request body
    const validatedData = UpdateMetadataSchema.parse(req.body);

    const updatedMedia = await mediaService.updateMediaMetadata(id, validatedData);

    logger.info('Media metadata updated', {
      mediaId: id,
      updates: Object.keys(validatedData)
    });

    res.json(updatedMedia);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/media/:id/track-usage
 * @desc    Track media usage (increment usage count)
 * @access  Private
 */
router.post('/:id/track-usage', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    await mediaService.trackUsage(id);

    res.status(200).json({ message: 'Usage tracked successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/media/library/stats
 * @desc    Get media library statistics
 * @access  Private
 */
router.get('/library/stats', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const stats = await mediaService.getLibraryStats();

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/media/cleanup
 * @desc    Delete unused media older than specified date
 * @access  Private (Admin only)
 */
router.delete('/cleanup', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { olderThan } = req.query;

    if (!olderThan || typeof olderThan !== 'string') {
      res.status(400).json({ error: 'olderThan date parameter is required' });
      return;
    }

    const cutoffDate = new Date(olderThan);
    if (isNaN(cutoffDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format for olderThan parameter' });
      return;
    }

    const deletedCount = await mediaService.deleteUnusedMedia(cutoffDate);

    logger.info('Media cleanup completed', {
      deletedCount,
      cutoffDate: cutoffDate.toISOString()
    });

    res.json({
      message: 'Media cleanup completed',
      deletedCount,
      cutoffDate: cutoffDate.toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/media/:id
 * @desc    Delete specific media item
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    // Note: MediaLibraryService doesn't have a direct delete method
    // We would need to add this to the service if single item deletion is needed
    // For now, using cleanup with a future date to delete unused items

    res.status(501).json({
      error: 'Direct media deletion not implemented yet',
      suggestion: 'Use cleanup endpoint for batch deletion of unused media'
    });
  } catch (error) {
    next(error);
  }
});

export default router;