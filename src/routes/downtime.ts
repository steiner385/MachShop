// GitHub Issue #94: Equipment Registry & Maintenance Management System
// Downtime Tracking API Routes

import express from 'express';
import { z } from 'zod';
import { DowntimeService } from '../services/DowntimeService';
import { logger } from '../utils/logger';

const router = express.Router();
const downtimeService = new DowntimeService();

// Validation schemas
const createDowntimeEventSchema = z.object({
  equipmentId: z.string().uuid(),
  downtimeReasonId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  description: z.string().optional(),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  estimatedRepairTime: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const updateDowntimeEventSchema = z.object({
  downtimeReasonId: z.string().uuid().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  description: z.string().optional(),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  estimatedRepairTime: z.number().int().positive().optional(),
  actualRepairTime: z.number().int().positive().optional(),
  notes: z.string().optional(),
  rootCause: z.string().optional(),
  correctiveAction: z.string().optional(),
});

const createDowntimeReasonSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(['EQUIPMENT_FAILURE', 'PLANNED_MAINTENANCE', 'MATERIAL_SHORTAGE', 'OPERATOR_ERROR', 'POWER_OUTAGE', 'OTHER']),
  isActive: z.boolean().optional(),
});

const updateDowntimeReasonSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.enum(['EQUIPMENT_FAILURE', 'PLANNED_MAINTENANCE', 'MATERIAL_SHORTAGE', 'OPERATOR_ERROR', 'POWER_OUTAGE', 'OTHER']).optional(),
  isActive: z.boolean().optional(),
});

const downtimeFiltersSchema = z.object({
  equipmentId: z.string().uuid().optional(),
  downtimeReasonId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  category: z.enum(['EQUIPMENT_FAILURE', 'PLANNED_MAINTENANCE', 'MATERIAL_SHORTAGE', 'OPERATOR_ERROR', 'POWER_OUTAGE', 'OTHER']).optional(),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  ongoing: z.enum(['true', 'false']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

/**
 * GET /api/v1/downtime/events
 * Get downtime events with filtering and pagination
 */
router.get('/events', async (req, res) => {
  try {
    const filters = downtimeFiltersSchema.parse(req.query);

    const options = {
      equipmentId: filters.equipmentId,
      downtimeReasonId: filters.downtimeReasonId,
      siteId: filters.siteId,
      category: filters.category,
      impact: filters.impact,
      fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
      toDate: filters.toDate ? new Date(filters.toDate) : undefined,
      ongoing: filters.ongoing === 'true',
      page: filters.page ? parseInt(filters.page) : 1,
      limit: filters.limit ? parseInt(filters.limit) : 10,
    };

    const result = await downtimeService.getDowntimeEvents(options);

    res.json({
      success: true,
      data: result.events,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / options.limit),
      },
    });
  } catch (error) {
    logger.error('Error getting downtime events:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to get downtime events',
    });
  }
});

/**
 * POST /api/v1/downtime/events
 * Create a new downtime event
 */
router.post('/events', async (req, res) => {
  try {
    const data = createDowntimeEventSchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const downtimeEvent = await downtimeService.createDowntimeEvent({
      ...data,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      reportedById: userId,
    });

    res.status(201).json({
      success: true,
      data: downtimeEvent,
    });
  } catch (error) {
    logger.error('Error creating downtime event:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create downtime event',
    });
  }
});

/**
 * GET /api/v1/downtime/events/:id
 * Get downtime event by ID
 */
router.get('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const downtimeEvent = await downtimeService.getDowntimeEventById(eventId);

    if (!downtimeEvent) {
      return res.status(404).json({
        success: false,
        error: 'Downtime event not found',
      });
    }

    res.json({
      success: true,
      data: downtimeEvent,
    });
  } catch (error) {
    logger.error('Error getting downtime event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get downtime event',
    });
  }
});

/**
 * PUT /api/v1/downtime/events/:id
 * Update downtime event
 */
router.put('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const data = updateDowntimeEventSchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const updateData = {
      ...data,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
    };

    const downtimeEvent = await downtimeService.updateDowntimeEvent(eventId, updateData);

    res.json({
      success: true,
      data: downtimeEvent,
    });
  } catch (error) {
    logger.error('Error updating downtime event:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update downtime event',
    });
  }
});

/**
 * DELETE /api/v1/downtime/events/:id
 * Delete downtime event
 */
router.delete('/events/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    await downtimeService.deleteDowntimeEvent(eventId);

    res.json({
      success: true,
      message: 'Downtime event deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting downtime event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete downtime event',
    });
  }
});

/**
 * POST /api/v1/downtime/events/:id/end
 * End an ongoing downtime event
 */
router.post('/events/:id/end', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { endTime, notes, rootCause, correctiveAction } = req.body;

    const downtimeEvent = await downtimeService.endDowntimeEvent(eventId, {
      endTime: endTime ? new Date(endTime) : new Date(),
      notes,
      rootCause,
      correctiveAction,
    });

    res.json({
      success: true,
      data: downtimeEvent,
    });
  } catch (error) {
    logger.error('Error ending downtime event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end downtime event',
    });
  }
});

/**
 * GET /api/v1/downtime/ongoing
 * Get ongoing downtime events
 */
router.get('/ongoing', async (req, res) => {
  try {
    const { siteId, equipmentId } = req.query;

    const options = {
      siteId: siteId as string | undefined,
      equipmentId: equipmentId as string | undefined,
    };

    const events = await downtimeService.getOngoingDowntimeEvents(options);

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    logger.error('Error getting ongoing downtime events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ongoing downtime events',
    });
  }
});

/**
 * GET /api/v1/downtime/analytics
 * Get downtime analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { equipmentId, siteId, days } = req.query;

    const options = {
      equipmentId: equipmentId as string | undefined,
      siteId: siteId as string | undefined,
      days: days ? parseInt(days as string) : 30,
    };

    const analytics = await downtimeService.getDowntimeAnalytics(options);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error getting downtime analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get downtime analytics',
    });
  }
});

/**
 * GET /api/v1/downtime/reasons
 * Get downtime reasons
 */
router.get('/reasons', async (req, res) => {
  try {
    const { category, isActive } = req.query;

    const options = {
      category: category as string | undefined,
      isActive: isActive === 'false' ? false : true,
    };

    const reasons = await downtimeService.getDowntimeReasons(options);

    res.json({
      success: true,
      data: reasons,
    });
  } catch (error) {
    logger.error('Error getting downtime reasons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get downtime reasons',
    });
  }
});

/**
 * POST /api/v1/downtime/reasons
 * Create a new downtime reason
 */
router.post('/reasons', async (req, res) => {
  try {
    const data = createDowntimeReasonSchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const downtimeReason = await downtimeService.createDowntimeReason({
      ...data,
      createdById: userId,
    });

    res.status(201).json({
      success: true,
      data: downtimeReason,
    });
  } catch (error) {
    logger.error('Error creating downtime reason:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create downtime reason',
    });
  }
});

/**
 * GET /api/v1/downtime/reasons/:id
 * Get downtime reason by ID
 */
router.get('/reasons/:id', async (req, res) => {
  try {
    const reasonId = req.params.id;
    const downtimeReason = await downtimeService.getDowntimeReasonById(reasonId);

    if (!downtimeReason) {
      return res.status(404).json({
        success: false,
        error: 'Downtime reason not found',
      });
    }

    res.json({
      success: true,
      data: downtimeReason,
    });
  } catch (error) {
    logger.error('Error getting downtime reason:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get downtime reason',
    });
  }
});

/**
 * PUT /api/v1/downtime/reasons/:id
 * Update downtime reason
 */
router.put('/reasons/:id', async (req, res) => {
  try {
    const reasonId = req.params.id;
    const data = updateDowntimeReasonSchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const downtimeReason = await downtimeService.updateDowntimeReason(reasonId, {
      ...data,
      updatedById: userId,
    });

    res.json({
      success: true,
      data: downtimeReason,
    });
  } catch (error) {
    logger.error('Error updating downtime reason:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update downtime reason',
    });
  }
});

/**
 * DELETE /api/v1/downtime/reasons/:id
 * Delete downtime reason
 */
router.delete('/reasons/:id', async (req, res) => {
  try {
    const reasonId = req.params.id;
    await downtimeService.deleteDowntimeReason(reasonId);

    res.json({
      success: true,
      message: 'Downtime reason deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting downtime reason:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete downtime reason',
    });
  }
});

/**
 * GET /api/v1/downtime/trends
 * Get downtime trends
 */
router.get('/trends', async (req, res) => {
  try {
    const { equipmentId, siteId, days, groupBy } = req.query;

    const options = {
      equipmentId: equipmentId as string | undefined,
      siteId: siteId as string | undefined,
      days: days ? parseInt(days as string) : 30,
      groupBy: (groupBy as 'day' | 'week' | 'month') || 'day',
    };

    const trends = await downtimeService.getDowntimeTrends(options);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logger.error('Error getting downtime trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get downtime trends',
    });
  }
});

/**
 * GET /api/v1/downtime/summary
 * Get downtime summary by reason categories
 */
router.get('/summary', async (req, res) => {
  try {
    const { equipmentId, siteId, days } = req.query;

    const options = {
      equipmentId: equipmentId as string | undefined,
      siteId: siteId as string | undefined,
      days: days ? parseInt(days as string) : 30,
    };

    const summary = await downtimeService.getDowntimeSummaryByReason(options);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Error getting downtime summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get downtime summary',
    });
  }
});

export default router;