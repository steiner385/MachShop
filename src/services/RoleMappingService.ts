import { PrismaClient } from '@prisma/client';
import { SaviyntApiClient, SaviyntRole } from './SaviyntApiClient';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import {
  SaviyntSyncStatus,
  SaviyntSyncType,
  SaviyntEntityType,
  SaviyntOperation,
  SaviyntMappingType
} from '@prisma/client';

export interface RoleMapping {
  id: string;
  mesRoleId: string;
  saviyntRoleId: string;
  mappingType: RoleMappingType;
  mappingRules?: RoleMappingRule[];
  isActive: boolean;
  priority: number;
  createdAt: Date;
  lastSyncAt?: Date;
  syncStatus: SaviyntSyncStatus;
  metadata?: Record<string, any>;
}

export enum RoleMappingType {
  DIRECT = 'DIRECT',                    // 1:1 mapping
  HIERARCHICAL = 'HIERARCHICAL',        // Parent-child relationship
  CONDITIONAL = 'CONDITIONAL',          // Based on conditions
  COMPOSITE = 'COMPOSITE',              // Multiple MES roles → Single Saviynt role
  DISTRIBUTED = 'DISTRIBUTED',          // Single MES role → Multiple Saviynt roles
  TEMPLATE_BASED = 'TEMPLATE_BASED'     // Based on role templates
}

export interface RoleMappingRule {
  id: string;
  type: RuleMappingType;
  conditions: RoleCondition[];
  actions: RoleMappingAction[];
  isActive: boolean;
  priority: number;
}

export enum RuleMappingType {
  DEPARTMENT_BASED = 'DEPARTMENT_BASED',
  SENIORITY_BASED = 'SENIORITY_BASED',
  LOCATION_BASED = 'LOCATION_BASED',
  FUNCTION_BASED = 'FUNCTION_BASED',
  PERMISSION_BASED = 'PERMISSION_BASED',
  ATTRIBUTE_BASED = 'ATTRIBUTE_BASED'
}

export interface RoleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'exists' | 'not_exists' | 'matches_pattern';
  value: any;
  entityType: 'USER' | 'ROLE' | 'CONTEXT';
}

export interface RoleMappingAction {
  type: RoleMappingActionType;
  target: string;
  parameters: Record<string, any>;
}

export enum RoleMappingActionType {
  MAP_ROLE = 'MAP_ROLE',
  CREATE_ROLE = 'CREATE_ROLE',
  INHERIT_PERMISSIONS = 'INHERIT_PERMISSIONS',
  ADD_ATTRIBUTES = 'ADD_ATTRIBUTES',
  SET_HIERARCHY = 'SET_HIERARCHY',
  APPLY_CONSTRAINTS = 'APPLY_CONSTRAINTS'
}

export interface RoleHierarchy {
  roleId: string;
  parentRoleId?: string;
  childRoleIds: string[];
  level: number;
  inheritanceType: InheritanceType;
  effectivePermissions: string[];
}

export enum InheritanceType {
  ADDITIVE = 'ADDITIVE',               // Child inherits all parent permissions
  RESTRICTIVE = 'RESTRICTIVE',         // Child has subset of parent permissions
  OVERRIDE = 'OVERRIDE',               // Child permissions override parent
  CONDITIONAL = 'CONDITIONAL'          // Inheritance based on conditions
}

export interface RoleAssignmentResult {
  success: boolean;
  userId: string;
  roleId: string;
  saviyntRoleId?: string;
  operation: RoleAssignmentOperation;
  errorMessage?: string;
  conflictingRoles?: string[];
  inheritedRoles?: string[];
  effectivePermissions?: string[];
}

export enum RoleAssignmentOperation {
  ASSIGN = 'ASSIGN',
  REMOVE = 'REMOVE',
  UPDATE = 'UPDATE',
  INHERIT = 'INHERIT',
  VALIDATE = 'VALIDATE'
}

export interface RoleConflict {
  id: string;
  userId: string;
  conflictType: RoleConflictType;
  mesRoles: string[];
  saviyntRoles: string[];
  description: string;
  severity: ConflictSeverity;
  resolutionStrategy: ConflictResolutionStrategy;
  status: ConflictStatus;
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export enum RoleConflictType {
  SEGREGATION_OF_DUTIES = 'SEGREGATION_OF_DUTIES',
  PERMISSION_OVERLAP = 'PERMISSION_OVERLAP',
  HIERARCHY_VIOLATION = 'HIERARCHY_VIOLATION',
  MUTUAL_EXCLUSION = 'MUTUAL_EXCLUSION',
  EXCESSIVE_PRIVILEGES = 'EXCESSIVE_PRIVILEGES',
  MISSING_PREREQUISITE = 'MISSING_PREREQUISITE'
}

export enum ConflictSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ConflictResolutionStrategy {
  AUTO_RESOLVE = 'AUTO_RESOLVE',
  SUPERVISOR_APPROVAL = 'SUPERVISOR_APPROVAL',
  SECURITY_REVIEW = 'SECURITY_REVIEW',
  MANUAL_INTERVENTION = 'MANUAL_INTERVENTION'
}

export enum ConflictStatus {
  DETECTED = 'DETECTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED'
}

export class RoleMappingService {
  private prisma: PrismaClient;
  private saviyntClient: SaviyntApiClient;
  private mappings: Map<string, RoleMapping> = new Map();
  private hierarchies: Map<string, RoleHierarchy> = new Map();
  private conflicts: Map<string, RoleConflict> = new Map();
  private segregationRules: Map<string, string[]> = new Map();
  private isEnabled: boolean;

  constructor(prisma: PrismaClient, saviyntClient: SaviyntApiClient) {
    this.prisma = prisma;
    this.saviyntClient = saviyntClient;
    this.isEnabled = config.saviynt.enabled;
  }

  /**
   * Initialize the role mapping service
   */
  public async initialize(): Promise<void> {
    if (!this.isEnabled) {
      logger.info('Role mapping service is disabled (Saviynt integration disabled)');
      return;
    }

    try {
      await this.loadRoleMappings();
      await this.loadRoleHierarchies();
      await this.loadSegregationRules();
      await this.syncExistingRoles();
      logger.info('Role mapping service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize role mapping service', { error });
      throw error;
    }
  }

  /**
   * Load role mappings from database
   */
  private async loadRoleMappings(): Promise<void> {
    try {
      const mappings = await this.prisma.saviyntRoleMapping.findMany({
        where: { isActive: true },
        include: { role: true }
      });

      for (const mapping of mappings) {
        this.mappings.set(mapping.id, {
          id: mapping.id,
          mesRoleId: mapping.roleId,
          saviyntRoleId: mapping.saviyntRoleId,
          mappingType: this.mapToRoleMappingType(mapping.mappingType),
          isActive: mapping.isActive,
          priority: 1, // Default priority
          createdAt: mapping.createdAt,
          lastSyncAt: mapping.lastSyncAt || undefined,
          syncStatus: SaviyntSyncStatus.COMPLETED,
          metadata: mapping.conditions || {}
        });
      }

      logger.info(`Loaded ${this.mappings.size} role mappings`);
    } catch (error) {
      logger.error('Failed to load role mappings', { error });
      throw error;
    }
  }

  /**
   * Load role hierarchies from database
   */
  private async loadRoleHierarchies(): Promise<void> {
    try {
      const roles = await this.prisma.role.findMany({
        where: { isActive: true },
        include: { permissions: { include: { permission: true } } }
      });

      // Build hierarchy map (simplified - would be more complex in reality)
      for (const role of roles) {
        const effectivePermissions = role.permissions.map(rp => rp.permission.permissionCode);

        this.hierarchies.set(role.id, {
          roleId: role.id,
          childRoleIds: [],
          level: this.calculateRoleLevel(role.roleCode),
          inheritanceType: InheritanceType.ADDITIVE,
          effectivePermissions
        });
      }

      logger.info(`Loaded ${this.hierarchies.size} role hierarchies`);
    } catch (error) {
      logger.error('Failed to load role hierarchies', { error });
      throw error;
    }
  }

  /**
   * Load segregation of duties rules
   */
  private async loadSegregationRules(): Promise<void> {
    // Default segregation rules
    const defaultRules = new Map([
      ['ADMIN', ['AUDITOR', 'FINANCIAL_CONTROLLER']],
      ['SECURITY_ADMIN', ['SECURITY_AUDITOR']],
      ['FINANCIAL_APPROVER', ['FINANCIAL_RECORDER']],
      ['USER_ADMIN', ['USER_AUDITOR']],
      ['SYSTEM_ADMIN', ['COMPLIANCE_OFFICER']]
    ]);

    this.segregationRules = defaultRules;
    logger.info(`Loaded ${this.segregationRules.size} segregation of duties rules`);
  }

  /**
   * Sync existing MES roles to Saviynt
   */
  private async syncExistingRoles(): Promise<void> {
    const unmappedRoles = await this.prisma.role.findMany({
      where: {
        isActive: true,
        saviyntRoleMappings: { none: {} }
      }
    });

    for (const role of unmappedRoles) {
      try {
        await this.createRoleMapping(role.id, 'system-init');
      } catch (error) {
        logger.warn('Failed to create initial role mapping', {
          roleId: role.id,
          roleCode: role.roleCode,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info(`Synced ${unmappedRoles.length} existing roles`);
  }

  /**
   * Create a role mapping between MES and Saviynt
   */
  public async createRoleMapping(
    mesRoleId: string,
    triggeredBy: string,
    mappingType: RoleMappingType = RoleMappingType.DIRECT
  ): Promise<RoleMapping> {
    try {
      // Get MES role
      const mesRole = await this.prisma.role.findUnique({
        where: { id: mesRoleId },
        include: { permissions: { include: { permission: true } } }
      });

      if (!mesRole) {
        throw new Error(`MES role not found: ${mesRoleId}`);
      }

      // Check if mapping already exists
      const existingMapping = await this.prisma.saviyntRoleMapping.findFirst({
        where: { roleId: mesRoleId, isActive: true }
      });

      if (existingMapping) {
        throw new Error(`Role mapping already exists for role: ${mesRole.roleCode}`);
      }

      // Check if Saviynt role exists
      let saviyntRole = await this.saviyntClient.getRole(mesRole.roleCode);

      if (!saviyntRole) {
        // Create role in Saviynt
        const newSaviyntRole: SaviyntRole = {
          rolename: mesRole.roleCode,
          roledisplayname: mesRole.roleName,
          roledescription: mesRole.description || '',
          attributes: {
            mesRoleId: mesRole.id,
            isGlobal: mesRole.isGlobal,
            permissions: mesRole.permissions.map(rp => rp.permission.permissionCode),
            createdBy: mesRole.createdBy,
            mappingType
          }
        };

        const saviyntRoleKey = await this.saviyntClient.createRole(newSaviyntRole);
        saviyntRole = { ...newSaviyntRole, rolekey: saviyntRoleKey };

        logger.info('Created role in Saviynt', {
          mesRoleId,
          saviyntRoleKey,
          roleCode: mesRole.roleCode
        });
      }

      // Create mapping in database
      const dbMapping = await this.prisma.saviyntRoleMapping.create({
        data: {
          roleId: mesRoleId,
          saviyntRoleId: saviyntRole.rolekey!,
          saviyntRoleName: saviyntRole.rolename,
          mappingType: this.mapFromRoleMappingType(mappingType),
          isActive: true,
          lastSyncAt: new Date()
        }
      });

      // Create in-memory mapping
      const mapping: RoleMapping = {
        id: dbMapping.id,
        mesRoleId,
        saviyntRoleId: saviyntRole.rolekey!,
        mappingType,
        isActive: true,
        priority: 1,
        createdAt: dbMapping.createdAt,
        lastSyncAt: new Date(),
        syncStatus: SaviyntSyncStatus.COMPLETED,
        metadata: {
          saviyntRoleName: saviyntRole.rolename,
          createdBy: triggeredBy
        }
      };

      this.mappings.set(mapping.id, mapping);

      logger.info('Role mapping created successfully', {
        mappingId: mapping.id,
        mesRoleId,
        saviyntRoleId: saviyntRole.rolekey,
        mappingType
      });

      return mapping;

    } catch (error) {
      logger.error('Failed to create role mapping', {
        mesRoleId,
        mappingType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Assign role to user with mapping logic
   */
  public async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string,
    context?: Record<string, any>
  ): Promise<RoleAssignmentResult> {
    try {
      // Get user and role information
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: { include: { role: true } },
          saviyntUserMapping: true
        }
      });

      const role = await this.prisma.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: { include: { permission: true } },
          saviyntRoleMappings: true
        }
      });

      if (!user || !role) {
        throw new Error(`User or role not found: ${userId}, ${roleId}`);
      }

      // Check for role conflicts
      const conflicts = await this.detectRoleConflicts(userId, roleId);
      if (conflicts.length > 0) {
        const criticalConflicts = conflicts.filter(c => c.severity === ConflictSeverity.CRITICAL);
        if (criticalConflicts.length > 0) {
          return {
            success: false,
            userId,
            roleId,
            operation: RoleAssignmentOperation.ASSIGN,
            errorMessage: 'Critical role conflicts detected',
            conflictingRoles: criticalConflicts.map(c => c.id)
          };
        }
      }

      // Assign role in MES
      const userRole = await this.prisma.userRole.create({
        data: {
          userId,
          roleId,
          assignedBy,
          assignedAt: new Date()
        }
      });

      // Get or create Saviynt mapping
      let roleMapping = role.saviyntRoleMappings.find(m => m.isActive);
      if (!roleMapping) {
        const newMapping = await this.createRoleMapping(roleId, assignedBy);
        roleMapping = {
          id: newMapping.id,
          roleId,
          saviyntRoleId: newMapping.saviyntRoleId,
          saviyntRoleName: newMapping.saviyntRoleId, // Simplified
          mappingType: this.mapFromRoleMappingType(newMapping.mappingType),
          isActive: true,
          lastSyncAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          conditions: null
        };
      }

      // Assign role in Saviynt if user is mapped
      if (user.saviyntUserMapping) {
        try {
          await this.saviyntClient.assignRoleToUser(
            user.saviyntUserMapping.saviyntUserId,
            roleMapping.saviyntRoleId
          );
        } catch (error) {
          logger.warn('Failed to assign role in Saviynt', {
            userId,
            roleId,
            saviyntUserId: user.saviyntUserMapping.saviyntUserId,
            saviyntRoleId: roleMapping.saviyntRoleId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Calculate inherited roles and permissions
      const inheritedRoles = await this.calculateInheritedRoles(userId);
      const effectivePermissions = await this.calculateEffectivePermissions(userId);

      logger.info('Role assigned successfully', {
        userId,
        roleId,
        roleCode: role.roleCode,
        assignedBy,
        inheritedRolesCount: inheritedRoles.length,
        effectivePermissionsCount: effectivePermissions.length
      });

      return {
        success: true,
        userId,
        roleId,
        saviyntRoleId: roleMapping.saviyntRoleId,
        operation: RoleAssignmentOperation.ASSIGN,
        inheritedRoles,
        effectivePermissions
      };

    } catch (error) {
      logger.error('Role assignment failed', {
        userId,
        roleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        userId,
        roleId,
        operation: RoleAssignmentOperation.ASSIGN,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remove role from user
   */
  public async removeRoleFromUser(
    userId: string,
    roleId: string,
    removedBy: string
  ): Promise<RoleAssignmentResult> {
    try {
      // Get user and role information
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { saviyntUserMapping: true }
      });

      const roleMapping = await this.prisma.saviyntRoleMapping.findFirst({
        where: { roleId, isActive: true }
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Remove role in MES
      await this.prisma.userRole.deleteMany({
        where: { userId, roleId }
      });

      // Remove role in Saviynt if user is mapped
      if (user.saviyntUserMapping && roleMapping) {
        try {
          await this.saviyntClient.removeRoleFromUser(
            user.saviyntUserMapping.saviyntUserId,
            roleMapping.saviyntRoleId
          );
        } catch (error) {
          logger.warn('Failed to remove role in Saviynt', {
            userId,
            roleId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Recalculate effective permissions
      const effectivePermissions = await this.calculateEffectivePermissions(userId);

      logger.info('Role removed successfully', {
        userId,
        roleId,
        removedBy,
        effectivePermissionsCount: effectivePermissions.length
      });

      return {
        success: true,
        userId,
        roleId,
        saviyntRoleId: roleMapping?.saviyntRoleId,
        operation: RoleAssignmentOperation.REMOVE,
        effectivePermissions
      };

    } catch (error) {
      logger.error('Role removal failed', {
        userId,
        roleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        userId,
        roleId,
        operation: RoleAssignmentOperation.REMOVE,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detect role conflicts for a user
   */
  private async detectRoleConflicts(userId: string, newRoleId: string): Promise<RoleConflict[]> {
    const conflicts: RoleConflict[] = [];

    try {
      // Get user's current roles
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId },
        include: { role: true }
      });

      const newRole = await this.prisma.role.findUnique({
        where: { id: newRoleId }
      });

      if (!newRole) return conflicts;

      // Check segregation of duties
      const conflictingRoles = this.segregationRules.get(newRole.roleCode) || [];
      const userRoleCodes = userRoles.map(ur => ur.role.roleCode);
      const violations = conflictingRoles.filter(roleCode => userRoleCodes.includes(roleCode));

      if (violations.length > 0) {
        conflicts.push({
          id: `sod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          conflictType: RoleConflictType.SEGREGATION_OF_DUTIES,
          mesRoles: [newRoleId, ...userRoles.map(ur => ur.roleId)],
          saviyntRoles: [], // Would be populated with Saviynt role IDs
          description: `Segregation of duties violation: ${newRole.roleCode} conflicts with ${violations.join(', ')}`,
          severity: ConflictSeverity.CRITICAL,
          resolutionStrategy: ConflictResolutionStrategy.SECURITY_REVIEW,
          status: ConflictStatus.DETECTED,
          detectedAt: new Date()
        });
      }

      // Check for excessive privileges (simplified logic)
      const totalRoles = userRoles.length + 1; // +1 for the new role
      if (totalRoles > 5) { // Threshold for excessive privileges
        conflicts.push({
          id: `excessive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          conflictType: RoleConflictType.EXCESSIVE_PRIVILEGES,
          mesRoles: [newRoleId, ...userRoles.map(ur => ur.roleId)],
          saviyntRoles: [],
          description: `User has excessive roles (${totalRoles} total)`,
          severity: ConflictSeverity.MEDIUM,
          resolutionStrategy: ConflictResolutionStrategy.SUPERVISOR_APPROVAL,
          status: ConflictStatus.DETECTED,
          detectedAt: new Date()
        });
      }

      // Store conflicts
      for (const conflict of conflicts) {
        this.conflicts.set(conflict.id, conflict);
      }

    } catch (error) {
      logger.error('Error detecting role conflicts', { userId, newRoleId, error });
    }

    return conflicts;
  }

  /**
   * Calculate inherited roles for a user
   */
  private async calculateInheritedRoles(userId: string): Promise<string[]> {
    try {
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId },
        include: { role: true }
      });

      const inheritedRoles: string[] = [];

      for (const userRole of userRoles) {
        const hierarchy = this.hierarchies.get(userRole.roleId);
        if (hierarchy) {
          // Add child roles based on inheritance type
          if (hierarchy.inheritanceType === InheritanceType.ADDITIVE) {
            inheritedRoles.push(...hierarchy.childRoleIds);
          }
        }
      }

      return [...new Set(inheritedRoles)]; // Remove duplicates
    } catch (error) {
      logger.error('Error calculating inherited roles', { userId, error });
      return [];
    }
  }

  /**
   * Calculate effective permissions for a user
   */
  private async calculateEffectivePermissions(userId: string): Promise<string[]> {
    try {
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } }
            }
          }
        }
      });

      const permissions = new Set<string>();

      for (const userRole of userRoles) {
        // Add direct permissions
        for (const rolePermission of userRole.role.permissions) {
          permissions.add(rolePermission.permission.permissionCode);
        }

        // Add inherited permissions
        const hierarchy = this.hierarchies.get(userRole.roleId);
        if (hierarchy) {
          for (const permission of hierarchy.effectivePermissions) {
            permissions.add(permission);
          }
        }
      }

      return Array.from(permissions);
    } catch (error) {
      logger.error('Error calculating effective permissions', { userId, error });
      return [];
    }
  }

  /**
   * Validate role assignment rules
   */
  public async validateRoleAssignment(
    userId: string,
    roleId: string
  ): Promise<{ isValid: boolean; violations: string[]; warnings: string[] }> {
    const violations: string[] = [];
    const warnings: string[] = [];

    try {
      // Detect conflicts
      const conflicts = await this.detectRoleConflicts(userId, roleId);

      for (const conflict of conflicts) {
        if (conflict.severity === ConflictSeverity.CRITICAL) {
          violations.push(conflict.description);
        } else {
          warnings.push(conflict.description);
        }
      }

      // Check prerequisites (simplified)
      const role = await this.prisma.role.findUnique({
        where: { id: roleId }
      });

      if (role?.roleCode.includes('ADMIN')) {
        const userRoles = await this.prisma.userRole.findMany({
          where: { userId },
          include: { role: true }
        });

        const hasBasicRole = userRoles.some(ur =>
          ur.role.roleCode.includes('USER') || ur.role.roleCode.includes('BASIC')
        );

        if (!hasBasicRole) {
          warnings.push('Admin role assignment without basic user role');
        }
      }

    } catch (error) {
      violations.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Sync role mappings between MES and Saviynt
   */
  public async syncRoleMappings(): Promise<{
    synchronized: number;
    conflicts: number;
    errors: number;
  }> {
    let synchronized = 0;
    let conflicts = 0;
    let errors = 0;

    try {
      const mappings = Array.from(this.mappings.values());

      for (const mapping of mappings) {
        try {
          // Get current state from both systems
          const mesRole = await this.prisma.role.findUnique({
            where: { id: mapping.mesRoleId },
            include: { permissions: { include: { permission: true } } }
          });

          const saviyntRole = await this.saviyntClient.getRole(mapping.saviyntRoleId, true);

          if (!mesRole || !saviyntRole) {
            errors++;
            continue;
          }

          // Compare and sync if needed
          const needsSync = await this.compareRoles(mesRole, saviyntRole);

          if (needsSync) {
            await this.syncSingleRole(mapping);
            synchronized++;
          }

        } catch (error) {
          logger.error('Error syncing role mapping', {
            mappingId: mapping.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          errors++;
        }
      }

      logger.info('Role mapping sync completed', {
        total: mappings.length,
        synchronized,
        conflicts,
        errors
      });

    } catch (error) {
      logger.error('Role mapping sync failed', { error });
      errors++;
    }

    return { synchronized, conflicts, errors };
  }

  /**
   * Compare MES role with Saviynt role to determine if sync is needed
   */
  private async compareRoles(mesRole: any, saviyntRole: SaviyntRole): Promise<boolean> {
    // Check basic attributes
    if (mesRole.roleName !== saviyntRole.roledisplayname ||
        mesRole.description !== saviyntRole.roledescription) {
      return true;
    }

    // Check permissions (simplified comparison)
    const mesPermissions = mesRole.permissions.map((rp: any) => rp.permission.permissionCode);
    const saviyntAttributes = saviyntRole.attributes || {};
    const saviyntPermissions = saviyntAttributes.permissions || [];

    if (mesPermissions.length !== saviyntPermissions.length ||
        !mesPermissions.every((perm: string) => saviyntPermissions.includes(perm))) {
      return true;
    }

    return false;
  }

  /**
   * Sync a single role mapping
   */
  private async syncSingleRole(mapping: RoleMapping): Promise<void> {
    try {
      const mesRole = await this.prisma.role.findUnique({
        where: { id: mapping.mesRoleId },
        include: { permissions: { include: { permission: true } } }
      });

      if (!mesRole) {
        throw new Error(`MES role not found: ${mapping.mesRoleId}`);
      }

      // Update role in Saviynt
      const updates: Partial<SaviyntRole> = {
        roledisplayname: mesRole.roleName,
        roledescription: mesRole.description || '',
        attributes: {
          mesRoleId: mesRole.id,
          isGlobal: mesRole.isGlobal,
          permissions: mesRole.permissions.map(rp => rp.permission.permissionCode),
          lastSyncAt: new Date().toISOString()
        }
      };

      await this.saviyntClient.updateRole(mapping.saviyntRoleId, updates);

      // Update mapping sync status
      await this.prisma.saviyntRoleMapping.update({
        where: { id: mapping.id },
        data: { lastSyncAt: new Date() }
      });

      mapping.lastSyncAt = new Date();

      logger.info('Role synchronized successfully', {
        mappingId: mapping.id,
        mesRoleId: mapping.mesRoleId,
        saviyntRoleId: mapping.saviyntRoleId
      });

    } catch (error) {
      logger.error('Failed to sync single role', {
        mappingId: mapping.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get role mapping statistics
   */
  public getRoleMappingStatistics() {
    const mappings = Array.from(this.mappings.values());
    const conflicts = Array.from(this.conflicts.values());

    const mappingsByType = mappings.reduce((acc, mapping) => {
      acc[mapping.mappingType] = (acc[mapping.mappingType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const conflictsBySeverity = conflicts.reduce((acc, conflict) => {
      acc[conflict.severity] = (acc[conflict.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalMappings: mappings.length,
      activeMappings: mappings.filter(m => m.isActive).length,
      mappingsByType,
      totalConflicts: conflicts.length,
      conflictsBySeverity,
      pendingConflicts: conflicts.filter(c => c.status === ConflictStatus.DETECTED).length
    };
  }

  /**
   * Utility methods
   */

  private mapToRoleMappingType(dbType: SaviyntMappingType): RoleMappingType {
    switch (dbType) {
      case SaviyntMappingType.AUTOMATIC: return RoleMappingType.DIRECT;
      case SaviyntMappingType.MANUAL: return RoleMappingType.CONDITIONAL;
      case SaviyntMappingType.CONDITIONAL: return RoleMappingType.CONDITIONAL;
      case SaviyntMappingType.HYBRID: return RoleMappingType.COMPOSITE;
      default: return RoleMappingType.DIRECT;
    }
  }

  private mapFromRoleMappingType(type: RoleMappingType): SaviyntMappingType {
    switch (type) {
      case RoleMappingType.DIRECT: return SaviyntMappingType.AUTOMATIC;
      case RoleMappingType.CONDITIONAL: return SaviyntMappingType.CONDITIONAL;
      case RoleMappingType.COMPOSITE: return SaviyntMappingType.HYBRID;
      case RoleMappingType.DISTRIBUTED: return SaviyntMappingType.HYBRID;
      default: return SaviyntMappingType.AUTOMATIC;
    }
  }

  private calculateRoleLevel(roleCode: string): number {
    // Simplified role level calculation
    if (roleCode.includes('ADMIN')) return 1;
    if (roleCode.includes('MANAGER')) return 2;
    if (roleCode.includes('SUPERVISOR')) return 3;
    if (roleCode.includes('LEAD')) return 4;
    return 5; // Basic user level
  }

  /**
   * Get pending role conflicts
   */
  public getPendingConflicts(): RoleConflict[] {
    return Array.from(this.conflicts.values()).filter(
      conflict => conflict.status === ConflictStatus.DETECTED
    );
  }

  /**
   * Resolve a role conflict
   */
  public async resolveConflict(
    conflictId: string,
    resolution: ConflictStatus,
    resolvedBy: string,
    comments?: string
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    conflict.status = resolution;
    conflict.resolvedBy = resolvedBy;
    conflict.resolvedAt = new Date();

    logger.info('Role conflict resolved', {
      conflictId,
      resolution,
      resolvedBy,
      comments
    });
  }
}