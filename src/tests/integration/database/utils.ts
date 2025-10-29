/**
 * Database Test Utilities
 *
 * Comprehensive suite of utilities, factories, and helpers for database testing.
 * This file provides all the tools needed for effective database testing including:
 * - Data factories for consistent test data generation
 * - Database cleanup and seeding utilities
 * - Performance monitoring and testing
 * - Transaction testing helpers
 * - Database assertions and health checks
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

// Test Prisma instance with test database configuration
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://mes_user:mes_password@localhost:5432/mes_test'
    }
  }
});

// Types for better type safety
export type Enterprise = {
  id: string;
  enterpriseName: string;
  enterpriseCode: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Site = {
  id: string;
  siteName: string;
  siteCode: string;
  enterpriseId: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type User = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkOrder = {
  id: string;
  workOrderNumber: string;
  siteId: string;
  title?: string;
  description?: string;
  priority: string;
  status: string;
  assignedToUserId?: string;
  equipmentId?: string;
  partId?: string;
  workOrderType?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Data Factory Functions
export function createEnterpriseData(options: {
  overrides?: Partial<Omit<Enterprise, 'id' | 'createdAt' | 'updatedAt'>>;
} = {}) {
  const timestamp = Date.now();
  return {
    enterpriseName: `test-enterprise-${timestamp}`,
    enterpriseCode: `TEST${timestamp.toString().slice(-6)}`,
    description: 'Test enterprise for automated testing',
    isActive: true,
    ...options.overrides,
  };
}

export function createSiteData(enterpriseId: string, options: {
  overrides?: Partial<Omit<Site, 'id' | 'createdAt' | 'updatedAt' | 'enterpriseId'>>;
} = {}) {
  const timestamp = Date.now();
  return {
    siteName: `test-site-${timestamp}`,
    siteCode: `SITE${timestamp.toString().slice(-6)}`,
    enterprise: {
      connect: { id: enterpriseId }
    },
    isActive: true,
    ...options.overrides,
  };
}

export function createUserData(options: {
  overrides?: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
} = {}) {
  const timestamp = Date.now();
  return {
    username: `testuser${timestamp}`,
    email: `testuser${timestamp}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '$2b$10$test.hash.value.for.automated.testing',
    isActive: true,
    ...options.overrides,
  };
}

export function createPartData(options: {
  overrides?: Partial<any>;
} = {}) {
  const timestamp = Date.now();
  return {
    partNumber: `PART${timestamp.toString().slice(-6)}`,
    partName: `test-part-${timestamp}`,
    description: 'Test part for automated testing',
    unitOfMeasure: 'EA',
    category: 'TEST',
    isActive: true,
    ...options.overrides,
  };
}

export function createWorkOrderData(siteId: string, options: {
  overrides?: Partial<Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'siteId'>>;
} = {}) {
  const timestamp = Date.now();
  return {
    workOrderNumber: `WO${timestamp.toString().slice(-6)}`,
    siteId,
    title: `Test Work Order ${timestamp}`,
    description: 'Test work order for automated testing',
    priority: 'NORMAL',
    status: 'OPEN',
    workOrderType: 'CORRECTIVE',
    ...options.overrides,
  };
}

export function createEquipmentData(siteId: string, options: {
  overrides?: Partial<any>;
} = {}) {
  const timestamp = Date.now();
  return {
    equipmentNumber: `EQ${timestamp.toString().slice(-6)}`,
    equipmentName: `test-equipment-${timestamp}`,
    siteId,
    description: 'Test equipment for automated testing',
    manufacturer: 'Test Manufacturer',
    model: `TestModel${timestamp.toString().slice(-3)}`,
    isActive: true,
    ...options.overrides,
  };
}

// Batch Factory Class
export class BatchFactory {
  static async createEnterpriseWithSites(siteCount: number = 2) {
    const enterpriseData = createEnterpriseData();
    const enterprise = await testPrisma.enterprise.create({ data: enterpriseData });

    const sitesData = [];
    for (let i = 0; i < siteCount; i++) {
      const siteData = createSiteData(enterprise.id, {
        overrides: { siteName: `test-site-${i + 1}-${Date.now()}` }
      });
      sitesData.push(siteData);
    }

    return { enterpriseData, sitesData };
  }

  static async createWorkOrderWithDependencies(siteId: string, options: {
    workOrder?: { overrides?: Partial<any> };
    parts?: Array<{ overrides?: Partial<any> }>;
  } = {}) {
    // Create equipment
    const equipmentData = createEquipmentData(siteId);
    const equipment = await testPrisma.equipment.create({ data: equipmentData });

    // Create parts
    const partsData = [];
    const partOptions = options.parts || [{}];
    for (const partOption of partOptions) {
      const partData = createPartData(partOption);
      partsData.push(partData);
    }

    // Create work order
    const workOrderData = createWorkOrderData(siteId, {
      overrides: {
        equipmentId: equipment.id,
        ...options.workOrder?.overrides,
      }
    });

    return { workOrderData, equipmentData, partsData };
  }
}

// Quick Setup Helpers
export class QuickSetup {
  static async minimal() {
    const enterpriseData = createEnterpriseData();
    const enterprise = await testPrisma.enterprise.create({ data: enterpriseData });

    const siteData = createSiteData(enterprise.id);
    const site = await testPrisma.site.create({ data: siteData });

    return { enterprise, site };
  }

  static async fullEnvironment() {
    const { enterprise, site } = await this.minimal();

    const userData = createUserData();
    const user = await testPrisma.user.create({ data: userData });

    // Create user-site relationship
    await testPrisma.userSite.create({
      data: {
        userId: user.id,
        siteId: site.id,
        role: 'USER',
        isActive: true,
      }
    });

    return { enterprise, site, user };
  }

  static async workOrderEnvironment() {
    const { enterprise, site, user } = await this.fullEnvironment();

    const equipmentData = createEquipmentData(site.id);
    const equipment = await testPrisma.equipment.create({ data: equipmentData });

    const partData = createPartData();
    const part = await testPrisma.part.create({ data: partData });

    const workOrderData = createWorkOrderData(site.id, {
      overrides: {
        assignedToUserId: user.id,
        equipmentId: equipment.id,
        partId: part.id,
      }
    });
    const workOrder = await testPrisma.workOrder.create({ data: workOrderData });

    return { enterprise, site, user, equipment, part, workOrder };
  }
}

// Test Patterns Class
export class TestPatterns {
  static async testCRUD(model: any, createData: any, updateData: any) {
    // Create
    const created = await model.create({ data: createData });

    // Read
    const found = await model.findUnique({ where: { id: created.id } });

    // Update
    const updated = await model.update({
      where: { id: created.id },
      data: updateData
    });

    // Delete is handled by cleanup
    return { created, found, updated };
  }

  static async testRelationship(
    parentModel: any,
    parentData: any,
    childModel: any,
    childData: any,
    relationName: string,
    foreignKeyField: string
  ) {
    const parent = await parentModel.create({ data: parentData });

    const childDataWithFK = {
      ...childData,
      [foreignKeyField]: parent.id
    };

    const child = await childModel.create({ data: childDataWithFK });

    const parentWithChildren = await parentModel.findUnique({
      where: { id: parent.id },
      include: { [relationName]: true }
    });

    return { parent, child, parentWithChildren };
  }

  static async testConstraints(model: any, invalidData: any, expectedError: string) {
    try {
      await model.create({ data: invalidData });
      throw new Error('Expected constraint violation did not occur');
    } catch (error: any) {
      if (!error.message.includes(expectedError)) {
        throw error;
      }
    }
  }

  static async testPagination(model: any, dataArray: any[], pageSize: number) {
    const created = [];
    for (const data of dataArray) {
      const record = await model.create({ data });
      created.push(record);
    }

    const firstPage = await model.findMany({
      take: pageSize,
      orderBy: { createdAt: 'asc' }
    });

    return { created, firstPage };
  }
}

// Database Utilities
export async function cleanAllTestData() {
  // Clean in order that respects foreign key constraints
  const models = [
    'userSite',
    'workOrder',
    'equipment',
    'part',
    'user',
    'site',
    'enterprise'
  ];

  for (const modelName of models) {
    const model = (testPrisma as any)[modelName];
    if (model) {
      await model.deleteMany({});
    }
  }
}

export async function seedTestDatabase() {
  const enterprise = await testPrisma.enterprise.create({
    data: createEnterpriseData({
      overrides: { enterpriseName: 'Seed Enterprise', enterpriseCode: 'SEED001' }
    })
  });

  const site = await testPrisma.site.create({
    data: createSiteData(enterprise.id, {
      overrides: { siteName: 'Seed Site', siteCode: 'SEED001' }
    })
  });

  const user = await testPrisma.user.create({
    data: createUserData({
      overrides: { username: 'seeduser', email: 'seeduser@example.com' }
    })
  });

  return { enterprise, site, user };
}

export async function checkDatabaseHealth() {
  const startTime = performance.now();

  try {
    await testPrisma.$queryRaw`SELECT 1`;
    const endTime = performance.now();

    // Get table count
    const tables = await testPrisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    return {
      connected: true,
      latency: endTime - startTime,
      tableCount: Number(tables[0].count)
    };
  } catch (error) {
    return {
      connected: false,
      latency: -1,
      tableCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function testConnectionPoolStress(connections: number, duration: number) {
  const promises = [];
  const results = { successful: 0, failed: 0, totalTime: 0 };

  const startTime = performance.now();

  for (let i = 0; i < connections; i++) {
    const promise = (async () => {
      const operationStart = performance.now();
      try {
        await testPrisma.$queryRaw`SELECT pg_sleep(${duration / 1000})`;
        const operationEnd = performance.now();
        results.successful++;
        results.totalTime += (operationEnd - operationStart);
      } catch (error) {
        results.failed++;
      }
    })();
    promises.push(promise);
  }

  await Promise.all(promises);

  const endTime = performance.now();

  return {
    ...results,
    averageTime: results.totalTime / results.successful,
    totalDuration: endTime - startTime
  };
}

export async function testTransactionIsolation<T>(operation: (tx: any) => Promise<T>): Promise<T> {
  return await testPrisma.$transaction(operation);
}

// Database Assertions
export class DatabaseAssertions {
  static async assertRecordExists(tableName: string, id: string) {
    const model = (testPrisma as any)[tableName];
    const record = await model.findUnique({ where: { id } });
    if (!record) {
      throw new Error(`Record with id ${id} not found in ${tableName}`);
    }
    return record;
  }

  static async assertRecordNotExists(tableName: string, id: string) {
    const model = (testPrisma as any)[tableName];
    const record = await model.findUnique({ where: { id } });
    if (record) {
      throw new Error(`Record with id ${id} should not exist in ${tableName}`);
    }
  }

  static async assertRecordCount(tableName: string, expectedCount: number) {
    const model = (testPrisma as any)[tableName];
    const actualCount = await model.count();
    if (actualCount !== expectedCount) {
      throw new Error(`Expected ${expectedCount} records in ${tableName}, found ${actualCount}`);
    }
  }

  static async assertRelationshipExists(
    parentTable: string,
    parentId: string,
    childTable: string,
    relationName: string
  ) {
    const parentModel = (testPrisma as any)[parentTable];
    const parent = await parentModel.findUnique({
      where: { id: parentId },
      include: { [relationName]: true }
    });

    if (!parent || !parent[relationName] || parent[relationName].length === 0) {
      throw new Error(`No ${relationName} relationship found for ${parentTable} ${parentId}`);
    }
  }
}

// Performance Monitoring
export class DatabasePerformanceMonitor {
  private startTime: number = 0;
  private operations: Array<{ name: string; duration: number }> = [];

  start() {
    this.startTime = performance.now();
    this.operations = [];
  }

  recordOperation(name: string, duration: number) {
    this.operations.push({ name, duration });
  }

  getMetrics() {
    const totalTime = performance.now() - this.startTime;
    const avgOperationTime = this.operations.length > 0
      ? this.operations.reduce((sum, op) => sum + op.duration, 0) / this.operations.length
      : 0;

    return {
      totalTime,
      operationCount: this.operations.length,
      avgOperationTime,
      operations: this.operations
    };
  }
}

// Performance Test Utils
export class PerformanceTestUtils {
  static async measureOperation<T>(operation: () => Promise<T>) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    const result = await operation();

    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    return {
      result,
      duration: endTime - startTime,
      memoryUsage: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      }
    };
  }

  static async benchmark(operations: Record<string, () => Promise<any>>, iterations: number = 1) {
    const results: Record<string, any> = {};

    for (const [name, operation] of Object.entries(operations)) {
      const durations = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await operation();
        const end = performance.now();
        durations.push(end - start);
      }

      results[name] = {
        avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        iterations: durations.length
      };
    }

    return results;
  }
}

// Test Scenarios
export class TestScenarios {
  static manufacturingSetup() {
    const enterprise = createEnterpriseData({
      overrides: {
        enterpriseName: 'test-manufacturing-corp',
        enterpriseCode: 'MFG001'
      }
    });

    const sites = [
      createSiteData('placeholder', {
        overrides: {
          siteName: 'test-main-plant',
          siteCode: 'PLANT01'
        }
      }),
      createSiteData('placeholder', {
        overrides: {
          siteName: 'test-warehouse',
          siteCode: 'WH01'
        }
      })
    ];

    const users = [
      createUserData({
        overrides: {
          username: 'test-supervisor',
          email: 'supervisor@test-mfg.com',
          firstName: 'Test',
          lastName: 'Supervisor'
        }
      }),
      createUserData({
        overrides: {
          username: 'test-operator',
          email: 'operator@test-mfg.com',
          firstName: 'Test',
          lastName: 'Operator'
        }
      })
    ];

    return { enterprise, sites, users };
  }

  static maintenanceWorkflow(siteId: string) {
    const equipment = createEquipmentData(siteId, {
      overrides: {
        equipmentName: 'test-production-line-01',
        manufacturer: 'Test Equipment Corp'
      }
    });

    const workOrder = createWorkOrderData(siteId, {
      overrides: {
        title: 'Preventive Maintenance - Production Line 01',
        workOrderType: 'PREVENTIVE',
        priority: 'HIGH'
      }
    });

    const parts = [
      createPartData({
        overrides: {
          partName: 'test-bearing-assembly',
          partNumber: 'BEAR001'
        }
      })
    ];

    return { equipment, workOrder, parts };
  }
}

// Setup Database Test Function
export function setupDatabaseTest(options: {
  cleanBetweenTests?: boolean;
  useRealDatabase?: boolean;
} = {}) {
  const performanceMonitor = new DatabasePerformanceMonitor();

  return {
    getPerformanceMetrics: () => performanceMonitor.getMetrics(),
    cleanDatabase: cleanAllTestData,
    seedDatabase: seedTestDatabase,
    monitor: performanceMonitor
  };
}