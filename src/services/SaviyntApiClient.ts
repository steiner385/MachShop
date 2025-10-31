import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export interface SaviyntCredentials {
  username?: string;
  password?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface SaviyntUser {
  userkey?: string;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  displayname?: string;
  statuskey?: string;
  departmentname?: string;
  title?: string;
  manager?: string;
  employeeid?: string;
  enabledate?: string;
  disabledate?: string;
  attributes?: Record<string, any>;
}

export interface SaviyntRole {
  rolekey?: string;
  rolename: string;
  roledisplayname?: string;
  roledescription?: string;
  roleowner?: string;
  riskScore?: number;
  attributes?: Record<string, any>;
}

export interface SaviyntAccount {
  accountkey?: string;
  accountname: string;
  endpointname: string;
  accountstatus?: string;
  userkey?: string;
  username?: string;
  attributes?: Record<string, any>;
}

export interface SaviyntApiResponse<T = any> {
  errorCode: string;
  msg: string;
  result?: T;
  displaycount?: number;
  totalcount?: number;
}

export interface SaviyntBulkResponse {
  successrecords: number;
  failedrecords: number;
  failureDetails?: any[];
}

export interface SaviyntAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  obtained_at: number;
}

export class SaviyntApiClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private credentials: SaviyntCredentials;
  private authToken: SaviyntAuthToken | null = null;
  private readonly timeout: number;
  private readonly retryAttempts: number;

  constructor(credentials?: SaviyntCredentials) {
    this.baseUrl = config.saviynt.url;
    this.timeout = config.saviynt.timeout;
    this.retryAttempts = config.saviynt.retryAttempts;

    this.credentials = credentials || {
      username: config.saviynt.username,
      password: config.saviynt.password,
      apiKey: config.saviynt.apiKey,
      clientId: config.saviynt.clientId,
      clientSecret: config.saviynt.clientSecret,
    };

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        await this.ensureValidToken();

        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken.access_token}`;
        } else if (this.credentials.apiKey) {
          config.headers['X-API-Key'] = this.credentials.apiKey;
        }

        logger.debug('Saviynt API Request', {
          method: config.method,
          url: config.url,
          hasAuth: !!config.headers.Authorization || !!config.headers['X-API-Key'],
        });

        return config;
      },
      (error) => {
        logger.error('Saviynt API Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Saviynt API Response', {
          status: response.status,
          url: response.config.url,
          errorCode: response.data?.errorCode,
        });
        return response;
      },
      async (error: AxiosError) => {
        logger.error('Saviynt API Error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data,
        });

        // Handle token expiration
        if (error.response?.status === 401 && this.authToken) {
          logger.info('Saviynt token expired, attempting refresh');
          this.authToken = null;

          // Retry the original request
          if (error.config) {
            await this.ensureValidToken();
            return this.client.request(error.config);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Ensure we have a valid authentication token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.isTokenValid()) {
      await this.authenticate();
    }
  }

  /**
   * Check if current token is valid
   */
  private isTokenValid(): boolean {
    if (!this.authToken) return false;

    const now = Date.now();
    const expiresAt = this.authToken.obtained_at + (this.authToken.expires_in * 1000);

    // Consider token expired if it expires within next 5 minutes
    return now < (expiresAt - 300000);
  }

  /**
   * Authenticate with Saviynt using configured credentials
   */
  public async authenticate(): Promise<void> {
    try {
      let response: AxiosResponse<any>;

      if (this.credentials.clientId && this.credentials.clientSecret) {
        // OAuth2 Client Credentials flow
        response = await this.authenticateWithOAuth();
      } else if (this.credentials.username && this.credentials.password) {
        // Username/password authentication
        response = await this.authenticateWithCredentials();
      } else if (this.credentials.apiKey) {
        // API Key authentication (no token needed)
        logger.info('Using API Key authentication');
        return;
      } else {
        throw new Error('No valid authentication credentials provided');
      }

      if (response.data.access_token) {
        this.authToken = {
          access_token: response.data.access_token,
          token_type: response.data.token_type || 'Bearer',
          expires_in: response.data.expires_in || 3600,
          refresh_token: response.data.refresh_token,
          obtained_at: Date.now(),
        };

        logger.info('Saviynt authentication successful', {
          tokenType: this.authToken.token_type,
          expiresIn: this.authToken.expires_in,
        });
      } else {
        throw new Error('Authentication response missing access token');
      }
    } catch (error) {
      logger.error('Saviynt authentication failed', { error });
      throw new Error(`Saviynt authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * OAuth2 Client Credentials authentication
   */
  private async authenticateWithOAuth(): Promise<AxiosResponse<any>> {
    const tokenUrl = config.saviynt.tokenEndpoint || `${this.baseUrl}/oauth2/token`;

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.credentials.clientId!,
      client_secret: this.credentials.clientSecret!,
    });

    return axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: this.timeout,
    });
  }

  /**
   * Username/password authentication
   */
  private async authenticateWithCredentials(): Promise<AxiosResponse<any>> {
    const authUrl = `${this.baseUrl}/ECM/api/login`;

    return axios.post(authUrl, {
      username: this.credentials.username,
      password: this.credentials.password,
    }, {
      timeout: this.timeout,
    });
  }

  /**
   * Test connection to Saviynt
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      const response = await this.client.get('/ECM/api/v1/getHealthCheck');
      return response.status === 200 && response.data?.errorCode === '0';
    } catch (error) {
      logger.error('Saviynt connection test failed', { error });
      return false;
    }
  }

  /**
   * Generic API request with retry logic
   */
  private async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    params?: any
  ): Promise<SaviyntApiResponse<T>> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await this.client.request({
          method,
          url: endpoint,
          data,
          params,
        });

        const result: SaviyntApiResponse<T> = response.data;

        if (result.errorCode === '0') {
          return result;
        } else {
          throw new Error(`Saviynt API Error: ${result.errorCode} - ${result.msg}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          logger.warn(`Saviynt API request failed, retrying in ${delay}ms`, {
            attempt,
            error: lastError.message,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  // User Management APIs

  /**
   * Get user by username or userkey
   */
  public async getUser(identifier: string, byUserKey = false): Promise<SaviyntUser | null> {
    try {
      const searchParam = byUserKey ? 'userkey' : 'username';
      const response = await this.request<SaviyntUser[]>('GET', '/ECM/api/v1/getUser', null, {
        [searchParam]: identifier,
      });

      return response.result?.[0] || null;
    } catch (error) {
      logger.error('Failed to get Saviynt user', { identifier, error });
      throw error;
    }
  }

  /**
   * Create a new user
   */
  public async createUser(user: SaviyntUser): Promise<string> {
    try {
      const response = await this.request<{ userkey: string }>('POST', '/ECM/api/v1/createUser', {
        userdata: [user],
      });

      return response.result?.userkey || '';
    } catch (error) {
      logger.error('Failed to create Saviynt user', { user, error });
      throw error;
    }
  }

  /**
   * Update an existing user
   */
  public async updateUser(userKey: string, updates: Partial<SaviyntUser>): Promise<void> {
    try {
      await this.request('POST', '/ECM/api/v1/updateUser', {
        userdata: [{
          userkey: userKey,
          ...updates,
        }],
      });
    } catch (error) {
      logger.error('Failed to update Saviynt user', { userKey, updates, error });
      throw error;
    }
  }

  /**
   * Disable a user
   */
  public async disableUser(userKey: string): Promise<void> {
    try {
      await this.request('POST', '/ECM/api/v1/updateUser', {
        userdata: [{
          userkey: userKey,
          statuskey: '0', // 0 = Disabled
        }],
      });
    } catch (error) {
      logger.error('Failed to disable Saviynt user', { userKey, error });
      throw error;
    }
  }

  /**
   * Enable a user
   */
  public async enableUser(userKey: string): Promise<void> {
    try {
      await this.request('POST', '/ECM/api/v1/updateUser', {
        userdata: [{
          userkey: userKey,
          statuskey: '1', // 1 = Enabled
        }],
      });
    } catch (error) {
      logger.error('Failed to enable Saviynt user', { userKey, error });
      throw error;
    }
  }

  // Role Management APIs

  /**
   * Get role by name or rolekey
   */
  public async getRole(identifier: string, byRoleKey = false): Promise<SaviyntRole | null> {
    try {
      const searchParam = byRoleKey ? 'rolekey' : 'rolename';
      const response = await this.request<SaviyntRole[]>('GET', '/ECM/api/v1/getRole', null, {
        [searchParam]: identifier,
      });

      return response.result?.[0] || null;
    } catch (error) {
      logger.error('Failed to get Saviynt role', { identifier, error });
      throw error;
    }
  }

  /**
   * Create a new role
   */
  public async createRole(role: SaviyntRole): Promise<string> {
    try {
      const response = await this.request<{ rolekey: string }>('POST', '/ECM/api/v1/createRole', {
        roledata: [role],
      });

      return response.result?.rolekey || '';
    } catch (error) {
      logger.error('Failed to create Saviynt role', { role, error });
      throw error;
    }
  }

  /**
   * Update an existing role
   */
  public async updateRole(roleKey: string, updates: Partial<SaviyntRole>): Promise<void> {
    try {
      await this.request('POST', '/ECM/api/v1/updateRole', {
        roledata: [{
          rolekey: roleKey,
          ...updates,
        }],
      });
    } catch (error) {
      logger.error('Failed to update Saviynt role', { roleKey, updates, error });
      throw error;
    }
  }

  // Access Management APIs

  /**
   * Assign role to user
   */
  public async assignRoleToUser(userKey: string, roleKey: string): Promise<void> {
    try {
      await this.request('POST', '/ECM/api/v1/addAccessToUser', {
        username: userKey,
        rolename: roleKey,
      });
    } catch (error) {
      logger.error('Failed to assign role to user', { userKey, roleKey, error });
      throw error;
    }
  }

  /**
   * Remove role from user
   */
  public async removeRoleFromUser(userKey: string, roleKey: string): Promise<void> {
    try {
      await this.request('POST', '/ECM/api/v1/removeAccessFromUser', {
        username: userKey,
        rolename: roleKey,
      });
    } catch (error) {
      logger.error('Failed to remove role from user', { userKey, roleKey, error });
      throw error;
    }
  }

  /**
   * Get user's roles
   */
  public async getUserRoles(userKey: string): Promise<SaviyntRole[]> {
    try {
      const response = await this.request<SaviyntRole[]>('GET', '/ECM/api/v1/getUserRoles', null, {
        userkey: userKey,
      });

      return response.result || [];
    } catch (error) {
      logger.error('Failed to get user roles', { userKey, error });
      throw error;
    }
  }

  // Bulk Operations

  /**
   * Bulk create users
   */
  public async bulkCreateUsers(users: SaviyntUser[]): Promise<SaviyntBulkResponse> {
    try {
      const response = await this.request<SaviyntBulkResponse>('POST', '/ECM/api/v1/bulkCreateUser', {
        userdata: users,
      });

      return response.result || { successrecords: 0, failedrecords: 0 };
    } catch (error) {
      logger.error('Failed to bulk create users', { userCount: users.length, error });
      throw error;
    }
  }

  /**
   * Bulk update users
   */
  public async bulkUpdateUsers(users: Partial<SaviyntUser>[]): Promise<SaviyntBulkResponse> {
    try {
      const response = await this.request<SaviyntBulkResponse>('POST', '/ECM/api/v1/bulkUpdateUser', {
        userdata: users,
      });

      return response.result || { successrecords: 0, failedrecords: 0 };
    } catch (error) {
      logger.error('Failed to bulk update users', { userCount: users.length, error });
      throw error;
    }
  }

  // Utility Methods

  /**
   * Get current authentication status
   */
  public getAuthStatus(): { authenticated: boolean; tokenExpiry?: Date } {
    if (!this.authToken) {
      return { authenticated: false };
    }

    const expiryDate = new Date(this.authToken.obtained_at + (this.authToken.expires_in * 1000));
    return {
      authenticated: this.isTokenValid(),
      tokenExpiry: expiryDate,
    };
  }

  /**
   * Clear authentication token
   */
  public clearAuth(): void {
    this.authToken = null;
    logger.info('Saviynt authentication token cleared');
  }

  /**
   * Get API client configuration
   */
  public getConfig(): { baseUrl: string; timeout: number; retryAttempts: number } {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
    };
  }
}

// Export a default instance using configuration
export const saviyntApiClient = new SaviyntApiClient();