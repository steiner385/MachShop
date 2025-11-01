# ESLint Rules & Standards Enforcement Guide

## Overview

This guide documents the ESLint rules configured for the MachShop project. ESLint helps enforce code quality, security, and consistency standards across the codebase.

## Configuration Location

- **Main Config**: `.eslintrc.js`
- **Ignored Patterns**: Defined in `.eslintrc.js` ignorePatterns

## Rule Severity Levels

- **error** (🔴): Must be fixed before committing - build will fail
- **warn** (🟡): Should be addressed - reported but won't block build
- **off** (⚪): Not enforced

## Security Rules (Errors)

These rules prevent dangerous code patterns and security vulnerabilities:

### Code Execution Prevention
- `no-eval` - Never use `eval()` for code execution
- `no-implied-eval` - Don't use `eval()` through other means (setTimeout, setInterval, etc.)
- `no-new-func` - Never use `new Function()` to create functions dynamically
- `no-script-url` - Don't use `javascript:` URLs in event handlers
- `no-with` - Don't use `with` statements (can cause scope issues)

### Error Handling
- `no-unsafe-finally` - Don't return/throw in finally blocks
- `no-throw-literal` - Always throw Error objects, not strings or other types

### Type Safety (TypeScript)
- `@typescript-eslint/no-unnecessary-type-assertion` - Remove unnecessary `as Type` assertions
- `@typescript-eslint/await-thenable` - Only await Promise-like objects

## Code Quality Rules (Errors/Warnings)

These rules improve code quality and catch common mistakes:

### Variable Management
- `no-var` (error) - Use `const`/`let` instead of `var`
- `prefer-const` (error) - Use `const` when variable is never reassigned
- `no-redeclare` (error) - Don't declare same variable twice
- `no-shadow` (warn) - Avoid reusing variable names from outer scope
- `no-delete-var` (error) - Can't delete variables (only properties)
- `no-label-var` (error) - Labels can't use variable names
- `no-unused-vars` (warn) - Remove unused variables or prefix with `_`

### Code Logic
- `no-unreachable` (error) - Remove code after return/throw/continue/break
- `no-fallthrough` (error) - Add `break` or `return` between switch cases
- `no-self-assign` (error) - Don't assign variable to itself
- `no-self-compare` (error) - Don't compare variable to itself (always true/false)
- `no-dupe-keys` (error) - No duplicate object keys
- `no-dupe-class-members` (error) - No duplicate class methods
- `no-duplicate-case` (error) - No duplicate case values in switch
- `no-func-assign` (error) - Can't reassign function declarations

### Error Handling
- `no-empty` (error) - Can't have empty blocks (except for empty catch)
- `no-unused-expressions` (error) - Remove dead code expressions

## Readability Rules (Warnings)

These rules improve code clarity and maintainability:

### Code Style
- `no-console` (warn) - Use logger instead of console (except error/warn)
  ```typescript
  // ✓ GOOD
  logger.error('Something went wrong');
  logger.warn('This might be a problem');
  
  // ✗ BAD
  console.log('User created'); // Use logger instead
  ```

- `no-debugger` (warn) - Remove debugger statements before committing

- `eqeqeq` (warn) - Use `===` instead of `==`
  ```typescript
  // ✓ GOOD
  if (value === undefined) { }
  
  // ✗ BAD
  if (value == undefined) { } // Type coercion issues
  ```

- `no-else-return` (warn) - Avoid else after return
  ```typescript
  // ✓ GOOD
  if (error) {
    return handleError(error);
  }
  processResult(result);
  
  // ✗ LESS CLEAN
  if (error) {
    return handleError(error);
  } else {
    processResult(result);
  }
  ```

- `no-useless-return` (warn) - Remove unnecessary return statements
  ```typescript
  // ✓ GOOD
  if (condition) {
    doSomething();
  }
  
  // ✗ BAD
  if (condition) {
    doSomething();
    return; // Unnecessary
  }
  ```

- `prefer-template` (warn) - Use template literals instead of string concatenation
  ```typescript
  // ✓ GOOD
  const message = `Hello, ${name}!`;
  
  // ✗ BAD
  const message = 'Hello, ' + name + '!';
  ```

### Complexity Management
- `no-nested-ternary` (warn) - Avoid deeply nested ternary operators
  ```typescript
  // ✓ GOOD
  const status = isActive ? 'active' : 'inactive';
  
  // ✗ HARD TO READ
  const status = isActive ? (isVerified ? 'verified' : 'pending') : 'inactive';
  ```

- `max-depth` (warn, max 4) - Avoid deeply nested code blocks
- `max-nested-callbacks` (warn, max 3) - Avoid deeply nested callbacks

## TypeScript-Specific Rules

### Return Types
- `@typescript-eslint/explicit-function-return-type` (warn)
  - Add return type annotations to functions
  - Exceptions: arrow functions, function expressions where type can be inferred
  
  ```typescript
  // ✓ GOOD
  async function getUserById(id: string): Promise<User | null> {
    // ...
  }
  
  // ✓ ACCEPTABLE (inferred from assignment)
  const getUserCount = async () => {
    // ...
  };
  
  // ✗ SHOULD ADD TYPE
  async function getUserById(id: string) { // Missing return type
    // ...
  }
  ```

### Naming Conventions
- `@typescript-eslint/naming-convention` (warn)
  - **Variables/functions**: camelCase
  - **Constants**: UPPER_CASE (optional)
  - **Types/Interfaces**: PascalCase
  - **Enum members**: UPPER_CASE

  ```typescript
  // ✓ GOOD
  const maxRetries = 3;
  const MAX_RETRIES = 3;
  interface UserData { }
  enum Status { ACTIVE, INACTIVE }
  
  // ✗ BAD
  const MaxRetries = 3; // Should be camelCase
  const max_retries = 3; // Should be camelCase
  interface userdata { } // Should be PascalCase
  ```

### Type Safety
- `@typescript-eslint/no-explicit-any` (warn) - Avoid `any` type
- `@typescript-eslint/no-unsafe-call` (warn) - Be careful with `any` function calls
- `@typescript-eslint/no-unsafe-member-access` (warn) - Be careful accessing `any` properties
- `@typescript-eslint/prefer-nullish-coalescing` (warn) - Use `??` instead of `||` for null checks
- `@typescript-eslint/prefer-optional-chain` (warn) - Use `?.` for safe property access
- `@typescript-eslint/no-floating-promises` (warn) - Handle all promises

## Handling ESLint Violations

### When You Can't Fix It

Use ESLint disable comments (use sparingly and with explanation):

```typescript
// Disable single line
const result = eval(expression); // eslint-disable-line no-eval

// Disable rule block
/* eslint-disable no-eval */
const result = eval(expression);
/* eslint-enable no-eval */

// Disable with reason
// eslint-disable-next-line no-eval -- Necessary for dynamic expression evaluation
const result = eval(expression);

// Disable multiple rules
/* eslint-disable no-eval, no-unused-vars */
```

**Important**: Include a comment explaining WHY the rule is disabled.

### Common Exemptions

**1. Unused variables that are required**
```typescript
// ✓ Use underscore prefix
function handleEvent(_event: Event) {
  // _event is required by interface but not used
}
```

**2. Test files with mock globals**
Already configured in `.eslintrc.js` globals section.

**3. Generated code**
Excluded in `ignorePatterns`: `docs/generated/`, `prisma/generated/`

## Running ESLint

### Check for violations
```bash
npm run lint
```

### Fix auto-fixable violations
```bash
npm run lint:fix
```

### Check specific file
```bash
npx eslint src/services/UserService.ts
```

### Check with detailed output
```bash
npx eslint src --format=detailed
```

## CI/CD Integration

ESLint runs automatically in CI/CD pipeline:
- Pull requests must pass linting
- Errors block merge
- Warnings are reported but don't block

## Gradual Enforcement

The current configuration balances strictness with pragmatism:
- **Errors**: Essential rules that prevent bugs/security issues
- **Warnings**: Important rules that improve quality
- **Off**: Rules that may be too strict for legacy code

Over time, we'll gradually enforce more rules as codebase improves.

## Recommended IDE Plugins

### VSCode
- **ESLint**: Microsoft official extension
- **Prettier**: Code formatter
- Configure `.vscode/settings.json`:
  ```json
  {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "[typescript]": {
      "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "eslint.validate": [
      "javascript",
      "javascriptreact",
      "typescript",
      "typescriptreact"
    ]
  }
  ```

### WebStorm/IntelliJ
- Built-in ESLint support
- Enable: Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint

## Resources

- [ESLint Official Docs](https://eslint.org/docs/rules/)
- [TypeScript ESLint Docs](https://typescript-eslint.io/rules/)
- [MachShop Code Style Guide](./API_DESIGN_PRINCIPLES.md)
- [Security Best Practices](./SECURITY_BEST_PRACTICES.md)

