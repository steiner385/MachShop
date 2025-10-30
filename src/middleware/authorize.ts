/**
 * Authorization Middleware for Torque System
 * Simplified role-based authorization for torque management operations
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Authorization middleware factory that checks user roles
 */
export function authorize(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has at least one of the required roles
    const hasRequiredRole = allowedRoles.some(role =>
      req.user.roles.includes(role)
    );

    // System administrators can access everything
    const isSystemAdmin = req.user.roles.includes('System Administrator') ||
                         req.user.roles.includes('admin');

    if (!hasRequiredRole && !isSystemAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        details: `One of these roles required: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Torque-specific authorization helpers
 */

// Quality engineers and administrators can manage torque specifications
export const authorizeTorqueSpecManagement = authorize([
  'quality_engineer',
  'manufacturing_engineer',
  'Quality Engineer',
  'Manufacturing Engineer',
  'admin',
  'System Administrator'
]);

// Production operators can record torque events
export const authorizeTorqueExecution = authorize([
  'production_operator',
  'quality_technician',
  'manufacturing_engineer',
  'quality_engineer',
  'Production Operator',
  'Quality Technician',
  'Manufacturing Engineer',
  'Quality Engineer',
  'admin',
  'System Administrator'
]);

// Supervisors can review and approve torque operations
export const authorizeTorqueSupervision = authorize([
  'production_supervisor',
  'quality_supervisor',
  'manufacturing_engineer',
  'quality_engineer',
  'Production Supervisor',
  'Quality Supervisor',
  'Manufacturing Engineer',
  'Quality Engineer',
  'admin',
  'System Administrator'
]);

// System configuration requires higher privileges
export const authorizeSystemConfiguration = authorize([
  'manufacturing_engineer',
  'quality_engineer',
  'Manufacturing Engineer',
  'Quality Engineer',
  'admin',
  'System Administrator'
]);

export default authorize;