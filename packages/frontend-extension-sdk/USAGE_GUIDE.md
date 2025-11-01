# Frontend Extension SDK - Usage Guide

Complete guide for building MachShop extensions using the Frontend Extension SDK.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [Using Hooks](#using-hooks)
4. [Theme Management](#theme-management)
5. [Permissions & Security](#permissions--security)
6. [Widgets & Slots](#widgets--slots)
7. [Navigation](#navigation)
8. [Component Validation](#component-validation)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

## Getting Started

### Installation

```bash
npm install @machshop/frontend-extension-sdk
```

### Basic Setup

Initialize the SDK in your extension's entry point:

```typescript
import { initializeExtensionSDK, ExtensionContextProvider } from '@machshop/frontend-extension-sdk';

async function setupExtension() {
  await initializeExtensionSDK();

  return (
    <ExtensionContextProvider siteId="site-001" extensionId="my-extension">
      <YourExtensionComponent />
    </ExtensionContextProvider>
  );
}
```

## Core Concepts

### ExtensionContext

The `ExtensionContext` provides access to:

- **siteId**: Current site identifier for multi-site operations
- **extensionId**: Unique identifier for your extension
- **userPermissions**: Array of permissions granted to the current user
- **theme**: Current theme configuration
- **registry**: UI extension registry for widgets and components
- **logger**: Logger instance for debugging

### Type Safety

All SDK APIs are fully typed with TypeScript. Import types for better IDE support:

```typescript
import type {
  ExtensionContext,
  MenuItem,
  ComponentContract,
  ValidationResult,
} from '@machshop/frontend-extension-sdk';
```

## Using Hooks

### useExtensionContext

Access the current extension context:

```typescript
import { useExtensionContext } from '@machshop/frontend-extension-sdk';

function MyComponent() {
  const context = useExtensionContext();

  return (
    <div>
      <p>Site: {context.siteId}</p>
      <p>Extension: {context.extensionId}</p>
    </div>
  );
}
```

### useTheme

Get theme tokens and utilities:

```typescript
import { useTheme } from '@machshop/frontend-extension-sdk';

function ThemedComponent() {
  const { token, theme } = useTheme();

  return (
    <div style={{
      color: token.colorPrimary,
      padding: token.paddingMD,
      borderRadius: token.borderRadius,
    }}>
      Themed content
    </div>
  );
}
```

Available tokens:
- `colorPrimary`, `colorError`, `colorWarning`, `colorSuccess`, `colorInfo`
- `paddingXS`, `paddingSM`, `paddingMD`, `paddingLG`, `paddingXL`
- `marginXS`, `marginSM`, `marginMD`, `marginLG`, `marginXL`
- `borderRadius`, `borderRadiusLG`, `borderRadiusSM`
- `fontSize`, `fontSizeLG`, `fontSizeSM`
- `lineHeight`, `lineHeightLG`, `lineHeightSM`

### usePermission

Check user permissions:

```typescript
import { usePermission } from '@machshop/frontend-extension-sdk';

function RestrictedFeature() {
  const { hasPermission, hasRole, allPermissions } = usePermission();

  if (!hasPermission('production.view')) {
    return <AccessDenied />;
  }

  if (hasRole('admin')) {
    return <AdminPanel />;
  }

  return <StandardView permissions={allPermissions} />;
}
```

### useWidgetSlot

Load widgets for a specific slot:

```typescript
import { useWidgetSlot } from '@machshop/frontend-extension-sdk';

function WidgetContainer() {
  const { widgets, isLoading, error } = useWidgetSlot('dashboard-widgets');

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="widget-container">
      {widgets.map(widget => (
        <widget.component key={widget.id} {...widget.props} />
      ))}
    </div>
  );
}
```

### useNavigation

Register and manage menu items:

```typescript
import { useNavigation } from '@machshop/frontend-extension-sdk';
import { Menu } from '@machshop/frontend-extension-sdk';

function NavigationMenu() {
  const { registerMenuItem, getVisibleMenuItems, convertToAntdMenu } = useNavigation();

  // Register a menu item on mount
  useEffect(() => {
    registerMenuItem({
      key: 'my-feature',
      label: 'My Feature',
      icon: <StarOutlined />,
      onClick: () => navigate('/my-feature'),
      requiredPermission: 'features.myfeature.access',
    });
  }, [registerMenuItem]);

  return (
    <Menu
      items={convertToAntdMenu()}
      mode="vertical"
    />
  );
}
```

## Theme Management

### Using Theme Provider

Wrap your extension with `ThemeProvider` for automatic theme support:

```typescript
import { ThemeProvider, useTheme } from '@machshop/frontend-extension-sdk';

function App() {
  return (
    <ThemeProvider>
      <MyExtension />
    </ThemeProvider>
  );
}
```

### Design Tokens

Always use design tokens instead of hardcoded colors:

```typescript
import { useTheme } from '@machshop/frontend-extension-sdk';

// ✅ GOOD - Using design tokens
function GoodComponent() {
  const { token } = useTheme();

  return (
    <button style={{
      backgroundColor: token.colorPrimary,
      color: token.colorTextInverse,
      padding: `${token.paddingSM}px ${token.paddingMD}px`,
    }}>
      Click me
    </button>
  );
}

// ❌ BAD - Hardcoded values
function BadComponent() {
  return (
    <button style={{
      backgroundColor: '#1890ff',  // ❌ Hardcoded color
      color: 'white',               // ❌ Hardcoded color
      padding: '8px 16px',          // ❌ Hardcoded spacing
    }}>
      Click me
    </button>
  );
}
```

## Permissions & Security

### Permission Guards

Protect components with permission checks:

```typescript
import { usePermission, ProtectedComponent, withPermissionGuard } from '@machshop/frontend-extension-sdk';

// Option 1: Hook-based
function MyComponent() {
  const { hasPermission } = usePermission();

  if (!hasPermission('admin.access')) {
    return <AccessDenied />;
  }

  return <AdminPanel />;
}

// Option 2: Component wrapper
function PermissionAwareUI() {
  return (
    <ProtectedComponent
      requiredPermission="admin.access"
      fallback={<AccessDenied />}
    >
      <AdminPanel />
    </ProtectedComponent>
  );
}

// Option 3: HOC
const AdminPanel = withPermissionGuard(
  <YourAdminPanel />,
  'admin.access',
  <AccessDenied />
);
```

### Multiple Permissions

Check for multiple permissions:

```typescript
const { hasPermission, allPermissions } = usePermission();

// Check if user has any of these permissions
if (!['read.data', 'admin.access'].some(p => hasPermission(p))) {
  return <AccessDenied />;
}

// Check all permissions
console.log('User permissions:', allPermissions);
```

## Widgets & Slots

### Registering Widgets

Register a widget to be displayed in a slot:

```typescript
import { useRegisterWidget } from '@machshop/frontend-extension-sdk';

function MyDashboardWidget() {
  useRegisterWidget({
    id: 'my-widget-id',
    slotId: 'dashboard-slot',
    component: MyWidgetComponent,
    props: { title: 'My Widget' },
  });

  return <MyWidgetComponent title="My Widget" />;
}
```

### Widget Validation

Validate widgets before rendering:

```typescript
import { validateWidgetInSlot } from '@machshop/frontend-extension-sdk';
import { useExtensionContext } from '@machshop/frontend-extension-sdk';

function ValidatedWidget() {
  const context = useExtensionContext();

  const result = validateWidgetInSlot(
    MyWidgetComponent,
    {
      slotId: 'my-slot',
      maxWidth: 800,
      maxHeight: 600,
      requiredPermissions: ['widgets.view'],
    },
    context.userPermissions
  );

  if (!result.valid) {
    return <div>Widget validation failed: {result.errors[0].message}</div>;
  }

  return <MyWidgetComponent />;
}
```

## Navigation

### Menu Item Registration

```typescript
import { useNavigation } from '@machshop/frontend-extension-sdk';

function SetupNavigation() {
  const { registerMenuItem } = useNavigation();

  useEffect(() => {
    // Simple menu item
    registerMenuItem({
      key: 'home',
      label: 'Home',
      onClick: () => navigate('/'),
    });

    // Menu item with submenu
    registerMenuItem({
      key: 'admin',
      label: 'Administration',
      requiredPermission: 'admin.access',
      children: [
        { key: 'users', label: 'Users' },
        { key: 'settings', label: 'Settings' },
      ],
    });

    // Menu item with icon
    registerMenuItem({
      key: 'tools',
      label: 'Tools',
      icon: <ToolOutlined />,
    });
  }, [registerMenuItem]);
}
```

## Component Validation

### Validate Component Contracts

```typescript
import {
  validateComponentContract,
  type ComponentContract,
} from '@machshop/frontend-extension-sdk';

const myComponentContract: ComponentContract = {
  name: 'ProductSelector',
  requiredProps: ['productId', 'onSelect'],
  optionalProps: ['placeholder', 'disabled'],
  requiredPermissions: ['products.read'],
  allowedComponents: ['Select', 'Modal'],
};

const result = validateComponentContract(MyComponent, myComponentContract);

if (!result.valid) {
  console.error('Validation errors:');
  result.errors.forEach(error => {
    console.error(`${error.field}: ${error.message}`);
  });
}

if (result.warnings.length > 0) {
  console.warn('Validation warnings:');
  result.warnings.forEach(warning => {
    console.warn(`${warning.field}: ${warning.message}`);
  });
}
```

### Validate Ant Design Usage

```typescript
import { validateAntDesignUsage } from '@machshop/frontend-extension-sdk';

const componentCode = `
  <div className="my-button">Click me</div>
`;

const result = validateAntDesignUsage(componentCode);
if (!result.valid) {
  console.warn('Use Ant Design components instead of custom styling');
}
```

### Manifest Validation

```typescript
import { validateManifestSchema } from '@machshop/frontend-extension-sdk';

const manifest = {
  name: 'my-extension',
  version: '1.0.0',
  description: 'My awesome extension',
  author: 'John Doe',
  license: 'MIT',
};

const result = validateManifestSchema(manifest);
if (result.valid) {
  console.log('Manifest is valid');
} else {
  console.error('Manifest errors:', result.errors);
}
```

## Best Practices

### 1. Always Use Theme Tokens

❌ **Bad:**
```typescript
<div style={{ color: '#1890ff', padding: '10px' }}>Text</div>
```

✅ **Good:**
```typescript
const { token } = useTheme();
<div style={{ color: token.colorPrimary, padding: token.paddingMD }}>Text</div>
```

### 2. Check Permissions Early

❌ **Bad:**
```typescript
return (
  <div>
    <AdminPanel />  {/* Renders even without permission */}
  </div>
);
```

✅ **Good:**
```typescript
const { hasPermission } = usePermission();
if (!hasPermission('admin.access')) {
  return <AccessDenied />;
}
return <AdminPanel />;
```

### 3. Use Ant Design Components

❌ **Bad:**
```typescript
<div className="custom-button">Click</div>
```

✅ **Good:**
```typescript
import { Button } from '@machshop/frontend-extension-sdk';
<Button>Click</Button>
```

### 4. Validate Component Contracts

❌ **Bad:**
```typescript
<MyComponent />  // Might be missing required props
```

✅ **Good:**
```typescript
const result = validateComponentContract(MyComponent, contract);
if (result.valid) {
  <MyComponent {...props} />;
}
```

### 5. Handle Loading States

❌ **Bad:**
```typescript
const { widgets } = useWidgetSlot('my-slot');
return widgets.map(w => <w.component />);  // Might crash if loading
```

✅ **Good:**
```typescript
const { widgets, isLoading, error } = useWidgetSlot('my-slot');
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage />;
return widgets.map(w => <w.component />);
```

## Examples

### Complete Extension Example

```typescript
import React, { useEffect } from 'react';
import {
  ExtensionContextProvider,
  useExtensionContext,
  useTheme,
  usePermission,
  useNavigation,
  Button,
  Card,
  Space,
} from '@machshop/frontend-extension-sdk';

function MyExtension() {
  return (
    <ExtensionContextProvider siteId="site-001" extensionId="my-ext">
      <ExtensionApp />
    </ExtensionContextProvider>
  );
}

function ExtensionApp() {
  const context = useExtensionContext();
  const { token } = useTheme();
  const { hasPermission } = usePermission();
  const { registerMenuItem } = useNavigation();

  useEffect(() => {
    // Register navigation items
    registerMenuItem({
      key: 'dashboard',
      label: 'Dashboard',
      onClick: () => console.log('Navigate to dashboard'),
    });
  }, [registerMenuItem]);

  return (
    <div style={{ padding: token.paddingLG }}>
      <Card title="My Extension" style={{ marginBottom: token.marginMD }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <p>Site: {context.siteId}</p>
          <p>Extension: {context.extensionId}</p>

          {hasPermission('admin.access') && (
            <Button type="primary">Admin Features</Button>
          )}

          <Button>Standard Features</Button>
        </Space>
      </Card>
    </div>
  );
}

export default MyExtension;
```

### Widget Implementation Example

```typescript
import { useWidgetSlot, Spin } from '@machshop/frontend-extension-sdk';

function WidgetShowcase() {
  const { widgets, isLoading, error } = useWidgetSlot('showcase-slot');

  if (isLoading) return <Spin />;
  if (error) return <div>Error loading widgets</div>;

  return (
    <div className="widget-grid">
      {widgets.map(widget => (
        <widget.component
          key={widget.id}
          {...widget.props}
        />
      ))}
    </div>
  );
}
```

---

For more information, see the [main README](./README.md) and SDK module documentation.
