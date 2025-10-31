import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  SaviyntWebhookService,
  WebhookEventType,
  WebhookPriority,
  WebhookStatus,
  SaviyntWebhookPayload,
  WebhookProcessingResult
} from '../../services/SaviyntWebhookService';
import { SaviyntService } from '../../services/SaviyntService';
import { SaviyntEntityType, SaviyntOperation } from '@prisma/client';
import * as crypto from 'crypto';

// Mock dependencies
vi.mock('@prisma/client');
vi.mock('../../services/SaviyntService');
vi.mock('crypto');
vi.mock('../../config/config', () => ({
  config: {
    saviynt: {
      enabled: true,
      webhookSecret: 'test-webhook-secret'
    },
    server: {
      port: 3000
    }
  }
}));

describe('SaviyntWebhookService', () => {
  let service: SaviyntWebhookService;
  let mockPrisma: any;
  let mockSaviyntService: any;

  beforeEach(() => {
    // Mock Prisma client
    mockPrisma = {
      saviyntWebhookEvent: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn()
      },
      user: {
        findFirst: vi.fn(),
        update: vi.fn()
      },
      role: {
        findFirst: vi.fn(),
        update: vi.fn()
      },
      saviyntUserMapping: {
        findFirst: vi.fn(),
        update: vi.fn()
      },
      saviyntRoleMapping: {
        findFirst: vi.fn(),
        update: vi.fn()
      }
    };

    // Mock Saviynt service
    mockSaviyntService = {
      syncUser: vi.fn(),
      syncRole: vi.fn(),
      getHealthStatus: vi.fn()
    };

    // Mock crypto
    vi.mocked(crypto.createHmac).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('valid-signature')
    } as any);

    service = new SaviyntWebhookService(mockPrisma as PrismaClient, mockSaviyntService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully when enabled', async () => {
      const setupEndpointsSpy = vi.spyOn(service as any, 'setupWebhookEndpoints').mockResolvedValue(undefined);
      const startProcessorSpy = vi.spyOn(service as any, 'startEventProcessor').mockResolvedValue(undefined);
      const scheduleCleanupSpy = vi.spyOn(service as any, 'scheduleCleanupTasks').mockResolvedValue(undefined);

      await service.initialize();

      expect(setupEndpointsSpy).toHaveBeenCalled();
      expect(startProcessorSpy).toHaveBeenCalled();
      expect(scheduleCleanupSpy).toHaveBeenCalled();
    });

    it('should skip initialization when disabled', async () => {
      service['isEnabled'] = false;

      const setupEndpointsSpy = vi.spyOn(service as any, 'setupWebhookEndpoints');
      const startProcessorSpy = vi.spyOn(service as any, 'startEventProcessor');

      await service.initialize();

      expect(setupEndpointsSpy).not.toHaveBeenCalled();
      expect(startProcessorSpy).not.toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      vi.spyOn(service as any, 'setupWebhookEndpoints').mockRejectedValue(new Error('Setup failed'));

      await expect(service.initialize()).rejects.toThrow('Setup failed');
    });
  });

  describe('Webhook Signature Validation', () => {
    const mockPayload = {
      eventType: WebhookEventType.USER_CREATED,
      entityType: SaviyntEntityType.USER,
      entityId: 'user123',
      timestamp: new Date().toISOString(),
      data: { username: 'testuser' }
    };

    it('should validate webhook signature successfully', () => {
      const rawPayload = JSON.stringify(mockPayload);
      const signature = 'sha256=valid-signature';

      const isValid = service['validateWebhookSignature'](rawPayload, signature);

      expect(isValid).toBe(true);
      expect(crypto.createHmac).toHaveBeenCalledWith('sha256', 'test-webhook-secret');
    });

    it('should reject invalid signature', () => {
      vi.mocked(crypto.createHmac).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('invalid-signature')
      } as any);

      const rawPayload = JSON.stringify(mockPayload);
      const signature = 'sha256=wrong-signature';

      const isValid = service['validateWebhookSignature'](rawPayload, signature);

      expect(isValid).toBe(false);
    });

    it('should handle malformed signature format', () => {
      const rawPayload = JSON.stringify(mockPayload);
      const signature = 'invalid-format-signature';

      const isValid = service['validateWebhookSignature'](rawPayload, signature);

      expect(isValid).toBe(false);
    });

    it('should handle missing signature', () => {
      const rawPayload = JSON.stringify(mockPayload);

      const isValid = service['validateWebhookSignature'](rawPayload, undefined);

      expect(isValid).toBe(false);
    });
  });

  describe('Webhook Event Processing', () => {
    const mockUserCreatedPayload: SaviyntWebhookPayload = {
      eventType: WebhookEventType.USER_CREATED,
      entityType: SaviyntEntityType.USER,
      entityId: 'saviynt-user123',
      timestamp: new Date().toISOString(),
      data: {
        userkey: 'saviynt-user123',
        username: 'newuser',
        email: 'newuser@example.com',
        firstname: 'New',
        lastname: 'User',
        statuskey: '1'
      }
    };

    beforeEach(() => {
      mockPrisma.saviyntWebhookEvent.create.mockResolvedValue({
        id: 'event-123',
        eventType: WebhookEventType.USER_CREATED,
        entityType: SaviyntEntityType.USER,
        entityId: 'saviynt-user123',
        status: WebhookStatus.PENDING,
        createdAt: new Date()
      });
    });

    it('should process user created webhook successfully', async () => {
      mockPrisma.saviyntUserMapping.findFirst.mockResolvedValue({
        userId: 'mes-user123',
        saviyntUserId: 'saviynt-user123'
      });

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'mes-user123',
        username: 'newuser'
      });

      const processUserEventSpy = vi.spyOn(service as any, 'processUserEvent').mockResolvedValue({
        success: true,
        entityId: 'mes-user123',
        operation: 'sync'
      });

      const result = await service.processWebhookEvent(mockUserCreatedPayload);

      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
      expect(processUserEventSpy).toHaveBeenCalledWith(mockUserCreatedPayload);

      expect(mockPrisma.saviyntWebhookEvent.create).toHaveBeenCalledWith({
        data: {
          eventType: WebhookEventType.USER_CREATED,
          entityType: SaviyntEntityType.USER,
          entityId: 'saviynt-user123',
          payload: mockUserCreatedPayload,
          status: WebhookStatus.PENDING,
          priority: WebhookPriority.MEDIUM,
          receivedAt: expect.any(Date)
        }
      });
    });

    it('should process user updated webhook', async () => {
      const userUpdatedPayload: SaviyntWebhookPayload = {
        eventType: WebhookEventType.USER_UPDATED,
        entityType: SaviyntEntityType.USER,
        entityId: 'saviynt-user123',
        timestamp: new Date().toISOString(),
        data: {
          userkey: 'saviynt-user123',
          username: 'updateduser',
          email: 'updated@example.com'
        }
      };

      mockPrisma.saviyntUserMapping.findFirst.mockResolvedValue({
        userId: 'mes-user123',
        saviyntUserId: 'saviynt-user123'
      });

      const result = await service.processWebhookEvent(userUpdatedPayload);

      expect(result.success).toBe(true);
      expect(mockSaviyntService.syncUser).toHaveBeenCalledWith(
        'mes-user123',
        SaviyntOperation.SYNC,
        'webhook-event'
      );
    });

    it('should process role assignment webhook', async () => {
      const roleAssignmentPayload: SaviyntWebhookPayload = {
        eventType: WebhookEventType.ROLE_ASSIGNED,
        entityType: SaviyntEntityType.USER,
        entityId: 'saviynt-user123',
        timestamp: new Date().toISOString(),
        data: {
          userkey: 'saviynt-user123',
          rolekey: 'saviynt-role456',
          assignedAt: new Date().toISOString()
        }
      };

      mockPrisma.saviyntUserMapping.findFirst.mockResolvedValue({
        userId: 'mes-user123',
        saviyntUserId: 'saviynt-user123'
      });

      mockPrisma.saviyntRoleMapping.findFirst.mockResolvedValue({
        roleId: 'mes-role456',
        saviyntRoleId: 'saviynt-role456'
      });

      const processRoleEventSpy = vi.spyOn(service as any, 'processRoleAssignmentEvent').mockResolvedValue({
        success: true,
        entityId: 'mes-user123',
        operation: 'assign_role'
      });

      const result = await service.processWebhookEvent(roleAssignmentPayload);

      expect(result.success).toBe(true);
      expect(processRoleEventSpy).toHaveBeenCalledWith(roleAssignmentPayload);
    });

    it('should handle webhook processing failure', async () => {
      vi.spyOn(service as any, 'processUserEvent').mockRejectedValue(new Error('Processing failed'));

      const result = await service.processWebhookEvent(mockUserCreatedPayload);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Processing failed');

      expect(mockPrisma.saviyntWebhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-123' },
        data: {
          status: WebhookStatus.FAILED,
          errorMessage: 'Processing failed',
          processedAt: expect.any(Date)
        }
      });
    });

    it('should prioritize high-priority events', async () => {
      const highPriorityPayload: SaviyntWebhookPayload = {
        eventType: WebhookEventType.SECURITY_INCIDENT,
        entityType: SaviyntEntityType.USER,
        entityId: 'saviynt-user123',
        timestamp: new Date().toISOString(),
        data: { incident: 'suspicious_activity' }
      };

      await service.processWebhookEvent(highPriorityPayload);

      expect(mockPrisma.saviyntWebhookEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: WebhookPriority.HIGH
        })
      });
    });

    it('should handle unknown event types', async () => {
      const unknownPayload: SaviyntWebhookPayload = {
        eventType: 'UNKNOWN_EVENT' as any,
        entityType: SaviyntEntityType.USER,
        entityId: 'saviynt-user123',
        timestamp: new Date().toISOString(),
        data: {}
      };

      const result = await service.processWebhookEvent(unknownPayload);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Unknown event type');
    });
  });

  describe('Event Queue Management', () => {
    beforeEach(() => {
      // Mock pending events
      mockPrisma.saviyntWebhookEvent.findMany.mockResolvedValue([
        {
          id: 'event1',
          eventType: WebhookEventType.USER_CREATED,
          entityType: SaviyntEntityType.USER,
          status: WebhookStatus.PENDING,
          priority: WebhookPriority.HIGH,
          payload: { entityId: 'user1' },
          createdAt: new Date()
        },
        {
          id: 'event2',
          eventType: WebhookEventType.USER_UPDATED,
          entityType: SaviyntEntityType.USER,
          status: WebhookStatus.PENDING,
          priority: WebhookPriority.MEDIUM,
          payload: { entityId: 'user2' },
          createdAt: new Date()
        }
      ]);
    });

    it('should process event queue with priority ordering', async () => {
      const processEventSpy = vi.spyOn(service as any, 'processQueuedEvent').mockResolvedValue(undefined);

      await service['processEventQueue']();

      expect(mockPrisma.saviyntWebhookEvent.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: [WebhookStatus.PENDING, WebhookStatus.RETRYING] }
        },
        orderBy: [
          { priority: 'asc' }, // Higher priority first (HIGH=1, MEDIUM=2, LOW=3)
          { createdAt: 'asc' }
        ],
        take: expect.any(Number)
      });

      expect(processEventSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle event processing with retry logic', async () => {
      const failingEvent = {
        id: 'event1',
        eventType: WebhookEventType.USER_CREATED,
        retryCount: 2,
        maxRetries: 3,
        payload: { entityId: 'user1' }
      };

      vi.spyOn(service as any, 'executeEventProcessor').mockRejectedValue(new Error('Temporary failure'));

      await service['processQueuedEvent'](failingEvent as any);

      expect(mockPrisma.saviyntWebhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'event1' },
        data: {
          status: WebhookStatus.RETRYING,
          retryCount: 3,
          lastAttemptAt: expect.any(Date),
          errorMessage: 'Temporary failure'
        }
      });
    });

    it('should mark event as failed after max retries', async () => {
      const failingEvent = {
        id: 'event1',
        eventType: WebhookEventType.USER_CREATED,
        retryCount: 3,
        maxRetries: 3,
        payload: { entityId: 'user1' }
      };

      vi.spyOn(service as any, 'executeEventProcessor').mockRejectedValue(new Error('Permanent failure'));

      await service['processQueuedEvent'](failingEvent as any);

      expect(mockPrisma.saviyntWebhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'event1' },
        data: {
          status: WebhookStatus.FAILED,
          retryCount: 4,
          lastAttemptAt: expect.any(Date),
          errorMessage: 'Permanent failure'
        }
      });
    });

    it('should process events successfully', async () => {
      const successEvent = {
        id: 'event1',
        eventType: WebhookEventType.USER_CREATED,
        retryCount: 0,
        payload: { entityId: 'user1' }
      };

      vi.spyOn(service as any, 'executeEventProcessor').mockResolvedValue({
        success: true,
        operation: 'sync'
      });

      await service['processQueuedEvent'](successEvent as any);

      expect(mockPrisma.saviyntWebhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'event1' },
        data: {
          status: WebhookStatus.COMPLETED,
          processedAt: expect.any(Date)
        }
      });
    });
  });

  describe('Event Processors', () => {
    it('should process user creation event', async () => {
      const payload: SaviyntWebhookPayload = {
        eventType: WebhookEventType.USER_CREATED,
        entityType: SaviyntEntityType.USER,
        entityId: 'saviynt-user123',
        timestamp: new Date().toISOString(),
        data: {
          userkey: 'saviynt-user123',
          username: 'newuser',
          email: 'newuser@example.com'
        }
      };

      // User not yet mapped
      mockPrisma.saviyntUserMapping.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'mes-user123',
        username: 'newuser'
      });

      const result = await service['processUserEvent'](payload);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('create_mapping');
      expect(mockPrisma.saviyntUserMapping.update).toHaveBeenCalledWith({
        where: { userId: 'mes-user123' },
        data: {
          saviyntUserId: 'saviynt-user123',
          lastSyncAt: expect.any(Date)
        }
      });
    });

    it('should process user deactivation event', async () => {
      const payload: SaviyntWebhookPayload = {
        eventType: WebhookEventType.USER_DEACTIVATED,
        entityType: SaviyntEntityType.USER,
        entityId: 'saviynt-user123',
        timestamp: new Date().toISOString(),
        data: {
          userkey: 'saviynt-user123',
          statuskey: '0'
        }
      };

      mockPrisma.saviyntUserMapping.findFirst.mockResolvedValue({
        userId: 'mes-user123',
        saviyntUserId: 'saviynt-user123'
      });

      const result = await service['processUserEvent'](payload);

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'mes-user123' },
        data: {
          isActive: false,
          deactivatedAt: expect.any(Date)
        }
      });
    });

    it('should process role creation event', async () => {
      const payload: SaviyntWebhookPayload = {
        eventType: WebhookEventType.ROLE_CREATED,
        entityType: SaviyntEntityType.ROLE,
        entityId: 'saviynt-role123',
        timestamp: new Date().toISOString(),
        data: {
          rolekey: 'saviynt-role123',
          rolename: 'NEW_ROLE',
          roledisplayname: 'New Role'
        }
      };

      mockPrisma.saviyntRoleMapping.findFirst.mockResolvedValue(null);
      mockPrisma.role.findFirst.mockResolvedValue({
        id: 'mes-role123',
        roleCode: 'NEW_ROLE'
      });

      const result = await service['processRoleEvent'](payload);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('create_mapping');
    });

    it('should handle entity not found in MES', async () => {
      const payload: SaviyntWebhookPayload = {
        eventType: WebhookEventType.USER_UPDATED,
        entityType: SaviyntEntityType.USER,
        entityId: 'saviynt-user123',
        timestamp: new Date().toISOString(),
        data: { userkey: 'saviynt-user123' }
      };

      mockPrisma.saviyntUserMapping.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service['processUserEvent'](payload);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('User not found in MES');
    });
  });

  describe('Cleanup and Maintenance', () => {
    beforeEach(() => {
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago

      mockPrisma.saviyntWebhookEvent.findMany.mockResolvedValue([
        {
          id: 'old-event1',
          status: WebhookStatus.COMPLETED,
          processedAt: oldDate
        },
        {
          id: 'old-event2',
          status: WebhookStatus.FAILED,
          processedAt: oldDate
        }
      ]);
    });

    it('should clean up old webhook events', async () => {
      await service['cleanupOldEvents']();

      expect(mockPrisma.saviyntWebhookEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          status: { in: [WebhookStatus.COMPLETED, WebhookStatus.FAILED] },
          processedAt: { lt: expect.any(Date) }
        }
      });
    });

    it('should clean up failed events older than threshold', async () => {
      await service['cleanupFailedEvents']();

      expect(mockPrisma.saviyntWebhookEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          status: WebhookStatus.FAILED,
          createdAt: { lt: expect.any(Date) }
        }
      });
    });

    it('should schedule periodic cleanup tasks', async () => {
      vi.useFakeTimers();
      const cleanupSpy = vi.spyOn(service as any, 'cleanupOldEvents').mockResolvedValue(undefined);

      await service['scheduleCleanupTasks']();

      // Fast forward 24 hours
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);

      expect(cleanupSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(() => {
      mockPrisma.saviyntWebhookEvent.findMany
        .mockResolvedValueOnce([
          { status: WebhookStatus.COMPLETED, eventType: WebhookEventType.USER_CREATED },
          { status: WebhookStatus.COMPLETED, eventType: WebhookEventType.USER_UPDATED },
          { status: WebhookStatus.FAILED, eventType: WebhookEventType.ROLE_ASSIGNED },
          { status: WebhookStatus.PENDING, eventType: WebhookEventType.USER_CREATED }
        ]);
    });

    it('should return webhook statistics', async () => {
      const stats = await service.getWebhookStatistics();

      expect(stats.totalEvents).toBe(4);
      expect(stats.statusBreakdown[WebhookStatus.COMPLETED]).toBe(2);
      expect(stats.statusBreakdown[WebhookStatus.FAILED]).toBe(1);
      expect(stats.statusBreakdown[WebhookStatus.PENDING]).toBe(1);
      expect(stats.eventTypeBreakdown[WebhookEventType.USER_CREATED]).toBe(2);
      expect(stats.eventTypeBreakdown[WebhookEventType.USER_UPDATED]).toBe(1);
      expect(stats.eventTypeBreakdown[WebhookEventType.ROLE_ASSIGNED]).toBe(1);
    });

    it('should return processing performance metrics', () => {
      // Add some test events to internal state
      service['recentEvents'].push(
        { processedAt: new Date(Date.now() - 1000), processingTime: 150 },
        { processedAt: new Date(Date.now() - 2000), processingTime: 200 },
        { processedAt: new Date(Date.now() - 3000), processingTime: 100 }
      );

      const metrics = service.getProcessingMetrics();

      expect(metrics.averageProcessingTime).toBe(150); // (150 + 200 + 100) / 3
      expect(metrics.recentEventsCount).toBe(3);
      expect(metrics.throughputPerMinute).toBeGreaterThan(0);
    });

    it('should return health status', async () => {
      mockSaviyntService.getHealthStatus.mockResolvedValue({
        isHealthy: true,
        lastChecked: new Date()
      });

      const health = await service.getHealthStatus();

      expect(health.isHealthy).toBe(true);
      expect(health.webhookEndpointActive).toBe(true);
      expect(health.eventQueueSize).toBeGreaterThanOrEqual(0);
      expect(health.lastEventProcessed).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle service disabled state', async () => {
      service['isEnabled'] = false;

      const payload: SaviyntWebhookPayload = {
        eventType: WebhookEventType.USER_CREATED,
        entityType: SaviyntEntityType.USER,
        entityId: 'user123',
        timestamp: new Date().toISOString(),
        data: {}
      };

      const result = await service.processWebhookEvent(payload);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Webhook service is disabled');
    });

    it('should handle malformed webhook payload', async () => {
      const invalidPayload = {
        eventType: WebhookEventType.USER_CREATED,
        // Missing required fields
      };

      const result = await service.processWebhookEvent(invalidPayload as any);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Invalid webhook payload');
    });

    it('should handle database errors gracefully', async () => {
      const payload: SaviyntWebhookPayload = {
        eventType: WebhookEventType.USER_CREATED,
        entityType: SaviyntEntityType.USER,
        entityId: 'user123',
        timestamp: new Date().toISOString(),
        data: {}
      };

      mockPrisma.saviyntWebhookEvent.create.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.processWebhookEvent(payload);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Database connection failed');
    });

    it('should handle synchronization service errors', async () => {
      const payload: SaviyntWebhookPayload = {
        eventType: WebhookEventType.USER_UPDATED,
        entityType: SaviyntEntityType.USER,
        entityId: 'saviynt-user123',
        timestamp: new Date().toISOString(),
        data: { userkey: 'saviynt-user123' }
      };

      mockPrisma.saviyntUserMapping.findFirst.mockResolvedValue({
        userId: 'mes-user123',
        saviyntUserId: 'saviynt-user123'
      });

      mockSaviyntService.syncUser.mockRejectedValue(new Error('Sync service unavailable'));

      const result = await service['processUserEvent'](payload);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Sync service unavailable');
    });
  });

  describe('Configuration and Setup', () => {
    it('should set up webhook endpoints correctly', async () => {
      const setupSpy = vi.spyOn(service as any, 'setupWebhookEndpoints').mockResolvedValue(undefined);

      await service['setupWebhookEndpoints']();

      expect(setupSpy).toHaveBeenCalled();
    });

    it('should start event processor with correct interval', async () => {
      vi.useFakeTimers();
      const processQueueSpy = vi.spyOn(service as any, 'processEventQueue').mockResolvedValue(undefined);

      await service['startEventProcessor']();

      // Advance time to trigger processing
      vi.advanceTimersByTime(5000); // 5 seconds

      expect(processQueueSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});