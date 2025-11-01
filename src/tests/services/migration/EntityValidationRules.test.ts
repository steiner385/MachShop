/**
 * Entity Validation Rules Tests
 * Phase 4: Comprehensive validation rules for all entity types
 */

import { describe, it, expect } from 'vitest';
import {
  PART_VALIDATION_RULES,
  BOM_ITEM_VALIDATION_RULES,
  WORK_ORDER_VALIDATION_RULES,
  MATERIAL_LOT_VALIDATION_RULES,
  OPERATION_VALIDATION_RULES,
  EQUIPMENT_VALIDATION_RULES,
  WORK_CENTER_VALIDATION_RULES,
  ROUTING_VALIDATION_RULES,
  USER_VALIDATION_RULES,
  ALL_ENTITY_RULES,
  getTotalRuleCount,
  getRulesForEntity
} from '../../../services/migration/validation/rules/EntityValidationRules';
import { EntityType, ValidationType, Severity } from '../../../services/migration/validation/ValidationService';

describe('Entity Validation Rules - Phase 4: Rule Definitions', () => {
  // ============================================================================
  // PART VALIDATION RULES
  // ============================================================================

  describe('Part Validation Rules', () => {
    it('should have 6 Part validation rules', () => {
      expect(PART_VALIDATION_RULES).toHaveLength(6);
    });

    it('should have required field rule for partNumber', () => {
      const rule = PART_VALIDATION_RULES.find(r => r.id === 'PART_001');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.REQUIRED_FIELD);
      expect(rule?.severity).toBe(Severity.ERROR);
    });

    it('should have format rule for partNumber', () => {
      const rule = PART_VALIDATION_RULES.find(r => r.id === 'PART_002');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.FORMAT);
      expect(rule?.formatRule?.pattern).toBe('^[A-Z0-9-]+$');
    });

    it('should have enum rule for unitOfMeasure', () => {
      const rule = PART_VALIDATION_RULES.find(r => r.id === 'PART_004');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.ENUM);
      expect(rule?.enumRule?.values).toContain('EACH');
      expect(rule?.enumRule?.values).toContain('LB');
    });

    it('should have range rule for standardCost', () => {
      const rule = PART_VALIDATION_RULES.find(r => r.id === 'PART_005');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.RANGE);
      expect(rule?.rangeRule?.min).toBe(0);
      expect(rule?.severity).toBe(Severity.WARNING);
    });
  });

  // ============================================================================
  // BOM ITEM VALIDATION RULES
  // ============================================================================

  describe('BOM Item Validation Rules', () => {
    it('should have 4 BOM Item validation rules', () => {
      expect(BOM_ITEM_VALIDATION_RULES).toHaveLength(4);
    });

    it('should have required field rule for bomId', () => {
      const rule = BOM_ITEM_VALIDATION_RULES.find(r => r.id === 'BOMITEM_001');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.REQUIRED_FIELD);
    });

    it('should have range rule for quantity', () => {
      const rule = BOM_ITEM_VALIDATION_RULES.find(r => r.id === 'BOMITEM_003');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.RANGE);
      expect(rule?.rangeRule?.min).toBe(0.001);
    });
  });

  // ============================================================================
  // WORK ORDER VALIDATION RULES
  // ============================================================================

  describe('Work Order Validation Rules', () => {
    it('should have 4 Work Order validation rules', () => {
      expect(WORK_ORDER_VALIDATION_RULES).toHaveLength(4);
    });

    it('should have required field rule for workOrderNumber', () => {
      const rule = WORK_ORDER_VALIDATION_RULES.find(r => r.id === 'WO_001');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.REQUIRED_FIELD);
    });

    it('should have enum rule for status with valid values', () => {
      const rule = WORK_ORDER_VALIDATION_RULES.find(r => r.id === 'WO_003');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.ENUM);
      expect(rule?.enumRule?.values).toContain('DRAFT');
      expect(rule?.enumRule?.values).toContain('COMPLETED');
    });

    it('should have date type rule for dueDate', () => {
      const rule = WORK_ORDER_VALIDATION_RULES.find(r => r.id === 'WO_004');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.DATA_TYPE);
      expect(rule?.dataTypeRule?.type).toBe('date');
    });
  });

  // ============================================================================
  // MATERIAL LOT VALIDATION RULES
  // ============================================================================

  describe('Material Lot Validation Rules', () => {
    it('should have 4 Material Lot validation rules', () => {
      expect(MATERIAL_LOT_VALIDATION_RULES).toHaveLength(4);
    });

    it('should have required field rule for lotNumber', () => {
      const rule = MATERIAL_LOT_VALIDATION_RULES.find(r => r.id === 'ML_001');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.REQUIRED_FIELD);
    });

    it('should have range rule for quantity', () => {
      const rule = MATERIAL_LOT_VALIDATION_RULES.find(r => r.id === 'ML_003');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.RANGE);
      expect(rule?.rangeRule?.min).toBe(0);
    });
  });

  // ============================================================================
  // OPERATION VALIDATION RULES
  // ============================================================================

  describe('Operation Validation Rules', () => {
    it('should have 3 Operation validation rules', () => {
      expect(OPERATION_VALIDATION_RULES).toHaveLength(3);
    });

    it('should have required field rule for operationNumber', () => {
      const rule = OPERATION_VALIDATION_RULES.find(r => r.id === 'OP_001');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.REQUIRED_FIELD);
    });

    it('should have range rule for standardTime', () => {
      const rule = OPERATION_VALIDATION_RULES.find(r => r.id === 'OP_003');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.RANGE);
      expect(rule?.severity).toBe(Severity.WARNING);
    });
  });

  // ============================================================================
  // EQUIPMENT VALIDATION RULES
  // ============================================================================

  describe('Equipment Validation Rules', () => {
    it('should have 3 Equipment validation rules', () => {
      expect(EQUIPMENT_VALIDATION_RULES).toHaveLength(3);
    });

    it('should have required field rule for equipmentNumber', () => {
      const rule = EQUIPMENT_VALIDATION_RULES.find(r => r.id === 'EQ_001');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.REQUIRED_FIELD);
    });

    it('should have enum rule for status', () => {
      const rule = EQUIPMENT_VALIDATION_RULES.find(r => r.id === 'EQ_003');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.ENUM);
      expect(rule?.enumRule?.values).toContain('ACTIVE');
      expect(rule?.enumRule?.values).toContain('MAINTENANCE');
    });
  });

  // ============================================================================
  // WORK CENTER VALIDATION RULES
  // ============================================================================

  describe('Work Center Validation Rules', () => {
    it('should have 3 Work Center validation rules', () => {
      expect(WORK_CENTER_VALIDATION_RULES).toHaveLength(3);
    });

    it('should have required field rule for workCenterCode', () => {
      const rule = WORK_CENTER_VALIDATION_RULES.find(r => r.id === 'WC_001');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.REQUIRED_FIELD);
    });

    it('should have range rule for capacity', () => {
      const rule = WORK_CENTER_VALIDATION_RULES.find(r => r.id === 'WC_003');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.RANGE);
      expect(rule?.severity).toBe(Severity.WARNING);
    });
  });

  // ============================================================================
  // ROUTING VALIDATION RULES
  // ============================================================================

  describe('Routing Validation Rules', () => {
    it('should have 3 Routing validation rules', () => {
      expect(ROUTING_VALIDATION_RULES).toHaveLength(3);
    });

    it('should have required field rule for routingNumber', () => {
      const rule = ROUTING_VALIDATION_RULES.find(r => r.id === 'RTG_001');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.REQUIRED_FIELD);
    });

    it('should have format rule for version', () => {
      const rule = ROUTING_VALIDATION_RULES.find(r => r.id === 'RTG_003');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.FORMAT);
      expect(rule?.formatRule?.pattern).toBe('^\\d+\\.\\d+\\.\\d+$');
    });
  });

  // ============================================================================
  // USER VALIDATION RULES
  // ============================================================================

  describe('User Validation Rules', () => {
    it('should have 4 User validation rules', () => {
      expect(USER_VALIDATION_RULES).toHaveLength(4);
    });

    it('should have required field rule for username', () => {
      const rule = USER_VALIDATION_RULES.find(r => r.id === 'USER_001');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.REQUIRED_FIELD);
    });

    it('should have format rule for email', () => {
      const rule = USER_VALIDATION_RULES.find(r => r.id === 'USER_002');
      expect(rule).toBeDefined();
      expect(rule?.ruleType).toBe(ValidationType.FORMAT);
      expect(rule?.formatRule?.pattern).toContain('@');
    });
  });

  // ============================================================================
  // RULE AGGREGATION
  // ============================================================================

  describe('Rule Aggregation and Management', () => {
    it('should have rules for all entity types', () => {
      expect(ALL_ENTITY_RULES[EntityType.PART]).toBeDefined();
      expect(ALL_ENTITY_RULES[EntityType.BOM_ITEM]).toBeDefined();
      expect(ALL_ENTITY_RULES[EntityType.WORK_ORDER]).toBeDefined();
      expect(ALL_ENTITY_RULES[EntityType.MATERIAL_LOT]).toBeDefined();
      expect(ALL_ENTITY_RULES[EntityType.OPERATION]).toBeDefined();
      expect(ALL_ENTITY_RULES[EntityType.EQUIPMENT]).toBeDefined();
      expect(ALL_ENTITY_RULES[EntityType.WORK_CENTER]).toBeDefined();
      expect(ALL_ENTITY_RULES[EntityType.ROUTING]).toBeDefined();
      expect(ALL_ENTITY_RULES[EntityType.USER]).toBeDefined();
    });

    it('should count total rules across all entities', () => {
      const totalRules = getTotalRuleCount();
      expect(totalRules).toBeGreaterThan(0);
      // Sum of all rules: 6 + 4 + 4 + 4 + 3 + 3 + 3 + 3 + 4 = 34
      expect(totalRules).toBe(34);
    });

    it('should get rules for specific entity type', () => {
      const partRules = getRulesForEntity(EntityType.PART);
      expect(partRules).toHaveLength(6);
      expect(partRules[0].entityType).toBe(EntityType.PART);
    });

    it('should handle unknown entity type gracefully', () => {
      // Site entity doesn't have rules defined yet
      const siteRules = getRulesForEntity(EntityType.SITE);
      expect(siteRules).toBeDefined();
      expect(Array.isArray(siteRules)).toBe(true);
    });
  });

  // ============================================================================
  // RULE PROPERTIES
  // ============================================================================

  describe('Rule Properties and Structure', () => {
    it('all rules should have required properties', () => {
      const allRules = Object.values(ALL_ENTITY_RULES)
        .flat()
        .filter(r => r.id); // Skip empty site rules

      allRules.forEach(rule => {
        expect(rule.id).toBeDefined();
        expect(rule.entityType).toBeDefined();
        expect(rule.ruleType).toBeDefined();
        expect(rule.severity).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.enabled).toBeDefined();
        expect(rule.version).toBe(1); // All initial rules should be version 1
        expect(rule.createdAt).toBeDefined();
        expect(rule.updatedAt).toBeDefined();
      });
    });

    it('all rules should have valid severity levels', () => {
      const allRules = Object.values(ALL_ENTITY_RULES).flat();

      allRules.forEach(rule => {
        expect([Severity.ERROR, Severity.WARNING, Severity.INFO]).toContain(rule.severity);
      });
    });

    it('all rules should have rule-specific configurations', () => {
      const allRules = Object.values(ALL_ENTITY_RULES).flat();

      allRules.forEach(rule => {
        const hasConfig =
          rule.requiredRule ||
          rule.dataTypeRule ||
          rule.formatRule ||
          rule.rangeRule ||
          rule.enumRule ||
          rule.foreignKeyRule ||
          rule.uniqueRule ||
          rule.businessRule ||
          rule.customRule;

        expect(hasConfig).toBeTruthy();
      });
    });

    it('required field rules should have requiredRule config', () => {
      const requiredRules = Object.values(ALL_ENTITY_RULES)
        .flat()
        .filter(r => r.ruleType === ValidationType.REQUIRED_FIELD);

      requiredRules.forEach(rule => {
        expect(rule.requiredRule).toBeDefined();
      });
    });

    it('format rules should have formatRule config', () => {
      const formatRules = Object.values(ALL_ENTITY_RULES)
        .flat()
        .filter(r => r.ruleType === ValidationType.FORMAT);

      formatRules.forEach(rule => {
        expect(rule.formatRule).toBeDefined();
        expect(rule.formatRule?.pattern).toBeDefined();
        expect(rule.formatRule?.message).toBeDefined();
      });
    });

    it('range rules should have rangeRule config', () => {
      const rangeRules = Object.values(ALL_ENTITY_RULES)
        .flat()
        .filter(r => r.ruleType === ValidationType.RANGE);

      rangeRules.forEach(rule => {
        expect(rule.rangeRule).toBeDefined();
      });
    });

    it('enum rules should have enumRule config', () => {
      const enumRules = Object.values(ALL_ENTITY_RULES)
        .flat()
        .filter(r => r.ruleType === ValidationType.ENUM);

      enumRules.forEach(rule => {
        expect(rule.enumRule).toBeDefined();
        expect(Array.isArray(rule.enumRule?.values)).toBe(true);
      });
    });
  });

  // ============================================================================
  // RULE COVERAGE
  // ============================================================================

  describe('Rule Coverage Analysis', () => {
    it('should have rules for critical fields across entities', () => {
      // Check Part has ID rules
      const partRules = getRulesForEntity(EntityType.PART);
      const hasPartNumberRule = partRules.some(r => r.field === 'partNumber');
      expect(hasPartNumberRule).toBe(true);

      // Check WorkOrder has ID rules
      const woRules = getRulesForEntity(EntityType.WORK_ORDER);
      const hasWONumberRule = woRules.some(r => r.field === 'workOrderNumber');
      expect(hasWONumberRule).toBe(true);

      // Check User has email rules
      const userRules = getRulesForEntity(EntityType.USER);
      const hasEmailRule = userRules.some(r => r.field === 'email');
      expect(hasEmailRule).toBe(true);
    });

    it('should have status validation for entities with status field', () => {
      const woRules = getRulesForEntity(EntityType.WORK_ORDER);
      const statusRule = woRules.find(r => r.field === 'status');
      expect(statusRule).toBeDefined();
      expect(statusRule?.ruleType).toBe(ValidationType.ENUM);

      const eqRules = getRulesForEntity(EntityType.EQUIPMENT);
      const eqStatusRule = eqRules.find(r => r.field === 'status');
      expect(eqStatusRule).toBeDefined();
      expect(eqStatusRule?.ruleType).toBe(ValidationType.ENUM);
    });
  });
});
