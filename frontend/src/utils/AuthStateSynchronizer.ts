/**
 * Frontend/Backend Authentication State Synchronizer
 *
 * Addresses the 45% impact Frontend/Backend State Desync issue by:
 * - Consistent state validation against backend
 * - Persistent token refresh scheduling
 * - Graceful state conflict resolution
 * - Integration with backend AuthenticationManager
 *
 * Key Features:
 * - Persistent state sync across browser reloads
 * - Automatic conflict resolution
 * - Background state validation
 * - Token expiry monitoring with buffer
 * - E2E test mode support
 */

import { tokenUtils } from '@/api/auth';

export interface AuthSyncState {
  token: string | null;
  refreshToken: string | null;
  user: any | null;
  isAuthenticated: boolean;
  lastSyncAt: number;
  backendValidatedAt: number;
}

export interface AuthSyncConfig {
  syncIntervalMs: number;
  tokenValidationIntervalMs: number;
  stateValidationTimeoutMs: number;
  maxSyncRetries: number;
  backendValidationBufferMs: number;
  persistentRefreshEnabled: boolean;
}

export class AuthStateSynchronizer {
  private static instance: AuthStateSynchronizer;
  private config: AuthSyncConfig;

  // State management
  private currentState: AuthSyncState | null = null;
  private syncTimer: number | null = null;
  private validationTimer: number | null = null;
  private persistentRefreshTimer: number | null = null;

  // Event handling
  private eventListeners: Map<string, Set<Function>> = new Map();
  private isTestMode: boolean = false;

  // Sync status tracking
  private isSyncing: boolean = false;
  private lastSyncError: string | null = null;
  private syncRetryCount: number = 0;

  private constructor(config?: Partial<AuthSyncConfig>) {
    this.config = {
      syncIntervalMs: 30000, // 30 seconds
      tokenValidationIntervalMs: 60000, // 1 minute
      stateValidationTimeoutMs: 10000, // 10 seconds
      maxSyncRetries: 3,
      backendValidationBufferMs: 300000, // 5 minutes
      persistentRefreshEnabled: true,
      ...config
    };

    // Detect test mode
    this.isTestMode = this.detectTestMode();

    // Initialize persistent state management
    this.initializePersistentState();

    // Start background sync
    this.startBackgroundSync();

    console.log('[AuthSync] Initialized with config:', {
      isTestMode: this.isTestMode,
      config: this.config
    });
  }

  public static getInstance(config?: Partial<AuthSyncConfig>): AuthStateSynchronizer {
    if (!AuthStateSynchronizer.instance) {
      AuthStateSynchronizer.instance = new AuthStateSynchronizer(config);
    }
    return AuthStateSynchronizer.instance;
  }

  /**
   * Detect test mode consistently
   */
  private detectTestMode(): boolean {
    // Check for Playwright test environment
    if (typeof window !== 'undefined' && (window as any).__playwright) return true;
    // Check for test environment variables
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') return true;
    // Check for E2E test indicators in URL
    if (typeof window !== 'undefined' && (window.location.port === '5178' || window.location.port === '3103')) return true;
    // Check for global test marker
    if (typeof window !== 'undefined' && (window as any).__E2E_TEST_MODE) return true;
    // Check for test HTTP headers
    if (typeof window !== 'undefined' && document.querySelector('meta[name="x-test-mode"]')) return true;
    return false;
  }

  /**
   * Initialize persistent state management
   */
  private initializePersistentState(): void {
    try {
      // Load state from localStorage
      const storedState = this.loadStoredState();
      if (storedState) {
        this.currentState = storedState;
        console.log('[AuthSync] Loaded persistent state:', {
          hasToken: !!storedState.token,
          hasUser: !!storedState.user,
          lastSyncAt: new Date(storedState.lastSyncAt).toISOString(),
          isAuthenticated: storedState.isAuthenticated
        });
      }

      // Set up persistent refresh if enabled and in normal mode
      if (this.config.persistentRefreshEnabled && !this.isTestMode) {
        this.setupPersistentTokenRefresh();
      }

    } catch (error: any) {
      console.error('[AuthSync] Failed to initialize persistent state:', error);
      this.currentState = null;
    }
  }

  /**
   * Load stored authentication state
   */
  private loadStoredState(): AuthSyncState | null {
    try {
      const authStorage = localStorage.getItem('mes-auth-storage');
      if (!authStorage) return null;

      const parsed = JSON.parse(authStorage);
      const authState = parsed.state;

      if (!authState?.token) return null;

      // Create sync state from stored auth state
      return {
        token: authState.token,
        refreshToken: authState.refreshToken,
        user: authState.user,
        isAuthenticated: !!authState.token && !!authState.user,
        lastSyncAt: Date.now(),
        backendValidatedAt: 0 // Will be validated on first sync
      };

    } catch (error) {
      console.warn('[AuthSync] Failed to load stored state:', error);
      return null;
    }
  }

  /**
   * Start background synchronization
   */
  private startBackgroundSync(): void {
    // Initial sync
    setTimeout(() => this.performSync(), 1000);

    // Set up periodic sync
    this.syncTimer = window.setInterval(() => {
      this.performSync();
    }, this.config.syncIntervalMs);

    // Set up token validation
    this.validationTimer = window.setInterval(() => {
      this.validateTokenWithBackend();
    }, this.config.tokenValidationIntervalMs);

    console.log('[AuthSync] Background sync started');
  }

  /**
   * Perform comprehensive state synchronization
   */
  private async performSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[AuthSync] Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;

    try {
      const frontendState = this.getCurrentFrontendState();
      const backendState = await this.getBackendState();

      console.log('[AuthSync] Performing sync:', {
        frontendAuthenticated: frontendState?.isAuthenticated || false,
        backendAuthenticated: backendState?.isAuthenticated || false,
        hasTokenConflict: this.hasTokenConflict(frontendState, backendState),
        hasUserConflict: this.hasUserConflict(frontendState, backendState)
      });

      // Resolve any conflicts
      const resolvedState = await this.resolveStateConflicts(frontendState, backendState);

      if (resolvedState) {
        await this.applyResolvedState(resolvedState);
        this.currentState = resolvedState;
        this.lastSyncError = null;
        this.syncRetryCount = 0;

        // Emit sync success event
        this.emit('sync-success', { state: resolvedState });
      }

    } catch (error: any) {
      console.error('[AuthSync] Sync failed:', error);
      this.lastSyncError = error.message;
      this.syncRetryCount++;

      // Emit sync error event
      this.emit('sync-error', { error, retryCount: this.syncRetryCount });

      // If max retries exceeded, force logout to prevent inconsistent state
      if (this.syncRetryCount >= this.config.maxSyncRetries) {
        console.error('[AuthSync] Max sync retries exceeded, forcing logout');
        await this.forceLogout();
        this.emit('sync-failure', { error, retriesExceeded: true });
      }

    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get current frontend authentication state
   */
  private getCurrentFrontendState(): AuthSyncState | null {
    try {
      // Try to get from zustand store first
      const authStorage = localStorage.getItem('mes-auth-storage');
      if (!authStorage) return null;

      const parsed = JSON.parse(authStorage);
      const authState = parsed.state;

      if (!authState?.token) return null;

      return {
        token: authState.token,
        refreshToken: authState.refreshToken,
        user: authState.user,
        isAuthenticated: !!authState.token && !!authState.user,
        lastSyncAt: this.currentState?.lastSyncAt || Date.now(),
        backendValidatedAt: this.currentState?.backendValidatedAt || 0
      };

    } catch (error) {
      console.warn('[AuthSync] Failed to get frontend state:', error);
      return null;
    }
  }

  /**
   * Get current backend authentication state
   */
  private async getBackendState(): Promise<AuthSyncState | null> {
    try {
      const frontendState = this.getCurrentFrontendState();
      if (!frontendState?.token) return null;

      // Set auth header for validation
      tokenUtils.setAuthHeader(frontendState.token);

      // First validate token
      const isTokenValid = await this.validateTokenDirectly(frontendState.token);
      if (!isTokenValid) {
        console.log('[AuthSync] Token validation failed');
        return null;
      }

      // Then get current user to verify full state
      const response = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${frontendState.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[AuthSync] Backend says token is invalid');
          return null;
        }
        throw new Error(`Backend validation failed: ${response.status}`);
      }

      const user = await response.json();

      return {
        token: frontendState.token,
        refreshToken: frontendState.refreshToken,
        user: user,
        isAuthenticated: true,
        lastSyncAt: Date.now(),
        backendValidatedAt: Date.now()
      };

    } catch (error: any) {
      console.warn('[AuthSync] Failed to get backend state:', error);
      return null;
    }
  }

  /**
   * Validate token directly with backend
   */
  private async validateTokenDirectly(token: string): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/auth/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) return false;

      const result = await response.json();
      return result.valid === true;

    } catch (error) {
      console.warn('[AuthSync] Token validation request failed:', error);
      return false;
    }
  }

  /**
   * Check for token conflicts between frontend and backend
   */
  private hasTokenConflict(frontend: AuthSyncState | null, backend: AuthSyncState | null): boolean {
    // If one is authenticated and the other isn't, there's a conflict
    if ((frontend?.isAuthenticated) !== (backend?.isAuthenticated)) {
      return true;
    }

    // If both are authenticated but tokens don't match, there's a conflict
    if (frontend?.isAuthenticated && backend?.isAuthenticated) {
      return frontend.token !== backend.token;
    }

    return false;
  }

  /**
   * Check for user conflicts between frontend and backend
   */
  private hasUserConflict(frontend: AuthSyncState | null, backend: AuthSyncState | null): boolean {
    if (!frontend?.user || !backend?.user) return false;

    // Check if user IDs don't match
    return frontend.user.id !== backend.user.id;
  }

  /**
   * Resolve state conflicts between frontend and backend
   */
  private async resolveStateConflicts(
    frontend: AuthSyncState | null,
    backend: AuthSyncState | null
  ): Promise<AuthSyncState | null> {

    // Case 1: No frontend state, no backend state
    if (!frontend && !backend) {
      console.log('[AuthSync] No auth state on either side');
      return null;
    }

    // Case 2: Frontend state exists, no backend state (token expired/invalid)
    if (frontend && !backend) {
      console.log('[AuthSync] Frontend state exists but backend validation failed - clearing frontend');
      return null; // This will trigger logout
    }

    // Case 3: No frontend state, backend state exists (shouldn't happen normally)
    if (!frontend && backend) {
      console.log('[AuthSync] Backend state exists but no frontend state - using backend');
      return backend;
    }

    // Case 4: Both states exist
    if (frontend && backend) {
      // If no conflicts, use backend as source of truth
      if (!this.hasTokenConflict(frontend, backend) && !this.hasUserConflict(frontend, backend)) {
        console.log('[AuthSync] States are consistent');
        return {
          ...backend,
          lastSyncAt: Date.now(),
          backendValidatedAt: Date.now()
        };
      }

      // If there are conflicts, backend wins (source of truth)
      console.log('[AuthSync] State conflicts detected, using backend as source of truth');
      return {
        ...backend,
        lastSyncAt: Date.now(),
        backendValidatedAt: Date.now()
      };
    }

    return null;
  }

  /**
   * Apply resolved state to frontend
   */
  private async applyResolvedState(resolvedState: AuthSyncState | null): Promise<void> {
    try {
      if (!resolvedState) {
        // Force logout if no valid state
        await this.forceLogout();
        return;
      }

      // Update localStorage with resolved state
      const authStorage = {
        state: {
          token: resolvedState.token,
          refreshToken: resolvedState.refreshToken,
          user: resolvedState.user
        },
        version: 0
      };

      localStorage.setItem('mes-auth-storage', JSON.stringify(authStorage));

      // Set auth header
      if (resolvedState.token) {
        tokenUtils.setAuthHeader(resolvedState.token);
      }

      console.log('[AuthSync] Applied resolved state:', {
        isAuthenticated: resolvedState.isAuthenticated,
        hasToken: !!resolvedState.token,
        hasUser: !!resolvedState.user,
        userId: resolvedState.user?.id
      });

    } catch (error: any) {
      console.error('[AuthSync] Failed to apply resolved state:', error);
      throw error;
    }
  }

  /**
   * Force logout to clear inconsistent state
   */
  private async forceLogout(): Promise<void> {
    try {
      console.log('[AuthSync] Forcing logout to clear inconsistent state');

      // Clear localStorage
      localStorage.removeItem('mes-auth-storage');

      // Clear auth header
      tokenUtils.removeAuthHeader();

      // Clear current state
      this.currentState = null;

      console.log('[AuthSync] Force logout completed');

    } catch (error: any) {
      console.error('[AuthSync] Force logout failed:', error);
    }
  }

  /**
   * Setup persistent token refresh using Web Workers or intervals
   */
  private setupPersistentTokenRefresh(): void {
    // Clear any existing timer
    if (this.persistentRefreshTimer) {
      clearInterval(this.persistentRefreshTimer);
    }

    // Check every minute for tokens that need refresh
    this.persistentRefreshTimer = window.setInterval(() => {
      this.checkTokenRefreshNeeded();
    }, 60000);

    console.log('[AuthSync] Persistent token refresh setup');
  }

  /**
   * Check if token needs refresh and perform it
   */
  private async checkTokenRefreshNeeded(): Promise<void> {
    try {
      const state = this.getCurrentFrontendState();
      if (!state?.token || !state?.refreshToken) return;

      // Parse token to get expiry
      const tokenPayload = this.parseJWTPayload(state.token);
      if (!tokenPayload?.exp) return;

      const expiryTime = tokenPayload.exp * 1000; // Convert to milliseconds
      const timeUntilExpiry = expiryTime - Date.now();
      const refreshBuffer = this.config.backendValidationBufferMs;

      // If token expires within the buffer time, refresh it
      if (timeUntilExpiry <= refreshBuffer) {
        console.log('[AuthSync] Token needs refresh - expiry soon');
        await this.performTokenRefresh(state.refreshToken);
      }

    } catch (error: any) {
      console.error('[AuthSync] Token refresh check failed:', error);
    }
  }

  /**
   * Parse JWT payload without verification
   */
  private parseJWTPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.warn('[AuthSync] Failed to parse JWT payload:', error);
      return null;
    }
  }

  /**
   * Perform token refresh
   */
  private async performTokenRefresh(refreshToken: string): Promise<void> {
    try {
      console.log('[AuthSync] Performing token refresh');

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const result = await response.json();

      // Update stored state with new tokens
      const authStorage = JSON.parse(localStorage.getItem('mes-auth-storage') || '{}');
      authStorage.state = {
        ...authStorage.state,
        token: result.token,
        refreshToken: result.refreshToken
      };

      localStorage.setItem('mes-auth-storage', JSON.stringify(authStorage));

      // Set new auth header
      tokenUtils.setAuthHeader(result.token);

      console.log('[AuthSync] Token refresh successful');
      this.emit('token-refreshed', { newToken: result.token });

    } catch (error: any) {
      console.error('[AuthSync] Token refresh failed:', error);
      this.emit('token-refresh-failed', { error });

      // Force logout on refresh failure
      await this.forceLogout();
    }
  }

  /**
   * Validate token with backend periodically
   */
  private async validateTokenWithBackend(): Promise<void> {
    try {
      const state = this.getCurrentFrontendState();
      if (!state?.token) return;

      // Skip validation if recently validated
      const timeSinceValidation = Date.now() - (this.currentState?.backendValidatedAt || 0);
      if (timeSinceValidation < this.config.backendValidationBufferMs) {
        return;
      }

      console.log('[AuthSync] Validating token with backend');
      const isValid = await this.validateTokenDirectly(state.token);

      if (!isValid) {
        console.log('[AuthSync] Token validation failed - triggering sync');
        await this.performSync();
      } else {
        // Update validation timestamp
        if (this.currentState) {
          this.currentState.backendValidatedAt = Date.now();
        }
      }

    } catch (error: any) {
      console.error('[AuthSync] Backend token validation failed:', error);
    }
  }

  /**
   * Event system
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[AuthSync] Event listener error for ${event}:`, error);
        }
      });
    }
  }

  public on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  public off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Get sync status for monitoring
   */
  public getSyncStatus(): any {
    return {
      isTestMode: this.isTestMode,
      isSyncing: this.isSyncing,
      lastSyncError: this.lastSyncError,
      syncRetryCount: this.syncRetryCount,
      currentState: this.currentState ? {
        isAuthenticated: this.currentState.isAuthenticated,
        hasToken: !!this.currentState.token,
        hasUser: !!this.currentState.user,
        lastSyncAt: new Date(this.currentState.lastSyncAt).toISOString(),
        backendValidatedAt: new Date(this.currentState.backendValidatedAt).toISOString()
      } : null,
      config: this.config
    };
  }

  /**
   * Force immediate sync
   */
  public async forcSync(): Promise<void> {
    console.log('[AuthSync] Force sync requested');
    await this.performSync();
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
    }

    if (this.persistentRefreshTimer) {
      clearInterval(this.persistentRefreshTimer);
      this.persistentRefreshTimer = null;
    }

    this.eventListeners.clear();
    console.log('[AuthSync] Cleanup completed');
  }
}

export default AuthStateSynchronizer;