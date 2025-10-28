/**
 * ✅ GITHUB ISSUE #22: ECO (Engineering Change Order) API Routes
 *
 * REST API endpoints for managing ECOs, CRB reviews, and effectivity.
 * Provides comprehensive ECO lifecycle management with impact analysis,
 * task management, attachment handling, and complete audit trails.
 *
 * Endpoints:
 *
 * ECO Management:
 * - GET    /api/v1/eco                        - List ECOs with filters
 * - POST   /api/v1/eco                        - Create new ECO
 * - GET    /api/v1/eco/:id                    - Get ECO details
 * - PUT    /api/v1/eco/:id                    - Update ECO
 * - DELETE /api/v1/eco/:id                    - Cancel ECO
 * - GET    /api/v1/eco/number/:ecoNumber      - Get ECO by number
 * - GET    /api/v1/eco/my-ecos                - Get user's ECOs
 * - PUT    /api/v1/eco/:id/status             - Change ECO status
 * - POST   /api/v1/eco/:id/complete           - Complete ECO
 *
 * Impact Analysis:
 * - POST   /api/v1/eco/:id/analyze-impact     - Analyze ECO impact
 * - GET    /api/v1/eco/:id/affected-documents - Get affected documents
 * - POST   /api/v1/eco/:id/affected-documents - Add affected document
 * - PUT    /api/v1/eco/:id/affected-documents/:docId - Update document status
 *
 * Task Management:
 * - GET    /api/v1/eco/:id/tasks              - Get ECO tasks
 * - POST   /api/v1/eco/:id/tasks              - Create ECO task
 * - PUT    /api/v1/eco/tasks/:taskId          - Update task
 * - POST   /api/v1/eco/tasks/:taskId/assign   - Assign task
 * - POST   /api/v1/eco/tasks/:taskId/complete - Complete task
 * - GET    /api/v1/eco/tasks/my-tasks         - Get user's tasks
 *
 * Attachments:
 * - GET    /api/v1/eco/:id/attachments        - Get ECO attachments
 * - POST   /api/v1/eco/:id/attachments        - Upload attachment
 * - DELETE /api/v1/eco/attachments/:attachmentId - Delete attachment
 *
 * History & Audit:
 * - GET    /api/v1/eco/:id/history            - Get ECO history
 *
 * CRB (Change Review Board):
 * - GET    /api/v1/eco/crb/configuration      - Get CRB configuration
 * - PUT    /api/v1/eco/crb/configuration      - Update CRB configuration
 * - POST   /api/v1/eco/:id/crb/schedule       - Schedule CRB review
 * - GET    /api/v1/eco/crb/agenda/:date       - Generate meeting agenda
 * - POST   /api/v1/eco/crb/reviews/:reviewId/distribute - Distribute materials
 * - POST   /api/v1/eco/crb/reviews/:reviewId/decision   - Record CRB decision
 * - GET    /api/v1/eco/:id/crb/reviews        - Get ECO CRB reviews
 * - GET    /api/v1/eco/crb/upcoming-meetings  - Get upcoming CRB meetings
 *
 * Effectivity:
 * - POST   /api/v1/eco/:id/effectivity        - Set ECO effectivity
 * - GET    /api/v1/eco/effectivity/version    - Get effective version
 * - POST   /api/v1/eco/effectivity/check      - Check effectivity
 * - GET    /api/v1/eco/:id/transition-plan    - Get transition plan
 * - POST   /api/v1/eco/:id/validate-effectivity - Validate effectivity
 * - GET    /api/v1/eco/effectivity/version-info - Get version information
 *
 * Analytics & Reporting:
 * - GET    /api/v1/eco/analytics              - Get ECO analytics
 * - GET    /api/v1/eco/analytics/dashboard    - Get dashboard metrics
 * - GET    /api/v1/eco/reports/cycle-time     - Get cycle time report
 * - GET    /api/v1/eco/reports/cost-analysis  - Get cost analysis report
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { ECOService } from '../services/ECOService';
import { CRBService } from '../services/CRBService';
import { EffectivityService } from '../services/EffectivityService';
import {
  ECOCreateInput,
  ECOUpdateInput,
  ECOFilters,
  ECOTaskCreateInput,
  ECOTaskUpdateInput,
  ECOTaskFilters,
  ECOAttachmentCreateInput,
  ImpactAnalysisInput,
  EffectivityInput,
  EffectivityContext,
  ECOError,
  ECOValidationError,
  ECOStateError,
  ECOPermissionError
} from '../types/eco';
import {
  ECOStatus,
  ECOType,
  ECOPriority,
  EffectivityType,
  AttachmentType
} from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize services
const ecoService = new ECOService(prisma);
const crbService = new CRBService(prisma);
const effectivityService = new EffectivityService(prisma);

// Require authentication for all ECO routes
router.use(authMiddleware);

// ============================================================================
// ECO Management Endpoints
// ============================================================================

/**
 * GET /api/v1/eco
 * List ECOs with optional filters
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const filters: ECOFilters = {
      status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status as ECOStatus[] : [req.query.status as ECOStatus]) : undefined,
      priority: req.query.priority ? (Array.isArray(req.query.priority) ? req.query.priority as ECOPriority[] : [req.query.priority as ECOPriority]) : undefined,
      ecoType: req.query.ecoType ? (Array.isArray(req.query.ecoType) ? req.query.ecoType as ECOType[] : [req.query.ecoType as ECOType]) : undefined,
      requestorId: req.query.requestorId as string,
      requestDateFrom: req.query.requestDateFrom ? new Date(req.query.requestDateFrom as string) : undefined,
      requestDateTo: req.query.requestDateTo ? new Date(req.query.requestDateTo as string) : undefined,
      assignedToId: req.query.assignedToId as string,
      affectedPart: req.query.affectedPart as string,
      searchTerm: req.query.searchTerm as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc'
    };

    const ecos = await ecoService.getECOs(filters);

    res.json({
      success: true,
      data: ecos,
      count: ecos.length
    });

  } catch (error) {
    console.error('Error listing ECOs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list ECOs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/eco
 * Create new ECO
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const input: ECOCreateInput = {
      ...req.body,
      requestorId: req.body.requestorId || (req as any).user?.id,
      requestorName: req.body.requestorName || (req as any).user?.name,
      requestorDept: req.body.requestorDept || (req as any).user?.department,
      requestedEffectiveDate: req.body.requestedEffectiveDate ? new Date(req.body.requestedEffectiveDate) : undefined
    };

    const eco = await ecoService.createECO(input);

    res.status(201).json({
      success: true,
      data: eco,
      message: `ECO ${eco.ecoNumber} created successfully`
    });

  } catch (error) {
    console.error('Error creating ECO:', error);

    if (error instanceof ECOValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message,
        field: error.field
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create ECO',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * GET /api/v1/eco/:id
 * Get ECO details by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const eco = await ecoService.getECOById(req.params.id);

    res.json({
      success: true,
      data: eco
    });

  } catch (error) {
    console.error('Error getting ECO:', error);

    if (error instanceof ECOError && error.code === 'ECO_NOT_FOUND') {
      res.status(404).json({
        success: false,
        error: 'ECO not found',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get ECO',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * PUT /api/v1/eco/:id
 * Update ECO
 */
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const input: ECOUpdateInput = {
      ...req.body,
      requestedEffectiveDate: req.body.requestedEffectiveDate ? new Date(req.body.requestedEffectiveDate) : undefined,
      plannedEffectiveDate: req.body.plannedEffectiveDate ? new Date(req.body.plannedEffectiveDate) : undefined,
      actualEffectiveDate: req.body.actualEffectiveDate ? new Date(req.body.actualEffectiveDate) : undefined
    };

    const userId = (req as any).user?.id;
    const eco = await ecoService.updateECO(req.params.id, input, userId);

    res.json({
      success: true,
      data: eco,
      message: `ECO ${eco.ecoNumber} updated successfully`
    });

  } catch (error) {
    console.error('Error updating ECO:', error);

    if (error instanceof ECOPermissionError) {
      res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: error.message
      });
    } else if (error instanceof ECOValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update ECO',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * DELETE /api/v1/eco/:id
 * Cancel ECO
 */
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const reason = req.body.reason || 'Cancelled by user';
    const userId = (req as any).user?.id;

    const eco = await ecoService.cancelECO(req.params.id, reason, userId);

    res.json({
      success: true,
      data: eco,
      message: `ECO ${eco.ecoNumber} cancelled successfully`
    });

  } catch (error) {
    console.error('Error cancelling ECO:', error);

    if (error instanceof ECOStateError) {
      res.status(400).json({
        success: false,
        error: 'Invalid state',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to cancel ECO',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * GET /api/v1/eco/number/:ecoNumber
 * Get ECO by number
 */
router.get('/number/:ecoNumber', async (req: Request, res: Response): Promise<any> => {
  try {
    const eco = await ecoService.getECOByNumber(req.params.ecoNumber);

    res.json({
      success: true,
      data: eco
    });

  } catch (error) {
    console.error('Error getting ECO by number:', error);

    if (error instanceof ECOError && error.code === 'ECO_NOT_FOUND') {
      res.status(404).json({
        success: false,
        error: 'ECO not found',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to get ECO',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * GET /api/v1/eco/my-ecos
 * Get user's ECOs
 */
router.get('/my-ecos', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const ecos = await ecoService.getMyECOs(userId);

    res.json({
      success: true,
      data: ecos,
      count: ecos.length
    });

  } catch (error) {
    console.error('Error getting user ECOs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user ECOs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/v1/eco/:id/status
 * Change ECO status
 */
router.put('/:id/status', async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, reason } = req.body;
    const userId = (req as any).user?.id;

    const eco = await ecoService.changeECOStatus(req.params.id, status, userId, reason);

    res.json({
      success: true,
      data: eco,
      message: `ECO status changed to ${status}`
    });

  } catch (error) {
    console.error('Error changing ECO status:', error);

    if (error instanceof ECOStateError) {
      res.status(400).json({
        success: false,
        error: 'Invalid state transition',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to change ECO status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * POST /api/v1/eco/:id/complete
 * Complete ECO
 */
router.post('/:id/complete', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user?.id;
    const eco = await ecoService.completeECO(req.params.id, userId);

    res.json({
      success: true,
      data: eco,
      message: `ECO ${eco.ecoNumber} completed successfully`
    });

  } catch (error) {
    console.error('Error completing ECO:', error);

    if (error instanceof ECOStateError) {
      res.status(400).json({
        success: false,
        error: 'Cannot complete ECO',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to complete ECO',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// ============================================================================
// Impact Analysis Endpoints
// ============================================================================

/**
 * POST /api/v1/eco/:id/analyze-impact
 * Analyze ECO impact
 */
router.post('/:id/analyze-impact', async (req: Request, res: Response): Promise<any> => {
  try {
    const input: ImpactAnalysisInput = {
      ecoId: req.params.id,
      includeDocuments: req.body.includeDocuments !== false,
      includeOperational: req.body.includeOperational !== false,
      includeCost: req.body.includeCost !== false
    };

    const analysis = await ecoService.analyzeImpact(input);

    res.json({
      success: true,
      data: analysis,
      message: 'Impact analysis completed'
    });

  } catch (error) {
    console.error('Error analyzing ECO impact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze ECO impact',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/eco/:id/affected-documents
 * Get affected documents
 */
router.get('/:id/affected-documents', async (req: Request, res: Response): Promise<any> => {
  try {
    const documents = await ecoService.identifyAffectedDocuments(req.params.id);

    res.json({
      success: true,
      data: documents,
      count: documents.length
    });

  } catch (error) {
    console.error('Error getting affected documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get affected documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Task Management Endpoints
// ============================================================================

/**
 * GET /api/v1/eco/:id/tasks
 * Get ECO tasks
 */
router.get('/:id/tasks', async (req: Request, res: Response): Promise<any> => {
  try {
    const filters: ECOTaskFilters = {
      status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status as any[] : [req.query.status]) : undefined,
      taskType: req.query.taskType ? (Array.isArray(req.query.taskType) ? req.query.taskType as any[] : [req.query.taskType]) : undefined,
      assignedToId: req.query.assignedToId as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };

    const tasks = await ecoService.getECOTasks(req.params.id, filters);

    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });

  } catch (error) {
    console.error('Error getting ECO tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ECO tasks',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/eco/:id/tasks
 * Create ECO task
 */
router.post('/:id/tasks', async (req: Request, res: Response): Promise<any> => {
  try {
    const input: ECOTaskCreateInput = {
      ...req.body,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined
    };

    const task = await ecoService.createTask(req.params.id, input);

    res.status(201).json({
      success: true,
      data: task,
      message: 'ECO task created successfully'
    });

  } catch (error) {
    console.error('Error creating ECO task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ECO task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/eco/tasks/:taskId/assign
 * Assign task to user
 */
router.post('/tasks/:taskId/assign', async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId, userName } = req.body;
    const task = await ecoService.assignTask(req.params.taskId, userId, userName);

    res.json({
      success: true,
      data: task,
      message: `Task assigned to ${userName}`
    });

  } catch (error) {
    console.error('Error assigning ECO task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign ECO task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/eco/tasks/:taskId/complete
 * Complete task
 */
router.post('/tasks/:taskId/complete', async (req: Request, res: Response): Promise<any> => {
  try {
    const { notes } = req.body;
    const userId = (req as any).user?.id;
    const task = await ecoService.completeTask(req.params.taskId, notes, userId);

    res.json({
      success: true,
      data: task,
      message: 'Task completed successfully'
    });

  } catch (error) {
    console.error('Error completing ECO task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete ECO task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Attachment Endpoints
// ============================================================================

/**
 * GET /api/v1/eco/:id/attachments
 * Get ECO attachments
 */
router.get('/:id/attachments', async (req: Request, res: Response): Promise<any> => {
  try {
    const type = req.query.type as AttachmentType;
    const attachments = await ecoService.getAttachments(req.params.id, type);

    res.json({
      success: true,
      data: attachments,
      count: attachments.length
    });

  } catch (error) {
    console.error('Error getting ECO attachments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ECO attachments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/eco/:id/attachments
 * Upload ECO attachment
 */
router.post('/:id/attachments', async (req: Request, res: Response): Promise<any> => {
  try {
    const input: ECOAttachmentCreateInput = {
      ...req.body,
      uploadedById: (req as any).user?.id,
      uploadedByName: (req as any).user?.name
    };

    const attachment = await ecoService.addAttachment(req.params.id, input);

    res.status(201).json({
      success: true,
      data: attachment,
      message: 'Attachment uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading ECO attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload ECO attachment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// CRB (Change Review Board) Endpoints
// ============================================================================

/**
 * GET /api/v1/eco/crb/configuration
 * Get CRB configuration
 */
router.get('/crb/configuration', async (req: Request, res: Response): Promise<any> => {
  try {
    const config = await crbService.getCRBConfiguration();

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Error getting CRB configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CRB configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/v1/eco/crb/configuration
 * Update CRB configuration
 */
router.put('/crb/configuration', async (req: Request, res: Response): Promise<any> => {
  try {
    const config = await crbService.updateCRBConfiguration(req.body);

    res.json({
      success: true,
      data: config,
      message: 'CRB configuration updated successfully'
    });

  } catch (error) {
    console.error('Error updating CRB configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update CRB configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/eco/:id/crb/schedule
 * Schedule CRB review
 */
router.post('/:id/crb/schedule', async (req: Request, res: Response): Promise<any> => {
  try {
    const { meetingDate } = req.body;
    const review = await crbService.scheduleCRBReview(req.params.id, new Date(meetingDate));

    res.status(201).json({
      success: true,
      data: review,
      message: 'CRB review scheduled successfully'
    });

  } catch (error) {
    console.error('Error scheduling CRB review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule CRB review',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/eco/crb/agenda/:date
 * Generate meeting agenda
 */
router.get('/crb/agenda/:date', async (req: Request, res: Response): Promise<any> => {
  try {
    const meetingDate = new Date(req.params.date);
    const agenda = await crbService.generateAgenda(meetingDate);

    res.json({
      success: true,
      data: agenda
    });

  } catch (error) {
    console.error('Error generating CRB agenda:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate CRB agenda',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/eco/crb/upcoming-meetings
 * Get upcoming CRB meetings
 */
router.get('/crb/upcoming-meetings', async (req: Request, res: Response): Promise<any> => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const meetings = await crbService.getUpcomingMeetings(days);

    res.json({
      success: true,
      data: meetings,
      count: meetings.length
    });

  } catch (error) {
    console.error('Error getting upcoming CRB meetings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upcoming CRB meetings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Effectivity Endpoints
// ============================================================================

/**
 * POST /api/v1/eco/:id/effectivity
 * Set ECO effectivity
 */
router.post('/:id/effectivity', async (req: Request, res: Response): Promise<any> => {
  try {
    const input: EffectivityInput = {
      ...req.body,
      plannedEffectiveDate: req.body.plannedEffectiveDate ? new Date(req.body.plannedEffectiveDate) : undefined
    };

    await effectivityService.setEffectivity(req.params.id, input);

    res.json({
      success: true,
      message: 'Effectivity set successfully'
    });

  } catch (error) {
    console.error('Error setting effectivity:', error);

    if (error instanceof ECOValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to set effectivity',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * GET /api/v1/eco/effectivity/version
 * Get effective version
 */
router.get('/effectivity/version', async (req: Request, res: Response): Promise<any> => {
  try {
    const { entityType, entityId } = req.query;

    const context: EffectivityContext = {
      entityType: entityType as string,
      entityId: entityId as string,
      date: req.query.date ? new Date(req.query.date as string) : undefined,
      serialNumber: req.query.serialNumber as string,
      workOrderNumber: req.query.workOrderNumber as string,
      lotBatch: req.query.lotBatch as string
    };

    const version = await effectivityService.getEffectiveVersion(
      entityType as string,
      entityId as string,
      context
    );

    res.json({
      success: true,
      data: { version }
    });

  } catch (error) {
    console.error('Error getting effective version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get effective version',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/eco/:id/transition-plan
 * Get transition plan
 */
router.get('/:id/transition-plan', async (req: Request, res: Response): Promise<any> => {
  try {
    const plan = await effectivityService.getTransitionPlan(req.params.id);

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    console.error('Error getting transition plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transition plan',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/eco/:id/validate-effectivity
 * Validate effectivity setup
 */
router.post('/:id/validate-effectivity', async (req: Request, res: Response): Promise<any> => {
  try {
    const validation = await effectivityService.validateEffectivity(req.params.id);

    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Error validating effectivity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate effectivity',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;