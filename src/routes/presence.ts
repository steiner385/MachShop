/**
 * Presence API Routes
 * Sprint 4: Collaborative Routing Features
 *
 * REST API endpoints for user presence tracking
 */

import express from 'express';
import { z } from 'zod';
import { presenceService } from '../services/PresenceService';
import { requireProductionAccess } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updatePresenceSchema = z.object({
  resourceType: z.enum(['routing', 'routing-step', 'work-order']),
  resourceId: z.string().min(1),
  action: z.enum(['viewing', 'editing']),
  userName: z.string().optional(), // Will use req.user if not provided
});

const getPresenceSchema = z.object({
  resourceType: z.enum(['routing', 'routing-step', 'work-order']),
  resourceId: z.string().min(1),
});

const removePresenceSchema = z.object({
  resourceType: z.enum(['routing', 'routing-step', 'work-order']),
  resourceId: z.string().min(1),
});

// ============================================
// PRESENCE ENDPOINTS
// ============================================

/**
 * @route POST /api/v1/presence/update
 * @desc Update user presence (heartbeat)
 * @access Private (Production Access Required)
 */
router.post('/update',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validatedData = updatePresenceSchema.parse(req.body);

    if (!req.user?.id || !req.user?.username) {
      throw new ValidationError('User information not available');
    }

    presenceService.updatePresence({
      userId: req.user.id,
      userName: validatedData.userName || req.user.username || 'Unknown User',
      resourceType: validatedData.resourceType,
      resourceId: validatedData.resourceId,
      action: validatedData.action,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    logger.debug('Presence updated', {
      userId: req.user.id,
      resourceType: validatedData.resourceType,
      resourceId: validatedData.resourceId,
      action: validatedData.action,
    });

    res.status(200).json({
      success: true,
      message: 'Presence updated',
    });
  })
);

/**
 * @route GET /api/v1/presence/:resourceType/:resourceId
 * @desc Get presence information for a resource
 * @access Private (Production Access Required)
 */
router.get('/:resourceType/:resourceId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { resourceType, resourceId } = req.params;

    const validatedData = getPresenceSchema.parse({
      resourceType,
      resourceId,
    });

    const presenceInfo = presenceService.getPresence({
      resourceType: validatedData.resourceType,
      resourceId: validatedData.resourceId,
    });

    logger.debug('Presence retrieved', {
      userId: req.user?.id,
      resourceType: validatedData.resourceType,
      resourceId: validatedData.resourceId,
      activeUserCount: presenceInfo.activeUsers.length,
    });

    res.status(200).json({
      success: true,
      data: presenceInfo,
    });
  })
);

/**
 * @route POST /api/v1/presence/remove
 * @desc Remove user presence (on unmount/leave)
 * @access Private (Production Access Required)
 */
router.post('/remove',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validatedData = removePresenceSchema.parse(req.body);

    if (!req.user?.id) {
      throw new ValidationError('User information not available');
    }

    presenceService.removePresence({
      userId: req.user.id,
      resourceType: validatedData.resourceType,
      resourceId: validatedData.resourceId,
    });

    logger.debug('Presence removed', {
      userId: req.user.id,
      resourceType: validatedData.resourceType,
      resourceId: validatedData.resourceId,
    });

    res.status(200).json({
      success: true,
      message: 'Presence removed',
    });
  })
);

/**
 * @route GET /api/v1/presence/debug/all
 * @desc Get all presence records (debug only)
 * @access Private (Production Access Required)
 */
router.get('/debug/all',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const allPresence = presenceService.getAllPresence();

    const presenceData = Array.from(allPresence.entries()).map(([key, records]) => ({
      key,
      records: records.map(r => ({
        userId: r.userId,
        userName: r.userName,
        action: r.action,
        lastSeen: r.lastSeen,
        age: Math.floor((Date.now() - r.lastSeen.getTime()) / 1000),
      })),
    }));

    res.status(200).json({
      success: true,
      data: presenceData,
      count: presenceData.length,
    });
  })
);

export default router;
