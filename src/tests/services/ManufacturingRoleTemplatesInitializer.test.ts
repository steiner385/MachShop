/**
 * ✅ GITHUB ISSUE #125: Role Templates for Predefined Role Configurations
 *
 * Test Suite for ManufacturingRoleTemplatesInitializer
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient, RoleTemplateCategory } from '@prisma/client';
import { ManufacturingRoleTemplatesInitializer } from '../../services/ManufacturingRoleTemplatesInitializer';
import { RoleTemplateService } from '../../services/RoleTemplateService';

// Mock dependencies
vi.mock('../../services/RoleTemplateService');
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');

  const mockPrisma = {
    permission: {
      findMany: vi.fn(),
    },
    roleTemplate: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };

  return {
    ...actual,
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe('ManufacturingRoleTemplatesInitializer', () => {
  let initializer: ManufacturingRoleTemplatesInitializer;
  let mockPrisma: any;
  let mockRoleTemplateService: any;

  const mockPermissions = [
    { id: 'perm-1', permissionCode: 'work_orders.view' },
    { id: 'perm-2', permissionCode: 'work_orders.update_status' },
    { id: 'perm-3', permissionCode: 'production.record_output' },
    { id: 'perm-4', permissionCode: 'quality.view_all' },
    { id: 'perm-5', permissionCode: 'maintenance.view_all' },
    { id: 'perm-6', permissionCode: 'inventory.view_all' },
    { id: 'perm-7', permissionCode: 'safety.view_all' },
    { id: 'perm-8', permissionCode: 'process.design' }
  ];

  const mockCreatedTemplate = {
    id: 'template-1',
    templateCode: 'PROD_OPERATOR',
    templateName: 'Production Operator',
    description: 'Standard production operator role',
    category: 'PRODUCTION' as RoleTemplateCategory,
    isActive: true,
    isGlobal: true,
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1'
  };

  beforeEach(() => {
    const { PrismaClient } = require('@prisma/client');
    mockPrisma = new PrismaClient();

    mockRoleTemplateService = {
      createRoleTemplate: vi.fn()
    };
    (RoleTemplateService as any).mockImplementation(() => mockRoleTemplateService);

    initializer = new ManufacturingRoleTemplatesInitializer(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeManufacturingRoleTemplates', () => {
    it('should initialize all manufacturing role templates successfully', async () => {
      // Mock permission mapping
      mockPrisma.permission.findMany.mockResolvedValue(mockPermissions);

      // Mock that no templates exist yet
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);

      // Mock template creation
      mockRoleTemplateService.createRoleTemplate.mockResolvedValue(mockCreatedTemplate);

      await initializer.initializeManufacturingRoleTemplates('user-1');

      // Should call createRoleTemplate for each of the 8 manufacturing templates
      expect(mockRoleTemplateService.createRoleTemplate).toHaveBeenCalledTimes(8);

      // Verify permission mapping was created
      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          permissionCode: true
        }
      });
    });

    it('should skip existing templates during initialization', async () => {
      mockPrisma.permission.findMany.mockResolvedValue(mockPermissions);

      // Mock that PROD_OPERATOR already exists
      mockPrisma.roleTemplate.findUnique.mockImplementation((query) => {
        if (query.where.templateCode === 'PROD_OPERATOR') {
          return Promise.resolve(mockCreatedTemplate);
        }
        return Promise.resolve(null);
      });

      mockRoleTemplateService.createRoleTemplate.mockResolvedValue(mockCreatedTemplate);

      await initializer.initializeManufacturingRoleTemplates('user-1');

      // Should call createRoleTemplate 7 times (8 total - 1 existing)
      expect(mockRoleTemplateService.createRoleTemplate).toHaveBeenCalledTimes(7);
    });

    it('should handle missing permissions gracefully', async () => {
      // Mock incomplete permission set
      const incompletePermissions = mockPermissions.slice(0, 3);
      mockPrisma.permission.findMany.mockResolvedValue(incompletePermissions);
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);
      mockRoleTemplateService.createRoleTemplate.mockResolvedValue(mockCreatedTemplate);

      await initializer.initializeManufacturingRoleTemplates('user-1');

      // Should still attempt to create templates with available permissions
      expect(mockRoleTemplateService.createRoleTemplate).toHaveBeenCalled();
    });

    it('should propagate errors from template creation', async () => {
      mockPrisma.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);
      mockRoleTemplateService.createRoleTemplate.mockRejectedValue(new Error('Creation failed'));

      await expect(initializer.initializeManufacturingRoleTemplates('user-1'))
        .rejects.toThrow('Creation failed');
    });

    it('should handle database connection errors', async () => {
      mockPrisma.permission.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(initializer.initializeManufacturingRoleTemplates('user-1'))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('areManufacturingTemplatesInitialized', () => {
    it('should return true when all templates are initialized', async () => {
      mockPrisma.roleTemplate.count.mockResolvedValue(8);

      const result = await initializer.areManufacturingTemplatesInitialized();

      expect(result).toBe(true);
      expect(mockPrisma.roleTemplate.count).toHaveBeenCalledWith({
        where: {
          templateCode: { in: expect.arrayContaining([
            'PROD_OPERATOR',
            'QUALITY_INSPECTOR',
            'MAINTENANCE_TECH',
            'SITE_MANAGER',
            'PROCESS_ENGINEER',
            'WAREHOUSE_OPERATOR',
            'SAFETY_COORDINATOR',
            'QUALITY_MANAGER'
          ]) },
          isActive: true
        }
      });
    });

    it('should return false when templates are missing', async () => {
      mockPrisma.roleTemplate.count.mockResolvedValue(5);

      const result = await initializer.areManufacturingTemplatesInitialized();

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.roleTemplate.count.mockRejectedValue(new Error('Database error'));

      const result = await initializer.areManufacturingTemplatesInitialized();

      expect(result).toBe(false);
    });
  });

  describe('getMissingManufacturingTemplates', () => {
    it('should return missing template codes', async () => {
      const existingTemplates = [
        { templateCode: 'PROD_OPERATOR' },
        { templateCode: 'QUALITY_INSPECTOR' }
      ];

      mockPrisma.roleTemplate.findMany.mockResolvedValue(existingTemplates);

      const result = await initializer.getMissingManufacturingTemplates();

      expect(result).toEqual([
        'MAINTENANCE_TECH',
        'SITE_MANAGER',
        'PROCESS_ENGINEER',
        'WAREHOUSE_OPERATOR',
        'SAFETY_COORDINATOR',
        'QUALITY_MANAGER'
      ]);
    });

    it('should return empty array when all templates exist', async () => {
      const allTemplates = [
        { templateCode: 'PROD_OPERATOR' },
        { templateCode: 'QUALITY_INSPECTOR' },
        { templateCode: 'MAINTENANCE_TECH' },
        { templateCode: 'SITE_MANAGER' },
        { templateCode: 'PROCESS_ENGINEER' },
        { templateCode: 'WAREHOUSE_OPERATOR' },
        { templateCode: 'SAFETY_COORDINATOR' },
        { templateCode: 'QUALITY_MANAGER' }
      ];

      mockPrisma.roleTemplate.findMany.mockResolvedValue(allTemplates);

      const result = await initializer.getMissingManufacturingTemplates();

      expect(result).toEqual([]);
    });

    it('should return all template codes when none exist', async () => {
      mockPrisma.roleTemplate.findMany.mockResolvedValue([]);

      const result = await initializer.getMissingManufacturingTemplates();

      expect(result).toEqual([
        'PROD_OPERATOR',
        'QUALITY_INSPECTOR',
        'MAINTENANCE_TECH',
        'SITE_MANAGER',
        'PROCESS_ENGINEER',
        'WAREHOUSE_OPERATOR',
        'SAFETY_COORDINATOR',
        'QUALITY_MANAGER'
      ]);
    });

    it('should handle database errors', async () => {
      mockPrisma.roleTemplate.findMany.mockRejectedValue(new Error('Database error'));

      await expect(initializer.getMissingManufacturingTemplates())
        .rejects.toThrow('Database error');
    });
  });

  describe('createMissingManufacturingTemplates', () => {
    it('should create only missing templates', async () => {
      const missingCodes = ['MAINTENANCE_TECH', 'SITE_MANAGER'];

      // Mock getMissingManufacturingTemplates
      mockPrisma.roleTemplate.findMany.mockResolvedValue([
        { templateCode: 'PROD_OPERATOR' },
        { templateCode: 'QUALITY_INSPECTOR' }
      ]);

      mockPrisma.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);
      mockRoleTemplateService.createRoleTemplate.mockResolvedValue(mockCreatedTemplate);

      const result = await initializer.createMissingManufacturingTemplates('user-1');

      expect(result).toEqual(missingCodes);
      expect(mockRoleTemplateService.createRoleTemplate).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no templates are missing', async () => {
      // Mock that all templates exist
      mockPrisma.roleTemplate.findMany.mockResolvedValue([
        { templateCode: 'PROD_OPERATOR' },
        { templateCode: 'QUALITY_INSPECTOR' },
        { templateCode: 'MAINTENANCE_TECH' },
        { templateCode: 'SITE_MANAGER' },
        { templateCode: 'PROCESS_ENGINEER' },
        { templateCode: 'WAREHOUSE_OPERATOR' },
        { templateCode: 'SAFETY_COORDINATOR' },
        { templateCode: 'QUALITY_MANAGER' }
      ]);

      const result = await initializer.createMissingManufacturingTemplates('user-1');

      expect(result).toEqual([]);
      expect(mockRoleTemplateService.createRoleTemplate).not.toHaveBeenCalled();
    });

    it('should handle template creation errors', async () => {
      mockPrisma.roleTemplate.findMany.mockResolvedValue([]);
      mockPrisma.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);
      mockRoleTemplateService.createRoleTemplate.mockRejectedValue(new Error('Creation failed'));

      await expect(initializer.createMissingManufacturingTemplates('user-1'))
        .rejects.toThrow('Creation failed');
    });
  });

  describe('Template Definitions', () => {
    it('should have all required manufacturing role templates defined', () => {
      // Access the private method through type assertion
      const templates = (initializer as any).getManufacturingRoleTemplateDefinitions();

      expect(templates).toHaveLength(8);

      const templateCodes = templates.map((t: any) => t.templateCode);
      expect(templateCodes).toEqual([
        'PROD_OPERATOR',
        'QUALITY_INSPECTOR',
        'MAINTENANCE_TECH',
        'SITE_MANAGER',
        'PROCESS_ENGINEER',
        'WAREHOUSE_OPERATOR',
        'SAFETY_COORDINATOR',
        'QUALITY_MANAGER'
      ]);
    });

    it('should have valid metadata for all templates', () => {
      const templates = (initializer as any).getManufacturingRoleTemplateDefinitions();

      templates.forEach((template: any) => {
        expect(template.templateCode).toBeTruthy();
        expect(template.templateName).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.category).toBeTruthy();
        expect(Array.isArray(template.permissions)).toBe(true);
        expect(template.permissions.length).toBeGreaterThan(0);

        // Check metadata structure
        expect(template.metadata).toBeDefined();
        expect(Array.isArray(template.metadata.skillRequirements)).toBe(true);
        expect(Array.isArray(template.metadata.certificationRequirements)).toBe(true);
        expect(Array.isArray(template.metadata.shiftPatterns)).toBe(true);
        expect(Array.isArray(template.metadata.workstationTypes)).toBe(true);
        expect(template.metadata.safetyLevel).toMatch(/^(basic|intermediate|advanced)$/);
        expect(typeof template.metadata.estimatedTrainingHours).toBe('number');
      });
    });

    it('should have appropriate categories for each template', () => {
      const templates = (initializer as any).getManufacturingRoleTemplateDefinitions();

      const expectedCategories = {
        'PROD_OPERATOR': 'PRODUCTION',
        'QUALITY_INSPECTOR': 'QUALITY',
        'MAINTENANCE_TECH': 'MAINTENANCE',
        'SITE_MANAGER': 'MANAGEMENT',
        'PROCESS_ENGINEER': 'ENGINEERING',
        'WAREHOUSE_OPERATOR': 'PRODUCTION',
        'SAFETY_COORDINATOR': 'SAFETY',
        'QUALITY_MANAGER': 'QUALITY'
      };

      templates.forEach((template: any) => {
        expect(template.category).toBe(expectedCategories[template.templateCode as keyof typeof expectedCategories]);
      });
    });

    it('should have unique template codes', () => {
      const templates = (initializer as any).getManufacturingRoleTemplateDefinitions();
      const templateCodes = templates.map((t: any) => t.templateCode);
      const uniqueCodes = [...new Set(templateCodes)];

      expect(uniqueCodes.length).toBe(templateCodes.length);
    });

    it('should have appropriate permission sets for each role', () => {
      const templates = (initializer as any).getManufacturingRoleTemplateDefinitions();

      // Production Operator should have basic production permissions
      const prodOperator = templates.find((t: any) => t.templateCode === 'PROD_OPERATOR');
      expect(prodOperator.permissions).toContain('work_orders.view');
      expect(prodOperator.permissions).toContain('production.record_output');

      // Quality Inspector should have quality permissions
      const qualityInspector = templates.find((t: any) => t.templateCode === 'QUALITY_INSPECTOR');
      expect(qualityInspector.permissions).toContain('quality.view_all');
      expect(qualityInspector.permissions).toContain('quality.create_inspections');

      // Site Manager should have broad oversight permissions
      const siteManager = templates.find((t: any) => t.templateCode === 'SITE_MANAGER');
      expect(siteManager.permissions).toContain('production.view_all');
      expect(siteManager.permissions).toContain('quality.view_all');
      expect(siteManager.permissions).toContain('maintenance.view_all');
    });
  });

  describe('Permission Mapping', () => {
    it('should create proper permission mapping', async () => {
      mockPrisma.permission.findMany.mockResolvedValue(mockPermissions);

      // Access the private method
      const permissionMap = await (initializer as any).createPermissionMapping();

      expect(permissionMap.size).toBe(mockPermissions.length);
      expect(permissionMap.get('work_orders.view')).toBe('perm-1');
      expect(permissionMap.get('work_orders.update_status')).toBe('perm-2');
    });

    it('should handle empty permission list', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([]);

      const permissionMap = await (initializer as any).createPermissionMapping();

      expect(permissionMap.size).toBe(0);
    });

    it('should handle permission mapping errors', async () => {
      mockPrisma.permission.findMany.mockRejectedValue(new Error('Permission fetch failed'));

      await expect((initializer as any).createPermissionMapping())
        .rejects.toThrow('Permission fetch failed');
    });
  });

  describe('Integration with RoleTemplateService', () => {
    it('should pass correct input to RoleTemplateService.createRoleTemplate', async () => {
      mockPrisma.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);
      mockRoleTemplateService.createRoleTemplate.mockResolvedValue(mockCreatedTemplate);

      await initializer.initializeManufacturingRoleTemplates('user-1');

      // Check that createRoleTemplate was called with proper structure
      const firstCall = mockRoleTemplateService.createRoleTemplate.mock.calls[0];
      const templateInput = firstCall[0];
      const createdById = firstCall[1];

      expect(createdById).toBe('user-1');
      expect(templateInput).toMatchObject({
        templateCode: expect.any(String),
        templateName: expect.any(String),
        description: expect.any(String),
        category: expect.any(String),
        isActive: true,
        isGlobal: true,
        version: '1.0.0',
        metadata: expect.any(Object),
        permissions: expect.any(Array)
      });

      // Check permissions structure
      if (templateInput.permissions && templateInput.permissions.length > 0) {
        expect(templateInput.permissions[0]).toMatchObject({
          permissionId: expect.any(String),
          isRequired: true,
          isOptional: false,
          metadata: expect.any(Object)
        });
      }
    });
  });
});