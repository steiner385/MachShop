# Dynamic Role-Based Access Control (RBAC) System

**GitHub Issue #29**: Refactor to Dynamic Role and Permission System with Site-Level Configuration

## Overview

This document describes the implementation of a comprehensive, database-driven Role-Based Access Control (RBAC) system that replaces the previous hard-coded role and permission arrays with a flexible, configurable system supporting both global and site-specific access control.

## System Architecture

### Core Components

1. **Database Schema** (`prisma/schema.prisma`)
   - `Role`: Defines system roles with global/site-specific support
   - `Permission`: Defines granular permissions with wildcard support
   - `RolePermission`: Junction table for role-permission assignments
   - `UserRole`: Junction table for global user-role assignments
   - `UserSiteRole`: Junction table for site-specific user-role assignments

2. **Permission Service** (`src/services/permissionService.ts`)
   - Database-driven permission resolution with caching
   - Wildcard permission expansion
   - Performance-optimized with 5-minute TTL cache

3. **Authorization Middleware** (`src/middleware/auth.ts`)
   - Enhanced with database-driven authorization functions
   - Hybrid authorization support for gradual migration
   - Request context enhancement with RBAC metadata

4. **Admin APIs** (`src/routes/admin/`)
   - Role CRUD operations
   - Permission CRUD operations
   - Role-Permission assignment management
   - User-Role assignment management

## Database Schema

### Role Model
```typescript
model Role {
  id          String   @id @default(cuid())
  roleCode    String   @unique
  roleName    String
  description String?
  isActive    Boolean  @default(true)
  isGlobal    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String?

  // Relations
  userRoles     UserRole[]
  userSiteRoles UserSiteRole[]
  permissions   RolePermission[]
}
```

### Permission Model
```typescript
model Permission {
  id             String   @id @default(cuid())
  permissionCode String   @unique
  permissionName String
  description    String?
  category       String?
  isActive       Boolean  @default(true)
  isWildcard     Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Relations
  roles RolePermission[]
}
```

### Junction Tables
- **RolePermission**: Links roles to permissions
- **UserRole**: Links users to global roles
- **UserSiteRole**: Links users to site-specific roles

## Key Features

### 1. Wildcard Permission Support

The system supports wildcard permissions for flexible access control:

- **Global wildcard** (`*`): Grants access to all permissions
- **Category wildcards** (`workorders.*`): Grants access to all permissions in a category
- **Specific permissions** (`workorders.read`): Grants access to specific operations

### 2. Site-Level Configuration

Users can have different roles at different sites:
- **Global roles**: Apply across all sites
- **Site-specific roles**: Apply only to specific sites
- **Hierarchical resolution**: Site-specific roles override global roles

### 3. Performance Optimization

- **5-minute TTL cache**: Reduces database queries for frequently accessed permissions
- **Batch operations**: Efficient permission checking for multiple permissions
- **Indexed database queries**: Optimized database performance

### 4. Migration Support

- **Data migration script**: Converts existing hard-coded roles to database entries
- **Backward compatibility**: Maintains support for legacy JWT tokens during transition
- **Hybrid authorization**: Supports both old and new authorization methods

## API Endpoints

### Role Management
- `GET /api/v1/admin/roles` - List all roles
- `GET /api/v1/admin/roles/:id` - Get role details
- `POST /api/v1/admin/roles` - Create new role
- `PUT /api/v1/admin/roles/:id` - Update role
- `DELETE /api/v1/admin/roles/:id` - Delete role

### Permission Management
- `GET /api/v1/admin/permissions` - List all permissions
- `GET /api/v1/admin/permissions/:id` - Get permission details
- `POST /api/v1/admin/permissions` - Create new permission
- `PUT /api/v1/admin/permissions/:id` - Update permission
- `DELETE /api/v1/admin/permissions/:id` - Delete permission

### Role-Permission Assignment
- `POST /api/v1/admin/role-permissions/assign` - Assign permission to role
- `DELETE /api/v1/admin/role-permissions/revoke` - Revoke permission from role
- `PUT /api/v1/admin/role-permissions/:roleId` - Replace all role permissions
- `GET /api/v1/admin/role-permissions/:roleId` - List role permissions

### User-Role Assignment
- `POST /api/v1/admin/user-roles/assign/global` - Assign global role to user
- `POST /api/v1/admin/user-roles/assign/site` - Assign site-specific role to user
- `DELETE /api/v1/admin/user-roles/revoke/global` - Revoke global role from user
- `DELETE /api/v1/admin/user-roles/revoke/site` - Revoke site-specific role from user
- `GET /api/v1/admin/user-roles/:userId` - List user roles
- `GET /api/v1/admin/user-roles/` - List all user role assignments

## Permission Service API

### Core Functions

```typescript
// Resolve all permissions for a user
async function resolveUserPermissions(
  userId: string,
  siteId?: string
): Promise<ResolvedPermissions>

// Check if user has specific permission
async function hasPermission(
  userId: string,
  permission: string,
  siteId?: string
): Promise<boolean>

// Check if user has specific role
async function hasRole(
  userId: string,
  roles: string | string[],
  siteId?: string
): Promise<boolean>

// Check if user has all specified permissions
async function hasAllPermissions(
  userId: string,
  permissions: string[],
  siteId?: string
): Promise<boolean>

// Expand wildcard permissions to specific permissions
async function expandWildcardPermissions(
  wildcardPermissions: string[]
): Promise<string[]>

// Cache management
function clearUserPermissionCache(userId: string): void
function clearAllPermissionCaches(): void
```

## Authorization Middleware

### Database-Driven Middleware

```typescript
// Require specific permission
requirePermissionDB(permission: string)

// Require specific role
requireRoleDB(role: string | string[])

// Require any of the specified roles
requireAnyRoleDB(roles: string[])

// Require all specified permissions
requireAllPermissionsDB(permissions: string[])

// Require site access
requireSiteAccessDB(siteId?: string)

// Hybrid authorization (database + JWT fallback)
requirePermissionHybrid(permission: string)
```

### Usage Examples

```typescript
// Protect route with specific permission
router.get('/workorders',
  authMiddleware,
  requirePermissionDB('workorders.read'),
  getWorkOrders
);

// Protect route with multiple permissions
router.post('/workorders',
  authMiddleware,
  requireAllPermissionsDB(['workorders.create', 'site.access']),
  createWorkOrder
);

// Protect route with role requirement
router.get('/admin/users',
  authMiddleware,
  requireRoleDB(['System Administrator', 'User Administrator']),
  getUsers
);
```

## Migration Process

### 1. Schema Migration
Run `npx prisma db push` to create new RBAC tables.

### 2. Data Migration
Run `npx tsx scripts/migrate-rbac.ts` to migrate existing data:
- Extracts 140 permissions from existing code
- Creates 12 roles based on existing role definitions
- Establishes 69 role-permission mappings
- Migrates user role assignments
- Validates migration accuracy

### 3. JWT Token Enhancement
Updated token generation to include database-resolved permissions:
```typescript
const tokens = await generateTokens(user); // Now async
```

### 4. Gradual Migration
Use hybrid authorization middleware during transition:
```typescript
router.get('/resource',
  authMiddleware,
  requirePermissionHybrid('resource.read'), // Falls back to JWT if needed
  handler
);
```

## Performance Characteristics

### Benchmarks
- **Single permission resolution**: < 100ms
- **Batch permission resolution (10 users)**: < 50ms average per user
- **Cache hit performance**: < 10ms
- **Wildcard expansion**: < 200ms for category wildcards, < 500ms for global
- **Concurrent operations**: Handles 20+ concurrent requests efficiently

### Optimization Features
- 5-minute TTL cache for permission resolution
- Database query optimization with proper indexing
- Batch operations for multiple permission checks
- Efficient wildcard permission expansion

## Testing

### Test Coverage
- **Unit tests**: Permission service functionality
- **Integration tests**: API endpoint testing
- **Performance tests**: Load testing for permission resolution
- **Migration tests**: Data migration validation

### Test Files
- `src/tests/services/permissionService.test.ts` - Core functionality tests
- `src/tests/performance/permissionResolution.perf.test.ts` - Performance tests
- `src/tests/routes/admin/*.test.ts` - API endpoint tests

## Security Considerations

### Best Practices
1. **Principle of Least Privilege**: Users get minimum necessary permissions
2. **Role Hierarchy**: Clear role inheritance and permission escalation
3. **Audit Trail**: All permission changes are logged
4. **Secure Defaults**: New users have no permissions by default
5. **Permission Validation**: Input validation on all API endpoints

### Security Features
- Permission-based route protection
- JWT token enhancement with RBAC metadata
- Database-driven authorization (prevents token tampering)
- Site-level access isolation
- Comprehensive logging and monitoring

## Monitoring and Observability

### Logging
- Permission resolution debugging
- Authorization decision logging
- Performance metrics collection
- Error tracking and reporting

### Metrics
- Permission cache hit/miss rates
- Authorization decision latency
- API endpoint usage patterns
- Database query performance

## Deployment Notes

### Prerequisites
1. PostgreSQL database with RBAC schema
2. Environment variables configured
3. Data migration completed
4. Cache warming (optional)

### Deployment Steps
1. Deploy schema changes: `npx prisma db push`
2. Run data migration: `npx tsx scripts/migrate-rbac.ts`
3. Restart application services
4. Verify permission resolution
5. Monitor performance metrics

## Future Enhancements

### Planned Features
1. **Admin UI**: Web interface for role/permission management
2. **Role Templates**: Predefined role configurations
3. **Temporal Permissions**: Time-based permission grants
4. **Advanced Auditing**: Comprehensive permission usage tracking
5. **API Rate Limiting**: Permission-based rate limiting

### Technical Improvements
1. **Permission Inheritance**: Hierarchical permission structures
2. **Conditional Permissions**: Context-based permission grants
3. **External Integration**: LDAP/AD integration for role sync
4. **Advanced Caching**: Redis-based distributed caching

## Troubleshooting

### Common Issues
1. **Permission cache issues**: Clear cache with `clearUserPermissionCache(userId)`
2. **Migration failures**: Check database constraints and data integrity
3. **Performance issues**: Monitor cache hit rates and database performance
4. **Authorization failures**: Verify permission assignments and JWT token validity

### Debug Commands
```bash
# Check permission resolution
curl -H "Authorization: Bearer $TOKEN" /api/v1/admin/user-roles/$USER_ID

# Verify role assignments
curl -H "Authorization: Bearer $TOKEN" /api/v1/admin/role-permissions/$ROLE_ID

# Test permission endpoint
curl -H "Authorization: Bearer $TOKEN" /api/v1/admin/permissions
```

## Conclusion

The new RBAC system provides a robust, scalable, and maintainable authorization framework that supports:
- **Flexibility**: Dynamic role and permission management
- **Scalability**: Efficient caching and database optimization
- **Security**: Comprehensive permission-based access control
- **Maintainability**: Clean API design and comprehensive testing

This implementation successfully replaces the hard-coded authorization system with a professional-grade RBAC solution suitable for enterprise manufacturing environments.