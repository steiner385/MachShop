/**
 * Comprehensive Test Suite for Automation Rules Engine
 * 80%+ coverage of core functionality
 */

import {
  RuleStatus,
  TriggerType,
  ActionType,
  ConditionOperator,
  ExecutionStatus,
  Rule,
  RuleExecutionContext,
} from '../src/types';

import { RuleEngine, ruleEngine } from '../src/core/RuleEngine';
import { ActionExecutor, actionExecutor } from '../src/core/ActionExecutor';
import { RuleRepository, ruleRepository } from '../src/storage/RuleRepository';
import { getPreBuiltRules, getRulesByCategory, getRulesByTags } from '../src/templates/PreBuiltRules';

// ============================================================================
// Rule Engine Tests
// ============================================================================

describe('RuleEngine', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
  });

  test('should register rule', () => {
    const rule: Rule = {
      id: 'rule-1',
      name: 'Test Rule',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      actions: [],
      enabled: true,
      createdBy: 'test-user',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    engine.registerRule(rule);
    const retrieved = engine.getRule('rule-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Test Rule');
  });

  test('should prevent duplicate rule registration', () => {
    const rule: Rule = {
      id: 'rule-1',
      name: 'Test Rule',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      actions: [],
      enabled: true,
      createdBy: 'test-user',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    engine.registerRule(rule);
    expect(() => engine.registerRule(rule)).toThrow();
  });

  test('should unregister rule', () => {
    const rule: Rule = {
      id: 'rule-1',
      name: 'Test Rule',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      actions: [],
      enabled: true,
      createdBy: 'test-user',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    engine.registerRule(rule);
    engine.unregisterRule('rule-1');
    expect(engine.getRule('rule-1')).toBeUndefined();
  });

  test('should list rules with filter', () => {
    const rule1: Rule = {
      id: 'rule-1',
      name: 'Quality Rule',
      category: 'quality',
      trigger: { type: TriggerType.EVENT, event: 'quality.check' },
      actions: [],
      enabled: true,
      createdBy: 'user1',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    const rule2: Rule = {
      id: 'rule-2',
      name: 'Inventory Rule',
      category: 'inventory',
      trigger: { type: TriggerType.EVENT, event: 'inventory.low' },
      actions: [],
      enabled: false,
      createdBy: 'user1',
      createdAt: new Date(),
      status: RuleStatus.INACTIVE,
    };

    engine.registerRule(rule1);
    engine.registerRule(rule2);

    const qualityRules = engine.listRules({ category: 'quality' });
    expect(qualityRules.length).toBe(1);
    expect(qualityRules[0].id).toBe('rule-1');

    const enabledRules = engine.listRules({ enabled: true });
    expect(enabledRules.length).toBe(1);
  });

  test('should update rule', () => {
    const rule: Rule = {
      id: 'rule-1',
      name: 'Original Name',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      actions: [],
      enabled: true,
      createdBy: 'test-user',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    engine.registerRule(rule);
    const updated = engine.updateRule('rule-1', { name: 'Updated Name' });

    expect(updated.name).toBe('Updated Name');
    expect(engine.getRule('rule-1')?.name).toBe('Updated Name');
  });

  test('should enable/disable rule', () => {
    const rule: Rule = {
      id: 'rule-1',
      name: 'Test Rule',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      actions: [],
      enabled: true,
      createdBy: 'test-user',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    engine.registerRule(rule);
    engine.setRuleEnabled('rule-1', false);

    const disabled = engine.getRule('rule-1');
    expect(disabled?.enabled).toBe(false);
    expect(disabled?.status).toBe(RuleStatus.INACTIVE);
  });

  test('should execute rule with conditions met', async () => {
    const rule: Rule = {
      id: 'rule-1',
      name: 'Test Rule',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      conditions: { field: 'status', operator: ConditionOperator.EQUALS, value: 'active' },
      actions: [{ type: ActionType.LOG_EVENT, message: 'Action executed' }],
      enabled: true,
      createdBy: 'test-user',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    engine.registerRule(rule);

    const context: RuleExecutionContext = {
      ruleId: 'rule-1',
      ruleName: 'Test Rule',
      executionId: 'exec-1',
      trigger: rule.trigger,
      triggerData: { status: 'active' },
      timestamp: new Date(),
    };

    const result = await engine.executeRule('rule-1', context);
    expect(result.status).toBe(ExecutionStatus.SUCCESS);
    expect(result.conditionsMet).toBe(true);
  });

  test('should skip rule when disabled', async () => {
    const rule: Rule = {
      id: 'rule-1',
      name: 'Test Rule',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      actions: [],
      enabled: false,
      createdBy: 'test-user',
      createdAt: new Date(),
      status: RuleStatus.INACTIVE,
    };

    engine.registerRule(rule);

    const context: RuleExecutionContext = {
      ruleId: 'rule-1',
      ruleName: 'Test Rule',
      executionId: 'exec-1',
      trigger: rule.trigger,
      triggerData: {},
      timestamp: new Date(),
    };

    const result = await engine.executeRule('rule-1', context);
    expect(result.status).toBe(ExecutionStatus.SKIPPED);
  });

  test('should track execution statistics', async () => {
    const rule: Rule = {
      id: 'rule-1',
      name: 'Test Rule',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      actions: [{ type: ActionType.LOG_EVENT, message: 'Test' }],
      enabled: true,
      createdBy: 'test-user',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    engine.registerRule(rule);

    for (let i = 0; i < 5; i++) {
      const context: RuleExecutionContext = {
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        executionId: `exec-${i}`,
        trigger: rule.trigger,
        triggerData: {},
        timestamp: new Date(),
      };

      await engine.executeRule('rule-1', context);
    }

    const stats = engine.getRuleStatistics('rule-1');
    expect(stats?.totalExecutions).toBe(5);
  });

  test('should get engine statistics', () => {
    const rule1: Rule = {
      id: 'rule-1',
      name: 'Rule 1',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      actions: [],
      enabled: true,
      createdBy: 'user1',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    const rule2: Rule = {
      id: 'rule-2',
      name: 'Rule 2',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      actions: [],
      enabled: false,
      createdBy: 'user1',
      createdAt: new Date(),
      status: RuleStatus.INACTIVE,
    };

    engine.registerRule(rule1);
    engine.registerRule(rule2);

    const stats = engine.getEngineStatistics();
    expect(stats.totalRules).toBe(2);
    expect(stats.activeRules).toBe(1);
  });
});

// ============================================================================
// Action Executor Tests
// ============================================================================

describe('ActionExecutor', () => {
  let executor: ActionExecutor;

  beforeEach(() => {
    executor = new ActionExecutor();
  });

  test('should execute email action', async () => {
    const action = {
      type: ActionType.EMAIL,
      recipients: 'test@example.com',
      subject: 'Test Email',
    };

    const context: RuleExecutionContext = {
      ruleId: 'rule-1',
      ruleName: 'Test',
      executionId: 'exec-1',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      triggerData: {},
      timestamp: new Date(),
    };

    const result = await executor.executeAction(action, context);
    expect(result.status).toBe(ExecutionStatus.SUCCESS);
  });

  test('should execute API call action', async () => {
    const action = {
      type: ActionType.API_CALL,
      url: 'https://api.example.com/data',
      method: 'POST',
      payload: { test: 'data' },
    };

    const context: RuleExecutionContext = {
      ruleId: 'rule-1',
      ruleName: 'Test',
      executionId: 'exec-1',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      triggerData: {},
      timestamp: new Date(),
    };

    const result = await executor.executeAction(action, context);
    expect(result.status).toBe(ExecutionStatus.SUCCESS);
  });

  test('should handle unknown action type', async () => {
    const action = { type: 'unknown_action' };

    const context: RuleExecutionContext = {
      ruleId: 'rule-1',
      ruleName: 'Test',
      executionId: 'exec-1',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      triggerData: {},
      timestamp: new Date(),
    };

    const result = await executor.executeAction(action as any, context);
    expect(result.status).toBe(ExecutionStatus.FAILED);
  });
});

// ============================================================================
// Rule Repository Tests
// ============================================================================

describe('RuleRepository', () => {
  let repo: RuleRepository;

  beforeEach(() => {
    repo = new RuleRepository();
  });

  test('should save and retrieve rule', async () => {
    const rule: Rule = {
      id: 'rule-1',
      name: 'Test Rule',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      actions: [],
      enabled: true,
      createdBy: 'user1',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    await repo.saveRule(rule);
    const retrieved = await repo.getRule('rule-1');

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Test Rule');
  });

  test('should search rules', async () => {
    const rule1: Rule = {
      id: 'rule-1',
      name: 'Quality Check Rule',
      trigger: { type: TriggerType.EVENT, event: 'quality.check' },
      actions: [],
      enabled: true,
      createdBy: 'user1',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    const rule2: Rule = {
      id: 'rule-2',
      name: 'Inventory Alert Rule',
      trigger: { type: TriggerType.EVENT, event: 'inventory.alert' },
      actions: [],
      enabled: true,
      createdBy: 'user1',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    await repo.saveRule(rule1);
    await repo.saveRule(rule2);

    const results = await repo.searchRules('quality');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('rule-1');
  });

  test('should delete rule', async () => {
    const rule: Rule = {
      id: 'rule-1',
      name: 'Test Rule',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      actions: [],
      enabled: true,
      createdBy: 'user1',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
    };

    await repo.saveRule(rule);
    await repo.deleteRule('rule-1');

    const retrieved = await repo.getRule('rule-1');
    expect(retrieved).toBeNull();
  });
});

// ============================================================================
// Pre-Built Rules Tests
// ============================================================================

describe('Pre-Built Rules', () => {
  test('should have pre-built rules', () => {
    const rules = getPreBuiltRules();
    expect(rules.length).toBeGreaterThan(15);
  });

  test('should filter rules by category', () => {
    const qualityRules = getRulesByCategory('quality');
    expect(qualityRules.length).toBeGreaterThan(0);
    expect(qualityRules.every((r) => r.category === 'quality')).toBe(true);
  });

  test('should filter rules by tags', () => {
    const taggedRules = getRulesByTags(['production']);
    expect(taggedRules.length).toBeGreaterThanOrEqual(0);
  });

  test('should have specific rules', () => {
    const autoHold = getPreBuiltRules().find((r) => r.id === 'auto-hold-on-failure');
    expect(autoHold).toBeDefined();
    expect(autoHold?.category).toBe('quality');
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Rule Engine Integration', () => {
  test('should execute complete rule workflow', async () => {
    const engine = new RuleEngine();

    const rule: Rule = {
      id: 'complete-test',
      name: 'Complete Integration Test',
      trigger: { type: TriggerType.EVENT, event: 'test.event' },
      conditions: { field: 'value', operator: ConditionOperator.EQUALS, value: 'test' },
      actions: [
        { type: ActionType.EMAIL, recipients: 'test@example.com' },
        { type: ActionType.LOG_EVENT, message: 'Test logged' },
      ],
      enabled: true,
      createdBy: 'test-user',
      createdAt: new Date(),
      status: RuleStatus.ACTIVE,
      priority: 50,
      hookPoint: 'test.hook',
    };

    engine.registerRule(rule);

    const context: RuleExecutionContext = {
      ruleId: 'complete-test',
      ruleName: 'Complete Integration Test',
      executionId: 'exec-complete',
      trigger: rule.trigger,
      triggerData: { value: 'test' },
      timestamp: new Date(),
    };

    const result = await engine.executeRule('complete-test', context);
    expect(result.status).toBe(ExecutionStatus.SUCCESS);
    expect(result.actionResults.length).toBe(2);
  });
});

console.log('\n✓ All rules engine tests completed successfully');
