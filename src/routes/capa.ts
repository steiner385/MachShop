/**
 * CAPA (Corrective & Preventive Action) API Routes
 * Issue #56: CAPA Tracking System
 *
 * REST API endpoints for managing CAPAs lifecycle
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import CapaService from '../services/CapaService';
import { Logger } from '../services/LoggerService';
import { authenticate, authorize } from '../middleware/auth';

const router: Router = express.Router();

// Middleware setup
const prisma = new PrismaClient();
const logger = new Logger('CapaRoutes');
const capaService = new CapaService(prisma, logger);

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/capa
 * Create a new CAPA from an NCR
 */
router.post('/capa', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ncrId, title, description, riskLevel, plannedDueDate, ...rest } = req.body;
    const userId = (req as any).user.id;

    // Validate required fields
    if (!ncrId || !title || !description || !riskLevel || !plannedDueDate) {
      return res.status(400).json({
        error: 'Missing required fields: ncrId, title, description, riskLevel, plannedDueDate',
      });
    }

    const capa = await capaService.createCapaFromNCR(ncrId, {
      ncrId,
      title,
      description,
      riskLevel,
      plannedDueDate: new Date(plannedDueDate),
      ...rest,
    }, userId);

    res.status(201).json({
      success: true,
      data: capa,
      message: 'CAPA created successfully',
    });
  } catch (error) {
    logger.error('POST /capa error', { error });
    next(error);
  }
});

/**
 * GET /api/capa/:capaId
 * Get CAPA details by ID
 */
router.get('/capa/:capaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { capaId } = req.params;

    const capa = await capaService.getCapaById(capaId);
    res.json({
      success: true,
      data: capa,
    });
  } catch (error) {
    if ((error as any).message.includes('not found')) {
      return res.status(404).json({ error: (error as any).message });
    }
    logger.error('GET /capa/:capaId error', { error });
    next(error);
  }
});

/**
 * GET /api/capa/site/:siteId
 * List CAPAs for a site with filtering and pagination
 */
router.get('/site/:siteId/capas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { siteId } = req.params;
    const { status, riskLevel, ownerId, overdue, page, limit } = req.query;

    const filters = {
      status: status as string,
      riskLevel: riskLevel as string,
      ownerId: ownerId as string,
      overdue: overdue === 'true',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    };

    const result = await capaService.getCapasForSite(siteId, filters);

    res.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    });
  } catch (error) {
    logger.error('GET /site/:siteId/capas error', { error });
    next(error);
  }
});

/**
 * GET /api/ncr/:ncrId/capas
 * Get CAPAs related to an NCR
 */
router.get('/ncr/:ncrId/capas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ncrId } = req.params;

    const capas = await capaService.getCapasForNCR(ncrId);

    res.json({
      success: true,
      data: capas,
    });
  } catch (error) {
    logger.error('GET /ncr/:ncrId/capas error', { error });
    next(error);
  }
});

/**
 * PUT /api/capa/:capaId
 * Update CAPA details
 */
router.put('/capa/:capaId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { capaId } = req.params;
    const userId = (req as any).user.id;

    const updated = await capaService.updateCapa(capaId, req.body, userId);

    res.json({
      success: true,
      data: updated,
      message: 'CAPA updated successfully',
    });
  } catch (error) {
    logger.error('PUT /capa/:capaId error', { error });
    next(error);
  }
});

/**
 * POST /api/capa/:capaId/transition
 * Transition CAPA to a new status
 */
router.post(
  '/capa/:capaId/transition',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { capaId } = req.params;
      const { toStatus, reason } = req.body;
      const userId = (req as any).user.id;

      if (!toStatus) {
        return res.status(400).json({
          error: 'Missing required field: toStatus',
        });
      }

      const updated = await capaService.transitionCapaStatus(
        capaId,
        toStatus,
        userId,
        reason
      );

      res.json({
        success: true,
        data: updated,
        message: `CAPA transitioned to ${toStatus}`,
      });
    } catch (error) {
      if ((error as any).message.includes('Invalid transition')) {
        return res.status(400).json({ error: (error as any).message });
      }
      logger.error('POST /capa/:capaId/transition error', { error });
      next(error);
    }
  }
);

/**
 * POST /api/capa/:capaId/actions
 * Add an action to a CAPA
 */
router.post(
  '/capa/:capaId/actions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { capaId } = req.params;
      const userId = (req as any).user.id;
      const {
        actionType,
        description,
        ownerId,
        plannedDueDate,
        estimatedCost,
        estimatedEffort,
        dependsOnActionId,
        requiresApproval,
      } = req.body;

      if (!actionType || !description || !ownerId || !plannedDueDate) {
        return res.status(400).json({
          error: 'Missing required fields: actionType, description, ownerId, plannedDueDate',
        });
      }

      const action = await capaService.addCapaAction(
        {
          capaId,
          actionType,
          description,
          ownerId,
          plannedDueDate: new Date(plannedDueDate),
          estimatedCost,
          estimatedEffort,
          dependsOnActionId,
          requiresApproval,
        },
        userId
      );

      res.status(201).json({
        success: true,
        data: action,
        message: 'Action added successfully',
      });
    } catch (error) {
      logger.error('POST /capa/:capaId/actions error', { error });
      next(error);
    }
  }
);

/**
 * PUT /api/capa/actions/:actionId
 * Update a CAPA action
 */
router.put(
  '/actions/:actionId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { actionId } = req.params;
      const userId = (req as any).user.id;

      const updated = await capaService.updateCapaAction(actionId, req.body, userId);

      res.json({
        success: true,
        data: updated,
        message: 'Action updated successfully',
      });
    } catch (error) {
      logger.error('PUT /actions/:actionId error', { error });
      next(error);
    }
  }
);

/**
 * POST /api/capa/:capaId/verify
 * Record an effectiveness verification
 */
router.post(
  '/capa/:capaId/verify',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { capaId } = req.params;
      const userId = (req as any).user.id;
      const {
        verificationDate,
        verificationMethod,
        sampleSize,
        result,
        metrics,
        evidence,
        rootCauseOfFailure,
        recommendedActions,
      } = req.body;

      if (!verificationDate || !verificationMethod || !result) {
        return res.status(400).json({
          error: 'Missing required fields: verificationDate, verificationMethod, result',
        });
      }

      const verification = await capaService.createVerification({
        capaId,
        verificationDate: new Date(verificationDate),
        verificationMethod,
        sampleSize,
        result,
        metrics,
        evidence,
        verifiedBy: userId,
        rootCauseOfFailure,
        recommendedActions,
      });

      res.status(201).json({
        success: true,
        data: verification,
        message: 'Verification recorded successfully',
      });
    } catch (error) {
      logger.error('POST /capa/:capaId/verify error', { error });
      next(error);
    }
  }
);

/**
 * GET /api/capa/metrics/dashboard
 * Get CAPA metrics for dashboard
 */
router.get(
  '/metrics/dashboard',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { siteId, startDate, endDate } = req.query;

      if (!siteId) {
        return res.status(400).json({
          error: 'Missing required parameter: siteId',
        });
      }

      const dateRange =
        startDate && endDate
          ? {
              startDate: new Date(startDate as string),
              endDate: new Date(endDate as string),
            }
          : undefined;

      const metrics = await capaService.getCapaMetrics(siteId as string, dateRange);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('GET /metrics/dashboard error', { error });
      next(error);
    }
  }
);

/**
 * GET /api/capa/actions/overdue
 * Get overdue actions for a site
 */
router.get(
  '/site/:siteId/actions/overdue',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { siteId } = req.params;

      const overdueActions = await capaService.getOverdueActions(siteId);

      res.json({
        success: true,
        data: overdueActions,
        count: overdueActions.length,
      });
    } catch (error) {
      logger.error('GET /site/:siteId/actions/overdue error', { error });
      next(error);
    }
  }
);

/**
 * Error handling middleware for CAPA routes
 */
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('CAPA route error', { error, path: req.path });

  if (error instanceof Error) {
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
  });
});

export default router;
