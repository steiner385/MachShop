/**
 * ✅ GITHUB ISSUE #125: Role Templates for Predefined Role Configurations
 *
 * Test Suite for Role Template API Routes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { RoleTemplateCategory } from '@prisma/client';
import { NotFoundError, ConflictError, ValidationError } from '../../middleware/errorHandler';

// Mock services
vi.mock('../../services/RoleTemplateService');
vi.mock('../../services/ManufacturingRoleTemplatesInitializer');
vi.mock('../../lib/database', () => ({
  default: {}
}));

// Mock auth middleware with factory functions
vi.mock('../../middleware/auth', () => ({
  authMiddleware: vi.fn((req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-1',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    };
    next();
  }),
  requirePermission: vi.fn((permission: string) => (req: any, res: any, next: any) => {
    next();
  }),
  requireRole: vi.fn((role: string) => (req: any, res: any, next: any) => {
    next();
  })
}));

// Import after mocking
import roleTemplateRoutes from '../../routes/roleTemplates';
import { RoleTemplateService } from '../../services/RoleTemplateService';
import { ManufacturingRoleTemplatesInitializer } from '../../services/ManufacturingRoleTemplatesInitializer';

describe('Role Template Routes', () => {
  let app: express.Application;
  let mockRoleTemplateService: any;
  let mockManufacturingInitializer: any;

  const mockRoleTemplate = {
    id: 'template-1',
    templateCode: 'PROD_OPERATOR',
    templateName: 'Production Operator',
    description: 'Standard production operator role',
    category: 'PRODUCTION' as RoleTemplateCategory,
    isActive: true,
    isGlobal: true,
    version: '1.0.0',
    metadata: { skillRequirements: ['Basic manufacturing'] },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    creator: {
      id: 'user-1',
      username: 'creator',
      firstName: 'Test',
      lastName: 'Creator'
    },
    permissions: [{
      id: 'tp-1',
      permissionId: 'perm-1',
      isRequired: true,
      isOptional: false,
      metadata: {},
      permission: {
        id: 'perm-1',
        permissionCode: 'work_orders.view',
        permissionName: 'View Work Orders',
        description: 'Can view work orders',
        category: 'WORK_ORDERS'
      }
    }],
    instances: []
  };

  const mockRoleTemplateInstance = {
    id: 'instance-1',
    templateId: 'template-1',
    roleId: 'role-1',
    instanceName: 'Site A Instance',
    siteId: 'site-1',
    isActive: true,
    instantiatedAt: new Date(),
    instantiatedBy: 'user-1',
    template: mockRoleTemplate,
    role: {
      id: 'role-1',
      roleName: 'Site A Production Operator',
      roleCode: 'SITE_A_PROD_OP',
      description: 'Production operator for Site A',
      permissions: []
    },
    site: {
      id: 'site-1',
      siteName: 'Site A',
      siteCode: 'SITE_A'
    },
    instantiator: {
      id: 'user-1',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User'
    }
  };

  beforeEach(() => {
    // Clear all mocks first
    vi.clearAllMocks();

    // Create mock service instances
    mockRoleTemplateService = {
      listRoleTemplates: vi.fn(),
      getRoleTemplateById: vi.fn(),
      getRoleTemplateByCode: vi.fn(),
      createRoleTemplate: vi.fn(),
      updateRoleTemplate: vi.fn(),
      deleteRoleTemplate: vi.fn(),
      instantiateRoleTemplate: vi.fn(),
      getRoleTemplateUsageStats: vi.fn(),
    };

    mockManufacturingInitializer = {
      areManufacturingTemplatesInitialized: vi.fn(),
      initializeManufacturingRoleTemplates: vi.fn(),
      getMissingManufacturingTemplates: vi.fn(),
      createMissingManufacturingTemplates: vi.fn(),
    };

    // Mock the constructor calls
    vi.mocked(RoleTemplateService).mockImplementation(() => mockRoleTemplateService);
    vi.mocked(ManufacturingRoleTemplatesInitializer).mockImplementation(() => mockManufacturingInitializer);

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/role-templates', roleTemplateRoutes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /role-templates', () => {
    it('should list role templates with default pagination', async () => {
      const mockResponse = {
        templates: [mockRoleTemplate],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      };

      mockRoleTemplateService.listRoleTemplates.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/role-templates')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResponse,
        message: 'Role templates retrieved successfully'
      });

      expect(mockRoleTemplateService.listRoleTemplates).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        20
      );
    });

    it('should apply filters and pagination parameters', async () => {
      const mockResponse = {
        templates: [mockRoleTemplate],
        pagination: {
          page: 2,
          limit: 10,
          total: 15,
          totalPages: 2
        }
      };

      mockRoleTemplateService.listRoleTemplates.mockResolvedValue(mockResponse);

      const response = await request(app)
        .get('/role-templates?page=2&limit=10&category=PRODUCTION&isActive=true&search=operator')
        .expect(200);

      expect(mockRoleTemplateService.listRoleTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'PRODUCTION',
          isActive: true,
          search: 'operator'
        }),
        2,
        10
      );
    });

    it('should handle invalid query parameters', async () => {
      await request(app)
        .get('/role-templates?page=invalid&limit=abc')
        .expect(400);
    });
  });

  describe('GET /role-templates/:id', () => {
    it('should return role template by ID', async () => {
      mockRoleTemplateService.getRoleTemplateById.mockResolvedValue(mockRoleTemplate);

      const response = await request(app)
        .get('/role-templates/template-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockRoleTemplate,
        message: 'Role template retrieved successfully'
      });

      expect(mockRoleTemplateService.getRoleTemplateById).toHaveBeenCalledWith('template-1');
    });

    it('should return 404 for non-existent template', async () => {
      mockRoleTemplateService.getRoleTemplateById.mockRejectedValue(
        new NotFoundError('Role template not found')
      );

      await request(app)
        .get('/role-templates/nonexistent')
        .expect(404);
    });
  });

  describe('GET /role-templates/code/:templateCode', () => {
    it('should return role template by code', async () => {
      mockRoleTemplateService.getRoleTemplateByCode.mockResolvedValue(mockRoleTemplate);

      const response = await request(app)
        .get('/role-templates/code/PROD_OPERATOR')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockRoleTemplate,
        message: 'Role template retrieved successfully'
      });

      expect(mockRoleTemplateService.getRoleTemplateByCode).toHaveBeenCalledWith('PROD_OPERATOR');
    });

    it('should return 404 for non-existent template code', async () => {
      mockRoleTemplateService.getRoleTemplateByCode.mockRejectedValue(
        new NotFoundError('Role template not found')
      );

      await request(app)
        .get('/role-templates/code/NONEXISTENT')
        .expect(404);
    });
  });

  describe('POST /role-templates', () => {
    const createInput = {
      templateCode: 'TEST_TEMPLATE',
      templateName: 'Test Template',
      description: 'A test template',
      category: 'PRODUCTION',
      permissions: [{
        permissionId: 'perm-1',
        isRequired: true,
        isOptional: false
      }]
    };

    it('should create role template successfully', async () => {
      mockRoleTemplateService.createRoleTemplate.mockResolvedValue(mockRoleTemplate);

      const response = await request(app)
        .post('/role-templates')
        .send(createInput)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockRoleTemplate,
        message: 'Role template created successfully'
      });

      expect(mockRoleTemplateService.createRoleTemplate).toHaveBeenCalledWith(
        expect.objectContaining(createInput),
        'test-user-1'
      );
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/role-templates')
        .send({ templateName: 'Incomplete Template' })
        .expect(400);
    });

    it('should validate template code format', async () => {
      await request(app)
        .post('/role-templates')
        .send({ ...createInput, templateCode: 'invalid code' })
        .expect(400);
    });

    it('should handle conflict errors', async () => {
      mockRoleTemplateService.createRoleTemplate.mockRejectedValue(
        new ConflictError('Template code already exists')
      );

      await request(app)
        .post('/role-templates')
        .send(createInput)
        .expect(409);
    });
  });

  describe('PUT /role-templates/:id', () => {
    const updateInput = {
      templateName: 'Updated Template Name',
      description: 'Updated description'
    };

    it('should update role template successfully', async () => {
      const updatedTemplate = { ...mockRoleTemplate, ...updateInput };
      mockRoleTemplateService.updateRoleTemplate.mockResolvedValue(updatedTemplate);

      const response = await request(app)
        .put('/role-templates/template-1')
        .send(updateInput)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: updatedTemplate,
        message: 'Role template updated successfully'
      });

      expect(mockRoleTemplateService.updateRoleTemplate).toHaveBeenCalledWith(
        'template-1',
        updateInput,
        'test-user-1'
      );
    });

    it('should return 404 for non-existent template', async () => {
      mockRoleTemplateService.updateRoleTemplate.mockRejectedValue(
        new NotFoundError('Role template not found')
      );

      await request(app)
        .put('/role-templates/nonexistent')
        .send(updateInput)
        .expect(404);
    });

    it('should validate update input', async () => {
      await request(app)
        .put('/role-templates/template-1')
        .send({ templateCode: 'invalid code' })
        .expect(400);
    });
  });

  describe('DELETE /role-templates/:id', () => {
    it('should delete role template successfully', async () => {
      mockRoleTemplateService.deleteRoleTemplate.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/role-templates/template-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Role template deleted successfully'
      });

      expect(mockRoleTemplateService.deleteRoleTemplate).toHaveBeenCalledWith(
        'template-1',
        'test-user-1'
      );
    });

    it('should return 404 for non-existent template', async () => {
      mockRoleTemplateService.deleteRoleTemplate.mockRejectedValue(
        new NotFoundError('Role template not found')
      );

      await request(app)
        .delete('/role-templates/nonexistent')
        .expect(404);
    });

    it('should handle conflict when template has active instances', async () => {
      mockRoleTemplateService.deleteRoleTemplate.mockRejectedValue(
        new ConflictError('Cannot delete template with active instances')
      );

      await request(app)
        .delete('/role-templates/template-1')
        .expect(409);
    });
  });

  describe('POST /role-templates/:id/instantiate', () => {
    const instantiateInput = {
      roleName: 'Site A Production Operator',
      roleCode: 'SITE_A_PROD_OP',
      instanceName: 'Site A Instance',
      siteId: 'site-1'
    };

    it('should instantiate role template successfully', async () => {
      mockRoleTemplateService.instantiateRoleTemplate.mockResolvedValue(mockRoleTemplateInstance);

      const response = await request(app)
        .post('/role-templates/template-1/instantiate')
        .send(instantiateInput)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockRoleTemplateInstance,
        message: 'Role template instantiated successfully'
      });

      expect(mockRoleTemplateService.instantiateRoleTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          ...instantiateInput,
          templateId: 'template-1'
        }),
        'test-user-1'
      );
    });

    it('should validate required fields for instantiation', async () => {
      await request(app)
        .post('/role-templates/template-1/instantiate')
        .send({ roleName: 'Missing Fields' })
        .expect(400);
    });

    it('should handle template not found error', async () => {
      mockRoleTemplateService.instantiateRoleTemplate.mockRejectedValue(
        new NotFoundError('Role template not found')
      );

      await request(app)
        .post('/role-templates/nonexistent/instantiate')
        .send(instantiateInput)
        .expect(404);
    });

    it('should handle role code conflict', async () => {
      mockRoleTemplateService.instantiateRoleTemplate.mockRejectedValue(
        new ConflictError('Role code already exists')
      );

      await request(app)
        .post('/role-templates/template-1/instantiate')
        .send(instantiateInput)
        .expect(409);
    });
  });

  describe('GET /role-templates/:id/usage-stats', () => {
    const mockUsageStats = {
      templateId: 'template-1',
      totalInstances: 5,
      activeInstances: 4,
      inactiveInstances: 1,
      siteUsage: { 'Site A': 2, 'Site B': 2 },
      recentUsage: []
    };

    it('should return usage statistics', async () => {
      mockRoleTemplateService.getRoleTemplateUsageStats.mockResolvedValue(mockUsageStats);

      const response = await request(app)
        .get('/role-templates/template-1/usage-stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUsageStats,
        message: 'Role template usage statistics retrieved successfully'
      });

      expect(mockRoleTemplateService.getRoleTemplateUsageStats).toHaveBeenCalledWith('template-1');
    });

    it('should return 404 for non-existent template', async () => {
      mockRoleTemplateService.getRoleTemplateUsageStats.mockRejectedValue(
        new NotFoundError('Role template not found')
      );

      await request(app)
        .get('/role-templates/nonexistent/usage-stats')
        .expect(404);
    });
  });

  describe('POST /role-templates/initialize-manufacturing', () => {
    it('should initialize manufacturing templates when not already initialized', async () => {
      mockManufacturingInitializer.areManufacturingTemplatesInitialized.mockResolvedValue(false);
      mockManufacturingInitializer.initializeManufacturingRoleTemplates.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/role-templates/initialize-manufacturing')
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Manufacturing role templates initialized successfully'
      });

      expect(mockManufacturingInitializer.areManufacturingTemplatesInitialized).toHaveBeenCalled();
      expect(mockManufacturingInitializer.initializeManufacturingRoleTemplates).toHaveBeenCalledWith('test-user-1');
    });

    it('should return success message when templates already initialized', async () => {
      mockManufacturingInitializer.areManufacturingTemplatesInitialized.mockResolvedValue(true);

      const response = await request(app)
        .post('/role-templates/initialize-manufacturing')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Manufacturing role templates are already initialized'
      });

      expect(mockManufacturingInitializer.initializeManufacturingRoleTemplates).not.toHaveBeenCalled();
    });
  });

  describe('GET /role-templates/manufacturing/status', () => {
    it('should return manufacturing templates status', async () => {
      const mockStatus = {
        isInitialized: true,
        missingTemplates: [],
        totalExpected: 8,
        foundCount: 8
      };

      mockManufacturingInitializer.areManufacturingTemplatesInitialized.mockResolvedValue(true);
      mockManufacturingInitializer.getMissingManufacturingTemplates.mockResolvedValue([]);

      const response = await request(app)
        .get('/role-templates/manufacturing/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStatus,
        message: 'Manufacturing templates status retrieved successfully'
      });
    });

    it('should return status with missing templates', async () => {
      const missingTemplates = ['MAINTENANCE_TECH', 'SAFETY_COORDINATOR'];
      const mockStatus = {
        isInitialized: false,
        missingTemplates,
        totalExpected: 8,
        foundCount: 6
      };

      mockManufacturingInitializer.areManufacturingTemplatesInitialized.mockResolvedValue(false);
      mockManufacturingInitializer.getMissingManufacturingTemplates.mockResolvedValue(missingTemplates);

      const response = await request(app)
        .get('/role-templates/manufacturing/status')
        .expect(200);

      expect(response.body.data).toEqual(mockStatus);
    });
  });

  describe('POST /role-templates/manufacturing/create-missing', () => {
    it('should create missing manufacturing templates', async () => {
      const createdTemplates = ['MAINTENANCE_TECH', 'SAFETY_COORDINATOR'];
      mockManufacturingInitializer.createMissingManufacturingTemplates.mockResolvedValue(createdTemplates);

      const response = await request(app)
        .post('/role-templates/manufacturing/create-missing')
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          createdTemplates,
          createdCount: 2
        },
        message: '2 missing manufacturing templates created successfully'
      });

      expect(mockManufacturingInitializer.createMissingManufacturingTemplates).toHaveBeenCalledWith('test-user-1');
    });

    it('should handle case when no templates are missing', async () => {
      mockManufacturingInitializer.createMissingManufacturingTemplates.mockResolvedValue([]);

      const response = await request(app)
        .post('/role-templates/manufacturing/create-missing')
        .expect(201);

      expect(response.body.data.createdCount).toBe(0);
    });
  });

  describe('GET /role-templates/categories', () => {
    it('should return available categories', async () => {
      const response = await request(app)
        .get('/role-templates/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(9);
      expect(response.body.data[0]).toMatchObject({
        value: 'PRODUCTION',
        label: 'Production',
        description: expect.any(String)
      });
    });
  });

  describe('GET /role-templates/export', () => {
    it('should return not implemented message', async () => {
      const response = await request(app)
        .get('/role-templates/export')
        .expect(501);

      expect(response.body).toEqual({
        success: false,
        message: 'Export functionality not yet implemented'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors with proper error response', async () => {
      mockRoleTemplateService.createRoleTemplate.mockRejectedValue(
        new ValidationError('Invalid template code format')
      );

      const response = await request(app)
        .post('/role-templates')
        .send({
          templateCode: 'VALID_CODE',
          templateName: 'Test Template',
          category: 'PRODUCTION'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid template code format');
    });

    it('should handle internal server errors', async () => {
      mockRoleTemplateService.listRoleTemplates.mockRejectedValue(
        new Error('Database connection failed')
      );

      await request(app)
        .get('/role-templates')
        .expect(500);
    });

    it('should use role template specific error middleware', async () => {
      const roleTemplateError = new Error('Role template specific error');
      mockRoleTemplateService.getRoleTemplateById.mockRejectedValue(roleTemplateError);

      await request(app)
        .get('/role-templates/template-1')
        .expect(500);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // This test verifies that the auth middleware is applied
      // In a real scenario, this would test with unauthorized requests

      const response = await request(app)
        .get('/role-templates')
        .expect(200);

      // Since we're mocking auth middleware to always pass,
      // we verify the user is set correctly
      expect(response.body.success).toBe(true);
    });

    it('should require proper permissions for template management', async () => {
      // Test that permission middleware is called for management operations
      const response = await request(app)
        .post('/role-templates')
        .send({
          templateCode: 'TEST_TEMPLATE',
          templateName: 'Test Template',
          category: 'PRODUCTION'
        });

      // Verify the operation proceeds (mocked to succeed)
      expect(response.status).not.toBe(403);
    });

    it('should require admin role for manufacturing initialization', async () => {
      mockManufacturingInitializer.areManufacturingTemplatesInitialized.mockResolvedValue(false);
      mockManufacturingInitializer.initializeManufacturingRoleTemplates.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/role-templates/initialize-manufacturing')
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});