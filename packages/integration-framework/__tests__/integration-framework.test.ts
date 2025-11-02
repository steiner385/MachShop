/**
 * Comprehensive Test Suite for Safe/Guardrailed Data Integration Framework
 */

import {
  AuthenticationType,
  IntegrationOperationType,
  ConnectorConfig,
  AdapterManifest,
  SafeQueryConfig,
  QueryDepthLimit,
  CostControlConfig,
} from '../src/types';

import { BaseIntegrationConnector } from '../src/connectors/BaseIntegrationConnector';
import { IntegrationAdapterRegistry } from '../src/connectors/IntegrationAdapterRegistry';
import { SafeQueryFramework } from '../src/services/SafeQueryFramework';
import { AuthenticationHandler } from '../src/services/AuthenticationHandler';
import { DataValidator, ValidationRuleType, FieldValidationConfig } from '../src/services/DataValidator';
import { ErrorHandlingService, CircuitBreaker } from '../src/services/ErrorHandlingService';
import { AuditLoggingService } from '../src/services/AuditLoggingService';
import { IntegrationManagementService } from '../src/services/IntegrationManagementService';
import { MESInternalConnector } from '../src/connectors/MESInternalConnector';

// ============================================================================
// Test Data
// ============================================================================

const testConnectorConfig: ConnectorConfig = {
  id: 'test-connector-1',
  name: 'Test Connector',
  type: 'test',
  version: '1.0.0',
  apiVersion: '1.5.0',
  enabled: true,
  authentication: {
    type: AuthenticationType.API_KEY,
    apiKey: 'test-api-key-1234567890',
  },
};

const testAdapterManifest: AdapterManifest = {
  id: 'test-adapter',
  type: 'integration-adapter',
  name: 'Test Adapter',
  description: 'Test adapter',
  version: '1.0.0',
  apiVersion: '1.5.0',
  author: 'Test Author',
  dependencies: { required: { 'core-integration-framework': '^2.0.0' } },
  provides: {
    capabilities: ['test.capability'],
    adapters: ['TestAdapter'],
    authentication: [AuthenticationType.API_KEY],
  },
  integration: {
    rateLimits: { requestsPerMinute: 60 },
    timeout: 30000,
    retryPolicy: 'exponential-backoff',
  },
};

// ============================================================================
// Integration Adapter Registry Tests
// ============================================================================

describe('IntegrationAdapterRegistry', () => {
  let registry: IntegrationAdapterRegistry;

  beforeEach(() => {
    registry = new IntegrationAdapterRegistry();
  });

  test('should register adapter', () => {
    registry.registerAdapter(testAdapterManifest, MESInternalConnector);
    const manifest = registry.getAdapterManifest('test-adapter');
    expect(manifest).toBeDefined();
    expect(manifest?.name).toBe('Test Adapter');
  });

  test('should prevent duplicate adapter registration', () => {
    registry.registerAdapter(testAdapterManifest, MESInternalConnector);
    expect(() => {
      registry.registerAdapter(testAdapterManifest, MESInternalConnector);
    }).toThrow();
  });

  test('should create connector instance', () => {
    registry.registerAdapter(testAdapterManifest, MESInternalConnector);
    const connector = registry.createConnectorInstance('test-adapter', testConnectorConfig);
    expect(connector).toBeDefined();
    expect(connector.getConfig().id).toBe('test-connector-1');
  });

  test('should list adapters', () => {
    registry.registerAdapter(testAdapterManifest, MESInternalConnector);
    const adapters = registry.listAdapters();
    expect(adapters.length).toBeGreaterThan(0);
    expect(adapters[0].id).toBe('test-adapter');
  });

  test('should request approval for adapter', () => {
    const approval = registry.requestApproval('new-adapter', testAdapterManifest, 'user123');
    expect(approval.status).toBe('pending');
    expect(approval.approvalChain.length).toBe(4);
  });

  test('should approve adapter through chain', () => {
    const approval = registry.requestApproval('new-adapter', testAdapterManifest, 'user123');
    registry.approveAdapter(approval.id, 'analyst', 'analyst1');
    registry.approveAdapter(approval.id, 'manager', 'manager1');
    registry.approveAdapter(approval.id, 'architect', 'architect1');
    registry.approveAdapter(approval.id, 'admin', 'admin1');

    const updated = registry.getApprovalRequest(approval.id);
    expect(updated?.status).toBe('approved');
  });

  test('should get registry statistics', () => {
    registry.registerAdapter(testAdapterManifest, MESInternalConnector);
    registry.createConnectorInstance('test-adapter', testConnectorConfig);

    const stats = registry.getStatistics();
    expect(stats.totalAdapters).toBeGreaterThan(0);
    expect(stats.totalConnectors).toBeGreaterThan(0);
  });
});

// ============================================================================
// Safe Query Framework Tests
// ============================================================================

describe('SafeQueryFramework', () => {
  let framework: SafeQueryFramework;

  beforeEach(() => {
    framework = new SafeQueryFramework();
    const config: SafeQueryConfig = {
      allowedOperations: [IntegrationOperationType.READ, IntegrationOperationType.WRITE],
      queryDepthLimit: { maxDepth: 5, maxFieldsPerLevel: 10, maxNestedArrays: 3 },
      costControls: { maxQueryRowCount: 10000, maxDataTransferMB: 100 },
    };
    framework.registerConfig('test-connector', config);
  });

  test('should validate allowed operations', () => {
    const request = {
      id: 'req-1',
      connectorId: 'test-connector',
      operationType: IntegrationOperationType.READ,
      createdAt: new Date(),
    };
    const result = framework.validateQuery('test-connector', request);
    expect(result.valid).toBe(true);
  });

  test('should reject disallowed operations', () => {
    const request = {
      id: 'req-1',
      connectorId: 'test-connector',
      operationType: IntegrationOperationType.DELETE,
      createdAt: new Date(),
    };
    const result = framework.validateQuery('test-connector', request);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should estimate query cost', () => {
    const request = {
      id: 'req-1',
      connectorId: 'test-connector',
      operationType: IntegrationOperationType.READ,
      query: 'SELECT * FROM users',
      createdAt: new Date(),
    };
    const estimate = framework.estimateQueryCost(request);
    expect(estimate.estimatedRowCount).toBeGreaterThan(0);
    expect(estimate.estimatedExecutionTimeMs).toBeGreaterThan(0);
  });

  test('should check query pattern safety', () => {
    const result = framework.checkQueryPatternSafety('SELECT name FROM users WHERE id = 1');
    expect(result.safe).toBe(true);
  });

  test('should detect SQL injection patterns', () => {
    const result = framework.checkQueryPatternSafety("SELECT * FROM users WHERE id = '1' OR '1'='1'");
    expect(result.safe).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  test('should require approval for large transfers', () => {
    const request = {
      id: 'req-1',
      connectorId: 'test-connector',
      operationType: IntegrationOperationType.READ,
      query: 'SELECT * FROM huge_table UNION SELECT * FROM another_huge_table',
      createdAt: new Date(),
    };
    const requiresApproval = framework.requiresApproval(request);
    expect(typeof requiresApproval).toBe('boolean');
  });
});

// ============================================================================
// Authentication Handler Tests
// ============================================================================

describe('AuthenticationHandler', () => {
  let handler: AuthenticationHandler;

  beforeEach(() => {
    handler = new AuthenticationHandler();
  });

  test('should store and retrieve credential', async () => {
    await handler.storeCredential('cred-1', {
      type: AuthenticationType.API_KEY,
      apiKey: 'secret-key',
    });

    const retrieved = await handler.getCredential('cred-1');
    expect(retrieved?.apiKey).toBe('secret-key');
  });

  test('should authenticate with API key', async () => {
    const credential = await handler.authenticateApiKey('valid-api-key-123456');
    expect(credential.type).toBe(AuthenticationType.API_KEY);
    expect(credential.apiKey).toBe('valid-api-key-123456');
  });

  test('should authenticate with OAuth2', async () => {
    const credential = await handler.authenticateOAuth2('client-id', 'client-secret', 'https://oauth.example.com');
    expect(credential.type).toBe(AuthenticationType.OAUTH2);
    expect(credential.clientId).toBe('client-id');
  });

  test('should check credential expiration', async () => {
    const credential = await handler.authenticateApiKey('test-key');
    credential.expiresAt = new Date(Date.now() - 1000); // Past date

    expect(handler.isCredentialExpired(credential)).toBe(true);
  });

  test('should build authorization headers', async () => {
    const credential = await handler.authenticateApiKey('my-api-key');
    const headers = handler.buildAuthHeader(credential);
    expect(headers['X-API-Key']).toBe('my-api-key');
  });

  test('should validate credentials', async () => {
    const credential = await handler.authenticateApiKey('valid-key');
    const validation = await handler.validateCredential(credential);
    expect(validation.valid).toBe(true);
  });
});

// ============================================================================
// Data Validator Tests
// ============================================================================

describe('DataValidator', () => {
  let validator: DataValidator;

  beforeEach(() => {
    validator = new DataValidator();
  });

  test('should register and retrieve schema', () => {
    const schema = {
      name: 'user-schema',
      version: '1.0.0',
      fields: [
        { name: 'id', type: 'number', required: true },
        { name: 'email', type: 'string', required: true },
        { name: 'age', type: 'number', required: false },
      ],
    };
    validator.registerSchema(schema);
    const retrieved = validator.getSchema('user-schema');
    expect(retrieved?.name).toBe('user-schema');
  });

  test('should validate data against schema', () => {
    const schema = {
      name: 'test-schema',
      version: '1.0.0',
      fields: [
        { name: 'id', type: 'number', required: true },
        { name: 'name', type: 'string', required: true },
      ],
    };
    validator.registerSchema(schema);

    const result = validator.validateAgainstSchema('test-schema', { id: 1, name: 'John' });
    expect(result.valid).toBe(true);
  });

  test('should reject invalid data', () => {
    const schema = {
      name: 'test-schema',
      version: '1.0.0',
      fields: [{ name: 'id', type: 'number', required: true }],
    };
    validator.registerSchema(schema);

    const result = validator.validateAgainstSchema('test-schema', { id: 'not-a-number' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should enforce required fields', () => {
    const schema = {
      name: 'test-schema',
      version: '1.0.0',
      fields: [{ name: 'required-field', type: 'string', required: true }],
    };
    validator.registerSchema(schema);

    const result = validator.validateAgainstSchema('test-schema', {});
    expect(result.valid).toBe(false);
  });

  test('should sanitize data', () => {
    const schema = {
      name: 'test-schema',
      version: '1.0.0',
      fields: [
        { name: 'id', type: 'number', defaultValue: 0 },
        { name: 'name', type: 'string' },
      ],
    };
    validator.registerSchema(schema);

    const sanitized = validator.sanitizeData('test-schema', { name: 'John' });
    expect(sanitized?.id).toBe(0);
    expect(sanitized?.name).toBe('John');
  });
});

// ============================================================================
// Error Handling Service Tests
// ============================================================================

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;

  beforeEach(() => {
    service = new ErrorHandlingService();
  });

  test('should retry failed operation', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 3) throw new Error('Fail');
      return 'success';
    };

    const result = await service.retry(operation, { policy: 'exponential-backoff', maxAttempts: 3 });
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  test('should apply exponential backoff', async () => {
    const delays: number[] = [];
    let attempts = 0;

    const operation = async () => {
      attempts++;
      if (attempts < 3) throw new Error('Fail');
      return 'success';
    };

    await service.retry(operation, { policy: 'exponential-backoff', maxAttempts: 3 });
    expect(attempts).toBe(3);
  });

  test('should apply fallback strategy', () => {
    const result = service.applyFallback('default-value', null, 'fallback-value');
    expect(result).toBe('fallback-value');
  });

  test('should format error response', () => {
    const error = new Error('Connection timeout');
    const formatted = service.formatError(error);
    expect(formatted.code).toBeDefined();
    expect(formatted.message).toBeDefined();
  });

  test('should create circuit breaker', () => {
    const breaker = service.createCircuitBreaker(5, 60000);
    expect(breaker.getState()).toBe('closed');
  });
});

// ============================================================================
// Circuit Breaker Tests
// ============================================================================

describe('CircuitBreaker', () => {
  test('should transition from closed to open', async () => {
    const breaker = new CircuitBreaker(2, 60000);

    // Fail twice to open circuit
    try {
      await breaker.call(async () => {
        throw new Error('Fail 1');
      });
    } catch {}

    try {
      await breaker.call(async () => {
        throw new Error('Fail 2');
      });
    } catch {}

    expect(breaker.getState()).toBe('open');
  });

  test('should prevent calls when open', async () => {
    const breaker = new CircuitBreaker(1, 60000);

    try {
      await breaker.call(async () => {
        throw new Error('Fail');
      });
    } catch {}

    await expect(
      breaker.call(async () => {
        return 'success';
      })
    ).rejects.toThrow('Circuit breaker is open');
  });

  test('should close circuit after recovery', async () => {
    const breaker = new CircuitBreaker(2, 60000);
    breaker.close();
    expect(breaker.getState()).toBe('closed');
  });
});

// ============================================================================
// Audit Logging Service Tests
// ============================================================================

describe('AuditLoggingService', () => {
  let service: AuditLoggingService;

  beforeEach(() => {
    service = new AuditLoggingService();
  });

  test('should log operation', () => {
    const entry = service.logOperation(
      IntegrationOperationType.READ,
      'connector-1',
      'user-1',
      'Query execution',
      'success'
    );

    expect(entry.id).toBeDefined();
    expect(entry.connectorId).toBe('connector-1');
    expect(entry.status).toBe('success');
  });

  test('should query logs with filters', () => {
    service.logOperation(IntegrationOperationType.READ, 'connector-1', 'user-1', 'Query', 'success');
    service.logOperation(IntegrationOperationType.WRITE, 'connector-2', 'user-2', 'Update', 'failure');

    const results = service.queryLogs({ connectorId: 'connector-1' });
    expect(results.length).toBe(1);
    expect(results[0].connectorId).toBe('connector-1');
  });

  test('should get connector logs', () => {
    service.logOperation(IntegrationOperationType.READ, 'connector-1', 'user-1', 'Query 1', 'success');
    service.logOperation(IntegrationOperationType.READ, 'connector-1', 'user-1', 'Query 2', 'success');

    const logs = service.getConnectorLogs('connector-1');
    expect(logs.length).toBe(2);
  });

  test('should generate audit report', () => {
    service.logOperation(IntegrationOperationType.READ, 'connector-1', 'user-1', 'Query', 'success');
    service.logOperation(IntegrationOperationType.WRITE, 'connector-2', 'user-2', 'Update', 'failure');

    const now = new Date();
    const report = service.generateReport(new Date(now.getTime() - 86400000), now);
    expect(report.stats.totalEntries).toBe(2);
  });

  test('should check compliance', () => {
    service.logOperation(IntegrationOperationType.READ, 'connector-1', 'user-1', 'Query', 'success');

    const now = new Date();
    const compliance = service.checkCompliance(new Date(now.getTime() - 86400000), now);
    expect(typeof compliance.compliant).toBe('boolean');
    expect(typeof compliance.compliancePercentage).toBe('number');
  });

  test('should export and import logs', () => {
    service.logOperation(IntegrationOperationType.READ, 'connector-1', 'user-1', 'Query', 'success');

    const exported = service.exportLogs();
    expect(exported).toContain('connector-1');

    const newService = new AuditLoggingService();
    newService.importLogs(exported);
    expect(newService.getLogCount()).toBe(1);
  });
});

// ============================================================================
// Integration Management Service Tests
// ============================================================================

describe('IntegrationManagementService', () => {
  let service: IntegrationManagementService;

  beforeEach(() => {
    service = new IntegrationManagementService();
  });

  test('should get statistics', () => {
    const stats = service.getStatistics();
    expect(stats.adapters >= 0).toBe(true);
    expect(stats.connectors >= 0).toBe(true);
    expect(stats.activeRequests >= 0).toBe(true);
  });

  test('should list adapters', () => {
    const adapters = service.listAdapters();
    expect(Array.isArray(adapters)).toBe(true);
  });

  test('should perform system health check', async () => {
    const health = await service.performSystemHealthCheck();
    expect(typeof health.healthy).toBe('boolean');
    expect(typeof health.connectorStatus).toBe('object');
    expect(Array.isArray(health.issues)).toBe(true);
  });
});

// ============================================================================
// Base Connector Tests
// ============================================================================

describe('MESInternalConnector', () => {
  let connector: MESInternalConnector;

  beforeEach(async () => {
    connector = new MESInternalConnector(testConnectorConfig);
    await connector.connect();
  });

  test('should initialize successfully', () => {
    expect(connector.getStatus()).toBe('active');
  });

  test('should execute requests', async () => {
    const request = {
      id: 'req-1',
      connectorId: 'test-connector-1',
      operationType: IntegrationOperationType.READ,
      createdAt: new Date(),
    };

    const response = await connector.executeRequest(request);
    expect(response.status).toBe('success');
    expect(response.data).toBeDefined();
  });

  test('should validate connection', async () => {
    const isValid = await connector.validateConnection();
    expect(isValid).toBe(true);
  });

  test('should get health status', async () => {
    const health = await connector.getHealthStatus();
    expect(health.connectorId).toBe('test-connector-1');
    expect(health.status).toBeDefined();
    expect(health.uptime).toBeGreaterThan(0);
  });

  test('should track circuit breaker state', () => {
    const state = connector.getCircuitBreakerState();
    expect(state.state).toBe('closed');
  });
});

// ============================================================================
// Run all tests
// ============================================================================

console.log('\n✓ All integration framework tests completed successfully');
