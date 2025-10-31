/**
 * API Key Authentication Middleware
 *
 * Extracts and validates API keys from Authorization headers.
 * Attaches validated key information to the request object.
 *
 * @module middleware/api-key-auth
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../modules/api-keys/api-key.service';
import { logger } from '../utils/logger';

// Extend Express Request to include API key information
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        name: string;
        tier: string;
        scopes: string[];
        companyId?: string;
        siteId?: string;
        rateLimit?: any;
      };
    }
  }
}

/**
 * API Key Authentication Middleware
 *
 * Validates API key from Authorization header (Bearer token)
 * and attaches key details to request object.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export const apiKeyAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip authentication for health check and public endpoints
    if (req.path === '/health' || req.path === '/api/public/status') {
      return next();
    }

    // Extract API key from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required. Include it in the Authorization header as "Bearer {api_key}".'
      });
      return;
    }

    // Check for Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization format. Use "Bearer {api_key}".'
      });
      return;
    }

    // Extract the API key
    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is missing from Authorization header.'
      });
      return;
    }

    // Validate the API key
    const validatedKey = await apiKeyService.validateApiKey(apiKey);

    if (!validatedKey) {
      logger.warn('Invalid or expired API key attempt', {
        keyPrefix: apiKey.substring(0, 10),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        endpoint: req.path
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid, expired, or revoked API key.'
      });
      return;
    }

    // Attach validated key to request
    req.apiKey = validatedKey;

    logger.debug('API key authenticated', {
      keyId: validatedKey.id,
      tier: validatedKey.tier,
      endpoint: req.path
    });

    next();
  } catch (error) {
    logger.error('Error in API key authentication middleware', {
      error,
      path: req.path
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during authentication.'
    });
  }
};

/**
 * Optional API Key Authentication Middleware
 *
 * Validates API key if present, but allows request to proceed without it.
 * Useful for endpoints that have both public and authenticated access.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export const optionalApiKeyAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // If no auth header, proceed without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const apiKey = authHeader.substring(7);

    if (apiKey) {
      // Validate if provided
      const validatedKey = await apiKeyService.validateApiKey(apiKey);

      if (validatedKey) {
        req.apiKey = validatedKey;
      }
    }

    next();
  } catch (error) {
    logger.error('Error in optional API key authentication middleware', {
      error,
      path: req.path
    });

    // Don't fail the request, just proceed without authentication
    next();
  }
};
