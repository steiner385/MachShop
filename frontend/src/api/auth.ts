import axios from 'axios';
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  ChangePasswordRequest,
  User,
  SamlAuthRequest,
  SamlProviderInfo,
  SamlDiscoveryResponse
} from '@/types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create axios instance
const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling and 401 detection
authClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle 401 Unauthorized - trigger logout
    if (error.response?.status === 401) {
      // Get the auth store dynamically to avoid circular dependency
      // We'll check if we're already on the login page to avoid redirect loops
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        // Clear localStorage to force logout
        localStorage.removeItem('mes-auth-storage');
        // Redirect to login with the current path as redirect URL
        const redirectUrl = window.location.pathname + window.location.search;
        window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
      }
    }

    if (error.response?.data) {
      throw new Error(error.response.data.message || 'Authentication failed');
    }
    throw new Error(error.message || 'Network error');
  }
);

export const authAPI = {
  /**
   * User login
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    return authClient.post('/auth/login', credentials);
  },

  /**
   * User logout
   */
  logout: async (): Promise<void> => {
    return authClient.post('/auth/logout');
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    return authClient.post('/auth/refresh', { refreshToken });
  },

  /**
   * Get current user information
   */
  getCurrentUser: async (): Promise<User> => {
    return authClient.get('/auth/me');
  },

  /**
   * Change user password
   */
  changePassword: async (passwordData: ChangePasswordRequest): Promise<void> => {
    return authClient.post('/auth/change-password', passwordData);
  },

  /**
   * Verify token validity
   */
  verifyToken: async (token: string): Promise<boolean> => {
    try {
      await authClient.get('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  // SAML Authentication Functions

  /**
   * Discover SAML providers by email domain
   */
  discoverSamlProviders: async (email: string): Promise<SamlDiscoveryResponse> => {
    return authClient.post('/sso/saml/discover', { email });
  },

  /**
   * Initiate SAML authentication with a specific provider
   */
  initiateSamlAuth: async (request: SamlAuthRequest): Promise<{ redirectUrl: string }> => {
    return authClient.post(`/sso/saml/login/${request.configId}`, {
      email: request.email,
      returnUrl: request.returnUrl,
      relayState: request.relayState,
    });
  },

  /**
   * Validate SAML provider configuration
   */
  validateSamlConfig: async (configId: string): Promise<{ isValid: boolean; errors?: string[] }> => {
    return authClient.get(`/sso/saml/validate-config/${configId}`);
  },

  /**
   * Get available SAML providers (public information)
   */
  getSamlProviders: async (): Promise<SamlProviderInfo[]> => {
    return authClient.get('/sso/saml/providers');
  },
};

// Utility functions for token management
export const tokenUtils = {
  /**
   * Get token from localStorage
   */
  getToken: (): string | null => {
    try {
      const authStorage = localStorage.getItem('mes-auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        return parsed.state?.token || null;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Set authorization header for API calls
   */
  setAuthHeader: (token: string): void => {
    authClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  /**
   * Remove authorization header
   */
  removeAuthHeader: (): void => {
    delete authClient.defaults.headers.common['Authorization'];
  },

  /**
   * Check if token is expired (basic check)
   */
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  },
};

export default authClient;