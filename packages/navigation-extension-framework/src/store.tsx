/**
 * Navigation Store
 *
 * Zustand-based store for managing navigation state, approval requests, and policies.
 *
 * @module navigation-extension-framework/store
 */

import { create } from 'zustand';
import {
  NavigationState,
  NavigationGroup,
  NavigationItem,
  NavigationApprovalRequest,
  NavigationApprovalPolicy,
  NavigationRegistryEntry,
} from './types';

/**
 * Navigation store actions
 */
export interface NavigationStoreActions {
  /**
   * Add or update a navigation group
   */
  setGroup: (group: NavigationGroup) => void;

  /**
   * Remove a navigation group
   */
  removeGroup: (groupId: string) => void;

  /**
   * Add or update a navigation item
   */
  setItem: (item: NavigationItem) => void;

  /**
   * Remove a navigation item
   */
  removeItem: (itemId: string) => void;

  /**
   * Get all items in a group
   */
  getItemsByGroup: (groupId: string) => NavigationItem[];

  /**
   * Get sorted and filtered groups
   */
  getFilteredGroups: (permissions: string[], roles: string[]) => NavigationGroup[];

  /**
   * Get sorted and filtered items
   */
  getFilteredItems: (permissions: string[], roles: string[]) => NavigationItem[];

  /**
   * Create an approval request
   */
  createApprovalRequest: (request: Omit<NavigationApprovalRequest, 'id' | 'createdAt'>) => string;

  /**
   * Approve an approval request
   */
  approveRequest: (requestId: string, reviewedBy: string, reason?: string) => boolean;

  /**
   * Reject an approval request
   */
  rejectRequest: (requestId: string, reviewedBy: string, reason?: string) => boolean;

  /**
   * Get pending approvals
   */
  getPendingApprovals: () => NavigationApprovalRequest[];

  /**
   * Get approvals for a specific extension
   */
  getExtensionApprovals: (extensionId: string) => NavigationApprovalRequest[];

  /**
   * Set approval policy for a site
   */
  setPolicy: (siteId: string, policy: NavigationApprovalPolicy) => void;

  /**
   * Get approval policy for a site
   */
  getPolicy: (siteId: string) => NavigationApprovalPolicy | null;

  /**
   * Register a navigation entry
   */
  registerEntry: (entry: NavigationRegistryEntry) => void;

  /**
   * Get registry entries for an extension
   */
  getExtensionEntries: (extensionId: string, siteId: string) => NavigationRegistryEntry[];

  /**
   * Sync navigation from server
   */
  syncNavigation: (groups: NavigationGroup[], items: NavigationItem[]) => void;

  /**
   * Set loading state
   */
  setLoading: (loading: boolean) => void;

  /**
   * Set error
   */
  setError: (error: string | null) => void;

  /**
   * Reset store
   */
  reset: () => void;
}

const initialState: NavigationState = {
  groups: [],
  items: [],
  pendingApprovals: [],
  policies: {},
  registry: [],
  lastSyncTime: null,
  isLoading: false,
  error: null,
};

/**
 * Create navigation store
 */
export const useNavigationStore = create<NavigationState & NavigationStoreActions>((set, get) => ({
  ...initialState,

  setGroup: (group: NavigationGroup) =>
    set((state) => {
      const existingIndex = state.groups.findIndex((g) => g.id === group.id);
      const groups =
        existingIndex >= 0
          ? [
              ...state.groups.slice(0, existingIndex),
              group,
              ...state.groups.slice(existingIndex + 1),
            ]
          : [...state.groups, group];

      return { groups };
    }),

  removeGroup: (groupId: string) =>
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
      items: state.items.filter((i) => i.groupId !== groupId),
    })),

  setItem: (item: NavigationItem) =>
    set((state) => {
      const existingIndex = state.items.findIndex((i) => i.id === item.id);
      const items =
        existingIndex >= 0
          ? [
              ...state.items.slice(0, existingIndex),
              item,
              ...state.items.slice(existingIndex + 1),
            ]
          : [...state.items, item];

      return { items };
    }),

  removeItem: (itemId: string) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== itemId),
    })),

  getItemsByGroup: (groupId: string) => {
    const state = get();
    return state.items.filter((item) => item.groupId === groupId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  getFilteredGroups: (permissions: string[], roles: string[]) => {
    const state = get();
    return state.groups
      .filter((group) => {
        if (!group.visibility) return true;

        if (group.visibility.isVisible) {
          return group.visibility.isVisible({ userPermissions: permissions, userRoles: roles });
        }

        return canAccessNavigation(group.visibility, permissions, roles);
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  getFilteredItems: (permissions: string[], roles: string[]) => {
    const state = get();
    return state.items
      .filter((item) => {
        if (!item.visibility) return true;

        if (item.visibility.isVisible) {
          return item.visibility.isVisible({ userPermissions: permissions, userRoles: roles });
        }

        return canAccessNavigation(item.visibility, permissions, roles);
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  createApprovalRequest: (request: Omit<NavigationApprovalRequest, 'id' | 'createdAt'>) => {
    const id = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullRequest: NavigationApprovalRequest = {
      ...request,
      id,
      createdAt: new Date(),
    };

    set((state) => ({
      pendingApprovals: [...state.pendingApprovals, fullRequest],
    }));

    return id;
  },

  approveRequest: (requestId: string, reviewedBy: string, reason?: string) => {
    let found = false;
    set((state) => {
      const index = state.pendingApprovals.findIndex((a) => a.id === requestId);
      if (index < 0) return state;

      found = true;
      const approval = state.pendingApprovals[index];
      const updated = {
        ...approval,
        status: 'approved' as const,
        reviewedBy,
        reviewReason: reason,
        reviewedAt: new Date(),
      };

      return {
        pendingApprovals: [
          ...state.pendingApprovals.slice(0, index),
          updated,
          ...state.pendingApprovals.slice(index + 1),
        ],
      };
    });
    return found;
  },

  rejectRequest: (requestId: string, reviewedBy: string, reason?: string) => {
    let found = false;
    set((state) => {
      const index = state.pendingApprovals.findIndex((a) => a.id === requestId);
      if (index < 0) return state;

      found = true;
      const approval = state.pendingApprovals[index];
      const updated = {
        ...approval,
        status: 'rejected' as const,
        reviewedBy,
        reviewReason: reason,
        reviewedAt: new Date(),
      };

      return {
        pendingApprovals: [
          ...state.pendingApprovals.slice(0, index),
          updated,
          ...state.pendingApprovals.slice(index + 1),
        ],
      };
    });
    return found;
  },

  getPendingApprovals: () => {
    const state = get();
    return state.pendingApprovals.filter((a) => a.status === 'pending');
  },

  getExtensionApprovals: (extensionId: string) => {
    const state = get();
    return state.pendingApprovals.filter((a) => a.extensionId === extensionId);
  },

  setPolicy: (siteId: string, policy: NavigationApprovalPolicy) =>
    set((state) => ({
      policies: {
        ...state.policies,
        [siteId]: policy,
      },
    })),

  getPolicy: (siteId: string) => {
    const state = get();
    return state.policies[siteId] || null;
  },

  registerEntry: (entry: NavigationRegistryEntry) =>
    set((state) => {
      const existingIndex = state.registry.findIndex(
        (e) => e.extensionId === entry.extensionId && 'id' in e.target && e.target.id === ('id' in entry.target ? entry.target.id : '')
      );

      const registry =
        existingIndex >= 0
          ? [
              ...state.registry.slice(0, existingIndex),
              entry,
              ...state.registry.slice(existingIndex + 1),
            ]
          : [...state.registry, entry];

      return { registry };
    }),

  getExtensionEntries: (extensionId: string, siteId: string) => {
    const state = get();
    return state.registry.filter((e) => e.extensionId === extensionId && e.siteId === siteId);
  },

  syncNavigation: (groups: NavigationGroup[], items: NavigationItem[]) =>
    set({
      groups,
      items,
      lastSyncTime: new Date(),
      isLoading: false,
    }),

  setLoading: (loading: boolean) =>
    set({
      isLoading: loading,
    }),

  setError: (error: string | null) =>
    set({
      error,
    }),

  reset: () => set(initialState),
}));

/**
 * Check if user can access navigation item based on visibility rules
 */
function canAccessNavigation(visibility: any, permissions: string[], roles: string[]): boolean {
  if (visibility.requiredPermissions) {
    const hasPermission =
      visibility.requirementMode === 'all'
        ? visibility.requiredPermissions.every((p: string) => permissions.includes(p))
        : visibility.requiredPermissions.some((p: string) => permissions.includes(p));

    if (!hasPermission) return false;
  }

  if (visibility.requiredRoles) {
    const hasRole =
      visibility.requirementMode === 'all'
        ? visibility.requiredRoles.every((r: string) => roles.includes(r))
        : visibility.requiredRoles.some((r: string) => roles.includes(r));

    if (!hasRole) return false;
  }

  return true;
}
