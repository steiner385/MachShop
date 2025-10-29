/**
 * Database Test Utilities
 *
 * Main utilities file that provides comprehensive database testing capabilities.
 * Exports utilities for managing test data, database state, and testing patterns.
 */

import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

// Main Database Test Utilities Class
export class DatabaseTestUtilities {
  private prisma: PrismaClient;
  private snapshots: Map<string, any> = new Map();

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Check if database connection is healthy
   */
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Reset database to a clean state
   */
  async resetDatabase(): Promise<void> {
    // Clean all tables in the correct order (respecting foreign key constraints)
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
      const model = (this.prisma as any)[modelName];
      if (model?.deleteMany) {
        await model.deleteMany({});
      }
    }
  }

  /**
   * Create a snapshot of current database state
   */
  async createSnapshot(): Promise<string> {
    const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // For now, we'll use a simple approach - store table counts
    // In a real implementation, you might want to export actual data
    const snapshot = {
      enterprises: await this.prisma.enterprise.count(),
      sites: await this.prisma.site.count(),
      users: await this.prisma.user.count(),
      workOrders: await this.prisma.workOrder.count(),
      equipment: await this.prisma.equipment.count(),
      parts: await this.prisma.part.count(),
    };

    this.snapshots.set(snapshotId, snapshot);
    return snapshotId;
  }

  /**
   * Restore database to a previous snapshot
   */
  async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    // For this implementation, we'll just reset to clean state
    // In a production system, you'd restore the actual data
    await this.resetDatabase();
  }

  /**
   * Seed database with basic test data
   */
  async seedDatabase(): Promise<void> {
    // Create basic enterprise structure
    const enterprise = await this.prisma.enterprise.create({
      data: {
        enterpriseName: 'Test Enterprise',
        enterpriseCode: 'TEST001',
        description: 'Test enterprise for automated testing',
        isActive: true,
      }
    });

    const site = await this.prisma.site.create({
      data: {
        siteName: 'Test Site',
        siteCode: 'SITE001',
        enterpriseId: enterprise.id,
        description: 'Test site for automated testing',
        isActive: true,
      }
    });

    await this.prisma.user.create({
      data: {
        username: 'testuser',
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: '$2b$10$test.hash.value.for.testing',
        isActive: true,
      }
    });
  }

  /**
   * Wait for database to be ready (useful for CI environments)
   */
  async waitForDatabase(maxAttempts: number = 10, delay: number = 1000): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Database not ready after ${maxAttempts} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Test Data Factory Class
export class TestDataFactory {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Create enterprise with default test data
   */
  async createEnterprise(overrides: any = {}): Promise<any> {
    const timestamp = Date.now();
    const data = {
      enterpriseName: `Test Enterprise ${timestamp}`,
      enterpriseCode: `TEST${timestamp.toString().slice(-6)}`,
      description: 'Test enterprise created by factory',
      isActive: true,
      ...overrides
    };

    return await this.prisma.enterprise.create({ data });
  }

  /**
   * Create site with enterprise relationship
   */
  async createSite(overrides: any = {}): Promise<any> {
    let enterpriseId = overrides.enterpriseId;

    if (!enterpriseId) {
      const enterprise = await this.createEnterprise();
      enterpriseId = enterprise.id;
    }

    const timestamp = Date.now();
    const data = {
      siteName: `Test Site ${timestamp}`,
      siteCode: `SITE${timestamp.toString().slice(-6)}`,
      enterpriseId,
      description: 'Test site created by factory',
      isActive: true,
      ...overrides
    };

    return await this.prisma.site.create({ data });
  }

  /**
   * Create user with default test data
   */
  async createUser(overrides: any = {}): Promise<any> {
    const timestamp = Date.now();
    const data = {
      username: `testuser${timestamp}`,
      email: `testuser${timestamp}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      passwordHash: '$2b$10$test.hash.value.for.testing',
      isActive: true,
      ...overrides
    };

    return await this.prisma.user.create({ data });
  }

  /**
   * Create part with default test data
   */
  async createPart(overrides: any = {}): Promise<any> {
    const timestamp = Date.now();
    const data = {
      partNumber: `PART${timestamp.toString().slice(-6)}`,
      partName: `Test Part ${timestamp}`,
      description: 'Test part created by factory',
      unitOfMeasure: 'EA',
      isActive: true,
      ...overrides
    };

    return await this.prisma.part.create({ data });
  }

  /**
   * Create work order with default test data
   */
  async createWorkOrder(overrides: any = {}): Promise<any> {
    let siteId = overrides.siteId;

    if (!siteId) {
      const site = await this.createSite();
      siteId = site.id;
    }

    const timestamp = Date.now();
    const data = {
      workOrderNumber: `WO${timestamp.toString().slice(-6)}`,
      siteId,
      title: `Test Work Order ${timestamp}`,
      description: 'Test work order created by factory',
      priority: 'NORMAL',
      status: 'OPEN',
      ...overrides
    };

    return await this.prisma.workOrder.create({ data });
  }

  /**
   * Create batch of enterprises
   */
  async createEnterprisesBatch(count: number): Promise<any[]> {
    const enterprises = [];
    for (let i = 0; i < count; i++) {
      const enterprise = await this.createEnterprise({
        enterpriseName: `Batch Enterprise ${i + 1}`,
        enterpriseCode: `BATCH${i + 1}`
      });
      enterprises.push(enterprise);
    }
    return enterprises;
  }

  /**
   * Create complete enterprise hierarchy
   */
  async createEnterpriseHierarchy(): Promise<any> {
    const enterprise = await this.createEnterprise({
      enterpriseName: 'Hierarchy Enterprise',
      enterpriseCode: 'HIER001'
    });

    const sites = [];
    for (let i = 0; i < 2; i++) {
      const site = await this.createSite({
        enterpriseId: enterprise.id,
        siteName: `Hierarchy Site ${i + 1}`,
        siteCode: `HIER${i + 1}`
      });
      sites.push(site);
    }

    const users = [];
    for (let i = 0; i < 2; i++) {
      const user = await this.createUser({
        username: `hieruser${i + 1}`,
        email: `hieruser${i + 1}@example.com`
      });
      users.push(user);
    }

    return { enterprise, sites, users };
  }
}

// Database Cleaner Class
export class DatabaseCleaner {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  /**
   * Clean specific tables
   */
  async cleanTables(tableNames: string[]): Promise<void> {
    // Clean in reverse dependency order
    const orderedTables = ['userSite', 'workOrder', 'equipment', 'part', 'user', 'site', 'enterprise'];

    for (const tableName of orderedTables) {
      if (tableNames.includes(tableName)) {
        const model = (this.prisma as any)[tableName];
        if (model?.deleteMany) {
          await model.deleteMany({});
        }
      }
    }
  }

  /**
   * Clean all tables
   */
  async cleanAll(): Promise<void> {
    await this.cleanTables(['enterprise', 'site', 'user', 'part', 'equipment', 'workOrder', 'userSite']);
  }

  /**
   * Clean all tables except specified ones
   */
  async cleanAllExcept(preserveTables: string[]): Promise<void> {
    const allTables = ['enterprise', 'site', 'user', 'part', 'equipment', 'workOrder', 'userSite'];
    const tablesToClean = allTables.filter(table => !preserveTables.includes(table));
    await this.cleanTables(tablesToClean);
  }
}

// Test Fixtures Class
export class TestFixtures {
  private prisma: PrismaClient;
  private factory: TestDataFactory;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
    this.factory = new TestDataFactory(prismaClient);
  }

  /**
   * Load manufacturing scenario fixture
   */
  async loadManufacturingScenario(): Promise<any> {
    const enterprise = await this.factory.createEnterprise({
      enterpriseName: 'Manufacturing Corp',
      enterpriseCode: 'MFG001'
    });

    const sites = [];
    const siteConfigs = [
      { siteName: 'Main Plant', siteCode: 'PLANT01' },
      { siteName: 'Warehouse', siteCode: 'WH01' }
    ];

    for (const config of siteConfigs) {
      const site = await this.factory.createSite({
        enterpriseId: enterprise.id,
        ...config
      });
      sites.push(site);
    }

    const parts = [];
    for (let i = 0; i < 5; i++) {
      const part = await this.factory.createPart({
        partNumber: `MFG${(i + 1).toString().padStart(3, '0')}`,
        partName: `Manufacturing Part ${i + 1}`
      });
      parts.push(part);
    }

    const workOrders = [];
    for (const site of sites) {
      const workOrder = await this.factory.createWorkOrder({
        siteId: site.id,
        title: `Production Work Order - ${site.siteName}`,
        priority: 'HIGH'
      });
      workOrders.push(workOrder);
    }

    const users = [];
    const userConfigs = [
      { username: 'supervisor', email: 'supervisor@mfg.com', firstName: 'Production', lastName: 'Supervisor' },
      { username: 'operator', email: 'operator@mfg.com', firstName: 'Machine', lastName: 'Operator' }
    ];

    for (const config of userConfigs) {
      const user = await this.factory.createUser(config);
      users.push(user);
    }

    return { enterprise, sites, parts, workOrders, users };
  }

  /**
   * Load user management scenario fixture
   */
  async loadUserManagementScenario(): Promise<any> {
    const enterprise = await this.factory.createEnterprise({
      enterpriseName: 'User Management Corp',
      enterpriseCode: 'USER001'
    });

    // Create roles and permissions (simplified for this example)
    const roles = [
      { name: 'Administrator', code: 'ADMIN' },
      { name: 'Supervisor', code: 'SUPER' },
      { name: 'Operator', code: 'OPER' }
    ];

    const permissions = [
      { name: 'Create Work Orders', code: 'WO_CREATE' },
      { name: 'View Reports', code: 'REPORT_VIEW' },
      { name: 'Manage Users', code: 'USER_MANAGE' }
    ];

    const users = [];
    for (let i = 0; i < 5; i++) {
      const user = await this.factory.createUser({
        username: `user${i + 1}`,
        email: `user${i + 1}@usermgmt.com`,
        firstName: `User`,
        lastName: `${i + 1}`
      });
      users.push(user);
    }

    return { enterprise, roles, permissions, users };
  }

  /**
   * Load performance testing fixture with large dataset
   */
  async loadPerformanceTestingData(): Promise<any> {
    const enterprises = await this.factory.createEnterprisesBatch(10);

    const sites = [];
    for (const enterprise of enterprises) {
      for (let i = 0; i < 5; i++) {
        const site = await this.factory.createSite({
          enterpriseId: enterprise.id,
          siteName: `Performance Site ${enterprise.enterpriseCode}-${i + 1}`,
          siteCode: `PERF${enterprise.enterpriseCode}${i + 1}`
        });
        sites.push(site);
      }
    }

    const parts = [];
    for (let i = 0; i < 1000; i++) {
      const part = await this.factory.createPart({
        partNumber: `PERF${(i + 1).toString().padStart(4, '0')}`,
        partName: `Performance Part ${i + 1}`
      });
      parts.push(part);
    }

    const workOrders = [];
    for (let i = 0; i < 500; i++) {
      const site = sites[i % sites.length];
      const workOrder = await this.factory.createWorkOrder({
        siteId: site.id,
        title: `Performance Work Order ${i + 1}`,
        workOrderNumber: `PERF${(i + 1).toString().padStart(4, '0')}`
      });
      workOrders.push(workOrder);
    }

    return { enterprises, sites, parts, workOrders };
  }

  /**
   * Load minimal test data
   */
  async loadMinimalTestData(): Promise<any> {
    const enterprise = await this.factory.createEnterprise({
      enterpriseName: 'Minimal Enterprise',
      enterpriseCode: 'MIN001'
    });

    const site = await this.factory.createSite({
      enterpriseId: enterprise.id,
      siteName: 'Minimal Site',
      siteCode: 'MIN001'
    });

    const user = await this.factory.createUser({
      username: 'minuser',
      email: 'minuser@example.com'
    });

    return { enterprise, site, user };
  }

  /**
   * Load custom fixture with specified parameters
   */
  async loadCustomFixture(params: {
    enterpriseCount: number;
    sitesPerEnterprise: number;
    usersCount: number;
    partsCount: number;
  }): Promise<any> {
    const enterprises = await this.factory.createEnterprisesBatch(params.enterpriseCount);

    const sites = [];
    for (const enterprise of enterprises) {
      for (let i = 0; i < params.sitesPerEnterprise; i++) {
        const site = await this.factory.createSite({
          enterpriseId: enterprise.id,
          siteName: `Custom Site ${enterprise.enterpriseCode}-${i + 1}`,
          siteCode: `CUST${enterprise.enterpriseCode}${i + 1}`
        });
        sites.push(site);
      }
    }

    const users = [];
    for (let i = 0; i < params.usersCount; i++) {
      const user = await this.factory.createUser({
        username: `customuser${i + 1}`,
        email: `customuser${i + 1}@example.com`
      });
      users.push(user);
    }

    const parts = [];
    for (let i = 0; i < params.partsCount; i++) {
      const part = await this.factory.createPart({
        partNumber: `CUST${(i + 1).toString().padStart(4, '0')}`,
        partName: `Custom Part ${i + 1}`
      });
      parts.push(part);
    }

    return { enterprises, sites, users, parts };
  }
}