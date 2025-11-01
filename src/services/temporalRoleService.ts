/**
 * Temporal Role Management Service - GitHub Issue #126
 *
 * Provides comprehensive temporal role assignment, extension, revocation,
 * and emergency access functionality with full audit trail support.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { clearUserPermissionCache } from './permissionService';

const prisma = new PrismaClient();

/**
 * Temporal role assignment request
 */
export interface TemporalRoleAssignmentRequest {
  userId: string;
  roleId: string;
  siteId?: string; // For site-specific roles
  validFrom?: Date; // When role becomes active (defaults to now)
  expiresAt?: Date; // When role expires (required for temporary roles)
  isTemporary: boolean; // Flag for temporary vs permanent assignment
  grantReason?: string; // Reason for temporal assignment
  assignedBy: string; // User ID who is granting the role
  isEmergency?: boolean; // Emergency access flag
}

/**
 * Temporal role extension request
 */
export interface TemporalRoleExtensionRequest {
  userRoleId?: string; // For global roles
  userSiteRoleId?: string; // For site-specific roles
  newExpiresAt: Date;
  extensionReason: string;
  extendedBy: string;
}

/**
 * Temporal role revocation request
 */
export interface TemporalRoleRevocationRequest {
  userRoleId?: string; // For global roles
  userSiteRoleId?: string; // For site-specific roles
  revocationReason: string;
  revokedBy: string;
  immediateRevocation?: boolean; // Revoke immediately vs set expiration to now
}

/**
 * Result of temporal role operations
 */
export interface TemporalRoleOperationResult {
  success: boolean;
  message: string;
  assignmentId?: string;
  auditLogId?: string;
  error?: string;
}

/**
 * Emergency access request
 */
export interface EmergencyAccessRequest {
  userId: string;
  roleId: string;
  siteId?: string;
  emergencyReason: string;
  durationHours: number; // How long emergency access should last
  requestedBy: string;
  approvedBy?: string; // For approval workflows
}

/**
 * Cleanup operation result
 */
export interface CleanupResult {
  expiredRolesRemoved: number;
  globalRoles: number;
  siteRoles: number;
  auditLogsCreated: number;
  errors: string[];
}

/**
 * Assign a temporal role to a user
 */
export async function assignTemporalRole(
  request: TemporalRoleAssignmentRequest
): Promise<TemporalRoleOperationResult> {
  try {
    // Validate the request
    const validationResult = await validateTemporalRoleAssignment(request);
    if (!validationResult.valid) {
      return {
        success: false,
        message: validationResult.message,
        error: validationResult.message
      };
    }

    // Use a transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      let assignmentId: string;
      const now = new Date();
      const validFrom = request.validFrom || now;

      if (request.siteId) {
        // Site-specific role assignment
        const assignment = await tx.userSiteRole.create({
          data: {
            userId: request.userId,
            roleId: request.roleId,
            siteId: request.siteId,
            assignedBy: request.assignedBy,
            validFrom: validFrom,
            expiresAt: request.expiresAt,
            isTemporary: request.isTemporary,
            grantReason: request.grantReason
          }
        });
        assignmentId = assignment.id;
      } else {
        // Global role assignment
        const assignment = await tx.userRole.create({
          data: {
            userId: request.userId,
            roleId: request.roleId,
            assignedBy: request.assignedBy,
            validFrom: validFrom,
            expiresAt: request.expiresAt,
            isTemporary: request.isTemporary,
            grantReason: request.grantReason
          }
        });
        assignmentId = assignment.id;
      }

      // Create audit log entry
      const auditLog = await tx.temporalAccessLog.create({
        data: {
          userId: request.userId,
          roleId: request.roleId,
          siteId: request.siteId,
          accessType: request.isEmergency ? 'emergency' : 'granted',
          reason: request.grantReason || 'Temporal role assignment',
          grantedBy: request.assignedBy,
          validFrom: validFrom,
          expiresAt: request.expiresAt,
          isEmergency: request.isEmergency || false,
          metadata: {
            assignmentId: assignmentId,
            isTemporary: request.isTemporary,
            operationType: 'assignment'
          }
        }
      });

      return { assignmentId, auditLogId: auditLog.id };
    });

    // Clear user permission cache
    clearUserPermissionCache(request.userId);

    logger.info('Temporal role assigned successfully', {
      userId: request.userId,
      roleId: request.roleId,
      siteId: request.siteId,
      assignedBy: request.assignedBy,
      assignmentId: result.assignmentId,
      isTemporary: request.isTemporary,
      isEmergency: request.isEmergency || false
    });

    return {
      success: true,
      message: 'Temporal role assigned successfully',
      assignmentId: result.assignmentId,
      auditLogId: result.auditLogId
    };

  } catch (error: any) {
    logger.error('Failed to assign temporal role', {
      request,
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      message: 'Failed to assign temporal role',
      error: error.message
    };
  }
}

/**
 * Extend the expiration of a temporal role
 */
export async function extendTemporalRole(
  request: TemporalRoleExtensionRequest
): Promise<TemporalRoleOperationResult> {
  try {
    if (!request.userRoleId && !request.userSiteRoleId) {
      return {
        success: false,
        message: 'Either userRoleId or userSiteRoleId must be provided',
        error: 'Missing role assignment ID'
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      let assignment: any;
      let userId: string;
      let roleId: string;
      let siteId: string | undefined;

      if (request.userRoleId) {
        // Extend global role
        assignment = await tx.userRole.update({
          where: { id: request.userRoleId },
          data: { expiresAt: request.newExpiresAt },
          include: { role: true }
        });
        userId = assignment.userId;
        roleId = assignment.roleId;
      } else {
        // Extend site-specific role
        assignment = await tx.userSiteRole.update({
          where: { id: request.userSiteRoleId },
          data: { expiresAt: request.newExpiresAt },
          include: { role: true }
        });
        userId = assignment.userId;
        roleId = assignment.roleId;
        siteId = assignment.siteId;
      }

      // Create audit log entry
      const auditLog = await tx.temporalAccessLog.create({
        data: {
          userId: userId,
          roleId: roleId,
          siteId: siteId,
          accessType: 'extended',
          reason: request.extensionReason,
          grantedBy: request.extendedBy,
          expiresAt: request.newExpiresAt,
          metadata: {
            assignmentId: request.userRoleId || request.userSiteRoleId,
            operationType: 'extension',
            previousExpiresAt: assignment.expiresAt
          }
        }
      });

      return { assignment, auditLogId: auditLog.id };
    });

    // Clear user permission cache
    clearUserPermissionCache(result.assignment.userId);

    logger.info('Temporal role extended successfully', {
      assignmentId: request.userRoleId || request.userSiteRoleId,
      newExpiresAt: request.newExpiresAt,
      extendedBy: request.extendedBy
    });

    return {
      success: true,
      message: 'Temporal role extended successfully',
      assignmentId: request.userRoleId || request.userSiteRoleId,
      auditLogId: result.auditLogId
    };

  } catch (error: any) {
    logger.error('Failed to extend temporal role', {
      request,
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      message: 'Failed to extend temporal role',
      error: error.message
    };
  }
}

/**
 * Revoke a temporal role assignment
 */
export async function revokeTemporalRole(
  request: TemporalRoleRevocationRequest
): Promise<TemporalRoleOperationResult> {
  try {
    if (!request.userRoleId && !request.userSiteRoleId) {
      return {
        success: false,
        message: 'Either userRoleId or userSiteRoleId must be provided',
        error: 'Missing role assignment ID'
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      let assignment: any;
      let userId: string;
      let roleId: string;
      let siteId: string | undefined;

      if (request.immediateRevocation) {
        // Delete the assignment immediately
        if (request.userRoleId) {
          assignment = await tx.userRole.delete({
            where: { id: request.userRoleId },
            include: { role: true }
          });
          userId = assignment.userId;
          roleId = assignment.roleId;
        } else {
          assignment = await tx.userSiteRole.delete({
            where: { id: request.userSiteRoleId },
            include: { role: true }
          });
          userId = assignment.userId;
          roleId = assignment.roleId;
          siteId = assignment.siteId;
        }
      } else {
        // Set expiration to now (soft revocation)
        const now = new Date();
        if (request.userRoleId) {
          assignment = await tx.userRole.update({
            where: { id: request.userRoleId },
            data: { expiresAt: now },
            include: { role: true }
          });
          userId = assignment.userId;
          roleId = assignment.roleId;
        } else {
          assignment = await tx.userSiteRole.update({
            where: { id: request.userSiteRoleId },
            data: { expiresAt: now },
            include: { role: true }
          });
          userId = assignment.userId;
          roleId = assignment.roleId;
          siteId = assignment.siteId;
        }
      }

      // Create audit log entry
      const auditLog = await tx.temporalAccessLog.create({
        data: {
          userId: userId,
          roleId: roleId,
          siteId: siteId,
          accessType: 'revoked',
          reason: request.revocationReason,
          grantedBy: request.revokedBy,
          metadata: {
            assignmentId: request.userRoleId || request.userSiteRoleId,
            operationType: 'revocation',
            immediateRevocation: request.immediateRevocation || false
          }
        }
      });

      return { assignment, auditLogId: auditLog.id };
    });

    // Clear user permission cache
    clearUserPermissionCache(result.assignment.userId);

    logger.info('Temporal role revoked successfully', {
      assignmentId: request.userRoleId || request.userSiteRoleId,
      revokedBy: request.revokedBy,
      immediateRevocation: request.immediateRevocation || false
    });

    return {
      success: true,
      message: 'Temporal role revoked successfully',
      assignmentId: request.userRoleId || request.userSiteRoleId,
      auditLogId: result.auditLogId
    };

  } catch (error: any) {
    logger.error('Failed to revoke temporal role', {
      request,
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      message: 'Failed to revoke temporal role',
      error: error.message
    };
  }
}

/**
 * Grant emergency access
 */
export async function grantEmergencyAccess(
  request: EmergencyAccessRequest
): Promise<TemporalRoleOperationResult> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + request.durationHours * 60 * 60 * 1000);

    const temporalRequest: TemporalRoleAssignmentRequest = {
      userId: request.userId,
      roleId: request.roleId,
      siteId: request.siteId,
      validFrom: now,
      expiresAt: expiresAt,
      isTemporary: true,
      grantReason: `Emergency Access: ${request.emergencyReason}`,
      assignedBy: request.approvedBy || request.requestedBy,
      isEmergency: true
    };

    const result = await assignTemporalRole(temporalRequest);

    if (result.success) {
      logger.warn('Emergency access granted', {
        userId: request.userId,
        roleId: request.roleId,
        siteId: request.siteId,
        durationHours: request.durationHours,
        emergencyReason: request.emergencyReason,
        requestedBy: request.requestedBy,
        approvedBy: request.approvedBy,
        assignmentId: result.assignmentId
      });
    }

    return result;

  } catch (error: any) {
    logger.error('Failed to grant emergency access', {
      request,
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      message: 'Failed to grant emergency access',
      error: error.message
    };
  }
}

/**
 * Clean up expired temporal roles
 */
export async function cleanupExpiredRoles(): Promise<CleanupResult> {
  const result: CleanupResult = {
    expiredRolesRemoved: 0,
    globalRoles: 0,
    siteRoles: 0,
    auditLogsCreated: 0,
    errors: []
  };

  try {
    const now = new Date();

    // Find expired roles
    const [expiredGlobalRoles, expiredSiteRoles] = await Promise.all([
      prisma.userRole.findMany({
        where: {
          expiresAt: { lte: now },
          isTemporary: true
        },
        include: { role: true, user: true }
      }),
      prisma.userSiteRole.findMany({
        where: {
          expiresAt: { lte: now },
          isTemporary: true
        },
        include: { role: true, user: true, site: true }
      })
    ]);

    // Clean up expired global roles
    for (const expiredRole of expiredGlobalRoles) {
      try {
        await prisma.$transaction(async (tx) => {
          // Delete the expired role
          await tx.userRole.delete({
            where: { id: expiredRole.id }
          });

          // Create audit log
          await tx.temporalAccessLog.create({
            data: {
              userId: expiredRole.userId,
              roleId: expiredRole.roleId,
              accessType: 'cleanup',
              reason: 'Automatic cleanup of expired temporal role',
              grantedBy: 'system',
              metadata: {
                assignmentId: expiredRole.id,
                operationType: 'cleanup',
                originalExpiresAt: expiredRole.expiresAt
              }
            }
          });
        });

        // Clear user permission cache
        clearUserPermissionCache(expiredRole.userId);

        result.globalRoles++;
        result.auditLogsCreated++;
      } catch (error: any) {
        result.errors.push(`Failed to cleanup global role ${expiredRole.id}: ${error.message}`);
      }
    }

    // Clean up expired site roles
    for (const expiredRole of expiredSiteRoles) {
      try {
        await prisma.$transaction(async (tx) => {
          // Delete the expired role
          await tx.userSiteRole.delete({
            where: { id: expiredRole.id }
          });

          // Create audit log
          await tx.temporalAccessLog.create({
            data: {
              userId: expiredRole.userId,
              roleId: expiredRole.roleId,
              siteId: expiredRole.siteId,
              accessType: 'cleanup',
              reason: 'Automatic cleanup of expired temporal role',
              grantedBy: 'system',
              metadata: {
                assignmentId: expiredRole.id,
                operationType: 'cleanup',
                originalExpiresAt: expiredRole.expiresAt
              }
            }
          });
        });

        // Clear user permission cache
        clearUserPermissionCache(expiredRole.userId);

        result.siteRoles++;
        result.auditLogsCreated++;
      } catch (error: any) {
        result.errors.push(`Failed to cleanup site role ${expiredRole.id}: ${error.message}`);
      }
    }

    result.expiredRolesRemoved = result.globalRoles + result.siteRoles;

    logger.info('Temporal role cleanup completed', {
      expiredRolesRemoved: result.expiredRolesRemoved,
      globalRoles: result.globalRoles,
      siteRoles: result.siteRoles,
      auditLogsCreated: result.auditLogsCreated,
      errors: result.errors.length
    });

    if (result.errors.length > 0) {
      logger.warn('Cleanup completed with errors', { errors: result.errors });
    }

    return result;

  } catch (error: any) {
    logger.error('Failed to cleanup expired roles', {
      error: error.message,
      stack: error.stack
    });

    result.errors.push(`Cleanup operation failed: ${error.message}`);
    return result;
  }
}

/**
 * Validate temporal role assignment request
 */
async function validateTemporalRoleAssignment(
  request: TemporalRoleAssignmentRequest
): Promise<{ valid: boolean; message: string }> {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: request.userId }
    });
    if (!user) {
      return { valid: false, message: 'User not found' };
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: request.roleId }
    });
    if (!role) {
      return { valid: false, message: 'Role not found' };
    }

    if (!role.isActive) {
      return { valid: false, message: 'Role is not active' };
    }

    // Check if site exists (for site-specific roles)
    if (request.siteId) {
      const site = await prisma.site.findUnique({
        where: { id: request.siteId }
      });
      if (!site) {
        return { valid: false, message: 'Site not found' };
      }
    }

    // Check temporal constraints
    if (request.validFrom && request.expiresAt && request.validFrom >= request.expiresAt) {
      return { valid: false, message: 'validFrom must be before expiresAt' };
    }

    // Check if user already has this role (prevent duplicates)
    if (request.siteId) {
      const existing = await prisma.userSiteRole.findFirst({
        where: {
          userId: request.userId,
          roleId: request.roleId,
          siteId: request.siteId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });
      if (existing) {
        return { valid: false, message: 'User already has this site role assigned' };
      }
    } else {
      const existing = await prisma.userRole.findFirst({
        where: {
          userId: request.userId,
          roleId: request.roleId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });
      if (existing) {
        return { valid: false, message: 'User already has this global role assigned' };
      }
    }

    return { valid: true, message: 'Valid request' };

  } catch (error: any) {
    logger.error('Failed to validate temporal role assignment', {
      request,
      error: error.message
    });
    return { valid: false, message: 'Validation error' };
  }
}

/**
 * Get temporal access audit logs
 */
export async function getTemporalAccessLogs(
  userId?: string,
  roleId?: string,
  siteId?: string,
  accessType?: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
) {
  try {
    const where: any = {};

    if (userId) where.userId = userId;
    if (roleId) where.roleId = roleId;
    if (siteId) where.siteId = siteId;
    if (accessType) where.accessType = accessType;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const logs = await prisma.temporalAccessLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        role: {
          select: {
            id: true,
            roleCode: true,
            roleName: true
          }
        },
        site: {
          select: {
            id: true,
            siteCode: true,
            siteName: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    return logs;

  } catch (error: any) {
    logger.error('Failed to get temporal access logs', {
      userId,
      roleId,
      siteId,
      accessType,
      error: error.message
    });
    throw error;
  }
}