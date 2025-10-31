import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  UserProvisioningService,
  ProvisioningTrigger,
  ProvisioningActionType,
  ProvisioningRequestStatus,
  ApprovalStatus
} from '../../services/UserProvisioningService';
import { SaviyntService } from '../../services/SaviyntService';
import { SaviyntOperation } from '@prisma/client';

// Mock dependencies
vi.mock('@prisma/client');
vi.mock('../../services/SaviyntService');
vi.mock('../../config/config', () => ({
  config: {
    saviynt: {
      enabled: true
    }
  }
}));

describe('UserProvisioningService', () => {
  let service: UserProvisioningService;
  let mockPrisma: any;
  let mockSaviyntService: any;

  beforeEach(() => {
    // Mock Prisma client
    mockPrisma = {
      user: {
        findUnique: vi.fn()
      }
    };

    // Mock Saviynt service
    mockSaviyntService = {
      syncUser: vi.fn()
    };

    service = new UserProvisioningService(mockPrisma as PrismaClient, mockSaviyntService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize successfully when enabled', async () => {
      const loadRulesSpy = vi.spyOn(service as any, 'loadProvisioningRules').mockResolvedValue(undefined);
      const scheduleTasksSpy = vi.spyOn(service as any, 'schedulePeriodicTasks').mockResolvedValue(undefined);

      await service.initialize();

      expect(loadRulesSpy).toHaveBeenCalled();
      expect(scheduleTasksSpy).toHaveBeenCalled();
    });

    it('should skip initialization when disabled', async () => {
      service['isEnabled'] = false;

      const loadRulesSpy = vi.spyOn(service as any, 'loadProvisioningRules');
      const scheduleTasksSpy = vi.spyOn(service as any, 'schedulePeriodicTasks');

      await service.initialize();

      expect(loadRulesSpy).not.toHaveBeenCalled();
      expect(scheduleTasksSpy).not.toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      vi.spyOn(service as any, 'loadProvisioningRules').mockRejectedValue(new Error('Load failed'));

      await expect(service.initialize()).rejects.toThrow('Load failed');
    });
  });

  describe('Rule Loading', () => {
    it('should load default provisioning rules', async () => {
      await service['loadProvisioningRules']();

      const rules = service['rules'];
      expect(rules.size).toBeGreaterThan(0);
      expect(rules.has('auto-provision-new-user')).toBe(true);
      expect(rules.has('auto-sync-user-updates')).toBe(true);
      expect(rules.has('auto-deactivate-user')).toBe(true);
      expect(rules.has('role-assignment-sync')).toBe(true);
      expect(rules.has('privileged-role-approval')).toBe(true);
    });

    it('should validate rule structure', async () => {
      await service['loadProvisioningRules']();

      const rules = Array.from(service['rules'].values());

      rules.forEach(rule => {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('description');
        expect(rule).toHaveProperty('triggerEvent');
        expect(rule).toHaveProperty('actions');
        expect(rule).toHaveProperty('isActive');
        expect(rule).toHaveProperty('priority');
        expect(Array.isArray(rule.actions)).toBe(true);
        expect(typeof rule.isActive).toBe('boolean');
        expect(typeof rule.priority).toBe('number');
      });
    });
  });

  describe('User Event Handling', () => {
    beforeEach(async () => {
      await service['loadProvisioningRules']();
    });

    it('should handle user creation event', async () => {
      const userData = {
        id: 'user123',
        isActive: true,
        email: 'test@example.com'
      };

      const createRequestSpy = vi.spyOn(service as any, 'createProvisioningRequest')
        .mockResolvedValue({
          id: 'request123',
          userId: 'user123',
          trigger: ProvisioningTrigger.USER_CREATED,
          status: ProvisioningRequestStatus.PENDING
        });

      const processRequestSpy = vi.spyOn(service, 'processProvisioningRequest')
        .mockResolvedValue(undefined);

      const requests = await service.handleUserEvent(
        'user123',
        ProvisioningTrigger.USER_CREATED,
        userData,
        'admin'
      );

      expect(requests).toHaveLength(1);
      expect(createRequestSpy).toHaveBeenCalled();
      expect(processRequestSpy).toHaveBeenCalledWith('request123');
    });

    it('should handle user update event', async () => {
      const userData = {
        id: 'user123',
        isActive: true,
        email: 'updated@example.com'
      };

      vi.spyOn(service as any, 'createProvisioningRequest')
        .mockResolvedValue({
          id: 'request456',
          userId: 'user123',
          trigger: ProvisioningTrigger.USER_UPDATED
        });

      vi.spyOn(service, 'processProvisioningRequest').mockResolvedValue(undefined);

      const requests = await service.handleUserEvent(
        'user123',
        ProvisioningTrigger.USER_UPDATED,
        userData,
        'admin'
      );

      expect(requests).toHaveLength(1);
    });

    it('should skip processing when service disabled', async () => {
      service['isEnabled'] = false;

      const requests = await service.handleUserEvent(
        'user123',
        ProvisioningTrigger.USER_CREATED,
        {},
        'admin'
      );

      expect(requests).toHaveLength(0);
    });

    it('should handle no applicable rules found', async () => {
      const userData = {
        id: 'user123',
        isActive: false, // This will not match auto-provision rule conditions
        email: null
      };

      const requests = await service.handleUserEvent(
        'user123',
        ProvisioningTrigger.USER_CREATED,
        userData,
        'admin'
      );

      expect(requests).toHaveLength(0);
    });

    it('should handle event processing failure', async () => {
      const userData = {
        id: 'user123',
        isActive: true,
        email: 'test@example.com'
      };

      vi.spyOn(service as any, 'findApplicableRules').mockRejectedValue(new Error('Rule evaluation failed'));

      await expect(service.handleUserEvent(
        'user123',
        ProvisioningTrigger.USER_CREATED,
        userData,
        'admin'
      )).rejects.toThrow('Rule evaluation failed');
    });
  });

  describe('Rule Evaluation', () => {
    beforeEach(async () => {
      await service['loadProvisioningRules']();
    });

    it('should find applicable rules for user creation', async () => {
      const userData = {
        isActive: true,
        email: 'test@example.com'
      };

      const rules = await service['findApplicableRules'](ProvisioningTrigger.USER_CREATED, userData);

      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('auto-provision-new-user');
    });

    it('should find applicable rules for user updates', async () => {
      const userData = {
        isActive: true
      };

      const rules = await service['findApplicableRules'](ProvisioningTrigger.USER_UPDATED, userData);

      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('auto-sync-user-updates');
    });

    it('should find applicable rules for role assignments', async () => {
      const userData = {
        isActive: true
      };

      const rules = await service['findApplicableRules'](ProvisioningTrigger.ROLE_ASSIGNED, userData);

      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('role-assignment-sync');
    });

    it('should find privileged role approval rule', async () => {
      const userData = {
        isActive: true,
        roleCode: 'ADMIN'
      };

      const rules = await service['findApplicableRules'](ProvisioningTrigger.ROLE_ASSIGNED, userData);

      expect(rules).toHaveLength(2); // Both role-assignment-sync and privileged-role-approval
      expect(rules.some(rule => rule.id === 'privileged-role-approval')).toBe(true);
    });

    it('should sort rules by priority', async () => {
      const userData = {
        isActive: true,
        roleCode: 'ADMIN'
      };

      const rules = await service['findApplicableRules'](ProvisioningTrigger.ROLE_ASSIGNED, userData);

      // privileged-role-approval has priority 1, role-assignment-sync has priority 2
      expect(rules[0].id).toBe('privileged-role-approval');
      expect(rules[1].id).toBe('role-assignment-sync');
    });

    it('should skip inactive rules', async () => {
      // Disable a rule
      const rule = service['rules'].get('auto-provision-new-user');
      if (rule) {
        rule.isActive = false;
      }

      const userData = {
        isActive: true,
        email: 'test@example.com'
      };

      const rules = await service['findApplicableRules'](ProvisioningTrigger.USER_CREATED, userData);

      expect(rules).toHaveLength(0);
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate equals condition correctly', () => {
      const conditions = [{ field: 'isActive', operator: 'equals' as const, value: true }];
      const userData = { isActive: true };

      const result = service['evaluateConditions'](conditions, userData);
      expect(result).toBe(true);
    });

    it('should evaluate not_equals condition correctly', () => {
      const conditions = [{ field: 'status', operator: 'not_equals' as const, value: 'inactive' }];
      const userData = { status: 'active' };

      const result = service['evaluateConditions'](conditions, userData);
      expect(result).toBe(true);
    });

    it('should evaluate contains condition correctly', () => {
      const conditions = [{ field: 'email', operator: 'contains' as const, value: '@company.com' }];
      const userData = { email: 'user@company.com' };

      const result = service['evaluateConditions'](conditions, userData);
      expect(result).toBe(true);
    });

    it('should evaluate in condition correctly', () => {
      const conditions = [{ field: 'roleCode', operator: 'in' as const, value: ['ADMIN', 'MANAGER'] }];
      const userData = { roleCode: 'ADMIN' };

      const result = service['evaluateConditions'](conditions, userData);
      expect(result).toBe(true);
    });

    it('should evaluate exists condition correctly', () => {
      const conditions = [{ field: 'email', operator: 'exists' as const, value: null }];
      const userData = { email: 'test@example.com' };

      const result = service['evaluateConditions'](conditions, userData);
      expect(result).toBe(true);
    });

    it('should handle nested object paths', () => {
      const conditions = [{ field: 'profile.department', operator: 'equals' as const, value: 'IT' }];
      const userData = { profile: { department: 'IT' } };

      const result = service['evaluateConditions'](conditions, userData);
      expect(result).toBe(true);
    });

    it('should return false for unknown operators', () => {
      const conditions = [{ field: 'test', operator: 'unknown' as any, value: 'value' }];
      const userData = { test: 'value' };

      const result = service['evaluateConditions'](conditions, userData);
      expect(result).toBe(false);
    });
  });

  describe('Provisioning Request Processing', () => {
    beforeEach(async () => {
      await service['loadProvisioningRules']();
    });

    it('should create provisioning request without approval', async () => {
      const rule = service['rules'].get('auto-provision-new-user')!;

      const request = await service['createProvisioningRequest'](
        'user123',
        ProvisioningTrigger.USER_CREATED,
        rule,
        'admin'
      );

      expect(request.userId).toBe('user123');
      expect(request.trigger).toBe(ProvisioningTrigger.USER_CREATED);
      expect(request.ruleId).toBe('auto-provision-new-user');
      expect(request.status).toBe(ProvisioningRequestStatus.PENDING);
      expect(request.requestedBy).toBe('admin');
    });

    it('should create provisioning request with approval required', async () => {
      const rule = service['rules'].get('privileged-role-approval')!;

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'approver1',
        firstName: 'John',
        lastName: 'Manager'
      });

      const request = await service['createProvisioningRequest'](
        'user123',
        ProvisioningTrigger.ROLE_ASSIGNED,
        rule,
        'admin'
      );

      expect(request.status).toBe(ProvisioningRequestStatus.AWAITING_APPROVAL);
      expect(request.approvals).toBeDefined();
      expect(request.approvals!.length).toBeGreaterThan(0);
    });

    it('should process request without approval', async () => {
      const request = {
        id: 'request123',
        userId: 'user123',
        trigger: ProvisioningTrigger.USER_CREATED,
        ruleId: 'auto-provision-new-user',
        actions: [{
          type: ProvisioningActionType.PROVISION_USER,
          target: 'Saviynt',
          operation: 'createUser',
          parameters: {}
        }],
        status: ProvisioningRequestStatus.PENDING,
        priority: 1,
        requestedBy: 'admin',
        requestedAt: new Date(),
        executionLog: []
      };

      service['activeRequests'].set('request123', request);

      mockSaviyntService.syncUser.mockResolvedValue({ success: true });

      await service.processProvisioningRequest('request123');

      expect(request.status).toBe(ProvisioningRequestStatus.COMPLETED);
      expect(request.completedAt).toBeDefined();
      expect(mockSaviyntService.syncUser).toHaveBeenCalledWith(
        'user123',
        SaviyntOperation.PROVISION,
        'auto-provisioning'
      );
    });

    it('should handle request awaiting approval', async () => {
      const request = {
        id: 'request123',
        userId: 'user123',
        trigger: ProvisioningTrigger.ROLE_ASSIGNED,
        ruleId: 'privileged-role-approval',
        actions: [],
        status: ProvisioningRequestStatus.AWAITING_APPROVAL,
        priority: 1,
        requestedBy: 'admin',
        requestedAt: new Date(),
        approvals: [{
          id: 'approval1',
          requestId: 'request123',
          approverId: 'approver1',
          approverName: 'John Manager',
          status: ApprovalStatus.PENDING
        }],
        executionLog: []
      };

      service['activeRequests'].set('request123', request);

      await service.processProvisioningRequest('request123');

      expect(request.status).toBe(ProvisioningRequestStatus.AWAITING_APPROVAL);
    });

    it('should handle action execution failure', async () => {
      const request = {
        id: 'request123',
        userId: 'user123',
        trigger: ProvisioningTrigger.USER_CREATED,
        ruleId: 'auto-provision-new-user',
        actions: [{
          type: ProvisioningActionType.PROVISION_USER,
          target: 'Saviynt',
          operation: 'createUser',
          parameters: {}
        }],
        status: ProvisioningRequestStatus.PENDING,
        priority: 1,
        requestedBy: 'admin',
        requestedAt: new Date(),
        executionLog: []
      };

      service['activeRequests'].set('request123', request);

      mockSaviyntService.syncUser.mockRejectedValue(new Error('Provisioning failed'));

      await service.processProvisioningRequest('request123');

      expect(request.status).toBe(ProvisioningRequestStatus.FAILED);
      expect(request.errorMessage).toBe('Provisioning failed');
    });

    it('should handle request not found', async () => {
      await expect(service.processProvisioningRequest('nonexistent'))
        .rejects.toThrow('Provisioning request not found');
    });
  });

  describe('Action Execution', () => {
    it('should execute provision user action', async () => {
      const action = {
        type: ProvisioningActionType.PROVISION_USER,
        target: 'Saviynt',
        operation: 'createUser',
        parameters: {}
      };

      const step = {
        stepId: 'step1',
        action,
        status: 'PENDING' as const,
        retryCount: 0
      };

      mockSaviyntService.syncUser.mockResolvedValue({ success: true });

      await service['executeProvisioningAction']('user123', action, step);

      expect(mockSaviyntService.syncUser).toHaveBeenCalledWith(
        'user123',
        SaviyntOperation.PROVISION,
        'auto-provisioning'
      );
    });

    it('should execute deprovision user action', async () => {
      const action = {
        type: ProvisioningActionType.DEPROVISION_USER,
        target: 'Saviynt',
        operation: 'disableUser',
        parameters: {}
      };

      const step = {
        stepId: 'step1',
        action,
        status: 'PENDING' as const,
        retryCount: 0
      };

      mockSaviyntService.syncUser.mockResolvedValue({ success: true });

      await service['executeProvisioningAction']('user123', action, step);

      expect(mockSaviyntService.syncUser).toHaveBeenCalledWith(
        'user123',
        SaviyntOperation.DEPROVISION,
        'auto-provisioning'
      );
    });

    it('should execute sync attributes action', async () => {
      const action = {
        type: ProvisioningActionType.SYNC_ATTRIBUTES,
        target: 'Saviynt',
        operation: 'updateUser',
        parameters: {}
      };

      const step = {
        stepId: 'step1',
        action,
        status: 'PENDING' as const,
        retryCount: 0
      };

      mockSaviyntService.syncUser.mockResolvedValue({ success: true });

      await service['executeProvisioningAction']('user123', action, step);

      expect(mockSaviyntService.syncUser).toHaveBeenCalledWith(
        'user123',
        SaviyntOperation.SYNC,
        'auto-provisioning'
      );
    });

    it('should handle unsupported action type', async () => {
      const action = {
        type: 'UNSUPPORTED_ACTION' as any,
        target: 'Saviynt',
        operation: 'unknown',
        parameters: {}
      };

      const step = {
        stepId: 'step1',
        action,
        status: 'PENDING' as const,
        retryCount: 0
      };

      await expect(service['executeProvisioningAction']('user123', action, step))
        .rejects.toThrow('Unsupported action type');
    });
  });

  describe('Approval Management', () => {
    beforeEach(() => {
      const request = {
        id: 'request123',
        userId: 'user123',
        trigger: ProvisioningTrigger.ROLE_ASSIGNED,
        ruleId: 'privileged-role-approval',
        actions: [],
        status: ProvisioningRequestStatus.AWAITING_APPROVAL,
        priority: 1,
        requestedBy: 'admin',
        requestedAt: new Date(),
        approvals: [{
          id: 'approval1',
          requestId: 'request123',
          approverId: 'approver1',
          approverName: 'John Manager',
          status: ApprovalStatus.PENDING
        }],
        executionLog: []
      };

      service['activeRequests'].set('request123', request);
    });

    it('should approve request successfully', async () => {
      vi.spyOn(service, 'processProvisioningRequest').mockResolvedValue(undefined);

      await service.approveRequest('request123', 'approver1', 'Approved for valid business reason');

      const request = service['activeRequests'].get('request123')!;
      const approval = request.approvals![0];

      expect(approval.status).toBe(ApprovalStatus.APPROVED);
      expect(approval.decision).toBe('APPROVE');
      expect(approval.comments).toBe('Approved for valid business reason');
      expect(approval.decidedAt).toBeDefined();
    });

    it('should reject request successfully', async () => {
      await service.rejectRequest('request123', 'approver1', 'Insufficient business justification');

      const request = service['activeRequests'].get('request123')!;
      const approval = request.approvals![0];

      expect(approval.status).toBe(ApprovalStatus.REJECTED);
      expect(approval.decision).toBe('REJECT');
      expect(approval.comments).toBe('Insufficient business justification');
      expect(request.status).toBe(ProvisioningRequestStatus.REJECTED);
    });

    it('should handle approval for non-existent request', async () => {
      await expect(service.approveRequest('nonexistent', 'approver1'))
        .rejects.toThrow('Provisioning request not found');
    });

    it('should handle approval for non-existent approver', async () => {
      await expect(service.approveRequest('request123', 'unknown-approver'))
        .rejects.toThrow('Approval not found for approver');
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(() => {
      // Add some test requests
      const request1 = {
        id: 'request1',
        status: ProvisioningRequestStatus.COMPLETED,
        trigger: ProvisioningTrigger.USER_CREATED,
        requestedAt: new Date(Date.now() - 10000),
        completedAt: new Date()
      };

      const request2 = {
        id: 'request2',
        status: ProvisioningRequestStatus.PENDING,
        trigger: ProvisioningTrigger.USER_UPDATED,
        requestedAt: new Date()
      };

      service['activeRequests'].set('request1', request1 as any);
      service['activeRequests'].set('request2', request2 as any);
    });

    it('should return provisioning statistics', () => {
      const stats = service.getProvisioningStatistics();

      expect(stats.totalRequests).toBe(2);
      expect(stats.statusBreakdown[ProvisioningRequestStatus.COMPLETED]).toBe(1);
      expect(stats.statusBreakdown[ProvisioningRequestStatus.PENDING]).toBe(1);
      expect(stats.triggerBreakdown[ProvisioningTrigger.USER_CREATED]).toBe(1);
      expect(stats.triggerBreakdown[ProvisioningTrigger.USER_UPDATED]).toBe(1);
      expect(stats.activeRules).toBeGreaterThan(0);
    });

    it('should calculate average processing time correctly', () => {
      const stats = service.getProvisioningStatistics();

      expect(stats.averageProcessingTime).toBeGreaterThan(0);
      expect(stats.averageProcessingTime).toBeLessThan(20000); // Should be around 10 seconds
    });

    it('should return active requests', () => {
      const activeRequests = service.getActiveRequests();

      expect(activeRequests).toHaveLength(2);
      expect(activeRequests.some(req => req.id === 'request1')).toBe(true);
      expect(activeRequests.some(req => req.id === 'request2')).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should get nested object values correctly', () => {
      const obj = {
        user: {
          profile: {
            department: 'IT'
          }
        }
      };

      const value = service['getNestedValue'](obj, 'user.profile.department');
      expect(value).toBe('IT');
    });

    it('should handle missing nested paths gracefully', () => {
      const obj = {
        user: {}
      };

      const value = service['getNestedValue'](obj, 'user.profile.department');
      expect(value).toBeUndefined();
    });

    it('should calculate average processing time with no completed requests', () => {
      service['activeRequests'].clear();
      const result = service['calculateAverageProcessingTime']([]);
      expect(result).toBe(0);
    });
  });
});