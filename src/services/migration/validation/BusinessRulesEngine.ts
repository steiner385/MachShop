/**
 * Business Rules Engine
 * Phase 3: Advanced Validation with Conditional Logic and Custom Validators
 *
 * Provides:
 * - Complex conditional rules (if-then logic)
 * - Cross-field validation
 * - Aggregate validation (multiple fields together)
 * - Async custom validators
 * - Rule versioning and history
 * - Dynamic rule registration
 * - Rule dependency tracking
 * - Conflict detection
 */

import {
  ValidationRule,
  ValidationType,
  Severity,
  EntityType,
  ValidationError,
  RuleValidationResult,
  ValidationContext
} from './ValidationService';

// ============================================================================
// Advanced Rule Types
// ============================================================================

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'notEquals',
  GREATER_THAN = 'greaterThan',
  LESS_THAN = 'lessThan',
  GREATER_OR_EQUAL = 'greaterOrEqual',
  LESS_OR_EQUAL = 'lessOrEqual',
  IN = 'in',
  NOT_IN = 'notIn',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  MATCHES_REGEX = 'matchesRegex',
  IS_EMPTY = 'isEmpty',
  IS_NOT_EMPTY = 'isNotEmpty',
  AND = 'and',
  OR = 'or',
  NOT = 'not'
}

export interface ConditionExpression {
  field?: string;
  operator: ConditionOperator;
  value?: any;
  conditions?: ConditionExpression[]; // For AND, OR, NOT
}

export interface CrossFieldRule extends ValidationRule {
  fields: string[];
  customValidator: (record: any, fields: string[], context?: ValidationContext) => Promise<RuleValidationResult>;
  description: string;
}

export interface AggregateValidationRule extends ValidationRule {
  aggregateFunction: (values: any[]) => Promise<boolean>;
  fields: string[];
  description: string;
}

export interface ConditionalRule extends ValidationRule {
  condition: ConditionExpression;
  thenValidate: ValidationRule;
  elseValidate?: ValidationRule;
}

export interface RuleVersion {
  version: number;
  createdAt: Date;
  createdBy?: string;
  changes: string;
  isActive: boolean;
}

export interface RuleMetadata {
  id: string;
  entityType: EntityType;
  name: string;
  description: string;
  versions: RuleVersion[];
  dependencies: string[]; // Other rule IDs this depends on
  conflictsWith: string[]; // Rule IDs this conflicts with
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Business Rules Engine
// ============================================================================

export class BusinessRulesEngine {
  private rules: Map<string, ValidationRule> = new Map();
  private ruleMetadata: Map<string, RuleMetadata> = new Map();
  private crossFieldRules: Map<EntityType, CrossFieldRule[]> = new Map();
  private aggregateRules: Map<EntityType, AggregateValidationRule[]> = new Map();
  private conditionalRules: Map<EntityType, ConditionalRule[]> = new Map();
  private ruleHistory: Map<string, RuleVersion[]> = new Map();

  /**
   * Register a complex conditional rule
   */
  registerConditionalRule(
    entityType: EntityType,
    ruleId: string,
    condition: ConditionExpression,
    thenValidate: ValidationRule,
    elseValidate?: ValidationRule,
    metadata?: Partial<RuleMetadata>
  ): void {
    const rule: ConditionalRule = {
      id: ruleId,
      entityType,
      field: undefined,
      ruleType: ValidationType.BUSINESS_RULE,
      severity: thenValidate.severity,
      description: `Conditional rule: ${ruleId}`,
      enabled: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      condition,
      thenValidate,
      elseValidate
    };

    this.conditionalRules.set(entityType, [
      ...(this.conditionalRules.get(entityType) || []),
      rule
    ]);

    // Store metadata
    this.storeRuleMetadata(ruleId, entityType, metadata);
  }

  /**
   * Register a cross-field validation rule
   * Validates multiple fields together
   */
  registerCrossFieldRule(
    entityType: EntityType,
    ruleId: string,
    fields: string[],
    validator: (record: any, fields: string[], context?: ValidationContext) => Promise<RuleValidationResult>,
    severity: Severity = Severity.ERROR,
    metadata?: Partial<RuleMetadata>
  ): void {
    const rule: CrossFieldRule = {
      id: ruleId,
      entityType,
      fields,
      ruleType: ValidationType.BUSINESS_RULE,
      severity,
      description: `Cross-field rule: ${ruleId} for fields [${fields.join(', ')}]`,
      enabled: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      customValidator: validator
    };

    this.crossFieldRules.set(entityType, [
      ...(this.crossFieldRules.get(entityType) || []),
      rule
    ]);

    this.storeRuleMetadata(ruleId, entityType, metadata);
  }

  /**
   * Register an aggregate validation rule
   * Validates based on aggregate of multiple field values
   */
  registerAggregateRule(
    entityType: EntityType,
    ruleId: string,
    fields: string[],
    aggregateFunc: (values: any[]) => Promise<boolean>,
    severity: Severity = Severity.ERROR,
    metadata?: Partial<RuleMetadata>
  ): void {
    const rule: AggregateValidationRule = {
      id: ruleId,
      entityType,
      fields,
      ruleType: ValidationType.BUSINESS_RULE,
      severity,
      description: `Aggregate rule: ${ruleId} for fields [${fields.join(', ')}]`,
      enabled: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      aggregateFunction: aggregateFunc
    };

    this.aggregateRules.set(entityType, [
      ...(this.aggregateRules.get(entityType) || []),
      rule
    ]);

    this.storeRuleMetadata(ruleId, entityType, metadata);
  }

  /**
   * Evaluate a conditional expression
   */
  evaluateCondition(expression: ConditionExpression, record: any): boolean {
    // Handle compound expressions
    if (expression.operator === ConditionOperator.AND && expression.conditions) {
      return expression.conditions.every(cond => this.evaluateCondition(cond, record));
    }

    if (expression.operator === ConditionOperator.OR && expression.conditions) {
      return expression.conditions.some(cond => this.evaluateCondition(cond, record));
    }

    if (expression.operator === ConditionOperator.NOT && expression.conditions) {
      return !this.evaluateCondition(expression.conditions[0], record);
    }

    // Handle field-based expressions
    if (!expression.field) {
      return false;
    }

    const fieldValue = record[expression.field];

    switch (expression.operator) {
      case ConditionOperator.EQUALS:
        return fieldValue === expression.value;

      case ConditionOperator.NOT_EQUALS:
        return fieldValue !== expression.value;

      case ConditionOperator.GREATER_THAN:
        return fieldValue > expression.value;

      case ConditionOperator.LESS_THAN:
        return fieldValue < expression.value;

      case ConditionOperator.GREATER_OR_EQUAL:
        return fieldValue >= expression.value;

      case ConditionOperator.LESS_OR_EQUAL:
        return fieldValue <= expression.value;

      case ConditionOperator.IN:
        return Array.isArray(expression.value) && expression.value.includes(fieldValue);

      case ConditionOperator.NOT_IN:
        return !Array.isArray(expression.value) || !expression.value.includes(fieldValue);

      case ConditionOperator.CONTAINS:
        return String(fieldValue).includes(String(expression.value));

      case ConditionOperator.NOT_CONTAINS:
        return !String(fieldValue).includes(String(expression.value));

      case ConditionOperator.STARTS_WITH:
        return String(fieldValue).startsWith(String(expression.value));

      case ConditionOperator.ENDS_WITH:
        return String(fieldValue).endsWith(String(expression.value));

      case ConditionOperator.MATCHES_REGEX:
        const regex = new RegExp(expression.value);
        return regex.test(String(fieldValue));

      case ConditionOperator.IS_EMPTY:
        return !fieldValue || (typeof fieldValue === 'string' && fieldValue.trim().length === 0);

      case ConditionOperator.IS_NOT_EMPTY:
        if (fieldValue === null || fieldValue === undefined) {
          return false;
        }
        if (typeof fieldValue === 'string') {
          return fieldValue.trim().length > 0;
        }
        return !!fieldValue;

      default:
        return false;
    }
  }

  /**
   * Validate a conditional rule
   */
  async validateConditionalRule(
    record: any,
    rule: ConditionalRule,
    context?: ValidationContext
  ): Promise<ValidationError | null> {
    const conditionMet = this.evaluateCondition(rule.condition, record);

    if (conditionMet) {
      // Evaluate thenValidate rule
      return await this.validateRuleOnRecord(record, rule.thenValidate, context);
    } else if (rule.elseValidate) {
      // Evaluate elseValidate rule
      return await this.validateRuleOnRecord(record, rule.elseValidate, context);
    }

    return null;
  }

  /**
   * Validate a cross-field rule
   */
  async validateCrossFieldRule(
    record: any,
    rule: CrossFieldRule,
    context?: ValidationContext
  ): Promise<ValidationError | null> {
    const result = await rule.customValidator(record, rule.fields, context);

    if (!result.valid) {
      return {
        field: rule.fields.join(', '),
        errorType: ValidationType.BUSINESS_RULE,
        severity: rule.severity,
        message: result.message || rule.description,
        actualValue: null,
        suggestedFix: result.suggestedFix,
        ruleId: rule.id
      };
    }

    return null;
  }

  /**
   * Validate an aggregate rule
   */
  async validateAggregateRule(
    record: any,
    rule: AggregateValidationRule,
    context?: ValidationContext
  ): Promise<ValidationError | null> {
    const values = rule.fields.map(f => record[f]);
    const isValid = await rule.aggregateFunction(values);

    if (!isValid) {
      return {
        field: rule.fields.join(', '),
        errorType: ValidationType.BUSINESS_RULE,
        severity: rule.severity,
        message: rule.description,
        actualValue: null,
        ruleId: rule.id
      };
    }

    return null;
  }

  /**
   * Get all conditional rules for entity type
   */
  getConditionalRules(entityType: EntityType): ConditionalRule[] {
    return this.conditionalRules.get(entityType) || [];
  }

  /**
   * Get all cross-field rules for entity type
   */
  getCrossFieldRules(entityType: EntityType): CrossFieldRule[] {
    return this.crossFieldRules.get(entityType) || [];
  }

  /**
   * Get all aggregate rules for entity type
   */
  getAggregateRules(entityType: EntityType): AggregateValidationRule[] {
    return this.aggregateRules.get(entityType) || [];
  }

  /**
   * Check for rule conflicts
   */
  checkRuleConflicts(ruleId: string): string[] {
    const metadata = this.ruleMetadata.get(ruleId);
    if (!metadata) {
      return [];
    }

    const conflicts: string[] = [];

    // Check explicitly defined conflicts
    metadata.conflictsWith.forEach(conflictId => {
      const conflictMeta = this.ruleMetadata.get(conflictId);
      if (conflictMeta && conflictMeta.versions.some(v => v.isActive)) {
        conflicts.push(conflictId);
      }
    });

    return conflicts;
  }

  /**
   * Check rule dependencies
   */
  checkRuleDependencies(ruleId: string): { satisfied: boolean; missing: string[] } {
    const metadata = this.ruleMetadata.get(ruleId);
    if (!metadata) {
      return { satisfied: true, missing: [] };
    }

    const missing: string[] = [];

    metadata.dependencies.forEach(depId => {
      const depMeta = this.ruleMetadata.get(depId);
      if (!depMeta || !depMeta.versions.some(v => v.isActive)) {
        missing.push(depId);
      }
    });

    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  /**
   * Enable rule version
   */
  activateRuleVersion(ruleId: string, version: number): boolean {
    const versions = this.ruleHistory.get(ruleId);
    if (!versions) {
      return false;
    }

    const targetVersion = versions.find(v => v.version === version);
    if (!targetVersion) {
      return false;
    }

    // Deactivate all other versions
    versions.forEach(v => {
      v.isActive = v.version === version;
    });

    return true;
  }

  /**
   * Get rule version history
   */
  getRuleHistory(ruleId: string): RuleVersion[] {
    return this.ruleHistory.get(ruleId) || [];
  }

  /**
   * Update rule and create new version
   */
  updateRuleWithVersion(
    ruleId: string,
    updatedRule: ValidationRule,
    changes: string,
    updatedBy?: string
  ): RuleVersion | null {
    const metadata = this.ruleMetadata.get(ruleId);
    if (!metadata) {
      return null;
    }

    const versions = this.ruleHistory.get(ruleId) || [];
    const newVersion = (versions.length > 0 ? Math.max(...versions.map(v => v.version)) : 0) + 1;

    // Deactivate current version
    versions.forEach(v => {
      v.isActive = false;
    });

    // Create new version
    const newVer: RuleVersion = {
      version: newVersion,
      createdAt: new Date(),
      createdBy: updatedBy,
      changes,
      isActive: true
    };

    versions.push(newVer);
    this.ruleHistory.set(ruleId, versions);

    // Update rule
    updatedRule.version = newVersion;
    this.rules.set(ruleId, updatedRule);
    metadata.versions = versions;
    metadata.updatedAt = new Date();

    return newVer;
  }

  /**
   * Store rule metadata
   */
  private storeRuleMetadata(ruleId: string, entityType: EntityType, metadata?: Partial<RuleMetadata>): void {
    const existing = this.ruleMetadata.get(ruleId);
    const existingHistory = this.ruleHistory.get(ruleId);

    const initialVersion: RuleVersion = {
      version: 1,
      createdAt: new Date(),
      createdBy: metadata?.createdBy,
      changes: 'Initial version',
      isActive: true
    };

    const ruleMeta: RuleMetadata = {
      id: ruleId,
      entityType,
      name: metadata?.name || ruleId,
      description: metadata?.description || '',
      versions: [initialVersion],
      dependencies: metadata?.dependencies || [],
      conflictsWith: metadata?.conflictsWith || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (existing) {
      ruleMeta.versions = existing.versions;
      ruleMeta.createdAt = existing.createdAt;
    }

    // Initialize rule history if not already present
    if (!existingHistory) {
      this.ruleHistory.set(ruleId, [initialVersion]);
    }

    this.ruleMetadata.set(ruleId, ruleMeta);
  }

  /**
   * Validate a rule against a record
   */
  private async validateRuleOnRecord(
    record: any,
    rule: ValidationRule,
    context?: ValidationContext
  ): Promise<ValidationError | null> {
    // This is a simplified implementation
    // In production, would integrate with full ValidationService
    return null;
  }

  /**
   * Get rule metadata
   */
  getRuleMetadata(ruleId: string): RuleMetadata | undefined {
    return this.ruleMetadata.get(ruleId);
  }

  /**
   * List all registered rules
   */
  getAllRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * List all rule metadata
   */
  getAllRuleMetadata(): RuleMetadata[] {
    return Array.from(this.ruleMetadata.values());
  }

  /**
   * Clear all rules
   */
  clearAllRules(): void {
    this.rules.clear();
    this.ruleMetadata.clear();
    this.crossFieldRules.clear();
    this.aggregateRules.clear();
    this.conditionalRules.clear();
    this.ruleHistory.clear();
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const businessRulesEngine = new BusinessRulesEngine();
