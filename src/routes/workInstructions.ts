import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { workInstructionService } from '../services/WorkInstructionService';
import {
  CreateWorkInstructionSchema,
  UpdateWorkInstructionSchema,
  CreateStepSchema,
  UpdateStepSchema,
  WorkInstructionQueryParams,
} from '../types/workInstruction';
import { DocumentManagementService } from '../services/DocumentManagementService';
import { MediaLibraryService } from '../services/MediaLibraryService';
import { logger } from '../utils/logger';

// ✅ GITHUB ISSUE #18: Enhanced document management services
const documentService = new DocumentManagementService();
const mediaService = new MediaLibraryService();

// Configure multer for file uploads (GitHub Issue #18)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  }
});

// Validation schemas for document management (GitHub Issue #18)
const importMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  tags: z.string().optional(), // JSON string array
  categories: z.string().optional() // JSON string array
});

const router = express.Router();

/**
 * @route   POST /api/v1/work-instructions
 * @desc    Create a new work instruction
 * @access  Private
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    // Validate request body
    const validatedData = CreateWorkInstructionSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const workInstruction = await workInstructionService.createWorkInstruction(
      validatedData,
      userId
    );

    res.status(201).json(workInstruction);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/work-instructions
 * @desc    List work instructions with filtering and pagination
 * @access  Private
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const queryParams: WorkInstructionQueryParams = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      status: req.query.status as any,
      partId: req.query.partId as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
    };

    const result = await workInstructionService.listWorkInstructions(queryParams);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/work-instructions/:id
 * @desc    Get work instruction by ID
 * @access  Private
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const workInstruction = await workInstructionService.getWorkInstructionById(id);

    if (!workInstruction) {
      res.status(404).json({ error: 'Work instruction not found' });
      return;
    }

    res.json(workInstruction);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/work-instructions/:id
 * @desc    Update work instruction
 * @access  Private
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    // Validate request body
    const validatedData = UpdateWorkInstructionSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const workInstruction = await workInstructionService.updateWorkInstruction(
      id,
      validatedData,
      userId
    );

    res.json(workInstruction);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/work-instructions/:id
 * @desc    Delete work instruction
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    await workInstructionService.deleteWorkInstruction(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/work-instructions/:id/steps
 * @desc    Add step to work instruction
 * @access  Private
 */
router.post('/:id/steps', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    // Validate request body
    const validatedData = CreateStepSchema.parse(req.body);

    const step = await workInstructionService.addStep(id, validatedData);

    res.status(201).json(step);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   PUT /api/v1/work-instructions/:id/steps/:stepId
 * @desc    Update step
 * @access  Private
 */
router.put('/:id/steps/:stepId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { stepId } = req.params;

    // Validate request body
    const validatedData = UpdateStepSchema.parse(req.body);

    const step = await workInstructionService.updateStep(stepId, validatedData);

    res.json(step);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/work-instructions/:id/steps/:stepId
 * @desc    Delete step
 * @access  Private
 */
router.delete('/:id/steps/:stepId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { stepId } = req.params;

    await workInstructionService.deleteStep(stepId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/work-instructions/:id/approve
 * @desc    Approve work instruction
 * @access  Private (requires approval permission)
 */
router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // TODO: Check if user has approval permission

    const workInstruction = await workInstructionService.approveWorkInstruction(id, userId);

    res.json(workInstruction);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/work-instructions/:id/reject
 * @desc    Reject work instruction with reason and comments
 * @access  Private (requires approval permission)
 */
router.post('/:id/reject', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { reason, comments } = req.body;

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate required fields
    if (!reason || !comments) {
      res.status(400).json({ error: 'Rejection reason and comments are required' });
      return;
    }

    // Validate comments length
    if (comments.length < 20) {
      res.status(400).json({ error: 'Comments must be at least 20 characters' });
      return;
    }

    if (comments.length > 1000) {
      res.status(400).json({ error: 'Comments must not exceed 1000 characters' });
      return;
    }

    // TODO: Check if user has rejection permission

    const workInstruction = await workInstructionService.rejectWorkInstruction(
      id,
      userId,
      reason,
      comments
    );

    res.json(workInstruction);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/work-instructions/:id/steps/reorder
 * @desc    Reorder steps in work instruction
 * @access  Private
 */
router.post('/:id/steps/reorder', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { stepOrder } = req.body;

    if (!Array.isArray(stepOrder)) {
      res.status(400).json({ error: 'stepOrder must be an array' });
      return;
    }

    await workInstructionService.reorderSteps(id, stepOrder);

    res.json({ message: 'Steps reordered successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/work-instructions/part/:partId
 * @desc    Get work instructions by part ID
 * @access  Private
 */
router.get('/part/:partId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { partId } = req.params;

    const workInstructions = await workInstructionService.getWorkInstructionsByPartId(partId);

    res.json(workInstructions);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GitHub Issue #18: Enhanced Document Management Endpoints
// ============================================================================

/**
 * @route   POST /api/v1/work-instructions/import/pdf
 * @desc    Import PDF document as work instruction
 * @access  Private
 */
router.post('/import/pdf', upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'PDF file is required' });
      return;
    }

    if (req.file.mimetype !== 'application/pdf') {
      res.status(400).json({ error: 'File must be a PDF' });
      return;
    }

    const metadata = importMetadataSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Parse JSON strings
    const tags = metadata.tags ? JSON.parse(metadata.tags) : undefined;
    const categories = metadata.categories ? JSON.parse(metadata.categories) : undefined;

    const importData = {
      ...metadata,
      tags,
      categories,
      createdById: userId
    };

    const instruction = await documentService.importPDF(req.file.buffer, importData);

    logger.info('PDF imported as work instruction', {
      userId,
      instructionId: instruction.id,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    res.status(201).json(instruction);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/work-instructions/import/docx
 * @desc    Import DOCX document as work instruction
 * @access  Private
 */
router.post('/import/docx', upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'DOCX file is required' });
      return;
    }

    const allowedTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      res.status(400).json({ error: 'File must be a DOC or DOCX' });
      return;
    }

    const metadata = importMetadataSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Parse JSON strings
    const tags = metadata.tags ? JSON.parse(metadata.tags) : undefined;
    const categories = metadata.categories ? JSON.parse(metadata.categories) : undefined;

    const importData = {
      ...metadata,
      tags,
      categories,
      createdById: userId
    };

    const instruction = await documentService.importDOCX(req.file.buffer, importData);

    logger.info('DOCX imported as work instruction', {
      userId,
      instructionId: instruction.id,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    res.status(201).json(instruction);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/work-instructions/:id/export/pdf
 * @desc    Export work instruction as PDF
 * @access  Private
 */
router.get('/:id/export/pdf', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const pdfBuffer = await documentService.exportToPDF(req.params.id, {
      format: 'PDF',
      includeImages: true,
      includeThumbnails: false
    });

    // Get instruction title for filename
    const instruction = await workInstructionService.getWorkInstructionById(req.params.id);

    const filename = `${instruction?.title || 'work-instruction'}.pdf`;

    logger.info('Work instruction exported as PDF', {
      userId: (req as any).user?.id,
      instructionId: req.params.id,
      fileSize: pdfBuffer.length
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/work-instructions/:id/export/docx
 * @desc    Export work instruction as DOCX
 * @access  Private
 * ✅ GITHUB ISSUE #18: Multi-Format Document Management
 */
router.get('/:id/export/docx', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const docxBuffer = await documentService.exportToDOCX(req.params.id, {
      format: 'DOCX',
      includeImages: true,
      includeThumbnails: false
    });

    // Get instruction title for filename
    const instruction = await workInstructionService.getWorkInstructionById(req.params.id);

    const filename = `${instruction?.title || 'work-instruction'}.docx`;

    logger.info('Work instruction exported as DOCX', {
      userId: (req as any).user?.id,
      instructionId: req.params.id,
      fileSize: docxBuffer.length
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);
    res.send(docxBuffer);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/work-instructions/:id/export/pptx
 * @desc    Export work instruction as PPTX
 * @access  Private
 * ✅ GITHUB ISSUE #18: Multi-Format Document Management
 */
router.get('/:id/export/pptx', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const pptxBuffer = await documentService.exportToPPTX(req.params.id, {
      format: 'PPTX',
      includeImages: true,
      includeThumbnails: false
    });

    // Get instruction title for filename
    const instruction = await workInstructionService.getWorkInstructionById(req.params.id);

    const filename = `${instruction?.title || 'work-instruction'}.pptx`;

    logger.info('Work instruction exported as PPTX', {
      userId: (req as any).user?.id,
      instructionId: req.params.id,
      fileSize: pptxBuffer.length
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pptxBuffer.length);
    res.send(pptxBuffer);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/work-instructions/:id/media
 * @desc    Upload media for work instruction
 * @access  Private
 */
router.post('/:id/media', upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Media file is required' });
      return;
    }

    // Determine media type from MIME type
    let mediaType = 'DOCUMENT';
    if (req.file.mimetype.startsWith('image/')) {
      mediaType = 'IMAGE';
    } else if (req.file.mimetype.startsWith('video/')) {
      mediaType = 'VIDEO';
    }

    const metadata = {
      fileName: req.file.originalname,
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
      instructionId: req.params.id,
      mediaType: mediaType as any,
      mimeType: req.file.mimetype
    };

    const media = await mediaService.uploadMedia(req.file.buffer, metadata);

    logger.info('Media uploaded for work instruction', {
      userId: (req as any).user?.id,
      instructionId: req.params.id,
      mediaId: media.id,
      fileName: req.file.originalname
    });

    res.status(201).json(media);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/work-instructions/:id/media
 * @desc    List media for work instruction
 * @access  Private
 */
router.get('/:id/media', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const media = await mediaService.searchMedia('', {
      instructionId: req.params.id
    });

    res.json(media);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/work-instructions/search
 * @desc    Enhanced search with document management features
 * @access  Private
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      q,
      tags,
      categories,
      contentFormat,
      page = 1,
      limit = 50
    } = req.query;

    // Parse comma-separated arrays
    const tagArray = tags ? (tags as string).split(',').map(t => t.trim()) : undefined;
    const categoryArray = categories ? (categories as string).split(',').map(c => c.trim()) : undefined;

    const searchParams = {
      text: q as string,
      tags: tagArray,
      categories: categoryArray,
      contentFormat: contentFormat as string,
      limit: parseInt(limit as string),
      offset: (parseInt(page as string) - 1) * parseInt(limit as string)
    };

    const instructions = await documentService.searchDocuments(searchParams);

    res.json({
      data: instructions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: instructions.length
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
