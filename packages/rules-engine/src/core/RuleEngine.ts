/**
 * Core Rule Engine
 * Main orchestrator for rule registration, execution, and management
 */

import {
  Rule,
  RuleStatus,
  RuleExecutionContext,
  ExecutionResult,
  ExecutionStatus,
  RuleFilter,
  RuleStatistics,
  TriggerType,
  Trigger,
  RuleHookRegistration,
  HookEvent,
} from '../types';

/**
 * Main rule engine for automation
 */
export class RuleEngine {
  private rules: Map<string, Rule> = new Map();
  private hookRegistrations: Map<string, RuleHookRegistration[]> = new Map();
  private executionHistory: ExecutionResult[] = [];
  private ruleStats: Map<string, RuleStatistics> = new Map();
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Register a rule with the engine
   */
  registerRule(rule: Rule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule ${rule.id} already registered`);
    }

    if (!rule.enabled) {
      rule.status = RuleStatus.INACTIVE;
    }

    this.rules.set(rule.id, rule);

    // Initialize statistics
    if (!this.ruleStats.has(rule.id)) {
      this.ruleStats.set(rule.id, {
        ruleId: rule.id,
        ruleName: rule.name,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        partialSuccesses: 0,
        totalExecutionTimeMs: 0,
        averageExecutionTimeMs: 0,
        p95ExecutionTimeMs: 0,
      });
    }

    // Register hooks if applicable
    if (rule.hookPoint) {
      this.registerHook({
        ruleId: rule.id,
        hookPoint: rule.hookPoint,
        priority: rule.priority ?? 50,
        async: rule.async ?? false,
        blocking: rule.blocking ?? false,
        enabled: rule.enabled,
      });
    }

    this.emit('rule-registered', { ruleId: rule.id, ruleName: rule.name });
  }

  /**
   * Unregister a rule
   */
  unregisterRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    // Unregister hooks
    if (rule.hookPoint) {
      this.unregisterHook(ruleId, rule.hookPoint);
    }

    this.rules.delete(ruleId);
    this.emit('rule-unregistered', { ruleId });
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): Rule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * List rules with filtering
   */
  listRules(filter?: RuleFilter): Rule[] {
    let results = Array.from(this.rules.values());

    if (filter) {
      if (filter.status) {
        results = results.filter((r) => r.status === filter.status);
      }
      if (filter.category) {
        results = results.filter((r) => r.category === filter.category);
      }
      if (filter.tags && filter.tags.length > 0) {
        results = results.filter((r) => r.tags?.some((t) => filter.tags!.includes(t)));
      }
      if (filter.siteId) {
        results = results.filter((r) => r.siteId === filter.siteId || !r.siteId);
      }
      if (filter.enabled !== undefined) {
        results = results.filter((r) => r.enabled === filter.enabled);
      }
      if (filter.createdAfter) {
        results = results.filter((r) => r.createdAt >= filter.createdAfter!);
      }
      if (filter.createdBefore) {
        results = results.filter((r) => r.createdAt <= filter.createdBefore!);
      }
    }

    return results;
  }

  /**
   * Update rule
   */
  updateRule(ruleId: string, updates: Partial<Rule>): Rule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const updated = { ...rule, ...updates, updatedAt: new Date() };
    this.rules.set(ruleId, updated);

    // Re-register hooks if hook point changed
    if (updates.hookPoint && updates.hookPoint !== rule.hookPoint) {
      if (rule.hookPoint) {
        this.unregisterHook(ruleId, rule.hookPoint);
      }
      if (updated.hookPoint) {
        this.registerHook({
          ruleId,
          hookPoint: updated.hookPoint,
          priority: updated.priority ?? 50,
          async: updated.async ?? false,
          blocking: updated.blocking ?? false,
          enabled: updated.enabled,
        });
      }
    }

    this.emit('rule-updated', { ruleId, ruleName: updated.name });
    return updated;
  }

  /**
   * Enable/disable rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    rule.enabled = enabled;
    rule.status = enabled ? RuleStatus.ACTIVE : RuleStatus.INACTIVE;

    // Update hook registration
    if (rule.hookPoint) {
      const hooks = this.hookRegistrations.get(rule.hookPoint) || [];
      const hook = hooks.find((h) => h.ruleId === ruleId);
      if (hook) {
        hook.enabled = enabled;
      }
    }

    this.emit('rule-toggled', { ruleId, enabled });
  }

  /**
   * Execute rule manually
   */
  async executeRule(ruleId: string, context: RuleExecutionContext): Promise<ExecutionResult> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    if (!rule.enabled) {
      return {
        executionId: context.executionId,
        ruleId,
        ruleName: rule.name,
        status: ExecutionStatus.SKIPPED,
        startedAt: new Date(),
        actionResults: [],
      };
    }

    const startTime = Date.now();
    const result: ExecutionResult = {
      executionId: context.executionId,
      ruleId,
      ruleName: rule.name,
      status: ExecutionStatus.RUNNING,
      startedAt: new Date(),
      actionResults: [],
    };

    try {
      // Evaluate conditions
      const condEvalStart = Date.now();
      const conditionsMet = rule.conditions ? await this.evaluateConditions(rule.conditions, context) : true;
      result.conditionEvaluationMs = Date.now() - condEvalStart;
      result.conditionsMet = conditionsMet;

      if (!conditionsMet) {
        result.status = ExecutionStatus.SKIPPED;
        result.completedAt = new Date();
        result.executionTimeMs = Date.now() - startTime;
        this.recordExecution(result);
        return result;
      }

      // Execute actions
      for (let i = 0; i < rule.actions.length; i++) {
        const action = rule.actions[i];
        const actionStart = Date.now();

        try {
          const actionResult = await this.executeAction(action, context);
          result.actionResults.push({
            actionIndex: i,
            actionType: action.type,
            status: actionResult.status,
            output: actionResult.output,
            executionTimeMs: Date.now() - actionStart,
          });

          if (actionResult.status === ExecutionStatus.FAILED && rule.blocking) {
            result.status = ExecutionStatus.FAILED;
            break;
          }
        } catch (error) {
          result.actionResults.push({
            actionIndex: i,
            actionType: action.type,
            status: ExecutionStatus.FAILED,
            error: {
              code: 'ACTION_EXECUTION_ERROR',
              message: error instanceof Error ? error.message : String(error),
            },
            executionTimeMs: Date.now() - actionStart,
          });

          if (rule.blocking) {
            result.status = ExecutionStatus.FAILED;
            break;
          }
        }
      }

      // Determine overall status
      const failedCount = result.actionResults.filter((r) => r.status === ExecutionStatus.FAILED).length;
      if (failedCount === 0) {
        result.status = ExecutionStatus.SUCCESS;
      } else if (failedCount < result.actionResults.length) {
        result.status = ExecutionStatus.PARTIAL_SUCCESS;
      } else {
        result.status = ExecutionStatus.FAILED;
      }

      result.completedAt = new Date();
      result.executionTimeMs = Date.now() - startTime;

      // Update rule execution metadata
      rule.executionCount = (rule.executionCount ?? 0) + 1;
      rule.lastExecutedAt = new Date();
    } catch (error) {
      result.status = ExecutionStatus.FAILED;
      result.error = {
        code: 'RULE_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
      };
      result.completedAt = new Date();
      result.executionTimeMs = Date.now() - startTime;
    }

    this.recordExecution(result);
    return result;
  }

  /**
   * Execute hook
   */
  async executeHook(hookEvent: HookEvent): Promise<ExecutionResult[]> {
    const registrations = this.hookRegistrations.get(hookEvent.hookPoint) || [];
    const sortedRegistrations = registrations.sort((a, b) => b.priority - a.priority);

    const results: ExecutionResult[] = [];

    for (const registration of sortedRegistrations) {
      if (!registration.enabled) continue;

      const rule = this.rules.get(registration.ruleId);
      if (!rule) continue;

      const context: RuleExecutionContext = {
        ruleId: rule.id,
        ruleName: rule.name,
        executionId: `exec-${Date.now()}-${Math.random()}`,
        trigger: rule.trigger,
        triggerData: hookEvent.eventData,
        user: hookEvent.userId ? { id: hookEvent.userId, name: '', roles: [] } : undefined,
        site: hookEvent.siteId ? { id: hookEvent.siteId, name: '' } : undefined,
        timestamp: hookEvent.timestamp,
      };

      const result = await this.executeRule(rule.id, context);
      results.push(result);

      if (registration.blocking && result.status === ExecutionStatus.FAILED) {
        break;
      }
    }

    return results;
  }

  /**
   * Evaluate conditions
   */
  async evaluateConditions(condition: any, context: RuleExecutionContext): Promise<boolean> {
    // Simplified condition evaluation
    // In production, this would be more sophisticated
    if (condition.operator === 'and') {
      return Promise.all(
        condition.conditions.map((c: any) => this.evaluateConditions(c, context))
      ).then((results) => results.every((r) => r));
    }

    if (condition.operator === 'or') {
      return Promise.all(
        condition.conditions.map((c: any) => this.evaluateConditions(c, context))
      ).then((results) => results.some((r) => r));
    }

    // Simple condition
    const fieldValue = context.triggerData[condition.field];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return fieldValue > condition.value;
      case 'less_than':
        return fieldValue < condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'starts_with':
        return String(fieldValue).startsWith(String(condition.value));
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return true;
    }
  }

  /**
   * Execute action
   */
  async executeAction(action: any, context: RuleExecutionContext): Promise<{ status: ExecutionStatus; output?: unknown }> {
    // Simplified action execution
    // In production, this would delegate to specific action executors
    try {
      // Simulate action execution
      await new Promise((resolve) => setTimeout(resolve, 10));

      return {
        status: ExecutionStatus.SUCCESS,
        output: { actionType: action.type, executed: true },
      };
    } catch (error) {
      return {
        status: ExecutionStatus.FAILED,
        output: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Register hook
   */
  registerHook(registration: RuleHookRegistration): void {
    if (!this.hookRegistrations.has(registration.hookPoint)) {
      this.hookRegistrations.set(registration.hookPoint, []);
    }
    this.hookRegistrations.get(registration.hookPoint)!.push(registration);
  }

  /**
   * Unregister hook
   */
  unregisterHook(ruleId: string, hookPoint: string): void {
    const hooks = this.hookRegistrations.get(hookPoint) || [];
    const filtered = hooks.filter((h) => h.ruleId !== ruleId);
    if (filtered.length > 0) {
      this.hookRegistrations.set(hookPoint, filtered);
    } else {
      this.hookRegistrations.delete(hookPoint);
    }
  }

  /**
   * Record execution result
   */
  private recordExecution(result: ExecutionResult): void {
    this.executionHistory.push(result);

    // Update statistics
    const stats = this.ruleStats.get(result.ruleId);
    if (stats) {
      stats.totalExecutions++;

      switch (result.status) {
        case ExecutionStatus.SUCCESS:
          stats.successfulExecutions++;
          break;
        case ExecutionStatus.FAILED:
          stats.failedExecutions++;
          break;
        case ExecutionStatus.PARTIAL_SUCCESS:
          stats.partialSuccesses++;
          break;
      }

      if (result.executionTimeMs) {
        stats.totalExecutionTimeMs += result.executionTimeMs;
        stats.averageExecutionTimeMs = stats.totalExecutionTimeMs / stats.totalExecutions;
      }
      stats.lastExecutedAt = result.completedAt;
    }

    this.emit('execution-recorded', result);
  }

  /**
   * Get execution history
   */
  getExecutionHistory(ruleId?: string, limit: number = 100): ExecutionResult[] {
    let results = [...this.executionHistory];

    if (ruleId) {
      results = results.filter((r) => r.ruleId === ruleId);
    }

    return results.slice(-limit);
  }

  /**
   * Get rule statistics
   */
  getRuleStatistics(ruleId: string): RuleStatistics | undefined {
    return this.ruleStats.get(ruleId);
  }

  /**
   * Get all statistics
   */
  getAllStatistics(): RuleStatistics[] {
    return Array.from(this.ruleStats.values());
  }

  /**
   * Subscribe to events
   */
  subscribe(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event) || [];
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in listener for ${event}:`, error);
      }
    }
  }

  /**
   * Get engine statistics
   */
  getEngineStatistics(): {
    totalRules: number;
    activeRules: number;
    totalExecutions: number;
    totalHookPoints: number;
  } {
    return {
      totalRules: this.rules.size,
      activeRules: Array.from(this.rules.values()).filter((r) => r.enabled).length,
      totalExecutions: this.executionHistory.length,
      totalHookPoints: this.hookRegistrations.size,
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.rules.clear();
    this.hookRegistrations.clear();
    this.executionHistory = [];
    this.ruleStats.clear();
  }
}

// Singleton instance
export const ruleEngine = new RuleEngine();
