/**
 * Audit Middleware - GitHub Issue #127
 *
 * Enhanced middleware functions that wrap existing authorization with comprehensive
 * permission usage tracking and security event monitoring.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError } from './errorHandler';
import { logger } from '../utils/logger';
import { auditingService, PermissionUsageContext, SecurityEventData } from '../services/AuditingService';
import { SecurityEventType, SecuritySeverity } from '@prisma/client';

// Import existing permission service functions
import {
  hasPermission,
  hasRole,
  hasAllPermissions,
  resolveUserPermissions,
  ResolvedPermissions
} from '../services/permissionService';

/**
 * Enhanced permission middleware with comprehensive audit logging
 * Wraps any permission check with detailed usage tracking
 */
export const requirePermissionWithAudit = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const startTime = Date.now();
    let hasAccess = false;
    let error: Error | null = null;

    try {
      const siteId = req.params.siteId || req.query.siteId as string || req.user.siteId;
      hasAccess = await hasPermission(req.user.id, permission, siteId);

      const duration = Date.now() - startTime;

      // Log permission usage with full context
      const auditContext: PermissionUsageContext = {
        userId: req.user.id,
        permission,
        endpoint: req.path,
        method: req.method,
        success: hasAccess,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        siteId,
        duration,
        context: {
          query: req.query,
          params: req.params,
          bodyKeys: Object.keys(req.body || {}),
        },
      };

      // Log asynchronously to avoid blocking request
      auditingService.logPermissionUsage(auditContext).catch((auditError) => {
        logger.error('Failed to log permission usage:', auditError);
      });

      if (!hasAccess) {
        logger.warn('Database permission authorization failed', {
          userId: req.user.id,
          username: req.user.username,
          requiredPermission: permission,
          siteId,
          path: req.path,
          method: req.method,
          duration,
        });

        return next(new AuthorizationError(`Permission required: ${permission}`));
      }

      // Pre-resolve permissions for potential future use in the request
      if (!req.user.resolvedPermissions) {
        req.user.resolvedPermissions = await resolveUserPermissions(req.user.id, siteId);
        req.user.isUsingDatabaseRBAC = true;
      }

      logger.debug('Database permission authorization granted', {
        userId: req.user.id,
        username: req.user.username,
        permission,
        siteId,
        path: req.path,
        method: req.method,
        duration,
      });

      next();
    } catch (err: any) {
      error = err;
      const duration = Date.now() - startTime;

      logger.error('Database permission check failed', {
        userId: req.user.id,
        permission,
        error: err.message,
        stack: err.stack,
        duration,
      });

      // Log error as security event
      const securityEvent: SecurityEventData = {
        eventType: SecurityEventType.PERMISSION_DENIED,
        severity: SecuritySeverity.MEDIUM,
        userId: req.user.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        description: `Permission check error: ${permission} - ${err.message}`,
        metadata: {
          permission,
          endpoint: req.path,
          method: req.method,
          error: err.message,
        },
        siteId: req.params.siteId || req.query.siteId as string || req.user.siteId,
      };

      auditingService.logSecurityEvent(securityEvent).catch((auditError) => {
        logger.error('Failed to log security event:', auditError);
      });

      return next(new AuthorizationError('Permission check failed'));
    }
  };
};

/**
 * Enhanced role middleware with comprehensive audit logging
 */
export const requireRoleWithAudit = (role: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const startTime = Date.now();
    let hasAccess = false;

    try {
      const siteId = req.params.siteId || req.query.siteId as string || req.user.siteId;
      hasAccess = await hasRole(req.user.id, role, siteId);

      const duration = Date.now() - startTime;

      // Log as a special permission check for roles
      const auditContext: PermissionUsageContext = {
        userId: req.user.id,
        permission: `role:${role}`,
        endpoint: req.path,
        method: req.method,
        success: hasAccess,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        siteId,
        duration,
        context: {
          type: 'role_check',
          role,
          query: req.query,
          params: req.params,
        },
      };

      auditingService.logPermissionUsage(auditContext).catch((auditError) => {
        logger.error('Failed to log role usage:', auditError);
      });

      if (!hasAccess) {
        logger.warn('Database role authorization failed', {
          userId: req.user.id,
          username: req.user.username,
          requiredRole: role,
          siteId,
          path: req.path,
          method: req.method,
          duration,
        });

        return next(new AuthorizationError(`Role required: ${role}`));
      }

      // Pre-resolve permissions for potential future use in the request
      if (!req.user.resolvedPermissions) {
        req.user.resolvedPermissions = await resolveUserPermissions(req.user.id, siteId);
        req.user.isUsingDatabaseRBAC = true;
      }

      logger.debug('Database role authorization granted', {
        userId: req.user.id,
        username: req.user.username,
        role,
        siteId,
        path: req.path,
        method: req.method,
        duration,
      });

      next();
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Database role check failed', {
        userId: req.user.id,
        role,
        error: error.message,
        stack: error.stack,
        duration,
      });

      return next(new AuthorizationError('Role check failed'));
    }
  };
};

/**
 * Enhanced multiple roles middleware with audit logging
 */
export const requireAnyRoleWithAudit = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const startTime = Date.now();
    let hasAccess = false;
    let grantedRole: string | null = null;

    try {
      const siteId = req.params.siteId || req.query.siteId as string || req.user.siteId;

      // Check each role until we find one the user has
      for (const role of roles) {
        if (await hasRole(req.user.id, role, siteId)) {
          hasAccess = true;
          grantedRole = role;
          break;
        }
      }

      const duration = Date.now() - startTime;

      // Log as a special permission check for multiple roles
      const auditContext: PermissionUsageContext = {
        userId: req.user.id,
        permission: `roles:${roles.join('|')}`,
        endpoint: req.path,
        method: req.method,
        success: hasAccess,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        siteId,
        duration,
        context: {
          type: 'multiple_role_check',
          requiredRoles: roles,
          grantedRole,
          query: req.query,
          params: req.params,
        },
      };

      auditingService.logPermissionUsage(auditContext).catch((auditError) => {
        logger.error('Failed to log multiple role usage:', auditError);
      });

      if (!hasAccess) {
        logger.warn('Database multiple role authorization failed', {
          userId: req.user.id,
          username: req.user.username,
          requiredRoles: roles,
          siteId,
          path: req.path,
          method: req.method,
          duration,
        });

        return next(new AuthorizationError(`One of these roles required: ${roles.join(', ')}`));
      }

      // Pre-resolve permissions for potential future use in the request
      if (!req.user.resolvedPermissions) {
        req.user.resolvedPermissions = await resolveUserPermissions(req.user.id, siteId);
        req.user.isUsingDatabaseRBAC = true;
      }

      logger.debug('Database multiple role authorization granted', {
        userId: req.user.id,
        username: req.user.username,
        roles,
        grantedRole,
        siteId,
        path: req.path,
        method: req.method,
        duration,
      });

      next();
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Database multiple role check failed', {
        userId: req.user.id,
        roles,
        error: error.message,
        stack: error.stack,
        duration,
      });

      return next(new AuthorizationError('Role check failed'));
    }
  };
};

/**
 * Enhanced multiple permissions middleware with audit logging
 */
export const requireAllPermissionsWithAudit = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    const startTime = Date.now();
    let hasAccess = false;

    try {
      const siteId = req.params.siteId || req.query.siteId as string || req.user.siteId;
      hasAccess = await hasAllPermissions(req.user.id, permissions, siteId);

      const duration = Date.now() - startTime;

      // Log as a composite permission check
      const auditContext: PermissionUsageContext = {
        userId: req.user.id,
        permission: `permissions:${permissions.join('&')}`,
        endpoint: req.path,
        method: req.method,
        success: hasAccess,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        siteId,
        duration,
        context: {
          type: 'multiple_permission_check',
          requiredPermissions: permissions,
          query: req.query,
          params: req.params,
        },
      };

      auditingService.logPermissionUsage(auditContext).catch((auditError) => {
        logger.error('Failed to log multiple permission usage:', auditError);
      });

      if (!hasAccess) {
        logger.warn('Database multiple permission authorization failed', {
          userId: req.user.id,
          username: req.user.username,
          requiredPermissions: permissions,
          siteId,
          path: req.path,
          method: req.method,
          duration,
        });

        return next(new AuthorizationError(`All permissions required: ${permissions.join(', ')}`));
      }

      // Pre-resolve permissions for potential future use in the request
      if (!req.user.resolvedPermissions) {
        req.user.resolvedPermissions = await resolveUserPermissions(req.user.id, siteId);
        req.user.isUsingDatabaseRBAC = true;
      }

      logger.debug('Database multiple permission authorization granted', {
        userId: req.user.id,
        username: req.user.username,
        permissions,
        siteId,
        path: req.path,
        method: req.method,
        duration,
      });

      next();
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Database multiple permission check failed', {
        userId: req.user.id,
        permissions,
        error: error.message,
        stack: error.stack,
        duration,
      });

      return next(new AuthorizationError('Permission check failed'));
    }
  };
};

/**
 * Enhanced site access middleware with audit logging
 */
export const requireSiteAccessWithAudit = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  const startTime = Date.now();
  let hasAccess = false;

  try {
    // Extract site ID from request parameters or query
    const requestedSiteId = req.params.siteId || req.query.siteId as string;

    if (!requestedSiteId) {
      return next(); // No site restriction needed
    }

    // Resolve user permissions for the specific site
    const resolved = await resolveUserPermissions(req.user.id, requestedSiteId);

    // System administrators can access all sites
    if (resolved.isSystemAdmin) {
      hasAccess = true;
      req.user.resolvedPermissions = resolved;
      req.user.isUsingDatabaseRBAC = true;
    } else {
      // Check if user has any roles for this site
      const siteRoleData = resolved.siteRoles.find(sr => sr.siteId === requestedSiteId);
      const hasGlobalRoles = resolved.globalRoles.length > 0;
      hasAccess = !!(siteRoleData || hasGlobalRoles);
    }

    const duration = Date.now() - startTime;

    // Log site access attempt
    const auditContext: PermissionUsageContext = {
      userId: req.user.id,
      permission: `site_access:${requestedSiteId}`,
      endpoint: req.path,
      method: req.method,
      success: hasAccess,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      siteId: requestedSiteId,
      duration,
      context: {
        type: 'site_access_check',
        requestedSiteId,
        isSystemAdmin: resolved.isSystemAdmin,
        globalRoleCount: resolved.globalRoles.length,
        siteRoleCount: resolved.siteRoles.length,
        query: req.query,
        params: req.params,
      },
    };

    auditingService.logPermissionUsage(auditContext).catch((auditError) => {
      logger.error('Failed to log site access usage:', auditError);
    });

    if (!hasAccess) {
      logger.warn('Database site access denied', {
        userId: req.user.id,
        username: req.user.username,
        requestedSiteId,
        globalRoleCount: resolved.globalRoles.length,
        siteRoleCount: resolved.siteRoles.length,
        path: req.path,
        method: req.method,
        duration,
      });

      return next(new AuthorizationError('Access denied to this site'));
    }

    req.user.resolvedPermissions = resolved;
    req.user.isUsingDatabaseRBAC = true;

    logger.debug('Database site access granted', {
      userId: req.user.id,
      username: req.user.username,
      requestedSiteId,
      globalRoleCount: resolved.globalRoles.length,
      siteRoleCount: resolved.siteRoles.find(sr => sr.siteId === requestedSiteId)?.roles.length || 0,
      path: req.path,
      method: req.method,
      duration,
    });

    next();
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Database site access check failed', {
      userId: req.user.id,
      requestedSiteId: req.params.siteId || req.query.siteId,
      error: error.message,
      stack: error.stack,
      duration,
    });

    return next(new AuthorizationError('Site access check failed'));
  }
};

/**
 * Session tracking middleware
 * Tracks user session activity and updates session logs
 */
export const sessionTrackingMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Only track for authenticated users
  if (!req.user) {
    return next();
  }

  try {
    // Get session ID from various sources
    const sessionId = req.session?.id ||
                     req.headers['x-session-id'] as string ||
                     req.cookies?.sessionId ||
                     `${req.user.id}-${Date.now()}`;

    // Update session activity
    const siteId = req.params.siteId || req.query.siteId as string || req.user.siteId;

    auditingService.updateSessionActivity(sessionId, siteId).catch((error) => {
      logger.error('Failed to update session activity:', error);
    });

    next();
  } catch (error) {
    logger.error('Session tracking middleware error:', error);
    next(); // Don't block the request for session tracking errors
  }
};

/**
 * Security monitoring middleware
 * Detects and logs suspicious activity patterns
 */
export const securityMonitoringMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for suspicious patterns
    await detectSuspiciousActivity(req);
    next();
  } catch (error) {
    logger.error('Security monitoring middleware error:', error);
    next(); // Don't block the request for monitoring errors
  }
};

/**
 * Detect suspicious activity patterns
 */
async function detectSuspiciousActivity(req: Request): Promise<void> {
  // Check for unusual user agent patterns
  const userAgent = req.get('User-Agent');
  if (userAgent && isSuspiciousUserAgent(userAgent)) {
    const securityEvent: SecurityEventData = {
      eventType: SecurityEventType.SUSPICIOUS_IP,
      severity: SecuritySeverity.LOW,
      userId: req.user?.id,
      ip: req.ip,
      userAgent,
      description: `Suspicious user agent detected: ${userAgent}`,
      metadata: {
        endpoint: req.path,
        method: req.method,
        headers: req.headers,
      },
    };

    auditingService.logSecurityEvent(securityEvent).catch((error) => {
      logger.error('Failed to log suspicious user agent event:', error);
    });
  }

  // Check for unusual endpoint access patterns
  if (isHighRiskEndpoint(req.path)) {
    const securityEvent: SecurityEventData = {
      eventType: SecurityEventType.ADMIN_ACTION,
      severity: SecuritySeverity.MEDIUM,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      description: `High-risk endpoint accessed: ${req.method} ${req.path}`,
      metadata: {
        endpoint: req.path,
        method: req.method,
        query: req.query,
        params: req.params,
      },
    };

    auditingService.logSecurityEvent(securityEvent).catch((error) => {
      logger.error('Failed to log high-risk endpoint access:', error);
    });
  }
}

/**
 * Check if user agent is suspicious
 */
function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scanner/i,
    /wget/i,
    /curl/i,
    /python/i,
    /script/i,
  ];

  // Allow legitimate browsers and tools
  const legitimatePatterns = [
    /Mozilla/i,
    /Chrome/i,
    /Safari/i,
    /Firefox/i,
    /Edge/i,
    /Opera/i,
    /Postman/i,
    /Insomnia/i,
  ];

  // If it matches a legitimate pattern, it's not suspicious
  if (legitimatePatterns.some(pattern => pattern.test(userAgent))) {
    return false;
  }

  // If it matches a suspicious pattern, it's suspicious
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Check if endpoint is high-risk
 */
function isHighRiskEndpoint(path: string): boolean {
  const highRiskPatterns = [
    /\/admin/i,
    /\/users\/\w+\/permissions/i,
    /\/users\/\w+\/roles/i,
    /\/roles/i,
    /\/permissions/i,
    /\/auth\/admin/i,
    /\/system/i,
    /\/config/i,
    /\/debug/i,
    /\/delete/i,
    /\/audit/i,
  ];

  return highRiskPatterns.some(pattern => pattern.test(path));
}

/**
 * Convenience function to create audit-enabled permission middleware
 * This is the main function that applications should use
 */
export const createAuditedPermissionMiddleware = (permission: string) => {
  return requirePermissionWithAudit(permission);
};

/**
 * Convenience function to create audit-enabled role middleware
 */
export const createAuditedRoleMiddleware = (role: string) => {
  return requireRoleWithAudit(role);
};

/**
 * Convenience function to create audit-enabled multiple role middleware
 */
export const createAuditedMultiRoleMiddleware = (roles: string[]) => {
  return requireAnyRoleWithAudit(roles);
};

// Export commonly used audit-enabled middleware
export const requireQualityAccessWithAudit = requireAnyRoleWithAudit([
  'System Administrator',
  'Quality Engineer',
  'Quality Inspector'
]);

export const requireProductionAccessWithAudit = requireAnyRoleWithAudit([
  'System Administrator',
  'Plant Manager',
  'Production Supervisor',
  'Production Planner',
  'Production Operator',
  'Manufacturing Engineer'
]);

export const requireMaintenanceAccessWithAudit = requireAnyRoleWithAudit([
  'System Administrator',
  'Plant Manager',
  'Maintenance Technician'
]);

export const requireManagementAccessWithAudit = requireAnyRoleWithAudit([
  'System Administrator',
  'Plant Manager'
]);

export default {
  requirePermissionWithAudit,
  requireRoleWithAudit,
  requireAnyRoleWithAudit,
  requireAllPermissionsWithAudit,
  requireSiteAccessWithAudit,
  sessionTrackingMiddleware,
  securityMonitoringMiddleware,
  createAuditedPermissionMiddleware,
  createAuditedRoleMiddleware,
  createAuditedMultiRoleMiddleware,
};