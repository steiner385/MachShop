import express from 'express';
import { z } from 'zod';
import prisma from '../lib/database';
import {
  requireDashboardAccess,
  requireSiteAccess
} from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schema for query parameters
const querySchema = z.object({
  siteId: z.string().uuid().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
});

/**
 * @route GET /api/v1/dashboard/kpis
 * @desc Get dashboard KPI metrics
 * @access Private
 */
router.get('/kpis',
  requireDashboardAccess,
  requireSiteAccess,
  asyncHandler(async (req, res) => {
    const { siteId } = req.query;

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    // Get active work orders count
    const activeWorkOrders = await prisma.workOrder.count({
      where: {
        status: { in: ['RELEASED', 'IN_PROGRESS'] },
        ...(siteId && { siteId: siteId as string })
      }
    });

    // Get active work orders from yesterday for change calculation
    const activeWorkOrdersYesterday = await prisma.workOrder.count({
      where: {
        status: { in: ['RELEASED', 'IN_PROGRESS'] },
        createdAt: { lt: startOfToday },
        ...(siteId && { siteId: siteId as string })
      }
    });

    const workOrdersChange = activeWorkOrdersYesterday > 0
      ? ((activeWorkOrders - activeWorkOrdersYesterday) / activeWorkOrdersYesterday) * 100
      : 0;

    // Get completed today count
    const completedToday = await prisma.workOrder.count({
      where: {
        status: 'COMPLETED',
        actualEndDate: { gte: startOfToday },
        ...(siteId && { siteId: siteId as string })
      }
    });

    // Get completed yesterday for change calculation
    const completedYesterday = await prisma.workOrder.count({
      where: {
        status: 'COMPLETED',
        actualEndDate: {
          gte: startOfYesterday,
          lt: startOfToday
        },
        ...(siteId && { siteId: siteId as string })
      }
    });

    const completedChange = completedYesterday > 0
      ? ((completedToday - completedYesterday) / completedYesterday) * 100
      : 0;

    // Get quality yield (passed inspections / total inspections)
    const totalInspections = await prisma.qualityInspection.count({
      where: {
        completedAt: { not: null },
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const passedInspections = await prisma.qualityInspection.count({
      where: {
        result: 'PASS',
        completedAt: { not: null },
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const qualityYield = totalInspections > 0
      ? (passedInspections / totalInspections) * 100
      : 0;

    // Calculate quality yield from last week for trend
    const oneWeekAgo = new Date(startOfToday);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const totalInspectionsLastWeek = await prisma.qualityInspection.count({
      where: {
        completedAt: {
          gte: oneWeekAgo,
          lt: startOfToday
        },
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const passedInspectionsLastWeek = await prisma.qualityInspection.count({
      where: {
        result: 'PASS',
        completedAt: {
          gte: oneWeekAgo,
          lt: startOfToday
        },
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const qualityYieldLastWeek = totalInspectionsLastWeek > 0
      ? (passedInspectionsLastWeek / totalInspectionsLastWeek) * 100
      : 0;

    const yieldChange = qualityYieldLastWeek > 0
      ? qualityYield - qualityYieldLastWeek
      : 0;

    // Get equipment utilization (average of all operational equipment)
    const equipmentStats = await prisma.equipment.aggregate({
      _avg: {
        utilizationRate: true
      },
      where: {
        status: 'OPERATIONAL',
        ...(siteId && { siteId: siteId as string })
      }
    });

    const equipmentUtilization = equipmentStats._avg.utilizationRate || 0;

    // Get last week's utilization for trend
    // Note: This is simplified - in a real system, you'd track historical utilization
    const equipmentStatsLastWeek = await prisma.equipment.aggregate({
      _avg: {
        utilizationRate: true
      },
      where: {
        status: { in: ['OPERATIONAL', 'MAINTENANCE'] },
        ...(siteId && { siteId: siteId as string })
      }
    });

    const equipmentUtilizationLastWeek = equipmentStatsLastWeek._avg.utilizationRate || 0;
    const utilizationChange = equipmentUtilizationLastWeek > 0
      ? equipmentUtilization - equipmentUtilizationLastWeek
      : 0;

    const kpis = {
      activeWorkOrders,
      workOrdersChange: Number(workOrdersChange.toFixed(1)),
      completedToday,
      completedChange: Number(completedChange.toFixed(1)),
      qualityYield: Number(qualityYield.toFixed(1)),
      yieldChange: Number(yieldChange.toFixed(1)),
      equipmentUtilization: Number(equipmentUtilization.toFixed(1)),
      utilizationChange: Number(utilizationChange.toFixed(1))
    };

    logger.info('Dashboard KPIs retrieved', {
      userId: req.user?.id,
      siteId,
      kpis
    });

    return res.status(200).json(kpis);
  })
);

/**
 * @route GET /api/v1/dashboard/recent-work-orders
 * @desc Get recent work orders for dashboard
 * @access Private
 */
router.get('/recent-work-orders',
  requireDashboardAccess,
  requireSiteAccess,
  asyncHandler(async (req, res) => {
    const validationResult = querySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }

    const { siteId, limit = 5 } = validationResult.data;

    const workOrders = await prisma.workOrder.findMany({
      where: {
        status: { in: ['RELEASED', 'IN_PROGRESS'] },
        ...(siteId && { siteId })
      },
      include: {
        part: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    const recentWorkOrders = workOrders.map(wo => ({
      id: wo.id,
      workOrderNumber: wo.workOrderNumber,
      partNumber: wo.partNumber,
      status: wo.status,
      progress: wo.quantityCompleted && wo.quantity
        ? (wo.quantityCompleted / wo.quantity) * 100
        : 0,
      priority: wo.priority,
      dueDate: wo.dueDate?.toISOString() || ''
    }));

    logger.info('Recent work orders retrieved', {
      userId: req.user?.id,
      siteId,
      count: recentWorkOrders.length
    });

    return res.status(200).json(recentWorkOrders);
  })
);

/**
 * @route GET /api/v1/dashboard/alerts
 * @desc Get recent alerts and notifications for dashboard
 * @access Private
 */
router.get('/alerts',
  requireDashboardAccess,
  requireSiteAccess,
  asyncHandler(async (req, res) => {
    const validationResult = querySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }

    const { siteId, limit = 5 } = validationResult.data;
    const alerts = [];

    // Get overdue work orders
    const overdueWorkOrders = await prisma.workOrder.findMany({
      where: {
        status: { in: ['RELEASED', 'IN_PROGRESS'] },
        dueDate: { lt: new Date() },
        ...(siteId && { siteId })
      },
      take: 2,
      orderBy: {
        dueDate: 'asc'
      }
    });

    for (const wo of overdueWorkOrders) {
      alerts.push({
        id: `wo-overdue-${wo.id}`,
        type: 'error' as const,
        title: 'Work Order Overdue',
        description: `Work Order ${wo.workOrderNumber} is past due date`,
        time: wo.dueDate?.toISOString() || '',
        relatedId: wo.id,
        relatedType: 'work_order' as const
      });
    }

    // Get equipment in maintenance
    const maintenanceEquipment = await prisma.equipment.findMany({
      where: {
        status: 'MAINTENANCE',
        ...(siteId && { siteId })
      },
      take: 2,
      orderBy: {
        updatedAt: 'desc'
      }
    });

    for (const eq of maintenanceEquipment) {
      alerts.push({
        id: `eq-maintenance-${eq.id}`,
        type: 'warning' as const,
        title: 'Equipment Maintenance',
        description: `${eq.name} is currently under maintenance`,
        time: eq.updatedAt.toISOString(),
        relatedId: eq.id,
        relatedType: 'equipment' as const
      });
    }

    // Get open NCRs
    const openNCRs = await prisma.nCR.findMany({
      where: {
        status: { in: ['OPEN', 'IN_REVIEW'] },
        ...(siteId && {
          workOrder: { siteId }
        })
      },
      take: 2,
      orderBy: {
        createdAt: 'desc'
      }
    });

    for (const ncr of openNCRs) {
      alerts.push({
        id: `ncr-open-${ncr.id}`,
        type: ncr.severity === 'CRITICAL' ? 'error' as const : 'warning' as const,
        title: 'Open NCR',
        description: `NCR ${ncr.ncrNumber}: ${ncr.description.substring(0, 50)}...`,
        time: ncr.createdAt.toISOString(),
        relatedId: ncr.id,
        relatedType: 'quality' as const
      });
    }

    // Sort by time descending and limit
    const sortedAlerts = alerts
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);

    logger.info('Dashboard alerts retrieved', {
      userId: req.user?.id,
      siteId,
      count: sortedAlerts.length
    });

    return res.status(200).json(sortedAlerts);
  })
);

/**
 * @route GET /api/v1/dashboard/efficiency
 * @desc Get production efficiency metrics
 * @access Private
 */
router.get('/efficiency',
  requireDashboardAccess,
  requireSiteAccess,
  asyncHandler(async (req, res) => {
    const { siteId } = req.query;

    // Calculate OEE (Overall Equipment Effectiveness)
    // OEE = Availability × Performance × Quality
    const equipmentStats = await prisma.equipment.aggregate({
      _avg: {
        utilizationRate: true
      },
      where: {
        status: 'OPERATIONAL',
        ...(siteId && { siteId: siteId as string })
      }
    });

    const availability = equipmentStats._avg.utilizationRate || 0;

    // Calculate FPY (First Pass Yield) - percentage of inspections passed on first attempt
    const totalInspections = await prisma.qualityInspection.count({
      where: {
        completedAt: { not: null },
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const passedInspections = await prisma.qualityInspection.count({
      where: {
        result: 'PASS',
        completedAt: { not: null },
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const fpy = totalInspections > 0
      ? (passedInspections / totalInspections) * 100
      : 0;

    // Calculate On-Time Delivery
    const completedWorkOrders = await prisma.workOrder.count({
      where: {
        status: 'COMPLETED',
        actualEndDate: { not: null },
        ...(siteId && { siteId: siteId as string })
      }
    });

    const onTimeWorkOrders = await prisma.workOrder.count({
      where: {
        status: 'COMPLETED',
        actualEndDate: { not: null, lte: prisma.workOrder.fields.dueDate },
        ...(siteId && { siteId: siteId as string })
      }
    });

    const onTimeDelivery = completedWorkOrders > 0
      ? (onTimeWorkOrders / completedWorkOrders) * 100
      : 0;

    // Simplified OEE calculation (would need more detailed tracking in production)
    const performance = 95.0; // Placeholder - would calculate from actual cycle times
    const quality = fpy / 100;
    const oee = (availability / 100) * (performance / 100) * quality * 100;

    const metrics = {
      oee: Number(oee.toFixed(1)),
      fpy: Number(fpy.toFixed(1)),
      onTimeDelivery: Number(onTimeDelivery.toFixed(1))
    };

    logger.info('Dashboard efficiency metrics retrieved', {
      userId: req.user?.id,
      siteId,
      metrics
    });

    return res.status(200).json(metrics);
  })
);

/**
 * @route GET /api/v1/dashboard/quality-trends
 * @desc Get quality trend statistics
 * @access Private
 */
router.get('/quality-trends',
  requireDashboardAccess,
  requireSiteAccess,
  asyncHandler(async (req, res) => {
    const { siteId } = req.query;

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Calculate defect rate (failed inspections / total inspections)
    const recentInspections = await prisma.qualityInspection.count({
      where: {
        completedAt: { gte: thirtyDaysAgo },
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const recentFailedInspections = await prisma.qualityInspection.count({
      where: {
        completedAt: { gte: thirtyDaysAgo },
        result: 'FAIL',
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const defectRate = recentInspections > 0
      ? (recentFailedInspections / recentInspections) * 100
      : 0;

    // Calculate previous period for trend
    const previousInspections = await prisma.qualityInspection.count({
      where: {
        completedAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo
        },
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const previousFailedInspections = await prisma.qualityInspection.count({
      where: {
        completedAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo
        },
        result: 'FAIL',
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const previousDefectRate = previousInspections > 0
      ? (previousFailedInspections / previousInspections) * 100
      : 0;

    const defectRateTrend = defectRate - previousDefectRate;

    // NCR rate (NCRs / completed work orders)
    const recentWorkOrders = await prisma.workOrder.count({
      where: {
        status: 'COMPLETED',
        actualEndDate: { gte: thirtyDaysAgo },
        ...(siteId && { siteId: siteId as string })
      }
    });

    const recentNCRs = await prisma.nCR.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const ncrRate = recentWorkOrders > 0
      ? (recentNCRs / recentWorkOrders) * 100
      : 0;

    // Previous period NCR rate
    const previousWorkOrders = await prisma.workOrder.count({
      where: {
        status: 'COMPLETED',
        actualEndDate: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo
        },
        ...(siteId && { siteId: siteId as string })
      }
    });

    const previousNCRs = await prisma.nCR.count({
      where: {
        createdAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo
        },
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const previousNcrRate = previousWorkOrders > 0
      ? (previousNCRs / previousWorkOrders) * 100
      : 0;

    const ncrRateTrend = ncrRate - previousNcrRate;

    // Complaint rate (placeholder - would need customer complaints tracking)
    // For now, use a simplified calculation based on critical NCRs
    const criticalNCRs = await prisma.nCR.count({
      where: {
        severity: 'CRITICAL',
        createdAt: { gte: thirtyDaysAgo },
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const complaintRate = recentWorkOrders > 0
      ? (criticalNCRs / recentWorkOrders) * 100
      : 0;

    const previousCriticalNCRs = await prisma.nCR.count({
      where: {
        severity: 'CRITICAL',
        createdAt: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo
        },
        ...(siteId && {
          workOrder: { siteId: siteId as string }
        })
      }
    });

    const previousComplaintRate = previousWorkOrders > 0
      ? (previousCriticalNCRs / previousWorkOrders) * 100
      : 0;

    const complaintRateTrend = complaintRate - previousComplaintRate;

    const trends = {
      defectRate: Number(defectRate.toFixed(2)),
      defectRateTrend: Number(defectRateTrend.toFixed(2)),
      complaintRate: Number(complaintRate.toFixed(2)),
      complaintRateTrend: Number(complaintRateTrend.toFixed(2)),
      ncrRate: Number(ncrRate.toFixed(2)),
      ncrRateTrend: Number(ncrRateTrend.toFixed(2))
    };

    logger.info('Dashboard quality trends retrieved', {
      userId: req.user?.id,
      siteId,
      trends
    });

    return res.status(200).json(trends);
  })
);

export default router;
