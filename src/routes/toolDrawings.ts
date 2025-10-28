/**
 * Tool Drawing API Routes
 * GitHub Issue #23: Multi-Document Type Support Extension
 *
 * REST API endpoints for Tool & Fixture Drawing document management
 */

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { toolDrawingService } from '../services/ToolDrawingService';
import { logger } from '../utils/logger';
import { ToolType, MaintenanceType } from '@prisma/client';

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
      'video/webm',
      'application/vnd.dwg', // AutoCAD
      'application/vnd.solidworks', // SolidWorks
      'application/step', // STEP files
      'application/iges' // IGES files
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

const createToolDrawingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  toolType: z.nativeEnum(ToolType).optional().default(ToolType.FIXTURE),
  toolNumber: z.string().optional(),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  specifications: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.number().optional(),
  material: z.string().optional(),
  hardnessRequirement: z.string().optional(),
  accuracy: z.string().optional(),
  tolerances: z.string().optional(),
  maintenanceInstructions: z.string().optional(),
  calibrationRequired: z.boolean().optional().default(false),
  calibrationFrequencyDays: z.number().int().positive().optional(),
  safetyRequirements: z.string().optional(),
  storageRequirements: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional()
});

const updateToolDrawingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  toolType: z.nativeEnum(ToolType).optional(),
  toolNumber: z.string().optional(),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  specifications: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.number().optional(),
  material: z.string().optional(),
  hardnessRequirement: z.string().optional(),
  accuracy: z.string().optional(),
  tolerances: z.string().optional(),
  maintenanceInstructions: z.string().optional(),
  calibrationRequired: z.boolean().optional(),
  calibrationFrequencyDays: z.number().int().positive().optional(),
  safetyRequirements: z.string().optional(),
  storageRequirements: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional()
});

const recordMaintenanceSchema = z.object({
  maintenanceType: z.nativeEnum(MaintenanceType),
  performedBy: z.string().min(1),
  description: z.string().min(1),
  partsReplaced: z.string().optional(),
  cost: z.number().nonnegative().optional(),
  downtime: z.number().int().nonnegative().optional(),
  nextMaintenanceDate: z.string().datetime().optional(),
  notes: z.string().optional()
});

const recordCalibrationSchema = z.object({
  performedBy: z.string().min(1),
  calibrationStandard: z.string().optional(),
  results: z.string().optional(),
  passed: z.boolean(),
  adjustmentsMade: z.string().optional(),
  nextCalibrationDate: z.string().datetime().optional(),
  certificateNumber: z.string().optional(),
  notes: z.string().optional()
});

const recordUsageSchema = z.object({
  operatorId: z.string().min(1),
  operationId: z.string().optional(),
  workOrderId: z.string().optional(),
  partId: z.string().optional(),
  quantity: z.number().int().positive().optional().default(1),
  cycleCount: z.number().int().nonnegative().optional(),
  usageTime: z.number().int().nonnegative().optional(), // minutes
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
  notes: z.string().optional()
});

// ============================================================================
// TOOL DRAWING ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/tool-drawings
 * @desc    Create a new tool drawing
 * @access  Private
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const validatedData = createToolDrawingSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const toolDrawing = await toolDrawingService.createToolDrawing(validatedData, userId);

    logger.info('Tool drawing created', {
      userId,
      toolDrawingId: toolDrawing.id,
      documentNumber: toolDrawing.documentNumber
    });

    res.status(201).json(toolDrawing);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/tool-drawings
 * @desc    List tool drawings with filtering and pagination
 * @access  Private
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const queryParams = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      status: req.query.status as any,
      toolType: req.query.toolType as ToolType,
      toolNumber: req.query.toolNumber as string,
      partId: req.query.partId as string,
      operationId: req.query.operationId as string,
      manufacturer: req.query.manufacturer as string,
      search: req.query.search as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
    };

    const result = await toolDrawingService.listToolDrawings(queryParams);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/tool-drawings/:id
 * @desc    Get tool drawing by ID
 * @access  Private
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const toolDrawing = await toolDrawingService.getToolDrawingById(id);

    if (!toolDrawing) {
      res.status(404).json({ error: 'Tool drawing not found' });
      return;
    }

    res.json(toolDrawing);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/tool-drawings/:id
 * @desc    Update tool drawing
 * @access  Private
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = updateToolDrawingSchema.parse(req.body);

    // Get user ID from auth middleware
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const toolDrawing = await toolDrawingService.updateToolDrawing(id, validatedData, userId);

    res.json(toolDrawing);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/tool-drawings/:id
 * @desc    Delete tool drawing
 * @access  Private
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    await toolDrawingService.deleteToolDrawing(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// TOOL MAINTENANCE ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/tool-drawings/:id/maintenance
 * @desc    Record tool maintenance
 * @access  Private
 */
router.post('/:id/maintenance', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = recordMaintenanceSchema.parse({
      ...req.body,
      nextMaintenanceDate: req.body.nextMaintenanceDate ? new Date(req.body.nextMaintenanceDate) : undefined
    });

    const maintenance = await toolDrawingService.recordToolMaintenance(id, validatedData);

    logger.info('Tool maintenance recorded', {
      userId: (req as any).user?.id,
      toolDrawingId: id,
      maintenanceId: maintenance.id,
      maintenanceType: validatedData.maintenanceType,
      performedBy: validatedData.performedBy
    });

    res.status(201).json(maintenance);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/tool-drawings/:id/maintenance
 * @desc    Get maintenance history for tool
 * @access  Private
 */
router.get('/:id/maintenance', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const maintenanceType = req.query.maintenanceType as MaintenanceType;

    const maintenance = await toolDrawingService.getToolMaintenanceHistory(id, { maintenanceType });

    res.json(maintenance);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/tool-drawings/maintenance/due
 * @desc    Get tools due for maintenance
 * @access  Private
 */
router.get('/maintenance/due', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead as string) : 7;
    const toolType = req.query.toolType as ToolType;

    const toolsDue = await toolDrawingService.getToolsDueForMaintenance({ daysAhead, toolType });

    res.json(toolsDue);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// TOOL CALIBRATION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/tool-drawings/:id/calibration
 * @desc    Record tool calibration
 * @access  Private
 */
router.post('/:id/calibration', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = recordCalibrationSchema.parse({
      ...req.body,
      nextCalibrationDate: req.body.nextCalibrationDate ? new Date(req.body.nextCalibrationDate) : undefined
    });

    const calibration = await toolDrawingService.recordToolCalibration(id, validatedData);

    logger.info('Tool calibration recorded', {
      userId: (req as any).user?.id,
      toolDrawingId: id,
      calibrationId: calibration.id,
      performedBy: validatedData.performedBy,
      passed: validatedData.passed
    });

    res.status(201).json(calibration);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/tool-drawings/:id/calibration
 * @desc    Get calibration history for tool
 * @access  Private
 */
router.get('/:id/calibration', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const calibrations = await toolDrawingService.getToolCalibrationHistory(id);

    res.json(calibrations);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/tool-drawings/calibration/due
 * @desc    Get tools due for calibration
 * @access  Private
 */
router.get('/calibration/due', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead as string) : 30;
    const toolType = req.query.toolType as ToolType;

    const toolsDue = await toolDrawingService.getToolsDueForCalibration({ daysAhead, toolType });

    res.json(toolsDue);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/tool-drawings/:id/calibration/status
 * @desc    Get current calibration status for tool
 * @access  Private
 */
router.get('/:id/calibration/status', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const status = await toolDrawingService.getToolCalibrationStatus(id);

    res.json(status);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// TOOL USAGE ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/tool-drawings/:id/usage
 * @desc    Record tool usage
 * @access  Private
 */
router.post('/:id/usage', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = recordUsageSchema.parse(req.body);

    const usage = await toolDrawingService.recordToolUsage(id, validatedData);

    logger.info('Tool usage recorded', {
      userId: (req as any).user?.id,
      toolDrawingId: id,
      usageId: usage.id,
      operatorId: validatedData.operatorId,
      condition: validatedData.condition
    });

    res.status(201).json(usage);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Validation error', details: error });
      return;
    }
    next(error);
  }
});

/**
 * @route   GET /api/v1/tool-drawings/:id/usage
 * @desc    Get usage history for tool
 * @access  Private
 */
router.get('/:id/usage', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const usage = await toolDrawingService.getToolUsageHistory(id, { startDate, endDate });

    res.json(usage);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/tool-drawings/:id/usage/statistics
 * @desc    Get usage statistics for tool
 * @access  Private
 */
router.get('/:id/usage/statistics', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    const statistics = await toolDrawingService.getToolUsageStatistics(id, days);

    res.json(statistics);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INVENTORY AND AVAILABILITY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/tool-drawings/inventory
 * @desc    Get tool inventory status
 * @access  Private
 */
router.get('/inventory', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const toolType = req.query.toolType as ToolType;
    const condition = req.query.condition as string;
    const location = req.query.location as string;

    const inventory = await toolDrawingService.getToolInventory({
      toolType,
      condition: condition as any,
      location
    });

    res.json(inventory);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/tool-drawings/:id/availability
 * @desc    Check tool availability
 * @access  Private
 */
router.get('/:id/availability', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const availability = await toolDrawingService.checkToolAvailability(id);

    res.json(availability);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/tool-drawings/:id/location
 * @desc    Update tool location
 * @access  Private
 */
router.put('/:id/location', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { location, notes } = req.body;

    if (!location) {
      res.status(400).json({ error: 'Location is required' });
      return;
    }

    const toolDrawing = await toolDrawingService.updateToolLocation(id, location, notes);

    logger.info('Tool location updated', {
      userId: (req as any).user?.id,
      toolDrawingId: id,
      newLocation: location
    });

    res.json(toolDrawing);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// APPROVAL WORKFLOW ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/tool-drawings/:id/approve
 * @desc    Approve tool drawing
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

    const toolDrawing = await toolDrawingService.approveToolDrawing(id, userId);

    res.json(toolDrawing);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/tool-drawings/:id/reject
 * @desc    Reject tool drawing with reason and comments
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

    const toolDrawing = await toolDrawingService.rejectToolDrawing(id, userId, reason, comments);

    res.json(toolDrawing);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v1/tool-drawings/part/:partId
 * @desc    Get tool drawings by part ID
 * @access  Private
 */
router.get('/part/:partId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { partId } = req.params;

    const toolDrawings = await toolDrawingService.getToolDrawingsByPartId(partId);

    res.json(toolDrawings);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/tool-drawings/operation/:operationId
 * @desc    Get tool drawings by operation ID
 * @access  Private
 */
router.get('/operation/:operationId', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { operationId } = req.params;

    const toolDrawings = await toolDrawingService.getToolDrawingsByOperationId(operationId);

    res.json(toolDrawings);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/tool-drawings/tool-number/:toolNumber
 * @desc    Get tool drawing by tool number
 * @access  Private
 */
router.get('/tool-number/:toolNumber', async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { toolNumber } = req.params;

    const toolDrawing = await toolDrawingService.getToolDrawingByToolNumber(toolNumber);

    if (!toolDrawing) {
      res.status(404).json({ error: 'Tool drawing not found' });
      return;
    }

    res.json(toolDrawing);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/tool-drawings/:id/media
 * @desc    Upload media for tool drawing
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