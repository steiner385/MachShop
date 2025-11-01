# @mes/eslint-plugin

ESLint plugin for MES plugin development with 10+ MES-specific rules and best practices.

## Installation

```bash
npm install --save-dev @mes/eslint-plugin eslint
```

## Quick Start

Add to your `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['plugin:@mes/eslint-plugin/recommended']
};
```

## Configuration Presets

### `recommended` (Balanced - Default)
Best for most plugins. Errors for critical issues, warnings for improvements.

```javascript
extends: ['plugin:@mes/eslint-plugin/recommended']
```

### `strict` (Production-Ready)
All rules as errors. For enterprise-critical plugins.

```javascript
extends: ['plugin:@mes/eslint-plugin/strict']
```

### `lenient` (Development)
All rules as warnings. For development and experimental plugins.

```javascript
extends: ['plugin:@mes/eslint-plugin/lenient']
```

### `typescript` (Enhanced TypeScript)
Includes TypeScript-specific rules and strict type checking.

```javascript
extends: ['plugin:@mes/eslint-plugin/typescript']
```

### `security` (Hardened)
Focuses on security rules. For security-sensitive plugins.

```javascript
extends: ['plugin:@mes/eslint-plugin/security']
```

## Rules

### Performance Rules (⚡)
- **`limit-hook-execution-time`** - Enforce 5-second maximum execution time
- **`require-pagination`** - Enforce pagination for large queries

### Security Rules (🔒)
- **`no-direct-db-access`** - Require using API layer instead of direct DB
- **`require-permission-checks`** - Require authorization validation
- **`security-linting`** - Detect security anti-patterns

### Reliability Rules (✅)
- **`require-error-handling`** - Require try-catch or error callbacks
- **`no-blocking-hooks`** - Prevent synchronous blocking operations
- **`no-unhandled-promises`** - Require all promises to be awaited

### Best Practices Rules (📋)
- **`no-console-in-production`** - Restrict console logging
- **`validate-manifest`** - Validate plugin manifest structure

## Examples

### ❌ Blocking Hooks (no-blocking-hooks)

```typescript
// BAD: Blocks the event loop
const beforeCreate = (context) => {
  const data = fs.readFileSync('/data.json');
  return context.api.create(data);
};
```

```typescript
// GOOD: Async operation
const beforeCreate = async (context) => {
  const data = await context.api.getData();
  return context.api.create(data);
};
```

### ❌ Missing Error Handling (require-error-handling)

```typescript
// BAD: No error handling
const beforeCreate = async (context) => {
  return context.api.create(data);
};
```

```typescript
// GOOD: Proper error handling
const beforeCreate = async (context) => {
  try {
    return context.api.create(data);
  } catch (error) {
    context.logger.error('Creation failed', error);
    return { error: error.message };
  }
};
```

### ❌ Direct Database Access (no-direct-db-access)

```typescript
// BAD: Bypasses authorization
const prisma = require('@prisma/client').PrismaClient;
const user = await prisma.user.findUnique({ where: { id: 1 } });
```

```typescript
// GOOD: Uses API layer
const user = await context.api.getUser(1);
```

### ❌ Missing Permission Checks (require-permission-checks)

```typescript
// BAD: No permission validation
const onDelete = async (context) => {
  return context.api.deleteWorkOrder(context.id);
};
```

```typescript
// GOOD: Permission validated
const onDelete = async (context) => {
  if (!context.user.permissions.includes('DELETE_WORK_ORDER')) {
    throw new Error('Permission denied');
  }
  return context.api.deleteWorkOrder(context.id);
};
```

### ❌ Unhandled Promises (no-unhandled-promises)

```typescript
// BAD: Fire-and-forget
const beforeCreate = async (context) => {
  context.api.notifyUser(context.userId); // Not awaited!
  return context.api.create(data);
};
```

```typescript
// GOOD: Promise handled
const beforeCreate = async (context) => {
  await context.api.notifyUser(context.userId);
  return context.api.create(data);
};
```

## IDE Integration

### VSCode

Install the ESLint extension:
```bash
code --install-extension dbaeumer.vscode-eslint
```

### Configuration

Add to `.vscode/settings.json`:

```json
{
  "eslint.enable": true,
  "eslint.validate": [
    "javascript",
    "typescript"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Pre-Commit Hooks

Install Husky for automatic linting:

```bash
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "npm run lint -- --fix"
```

## CLI Usage

```bash
# Lint files
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Specific directory
npm run lint src/hooks

# Output as JSON
npm run lint -- --format json > report.json
```

## Custom Rules

Override specific rules in your `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['plugin:@mes/eslint-plugin/recommended'],
  rules: {
    '@mes/eslint-plugin/limit-hook-execution-time': ['warn', { maxMs: 3000 }],
    '@mes/eslint-plugin/require-pagination': ['warn', { maxResults: 100 }]
  }
};
```

## Testing

```bash
# Run tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT

## Related Documentation

- [MES Plugin Development Guide](../../docs/plugin-development.md)
- [Phase 1: Testing Framework](../cli/README.md)
- [Phase 2: Enhanced Testing](../../ISSUE_340_PHASE2_ENHANCED_TESTING.md)
- [Phase 3: Code Quality](../../ISSUE_341_PHASE3_CODE_QUALITY_ESLINT.md)
