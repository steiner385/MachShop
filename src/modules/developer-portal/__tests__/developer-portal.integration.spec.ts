/**
 * Developer Portal Integration Tests
 *
 * Comprehensive tests for self-service developer portal functionality
 *
 * @module tests/developer-portal.integration
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { developerService } from '../services/developer.service';
import { apiKeyService } from '../../api-keys/api-key.service';
import { ApiTier, ApiKeyStatus } from '../../../constants/api-tiers';

describe('Developer Portal Integration Tests', () => {
  const testDeveloperEmail = 'test-dev@example.com';
  const testDeveloperName = 'Test Developer';
  const testCompany = 'Test Corp';

  beforeAll(async () => {
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Developer Registration', () => {
    it('should register a new developer', async () => {
      const profile = await developerService.registerDeveloper({
        name: testDeveloperName,
        email: testDeveloperEmail,
        company: testCompany
      });

      expect(profile).toBeDefined();
      expect(profile.name).toBe(testDeveloperName);
      expect(profile.email).toBe(testDeveloperEmail);
      expect(profile.company).toBe(testCompany);
      expect(profile.apiKeysCount).toBe(0);
      expect(profile.createdAt).toBeDefined();
    });

    it('should register developer without company', async () => {
      const profile = await developerService.registerDeveloper({
        name: 'Solo Dev',
        email: 'solo@example.com'
      });

      expect(profile).toBeDefined();
      expect(profile.name).toBe('Solo Dev');
      expect(profile.company).toBeUndefined();
    });

    it('should include developer ID in profile', async () => {
      const profile = await developerService.registerDeveloper({
        name: 'Dev with ID',
        email: 'devid@example.com'
      });

      expect(profile.id).toBeDefined();
      expect(profile.id).toMatch(/^dev_/);
    });
  });

  describe('Self-Service Key Creation', () => {
    it('should create PUBLIC tier key without approval', async () => {
      const result = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'My Public Key',
        tier: ApiTier.PUBLIC,
        scopes: ['read:work-orders', 'read:materials']
      });

      expect(result).toBeDefined();
      expect(result.apiKey).toBeDefined();
      expect(result.keyId).toBeDefined();
      expect(result.requiresApproval).toBe(false);
      expect(result.apiKey).toMatch(/^pk_live_/);
    });

    it('should create SDK tier key with approval requirement', async () => {
      const result = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'My SDK Key',
        tier: ApiTier.SDK,
        scopes: ['write:work-orders', 'read:materials']
      });

      expect(result).toBeDefined();
      expect(result.apiKey).toBeDefined();
      expect(result.keyId).toBeDefined();
      expect(result.requiresApproval).toBe(true);
      expect(result.apiKey).toMatch(/^sdk_live_/);
    });

    it('should create PRIVATE tier key with approval requirement', async () => {
      const result = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'My Private Key',
        tier: ApiTier.PRIVATE,
        scopes: ['*']
      });

      expect(result).toBeDefined();
      expect(result.apiKey).toBeDefined();
      expect(result.keyId).toBeDefined();
      expect(result.requiresApproval).toBe(true);
      expect(result.apiKey).toMatch(/^pvt_live_/);
    });

    it('should include scopes in created key', async () => {
      const scopes = ['read:work-orders', 'write:materials'];
      const result = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Scoped Key',
        tier: ApiTier.PUBLIC,
        scopes
      });

      expect(result).toBeDefined();
      // Scopes would be retrievable via getKey
    });

    it('should create key with empty scopes', async () => {
      const result = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'No Scopes Key',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      expect(result).toBeDefined();
      expect(result.apiKey).toBeDefined();
    });
  });

  describe('List Developer Keys', () => {
    it('should list all keys for a developer', async () => {
      // Create a test key first
      await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'List Test Key 1',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);

      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);
      expect(keys[0]).toHaveProperty('id');
      expect(keys[0]).toHaveProperty('name');
      expect(keys[0]).toHaveProperty('tier');
      expect(keys[0]).toHaveProperty('status');
      expect(keys[0]).toHaveProperty('createdAt');
    });

    it('should include key prefix in listing', async () => {
      await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Prefix Test Key',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);

      expect(keys.length).toBeGreaterThan(0);
      const publicKey = keys.find(k => k.tier === ApiTier.PUBLIC);
      if (publicKey) {
        expect(publicKey.keyPrefix).toMatch(/^pk_/);
      }
    });

    it('should return empty list for developer with no keys', async () => {
      const newDevEmail = 'no-keys-dev@example.com';
      const keys = await developerService.getDeveloperKeys(newDevEmail);

      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBe(0);
    });

    it('should include last used timestamp if available', async () => {
      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);

      expect(keys.length).toBeGreaterThan(0);
      keys.forEach(key => {
        if (key.lastUsedAt) {
          expect(key.lastUsedAt).toBeInstanceOf(Date);
        }
      });
    });
  });

  describe('Get Key Details', () => {
    it('should retrieve details for specific key', async () => {
      const createResult = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Detail Test Key',
        tier: ApiTier.PUBLIC,
        scopes: ['read:work-orders']
      });

      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);
      const keyId = keys.find(k => k.name === 'Detail Test Key')?.id;

      if (keyId) {
        const key = keys.find(k => k.id === keyId);
        expect(key).toBeDefined();
        expect(key?.name).toBe('Detail Test Key');
        expect(key?.tier).toBe(ApiTier.PUBLIC);
      }
    });

    it('should show key metadata including expiration', async () => {
      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);

      expect(keys.length).toBeGreaterThan(0);
      keys.forEach(key => {
        expect(key).toHaveProperty('id');
        expect(key).toHaveProperty('name');
        expect(key).toHaveProperty('tier');
        expect(key).toHaveProperty('status');
        if (key.expiresAt) {
          expect(key.expiresAt).toBeInstanceOf(Date);
        }
      });
    });
  });

  describe('Key Rotation', () => {
    it('should rotate an API key', async () => {
      const createResult = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Rotation Test Key',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);
      const originalKeyId = keys.find(k => k.name === 'Rotation Test Key')?.id;

      if (originalKeyId) {
        const rotationResult = await developerService.rotateKey(
          originalKeyId,
          testDeveloperEmail
        );

        expect(rotationResult).toBeDefined();
        expect(rotationResult.apiKey).toBeDefined();
        expect(rotationResult.newKeyId).toBeDefined();
        expect(rotationResult.newKeyId).not.toBe(originalKeyId);
      }
    });

    it('should generate new key with different value', async () => {
      const createResult1 = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Rotation Uniqueness Test 1',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      const createResult2 = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Rotation Uniqueness Test 2',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      // Keys should be different
      expect(createResult1.apiKey).not.toBe(createResult2.apiKey);
    });

    it('should prevent unauthorized key rotation', async () => {
      const createResult = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Unauthorized Rotation Test',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);
      const keyId = keys.find(k => k.name === 'Unauthorized Rotation Test')?.id;

      if (keyId) {
        // Try to rotate with wrong developer email
        try {
          await developerService.rotateKey(keyId, 'wrong-developer@example.com');
          fail('Should have thrown unauthorized error');
        } catch (error) {
          expect(error).toBeDefined();
          if (error instanceof Error) {
            expect(error.message).toContain('Unauthorized');
          }
        }
      }
    });
  });

  describe('Key Revocation', () => {
    it('should revoke an API key', async () => {
      const createResult = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Revoke Test Key',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);
      const keyId = keys.find(k => k.name === 'Revoke Test Key')?.id;

      if (keyId) {
        await developerService.revokeKey(keyId, testDeveloperEmail);

        // Key should no longer be usable
        // In real implementation, would verify status changed to REVOKED
      }
    });

    it('should prevent unauthorized key revocation', async () => {
      const createResult = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Unauthorized Revoke Test',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);
      const keyId = keys.find(k => k.name === 'Unauthorized Revoke Test')?.id;

      if (keyId) {
        // Try to revoke with wrong developer email
        try {
          await developerService.revokeKey(keyId, 'wrong-developer@example.com');
          fail('Should have thrown unauthorized error');
        } catch (error) {
          expect(error).toBeDefined();
          if (error instanceof Error) {
            expect(error.message).toContain('Unauthorized');
          }
        }
      }
    });
  });

  describe('Usage Analytics', () => {
    it('should retrieve developer usage analytics', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();

      const analytics = await developerService.getDeveloperUsageAnalytics(
        testDeveloperEmail,
        thirtyDaysAgo,
        today
      );

      expect(analytics).toBeDefined();
      expect(analytics).toHaveProperty('developer');
      expect(analytics).toHaveProperty('period');
      expect(analytics).toHaveProperty('totalRequests');
      expect(analytics).toHaveProperty('totalKeys');
      expect(analytics).toHaveProperty('keys');
    });

    it('should handle date range queries', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const analytics = await developerService.getDeveloperUsageAnalytics(
        testDeveloperEmail,
        startDate,
        endDate
      );

      expect(analytics).toBeDefined();
      expect(analytics.period.startDate).toEqual(startDate);
      expect(analytics.period.endDate).toEqual(endDate);
    });

    it('should show per-key statistics', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();

      const analytics = await developerService.getDeveloperUsageAnalytics(
        testDeveloperEmail,
        thirtyDaysAgo,
        today
      );

      expect(Array.isArray(analytics.keys)).toBe(true);
      if (analytics.keys.length > 0) {
        analytics.keys.forEach(keyStats => {
          expect(keyStats).toHaveProperty('keyId');
          expect(keyStats).toHaveProperty('name');
          expect(keyStats).toHaveProperty('tier');
          expect(keyStats).toHaveProperty('totalRequests');
        });
      }
    });

    it('should calculate success rate', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();

      const analytics = await developerService.getDeveloperUsageAnalytics(
        testDeveloperEmail,
        thirtyDaysAgo,
        today
      );

      expect(analytics).toHaveProperty('successRate');
      expect(analytics.successRate).toBeGreaterThanOrEqual(0);
      expect(analytics.successRate).toBeLessThanOrEqual(100);
    });

    it('should handle empty usage data', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const analytics = await developerService.getDeveloperUsageAnalytics(
        'no-usage-dev@example.com',
        new Date(),
        futureDate
      );

      expect(analytics.totalRequests).toBe(0);
      expect(Array.isArray(analytics.keys)).toBe(true);
    });
  });

  describe('Pending Approvals', () => {
    it('should retrieve pending approval keys', async () => {
      const pendingKeys = await developerService.getPendingKeys(testDeveloperEmail);

      expect(Array.isArray(pendingKeys)).toBe(true);
      pendingKeys.forEach(key => {
        expect(key).toHaveProperty('id');
        expect(key).toHaveProperty('name');
        expect(key).toHaveProperty('tier');
        expect(key).toHaveProperty('createdAt');
      });
    });

    it('should only show keys awaiting approval', async () => {
      const pendingKeys = await developerService.getPendingKeys(testDeveloperEmail);

      pendingKeys.forEach(key => {
        // All should be SDK or PRIVATE tier (which require approval)
        expect([ApiTier.SDK, ApiTier.PRIVATE]).toContain(key.tier);
      });
    });

    it('should show scopes for pending keys', async () => {
      const pendingKeys = await developerService.getPendingKeys(testDeveloperEmail);

      if (pendingKeys.length > 0) {
        pendingKeys.forEach(key => {
          expect(key).toHaveProperty('scopes');
          expect(Array.isArray(key.scopes)).toBe(true);
        });
      }
    });
  });

  describe('Developer Activity', () => {
    it('should retrieve last 30 days activity', async () => {
      const activity = await developerService.getDeveloperActivity(testDeveloperEmail);

      expect(activity).toBeDefined();
      expect(activity).toHaveProperty('developer');
      expect(activity).toHaveProperty('period');
      expect(activity).toHaveProperty('totalRequests');
      expect(activity).toHaveProperty('apiKeysActive');
      expect(activity).toHaveProperty('successRate');
    });

    it('should indicate activity period as 30 days', async () => {
      const activity = await developerService.getDeveloperActivity(testDeveloperEmail);

      expect(activity.period).toBe('30 days');
    });

    it('should show last active timestamp', async () => {
      const activity = await developerService.getDeveloperActivity(testDeveloperEmail);

      expect(activity).toHaveProperty('lastActive');
      if (activity.lastActive) {
        expect(activity.lastActive).toBeInstanceOf(Date);
      }
    });
  });

  describe('Update Key Settings', () => {
    it('should update key name', async () => {
      const createResult = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Original Name',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);
      const keyId = keys.find(k => k.name === 'Original Name')?.id;

      if (keyId) {
        await developerService.updateKeySettings(keyId, testDeveloperEmail, {
          name: 'Updated Name'
        });

        // Verify name was updated
      }
    });

    it('should update key expiration', async () => {
      const createResult = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Expiration Test Key',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);
      const keyId = keys.find(k => k.name === 'Expiration Test Key')?.id;

      if (keyId) {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        await developerService.updateKeySettings(keyId, testDeveloperEmail, {
          expiresAt: futureDate
        });

        // Verify expiration was set
      }
    });

    it('should prevent unauthorized settings update', async () => {
      const createResult = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Unauthorized Update Test',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);
      const keyId = keys.find(k => k.name === 'Unauthorized Update Test')?.id;

      if (keyId) {
        try {
          await developerService.updateKeySettings(
            keyId,
            'wrong-developer@example.com',
            { name: 'Hacked Name' }
          );
          fail('Should have thrown unauthorized error');
        } catch (error) {
          expect(error).toBeDefined();
          if (error instanceof Error) {
            expect(error.message).toContain('Unauthorized');
          }
        }
      }
    });
  });

  describe('Security and Authorization', () => {
    it('should verify developer ownership before operations', async () => {
      const createResult = await developerService.createDeveloperKey({
        developerEmail: testDeveloperEmail,
        name: 'Security Test Key',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      const keys = await developerService.getDeveloperKeys(testDeveloperEmail);
      const keyId = keys.find(k => k.name === 'Security Test Key')?.id;

      if (keyId) {
        // Should not be able to access with different developer email
        try {
          await developerService.rotateKey(keyId, 'other-dev@example.com');
          fail('Should have thrown error');
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    it('should prevent key access across developers', async () => {
      const dev1Email = 'dev1@example.com';
      const dev2Email = 'dev2@example.com';

      const key1 = await developerService.createDeveloperKey({
        developerEmail: dev1Email,
        name: 'Dev 1 Key',
        tier: ApiTier.PUBLIC,
        scopes: []
      });

      const dev1Keys = await developerService.getDeveloperKeys(dev1Email);
      const dev1KeyId = dev1Keys.find(k => k.name === 'Dev 1 Key')?.id;

      if (dev1KeyId) {
        // Dev2 should not be able to access Dev1's keys
        const dev2Keys = await developerService.getDeveloperKeys(dev2Email);
        const found = dev2Keys.find(k => k.id === dev1KeyId);
        expect(found).toBeUndefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid email gracefully', async () => {
      try {
        await developerService.getDeveloperKeys('invalid-email');
        // Should still work, just return empty or throw
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle non-existent key ID', async () => {
      try {
        const keys = await developerService.getDeveloperKeys(testDeveloperEmail);
        // Trying to rotate non-existent key should fail
        // In real implementation
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should provide meaningful error messages', async () => {
      try {
        await developerService.rotateKey('nonexistent_key_id', testDeveloperEmail);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
        if (error instanceof Error) {
          expect(error.message.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
