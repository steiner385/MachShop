# Migration Guide

## Table of Contents

- [Introduction](#introduction)
- [Overview of Changes](#overview-of-changes)
- [Migration Steps](#migration-steps)
- [Component API Updates](#component-api-updates)
- [State Management Changes](#state-management-changes)
- [Manifest Format Updates](#manifest-format-updates)
- [Testing Migration](#testing-migration)
- [Rollout Strategy](#rollout-strategy)
- [Troubleshooting](#troubleshooting)

## Introduction

This guide helps you migrate your extension from Version 1.0 to Version 2.0. We've made significant improvements to performance, developer experience, and capabilities while maintaining backward compatibility where possible.

### Migration Timeline

- **Planning**: 1-2 weeks - Review changes and plan migration
- **Development**: 2-4 weeks - Implement changes and test
- **Testing**: 1-2 weeks - Comprehensive testing across environments
- **Deployment**: 1 week - Gradual rollout to production

### Support

During the migration period, both V1.0 and V2.0 will be supported. V1.0 support will be deprecated 6 months after V2.0 release.

## Overview of Changes

### Breaking Changes

1. **Manifest Format**: Updated schema with new required fields
2. **Component API**: Standardized prop names and event handlers
3. **State Management**: New context-based approach
4. **Permission System**: Enhanced RBAC with granular permissions
5. **Theme System**: Complete redesign with CSS variables
6. **Build System**: Migration to Vite from Webpack
7. **Testing Framework**: Migration to Vitest from Jest

### New Features

1. **Dark Mode**: Built-in support with automatic detection
2. **Performance**: Code splitting and lazy loading
3. **Accessibility**: Enhanced WCAG 2.1 AA compliance
4. **TypeScript**: Full type safety throughout
5. **React 18**: Support for concurrent features
6. **Extension Dependencies**: Support for inter-extension communication

### Deprecated Features

1. ~~`useExtensionConfig`~~ → Use `useExtension` instead
2. ~~`ExtensionProvider`~~ → Use `ExtensionContext` instead
3. ~~Class-based components~~ → Migrate to functional components
4. ~~Custom build scripts~~ → Use standardized build configuration

## Migration Steps

### Step 1: Update Dependencies

```bash
# Update package.json
npm install @machshop/extension-sdk@^2.0.0
npm install react@^18.0.0 react-dom@^18.0.0
npm install typescript@^5.0.0

# Update dev dependencies
npm install --save-dev vite@^5.0.0
npm install --save-dev vitest@^1.0.0
npm install --save-dev @vitejs/plugin-react@^4.0.0

# Remove old dependencies
npm uninstall webpack webpack-cli webpack-dev-server
npm uninstall jest @types/jest
```

Update your `package.json`:

```json
{
  "name": "my-extension",
  "version": "2.0.0",
  "dependencies": {
    "@machshop/extension-sdk": "^2.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest",
    "preview": "vite preview"
  }
}
```

### Step 2: Update Build Configuration

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'MyExtension',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
```

Delete old configuration files:
- `webpack.config.js`
- `jest.config.js`
- `.babelrc`

### Step 3: Update TypeScript Configuration

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Paths */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Step 4: Update Manifest File

Migrate from V1 to V2 manifest format:

**V1 Manifest (manifest.json):**
```json
{
  "name": "my-extension",
  "version": "1.0.0",
  "description": "My extension",
  "entry": "index.js",
  "config": {
    "setting1": "value1"
  }
}
```

**V2 Manifest (extension.manifest.json):**
```json
{
  "$schema": "https://machshop.dev/schemas/extension-manifest-v2.json",
  "manifestVersion": 2,
  "id": "my-extension",
  "version": "2.0.0",
  "name": "My Extension",
  "description": "My extension with enhanced features",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "icon": "icon.svg",
  "entryPoint": "dist/index.js",
  "permissions": [
    "storage.read",
    "storage.write",
    "api.user.read"
  ],
  "extensionPoints": {
    "dashboard": {
      "component": "DashboardWidget",
      "position": "top-right"
    },
    "settings": {
      "component": "SettingsPanel"
    }
  },
  "dependencies": [],
  "configuration": {
    "schema": {
      "type": "object",
      "properties": {
        "setting1": {
          "type": "string",
          "default": "value1",
          "description": "First setting"
        },
        "setting2": {
          "type": "boolean",
          "default": false,
          "description": "Second setting"
        }
      }
    }
  },
  "lifecycle": {
    "onInstall": "handleInstall",
    "onUninstall": "handleUninstall",
    "onUpdate": "handleUpdate"
  }
}
```

### Step 5: Migrate Extension Entry Point

**V1 Entry Point:**
```typescript
// src/index.tsx (V1)
import React from 'react';
import { ExtensionProvider } from '@machshop/extension-sdk/v1';
import App from './App';

export default function Extension() {
  return (
    <ExtensionProvider>
      <App />
    </ExtensionProvider>
  );
}
```

**V2 Entry Point:**
```typescript
// src/index.tsx (V2)
import React from 'react';
import { createExtension } from '@machshop/extension-sdk';
import { DashboardWidget } from './components/DashboardWidget';
import { SettingsPanel } from './components/SettingsPanel';

export default createExtension({
  id: 'my-extension',
  version: '2.0.0',

  components: {
    DashboardWidget,
    SettingsPanel,
  },

  lifecycle: {
    onInstall: async (context) => {
      console.log('Extension installed', context);
      // Initialize extension data
    },

    onUninstall: async (context) => {
      console.log('Extension uninstalled', context);
      // Cleanup extension data
    },

    onUpdate: async (context, previousVersion) => {
      console.log(`Updated from ${previousVersion} to ${context.version}`);
      // Migrate data if needed
    },
  },
});
```

## Component API Updates

### Hook Naming Changes

```typescript
// V1
import { useExtensionConfig, useExtensionStorage } from '@machshop/extension-sdk/v1';

function MyComponent() {
  const config = useExtensionConfig();
  const [data, setData] = useExtensionStorage('key');
}

// V2
import { useExtension, useStorage } from '@machshop/extension-sdk';

function MyComponent() {
  const { config } = useExtension();
  const [data, setData] = useStorage('key');
}
```

### Event Handler Standardization

```typescript
// V1: Mixed naming conventions
<Button onButtonClick={handleClick} />
<Input onValueChange={handleChange} />

// V2: Standardized naming
<Button onClick={handleClick} />
<Input onChange={handleChange} />
```

### Component Prop Updates

```typescript
// V1
interface ButtonProps {
  label: string;
  clickHandler: () => void;
  variant: 'primary' | 'secondary';
}

// V2
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
}
```

### Migration Example

```typescript
// V1 Component
class UserProfile extends React.Component {
  render() {
    const { user, onUpdate } = this.props;

    return (
      <div className="profile">
        <h2>{user.name}</h2>
        <Button
          label="Edit"
          clickHandler={() => onUpdate(user)}
          variant="primary"
        />
      </div>
    );
  }
}

// V2 Component (Migrated)
import { useCallback } from 'react';
import { Button } from '@machshop/extension-sdk/components';

interface UserProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

export function UserProfile({ user, onUpdate }: UserProfileProps) {
  const handleUpdate = useCallback(() => {
    onUpdate(user);
  }, [user, onUpdate]);

  return (
    <div className="profile">
      <h2>{user.name}</h2>
      <Button
        onClick={handleUpdate}
        variant="primary"
      >
        Edit
      </Button>
    </div>
  );
}
```

## State Management Changes

### Context-Based State

```typescript
// V1: Global state
import { useGlobalState } from '@machshop/extension-sdk/v1';

function MyComponent() {
  const [state, setState] = useGlobalState('myKey');
}

// V2: Extension context
import { useExtension } from '@machshop/extension-sdk';
import { useState } from 'react';

function MyComponent() {
  const { storage } = useExtension();
  const [state, setState] = useState(() => storage.get('myKey'));

  const updateState = (value) => {
    setState(value);
    storage.set('myKey', value);
  };
}
```

### Storage API Migration

```typescript
// V1
import { extensionStorage } from '@machshop/extension-sdk/v1';

// Synchronous API
const value = extensionStorage.get('key');
extensionStorage.set('key', 'value');

// V2
import { useStorage } from '@machshop/extension-sdk';

// Hook-based API with React integration
function MyComponent() {
  const [value, setValue] = useStorage('key', 'defaultValue');

  // Automatically persists and syncs across components
  const updateValue = () => {
    setValue('newValue');
  };
}

// Or use storage context directly
import { useExtension } from '@machshop/extension-sdk';

function MyComponent() {
  const { storage } = useExtension();

  useEffect(() => {
    const loadData = async () => {
      const value = await storage.get('key');
      console.log(value);
    };

    loadData();
  }, [storage]);
}
```

### Permission Context

```typescript
// V1: Direct permission checks
import { hasPermission } from '@machshop/extension-sdk/v1';

function MyComponent() {
  if (hasPermission('edit')) {
    return <EditButton />;
  }
}

// V2: Permission hooks and context
import { usePermission } from '@machshop/extension-sdk';

function MyComponent() {
  const { hasPermission } = usePermission('edit');

  if (!hasPermission) {
    return null;
  }

  return <EditButton />;
}
```

## Manifest Format Updates

### Required Fields

V2 manifests require additional fields:

```json
{
  "$schema": "https://machshop.dev/schemas/extension-manifest-v2.json",
  "manifestVersion": 2,  // Required
  "id": "my-extension",   // Required (was "name" in V1)
  "version": "2.0.0",     // Required (must be semver)
  "name": "My Extension", // Required (display name)
  "author": {             // Required
    "name": "Your Name",
    "email": "you@example.com"
  },
  "permissions": []       // Required (even if empty)
}
```

### Extension Points

V1 used simple component registration:

```json
{
  "components": {
    "dashboard": "DashboardComponent"
  }
}
```

V2 uses structured extension points:

```json
{
  "extensionPoints": {
    "dashboard": {
      "component": "DashboardWidget",
      "position": "top-right",
      "width": "medium",
      "height": "small"
    },
    "toolbar": {
      "component": "ToolbarButton",
      "icon": "gear",
      "tooltip": "Open settings"
    }
  }
}
```

### Configuration Schema

V1 had loose configuration:

```json
{
  "config": {
    "apiKey": "",
    "enabled": true
  }
}
```

V2 requires JSON Schema:

```json
{
  "configuration": {
    "schema": {
      "type": "object",
      "properties": {
        "apiKey": {
          "type": "string",
          "title": "API Key",
          "description": "Your API key for authentication",
          "minLength": 1
        },
        "enabled": {
          "type": "boolean",
          "title": "Enable Extension",
          "default": true
        }
      },
      "required": ["apiKey"]
    }
  }
}
```

## Testing Migration

### Test Framework Changes

```typescript
// V1: Jest
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});

// V2: Vitest (mostly compatible)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Mock Updates

```typescript
// V1: Jest mocks
jest.mock('@machshop/extension-sdk/v1', () => ({
  useExtensionConfig: () => ({ apiKey: 'test' }),
}));

// V2: Vitest mocks
import { vi } from 'vitest';

vi.mock('@machshop/extension-sdk', () => ({
  useExtension: () => ({
    config: { apiKey: 'test' },
    storage: {
      get: vi.fn(),
      set: vi.fn(),
    },
  }),
}));
```

### Test Configuration

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
});
```

## Rollout Strategy

### Phase 1: Development (Week 1-2)

1. **Create Migration Branch**
   ```bash
   git checkout -b migration/v2
   ```

2. **Update Dependencies**
   - Install V2 SDK
   - Update build tools
   - Update testing frameworks

3. **Update Configuration**
   - Migrate build config
   - Update TypeScript config
   - Create new manifest

4. **Run in Parallel**
   - Keep V1 code in separate directory
   - Test V2 changes independently

### Phase 2: Component Migration (Week 3-4)

1. **Migrate Components Incrementally**
   ```
   Priority:
   1. Entry point and core hooks
   2. Shared components
   3. Feature components
   4. Utility components
   ```

2. **Update Tests**
   - Migrate test files alongside components
   - Ensure test coverage remains above 80%

3. **Fix Type Errors**
   - Address TypeScript errors
   - Update type definitions

### Phase 3: Testing (Week 5-6)

1. **Unit Tests**
   - Run all tests
   - Fix failing tests
   - Add missing coverage

2. **Integration Tests**
   - Test extension points
   - Test inter-extension communication
   - Test permission system

3. **E2E Tests**
   - Test complete user workflows
   - Test in different environments
   - Performance testing

### Phase 4: Deployment (Week 7)

1. **Staging Deployment**
   - Deploy to staging environment
   - Internal testing
   - Fix critical issues

2. **Beta Release**
   - Deploy to beta users (10%)
   - Monitor for issues
   - Gather feedback

3. **Gradual Rollout**
   - 25% of users (Day 1-2)
   - 50% of users (Day 3-4)
   - 100% of users (Day 5-7)

4. **Monitor and Support**
   - Track error rates
   - Monitor performance metrics
   - Provide user support

## Troubleshooting

### Common Issues

#### Build Errors

**Issue**: Module not found errors
```
Error: Cannot find module '@machshop/extension-sdk/v1'
```

**Solution**: Update imports to V2
```typescript
// Change
import { useExtension } from '@machshop/extension-sdk/v1';

// To
import { useExtension } from '@machshop/extension-sdk';
```

#### Type Errors

**Issue**: Type incompatibilities
```
Type 'string' is not assignable to type 'ComponentType'
```

**Solution**: Update component registration
```typescript
// V1
components: {
  dashboard: 'DashboardComponent'
}

// V2
components: {
  DashboardComponent
}
```

#### Runtime Errors

**Issue**: Hook errors
```
Error: Invalid hook call. Hooks can only be called inside of the body of a function component.
```

**Solution**: Ensure hooks are used correctly in functional components
```typescript
// Bad
class MyComponent extends React.Component {
  render() {
    const { config } = useExtension(); // ❌ Can't use hooks in class
  }
}

// Good
function MyComponent() {
  const { config } = useExtension(); // ✅ Hooks in functional component
}
```

### Migration Checklist

Use this checklist to track your migration progress:

- [ ] Update package.json dependencies
- [ ] Create Vite configuration
- [ ] Update TypeScript configuration
- [ ] Migrate manifest to V2 format
- [ ] Update extension entry point
- [ ] Migrate all components to functional components
- [ ] Update hook imports
- [ ] Migrate state management
- [ ] Update permission checks
- [ ] Migrate test files to Vitest
- [ ] Update test mocks
- [ ] Run all tests and fix failures
- [ ] Update documentation
- [ ] Test in development environment
- [ ] Deploy to staging
- [ ] Beta testing
- [ ] Production deployment
- [ ] Monitor and support

### Getting Help

If you encounter issues during migration:

1. **Documentation**: Check the [V2 API Documentation](./API_REFERENCE.md)
2. **Examples**: Review the [migration examples](./examples/migration/)
3. **Support**: Contact support@machshop.dev
4. **Community**: Join our [Discord server](https://discord.gg/machshop)
5. **Issues**: Report bugs on [GitHub](https://github.com/machshop/extensions/issues)

---

## Summary

Migrating to V2 involves:

1. **Update Dependencies**: Install V2 SDK and tools
2. **Update Configuration**: Migrate to Vite and update configs
3. **Update Manifest**: Use V2 manifest format with schema
4. **Migrate Components**: Convert to functional components
5. **Update State**: Use new context-based state management
6. **Migrate Tests**: Switch to Vitest
7. **Test Thoroughly**: Ensure everything works
8. **Deploy Gradually**: Roll out to users incrementally

The migration typically takes 4-7 weeks. Plan accordingly and test thoroughly before deploying to production.
