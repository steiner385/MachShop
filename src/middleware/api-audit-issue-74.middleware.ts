/**
 * ✅ GITHUB ISSUE #74: API Access Control & Security Model - Phase 1-2
 * API Audit Logging Middleware
 *
 * Handles:
 * - Log all API access with full context
 * - Capture request/response timing and sizes
 * - Store in database asynchronously
 * - Track success/failure and error details
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

/**
 * Track request start time and size
 */
export const auditRequestStart = (req: Request, res: Response, next: NextFunction): void => {
  // Track start time
  (req as any).startTime = Date.now();

  // Track request size
  (req as any).requestSize = req.get('content-length') || 0;

  next();
};

/**
 * Log API access asynchronously
 * Applied after response is sent
 */
export const auditAccessLog = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Hook into response to capture status code and size
  const originalJson = res.json;
  const originalSend = res.send;
  let responseBody: string = '';

  res.json = function (data: any) {
    responseBody = JSON.stringify(data);
    res.set('Content-Length', Buffer.byteLength(responseBody).toString());
    return originalJson.call(this, data);
  };

  res.send = function (data: any) {
    responseBody = data.toString();
    return originalSend.call(this, data);
  };

  // Log after response is sent
  res.on('finish', () => {
    // Only log API endpoints
    if (!req.path.startsWith('/api/')) {
      return;
    }

    // Skip health check endpoints
    if (req.path.includes('/health') || req.path.includes('/status')) {
      return;
    }

    // Capture timing and response info
    const responseTime = Date.now() - ((req as any).startTime || Date.now());
    const responseSize = parseInt(res.get('content-length') || '0', 10);

    // Create audit log asynchronously (don't await)
    if (req.apiAuth) {
      createAccessLog({
        apiKeyId: req.apiAuth.apiKeyId,
        timestamp: new Date(),
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        responseTime,
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent'),
        requestSize: parseInt(req.get('content-length') || '0', 10),
        responseSize,
        error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined,
        userId: req.apiAuth.userId,
        requestId: req.requestId,
      }).catch(error => {
        console.error(`Error logging API access for request ${req.requestId}:`, error);
      });
    }
  });

  next();
};

/**
 * Create access log entry in database
 */
async function createAccessLog(data: {
  apiKeyId: string;
  timestamp: Date;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
  error?: string;
  userId?: string;
  requestId?: string;
}): Promise<void> {
  try {
    await prisma.apiAccessLog.create({
      data: {
        apiKeyId: data.apiKeyId,
        timestamp: data.timestamp,
        method: data.method,
        endpoint: data.endpoint,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        requestSize: data.requestSize,
        responseSize: data.responseSize,
        error: data.error,
        userId: data.userId,
        requestId: data.requestId,
      },
    });
  } catch (error) {
    // Don't fail requests on logging errors
    console.error(`Failed to create access log: ${error}`);
  }
}

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
function getClientIp(req: Request): string {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs
    return forwarded.split(',')[0].trim();
  }

  return req.socket.remoteAddress || 'unknown';
}

/**
 * Detect suspicious activity
 * Logs security alerts for unusual patterns
 */
export const detectSuspiciousActivity = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Only check for authenticated requests
  if (!req.apiAuth) {
    return next();
  }

  res.on('finish', () => {
    // Check for multiple failures
    if (res.statusCode >= 400 && res.statusCode < 500) {
      // Track failures in memory
      const failureKey = `failures_${req.apiAuth!.apiKeyId}`;
      const failures = ((global as any)[failureKey] || 0) + 1;
      (global as any)[failureKey] = failures;

      // Clear after 5 minutes
      setTimeout(() => {
        delete (global as any)[failureKey];
      }, 300000);

      // Alert if 5+ failures in 5 minutes
      if (failures > 5) {
        createSecurityAlert({
          apiKeyId: req.apiAuth!.apiKeyId,
          alertType: 'repeated_failures',
          severity: 'HIGH',
          description: `${failures} failed requests in the last 5 minutes`,
          metadata: {
            endpoint: req.path,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString(),
          },
        }).catch(error => {
          console.error('Error creating security alert:', error);
        });
      }
    }
  });

  next();
};

/**
 * Create security alert
 */
async function createSecurityAlert(data: {
  apiKeyId: string;
  alertType: string;
  severity: string;
  description: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await prisma.securityAlert.create({
      data: {
        apiKeyId: data.apiKeyId,
        alertType: data.alertType,
        severity: data.severity,
        description: data.description,
        metadata: data.metadata,
        detectedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to create security alert:', error);
  }
}
