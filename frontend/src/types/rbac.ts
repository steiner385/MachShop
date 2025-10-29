/**
 * RBAC Type Definitions for Admin UI
 * Created for GitHub Issue #124 - Admin UI for Role and Permission Management
 */

export interface Role {
  id: string;
  roleCode: string;
  roleName: string;
  description?: string;
  isActive: boolean;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface Permission {
  id: string;
  permissionCode: string;
  permissionName: string;
  description?: string;
  category?: string;
  isActive: boolean;
  isWildcard: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  grantedBy: string;
  grantedAt: string;
  permission?: Permission;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: string;
  role?: Role;
  user?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface UserSiteRole {
  id: string;
  userId: string;
  siteId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: string;
  role?: Role;
  site?: {
    id: string;
    siteCode: string;
    siteName: string;
  };
  user?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface Site {
  id: string;
  siteCode: string;
  siteName: string;
  description?: string;
  isActive: boolean;
}

// Request/Response types for API operations
export interface CreateRoleRequest {
  roleCode: string;
  roleName: string;
  description?: string;
  isGlobal?: boolean;
}

export interface UpdateRoleRequest {
  roleName?: string;
  description?: string;
  isActive?: boolean;
  isGlobal?: boolean;
}

export interface CreatePermissionRequest {
  permissionCode: string;
  permissionName: string;
  description?: string;
  category?: string;
  isWildcard?: boolean;
}

export interface UpdatePermissionRequest {
  permissionName?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

export interface AssignRolePermissionRequest {
  roleId: string;
  permissionId: string;
}

export interface RevokeRolePermissionRequest {
  roleId: string;
  permissionId: string;
}

export interface ReplaceRolePermissionsRequest {
  roleId: string;
  permissionIds: string[];
}

export interface AssignUserRoleRequest {
  userId: string;
  roleId: string;
  siteId?: string; // Optional for site-specific assignments
}

export interface RevokeUserRoleRequest {
  userId: string;
  roleId: string;
  siteId?: string; // Optional for site-specific revocations
}

// Response types with pagination
export interface PaginatedRolesResponse {
  roles: Role[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedPermissionsResponse {
  permissions: Permission[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedUserRolesResponse {
  userRoles: UserRole[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedUserSiteRolesResponse {
  userSiteRoles: UserSiteRole[];
  total: number;
  page: number;
  limit: number;
}

// Role details with associations
export interface RoleDetails extends Role {
  permissions: Permission[];
  userCount: number;
  siteSpecificCount?: number;
}

// User role overview
export interface UserRoleOverview {
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  globalRoles: Role[];
  siteRoles: Array<{
    siteId: string;
    siteCode: string;
    siteName: string;
    roles: Role[];
  }>;
  allPermissions: string[];
  wildcardPermissions: string[];
  isSystemAdmin: boolean;
}

// Dashboard statistics
export interface RBACDashboardStats {
  totalRoles: number;
  totalPermissions: number;
  totalUserAssignments: number;
  totalSiteAssignments: number;
  activeRoles: number;
  activePermissions: number;
  recentChanges: Array<{
    id: string;
    type: 'role_created' | 'role_updated' | 'permission_assigned' | 'user_assigned';
    description: string;
    timestamp: string;
    performedBy: string;
  }>;
  topPermissions: Array<{
    permissionCode: string;
    permissionName: string;
    usageCount: number;
  }>;
  topRoles: Array<{
    roleCode: string;
    roleName: string;
    userCount: number;
  }>;
}

// Filter and search types
export interface RoleFilters {
  search?: string;
  isActive?: boolean;
  isGlobal?: boolean;
  category?: string;
}

export interface PermissionFilters {
  search?: string;
  category?: string;
  isActive?: boolean;
  isWildcard?: boolean;
}

export interface UserRoleFilters {
  search?: string;
  roleId?: string;
  siteId?: string;
}

// Form types for UI components
export interface RoleFormData {
  roleCode: string;
  roleName: string;
  description: string;
  isGlobal: boolean;
  selectedPermissions: string[];
}

export interface PermissionFormData {
  permissionCode: string;
  permissionName: string;
  description: string;
  category: string;
  isWildcard: boolean;
}

export interface UserRoleAssignmentFormData {
  userId: string;
  roleIds: string[];
  siteId?: string;
}

// Error types
export interface RBACError {
  message: string;
  code?: string;
  field?: string;
  details?: any;
}

// UI state types
export interface RoleListState {
  roles: Role[];
  loading: boolean;
  error?: string;
  filters: RoleFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface PermissionListState {
  permissions: Permission[];
  loading: boolean;
  error?: string;
  filters: PermissionFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface UserRoleListState {
  userRoles: UserRole[];
  loading: boolean;
  error?: string;
  filters: UserRoleFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}