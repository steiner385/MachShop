/**
 * Permission Management API - GitHub Issue #29
 *
 * Provides CRUD operations for the dynamic permission system
 * Requires System Administrator role or admin.permissions permission
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireRole } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Apply authorization to all routes (authentication handled by apiRouter)
router.use(requireRole('System Administrator')); // Admin access only

/**
 * GET /api/v1/admin/permissions
 * List all permissions with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      active,
      category,
      wildcard,
      search,
      page = '1',
      limit = '20'
    } = req.query;

    const filters: any = {};

    if (active !== undefined) {
      filters.isActive = active === 'true';
    }

    if (wildcard !== undefined) {
      filters.isWildcard = wildcard === 'true';
    }

    if (category) {
      filters.category = category as string;
    }

    if (search) {
      filters.OR = [
        { permissionCode: { contains: search as string, mode: 'insensitive' } },
        { permissionName: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where: filters,
        include: {
          _count: {
            select: {
              roles: true
            }
          }
        },
        orderBy: [
          { category: 'asc' },
          { permissionCode: 'asc' }
        ],
        skip,
        take: limitNum
      }),
      prisma.permission.count({ where: filters })
    ]);

    const response = {
      permissions: permissions.map(permission => ({
        id: permission.id,
        permissionCode: permission.permissionCode,
        permissionName: permission.permissionName,
        description: permission.description,
        category: permission.category,
        isActive: permission.isActive,
        isWildcard: permission.isWildcard,
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt,
        stats: {
          roleCount: permission._count.roles
        }
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };

    logger.info('Permission list retrieved', {
      userId: req.user?.id,
      filters,
      resultCount: permissions.length,
      total
    });

    res.json(response);

  } catch (error: any) {
    logger.error('Failed to retrieve permissions', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve permissions',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/admin/permissions/:id
 * Get detailed permission information including assigned roles
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                roleCode: true,
                roleName: true,
                description: true,
                isActive: true,
                isGlobal: true
              }
            }
          },
          orderBy: {
            role: {
              roleName: 'asc'
            }
          }
        }
      }
    });

    if (!permission) {
      return res.status(404).json({
        error: 'Permission not found',
        details: `No permission found with ID: ${id}`
      });
    }

    const response = {
      id: permission.id,
      permissionCode: permission.permissionCode,
      permissionName: permission.permissionName,
      description: permission.description,
      category: permission.category,
      isActive: permission.isActive,
      isWildcard: permission.isWildcard,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
      roles: permission.roles.map(rp => ({
        roleId: rp.role.id,
        roleCode: rp.role.roleCode,
        roleName: rp.role.roleName,
        description: rp.role.description,
        isActive: rp.role.isActive,
        isGlobal: rp.role.isGlobal,
        grantedAt: rp.grantedAt,
        grantedBy: rp.grantedBy
      }))
    };

    logger.info('Permission details retrieved', {
      userId: req.user?.id,
      permissionId: id,
      permissionCode: permission.permissionCode,
      roleCount: permission.roles.length
    });

    res.json(response);

  } catch (error: any) {
    logger.error('Failed to retrieve permission details', {
      userId: req.user?.id,
      permissionId: req.params.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve permission details',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/admin/permissions
 * Create a new permission
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      permissionCode,
      permissionName,
      description,
      category,
      isWildcard = false
    } = req.body;

    // Validation
    if (!permissionCode || !permissionName) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'permissionCode and permissionName are required'
      });
    }

    // Validate permission code format
    if (!/^[a-z0-9_.]+(\.\*)?$/.test(permissionCode)) {
      return res.status(400).json({
        error: 'Invalid permission code format',
        details: 'Permission codes should contain only lowercase letters, numbers, dots, and underscores. Wildcards should end with .*'
      });
    }

    // Check for duplicate permission code
    const existingPermission = await prisma.permission.findUnique({
      where: { permissionCode }
    });

    if (existingPermission) {
      return res.status(409).json({
        error: 'Permission already exists',
        details: `A permission with code '${permissionCode}' already exists`
      });
    }

    // Auto-detect wildcard permissions
    const isWildcardDetected = permissionCode.endsWith('.*') || permissionCode === '*';

    const newPermission = await prisma.permission.create({
      data: {
        permissionCode,
        permissionName,
        description,
        category,
        isWildcard: isWildcardDetected || Boolean(isWildcard),
        isActive: true
      },
      include: {
        _count: {
          select: {
            roles: true
          }
        }
      }
    });

    logger.info('Permission created', {
      userId: req.user?.id,
      permissionId: newPermission.id,
      permissionCode: newPermission.permissionCode,
      permissionName: newPermission.permissionName
    });

    res.status(201).json({
      id: newPermission.id,
      permissionCode: newPermission.permissionCode,
      permissionName: newPermission.permissionName,
      description: newPermission.description,
      category: newPermission.category,
      isActive: newPermission.isActive,
      isWildcard: newPermission.isWildcard,
      createdAt: newPermission.createdAt,
      updatedAt: newPermission.updatedAt,
      stats: {
        roleCount: 0
      }
    });

  } catch (error: any) {
    logger.error('Failed to create permission', {
      userId: req.user?.id,
      permissionData: req.body,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to create permission',
      details: error.message
    });
  }
});

/**
 * PUT /api/v1/admin/permissions/:id
 * Update an existing permission
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      permissionName,
      description,
      category,
      isActive,
      isWildcard
    } = req.body;

    // Check if permission exists
    const existingPermission = await prisma.permission.findUnique({
      where: { id }
    });

    if (!existingPermission) {
      return res.status(404).json({
        error: 'Permission not found',
        details: `No permission found with ID: ${id}`
      });
    }

    const updatedPermission = await prisma.permission.update({
      where: { id },
      data: {
        ...(permissionName && { permissionName }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(isWildcard !== undefined && { isWildcard: Boolean(isWildcard) })
      },
      include: {
        _count: {
          select: {
            roles: true
          }
        }
      }
    });

    logger.info('Permission updated', {
      userId: req.user?.id,
      permissionId: id,
      permissionCode: updatedPermission.permissionCode,
      changes: req.body
    });

    res.json({
      id: updatedPermission.id,
      permissionCode: updatedPermission.permissionCode,
      permissionName: updatedPermission.permissionName,
      description: updatedPermission.description,
      category: updatedPermission.category,
      isActive: updatedPermission.isActive,
      isWildcard: updatedPermission.isWildcard,
      createdAt: updatedPermission.createdAt,
      updatedAt: updatedPermission.updatedAt,
      stats: {
        roleCount: updatedPermission._count.roles
      }
    });

  } catch (error: any) {
    logger.error('Failed to update permission', {
      userId: req.user?.id,
      permissionId: req.params.id,
      changes: req.body,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to update permission',
      details: error.message
    });
  }
});

/**
 * DELETE /api/v1/admin/permissions/:id
 * Delete a permission (soft delete by setting isActive = false)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    // Check if permission exists
    const existingPermission = await prisma.permission.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            roles: true
          }
        }
      }
    });

    if (!existingPermission) {
      return res.status(404).json({
        error: 'Permission not found',
        details: `No permission found with ID: ${id}`
      });
    }

    // Check if permission is assigned to roles
    const roleCount = existingPermission._count.roles;
    if (roleCount > 0 && permanent === 'true') {
      return res.status(400).json({
        error: 'Cannot delete permission with active role assignments',
        details: `Permission is assigned to ${roleCount} roles. Remove assignments first or use soft delete.`
      });
    }

    if (permanent === 'true') {
      // Hard delete
      await prisma.permission.delete({
        where: { id }
      });

      logger.warn('Permission permanently deleted', {
        userId: req.user?.id,
        permissionId: id,
        permissionCode: existingPermission.permissionCode
      });

      res.json({
        message: 'Permission permanently deleted',
        permissionId: id,
        permissionCode: existingPermission.permissionCode
      });
    } else {
      // Soft delete (deactivate)
      const deactivatedPermission = await prisma.permission.update({
        where: { id },
        data: { isActive: false }
      });

      logger.info('Permission deactivated', {
        userId: req.user?.id,
        permissionId: id,
        permissionCode: deactivatedPermission.permissionCode,
        roleCount
      });

      res.json({
        message: 'Permission deactivated',
        permissionId: id,
        permissionCode: deactivatedPermission.permissionCode,
        roleCount
      });
    }

  } catch (error: any) {
    logger.error('Failed to delete permission', {
      userId: req.user?.id,
      permissionId: req.params.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to delete permission',
      details: error.message
    });
  }
});

export default router;