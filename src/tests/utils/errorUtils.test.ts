/**
 * Unit Tests for Error Utilities
 * Tests safe error handling functions that prevent undefined property access errors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SafeErrorInfo,
  safeExtractError,
  safeErrorMessage,
  safeErrorCode,
  isPrismaError,
  isDatabaseError,
  safeConsoleError,
  safeLoggerError,
  safeDatabaseOperation,
  safeRetryOperation,
} from '../../utils/errorUtils';

describe('Error Utilities', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('safeExtractError', () => {
    it('should handle undefined error', () => {
      const result = safeExtractError(undefined);
      expect(result).toEqual({
        message: 'Error object is undefined or null',
        type: 'undefined',
        hasMessage: false,
        hasCode: false,
        hasName: false,
        hasStack: false,
        keys: [],
        originalError: undefined,
      });
    });

    it('should handle null error', () => {
      const result = safeExtractError(null);
      expect(result).toEqual({
        message: 'Error object is undefined or null',
        type: 'undefined',
        hasMessage: false,
        hasCode: false,
        hasName: false,
        hasStack: false,
        keys: [],
        originalError: null,
      });
    });

    it('should handle standard Error object', () => {
      const error = new Error('Test error');
      const result = safeExtractError(error);

      expect(result.message).toBe('Test error');
      expect(result.type).toBe('object');
      expect(result.hasMessage).toBe(true);
      expect(result.hasName).toBe(true);
      expect(result.hasStack).toBe(true);
      expect(result.hasCode).toBe(false);
      expect(result.originalError).toBe(error);
    });

    it('should handle error with code property', () => {
      const error = { message: 'Database error', code: 'P2002', name: 'PrismaError' };
      const result = safeExtractError(error);

      expect(result.message).toBe('Database error');
      expect(result.hasMessage).toBe(true);
      expect(result.hasCode).toBe(true);
      expect(result.hasName).toBe(true);
      expect(result.keys).toContain('code');
    });

    it('should handle string error', () => {
      const result = safeExtractError('Simple error string');

      expect(result.message).toBe('Simple error string');
      expect(result.type).toBe('string');
      expect(result.hasMessage).toBe(false);
      expect(result.keys).toEqual([]);
    });

    it('should handle object without message property', () => {
      const error = { code: 500, status: 'failed' };
      const result = safeExtractError(error);

      expect(result.message).toBe('[object Object]');
      expect(result.hasMessage).toBe(false);
      expect(result.hasCode).toBe(true);
      expect(result.keys).toEqual(['code', 'status']);
    });

    it('should handle object with toString method', () => {
      const error = {
        toString: () => 'Custom error string',
        code: 'CUSTOM'
      };
      const result = safeExtractError(error);

      expect(result.message).toBe('Custom error string');
      expect(result.hasMessage).toBe(false);
      expect(result.hasCode).toBe(true);
    });
  });

  describe('safeErrorMessage', () => {
    it('should return message from Error object', () => {
      const error = new Error('Test message');
      expect(safeErrorMessage(error)).toBe('Test message');
    });

    it('should return fallback for undefined error', () => {
      expect(safeErrorMessage(undefined)).toBe('Error object is undefined or null');
    });

    it('should return custom fallback', () => {
      expect(safeErrorMessage(null, 'Custom fallback')).toBe('Error object is undefined or null');
    });

    it('should use toString if no message property', () => {
      const error = { toString: () => 'String representation' };
      expect(safeErrorMessage(error)).toBe('String representation');
    });

    it('should use String() for primitive values', () => {
      expect(safeErrorMessage(404)).toBe('404');
      expect(safeErrorMessage(true)).toBe('true');
    });

    it('should use fallback for empty object', () => {
      expect(safeErrorMessage({})).toBe('[object Object]');
    });
  });

  describe('safeErrorCode', () => {
    it('should return code property', () => {
      const error = { code: 'P2002', message: 'Unique constraint failed' };
      expect(safeErrorCode(error)).toBe('P2002');
    });

    it('should return name if no code', () => {
      const error = new Error('Test error');
      expect(safeErrorCode(error)).toBe('Error');
    });

    it('should return undefined for null error', () => {
      expect(safeErrorCode(null)).toBeUndefined();
    });

    it('should return undefined for object with neither code nor name', () => {
      const error = { message: 'No code or name' };
      expect(safeErrorCode(error)).toBeUndefined();
    });
  });

  describe('isPrismaError', () => {
    it('should identify Prisma errors by name', () => {
      const error1 = { name: 'PrismaClientKnownRequestError' };
      const error2 = { name: 'PrismaClientValidationError' };
      const error3 = { name: 'PrismaClientInitializationError' };

      expect(isPrismaError(error1)).toBe(true);
      expect(isPrismaError(error2)).toBe(true);
      expect(isPrismaError(error3)).toBe(true);
    });

    it('should identify Client errors', () => {
      const error = { name: 'DatabaseClientError' };
      expect(isPrismaError(error)).toBe(true);
    });

    it('should identify ValidationError', () => {
      const error = { name: 'ValidationError' };
      expect(isPrismaError(error)).toBe(true);
    });

    it('should return false for non-Prisma errors', () => {
      const error1 = new Error('Regular error');
      const error2 = { name: 'HttpError' };
      const error3 = null;

      expect(isPrismaError(error1)).toBe(false);
      expect(isPrismaError(error2)).toBe(false);
      expect(isPrismaError(error3)).toBe(false);
    });
  });

  describe('isDatabaseError', () => {
    it('should identify Prisma errors as database errors', () => {
      const error = { name: 'PrismaClientKnownRequestError' };
      expect(isDatabaseError(error)).toBe(true);
    });

    it('should identify errors with database-related codes', () => {
      const error = { code: 'P2002' };
      expect(isDatabaseError(error)).toBe(true);
    });

    it('should identify errors with database in message', () => {
      const error1 = { message: 'Database connection failed' };
      const error2 = { message: 'connection timeout' };

      expect(isDatabaseError(error1)).toBe(true);
      expect(isDatabaseError(error2)).toBe(true);
    });

    it('should return false for non-database errors', () => {
      const error1 = new Error('HTTP timeout');
      const error2 = { message: 'User not found' };
      const error3 = null;

      expect(isDatabaseError(error1)).toBe(false);
      expect(isDatabaseError(error2)).toBe(false);
      expect(isDatabaseError(error3)).toBe(false);
    });
  });

  describe('safeConsoleError', () => {
    it('should log error with extracted information', () => {
      const error = new Error('Test error');
      safeConsoleError('TEST', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('TEST:', expect.objectContaining({
        message: 'Test error',
        errorType: 'object',
        hasMessage: true,
        hasName: true,
        hasStack: true,
        hasCode: false,
      }));
    });

    it('should include context if provided', () => {
      const error = new Error('Test error');
      const context = { userId: '123', operation: 'login' };
      safeConsoleError('AUTH', error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('AUTH:', expect.objectContaining({
        message: 'Test error',
        context: { userId: '123', operation: 'login' },
      }));
    });

    it('should handle undefined error', () => {
      safeConsoleError('NULL_ERROR', undefined);

      expect(consoleErrorSpy).toHaveBeenCalledWith('NULL_ERROR:', expect.objectContaining({
        message: 'Error object is undefined or null',
        errorType: 'undefined',
      }));
    });
  });

  describe('safeLoggerError', () => {
    it('should use logger.error method with extracted information', () => {
      const mockLogger = { error: vi.fn() };
      const error = new Error('Logger test');

      safeLoggerError(mockLogger, 'Operation failed', error);

      expect(mockLogger.error).toHaveBeenCalledWith('Operation failed', expect.objectContaining({
        error: 'Logger test',
        errorType: 'object',
        hasMessage: true,
        hasName: true,
        hasStack: true,
      }));
    });

    it('should include context in logger call', () => {
      const mockLogger = { error: vi.fn() };
      const error = { code: 'AUTH_FAILED', message: 'Authentication failed' };
      const context = { attemptNumber: 3 };

      safeLoggerError(mockLogger, 'Login failed', error, context);

      expect(mockLogger.error).toHaveBeenCalledWith('Login failed', expect.objectContaining({
        error: 'Authentication failed',
        context: { attemptNumber: 3 },
      }));
    });
  });

  describe('safeDatabaseOperation', () => {
    it('should return result of successful operation', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await safeDatabaseOperation(operation, 'test operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledOnce();
    });

    it('should enhance error message on failure', async () => {
      const error = new Error('Connection failed');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(safeDatabaseOperation(operation, 'user lookup'))
        .rejects
        .toThrow('user lookup failed: Connection failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[SafeDB] user lookup failed:',
        expect.objectContaining({
          message: 'Connection failed',
          errorType: 'object',
        })
      );
    });

    it('should handle malformed error objects', async () => {
      const malformedError = { weird: 'object', toString: () => 'Weird error' };
      const operation = vi.fn().mockRejectedValue(malformedError);

      await expect(safeDatabaseOperation(operation, 'data fetch'))
        .rejects
        .toThrow('data fetch failed: Weird error');
    });
  });

  describe('safeRetryOperation', () => {
    it('should return result of successful operation on first try', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await safeRetryOperation(operation, 'test operation', 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success on attempt 3');

      const result = await safeRetryOperation(operation, 'flaky operation', 3, 10);

      expect(result).toBe('success on attempt 3');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2); // Two failed attempts logged
    });

    it('should fail after max retries with enhanced error', async () => {
      const error = new Error('Persistent failure');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(safeRetryOperation(operation, 'failing operation', 2, 10))
        .rejects
        .toThrow('failing operation failed after 2 attempts: Persistent failure');

      expect(operation).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    });

    it('should respect delay between retries', async () => {
      const startTime = Date.now();
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      await safeRetryOperation(operation, 'delayed operation', 2, 50);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some timing variance
    });

    it('should handle malformed errors in retry logic', async () => {
      const malformedError = { toString: () => 'Malformed retry error' };
      const operation = vi.fn().mockRejectedValue(malformedError);

      await expect(safeRetryOperation(operation, 'malformed error operation', 1))
        .rejects
        .toThrow('malformed error operation failed after 1 attempts: Malformed retry error');
    });
  });
});