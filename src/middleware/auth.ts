import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { AuthenticationError, AuthorizationError } from './errorHandler';
import { logger } from '../utils/logger';
import {
  hasPermission,
  hasRole,
  hasAllPermissions,
  resolveUserPermissions,
  ResolvedPermissions
} from '../services/permissionService';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        roles: string[];
        permissions: string[];
        siteId?: string;
        // Enhanced RBAC fields
        resolvedPermissions?: ResolvedPermissions;
        isUsingDatabaseRBAC?: boolean;
      };
    }
  }
}

// JWT payload interface
interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  siteId?: string;
  iat: number;
  exp: number;
}

// Authentication middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token is required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new AuthenticationError('Access token is required');
    }

    // ✅ PHASE 6D FIX: Add JWT secret validation logging for debugging
    if (process.env.NODE_ENV === 'test') {
      const currentJwtSecret = config.jwt.secret;
      const envJwtSecret = process.env.JWT_SECRET;

      if (currentJwtSecret !== envJwtSecret) {
        logger.error('JWT secret mismatch detected', {
          configSecret: currentJwtSecret?.substring(0, 10) + '...',
          envSecret: envJwtSecret?.substring(0, 10) + '...',
          token: token.substring(0, 20) + '...'
        });
      }
    }

    // Verify and decode token - use environment variable directly in test mode to avoid config timing issues
    const jwtSecret = process.env.NODE_ENV === 'test' ? process.env.JWT_SECRET : config.jwt.secret;
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // ✅ PHASE 11C FIX: Enhanced debugging for JWT token decoding in test mode
    if (process.env.NODE_ENV === 'test') {
      logger.info('JWT token decoding debug', {
        tokenPrefix: token.substring(0, 20) + '...',
        decodedUserId: decoded.userId,
        decodedUsername: decoded.username,
        decodedEmail: decoded.email,
        decodedRoles: decoded.roles,
        decodedRolesType: typeof decoded.roles,
        decodedRolesIsArray: Array.isArray(decoded.roles),
        decodedPermissions: decoded.permissions,
        decodedSiteId: decoded.siteId,
        rawDecoded: JSON.stringify(decoded, null, 2)
      });
    }

    // Attach user information to request
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      roles: decoded.roles,
      permissions: decoded.permissions,
      siteId: decoded.siteId || undefined
    };

    // ✅ PHASE 11C FIX: Enhanced debugging for req.user assignment in test mode
    if (process.env.NODE_ENV === 'test') {
      logger.info('req.user assignment debug', {
        reqUserId: req.user.id,
        reqUserUsername: req.user.username,
        reqUserRoles: req.user.roles,
        reqUserRolesType: typeof req.user.roles,
        reqUserRolesIsArray: Array.isArray(req.user.roles),
        reqUserPermissions: req.user.permissions,
        reqUserSiteId: req.user.siteId
      });
    }

    // Log authentication for audit
    logger.info('User authenticated', {
      userId: req.user.id,
      username: req.user.username,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid access token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Access token expired'));
    } else {
      next(error);
    }
  }
};

// Authorization middleware factory
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!req.user.permissions.includes(permission)) {
      logger.warn('Authorization failed', {
        userId: req.user.id,
        username: req.user.username,
        requiredPermission: permission,
        userPermissions: req.user.permissions,
        path: req.path,
        method: req.method
      });

      return next(new AuthorizationError(`Permission required: ${permission}`));
    }

    next();
  };
};

// Role-based authorization middleware
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!req.user.roles.includes(role)) {
      logger.warn('Role authorization failed', {
        userId: req.user.id,
        username: req.user.username,
        requiredRole: role,
        userRoles: req.user.roles,
        path: req.path,
        method: req.method
      });

      return next(new AuthorizationError(`Role required: ${role}`));
    }

    next();
  };
};

// Multiple roles authorization (user must have at least one)
export const requireAnyRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    // ✅ PHASE 11A FIX: Enhanced debugging for role comparison issues
    const hasRole = roles.some(role => req.user!.roles.includes(role));

    // Enhanced debugging in test environment
    if (process.env.NODE_ENV === 'test') {
      logger.info('Role authorization debug', {
        userId: req.user.id,
        username: req.user.username,
        requiredRoles: roles,
        userRoles: req.user.roles,
        userRolesType: typeof req.user.roles,
        userRolesIsArray: Array.isArray(req.user.roles),
        hasRole: hasRole,
        individualChecks: roles.map(role => ({
          role,
          roleType: typeof role,
          userHasRole: req.user!.roles.includes(role),
          exactMatches: req.user!.roles.filter(userRole => userRole === role)
        })),
        path: req.path,
        method: req.method
      });
    }

    if (!hasRole) {
      logger.warn('Multiple role authorization failed', {
        userId: req.user.id,
        username: req.user.username,
        requiredRoles: roles,
        userRoles: req.user.roles,
        userRolesRaw: JSON.stringify(req.user.roles),
        individualRoleChecks: roles.map(role => ({
          requiredRole: role,
          userHasRole: req.user!.roles.includes(role),
          matchingUserRoles: req.user!.roles.filter(userRole => userRole === role)
        })),
        path: req.path,
        method: req.method
      });

      return next(new AuthorizationError(`One of these roles required: ${roles.join(', ')}`));
    }

    next();
  };
};

// Site-based authorization middleware
export const requireSiteAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  // Extract site ID from request parameters or query
  const requestedSiteId = req.params.siteId || req.query.siteId;

  if (!requestedSiteId) {
    return next(); // No site restriction needed
  }

  // System administrators can access all sites
  if (req.user.roles.includes('System Administrator')) {
    return next();
  }

  // Check if user has access to the requested site
  if (req.user.siteId && req.user.siteId !== requestedSiteId) {
    logger.warn('Site access denied', {
      userId: req.user.id,
      username: req.user.username,
      userSiteId: req.user.siteId,
      requestedSiteId,
      path: req.path,
      method: req.method
    });

    return next(new AuthorizationError('Access denied to this site'));
  }

  next();
};

// Resource ownership authorization
export const requireResourceOwnership = (
  resourceIdParam: string,
  ownerField: string = 'createdBy'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    // System administrators can access all resources
    if (req.user.roles.includes('System Administrator')) {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    if (!resourceId) {
      return next(new AuthorizationError('Resource ID required'));
    }

    // Note: In a real implementation, you would fetch the resource from the database
    // and check if req.user.id matches the ownerField value
    // For now, we'll just pass through
    next();
  };
};

// Quality engineer authorization for quality operations
export const requireQualityAccess = requireAnyRole([
  'System Administrator',
  'Quality Engineer',
  'Quality Inspector'
]);

// Production authorization for manufacturing operations
export const requireProductionAccess = requireAnyRole([
  'System Administrator',
  'Plant Manager',
  'Production Supervisor',
  'Production Planner',
  'Production Operator',
  'Manufacturing Engineer'
]);

// Maintenance authorization for equipment operations
export const requireMaintenanceAccess = requireAnyRole([
  'System Administrator',
  'Plant Manager',
  'Maintenance Technician'
]);

// Management authorization for administrative operations
export const requireManagementAccess = requireAnyRole([
  'System Administrator',
  'Plant Manager'
]);

// Dashboard authorization - allows production roles OR users with wildcard read permissions (DCMA Inspector)
export const requireDashboardAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  const allowedRoles = [
    'System Administrator',
    'Plant Manager',
    'Production Supervisor',
    'Production Planner',
    'Production Operator'
  ];

  // Check if user has an allowed role
  const hasRole = req.user.roles.some(role => allowedRoles.includes(role));

  // Check if user has wildcard read permission (e.g., DCMA Inspector with *.read)
  const hasWildcardRead = req.user.permissions.includes('*.read') || req.user.permissions.includes('*');

  if (hasRole || hasWildcardRead) {
    return next();
  }

  logger.warn('Dashboard access denied', {
    userId: req.user.id,
    username: req.user.username,
    userRoles: req.user.roles,
    userPermissions: req.user.permissions,
    path: req.path,
    method: req.method
  });

  return next(new AuthorizationError('Dashboard access requires production role or read permissions'));
};

// Routing authorization for routing management operations
export const requireRoutingAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  const allowedRoles = [
    'System Administrator',
    'Manufacturing Engineer',
    'Process Engineer',
    'Production Planner',
    'Plant Manager'
  ];

  // ✅ PHASE 10D FIX: Enhanced routing access validation with comprehensive debugging

  // Normalize user roles (trim whitespace and handle case sensitivity)
  const normalizedUserRoles = req.user.roles.map(role => role.trim());
  const normalizedAllowedRoles = allowedRoles.map(role => role.trim());

  // Check if user has any of the required roles
  const hasRole = normalizedAllowedRoles.some(allowedRole =>
    normalizedUserRoles.some(userRole => userRole === allowedRole)
  );

  // Check for wildcard permission OR specific routing permissions
  const hasWildcardPermission = req.user.permissions.includes('*');
  const hasSpecificRoutingPermission = req.user.permissions.some(perm =>
    perm.startsWith('routings.') || perm === 'routings'
  );
  const isSystemAdmin = normalizedUserRoles.includes('System Administrator');

  // Enhanced debugging in test environment
  if (process.env.NODE_ENV === 'test') {
    logger.info('Routing access check debug info', {
      userId: req.user.id,
      username: req.user.username,
      userRoles: req.user.roles,
      normalizedUserRoles,
      userPermissions: req.user.permissions,
      requiredRoles: allowedRoles,
      hasRole,
      hasWildcardPermission,
      hasSpecificRoutingPermission,
      isSystemAdmin,
      path: req.path,
      method: req.method
    });
  }

  if (hasRole || hasWildcardPermission || hasSpecificRoutingPermission || isSystemAdmin) {
    if (process.env.NODE_ENV === 'test') {
      logger.info('Routing access granted', {
        userId: req.user.id,
        username: req.user.username,
        reason: hasRole ? 'role match' : hasWildcardPermission ? 'wildcard permission' : hasSpecificRoutingPermission ? 'specific routing permission' : 'system admin',
        path: req.path,
        method: req.method
      });
    }
    return next();
  }

  logger.warn('Routing access denied', {
    userId: req.user.id,
    username: req.user.username,
    userRoles: req.user.roles,
    normalizedUserRoles,
    userPermissions: req.user.permissions,
    requiredRoles: allowedRoles,
    hasRole,
    hasWildcardPermission,
    hasSpecificRoutingPermission,
    isSystemAdmin,
    path: req.path,
    method: req.method
  });

  return next(new AuthorizationError('Routing access requires Manufacturing Engineer role or admin permissions'));
};

// Routing write authorization (create/edit routings)
export const requireRoutingWrite = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  const writePermissions = [
    'routings.write',
    'routings.create',
    'routings.update',
    'routings.delete'
  ];

  const hasWritePermission = writePermissions.some(perm =>
    req.user!.permissions.includes(perm)
  );

  if (!hasWritePermission && !req.user.permissions.includes('*')) {
    logger.warn('Routing write access denied', {
      userId: req.user.id,
      username: req.user.username,
      userPermissions: req.user.permissions,
      path: req.path,
      method: req.method
    });

    return next(new AuthorizationError('Routing write permission required'));
  }

  next();
};

// Routing approval authorization
export const requireRoutingApproval = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (!req.user.permissions.includes('routings.approve') &&
      !req.user.permissions.includes('*')) {
    logger.warn('Routing approval access denied', {
      userId: req.user.id,
      username: req.user.username,
      userPermissions: req.user.permissions,
      path: req.path,
      method: req.method
    });

    return next(new AuthorizationError('Routing approval permission required'));
  }

  next();
};

// Routing activation authorization
export const requireRoutingActivation = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

  if (!req.user.permissions.includes('routings.activate') &&
      !req.user.permissions.includes('*')) {
    logger.warn('Routing activation access denied', {
      userId: req.user.id,
      username: req.user.username,
      userPermissions: req.user.permissions,
      path: req.path,
      method: req.method
    });

    return next(new AuthorizationError('Routing activation permission required'));
  }

  next();
};

// Optional authentication middleware (for public endpoints with optional user info)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (token) {
        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

        req.user = {
          id: decoded.userId,
          username: decoded.username,
          email: decoded.email,
          roles: decoded.roles,
          permissions: decoded.permissions,
          siteId: decoded.siteId
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue without user
    next();
  }
};

// ======================================
// DATABASE-DRIVEN RBAC AUTHORIZATION
// GitHub Issue #29: Dynamic Role and Permission System
// ======================================

/**
 * Enhanced permission-based authorization using database-driven RBAC
 * Supports wildcard permissions and site-specific access
 */
export const requirePermissionDB = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    try {
      const siteId = req.params.siteId || req.query.siteId as string || req.user.siteId;
      const hasAccess = await hasPermission(req.user.id, permission, siteId);

      if (!hasAccess) {
        logger.warn('Database permission authorization failed', {
          userId: req.user.id,
          username: req.user.username,
          requiredPermission: permission,
          siteId,
          path: req.path,
          method: req.method
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
        method: req.method
      });

      next();
    } catch (error: any) {
      logger.error('Database permission check failed', {
        userId: req.user.id,
        permission,
        error: error.message,
        stack: error.stack
      });

      return next(new AuthorizationError('Permission check failed'));
    }
  };
};

/**
 * Enhanced role-based authorization using database-driven RBAC
 * Supports both global and site-specific roles
 */
export const requireRoleDB = (role: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    try {
      const siteId = req.params.siteId || req.query.siteId as string || req.user.siteId;
      const hasAccess = await hasRole(req.user.id, role, siteId);

      if (!hasAccess) {
        logger.warn('Database role authorization failed', {
          userId: req.user.id,
          username: req.user.username,
          requiredRole: role,
          siteId,
          path: req.path,
          method: req.method
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
        method: req.method
      });

      next();
    } catch (error: any) {
      logger.error('Database role check failed', {
        userId: req.user.id,
        role,
        error: error.message,
        stack: error.stack
      });

      return next(new AuthorizationError('Role check failed'));
    }
  };
};

/**
 * Enhanced multiple roles authorization using database-driven RBAC
 * User must have at least one of the specified roles
 */
export const requireAnyRoleDB = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    try {
      const siteId = req.params.siteId || req.query.siteId as string || req.user.siteId;

      // Check each role until we find one the user has
      let hasAccess = false;
      for (const role of roles) {
        if (await hasRole(req.user.id, role, siteId)) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess) {
        logger.warn('Database multiple role authorization failed', {
          userId: req.user.id,
          username: req.user.username,
          requiredRoles: roles,
          siteId,
          path: req.path,
          method: req.method
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
        siteId,
        path: req.path,
        method: req.method
      });

      next();
    } catch (error: any) {
      logger.error('Database multiple role check failed', {
        userId: req.user.id,
        roles,
        error: error.message,
        stack: error.stack
      });

      return next(new AuthorizationError('Role check failed'));
    }
  };
};

/**
 * Enhanced permission authorization for multiple permissions
 * User must have ALL specified permissions
 */
export const requireAllPermissionsDB = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    try {
      const siteId = req.params.siteId || req.query.siteId as string || req.user.siteId;
      const hasAccess = await hasAllPermissions(req.user.id, permissions, siteId);

      if (!hasAccess) {
        logger.warn('Database multiple permission authorization failed', {
          userId: req.user.id,
          username: req.user.username,
          requiredPermissions: permissions,
          siteId,
          path: req.path,
          method: req.method
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
        method: req.method
      });

      next();
    } catch (error: any) {
      logger.error('Database multiple permission check failed', {
        userId: req.user.id,
        permissions,
        error: error.message,
        stack: error.stack
      });

      return next(new AuthorizationError('Permission check failed'));
    }
  };
};

/**
 * Enhanced site-based authorization using database-driven RBAC
 * Checks if user has access to specific site through role assignments
 */
export const requireSiteAccessDB = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }

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
      req.user.resolvedPermissions = resolved;
      req.user.isUsingDatabaseRBAC = true;
      return next();
    }

    // Check if user has any roles for this site
    const siteRoleData = resolved.siteRoles.find(sr => sr.siteId === requestedSiteId);
    const hasGlobalRoles = resolved.globalRoles.length > 0;

    if (!siteRoleData && !hasGlobalRoles) {
      logger.warn('Database site access denied', {
        userId: req.user.id,
        username: req.user.username,
        requestedSiteId,
        globalRoleCount: resolved.globalRoles.length,
        siteRoleCount: resolved.siteRoles.length,
        path: req.path,
        method: req.method
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
      siteRoleCount: siteRoleData?.roles.length || 0,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error: any) {
    logger.error('Database site access check failed', {
      userId: req.user.id,
      requestedSiteId: req.params.siteId || req.query.siteId,
      error: error.message,
      stack: error.stack
    });

    return next(new AuthorizationError('Site access check failed'));
  }
};

/**
 * Hybrid authorization middleware that tries database first, falls back to JWT
 * This enables gradual migration from hard-coded to database-driven RBAC
 */
export const requirePermissionHybrid = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    try {
      // Try database-driven permission check first
      const siteId = req.params.siteId || req.query.siteId as string || req.user.siteId;
      const hasDBPermission = await hasPermission(req.user.id, permission, siteId);

      if (hasDBPermission) {
        logger.debug('Hybrid authorization: Database permission granted', {
          userId: req.user.id,
          permission,
          method: 'database'
        });

        if (!req.user.resolvedPermissions) {
          req.user.resolvedPermissions = await resolveUserPermissions(req.user.id, siteId);
          req.user.isUsingDatabaseRBAC = true;
        }

        return next();
      }

      // Fall back to JWT-based permission check
      if (req.user.permissions.includes(permission) || req.user.permissions.includes('*')) {
        logger.debug('Hybrid authorization: JWT permission granted', {
          userId: req.user.id,
          permission,
          method: 'jwt'
        });

        return next();
      }

      // Neither method granted access
      logger.warn('Hybrid authorization failed', {
        userId: req.user.id,
        username: req.user.username,
        requiredPermission: permission,
        jwtPermissions: req.user.permissions,
        siteId,
        path: req.path,
        method: req.method
      });

      return next(new AuthorizationError(`Permission required: ${permission}`));

    } catch (error: any) {
      logger.error('Hybrid permission check failed, falling back to JWT', {
        userId: req.user.id,
        permission,
        error: error.message
      });

      // If database check fails, fall back to JWT
      if (req.user.permissions.includes(permission) || req.user.permissions.includes('*')) {
        return next();
      }

      return next(new AuthorizationError(`Permission required: ${permission}`));
    }
  };
};

export default authMiddleware;