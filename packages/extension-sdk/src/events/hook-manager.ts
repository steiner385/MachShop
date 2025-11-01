/**
 * Hook Manager
 *
 * Manages hook lifecycle, dependency resolution, and execution ordering.
 */

import { randomUUID } from 'crypto';
import type {
  Hook,
  HookType,
  HookExecutionResult,
  EventPriority,
  EventStage,
} from './types';
import { EventPriority, EventStage } from './types';

/**
 * Hook dependency resolver
 */
export class HookDependencyResolver {
  /**
   * Resolve hook dependencies and return execution order
   */
  static resolveOrder(hooks: Hook[]): Hook[] {
    const resolved: Hook[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (hook: Hook): void => {
      if (visited.has(hook.id)) return;
      if (visiting.has(hook.id)) {
        throw new Error(`Circular dependency detected for hook ${hook.id}`);
      }

      visiting.add(hook.id);

      // Visit dependencies first
      if (hook.dependencies) {
        for (const depId of hook.dependencies) {
          const depHook = hooks.find((h) => h.id === depId);
          if (depHook) {
            visit(depHook);
          }
        }
      }

      visiting.delete(hook.id);
      visited.add(hook.id);
      resolved.push(hook);
    };

    for (const hook of hooks) {
      if (!visited.has(hook.id)) {
        visit(hook);
      }
    }

    return resolved;
  }

  /**
   * Check if hook has blockers that prevent execution
   */
  static checkBlockers(hook: Hook, allHooks: Hook[]): boolean {
    if (!hook.blockers || hook.blockers.length === 0) return false;

    for (const blockerId of hook.blockers) {
      const blocker = allHooks.find((h) => h.id === blockerId);
      if (blocker && blocker.active) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate hook configuration
   */
  static validate(hook: Hook, allHooks: Hook[]): string[] {
    const errors: string[] = [];

    // Check dependencies exist
    if (hook.dependencies) {
      for (const depId of hook.dependencies) {
        const depHook = allHooks.find((h) => h.id === depId);
        if (!depHook) {
          errors.push(`Dependency ${depId} not found`);
        }
      }
    }

    // Check timeout is reasonable
    if (hook.timeout && hook.timeout < 100) {
      errors.push('Hook timeout must be at least 100ms');
    }

    if (hook.timeout && hook.timeout > 300000) {
      errors.push('Hook timeout must not exceed 300 seconds');
    }

    return errors;
  }
}

/**
 * Hook builder for fluent hook creation
 */
export class HookBuilder {
  private hook: Partial<Hook> = {
    active: true,
    stage: EventStage.POST,
    priority: EventPriority.NORMAL,
    timeout: 30000,
    continueOnError: false,
  };

  /**
   * Set hook event
   */
  event(event: string): this {
    this.hook.event = event;
    return this;
  }

  /**
   * Set hook type
   */
  type(type: HookType): this {
    this.hook.type = type;
    return this;
  }

  /**
   * Set extension ID
   */
  extensionId(extensionId: string): this {
    this.hook.extensionId = extensionId;
    return this;
  }

  /**
   * Set hook handler
   */
  handler(handler: (context: unknown) => Promise<unknown>): this {
    this.hook.handler = handler;
    return this;
  }

  /**
   * Set hook stage
   */
  stage(stage: EventStage): this {
    this.hook.stage = stage;
    return this;
  }

  /**
   * Set hook priority
   */
  priority(priority: EventPriority): this {
    this.hook.priority = priority;
    return this;
  }

  /**
   * Set hook timeout
   */
  timeout(timeout: number): this {
    this.hook.timeout = timeout;
    return this;
  }

  /**
   * Add hook dependency
   */
  dependsOn(...hookIds: string[]): this {
    this.hook.dependencies = [...(this.hook.dependencies || []), ...hookIds];
    return this;
  }

  /**
   * Add hook blocker
   */
  blockedBy(...hookIds: string[]): this {
    this.hook.blockers = [...(this.hook.blockers || []), ...hookIds];
    return this;
  }

  /**
   * Set continue on error
   */
  continueOnError(continueOnError: boolean): this {
    this.hook.continueOnError = continueOnError;
    return this;
  }

  /**
   * Set condition
   */
  condition(expression: string, timeout?: number): this {
    this.hook.condition = { expression, timeout };
    return this;
  }

  /**
   * Build hook
   */
  build(): Hook {
    if (!this.hook.event) throw new Error('Hook event is required');
    if (!this.hook.type) throw new Error('Hook type is required');
    if (!this.hook.extensionId) throw new Error('Extension ID is required');
    if (!this.hook.handler) throw new Error('Hook handler is required');

    return {
      id: randomUUID(),
      registeredAt: new Date(),
      executionCount: 0,
      ...this.hook,
    } as Hook;
  }
}

/**
 * Hook lifecycle manager
 */
export class HookLifecycleManager {
  /**
   * Enable hook
   */
  static enable(hook: Hook): Hook {
    return { ...hook, active: true };
  }

  /**
   * Disable hook
   */
  static disable(hook: Hook): Hook {
    return { ...hook, active: false };
  }

  /**
   * Toggle hook active state
   */
  static toggle(hook: Hook): Hook {
    return { ...hook, active: !hook.active };
  }

  /**
   * Get hook health status
   */
  static getHealthStatus(hook: Hook): {
    healthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check execution success rate
    if (hook.executionCount > 0) {
      const errorRate = ((hook.executionCount - (hook.executionCount || 0)) /
        hook.executionCount) as unknown as number;
      if (errorRate > 0.5) {
        issues.push('High error rate detected');
      }
    }

    // Check average duration
    if (hook.averageDuration && hook.averageDuration > (hook.timeout || 30000) * 0.8) {
      issues.push('Hook executing close to timeout threshold');
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Reset hook statistics
   */
  static resetStatistics(hook: Hook): Hook {
    return {
      ...hook,
      executionCount: 0,
      lastExecutedAt: undefined,
      averageDuration: undefined,
    };
  }
}

/**
 * Hook type definitions and validators
 */
export const HookTypeDefinitions = {
  LIFECYCLE: {
    description: 'Fired during extension lifecycle events',
    validEvents: [
      'extension:installed',
      'extension:uninstalled',
      'extension:enabled',
      'extension:disabled',
      'extension:updated',
    ],
  },
  PERMISSION: {
    description: 'Fired during permission checks',
    validEvents: [
      'permission:check',
      'permission:request',
      'permission:grant',
      'permission:revoke',
    ],
  },
  VALIDATION: {
    description: 'Fired during data validation',
    validEvents: [
      'data:validate',
      'form:validate',
      'request:validate',
      'response:validate',
    ],
  },
  TRANSFORMATION: {
    description: 'Fired to transform data',
    validEvents: [
      'data:transform',
      'data:format',
      'data:normalize',
      'data:convert',
    ],
  },
  CACHE: {
    description: 'Fired to manage caching',
    validEvents: ['cache:invalidate', 'cache:refresh', 'cache:clear'],
  },
  CUSTOM: {
    description: 'Custom hook types defined by extensions',
    validEvents: [],
  },
};
