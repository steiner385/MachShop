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
    // ============================================================================
    // SECURITY & BEST PRACTICES - ENFORCED
    // ============================================================================

    // Prevent dangerous code patterns
    'no-eval': 'error',                           // Never use eval()
    'no-implied-eval': 'error',                   // Prevent eval() through other means
    'no-new-func': 'error',                       // No new Function() constructor
    'no-script-url': 'error',                     // No javascript: URLs
    'no-with': 'error',                           // No with statements
    'no-unsafe-finally': 'error',                 // No unsafe return/throw in finally
    'no-throw-literal': 'error',                  // Throw Error objects, not strings
    'no-unused-expressions': 'error',             // Remove dead code

    // TypeScript-specific security rules
    '@typescript-eslint/no-explicit-any': 'warn',  // Discourage 'any' type
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',

    // ============================================================================
    // CODE QUALITY - ENFORCED
    // ============================================================================

    // Variable handling
    'no-unused-vars': 'warn',                     // Warn about unused variables
    'no-undef': 'warn',                           // Warn about undefined variables
    'no-var': 'error',                            // Use const/let, not var
    'prefer-const': 'error',                      // Use const when variable not reassigned
    'no-redeclare': 'error',                      // No duplicate variable declarations
    'no-shadow': 'warn',                          // Warn about variable shadowing
    'no-delete-var': 'error',                     // Can't delete variables
    'no-label-var': 'error',                      // No labels with same name as variables

    // Code logic
    'no-unreachable': 'error',                    // Remove unreachable code
    'no-fallthrough': 'error',                    // Warn about switch fallthrough
    'no-self-assign': 'error',                    // Don't assign variable to itself
    'no-self-compare': 'error',                   // Don't compare variable to itself
    'no-dupe-keys': 'error',                      // No duplicate object keys
    'no-dupe-class-members': 'error',             // No duplicate class members
    'no-duplicate-case': 'error',                 // No duplicate case values
    'no-func-assign': 'error',                    // Can't reassign function declaration

    // Error handling
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-empty-pattern': 'warn',                   // Warn about empty destructuring

    // ============================================================================
    // READABILITY & MAINTAINABILITY - ENCOURAGED
    // ============================================================================

    // Code style (warnings, not errors)
    'no-console': ['warn', { allow: ['error', 'warn'] }],  // Allow error/warn, not log
    'no-debugger': 'warn',                        // Remove debugger statements
    'eqeqeq': ['warn', 'always'],                 // Use === instead of ==
    'no-else-return': 'warn',                     // Avoid else after return
    'no-useless-return': 'warn',                  // Remove unnecessary returns
    'no-useless-escape': 'warn',                  // Remove unnecessary escapes
    'prefer-template': 'warn',                    // Prefer template literals
    'no-nested-ternary': 'warn',                  // Avoid nested ternaries
    'max-depth': ['warn', 4],                     // Warn about deeply nested code
    'max-nested-callbacks': ['warn', 3],          // Warn about callback nesting

    // ============================================================================
    // TYPESCRIPT-SPECIFIC - ENFORCED
    // ============================================================================

    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true
      }
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
    ],
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        selector: 'default',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'allow'
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow'
      },
      {
        selector: 'typeLike',
        format: ['PascalCase']
      },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE']
      }
    ],
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/await-thenable': 'error',

    // ============================================================================
    // FORMATTING - COMMENTED OUT (Use Prettier instead)
    // ============================================================================

    'prettier/prettier': 'off',  // Formatting handled by Prettier
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