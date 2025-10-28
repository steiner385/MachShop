/**
 * Inspection Plan API Routes
 * GitHub Issue #23: Multi-Document Type Support Extension
 *
 * REST API endpoints for Inspection Plan document management
 */

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { inspectionPlanService } from '../services/InspectionPlanService';
import { logger } from '../utils/logger';
import { InspectionType, InspectionFrequency, MeasurementType } from '@prisma/client';

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

const createInspectionPlanSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  inspectionType: z.nativeEnum(InspectionType).optional().default(InspectionType.INCOMING),
  frequency: z.nativeEnum(InspectionFrequency).optional().default(InspectionFrequency.EVERY_PIECE),
  sampleSize: z.number().int().positive().optional(),
  acceptanceLevel: z.string().optional(),
  safetyRequirements: z.string().optional(),
  equipmentRequired: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  characteristics: z.array(z.object({
    characteristicName: z.string().min(1),
    description: z.string().optional(),
    measurementType: z.nativeEnum(MeasurementType),
    specification: z.string().optional(),
    tolerance: z.string().optional(),
    unitOfMeasure: z.string().optional(),
    targetValue: z.string().optional(),
    inspectionMethod: z.string().optional(),
    isRequired: z.boolean().optional().default(true),
    notes: z.string().optional()
  })).optional()
});

const updateInspectionPlanSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  inspectionType: z.nativeEnum(InspectionType).optional(),
  frequency: z.nativeEnum(InspectionFrequency).optional(),
  sampleSize: z.number().int().positive().optional(),
  acceptanceLevel: z.string().optional(),
  safetyRequirements: z.string().optional(),
  equipmentRequired: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional()
});

const addInspectionCharacteristicSchema = z.object({
  characteristicName: z.string().min(1),
  description: z.string().optional(),
  measurementType: z.nativeEnum(MeasurementType),
  specification: z.string().optional(),
  tolerance: z.string().optional(),
  unitOfMeasure: z.string().optional(),
  targetValue: z.string().optional(),
  inspectionMethod: z.string().optional(),
  isRequired: z.boolean().optional().default(true),
  notes: z.string().optional()
});

const updateInspectionCharacteristicSchema = z.object({
  characteristicName: z.string().min(1).optional(),
  description: z.string().optional(),
  measurementType: z.nativeEnum(MeasurementType).optional(),
  specification: z.string().optional(),
  tolerance: z.string().optional(),
  unitOfMeasure: z.string().optional(),
  targetValue: z.string().optional(),
  inspectionMethod: z.string().optional(),
  isRequired: z.boolean().optional(),
  notes: z.string().optional()
});

const addInspectionStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().optional(),
  estimatedTime: z.number().int().nonnegative().optional(),
  isRequired: z.boolean().optional().default(true),
  safetyNotes: z.string().optional(),
  qualityNotes: z.string().optional()
});

const createInspectionExecutionSchema = z.object({
  inspectorId: z.string().min(1),
  batchNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  workOrderId: z.string().optional(),
  notes: z.string().optional()
});

const recordInspectionResultSchema = z.object({
  characteristicId: z.string().min(1),
  measuredValue: z.string().optional(),
  result: z.enum(['PASS', 'FAIL', 'NA']),
  disposition: z.enum(['ACCEPT', 'REJECT', 'REWORK', 'USE_AS_IS']).optional(),
  notes: z.string().optional()
});

// ============================================================================
// INSPECTION PLAN ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/inspection-plans
 * @desc    Create a new inspection plan
 * @access  Private
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = createInspectionPlanSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const inspectionPlan = await inspectionPlanService.createInspectionPlan(validatedData, userId);

    logger.info('Inspection plan created', {
      userId,
      inspectionPlanId: inspectionPlan.id,
      documentNumber: inspectionPlan.documentNumber
    });

    res.status(201).json(inspectionPlan);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/inspection-plans
 * @desc    List inspection plans with filtering and pagination
 * @access  Private
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const queryParams = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      status: req.query.status as any,
      partId: req.query.partId as string,
      operationId: req.query.operationId as string,
      inspectionType: req.query.inspectionType as InspectionType,
      frequency: req.query.frequency as InspectionFrequency,
      search: req.query.search as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
    };

    const result = await inspectionPlanService.listInspectionPlans(queryParams);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/inspection-plans/:id
 * @desc    Get inspection plan by ID
 * @access  Private
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const inspectionPlan = await inspectionPlanService.getInspectionPlanById(id);

    if (!inspectionPlan) {
      res.status(404).json({ error: 'Inspection plan not found' });
      return;
    }

    res.json(inspectionPlan);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/inspection-plans/:id
 * @desc    Update inspection plan
 * @access  Private
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = updateInspectionPlanSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const inspectionPlan = await inspectionPlanService.updateInspectionPlan(id, validatedData, userId);

    res.json(inspectionPlan);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/inspection-plans/:id
 * @desc    Delete inspection plan
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    await inspectionPlanService.deleteInspectionPlan(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INSPECTION CHARACTERISTIC ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/inspection-plans/:id/characteristics
 * @desc    Add characteristic to inspection plan
 * @access  Private
 */
router.post('/:id/characteristics', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = addInspectionCharacteristicSchema.parse(req.body);

    const characteristic = await inspectionPlanService.addInspectionCharacteristic(id, validatedData);

    res.status(201).json(characteristic);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   PUT /api/v1/inspection-plans/characteristics/:characteristicId
 * @desc    Update inspection characteristic
 * @access  Private
 */
router.put('/characteristics/:characteristicId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { characteristicId } = req.params;
    const validatedData = updateInspectionCharacteristicSchema.parse(req.body);

    const characteristic = await inspectionPlanService.updateInspectionCharacteristic(characteristicId, validatedData);

    res.json(characteristic);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/inspection-plans/characteristics/:characteristicId
 * @desc    Delete inspection characteristic
 * @access  Private
 */
router.delete('/characteristics/:characteristicId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { characteristicId } = req.params;

    await inspectionPlanService.deleteInspectionCharacteristic(characteristicId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INSPECTION STEP ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/inspection-plans/:id/steps
 * @desc    Add step to inspection plan
 * @access  Private
 */
router.post('/:id/steps', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = addInspectionStepSchema.parse(req.body);

    const step = await inspectionPlanService.addInspectionStep(id, validatedData);

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
 * @route   DELETE /api/v1/inspection-plans/steps/:stepId
 * @desc    Delete inspection step
 * @access  Private
 */
router.delete('/steps/:stepId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { stepId } = req.params;

    await inspectionPlanService.deleteInspectionStep(stepId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INSPECTION EXECUTION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/inspection-plans/:id/executions
 * @desc    Create inspection execution
 * @access  Private
 */
router.post('/:id/executions', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = createInspectionExecutionSchema.parse(req.body);

    const execution = await inspectionPlanService.createInspectionExecution(id, validatedData);

    logger.info('Inspection execution created', {
      userId: (req as any).user?.id,
      inspectionPlanId: id,
      executionId: execution.id,
      inspectorId: validatedData.inspectorId
    });

    res.status(201).json(execution);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   POST /api/v1/inspection-plans/executions/:executionId/results
 * @desc    Record inspection result
 * @access  Private
 */
router.post('/executions/:executionId/results', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { executionId } = req.params;
    const validatedData = recordInspectionResultSchema.parse(req.body);

    const result = await inspectionPlanService.recordInspectionResult(executionId, validatedData);

    logger.info('Inspection result recorded', {
      userId: (req as any).user?.id,
      executionId,
      characteristicId: validatedData.characteristicId,
      result: validatedData.result
    });

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   PUT /api/v1/inspection-plans/executions/:executionId/complete
 * @desc    Complete inspection execution
 * @access  Private
 */
router.put('/executions/:executionId/complete', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { executionId } = req.params;
    const { completionNotes } = req.body;

    const execution = await inspectionPlanService.completeInspectionExecution(executionId, completionNotes);

    logger.info('Inspection execution completed', {
      userId: (req as any).user?.id,
      executionId,
      overallResult: execution.overallResult
    });

    res.json(execution);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/inspection-plans/:id/executions
 * @desc    Get inspection executions for a plan
 * @access  Private
 */
router.get('/:id/executions', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const executions = await inspectionPlanService.getInspectionExecutions(id);

    res.json(executions);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// STATISTICS AND REPORTING ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/inspection-plans/:id/statistics
 * @desc    Get inspection statistics for a plan
 * @access  Private
 */
router.get('/:id/statistics', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const statistics = await inspectionPlanService.getInspectionStatistics(id, days);

    res.json(statistics);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/inspection-plans/statistics/summary
 * @desc    Get inspection statistics summary across all plans
 * @access  Private
 */
router.get('/statistics/summary', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const partId = req.query.partId as string;
    const operationId = req.query.operationId as string;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const summary = await inspectionPlanService.getInspectionSummary({
      partId,
      operationId,
      days
    });

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// APPROVAL WORKFLOW ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/inspection-plans/:id/approve
 * @desc    Approve inspection plan
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

    const inspectionPlan = await inspectionPlanService.approveInspectionPlan(id, userId);

    res.json(inspectionPlan);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/inspection-plans/:id/reject
 * @desc    Reject inspection plan with reason and comments
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

    const inspectionPlan = await inspectionPlanService.rejectInspectionPlan(id, userId, reason, comments);

    res.json(inspectionPlan);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/inspection-plans/part/:partId
 * @desc    Get inspection plans by part ID
 * @access  Private
 */
router.get('/part/:partId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { partId } = req.params;

    const inspectionPlans = await inspectionPlanService.getInspectionPlansByPartId(partId);

    res.json(inspectionPlans);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/inspection-plans/operation/:operationId
 * @desc    Get inspection plans by operation ID
 * @access  Private
 */
router.get('/operation/:operationId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { operationId } = req.params;

    const inspectionPlans = await inspectionPlanService.getInspectionPlansByOperationId(operationId);

    res.json(inspectionPlans);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/inspection-plans/:id/media
 * @desc    Upload media for inspection plan
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