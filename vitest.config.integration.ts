/**
 * Vitest Configuration for Integration Tests
 *
 * Optimized for memory-intensive integration tests with:
 * - Single worker to control memory usage
 * - Increased timeouts for complex operations
 * - Focused on src/__tests__ directory
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global setup file for test environment initialization
    setupFiles: ['./src/tests/setup.ts'],

    // Pool configuration - single worker for integration tests
    // This prevents memory explosion from parallel execution of data-intensive tests
    pool: 'threads',
    poolOptions: {
      threads: {
        // Run integration tests sequentially with single worker
        // This is critical for tests that create large datasets
        maxThreads: 1,
        minThreads: 1,
        isolate: true,
        // Disable threading pooling for maximum memory efficiency
        singleThread: true,
      }
    },

    // Increase test timeout for complex integration tests
    testTimeout: 60000,  // 60 seconds for integration tests

    // Hook timeout for setup/teardown operations
    hookTimeout: 60000,

    // File patterns - focus on integration tests only
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],

    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ]
    },

    // Global test settings
    globals: true,

    // Reporters
    reporters: ['default'],

    // Enable memory logging for debugging
    logHeapUsage: true,

    // Bail on first failure to prevent cascading OOM errors
    bail: 1,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
