/**
 * Hook Testing Utilities
 *
 * Utilities for testing React hooks using @testing-library/react-hooks
 * or the newer renderHook from @testing-library/react.
 */

import { renderHook, RenderHookOptions, RenderHookResult } from '@testing-library/react';
import { ReactElement } from 'react';
import { vi } from 'vitest';
import { createTestWrapper, CustomRenderOptions } from './render';

/**
 * Render a hook with common providers
 */
export function renderHookWithProviders<TProps, TResult>(
  hook: (props: TProps) => TResult,
  options: {
    initialProps?: TProps;
    wrapper?: React.ComponentType<{ children: React.ReactNode }>;
  } & CustomRenderOptions = {}
): RenderHookResult<TResult, TProps> {
  const { initialProps, wrapper, ...providerOptions } = options;

  const testWrapper = wrapper || createTestWrapper(providerOptions);

  return renderHook(hook, {
    initialProps,
    wrapper: testWrapper,
  });
}

/**
 * Render a hook with all providers (router, query client, site context)
 */
export function renderHookWithAllProviders<TProps, TResult>(
  hook: (props: TProps) => TResult,
  options: {
    initialProps?: TProps;
  } & CustomRenderOptions = {}
): RenderHookResult<TResult, TProps> {
  return renderHookWithProviders(hook, {
    withRouter: true,
    withQueryClient: true,
    withSiteContext: true,
    ...options,
  });
}

/**
 * Render a hook with just site context
 */
export function renderHookWithSiteContext<TProps, TResult>(
  hook: (props: TProps) => TResult,
  options: {
    initialProps?: TProps;
  } & CustomRenderOptions = {}
): RenderHookResult<TResult, TProps> {
  return renderHookWithProviders(hook, {
    withRouter: false,
    withQueryClient: false,
    withSiteContext: true,
    ...options,
  });
}

/**
 * Render a hook with React Query
 */
export function renderHookWithQuery<TProps, TResult>(
  hook: (props: TProps) => TResult,
  options: {
    initialProps?: TProps;
  } & CustomRenderOptions = {}
): RenderHookResult<TResult, TProps> {
  return renderHookWithProviders(hook, {
    withRouter: false,
    withQueryClient: true,
    withSiteContext: false,
    ...options,
  });
}

/**
 * Utility to wait for a hook to return a specific value
 */
export async function waitForHookValue<T>(
  result: { current: T },
  predicate: (value: T) => boolean,
  timeout: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkValue = () => {
      if (predicate(result.current)) {
        resolve();
      } else if (Date.now() - startTime >= timeout) {
        reject(new Error(`Hook value did not match predicate within ${timeout}ms`));
      } else {
        setTimeout(checkValue, 10);
      }
    };

    checkValue();
  });
}

/**
 * Utility to wait for hook loading state to finish
 */
export async function waitForHookToFinishLoading<T extends { isLoading?: boolean }>(
  result: { current: T },
  timeout: number = 5000
): Promise<void> {
  return waitForHookValue(result, (value) => !value.isLoading, timeout);
}

/**
 * Utility to wait for hook error state
 */
export async function waitForHookError<T extends { error?: any }>(
  result: { current: T },
  timeout: number = 5000
): Promise<void> {
  return waitForHookValue(result, (value) => !!value.error, timeout);
}

/**
 * Utility to wait for hook success state
 */
export async function waitForHookSuccess<T extends { data?: any; isLoading?: boolean; error?: any }>(
  result: { current: T },
  timeout: number = 5000
): Promise<void> {
  return waitForHookValue(
    result,
    (value) => !!value.data && !value.isLoading && !value.error,
    timeout
  );
}

/**
 * Mock timers and advance them for testing hooks with intervals/timeouts
 */
export function createMockTimersForHook() {
  const timers = {
    useTimer: false,
    intervals: new Set<NodeJS.Timeout>(),
    timeouts: new Set<NodeJS.Timeout>(),
  };

  const originalSetInterval = global.setInterval;
  const originalSetTimeout = global.setTimeout;
  const originalClearInterval = global.clearInterval;
  const originalClearTimeout = global.clearTimeout;

  // Mock setInterval to track intervals
  global.setInterval = ((callback: Function, delay: number) => {
    const interval = originalSetInterval(callback, delay);
    timers.intervals.add(interval);
    return interval;
  }) as any;

  // Mock setTimeout to track timeouts
  global.setTimeout = ((callback: Function, delay: number) => {
    const timeout = originalSetTimeout(callback, delay);
    timers.timeouts.add(timeout);
    return timeout;
  }) as any;

  // Mock clearInterval to clean up tracking
  global.clearInterval = (interval: NodeJS.Timeout) => {
    timers.intervals.delete(interval);
    originalClearInterval(interval);
  };

  // Mock clearTimeout to clean up tracking
  global.clearTimeout = (timeout: NodeJS.Timeout) => {
    timers.timeouts.delete(timeout);
    originalClearTimeout(timeout);
  };

  return {
    // Clean up all timers
    cleanup: () => {
      timers.intervals.forEach(clearInterval);
      timers.timeouts.forEach(clearTimeout);
      timers.intervals.clear();
      timers.timeouts.clear();

      // Restore original functions
      global.setInterval = originalSetInterval;
      global.setTimeout = originalSetTimeout;
      global.clearInterval = originalClearInterval;
      global.clearTimeout = originalClearTimeout;
    },

    // Get active timers count
    getActiveTimersCount: () => timers.intervals.size + timers.timeouts.size,

    // Clear all timers manually
    clearAllTimers: () => {
      timers.intervals.forEach(clearInterval);
      timers.timeouts.forEach(clearTimeout);
      timers.intervals.clear();
      timers.timeouts.clear();
    },
  };
}

/**
 * Utility for testing hooks that use WebSocket connections
 */
export function createMockWebSocketForHook() {
  const mockSocket = {
    readyState: WebSocket.OPEN,
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onopen: null as ((event: Event) => void) | null,
    onclose: null as ((event: CloseEvent) => void) | null,
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: Event) => void) | null,
  };

  // Mock WebSocket constructor
  (global as any).WebSocket = vi.fn(() => mockSocket);

  return {
    mockSocket,
    // Simulate receiving a message
    simulateMessage: (data: any) => {
      if (mockSocket.onmessage) {
        mockSocket.onmessage({ data: JSON.stringify(data) } as MessageEvent);
      }
    },
    // Simulate connection opening
    simulateOpen: () => {
      if (mockSocket.onopen) {
        mockSocket.onopen({} as Event);
      }
    },
    // Simulate connection closing
    simulateClose: () => {
      if (mockSocket.onclose) {
        mockSocket.onclose({} as CloseEvent);
      }
    },
    // Simulate error
    simulateError: () => {
      if (mockSocket.onerror) {
        mockSocket.onerror({} as Event);
      }
    },
  };
}

/**
 * Create a mock function that tracks calls for hook testing
 */
export function createMockCallback<T extends (...args: any[]) => any>() {
  const mockFn = vi.fn() as any;

  return Object.assign(mockFn, {
    getCallCount: () => mockFn.mock.calls.length,
    getLastCall: () => mockFn.mock.calls[mockFn.mock.calls.length - 1] as Parameters<T> | undefined,
    getAllCalls: () => mockFn.mock.calls as Parameters<T>[],
  });
}

// Re-export useful testing utilities
export { act, waitFor } from '@testing-library/react';