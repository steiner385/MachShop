import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Saviynt Identity Management (IDM) Surrogate Service
 *
 * Mock implementation of Saviynt IDM APIs for testing SSO and user provisioning workflows.
 * Provides realistic simulation of identity governance and administration capabilities
 * without requiring live Saviynt system access during CI/CD testing.
 *
 * Features:
 * - User lifecycle management (provisioning, deprovisioning, modifications)
 * - Access governance and policy enforcement
 * - Role-based access control simulation
 * - OAuth/SAML token generation and validation
 * - Identity analytics and compliance reporting
 * - Automated user provisioning workflows
 * - Access certification campaigns
 * - Segregation of duties (SoD) conflict detection
 * - Audit trail and compliance logging
 *
 * Standards Compliance:
 * - SCIM 2.0 for user provisioning
 * - OAuth 2.0 / OpenID Connect for authentication
 * - SAML 2.0 for SSO
 * - RBAC for access control
 * - SOX compliance for audit trails
 *
 * Integration Points:
 * - SSO Authentication: Token validation and user attributes
 * - User Provisioning: Automated account creation/modification
 * - Access Reviews: Periodic access certification
 * - Role Mining: Automatic role discovery and optimization
 * - Compliance Reporting: SOX, SOD, and audit reports
 */

export interface SaviyntConfig {
  mockMode: boolean;                    // Enable mock mode for testing
  baseUrl?: string;                     // Mock API base URL
  tenantId: string;                     // Saviynt tenant identifier
  clientId: string;                     // OAuth client ID
  clientSecret: string;                 // OAuth client secret
  tokenExpirationMinutes?: number;      // Mock token expiration (default: 60)
  enableAuditLogging?: boolean;         // Enable audit trail (default: true)
  enforceSoD?: boolean;                 // Enforce segregation of duties (default: true)
  autoProvisioningEnabled?: boolean;    // Auto-provision users (default: true)
}

/**
 * Saviynt User Account
 */
export interface SaviyntUser {
  userId: string;                       // Unique user identifier
  username: string;                     // Login username
  firstName: string;
  lastName: string;
  email: string;
  employeeId?: string;                  // Employee number/badge
  department?: string;
  manager?: string;                     // Manager user ID
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  accountType: 'EMPLOYEE' | 'CONTRACTOR' | 'SERVICE' | 'TEMP';
  roles: string[];                      // Assigned role names
  permissions: string[];                // Direct permissions
  groups: string[];                     // Security groups
  attributes: Record<string, any>;      // Custom attributes
  lastLogin?: Date;
  createdDate: Date;
  modifiedDate: Date;
  expirationDate?: Date;                // Account expiration
  passwordLastChanged?: Date;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  isLocked: boolean;
  lockoutDate?: Date;
}

/**
 * Saviynt Role Definition
 */
export interface SaviyntRole {
  roleId: string;
  roleName: string;
  roleType: 'BUSINESS' | 'TECHNICAL' | 'SOD_SENSITIVE';
  description?: string;
  permissions: string[];
  conflictingRoles?: string[];          // SoD conflicts
  approvalRequired: boolean;
  maxAssignments?: number;              // Role assignment limit
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive: boolean;
  createdDate: Date;
  modifiedDate: Date;
  certificationRequired: boolean;
  certificationFrequencyDays?: number;
}

/**
 * Access Request
 */
export interface AccessRequest {
  requestId: string;
  requestType: 'ROLE_ASSIGNMENT' | 'PERMISSION_GRANT' | 'GROUP_MEMBERSHIP' | 'ACCOUNT_CREATION';
  requestedFor: string;                 // Target user ID
  requestedBy: string;                  // Requestor user ID
  businessJustification: string;
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  requestDetails: Record<string, any>;
  approvalWorkflow: ApprovalStep[];
  requestDate: Date;
  completionDate?: Date;
  comments: RequestComment[];
}

export interface ApprovalStep {
  stepId: string;
  stepType: 'MANAGER_APPROVAL' | 'ROLE_OWNER_APPROVAL' | 'SOD_REVIEW' | 'COMPLIANCE_REVIEW';
  approverUserId?: string;
  approverRole?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
  approvalDate?: Date;
  comments?: string;
  escalationLevel: number;
}

export interface RequestComment {
  commentId: string;
  userId: string;
  comment: string;
  timestamp: Date;
}

/**
 * OAuth Token
 */
export interface SaviyntToken {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;                    // Seconds until expiration
  refreshToken?: string;
  scope: string[];
  issuedAt: Date;
  userId: string;
  clientId: string;
  tenantId: string;
}

/**
 * SAML Assertion
 */
export interface SamlAssertion {
  assertionId: string;
  userId: string;
  nameId: string;
  issuer: string;
  audience: string;
  sessionIndex: string;
  attributes: Record<string, any>;
  issuedAt: Date;
  expiresAt: Date;
  signatureValid: boolean;
}

/**
 * Audit Event
 */
export interface AuditEvent {
  eventId: string;
  eventType: 'USER_LOGIN' | 'USER_LOGOUT' | 'ROLE_ASSIGNED' | 'ROLE_REMOVED' | 'PERMISSION_GRANTED' | 'PERMISSION_REVOKED' | 'ACCESS_REQUESTED' | 'ACCESS_APPROVED' | 'POLICY_VIOLATION';
  userId?: string;
  targetUserId?: string;
  resourceId?: string;
  action: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  riskScore?: number;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  details: Record<string, any>;
  timestamp: Date;
}

/**
 * Segregation of Duties (SoD) Conflict
 */
export interface SoDConflict {
  conflictId: string;
  userId: string;
  conflictType: 'ROLE_CONFLICT' | 'PERMISSION_CONFLICT' | 'TRANSACTION_CONFLICT';
  conflictingRoles?: string[];
  conflictingPermissions?: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedDate: Date;
  status: 'OPEN' | 'MITIGATED' | 'ACCEPTED' | 'RESOLVED';
  mitigationPlan?: string;
  acceptedBy?: string;
  acceptedDate?: Date;
}

export class SaviyntIDMSurrogate {
  private config: SaviyntConfig;
  private mockUsers: Map<string, SaviyntUser> = new Map();
  private mockRoles: Map<string, SaviyntRole> = new Map();
  private mockTokens: Map<string, SaviyntToken> = new Map();
  private mockRequests: Map<string, AccessRequest> = new Map();
  private auditEvents: AuditEvent[] = [];
  private sodConflicts: Map<string, SoDConflict> = new Map();

  constructor(config: SaviyntConfig) {
    this.config = {
      mockMode: true,
      tokenExpirationMinutes: 60,
      enableAuditLogging: true,
      enforceSoD: true,
      autoProvisioningEnabled: true,
      ...config,
    };

    this.initializeMockData();
    console.log('Saviynt IDM Surrogate initialized in mock mode for testing');
  }

  /**
   * Initialize mock data for testing scenarios
   */
  private initializeMockData(): void {
    // Create sample roles
    const sampleRoles: SaviyntRole[] = [
      {
        roleId: 'role-production-operator',
        roleName: 'Production Operator',
        roleType: 'BUSINESS',
        description: 'Shop floor production operations',
        permissions: ['WORK_ORDER_EXECUTE', 'TIME_TRACKING_ENTRY', 'QUALITY_DATA_ENTRY'],
        approvalRequired: false,
        riskLevel: 'LOW',
        isActive: true,
        createdDate: new Date('2024-01-01'),
        modifiedDate: new Date('2024-01-01'),
        certificationRequired: false,
      },
      {
        roleId: 'role-quality-engineer',
        roleName: 'Quality Engineer',
        roleType: 'BUSINESS',
        description: 'Quality management and compliance',
        permissions: ['QUALITY_PLAN_MANAGE', 'FAI_EXECUTE', 'NCR_CREATE', 'CAPA_MANAGE'],
        approvalRequired: true,
        riskLevel: 'MEDIUM',
        isActive: true,
        createdDate: new Date('2024-01-01'),
        modifiedDate: new Date('2024-01-01'),
        certificationRequired: true,
        certificationFrequencyDays: 365,
      },
      {
        roleId: 'role-financial-approver',
        roleName: 'Financial Approver',
        roleType: 'SOD_SENSITIVE',
        description: 'Financial transaction approval authority',
        permissions: ['FINANCIAL_APPROVE', 'BUDGET_MANAGE', 'COST_CENTER_MANAGE'],
        conflictingRoles: ['role-financial-requestor'],
        approvalRequired: true,
        riskLevel: 'HIGH',
        isActive: true,
        createdDate: new Date('2024-01-01'),
        modifiedDate: new Date('2024-01-01'),
        certificationRequired: true,
        certificationFrequencyDays: 180,
      },
      {
        roleId: 'role-financial-requestor',
        roleName: 'Financial Requestor',
        roleType: 'SOD_SENSITIVE',
        description: 'Financial transaction initiation',
        permissions: ['FINANCIAL_REQUEST', 'EXPENSE_SUBMIT', 'PURCHASE_REQUEST'],
        conflictingRoles: ['role-financial-approver'],
        approvalRequired: true,
        riskLevel: 'HIGH',
        isActive: true,
        createdDate: new Date('2024-01-01'),
        modifiedDate: new Date('2024-01-01'),
        certificationRequired: true,
        certificationFrequencyDays: 180,
      },
    ];

    sampleRoles.forEach(role => this.mockRoles.set(role.roleId, role));

    // Create sample users
    const sampleUsers: SaviyntUser[] = [
      {
        userId: 'user-john-doe',
        username: 'john.doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        employeeId: 'EMP001',
        department: 'Production',
        status: 'ACTIVE',
        accountType: 'EMPLOYEE',
        roles: ['role-production-operator'],
        permissions: [],
        groups: ['group-production', 'group-all-employees'],
        attributes: { location: 'Plant A', clearanceLevel: 'Standard' },
        createdDate: new Date('2024-01-15'),
        modifiedDate: new Date('2024-01-15'),
        mustChangePassword: false,
        failedLoginAttempts: 0,
        isLocked: false,
      },
      {
        userId: 'user-jane-smith',
        username: 'jane.smith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@company.com',
        employeeId: 'EMP002',
        department: 'Quality',
        manager: 'user-mike-manager',
        status: 'ACTIVE',
        accountType: 'EMPLOYEE',
        roles: ['role-quality-engineer'],
        permissions: [],
        groups: ['group-quality', 'group-all-employees'],
        attributes: { location: 'Plant A', clearanceLevel: 'Elevated' },
        createdDate: new Date('2024-01-10'),
        modifiedDate: new Date('2024-01-10'),
        mustChangePassword: false,
        failedLoginAttempts: 0,
        isLocked: false,
      },
    ];

    sampleUsers.forEach(user => this.mockUsers.set(user.userId, user));
  }

  /**
   * Provision a new user account
   */
  async provisionUser(userData: Partial<SaviyntUser>): Promise<{ success: boolean; userId?: string; errors?: string[] }> {
    try {
      const userId = userData.userId || `user-${crypto.randomUUID()}`;
      const username = userData.username || userData.email?.split('@')[0] || '';

      // Validate required fields
      const errors: string[] = [];
      if (!userData.firstName) errors.push('firstName is required');
      if (!userData.lastName) errors.push('lastName is required');
      if (!userData.email) errors.push('email is required');
      if (!username) errors.push('username is required');

      if (errors.length > 0) {
        return { success: false, errors };
      }

      // Check for duplicates
      const existingUser = Array.from(this.mockUsers.values()).find(
        u => u.username === username || u.email === userData.email
      );
      if (existingUser) {
        return { success: false, errors: ['User already exists with this username or email'] };
      }

      const newUser: SaviyntUser = {
        userId,
        username,
        firstName: userData.firstName!,
        lastName: userData.lastName!,
        email: userData.email!,
        employeeId: userData.employeeId,
        department: userData.department,
        manager: userData.manager,
        status: userData.status || 'ACTIVE',
        accountType: userData.accountType || 'EMPLOYEE',
        roles: userData.roles || [],
        permissions: userData.permissions || [],
        groups: userData.groups || ['group-all-employees'],
        attributes: userData.attributes || {},
        createdDate: new Date(),
        modifiedDate: new Date(),
        mustChangePassword: userData.mustChangePassword !== undefined ? userData.mustChangePassword : true,
        failedLoginAttempts: 0,
        isLocked: false,
      };

      this.mockUsers.set(userId, newUser);

      // Log audit event
      await this.logAuditEvent({
        eventType: 'USER_LOGIN',
        userId: 'system',
        targetUserId: userId,
        action: 'USER_PROVISIONED',
        result: 'SUCCESS',
        details: { userData: { ...userData, password: '[REDACTED]' } },
      });

      console.log(`User provisioned: ${username} (${userId})`);
      return { success: true, userId };
    } catch (error: any) {
      console.error('Failed to provision user:', error.message);
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Deprovision user account (disable/suspend)
   */
  async deprovisionUser(userId: string, reason?: string): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const user = this.mockUsers.get(userId);
      if (!user) {
        return { success: false, errors: ['User not found'] };
      }

      user.status = 'INACTIVE';
      user.modifiedDate = new Date();

      // Clear active tokens
      const userTokens = Array.from(this.mockTokens.entries()).filter(([_, token]) => token.userId === userId);
      userTokens.forEach(([tokenKey, _]) => this.mockTokens.delete(tokenKey));

      await this.logAuditEvent({
        eventType: 'USER_LOGOUT',
        userId: 'system',
        targetUserId: userId,
        action: 'USER_DEPROVISIONED',
        result: 'SUCCESS',
        details: { reason },
      });

      console.log(`User deprovisioned: ${user.username} (${userId})`);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to deprovision user:', error.message);
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Assign role to user with SoD validation
   */
  async assignRole(userId: string, roleId: string, assignedBy: string, justification?: string): Promise<{ success: boolean; errors?: string[]; sodConflicts?: SoDConflict[] }> {
    try {
      const user = this.mockUsers.get(userId);
      const role = this.mockRoles.get(roleId);

      if (!user) return { success: false, errors: ['User not found'] };
      if (!role) return { success: false, errors: ['Role not found'] };
      if (user.roles.includes(roleId)) return { success: false, errors: ['Role already assigned'] };

      // Check for SoD conflicts
      const sodConflicts: SoDConflict[] = [];
      if (this.config.enforceSoD && role.conflictingRoles) {
        const conflicts = role.conflictingRoles.filter(conflictRole => user.roles.includes(conflictRole));
        if (conflicts.length > 0) {
          const conflict: SoDConflict = {
            conflictId: `sod-${crypto.randomUUID()}`,
            userId,
            conflictType: 'ROLE_CONFLICT',
            conflictingRoles: [roleId, ...conflicts],
            riskLevel: 'HIGH',
            description: `SoD conflict detected: ${role.roleName} conflicts with existing roles`,
            detectedDate: new Date(),
            status: 'OPEN',
          };
          sodConflicts.push(conflict);
          this.sodConflicts.set(conflict.conflictId, conflict);
        }
      }

      // Assign role (even with SoD conflicts for testing purposes)
      user.roles.push(roleId);
      user.permissions.push(...role.permissions);
      user.modifiedDate = new Date();

      await this.logAuditEvent({
        eventType: 'ROLE_ASSIGNED',
        userId: assignedBy,
        targetUserId: userId,
        resourceId: roleId,
        action: 'ROLE_ASSIGNMENT',
        result: 'SUCCESS',
        riskScore: sodConflicts.length > 0 ? 8 : 3,
        details: { roleName: role.roleName, justification, sodConflicts: sodConflicts.length },
      });

      console.log(`Role assigned: ${role.roleName} to ${user.username} (SoD conflicts: ${sodConflicts.length})`);
      return { success: true, sodConflicts: sodConflicts.length > 0 ? sodConflicts : undefined };
    } catch (error: any) {
      console.error('Failed to assign role:', error.message);
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Generate OAuth access token
   */
  async generateOAuthToken(clientId: string, clientSecret: string, scopes: string[], userId?: string): Promise<{ success: boolean; token?: SaviyntToken; errors?: string[] }> {
    try {
      // Validate client credentials
      if (clientId !== this.config.clientId || clientSecret !== this.config.clientSecret) {
        return { success: false, errors: ['Invalid client credentials'] };
      }

      const accessToken = crypto.randomBytes(32).toString('hex');
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const expiresIn = (this.config.tokenExpirationMinutes || 60) * 60; // Convert to seconds

      const token: SaviyntToken = {
        accessToken,
        tokenType: 'Bearer',
        expiresIn,
        refreshToken,
        scope: scopes,
        issuedAt: new Date(),
        userId: userId || 'system',
        clientId,
        tenantId: this.config.tenantId,
      };

      this.mockTokens.set(accessToken, token);

      // Clean up expired tokens periodically
      this.cleanupExpiredTokens();

      console.log(`OAuth token generated for client ${clientId} (expires in ${expiresIn}s)`);
      return { success: true, token };
    } catch (error: any) {
      console.error('Failed to generate OAuth token:', error.message);
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Validate OAuth access token
   */
  async validateOAuthToken(accessToken: string): Promise<{ valid: boolean; token?: SaviyntToken; user?: SaviyntUser }> {
    try {
      const token = this.mockTokens.get(accessToken);
      if (!token) {
        return { valid: false };
      }

      // Check expiration
      const now = new Date();
      const tokenAge = (now.getTime() - token.issuedAt.getTime()) / 1000; // seconds
      if (tokenAge > token.expiresIn) {
        this.mockTokens.delete(accessToken);
        return { valid: false };
      }

      const user = token.userId !== 'system' ? this.mockUsers.get(token.userId) : undefined;
      return { valid: true, token, user };
    } catch (error: any) {
      console.error('Failed to validate OAuth token:', error.message);
      return { valid: false };
    }
  }

  /**
   * Generate SAML assertion
   */
  async generateSamlAssertion(userId: string, audience: string, attributes: Record<string, any> = {}): Promise<{ success: boolean; assertion?: SamlAssertion; errors?: string[] }> {
    try {
      const user = this.mockUsers.get(userId);
      if (!user) {
        return { success: false, errors: ['User not found'] };
      }

      const assertion: SamlAssertion = {
        assertionId: `saml-${crypto.randomUUID()}`,
        userId,
        nameId: user.email,
        issuer: `saviynt-${this.config.tenantId}`,
        audience,
        sessionIndex: crypto.randomUUID(),
        attributes: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          employeeId: user.employeeId,
          department: user.department,
          roles: user.roles,
          ...attributes,
        },
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
        signatureValid: true, // Mock signature validation
      };

      console.log(`SAML assertion generated for user ${user.username}`);
      return { success: true, assertion };
    } catch (error: any) {
      console.error('Failed to generate SAML assertion:', error.message);
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Get user by username or email
   */
  async getUser(identifier: string): Promise<SaviyntUser | null> {
    const user = Array.from(this.mockUsers.values()).find(
      u => u.username === identifier || u.email === identifier || u.userId === identifier
    );
    return user || null;
  }

  /**
   * Get users by department
   */
  async getUsersByDepartment(department: string): Promise<SaviyntUser[]> {
    return Array.from(this.mockUsers.values()).filter(u => u.department === department);
  }

  /**
   * Get role information
   */
  async getRole(roleId: string): Promise<SaviyntRole | null> {
    return this.mockRoles.get(roleId) || null;
  }

  /**
   * Get all roles for user
   */
  async getUserRoles(userId: string): Promise<SaviyntRole[]> {
    const user = this.mockUsers.get(userId);
    if (!user) return [];

    return user.roles.map(roleId => this.mockRoles.get(roleId)).filter(Boolean) as SaviyntRole[];
  }

  /**
   * Create access request
   */
  async createAccessRequest(request: Partial<AccessRequest>): Promise<{ success: boolean; requestId?: string; errors?: string[] }> {
    try {
      const requestId = `req-${crypto.randomUUID()}`;

      const accessRequest: AccessRequest = {
        requestId,
        requestType: request.requestType || 'ROLE_ASSIGNMENT',
        requestedFor: request.requestedFor!,
        requestedBy: request.requestedBy!,
        businessJustification: request.businessJustification || '',
        urgency: request.urgency || 'NORMAL',
        status: 'PENDING',
        requestDetails: request.requestDetails || {},
        approvalWorkflow: request.approvalWorkflow || [],
        requestDate: new Date(),
        comments: [],
      };

      this.mockRequests.set(requestId, accessRequest);

      await this.logAuditEvent({
        eventType: 'ACCESS_REQUESTED',
        userId: request.requestedBy!,
        targetUserId: request.requestedFor!,
        resourceId: requestId,
        action: 'ACCESS_REQUEST_CREATED',
        result: 'SUCCESS',
        details: { requestType: request.requestType, urgency: request.urgency },
      });

      console.log(`Access request created: ${requestId} for ${request.requestedFor}`);
      return { success: true, requestId };
    } catch (error: any) {
      console.error('Failed to create access request:', error.message);
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Get SoD conflicts for user
   */
  async getSoDConflicts(userId: string): Promise<SoDConflict[]> {
    return Array.from(this.sodConflicts.values()).filter(conflict => conflict.userId === userId);
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(eventData: Partial<AuditEvent>): Promise<void> {
    if (!this.config.enableAuditLogging) return;

    const event: AuditEvent = {
      eventId: `audit-${crypto.randomUUID()}`,
      eventType: eventData.eventType!,
      userId: eventData.userId,
      targetUserId: eventData.targetUserId,
      resourceId: eventData.resourceId,
      action: eventData.action!,
      result: eventData.result || 'SUCCESS',
      riskScore: eventData.riskScore,
      ipAddress: eventData.ipAddress,
      userAgent: eventData.userAgent,
      sessionId: eventData.sessionId,
      details: eventData.details || {},
      timestamp: new Date(),
    };

    this.auditEvents.push(event);

    // Keep only last 10000 events in memory for testing
    if (this.auditEvents.length > 10000) {
      this.auditEvents = this.auditEvents.slice(-5000);
    }
  }

  /**
   * Get audit events with filtering
   */
  async getAuditEvents(filters: {
    userId?: string;
    eventType?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  } = {}): Promise<AuditEvent[]> {
    let events = [...this.auditEvents];

    if (filters.userId) {
      events = events.filter(e => e.userId === filters.userId || e.targetUserId === filters.userId);
    }
    if (filters.eventType) {
      events = events.filter(e => e.eventType === filters.eventType);
    }
    if (filters.fromDate) {
      events = events.filter(e => e.timestamp >= filters.fromDate!);
    }
    if (filters.toDate) {
      events = events.filter(e => e.timestamp <= filters.toDate!);
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters.limit) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    const expiredTokens: string[] = [];

    for (const [tokenKey, token] of this.mockTokens.entries()) {
      const tokenAge = (now.getTime() - token.issuedAt.getTime()) / 1000;
      if (tokenAge > token.expiresIn) {
        expiredTokens.push(tokenKey);
      }
    }

    expiredTokens.forEach(tokenKey => this.mockTokens.delete(tokenKey));

    if (expiredTokens.length > 0) {
      console.log(`Cleaned up ${expiredTokens.length} expired tokens`);
    }
  }

  /**
   * Get health status for monitoring
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    mockMode: boolean;
    userCount: number;
    roleCount: number;
    activeTokens: number;
    auditEventCount: number;
    sodConflictCount: number;
  }> {
    return {
      status: 'healthy',
      mockMode: this.config.mockMode,
      userCount: this.mockUsers.size,
      roleCount: this.mockRoles.size,
      activeTokens: this.mockTokens.size,
      auditEventCount: this.auditEvents.length,
      sodConflictCount: this.sodConflicts.size,
    };
  }

  /**
   * Reset mock data (for testing)
   */
  async resetMockData(): Promise<void> {
    this.mockUsers.clear();
    this.mockRoles.clear();
    this.mockTokens.clear();
    this.mockRequests.clear();
    this.auditEvents.length = 0;
    this.sodConflicts.clear();
    this.initializeMockData();
    console.log('Mock data reset');
  }
}

export default SaviyntIDMSurrogate;