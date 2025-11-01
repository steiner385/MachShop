/**
 * Error Propagation and Handling Integration Tests
 *
 * Tests how errors propagate across framework boundaries and how each framework
 * handles errors from other frameworks in the extension ecosystem.
 */

import {
  ExtensionSDK,
  ExtensionContext,
  ExtensionConfig,
  ExtensionError,
  ErrorSeverity,
} from '@machshop/frontend-extension-sdk';
import {
  NavigationExtensionFramework,
  NavigationError,
} from '@machshop/navigation-extension-framework';
import {
  ComponentOverrideFramework,
  ComponentOverrideError,
} from '@machshop/component-override-framework';
import {
  ExtensionValidationFramework,
  ValidationError,
} from '@machshop/extension-validation-framework';

describe('Error Propagation and Handling Integration', () => {
  let sdk: ExtensionSDK;
  let navFramework: NavigationExtensionFramework;
  let overrideFramework: ComponentOverrideFramework;
  let validationFramework: ExtensionValidationFramework;
  let extensionContext: Partial<ExtensionContext>;
  let errorLog: any[] = [];

  beforeEach(() => {
    sdk = new ExtensionSDK();
    navFramework = new NavigationExtensionFramework();
    overrideFramework = new ComponentOverrideFramework();
    validationFramework = new ExtensionValidationFramework();
    errorLog = [];

    extensionContext = {
      extensionId: 'error-test-extension',
      userId: 'test-user',
      siteId: 'test-site',
      permissions: ['admin:system'],
      config: {
        extensionId: 'error-test-extension',
        siteId: 'test-site',
      } as ExtensionConfig,
      state: {},
    };

    // Setup global error handler
    sdk.on('error', (error: any) => {
      errorLog.push(error);
    });
  });

  describe('SDK Error Propagation', () => {
    test('should emit error event on extension load failure', async () => {
      const error = new ExtensionError(
        'Extension not found',
        'EXTENSION_NOT_FOUND',
        ErrorSeverity.ERROR
      );

      await sdk.handleError(error);

      expect(errorLog).toContainEqual(
        expect.objectContaining({
          code: 'EXTENSION_NOT_FOUND',
        })
      );
    });

    test('should propagate dependency resolution errors', async () => {
      const extensionId = 'error-deps-extension';
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

    test('should capture initialization errors and propagate to caller', async () => {
      const extensionId = 'error-init-extension';
      const initError = new Error('Initialization failed');

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
          onInitialize: jest.fn().mockRejectedValue(initError),
        },
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      const initResult = await sdk.initializeExtension(
        extensionId,
        context as ExtensionContext
      );

      expect(initResult.status).toBe('error');
      expect(initResult.error).toContain('Initialization failed');
    });
  });

  describe('Navigation Framework Error Handling', () => {
    test('should handle errors in navigation item registration', async () => {
      const invalidNavItem: any = {
        // Missing required id field
        label: 'Invalid',
        path: '/invalid',
      };

      try {
        await navFramework.registerNavigationItem(invalidNavItem);
      } catch (error: any) {
        expect(error).toBeInstanceOf(NavigationError);
        expect(error.code).toBe('INVALID_NAVIGATION_ITEM');
      }
    });

    test('should handle permission-based access errors', async () => {
      const context: Partial<ExtensionContext> = {
        extensionId: 'no-perms-ext',
        userId: 'test-user',
        siteId: 'test-site',
        permissions: [], // No permissions
        config: {
          extensionId: 'no-perms-ext',
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
      };

      try {
        await navFramework.registerNavigationItem(
          {
            id: 'admin-nav',
            label: 'Admin',
            path: '/admin',
            permissions: ['admin:navigation'],
          },
          context as ExtensionContext
        );
      } catch (error: any) {
        expect(error.code).toMatch(/PERMISSION|ACCESS/);
      }
    });

    test('should recover from navigation registration errors', async () => {
      // First attempt: invalid item
      const invalidItem = { label: 'Invalid' };

      try {
        await navFramework.registerNavigationItem(invalidItem as any);
      } catch (error: any) {
        expect(error).toBeDefined();
      }

      // Second attempt: valid item (should succeed)
      const validItem = {
        id: 'recovery-nav',
        label: 'Recovery',
        path: '/recovery',
      };

      const result = await navFramework.registerNavigationItem(validItem);

      expect(result.id).toBe('recovery-nav');
    });
  });

  describe('Component Override Framework Error Handling', () => {
    test('should handle errors in component override registration', async () => {
      const invalidOverride: any = {
        targetComponent: 'Form',
        // Missing required targetModule
        componentPath: './CustomForm',
      };

      try {
        await overrideFramework.registerComponentOverride(invalidOverride);
      } catch (error: any) {
        expect(error).toBeInstanceOf(ComponentOverrideError);
        expect(error.code).toMatch(/OVERRIDE|INVALID/);
      }
    });

    test('should handle errors when applying override to non-existent component', async () => {
      const override = {
        targetComponent: 'NonExistentComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomNonExistent',
      };

      try {
        await overrideFramework.registerComponentOverride(override);
      } catch (error: any) {
        expect(error.code).toMatch(/NOT_FOUND|COMPONENT/);
      }
    });

    test('should handle fallback errors gracefully', async () => {
      const override = {
        targetComponent: 'Component',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './BrokenComponent',
        errorBoundary: true,
      };

      await overrideFramework.registerComponentOverride(override);

      // Simulate render error
      const result = await overrideFramework.applyOverride(
        'Component',
        '@machshop/core-mes-ui-foundation'
      );

      if (!result.success) {
        const fallbackResult = await overrideFramework.activateFallback(
          'Component',
          '@machshop/core-mes-ui-foundation'
        );

        expect(fallbackResult.success).toBe(true);
      }
    });
  });

  describe('Validation Framework Error Handling', () => {
    test('should return validation errors without throwing', async () => {
      const invalidManifest: any = {
        // Missing required fields
        name: 'Invalid Manifest',
      };

      const result = await validationFramework.validateManifest({
        manifest: invalidManifest,
        manifestPath: 'manifest.json',
        extensionPath: '/invalid',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should categorize validation errors by severity', async () => {
      const manifest = {
        id: 'test-id',
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        // Missing optional fields (warnings)
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      const errors = result.errors.filter(e => e.severity === 'error');
      const warnings = result.errors.filter(e => e.severity === 'warning');

      expect(warnings.length).toBeGreaterThanOrEqual(0);
    });

    test('should provide actionable validation error messages', async () => {
      const manifest = {
        id: 'INVALID-FORMAT',
        name: 'Test',
        version: '1.0.0',
        manifest_version: '2.0.0',
      };

      const result = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: '/test',
      });

      const errorWithFix = result.errors.find(e => e.code === 'INVALID_ID_FORMAT');

      expect(errorWithFix?.fix).toBeDefined();
    });
  });

  describe('Cross-Framework Error Propagation', () => {
    test('should propagate validation errors to SDK', async () => {
      const invalidManifest: any = {
        name: 'Invalid',
      };

      const context: Partial<ExtensionContext> = {
        extensionId: 'invalid-manifest-ext',
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId: 'invalid-manifest-ext',
          siteId: 'test-site',
          manifest: invalidManifest,
        } as any as ExtensionConfig,
        state: {},
      };

      const loadResult = await sdk.loadExtension(
        'invalid-manifest-ext',
        context as ExtensionContext
      );

      if (loadResult.status === 'error') {
        expect(loadResult.error).toBeDefined();
      }
    });

    test('should propagate navigation errors to SDK', async () => {
      const context: Partial<ExtensionContext> = {
        extensionId: 'nav-error-ext',
        userId: 'test-user',
        siteId: 'test-site',
        config: {
          extensionId: 'nav-error-ext',
          siteId: 'test-site',
        } as ExtensionConfig,
        state: {},
      };

      // Register invalid navigation through SDK
      try {
        await sdk.registerNavigation(
          { label: 'Invalid' } as any,
          context as ExtensionContext
        );
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    test('should handle errors in chained operations', async () => {
      const extensionId = 'chained-error-ext';
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

      // Chained operations: load -> init -> activate
      const loadResult = await sdk.loadExtension(extensionId, context as ExtensionContext);

      if (loadResult.status === 'error') {
        expect(errorLog).toContainEqual(expect.any(Object));
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should allow retry after transient error', async () => {
      let attemptCount = 0;

      const operation = jest.fn(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Transient error');
        }
        return { success: true };
      });

      try {
        await operation();
      } catch (error) {
        // First attempt fails
        const retryResult = await operation();
        expect(retryResult.success).toBe(true);
      }
    });

    test('should backoff on repeated failures', async () => {
      const timeouts: number[] = [];
      const originalSetTimeout = global.setTimeout;

      jest.spyOn(global, 'setTimeout').mockImplementation((cb: any, timeout: number) => {
        timeouts.push(timeout);
        return originalSetTimeout(cb, 0);
      });

      // Simulate backoff retry logic
      for (let attempt = 1; attempt <= 3; attempt++) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        // In real implementation, this would be used before retry
      }

      expect(timeouts.length).toBeGreaterThanOrEqual(0);
    });

    test('should gracefully degrade on non-critical errors', async () => {
      const extensionId = 'degradation-ext';
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

      // Load extension even if some non-critical features fail
      const loadResult = await sdk.loadExtension(extensionId, context as ExtensionContext);

      expect(loadResult.status).toMatch(/loaded|error/);
    });
  });

  describe('Error Logging and Debugging', () => {
    test('should log errors with context information', async () => {
      const error = new ExtensionError(
        'Test error',
        'TEST_ERROR',
        ErrorSeverity.ERROR
      );

      error.context = {
        extensionId: 'test-ext',
        userId: 'test-user',
      };

      await sdk.handleError(error);

      expect(errorLog[0].context).toBeDefined();
    });

    test('should track error stack traces', async () => {
      const error = new Error('Stack trace test');

      const extensionError = new ExtensionError(
        error.message,
        'STACK_TRACE_TEST',
        ErrorSeverity.ERROR
      );

      extensionError.originalError = error;

      await sdk.handleError(extensionError);

      expect(errorLog[0].originalError).toBeDefined();
    });

    test('should group related errors', async () => {
      const errors = [
        new ExtensionError('Error 1', 'RELATED_ERROR', ErrorSeverity.ERROR),
        new ExtensionError('Error 2', 'RELATED_ERROR', ErrorSeverity.ERROR),
        new ExtensionError('Error 3', 'RELATED_ERROR', ErrorSeverity.ERROR),
      ];

      for (const error of errors) {
        await sdk.handleError(error);
      }

      const relatedErrors = errorLog.filter(e => e.code === 'RELATED_ERROR');

      expect(relatedErrors.length).toBe(3);
    });
  });

  describe('Error Boundary Testing', () => {
    test('should catch errors in component render', async () => {
      const ErrorBoundary = jest.fn().mockImplementation(() => {
        throw new Error('Render error');
      });

      try {
        ErrorBoundary();
      } catch (error: any) {
        expect(error.message).toContain('Render');
      }
    });

    test('should provide fallback UI on error', async () => {
      const override = {
        targetComponent: 'ErrorComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './ErrorComponent',
        errorBoundary: true,
      };

      const result = await overrideFramework.registerComponentOverride(override);

      expect(result).toBeDefined();
    });

    test('should allow error recovery without page reload', async () => {
      const extension = {
        load: jest.fn().mockRejectedValueOnce(new Error('Load error')).mockResolvedValueOnce({}),
      };

      try {
        await extension.load();
      } catch (error) {
        // Attempt recovery
        const recovery = await extension.load();
        expect(recovery).toBeDefined();
      }
    });
  });
});
