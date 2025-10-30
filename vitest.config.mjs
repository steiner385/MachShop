import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: [
        'src/**/*.{ts,tsx}',
        'frontend/src/**/*.{ts,tsx}'
      ],
      exclude: [
        'node_modules/',
        'src/tests/',
        'frontend/src/test/',
        'frontend/src/**/__tests__/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.config.*',
        'dist/',
        'coverage/',
        'prisma/',
        'src/types/',
        'frontend/src/types/',
        'playwright.config.ts',
        'vitest.config.mjs',
        'frontend/src/vite-env.d.ts'
      ],
      thresholds: {
        global: {
          branches: 5,
          functions: 5,
          lines: 5,
          statements: 5
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
      '@': resolve(__dirname, './src'),
      '@/types': resolve(__dirname, './src/types'),
      '@/services': resolve(__dirname, './src/services'),
      '@/controllers': resolve(__dirname, './src/controllers'),
      '@/middleware': resolve(__dirname, './src/middleware'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/tests': resolve(__dirname, './src/tests'),
      // Frontend aliases - for tests in frontend/src
      '@/components': resolve(__dirname, './frontend/src/components'),
      '@/store': resolve(__dirname, './frontend/src/store'),
      '@/api': resolve(__dirname, './frontend/src/api'),
    }
  }
});