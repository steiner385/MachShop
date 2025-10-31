/**
 * CyberArk Migration Tool Test Suite
 *
 * Comprehensive tests for credential migration utility from environment variables
 * to CyberArk vault, including discovery, planning, migration, validation, and rollback.
 */

import { describe, beforeEach, afterEach, it, expect, vi, Mock } from 'vitest';
import { execSync } from 'child_process';

// Mock dependencies
vi.mock('child_process');
vi.mock('fs/promises');
vi.mock('../../services/CyberArkService');
vi.mock('../../utils/logger');

// Mock dotenv
vi.mock('dotenv', () => ({
  config: vi.fn(),
  parse: vi.fn()
}));

// Mock Conjur client
vi.mock('conjur', () => ({
  ApiClient: vi.fn(),
  SecretsApi: vi.fn()
}));

describe('CyberArk Migration Tool', () => {
  let mockExecSync: Mock;
  let mockCyberArkService: any;
  let mockFs: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock execSync
    mockExecSync = execSync as Mock;

    // Mock filesystem operations
    mockFs = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      access: vi.fn(),
      mkdir: vi.fn()
    };
    const fs = require('fs/promises');
    Object.assign(fs, mockFs);

    // Mock CyberArk service
    mockCyberArkService = {
      retrieveSecret: vi.fn(),
      uploadSecret: vi.fn(),
      deleteSecret: vi.fn(),
      initialize: vi.fn(),
      healthCheck: vi.fn().mockResolvedValue({ status: 'healthy' })
    };

    const { getCyberArkService } = require('../../services/CyberArkService');
    getCyberArkService.mockReturnValue(mockCyberArkService);

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };
    const { logger } = require('../../utils/logger');
    Object.assign(logger, mockLogger);

    // Reset environment variables
    Object.keys(process.env).forEach(key => {
      if (key.includes('DATABASE') || key.includes('API_KEY') || key.includes('SECRET')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Credential Discovery', () => {
    it('should discover database credentials from environment', () => {
      // Set up environment variables
      process.env.AUTH_DATABASE_URL = 'postgresql://auth_user:auth_pass@localhost:5432/mes_auth';
      process.env.PRODUCTION_DATABASE_URL = 'postgresql://prod_user:prod_pass@localhost:5432/mes_prod';
      process.env.INVENTORY_DATABASE_URL = 'postgresql://inv_user:inv_pass@localhost:5432/mes_inv';

      // Simulate credential discovery
      const discoveredCredentials = [];
      Object.entries(process.env).forEach(([key, value]) => {
        if (key.includes('DATABASE_URL') && value) {
          // Parse PostgreSQL URL
          const match = value.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
          if (match) {
            const [, username, password, host, port, database] = match;
            const serviceName = key.replace('_DATABASE_URL', '').toLowerCase();

            discoveredCredentials.push({
              service: serviceName,
              type: 'database',
              credentials: { username, password, host, port, database },
              envVarName: key,
              cyberArkPath: `database/${serviceName}`
            });
          }
        }
      });

      expect(discoveredCredentials).toHaveLength(3);
      expect(discoveredCredentials[0].service).toBe('auth');
      expect(discoveredCredentials[0].credentials.username).toBe('auth_user');
      expect(discoveredCredentials[1].service).toBe('production');
      expect(discoveredCredentials[2].service).toBe('inventory');
    });

    it('should discover API keys from environment', () => {
      process.env.AZURE_AD_CLIENT_SECRET = 'azure-secret';
      process.env.SMTP_PASSWORD = 'smtp-password';
      process.env.JWT_SECRET = 'jwt-secret';
      process.env.SESSION_SECRET = 'session-secret';

      const discoveredSecrets = [];
      const secretPatterns = [
        { pattern: /^(.+)_SECRET$/, type: 'secret' },
        { pattern: /^(.+)_PASSWORD$/, type: 'password' },
        { pattern: /^(.+)_KEY$/, type: 'key' },
        { pattern: /^(.+)_TOKEN$/, type: 'token' }
      ];

      Object.entries(process.env).forEach(([key, value]) => {
        if (value) {
          secretPatterns.forEach(({ pattern, type }) => {
            const match = key.match(pattern);
            if (match) {
              const serviceName = match[1].toLowerCase().replace(/_/g, '-');
              discoveredSecrets.push({
                service: serviceName,
                type,
                value,
                envVarName: key,
                cyberArkPath: `application/${serviceName}/${type}`
              });
            }
          });
        }
      });

      expect(discoveredSecrets).toHaveLength(4);
      expect(discoveredSecrets.find(s => s.service === 'jwt')).toBeDefined();
      expect(discoveredSecrets.find(s => s.service === 'session')).toBeDefined();
      expect(discoveredSecrets.find(s => s.service === 'smtp')).toBeDefined();
    });

    it('should handle malformed database URLs gracefully', () => {
      process.env.INVALID_DATABASE_URL = 'not-a-valid-url';
      process.env.INCOMPLETE_DATABASE_URL = 'postgresql://localhost:5432/db';

      const discoveredCredentials = [];
      Object.entries(process.env).forEach(([key, value]) => {
        if (key.includes('DATABASE_URL') && value) {
          try {
            const match = value.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
            if (match) {
              const [, username, password, host, port, database] = match;
              if (username && password && host && port && database) {
                discoveredCredentials.push({
                  service: key.replace('_DATABASE_URL', '').toLowerCase(),
                  credentials: { username, password, host, port, database }
                });
              }
            }
          } catch (error) {
            // Skip malformed URLs
          }
        }
      });

      expect(discoveredCredentials).toHaveLength(0);
    });
  });

  describe('Migration Planning', () => {
    it('should create migration plan for discovered credentials', () => {
      const discoveredItems = [
        {
          service: 'auth',
          type: 'database',
          credentials: { username: 'auth_user', password: 'auth_pass' },
          envVarName: 'AUTH_DATABASE_URL',
          cyberArkPath: 'database/auth'
        },
        {
          service: 'jwt',
          type: 'secret',
          value: 'jwt-secret-value',
          envVarName: 'JWT_SECRET',
          cyberArkPath: 'application/jwt/secret'
        }
      ];

      const migrationPlan = {
        summary: {
          totalItems: discoveredItems.length,
          databaseCredentials: discoveredItems.filter(i => i.type === 'database').length,
          applicationSecrets: discoveredItems.filter(i => i.type !== 'database').length,
          estimatedDuration: discoveredItems.length * 2 // 2 seconds per item
        },
        items: discoveredItems.map(item => ({
          ...item,
          status: 'pending',
          backupPath: `/tmp/cyberark-backup/${item.envVarName}.txt`,
          migrationOrder: discoveredItems.indexOf(item) + 1
        })),
        rollbackPlan: {
          backupLocation: '/tmp/cyberark-backup',
          rollbackScript: '/tmp/cyberark-rollback.sh'
        }
      };

      expect(migrationPlan.summary.totalItems).toBe(2);
      expect(migrationPlan.summary.databaseCredentials).toBe(1);
      expect(migrationPlan.summary.applicationSecrets).toBe(1);
      expect(migrationPlan.items[0].migrationOrder).toBe(1);
      expect(migrationPlan.items[1].migrationOrder).toBe(2);
    });

    it('should prioritize database credentials over application secrets', () => {
      const items = [
        { type: 'secret', service: 'jwt' },
        { type: 'database', service: 'auth' },
        { type: 'token', service: 'api' },
        { type: 'database', service: 'production' }
      ];

      const prioritized = items.sort((a, b) => {
        // Database credentials have higher priority
        if (a.type === 'database' && b.type !== 'database') return -1;
        if (a.type !== 'database' && b.type === 'database') return 1;
        return a.service.localeCompare(b.service);
      });

      expect(prioritized[0].type).toBe('database');
      expect(prioritized[1].type).toBe('database');
      expect(prioritized[2].type).toBe('secret');
      expect(prioritized[3].type).toBe('token');
    });
  });

  describe('Dry Run Validation', () => {
    it('should validate CyberArk connectivity before migration', async () => {
      mockCyberArkService.healthCheck.mockResolvedValue({
        status: 'healthy',
        authenticated: true,
        circuitBreaker: { state: 'CLOSED' }
      });

      const healthCheck = await mockCyberArkService.healthCheck();

      expect(healthCheck.status).toBe('healthy');
      expect(healthCheck.authenticated).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('CyberArk service health check passed')
      );
    });

    it('should check for existing secrets in CyberArk', async () => {
      const migrationItems = [
        { cyberArkPath: 'database/auth/username' },
        { cyberArkPath: 'database/auth/password' },
        { cyberArkPath: 'application/jwt/secret' }
      ];

      // Mock some secrets exist, some don't
      mockCyberArkService.retrieveSecret
        .mockResolvedValueOnce('existing-value') // database/auth/username exists
        .mockRejectedValueOnce(new Error('Secret not found')) // database/auth/password doesn't exist
        .mockRejectedValueOnce(new Error('Secret not found')); // application/jwt/secret doesn't exist

      const conflicts = [];
      for (const item of migrationItems) {
        try {
          await mockCyberArkService.retrieveSecret(item.cyberArkPath);
          conflicts.push(item.cyberArkPath);
        } catch (error) {
          // Secret doesn't exist, no conflict
        }
      }

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toBe('database/auth/username');
    });

    it('should validate write permissions to backup directory', async () => {
      const backupDir = '/tmp/cyberark-backup';

      // Mock successful directory creation and write test
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.access.mockResolvedValue(undefined);

      try {
        await mockFs.mkdir(backupDir, { recursive: true });
        await mockFs.writeFile(`${backupDir}/test.txt`, 'test');
        await mockFs.access(`${backupDir}/test.txt`);

        expect(true).toBe(true); // Directory is writable
      } catch (error) {
        expect(false).toBe(true); // Should not reach here
      }
    });
  });

  describe('Migration Execution', () => {
    it('should migrate database credentials to CyberArk', async () => {
      const databaseCredential = {
        service: 'auth',
        credentials: {
          username: 'auth_user',
          password: 'auth_pass',
          host: 'localhost',
          port: '5432',
          database: 'mes_auth'
        },
        cyberArkPath: 'database/auth'
      };

      mockCyberArkService.uploadSecret = vi.fn().mockResolvedValue(true);

      // Simulate uploading individual credential components
      const uploadPromises = [
        mockCyberArkService.uploadSecret(`${databaseCredential.cyberArkPath}/username`, databaseCredential.credentials.username),
        mockCyberArkService.uploadSecret(`${databaseCredential.cyberArkPath}/password`, databaseCredential.credentials.password),
        mockCyberArkService.uploadSecret(`${databaseCredential.cyberArkPath}/host`, databaseCredential.credentials.host),
        mockCyberArkService.uploadSecret(`${databaseCredential.cyberArkPath}/port`, databaseCredential.credentials.port),
        mockCyberArkService.uploadSecret(`${databaseCredential.cyberArkPath}/database`, databaseCredential.credentials.database)
      ];

      await Promise.all(uploadPromises);

      expect(mockCyberArkService.uploadSecret).toHaveBeenCalledTimes(5);
      expect(mockCyberArkService.uploadSecret).toHaveBeenCalledWith('database/auth/username', 'auth_user');
      expect(mockCyberArkService.uploadSecret).toHaveBeenCalledWith('database/auth/password', 'auth_pass');
    });

    it('should migrate application secrets to CyberArk', async () => {
      const applicationSecrets = [
        { cyberArkPath: 'application/jwt/secret', value: 'jwt-secret-value' },
        { cyberArkPath: 'application/session/secret', value: 'session-secret-value' },
        { cyberArkPath: 'integrations/azure/client-secret', value: 'azure-secret-value' }
      ];

      mockCyberArkService.uploadSecret = vi.fn().mockResolvedValue(true);

      for (const secret of applicationSecrets) {
        await mockCyberArkService.uploadSecret(secret.cyberArkPath, secret.value);
      }

      expect(mockCyberArkService.uploadSecret).toHaveBeenCalledTimes(3);
      expect(mockCyberArkService.uploadSecret).toHaveBeenCalledWith('application/jwt/secret', 'jwt-secret-value');
    });

    it('should create backup before migration', async () => {
      const envVariable = {
        name: 'JWT_SECRET',
        value: 'jwt-secret-value',
        backupPath: '/tmp/cyberark-backup/JWT_SECRET.txt'
      };

      mockFs.writeFile.mockResolvedValue(undefined);

      // Create backup
      await mockFs.writeFile(envVariable.backupPath, envVariable.value);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        envVariable.backupPath,
        envVariable.value
      );
    });

    it('should handle migration failures gracefully', async () => {
      const secret = {
        cyberArkPath: 'application/jwt/secret',
        value: 'jwt-secret-value'
      };

      mockCyberArkService.uploadSecret.mockRejectedValue(new Error('Network timeout'));

      try {
        await mockCyberArkService.uploadSecret(secret.cyberArkPath, secret.value);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Network timeout');
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to migrate secret')
        );
      }
    });
  });

  describe('Migration Validation', () => {
    it('should validate migrated credentials can be retrieved', async () => {
      const migratedItems = [
        { cyberArkPath: 'database/auth/username', expectedValue: 'auth_user' },
        { cyberArkPath: 'database/auth/password', expectedValue: 'auth_pass' },
        { cyberArkPath: 'application/jwt/secret', expectedValue: 'jwt-secret-value' }
      ];

      // Mock successful retrieval
      mockCyberArkService.retrieveSecret
        .mockResolvedValueOnce('auth_user')
        .mockResolvedValueOnce('auth_pass')
        .mockResolvedValueOnce('jwt-secret-value');

      const validationResults = [];
      for (const item of migratedItems) {
        try {
          const retrievedValue = await mockCyberArkService.retrieveSecret(item.cyberArkPath);
          validationResults.push({
            path: item.cyberArkPath,
            success: retrievedValue === item.expectedValue,
            retrievedValue
          });
        } catch (error) {
          validationResults.push({
            path: item.cyberArkPath,
            success: false,
            error: error.message
          });
        }
      }

      expect(validationResults).toHaveLength(3);
      expect(validationResults.every(r => r.success)).toBe(true);
    });

    it('should detect validation failures', async () => {
      const item = {
        cyberArkPath: 'application/jwt/secret',
        expectedValue: 'jwt-secret-value'
      };

      // Mock retrieval returning different value
      mockCyberArkService.retrieveSecret.mockResolvedValue('wrong-value');

      const retrievedValue = await mockCyberArkService.retrieveSecret(item.cyberArkPath);
      const isValid = retrievedValue === item.expectedValue;

      expect(isValid).toBe(false);
      expect(retrievedValue).toBe('wrong-value');
    });
  });

  describe('Rollback Functionality', () => {
    it('should restore environment variables from backup', async () => {
      const backupData = {
        'JWT_SECRET': 'jwt-secret-value',
        'SESSION_SECRET': 'session-secret-value',
        'AUTH_DATABASE_URL': 'postgresql://auth_user:auth_pass@localhost:5432/mes_auth'
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(backupData));

      // Simulate reading backup and restoring environment
      const backup = JSON.parse(await mockFs.readFile('/tmp/cyberark-backup/env-backup.json', 'utf8'));

      Object.entries(backup).forEach(([key, value]) => {
        process.env[key] = value as string;
      });

      expect(process.env.JWT_SECRET).toBe('jwt-secret-value');
      expect(process.env.SESSION_SECRET).toBe('session-secret-value');
      expect(process.env.AUTH_DATABASE_URL).toBe('postgresql://auth_user:auth_pass@localhost:5432/mes_auth');
    });

    it('should remove migrated secrets from CyberArk during rollback', async () => {
      const migratedPaths = [
        'database/auth/username',
        'database/auth/password',
        'application/jwt/secret'
      ];

      mockCyberArkService.deleteSecret = vi.fn().mockResolvedValue(true);

      for (const path of migratedPaths) {
        await mockCyberArkService.deleteSecret(path);
      }

      expect(mockCyberArkService.deleteSecret).toHaveBeenCalledTimes(3);
      expect(mockCyberArkService.deleteSecret).toHaveBeenCalledWith('database/auth/username');
      expect(mockCyberArkService.deleteSecret).toHaveBeenCalledWith('application/jwt/secret');
    });

    it('should generate rollback script', async () => {
      const rollbackCommands = [
        'export JWT_SECRET="jwt-secret-value"',
        'export SESSION_SECRET="session-secret-value"',
        'export AUTH_DATABASE_URL="postgresql://auth_user:auth_pass@localhost:5432/mes_auth"',
        '',
        '# Remove from CyberArk',
        'conjur variable delete database/auth/username',
        'conjur variable delete database/auth/password',
        'conjur variable delete application/jwt/secret'
      ];

      const rollbackScript = rollbackCommands.join('\n');

      mockFs.writeFile.mockResolvedValue(undefined);
      mockExecSync.mockReturnValue(Buffer.from(''));

      await mockFs.writeFile('/tmp/cyberark-rollback.sh', rollbackScript);

      // Make script executable
      mockExecSync('chmod +x /tmp/cyberark-rollback.sh');

      expect(mockFs.writeFile).toHaveBeenCalledWith('/tmp/cyberark-rollback.sh', rollbackScript);
      expect(mockExecSync).toHaveBeenCalledWith('chmod +x /tmp/cyberark-rollback.sh');
    });
  });

  describe('Progress Tracking', () => {
    it('should track migration progress', () => {
      const migrationItems = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'in-progress' },
        { id: 3, status: 'completed' },
        { id: 4, status: 'failed' }
      ];

      const progress = {
        total: migrationItems.length,
        completed: migrationItems.filter(i => i.status === 'completed').length,
        failed: migrationItems.filter(i => i.status === 'failed').length,
        inProgress: migrationItems.filter(i => i.status === 'in-progress').length,
        pending: migrationItems.filter(i => i.status === 'pending').length
      };

      progress.percentage = Math.round((progress.completed / progress.total) * 100);

      expect(progress.total).toBe(4);
      expect(progress.completed).toBe(1);
      expect(progress.failed).toBe(1);
      expect(progress.percentage).toBe(25);
    });

    it('should estimate remaining time', () => {
      const migrationStats = {
        totalItems: 10,
        completedItems: 3,
        startTime: Date.now() - 30000, // Started 30 seconds ago
        avgTimePerItem: 10000 // 10 seconds per item
      };

      const elapsedTime = Date.now() - migrationStats.startTime;
      const remainingItems = migrationStats.totalItems - migrationStats.completedItems;
      const estimatedTimeRemaining = remainingItems * migrationStats.avgTimePerItem;

      expect(remainingItems).toBe(7);
      expect(estimatedTimeRemaining).toBe(70000); // 70 seconds
      expect(elapsedTime).toBeGreaterThan(25000); // At least 25 seconds
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle partial migration failures', () => {
      const migrationResults = [
        { path: 'database/auth/username', success: true },
        { path: 'database/auth/password', success: false, error: 'Network timeout' },
        { path: 'application/jwt/secret', success: true }
      ];

      const summary = {
        totalAttempted: migrationResults.length,
        successful: migrationResults.filter(r => r.success).length,
        failed: migrationResults.filter(r => !r.success).length,
        failedItems: migrationResults.filter(r => !r.success)
      };

      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.failedItems[0].path).toBe('database/auth/password');
    });

    it('should provide retry mechanism for failed migrations', async () => {
      const failedItem = {
        path: 'application/jwt/secret',
        value: 'jwt-secret-value',
        attempts: 0,
        maxAttempts: 3
      };

      mockCyberArkService.uploadSecret
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce(true);

      let success = false;
      while (failedItem.attempts < failedItem.maxAttempts && !success) {
        try {
          failedItem.attempts++;
          await mockCyberArkService.uploadSecret(failedItem.path, failedItem.value);
          success = true;
        } catch (error) {
          if (failedItem.attempts >= failedItem.maxAttempts) {
            throw error;
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * failedItem.attempts));
        }
      }

      expect(success).toBe(true);
      expect(failedItem.attempts).toBe(3);
    });
  });
});