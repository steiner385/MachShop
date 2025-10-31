/**
 * CyberArk Privileged Access Management (PAM) Integration Service
 *
 * Provides enterprise-grade credential management through CyberArk Conjur.
 * Handles secure credential retrieval, caching, and fallback mechanisms
 * for database credentials, API keys, and application secrets.
 *
 * Security Features:
 * - Centralized credential storage in CyberArk vault
 * - Automatic credential rotation support
 * - Audit trails for all credential access
 * - Time-limited credential caching
 * - Graceful fallback to environment variables
 *
 * Compliance:
 * - AS9100 Section 8.3.6 (Configuration Management)
 * - NIST 800-171 Section 3.5.10 (Cryptographic Protection)
 * - SOC 2 Type II (Access Controls)
 */

import { ApiClient, AuthenticationApi, SecretsApi } from 'conjur';
import { logger } from '../utils/logger';
import { cyberArkErrorHandler, CyberArkError, CyberArkErrorType } from './CyberArkErrorHandler';

interface CyberArkConfig {
  url: string;
  account: string;
  authenticator?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  clientCertPath?: string;
  clientKeyPath?: string;
  caCertPath?: string;
  enabled: boolean;
}

interface CachedCredential {
  value: string;
  expiry: number;
  retrievedAt: number;
}

interface DatabaseCredentials {
  username: string;
  password: string;
  host?: string;
  port?: string;
  database?: string;
}

interface IntegrationCredentials {
  username?: string;
  password?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  [key: string]: string | undefined;
}

export class CyberArkService {
  private apiClient: ApiClient | null = null;
  private authApi: AuthenticationApi | null = null;
  private secretsApi: SecretsApi | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private cache: Map<string, CachedCredential> = new Map();
  private config: CyberArkConfig;
  private isInitialized: boolean = false;

  // Cache TTL settings
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly TOKEN_REFRESH_BUFFER = 60 * 1000; // 1 minute before expiry
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(config: CyberArkConfig) {
    this.config = config;

    if (!this.config.enabled) {
      logger.info('[CyberArk] Service disabled - using fallback credential sources');
      return;
    }

    this.validateConfig();
  }

  /**
   * Initialize CyberArk service with authentication
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('[CyberArk] Service disabled, skipping initialization');
      return;
    }

    try {
      logger.info('[CyberArk] Initializing CyberArk PAM service...');

      // Initialize API client
      this.apiClient = new ApiClient();
      this.apiClient.basePath = `${this.config.url}/api`;

      // Initialize API endpoints
      this.authApi = new AuthenticationApi(this.apiClient);
      this.secretsApi = new SecretsApi(this.apiClient);

      // Authenticate and get access token
      await this.authenticate();

      this.isInitialized = true;
      logger.info('[CyberArk] Service initialized successfully');

    } catch (error) {
      logger.error('[CyberArk] Failed to initialize service:', error);
      throw new Error(`CyberArk initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Authenticate with CyberArk and obtain access token
   */
  private async authenticate(): Promise<void> {
    if (!this.authApi || !this.config.enabled) {
      throw new Error('CyberArk service not properly initialized');
    }

    try {
      logger.debug('[CyberArk] Authenticating with CyberArk...');

      let authResponse: any;

      if (this.config.apiKey) {
        // API key authentication
        authResponse = await this.authApi.authenticateWithApiKey(
          this.config.account,
          this.config.apiKey
        );
      } else if (this.config.username && this.config.password) {
        // Username/password authentication
        authResponse = await this.authApi.authenticate(
          this.config.account,
          this.config.username,
          this.config.password
        );
      } else {
        throw new Error('No valid authentication method configured');
      }

      this.accessToken = authResponse.access_token || authResponse;
      this.tokenExpiry = Date.now() + (8 * 60 * 1000); // CyberArk tokens expire after 8 minutes

      // Set authorization header for subsequent requests
      if (this.apiClient) {
        this.apiClient.defaultHeaders = {
          ...this.apiClient.defaultHeaders,
          'Authorization': `Token token="${this.accessToken}"`
        };
      }

      logger.debug('[CyberArk] Authentication successful');

    } catch (error) {
      logger.error('[CyberArk] Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const now = Date.now();
    const needsRefresh = !this.accessToken ||
                        (now + this.TOKEN_REFRESH_BUFFER) >= this.tokenExpiry;

    if (needsRefresh) {
      logger.debug('[CyberArk] Token expired or expiring soon, re-authenticating...');
      await this.authenticate();
    }
  }

  /**
   * Retrieve a secret from CyberArk vault with caching, error handling, and fallback
   */
  async retrieveSecret(path: string, options: { skipCache?: boolean } = {}): Promise<string> {
    if (!this.config.enabled) {
      return this.getFallbackValue(path);
    }

    const cacheKey = `secret:${path}`;

    // Check cache first (unless explicitly skipped)
    if (!options.skipCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() < cached.expiry) {
        logger.debug(`[CyberArk] Cache hit for secret: ${path}`);
        return cached.value;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // Define the CyberArk operation
    const retrievalOperation = async (): Promise<string> => {
      await this.ensureAuthenticated();

      if (!this.secretsApi) {
        throw new CyberArkError(
          CyberArkErrorType.INVALID_CONFIGURATION,
          'Secrets API not initialized'
        );
      }

      logger.debug(`[CyberArk] Retrieving secret: ${path}`);

      try {
        const secretResponse = await this.secretsApi.getSecret(
          this.config.account,
          'variable', // kind
          path.replace(/\//g, ':') // Convert path separators
        );

        const secretValue = secretResponse.toString();

        // Cache the secret
        this.cache.set(cacheKey, {
          value: secretValue,
          expiry: Date.now() + this.CACHE_TTL,
          retrievedAt: Date.now()
        });

        logger.debug(`[CyberArk] Secret retrieved and cached: ${path}`);
        return secretValue;

      } catch (error: any) {
        // Transform API errors into CyberArk-specific errors
        if (error.response?.status === 404) {
          throw new CyberArkError(
            CyberArkErrorType.SECRET_NOT_FOUND,
            `Secret not found: ${path}`,
            false,
            404
          );
        }

        if (error.response?.status === 401) {
          throw new CyberArkError(
            CyberArkErrorType.AUTHENTICATION_FAILED,
            'Authentication failed - token may be expired',
            true,
            401
          );
        }

        if (error.response?.status === 403) {
          throw new CyberArkError(
            CyberArkErrorType.PERMISSION_DENIED,
            `Permission denied for secret: ${path}`,
            false,
            403
          );
        }

        // Network or timeout errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          throw new CyberArkError(
            CyberArkErrorType.NETWORK_ERROR,
            `Network error retrieving secret: ${error.message}`,
            true
          );
        }

        throw new CyberArkError(
          CyberArkErrorType.UNKNOWN_ERROR,
          `Failed to retrieve secret: ${error.message}`,
          true
        );
      }
    };

    // Define fallback function
    const fallbackFunction = (): string => {
      logger.warn(`[CyberArk] Using fallback for secret: ${path}`);
      return this.getFallbackValue(path);
    };

    // Execute with error handling and circuit breaker
    try {
      return await cyberArkErrorHandler.executeWithRetry(
        retrievalOperation,
        `retrieveSecret(${path})`,
        fallbackFunction
      );
    } catch (error) {
      // This should only happen if both CyberArk and fallback fail
      logger.error(`[CyberArk] Both CyberArk and fallback failed for secret: ${path}`, error);
      throw error;
    }
  }

  /**
   * Retrieve database credentials for a specific service
   */
  async retrieveDatabaseCredentials(service: string): Promise<DatabaseCredentials> {
    logger.debug(`[CyberArk] Retrieving database credentials for service: ${service}`);

    try {
      const [username, password] = await Promise.all([
        this.retrieveSecret(`database/${service}/username`),
        this.retrieveSecret(`database/${service}/password`)
      ]);

      return {
        username,
        password,
        host: process.env[`${service.toUpperCase()}_DB_HOST`] || process.env.DB_HOST || 'localhost',
        port: process.env[`${service.toUpperCase()}_DB_PORT`] || process.env.DB_PORT || '5432',
        database: process.env[`${service.toUpperCase()}_DB_NAME`] || `mes_${service.toLowerCase()}`
      };

    } catch (error) {
      logger.error(`[CyberArk] Failed to retrieve database credentials for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve integration credentials for external systems
   */
  async retrieveIntegrationCredentials(
    type: string,
    name: string
  ): Promise<IntegrationCredentials> {
    logger.debug(`[CyberArk] Retrieving integration credentials for ${type}/${name}`);

    const basePath = `integration/${type.toLowerCase()}/${name.toLowerCase()}`;
    const credentials: IntegrationCredentials = {};

    try {
      // Try to retrieve common credential types
      const credentialTypes = ['username', 'password', 'api_key', 'client_id', 'client_secret', 'access_token'];

      const results = await Promise.allSettled(
        credentialTypes.map(async (credType) => {
          try {
            const value = await this.retrieveSecret(`${basePath}/${credType}`);
            return { key: credType, value };
          } catch {
            return null; // This credential type doesn't exist
          }
        })
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const { key, value } = result.value;
          credentials[key.replace('_', '')] = value; // Convert snake_case to camelCase
        }
      });

      return credentials;

    } catch (error) {
      logger.error(`[CyberArk] Failed to retrieve integration credentials for ${type}/${name}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve application security secrets (JWT secrets, encryption keys, etc.)
   */
  async retrieveApplicationSecrets(): Promise<{
    jwtSecret: string;
    sessionSecret: string;
    encryptionKey: string;
  }> {
    logger.debug('[CyberArk] Retrieving application security secrets');

    try {
      const [jwtSecret, sessionSecret, encryptionKey] = await Promise.all([
        this.retrieveSecret('application/jwt_secret'),
        this.retrieveSecret('application/session_secret'),
        this.retrieveSecret('application/encryption_key')
      ]);

      return {
        jwtSecret,
        sessionSecret,
        encryptionKey
      };

    } catch (error) {
      logger.error('[CyberArk] Failed to retrieve application secrets:', error);
      throw error;
    }
  }

  /**
   * Retrieve SSO provider secrets
   */
  async retrieveSSOProviderSecrets(provider: string, tenantId?: string): Promise<IntegrationCredentials> {
    logger.debug(`[CyberArk] Retrieving SSO provider secrets for: ${provider}`);

    const basePath = tenantId
      ? `sso/${provider.toLowerCase()}/${tenantId}`
      : `sso/${provider.toLowerCase()}`;

    try {
      const credentials: IntegrationCredentials = {};

      // Common SSO credential types
      const credentialTypes = ['client_id', 'client_secret', 'certificate', 'private_key'];

      const results = await Promise.allSettled(
        credentialTypes.map(async (credType) => {
          try {
            const value = await this.retrieveSecret(`${basePath}/${credType}`);
            return { key: credType, value };
          } catch {
            return null;
          }
        })
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const { key, value } = result.value;
          credentials[key.replace('_', '')] = value;
        }
      });

      return credentials;

    } catch (error) {
      logger.error(`[CyberArk] Failed to retrieve SSO provider secrets for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cached credentials (useful for credential rotation)
   */
  invalidateCache(path?: string): void {
    if (path) {
      const cacheKey = `secret:${path}`;
      this.cache.delete(cacheKey);
      logger.debug(`[CyberArk] Invalidated cache for: ${path}`);
    } else {
      this.cache.clear();
      logger.debug('[CyberArk] Cleared entire credential cache');
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    size: number;
    entries: Array<{
      path: string;
      retrievedAt: Date;
      expiresAt: Date;
    }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      path: key.replace('secret:', ''),
      retrievedAt: new Date(value.retrievedAt),
      expiresAt: new Date(value.expiry)
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Health check for CyberArk service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    authenticated: boolean;
    cacheSize: number;
    lastError?: string;
    metrics: any;
    circuitBreaker: any;
  }> {
    const errorHandlerMetrics = cyberArkErrorHandler.getHealthMetrics();
    const circuitBreakerStatus = cyberArkErrorHandler.getCircuitBreakerStatus();

    if (!this.config.enabled) {
      return {
        status: 'degraded',
        authenticated: false,
        cacheSize: 0,
        lastError: 'CyberArk service disabled',
        metrics: errorHandlerMetrics,
        circuitBreaker: circuitBreakerStatus
      };
    }

    try {
      await this.ensureAuthenticated();

      // Determine overall health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      // Check circuit breaker state
      if (circuitBreakerStatus.state === 'OPEN') {
        status = 'unhealthy';
      } else if (circuitBreakerStatus.state === 'HALF_OPEN' || errorHandlerMetrics.fallbackUsageCount > 0) {
        status = 'degraded';
      }

      // Check error rate
      const errorRate = errorHandlerMetrics.totalRequests > 0
        ? errorHandlerMetrics.failedRequests / errorHandlerMetrics.totalRequests
        : 0;

      if (errorRate > 0.5) {
        status = 'unhealthy';
      } else if (errorRate > 0.1) {
        status = 'degraded';
      }

      return {
        status,
        authenticated: !!this.accessToken,
        cacheSize: this.cache.size,
        metrics: errorHandlerMetrics,
        circuitBreaker: circuitBreakerStatus
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        authenticated: false,
        cacheSize: this.cache.size,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        metrics: errorHandlerMetrics,
        circuitBreaker: circuitBreakerStatus
      };
    }
  }

  /**
   * Get fallback value from environment variables or configuration
   */
  private getFallbackValue(path: string): string {
    // Convert CyberArk path to environment variable name
    const envVarName = path
      .toUpperCase()
      .replace(/[/:-]/g, '_')
      .replace(/^DATABASE_/, '')
      .replace(/^APPLICATION_/, '')
      .replace(/^INTEGRATION_/, '')
      .replace(/^SSO_/, '');

    const fallbackValue = process.env[envVarName] || process.env[`FALLBACK_${envVarName}`];

    if (!fallbackValue) {
      throw new Error(`No fallback value found for secret: ${path} (tried env var: ${envVarName})`);
    }

    logger.warn(`[CyberArk] Using fallback value for: ${path}`);
    return fallbackValue;
  }

  /**
   * Validate CyberArk configuration
   */
  private validateConfig(): void {
    if (!this.config.enabled) {
      return;
    }

    if (!this.config.url) {
      throw new Error('CyberArk URL is required');
    }

    if (!this.config.account) {
      throw new Error('CyberArk account is required');
    }

    const hasApiKey = !!this.config.apiKey;
    const hasCredentials = !!(this.config.username && this.config.password);
    const hasCertificates = !!(this.config.clientCertPath && this.config.clientKeyPath);

    if (!hasApiKey && !hasCredentials && !hasCertificates) {
      throw new Error('CyberArk authentication method required (API key, credentials, or certificates)');
    }
  }

  /**
   * Graceful shutdown - clear sensitive data
   */
  async shutdown(): Promise<void> {
    logger.info('[CyberArk] Shutting down CyberArk service...');

    // Clear sensitive data from memory
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.cache.clear();
    this.isInitialized = false;

    logger.info('[CyberArk] Service shutdown complete');
  }
}

// Singleton instance for application-wide use
let cyberArkServiceInstance: CyberArkService | null = null;

/**
 * Get or create CyberArk service singleton
 */
export function getCyberArkService(config?: CyberArkConfig): CyberArkService {
  if (!cyberArkServiceInstance && config) {
    cyberArkServiceInstance = new CyberArkService(config);
  }

  if (!cyberArkServiceInstance) {
    throw new Error('CyberArk service not initialized. Call getCyberArkService(config) first.');
  }

  return cyberArkServiceInstance;
}

/**
 * Initialize CyberArk service from environment configuration
 */
export async function initializeCyberArkService(): Promise<CyberArkService> {
  const config: CyberArkConfig = {
    url: process.env.CYBERARK_URL || '',
    account: process.env.CYBERARK_ACCOUNT || '',
    authenticator: process.env.CYBERARK_AUTHENTICATOR || 'authn',
    apiKey: process.env.CYBERARK_API_KEY,
    username: process.env.CYBERARK_USERNAME,
    password: process.env.CYBERARK_PASSWORD,
    clientCertPath: process.env.CYBERARK_CLIENT_CERT_PATH,
    clientKeyPath: process.env.CYBERARK_CLIENT_KEY_PATH,
    caCertPath: process.env.CYBERARK_CA_CERT_PATH,
    enabled: process.env.CYBERARK_ENABLED === 'true'
  };

  const service = getCyberArkService(config);
  await service.initialize();

  return service;
}