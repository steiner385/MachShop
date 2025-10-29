import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { config } from '../config/config';

// Custom error classes
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly details: any[];

  constructor(message: string, details: any[] = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class VersionConflictError extends AppError {
  public readonly conflictDetails: {
    currentVersion: string;
    attemptedVersion: string;
    lastModified: Date;
    lastModifiedBy?: string;
  };

  constructor(
    message: string,
    conflictDetails: {
      currentVersion: string;
      attemptedVersion: string;
      lastModified: Date;
      lastModifiedBy?: string;
    }
  ) {
    super(message, 409, 'VERSION_CONFLICT');
    this.conflictDetails = conflictDetails;
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION');
  }
}

// Error response interface
interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  stack?: string;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
}

// Handle Zod validation errors
const handleZodError = (error: ZodError): ValidationError => {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    ...('received' in err ? { received: (err as any).received } : {})
  }));

  return new ValidationError('Validation failed', details);
};

// Handle database errors
const handleDatabaseError = (error: any): AppError => {
  // ✅ GITHUB ISSUE #16 FIX: Enhanced undefined error handling
  if (!error) {
    logger.error('Database error: completely undefined error object');
    return new AppError('Database operation failed - undefined error', 500, 'DATABASE_ERROR', false);
  }

  // Handle Prisma-specific errors
  if (error.code && typeof error.code === 'string') {
    // PostgreSQL error codes
    switch (error.code) {
      case '23505': // Unique violation
        return new ConflictError('Resource already exists');
      case '23503': // Foreign key violation
        return new ValidationError('Referenced resource does not exist');
      case '23502': // Not null violation
        return new ValidationError('Required field is missing');
      case '23514': // Check violation
        return new ValidationError('Data validation failed');
      default:
        logger.error('Database error', {
          error: error?.message || 'No message',
          code: error?.code || 'No code',
          errorType: typeof error,
          errorKeys: error ? Object.keys(error) : 'undefined'
        });
        return new AppError('Database operation failed', 500, 'DATABASE_ERROR', false);
    }
  }

  // Handle Prisma client errors without 'code' property
  if (error.name && (error.name.includes('Prisma') || error.name.includes('Client'))) {
    logger.error('Prisma client error', {
      name: error.name,
      message: error?.message || 'No message',
      meta: error?.meta || 'No meta',
      errorType: typeof error
    });
    return new AppError('Database client error', 500, 'PRISMA_ERROR', false);
  }

  // Handle completely undefined or malformed error objects
  const safeErrorMessage = error?.message || error?.toString?.() || String(error) || 'Unknown database error';
  logger.error('Unhandled database error format', {
    error: safeErrorMessage,
    errorType: typeof error,
    hasMessage: error?.message !== undefined,
    hasCode: error?.code !== undefined,
    hasName: error?.name !== undefined,
    errorKeys: error ? Object.keys(error) : 'error is undefined'
  });

  return new AppError('Database operation failed', 500, 'DATABASE_ERROR', false);
};

// Handle JWT errors
const handleJWTError = (error: any): AppError => {
  switch (error.name) {
    case 'JsonWebTokenError':
      return new AuthenticationError('Invalid token');
    case 'TokenExpiredError':
      return new AuthenticationError('Token expired');
    case 'NotBeforeError':
      return new AuthenticationError('Token not active');
    default:
      return new AuthenticationError('Authentication failed');
  }
};

// Main error handler middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let appError: AppError;

  // ✅ GITHUB ISSUE #16 FIX: Handle completely undefined error objects
  if (!error) {
    logger.error('Error handler received undefined error object', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    appError = new AppError(
      'Internal server error - undefined error',
      500,
      'UNDEFINED_ERROR',
      false
    );
  } else if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    appError = handleZodError(error);
  } else if (error?.name && (
    error.name === 'JsonWebTokenError' ||
    error.name === 'TokenExpiredError' ||
    error.name === 'NotBeforeError' ||
    error.name.includes('JWT')
  )) {
    appError = handleJWTError(error);
  } else if ((error?.code && typeof error.code === 'string') ||
             (error?.name && (error.name.includes('Prisma') || error.name.includes('Client')))) {
    appError = handleDatabaseError(error);
  } else {
    // ✅ GITHUB ISSUE #16 FIX: Enhanced undefined/malformed error handling
    const safeErrorMessage = error?.message || error?.toString?.() || String(error) || 'Unknown error';
    const safeStack = error?.stack || 'No stack trace available';

    logger.error('Unknown error occurred', {
      error: safeErrorMessage,
      stack: safeStack,
      errorType: typeof error,
      hasMessage: error?.message !== undefined,
      hasStack: error?.stack !== undefined,
      hasName: error?.name !== undefined,
      errorKeys: error ? Object.keys(error) : 'error is undefined',
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    appError = new AppError(
      process.env.NODE_ENV === 'production' ? 'Internal server error' : safeErrorMessage,
      500,
      'INTERNAL_ERROR',
      false
    );
  }

  // Log operational errors at warn level, others at error level
  if (appError.isOperational) {
    logger.warn('Operational error', {
      error: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
  } else {
    logger.error('System error', {
      error: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      stack: appError.stack,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: appError.code,
    message: appError.message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'] as string
  };

  // Add details for validation errors
  if (appError instanceof ValidationError && appError.details) {
    errorResponse.details = appError.details;
  }

  // Add conflict details for version conflicts
  if (appError instanceof VersionConflictError && appError.conflictDetails) {
    errorResponse.details = appError.conflictDetails;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = appError.stack;
  }

  // Send error response
  res.status(appError.statusCode).json(errorResponse);
};

// Async error wrapper
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Process error handlers
export const handleUncaughtException = (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  process.exit(1);
};

export const handleUnhandledRejection = (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
  
  process.exit(1);
};

export default errorHandler;