import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    watch: false, // Disable watch mode by default - use "vitest --watch" for development
    globals: true,
    // Default to node environment for backend tests
    environment: 'node',
    // Use jsdom for frontend React component tests
    environmentMatchGlobs: [
      ['frontend/**/*.test.{ts,tsx}', 'jsdom'],
    ],
    setupFiles: ['./src/tests/setup.ts'],
    // Only include .test.ts files (exclude Playwright .spec.ts files)
    include: [
      'src/**/*.test.{ts,tsx}',
      'frontend/src/**/*.test.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      'node_modules/**',
      'frontend/node_modules/**',
      'dist/**',
      'src/tests/e2e/**',      // Exclude Playwright E2E tests
      '**/*.spec.ts',          // Exclude all Playwright test files
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.config.*',
        'dist/',
        'coverage/',
        'prisma/',
        'src/types/',
        'playwright.config.ts',
        'vitest.config.ts'
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: true,
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  },
  resolve: {
    alias: {
      // Backend aliases
      '@': path.resolve(__dirname, './src'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/controllers': path.resolve(__dirname, './src/controllers'),
      '@/middleware': path.resolve(__dirname, './src/middleware'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/tests': path.resolve(__dirname, './src/tests'),
      // Frontend aliases - for tests in frontend/src
      '@/components': path.resolve(__dirname, './frontend/src/components'),
      '@/store': path.resolve(__dirname, './frontend/src/store'),
      '@/api': path.resolve(__dirname, './frontend/src/api'),
    }
  }
});