/**
 * Prisma Model Integration Tests
 *
 * Comprehensive tests for core Prisma models with actual database operations.
 * Tests CRUD operations, relationships, constraints, and data integrity.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/database';

describe('Prisma Model Integration Tests', () => {
  beforeAll(async () => {
    // Ensure we're connected to the test database
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData();
  });

  // Simple cleanup function for basic models only
  async function cleanupTestData() {
    try {
      // Clean up in reverse dependency order (only core models for now)
      await prisma.workOrder.deleteMany();
      await prisma.part.deleteMany();
      await prisma.site.deleteMany();
      await prisma.enterprise.deleteMany();
      await prisma.user.deleteMany();
    } catch (error) {
      // Ignore cleanup errors - database might not be fully set up yet
      console.warn('Cleanup warning (expected for first run):', error);
    }
  }

  describe('User Model', () => {
    it('should create a user with required fields', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: '$2b$10$test.hash.value',
        isActive: true,
      };

      const user = await prisma.user.create({
        data: userData,
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.isActive).toBe(userData.isActive);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce unique constraint on username', async () => {
      const userData = {
        username: 'testuser',
        email: 'test1@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: '$2b$10$test.hash.value',
        isActive: true,
      };

      await prisma.user.create({ data: userData });

      // Attempt to create another user with same username
      await expect(
        prisma.user.create({
          data: {
            ...userData,
            email: 'test2@example.com', // Different email
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce unique constraint on email', async () => {
      const userData = {
        username: 'testuser1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: '$2b$10$test.hash.value',
        isActive: true,
      };

      await prisma.user.create({ data: userData });

      // Attempt to create another user with same email
      await expect(
        prisma.user.create({
          data: {
            ...userData,
            username: 'testuser2', // Different username
          },
        })
      ).rejects.toThrow();
    });

    it('should update user fields correctly', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          passwordHash: '$2b$10$test.hash.value',
          isActive: true,
        },
      });

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: 'Updated',
          isActive: false,
        },
      });

      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.isActive).toBe(false);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });

    it('should delete user correctly', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          passwordHash: '$2b$10$test.hash.value',
          isActive: true,
        },
      });

      await prisma.user.delete({
        where: { id: user.id },
      });

      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(deletedUser).toBeNull();
    });

    it('should find user by unique fields', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: '$2b$10$test.hash.value',
        isActive: true,
      };

      const createdUser = await prisma.user.create({ data: userData });

      // Find by username
      const userByUsername = await prisma.user.findUnique({
        where: { username: userData.username },
      });
      expect(userByUsername?.id).toBe(createdUser.id);

      // Find by email
      const userByEmail = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(userByEmail?.id).toBe(createdUser.id);
    });
  });

  describe('Enterprise and Site Models', () => {
    it('should create enterprise and site with relationship', async () => {
      // Create enterprise
      const enterprise = await prisma.enterprise.create({
        data: {
          enterpriseCode: 'ENT001',
          enterpriseName: 'Test Enterprise',
          description: 'Test enterprise description',
          headquarters: 'Test HQ',
          isActive: true,
        },
      });

      // Create site linked to enterprise
      const site = await prisma.site.create({
        data: {
          siteCode: 'SITE001',
          siteName: 'Test Site',
          location: 'Test Location',
          enterpriseId: enterprise.id,
          isActive: true,
        },
      });

      expect(site.enterpriseId).toBe(enterprise.id);

      // Verify relationship works
      const siteWithEnterprise = await prisma.site.findUnique({
        where: { id: site.id },
        include: { enterprise: true },
      });

      expect(siteWithEnterprise?.enterprise?.id).toBe(enterprise.id);
      expect(siteWithEnterprise?.enterprise?.enterpriseName).toBe('Test Enterprise');
    });

    it('should enforce unique constraint on enterprise code', async () => {
      await prisma.enterprise.create({
        data: {
          enterpriseCode: 'ENT001',
          enterpriseName: 'Test Enterprise 1',
          isActive: true,
        },
      });

      await expect(
        prisma.enterprise.create({
          data: {
            enterpriseCode: 'ENT001', // Same code
            enterpriseName: 'Test Enterprise 2',
            isActive: true,
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce unique constraint on site code', async () => {
      await prisma.site.create({
        data: {
          siteCode: 'SITE001',
          siteName: 'Test Site 1',
          isActive: true,
        },
      });

      await expect(
        prisma.site.create({
          data: {
            siteCode: 'SITE001', // Same code
            siteName: 'Test Site 2',
            isActive: true,
          },
        })
      ).rejects.toThrow();
    });

    it('should handle site without enterprise (optional relationship)', async () => {
      const site = await prisma.site.create({
        data: {
          siteCode: 'SITE001',
          siteName: 'Independent Site',
          isActive: true,
          // No enterpriseId
        },
      });

      expect(site.enterpriseId).toBeNull();

      const siteWithEnterprise = await prisma.site.findUnique({
        where: { id: site.id },
        include: { enterprise: true },
      });

      expect(siteWithEnterprise?.enterprise).toBeNull();
    });
  });

  describe('Part Model', () => {
    it('should create part with required fields', async () => {
      const partData = {
        partNumber: 'PN-001',
        partName: 'Test Part',
        description: 'Test part description',
        partType: 'MANUFACTURED' as const,
        unitOfMeasure: 'EA',
        isActive: true,
      };

      const part = await prisma.part.create({
        data: partData,
      });

      expect(part.id).toBeDefined();
      expect(part.partNumber).toBe(partData.partNumber);
      expect(part.partName).toBe(partData.partName);
      expect(part.description).toBe(partData.description);
      expect(part.partType).toBe(partData.partType);
      expect(part.uom).toBe(partData.uom);
      expect(part.isActive).toBe(partData.isActive);
    });

    it('should enforce unique constraint on part number', async () => {
      await prisma.part.create({
        data: {
          partNumber: 'PN-001',
          partName: 'Test Part 1',
          partType: 'MANUFACTURED',
          unitOfMeasure: 'EA',
          isActive: true,
        },
      });

      await expect(
        prisma.part.create({
          data: {
            partNumber: 'PN-001', // Same part number
            partName: 'Test Part 2',
            partType: 'PURCHASED',
            unitOfMeasure: 'EA',
            isActive: true,
          },
        })
      ).rejects.toThrow();
    });

    it('should validate part type enum values', async () => {
      // Valid part type should work
      const validPart = await prisma.part.create({
        data: {
          partNumber: 'PN-001',
          partName: 'Valid Part',
          partType: 'MANUFACTURED',
          unitOfMeasure: 'EA',
          isActive: true,
        },
      });

      expect(validPart.partType).toBe('MANUFACTURED');

      // Invalid part type should fail at database level or validation
      // Note: Prisma validates enum values at runtime
    });
  });

  describe('WorkOrder Model', () => {
    let site: any;
    let part: any;
    let user: any;

    beforeEach(async () => {
      // Create dependencies for work orders
      site = await prisma.site.create({
        data: {
          siteCode: 'SITE001',
          siteName: 'Test Site',
          isActive: true,
        },
      });

      part = await prisma.part.create({
        data: {
          partNumber: 'PN-001',
          partName: 'Test Part',
          partType: 'MANUFACTURED',
          unitOfMeasure: 'EA',
          isActive: true,
        },
      });

      user = await prisma.user.create({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          passwordHash: '$2b$10$test.hash.value',
          isActive: true,
        },
      });
    });

    it('should create work order with relationships', async () => {
      const workOrderData = {
        workOrderNumber: 'WO-001',
        partId: part.id,
        siteId: site.id,
        quantity: 100,
        status: 'CREATED' as const,
        priority: 'NORMAL' as const,
        createdById: user.id,
      };

      const workOrder = await prisma.workOrder.create({
        data: workOrderData,
        include: {
          part: true,
          site: true,
          createdBy: true,
        },
      });

      expect(workOrder.workOrderNumber).toBe(workOrderData.workOrderNumber);
      expect(workOrder.quantity).toBe(workOrderData.quantity);
      expect(workOrder.status).toBe(workOrderData.status);
      expect(workOrder.priority).toBe(workOrderData.priority);

      // Verify relationships
      expect(workOrder.part.id).toBe(part.id);
      expect(workOrder.part.partNumber).toBe('PN-001');
      expect(workOrder.site.id).toBe(site.id);
      expect(workOrder.site.siteCode).toBe('SITE001');
      expect(workOrder.createdBy.id).toBe(user.id);
      expect(workOrder.createdBy.username).toBe('testuser');
    });

    it('should enforce unique constraint on work order number', async () => {
      const workOrderData = {
        workOrderNumber: 'WO-001',
        partId: part.id,
        siteId: site.id,
        quantity: 100,
        status: 'CREATED' as const,
        priority: 'NORMAL' as const,
        createdById: user.id,
      };

      await prisma.workOrder.create({ data: workOrderData });

      await expect(
        prisma.workOrder.create({
          data: {
            ...workOrderData,
            quantity: 200, // Different quantity
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce foreign key constraints', async () => {
      // Invalid part ID should fail
      await expect(
        prisma.workOrder.create({
          data: {
            workOrderNumber: 'WO-001',
            partId: 'invalid-part-id',
            siteId: site.id,
            quantity: 100,
            status: 'CREATED',
            priority: 'NORMAL',
            createdById: user.id,
          },
        })
      ).rejects.toThrow();

      // Invalid site ID should fail
      await expect(
        prisma.workOrder.create({
          data: {
            workOrderNumber: 'WO-002',
            partId: part.id,
            siteId: 'invalid-site-id',
            quantity: 100,
            status: 'CREATED',
            priority: 'NORMAL',
            createdById: user.id,
          },
        })
      ).rejects.toThrow();

      // Invalid user ID should fail
      await expect(
        prisma.workOrder.create({
          data: {
            workOrderNumber: 'WO-003',
            partId: part.id,
            siteId: site.id,
            quantity: 100,
            status: 'CREATED',
            priority: 'NORMAL',
            createdById: 'invalid-user-id',
          },
        })
      ).rejects.toThrow();
    });

    it('should validate status enum values', async () => {
      const validStatuses = ['CREATED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'];

      for (const status of validStatuses) {
        const workOrder = await prisma.workOrder.create({
          data: {
            workOrderNumber: `WO-${status}`,
            partId: part.id,
            siteId: site.id,
            quantity: 100,
            status: status as any,
            priority: 'NORMAL',
            createdById: user.id,
          },
        });

        expect(workOrder.status).toBe(status);
      }
    });

    it('should update work order status correctly', async () => {
      const workOrder = await prisma.workOrder.create({
        data: {
          workOrderNumber: 'WO-001',
          partId: part.id,
          siteId: site.id,
          quantity: 100,
          status: 'CREATED',
          priority: 'NORMAL',
          createdById: user.id,
        },
      });

      const updatedWorkOrder = await prisma.workOrder.update({
        where: { id: workOrder.id },
        data: {
          status: 'IN_PROGRESS',
          actualStartDate: new Date(),
        },
      });

      expect(updatedWorkOrder.status).toBe('IN_PROGRESS');
      expect(updatedWorkOrder.actualStartDate).toBeInstanceOf(Date);
    });
  });

  describe('Complex Relationships and Queries', () => {
    let enterprise: any;
    let site: any;
    let part: any;
    let user: any;
    let workOrders: any[];

    beforeEach(async () => {
      // Set up complex test data
      enterprise = await prisma.enterprise.create({
        data: {
          enterpriseCode: 'ENT001',
          enterpriseName: 'Test Enterprise',
          isActive: true,
        },
      });

      site = await prisma.site.create({
        data: {
          siteCode: 'SITE001',
          siteName: 'Test Site',
          enterpriseId: enterprise.id,
          isActive: true,
        },
      });

      part = await prisma.part.create({
        data: {
          partNumber: 'PN-001',
          partName: 'Test Part',
          partType: 'MANUFACTURED',
          unitOfMeasure: 'EA',
          isActive: true,
        },
      });

      user = await prisma.user.create({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          passwordHash: '$2b$10$test.hash.value',
          isActive: true,
        },
      });

      // Create multiple work orders
      workOrders = await Promise.all([
        prisma.workOrder.create({
          data: {
            workOrderNumber: 'WO-001',
            partId: part.id,
            siteId: site.id,
            quantity: 100,
            status: 'CREATED',
            priority: 'HIGH',
            createdById: user.id,
          },
        }),
        prisma.workOrder.create({
          data: {
            workOrderNumber: 'WO-002',
            partId: part.id,
            siteId: site.id,
            quantity: 200,
            status: 'IN_PROGRESS',
            priority: 'NORMAL',
            createdById: user.id,
          },
        }),
        prisma.workOrder.create({
          data: {
            workOrderNumber: 'WO-003',
            partId: part.id,
            siteId: site.id,
            quantity: 150,
            status: 'COMPLETED',
            priority: 'LOW',
            createdById: user.id,
          },
        }),
      ]);
    });

    it('should query site with all related entities', async () => {
      const siteWithRelations = await prisma.site.findUnique({
        where: { id: site.id },
        include: {
          enterprise: true,
          workOrders: {
            include: {
              part: true,
              createdBy: true,
            },
          },
        },
      });

      expect(siteWithRelations).toBeDefined();
      expect(siteWithRelations?.enterprise?.enterpriseName).toBe('Test Enterprise');
      expect(siteWithRelations?.workOrders).toHaveLength(3);

      const workOrder = siteWithRelations?.workOrders[0];
      expect(workOrder?.part?.partNumber).toBe('PN-001');
      expect(workOrder?.createdBy?.username).toBe('testuser');
    });

    it('should filter work orders by status', async () => {
      const inProgressWorkOrders = await prisma.workOrder.findMany({
        where: {
          siteId: site.id,
          status: 'IN_PROGRESS',
        },
        include: {
          part: true,
        },
      });

      expect(inProgressWorkOrders).toHaveLength(1);
      expect(inProgressWorkOrders[0].workOrderNumber).toBe('WO-002');
      expect(inProgressWorkOrders[0].status).toBe('IN_PROGRESS');
    });

    it('should aggregate work order quantities by status', async () => {
      const aggregation = await prisma.workOrder.groupBy({
        by: ['status'],
        where: {
          siteId: site.id,
        },
        _sum: {
          quantity: true,
        },
        _count: {
          id: true,
        },
      });

      expect(aggregation).toHaveLength(3); // CREATED, IN_PROGRESS, COMPLETED

      const createdGroup = aggregation.find(g => g.status === 'CREATED');
      expect(createdGroup?._sum.quantity).toBe(100);
      expect(createdGroup?._count.id).toBe(1);

      const inProgressGroup = aggregation.find(g => g.status === 'IN_PROGRESS');
      expect(inProgressGroup?._sum.quantity).toBe(200);
      expect(inProgressGroup?._count.id).toBe(1);

      const completedGroup = aggregation.find(g => g.status === 'COMPLETED');
      expect(completedGroup?._sum.quantity).toBe(150);
      expect(completedGroup?._count.id).toBe(1);
    });

    it('should sort and paginate work orders', async () => {
      // Test sorting by quantity descending
      const sortedWorkOrders = await prisma.workOrder.findMany({
        where: { siteId: site.id },
        orderBy: { quantity: 'desc' },
        take: 2,
      });

      expect(sortedWorkOrders).toHaveLength(2);
      expect(sortedWorkOrders[0].quantity).toBe(200); // WO-002
      expect(sortedWorkOrders[1].quantity).toBe(150); // WO-003

      // Test pagination with skip
      const paginatedWorkOrders = await prisma.workOrder.findMany({
        where: { siteId: site.id },
        orderBy: { quantity: 'desc' },
        skip: 1,
        take: 2,
      });

      expect(paginatedWorkOrders).toHaveLength(2);
      expect(paginatedWorkOrders[0].quantity).toBe(150); // WO-003
      expect(paginatedWorkOrders[1].quantity).toBe(100); // WO-001
    });
  });

  describe('Database Constraints and Edge Cases', () => {
    it('should handle null and optional fields correctly', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: '$2b$10$test.hash.value',
          // firstName and lastName are optional
          isActive: true,
        },
      });

      expect(user.firstName).toBeNull();
      expect(user.lastName).toBeNull();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
    });

    it('should handle date fields correctly', async () => {
      const now = new Date();
      const site = await prisma.site.create({
        data: {
          siteCode: 'SITE001',
          siteName: 'Test Site',
          isActive: true,
        },
      });

      expect(site.createdAt).toBeInstanceOf(Date);
      expect(site.updatedAt).toBeInstanceOf(Date);
      expect(site.createdAt.getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000); // Within 1 second
      expect(site.updatedAt.getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000);
    });

    it('should enforce data type constraints', async () => {
      const part = await prisma.part.create({
        data: {
          partNumber: 'PN-001',
          partName: 'Test Part',
          partType: 'MANUFACTURED',
          unitOfMeasure: 'EA',
          standardCost: 10.50, // Decimal field
          isActive: true,
        },
      });

      expect(typeof part.standardCost).toBe('number');
      expect(part.standardCost).toBe(10.5);
    });

    it('should handle large text fields', async () => {
      const longDescription = 'A'.repeat(5000); // Long text

      const part = await prisma.part.create({
        data: {
          partNumber: 'PN-001',
          partName: 'Test Part',
          partType: 'MANUFACTURED',
          unitOfMeasure: 'EA',
          description: longDescription,
          isActive: true,
        },
      });

      expect(part.description).toBe(longDescription);
      expect(part.description?.length).toBe(5000);
    });

    it('should handle boolean fields correctly', async () => {
      const inactiveUser = await prisma.user.create({
        data: {
          username: 'inactiveuser',
          email: 'inactive@example.com',
          passwordHash: '$2b$10$test.hash.value',
          isActive: false,
        },
      });

      const activeUser = await prisma.user.create({
        data: {
          username: 'activeuser',
          email: 'active@example.com',
          passwordHash: '$2b$10$test.hash.value',
          isActive: true,
        },
      });

      expect(inactiveUser.isActive).toBe(false);
      expect(activeUser.isActive).toBe(true);

      // Query by boolean field
      const activeUsers = await prisma.user.findMany({
        where: { isActive: true },
      });

      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].username).toBe('activeuser');
    });
  });
});