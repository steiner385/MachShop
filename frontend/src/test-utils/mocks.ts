/**
 * API Mocking Utilities
 *
 * Utilities for mocking API calls, modules, and external dependencies
 * in tests. Provides consistent mocking patterns across the test suite.
 */

import { vi } from 'vitest';

/**
 * Mock all API modules with default implementations
 */
export function mockAllAPIs() {
  // Mock collaboration API
  vi.mock('@/api/collaboration', () => ({
    collaborationApi: {
      createComment: vi.fn().mockResolvedValue({ id: 'comment-1' }),
      updateComment: vi.fn().mockResolvedValue({ id: 'comment-1' }),
      deleteComment: vi.fn().mockResolvedValue({}),
      replyToComment: vi.fn().mockResolvedValue({ id: 'reply-1' }),
      toggleCommentReaction: vi.fn().mockResolvedValue({}),
      getComments: vi.fn().mockResolvedValue([]),
      getDocumentComments: vi.fn().mockResolvedValue([]),
    },
  }));

  // Mock equipment API
  vi.mock('@/api/equipment', () => ({
    equipmentApi: {
      getAllEquipment: vi.fn().mockResolvedValue([]),
      getEquipmentById: vi.fn().mockResolvedValue(null),
      createEquipment: vi.fn().mockResolvedValue({ id: 'equipment-1' }),
      updateEquipment: vi.fn().mockResolvedValue({ id: 'equipment-1' }),
      deleteEquipment: vi.fn().mockResolvedValue({}),
    },
  }));

  // Mock routing API
  vi.mock('@/api/routing', () => ({
    routingApi: {
      getAllRoutings: vi.fn().mockResolvedValue([]),
      getRoutingById: vi.fn().mockResolvedValue(null),
      createRouting: vi.fn().mockResolvedValue({ id: 'routing-1' }),
      updateRouting: vi.fn().mockResolvedValue({ id: 'routing-1' }),
      deleteRouting: vi.fn().mockResolvedValue({}),
    },
  }));

  // Mock work orders API
  vi.mock('@/api/workOrders', () => ({
    workOrdersApi: {
      getAllWorkOrders: vi.fn().mockResolvedValue([]),
      getWorkOrderById: vi.fn().mockResolvedValue(null),
      createWorkOrder: vi.fn().mockResolvedValue({ id: 'wo-1' }),
      updateWorkOrder: vi.fn().mockResolvedValue({ id: 'wo-1' }),
      deleteWorkOrder: vi.fn().mockResolvedValue({}),
    },
  }));

  // Mock dashboard API
  vi.mock('@/api/dashboard', () => ({
    dashboardApi: {
      getOEEMetrics: vi.fn().mockResolvedValue({
        availability: 85,
        performance: 90,
        quality: 95,
        oee: 72.7,
      }),
      getProductionSummary: vi.fn().mockResolvedValue({
        planned: 100,
        actual: 85,
        efficiency: 85,
      }),
    },
  }));
}

/**
 * Mock real-time collaboration hooks
 */
export function mockRealTimeHooks() {
  vi.mock('@/hooks/useRealTimeCollaboration', () => ({
    useRealTimeCollaboration: vi.fn(() => ({
      comments: [],
      isConnected: true,
      connectionStatus: 'connected',
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      addComment: vi.fn(),
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
    })),
  }));

  vi.mock('@/hooks/usePresence', () => ({
    usePresence: vi.fn(() => ({
      activeUsers: [],
      currentUser: null,
      isOnline: true,
      updateActivity: vi.fn(),
      setCurrentUser: vi.fn(),
    })),
  }));
}

/**
 * Mock date utilities
 */
export function mockDateUtils() {
  vi.mock('date-fns', () => ({
    formatDistanceToNow: vi.fn(() => '2 minutes ago'),
    format: vi.fn(() => '2023-01-01'),
    isValid: vi.fn(() => true),
    parseISO: vi.fn((date) => new Date(date)),
  }));
}

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  return localStorageMock;
}

/**
 * Mock sessionStorage
 */
export function mockSessionStorage() {
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });

  return sessionStorageMock;
}

/**
 * Mock window.location
 */
export function mockLocation(location: Partial<Location> = {}) {
  const mockLocation = {
    href: 'http://localhost:3000/',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    ...location,
  };

  Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
  });

  return mockLocation;
}

/**
 * Mock fetch API
 */
export function mockFetch() {
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob()),
      headers: new Headers(),
    } as Response)
  );

  global.fetch = fetchMock;
  return fetchMock;
}

/**
 * Mock console methods (useful for suppressing expected warnings/errors in tests)
 */
export function mockConsole() {
  const originalConsole = { ...console };

  const consoleMock = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  Object.assign(console, consoleMock);

  return {
    mockConsole: consoleMock,
    restoreConsole: () => Object.assign(console, originalConsole),
  };
}

/**
 * Mock timer functions
 */
export function mockTimers() {
  vi.useFakeTimers();

  return {
    advanceTimersByTime: vi.advanceTimersByTime,
    runAllTimers: vi.runAllTimers,
    runOnlyPendingTimers: vi.runOnlyPendingTimers,
    restoreTimers: vi.useRealTimers,
  };
}

/**
 * Mock WebSocket for real-time features
 */
export function mockWebSocket() {
  const mockWebSocket = {
    close: vi.fn(),
    send: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    readyState: WebSocket.OPEN,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,
  };

  global.WebSocket = vi.fn(() => mockWebSocket) as any;

  return mockWebSocket;
}

/**
 * Mock IntersectionObserver (already mocked in setup but can be customized)
 */
export function mockIntersectionObserver(mockData: Partial<IntersectionObserver> = {}) {
  const mockIntersectionObserver = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
    ...mockData,
  };

  global.IntersectionObserver = vi.fn(() => mockIntersectionObserver) as any;

  return mockIntersectionObserver;
}

/**
 * Mock ResizeObserver (already mocked in setup but can be customized)
 */
export function mockResizeObserver(mockData: Partial<ResizeObserver> = {}) {
  const mockResizeObserver = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    ...mockData,
  };

  global.ResizeObserver = vi.fn(() => mockResizeObserver) as any;

  return mockResizeObserver;
}

/**
 * Setup common mocks for most tests
 */
export function setupCommonMocks() {
  mockAllAPIs();
  mockRealTimeHooks();
  mockDateUtils();
  const localStorage = mockLocalStorage();
  const location = mockLocation();
  const fetch = mockFetch();

  return {
    localStorage,
    location,
    fetch,
  };
}

/**
 * Utility to create mock API responses
 */
export function createMockApiResponse<T>(data: T, options: Partial<Response> = {}) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    ...options,
  } as Response;
}

/**
 * Utility to create mock API error responses
 */
export function createMockApiError(message: string, status: number = 500) {
  return {
    ok: false,
    status,
    statusText: message,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(JSON.stringify({ error: message })),
  } as Response;
}