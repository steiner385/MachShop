# Permission Guide

## Table of Contents

- [Introduction](#introduction)
- [Permission System Overview](#permission-system-overview)
- [usePermission Hook](#usepermission-hook)
- [Permission Checking Patterns](#permission-checking-patterns)
- [Graceful Degradation](#graceful-degradation)
- [Role-Based Feature Gating](#role-based-feature-gating)
- [Component-Level Permissions](#component-level-permissions)
- [API Permission Checks](#api-permission-checks)
- [Testing Permissions](#testing-permissions)
- [Security Best Practices](#security-best-practices)

## Introduction

The permission system ensures that users can only access features and data they're authorized to use. This guide covers how to implement robust, secure permission checks throughout your extension.

### Permission Principles

1. **Defense in Depth**: Check permissions at multiple layers
2. **Fail Secure**: Default to denying access
3. **Principle of Least Privilege**: Grant minimum necessary permissions
4. **Explicit is Better**: Be clear about what permissions allow
5. **User-Friendly**: Provide helpful messages when access is denied

### Permission Types

```typescript
// Permission categories
export const PERMISSIONS = {
  // User management
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_DELETE: 'user.delete',

  // Content management
  CONTENT_VIEW: 'content.view',
  CONTENT_CREATE: 'content.create',
  CONTENT_EDIT: 'content.edit',
  CONTENT_DELETE: 'content.delete',
  CONTENT_PUBLISH: 'content.publish',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',

  // Admin
  ADMIN_ACCESS: 'admin.access',
  ADMIN_USERS: 'admin.users',
  ADMIN_SYSTEM: 'admin.system',

  // Extension-specific
  EXTENSION_INSTALL: 'extension.install',
  EXTENSION_CONFIGURE: 'extension.configure',
  EXTENSION_REMOVE: 'extension.remove',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
```

## Permission System Overview

### Role-Permission Mapping

```typescript
// src/config/roles.ts
export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  AUTHOR: 'author',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Map roles to permissions
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    // Admin has all permissions
    ...Object.values(PERMISSIONS),
  ],

  editor: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_EDIT,
    PERMISSIONS.CONTENT_DELETE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.SETTINGS_VIEW,
  ],

  author: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.CONTENT_VIEW,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_EDIT,
  ],

  viewer: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.CONTENT_VIEW,
  ],
};

// Get permissions for a role
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Check if role has permission
export function roleHasPermission(role: Role, permission: Permission): boolean {
  const rolePermissions = getPermissionsForRole(role);
  return rolePermissions.includes(permission);
}
```

### Permission Context

```typescript
// src/contexts/PermissionContext.tsx
import { createContext, useContext, ReactNode } from 'react';

interface PermissionContextValue {
  permissions: Permission[];
  hasPermission: (permission: Permission | Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  userRole: Role | null;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
  userPermissions: Permission[];
  userRole: Role | null;
}

export function PermissionProvider({
  children,
  userPermissions,
  userRole,
}: PermissionProviderProps) {
  const hasPermission = (permission: Permission | Permission[]): boolean => {
    if (Array.isArray(permission)) {
      return permission.every(p => userPermissions.includes(p));
    }
    return userPermissions.includes(permission);
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(p => userPermissions.includes(p));
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(p => userPermissions.includes(p));
  };

  const value: PermissionContextValue = {
    permissions: userPermissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    userRole,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext(): PermissionContextValue {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error('usePermissionContext must be used within PermissionProvider');
  }

  return context;
}
```

## usePermission Hook

### Basic Usage

```typescript
// src/hooks/usePermission.ts
import { useMemo } from 'react';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { Permission } from '@/config/permissions';

export interface UsePermissionResult {
  hasPermission: boolean;
  loading: boolean;
  error: Error | null;
}

export function usePermission(
  permission: Permission | Permission[]
): UsePermissionResult {
  const { hasPermission: checkPermission } = usePermissionContext();

  const hasPermission = useMemo(() => {
    return checkPermission(permission);
  }, [permission, checkPermission]);

  return {
    hasPermission,
    loading: false,
    error: null,
  };
}

// Usage in components
function EditButton() {
  const { hasPermission } = usePermission(PERMISSIONS.CONTENT_EDIT);

  if (!hasPermission) {
    return null;
  }

  return <button>Edit</button>;
}
```

### Advanced Hook Features

```typescript
// src/hooks/usePermission.ts (extended)
export interface UsePermissionOptions {
  // Require all permissions
  requireAll?: boolean;
  // Fallback behavior
  onDenied?: () => void;
  // Custom error handling
  onError?: (error: Error) => void;
}

export function usePermission(
  permission: Permission | Permission[],
  options: UsePermissionOptions = {}
): UsePermissionResult {
  const { requireAll = true, onDenied, onError } = options;
  const context = usePermissionContext();

  const hasPermission = useMemo(() => {
    try {
      const permissions = Array.isArray(permission) ? permission : [permission];

      const result = requireAll
        ? context.hasAllPermissions(permissions)
        : context.hasAnyPermission(permissions);

      if (!result && onDenied) {
        onDenied();
      }

      return result;
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
      return false;
    }
  }, [permission, requireAll, context, onDenied, onError]);

  return {
    hasPermission,
    loading: false,
    error: null,
  };
}

// Usage with options
function AdminPanel() {
  const { hasPermission } = usePermission(
    [PERMISSIONS.ADMIN_ACCESS, PERMISSIONS.ADMIN_SYSTEM],
    {
      requireAll: true,
      onDenied: () => {
        console.log('Admin access denied');
        // Redirect or show message
      },
    }
  );

  if (!hasPermission) {
    return <AccessDenied />;
  }

  return <div>Admin Panel</div>;
}
```

### Conditional Permission Hook

```typescript
// src/hooks/useConditionalPermission.ts
export function useConditionalPermission(
  condition: boolean,
  permission: Permission | Permission[]
): UsePermissionResult {
  const permissionResult = usePermission(permission);

  if (!condition) {
    return {
      hasPermission: true, // Bypass permission check if condition is false
      loading: false,
      error: null,
    };
  }

  return permissionResult;
}

// Usage
function EditOwnContent({ content, currentUserId }) {
  const isOwner = content.authorId === currentUserId;

  // Only check edit permission if not the owner
  const { hasPermission } = useConditionalPermission(
    !isOwner,
    PERMISSIONS.CONTENT_EDIT
  );

  if (!hasPermission) {
    return null;
  }

  return <button>Edit</button>;
}
```

## Permission Checking Patterns

### UI Component Visibility

```typescript
// Conditional rendering based on permission
function Toolbar() {
  const { hasPermission: canCreate } = usePermission(PERMISSIONS.CONTENT_CREATE);
  const { hasPermission: canDelete } = usePermission(PERMISSIONS.CONTENT_DELETE);
  const { hasPermission: canPublish } = usePermission(PERMISSIONS.CONTENT_PUBLISH);

  return (
    <div className="toolbar">
      {canCreate && <button>Create</button>}
      {canDelete && <button>Delete</button>}
      {canPublish && <button>Publish</button>}
    </div>
  );
}

// Multiple permissions
function AdvancedEditor() {
  const { hasPermission } = usePermission(
    [PERMISSIONS.CONTENT_EDIT, PERMISSIONS.CONTENT_PUBLISH],
    { requireAll: true }
  );

  if (!hasPermission) {
    return <BasicEditor />;
  }

  return <FullFeaturedEditor />;
}
```

### Route Protection

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';

interface ProtectedRouteProps {
  permission: Permission | Permission[];
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({
  permission,
  children,
  redirectTo = '/access-denied',
  fallback,
}: ProtectedRouteProps) {
  const { hasPermission, loading } = usePermission(permission);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

// Usage in routes
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute permission={PERMISSIONS.ADMIN_ACCESS}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute
            permission={PERMISSIONS.SETTINGS_EDIT}
            redirectTo="/settings/view"
          >
            <Settings />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

### Function-Level Checks

```typescript
// Check permission before executing function
function usePermissionGuard() {
  const { hasPermission } = usePermissionContext();

  const guardedAction = <T extends any[], R>(
    permission: Permission | Permission[],
    action: (...args: T) => R,
    onDenied?: () => void
  ) => {
    return (...args: T): R | undefined => {
      if (!hasPermission(permission)) {
        onDenied?.();
        console.warn('Permission denied:', permission);
        return undefined;
      }

      return action(...args);
    };
  };

  return { guardedAction };
}

// Usage
function ContentManager() {
  const { guardedAction } = usePermissionGuard();

  const deleteContent = guardedAction(
    PERMISSIONS.CONTENT_DELETE,
    (id: string) => {
      console.log('Deleting content:', id);
      // Delete logic
    },
    () => {
      toast.error('You do not have permission to delete content');
    }
  );

  return (
    <button onClick={() => deleteContent('123')}>
      Delete
    </button>
  );
}
```

## Graceful Degradation

### Feature Degradation

```typescript
// Provide limited functionality when permission is missing
function DocumentEditor({ document }) {
  const { hasPermission: canEdit } = usePermission(PERMISSIONS.CONTENT_EDIT);
  const { hasPermission: canPublish } = usePermission(PERMISSIONS.CONTENT_PUBLISH);

  return (
    <div>
      {canEdit ? (
        <RichTextEditor content={document.content} />
      ) : (
        <ReadOnlyViewer content={document.content} />
      )}

      <div className="actions">
        {canEdit && <button>Save Draft</button>}
        {canPublish && <button>Publish</button>}
        {!canEdit && !canPublish && (
          <div className="info">
            You have read-only access to this document
          </div>
        )}
      </div>
    </div>
  );
}
```

### Progressive Enhancement

```typescript
// Add features based on available permissions
function UserProfile({ user }) {
  const { hasPermission: canEditProfile } = usePermission(PERMISSIONS.USER_EDIT);
  const { hasPermission: canViewStats } = usePermission(PERMISSIONS.ADMIN_USERS);
  const { hasPermission: canManageRoles } = usePermission(PERMISSIONS.ADMIN_ACCESS);

  return (
    <div>
      <UserInfo user={user} />

      {canEditProfile && (
        <section>
          <h2>Edit Profile</h2>
          <ProfileForm user={user} />
        </section>
      )}

      {canViewStats && (
        <section>
          <h2>User Statistics</h2>
          <UserStats userId={user.id} />
        </section>
      )}

      {canManageRoles && (
        <section>
          <h2>Role Management</h2>
          <RoleSelector userId={user.id} currentRole={user.role} />
        </section>
      )}
    </div>
  );
}
```

### Helpful Error Messages

```typescript
// src/components/PermissionDenied.tsx
interface PermissionDeniedProps {
  permission: Permission | Permission[];
  message?: string;
  suggestion?: string;
}

export function PermissionDenied({
  permission,
  message,
  suggestion,
}: PermissionDeniedProps) {
  const permissionNames = Array.isArray(permission)
    ? permission.join(', ')
    : permission;

  return (
    <div className="permission-denied">
      <div className="icon">
        <LockIcon />
      </div>

      <h2>Access Denied</h2>

      <p>
        {message || `You don't have permission to access this feature.`}
      </p>

      <div className="details">
        <strong>Required permission(s):</strong>
        <code>{permissionNames}</code>
      </div>

      {suggestion && (
        <div className="suggestion">
          <p>{suggestion}</p>
        </div>
      )}

      <div className="actions">
        <button onClick={() => window.history.back()}>
          Go Back
        </button>
        <a href="/contact-admin">Request Access</a>
      </div>
    </div>
  );
}

// Usage
function AdminPanel() {
  const { hasPermission } = usePermission(PERMISSIONS.ADMIN_ACCESS);

  if (!hasPermission) {
    return (
      <PermissionDenied
        permission={PERMISSIONS.ADMIN_ACCESS}
        message="Only administrators can access this panel."
        suggestion="Please contact your system administrator to request admin access."
      />
    );
  }

  return <div>Admin Panel Content</div>;
}
```

## Role-Based Feature Gating

### Role Checks

```typescript
// src/hooks/useRole.ts
export function useRole() {
  const { userRole } = usePermissionContext();

  const isAdmin = userRole === ROLES.ADMIN;
  const isEditor = userRole === ROLES.EDITOR;
  const isAuthor = userRole === ROLES.AUTHOR;
  const isViewer = userRole === ROLES.VIEWER;

  const hasRole = (role: Role | Role[]) => {
    if (Array.isArray(role)) {
      return role.includes(userRole as Role);
    }
    return userRole === role;
  };

  return {
    userRole,
    isAdmin,
    isEditor,
    isAuthor,
    isViewer,
    hasRole,
  };
}

// Usage
function Navigation() {
  const { isAdmin, isEditor } = useRole();

  return (
    <nav>
      <a href="/">Home</a>
      {(isAdmin || isEditor) && <a href="/content">Content</a>}
      {isAdmin && <a href="/admin">Admin</a>}
    </nav>
  );
}
```

### Feature Flags with Roles

```typescript
// src/config/features.ts
export const FEATURES = {
  ADVANCED_ANALYTICS: 'advanced-analytics',
  BULK_OPERATIONS: 'bulk-operations',
  API_ACCESS: 'api-access',
  CUSTOM_THEMES: 'custom-themes',
} as const;

export type Feature = typeof FEATURES[keyof typeof FEATURES];

// Map features to required roles
export const FEATURE_ROLES: Record<Feature, Role[]> = {
  [FEATURES.ADVANCED_ANALYTICS]: [ROLES.ADMIN, ROLES.EDITOR],
  [FEATURES.BULK_OPERATIONS]: [ROLES.ADMIN],
  [FEATURES.API_ACCESS]: [ROLES.ADMIN, ROLES.EDITOR],
  [FEATURES.CUSTOM_THEMES]: [ROLES.ADMIN, ROLES.EDITOR, ROLES.AUTHOR],
};

// src/hooks/useFeature.ts
export function useFeature(feature: Feature): boolean {
  const { userRole } = useRole();

  if (!userRole) {
    return false;
  }

  const allowedRoles = FEATURE_ROLES[feature] || [];
  return allowedRoles.includes(userRole);
}

// Usage
function Dashboard() {
  const hasAdvancedAnalytics = useFeature(FEATURES.ADVANCED_ANALYTICS);
  const hasBulkOperations = useFeature(FEATURES.BULK_OPERATIONS);

  return (
    <div>
      <h1>Dashboard</h1>

      {hasAdvancedAnalytics && (
        <AdvancedAnalyticsPanel />
      )}

      {hasBulkOperations && (
        <BulkOperationsToolbar />
      )}
    </div>
  );
}
```

## Component-Level Permissions

### Permission-Aware Components

```typescript
// src/components/PermissionGate.tsx
interface PermissionGateProps {
  permission: Permission | Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
  requireAll = true,
}: PermissionGateProps) {
  const { hasPermission } = usePermission(permission, { requireAll });

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Usage
function ContentActions() {
  return (
    <div>
      <PermissionGate permission={PERMISSIONS.CONTENT_EDIT}>
        <button>Edit</button>
      </PermissionGate>

      <PermissionGate
        permission={PERMISSIONS.CONTENT_DELETE}
        fallback={<button disabled>Delete (No Permission)</button>}
      >
        <button>Delete</button>
      </PermissionGate>

      <PermissionGate
        permission={[PERMISSIONS.CONTENT_EDIT, PERMISSIONS.CONTENT_PUBLISH]}
        requireAll={false}
      >
        <button>Quick Publish</button>
      </PermissionGate>
    </div>
  );
}
```

### Higher-Order Component

```typescript
// src/hocs/withPermission.tsx
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission | Permission[],
  FallbackComponent?: React.ComponentType
) {
  return function PermissionWrappedComponent(props: P) {
    const { hasPermission } = usePermission(permission);

    if (!hasPermission) {
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      return null;
    }

    return <Component {...props} />;
  };
}

// Usage
const ProtectedSettings = withPermission(
  Settings,
  PERMISSIONS.SETTINGS_EDIT,
  SettingsReadOnly
);

function App() {
  return <ProtectedSettings />;
}
```

## API Permission Checks

### Client-Side API Guards

```typescript
// src/api/client.ts
import { Permission } from '@/config/permissions';

class PermissionAwareAPIClient {
  private permissions: Permission[];

  constructor(permissions: Permission[]) {
    this.permissions = permissions;
  }

  private hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  async createContent(data: any) {
    if (!this.hasPermission(PERMISSIONS.CONTENT_CREATE)) {
      throw new Error('Permission denied: CONTENT_CREATE');
    }

    const response = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return response.json();
  }

  async updateContent(id: string, data: any) {
    if (!this.hasPermission(PERMISSIONS.CONTENT_EDIT)) {
      throw new Error('Permission denied: CONTENT_EDIT');
    }

    const response = await fetch(`/api/content/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    return response.json();
  }

  async deleteContent(id: string) {
    if (!this.hasPermission(PERMISSIONS.CONTENT_DELETE)) {
      throw new Error('Permission denied: CONTENT_DELETE');
    }

    const response = await fetch(`/api/content/${id}`, {
      method: 'DELETE',
    });

    return response.json();
  }
}

// Usage
const apiClient = new PermissionAwareAPIClient(userPermissions);

try {
  await apiClient.createContent({ title: 'New Post' });
} catch (error) {
  console.error('API call failed:', error);
}
```

### Server-Side Permission Validation

```typescript
// Server-side middleware (example with Express)
import { Request, Response, NextFunction } from 'express';

function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions || [];

    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        error: 'Permission denied',
        required: permission,
      });
    }

    next();
  };
}

// Usage in routes
app.post('/api/content',
  authenticate,
  requirePermission(PERMISSIONS.CONTENT_CREATE),
  async (req, res) => {
    // Create content
  }
);

app.delete('/api/content/:id',
  authenticate,
  requirePermission(PERMISSIONS.CONTENT_DELETE),
  async (req, res) => {
    // Delete content
  }
);
```

## Testing Permissions

### Unit Testing Permission Logic

```typescript
// src/utils/permissions.test.ts
import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, roleHasPermission } from '@/config/roles';
import { PERMISSIONS, ROLES } from '@/config/permissions';

describe('Role Permissions', () => {
  it('admin should have all permissions', () => {
    const adminPermissions = ROLE_PERMISSIONS[ROLES.ADMIN];
    expect(adminPermissions).toContain(PERMISSIONS.USER_DELETE);
    expect(adminPermissions).toContain(PERMISSIONS.ADMIN_ACCESS);
  });

  it('viewer should only have view permissions', () => {
    const viewerPermissions = ROLE_PERMISSIONS[ROLES.VIEWER];
    expect(viewerPermissions).toContain(PERMISSIONS.USER_VIEW);
    expect(viewerPermissions).not.toContain(PERMISSIONS.USER_EDIT);
  });

  it('roleHasPermission should work correctly', () => {
    expect(roleHasPermission(ROLES.ADMIN, PERMISSIONS.USER_DELETE)).toBe(true);
    expect(roleHasPermission(ROLES.VIEWER, PERMISSIONS.USER_DELETE)).toBe(false);
  });
});
```

### Component Testing with Permissions

```typescript
// src/components/EditButton.test.tsx
import { render, screen } from '@testing-library/react';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { EditButton } from './EditButton';
import { PERMISSIONS, ROLES } from '@/config/permissions';

function renderWithPermissions(ui: React.ReactElement, permissions: Permission[]) {
  return render(
    <PermissionProvider userPermissions={permissions} userRole={ROLES.ADMIN}>
      {ui}
    </PermissionProvider>
  );
}

describe('EditButton', () => {
  it('should render when user has edit permission', () => {
    renderWithPermissions(
      <EditButton />,
      [PERMISSIONS.CONTENT_EDIT]
    );

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('should not render without edit permission', () => {
    renderWithPermissions(
      <EditButton />,
      [PERMISSIONS.CONTENT_VIEW]
    );

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });
});
```

### E2E Testing with Different Roles

```typescript
// cypress/e2e/permissions.cy.ts
describe('Permission-based Access', () => {
  it('admin should see all features', () => {
    cy.loginAs('admin');
    cy.visit('/dashboard');

    cy.get('[data-testid="create-button"]').should('be.visible');
    cy.get('[data-testid="delete-button"]').should('be.visible');
    cy.get('[data-testid="admin-panel-link"]').should('be.visible');
  });

  it('viewer should only see read-only features', () => {
    cy.loginAs('viewer');
    cy.visit('/dashboard');

    cy.get('[data-testid="create-button"]').should('not.exist');
    cy.get('[data-testid="delete-button"]').should('not.exist');
    cy.get('[data-testid="admin-panel-link"]').should('not.exist');
  });

  it('should redirect unauthorized users', () => {
    cy.loginAs('viewer');
    cy.visit('/admin');

    cy.url().should('include', '/access-denied');
  });
});
```

## Security Best Practices

### Never Trust Client-Side Checks

```typescript
// IMPORTANT: Client-side permission checks are for UX only!
// Always validate permissions on the server

// Client-side: Hide UI elements (UX)
function DeleteButton({ contentId }) {
  const { hasPermission } = usePermission(PERMISSIONS.CONTENT_DELETE);

  if (!hasPermission) {
    return null; // Hide button from UI
  }

  return <button onClick={() => deleteContent(contentId)}>Delete</button>;
}

// Server-side: Enforce permissions (Security)
app.delete('/api/content/:id',
  authenticate,
  requirePermission(PERMISSIONS.CONTENT_DELETE), // REQUIRED!
  async (req, res) => {
    // Delete content
  }
);
```

### Defense in Depth

```typescript
// Layer 1: Route protection
<ProtectedRoute permission={PERMISSIONS.ADMIN_ACCESS}>
  <AdminPanel />
</ProtectedRoute>

// Layer 2: Component-level checks
function AdminPanel() {
  const { hasPermission } = usePermission(PERMISSIONS.ADMIN_ACCESS);

  if (!hasPermission) {
    return <AccessDenied />;
  }

  return <div>...</div>;
}

// Layer 3: API client checks
apiClient.deleteUser(id); // Throws if no permission

// Layer 4: Server-side validation (MOST IMPORTANT)
app.delete('/api/users/:id',
  authenticate,
  requirePermission(PERMISSIONS.USER_DELETE),
  deleteUserHandler
);
```

### Audit Logging

```typescript
// Log permission-sensitive actions
function logPermissionAction(
  userId: string,
  action: string,
  permission: Permission,
  granted: boolean
) {
  const log = {
    timestamp: new Date().toISOString(),
    userId,
    action,
    permission,
    granted,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };

  // Send to audit log service
  auditLogger.log(log);
}

// Use in middleware
function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const hasPermission = checkUserPermission(req.user, permission);

    logPermissionAction(
      req.user.id,
      req.method + ' ' + req.path,
      permission,
      hasPermission
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    next();
  };
}
```

### Secure Permission Updates

```typescript
// Never allow users to set their own permissions!
// Bad:
app.post('/api/users/me/permissions', async (req, res) => {
  await updateUserPermissions(req.user.id, req.body.permissions);
});

// Good: Only admins can update permissions
app.post('/api/users/:userId/permissions',
  authenticate,
  requirePermission(PERMISSIONS.ADMIN_USERS),
  async (req, res) => {
    // Validate and update permissions
    await updateUserPermissions(req.params.userId, req.body.permissions);

    // Log the change
    auditLogger.log({
      action: 'permissions_updated',
      targetUserId: req.params.userId,
      adminUserId: req.user.id,
      newPermissions: req.body.permissions,
    });
  }
);
```

---

## Summary

Effective permission management requires:

1. **usePermission Hook**: Simple, consistent permission checks
2. **Multiple Layers**: UI, component, API, and server-side checks
3. **Graceful Degradation**: Provide alternatives when access is denied
4. **Role-Based Access**: Map roles to permissions
5. **Clear Messaging**: Help users understand why access is denied
6. **Testing**: Verify permission logic at all levels
7. **Security First**: Never trust client-side checks
8. **Audit Logging**: Track permission-sensitive actions

Remember: Permissions are about security, not just UX. Always validate on the server.
