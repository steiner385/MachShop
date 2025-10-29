/**
 * Role-Permission Assignment API - GitHub Issue #29
 *
 * Provides APIs for managing permission assignments to roles
 * Requires System Administrator role or admin.roles permission
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
 * POST /api/v1/admin/role-permissions/assign
 * Assign permissions to a role
 */
router.post('/assign', async (req: Request, res: Response) => {
  try {
    const { roleId, permissionIds } = req.body;

    // Validation
    if (!roleId || !permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'roleId and permissionIds (array) are required'
      });
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return res.status(404).json({
        error: 'Role not found',
        details: `No role found with ID: ${roleId}`
      });
    }

    // Verify all permissions exist
    const permissions = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
        isActive: true
      }
    });

    if (permissions.length !== permissionIds.length) {
      const foundIds = permissions.map(p => p.id);
      const missingIds = permissionIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({
        error: 'Some permissions not found',
        details: `Permissions not found: ${missingIds.join(', ')}`
      });
    }

    // Get existing assignments to avoid duplicates
    const existing = await prisma.rolePermission.findMany({
      where: {
        roleId,
        permissionId: { in: permissionIds }
      }
    });

    const existingPermissionIds = existing.map(rp => rp.permissionId);
    const newPermissionIds = permissionIds.filter(id => !existingPermissionIds.includes(id));

    if (newPermissionIds.length === 0) {
      return res.status(409).json({
        error: 'All permissions already assigned',
        details: 'All specified permissions are already assigned to this role'
      });
    }

    // Create new assignments
    const assignments = await prisma.$transaction(
      newPermissionIds.map(permissionId =>
        prisma.rolePermission.create({
          data: {
            roleId,
            permissionId,
            grantedBy: req.user?.id || 'system'
          },
          include: {
            permission: {
              select: {
                permissionCode: true,
                permissionName: true
              }
            }
          }
        })
      )
    );

    logger.info('Permissions assigned to role', {
      userId: req.user?.id,
      roleId,
      roleName: role.roleName,
      assignedPermissions: assignments.length,
      skippedPermissions: existingPermissionIds.length,
      newPermissions: assignments.map(a => a.permission.permissionCode)
    });

    res.status(201).json({
      message: 'Permissions assigned successfully',
      roleId,
      roleName: role.roleName,
      assignedPermissions: assignments.map(a => ({
        permissionId: a.permissionId,
        permissionCode: a.permission.permissionCode,
        permissionName: a.permission.permissionName,
        grantedAt: a.grantedAt,
        grantedBy: a.grantedBy
      })),
      skippedPermissions: existingPermissionIds.length
    });

  } catch (error: any) {
    logger.error('Failed to assign permissions to role', {
      userId: req.user?.id,
      requestData: req.body,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to assign permissions',
      details: error.message
    });
  }
});

/**
 * DELETE /api/v1/admin/role-permissions/revoke
 * Revoke permissions from a role
 */
router.delete('/revoke', async (req: Request, res: Response) => {
  try {
    const { roleId, permissionIds } = req.body;

    // Validation
    if (!roleId || !permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'roleId and permissionIds (array) are required'
      });
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return res.status(404).json({
        error: 'Role not found',
        details: `No role found with ID: ${roleId}`
      });
    }

    // Find existing assignments
    const existing = await prisma.rolePermission.findMany({
      where: {
        roleId,
        permissionId: { in: permissionIds }
      },
      include: {
        permission: {
          select: {
            permissionCode: true,
            permissionName: true
          }
        }
      }
    });

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'No assignments found',
        details: 'None of the specified permissions are assigned to this role'
      });
    }

    // Remove assignments
    const deleted = await prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId: { in: permissionIds }
      }
    });

    logger.info('Permissions revoked from role', {
      userId: req.user?.id,
      roleId,
      roleName: role.roleName,
      revokedPermissions: deleted.count,
      revokedPermissionCodes: existing.map(a => a.permission.permissionCode)
    });

    res.json({
      message: 'Permissions revoked successfully',
      roleId,
      roleName: role.roleName,
      revokedPermissions: existing.map(a => ({
        permissionId: a.permissionId,
        permissionCode: a.permission.permissionCode,
        permissionName: a.permission.permissionName
      })),
      revokedCount: deleted.count
    });

  } catch (error: any) {
    logger.error('Failed to revoke permissions from role', {
      userId: req.user?.id,
      requestData: req.body,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to revoke permissions',
      details: error.message
    });
  }
});

/**
 * PUT /api/v1/admin/role-permissions/:roleId
 * Set the complete list of permissions for a role (replaces all existing)
 */
router.put('/:roleId', async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    // Validation
    if (!permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'permissionIds (array) is required'
      });
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return res.status(404).json({
        error: 'Role not found',
        details: `No role found with ID: ${roleId}`
      });
    }

    // Verify all permissions exist
    const permissions = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
        isActive: true
      }
    });

    if (permissions.length !== permissionIds.length) {
      const foundIds = permissions.map(p => p.id);
      const missingIds = permissionIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({
        error: 'Some permissions not found',
        details: `Permissions not found: ${missingIds.join(', ')}`
      });
    }

    // Get current assignments
    const currentAssignments = await prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: {
          select: {
            permissionCode: true,
            permissionName: true
          }
        }
      }
    });

    // Replace all permissions in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing assignments
      await tx.rolePermission.deleteMany({
        where: { roleId }
      });

      // Create new assignments
      const newAssignments = await Promise.all(
        permissionIds.map(permissionId =>
          tx.rolePermission.create({
            data: {
              roleId,
              permissionId,
              grantedBy: req.user?.id || 'system'
            },
            include: {
              permission: {
                select: {
                  permissionCode: true,
                  permissionName: true
                }
              }
            }
          })
        )
      );

      return newAssignments;
    });

    logger.info('Role permissions replaced', {
      userId: req.user?.id,
      roleId,
      roleName: role.roleName,
      previousCount: currentAssignments.length,
      newCount: result.length,
      previousPermissions: currentAssignments.map(a => a.permission.permissionCode),
      newPermissions: result.map(a => a.permission.permissionCode)
    });

    res.json({
      message: 'Role permissions updated successfully',
      roleId,
      roleName: role.roleName,
      previousPermissionCount: currentAssignments.length,
      newPermissionCount: result.length,
      permissions: result.map(a => ({
        permissionId: a.permissionId,
        permissionCode: a.permission.permissionCode,
        permissionName: a.permission.permissionName,
        grantedAt: a.grantedAt,
        grantedBy: a.grantedBy
      }))
    });

  } catch (error: any) {
    logger.error('Failed to update role permissions', {
      userId: req.user?.id,
      roleId: req.params.roleId,
      requestData: req.body,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to update role permissions',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/admin/role-permissions/:roleId
 * Get all permissions assigned to a role
 */
router.get('/:roleId', async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return res.status(404).json({
        error: 'Role not found',
        details: `No role found with ID: ${roleId}`
      });
    }

    // Get role permissions
    const assignments = await prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: {
          select: {
            id: true,
            permissionCode: true,
            permissionName: true,
            description: true,
            category: true,
            isWildcard: true,
            isActive: true
          }
        }
      },
      orderBy: {
        permission: {
          permissionCode: 'asc'
        }
      }
    });

    // Group permissions by category
    const permissionsByCategory = assignments.reduce((acc, assignment) => {
      const category = assignment.permission.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        permissionId: assignment.permission.id,
        permissionCode: assignment.permission.permissionCode,
        permissionName: assignment.permission.permissionName,
        description: assignment.permission.description,
        isWildcard: assignment.permission.isWildcard,
        isActive: assignment.permission.isActive,
        grantedAt: assignment.grantedAt,
        grantedBy: assignment.grantedBy
      });
      return acc;
    }, {} as Record<string, any[]>);

    logger.info('Role permissions retrieved', {
      userId: req.user?.id,
      roleId,
      roleName: role.roleName,
      permissionCount: assignments.length
    });

    res.json({
      roleId,
      roleName: role.roleName,
      roleCode: role.roleCode,
      permissionCount: assignments.length,
      permissions: assignments.map(a => ({
        permissionId: a.permission.id,
        permissionCode: a.permission.permissionCode,
        permissionName: a.permission.permissionName,
        description: a.permission.description,
        category: a.permission.category,
        isWildcard: a.permission.isWildcard,
        isActive: a.permission.isActive,
        grantedAt: a.grantedAt,
        grantedBy: a.grantedBy
      })),
      permissionsByCategory
    });

  } catch (error: any) {
    logger.error('Failed to retrieve role permissions', {
      userId: req.user?.id,
      roleId: req.params.roleId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve role permissions',
      details: error.message
    });
  }
});

export default router;