/**
 * Database Test Utilities
 *
 * Comprehensive utilities for database testing including setup, teardown,
 * data factories, assertions, and connection management.
 */

import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Test database instance
export let testPrisma: PrismaClient;

/**
 * Database Test Configuration
 */
export interface DatabaseTestConfig {
  /** Whether to use real database or in-memory */
  useRealDatabase?: boolean;
  /** Whether to clean database between tests */
  cleanBetweenTests?: boolean;
  /** Whether to run migrations before tests */
  runMigrations?: boolean;
  /** Connection pool size for tests */
  connectionPoolSize?: number;
  /** Query timeout in milliseconds */
  queryTimeout?: number;
}

export const DEFAULT_TEST_CONFIG: DatabaseTestConfig = {
  useRealDatabase: true,
  cleanBetweenTests: true,
  runMigrations: false,
  connectionPoolSize: 100,
  queryTimeout: 30000,
};

/**
 * Initialize test database connection
 */
export async function initializeTestDatabase(config: DatabaseTestConfig = {}) {
  const finalConfig = { ...DEFAULT_TEST_CONFIG, ...config };

  testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/test_db',
      },
    },
    log: process.env.NODE_ENV === 'test' ? [] : ['query', 'info', 'warn', 'error'],
  });

  // Test connection
  await testPrisma.$connect();

  // Run migrations if requested
  if (finalConfig.runMigrations) {
    await runDatabaseMigrations();
  }

  return testPrisma;
}

/**
 * Cleanup test database connection
 */
export async function cleanupTestDatabase() {
  if (testPrisma) {
    await testPrisma.$disconnect();
  }
}

/**
 * Run database migrations for tests
 */
export async function runDatabaseMigrations() {
  // This would typically use Prisma migrate or custom migration logic
  console.log('Running database migrations for tests...');
  // await testPrisma.$executeRaw`-- Migration commands here`;
}

/**
 * Clean all test data from database
 */
export async function cleanAllTestData() {
  if (!testPrisma) return;

  // Clean in dependency order (foreign key constraints)
  const cleanupOrder = [
    'workOrder',
    'partInventory',
    'part',
    'equipment',
    'userSite',
    'user',
    'site',
    'enterprise',
    'comment',
    'collaborationEvent',
    'timeEntry',
    'role',
    'permission',
  ];

  for (const model of cleanupOrder) {
    try {
      await (testPrisma as any)[model].deleteMany({});
    } catch (error) {
      // Some models might not exist or have different names
      console.warn(`Could not clean model ${model}:`, error);
    }
  }
}

/**
 * Clean specific test data by pattern
 */
export async function cleanTestDataByPattern(pattern: string) {
  if (!testPrisma) return;

  // Clean data that matches test patterns (e.g., names starting with 'test-')
  await testPrisma.user.deleteMany({
    where: {
      OR: [
        { username: { startsWith: pattern } },
        { email: { startsWith: pattern } },
      ],
    },
  });

  await testPrisma.enterprise.deleteMany({
    where: {
      enterpriseName: { startsWith: pattern },
    },
  });

  await testPrisma.site.deleteMany({
    where: {
      siteName: { startsWith: pattern },
    },
  });

  await testPrisma.part.deleteMany({
    where: {
      partNumber: { startsWith: pattern },
    },
  });
}

/**
 * Seed database with test data
 */
export async function seedTestDatabase() {
  if (!testPrisma) throw new Error('Test database not initialized');

  // Create base test enterprise
  const enterprise = await testPrisma.enterprise.create({
    data: {
      enterpriseName: 'test-enterprise-seed',
      enterpriseCode: 'TEST001',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      country: 'Test Country',
      isActive: true,
    },
  });

  // Create base test site
  const site = await testPrisma.site.create({
    data: {
      siteName: 'test-site-seed',
      siteCode: 'SITE001',
      address: '456 Site Ave',
      city: 'Site City',
      state: 'SC',
      postalCode: '67890',
      country: 'Site Country',
      enterpriseId: enterprise.id,
      isActive: true,
    },
  });

  // Create base test user
  const user = await testPrisma.user.create({
    data: {
      username: 'test-user-seed',
      email: 'testuser@seed.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: '$2b$10$test.hash.value.seed',
      isActive: true,
    },
  });

  // Associate user with site
  await testPrisma.userSite.create({
    data: {
      userId: user.id,
      siteId: site.id,
      isActive: true,
    },
  });

  return { enterprise, site, user };
}

/**
 * Performance monitoring utilities
 */
export class DatabasePerformanceMonitor {
  private startTime: number = 0;
  private queryCount: number = 0;
  private queries: Array<{ query: string; duration: number }> = [];

  start() {
    this.startTime = Date.now();
    this.queryCount = 0;
    this.queries = [];
  }

  recordQuery(query: string, duration: number) {
    this.queryCount++;
    this.queries.push({ query, duration });
  }

  getMetrics() {
    const totalTime = Date.now() - this.startTime;
    const avgQueryTime = this.queries.length > 0
      ? this.queries.reduce((sum, q) => sum + q.duration, 0) / this.queries.length
      : 0;

    return {
      totalTime,
      queryCount: this.queryCount,
      averageQueryTime: avgQueryTime,
      slowestQuery: this.queries.reduce((slowest, current) =>
        current.duration > slowest.duration ? current : slowest,
        { query: '', duration: 0 }
      ),
      queries: this.queries,
    };
  }

  reset() {
    this.start();
  }
}

/**
 * Transaction testing utilities
 */
export async function testTransactionIsolation<T>(
  operation: (tx: any) => Promise<T>,
  expectedIsolationLevel: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE' = 'READ_COMMITTED'
): Promise<T> {
  return await testPrisma.$transaction(operation, {
    isolationLevel: expectedIsolationLevel,
    maxWait: 5000,
    timeout: 10000,
  });
}

/**
 * Connection pool testing utilities
 */
export async function testConnectionPoolStress(
  concurrentConnections: number,
  operationsPerConnection: number
): Promise<{ successful: number; failed: number; averageTime: number }> {
  const startTime = Date.now();
  let successful = 0;
  let failed = 0;

  const connectionPromises = Array.from({ length: concurrentConnections }, async () => {
    try {
      for (let i = 0; i < operationsPerConnection; i++) {
        await testPrisma.user.count();
      }
      successful++;
    } catch (error) {
      failed++;
    }
  });

  await Promise.all(connectionPromises);

  const averageTime = (Date.now() - startTime) / concurrentConnections;

  return { successful, failed, averageTime };
}

/**
 * Database health check utilities
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latency: number;
  version: string | null;
  tableCount: number;
}> {
  const startTime = Date.now();

  try {
    // Test basic connectivity
    await testPrisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    // Get database version
    const versionResult = await testPrisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    const version = versionResult[0]?.version || null;

    // Count tables (PostgreSQL specific)
    const tableCountResult = await testPrisma.$queryRaw<Array<{ count: BigInt }>>`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const tableCount = Number(tableCountResult[0]?.count || 0);

    return {
      connected: true,
      latency,
      version,
      tableCount,
    };
  } catch (error) {
    return {
      connected: false,
      latency: Date.now() - startTime,
      version: null,
      tableCount: 0,
    };
  }
}

/**
 * Test helper for setting up database tests
 */
export function setupDatabaseTest(config: DatabaseTestConfig = {}) {
  let monitor: DatabasePerformanceMonitor;

  beforeAll(async () => {
    await initializeTestDatabase(config);
    monitor = new DatabasePerformanceMonitor();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    if (config.cleanBetweenTests !== false) {
      await cleanAllTestData();
    }
    monitor?.reset();
  });

  afterEach(async () => {
    // Optional: Log performance metrics for slow tests
    const metrics = monitor?.getMetrics();
    if (metrics && metrics.totalTime > 1000) {
      console.warn(`Slow test detected: ${metrics.totalTime}ms, ${metrics.queryCount} queries`);
    }
  });

  return {
    getPerformanceMetrics: () => monitor?.getMetrics(),
    cleanDatabase: cleanAllTestData,
    seedDatabase: seedTestDatabase,
  };
}

/**
 * Assertion utilities for database tests
 */
export const DatabaseAssertions = {
  async assertRecordExists(model: string, id: string) {
    const record = await (testPrisma as any)[model].findUnique({ where: { id } });
    if (!record) {
      throw new Error(`Expected ${model} with id ${id} to exist`);
    }
    return record;
  },

  async assertRecordNotExists(model: string, id: string) {
    const record = await (testPrisma as any)[model].findUnique({ where: { id } });
    if (record) {
      throw new Error(`Expected ${model} with id ${id} to not exist`);
    }
  },

  async assertRecordCount(model: string, expectedCount: number) {
    const count = await (testPrisma as any)[model].count();
    if (count !== expectedCount) {
      throw new Error(`Expected ${model} count to be ${expectedCount}, but got ${count}`);
    }
  },

  async assertRelationshipExists(
    parentModel: string,
    parentId: string,
    childModel: string,
    relationField: string
  ) {
    const parent = await (testPrisma as any)[parentModel].findUnique({
      where: { id: parentId },
      include: { [relationField]: true },
    });

    if (!parent || !parent[relationField] || parent[relationField].length === 0) {
      throw new Error(`Expected relationship between ${parentModel}:${parentId} and ${childModel} via ${relationField}`);
    }
  },
};