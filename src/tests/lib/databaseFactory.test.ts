/**
 * Database Factory Test Suite
 *
 * Comprehensive tests for CyberArk-enabled database connection factory.
 * Tests service-specific database connections, fallback mechanisms,
 * and integration with CyberArk PAM.
 */

import { describe, beforeEach, afterEach, it, expect, vi, Mock } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  createDatabaseConnection,
  getPrismaForService,
  DatabaseService,
  getDatabaseUrlForService
} from '../../lib/databaseFactory';

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn()
}));

// Mock CyberArk Service
vi.mock('../../services/CyberArkService', () => ({
  getCyberArkService: vi.fn()
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

describe('Database Factory', () => {
  let mockCyberArkService: any;
  let mockPrismaClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock CyberArk service
    mockCyberArkService = {
      retrieveDatabaseCredentials: vi.fn(),
      healthCheck: vi.fn()
    };

    // Setup mock Prisma client
    mockPrismaClient = {
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      $queryRaw: vi.fn()
    };

    const { getCyberArkService } = require('../../services/CyberArkService');
    getCyberArkService.mockReturnValue(mockCyberArkService);

    const MockedPrismaClient = PrismaClient as Mock;
    MockedPrismaClient.mockImplementation(() => mockPrismaClient);

    // Clear environment variables for consistent testing
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_DATABASE_URL;
    delete process.env.CYBERARK_ENABLED;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Service Database URL Generation', () => {
    it('should generate correct database URL for auth service', async () => {
      mockCyberArkService.retrieveDatabaseCredentials.mockResolvedValue({
        username: 'auth_user',
        password: 'auth_pass',
        host: 'localhost',
        port: '5432',
        database: 'mes_auth'
      });

      const url = await getDatabaseUrlForService(DatabaseService.AUTH);

      expect(url).toBe('postgresql://auth_user:auth_pass@localhost:5432/mes_auth');
      expect(mockCyberArkService.retrieveDatabaseCredentials).toHaveBeenCalledWith('auth');
    });

    it('should generate correct database URL for production service', async () => {
      mockCyberArkService.retrieveDatabaseCredentials.mockResolvedValue({
        username: 'prod_user',
        password: 'prod_pass',
        host: 'prod-db.company.com',
        port: '5432',
        database: 'mes_production'
      });

      const url = await getDatabaseUrlForService(DatabaseService.PRODUCTION);

      expect(url).toBe('postgresql://prod_user:prod_pass@prod-db.company.com:5432/mes_production');
      expect(mockCyberArkService.retrieveDatabaseCredentials).toHaveBeenCalledWith('production');
    });

    it('should generate URLs for all database services', async () => {
      const mockCredentials = {
        username: 'test_user',
        password: 'test_pass',
        host: 'localhost',
        port: '5432',
        database: 'test_db'
      };

      mockCyberArkService.retrieveDatabaseCredentials.mockResolvedValue(mockCredentials);

      const services = Object.values(DatabaseService);

      for (const service of services) {
        const url = await getDatabaseUrlForService(service);
        expect(url).toContain('postgresql://test_user:test_pass@localhost:5432/');
      }

      expect(mockCyberArkService.retrieveDatabaseCredentials).toHaveBeenCalledTimes(services.length);
    });
  });

  describe('Database Connection Creation', () => {
    it('should create database connection with CyberArk credentials', async () => {
      mockCyberArkService.retrieveDatabaseCredentials.mockResolvedValue({
        username: 'test_user',
        password: 'test_pass',
        host: 'localhost',
        port: '5432',
        database: 'mes_auth'
      });

      const connection = await createDatabaseConnection(DatabaseService.AUTH);

      expect(connection).toBe(mockPrismaClient);
      expect(PrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://test_user:test_pass@localhost:5432/mes_auth'
          }
        }
      });
    });

    it('should fall back to environment variables when CyberArk fails', async () => {
      process.env.AUTH_DATABASE_URL = 'postgresql://fallback_user:fallback_pass@localhost:5432/mes_auth';

      mockCyberArkService.retrieveDatabaseCredentials.mockRejectedValue(
        new Error('CyberArk unavailable')
      );

      const connection = await createDatabaseConnection(DatabaseService.AUTH);

      expect(connection).toBe(mockPrismaClient);
      expect(PrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://fallback_user:fallback_pass@localhost:5432/mes_auth'
          }
        }
      });
    });

    it('should fall back to main DATABASE_URL when service-specific URL unavailable', async () => {
      process.env.DATABASE_URL = 'postgresql://main_user:main_pass@localhost:5432/mes_main';

      mockCyberArkService.retrieveDatabaseCredentials.mockRejectedValue(
        new Error('CyberArk unavailable')
      );

      const connection = await createDatabaseConnection(DatabaseService.AUTH);

      expect(connection).toBe(mockPrismaClient);
      expect(PrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://main_user:main_pass@localhost:5432/mes_main'
          }
        }
      });
    });

    it('should throw error when no database configuration available', async () => {
      mockCyberArkService.retrieveDatabaseCredentials.mockRejectedValue(
        new Error('CyberArk unavailable')
      );

      await expect(createDatabaseConnection(DatabaseService.AUTH)).rejects.toThrow(
        'No database configuration available for service: auth'
      );
    });
  });

  describe('Service-Specific Prisma Clients', () => {
    it('should return cached Prisma client for same service', async () => {
      mockCyberArkService.retrieveDatabaseCredentials.mockResolvedValue({
        username: 'test_user',
        password: 'test_pass',
        host: 'localhost',
        port: '5432',
        database: 'mes_auth'
      });

      const client1 = await getPrismaForService(DatabaseService.AUTH);
      const client2 = await getPrismaForService(DatabaseService.AUTH);

      expect(client1).toBe(client2);
      expect(PrismaClient).toHaveBeenCalledTimes(1);
    });

    it('should create separate clients for different services', async () => {
      mockCyberArkService.retrieveDatabaseCredentials
        .mockResolvedValueOnce({
          username: 'auth_user',
          password: 'auth_pass',
          host: 'localhost',
          port: '5432',
          database: 'mes_auth'
        })
        .mockResolvedValueOnce({
          username: 'prod_user',
          password: 'prod_pass',
          host: 'localhost',
          port: '5432',
          database: 'mes_production'
        });

      const authClient = await getPrismaForService(DatabaseService.AUTH);
      const prodClient = await getPrismaForService(DatabaseService.PRODUCTION);

      expect(authClient).not.toBe(prodClient);
      expect(PrismaClient).toHaveBeenCalledTimes(2);
    });

    it('should handle connection errors gracefully', async () => {
      mockCyberArkService.retrieveDatabaseCredentials.mockResolvedValue({
        username: 'test_user',
        password: 'test_pass',
        host: 'localhost',
        port: '5432',
        database: 'mes_auth'
      });

      mockPrismaClient.$connect.mockRejectedValue(new Error('Connection failed'));

      await expect(getPrismaForService(DatabaseService.AUTH)).rejects.toThrow(
        'Failed to connect to database for service auth'
      );
    });
  });

  describe('Environment Variable Fallbacks', () => {
    it('should use service-specific environment variables', async () => {
      process.env.AUTH_DATABASE_URL = 'postgresql://auth_env:auth_pass@localhost:5432/mes_auth';
      process.env.PRODUCTION_DATABASE_URL = 'postgresql://prod_env:prod_pass@localhost:5432/mes_prod';

      mockCyberArkService.retrieveDatabaseCredentials.mockRejectedValue(
        new Error('CyberArk disabled')
      );

      const authClient = await getPrismaForService(DatabaseService.AUTH);
      const prodClient = await getPrismaForService(DatabaseService.PRODUCTION);

      expect(authClient).toBeDefined();
      expect(prodClient).toBeDefined();
      expect(PrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://auth_env:auth_pass@localhost:5432/mes_auth'
          }
        }
      });
    });

    it('should fall back through multiple environment variable patterns', async () => {
      // Test fallback hierarchy: SERVICE_DATABASE_URL -> DATABASE_URL
      process.env.DATABASE_URL = 'postgresql://fallback:pass@localhost:5432/mes_main';

      mockCyberArkService.retrieveDatabaseCredentials.mockRejectedValue(
        new Error('CyberArk disabled')
      );

      const client = await getPrismaForService(DatabaseService.INVENTORY);

      expect(client).toBeDefined();
      expect(PrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://fallback:pass@localhost:5432/mes_main'
          }
        }
      });
    });
  });

  describe('CyberArk Integration', () => {
    it('should retry on CyberArk authentication errors', async () => {
      mockCyberArkService.retrieveDatabaseCredentials
        .mockRejectedValueOnce(new Error('Authentication failed'))
        .mockResolvedValueOnce({
          username: 'retry_user',
          password: 'retry_pass',
          host: 'localhost',
          port: '5432',
          database: 'mes_auth'
        });

      const client = await getPrismaForService(DatabaseService.AUTH);

      expect(client).toBeDefined();
      expect(mockCyberArkService.retrieveDatabaseCredentials).toHaveBeenCalledTimes(2);
    });

    it('should handle CyberArk service unavailable', async () => {
      process.env.DATABASE_URL = 'postgresql://fallback:pass@localhost:5432/mes_main';

      mockCyberArkService.retrieveDatabaseCredentials.mockRejectedValue(
        new Error('Service unavailable')
      );

      const client = await getPrismaForService(DatabaseService.AUTH);

      expect(client).toBeDefined();
      // Should fall back to environment variable
      expect(PrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://fallback:pass@localhost:5432/mes_main'
          }
        }
      });
    });
  });

  describe('Connection Caching', () => {
    it('should cache connections per service', async () => {
      mockCyberArkService.retrieveDatabaseCredentials.mockResolvedValue({
        username: 'test_user',
        password: 'test_pass',
        host: 'localhost',
        port: '5432',
        database: 'mes_auth'
      });

      // Multiple calls to same service should return cached client
      const client1 = await getPrismaForService(DatabaseService.AUTH);
      const client2 = await getPrismaForService(DatabaseService.AUTH);
      const client3 = await getPrismaForService(DatabaseService.AUTH);

      expect(client1).toBe(client2);
      expect(client2).toBe(client3);
      expect(PrismaClient).toHaveBeenCalledTimes(1);
    });

    it('should maintain separate caches for different services', async () => {
      mockCyberArkService.retrieveDatabaseCredentials.mockResolvedValue({
        username: 'test_user',
        password: 'test_pass',
        host: 'localhost',
        port: '5432',
        database: 'mes_test'
      });

      const authClient = await getPrismaForService(DatabaseService.AUTH);
      const prodClient = await getPrismaForService(DatabaseService.PRODUCTION);
      const inventoryClient = await getPrismaForService(DatabaseService.INVENTORY);

      expect(new Set([authClient, prodClient, inventoryClient]).size).toBe(3);
      expect(PrismaClient).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages for connection failures', async () => {
      mockCyberArkService.retrieveDatabaseCredentials.mockResolvedValue({
        username: 'test_user',
        password: 'test_pass',
        host: 'localhost',
        port: '5432',
        database: 'mes_auth'
      });

      mockPrismaClient.$connect.mockRejectedValue(new Error('Database connection timeout'));

      await expect(getPrismaForService(DatabaseService.AUTH)).rejects.toThrow(
        'Failed to connect to database for service auth: Database connection timeout'
      );
    });

    it('should handle invalid database credentials', async () => {
      mockCyberArkService.retrieveDatabaseCredentials.mockResolvedValue({
        username: 'invalid_user',
        password: 'invalid_pass',
        host: 'localhost',
        port: '5432',
        database: 'mes_auth'
      });

      mockPrismaClient.$connect.mockRejectedValue(new Error('Invalid credentials'));

      await expect(getPrismaForService(DatabaseService.AUTH)).rejects.toThrow(
        'Failed to connect to database for service auth: Invalid credentials'
      );
    });

    it('should handle network connectivity issues', async () => {
      mockCyberArkService.retrieveDatabaseCredentials.mockResolvedValue({
        username: 'test_user',
        password: 'test_pass',
        host: 'unreachable-host',
        port: '5432',
        database: 'mes_auth'
      });

      mockPrismaClient.$connect.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(getPrismaForService(DatabaseService.AUTH)).rejects.toThrow(
        'Failed to connect to database for service auth: ECONNREFUSED'
      );
    });
  });
});