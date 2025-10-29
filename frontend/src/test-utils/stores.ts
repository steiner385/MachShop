/**
 * Store Testing Utilities
 *
 * Utilities for testing Zustand stores and other state management
 * solutions in isolation and with components.
 */

import { act } from '@testing-library/react';
import { StateCreator } from 'zustand';
import { vi, expect, describe, it, beforeEach } from 'vitest';

/**
 * Create a test version of a Zustand store
 */
export function createTestStore<T>(storeCreator: StateCreator<T>) {
  let state: T;
  const listeners = new Set<() => void>();

  const setState = (updater: Partial<T> | ((prevState: T) => Partial<T>)) => {
    const newState = typeof updater === 'function' ? updater(state) : updater;
    state = { ...state, ...newState };
    listeners.forEach((listener) => listener());
  };

  const getState = () => state;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const destroy = () => {
    listeners.clear();
  };

  // Initialize the store
  state = storeCreator(setState, getState, { destroy } as any);

  return {
    getState,
    setState,
    subscribe,
    destroy,
    // Helper methods for testing
    reset: () => {
      state = storeCreator(setState, getState, { destroy } as any);
      listeners.forEach((listener) => listener());
    },
    simulateUpdate: (newState: Partial<T>) => {
      act(() => {
        setState(newState);
      });
    },
  };
}

/**
 * Mock a Zustand store with specific initial state
 */
export function mockZustandStore<T extends Record<string, any>>(
  storeName: string,
  initialState: T,
  actions: Record<string, any> = {}
) {
  const state = { ...initialState };
  const mockStore = {
    ...state,
    ...actions,
    // Common store methods
    reset: vi.fn(() => Object.assign(state, initialState)),
    setState: vi.fn((newState: Partial<T>) => Object.assign(state, newState)),
    getState: vi.fn(() => state),
    subscribe: vi.fn(),
    destroy: vi.fn(),
  };

  return {
    mockStore,
    // Update the mock store state
    updateState: (newState: Partial<T>) => {
      Object.assign(state, newState);
      Object.assign(mockStore, state);
    },
    // Get current state
    getCurrentState: () => ({ ...state }),
    // Reset to initial state
    resetToInitial: () => {
      Object.assign(state, initialState);
      Object.assign(mockStore, state);
    },
  };
}

/**
 * Create mock auth store with common auth patterns
 */
export function createMockAuthStore(initialState: any = {}) {
  const defaultState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    ...initialState,
  };

  return mockZustandStore('authStore', defaultState, {
    login: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
    setToken: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    clearError: vi.fn(),
  });
}

/**
 * Create mock equipment store
 */
export function createMockEquipmentStore(initialState: any = {}) {
  const defaultState = {
    equipment: [],
    selectedEquipment: null,
    isLoading: false,
    error: null,
    ...initialState,
  };

  return mockZustandStore('equipmentStore', defaultState, {
    fetchEquipment: vi.fn(),
    addEquipment: vi.fn(),
    updateEquipment: vi.fn(),
    deleteEquipment: vi.fn(),
    selectEquipment: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
  });
}

/**
 * Create mock work order store
 */
export function createMockWorkOrderStore(initialState: any = {}) {
  const defaultState = {
    workOrders: [],
    selectedWorkOrder: null,
    isLoading: false,
    error: null,
    ...initialState,
  };

  return mockZustandStore('workOrderStore', defaultState, {
    fetchWorkOrders: vi.fn(),
    addWorkOrder: vi.fn(),
    updateWorkOrder: vi.fn(),
    deleteWorkOrder: vi.fn(),
    selectWorkOrder: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
  });
}

/**
 * Test store subscription behavior
 */
export function testStoreSubscription<T>(
  store: { subscribe: (listener: () => void) => () => void; getState: () => T },
  stateMutation: () => void,
  expectedStateCheck: (state: T) => boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Store subscription test timed out'));
    }, 5000);

    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      if (expectedStateCheck(state)) {
        clearTimeout(timeout);
        unsubscribe();
        resolve();
      }
    });

    act(() => {
      stateMutation();
    });
  });
}

/**
 * Test store action behavior
 */
export async function testStoreAction<T>(
  store: { getState: () => T },
  action: () => Promise<void> | void,
  expectedStateCheck: (state: T) => boolean,
  timeout: number = 5000
): Promise<void> {
  await act(async () => {
    await action();
  });

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Store action test timed out'));
    }, timeout);

    const checkState = () => {
      const state = store.getState();
      if (expectedStateCheck(state)) {
        clearTimeout(timeoutId);
        resolve();
      } else {
        setTimeout(checkState, 10);
      }
    };

    checkState();
  });
}

/**
 * Wait for store to reach specific state
 */
export function waitForStoreState<T>(
  store: { getState: () => T },
  predicate: (state: T) => boolean,
  timeout: number = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkState = () => {
      const state = store.getState();
      if (predicate(state)) {
        resolve(state);
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error(`Store did not reach expected state within ${timeout}ms`));
      } else {
        setTimeout(checkState, 10);
      }
    };

    checkState();
  });
}

/**
 * Test store loading states
 */
export async function testStoreLoading<T extends { isLoading: boolean }>(
  store: { getState: () => T },
  asyncAction: () => Promise<void>
): Promise<void> {
  // Check initial loading state
  const initialState = store.getState();
  expect(initialState.isLoading).toBe(false);

  // Start async action and check loading becomes true
  const actionPromise = act(async () => {
    await asyncAction();
  });

  // Wait for loading to become true
  await waitForStoreState(store, (state) => state.isLoading === true, 1000);

  // Wait for action to complete
  await actionPromise;

  // Check loading becomes false
  await waitForStoreState(store, (state) => state.isLoading === false, 1000);
}

/**
 * Test store error handling
 */
export async function testStoreError<T extends { error: any; isLoading?: boolean }>(
  store: { getState: () => T },
  errorAction: () => Promise<void>,
  expectedError?: any
): Promise<void> {
  await act(async () => {
    await errorAction();
  });

  const state = store.getState();
  expect(state.error).toBeTruthy();

  if (expectedError) {
    expect(state.error).toEqual(expectedError);
  }

  // Check loading is false after error
  if ('isLoading' in state) {
    expect(state.isLoading).toBe(false);
  }
}

/**
 * Create store test suite helper
 */
export function createStoreTestSuite<T>(
  storeName: string,
  createStore: () => any,
  tests: {
    initialState: Partial<T>;
    actions?: Array<{
      name: string;
      action: (store: any) => Promise<void> | void;
      expectedState: (state: T) => boolean;
    }>;
  }
) {
  return () => {
    describe(storeName, () => {
      let store: any;

      beforeEach(() => {
        store = createStore();
      });

      it('should have correct initial state', () => {
        const state = store.getState();
        Object.keys(tests.initialState).forEach((key) => {
          expect(state[key]).toEqual(tests.initialState[key as keyof T]);
        });
      });

      if (tests.actions) {
        tests.actions.forEach(({ name, action, expectedState }) => {
          it(`should handle ${name} action`, async () => {
            await testStoreAction(store, () => action(store), expectedState);
          });
        });
      }
    });
  };
}

/**
 * Mock localStorage for store persistence testing
 */
export function mockLocalStorageForStore() {
  const storage: { [key: string]: string } = {};

  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    }),
    // Test helpers
    getStorage: () => ({ ...storage }),
    setStorage: (newStorage: { [key: string]: string }) => {
      Object.keys(storage).forEach((key) => delete storage[key]);
      Object.assign(storage, newStorage);
    },
  };
}