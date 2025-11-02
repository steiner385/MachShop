# MachShop UI Standards & Developer Guidelines

Comprehensive guide for building consistent, accessible, and high-quality extensions for the MachShop platform.

## Table of Contents

1. [UI Extension Architecture](#ui-extension-architecture)
2. [Design System & Tokens](#design-system--tokens)
3. [Component Development Standards](#component-development-standards)
4. [Accessibility Requirements](#accessibility-requirements)
5. [Permission & RBAC Integration](#permission--rbac-integration)
6. [State Management Patterns](#state-management-patterns)
7. [Performance Best Practices](#performance-best-practices)
8. [Extension Checklist](#extension-checklist)
9. [Anti-Patterns & What NOT to Do](#anti-patterns--what-not-to-do)
10. [Tools & Resources](#tools--resources)
11. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

## UI Extension Architecture

### Overview

MachShop extensions follow a composable, modular architecture that ensures consistency and maintainability across the platform.

### Key Concepts

#### Widget Registry

Extensions register UI widgets with the platform using the widget registry. Each widget declares:
- **Unique identifier**: `namespace:widget-name`
- **Type**: Dashboard widget, page, dialog, menu item, etc.
- **Permissions required**: What users need to access this widget
- **Size & layout**: Recommended dimensions and responsive behavior
- **Data contract**: What data the widget accepts/returns

Example:
```typescript
// Extension manifest
{
  "name": "inventory-extension",
  "version": "1.0.0",
  "widgets": [
    {
      "id": "inventory:stock-widget",
      "type": "dashboard-widget",
      "permissions": ["inventory:read"],
      "contract": {
        "inputs": ["location_id"],
        "outputs": ["stock_level"]
      }
    }
  ]
}
```

#### Slot-Based Design

The platform provides predefined slots where extensions can inject content:
- **Dashboard slots**: Customizable dashboard areas
- **Navigation slots**: Menu additions
- **Page slots**: Content areas within pages
- **Action menu slots**: Bulk and row actions
- **Form field slots**: Custom form fields
- **Detail panel slots**: Additional tabs/panels

#### Component Contract System

Every extension component must comply with a strict contract:

```typescript
// Component contract defines shape of props and behaviors
interface WidgetContract<T = any> {
  // Input data passed to component
  data?: T;

  // Event handlers for state changes
  onDataChange?: (data: T) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: WidgetState) => void;

  // UI configuration
  theme?: Theme;
  locale?: string;
  readOnly?: boolean;

  // Permissions context
  permissions?: string[];

  // Size & layout hints
  width?: number;
  height?: number;
  layout?: 'horizontal' | 'vertical';
}

enum WidgetState {
  IDLE = 'idle',
  LOADING = 'loading',
  ERROR = 'error',
  SUCCESS = 'success'
}
```

#### Multi-Tenant Isolation

Extensions are automatically isolated in a multi-tenant environment:
- Each tenant has separate data
- No cross-tenant data leakage
- Permissions are tenant-scoped
- Configuration is tenant-specific

Never assume global state or direct database access. Always use the provided APIs.

#### Site-Scoped Customization

Extensions can be customized per site:
- Configuration schemas allow site-specific settings
- Permissions can be customized per site
- Features can be toggled per site
- Branding can be adapted per site

## Design System & Tokens

### Ant Design v5 Usage

MachShop standardizes on Ant Design v5 for all UI components. Extensions **must** use Ant Design components and **must not** create custom components that duplicate functionality.

#### Design Tokens

Design tokens are predefined values for consistent styling. Always use tokens instead of hard-coded values.

##### Core Color Tokens

```typescript
// Primary brand colors
theme.tokens.colorPrimary        // #1890ff (blue)
theme.tokens.colorSuccess        // #52c41a (green)
theme.tokens.colorWarning        // #faad14 (orange)
theme.tokens.colorError          // #ff4d4f (red)
theme.tokens.colorInfo           // #1890ff (blue)

// Neutral colors for text and backgrounds
theme.tokens.colorTextBase       // Primary text color
theme.tokens.colorTextSecondary  // Secondary text (subtitles, hints)
theme.tokens.colorTextTertiary   // Tertiary text (disabled, placeholders)
theme.tokens.colorTextQuaternary // Quaternary text (very subtle)

// Background colors
theme.tokens.colorBgBase         // Page background
theme.tokens.colorBgContainer    // Container background
theme.tokens.colorBgElevated     // Elevated surfaces (cards, popovers)
theme.tokens.colorBgLayout       // Layout background

// Border colors
theme.tokens.colorBorder         // Standard borders
theme.tokens.colorBorderSecondary// Secondary borders
```

##### Typography Tokens

```typescript
// Font families
theme.tokens.fontFamily          // Primary font stack
theme.tokens.fontFamilyCode      // Monospace font (code)

// Font sizes
theme.tokens.fontSize            // Base font size (14px)
theme.tokens.fontSizeHeading1    // H1 (38px)
theme.tokens.fontSizeHeading2    // H2 (30px)
theme.tokens.fontSizeHeading3    // H3 (24px)
theme.tokens.fontSizeHeading4    // H4 (20px)
theme.tokens.fontSizeHeading5    // H5 (16px)
theme.tokens.fontSizeHeading6    // H6 (14px)

// Font weights
theme.tokens.fontWeightStrong    // Bold (500-600)
theme.tokens.fontWeightText      // Regular (400)
```

##### Spacing Tokens

```typescript
// Consistent spacing scale (in pixels)
theme.tokens.margin              // Base margin (16px)
theme.tokens.marginXS            // Extra small (8px)
theme.tokens.marginSM            // Small (12px)
theme.tokens.marginMD            // Medium (16px)
theme.tokens.marginLG            // Large (24px)
theme.tokens.marginXL            // Extra large (32px)
theme.tokens.marginXXL           // 2x large (48px)

// Same available for padding: paddingXS, paddingSM, etc.
```

##### Shadow Tokens

```typescript
// Elevation shadows
theme.tokens.boxShadow           // Standard shadow
theme.tokens.boxShadowSecondary  // Subtle shadow
```

### Manufacturing-Specific Palette

MachShop extends the standard palette with manufacturing-specific colors:

```typescript
// Manufacturing status colors
manufacturing.colorProductionRunning   // #52c41a (green)
manufacturing.colorProductionStopped   // #ff4d4f (red)
manufacturing.colorProductionWarning   // #faad14 (orange)
manufacturing.colorProductionIdle      // #d9d9d9 (gray)

// Quality colors
manufacturing.colorQualityPass         // #52c41a (green)
manufacturing.colorQualityFail         // #ff4d4f (red)
manufacturing.colorQualityRework       // #faad14 (orange)
manufacturing.colorQualityOnHold       // #1890ff (blue)

// Material/Inventory colors
manufacturing.colorInStock             // #52c41a (green)
manufacturing.colorLowStock            // #faad14 (orange)
manufacturing.colorOutOfStock          // #ff4d4f (red)
manufacturing.colorReordering          // #1890ff (blue)
```

### Semantic Tokens

Use semantic tokens for intent-based styling:

```typescript
// Semantic colors (same as design tokens, for clarity)
const semantic = {
  colorPrimary: theme.tokens.colorPrimary,      // Primary actions
  colorSuccess: theme.tokens.colorSuccess,      // Success messages
  colorWarning: theme.tokens.colorWarning,      // Warnings
  colorError: theme.tokens.colorError,          // Errors
  colorInfo: theme.tokens.colorInfo,            // Information
};
```

### Dark Mode Support

MachShop supports light and dark themes via CSS custom properties (CSS variables).

#### Accessing Theme in Components

```typescript
import { useTheme } from '@/hooks/useTheme';

export function MyComponent() {
  const { theme, isDark } = useTheme();

  return (
    <div style={{
      color: theme.tokens.colorTextBase,
      backgroundColor: theme.tokens.colorBgContainer,
      padding: theme.tokens.marginMD
    }}>
      Content
    </div>
  );
}
```

#### Theme Switching

The platform handles theme switching automatically. Components listen to theme changes and re-render as needed.

#### CSS Variable Usage

All colors are available as CSS variables for inline styles or CSS Modules:

```css
/* CSS Module */
.component {
  color: var(--color-text-base);
  background-color: var(--color-bg-container);
  padding: var(--margin-md);
  border: 1px solid var(--color-border);
}
```

### Accessibility Color Considerations

Ensure color is not the only indicator of state:
- ✅ Good: Green checkmark + "Complete" text
- ❌ Bad: Only green background without text or icon

Minimum color contrast ratios (WCAG AA):
- **Normal text**: 4.5:1
- **Large text (18pt+)**: 3:1
- **UI components**: 3:1

## Component Development Standards

### Mandatory Ant Design Usage

**All components must use Ant Design. Custom UI components are prohibited.**

#### Ant Design Components to Use

```typescript
// Forms
import { Form, Input, Select, Checkbox, Radio, DatePicker, TimePicker } from 'antd';

// Tables
import { Table } from 'antd';

// Layouts
import { Layout, Row, Col, Space, Divider } from 'antd';

// Data Display
import { Collapse, Tabs, Alert, Badge, Progress, Statistic } from 'antd';

// Feedback
import { Message, Notification, Popconfirm, Tooltip, Spin, Skeleton } from 'antd';

// Navigation
import { Menu, Breadcrumb, Pagination, Steps } from 'antd';

// Buttons
import { Button, ButtonGroup } from 'antd';

// Modals
import { Modal } from 'antd';

// Drawers
import { Drawer } from 'antd';

// Cards
import { Card } from 'antd';

// Avatars
import { Avatar, AvatarGroup } from 'antd';

// Icons
import { SmileOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
```

### Folder Structure

```
src/
├── components/
│   ├── MyWidget/
│   │   ├── MyWidget.tsx
│   │   ├── MyWidget.test.tsx
│   │   ├── MyWidget.module.css
│   │   ├── MyWidget.types.ts
│   │   └── hooks/
│   │       └── useMyWidgetData.ts
│   └── shared/
│       └── CommonComponent.tsx
├── hooks/
│   ├── useMyData.ts
│   └── useMyState.ts
├── services/
│   └── MyService.ts
├── stores/
│   └── myStore.ts
├── types/
│   └── index.ts
├── utils/
│   └── helpers.ts
├── styles/
│   └── globals.module.css
└── index.tsx
```

### Naming Conventions

- **Components**: PascalCase (`MyComponent`, `UserForm`, `InventoryTable`)
- **Hooks**: camelCase with `use` prefix (`useMyData`, `usePermissions`, `useFormState`)
- **Stores/Reducers**: camelCase (`userStore`, `formReducer`)
- **Utilities**: camelCase (`formatDate`, `calculateTotal`)
- **Types/Interfaces**: PascalCase (`ComponentProps`, `ApiResponse`, `FormData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_ITEMS`, `API_TIMEOUT`)
- **CSS classes**: kebab-case (`.my-component`, `.form-field`)
- **Files**: Same as exports (MyComponent.tsx, useMyData.ts)

### Component Structure

```typescript
import React, { useState, useCallback } from 'react';
import { Button, Form, Input, Card, Space } from 'antd';
import styles from './MyComponent.module.css';
import type { MyComponentProps } from './MyComponent.types';
import { useMyData } from './hooks/useMyComponentData';

/**
 * Brief description of component purpose.
 *
 * @example
 * <MyComponent onSubmit={handleSubmit} />
 */
export const MyComponent: React.FC<MyComponentProps> = ({
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const [form] = Form.useForm();
  const { data, error, loading } = useMyData();
  const [localState, setLocalState] = useState<string>('');

  const handleChange = useCallback((value: string) => {
    setLocalState(value);
  }, []);

  const handleSubmit = useCallback(async (values: FormData) => {
    try {
      await onSubmit(values);
    } catch (err) {
      console.error('Submit error:', err);
    }
  }, [onSubmit]);

  if (loading || isLoading) {
    return <Spin />;
  }

  if (error) {
    return <Alert type="error" message={error.message} />;
  }

  return (
    <Card className={styles.container}>
      <Form form={form} onFinish={handleSubmit}>
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input onChange={handleChange} />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
          <Button>Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
};

MyComponent.displayName = 'MyComponent';
```

### Type Safety

Always export component prop types:

```typescript
// MyComponent.types.ts
export interface MyComponentProps {
  /** Callback when form is submitted */
  onSubmit: (data: FormData) => Promise<void>;

  /** Initial form data */
  initialData?: FormData;

  /** Loading state */
  isLoading?: boolean;
}

export interface FormData {
  name: string;
  email: string;
}
```

### Styling Approach

Use **CSS Modules** with theme tokens. Do **NOT** use inline styles or hardcoded colors.

#### CSS Modules Best Practice

```css
/* MyComponent.module.css */
.container {
  padding: var(--margin-md);
  background-color: var(--color-bg-container);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
}

.title {
  color: var(--color-text-base);
  font-size: var(--font-size-heading-4);
  font-weight: var(--font-weight-strong);
  margin-bottom: var(--margin-sm);
}

.field {
  margin-bottom: var(--margin-md);
}

.footer {
  display: flex;
  gap: var(--margin-sm);
  justify-content: flex-end;
  margin-top: var(--margin-lg);
  border-top: 1px solid var(--color-border);
  padding-top: var(--margin-md);
}

/* Responsive design */
@media (max-width: 768px) {
  .container {
    padding: var(--margin-sm);
  }

  .footer {
    flex-direction: column;
  }
}
```

#### Using CSS Modules in Components

```typescript
import styles from './MyComponent.module.css';

export const MyComponent = () => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Title</h2>
      <div className={styles.field}>Content</div>
      <div className={styles.footer}>
        <button>Action</button>
      </div>
    </div>
  );
};
```

## Accessibility Requirements

### WCAG 2.1 AA Minimum

All extensions must meet **WCAG 2.1 Level AA** standards as a minimum requirement.

### Keyboard Navigation

All interactive elements must be keyboard accessible:

```typescript
// ✅ Good: Button is naturally keyboard accessible
<Button onClick={handleClick}>Click me</Button>

// ✅ Good: Using Tab key to navigate
<input tabIndex={0} />

// ❌ Bad: Non-interactive element with click handler
<div onClick={handleClick}>Click me</div>

// ✅ Good: Non-interactive element with proper role
<div role="button" onClick={handleClick} onKeyDown={handleKeyDown} tabIndex={0}>
  Click me
</div>
```

### Screen Reader Support

Provide proper ARIA labels and semantic HTML:

```typescript
// ✅ Good: Semantic HTML with labels
<label htmlFor="email">Email Address</label>
<input id="email" type="email" />

// ✅ Good: ARIA labels for icon buttons
<button aria-label="Close dialog">
  <CloseOutlined />
</button>

// ❌ Bad: No accessible label
<button>
  <DeleteOutlined />
</button>

// ✅ Good: Using aria-describedby for additional context
<input aria-describedby="password-hint" type="password" />
<small id="password-hint">At least 8 characters</small>

// ✅ Good: Using aria-live for dynamic updates
<div aria-live="polite" aria-atomic="true">
  {message}
</div>
```

### Color Contrast

Ensure sufficient contrast ratios:

```css
/* ✅ Good: 4.5:1 contrast (WCAG AA) */
.text {
  color: #000000;
  background-color: #ffffff;
}

/* ❌ Bad: Insufficient contrast */
.text {
  color: #888888;
  background-color: #ffffff;
}

/* ✅ Good: Using theme tokens ensures adequate contrast */
.text {
  color: var(--color-text-base);
  background-color: var(--color-bg-container);
}
```

### Focus Indicators

Always maintain visible focus indicators:

```css
/* ✅ Good: Visible focus ring */
button:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ❌ Bad: Removing focus outline */
button:focus {
  outline: none;
}
```

### ARIA Labels and Roles

```typescript
// ✅ Good: Proper ARIA labels
<nav aria-label="Main navigation">
  <ul role="menubar">
    <li role="none">
      <a href="#home" role="menuitem">Home</a>
    </li>
  </ul>
</nav>

// ✅ Good: Hidden text for screen readers
<button aria-label="Add new item" aria-expanded={isOpen}>
  <PlusOutlined />
  <span className="sr-only">Add</span>
</button>

// Screen reader only CSS
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Testing Checklist

- [ ] All interactive elements are keyboard accessible (Tab, Enter, Escape)
- [ ] Focus indicators are visible throughout
- [ ] Form labels are properly associated with inputs
- [ ] Error messages are announced to screen readers
- [ ] Dynamic content updates are announced (aria-live)
- [ ] Color is not the only indicator of state
- [ ] Color contrast meets WCAG AA standards (4.5:1)
- [ ] Images have alt text
- [ ] Buttons have descriptive labels
- [ ] Navigation structure is logical
- [ ] Tool tips are accessible

## Permission & RBAC Integration

### usePermission Hook

Always check permissions before rendering restricted content:

```typescript
import { usePermissions } from '@/hooks/usePermissions';

export function MyComponent() {
  const { hasPermission } = usePermissions();

  if (!hasPermission('inventory:read')) {
    return <Alert type="warning" message="You don't have permission to view this content" />;
  }

  return <div>Inventory content</div>;
}
```

### Permission Checking in Components

```typescript
export function InventoryTable() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('inventory:write');
  const canDelete = hasPermission('inventory:delete');

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    // Only show edit/delete actions if user has permissions
    ...(canEdit || canDelete ? [{
      title: 'Actions',
      render: (_, record) => (
        <Space>
          {canEdit && <Button type="link">Edit</Button>}
          {canDelete && <Button type="link" danger>Delete</Button>}
        </Space>
      )
    }] : [])
  ];

  return <Table columns={columns} />;
}
```

### Graceful Degradation

Always gracefully degrade when permissions are missing:

```typescript
// ✅ Good: Hide restricted features
export function UserForm() {
  const { hasPermission } = usePermissions();

  return (
    <Form>
      <Form.Item label="Name" name="name" required>
        <Input />
      </Form.Item>

      {hasPermission('user:assign-role') && (
        <Form.Item label="Role" name="role">
          <Select options={roles} />
        </Form.Item>
      )}

      <Button type="primary" htmlType="submit">
        Save
      </Button>
    </Form>
  );
}

// ✅ Good: Show disabled state with explanation
export function AdminPanel() {
  const { hasPermission } = usePermissions();
  const canAccess = hasPermission('admin:access');

  return (
    <Card disabled={!canAccess}>
      {!canAccess && (
        <Alert type="info" message="Admin access required" />
      )}
      {canAccess && <AdminContent />}
    </Card>
  );
}
```

### Permission-Aware API Calls

```typescript
export function useUserList() {
  const { hasPermission } = usePermissions();

  const fetchUsers = useCallback(async () => {
    if (!hasPermission('user:read')) {
      throw new Error('Insufficient permissions');
    }

    const response = await fetch('/api/users');
    return response.json();
  }, [hasPermission]);

  return { fetchUsers };
}
```

### Role-Based Feature Gating

```typescript
type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';

export function useFeatureGate(role: UserRole, feature: string): boolean {
  const featureMatrix = {
    'dashboard:customize': ['admin', 'manager'],
    'reports:export': ['admin', 'manager'],
    'equipment:maintenance': ['admin', 'manager'],
    'inventory:adjust': ['manager', 'operator'],
  };

  const allowedRoles = featureMatrix[feature] || [];
  return allowedRoles.includes(role);
}

// Usage
export function Dashboard() {
  const { userRole } = useAuth();
  const canCustomize = useFeatureGate(userRole, 'dashboard:customize');

  return (
    <div>
      {canCustomize && <CustomizeButton />}
    </div>
  );
}
```

## State Management Patterns

### Zustand Store Usage

Use Zustand for global state that needs to be shared across multiple components:

```typescript
// store/userStore.ts
import { create } from 'zustand';

interface UserState {
  user: User | null;
  loading: boolean;
  error: Error | null;

  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  logout: () => set({ user: null, error: null }),
}));

// Usage in component
export function UserProfile() {
  const user = useUserStore((state) => state.user);
  const setLoading = useUserStore((state) => state.setLoading);

  return <div>{user?.name}</div>;
}
```

### React Query for API Calls

Use React Query (TanStack Query) for server state and API calls:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: User) => {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(user),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Usage
export function UserForm() {
  const { data: users, isLoading } = useUsers();
  const updateUserMutation = useUpdateUser();

  const handleSave = async (user: User) => {
    await updateUserMutation.mutateAsync(user);
  };

  if (isLoading) return <Spin />;
  return <div>{users?.length} users</div>;
}
```

### Local Component State

Keep component-specific state local:

```typescript
export function SearchForm() {
  // Local state for form inputs - don't put in global store
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});

  const handleSearch = useCallback(() => {
    // Perform search with state
  }, [searchTerm, filters]);

  return (
    <Form>
      <Form.Item label="Search">
        <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </Form.Item>
      <Button onClick={handleSearch}>Search</Button>
    </Form>
  );
}
```

### Prop Drilling Avoidance

Use Context API for props that need to pass through many levels:

```typescript
// Create context for common props
const ComponentContext = createContext<ComponentContextType | undefined>(undefined);

export function ComponentProvider({ children, theme, permissions }: Props) {
  return (
    <ComponentContext.Provider value={{ theme, permissions }}>
      {children}
    </ComponentContext.Provider>
  );
}

export function useComponentContext() {
  const context = useContext(ComponentContext);
  if (!context) throw new Error('useComponentContext must be used within ComponentProvider');
  return context;
}

// Usage
export function DeepChild() {
  const { theme, permissions } = useComponentContext();
  return <div>Using context</div>;
}
```

## Performance Best Practices

### Code Splitting and Lazy Loading

```typescript
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export function MyPage() {
  return (
    <Suspense fallback={<Spin />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Component Memoization

```typescript
import { memo, useCallback } from 'react';

// Memoize components that receive complex props
interface ItemProps {
  item: Item;
  onSelect: (id: string) => void;
}

export const ListItem = memo<ItemProps>(({ item, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(item.id);
  }, [item.id, onSelect]);

  return <div onClick={handleClick}>{item.name}</div>;
});

ListItem.displayName = 'ListItem';

// Only memoize if rerender would be expensive
export const OptimizedList = memo<ListProps>(({ items, onSelect }) => {
  return (
    <div>
      {items.map((item) => (
        <ListItem key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
});
```

### Query Optimization

```typescript
export function useUsers(filters?: Filters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      // Only fetch data that's needed
      const params = new URLSearchParams();
      if (filters?.role) params.append('role', filters.role);
      if (filters?.status) params.append('status', filters.status);

      const response = await fetch(`/api/users?${params}`);
      return response.json();
    },
    // Cache results for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Don't refetch on every focus
    refetchOnWindowFocus: false,
  });
}
```

### Bundle Size Monitoring

- Avoid large dependencies if smaller alternatives exist
- Import specific functions, not entire libraries
- Remove unused CSS (PurgeCSS)
- Monitor bundle size in CI/CD

```typescript
// ❌ Bad: Importing entire lodash
import _ from 'lodash';
const sorted = _.sortBy(items, 'name');

// ✅ Good: Importing specific function
import sortBy from 'lodash/sortBy';
const sorted = sortBy(items, 'name');

// ✅ Better: Using native methods when possible
const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
```

### Performance Profiling

Use React DevTools Profiler to identify slow components:

1. Open React DevTools → Profiler
2. Record component render times
3. Identify components with long render times
4. Apply memoization, code splitting, or query optimization

## Extension Checklist

### Before Development

- [ ] Architecture decisions documented
- [ ] Data models designed
- [ ] API contracts defined
- [ ] UI mockups created
- [ ] Accessibility requirements identified
- [ ] Performance targets set
- [ ] Permissions identified and documented

### During Development

- [ ] Only Ant Design components used (no custom UI)
- [ ] Theme tokens used for all colors
- [ ] WCAG 2.1 AA compliance verified
- [ ] Proper error handling (try/catch, error boundaries)
- [ ] Loading states implemented
- [ ] Empty states designed
- [ ] Responsive design verified (mobile, tablet, desktop)
- [ ] Permissions integrated and tested
- [ ] Performance profiled and optimized

### Before Submission

- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passing
- [ ] Accessibility audit passed (axe DevTools)
- [ ] Lighthouse scores acceptable (90+)
- [ ] Code reviewed by peer
- [ ] Documentation complete
- [ ] CHANGELOG updated
- [ ] Component contract verified
- [ ] No console errors or warnings

### Deployment

- [ ] Pre-activation validation passes
- [ ] Governance approval obtained
- [ ] Test report submitted
- [ ] Gradual rollout plan documented
- [ ] Rollback procedure tested
- [ ] Monitoring and alerts configured

## Anti-Patterns & What NOT to Do

### Styling Anti-Patterns

```typescript
// ❌ Hard-coded colors
const styles = {
  text: { color: '#333333' },
  background: { backgroundColor: '#ffffff' },
};

// ✅ Use theme tokens
const styles = {
  text: { color: 'var(--color-text-base)' },
  background: { backgroundColor: 'var(--color-bg-container)' },
};

// ❌ Custom CSS (duplicates Ant Design)
<style>
  .button { padding: 8px 16px; border: 1px solid #ccc; }
</style>

// ✅ Use Ant Design
<Button>Click me</Button>
```

### State Management Anti-Patterns

```typescript
// ❌ Global state for everything
const store = create(() => ({
  searchTerm: '',
  filters: {},
  sortOrder: 'asc',
  // ... 50 more local state variables
}));

// ✅ Local state for component-specific data
export function SearchForm() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
}

// ❌ Nested dependencies between stores
const userStore = create(() => ({
  user: usePermissionStore.getState().user,
}));

// ✅ Use context or props to pass data
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
```

### Permission Anti-Patterns

```typescript
// ❌ Feature detection based on user ID
if (userId === 'admin-user-123') {
  // Show admin features
}

// ✅ Use permissions
if (hasPermission('admin:access')) {
  // Show admin features
}

// ❌ Accessing other extensions' state
const otherExtensionState = window.__extensionStates['other-extension'];

// ✅ Use public APIs and events
eventEmitter.on('other-extension:event', handleEvent);
```

### Error Handling Anti-Patterns

```typescript
// ❌ Unhandled errors in components
export function MyComponent() {
  const { data } = useFetch('/api/data'); // Could throw!
  return <div>{data}</div>;
}

// ✅ Proper error handling
export function MyComponent() {
  const { data, error } = useFetch('/api/data');

  if (error) {
    return <Alert type="error" message={error.message} />;
  }

  return <div>{data}</div>;
}

// ❌ Silent error catching
try {
  await saveData();
} catch (err) {
  // Ignore errors
}

// ✅ Proper error handling and user feedback
try {
  await saveData();
} catch (err) {
  console.error('Save failed:', err);
  notification.error({
    message: 'Failed to save',
    description: err.message,
  });
}
```

### Component Anti-Patterns

```typescript
// ❌ Large monolithic components (>300 lines)
export function Dashboard() {
  // 500+ lines of code
  return <div>...</div>;
}

// ✅ Break into smaller components
export function Dashboard() {
  return (
    <>
      <DashboardHeader />
      <DashboardGrid>
        <StatisticsCard />
        <ChartsSection />
        <RecentActivity />
      </DashboardGrid>
    </>
  );
}

// ❌ Hardcoding data
export function ProductList() {
  const products = [
    { id: 1, name: 'Product A' },
    { id: 2, name: 'Product B' },
  ];
  return <List data={products} />;
}

// ✅ Fetch data with hooks
export function ProductList() {
  const { data: products, loading, error } = useProducts();

  if (loading) return <Spin />;
  if (error) return <Alert type="error" />;

  return <List data={products} />;
}
```

## Tools & Resources

### Development Tools

- **TypeScript**: Type safety and autocomplete
- **ESLint**: Code quality and style consistency
- **Prettier**: Code formatting
- **Jest**: Unit testing
- **React Testing Library**: Component testing
- **Cypress**: End-to-end testing
- **axe DevTools**: Accessibility testing
- **Chrome DevTools**: Performance profiling

### Design Resources

- [Ant Design Documentation](https://ant.design)
- Design tokens reference in this guide
- Color palette guide for manufacturing
- [Ant Design Icons](https://ant.design/components/icon)
- Storybook examples

### Templates & Starters

Available in the `TEMPLATES/` directory:
- Widget component template
- Form component template
- Dashboard widget template
- Page layout template
- Custom field template
- Data table template

## Common Pitfalls & Solutions

### Pitfall: Hard-coded Colors

**Problem**: Colors are hard-coded, breaking in dark mode and making theming impossible.

**Solution**: Use theme tokens everywhere.

```typescript
// ❌ Bad
<div style={{ color: '#333', background: '#fff' }}>

// ✅ Good
<div style={{ color: 'var(--color-text-base)', background: 'var(--color-bg-container)' }}>
```

### Pitfall: Inaccessible Components

**Problem**: Components don't work with keyboard or screen readers.

**Solution**: Use semantic HTML, ARIA labels, and test with accessibility tools.

```typescript
// ❌ Bad
<div onClick={handleClick}>Click me</div>

// ✅ Good
<button onClick={handleClick}>Click me</button>
```

### Pitfall: Missing Error Handling

**Problem**: Errors crash the component or are silently ignored.

**Solution**: Always handle errors and show user feedback.

```typescript
// ❌ Bad
const { data } = useFetch('/api/data');
return <div>{data.length}</div>; // Could crash if data is null

// ✅ Good
const { data, error } = useFetch('/api/data');
if (error) return <Alert type="error" />;
if (!data) return <Spin />;
return <div>{data.length}</div>;
```

### Pitfall: Permission Escalation

**Problem**: Checking permissions only on frontend, backend doesn't enforce.

**Solution**: Always check permissions on both frontend and backend.

```typescript
// Frontend
if (!hasPermission('admin:access')) {
  return <Alert message="Access denied" />;
}

// Backend
app.get('/api/admin/data', (req, res) => {
  if (!req.user.permissions.includes('admin:access')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // Return data
});
```

### Pitfall: Breaking Changes

**Problem**: Updates break existing extensions without migration path.

**Solution**: Use semantic versioning and provide migration guides.

```json
{
  "version": "2.0.0",
  "breaking_changes": [
    {
      "change": "Component API changed",
      "migration": "See MIGRATION_GUIDE.md"
    }
  ]
}
```

---

**Last Updated**: November 2025
**Version**: 1.0
**Maintainer**: MachShop Engineering Team
