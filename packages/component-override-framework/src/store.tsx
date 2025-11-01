/**
 * Component Override Store
 *
 * Zustand-based store for managing component overrides, contracts, and validation.
 *
 * @module component-override-framework/store
 */

import { create } from 'zustand';
import {
  ComponentOverrideState,
  ComponentContract,
  ComponentOverrideDeclaration,
  OverrideRegistryEntry,
  OverrideSafetyPolicy,
} from './types';
import { validateOverride, checkCompatibility } from './validator';

/**
 * Component override store actions
 */
export interface ComponentOverrideStoreActions {
  /**
   * Register a component contract
   */
  registerContract: (contract: ComponentContract) => void;

  /**
   * Get a contract by ID
   */
  getContract: (contractId: string) => ComponentContract | undefined;

  /**
   * Register a component override
   */
  registerOverride: (override: ComponentOverrideDeclaration) => string;

  /**
   * Get an override by ID
   */
  getOverride: (overrideId: string) => ComponentOverrideDeclaration | undefined;

  /**
   * Get all overrides for a contract
   */
  getOverridesForContract: (contractId: string) => ComponentOverrideDeclaration[];

  /**
   * Get all overrides from an extension
   */
  getExtensionOverrides: (extensionId: string, siteId: string) => ComponentOverrideDeclaration[];

  /**
   * Activate an override
   */
  activateOverride: (overrideId: string) => boolean;

  /**
   * Deactivate an override
   */
  deactivateOverride: (overrideId: string, reason?: string) => boolean;

  /**
   * Remove an override
   */
  removeOverride: (overrideId: string) => boolean;

  /**
   * Get registry entry for an override
   */
  getRegistryEntry: (overrideId: string) => OverrideRegistryEntry | undefined;

  /**
   * Set policy for a site
   */
  setPolicy: (siteId: string, policy: OverrideSafetyPolicy) => void;

  /**
   * Get policy for a site
   */
  getPolicy: (siteId: string) => OverrideSafetyPolicy | null;

  /**
   * Get active override for a contract
   */
  getActiveOverride: (contractId: string, siteId: string) => ComponentOverrideDeclaration | undefined;

  /**
   * Record override usage
   */
  recordUsage: (overrideId: string) => void;

  /**
   * Record override error
   */
  recordError: (overrideId: string, error: Error, usingFallback: boolean) => void;

  /**
   * Sync overrides from server
   */
  syncOverrides: (contracts: ComponentContract[], overrides: ComponentOverrideDeclaration[]) => void;

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

const initialState: ComponentOverrideState = {
  contracts: [],
  overrides: [],
  registry: [],
  policies: {},
  activeOverrides: new Map(),
  failedOverrides: new Map(),
  lastSyncTime: null,
  isLoading: false,
  error: null,
};

/**
 * Create component override store
 */
export const useComponentOverrideStore = create<ComponentOverrideState & ComponentOverrideStoreActions>((set, get) => ({
  ...initialState,

  registerContract: (contract: ComponentContract) =>
    set((state) => {
      const existingIndex = state.contracts.findIndex((c) => c.id === contract.id);
      const contracts =
        existingIndex >= 0
          ? [
              ...state.contracts.slice(0, existingIndex),
              contract,
              ...state.contracts.slice(existingIndex + 1),
            ]
          : [...state.contracts, contract];

      return { contracts };
    }),

  getContract: (contractId: string) => {
    const state = get();
    return state.contracts.find((c) => c.id === contractId);
  },

  registerOverride: (override: ComponentOverrideDeclaration) => {
    const id = override.id || `override-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullOverride = { ...override, id };

    set((state) => {
      const contract = state.contracts.find((c) => c.id === override.contractId);
      if (!contract) {
        return state;
      }

      const validation = validateOverride(fullOverride, contract);
      const compatibility = checkCompatibility(fullOverride, contract);

      const registryEntry: OverrideRegistryEntry = {
        override: fullOverride,
        contract,
        validation,
        isActive: false,
        usageCount: 0,
      };

      return {
        overrides: [...state.overrides, fullOverride],
        registry: [...state.registry, registryEntry],
      };
    });

    return id;
  },

  getOverride: (overrideId: string) => {
    const state = get();
    return state.overrides.find((o) => o.id === overrideId);
  },

  getOverridesForContract: (contractId: string) => {
    const state = get();
    return state.overrides
      .filter((o) => o.contractId === contractId)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  },

  getExtensionOverrides: (extensionId: string, siteId: string) => {
    const state = get();
    return state.overrides.filter((o) => o.extensionId === extensionId && o.siteId === siteId);
  },

  activateOverride: (overrideId: string) => {
    let found = false;
    set((state) => {
      const override = state.overrides.find((o) => o.id === overrideId);
      if (!override) return state;

      found = true;
      const registryIndex = state.registry.findIndex((r) => r.override.id === overrideId);
      const registry =
        registryIndex >= 0
          ? [
              ...state.registry.slice(0, registryIndex),
              { ...state.registry[registryIndex], isActive: true },
              ...state.registry.slice(registryIndex + 1),
            ]
          : state.registry;

      const activeOverrides = new Map(state.activeOverrides);
      activeOverrides.set(override.contractId, override);

      return { registry, activeOverrides };
    });
    return found;
  },

  deactivateOverride: (overrideId: string, reason?: string) => {
    let found = false;
    set((state) => {
      const override = state.overrides.find((o) => o.id === overrideId);
      if (!override) return state;

      found = true;
      const registryIndex = state.registry.findIndex((r) => r.override.id === overrideId);
      const registry =
        registryIndex >= 0
          ? [
              ...state.registry.slice(0, registryIndex),
              {
                ...state.registry[registryIndex],
                isActive: false,
                inactiveReason: reason,
              },
              ...state.registry.slice(registryIndex + 1),
            ]
          : state.registry;

      const activeOverrides = new Map(state.activeOverrides);
      if (activeOverrides.get(override.contractId)?.id === overrideId) {
        activeOverrides.delete(override.contractId);
      }

      return { registry, activeOverrides };
    });
    return found;
  },

  removeOverride: (overrideId: string) => {
    let found = false;
    set((state) => {
      const override = state.overrides.find((o) => o.id === overrideId);
      if (!override) return state;

      found = true;
      return {
        overrides: state.overrides.filter((o) => o.id !== overrideId),
        registry: state.registry.filter((r) => r.override.id !== overrideId),
        activeOverrides: new Map(
          [...state.activeOverrides].filter(([_, o]) => o.id !== overrideId)
        ),
      };
    });
    return found;
  },

  getRegistryEntry: (overrideId: string) => {
    const state = get();
    return state.registry.find((r) => r.override.id === overrideId);
  },

  setPolicy: (siteId: string, policy: OverrideSafetyPolicy) =>
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

  getActiveOverride: (contractId: string, siteId: string) => {
    const state = get();
    const active = state.activeOverrides.get(contractId);
    if (active && active.siteId === siteId) {
      return active;
    }
    return undefined;
  },

  recordUsage: (overrideId: string) =>
    set((state) => {
      const registryIndex = state.registry.findIndex((r) => r.override.id === overrideId);
      if (registryIndex < 0) return state;

      const registry = [
        ...state.registry.slice(0, registryIndex),
        {
          ...state.registry[registryIndex],
          usageCount: state.registry[registryIndex].usageCount + 1,
          lastUsedAt: new Date(),
        },
        ...state.registry.slice(registryIndex + 1),
      ];

      return { registry };
    }),

  recordError: (overrideId: string, error: Error, usingFallback: boolean) => {
    set((state) => {
      const failedOverrides = new Map(state.failedOverrides);
      failedOverrides.set(overrideId, { error, fallbackActive: usingFallback });

      // Deactivate if fallback is active
      let registry = state.registry;
      if (usingFallback) {
        const registryIndex = registry.findIndex((r) => r.override.id === overrideId);
        if (registryIndex >= 0) {
          registry = [
            ...registry.slice(0, registryIndex),
            {
              ...registry[registryIndex],
              isActive: false,
              inactiveReason: `Error: ${error.message}`,
              appliedFallback: true,
            },
            ...registry.slice(registryIndex + 1),
          ];
        }
      }

      return { failedOverrides, registry };
    });
  },

  syncOverrides: (contracts: ComponentContract[], overrides: ComponentOverrideDeclaration[]) =>
    set({
      contracts,
      overrides,
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
