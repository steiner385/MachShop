import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Result, Button } from 'antd';
import { useAuthStore, usePermissions, useRoles } from '@/store/AuthStore';
import { Permission, Role } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: Permission[];
  roles?: Role[];
  requireAll?: boolean; // If true, user must have ALL permissions/roles. If false, user needs ANY
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const userPermissions = usePermissions();
  const userRoles = useRoles();
  const location = useLocation();

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is inactive, show error
  if (!user.isActive) {
    return (
      <Result
        status="error"
        title="Account Inactive"
        subTitle="Your account has been deactivated. Please contact your administrator."
        extra={
          <Button type="primary" onClick={() => window.location.href = '/login'}>
            Back to Login
          </Button>
        }
      />
    );
  }

  // Check permissions
  if (permissions.length > 0) {
    const hasPermissions = requireAll
      ? permissions.every(permission => 
          userPermissions.includes(permission) || userPermissions.includes('*')
        )
      : permissions.some(permission => 
          userPermissions.includes(permission) || userPermissions.includes('*')
        );

    if (!hasPermissions) {
      return (
        fallback || (
          <Result
            status="403"
            title="Access Denied"
            subTitle="You don't have permission to access this resource."
            extra={
              <Button type="primary" onClick={() => window.history.back()}>
                Go Back
              </Button>
            }
          />
        )
      );
    }
  }

  // Check roles
  if (roles.length > 0) {
    const hasRoles = requireAll
      ? roles.every(role => userRoles.includes(role))
      : roles.some(role => userRoles.includes(role));

    // System administrators and superusers have access to everything
    const isSystemAdmin = userRoles.includes('System Administrator') || userRoles.includes('Superuser');

    if (!hasRoles && !isSystemAdmin) {
      return (
        fallback || (
          <Result
            status="403"
            title="Access Denied"
            subTitle="You don't have the required role to access this resource."
            extra={
              <Button type="primary" onClick={() => window.history.back()}>
                Go Back
              </Button>
            }
          />
        )
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

// Hook for checking permissions in components
export const usePermissionCheck = () => {
  const userPermissions = usePermissions();
  const userRoles = useRoles();

  return {
    hasPermission: (permission: Permission): boolean => {
      return userPermissions.includes(permission) || userPermissions.includes('*');
    },

    hasRole: (role: Role): boolean => {
      return userRoles.includes(role) || userRoles.includes('System Administrator') || userRoles.includes('Superuser');
    },

    hasAnyRole: (roles: Role[]): boolean => {
      return roles.some(role => userRoles.includes(role)) ||
             userRoles.includes('System Administrator') || userRoles.includes('Superuser');
    },

    hasAllRoles: (roles: Role[]): boolean => {
      return roles.every(role => userRoles.includes(role)) ||
             userRoles.includes('System Administrator') || userRoles.includes('Superuser');
    },

    hasAnyPermission: (permissions: Permission[]): boolean => {
      return permissions.some(permission => 
        userPermissions.includes(permission) || userPermissions.includes('*')
      );
    },

    hasAllPermissions: (permissions: Permission[]): boolean => {
      return permissions.every(permission => 
        userPermissions.includes(permission) || userPermissions.includes('*')
      );
    },
  };
};

// Component for conditional rendering based on permissions
interface ConditionalRenderProps {
  permissions?: Permission[];
  roles?: Role[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  permissions = [],
  roles = [],
  requireAll = false,
  children,
  fallback = null,
}) => {
  const permissionCheck = usePermissionCheck();

  // Check permissions
  if (permissions.length > 0) {
    const hasPermissions = requireAll
      ? permissionCheck.hasAllPermissions(permissions)
      : permissionCheck.hasAnyPermission(permissions);

    if (!hasPermissions) {
      return <>{fallback}</>;
    }
  }

  // Check roles
  if (roles.length > 0) {
    const hasRoles = requireAll
      ? permissionCheck.hasAllRoles(roles)
      : permissionCheck.hasAnyRole(roles);

    if (!hasRoles) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};