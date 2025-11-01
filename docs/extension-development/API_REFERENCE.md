# MachShop Extension Framework API Reference

**Version**: 2.0.0

Complete API reference for all extension framework packages.

## Table of Contents

1. [Frontend Extension SDK](#frontend-extension-sdk)
2. [Navigation Extension Framework](#navigation-extension-framework)
3. [Component Override Framework](#component-override-framework)

## Frontend Extension SDK

### Context Management

#### `useExtensionContext()`

Get runtime context for the extension.

```typescript
const {
  siteId: string;                    // Multi-tenant site ID
  extensionId: string;               // Your extension ID
  userPermissions: string[];         // User's permissions
  userRoles: string[];               // User's roles
  theme: ThemeConfig;                // Theme configuration
  registry?: UIExtensionRegistry;    // Component registry
  logger: Logger;                    // Logger instance
  apiClient?: AxiosInstance;         // HTTP client
  isOffline?: boolean;               // Offline mode flag
  isDevelopment?: boolean;           // Development mode flag
  appVersion?: string;               // App version
} = useExtensionContext();
```

#### `ExtensionContextProvider`

Wrap your extension with context provider.

```typescript
<ExtensionContextProvider value={context}>
  <MyExtension />
</ExtensionContextProvider>
```

#### `createExtensionContext(overrides)`

Create extension context with sensible defaults.

```typescript
const context = createExtensionContext({
  siteId: 'site-123',
  extensionId: 'my-extension',
  userPermissions: ['read', 'write'],
  userRoles: ['operator'],
});
```

### Theme Utilities

#### `useTheme()`

Access theme and design tokens.

```typescript
const {
  mode: 'light' | 'dark';           // Current theme mode
  tokens: DesignTokens;              // 60+ design tokens
  token: (name: string) => string;   // Get CSS variable
  toggleTheme: () => void;           // Switch theme
  isDark: boolean;                   // Is dark mode active
  isLight: boolean;                  // Is light mode active
} = useTheme();

// Usage
const { tokens } = useTheme();
return <div style={{ color: tokens.colorPrimary }}>Text</div>;
```

#### Design Tokens

**Color Tokens**:
- `colorPrimary`, `colorSuccess`, `colorError`, `colorWarning`, `colorInfo`
- Manufacturing: `colorProduction`, `colorQuality`, `colorMaterials`, `colorEquipment`, `colorScheduling`
- Status: `colorRunning`, `colorIdle`, `colorMaintenance`, `colorStopped`
- Work Orders: `colorWONew`, `colorWOInProgress`, `colorWOCompleted`, `colorWOOnHold`, `colorWOCancelled`
- Text: `colorTextPrimary`, `colorTextSecondary`, `colorTextTertiary`, `colorTextInverse`
- Background: `colorBgPrimary`, `colorBgSecondary`, `colorBgTertiary`
- Neutral: `colorNeutral50` through `colorNeutral900`

**Typography Tokens**:
- `fontSizeBase`, `fontSizeSmall`, `fontSizeLarge`
- `fontSizeHeading1`, `fontSizeHeading2`, `fontSizeHeading3`
- `fontWeightRegular`, `fontWeightMedium`, `fontWeightSemibold`, `fontWeightBold`

**Spacing Tokens**:
- `spacingXs` (4px), `spacingSm` (8px), `spacingMd` (16px), `spacingLg` (24px), `spacingXl` (32px)

**Border & Shadow**:
- `borderRadius`, `borderRadiusSm`, `borderRadiusLg`
- `shadowSm`, `shadowMd`, `shadowLg`, `shadowXl`

### Permission Utilities

#### `usePermission()`

Check user permissions and roles.

```typescript
const {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  isAdmin: () => boolean;
  isSuperuser: () => boolean;
  getAllPermissions: () => string[];
  getAllRoles: () => string[];
  assertPermission: (permission: string) => void;  // Throws if missing
  assertRole: (role: string) => void;              // Throws if missing
} = usePermission();
```

#### `ProtectedComponent`

Protect components behind permission check.

```typescript
<ProtectedComponent
  permission="admin:manage"        // Single or string[]
  role="Administrator"             // Single or string[]
  require="all"                    // 'all' or 'any'
  fallback={<AccessDenied />}     // Shown if denied
>
  <AdminPanel />
</ProtectedComponent>
```

#### `withPermissionGuard(Component, permissions, roles, fallback)`

HOC to wrap component with permission check.

```typescript
const ProtectedEdit = withPermissionGuard(
  EditComponent,
  'workorders:write',
  'operator',
  <AccessDenied />
);
```

### Widget Utilities

#### `useWidgetSlot(slotId)`

Get widgets registered for a slot.

```typescript
const {
  slotId: string;
  widgets: RegisteredWidget[];
  count: number;
  isEmpty: boolean;
  orderedWidgets: RegisteredWidget[];  // Sorted by order
} = useWidgetSlot('dashboard-widgets');
```

#### `useRegisterWidget(widget)`

Register a widget dynamically.

```typescript
const registered = useRegisterWidget({
  id: 'my-extension:widget-1',
  extensionId: 'my-extension',
  slot: 'dashboard-widgets',
  component: MyWidget,
  order: 10,
  requiredPermission: 'dashboard:view',
});
```

#### `useWidget(widgetId)`

Get a specific widget by ID.

```typescript
const widget = useWidget('my-extension:widget-1');
if (widget) {
  return <widget.component />;
}
```

#### `WidgetSlotRenderer`

Render all widgets for a slot.

```typescript
<WidgetSlotRenderer
  slot="dashboard-widgets"
  emptyState={<NoWidgets />}
  errorFallback={ErrorComponent}
  loading={<Spin />}
/>
```

---

## Navigation Extension Framework

### Navigation Registration

#### `useRegisterNavigationItem(item)`

Register a navigation item.

```typescript
const result = useRegisterNavigationItem({
  id: string;                          // Unique ID
  label: string;                       // Display label
  path?: string;                       // Route path
  href?: string;                       // External URL
  groupId?: string;                    // Parent group
  icon?: string;                       // Icon key
  order?: number;                      // Display order
  extensionId?: string;                // Your extension ID
  visibility?: NavigationVisibility;   // Permission rules
  badge?: { text: string; color?: string };
  target?: '_blank' | '_self';
  metadata?: Record<string, any>;
});

// Returns
interface NavigationActionResult {
  success: boolean;
  id?: string;
  approvalRequestId?: string;
  approvalRequired: boolean;
  approvalStatus?: 'pending' | 'approved';
  error?: string;
}
```

#### `useRegisterNavigationGroup(group)`

Register a navigation group.

```typescript
const result = useRegisterNavigationGroup({
  id: string;
  label: string;
  icon?: string;
  items: NavigationItem[];
  order?: number;
  visibility?: NavigationVisibility;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  metadata?: Record<string, any>;
});
```

### Navigation Hooks

#### `useNavigationStructure()`

Get filtered navigation groups and items.

```typescript
const {
  groups: NavigationGroup[];   // Filtered by permissions
  items: NavigationItem[];     // Filtered by permissions
} = useNavigationStructure();
```

#### `useNavigationApprovals()`

Manage navigation approval requests.

```typescript
const {
  canApprove: boolean;
  pendingApprovals: NavigationApprovalRequest[];
  extensionApprovals: NavigationApprovalRequest[];
  approve: (requestId: string, reason?: string) => boolean;
  reject: (requestId: string, reason?: string) => boolean;
} = useNavigationApprovals();
```

#### `useNavigationItemClick()`

Handle navigation item click events.

```typescript
const handleClick = useNavigationItemClick();
handleClick(navigationItem); // Navigates or opens link
```

### Navigation Components

#### `NavigationMenu`

Render complete navigation structure.

```typescript
<NavigationMenu />
```

#### `NavigationApprovalPanel`

Manage approval requests.

```typescript
<NavigationApprovalPanel />
```

#### `NavigationBreadcrumbs`

Display breadcrumb navigation.

```typescript
<NavigationBreadcrumbs path="/production/workorders/123" />
```

### Navigation Store

#### `useNavigationStore()`

Direct access to navigation state.

```typescript
const {
  groups: NavigationGroup[];
  items: NavigationItem[];
  pendingApprovals: NavigationApprovalRequest[];
  policies: Record<string, NavigationApprovalPolicy>;

  // Actions
  setGroup: (group) => void;
  removeGroup: (groupId) => void;
  setItem: (item) => void;
  removeItem: (itemId) => void;
  createApprovalRequest: (request) => string;
  approveRequest: (id, reviewedBy, reason?) => boolean;
  rejectRequest: (id, reviewedBy, reason?) => boolean;
  setPolicy: (siteId, policy) => void;
  getPolicy: (siteId) => NavigationApprovalPolicy | null;
} = useNavigationStore();
```

---

## Component Override Framework

### Component Registration

#### `useRegisterComponentOverride(override)`

Register a component override.

```typescript
const result = useRegisterComponentOverride({
  contractId: string;                    // Contract to override
  component: React.ComponentType<any>;   // Override component
  extensionId: string;                   // Your extension
  siteId: string;                        // Target site
  fallback?: React.ComponentType<any>;   // Fallback component
  customValidator?: (comp, props) => ValidationResult;
  metadata?: Record<string, any>;
  priority?: number;                     // Higher = first
  featureFlags?: string[];
  requiresApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
});

// Returns
interface OverrideRegistrationResult {
  id: string;
  validation: ValidationResult;
  compatibility: CompatibilityCheckResult;
  registered: boolean;
}
```

### Component Usage

#### `useComponentOverride(contractId, siteId)`

Get active override for a component.

```typescript
const OverrideComponent = useComponentOverride(
  'core:production-page',
  siteId
);

if (OverrideComponent) {
  return <OverrideComponent {...props} />;
}
return <DefaultComponent {...props} />;
```

#### `useOverridableComponent(contractId, defaultComponent, fallback?)`

Get override or default component.

```typescript
const Component = useOverridableComponent(
  'core:production-page',
  DefaultProductionPage,
  FallbackPage
);

return <Component {...props} />;
```

### Validation

#### `useOverrideValidation(override, contract)`

Validate override against contract.

```typescript
const {
  validation: ValidationResult;
  compatibility: CompatibilityCheckResult;
  canUseOverride: boolean;
  warnings: string[];
} = useOverrideValidation(override, contract);
```

#### `validateOverride(override, contract)`

Direct validation function.

```typescript
const result = validateOverride(override, contract);
// Returns ValidationResult
```

#### `checkCompatibility(override, contract)`

Check compatibility of override.

```typescript
const result = checkCompatibility(override, contract);
// Returns CompatibilityCheckResult
```

### Analytics

#### `useOverrideAnalytics(overrideId)`

Track override usage and errors.

```typescript
const {
  recordComponentUsage: () => void;
  recordComponentError: (error: Error, usingFallback: boolean) => void;
  getMetrics: () => OverrideMetrics;
} = useOverrideAnalytics(overrideId);
```

### Components

#### `OverridesList`

Display registered overrides.

```typescript
<OverridesList />
```

#### `OverrideValidationResults`

Show validation details.

```typescript
<OverrideValidationResults entry={registryEntry} />
```

#### `OverrideStatusBadge`

Quick status indicator.

```typescript
<OverrideStatusBadge status="active" />
```

### Store

#### `useComponentOverrideStore()`

Direct access to override state.

```typescript
const {
  contracts: ComponentContract[];
  overrides: ComponentOverrideDeclaration[];
  registry: OverrideRegistryEntry[];
  policies: Record<string, OverrideSafetyPolicy>;

  // Actions
  registerContract: (contract) => void;
  registerOverride: (override) => string;
  activateOverride: (overrideId) => boolean;
  deactivateOverride: (overrideId, reason?) => boolean;
  removeOverride: (overrideId) => boolean;
  setPolicy: (siteId, policy) => void;
  getPolicy: (siteId) => OverrideSafetyPolicy | null;
  recordUsage: (overrideId) => void;
  recordError: (overrideId, error, usingFallback) => void;
} = useComponentOverrideStore();
```

---

## Type Definitions

### Common Interfaces

#### `NavigationVisibility`

```typescript
interface NavigationVisibility {
  requiredPermissions?: string[];
  requiredRoles?: string[];
  requirementMode?: 'all' | 'any';
  isVisible?: (context) => boolean;
}
```

#### `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  details?: Record<string, any>;
}
```

#### `ValidationError`

```typescript
interface ValidationError {
  code: string;
  message: string;
  prop?: string;
  fix?: string;
  severity: 'critical' | 'error' | 'warning';
}
```

#### `CompatibilityCheckResult`

```typescript
interface CompatibilityCheckResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
}
```

---

## Logging

All extensions have access to a logger:

```typescript
const { logger } = useExtensionContext();

logger.debug('Debug message', context);
logger.info('Info message', data);
logger.warn('Warning message', issue);
logger.error('Error message', error);
```

Logs are automatically prefixed with extension ID: `[my-extension]`

---

## Version Info

- **Frontend Extension SDK**: v2.0.0
- **Navigation Extension Framework**: v2.0.0
- **Component Override Framework**: v2.0.0

## Compatibility

- React: 18.2+
- Ant Design: 5.12.8+
- Node: 18+
- TypeScript: 5.3+
