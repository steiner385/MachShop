/**
 * Database Test Utilities Integration Tests
 *
 * Comprehensive test suite demonstrating usage of all database test utilities,
 * factories, and testing patterns. This also serves as documentation for how
 * to use the database testing infrastructure.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  // Core utilities
  setupDatabaseTest,
  cleanAllTestData,
  seedTestDatabase,
  DatabasePerformanceMonitor,
  testTransactionIsolation,
  testConnectionPoolStress,
  checkDatabaseHealth,
  DatabaseAssertions,

  // Factories
  createEnterpriseData,
  createSiteData,
  createUserData,
  createPartData,
  createWorkOrderData,
  createEquipmentData,
  BatchFactory,
  TestScenarios,

  // Quick setup helpers
  QuickSetup,
  TestPatterns,
  PerformanceTestUtils,

  // Types
  type Enterprise,
  type Site,
  type User,
  type WorkOrder,

  // Test Prisma instance
  testPrisma,
} from './utils';

describe('Database Test Utilities', () => {
  // Set up database test environment
  const { getPerformanceMetrics, cleanDatabase, seedDatabase } = setupDatabaseTest({
    cleanBetweenTests: true,
    useRealDatabase: true,
  });

  describe('Data Factories', () => {
    test('should create enterprise data with factory', () => {
      const enterpriseData = createEnterpriseData({
        overrides: {
          enterpriseName: 'test-custom-enterprise',
          enterpriseCode: 'CUSTOM',
        },
      });

      expect(enterpriseData.enterpriseName).toBe('test-custom-enterprise');
      expect(enterpriseData.enterpriseCode).toBe('CUSTOM');
      expect(enterpriseData.isActive).toBe(true);
      expect(enterpriseData.address).toBeDefined();
    });

    test('should create consistent data with seed', async () => {
      const testEnterprise = await testPrisma.enterprise.create({
        data: createEnterpriseData({ overrides: { enterpriseName: 'test-seeded-enterprise' } }),
      });

      expect(testEnterprise.enterpriseName).toBe('test-seeded-enterprise');
      expect(testEnterprise.id).toBeDefined();
    });

    test('should create related data with BatchFactory', async () => {
      const { enterpriseData, sitesData } = await BatchFactory.createEnterpriseWithSites(2);

      expect(enterpriseData.enterpriseName).toContain('test-enterprise');
      expect(sitesData).toHaveLength(2);
      expect(sitesData[0].siteName).toContain('test-site');
    });

    test('should create complete work order setup', async () => {
      const { enterprise, site } = await QuickSetup.minimal();

      const { workOrderData, equipmentData, partsData } =
        await BatchFactory.createWorkOrderWithDependencies(site.id, {
          workOrder: { overrides: { title: 'test-batch-work-order' } },
          parts: [{ overrides: { partName: 'test-batch-part' } }],
        });

      expect(workOrderData.title).toBe('test-batch-work-order');
      expect(workOrderData.siteId).toBe(site.id);
      expect(equipmentData.siteId).toBe(site.id);
      expect(partsData).toHaveLength(1);
      expect(partsData[0].partName).toBe('test-batch-part');
    });
  });

  describe('Quick Setup Helpers', () => {
    test('should set up full environment', async () => {
      const { enterprise, site, user } = await QuickSetup.fullEnvironment();

      expect(enterprise.id).toBeDefined();
      expect(site.enterpriseId).toBe(enterprise.id);
      expect(user.id).toBeDefined();

      // Verify user-site relationship exists
      const userSite = await testPrisma.userSite.findFirst({
        where: { userId: user.id, siteId: site.id },
      });
      expect(userSite).toBeDefined();
    });

    test('should set up work order environment', async () => {
      const { enterprise, site, user, equipment, part, workOrder } =
        await QuickSetup.workOrderEnvironment();

      expect(workOrder.siteId).toBe(site.id);
      expect(workOrder.assignedToUserId).toBe(user.id);
      expect(workOrder.equipmentId).toBe(equipment.id);
      expect(workOrder.partId).toBe(part.id);
    });

    test('should set up minimal environment', async () => {
      const { enterprise, site } = await QuickSetup.minimal();

      expect(enterprise.id).toBeDefined();
      expect(site.enterpriseId).toBe(enterprise.id);
    });
  });

  describe('Test Patterns', () => {
    test('should test CRUD operations', async () => {
      const enterpriseData = createEnterpriseData({
        overrides: { enterpriseName: 'test-crud-enterprise' },
      });

      const { created, found, updated } = await TestPatterns.testCRUD(
        testPrisma.enterprise,
        enterpriseData,
        { enterpriseName: 'test-updated-enterprise' }
      );

      expect(created.enterpriseName).toBe('test-crud-enterprise');
      expect(found.enterpriseName).toBe('test-crud-enterprise');
      expect(updated.enterpriseName).toBe('test-updated-enterprise');
    });

    test('should test relationships', async () => {
      const enterpriseData = createEnterpriseData({
        overrides: { enterpriseName: 'test-relationship-enterprise' },
      });
      const siteData = createSiteData('placeholder', {
        overrides: { siteName: 'test-relationship-site' },
      });

      const { parent, child, parentWithChildren } = await TestPatterns.testRelationship(
        testPrisma.enterprise,
        enterpriseData,
        testPrisma.site,
        siteData,
        'sites',
        'enterpriseId'
      );

      expect(parent.enterpriseName).toBe('test-relationship-enterprise');
      expect(child.siteName).toBe('test-relationship-site');
      expect(parentWithChildren.sites).toHaveLength(1);
      expect(parentWithChildren.sites[0].id).toBe(child.id);
    });

    test('should test constraint violations', async () => {
      // Try to create enterprise without required fields
      await expect(
        TestPatterns.testConstraints(
          testPrisma.enterprise,
          { invalidField: 'invalid' },
          'Required'
        )
      ).rejects.toThrow();
    });

    test('should test pagination', async () => {
      const enterpriseDataArray = Array.from({ length: 5 }, (_, i) =>
        createEnterpriseData({
          overrides: { enterpriseName: `test-pagination-enterprise-${i}` },
        })
      );

      const { created, firstPage } = await TestPatterns.testPagination(
        testPrisma.enterprise,
        enterpriseDataArray,
        2
      );

      expect(created).toHaveLength(5);
      expect(firstPage).toHaveLength(2);
    });
  });

  describe('Database Utilities', () => {
    test('should clean all test data', async () => {
      // Create some test data
      await testPrisma.enterprise.create({
        data: createEnterpriseData({ overrides: { enterpriseName: 'test-cleanup' } }),
      });

      // Verify data exists
      const beforeClean = await testPrisma.enterprise.count();
      expect(beforeClean).toBeGreaterThan(0);

      // Clean all data
      await cleanAllTestData();

      // Verify data is cleaned
      const afterClean = await testPrisma.enterprise.count();
      expect(afterClean).toBe(0);
    });

    test('should seed test database', async () => {
      const seeded = await seedTestDatabase();

      expect(seeded.enterprise).toBeDefined();
      expect(seeded.site).toBeDefined();
      expect(seeded.user).toBeDefined();
      expect(seeded.site.enterpriseId).toBe(seeded.enterprise.id);
    });

    test('should check database health', async () => {
      const health = await checkDatabaseHealth();

      expect(health.connected).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.tableCount).toBeGreaterThan(0);
    });

    test('should test connection pool stress', async () => {
      const results = await testConnectionPoolStress(10, 5);

      expect(results.successful).toBeGreaterThan(0);
      expect(results.failed).toBe(0);
      expect(results.averageTime).toBeGreaterThan(0);
    });
  });

  describe('Database Assertions', () => {
    test('should assert record exists', async () => {
      const enterprise = await testPrisma.enterprise.create({
        data: createEnterpriseData({ overrides: { enterpriseName: 'test-assertion' } }),
      });

      await expect(
        DatabaseAssertions.assertRecordExists('enterprise', enterprise.id)
      ).resolves.toBeDefined();
    });

    test('should assert record not exists', async () => {
      await expect(
        DatabaseAssertions.assertRecordNotExists('enterprise', 'non-existent-id')
      ).resolves.toBeUndefined();
    });

    test('should assert record count', async () => {
      await testPrisma.enterprise.create({
        data: createEnterpriseData({ overrides: { enterpriseName: 'test-count-1' } }),
      });
      await testPrisma.enterprise.create({
        data: createEnterpriseData({ overrides: { enterpriseName: 'test-count-2' } }),
      });

      await expect(
        DatabaseAssertions.assertRecordCount('enterprise', 2)
      ).resolves.toBeUndefined();
    });

    test('should assert relationship exists', async () => {
      const { enterprise, site } = await QuickSetup.minimal();

      await expect(
        DatabaseAssertions.assertRelationshipExists(
          'enterprise',
          enterprise.id,
          'site',
          'sites'
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('Performance Monitoring', () => {
    test('should monitor database operations', async () => {
      const monitor = new DatabasePerformanceMonitor();
      monitor.start();

      // Simulate some database operations
      await testPrisma.enterprise.create({
        data: createEnterpriseData({ overrides: { enterpriseName: 'test-performance' } }),
      });

      const metrics = monitor.getMetrics();
      expect(metrics.totalTime).toBeGreaterThan(0);
    });

    test('should measure operation performance', async () => {
      const { result, duration, memoryUsage } = await PerformanceTestUtils.measureOperation(
        async () => {
          return await testPrisma.enterprise.create({
            data: createEnterpriseData({ overrides: { enterpriseName: 'test-measure' } }),
          });
        }
      );

      expect(result).toBeDefined();
      expect(duration).toBeGreaterThan(0);
      expect(memoryUsage).toBeDefined();
    });

    test('should benchmark operations', async () => {
      const operations = {
        create: async () => {
          return await testPrisma.enterprise.create({
            data: createEnterpriseData(),
          });
        },
        findMany: async () => {
          return await testPrisma.enterprise.findMany({ take: 10 });
        },
      };

      const results = await PerformanceTestUtils.benchmark(operations, 3);

      expect(results.create).toBeDefined();
      expect(results.findMany).toBeDefined();
      expect(results.create.avgDuration).toBeGreaterThan(0);
      expect(results.findMany.avgDuration).toBeGreaterThan(0);
    });
  });

  describe('Transaction Testing', () => {
    test('should test transaction isolation', async () => {
      const result = await testTransactionIsolation(async (tx) => {
        const enterprise = await tx.enterprise.create({
          data: createEnterpriseData({ overrides: { enterpriseName: 'test-transaction' } }),
        });

        const site = await tx.site.create({
          data: createSiteData(enterprise.id, { overrides: { siteName: 'test-transaction-site' } }),
        });

        return { enterprise, site };
      });

      expect(result.enterprise).toBeDefined();
      expect(result.site).toBeDefined();
      expect(result.site.enterpriseId).toBe(result.enterprise.id);
    });
  });

  describe('Test Scenarios', () => {
    test('should use manufacturing setup scenario', () => {
      const scenario = TestScenarios.manufacturingSetup();

      expect(scenario.enterprise.enterpriseName).toBe('test-manufacturing-corp');
      expect(scenario.sites).toHaveLength(2);
      expect(scenario.users).toHaveLength(2);
      expect(scenario.sites[0].siteName).toBe('test-main-plant');
      expect(scenario.users[0].username).toBe('test-supervisor');
    });

    test('should use maintenance workflow scenario', async () => {
      const { site } = await QuickSetup.minimal();
      const scenario = TestScenarios.maintenanceWorkflow(site.id);

      expect(scenario.equipment.siteId).toBe(site.id);
      expect(scenario.workOrder.siteId).toBe(site.id);
      expect(scenario.workOrder.workOrderType).toBe('PREVENTIVE');
      expect(scenario.parts).toHaveLength(1);
    });
  });

  describe('Integration Tests', () => {
    test('should demonstrate complete workflow', async () => {
      // Set up environment
      const { enterprise, site, user } = await QuickSetup.fullEnvironment();

      // Create equipment and parts
      const equipment = await testPrisma.equipment.create({
        data: createEquipmentData(site.id, {
          overrides: { equipmentName: 'test-integration-equipment' },
        }),
      });

      const part = await testPrisma.part.create({
        data: createPartData({
          overrides: { partName: 'test-integration-part' },
        }),
      });

      // Create work order
      const workOrder = await testPrisma.workOrder.create({
        data: createWorkOrderData(site.id, {
          overrides: {
            title: 'test-integration-work-order',
            assignedToUserId: user.id,
            equipmentId: equipment.id,
            partId: part.id,
          },
        }),
      });

      // Verify all relationships
      const fullWorkOrder = await testPrisma.workOrder.findUnique({
        where: { id: workOrder.id },
        include: {
          site: true,
          assignedToUser: true,
          equipment: true,
          part: true,
        },
      });

      expect(fullWorkOrder).toBeDefined();
      expect(fullWorkOrder!.site.id).toBe(site.id);
      expect(fullWorkOrder!.assignedToUser!.id).toBe(user.id);
      expect(fullWorkOrder!.equipment!.id).toBe(equipment.id);
      expect(fullWorkOrder!.part!.id).toBe(part.id);

      // Test performance
      const metrics = getPerformanceMetrics();
      expect(metrics.totalTime).toBeGreaterThan(0);
    });
  });
});