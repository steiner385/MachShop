/**
 * Test Stability Manager (Phase 6)
 *
 * Provides comprehensive retry mechanisms and circuit breaker patterns for:
 * - Business logic conflicts (serial numbers, circular references)
 * - Status transition errors
 * - Foreign key constraint violations
 * - Formula validation conflicts
 * - JSON parsing errors
 * - Network instability
 *
 * Built upon the foundation of:
 * - Phase 2: Reliable Test Helpers
 * - Phase 3: Test Data Isolation Manager
 * - Phase 4: Enhanced Navigation Manager
 * - Phase 5: Defensive Validation
 */

import { Page } from '@playwright/test';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  description?: string;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenRetries?: number;
}

export interface StabilityMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  retriedOperations: number;
  circuitBreakerTrips: number;
  averageRetryCount: number;
}

// Common business logic error patterns that need retry
const RETRYABLE_ERROR_PATTERNS = [
  'Serial number already exists',
  'Circular reference detected',
  'Foreign key constraint violated',
  'Unexpected token',
  'Connection timeout',
  'Network timeout',
  'ECONNRESET',
  'ETIMEDOUT',
  'Request timeout',
  'Status transition',
  'Record not found',
  'Unique constraint failed',
  'Invalid status transition',
  'Cannot depend on itself',
  'Production schedule with ID undefined not found',
  'Equipment with ID .* not found',
  'Work order .* not found',
  'Value expected \\(char \\d+\\)',
  'Invalid formula',
  'test case\\(s\\) failed',
  'Operation failed because it depends on one or more records',
];

// Common API operations that benefit from circuit breaker pattern
const CIRCUIT_BREAKER_OPERATIONS = [
  'api/v1/production-schedules',
  'api/v1/serialization',
  'api/v1/workorders',
  'api/v1/routings',
  'api/v1/process-segments',
  'api/v1/parameter-formulas',
  'api/v1/parameter-groups',
  'api/v1/parameter-limits',
  'api/v1/b2m',
  'api/v1/l2-equipment',
];

export class TestStabilityManager {
  private page?: Page;
  private metrics: StabilityMetrics;
  private circuitBreakerStates: Map<string, CircuitBreakerState> = new Map();
  private operationHistory: OperationResult[] = [];

  constructor(page?: Page) {
    this.page = page;
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      retriedOperations: 0,
      circuitBreakerTrips: 0,
      averageRetryCount: 0,
    };
  }

  /**
   * Execute operation with comprehensive retry and circuit breaker protection
   */
  async executeWithStability<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 1.5,
      retryableErrors = RETRYABLE_ERROR_PATTERNS,
      description = 'Test operation'
    } = options;

    this.metrics.totalOperations++;
    let retryCount = 0;
    let lastError: Error | null = null;

    console.log(`[TestStability] Starting operation: ${description}`);

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Check circuit breaker before attempting operation
        const circuitKey = this.extractCircuitKey(description);
        if (circuitKey && this.isCircuitOpen(circuitKey)) {
          throw new Error(`Circuit breaker open for ${circuitKey}`);
        }

        const result = await operation();

        // Success - record metrics and reset circuit breaker
        this.metrics.successfulOperations++;
        if (retryCount > 0) {
          this.metrics.retriedOperations++;
          console.log(`[TestStability] ✅ Operation succeeded after ${retryCount} retries: ${description}`);
        } else {
          console.log(`[TestStability] ✅ Operation succeeded on first attempt: ${description}`);
        }

        if (circuitKey) {
          this.recordSuccess(circuitKey);
        }

        this.recordOperation(description, true, retryCount);
        return result;

      } catch (error: any) {
        lastError = error;
        const isRetryable = this.isRetryableError(error, retryableErrors);

        if (attempt <= maxRetries && isRetryable) {
          retryCount++;
          const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, retryCount - 1), maxDelay);

          console.log(`[TestStability] ⚠️ Attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`);

          // Add jitter to avoid thundering herd
          const jitteredDelay = delay + Math.random() * 500;
          await this.delay(jitteredDelay);

          continue;
        } else {
          // Final failure - record metrics and circuit breaker
          this.metrics.failedOperations++;
          console.log(`[TestStability] ❌ Operation failed after ${attempt - 1} attempts: ${description}`);
          console.log(`[TestStability] Final error: ${error.message}`);

          const circuitKey = this.extractCircuitKey(description);
          if (circuitKey) {
            this.recordFailure(circuitKey);
          }

          this.recordOperation(description, false, retryCount);
          throw error;
        }
      }
    }

    throw lastError!;
  }

  /**
   * Specialized retry for API requests with intelligent error handling
   */
  async retryApiRequest<T>(
    requestFunction: () => Promise<T>,
    endpoint: string,
    options: RetryOptions = {}
  ): Promise<T> {
    const enhancedOptions = {
      ...options,
      description: `API request to ${endpoint}`,
      retryableErrors: [
        ...RETRYABLE_ERROR_PATTERNS,
        'NetworkError',
        'AbortError',
        'TimeoutError',
        '5\\d\\d', // 5xx HTTP errors
        'HTTP 429', // Rate limiting
        'HTTP 503', // Service unavailable
        'HTTP 502', // Bad gateway
        'HTTP 504', // Gateway timeout
      ]
    };

    return this.executeWithStability(requestFunction, enhancedOptions);
  }

  /**
   * Specialized retry for database operations
   */
  async retryDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationType: string,
    options: RetryOptions = {}
  ): Promise<T> {
    const enhancedOptions = {
      ...options,
      description: `Database ${operationType}`,
      maxRetries: 5, // Database conflicts may need more retries
      baseDelay: 500, // Faster retry for DB conflicts
      retryableErrors: [
        'Foreign key constraint violated',
        'Unique constraint failed',
        'Connection timeout',
        'Transaction deadlock',
        'Record not found',
        'Serial number already exists',
        'Circular reference detected',
        'depends on one or more records',
      ]
    };

    return this.executeWithStability(operation, enhancedOptions);
  }

  /**
   * Specialized retry for business logic operations
   */
  async retryBusinessLogic<T>(
    operation: () => Promise<T>,
    businessOperation: string,
    options: RetryOptions = {}
  ): Promise<T> {
    const enhancedOptions = {
      ...options,
      description: `Business logic: ${businessOperation}`,
      maxRetries: 4,
      baseDelay: 800,
      retryableErrors: [
        'Invalid status transition',
        'Cannot depend on itself',
        'Circular reference detected',
        'Status transition.*PENDING.*COMPLETED',
        'Work order.*cannot be dispatched',
        'Serial number already exists',
        'Invalid formula',
        'test case\\(s\\) failed',
        'Value expected \\(char \\d+\\)',
      ]
    };

    return this.executeWithStability(operation, enhancedOptions);
  }

  /**
   * Check if error is retryable based on patterns
   */
  private isRetryableError(error: Error, retryablePatterns: string[]): boolean {
    const errorMessage = error.message;
    return retryablePatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(errorMessage);
    });
  }

  /**
   * Extract circuit breaker key from operation description
   */
  private extractCircuitKey(description: string): string | null {
    for (const operation of CIRCUIT_BREAKER_OPERATIONS) {
      if (description.toLowerCase().includes(operation.toLowerCase())) {
        return operation;
      }
    }
    return null;
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitOpen(key: string): boolean {
    const state = this.circuitBreakerStates.get(key);
    if (!state) return false;

    const now = Date.now();

    if (state.state === 'OPEN') {
      if (now - state.lastFailureTime > state.resetTimeout) {
        state.state = 'HALF_OPEN';
        state.halfOpenAttempts = 0;
        console.log(`[CircuitBreaker] ${key} transitioned to HALF_OPEN`);
      }
      return state.state === 'OPEN';
    }

    return false;
  }

  private recordSuccess(key: string): void {
    const state = this.circuitBreakerStates.get(key) || this.createCircuitBreakerState();

    if (state.state === 'HALF_OPEN') {
      state.halfOpenAttempts++;
      if (state.halfOpenAttempts >= 2) { // Require 2 successes to close
        state.state = 'CLOSED';
        state.consecutiveFailures = 0;
        console.log(`[CircuitBreaker] ${key} transitioned to CLOSED`);
      }
    } else {
      state.consecutiveFailures = 0;
    }

    this.circuitBreakerStates.set(key, state);
  }

  private recordFailure(key: string): void {
    const state = this.circuitBreakerStates.get(key) || this.createCircuitBreakerState();

    state.consecutiveFailures++;
    state.lastFailureTime = Date.now();

    if (state.state === 'HALF_OPEN') {
      state.state = 'OPEN';
      this.metrics.circuitBreakerTrips++;
      console.log(`[CircuitBreaker] ${key} transitioned to OPEN (half-open failure)`);
    } else if (state.consecutiveFailures >= state.failureThreshold) {
      state.state = 'OPEN';
      this.metrics.circuitBreakerTrips++;
      console.log(`[CircuitBreaker] ${key} transitioned to OPEN (threshold exceeded)`);
    }

    this.circuitBreakerStates.set(key, state);
  }

  private createCircuitBreakerState(): CircuitBreakerState {
    return {
      state: 'CLOSED',
      consecutiveFailures: 0,
      lastFailureTime: 0,
      failureThreshold: 3,
      resetTimeout: 30000, // 30 seconds
      halfOpenAttempts: 0,
    };
  }

  /**
   * Record operation for metrics
   */
  private recordOperation(description: string, success: boolean, retryCount: number): void {
    this.operationHistory.push({
      description,
      success,
      retryCount,
      timestamp: Date.now(),
    });

    // Update average retry count
    const totalRetries = this.operationHistory.reduce((sum, op) => sum + op.retryCount, 0);
    this.metrics.averageRetryCount = totalRetries / this.operationHistory.length;

    // Keep only last 1000 operations to prevent memory bloat
    if (this.operationHistory.length > 1000) {
      this.operationHistory = this.operationHistory.slice(-1000);
    }
  }

  /**
   * Get current stability metrics
   */
  getMetrics(): StabilityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get circuit breaker status for all monitored operations
   */
  getCircuitBreakerStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    for (const [key, state] of this.circuitBreakerStates.entries()) {
      status[key] = state.state;
    }
    return status;
  }

  /**
   * Reset all circuit breakers (useful for test cleanup)
   */
  resetCircuitBreakers(): void {
    this.circuitBreakerStates.clear();
    console.log('[CircuitBreaker] All circuit breakers reset');
  }

  /**
   * Print comprehensive stability report
   */
  printStabilityReport(): void {
    console.log('\n🔧 TEST STABILITY REPORT 🔧');
    console.log('================================');
    console.log(`Total Operations: ${this.metrics.totalOperations}`);
    console.log(`Successful: ${this.metrics.successfulOperations} (${(this.metrics.successfulOperations / this.metrics.totalOperations * 100).toFixed(1)}%)`);
    console.log(`Failed: ${this.metrics.failedOperations} (${(this.metrics.failedOperations / this.metrics.totalOperations * 100).toFixed(1)}%)`);
    console.log(`Required Retries: ${this.metrics.retriedOperations}`);
    console.log(`Circuit Breaker Trips: ${this.metrics.circuitBreakerTrips}`);
    console.log(`Average Retry Count: ${this.metrics.averageRetryCount.toFixed(2)}`);

    const circuitStatus = this.getCircuitBreakerStatus();
    if (Object.keys(circuitStatus).length > 0) {
      console.log('\nCircuit Breaker Status:');
      for (const [key, status] of Object.entries(circuitStatus)) {
        console.log(`  ${key}: ${status}`);
      }
    }
    console.log('================================\n');
  }

  /**
   * Simple delay utility with jitter
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveFailures: number;
  lastFailureTime: number;
  failureThreshold: number;
  resetTimeout: number;
  halfOpenAttempts: number;
}

interface OperationResult {
  description: string;
  success: boolean;
  retryCount: number;
  timestamp: number;
}

/**
 * Factory function to create a test stability manager
 */
export function createTestStabilityManager(page?: Page): TestStabilityManager {
  return new TestStabilityManager(page);
}

/**
 * Global stability manager for cross-test stability tracking
 */
let globalStabilityManager: TestStabilityManager | null = null;

export function getGlobalStabilityManager(): TestStabilityManager {
  if (!globalStabilityManager) {
    globalStabilityManager = new TestStabilityManager();
  }
  return globalStabilityManager;
}

/**
 * Helper decorators for common stability patterns
 */
export const StabilityPatterns = {
  /**
   * Wrap API calls with retry logic
   */
  retryApi: <T>(endpoint: string, options?: RetryOptions) =>
    (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;
      descriptor.value = async function(...args: any[]) {
        const stabilityManager = getGlobalStabilityManager();
        return stabilityManager.retryApiRequest(
          () => method.apply(this, args),
          endpoint,
          options
        );
      };
    },

  /**
   * Wrap database operations with retry logic
   */
  retryDatabase: <T>(operationType: string, options?: RetryOptions) =>
    (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;
      descriptor.value = async function(...args: any[]) {
        const stabilityManager = getGlobalStabilityManager();
        return stabilityManager.retryDatabaseOperation(
          () => method.apply(this, args),
          operationType,
          options
        );
      };
    },

  /**
   * Wrap business logic with retry logic
   */
  retryBusinessLogic: <T>(operationType: string, options?: RetryOptions) =>
    (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;
      descriptor.value = async function(...args: any[]) {
        const stabilityManager = getGlobalStabilityManager();
        return stabilityManager.retryBusinessLogic(
          () => method.apply(this, args),
          operationType,
          options
        );
      };
    },
};