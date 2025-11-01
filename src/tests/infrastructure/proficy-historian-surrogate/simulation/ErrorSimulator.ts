/**
 * Error Simulator for testing failure scenarios
 * Provides configurable error injection for various API endpoints and operations
 */
export class ErrorSimulator {
  private config: ErrorSimulationConfig;
  private errorHistory: ErrorEvent[] = [];
  private circuitBreakerStates: Map<string, CircuitBreakerState> = new Map();

  constructor(config: Partial<ErrorSimulationConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_CONFIG, ...config };
    console.log('ErrorSimulator initialized with config:', this.config);
  }

  /**
   * Determine if an error should be simulated for a request
   */
  shouldSimulateError(path: string, method: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check circuit breaker state
    const circuitKey = `${method}:${path}`;
    const circuitState = this.circuitBreakerStates.get(circuitKey);
    if (circuitState?.state === 'OPEN') {
      return true; // Circuit is open, simulate error
    }

    // Check endpoint-specific error rates
    const endpointConfig = this.getEndpointConfig(path, method);
    const errorRate = endpointConfig?.errorRate ?? this.config.globalErrorRate;

    // Random error simulation
    if (Math.random() < errorRate) {
      this.recordError(path, method, 'RANDOM_ERROR');
      return true;
    }

    // Pattern-based errors
    if (this.shouldSimulatePatternError(path, method)) {
      return true;
    }

    return false;
  }

  /**
   * Generate an appropriate error for the request
   */
  generateError(path: string, method: string): SimulatedError {
    const errorType = this.selectErrorType(path, method);
    const error = this.createError(errorType, path, method);

    // Record the error
    this.recordError(path, method, errorType);

    // Update circuit breaker if configured
    this.updateCircuitBreaker(path, method, true);

    return error;
  }

  /**
   * Simulate latency for requests
   */
  simulateLatency(): number {
    if (!this.config.latencySimulation.enabled) {
      return 0;
    }

    // Generate latency using normal distribution around average
    const baseLatency = this.config.latencySimulation.averageLatency;
    const variance = this.config.latencySimulation.variance;

    // Simple normal distribution approximation
    const random1 = Math.random();
    const random2 = Math.random();
    const normalRandom = Math.sqrt(-2 * Math.log(random1)) * Math.cos(2 * Math.PI * random2);

    const latency = Math.max(0, baseLatency + (normalRandom * variance));
    return Math.round(latency);
  }

  /**
   * Update error simulation configuration
   */
  updateConfiguration(updates: Partial<ErrorSimulationConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('ErrorSimulator configuration updated');
  }

  /**
   * Reset error simulation state
   */
  reset(): void {
    this.errorHistory = [];
    this.circuitBreakerStates.clear();
    console.log('ErrorSimulator state reset');
  }

  /**
   * Get error simulation statistics
   */
  getStatistics(): ErrorSimulationStatistics {
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(e => now - e.timestamp.getTime() < 60000); // Last minute

    const errorsByType: { [key: string]: number } = {};
    const errorsByEndpoint: { [key: string]: number } = {};

    for (const error of this.errorHistory) {
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
      const endpoint = `${error.method}:${error.path}`;
      errorsByEndpoint[endpoint] = (errorsByEndpoint[endpoint] || 0) + 1;
    }

    return {
      totalErrors: this.errorHistory.length,
      recentErrors: recentErrors.length,
      errorsByType,
      errorsByEndpoint,
      circuitBreakerStates: Array.from(this.circuitBreakerStates.entries()).map(([key, state]) => ({
        endpoint: key,
        state: state.state,
        failureCount: state.failureCount,
        lastFailure: state.lastFailure
      }))
    };
  }

  /**
   * Enable/disable error simulation
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`ErrorSimulator ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Configure circuit breaker for an endpoint
   */
  configureCircuitBreaker(path: string, method: string, config: CircuitBreakerConfig): void {
    const key = `${method}:${path}`;
    this.circuitBreakerStates.set(key, {
      state: 'CLOSED',
      failureCount: 0,
      lastFailure: null,
      config
    });
  }

  // Private helper methods

  private getEndpointConfig(path: string, method: string): EndpointErrorConfig | undefined {
    return this.config.endpointConfigs?.find(config =>
      config.path === path && config.method === method
    );
  }

  private shouldSimulatePatternError(path: string, method: string): boolean {
    // Simulate errors based on patterns
    if (this.config.patterns.simulateTimeouts && path.includes('/data/query')) {
      // Simulate timeout for large queries
      if (Math.random() < 0.05) { // 5% chance
        this.recordError(path, method, 'TIMEOUT');
        return true;
      }
    }

    if (this.config.patterns.simulateAuthFailures && path.includes('/historian')) {
      // Simulate authentication failures
      if (Math.random() < 0.02) { // 2% chance
        this.recordError(path, method, 'AUTH_FAILURE');
        return true;
      }
    }

    if (this.config.patterns.simulateRateLimiting && method === 'POST') {
      // Simulate rate limiting on write operations
      if (Math.random() < 0.03) { // 3% chance
        this.recordError(path, method, 'RATE_LIMITED');
        return true;
      }
    }

    return false;
  }

  private selectErrorType(path: string, method: string): string {
    const endpointConfig = this.getEndpointConfig(path, method);
    const errorTypes = endpointConfig?.errorTypes ?? this.config.defaultErrorTypes;

    // Weighted random selection
    const totalWeight = errorTypes.reduce((sum, type) => sum + (type.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const errorType of errorTypes) {
      random -= (errorType.weight || 1);
      if (random <= 0) {
        return errorType.type;
      }
    }

    return errorTypes[0]?.type || 'INTERNAL_ERROR';
  }

  private createError(errorType: string, path: string, method: string): SimulatedError {
    const errorDefinitions: { [key: string]: Partial<SimulatedError> } = {
      CONNECTION_TIMEOUT: {
        statusCode: 408,
        message: 'Request timeout - connection to historian server timed out',
        code: 'TIMEOUT_ERROR',
        retryable: true
      },
      AUTH_FAILURE: {
        statusCode: 401,
        message: 'Authentication failed - invalid credentials',
        code: 'AUTH_ERROR',
        retryable: false
      },
      RATE_LIMITED: {
        statusCode: 429,
        message: 'Rate limit exceeded - too many requests',
        code: 'RATE_LIMIT_ERROR',
        retryable: true
      },
      INTERNAL_ERROR: {
        statusCode: 500,
        message: 'Internal server error in historian service',
        code: 'INTERNAL_ERROR',
        retryable: true
      },
      SERVICE_UNAVAILABLE: {
        statusCode: 503,
        message: 'Historian service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
        retryable: true
      },
      BAD_REQUEST: {
        statusCode: 400,
        message: 'Invalid request format or parameters',
        code: 'BAD_REQUEST',
        retryable: false
      },
      NOT_FOUND: {
        statusCode: 404,
        message: 'Requested resource not found',
        code: 'NOT_FOUND',
        retryable: false
      },
      STORAGE_FULL: {
        statusCode: 507,
        message: 'Historian storage capacity exceeded',
        code: 'STORAGE_FULL',
        retryable: false
      },
      NETWORK_ERROR: {
        statusCode: 502,
        message: 'Network error communicating with historian',
        code: 'NETWORK_ERROR',
        retryable: true
      }
    };

    const definition = errorDefinitions[errorType] || errorDefinitions.INTERNAL_ERROR;

    return {
      statusCode: definition.statusCode!,
      message: definition.message!,
      code: definition.code!,
      retryable: definition.retryable!,
      timestamp: new Date(),
      endpoint: `${method} ${path}`,
      errorType
    };
  }

  private recordError(path: string, method: string, errorType: string): void {
    const errorEvent: ErrorEvent = {
      timestamp: new Date(),
      path,
      method,
      errorType
    };

    this.errorHistory.push(errorEvent);

    // Keep only recent errors to prevent memory bloat
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    this.errorHistory = this.errorHistory.filter(e => e.timestamp > cutoffTime);
  }

  private updateCircuitBreaker(path: string, method: string, failed: boolean): void {
    const key = `${method}:${path}`;
    const state = this.circuitBreakerStates.get(key);

    if (!state) return;

    if (failed) {
      state.failureCount++;
      state.lastFailure = new Date();

      // Open circuit if failure threshold reached
      if (state.failureCount >= state.config.failureThreshold) {
        state.state = 'OPEN';
        console.log(`Circuit breaker opened for ${key}`);

        // Schedule circuit breaker to half-open
        setTimeout(() => {
          if (state.state === 'OPEN') {
            state.state = 'HALF_OPEN';
            console.log(`Circuit breaker half-opened for ${key}`);
          }
        }, state.config.openDuration);
      }
    } else {
      // Reset on success
      if (state.state === 'HALF_OPEN') {
        state.state = 'CLOSED';
        state.failureCount = 0;
        console.log(`Circuit breaker closed for ${key}`);
      }
    }
  }
}

/**
 * Error simulation configuration
 */
export interface ErrorSimulationConfig {
  enabled: boolean;
  globalErrorRate: number;
  defaultErrorTypes: ErrorTypeConfig[];
  endpointConfigs?: EndpointErrorConfig[];
  patterns: {
    simulateTimeouts: boolean;
    simulateAuthFailures: boolean;
    simulateRateLimiting: boolean;
    simulateNetworkIssues: boolean;
  };
  latencySimulation: {
    enabled: boolean;
    averageLatency: number;
    variance: number;
  };
}

/**
 * Error type configuration with weighting
 */
export interface ErrorTypeConfig {
  type: string;
  weight?: number;
}

/**
 * Endpoint-specific error configuration
 */
export interface EndpointErrorConfig {
  path: string;
  method: string;
  errorRate: number;
  errorTypes: ErrorTypeConfig[];
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  openDuration: number; // milliseconds
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailure: Date | null;
  config: CircuitBreakerConfig;
}

/**
 * Simulated error details
 */
export interface SimulatedError {
  statusCode: number;
  message: string;
  code: string;
  retryable: boolean;
  timestamp: Date;
  endpoint: string;
  errorType: string;
}

/**
 * Error event record
 */
interface ErrorEvent {
  timestamp: Date;
  path: string;
  method: string;
  errorType: string;
}

/**
 * Error simulation statistics
 */
export interface ErrorSimulationStatistics {
  totalErrors: number;
  recentErrors: number;
  errorsByType: { [key: string]: number };
  errorsByEndpoint: { [key: string]: number };
  circuitBreakerStates: Array<{
    endpoint: string;
    state: string;
    failureCount: number;
    lastFailure: Date | null;
  }>;
}

/**
 * Default error simulation configuration
 */
export const DEFAULT_ERROR_CONFIG: ErrorSimulationConfig = {
  enabled: false,
  globalErrorRate: 0.01, // 1% error rate
  defaultErrorTypes: [
    { type: 'CONNECTION_TIMEOUT', weight: 3 },
    { type: 'INTERNAL_ERROR', weight: 2 },
    { type: 'SERVICE_UNAVAILABLE', weight: 2 },
    { type: 'NETWORK_ERROR', weight: 2 },
    { type: 'AUTH_FAILURE', weight: 1 }
  ],
  patterns: {
    simulateTimeouts: true,
    simulateAuthFailures: true,
    simulateRateLimiting: true,
    simulateNetworkIssues: true
  },
  latencySimulation: {
    enabled: false,
    averageLatency: 50, // 50ms average
    variance: 20 // ±20ms variance
  }
};