# MachShop Extension Developer Guide

**Version**: 2.0.0

Complete guide for developing MachShop extensions using the Extension Framework v2.0.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Extension Manifest](#extension-manifest)
4. [Building Your First Extension](#building-your-first-extension)
5. [Using the Frontend Extension SDK](#using-the-frontend-extension-sdk)
6. [Registering Navigation](#registering-navigation)
7. [Component Overrides](#component-overrides)
8. [State Management](#state-management)
9. [API Integration](#api-integration)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript knowledge
- React 18+ experience
- Ant Design familiarity

### Setup

```bash
# Create extension directory
mkdir my-machshop-extension
cd my-machshop-extension

# Initialize npm project
npm init -y

# Install dependencies
npm install react react-dom antd zustand @tanstack/react-query
npm install --save-dev typescript @types/react @types/node
npm install @machshop/frontend-extension-sdk @machshop/navigation-extension-framework

# Initialize TypeScript
npx tsc --init
```

### Project Setup

```bash
# Create source directory
mkdir src

# Create entry point
touch src/index.tsx

# Create manifest
touch manifest.json
```

## Project Structure

```
my-extension/
├── src/
│   ├── index.tsx              # Entry point
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── Form.tsx
│   │   └── List.tsx
│   ├── hooks/
│   │   ├── useMyData.ts
│   │   └── useMyForm.ts
│   ├── stores/
│   │   └── myStore.ts
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── index.css
├── manifest.json              # Extension metadata
├── package.json
├── tsconfig.json
└── README.md
```

## Extension Manifest

```json
{
  "id": "my-extension",
  "name": "My Custom Extension",
  "version": "1.0.0",
  "author": "Your Company",
  "description": "Description of what your extension does",
  "manifest_version": "2.0.0",
  "capabilities": [
    {
      "id": "workorders:read",
      "description": "Read work orders"
    }
  ],
  "ui_components": [
    {
      "id": "dashboard-widget",
      "name": "Custom Dashboard Widget",
      "type": "widget",
      "slot": "dashboard-widgets",
      "permissions": ["workorders:read"],
      "category": "monitoring"
    }
  ],
  "navigation": [
    {
      "id": "my-feature",
      "label": "My Feature",
      "path": "/my-feature",
      "group": "production",
      "icon": "FileOutlined",
      "permissions": ["my-extension:access"]
    }
  ],
  "configurations": {
    "max_items": {
      "type": "number",
      "default": 10,
      "description": "Maximum items to display"
    }
  }
}
```

## Building Your First Extension

### Step 1: Create Entry Point

```typescript
// src/index.tsx
import React from 'react';
import { ExtensionContextProvider, createExtensionContext } from '@machshop/frontend-extension-sdk';
import { initializeNavigationFramework } from '@machshop/navigation-extension-framework';
import MyDashboard from './components/Dashboard';

// Initialize frameworks
async function initializeExtension() {
  await initializeNavigationFramework();
}

initializeExtension();

// Create extension context
const context = createExtensionContext({
  siteId: process.env.REACT_APP_SITE_ID || 'site-default',
  extensionId: 'my-extension',
  userPermissions: [], // Set from parent app
  userRoles: [], // Set from parent app
});

// Export component for parent app to render
export function MyExtension() {
  return (
    <ExtensionContextProvider value={context}>
      <MyDashboard />
    </ExtensionContextProvider>
  );
}

export default MyExtension;
```

### Step 2: Create Dashboard Component

```typescript
// src/components/Dashboard.tsx
import React from 'react';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import { useTheme, usePermission, useExtensionContext } from '@machshop/frontend-extension-sdk';
import { useRegisterNavigationItem } from '@machshop/navigation-extension-framework';
import useMyData from '../hooks/useMyData';

export function Dashboard() {
  const { tokens } = useTheme();
  const { hasPermission } = usePermission();
  const context = useExtensionContext();
  const { data, loading, error } = useMyData();

  // Register navigation
  useRegisterNavigationItem({
    id: 'my-extension:dashboard',
    label: 'My Dashboard',
    path: '/my-dashboard',
    groupId: 'production',
    icon: 'DashboardOutlined',
    visibility: {
      requiredPermissions: ['my-extension:read'],
    },
  });

  if (!hasPermission('my-extension:read')) {
    return <div>You don't have permission to view this page</div>;
  }

  if (loading) {
    return <Spin />;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div style={{ padding: tokens.spacingLg }}>
      <h1 style={{
        fontSize: tokens.fontSizeHeading1,
        marginBottom: tokens.spacingMd,
      }}>
        My Dashboard
      </h1>

      <Row gutter={[tokens.spacingMd, tokens.spacingMd]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Items"
              value={data?.activeCount || 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={data?.completedCount || 0}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
```

### Step 3: Create Custom Hook

```typescript
// src/hooks/useMyData.ts
import { useState, useEffect } from 'react';
import { useExtensionContext } from '@machshop/frontend-extension-sdk';
import { apiClient } from '../services/api';

interface MyData {
  activeCount: number;
  completedCount: number;
}

export function useMyData() {
  const context = useExtensionContext();
  const [data, setData] = useState<MyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await apiClient.get('/my-extension/data');
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        context.logger.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [context]);

  return { data, loading, error };
}

export default useMyData;
```

## Using the Frontend Extension SDK

### Extension Context

Access runtime information:

```typescript
import { useExtensionContext } from '@machshop/frontend-extension-sdk';

export function MyComponent() {
  const {
    siteId,           // Multi-tenant site ID
    extensionId,      // Your extension ID
    userPermissions,  // User's permissions
    userRoles,        // User's roles
    theme,            // Theme config
    logger,           // Logger instance
    apiClient,        // API client
  } = useExtensionContext();

  return <div>Site: {siteId}</div>;
}
```

### Theme Utilities

Access design tokens and theme:

```typescript
import { useTheme } from '@machshop/frontend-extension-sdk';

export function ThemedComponent() {
  const {
    tokens,       // 60+ design tokens
    mode,         // 'light' or 'dark'
    isDark,       // boolean
    toggleTheme,  // () => void
    token,        // (name) => CSS var
  } = useTheme();

  return (
    <div style={{
      color: tokens.colorTextPrimary,
      backgroundColor: tokens.colorBgPrimary,
      padding: tokens.spacingMd,
    }}>
      Current: {mode}
    </div>
  );
}
```

### Permission Checking

Check user permissions:

```typescript
import { usePermission, ProtectedComponent } from '@machshop/frontend-extension-sdk';

// Hook-based
export function EditButton() {
  const { hasPermission } = usePermission();

  if (!hasPermission('my-extension:write')) {
    return <div>Read-only</div>;
  }

  return <button>Edit</button>;
}

// Component-based
export function AdminPanel() {
  return (
    <ProtectedComponent
      permission="admin:manage"
      fallback={<div>Access denied</div>}
    >
      <AdminContent />
    </ProtectedComponent>
  );
}
```

## Registering Navigation

Register menu items dynamically:

```typescript
import { useRegisterNavigationItem } from '@machshop/navigation-extension-framework';

export function MyExtension() {
  const result = useRegisterNavigationItem({
    id: 'my-extension:reports',
    label: 'Custom Reports',
    path: '/reports',
    groupId: 'production',
    icon: 'FileOutlined',
    order: 100,
    visibility: {
      requiredPermissions: ['reports:read'],
      requirementMode: 'all',
    },
  });

  if (!result.registered) {
    console.error('Failed to register navigation');
  }

  return <ReportsPage />;
}
```

## Component Overrides

Override core components safely:

```typescript
import { useRegisterComponentOverride } from '@machshop/component-override-framework';

export function MyExtension() {
  // Override production page with custom version
  const result = useRegisterComponentOverride({
    contractId: 'core:production-page',
    component: CustomProductionPage,
    extensionId: 'my-extension',
    siteId: 'site-123',
    fallback: DefaultProductionPage, // Fallback if error
    priority: 100,
  });

  if (!result.registered) {
    console.error('Validation failed:', result.validation.errors);
  }

  return null; // Registration happens automatically
}

// Use override or default
function ProductionPage() {
  const CustomPage = useComponentOverride('core:production-page', siteId);
  return <CustomPage {...props} />;
}
```

## State Management

Use Zustand for extension state:

```typescript
// src/stores/myStore.ts
import { create } from 'zustand';

interface MyState {
  count: number;
  items: any[];
  increment: () => void;
  setItems: (items: any[]) => void;
}

export const useMyStore = create<MyState>((set) => ({
  count: 0,
  items: [],
  increment: () => set((state) => ({ count: state.count + 1 })),
  setItems: (items) => set({ items }),
}));
```

Usage in components:

```typescript
export function Counter() {
  const { count, increment } = useMyStore();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

## API Integration

Create an API client:

```typescript
// src/services/api.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
});

// Add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { apiClient };
```

Use with react-query:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api';

export function useWorkOrders(siteId: string) {
  return useQuery({
    queryKey: ['workorders', siteId],
    queryFn: () => apiClient.get(`/sites/${siteId}/workorders`),
    staleTime: 5 * 60 * 1000,
  });
}
```

## Testing

### Unit Testing

```typescript
// src/components/__tests__/Dashboard.test.tsx
import { render, screen } from '@testing-library/react';
import { ExtensionContextProvider, createExtensionContext } from '@machshop/frontend-extension-sdk';
import Dashboard from '../Dashboard';

describe('Dashboard', () => {
  it('should render title', () => {
    const context = createExtensionContext({
      userPermissions: ['my-extension:read'],
      userRoles: [],
    });

    render(
      <ExtensionContextProvider value={context}>
        <Dashboard />
      </ExtensionContextProvider>
    );

    expect(screen.getByText('My Dashboard')).toBeInTheDocument();
  });

  it('should show access denied without permission', () => {
    const context = createExtensionContext({
      userPermissions: [],
      userRoles: [],
    });

    render(
      <ExtensionContextProvider value={context}>
        <Dashboard />
      </ExtensionContextProvider>
    );

    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
  });
});
```

### Integration Testing

```typescript
// Test with actual navigation registration
test('should register navigation item', () => {
  const { result } = renderHook(() =>
    useRegisterNavigationItem({
      id: 'test-item',
      label: 'Test',
      path: '/test',
      groupId: 'production',
    })
  );

  expect(result.current.registered).toBe(true);
});
```

## Deployment

### Build Extension

```bash
npm run build
```

### Create Distribution Package

```bash
# Create production bundle
npm run build

# Package for distribution
tar -czf my-extension.tar.gz dist/ manifest.json package.json
```

### Deploy to MachShop

```bash
# Using MachShop CLI
machshop extensions deploy ./my-extension.tar.gz --site=site-123
```

## Troubleshooting

### Issue: Extension not loading

**Symptoms**: Extension doesn't appear in UI

**Solutions**:
1. Check manifest.json syntax
2. Verify extension ID is unique
3. Check browser console for errors
4. Verify permissions in manifest

### Issue: Design tokens not available

**Symptoms**: `undefined` values for tokens

**Solutions**:
```typescript
// Make sure to use hook inside context provider
const { tokens } = useTheme(); // Must be inside ExtensionContextProvider

// Or check if context is initialized
if (!tokens) {
  return <div>Context not ready</div>;
}
```

### Issue: Navigation not registering

**Symptoms**: Menu items don't appear

**Solutions**:
1. Check permission requirements
2. Verify groupId exists
3. Check useRegisterNavigationItem hook usage
4. Check browser console for errors

### Issue: Component override validation fails

**Symptoms**: Override rejected with errors

**Solutions**:
1. Check contract requirements
2. Verify all required props present
3. Check prop types match contract
4. Provide fallback component
5. Check custom validator

### Issue: Performance problems

**Symptoms**: Slow rendering, UI lag

**Solutions**:
```typescript
// Use useMemo for expensive calculations
const filteredItems = useMemo(() => {
  return items.filter(i => i.active);
}, [items]);

// Use useCallback for stable function references
const handleClick = useCallback(() => {
  // Logic
}, []);

// Memoize components
const Row = memo(({ item }) => <div>{item.name}</div>);
```

## Resources

- **Ant Design**: https://ant.design/
- **React Docs**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Extension SDK**: `@machshop/frontend-extension-sdk`
- **Navigation Framework**: `@machshop/navigation-extension-framework`
- **Component Override Framework**: `@machshop/component-override-framework`

## Getting Help

- **Documentation**: `/docs/extension-development/`
- **Examples**: `/examples/extensions/`
- **GitHub Issues**: [MachShop Issues](https://github.com/steiner385/MachShop/issues)
- **Discussions**: [GitHub Discussions](https://github.com/steiner385/MachShop/discussions)
