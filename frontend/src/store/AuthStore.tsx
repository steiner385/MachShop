import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { authAPI, tokenUtils } from '@/api/auth';
import { User, LoginRequest, LoginResponse, SamlAuthRequest, SamlProviderInfo, SamlDiscoveryResponse } from '@/types/auth';
import { AuthStateSynchronizer } from '@/utils/AuthStateSynchronizer';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // SAML-specific state
  samlProviders: SamlProviderInfo[];
  isSamlDiscovering: boolean;
  samlDiscoveryResult: SamlDiscoveryResponse | null;
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  setUser: (user: User) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  // SAML-specific actions
  discoverSamlProviders: (email: string) => Promise<void>;
  initiateSamlAuth: (request: SamlAuthRequest) => Promise<void>;
  loadSamlProviders: () => Promise<void>;
  clearSamlDiscovery: () => void;
}

type AuthStore = AuthState & AuthActions;

// Test mode detection
const isTestMode = () => {
  // Check for Playwright test environment
  if (typeof window !== 'undefined' && (window as any).__playwright) return true;
  // Check for test environment variables
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') return true;
  // Check for E2E test indicators in URL (when running on test ports)
  if (typeof window !== 'undefined' && window.location.port === '5178') return true;
  // Check for global test marker
  if (typeof window !== 'undefined' && (window as any).__E2E_TEST_MODE) return true;
  return false;
};

// Get initial test auth state from localStorage if in test mode
const getInitialTestAuthState = () => {
  if (!isTestMode() || typeof window === 'undefined') {
    return {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    samlProviders: [],
    isSamlDiscovering: false,
    samlDiscoveryResult: null
  };
  }

  try {
    const authStorage = localStorage.getItem('mes-auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const authState = parsed.state;
      
      if (authState?.token && authState?.user) {
        console.log('[TEST MODE] Using pre-existing auth state from localStorage');
        return {
          user: authState.user,
          token: authState.token,
          refreshToken: authState.refreshToken,
          isAuthenticated: true,
          isLoading: false,
          samlProviders: [],
          isSamlDiscovering: false,
          samlDiscoveryResult: null
        };
      }
    }
  } catch (error) {
    console.warn('[TEST MODE] Failed to parse auth state from localStorage:', error);
  }

  return {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    samlProviders: [],
    isSamlDiscovering: false,
    samlDiscoveryResult: null
  };
};

export const useAuthStoreBase = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => {
        const initialTestState = getInitialTestAuthState();
        
        return {
          // Initial state - use test state if in test mode
          user: initialTestState.user,
          token: initialTestState.token,
          refreshToken: initialTestState.refreshToken,
          isAuthenticated: initialTestState.isAuthenticated,
          isLoading: initialTestState.isLoading,
          error: null,
          // SAML initial state
          samlProviders: initialTestState.samlProviders,
          isSamlDiscovering: initialTestState.isSamlDiscovering,
          samlDiscoveryResult: initialTestState.samlDiscoveryResult,

          // Actions
          login: async (credentials: LoginRequest) => {
          try {
            set({ isLoading: true, error: null });

            const response: LoginResponse = await authAPI.login(credentials);

            set({
              user: response.user,
              token: response.token,
              refreshToken: response.refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            // Set auth header for future requests
            tokenUtils.setAuthHeader(response.token);

            // Initialize synchronizer (automatically starts monitoring - replaces scheduleTokenRefresh)
            const synchronizer = initializeAuthSynchronizer();

            console.log('[AuthStore] Login successful, auth synchronizer initialized');
          } catch (error: any) {
            set({
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
              error: error.message || 'Login failed',
            });
            throw error;
          }
        },

        logout: async () => {
          try {
            set({ isLoading: true, error: null });

            // Call logout API and wait for completion
            await authAPI.logout();

            console.log('[AuthStore] Logout API call successful');
          } catch (error: any) {
            // Log the error but don't prevent logout completion
            console.error('[AuthStore] Logout API error:', error);

            // For certain errors, we still want to complete local logout
            const shouldContinueLogout =
              error.status === 401 || // Already logged out on server
              error.status === 404 || // Logout endpoint not found
              error.name === 'NetworkError' || // Network issues
              error.code === 'ECONNREFUSED'; // Server unreachable

            if (!shouldContinueLogout) {
              // For unexpected errors, set error state but still clear tokens
              set({
                error: `Logout failed: ${error.message || 'Unknown error'}`,
                isLoading: false
              });
            }
          } finally {
            // Always clear local auth state regardless of API call result
            // This ensures user is logged out locally even if server is unreachable

            // Clear auth header
            tokenUtils.removeAuthHeader();

            // Clean up auth synchronizer (replaces clearTokenRefreshTimeout)
            cleanupAuthSynchronizer();

            // Reset auth state
            set({
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
              // Keep any error from the API call
            });

            console.log('[AuthStore] Local logout completed, auth synchronizer cleaned up');
          }
        },

        refreshAccessToken: async () => {
          try {
            const { refreshToken } = get();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await authAPI.refreshToken(refreshToken);

            set({
              token: response.token,
              refreshToken: response.refreshToken || refreshToken,
              error: null,
            });

            // Set auth header for future requests
            tokenUtils.setAuthHeader(response.token);

            // If synchronizer is running, it will handle subsequent refreshes
            // No need to schedule next refresh manually
            console.log('[AuthStore] Manual token refresh successful, synchronizer will handle future refreshes');
          } catch (error: any) {
            // Refresh failed, logout user
            try {
              await get().logout();
            } catch (logoutError) {
              // Don't let logout errors interfere with the original refresh error
              console.error('[AuthStore] Logout error during refresh failure:', logoutError);
            }
            throw error;
          }
        },

        setUser: (user: User) => {
          set({ user });
        },

        setError: (error: string | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },

        initialize: async () => {
          try {
            console.log('[AuthStore] Starting auth initialization with synchronizer support');

            const { token, refreshToken, user } = get();

            // If no token, immediately finish loading
            if (!token) {
              set({ isLoading: false });
              console.log('[AuthStore] No token found, initialization complete');
              return;
            }

            // In test mode with valid cached state, use optimized path
            if (isTestMode() && user && token) {
              console.log('[TEST MODE] Using cached auth state, initializing synchronizer');
              set({ isAuthenticated: true, isLoading: false });

              // Even in test mode, initialize synchronizer for robust state management
              const synchronizer = initializeAuthSynchronizer();
              return;
            }

            // Initialize synchronizer - it will handle state validation and recovery
            const synchronizer = initializeAuthSynchronizer();

            // Set auth header before synchronizer validation
            tokenUtils.setAuthHeader(token);

            // Synchronizer will automatically handle auth state validation
            // It will validate tokens, refresh if needed, and resolve conflicts

            // Update loading state - synchronizer will handle the rest
            set({ isLoading: false });

            console.log('[AuthStore] Auth initialization complete, synchronizer handling state management');
          } catch (error) {
            console.error('[AuthStore] Auth initialization error:', error);
            set({ isLoading: false, error: 'Authentication initialization failed' });
          }
        },

        // SAML Authentication Actions

        discoverSamlProviders: async (email: string) => {
          try {
            set({ isSamlDiscovering: true, error: null });

            const response: SamlDiscoveryResponse = await authAPI.discoverSamlProviders(email);

            set({
              isSamlDiscovering: false,
              samlDiscoveryResult: response,
              error: null,
            });

            console.log('[AuthStore] SAML provider discovery successful');
          } catch (error: any) {
            set({
              isSamlDiscovering: false,
              samlDiscoveryResult: null,
              error: error.message || 'SAML provider discovery failed',
            });
            throw error;
          }
        },

        initiateSamlAuth: async (request: SamlAuthRequest) => {
          try {
            set({ isLoading: true, error: null });

            const response = await authAPI.initiateSamlAuth(request);

            // Redirect to SAML IdP for authentication
            if (response.redirectUrl) {
              window.location.href = response.redirectUrl;
            } else {
              throw new Error('No redirect URL received from SAML provider');
            }

            console.log('[AuthStore] SAML authentication initiated');
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.message || 'SAML authentication initiation failed',
            });
            throw error;
          }
        },

        loadSamlProviders: async () => {
          try {
            const providers: SamlProviderInfo[] = await authAPI.getSamlProviders();

            set({
              samlProviders: providers,
              error: null,
            });

            console.log('[AuthStore] SAML providers loaded successfully');
          } catch (error: any) {
            set({
              error: error.message || 'Failed to load SAML providers',
            });
            throw error;
          }
        },

        clearSamlDiscovery: () => {
          set({
            samlDiscoveryResult: null,
            isSamlDiscovering: false,
          });
        },
      };
    },
      {
        name: 'mes-auth-storage',
        partialize: (state) => ({
          token: state.token,
          refreshToken: state.refreshToken,
          user: state.user,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Auth State Synchronizer instance (replaces manual timeout management)
let authSynchronizer: AuthStateSynchronizer | null = null;

// Initialize synchronizer with auth store integration
const initializeAuthSynchronizer = () => {
  if (authSynchronizer) {
    return authSynchronizer;
  }

  const storeActions = useAuthStoreBase.getState();

  authSynchronizer = new AuthStateSynchronizer({
    syncIntervalMs: 30000, // 30 second sync interval
    backgroundValidationMs: 120000, // 2 minute background validation
    refreshBufferMs: 300000, // 5 minute refresh buffer
    enableE2ETestMode: isTestMode(),
    persistentSync: true,
    onStateResolved: async (resolvedState) => {
      console.log('[AuthStore] Applying resolved auth state from synchronizer');

      // Apply resolved state to Zustand store
      storeActions.setUser(resolvedState.user);
      storeActions.setError(null);

      // Update Zustand store with synchronized state
      const { setState } = useAuthStoreBase;
      setState({
        user: resolvedState.user,
        token: resolvedState.token,
        refreshToken: resolvedState.refreshToken,
        isAuthenticated: resolvedState.isAuthenticated,
        isLoading: false,
        error: null
      });

      // Set auth header
      if (resolvedState.token) {
        tokenUtils.setAuthHeader(resolvedState.token);
      } else {
        tokenUtils.removeAuthHeader();
      }
    },
    onTokenRefreshed: async (newToken, newRefreshToken) => {
      console.log('[AuthStore] Token refreshed by synchronizer');

      // Update Zustand store with new tokens
      const { setState } = useAuthStoreBase;
      setState({
        token: newToken,
        refreshToken: newRefreshToken,
        error: null
      });

      // Set new auth header
      tokenUtils.setAuthHeader(newToken);
    },
    onAuthError: async (error) => {
      console.error('[AuthStore] Auth error from synchronizer:', error);

      // Trigger logout through normal flow
      try {
        await storeActions.logout();
      } catch (logoutError) {
        console.error('[AuthStore] Logout error during synchronizer auth error:', logoutError);
      }
    }
  });

  return authSynchronizer;
};

const cleanupAuthSynchronizer = () => {
  if (authSynchronizer) {
    authSynchronizer.cleanup();
    authSynchronizer = null;
  }
};

const parseExpiresIn = (expiresIn: string): number => {
  const match = expiresIn.match(/(\d+)([smhd])/);
  if (!match) return 24 * 60 * 60 * 1000; // Default 24 hours

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
};

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthStore | null>(null);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const store = useAuthStoreBase();

  useEffect(() => {
    // Initialize auth state on app start with synchronizer support
    store.initialize();

    // Cleanup on unmount - clean up synchronizer instead of manual timeouts
    return () => {
      console.log('[AuthProvider] Cleaning up auth synchronizer on unmount');
      cleanupAuthSynchronizer();
    };
  }, []);

  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
};

// Hook to use auth store
export const useAuthStore = (): AuthStore => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthStore must be used within AuthProvider');
  }
  return context;
};

// Selector hooks for specific auth state
export const useAuth = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  return { user, isAuthenticated, isLoading };
};

export const useUser = () => {
  const { user } = useAuthStore();
  return user;
};

export const usePermissions = () => {
  const { user } = useAuthStore();
  return user?.permissions || [];
};

export const useRoles = () => {
  const { user } = useAuthStore();
  return user?.roles || [];
};

// Permission check hook with utility functions
export const usePermissionCheck = () => {
  const { user } = useAuthStore();

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => user?.permissions?.includes(permission)) ?? false;
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => user?.permissions?.includes(permission)) ?? false;
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => user?.roles?.includes(role)) ?? false;
  };

  const hasAllRoles = (roles: string[]): boolean => {
    return roles.every(role => user?.roles?.includes(role)) ?? false;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    permissions: user?.permissions || [],
    roles: user?.roles || []
  };
};

// SAML-specific hooks

/**
 * Hook for SAML authentication functionality
 */
export const useSamlAuth = () => {
  const {
    samlProviders,
    isSamlDiscovering,
    samlDiscoveryResult,
    discoverSamlProviders,
    initiateSamlAuth,
    loadSamlProviders,
    clearSamlDiscovery,
  } = useAuthStore();

  return {
    samlProviders,
    isSamlDiscovering,
    samlDiscoveryResult,
    discoverSamlProviders,
    initiateSamlAuth,
    loadSamlProviders,
    clearSamlDiscovery,
  };
};

/**
 * Hook to get available SAML providers
 */
export const useSamlProviders = () => {
  const { samlProviders, loadSamlProviders } = useAuthStore();
  return { samlProviders, loadSamlProviders };
};

/**
 * Hook for SAML provider discovery
 */
export const useSamlDiscovery = () => {
  const {
    isSamlDiscovering,
    samlDiscoveryResult,
    discoverSamlProviders,
    clearSamlDiscovery,
  } = useAuthStore();

  return {
    isSamlDiscovering,
    samlDiscoveryResult,
    discoverSamlProviders,
    clearSamlDiscovery,
  };
};