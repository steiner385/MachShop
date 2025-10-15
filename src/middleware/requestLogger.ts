import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;

  // Record start time
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    origin: req.get('Origin'),
    referer: req.get('Referer'),
    timestamp: new Date().toISOString()
  });

  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== 'GET' && req.body) {
    const sanitizedBody = sanitizeRequestBody(req.body, req.path);
    if (Object.keys(sanitizedBody).length > 0) {
      logger.debug('Request body', {
        requestId,
        body: sanitizedBody
      });
    }
  }

  // Capture original res.json function
  const originalJson = res.json;

  // Override res.json to log response
  res.json = function(body: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Log response
    logger.info('Outgoing response', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: JSON.stringify(body).length,
      timestamp: new Date().toISOString()
    });

    // Log response body for errors or debug level
    if (res.statusCode >= 400 || logger.level === 'debug') {
      const sanitizedBody = sanitizeResponseBody(body, req.path);
      logger.debug('Response body', {
        requestId,
        statusCode: res.statusCode,
        body: sanitizedBody
      });
    }

    // Log performance metrics for slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode
      });
    }

    // Call original json function
    return originalJson.call(this, body);
  };

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  next();
};

// Sanitize request body to remove sensitive information
function sanitizeRequestBody(body: any, path: string): any {
  if (!body || typeof body !== 'object') {
    return {};
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'authorization',
    'credential',
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'bankAccount'
  ];

  const sanitized = { ...body };

  // Remove sensitive fields
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Path-specific sanitization
  if (path.includes('/auth/login')) {
    if (sanitized.password) {
      sanitized.password = '[REDACTED]';
    }
  }

  if (path.includes('/auth/register')) {
    if (sanitized.password) {
      sanitized.password = '[REDACTED]';
    }
    if (sanitized.confirmPassword) {
      sanitized.confirmPassword = '[REDACTED]';
    }
  }

  // Limit size of logged body
  const bodyStr = JSON.stringify(sanitized);
  if (bodyStr.length > 5000) {
    return {
      ...sanitized,
      _note: 'Body truncated due to size'
    };
  }

  return sanitized;
}

// Sanitize response body to remove sensitive information
function sanitizeResponseBody(body: any, path: string): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };

  // Remove tokens from auth responses
  if (path.includes('/auth/')) {
    if (sanitized.token) {
      sanitized.token = '[REDACTED]';
    }
    if (sanitized.refreshToken) {
      sanitized.refreshToken = '[REDACTED]';
    }
  }

  // Remove sensitive user data
  if (sanitized.user && typeof sanitized.user === 'object') {
    if (sanitized.user.password) {
      sanitized.user.password = '[REDACTED]';
    }
  }

  // Limit size of logged response
  const bodyStr = JSON.stringify(sanitized);
  if (bodyStr.length > 10000) {
    return {
      statusCode: sanitized.statusCode || body.statusCode,
      message: sanitized.message || body.message,
      _note: 'Response body truncated due to size'
    };
  }

  return sanitized;
}

// Security logging middleware for sensitive operations
export const securityLogger = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Log security-sensitive operation start
    logger.warn('Security operation started', {
      operation,
      userId: req.user?.id,
      username: req.user?.username,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });

    // Override res.json to log completion
    const originalJson = res.json;
    res.json = function(body: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      logger.warn('Security operation completed', {
        operation,
        userId: req.user?.id,
        username: req.user?.username,
        ip: req.ip,
        statusCode: res.statusCode,
        duration,
        success: res.statusCode < 400,
        timestamp: new Date().toISOString()
      });

      return originalJson.call(this, body);
    };

    next();
  };
};

// Audit logging middleware for compliance
export const auditLogger = (entityType: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function(body: any) {
      // Only log successful operations for audit
      if (res.statusCode < 400) {
        const entityId = body.id || req.params.id || 'unknown';
        
        logger.info('Audit log', {
          audit: true,
          entityType,
          entityId,
          action,
          userId: req.user?.id,
          username: req.user?.username,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
          changes: getChangesFromRequest(req, body)
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

// Extract changes from request for audit logging
function getChangesFromRequest(req: Request, responseBody: any): any {
  const changes: any = {};

  // For PUT/PATCH requests, log the changes
  if ((req.method === 'PUT' || req.method === 'PATCH') && req.body) {
    changes.before = req.body._original || 'Not available';
    changes.after = req.body;
  }

  // For POST requests, log the created data
  if (req.method === 'POST' && responseBody) {
    changes.created = responseBody;
  }

  // For DELETE requests, log the deletion
  if (req.method === 'DELETE') {
    changes.deleted = req.params.id || 'Resource deleted';
  }

  return changes;
}

export default requestLogger;