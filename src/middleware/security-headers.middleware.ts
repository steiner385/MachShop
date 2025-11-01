/**
 * Security Headers Middleware
 *
 * Adds HTTP security headers to all API responses.
 * Protects against common web vulnerabilities (XSS, clickjacking, etc.)
 *
 * @module middleware/security-headers
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Security headers configuration
 */
const SECURITY_HEADERS = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Content Security Policy (permissive for APIs, tighten as needed)
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",

  // Permissions Policy (formerly Feature Policy)
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',

  // HSTS (strict transport security) - only on HTTPS
  // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

/**
 * Security headers middleware
 * Adds HTTP security headers to response
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });

  // Add custom API headers
  res.setHeader('X-API-Version', '2.0');
  res.setHeader('X-Powered-By', 'MachShop MES');

  // Remove default headers that could leak info
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');

  // HSTS header only on HTTPS
  if (req.secure || process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  next();
};

/**
 * API versioning header middleware
 * Validates and tracks API version
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export const apiVersioningMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Get API version from header (default to v2)
  const apiVersion = req.headers['api-version'] as string || 'v2';

  // Store on request for later use
  req.apiVersion = apiVersion;

  // Validate version
  const validVersions = ['v1', 'v2', 'v3'];
  if (!validVersions.includes(apiVersion)) {
    return res.status(400).json({
      error: 'Invalid API Version',
      message: `API version '${apiVersion}' is not supported. Supported versions: ${validVersions.join(', ')}`
    });
  }

  // Add deprecation warning for v1
  if (apiVersion === 'v1') {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString());
    res.setHeader(
      'Link',
      '</api/v2/>; rel="successor-version"'
    );
  }

  next();
};

/**
 * Request ID middleware
 * Ensures all requests have a unique ID for tracing
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  // Store on request
  req.id = requestId;

  // Add to response headers
  res.setHeader('X-Request-ID', requestId);

  // Add to response headers for easy tracing
  res.setHeader('X-Trace-ID', requestId);

  next();
};

/**
 * Generate a unique request ID
 * Format: timestamp-random
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}

/**
 * Extend Express Request type to include apiVersion and id
 */
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
      id?: string;
    }
  }
}
