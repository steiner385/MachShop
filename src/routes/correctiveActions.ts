/**
 * Corrective Action API Routes - Issue #56 Phase 1
 *
 * Provides REST endpoints for CAPA (Corrective & Preventive Action) tracking with:
 * - Full lifecycle management (planning through verification)
 * - Owner assignment and notifications
 * - Effectiveness verification and replanning
 * - Integration with NCR workflows
 *
 * Endpoints:
 * GET /api/v2/corrective-actions - List corrective actions
 * GET /api/v2/corrective-actions/:id - Get corrective action details
 * POST /api/v2/corrective-actions - Create new corrective action
 * PUT /api/v2/corrective-actions/:id - Update corrective action
 * POST /api/v2/corrective-actions/:id/mark-in-progress - Mark as in progress
 * POST /api/v2/corrective-actions/:id/mark-implemented - Mark as implemented
 * POST /api/v2/corrective-actions/:id/verify - Verify effectiveness
 * POST /api/v2/corrective-actions/:id/cancel - Cancel action
 * GET /api/v2/corrective-actions/my-actions - Get actions assigned to current user
 * GET /api/v2/corrective-actions/overdue - Get overdue actions
 * GET /api/v2/corrective-actions/statistics - Get CAPA statistics
 */

import express from 'express';
import type { Request, Response } from 'express';
import type { QMSCASource, QMSRCAMethod } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { correctiveActionService } from '../services/CorrectiveActionService';

const router = express.Router();

/**
 * Get CAPA dashboard metrics
 * GET /api/v2/corrective-actions/dashboard/metrics
 */
router.get('/dashboard/metrics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const metrics = await correctiveActionService.getDashboardMetrics();

    return res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to fetch dashboard metrics', { error });
    return res.status(500).json({
      error: 'METRICS_FAILED',
      message: 'Failed to retrieve dashboard metrics',
    });
  }
});

/**
 * List corrective actions with filtering
 * GET /api/v2/corrective-actions
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, assignedToId, source, limit, offset } = req.query;

    const result = await correctiveActionService.listCorrectiveActions({
      status: status as any,
      assignedToId: assignedToId as string,
      source: source as QMSCASource,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    return res.json({
      success: true,
      data: result.actions,
      pagination: {
        total: result.total,
        limit: Math.min(parseInt((limit as string) || '50'), 100),
        offset: parseInt((offset as string) || '0'),
      },
    });
  } catch (error) {
    logger.error('Failed to list corrective actions', { error });
    return res.status(500).json({
      error: 'FETCH_FAILED',
      message: 'Failed to retrieve corrective actions',
    });
  }
});

/**
 * Get corrective actions assigned to current user
 * GET /api/v2/corrective-actions/my-actions
 */
router.get('/my-actions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const { status } = req.query;
    const actions = await correctiveActionService.getMyCorrectiveActions(
      userId,
      status as any
    );

    return res.json({
      success: true,
      data: actions,
      count: actions.length,
    });
  } catch (error) {
    logger.error('Failed to fetch my corrective actions', { error });
    return res.status(500).json({
      error: 'FETCH_FAILED',
      message: 'Failed to retrieve your corrective actions',
    });
  }
});

/**
 * Get overdue corrective actions
 * GET /api/v2/corrective-actions/overdue
 */
router.get('/overdue', authMiddleware, async (req: Request, res: Response) => {
  try {
    const overdueActions = await correctiveActionService.getOverdueActions();

    return res.json({
      success: true,
      data: overdueActions,
      count: overdueActions.length,
    });
  } catch (error) {
    logger.error('Failed to fetch overdue corrective actions', { error });
    return res.status(500).json({
      error: 'FETCH_FAILED',
      message: 'Failed to retrieve overdue corrective actions',
    });
  }
});

/**
 * Get corrective action statistics
 * GET /api/v2/corrective-actions/statistics
 */
router.get('/statistics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await correctiveActionService.getStatistics();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to fetch corrective action statistics', { error });
    return res.status(500).json({
      error: 'STATS_FAILED',
      message: 'Failed to retrieve statistics',
    });
  }
});

/**
 * Get audit trail for a corrective action
 * GET /api/v2/corrective-actions/:id/audit-trail
 */
router.get('/:id/audit-trail', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const auditTrail = await correctiveActionService.getAuditTrail(id);

    return res.json({
      success: true,
      data: auditTrail,
      count: auditTrail.length,
    });
  } catch (error) {
    logger.error('Failed to fetch audit trail', { error });
    return res.status(500).json({
      error: 'FETCH_FAILED',
      message: 'Failed to retrieve audit trail',
    });
  }
});

/**
 * Get corrective action by ID
 * GET /api/v2/corrective-actions/:id
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const action = await correctiveActionService.getCorrectiveAction(id);

    if (!action) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Corrective action not found',
      });
    }

    return res.json({
      success: true,
      data: action,
    });
  } catch (error) {
    logger.error('Failed to fetch corrective action', { error });
    return res.status(500).json({
      error: 'FETCH_FAILED',
      message: 'Failed to retrieve corrective action',
    });
  }
});

/**
 * Create corrective action
 * POST /api/v2/corrective-actions
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const {
      title,
      description,
      source,
      sourceReference,
      assignedToId,
      targetDate,
      rootCauseMethod,
      rootCause,
      correctiveAction,
      preventiveAction,
      estimatedCost,
      verificationMethod,
    } = req.body;

    // Validation
    if (!title || !description || !source || !assignedToId || !targetDate) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Missing required fields: title, description, source, assignedToId, targetDate',
      });
    }

    if (!correctiveAction && !preventiveAction) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'At least one of correctiveAction or preventiveAction is required',
      });
    }

    const action = await correctiveActionService.createCorrectiveAction({
      title,
      description,
      source: source as QMSCASource,
      sourceReference,
      assignedToId,
      targetDate: new Date(targetDate),
      rootCauseMethod: rootCauseMethod as QMSRCAMethod,
      rootCause,
      correctiveAction,
      preventiveAction,
      createdById: userId,
      estimatedCost,
      verificationMethod,
    });

    logger.info('Corrective action created', {
      caId: action.id,
      caNumber: action.caNumber,
    });

    return res.status(201).json({
      success: true,
      data: action,
      message: 'Corrective action created successfully',
    });
  } catch (error) {
    logger.error('Failed to create corrective action', { error });
    return res.status(500).json({
      error: 'CREATE_FAILED',
      message: 'Failed to create corrective action',
    });
  }
});

/**
 * Update corrective action
 * PUT /api/v2/corrective-actions/:id
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, correctiveAction, preventiveAction, targetDate, rootCause, rootCauseMethod } = req.body;

    const action = await correctiveActionService.updateCorrectiveAction(id, {
      title,
      description,
      correctiveAction,
      preventiveAction,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      rootCause,
      rootCauseMethod: rootCauseMethod as QMSRCAMethod,
    });

    logger.info('Corrective action updated', { caId: id });

    return res.json({
      success: true,
      data: action,
      message: 'Corrective action updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update corrective action', { error });
    return res.status(500).json({
      error: 'UPDATE_FAILED',
      message: 'Failed to update corrective action',
    });
  }
});

/**
 * Mark corrective action as in progress
 * POST /api/v2/corrective-actions/:id/mark-in-progress
 */
router.post('/:id/mark-in-progress', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const action = await correctiveActionService.markInProgress(id, userId);

    logger.info('Corrective action marked in progress', { caId: id, userId });

    return res.json({
      success: true,
      data: action,
      message: 'Corrective action marked as in progress',
    });
  } catch (error) {
    logger.error('Failed to mark corrective action in progress', { error });
    return res.status(500).json({
      error: 'UPDATE_FAILED',
      message: 'Failed to update corrective action status',
    });
  }
});

/**
 * Mark corrective action as implemented
 * POST /api/v2/corrective-actions/:id/mark-implemented
 */
router.post('/:id/mark-implemented', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { implementedDate } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const action = await correctiveActionService.markImplemented(
      id,
      userId,
      implementedDate ? new Date(implementedDate) : undefined
    );

    logger.info('Corrective action marked implemented', { caId: id, userId });

    return res.json({
      success: true,
      data: action,
      message: 'Corrective action marked as implemented',
    });
  } catch (error) {
    logger.error('Failed to mark corrective action implemented', { error });
    return res.status(500).json({
      error: 'UPDATE_FAILED',
      message: 'Failed to update corrective action status',
    });
  }
});

/**
 * Verify effectiveness of corrective action
 * POST /api/v2/corrective-actions/:id/verify
 */
router.post('/:id/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { isEffective, verificationMethod, notes, verifiedAt } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    if (isEffective === undefined) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'isEffective is required',
      });
    }

    const action = await correctiveActionService.verifyEffectiveness(id, {
      verifiedById: userId,
      isEffective,
      verificationMethod,
      verifiedAt: new Date(),
      notes,
    });

    logger.info('Corrective action verified', {
      caId: id,
      isEffective,
      verifiedById: userId,
    });

    return res.json({
      success: true,
      data: action,
      message: `Corrective action verified as ${isEffective ? 'effective' : 'ineffective'}`,
    });
  } catch (error) {
    logger.error('Failed to verify corrective action', { error });
    return res.status(500).json({
      error: 'VERIFICATION_FAILED',
      message: 'Failed to verify corrective action effectiveness',
    });
  }
});

/**
 * Approve root cause analysis
 * POST /api/v2/corrective-actions/:id/approve-rca
 */
router.post('/:id/approve-rca', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { approved, notes } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    if (approved === undefined) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'approved field is required',
      });
    }

    const action = await correctiveActionService.approveRCA(id, userId, approved, notes);

    logger.info('RCA approved', {
      caId: id,
      userId,
      approved,
    });

    return res.json({
      success: true,
      data: action,
      message: `RCA ${approved ? 'approved' : 'rejected'}`,
    });
  } catch (error) {
    logger.error('Failed to approve RCA', { error });
    return res.status(500).json({
      error: 'APPROVAL_FAILED',
      message: 'Failed to approve root cause analysis',
    });
  }
});

/**
 * Cancel corrective action
 * POST /api/v2/corrective-actions/:id/cancel
 */
router.post('/:id/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const action = await correctiveActionService.cancel(id, userId, reason);

    logger.info('Corrective action cancelled', { caId: id, userId, reason });

    return res.json({
      success: true,
      data: action,
      message: 'Corrective action cancelled successfully',
    });
  } catch (error) {
    logger.error('Failed to cancel corrective action', { error });
    return res.status(500).json({
      error: 'CANCEL_FAILED',
      message: 'Failed to cancel corrective action',
    });
  }
});

export default router;
