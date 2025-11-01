# Extension Framework v2.0 - Developer Integration Guide

**Framework Version**: 2.0.0
**Last Updated**: November 1, 2024
**Status**: Production Ready

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation & Setup](#installation--setup)
3. [Core Concepts](#core-concepts)
4. [Building Your First Extension](#building-your-first-extension)
5. [Component Types](#component-types)
6. [Navigation Management](#navigation-management)
7. [Component Overrides](#component-overrides)
8. [State Management](#state-management)
9. [Error Handling](#error-handling)
10. [Testing Your Extension](#testing-your-extension)
11. [Deployment Guide](#deployment-guide)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)
14. [API Reference](#api-reference)

## Quick Start

### 1. Create Your Extension Package

```bash
mkdir my-extension
cd my-extension
npm init
```

### 2. Install Framework Dependencies

```bash
npm install @machshop/frontend-extension-sdk @machshop/navigation-extension-framework
```

### 3. Create Your Extension Manifest

Create `manifest.json`:

```json
{
  "id": "my-extension",
  "name": "My Custom Extension",
  "version": "1.0.0",
  "manifest_version": "2.0.0",
  "description": "My first extension using the framework",
  "author": "Your Name",
  "license": "MIT",
  "components": [],
  "navigation": [],
  "capabilities": [],
  "permissions": ["read:dashboard"]
}
```

### 4. Create Your First Component

Create `src/components/HelloWidget.tsx`:

```typescript
import React from 'react';

interface HelloWidgetProps {
  title?: string;
}

export const HelloWidget: React.FC<HelloWidgetProps> = ({ title = 'Hello' }) => {
  return (
    <div className="hello-widget">
      <h2>{title} World</h2>
      <p>Welcome to your first extension!</p>
    </div>
  );
};

export default HelloWidget;
```

### 5. Register Your Component

Create `src/index.ts`:

```typescript
import { ExtensionSDK } from '@machshop/frontend-extension-sdk';
import HelloWidget from './components/HelloWidget';

export async function initializeExtension() {
  const sdk = new ExtensionSDK();

  const extension = {
    id: 'my-extension',
    name: 'My Custom Extension',
    version: '1.0.0',
    manifest_version: '2.0.0' as const,
    components: [
      {
        id: 'hello-widget',
        type: 'widget' as const,
        slot: 'dashboard-main-slot',
        component: HelloWidget,
        title: 'Hello Widget'
      }
    ]
  };

  await sdk.loadExtension(extension);
  await sdk.initializeExtension(extension.id);
  await sdk.activateExtension(extension.id);

  return extension;
}

if (typeof window !== 'undefined') {
  (window as any).initializeExtension = initializeExtension;
}
```

### 6. Build and Test

```bash
npm run build
npm test
```

## Installation & Setup

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- React 18.2 or higher (for React components)

### Framework Packages

The Extension Framework v2.0 consists of 7 core packages:

1. **@machshop/frontend-extension-sdk** - Core extension loading and lifecycle
2. **@machshop/navigation-extension-framework** - Navigation management
3. **@machshop/component-override-framework** - Component substitution
4. **@machshop/extension-validation-framework** - Manifest and code validation
5. **@machshop/state-management-framework** - Zustand-based state
6. **@machshop/logging** - Structured logging
7. **@machshop/error-handling** - Error recovery and reporting

### Installation Steps

```bash
# Create new extension project
mkdir my-extension
cd my-extension

# Initialize npm project
npm init -y

# Install framework packages
npm install \
  @machshop/frontend-extension-sdk \
  @machshop/navigation-extension-framework \
  @machshop/component-override-framework \
  react@18.2 \
  typescript

# Install dev dependencies
npm install --save-dev \
  @types/react \
  @types/node \
  typescript \
  jest \
  @testing-library/react
```

### TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Core Concepts

### Extension Lifecycle

Every extension goes through a defined lifecycle:

```
Discovery → Load → Configure → Initialize → Activate → [Deactivate]
```

#### 1. Discovery
Framework discovers the extension via manifest

```typescript
const discovered = await sdk.discoverExtension('/path/to/extension');
```

#### 2. Load
Extension code is loaded into memory

```typescript
const loaded = await sdk.loadExtension(manifest);
```

#### 3. Configure
Site-specific configuration is applied

```typescript
await sdk.configureExtension(extensionId, {
  theme: 'dark',
  notifications: true
});
```

#### 4. Initialize
Extension hooks are executed, resources allocated

```typescript
await sdk.initializeExtension(extensionId);
```

#### 5. Activate
Extension becomes available to users

```typescript
await sdk.activateExtension(extensionId);
```

#### 6. Deactivate (optional)
Extension is disabled and cleaned up

```typescript
await sdk.deactivateExtension(extensionId);
```

### Manifest Structure

The `manifest.json` defines your extension:

```json
{
  "id": "unique-extension-id",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "manifest_version": "2.0.0",
  "description": "What this extension does",
  "author": "Your Name or Organization",
  "license": "MIT",
  "homepage": "https://github.com/yourorg/extension",
  "components": [
    {
      "id": "component-1",
      "type": "widget",
      "slot": "dashboard-main-slot",
      "title": "Component Title",
      "permissions": ["read:dashboard"]
    }
  ],
  "navigation": [
    {
      "id": "nav-item-1",
      "label": "Extension Page",
      "path": "/extension",
      "permissions": ["read:dashboard"],
      "requiresApproval": false
    }
  ],
  "capabilities": [
    "widget.dashboard",
    "page.extension"
  ],
  "config": {
    "theme": "light",
    "notifications": true
  }
}
```

### Component Slots

Components are registered to specific slots:

| Slot | Purpose | Example |
|------|---------|---------|
| `dashboard-main-slot` | Main dashboard content | Sales dashboard |
| `dashboard-sidebar-slot` | Dashboard sidebar | Filters panel |
| `admin-main-slot` | Admin panel main | User management |
| `admin-sidebar-slot` | Admin sidebar | Settings menu |
| `header-slot` | Page header | Quick actions |
| `footer-slot` | Page footer | Copyright info |

## Building Your First Extension

### Step-by-Step Example: Dashboard Widget

#### 1. Define Component Structure

Create `src/components/SalesWidget.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '@machshop/state-management-framework';
import { Logger } from '@machshop/logging';

const logger = Logger.getLogger('SalesWidget');

interface SalesData {
  totalSales: number;
  trend: number;
  lastUpdated: Date;
}

export const SalesWidget: React.FC = () => {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const store = useDashboardStore();

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        logger.info('Fetching sales data');
        const response = await fetch('/api/sales');
        const data = await response.json();

        setSalesData({
          totalSales: data.total,
          trend: data.trend,
          lastUpdated: new Date()
        });

        // Update store
        store.setSalesData(data);
      } catch (error) {
        logger.error('Failed to fetch sales data', { error });
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [store]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!salesData) return <div className="error">Failed to load sales</div>;

  return (
    <div className="sales-widget">
      <h3>Total Sales</h3>
      <div className="amount">${salesData.totalSales.toLocaleString()}</div>
      <div className={`trend ${salesData.trend > 0 ? 'up' : 'down'}`}>
        {salesData.trend > 0 ? '↑' : '↓'} {Math.abs(salesData.trend)}%
      </div>
      <div className="timestamp">
        Last updated: {salesData.lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default SalesWidget;
```

#### 2. Create Extension Initialization

Create `src/index.ts`:

```typescript
import { ExtensionSDK } from '@machshop/frontend-extension-sdk';
import { NavigationExtensionFramework } from '@machshop/navigation-extension-framework';
import SalesWidget from './components/SalesWidget';
import manifest from '../manifest.json';

let sdk: ExtensionSDK;
let navFramework: NavigationExtensionFramework;

export async function initializeExtension() {
  try {
    // Initialize SDK
    sdk = new ExtensionSDK();
    navFramework = new NavigationExtensionFramework();

    // Load extension
    const extension = await sdk.loadExtension(manifest);
    console.log('Extension loaded:', extension.id);

    // Configure if needed
    await sdk.configureExtension(extension.id, {
      refreshInterval: 60000 // 1 minute
    });

    // Initialize hooks
    await sdk.initializeExtension(extension.id);
    console.log('Extension initialized');

    // Activate
    await sdk.activateExtension(extension.id);
    console.log('Extension activated');

    return extension;
  } catch (error) {
    console.error('Failed to initialize extension:', error);
    throw error;
  }
}

export async function deactivateExtension() {
  if (sdk) {
    await sdk.deactivateExtension(manifest.id);
  }
}
```

#### 3. Update Manifest

Update `manifest.json`:

```json
{
  "id": "sales-dashboard-extension",
  "name": "Sales Dashboard Widget",
  "version": "1.0.0",
  "manifest_version": "2.0.0",
  "description": "Display real-time sales metrics on dashboard",
  "author": "Analytics Team",
  "license": "MIT",
  "components": [
    {
      "id": "sales-widget",
      "type": "widget",
      "slot": "dashboard-main-slot",
      "title": "Sales Metrics",
      "permissions": ["read:dashboard", "read:sales"]
    }
  ],
  "navigation": [
    {
      "id": "sales-analytics",
      "label": "Sales Analytics",
      "path": "/analytics/sales",
      "permissions": ["read:sales"],
      "requiresApproval": false
    }
  ],
  "capabilities": [
    "widget.dashboard",
    "page.analytics"
  ],
  "config": {
    "refreshInterval": 60000,
    "theme": "light"
  }
}
```

## Component Types

### 1. Widget Components

Widgets display content in predefined slots:

```typescript
interface WidgetProps {
  title: string;
  data: any;
}

export const MyWidget: React.FC<WidgetProps> = ({ title, data }) => {
  return <div className="widget">{/* content */}</div>;
};
```

**Registration**:
```json
{
  "id": "my-widget",
  "type": "widget",
  "slot": "dashboard-main-slot",
  "title": "My Widget",
  "permissions": ["read:dashboard"]
}
```

### 2. Page Components

Pages are full-screen views:

```typescript
export const MyPage: React.FC = () => {
  return (
    <div className="page">
      <header><h1>My Page</h1></header>
      <main>{/* page content */}</main>
    </div>
  );
};
```

**Registration**:
```json
{
  "id": "my-page",
  "type": "page",
  "path": "/my-page",
  "title": "My Page"
}
```

### 3. Modal Components

Modals are dialog windows:

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: any;
}

export const MyModal: React.FC<ModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  return (
    <dialog open>
      <h2>Modal Title</h2>
      <p>{/* modal content */}</p>
      <button onClick={onClose}>Close</button>
    </dialog>
  );
};
```

### 4. Form Components

Forms handle user input:

```typescript
interface FormData {
  name: string;
  email: string;
}

export const MyForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Submit form
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Name"
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
      />
      <button type="submit">Submit</button>
    </form>
  );
};
```

## Navigation Management

### Registering Navigation Items

```typescript
const navFramework = new NavigationExtensionFramework();

await navFramework.registerNavigation({
  id: 'sales-page',
  label: 'Sales Report',
  path: '/sales',
  permissions: ['read:sales'],
  requiresApproval: false,
  icon: 'chart-bar',
  group: 'Reports'
});
```

### Navigation with Approval Workflows

Some navigation items require approval before display:

```typescript
await navFramework.registerNavigation({
  id: 'admin-settings',
  label: 'Extension Settings',
  path: '/admin/settings',
  permissions: ['admin:extensions'],
  requiresApproval: true,
  group: 'Administration'
});

// Later, after approval
await navFramework.approveNavigation('admin-settings');
```

### Querying Navigation

```typescript
// Get all navigation
const allNav = await navFramework.queryNavigation();

// Get navigation by group
const reports = await navFramework.queryNavigationByGroup('Reports');

// Get navigation accessible to current user
const userNav = await navFramework.queryNavigationWithPermissions(userPermissions);
```

## Component Overrides

Override framework components with your own implementation:

### Registering an Override

```typescript
import { ComponentOverrideFramework } from '@machshop/component-override-framework';

const overrideFramework = new ComponentOverrideFramework();

await overrideFramework.registerComponentOverride({
  targetComponent: 'StandardForm',
  replacementComponent: CustomForm,
  priority: 100,
  fallback: StandardForm
});
```

### Override Priority

Higher priority overrides take precedence:

```
Priority 100: Custom override
Priority 50:  Default override
Priority 0:   Original component
```

### With Fallback

If your component fails to load, fallback to original:

```typescript
await overrideFramework.registerComponentOverride({
  targetComponent: 'StandardTable',
  replacementComponent: EnhancedTable,
  fallback: StandardTable,
  onError: (error) => {
    logger.error('Override failed, using fallback', { error });
  }
});
```

## State Management

The framework uses Zustand for state management:

### Creating a Store

```typescript
import { create } from 'zustand';

interface DashboardState {
  salesData: any | null;
  isLoading: boolean;
  setSalesData: (data: any) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  salesData: null,
  isLoading: false,
  setSalesData: (data) => set({ salesData: data }),
  setIsLoading: (loading) => set({ isLoading: loading })
}));
```

### Using the Store

```typescript
export const MyComponent: React.FC = () => {
  const { salesData, isLoading, setSalesData } = useDashboardStore();

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetch('/api/sales').then(r => r.json());
      setSalesData(data);
    };
    fetchData();
  }, [setSalesData]);

  if (isLoading) return <div>Loading...</div>;
  return <div>{salesData?.total}</div>;
};
```

### Cross-Extension State

Share state between extensions:

```typescript
import { getSharedStore } from '@machshop/state-management-framework';

const sharedStore = getSharedStore('dashboard');
const { globalData } = sharedStore;
```

## Error Handling

### Try-Catch Pattern

```typescript
try {
  await sdk.loadExtension(manifest);
} catch (error) {
  logger.error('Failed to load extension', {
    error,
    extensionId: manifest.id
  });
  throw error;
}
```

### Error Boundaries

```typescript
import { ErrorBoundary } from 'react-error-boundary';

export const MyComponent = () => (
  <ErrorBoundary
    fallback={<div>Something went wrong</div>}
    onError={(error) => logger.error('Component error', { error })}
  >
    <RiskyComponent />
  </ErrorBoundary>
);
```

### Structured Logging

```typescript
import { Logger } from '@machshop/logging';

const logger = Logger.getLogger('MyExtension');

logger.info('Extension started', { version: '1.0.0' });
logger.warn('Deprecated API used', { api: 'oldMethod' });
logger.error('Database connection failed', { host: 'db.example.com' });
```

## Testing Your Extension

### Unit Tests

```typescript
// src/__tests__/SalesWidget.test.tsx
import { render, screen } from '@testing-library/react';
import SalesWidget from '../components/SalesWidget';

describe('SalesWidget', () => {
  it('should render sales data', async () => {
    render(<SalesWidget />);
    expect(screen.getByText(/Total Sales/)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<SalesWidget />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import { ExtensionSDK } from '@machshop/frontend-extension-sdk';

describe('Extension Integration', () => {
  it('should load extension successfully', async () => {
    const sdk = new ExtensionSDK();
    const extension = await sdk.loadExtension(manifest);

    expect(extension.id).toBe('sales-dashboard-extension');
  });

  it('should initialize extension', async () => {
    const sdk = new ExtensionSDK();
    await sdk.loadExtension(manifest);
    await sdk.initializeExtension(manifest.id);

    const status = await sdk.getExtensionStatus(manifest.id);
    expect(status).toBe('initialized');
  });
});
```

### E2E Tests

```bash
# Using Cypress or Playwright
npm run test:e2e
```

## Deployment Guide

### Building for Production

```bash
# Build TypeScript
npm run build

# Create distribution package
npm pack

# Output: my-extension-1.0.0.tgz
```

### Package Contents

Your published package should include:

```
my-extension/
├── dist/
│   ├── index.js
│   ├── components/
│   │   └── SalesWidget.js
│   └── types.d.ts
├── manifest.json
├── package.json
└── README.md
```

### Deployment Steps

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for complete deployment procedure.

Quick deployment:

```bash
# 1. Validate extension
npm run validate:extension

# 2. Build extension
npm run build

# 3. Deploy to staging
npm run deploy -- --target staging

# 4. Deploy to production
npm run deploy -- --target production
```

## Best Practices

### 1. Security

✅ **DO**:
- Use environment variables for secrets
- Validate all user input
- Use HTTPS for API calls
- Implement proper error handling

❌ **DON'T**:
- Hardcode API keys or passwords
- Use `innerHTML` with user data
- Skip input validation
- Ignore error messages

### 2. Performance

✅ **DO**:
- Memoize expensive computations
- Lazy load components
- Cache API responses
- Batch state updates

❌ **DON'T**:
- Fetch data on every render
- Create new objects in render
- Block the main thread
- Ignore performance warnings

### 3. Accessibility

✅ **DO**:
- Use semantic HTML
- Add ARIA labels
- Test keyboard navigation
- Maintain color contrast

❌ **DON'T**:
- Use `<div>` for buttons
- Skip alt text on images
- Disable focus outlines
- Rely on color alone

### 4. Maintainability

✅ **DO**:
- Write clear, descriptive names
- Add comments for complex logic
- Keep components small
- Use TypeScript for type safety

❌ **DON'T**:
- Create huge monolithic components
- Use cryptic variable names
- Skip error handling
- Ignore TypeScript warnings

## Troubleshooting

### Extension Won't Load

**Problem**: `Failed to load extension`

**Solution**:
1. Validate manifest: `npm run validate:extension`
2. Check file permissions
3. Verify file path
4. Check console for detailed errors

### Component Not Rendering

**Problem**: Widget appears but won't display content

**Solution**:
1. Check slot name is correct
2. Verify component is exported
3. Check permissions
4. Review browser console for errors

### State Not Updating

**Problem**: Store updates aren't reflected in component

**Solution**:
1. Verify using correct selector
2. Check state mutation isn't happening
3. Ensure useEffect dependencies are correct
4. Review Zustand devtools

### Permission Denied

**Problem**: Feature works locally but not in production

**Solution**:
1. Verify user has required permissions
2. Check permission names match manifest
3. Request approval if required
4. Review audit logs

## API Reference

### ExtensionSDK

```typescript
class ExtensionSDK {
  // Lifecycle
  loadExtension(manifest: Manifest): Promise<Extension>;
  configureExtension(id: string, config: any): Promise<void>;
  initializeExtension(id: string): Promise<void>;
  activateExtension(id: string): Promise<void>;
  deactivateExtension(id: string): Promise<void>;

  // Component Management
  registerComponent(ext: Extension, comp: Component): Promise<void>;
  unregisterComponent(extId: string, compId: string): Promise<void>;

  // Status
  getExtensionStatus(id: string): Promise<string>;
  listExtensions(): Promise<Extension[]>;
}
```

### NavigationExtensionFramework

```typescript
class NavigationExtensionFramework {
  // Navigation Management
  registerNavigation(item: NavigationItem): Promise<void>;
  unregisterNavigation(id: string): Promise<void>;
  approveNavigation(id: string): Promise<void>;

  // Queries
  queryNavigation(): Promise<NavigationItem[]>;
  queryNavigationByGroup(group: string): Promise<NavigationItem[]>;
  queryNavigationWithPermissions(perms: string[]): Promise<NavigationItem[]>;
}
```

### ComponentOverrideFramework

```typescript
class ComponentOverrideFramework {
  // Overrides
  registerComponentOverride(config: OverrideConfig): Promise<void>;
  unregisterComponentOverride(componentName: string): Promise<void>;
  getComponentOverride(name: string): Promise<Component | null>;
}
```

---

**For more information, see**:
- [PHASE_4A_INTEGRATION_TESTING.md](./PHASE_4A_INTEGRATION_TESTING.md) - Testing guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Deployment procedures
- [DEVELOPER_TROUBLESHOOTING.md](./DEVELOPER_TROUBLESHOOTING.md) - Common issues

**Questions?** Check the FAQ or contact the development team.
