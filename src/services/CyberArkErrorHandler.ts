/**
 * CyberArk PAM Error Handling and Fallback System
 *
 * Provides comprehensive error handling, circuit breaker patterns,
 * retry logic, and monitoring for CyberArk PAM integration.
 *
 * Features:
 * - Circuit breaker pattern for CyberArk service availability
 * - Exponential backoff retry logic
 * - Fallback to environment variables during outages
 * - Health monitoring and alerting
 * - Automatic degraded mode detection
 * - Metrics collection for operational visibility
 *
 * Production Benefits:
 * - Prevents cascade failures when CyberArk is unavailable
 * - Maintains service availability during PAM system maintenance
 * - Provides early warning of credential management issues
 * - Enables graceful degradation with audit logging
 */

import { logger } from '../utils/logger';

export enum CyberArkErrorType {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SECRET_NOT_FOUND = 'SECRET_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class CyberArkError extends Error {
  public readonly type: CyberArkErrorType;
  public readonly isRetryable: boolean;
  public readonly statusCode?: number;
  public readonly timestamp: Date;

  constructor(
    type: CyberArkErrorType,
    message: string,
    isRetryable: boolean = false,
    statusCode?: number
  ) {
    super(message);
    this.name = 'CyberArkError';
    this.type = type;
    this.isRetryable = isRetryable;
    this.statusCode = statusCode;
    this.timestamp = new Date();
  }

  static fromHttpError(error: any): CyberArkError {
    const statusCode = error.response?.status || error.status;
    const message = error.response?.data?.message || error.message || 'Unknown HTTP error';

    switch (statusCode) {
      case 401:
        return new CyberArkError(CyberArkErrorType.AUTHENTICATION_FAILED, message, true, statusCode);
      case 403:
        return new CyberArkError(CyberArkErrorType.PERMISSION_DENIED, message, false, statusCode);
      case 404:
        return new CyberArkError(CyberArkErrorType.SECRET_NOT_FOUND, message, false, statusCode);
      case 408:
      case 504:
        return new CyberArkError(CyberArkErrorType.CONNECTION_TIMEOUT, message, true, statusCode);
      case 429:
        return new CyberArkError(CyberArkErrorType.RATE_LIMITED, message, true, statusCode);
      case 500:
      case 502:
      case 503:
        return new CyberArkError(CyberArkErrorType.SERVICE_UNAVAILABLE, message, true, statusCode);
      default:
        return new CyberArkError(CyberArkErrorType.UNKNOWN_ERROR, message, false, statusCode);
    }
  }

  static fromNetworkError(error: any): CyberArkError {
    const message = error.message || 'Network connectivity error';

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new CyberArkError(CyberArkErrorType.NETWORK_ERROR, message, true);
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      return new CyberArkError(CyberArkErrorType.CONNECTION_TIMEOUT, message, true);
    }

    return new CyberArkError(CyberArkErrorType.NETWORK_ERROR, message, true);
  }
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  successCount: number;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
}

interface HealthMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastErrorTime: number;
  lastSuccessTime: number;
  circuitBreakerState: string;
  fallbackUsageCount: number;
}

export class CyberArkErrorHandler {
  private circuitBreaker: CircuitBreakerState;
  private metrics: HealthMetrics;
  private readonly config: {
    circuitBreakerThreshold: number;
    circuitBreakerResetTimeout: number;
    circuitBreakerHalfOpenMaxCalls: number;
    retryConfig: RetryConfig;
  };

  constructor() {
    this.circuitBreaker = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      successCount: 0
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastErrorTime: 0,
      lastSuccessTime: 0,
      circuitBreakerState: 'CLOSED',
      fallbackUsageCount: 0
    };

    this.config = {
      circuitBreakerThreshold: parseInt(process.env.CYBERARK_CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      circuitBreakerResetTimeout: parseInt(process.env.CYBERARK_CIRCUIT_BREAKER_RESET_TIMEOUT || '60000', 10),
      circuitBreakerHalfOpenMaxCalls: parseInt(process.env.CYBERARK_CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS || '3', 10),
      retryConfig: {
        maxAttempts: parseInt(process.env.CYBERARK_RETRY_MAX_ATTEMPTS || '3', 10),
        baseDelay: parseInt(process.env.CYBERARK_RETRY_BASE_DELAY || '1000', 10),
        maxDelay: parseInt(process.env.CYBERARK_RETRY_MAX_DELAY || '10000', 10),
        exponentialBase: parseFloat(process.env.CYBERARK_RETRY_EXPONENTIAL_BASE || '2'),
        jitter: process.env.CYBERARK_RETRY_JITTER !== 'false'
      }
    };
  }

  /**
   * Execute operation with circuit breaker and retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackFn?: () => T | Promise<T>
  ): Promise<T> {
    // Check circuit breaker state
    if (!this.canExecute()) {
      logger.warn(`[CyberArk] Circuit breaker is OPEN for ${operationName}, using fallback`);
      if (fallbackFn) {
        this.metrics.fallbackUsageCount++;
        return await fallbackFn();
      }
      throw new CyberArkError(
        CyberArkErrorType.SERVICE_UNAVAILABLE,
        'CyberArk service is currently unavailable (circuit breaker OPEN)'
      );
    }

    const startTime = Date.now();
    this.metrics.totalRequests++;

    let lastError: CyberArkError | null = null;

    for (let attempt = 1; attempt <= this.config.retryConfig.maxAttempts; attempt++) {
      try {
        logger.debug(`[CyberArk] Executing ${operationName} (attempt ${attempt}/${this.config.retryConfig.maxAttempts})`);

        const result = await operation();

        // Success - update metrics and circuit breaker
        const responseTime = Date.now() - startTime;
        this.recordSuccess(responseTime);

        logger.debug(`[CyberArk] ${operationName} succeeded in ${responseTime}ms`);
        return result;

      } catch (error) {
        lastError = this.classifyError(error);

        logger.warn(`[CyberArk] ${operationName} failed (attempt ${attempt}/${this.config.retryConfig.maxAttempts}):`, {
          error: lastError.message,
          type: lastError.type,
          isRetryable: lastError.isRetryable
        });

        // If not retryable, fail immediately
        if (!lastError.isRetryable) {
          this.recordFailure(lastError);
          throw lastError;
        }

        // If this is the last attempt, fail
        if (attempt === this.config.retryConfig.maxAttempts) {
          this.recordFailure(lastError);
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateRetryDelay(attempt);
        logger.debug(`[CyberArk] Retrying ${operationName} in ${delay}ms`);

        await this.sleep(delay);
      }
    }

    // All retries exhausted, try fallback
    if (fallbackFn) {
      logger.warn(`[CyberArk] All retries exhausted for ${operationName}, using fallback`);
      this.metrics.fallbackUsageCount++;
      return await fallbackFn();
    }

    // No fallback available, throw the last error
    throw lastError!;
  }

  /**
   * Check if operation can be executed based on circuit breaker state
   */
  private canExecute(): boolean {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (now >= this.circuitBreaker.nextAttemptTime) {
          this.circuitBreaker.state = 'HALF_OPEN';
          this.circuitBreaker.successCount = 0;
          this.metrics.circuitBreakerState = 'HALF_OPEN';
          logger.info('[CyberArk] Circuit breaker transitioning to HALF_OPEN state');
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return this.circuitBreaker.successCount < this.config.circuitBreakerHalfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(responseTime: number): void {
    this.metrics.successfulRequests++;
    this.metrics.lastSuccessTime = Date.now();
    this.updateAverageResponseTime(responseTime);

    // Update circuit breaker state
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.successCount++;

      if (this.circuitBreaker.successCount >= this.config.circuitBreakerHalfOpenMaxCalls) {
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.failureCount = 0;
        this.metrics.circuitBreakerState = 'CLOSED';
        logger.info('[CyberArk] Circuit breaker transitioning to CLOSED state');
      }
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(error: CyberArkError): void {
    this.metrics.failedRequests++;
    this.metrics.lastErrorTime = Date.now();

    // Update circuit breaker state
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.state === 'CLOSED' &&
        this.circuitBreaker.failureCount >= this.config.circuitBreakerThreshold) {
      this.openCircuitBreaker();
    } else if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.openCircuitBreaker();
    }
  }

  /**
   * Open circuit breaker
   */
  private openCircuitBreaker(): void {
    this.circuitBreaker.state = 'OPEN';
    this.circuitBreaker.nextAttemptTime = Date.now() + this.config.circuitBreakerResetTimeout;
    this.metrics.circuitBreakerState = 'OPEN';

    logger.error(`[CyberArk] Circuit breaker OPEN - CyberArk service will be avoided for ${this.config.circuitBreakerResetTimeout}ms`);

    // Emit alert for monitoring systems
    this.emitCircuitBreakerAlert();
  }

  /**
   * Classify error into CyberArk error types
   */
  private classifyError(error: any): CyberArkError {
    if (error instanceof CyberArkError) {
      return error;
    }

    // HTTP/response errors
    if (error.response || error.status) {
      return CyberArkError.fromHttpError(error);
    }

    // Network/connection errors
    if (error.code || error.errno) {
      return CyberArkError.fromNetworkError(error);
    }

    // Generic errors
    return new CyberArkError(
      CyberArkErrorType.UNKNOWN_ERROR,
      error.message || 'Unknown error occurred',
      false
    );
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay = this.config.retryConfig.baseDelay *
      Math.pow(this.config.retryConfig.exponentialBase, attempt - 1);

    const cappedDelay = Math.min(exponentialDelay, this.config.retryConfig.maxDelay);

    if (this.config.retryConfig.jitter) {
      // Add ±25% jitter to prevent thundering herd
      const jitterRange = cappedDelay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      return Math.max(0, cappedDelay + jitter);
    }

    return cappedDelay;
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const totalRequests = this.metrics.successfulRequests;
    this.metrics.averageResponseTime = (
      (this.metrics.averageResponseTime * (totalRequests - 1)) + responseTime
    ) / totalRequests;
  }

  /**
   * Sleep for specified duration
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Emit circuit breaker alert
   */
  private emitCircuitBreakerAlert(): void {
    const alertData = {
      service: 'CyberArk PAM',
      alert: 'CIRCUIT_BREAKER_OPEN',
      severity: 'HIGH',
      timestamp: new Date().toISOString(),
      details: {
        failureCount: this.circuitBreaker.failureCount,
        threshold: this.config.circuitBreakerThreshold,
        resetTimeout: this.config.circuitBreakerResetTimeout,
        metrics: this.getHealthMetrics()
      }
    };

    // Log alert (can be picked up by log aggregation systems)
    logger.error('[CyberArk] ALERT: Circuit breaker opened', alertData);

    // Here you could integrate with alerting systems like:
    // - PagerDuty
    // - Slack webhooks
    // - Email notifications
    // - SNMP traps
    // - Custom monitoring systems
  }

  /**
   * Get current health metrics
   */
  public getHealthMetrics(): HealthMetrics {
    return {
      ...this.metrics,
      circuitBreakerState: this.circuitBreaker.state
    };
  }

  /**
   * Get circuit breaker status
   */
  public getCircuitBreakerStatus(): {
    state: string;
    failureCount: number;
    successCount: number;
    nextAttemptTime: number;
    canExecute: boolean;
  } {
    return {
      state: this.circuitBreaker.state,
      failureCount: this.circuitBreaker.failureCount,
      successCount: this.circuitBreaker.successCount,
      nextAttemptTime: this.circuitBreaker.nextAttemptTime,
      canExecute: this.canExecute()
    };
  }

  /**
   * Reset circuit breaker (for administrative purposes)
   */
  public resetCircuitBreaker(): void {
    logger.info('[CyberArk] Manually resetting circuit breaker');

    this.circuitBreaker = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      successCount: 0
    };

    this.metrics.circuitBreakerState = 'CLOSED';
  }

  /**
   * Reset all metrics (for testing or maintenance)
   */
  public resetMetrics(): void {
    logger.info('[CyberArk] Resetting all metrics');

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastErrorTime: 0,
      lastSuccessTime: 0,
      circuitBreakerState: this.circuitBreaker.state,
      fallbackUsageCount: 0
    };
  }
}

// Export singleton instance
export const cyberArkErrorHandler = new CyberArkErrorHandler();