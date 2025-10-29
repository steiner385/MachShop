/**
 * Role Management API - GitHub Issue #29
 *
 * Provides CRUD operations for the dynamic role system
 * Requires System Administrator role or admin.roles permission
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Apply authorization to all routes (authentication handled by apiRouter)
router.use(requireRole('System Administrator')); // Admin access only

/**
 * GET /api/v1/admin/roles
 * List all roles with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      active,
      global,
      search,
      page = '1',
      limit = '20'
    } = req.query;

    const filters: any = {};

    if (active !== undefined) {
      filters.isActive = active === 'true';
    }

    if (global !== undefined) {
      filters.isGlobal = global === 'true';
    }

    if (search) {
      filters.OR = [
        { roleName: { contains: search as string, mode: 'insensitive' } },
        { roleCode: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where: filters,
        include: {
          _count: {
            select: {
              userRoles: true,
              userSiteRoles: true,
              permissions: true
            }
          }
        },
        orderBy: { roleName: 'asc' },
        skip,
        take: limitNum
      }),
      prisma.role.count({ where: filters })
    ]);

    const response = {
      roles: roles.map(role => ({
        id: role.id,
        roleCode: role.roleCode,
        roleName: role.roleName,
        description: role.description,
        isActive: role.isActive,
        isGlobal: role.isGlobal,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        stats: {
          userCount: role._count.userRoles + role._count.userSiteRoles,
          permissionCount: role._count.permissions,
          globalAssignments: role._count.userRoles,
          siteAssignments: role._count.userSiteRoles
        }
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };

    logger.info('Role list retrieved', {
      userId: req.user?.id,
      filters,
      resultCount: roles.length,
      total
    });

    res.json(response);

  } catch (error: any) {
    logger.error('Failed to retrieve roles', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve roles',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/admin/roles/:id
 * Get detailed role information including permissions
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                permissionCode: true,
                permissionName: true,
                description: true,
                category: true,
                isWildcard: true
              }
            }
          },
          orderBy: {
            permission: {
              permissionCode: 'asc'
            }
          }
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: {
            assignedAt: 'desc'
          }
        },
        userSiteRoles: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            site: {
              select: {
                id: true,
                siteCode: true,
                siteName: true
              }
            }
          },
          orderBy: {
            assignedAt: 'desc'
          }
        }
      }
    });

    if (!role) {
      return res.status(404).json({
        error: 'Role not found',
        details: `No role found with ID: ${id}`
      });
    }

    const response = {
      id: role.id,
      roleCode: role.roleCode,
      roleName: role.roleName,
      description: role.description,
      isActive: role.isActive,
      isGlobal: role.isGlobal,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      createdBy: role.createdBy,
      permissions: role.permissions.map(rp => ({
        id: rp.permission.id,
        permissionCode: rp.permission.permissionCode,
        permissionName: rp.permission.permissionName,
        description: rp.permission.description,
        category: rp.permission.category,
        isWildcard: rp.permission.isWildcard,
        grantedAt: rp.grantedAt,
        grantedBy: rp.grantedBy
      })),
      users: {
        global: role.userRoles.map(ur => ({
          userId: ur.user.id,
          username: ur.user.username,
          fullName: `${ur.user.firstName || ''} ${ur.user.lastName || ''}`.trim(),
          email: ur.user.email,
          assignedAt: ur.assignedAt,
          assignedBy: ur.assignedBy,
          expiresAt: ur.expiresAt
        })),
        siteSpecific: role.userSiteRoles.map(usr => ({
          userId: usr.user.id,
          username: usr.user.username,
          fullName: `${usr.user.firstName || ''} ${usr.user.lastName || ''}`.trim(),
          email: usr.user.email,
          site: {
            id: usr.site.id,
            siteCode: usr.site.siteCode,
            siteName: usr.site.siteName
          },
          assignedAt: usr.assignedAt,
          assignedBy: usr.assignedBy,
          expiresAt: usr.expiresAt
        }))
      }
    };

    logger.info('Role details retrieved', {
      userId: req.user?.id,
      roleId: id,
      roleName: role.roleName,
      permissionCount: role.permissions.length,
      userCount: role.userRoles.length + role.userSiteRoles.length
    });

    res.json(response);

  } catch (error: any) {
    logger.error('Failed to retrieve role details', {
      userId: req.user?.id,
      roleId: req.params.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve role details',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/admin/roles
 * Create a new role
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      roleCode,
      roleName,
      description,
      isGlobal = true
    } = req.body;

    // Validation
    if (!roleCode || !roleName) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'roleCode and roleName are required'
      });
    }

    // Check for duplicate role code
    const existingRole = await prisma.role.findUnique({
      where: { roleCode }
    });

    if (existingRole) {
      return res.status(409).json({
        error: 'Role already exists',
        details: `A role with code '${roleCode}' already exists`
      });
    }

    const newRole = await prisma.role.create({
      data: {
        roleCode,
        roleName,
        description,
        isGlobal: Boolean(isGlobal),
        isActive: true,
        createdBy: req.user?.id || 'system'
      },
      include: {
        _count: {
          select: {
            userRoles: true,
            userSiteRoles: true,
            permissions: true
          }
        }
      }
    });

    logger.info('Role created', {
      userId: req.user?.id,
      roleId: newRole.id,
      roleCode: newRole.roleCode,
      roleName: newRole.roleName
    });

    res.status(201).json({
      id: newRole.id,
      roleCode: newRole.roleCode,
      roleName: newRole.roleName,
      description: newRole.description,
      isActive: newRole.isActive,
      isGlobal: newRole.isGlobal,
      createdAt: newRole.createdAt,
      updatedAt: newRole.updatedAt,
      createdBy: newRole.createdBy,
      stats: {
        userCount: 0,
        permissionCount: 0,
        globalAssignments: 0,
        siteAssignments: 0
      }
    });

  } catch (error: any) {
    logger.error('Failed to create role', {
      userId: req.user?.id,
      roleData: req.body,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to create role',
      details: error.message
    });
  }
});

/**
 * PUT /api/v1/admin/roles/:id
 * Update an existing role
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      roleName,
      description,
      isActive,
      isGlobal
    } = req.body;

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id }
    });

    if (!existingRole) {
      return res.status(404).json({
        error: 'Role not found',
        details: `No role found with ID: ${id}`
      });
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        ...(roleName && { roleName }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(isGlobal !== undefined && { isGlobal: Boolean(isGlobal) })
      },
      include: {
        _count: {
          select: {
            userRoles: true,
            userSiteRoles: true,
            permissions: true
          }
        }
      }
    });

    logger.info('Role updated', {
      userId: req.user?.id,
      roleId: id,
      roleName: updatedRole.roleName,
      changes: req.body
    });

    res.json({
      id: updatedRole.id,
      roleCode: updatedRole.roleCode,
      roleName: updatedRole.roleName,
      description: updatedRole.description,
      isActive: updatedRole.isActive,
      isGlobal: updatedRole.isGlobal,
      createdAt: updatedRole.createdAt,
      updatedAt: updatedRole.updatedAt,
      createdBy: updatedRole.createdBy,
      stats: {
        userCount: updatedRole._count.userRoles + updatedRole._count.userSiteRoles,
        permissionCount: updatedRole._count.permissions,
        globalAssignments: updatedRole._count.userRoles,
        siteAssignments: updatedRole._count.userSiteRoles
      }
    });

  } catch (error: any) {
    logger.error('Failed to update role', {
      userId: req.user?.id,
      roleId: req.params.id,
      changes: req.body,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to update role',
      details: error.message
    });
  }
});

/**
 * DELETE /api/v1/admin/roles/:id
 * Delete a role (soft delete by setting isActive = false)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userRoles: true,
            userSiteRoles: true
          }
        }
      }
    });

    if (!existingRole) {
      return res.status(404).json({
        error: 'Role not found',
        details: `No role found with ID: ${id}`
      });
    }

    // Check if role is assigned to users
    const assignmentCount = existingRole._count.userRoles + existingRole._count.userSiteRoles;
    if (assignmentCount > 0 && permanent === 'true') {
      return res.status(400).json({
        error: 'Cannot delete role with active assignments',
        details: `Role is assigned to ${assignmentCount} users. Remove assignments first or use soft delete.`
      });
    }

    if (permanent === 'true') {
      // Hard delete
      await prisma.role.delete({
        where: { id }
      });

      logger.warn('Role permanently deleted', {
        userId: req.user?.id,
        roleId: id,
        roleName: existingRole.roleName
      });

      res.json({
        message: 'Role permanently deleted',
        roleId: id,
        roleName: existingRole.roleName
      });
    } else {
      // Soft delete (deactivate)
      const deactivatedRole = await prisma.role.update({
        where: { id },
        data: { isActive: false }
      });

      logger.info('Role deactivated', {
        userId: req.user?.id,
        roleId: id,
        roleName: deactivatedRole.roleName,
        assignmentCount
      });

      res.json({
        message: 'Role deactivated',
        roleId: id,
        roleName: deactivatedRole.roleName,
        assignmentCount
      });
    }

  } catch (error: any) {
    logger.error('Failed to delete role', {
      userId: req.user?.id,
      roleId: req.params.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to delete role',
      details: error.message
    });
  }
});

export default router;