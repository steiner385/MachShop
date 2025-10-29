/**
 * Unit Tests for Error Handler Middleware
 * Tests custom error classes, error transformation, and centralized error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  VersionConflictError,
  BusinessRuleError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection
} from '../../middleware/errorHandler';

// Set up test environment variables before any imports
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/test_db';
process.env.NODE_ENV = 'test';

// Mock dependencies
vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../../config/config', () => ({
  config: {
    env: 'test'
  }
}));

const { logger } = await import('../../utils/logger');

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: any;
  let mockStatus: any;

  beforeEach(() => {
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    mockReq = {
      url: '/api/test',
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      originalUrl: '/api/test',
      headers: {
        'x-request-id': 'test-request-123'
      },
      get: vi.fn().mockReturnValue('test-user-agent')
    };

    mockRes = {
      status: mockStatus,
      json: mockJson
    };

    mockNext = vi.fn();

    vi.clearAllMocks();
  });

  describe('Custom Error Classes', () => {
    describe('AppError', () => {
      it('should create error with all properties', () => {
        const error = new AppError('Test error', 500, 'TEST_ERROR', false);

        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('TEST_ERROR');
        expect(error.isOperational).toBe(false);
        expect(error).toBeInstanceOf(Error);
        expect(error.stack).toBeDefined();
      });

      it('should default isOperational to true', () => {
        const error = new AppError('Test error', 400, 'TEST_ERROR');
        expect(error.isOperational).toBe(true);
      });
    });

    describe('ValidationError', () => {
      it('should create validation error with details', () => {
        const details = [
          { field: 'name', message: 'Required field missing' }
        ];
        const error = new ValidationError('Validation failed', details);

        expect(error.message).toBe('Validation failed');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details).toEqual(details);
        expect(error.isOperational).toBe(true);
      });

      it('should create validation error without details', () => {
        const error = new ValidationError('Validation failed');

        expect(error.details).toEqual([]);
      });
    });

    describe('AuthenticationError', () => {
      it('should create authentication error with default message', () => {
        const error = new AuthenticationError();

        expect(error.message).toBe('Authentication failed');
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('AUTHENTICATION_ERROR');
      });

      it('should create authentication error with custom message', () => {
        const error = new AuthenticationError('Invalid token');

        expect(error.message).toBe('Invalid token');
      });
    });

    describe('AuthorizationError', () => {
      it('should create authorization error with default message', () => {
        const error = new AuthorizationError();

        expect(error.message).toBe('Insufficient permissions');
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('AUTHORIZATION_ERROR');
      });

      it('should create authorization error with custom message', () => {
        const error = new AuthorizationError('Access denied');

        expect(error.message).toBe('Access denied');
      });
    });

    describe('NotFoundError', () => {
      it('should create not found error with default message', () => {
        const error = new NotFoundError();

        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('ConflictError', () => {
      it('should create conflict error with default message', () => {
        const error = new ConflictError();

        expect(error.message).toBe('Resource conflict');
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('CONFLICT');
      });
    });

    describe('VersionConflictError', () => {
      it('should create version conflict error with details', () => {
        const conflictDetails = {
          currentVersion: '2.0',
          attemptedVersion: '1.5',
          lastModified: new Date('2024-01-01'),
          lastModifiedBy: 'user-123'
        };

        const error = new VersionConflictError('Version conflict', conflictDetails);

        expect(error.message).toBe('Version conflict');
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('VERSION_CONFLICT');
        expect(error.conflictDetails).toEqual(conflictDetails);
      });
    });

    describe('BusinessRuleError', () => {
      it('should create business rule error', () => {
        const error = new BusinessRuleError('Business rule violated');

        expect(error.message).toBe('Business rule violated');
        expect(error.statusCode).toBe(422);
        expect(error.code).toBe('BUSINESS_RULE_VIOLATION');
      });
    });
  });

  describe('Error Handler Middleware', () => {
    describe('App Error Handling', () => {
      it('should handle AppError instances directly', () => {
        const error = new ValidationError('Test validation error');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'VALIDATION_ERROR',
            message: 'Test validation error',
            timestamp: expect.any(String),
            path: '/test',
            method: 'GET',
            requestId: 'test-request-123'
          })
        );
        expect(logger.warn).toHaveBeenCalled();
      });

      it('should include details for ValidationError', () => {
        const details = [{ field: 'name', message: 'Required' }];
        const error = new ValidationError('Validation failed', details);

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            details: details
          })
        );
      });

      it('should include conflict details for VersionConflictError', () => {
        const conflictDetails = {
          currentVersion: '2.0',
          attemptedVersion: '1.5',
          lastModified: new Date('2024-01-01'),
          lastModifiedBy: 'user-123'
        };
        const error = new VersionConflictError('Version conflict', conflictDetails);

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            details: conflictDetails
          })
        );
      });
    });

    describe('Zod Error Handling', () => {
      it('should transform ZodError to ValidationError', () => {
        const schema = z.object({
          name: z.string().min(1),
          age: z.number().min(0)
        });

        try {
          schema.parse({ name: '', age: -1 });
        } catch (zodError) {
          errorHandler(zodError as ZodError, mockReq as Request, mockRes as Response, mockNext);

          expect(mockStatus).toHaveBeenCalledWith(400);
          expect(mockJson).toHaveBeenCalledWith(
            expect.objectContaining({
              error: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: expect.any(String),
                  message: expect.any(String),
                  code: expect.any(String)
                })
              ])
            })
          );
        }
      });
    });

    describe('JWT Error Handling', () => {
      it('should handle JsonWebTokenError', () => {
        const error = {
          name: 'JsonWebTokenError',
          message: 'jwt malformed'
        };

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'AUTHENTICATION_ERROR',
            message: 'Invalid token'
          })
        );
      });

      it('should handle TokenExpiredError', () => {
        const error = {
          name: 'TokenExpiredError',
          message: 'jwt expired'
        };

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'AUTHENTICATION_ERROR',
            message: 'Token expired'
          })
        );
      });

      it('should handle NotBeforeError', () => {
        const error = {
          name: 'NotBeforeError',
          message: 'jwt not active'
        };

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(401);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'AUTHENTICATION_ERROR',
            message: 'Token not active'
          })
        );
      });
    });

    describe('Database Error Handling', () => {
      it('should handle PostgreSQL unique violation (23505)', () => {
        const error = {
          code: '23505',
          message: 'duplicate key value violates unique constraint'
        };

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(409);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'CONFLICT',
            message: 'Resource already exists'
          })
        );
      });

      it('should handle foreign key violation (23503)', () => {
        const error = {
          code: '23503',
          message: 'violates foreign key constraint'
        };

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'VALIDATION_ERROR',
            message: 'Referenced resource does not exist'
          })
        );
      });

      it('should handle not null violation (23502)', () => {
        const error = {
          code: '23502',
          message: 'null value in column violates not-null constraint'
        };

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'VALIDATION_ERROR',
            message: 'Required field is missing'
          })
        );
      });

      it('should handle Prisma client errors', () => {
        const error = {
          name: 'PrismaClientKnownRequestError',
          message: 'Database operation failed'
        };

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'PRISMA_ERROR',
            message: 'Database client error'
          })
        );
      });

      it('should handle undefined database errors', () => {
        const error = undefined;

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'UNDEFINED_ERROR',
            message: 'Internal server error - undefined error'
          })
        );
        expect(logger.error).toHaveBeenCalledWith(
          'Error handler received undefined error object',
          expect.any(Object)
        );
      });
    });

    describe('Unknown Error Handling', () => {
      it('should handle unknown errors with message', () => {
        const error = new Error('Unknown error occurred');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'INTERNAL_ERROR',
            message: 'Unknown error occurred'
          })
        );
        expect(logger.error).toHaveBeenCalledWith(
          'Unknown error occurred',
          expect.any(Object)
        );
      });

      it('should handle errors without message', () => {
        const error = { someProperty: 'value' };

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(logger.error).toHaveBeenCalledWith(
          'Unknown error occurred',
          expect.any(Object)
        );
      });

      it('should handle primitive errors', () => {
        const error = 'string error';

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'INTERNAL_ERROR',
            message: 'string error'
          })
        );
      });
    });

    describe('Logging Behavior', () => {
      it('should log operational errors at warn level', () => {
        const error = new ValidationError('Test validation error');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(logger.warn).toHaveBeenCalledWith(
          'Operational error',
          expect.objectContaining({
            error: 'Test validation error',
            code: 'VALIDATION_ERROR',
            statusCode: 400
          })
        );
      });

      it('should log system errors at error level', () => {
        const error = new AppError('System error', 500, 'SYSTEM_ERROR', false);

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(logger.error).toHaveBeenCalledWith(
          'System error',
          expect.objectContaining({
            error: 'System error',
            code: 'SYSTEM_ERROR',
            statusCode: 500,
            stack: expect.any(String)
          })
        );
      });
    });

    describe('Environment-specific Behavior', () => {
      let originalEnv: string | undefined;

      beforeEach(() => {
        originalEnv = process.env.NODE_ENV;
      });

      afterEach(() => {
        if (originalEnv !== undefined) {
          process.env.NODE_ENV = originalEnv;
        } else {
          delete process.env.NODE_ENV;
        }
      });

      it('should include stack trace in development', () => {
        process.env.NODE_ENV = 'development';

        const error = new AppError('Test error', 500, 'TEST_ERROR');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            stack: expect.any(String)
          })
        );
      });

      it('should mask error messages in production', () => {
        process.env.NODE_ENV = 'production';

        const error = new Error('Sensitive internal error');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Internal server error'
          })
        );
      });
    });
  });

  describe('Async Handler', () => {
    it('should call next with error on promise rejection', async () => {
      const asyncFn = vi.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFn = asyncHandler(asyncFn);

      // Wait for async handler to complete
      await new Promise<void>((resolve) => {
        const mockNextWithCheck = vi.fn((error) => {
          expect(error).toEqual(
            expect.objectContaining({
              message: 'Async error'
            })
          );
          resolve();
        });

        wrappedFn(mockReq as Request, mockRes as Response, mockNextWithCheck);
      });
    });

    it('should not call next when promise resolves', async () => {
      const asyncFn = vi.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });
  });

  describe('Not Found Handler', () => {
    it('should create NotFoundError for unmatched routes', () => {
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route /api/test not found',
          statusCode: 404,
          code: 'NOT_FOUND'
        })
      );
    });
  });

  describe('Process Error Handlers', () => {
    describe('handleUncaughtException', () => {
      let mockExit: any;

      beforeEach(() => {
        mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called');
        });
      });

      afterEach(() => {
        mockExit.mockRestore();
      });

      it('should log uncaught exception and exit process', () => {
        const error = new Error('Uncaught exception');

        expect(() => handleUncaughtException(error)).toThrow('process.exit called');

        expect(logger.error).toHaveBeenCalledWith(
          'Uncaught Exception',
          expect.objectContaining({
            error: 'Uncaught exception',
            stack: expect.any(String)
          })
        );
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('handleUnhandledRejection', () => {
      let mockExit: any;

      beforeEach(() => {
        mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called');
        });
      });

      afterEach(() => {
        mockExit.mockRestore();
      });

      it('should log unhandled rejection and exit process', () => {
        const reason = new Error('Unhandled rejection');
        const promise = Promise.reject(reason);
        // Handle the promise to prevent unhandled rejection
        promise.catch(() => {});

        expect(() => handleUnhandledRejection(reason, promise)).toThrow('process.exit called');

        expect(logger.error).toHaveBeenCalledWith(
          'Unhandled Rejection',
          expect.objectContaining({
            reason: 'Unhandled rejection',
            stack: expect.any(String)
          })
        );
        expect(mockExit).toHaveBeenCalledWith(1);
      });

      it('should handle non-error rejection reasons', () => {
        const reason = 'string rejection reason';
        const promise = Promise.reject(reason);
        // Handle the promise to prevent unhandled rejection
        promise.catch(() => {});

        expect(() => handleUnhandledRejection(reason, promise)).toThrow('process.exit called');

        expect(logger.error).toHaveBeenCalledWith(
          'Unhandled Rejection',
          expect.objectContaining({
            reason: 'string rejection reason'
          })
        );
      });
    });
  });
});