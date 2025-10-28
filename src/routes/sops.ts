/**
 * Standard Operating Procedure (SOP) API Routes
 * GitHub Issue #23: Multi-Document Type Support Extension
 *
 * REST API endpoints for SOP document management
 */

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { sopService } from '../services/SOPService';
import { logger } from '../utils/logger';
import { SOPType } from '@prisma/client';

const router = express.Router();

// Configure multer for file uploads
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

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createSOPSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  sopType: z.nativeEnum(SOPType).optional().default(SOPType.SAFETY),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  department: z.string().optional(),
  scope: z.string().optional(),
  purpose: z.string().optional(),
  safetyRequirements: z.string().optional(),
  trainingRequired: z.boolean().optional().default(false),
  reviewFrequencyDays: z.number().int().positive().optional().default(365),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  steps: z.array(z.object({
    stepNumber: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string().optional(),
    instructions: z.string().optional(),
    estimatedTime: z.number().int().nonnegative().optional(),
    isRequired: z.boolean().optional().default(true),
    safetyNotes: z.string().optional(),
    warningLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
  })).optional()
});

const updateSOPSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  sopType: z.nativeEnum(SOPType).optional(),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  department: z.string().optional(),
  scope: z.string().optional(),
  purpose: z.string().optional(),
  safetyRequirements: z.string().optional(),
  trainingRequired: z.boolean().optional(),
  reviewFrequencyDays: z.number().int().positive().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional()
});

const addSOPStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().optional(),
  estimatedTime: z.number().int().nonnegative().optional(),
  isRequired: z.boolean().optional().default(true),
  safetyNotes: z.string().optional(),
  warningLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
});

const updateSOPStepSchema = z.object({
  stepNumber: z.number().int().positive().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  estimatedTime: z.number().int().nonnegative().optional(),
  isRequired: z.boolean().optional(),
  safetyNotes: z.string().optional(),
  warningLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
});

const createSOPAcknowledgmentSchema = z.object({
  userId: z.string().min(1),
  acknowledgmentType: z.enum(['READ', 'trained', 'certified']),
  trainingScore: z.number().min(0).max(100).optional(),
  assessmentPassed: z.boolean().optional(),
  notes: z.string().optional()
});

const createSOPAuditSchema = z.object({
  auditorId: z.string().min(1),
  auditType: z.enum(['compliance', 'effectiveness', 'training']),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  nextAuditDate: z.string().datetime().optional()
});

// ============================================================================
// SOP ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/sops
 * @desc    Create a new SOP
 * @access  Private
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = createSOPSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sop = await sopService.createSOP(validatedData, userId);

    logger.info('SOP created', {
      userId,
      sopId: sop.id,
      documentNumber: sop.documentNumber
    });

    res.status(201).json(sop);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/sops
 * @desc    List SOPs with filtering and pagination
 * @access  Private
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const queryParams = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      status: req.query.status as any,
      sopType: req.query.sopType as SOPType,
      partId: req.query.partId as string,
      operationId: req.query.operationId as string,
      department: req.query.department as string,
      search: req.query.search as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
    };

    const result = await sopService.listSOPs(queryParams);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/sops/:id
 * @desc    Get SOP by ID
 * @access  Private
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const sop = await sopService.getSOPById(id);

    if (!sop) {
      res.status(404).json({ error: 'SOP not found' });
      return;
    }

    res.json(sop);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/sops/:id
 * @desc    Update SOP
 * @access  Private
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = updateSOPSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sop = await sopService.updateSOP(id, validatedData, userId);

    res.json(sop);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/sops/:id
 * @desc    Delete SOP
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    await sopService.deleteSOP(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SOP STEP ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/sops/:id/steps
 * @desc    Add step to SOP
 * @access  Private
 */
router.post('/:id/steps', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = addSOPStepSchema.parse(req.body);

    const step = await sopService.addSOPStep(id, validatedData);

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
 * @route   PUT /api/v1/sops/steps/:stepId
 * @desc    Update SOP step
 * @access  Private
 */
router.put('/steps/:stepId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { stepId } = req.params;
    const validatedData = updateSOPStepSchema.parse(req.body);

    const step = await sopService.updateSOPStep(stepId, validatedData);

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
 * @route   DELETE /api/v1/sops/steps/:stepId
 * @desc    Delete SOP step
 * @access  Private
 */
router.delete('/steps/:stepId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { stepId } = req.params;

    await sopService.deleteSOPStep(stepId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SOP ACKNOWLEDGMENT ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/sops/:id/acknowledgments
 * @desc    Create SOP acknowledgment (user has read/trained on SOP)
 * @access  Private
 */
router.post('/:id/acknowledgments', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = createSOPAcknowledgmentSchema.parse(req.body);

    const acknowledgment = await sopService.createSOPAcknowledgment(id, validatedData);

    logger.info('SOP acknowledgment created', {
      userId: (req as any).user?.id,
      sopId: id,
      acknowledgmentId: acknowledgment.id,
      acknowledgedUserId: validatedData.userId,
      acknowledgmentType: validatedData.acknowledgmentType
    });

    res.status(201).json(acknowledgment);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/sops/:id/acknowledgments
 * @desc    Get SOP acknowledgments
 * @access  Private
 */
router.get('/:id/acknowledgments', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string;
    const acknowledgmentType = req.query.acknowledgmentType as string;

    const acknowledgments = await sopService.getSOPAcknowledgments(id, {
      userId,
      acknowledgmentType: acknowledgmentType as any
    });

    res.json(acknowledgments);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/sops/:id/training-status/:userId
 * @desc    Get training status for a user on a specific SOP
 * @access  Private
 */
router.get('/:id/training-status/:userId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id, userId } = req.params;

    const trainingStatus = await sopService.getUserTrainingStatus(id, userId);

    res.json(trainingStatus);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SOP AUDIT ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/sops/:id/audits
 * @desc    Create SOP audit
 * @access  Private
 */
router.post('/:id/audits', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = createSOPAuditSchema.parse({
      ...req.body,
      nextAuditDate: req.body.nextAuditDate ? new Date(req.body.nextAuditDate) : undefined
    });

    const audit = await sopService.createSOPAudit(id, validatedData);

    logger.info('SOP audit created', {
      userId: (req as any).user?.id,
      sopId: id,
      auditId: audit.id,
      auditorId: validatedData.auditorId,
      auditType: validatedData.auditType
    });

    res.status(201).json(audit);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/sops/:id/audits
 * @desc    Get SOP audits
 * @access  Private
 */
router.get('/:id/audits', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const audits = await sopService.getSOPAudits(id);

    res.json(audits);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// REVIEW AND COMPLIANCE ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/sops/due-for-review
 * @desc    Get SOPs due for review
 * @access  Private
 */
router.get('/due-for-review', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const department = req.query.department as string;
    const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead as string) : 30;

    const sops = await sopService.getSOPsDueForReview({
      department,
      daysAhead
    });

    res.json(sops);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/sops/training-compliance
 * @desc    Get training compliance report
 * @access  Private
 */
router.get('/training-compliance', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const department = req.query.department as string;
    const sopType = req.query.sopType as SOPType;

    const compliance = await sopService.getTrainingComplianceReport({
      department,
      sopType
    });

    res.json(compliance);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/sops/:id/schedule-review
 * @desc    Schedule SOP for review
 * @access  Private
 */
router.post('/:id/schedule-review', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { reviewDate, reviewerIds, notes } = req.body;

    if (!reviewDate) {
      res.status(400).json({ error: 'Review date is required' });
      return;
    }

    const scheduledReview = await sopService.scheduleSOPReview(id, {
      reviewDate: new Date(reviewDate),
      reviewerIds,
      notes
    });

    logger.info('SOP review scheduled', {
      userId: (req as any).user?.id,
      sopId: id,
      reviewDate
    });

    res.status(201).json(scheduledReview);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// APPROVAL WORKFLOW ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/sops/:id/approve
 * @desc    Approve SOP
 * @access  Private
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

    const sop = await sopService.approveSOP(id, userId);

    res.json(sop);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/sops/:id/reject
 * @desc    Reject SOP with reason and comments
 * @access  Private
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

    if (comments.length < 20) {
      res.status(400).json({ error: 'Comments must be at least 20 characters' });
      return;
    }

    if (comments.length > 1000) {
      res.status(400).json({ error: 'Comments must not exceed 1000 characters' });
      return;
    }

    const sop = await sopService.rejectSOP(id, userId, reason, comments);

    res.json(sop);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/sops/part/:partId
 * @desc    Get SOPs by part ID
 * @access  Private
 */
router.get('/part/:partId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { partId } = req.params;

    const sops = await sopService.getSOPsByPartId(partId);

    res.json(sops);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/sops/operation/:operationId
 * @desc    Get SOPs by operation ID
 * @access  Private
 */
router.get('/operation/:operationId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { operationId } = req.params;

    const sops = await sopService.getSOPsByOperationId(operationId);

    res.json(sops);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/sops/department/:department
 * @desc    Get SOPs by department
 * @access  Private
 */
router.get('/department/:department', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { department } = req.params;

    const sops = await sopService.getSOPsByDepartment(department);

    res.json(sops);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/sops/:id/media
 * @desc    Upload media for SOP
 * @access  Private
 */
router.post('/:id/media', upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Media file is required' });
      return;
    }

    // This would integrate with MediaLibraryService similar to work instructions
    // For now, return placeholder response
    res.status(201).json({
      message: 'Media upload functionality to be integrated',
      fileInfo: {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;