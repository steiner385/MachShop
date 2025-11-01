/**
 * License Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createLicenseManager } from '../../../packages/extension-sdk/src/licensing/license-manager';
import { LicenseStatus, LicenseType } from '../../../packages/extension-sdk/src/licensing/types';

describe('LicenseManager', () => {
  let licenseManager: ReturnType<typeof createLicenseManager>;

  beforeEach(() => {
    licenseManager = createLicenseManager();
  });

  describe('license activation', () => {
    it('should activate a license successfully', async () => {
      const response = await licenseManager.activate({
        extensionId: 'test-ext',
        licenseKey: '12345678901234567890',
        siteId: 'site-1',
        licensee: 'Test Company',
      });

      expect(response.success).toBe(true);
      expect(response.license).toBeDefined();
      expect(response.license?.status).toBe(LicenseStatus.ACTIVE);
    });

    it('should reject invalid license key', async () => {
      const response = await licenseManager.activate({
        extensionId: 'test-ext',
        licenseKey: 'short',
        siteId: 'site-1',
        licensee: 'Test Company',
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid license key');
    });

    it('should prevent duplicate activation', async () => {
      const request = {
        extensionId: 'test-ext',
        licenseKey: '12345678901234567890',
        siteId: 'site-1',
        licensee: 'Test Company',
      };

      const first = await licenseManager.activate(request);
      expect(first.success).toBe(true);

      const second = await licenseManager.activate(request);
      expect(second.success).toBe(false);
      expect(second.error).toContain('already activated');
    });
  });

  describe('license validation', () => {
    beforeEach(async () => {
      await licenseManager.activate({
        extensionId: 'test-ext',
        licenseKey: '12345678901234567890',
        siteId: 'site-1',
        licensee: 'Test Company',
      });
    });

    it('should validate active license', async () => {
      const licenses = licenseManager.getExtensionLicenses('test-ext');
      const result = await licenseManager.validate(licenses[0].id);

      expect(result.valid).toBe(true);
      expect(result.status).toBe(LicenseStatus.ACTIVE);
    });

    it('should return undefined for non-existent license', async () => {
      const result = await licenseManager.validate('non-existent');

      expect(result.valid).toBe(false);
      expect(result.status).toBe(LicenseStatus.INACTIVE);
    });
  });

  describe('license retrieval', () => {
    beforeEach(async () => {
      await licenseManager.activate({
        extensionId: 'test-ext',
        licenseKey: '12345678901234567890',
        siteId: 'site-1',
        licensee: 'Test Company',
      });

      await licenseManager.activate({
        extensionId: 'test-ext-2',
        licenseKey: '98765432109876543210',
        siteId: 'site-1',
        licensee: 'Another Company',
      });
    });

    it('should get extension licenses', () => {
      const licenses = licenseManager.getExtensionLicenses('test-ext');

      expect(licenses).toHaveLength(1);
      expect(licenses[0].extensionId).toBe('test-ext');
    });

    it('should get site licenses', () => {
      const licenses = licenseManager.getSiteLicenses('site-1');

      expect(licenses).toHaveLength(2);
      expect(licenses.every((l) => l.siteId === 'site-1')).toBe(true);
    });
  });

  describe('usage tracking', () => {
    beforeEach(async () => {
      await licenseManager.activate({
        extensionId: 'test-ext',
        licenseKey: '12345678901234567890',
        siteId: 'site-1',
        licensee: 'Test Company',
      });
    });

    it('should track feature usage', async () => {
      const licenses = licenseManager.getExtensionLicenses('test-ext');
      const licenseId = licenses[0].id;

      await licenseManager.trackUsage(licenseId, 'advanced_features', 50);

      const usage = licenseManager.getUsage(licenseId, 'advanced_features');

      expect(usage).toBeDefined();
      expect(usage?.current).toBe(50);
      expect(usage?.limit).toBe(100);
      expect(usage?.exceeded).toBe(false);
    });

    it('should detect exceeded usage', async () => {
      const licenses = licenseManager.getExtensionLicenses('test-ext');
      const licenseId = licenses[0].id;

      await licenseManager.trackUsage(licenseId, 'advanced_features', 150);

      const usage = licenseManager.getUsage(licenseId, 'advanced_features');

      expect(usage?.exceeded).toBe(true);
      expect(usage?.percentage).toBeGreaterThan(100);
    });
  });

  describe('entitlements', () => {
    beforeEach(async () => {
      await licenseManager.activate({
        extensionId: 'test-ext',
        licenseKey: '12345678901234567890',
        siteId: 'site-1',
        licensee: 'Test Company',
      });
    });

    it('should check entitlement', () => {
      const licenses = licenseManager.getExtensionLicenses('test-ext');
      const licenseId = licenses[0].id;

      expect(licenseManager.hasEntitlement(licenseId, 'basic_features')).toBe(true);
      expect(licenseManager.hasEntitlement(licenseId, 'advanced_features')).toBe(true);
      expect(licenseManager.hasEntitlement(licenseId, 'premium_features')).toBe(false);
    });
  });

  describe('deactivation', () => {
    beforeEach(async () => {
      await licenseManager.activate({
        extensionId: 'test-ext',
        licenseKey: '12345678901234567890',
        siteId: 'site-1',
        licensee: 'Test Company',
      });
    });

    it('should deactivate license', async () => {
      const licenses = licenseManager.getExtensionLicenses('test-ext');
      const licenseId = licenses[0].id;

      await licenseManager.deactivate(licenseId);

      const license = licenseManager.getLicense(licenseId);

      expect(license?.status).toBe(LicenseStatus.INACTIVE);
    });
  });

  describe('site configuration', () => {
    beforeEach(async () => {
      await licenseManager.activate({
        extensionId: 'test-ext',
        licenseKey: '12345678901234567890',
        siteId: 'site-1',
        licensee: 'Test Company',
      });
    });

    it('should get site configuration', () => {
      const config = licenseManager.getSiteConfig('site-1');

      expect(config).toBeDefined();
      expect(config?.siteId).toBe('site-1');
      expect(config?.licenses).toHaveLength(1);
      expect(config?.compliant).toBe(true);
    });
  });

  describe('audit logging', () => {
    beforeEach(async () => {
      await licenseManager.activate({
        extensionId: 'test-ext',
        licenseKey: '12345678901234567890',
        siteId: 'site-1',
        licensee: 'Test Company',
      });
    });

    it('should record audit logs', async () => {
      const logs = await licenseManager.getAuditLogs({
        extensionId: 'test-ext',
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('ACTIVATED');
      expect(logs[0].statusAfter).toBe(LicenseStatus.ACTIVE);
    });

    it('should filter audit logs', async () => {
      const logs = await licenseManager.getAuditLogs({
        extensionId: 'non-existent',
      });

      expect(logs).toHaveLength(0);
    });
  });

  describe('multi-site compliance', () => {
    beforeEach(async () => {
      await licenseManager.activate({
        extensionId: 'test-ext',
        licenseKey: '12345678901234567890',
        siteId: 'site-1',
        licensee: 'Company 1',
      });

      await licenseManager.activate({
        extensionId: 'test-ext-2',
        licenseKey: '98765432109876543210',
        siteId: 'site-2',
        licensee: 'Company 2',
      });
    });

    it('should check multi-site compliance', async () => {
      const compliant = await licenseManager.checkMultiSiteCompliance(['site-1', 'site-2']);

      expect(compliant).toBe(true);
    });

    it('should fail compliance check for non-existent site', async () => {
      const compliant = await licenseManager.checkMultiSiteCompliance(['non-existent']);

      expect(compliant).toBe(false);
    });
  });
});
