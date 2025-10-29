/**
 * Time Tracking API Routes
 * RESTful API endpoints for labor and machine time tracking
 *
 * GitHub Issue #46: Time Tracking Infrastructure
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import {
  timeTrackingService,
  ClockInRequest,
  ClockOutRequest,
  MachineTimeStartRequest
} from '../services/TimeTrackingService';
import { requireAuth, requirePermission } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const clockInSchema = z.object({
  userId: z.string(),
  workOrderId: z.string().optional(),
  operationId: z.string().optional(),
  indirectCodeId: z.string().optional(),
  entrySource: z.enum(['MANUAL', 'KIOSK', 'MOBILE', 'MACHINE_AUTO', 'API', 'HISTORIAN']).optional(),
  deviceId: z.string().optional(),
  location: z.string().optional(),
});

const clockOutSchema = z.object({
  clockOutTime: z.string().datetime().optional(),
});

const machineTimeStartSchema = z.object({
  equipmentId: z.string(),
  workOrderId: z.string().optional(),
  operationId: z.string().optional(),
  entrySource: z.enum(['MANUAL', 'KIOSK', 'MOBILE', 'MACHINE_AUTO', 'API', 'HISTORIAN']).optional(),
  dataSource: z.string().optional(),
});

const timeEntryFiltersSchema = z.object({
  userId: z.string().optional(),
  workOrderId: z.string().optional(),
  operationId: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPORTED']).optional(),
  timeType: z.enum(['DIRECT_LABOR', 'INDIRECT', 'MACHINE']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const editTimeEntrySchema = z.object({
  clockInTime: z.string().datetime().optional(),
  clockOutTime: z.string().datetime().optional(),
  editReason: z.string().min(1),
});

const configurationUpdateSchema = z.object({
  timeTrackingEnabled: z.boolean().optional(),
  trackingGranularity: z.enum(['NONE', 'WORK_ORDER', 'OPERATION']).optional(),
  costingModel: z.enum(['LABOR_HOURS', 'MACHINE_HOURS', 'BOTH']).optional(),
  allowMultiTasking: z.boolean().optional(),
  multiTaskingMode: z.enum(['CONCURRENT', 'SPLIT_ALLOCATION']).optional(),
  autoSubtractBreaks: z.boolean().optional(),
  standardBreakMinutes: z.number().min(0).optional(),
  requireBreakClockOut: z.boolean().optional(),
  overtimeThresholdHours: z.number().min(0).optional(),
  warnOnOvertime: z.boolean().optional(),
  enableMachineTracking: z.boolean().optional(),
  autoStartFromMachine: z.boolean().optional(),
  autoStopFromMachine: z.boolean().optional(),
  requireTimeApproval: z.boolean().optional(),
  approvalFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'NONE']).optional(),
});

const indirectCostCodeSchema = z.object({
  code: z.string().min(1).max(20),
  description: z.string().min(1),
  category: z.enum(['BREAK', 'LUNCH', 'TRAINING', 'MEETING', 'MAINTENANCE', 'SETUP', 'CLEANUP', 'WAITING', 'ADMINISTRATIVE', 'OTHER']),
  costCenter: z.string().optional(),
  glAccount: z.string().optional(),
  siteId: z.string().optional(),
  displayColor: z.string().optional(),
  displayIcon: z.string().optional(),
});

// ============================================================================
// Labor Time Entry Endpoints
// ============================================================================

/**
 * POST /api/v1/time-tracking/clock-in
 * Clock in a user to a work order, operation, or indirect activity
 */
router.post('/clock-in', requireAuth, requirePermission('timetracking.clockin'), async (req: Request, res: Response) => {
  try {
    const validatedData = clockInSchema.parse(req.body);

    const timeEntry = await timeTrackingService.clockIn(validatedData);

    res.status(201).json({
      success: true,
      data: timeEntry,
      message: 'Successfully clocked in'
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clock in'
    });
  }
});

/**
 * POST /api/v1/time-tracking/clock-out/:timeEntryId
 * Clock out from an active time entry
 */
router.post('/clock-out/:timeEntryId', requireAuth, requirePermission('timetracking.clockout'), async (req: Request, res: Response) => {
  try {
    const { timeEntryId } = req.params;
    const validatedData = clockOutSchema.parse(req.body);

    const clockOutRequest: ClockOutRequest = {
      timeEntryId,
      clockOutTime: validatedData.clockOutTime ? new Date(validatedData.clockOutTime) : undefined
    };

    const timeEntry = await timeTrackingService.clockOut(clockOutRequest);

    res.json({
      success: true,
      data: timeEntry,
      message: 'Successfully clocked out'
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clock out'
    });
  }
});

/**
 * GET /api/v1/time-tracking/active-entries/:userId
 * Get all active time entries for a user
 */
router.get('/active-entries/:userId', requireAuth, requirePermission('timetracking.read'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const activeEntries = await timeTrackingService.getActiveTimeEntries(userId);

    res.json({
      success: true,
      data: activeEntries,
      count: activeEntries.length
    });
  } catch (error) {
    console.error('Get active entries error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get active entries'
    });
  }
});

/**
 * POST /api/v1/time-tracking/stop-all/:userId
 * Stop all active time entries for a user (emergency stop)
 */
router.post('/stop-all/:userId', requireAuth, requirePermission('timetracking.admin'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required for stopping all active entries'
      });
    }

    const stoppedEntries = await timeTrackingService.stopAllActiveEntries(userId, reason);

    res.json({
      success: true,
      data: stoppedEntries,
      message: `Stopped ${stoppedEntries.length} active time entries`,
      count: stoppedEntries.length
    });
  } catch (error) {
    console.error('Stop all entries error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop active entries'
    });
  }
});

// ============================================================================
// Machine Time Entry Endpoints
// ============================================================================

/**
 * POST /api/v1/time-tracking/machine/start
 * Start machine time tracking
 */
router.post('/machine/start', requireAuth, requirePermission('timetracking.machine'), async (req: Request, res: Response) => {
  try {
    const validatedData = machineTimeStartSchema.parse(req.body);

    const machineEntry = await timeTrackingService.startMachineTime(validatedData);

    res.status(201).json({
      success: true,
      data: machineEntry,
      message: 'Machine time tracking started'
    });
  } catch (error) {
    console.error('Machine start error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start machine time tracking'
    });
  }
});

/**
 * POST /api/v1/time-tracking/machine/stop/:machineTimeEntryId
 * Stop machine time tracking
 */
router.post('/machine/stop/:machineTimeEntryId', requireAuth, requirePermission('timetracking.machine'), async (req: Request, res: Response) => {
  try {
    const { machineTimeEntryId } = req.params;
    const { endTime } = req.body;

    const machineEntry = await timeTrackingService.stopMachineTime(
      machineTimeEntryId,
      endTime ? new Date(endTime) : undefined
    );

    res.json({
      success: true,
      data: machineEntry,
      message: 'Machine time tracking stopped'
    });
  } catch (error) {
    console.error('Machine stop error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop machine time tracking'
    });
  }
});

// ============================================================================
// Time Entry Management Endpoints
// ============================================================================

/**
 * GET /api/v1/time-tracking/entries
 * Get time entries with filtering and pagination
 */
router.get('/entries', requireAuth, requirePermission('timetracking.read'), async (req: Request, res: Response) => {
  try {
    const filters = timeEntryFiltersSchema.parse(req.query);

    // Convert string dates to Date objects
    const processedFilters = {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    };

    const result = await timeTrackingService.getTimeEntries(processedFilters);

    res.json({
      success: true,
      data: result.entries,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get time entries'
    });
  }
});

/**
 * GET /api/v1/time-tracking/entries/:id
 * Get a specific time entry by ID
 */
router.get('/entries/:id', requireAuth, requirePermission('timetracking.read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entry = await prisma.laborTimeEntry.findUnique({
      where: { id },
      include: {
        user: true,
        workOrder: true,
        operation: true,
        indirectCode: true,
      }
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Time entry not found'
      });
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Get entry error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get time entry'
    });
  }
});

/**
 * PUT /api/v1/time-tracking/entries/:id/edit
 * Edit a time entry (admin function)
 */
router.put('/entries/:id/edit', requireAuth, requirePermission('timetracking.edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = editTimeEntrySchema.parse(req.body);

    // Get the current entry for audit trail
    const currentEntry = await prisma.laborTimeEntry.findUnique({
      where: { id }
    });

    if (!currentEntry) {
      return res.status(404).json({
        success: false,
        error: 'Time entry not found'
      });
    }

    // Prepare update data
    const updateData: any = {
      editedBy: req.user?.id, // Assuming auth middleware adds user to request
      editedAt: new Date(),
      editReason: validatedData.editReason,
    };

    if (validatedData.clockInTime) {
      updateData.originalClockInTime = currentEntry.originalClockInTime || currentEntry.clockInTime;
      updateData.clockInTime = new Date(validatedData.clockInTime);
    }

    if (validatedData.clockOutTime) {
      updateData.originalClockOutTime = currentEntry.originalClockOutTime || currentEntry.clockOutTime;
      updateData.clockOutTime = new Date(validatedData.clockOutTime);
    }

    // Recalculate duration if both times are present
    if (updateData.clockInTime && updateData.clockOutTime) {
      const durationMs = updateData.clockOutTime.getTime() - updateData.clockInTime.getTime();
      updateData.duration = durationMs / (1000 * 60 * 60);

      // Recalculate cost
      if (currentEntry.laborRate) {
        updateData.laborCost = updateData.duration * currentEntry.laborRate;
      }
    }

    const updatedEntry = await prisma.laborTimeEntry.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        workOrder: true,
        operation: true,
        indirectCode: true,
      }
    });

    res.json({
      success: true,
      data: updatedEntry,
      message: 'Time entry updated successfully'
    });
  } catch (error) {
    console.error('Edit entry error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to edit time entry'
    });
  }
});

// ============================================================================
// Configuration Endpoints
// ============================================================================

/**
 * GET /api/v1/sites/:siteId/time-tracking-configuration
 * Get time tracking configuration for a site
 */
router.get('/sites/:siteId/configuration', requireAuth, requirePermission('timetracking.config.read'), async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;

    const config = await timeTrackingService.getTimeTrackingConfiguration(siteId);

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get configuration'
    });
  }
});

/**
 * PUT /api/v1/sites/:siteId/time-tracking-configuration
 * Update time tracking configuration for a site
 */
router.put('/sites/:siteId/configuration', requireAuth, requirePermission('timetracking.config.write'), async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const validatedData = configurationUpdateSchema.parse(req.body);

    const updatedConfig = await prisma.timeTrackingConfiguration.upsert({
      where: { siteId },
      update: {
        ...validatedData,
        updatedAt: new Date(),
      },
      create: {
        siteId,
        ...validatedData,
        createdBy: req.user?.id || 'system',
      }
    });

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update configuration'
    });
  }
});

// ============================================================================
// Indirect Cost Code Endpoints
// ============================================================================

/**
 * GET /api/v1/time-tracking/indirect-cost-codes
 * Get all indirect cost codes
 */
router.get('/indirect-cost-codes', requireAuth, requirePermission('timetracking.read'), async (req: Request, res: Response) => {
  try {
    const { siteId, category, isActive } = req.query;

    const where: any = {};
    if (siteId) where.siteId = siteId;
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const costCodes = await prisma.indirectCostCode.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { code: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: costCodes,
      count: costCodes.length
    });
  } catch (error) {
    console.error('Get cost codes error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get indirect cost codes'
    });
  }
});

/**
 * POST /api/v1/time-tracking/indirect-cost-codes
 * Create a new indirect cost code
 */
router.post('/indirect-cost-codes', requireAuth, requirePermission('timetracking.admin'), async (req: Request, res: Response) => {
  try {
    const validatedData = indirectCostCodeSchema.parse(req.body);

    const costCode = await prisma.indirectCostCode.create({
      data: {
        ...validatedData,
        createdBy: req.user?.id || 'system',
      }
    });

    res.status(201).json({
      success: true,
      data: costCode,
      message: 'Indirect cost code created successfully'
    });
  } catch (error) {
    console.error('Create cost code error:', error);

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(409).json({
        success: false,
        error: 'Cost code already exists'
      });
    }

    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create indirect cost code'
    });
  }
});

/**
 * PUT /api/v1/time-tracking/indirect-cost-codes/:id
 * Update an indirect cost code
 */
router.put('/indirect-cost-codes/:id', requireAuth, requirePermission('timetracking.admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = indirectCostCodeSchema.partial().parse(req.body);

    const costCode = await prisma.indirectCostCode.update({
      where: { id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      }
    });

    res.json({
      success: true,
      data: costCode,
      message: 'Indirect cost code updated successfully'
    });
  } catch (error) {
    console.error('Update cost code error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update indirect cost code'
    });
  }
});

/**
 * DELETE /api/v1/time-tracking/indirect-cost-codes/:id
 * Delete (deactivate) an indirect cost code
 */
router.delete('/indirect-cost-codes/:id', requireAuth, requirePermission('timetracking.admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete by setting isActive to false
    const costCode = await prisma.indirectCostCode.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      }
    });

    res.json({
      success: true,
      data: costCode,
      message: 'Indirect cost code deactivated successfully'
    });
  } catch (error) {
    console.error('Delete cost code error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete indirect cost code'
    });
  }
});

export default router;