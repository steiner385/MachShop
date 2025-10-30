/**
 * ✅ GITHUB ISSUE #125: Role Templates for Predefined Role Configurations
 *
 * Comprehensive Test Suite for RoleTemplateService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient, RoleTemplateCategory } from '@prisma/client';
import { RoleTemplateService } from '../../services/RoleTemplateService';
import { ValidationError, NotFoundError, ConflictError } from '../../middleware/errorHandler';
import {
  CreateRoleTemplateInput,
  UpdateRoleTemplateInput,
  InstantiateRoleTemplateInput,
  RoleTemplateListFilters
} from '../../types/roleTemplate';

// Mock Prisma Client
const mockPrisma = {
  roleTemplate: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  roleTemplatePermission: {
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  roleTemplateInstance: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  roleTemplateUsageLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  role: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  rolePermission: {
    createMany: vi.fn(),
  },
  permission: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  site: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};

describe('RoleTemplateService', () => {
  let service: RoleTemplateService;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User'
  };

  const mockPermission = {
    id: 'perm-1',
    permissionCode: 'work_orders.view',
    permissionName: 'View Work Orders',
    description: 'Can view work orders',
    category: 'WORK_ORDERS'
  };

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
    updatedBy: null,
    creator: mockUser,
    updater: null,
    permissions: [{
      id: 'tp-1',
      permissionId: 'perm-1',
      isRequired: true,
      isOptional: false,
      metadata: {},
      permission: mockPermission
    }],
    instances: []
  };

  beforeEach(() => {
    service = new RoleTemplateService(mockPrisma as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createRoleTemplate', () => {
    const createInput: CreateRoleTemplateInput = {
      templateCode: 'TEST_TEMPLATE',
      templateName: 'Test Template',
      description: 'A test template',
      category: 'PRODUCTION' as RoleTemplateCategory,
      permissions: [{
        permissionId: 'perm-1',
        isRequired: true,
        isOptional: false
      }]
    };

    it('should create role template successfully', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);
      mockPrisma.permission.findMany.mockResolvedValue([mockPermission]);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      mockPrisma.roleTemplate.create.mockResolvedValue(mockRoleTemplate);
      mockPrisma.roleTemplateUsageLog.create.mockResolvedValue({});

      const result = await service.createRoleTemplate(createInput, 'user-1');

      expect(result).toEqual(mockRoleTemplate);
      expect(mockPrisma.roleTemplate.findUnique).toHaveBeenCalledWith({
        where: { templateCode: 'TEST_TEMPLATE' }
      });
      expect(mockPrisma.roleTemplate.create).toHaveBeenCalled();
      expect(mockPrisma.roleTemplateUsageLog.create).toHaveBeenCalled();
    });

    it('should throw ConflictError if template code already exists', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(mockRoleTemplate);

      await expect(service.createRoleTemplate(createInput, 'user-1'))
        .rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError for invalid permissions', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);
      mockPrisma.permission.findMany.mockResolvedValue([]);

      await expect(service.createRoleTemplate(createInput, 'user-1'))
        .rejects.toThrow(ValidationError);
    });

    it('should validate template code format', async () => {
      const invalidInput = { ...createInput, templateCode: 'invalid code' };

      await expect(service.createRoleTemplate(invalidInput, 'user-1'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getRoleTemplateById', () => {
    it('should return role template by ID', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(mockRoleTemplate);

      const result = await service.getRoleTemplateById('template-1');

      expect(result).toEqual(mockRoleTemplate);
      expect(mockPrisma.roleTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        include: expect.any(Object)
      });
    });

    it('should throw NotFoundError if template not found', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);

      await expect(service.getRoleTemplateById('nonexistent'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('getRoleTemplateByCode', () => {
    it('should return role template by code', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(mockRoleTemplate);

      const result = await service.getRoleTemplateByCode('PROD_OPERATOR');

      expect(result).toEqual(mockRoleTemplate);
      expect(mockPrisma.roleTemplate.findUnique).toHaveBeenCalledWith({
        where: { templateCode: 'PROD_OPERATOR' },
        include: expect.any(Object)
      });
    });

    it('should throw NotFoundError if template not found', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);

      await expect(service.getRoleTemplateByCode('NONEXISTENT'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('listRoleTemplates', () => {
    const mockTemplates = [mockRoleTemplate];
    const filters: RoleTemplateListFilters = {
      category: 'PRODUCTION' as RoleTemplateCategory,
      isActive: true,
      search: 'production'
    };

    it('should list role templates with filters', async () => {
      mockPrisma.roleTemplate.count.mockResolvedValue(1);
      mockPrisma.roleTemplate.findMany.mockResolvedValue(mockTemplates);

      const result = await service.listRoleTemplates(filters, 1, 20);

      expect(result.templates).toEqual(mockTemplates);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      });
      expect(mockPrisma.roleTemplate.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          category: 'PRODUCTION',
          isActive: true,
          OR: expect.any(Array)
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
        skip: 0,
        take: 20
      });
    });

    it('should handle empty results', async () => {
      mockPrisma.roleTemplate.count.mockResolvedValue(0);
      mockPrisma.roleTemplate.findMany.mockResolvedValue([]);

      const result = await service.listRoleTemplates({}, 1, 20);

      expect(result.templates).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('updateRoleTemplate', () => {
    const updateInput: UpdateRoleTemplateInput = {
      templateName: 'Updated Template Name',
      description: 'Updated description'
    };

    it('should update role template successfully', async () => {
      const updatedTemplate = { ...mockRoleTemplate, ...updateInput };
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(mockRoleTemplate);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      mockPrisma.roleTemplate.update.mockResolvedValue(updatedTemplate);
      mockPrisma.roleTemplateUsageLog.create.mockResolvedValue({});

      const result = await service.updateRoleTemplate('template-1', updateInput, 'user-1');

      expect(result).toEqual(updatedTemplate);
      expect(mockPrisma.roleTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: expect.objectContaining({
          templateName: 'Updated Template Name',
          description: 'Updated description',
          updatedBy: 'user-1'
        }),
        include: expect.any(Object)
      });
    });

    it('should throw NotFoundError if template not found', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);

      await expect(service.updateRoleTemplate('nonexistent', updateInput, 'user-1'))
        .rejects.toThrow(NotFoundError);
    });

    it('should update permissions when provided', async () => {
      const updateWithPermissions = {
        ...updateInput,
        permissions: [{
          permissionId: 'perm-2',
          isRequired: true,
          isOptional: false
        }]
      };

      mockPrisma.roleTemplate.findUnique.mockResolvedValue(mockRoleTemplate);
      mockPrisma.permission.findMany.mockResolvedValue([{
        id: 'perm-2',
        permissionCode: 'quality.view',
        permissionName: 'View Quality',
        category: 'QUALITY'
      }]);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      mockPrisma.roleTemplate.update.mockResolvedValue(mockRoleTemplate);
      mockPrisma.roleTemplatePermission.deleteMany.mockResolvedValue({});
      mockPrisma.roleTemplatePermission.createMany.mockResolvedValue({});

      await service.updateRoleTemplate('template-1', updateWithPermissions, 'user-1');

      expect(mockPrisma.roleTemplatePermission.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.roleTemplatePermission.createMany).toHaveBeenCalled();
    });
  });

  describe('deleteRoleTemplate', () => {
    it('should soft delete role template successfully', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(mockRoleTemplate);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      mockPrisma.roleTemplate.update.mockResolvedValue({});
      mockPrisma.roleTemplateUsageLog.create.mockResolvedValue({});

      await service.deleteRoleTemplate('template-1', 'user-1');

      expect(mockPrisma.roleTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: {
          isActive: false,
          updatedBy: 'user-1',
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should throw NotFoundError if template not found', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);

      await expect(service.deleteRoleTemplate('nonexistent', 'user-1'))
        .rejects.toThrow(NotFoundError);
    });

    it('should prevent deletion if template has active instances', async () => {
      const templateWithInstances = {
        ...mockRoleTemplate,
        instances: [{ id: 'instance-1', isActive: true }]
      };
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(templateWithInstances);

      await expect(service.deleteRoleTemplate('template-1', 'user-1'))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('instantiateRoleTemplate', () => {
    const instantiateInput: InstantiateRoleTemplateInput = {
      templateId: 'template-1',
      roleName: 'Site A Production Operator',
      roleCode: 'SITE_A_PROD_OP',
      instanceName: 'Site A Instance',
      siteId: 'site-1'
    };

    const mockRole = {
      id: 'role-1',
      roleName: 'Site A Production Operator',
      roleCode: 'SITE_A_PROD_OP',
      description: 'Production operator role for Site A',
      permissions: []
    };

    const mockInstance = {
      id: 'instance-1',
      templateId: 'template-1',
      roleId: 'role-1',
      instanceName: 'Site A Instance',
      siteId: 'site-1',
      isActive: true,
      instantiatedAt: new Date(),
      instantiatedBy: 'user-1',
      template: mockRoleTemplate,
      role: mockRole,
      site: { id: 'site-1', siteName: 'Site A', siteCode: 'SITE_A' },
      instantiator: mockUser
    };

    it('should instantiate role template successfully', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(mockRoleTemplate);
      mockPrisma.role.findUnique.mockResolvedValue(null);
      mockPrisma.site.findUnique.mockResolvedValue({ id: 'site-1', siteName: 'Site A' });
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      mockPrisma.role.create.mockResolvedValue(mockRole);
      mockPrisma.rolePermission.createMany.mockResolvedValue({});
      mockPrisma.roleTemplateInstance.create.mockResolvedValue(mockInstance);
      mockPrisma.roleTemplateUsageLog.create.mockResolvedValue({});

      const result = await service.instantiateRoleTemplate(instantiateInput, 'user-1');

      expect(result).toEqual(mockInstance);
      expect(mockPrisma.role.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          roleName: 'Site A Production Operator',
          roleCode: 'SITE_A_PROD_OP',
          description: expect.any(String),
          createdBy: 'user-1'
        })
      });
      expect(mockPrisma.roleTemplateInstance.create).toHaveBeenCalled();
    });

    it('should throw NotFoundError if template not found', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);

      await expect(service.instantiateRoleTemplate(instantiateInput, 'user-1'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if role code already exists', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(mockRoleTemplate);
      mockPrisma.role.findUnique.mockResolvedValue(mockRole);

      await expect(service.instantiateRoleTemplate(instantiateInput, 'user-1'))
        .rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError if site not found', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(mockRoleTemplate);
      mockPrisma.role.findUnique.mockResolvedValue(null);
      mockPrisma.site.findUnique.mockResolvedValue(null);

      await expect(service.instantiateRoleTemplate(instantiateInput, 'user-1'))
        .rejects.toThrow(ValidationError);
    });

    it('should handle custom permissions during instantiation', async () => {
      const inputWithCustomPermissions = {
        ...instantiateInput,
        customPermissions: {
          addPermissions: ['perm-2'],
          removePermissions: ['perm-1']
        }
      };

      mockPrisma.roleTemplate.findUnique.mockResolvedValue(mockRoleTemplate);
      mockPrisma.role.findUnique.mockResolvedValue(null);
      mockPrisma.site.findUnique.mockResolvedValue({ id: 'site-1', siteName: 'Site A' });
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: 'perm-2', permissionCode: 'quality.view' }
      ]);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
      mockPrisma.role.create.mockResolvedValue(mockRole);
      mockPrisma.roleTemplateInstance.create.mockResolvedValue(mockInstance);

      await service.instantiateRoleTemplate(inputWithCustomPermissions, 'user-1');

      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['perm-2'] } }
      });
    });
  });

  describe('getRoleTemplateUsageStats', () => {
    const mockStats = {
      templateId: 'template-1',
      totalInstances: 5,
      activeInstances: 4,
      inactiveInstances: 1,
      siteUsage: { 'Site A': 2, 'Site B': 2 },
      recentUsage: []
    };

    it('should return usage statistics', async () => {
      mockPrisma.roleTemplateInstance.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(4) // active
        .mockResolvedValueOnce(1); // inactive

      mockPrisma.roleTemplateInstance.findMany
        .mockResolvedValueOnce([ // for site usage
          { site: { siteName: 'Site A' } },
          { site: { siteName: 'Site A' } },
          { site: { siteName: 'Site B' } },
          { site: { siteName: 'Site B' } },
          { site: null }
        ])
        .mockResolvedValueOnce([]); // for recent usage

      const result = await service.getRoleTemplateUsageStats('template-1');

      expect(result.templateId).toBe('template-1');
      expect(result.totalInstances).toBe(5);
      expect(result.activeInstances).toBe(4);
      expect(result.inactiveInstances).toBe(1);
      expect(result.siteUsage).toEqual({ 'Site A': 2, 'Site B': 2 });
    });

    it('should throw NotFoundError if template not found', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);

      await expect(service.getRoleTemplateUsageStats('nonexistent'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('validateTemplateInput', () => {
    it('should validate template code format', () => {
      expect(() => service['validateTemplateInput']({ templateCode: 'invalid code' } as any))
        .toThrow(ValidationError);

      expect(() => service['validateTemplateInput']({ templateCode: 'VALID_CODE' } as any))
        .not.toThrow();
    });

    it('should validate template name length', () => {
      expect(() => service['validateTemplateInput']({ templateCode: 'VALID', templateName: 'ab' } as any))
        .toThrow(ValidationError);

      expect(() => service['validateTemplateInput']({ templateCode: 'VALID', templateName: 'Valid Name' } as any))
        .not.toThrow();
    });

    it('should validate description length', () => {
      const longDescription = 'a'.repeat(501);
      expect(() => service['validateTemplateInput']({
        templateCode: 'VALID',
        templateName: 'Valid Name',
        description: longDescription
      } as any)).toThrow(ValidationError);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.roleTemplate.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getRoleTemplateById('template-1'))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle transaction rollback scenarios', async () => {
      mockPrisma.roleTemplate.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      const createInput: CreateRoleTemplateInput = {
        templateCode: 'TEST_TEMPLATE',
        templateName: 'Test Template',
        category: 'PRODUCTION' as RoleTemplateCategory
      };

      await expect(service.createRoleTemplate(createInput, 'user-1'))
        .rejects.toThrow('Transaction failed');
    });
  });
});