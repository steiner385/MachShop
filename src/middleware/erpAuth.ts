/**
 * ERP Authorization Middleware
 * Issue #60: Phase 7 - Authorization and validation for ERP operations
 *
 * Provides role-based access control, request validation, rate limiting,
 * and audit logging for ERP integration endpoints
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import { AuthorizationError } from './errorHandler';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ERP Integration permission constants
 */
export const ERP_PERMISSIONS = {
  VIEW: 'erp:view',
  CREATE: 'erp:create',
  UPDATE: 'erp:update',
  DELETE: 'erp:delete',
  SYNC: 'erp:sync',
  RECONCILIATION: 'erp:reconciliation',
  CORRECTION: 'erp:correction',
  ADMIN: 'erp:admin',
};

/**
 * Verify user has ERP admin or operator permissions
 * Allows operations on ERP integrations
 */
export const requireERPAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AuthorizationError('Authentication required');
  }

  // Check for ERP-specific permissions or admin role
  const hasERPAccess = req.user.roles?.includes('admin') ||
                       req.user.roles?.includes('erp_admin') ||
                       req.user.permissions?.includes(ERP_PERMISSIONS.VIEW) ||
                       req.user.permissions?.includes(ERP_PERMISSIONS.ADMIN);

  if (!hasERPAccess) {
    logger.warn('Unauthorized ERP access attempt', {
      userId: req.user.id,
      username: req.user.username,
      path: req.path,
      method: req.method,
    });
    throw new AuthorizationError('ERP access permission required');
  }

  next();
};

/**
 * Verify user can create/modify ERP integrations
 * Requires erp:admin or erp:create permission
 */
export const requireERPModification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AuthorizationError('Authentication required');
  }

  const hasModifyPermission = req.user.roles?.includes('admin') ||
                              req.user.roles?.includes('erp_admin') ||
                              req.user.permissions?.includes(ERP_PERMISSIONS.CREATE) ||
                              req.user.permissions?.includes(ERP_PERMISSIONS.UPDATE) ||
                              req.user.permissions?.includes(ERP_PERMISSIONS.ADMIN);

  if (!hasModifyPermission) {
    logger.warn('Unauthorized ERP modification attempt', {
      userId: req.user.id,
      username: req.user.username,
      path: req.path,
      method: req.method,
    });
    throw new AuthorizationError('ERP modification permission required');
  }

  next();
};

/**
 * Verify user can trigger sync operations
 * Requires erp:sync or erp:admin permission
 */
export const requireERPSyncPermission = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AuthorizationError('Authentication required');
  }

  const hasSyncPermission = req.user.roles?.includes('admin') ||
                            req.user.roles?.includes('erp_admin') ||
                            req.user.permissions?.includes(ERP_PERMISSIONS.SYNC) ||
                            req.user.permissions?.includes(ERP_PERMISSIONS.ADMIN);

  if (!hasSyncPermission) {
    logger.warn('Unauthorized ERP sync attempt', {
      userId: req.user.id,
      username: req.user.username,
      path: req.path,
      integrationId: req.params.id,
    });
    throw new AuthorizationError('ERP sync permission required');
  }

  next();
};

/**
 * Verify user can perform reconciliation operations
 * Requires erp:reconciliation or erp:admin permission
 */
export const requireERPReconciliationPermission = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AuthorizationError('Authentication required');
  }

  const hasReconciliationPermission = req.user.roles?.includes('admin') ||
                                      req.user.roles?.includes('erp_admin') ||
                                      req.user.permissions?.includes(ERP_PERMISSIONS.RECONCILIATION) ||
                                      req.user.permissions?.includes(ERP_PERMISSIONS.ADMIN);

  if (!hasReconciliationPermission) {
    logger.warn('Unauthorized ERP reconciliation attempt', {
      userId: req.user.id,
      username: req.user.username,
      path: req.path,
      integrationId: req.params.id,
    });
    throw new AuthorizationError('ERP reconciliation permission required');
  }

  next();
};

/**
 * Verify user can apply corrections to discrepancies
 * Requires erp:correction or erp:admin permission
 */
export const requireERPCorrectionPermission = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AuthorizationError('Authentication required');
  }

  const hasCorrectionPermission = req.user.roles?.includes('admin') ||
                                  req.user.roles?.includes('erp_admin') ||
                                  req.user.permissions?.includes(ERP_PERMISSIONS.CORRECTION) ||
                                  req.user.permissions?.includes(ERP_PERMISSIONS.ADMIN);

  if (!hasCorrectionPermission) {
    logger.warn('Unauthorized ERP correction attempt', {
      userId: req.user.id,
      username: req.user.username,
      path: req.path,
      discrepancyId: req.params.discrepancyId,
    });
    throw new AuthorizationError('ERP correction permission required');
  }

  next();
};

/**
 * Rate limiter for sync operations (stricter limits than general API)
 * Prevents excessive sync job queue flooding
 */
export const syncRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Max 20 sync operations per hour per user/IP
  message: 'Too many sync operations, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id || req.ip || 'unknown';
  },
  skip: (req: Request) => {
    // Skip rate limiting for admins
    return req.user?.roles?.includes('admin') || false;
  },
});

/**
 * Rate limiter for reconciliation operations
 * Prevents excessive reconciliation runs
 */
export const reconciliationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 reconciliations per hour per user/IP
  message: 'Too many reconciliation operations, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.id || req.ip || 'unknown';
  },
  skip: (req: Request) => {
    return req.user?.roles?.includes('admin') || false;
  },
});

/**
 * Validate ERP integration exists and user has access
 * Must be used after authentication middleware
 */
export const validateERPIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Integration ID is required and must be a string',
      });
    }

    // Check if integration exists
    const integration = await prisma.erpIntegration.findUnique({
      where: { id },
      select: { id: true, name: true, erpSystem: true, createdBy: true },
    });

    if (!integration) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'ERP integration not found',
      });
    }

    // Attach integration info to request for use in controllers
    (req as any).erpIntegration = integration;

    logger.info('ERP integration accessed', {
      userId: req.user?.id,
      integrationId: id,
      integrationName: integration.name,
      operation: req.method,
    });

    next();
  } catch (error) {
    logger.error('Error validating ERP integration', {
      error: error instanceof Error ? error.message : String(error),
      integrationId: req.params.id,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'VALIDATION_ERROR',
      message: 'Failed to validate ERP integration',
    });
  }
};

/**
 * Audit log for all ERP operations
 * Logs every request to ERP endpoints for compliance
 */
export const erpAuditLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Capture the original res.json
  const originalJson = res.json.bind(res);

  // Override res.json to log the response
  res.json = function(data: any) {
    const duration = Date.now() - startTime;

    logger.info('ERP operation completed', {
      userId: req.user?.id,
      username: req.user?.username,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      integrationId: req.params.id || req.params.discrepancyId || 'N/A',
      ipAddress: req.ip,
    });

    return originalJson(data);
  };

  next();
};

/**
 * Validate request body for ERP operations
 * Checks for required fields based on operation type
 */
export const validateERPRequest = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = requiredFields.filter(field => !req.body[field]);

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields',
        missing,
      });
    }

    next();
  };
};

/**
 * Sanitize ERP configuration to prevent secret leakage in logs
 */
export const sanitizeERPConfig = (config: any): any => {
  if (!config) return config;

  const sensitiveFields = ['password', 'apiPassword', 'secret', 'token', 'apiKey'];
  const sanitized = { ...config };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
};

/**
 * Validate ERP sync job parameters
 */
export const validateSyncJobRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { jobType, batchSize, dryRun } = req.body;

  const validJobTypes = [
    'SUPPLIER_SYNC',
    'PO_SYNC',
    'COST_SYNC',
    'SHIPMENT_SYNC',
    'INVENTORY_SYNC',
  ];

  if (!jobType || !validJobTypes.includes(jobType)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid or missing jobType',
      validJobTypes,
    });
  }

  if (batchSize && (typeof batchSize !== 'number' || batchSize < 1)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'batchSize must be a positive number',
    });
  }

  if (dryRun && typeof dryRun !== 'boolean') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'dryRun must be a boolean',
    });
  }

  next();
};

/**
 * Validate reconciliation request parameters
 */
export const validateReconciliationRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { entityType } = req.body;

  const validEntityTypes = ['Supplier', 'PurchaseOrder', 'Inventory'];

  if (!entityType || !validEntityTypes.includes(entityType)) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid or missing entityType',
      validEntityTypes,
    });
  }

  next();
};

export default {
  requireERPAccess,
  requireERPModification,
  requireERPSyncPermission,
  requireERPReconciliationPermission,
  requireERPCorrectionPermission,
  syncRateLimiter,
  reconciliationRateLimiter,
  validateERPIntegration,
  erpAuditLogger,
  validateERPRequest,
  sanitizeERPConfig,
  validateSyncJobRequest,
  validateReconciliationRequest,
};
