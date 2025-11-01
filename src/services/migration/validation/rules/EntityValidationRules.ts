/**
 * Entity Validation Rules
 * Phase 4: Comprehensive validation rules for all entity types
 *
 * Defines validation rules for:
 * - Part (components/materials)
 * - BOMItem (bill of materials items)
 * - WorkOrder (manufacturing work orders)
 * - MaterialLot (material batches)
 * - Operation (manufacturing operations)
 * - Equipment (manufacturing equipment)
 * - WorkCenter (production areas)
 * - Routing (process routes)
 * - Site (manufacturing sites)
 * - User (system users)
 */

import {
  ValidationRule,
  ValidationType,
  Severity,
  EntityType
} from '../ValidationService';
import { ConditionOperator } from '../BusinessRulesEngine';

// ============================================================================
// PART VALIDATION RULES
// ============================================================================

export const PART_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'PART_001',
    entityType: EntityType.PART,
    field: 'partNumber',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Part Number is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'PART_002',
    entityType: EntityType.PART,
    field: 'partNumber',
    ruleType: ValidationType.FORMAT,
    severity: Severity.ERROR,
    description: 'Part Number must match pattern: alphanumeric with hyphens',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    formatRule: {
      pattern: '^[A-Z0-9-]+$',
      message: 'Part Number: Use only uppercase letters, numbers, and hyphens'
    }
  },
  {
    id: 'PART_003',
    entityType: EntityType.PART,
    field: 'description',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Part Description is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'PART_004',
    entityType: EntityType.PART,
    field: 'unitOfMeasure',
    ruleType: ValidationType.ENUM,
    severity: Severity.ERROR,
    description: 'Unit of Measure must be a valid value',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    enumRule: {
      values: ['EACH', 'LB', 'KG', 'FT', 'M', 'INCH', 'MM', 'GALLON', 'LITER'],
      caseSensitive: true,
      allowNull: false
    }
  },
  {
    id: 'PART_005',
    entityType: EntityType.PART,
    field: 'standardCost',
    ruleType: ValidationType.RANGE,
    severity: Severity.WARNING,
    description: 'Standard Cost should be positive',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    rangeRule: { min: 0, max: 999999, inclusive: true }
  },
  {
    id: 'PART_006',
    entityType: EntityType.PART,
    field: 'status',
    ruleType: ValidationType.ENUM,
    severity: Severity.ERROR,
    description: 'Part Status must be valid',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    enumRule: {
      values: ['ACTIVE', 'INACTIVE', 'OBSOLETE', 'DRAFT'],
      caseSensitive: false,
      allowNull: false
    }
  }
];

// ============================================================================
// BOM ITEM VALIDATION RULES
// ============================================================================

export const BOM_ITEM_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'BOMITEM_001',
    entityType: EntityType.BOM_ITEM,
    field: 'bomId',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'BOM ID is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'BOMITEM_002',
    entityType: EntityType.BOM_ITEM,
    field: 'componentPartId',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Component Part ID is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'BOMITEM_003',
    entityType: EntityType.BOM_ITEM,
    field: 'quantity',
    ruleType: ValidationType.RANGE,
    severity: Severity.ERROR,
    description: 'Quantity must be positive',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    rangeRule: { min: 0.001, max: 1000000, inclusive: true }
  },
  {
    id: 'BOMITEM_004',
    entityType: EntityType.BOM_ITEM,
    field: 'sequence',
    ruleType: ValidationType.RANGE,
    severity: Severity.WARNING,
    description: 'Sequence should be between 1 and 9999',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    rangeRule: { min: 1, max: 9999, inclusive: true }
  }
];

// ============================================================================
// WORK ORDER VALIDATION RULES
// ============================================================================

export const WORK_ORDER_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'WO_001',
    entityType: EntityType.WORK_ORDER,
    field: 'workOrderNumber',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Work Order Number is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'WO_002',
    entityType: EntityType.WORK_ORDER,
    field: 'quantity',
    ruleType: ValidationType.RANGE,
    severity: Severity.ERROR,
    description: 'Quantity must be positive',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    rangeRule: { min: 0.001, max: 1000000, inclusive: true }
  },
  {
    id: 'WO_003',
    entityType: EntityType.WORK_ORDER,
    field: 'status',
    ruleType: ValidationType.ENUM,
    severity: Severity.ERROR,
    description: 'Work Order Status must be valid',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    enumRule: {
      values: ['DRAFT', 'SCHEDULED', 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'],
      caseSensitive: false,
      allowNull: false
    }
  },
  {
    id: 'WO_004',
    entityType: EntityType.WORK_ORDER,
    field: 'dueDate',
    ruleType: ValidationType.DATA_TYPE,
    severity: Severity.ERROR,
    description: 'Due Date must be a valid date',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    dataTypeRule: { type: 'date' }
  }
];

// ============================================================================
// MATERIAL LOT VALIDATION RULES
// ============================================================================

export const MATERIAL_LOT_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'ML_001',
    entityType: EntityType.MATERIAL_LOT,
    field: 'lotNumber',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Lot Number is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'ML_002',
    entityType: EntityType.MATERIAL_LOT,
    field: 'partId',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Part ID is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'ML_003',
    entityType: EntityType.MATERIAL_LOT,
    field: 'quantity',
    ruleType: ValidationType.RANGE,
    severity: Severity.ERROR,
    description: 'Quantity must be non-negative',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    rangeRule: { min: 0, max: 1000000, inclusive: true }
  },
  {
    id: 'ML_004',
    entityType: EntityType.MATERIAL_LOT,
    field: 'expirationDate',
    ruleType: ValidationType.DATA_TYPE,
    severity: Severity.WARNING,
    description: 'Expiration Date must be a valid date if provided',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    dataTypeRule: { type: 'date' }
  }
];

// ============================================================================
// OPERATION VALIDATION RULES
// ============================================================================

export const OPERATION_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'OP_001',
    entityType: EntityType.OPERATION,
    field: 'operationNumber',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Operation Number is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'OP_002',
    entityType: EntityType.OPERATION,
    field: 'description',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Operation Description is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'OP_003',
    entityType: EntityType.OPERATION,
    field: 'standardTime',
    ruleType: ValidationType.RANGE,
    severity: Severity.WARNING,
    description: 'Standard Time (hours) should be positive',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    rangeRule: { min: 0, max: 999, inclusive: true }
  }
];

// ============================================================================
// EQUIPMENT VALIDATION RULES
// ============================================================================

export const EQUIPMENT_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'EQ_001',
    entityType: EntityType.EQUIPMENT,
    field: 'equipmentNumber',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Equipment Number is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'EQ_002',
    entityType: EntityType.EQUIPMENT,
    field: 'description',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Equipment Description is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'EQ_003',
    entityType: EntityType.EQUIPMENT,
    field: 'status',
    ruleType: ValidationType.ENUM,
    severity: Severity.ERROR,
    description: 'Equipment Status must be valid',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    enumRule: {
      values: ['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'DECOMMISSIONED'],
      caseSensitive: false,
      allowNull: false
    }
  }
];

// ============================================================================
// WORK CENTER VALIDATION RULES
// ============================================================================

export const WORK_CENTER_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'WC_001',
    entityType: EntityType.WORK_CENTER,
    field: 'workCenterCode',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Work Center Code is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'WC_002',
    entityType: EntityType.WORK_CENTER,
    field: 'description',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Work Center Description is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'WC_003',
    entityType: EntityType.WORK_CENTER,
    field: 'capacity',
    ruleType: ValidationType.RANGE,
    severity: Severity.WARNING,
    description: 'Work Center Capacity should be positive',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    rangeRule: { min: 0, max: 1000, inclusive: true }
  }
];

// ============================================================================
// ROUTING VALIDATION RULES
// ============================================================================

export const ROUTING_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'RTG_001',
    entityType: EntityType.ROUTING,
    field: 'routingNumber',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Routing Number is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'RTG_002',
    entityType: EntityType.ROUTING,
    field: 'description',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Routing Description is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'RTG_003',
    entityType: EntityType.ROUTING,
    field: 'version',
    ruleType: ValidationType.FORMAT,
    severity: Severity.ERROR,
    description: 'Routing Version must match pattern X.Y.Z',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    formatRule: {
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      message: 'Version must be in format: X.Y.Z (e.g., 1.0.0)'
    }
  }
];

// ============================================================================
// USER VALIDATION RULES
// ============================================================================

export const USER_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'USER_001',
    entityType: EntityType.USER,
    field: 'username',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Username is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'USER_002',
    entityType: EntityType.USER,
    field: 'email',
    ruleType: ValidationType.FORMAT,
    severity: Severity.ERROR,
    description: 'Email must be valid',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    formatRule: {
      pattern: '^[^@]+@[^@]+\\.[^@]+$',
      message: 'Email must be in valid format'
    }
  },
  {
    id: 'USER_003',
    entityType: EntityType.USER,
    field: 'firstName',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'First Name is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  },
  {
    id: 'USER_004',
    entityType: EntityType.USER,
    field: 'lastName',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: Severity.ERROR,
    description: 'Last Name is required',
    enabled: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
  }
];

// ============================================================================
// Rule Exports
// ============================================================================

export const ALL_ENTITY_RULES: Record<EntityType, ValidationRule[]> = {
  [EntityType.PART]: PART_VALIDATION_RULES,
  [EntityType.BOM_ITEM]: BOM_ITEM_VALIDATION_RULES,
  [EntityType.WORK_ORDER]: WORK_ORDER_VALIDATION_RULES,
  [EntityType.MATERIAL_LOT]: MATERIAL_LOT_VALIDATION_RULES,
  [EntityType.OPERATION]: OPERATION_VALIDATION_RULES,
  [EntityType.EQUIPMENT]: EQUIPMENT_VALIDATION_RULES,
  [EntityType.WORK_CENTER]: WORK_CENTER_VALIDATION_RULES,
  [EntityType.ROUTING]: ROUTING_VALIDATION_RULES,
  [EntityType.USER]: USER_VALIDATION_RULES,
  [EntityType.SITE]: [] // Site rules can be added as needed
};

/**
 * Count total validation rules across all entities
 */
export function getTotalRuleCount(): number {
  return Object.values(ALL_ENTITY_RULES).reduce((sum, rules) => sum + rules.length, 0);
}

/**
 * Get rules for specific entity type
 */
export function getRulesForEntity(entityType: EntityType): ValidationRule[] {
  return ALL_ENTITY_RULES[entityType] || [];
}
