/**
 * CyberArk Error Handler Test Suite
 *
 * Comprehensive tests for circuit breaker patterns, retry logic,
 * error classification, and metrics collection for CyberArk PAM integration.
 */

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import {
  CyberArkErrorHandler,
  CyberArkError,
  CyberArkErrorType,
  cyberArkErrorHandler
} from '../../services/CyberArkErrorHandler';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('CyberArkErrorHandler', () => {
  let errorHandler: CyberArkErrorHandler;

  beforeEach(() => {
    errorHandler = new CyberArkErrorHandler();
    vi.clearAllMocks();

    // Reset environment variables for consistent testing
    delete process.env.CYBERARK_CIRCUIT_BREAKER_THRESHOLD;
    delete process.env.CYBERARK_CIRCUIT_BREAKER_RESET_TIMEOUT;
    delete process.env.CYBERARK_RETRY_MAX_ATTEMPTS;
  });

  afterEach(() => {
    errorHandler.resetCircuitBreaker();
    errorHandler.resetMetrics();
  });

  describe('Circuit Breaker', () => {
    it('should start in CLOSED state', () => {
      const status = errorHandler.getCircuitBreakerStatus();
      expect(status.state).toBe('CLOSED');
      expect(status.canExecute).toBe(true);
    });

    it('should transition to OPEN state after threshold failures', async () => {
      const failingOperation = vi.fn().mockRejectedValue(new Error('Network error'));

      // Execute failing operations to reach threshold (default: 5)
      for (let i = 0; i < 5; i++) {
        try {
          await errorHandler.executeWithRetry(failingOperation, 'test-operation');
        } catch (error) {
          // Expected to fail
        }
      }

      const status = errorHandler.getCircuitBreakerStatus();
      expect(status.state).toBe('OPEN');
      expect(status.canExecute).toBe(false);
    });

    it('should transition to HALF_OPEN state after timeout', async () => {
      // Set short timeout for testing
      process.env.CYBERARK_CIRCUIT_BREAKER_RESET_TIMEOUT = '100';
      const shortTimeoutHandler = new CyberArkErrorHandler();

      const failingOperation = vi.fn().mockRejectedValue(new Error('Network error'));

      // Trigger circuit breaker to OPEN
      for (let i = 0; i < 5; i++) {
        try {
          await shortTimeoutHandler.executeWithRetry(failingOperation, 'test-operation');
        } catch (error) {
          // Expected to fail
        }
      }

      expect(shortTimeoutHandler.getCircuitBreakerStatus().state).toBe('OPEN');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next execution should transition to HALF_OPEN
      const operation = vi.fn().mockResolvedValue('success');
      await shortTimeoutHandler.executeWithRetry(operation, 'test-operation');

      const status = shortTimeoutHandler.getCircuitBreakerStatus();
      expect(['HALF_OPEN', 'CLOSED']).toContain(status.state);
    });

    it('should transition from HALF_OPEN to CLOSED after successful operations', async () => {
      // Set up circuit breaker in OPEN state
      const failingOperation = vi.fn().mockRejectedValue(new Error('Network error'));
      for (let i = 0; i < 5; i++) {
        try {
          await errorHandler.executeWithRetry(failingOperation, 'test-operation');
        } catch (error) {
          // Expected to fail
        }
      }

      // Manually transition to HALF_OPEN for testing
      errorHandler['circuitBreaker'].state = 'HALF_OPEN';
      errorHandler['circuitBreaker'].successCount = 0;

      const successfulOperation = vi.fn().mockResolvedValue('success');

      // Execute successful operations (default: 3 required)
      for (let i = 0; i < 3; i++) {
        await errorHandler.executeWithRetry(successfulOperation, 'test-operation');
      }

      const status = errorHandler.getCircuitBreakerStatus();
      expect(status.state).toBe('CLOSED');
    });

    it('should use fallback when circuit breaker is OPEN', async () => {
      const failingOperation = vi.fn().mockRejectedValue(new Error('Network error'));
      const fallbackFn = vi.fn().mockReturnValue('fallback-result');

      // Trigger circuit breaker to OPEN
      for (let i = 0; i < 5; i++) {
        try {
          await errorHandler.executeWithRetry(failingOperation, 'test-operation', fallbackFn);
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit breaker should be OPEN now
      expect(errorHandler.getCircuitBreakerStatus().state).toBe('OPEN');

      // Next call should use fallback without executing operation
      const result = await errorHandler.executeWithRetry(
        failingOperation,
        'test-operation',
        fallbackFn
      );

      expect(result).toBe('fallback-result');
      expect(failingOperation).toHaveBeenCalledTimes(5); // Only from the initial attempts
    });

    it('should manually reset circuit breaker', () => {
      // Force circuit breaker to OPEN state
      errorHandler['circuitBreaker'].state = 'OPEN';
      errorHandler['circuitBreaker'].failureCount = 10;

      errorHandler.resetCircuitBreaker();

      const status = errorHandler.getCircuitBreakerStatus();
      expect(status.state).toBe('CLOSED');
      expect(status.failureCount).toBe(0);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockRejectedValueOnce(new Error('Another temporary error'))
        .mockResolvedValueOnce('success');

      const result = await errorHandler.executeWithRetry(operation, 'test-operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new CyberArkError(
        CyberArkErrorType.PERMISSION_DENIED,
        'Access denied',
        false // not retryable
      );

      const operation = vi.fn().mockRejectedValue(nonRetryableError);

      await expect(errorHandler.executeWithRetry(operation, 'test-operation')).rejects.toThrow('Access denied');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect max retry attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(errorHandler.executeWithRetry(operation, 'test-operation')).rejects.toThrow('Persistent error');
      expect(operation).toHaveBeenCalledTimes(3); // Default max attempts
    });

    it('should use fallback after exhausting retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));
      const fallbackFn = vi.fn().mockReturnValue('fallback-result');

      const result = await errorHandler.executeWithRetry(operation, 'test-operation', fallbackFn);

      expect(result).toBe('fallback-result');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(fallbackFn).toHaveBeenCalledTimes(1);
    });

    it('should calculate exponential backoff delays', () => {
      // Test delay calculation (private method access through reflection)
      const delay1 = errorHandler['calculateRetryDelay'](1);
      const delay2 = errorHandler['calculateRetryDelay'](2);
      const delay3 = errorHandler['calculateRetryDelay'](3);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
      expect(delay3).toBeLessThanOrEqual(10000); // Max delay cap
    });

    it('should apply jitter to retry delays', () => {
      const delays = [];
      for (let i = 0; i < 10; i++) {
        delays.push(errorHandler['calculateRetryDelay'](2));
      }

      // With jitter, delays should vary
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('Error Classification', () => {
    it('should classify HTTP errors correctly', () => {
      const httpError = { response: { status: 401, data: { message: 'Unauthorized' } } };
      const classifiedError = errorHandler['classifyError'](httpError);

      expect(classifiedError).toBeInstanceOf(CyberArkError);
      expect(classifiedError.type).toBe(CyberArkErrorType.AUTHENTICATION_FAILED);
      expect(classifiedError.isRetryable).toBe(true);
      expect(classifiedError.statusCode).toBe(401);
    });

    it('should classify network errors correctly', () => {
      const networkError = { code: 'ECONNREFUSED', message: 'Connection refused' };
      const classifiedError = errorHandler['classifyError'](networkError);

      expect(classifiedError.type).toBe(CyberArkErrorType.NETWORK_ERROR);
      expect(classifiedError.isRetryable).toBe(true);
    });

    it('should classify timeout errors correctly', () => {
      const timeoutError = { code: 'ETIMEDOUT', message: 'Request timeout' };
      const classifiedError = errorHandler['classifyError'](timeoutError);

      expect(classifiedError.type).toBe(CyberArkErrorType.CONNECTION_TIMEOUT);
      expect(classifiedError.isRetryable).toBe(true);
    });

    it('should handle unknown errors', () => {
      const unknownError = new Error('Unknown error');
      const classifiedError = errorHandler['classifyError'](unknownError);

      expect(classifiedError.type).toBe(CyberArkErrorType.UNKNOWN_ERROR);
      expect(classifiedError.isRetryable).toBe(false);
    });

    it('should pass through CyberArkError instances', () => {
      const originalError = new CyberArkError(
        CyberArkErrorType.SECRET_NOT_FOUND,
        'Secret not found',
        false
      );

      const classifiedError = errorHandler['classifyError'](originalError);

      expect(classifiedError).toBe(originalError);
    });
  });

  describe('Metrics Collection', () => {
    it('should track successful operations', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      await errorHandler.executeWithRetry(operation, 'test-operation');

      const metrics = errorHandler.getHealthMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should track failed operations', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      try {
        await errorHandler.executeWithRetry(operation, 'test-operation');
      } catch (error) {
        // Expected to fail
      }

      const metrics = errorHandler.getHealthMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(1);
    });

    it('should track fallback usage', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      const fallbackFn = vi.fn().mockReturnValue('fallback-result');

      await errorHandler.executeWithRetry(operation, 'test-operation', fallbackFn);

      const metrics = errorHandler.getHealthMetrics();
      expect(metrics.fallbackUsageCount).toBe(1);
    });

    it('should calculate average response time', async () => {
      const fastOperation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('fast'), 10))
      );
      const slowOperation = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('slow'), 50))
      );

      await errorHandler.executeWithRetry(fastOperation, 'fast-operation');
      await errorHandler.executeWithRetry(slowOperation, 'slow-operation');

      const metrics = errorHandler.getHealthMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThan(10);
      expect(metrics.averageResponseTime).toBeLessThan(100);
    });

    it('should reset metrics', () => {
      // Generate some metrics
      errorHandler['metrics'].totalRequests = 10;
      errorHandler['metrics'].successfulRequests = 8;
      errorHandler['metrics'].failedRequests = 2;

      errorHandler.resetMetrics();

      const metrics = errorHandler.getHealthMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should use custom circuit breaker threshold from environment', () => {
      process.env.CYBERARK_CIRCUIT_BREAKER_THRESHOLD = '10';
      const customHandler = new CyberArkErrorHandler();

      expect(customHandler['config'].circuitBreakerThreshold).toBe(10);
    });

    it('should use custom retry configuration from environment', () => {
      process.env.CYBERARK_RETRY_MAX_ATTEMPTS = '5';
      process.env.CYBERARK_RETRY_BASE_DELAY = '2000';
      process.env.CYBERARK_RETRY_MAX_DELAY = '20000';

      const customHandler = new CyberArkErrorHandler();

      expect(customHandler['config'].retryConfig.maxAttempts).toBe(5);
      expect(customHandler['config'].retryConfig.baseDelay).toBe(2000);
      expect(customHandler['config'].retryConfig.maxDelay).toBe(20000);
    });

    it('should disable jitter when configured', () => {
      process.env.CYBERARK_RETRY_JITTER = 'false';
      const noJitterHandler = new CyberArkErrorHandler();

      const delay1 = noJitterHandler['calculateRetryDelay'](2);
      const delay2 = noJitterHandler['calculateRetryDelay'](2);

      expect(delay1).toBe(delay2); // No jitter, delays should be identical
    });
  });
});

describe('CyberArkError', () => {
  describe('HTTP Error Factory', () => {
    it('should create authentication error for 401', () => {
      const httpError = { response: { status: 401, data: { message: 'Unauthorized' } } };
      const cyberArkError = CyberArkError.fromHttpError(httpError);

      expect(cyberArkError.type).toBe(CyberArkErrorType.AUTHENTICATION_FAILED);
      expect(cyberArkError.isRetryable).toBe(true);
      expect(cyberArkError.statusCode).toBe(401);
    });

    it('should create permission denied error for 403', () => {
      const httpError = { response: { status: 403, data: { message: 'Forbidden' } } };
      const cyberArkError = CyberArkError.fromHttpError(httpError);

      expect(cyberArkError.type).toBe(CyberArkErrorType.PERMISSION_DENIED);
      expect(cyberArkError.isRetryable).toBe(false);
    });

    it('should create secret not found error for 404', () => {
      const httpError = { response: { status: 404, data: { message: 'Not found' } } };
      const cyberArkError = CyberArkError.fromHttpError(httpError);

      expect(cyberArkError.type).toBe(CyberArkErrorType.SECRET_NOT_FOUND);
      expect(cyberArkError.isRetryable).toBe(false);
    });

    it('should create rate limited error for 429', () => {
      const httpError = { response: { status: 429, data: { message: 'Too many requests' } } };
      const cyberArkError = CyberArkError.fromHttpError(httpError);

      expect(cyberArkError.type).toBe(CyberArkErrorType.RATE_LIMITED);
      expect(cyberArkError.isRetryable).toBe(true);
    });

    it('should create service unavailable error for 5xx', () => {
      const httpError = { response: { status: 503, data: { message: 'Service unavailable' } } };
      const cyberArkError = CyberArkError.fromHttpError(httpError);

      expect(cyberArkError.type).toBe(CyberArkErrorType.SERVICE_UNAVAILABLE);
      expect(cyberArkError.isRetryable).toBe(true);
    });
  });

  describe('Network Error Factory', () => {
    it('should create network error for ECONNREFUSED', () => {
      const networkError = { code: 'ECONNREFUSED', message: 'Connection refused' };
      const cyberArkError = CyberArkError.fromNetworkError(networkError);

      expect(cyberArkError.type).toBe(CyberArkErrorType.NETWORK_ERROR);
      expect(cyberArkError.isRetryable).toBe(true);
    });

    it('should create timeout error for ETIMEDOUT', () => {
      const timeoutError = { code: 'ETIMEDOUT', message: 'Connection timeout' };
      const cyberArkError = CyberArkError.fromNetworkError(timeoutError);

      expect(cyberArkError.type).toBe(CyberArkErrorType.CONNECTION_TIMEOUT);
      expect(cyberArkError.isRetryable).toBe(true);
    });

    it('should create network error for unknown codes', () => {
      const unknownError = { code: 'UNKNOWN', message: 'Unknown network error' };
      const cyberArkError = CyberArkError.fromNetworkError(unknownError);

      expect(cyberArkError.type).toBe(CyberArkErrorType.NETWORK_ERROR);
      expect(cyberArkError.isRetryable).toBe(true);
    });
  });

  describe('Error Properties', () => {
    it('should set error properties correctly', () => {
      const error = new CyberArkError(
        CyberArkErrorType.SECRET_NOT_FOUND,
        'Secret not found',
        false,
        404
      );

      expect(error.name).toBe('CyberArkError');
      expect(error.type).toBe(CyberArkErrorType.SECRET_NOT_FOUND);
      expect(error.message).toBe('Secret not found');
      expect(error.isRetryable).toBe(false);
      expect(error.statusCode).toBe(404);
      expect(error.timestamp).toBeInstanceOf(Date);
    });
  });
});

describe('Singleton Error Handler', () => {
  it('should provide singleton instance', () => {
    expect(cyberArkErrorHandler).toBeInstanceOf(CyberArkErrorHandler);
  });

  it('should maintain state across calls', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    await cyberArkErrorHandler.executeWithRetry(operation, 'test-operation');

    const metrics = cyberArkErrorHandler.getHealthMetrics();
    expect(metrics.totalRequests).toBeGreaterThan(0);
  });
});