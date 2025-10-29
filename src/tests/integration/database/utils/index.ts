/**
 * Database Test Utilities - Main Export
 *
 * Centralized exports for all database testing utilities, factories, and helpers.
 */

// Core database utilities
export {
  testPrisma,
  initializeTestDatabase,
  cleanupTestDatabase,
  runDatabaseMigrations,
  cleanAllTestData,
  cleanTestDataByPattern,
  seedTestDatabase,
  setupDatabaseTest,
  DatabasePerformanceMonitor,
  testTransactionIsolation,
  testConnectionPoolStress,
  checkDatabaseHealth,
  DatabaseAssertions,
  type DatabaseTestConfig,
  DEFAULT_TEST_CONFIG,
} from './database-test-utils';

// Data factories
export {
  generateTestId,
  withSeed,
  createEnterpriseData,
  createSiteData,
  createUserData,
  createPartData,
  createWorkOrderData,
  createEquipmentData,
  createCommentData,
  createCollaborationEventData,
  createTimeEntryData,
  createRoleData,
  createPermissionData,
  createUserSiteData,
  createPartInventoryData,
  BatchFactory,
  TestScenarios,
  type FactoryOptions,
} from './test-data-factories';

// Re-export common test types
export type {
  User,
  Enterprise,
  Site,
  Part,
  WorkOrder,
  Equipment,
  Comment,
  CollaborationEvent,
  TimeEntry,
  Role,
  Permission,
  UserSite,
  PartInventory,
} from '@prisma/client';

/**
 * Quick setup helpers for common test scenarios
 */
export const QuickSetup = {
  /**
   * Set up a complete test environment with enterprise, site, and users
   */
  async fullEnvironment() {
    const enterprise = await testPrisma.enterprise.create({
      data: createEnterpriseData(),
    });

    const site = await testPrisma.site.create({
      data: createSiteData(enterprise.id),
    });

    const user = await testPrisma.user.create({
      data: createUserData(),
    });

    await testPrisma.userSite.create({
      data: createUserSiteData(user.id, site.id),
    });

    return { enterprise, site, user };
  },

  /**
   * Set up basic entities for work order testing
   */
  async workOrderEnvironment() {
    const { enterprise, site, user } = await this.fullEnvironment();

    const equipment = await testPrisma.equipment.create({
      data: createEquipmentData(site.id),
    });

    const part = await testPrisma.part.create({
      data: createPartData(),
    });

    const workOrder = await testPrisma.workOrder.create({
      data: createWorkOrderData(site.id, {
        overrides: {
          assignedToUserId: user.id,
          equipmentId: equipment.id,
          partId: part.id,
        },
      }),
    });

    return { enterprise, site, user, equipment, part, workOrder };
  },

  /**
   * Set up minimal test data
   */
  async minimal() {
    const enterprise = await testPrisma.enterprise.create({
      data: createEnterpriseData(),
    });

    const site = await testPrisma.site.create({
      data: createSiteData(enterprise.id),
    });

    return { enterprise, site };
  },
};

/**
 * Common test patterns and utilities
 */
export const TestPatterns = {
  /**
   * Test CRUD operations for any model
   */
  async testCRUD<T extends Record<string, any>>(
    model: any,
    createData: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    updateData: Partial<T>,
    idField: string = 'id'
  ) {
    // Create
    const created = await model.create({ data: createData });
    expect(created).toBeDefined();
    expect(created[idField]).toBeDefined();

    // Read
    const found = await model.findUnique({ where: { [idField]: created[idField] } });
    expect(found).toBeDefined();

    // Update
    const updated = await model.update({
      where: { [idField]: created[idField] },
      data: updateData,
    });
    expect(updated).toBeDefined();
    Object.keys(updateData).forEach(key => {
      expect(updated[key]).toEqual(updateData[key]);
    });

    // Delete
    await model.delete({ where: { [idField]: created[idField] } });
    const deleted = await model.findUnique({ where: { [idField]: created[idField] } });
    expect(deleted).toBeNull();

    return { created, found, updated };
  },

  /**
   * Test relationships between models
   */
  async testRelationship(
    parentModel: any,
    parentData: any,
    childModel: any,
    childData: any,
    relationField: string,
    foreignKey: string
  ) {
    // Create parent
    const parent = await parentModel.create({ data: parentData });

    // Create child with relationship
    const childWithRelation = {
      ...childData,
      [foreignKey]: parent.id,
    };
    const child = await childModel.create({ data: childWithRelation });

    // Test parent includes child
    const parentWithChildren = await parentModel.findUnique({
      where: { id: parent.id },
      include: { [relationField]: true },
    });

    expect(parentWithChildren[relationField]).toBeDefined();
    if (Array.isArray(parentWithChildren[relationField])) {
      expect(parentWithChildren[relationField]).toHaveLength(1);
      expect(parentWithChildren[relationField][0].id).toBe(child.id);
    } else {
      expect(parentWithChildren[relationField].id).toBe(child.id);
    }

    return { parent, child, parentWithChildren };
  },

  /**
   * Test constraint violations
   */
  async testConstraints(model: any, invalidData: any, expectedError?: string) {
    try {
      await model.create({ data: invalidData });
      throw new Error('Expected constraint violation but none occurred');
    } catch (error: any) {
      expect(error).toBeDefined();
      if (expectedError) {
        expect(error.message).toContain(expectedError);
      }
    }
  },

  /**
   * Test pagination
   */
  async testPagination(
    model: any,
    createDataArray: any[],
    pageSize: number = 2
  ) {
    // Create test data
    const created = await Promise.all(
      createDataArray.map(data => model.create({ data }))
    );

    // Test first page
    const firstPage = await model.findMany({
      take: pageSize,
      skip: 0,
      orderBy: { createdAt: 'asc' },
    });

    expect(firstPage).toHaveLength(Math.min(pageSize, created.length));

    // Test second page if enough data
    if (created.length > pageSize) {
      const secondPage = await model.findMany({
        take: pageSize,
        skip: pageSize,
        orderBy: { createdAt: 'asc' },
      });

      expect(secondPage).toHaveLength(Math.min(pageSize, created.length - pageSize));

      // Ensure no overlap
      const firstPageIds = firstPage.map(item => item.id);
      const secondPageIds = secondPage.map(item => item.id);
      expect(firstPageIds.some(id => secondPageIds.includes(id))).toBe(false);
    }

    return { created, firstPage };
  },
};

/**
 * Performance testing utilities
 */
export const PerformanceTestUtils = {
  /**
   * Measure operation performance
   */
  async measureOperation(operation: () => Promise<any>): Promise<{
    result: any;
    duration: number;
    memoryUsage: NodeJS.MemoryUsage;
  }> {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    const result = await operation();

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();

    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    return {
      result,
      duration,
      memoryUsage: {
        rss: endMemory.rss - startMemory.rss,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
      },
    };
  },

  /**
   * Benchmark multiple operations
   */
  async benchmark(
    operations: Record<string, () => Promise<any>>,
    iterations: number = 10
  ): Promise<Record<string, { avgDuration: number; minDuration: number; maxDuration: number }>> {
    const results: Record<string, number[]> = {};

    for (const [name, operation] of Object.entries(operations)) {
      results[name] = [];

      for (let i = 0; i < iterations; i++) {
        const { duration } = await this.measureOperation(operation);
        results[name].push(duration);
      }
    }

    const benchmarkResults: Record<string, any> = {};
    for (const [name, durations] of Object.entries(results)) {
      benchmarkResults[name] = {
        avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
      };
    }

    return benchmarkResults;
  },
};

// Re-export faker for test data generation
export { faker } from '@faker-js/faker';