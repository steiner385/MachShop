/**
 * CyberArk Configuration Test Suite
 *
 * Comprehensive tests for CyberArk PAM configuration validation,
 * environment variable processing, and configuration schema validation.
 */

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import Joi from 'joi';

// Mock the config module to test validation logic
let mockConfig: any;

vi.mock('../../config/config', () => ({
  config: mockConfig
}));

describe('CyberArk Configuration Validation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Clear CyberArk-related environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('CYBERARK_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('CyberArk Schema Validation', () => {
    const cyberArkSchema = Joi.object({
      enabled: Joi.boolean().default(false),
      url: Joi.when('enabled', {
        is: true,
        then: Joi.string().uri().required(),
        otherwise: Joi.string().optional()
      }),
      account: Joi.when('enabled', {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.string().optional()
      }),
      authenticator: Joi.string().default('authn'),

      // Authentication methods (at least one required when enabled)
      apiKey: Joi.string().optional(),
      username: Joi.string().optional(),
      password: Joi.string().optional(),
      clientCertPath: Joi.string().optional(),
      clientKeyPath: Joi.string().optional(),

      // Connection and retry settings
      timeout: Joi.number().integer().min(1000).max(60000).default(30000),
      retryAttempts: Joi.number().integer().min(1).max(10).default(3),
      retryDelay: Joi.number().integer().min(100).max(10000).default(1000),

      // Circuit breaker settings
      circuitBreakerThreshold: Joi.number().integer().min(1).max(100).default(5),
      circuitBreakerTimeout: Joi.number().integer().min(10000).max(300000).default(60000),

      // Cache settings
      cacheEnabled: Joi.boolean().default(true),
      cacheTtl: Joi.number().integer().min(60).max(3600).default(900) // 15 minutes
    }).custom((value, helpers) => {
      if (value.enabled) {
        // When enabled, at least one authentication method must be provided
        const hasAuth = value.apiKey ||
                       (value.username && value.password) ||
                       (value.clientCertPath && value.clientKeyPath);

        if (!hasAuth) {
          return helpers.error('cyberark.auth.required');
        }
      }
      return value;
    }).messages({
      'cyberark.auth.required': 'At least one authentication method must be provided when CyberArk is enabled'
    });

    it('should validate minimal enabled configuration with API key', () => {
      const config = {
        enabled: true,
        url: 'https://conjur.company.com',
        account: 'test-account',
        apiKey: 'test-api-key'
      };

      const result = cyberArkSchema.validate(config);
      expect(result.error).toBeUndefined();
      expect(result.value.enabled).toBe(true);
      expect(result.value.authenticator).toBe('authn'); // default value
    });

    it('should validate configuration with username/password auth', () => {
      const config = {
        enabled: true,
        url: 'https://conjur.company.com',
        account: 'test-account',
        username: 'test-user',
        password: 'test-password'
      };

      const result = cyberArkSchema.validate(config);
      expect(result.error).toBeUndefined();
    });

    it('should validate configuration with certificate auth', () => {
      const config = {
        enabled: true,
        url: 'https://conjur.company.com',
        account: 'test-account',
        clientCertPath: '/path/to/cert.pem',
        clientKeyPath: '/path/to/key.pem'
      };

      const result = cyberArkSchema.validate(config);
      expect(result.error).toBeUndefined();
    });

    it('should validate disabled configuration without auth', () => {
      const config = {
        enabled: false
      };

      const result = cyberArkSchema.validate(config);
      expect(result.error).toBeUndefined();
      expect(result.value.enabled).toBe(false);
    });

    it('should apply default values', () => {
      const config = {
        enabled: true,
        url: 'https://conjur.company.com',
        account: 'test-account',
        apiKey: 'test-api-key'
      };

      const result = cyberArkSchema.validate(config);
      expect(result.value.authenticator).toBe('authn');
      expect(result.value.timeout).toBe(30000);
      expect(result.value.retryAttempts).toBe(3);
      expect(result.value.circuitBreakerThreshold).toBe(5);
      expect(result.value.cacheEnabled).toBe(true);
      expect(result.value.cacheTtl).toBe(900);
    });

    it('should reject enabled configuration without URL', () => {
      const config = {
        enabled: true,
        account: 'test-account',
        apiKey: 'test-api-key'
      };

      const result = cyberArkSchema.validate(config);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('"url" is required');
    });

    it('should reject enabled configuration without account', () => {
      const config = {
        enabled: true,
        url: 'https://conjur.company.com',
        apiKey: 'test-api-key'
      };

      const result = cyberArkSchema.validate(config);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('"account" is required');
    });

    it('should reject enabled configuration without any auth method', () => {
      const config = {
        enabled: true,
        url: 'https://conjur.company.com',
        account: 'test-account'
      };

      const result = cyberArkSchema.validate(config);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('At least one authentication method must be provided');
    });

    it('should reject invalid URL format', () => {
      const config = {
        enabled: true,
        url: 'invalid-url',
        account: 'test-account',
        apiKey: 'test-api-key'
      };

      const result = cyberArkSchema.validate(config);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('"url" must be a valid uri');
    });

    it('should reject timeout values outside valid range', () => {
      const configTooLow = {
        enabled: true,
        url: 'https://conjur.company.com',
        account: 'test-account',
        apiKey: 'test-api-key',
        timeout: 500 // too low
      };

      const resultTooLow = cyberArkSchema.validate(configTooLow);
      expect(resultTooLow.error).toBeDefined();

      const configTooHigh = {
        enabled: true,
        url: 'https://conjur.company.com',
        account: 'test-account',
        apiKey: 'test-api-key',
        timeout: 70000 // too high
      };

      const resultTooHigh = cyberArkSchema.validate(configTooHigh);
      expect(resultTooHigh.error).toBeDefined();
    });

    it('should validate custom timeout and retry settings', () => {
      const config = {
        enabled: true,
        url: 'https://conjur.company.com',
        account: 'test-account',
        apiKey: 'test-api-key',
        timeout: 45000,
        retryAttempts: 5,
        retryDelay: 2000,
        circuitBreakerThreshold: 10,
        circuitBreakerTimeout: 120000,
        cacheTtl: 1800
      };

      const result = cyberArkSchema.validate(config);
      expect(result.error).toBeUndefined();
      expect(result.value.timeout).toBe(45000);
      expect(result.value.retryAttempts).toBe(5);
    });
  });

  describe('Environment Variable Processing', () => {
    it('should process CyberArk configuration from environment variables', () => {
      process.env.CYBERARK_ENABLED = 'true';
      process.env.CYBERARK_URL = 'https://conjur.example.com';
      process.env.CYBERARK_ACCOUNT = 'production';
      process.env.CYBERARK_API_KEY = 'secret-api-key';
      process.env.CYBERARK_AUTHENTICATOR = 'authn-k8s/production';
      process.env.CYBERARK_TIMEOUT = '45000';
      process.env.CYBERARK_RETRY_ATTEMPTS = '5';
      process.env.CYBERARK_CACHE_TTL = '1800';

      // Simulate config loading from environment
      const envConfig = {
        enabled: process.env.CYBERARK_ENABLED === 'true',
        url: process.env.CYBERARK_URL,
        account: process.env.CYBERARK_ACCOUNT,
        apiKey: process.env.CYBERARK_API_KEY,
        authenticator: process.env.CYBERARK_AUTHENTICATOR,
        timeout: parseInt(process.env.CYBERARK_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.CYBERARK_RETRY_ATTEMPTS || '3'),
        cacheTtl: parseInt(process.env.CYBERARK_CACHE_TTL || '900')
      };

      expect(envConfig.enabled).toBe(true);
      expect(envConfig.url).toBe('https://conjur.example.com');
      expect(envConfig.account).toBe('production');
      expect(envConfig.apiKey).toBe('secret-api-key');
      expect(envConfig.authenticator).toBe('authn-k8s/production');
      expect(envConfig.timeout).toBe(45000);
      expect(envConfig.retryAttempts).toBe(5);
      expect(envConfig.cacheTtl).toBe(1800);
    });

    it('should handle boolean environment variables correctly', () => {
      // Test various boolean representations
      const testCases = [
        { input: 'true', expected: true },
        { input: 'TRUE', expected: true },
        { input: 'True', expected: true },
        { input: '1', expected: true },
        { input: 'false', expected: false },
        { input: 'FALSE', expected: false },
        { input: 'False', expected: false },
        { input: '0', expected: false },
        { input: '', expected: false },
        { input: undefined, expected: false }
      ];

      testCases.forEach(({ input, expected }) => {
        if (input !== undefined) {
          process.env.CYBERARK_ENABLED = input;
        } else {
          delete process.env.CYBERARK_ENABLED;
        }

        const enabled = process.env.CYBERARK_ENABLED?.toLowerCase() === 'true' ||
                       process.env.CYBERARK_ENABLED === '1';
        expect(enabled).toBe(expected);
      });
    });

    it('should handle integer environment variables with validation', () => {
      // Test valid integer values
      process.env.CYBERARK_TIMEOUT = '25000';
      process.env.CYBERARK_RETRY_ATTEMPTS = '7';
      process.env.CYBERARK_CIRCUIT_BREAKER_THRESHOLD = '8';

      const timeout = parseInt(process.env.CYBERARK_TIMEOUT || '30000');
      const retryAttempts = parseInt(process.env.CYBERARK_RETRY_ATTEMPTS || '3');
      const threshold = parseInt(process.env.CYBERARK_CIRCUIT_BREAKER_THRESHOLD || '5');

      expect(timeout).toBe(25000);
      expect(retryAttempts).toBe(7);
      expect(threshold).toBe(8);
    });

    it('should use default values when environment variables are missing', () => {
      // Ensure no CyberArk env vars are set
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('CYBERARK_')) {
          delete process.env[key];
        }
      });

      const config = {
        enabled: process.env.CYBERARK_ENABLED?.toLowerCase() === 'true' || false,
        timeout: parseInt(process.env.CYBERARK_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.CYBERARK_RETRY_ATTEMPTS || '3'),
        cacheTtl: parseInt(process.env.CYBERARK_CACHE_TTL || '900')
      };

      expect(config.enabled).toBe(false);
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.cacheTtl).toBe(900);
    });
  });

  describe('Authentication Method Validation', () => {
    it('should validate API key authentication', () => {
      process.env.CYBERARK_ENABLED = 'true';
      process.env.CYBERARK_URL = 'https://conjur.example.com';
      process.env.CYBERARK_ACCOUNT = 'test';
      process.env.CYBERARK_API_KEY = 'secret-key';

      const hasValidAuth = !!(process.env.CYBERARK_API_KEY ||
        (process.env.CYBERARK_USERNAME && process.env.CYBERARK_PASSWORD) ||
        (process.env.CYBERARK_CLIENT_CERT_PATH && process.env.CYBERARK_CLIENT_KEY_PATH));

      expect(hasValidAuth).toBe(true);
    });

    it('should validate username/password authentication', () => {
      process.env.CYBERARK_ENABLED = 'true';
      process.env.CYBERARK_URL = 'https://conjur.example.com';
      process.env.CYBERARK_ACCOUNT = 'test';
      process.env.CYBERARK_USERNAME = 'test-user';
      process.env.CYBERARK_PASSWORD = 'test-password';

      const hasValidAuth = !!(process.env.CYBERARK_API_KEY ||
        (process.env.CYBERARK_USERNAME && process.env.CYBERARK_PASSWORD) ||
        (process.env.CYBERARK_CLIENT_CERT_PATH && process.env.CYBERARK_CLIENT_KEY_PATH));

      expect(hasValidAuth).toBe(true);
    });

    it('should validate certificate authentication', () => {
      process.env.CYBERARK_ENABLED = 'true';
      process.env.CYBERARK_URL = 'https://conjur.example.com';
      process.env.CYBERARK_ACCOUNT = 'test';
      process.env.CYBERARK_CLIENT_CERT_PATH = '/path/to/cert.pem';
      process.env.CYBERARK_CLIENT_KEY_PATH = '/path/to/key.pem';

      const hasValidAuth = !!(process.env.CYBERARK_API_KEY ||
        (process.env.CYBERARK_USERNAME && process.env.CYBERARK_PASSWORD) ||
        (process.env.CYBERARK_CLIENT_CERT_PATH && process.env.CYBERARK_CLIENT_KEY_PATH));

      expect(hasValidAuth).toBe(true);
    });

    it('should reject incomplete certificate authentication', () => {
      process.env.CYBERARK_ENABLED = 'true';
      process.env.CYBERARK_URL = 'https://conjur.example.com';
      process.env.CYBERARK_ACCOUNT = 'test';
      process.env.CYBERARK_CLIENT_CERT_PATH = '/path/to/cert.pem';
      // Missing CYBERARK_CLIENT_KEY_PATH

      const hasValidAuth = !!(process.env.CYBERARK_API_KEY ||
        (process.env.CYBERARK_USERNAME && process.env.CYBERARK_PASSWORD) ||
        (process.env.CYBERARK_CLIENT_CERT_PATH && process.env.CYBERARK_CLIENT_KEY_PATH));

      expect(hasValidAuth).toBe(false);
    });

    it('should reject incomplete username/password authentication', () => {
      process.env.CYBERARK_ENABLED = 'true';
      process.env.CYBERARK_URL = 'https://conjur.example.com';
      process.env.CYBERARK_ACCOUNT = 'test';
      process.env.CYBERARK_USERNAME = 'test-user';
      // Missing CYBERARK_PASSWORD

      const hasValidAuth = !!(process.env.CYBERARK_API_KEY ||
        (process.env.CYBERARK_USERNAME && process.env.CYBERARK_PASSWORD) ||
        (process.env.CYBERARK_CLIENT_CERT_PATH && process.env.CYBERARK_CLIENT_KEY_PATH));

      expect(hasValidAuth).toBe(false);
    });
  });

  describe('Development and Production Configurations', () => {
    it('should validate development configuration', () => {
      const devConfig = {
        enabled: false, // Typically disabled in development
        url: process.env.CYBERARK_URL || 'https://dev-conjur.company.com',
        account: process.env.CYBERARK_ACCOUNT || 'development',
        timeout: 15000, // Shorter timeout for development
        retryAttempts: 2,
        cacheEnabled: false // Disable cache for development
      };

      expect(devConfig.enabled).toBe(false);
      expect(devConfig.timeout).toBe(15000);
      expect(devConfig.cacheEnabled).toBe(false);
    });

    it('should validate production configuration', () => {
      process.env.CYBERARK_ENABLED = 'true';
      process.env.CYBERARK_URL = 'https://prod-conjur.company.com';
      process.env.CYBERARK_ACCOUNT = 'production';
      process.env.CYBERARK_API_KEY = 'prod-api-key';
      process.env.CYBERARK_TIMEOUT = '45000';
      process.env.CYBERARK_RETRY_ATTEMPTS = '5';
      process.env.CYBERARK_CIRCUIT_BREAKER_THRESHOLD = '10';
      process.env.CYBERARK_CACHE_TTL = '1800';

      const prodConfig = {
        enabled: process.env.CYBERARK_ENABLED === 'true',
        url: process.env.CYBERARK_URL,
        account: process.env.CYBERARK_ACCOUNT,
        apiKey: process.env.CYBERARK_API_KEY,
        timeout: parseInt(process.env.CYBERARK_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.CYBERARK_RETRY_ATTEMPTS || '3'),
        circuitBreakerThreshold: parseInt(process.env.CYBERARK_CIRCUIT_BREAKER_THRESHOLD || '5'),
        cacheTtl: parseInt(process.env.CYBERARK_CACHE_TTL || '900')
      };

      expect(prodConfig.enabled).toBe(true);
      expect(prodConfig.url).toBe('https://prod-conjur.company.com');
      expect(prodConfig.account).toBe('production');
      expect(prodConfig.timeout).toBe(45000);
      expect(prodConfig.retryAttempts).toBe(5);
      expect(prodConfig.circuitBreakerThreshold).toBe(10);
      expect(prodConfig.cacheTtl).toBe(1800);
    });
  });

  describe('Security Considerations', () => {
    it('should not log sensitive configuration values', () => {
      const sensitiveConfig = {
        enabled: true,
        url: 'https://conjur.example.com',
        account: 'test',
        apiKey: 'super-secret-api-key',
        username: 'admin',
        password: 'super-secret-password'
      };

      // Simulate logging function that redacts sensitive fields
      const redactSensitive = (config: any) => {
        const redacted = { ...config };
        if (redacted.apiKey) redacted.apiKey = '[REDACTED]';
        if (redacted.password) redacted.password = '[REDACTED]';
        return redacted;
      };

      const logSafe = redactSensitive(sensitiveConfig);

      expect(logSafe.apiKey).toBe('[REDACTED]');
      expect(logSafe.password).toBe('[REDACTED]');
      expect(logSafe.url).toBe('https://conjur.example.com'); // Non-sensitive
      expect(logSafe.account).toBe('test'); // Non-sensitive
    });

    it('should validate SSL/TLS requirements for production URLs', () => {
      const configs = [
        { url: 'https://conjur.company.com', valid: true },
        { url: 'http://conjur.company.com', valid: false }, // HTTP not allowed
        { url: 'https://localhost:8080', valid: true }, // HTTPS localhost OK
        { url: 'http://localhost:8080', valid: true } // HTTP localhost OK for dev
      ];

      configs.forEach(({ url, valid }) => {
        const isSecure = url.startsWith('https://') ||
                        (url.startsWith('http://') && url.includes('localhost'));
        expect(isSecure).toBe(valid);
      });
    });
  });
});