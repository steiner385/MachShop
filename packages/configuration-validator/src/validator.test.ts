/**
 * Configuration Validator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConfigurationValidator,
  InMemoryConfigurationStore,
} from './validator';
import {
  PreActivationValidationRequest,
  ActivateExtensionRequest,
  DeactivateExtensionRequest,
} from './types';

describe('ConfigurationValidator', () => {
  let validator: ConfigurationValidator;
  let store: InMemoryConfigurationStore;

  beforeEach(() => {
    store = new InMemoryConfigurationStore();
    validator = new ConfigurationValidator(store);
  });

  describe('Pre-activation validation', () => {
    it('should validate a valid activation request', async () => {
      const request: PreActivationValidationRequest = {
        siteId: 'site-123',
        extensionId: 'sap-ebs-adapter',
        version: 'v1.0.0',
        configuration: {
          erpSystem: 'SAP',
          apiEndpoint: 'https://sap.example.com',
          authMethod: 'oauth2',
        },
      };

      const report = await validator.validateBeforeActivation(request);

      expect(report.siteId).toBe('site-123');
      expect(report.extensionId).toBe('sap-ebs-adapter');
      expect(report.valid).toBe(true);
      expect(report.schemaErrors).toHaveLength(0);
    });

    it('should reject request with missing extensionId', async () => {
      const request: PreActivationValidationRequest = {
        siteId: 'site-123',
        extensionId: '',
        version: 'v1.0.0',
        configuration: {},
      };

      const report = await validator.validateBeforeActivation(request);

      expect(report.valid).toBe(false);
      expect(report.schemaErrors.length).toBeGreaterThan(0);
    });

    it('should detect conflicts with existing extensions', async () => {
      // Activate first extension
      const first: ActivateExtensionRequest = {
        siteId: 'site-123',
        extensionId: 'work-instruction-from-mes',
        version: 'v1.0.0',
        configuration: {},
        complianceSignoffs: [],
        activatedBy: 'user-1',
      };

      await validator.activateExtension(first);

      // Try to activate conflicting extension
      const second: PreActivationValidationRequest = {
        siteId: 'site-123',
        extensionId: 'work-instruction-from-plm',
        version: 'v1.0.0',
        configuration: {},
      };

      const report = await validator.validateBeforeActivation(second);

      // Should detect conflict
      expect(report.detectedConflicts.length).toBeGreaterThan(0);
    });

    it('should ignore conflicts when specified', async () => {
      const request: PreActivationValidationRequest = {
        siteId: 'site-123',
        extensionId: 'work-instruction-from-plm',
        version: 'v1.0.0',
        configuration: {},
        ignoreConflicts: ['work-instruction-from-mes'],
      };

      const report = await validator.validateBeforeActivation(request);

      // Should not report conflicts when ignored
      expect(report.detectedConflicts).toHaveLength(0);
    });
  });

  describe('Extension activation', () => {
    it('should activate extension with compliance signoffs', async () => {
      const request: ActivateExtensionRequest = {
        siteId: 'site-123',
        extensionId: 'aerospace-compliance',
        version: 'v1.0.0',
        configuration: {
          standard: 'AS9100D',
        },
        complianceSignoffs: [
          {
            aspect: 'electronic-signature-validation',
            signedBy: 'user-123',
            role: 'quality-focal',
            notes: 'Validated per site QMS',
          },
        ],
        activatedBy: 'admin-user',
        reason: 'Aerospace compliance requirement',
      };

      await validator.activateExtension(request);

      // Verify configuration was saved
      const config = await validator.getConfigurationWithSignoffs(
        'site-123',
        'aerospace-compliance'
      );

      expect(config).toBeDefined();
      expect(config!.extensionId).toBe('aerospace-compliance');
      expect(config!.enabledAt).toBeDefined();
      expect(config!.complianceSignoffs).toHaveLength(1);
      expect(config!.complianceSignoffs[0].aspect).toBe('electronic-signature-validation');
      expect(config!.complianceSignoffs[0].signedBy).toBe('user-123');
    });

    it('should generate configuration hash for audit trail', async () => {
      const config = {
        standard: 'AS9100D',
        apiEndpoint: 'https://example.com',
      };

      const request: ActivateExtensionRequest = {
        siteId: 'site-123',
        extensionId: 'test-ext',
        version: 'v1.0.0',
        configuration: config,
        complianceSignoffs: [],
        activatedBy: 'user-1',
      };

      await validator.activateExtension(request);

      const activated = await validator.getConfigurationWithSignoffs(
        'site-123',
        'test-ext'
      );

      expect(activated!.configurationHash).toBeDefined();
      expect(activated!.configurationHash).toMatch(/^hash-/);
    });

    it('should record compliance signoff with configuration hash', async () => {
      const request: ActivateExtensionRequest = {
        siteId: 'site-123',
        extensionId: 'test-ext',
        version: 'v1.0.0',
        configuration: { setting: 'value' },
        complianceSignoffs: [
          {
            aspect: 'test-aspect',
            signedBy: 'user-1',
            role: 'compliance-officer',
          },
        ],
        activatedBy: 'user-1',
      };

      await validator.activateExtension(request);

      const config = await validator.getConfigurationWithSignoffs(
        'site-123',
        'test-ext'
      );

      expect(config!.complianceSignoffs[0].configurationHash).toBe(
        config!.configurationHash
      );
    });
  });

  describe('Extension deactivation', () => {
    beforeEach(async () => {
      // Activate an extension
      const request: ActivateExtensionRequest = {
        siteId: 'site-123',
        extensionId: 'test-ext',
        version: 'v1.0.0',
        configuration: {},
        complianceSignoffs: [],
        activatedBy: 'user-1',
      };

      await validator.activateExtension(request);
    });

    it('should deactivate extension successfully', async () => {
      const request: DeactivateExtensionRequest = {
        siteId: 'site-123',
        extensionId: 'test-ext',
        deactivatedBy: 'user-1',
        reason: 'No longer needed',
      };

      const result = await validator.deactivateExtension(request);

      expect(result.ok).toBe(true);
      expect(result.deactivated).toBe(true);

      // Verify configuration was removed
      const config = await validator.getConfigurationWithSignoffs(
        'site-123',
        'test-ext'
      );

      expect(config).toBeUndefined();
    });

    it('should fail to deactivate non-existent extension', async () => {
      const request: DeactivateExtensionRequest = {
        siteId: 'site-123',
        extensionId: 'non-existent',
        deactivatedBy: 'user-1',
      };

      const result = await validator.deactivateExtension(request);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('Site configuration status', () => {
    it('should report status for empty site', async () => {
      const status = await validator.getSiteConfigurationStatus('empty-site');

      expect(status.siteId).toBe('empty-site');
      expect(status.totalExtensions).toBe(0);
      expect(status.validConfigurations).toBe(0);
      expect(status.requiresAttention).toBe(false);
    });

    it('should report status with activated extensions', async () => {
      // Activate two extensions
      for (let i = 1; i <= 2; i++) {
        const request: ActivateExtensionRequest = {
          siteId: 'site-123',
          extensionId: `ext-${i}`,
          version: 'v1.0.0',
          configuration: {},
          complianceSignoffs: [],
          activatedBy: 'user-1',
        };

        await validator.activateExtension(request);
      }

      const status = await validator.getSiteConfigurationStatus('site-123');

      expect(status.totalExtensions).toBe(2);
      expect(status.validConfigurations).toBe(2);
      expect(status.requiresAttention).toBe(false);
    });
  });

  describe('Query operations', () => {
    it('should query configurations by site', async () => {
      // Activate extensions at different sites
      const ext1: ActivateExtensionRequest = {
        siteId: 'site-1',
        extensionId: 'ext-1',
        version: 'v1.0.0',
        configuration: {},
        complianceSignoffs: [],
        activatedBy: 'user-1',
      };

      const ext2: ActivateExtensionRequest = {
        siteId: 'site-2',
        extensionId: 'ext-2',
        version: 'v1.0.0',
        configuration: {},
        complianceSignoffs: [],
        activatedBy: 'user-1',
      };

      await validator.activateExtension(ext1);
      await validator.activateExtension(ext2);

      // Query site-1
      const configs = await validator.queryConfigurations({ siteId: 'site-1' });

      expect(configs).toHaveLength(1);
      expect(configs[0].extensionId).toBe('ext-1');
    });

    it('should query signoffs by site and extension', async () => {
      const request: ActivateExtensionRequest = {
        siteId: 'site-123',
        extensionId: 'ext-1',
        version: 'v1.0.0',
        configuration: {},
        complianceSignoffs: [
          {
            aspect: 'aspect-1',
            signedBy: 'user-1',
            role: 'quality-focal',
          },
          {
            aspect: 'aspect-2',
            signedBy: 'user-2',
            role: 'compliance-officer',
          },
        ],
        activatedBy: 'user-1',
      };

      await validator.activateExtension(request);

      const signoffs = await validator.querySignoffs({
        siteId: 'site-123',
        extensionId: 'ext-1',
      });

      expect(signoffs).toHaveLength(2);
      expect(signoffs.map(s => s.aspect)).toContain('aspect-1');
      expect(signoffs.map(s => s.aspect)).toContain('aspect-2');
    });
  });
});
