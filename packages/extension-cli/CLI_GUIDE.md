# MachShop Extension Developer CLI Guide

## Overview

The `mach-ext` CLI provides developer-friendly tools for building, testing, validating, and deploying MachShop extensions. It streamlines the entire extension lifecycle from scaffolding through production deployment.

## Installation

```bash
npm install -g @machshop/extension-cli
# or
npx @machshop/extension-cli
```

## Quick Start

### 1. Generate a New Extension

```bash
mach-ext generate my-extension --type ui-component --typescript --with-tests
```

This creates a new extension project with:
- TypeScript support
- Extension manifest
- Package configuration
- Test scaffolding
- Development server setup

### 2. Validate the Manifest

```bash
cd extension-my-extension
mach-ext validate
```

Validates your `extension.manifest.json` against the official schema.

### 3. Start Development Server

```bash
mach-ext dev --watch --hot
```

Starts local development server with hot module reloading.

### 4. Run Tests

```bash
mach-ext test --coverage
```

Executes test suite with optional coverage reporting.

### 5. Deploy Extension

```bash
mach-ext deploy production --registry https://registry.machshop.io
```

Deploys extension to target environment.

---

## Commands

### `mach-ext generate <name>`

Generate a new extension project scaffold.

**Options:**
- `-t, --type <type>` - Extension type (default: `ui-component`)
  - `ui-component` - React UI components
  - `business-logic` - Business logic handlers
  - `data-model` - Custom data models
  - `integration` - External system integration
  - `compliance` - Compliance and validation rules
  - `infrastructure` - Infrastructure services

- `-d, --directory <dir>` - Output directory (default: current directory)
- `--typescript` - Generate TypeScript project
- `--with-tests` - Include test scaffolding
- `--with-docs` - Include documentation templates

**Examples:**

```bash
# Generate JavaScript UI component
mach-ext generate my-widget --type ui-component

# Generate TypeScript with tests
mach-ext generate order-handler --type business-logic --typescript --with-tests

# Generate data model in specific directory
mach-ext generate custom-fields --type data-model --directory ./extensions --typescript
```

---

### `mach-ext validate [path]`

Validate extension manifest against schema.

**Options:**
- `-f, --format <format>` - Output format (default: `text`)
  - `text` - Human-readable output
  - `json` - JSON structured output

- `--strict` - Enable strict validation (requires all recommended fields)
- `--fix` - Attempt to auto-fix common validation errors

**Examples:**

```bash
# Validate manifest in current directory
mach-ext validate

# Validate specific manifest file
mach-ext validate ./other-extension/extension.manifest.json

# Validate with auto-fix
mach-ext validate --fix

# JSON output for CI/CD
mach-ext validate --format json
```

---

### `mach-ext dev`

Start local development server for testing extensions.

**Options:**
- `-p, --port <port>` - Server port (default: `3001`)
- `--manifest <path>` - Path to extension manifest
- `--watch` - Watch mode - reload on file changes
- `--hot` - Hot module replacement enabled

**Features:**
- Interactive test UI at `http://localhost:3001`
- API explorer at `http://localhost:3001/api`
- Live manifest reloading
- Extension API test endpoints

**Examples:**

```bash
# Start dev server
mach-ext dev

# Custom port with watch mode
mach-ext dev --port 4000 --watch --hot

# Specific manifest
mach-ext dev --manifest ./manifests/custom.manifest.json
```

---

### `mach-ext test [path]`

Run extension tests.

**Options:**
- `--watch` - Watch mode - re-run on changes
- `--coverage` - Generate coverage report
- `--format <format>` - Output format (default: `text`)
  - `text` - Human-readable test results
  - `json` - JSON structured output
  - `junit` - JUnit XML output for CI/CD

- `--match <pattern>` - Run tests matching pattern

**Examples:**

```bash
# Run all tests
mach-ext test

# Watch mode with coverage
mach-ext test --watch --coverage

# JUnit output for CI
mach-ext test --format junit > test-results.xml

# Match specific tests
mach-ext test --match "integration"
```

---

### `mach-ext deploy <environment>`

Deploy extension to target environment.

**Environments:**
- `dev` - Development environment
- `staging` - Staging/pre-production
- `production` - Production deployment
- `local` - Local deployment

**Options:**
- `-m, --manifest <path>` - Path to extension manifest
- `--registry <url>` - Extension registry URL
- `--api-key <key>` - Registry API key (or use `EXTENSION_REGISTRY_API_KEY` env var)
- `--dry-run` - Preview deployment without applying changes
- `--rollback-on-error` - Automatically rollback on error

**Deployment Process:**
1. Validates extension structure
2. Builds extension
3. Runs all tests
4. Packages extension
5. Runs pre-deployment checks
6. Uploads to registry
7. Returns deployment ID

**Examples:**

```bash
# Deploy to production
mach-ext deploy production --registry https://registry.machshop.io --api-key $API_KEY

# Dry-run deployment
mach-ext deploy staging --dry-run

# Deploy with automatic rollback
mach-ext deploy production --rollback-on-error

# Use environment variable for API key
export EXTENSION_REGISTRY_API_KEY=sk_live_...
mach-ext deploy production
```

---

## Extension Types

### UI Component

Build reusable React components integrated into MachShop UI.

```bash
mach-ext generate dashboard-widget --type ui-component --typescript
```

Structure:
```
src/
├── index.ts          # Export component
├── components/       # React components
├── styles/          # Component styles
└── utils/           # Helper functions
```

### Business Logic

Implement custom business logic and event handlers.

```bash
mach-ext generate order-processor --type business-logic --typescript
```

Structure:
```
src/
├── index.ts         # Export handlers
├── handlers/        # Event handlers
└── utils/          # Helper functions
```

### Data Model

Define custom data models and schemas.

```bash
mach-ext generate extended-fields --type data-model --typescript
```

Structure:
```
src/
├── models/         # Data model definitions
├── migrations/     # Database migrations
└── validators/     # Validation rules
```

### Integration

Connect external systems and APIs.

```bash
mach-ext generate erp-connector --type integration --typescript
```

Structure:
```
src/
├── adapters/       # External system adapters
├── mappers/        # Data transformation
└── config/         # Integration configuration
```

### Compliance

Implement compliance rules and validations.

```bash
mach-ext generate audit-rules --type compliance --typescript
```

Structure:
```
src/
├── rules/          # Compliance rules
└── validators/     # Validation logic
```

### Infrastructure

Build infrastructure services and utilities.

```bash
mach-ext generate metrics-collector --type infrastructure --typescript
```

Structure:
```
src/
├── services/       # Service implementations
└── config/         # Configuration
```

---

## Environment Variables

```bash
# Registry Configuration
EXTENSION_REGISTRY_URL=https://registry.machshop.io
EXTENSION_REGISTRY_API_KEY=sk_live_xxxxx

# Development
NODE_ENV=development
DEBUG=mach-ext:*

# Testing
TEST_TIMEOUT=30000
```

---

## Configuration Files

### extension.manifest.json

Core extension metadata and configuration:

```json
{
  "name": "my-extension",
  "type": "ui-component",
  "version": "1.0.0",
  "description": "My custom extension",
  "author": "Your Name",
  "license": "MIT",
  "extension": {
    "id": "my-extension",
    "displayName": "My Extension",
    "category": "ui-component",
    "version": "1.0.0"
  },
  "permissions": [],
  "dependencies": [],
  "scripts": {
    "dev": "mach-ext dev",
    "test": "mach-ext test",
    "build": "tsc",
    "deploy": "mach-ext deploy production"
  }
}
```

### tsconfig.json (TypeScript projects)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

---

## Common Workflows

### Complete Development Cycle

```bash
# Generate extension
mach-ext generate my-app --type ui-component --typescript --with-tests

# Enter directory
cd extension-my-app

# Start development
mach-ext dev --watch --hot

# In another terminal, run tests
mach-ext test --watch --coverage

# Validate before deployment
mach-ext validate

# Deploy to staging
mach-ext deploy staging --dry-run

# Deploy to production
mach-ext deploy production
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Validate Extension
  run: mach-ext validate --format json

- name: Run Tests
  run: mach-ext test --format junit

- name: Build
  run: npm run build

- name: Deploy to Production
  run: mach-ext deploy production --registry ${{ secrets.REGISTRY_URL }} --api-key ${{ secrets.API_KEY }}
```

### Local Testing

```bash
# Terminal 1: Start dev server
mach-ext dev --port 3001

# Terminal 2: Run tests in watch mode
mach-ext test --watch

# Open http://localhost:3001 in browser
```

---

## Troubleshooting

### Port Already in Use

```bash
mach-ext dev --port 4000  # Use different port
```

### Manifest Validation Fails

```bash
mach-ext validate --fix   # Auto-fix common issues
mach-ext validate --strict # Detailed validation
```

### Deployment Fails

```bash
mach-ext deploy production --dry-run  # Preview without deploying
```

### Check Debug Output

```bash
DEBUG=mach-ext:* mach-ext validate
```

---

## Best Practices

1. **Always validate before deploying**
   ```bash
   mach-ext validate --strict
   ```

2. **Test locally before staging**
   ```bash
   mach-ext dev --watch
   mach-ext test --coverage
   ```

3. **Use TypeScript for type safety**
   ```bash
   mach-ext generate myapp --typescript
   ```

4. **Include tests with scaffolding**
   ```bash
   mach-ext generate myapp --with-tests
   ```

5. **Use semantic versioning**
   - Update `version` in `extension.manifest.json`
   - Follow semver: `major.minor.patch`

6. **Document your extension**
   ```bash
   mach-ext generate myapp --with-docs
   ```

---

## Support

- Documentation: https://machshop.io/docs/extensions
- Issues: https://github.com/steiner385/MachShop/issues
- Community: https://machshop.community

---

## Version

Current version: 1.0.0

Run `mach-ext --version` to check your installed version.
