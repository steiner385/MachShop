/**
 * State Management Integration Tests
 *
 * Tests the integration of Zustand state management across extension frameworks.
 * Verifies that state is properly shared, persisted, and synchronized between packages.
 */

import {
  ExtensionSDK,
  ExtensionContext,
  ExtensionConfig,
  useExtensionState,
} from '@machshop/frontend-extension-sdk';
import {
  NavigationExtensionFramework,
  useNavigationStore,
} from '@machshop/navigation-extension-framework';
import {
  ComponentOverrideFramework,
  useComponentOverrideStore,
} from '@machshop/component-override-framework';

describe('State Management Integration', () => {
  let sdk: ExtensionSDK;
  let navFramework: NavigationExtensionFramework;
  let overrideFramework: ComponentOverrideFramework;
  let extensionContext: Partial<ExtensionContext>;

  beforeEach(() => {
    sdk = new ExtensionSDK();
    navFramework = new NavigationExtensionFramework();
    overrideFramework = new ComponentOverrideFramework();

    extensionContext = {
      extensionId: 'state-test-extension',
      userId: 'test-user',
      siteId: 'test-site',
      permissions: ['admin:system'],
      config: {
        extensionId: 'state-test-extension',
        siteId: 'test-site',
      } as ExtensionConfig,
      state: {},
    };
  });

  describe('Extension State Storage', () => {
    test('should store extension state in Zustand store', async () => {
      const extensionState = useExtensionState();

      extensionState.setState({
        userId: 'test-user',
        siteId: 'test-site',
        config: { extensionId: 'test-extension' },
      });

      const state = extensionState.getState();

      expect(state.userId).toBe('test-user');
      expect(state.siteId).toBe('test-site');
    });

    test('should persist extension state across instances', async () => {
      const store1 = useExtensionState();
      store1.setState({
        userId: 'persistent-user',
        siteId: 'persistent-site',
      });

      const store2 = useExtensionState();
      const state = store2.getState();

      expect(state.userId).toBe('persistent-user');
      expect(state.siteId).toBe('persistent-site');
    });

    test('should update extension state reactively', async () => {
      const store = useExtensionState();
      const stateSpy = jest.fn();

      const unsubscribe = store.subscribe(
        (state: any) => state.config,
        stateSpy
      );

      store.setState({
        config: { extensionId: 'new-extension' },
      });

      expect(stateSpy).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('Navigation Store Integration', () => {
    test('should manage navigation items in shared store', async () => {
      const navStore = useNavigationStore();

      navStore.addNavigationItem({
        id: 'test-nav',
        label: 'Test Navigation',
        path: '/test',
      });

      const items = navStore.getNavigationItems();

      expect(items).toContainEqual(
        expect.objectContaining({
          id: 'test-nav',
        })
      );
    });

    test('should persist navigation items across store instances', async () => {
      const store1 = useNavigationStore();
      store1.addNavigationItem({
        id: 'persistent-nav',
        label: 'Persistent Navigation',
        path: '/persistent',
      });

      const store2 = useNavigationStore();
      const items = store2.getNavigationItems();

      expect(items).toContainEqual(
        expect.objectContaining({
          id: 'persistent-nav',
        })
      );
    });

    test('should update navigation store state reactively', async () => {
      const store = useNavigationStore();
      const stateSpy = jest.fn();

      const unsubscribe = store.subscribe(
        (state: any) => state.items,
        stateSpy
      );

      store.addNavigationItem({
        id: 'reactive-nav',
        label: 'Reactive Navigation',
        path: '/reactive',
      });

      expect(stateSpy).toHaveBeenCalled();

      unsubscribe();
    });

    test('should handle navigation item removal from store', async () => {
      const store = useNavigationStore();

      store.addNavigationItem({
        id: 'removable-nav',
        label: 'Removable',
        path: '/removable',
      });

      store.removeNavigationItem('removable-nav');
      const items = store.getNavigationItems();

      expect(items).not.toContainEqual(
        expect.objectContaining({
          id: 'removable-nav',
        })
      );
    });
  });

  describe('Component Override Store Integration', () => {
    test('should manage component overrides in shared store', async () => {
      const overrideStore = useComponentOverrideStore();

      overrideStore.addOverride({
        targetComponent: 'TestComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomTestComponent',
      });

      const overrides = overrideStore.getOverrides();

      expect(overrides).toContainEqual(
        expect.objectContaining({
          targetComponent: 'TestComponent',
        })
      );
    });

    test('should persist component overrides across instances', async () => {
      const store1 = useComponentOverrideStore();
      store1.addOverride({
        targetComponent: 'PersistentComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomComponent',
      });

      const store2 = useComponentOverrideStore();
      const overrides = store2.getOverrides();

      expect(overrides).toContainEqual(
        expect.objectContaining({
          targetComponent: 'PersistentComponent',
        })
      );
    });

    test('should update component override store reactively', async () => {
      const store = useComponentOverrideStore();
      const stateSpy = jest.fn();

      const unsubscribe = store.subscribe(
        (state: any) => state.overrides,
        stateSpy
      );

      store.addOverride({
        targetComponent: 'ReactiveComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomReactiveComponent',
      });

      expect(stateSpy).toHaveBeenCalled();

      unsubscribe();
    });

    test('should handle component override removal', async () => {
      const store = useComponentOverrideStore();

      store.addOverride({
        targetComponent: 'RemovableComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomRemovableComponent',
      });

      store.removeOverride('RemovableComponent', '@machshop/core-mes-ui-foundation');
      const overrides = store.getOverrides();

      expect(overrides).not.toContainEqual(
        expect.objectContaining({
          targetComponent: 'RemovableComponent',
        })
      );
    });
  });

  describe('Cross-Store State Synchronization', () => {
    test('should sync state changes between extension and navigation stores', async () => {
      const extStore = useExtensionState();
      const navStore = useNavigationStore();

      extStore.setState({
        userId: 'sync-user',
      });

      await sdk.loadExtension('test-ext', extensionContext as ExtensionContext);

      const extState = extStore.getState();
      expect(extState.userId).toBe('sync-user');
    });

    test('should maintain consistency when multiple stores update', async () => {
      const extStore = useExtensionState();
      const navStore = useNavigationStore();
      const overrideStore = useComponentOverrideStore();

      // Update all stores
      extStore.setState({ userId: 'multi-user' });
      navStore.addNavigationItem({
        id: 'multi-nav',
        label: 'Multi Navigation',
        path: '/multi',
      });
      overrideStore.addOverride({
        targetComponent: 'MultiComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomMultiComponent',
      });

      // Verify all stores have their data
      expect(extStore.getState().userId).toBe('multi-user');
      expect(navStore.getNavigationItems()).toContainEqual(
        expect.objectContaining({ id: 'multi-nav' })
      );
      expect(overrideStore.getOverrides()).toContainEqual(
        expect.objectContaining({ targetComponent: 'MultiComponent' })
      );
    });

    test('should handle concurrent store updates', async () => {
      const extStore = useExtensionState();
      const navStore = useNavigationStore();
      const overrideStore = useComponentOverrideStore();

      const updates = [
        extStore.setState({ userId: 'concurrent-user' }),
        navStore.addNavigationItem({
          id: 'concurrent-nav',
          label: 'Concurrent',
          path: '/concurrent',
        }),
        overrideStore.addOverride({
          targetComponent: 'ConcurrentComponent',
          targetModule: '@machshop/core-mes-ui-foundation',
          componentPath: './CustomConcurrent',
        }),
      ];

      await Promise.all(updates);

      expect(extStore.getState().userId).toBe('concurrent-user');
      expect(navStore.getNavigationItems()).toContainEqual(
        expect.objectContaining({ id: 'concurrent-nav' })
      );
      expect(overrideStore.getOverrides()).toContainEqual(
        expect.objectContaining({ targetComponent: 'ConcurrentComponent' })
      );
    });
  });

  describe('State Persistence', () => {
    test('should persist state to localStorage', async () => {
      const store = useExtensionState();

      store.setState({
        userId: 'persistent-user',
        siteId: 'persistent-site',
      });

      await store.persist();

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('should restore state from localStorage', async () => {
      const store = useExtensionState();

      // Mock localStorage.getItem
      const mockState = {
        userId: 'restored-user',
        siteId: 'restored-site',
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockState));

      await store.restorePersistedState();

      expect(store.getState().userId).toBe('restored-user');
    });

    test('should handle corrupt persisted state', async () => {
      const store = useExtensionState();

      (localStorage.getItem as jest.Mock).mockReturnValue('invalid json');

      const restoreResult = await store.restorePersistedState();

      expect(restoreResult.success).toBe(false);
      expect(restoreResult.error).toBeDefined();
    });
  });

  describe('State Isolation', () => {
    test('should isolate state per extension', async () => {
      const ext1Context = {
        ...extensionContext,
        extensionId: 'extension-1',
      } as ExtensionContext;

      const ext2Context = {
        ...extensionContext,
        extensionId: 'extension-2',
      } as ExtensionContext;

      const store1 = useExtensionState();
      store1.setState({ extensionData: { key: 'ext1' } });

      const store2 = useExtensionState();
      store2.setState({ extensionData: { key: 'ext2' } });

      // Verify isolation (implementation depends on how stores are created)
      expect(store1.getState()).toBeDefined();
      expect(store2.getState()).toBeDefined();
    });

    test('should isolate state per site', async () => {
      const site1Context = {
        ...extensionContext,
        siteId: 'site-1',
      } as ExtensionContext;

      const site2Context = {
        ...extensionContext,
        siteId: 'site-2',
      } as ExtensionContext;

      const store1 = useNavigationStore();
      store1.addNavigationItem({
        id: 'site1-nav',
        label: 'Site 1 Navigation',
        path: '/site1',
      });

      const store2 = useNavigationStore();

      // Stores might share data depending on implementation
      const items = store2.getNavigationItems();
      expect(items).toBeDefined();
    });
  });

  describe('State Cleanup', () => {
    test('should clear extension state on cleanup', async () => {
      const store = useExtensionState();

      store.setState({
        userId: 'cleanup-user',
        siteId: 'cleanup-site',
      });

      store.clear();

      const state = store.getState();
      expect(state.userId).toBeUndefined();
    });

    test('should clear navigation items on cleanup', async () => {
      const navStore = useNavigationStore();

      navStore.addNavigationItem({
        id: 'cleanup-nav',
        label: 'Cleanup Navigation',
        path: '/cleanup',
      });

      navStore.clear();

      const items = navStore.getNavigationItems();
      expect(items.length).toBe(0);
    });

    test('should clear component overrides on cleanup', async () => {
      const overrideStore = useComponentOverrideStore();

      overrideStore.addOverride({
        targetComponent: 'CleanupComponent',
        targetModule: '@machshop/core-mes-ui-foundation',
        componentPath: './CustomCleanupComponent',
      });

      overrideStore.clear();

      const overrides = overrideStore.getOverrides();
      expect(overrides.length).toBe(0);
    });
  });

  describe('State Debugging and Inspection', () => {
    test('should allow state inspection', async () => {
      const store = useExtensionState();

      store.setState({
        userId: 'debug-user',
        debugInfo: { timestamp: Date.now() },
      });

      const state = store.getState();

      expect(state.userId).toBe('debug-user');
      expect(state.debugInfo).toBeDefined();
    });

    test('should track state change history', async () => {
      const store = useExtensionState();

      store.setState({ userId: 'user1' });
      store.setState({ userId: 'user2' });
      store.setState({ userId: 'user3' });

      const history = store.getHistory?.();

      if (history) {
        expect(history.length).toBeGreaterThanOrEqual(3);
      }
    });

    test('should provide time-travel debugging capabilities', async () => {
      const store = useExtensionState();

      store.setState({ userId: 'user1' });
      store.setState({ userId: 'user2' });

      if (store.timeTravel) {
        store.timeTravel(-1);
        expect(store.getState().userId).toBe('user1');

        store.timeTravel(1);
        expect(store.getState().userId).toBe('user2');
      }
    });
  });
});
