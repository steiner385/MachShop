/**
 * ✅ GITHUB ISSUE #125: Role Templates for Predefined Role Configurations
 *
 * Type definitions for Role Template System
 */

import { RoleTemplateCategory, RoleTemplateAction } from '@prisma/client';

// Base role template interfaces
export interface RoleTemplate {
  id: string;
  templateCode: string;
  templateName: string;
  description?: string;
  category: RoleTemplateCategory;
  isActive: boolean;
  isGlobal: boolean;
  version: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface RoleTemplatePermission {
  id: string;
  permissionId: string;
  isRequired: boolean;
  isOptional: boolean;
  metadata?: any;
  permission: {
    id: string;
    permissionCode: string;
    permissionName: string;
    description?: string;
    category?: string;
  };
}

export interface RoleTemplateWithPermissions extends RoleTemplate {
  permissions: RoleTemplatePermission[];
  creator: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  updater?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  instances?: RoleTemplateInstanceSummary[];
}

export interface RoleTemplateInstanceSummary {
  id: string;
  instanceName?: string;
  isActive: boolean;
  instantiatedAt: Date;
  role: {
    id: string;
    roleName: string;
    roleCode: string;
  };
  site?: {
    id: string;
    siteName: string;
    siteCode: string;
  };
}

export interface RoleTemplateInstance {
  id: string;
  templateId: string;
  roleId: string;
  instanceName?: string;
  siteId?: string;
  customPermissions?: any;
  isActive: boolean;
  instantiatedAt: Date;
  instantiatedBy: string;
  metadata?: any;
  template: {
    id: string;
    templateCode: string;
    templateName: string;
    category: RoleTemplateCategory;
  };
  role: {
    id: string;
    roleName: string;
    roleCode: string;
    description?: string;
    permissions: Array<{
      permission: {
        id: string;
        permissionCode: string;
        permissionName: string;
        description?: string;
        category?: string;
      };
    }>;
  };
  site?: {
    id: string;
    siteName: string;
    siteCode: string;
  };
  instantiator: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

// Input types for CRUD operations
export interface CreateRoleTemplateInput {
  templateCode: string;
  templateName: string;
  description?: string;
  category: RoleTemplateCategory;
  isActive?: boolean;
  isGlobal?: boolean;
  version?: string;
  metadata?: any;
  permissions?: CreateRoleTemplatePermissionInput[];
}

export interface CreateRoleTemplatePermissionInput {
  permissionId: string;
  isRequired?: boolean;
  isOptional?: boolean;
  metadata?: any;
}

export interface UpdateRoleTemplateInput {
  templateCode?: string;
  templateName?: string;
  description?: string;
  category?: RoleTemplateCategory;
  isActive?: boolean;
  isGlobal?: boolean;
  version?: string;
  metadata?: any;
  permissions?: CreateRoleTemplatePermissionInput[];
}

export interface InstantiateRoleTemplateInput {
  templateId: string;
  roleName: string;
  roleCode?: string;
  description?: string;
  instanceName?: string;
  siteId?: string;
  customPermissions?: RoleTemplateCustomPermissions;
  metadata?: any;
}

export interface RoleTemplateCustomPermissions {
  addPermissions?: string[]; // Additional permission IDs to add
  removePermissions?: string[]; // Permission IDs to remove from template
}

// Query and pagination types
export interface RoleTemplateListFilters {
  category?: RoleTemplateCategory;
  isActive?: boolean;
  isGlobal?: boolean;
  search?: string;
  sortBy?: 'templateName' | 'templateCode' | 'category' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedRoleTemplates {
  templates: RoleTemplateSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RoleTemplateSummary {
  id: string;
  templateCode: string;
  templateName: string;
  description?: string;
  category: RoleTemplateCategory;
  isActive: boolean;
  isGlobal: boolean;
  version: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  permissionCount: number;
  instanceCount: number;
  permissions: RoleTemplatePermission[];
}

// Usage statistics and analytics
export interface RoleTemplateUsageStats {
  templateId: string;
  totalInstances: number;
  activeInstances: number;
  inactiveInstances: number;
  siteUsage: Record<string, number>; // siteName -> instance count
  recentUsage: Array<{
    action: RoleTemplateAction;
    performedBy: string;
    timestamp: Date;
    details?: any;
  }>;
}

// Predefined manufacturing templates
export interface ManufacturingRoleTemplate {
  templateCode: string;
  templateName: string;
  description: string;
  category: RoleTemplateCategory;
  permissions: string[]; // Permission codes
  metadata: {
    skillRequirements?: string[];
    certificationRequirements?: string[];
    shiftPatterns?: string[];
    workstationTypes?: string[];
    safetyLevel?: 'basic' | 'intermediate' | 'advanced';
    estimatedTrainingHours?: number;
  };
}

// API response types
export interface CreateRoleTemplateResponse {
  success: boolean;
  template: RoleTemplateWithPermissions;
  message: string;
}

export interface InstantiateRoleTemplateResponse {
  success: boolean;
  instance: RoleTemplateInstance;
  message: string;
}

// Error types
export interface RoleTemplateError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

// Validation schemas (for use with validation libraries)
export interface RoleTemplateValidationRules {
  templateCode: {
    required: true;
    minLength: 3;
    maxLength: 50;
    pattern: string; // Alphanumeric with underscores/hyphens
  };
  templateName: {
    required: true;
    minLength: 3;
    maxLength: 100;
  };
  description: {
    maxLength: 500;
  };
  permissions: {
    minItems: 1;
    maxItems: 100;
  };
}

// Bulk operations
export interface BulkCreateRoleTemplatesInput {
  templates: CreateRoleTemplateInput[];
  skipValidation?: boolean;
  continueOnError?: boolean;
}

export interface BulkCreateRoleTemplatesResponse {
  success: boolean;
  created: RoleTemplateWithPermissions[];
  errors: Array<{
    templateCode: string;
    error: RoleTemplateError;
  }>;
  summary: {
    totalRequested: number;
    successfullyCreated: number;
    failed: number;
  };
}

// Template comparison and merging
export interface RoleTemplateComparison {
  template1: RoleTemplateWithPermissions;
  template2: RoleTemplateWithPermissions;
  differences: {
    metadata: any;
    permissions: {
      added: RoleTemplatePermission[];
      removed: RoleTemplatePermission[];
      modified: Array<{
        permission: RoleTemplatePermission;
        changes: Record<string, { old: any; new: any }>;
      }>;
    };
  };
}

// Template versioning
export interface RoleTemplateVersionInfo {
  templateId: string;
  versions: Array<{
    version: string;
    createdAt: Date;
    createdBy: string;
    changes: string[];
    isActive: boolean;
  }>;
  latestVersion: string;
}

// Export utilities
export interface RoleTemplateExportOptions {
  includePermissions: boolean;
  includeInstances: boolean;
  includeUsageStats: boolean;
  format: 'json' | 'csv' | 'xlsx';
}

export interface RoleTemplateExportData {
  templates: RoleTemplateWithPermissions[];
  metadata: {
    exportedAt: Date;
    exportedBy: string;
    totalTemplates: number;
    options: RoleTemplateExportOptions;
  };
}