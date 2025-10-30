/**
 * CSRF Protection Middleware
 * Implements Double-Submit Cookie Pattern for JWT-based authentication
 * Part of GitHub Issue #117 - Cross-Site Request Forgery Protection
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import { AppError } from './errorHandler';

export interface CSRFTokenPair {
  clientToken: string;
  serverToken: string;
}

/**
 * Generate CSRF token pair using Double-Submit Cookie Pattern
 * Client token is sent to client, server token is stored in secure cookie
 */
export function generateCSRFTokenPair(): CSRFTokenPair {
  const clientToken = uuidv4();
  const serverToken = crypto
    .createHash('sha256')
    .update(clientToken + process.env.SESSION_SECRET)
    .digest('hex');

  return { clientToken, serverToken };
}

/**
 * Verify CSRF token pair
 * @param clientToken Token sent from client
 * @param serverToken Token stored in cookie
 */
export function verifyCSRFTokenPair(clientToken: string, serverToken: string): boolean {
  if (!clientToken || !serverToken) {
    return false;
  }

  try {
    const expectedServerToken = crypto
      .createHash('sha256')
      .update(clientToken + process.env.SESSION_SECRET)
      .digest('hex');

    // Ensure both tokens are valid hex strings and same length
    if (expectedServerToken.length !== serverToken.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedServerToken, 'hex'),
      Buffer.from(serverToken, 'hex')
    );
  } catch (error) {
    // Invalid token format (not valid hex, etc.)
    return false;
  }
}

/**
 * Middleware to inject CSRF token for GET requests and authenticated users
 * This allows clients to obtain CSRF tokens for subsequent state-changing requests
 */
export const injectCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  // Only generate tokens for GET requests to authenticated endpoints
  if (req.method === 'GET' && req.user) {
    const tokenPair = generateCSRFTokenPair();

    // Store server token in secure HTTP-only cookie
    res.cookie('X-CSRF-Server-Token', tokenPair.serverToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
      path: '/'
    });

    // Send client token in response header
    res.setHeader('X-CSRF-Client-Token', tokenPair.clientToken);

    logger.debug('CSRF token pair generated', {
      userId: req.user.id,
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
  }

  next();
};

/**
 * Middleware to validate CSRF tokens for state-changing requests
 * Protects POST, PUT, PATCH, DELETE operations
 */
export const validateCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip validation for safe HTTP methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip validation for unauthenticated requests
    if (!req.user) {
      return next();
    }

    const clientToken = req.headers['x-csrf-client-token'] as string;
    const serverToken = req.cookies['X-CSRF-Server-Token'] as string;

    // Check if tokens are present
    if (!clientToken || !serverToken) {
      logger.warn('CSRF tokens missing', {
        userId: req.user.id,
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        hasClientToken: !!clientToken,
        hasServerToken: !!serverToken
      });

      throw new AppError('CSRF token is required for this request', 403, 'CSRF_TOKEN_MISSING');
    }

    // Verify token pair
    if (!verifyCSRFTokenPair(clientToken, serverToken)) {
      logger.warn('CSRF token validation failed', {
        userId: req.user.id,
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        reason: 'Token pair mismatch'
      });

      throw new AppError('CSRF token is invalid or expired', 403, 'CSRF_TOKEN_INVALID');
    }

    logger.debug('CSRF token validation successful', {
      userId: req.user.id,
      ip: req.ip,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    if (error instanceof AppError) {
      // Use existing error handling infrastructure
      next(error);
    } else {
      logger.error('CSRF validation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        ip: req.ip,
        path: req.path,
        method: req.method
      });

      next(new AppError('CSRF validation failed', 500, 'CSRF_VALIDATION_ERROR'));
    }
  }
};

/**
 * Combined CSRF middleware that handles both token injection and validation
 * Automatically determines behavior based on request method and authentication status
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // First inject tokens for GET requests
  injectCSRFToken(req, res, (err) => {
    if (err) return next(err);

    // Then validate tokens for state-changing requests
    validateCSRFToken(req, res, next);
  });
};

/**
 * Middleware to bypass CSRF protection for specific routes
 * Use sparingly and only for public APIs that don't modify user state
 */
export const bypassCSRF = (req: Request, res: Response, next: NextFunction) => {
  // Mark request as CSRF-exempt
  (req as any).csrfExempt = true;
  next();
};

/**
 * Get CSRF token for authenticated user
 * Utility function for manual token generation
 */
export const getCSRFToken = (req: Request): string | null => {
  if (!req.user) return null;

  const tokenPair = generateCSRFTokenPair();
  return tokenPair.clientToken;
};

export default {
  generateCSRFTokenPair,
  verifyCSRFTokenPair,
  injectCSRFToken,
  validateCSRFToken,
  csrfProtection,
  bypassCSRF,
  getCSRFToken
};