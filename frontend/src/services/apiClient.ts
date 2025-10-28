import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { createAuthResponseInterceptor } from '@/utils/authInterceptor';

interface ConnectionState {
  isConnected: boolean;
  lastCheck: Date | null;
  consecutiveFailures: number;
  isHealthy: boolean;
}

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private connectionState: ConnectionState;
  private healthCheckTimeout: number;
  private isTestEnvironment: boolean;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || '/api/v1';

    // Detect test environment for optimized timeouts
    this.isTestEnvironment =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' && window.location.port === '5173') ||
      process.env.NODE_ENV === 'test' ||
      typeof (globalThis as any).playwright !== 'undefined';

    // Use shorter timeouts in test environments
    this.healthCheckTimeout = this.isTestEnvironment ? 3000 : 10000;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.healthCheckTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize connection state
    this.connectionState = {
      isConnected: false,
      lastCheck: null,
      consecutiveFailures: 0,
      isHealthy: false
    };

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        // Get token from localStorage directly to avoid React context issues
        try {
          const authStorage = localStorage.getItem('mes-auth-storage');
          if (authStorage) {
            const parsedAuth = JSON.parse(authStorage);
            const token = parsedAuth?.state?.token;
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          }
        } catch (error) {
          console.warn('Failed to get auth token from storage:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle common errors with centralized auth and connection tracking
    const authInterceptor = createAuthResponseInterceptor();
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Update connection state on successful response
        this.updateConnectionState(true);
        return response;
      },
      async (error) => {
        // Update connection state on error
        if (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR' || !error.response) {
          this.updateConnectionState(false);
        } else {
          // Server responded, so connection is technically working
          this.updateConnectionState(true);
        }

        // Handle 401 through centralized auth interceptor
        if (error.response?.status === 401) {
          try {
            await authInterceptor.onRejected(error);
          } catch (authError) {
            // The auth interceptor re-throws the error after handling 401
            // Continue with normal error processing
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }

  // File upload
  async uploadFile<T>(url: string, formData: FormData): Promise<T> {
    const response = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename || 'download';
    link.click();
    window.URL.revokeObjectURL(link.href);
  }

  /**
   * Update connection state based on request success/failure
   */
  private updateConnectionState(isSuccessful: boolean): void {
    const now = new Date();
    this.connectionState.lastCheck = now;

    if (isSuccessful) {
      this.connectionState.isConnected = true;
      this.connectionState.consecutiveFailures = 0;
      this.connectionState.isHealthy = true;
    } else {
      this.connectionState.isConnected = false;
      this.connectionState.consecutiveFailures++;
      this.connectionState.isHealthy = this.connectionState.consecutiveFailures < 3;
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if API is connected (has recent successful request)
   */
  isConnected(): boolean {
    if (!this.connectionState.lastCheck) return false;

    const timeSinceLastCheck = Date.now() - this.connectionState.lastCheck.getTime();
    const staleThreshold = this.isTestEnvironment ? 30000 : 60000; // 30s in test, 60s in prod

    return this.connectionState.isConnected && timeSinceLastCheck < staleThreshold;
  }

  /**
   * Enhanced health check with retry logic and circuit breaker
   */
  async healthCheck(options: { maxRetries?: number; retryDelay?: number } = {}): Promise<{
    status: string;
    timestamp: string;
    isHealthy: boolean;
    consecutiveFailures: number;
    connectionState: ConnectionState;
  }> {
    const { maxRetries = 3, retryDelay = 1000 } = options;

    // Circuit breaker: If too many failures, return cached state
    if (this.connectionState.consecutiveFailures >= 5) {
      console.warn('[ApiClient] Circuit breaker: Too many failures, skipping health check');
      return {
        status: 'circuit_breaker_open',
        timestamp: new Date().toISOString(),
        isHealthy: false,
        consecutiveFailures: this.connectionState.consecutiveFailures,
        connectionState: this.getConnectionState()
      };
    }

    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.get<{ status: string; timestamp: string }>('/health');

        // Health check succeeded
        const response = {
          ...result,
          isHealthy: true,
          consecutiveFailures: this.connectionState.consecutiveFailures,
          connectionState: this.getConnectionState()
        };

        if (this.isTestEnvironment) {
          console.log(`[ApiClient] Health check passed (attempt ${attempt}/${maxRetries})`);
        }

        return response;
      } catch (error: any) {
        lastError = error;

        if (this.isTestEnvironment) {
          console.log(`[ApiClient] Health check failed (attempt ${attempt}/${maxRetries}):`, error.message);
        }

        // Don't retry on client errors (4xx) - these won't be fixed by retrying
        if (error.response?.status >= 400 && error.response?.status < 500) {
          break;
        }

        // Wait before retry (except on last attempt)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    // All retries failed
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      isHealthy: false,
      consecutiveFailures: this.connectionState.consecutiveFailures,
      connectionState: this.getConnectionState()
    };
  }

  /**
   * Wait for API to become healthy (useful for tests)
   */
  async waitForHealthy(options: {
    timeout?: number;
    checkInterval?: number;
    maxConsecutiveFailures?: number
  } = {}): Promise<boolean> {
    const {
      timeout = this.isTestEnvironment ? 10000 : 30000,
      checkInterval = this.isTestEnvironment ? 1000 : 2000,
      maxConsecutiveFailures = 5
    } = options;

    const startTime = Date.now();
    let consecutiveFailures = 0;

    while (Date.now() - startTime < timeout) {
      try {
        const health = await this.healthCheck({ maxRetries: 1 });

        if (health.isHealthy) {
          if (this.isTestEnvironment) {
            console.log('[ApiClient] API is healthy');
          }
          return true;
        }

        consecutiveFailures++;

        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.warn(`[ApiClient] Too many consecutive health check failures (${consecutiveFailures})`);
          return false;
        }

      } catch (error) {
        consecutiveFailures++;

        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.warn(`[ApiClient] Health check error limit reached:`, error);
          return false;
        }
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    console.warn(`[ApiClient] Health check timeout after ${timeout}ms`);
    return false;
  }
}

export const apiClient = new ApiClient();
export default apiClient;