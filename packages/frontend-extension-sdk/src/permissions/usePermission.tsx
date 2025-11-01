/**
 * usePermission Hook
 *
 * Provides permission checking and RBAC integration for extensions.
 * Ensures extensions respect user permissions and roles.
 *
 * @module frontend-extension-sdk/permissions/usePermission
 */

import * as React from 'react';
import { useExtensionContext } from '../context';

/**
 * Permission checking utilities
 */
export interface PermissionChecker {
  /**
   * Check if user has a specific permission
   */
  hasPermission: (permission: string) => boolean;

  /**
   * Check if user has any of the given permissions
   */
  hasAnyPermission: (permissions: string[]) => boolean;

  /**
   * Check if user has all of the given permissions
   */
  hasAllPermissions: (permissions: string[]) => boolean;

  /**
   * Check if user has a specific role
   */
  hasRole: (role: string) => boolean;

  /**
   * Check if user has any of the given roles
   */
  hasAnyRole: (roles: string[]) => boolean;

  /**
   * Check if user has all of the given roles
   */
  hasAllRoles: (roles: string[]) => boolean;

  /**
   * Check if user is a system administrator
   */
  isAdmin: () => boolean;

  /**
   * Check if user is a superuser
   */
  isSuperuser: () => boolean;

  /**
   * Get all user permissions
   */
  getAllPermissions: () => string[];

  /**
   * Get all user roles
   */
  getAllRoles: () => string[];

  /**
   * Assert user has permission (throws if not)
   */
  assertPermission: (permission: string) => void;

  /**
   * Assert user has role (throws if not)
   */
  assertRole: (role: string) => void;
}

/**
 * Hook to access permission checking utilities
 *
 * @returns Permission checking functions
 *
 * @example
 * ```typescript
 * const { hasPermission, hasRole } = usePermission();
 *
 * if (hasPermission('workorders:write')) {
 *   return <EditButton />;
 * }
 * ```
 */
export function usePermission(): PermissionChecker {
  const context = useExtensionContext();

  const hasPermission = React.useCallback(
    (permission: string): boolean => {
      // Superusers have all permissions
      if (
        context.userRoles.includes('superuser') ||
        context.userRoles.includes('system-administrator')
      ) {
        return true;
      }

      return context.userPermissions.includes(permission);
    },
    [context.userPermissions, context.userRoles]
  );

  const hasAnyPermission = React.useCallback(
    (permissions: string[]): boolean => {
      return permissions.some((p) => hasPermission(p));
    },
    [hasPermission]
  );

  const hasAllPermissions = React.useCallback(
    (permissions: string[]): boolean => {
      return permissions.every((p) => hasPermission(p));
    },
    [hasPermission]
  );

  const hasRole = React.useCallback(
    (role: string): boolean => {
      // Superusers have all roles
      if (context.userRoles.includes('superuser')) {
        return true;
      }

      return context.userRoles.includes(role);
    },
    [context.userRoles]
  );

  const hasAnyRole = React.useCallback(
    (roles: string[]): boolean => {
      return roles.some((r) => hasRole(r));
    },
    [hasRole]
  );

  const hasAllRoles = React.useCallback(
    (roles: string[]): boolean => {
      return roles.every((r) => hasRole(r));
    },
    [hasRole]
  );

  const isAdmin = React.useCallback((): boolean => {
    return hasRole('system-administrator');
  }, [hasRole]);

  const isSuperuser = React.useCallback((): boolean => {
    return hasRole('superuser');
  }, [hasRole]);

  const getAllPermissions = React.useCallback((): string[] => {
    return [...context.userPermissions];
  }, [context.userPermissions]);

  const getAllRoles = React.useCallback((): string[] => {
    return [...context.userRoles];
  }, [context.userRoles]);

  const assertPermission = React.useCallback(
    (permission: string): void => {
      if (!hasPermission(permission)) {
        throw new Error(`User does not have permission: ${permission}`);
      }
    },
    [hasPermission]
  );

  const assertRole = React.useCallback(
    (role: string): void => {
      if (!hasRole(role)) {
        throw new Error(`User does not have role: ${role}`);
      }
    },
    [hasRole]
  );

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAdmin,
    isSuperuser,
    getAllPermissions,
    getAllRoles,
    assertPermission,
    assertRole,
  };
}

/**
 * Hook to require a specific permission
 *
 * @param permission - Permission to require
 * @param fallback - Optional fallback component if permission denied
 *
 * @example
 * ```typescript
 * const canEdit = useRequirePermission('workorders:write', <AccessDenied />);
 * if (!canEdit) return fallback;
 * ```
 */
export function useRequirePermission(
  permission: string,
  fallback?: React.ReactElement
): boolean {
  const { hasPermission } = usePermission();
  return hasPermission(permission);
}

/**
 * Hook to require a specific role
 */
export function useRequireRole(
  role: string,
  fallback?: React.ReactElement
): boolean {
  const { hasRole } = usePermission();
  return hasRole(role);
}

/**
 * Component to protect content behind permission check
 */
export function ProtectedComponent({
  permission,
  role,
  children,
  fallback,
  require: requireType = 'all',
}: {
  permission?: string | string[];
  role?: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactElement;
  require?: 'all' | 'any';
}): React.ReactElement {
  const {
    hasPermission,
    hasRole,
    hasAllPermissions,
    hasAnyPermission,
  } = usePermission();

  let hasAccess = true;

  if (permission) {
    if (Array.isArray(permission)) {
      hasAccess =
        requireType === 'all'
          ? hasAllPermissions(permission)
          : hasAnyPermission(permission);
    } else {
      hasAccess = hasPermission(permission);
    }
  }

  if (role && hasAccess) {
    if (Array.isArray(role)) {
      const roleChecker = usePermission();
      hasAccess =
        requireType === 'all'
          ? roleChecker.hasAllRoles(role)
          : roleChecker.hasAnyRole(role);
    } else {
      hasAccess = hasRole(role);
    }
  }

  if (!hasAccess) {
    return fallback || <div>Access Denied</div>;
  }

  return <>{children}</>;
}

/**
 * HOC to wrap a component with permission checking
 */
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  permission?: string | string[],
  role?: string | string[],
  fallback?: React.ReactElement
): React.FC<P> {
  return function ProtectedComponentWrapper(props: P) {
    return (
      <ProtectedComponent
        permission={permission}
        role={role}
        fallback={fallback}
      >
        <Component {...props} />
      </ProtectedComponent>
    );
  };
}
