import { PrismaClient } from '@prisma/client';

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
    connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '150', 10);
    poolTimeout = 30;  // Longer timeout for high-load scenarios
    connectTimeout = 10;
  } else if (isTest) {
    // Test: Higher limits to handle concurrent E2E test load with multiple test groups
    // With ~25 concurrent test processes + pre-auth for 22 users + browser requests
    // we need significant headroom to prevent connection pool exhaustion
    connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '100', 10);
    poolTimeout = 30;  // Extended timeout for high-concurrency test scenarios
    connectTimeout = 15;
  } else if (isDevelopment) {
    // Development: Lower limits for local development
    connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10);
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

// In test mode, always create a fresh instance to respect DATABASE_URL changes
// In development/production, use singleton pattern to prevent multiple instances
let prismaInstance: PrismaClient;

if (process.env.NODE_ENV === 'test') {
  // Always create fresh instance in test mode
  prismaInstance = new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl()
      }
    },
    log: getLogConfig() as any
  });
} else {
  // Use singleton pattern in development/production
  prismaInstance = global.__prisma || new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl()
      }
    },
    log: getLogConfig() as any
  });

  if (process.env.NODE_ENV === 'development') {
    global.__prisma = prismaInstance;
  }
}

export const prisma = prismaInstance;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;