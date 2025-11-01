/**
 * Extension Event Bus
 *
 * Core event publishing and subscription system with hook support,
 * conditional execution, and cross-extension communication.
 */

import { randomUUID } from 'crypto';
import type {
  Event,
  Hook,
  HookType,
  HookContext,
  HookExecutionResult,
  HookRegistrationRequest,
  HookRegistrationResponse,
  CrossExtensionRequest,
  CrossExtensionResponse,
  HookExecutionMetrics,
  HookAuditLogEntry,
  IEventBus,
  EventPriority,
  EventStage,
} from './types';
import { EventPriority, EventStage } from './types';

/**
 * Event Bus Implementation
 *
 * Manages:
 * - Event publishing and subscription
 * - Hook registration and execution
 * - CEL-based conditional execution
 * - Hook dependency and priority ordering
 * - Cross-extension communication
 * - Metrics and audit logging
 */
export class EventBus implements IEventBus {
  private hooks: Map<string, Hook> = new Map();
  private extensionHooks: Map<string, Set<string>> = new Map();
  private eventHooks: Map<string, Set<string>> = new Map();
  private subscribers: Map<string, (event: Event) => Promise<void>> = new Map();
  private metrics: Map<string, HookExecutionMetrics> = new Map();
  private auditLogs: HookAuditLogEntry[] = [];
  private pendingRequests: Map<string, CrossExtensionResponse> = new Map();

  /**
   * Publish an event
   */
  async publish(event: Event): Promise<void> {
    // Execute hooks for this event
    await this.executeHooks(event);

    // Call subscribers
    const hookSet = this.eventHooks.get(event.name) || new Set();
    for (const subscriberId of this.subscribers.keys()) {
      if (this.subscribers.has(subscriberId)) {
        const handler = this.subscribers.get(subscriberId)!;
        try {
          await handler(event);
        } catch (error) {
          console.error(`Subscriber ${subscriberId} failed:`, error);
        }
      }
    }
  }

  /**
   * Subscribe to an event
   */
  subscribe(event: string, handler: (event: Event) => Promise<void>): string {
    const subscriberId = randomUUID();
    this.subscribers.set(subscriberId, handler);
    return subscriberId;
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
  }

  /**
   * Register hooks from an extension
   */
  async registerHooks(request: HookRegistrationRequest): Promise<HookRegistrationResponse> {
    const hookIds: string[] = [];
    const warnings: string[] = [];

    try {
      // Track extension hooks
      if (!this.extensionHooks.has(request.extensionId)) {
        this.extensionHooks.set(request.extensionId, new Set());
      }

      const extHooks = this.extensionHooks.get(request.extensionId)!;

      for (const hookDef of request.hooks) {
        const hookId = randomUUID();
        const hook: Hook = {
          ...hookDef,
          id: hookId,
          registeredAt: new Date(),
          executionCount: 0,
        } as Hook;

        // Store hook
        this.hooks.set(hookId, hook);
        extHooks.add(hookId);

        // Index by event
        if (!this.eventHooks.has(hook.event)) {
          this.eventHooks.set(hook.event, new Set());
        }
        this.eventHooks.get(hook.event)!.add(hookId);

        // Initialize metrics
        this.metrics.set(hookId, {
          hookId,
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          skippedExecutions: 0,
          averageDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          errorRate: 0,
          recentExecutions: [],
        });

        hookIds.push(hookId);
      }

      return {
        success: true,
        hookIds,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        hookIds: [],
        error: `Failed to register hooks: ${String(error)}`,
      };
    }
  }

  /**
   * Unregister hooks from an extension
   */
  async unregisterHooks(extensionId: string): Promise<void> {
    const hookSet = this.extensionHooks.get(extensionId);
    if (!hookSet) return;

    for (const hookId of hookSet) {
      const hook = this.hooks.get(hookId);
      if (hook) {
        // Remove from event index
        const eventSet = this.eventHooks.get(hook.event);
        if (eventSet) {
          eventSet.delete(hookId);
        }
      }
      // Remove hook and metrics
      this.hooks.delete(hookId);
      this.metrics.delete(hookId);
    }

    this.extensionHooks.delete(extensionId);
  }

  /**
   * Get hook by ID
   */
  getHook(hookId: string): Hook | undefined {
    return this.hooks.get(hookId);
  }

  /**
   * Get all hooks
   */
  getAllHooks(): Hook[] {
    return Array.from(this.hooks.values());
  }

  /**
   * Get hooks by extension
   */
  getExtensionHooks(extensionId: string): Hook[] {
    const hookIds = this.extensionHooks.get(extensionId) || new Set();
    return Array.from(hookIds)
      .map((id) => this.hooks.get(id))
      .filter((hook) => hook !== undefined) as Hook[];
  }

  /**
   * Get hooks by event
   */
  getEventHooks(event: string): Hook[] {
    const hookIds = this.eventHooks.get(event) || new Set();
    return Array.from(hookIds)
      .map((id) => this.hooks.get(id))
      .filter((hook) => hook !== undefined) as Hook[];
  }

  /**
   * Execute hooks for an event
   */
  async executeHooks(event: Event): Promise<HookExecutionResult[]> {
    const results: HookExecutionResult[] = [];
    const hooks = this.getEventHooks(event.name);

    // Sort hooks by priority and dependencies
    const sortedHooks = this.sortHooksByPriority(hooks);

    for (const hook of sortedHooks) {
      if (!hook.active) continue;

      const startTime = Date.now();
      const duration = 0;

      try {
        // Check condition
        if (hook.condition && !this.evaluateCondition(hook.condition, event.data)) {
          results.push({
            success: true,
            hookId: hook.id,
            extensionId: hook.extensionId,
            duration: 0,
            skipped: true,
          });

          this.recordAuditLog({
            timestamp: new Date(),
            hookId: hook.id,
            extensionId: hook.extensionId,
            event: event.name,
            status: 'skipped',
            duration: 0,
            requestId: event.requestId,
            userId: event.metadata?.userId as string | undefined,
          });

          continue;
        }

        // Execute hook handler
        const context: HookContext = {
          event: event.name,
          data: event.data,
          hook,
          extensionId: hook.extensionId,
          userId: event.metadata?.userId as string | undefined,
          requestId: event.requestId || randomUUID(),
          metadata: event.metadata,
        };

        const result = await this.executeWithTimeout(
          () => hook.handler(context),
          hook.timeout || 30000
        );

        const actualDuration = Date.now() - startTime;

        results.push({
          success: true,
          hookId: hook.id,
          extensionId: hook.extensionId,
          duration: actualDuration,
          result,
          skipped: false,
        });

        this.updateMetrics(hook.id, true, actualDuration);
        this.recordAuditLog({
          timestamp: new Date(),
          hookId: hook.id,
          extensionId: hook.extensionId,
          event: event.name,
          status: 'success',
          duration: actualDuration,
          requestId: event.requestId,
          userId: event.metadata?.userId as string | undefined,
        });

        hook.executionCount += 1;
        hook.lastExecutedAt = new Date();
      } catch (error) {
        const actualDuration = Date.now() - startTime;

        if (!hook.continueOnError) {
          // Stop executing hooks on error
          results.push({
            success: false,
            hookId: hook.id,
            extensionId: hook.extensionId,
            duration: actualDuration,
            error: error as Error,
            skipped: false,
          });

          this.updateMetrics(hook.id, false, actualDuration);
          this.recordAuditLog({
            timestamp: new Date(),
            hookId: hook.id,
            extensionId: hook.extensionId,
            event: event.name,
            status: 'failure',
            duration: actualDuration,
            error: String(error),
            requestId: event.requestId,
          });

          break;
        } else {
          // Continue on error
          results.push({
            success: false,
            hookId: hook.id,
            extensionId: hook.extensionId,
            duration: actualDuration,
            error: error as Error,
            skipped: false,
          });

          this.updateMetrics(hook.id, false, actualDuration);
          this.recordAuditLog({
            timestamp: new Date(),
            hookId: hook.id,
            extensionId: hook.extensionId,
            event: event.name,
            status: 'failure',
            duration: actualDuration,
            error: String(error),
            requestId: event.requestId,
          });
        }
      }
    }

    return results;
  }

  /**
   * Send cross-extension request
   */
  async sendRequest(request: CrossExtensionRequest): Promise<CrossExtensionResponse> {
    const response: CrossExtensionResponse = {
      requestId: request.requestId,
      responderId: request.targetId,
      success: true,
      payload: {},
    };

    // Find target extension hooks
    const targetHooks = this.getExtensionHooks(request.targetId);
    const eventHooks = targetHooks.filter((h) => h.event === request.event);

    if (eventHooks.length === 0) {
      response.success = false;
      response.error = `No hooks found in ${request.targetId} for event ${request.event}`;
      return response;
    }

    try {
      // Execute hooks and collect responses
      const event: Event = {
        name: request.event,
        data: request.payload,
        source: request.requesterId,
        requestId: request.requestId,
        timestamp: new Date(),
      };

      const results = await this.executeHooks(event);

      // Aggregate results
      const successCount = results.filter((r) => r.success && !r.skipped).length;
      response.success = successCount > 0;
      response.payload = { executedCount: results.length, successCount };

      return response;
    } catch (error) {
      response.success = false;
      response.error = String(error);
      return response;
    }
  }

  /**
   * Get hook metrics
   */
  getHookMetrics(hookId: string): HookExecutionMetrics | undefined {
    return this.metrics.get(hookId);
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filters?: {
    hookId?: string;
    extensionId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<HookAuditLogEntry[]> {
    let logs = [...this.auditLogs];

    if (filters?.hookId) {
      logs = logs.filter((log) => log.hookId === filters.hookId);
    }

    if (filters?.extensionId) {
      logs = logs.filter((log) => log.extensionId === filters.extensionId);
    }

    if (filters?.startDate) {
      logs = logs.filter((log) => log.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      logs = logs.filter((log) => log.timestamp <= filters.endDate!);
    }

    return logs;
  }

  /**
   * Sort hooks by priority and dependencies
   */
  private sortHooksByPriority(hooks: Hook[]): Hook[] {
    const priorityMap: Record<EventPriority | undefined, number> = {
      [EventPriority.CRITICAL]: 5,
      [EventPriority.HIGH]: 4,
      [EventPriority.NORMAL]: 3,
      [EventPriority.LOW]: 2,
      [EventPriority.DEFERRED]: 1,
      undefined: 3,
    };

    return hooks.sort((a, b) => {
      const priorityA = priorityMap[a.priority];
      const priorityB = priorityMap[b.priority];
      return priorityB - priorityA;
    });
  }

  /**
   * Evaluate CEL condition (simplified)
   */
  private evaluateCondition(condition: unknown, data: Record<string, unknown>): boolean {
    // Simplified condition evaluation - in production, use a proper CEL library
    return true;
  }

  /**
   * Execute handler with timeout
   */
  private async executeWithTimeout(
    handler: () => Promise<unknown>,
    timeout: number
  ): Promise<unknown> {
    return Promise.race([
      handler(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Hook execution timeout')), timeout)
      ),
    ]);
  }

  /**
   * Update metrics for a hook
   */
  private updateMetrics(hookId: string, success: boolean, duration: number): void {
    const metrics = this.metrics.get(hookId);
    if (!metrics) return;

    metrics.totalExecutions += 1;
    if (success) {
      metrics.successfulExecutions += 1;
    } else {
      metrics.failedExecutions += 1;
    }

    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    metrics.averageDuration =
      (metrics.averageDuration * (metrics.totalExecutions - 1) + duration) /
      metrics.totalExecutions;
    metrics.errorRate =
      (metrics.failedExecutions / metrics.totalExecutions) * 100;
  }

  /**
   * Record audit log entry
   */
  private recordAuditLog(entry: HookAuditLogEntry): void {
    this.auditLogs.push(entry);

    // Keep only recent logs (limit to 10000)
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000);
    }
  }
}

/**
 * Create and return event bus instance
 */
export function createEventBus(): IEventBus {
  return new EventBus();
}
