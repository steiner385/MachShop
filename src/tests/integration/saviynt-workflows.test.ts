import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaviyntService } from '../../services/SaviyntService';
import { SaviyntApiClient } from '../../services/SaviyntApiClient';
import { UserProvisioningService } from '../../services/UserProvisioningService';
import { UserDeprovisioningService } from '../../services/UserDeprovisioningService';
import { AttributeSynchronizationService } from '../../services/AttributeSynchronizationService';
import { RoleMappingService } from '../../services/RoleMappingService';
import { AccessCertificationExportService } from '../../services/AccessCertificationExportService';
import { SaviyntWebhookService } from '../../services/SaviyntWebhookService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  role: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  userRole: {
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  saviyntConfig: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  saviyntSyncLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  accessReview: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $disconnect: vi.fn(),
};

// Mock API responses
const mockApiClient = {
  authenticate: vi.fn(),
  getUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  getUserRoles: vi.fn(),
  assignRole: vi.fn(),
  revokeRole: vi.fn(),
  getUsers: vi.fn(),
  getRoles: vi.fn(),
  syncAttributes: vi.fn(),
  exportAccessData: vi.fn(),
  getBulkUsers: vi.fn(),
  bulkCreateUsers: vi.fn(),
  bulkUpdateUsers: vi.fn(),
  validateConnection: vi.fn(),
};

describe('Saviynt Integration Workflows', () => {
  let saviyntService: SaviyntService;
  let provisioningService: UserProvisioningService;
  let deprovisioningService: UserDeprovisioningService;
  let attributeService: AttributeSynchronizationService;
  let roleMappingService: RoleMappingService;
  let certificationService: AccessCertificationExportService;
  let webhookService: SaviyntWebhookService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize services with mocked dependencies
    saviyntService = new SaviyntService(mockPrisma as any);
    provisioningService = new UserProvisioningService(mockPrisma as any, mockApiClient as any);
    deprovisioningService = new UserDeprovisioningService(mockPrisma as any, mockApiClient as any);
    attributeService = new AttributeSynchronizationService(mockPrisma as any, mockApiClient as any);
    roleMappingService = new RoleMappingService(mockPrisma as any, mockApiClient as any);
    certificationService = new AccessCertificationExportService(mockPrisma as any, mockApiClient as any);
    webhookService = new SaviyntWebhookService(mockPrisma as any);

    // Set up default mocks
    mockApiClient.authenticate.mockResolvedValue({ success: true, token: 'test-token' });
    mockApiClient.validateConnection.mockResolvedValue({ status: 'healthy', latency: 50 });
    mockPrisma.saviyntConfig.findFirst.mockResolvedValue({
      id: 'config-1',
      baseUrl: 'https://saviynt.example.com',
      clientId: 'test-client',
      clientSecret: 'test-secret',
      enabled: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete User Provisioning Workflow', () => {
    it('should provision new user with roles and access from start to finish', async () => {
      // Arrange: New employee data
      const newEmployee = {
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@company.com',
        department: 'Engineering',
        jobTitle: 'Software Engineer',
        manager: 'jane.doe@company.com',
        startDate: new Date('2024-01-15'),
      };

      const provisioningRules = [
        {
          id: 'rule-1',
          name: 'Engineering Department Default Access',
          conditions: { department: 'Engineering' },
          actions: [
            { type: 'ASSIGN_ROLE', value: 'ENGINEER' },
            { type: 'ASSIGN_ROLE', value: 'DEVELOPER_TOOLS_ACCESS' },
          ],
        },
      ];

      // Mock Prisma responses
      mockPrisma.user.findFirst.mockResolvedValue(null); // User doesn't exist
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        ...newEmployee,
      });
      mockPrisma.role.findMany.mockResolvedValue([
        { id: 'role-1', name: 'ENGINEER', saviyntRoleId: 'sav-eng-001' },
        { id: 'role-2', name: 'DEVELOPER_TOOLS_ACCESS', saviyntRoleId: 'sav-dev-001' },
      ]);
      mockPrisma.userRole.create.mockResolvedValue({ userId: 'user-1', roleId: 'role-1' });

      // Mock Saviynt API responses
      mockApiClient.getUser.mockResolvedValue(null); // User doesn't exist in Saviynt
      mockApiClient.createUser.mockResolvedValue({
        id: 'sav-user-001',
        username: 'john.smith',
        email: 'john.smith@company.com',
        status: 'ACTIVE',
      });
      mockApiClient.assignRole.mockResolvedValue({ success: true });

      // Act: Execute complete provisioning workflow
      const provisioningResult = await provisioningService.processProvisioningRequest({
        requestId: 'req-001',
        requestType: 'NEW_HIRE',
        requestData: newEmployee,
        rules: provisioningRules,
      });

      // Wait for role assignments
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert: Verify complete workflow
      expect(provisioningResult.success).toBe(true);
      expect(provisioningResult.userId).toBe('user-1');
      expect(provisioningResult.saviyntUserId).toBe('sav-user-001');
      expect(provisioningResult.rolesAssigned).toEqual(['ENGINEER', 'DEVELOPER_TOOLS_ACCESS']);

      // Verify MES database operations
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          employeeId: 'EMP001',
          email: 'john.smith@company.com',
          saviyntUserId: 'sav-user-001',
        }),
      });

      // Verify Saviynt API calls
      expect(mockApiClient.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'john.smith',
          email: 'john.smith@company.com',
          department: 'Engineering',
        })
      );
      expect(mockApiClient.assignRole).toHaveBeenCalledTimes(2);

      // Verify audit trail
      expect(mockPrisma.saviyntSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operationType: 'USER_PROVISION',
          status: 'SUCCESS',
          affectedUsers: 1,
        }),
      });
    });

    it('should handle provisioning errors and rollback appropriately', async () => {
      // Arrange: Setup failure scenario
      const newEmployee = {
        employeeId: 'EMP002',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@company.com',
        department: 'Finance',
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'user-2', ...newEmployee });
      mockApiClient.createUser.mockRejectedValue(new Error('Saviynt API Error'));

      // Act: Execute provisioning with error
      const result = await provisioningService.processProvisioningRequest({
        requestId: 'req-002',
        requestType: 'NEW_HIRE',
        requestData: newEmployee,
        rules: [],
      });

      // Assert: Verify error handling and rollback
      expect(result.success).toBe(false);
      expect(result.error).toContain('Saviynt API Error');

      // Verify rollback occurred
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-2' } });

      // Verify error logging
      expect(mockPrisma.saviyntSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operationType: 'USER_PROVISION',
          status: 'FAILED',
          errorDetails: expect.stringContaining('Saviynt API Error'),
        }),
      });
    });
  });

  describe('Complete User Deprovisioning Workflow', () => {
    it('should deprovision user with access revocation and compliance reporting', async () => {
      // Arrange: Existing user to be deprovisioned
      const existingUser = {
        id: 'user-3',
        employeeId: 'EMP003',
        email: 'departing.user@company.com',
        saviyntUserId: 'sav-user-003',
        status: 'ACTIVE',
      };

      const userRoles = [
        { roleId: 'role-1', role: { name: 'MANAGER', saviyntRoleId: 'sav-mgr-001' } },
        { roleId: 'role-2', role: { name: 'FINANCE_ACCESS', saviyntRoleId: 'sav-fin-001' } },
      ];

      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.userRole.findMany.mockResolvedValue(userRoles);
      mockApiClient.getUser.mockResolvedValue({
        id: 'sav-user-003',
        status: 'ACTIVE',
        roles: ['sav-mgr-001', 'sav-fin-001'],
      });
      mockApiClient.revokeRole.mockResolvedValue({ success: true });
      mockApiClient.updateUser.mockResolvedValue({ success: true, status: 'INACTIVE' });

      // Act: Execute deprovisioning workflow
      const deprovisioningResult = await deprovisioningService.processDeprovisioningRequest({
        requestId: 'dep-001',
        userId: 'user-3',
        reason: 'TERMINATION',
        effectiveDate: new Date(),
        requestedBy: 'hr@company.com',
      });

      // Assert: Verify complete deprovisioning
      expect(deprovisioningResult.success).toBe(true);
      expect(deprovisioningResult.revokedRoles).toEqual(['MANAGER', 'FINANCE_ACCESS']);

      // Verify role revocations in Saviynt
      expect(mockApiClient.revokeRole).toHaveBeenCalledTimes(2);
      expect(mockApiClient.revokeRole).toHaveBeenCalledWith('sav-user-003', 'sav-mgr-001');
      expect(mockApiClient.revokeRole).toHaveBeenCalledWith('sav-user-003', 'sav-fin-001');

      // Verify user deactivation
      expect(mockApiClient.updateUser).toHaveBeenCalledWith('sav-user-003', {
        status: 'INACTIVE',
        terminationDate: expect.any(Date),
      });

      // Verify MES database updates
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-3' },
        data: { status: 'INACTIVE', terminationDate: expect.any(Date) },
      });

      // Verify compliance logging
      expect(mockPrisma.saviyntSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operationType: 'USER_DEPROVISION',
          status: 'SUCCESS',
          metadata: expect.objectContaining({
            reason: 'TERMINATION',
            rolesRevoked: 2,
          }),
        }),
      });
    });
  });

  describe('Attribute Synchronization Workflow', () => {
    it('should synchronize user attributes bidirectionally with conflict resolution', async () => {
      // Arrange: Users with different attributes in MES vs Saviynt
      const mesUsers = [
        {
          id: 'user-4',
          employeeId: 'EMP004',
          email: 'sync.user@company.com',
          department: 'Marketing',
          jobTitle: 'Marketing Manager',
          saviyntUserId: 'sav-user-004',
          lastSyncAt: new Date('2024-01-01'),
        },
      ];

      const saviyntUsers = [
        {
          id: 'sav-user-004',
          email: 'sync.user@company.com',
          department: 'Marketing',
          jobTitle: 'Senior Marketing Manager', // Conflict: different title
          lastModified: new Date('2024-01-15'), // More recent
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mesUsers);
      mockApiClient.getUsers.mockResolvedValue(saviyntUsers);
      mockApiClient.updateUser.mockResolvedValue({ success: true });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-4' });

      // Act: Execute attribute synchronization
      const syncResult = await attributeService.synchronizeAttributes({
        direction: 'BIDIRECTIONAL',
        conflictResolution: 'MOST_RECENT_WINS',
        dryRun: false,
      });

      // Assert: Verify synchronization results
      expect(syncResult.success).toBe(true);
      expect(syncResult.conflictsResolved).toBe(1);
      expect(syncResult.usersUpdated).toBe(1);

      // Verify MES was updated with more recent Saviynt data
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-4' },
        data: expect.objectContaining({
          jobTitle: 'Senior Marketing Manager',
          lastSyncAt: expect.any(Date),
        }),
      });

      // Verify sync logging
      expect(mockPrisma.saviyntSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operationType: 'ATTRIBUTE_SYNC',
          status: 'SUCCESS',
          metadata: expect.objectContaining({
            direction: 'BIDIRECTIONAL',
            conflictsResolved: 1,
          }),
        }),
      });
    });
  });

  describe('Role Mapping and RBAC Workflow', () => {
    it('should map roles and validate segregation of duties', async () => {
      // Arrange: Role mapping scenario
      const mesRoles = [
        { id: 'role-3', name: 'FINANCIAL_ANALYST', category: 'FINANCE' },
        { id: 'role-4', name: 'FINANCIAL_APPROVER', category: 'FINANCE' },
      ];

      const saviyntRoles = [
        { id: 'sav-fin-analyst', name: 'Finance_Analyst_Role' },
        { id: 'sav-fin-approver', name: 'Finance_Approver_Role' },
      ];

      const sodViolations = [
        {
          role1: 'FINANCIAL_ANALYST',
          role2: 'FINANCIAL_APPROVER',
          reason: 'Cannot have both analysis and approval access',
        },
      ];

      mockPrisma.role.findMany.mockResolvedValue(mesRoles);
      mockApiClient.getRoles.mockResolvedValue(saviyntRoles);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-5',
        userRoles: [{ roleId: 'role-3' }],
      });

      // Act: Execute role mapping and SOD validation
      const mappingResult = await roleMappingService.synchronizeRoles();
      const sodResult = await roleMappingService.validateSOD('user-5', 'role-4');

      // Assert: Verify role mapping
      expect(mappingResult.success).toBe(true);
      expect(mappingResult.rolesMapped).toBe(2);

      // Verify SOD violation detection
      expect(sodResult.hasViolation).toBe(true);
      expect(sodResult.violations).toHaveLength(1);
      expect(sodResult.violations[0].reason).toBe('Cannot have both analysis and approval access');
    });
  });

  describe('Access Certification Workflow', () => {
    it('should generate comprehensive access certification report', async () => {
      // Arrange: Users and roles for certification
      const certificationData = {
        users: [
          {
            id: 'user-6',
            email: 'cert.user@company.com',
            department: 'IT',
            userRoles: [
              { role: { name: 'ADMIN', permissions: ['READ', 'WRITE', 'DELETE'] } },
              { role: { name: 'BACKUP_OPERATOR', permissions: ['BACKUP', 'RESTORE'] } },
            ],
          },
        ],
        reviewPeriod: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      };

      mockPrisma.user.findMany.mockResolvedValue(certificationData.users);
      mockApiClient.exportAccessData.mockResolvedValue({
        users: [
          {
            id: 'sav-user-006',
            email: 'cert.user@company.com',
            roles: ['ADMIN_ROLE', 'BACKUP_ROLE'],
            lastLogin: new Date('2024-01-20'),
          },
        ],
      });

      // Mock file system operations
      const mockFs = {
        writeFileSync: vi.fn(),
      };
      vi.mock('fs', () => mockFs);

      // Act: Generate certification report
      const certResult = await certificationService.generateCertificationReport({
        format: 'XLSX',
        includePermissions: true,
        includeLastLogin: true,
        outputPath: '/tmp/certification-report.xlsx',
      });

      // Assert: Verify certification report generation
      expect(certResult.success).toBe(true);
      expect(certResult.totalUsers).toBe(1);
      expect(certResult.totalRoles).toBe(2);
      expect(certResult.filePath).toBe('/tmp/certification-report.xlsx');

      // Verify audit trail for certification
      expect(mockPrisma.accessReview.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reviewType: 'ACCESS_CERTIFICATION',
          status: 'COMPLETED',
          totalUsers: 1,
          filePath: '/tmp/certification-report.xlsx',
        }),
      });
    });
  });

  describe('Webhook Event Processing Workflow', () => {
    it('should process real-time Saviynt events and update MES accordingly', async () => {
      // Arrange: Webhook event payload
      const webhookPayload = {
        eventType: 'USER_ROLE_ASSIGNED',
        timestamp: new Date().toISOString(),
        data: {
          userId: 'sav-user-007',
          roleId: 'sav-new-role-001',
          roleName: 'PROJECT_MANAGER',
          assignedBy: 'admin@company.com',
        },
      };

      const webhookHeaders = {
        'x-saviynt-signature': 'sha256=test-signature',
        'content-type': 'application/json',
      };

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-7',
        saviyntUserId: 'sav-user-007',
      });
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'role-5',
        name: 'PROJECT_MANAGER',
        saviyntRoleId: 'sav-new-role-001',
      });
      mockPrisma.userRole.create.mockResolvedValue({
        userId: 'user-7',
        roleId: 'role-5',
      });

      // Act: Process webhook event
      const webhookResult = await webhookService.processWebhookEvent(
        webhookPayload,
        webhookHeaders
      );

      // Assert: Verify webhook processing
      expect(webhookResult.success).toBe(true);
      expect(webhookResult.eventType).toBe('USER_ROLE_ASSIGNED');

      // Verify MES database was updated
      expect(mockPrisma.userRole.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-7',
          roleId: 'role-5',
          assignedAt: expect.any(Date),
          assignedBy: 'admin@company.com',
        },
      });

      // Verify webhook processing was logged
      expect(mockPrisma.saviyntSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operationType: 'WEBHOOK_EVENT',
          status: 'SUCCESS',
          metadata: expect.objectContaining({
            eventType: 'USER_ROLE_ASSIGNED',
            processed: true,
          }),
        }),
      });
    });

    it('should handle webhook signature validation and reject invalid requests', async () => {
      // Arrange: Invalid webhook with bad signature
      const webhookPayload = {
        eventType: 'USER_UPDATED',
        data: { userId: 'sav-user-008' },
      };

      const invalidHeaders = {
        'x-saviynt-signature': 'sha256=invalid-signature',
        'content-type': 'application/json',
      };

      // Act: Process webhook with invalid signature
      const webhookResult = await webhookService.processWebhookEvent(
        webhookPayload,
        invalidHeaders
      );

      // Assert: Verify rejection
      expect(webhookResult.success).toBe(false);
      expect(webhookResult.error).toContain('Invalid signature');

      // Verify no database changes were made
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.userRole.create).not.toHaveBeenCalled();

      // Verify security event was logged
      expect(mockPrisma.saviyntSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operationType: 'WEBHOOK_EVENT',
          status: 'FAILED',
          errorDetails: expect.stringContaining('Invalid signature'),
        }),
      });
    });
  });

  describe('End-to-End Identity Governance Workflow', () => {
    it('should handle complete employee lifecycle from hire to termination', async () => {
      // Arrange: Complete employee lifecycle scenario
      const employee = {
        employeeId: 'EMP999',
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test.employee@company.com',
        department: 'Engineering',
        startDate: new Date('2024-01-01'),
      };

      // Setup mocks for complete lifecycle
      mockPrisma.user.findFirst
        .mockResolvedValueOnce(null) // Initial check - user doesn't exist
        .mockResolvedValueOnce({ id: 'user-999', ...employee, status: 'ACTIVE' }); // For deprovisioning

      mockPrisma.user.create.mockResolvedValue({ id: 'user-999', ...employee });
      mockApiClient.createUser.mockResolvedValue({ id: 'sav-user-999', status: 'ACTIVE' });
      mockApiClient.assignRole.mockResolvedValue({ success: true });
      mockApiClient.revokeRole.mockResolvedValue({ success: true });
      mockApiClient.updateUser.mockResolvedValue({ success: true });

      // Act 1: Hire employee (provisioning)
      const provisioningResult = await provisioningService.processProvisioningRequest({
        requestId: 'lifecycle-001',
        requestType: 'NEW_HIRE',
        requestData: employee,
        rules: [
          {
            id: 'eng-rule',
            conditions: { department: 'Engineering' },
            actions: [{ type: 'ASSIGN_ROLE', value: 'DEVELOPER' }],
          },
        ],
      });

      // Act 2: Periodic attribute synchronization
      await attributeService.synchronizeAttributes({
        direction: 'BIDIRECTIONAL',
        conflictResolution: 'MOST_RECENT_WINS',
      });

      // Act 3: Access certification
      await certificationService.generateCertificationReport({
        format: 'CSV',
        includePermissions: true,
      });

      // Act 4: Employee termination (deprovisioning)
      const deprovisioningResult = await deprovisioningService.processDeprovisioningRequest({
        requestId: 'lifecycle-002',
        userId: 'user-999',
        reason: 'TERMINATION',
        effectiveDate: new Date(),
      });

      // Assert: Verify complete lifecycle was handled correctly
      expect(provisioningResult.success).toBe(true);
      expect(deprovisioningResult.success).toBe(true);

      // Verify user was created and then deactivated
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-999' },
        data: expect.objectContaining({ status: 'INACTIVE' }),
      });

      // Verify Saviynt operations
      expect(mockApiClient.createUser).toHaveBeenCalled();
      expect(mockApiClient.assignRole).toHaveBeenCalled();
      expect(mockApiClient.revokeRole).toHaveBeenCalled();
      expect(mockApiClient.updateUser).toHaveBeenCalledWith('sav-user-999', {
        status: 'INACTIVE',
        terminationDate: expect.any(Date),
      });

      // Verify complete audit trail
      expect(mockPrisma.saviyntSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operationType: 'USER_PROVISION',
          status: 'SUCCESS',
        }),
      });
      expect(mockPrisma.saviyntSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          operationType: 'USER_DEPROVISION',
          status: 'SUCCESS',
        }),
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle service failures and maintain data consistency', async () => {
      // Arrange: Simulate various failure scenarios
      const testUser = { id: 'user-fail', saviyntUserId: 'sav-fail' };

      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockApiClient.updateUser
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ success: true }); // Retry succeeds

      // Act: Execute operation that fails initially
      const result = await attributeService.synchronizeAttributes({
        direction: 'MES_TO_SAVIYNT',
        retryFailures: true,
        maxRetries: 2,
      });

      // Assert: Verify retry mechanism worked
      expect(result.success).toBe(true);
      expect(result.retriedOperations).toBe(1);
      expect(mockApiClient.updateUser).toHaveBeenCalledTimes(2);

      // Verify error recovery was logged
      expect(mockPrisma.saviyntSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'SUCCESS',
          metadata: expect.objectContaining({
            retriedOperations: 1,
            initialFailures: 1,
          }),
        }),
      });
    });
  });
});