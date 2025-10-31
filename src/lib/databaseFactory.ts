/**
 * Database Factory with CyberArk Integration
 *
 * Provides dynamic database connection creation with credentials
 * retrieved from CyberArk PAM system or fallback to environment variables.
 *
 * Features:
 * - Dynamic credential retrieval from CyberArk vault
 * - Automatic fallback to environment variables
 * - Service-specific database connections (microservices pattern)
 * - Connection pooling configuration per environment
 * - Graceful error handling and logging
 *
 * Security Benefits:
 * - No hardcoded database credentials
 * - Centralized credential management
 * - Audit trails for database access
 * - Support for credential rotation
 */

import { PrismaClient } from '@prisma/client';
import { getCyberArkService } from '../services/CyberArkService';
import { config } from '../config/config';
import { logger } from '../utils/logger';

interface DatabaseConfig {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  connectionLimit: number;
  poolTimeout: number;
  connectTimeout: number;
}

interface ServiceDatabaseConnections {
  auth: PrismaClient;
  workOrder: PrismaClient;
  quality: PrismaClient;
  material: PrismaClient;
  traceability: PrismaClient;
  resource: PrismaClient;
  reporting: PrismaClient;
  integration: PrismaClient;
}

class DatabaseFactory {
  private connections: Map<string, PrismaClient> = new Map();
  private isInitialized: boolean = false;
  private cyberArkService: any = null;

  constructor() {
    // Initialize CyberArk service if enabled
    if (config.cyberArk.enabled) {
      try {
        this.cyberArkService = getCyberArkService(config.cyberArk);
      } catch (error) {
        logger.error('[DatabaseFactory] Failed to initialize CyberArk service:', error);
        // Continue without CyberArk - will fallback to environment variables
      }
    }
  }

  /**
   * Initialize the database factory and CyberArk service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.cyberArkService) {
      try {
        await this.cyberArkService.initialize();
        logger.info('[DatabaseFactory] CyberArk service initialized successfully');
      } catch (error) {
        logger.warn('[DatabaseFactory] CyberArk initialization failed, using fallback credentials:', error);
        this.cyberArkService = null; // Disable CyberArk and use fallbacks
      }
    }

    this.isInitialized = true;
  }

  /**
   * Get database configuration for a specific service
   */
  private async getDatabaseConfig(serviceName: string): Promise<DatabaseConfig> {
    let username: string;
    let password: string;

    try {
      if (this.cyberArkService) {
        logger.debug(`[DatabaseFactory] Retrieving credentials from CyberArk for service: ${serviceName}`);
        const credentials = await this.cyberArkService.retrieveDatabaseCredentials(serviceName);
        username = credentials.username;
        password = credentials.password;
      } else {
        throw new Error('CyberArk not available, using fallback');
      }
    } catch (error) {
      logger.warn(`[DatabaseFactory] CyberArk credential retrieval failed for ${serviceName}, using fallback:`, error);

      // Fallback to environment variables
      const envPrefix = serviceName.toUpperCase().replace('-', '_');
      username = process.env[`FALLBACK_${envPrefix}_USERNAME`] ||
                 process.env[`${envPrefix}_USERNAME`] ||
                 process.env[`POSTGRES_${envPrefix}_USER`] ||
                 `mes_${serviceName}_user`;

      password = process.env[`FALLBACK_${envPrefix}_PASSWORD`] ||
                 process.env[`${envPrefix}_PASSWORD`] ||
                 process.env[`POSTGRES_${envPrefix}_PASSWORD`] ||
                 `dev_password_${serviceName}`;
    }

    // Get connection configuration
    const isProduction = config.env === 'production';
    const isTest = config.env === 'test';
    const isDevelopment = config.env === 'development';

    let connectionLimit = 10;
    let poolTimeout = 10;
    let connectTimeout = 10;

    if (isProduction) {
      connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '150', 10);
      poolTimeout = 30;
      connectTimeout = 10;
    } else if (isTest) {
      connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '100', 10);
      poolTimeout = 30;
      connectTimeout = 15;
    } else if (isDevelopment) {
      connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10);
      poolTimeout = 10;
      connectTimeout = 5;
    }

    return {
      host: process.env[`${serviceName.toUpperCase()}_DB_HOST`] || process.env.DB_HOST || 'localhost',
      port: process.env[`${serviceName.toUpperCase()}_DB_PORT`] || this.getServicePort(serviceName),
      database: process.env[`${serviceName.toUpperCase()}_DB_NAME`] || `mes_${serviceName.toLowerCase()}`,
      username,
      password,
      connectionLimit,
      poolTimeout,
      connectTimeout
    };
  }

  /**
   * Get the default port for a service
   */
  private getServicePort(serviceName: string): string {
    const portMap: Record<string, string> = {
      'auth': '5432',
      'work-order': '5433',
      'quality': '5434',
      'material': '5435',
      'traceability': '5436',
      'resource': '5437',
      'reporting': '5438',
      'integration': '5439'
    };

    return portMap[serviceName] || '5432';
  }

  /**
   * Build database URL from configuration
   */
  private buildDatabaseUrl(dbConfig: DatabaseConfig): string {
    const url = new URL(`postgresql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // Add connection pool parameters
    url.searchParams.set('connection_limit', dbConfig.connectionLimit.toString());
    url.searchParams.set('pool_timeout', dbConfig.poolTimeout.toString());
    url.searchParams.set('connect_timeout', dbConfig.connectTimeout.toString());

    return url.toString();
  }

  /**
   * Get logging configuration based on environment
   */
  private getLogConfig() {
    if (config.env === 'production') {
      return ['warn', 'error'] as const;
    } else if (config.env === 'test') {
      return ['error'] as const;
    } else {
      return ['query', 'info', 'warn', 'error'] as const;
    }
  }

  /**
   * Create a database connection for a specific service
   */
  async createConnection(serviceName: string): Promise<PrismaClient> {
    await this.initialize();

    const cacheKey = serviceName;

    // Return existing connection if available
    if (this.connections.has(cacheKey)) {
      logger.debug(`[DatabaseFactory] Reusing existing connection for service: ${serviceName}`);
      return this.connections.get(cacheKey)!;
    }

    try {
      logger.info(`[DatabaseFactory] Creating new database connection for service: ${serviceName}`);

      const dbConfig = await this.getDatabaseConfig(serviceName);
      const databaseUrl = this.buildDatabaseUrl(dbConfig);

      // Create Prisma client with dynamic configuration
      const prismaClient = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl
          }
        },
        log: this.getLogConfig() as any
      });

      // Test the connection
      await prismaClient.$connect();

      // Cache the connection
      this.connections.set(cacheKey, prismaClient);

      logger.info(`[DatabaseFactory] Successfully connected to database for service: ${serviceName} (pool limit: ${dbConfig.connectionLimit})`);

      return prismaClient;

    } catch (error) {
      logger.error(`[DatabaseFactory] Failed to create database connection for service: ${serviceName}`, error);
      throw new Error(`Database connection failed for ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the main application database connection (auth service)
   */
  async getMainConnection(): Promise<PrismaClient> {
    // For backward compatibility, use 'auth' service as main connection
    // or use DATABASE_URL if available and CyberArk is disabled
    if (!config.cyberArk.enabled && process.env.DATABASE_URL) {
      return this.createLegacyConnection();
    }

    return this.createConnection('auth');
  }

  /**
   * Create legacy connection using DATABASE_URL (for backward compatibility)
   */
  private createLegacyConnection(): PrismaClient {
    const cacheKey = 'legacy';

    if (this.connections.has(cacheKey)) {
      return this.connections.get(cacheKey)!;
    }

    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Add connection pool parameters
    const url = new URL(baseUrl);
    const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10);
    url.searchParams.set('connection_limit', connectionLimit.toString());
    url.searchParams.set('pool_timeout', '10');
    url.searchParams.set('connect_timeout', '10');

    const prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: url.toString()
        }
      },
      log: this.getLogConfig() as any
    });

    this.connections.set(cacheKey, prismaClient);
    logger.info('[DatabaseFactory] Created legacy database connection using DATABASE_URL');

    return prismaClient;
  }

  /**
   * Get all service connections (for microservices architecture)
   */
  async getAllServiceConnections(): Promise<ServiceDatabaseConnections> {
    await this.initialize();

    const services = ['auth', 'work-order', 'quality', 'material', 'traceability', 'resource', 'reporting', 'integration'];

    const connections = await Promise.all(
      services.map(async (service) => {
        const connection = await this.createConnection(service);
        return { service, connection };
      })
    );

    const serviceConnections: any = {};
    connections.forEach(({ service, connection }) => {
      const key = service.replace('-', '');
      serviceConnections[key] = connection;
    });

    return serviceConnections as ServiceDatabaseConnections;
  }

  /**
   * Refresh credentials and reconnect (useful for credential rotation)
   */
  async refreshConnection(serviceName: string): Promise<PrismaClient> {
    logger.info(`[DatabaseFactory] Refreshing connection for service: ${serviceName}`);

    // Close existing connection
    const existingConnection = this.connections.get(serviceName);
    if (existingConnection) {
      await existingConnection.$disconnect();
      this.connections.delete(serviceName);
    }

    // Invalidate CyberArk cache for this service
    if (this.cyberArkService) {
      this.cyberArkService.invalidateCache(`database/${serviceName}/username`);
      this.cyberArkService.invalidateCache(`database/${serviceName}/password`);
    }

    // Create new connection with fresh credentials
    return this.createConnection(serviceName);
  }

  /**
   * Health check for all database connections
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    connections: Array<{
      service: string;
      status: 'connected' | 'disconnected' | 'error';
      error?: string;
    }>;
  }> {
    const connectionChecks = Array.from(this.connections.entries()).map(async ([service, client]) => {
      try {
        await client.$queryRaw`SELECT 1`;
        return { service, status: 'connected' as const };
      } catch (error) {
        return {
          service,
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const results = await Promise.all(connectionChecks);
    const healthyCount = results.filter(r => r.status === 'connected').length;
    const totalCount = results.length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      status = 'healthy';
    } else if (healthyCount > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      connections: results
    };
  }

  /**
   * Graceful shutdown - close all connections
   */
  async shutdown(): Promise<void> {
    logger.info('[DatabaseFactory] Shutting down database connections...');

    const disconnectPromises = Array.from(this.connections.values()).map(async (client) => {
      try {
        await client.$disconnect();
      } catch (error) {
        logger.warn('[DatabaseFactory] Error disconnecting database client:', error);
      }
    });

    await Promise.all(disconnectPromises);
    this.connections.clear();

    if (this.cyberArkService) {
      await this.cyberArkService.shutdown();
    }

    logger.info('[DatabaseFactory] Database connections closed');
  }
}

// Export singleton instance
export const databaseFactory = new DatabaseFactory();

// Convenience function to get the main database connection
export async function getDatabase(): Promise<PrismaClient> {
  return databaseFactory.getMainConnection();
}

// For backward compatibility - export a synchronized version for immediate use
// This will use the legacy CONNECTION_URL approach if CyberArk is disabled
export function getLegacyDatabase(): PrismaClient {
  if (config.cyberArk.enabled) {
    throw new Error('Legacy database function cannot be used when CyberArk is enabled. Use getDatabase() instead.');
  }

  return databaseFactory['createLegacyConnection']();
}

// Graceful shutdown handler
process.on('beforeExit', async () => {
  await databaseFactory.shutdown();
});

export default databaseFactory;