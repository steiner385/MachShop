/**
 * Audit Logger Middleware
 *
 * Captures all API requests and responses for audit trail.
 * Logs to database asynchronously without blocking request/response cycle.
 *
 * @module middleware/audit-logger
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { auditLoggerService } from '../modules/audit/audit-logger.service';
import { logger } from '../utils/logger';

/**
 * Capture response body size
 */
let originalSend: any;

/**
 * Audit logger middleware
 * Records all API requests and responses
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export const auditLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID for tracing
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  const startTime = Date.now();

  // Store request ID on request object
  req.id = requestId;

  // Capture original response.json
  originalSend = res.send;
  let responseBody = '';
  let responseSize = 0;

  // Override send to capture response
  res.send = function (data: any) {
    if (data) {
      if (typeof data === 'string') {
        responseBody = data;
        responseSize = Buffer.byteLength(data);
      } else {
        responseBody = JSON.stringify(data);
        responseSize = Buffer.byteLength(responseBody);
      }
    }

    // Call original send
    return originalSend.call(this, data);
  };

  // Intercept res.end to log request
  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    try {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      const apiKey = req.apiKey;

      // Only log API requests (those with API keys)
      if (apiKey) {
        // Calculate request size (headers + body)
        const requestSize = JSON.stringify(req.body || {}).length;

        // Determine error details if status is error
        let errorCode: string | undefined;
        let errorMessage: string | undefined;

        if (statusCode >= 400) {
          try {
            const parsed = JSON.parse(responseBody);
            errorCode = parsed.error || `HTTP_${statusCode}`;
            errorMessage = parsed.message || '';
          } catch {
            errorCode = `HTTP_${statusCode}`;
            errorMessage = res.statusMessage || '';
          }
        }

        // Create audit log entry
        auditLoggerService.logRequest({
          apiKeyId: apiKey.id,
          endpoint: req.path,
          httpMethod: req.method,
          apiVersion: req.headers['api-version'] as string,
          statusCode,
          responseTime,
          requestId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          rateLimitRemaining: parseInt(res.getHeader('x-ratelimit-remaining') as string) || undefined,
          rateLimitReset: res.getHeader('x-ratelimit-reset') ? new Date(res.getHeader('x-ratelimit-reset') as string) : undefined,
          errorCode,
          errorMessage,
          requestBytes: requestSize,
          responseBytes: responseSize
        });

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          logger.info(`API Request: ${req.method} ${req.path}`, {
            requestId,
            statusCode,
            responseTime: `${responseTime}ms`,
            apiKeyId: apiKey.id,
            tier: apiKey.tier
          });
        }
      }
    } catch (error) {
      logger.error('Error in audit logger middleware', { error, requestId });
    }

    // Call original end
    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Extend Express Request type to include request ID
 */
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
