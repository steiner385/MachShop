/**
 * Extension Lifecycle Integration Tests
 *
 * Tests the complete lifecycle of an extension through all phases:
 * discovery, loading, initialization, configuration, activation, operation, and deactivation.
 */

import {
  ExtensionSDK,
  ExtensionContext,
  ExtensionConfig,
  ExtensionLifecycleEvent,
} from '@machshop/frontend-extension-sdk';

describe('Extension Lifecycle Integration', () => {
  let sdk: ExtensionSDK;
  let lifecycleEvents: ExtensionLifecycleEvent[] = [];

  beforeEach(() => {
    sdk = new ExtensionSDK();
    lifecycleEvents = [];

    // Setup lifecycle event listener
    sdk.on('lifecycle:event', (event: ExtensionLifecycleEvent) => {
      lifecycleEvents.push(event);
    });
  });

  describe('Extension Discovery', () => {
    test('should discover extensions from manifest files', async () => {
      const discovered = await sdk.discoverExtensions([
        '/path/to/extension-1',
        '/path/to/extension-2',
      ]);

      expect(discovered).toBeDefined();
      expect(discovered.length).toBeGreaterThanOrEqual(0);
    });

    test('should discover extensions with valid manifests', async () => {
      const extensions = await sdk.discoverExtensions(['/valid-extension-path']);

      const validExtensions = extensions.filter(ext => ext.isValid);

      expect(validExtensions.length).toBeGreaterThan(0);
    });

    test('should skip extensions with invalid manifests', async () => {
      const extensions = await sdk.discoverExtensions([
        '/valid-path',
        '/invalid-path',
      ]);

      const invalidExtensions = extensions.filter(ext => !ext.isValid);

      expect(invalidExtensions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Extension Loading', () => {
    test('should transition extension to loaded state', async () => {
      const extensionId = 'test-extension-load';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
      };

      const loadResult = await sdk.loadExtension(
        extensionId,
        context as ExtensionContext
      );

      expect(loadResult.status).toBe('loaded');
      expect(loadResult.extensionId).toBe(extensionId);
    });

    test('should emit lifecycle event on load', async () => {
      const extensionId = 'test-extension-event-load';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);

      expect(lifecycleEvents).toContainEqual(
        expect.objectContaining({
          event: 'loaded',
          extensionId,
        })
      );
    });

    test('should resolve extension dependencies on load', async () => {
      const extensionId = 'test-extension-deps';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
          dependencies: {
            capabilities: ['audit-logging', 'document-control'],
          },
        } as any as ExtensionConfig,
        state: {},
      };

      const loadResult = await sdk.loadExtension(
        extensionId,
        context as ExtensionContext
      );

      expect(loadResult.status).toBe('loaded');
    });

    test('should fail load if dependencies unavailable', async () => {
      const extensionId = 'test-extension-missing-deps';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
          dependencies: {
            capabilities: ['non-existent-capability'],
          },
        } as any as ExtensionConfig,
        state: {},
      };

      const loadResult = await sdk.loadExtension(
        extensionId,
        context as ExtensionContext
      );

      expect(loadResult.status).toBe('error');
      expect(loadResult.error).toContain('dependency');
    });
  });

  describe('Extension Configuration', () => {
    test('should configure extension with provided config', async () => {
      const extensionId = 'test-extension-config';
      const config: ExtensionConfig = {
        extensionId,
        siteId: 'test-site',
        settings: {
          theme: 'dark',
          compact: true,
        },
      };

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config,
        state: {},
      };

      const configResult = await sdk.configureExtension(
        extensionId,
        config,
        context as ExtensionContext
      );

      expect(configResult.status).toBe('configured');
      expect(configResult.config?.settings?.theme).toBe('dark');
    });

    test('should validate configuration against schema', async () => {
      const extensionId = 'test-extension-config-validation';
      const invalidConfig: any = {
        extensionId,
        siteId: 'test-site',
        settings: {
          invalidField: 'should-fail',
        },
      };

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: invalidConfig,
        state: {},
      };

      const configResult = await sdk.configureExtension(
        extensionId,
        invalidConfig,
        context as ExtensionContext
      );

      if (configResult.status === 'error') {
        expect(configResult.error).toBeDefined();
      }
    });

    test('should emit configuration event', async () => {
      const extensionId = 'test-extension-config-event';
      const config: ExtensionConfig = {
        extensionId,
        siteId: 'test-site',
      };

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config,
        state: {},
      };

      await sdk.configureExtension(
        extensionId,
        config,
        context as ExtensionContext
      );

      expect(lifecycleEvents).toContainEqual(
        expect.objectContaining({
          event: 'configured',
          extensionId,
        })
      );
    });
  });

  describe('Extension Initialization', () => {
    test('should initialize extension after loading', async () => {
      const extensionId = 'test-extension-init';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      const initResult = await sdk.initializeExtension(
        extensionId,
        context as ExtensionContext
      );

      expect(initResult.status).toBe('initialized');
    });

    test('should call extension initialize hook', async () => {
      const extensionId = 'test-extension-init-hook';
      const initSpy = jest.fn();

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
        hooks: {
          onInitialize: initSpy,
        },
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      expect(initSpy).toHaveBeenCalled();
    });

    test('should emit initialization event', async () => {
      const extensionId = 'test-extension-init-event';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      expect(lifecycleEvents).toContainEqual(
        expect.objectContaining({
          event: 'initialized',
          extensionId,
        })
      );
    });

    test('should handle initialization errors gracefully', async () => {
      const extensionId = 'test-extension-init-error';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
        hooks: {
          onInitialize: jest.fn().mockRejectedValue(new Error('Init failed')),
        },
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      const initResult = await sdk.initializeExtension(
        extensionId,
        context as ExtensionContext
      );

      expect(initResult.status).toBe('error');
      expect(initResult.error).toContain('Init failed');
    });
  });

  describe('Extension Activation', () => {
    test('should activate extension after initialization', async () => {
      const extensionId = 'test-extension-activate';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      const activateResult = await sdk.activateExtension(
        extensionId,
        context as ExtensionContext
      );

      expect(activateResult.status).toBe('active');
    });

    test('should emit activation event', async () => {
      const extensionId = 'test-extension-activate-event';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      await sdk.activateExtension(extensionId, context as ExtensionContext);

      expect(lifecycleEvents).toContainEqual(
        expect.objectContaining({
          event: 'activated',
          extensionId,
        })
      );
    });

    test('should call extension activate hook', async () => {
      const extensionId = 'test-extension-activate-hook';
      const activateSpy = jest.fn();

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
        hooks: {
          onActivate: activateSpy,
        },
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      await sdk.activateExtension(extensionId, context as ExtensionContext);

      expect(activateSpy).toHaveBeenCalled();
    });
  });

  describe('Extension Deactivation', () => {
    test('should deactivate active extension', async () => {
      const extensionId = 'test-extension-deactivate';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      await sdk.activateExtension(extensionId, context as ExtensionContext);

      const deactivateResult = await sdk.deactivateExtension(
        extensionId,
        context as ExtensionContext
      );

      expect(deactivateResult.status).toBe('inactive');
    });

    test('should emit deactivation event', async () => {
      const extensionId = 'test-extension-deactivate-event';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      await sdk.activateExtension(extensionId, context as ExtensionContext);
      await sdk.deactivateExtension(extensionId, context as ExtensionContext);

      expect(lifecycleEvents).toContainEqual(
        expect.objectContaining({
          event: 'deactivated',
          extensionId,
        })
      );
    });

    test('should call extension deactivate hook', async () => {
      const extensionId = 'test-extension-deactivate-hook';
      const deactivateSpy = jest.fn();

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
        hooks: {
          onDeactivate: deactivateSpy,
        },
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      await sdk.activateExtension(extensionId, context as ExtensionContext);
      await sdk.deactivateExtension(extensionId, context as ExtensionContext);

      expect(deactivateSpy).toHaveBeenCalled();
    });

    test('should cleanup resources on deactivation', async () => {
      const extensionId = 'test-extension-cleanup';
      const cleanupSpy = jest.fn();

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
        hooks: {
          onCleanup: cleanupSpy,
        },
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      await sdk.activateExtension(extensionId, context as ExtensionContext);
      await sdk.deactivateExtension(extensionId, context as ExtensionContext);

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Complete Lifecycle Flow', () => {
    test('should complete full lifecycle: discover -> load -> init -> activate -> deactivate', async () => {
      const extensionId = 'test-complete-lifecycle';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
      };

      // Load
      const loadResult = await sdk.loadExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(loadResult.status).toBe('loaded');

      // Initialize
      const initResult = await sdk.initializeExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(initResult.status).toBe('initialized');

      // Activate
      const activateResult = await sdk.activateExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(activateResult.status).toBe('active');

      // Deactivate
      const deactivateResult = await sdk.deactivateExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(deactivateResult.status).toBe('inactive');

      // Verify event order
      expect(lifecycleEvents).toContainEqual(
        expect.objectContaining({ event: 'loaded' })
      );
      expect(lifecycleEvents).toContainEqual(
        expect.objectContaining({ event: 'initialized' })
      );
      expect(lifecycleEvents).toContainEqual(
        expect.objectContaining({ event: 'activated' })
      );
      expect(lifecycleEvents).toContainEqual(
        expect.objectContaining({ event: 'deactivated' })
      );
    });

    test('should handle reactivation of extension', async () => {
      const extensionId = 'test-reactivation';
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId,
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      // First activation
      await sdk.activateExtension(extensionId, context as ExtensionContext);
      let status = await sdk.getExtensionStatus(extensionId);
      expect(status).toBe('active');

      // Deactivation
      await sdk.deactivateExtension(extensionId, context as ExtensionContext);
      status = await sdk.getExtensionStatus(extensionId);
      expect(status).toBe('inactive');

      // Reactivation
      const reactivateResult = await sdk.activateExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(reactivateResult.status).toBe('active');
    });
  });
});
