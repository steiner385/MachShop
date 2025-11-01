# Navigation Extension Framework

**Version**: 2.0.0

The Navigation Extension Framework provides tools for building navigation extensions in MachShop with support for approval workflows, site-scoped configuration, and permission-aware rendering.

## Overview

This framework enables extensions to:

- ✅ **Register navigation items and groups** - Add custom menu items to the navigation structure
- ✅ **Request approvals** - Submit navigation changes for site admin review
- ✅ **Policy-based control** - Configure approval requirements per site
- ✅ **Permission-aware rendering** - Show/hide navigation based on user permissions
- ✅ **Multi-site isolation** - Separate navigation configuration per site
- ✅ **Approval workflows** - Multi-step approval process with audit trail

## Installation

```bash
npm install @machshop/navigation-extension-framework
```

## Core Concepts

### Navigation Items

Navigation items represent individual menu entries.

```typescript
import { useRegisterNavigationItem } from '@machshop/navigation-extension-framework';

export function MyExtension() {
  const result = useRegisterNavigationItem({
    id: 'my-extension:reports',
    label: 'Custom Reports',
    path: '/reports',
    groupId: 'production',
    icon: 'FileOutlined',
    visibility: {
      requiredPermissions: ['reports:read'],
      requirementMode: 'all',
    },
  });

  return <div>Report Navigation Registered</div>;
}
```

### Navigation Groups

Group related navigation items together.

```typescript
import { useRegisterNavigationGroup } from '@machshop/navigation-extension-framework';

export function MyExtension() {
  const result = useRegisterNavigationGroup({
    id: 'my-extension:analytics',
    label: 'Analytics',
    order: 50,
    items: [
      {
        id: 'my-extension:dashboard',
        label: 'Dashboard',
        path: '/analytics/dashboard',
      },
      {
        id: 'my-extension:reports',
        label: 'Reports',
        path: '/analytics/reports',
      },
    ],
  });

  return <div>Analytics Group Registered</div>;
}
```

### Navigation Visibility

Control which users can see navigation items.

```typescript
interface NavigationVisibility {
  // Permissions required to see item
  requiredPermissions?: string[];

  // Roles required to see item
  requiredRoles?: string[];

  // Require 'all' permissions/roles or 'any' (default: 'all')
  requirementMode?: 'all' | 'any';

  // Custom visibility function
  isVisible?: (context) => boolean;
}

// Example: Show only to quality engineers with read permission
const visibility = {
  requiredRoles: ['Quality Engineer'],
  requiredPermissions: ['quality:read'],
  requirementMode: 'all',
};
```

## Approval Workflows

### Approval Policy

Configure approval requirements per site.

```typescript
interface NavigationApprovalPolicy {
  // Whether approval required for new items
  requireApprovalForNewItems: boolean;

  // Whether approval required for modifications
  requireApprovalForModifications: boolean;

  // Roles that can approve changes
  approverRoles: string[];

  // Maximum approval time in days
  maxApprovalDays: number;

  // Minimum approvers required
  minApproversRequired: number;

  // Extensions that bypass approval
  bypassExtensionIds: string[];
}
```

### Approval Request Lifecycle

```
1. Extension requests navigation change
2. System checks policy for site
3. If approval required:
   - Create approval request (PENDING)
   - Notify approvers
4. Approver reviews request
5. Approver approves (APPROVED) or rejects (REJECTED)
6. If approved, apply changes
```

### Using Approvals

```typescript
import { useNavigationApprovals } from '@machshop/navigation-extension-framework';

export function ApprovalManager() {
  const {
    pendingApprovals,
    canApprove,
    approve,
    reject,
  } = useNavigationApprovals();

  if (!canApprove) {
    return <div>You cannot approve navigation changes</div>;
  }

  return (
    <div>
      {pendingApprovals.map((request) => (
        <div key={request.id}>
          <h3>{request.type}</h3>
          <p>{request.reason}</p>
          <button onClick={() => approve(request.id)}>Approve</button>
          <button onClick={() => reject(request.id)}>Reject</button>
        </div>
      ))}
    </div>
  );
}
```

## Components

### NavigationMenu

Render the complete navigation structure.

```typescript
import { NavigationMenu } from '@machshop/navigation-extension-framework';

export function App() {
  return (
    <div>
      <NavigationMenu />
      <main>{/* Page content */}</main>
    </div>
  );
}
```

Features:
- Renders all visible groups and items
- Supports nested submenus
- Shows badges (counts, statuses)
- Permission-aware visibility
- Handles internal and external links

### NavigationApprovalPanel

Display and manage pending approval requests.

```typescript
import { NavigationApprovalPanel } from '@machshop/navigation-extension-framework';

export function AdminDashboard() {
  return (
    <div>
      <h2>Navigation Management</h2>
      <NavigationApprovalPanel />
    </div>
  );
}
```

Features:
- Shows pending approval requests
- Approve/reject buttons
- Audit trail display
- Permission-based access

### NavigationBreadcrumbs

Display breadcrumb navigation.

```typescript
import { NavigationBreadcrumbs } from '@machshop/navigation-extension-framework';

export function Page() {
  return (
    <div>
      <NavigationBreadcrumbs path="/production/workorders/123" />
      {/* Page content */}
    </div>
  );
}
```

## Hooks

### useRegisterNavigationItem

Register a single navigation item.

```typescript
const result = useRegisterNavigationItem({
  id: 'my-extension:feature',
  label: 'Feature',
  path: '/feature',
  groupId: 'group-id',
});

console.log(result.approvalRequired); // Whether approval needed
console.log(result.approvalRequestId); // Request ID if pending
```

### useRegisterNavigationGroup

Register a navigation group with items.

```typescript
const result = useRegisterNavigationGroup({
  id: 'my-extension:group',
  label: 'My Group',
  items: [/* items */],
});
```

### useNavigationStructure

Get filtered groups and items based on permissions.

```typescript
const { groups, items } = useNavigationStructure();

// groups: filtered by user permissions/roles
// items: filtered by user permissions/roles
```

### useNavigationApprovals

Manage navigation approvals.

```typescript
const {
  canApprove,           // boolean
  pendingApprovals,     // NavigationApprovalRequest[]
  extensionApprovals,   // NavigationApprovalRequest[]
  approve,              // (requestId, reason?) => boolean
  reject,               // (requestId, reason?) => boolean
} = useNavigationApprovals();
```

### useNavigationItemClick

Handle navigation item click events.

```typescript
const handleClick = useNavigationItemClick();

// Handles internal routes and external links
handleClick(navigationItem);
```

## Store

Direct access to navigation store for advanced usage.

```typescript
import { useNavigationStore } from '@machshop/navigation-extension-framework';

export function NavigationDebug() {
  const {
    groups,
    items,
    pendingApprovals,
    getFilteredGroups,
    setPolicy,
    registerEntry,
  } = useNavigationStore();

  return <pre>{JSON.stringify({ groups, items }, null, 2)}</pre>;
}
```

## Best Practices

### 1. Always Specify Visibility

```typescript
// ❌ Don't - visible to everyone
const item = {
  id: 'item',
  label: 'Item',
  path: '/item',
};

// ✅ Do - specify who can see it
const item = {
  id: 'item',
  label: 'Item',
  path: '/item',
  visibility: {
    requiredPermissions: ['item:read'],
  },
};
```

### 2. Use Consistent IDs

```typescript
// ✅ Use extension prefix for all IDs
const item = {
  id: 'my-extension:feature',
  label: 'Feature',
};
```

### 3. Order Navigation Items

```typescript
// ✅ Specify order to control display
const items = [
  { id: '1', label: 'First', order: 1 },
  { id: '2', label: 'Second', order: 2 },
];
```

### 4. Handle Approval Results

```typescript
// ✅ Check result for approval status
const result = useRegisterNavigationItem(item);

if (result.approvalRequired) {
  console.log('Item pending approval');
  console.log('Request ID:', result.approvalRequestId);
} else {
  console.log('Item registered immediately');
}
```

### 5. Use Navigation Hooks Consistently

```typescript
// ✅ Use hooks in extension components
export function MyExtension() {
  const { groups, items } = useNavigationStructure();
  const { pendingApprovals } = useNavigationApprovals();

  return <NavigationMenu />;
}
```

## Common Use Cases

### Register a Simple Menu Item

```typescript
export function MyExtension() {
  useRegisterNavigationItem({
    id: 'my-extension:page',
    label: 'My Page',
    path: '/my-page',
    groupId: 'production',
    icon: 'HomeOutlined',
  });

  return <MyPage />;
}
```

### Create a Collapsible Group

```typescript
export function MyExtension() {
  useRegisterNavigationGroup({
    id: 'my-extension:admin',
    label: 'Administration',
    collapsible: true,
    defaultExpanded: false,
    items: [
      { id: 'my-extension:settings', label: 'Settings', path: '/admin/settings' },
      { id: 'my-extension:users', label: 'Users', path: '/admin/users' },
    ],
  });

  return <div />;
}
```

### Role-Based Navigation

```typescript
export function MyExtension() {
  useRegisterNavigationItem({
    id: 'my-extension:admin',
    label: 'Admin Panel',
    path: '/admin',
    visibility: {
      requiredRoles: ['Administrator'],
    },
  });

  return <AdminPanel />;
}
```

### External Links

```typescript
export function MyExtension() {
  useRegisterNavigationItem({
    id: 'my-extension:docs',
    label: 'Documentation',
    href: 'https://docs.example.com',
    target: '_blank',
    icon: 'FileOutlined',
  });

  return <div />;
}
```

## Type Definitions

See the `types.ts` file for comprehensive type definitions including:

- `NavigationItem` - Individual menu item
- `NavigationGroup` - Group of items
- `NavigationApprovalRequest` - Approval workflow request
- `NavigationApprovalPolicy` - Site approval policy
- `NavigationVisibility` - Visibility conditions
- `NavigationActionResult` - Result of registration

## Migration from v1.0

This framework replaces the previous static navigation configuration with a dynamic, extension-based system that supports:

- Dynamic menu registration
- Approval workflows
- Per-site configuration
- Permission-aware rendering

See `MIGRATION.md` for upgrade instructions.

## Support

- **Documentation**: `/docs/navigation-extension-framework`
- **Examples**: `/examples/navigation-extensions`
- **Issues**: GitHub Issues
- **Support**: MachShop Support Portal

## Related Packages

- `@machshop/frontend-extension-sdk` - Core extension utilities
- `@machshop/ui-extension-contracts` - Component contracts
- `@machshop/core-mes-ui-foundation` - Core MES UI

## License

MIT
