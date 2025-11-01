/**
 * Permission Resolution Service - GitHub Issue #29
 *
 * Provides database-driven permission resolution with wildcard support
 * Replaces hard-coded role/permission arrays with dynamic RBAC system
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Cache for permission lookups to improve performance
const permissionCache = new Map<string, { permissions: string[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Resolved user permissions including wildcard expansions
 */
export interface ResolvedPermissions {
  globalRoles: string[];
  siteRoles: Array<{ siteId: string; roles: string[] }>;
  permissions: string[];
  wildcardPermissions: string[];
  isSystemAdmin: boolean;
  // Temporal permissions context
  temporalRoles: Array<{
    roleId: string;
    roleName: string;
    siteId?: string;
    isTemporary: boolean;
    grantReason?: string;
    validFrom?: Date;
    expiresAt?: Date;
  }>;
}

/**
 * Clear permission cache for a user
 */
export function clearUserPermissionCache(userId: string): void {
  permissionCache.delete(`user:${userId}`);
  permissionCache.delete(`user:${userId}:global`);

  // Clear site-specific caches
  const keysToDelete: string[] = [];
  permissionCache.forEach((value, key) => {
    if (key.startsWith(`user:${userId}:site:`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => permissionCache.delete(key));
}

/**
 * Clear all permission caches
 */
export function clearAllPermissionCaches(): void {
  permissionCache.clear();
}

/**
 * Get all available permissions from database
 */
export async function getAllPermissions(): Promise<string[]> {
  try {
    const permissions = await prisma.permission.findMany({
      where: { isActive: true },
      select: { permissionCode: true },
      orderBy: { permissionCode: 'asc' }
    });

    return permissions.map(p => p.permissionCode);
  } catch (error: any) {
    logger.error('Failed to fetch all permissions', { error: error.message });
    return [];
  }
}

/**
 * Expand wildcard permissions to specific permissions
 */
export async function expandWildcardPermissions(wildcardPermissions: string[]): Promise<string[]> {
  if (wildcardPermissions.length === 0) {
    return [];
  }

  const expandedPermissions = new Set<string>();

  for (const wildcardPerm of wildcardPermissions) {
    if (wildcardPerm === '*') {
      // Global wildcard - includes ALL permissions
      const allPermissions = await getAllPermissions();
      allPermissions.forEach(p => expandedPermissions.add(p));
    } else if (wildcardPerm.endsWith('.*')) {
      // Category wildcard (e.g., "workorders.*")
      const category = wildcardPerm.replace('.*', '');

      try {
        const categoryPermissions = await prisma.permission.findMany({
          where: {
            isActive: true,
            OR: [
              { permissionCode: { startsWith: `${category}.` } },
              { category: category }
            ]
          },
          select: { permissionCode: true }
        });

        categoryPermissions.forEach(p => expandedPermissions.add(p.permissionCode));
      } catch (error: any) {
        logger.error('Failed to expand wildcard permission', {
          wildcardPerm,
          error: error.message
        });
      }
    } else {
      // Not a wildcard, add as-is
      expandedPermissions.add(wildcardPerm);
    }
  }

  return Array.from(expandedPermissions);
}

/**
 * Resolve user permissions from database (global and site-specific)
 */
export async function resolveUserPermissions(
  userId: string,
  siteId?: string
): Promise<ResolvedPermissions> {
  const cacheKey = siteId ? `user:${userId}:site:${siteId}` : `user:${userId}:global`;

  // Check cache first
  const cached = permissionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return {
      globalRoles: [],
      siteRoles: [],
      permissions: cached.permissions,
      wildcardPermissions: [],
      isSystemAdmin: cached.permissions.includes('*'),
      temporalRoles: [] // Cache doesn't store temporal context for simplicity
    };
  }

  try {
    // Get global role assignments with temporal validation
    const now = new Date();
    const globalRoleAssignments = await prisma.userRole.findMany({
      where: {
        userId,
        AND: [
          // Role must be active (not expired)
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          },
          // Role must have started (validFrom check)
          {
            OR: [
              { validFrom: null },
              { validFrom: { lte: now } }
            ]
          }
        ]
      },
      include: {
        role: {
          select: {
            roleCode: true,
            roleName: true,
            isActive: true,
            permissions: {
              include: {
                permission: {
                  select: {
                    permissionCode: true,
                    isWildcard: true,
                    isActive: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Get site-specific role assignments with temporal validation
    const siteRoleAssignments = siteId ? await prisma.userSiteRole.findMany({
      where: {
        userId,
        siteId,
        AND: [
          // Role must be active (not expired)
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } }
            ]
          },
          // Role must have started (validFrom check)
          {
            OR: [
              { validFrom: null },
              { validFrom: { lte: now } }
            ]
          }
        ]
      },
      include: {
        role: {
          select: {
            roleCode: true,
            roleName: true,
            isActive: true,
            permissions: {
              include: {
                permission: {
                  select: {
                    permissionCode: true,
                    isWildcard: true,
                    isActive: true
                  }
                }
              }
            }
          }
        },
        site: {
          select: {
            id: true,
            siteCode: true
          }
        }
      }
    }) : [];

    // Collect all permissions and roles
    const globalRoles: string[] = [];
    const siteRoles: Array<{ siteId: string; roles: string[] }> = [];
    const allPermissions = new Set<string>();
    const wildcardPermissions = new Set<string>();
    const temporalRoles: Array<{
      roleId: string;
      roleName: string;
      siteId?: string;
      isTemporary: boolean;
      grantReason?: string;
      validFrom?: Date;
      expiresAt?: Date;
    }> = [];

    // Process global roles
    for (const assignment of globalRoleAssignments) {
      if (assignment.role.isActive) {
        globalRoles.push(assignment.role.roleName);

        // Collect temporal role information
        temporalRoles.push({
          roleId: assignment.roleId,
          roleName: assignment.role.roleName,
          isTemporary: assignment.isTemporary,
          grantReason: assignment.grantReason || undefined,
          validFrom: assignment.validFrom || undefined,
          expiresAt: assignment.expiresAt || undefined
        });

        // Add permissions from this role
        for (const rolePermission of assignment.role.permissions) {
          const perm = rolePermission.permission;
          if (perm.isActive) {
            if (perm.isWildcard) {
              wildcardPermissions.add(perm.permissionCode);
            } else {
              allPermissions.add(perm.permissionCode);
            }
          }
        }
      }
    }

    // Process site-specific roles
    const siteRoleMap = new Map<string, string[]>();
    for (const assignment of siteRoleAssignments) {
      if (assignment.role.isActive) {
        const siteId = assignment.site.id;
        if (!siteRoleMap.has(siteId)) {
          siteRoleMap.set(siteId, []);
        }
        siteRoleMap.get(siteId)!.push(assignment.role.roleName);

        // Collect temporal role information for site roles
        temporalRoles.push({
          roleId: assignment.roleId,
          roleName: assignment.role.roleName,
          siteId: siteId,
          isTemporary: assignment.isTemporary,
          grantReason: assignment.grantReason || undefined,
          validFrom: assignment.validFrom || undefined,
          expiresAt: assignment.expiresAt || undefined
        });

        // Add permissions from this role
        for (const rolePermission of assignment.role.permissions) {
          const perm = rolePermission.permission;
          if (perm.isActive) {
            if (perm.isWildcard) {
              wildcardPermissions.add(perm.permissionCode);
            } else {
              allPermissions.add(perm.permissionCode);
            }
          }
        }
      }
    }

    // Convert site role map to array
    siteRoleMap.forEach((roles, siteId) => {
      siteRoles.push({ siteId, roles });
    });

    // Expand wildcard permissions
    const expandedPermissions = await expandWildcardPermissions(Array.from(wildcardPermissions));
    expandedPermissions.forEach(p => allPermissions.add(p));

    const finalPermissions = Array.from(allPermissions);
    const isSystemAdmin = wildcardPermissions.has('*') || globalRoles.includes('System Administrator');

    // Cache the result
    permissionCache.set(cacheKey, {
      permissions: finalPermissions,
      timestamp: Date.now()
    });

    logger.debug('User permissions resolved', {
      userId,
      siteId,
      globalRoleCount: globalRoles.length,
      siteRoleCount: siteRoles.length,
      permissionCount: finalPermissions.length,
      wildcardCount: wildcardPermissions.size,
      isSystemAdmin
    });

    return {
      globalRoles,
      siteRoles,
      permissions: finalPermissions,
      wildcardPermissions: Array.from(wildcardPermissions),
      isSystemAdmin,
      temporalRoles
    };

  } catch (error: any) {
    logger.error('Failed to resolve user permissions', {
      userId,
      siteId,
      error: error.message,
      stack: error.stack
    });

    // Return empty permissions on error
    return {
      globalRoles: [],
      siteRoles: [],
      permissions: [],
      wildcardPermissions: [],
      isSystemAdmin: false,
      temporalRoles: []
    };
  }
}

/**
 * Check if user has specific permission (with wildcard support)
 */
export async function hasPermission(
  userId: string,
  permission: string,
  siteId?: string
): Promise<boolean> {
  try {
    const resolved = await resolveUserPermissions(userId, siteId);

    // Check for exact permission match
    if (resolved.permissions.includes(permission)) {
      return true;
    }

    // Check for wildcard matches
    if (resolved.wildcardPermissions.includes('*')) {
      return true; // Global admin
    }

    // Check category wildcards
    const permissionParts = permission.split('.');
    if (permissionParts.length >= 2) {
      const category = permissionParts[0];
      if (resolved.wildcardPermissions.includes(`${category}.*`)) {
        return true;
      }
    }

    return false;
  } catch (error: any) {
    logger.error('Permission check failed', {
      userId,
      permission,
      siteId,
      error: error.message
    });
    return false;
  }
}

/**
 * Check if user has any of the specified roles
 */
export async function hasRole(
  userId: string,
  roles: string | string[],
  siteId?: string
): Promise<boolean> {
  try {
    const resolved = await resolveUserPermissions(userId, siteId);
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];

    // Check global roles
    const hasGlobalRole = rolesToCheck.some(role => resolved.globalRoles.includes(role));
    if (hasGlobalRole) {
      return true;
    }

    // Check site-specific roles
    if (siteId) {
      const siteRoleData = resolved.siteRoles.find(sr => sr.siteId === siteId);
      if (siteRoleData) {
        const hasSiteRole = rolesToCheck.some(role => siteRoleData.roles.includes(role));
        if (hasSiteRole) {
          return true;
        }
      }
    }

    return false;
  } catch (error: any) {
    logger.error('Role check failed', {
      userId,
      roles,
      siteId,
      error: error.message
    });
    return false;
  }
}

/**
 * Batch permission check for multiple permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissions: string[],
  siteId?: string
): Promise<boolean> {
  try {
    const resolved = await resolveUserPermissions(userId, siteId);

    // System admin has all permissions
    if (resolved.isSystemAdmin) {
      return true;
    }

    // Check each permission
    for (const permission of permissions) {
      const hasExactPermission = resolved.permissions.includes(permission);

      if (!hasExactPermission) {
        // Check wildcard matches
        const permissionParts = permission.split('.');
        if (permissionParts.length >= 2) {
          const category = permissionParts[0];
          const hasCategoryWildcard = resolved.wildcardPermissions.includes(`${category}.*`);
          if (!hasCategoryWildcard) {
            return false;
          }
        } else {
          return false;
        }
      }
    }

    return true;
  } catch (error: any) {
    logger.error('Batch permission check failed', {
      userId,
      permissions,
      siteId,
      error: error.message
    });
    return false;
  }
}

/**
 * Get user's effective permissions for debugging/display
 */
export async function getUserEffectivePermissions(userId: string, siteId?: string) {
  return await resolveUserPermissions(userId, siteId);
}

/**
 * Validate temporal permissions at specific point in time
 */
export async function resolveUserPermissionsAtTime(
  userId: string,
  effectiveDate: Date,
  siteId?: string
): Promise<ResolvedPermissions> {
  const cacheKey = `${userId}:${effectiveDate.getTime()}:${siteId || 'global'}`;

  try {
    // Get global role assignments valid at specific time
    const globalRoleAssignments = await prisma.userRole.findMany({
      where: {
        userId,
        AND: [
          // Role must be active at effective date (not expired)
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: effectiveDate } }
            ]
          },
          // Role must have started by effective date
          {
            OR: [
              { validFrom: null },
              { validFrom: { lte: effectiveDate } }
            ]
          }
        ]
      },
      include: {
        role: {
          select: {
            roleCode: true,
            roleName: true,
            isActive: true,
            permissions: {
              include: {
                permission: {
                  select: {
                    permissionCode: true,
                    isWildcard: true,
                    isActive: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Get site-specific role assignments valid at specific time
    const siteRoleAssignments = siteId ? await prisma.userSiteRole.findMany({
      where: {
        userId,
        siteId,
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: effectiveDate } }
            ]
          },
          {
            OR: [
              { validFrom: null },
              { validFrom: { lte: effectiveDate } }
            ]
          }
        ]
      },
      include: {
        role: {
          select: {
            roleCode: true,
            roleName: true,
            isActive: true,
            permissions: {
              include: {
                permission: {
                  select: {
                    permissionCode: true,
                    isWildcard: true,
                    isActive: true
                  }
                }
              }
            }
          }
        },
        site: {
          select: {
            id: true,
            siteCode: true
          }
        }
      }
    }) : [];

    // Process assignments similar to main function
    const globalRoles: string[] = [];
    const siteRoles: Array<{ siteId: string; roles: string[] }> = [];
    const allPermissions = new Set<string>();
    const wildcardPermissions = new Set<string>();
    const temporalRoles: Array<{
      roleId: string;
      roleName: string;
      siteId?: string;
      isTemporary: boolean;
      grantReason?: string;
      validFrom?: Date;
      expiresAt?: Date;
    }> = [];

    // Process global roles
    for (const assignment of globalRoleAssignments) {
      if (assignment.role.isActive) {
        globalRoles.push(assignment.role.roleName);

        temporalRoles.push({
          roleId: assignment.roleId,
          roleName: assignment.role.roleName,
          isTemporary: assignment.isTemporary,
          grantReason: assignment.grantReason || undefined,
          validFrom: assignment.validFrom || undefined,
          expiresAt: assignment.expiresAt || undefined
        });

        for (const rolePermission of assignment.role.permissions) {
          const perm = rolePermission.permission;
          if (perm.isActive) {
            if (perm.isWildcard) {
              wildcardPermissions.add(perm.permissionCode);
            } else {
              allPermissions.add(perm.permissionCode);
            }
          }
        }
      }
    }

    // Process site-specific roles
    const siteRoleMap = new Map<string, string[]>();
    for (const assignment of siteRoleAssignments) {
      if (assignment.role.isActive) {
        const siteId = assignment.site.id;
        if (!siteRoleMap.has(siteId)) {
          siteRoleMap.set(siteId, []);
        }
        siteRoleMap.get(siteId)!.push(assignment.role.roleName);

        temporalRoles.push({
          roleId: assignment.roleId,
          roleName: assignment.role.roleName,
          siteId: siteId,
          isTemporary: assignment.isTemporary,
          grantReason: assignment.grantReason || undefined,
          validFrom: assignment.validFrom || undefined,
          expiresAt: assignment.expiresAt || undefined
        });

        for (const rolePermission of assignment.role.permissions) {
          const perm = rolePermission.permission;
          if (perm.isActive) {
            if (perm.isWildcard) {
              wildcardPermissions.add(perm.permissionCode);
            } else {
              allPermissions.add(perm.permissionCode);
            }
          }
        }
      }
    }

    // Convert site role map to array
    siteRoleMap.forEach((roles, siteId) => {
      siteRoles.push({ siteId, roles });
    });

    // Expand wildcard permissions
    const expandedPermissions = await expandWildcardPermissions(Array.from(wildcardPermissions));
    expandedPermissions.forEach(p => allPermissions.add(p));

    const finalPermissions = Array.from(allPermissions);
    const isSystemAdmin = wildcardPermissions.has('*') || globalRoles.includes('System Administrator');

    return {
      globalRoles,
      siteRoles,
      permissions: finalPermissions,
      wildcardPermissions: Array.from(wildcardPermissions),
      isSystemAdmin,
      temporalRoles
    };

  } catch (error: any) {
    logger.error('Failed to resolve user permissions at time', {
      userId,
      siteId,
      effectiveDate,
      error: error.message
    });

    return {
      globalRoles: [],
      siteRoles: [],
      permissions: [],
      wildcardPermissions: [],
      isSystemAdmin: false,
      temporalRoles: []
    };
  }
}

/**
 * Get all temporal role assignments for a user (expired, active, and future)
 */
export async function getUserTemporalRoles(userId: string, siteId?: string) {
  try {
    const whereClause = siteId ? { userId, siteId } : { userId };

    const [globalRoles, siteRoles] = await Promise.all([
      // Global roles
      siteId ? Promise.resolve([]) : prisma.userRole.findMany({
        where: whereClause,
        include: {
          role: {
            select: {
              roleCode: true,
              roleName: true,
              isActive: true
            }
          }
        },
        orderBy: [
          { assignedAt: 'desc' }
        ]
      }),

      // Site-specific roles
      siteId ? prisma.userSiteRole.findMany({
        where: whereClause,
        include: {
          role: {
            select: {
              roleCode: true,
              roleName: true,
              isActive: true
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
          { assignedAt: 'desc' }
        ]
      }) : Promise.resolve([])
    ]);

    const now = new Date();

    return {
      globalRoles: globalRoles.map(assignment => ({
        ...assignment,
        status: getTemporalRoleStatus(assignment, now),
        isActive: isTemporalRoleActive(assignment, now)
      })),
      siteRoles: siteRoles.map(assignment => ({
        ...assignment,
        status: getTemporalRoleStatus(assignment, now),
        isActive: isTemporalRoleActive(assignment, now)
      }))
    };

  } catch (error: any) {
    logger.error('Failed to get user temporal roles', {
      userId,
      siteId,
      error: error.message
    });
    return { globalRoles: [], siteRoles: [] };
  }
}

/**
 * Determine the status of a temporal role assignment
 */
function getTemporalRoleStatus(
  assignment: { validFrom?: Date | null; expiresAt?: Date | null },
  currentTime: Date = new Date()
): 'pending' | 'active' | 'expired' {
  const validFrom = assignment.validFrom;
  const expiresAt = assignment.expiresAt;

  if (expiresAt && currentTime > expiresAt) {
    return 'expired';
  }

  if (validFrom && currentTime < validFrom) {
    return 'pending';
  }

  return 'active';
}

/**
 * Check if a temporal role assignment is currently active
 */
function isTemporalRoleActive(
  assignment: { validFrom?: Date | null; expiresAt?: Date | null },
  currentTime: Date = new Date()
): boolean {
  return getTemporalRoleStatus(assignment, currentTime) === 'active';
}