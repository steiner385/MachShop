/**
 * API Key Service Unit Tests
 *
 * Tests for API key generation, validation, and lifecycle management.
 *
 * @module modules/api-keys/__tests__/api-key.service.test
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ApiKeyService } from '../api-key.service';
import { ApiTier, ApiKeyStatus } from '../../../constants/api-tiers';

const prisma = new PrismaClient();
const apiKeyService = new ApiKeyService();

describe('ApiKeyService', () => {
  beforeAll(async () => {
    // Setup test database
    // await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup
    // await prisma.$disconnect();
  });

  describe('generateApiKey', () => {
    it('should generate a PUBLIC tier key with correct prefix', () => {
      const key = apiKeyService.generateApiKey(ApiTier.PUBLIC);

      expect(key).toMatch(/^pk_(live|test)_[A-Za-z0-9_-]{32}$/);
      expect(key.length).toBeGreaterThan(40);
    });

    it('should generate a SDK tier key with correct prefix', () => {
      const key = apiKeyService.generateApiKey(ApiTier.SDK);

      expect(key).toMatch(/^sdk_(live|test)_[A-Za-z0-9_-]{32}$/);
    });

    it('should generate a PRIVATE tier key with correct prefix', () => {
      const key = apiKeyService.generateApiKey(ApiTier.PRIVATE);

      expect(key).toMatch(/^pvt_(live|test)_[A-Za-z0-9_-]{32}$/);
    });

    it('should generate unique keys', () => {
      const key1 = apiKeyService.generateApiKey(ApiTier.PUBLIC);
      const key2 = apiKeyService.generateApiKey(ApiTier.PUBLIC);

      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey', () => {
    it('should hash an API key', async () => {
      const key = 'pk_test_1234567890abcdefghijklmnopqrstuvw';
      const hash = await apiKeyService.hashApiKey(key);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(key);
      expect(hash.startsWith('$2b$')).toBe(true); // bcrypt hash format
    });

    it('should produce different hashes for different keys', async () => {
      const key1 = 'pk_test_key1234567890abcdefghijklmno';
      const key2 = 'pk_test_key2234567890abcdefghijklmno';

      const hash1 = await apiKeyService.hashApiKey(key1);
      const hash2 = await apiKeyService.hashApiKey(key2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createApiKey', () => {
    it('should create a PUBLIC tier API key', async () => {
      const result = await apiKeyService.createApiKey({
        name: 'Test Public Key',
        tier: ApiTier.PUBLIC,
        scopes: ['read:basic', 'read:public_data'],
        createdBy: 'test-user-id',
        developerEmail: 'test@example.com'
      });

      expect(result.apiKey).toBeDefined();
      expect(result.keyId).toBeDefined();
      expect(result.keyPrefix).toMatch(/^pk_(live|test)_$/);
    });

    it('should create SDK tier key with PENDING_APPROVAL status', async () => {
      const result = await apiKeyService.createApiKey({
        name: 'Test SDK Key',
        tier: ApiTier.SDK,
        scopes: ['read:*', 'write:work_orders'],
        createdBy: 'test-user-id',
        developerEmail: 'test@example.com'
      });

      expect(result.apiKey).toBeDefined();

      const apiKey = await apiKeyService.getApiKeyById(result.keyId);
      expect(apiKey?.status).toBe(ApiKeyStatus.PENDING_APPROVAL);
    });

    it('should reject invalid scopes', async () => {
      await expect(
        apiKeyService.createApiKey({
          name: 'Test Invalid Scopes',
          tier: ApiTier.PUBLIC,
          scopes: ['invalid:scope', 'another:invalid'],
          createdBy: 'test-user-id'
        })
      ).rejects.toThrow();
    });

    it('should reject write scopes for PUBLIC tier', async () => {
      await expect(
        apiKeyService.createApiKey({
          name: 'Test Public Write',
          tier: ApiTier.PUBLIC,
          scopes: ['read:basic', 'write:work_orders'],
          createdBy: 'test-user-id'
        })
      ).rejects.toThrow(/PUBLIC tier cannot have/);
    });

    it('should reject key name that is too short', async () => {
      await expect(
        apiKeyService.createApiKey({
          name: 'AB',
          tier: ApiTier.PUBLIC,
          scopes: ['read:basic'],
          createdBy: 'test-user-id'
        })
      ).rejects.toThrow(/Key name must be between/);
    });
  });

  describe('validateApiKey', () => {
    let testApiKey: string;
    let testKeyId: string;

    beforeEach(async () => {
      // Create a test API key
      const result = await apiKeyService.createApiKey({
        name: 'Test Validation Key',
        tier: ApiTier.PUBLIC,
        scopes: ['read:basic'],
        createdBy: 'test-user-id'
      });

      testApiKey = result.apiKey;
      testKeyId = result.keyId;

      // Activate the key (PUBLIC tier is auto-activated)
      // but if it was pending, approve it
      await apiKeyService.approveApiKey(testKeyId, 'admin-user-id').catch(() => {});
    });

    it('should validate a correct API key', async () => {
      const validated = await apiKeyService.validateApiKey(testApiKey);

      expect(validated).toBeDefined();
      expect(validated?.id).toBe(testKeyId);
      expect(validated?.tier).toBe(ApiTier.PUBLIC);
    });

    it('should reject an invalid API key', async () => {
      const validated = await apiKeyService.validateApiKey('pk_test_invalid_key_123456789012345');

      expect(validated).toBeNull();
    });

    it('should reject a key with invalid prefix', async () => {
      const validated = await apiKeyService.validateApiKey('invalid_prefix_key');

      expect(validated).toBeNull();
    });

    it('should reject a suspended key', async () => {
      await apiKeyService.suspendApiKey(testKeyId, 'admin-user-id');

      const validated = await apiKeyService.validateApiKey(testApiKey);

      expect(validated).toBeNull();
    });

    it('should reject a revoked key', async () => {
      await apiKeyService.revokeApiKey(testKeyId, 'admin-user-id');

      const validated = await apiKeyService.validateApiKey(testApiKey);

      expect(validated).toBeNull();
    });
  });

  describe('API key lifecycle', () => {
    let testKeyId: string;

    beforeEach(async () => {
      const result = await apiKeyService.createApiKey({
        name: 'Test Lifecycle Key',
        tier: ApiTier.SDK,
        scopes: ['read:*'],
        createdBy: 'test-user-id'
      });

      testKeyId = result.keyId;
    });

    it('should approve a pending SDK key', async () => {
      await apiKeyService.approveApiKey(testKeyId, 'admin-user-id');

      const key = await apiKeyService.getApiKeyById(testKeyId);
      expect(key?.status).toBe(ApiKeyStatus.ACTIVE);
      expect(key?.approvedBy).toBe('admin-user-id');
      expect(key?.approvedAt).toBeDefined();
    });

    it('should suspend an active key', async () => {
      await apiKeyService.approveApiKey(testKeyId, 'admin-user-id');
      await apiKeyService.suspendApiKey(testKeyId, 'admin-user-id');

      const key = await apiKeyService.getApiKeyById(testKeyId);
      expect(key?.status).toBe(ApiKeyStatus.SUSPENDED);
    });

    it('should reactivate a suspended key', async () => {
      await apiKeyService.approveApiKey(testKeyId, 'admin-user-id');
      await apiKeyService.suspendApiKey(testKeyId, 'admin-user-id');
      await apiKeyService.reactivateApiKey(testKeyId, 'admin-user-id');

      const key = await apiKeyService.getApiKeyById(testKeyId);
      expect(key?.status).toBe(ApiKeyStatus.ACTIVE);
    });

    it('should not reactivate a revoked key', async () => {
      await apiKeyService.approveApiKey(testKeyId, 'admin-user-id');
      await apiKeyService.revokeApiKey(testKeyId, 'admin-user-id');

      await expect(
        apiKeyService.reactivateApiKey(testKeyId, 'admin-user-id')
      ).rejects.toThrow(/Only suspended keys can be reactivated/);
    });
  });

  describe('expireInactiveKeys', () => {
    it('should expire keys not used in specified days', async () => {
      // Create an old key by manually setting lastUsedAt
      const result = await apiKeyService.createApiKey({
        name: 'Old Inactive Key',
        tier: ApiTier.PUBLIC,
        scopes: ['read:basic'],
        createdBy: 'test-user-id'
      });

      // Manually update lastUsedAt to 200 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 200);

      await prisma.apiKey.update({
        where: { id: result.keyId },
        data: {
          status: ApiKeyStatus.ACTIVE,
          lastUsedAt: oldDate
        }
      });

      // Expire keys older than 180 days
      const expiredCount = await apiKeyService.expireInactiveKeys(180);

      expect(expiredCount).toBeGreaterThan(0);

      const key = await apiKeyService.getApiKeyById(result.keyId);
      expect(key?.status).toBe(ApiKeyStatus.EXPIRED);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics for an API key', async () => {
      const result = await apiKeyService.createApiKey({
        name: 'Usage Stats Key',
        tier: ApiTier.PUBLIC,
        scopes: ['read:basic'],
        createdBy: 'test-user-id'
      });

      const periodStart = new Date();
      periodStart.setHours(0, 0, 0, 0);
      const periodEnd = new Date();
      periodEnd.setHours(23, 59, 59, 999);

      const stats = await apiKeyService.getUsageStats(
        result.keyId,
        periodStart,
        periodEnd
      );

      expect(stats).toBeDefined();
      expect(stats.apiKeyId).toBe(result.keyId);
      expect(stats.totalRequests).toBeGreaterThanOrEqual(0);
      expect(stats.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(stats.errorRate).toBeGreaterThanOrEqual(0);
    });
  });
});
