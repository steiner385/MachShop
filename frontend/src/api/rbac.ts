/**
 * RBAC API Layer for Admin UI
 * Created for GitHub Issue #124 - Admin UI for Role and Permission Management
 */

import axios from 'axios';
import { tokenUtils } from './auth';
import {
  Role,
  Permission,
  RolePermission,
  UserRole,
  UserSiteRole,
  Site,
  CreateRoleRequest,
  UpdateRoleRequest,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  AssignRolePermissionRequest,
  RevokeRolePermissionRequest,
  ReplaceRolePermissionsRequest,
  AssignUserRoleRequest,
  RevokeUserRoleRequest,
  PaginatedRolesResponse,
  PaginatedPermissionsResponse,
  PaginatedUserRolesResponse,
  PaginatedUserSiteRolesResponse,
  RoleDetails,
  UserRoleOverview,
  RBACDashboardStats,
  RoleFilters,
  PermissionFilters,
  UserRoleFilters,
} from '@/types/rbac';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create axios instance for RBAC operations
const rbacClient = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
rbacClient.interceptors.request.use((config) => {
  const token = tokenUtils.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
rbacClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      window.location.href = '/login';
      return Promise.reject(new Error('Authentication required'));
    }

    if (error.response?.status === 403) {
      throw new Error('Insufficient permissions to perform this action');
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error(error.message || 'An unexpected error occurred');
  }
);

// Utility function to build query string from filters
const buildQueryString = (filters: Record<string, any>): string => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  return params.toString();
};

export const rbacAPI = {
  // ==================== ROLE MANAGEMENT ====================

  /**
   * Get all roles with optional filtering and pagination
   */
  getRoles: async (filters: RoleFilters & { page?: number; limit?: number } = {}): Promise<PaginatedRolesResponse> => {
    const queryString = buildQueryString(filters);
    return rbacClient.get(`/roles?${queryString}`);
  },

  /**
   * Get role by ID with details
   */
  getRoleById: async (roleId: string): Promise<RoleDetails> => {
    return rbacClient.get(`/roles/${roleId}`);
  },

  /**
   * Create new role
   */
  createRole: async (roleData: CreateRoleRequest): Promise<Role> => {
    return rbacClient.post('/roles', roleData);
  },

  /**
   * Update existing role
   */
  updateRole: async (roleId: string, roleData: UpdateRoleRequest): Promise<Role> => {
    return rbacClient.put(`/roles/${roleId}`, roleData);
  },

  /**
   * Delete role
   */
  deleteRole: async (roleId: string): Promise<void> => {
    return rbacClient.delete(`/roles/${roleId}`);
  },

  // ==================== PERMISSION MANAGEMENT ====================

  /**
   * Get all permissions with optional filtering and pagination
   */
  getPermissions: async (filters: PermissionFilters & { page?: number; limit?: number } = {}): Promise<PaginatedPermissionsResponse> => {
    const queryString = buildQueryString(filters);
    return rbacClient.get(`/permissions?${queryString}`);
  },

  /**
   * Get permission by ID
   */
  getPermissionById: async (permissionId: string): Promise<Permission> => {
    return rbacClient.get(`/permissions/${permissionId}`);
  },

  /**
   * Create new permission
   */
  createPermission: async (permissionData: CreatePermissionRequest): Promise<Permission> => {
    return rbacClient.post('/permissions', permissionData);
  },

  /**
   * Update existing permission
   */
  updatePermission: async (permissionId: string, permissionData: UpdatePermissionRequest): Promise<Permission> => {
    return rbacClient.put(`/permissions/${permissionId}`, permissionData);
  },

  /**
   * Delete permission
   */
  deletePermission: async (permissionId: string): Promise<void> => {
    return rbacClient.delete(`/permissions/${permissionId}`);
  },

  // ==================== ROLE-PERMISSION ASSIGNMENTS ====================

  /**
   * Get permissions for a specific role
   */
  getRolePermissions: async (roleId: string): Promise<RolePermission[]> => {
    return rbacClient.get(`/role-permissions/${roleId}`);
  },

  /**
   * Assign permission to role
   */
  assignRolePermission: async (assignmentData: AssignRolePermissionRequest): Promise<void> => {
    return rbacClient.post('/role-permissions/assign', assignmentData);
  },

  /**
   * Revoke permission from role
   */
  revokeRolePermission: async (revocationData: RevokeRolePermissionRequest): Promise<void> => {
    return rbacClient.delete('/role-permissions/revoke', { data: revocationData });
  },

  /**
   * Replace all permissions for a role
   */
  replaceRolePermissions: async (roleId: string, permissionIds: string[]): Promise<void> => {
    return rbacClient.put(`/role-permissions/${roleId}`, { permissionIds });
  },

  // ==================== USER-ROLE ASSIGNMENTS ====================

  /**
   * Get user role assignments with optional filtering
   */
  getUserRoles: async (filters: UserRoleFilters & { page?: number; limit?: number } = {}): Promise<PaginatedUserRolesResponse> => {
    const queryString = buildQueryString(filters);
    return rbacClient.get(`/user-roles?${queryString}`);
  },

  /**
   * Get user site role assignments
   */
  getUserSiteRoles: async (filters: UserRoleFilters & { page?: number; limit?: number } = {}): Promise<PaginatedUserSiteRolesResponse> => {
    const queryString = buildQueryString(filters);
    return rbacClient.get(`/user-roles/site?${queryString}`);
  },

  /**
   * Get role overview for a specific user
   */
  getUserRoleOverview: async (userId: string): Promise<UserRoleOverview> => {
    return rbacClient.get(`/user-roles/${userId}`);
  },

  /**
   * Assign global role to user
   */
  assignGlobalUserRole: async (assignmentData: AssignUserRoleRequest): Promise<void> => {
    return rbacClient.post('/user-roles/assign/global', assignmentData);
  },

  /**
   * Assign site-specific role to user
   */
  assignSiteUserRole: async (assignmentData: AssignUserRoleRequest): Promise<void> => {
    return rbacClient.post('/user-roles/assign/site', assignmentData);
  },

  /**
   * Revoke global role from user
   */
  revokeGlobalUserRole: async (revocationData: RevokeUserRoleRequest): Promise<void> => {
    return rbacClient.delete('/user-roles/revoke/global', { data: revocationData });
  },

  /**
   * Revoke site-specific role from user
   */
  revokeSiteUserRole: async (revocationData: RevokeUserRoleRequest): Promise<void> => {
    return rbacClient.delete('/user-roles/revoke/site', { data: revocationData });
  },

  // ==================== DASHBOARD & ANALYTICS ====================

  /**
   * Get RBAC dashboard statistics
   */
  getDashboardStats: async (): Promise<RBACDashboardStats> => {
    return rbacClient.get('/dashboard/stats');
  },

  // ==================== UTILITY ENDPOINTS ====================

  /**
   * Get all sites for site-specific role assignments
   */
  getSites: async (): Promise<Site[]> => {
    return rbacClient.get('/sites');
  },

  /**
   * Search users for role assignment
   */
  searchUsers: async (query: string, limit: number = 10): Promise<Array<{
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    email: string;
  }>> => {
    return rbacClient.get(`/users/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  /**
   * Get permission categories for filtering
   */
  getPermissionCategories: async (): Promise<string[]> => {
    return rbacClient.get('/permissions/categories');
  },

  /**
   * Bulk assign roles to multiple users
   */
  bulkAssignUserRoles: async (assignments: Array<{
    userId: string;
    roleId: string;
    siteId?: string;
  }>): Promise<void> => {
    return rbacClient.post('/user-roles/bulk-assign', { assignments });
  },

  /**
   * Bulk revoke roles from multiple users
   */
  bulkRevokeUserRoles: async (revocations: Array<{
    userId: string;
    roleId: string;
    siteId?: string;
  }>): Promise<void> => {
    return rbacClient.post('/user-roles/bulk-revoke', { revocations });
  },

  // ==================== VALIDATION HELPERS ====================

  /**
   * Check if role code is available
   */
  checkRoleCodeAvailability: async (roleCode: string, excludeId?: string): Promise<boolean> => {
    const params = new URLSearchParams({ roleCode });
    if (excludeId) {
      params.append('excludeId', excludeId);
    }
    const response = await rbacClient.get(`/roles/check-code?${params.toString()}`);
    return response.available;
  },

  /**
   * Check if permission code is available
   */
  checkPermissionCodeAvailability: async (permissionCode: string, excludeId?: string): Promise<boolean> => {
    const params = new URLSearchParams({ permissionCode });
    if (excludeId) {
      params.append('excludeId', excludeId);
    }
    const response = await rbacClient.get(`/permissions/check-code?${params.toString()}`);
    return response.available;
  },
};

export default rbacAPI;