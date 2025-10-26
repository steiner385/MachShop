export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions: string[];
  siteId?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  message: string;
  token: string;
  expiresIn: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthError {
  message: string;
  code?: string;
  details?: any[];
}

export interface PermissionCheck {
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
}

// Role constants
export const ROLES = {
  SYSTEM_ADMIN: 'System Administrator',
  PLANT_MANAGER: 'Plant Manager',
  PRODUCTION_SUPERVISOR: 'Production Supervisor',
  PRODUCTION_PLANNER: 'Production Planner',
  PRODUCTION_SCHEDULER: 'Production Scheduler',
  MANUFACTURING_ENGINEER: 'Manufacturing Engineer',
  PROCESS_ENGINEER: 'Process Engineer',
  OPERATOR: 'Operator',
  QUALITY_ENGINEER: 'Quality Engineer',
  QUALITY_INSPECTOR: 'Quality Inspector',
  MAINTENANCE_TECHNICIAN: 'Maintenance Technician',
  WAREHOUSE_MANAGER: 'Warehouse Manager',
} as const;

// Permission constants
export const PERMISSIONS = {
  // Work Order permissions
  WORKORDERS_READ: 'workorders.read',
  WORKORDERS_WRITE: 'workorders.write',
  WORKORDERS_CREATE: 'workorders.create',
  WORKORDERS_UPDATE: 'workorders.update',
  WORKORDERS_DELETE: 'workorders.delete',
  WORKORDERS_RELEASE: 'workorders.release',
  WORKORDERS_EXECUTE: 'workorders.execute',

  // Work Instruction permissions
  WORKINSTRUCTIONS_READ: 'workinstructions.read',
  WORKINSTRUCTIONS_CREATE: 'workinstructions.create',
  WORKINSTRUCTIONS_UPDATE: 'workinstructions.update',
  WORKINSTRUCTIONS_DELETE: 'workinstructions.delete',
  WORKINSTRUCTIONS_APPROVE: 'workinstructions.approve',
  WORKINSTRUCTIONS_EXECUTE: 'workinstructions.execute',

  // Quality permissions
  QUALITY_READ: 'quality.read',
  QUALITY_CREATE: 'quality.create',
  QUALITY_UPDATE: 'quality.update',
  QUALITY_DELETE: 'quality.delete',
  QUALITY_APPROVE: 'quality.approve',

  // Material permissions
  MATERIALS_READ: 'materials.read',
  MATERIALS_CREATE: 'materials.create',
  MATERIALS_UPDATE: 'materials.update',
  MATERIALS_DELETE: 'materials.delete',

  // Traceability permissions
  TRACEABILITY_READ: 'traceability.read',
  TRACEABILITY_EXPORT: 'traceability.export',

  // Equipment permissions
  EQUIPMENT_READ: 'equipment.read',
  EQUIPMENT_UPDATE: 'equipment.update',
  EQUIPMENT_MAINTENANCE: 'equipment.maintenance',

  // Admin permissions
  ADMIN_USERS: 'admin.users',
  ADMIN_SYSTEM: 'admin.system',
  ADMIN_REPORTS: 'admin.reports',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];