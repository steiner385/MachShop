/**
 * Error Handling Service
 * Provides retry logic, circuit breakers, and fallback strategies
 */

import {
  IntegrationError,
  RetryConfig,
  RetryPolicy,
  FallbackStrategy,
} from '../types';

/**
 * Error handler with retry and recovery logic
 */
export class ErrorHandlingService {
  private errorCodeMap: Map<string, { message: string; retryable: boolean; suggestion: string }> = new Map(
    [
      ['TIMEOUT', { message: 'Operation timed out', retryable: true, suggestion: 'Increase timeout or optimize query' }],
      [
        'RATE_LIMIT',
        {
          message: 'Rate limit exceeded',
          retryable: true,
          suggestion: 'Wait and retry, or request higher rate limit',
        },
      ],
      [
        'AUTHENTICATION_FAILED',
        { message: 'Authentication failed', retryable: false, suggestion: 'Check credentials and authentication setup' },
      ],
      ['CONNECTION_ERROR', { message: 'Connection error', retryable: true, suggestion: 'Check network connectivity' }],
      [
        'INVALID_REQUEST',
        { message: 'Invalid request format', retryable: false, suggestion: 'Check request parameters and schema' },
      ],
      [
        'SERVER_ERROR',
        {
          message: 'Server error',
          retryable: true,
          suggestion: 'Retry after delay, or contact system administrator',
        },
      ],
      ['NOT_FOUND', { message: 'Resource not found', retryable: false, suggestion: 'Verify resource identifier' }],
      ['DATA_VALIDATION_ERROR', { message: 'Data validation failed', retryable: false, suggestion: 'Check data format and content' }],
    ]
  );

  private retryAttempts: Map<string, number> = new Map();

  /**
   * Retry operation with exponential backoff
   */
  async retry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    operationId?: string
  ): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < (config.maxAttempts ?? 3)) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (attempt >= (config.maxAttempts ?? 3)) {
          break;
        }

        const delay = this.calculateDelay(attempt, config);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Calculate backoff delay
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const initialDelay = config.initialDelayMs ?? 100;
    const maxDelay = config.maxDelayMs ?? 10000;
    const multiplier = config.backoffMultiplier ?? 2;

    let delay = initialDelay;

    switch (config.policy) {
      case RetryPolicy.EXPONENTIAL_BACKOFF:
        delay = initialDelay * Math.pow(multiplier, attempt - 1);
        break;

      case RetryPolicy.LINEAR_BACKOFF:
        delay = initialDelay * attempt;
        break;

      case RetryPolicy.FIXED_DELAY:
        delay = initialDelay;
        break;

      case RetryPolicy.NO_RETRY:
        return 0;
    }

    return Math.min(delay, maxDelay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Apply fallback strategy
   */
  applyFallback<T>(
    strategy: FallbackStrategy,
    primaryValue: T | null,
    fallbackValue: T,
    cacheKey?: string
  ): T {
    switch (strategy) {
      case FallbackStrategy.DEFAULT_VALUE:
        return primaryValue ?? fallbackValue;

      case FallbackStrategy.PREVIOUS_VALUE:
        return primaryValue ?? fallbackValue;

      case FallbackStrategy.CACHE:
        // In production, check cache here
        return primaryValue ?? fallbackValue;

      case FallbackStrategy.FAIL_FAST:
        if (primaryValue === null || primaryValue === undefined) {
          throw new Error('Primary value not available and fail-fast enabled');
        }
        return primaryValue;

      default:
        return primaryValue ?? fallbackValue;
    }
  }

  /**
   * Format error response
   */
  formatError(error: Error | string): IntegrationError {
    const message = typeof error === 'string' ? error : error.message;

    // Try to match against known error codes
    for (const [code, info] of this.errorCodeMap) {
      if (message.includes(code) || info.message.includes(code)) {
        return {
          code,
          message: info.message,
          retryable: info.retryable,
          suggestion: info.suggestion,
          causedBy: error instanceof Error ? error : undefined,
        };
      }
    }

    // Default error format
    return {
      code: 'UNKNOWN_ERROR',
      message,
      retryable: false,
      causedBy: error instanceof Error ? error : undefined,
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: IntegrationError): boolean {
    return error.retryable;
  }

  /**
   * Get error information
   */
  getErrorInfo(errorCode: string): { message: string; retryable: boolean; suggestion: string } | undefined {
    return this.errorCodeMap.get(errorCode);
  }

  /**
   * Register custom error code
   */
  registerErrorCode(
    code: string,
    message: string,
    retryable: boolean,
    suggestion: string
  ): void {
    this.errorCodeMap.set(code, { message, retryable, suggestion });
  }

  /**
   * Handle rate limit error
   */
  async handleRateLimit(
    retryAfterMs: number,
    operation: () => Promise<unknown>
  ): Promise<unknown> {
    await this.sleep(retryAfterMs);
    return operation();
  }

  /**
   * Handle timeout error
   */
  async handleTimeout(
    timeoutMs: number,
    operation: () => Promise<unknown>,
    maxAttempts: number = 3
  ): Promise<unknown> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await Promise.race([
          operation(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
          ),
        ]);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts - 1) {
          const delay = Math.pow(2, attempt) * 100; // Exponential backoff
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Circuit breaker pattern implementation
   */
  createCircuitBreaker(threshold: number = 5, timeout: number = 60000): CircuitBreaker {
    return new CircuitBreaker(threshold, timeout);
  }

  /**
   * Track retry attempts
   */
  trackRetryAttempt(operationId: string): void {
    const current = this.retryAttempts.get(operationId) ?? 0;
    this.retryAttempts.set(operationId, current + 1);
  }

  /**
   * Get retry attempt count
   */
  getRetryAttempts(operationId: string): number {
    return this.retryAttempts.get(operationId) ?? 0;
  }

  /**
   * Reset retry attempts
   */
  resetRetryAttempts(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.retryAttempts.clear();
  }
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime?: number;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private successCount: number = 0;

  constructor(private threshold: number = 5, private resetTimeoutMs: number = 60000) {}

  /**
   * Call operation with circuit breaker protection
   */
  async call<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailureTime ?? 0) > this.resetTimeoutMs) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();

      if (this.state === 'half-open') {
        this.successCount++;
        if (this.successCount >= 2) {
          this.close();
        }
      } else {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.threshold) {
        this.state = 'open';
      }

      throw error;
    }
  }

  /**
   * Close circuit breaker
   */
  close(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }

  /**
   * Get circuit breaker state
   */
  getState(): string {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }
}

// Singleton instance
export const errorHandlingService = new ErrorHandlingService();
