/**
 * ProtectedRoute Component Tests
 *
 * Tests for the ProtectedRoute component and related authentication hooks including:
 * - Route protection and authentication checks
 * - Permission-based access control
 * - Role-based access control
 * - Mixed permission and role requirements
 * - Inactive user handling
 * - Custom fallback components
 * - usePermissionCheck hook functionality
 * - ConditionalRender component
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderWithProviders } from '@/test-utils/render';
import {
  ProtectedRoute,
  usePermissionCheck,
  ConditionalRender
} from '../ProtectedRoute';
import { Permission, Role } from '@/types/auth';

// Mock the auth store
const mockAuthStore = {
  isAuthenticated: true,
  user: {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    roles: ['Production Operator'],
    permissions: ['workorders.read', 'materials.read'],
  },
};

const mockUseAuthStore = vi.fn();
const mockUsePermissions = vi.fn();
const mockUseRoles = vi.fn();

vi.mock('@/store/AuthStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
  usePermissions: () => mockUsePermissions(),
  useRoles: () => mockUseRoles(),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, state }: any) => (
      <div data-testid="navigate" data-to={to} data-state={JSON.stringify(state)}>
        Redirecting to {to}
      </div>
    ),
    useLocation: () => ({ pathname: '/test-route' }),
  };
});

// Test component for usePermissionCheck hook
const TestPermissionCheckComponent: React.FC = () => {
  const {
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasAnyPermission,
    hasAllPermissions,
  } = usePermissionCheck();

  return (
    <div>
      <div data-testid="has-workorders-read">
        {hasPermission('workorders.read' as Permission).toString()}
      </div>
      <div data-testid="has-admin-permission">
        {hasPermission('admin.write' as Permission).toString()}
      </div>
      <div data-testid="has-production-role">
        {hasRole('Production Operator' as Role).toString()}
      </div>
      <div data-testid="has-admin-role">
        {hasRole('System Administrator' as Role).toString()}
      </div>
      <div data-testid="has-any-production-role">
        {hasAnyRole(['Production Operator', 'Quality Engineer'] as Role[]).toString()}
      </div>
      <div data-testid="has-all-production-roles">
        {hasAllRoles(['Production Operator', 'Quality Engineer'] as Role[]).toString()}
      </div>
      <div data-testid="has-any-read-permission">
        {hasAnyPermission(['workorders.read', 'admin.read'] as Permission[]).toString()}
      </div>
      <div data-testid="has-all-read-permissions">
        {hasAllPermissions(['workorders.read', 'materials.read'] as Permission[]).toString()}
      </div>
    </div>
  );
};

describe('ProtectedRoute', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue(mockAuthStore);
    mockUsePermissions.mockReturnValue(['workorders.read', 'materials.read']);
    mockUseRoles.mockReturnValue(['Production Operator']);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Checks', () => {
    it('should render children when user is authenticated and has no specific requirements', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should redirect to login when user is not authenticated', () => {
      mockUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        isAuthenticated: false,
        user: null,
      });

      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should redirect to login when user object is null', () => {
      mockUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        isAuthenticated: true,
        user: null,
      });

      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    });

    it('should pass location state for redirect after login', () => {
      mockUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        isAuthenticated: false,
        user: null,
      });

      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      const navigateElement = screen.getByTestId('navigate');
      const stateData = JSON.parse(navigateElement.getAttribute('data-state') || '{}');
      expect(stateData).toEqual({ from: { pathname: '/test-route' } });
    });
  });

  describe('Inactive User Handling', () => {
    it('should show inactive user error when user is not active', () => {
      mockUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        user: {
          ...mockAuthStore.user,
          isActive: false,
        },
      });

      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText('Account Inactive')).toBeInTheDocument();
      expect(screen.getByText(/Your account has been deactivated/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should handle click on Back to Login button for inactive user', async () => {
      // Mock window.location.href
      delete (window as any).location;
      window.location = { href: '' } as any;

      mockUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        user: {
          ...mockAuthStore.user,
          isActive: false,
        },
      });

      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      const backButton = screen.getByRole('button', { name: /back to login/i });
      await user.click(backButton);

      expect(window.location.href).toBe('/login');
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should render children when user has required permission', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute permissions={['workorders.read' as Permission]}>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should show access denied when user lacks required permission', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute permissions={['admin.write' as Permission]}>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You don't have permission to access this resource/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should handle wildcard permission (*)', () => {
      mockUsePermissions.mockReturnValue(['*']);

      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute permissions={['admin.write' as Permission]}>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should handle multiple permissions with requireAll=false (default)', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute permissions={['workorders.read', 'admin.write'] as Permission[]}>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      // Should pass because user has workorders.read (needs ANY permission)
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should handle multiple permissions with requireAll=true', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute
            permissions={['workorders.read', 'admin.write'] as Permission[]}
            requireAll={true}
          >
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      // Should fail because user doesn't have admin.write (needs ALL permissions)
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should pass with requireAll=true when user has all required permissions', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute
            permissions={['workorders.read', 'materials.read'] as Permission[]}
            requireAll={true}
          >
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Role-Based Access Control', () => {
    it('should render children when user has required role', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute roles={['Production Operator'] as Role[]}>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should show access denied when user lacks required role', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute roles={['System Administrator'] as Role[]}>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You don't have the required role to access this resource/)).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should allow access for System Administrator role regardless of specific roles', () => {
      mockUseRoles.mockReturnValue(['System Administrator']);

      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute roles={['Quality Engineer'] as Role[]}>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should allow access for Superuser role regardless of specific roles', () => {
      mockUseRoles.mockReturnValue(['Superuser']);

      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute roles={['Quality Engineer'] as Role[]}>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should handle multiple roles with requireAll=false (default)', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute roles={['Production Operator', 'Quality Engineer'] as Role[]}>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      // Should pass because user has Production Operator (needs ANY role)
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should handle multiple roles with requireAll=true', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute
            roles={['Production Operator', 'Quality Engineer'] as Role[]}
            requireAll={true}
          >
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      // Should fail because user doesn't have Quality Engineer (needs ALL roles)
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Mixed Permission and Role Requirements', () => {
    it('should require both permissions and roles to be satisfied', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute
            permissions={['workorders.read'] as Permission[]}
            roles={['Production Operator'] as Role[]}
          >
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should fail if permissions are satisfied but roles are not', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute
            permissions={['workorders.read'] as Permission[]}
            roles={['Quality Engineer'] as Role[]}
          >
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should fail if roles are satisfied but permissions are not', () => {
      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute
            permissions={['admin.write'] as Permission[]}
            roles={['Production Operator'] as Role[]}
          >
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Custom Fallback Components', () => {
    it('should render custom fallback for permission denial', () => {
      const customFallback = <div data-testid="custom-fallback">Custom Access Denied</div>;

      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute
            permissions={['admin.write'] as Permission[]}
            fallback={customFallback}
          >
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render custom fallback for role denial', () => {
      const customFallback = <div data-testid="custom-fallback">Custom Role Denied</div>;

      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute
            roles={['System Administrator'] as Role[]}
            fallback={customFallback}
          >
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Role Denied')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('should handle Go Back button click', async () => {
      // Mock window.history.back
      const mockBack = vi.fn();
      Object.defineProperty(window, 'history', {
        value: { back: mockBack },
        writable: true,
      });

      renderWithProviders(
        <MemoryRouter>
          <ProtectedRoute permissions={['admin.write'] as Permission[]}>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      const goBackButton = screen.getByRole('button', { name: /go back/i });
      await user.click(goBackButton);

      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });
});

describe('usePermissionCheck Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissions.mockReturnValue(['workorders.read', 'materials.read']);
    mockUseRoles.mockReturnValue(['Production Operator']);
  });

  const renderTestComponent = () => {
    return renderWithProviders(
      <MemoryRouter>
        <TestPermissionCheckComponent />
      </MemoryRouter>
    );
  };

  describe('Permission Checks', () => {
    it('should correctly identify user permissions', () => {
      renderTestComponent();

      expect(screen.getByTestId('has-workorders-read')).toHaveTextContent('true');
      expect(screen.getByTestId('has-admin-permission')).toHaveTextContent('false');
    });

    it('should handle wildcard permissions', () => {
      mockUsePermissions.mockReturnValue(['*']);
      renderTestComponent();

      expect(screen.getByTestId('has-workorders-read')).toHaveTextContent('true');
      expect(screen.getByTestId('has-admin-permission')).toHaveTextContent('true');
    });

    it('should check any permissions correctly', () => {
      renderTestComponent();

      expect(screen.getByTestId('has-any-read-permission')).toHaveTextContent('true');
    });

    it('should check all permissions correctly', () => {
      renderTestComponent();

      expect(screen.getByTestId('has-all-read-permissions')).toHaveTextContent('true');
    });
  });

  describe('Role Checks', () => {
    it('should correctly identify user roles', () => {
      renderTestComponent();

      expect(screen.getByTestId('has-production-role')).toHaveTextContent('true');
      expect(screen.getByTestId('has-admin-role')).toHaveTextContent('false');
    });

    it('should handle System Administrator role privileges', () => {
      mockUseRoles.mockReturnValue(['System Administrator']);
      renderTestComponent();

      expect(screen.getByTestId('has-production-role')).toHaveTextContent('true');
      expect(screen.getByTestId('has-admin-role')).toHaveTextContent('true');
    });

    it('should handle Superuser role privileges', () => {
      mockUseRoles.mockReturnValue(['Superuser']);
      renderTestComponent();

      expect(screen.getByTestId('has-production-role')).toHaveTextContent('true');
      expect(screen.getByTestId('has-admin-role')).toHaveTextContent('true');
    });

    it('should check any roles correctly', () => {
      renderTestComponent();

      expect(screen.getByTestId('has-any-production-role')).toHaveTextContent('true');
    });

    it('should check all roles correctly', () => {
      renderTestComponent();

      expect(screen.getByTestId('has-all-production-roles')).toHaveTextContent('false');
    });
  });
});

describe('ConditionalRender Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissions.mockReturnValue(['workorders.read', 'materials.read']);
    mockUseRoles.mockReturnValue(['Production Operator']);
  });

  it('should render children when user has required permissions', () => {
    renderWithProviders(
      <ConditionalRender permissions={['workorders.read'] as Permission[]}>
        <div data-testid="conditional-content">Conditional Content</div>
      </ConditionalRender>
    );

    expect(screen.getByTestId('conditional-content')).toBeInTheDocument();
  });

  it('should not render children when user lacks required permissions', () => {
    renderWithProviders(
      <ConditionalRender permissions={['admin.write'] as Permission[]}>
        <div data-testid="conditional-content">Conditional Content</div>
      </ConditionalRender>
    );

    expect(screen.queryByTestId('conditional-content')).not.toBeInTheDocument();
  });

  it('should render children when user has required roles', () => {
    renderWithProviders(
      <ConditionalRender roles={['Production Operator'] as Role[]}>
        <div data-testid="conditional-content">Conditional Content</div>
      </ConditionalRender>
    );

    expect(screen.getByTestId('conditional-content')).toBeInTheDocument();
  });

  it('should not render children when user lacks required roles', () => {
    renderWithProviders(
      <ConditionalRender roles={['System Administrator'] as Role[]}>
        <div data-testid="conditional-content">Conditional Content</div>
      </ConditionalRender>
    );

    expect(screen.queryByTestId('conditional-content')).not.toBeInTheDocument();
  });

  it('should render custom fallback when access is denied', () => {
    const fallback = <div data-testid="fallback-content">Access Denied Fallback</div>;

    renderWithProviders(
      <ConditionalRender
        permissions={['admin.write'] as Permission[]}
        fallback={fallback}
      >
        <div data-testid="conditional-content">Conditional Content</div>
      </ConditionalRender>
    );

    expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
    expect(screen.queryByTestId('conditional-content')).not.toBeInTheDocument();
  });

  it('should handle requireAll=true for permissions', () => {
    renderWithProviders(
      <ConditionalRender
        permissions={['workorders.read', 'admin.write'] as Permission[]}
        requireAll={true}
      >
        <div data-testid="conditional-content">Conditional Content</div>
      </ConditionalRender>
    );

    expect(screen.queryByTestId('conditional-content')).not.toBeInTheDocument();
  });

  it('should handle requireAll=true for roles', () => {
    renderWithProviders(
      <ConditionalRender
        roles={['Production Operator', 'Quality Engineer'] as Role[]}
        requireAll={true}
      >
        <div data-testid="conditional-content">Conditional Content</div>
      </ConditionalRender>
    );

    expect(screen.queryByTestId('conditional-content')).not.toBeInTheDocument();
  });

  it('should render children when no permissions or roles are specified', () => {
    renderWithProviders(
      <ConditionalRender>
        <div data-testid="conditional-content">Conditional Content</div>
      </ConditionalRender>
    );

    expect(screen.getByTestId('conditional-content')).toBeInTheDocument();
  });

  it('should handle mixed permissions and roles', () => {
    renderWithProviders(
      <ConditionalRender
        permissions={['workorders.read'] as Permission[]}
        roles={['Production Operator'] as Role[]}
      >
        <div data-testid="conditional-content">Conditional Content</div>
      </ConditionalRender>
    );

    expect(screen.getByTestId('conditional-content')).toBeInTheDocument();
  });
});

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle empty permissions and roles arrays', () => {
    mockUseAuthStore.mockReturnValue(mockAuthStore);
    mockUsePermissions.mockReturnValue([]);
    mockUseRoles.mockReturnValue([]);

    renderWithProviders(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should handle undefined permissions and roles', () => {
    mockUseAuthStore.mockReturnValue({
      ...mockAuthStore,
      user: {
        ...mockAuthStore.user,
        permissions: undefined,
        roles: undefined,
      },
    });
    mockUsePermissions.mockReturnValue([]);
    mockUseRoles.mockReturnValue([]);

    renderWithProviders(
      <MemoryRouter>
        <ProtectedRoute permissions={['workorders.read'] as Permission[]}>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should handle null fallback gracefully', () => {
    renderWithProviders(
      <MemoryRouter>
        <ProtectedRoute
          permissions={['admin.write'] as Permission[]}
          fallback={null}
        >
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Should render default access denied message when fallback is null
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});