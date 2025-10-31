// IMPORTANT: Environment variables are now loaded automatically from .env.test
// when NODE_ENV=test is set in package.json. No need to hardcode them here.
// Ensure NODE_ENV is set to test to load the correct environment file
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Clear any cached Prisma instances to force fresh connection
declare global {
  var __prisma: any;
}
global.__prisma = undefined;

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Mock window.matchMedia for Ant Design components (frontend tests only)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Global test setup
beforeAll(async () => {
  // Setup test database, mock services, etc.
  // Environment variables are already set at the top of this file
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(async () => {
  // Reset state before each test
});

afterEach(async () => {
  // Cleanup after each test
});

// NOTE: Removed global Date.now() mock that was causing timestamp collisions
// in parallel test execution. Tests should use explicit timestamps when
// deterministic values are needed, rather than a global mock that affects
// all parallel workers identically.
//
// For tests requiring consistent timestamps, use test-specific mocks:
// const fixedTimestamp = new Date('2024-01-15T10:30:00Z').getTime();
// vi.spyOn(Date, 'now').mockReturnValue(fixedTimestamp);