/**
 * Temporal Role Management API - GitHub Issue #126
 *
 * Provides APIs for managing temporal role assignments with time-based constraints,
 * emergency access, and comprehensive audit trail support.
 * Requires System Administrator role or admin.users permission
 */

import { Router, Request, Response } from 'express';
import { requireRole } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import {
  assignTemporalRole,
  extendTemporalRole,
  revokeTemporalRole,
  grantEmergencyAccess,
  cleanupExpiredRoles,
  getTemporalAccessLogs,
  TemporalRoleAssignmentRequest,
  TemporalRoleExtensionRequest,
  TemporalRoleRevocationRequest,
  EmergencyAccessRequest
} from '../../services/temporalRoleService';
import { getUserTemporalRoles } from '../../services/permissionService';

const router = Router();

// Apply authorization to all routes (authentication handled by apiRouter)
router.use(requireRole('System Administrator')); // Admin access only

/**
 * POST /api/v1/admin/temporal-roles/assign
 * Assign a temporal role to a user with time constraints
 */
router.post('/assign', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      roleId,
      siteId,
      validFrom,
      expiresAt,
      isTemporary,
      grantReason,
      isEmergency
    } = req.body;

    // Validation
    if (!userId || !roleId || typeof isTemporary !== 'boolean') {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'userId, roleId, and isTemporary are required'
      });
    }

    if (isTemporary && !expiresAt) {
      return res.status(400).json({
        error: 'Expiration required for temporary roles',
        details: 'expiresAt is required when isTemporary is true'
      });
    }

    // Prepare request
    const request: TemporalRoleAssignmentRequest = {
      userId,
      roleId,
      siteId,
      validFrom: validFrom ? new Date(validFrom) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isTemporary,
      grantReason,
      assignedBy: req.user?.id || 'system',
      isEmergency: isEmergency || false
    };

    // Assign temporal role
    const result = await assignTemporalRole(request);

    if (!result.success) {
      return res.status(400).json({
        error: 'Failed to assign temporal role',
        details: result.message
      });
    }

    logger.info('Temporal role assigned via API', {
      userId,
      roleId,
      siteId,
      assignedBy: req.user?.id,
      assignmentId: result.assignmentId,
      isTemporary,
      isEmergency
    });

    res.status(201).json({
      success: true,
      message: result.message,
      assignmentId: result.assignmentId,
      auditLogId: result.auditLogId
    });

  } catch (error: any) {
    logger.error('Failed to assign temporal role via API', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Internal server error',
      details: 'Failed to process temporal role assignment'
    });
  }
});

/**
 * PUT /api/v1/admin/temporal-roles/extend
 * Extend the expiration of a temporal role assignment
 */
router.put('/extend', async (req: Request, res: Response) => {
  try {
    const {
      userRoleId,
      userSiteRoleId,
      newExpiresAt,
      extensionReason
    } = req.body;

    // Validation
    if (!newExpiresAt || !extensionReason) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'newExpiresAt and extensionReason are required'
      });
    }

    if (!userRoleId && !userSiteRoleId) {
      return res.status(400).json({
        error: 'Missing assignment ID',
        details: 'Either userRoleId or userSiteRoleId must be provided'
      });
    }

    // Prepare request
    const request: TemporalRoleExtensionRequest = {
      userRoleId,
      userSiteRoleId,
      newExpiresAt: new Date(newExpiresAt),
      extensionReason,
      extendedBy: req.user?.id || 'system'
    };

    // Extend temporal role
    const result = await extendTemporalRole(request);

    if (!result.success) {
      return res.status(400).json({
        error: 'Failed to extend temporal role',
        details: result.message
      });
    }

    logger.info('Temporal role extended via API', {
      assignmentId: userRoleId || userSiteRoleId,
      newExpiresAt,
      extendedBy: req.user?.id
    });

    res.json({
      success: true,
      message: result.message,
      assignmentId: result.assignmentId,
      auditLogId: result.auditLogId
    });

  } catch (error: any) {
    logger.error('Failed to extend temporal role via API', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Internal server error',
      details: 'Failed to process temporal role extension'
    });
  }
});

/**
 * DELETE /api/v1/admin/temporal-roles/revoke
 * Revoke a temporal role assignment
 */
router.delete('/revoke', async (req: Request, res: Response) => {
  try {
    const {
      userRoleId,
      userSiteRoleId,
      revocationReason,
      immediateRevocation
    } = req.body;

    // Validation
    if (!revocationReason) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'revocationReason is required'
      });
    }

    if (!userRoleId && !userSiteRoleId) {
      return res.status(400).json({
        error: 'Missing assignment ID',
        details: 'Either userRoleId or userSiteRoleId must be provided'
      });
    }

    // Prepare request
    const request: TemporalRoleRevocationRequest = {
      userRoleId,
      userSiteRoleId,
      revocationReason,
      revokedBy: req.user?.id || 'system',
      immediateRevocation: immediateRevocation || false
    };

    // Revoke temporal role
    const result = await revokeTemporalRole(request);

    if (!result.success) {
      return res.status(400).json({
        error: 'Failed to revoke temporal role',
        details: result.message
      });
    }

    logger.warn('Temporal role revoked via API', {
      assignmentId: userRoleId || userSiteRoleId,
      revokedBy: req.user?.id,
      immediateRevocation: immediateRevocation || false
    });

    res.json({
      success: true,
      message: result.message,
      assignmentId: result.assignmentId,
      auditLogId: result.auditLogId
    });

  } catch (error: any) {
    logger.error('Failed to revoke temporal role via API', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Internal server error',
      details: 'Failed to process temporal role revocation'
    });
  }
});

/**
 * POST /api/v1/admin/temporal-roles/emergency-access
 * Grant emergency access with time-limited role assignment
 */
router.post('/emergency-access', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      roleId,
      siteId,
      emergencyReason,
      durationHours,
      approvedBy
    } = req.body;

    // Validation
    if (!userId || !roleId || !emergencyReason || !durationHours) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'userId, roleId, emergencyReason, and durationHours are required'
      });
    }

    if (durationHours <= 0 || durationHours > 168) { // Max 7 days
      return res.status(400).json({
        error: 'Invalid duration',
        details: 'Duration must be between 1 and 168 hours (7 days)'
      });
    }

    // Prepare request
    const request: EmergencyAccessRequest = {
      userId,
      roleId,
      siteId,
      emergencyReason,
      durationHours,
      requestedBy: req.user?.id || 'system',
      approvedBy: approvedBy || req.user?.id || 'system'
    };

    // Grant emergency access
    const result = await grantEmergencyAccess(request);

    if (!result.success) {
      return res.status(400).json({
        error: 'Failed to grant emergency access',
        details: result.message
      });
    }

    logger.warn('Emergency access granted via API', {
      userId,
      roleId,
      siteId,
      durationHours,
      emergencyReason,
      requestedBy: req.user?.id,
      assignmentId: result.assignmentId
    });

    res.status(201).json({
      success: true,
      message: result.message,
      assignmentId: result.assignmentId,
      auditLogId: result.auditLogId,
      expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000)
    });

  } catch (error: any) {
    logger.error('Failed to grant emergency access via API', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Internal server error',
      details: 'Failed to process emergency access request'
    });
  }
});

/**
 * GET /api/v1/admin/temporal-roles/user/:userId
 * Get all temporal role assignments for a specific user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { siteId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing user ID',
        details: 'User ID is required'
      });
    }

    // Get user temporal roles
    const temporalRoles = await getUserTemporalRoles(userId, siteId as string);

    res.json({
      success: true,
      userId,
      siteId: siteId || null,
      temporalRoles
    });

  } catch (error: any) {
    logger.error('Failed to get user temporal roles via API', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Internal server error',
      details: 'Failed to retrieve user temporal roles'
    });
  }
});

/**
 * GET /api/v1/admin/temporal-roles/audit-logs
 * Get temporal access audit logs with filtering
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      roleId,
      siteId,
      accessType,
      startDate,
      endDate,
      limit
    } = req.query;

    // Get audit logs
    const logs = await getTemporalAccessLogs(
      userId as string,
      roleId as string,
      siteId as string,
      accessType as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      limit ? parseInt(limit as string) : 100
    );

    res.json({
      success: true,
      logs,
      count: logs.length
    });

  } catch (error: any) {
    logger.error('Failed to get temporal access audit logs via API', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Internal server error',
      details: 'Failed to retrieve temporal access audit logs'
    });
  }
});

/**
 * POST /api/v1/admin/temporal-roles/cleanup
 * Manually trigger cleanup of expired temporal roles
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    // Perform cleanup
    const result = await cleanupExpiredRoles();

    logger.info('Manual temporal role cleanup performed via API', {
      performedBy: req.user?.id,
      expiredRolesRemoved: result.expiredRolesRemoved,
      globalRoles: result.globalRoles,
      siteRoles: result.siteRoles,
      errors: result.errors.length
    });

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      result: {
        expiredRolesRemoved: result.expiredRolesRemoved,
        globalRoles: result.globalRoles,
        siteRoles: result.siteRoles,
        auditLogsCreated: result.auditLogsCreated,
        errorCount: result.errors.length,
        errors: result.errors
      }
    });

  } catch (error: any) {
    logger.error('Failed to perform temporal role cleanup via API', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Internal server error',
      details: 'Failed to perform temporal role cleanup'
    });
  }
});

/**
 * GET /api/v1/admin/temporal-roles/stats
 * Get temporal role statistics and summary
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const now = new Date();

    // Get various statistics
    const [
      activeTemporalRoles,
      expiredTemporalRoles,
      pendingTemporalRoles,
      emergencyAccessCount,
      recentAuditLogs
    ] = await Promise.all([
      // Active temporal roles (both global and site)
      Promise.all([
        prisma.userRole.count({
          where: {
            isTemporary: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ],
            AND: [
              {
                OR: [
                  { validFrom: null },
                  { validFrom: { lte: now } }
                ]
              }
            ]
          }
        }),
        prisma.userSiteRole.count({
          where: {
            isTemporary: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ],
            AND: [
              {
                OR: [
                  { validFrom: null },
                  { validFrom: { lte: now } }
                ]
              }
            ]
          }
        })
      ]).then(([global, site]) => global + site),

      // Expired temporal roles
      Promise.all([
        prisma.userRole.count({
          where: {
            isTemporary: true,
            expiresAt: { lte: now }
          }
        }),
        prisma.userSiteRole.count({
          where: {
            isTemporary: true,
            expiresAt: { lte: now }
          }
        })
      ]).then(([global, site]) => global + site),

      // Pending temporal roles (future validFrom)
      Promise.all([
        prisma.userRole.count({
          where: {
            isTemporary: true,
            validFrom: { gt: now }
          }
        }),
        prisma.userSiteRole.count({
          where: {
            isTemporary: true,
            validFrom: { gt: now }
          }
        })
      ]).then(([global, site]) => global + site),

      // Emergency access count (last 24 hours)
      prisma.temporalAccessLog.count({
        where: {
          isEmergency: true,
          timestamp: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Recent audit log activity (last 7 days)
      prisma.temporalAccessLog.count({
        where: {
          timestamp: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({
      success: true,
      timestamp: now,
      statistics: {
        activeTemporalRoles,
        expiredTemporalRoles,
        pendingTemporalRoles,
        emergencyAccessLast24h: emergencyAccessCount,
        auditActivityLast7d: recentAuditLogs
      }
    });

  } catch (error: any) {
    logger.error('Failed to get temporal role statistics via API', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Internal server error',
      details: 'Failed to retrieve temporal role statistics'
    });
  }
});

export default router;