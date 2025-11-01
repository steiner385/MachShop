/**
 * Navigation Extension Framework - React Hooks
 * Issue #427: Navigation Extension Framework with Approval Workflow
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  NavigationMenuItem,
  NavigationMenuGroup,
  NewMenuGroupRequest,
  NavigationQueryOptions,
  NavigationEvent,
  UseNavigationReturn,
} from './types';
import { getNavigationRegistry } from './registry';

/**
 * Permission-aware navigation hook
 * Provides access to menu items and groups with automatic filtering based on user permissions
 */
export function useNavigation(options?: {
  userPermissions?: string[];
  includeMobileHidden?: boolean;
  excludeDisabledExtensions?: string[];
  siteId?: string;
}): UseNavigationReturn {
  const [menuItems, setMenuItems] = useState<NavigationMenuItem[]>([]);
  const [menuGroups, setMenuGroups] = useState<NavigationMenuGroup[]>([]);
  const [navigationTree, setNavigationTree] = useState<NavigationMenuGroup[]>([]);
  const [pendingRequests, setPendingRequests] = useState<NewMenuGroupRequest[]>([]);

  const registry = getNavigationRegistry();

  // Initialize data and subscribe to events
  useEffect(() => {
    const updateNavigation = (): void => {
      const queryOptions: NavigationQueryOptions = {
        userPermissions: options?.userPermissions,
        includeMobileHidden: options?.includeMobileHidden,
        excludeDisabledExtensions: options?.excludeDisabledExtensions,
        siteId: options?.siteId,
      };

      // Update menu items from all groups
      const allItems = registry.getNavigationTree(queryOptions).flatMap(g => g.items);
      setMenuItems(allItems);

      // Update groups
      const groups = registry.getGroups();
      setMenuGroups(groups);

      // Update navigation tree
      const tree = registry.getNavigationTree(queryOptions);
      setNavigationTree(tree);

      // Update pending requests
      const pending = registry.getPendingRequests();
      setPendingRequests(pending);
    };

    // Initial load
    updateNavigation();

    // Subscribe to navigation events
    const unsubscribe = registry.onNavigationEvent((event: NavigationEvent) => {
      // Update on any navigation change
      updateNavigation();
    });

    return () => {
      unsubscribe();
    };
  }, [options?.userPermissions?.join(','), options?.includeMobileHidden, options?.excludeDisabledExtensions?.join(','), options?.siteId]);

  // Get menu items with optional groupId filter
  const getMenuItems = useCallback((groupId?: string, userPermissions?: string[]): NavigationMenuItem[] => {
    if (groupId) {
      return registry.getGroupItems(groupId, {
        userPermissions: userPermissions || options?.userPermissions,
        includeMobileHidden: options?.includeMobileHidden,
        excludeDisabledExtensions: options?.excludeDisabledExtensions,
      });
    }
    return menuItems;
  }, [menuItems, options?.userPermissions, options?.includeMobileHidden, options?.excludeDisabledExtensions]);

  // Add menu item at runtime
  const addMenuItem = useCallback((item: NavigationMenuItem): void => {
    registry.registerMenuItem(item);
  }, [registry]);

  // Remove menu item
  const removeMenuItem = useCallback((itemId: string): void => {
    registry.unregisterMenuItem(itemId);
  }, [registry]);

  // Get all menu groups
  const getGroups = useCallback((): NavigationMenuGroup[] => {
    return registry.getGroups();
  }, [registry]);

  // Get navigation tree
  const getNavigationTree = useCallback((): NavigationMenuGroup[] => {
    return registry.getNavigationTree({
      userPermissions: options?.userPermissions,
      includeMobileHidden: options?.includeMobileHidden,
      excludeDisabledExtensions: options?.excludeDisabledExtensions,
    });
  }, [registry, options?.userPermissions, options?.includeMobileHidden, options?.excludeDisabledExtensions]);

  // Subscribe to navigation changes
  const onNavigationChange = useCallback((callback: (event: NavigationEvent) => void): (() => void) => {
    return registry.onNavigationEvent(callback);
  }, [registry]);

  // Request new menu group (governance)
  const requestGroup = useCallback((request: NewMenuGroupRequest): void => {
    registry.requestNewGroup(request);
  }, [registry]);

  // Get pending governance requests
  const getPendingRequests = useCallback((): NewMenuGroupRequest[] => {
    return registry.getPendingRequests();
  }, [registry]);

  return {
    menuItems: getMenuItems,
    addMenuItem,
    removeMenuItem,
    groups: getGroups,
    navigationTree: getNavigationTree,
    onNavigationChange,
    requestGroup,
    pendingRequests: getPendingRequests,
  };
}

/**
 * Hook for managing menu group governance requests
 * Provides approval workflow for new menu groups
 */
export function useNavigationGovernance() {
  const [pendingRequests, setPendingRequests] = useState<NewMenuGroupRequest[]>([]);
  const [approvedGroups, setApprovedGroups] = useState<NavigationMenuGroup[]>([]);

  const registry = getNavigationRegistry();

  useEffect(() => {
    const updateGovernance = (): void => {
      setPendingRequests(registry.getPendingRequests());
      setApprovedGroups(registry.getApprovedGroups());
    };

    updateGovernance();

    const unsubscribe = registry.onNavigationEvent(() => {
      updateGovernance();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Approve a pending group request
  const approveGroup = useCallback((groupId: string, comment?: string): void => {
    registry.approveNewGroup(groupId, comment);
  }, [registry]);

  // Reject a pending group request
  const rejectGroup = useCallback((groupId: string, comment: string): void => {
    registry.rejectNewGroup(groupId, comment);
  }, [registry]);

  // Request a new menu group
  const requestNewGroup = useCallback((request: NewMenuGroupRequest): void => {
    registry.requestNewGroup(request);
  }, [registry]);

  return {
    pendingRequests,
    approvedGroups,
    approveGroup,
    rejectGroup,
    requestNewGroup,
  };
}

/**
 * Hook for menu item filtering and search
 */
export function useMenuItemSearch(
  searchTerm: string,
  options?: NavigationQueryOptions
) {
  const [results, setResults] = useState<NavigationMenuItem[]>([]);

  const registry = getNavigationRegistry();

  useEffect(() => {
    const filteredItems = registry
      .getNavigationTree(options)
      .flatMap(g => g.items)
      .filter(item => {
        const searchLower = searchTerm.toLowerCase();
        return (
          item.label.toLowerCase().includes(searchLower) ||
          item.path.toLowerCase().includes(searchLower) ||
          (item.metadata?.description?.toString().toLowerCase().includes(searchLower) ?? false)
        );
      });

    setResults(filteredItems);
  }, [searchTerm, options?.siteId, options?.userPermissions?.join(',')]);

  return results;
}

/**
 * Hook to get a specific menu item by ID
 */
export function useMenuItem(itemId: string | undefined): NavigationMenuItem | undefined {
  const [item, setItem] = useState<NavigationMenuItem | undefined>();

  const registry = getNavigationRegistry();

  useEffect(() => {
    if (!itemId) {
      setItem(undefined);
      return;
    }

    const foundItem = registry.getMenuItem(itemId);
    setItem(foundItem);

    const unsubscribe = registry.onNavigationEvent(event => {
      if (event.itemId === itemId) {
        const updatedItem = registry.getMenuItem(itemId);
        setItem(updatedItem);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [itemId]);

  return item;
}

/**
 * Hook to get a specific menu group by ID
 */
export function useMenuGroup(groupId: string | undefined): NavigationMenuGroup | undefined {
  const [group, setGroup] = useState<NavigationMenuGroup | undefined>();

  const registry = getNavigationRegistry();

  useEffect(() => {
    if (!groupId) {
      setGroup(undefined);
      return;
    }

    const foundGroup = registry.getGroup(groupId);
    setGroup(foundGroup);

    const unsubscribe = registry.onNavigationEvent(event => {
      if (event.groupId === groupId) {
        const updatedGroup = registry.getGroup(groupId);
        setGroup(updatedGroup);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [groupId]);

  return group;
}

/**
 * Hook for permission-based navigation filtering
 */
export function usePermissionBasedNavigation(userPermissions: string[]) {
  const { navigationTree } = useNavigation({
    userPermissions,
  });

  const [filteredTree, setFilteredTree] = useState<NavigationMenuGroup[]>([]);

  useEffect(() => {
    const filtered = navigationTree
      .map(group => ({
        ...group,
        items: group.items.filter(
          item =>
            !item.requiredPermission || userPermissions.includes(item.requiredPermission)
        ),
      }))
      .filter(group => group.items.length > 0 || group.isStandard);

    setFilteredTree(filtered);
  }, [navigationTree, userPermissions.join(',')]);

  return filteredTree;
}

/**
 * Hook for site-scoped navigation
 */
export function useSiteNavigation(siteId: string, enabledExtensions: string[]) {
  const registry = getNavigationRegistry();
  const [siteConfig, setSiteConfig] = useState(registry.getSiteNavigation(siteId));

  useEffect(() => {
    registry.updateSiteNavigation(siteId, enabledExtensions);
    setSiteConfig(registry.getSiteNavigation(siteId));

    const unsubscribe = registry.onNavigationEvent(event => {
      setSiteConfig(registry.getSiteNavigation(siteId));
    });

    return () => {
      unsubscribe();
    };
  }, [siteId, enabledExtensions.join(',')]);

  return siteConfig;
}
