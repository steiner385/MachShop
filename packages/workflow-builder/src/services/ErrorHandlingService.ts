/**
 * Error Handling Service
 * Manages error handling, recovery, and resilience strategies
 */

import { WorkflowExecution } from '../types/workflow';

/**
 * Error context
 */
export interface ErrorContext {
  executionId: string;
  nodeId: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  attemptNumber: number;
  timestamp: number;
}

/**
 * Retry strategy
 */
export interface RetryStrategy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number; // 0-1, adds randomness to delay
}

/**
 * Error recovery action
 */
export interface ErrorRecoveryAction {
  type: 'retry' | 'skip' | 'fallback' | 'abort' | 'notify';
  config?: {
    retryStrategy?: RetryStrategy;
    fallbackNodeId?: string;
    notificationTarget?: string;
  };
}

/**
 * Error handler definition
 */
export interface ErrorHandlerDefinition {
  id: string;
  name: string;
  errorPattern: RegExp | string;
  action: ErrorRecoveryAction;
  priority: number;
  enabled: boolean;
  metadata?: Record<string, any>;
}

/**
 * Error recovery result
 */
export interface ErrorRecoveryResult {
  success: boolean;
  action: ErrorRecoveryAction;
  result?: any;
  error?: Error;
  duration: number;
  recoveredAt: number;
}

/**
 * Error Handling Service
 */
export class ErrorHandlingService {
  private errorHandlers: Map<string, ErrorHandlerDefinition> = new Map();
  private errorHistory: ErrorContext[] = [];
  private maxHistorySize = 1000;

  /**
   * Register error handler
   */
  registerErrorHandler(handler: ErrorHandlerDefinition): boolean {
    try {
      // Validate pattern
      if (typeof handler.errorPattern === 'string') {
        new RegExp(handler.errorPattern);
      }

      this.errorHandlers.set(handler.id, handler);
      return true;
    } catch (error) {
      console.error(`Failed to register error handler ${handler.id}:`, error);
      return false;
    }
  }

  /**
   * Unregister error handler
   */
  unregisterErrorHandler(handlerId: string): boolean {
    return this.errorHandlers.delete(handlerId);
  }

  /**
   * Get error handler by ID
   */
  getErrorHandler(handlerId: string): ErrorHandlerDefinition | undefined {
    return this.errorHandlers.get(handlerId);
  }

  /**
   * Find matching error handler
   */
  findMatchingHandler(errorCode: string): ErrorHandlerDefinition | undefined {
    const handlers = Array.from(this.errorHandlers.values())
      .filter(h => h.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const handler of handlers) {
      const pattern = typeof handler.errorPattern === 'string'
        ? new RegExp(handler.errorPattern)
        : handler.errorPattern;

      if (pattern.test(errorCode)) {
        return handler;
      }
    }

    return undefined;
  }

  /**
   * Handle error with recovery
   */
  async handleError(context: ErrorContext): Promise<ErrorRecoveryResult> {
    const startTime = Date.now();

    try {
      // Record error
      this.recordError(context);

      // Find matching handler
      const handler = this.findMatchingHandler(context.error.code);

      if (!handler) {
        return {
          success: false,
          action: { type: 'abort' },
          error: new Error(`No handler found for error ${context.error.code}`),
          duration: Date.now() - startTime,
          recoveredAt: Date.now(),
        };
      }

      // Execute recovery action
      const result = await this.executeRecoveryAction(
        handler.action,
        context
      );

      return {
        success: result.success,
        action: handler.action,
        result: result.data,
        duration: Date.now() - startTime,
        recoveredAt: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        action: { type: 'abort' },
        error: error as Error,
        duration: Date.now() - startTime,
        recoveredAt: Date.now(),
      };
    }
  }

  /**
   * Execute recovery action
   */
  private async executeRecoveryAction(
    action: ErrorRecoveryAction,
    context: ErrorContext
  ): Promise<{ success: boolean; data?: any }> {
    switch (action.type) {
      case 'retry':
        return await this.executeRetry(action, context);

      case 'skip':
        return { success: true, data: { skipped: true } };

      case 'fallback':
        return {
          success: true,
          data: { fallbackNodeId: action.config?.fallbackNodeId },
        };

      case 'notify':
        return await this.executeNotification(action, context);

      case 'abort':
      default:
        return { success: false };
    }
  }

  /**
   * Execute retry action
   */
  private async executeRetry(
    action: ErrorRecoveryAction,
    context: ErrorContext
  ): Promise<{ success: boolean; data?: any }> {
    const strategy = action.config?.retryStrategy || this.getDefaultRetryStrategy();

    if (context.attemptNumber >= strategy.maxAttempts) {
      return {
        success: false,
        data: { maxAttemptsReached: true, attemptNumber: context.attemptNumber },
      };
    }

    // Calculate delay with backoff and jitter
    const exponentialDelay = strategy.initialDelayMs *
      Math.pow(strategy.backoffMultiplier, context.attemptNumber - 1);

    const clampedDelay = Math.min(exponentialDelay, strategy.maxDelayMs);

    const jitter = strategy.jitterFactor > 0
      ? clampedDelay * strategy.jitterFactor * (Math.random() - 0.5) * 2
      : 0;

    const finalDelay = Math.max(1, clampedDelay + jitter);

    // Wait before retry
    await this.sleep(finalDelay);

    return {
      success: true,
      data: { retryScheduled: true, delayMs: finalDelay, attemptNumber: context.attemptNumber + 1 },
    };
  }

  /**
   * Execute notification action
   */
  private async executeNotification(
    action: ErrorRecoveryAction,
    context: ErrorContext
  ): Promise<{ success: boolean; data?: any }> {
    const target = action.config?.notificationTarget;

    if (!target) {
      return { success: false, data: { noTarget: true } };
    }

    // TODO: Implement actual notification sending
    return {
      success: true,
      data: {
        notified: true,
        target,
        message: `Error in node ${context.nodeId}: ${context.error.message}`,
      },
    };
  }

  /**
   * Record error in history
   */
  private recordError(context: ErrorContext): void {
    this.errorHistory.push(context);

    // Trim history if too large
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(filters?: {
    executionId?: string;
    nodeId?: string;
    errorCode?: string;
    startTime?: number;
    endTime?: number;
  }): ErrorContext[] {
    let history = this.errorHistory;

    if (filters) {
      history = history.filter(error => {
        if (filters.executionId && error.executionId !== filters.executionId) {
          return false;
        }
        if (filters.nodeId && error.nodeId !== filters.nodeId) {
          return false;
        }
        if (filters.errorCode && error.error.code !== filters.errorCode) {
          return false;
        }
        if (filters.startTime && error.timestamp < filters.startTime) {
          return false;
        }
        if (filters.endTime && error.timestamp > filters.endTime) {
          return false;
        }
        return true;
      });
    }

    return history;
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(executionId?: string): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    errorsByNode: Record<string, number>;
    mostRecentError?: ErrorContext;
  } {
    const errors = executionId
      ? this.errorHistory.filter(e => e.executionId === executionId)
      : this.errorHistory;

    const errorsByCode: Record<string, number> = {};
    const errorsByNode: Record<string, number> = {};

    for (const error of errors) {
      errorsByCode[error.error.code] = (errorsByCode[error.error.code] || 0) + 1;
      errorsByNode[error.nodeId] = (errorsByNode[error.nodeId] || 0) + 1;
    }

    return {
      totalErrors: errors.length,
      errorsByCode,
      errorsByNode,
      mostRecentError: errors[errors.length - 1],
    };
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get circuit breaker status for node
   */
  getCircuitBreakerStatus(nodeId: string, windowMs: number = 60000): {
    status: 'healthy' | 'degraded' | 'broken';
    errorCount: number;
    lastErrorTime?: number;
  } {
    const now = Date.now();
    const errors = this.errorHistory.filter(
      e => e.nodeId === nodeId && e.timestamp > now - windowMs
    );

    const errorCount = errors.length;

    if (errorCount === 0) {
      return { status: 'healthy', errorCount: 0 };
    } else if (errorCount < 5) {
      return {
        status: 'degraded',
        errorCount,
        lastErrorTime: errors[errors.length - 1].timestamp,
      };
    } else {
      return {
        status: 'broken',
        errorCount,
        lastErrorTime: errors[errors.length - 1].timestamp,
      };
    }
  }

  /**
   * Check if node should be circuit broken
   */
  shouldCircuitBreak(nodeId: string, windowMs: number = 60000): boolean {
    return this.getCircuitBreakerStatus(nodeId, windowMs).status === 'broken';
  }

  /**
   * Get default retry strategy
   */
  private getDefaultRetryStrategy(): RetryStrategy {
    return {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create resilience policy
   */
  createResiliencePolicy(config: {
    name: string;
    retryStrategy?: RetryStrategy;
    circuitBreakerThreshold?: number;
    timeoutMs?: number;
  }): ErrorHandlerDefinition {
    return {
      id: `policy-${Date.now()}`,
      name: config.name,
      errorPattern: '.*',
      action: {
        type: 'retry',
        config: { retryStrategy: config.retryStrategy },
      },
      priority: 100,
      enabled: true,
      metadata: { timeoutMs: config.timeoutMs },
    };
  }

  /**
   * Export handlers for backup
   */
  exportHandlers(): ErrorHandlerDefinition[] {
    return Array.from(this.errorHandlers.values());
  }

  /**
   * Import handlers from backup
   */
  importHandlers(handlers: ErrorHandlerDefinition[]): number {
    let importedCount = 0;

    for (const handler of handlers) {
      if (this.registerErrorHandler(handler)) {
        importedCount++;
      }
    }

    return importedCount;
  }

  /**
   * Get handler count
   */
  getHandlerCount(): number {
    return this.errorHandlers.size;
  }

  /**
   * Get all handlers
   */
  getAllHandlers(): ErrorHandlerDefinition[] {
    return Array.from(this.errorHandlers.values());
  }
}

export default ErrorHandlingService;
