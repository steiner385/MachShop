import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  UserDeprovisioningService,
  DeprovisioningTrigger,
  DeprovisioningActionType,
  DeprovisioningRequestStatus,
  ApprovalStatus
} from '../../services/UserDeprovisioningService';
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

describe('UserDeprovisioningService', () => {
  let service: UserDeprovisioningService;
  let mockPrisma: any;
  let mockSaviyntService: any;

  beforeEach(() => {
    // Mock Prisma client
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn()
      },
      userRole: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        create: vi.fn()
      },
      userSiteRole: {
        deleteMany: vi.fn()
      }
    };

    // Mock Saviynt service
    mockSaviyntService = {
      syncUser: vi.fn()
    };

    service = new UserDeprovisioningService(mockPrisma as PrismaClient, mockSaviyntService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize successfully when enabled', async () => {
      const loadRulesSpy = vi.spyOn(service as any, 'loadDeprovisioningRules').mockResolvedValue(undefined);
      const loadRequestsSpy = vi.spyOn(service as any, 'loadPendingRequests').mockResolvedValue(undefined);
      const scheduleTasksSpy = vi.spyOn(service as any, 'schedulePeriodicTasks').mockResolvedValue(undefined);

      await service.initialize();

      expect(loadRulesSpy).toHaveBeenCalled();
      expect(loadRequestsSpy).toHaveBeenCalled();
      expect(scheduleTasksSpy).toHaveBeenCalled();
    });

    it('should skip initialization when disabled', async () => {
      service['isEnabled'] = false;

      const loadRulesSpy = vi.spyOn(service as any, 'loadDeprovisioningRules');
      const loadRequestsSpy = vi.spyOn(service as any, 'loadPendingRequests');
      const scheduleTasksSpy = vi.spyOn(service as any, 'schedulePeriodicTasks');

      await service.initialize();

      expect(loadRulesSpy).not.toHaveBeenCalled();
      expect(loadRequestsSpy).not.toHaveBeenCalled();
      expect(scheduleTasksSpy).not.toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      vi.spyOn(service as any, 'loadDeprovisioningRules').mockRejectedValue(new Error('Load failed'));

      await expect(service.initialize()).rejects.toThrow('Load failed');
    });
  });

  describe('Rule Loading', () => {
    it('should load default deprovisioning rules', async () => {
      await service['loadDeprovisioningRules']();

      const rules = service['rules'];
      expect(rules.size).toBeGreaterThan(0);
      expect(rules.has('immediate-security-disable')).toBe(true);
      expect(rules.has('standard-termination')).toBe(true);
      expect(rules.has('dormant-account-cleanup')).toBe(true);
      expect(rules.has('compliance-violation-response')).toBe(true);
    });

    it('should validate rule structure', async () => {
      await service['loadDeprovisioningRules']();

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

    it('should include grace period and data retention settings', async () => {
      await service['loadDeprovisioningRules']();

      const standardTermination = service['rules'].get('standard-termination');
      expect(standardTermination?.gracePeriodDays).toBe(1);
      expect(standardTermination?.dataRetentionDays).toBe(90);

      const dormantCleanup = service['rules'].get('dormant-account-cleanup');
      expect(dormantCleanup?.gracePeriodDays).toBe(7);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await service['loadDeprovisioningRules']();
    });

    it('should handle security incident event', async () => {
      const userData = {
        id: 'user123',
        isActive: true
      };

      const createRequestSpy = vi.spyOn(service as any, 'createDeprovisioningRequest')
        .mockResolvedValue({
          id: 'request123',
          userId: 'user123',
          trigger: DeprovisioningTrigger.SECURITY_INCIDENT,
          status: DeprovisioningRequestStatus.PENDING
        });

      const scheduleRequestSpy = vi.spyOn(service as any, 'scheduleDeprovisioningRequest')
        .mockResolvedValue(undefined);

      const requests = await service.handleDeprovisioningEvent(
        'user123',
        DeprovisioningTrigger.SECURITY_INCIDENT,
        userData,
        'security-admin',
        'Suspicious activity detected'
      );

      expect(requests).toHaveLength(1);
      expect(createRequestSpy).toHaveBeenCalled();
      expect(scheduleRequestSpy).toHaveBeenCalledWith('request123');
    });

    it('should handle user termination event', async () => {
      const userData = {
        id: 'user123',
        isActive: true,
        terminationDate: new Date()
      };

      vi.spyOn(service as any, 'createDeprovisioningRequest')
        .mockResolvedValue({
          id: 'request456',
          userId: 'user123',
          trigger: DeprovisioningTrigger.USER_TERMINATION
        });

      vi.spyOn(service as any, 'scheduleDeprovisioningRequest').mockResolvedValue(undefined);

      const requests = await service.handleDeprovisioningEvent(
        'user123',
        DeprovisioningTrigger.USER_TERMINATION,
        userData,
        'hr-manager',
        'Employee resigned'
      );

      expect(requests).toHaveLength(1);
    });

    it('should handle dormant account event with conditions', async () => {
      const userData = {
        id: 'user123',
        isActive: true,
        lastLoginAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) // 100 days ago
      };

      vi.spyOn(service as any, 'createDeprovisioningRequest')
        .mockResolvedValue({
          id: 'request789',
          userId: 'user123',
          trigger: DeprovisioningTrigger.DORMANT_ACCOUNT
        });

      vi.spyOn(service as any, 'scheduleDeprovisioningRequest').mockResolvedValue(undefined);

      const requests = await service.handleDeprovisioningEvent(
        'user123',
        DeprovisioningTrigger.DORMANT_ACCOUNT,
        userData,
        'system-automated'
      );

      expect(requests).toHaveLength(1);
    });

    it('should skip processing when service disabled', async () => {
      service['isEnabled'] = false;

      const requests = await service.handleDeprovisioningEvent(
        'user123',
        DeprovisioningTrigger.SECURITY_INCIDENT,
        {},
        'admin'
      );

      expect(requests).toHaveLength(0);
    });

    it('should handle no applicable rules found', async () => {
      const userData = {
        id: 'user123',
        isActive: false,
        lastLoginAt: new Date() // Recent login
      };

      const requests = await service.handleDeprovisioningEvent(
        'user123',
        DeprovisioningTrigger.DORMANT_ACCOUNT,
        userData,
        'system'
      );

      expect(requests).toHaveLength(0);
    });
  });

  describe('Rule Evaluation', () => {
    beforeEach(async () => {
      await service['loadDeprovisioningRules']();
    });

    it('should find applicable rules for security incident', async () => {
      const userData = { isActive: true };

      const rules = await service['findApplicableRules'](DeprovisioningTrigger.SECURITY_INCIDENT, userData);

      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('immediate-security-disable');
    });

    it('should find applicable rules for user termination', async () => {
      const userData = { isActive: true };

      const rules = await service['findApplicableRules'](DeprovisioningTrigger.USER_TERMINATION, userData);

      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('standard-termination');
    });

    it('should find applicable rules for dormant account', async () => {
      const userData = {
        isActive: true,
        lastLoginAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) // 100 days ago
      };

      // Mock getNestedValue to return days since last login
      vi.spyOn(service as any, 'getNestedValue').mockImplementation((obj, path) => {
        if (path === 'lastLoginAt') {
          const daysSince = Math.floor((Date.now() - obj.lastLoginAt.getTime()) / (24 * 60 * 60 * 1000));
          return daysSince;
        }
        return obj[path];
      });

      const rules = await service['findApplicableRules'](DeprovisioningTrigger.DORMANT_ACCOUNT, userData);

      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('dormant-account-cleanup');
    });

    it('should sort rules by priority', async () => {
      const userData = { isActive: true };

      const rules = await service['findApplicableRules'](DeprovisioningTrigger.COMPLIANCE_VIOLATION, userData);

      expect(rules).toHaveLength(1);
      expect(rules[0].priority).toBe(1);
    });
  });

  describe('Condition Evaluation', () => {
    it('should evaluate greater_than condition correctly', () => {
      const conditions = [{ field: 'daysSinceLogin', operator: 'greater_than' as const, value: 90 }];
      const userData = { daysSinceLogin: 100 };

      const result = service['evaluateConditions'](conditions, userData);
      expect(result).toBe(true);
    });

    it('should evaluate less_than condition correctly', () => {
      const conditions = [{ field: 'daysSinceLogin', operator: 'less_than' as const, value: 90 }];
      const userData = { daysSinceLogin: 80 };

      const result = service['evaluateConditions'](conditions, userData);
      expect(result).toBe(true);
    });

    it('should handle multiple conditions with AND logic', () => {
      const conditions = [
        { field: 'isActive', operator: 'equals' as const, value: true },
        { field: 'daysSinceLogin', operator: 'greater_than' as const, value: 90 }
      ];
      const userData = { isActive: true, daysSinceLogin: 100 };

      const result = service['evaluateConditions'](conditions, userData);
      expect(result).toBe(true);
    });

    it('should return false when any condition fails', () => {
      const conditions = [
        { field: 'isActive', operator: 'equals' as const, value: true },
        { field: 'daysSinceLogin', operator: 'greater_than' as const, value: 90 }
      ];
      const userData = { isActive: false, daysSinceLogin: 100 };

      const result = service['evaluateConditions'](conditions, userData);
      expect(result).toBe(false);
    });
  });

  describe('Request Creation', () => {
    beforeEach(async () => {
      await service['loadDeprovisioningRules']();
    });

    it('should create request with immediate execution', async () => {
      const rule = service['rules'].get('immediate-security-disable')!;

      const request = await service['createDeprovisioningRequest'](
        'user123',
        DeprovisioningTrigger.SECURITY_INCIDENT,
        rule,
        'security-admin',
        'Security breach detected'
      );

      expect(request.userId).toBe('user123');
      expect(request.trigger).toBe(DeprovisioningTrigger.SECURITY_INCIDENT);
      expect(request.ruleId).toBe('immediate-security-disable');
      expect(request.status).toBe(DeprovisioningRequestStatus.PENDING);
      expect(request.actions).toHaveLength(rule.actions.length);
      expect(request.actions.every(action => action.executed === false)).toBe(true);
    });

    it('should create request with grace period', async () => {
      const rule = service['rules'].get('standard-termination')!;

      const request = await service['createDeprovisioningRequest'](
        'user123',
        DeprovisioningTrigger.USER_TERMINATION,
        rule,
        'hr-manager'
      );

      expect(request.status).toBe(DeprovisioningRequestStatus.IN_GRACE_PERIOD);
      expect(request.gracePeriodEndDate).toBeDefined();
      expect(request.gracePeriodEndDate!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create request with approval requirements', async () => {
      const rule = service['rules'].get('standard-termination')!;

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'manager1',
        firstName: 'John',
        lastName: 'Manager'
      });

      const request = await service['createDeprovisioningRequest'](
        'user123',
        DeprovisioningTrigger.USER_TERMINATION,
        rule,
        'hr-manager'
      );

      expect(request.approvals).toBeDefined();
      expect(request.approvals!.length).toBeGreaterThan(0);
    });

    it('should schedule actions with correct timing', async () => {
      const rule = service['rules'].get('standard-termination')!;

      const request = await service['createDeprovisioningRequest'](
        'user123',
        DeprovisioningTrigger.USER_TERMINATION,
        rule,
        'hr-manager'
      );

      const immediateActions = request.actions.filter(action => action.executeAfterDays === 0);
      const delayedActions = request.actions.filter(action => action.executeAfterDays! > 0);

      expect(immediateActions.length).toBeGreaterThan(0);
      expect(delayedActions.length).toBeGreaterThan(0);

      // Check that scheduled dates are correct
      delayedActions.forEach(action => {
        expect(action.scheduledFor.getTime()).toBeGreaterThan(Date.now());
      });
    });
  });

  describe('Action Execution', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        isActive: true,
        terminationDate: null
      });

      mockPrisma.userRole.findMany.mockResolvedValue([
        { id: 'ur1', userId: 'user123', roleId: 'role1', role: { roleCode: 'USER' } },
        { id: 'ur2', userId: 'user123', roleId: 'role2', role: { roleCode: 'ADMIN' } }
      ]);
    });

    it('should execute disable user account action', async () => {
      const action = {
        type: DeprovisioningActionType.DISABLE_USER_ACCOUNT,
        target: 'MES',
        operation: 'disableUser',
        parameters: { immediate: true }
      };

      const step = {
        stepId: 'step1',
        action,
        status: 'PENDING' as const,
        retryCount: 0
      };

      await service['executeDeprovisioningAction']('user123', action, step);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          isActive: false,
          terminationDate: expect.any(Date)
        }
      });

      expect(step.reversalData).toBeDefined();
      expect(step.reversalData.previousState).toBeDefined();
    });

    it('should execute revoke all access action', async () => {
      const action = {
        type: DeprovisioningActionType.REVOKE_ALL_ACCESS,
        target: 'All Systems',
        operation: 'revokeAccess',
        parameters: { scope: 'all' }
      };

      const step = {
        stepId: 'step1',
        action,
        status: 'PENDING' as const,
        retryCount: 0
      };

      await service['executeDeprovisioningAction']('user123', action, step);

      expect(mockPrisma.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user123' }
      });

      expect(mockPrisma.userSiteRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user123' }
      });

      expect(step.reversalData).toBeDefined();
      expect(step.reversalData.previousRoles).toBeDefined();
    });

    it('should execute revoke specific roles action', async () => {
      const action = {
        type: DeprovisioningActionType.REVOKE_SPECIFIC_ROLES,
        target: 'MES',
        operation: 'revokeRoles',
        parameters: { roleTypes: ['ADMIN'] }
      };

      const step = {
        stepId: 'step1',
        action,
        status: 'PENDING' as const,
        retryCount: 0
      };

      mockPrisma.userRole.findMany.mockResolvedValue([
        { id: 'ur2', userId: 'user123', roleId: 'role2', role: { roleCode: 'ADMIN' } }
      ]);

      await service['executeDeprovisioningAction']('user123', action, step);

      expect(mockPrisma.userRole.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          roleId: { in: ['role2'] }
        }
      });
    });

    it('should execute Saviynt disable account action', async () => {
      const action = {
        type: DeprovisioningActionType.DISABLE_SAVIYNT_ACCOUNT,
        target: 'Saviynt',
        operation: 'disableUser',
        parameters: { immediate: true }
      };

      const step = {
        stepId: 'step1',
        action,
        status: 'PENDING' as const,
        retryCount: 0
      };

      mockSaviyntService.syncUser.mockResolvedValue({ success: true });

      await service['executeDeprovisioningAction']('user123', action, step);

      expect(mockSaviyntService.syncUser).toHaveBeenCalledWith(
        'user123',
        SaviyntOperation.DEPROVISION,
        'auto-deprovisioning'
      );
    });

    it('should execute backup user data action', async () => {
      const action = {
        type: DeprovisioningActionType.BACKUP_USER_DATA,
        target: 'DataBackup',
        operation: 'backupUserData',
        parameters: { includePersonalFiles: true }
      };

      const step = {
        stepId: 'step1',
        action,
        status: 'PENDING' as const,
        retryCount: 0
      };

      await service['executeDeprovisioningAction']('user123', action, step);

      expect(step.result).toBeDefined();
      expect(step.result.backupId).toMatch(/backup-\d+/);
      expect(step.result.includePersonalFiles).toBe(true);
    });

    it('should handle unsupported action type', async () => {
      const action = {
        type: 'UNSUPPORTED_ACTION' as any,
        target: 'Unknown',
        operation: 'unknown',
        parameters: {}
      };

      const step = {
        stepId: 'step1',
        action,
        status: 'PENDING' as const,
        retryCount: 0
      };

      await expect(service['executeDeprovisioningAction']('user123', action, step))
        .rejects.toThrow('Unsupported action type');
    });
  });

  describe('Request Scheduling', () => {
    beforeEach(async () => {
      await service['loadDeprovisioningRules']();
    });

    it('should schedule immediate actions', async () => {
      const request = {
        id: 'request123',
        userId: 'user123',
        actions: [
          {
            type: DeprovisioningActionType.NOTIFY_STAKEHOLDERS,
            executeAfterDays: 0,
            executed: false,
            requiresApproval: false,
            scheduledFor: new Date()
          },
          {
            type: DeprovisioningActionType.DISABLE_USER_ACCOUNT,
            executeAfterDays: 1,
            executed: false,
            requiresApproval: false,
            scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        ]
      };

      service['activeRequests'].set('request123', request as any);

      const executeActionsSpy = vi.spyOn(service as any, 'executeScheduledActions')
        .mockResolvedValue(undefined);

      await service['scheduleDeprovisioningRequest']('request123');

      expect(executeActionsSpy).toHaveBeenCalledWith('request123', [request.actions[0]]);
    });

    it('should schedule future actions with setTimeout', async () => {
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now
      const request = {
        id: 'request123',
        actions: [
          {
            type: DeprovisioningActionType.DISABLE_USER_ACCOUNT,
            executeAfterDays: 1,
            executed: false,
            scheduledFor: futureDate
          }
        ]
      };

      service['activeRequests'].set('request123', request as any);

      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      await service['scheduleDeprovisioningRequest']('request123');

      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(service['scheduledActions'].has('request123-DISABLE_USER_ACCOUNT')).toBe(true);

      vi.useRealTimers();
    });

    it('should handle request not found', async () => {
      await expect(service['scheduleDeprovisioningRequest']('nonexistent'))
        .rejects.toThrow('Deprovisioning request not found');
    });
  });

  describe('Request Cancellation', () => {
    beforeEach(() => {
      const request = {
        id: 'request123',
        userId: 'user123',
        actions: [
          { type: DeprovisioningActionType.DISABLE_USER_ACCOUNT },
          { type: DeprovisioningActionType.REVOKE_ALL_ACCESS }
        ],
        status: DeprovisioningRequestStatus.PENDING
      };

      service['activeRequests'].set('request123', request as any);

      // Mock scheduled actions
      service['scheduledActions'].set('request123-DISABLE_USER_ACCOUNT', setTimeout(() => {}, 1000) as any);
      service['scheduledActions'].set('request123-REVOKE_ALL_ACCESS', setTimeout(() => {}, 2000) as any);
    });

    it('should cancel request and clear scheduled actions', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      await service.cancelRequest('request123', 'admin', 'Request no longer needed');

      const request = service['activeRequests'].get('request123')!;
      expect(request.status).toBe(DeprovisioningRequestStatus.CANCELLED);
      expect(request.errorMessage).toContain('Cancelled by admin');

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
      expect(service['scheduledActions'].size).toBe(0);
    });

    it('should handle cancel request not found', async () => {
      await expect(service.cancelRequest('nonexistent', 'admin', 'reason'))
        .rejects.toThrow('Deprovisioning request not found');
    });
  });

  describe('Request Reversal', () => {
    beforeEach(() => {
      const request = {
        id: 'request123',
        userId: 'user123',
        status: DeprovisioningRequestStatus.COMPLETED,
        actions: [
          {
            type: DeprovisioningActionType.DISABLE_USER_ACCOUNT,
            isReversible: true
          },
          {
            type: DeprovisioningActionType.REVOKE_ALL_ACCESS,
            isReversible: true
          },
          {
            type: DeprovisioningActionType.DELETE_USER_DATA,
            isReversible: false
          }
        ],
        executionLog: [
          {
            action: { type: DeprovisioningActionType.DISABLE_USER_ACCOUNT },
            status: 'COMPLETED',
            reversalData: {
              previousState: { isActive: true, terminationDate: null }
            }
          },
          {
            action: { type: DeprovisioningActionType.REVOKE_ALL_ACCESS },
            status: 'COMPLETED',
            reversalData: {
              previousRoles: [
                { roleId: 'role1', assignedAt: new Date(), assignedBy: 'admin' }
              ]
            }
          }
        ]
      };

      service['activeRequests'].set('request123', request as any);
    });

    it('should reverse completed request with reversible actions', async () => {
      const reverseActionSpy = vi.spyOn(service as any, 'reverseAction')
        .mockResolvedValue(undefined);

      await service.reverseRequest('request123', 'admin', 'Employee rehired');

      const request = service['activeRequests'].get('request123')!;
      expect(request.status).toBe(DeprovisioningRequestStatus.REVERSED);
      expect(request.reversalRequested).toBe(true);
      expect(request.reversalApprovedBy).toBe('admin');
      expect(request.reversalCompletedAt).toBeDefined();

      expect(reverseActionSpy).toHaveBeenCalledTimes(2); // Only reversible actions
    });

    it('should handle reversal of non-completed request', async () => {
      const request = service['activeRequests'].get('request123')!;
      request.status = DeprovisioningRequestStatus.PENDING;

      await expect(service.reverseRequest('request123', 'admin', 'reason'))
        .rejects.toThrow('Cannot reverse request in status: PENDING');
    });

    it('should handle request with no reversible actions', async () => {
      const request = service['activeRequests'].get('request123')!;
      request.actions = [
        {
          type: DeprovisioningActionType.DELETE_USER_DATA,
          isReversible: false
        }
      ];

      await expect(service.reverseRequest('request123', 'admin', 'reason'))
        .rejects.toThrow('No reversible actions found in this request');
    });

    it('should reverse disable user account action', async () => {
      const action = {
        type: DeprovisioningActionType.DISABLE_USER_ACCOUNT
      };

      const step = {
        reversalData: {
          previousState: { isActive: true, terminationDate: null }
        }
      };

      await service['reverseAction']('user123', action as any, step as any);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { isActive: true, terminationDate: null }
      });
    });

    it('should reverse revoke all access action', async () => {
      const action = {
        type: DeprovisioningActionType.REVOKE_ALL_ACCESS
      };

      const step = {
        reversalData: {
          previousRoles: [
            { roleId: 'role1', assignedAt: new Date(), assignedBy: 'admin', expiresAt: null }
          ]
        }
      };

      await service['reverseAction']('user123', action as any, step as any);

      expect(mockPrisma.userRole.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          roleId: 'role1',
          assignedAt: expect.any(Date),
          assignedBy: 'admin',
          expiresAt: null
        }
      });
    });
  });

  describe('Periodic Tasks', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should check dormant accounts', async () => {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user1', lastLoginAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) },
        { id: 'user2', lastLoginAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000) }
      ]);

      const handleEventSpy = vi.spyOn(service, 'handleDeprovisioningEvent')
        .mockResolvedValue([]);

      await service['checkDormantAccounts']();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          lastLoginAt: { lt: expect.any(Date) }
        }
      });

      expect(handleEventSpy).toHaveBeenCalledTimes(2);
    });

    it('should check expired grace periods', async () => {
      const expiredRequest = {
        id: 'request1',
        status: DeprovisioningRequestStatus.IN_GRACE_PERIOD,
        gracePeriodEndDate: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      service['activeRequests'].set('request1', expiredRequest as any);

      const scheduleRequestSpy = vi.spyOn(service as any, 'scheduleDeprovisioningRequest')
        .mockResolvedValue(undefined);

      await service['checkExpiredGracePeriods']();

      expect(expiredRequest.status).toBe(DeprovisioningRequestStatus.PENDING);
      expect(scheduleRequestSpy).toHaveBeenCalledWith('request1');
    });

    it('should clean up old completed requests', async () => {
      const oldRequest = {
        id: 'old-request',
        completedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000) // 400 days ago
      };

      const recentRequest = {
        id: 'recent-request',
        completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      };

      service['activeRequests'].set('old-request', oldRequest as any);
      service['activeRequests'].set('recent-request', recentRequest as any);

      await service['cleanupOldRequests']();

      expect(service['activeRequests'].has('old-request')).toBe(false);
      expect(service['activeRequests'].has('recent-request')).toBe(true);
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(() => {
      // Add test requests
      const request1 = {
        id: 'request1',
        status: DeprovisioningRequestStatus.COMPLETED,
        trigger: DeprovisioningTrigger.USER_TERMINATION
      };

      const request2 = {
        id: 'request2',
        status: DeprovisioningRequestStatus.PENDING,
        trigger: DeprovisioningTrigger.SECURITY_INCIDENT
      };

      const request3 = {
        id: 'request3',
        status: DeprovisioningRequestStatus.IN_GRACE_PERIOD,
        trigger: DeprovisioningTrigger.DORMANT_ACCOUNT
      };

      service['activeRequests'].set('request1', request1 as any);
      service['activeRequests'].set('request2', request2 as any);
      service['activeRequests'].set('request3', request3 as any);

      // Add some scheduled actions
      service['scheduledActions'].set('key1', setTimeout(() => {}, 1000) as any);
      service['scheduledActions'].set('key2', setTimeout(() => {}, 2000) as any);
    });

    it('should return deprovisioning statistics', () => {
      const stats = service.getDeprovisioningStatistics();

      expect(stats.totalRequests).toBe(3);
      expect(stats.statusBreakdown[DeprovisioningRequestStatus.COMPLETED]).toBe(1);
      expect(stats.statusBreakdown[DeprovisioningRequestStatus.PENDING]).toBe(1);
      expect(stats.statusBreakdown[DeprovisioningRequestStatus.IN_GRACE_PERIOD]).toBe(1);
      expect(stats.triggerBreakdown[DeprovisioningTrigger.USER_TERMINATION]).toBe(1);
      expect(stats.triggerBreakdown[DeprovisioningTrigger.SECURITY_INCIDENT]).toBe(1);
      expect(stats.triggerBreakdown[DeprovisioningTrigger.DORMANT_ACCOUNT]).toBe(1);
      expect(stats.activeRules).toBeGreaterThan(0);
      expect(stats.scheduledActions).toBe(2);
    });

    it('should return active requests', () => {
      const activeRequests = service.getActiveRequests();

      expect(activeRequests).toHaveLength(3);
      expect(activeRequests.some(req => req.id === 'request1')).toBe(true);
      expect(activeRequests.some(req => req.id === 'request2')).toBe(true);
      expect(activeRequests.some(req => req.id === 'request3')).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should get nested object values correctly', () => {
      const obj = {
        user: {
          profile: {
            lastLogin: new Date()
          }
        }
      };

      const value = service['getNestedValue'](obj, 'user.profile.lastLogin');
      expect(value).toBeInstanceOf(Date);
    });

    it('should handle missing nested paths gracefully', () => {
      const obj = {
        user: {}
      };

      const value = service['getNestedValue'](obj, 'user.profile.lastLogin');
      expect(value).toBeUndefined();
    });
  });
});