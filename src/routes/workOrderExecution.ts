/**
 * Work Order Execution Routes (ISA-95 Production Dispatching & Execution - Task 1.7)
 *
 * REST API endpoints for shop floor execution including:
 * - Work order dispatching (releasing to shop floor)
 * - Real-time status tracking with state machine validation
 * - Work performance actuals capture (labor, material, equipment, quality, downtime)
 * - Automatic variance calculation and analysis
 * - Real-time execution dashboard
 */

import express, { Request, Response } from 'express';
import WorkOrderExecutionService from '../services/WorkOrderExecutionService';

const router = express.Router();

// ======================
// DISPATCHING OPERATIONS
// ======================

/**
 * POST /api/v1/work-order-execution/dispatch
 * Dispatch a single work order to the shop floor (CREATED → RELEASED)
 */
router.post('/dispatch', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      workOrderId,
      dispatchedBy,
      dispatchedFrom,
      assignedToId,
      workCenterId,
      priorityOverride,
      expectedStartDate,
      expectedEndDate,
      materialReserved,
      toolingReserved,
      dispatchNotes,
      metadata
    } = req.body;

    if (!workOrderId || !dispatchedBy) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'workOrderId and dispatchedBy are required',
        details: {
          workOrderId: !workOrderId ? 'Required field' : undefined,
          dispatchedBy: !dispatchedBy ? 'Required field' : undefined
        }
      });
    }

    const result = await WorkOrderExecutionService.dispatchWorkOrder({
      workOrderId,
      dispatchedBy,
      dispatchedFrom,
      assignedToId,
      workCenterId,
      priorityOverride,
      expectedStartDate: expectedStartDate ? new Date(expectedStartDate) : undefined,
      expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : undefined,
      materialReserved,
      toolingReserved,
      dispatchNotes,
      metadata
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error dispatching work order:', error);

    // ✅ GITHUB ISSUE #11 FIX: Enhanced error handling for dispatch operations
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'NotFound',
        message: error.message,
        context: 'Work order dispatch requires an existing work order',
        suggestion: 'Verify the work order ID and ensure it exists in the system'
      });
    }

    if (error.message.includes('cannot be dispatched')) {
      return res.status(400).json({
        error: 'InvalidStatus',
        message: error.message,
        context: 'Work order dispatch validation failed',
        suggestion: 'Only work orders in CREATED status can be dispatched to the shop floor'
      });
    }

    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

/**
 * GET /api/v1/work-order-execution/dispatch/ready
 * Get work orders ready for dispatch (CREATED status)
 */
router.get('/dispatch/ready', async (req: Request, res: Response): Promise<any> => {
  try {
    const { siteId } = req.query;

    const workOrders = await WorkOrderExecutionService.getWorkOrdersReadyForDispatch(
      siteId as string | undefined
    );

    res.json(workOrders);
  } catch (error: any) {
    console.error('Error fetching work orders ready for dispatch:', error);
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

/**
 * POST /api/v1/work-order-execution/dispatch/bulk
 * Bulk dispatch multiple work orders
 */
router.post('/dispatch/bulk', async (req: Request, res: Response): Promise<any> => {
  try {
    const { workOrderIds, dispatchedBy, dispatchedFrom, workCenterId } = req.body;

    if (!workOrderIds || !Array.isArray(workOrderIds) || workOrderIds.length === 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'workOrderIds must be a non-empty array'
      });
    }

    if (!dispatchedBy) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'dispatchedBy is required'
      });
    }

    const results = [];
    const errors = [];

    for (const workOrderId of workOrderIds) {
      try {
        const result = await WorkOrderExecutionService.dispatchWorkOrder({
          workOrderId,
          dispatchedBy,
          dispatchedFrom,
          workCenterId
        });
        results.push(result);
      } catch (error: any) {
        errors.push({ workOrderId, error: error.message });
      }
    }

    res.status(207).json({
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error: any) {
    console.error('Error in bulk dispatch:', error);
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

// ======================
// STATUS MANAGEMENT OPERATIONS
// ======================

/**
 * POST /api/v1/work-order-execution/:id/status
 * Transition work order to a new status
 */
router.post('/:id/status', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { newStatus, reason, changedBy, notes } = req.body;

    if (!newStatus || !changedBy) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'newStatus and changedBy are required',
        details: {
          newStatus: !newStatus ? 'Required field' : undefined,
          changedBy: !changedBy ? 'Required field' : undefined
        }
      });
    }

    const validStatuses = ['CREATED', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: `Invalid status. Valid values: ${validStatuses.join(', ')}`
      });
    }

    const result = await WorkOrderExecutionService.transitionWorkOrderStatus({
      workOrderId: id,
      newStatus,
      reason,
      changedBy,
      notes
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error transitioning work order status:', error);

    // ✅ GITHUB ISSUE #11 FIX: Enhanced error handling for status transitions
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'NotFound',
        message: error.message,
        context: 'Status transition requires an existing work order',
        suggestion: 'Verify the work order ID and ensure it exists in the system'
      });
    }

    if (error.message.includes('Invalid status transition')) {
      return res.status(400).json({
        error: 'InvalidTransition',
        message: error.message,
        context: 'Work order status transition validation failed',
        suggestion: 'Follow ISA-95 standard workflow patterns. Use valid intermediate states if needed (e.g., current status → ON_HOLD → target status)'
      });
    }

    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

/**
 * GET /api/v1/work-order-execution/:id/status/history
 * Get status history for a work order
 */
router.get('/:id/status/history', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const history = await WorkOrderExecutionService.getWorkOrderStatusHistory(id);

    res.json(history);
  } catch (error: any) {
    console.error('Error fetching status history:', error);
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

/**
 * GET /api/v1/work-order-execution/status/:status
 * Get work orders by status
 */
router.get('/status/:status', async (req: Request, res: Response): Promise<any> => {
  try {
    const { status } = req.params;
    const { siteId } = req.query;

    const validStatuses = ['CREATED', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: `Invalid status. Valid values: ${validStatuses.join(', ')}`
      });
    }

    const workOrders = await WorkOrderExecutionService.getWorkOrdersByStatus(
      status as any,
      siteId as string | undefined
    );

    res.json(workOrders);
  } catch (error: any) {
    console.error('Error fetching work orders by status:', error);
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

// ======================
// PERFORMANCE ACTUALS OPERATIONS
// ======================

/**
 * POST /api/v1/work-order-execution/:id/performance
 * Record work performance actuals
 */
router.post('/:id/performance', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const {
      operationId,
      performanceType,
      recordedBy,
      // Labor fields
      personnelId,
      laborHours,
      laborCost,
      laborEfficiency,
      // Material fields
      partId,
      quantityConsumed,
      quantityPlanned,
      materialVariance,
      unitCost,
      totalCost,
      // Equipment fields
      equipmentId,
      setupTime,
      runTime,
      plannedSetupTime,
      plannedRunTime,
      // Quality fields
      quantityProduced,
      quantityGood,
      quantityScrap,
      quantityRework,
      yieldPercentage,
      scrapReason,
      // Downtime fields
      downtimeMinutes,
      downtimeReason,
      downtimeCategory,
      // General
      notes,
      metadata
    } = req.body;

    if (!performanceType || !recordedBy) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'performanceType and recordedBy are required',
        details: {
          performanceType: !performanceType ? 'Required field' : undefined,
          recordedBy: !recordedBy ? 'Required field' : undefined
        }
      });
    }

    const validTypes = ['LABOR', 'MATERIAL', 'EQUIPMENT', 'QUALITY', 'SETUP', 'DOWNTIME'];
    if (!validTypes.includes(performanceType)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: `Invalid performanceType. Valid values: ${validTypes.join(', ')}`
      });
    }

    const performanceRecord = await WorkOrderExecutionService.recordWorkPerformance({
      workOrderId: id,
      operationId,
      performanceType,
      recordedBy,
      personnelId,
      laborHours,
      laborCost,
      laborEfficiency,
      partId,
      quantityConsumed,
      quantityPlanned,
      materialVariance,
      unitCost,
      totalCost,
      equipmentId,
      setupTime,
      runTime,
      plannedSetupTime,
      plannedRunTime,
      quantityProduced,
      quantityGood,
      quantityScrap,
      quantityRework,
      yieldPercentage,
      scrapReason,
      downtimeMinutes,
      downtimeReason,
      downtimeCategory,
      notes,
      metadata
    });

    res.status(201).json(performanceRecord);
  } catch (error: any) {
    console.error('Error recording work performance:', error);

    // ✅ GITHUB ISSUE #11 FIX: Enhanced error handling for performance recording
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'NotFound',
        message: error.message,
        context: 'Performance recording requires an existing work order',
        suggestion: 'Verify the work order ID and ensure it exists in the system'
      });
    }

    if (error.message.includes('Cannot record performance')) {
      return res.status(400).json({
        error: 'InvalidStatus',
        message: error.message,
        context: 'Performance recording validation failed',
        suggestion: 'Performance can only be recorded for work orders in IN_PROGRESS or COMPLETED status'
      });
    }

    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

/**
 * GET /api/v1/work-order-execution/:id/performance
 * Get all performance records for a work order
 */
router.get('/:id/performance', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const performanceType = type ? (type as any) : undefined;

    if (type) {
      const validTypes = ['LABOR', 'MATERIAL', 'EQUIPMENT', 'QUALITY', 'SETUP', 'DOWNTIME'];
      if (!validTypes.includes(type as string)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: `Invalid type. Valid values: ${validTypes.join(', ')}`
        });
      }
    }

    const records = await WorkOrderExecutionService.getWorkPerformanceRecords(id, performanceType);

    res.json(records);
  } catch (error: any) {
    console.error('Error fetching performance records:', error);
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

/**
 * GET /api/v1/work-order-execution/:id/performance/:type
 * Get performance records by type
 */
router.get('/:id/performance/:type', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id, type } = req.params;

    const validTypes = ['LABOR', 'MATERIAL', 'EQUIPMENT', 'QUALITY', 'SETUP', 'DOWNTIME'];
    if (!validTypes.includes(type.toUpperCase())) {
      return res.status(400).json({
        error: 'ValidationError',
        message: `Invalid type. Valid values: ${validTypes.join(', ')}`
      });
    }

    const records = await WorkOrderExecutionService.getWorkPerformanceRecords(id, type.toUpperCase() as any);

    res.json(records);
  } catch (error: any) {
    console.error('Error fetching performance records by type:', error);
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

// ======================
// VARIANCE ANALYSIS OPERATIONS
// ======================

/**
 * GET /api/v1/work-order-execution/:id/variances
 * Get production variances for a work order
 */
router.get('/:id/variances', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    const varianceType = type ? (type as any) : undefined;

    if (type) {
      const validTypes = ['QUANTITY', 'TIME', 'COST', 'EFFICIENCY', 'YIELD', 'MATERIAL'];
      if (!validTypes.includes(type as string)) {
        return res.status(400).json({
          error: 'ValidationError',
          message: `Invalid type. Valid values: ${validTypes.join(', ')}`
        });
      }
    }

    const variances = await WorkOrderExecutionService.getProductionVariances(id, varianceType);

    res.json(variances);
  } catch (error: any) {
    console.error('Error fetching production variances:', error);
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

/**
 * GET /api/v1/work-order-execution/:id/variances/summary
 * Get variance summary with analytics
 */
router.get('/:id/variances/summary', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const summary = await WorkOrderExecutionService.calculateVarianceSummary(id);

    res.json(summary);
  } catch (error: any) {
    console.error('Error calculating variance summary:', error);

    // ✅ GITHUB ISSUE #11 FIX: Enhanced error handling for variance calculations
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'NotFound',
        message: error.message,
        context: 'Variance calculation requires an existing work order',
        suggestion: 'Verify the work order ID and ensure it exists in the system with performance data'
      });
    }

    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

/**
 * GET /api/v1/work-order-execution/:id/variances/:type
 * Get variances by type
 */
router.get('/:id/variances/:type', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id, type } = req.params;

    const validTypes = ['QUANTITY', 'TIME', 'COST', 'EFFICIENCY', 'YIELD', 'MATERIAL'];
    if (!validTypes.includes(type.toUpperCase())) {
      return res.status(400).json({
        error: 'ValidationError',
        message: `Invalid type. Valid values: ${validTypes.join(', ')}`
      });
    }

    const variances = await WorkOrderExecutionService.getProductionVariances(id, type.toUpperCase() as any);

    res.json(variances);
  } catch (error: any) {
    console.error('Error fetching variances by type:', error);
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

// ======================
// DASHBOARD OPERATIONS
// ======================

/**
 * GET /api/v1/work-order-execution/dashboard
 * Get real-time execution dashboard
 */
router.get('/dashboard', async (req: Request, res: Response): Promise<any> => {
  try {
    const { siteId } = req.query;

    const dashboard = await WorkOrderExecutionService.getExecutionDashboard(siteId as string | undefined);

    res.json(dashboard);
  } catch (error: any) {
    console.error('Error fetching execution dashboard:', error);
    res.status(500).json({ error: 'InternalServerError', message: error.message });
  }
});

export default router;
