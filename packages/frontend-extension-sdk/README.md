# Frontend Extension SDK

**Version**: 2.0.0

The Frontend Extension SDK provides tools, utilities, and components for building MachShop UI extensions. It enforces Ant Design usage, design tokens, and permission-aware rendering across all extensions.

## Overview

This SDK is designed to make extension development straightforward while maintaining:

- ✅ **Strict Ant Design enforcement** - All components must use Ant Design
- ✅ **Design token compliance** - No hard-coded colors (use theme tokens)
- ✅ **Permission-aware rendering** - RBAC integrated automatically
- ✅ **Type safety** - Full TypeScript support
- ✅ **Accessibility** - WCAG 2.1 AA built-in
- ✅ **Multi-site support** - Site-scoped isolation
- ✅ **Dynamic widget loading** - Slot-based architecture

## Installation

```bash
npm install @machshop/frontend-extension-sdk
```

## Core Modules

### 1. Extension Context

Provides runtime context to extensions including site ID, permissions, theme, and registry access.

```typescript
import {
  useExtensionContext,
  ExtensionContextProvider,
  createExtensionContext,
} from '@machshop/frontend-extension-sdk';

// In your app entry point
const context = createExtensionContext({
  siteId: 'site-123',
  extensionId: 'my-extension',
  userPermissions: ['workorders:read', 'workorders:write'],
  userRoles: ['operator', 'production-planner'],
});

export function App() {
  return (
    <ExtensionContextProvider value={context}>
      <MyExtension />
    </ExtensionContextProvider>
  );
}

// In your components
export function MyComponent() {
  const { siteId, extensionId, userPermissions } = useExtensionContext();
  return <div>Site: {siteId}</div>;
}
```

### 2. Theme Utilities

Access design tokens and theme configuration without hard-coded colors.

```typescript
import { useTheme, ThemeProvider } from '@machshop/frontend-extension-sdk';

export function MyComponent() {
  const { tokens, isDark, mode, toggleTheme } = useTheme();

  return (
    <div
      style={{
        color: tokens.colorPrimary,
        backgroundColor: tokens.colorBgPrimary,
        padding: tokens.spacingMd,
      }}
    >
      {isDark ? 'Dark Mode' : 'Light Mode'}
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

#### Available Design Tokens

- **Colors**: colorPrimary, colorSuccess, colorError, colorWarning, colorInfo
- **Manufacturing Domain**: colorProduction, colorQuality, colorMaterials, colorEquipment, colorScheduling
- **Status Colors**: colorRunning, colorIdle, colorMaintenance, colorStopped
- **Work Order Status**: colorWONew, colorWOInProgress, colorWOCompleted, colorWOOnHold, colorWOCancelled
- **Text Colors**: colorTextPrimary, colorTextSecondary, colorTextTertiary, colorTextInverse
- **Background Colors**: colorBgPrimary, colorBgSecondary, colorBgTertiary
- **Neutral Palette**: colorNeutral50 through colorNeutral900
- **Typography**: fontSizeBase, fontSizeSmall, fontSizeLarge, fontSizeHeading1-3, fontWeights
- **Spacing**: spacingXs, spacingSm, spacingMd, spacingLg, spacingXl
- **Borders**: borderRadius, borderRadiusSm, borderRadiusLg
- **Shadows**: shadowSm, shadowMd, shadowLg, shadowXl

### 3. Permission Utilities

Enforce RBAC automatically with permission checking and role-based rendering.

```typescript
import {
  usePermission,
  ProtectedComponent,
  withPermissionGuard,
} from '@machshop/frontend-extension-sdk';

// Option 1: Hook-based checking
export function WorkOrderEditor() {
  const { hasPermission, hasRole, isAdmin } = usePermission();

  if (!hasPermission('workorders:write')) {
    return <div>Read-Only Mode</div>;
  }

  return <EditForm />;
}

// Option 2: Component-based protection
export function AdminPanel() {
  return (
    <ProtectedComponent permission="admin:manage-plugins" fallback={<AccessDenied />}>
      <PluginManagement />
    </ProtectedComponent>
  );
}

// Option 3: HOC-based protection
const ProtectedEdit = withPermissionGuard(EditComponent, 'workorders:write');
export function App() {
  return <ProtectedEdit />;
}
```

#### Permission Checking Methods

- `hasPermission(permission: string)` - Check single permission
- `hasAnyPermission(permissions: string[])` - Check if user has any of the permissions
- `hasAllPermissions(permissions: string[])` - Check if user has all permissions
- `hasRole(role: string)` - Check if user has a role
- `hasAnyRole(roles: string[])` - Check if user has any role
- `isAdmin()` - Check if system administrator
- `isSuperuser()` - Check if superuser
- `assertPermission(permission)` - Throw if user lacks permission
- `assertRole(role)` - Throw if user lacks role

### 4. Widget Utilities

Register and load widgets dynamically through the slot-based architecture.

```typescript
import {
  useWidgetSlot,
  useRegisterWidget,
  useWidget,
  WidgetSlotRenderer,
} from '@machshop/frontend-extension-sdk';

// Register a widget
export function MyDashboardWidget() {
  useRegisterWidget({
    id: 'my-extension:dashboard-widget',
    extensionId: 'my-extension',
    slot: 'dashboard-widgets',
    component: DashboardWidget,
    order: 10,
    requiredPermission: 'dashboard:view',
  });

  return <DashboardWidget />;
}

// Load widgets for a slot
export function Dashboard() {
  const { widgets, isEmpty, count } = useWidgetSlot('dashboard-widgets');

  return (
    <div>
      <h2>Dashboard ({count} widgets)</h2>
      {isEmpty ? (
        <div>No widgets available</div>
      ) : (
        <div className="widget-grid">
          {widgets.map((widget) => (
            <React.Suspense key={widget.id} fallback={<div>Loading...</div>}>
              <widget.component />
            </React.Suspense>
          ))}
        </div>
      )}
    </div>
  );
}

// Render a widget slot directly
export function DashboardPage() {
  return (
    <WidgetSlotRenderer
      slot="dashboard-widgets"
      emptyState={<EmptyDashboard />}
      errorFallback={WidgetError}
      loading={<Spinner />}
    />
  );
}
```

## Best Practices

### 1. Always Use Theme Tokens

```typescript
// ❌ Don't
const style = { color: '#1890ff', padding: '16px' };

// ✅ Do
const { tokens } = useTheme();
const style = { color: tokens.colorPrimary, padding: tokens.spacingMd };
```

### 2. Check Permissions Consistently

```typescript
// ✅ Always check before rendering sensitive UI
if (hasPermission('workorders:write')) {
  return <EditButton />;
}
return <ViewOnlyIndicator />;
```

### 3. Use Ant Design Components

```typescript
// ✅ Use Ant Design components
import { Button, Form, Input, Select } from 'antd';

// ❌ Never create custom unstyled components
const CustomButton = styled.button`...`;
```

### 4. Lazy Load Widgets

```typescript
// ✅ Use lazy loading for widgets
const MyWidget = React.lazy(() => import('./MyWidget'));

// ✅ Use React.Suspense with fallback
<React.Suspense fallback={<Spinner />}>
  <MyWidget />
</React.Suspense>
```

### 5. Handle Errors Gracefully

```typescript
// ✅ Wrap widgets with error boundary
import { withWidgetErrorBoundary } from '@machshop/frontend-extension-sdk';

export default withWidgetErrorBoundary(MyWidget, <ErrorFallback />);
```

## Common Use Cases

### Use Case 1: Create a Dashboard Widget

```typescript
import {
  useTheme,
  usePermission,
  useRegisterWidget,
} from '@machshop/frontend-extension-sdk';
import { Card, Statistic, Row, Col } from 'antd';

export function WorkOrderSummaryWidget() {
  const { tokens } = useTheme();
  const { hasPermission } = usePermission();

  useRegisterWidget({
    id: 'my-extension:wo-summary',
    extensionId: 'my-extension',
    slot: 'dashboard-widgets',
    component: WorkOrderSummaryWidget,
    order: 1,
  });

  if (!hasPermission('workorders:read')) {
    return null;
  }

  return (
    <Card style={{ backgroundColor: tokens.colorBgPrimary }}>
      <Row gutter={tokens.spacingMd}>
        <Col xs={24} sm={12}>
          <Statistic title="Active WOs" value={42} />
        </Col>
        <Col xs={24} sm={12}>
          <Statistic title="Completed Today" value={15} />
        </Col>
      </Row>
    </Card>
  );
}
```

### Use Case 2: Protected Edit Form

```typescript
import {
  usePermission,
  ProtectedComponent,
} from '@machshop/frontend-extension-sdk';
import { Form, Input, Button } from 'antd';

export function WorkOrderForm() {
  return (
    <ProtectedComponent
      permission={['workorders:read', 'workorders:write']}
      fallback={<div>Insufficient permissions</div>}
      require="all"
    >
      <Form>
        <Form.Item label="Part Number">
          <Input placeholder="Enter part number" />
        </Form.Item>
        <Form.Item label="Quantity">
          <Input type="number" placeholder="Enter quantity" />
        </Form.Item>
        <Button type="primary">Save</Button>
      </Form>
    </ProtectedComponent>
  );
}
```

### Use Case 3: Theme-Aware Component

```typescript
import { useTheme } from '@machshop/frontend-extension-sdk';
import { Alert } from 'antd';

export function QualityAlert() {
  const { tokens, isDark, toggleTheme } = useTheme();

  return (
    <div
      style={{
        backgroundColor: tokens.colorBgSecondary,
        padding: tokens.spacingLg,
        borderRadius: tokens.borderRadius,
      }}
    >
      <Alert
        type="error"
        message="Quality Issue Detected"
        description="Defect rate exceeds threshold"
        style={{
          color: tokens.colorError,
        }}
      />
      <button onClick={toggleTheme}>
        Switch to {isDark ? 'Light' : 'Dark'} Mode
      </button>
    </div>
  );
}
```

## Type Definitions

### ExtensionContext

```typescript
interface ExtensionContext {
  siteId: string;
  extensionId: string;
  userPermissions: string[];
  userRoles: string[];
  theme: ThemeConfig;
  registry?: UIExtensionRegistry;
  logger: Logger;
  apiClient?: AxiosInstance;
  isOffline?: boolean;
  isDevelopment?: boolean;
  appVersion?: string;
}
```

### DesignTokens

```typescript
interface DesignTokens {
  // Colors
  colorPrimary: string;
  colorSuccess: string;
  colorError: string;
  // ... and 40+ more token definitions
}
```

### PermissionChecker

```typescript
interface PermissionChecker {
  hasPermission(permission: string): boolean;
  hasAnyPermission(permissions: string[]): boolean;
  hasAllPermissions(permissions: string[]): boolean;
  hasRole(role: string): boolean;
  hasAnyRole(roles: string[]): boolean;
  isAdmin(): boolean;
  isSuperuser(): boolean;
  // ... and more methods
}
```

## Accessibility

The SDK automatically provides accessibility features:

- ✅ Semantic HTML from Ant Design
- ✅ Keyboard navigation support
- ✅ ARIA labels and roles
- ✅ High contrast colors available
- ✅ Screen reader support
- ✅ Focus management

## Performance Tips

1. **Use React.lazy** for widget components
2. **Use React.Suspense** with fallbacks
3. **Memoize callbacks** with useCallback
4. **Memoize components** with React.memo when appropriate
5. **Use CSS variables** for theme switching (no re-renders)

## Testing

### Unit Testing with Context

```typescript
import { render } from '@testing-library/react';
import { ExtensionContextProvider, createExtensionContext } from '@machshop/frontend-extension-sdk';

describe('MyComponent', () => {
  it('should render with permission', () => {
    const context = createExtensionContext({
      userPermissions: ['workorders:read'],
      userRoles: ['operator'],
    });

    const { getByText } = render(
      <ExtensionContextProvider value={context}>
        <MyComponent />
      </ExtensionContextProvider>
    );

    expect(getByText('Content')).toBeInTheDocument();
  });
});
```

## Migration from v1.0

See `MIGRATION.md` for details on upgrading from v1.0 to v2.0.

## Support

- **Documentation**: `/docs/frontend-extension-sdk`
- **Examples**: `/examples/frontend-extensions`
- **Issues**: GitHub Issues
- **Support**: MachShop Support Portal

## Related Packages

- `@machshop/ui-extension-contracts` - Component contracts and registry
- `@machshop/extension-sdk` - Backend extension framework
- `@machshop/core-mes-ui-foundation` - Core MES UI as mandatory extension

## License

MIT
