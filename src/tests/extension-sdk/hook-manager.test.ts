/**
 * Hook Manager Tests
 */

import { describe, it, expect } from 'vitest';
import {
  HookDependencyResolver,
  HookBuilder,
  HookLifecycleManager,
} from '../../../packages/extension-sdk/src/events/hook-manager';
import {
  HookType,
  EventPriority,
  EventStage,
} from '../../../packages/extension-sdk/src/events/types';

describe('HookDependencyResolver', () => {
  it('should resolve hook order respecting dependencies', () => {
    const hookA = {
      id: 'a',
      type: HookType.VALIDATION,
      event: 'test',
      extensionId: 'ext1',
      handler: async () => {},
      active: true,
      registeredAt: new Date(),
      executionCount: 0,
    };

    const hookB = {
      id: 'b',
      type: HookType.VALIDATION,
      event: 'test',
      extensionId: 'ext1',
      handler: async () => {},
      dependencies: ['a'],
      active: true,
      registeredAt: new Date(),
      executionCount: 0,
    };

    const resolved = HookDependencyResolver.resolveOrder([hookB, hookA]);

    expect(resolved[0].id).toBe('a');
    expect(resolved[1].id).toBe('b');
  });

  it('should detect circular dependencies', () => {
    const hookA = {
      id: 'a',
      type: HookType.VALIDATION,
      event: 'test',
      extensionId: 'ext1',
      handler: async () => {},
      dependencies: ['b'],
      active: true,
      registeredAt: new Date(),
      executionCount: 0,
    };

    const hookB = {
      id: 'b',
      type: HookType.VALIDATION,
      event: 'test',
      extensionId: 'ext1',
      handler: async () => {},
      dependencies: ['a'],
      active: true,
      registeredAt: new Date(),
      executionCount: 0,
    };

    expect(() => {
      HookDependencyResolver.resolveOrder([hookA, hookB]);
    }).toThrow('Circular dependency detected');
  });

  it('should check blockers', () => {
    const blockerHook = {
      id: 'blocker',
      type: HookType.VALIDATION,
      event: 'test',
      extensionId: 'ext1',
      handler: async () => {},
      active: true,
      registeredAt: new Date(),
      executionCount: 0,
    };

    const hook = {
      id: 'main',
      type: HookType.VALIDATION,
      event: 'test',
      extensionId: 'ext1',
      handler: async () => {},
      blockers: ['blocker'],
      active: true,
      registeredAt: new Date(),
      executionCount: 0,
    };

    const isBlocked = HookDependencyResolver.checkBlockers(hook, [
      blockerHook,
      hook,
    ]);

    expect(isBlocked).toBe(true);
  });

  it('should validate hook configuration', () => {
    const hook = {
      id: 'test',
      type: HookType.VALIDATION,
      event: 'test',
      extensionId: 'ext1',
      handler: async () => {},
      timeout: 50, // Too small
      dependencies: ['nonexistent'],
      active: true,
      registeredAt: new Date(),
      executionCount: 0,
    };

    const errors = HookDependencyResolver.validate(hook, [hook]);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('timeout'))).toBe(true);
    expect(errors.some((e) => e.includes('Dependency'))).toBe(true);
  });
});

describe('HookBuilder', () => {
  it('should build hook with all properties', () => {
    const hook = new HookBuilder()
      .event('data:validate')
      .type(HookType.VALIDATION)
      .extensionId('test-ext')
      .handler(async () => {})
      .stage(EventStage.PRE)
      .priority(EventPriority.HIGH)
      .timeout(5000)
      .continueOnError(true)
      .condition('data.field == "value"')
      .build();

    expect(hook.event).toBe('data:validate');
    expect(hook.type).toBe(HookType.VALIDATION);
    expect(hook.extensionId).toBe('test-ext');
    expect(hook.stage).toBe(EventStage.PRE);
    expect(hook.priority).toBe(EventPriority.HIGH);
    expect(hook.timeout).toBe(5000);
    expect(hook.continueOnError).toBe(true);
    expect(hook.condition?.expression).toBe('data.field == "value"');
  });

  it('should add dependencies', () => {
    const hook = new HookBuilder()
      .event('test')
      .type(HookType.VALIDATION)
      .extensionId('ext1')
      .handler(async () => {})
      .dependsOn('dep1', 'dep2')
      .build();

    expect(hook.dependencies).toEqual(['dep1', 'dep2']);
  });

  it('should add blockers', () => {
    const hook = new HookBuilder()
      .event('test')
      .type(HookType.VALIDATION)
      .extensionId('ext1')
      .handler(async () => {})
      .blockedBy('blocker1', 'blocker2')
      .build();

    expect(hook.blockers).toEqual(['blocker1', 'blocker2']);
  });

  it('should require event', () => {
    expect(() => {
      new HookBuilder()
        .type(HookType.VALIDATION)
        .extensionId('ext1')
        .handler(async () => {})
        .build();
    }).toThrow('Hook event is required');
  });

  it('should require type', () => {
    expect(() => {
      new HookBuilder()
        .event('test')
        .extensionId('ext1')
        .handler(async () => {})
        .build();
    }).toThrow('Hook type is required');
  });
});

describe('HookLifecycleManager', () => {
  const hook = {
    id: 'test',
    type: HookType.VALIDATION,
    event: 'test',
    extensionId: 'ext1',
    handler: async () => {},
    active: false,
    registeredAt: new Date(),
    executionCount: 0,
  };

  it('should enable hook', () => {
    const enabled = HookLifecycleManager.enable(hook);

    expect(enabled.active).toBe(true);
    expect(hook.active).toBe(false); // Original unchanged
  });

  it('should disable hook', () => {
    const disabled = HookLifecycleManager.disable(hook);

    expect(disabled.active).toBe(false);
  });

  it('should toggle hook', () => {
    const disabled = HookLifecycleManager.toggle({ ...hook, active: true });

    expect(disabled.active).toBe(false);

    const enabled = HookLifecycleManager.toggle(disabled);

    expect(enabled.active).toBe(true);
  });

  it('should get health status', () => {
    const healthyHook = {
      ...hook,
      active: true,
      executionCount: 10,
      averageDuration: 50,
      timeout: 5000,
    };

    const health = HookLifecycleManager.getHealthStatus(healthyHook);

    expect(health.healthy).toBe(true);
    expect(health.issues).toHaveLength(0);
  });

  it('should detect health issues', () => {
    const unhealthyHook = {
      ...hook,
      active: true,
      executionCount: 100,
      averageDuration: 28000, // Close to timeout
      timeout: 30000,
    };

    const health = HookLifecycleManager.getHealthStatus(unhealthyHook);

    expect(health.healthy).toBe(false);
    expect(health.issues.length).toBeGreaterThan(0);
  });

  it('should reset statistics', () => {
    const hookWithStats = {
      ...hook,
      executionCount: 100,
      lastExecutedAt: new Date(),
      averageDuration: 123,
    };

    const reset = HookLifecycleManager.resetStatistics(hookWithStats);

    expect(reset.executionCount).toBe(0);
    expect(reset.lastExecutedAt).toBeUndefined();
    expect(reset.averageDuration).toBeUndefined();
  });
});
