import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaviyntIDMSurrogate } from '../../services/SaviyntIDMSurrogate';

describe('SaviyntIDMSurrogate', () => {
  let saviyntSurrogate: SaviyntIDMSurrogate;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      mockMode: true,
      tenantId: 'test-tenant',
      clientId: 'test-client',
      clientSecret: 'test-secret',
      tokenExpirationMinutes: 60,
      enableAuditLogging: true,
      enforceSoD: true,
      autoProvisioningEnabled: true,
    };

    saviyntSurrogate = new SaviyntIDMSurrogate(mockConfig);
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with configuration', () => {
      expect(saviyntSurrogate).toBeDefined();
    });

    it('should initialize with default values', () => {
      const minimalConfig = {
        mockMode: true,
        tenantId: 'test',
        clientId: 'client',
        clientSecret: 'secret',
      };

      const surrogateWithDefaults = new SaviyntIDMSurrogate(minimalConfig);
      expect(surrogateWithDefaults).toBeDefined();
    });

    it('should have sample data initialized', async () => {
      const health = await saviyntSurrogate.getHealthStatus();
      expect(health.userCount).toBeGreaterThan(0);
      expect(health.roleCount).toBeGreaterThan(0);
    });
  });

  describe('User Provisioning', () => {
    it('should provision a new user successfully', async () => {
      const userData = {
        username: 'test.user',
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@company.com',
        department: 'Engineering',
        accountType: 'EMPLOYEE' as const,
      };

      const result = await saviyntSurrogate.provisionUser(userData);

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should fail provisioning with missing required fields', async () => {
      const userData = {
        username: 'test.user',
        // Missing firstName, lastName, email
      };

      const result = await saviyntSurrogate.provisionUser(userData);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should prevent duplicate user provisioning', async () => {
      const userData = {
        username: 'duplicate.user',
        firstName: 'Duplicate',
        lastName: 'User',
        email: 'duplicate@company.com',
      };

      // First provisioning should succeed
      const result1 = await saviyntSurrogate.provisionUser(userData);
      expect(result1.success).toBe(true);

      // Second provisioning should fail
      const result2 = await saviyntSurrogate.provisionUser(userData);
      expect(result2.success).toBe(false);
      expect(result2.errors?.[0]).toContain('already exists');
    });

    it('should deprovision a user successfully', async () => {
      // First provision a user
      const userData = {
        username: 'deprovision.test',
        firstName: 'Deprovision',
        lastName: 'Test',
        email: 'deprovision@company.com',
      };

      const provisionResult = await saviyntSurrogate.provisionUser(userData);
      expect(provisionResult.success).toBe(true);

      // Then deprovision
      const deprovisionResult = await saviyntSurrogate.deprovisionUser(provisionResult.userId!, 'Test deprovisioning');
      expect(deprovisionResult.success).toBe(true);

      // Verify user is inactive
      const user = await saviyntSurrogate.getUser(provisionResult.userId!);
      expect(user?.status).toBe('INACTIVE');
    });

    it('should fail to deprovision non-existent user', async () => {
      const result = await saviyntSurrogate.deprovisionUser('non-existent-user');
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('User not found');
    });
  });

  describe('Role Management', () => {
    it('should assign role to user successfully', async () => {
      // Use existing sample user and role
      const user = await saviyntSurrogate.getUser('john.doe');
      expect(user).toBeDefined();

      const result = await saviyntSurrogate.assignRole(
        user!.userId,
        'role-quality-engineer',
        'test-admin',
        'Test assignment'
      );

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should detect SoD conflicts when assigning conflicting roles', async () => {
      // First provision a user
      const userData = {
        username: 'sod.test',
        firstName: 'SoD',
        lastName: 'Test',
        email: 'sod@company.com',
      };

      const provisionResult = await saviyntSurrogate.provisionUser(userData);
      expect(provisionResult.success).toBe(true);

      // Assign first role
      const assignment1 = await saviyntSurrogate.assignRole(
        provisionResult.userId!,
        'role-financial-approver',
        'test-admin'
      );
      expect(assignment1.success).toBe(true);

      // Assign conflicting role
      const assignment2 = await saviyntSurrogate.assignRole(
        provisionResult.userId!,
        'role-financial-requestor',
        'test-admin'
      );

      expect(assignment2.success).toBe(true); // Still succeeds for testing
      expect(assignment2.sodConflicts).toBeDefined();
      expect(assignment2.sodConflicts?.length).toBeGreaterThan(0);
    });

    it('should prevent assigning same role twice', async () => {
      const user = await saviyntSurrogate.getUser('john.doe');
      expect(user).toBeDefined();

      // First assignment should succeed
      const result1 = await saviyntSurrogate.assignRole(
        user!.userId,
        'role-production-operator',
        'test-admin'
      );
      expect(result1.success).toBe(false); // Already has this role

      // Second assignment should fail
      const result2 = await saviyntSurrogate.assignRole(
        user!.userId,
        'role-production-operator',
        'test-admin'
      );
      expect(result2.success).toBe(false);
      expect(result2.errors?.[0]).toContain('already assigned');
    });

    it('should get user roles successfully', async () => {
      const user = await saviyntSurrogate.getUser('john.doe');
      expect(user).toBeDefined();

      const roles = await saviyntSurrogate.getUserRoles(user!.userId);
      expect(roles).toBeDefined();
      expect(Array.isArray(roles)).toBe(true);
    });

    it('should get role information', async () => {
      const role = await saviyntSurrogate.getRole('role-quality-engineer');
      expect(role).toBeDefined();
      expect(role?.roleName).toBe('Quality Engineer');
      expect(role?.permissions).toBeDefined();
      expect(role?.permissions.length).toBeGreaterThan(0);
    });
  });

  describe('OAuth Token Management', () => {
    it('should generate OAuth token successfully', async () => {
      const result = await saviyntSurrogate.generateOAuthToken(
        mockConfig.clientId,
        mockConfig.clientSecret,
        ['read', 'write'],
        'test-user'
      );

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.token?.accessToken).toBeDefined();
      expect(result.token?.tokenType).toBe('Bearer');
      expect(result.token?.expiresIn).toBe(3600); // 60 minutes * 60 seconds
    });

    it('should fail OAuth token generation with invalid credentials', async () => {
      const result = await saviyntSurrogate.generateOAuthToken(
        'invalid-client',
        'invalid-secret',
        ['read'],
        'test-user'
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Invalid client credentials');
    });

    it('should validate OAuth token successfully', async () => {
      // Generate token first
      const tokenResult = await saviyntSurrogate.generateOAuthToken(
        mockConfig.clientId,
        mockConfig.clientSecret,
        ['read', 'write'],
        'test-user'
      );
      expect(tokenResult.success).toBe(true);

      // Validate token
      const validation = await saviyntSurrogate.validateOAuthToken(tokenResult.token!.accessToken);
      expect(validation.valid).toBe(true);
      expect(validation.token).toBeDefined();
    });

    it('should reject invalid OAuth token', async () => {
      const validation = await saviyntSurrogate.validateOAuthToken('invalid-token');
      expect(validation.valid).toBe(false);
      expect(validation.token).toBeUndefined();
    });

    it('should reject expired OAuth token', async () => {
      // Create surrogate with very short token expiration
      const shortConfig = {
        ...mockConfig,
        tokenExpirationMinutes: 0.001, // Very short for testing
      };
      const shortSurrogate = new SaviyntIDMSurrogate(shortConfig);

      const tokenResult = await shortSurrogate.generateOAuthToken(
        mockConfig.clientId,
        mockConfig.clientSecret,
        ['read'],
        'test-user'
      );
      expect(tokenResult.success).toBe(true);

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const validation = await shortSurrogate.validateOAuthToken(tokenResult.token!.accessToken);
      expect(validation.valid).toBe(false);
    });
  });

  describe('SAML Assertion Generation', () => {
    it('should generate SAML assertion successfully', async () => {
      const user = await saviyntSurrogate.getUser('john.doe');
      expect(user).toBeDefined();

      const result = await saviyntSurrogate.generateSamlAssertion(
        user!.userId,
        'https://mes.company.com',
        { customAttribute: 'testValue' }
      );

      expect(result.success).toBe(true);
      expect(result.assertion).toBeDefined();
      expect(result.assertion?.assertionId).toBeDefined();
      expect(result.assertion?.nameId).toBe(user!.email);
      expect(result.assertion?.attributes.customAttribute).toBe('testValue');
    });

    it('should fail SAML assertion for non-existent user', async () => {
      const result = await saviyntSurrogate.generateSamlAssertion(
        'non-existent-user',
        'https://mes.company.com'
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('User not found');
    });
  });

  describe('User Queries', () => {
    it('should get user by username', async () => {
      const user = await saviyntSurrogate.getUser('john.doe');
      expect(user).toBeDefined();
      expect(user?.username).toBe('john.doe');
      expect(user?.firstName).toBe('John');
    });

    it('should get user by email', async () => {
      const user = await saviyntSurrogate.getUser('john.doe@company.com');
      expect(user).toBeDefined();
      expect(user?.email).toBe('john.doe@company.com');
    });

    it('should return null for non-existent user', async () => {
      const user = await saviyntSurrogate.getUser('non.existent');
      expect(user).toBeNull();
    });

    it('should get users by department', async () => {
      const users = await saviyntSurrogate.getUsersByDepartment('Production');
      expect(users).toBeDefined();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      expect(users[0].department).toBe('Production');
    });

    it('should return empty array for non-existent department', async () => {
      const users = await saviyntSurrogate.getUsersByDepartment('NonExistent');
      expect(users).toBeDefined();
      expect(users.length).toBe(0);
    });
  });

  describe('Access Request Management', () => {
    it('should create access request successfully', async () => {
      const requestData = {
        requestType: 'ROLE_ASSIGNMENT' as const,
        requestedFor: 'user-john-doe',
        requestedBy: 'user-manager',
        businessJustification: 'Need access for project work',
        urgency: 'NORMAL' as const,
      };

      const result = await saviyntSurrogate.createAccessRequest(requestData);
      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
    });
  });

  describe('SoD Conflict Management', () => {
    it('should get SoD conflicts for user', async () => {
      // First create conflicts by assigning conflicting roles
      const userData = {
        username: 'conflict.user',
        firstName: 'Conflict',
        lastName: 'User',
        email: 'conflict@company.com',
      };

      const provisionResult = await saviyntSurrogate.provisionUser(userData);
      expect(provisionResult.success).toBe(true);

      // Assign conflicting roles
      await saviyntSurrogate.assignRole(provisionResult.userId!, 'role-financial-approver', 'admin');
      await saviyntSurrogate.assignRole(provisionResult.userId!, 'role-financial-requestor', 'admin');

      // Get conflicts
      const conflicts = await saviyntSurrogate.getSoDConflicts(provisionResult.userId!);
      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
      expect(conflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Audit Events', () => {
    it('should log and retrieve audit events', async () => {
      // Perform some action that generates audit events
      const userData = {
        username: 'audit.test',
        firstName: 'Audit',
        lastName: 'Test',
        email: 'audit@company.com',
      };

      await saviyntSurrogate.provisionUser(userData);

      // Retrieve audit events
      const events = await saviyntSurrogate.getAuditEvents({
        eventType: 'USER_LOGIN',
        limit: 10,
      });

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });

    it('should filter audit events by user', async () => {
      const events = await saviyntSurrogate.getAuditEvents({
        userId: 'system',
        limit: 5,
      });

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });

    it('should filter audit events by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const events = await saviyntSurrogate.getAuditEvents({
        fromDate: oneHourAgo,
        toDate: now,
        limit: 10,
      });

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Health Status', () => {
    it('should return health status', async () => {
      const health = await saviyntSurrogate.getHealthStatus();

      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.mockMode).toBe(true);
      expect(typeof health.userCount).toBe('number');
      expect(typeof health.roleCount).toBe('number');
      expect(typeof health.activeTokens).toBe('number');
      expect(typeof health.auditEventCount).toBe('number');
      expect(typeof health.sodConflictCount).toBe('number');
    });
  });

  describe('Mock Data Reset', () => {
    it('should reset mock data successfully', async () => {
      // Add some test data
      const userData = {
        username: 'reset.test',
        firstName: 'Reset',
        lastName: 'Test',
        email: 'reset@company.com',
      };

      await saviyntSurrogate.provisionUser(userData);

      const beforeHealth = await saviyntSurrogate.getHealthStatus();
      const beforeUserCount = beforeHealth.userCount;

      // Reset data
      await saviyntSurrogate.resetMockData();

      const afterHealth = await saviyntSurrogate.getHealthStatus();
      expect(afterHealth.userCount).toBeLessThan(beforeUserCount);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid role assignment gracefully', async () => {
      const result = await saviyntSurrogate.assignRole(
        'non-existent-user',
        'non-existent-role',
        'admin'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle token generation errors gracefully', async () => {
      const result = await saviyntSurrogate.generateOAuthToken('', '', []);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});