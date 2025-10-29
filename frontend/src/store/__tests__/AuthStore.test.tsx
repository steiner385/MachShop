/**
 * Tests for AuthStore Zustand Store
 *
 * Tests the comprehensive authentication store including:
 * - Zustand store with persistence
 * - Login/logout flows with API integration
 * - Token refresh and auth synchronizer integration
 * - Context provider and hooks
 * - Permission checking utilities
 * - Error handling and test mode behavior
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHookWithProviders } from '@/test-utils/hooks';
import { mockLocalStorageForStore } from '@/test-utils/stores';
import { createMockUser } from '@/test-utils/factories';
import {
  useAuthStoreBase,
  AuthProvider,
  useAuthStore,
  useAuth,
  useUser,
  usePermissions,
  useRoles,
  usePermissionCheck,
} from '../AuthStore';
import type { User, LoginRequest, LoginResponse } from '@/types/auth';

// Mock the auth API
const mockAuthAPI = {
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
};

vi.mock('@/api/auth', () => ({
  authAPI: mockAuthAPI,
  tokenUtils: {
    setAuthHeader: vi.fn(),
    removeAuthHeader: vi.fn(),
  },
}));

// Mock the AuthStateSynchronizer
const mockAuthSynchronizer = {
  cleanup: vi.fn(),
};

const MockAuthStateSynchronizer = vi.fn(() => mockAuthSynchronizer);

vi.mock('@/utils/AuthStateSynchronizer', () => ({
  AuthStateSynchronizer: MockAuthStateSynchronizer,
}));

// Test component that uses all auth hooks
const TestComponent = () => {
  const store = useAuthStore();
  const auth = useAuth();
  const user = useUser();
  const permissions = usePermissions();
  const roles = useRoles();
  const permissionCheck = usePermissionCheck();

  return (
    <div>
      <div data-testid="loading">{store.isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="authenticated">{store.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user-name">{user?.name || 'No User'}</div>
      <div data-testid="error">{store.error || 'No Error'}</div>
      <div data-testid="permissions-count">{permissions.length}</div>
      <div data-testid="roles-count">{roles.length}</div>
      <div data-testid="has-admin-permission">
        {permissionCheck.hasPermission('admin') ? 'Has Admin' : 'No Admin'}
      </div>
      <div data-testid="has-admin-role">
        {permissionCheck.hasRole('admin') ? 'Admin Role' : 'No Admin Role'}
      </div>
      <button
        onClick={() => store.login({ username: 'testuser', password: 'password' })}
        data-testid="login-btn"
      >
        Login
      </button>
      <button onClick={() => store.logout()} data-testid="logout-btn">
        Logout
      </button>
      <button onClick={() => store.refreshAccessToken()} data-testid="refresh-btn">
        Refresh Token
      </button>
      <button onClick={() => store.clearError()} data-testid="clear-error-btn">
        Clear Error
      </button>
    </div>
  );
};

describe('AuthStore', () => {
  let localStorage: ReturnType<typeof mockLocalStorageForStore>;

  const mockUser: User = createMockUser({
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    permissions: ['read', 'write', 'admin'],
    roles: ['user', 'admin'],
  });

  const mockLoginResponse: LoginResponse = {
    user: mockUser,
    token: 'access-token-123',
    refreshToken: 'refresh-token-456',
    expiresIn: '1h',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage = mockLocalStorageForStore();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
      writable: true,
    });

    // Set NODE_ENV to test
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
    });

    // Mock successful API responses by default
    mockAuthAPI.login.mockResolvedValue(mockLoginResponse);
    mockAuthAPI.logout.mockResolvedValue({});
    mockAuthAPI.refreshToken.mockResolvedValue({
      token: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    // Clear any existing store state
    useAuthStoreBase.getState().logout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Store Initialization', () => {
    it('should initialize with default state', () => {
      const store = useAuthStoreBase.getState();

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('should restore state from localStorage in test mode', () => {
      // Pre-populate localStorage with auth state
      const authState = {
        state: {
          user: mockUser,
          token: 'stored-token',
          refreshToken: 'stored-refresh',
        }
      };
      localStorage.setItem('mes-auth-storage', JSON.stringify(authState));

      // Create new store instance to trigger initialization
      const { result } = renderHookWithProviders(() => useAuthStoreBase());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('stored-token');
      expect(result.current.refreshToken).toBe('stored-refresh');
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('mes-auth-storage', 'invalid-json');

      const store = useAuthStoreBase.getState();

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe('Login Flow', () => {
    it('should handle successful login', async () => {
      const store = useAuthStoreBase.getState();
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password',
      };

      await act(async () => {
        await store.login(credentials);
      });

      expect(mockAuthAPI.login).toHaveBeenCalledWith(credentials);
      expect(store.user).toEqual(mockUser);
      expect(store.token).toBe('access-token-123');
      expect(store.refreshToken).toBe('refresh-token-456');
      expect(store.isAuthenticated).toBe(true);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('should handle login failure', async () => {
      const store = useAuthStoreBase.getState();
      const loginError = new Error('Invalid credentials');
      mockAuthAPI.login.mockRejectedValue(loginError);

      await act(async () => {
        try {
          await store.login({ username: 'testuser', password: 'wrong' });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBe('Invalid credentials');
    });

    it('should set loading state during login', async () => {
      const store = useAuthStoreBase.getState();
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });
      mockAuthAPI.login.mockReturnValue(loginPromise);

      // Start login
      const loginCall = store.login({ username: 'testuser', password: 'password' });

      // Should be loading
      expect(store.isLoading).toBe(true);

      // Resolve login
      resolveLogin(mockLoginResponse);
      await act(async () => {
        await loginCall;
      });

      expect(store.isLoading).toBe(false);
    });
  });

  describe('Logout Flow', () => {
    beforeEach(async () => {
      // Set up authenticated state
      const store = useAuthStoreBase.getState();
      await act(async () => {
        await store.login({ username: 'testuser', password: 'password' });
      });
    });

    it('should handle successful logout', async () => {
      const store = useAuthStoreBase.getState();

      await act(async () => {
        await store.logout();
      });

      expect(mockAuthAPI.logout).toHaveBeenCalled();
      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.refreshToken).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.isLoading).toBe(false);
    });

    it('should handle logout API failure gracefully', async () => {
      const store = useAuthStoreBase.getState();
      const logoutError = new Error('Network error');
      mockAuthAPI.logout.mockRejectedValue(logoutError);

      await act(async () => {
        await store.logout();
      });

      // Should still clear local state even if API fails
      expect(store.user).toBeNull();
      expect(store.token).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });

    it('should handle specific logout errors without setting error state', async () => {
      const store = useAuthStoreBase.getState();
      const unauthorizedError = new Error('Unauthorized');
      unauthorizedError.status = 401;
      mockAuthAPI.logout.mockRejectedValue(unauthorizedError);

      await act(async () => {
        await store.logout();
      });

      // Should clear state without setting error for expected errors
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.error).toBeNull();
    });
  });

  describe('Token Refresh', () => {
    beforeEach(async () => {
      // Set up authenticated state
      const store = useAuthStoreBase.getState();
      await act(async () => {
        await store.login({ username: 'testuser', password: 'password' });
      });
    });

    it('should handle successful token refresh', async () => {
      const store = useAuthStoreBase.getState();

      await act(async () => {
        await store.refreshAccessToken();
      });

      expect(mockAuthAPI.refreshToken).toHaveBeenCalledWith('refresh-token-456');
      expect(store.token).toBe('new-access-token');
      expect(store.refreshToken).toBe('new-refresh-token');
      expect(store.error).toBeNull();
    });

    it('should handle refresh failure and logout', async () => {
      const store = useAuthStoreBase.getState();
      const refreshError = new Error('Refresh token expired');
      mockAuthAPI.refreshToken.mockRejectedValue(refreshError);

      await act(async () => {
        try {
          await store.refreshAccessToken();
        } catch (error) {
          // Expected to throw
        }
      });

      // Should logout user on refresh failure
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });

    it('should handle missing refresh token', async () => {
      const store = useAuthStoreBase.getState();
      // Clear refresh token
      store.setState({ refreshToken: null });

      await act(async () => {
        try {
          await store.refreshAccessToken();
        } catch (error) {
          expect(error.message).toBe('No refresh token available');
        }
      });
    });
  });

  describe('State Management', () => {
    it('should allow setting user', () => {
      const store = useAuthStoreBase.getState();

      act(() => {
        store.setUser(mockUser);
      });

      expect(store.user).toEqual(mockUser);
    });

    it('should allow setting error', () => {
      const store = useAuthStoreBase.getState();

      act(() => {
        store.setError('Test error');
      });

      expect(store.error).toBe('Test error');
    });

    it('should allow clearing error', () => {
      const store = useAuthStoreBase.getState();

      act(() => {
        store.setError('Test error');
        store.clearError();
      });

      expect(store.error).toBeNull();
    });

    it('should allow setting loading state', () => {
      const store = useAuthStoreBase.getState();

      act(() => {
        store.setLoading(true);
      });

      expect(store.isLoading).toBe(true);

      act(() => {
        store.setLoading(false);
      });

      expect(store.isLoading).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should persist auth state to localStorage', async () => {
      const store = useAuthStoreBase.getState();

      await act(async () => {
        await store.login({ username: 'testuser', password: 'password' });
      });

      const storedData = JSON.parse(localStorage.getItem('mes-auth-storage') || '{}');
      expect(storedData.state.token).toBe('access-token-123');
      expect(storedData.state.refreshToken).toBe('refresh-token-456');
      expect(storedData.state.user).toEqual(mockUser);
    });

    it('should only persist specific state fields', async () => {
      const store = useAuthStoreBase.getState();

      await act(async () => {
        await store.login({ username: 'testuser', password: 'password' });
        store.setError('Test error');
        store.setLoading(true);
      });

      const storedData = JSON.parse(localStorage.getItem('mes-auth-storage') || '{}');
      expect(storedData.state).toHaveProperty('token');
      expect(storedData.state).toHaveProperty('refreshToken');
      expect(storedData.state).toHaveProperty('user');
      expect(storedData.state).not.toHaveProperty('error');
      expect(storedData.state).not.toHaveProperty('isLoading');
      expect(storedData.state).not.toHaveProperty('isAuthenticated');
    });
  });

  describe('Context Provider and Hooks', () => {
    it('should provide auth store through context', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
    });

    it('should throw error when useAuthStore used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuthStore must be used within AuthProvider');

      console.error = originalError;
    });

    it('should handle login through context', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginBtn = screen.getByTestId('login-btn');
      await act(async () => {
        loginBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
        expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
      });
    });

    it('should handle logout through context', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Login first
      const loginBtn = screen.getByTestId('login-btn');
      await act(async () => {
        loginBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      });

      // Then logout
      const logoutBtn = screen.getByTestId('logout-btn');
      await act(async () => {
        logoutBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
        expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
      });
    });
  });

  describe('Selector Hooks', () => {
    beforeEach(async () => {
      // Set up authenticated state with permissions and roles
      const store = useAuthStoreBase.getState();
      await act(async () => {
        await store.login({ username: 'testuser', password: 'password' });
      });
    });

    it('should provide auth state through useAuth hook', () => {
      const { result } = renderHookWithProviders(
        () => useAuth(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should provide user through useUser hook', () => {
      const { result } = renderHookWithProviders(
        () => useUser(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      expect(result.current).toEqual(mockUser);
    });

    it('should provide permissions through usePermissions hook', () => {
      const { result } = renderHookWithProviders(
        () => usePermissions(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      expect(result.current).toEqual(['read', 'write', 'admin']);
    });

    it('should provide roles through useRoles hook', () => {
      const { result } = renderHookWithProviders(
        () => useRoles(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      expect(result.current).toEqual(['user', 'admin']);
    });

    it('should return empty arrays when no user', () => {
      // Logout first
      useAuthStoreBase.getState().logout();

      const { result: permissionsResult } = renderHookWithProviders(
        () => usePermissions(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      const { result: rolesResult } = renderHookWithProviders(
        () => useRoles(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      expect(permissionsResult.current).toEqual([]);
      expect(rolesResult.current).toEqual([]);
    });
  });

  describe('Permission Checking', () => {
    beforeEach(async () => {
      // Set up authenticated state with permissions and roles
      const store = useAuthStoreBase.getState();
      await act(async () => {
        await store.login({ username: 'testuser', password: 'password' });
      });
    });

    it('should check single permission', () => {
      const { result } = renderHookWithProviders(
        () => usePermissionCheck(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      expect(result.current.hasPermission('admin')).toBe(true);
      expect(result.current.hasPermission('delete')).toBe(false);
    });

    it('should check any permission', () => {
      const { result } = renderHookWithProviders(
        () => usePermissionCheck(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      expect(result.current.hasAnyPermission(['admin', 'delete'])).toBe(true);
      expect(result.current.hasAnyPermission(['delete', 'modify'])).toBe(false);
    });

    it('should check all permissions', () => {
      const { result } = renderHookWithProviders(
        () => usePermissionCheck(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      expect(result.current.hasAllPermissions(['read', 'write'])).toBe(true);
      expect(result.current.hasAllPermissions(['read', 'delete'])).toBe(false);
    });

    it('should check single role', () => {
      const { result } = renderHookWithProviders(
        () => usePermissionCheck(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('superuser')).toBe(false);
    });

    it('should check any role', () => {
      const { result } = renderHookWithProviders(
        () => usePermissionCheck(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      expect(result.current.hasAnyRole(['admin', 'superuser'])).toBe(true);
      expect(result.current.hasAnyRole(['superuser', 'manager'])).toBe(false);
    });

    it('should check all roles', () => {
      const { result } = renderHookWithProviders(
        () => usePermissionCheck(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      expect(result.current.hasAllRoles(['user', 'admin'])).toBe(true);
      expect(result.current.hasAllRoles(['user', 'superuser'])).toBe(false);
    });

    it('should return false for permissions when no user', () => {
      // Logout first
      useAuthStoreBase.getState().logout();

      const { result } = renderHookWithProviders(
        () => usePermissionCheck(),
        {
          wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>
        }
      );

      expect(result.current.hasPermission('admin')).toBe(false);
      expect(result.current.hasRole('user')).toBe(false);
      expect(result.current.permissions).toEqual([]);
      expect(result.current.roles).toEqual([]);
    });

    it('should show permission checks in test component', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Login first
      const loginBtn = screen.getByTestId('login-btn');
      await act(async () => {
        loginBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('has-admin-permission')).toHaveTextContent('Has Admin');
        expect(screen.getByTestId('has-admin-role')).toHaveTextContent('Admin Role');
        expect(screen.getByTestId('permissions-count')).toHaveTextContent('3');
        expect(screen.getByTestId('roles-count')).toHaveTextContent('2');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle and clear errors', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Cause login error
      mockAuthAPI.login.mockRejectedValue(new Error('Login failed'));

      const loginBtn = screen.getByTestId('login-btn');
      await act(async () => {
        loginBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Login failed');
      });

      // Clear error
      const clearErrorBtn = screen.getByTestId('clear-error-btn');
      await act(async () => {
        clearErrorBtn.click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    });
  });

  describe('Auth Synchronizer Integration', () => {
    it('should initialize auth synchronizer on login', async () => {
      const store = useAuthStoreBase.getState();

      await act(async () => {
        await store.login({ username: 'testuser', password: 'password' });
      });

      expect(MockAuthStateSynchronizer).toHaveBeenCalledWith(
        expect.objectContaining({
          syncIntervalMs: 30000,
          backgroundValidationMs: 120000,
          refreshBufferMs: 300000,
          enableE2ETestMode: true,
          persistentSync: true,
        })
      );
    });

    it('should clean up synchronizer on logout', async () => {
      const store = useAuthStoreBase.getState();

      // Login first
      await act(async () => {
        await store.login({ username: 'testuser', password: 'password' });
      });

      // Then logout
      await act(async () => {
        await store.logout();
      });

      expect(mockAuthSynchronizer.cleanup).toHaveBeenCalled();
    });
  });
});