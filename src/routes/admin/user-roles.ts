/**
 * User-Role Assignment API - GitHub Issue #29
 *
 * Provides APIs for managing user role assignments (both global and site-specific)
 * Requires System Administrator role or admin.users permission
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
 * POST /api/v1/admin/user-roles/assign/global
 * Assign global roles to a user
 */
router.post('/assign/global', async (req: Request, res: Response) => {
  try {
    const { userId, roleIds, expiresAt } = req.body;

    // Validation
    if (!userId || !roleIds || !Array.isArray(roleIds)) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'userId and roleIds (array) are required'
      });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: `No user found with ID: ${userId}`
      });
    }

    // Verify all roles exist and are global
    const roles = await prisma.role.findMany({
      where: {
        id: { in: roleIds },
        isActive: true,
        isGlobal: true
      }
    });

    if (roles.length !== roleIds.length) {
      const foundIds = roles.map(r => r.id);
      const missingIds = roleIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({
        error: 'Some roles not found or not global',
        details: `Roles not found or not global: ${missingIds.join(', ')}`
      });
    }

    // Get existing assignments to avoid duplicates
    const existing = await prisma.userRole.findMany({
      where: {
        userId,
        roleId: { in: roleIds }
      }
    });

    const existingRoleIds = existing.map(ur => ur.roleId);
    const newRoleIds = roleIds.filter(id => !existingRoleIds.includes(id));

    if (newRoleIds.length === 0) {
      return res.status(409).json({
        error: 'All roles already assigned',
        details: 'All specified roles are already assigned to this user'
      });
    }

    // Create new assignments
    const assignments = await prisma.$transaction(
      newRoleIds.map(roleId =>
        prisma.userRole.create({
          data: {
            userId,
            roleId,
            assignedBy: req.user?.id || 'system',
            expiresAt: expiresAt ? new Date(expiresAt) : null
          },
          include: {
            role: {
              select: {
                roleCode: true,
                roleName: true
              }
            }
          }
        })
      )
    );

    logger.info('Global roles assigned to user', {
      adminUserId: req.user?.id,
      targetUserId: userId,
      targetUsername: user.username,
      assignedRoles: assignments.length,
      skippedRoles: existingRoleIds.length,
      newRoles: assignments.map(a => a.role.roleCode)
    });

    res.status(201).json({
      message: 'Global roles assigned successfully',
      userId,
      username: user.username,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      assignedRoles: assignments.map(a => ({
        roleId: a.roleId,
        roleCode: a.role.roleCode,
        roleName: a.role.roleName,
        assignedAt: a.assignedAt,
        assignedBy: a.assignedBy,
        expiresAt: a.expiresAt
      })),
      skippedRoles: existingRoleIds.length
    });

  } catch (error: any) {
    logger.error('Failed to assign global roles to user', {
      adminUserId: req.user?.id,
      requestData: req.body,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to assign global roles',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/admin/user-roles/assign/site
 * Assign site-specific roles to a user
 */
router.post('/assign/site', async (req: Request, res: Response) => {
  try {
    const { userId, siteId, roleIds, expiresAt } = req.body;

    // Validation
    if (!userId || !siteId || !roleIds || !Array.isArray(roleIds)) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'userId, siteId, and roleIds (array) are required'
      });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: `No user found with ID: ${userId}`
      });
    }

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        siteCode: true,
        siteName: true
      }
    });

    if (!site) {
      return res.status(404).json({
        error: 'Site not found',
        details: `No site found with ID: ${siteId}`
      });
    }

    // Verify all roles exist and are active
    const roles = await prisma.role.findMany({
      where: {
        id: { in: roleIds },
        isActive: true
      }
    });

    if (roles.length !== roleIds.length) {
      const foundIds = roles.map(r => r.id);
      const missingIds = roleIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({
        error: 'Some roles not found',
        details: `Roles not found: ${missingIds.join(', ')}`
      });
    }

    // Get existing assignments to avoid duplicates
    const existing = await prisma.userSiteRole.findMany({
      where: {
        userId,
        siteId,
        roleId: { in: roleIds }
      }
    });

    const existingRoleIds = existing.map(usr => usr.roleId);
    const newRoleIds = roleIds.filter(id => !existingRoleIds.includes(id));

    if (newRoleIds.length === 0) {
      return res.status(409).json({
        error: 'All roles already assigned',
        details: 'All specified roles are already assigned to this user for this site'
      });
    }

    // Create new assignments
    const assignments = await prisma.$transaction(
      newRoleIds.map(roleId =>
        prisma.userSiteRole.create({
          data: {
            userId,
            siteId,
            roleId,
            assignedBy: req.user?.id || 'system',
            expiresAt: expiresAt ? new Date(expiresAt) : null
          },
          include: {
            role: {
              select: {
                roleCode: true,
                roleName: true
              }
            }
          }
        })
      )
    );

    logger.info('Site-specific roles assigned to user', {
      adminUserId: req.user?.id,
      targetUserId: userId,
      targetUsername: user.username,
      siteId,
      siteCode: site.siteCode,
      assignedRoles: assignments.length,
      skippedRoles: existingRoleIds.length,
      newRoles: assignments.map(a => a.role.roleCode)
    });

    res.status(201).json({
      message: 'Site-specific roles assigned successfully',
      userId,
      username: user.username,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      site: {
        id: site.id,
        siteCode: site.siteCode,
        siteName: site.siteName
      },
      assignedRoles: assignments.map(a => ({
        roleId: a.roleId,
        roleCode: a.role.roleCode,
        roleName: a.role.roleName,
        assignedAt: a.assignedAt,
        assignedBy: a.assignedBy,
        expiresAt: a.expiresAt
      })),
      skippedRoles: existingRoleIds.length
    });

  } catch (error: any) {
    logger.error('Failed to assign site-specific roles to user', {
      adminUserId: req.user?.id,
      requestData: req.body,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to assign site-specific roles',
      details: error.message
    });
  }
});

/**
 * DELETE /api/v1/admin/user-roles/revoke/global
 * Revoke global roles from a user
 */
router.delete('/revoke/global', async (req: Request, res: Response) => {
  try {
    const { userId, roleIds } = req.body;

    // Validation
    if (!userId || !roleIds || !Array.isArray(roleIds)) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'userId and roleIds (array) are required'
      });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: `No user found with ID: ${userId}`
      });
    }

    // Find existing assignments
    const existing = await prisma.userRole.findMany({
      where: {
        userId,
        roleId: { in: roleIds }
      },
      include: {
        role: {
          select: {
            roleCode: true,
            roleName: true
          }
        }
      }
    });

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'No assignments found',
        details: 'None of the specified roles are assigned to this user'
      });
    }

    // Remove assignments
    const deleted = await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId: { in: roleIds }
      }
    });

    logger.info('Global roles revoked from user', {
      adminUserId: req.user?.id,
      targetUserId: userId,
      targetUsername: user.username,
      revokedRoles: deleted.count,
      revokedRoleCodes: existing.map(a => a.role.roleCode)
    });

    res.json({
      message: 'Global roles revoked successfully',
      userId,
      username: user.username,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      revokedRoles: existing.map(a => ({
        roleId: a.roleId,
        roleCode: a.role.roleCode,
        roleName: a.role.roleName
      })),
      revokedCount: deleted.count
    });

  } catch (error: any) {
    logger.error('Failed to revoke global roles from user', {
      adminUserId: req.user?.id,
      requestData: req.body,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to revoke global roles',
      details: error.message
    });
  }
});

/**
 * DELETE /api/v1/admin/user-roles/revoke/site
 * Revoke site-specific roles from a user
 */
router.delete('/revoke/site', async (req: Request, res: Response) => {
  try {
    const { userId, siteId, roleIds } = req.body;

    // Validation
    if (!userId || !siteId || !roleIds || !Array.isArray(roleIds)) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'userId, siteId, and roleIds (array) are required'
      });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: `No user found with ID: ${userId}`
      });
    }

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        siteCode: true,
        siteName: true
      }
    });

    if (!site) {
      return res.status(404).json({
        error: 'Site not found',
        details: `No site found with ID: ${siteId}`
      });
    }

    // Find existing assignments
    const existing = await prisma.userSiteRole.findMany({
      where: {
        userId,
        siteId,
        roleId: { in: roleIds }
      },
      include: {
        role: {
          select: {
            roleCode: true,
            roleName: true
          }
        }
      }
    });

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'No assignments found',
        details: 'None of the specified roles are assigned to this user for this site'
      });
    }

    // Remove assignments
    const deleted = await prisma.userSiteRole.deleteMany({
      where: {
        userId,
        siteId,
        roleId: { in: roleIds }
      }
    });

    logger.info('Site-specific roles revoked from user', {
      adminUserId: req.user?.id,
      targetUserId: userId,
      targetUsername: user.username,
      siteId,
      siteCode: site.siteCode,
      revokedRoles: deleted.count,
      revokedRoleCodes: existing.map(a => a.role.roleCode)
    });

    res.json({
      message: 'Site-specific roles revoked successfully',
      userId,
      username: user.username,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      site: {
        id: site.id,
        siteCode: site.siteCode,
        siteName: site.siteName
      },
      revokedRoles: existing.map(a => ({
        roleId: a.roleId,
        roleCode: a.role.roleCode,
        roleName: a.role.roleName
      })),
      revokedCount: deleted.count
    });

  } catch (error: any) {
    logger.error('Failed to revoke site-specific roles from user', {
      adminUserId: req.user?.id,
      requestData: req.body,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to revoke site-specific roles',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/admin/user-roles/:userId
 * Get all role assignments for a user (both global and site-specific)
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: `No user found with ID: ${userId}`
      });
    }

    // Get global role assignments
    const globalRoles = await prisma.userRole.findMany({
      where: { userId },
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
        assignedAt: 'desc'
      }
    });

    // Get site-specific role assignments
    const siteRoles = await prisma.userSiteRole.findMany({
      where: { userId },
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
        },
        site: {
          select: {
            id: true,
            siteCode: true,
            siteName: true
          }
        }
      },
      orderBy: [
        { site: { siteName: 'asc' } },
        { assignedAt: 'desc' }
      ]
    });

    // Group site roles by site
    const siteRolesBySite = siteRoles.reduce((acc, userSiteRole) => {
      const siteKey = userSiteRole.site.id;
      if (!acc[siteKey]) {
        acc[siteKey] = {
          site: userSiteRole.site,
          roles: []
        };
      }
      acc[siteKey].roles.push({
        roleId: userSiteRole.role.id,
        roleCode: userSiteRole.role.roleCode,
        roleName: userSiteRole.role.roleName,
        description: userSiteRole.role.description,
        isActive: userSiteRole.role.isActive,
        isGlobal: userSiteRole.role.isGlobal,
        assignedAt: userSiteRole.assignedAt,
        assignedBy: userSiteRole.assignedBy,
        expiresAt: userSiteRole.expiresAt
      });
      return acc;
    }, {} as Record<string, any>);

    logger.info('User role assignments retrieved', {
      adminUserId: req.user?.id,
      targetUserId: userId,
      targetUsername: user.username,
      globalRoleCount: globalRoles.length,
      siteRoleCount: siteRoles.length,
      uniqueSiteCount: Object.keys(siteRolesBySite).length
    });

    res.json({
      userId,
      username: user.username,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      globalRoles: globalRoles.map(ur => ({
        roleId: ur.role.id,
        roleCode: ur.role.roleCode,
        roleName: ur.role.roleName,
        description: ur.role.description,
        isActive: ur.role.isActive,
        isGlobal: ur.role.isGlobal,
        assignedAt: ur.assignedAt,
        assignedBy: ur.assignedBy,
        expiresAt: ur.expiresAt
      })),
      siteRoles: Object.values(siteRolesBySite),
      summary: {
        totalGlobalRoles: globalRoles.length,
        totalSiteRoles: siteRoles.length,
        uniqueSites: Object.keys(siteRolesBySite).length,
        totalRoleAssignments: globalRoles.length + siteRoles.length
      }
    });

  } catch (error: any) {
    logger.error('Failed to retrieve user role assignments', {
      adminUserId: req.user?.id,
      targetUserId: req.params.userId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve user role assignments',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/admin/user-roles
 * List all users with their role assignments (paginated)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search,
      page = '1',
      limit = '20'
    } = req.query;

    const filters: any = {};

    if (search) {
      filters.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: filters,
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          _count: {
            select: {
              userRoles: true,
              userSiteRoles: true
            }
          }
        },
        orderBy: { username: 'asc' },
        skip,
        take: limitNum
      }),
      prisma.user.count({ where: filters })
    ]);

    const response = {
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        roleAssignments: {
          globalRoles: user._count.userRoles,
          siteRoles: user._count.userSiteRoles,
          total: user._count.userRoles + user._count.userSiteRoles
        }
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };

    logger.info('User role assignment list retrieved', {
      adminUserId: req.user?.id,
      filters,
      resultCount: users.length,
      total
    });

    res.json(response);

  } catch (error: any) {
    logger.error('Failed to retrieve user role assignment list', {
      adminUserId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to retrieve user role assignment list',
      details: error.message
    });
  }
});

export default router;