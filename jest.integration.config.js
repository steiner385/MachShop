/**
 * Jest Integration Test Configuration
 *
 * Configured for testing cross-package framework integration
 * with coverage thresholds and multi-package support
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/packages'],

  // Test patterns
  testMatch: [
    '**/__integration__/**/*.test.ts',
    '**/__integration__/**/*.test.tsx',
    '**/*.integration.test.ts',
    '**/*.integration.test.tsx',
  ],

  // Module configuration
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // TypeScript support
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },

  // Module name mapping for workspace packages
  moduleNameMapper: {
    '^@machshop/frontend-extension-sdk$': '<rootDir>/packages/frontend-extension-sdk/src',
    '^@machshop/navigation-extension-framework$': '<rootDir>/packages/navigation-extension-framework/src',
    '^@machshop/component-override-framework$': '<rootDir>/packages/component-override-framework/src',
    '^@machshop/extension-validation-framework$': '<rootDir>/packages/extension-validation-framework/src',
    '^@machshop/ui-extension-contracts$': '<rootDir>/packages/ui-extension-contracts/src',
    '^@machshop/capability-contracts$': '<rootDir>/packages/capability-contracts/src',
    '^@machshop/core-mes-ui-foundation$': '<rootDir>/packages/core-mes-ui-foundation/src',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.ts'],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx}',
    'src/services/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__integration__/**',
  ],

  coverageDirectory: '<rootDir>/coverage/integration',
  coverageReporters: ['text', 'lcov', 'json-summary', 'html'],

  // Coverage thresholds (strict for integration tests)
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Stricter thresholds for core packages
    './packages/frontend-extension-sdk/src': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './packages/extension-validation-framework/src': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  // Test timeout (integration tests may be slower)
  testTimeout: 30000,

  // Transform files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        lib: ['es2020', 'dom'],
      },
    }],
  },

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage/integration',
        outputName: 'test-results.xml',
        classNameTemplate: '{classname} - {title}',
        titleTemplate: '{classname} › {title}',
        ancestorSeparator: ' › ',
        usePathAsClassName: true,
      },
    ],
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],

  // Module name ignore patterns
  modulePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
};
