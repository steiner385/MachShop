/**
 * CSRF Token Manager for Frontend
 * Handles CSRF token management for secure API requests
 * Part of GitHub Issue #117 - Cross-Site Request Forgery Protection
 */

interface CSRFManager {
  fetchCSRFToken(): Promise<string>;
  makeRequest(url: string, options?: RequestInit): Promise<Response>;
  refreshToken(): Promise<void>;
  isTokenValid(): boolean;
}

class CSRFTokenManager implements CSRFManager {
  private clientToken: string | null = null;
  private tokenTimestamp: number | null = null;
  private readonly TOKEN_LIFETIME = 3600000; // 1 hour in milliseconds

  /**
   * Fetch CSRF token from server via GET request
   * Automatically called when making authenticated requests
   */
  async fetchCSRFToken(): Promise<string> {
    try {
      // If we have a valid token, return it
      if (this.clientToken && this.isTokenValid()) {
        return this.clientToken;
      }

      // Fetch new token from dashboard endpoint (any GET endpoint works)
      const response = await fetch('/api/v1/dashboard/kpis', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const newToken = response.headers.get('X-CSRF-Client-Token');
      if (!newToken) {
        throw new Error('No CSRF token received from server');
      }

      this.clientToken = newToken;
      this.tokenTimestamp = Date.now();

      console.debug('CSRF token fetched successfully');
      return newToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      throw error;
    }
  }

  /**
   * Check if current token is still valid (not expired)
   */
  isTokenValid(): boolean {
    if (!this.clientToken || !this.tokenTimestamp) {
      return false;
    }

    const tokenAge = Date.now() - this.tokenTimestamp;
    return tokenAge < this.TOKEN_LIFETIME;
  }

  /**
   * Refresh the CSRF token by fetching a new one
   */
  async refreshToken(): Promise<void> {
    this.clientToken = null;
    this.tokenTimestamp = null;
    await this.fetchCSRFToken();
  }

  /**
   * Make an authenticated request with automatic CSRF token handling
   * @param url Request URL
   * @param options Request options (method, body, headers, etc.)
   */
  async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const method = options.method || 'GET';

    // GET, HEAD, OPTIONS don't need CSRF tokens
    const needsCSRF = !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());

    // Skip CSRF for auth and SSO endpoints
    const isAuthEndpoint = url.includes('/auth') || url.includes('/sso');

    let headers = new Headers(options.headers);

    // Add authorization header if available
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Add CSRF token for state-changing requests on protected endpoints
    if (needsCSRF && !isAuthEndpoint && token) {
      try {
        const csrfToken = await this.fetchCSRFToken();
        headers.set('X-CSRF-Client-Token', csrfToken);
        console.debug('CSRF token added to request:', method, url);
      } catch (error) {
        console.warn('Failed to get CSRF token, proceeding without it:', error);
      }
    }

    // Ensure Content-Type is set for JSON requests
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // Include cookies for CSRF server token
    };

    try {
      const response = await fetch(url, requestOptions);

      // If we get a CSRF error, try to refresh token and retry once
      if (response.status === 403) {
        const errorData = await response.clone().json().catch(() => ({}));

        if (errorData.code === 'CSRF_TOKEN_INVALID' || errorData.code === 'CSRF_TOKEN_MISSING') {
          console.warn('CSRF token invalid, refreshing and retrying...');

          try {
            await this.refreshToken();
            const newToken = await this.fetchCSRFToken();
            headers.set('X-CSRF-Client-Token', newToken);

            return fetch(url, { ...requestOptions, headers });
          } catch (retryError) {
            console.error('Failed to retry request with new CSRF token:', retryError);
            return response;
          }
        }
      }

      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  /**
   * Clear stored CSRF token (e.g., on logout)
   */
  clearToken(): void {
    this.clientToken = null;
    this.tokenTimestamp = null;
    console.debug('CSRF token cleared');
  }
}

// Export singleton instance
export const csrfManager = new CSRFTokenManager();

// Export utility functions for easy use
export const makeSecureRequest = (url: string, options?: RequestInit) =>
  csrfManager.makeRequest(url, options);

export const refreshCSRFToken = () =>
  csrfManager.refreshToken();

export const clearCSRFToken = () =>
  csrfManager.clearToken();

// React hook for CSRF-protected requests
export const useCSRFRequest = () => {
  return {
    makeRequest: makeSecureRequest,
    refreshToken: refreshCSRFToken,
    clearToken: clearCSRFToken,
    isTokenValid: () => csrfManager.isTokenValid(),
  };
};

export default csrfManager;