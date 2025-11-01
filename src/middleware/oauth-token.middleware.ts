/**
 * OAuth Token Validation Middleware
 *
 * Validates OAuth access tokens in Authorization header.
 * Extracts token and attaches validated token data to request.
 *
 * @module middleware/oauth-token.middleware
 * @see GitHub Issue #74: API Access Control & Security Model (Phase 4)
 */

import { Request, Response, NextFunction } from 'express';
import { oauthServerService } from '../modules/oauth/services/oauth-server.service';
import { logger } from '../utils/logger';

/**
 * OAuth token validation middleware
 *
 * Expected Authorization header: Bearer <access_token>
 *
 * On success: Attaches token data to req.oauth
 * On failure: Returns 401 Unauthorized
 */
export async function oauthTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header required'
      });
      return;
    }

    // Extract bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization header format. Expected: Bearer <token>'
      });
      return;
    }

    const token = parts[1];

    // Validate token
    const tokenData = await oauthServerService.validateAccessToken(token);

    if (!tokenData || !tokenData.isValid) {
      logger.warn('Invalid OAuth token provided');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired access token'
      });
      return;
    }

    // Check if token has expired
    if (new Date() > tokenData.expiresAt) {
      logger.warn('Expired OAuth token provided');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token has expired'
      });
      return;
    }

    // Attach token data to request
    req.oauth = {
      token,
      clientId: tokenData.clientId,
      userId: tokenData.userId,
      scopes: tokenData.scopes,
      expiresAt: tokenData.expiresAt
    };

    logger.debug('OAuth token validated', {
      clientId: tokenData.clientId,
      scopes: tokenData.scopes.length
    });

    next();
  } catch (error) {
    logger.error('OAuth token validation failed', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Token validation failed'
    });
  }
}

/**
 * OAuth scope validation middleware
 *
 * Requires specific scopes for the endpoint
 *
 * @param requiredScopes - Scopes required for the endpoint
 * @returns Middleware function
 */
export function requireOAuthScopes(requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.oauth) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'OAuth authentication required'
      });
      return;
    }

    const clientScopes = req.oauth.scopes || [];

    // Check if client has all required scopes
    const hasAllScopes = requiredScopes.every(scope =>
      clientScopes.includes(scope) || clientScopes.includes('*')
    );

    if (!hasAllScopes) {
      logger.warn('OAuth scope validation failed', {
        clientId: req.oauth.clientId,
        requiredScopes,
        clientScopes
      });

      res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient scopes. Required: ${requiredScopes.join(', ')}`
      });
      return;
    }

    next();
  };
}

/**
 * Optional OAuth authentication middleware
 *
 * Validates OAuth token if present, but doesn't fail if missing
 * Useful for endpoints that support both authenticated and unauthenticated access
 *
 * @returns Middleware function
 */
export async function optionalOAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided, continue without authentication
      next();
      return;
    }

    // Extract bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      // Invalid header, continue without authentication
      logger.debug('Invalid authorization header format');
      next();
      return;
    }

    const token = parts[1];

    // Validate token
    const tokenData = await oauthServerService.validateAccessToken(token);

    if (tokenData && tokenData.isValid && new Date() < tokenData.expiresAt) {
      // Token is valid, attach to request
      req.oauth = {
        token,
        clientId: tokenData.clientId,
        userId: tokenData.userId,
        scopes: tokenData.scopes,
        expiresAt: tokenData.expiresAt
      };

      logger.debug('Optional OAuth token validated');
    }

    next();
  } catch (error) {
    logger.error('Optional OAuth validation failed', { error });
    // Continue without authentication on error
    next();
  }
}

/**
 * Type augmentation for Express Request
 * Allows access to req.oauth in route handlers
 */
declare global {
  namespace Express {
    interface Request {
      oauth?: {
        token: string;
        clientId: string;
        userId?: string;
        scopes: string[];
        expiresAt: Date;
      };
    }
  }
}
