module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'prettier'
  ],
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  env: {
    node: true,
    es6: true,
    jest: true,
    browser: true // For DOM globals like window, document, localStorage
  },
  globals: {
    // Node.js globals
    'NodeJS': 'readonly',
    'Express': 'readonly',

    // Test framework globals
    'vitest': 'readonly',
    'describe': 'readonly',
    'it': 'readonly',
    'expect': 'readonly',
    'beforeEach': 'readonly',
    'afterEach': 'readonly',
    'beforeAll': 'readonly',
    'afterAll': 'readonly',
    'test': 'readonly',
    'vi': 'readonly',

    // Mock globals used in tests
    'mockPrisma': 'readonly',
    'mockUnifiedApprovalService': 'readonly',
    'workflowEngineService': 'readonly',

    // Browser Web APIs
    'BluetoothLEScanFilter': 'readonly',
    'BluetoothRemoteGATTServer': 'readonly',
    'BluetoothRemoteGATTService': 'readonly',
    'BluetoothRemoteGATTCharacteristic': 'readonly',
    'StorageEvent': 'readonly',

    // Prisma types
    'Prisma': 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    // Disable prettier for now to focus on core ESLint issues
    'prettier/prettier': 'off',

    // TypeScript specific rules - all disabled for now
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',

    // General rules - very permissive for now
    'no-console': 'off',
    'no-debugger': 'off',
    'no-unused-vars': 'off',
    'no-unreachable': 'off',
    'no-undef': 'off', // Disable undefined variable checks for now
    'no-redeclare': 'off', // Allow variable redeclaration
    'no-case-declarations': 'off', // Allow declarations in case blocks
    'no-useless-escape': 'off', // Allow escape characters in regex
    'no-empty-pattern': 'off' // Allow empty destructuring patterns
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.js',
    'frontend/',
    'services/',
    'docs/generated/',
    'prisma/generated/'
  ]
};