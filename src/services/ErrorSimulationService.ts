/**
 * Error Simulation Service
 *
 * Comprehensive error and edge case simulation for testing surrogate services.
 * Provides controllable failure scenarios, network issues, data corruption,
 * and other edge cases to ensure robust testing of integration capabilities.
 */

import { EventEmitter } from 'events';

// Error Simulation Types
export enum SimulationMode {
  DISABLED = 'DISABLED',
  NETWORK_FAILURES = 'NETWORK_FAILURES',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  AUTHENTICATION_ERRORS = 'AUTHENTICATION_ERRORS',
  RATE_LIMITING = 'RATE_LIMITING',
  TIMEOUT_ERRORS = 'TIMEOUT_ERRORS',
  INTERMITTENT_FAILURES = 'INTERMITTENT_FAILURES',
  SYSTEM_OVERLOAD = 'SYSTEM_OVERLOAD',
  DATA_VALIDATION_ERRORS = 'DATA_VALIDATION_ERRORS',
  CASCADING_FAILURES = 'CASCADING_FAILURES'
}

export interface ErrorScenario {
  scenarioId: string;
  name: string;
  description: string;
  mode: SimulationMode;
  probability: number; // 0-1 (percentage of requests that will fail)
  delay?: number; // Additional delay in ms
  errorMessage?: string;
  httpStatusCode?: number;
  affectedServices?: string[]; // ['MAXIMO', 'INDYSOFT', 'ERP']
  duration?: number; // Duration of the scenario in ms
  triggers?: string[]; // Specific conditions that trigger this scenario
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  activatedAt?: Date;
  deactivatedAt?: Date;
}

export interface SimulationConfig {
  enableSimulation: boolean;
  globalProbability: number; // Global failure rate multiplier
  maxConcurrentScenarios: number;
  logAllSimulations: boolean;
  allowCascadingFailures: boolean;
  failureDelay: {
    min: number;
    max: number;
  };
  recoveryTime: {
    min: number;
    max: number;
  };
}

export interface SimulationResult {
  shouldFail: boolean;
  scenario?: ErrorScenario;
  delay: number;
  errorMessage: string;
  httpStatusCode: number;
  metadata?: Record<string, any>;
}

export interface NetworkFailure {
  type: 'CONNECTION_REFUSED' | 'TIMEOUT' | 'DNS_RESOLUTION' | 'SSL_ERROR' | 'SOCKET_HANG_UP';
  message: string;
  statusCode: number;
}

export interface DataCorruption {
  type: 'MISSING_FIELDS' | 'INVALID_FORMAT' | 'ENCODING_ERROR' | 'TRUNCATED_DATA' | 'MALFORMED_JSON';
  affectedFields: string[];
  corruptionLevel: 'MINOR' | 'MODERATE' | 'SEVERE';
}

/**
 * Error Simulation Service
 *
 * Provides comprehensive error simulation capabilities for testing surrogate services:
 * - Network failures and timeouts
 * - Data corruption and validation errors
 * - Authentication and authorization failures
 * - Rate limiting scenarios
 * - System overload conditions
 * - Cascading failure patterns
 * - Intermittent connectivity issues
 */
export class ErrorSimulationService extends EventEmitter {
  private config: SimulationConfig;
  private scenarios: Map<string, ErrorScenario> = new Map();
  private activeScenarios: Set<string> = new Set();
  private requestCounter: number = 0;
  private failureHistory: Array<{ timestamp: Date; scenario: string; service: string }> = [];

  // Predefined scenarios
  private scenarioCounter = 1;

  constructor(config: Partial<SimulationConfig> = {}) {
    super();
    this.config = {
      enableSimulation: true,
      globalProbability: 1.0, // No global reduction by default
      maxConcurrentScenarios: 5,
      logAllSimulations: true,
      allowCascadingFailures: true,
      failureDelay: { min: 100, max: 2000 },
      recoveryTime: { min: 5000, max: 30000 },
      ...config
    };

    this.initializePredefinedScenarios();
  }

  // Scenario Management
  createScenario(scenarioData: Partial<ErrorScenario>): ErrorScenario {
    const scenarioId = `SIM-${String(this.scenarioCounter++).padStart(6, '0')}`;

    const scenario: ErrorScenario = {
      scenarioId,
      name: scenarioData.name || `Simulation ${scenarioId}`,
      description: scenarioData.description || 'Custom error simulation scenario',
      mode: scenarioData.mode || SimulationMode.NETWORK_FAILURES,
      probability: scenarioData.probability ?? 0.1, // 10% default
      delay: scenarioData.delay,
      errorMessage: scenarioData.errorMessage,
      httpStatusCode: scenarioData.httpStatusCode,
      affectedServices: scenarioData.affectedServices || ['MAXIMO', 'INDYSOFT', 'ERP'],
      duration: scenarioData.duration,
      triggers: scenarioData.triggers || [],
      metadata: scenarioData.metadata || {},
      isActive: false,
      createdAt: new Date()
    };

    this.scenarios.set(scenarioId, scenario);
    this.emit('scenarioCreated', scenario);

    return scenario;
  }

  activateScenario(scenarioId: string): boolean {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) return false;

    if (this.activeScenarios.size >= this.config.maxConcurrentScenarios) {
      console.warn(`Cannot activate scenario ${scenarioId}: Maximum concurrent scenarios reached`);
      return false;
    }

    scenario.isActive = true;
    scenario.activatedAt = new Date();
    this.activeScenarios.add(scenarioId);

    // Auto-deactivate if duration is specified
    if (scenario.duration) {
      setTimeout(() => {
        this.deactivateScenario(scenarioId);
      }, scenario.duration);
    }

    this.emit('scenarioActivated', scenario);
    console.log(`[ErrorSim] Activated scenario: ${scenario.name} (${scenario.mode})`);

    return true;
  }

  deactivateScenario(scenarioId: string): boolean {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) return false;

    scenario.isActive = false;
    scenario.deactivatedAt = new Date();
    this.activeScenarios.delete(scenarioId);

    this.emit('scenarioDeactivated', scenario);
    console.log(`[ErrorSim] Deactivated scenario: ${scenario.name}`);

    return true;
  }

  // Main simulation method
  simulateRequest(service: string, operation: string, data?: any): SimulationResult {
    this.requestCounter++;

    if (!this.config.enableSimulation) {
      return this.createSuccessResult();
    }

    // Check each active scenario
    for (const scenarioId of this.activeScenarios) {
      const scenario = this.scenarios.get(scenarioId);
      if (!scenario) continue;

      // Check if this service is affected
      if (!scenario.affectedServices?.includes(service.toUpperCase())) {
        continue;
      }

      // Check probability
      const effectiveProbability = scenario.probability * this.config.globalProbability;
      if (Math.random() > effectiveProbability) {
        continue;
      }

      // This scenario will trigger
      const result = this.executeScenario(scenario, service, operation, data);

      // Log the failure
      this.failureHistory.push({
        timestamp: new Date(),
        scenario: scenarioId,
        service
      });

      // Clean up old history (keep last 1000 entries)
      if (this.failureHistory.length > 1000) {
        this.failureHistory = this.failureHistory.slice(-1000);
      }

      if (this.config.logAllSimulations) {
        console.log(`[ErrorSim] Triggered ${scenario.name} for ${service}.${operation}`);
      }

      this.emit('simulationTriggered', {
        scenario,
        service,
        operation,
        result
      });

      return result;
    }

    return this.createSuccessResult();
  }

  private executeScenario(scenario: ErrorScenario, service: string, operation: string, data?: any): SimulationResult {
    const baseDelay = scenario.delay || this.randomBetween(this.config.failureDelay.min, this.config.failureDelay.max);

    switch (scenario.mode) {
      case SimulationMode.NETWORK_FAILURES:
        return this.simulateNetworkFailure(scenario, baseDelay);

      case SimulationMode.DATA_CORRUPTION:
        return this.simulateDataCorruption(scenario, baseDelay, data);

      case SimulationMode.AUTHENTICATION_ERRORS:
        return this.simulateAuthenticationError(scenario, baseDelay);

      case SimulationMode.RATE_LIMITING:
        return this.simulateRateLimiting(scenario, baseDelay);

      case SimulationMode.TIMEOUT_ERRORS:
        return this.simulateTimeout(scenario, baseDelay);

      case SimulationMode.INTERMITTENT_FAILURES:
        return this.simulateIntermittentFailure(scenario, baseDelay);

      case SimulationMode.SYSTEM_OVERLOAD:
        return this.simulateSystemOverload(scenario, baseDelay);

      case SimulationMode.DATA_VALIDATION_ERRORS:
        return this.simulateValidationError(scenario, baseDelay, data);

      case SimulationMode.CASCADING_FAILURES:
        return this.simulateCascadingFailure(scenario, baseDelay, service);

      default:
        return this.createGenericFailure(scenario, baseDelay);
    }
  }

  // Specific simulation methods
  private simulateNetworkFailure(scenario: ErrorScenario, delay: number): SimulationResult {
    const networkFailures: NetworkFailure[] = [
      { type: 'CONNECTION_REFUSED', message: 'Connection refused by server', statusCode: 0 },
      { type: 'TIMEOUT', message: 'Request timeout after 30 seconds', statusCode: 408 },
      { type: 'DNS_RESOLUTION', message: 'DNS resolution failed for hostname', statusCode: 0 },
      { type: 'SSL_ERROR', message: 'SSL handshake failed', statusCode: 0 },
      { type: 'SOCKET_HANG_UP', message: 'Socket hang up during request', statusCode: 0 }
    ];

    const failure = networkFailures[Math.floor(Math.random() * networkFailures.length)];

    return {
      shouldFail: true,
      scenario,
      delay,
      errorMessage: scenario.errorMessage || failure.message,
      httpStatusCode: scenario.httpStatusCode || failure.statusCode,
      metadata: { networkFailureType: failure.type }
    };
  }

  private simulateDataCorruption(scenario: ErrorScenario, delay: number, data?: any): SimulationResult {
    const corruptionTypes: DataCorruption[] = [
      { type: 'MISSING_FIELDS', affectedFields: ['id', 'name'], corruptionLevel: 'SEVERE' },
      { type: 'INVALID_FORMAT', affectedFields: ['date', 'timestamp'], corruptionLevel: 'MODERATE' },
      { type: 'ENCODING_ERROR', affectedFields: ['description'], corruptionLevel: 'MINOR' },
      { type: 'TRUNCATED_DATA', affectedFields: ['payload'], corruptionLevel: 'MODERATE' },
      { type: 'MALFORMED_JSON', affectedFields: ['*'], corruptionLevel: 'SEVERE' }
    ];

    const corruption = corruptionTypes[Math.floor(Math.random() * corruptionTypes.length)];

    return {
      shouldFail: true,
      scenario,
      delay,
      errorMessage: scenario.errorMessage || `Data corruption detected: ${corruption.type}`,
      httpStatusCode: scenario.httpStatusCode || 400,
      metadata: { corruption, originalData: data }
    };
  }

  private simulateAuthenticationError(scenario: ErrorScenario, delay: number): SimulationResult {
    const authErrors = [
      'Invalid API key provided',
      'Authentication token expired',
      'Insufficient permissions for this operation',
      'Account suspended due to policy violation',
      'Authentication service unavailable'
    ];

    const errorMessage = authErrors[Math.floor(Math.random() * authErrors.length)];

    return {
      shouldFail: true,
      scenario,
      delay,
      errorMessage: scenario.errorMessage || errorMessage,
      httpStatusCode: scenario.httpStatusCode || 401,
      metadata: { authErrorType: 'AUTHENTICATION_FAILED' }
    };
  }

  private simulateRateLimiting(scenario: ErrorScenario, delay: number): SimulationResult {
    const retryAfter = Math.floor(Math.random() * 300) + 60; // 1-5 minutes

    return {
      shouldFail: true,
      scenario,
      delay,
      errorMessage: scenario.errorMessage || 'Rate limit exceeded. Too many requests.',
      httpStatusCode: scenario.httpStatusCode || 429,
      metadata: {
        retryAfter,
        rateLimitType: 'REQUEST_RATE_EXCEEDED',
        requestsPerHour: 1000
      }
    };
  }

  private simulateTimeout(scenario: ErrorScenario, delay: number): SimulationResult {
    return {
      shouldFail: true,
      scenario,
      delay: Math.max(delay, 30000), // Force long delay for timeout
      errorMessage: scenario.errorMessage || 'Request timeout',
      httpStatusCode: scenario.httpStatusCode || 408,
      metadata: { timeoutType: 'REQUEST_TIMEOUT' }
    };
  }

  private simulateIntermittentFailure(scenario: ErrorScenario, delay: number): SimulationResult {
    // Intermittent failures have varying success rates
    const failurePatterns = ['high', 'medium', 'low'];
    const pattern = failurePatterns[Math.floor(Math.random() * failurePatterns.length)];

    let shouldActuallyFail = false;
    switch (pattern) {
      case 'high': shouldActuallyFail = Math.random() < 0.8; break;
      case 'medium': shouldActuallyFail = Math.random() < 0.5; break;
      case 'low': shouldActuallyFail = Math.random() < 0.2; break;
    }

    if (!shouldActuallyFail) {
      return this.createSuccessResult();
    }

    return {
      shouldFail: true,
      scenario,
      delay,
      errorMessage: scenario.errorMessage || 'Intermittent service failure',
      httpStatusCode: scenario.httpStatusCode || 503,
      metadata: { failurePattern: pattern }
    };
  }

  private simulateSystemOverload(scenario: ErrorScenario, delay: number): SimulationResult {
    const overloadDelay = delay * (2 + Math.random() * 3); // 2-5x normal delay

    return {
      shouldFail: true,
      scenario,
      delay: overloadDelay,
      errorMessage: scenario.errorMessage || 'System overloaded. Please try again later.',
      httpStatusCode: scenario.httpStatusCode || 503,
      metadata: {
        overloadType: 'HIGH_CPU_USAGE',
        currentLoad: Math.floor(80 + Math.random() * 20) // 80-100%
      }
    };
  }

  private simulateValidationError(scenario: ErrorScenario, delay: number, data?: any): SimulationResult {
    const validationErrors = [
      'Required field missing: id',
      'Invalid email format',
      'Value exceeds maximum length',
      'Invalid date format',
      'Enum value not in allowed list',
      'Foreign key constraint violation'
    ];

    const errorMessage = validationErrors[Math.floor(Math.random() * validationErrors.length)];

    return {
      shouldFail: true,
      scenario,
      delay,
      errorMessage: scenario.errorMessage || errorMessage,
      httpStatusCode: scenario.httpStatusCode || 422,
      metadata: {
        validationType: 'SCHEMA_VALIDATION',
        rejectedData: data
      }
    };
  }

  private simulateCascadingFailure(scenario: ErrorScenario, delay: number, service: string): SimulationResult {
    // Activate additional failure scenarios for other services
    if (this.config.allowCascadingFailures) {
      setTimeout(() => {
        this.triggerCascadingFailures(service);
      }, delay);
    }

    return {
      shouldFail: true,
      scenario,
      delay,
      errorMessage: scenario.errorMessage || 'Service failure triggered cascading failures',
      httpStatusCode: scenario.httpStatusCode || 500,
      metadata: {
        cascadeOrigin: service,
        cascadeType: 'DOWNSTREAM_FAILURES'
      }
    };
  }

  private createGenericFailure(scenario: ErrorScenario, delay: number): SimulationResult {
    return {
      shouldFail: true,
      scenario,
      delay,
      errorMessage: scenario.errorMessage || 'Generic simulation failure',
      httpStatusCode: scenario.httpStatusCode || 500,
      metadata: {}
    };
  }

  private createSuccessResult(): SimulationResult {
    return {
      shouldFail: false,
      delay: 0,
      errorMessage: '',
      httpStatusCode: 200
    };
  }

  private triggerCascadingFailures(originService: string): void {
    const dependentServices = this.getDependentServices(originService);

    dependentServices.forEach(service => {
      const cascadeScenario = this.createScenario({
        name: `Cascade from ${originService}`,
        mode: SimulationMode.NETWORK_FAILURES,
        probability: 0.6,
        duration: 10000, // 10 seconds
        affectedServices: [service],
        errorMessage: `Cascade failure from ${originService} outage`
      });

      this.activateScenario(cascadeScenario.scenarioId);
    });
  }

  private getDependentServices(service: string): string[] {
    const dependencies: Record<string, string[]> = {
      'ERP': ['MAXIMO', 'INDYSOFT'],
      'MAXIMO': ['ERP'],
      'INDYSOFT': ['ERP']
    };

    return dependencies[service.toUpperCase()] || [];
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Predefined scenarios
  private initializePredefinedScenarios(): void {
    // Network failure scenarios
    this.createScenario({
      name: 'High Network Latency',
      description: 'Simulates high network latency (2-5 seconds)',
      mode: SimulationMode.NETWORK_FAILURES,
      probability: 0.1,
      delay: 3000,
      errorMessage: 'Network latency detected',
      httpStatusCode: 200
    });

    this.createScenario({
      name: 'Intermittent Connection Drops',
      description: 'Random connection failures',
      mode: SimulationMode.INTERMITTENT_FAILURES,
      probability: 0.15,
      errorMessage: 'Connection dropped unexpectedly'
    });

    this.createScenario({
      name: 'Database Overload',
      description: 'Database system under heavy load',
      mode: SimulationMode.SYSTEM_OVERLOAD,
      probability: 0.05,
      delay: 5000,
      errorMessage: 'Database timeout due to high load',
      httpStatusCode: 503
    });

    this.createScenario({
      name: 'Authentication Service Down',
      description: 'Authentication service unavailable',
      mode: SimulationMode.AUTHENTICATION_ERRORS,
      probability: 0.02,
      errorMessage: 'Authentication service temporarily unavailable',
      httpStatusCode: 503
    });

    this.createScenario({
      name: 'Data Validation Failures',
      description: 'Random data validation errors',
      mode: SimulationMode.DATA_VALIDATION_ERRORS,
      probability: 0.08,
      errorMessage: 'Data validation failed',
      httpStatusCode: 422
    });

    console.log(`[ErrorSim] Initialized with ${this.scenarios.size} predefined scenarios`);
  }

  // Utility and management methods
  getActiveScenarios(): ErrorScenario[] {
    return Array.from(this.activeScenarios)
      .map(id => this.scenarios.get(id))
      .filter(scenario => scenario !== undefined) as ErrorScenario[];
  }

  getAllScenarios(): ErrorScenario[] {
    return Array.from(this.scenarios.values());
  }

  getScenario(scenarioId: string): ErrorScenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  getStatistics(): any {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const recentFailures = this.failureHistory.filter(f => f.timestamp >= lastHour);

    return {
      totalScenarios: this.scenarios.size,
      activeScenarios: this.activeScenarios.size,
      totalRequests: this.requestCounter,
      recentFailures: recentFailures.length,
      failuresByService: this.groupBy(recentFailures, 'service'),
      failuresByScenario: this.groupBy(recentFailures, 'scenario'),
      config: this.config
    };
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  deactivateAllScenarios(): void {
    Array.from(this.activeScenarios).forEach(id => {
      this.deactivateScenario(id);
    });
  }

  resetSimulation(): void {
    this.deactivateAllScenarios();
    this.requestCounter = 0;
    this.failureHistory = [];
    console.log('[ErrorSim] Simulation reset completed');
  }
}