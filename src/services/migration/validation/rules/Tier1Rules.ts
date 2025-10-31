/**
 * Validation Rules for Tier 1 Entities (Issue #33 Phase 1-2)
 * Part, SITE, EQUIPMENT, PERSONNEL, ROUTING
 */

import { ValidationRule, ValidationType, ValidationSeverity, EntityType } from '../types';

/**
 * PART Entity Validation Rules
 */
export const PART_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'PART_001',
    entityType: 'PART' as EntityType,
    field: 'partNumber',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: ValidationSeverity.ERROR,
    description: 'Part Number is required',
    isActive: true,
    version: 1,
    requiredRule: {
      allowEmpty: false,
      allowNull: false,
      trimWhitespace: true,
    },
  },
  {
    id: 'PART_002',
    entityType: 'PART' as EntityType,
    field: 'partNumber',
    ruleType: ValidationType.FORMAT,
    severity: ValidationSeverity.ERROR,
    description: 'Part Number must match pattern: alphanumeric with hyphens',
    isActive: true,
    version: 1,
    formatRule: {
      pattern: '^[A-Z0-9-]+$',
      message: 'Use only uppercase letters, numbers, and hyphens',
    },
  },
  {
    id: 'PART_003',
    entityType: 'PART' as EntityType,
    field: 'partNumber',
    ruleType: ValidationType.UNIQUE,
    severity: ValidationSeverity.ERROR,
    description: 'Part Number must be unique',
    isActive: true,
    version: 1,
    uniqueRule: {
      scope: 'database',
      caseSensitive: false,
    },
  },
  {
    id: 'PART_004',
    entityType: 'PART' as EntityType,
    field: 'partName',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: ValidationSeverity.ERROR,
    description: 'Part Name is required',
    isActive: true,
    version: 1,
    requiredRule: {
      allowEmpty: false,
      allowNull: false,
    },
  },
  {
    id: 'PART_005',
    entityType: 'PART' as EntityType,
    field: 'partName',
    ruleType: ValidationType.RANGE,
    severity: ValidationSeverity.WARNING,
    description: 'Part Name should be 3-100 characters',
    isActive: true,
    version: 1,
    rangeRule: {
      min: 3,
      max: 100,
      inclusive: true,
    },
  },
  {
    id: 'PART_006',
    entityType: 'PART' as EntityType,
    field: 'unitOfMeasure',
    ruleType: ValidationType.ENUM,
    severity: ValidationSeverity.ERROR,
    description: 'Unit of Measure must be valid',
    isActive: true,
    version: 1,
    enumRule: {
      values: ['EACH', 'LB', 'FOOT', 'GALLON', 'METER', 'KG', 'LITER', 'BOX', 'PAIR'],
      caseSensitive: true,
    },
  },
  {
    id: 'PART_007',
    entityType: 'PART' as EntityType,
    field: 'standardCost',
    ruleType: ValidationType.RANGE,
    severity: ValidationSeverity.WARNING,
    description: 'Standard Cost should be positive',
    isActive: true,
    version: 1,
    rangeRule: {
      min: 0,
      max: undefined,
      inclusive: false,
    },
  },
];

/**
 * SITE Entity Validation Rules
 */
export const SITE_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'SITE_001',
    entityType: 'SITE' as EntityType,
    field: 'siteCode',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: ValidationSeverity.ERROR,
    description: 'Site Code is required',
    isActive: true,
    version: 1,
    requiredRule: {
      allowEmpty: false,
      allowNull: false,
    },
  },
  {
    id: 'SITE_002',
    entityType: 'SITE' as EntityType,
    field: 'siteCode',
    ruleType: ValidationType.FORMAT,
    severity: ValidationSeverity.ERROR,
    description: 'Site Code must be uppercase alphanumeric',
    isActive: true,
    version: 1,
    formatRule: {
      pattern: '^[A-Z0-9]+$',
      message: 'Use only uppercase letters and numbers',
    },
  },
  {
    id: 'SITE_003',
    entityType: 'SITE' as EntityType,
    field: 'siteCode',
    ruleType: ValidationType.UNIQUE,
    severity: ValidationSeverity.ERROR,
    description: 'Site Code must be unique',
    isActive: true,
    version: 1,
    uniqueRule: {
      scope: 'database',
      caseSensitive: false,
    },
  },
  {
    id: 'SITE_004',
    entityType: 'SITE' as EntityType,
    field: 'siteName',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: ValidationSeverity.ERROR,
    description: 'Site Name is required',
    isActive: true,
    version: 1,
    requiredRule: {
      allowEmpty: false,
      allowNull: false,
    },
  },
];

/**
 * EQUIPMENT Entity Validation Rules
 */
export const EQUIPMENT_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'EQUIP_001',
    entityType: 'EQUIPMENT' as EntityType,
    field: 'equipmentCode',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: ValidationSeverity.ERROR,
    description: 'Equipment Code is required',
    isActive: true,
    version: 1,
    requiredRule: {
      allowEmpty: false,
      allowNull: false,
    },
  },
  {
    id: 'EQUIP_002',
    entityType: 'EQUIPMENT' as EntityType,
    field: 'equipmentCode',
    ruleType: ValidationType.UNIQUE,
    severity: ValidationSeverity.ERROR,
    description: 'Equipment Code must be unique',
    isActive: true,
    version: 1,
    uniqueRule: {
      scope: 'database',
      caseSensitive: true,
    },
  },
  {
    id: 'EQUIP_003',
    entityType: 'EQUIPMENT' as EntityType,
    field: 'siteId',
    ruleType: ValidationType.FOREIGN_KEY,
    severity: ValidationSeverity.ERROR,
    description: 'Equipment must reference valid Site',
    isActive: true,
    version: 1,
    foreignKeyRule: {
      table: 'Site',
      field: 'id',
      cacheable: true,
    },
  },
];

/**
 * PERSONNEL Entity Validation Rules
 */
export const PERSONNEL_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'PERS_001',
    entityType: 'PERSONNEL' as EntityType,
    field: 'employeeId',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: ValidationSeverity.ERROR,
    description: 'Employee ID is required',
    isActive: true,
    version: 1,
    requiredRule: {
      allowEmpty: false,
      allowNull: false,
    },
  },
  {
    id: 'PERS_002',
    entityType: 'PERSONNEL' as EntityType,
    field: 'employeeId',
    ruleType: ValidationType.UNIQUE,
    severity: ValidationSeverity.ERROR,
    description: 'Employee ID must be unique',
    isActive: true,
    version: 1,
    uniqueRule: {
      scope: 'database',
      caseSensitive: true,
    },
  },
  {
    id: 'PERS_003',
    entityType: 'PERSONNEL' as EntityType,
    field: 'lastName',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: ValidationSeverity.ERROR,
    description: 'Last Name is required',
    isActive: true,
    version: 1,
    requiredRule: {
      allowEmpty: false,
      allowNull: false,
    },
  },
  {
    id: 'PERS_004',
    entityType: 'PERSONNEL' as EntityType,
    field: 'firstName',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: ValidationSeverity.ERROR,
    description: 'First Name is required',
    isActive: true,
    version: 1,
    requiredRule: {
      allowEmpty: false,
      allowNull: false,
    },
  },
];

/**
 * ROUTING Entity Validation Rules
 */
export const ROUTING_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'ROUT_001',
    entityType: 'ROUTING' as EntityType,
    field: 'routingCode',
    ruleType: ValidationType.REQUIRED_FIELD,
    severity: ValidationSeverity.ERROR,
    description: 'Routing Code is required',
    isActive: true,
    version: 1,
    requiredRule: {
      allowEmpty: false,
      allowNull: false,
    },
  },
  {
    id: 'ROUT_002',
    entityType: 'ROUTING' as EntityType,
    field: 'routingCode',
    ruleType: ValidationType.UNIQUE,
    severity: ValidationSeverity.ERROR,
    description: 'Routing Code must be unique',
    isActive: true,
    version: 1,
    uniqueRule: {
      scope: 'database',
      caseSensitive: true,
    },
  },
];

/**
 * All Tier 1 rules combined
 */
export const ALL_TIER1_RULES = [
  ...PART_VALIDATION_RULES,
  ...SITE_VALIDATION_RULES,
  ...EQUIPMENT_VALIDATION_RULES,
  ...PERSONNEL_VALIDATION_RULES,
  ...ROUTING_VALIDATION_RULES,
];

/**
 * Get rules by entity type
 */
export function getRulesForEntity(entityType: EntityType): ValidationRule[] {
  switch (entityType) {
    case 'PART':
      return PART_VALIDATION_RULES;
    case 'SITE':
      return SITE_VALIDATION_RULES;
    case 'EQUIPMENT':
      return EQUIPMENT_VALIDATION_RULES;
    case 'PERSONNEL':
      return PERSONNEL_VALIDATION_RULES;
    case 'ROUTING':
      return ROUTING_VALIDATION_RULES;
    default:
      return [];
  }
}
