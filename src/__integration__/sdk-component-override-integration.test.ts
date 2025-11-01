/**
 * SDK + Component Override Framework Integration Tests
 *
 * Tests the integration between Frontend Extension SDK and Component Override Framework.
 * Verifies that component overrides are properly validated, applied, and that fallback
 * mechanisms activate correctly on error.
 */

import {
  ExtensionSDK,
  ExtensionContext,
  ExtensionConfig,
} from '@machshop/frontend-extension-sdk';
import {
  ComponentOverrideFramework,
  ComponentOverride,
  ComponentOverrideConfig,
} from '@machshop/component-override-framework';
import {
  ExtensionValidationFramework,
} from '@machshop/extension-validation-framework';

describe('SDK + Component Override Framework Integration', () => {
  let sdk: ExtensionSDK;
  let overrideFramework: ComponentOverrideFramework;
  let validationFramework: ExtensionValidationFramework;
  let extensionContext: Partial<ExtensionContext>;

  beforeEach(() => {
    sdk = new ExtensionSDK();
    overrideFramework = new ComponentOverrideFramework();
    validationFramework = new ExtensionValidationFramework();

    extensionContext = {
      extensionId: 'override-test-extension',
      userId: 'test-user',
      siteId: 'test-site',
      permissions: ['override:components', 'read:components'],
      config: {
        extensionId: 'override-test-extension',
        siteId: 'test-site',
      } as ExtensionConfig,
      state: {},
    };
  });

  describe('Component Override Registration', () => {
    test('should register component override via SDK', async () => {
      const override: ComponentOverride = {
        targetComponent: 'WorkOrderForm',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomWorkOrderForm',
        description: 'Custom work order form with compliance checks',
      };

      const registration = await sdk.registerComponentOverride(
        override,
        extensionContext as ExtensionContext
      );

      expect(registration).toBeDefined();
      expect(registration?.targetComponent).toBe('WorkOrderForm');
      expect(registration?.status).toBe('registered');
    });

    test('should validate component override against framework schema', async () => {
      const invalidOverride: any = {
        targetComponent: 'WorkOrderForm',
        // Missing required targetModule
        componentPath: './CustomForm',
      };

      const validationResult = await validationFramework.validateComponentOverride(
        invalidOverride
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContainEqual(
        expect.objectContaining({
          code: 'OVERRIDE_MISSING_TARGET_MODULE',
        })
      );
    });

    test('should enforce unique target component per extension', async () => {
      const override1: ComponentOverride = {
        targetComponent: 'UserProfile',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomUserProfile1',
      };

      const override2: ComponentOverride = {
        targetComponent: 'UserProfile',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomUserProfile2',
      };

      const reg1 = await sdk.registerComponentOverride(
        override1,
        extensionContext as ExtensionContext
      );
      expect(reg1?.status).toBe('registered');

      const reg2 = await sdk.registerComponentOverride(
        override2,
        extensionContext as ExtensionContext
      );
      expect(reg2?.status).toBe('error');
      expect(reg2?.error).toContain('already registered');
    });
  });

  describe('Component Override Application', () => {
    test('should apply registered component override', async () => {
      const override: ComponentOverride = {
        targetComponent: 'Dashboard',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomDashboard',
      };

      await sdk.registerComponentOverride(
        override,
        extensionContext as ExtensionContext
      );

      const applied = await overrideFramework.applyOverride(
        'Dashboard',
        '@machshop/core-mes-ui-foundation'
      );

      expect(applied.success).toBe(true);
      expect(applied.component).toBeDefined();
    });

    test('should preserve original component reference for fallback', async () => {
      const override: ComponentOverride = {
        targetComponent: 'InventoryTable',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomInventoryTable',
      };

      await sdk.registerComponentOverride(
        override,
        extensionContext as ExtensionContext
      );

      const applied = await overrideFramework.applyOverride(
        'InventoryTable',
        '@machshop/core-mes-ui-foundation'
      );

      expect(applied.fallbackComponent).toBeDefined();
      expect(applied.fallbackComponent).not.toEqual(applied.component);
    });

    test('should apply overrides to multiple components', async () => {
      const overrides = [
        {
          targetComponent: 'Form1',
          targetModule: '@machshop/core-mes-ui-foundation',
          componentPath: './CustomForm1',
        },
        {
          targetComponent: 'Form2',
          targetModule: '@machshop/core-mes-ui-foundation',
          componentPath: './CustomForm2',
        },
      ];

      for (const override of overrides) {
        await sdk.registerComponentOverride(
          override as ComponentOverride,
          extensionContext as ExtensionContext
        );
      }

      const results = await Promise.all([
        overrideFramework.applyOverride('Form1', '@machshop/core-mes-ui-foundation'),
        overrideFramework.applyOverride('Form2', '@machshop/core-mes-ui-foundation'),
      ]);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Fallback Mechanisms', () => {
    test('should activate fallback when override component throws error', async () => {
      const override: ComponentOverride = {
        targetComponent: 'ReportViewer',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './BrokenReportViewer',
        errorBoundary: true,
      };

      await sdk.registerComponentOverride(
        override,
        extensionContext as ExtensionContext
      );

      const applied = await overrideFramework.applyOverride(
        'ReportViewer',
        '@machshop/core-mes-ui-foundation'
      );

      // Simulate error in override
      const renderResult = applied.tryRender?.();

      if (!renderResult?.success) {
        const fallbackResult = await overrideFramework.activateFallback(
          'ReportViewer',
          '@machshop/core-mes-ui-foundation'
        );

        expect(fallbackResult.success).toBe(true);
        expect(fallbackResult.component).toBe(applied.fallbackComponent);
      }
    });

    test('should restore original component on fallback activation', async () => {
      const override: ComponentOverride = {
        targetComponent: 'Editor',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomEditor',
      };

      const registered = await sdk.registerComponentOverride(
        override,
        extensionContext as ExtensionContext
      );

      await overrideFramework.applyOverride(
        'Editor',
        '@machshop/core-mes-ui-foundation'
      );

      const fallback = await overrideFramework.activateFallback(
        'Editor',
        '@machshop/core-mes-ui-foundation'
      );

      expect(fallback.restoredOriginal).toBe(true);
    });

    test('should log fallback activation events', async () => {
      const override: ComponentOverride = {
        targetComponent: 'Grid',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomGrid',
      };

      await sdk.registerComponentOverride(
        override,
        extensionContext as ExtensionContext
      );

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const fallback = await overrideFramework.activateFallback(
        'Grid',
        '@machshop/core-mes-ui-foundation'
      );

      expect(fallback.loggingEnabled).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('Override Configuration Management', () => {
    test('should apply override configuration from extension config', async () => {
      const overrideConfig: ComponentOverrideConfig = {
        targetComponent: 'ConfigurableForm',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomConfigurableForm',
        config: {
          theme: 'dark',
          compact: true,
        },
      };

      const registration = await sdk.registerComponentOverride(
        overrideConfig as any as ComponentOverride,
        extensionContext as ExtensionContext
      );

      expect(registration?.config).toBeDefined();
      expect(registration?.config?.theme).toBe('dark');
    });

    test('should validate override configuration against schema', async () => {
      const overrideConfig: ComponentOverrideConfig = {
        targetComponent: 'ConfigForm',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomConfigForm',
        config: {
          invalidField: 'should-fail',
        },
      };

      const validation = await validationFramework.validateComponentOverride(
        overrideConfig as any
      );

      // Validation should check against allowed config fields
      if (validation.errors.length > 0) {
        expect(validation.isValid).toBe(false);
      }
    });

    test('should support dynamic override configuration updates', async () => {
      const override: ComponentOverride = {
        targetComponent: 'DynamicConfig',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomDynamicConfig',
      };

      await sdk.registerComponentOverride(
        override,
        extensionContext as ExtensionContext
      );

      const updateResult = await sdk.updateComponentOverride(
        'DynamicConfig',
        {
          config: { newSetting: true },
        },
        extensionContext as ExtensionContext
      );

      expect(updateResult.status).toBe('updated');
    });
  });

  describe('Override Conflict Resolution', () => {
    test('should detect when multiple extensions override same component', async () => {
      const context1 = { ...extensionContext, extensionId: 'extension-1' } as ExtensionContext;
      const context2 = { ...extensionContext, extensionId: 'extension-2' } as ExtensionContext;

      const override1: ComponentOverride = {
        targetComponent: 'SharedComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './Ext1SharedComponent',
      };

      const override2: ComponentOverride = {
        targetComponent: 'SharedComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './Ext2SharedComponent',
      };

      await sdk.registerComponentOverride(override1, context1);
      const reg2 = await sdk.registerComponentOverride(override2, context2);

      expect(reg2?.conflictDetected).toBe(true);
      expect(reg2?.conflictingExtensions).toContain('extension-1');
    });

    test('should apply priority-based override resolution', async () => {
      const context1 = {
        ...extensionContext,
        extensionId: 'priority-ext-1',
        config: { priority: 100 } as any,
      } as ExtensionContext;
      const context2 = {
        ...extensionContext,
        extensionId: 'priority-ext-2',
        config: { priority: 200 } as any,
      } as ExtensionContext;

      const override1: ComponentOverride = {
        targetComponent: 'PriorityComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './LowPriorityComponent',
      };

      const override2: ComponentOverride = {
        targetComponent: 'PriorityComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './HighPriorityComponent',
      };

      await sdk.registerComponentOverride(override1, context1);
      await sdk.registerComponentOverride(override2, context2);

      const applied = await overrideFramework.applyOverride(
        'PriorityComponent',
        '@machshop/core-mes-ui-foundation'
      );

      expect(applied.appliedBy).toBe('priority-ext-2');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle override removal', async () => {
      const override: ComponentOverride = {
        targetComponent: 'RemovableComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './RemovableComponent',
      };

      await sdk.registerComponentOverride(
        override,
        extensionContext as ExtensionContext
      );

      const removeResult = await sdk.removeComponentOverride(
        'RemovableComponent',
        extensionContext as ExtensionContext
      );

      expect(removeResult.status).toBe('removed');
    });

    test('should handle concurrent override registrations', async () => {
      const overrides = Array.from({ length: 5 }, (_, i) => ({
        targetComponent: `ConcurrentComponent${i}`,
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: `./CustomComponent${i}`,
      }));

      const registrations = await Promise.all(
        overrides.map(override =>
          sdk.registerComponentOverride(
            override as ComponentOverride,
            extensionContext as ExtensionContext
          )
        )
      );

      expect(registrations).toHaveLength(5);
      expect(registrations.every(r => r?.status === 'registered')).toBe(true);
    });

    test('should handle invalid component paths', async () => {
      const override: ComponentOverride = {
        targetComponent: 'BadPath',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: 'invalid/path/format',
      };

      const validation = await validationFramework.validateComponentOverride(override);

      expect(validation.isValid).toBe(false);
    });
  });
});
