/**
 * MRP System REST API Routes
 * Issue #84: Material Requirements Planning (MRP) System
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import MRPService from '../services/MRPService';

const router = Router();
const prisma = new PrismaClient();
const mrpService = new MRPService(prisma);

/**
 * POST /mrp/run
 * Execute MRP for a production schedule
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    const {
      siteId,
      scheduleId,
      horizonDays,
      safetyStockLevel,
      includeScrapFactor,
      runBy,
      notes,
    } = req.body;

    const mrpRun = await mrpService.runMRP({
      siteId,
      scheduleId,
      horizonDays: horizonDays || 90,
      safetyStockLevel: safetyStockLevel || 0,
      includeScrapFactor: includeScrapFactor !== false,
      runBy,
      notes,
    });

    res.status(201).json(mrpRun);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /mrp/runs
 * List MRP runs with optional filtering
 */
router.get('/runs', async (req: Request, res: Response) => {
  try {
    const runs = await mrpService.listMRPRuns({
      siteId: req.query.siteId as string,
      status: req.query.status as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    });

    res.json(runs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /mrp/runs/:id
 * Get specific MRP run details
 */
router.get('/runs/:id', async (req: Request, res: Response) => {
  try {
    const mrpRun = await mrpService.getMRPRun(req.params.id);

    if (!mrpRun) {
      return res.status(404).json({ error: 'MRP run not found' });
    }

    res.json(mrpRun);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /mrp/runs/:id/planned-orders
 * Get all planned orders from an MRP run
 */
router.get('/runs/:id/planned-orders', async (req: Request, res: Response) => {
  try {
    const plannedOrders = await mrpService.getPlannedOrders(req.params.id);

    res.json(plannedOrders);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /mrp/planned-orders/:id/convert
 * Convert a planned order to a work order
 */
router.post('/planned-orders/:id/convert', async (req: Request, res: Response) => {
  try {
    const { priority, status, createdById, routingId, siteId } = req.body;

    if (!priority || !status || !createdById) {
      return res.status(400).json({
        error: 'Missing required fields: priority, status, createdById',
      });
    }

    const plannedOrder = await mrpService.convertPlannedOrderToWorkOrder(
      req.params.id,
      {
        priority,
        status,
        createdById,
        routingId,
        siteId,
      }
    );

    res.json({
      message: 'Planned order converted to work order',
      plannedOrder,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /mrp/runs/:id/exceptions
 * Get all exceptions from an MRP run
 */
router.get('/runs/:id/exceptions', async (req: Request, res: Response) => {
  try {
    const mrpRun = await mrpService.getMRPRun(req.params.id);

    if (!mrpRun) {
      return res.status(404).json({ error: 'MRP run not found' });
    }

    res.json(mrpRun.exceptions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /mrp/runs/:id/pegging
 * Get pegging records from an MRP run
 */
router.get('/runs/:id/pegging', async (req: Request, res: Response) => {
  try {
    const mrpRun = await mrpService.getMRPRun(req.params.id);

    if (!mrpRun) {
      return res.status(404).json({ error: 'MRP run not found' });
    }

    res.json(mrpRun.pegging);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /mrp/analytics
 * Get MRP analytics and summary statistics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const siteId = req.query.siteId as string;

    const stats = await prisma.mRPRun.aggregate({
      _count: true,
      _avg: {
        plannedOrdersCount: true,
        exceptionCount: true,
      },
      where: siteId ? { siteId } : undefined,
    });

    const recentRuns = await mrpService.listMRPRuns({
      siteId,
      limit: 10,
    });

    const statusCounts = await prisma.mRPRun.groupBy({
      by: ['status'],
      _count: true,
      where: siteId ? { siteId } : undefined,
    });

    res.json({
      totalRuns: stats._count,
      averagePlannedOrders: stats._avg.plannedOrdersCount || 0,
      averageExceptions: stats._avg.exceptionCount || 0,
      recentRuns,
      statusCounts: Object.fromEntries(
        statusCounts.map(sc => [sc.status, sc._count])
      ),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
