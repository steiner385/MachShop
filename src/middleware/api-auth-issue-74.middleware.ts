/**
 * ✅ GITHUB ISSUE #74: API Access Control & Security Model - Phase 1-2
 * API Authentication Middleware
 *
 * Handles:
 * - Extract API key from headers or query params
 * - Validate key signature/format
 * - Authenticate against database
 * - Attach auth context to request
 * - Log failed authentication attempts
 */

import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/ApiKeyService';
import { accessControlService } from '../services/ApiAccessControlService';
import { ApiAuthContext, AuthenticatedApiRequest } from '../types/security';
import { AppError } from '../middleware/errorHandler';

/**
 * Attach API auth context to request
 */
declare global {
  namespace Express {
    interface Request {
      apiAuth?: ApiAuthContext;
      requestId?: string;
    }
  }
}

/**
 * API Key Authentication Middleware
 * Extracts and validates API key from request headers or query params
 */
export const apiAuthentication = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Generate request ID for tracing
    const requestId =
      req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.requestId = requestId as string;

    // Extract API key from headers or query params
    let apiKey: string | undefined;

    // Try Authorization header with Bearer scheme first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }

    // Try X-API-Key header
    if (!apiKey) {
      apiKey = req.headers['x-api-key'] as string;
    }

    // Try query parameter (less secure but sometimes needed)
    if (!apiKey && req.query.api_key) {
      apiKey = req.query.api_key as string;
    }

    if (!apiKey) {
      // No authentication provided - continue as unauthenticated
      // Some endpoints don't require authentication
      return next();
    }

    // Authenticate the API key
    const authResult = await apiKeyService.authenticateKey(apiKey);

    if (!authResult.success) {
      // Log failed authentication attempt
      console.warn(`Authentication failed for request ${requestId}: ${authResult.error}`);

      // Return 401 Unauthorized
      throw new AppError('Invalid or expired API key', 401);
    }

    // Get key details with roles
    const keyDetails = await apiKeyService.getKeyWithRoles(authResult.apiKeyId!);

    if (!keyDetails) {
      throw new AppError('API key not found', 401);
    }

    // Attach authentication context to request
    req.apiAuth = {
      apiKeyId: authResult.apiKeyId!,
      userId: keyDetails.ownerId?.includes('user_') ? keyDetails.ownerId : undefined,
      serviceAccountId: keyDetails.ownerId?.includes('svc_') ? keyDetails.ownerId : undefined,
      roles: keyDetails.roles.map((r: any) => r.roleId),
      permissions: keyDetails.permissions,
      scopes: keyDetails.permissions,
      authenticatedAt: new Date(),
      expiresAt: keyDetails.expiresAt,
    };

    // Log successful authentication
    console.debug(
      `Authenticated API key: ${keyDetails.keyPrefix} (${keyDetails.name}) for request ${requestId}`,
    );

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.message,
        requestId: req.requestId,
      });
    }

    console.error(`Authentication middleware error for request ${req.requestId}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      requestId: req.requestId,
    });
  }
};

/**
 * Require API authentication for endpoint
 * Returns 401 if not authenticated
 */
export const requireApiAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.apiAuth) {
    res.status(401).json({
      error: 'API authentication required',
      requestId: req.requestId,
    });
    return;
  }

  next();
};

/**
 * Check specific permission/scope
 */
export const requirePermission = (requiredScope: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.apiAuth) {
      res.status(401).json({
        error: 'API authentication required',
        requestId: req.requestId,
      });
      return;
    }

    try {
      const result = await accessControlService.checkPermission(
        req.apiAuth.apiKeyId,
        requiredScope,
      );

      if (!result.allowed) {
        res.status(403).json({
          error: result.reason || 'Insufficient permissions',
          requiredPermission: result.requiredPermission,
          requestId: req.requestId,
        });
        return;
      }

      next();
    } catch (error) {
      console.error(`Permission check error for request ${req.requestId}:`, error);
      res.status(500).json({
        error: 'Permission check failed',
        requestId: req.requestId,
      });
    }
  };
};

/**
 * Check multiple scopes (requires all)
 */
export const requireScopes = (requiredScopes: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.apiAuth) {
      res.status(401).json({
        error: 'API authentication required',
        requestId: req.requestId,
      });
      return;
    }

    try {
      const result = await accessControlService.validateScopes(
        req.apiAuth.apiKeyId,
        requiredScopes,
      );

      if (!result.valid) {
        res.status(403).json({
          error: result.reason || 'Insufficient scopes',
          missingScopes: result.missingScopes,
          requestId: req.requestId,
        });
        return;
      }

      next();
    } catch (error) {
      console.error(`Scope validation error for request ${req.requestId}:`, error);
      res.status(500).json({
        error: 'Scope validation failed',
        requestId: req.requestId,
      });
    }
  };
};
