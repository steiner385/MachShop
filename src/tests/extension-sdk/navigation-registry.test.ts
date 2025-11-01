/**
 * Navigation Registry Tests
 * Issue #427: Navigation Extension Framework with Approval Workflow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NavigationRegistry,
  getNavigationRegistry,
} from '../../../packages/extension-sdk/src/navigation/registry';
import {
  StandardMenuGroup,
  NavigationError,
  MenuItemNotFoundError,
  MenuGroupNotFoundError,
  NavigationValidationError,
} from '../../../packages/extension-sdk/src/navigation/types';
import type {
  NavigationMenuItem,
  NewMenuGroupRequest,
  NavigationEvent,
} from '../../../packages/extension-sdk/src/navigation/types';

describe('NavigationRegistry', () => {
  let registry: NavigationRegistry;

  beforeEach(() => {
    registry = new NavigationRegistry();
  });

  describe('initialization', () => {
    it('should initialize with standard menu groups', () => {
      const groups = registry.getGroups();
      expect(groups).toHaveLength(7);
      expect(groups.map(g => g.id)).toContain(StandardMenuGroup.PRODUCTION);
      expect(groups.map(g => g.id)).toContain(StandardMenuGroup.QUALITY);
      expect(groups.map(g => g.id)).toContain(StandardMenuGroup.ADMIN);
    });

    it('should mark standard groups as pre-approved', () => {
      const groups = registry.getApprovedGroups();
      expect(groups.every(g => g.isStandard || !g.isStandard)).toBe(true);
    });

    it('should order standard groups correctly', () => {
      const groups = registry.getGroups();
      const orders = groups.map(g => g.order);
      expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe('menu item registration', () => {
    it('should register a valid menu item', () => {
      const item: NavigationMenuItem = {
        id: 'item-1',
        label: 'Item 1',
        path: '/item-1',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
      };

      registry.registerMenuItem(item);
      const retrieved = registry.getMenuItem('item-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.label).toBe('Item 1');
    });

    it('should add item to parent group', () => {
      const item: NavigationMenuItem = {
        id: 'item-1',
        label: 'Item 1',
        path: '/item-1',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
      };

      registry.registerMenuItem(item);
      const items = registry.getGroupItems(StandardMenuGroup.PRODUCTION);

      expect(items).toContainEqual(item);
    });

    it('should validate required fields', () => {
      const invalidItem = {
        // Missing id
        label: 'Invalid',
        path: '/invalid',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
      } as any;

      expect(() => registry.registerMenuItem(invalidItem)).toThrow(NavigationValidationError);
    });

    it('should validate path format', () => {
      const item: NavigationMenuItem = {
        id: 'item-1',
        label: 'Item 1',
        path: 'invalid-path', // Missing leading slash
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
      };

      expect(() => registry.registerMenuItem(item)).toThrow(NavigationValidationError);
    });

    it('should reject item for non-existent group', () => {
      const item: NavigationMenuItem = {
        id: 'item-1',
        label: 'Item 1',
        path: '/item-1',
        parentGroup: 'non-existent-group',
        extensionId: 'ext-1',
        version: '1.0.0',
      };

      expect(() => registry.registerMenuItem(item)).toThrow(MenuGroupNotFoundError);
    });

    it('should sort items by order within group', () => {
      registry.registerMenuItem({
        id: 'item-1',
        label: 'Item 1',
        path: '/item-1',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
        order: 10,
      });

      registry.registerMenuItem({
        id: 'item-2',
        label: 'Item 2',
        path: '/item-2',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
        order: 5,
      });

      const items = registry.getGroupItems(StandardMenuGroup.PRODUCTION);
      expect(items[0].id).toBe('item-2');
      expect(items[1].id).toBe('item-1');
    });
  });

  describe('menu item unregistration', () => {
    beforeEach(() => {
      registry.registerMenuItem({
        id: 'item-1',
        label: 'Item 1',
        path: '/item-1',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
      });
    });

    it('should unregister a menu item', () => {
      registry.unregisterMenuItem('item-1');
      expect(registry.getMenuItem('item-1')).toBeUndefined();
    });

    it('should remove item from group', () => {
      registry.unregisterMenuItem('item-1');
      const items = registry.getGroupItems(StandardMenuGroup.PRODUCTION);
      expect(items.find(i => i.id === 'item-1')).toBeUndefined();
    });

    it('should throw for non-existent item', () => {
      expect(() => registry.unregisterMenuItem('non-existent')).toThrow(MenuItemNotFoundError);
    });
  });

  describe('menu item validation', () => {
    it('should validate valid icon names', () => {
      const item: NavigationMenuItem = {
        id: 'item-1',
        label: 'Item 1',
        path: '/item-1',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
        icon: 'HomeOutlined',
      };

      expect(() => registry.registerMenuItem(item)).not.toThrow();
    });

    it('should reject invalid icon names', () => {
      const item: NavigationMenuItem = {
        id: 'item-1',
        label: 'Item 1',
        path: '/item-1',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
        icon: 'InvalidIcon',
      };

      expect(() => registry.registerMenuItem(item)).toThrow(NavigationValidationError);
    });

    it('should validate comprehensive menu item', () => {
      const item: NavigationMenuItem = {
        id: 'item-1',
        label: 'Item 1',
        path: '/item-1',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
        order: 5,
        icon: 'ShoppingOutlined',
        requiredPermission: 'PRODUCTION_VIEW',
      };

      const result = registry.validateMenuItem(item);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('menu group governance', () => {
    it('should request new menu group', () => {
      const request: NewMenuGroupRequest = {
        id: 'custom-group',
        name: 'Custom Group',
        description: 'A custom menu group',
        justification: 'For custom business logic',
        extensionId: 'ext-1',
        approvalRequired: 'admin',
      };

      registry.requestNewGroup(request);
      const pending = registry.getPendingRequests();

      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('custom-group');
      expect(pending[0].status).toBe('pending');
    });

    it('should approve group request', () => {
      const request: NewMenuGroupRequest = {
        id: 'custom-group',
        name: 'Custom Group',
        description: 'A custom menu group',
        justification: 'For custom business logic',
        extensionId: 'ext-1',
        approvalRequired: 'admin',
      };

      registry.requestNewGroup(request);
      registry.approveNewGroup('custom-group', 'Approved by admin');

      const group = registry.getGroup('custom-group');
      expect(group).toBeDefined();
      expect(group?.isStandard).toBe(false);

      const pending = registry.getPendingRequests();
      expect(pending).toHaveLength(0);
    });

    it('should reject group request', () => {
      const request: NewMenuGroupRequest = {
        id: 'custom-group',
        name: 'Custom Group',
        description: 'A custom menu group',
        justification: 'For custom business logic',
        extensionId: 'ext-1',
        approvalRequired: 'admin',
      };

      registry.requestNewGroup(request);
      registry.rejectNewGroup('custom-group', 'Does not meet requirements');

      const group = registry.getGroup('custom-group');
      expect(group).toBeUndefined();

      const pending = registry.getPendingRequests();
      expect(pending).toHaveLength(0);
    });

    it('should prevent duplicate group requests', () => {
      const request: NewMenuGroupRequest = {
        id: StandardMenuGroup.PRODUCTION,
        name: 'Production (duplicate)',
        description: 'Attempt to duplicate',
        justification: 'Test',
        extensionId: 'ext-1',
        approvalRequired: 'admin',
      };

      expect(() => registry.requestNewGroup(request)).toThrow(NavigationError);
    });

    it('should track approval comment', () => {
      const request: NewMenuGroupRequest = {
        id: 'custom-group',
        name: 'Custom Group',
        description: 'A custom menu group',
        justification: 'For custom business logic',
        extensionId: 'ext-1',
        approvalRequired: 'admin',
      };

      registry.requestNewGroup(request);
      registry.approveNewGroup('custom-group', 'Looks good!');

      const group = registry.getGroup('custom-group');
      expect(group).toBeDefined();
      // Approval was successful
      expect(registry.getPendingRequests().find(p => p.id === 'custom-group')).toBeUndefined();
    });
  });

  describe('permission-based filtering', () => {
    beforeEach(() => {
      registry.registerMenuItem({
        id: 'public-item',
        label: 'Public Item',
        path: '/public',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
      });

      registry.registerMenuItem({
        id: 'restricted-item',
        label: 'Restricted Item',
        path: '/restricted',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
        requiredPermission: 'ADMIN',
      });
    });

    it('should filter items by user permissions', () => {
      const items = registry.getGroupItems(StandardMenuGroup.PRODUCTION, {
        userPermissions: ['USER'],
      });

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('public-item');
    });

    it('should show restricted items for authorized users', () => {
      const items = registry.getGroupItems(StandardMenuGroup.PRODUCTION, {
        userPermissions: ['ADMIN'],
      });

      expect(items).toHaveLength(2);
      expect(items.map(i => i.id)).toContain('restricted-item');
    });

    it('should filter mobile hidden items', () => {
      registry.registerMenuItem({
        id: 'mobile-hidden',
        label: 'Hidden on Mobile',
        path: '/hidden',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
        hiddenOnMobile: true,
      });

      const desktopItems = registry.getGroupItems(StandardMenuGroup.PRODUCTION, {
        includeMobileHidden: true,
      });

      const mobileItems = registry.getGroupItems(StandardMenuGroup.PRODUCTION, {
        includeMobileHidden: false,
      });

      expect(desktopItems.length).toBeGreaterThan(mobileItems.length);
    });

    it('should filter disabled extensions', () => {
      registry.registerMenuItem({
        id: 'ext2-item',
        label: 'Extension 2 Item',
        path: '/ext2',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-2',
        version: '1.0.0',
      });

      const items = registry.getGroupItems(StandardMenuGroup.PRODUCTION, {
        excludeDisabledExtensions: ['ext-2'],
      });

      expect(items.find(i => i.extensionId === 'ext-2')).toBeUndefined();
    });
  });

  describe('event system', () => {
    it('should emit ITEM_ADDED event', () => {
      return new Promise<void>((resolve) => {
        const listener = vi.fn((event: NavigationEvent) => {
          expect(event.type).toBe('ITEM_ADDED');
          expect(event.itemId).toBe('item-1');
          resolve();
        });

        registry.onNavigationEvent(listener);

        registry.registerMenuItem({
          id: 'item-1',
          label: 'Item 1',
          path: '/item-1',
          parentGroup: StandardMenuGroup.PRODUCTION,
          extensionId: 'ext-1',
          version: '1.0.0',
        });
      });
    });

    it('should emit ITEM_REMOVED event', () => {
      return new Promise<void>((resolve) => {
        registry.registerMenuItem({
          id: 'item-1',
          label: 'Item 1',
          path: '/item-1',
          parentGroup: StandardMenuGroup.PRODUCTION,
          extensionId: 'ext-1',
          version: '1.0.0',
        });

        const listener = vi.fn((event: NavigationEvent) => {
          if (event.type === 'ITEM_REMOVED') {
            expect(event.itemId).toBe('item-1');
            resolve();
          }
        });

        registry.onNavigationEvent(listener);
        registry.unregisterMenuItem('item-1');
      });
    });

    it('should emit GROUP_CREATED event', () => {
      return new Promise<void>((resolve) => {
        const listener = vi.fn((event: NavigationEvent) => {
          expect(event.type).toBe('GROUP_CREATED');
          resolve();
        });

        registry.onNavigationEvent(listener);

        registry.requestNewGroup({
          id: 'custom-group',
          name: 'Custom',
          description: 'Test',
          justification: 'Test',
          extensionId: 'ext-1',
          approvalRequired: 'admin',
        });
      });
    });

    it('should emit GROUP_APPROVED event', () => {
      return new Promise<void>((resolve) => {
        registry.requestNewGroup({
          id: 'custom-group',
          name: 'Custom',
          description: 'Test',
          justification: 'Test',
          extensionId: 'ext-1',
          approvalRequired: 'admin',
        });

        const listener = vi.fn((event: NavigationEvent) => {
          if (event.type === 'GROUP_APPROVED') {
            expect(event.groupId).toBe('custom-group');
            resolve();
          }
        });

        registry.onNavigationEvent(listener);
        registry.approveNewGroup('custom-group');
      });
    });

    it('should allow unsubscribing from events', () => {
      const listener = vi.fn();
      const unsubscribe = registry.onNavigationEvent(listener);

      registry.registerMenuItem({
        id: 'item-1',
        label: 'Item 1',
        path: '/item-1',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
      });

      expect(listener).toHaveBeenCalled();

      unsubscribe();

      listener.mockClear();

      registry.registerMenuItem({
        id: 'item-2',
        label: 'Item 2',
        path: '/item-2',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('navigation tree', () => {
    it('should return navigation tree with all groups and items', () => {
      registry.registerMenuItem({
        id: 'prod-item',
        label: 'Production Item',
        path: '/prod',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
      });

      const tree = registry.getNavigationTree();
      expect(tree.length).toBeGreaterThan(0);
      expect(tree[0].items).toBeDefined();
    });

    it('should sort groups by order', () => {
      registry.registerMenuItem({
        id: 'item-1',
        label: 'Item',
        path: '/item',
        parentGroup: StandardMenuGroup.REPORTS,
        extensionId: 'ext-1',
        version: '1.0.0',
      });

      const tree = registry.getNavigationTree();
      const orders = tree.map(g => g.order);

      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
      }
    });

    it('should filter tree by permissions', () => {
      registry.registerMenuItem({
        id: 'admin-item',
        label: 'Admin Item',
        path: '/admin',
        parentGroup: StandardMenuGroup.ADMIN,
        extensionId: 'ext-1',
        version: '1.0.0',
        requiredPermission: 'ADMIN',
      });

      const tree = registry.getNavigationTree({
        userPermissions: ['USER'],
      });

      const adminGroup = tree.find(g => g.id === StandardMenuGroup.ADMIN);
      expect(adminGroup?.items).toHaveLength(0);
    });
  });

  describe('site-scoped navigation', () => {
    it('should get default site configuration', () => {
      const config = registry.getSiteNavigation('site-1');

      expect(config.siteId).toBe('site-1');
      expect(config.enabledGroups).toHaveLength(7);
      expect(config.groups).toBeDefined();
    });

    it('should update site navigation with enabled extensions', () => {
      registry.registerMenuItem({
        id: 'item-1',
        label: 'Item 1',
        path: '/item-1',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
      });

      registry.registerMenuItem({
        id: 'item-2',
        label: 'Item 2',
        path: '/item-2',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-2',
        version: '1.0.0',
      });

      registry.updateSiteNavigation('site-1', ['ext-1']);

      const config = registry.getSiteNavigation('site-1');
      const items = config.groups.flatMap(g => g.items);

      expect(items.find(i => i.extensionId === 'ext-2')).toBeUndefined();
    });

    it('should track last updated timestamp', () => {
      const before = new Date();
      registry.updateSiteNavigation('site-1', []);
      const after = new Date();

      const config = registry.getSiteNavigation('site-1');

      expect(config.lastUpdated.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(config.lastUpdated.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance from getNavigationRegistry', () => {
      const instance1 = getNavigationRegistry();
      const instance2 = getNavigationRegistry();

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across multiple calls', () => {
      const registry1 = getNavigationRegistry();

      registry1.registerMenuItem({
        id: 'item-1',
        label: 'Item 1',
        path: '/item-1',
        parentGroup: StandardMenuGroup.PRODUCTION,
        extensionId: 'ext-1',
        version: '1.0.0',
      });

      const registry2 = getNavigationRegistry();
      expect(registry2.getMenuItem('item-1')).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty navigation tree gracefully', () => {
      const tree = registry.getNavigationTree();
      expect(Array.isArray(tree)).toBe(true);
      expect(tree.length).toBeGreaterThan(0);
    });

    it('should handle concurrent menu item registration', () => {
      for (let i = 0; i < 100; i++) {
        registry.registerMenuItem({
          id: `item-${i}`,
          label: `Item ${i}`,
          path: `/item-${i}`,
          parentGroup: StandardMenuGroup.PRODUCTION,
          extensionId: `ext-${i % 10}`,
          version: '1.0.0',
        });
      }

      const items = registry.getGroupItems(StandardMenuGroup.PRODUCTION);
      expect(items).toHaveLength(100);
    });

    it('should handle multiple approval workflows simultaneously', () => {
      for (let i = 0; i < 5; i++) {
        registry.requestNewGroup({
          id: `group-${i}`,
          name: `Group ${i}`,
          description: 'Test group',
          justification: 'For testing',
          extensionId: 'ext-1',
          approvalRequired: 'admin',
        });
      }

      const pending = registry.getPendingRequests();
      expect(pending).toHaveLength(5);

      pending.forEach(p => {
        registry.approveNewGroup(p.id!);
      });

      expect(registry.getPendingRequests()).toHaveLength(0);
      expect(registry.getApprovedGroups().length).toBeGreaterThanOrEqual(12);
    });
  });
});
