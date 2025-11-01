/**
 * SDK + Navigation Framework Integration Tests
 *
 * Tests the integration between Frontend Extension SDK and Navigation Extension Framework.
 * Verifies that navigation items are properly registered, visibility is enforced by permissions,
 * and approval workflows function correctly.
 */

import {
  ExtensionSDK,
  ExtensionContext,
  ExtensionRegistration,
  ExtensionConfig,
} from '@machshop/frontend-extension-sdk';
import {
  NavigationExtensionFramework,
  NavigationItem,
  NavigationRegistration,
} from '@machshop/navigation-extension-framework';
import {
  ExtensionValidationFramework,
} from '@machshop/extension-validation-framework';

describe('SDK + Navigation Framework Integration', () => {
  let sdk: ExtensionSDK;
  let navFramework: NavigationExtensionFramework;
  let validationFramework: ExtensionValidationFramework;
  let extensionContext: Partial<ExtensionContext>;

  beforeEach(() => {
    // Initialize frameworks
    sdk = new ExtensionSDK();
    navFramework = new NavigationExtensionFramework();
    validationFramework = new ExtensionValidationFramework();

    // Setup test extension context
    extensionContext = {
      extensionId: 'test-extension',
      userId: 'test-user',
      siteId: 'test-site',
      permissions: ['read:navigation', 'write:navigation', 'admin:navigation'],
      config: {
        extensionId: 'test-extension',
        siteId: 'test-site',
      } as ExtensionConfig,
      state: {},
    };
  });

  describe('Navigation Item Registration', () => {
    test('should register navigation items via SDK', async () => {
      const navItem: NavigationItem = {
        id: 'test-nav-item',
        label: 'Test Item',
        path: '/test',
        group: 'test-group',
        icon: 'icon-test',
        permissions: ['read:navigation'],
      };

      const registration = await sdk.registerNavigation(navItem, extensionContext as ExtensionContext);

      expect(registration).toBeDefined();
      expect(registration?.id).toBe('test-nav-item');
      expect(registration?.status).toBe('registered');
    });

    test('should validate navigation item against framework requirements', async () => {
      const invalidNavItem: any = {
        id: 'test-nav',
        // Missing required label field
        path: '/test',
      };

      const validationResult = await validationFramework.validateNavigation(invalidNavItem);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContainEqual(
        expect.objectContaining({
          code: 'NAV_MISSING_LABEL',
        })
      );
    });

    test('should enforce unique navigation IDs within extension', async () => {
      const navItem1: NavigationItem = {
        id: 'duplicate-item',
        label: 'First Item',
        path: '/first',
      };

      const navItem2: NavigationItem = {
        id: 'duplicate-item',
        label: 'Second Item',
        path: '/second',
      };

      const reg1 = await sdk.registerNavigation(navItem1, extensionContext as ExtensionContext);
      expect(reg1?.status).toBe('registered');

      const reg2 = await sdk.registerNavigation(navItem2, extensionContext as ExtensionContext);
      expect(reg2?.status).toBe('error');
      expect(reg2?.error).toContain('duplicate');
    });
  });

  describe('Permission-Based Visibility', () => {
    test('should show navigation items user has permission for', async () => {
      const navItem: NavigationItem = {
        id: 'admin-nav-item',
        label: 'Admin Panel',
        path: '/admin',
        permissions: ['admin:navigation'],
      };

      await sdk.registerNavigation(navItem, extensionContext as ExtensionContext);

      const visibleItems = await navFramework.getVisibleNavigationItems(
        extensionContext as ExtensionContext
      );

      expect(visibleItems).toContainEqual(
        expect.objectContaining({
          id: 'admin-nav-item',
        })
      );
    });

    test('should hide navigation items user lacks permission for', async () => {
      const restrictedNavItem: NavigationItem = {
        id: 'restricted-nav-item',
        label: 'Restricted Area',
        path: '/restricted',
        permissions: ['admin:restricted'],
      };

      await sdk.registerNavigation(restrictedNavItem, extensionContext as ExtensionContext);

      const visibleItems = await navFramework.getVisibleNavigationItems(
        extensionContext as ExtensionContext
      );

      expect(visibleItems).not.toContainEqual(
        expect.objectContaining({
          id: 'restricted-nav-item',
        })
      );
    });

    test('should show items with no permission requirements', async () => {
      const publicNavItem: NavigationItem = {
        id: 'public-nav-item',
        label: 'Public Item',
        path: '/public',
        // No permissions field
      };

      await sdk.registerNavigation(publicNavItem, extensionContext as ExtensionContext);

      const visibleItems = await navFramework.getVisibleNavigationItems(
        extensionContext as ExtensionContext
      );

      expect(visibleItems).toContainEqual(
        expect.objectContaining({
          id: 'public-nav-item',
        })
      );
    });

    test('should dynamically update visibility when permissions change', async () => {
      const navItem: NavigationItem = {
        id: 'dynamic-nav-item',
        label: 'Dynamic Item',
        path: '/dynamic',
        permissions: ['admin:navigation'],
      };

      await sdk.registerNavigation(navItem, extensionContext as ExtensionContext);

      let visibleItems = await navFramework.getVisibleNavigationItems(
        extensionContext as ExtensionContext
      );
      expect(visibleItems).toContainEqual(
        expect.objectContaining({ id: 'dynamic-nav-item' })
      );

      // Remove permission
      extensionContext.permissions = ['read:navigation'];

      visibleItems = await navFramework.getVisibleNavigationItems(
        extensionContext as ExtensionContext
      );
      expect(visibleItems).not.toContainEqual(
        expect.objectContaining({ id: 'dynamic-nav-item' })
      );
    });
  });

  describe('Navigation Approval Workflows', () => {
    test('should mark navigation items as pending approval when required', async () => {
      const navItem: NavigationItem = {
        id: 'approval-required-item',
        label: 'Requires Approval',
        path: '/approval',
        requiresApproval: true,
      };

      const registration = await sdk.registerNavigation(
        navItem,
        extensionContext as ExtensionContext
      );

      expect(registration?.approvalStatus).toBe('pending');
    });

    test('should prevent navigation to unapproved items', async () => {
      const navItem: NavigationItem = {
        id: 'unapproved-item',
        label: 'Unapproved',
        path: '/unapproved',
        requiresApproval: true,
      };

      await sdk.registerNavigation(navItem, extensionContext as ExtensionContext);

      const canNavigate = await navFramework.canNavigate(
        'unapproved-item',
        extensionContext as ExtensionContext
      );

      expect(canNavigate).toBe(false);
    });

    test('should allow navigation to approved items', async () => {
      const navItem: NavigationItem = {
        id: 'approved-item',
        label: 'Approved',
        path: '/approved',
        requiresApproval: true,
        approvalStatus: 'approved',
        approvedBy: 'admin-user',
        approvedAt: new Date(),
      };

      await sdk.registerNavigation(navItem, extensionContext as ExtensionContext);

      const canNavigate = await navFramework.canNavigate(
        'approved-item',
        extensionContext as ExtensionContext
      );

      expect(canNavigate).toBe(true);
    });

    test('should track approval status changes', async () => {
      const navItem: NavigationItem = {
        id: 'tracking-item',
        label: 'Tracking Status',
        path: '/tracking',
        requiresApproval: true,
      };

      const registration = await sdk.registerNavigation(
        navItem,
        extensionContext as ExtensionContext
      );
      expect(registration?.approvalStatus).toBe('pending');

      // Approve the item
      const approvalResult = await navFramework.approveNavigationItem(
        'tracking-item',
        'admin-user'
      );

      expect(approvalResult.status).toBe('approved');

      const updatedRegistration = await sdk.getNavigationRegistration('tracking-item');
      expect(updatedRegistration?.approvalStatus).toBe('approved');
    });
  });

  describe('Navigation Group Organization', () => {
    test('should organize navigation items by group', async () => {
      const items = [
        {
          id: 'admin-1',
          label: 'Users',
          path: '/admin/users',
          group: 'administration',
        },
        {
          id: 'admin-2',
          label: 'Settings',
          path: '/admin/settings',
          group: 'administration',
        },
        {
          id: 'report-1',
          label: 'Sales',
          path: '/reports/sales',
          group: 'reports',
        },
      ];

      for (const item of items) {
        await sdk.registerNavigation(item as NavigationItem, extensionContext as ExtensionContext);
      }

      const groupedItems = await navFramework.getNavigationItemsByGroup(
        extensionContext as ExtensionContext
      );

      expect(groupedItems.administration).toHaveLength(2);
      expect(groupedItems.reports).toHaveLength(1);
    });

    test('should handle items without group assignment', async () => {
      const items = [
        {
          id: 'grouped',
          label: 'Grouped Item',
          path: '/grouped',
          group: 'my-group',
        },
        {
          id: 'ungrouped',
          label: 'Ungrouped Item',
          path: '/ungrouped',
        },
      ];

      for (const item of items) {
        await sdk.registerNavigation(item as NavigationItem, extensionContext as ExtensionContext);
      }

      const groupedItems = await navFramework.getNavigationItemsByGroup(
        extensionContext as ExtensionContext
      );

      expect(groupedItems['my-group']).toBeDefined();
      expect(groupedItems['']).toContainEqual(
        expect.objectContaining({ id: 'ungrouped' })
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle registration of navigation items with missing optional fields', async () => {
      const minimalNavItem: NavigationItem = {
        id: 'minimal-item',
        label: 'Minimal',
        path: '/minimal',
      };

      const registration = await sdk.registerNavigation(
        minimalNavItem,
        extensionContext as ExtensionContext
      );

      expect(registration?.status).toBe('registered');
    });

    test('should reject navigation items with invalid path format', async () => {
      const invalidNavItem: any = {
        id: 'invalid-path',
        label: 'Invalid Path',
        path: 'not-a-path', // Missing leading slash
      };

      const validation = await validationFramework.validateNavigation(invalidNavItem);

      expect(validation.isValid).toBe(false);
    });

    test('should handle concurrent navigation registrations', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-${i}`,
        label: `Concurrent Item ${i}`,
        path: `/concurrent/${i}`,
      }));

      const registrations = await Promise.all(
        items.map(item =>
          sdk.registerNavigation(item as NavigationItem, extensionContext as ExtensionContext)
        )
      );

      expect(registrations).toHaveLength(5);
      expect(registrations.every(r => r?.status === 'registered')).toBe(true);
    });

    test('should handle navigation item deregistration', async () => {
      const navItem: NavigationItem = {
        id: 'deregister-item',
        label: 'Deregister Me',
        path: '/deregister',
      };

      await sdk.registerNavigation(navItem, extensionContext as ExtensionContext);

      const deregisterResult = await sdk.deregisterNavigation(
        'deregister-item',
        extensionContext as ExtensionContext
      );

      expect(deregisterResult.status).toBe('deregistered');

      const visibleItems = await navFramework.getVisibleNavigationItems(
        extensionContext as ExtensionContext
      );
      expect(visibleItems).not.toContainEqual(
        expect.objectContaining({ id: 'deregister-item' })
      );
    });
  });
});
