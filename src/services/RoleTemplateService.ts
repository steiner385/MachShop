/**
 * ✅ GITHUB ISSUE #125: Role Templates for Predefined Role Configurations
 *
 * RoleTemplateService - Core service for managing role templates
 * Provides CRUD operations, template instantiation, and integration with existing RBAC system
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  CreateRoleTemplateInput,
  UpdateRoleTemplateInput,
  InstantiateRoleTemplateInput,
  RoleTemplateWithPermissions,
  RoleTemplateInstance,
  RoleTemplateUsageStats,
  RoleTemplateListFilters,
  PaginatedRoleTemplates
} from '../types/roleTemplate';

export class RoleTemplateService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new role template
   */
  async createRoleTemplate(
    input: CreateRoleTemplateInput,
    createdById: string
  ): Promise<RoleTemplateWithPermissions> {
    try {
      logger.info('Creating role template', { templateCode: input.templateCode, createdById });

      // Validate template code uniqueness
      const existingTemplate = await this.prisma.roleTemplate.findUnique({
        where: { templateCode: input.templateCode }
      });

      if (existingTemplate) {
        throw new Error(`Role template with code '${input.templateCode}' already exists`);
      }

      // Validate permissions exist
      if (input.permissions && input.permissions.length > 0) {
        const permissionIds = input.permissions.map(p => p.permissionId);
        const existingPermissions = await this.prisma.permission.findMany({
          where: { id: { in: permissionIds } },
          select: { id: true }
        });

        const foundIds = existingPermissions.map(p => p.id);
        const missingIds = permissionIds.filter(id => !foundIds.includes(id));

        if (missingIds.length > 0) {
          throw new Error(`Invalid permission IDs: ${missingIds.join(', ')}`);
        }
      }

      // Create template with permissions in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the template
        const template = await tx.roleTemplate.create({
          data: {
            templateCode: input.templateCode,
            templateName: input.templateName,
            description: input.description,
            category: input.category,
            isActive: input.isActive ?? true,
            isGlobal: input.isGlobal ?? true,
            version: input.version ?? '1.0.0',
            metadata: input.metadata || {},
            createdBy: createdById,
            updatedBy: createdById
          }
        });

        // Create template permissions if provided
        if (input.permissions && input.permissions.length > 0) {
          await tx.roleTemplatePermission.createMany({
            data: input.permissions.map(perm => ({
              templateId: template.id,
              permissionId: perm.permissionId,
              isRequired: perm.isRequired ?? true,
              isOptional: perm.isOptional ?? false,
              metadata: perm.metadata || {}
            }))
          });
        }

        // Log the creation
        await tx.roleTemplateUsageLog.create({
          data: {
            templateId: template.id,
            action: 'TEMPLATE_CREATED',
            performedBy: createdById,
            details: {
              templateCode: input.templateCode,
              templateName: input.templateName,
              category: input.category,
              permissionCount: input.permissions?.length || 0
            }
          }
        });

        return template;
      });

      // Fetch and return complete template with permissions
      return this.getRoleTemplateById(result.id);

    } catch (error) {
      logger.error('Failed to create role template', { error: error.message, input });
      throw error;
    }
  }

  /**
   * Get role template by ID with permissions
   */
  async getRoleTemplateById(templateId: string): Promise<RoleTemplateWithPermissions> {
    try {
      const template = await this.prisma.roleTemplate.findUnique({
        where: { id: templateId },
        include: {
          permissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  permissionCode: true,
                  permissionName: true,
                  description: true,
                  category: true
                }
              }
            }
          },
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          updater: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          instances: {
            include: {
              role: {
                select: {
                  id: true,
                  roleName: true,
                  roleCode: true
                }
              },
              site: {
                select: {
                  id: true,
                  siteName: true,
                  siteCode: true
                }
              }
            }
          }
        }
      });

      if (!template) {
        throw new Error('Role template not found');
      }

      return this.formatRoleTemplateWithPermissions(template);

    } catch (error) {
      logger.error('Failed to get role template', { error: error.message, templateId });
      throw error;
    }
  }

  /**
   * Get role template by template code
   */
  async getRoleTemplateByCode(templateCode: string): Promise<RoleTemplateWithPermissions> {
    try {
      const template = await this.prisma.roleTemplate.findUnique({
        where: { templateCode },
        include: {
          permissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  permissionCode: true,
                  permissionName: true,
                  description: true,
                  category: true
                }
              }
            }
          },
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          updater: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          instances: {
            include: {
              role: {
                select: {
                  id: true,
                  roleName: true,
                  roleCode: true
                }
              },
              site: {
                select: {
                  id: true,
                  siteName: true,
                  siteCode: true
                }
              }
            }
          }
        }
      });

      if (!template) {
        throw new Error(`Role template with code '${templateCode}' not found`);
      }

      return this.formatRoleTemplateWithPermissions(template);

    } catch (error) {
      logger.error('Failed to get role template by code', { error: error.message, templateCode });
      throw error;
    }
  }

  /**
   * List role templates with filtering and pagination
   */
  async listRoleTemplates(
    filters: RoleTemplateListFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedRoleTemplates> {
    try {
      const where: any = {};

      // Apply filters
      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.isGlobal !== undefined) {
        where.isGlobal = filters.isGlobal;
      }

      if (filters.search) {
        where.OR = [
          { templateName: { contains: filters.search, mode: 'insensitive' } },
          { templateCode: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      // Get total count
      const total = await this.prisma.roleTemplate.count({ where });

      // Get paginated results
      const templates = await this.prisma.roleTemplate.findMany({
        where,
        include: {
          permissions: {
            include: {
              permission: {
                select: {
                  id: true,
                  permissionCode: true,
                  permissionName: true,
                  category: true
                }
              }
            }
          },
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              instances: true,
              permissions: true
            }
          }
        },
        orderBy: {
          [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      });

      const formattedTemplates = templates.map(template => ({
        id: template.id,
        templateCode: template.templateCode,
        templateName: template.templateName,
        description: template.description,
        category: template.category,
        isActive: template.isActive,
        isGlobal: template.isGlobal,
        version: template.version,
        metadata: template.metadata,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        creator: template.creator,
        permissionCount: template._count.permissions,
        instanceCount: template._count.instances,
        permissions: template.permissions.map(tp => ({
          id: tp.id,
          permissionId: tp.permissionId,
          isRequired: tp.isRequired,
          isOptional: tp.isOptional,
          metadata: tp.metadata,
          permission: tp.permission
        }))
      }));

      return {
        templates: formattedTemplates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Failed to list role templates', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Update role template
   */
  async updateRoleTemplate(
    templateId: string,
    input: UpdateRoleTemplateInput,
    updatedById: string
  ): Promise<RoleTemplateWithPermissions> {
    try {
      logger.info('Updating role template', { templateId, updatedById });

      // Check template exists
      const existingTemplate = await this.prisma.roleTemplate.findUnique({
        where: { id: templateId }
      });

      if (!existingTemplate) {
        throw new Error('Role template not found');
      }

      // Validate template code uniqueness if being changed
      if (input.templateCode && input.templateCode !== existingTemplate.templateCode) {
        const conflictingTemplate = await this.prisma.roleTemplate.findUnique({
          where: { templateCode: input.templateCode }
        });

        if (conflictingTemplate) {
          throw new Error(`Role template with code '${input.templateCode}' already exists`);
        }
      }

      // Validate permissions if provided
      if (input.permissions) {
        const permissionIds = input.permissions.map(p => p.permissionId);
        const existingPermissions = await this.prisma.permission.findMany({
          where: { id: { in: permissionIds } },
          select: { id: true }
        });

        const foundIds = existingPermissions.map(p => p.id);
        const missingIds = permissionIds.filter(id => !foundIds.includes(id));

        if (missingIds.length > 0) {
          throw new Error(`Invalid permission IDs: ${missingIds.join(', ')}`);
        }
      }

      // Update template and permissions in transaction
      await this.prisma.$transaction(async (tx) => {
        // Update template
        await tx.roleTemplate.update({
          where: { id: templateId },
          data: {
            ...input,
            updatedBy: updatedById,
            updatedAt: new Date()
          }
        });

        // Update permissions if provided
        if (input.permissions) {
          // Delete existing permissions
          await tx.roleTemplatePermission.deleteMany({
            where: { templateId }
          });

          // Create new permissions
          if (input.permissions.length > 0) {
            await tx.roleTemplatePermission.createMany({
              data: input.permissions.map(perm => ({
                templateId,
                permissionId: perm.permissionId,
                isRequired: perm.isRequired ?? true,
                isOptional: perm.isOptional ?? false,
                metadata: perm.metadata || {}
              }))
            });
          }
        }

        // Log the update
        await tx.roleTemplateUsageLog.create({
          data: {
            templateId,
            action: 'TEMPLATE_UPDATED',
            performedBy: updatedById,
            details: {
              updatedFields: Object.keys(input),
              permissionCount: input.permissions?.length
            }
          }
        });
      });

      // Return updated template
      return this.getRoleTemplateById(templateId);

    } catch (error) {
      logger.error('Failed to update role template', { error: error.message, templateId, input });
      throw error;
    }
  }

  /**
   * Delete role template (soft delete by setting isActive to false)
   */
  async deleteRoleTemplate(templateId: string, deletedById: string): Promise<void> {
    try {
      logger.info('Deleting role template', { templateId, deletedById });

      // Check template exists
      const template = await this.prisma.roleTemplate.findUnique({
        where: { id: templateId },
        include: {
          instances: true
        }
      });

      if (!template) {
        throw new Error('Role template not found');
      }

      // Check if template has active instances
      const activeInstances = template.instances.filter(instance => instance.isActive);
      if (activeInstances.length > 0) {
        throw new Error(`Cannot delete template with ${activeInstances.length} active instances. Deactivate instances first.`);
      }

      await this.prisma.$transaction(async (tx) => {
        // Soft delete template
        await tx.roleTemplate.update({
          where: { id: templateId },
          data: {
            isActive: false,
            updatedBy: deletedById,
            updatedAt: new Date()
          }
        });

        // Log the deletion
        await tx.roleTemplateUsageLog.create({
          data: {
            templateId,
            action: 'TEMPLATE_DELETED',
            performedBy: deletedById,
            details: {
              templateCode: template.templateCode,
              reason: 'Template deleted by user'
            }
          }
        });
      });

      logger.info('Role template deleted successfully', { templateId });

    } catch (error) {
      logger.error('Failed to delete role template', { error: error.message, templateId });
      throw error;
    }
  }

  /**
   * Instantiate role template into actual role
   */
  async instantiateRoleTemplate(
    input: InstantiateRoleTemplateInput,
    instantiatedById: string
  ): Promise<RoleTemplateInstance> {
    try {
      logger.info('Instantiating role template', {
        templateId: input.templateId,
        roleName: input.roleName,
        instantiatedById
      });

      // Get template with permissions
      const template = await this.getRoleTemplateById(input.templateId);

      if (!template.isActive) {
        throw new Error('Cannot instantiate inactive role template');
      }

      // Generate role code if not provided
      const roleCode = input.roleCode || `${template.templateCode}_${Date.now()}`;

      // Check if role code already exists
      const existingRole = await this.prisma.role.findUnique({
        where: { roleCode }
      });

      if (existingRole) {
        throw new Error(`Role with code '${roleCode}' already exists`);
      }

      const result = await this.prisma.$transaction(async (tx) => {
        // Create the role
        const role = await tx.role.create({
          data: {
            roleCode,
            roleName: input.roleName,
            description: input.description || `Role instantiated from template: ${template.templateName}`,
            isActive: true
          }
        });

        // Determine which permissions to assign
        let permissionsToAssign = template.permissions;

        // Apply custom permissions if provided
        if (input.customPermissions) {
          if (input.customPermissions.addPermissions) {
            // Validate additional permissions exist
            const additionalPermissions = await tx.permission.findMany({
              where: { id: { in: input.customPermissions.addPermissions } }
            });

            if (additionalPermissions.length !== input.customPermissions.addPermissions.length) {
              throw new Error('Some additional permissions not found');
            }

            // Add to permissions list
            const additionalPerms = additionalPermissions.map(p => ({
              id: `custom_${p.id}`,
              permissionId: p.id,
              isRequired: false,
              isOptional: true,
              metadata: {},
              permission: {
                id: p.id,
                permissionCode: p.permissionCode,
                permissionName: p.permissionName,
                description: p.description,
                category: p.category
              }
            }));

            permissionsToAssign = [...permissionsToAssign, ...additionalPerms];
          }

          if (input.customPermissions.removePermissions) {
            // Remove specified permissions
            permissionsToAssign = permissionsToAssign.filter(
              p => !input.customPermissions!.removePermissions!.includes(p.permissionId)
            );
          }
        }

        // Create role-permission assignments
        if (permissionsToAssign.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionsToAssign.map(perm => ({
              roleId: role.id,
              permissionId: perm.permissionId
            }))
          });
        }

        // Create template instance record
        const instance = await tx.roleTemplateInstance.create({
          data: {
            templateId: input.templateId,
            roleId: role.id,
            instanceName: input.instanceName,
            siteId: input.siteId,
            customPermissions: input.customPermissions || {},
            instantiatedBy: instantiatedById,
            metadata: input.metadata || {}
          }
        });

        // Log the instantiation
        await tx.roleTemplateUsageLog.create({
          data: {
            templateId: input.templateId,
            instanceId: instance.id,
            action: 'ROLE_INSTANTIATED',
            performedBy: instantiatedById,
            siteId: input.siteId,
            details: {
              roleId: role.id,
              roleCode,
              roleName: input.roleName,
              permissionCount: permissionsToAssign.length,
              hasCustomizations: !!input.customPermissions
            }
          }
        });

        return instance;
      });

      // Fetch and return complete instance
      const instance = await this.prisma.roleTemplateInstance.findUnique({
        where: { id: result.id },
        include: {
          template: {
            select: {
              id: true,
              templateCode: true,
              templateName: true,
              category: true
            }
          },
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          },
          site: {
            select: {
              id: true,
              siteName: true,
              siteCode: true
            }
          },
          instantiator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return instance!;

    } catch (error) {
      logger.error('Failed to instantiate role template', { error: error.message, input });
      throw error;
    }
  }

  /**
   * Get usage statistics for a role template
   */
  async getRoleTemplateUsageStats(templateId: string): Promise<RoleTemplateUsageStats> {
    try {
      const template = await this.prisma.roleTemplate.findUnique({
        where: { id: templateId },
        include: {
          instances: {
            include: {
              site: {
                select: {
                  id: true,
                  siteName: true
                }
              }
            }
          },
          _count: {
            select: {
              instances: true
            }
          }
        }
      });

      if (!template) {
        throw new Error('Role template not found');
      }

      const activeInstances = template.instances.filter(i => i.isActive);
      const siteUsage = template.instances.reduce((acc, instance) => {
        if (instance.siteId) {
          const siteName = instance.site?.siteName || 'Unknown Site';
          acc[siteName] = (acc[siteName] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Get recent usage logs
      const recentUsage = await this.prisma.roleTemplateUsageLog.findMany({
        where: { templateId },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          performer: {
            select: {
              username: true
            }
          }
        }
      });

      return {
        templateId,
        totalInstances: template._count.instances,
        activeInstances: activeInstances.length,
        inactiveInstances: template._count.instances - activeInstances.length,
        siteUsage,
        recentUsage: recentUsage.map(log => ({
          action: log.action,
          performedBy: log.performer.username,
          timestamp: log.timestamp,
          details: log.details
        }))
      };

    } catch (error) {
      logger.error('Failed to get role template usage stats', { error: error.message, templateId });
      throw error;
    }
  }

  /**
   * Private helper to format role template with permissions
   */
  private formatRoleTemplateWithPermissions(template: any): RoleTemplateWithPermissions {
    return {
      id: template.id,
      templateCode: template.templateCode,
      templateName: template.templateName,
      description: template.description,
      category: template.category,
      isActive: template.isActive,
      isGlobal: template.isGlobal,
      version: template.version,
      metadata: template.metadata,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      creator: template.creator,
      updater: template.updater,
      permissions: template.permissions.map((tp: any) => ({
        id: tp.id,
        permissionId: tp.permissionId,
        isRequired: tp.isRequired,
        isOptional: tp.isOptional,
        metadata: tp.metadata,
        permission: tp.permission
      })),
      instances: template.instances?.map((instance: any) => ({
        id: instance.id,
        instanceName: instance.instanceName,
        isActive: instance.isActive,
        instantiatedAt: instance.instantiatedAt,
        role: instance.role,
        site: instance.site
      })) || []
    };
  }
}