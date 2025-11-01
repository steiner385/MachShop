/**
 * ESLint Plugin Configuration Presets
 * Provides recommended configurations for different plugin development scenarios
 */

export interface ESLintConfig {
  plugins: string[];
  rules: Record<string, string | [string, Record<string, any>]>;
  parserOptions?: Record<string, any>;
  env?: Record<string, boolean>;
}

/**
 * Strict configuration - enforces all rules as errors
 * Recommended for production plugins
 */
export const strictConfig: ESLintConfig = {
  plugins: ['@mes/eslint-plugin'],
  rules: {
    '@mes/eslint-plugin/no-blocking-hooks': 'error',
    '@mes/eslint-plugin/require-error-handling': 'error',
    '@mes/eslint-plugin/limit-hook-execution-time': 'error',
    '@mes/eslint-plugin/no-direct-db-access': 'error',
    '@mes/eslint-plugin/require-permission-checks': 'error',
    '@mes/eslint-plugin/no-unhandled-promises': 'error',
    '@mes/eslint-plugin/no-console-in-production': 'error',
    '@mes/eslint-plugin/require-pagination': 'error',
    '@mes/eslint-plugin/validate-manifest': 'error',
    '@mes/eslint-plugin/security-linting': 'error'
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    node: true,
    es2020: true
  }
};

/**
 * Recommended configuration - balances strictness with practicality
 * Recommended for most plugins
 */
export const recommendedConfig: ESLintConfig = {
  plugins: ['@mes/eslint-plugin'],
  rules: {
    '@mes/eslint-plugin/no-blocking-hooks': 'error',
    '@mes/eslint-plugin/require-error-handling': 'error',
    '@mes/eslint-plugin/limit-hook-execution-time': 'warn',
    '@mes/eslint-plugin/no-direct-db-access': 'error',
    '@mes/eslint-plugin/require-permission-checks': 'error',
    '@mes/eslint-plugin/no-unhandled-promises': 'error',
    '@mes/eslint-plugin/no-console-in-production': 'warn',
    '@mes/eslint-plugin/require-pagination': 'warn',
    '@mes/eslint-plugin/validate-manifest': 'error',
    '@mes/eslint-plugin/security-linting': 'error'
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    node: true,
    es2020: true
  }
};

/**
 * Lenient configuration - warnings only for development
 * Recommended for development and testing
 */
export const lenientConfig: ESLintConfig = {
  plugins: ['@mes/eslint-plugin'],
  rules: {
    '@mes/eslint-plugin/no-blocking-hooks': 'warn',
    '@mes/eslint-plugin/require-error-handling': 'warn',
    '@mes/eslint-plugin/limit-hook-execution-time': 'warn',
    '@mes/eslint-plugin/no-direct-db-access': 'warn',
    '@mes/eslint-plugin/require-permission-checks': 'warn',
    '@mes/eslint-plugin/no-unhandled-promises': 'warn',
    '@mes/eslint-plugin/no-console-in-production': 'off',
    '@mes/eslint-plugin/require-pagination': 'off',
    '@mes/eslint-plugin/validate-manifest': 'warn',
    '@mes/eslint-plugin/security-linting': 'warn'
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    node: true,
    es2020: true
  }
};

/**
 * TypeScript configuration - enhanced for TypeScript plugins
 * Recommended for TypeScript-based plugins
 */
export const typescriptConfig: ESLintConfig = {
  plugins: ['@mes/eslint-plugin', '@typescript-eslint'],
  rules: {
    '@mes/eslint-plugin/no-blocking-hooks': 'error',
    '@mes/eslint-plugin/require-error-handling': 'error',
    '@mes/eslint-plugin/limit-hook-execution-time': 'warn',
    '@mes/eslint-plugin/no-direct-db-access': 'error',
    '@mes/eslint-plugin/require-permission-checks': 'error',
    '@mes/eslint-plugin/no-unhandled-promises': 'error',
    '@mes/eslint-plugin/no-console-in-production': 'warn',
    '@mes/eslint-plugin/require-pagination': 'warn',
    '@mes/eslint-plugin/validate-manifest': 'error',
    '@mes/eslint-plugin/security-linting': 'error',
    '@typescript-eslint/explicit-function-return-types': 'error',
    '@typescript-eslint/no-implicit-any': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error'
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  env: {
    node: true,
    es2020: true
  }
};

/**
 * Security-focused configuration
 * Recommended for plugins handling sensitive data
 */
export const securityConfig: ESLintConfig = {
  plugins: ['@mes/eslint-plugin', 'security'],
  rules: {
    '@mes/eslint-plugin/require-permission-checks': 'error',
    '@mes/eslint-plugin/security-linting': 'error',
    '@mes/eslint-plugin/no-direct-db-access': 'error',
    '@mes/eslint-plugin/no-console-in-production': 'error',
    '@mes/eslint-plugin/no-blocking-hooks': 'error',
    '@mes/eslint-plugin/require-error-handling': 'error',
    '@mes/eslint-plugin/no-unhandled-promises': 'error'
  }
};

export const configs = {
  strict: strictConfig,
  recommended: recommendedConfig,
  lenient: lenientConfig,
  typescript: typescriptConfig,
  security: securityConfig
};
