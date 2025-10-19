import express, { Request, Response, NextFunction } from 'express';
import { workInstructionService } from '../services/WorkInstructionService';
import {
  CreateWorkInstructionSchema,
  UpdateWorkInstructionSchema,
  CreateStepSchema,
  UpdateStepSchema,
  WorkInstructionQueryParams,
} from '../types/workInstruction';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @route   POST /api/v1/work-instructions
 * @desc    Create a new work instruction
 * @access  Private
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
router.post('/:id/steps', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
router.put('/:id/steps/:stepId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
router.delete('/:id/steps/:stepId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
router.post('/:id/reject', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
router.post('/:id/steps/reorder', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
router.get('/part/:partId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { partId } = req.params;

    const workInstructions = await workInstructionService.getWorkInstructionsByPartId(partId);

    res.json(workInstructions);
  } catch (error) {
    next(error);
  }
});

export default router;
