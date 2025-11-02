/**
 * Base Integration Connector Abstract Class
 * Provides foundation for all integration adapters with common functionality
 */

import {
  ConnectorConfig,
  ConnectorStatus,
  IntegrationRequest,
  IntegrationResponse,
  AuthenticationCredential,
  ConnectorHealthStatus,
  CircuitBreakerState,
  RecoveryPoint,
  IntegrationError,
} from '../types';

/**
 * Abstract base class for all integration connectors
 * Implements common patterns: authentication, retry logic, circuit breaker, health checks
 */
export abstract class BaseIntegrationConnector {
  protected config: ConnectorConfig;
  protected status: ConnectorStatus = ConnectorStatus.INACTIVE;
  protected circuitBreaker: CircuitBreakerState = {
    state: 'closed',
    failureCount: 0,
    successCount: 0,
    totalFailures: 0,
  };
  protected operationHistory: IntegrationResponse[] = [];
  protected recoveryPoints: Map<string, RecoveryPoint> = new Map();

  constructor(config: ConnectorConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validate connector configuration
   */
  protected validateConfig(): void {
    if (!this.config.id || !this.config.name) {
      throw new Error('Connector must have id and name');
    }
    if (!this.config.authentication) {
      throw new Error('Connector must have authentication configuration');
    }
  }

  /**
   * Initialize connector - to be implemented by subclasses
   */
  abstract initialize(): Promise<void>;

  /**
   * Execute integration request - to be implemented by subclasses
   */
  abstract executeRequest(request: IntegrationRequest): Promise<IntegrationResponse>;

  /**
   * Validate connection - to be implemented by subclasses
   */
  abstract validateConnection(): Promise<boolean>;

  /**
   * Get health status - to be implemented by subclasses
   */
  abstract getHealthStatus(): Promise<ConnectorHealthStatus>;

  /**
   * Connect to external system
   */
  async connect(): Promise<void> {
    try {
      await this.initialize();
      this.status = ConnectorStatus.ACTIVE;
    } catch (error) {
      this.status = ConnectorStatus.ERROR;
      throw new Error(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect from external system
   */
  async disconnect(): Promise<void> {
    this.status = ConnectorStatus.INACTIVE;
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async executeWithCircuitBreaker(request: IntegrationRequest): Promise<IntegrationResponse> {
    if (this.circuitBreaker.state === 'open') {
      const now = new Date();
      if (!this.circuitBreaker.nextRetryAt || now < this.circuitBreaker.nextRetryAt) {
        throw new Error('Circuit breaker is open - connector unavailable');
      }
      this.circuitBreaker.state = 'half-open';
    }

    try {
      const response = await this.executeRequest(request);

      // Record success
      if (response.status === 'success') {
        this.circuitBreaker.successCount++;
        if (this.circuitBreaker.state === 'half-open') {
          this.resetCircuitBreaker();
        }
      } else {
        this.recordFailure();
      }

      this.operationHistory.push(response);
      return response;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record operation failure and update circuit breaker
   */
  protected recordFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.totalFailures++;
    this.circuitBreaker.lastFailureAt = new Date();

    // Open circuit breaker after threshold
    const threshold = this.config.retryConfig?.maxAttempts ?? 5;
    if (this.circuitBreaker.failureCount >= threshold) {
      this.circuitBreaker.state = 'open';
      this.circuitBreaker.nextRetryAt = new Date(
        Date.now() + (this.config.timeout ?? 30000)
      );
      this.status = ConnectorStatus.UNAVAILABLE;
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  protected resetCircuitBreaker(): void {
    this.circuitBreaker = {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      totalFailures: this.circuitBreaker.totalFailures,
    };
    this.status = ConnectorStatus.ACTIVE;
  }

  /**
   * Create recovery point for safe rollback
   */
  async createRecoveryPoint(data: unknown, description?: string): Promise<RecoveryPoint> {
    const recoveryPoint: RecoveryPoint = {
      id: `recovery-${Date.now()}`,
      connectorId: this.config.id,
      timestamp: new Date(),
      snapshot: {
        data,
        configuration: { ...this.config },
        metadata: { status: this.status },
      },
      createdBy: 'system',
      description,
      isAutomatic: true,
    };

    this.recoveryPoints.set(recoveryPoint.id, recoveryPoint);
    return recoveryPoint;
  }

  /**
   * Restore from recovery point
   */
  async restoreFromRecoveryPoint(pointId: string): Promise<void> {
    const point = this.recoveryPoints.get(pointId);
    if (!point) {
      throw new Error(`Recovery point ${pointId} not found`);
    }

    // Implementation specific to subclass
    await this.executeRecovery(point);
  }

  /**
   * Execute recovery - to be implemented by subclasses
   */
  protected abstract executeRecovery(point: RecoveryPoint): Promise<void>;

  /**
   * Get connector status
   */
  getStatus(): ConnectorStatus {
    return this.status;
  }

  /**
   * Get connector configuration
   */
  getConfig(): ConnectorConfig {
    return this.config;
  }

  /**
   * Update connector configuration
   */
  updateConfig(updates: Partial<ConnectorConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
  }

  /**
   * Get operation history
   */
  getOperationHistory(limit?: number): IntegrationResponse[] {
    if (limit) {
      return this.operationHistory.slice(-limit);
    }
    return [...this.operationHistory];
  }

  /**
   * Clear operation history
   */
  clearOperationHistory(): void {
    this.operationHistory = [];
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Format error response
   */
  protected createErrorResponse(
    request: IntegrationRequest,
    error: Error
  ): IntegrationResponse {
    return {
      id: `response-${Date.now()}`,
      requestId: request.id,
      connectorId: this.config.id,
      status: 'failure',
      error: {
        code: 'EXECUTION_ERROR',
        message: error.message,
        retryable: true,
      },
      completedAt: new Date(),
    };
  }

  /**
   * Create successful response
   */
  protected createSuccessResponse(
    request: IntegrationRequest,
    data: unknown,
    rowsAffected?: number
  ): IntegrationResponse {
    return {
      id: `response-${Date.now()}`,
      requestId: request.id,
      connectorId: this.config.id,
      status: 'success',
      data,
      rowsAffected,
      completedAt: new Date(),
    };
  }
}
