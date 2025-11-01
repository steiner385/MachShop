/**
 * Vitest Configuration
 *
 * Configures test execution with memory optimization and proper cleanup
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global setup file for test environment initialization
    setupFiles: ['./src/tests/setup.ts'],

    // Pool configuration - use threads with limited concurrency to prevent memory exhaustion
    // Using a single thread pool with limited workers to control memory usage
    pool: 'threads',
    poolOptions: {
      threads: {
        // Limit number of concurrent workers to 2 to prevent heap exhaustion
        // This is critical for test suites with large data or memory-intensive operations
        maxThreads: 2,
        minThreads: 1,
        // Isolate each thread to prevent state leakage between tests
        isolate: true,
        // Timeout for worker setup
        singleThread: false,
      }
    },

    // Increase test timeout for slower tests and complex operations
    testTimeout: 30000,

    // Hook timeout for setup/teardown operations
    hookTimeout: 30000,

    // File patterns
    include: ['src/tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'src/tests/e2e/**', 'src/__tests__/**'],

    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        'src/__tests__/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ]
    },

    // Global test settings
    globals: true,

    // Reporters
    reporters: ['default'],

    // Enable detailed error logging for memory debugging
    logHeapUsage: false,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
