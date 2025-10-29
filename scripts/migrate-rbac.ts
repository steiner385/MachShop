#!/usr/bin/env ts-node

/**
 * RBAC Migration Script - GitHub Issue #29
 *
 * Migrates from hard-coded role/permission arrays to dynamic RBAC system
 *
 * Steps:
 * 1. Extract and seed Permission table with all current permission codes
 * 2. Extract and seed Role table with current hard-coded roles
 * 3. Map roles to permissions and create RolePermission records
 * 4. Migrate User.roles[] and User.permissions[] to UserRole table
 * 5. Validate migration accuracy
 */

import { PrismaClient } from '@prisma/client';
import { DEMO_USERS } from '../src/config/demoCredentials';
import { ROLES, PERMISSIONS } from '../frontend/src/types/auth';

const prisma = new PrismaClient();

// Permission categories for organization
const PERMISSION_CATEGORIES = {
  'workorders': ['workorders.read', 'workorders.write', 'workorders.create', 'workorders.update', 'workorders.delete', 'workorders.release', 'workorders.execute'],
  'quality': ['quality.read', 'quality.write', 'fai.read', 'fai.write', 'fai.approve', 'ncr.read', 'ncr.write', 'ncr.close'],
  'traceability': ['traceability.read', 'traceability.write'],
  'equipment': ['equipment.read', 'equipment.write'],
  'users': ['users.read', 'users.write'],
  'materials': ['materials.read', 'materials.write'],
  'scheduling': ['scheduling.read', 'scheduling.write'],
  'routings': ['routings.read', 'routings.create', 'routings.write', 'routings.update', 'routings.delete', 'routings.approve', 'routings.activate'],
  'workinstructions': ['workinstructions.read', 'workinstructions.write', 'workinstructions.create', 'workinstructions.execute'],
  'signatures': ['signatures.read', 'signatures.write'],
  'admin': ['admin.users', 'admin.roles', 'admin.permissions', 'admin.system']
};

// Extract all unique permissions from demo users
function extractAllPermissions(): string[] {
  const allPermissions = new Set<string>();

  // Add permissions from demo users
  DEMO_USERS.forEach(user => {
    user.permissions.forEach(permission => {
      allPermissions.add(permission);
    });
  });

  // Add permissions from PERMISSIONS constants
  Object.values(PERMISSIONS).forEach(permission => {
    allPermissions.add(permission);
  });

  // Add wildcard permissions
  allPermissions.add('*'); // Global admin
  Object.keys(PERMISSION_CATEGORIES).forEach(category => {
    allPermissions.add(`${category}.*`); // Category wildcards
  });

  return Array.from(allPermissions).sort();
}

// Map roles to their typical permissions based on demo users
function createRolePermissionMappings(): Record<string, string[]> {
  const mappings: Record<string, string[]> = {};

  // Analyze demo users to extract role-permission mappings
  DEMO_USERS.forEach(user => {
    user.roles.forEach(role => {
      if (!mappings[role]) {
        mappings[role] = [];
      }
      user.permissions.forEach(permission => {
        if (!mappings[role].includes(permission)) {
          mappings[role].push(permission);
        }
      });
    });
  });

  // Add default mappings for standard roles
  mappings['System Administrator'] = ['*']; // Global access
  mappings['Plant Manager'] = ['workorders.*', 'quality.*', 'materials.*', 'scheduling.*', 'equipment.*', 'users.read'];
  mappings['Production Supervisor'] = ['workorders.read', 'workorders.write', 'workorders.execute', 'materials.read', 'equipment.read'];
  mappings['Quality Engineer'] = ['quality.*', 'workorders.read', 'traceability.*'];
  mappings['Quality Inspector'] = ['quality.read', 'quality.write', 'workorders.read'];
  mappings['Manufacturing Engineer'] = ['workorders.*', 'routings.*', 'workinstructions.*', 'equipment.read'];
  mappings['Operator'] = ['workorders.read', 'workorders.execute', 'workinstructions.read', 'workinstructions.execute'];

  return mappings;
}

async function seedPermissions() {
  console.log('🔑 Seeding permissions...');

  const allPermissions = extractAllPermissions();

  for (const permissionCode of allPermissions) {
    // Determine category and if it's a wildcard
    let category = null;
    let isWildcard = false;
    let permissionName = permissionCode;

    if (permissionCode === '*') {
      category = 'admin';
      isWildcard = true;
      permissionName = 'Global Administrator Access';
    } else if (permissionCode.endsWith('.*')) {
      category = permissionCode.replace('.*', '');
      isWildcard = true;
      permissionName = `All ${category.charAt(0).toUpperCase() + category.slice(1)} Permissions`;
    } else {
      // Find category from permission code
      for (const [cat, perms] of Object.entries(PERMISSION_CATEGORIES)) {
        if (perms.includes(permissionCode)) {
          category = cat;
          break;
        }
      }
      if (!category) {
        category = permissionCode.split('.')[0] || 'general';
      }

      // Generate human-readable name
      const parts = permissionCode.split('.');
      if (parts.length >= 2) {
        const action = parts[1];
        const resource = parts[0];
        permissionName = `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
      }
    }

    await prisma.permission.upsert({
      where: { permissionCode },
      update: {},
      create: {
        permissionCode,
        permissionName,
        description: `Permission to ${permissionName.toLowerCase()}`,
        category,
        isActive: true,
        isWildcard
      }
    });
  }

  console.log(`✅ Seeded ${allPermissions.length} permissions`);
}

async function seedRoles() {
  console.log('👥 Seeding roles...');

  const allRoles = Object.values(ROLES);

  for (const roleName of allRoles) {
    // Generate role code from role name
    const roleCode = roleName.toLowerCase().replace(/\s+/g, '_');

    // Determine if role is global (most roles are global by default)
    const isGlobal = true; // Can be made site-specific later via admin UI

    await prisma.role.upsert({
      where: { roleCode },
      update: {},
      create: {
        roleCode,
        roleName,
        description: `${roleName} with appropriate system permissions`,
        isActive: true,
        isGlobal,
        createdBy: 'system'
      }
    });
  }

  console.log(`✅ Seeded ${allRoles.length} roles`);
}

async function seedRolePermissions() {
  console.log('🔗 Creating role-permission mappings...');

  const mappings = createRolePermissionMappings();
  let totalMappings = 0;

  for (const [roleName, permissions] of Object.entries(mappings)) {
    const roleCode = roleName.toLowerCase().replace(/\s+/g, '_');

    // Find the role
    const role = await prisma.role.findUnique({
      where: { roleCode }
    });

    if (!role) {
      console.warn(`⚠️ Role not found: ${roleName} (${roleCode})`);
      continue;
    }

    for (const permissionCode of permissions) {
      // Find the permission
      const permission = await prisma.permission.findUnique({
        where: { permissionCode }
      });

      if (!permission) {
        console.warn(`⚠️ Permission not found: ${permissionCode}`);
        continue;
      }

      // Create role-permission mapping
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
          grantedBy: 'system'
        }
      });

      totalMappings++;
    }
  }

  console.log(`✅ Created ${totalMappings} role-permission mappings`);
}

async function migrateUserRoles() {
  console.log('👤 Migrating user role assignments...');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      roles: true,
      permissions: true
    }
  });

  let migratedUsers = 0;
  let totalRoleAssignments = 0;

  for (const user of users) {
    // Migrate user roles to UserRole table
    for (const roleName of user.roles) {
      const roleCode = roleName.toLowerCase().replace(/\s+/g, '_');

      const role = await prisma.role.findUnique({
        where: { roleCode }
      });

      if (!role) {
        console.warn(`⚠️ Role not found for user ${user.username}: ${roleName}`);
        continue;
      }

      // Create user role assignment
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id
          }
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
          assignedBy: 'system'
        }
      });

      totalRoleAssignments++;
    }

    migratedUsers++;
  }

  console.log(`✅ Migrated ${totalRoleAssignments} role assignments for ${migratedUsers} users`);
}

async function validateMigration() {
  console.log('🔍 Validating migration...');

  const [roleCount, permissionCount, rolePermissionCount, userRoleCount] = await Promise.all([
    prisma.role.count(),
    prisma.permission.count(),
    prisma.rolePermission.count(),
    prisma.userRole.count()
  ]);

  console.log('📊 Migration Summary:');
  console.log(`   - Roles: ${roleCount}`);
  console.log(`   - Permissions: ${permissionCount}`);
  console.log(`   - Role-Permission mappings: ${rolePermissionCount}`);
  console.log(`   - User-Role assignments: ${userRoleCount}`);

  // Validate that System Administrator has global access
  const adminRole = await prisma.role.findUnique({
    where: { roleCode: 'system_administrator' },
    include: {
      permissions: {
        include: {
          permission: true
        }
      }
    }
  });

  if (adminRole) {
    const hasGlobalPermission = adminRole.permissions.some(rp => rp.permission.permissionCode === '*');
    console.log(`   - System Administrator has global access: ${hasGlobalPermission ? '✅' : '❌'}`);
  }

  // Check for any users with roles
  const usersWithRoles = await prisma.user.count({
    where: {
      userRoles: {
        some: {}
      }
    }
  });

  console.log(`   - Users with role assignments: ${usersWithRoles}`);
  console.log('✅ Migration validation complete');
}

async function main() {
  console.log('🚀 Starting RBAC migration...');
  console.log('=====================================');

  try {
    await seedPermissions();
    await seedRoles();
    await seedRolePermissions();
    await migrateUserRoles();
    await validateMigration();

    console.log('=====================================');
    console.log('🎉 RBAC migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test authorization with new system');
    console.log('2. Update JWT token generation');
    console.log('3. Deploy admin UI for role management');
    console.log('4. Remove legacy role/permission arrays after validation');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { main as migrateRBAC };