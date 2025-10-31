/**
 * CyberArk PAM Service Test Suite
 *
 * Comprehensive unit tests for CyberArk Privileged Access Management integration.
 * Tests include authentication, credential retrieval, caching, error handling,
 * fallback mechanisms, and circuit breaker functionality.
 */

import { describe, beforeEach, afterEach, it, expect, vi, Mock } from 'vitest';
import { CyberArkService, getCyberArkService, initializeCyberArkService } from '../../services/CyberArkService';
import { CyberArkError, CyberArkErrorType } from '../../services/CyberArkErrorHandler';

// Mock the conjur library
vi.mock('conjur', () => ({
  ApiClient: vi.fn(),
  AuthenticationApi: vi.fn(),
  SecretsApi: vi.fn()
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock error handler
vi.mock('../../services/CyberArkErrorHandler', () => ({
  cyberArkErrorHandler: {
    executeWithRetry: vi.fn(),
    getHealthMetrics: vi.fn(),
    getCircuitBreakerStatus: vi.fn()
  },
  CyberArkError: class extends Error {
    constructor(public type: string, message: string, public isRetryable: boolean = false) {
      super(message);
    }
  },
  CyberArkErrorType: {
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
    SECRET_NOT_FOUND: 'SECRET_NOT_FOUND',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    INVALID_CONFIGURATION: 'INVALID_CONFIGURATION'
  }
}));

describe('CyberArkService', () => {
  let cyberArkService: CyberArkService;
  let mockAuthApi: any;
  let mockSecretsApiInstance: any;
  let mockApiClientInstance: any;

  const validConfig = {
    url: 'https://test-conjur.company.com',
    account: 'test-account',
    authenticator: 'authn',
    apiKey: 'test-api-key',
    enabled: true
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock API client instance
    mockApiClientInstance = {
      basePath: '',
      defaultHeaders: {},
      authentications: {}
    };

    // Setup mock authentication API instance
    mockAuthApi = {
      authenticateWithApiKey: vi.fn(),
      authenticate: vi.fn()
    };

    // Setup mock secrets API instance
    mockSecretsApiInstance = {
      getSecret: vi.fn()
    };

    // Configure mock constructors to return instances
    const { ApiClient, AuthenticationApi, SecretsApi } = require('conjur');
    (ApiClient as Mock).mockImplementation(() => mockApiClientInstance);
    (AuthenticationApi as Mock).mockImplementation(() => mockAuthApi);
    (SecretsApi as Mock).mockImplementation(() => mockSecretsApiInstance);

    // Create service instance
    cyberArkService = new CyberArkService(validConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration Validation', () => {
    it('should accept valid configuration', () => {
      expect(() => new CyberArkService(validConfig)).not.toThrow();
    });

    it('should throw error for missing URL when enabled', () => {
      const invalidConfig = { ...validConfig, url: '' };
      expect(() => new CyberArkService(invalidConfig)).toThrow('CyberArk URL is required');
    });

    it('should throw error for missing account when enabled', () => {
      const invalidConfig = { ...validConfig, account: '' };
      expect(() => new CyberArkService(invalidConfig)).toThrow('CyberArk account is required');
    });

    it('should throw error when no authentication method provided', () => {
      const invalidConfig = {
        ...validConfig,
        apiKey: undefined,
        username: undefined,
        password: undefined,
        clientCertPath: undefined,
        clientKeyPath: undefined
      };
      expect(() => new CyberArkService(invalidConfig)).toThrow('CyberArk authentication method required');
    });

    it('should allow disabled configuration', () => {
      const disabledConfig = { ...validConfig, enabled: false };
      expect(() => new CyberArkService(disabledConfig)).not.toThrow();
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with API key authentication', async () => {
      mockAuthApi.authenticateWithApiKey.mockResolvedValue('test-access-token');

      await cyberArkService.initialize();

      expect(mockAuthApi.authenticateWithApiKey).toHaveBeenCalledWith(
        validConfig.account,
        validConfig.apiKey
      );
      expect(mockApiClientInstance.defaultHeaders).toEqual({
        'Authorization': 'Token token="test-access-token"'
      });
    });

    it('should initialize successfully with username/password authentication', async () => {
      const configWithCredentials = {
        ...validConfig,
        apiKey: undefined,
        username: 'test-user',
        password: 'test-password'
      };
      const serviceWithCredentials = new CyberArkService(configWithCredentials);

      mockAuthApi.authenticate.mockResolvedValue('test-access-token');

      await serviceWithCredentials.initialize();

      expect(mockAuthApi.authenticate).toHaveBeenCalledWith(
        configWithCredentials.account,
        configWithCredentials.username,
        configWithCredentials.password
      );
    });

    it('should handle initialization failure', async () => {
      mockAuthApi.authenticateWithApiKey.mockRejectedValue(new Error('Authentication failed'));

      await expect(cyberArkService.initialize()).rejects.toThrow('CyberArk initialization failed');
    });

    it('should skip initialization when disabled', async () => {
      const disabledConfig = { ...validConfig, enabled: false };
      const disabledService = new CyberArkService(disabledConfig);

      await disabledService.initialize();

      expect(mockAuthApi.authenticateWithApiKey).not.toHaveBeenCalled();
    });
  });

  describe('Secret Retrieval', () => {
    beforeEach(async () => {
      mockAuthApi.authenticateWithApiKey.mockResolvedValue('test-access-token');
      await cyberArkService.initialize();
    });

    it('should retrieve secret successfully', async () => {
      const secretValue = 'test-secret-value';
      mockSecretsApiInstance.getSecret.mockResolvedValue(secretValue);

      // Mock error handler to execute operation directly
      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockImplementation(
        (operation: () => Promise<any>) => operation()
      );

      const result = await cyberArkService.retrieveSecret('test/secret/path');

      expect(result).toBe(secretValue);
      expect(mockSecretsApiInstance.getSecret).toHaveBeenCalledWith(
        validConfig.account,
        'variable',
        'test:secret:path'
      );
    });

    it('should return cached secret on subsequent calls', async () => {
      const secretValue = 'test-secret-value';
      mockSecretsApiInstance.getSecret.mockResolvedValue(secretValue);

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockImplementation(
        (operation: () => Promise<any>) => operation()
      );

      // First call
      await cyberArkService.retrieveSecret('test/secret/path');

      // Second call should use cache
      const result = await cyberArkService.retrieveSecret('test/secret/path');

      expect(result).toBe(secretValue);
      expect(mockSecretsApiInstance.getSecret).toHaveBeenCalledTimes(1);
    });

    it('should skip cache when requested', async () => {
      const secretValue = 'test-secret-value';
      mockSecretsApiInstance.getSecret.mockResolvedValue(secretValue);

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockImplementation(
        (operation: () => Promise<any>) => operation()
      );

      // First call
      await cyberArkService.retrieveSecret('test/secret/path');

      // Second call with skipCache
      await cyberArkService.retrieveSecret('test/secret/path', { skipCache: true });

      expect(mockSecretsApiInstance.getSecret).toHaveBeenCalledTimes(2);
    });

    it('should handle secret not found error', async () => {
      const error = { response: { status: 404 } };
      mockSecretsApiInstance.getSecret.mockRejectedValue(error);

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockImplementation(
        async (operation: () => Promise<any>, _name: string, fallback?: () => any) => {
          try {
            return await operation();
          } catch (err) {
            if (fallback) {
              return fallback();
            }
            throw err;
          }
        }
      );

      // Mock fallback value
      process.env.FALLBACK_TEST_SECRET_PATH = 'fallback-value';

      const result = await cyberArkService.retrieveSecret('test/secret/path');
      expect(result).toBe('fallback-value');

      delete process.env.FALLBACK_TEST_SECRET_PATH;
    });

    it('should use fallback when CyberArk is disabled', async () => {
      const disabledService = new CyberArkService({ ...validConfig, enabled: false });
      process.env.FALLBACK_TEST_SECRET_PATH = 'fallback-value';

      const result = await disabledService.retrieveSecret('test/secret/path');

      expect(result).toBe('fallback-value');
      expect(mockSecretsApiInstance.getSecret).not.toHaveBeenCalled();

      delete process.env.FALLBACK_TEST_SECRET_PATH;
    });
  });

  describe('Database Credentials', () => {
    beforeEach(async () => {
      mockAuthApi.authenticateWithApiKey.mockResolvedValue('test-access-token');
      await cyberArkService.initialize();
    });

    it('should retrieve database credentials successfully', async () => {
      mockSecretsApiInstance.getSecret
        .mockResolvedValueOnce('test-username')
        .mockResolvedValueOnce('test-password');

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockImplementation(
        (operation: () => Promise<any>) => operation()
      );

      const credentials = await cyberArkService.retrieveDatabaseCredentials('auth');

      expect(credentials).toEqual({
        username: 'test-username',
        password: 'test-password',
        host: 'localhost',
        port: '5432',
        database: 'mes_auth'
      });
    });

    it('should handle database credential retrieval failure', async () => {
      mockSecretsApiInstance.getSecret.mockRejectedValue(new Error('Network error'));

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockRejectedValue(new Error('Failed to retrieve credentials'));

      await expect(cyberArkService.retrieveDatabaseCredentials('auth')).rejects.toThrow();
    });
  });

  describe('Integration Credentials', () => {
    beforeEach(async () => {
      mockAuthApi.authenticateWithApiKey.mockResolvedValue('test-access-token');
      await cyberArkService.initialize();
    });

    it('should retrieve integration credentials successfully', async () => {
      mockSecretsApiInstance.getSecret
        .mockResolvedValueOnce('test-username')
        .mockResolvedValueOnce('test-password')
        .mockResolvedValueOnce('test-api-key');

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockImplementation(
        (operation: () => Promise<any>) => operation()
      );

      const credentials = await cyberArkService.retrieveIntegrationCredentials('erp', 'oracle_fusion');

      expect(credentials).toEqual({
        username: 'test-username',
        password: 'test-password',
        apikey: 'test-api-key'
      });
    });
  });

  describe('Application Secrets', () => {
    beforeEach(async () => {
      mockAuthApi.authenticateWithApiKey.mockResolvedValue('test-access-token');
      await cyberArkService.initialize();
    });

    it('should retrieve application secrets successfully', async () => {
      mockSecretsApiInstance.getSecret
        .mockResolvedValueOnce('jwt-secret')
        .mockResolvedValueOnce('session-secret')
        .mockResolvedValueOnce('encryption-key');

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockImplementation(
        (operation: () => Promise<any>) => operation()
      );

      const secrets = await cyberArkService.retrieveApplicationSecrets();

      expect(secrets).toEqual({
        jwtSecret: 'jwt-secret',
        sessionSecret: 'session-secret',
        encryptionKey: 'encryption-key'
      });
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      mockAuthApi.authenticateWithApiKey.mockResolvedValue('test-access-token');
      await cyberArkService.initialize();
    });

    it('should invalidate specific cached secret', async () => {
      const secretValue = 'test-secret-value';
      mockSecretsApiInstance.getSecret.mockResolvedValue(secretValue);

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockImplementation(
        (operation: () => Promise<any>) => operation()
      );

      // Cache a secret
      await cyberArkService.retrieveSecret('test/secret/path');

      // Invalidate cache
      cyberArkService.invalidateCache('test/secret/path');

      // Next call should fetch fresh secret
      await cyberArkService.retrieveSecret('test/secret/path');

      expect(mockSecretsApiInstance.getSecret).toHaveBeenCalledTimes(2);
    });

    it('should invalidate all cached secrets', async () => {
      cyberArkService.invalidateCache();

      const stats = cyberArkService.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide cache statistics', async () => {
      const stats = cyberArkService.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when authenticated', async () => {
      mockAuthApi.authenticateWithApiKey.mockResolvedValue('test-access-token');
      await cyberArkService.initialize();

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.getHealthMetrics.mockReturnValue({
        totalRequests: 10,
        successfulRequests: 10,
        failedRequests: 0,
        fallbackUsageCount: 0
      });
      cyberArkErrorHandler.getCircuitBreakerStatus.mockReturnValue({
        state: 'CLOSED',
        canExecute: true
      });

      const health = await cyberArkService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.authenticated).toBe(true);
      expect(health).toHaveProperty('metrics');
      expect(health).toHaveProperty('circuitBreaker');
    });

    it('should return degraded status when disabled', async () => {
      const disabledService = new CyberArkService({ ...validConfig, enabled: false });

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.getHealthMetrics.mockReturnValue({});
      cyberArkErrorHandler.getCircuitBreakerStatus.mockReturnValue({});

      const health = await disabledService.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.authenticated).toBe(false);
      expect(health.lastError).toBe('CyberArk service disabled');
    });

    it('should return unhealthy status on authentication failure', async () => {
      mockAuthApi.authenticateWithApiKey.mockRejectedValue(new Error('Auth failed'));

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.getHealthMetrics.mockReturnValue({});
      cyberArkErrorHandler.getCircuitBreakerStatus.mockReturnValue({});

      const health = await cyberArkService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.authenticated).toBe(false);
      expect(health.lastError).toContain('Auth failed');
    });
  });

  describe('Graceful Shutdown', () => {
    it('should clear sensitive data on shutdown', async () => {
      mockAuthApi.authenticateWithApiKey.mockResolvedValue('test-access-token');
      await cyberArkService.initialize();

      await cyberArkService.shutdown();

      const health = await cyberArkService.healthCheck();
      expect(health.authenticated).toBe(false);
    });
  });

  describe('Singleton Factory Functions', () => {
    it('should create singleton instance with getCyberArkService', () => {
      const service1 = getCyberArkService(validConfig);
      const service2 = getCyberArkService();

      expect(service1).toBe(service2);
    });

    it('should throw error when getting service without initialization', () => {
      // Reset singleton
      (getCyberArkService as any).cyberArkServiceInstance = null;

      expect(() => getCyberArkService()).toThrow('CyberArk service not initialized');
    });

    it('should initialize service from environment configuration', async () => {
      // Set environment variables
      process.env.CYBERARK_ENABLED = 'true';
      process.env.CYBERARK_URL = 'https://test-conjur.company.com';
      process.env.CYBERARK_ACCOUNT = 'test-account';
      process.env.CYBERARK_API_KEY = 'test-api-key';

      mockAuthApi.authenticateWithApiKey.mockResolvedValue('test-access-token');

      const service = await initializeCyberArkService();

      expect(service).toBeInstanceOf(CyberArkService);

      // Cleanup
      delete process.env.CYBERARK_ENABLED;
      delete process.env.CYBERARK_URL;
      delete process.env.CYBERARK_ACCOUNT;
      delete process.env.CYBERARK_API_KEY;
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should handle missing fallback value gracefully', async () => {
      const disabledService = new CyberArkService({ ...validConfig, enabled: false });

      await expect(disabledService.retrieveSecret('nonexistent/path')).rejects.toThrow(
        'No fallback value found for secret: nonexistent/path'
      );
    });

    it('should use multiple fallback environment variable patterns', async () => {
      const disabledService = new CyberArkService({ ...validConfig, enabled: false });

      // Test different fallback patterns
      process.env.FALLBACK_TEST_PATH = 'fallback1';
      let result = await disabledService.retrieveSecret('test/path');
      expect(result).toBe('fallback1');

      delete process.env.FALLBACK_TEST_PATH;
      process.env.TEST_PATH = 'fallback2';
      result = await disabledService.retrieveSecret('test/path');
      expect(result).toBe('fallback2');

      // Cleanup
      delete process.env.TEST_PATH;
    });
  });

  describe('Token Refresh', () => {
    beforeEach(async () => {
      mockAuthApi.authenticateWithApiKey.mockResolvedValue('test-access-token');
      await cyberArkService.initialize();
    });

    it('should refresh token when expired', async () => {
      // Simulate token expiry by setting a past expiry time
      (cyberArkService as any).tokenExpiry = Date.now() - 1000;

      mockAuthApi.authenticateWithApiKey.mockResolvedValue('new-access-token');
      mockSecretsApiInstance.getSecret.mockResolvedValue('test-secret');

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockImplementation(
        (operation: () => Promise<any>) => operation()
      );

      await cyberArkService.retrieveSecret('test/secret');

      // Should have called authentication again
      expect(mockAuthApi.authenticateWithApiKey).toHaveBeenCalledTimes(2);
    });
  });
});

describe('CyberArkService Error Scenarios', () => {
  let cyberArkService: CyberArkService;
  let mockAuthApi: any;
  let mockSecretsApiInstance: any;

  const validConfig = {
    url: 'https://test-conjur.company.com',
    account: 'test-account',
    apiKey: 'test-api-key',
    enabled: true
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthApi = {
      authenticateWithApiKey: vi.fn(),
      authenticate: vi.fn()
    };

    mockSecretsApiInstance = {
      getSecret: vi.fn()
    };

    const { ApiClient, AuthenticationApi, SecretsApi } = require('conjur');
    (ApiClient as Mock).mockImplementation(() => ({}));
    (AuthenticationApi as Mock).mockImplementation(() => mockAuthApi);
    (SecretsApi as Mock).mockImplementation(() => mockSecretsApiInstance);

    cyberArkService = new CyberArkService(validConfig);
  });

  describe('Network Errors', () => {
    it('should handle connection timeout', async () => {
      mockAuthApi.authenticateWithApiKey.mockRejectedValue({
        code: 'ETIMEDOUT',
        message: 'Connection timeout'
      });

      await expect(cyberArkService.initialize()).rejects.toThrow('CyberArk initialization failed');
    });

    it('should handle connection refused', async () => {
      mockAuthApi.authenticateWithApiKey.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      });

      await expect(cyberArkService.initialize()).rejects.toThrow('CyberArk initialization failed');
    });

    it('should handle DNS resolution failure', async () => {
      mockAuthApi.authenticateWithApiKey.mockRejectedValue({
        code: 'ENOTFOUND',
        message: 'DNS resolution failed'
      });

      await expect(cyberArkService.initialize()).rejects.toThrow('CyberArk initialization failed');
    });
  });

  describe('HTTP Errors', () => {
    beforeEach(async () => {
      mockAuthApi.authenticateWithApiKey.mockResolvedValue('test-access-token');
      await cyberArkService.initialize();
    });

    it('should handle 401 Unauthorized', async () => {
      const error = { response: { status: 401, data: { message: 'Unauthorized' } } };
      mockSecretsApiInstance.getSecret.mockRejectedValue(error);

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockRejectedValue(
        new CyberArkError(CyberArkErrorType.AUTHENTICATION_FAILED, 'Unauthorized')
      );

      await expect(cyberArkService.retrieveSecret('test/secret')).rejects.toThrow('Unauthorized');
    });

    it('should handle 403 Forbidden', async () => {
      const error = { response: { status: 403, data: { message: 'Forbidden' } } };
      mockSecretsApiInstance.getSecret.mockRejectedValue(error);

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockRejectedValue(
        new CyberArkError(CyberArkErrorType.PERMISSION_DENIED, 'Forbidden')
      );

      await expect(cyberArkService.retrieveSecret('test/secret')).rejects.toThrow('Forbidden');
    });

    it('should handle 404 Not Found', async () => {
      const error = { response: { status: 404, data: { message: 'Not found' } } };
      mockSecretsApiInstance.getSecret.mockRejectedValue(error);

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockImplementation(
        async (operation: () => Promise<any>, _name: string, fallback?: () => any) => {
          try {
            return await operation();
          } catch (err) {
            if (fallback) {
              return fallback();
            }
            throw new CyberArkError(CyberArkErrorType.SECRET_NOT_FOUND, 'Not found');
          }
        }
      );

      process.env.FALLBACK_TEST_SECRET = 'fallback-value';
      const result = await cyberArkService.retrieveSecret('test/secret');
      expect(result).toBe('fallback-value');

      delete process.env.FALLBACK_TEST_SECRET;
    });

    it('should handle 500 Internal Server Error', async () => {
      const error = { response: { status: 500, data: { message: 'Internal server error' } } };
      mockSecretsApiInstance.getSecret.mockRejectedValue(error);

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockRejectedValue(
        new CyberArkError(CyberArkErrorType.SERVICE_UNAVAILABLE, 'Internal server error')
      );

      await expect(cyberArkService.retrieveSecret('test/secret')).rejects.toThrow('Internal server error');
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      mockAuthApi.authenticateWithApiKey.mockResolvedValue('test-access-token');
      await cyberArkService.initialize();
    });

    it('should handle 429 Too Many Requests', async () => {
      const error = { response: { status: 429, data: { message: 'Rate limited' } } };
      mockSecretsApiInstance.getSecret.mockRejectedValue(error);

      const { cyberArkErrorHandler } = require('../../services/CyberArkErrorHandler');
      cyberArkErrorHandler.executeWithRetry.mockImplementation(
        async (operation: () => Promise<any>, _name: string, fallback?: () => any) => {
          // Simulate retry and eventual fallback
          if (fallback) {
            return fallback();
          }
          throw new CyberArkError(CyberArkErrorType.RATE_LIMITED, 'Rate limited');
        }
      );

      process.env.FALLBACK_TEST_SECRET = 'fallback-value';
      const result = await cyberArkService.retrieveSecret('test/secret');
      expect(result).toBe('fallback-value');

      delete process.env.FALLBACK_TEST_SECRET;
    });
  });
});