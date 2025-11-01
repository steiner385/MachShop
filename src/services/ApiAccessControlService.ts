/**
 * ✅ GITHUB ISSUE #74: API Access Control & Security Model - Phase 1-2
 * API Access Control (RBAC) Service
 *
 * Handles:
 * - Role-based access control (RBAC) permission checking
 * - Scope-based access validation
 * - Permission inheritance and composition
 * - Endpoint-level authorization
 * - Permission caching for performance
 */

import { prisma } from '../lib/prisma';
import {
  ApiAction,
  ApiPermission,
  ApiRole,
  PermissionCheckResult,
  ScopeValidationResult,
} from '../types/security';
import { AppError } from '../middleware/errorHandler';

const PERMISSION_CACHE_TTL = 3600000; // 1 hour in milliseconds

interface CachedPermission {
  permissions: Set<string>;
  expiresAt: number;
}

/**
 * API Access Control Service
 * Manages permissions, roles, and access control checks
 */
export class ApiAccessControlService {
  private permissionCache = new Map<string, CachedPermission>();

  /**
   * Create a new permission
   */
  async createPermission(permission: {
    name: string;
    description?: string;
    scope: string;
    resource: string;
    action: ApiAction;
  }): Promise<ApiPermission> {
    // Check if permission already exists
    const existing = await prisma.apiPermission.findUnique({
      where: { name: permission.name },
    });

    if (existing) {
      throw new AppError(`Permission "${permission.name}" already exists`, 409);
    }

    const created = await prisma.apiPermission.create({
      data: {
        name: permission.name,
        description: permission.description,
        scope: permission.scope,
        resource: permission.resource,
        action: permission.action,
      },
    });

    // Clear cache
    this.permissionCache.clear();

    return created;
  }

  /**
   * Create a new role with permissions
   */
  async createRole(role: {
    name: string;
    description?: string;
    permissions: string[]; // Permission IDs
    isSystem?: boolean;
  }): Promise<ApiRole> {
    // Check if role already exists
    const existing = await prisma.apiRole.findUnique({
      where: { name: role.name },
    });

    if (existing) {
      throw new AppError(`Role "${role.name}" already exists`, 409);
    }

    // Verify all permissions exist
    const permissions = await prisma.apiPermission.findMany({
      where: {
        id: {
          in: role.permissions,
        },
      },
    });

    if (permissions.length !== role.permissions.length) {
      throw new AppError('One or more permissions do not exist', 400);
    }

    const created = await prisma.apiRole.create({
      data: {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem || false,
      },
    });

    // Create junction table entries
    await Promise.all(
      role.permissions.map(permissionId =>
        prisma.apiRolePermission.create({
          data: {
            roleId: created.id,
            permissionId,
          },
        })
      )
    );

    // Clear cache
    this.permissionCache.clear();

    return created;
  }

  /**
   * Create default system roles if they don't exist
   */
  async initializeDefaultRoles(): Promise<void> {
    // Define default roles
    const defaultRoles = [
      {
        name: 'Admin',
        description: 'Full API access and administration',
        action: 'ADMIN',
      },
      {
        name: 'Developer',
        description: 'Read and write access for development',
        action: 'WRITE',
      },
      {
        name: 'Integration',
        description: 'Limited access for third-party integrations',
        action: 'READ',
      },
      {
        name: 'ReadOnly',
        description: 'Read-only access',
        action: 'READ',
      },
    ];

    for (const roleConfig of defaultRoles) {
      const existing = await prisma.apiRole.findUnique({
        where: { name: roleConfig.name },
      });

      if (!existing) {
        // Get all permissions that match the action level
        const permissions = await prisma.apiPermission.findMany({
          where: {
            action: roleConfig.action,
          },
        });

        await this.createRole({
          name: roleConfig.name,
          description: roleConfig.description,
          permissions: permissions.map(p => p.id),
          isSystem: true,
        });
      }
    }
  }

  /**
   * Assign a role to an API key
   */
  async assignRoleToKey(
    apiKeyId: string,
    roleId: string,
    grantedBy: string,
  ): Promise<void> {
    // Verify key exists
    const key = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!key) {
      throw new AppError('API key not found', 404);
    }

    // Verify role exists
    const role = await prisma.apiRole.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // Check if already assigned
    const existing = await prisma.apiKeyRole.findUnique({
      where: {
        apiKeyId_roleId: {
          apiKeyId,
          roleId,
        },
      },
    });

    if (existing) {
      throw new AppError('Role already assigned to this key', 409);
    }

    await prisma.apiKeyRole.create({
      data: {
        apiKeyId,
        roleId,
        grantedBy,
      },
    });

    // Clear cache
    this.permissionCache.delete(apiKeyId);
  }

  /**
   * Remove a role from an API key
   */
  async removeRoleFromKey(apiKeyId: string, roleId: string): Promise<void> {
    await prisma.apiKeyRole.delete({
      where: {
        apiKeyId_roleId: {
          apiKeyId,
          roleId,
        },
      },
    });

    // Clear cache
    this.permissionCache.delete(apiKeyId);
  }

  /**
   * Get all permissions for an API key (cached)
   */
  private async getKeyPermissions(apiKeyId: string): Promise<Set<string>> {
    // Check cache first
    const cached = this.permissionCache.get(apiKeyId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    // Fetch from database
    const keyRoles = await prisma.apiKeyRole.findMany({
      where: { apiKeyId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();

    for (const keyRole of keyRoles) {
      for (const rolePermission of keyRole.role.rolePermissions) {
        permissions.add(rolePermission.permission.scope);
      }
    }

    // Cache the result
    this.permissionCache.set(apiKeyId, {
      permissions,
      expiresAt: Date.now() + PERMISSION_CACHE_TTL,
    });

    return permissions;
  }

  /**
   * Check if an API key has a specific permission
   */
  async checkPermission(
    apiKeyId: string,
    requiredScope: string,
  ): Promise<PermissionCheckResult> {
    try {
      const permissions = await this.getKeyPermissions(apiKeyId);

      // Check for exact match or wildcard
      const hasPermission =
        permissions.has(requiredScope) || permissions.has('*') || permissions.has('admin');

      if (!hasPermission) {
        return {
          allowed: false,
          reason: `Permission "${requiredScope}" is required`,
          requiredPermission: requiredScope,
        };
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: 'Permission check failed',
      };
    }
  }

  /**
   * Validate scopes for an API key
   */
  async validateScopes(
    apiKeyId: string,
    requiredScopes: string[],
  ): Promise<ScopeValidationResult> {
    try {
      const permissions = await this.getKeyPermissions(apiKeyId);

      const missingScopes: string[] = [];

      for (const scope of requiredScopes) {
        if (
          !permissions.has(scope) &&
          !permissions.has('*') &&
          !permissions.has('admin')
        ) {
          missingScopes.push(scope);
        }
      }

      if (missingScopes.length > 0) {
        return {
          valid: false,
          reason: `Missing required scopes: ${missingScopes.join(', ')}`,
          missingScopes,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: 'Scope validation failed',
      };
    }
  }

  /**
   * Get all permissions
   */
  async listPermissions(limit: number = 100, offset: number = 0): Promise<{
    permissions: ApiPermission[];
    total: number;
  }> {
    const [permissions, total] = await Promise.all([
      prisma.apiPermission.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.apiPermission.count(),
    ]);

    return { permissions, total };
  }

  /**
   * Get all roles
   */
  async listRoles(limit: number = 100, offset: number = 0): Promise<{
    roles: ApiRole[];
    total: number;
  }> {
    const [roles, total] = await Promise.all([
      prisma.apiRole.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.apiRole.count(),
    ]);

    return { roles, total };
  }

  /**
   * Get a role with its permissions
   */
  async getRoleWithPermissions(roleId: string): Promise<any> {
    const role = await prisma.apiRole.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return null;
    }

    return {
      ...role,
      permissions: role.rolePermissions.map(rp => rp.permission),
    };
  }

  /**
   * Update a role's permissions
   */
  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<ApiRole> {
    // Verify role exists and is not a system role
    const role = await prisma.apiRole.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    if (role.isSystem) {
      throw new AppError('Cannot modify system roles', 403);
    }

    // Remove old permissions
    await prisma.apiRolePermission.deleteMany({
      where: { roleId },
    });

    // Add new permissions
    await Promise.all(
      permissionIds.map(permissionId =>
        prisma.apiRolePermission.create({
          data: {
            roleId,
            permissionId,
          },
        })
      )
    );

    // Update role
    const updated = await prisma.apiRole.update({
      where: { id: roleId },
      data: {
        permissions: permissionIds,
      },
    });

    // Clear cache for all keys with this role
    const keysWithRole = await prisma.apiKeyRole.findMany({
      where: { roleId },
    });

    keysWithRole.forEach(kr => {
      this.permissionCache.delete(kr.apiKeyId);
    });

    return updated;
  }

  /**
   * Delete a role (only custom roles)
   */
  async deleteRole(roleId: string): Promise<void> {
    const role = await prisma.apiRole.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    if (role.isSystem) {
      throw new AppError('Cannot delete system roles', 403);
    }

    // Check if role is assigned to any keys
    const assignmentCount = await prisma.apiKeyRole.count({
      where: { roleId },
    });

    if (assignmentCount > 0) {
      throw new AppError('Cannot delete role that is assigned to API keys', 409);
    }

    await prisma.apiRole.delete({
      where: { id: roleId },
    });

    this.permissionCache.clear();
  }

  /**
   * Clear permission cache (useful for testing)
   */
  clearCache(): void {
    this.permissionCache.clear();
  }
}

export const accessControlService = new ApiAccessControlService();
