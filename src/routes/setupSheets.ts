/**
 * Setup Sheet API Routes
 * GitHub Issue #23: Multi-Document Type Support Extension
 *
 * REST API endpoints for Setup Sheet document management
 */

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { setupSheetService } from '../services/SetupSheetService';
import { logger } from '../utils/logger';

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

const createSetupSheetSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  machineId: z.string().optional(),
  setupTime: z.number().int().nonnegative().optional(),
  teardownTime: z.number().int().nonnegative().optional(),
  safetyRequirements: z.string().optional(),
  qualityRequirements: z.string().optional(),
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
    qualityNotes: z.string().optional()
  })).optional()
});

const updateSetupSheetSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  machineId: z.string().optional(),
  setupTime: z.number().int().nonnegative().optional(),
  teardownTime: z.number().int().nonnegative().optional(),
  safetyRequirements: z.string().optional(),
  qualityRequirements: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional()
});

const addSetupStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().optional(),
  estimatedTime: z.number().int().nonnegative().optional(),
  isRequired: z.boolean().optional().default(true),
  safetyNotes: z.string().optional(),
  qualityNotes: z.string().optional()
});

const updateSetupStepSchema = z.object({
  stepNumber: z.number().int().positive().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  estimatedTime: z.number().int().nonnegative().optional(),
  isRequired: z.boolean().optional(),
  safetyNotes: z.string().optional(),
  qualityNotes: z.string().optional()
});

const addSetupParameterSchema = z.object({
  parameterName: z.string().min(1),
  targetValue: z.string().min(1),
  tolerance: z.string().optional(),
  unitOfMeasure: z.string().optional(),
  measurementMethod: z.string().optional(),
  isRequired: z.boolean().optional().default(true),
  notes: z.string().optional()
});

const addSetupToolSchema = z.object({
  toolName: z.string().min(1),
  toolNumber: z.string().optional(),
  quantity: z.number().int().positive().optional().default(1),
  isRequired: z.boolean().optional().default(true),
  notes: z.string().optional()
});

const startSetupExecutionSchema = z.object({
  operatorId: z.string().min(1),
  machineId: z.string().optional(),
  workOrderId: z.string().optional(),
  lotNumber: z.string().optional(),
  notes: z.string().optional()
});

const completeSetupExecutionSchema = z.object({
  actualSetupTime: z.number().int().nonnegative().optional(),
  actualTeardownTime: z.number().int().nonnegative().optional(),
  isFirstPieceGood: z.boolean().optional(),
  firstPieceNotes: z.string().optional(),
  completionNotes: z.string().optional()
});

// ============================================================================
// SETUP SHEET ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/setup-sheets
 * @desc    Create a new setup sheet
 * @access  Private
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = createSetupSheetSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const setupSheet = await setupSheetService.createSetupSheet(validatedData, userId);

    logger.info('Setup sheet created', {
      userId,
      setupSheetId: setupSheet.id,
      documentNumber: setupSheet.documentNumber
    });

    res.status(201).json(setupSheet);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/setup-sheets
 * @desc    List setup sheets with filtering and pagination
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
      machineId: req.query.machineId as string,
      search: req.query.search as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
    };

    const result = await setupSheetService.listSetupSheets(queryParams);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/setup-sheets/:id
 * @desc    Get setup sheet by ID
 * @access  Private
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const setupSheet = await setupSheetService.getSetupSheetById(id);

    if (!setupSheet) {
      res.status(404).json({ error: 'Setup sheet not found' });
      return;
    }

    res.json(setupSheet);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/setup-sheets/:id
 * @desc    Update setup sheet
 * @access  Private
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = updateSetupSheetSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const setupSheet = await setupSheetService.updateSetupSheet(id, validatedData, userId);

    res.json(setupSheet);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/setup-sheets/:id
 * @desc    Delete setup sheet
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    await setupSheetService.deleteSetupSheet(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SETUP STEP ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/setup-sheets/:id/steps
 * @desc    Add step to setup sheet
 * @access  Private
 */
router.post('/:id/steps', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = addSetupStepSchema.parse(req.body);

    const step = await setupSheetService.addSetupStep(id, validatedData);

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
 * @route   PUT /api/v1/setup-sheets/steps/:stepId
 * @desc    Update setup step
 * @access  Private
 */
router.put('/steps/:stepId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { stepId } = req.params;
    const validatedData = updateSetupStepSchema.parse(req.body);

    const step = await setupSheetService.updateSetupStep(stepId, validatedData);

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
 * @route   DELETE /api/v1/setup-sheets/steps/:stepId
 * @desc    Delete setup step
 * @access  Private
 */
router.delete('/steps/:stepId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { stepId } = req.params;

    await setupSheetService.deleteSetupStep(stepId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SETUP PARAMETER ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/setup-sheets/:id/parameters
 * @desc    Add parameter to setup sheet
 * @access  Private
 */
router.post('/:id/parameters', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = addSetupParameterSchema.parse(req.body);

    const parameter = await setupSheetService.addSetupParameter(id, validatedData);

    res.status(201).json(parameter);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/setup-sheets/parameters/:parameterId
 * @desc    Delete setup parameter
 * @access  Private
 */
router.delete('/parameters/:parameterId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { parameterId } = req.params;

    await setupSheetService.deleteSetupParameter(parameterId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SETUP TOOL ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/setup-sheets/:id/tools
 * @desc    Add tool to setup sheet
 * @access  Private
 */
router.post('/:id/tools', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = addSetupToolSchema.parse(req.body);

    const tool = await setupSheetService.addSetupTool(id, validatedData);

    res.status(201).json(tool);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/setup-sheets/tools/:toolId
 * @desc    Delete setup tool
 * @access  Private
 */
router.delete('/tools/:toolId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { toolId } = req.params;

    await setupSheetService.deleteSetupTool(toolId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SETUP EXECUTION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/setup-sheets/:id/executions
 * @desc    Start setup execution
 * @access  Private
 */
router.post('/:id/executions', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = startSetupExecutionSchema.parse(req.body);

    const execution = await setupSheetService.startSetupExecution(id, validatedData);

    logger.info('Setup execution started', {
      userId: (req as any).user?.id,
      setupSheetId: id,
      executionId: execution.id,
      operatorId: validatedData.operatorId
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
 * @route   PUT /api/v1/setup-sheets/executions/:executionId/complete
 * @desc    Complete setup execution
 * @access  Private
 */
router.put('/executions/:executionId/complete', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { executionId } = req.params;
    const validatedData = completeSetupExecutionSchema.parse(req.body);

    const execution = await setupSheetService.completeSetupExecution(executionId, validatedData);

    logger.info('Setup execution completed', {
      userId: (req as any).user?.id,
      executionId,
      isFirstPieceGood: validatedData.isFirstPieceGood
    });

    res.json(execution);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/setup-sheets/:id/executions
 * @desc    Get setup executions for a setup sheet
 * @access  Private
 */
router.get('/:id/executions', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const executions = await setupSheetService.getSetupExecutions(id);

    res.json(executions);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// APPROVAL WORKFLOW ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/setup-sheets/:id/approve
 * @desc    Approve setup sheet
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

    const setupSheet = await setupSheetService.approveSetupSheet(id, userId);

    res.json(setupSheet);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/setup-sheets/:id/reject
 * @desc    Reject setup sheet with reason and comments
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

    const setupSheet = await setupSheetService.rejectSetupSheet(id, userId, reason, comments);

    res.json(setupSheet);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/setup-sheets/part/:partId
 * @desc    Get setup sheets by part ID
 * @access  Private
 */
router.get('/part/:partId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { partId } = req.params;

    const setupSheets = await setupSheetService.getSetupSheetsByPartId(partId);

    res.json(setupSheets);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/setup-sheets/operation/:operationId
 * @desc    Get setup sheets by operation ID
 * @access  Private
 */
router.get('/operation/:operationId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { operationId } = req.params;

    const setupSheets = await setupSheetService.getSetupSheetsByOperationId(operationId);

    res.json(setupSheets);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/setup-sheets/:id/media
 * @desc    Upload media for setup sheet
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