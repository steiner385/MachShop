/**
 * Unit Tests for Kitting Error Handling Utilities
 *
 * Comprehensive test suite covering custom error types, error handlers,
 * circuit breaker patterns, and error recovery strategies.
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';

import {
  KittingError,
  KittingErrorHandler,
  KittingCircuitBreaker,
  KittingErrorUtils,
  KittingErrorType,
  KittingErrorSeverity
} from '../../utils/kittingErrors';

describe('KittingError', () => {
  it('should create error with correct properties', () => {
    const error = new KittingError(
      KittingErrorType.BOM_ANALYSIS_FAILED,
      'Test error message',
      {
        severity: KittingErrorSeverity.HIGH,
        context: { testKey: 'testValue' },
        recoverable: true,
        retryable: false,
        userMessage: 'Custom user message'
      }
    );

    expect(error.name).toBe('KittingError');
    expect(error.type).toBe(KittingErrorType.BOM_ANALYSIS_FAILED);
    expect(error.message).toBe('Test error message');
    expect(error.severity).toBe(KittingErrorSeverity.HIGH);
    expect(error.context).toEqual({ testKey: 'testValue' });
    expect(error.recoverable).toBe(true);
    expect(error.retryable).toBe(false);
    expect(error.userMessage).toBe('Custom user message');
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should use default values when options not provided', () => {
    const error = new KittingError(
      KittingErrorType.INVALID_WORK_ORDER,
      'Test error message'
    );

    expect(error.severity).toBe(KittingErrorSeverity.MEDIUM);
    expect(error.context).toEqual({});
    expect(error.recoverable).toBe(false); // INVALID_WORK_ORDER is not recoverable
    expect(error.retryable).toBe(false); // INVALID_WORK_ORDER is not retryable
    expect(error.userMessage).toContain('work order');
  });

  it('should properly serialize to JSON', () => {
    const error = new KittingError(
      KittingErrorType.CRITICAL_SHORTAGE,
      'Test shortage',
      {
        context: { partId: 'part-123' }
      }
    );

    const json = error.toJSON();

    expect(json).toMatchObject({
      name: 'KittingError',
      type: KittingErrorType.CRITICAL_SHORTAGE,
      message: 'Test shortage',
      severity: KittingErrorSeverity.CRITICAL,
      context: { partId: 'part-123' },
      timestamp: expect.any(String)
    });
  });

  describe('Default severity mapping', () => {
    it('should assign CRITICAL severity to critical errors', () => {
      const error = new KittingError(
        KittingErrorType.CIRCULAR_BOM_REFERENCE,
        'Circular reference detected'
      );

      expect(error.severity).toBe(KittingErrorSeverity.CRITICAL);
    });

    it('should assign HIGH severity to high-impact errors', () => {
      const error = new KittingError(
        KittingErrorType.BOM_ANALYSIS_FAILED,
        'BOM analysis failed'
      );

      expect(error.severity).toBe(KittingErrorSeverity.HIGH);
    });

    it('should assign MEDIUM severity to standard errors', () => {
      const error = new KittingError(
        KittingErrorType.INVALID_STATUS_TRANSITION,
        'Invalid status transition'
      );

      expect(error.severity).toBe(KittingErrorSeverity.MEDIUM);
    });

    it('should assign LOW severity to minor errors', () => {
      const error = new KittingError(
        KittingErrorType.INVALID_BARCODE_FORMAT,
        'Invalid barcode format'
      );

      expect(error.severity).toBe(KittingErrorSeverity.LOW);
    });
  });

  describe('Recoverable and retryable mapping', () => {
    it('should mark certain errors as non-recoverable', () => {
      const nonRecoverableTypes = [
        KittingErrorType.CIRCULAR_BOM_REFERENCE,
        KittingErrorType.INVALID_WORK_ORDER,
        KittingErrorType.DATA_INTEGRITY_VIOLATION
      ];

      nonRecoverableTypes.forEach(type => {
        const error = new KittingError(type, 'Test message');
        expect(error.recoverable).toBe(false);
      });
    });

    it('should mark transient errors as retryable', () => {
      const retryableTypes = [
        KittingErrorType.DATABASE_CONNECTION_FAILED,
        KittingErrorType.EXTERNAL_SERVICE_UNAVAILABLE,
        KittingErrorType.TIMEOUT_EXCEEDED,
        KittingErrorType.RESOURCE_LOCKED
      ];

      retryableTypes.forEach(type => {
        const error = new KittingError(type, 'Test message');
        expect(error.retryable).toBe(true);
      });
    });
  });
});

describe('KittingErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('should execute operation successfully when no errors occur', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await KittingErrorHandler.handleError(
        new Error('test'),
        mockOperation
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should throw non-retryable KittingError immediately', async () => {
      const nonRetryableError = new KittingError(
        KittingErrorType.INVALID_WORK_ORDER,
        'Invalid work order'
      );

      const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);

      await expect(KittingErrorHandler.handleError(
        nonRetryableError,
        mockOperation
      )).rejects.toThrow(KittingError);

      expect(mockOperation).toHaveBeenCalledTimes(0); // Should not execute at all
    });

    it('should retry retryable errors with exponential backoff', async () => {
      const retryableError = new KittingError(
        KittingErrorType.DATABASE_CONNECTION_FAILED,
        'Database connection failed'
      );

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success');

      const result = await KittingErrorHandler.handleError(
        retryableError,
        mockOperation,
        3, // max retries
        10 // short backoff for testing
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    }, 10000); // Increase timeout for retry logic

    it('should wrap non-KittingError in KittingError', async () => {
      const genericError = new Error('Generic database error');
      const mockOperation = jest.fn().mockRejectedValue(genericError);

      await expect(KittingErrorHandler.handleError(
        genericError,
        mockOperation
      )).rejects.toThrow(KittingError);

      await expect(KittingErrorHandler.handleError(
        genericError,
        mockOperation
      )).rejects.toMatchObject({
        type: KittingErrorType.DATABASE_CONNECTION_FAILED,
        cause: genericError
      });
    });

    it('should exhaust retries and throw final error', async () => {
      const retryableError = new KittingError(
        KittingErrorType.TIMEOUT_EXCEEDED,
        'Operation timeout'
      );

      const mockOperation = jest.fn().mockRejectedValue(retryableError);

      await expect(KittingErrorHandler.handleError(
        retryableError,
        mockOperation,
        2, // max retries
        1 // short backoff
      )).rejects.toThrow(KittingError);

      expect(mockOperation).toHaveBeenCalledTimes(2);
    }, 10000);
  });

  describe('Error creation helpers', () => {
    it('should create kit-specific errors with proper context', () => {
      const error = KittingErrorHandler.createKitError(
        KittingErrorType.KIT_NOT_STAGED,
        'Kit not staged',
        'kit-123',
        'wo-456',
        { additionalData: 'test' }
      );

      expect(error.type).toBe(KittingErrorType.KIT_NOT_STAGED);
      expect(error.context).toMatchObject({
        kitId: 'kit-123',
        workOrderId: 'wo-456',
        additionalData: 'test'
      });
    });

    it('should create vendor kit-specific errors', () => {
      const error = KittingErrorHandler.createVendorKitError(
        KittingErrorType.VENDOR_QUALITY_FAILURE,
        'Quality inspection failed',
        'vendor-kit-123',
        'vendor-456'
      );

      expect(error.type).toBe(KittingErrorType.VENDOR_QUALITY_FAILURE);
      expect(error.context).toMatchObject({
        vendorKitId: 'vendor-kit-123',
        vendorId: 'vendor-456'
      });
    });

    it('should create staging-specific errors', () => {
      const error = KittingErrorHandler.createStagingError(
        KittingErrorType.STAGING_CAPACITY_EXCEEDED,
        'Staging area full',
        'staging-loc-123',
        'kit-456'
      );

      expect(error.type).toBe(KittingErrorType.STAGING_CAPACITY_EXCEEDED);
      expect(error.context).toMatchObject({
        stagingLocationId: 'staging-loc-123',
        kitId: 'kit-456'
      });
    });

    it('should create scanning-specific errors', () => {
      const error = KittingErrorHandler.createScanningError(
        KittingErrorType.SCAN_LOCATION_MISMATCH,
        'Location mismatch',
        'barcode-123',
        'expected-loc',
        'actual-loc'
      );

      expect(error.type).toBe(KittingErrorType.SCAN_LOCATION_MISMATCH);
      expect(error.context).toMatchObject({
        barcode: 'barcode-123',
        expectedLocation: 'expected-loc',
        actualLocation: 'actual-loc'
      });
    });
  });
});

describe('KittingCircuitBreaker', () => {
  let circuitBreaker: KittingCircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new KittingCircuitBreaker(3, 1000); // 3 failures, 1 second timeout
    jest.clearAllMocks();
  });

  it('should execute successfully when circuit is CLOSED', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');

    const result = await circuitBreaker.execute(mockOperation);

    expect(result).toBe('success');
    expect(circuitBreaker.getState().state).toBe('CLOSED');
    expect(circuitBreaker.getState().failures).toBe(0);
  });

  it('should open circuit after failure threshold', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));

    // Trigger failures to open circuit
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();

    expect(circuitBreaker.getState().state).toBe('OPEN');
    expect(circuitBreaker.getState().failures).toBe(3);
  });

  it('should reject requests immediately when circuit is OPEN', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));

    // Trigger failures to open circuit
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();

    // Circuit should now be OPEN - next call should fail immediately
    const failedOperation = jest.fn().mockResolvedValue('should not execute');

    await expect(circuitBreaker.execute(failedOperation))
      .rejects
      .toThrow(KittingError);

    await expect(circuitBreaker.execute(failedOperation))
      .rejects
      .toMatchObject({
        type: KittingErrorType.EXTERNAL_SERVICE_UNAVAILABLE
      });

    expect(failedOperation).not.toHaveBeenCalled();
  });

  it('should transition to HALF_OPEN after recovery timeout', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));

    // Open the circuit
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();

    expect(circuitBreaker.getState().state).toBe('OPEN');

    // Wait for recovery timeout (simulate by creating new breaker with short timeout)
    const shortTimeoutBreaker = new KittingCircuitBreaker(3, 1);

    // Trigger failures
    await expect(shortTimeoutBreaker.execute(mockOperation)).rejects.toThrow();
    await expect(shortTimeoutBreaker.execute(mockOperation)).rejects.toThrow();
    await expect(shortTimeoutBreaker.execute(mockOperation)).rejects.toThrow();

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 10));

    // Next call should attempt operation (HALF_OPEN)
    const successOperation = jest.fn().mockResolvedValue('recovered');
    const result = await shortTimeoutBreaker.execute(successOperation);

    expect(result).toBe('recovered');
    expect(shortTimeoutBreaker.getState().state).toBe('CLOSED');
  });

  it('should reset failures on successful execution', async () => {
    const mockFailOperation = jest.fn().mockRejectedValue(new Error('Temporary failure'));
    const mockSuccessOperation = jest.fn().mockResolvedValue('success');

    // Trigger some failures (but not enough to open circuit)
    await expect(circuitBreaker.execute(mockFailOperation)).rejects.toThrow();
    await expect(circuitBreaker.execute(mockFailOperation)).rejects.toThrow();

    expect(circuitBreaker.getState().failures).toBe(2);

    // Successful execution should reset failures
    await circuitBreaker.execute(mockSuccessOperation);

    expect(circuitBreaker.getState().state).toBe('CLOSED');
    expect(circuitBreaker.getState().failures).toBe(0);
  });
});

describe('KittingErrorUtils', () => {
  describe('Error type checking', () => {
    it('should correctly identify KittingError instances', () => {
      const kittingError = new KittingError(KittingErrorType.BOM_ANALYSIS_FAILED, 'Test');
      const regularError = new Error('Regular error');

      expect(KittingErrorUtils.isKittingError(kittingError)).toBe(true);
      expect(KittingErrorUtils.isKittingError(regularError)).toBe(false);
    });

    it('should check recoverable status', () => {
      const recoverableError = new KittingError(KittingErrorType.DATABASE_CONNECTION_FAILED, 'Test');
      const nonRecoverableError = new KittingError(KittingErrorType.INVALID_WORK_ORDER, 'Test');
      const regularError = new Error('Regular error');

      expect(KittingErrorUtils.isRecoverable(recoverableError)).toBe(true);
      expect(KittingErrorUtils.isRecoverable(nonRecoverableError)).toBe(false);
      expect(KittingErrorUtils.isRecoverable(regularError)).toBe(false);
    });

    it('should check retryable status', () => {
      const retryableError = new KittingError(KittingErrorType.TIMEOUT_EXCEEDED, 'Test');
      const nonRetryableError = new KittingError(KittingErrorType.INVALID_WORK_ORDER, 'Test');
      const regularError = new Error('Regular error');

      expect(KittingErrorUtils.isRetryable(retryableError)).toBe(true);
      expect(KittingErrorUtils.isRetryable(nonRetryableError)).toBe(false);
      expect(KittingErrorUtils.isRetryable(regularError)).toBe(false);
    });

    it('should get error severity', () => {
      const criticalError = new KittingError(KittingErrorType.CRITICAL_SHORTAGE, 'Test');
      const mediumError = new KittingError(KittingErrorType.INVALID_STATUS_TRANSITION, 'Test');
      const regularError = new Error('Regular error');

      expect(KittingErrorUtils.getSeverity(criticalError)).toBe(KittingErrorSeverity.CRITICAL);
      expect(KittingErrorUtils.getSeverity(mediumError)).toBe(KittingErrorSeverity.MEDIUM);
      expect(KittingErrorUtils.getSeverity(regularError)).toBe(KittingErrorSeverity.MEDIUM);
    });
  });

  describe('Error conversion', () => {
    it('should return KittingError as-is', () => {
      const kittingError = new KittingError(KittingErrorType.BOM_ANALYSIS_FAILED, 'Test');

      const result = KittingErrorUtils.toKittingError(kittingError);

      expect(result).toBe(kittingError);
    });

    it('should convert regular Error to KittingError', () => {
      const regularError = new Error('Database connection failed');

      const result = KittingErrorUtils.toKittingError(regularError);

      expect(result).toBeInstanceOf(KittingError);
      expect(result.type).toBe(KittingErrorType.DATABASE_CONNECTION_FAILED);
      expect(result.message).toBe('Database connection failed');
      expect(result.cause).toBe(regularError);
    });

    it('should use fallback type for unknown errors', () => {
      const unknownError = { message: 'Unknown error' };

      const result = KittingErrorUtils.toKittingError(
        unknownError,
        KittingErrorType.EXTERNAL_SERVICE_UNAVAILABLE
      );

      expect(result).toBeInstanceOf(KittingError);
      expect(result.type).toBe(KittingErrorType.EXTERNAL_SERVICE_UNAVAILABLE);
    });

    it('should handle null/undefined errors', () => {
      const result = KittingErrorUtils.toKittingError(null);

      expect(result).toBeInstanceOf(KittingError);
      expect(result.type).toBe(KittingErrorType.DATABASE_CONNECTION_FAILED);
      expect(result.message).toBe('Unknown error');
    });
  });
});

describe('Error message quality', () => {
  it('should provide user-friendly messages for all error types', () => {
    const errorTypes = Object.values(KittingErrorType);

    errorTypes.forEach(type => {
      const error = new KittingError(type, 'Technical message');

      expect(error.userMessage).toBeDefined();
      expect(error.userMessage.length).toBeGreaterThan(10);
      expect(error.userMessage).not.toContain('undefined');
      expect(error.userMessage).not.toContain('null');
    });
  });

  it('should provide actionable guidance in user messages', () => {
    const guidanceErrors = [
      KittingErrorType.BOM_NOT_FOUND,
      KittingErrorType.INSUFFICIENT_MATERIALS,
      KittingErrorType.STAGING_LOCATION_UNAVAILABLE,
      KittingErrorType.INVALID_BARCODE_FORMAT
    ];

    guidanceErrors.forEach(type => {
      const error = new KittingError(type, 'Technical message');

      expect(error.userMessage).toMatch(/please|try|check|verify|contact|review/i);
    });
  });
});