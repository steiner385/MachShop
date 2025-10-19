/**
 * Authentication Middleware
 * Middleware functions for JWT verification and authorization
 */

import { Request, Response, NextFunction } from 'express';
import { getTokenService } from '../services/TokenService';
import { JWTPayload, AuthenticatedRequest } from '../types';

const tokenService = getTokenService();

/**
 * Authentication middleware - verifies JWT token
 * Attaches decoded user payload to req.user
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify and decode token
      const decoded = tokenService.verifyAccessToken(token);

      // Attach user to request
      req.user = decoded;

      // Log authentication event
      console.log(`[AUTH] User authenticated: ${decoded.username} (${decoded.userId})`);

      next();
    } catch (error: any) {
      console.error('[AUTH] Token verification failed:', error.message);

      res.status(401).json({
        error: 'Unauthorized',
        message: error.message === 'Token has expired'
          ? 'Token has expired'
          : 'Invalid token',
      });
    }
  } catch (error) {
    console.error('[AUTH] Authentication middleware error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Require specific permission middleware
 */
export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const hasPermission = req.user.permissions.includes(permission);

      if (!hasPermission) {
        console.log(
          `[AUTH] Permission denied: User ${req.user.username} does not have permission '${permission}'`
        );

        res.status(403).json({
          error: 'Forbidden',
          message: `You do not have permission to perform this action (${permission})`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('[AUTH] Permission check error:', error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Permission check failed',
      });
    }
  };
}

/**
 * Require specific role middleware
 */
export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const hasRole = req.user.roles.includes(role);

      if (!hasRole) {
        console.log(
          `[AUTH] Access denied: User ${req.user.username} does not have role '${role}'`
        );

        res.status(403).json({
          error: 'Forbidden',
          message: `You do not have the required role to perform this action (${role})`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('[AUTH] Role check error:', error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Role check failed',
      });
    }
  };
}

/**
 * Require any of the specified roles middleware
 */
export function requireAnyRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const hasAnyRole = roles.some(role => req.user!.roles.includes(role));

      if (!hasAnyRole) {
        console.log(
          `[AUTH] Access denied: User ${req.user.username} does not have any of the required roles [${roles.join(', ')}]`
        );

        res.status(403).json({
          error: 'Forbidden',
          message: `You do not have any of the required roles to perform this action`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('[AUTH] Role check error:', error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Role check failed',
      });
    }
  };
}

/**
 * Require site access middleware
 * Ensures user belongs to the specified site
 */
export function requireSiteAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // System administrators can access all sites
    const isSystemAdmin = req.user.roles.includes('System Administrator');
    if (isSystemAdmin) {
      next();
      return;
    }

    // Check if user has site access
    const requestedSiteId = req.params.siteId || req.body.siteId || req.query.siteId;

    if (!requestedSiteId) {
      // If no site is specified, allow access (will be handled by business logic)
      next();
      return;
    }

    if (req.user.siteId !== requestedSiteId) {
      console.log(
        `[AUTH] Site access denied: User ${req.user.username} (site: ${req.user.siteId}) tried to access site ${requestedSiteId}`
      );

      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this site',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[AUTH] Site access check error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Site access check failed',
    });
  }
}

/**
 * Require resource ownership middleware
 * Ensures user owns the resource or has admin privileges
 */
export function requireResourceOwnership(userIdField: string = 'userId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      // System administrators can access all resources
      const isSystemAdmin = req.user.roles.includes('System Administrator');
      if (isSystemAdmin) {
        next();
        return;
      }

      // Check resource ownership
      const resourceUserId = req.params[userIdField] || req.body[userIdField] || req.query[userIdField];

      if (!resourceUserId) {
        // If no user ID specified, allow (will be handled by business logic)
        next();
        return;
      }

      if (req.user.userId !== resourceUserId) {
        console.log(
          `[AUTH] Resource ownership denied: User ${req.user.username} tried to access resource owned by ${resourceUserId}`
        );

        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this resource',
        });
        return;
      }

      next();
    } catch (error) {
      console.error('[AUTH] Resource ownership check error:', error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Resource ownership check failed',
      });
    }
  };
}

/**
 * Predefined role groups for common access patterns
 */

// Quality-related roles
export const requireQualityAccess = requireAnyRole([
  'Quality Engineer',
  'Quality Manager',
  'Plant Manager',
  'System Administrator',
]);

// Production-related roles
export const requireProductionAccess = requireAnyRole([
  'Production Operator',
  'Production Supervisor',
  'Production Manager',
  'Plant Manager',
  'System Administrator',
]);

// Maintenance-related roles
export const requireMaintenanceAccess = requireAnyRole([
  'Maintenance Technician',
  'Maintenance Supervisor',
  'Plant Manager',
  'System Administrator',
]);

// Management-related roles
export const requireManagementAccess = requireAnyRole([
  'Production Manager',
  'Quality Manager',
  'Plant Manager',
  'System Administrator',
]);

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require authentication
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = tokenService.verifyAccessToken(token);
      req.user = decoded;
      console.log(`[AUTH] Optional auth: User authenticated: ${decoded.username}`);
    } catch (error) {
      // Token invalid, but that's okay for optional auth
      console.log('[AUTH] Optional auth: Invalid token, continuing without auth');
    }

    next();
  } catch (error) {
    console.error('[AUTH] Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
}

export default {
  authMiddleware,
  requirePermission,
  requireRole,
  requireAnyRole,
  requireSiteAccess,
  requireResourceOwnership,
  requireQualityAccess,
  requireProductionAccess,
  requireMaintenanceAccess,
  requireManagementAccess,
  optionalAuth,
};
