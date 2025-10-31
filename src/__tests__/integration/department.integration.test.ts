/**
 * Department Integration Tests
 * Tests for DepartmentService database operations
 *
 * GitHub Issue #209: Department Lookup Table Implementation
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DepartmentService } from '../../services/DepartmentService';
import { seedDepartments, STANDARD_DEPARTMENTS, SITE_SPECIFIC_DEPARTMENTS } from '../../../prisma/seeds/seed-departments';

describe('Department Service Integration Tests', () => {
  let prisma: PrismaClient;
  let testUserId: string;
  let testSiteId: string;
  let createdDepartmentIds: string[] = [];

  beforeAll(async () => {
    // Initialize Prisma client for test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL, // Uses test database from .env.test
        },
      },
    });

    // Note: DepartmentService uses static methods, no need to instantiate

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: 'dept-test-user',
        email: 'dept-integration-test@example.com',
        passwordHash: 'test-hash',
        employeeNumber: 'EMP-DEPT-001',
        firstName: 'Department',
        lastName: 'Tester',
        isActive: true,
        personnelClassId: 'class-123',
      },
    });
    testUserId = testUser.id;

    // Create test site
    const testSite = await prisma.site.create({
      data: {
        siteName: 'Test Manufacturing Site',
        siteCode: 'TEST-SITE',
        address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        postalCode: '12345',
        country: 'USA',
        isActive: true,
      },
    });
    testSiteId = testSite.id;
  });

  afterAll(async () => {
    // Cleanup all test data
    await prisma.department.deleteMany({
      where: {
        OR: [
          { departmentCode: { startsWith: 'TEST_' } },
          { managerId: testUserId },
          { siteId: testSiteId },
        ],
      },
    });
    await prisma.site.delete({ where: { id: testSiteId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    createdDepartmentIds = [];
  });

  afterEach(async () => {
    // Cleanup departments created during tests
    if (createdDepartmentIds.length > 0) {
      await prisma.department.deleteMany({
        where: { id: { in: createdDepartmentIds } },
      });
      createdDepartmentIds = [];
    }
  });

  describe('Department Creation Operations', () => {
    it('should create a department successfully', async () => {
      const departmentData = {
        departmentCode: 'TEST_DEPT_001',
        departmentName: 'Test Department',
        description: 'A test department for integration testing',
        costCenter: 'CC-TEST-001',
        budgetCode: 'BG-TEST-001',
        managerId: testUserId,
        siteId: testSiteId,
        isActive: true,
      };

      const result = await DepartmentService.createDepartment(departmentData);
      createdDepartmentIds.push(result.id);

      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          departmentCode: 'TEST_DEPT_001',
          departmentName: 'Test Department',
          description: 'A test department for integration testing',
          costCenter: 'CC-TEST-001',
          budgetCode: 'BG-TEST-001',
          managerId: testUserId,
          siteId: testSiteId,
          isActive: true,
          parentDepartmentId: null,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );

      // Verify department exists in database
      const dbDepartment = await prisma.department.findUnique({
        where: { id: result.id },
      });
      expect(dbDepartment).toBeTruthy();
      expect(dbDepartment?.departmentCode).toBe('TEST_DEPT_001');
    });

    it('should create hierarchical departments successfully', async () => {
      // Create parent department
      const parentData = {
        departmentCode: 'TEST_PARENT',
        departmentName: 'Test Parent Department',
        description: 'Parent department for hierarchy testing',
        isActive: true,
      };

      const parent = await DepartmentService.createDepartment(parentData);
      createdDepartmentIds.push(parent.id);

      // Create child department
      const childData = {
        departmentCode: 'TEST_CHILD',
        departmentName: 'Test Child Department',
        description: 'Child department for hierarchy testing',
        parentDepartmentId: parent.id,
        isActive: true,
      };

      const child = await DepartmentService.createDepartment(childData);
      createdDepartmentIds.push(child.id);

      expect(child.parentDepartmentId).toBe(parent.id);

      // Test hierarchy methods
      const ancestors = await DepartmentService.getDepartmentAncestors(child.id);
      expect(ancestors).toHaveLength(1);
      expect(ancestors[0].id).toBe(parent.id);

      const descendants = await DepartmentService.getDepartmentDescendants(parent.id);
      expect(descendants).toHaveLength(1);
      expect(descendants[0].id).toBe(child.id);
    });

    it('should enforce unique department codes', async () => {
      const departmentData = {
        departmentCode: 'TEST_UNIQUE',
        departmentName: 'Test Unique Department',
        isActive: true,
      };

      const first = await DepartmentService.createDepartment(departmentData);
      createdDepartmentIds.push(first.id);

      // Attempt to create another department with same code
      await expect(
        DepartmentService.createDepartment(departmentData)
      ).rejects.toThrow(/Department code .* already exists/);
    });

    it('should validate parent department exists', async () => {
      const departmentData = {
        departmentCode: 'TEST_INVALID_PARENT',
        departmentName: 'Test Invalid Parent',
        parentDepartmentId: 'nonexistent-id',
        isActive: true,
      };

      await expect(
        DepartmentService.createDepartment(departmentData)
      ).rejects.toThrow(/Parent department .* not found/);
    });
  });

  describe('Department Retrieval Operations', () => {
    let testDeptId: string;

    beforeEach(async () => {
      const dept = await DepartmentService.createDepartment({
        departmentCode: 'TEST_RETRIEVE',
        departmentName: 'Test Retrieve Department',
        description: 'Department for testing retrieval operations',
        costCenter: 'CC-RETRIEVE',
        budgetCode: 'BG-RETRIEVE',
        isActive: true,
      });
      testDeptId = dept.id;
      createdDepartmentIds.push(testDeptId);
    });

    it('should retrieve department by ID', async () => {
      const result = await DepartmentService.getDepartmentById(testDeptId);

      expect(result).toEqual(
        expect.objectContaining({
          id: testDeptId,
          departmentCode: 'TEST_RETRIEVE',
          departmentName: 'Test Retrieve Department',
          description: 'Department for testing retrieval operations',
        })
      );
    });

    it('should retrieve department by code', async () => {
      const result = await DepartmentService.getDepartmentByCode('TEST_RETRIEVE');

      expect(result).toEqual(
        expect.objectContaining({
          id: testDeptId,
          departmentCode: 'TEST_RETRIEVE',
          departmentName: 'Test Retrieve Department',
        })
      );
    });

    it('should return null for nonexistent department', async () => {
      const result = await DepartmentService.getDepartmentById('nonexistent-id');
      expect(result).toBeNull();

      const codeResult = await DepartmentService.getDepartmentByCode('NONEXISTENT');
      expect(codeResult).toBeNull();
    });

    it('should list departments with pagination', async () => {
      // Create additional test departments
      for (let i = 1; i <= 5; i++) {
        const dept = await DepartmentService.createDepartment({
          departmentCode: `TEST_LIST_${i}`,
          departmentName: `Test List Department ${i}`,
          isActive: true,
        });
        createdDepartmentIds.push(dept.id);
      }

      const result = await DepartmentService.listDepartments({
        page: 1,
        pageSize: 3,
        includeInactive: false,
      });

      expect(result.departments).toHaveLength(3);
      expect(result.total).toBeGreaterThanOrEqual(6); // 6 test departments + any existing
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(3);
      expect(result.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('should search departments by name', async () => {
      const searchResults = await DepartmentService.searchDepartments('Retrieve', {
        page: 1,
        pageSize: 10,
      });

      expect(searchResults.departments).toHaveLength(1);
      expect(searchResults.departments[0].departmentCode).toBe('TEST_RETRIEVE');
    });

    it('should filter departments by site', async () => {
      // Create department with site
      const deptWithSite = await DepartmentService.createDepartment({
        departmentCode: 'TEST_WITH_SITE',
        departmentName: 'Test Department With Site',
        siteId: testSiteId,
        isActive: true,
      });
      createdDepartmentIds.push(deptWithSite.id);

      const results = await DepartmentService.listDepartments({
        siteId: testSiteId,
        page: 1,
        pageSize: 10,
      });

      expect(results.departments).toHaveLength(1);
      expect(results.departments[0].id).toBe(deptWithSite.id);
    });
  });

  describe('Department Update Operations', () => {
    let testDeptId: string;

    beforeEach(async () => {
      const dept = await DepartmentService.createDepartment({
        departmentCode: 'TEST_UPDATE',
        departmentName: 'Test Update Department',
        description: 'Original description',
        costCenter: 'CC-ORIGINAL',
        isActive: true,
      });
      testDeptId = dept.id;
      createdDepartmentIds.push(testDeptId);
    });

    it('should update department successfully', async () => {
      const updateData = {
        departmentName: 'Updated Department Name',
        description: 'Updated description',
        costCenter: 'CC-UPDATED',
        budgetCode: 'BG-UPDATED',
        managerId: testUserId,
      };

      const result = await DepartmentService.updateDepartment(testDeptId, updateData);

      expect(result).toEqual(
        expect.objectContaining({
          id: testDeptId,
          departmentCode: 'TEST_UPDATE', // Should not change
          departmentName: 'Updated Department Name',
          description: 'Updated description',
          costCenter: 'CC-UPDATED',
          budgetCode: 'BG-UPDATED',
          managerId: testUserId,
        })
      );

      // Verify in database
      const dbDept = await prisma.department.findUnique({
        where: { id: testDeptId },
      });
      expect(dbDept?.departmentName).toBe('Updated Department Name');
    });

    it('should not allow updating department code', async () => {
      await expect(
        DepartmentService.updateDepartment(testDeptId, {
          departmentCode: 'NEW_CODE', // Should be ignored
          departmentName: 'Updated Name',
        })
      ).resolves.toEqual(
        expect.objectContaining({
          departmentCode: 'TEST_UPDATE', // Original code preserved
          departmentName: 'Updated Name',
        })
      );
    });

    it('should handle nonexistent department', async () => {
      await expect(
        DepartmentService.updateDepartment('nonexistent-id', {
          departmentName: 'Updated Name',
        })
      ).rejects.toThrow(/Department .* not found/);
    });
  });

  describe('Department Deactivation Operations', () => {
    let testDeptId: string;

    beforeEach(async () => {
      const dept = await DepartmentService.createDepartment({
        departmentCode: 'TEST_DEACTIVATE',
        departmentName: 'Test Deactivate Department',
        isActive: true,
      });
      testDeptId = dept.id;
      createdDepartmentIds.push(testDeptId);
    });

    it('should deactivate department successfully', async () => {
      const result = await DepartmentService.deactivateDepartment(testDeptId);

      expect(result).toEqual(
        expect.objectContaining({
          id: testDeptId,
          isActive: false,
        })
      );

      // Verify in database
      const dbDept = await prisma.department.findUnique({
        where: { id: testDeptId },
      });
      expect(dbDept?.isActive).toBe(false);
    });

    it('should handle department with children by default rejection', async () => {
      // Create child department
      const child = await DepartmentService.createDepartment({
        departmentCode: 'TEST_CHILD_DEACTIVATE',
        departmentName: 'Test Child Department',
        parentDepartmentId: testDeptId,
        isActive: true,
      });
      createdDepartmentIds.push(child.id);

      await expect(
        DepartmentService.deactivateDepartment(testDeptId)
      ).rejects.toThrow(/Cannot deactivate department .* with active child departments/);
    });

    it('should force deactivate department with children when specified', async () => {
      // Create child department
      const child = await DepartmentService.createDepartment({
        departmentCode: 'TEST_CHILD_FORCE',
        departmentName: 'Test Child Force Department',
        parentDepartmentId: testDeptId,
        isActive: true,
      });
      createdDepartmentIds.push(child.id);

      const result = await DepartmentService.deactivateDepartment(testDeptId, true);

      expect(result.isActive).toBe(false);

      // Verify child is also deactivated
      const dbChild = await prisma.department.findUnique({
        where: { id: child.id },
      });
      expect(dbChild?.isActive).toBe(false);
    });
  });

  describe('Department Hierarchy Operations', () => {
    let rootId: string;
    let level1Id: string;
    let level2Id: string;

    beforeEach(async () => {
      // Create hierarchy: Root -> Level1 -> Level2
      const root = await DepartmentService.createDepartment({
        departmentCode: 'TEST_ROOT',
        departmentName: 'Test Root Department',
        isActive: true,
      });
      rootId = root.id;
      createdDepartmentIds.push(rootId);

      const level1 = await DepartmentService.createDepartment({
        departmentCode: 'TEST_LEVEL1',
        departmentName: 'Test Level 1 Department',
        parentDepartmentId: rootId,
        isActive: true,
      });
      level1Id = level1.id;
      createdDepartmentIds.push(level1Id);

      const level2 = await DepartmentService.createDepartment({
        departmentCode: 'TEST_LEVEL2',
        departmentName: 'Test Level 2 Department',
        parentDepartmentId: level1Id,
        isActive: true,
      });
      level2Id = level2.id;
      createdDepartmentIds.push(level2Id);
    });

    it('should get department ancestors correctly', async () => {
      const ancestors = await DepartmentService.getDepartmentAncestors(level2Id);

      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].id).toBe(level1Id);
      expect(ancestors[1].id).toBe(rootId);
    });

    it('should get department descendants correctly', async () => {
      const descendants = await DepartmentService.getDepartmentDescendants(rootId);

      expect(descendants).toHaveLength(2);
      expect(descendants.map(d => d.id)).toEqual(
        expect.arrayContaining([level1Id, level2Id])
      );
    });

    it('should get department siblings correctly', async () => {
      // Create sibling to level1
      const sibling = await DepartmentService.createDepartment({
        departmentCode: 'TEST_SIBLING',
        departmentName: 'Test Sibling Department',
        parentDepartmentId: rootId,
        isActive: true,
      });
      createdDepartmentIds.push(sibling.id);

      const siblings = await DepartmentService.getDepartmentSiblings(level1Id);

      expect(siblings).toHaveLength(1);
      expect(siblings[0].id).toBe(sibling.id);
    });

    it('should move department to new parent', async () => {
      // Create new parent
      const newParent = await DepartmentService.createDepartment({
        departmentCode: 'TEST_NEW_PARENT',
        departmentName: 'Test New Parent Department',
        isActive: true,
      });
      createdDepartmentIds.push(newParent.id);

      const result = await DepartmentService.moveDepartment(level1Id, newParent.id);

      expect(result.parentDepartmentId).toBe(newParent.id);

      // Verify level2 also moved with level1
      const level2Updated = await prisma.department.findUnique({
        where: { id: level2Id },
      });
      expect(level2Updated?.parentDepartmentId).toBe(level1Id); // Still child of level1
    });

    it('should get root departments', async () => {
      const rootDepartments = await DepartmentService.getRootDepartments();

      expect(rootDepartments.length).toBeGreaterThanOrEqual(1);
      expect(rootDepartments.map(d => d.id)).toContain(rootId);
    });

    it('should prevent circular references', async () => {
      await expect(
        DepartmentService.moveDepartment(rootId, level2Id)
      ).rejects.toThrow(/would create a circular reference/);
    });
  });

  describe('Department Statistics and Analytics', () => {
    beforeEach(async () => {
      // Create test departments for statistics
      const departments = [
        { code: 'STAT_ACTIVE_1', name: 'Active Dept 1', isActive: true },
        { code: 'STAT_ACTIVE_2', name: 'Active Dept 2', isActive: true },
        { code: 'STAT_INACTIVE_1', name: 'Inactive Dept 1', isActive: false },
      ];

      for (const dept of departments) {
        const created = await DepartmentService.createDepartment({
          departmentCode: dept.code,
          departmentName: dept.name,
          isActive: dept.isActive,
        });
        createdDepartmentIds.push(created.id);
      }
    });

    it('should get department count', async () => {
      const totalCount = await DepartmentService.getDepartmentCount();
      const activeCount = await DepartmentService.getDepartmentCount(true);
      const inactiveCount = await DepartmentService.getDepartmentCount(false);

      expect(totalCount).toBeGreaterThanOrEqual(3);
      expect(activeCount).toBeGreaterThanOrEqual(2);
      expect(inactiveCount).toBeGreaterThanOrEqual(1);
      expect(activeCount + inactiveCount).toBe(totalCount);
    });

    it('should get departments by cost center', async () => {
      // Create departments with same cost center
      const dept1 = await DepartmentService.createDepartment({
        departmentCode: 'CC_TEST_1',
        departmentName: 'Cost Center Test 1',
        costCenter: 'CC-SHARED',
        isActive: true,
      });
      const dept2 = await DepartmentService.createDepartment({
        departmentCode: 'CC_TEST_2',
        departmentName: 'Cost Center Test 2',
        costCenter: 'CC-SHARED',
        isActive: true,
      });
      createdDepartmentIds.push(dept1.id, dept2.id);

      const results = await DepartmentService.getDepartmentsByCostCenter('CC-SHARED');

      expect(results).toHaveLength(2);
      expect(results.map(d => d.id)).toEqual(
        expect.arrayContaining([dept1.id, dept2.id])
      );
    });

    it('should get departments by manager', async () => {
      const dept = await DepartmentService.createDepartment({
        departmentCode: 'MGR_TEST',
        departmentName: 'Manager Test Department',
        managerId: testUserId,
        isActive: true,
      });
      createdDepartmentIds.push(dept.id);

      const results = await DepartmentService.getDepartmentsByManager(testUserId);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(dept.id);
    });
  });

  describe('Seed Data Integration', () => {
    afterEach(async () => {
      // Clean up any seeded data
      await prisma.department.deleteMany({
        where: {
          departmentCode: {
            in: [
              ...STANDARD_DEPARTMENTS.map(d => d.departmentCode),
              ...SITE_SPECIFIC_DEPARTMENTS.map(d => d.departmentCode),
            ],
          },
        },
      });
    });

    it('should seed standard departments successfully', async () => {
      await seedDepartments(STANDARD_DEPARTMENTS.slice(0, 5)); // Test with subset

      const seededCount = await prisma.department.count({
        where: {
          departmentCode: {
            in: STANDARD_DEPARTMENTS.slice(0, 5).map(d => d.departmentCode),
          },
        },
      });

      expect(seededCount).toBe(5);

      // Test hierarchy exists
      const executive = await prisma.department.findUnique({
        where: { departmentCode: 'EXEC' },
        include: { childDepartments: true },
      });

      expect(executive).toBeTruthy();
      expect(executive?.childDepartments.length).toBeGreaterThan(0);
    });

    it('should handle duplicate seeding (upsert behavior)', async () => {
      const testDepts = STANDARD_DEPARTMENTS.slice(0, 3);

      // Seed first time
      await seedDepartments(testDepts);
      const firstCount = await prisma.department.count({
        where: {
          departmentCode: { in: testDepts.map(d => d.departmentCode) },
        },
      });

      // Seed again (should update, not duplicate)
      await seedDepartments(testDepts);
      const secondCount = await prisma.department.count({
        where: {
          departmentCode: { in: testDepts.map(d => d.departmentCode) },
        },
      });

      expect(firstCount).toBe(3);
      expect(secondCount).toBe(3); // Should not increase
    });
  });

  describe('Database Transaction Handling', () => {
    it('should rollback on creation failure', async () => {
      const initialCount = await prisma.department.count();

      // Mock a database error by using invalid data that would pass validation
      // but fail at the database level (e.g., foreign key constraint)
      await expect(
        DepartmentService.createDepartment({
          departmentCode: 'TEST_ROLLBACK',
          departmentName: 'Test Rollback Department',
          managerId: 'invalid-user-id', // Should cause foreign key error
          isActive: true,
        })
      ).rejects.toThrow();

      const finalCount = await prisma.department.count();
      expect(finalCount).toBe(initialCount); // Should not have increased
    });

    it('should handle concurrent operations safely', async () => {
      const concurrentOps = Array.from({ length: 5 }, (_, i) =>
        DepartmentService.createDepartment({
          departmentCode: `CONCURRENT_${i}`,
          departmentName: `Concurrent Department ${i}`,
          isActive: true,
        })
      );

      const results = await Promise.all(concurrentOps);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.departmentCode).toBe(`CONCURRENT_${index}`);
        createdDepartmentIds.push(result.id);
      });

      // Verify all departments exist in database
      const dbCount = await prisma.department.count({
        where: {
          departmentCode: { startsWith: 'CONCURRENT_' },
        },
      });
      expect(dbCount).toBe(5);
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk department creation efficiently', async () => {
      const startTime = Date.now();

      const bulkOps = Array.from({ length: 20 }, (_, i) =>
        DepartmentService.createDepartment({
          departmentCode: `BULK_${String(i).padStart(3, '0')}`,
          departmentName: `Bulk Department ${i}`,
          description: `Bulk created department for performance testing`,
          isActive: true,
        })
      );

      const results = await Promise.all(bulkOps);
      const endTime = Date.now();

      expect(results).toHaveLength(20);
      results.forEach(result => {
        createdDepartmentIds.push(result.id);
      });

      // Should complete within reasonable time (adjust threshold as needed)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(3000); // 3 seconds
    });

    it('should retrieve department hierarchies efficiently', async () => {
      // Create a department hierarchy with multiple levels
      let parentId: string | undefined;
      const deptIds: string[] = [];

      for (let i = 0; i < 10; i++) {
        const dept = await DepartmentService.createDepartment({
          departmentCode: `PERF_HIER_${i}`,
          departmentName: `Performance Hierarchy ${i}`,
          parentDepartmentId: parentId,
          isActive: true,
        });
        deptIds.push(dept.id);
        parentId = dept.id;
      }
      createdDepartmentIds.push(...deptIds);

      const startTime = Date.now();

      // Test ancestor retrieval performance
      const ancestors = await DepartmentService.getDepartmentAncestors(parentId!);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(ancestors).toHaveLength(9);
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });
});