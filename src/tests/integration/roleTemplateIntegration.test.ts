/**
 * ✅ GITHUB ISSUE #125: Role Templates for Predefined Role Configurations
 *
 * Integration Test Suite for Role Template System with Existing RBAC
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient, RoleTemplateCategory } from '@prisma/client';
import { RoleTemplateService } from '../../services/RoleTemplateService';
import { ManufacturingRoleTemplatesInitializer } from '../../services/ManufacturingRoleTemplatesInitializer';
import request from 'supertest';
import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import roleTemplateRoutes from '../../routes/roleTemplates';

// Use in-memory test database for integration tests
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db'
    }
  }
});

describe('Role Template Integration Tests', () => {
  let app: express.Application;
  let roleTemplateService: RoleTemplateService;
  let manufacturingInitializer: ManufacturingRoleTemplatesInitializer;

  // Test data
  const testUser = {
    id: 'test-user-1',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com'
  };

  const testPermissions = [
    {
      id: 'perm-1',
      permissionCode: 'work_orders.view',
      permissionName: 'View Work Orders',
      description: 'Can view work orders',
      category: 'WORK_ORDERS'
    },
    {
      id: 'perm-2',
      permissionCode: 'work_orders.update_status',
      permissionName: 'Update Work Order Status',
      description: 'Can update work order status',
      category: 'WORK_ORDERS'
    },
    {
      id: 'perm-3',
      permissionCode: 'production.record_output',
      permissionName: 'Record Production Output',
      description: 'Can record production output',
      category: 'PRODUCTION'
    },
    {
      id: 'perm-4',
      permissionCode: 'quality.view_all',
      permissionName: 'View All Quality Data',
      description: 'Can view all quality data',
      category: 'QUALITY'
    }
  ];

  const testSite = {
    id: 'site-1',
    siteName: 'Test Manufacturing Site',
    siteCode: 'TEST_SITE',
    description: 'Test site for integration testing'
  };

  beforeEach(async () => {
    // Setup test application
    app = express();
    app.use(express.json());

    // Mock auth middleware for testing
    app.use((req, res, next) => {
      req.user = testUser;
      next();
    });

    app.use('/api/v1/role-templates', roleTemplateRoutes);

    // Initialize services
    roleTemplateService = new RoleTemplateService(testPrisma);
    manufacturingInitializer = new ManufacturingRoleTemplatesInitializer(testPrisma);

    // Setup test data
    await setupTestData();
  });

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  const setupTestData = async () => {
    try {
      // Create test user
      await testPrisma.user.upsert({
        where: { id: testUser.id },
        update: {},
        create: testUser
      });

      // Create test permissions
      for (const permission of testPermissions) {
        await testPrisma.permission.upsert({
          where: { id: permission.id },
          update: {},
          create: permission
        });
      }

      // Create test site
      await testPrisma.site.upsert({
        where: { id: testSite.id },
        update: {},
        create: testSite
      });
    } catch (error) {
      console.warn('Setup test data warning:', error);
    }
  };

  const cleanupTestData = async () => {
    try {
      // Clean up in reverse order of dependencies
      await testPrisma.roleTemplateUsageLog.deleteMany();
      await testPrisma.rolePermission.deleteMany();
      await testPrisma.roleTemplateInstance.deleteMany();
      await testPrisma.roleTemplatePermission.deleteMany();
      await testPrisma.roleTemplate.deleteMany();
      await testPrisma.role.deleteMany();
      await testPrisma.userRole.deleteMany();
      await testPrisma.site.deleteMany();
      await testPrisma.permission.deleteMany();
      await testPrisma.user.deleteMany();
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  };

  describe('Role Template CRUD Operations', () => {
    it('should create, read, update, and delete role template', async () => {
      const templateInput = {
        templateCode: 'TEST_INTEGRATION',
        templateName: 'Integration Test Template',
        description: 'Template for integration testing',
        category: 'PRODUCTION' as RoleTemplateCategory,
        permissions: [
          { permissionId: 'perm-1', isRequired: true, isOptional: false },
          { permissionId: 'perm-2', isRequired: true, isOptional: false }
        ]
      };

      // CREATE
      const createdTemplate = await roleTemplateService.createRoleTemplate(
        templateInput,
        testUser.id
      );

      expect(createdTemplate).toBeDefined();
      expect(createdTemplate.templateCode).toBe(templateInput.templateCode);
      expect(createdTemplate.permissions).toHaveLength(2);

      // READ by ID
      const retrievedById = await roleTemplateService.getRoleTemplateById(createdTemplate.id);
      expect(retrievedById.templateCode).toBe(templateInput.templateCode);

      // READ by Code
      const retrievedByCode = await roleTemplateService.getRoleTemplateByCode(templateInput.templateCode);
      expect(retrievedByCode.id).toBe(createdTemplate.id);

      // UPDATE
      const updateInput = {
        templateName: 'Updated Integration Test Template',
        description: 'Updated description for integration testing'
      };

      const updatedTemplate = await roleTemplateService.updateRoleTemplate(
        createdTemplate.id,
        updateInput,
        testUser.id
      );

      expect(updatedTemplate.templateName).toBe(updateInput.templateName);
      expect(updatedTemplate.description).toBe(updateInput.description);

      // DELETE
      await roleTemplateService.deleteRoleTemplate(createdTemplate.id, testUser.id);

      // Verify soft delete
      const deletedTemplate = await roleTemplateService.getRoleTemplateById(createdTemplate.id);
      expect(deletedTemplate.isActive).toBe(false);
    });

    it('should list role templates with filtering and pagination', async () => {
      // Create multiple test templates
      const templates = [
        {
          templateCode: 'PROD_TEST_1',
          templateName: 'Production Test 1',
          category: 'PRODUCTION' as RoleTemplateCategory
        },
        {
          templateCode: 'QUAL_TEST_1',
          templateName: 'Quality Test 1',
          category: 'QUALITY' as RoleTemplateCategory
        }
      ];

      for (const template of templates) {
        await roleTemplateService.createRoleTemplate(template, testUser.id);
      }

      // Test listing with filters
      const productionTemplates = await roleTemplateService.listRoleTemplates(
        { category: 'PRODUCTION' as RoleTemplateCategory },
        1,
        10
      );

      expect(productionTemplates.templates.length).toBeGreaterThan(0);
      expect(productionTemplates.templates.every(t => t.category === 'PRODUCTION')).toBe(true);

      // Test search functionality
      const searchResults = await roleTemplateService.listRoleTemplates(
        { search: 'production' },
        1,
        10
      );

      expect(searchResults.templates.length).toBeGreaterThan(0);
    });
  });

  describe('Role Template Instantiation', () => {
    let testTemplate: any;

    beforeEach(async () => {
      // Create a test template
      testTemplate = await roleTemplateService.createRoleTemplate({
        templateCode: 'INSTANTIATION_TEST',
        templateName: 'Instantiation Test Template',
        description: 'Template for testing instantiation',
        category: 'PRODUCTION' as RoleTemplateCategory,
        permissions: [
          { permissionId: 'perm-1', isRequired: true, isOptional: false },
          { permissionId: 'perm-3', isRequired: true, isOptional: false }
        ]
      }, testUser.id);
    });

    it('should instantiate role template into actual role', async () => {
      const instantiateInput = {
        templateId: testTemplate.id,
        roleName: 'Site Production Operator',
        roleCode: 'SITE_PROD_OP',
        instanceName: 'Site Production Instance',
        siteId: testSite.id
      };

      const instance = await roleTemplateService.instantiateRoleTemplate(
        instantiateInput,
        testUser.id
      );

      expect(instance).toBeDefined();
      expect(instance.role.roleName).toBe(instantiateInput.roleName);
      expect(instance.role.roleCode).toBe(instantiateInput.roleCode);
      expect(instance.siteId).toBe(testSite.id);

      // Verify role was created with correct permissions
      const createdRole = await testPrisma.role.findUnique({
        where: { id: instance.roleId },
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      });

      expect(createdRole).toBeDefined();
      expect(createdRole!.permissions).toHaveLength(2);

      const permissionCodes = createdRole!.permissions.map(rp => rp.permission.permissionCode);
      expect(permissionCodes).toContain('work_orders.view');
      expect(permissionCodes).toContain('production.record_output');
    });

    it('should handle custom permissions during instantiation', async () => {
      const instantiateInput = {
        templateId: testTemplate.id,
        roleName: 'Custom Production Operator',
        roleCode: 'CUSTOM_PROD_OP',
        customPermissions: {
          addPermissions: ['perm-4'], // Add quality permission
          removePermissions: ['perm-1'] // Remove work orders view
        }
      };

      const instance = await roleTemplateService.instantiateRoleTemplate(
        instantiateInput,
        testUser.id
      );

      // Verify role was created with customized permissions
      const createdRole = await testPrisma.role.findUnique({
        where: { id: instance.roleId },
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      });

      const permissionCodes = createdRole!.permissions.map(rp => rp.permission.permissionCode);
      expect(permissionCodes).toContain('production.record_output'); // Original permission
      expect(permissionCodes).toContain('quality.view_all'); // Added permission
      expect(permissionCodes).not.toContain('work_orders.view'); // Removed permission
    });
  });

  describe('Manufacturing Role Templates Initialization', () => {
    it('should initialize predefined manufacturing templates', async () => {
      // Check initial state
      const initialStatus = await manufacturingInitializer.areManufacturingTemplatesInitialized();
      expect(initialStatus).toBe(false);

      // Initialize manufacturing templates
      await manufacturingInitializer.initializeManufacturingRoleTemplates(testUser.id);

      // Verify initialization
      const finalStatus = await manufacturingInitializer.areManufacturingTemplatesInitialized();
      expect(finalStatus).toBe(true);

      // Verify all 8 manufacturing templates were created
      const manufacturingTemplates = await roleTemplateService.listRoleTemplates({}, 1, 20);
      expect(manufacturingTemplates.templates.length).toBe(8);

      // Verify specific templates exist
      const templateCodes = manufacturingTemplates.templates.map(t => t.templateCode);
      expect(templateCodes).toContain('PROD_OPERATOR');
      expect(templateCodes).toContain('QUALITY_INSPECTOR');
      expect(templateCodes).toContain('MAINTENANCE_TECH');
      expect(templateCodes).toContain('SITE_MANAGER');
    });

    it('should handle partial initialization and create missing templates', async () => {
      // Create only some manufacturing templates manually
      await roleTemplateService.createRoleTemplate({
        templateCode: 'PROD_OPERATOR',
        templateName: 'Production Operator',
        category: 'PRODUCTION' as RoleTemplateCategory
      }, testUser.id);

      await roleTemplateService.createRoleTemplate({
        templateCode: 'QUALITY_INSPECTOR',
        templateName: 'Quality Inspector',
        category: 'QUALITY' as RoleTemplateCategory
      }, testUser.id);

      // Check missing templates
      const missingTemplates = await manufacturingInitializer.getMissingManufacturingTemplates();
      expect(missingTemplates).toHaveLength(6);

      // Create missing templates
      const createdTemplates = await manufacturingInitializer.createMissingManufacturingTemplates(testUser.id);
      expect(createdTemplates).toHaveLength(6);

      // Verify all templates now exist
      const finalStatus = await manufacturingInitializer.areManufacturingTemplatesInitialized();
      expect(finalStatus).toBe(true);
    });
  });

  describe('Role Template Usage Statistics', () => {
    let testTemplate: any;

    beforeEach(async () => {
      testTemplate = await roleTemplateService.createRoleTemplate({
        templateCode: 'STATS_TEST',
        templateName: 'Statistics Test Template',
        category: 'PRODUCTION' as RoleTemplateCategory,
        permissions: [{ permissionId: 'perm-1', isRequired: true, isOptional: false }]
      }, testUser.id);
    });

    it('should track usage statistics for template instances', async () => {
      // Create multiple instances
      const instances = [
        {
          templateId: testTemplate.id,
          roleName: 'Site A Operator',
          roleCode: 'SITE_A_OP',
          siteId: testSite.id
        },
        {
          templateId: testTemplate.id,
          roleName: 'Site B Operator',
          roleCode: 'SITE_B_OP'
        }
      ];

      for (const instance of instances) {
        await roleTemplateService.instantiateRoleTemplate(instance, testUser.id);
      }

      // Get usage statistics
      const stats = await roleTemplateService.getRoleTemplateUsageStats(testTemplate.id);

      expect(stats.templateId).toBe(testTemplate.id);
      expect(stats.totalInstances).toBe(2);
      expect(stats.activeInstances).toBe(2);
      expect(stats.inactiveInstances).toBe(0);
      expect(stats.siteUsage['Test Manufacturing Site']).toBe(1);
    });
  });

  describe('API Integration', () => {
    it('should handle full API workflow through routes', async () => {
      // Create template via API
      const createResponse = await request(app)
        .post('/api/v1/role-templates')
        .send({
          templateCode: 'API_TEST',
          templateName: 'API Test Template',
          category: 'PRODUCTION',
          permissions: [
            { permissionId: 'perm-1', isRequired: true, isOptional: false }
          ]
        })
        .expect(201);

      const templateId = createResponse.body.data.id;

      // List templates
      await request(app)
        .get('/api/v1/role-templates')
        .expect(200);

      // Get specific template
      await request(app)
        .get(`/api/v1/role-templates/${templateId}`)
        .expect(200);

      // Instantiate template
      await request(app)
        .post(`/api/v1/role-templates/${templateId}/instantiate`)
        .send({
          roleName: 'API Test Role',
          roleCode: 'API_TEST_ROLE',
          siteId: testSite.id
        })
        .expect(201);

      // Get usage stats
      await request(app)
        .get(`/api/v1/role-templates/${templateId}/usage-stats`)
        .expect(200);

      // Update template
      await request(app)
        .put(`/api/v1/role-templates/${templateId}`)
        .send({
          templateName: 'Updated API Test Template'
        })
        .expect(200);

      // Delete template
      await request(app)
        .delete(`/api/v1/role-templates/${templateId}`)
        .expect(200);
    });

    it('should handle manufacturing templates initialization via API', async () => {
      // Check status
      const statusResponse = await request(app)
        .get('/api/v1/role-templates/manufacturing/status')
        .expect(200);

      expect(statusResponse.body.data.isInitialized).toBe(false);

      // Initialize manufacturing templates
      await request(app)
        .post('/api/v1/role-templates/initialize-manufacturing')
        .expect(201);

      // Check status again
      const finalStatusResponse = await request(app)
        .get('/api/v1/role-templates/manufacturing/status')
        .expect(200);

      expect(finalStatusResponse.body.data.isInitialized).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle duplicate template codes', async () => {
      const templateInput = {
        templateCode: 'DUPLICATE_TEST',
        templateName: 'Duplicate Test Template',
        category: 'PRODUCTION' as RoleTemplateCategory
      };

      // Create first template
      await roleTemplateService.createRoleTemplate(templateInput, testUser.id);

      // Attempt to create duplicate
      await expect(
        roleTemplateService.createRoleTemplate(templateInput, testUser.id)
      ).rejects.toThrow();
    });

    it('should handle invalid permission references', async () => {
      const templateInput = {
        templateCode: 'INVALID_PERM_TEST',
        templateName: 'Invalid Permission Test',
        category: 'PRODUCTION' as RoleTemplateCategory,
        permissions: [
          { permissionId: 'nonexistent-permission', isRequired: true, isOptional: false }
        ]
      };

      await expect(
        roleTemplateService.createRoleTemplate(templateInput, testUser.id)
      ).rejects.toThrow();
    });

    it('should prevent deletion of templates with active instances', async () => {
      // Create template
      const template = await roleTemplateService.createRoleTemplate({
        templateCode: 'ACTIVE_INSTANCE_TEST',
        templateName: 'Active Instance Test',
        category: 'PRODUCTION' as RoleTemplateCategory,
        permissions: [{ permissionId: 'perm-1', isRequired: true, isOptional: false }]
      }, testUser.id);

      // Create instance
      await roleTemplateService.instantiateRoleTemplate({
        templateId: template.id,
        roleName: 'Test Role',
        roleCode: 'TEST_ROLE'
      }, testUser.id);

      // Attempt to delete template with active instance
      await expect(
        roleTemplateService.deleteRoleTemplate(template.id, testUser.id)
      ).rejects.toThrow();
    });
  });

  describe('Database Integrity', () => {
    it('should maintain referential integrity across related tables', async () => {
      // Create template with permissions
      const template = await roleTemplateService.createRoleTemplate({
        templateCode: 'INTEGRITY_TEST',
        templateName: 'Integrity Test Template',
        category: 'PRODUCTION' as RoleTemplateCategory,
        permissions: [
          { permissionId: 'perm-1', isRequired: true, isOptional: false },
          { permissionId: 'perm-2', isRequired: true, isOptional: false }
        ]
      }, testUser.id);

      // Instantiate template
      const instance = await roleTemplateService.instantiateRoleTemplate({
        templateId: template.id,
        roleName: 'Integrity Test Role',
        roleCode: 'INTEGRITY_ROLE'
      }, testUser.id);

      // Verify all related records exist
      const templateRecord = await testPrisma.roleTemplate.findUnique({
        where: { id: template.id },
        include: {
          permissions: true,
          instances: true
        }
      });

      const roleRecord = await testPrisma.role.findUnique({
        where: { id: instance.roleId },
        include: {
          permissions: true
        }
      });

      const instanceRecord = await testPrisma.roleTemplateInstance.findUnique({
        where: { id: instance.id }
      });

      expect(templateRecord).toBeDefined();
      expect(templateRecord!.permissions).toHaveLength(2);
      expect(templateRecord!.instances).toHaveLength(1);

      expect(roleRecord).toBeDefined();
      expect(roleRecord!.permissions).toHaveLength(2);

      expect(instanceRecord).toBeDefined();
      expect(instanceRecord!.templateId).toBe(template.id);
      expect(instanceRecord!.roleId).toBe(instance.roleId);
    });
  });
});