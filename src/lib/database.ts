import { PrismaClient } from '@prisma/client';
import { config } from '../config/config';
import { databaseFactory, getDatabase, getLegacyDatabase } from './databaseFactory';
import { logger } from '../utils/logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * Connection Pool Configuration
 *
 * These settings are critical for production stability:
 * - connection_limit: Maximum number of database connections
 * - pool_timeout: How long to wait for an available connection
 * - connect_timeout: How long to wait for initial connection
 *
 * Production recommendations:
 * - connection_limit: 20-100 depending on expected load
 * - pool_timeout: 10-20 seconds
 * - connect_timeout: 10 seconds
 */
function getDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Environment-specific connection pool settings
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Connection pool size based on environment
  let connectionLimit = 10; // Default
  let poolTimeout = 10;    // Default 10 seconds
  let connectTimeout = 10; // Default 10 seconds

  if (isProduction) {
    // Production: Enterprise-scale deployment (5000-6000 concurrent users)
    // Each backend pod should handle 150-200 connections
    // Use PgBouncer for connection pooling at database level
    const parsedLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '150', 10);
    connectionLimit = isNaN(parsedLimit) ? 150 : parsedLimit;
    poolTimeout = 30;  // Longer timeout for high-load scenarios
    connectTimeout = 10;
  } else if (isTest) {
    // Test: Higher limits to handle concurrent E2E test load with multiple test groups
    // With ~25 concurrent test processes + pre-auth for 22 users + browser requests
    // we need significant headroom to prevent connection pool exhaustion
    const parsedLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '100', 10);
    connectionLimit = isNaN(parsedLimit) ? 100 : parsedLimit;
    poolTimeout = 30;  // Extended timeout for high-concurrency test scenarios
    connectTimeout = 15;
  } else if (isDevelopment) {
    // Development: Lower limits for local development
    const parsedLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10);
    connectionLimit = isNaN(parsedLimit) ? 15 : parsedLimit;
    poolTimeout = 10;
    connectTimeout = 5;
  }

  // Add connection pool parameters to URL
  const url = new URL(baseUrl);
  url.searchParams.set('connection_limit', connectionLimit.toString());
  url.searchParams.set('pool_timeout', poolTimeout.toString());
  url.searchParams.set('connect_timeout', connectTimeout.toString());

  console.log(`[Database] Initializing connection pool (${process.env.NODE_ENV}): limit=${connectionLimit}, pool_timeout=${poolTimeout}s, connect_timeout=${connectTimeout}s`);

  return url.toString();
}

/**
 * Get logging configuration based on environment
 */
function getLogConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  if (isProduction) {
    // Production: Only log warnings and errors (query logging impacts performance)
    return ['warn', 'error'] as const;
  } else if (isTest) {
    // Test: Minimal logging to keep test output clean
    return ['error'] as const;
  } else {
    // Development: Full logging for debugging
    return ['query', 'info', 'warn', 'error'] as const;
  }
}

// Database initialization with CyberArk PAM integration support
let prismaInstance: PrismaClient | null = null;

/**
 * Get the Prisma database client
 *
 * If CyberArk is enabled, this will use dynamic credential retrieval.
 * Otherwise, it falls back to the legacy DATABASE_URL approach.
 */
async function initializePrisma(): Promise<PrismaClient> {
  if (prismaInstance) {
    return prismaInstance;
  }

  try {
    if (config.cyberArk.enabled) {
      logger.info('[Database] Initializing database connection with CyberArk PAM integration');
      prismaInstance = await getDatabase();
    } else {
      logger.info('[Database] Initializing database connection with legacy DATABASE_URL');
      prismaInstance = getLegacyDatabaseConnection();
    }

    return prismaInstance;
  } catch (error) {
    logger.error('[Database] Failed to initialize database connection:', error);
    throw error;
  }
}

/**
 * Legacy database connection for backward compatibility
 */
function getLegacyDatabaseConnection(): PrismaClient {
  if (config.cyberArk.enabled) {
    // This should not happen, but provide clear error message
    throw new Error('Cannot use legacy database connection when CyberArk is enabled');
  }

  if (process.env.NODE_ENV === 'test') {
    // Always create fresh instance in test mode
    return new PrismaClient({
      datasources: {
        db: {
          url: getDatabaseUrl()
        }
      },
      log: getLogConfig() as any
    });
  } else {
    // Use singleton pattern in development/production
    const instance = global.__prisma || new PrismaClient({
      datasources: {
        db: {
          url: getDatabaseUrl()
        }
      },
      log: getLogConfig() as any
    });

    if (process.env.NODE_ENV === 'development') {
      global.__prisma = instance;
    }

    return instance;
  }
}

// For immediate synchronous access (backward compatibility)
// This will work when CyberArk is disabled or in test mode
let synchronousPrismaInstance: PrismaClient | null = null;

if (!config.cyberArk.enabled || process.env.NODE_ENV === 'test') {
  try {
    synchronousPrismaInstance = getLegacyDatabaseConnection();
  } catch (error) {
    logger.warn('[Database] Failed to create synchronous database instance:', error);
  }
}

// Export the synchronous instance for backward compatibility
// When CyberArk is enabled, this will be null and consumers should use getPrisma()
export const prisma = synchronousPrismaInstance;

/**
 * Get Prisma client (async version - recommended)
 *
 * This function supports both CyberArk and legacy configurations.
 * Use this in new code or when CyberArk integration is enabled.
 */
export async function getPrisma(): Promise<PrismaClient> {
  return initializePrisma();
}

/**
 * Get Prisma client for a specific service (microservices architecture)
 *
 * This is only available when CyberArk is enabled and provides
 * service-specific database connections with dedicated credentials.
 */
export async function getPrismaForService(serviceName: string): Promise<PrismaClient> {
  if (!config.cyberArk.enabled) {
    throw new Error('Service-specific database connections require CyberArk integration to be enabled');
  }

  return databaseFactory.createConnection(serviceName);
}

// Graceful shutdown
process.on('beforeExit', async () => {
  try {
    if (prismaInstance) {
      await prismaInstance.$disconnect();
    }
    if (synchronousPrismaInstance && synchronousPrismaInstance !== prismaInstance) {
      await synchronousPrismaInstance.$disconnect();
    }
  } catch (error) {
    logger.warn('[Database] Error during graceful shutdown:', error);
  }
});

// Default export for backward compatibility
export default prismaInstance || synchronousPrismaInstance;