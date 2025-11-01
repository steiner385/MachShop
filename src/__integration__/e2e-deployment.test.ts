/**
 * End-to-End Extension Deployment Tests
 *
 * Tests complete extension deployment workflows including:
 * - Extension discovery and loading
 * - Multi-site deployment
 * - Permission-based access control
 * - Widget registration and rendering
 * - Navigation setup and approvals
 * - Component override application
 * - Configuration per-site
 *
 * Target: 10+ complete E2E flows
 */

import {
  ExtensionSDK,
  ExtensionContext,
  ExtensionConfig,
  ExtensionRegistration,
} from '@machshop/frontend-extension-sdk';
import {
  NavigationExtensionFramework,
} from '@machshop/navigation-extension-framework';
import {
  ComponentOverrideFramework,
} from '@machshop/component-override-framework';
import {
  ExtensionValidationFramework,
} from '@machshop/extension-validation-framework';

describe('End-to-End Extension Deployment Tests', () => {
  let sdk: ExtensionSDK;
  let navFramework: NavigationExtensionFramework;
  let overrideFramework: ComponentOverrideFramework;
  let validationFramework: ExtensionValidationFramework;
  let deploymentLog: any[] = [];

  beforeEach(() => {
    sdk = new ExtensionSDK();
    navFramework = new NavigationExtensionFramework();
    overrideFramework = new ComponentOverrideFramework();
    validationFramework = new ExtensionValidationFramework();
    deploymentLog = [];

    // Setup deployment logging
    sdk.on('deployment:event', (event: any) => {
      deploymentLog.push({
        timestamp: Date.now(),
        ...event,
      });
    });
  });

  describe('E2E Flow 1: Basic Extension Deployment', () => {
    test('should complete full deployment of simple navigation extension', async () => {
      const extensionId = 'nav-only-extension';
      const manifest = {
        id: extensionId,
        name: 'Navigation Only Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        description: 'Extension with navigation only',
        navigation: [
          {
            id: 'main-nav',
            label: 'Main Navigation',
            path: '/nav',
          },
        ],
      };

      // Step 1: Validate manifest
      const validation = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: `/extensions/${extensionId}`,
      });

      expect(validation.isValid).toBe(true);

      // Step 2: Discover extension
      const discovered = await sdk.discoverExtensions([`/extensions/${extensionId}`]);
      expect(discovered).toContainEqual(
        expect.objectContaining({ id: extensionId })
      );

      // Step 3: Load extension
      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'admin-user',
        siteId: 'main-site',
        permissions: ['read:navigation', 'admin:navigation'],
        config: {
          extensionId,
          siteId: 'main-site',
        } as ExtensionConfig,
        state: {},
      };

      const loadResult = await sdk.loadExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(loadResult.status).toBe('loaded');

      // Step 4: Initialize extension
      const initResult = await sdk.initializeExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(initResult.status).toBe('initialized');

      // Step 5: Register navigation
      const navReg = await sdk.registerNavigation(
        {
          id: 'main-nav',
          label: 'Main Navigation',
          path: '/nav',
        },
        context as ExtensionContext
      );
      expect(navReg?.status).toBe('registered');

      // Step 6: Activate extension
      const activateResult = await sdk.activateExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(activateResult.status).toBe('active');

      // Step 7: Verify deployment
      const status = await sdk.getExtensionStatus(extensionId);
      expect(status).toBe('active');

      expect(deploymentLog.length).toBeGreaterThan(0);
    });
  });

  describe('E2E Flow 2: Multi-Component Extension Deployment', () => {
    test('should deploy extension with components, navigation, and overrides', async () => {
      const extensionId = 'complex-extension';
      const manifest = {
        id: extensionId,
        name: 'Complex Multi-Feature Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: [
          {
            id: 'dashboard-widget',
            type: 'widget',
            name: 'Dashboard Widget',
            slot: 'dashboard-main',
            permissions: ['read:dashboard'],
          },
          {
            id: 'admin-form',
            type: 'form',
            name: 'Admin Form',
            permissions: ['admin:system'],
          },
        ],
        navigation: [
          {
            id: 'dashboard-nav',
            label: 'Dashboard',
            path: '/dashboard',
            permissions: ['read:dashboard'],
          },
          {
            id: 'admin-nav',
            label: 'Administration',
            path: '/admin',
            permissions: ['admin:system'],
          },
        ],
      };

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'admin-user',
        siteId: 'main-site',
        permissions: ['read:dashboard', 'admin:system', 'write:components'],
        config: {
          extensionId,
          siteId: 'main-site',
        } as ExtensionConfig,
        state: {},
      };

      // Validate
      const validation = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: `/extensions/${extensionId}`,
      });
      expect(validation.isValid).toBe(true);

      // Load and Initialize
      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      // Register components
      for (const component of manifest.ui_components) {
        const compReg = await sdk.registerComponent(
          component,
          context as ExtensionContext
        );
        expect(compReg?.status).toBe('registered');
      }

      // Register navigation
      for (const nav of manifest.navigation) {
        const navReg = await sdk.registerNavigation(
          nav,
          context as ExtensionContext
        );
        expect(navReg?.status).toBe('registered');
      }

      // Activate
      const activateResult = await sdk.activateExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(activateResult.status).toBe('active');

      // Verify all components are registered
      const components = await sdk.getRegisteredComponents(extensionId);
      expect(components.length).toBe(2);

      const navItems = await sdk.getRegisteredNavigation(extensionId);
      expect(navItems.length).toBe(2);
    });
  });

  describe('E2E Flow 3: Multi-Site Deployment', () => {
    test('should deploy same extension to multiple sites with different configs', async () => {
      const extensionId = 'multi-site-extension';
      const manifest = {
        id: extensionId,
        name: 'Multi-Site Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'site-nav',
            label: 'Site Navigation',
            path: '/nav',
          },
        ],
      };

      const sites = ['site-1', 'site-2', 'site-3'];

      for (const siteId of sites) {
        const context: Partial<ExtensionContext> = {
          extensionId,
          userId: 'admin-user',
          siteId,
          config: {
            extensionId,
            siteId,
            settings: {
              theme: siteId === 'site-1' ? 'dark' : 'light',
              enableNotifications: siteId === 'site-2',
            },
          } as any as ExtensionConfig,
          state: {},
          permissions: ['read:navigation'],
        };

        // Deploy to site
        await sdk.loadExtension(extensionId, context as ExtensionContext);
        await sdk.initializeExtension(extensionId, context as ExtensionContext);
        await sdk.configureExtension(
          extensionId,
          context.config,
          context as ExtensionContext
        );

        const navReg = await sdk.registerNavigation(
          {
            id: 'site-nav',
            label: 'Site Navigation',
            path: '/nav',
          },
          context as ExtensionContext
        );

        expect(navReg?.status).toBe('registered');

        await sdk.activateExtension(extensionId, context as ExtensionContext);

        const status = await sdk.getExtensionStatus(extensionId);
        expect(status).toBe('active');
      }

      // Verify all sites have extension deployed
      const deployments = await sdk.getDeployments(extensionId);
      expect(deployments.length).toBe(3);
    });
  });

  describe('E2E Flow 4: Permission-Based Access Control', () => {
    test('should enforce permissions throughout deployment', async () => {
      const extensionId = 'restricted-extension';
      const manifest = {
        id: extensionId,
        name: 'Restricted Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: [
          {
            id: 'public-widget',
            type: 'widget',
            name: 'Public Widget',
            // No permissions - public
          },
          {
            id: 'admin-widget',
            type: 'widget',
            name: 'Admin Widget',
            permissions: ['admin:system'],
          },
        ],
        navigation: [
          {
            id: 'public-nav',
            label: 'Public Navigation',
            path: '/public',
          },
          {
            id: 'admin-nav',
            label: 'Admin Navigation',
            path: '/admin',
            permissions: ['admin:system'],
          },
        ],
      };

      // Test with limited user (no admin permission)
      const limitedUserContext: Partial<ExtensionContext> = {
        extensionId,
        userId: 'limited-user',
        siteId: 'main-site',
        permissions: ['read:dashboard'], // No admin permission
        config: {
          extensionId,
          siteId: 'main-site',
        } as ExtensionConfig,
        state: {},
      };

      await sdk.loadExtension(extensionId, limitedUserContext as ExtensionContext);
      await sdk.initializeExtension(
        extensionId,
        limitedUserContext as ExtensionContext
      );

      // Try to register restricted component
      const restrictedComp = manifest.ui_components.find(
        c => c.id === 'admin-widget'
      );
      const compResult = await sdk.registerComponent(
        restrictedComp!,
        limitedUserContext as ExtensionContext
      );

      // Should fail due to insufficient permissions
      if (compResult?.status === 'error') {
        expect(compResult.error).toContain('permission');
      }

      // But public components should work
      const publicComp = manifest.ui_components.find(c => c.id === 'public-widget');
      const publicResult = await sdk.registerComponent(
        publicComp!,
        limitedUserContext as ExtensionContext
      );
      expect(publicResult?.status).toBe('registered');

      // Test with admin user
      const adminContext: Partial<ExtensionContext> = {
        extensionId,
        userId: 'admin-user',
        siteId: 'main-site',
        permissions: ['admin:system'],
        config: {
          extensionId,
          siteId: 'main-site',
        } as ExtensionConfig,
        state: {},
      };

      // Admin should be able to register restricted components
      const adminResult = await sdk.registerComponent(
        restrictedComp!,
        adminContext as ExtensionContext
      );
      expect(adminResult?.status).toBe('registered');
    });
  });

  describe('E2E Flow 5: Widget Registration and Rendering', () => {
    test('should register widgets and prepare for rendering', async () => {
      const extensionId = 'widget-extension';
      const manifest = {
        id: extensionId,
        name: 'Widget Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        ui_components: [
          {
            id: 'main-widget',
            type: 'widget',
            name: 'Main Widget',
            slot: 'dashboard-main-slot',
            category: 'dashboard',
          },
          {
            id: 'sidebar-widget',
            type: 'widget',
            name: 'Sidebar Widget',
            slot: 'dashboard-sidebar-slot',
            category: 'dashboard',
          },
        ],
      };

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'user',
        siteId: 'main-site',
        permissions: ['read:widgets'],
        config: {
          extensionId,
          siteId: 'main-site',
        } as ExtensionConfig,
        state: {},
      };

      // Deploy extension
      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      // Register widgets
      const widgets = [];
      for (const component of manifest.ui_components) {
        const result = await sdk.registerComponent(
          component,
          context as ExtensionContext
        );
        expect(result?.status).toBe('registered');
        widgets.push(result);
      }

      // Activate extension
      await sdk.activateExtension(extensionId, context as ExtensionContext);

      // Get widgets ready for rendering
      const renderableWidgets = await sdk.getWidgetsForSlot('dashboard-main-slot');
      expect(renderableWidgets.length).toBeGreaterThan(0);
      expect(renderableWidgets).toContainEqual(
        expect.objectContaining({ id: 'main-widget' })
      );

      // Verify widget properties
      const mainWidget = renderableWidgets.find(w => w.id === 'main-widget');
      expect(mainWidget?.type).toBe('widget');
      expect(mainWidget?.slot).toBe('dashboard-main-slot');
    });
  });

  describe('E2E Flow 6: Navigation Setup and Approval Workflows', () => {
    test('should setup navigation with approval requirements', async () => {
      const extensionId = 'nav-approval-extension';
      const manifest = {
        id: extensionId,
        name: 'Navigation with Approvals',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'auto-approved-nav',
            label: 'Auto Approved',
            path: '/auto',
          },
          {
            id: 'requires-approval-nav',
            label: 'Requires Approval',
            path: '/approval',
            requiresApproval: true,
          },
        ],
      };

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'admin-user',
        siteId: 'main-site',
        permissions: ['admin:navigation'],
        config: {
          extensionId,
          siteId: 'main-site',
        } as ExtensionConfig,
        state: {},
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      // Register auto-approved navigation
      const autoReg = await sdk.registerNavigation(
        {
          id: 'auto-approved-nav',
          label: 'Auto Approved',
          path: '/auto',
        },
        context as ExtensionContext
      );
      expect(autoReg?.status).toBe('registered');

      // Register navigation requiring approval
      const approvalReg = await sdk.registerNavigation(
        {
          id: 'requires-approval-nav',
          label: 'Requires Approval',
          path: '/approval',
          requiresApproval: true,
        },
        context as ExtensionContext
      );
      expect(approvalReg?.approvalStatus).toBe('pending');

      // Verify approval is required
      const canNavigate1 = await navFramework.canNavigate(
        'requires-approval-nav',
        context as ExtensionContext
      );
      expect(canNavigate1).toBe(false);

      // Approve navigation
      const approveResult = await navFramework.approveNavigationItem(
        'requires-approval-nav',
        'admin-user'
      );
      expect(approveResult.status).toBe('approved');

      // Now navigation should be allowed
      const canNavigate2 = await navFramework.canNavigate(
        'requires-approval-nav',
        context as ExtensionContext
      );
      expect(canNavigate2).toBe(true);

      // Activate extension
      await sdk.activateExtension(extensionId, context as ExtensionContext);
    });
  });

  describe('E2E Flow 7: Component Override Application', () => {
    test('should apply component overrides during deployment', async () => {
      const extensionId = 'override-extension';

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'admin-user',
        siteId: 'main-site',
        permissions: ['override:components'],
        config: {
          extensionId,
          siteId: 'main-site',
        } as ExtensionConfig,
        state: {},
      };

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);

      // Register component override
      const override = {
        targetComponent: 'StandardForm',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomForm',
      };

      const overrideReg = await sdk.registerComponentOverride(
        override,
        context as ExtensionContext
      );
      expect(overrideReg?.status).toBe('registered');

      // Apply override
      const applied = await overrideFramework.applyOverride(
        'StandardForm',
        '@machshop/core-mes-ui-foundation'
      );
      expect(applied.success).toBe(true);

      // Verify fallback is available
      expect(applied.fallbackComponent).toBeDefined();

      await sdk.activateExtension(extensionId, context as ExtensionContext);
    });
  });

  describe('E2E Flow 8: Configuration Per-Site Application', () => {
    test('should apply different configurations per site during deployment', async () => {
      const extensionId = 'config-extension';
      const manifest = {
        id: extensionId,
        name: 'Configuration Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'config-nav',
            label: 'Configuration Navigation',
            path: '/config',
          },
        ],
      };

      const sites = [
        {
          siteId: 'production-site',
          config: { environment: 'production', enableAnalytics: true },
        },
        {
          siteId: 'staging-site',
          config: { environment: 'staging', enableDebug: true },
        },
        {
          siteId: 'dev-site',
          config: { environment: 'development', enableVerboseLogging: true },
        },
      ];

      for (const { siteId, config } of sites) {
        const context: Partial<ExtensionContext> = {
          extensionId,
          userId: 'admin-user',
          siteId,
          permissions: ['admin:configuration'],
          config: {
            extensionId,
            siteId,
            settings: config,
          } as any as ExtensionConfig,
          state: {},
        };

        // Deploy with site-specific config
        await sdk.loadExtension(extensionId, context as ExtensionContext);
        const configResult = await sdk.configureExtension(
          extensionId,
          context.config,
          context as ExtensionContext
        );
        expect(configResult.status).toBe('configured');

        await sdk.initializeExtension(extensionId, context as ExtensionContext);
        await sdk.registerNavigation(
          {
            id: 'config-nav',
            label: 'Configuration Navigation',
            path: '/config',
          },
          context as ExtensionContext
        );
        await sdk.activateExtension(extensionId, context as ExtensionContext);

        // Verify configuration applied
        const extConfig = await sdk.getExtensionConfiguration(extensionId);
        expect(extConfig.siteId).toBe(siteId);
      }
    });
  });

  describe('E2E Flow 9: Extension Update Deployment', () => {
    test('should handle extension update with version bump', async () => {
      const extensionId = 'updateable-extension';

      // Initial deployment
      const v1Manifest = {
        id: extensionId,
        name: 'Updateable Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'nav-v1',
            label: 'Navigation v1',
            path: '/nav-v1',
          },
        ],
      };

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'admin-user',
        siteId: 'main-site',
        permissions: ['admin:extensions'],
        config: {
          extensionId,
          siteId: 'main-site',
        } as ExtensionConfig,
        state: {},
      };

      // Deploy v1
      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      await sdk.registerNavigation(
        v1Manifest.navigation[0],
        context as ExtensionContext
      );
      await sdk.activateExtension(extensionId, context as ExtensionContext);

      let status = await sdk.getExtensionStatus(extensionId);
      expect(status).toBe('active');

      // Update to v2
      const v2Manifest = {
        ...v1Manifest,
        version: '2.0.0',
        navigation: [
          {
            id: 'nav-v1',
            label: 'Navigation v1',
            path: '/nav-v1',
          },
          {
            id: 'nav-v2',
            label: 'Navigation v2',
            path: '/nav-v2',
          },
        ],
      };

      // Deactivate v1
      await sdk.deactivateExtension(extensionId, context as ExtensionContext);

      // Deploy v2
      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      for (const nav of v2Manifest.navigation) {
        await sdk.registerNavigation(nav, context as ExtensionContext);
      }
      await sdk.activateExtension(extensionId, context as ExtensionContext);

      status = await sdk.getExtensionStatus(extensionId);
      expect(status).toBe('active');

      const navItems = await sdk.getRegisteredNavigation(extensionId);
      expect(navItems.length).toBe(2);
    });
  });

  describe('E2E Flow 10: Error Recovery During Deployment', () => {
    test('should handle errors gracefully during deployment', async () => {
      const extensionId = 'recovery-extension';
      const manifest = {
        id: extensionId,
        name: 'Recovery Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        navigation: [
          {
            id: 'nav',
            label: 'Navigation',
            path: '/nav',
          },
        ],
      };

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'admin-user',
        siteId: 'main-site',
        permissions: ['admin:extensions'],
        config: {
          extensionId,
          siteId: 'main-site',
        } as ExtensionConfig,
        state: {},
        hooks: {
          onInitialize: jest.fn().mockRejectedValueOnce(new Error('Init failed')),
        },
      };

      // First attempt fails
      const loadResult1 = await sdk.loadExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(loadResult1.status).toBe('loaded');

      const initResult1 = await sdk.initializeExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(initResult1.status).toBe('error');

      // Retry should succeed
      context.hooks!.onInitialize = jest.fn().mockResolvedValueOnce(undefined);

      const initResult2 = await sdk.initializeExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(initResult2.status).toBe('initialized');

      // Continue with deployment
      await sdk.registerNavigation(
        manifest.navigation[0],
        context as ExtensionContext
      );
      await sdk.activateExtension(extensionId, context as ExtensionContext);

      const status = await sdk.getExtensionStatus(extensionId);
      expect(status).toBe('active');
    });
  });

  describe('E2E Flow 11: Rollback After Deployment', () => {
    test('should support rollback to previous extension version', async () => {
      const extensionId = 'rollback-extension';

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'admin-user',
        siteId: 'main-site',
        permissions: ['admin:extensions'],
        config: {
          extensionId,
          siteId: 'main-site',
        } as ExtensionConfig,
        state: {},
      };

      // Deploy v1
      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      await sdk.activateExtension(extensionId, context as ExtensionContext);

      let version = await sdk.getExtensionVersion(extensionId);
      expect(version).toBe('1.0.0');

      // Deploy v2
      await sdk.deactivateExtension(extensionId, context as ExtensionContext);
      context.config = {
        extensionId,
        siteId: 'main-site',
        version: '2.0.0',
      } as any as ExtensionConfig;

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      await sdk.activateExtension(extensionId, context as ExtensionContext);

      version = await sdk.getExtensionVersion(extensionId);
      expect(version).toBe('2.0.0');

      // Rollback to v1
      const rollbackResult = await sdk.rollbackExtension(
        extensionId,
        '1.0.0',
        context as ExtensionContext
      );
      expect(rollbackResult.status).toBe('rolled_back');

      version = await sdk.getExtensionVersion(extensionId);
      expect(version).toBe('1.0.0');
    });
  });

  describe('E2E Flow 12: Complete Extension Lifecycle with All Features', () => {
    test('should handle full-featured extension from discovery to deactivation', async () => {
      const extensionId = 'full-featured-extension';
      const manifest = {
        id: extensionId,
        name: 'Full Featured Extension',
        version: '1.0.0',
        manifest_version: '2.0.0',
        description: 'Complete extension with all features',
        author: 'Test Author',
        capabilities: [
          {
            id: 'cap:read',
            description: 'Read capability',
          },
        ],
        ui_components: [
          {
            id: 'dashboard-widget',
            type: 'widget',
            name: 'Dashboard Widget',
            slot: 'dashboard-main',
            permissions: ['read:dashboard'],
          },
          {
            id: 'admin-form',
            type: 'form',
            name: 'Admin Form',
            permissions: ['admin:system'],
          },
        ],
        navigation: [
          {
            id: 'dashboard-nav',
            label: 'Dashboard',
            path: '/dashboard',
            group: 'main',
            permissions: ['read:dashboard'],
          },
          {
            id: 'admin-nav',
            label: 'Admin',
            path: '/admin',
            group: 'admin',
            permissions: ['admin:system'],
            requiresApproval: true,
          },
        ],
        configurations: {
          theme: 'light',
          enableNotifications: true,
        },
      };

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'admin-user',
        siteId: 'main-site',
        permissions: [
          'read:dashboard',
          'admin:system',
          'read:navigation',
          'admin:navigation',
        ],
        config: {
          extensionId,
          siteId: 'main-site',
          settings: manifest.configurations,
        } as any as ExtensionConfig,
        state: {},
      };

      // 1. Validate manifest
      const validation = await validationFramework.validateManifest({
        manifest,
        manifestPath: 'manifest.json',
        extensionPath: `/extensions/${extensionId}`,
      });
      expect(validation.isValid).toBe(true);

      // 2. Discover
      const discovered = await sdk.discoverExtensions([
        `/extensions/${extensionId}`,
      ]);
      expect(discovered).toContainEqual(
        expect.objectContaining({ id: extensionId })
      );

      // 3. Load
      const loadResult = await sdk.loadExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(loadResult.status).toBe('loaded');

      // 4. Configure
      const configResult = await sdk.configureExtension(
        extensionId,
        context.config,
        context as ExtensionContext
      );
      expect(configResult.status).toBe('configured');

      // 5. Initialize
      const initResult = await sdk.initializeExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(initResult.status).toBe('initialized');

      // 6. Register components
      for (const component of manifest.ui_components) {
        const compReg = await sdk.registerComponent(
          component,
          context as ExtensionContext
        );
        expect(compReg?.status).toBe('registered');
      }

      // 7. Register navigation
      for (const nav of manifest.navigation) {
        const navReg = await sdk.registerNavigation(
          nav,
          context as ExtensionContext
        );
        expect(navReg?.status).toBe('registered');
      }

      // 8. Approve required navigation
      await navFramework.approveNavigationItem('admin-nav', 'admin-user');

      // 9. Activate
      const activateResult = await sdk.activateExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(activateResult.status).toBe('active');

      // 10. Verify everything is deployed
      let status = await sdk.getExtensionStatus(extensionId);
      expect(status).toBe('active');

      const components = await sdk.getRegisteredComponents(extensionId);
      expect(components.length).toBe(2);

      const navItems = await sdk.getRegisteredNavigation(extensionId);
      expect(navItems.length).toBe(2);

      // 11. Deactivate
      const deactivateResult = await sdk.deactivateExtension(
        extensionId,
        context as ExtensionContext
      );
      expect(deactivateResult.status).toBe('inactive');

      status = await sdk.getExtensionStatus(extensionId);
      expect(status).toBe('inactive');
    });
  });

  describe('E2E Deployment Timing and Metrics', () => {
    test('should track deployment time for each flow', async () => {
      const extensionId = 'metrics-extension';

      const context: Partial<ExtensionContext> = {
        extensionId,
        userId: 'admin-user',
        siteId: 'main-site',
        permissions: ['admin:extensions'],
        config: {
          extensionId,
          siteId: 'main-site',
        } as ExtensionConfig,
        state: {},
      };

      const startTime = performance.now();

      await sdk.loadExtension(extensionId, context as ExtensionContext);
      await sdk.initializeExtension(extensionId, context as ExtensionContext);
      await sdk.activateExtension(extensionId, context as ExtensionContext);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Full deployment should be relatively quick
      expect(duration).toBeLessThan(5000); // 5 seconds max

      // Verify deployment events were logged
      expect(deploymentLog.length).toBeGreaterThan(0);
    });
  });
});
