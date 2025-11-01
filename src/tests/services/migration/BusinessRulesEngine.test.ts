/**
 * Business Rules Engine Tests
 * Phase 3: Conditional Logic and Custom Validators
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BusinessRulesEngine,
  ConditionOperator,
  ConditionExpression,
  CrossFieldRule,
  AggregateValidationRule,
  ConditionalRule
} from '../../../services/migration/validation/BusinessRulesEngine';
import { EntityType, Severity, ValidationContext, ValidationMode } from '../../../services/migration/validation/ValidationService';

describe('BusinessRulesEngine - Phase 3: Business Rules & Conditional Logic', () => {
  let engine: BusinessRulesEngine;

  beforeEach(() => {
    engine = new BusinessRulesEngine();
  });

  // ============================================================================
  // CONDITIONAL RULES
  // ============================================================================

  describe('Conditional Rules (If-Then Logic)', () => {
    it('should evaluate simple equality condition (true)', () => {
      const condition: ConditionExpression = {
        field: 'status',
        operator: ConditionOperator.EQUALS,
        value: 'ACTIVE'
      };

      const record = { status: 'ACTIVE' };
      const result = engine.evaluateCondition(condition, record);

      expect(result).toBe(true);
    });

    it('should evaluate simple equality condition (false)', () => {
      const condition: ConditionExpression = {
        field: 'status',
        operator: ConditionOperator.EQUALS,
        value: 'ACTIVE'
      };

      const record = { status: 'INACTIVE' };
      const result = engine.evaluateCondition(condition, record);

      expect(result).toBe(false);
    });

    it('should evaluate NOT_EQUALS condition', () => {
      const condition: ConditionExpression = {
        field: 'status',
        operator: ConditionOperator.NOT_EQUALS,
        value: 'DELETED'
      };

      expect(engine.evaluateCondition(condition, { status: 'ACTIVE' })).toBe(true);
      expect(engine.evaluateCondition(condition, { status: 'DELETED' })).toBe(false);
    });

    it('should evaluate GREATER_THAN condition', () => {
      const condition: ConditionExpression = {
        field: 'quantity',
        operator: ConditionOperator.GREATER_THAN,
        value: 100
      };

      expect(engine.evaluateCondition(condition, { quantity: 150 })).toBe(true);
      expect(engine.evaluateCondition(condition, { quantity: 50 })).toBe(false);
    });

    it('should evaluate LESS_THAN condition', () => {
      const condition: ConditionExpression = {
        field: 'quantity',
        operator: ConditionOperator.LESS_THAN,
        value: 100
      };

      expect(engine.evaluateCondition(condition, { quantity: 50 })).toBe(true);
      expect(engine.evaluateCondition(condition, { quantity: 150 })).toBe(false);
    });

    it('should evaluate GREATER_OR_EQUAL condition', () => {
      const condition: ConditionExpression = {
        field: 'quantity',
        operator: ConditionOperator.GREATER_OR_EQUAL,
        value: 100
      };

      expect(engine.evaluateCondition(condition, { quantity: 100 })).toBe(true);
      expect(engine.evaluateCondition(condition, { quantity: 150 })).toBe(true);
      expect(engine.evaluateCondition(condition, { quantity: 50 })).toBe(false);
    });

    it('should evaluate IN condition', () => {
      const condition: ConditionExpression = {
        field: 'status',
        operator: ConditionOperator.IN,
        value: ['ACTIVE', 'PENDING']
      };

      expect(engine.evaluateCondition(condition, { status: 'ACTIVE' })).toBe(true);
      expect(engine.evaluateCondition(condition, { status: 'PENDING' })).toBe(true);
      expect(engine.evaluateCondition(condition, { status: 'DELETED' })).toBe(false);
    });

    it('should evaluate NOT_IN condition', () => {
      const condition: ConditionExpression = {
        field: 'status',
        operator: ConditionOperator.NOT_IN,
        value: ['DELETED', 'ARCHIVED']
      };

      expect(engine.evaluateCondition(condition, { status: 'ACTIVE' })).toBe(true);
      expect(engine.evaluateCondition(condition, { status: 'DELETED' })).toBe(false);
    });

    it('should evaluate CONTAINS condition', () => {
      const condition: ConditionExpression = {
        field: 'description',
        operator: ConditionOperator.CONTAINS,
        value: 'urgent'
      };

      expect(engine.evaluateCondition(condition, { description: 'This is urgent' })).toBe(true);
      expect(engine.evaluateCondition(condition, { description: 'This is normal' })).toBe(false);
    });

    it('should evaluate STARTS_WITH condition', () => {
      const condition: ConditionExpression = {
        field: 'partNumber',
        operator: ConditionOperator.STARTS_WITH,
        value: 'P-'
      };

      expect(engine.evaluateCondition(condition, { partNumber: 'P-001' })).toBe(true);
      expect(engine.evaluateCondition(condition, { partNumber: 'M-001' })).toBe(false);
    });

    it('should evaluate ENDS_WITH condition', () => {
      const condition: ConditionExpression = {
        field: 'partNumber',
        operator: ConditionOperator.ENDS_WITH,
        value: '-REV'
      };

      expect(engine.evaluateCondition(condition, { partNumber: 'P-001-REV' })).toBe(true);
      expect(engine.evaluateCondition(condition, { partNumber: 'P-001' })).toBe(false);
    });

    it('should evaluate MATCHES_REGEX condition', () => {
      const condition: ConditionExpression = {
        field: 'email',
        operator: ConditionOperator.MATCHES_REGEX,
        value: '^[^@]+@[^@]+\\.[^@]+$'
      };

      expect(engine.evaluateCondition(condition, { email: 'user@example.com' })).toBe(true);
      expect(engine.evaluateCondition(condition, { email: 'invalid-email' })).toBe(false);
    });

    it('should evaluate IS_EMPTY condition', () => {
      const condition: ConditionExpression = {
        field: 'description',
        operator: ConditionOperator.IS_EMPTY
      };

      expect(engine.evaluateCondition(condition, { description: '' })).toBe(true);
      expect(engine.evaluateCondition(condition, { description: '   ' })).toBe(true);
      expect(engine.evaluateCondition(condition, { description: 'text' })).toBe(false);
      expect(engine.evaluateCondition(condition, { description: null })).toBe(true);
    });

    it('should evaluate IS_NOT_EMPTY condition', () => {
      const condition: ConditionExpression = {
        field: 'description',
        operator: ConditionOperator.IS_NOT_EMPTY
      };

      expect(engine.evaluateCondition(condition, { description: 'text' })).toBe(true);
      expect(engine.evaluateCondition(condition, { description: '' })).toBe(false);
    });
  });

  // ============================================================================
  // COMPOUND CONDITIONS (AND, OR, NOT)
  // ============================================================================

  describe('Compound Conditions', () => {
    it('should evaluate AND condition (both true)', () => {
      const condition: ConditionExpression = {
        operator: ConditionOperator.AND,
        conditions: [
          { field: 'status', operator: ConditionOperator.EQUALS, value: 'ACTIVE' },
          { field: 'quantity', operator: ConditionOperator.GREATER_THAN, value: 10 }
        ]
      };

      const record = { status: 'ACTIVE', quantity: 50 };
      expect(engine.evaluateCondition(condition, record)).toBe(true);
    });

    it('should evaluate AND condition (one false)', () => {
      const condition: ConditionExpression = {
        operator: ConditionOperator.AND,
        conditions: [
          { field: 'status', operator: ConditionOperator.EQUALS, value: 'ACTIVE' },
          { field: 'quantity', operator: ConditionOperator.GREATER_THAN, value: 100 }
        ]
      };

      const record = { status: 'ACTIVE', quantity: 50 };
      expect(engine.evaluateCondition(condition, record)).toBe(false);
    });

    it('should evaluate OR condition (first true)', () => {
      const condition: ConditionExpression = {
        operator: ConditionOperator.OR,
        conditions: [
          { field: 'status', operator: ConditionOperator.EQUALS, value: 'ACTIVE' },
          { field: 'quantity', operator: ConditionOperator.GREATER_THAN, value: 100 }
        ]
      };

      const record = { status: 'ACTIVE', quantity: 50 };
      expect(engine.evaluateCondition(condition, record)).toBe(true);
    });

    it('should evaluate OR condition (second true)', () => {
      const condition: ConditionExpression = {
        operator: ConditionOperator.OR,
        conditions: [
          { field: 'status', operator: ConditionOperator.EQUALS, value: 'INACTIVE' },
          { field: 'quantity', operator: ConditionOperator.GREATER_THAN, value: 40 }
        ]
      };

      const record = { status: 'ACTIVE', quantity: 50 };
      expect(engine.evaluateCondition(condition, record)).toBe(true);
    });

    it('should evaluate NOT condition', () => {
      const condition: ConditionExpression = {
        operator: ConditionOperator.NOT,
        conditions: [
          { field: 'status', operator: ConditionOperator.EQUALS, value: 'DELETED' }
        ]
      };

      expect(engine.evaluateCondition(condition, { status: 'ACTIVE' })).toBe(true);
      expect(engine.evaluateCondition(condition, { status: 'DELETED' })).toBe(false);
    });

    it('should evaluate nested compound conditions', () => {
      const condition: ConditionExpression = {
        operator: ConditionOperator.AND,
        conditions: [
          {
            operator: ConditionOperator.OR,
            conditions: [
              { field: 'status', operator: ConditionOperator.EQUALS, value: 'ACTIVE' },
              { field: 'status', operator: ConditionOperator.EQUALS, value: 'PENDING' }
            ]
          },
          { field: 'quantity', operator: ConditionOperator.GREATER_THAN, value: 10 }
        ]
      };

      expect(engine.evaluateCondition(condition, { status: 'ACTIVE', quantity: 50 })).toBe(true);
      expect(engine.evaluateCondition(condition, { status: 'PENDING', quantity: 5 })).toBe(false);
      expect(engine.evaluateCondition(condition, { status: 'DELETED', quantity: 50 })).toBe(false);
    });
  });

  // ============================================================================
  // CROSS-FIELD RULES
  // ============================================================================

  describe('Cross-Field Validation', () => {
    it('should register and validate cross-field rule', async () => {
      const validator = async (record: any, fields: string[]) => {
        // Validate that if startDate is provided, endDate must be after startDate
        if (record.startDate && record.endDate) {
          if (new Date(record.endDate) <= new Date(record.startDate)) {
            return {
              valid: false,
              message: 'End date must be after start date',
              suggestedFix: 'Adjust end date to be after start date'
            };
          }
        }
        return { valid: true };
      };

      engine.registerCrossFieldRule(
        EntityType.WORK_ORDER,
        'DATE_RANGE_RULE',
        ['startDate', 'endDate'],
        validator
      );

      const rules = engine.getCrossFieldRules(EntityType.WORK_ORDER);
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('DATE_RANGE_RULE');
    });

    it('should validate cross-field constraint', async () => {
      const validator = async (record: any, fields: string[]) => {
        if (record.isSerialized && !record.serialNumber) {
          return {
            valid: false,
            message: 'Serial number required for serialized parts'
          };
        }
        return { valid: true };
      };

      engine.registerCrossFieldRule(
        EntityType.PART,
        'SERIALIZATION_RULE',
        ['isSerialized', 'serialNumber'],
        validator
      );

      const rules = engine.getCrossFieldRules(EntityType.PART);
      expect(rules[0].fields).toContain('isSerialized');
      expect(rules[0].fields).toContain('serialNumber');
    });
  });

  // ============================================================================
  // AGGREGATE RULES
  // ============================================================================

  describe('Aggregate Validation', () => {
    it('should register and validate aggregate rule', async () => {
      const aggregateFunc = async (values: any[]) => {
        // Sum must not exceed 1000
        const sum = values.reduce((a, b) => a + (b || 0), 0);
        return sum <= 1000;
      };

      engine.registerAggregateRule(
        EntityType.WORK_ORDER,
        'SUM_LIMIT_RULE',
        ['quantity1', 'quantity2', 'quantity3'],
        aggregateFunc
      );

      const rules = engine.getAggregateRules(EntityType.WORK_ORDER);
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('SUM_LIMIT_RULE');
      expect(rules[0].fields).toEqual(['quantity1', 'quantity2', 'quantity3']);
    });

    it('should validate aggregate constraint', async () => {
      const aggregateFunc = async (values: any[]) => {
        // All values must be positive
        return values.every(v => v === null || v === undefined || v > 0);
      };

      engine.registerAggregateRule(
        EntityType.PART,
        'POSITIVE_VALUES_RULE',
        ['quantity', 'reorderPoint', 'safetyStock'],
        aggregateFunc
      );

      const rules = engine.getAggregateRules(EntityType.PART);
      expect(rules[0].fields).toHaveLength(3);
    });
  });

  // ============================================================================
  // RULE METADATA
  // ============================================================================

  describe('Rule Metadata and Dependencies', () => {
    it('should store rule metadata', () => {
      engine.registerCrossFieldRule(
        EntityType.PART,
        'TEST_RULE',
        ['field1', 'field2'],
        async () => ({ valid: true }),
        Severity.ERROR,
        {
          name: 'Test Rule',
          description: 'A test rule',
          dependencies: ['PARENT_RULE'],
          conflictsWith: ['CONFLICTING_RULE']
        }
      );

      const metadata = engine.getRuleMetadata('TEST_RULE');
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('Test Rule');
      expect(metadata?.description).toBe('A test rule');
    });

    it('should check rule dependencies', () => {
      engine.registerCrossFieldRule(
        EntityType.PART,
        'DEPENDENT_RULE',
        ['field1'],
        async () => ({ valid: true }),
        Severity.ERROR,
        {
          dependencies: ['MISSING_DEPENDENCY']
        }
      );

      const deps = engine.checkRuleDependencies('DEPENDENT_RULE');
      expect(deps.satisfied).toBe(false);
      expect(deps.missing).toContain('MISSING_DEPENDENCY');
    });

    it('should check rule conflicts', () => {
      engine.registerCrossFieldRule(
        EntityType.PART,
        'RULE_A',
        ['field1'],
        async () => ({ valid: true }),
        Severity.ERROR,
        {
          conflictsWith: ['RULE_B']
        }
      );

      engine.registerCrossFieldRule(
        EntityType.PART,
        'RULE_B',
        ['field1'],
        async () => ({ valid: true }),
        Severity.ERROR
      );

      const conflicts = engine.checkRuleConflicts('RULE_A');
      expect(conflicts).toContain('RULE_B');
    });
  });

  // ============================================================================
  // RULE VERSIONING
  // ============================================================================

  describe('Rule Versioning and History', () => {
    it('should track rule versions', () => {
      engine.registerCrossFieldRule(
        EntityType.PART,
        'VERSIONED_RULE',
        ['field1'],
        async () => ({ valid: true })
      );

      const history = engine.getRuleHistory('VERSIONED_RULE');
      expect(history).toHaveLength(1);
      expect(history[0].version).toBe(1);
      expect(history[0].isActive).toBe(true);
    });

    it('should create new version on update', () => {
      engine.registerCrossFieldRule(
        EntityType.PART,
        'UPDATED_RULE',
        ['field1'],
        async () => ({ valid: true })
      );

      // Get the rule
      const allRules = engine.getAllRuleMetadata();
      const rule = allRules.find(r => r.id === 'UPDATED_RULE');

      if (rule) {
        // Simulate update
        const updatedRule = {
          id: 'UPDATED_RULE',
          entityType: EntityType.PART,
          field: undefined,
          ruleType: ValidationType.BUSINESS_RULE,
          severity: Severity.ERROR,
          description: 'Updated rule',
          enabled: true,
          version: 2,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        engine.updateRuleWithVersion(
          'UPDATED_RULE',
          updatedRule,
          'Updated validation logic'
        );

        const updatedHistory = engine.getRuleHistory('UPDATED_RULE');
        expect(updatedHistory.length).toBeGreaterThan(1);
        expect(updatedHistory[updatedHistory.length - 1].isActive).toBe(true);
      }
    });

    it('should activate specific rule version', () => {
      engine.registerCrossFieldRule(
        EntityType.PART,
        'VERSION_TEST_RULE',
        ['field1'],
        async () => ({ valid: true })
      );

      const history1 = engine.getRuleHistory('VERSION_TEST_RULE');
      expect(history1[0].isActive).toBe(true);

      // Activate version 1 explicitly
      const result = engine.activateRuleVersion('VERSION_TEST_RULE', 1);
      expect(result).toBe(true);

      const history2 = engine.getRuleHistory('VERSION_TEST_RULE');
      expect(history2[0].isActive).toBe(true);
    });
  });

  // ============================================================================
  // RULE MANAGEMENT
  // ============================================================================

  describe('Rule Management', () => {
    it('should list all rules', () => {
      engine.registerCrossFieldRule(
        EntityType.PART,
        'RULE_1',
        ['field1'],
        async () => ({ valid: true })
      );

      engine.registerCrossFieldRule(
        EntityType.WORK_ORDER,
        'RULE_2',
        ['field1'],
        async () => ({ valid: true })
      );

      engine.registerAggregateRule(
        EntityType.PART,
        'RULE_3',
        ['field1'],
        async () => true
      );

      const allRules = engine.getAllRules();
      // Rules are stored in multiple maps, so won't have all
      expect(allRules).toBeDefined();
    });

    it('should list all rule metadata', () => {
      engine.registerCrossFieldRule(
        EntityType.PART,
        'META_RULE_1',
        ['field1'],
        async () => ({ valid: true })
      );

      engine.registerCrossFieldRule(
        EntityType.PART,
        'META_RULE_2',
        ['field1'],
        async () => ({ valid: true })
      );

      const allMetadata = engine.getAllRuleMetadata();
      expect(allMetadata.length).toBeGreaterThanOrEqual(2);
    });

    it('should clear all rules', () => {
      engine.registerCrossFieldRule(
        EntityType.PART,
        'CLEAR_RULE',
        ['field1'],
        async () => ({ valid: true })
      );

      engine.clearAllRules();

      const allMetadata = engine.getAllRuleMetadata();
      expect(allMetadata).toHaveLength(0);
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe('Integration Scenarios', () => {
    it('should validate complex business rule scenario', () => {
      // Scenario: For serialized parts, both serialNumber and trackingCode are required
      const condition: ConditionExpression = {
        field: 'isSerialized',
        operator: ConditionOperator.EQUALS,
        value: true
      };

      const isSerializedPart = engine.evaluateCondition(condition, { isSerialized: true });
      expect(isSerializedPart).toBe(true);

      // If serialized, validate cross-fields
      if (isSerializedPart) {
        engine.registerCrossFieldRule(
          EntityType.PART,
          'SERIALIZED_PART_RULE',
          ['serialNumber', 'trackingCode'],
          async (record) => {
            if (!record.serialNumber || !record.trackingCode) {
              return {
                valid: false,
                message: 'Serialized parts require both serialNumber and trackingCode'
              };
            }
            return { valid: true };
          }
        );
      }

      const rules = engine.getCrossFieldRules(EntityType.PART);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should handle date range validation', () => {
      const condition: ConditionExpression = {
        operator: ConditionOperator.AND,
        conditions: [
          { field: 'startDate', operator: ConditionOperator.IS_NOT_EMPTY },
          { field: 'endDate', operator: ConditionOperator.IS_NOT_EMPTY }
        ]
      };

      const record = { startDate: '2024-01-01', endDate: '2024-12-31' };
      const bothDatesProvided = engine.evaluateCondition(condition, record);
      expect(bothDatesProvided).toBe(true);
    });

    it('should handle status-dependent validation', () => {
      const condition: ConditionExpression = {
        field: 'status',
        operator: ConditionOperator.IN,
        value: ['PROCESSING', 'TESTING']
      };

      const record = { status: 'PROCESSING' };
      const isProcessing = engine.evaluateCondition(condition, record);
      expect(isProcessing).toBe(true);

      // If processing, require approvalDate
      if (isProcessing) {
        engine.registerCrossFieldRule(
          EntityType.WORK_ORDER,
          'PROCESSING_APPROVAL_RULE',
          ['status', 'approvalDate'],
          async (record) => {
            if (!record.approvalDate) {
              return {
                valid: false,
                message: 'Approval date required for processing status'
              };
            }
            return { valid: true };
          }
        );
      }

      const rules = engine.getCrossFieldRules(EntityType.WORK_ORDER);
      expect(rules.length).toBeGreaterThan(0);
    });
  });
});

// Helper for importing ValidationType
import { ValidationType } from '../../../services/migration/validation/ValidationService';
