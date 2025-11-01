/**
 * Event Bus Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEventBus } from '../../../packages/extension-sdk/src/events/event-bus';
import {
  HookType,
  EventPriority,
  EventStage,
} from '../../../packages/extension-sdk/src/events/types';

describe('EventBus', () => {
  let eventBus: ReturnType<typeof createEventBus>;

  beforeEach(() => {
    eventBus = createEventBus();
  });

  describe('hook registration', () => {
    it('should register hooks successfully', async () => {
      const response = await eventBus.registerHooks({
        extensionId: 'test-ext',
        version: '1.0.0',
        hooks: [
          {
            type: HookType.VALIDATION,
            event: 'data:validate',
            extensionId: 'test-ext',
            handler: async () => {},
            stage: EventStage.PRE,
            priority: EventPriority.NORMAL,
            active: true,
          },
        ],
      });

      expect(response.success).toBe(true);
      expect(response.hookIds.length).toBe(1);
    });

    it('should register multiple hooks', async () => {
      const response = await eventBus.registerHooks({
        extensionId: 'test-ext',
        version: '1.0.0',
        hooks: [
          {
            type: HookType.VALIDATION,
            event: 'data:validate',
            extensionId: 'test-ext',
            handler: async () => {},
            active: true,
          },
          {
            type: HookType.TRANSFORMATION,
            event: 'data:transform',
            extensionId: 'test-ext',
            handler: async () => {},
            active: true,
          },
          {
            type: HookType.CACHE,
            event: 'cache:invalidate',
            extensionId: 'test-ext',
            handler: async () => {},
            active: true,
          },
        ],
      });

      expect(response.success).toBe(true);
      expect(response.hookIds.length).toBe(3);
    });
  });

  describe('hook retrieval', () => {
    beforeEach(async () => {
      await eventBus.registerHooks({
        extensionId: 'test-ext-retrieve',
        version: '1.0.0',
        hooks: [
          {
            type: HookType.VALIDATION,
            event: 'data:validate',
            extensionId: 'test-ext-retrieve',
            handler: async () => {},
            active: true,
          },
        ],
      });

      await eventBus.registerHooks({
        extensionId: 'test-ext2-retrieve',
        version: '1.0.0',
        hooks: [
          {
            type: HookType.PERMISSION,
            event: 'permission:check',
            extensionId: 'test-ext2-retrieve',
            handler: async () => {},
            active: true,
          },
        ],
      });
    });

    it('should retrieve hook by ID', async () => {
      const hooks = eventBus.getAllHooks();
      const hook = eventBus.getHook(hooks[0].id);

      expect(hook).toBeDefined();
      expect(hook?.type).toBe(HookType.VALIDATION);
    });

    it('should retrieve hooks by extension', () => {
      const hooks = eventBus.getExtensionHooks('test-ext-retrieve');

      expect(hooks.length).toBe(1);
      expect(hooks[0].extensionId).toBe('test-ext-retrieve');
    });

    it('should retrieve hooks by event', () => {
      const hooks = eventBus.getEventHooks('data:validate');

      expect(hooks.length).toBe(1);
      expect(hooks[0].event).toBe('data:validate');
    });

    it('should retrieve all hooks', () => {
      const hooks = eventBus.getAllHooks();

      expect(hooks.length).toBe(2);
    });
  });

  describe('hook execution', () => {
    it('should execute hooks for event', async () => {
      const handler = vi.fn(async () => ({ success: true }));

      await eventBus.registerHooks({
        extensionId: 'test-ext',
        version: '1.0.0',
        hooks: [
          {
            type: HookType.VALIDATION,
            event: 'data:validate',
            extensionId: 'test-ext',
            handler,
            active: true,
          },
        ],
      });

      const results = await eventBus.executeHooks({
        name: 'data:validate',
        data: { field: 'value' },
        source: 'core',
        timestamp: new Date(),
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('should skip inactive hooks', async () => {
      const handler = vi.fn(async () => {});

      const registration = await eventBus.registerHooks({
        extensionId: 'test-ext',
        version: '1.0.0',
        hooks: [
          {
            type: HookType.VALIDATION,
            event: 'data:validate',
            extensionId: 'test-ext',
            handler,
            active: false,
          },
        ],
      });

      const results = await eventBus.executeHooks({
        name: 'data:validate',
        data: {},
        source: 'core',
        timestamp: new Date(),
      });

      expect(results).toHaveLength(0);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should respect hook priority', async () => {
      const executionOrder: string[] = [];

      await eventBus.registerHooks({
        extensionId: 'test-ext',
        version: '1.0.0',
        hooks: [
          {
            type: HookType.VALIDATION,
            event: 'data:validate',
            extensionId: 'test-ext',
            handler: async () => {
              executionOrder.push('normal');
            },
            priority: EventPriority.NORMAL,
            active: true,
          },
          {
            type: HookType.VALIDATION,
            event: 'data:validate',
            extensionId: 'test-ext',
            handler: async () => {
              executionOrder.push('high');
            },
            priority: EventPriority.HIGH,
            active: true,
          },
        ],
      });

      await eventBus.executeHooks({
        name: 'data:validate',
        data: {},
        source: 'core',
        timestamp: new Date(),
      });

      expect(executionOrder[0]).toBe('high');
      expect(executionOrder[1]).toBe('normal');
    });
  });

  describe('unregistration', () => {
    it('should unregister all extension hooks', async () => {
      await eventBus.registerHooks({
        extensionId: 'test-ext',
        version: '1.0.0',
        hooks: [
          {
            type: HookType.VALIDATION,
            event: 'data:validate',
            extensionId: 'test-ext',
            handler: async () => {},
            active: true,
          },
          {
            type: HookType.PERMISSION,
            event: 'permission:check',
            extensionId: 'test-ext',
            handler: async () => {},
            active: true,
          },
        ],
      });

      expect(eventBus.getExtensionHooks('test-ext')).toHaveLength(2);

      await eventBus.unregisterHooks('test-ext');

      expect(eventBus.getExtensionHooks('test-ext')).toHaveLength(0);
    });
  });

  describe('metrics', () => {
    it('should track hook execution metrics', async () => {
      const registration = await eventBus.registerHooks({
        extensionId: 'test-ext',
        version: '1.0.0',
        hooks: [
          {
            type: HookType.VALIDATION,
            event: 'data:validate',
            extensionId: 'test-ext',
            handler: async () => {},
            active: true,
          },
        ],
      });

      const hookId = registration.hookIds[0];

      await eventBus.executeHooks({
        name: 'data:validate',
        data: {},
        source: 'core',
        timestamp: new Date(),
      });

      const metrics = eventBus.getHookMetrics(hookId);

      expect(metrics).toBeDefined();
      expect(metrics?.totalExecutions).toBe(1);
      expect(metrics?.successfulExecutions).toBe(1);
    });
  });

  describe('audit logging', () => {
    it('should record audit logs', async () => {
      await eventBus.registerHooks({
        extensionId: 'test-ext',
        version: '1.0.0',
        hooks: [
          {
            type: HookType.VALIDATION,
            event: 'data:validate',
            extensionId: 'test-ext',
            handler: async () => {},
            active: true,
          },
        ],
      });

      await eventBus.executeHooks({
        name: 'data:validate',
        data: {},
        source: 'core',
        timestamp: new Date(),
      });

      const logs = await eventBus.getAuditLogs({
        extensionId: 'test-ext',
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].extensionId).toBe('test-ext');
    });

    it('should filter audit logs by date range', async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await eventBus.registerHooks({
        extensionId: 'test-ext',
        version: '1.0.0',
        hooks: [
          {
            type: HookType.VALIDATION,
            event: 'data:validate',
            extensionId: 'test-ext',
            handler: async () => {},
            active: true,
          },
        ],
      });

      await eventBus.executeHooks({
        name: 'data:validate',
        data: {},
        source: 'core',
        timestamp: new Date(),
      });

      const logs = await eventBus.getAuditLogs({
        startDate: now,
        endDate: tomorrow,
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('cross-extension communication', () => {
    it('should send cross-extension request', async () => {
      await eventBus.registerHooks({
        extensionId: 'target-ext',
        version: '1.0.0',
        hooks: [
          {
            type: HookType.CUSTOM,
            event: 'custom:action',
            extensionId: 'target-ext',
            handler: async () => ({ result: 'processed' }),
            active: true,
          },
        ],
      });

      const response = await eventBus.sendRequest({
        requestId: 'req-1',
        requesterId: 'source-ext',
        targetId: 'target-ext',
        event: 'custom:action',
        payload: { action: 'process' },
      });

      expect(response.success).toBe(true);
      expect(response.responderId).toBe('target-ext');
    });
  });

  describe('event subscription', () => {
    it('should handle event subscriptions', async () => {
      const handler = vi.fn(async () => {});

      eventBus.subscribe('test:event', handler);

      await eventBus.publish({
        name: 'test:event',
        data: { value: 'test' },
        source: 'core',
        timestamp: new Date(),
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should unsubscribe from events', async () => {
      const handler = vi.fn(async () => {});

      const subscriberId = eventBus.subscribe('test:event', handler);

      eventBus.unsubscribe(subscriberId);

      await eventBus.publish({
        name: 'test:event',
        data: {},
        source: 'core',
        timestamp: new Date(),
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
