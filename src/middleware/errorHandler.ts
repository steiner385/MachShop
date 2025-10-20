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
      logger.error('Database error', { error: error.message, code: error.code });
      return new AppError('Database operation failed', 500, 'DATABASE_ERROR', false);
  }
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

  // Handle known error types
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    appError = handleZodError(error);
  } else if (error.name && error.name.includes('JWT')) {
    appError = handleJWTError(error);
  } else if (error.code && typeof error.code === 'string') {
    appError = handleDatabaseError(error);
  } else {
    // Unknown error - log and return generic error
    logger.error('Unknown error occurred', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    appError = new AppError(
      config.env === 'production' ? 'Internal server error' : error.message,
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

  // Add stack trace in development
  if (config.env === 'development') {
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