/**
 * ValidationService Unit Tests
 * Tests for core validation framework (Phase 1)
 */

import {
  ValidationService,
  EntityType,
  ValidationType,
  Severity,
  ValidationMode,
  ValidationRule,
  ValidationResult,
  BatchValidationResult
} from '../../../services/migration/validation/ValidationService';

describe('ValidationService - Phase 1: Core Framework', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  // ============================================================================
  // REQUIRED FIELD VALIDATION
  // ============================================================================

  describe('Required Field Validation', () => {
    beforeEach(() => {
      const rule: ValidationRule = {
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
        requiredRule: {
          allowEmpty: false,
          allowNull: false,
          allowWhitespace: false
        }
      };
      validationService.addRule(rule);
    });

    it('should fail when required field is missing (null)', async () => {
      const record = { partNumber: null, description: 'Test Part' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorType).toBe(ValidationType.REQUIRED_FIELD);
      expect(result.errors[0].field).toBe('partNumber');
    });

    it('should fail when required field is undefined', async () => {
      const record = { description: 'Test Part' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorType).toBe(ValidationType.REQUIRED_FIELD);
    });

    it('should fail when required field is empty string', async () => {
      const record = { partNumber: '', description: 'Test Part' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should fail when required field is only whitespace', async () => {
      const record = { partNumber: '   ', description: 'Test Part' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should pass when required field has value', async () => {
      const record = { partNumber: 'P-001', description: 'Test Part' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should provide helpful error message', async () => {
      const record = { partNumber: null };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.errors[0].message).toContain('required');
      expect(result.errors[0].suggestedFix).toBeDefined();
    });
  });

  // ============================================================================
  // DATA TYPE VALIDATION
  // ============================================================================

  describe('Data Type Validation', () => {
    beforeEach(() => {
      const rules: ValidationRule[] = [
        {
          id: 'PART_002',
          entityType: EntityType.PART,
          field: 'standardCost',
          ruleType: ValidationType.DATA_TYPE,
          severity: Severity.ERROR,
          description: 'Standard Cost must be a number',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          dataTypeRule: { type: 'number' }
        },
        {
          id: 'PART_003',
          entityType: EntityType.PART,
          field: 'quantity',
          ruleType: ValidationType.DATA_TYPE,
          severity: Severity.ERROR,
          description: 'Quantity must be an integer',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          dataTypeRule: { type: 'number', subType: 'integer' }
        },
        {
          id: 'PART_004',
          entityType: EntityType.PART,
          field: 'isActive',
          ruleType: ValidationType.DATA_TYPE,
          severity: Severity.ERROR,
          description: 'Is Active must be a boolean',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          dataTypeRule: { type: 'boolean' }
        }
      ];
      validationService.addRules(rules);
    });

    it('should fail when number field contains string', async () => {
      const record = { standardCost: 'abc' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.valid).toBe(false);
      expect(result.errors[0].errorType).toBe(ValidationType.DATA_TYPE);
    });

    it('should pass when number field contains valid number', async () => {
      const record = { standardCost: 19.99 };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'standardCost');
      expect(error).toBeUndefined();
    });

    it('should fail when integer field contains float', async () => {
      const record = { quantity: 5.5 };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'quantity');
      expect(error).toBeDefined();
      expect(error?.errorType).toBe(ValidationType.DATA_TYPE);
    });

    it('should pass when integer field contains valid integer', async () => {
      const record = { quantity: 10 };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'quantity');
      expect(error).toBeUndefined();
    });

    it('should fail when boolean field contains non-boolean', async () => {
      const record = { isActive: 'yes' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'isActive');
      expect(error).toBeDefined();
      expect(error?.errorType).toBe(ValidationType.DATA_TYPE);
    });

    it('should pass when boolean field contains true', async () => {
      const record = { isActive: true };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'isActive');
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // FORMAT VALIDATION
  // ============================================================================

  describe('Format Validation (Regex)', () => {
    beforeEach(() => {
      const rules: ValidationRule[] = [
        {
          id: 'PART_005',
          entityType: EntityType.PART,
          field: 'partNumber',
          ruleType: ValidationType.FORMAT,
          severity: Severity.ERROR,
          description: 'Part Number format invalid',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          formatRule: {
            pattern: '^[A-Z0-9-]+$',
            message: 'Part Number must contain only uppercase letters, numbers, and hyphens'
          }
        },
        {
          id: 'PART_006',
          entityType: EntityType.PART,
          field: 'email',
          ruleType: ValidationType.FORMAT,
          severity: Severity.WARNING,
          description: 'Email format invalid',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          formatRule: {
            pattern: '^[^@]+@[^@]+\\.[^@]+$',
            message: 'Invalid email format'
          }
        }
      ];
      validationService.addRules(rules);
    });

    it('should fail when value does not match pattern', async () => {
      const record = { partNumber: 'p-001' }; // lowercase
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'partNumber');
      expect(error).toBeDefined();
      expect(error?.errorType).toBe(ValidationType.FORMAT);
    });

    it('should pass when value matches pattern', async () => {
      const record = { partNumber: 'P-001' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'partNumber');
      expect(error).toBeUndefined();
    });

    it('should handle complex patterns (email)', async () => {
      const record = { email: 'invalid-email' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const warning = result.warnings.find(e => e.field === 'email');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe(Severity.WARNING);
    });

    it('should pass email with valid format', async () => {
      const record = { email: 'user@example.com' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'email');
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // RANGE VALIDATION
  // ============================================================================

  describe('Range Validation', () => {
    beforeEach(() => {
      const rules: ValidationRule[] = [
        {
          id: 'PART_007',
          entityType: EntityType.PART,
          field: 'standardCost',
          ruleType: ValidationType.RANGE,
          severity: Severity.WARNING,
          description: 'Standard Cost should be positive',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          rangeRule: { min: 0, max: 99999, inclusive: true }
        },
        {
          id: 'PART_008',
          entityType: EntityType.PART,
          field: 'quantity',
          ruleType: ValidationType.RANGE,
          severity: Severity.ERROR,
          description: 'Quantity must be between 1 and 1000',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          rangeRule: { min: 1, max: 1000, inclusive: true }
        }
      ];
      validationService.addRules(rules);
    });

    it('should fail when value is below minimum', async () => {
      const record = { quantity: 0 };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'quantity');
      expect(error).toBeDefined();
      expect(error?.errorType).toBe(ValidationType.RANGE);
    });

    it('should pass when value equals minimum (inclusive)', async () => {
      const record = { quantity: 1 };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'quantity');
      expect(error).toBeUndefined();
    });

    it('should pass when value is within range', async () => {
      const record = { quantity: 500 };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'quantity');
      expect(error).toBeUndefined();
    });

    it('should fail when value exceeds maximum', async () => {
      const record = { quantity: 1001 };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'quantity');
      expect(error).toBeDefined();
    });
  });

  // ============================================================================
  // ENUM VALIDATION
  // ============================================================================

  describe('Enum Validation', () => {
    beforeEach(() => {
      const rules: ValidationRule[] = [
        {
          id: 'PART_009',
          entityType: EntityType.PART,
          field: 'unitOfMeasure',
          ruleType: ValidationType.ENUM,
          severity: Severity.ERROR,
          description: 'Invalid unit of measure',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          enumRule: {
            values: ['EACH', 'LB', 'FOOT', 'GALLON'],
            caseSensitive: true,
            allowNull: false
          }
        },
        {
          id: 'PART_010',
          entityType: EntityType.PART,
          field: 'status',
          ruleType: ValidationType.ENUM,
          severity: Severity.ERROR,
          description: 'Invalid status',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          enumRule: {
            values: ['ACTIVE', 'INACTIVE', 'OBSOLETE'],
            caseSensitive: false,
            allowNull: false
          }
        }
      ];
      validationService.addRules(rules);
    });

    it('should fail when value is not in enum list', async () => {
      const record = { unitOfMeasure: 'METER' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'unitOfMeasure');
      expect(error).toBeDefined();
      expect(error?.errorType).toBe(ValidationType.ENUM);
    });

    it('should pass when value is in enum list', async () => {
      const record = { unitOfMeasure: 'EACH' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'unitOfMeasure');
      expect(error).toBeUndefined();
    });

    it('should be case-sensitive when specified', async () => {
      const record = { unitOfMeasure: 'each' }; // lowercase
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'unitOfMeasure');
      expect(error).toBeDefined();
    });

    it('should be case-insensitive when specified', async () => {
      const record = { status: 'active' }; // lowercase
      const result = await validationService.validateRecord(record, EntityType.PART);

      const error = result.errors.find(e => e.field === 'status');
      expect(error).toBeUndefined();
    });
  });

  // ============================================================================
  // BATCH VALIDATION
  // ============================================================================

  describe('Batch Validation', () => {
    beforeEach(() => {
      const rule: ValidationRule = {
        id: 'PART_011',
        entityType: EntityType.PART,
        field: 'partNumber',
        ruleType: ValidationType.REQUIRED_FIELD,
        severity: Severity.ERROR,
        description: 'Part Number is required',
        enabled: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        requiredRule: {
          allowEmpty: false,
          allowNull: false,
          allowWhitespace: false
        }
      };
      validationService.addRule(rule);
    });

    it('should validate multiple records', async () => {
      const records = [
        { partNumber: 'P-001', description: 'Part 1' },
        { partNumber: 'P-002', description: 'Part 2' },
        { partNumber: null, description: 'Part 3' }
      ];

      const result = await validationService.validateBatch(
        records,
        EntityType.PART,
        { mode: ValidationMode.PRE_IMPORT }
      );

      expect(result.totalRecords).toBe(3);
      expect(result.validRecords).toBe(2);
      expect(result.invalidRecords).toBe(1);
      expect(result.valid).toBe(false);
    });

    it('should assign row numbers correctly', async () => {
      const records = [
        { partNumber: null },
        { partNumber: 'P-001' }
      ];

      const result = await validationService.validateBatch(
        records,
        EntityType.PART,
        { mode: ValidationMode.PRE_IMPORT }
      );

      expect(result.results[0].rowNumber).toBe(2); // Row 1 is header
      expect(result.results[1].rowNumber).toBe(3);
    });

    it('should calculate batch statistics', async () => {
      const records = [
        { partNumber: 'P-001' },
        { partNumber: 'P-002' },
        { partNumber: null },
        { partNumber: null }
      ];

      const result = await validationService.validateBatch(
        records,
        EntityType.PART,
        { mode: ValidationMode.PRE_IMPORT }
      );

      expect(result.totalRecords).toBe(4);
      expect(result.validRecords).toBe(2);
      expect(result.invalidRecords).toBe(2);
      expect(result.totalErrors).toBe(2);
    });
  });

  // ============================================================================
  // DIMENSION SCORES
  // ============================================================================

  describe('Data Quality Dimension Scores', () => {
    beforeEach(() => {
      const rules: ValidationRule[] = [
        {
          id: 'RULE_001',
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
          id: 'RULE_002',
          entityType: EntityType.PART,
          field: 'standardCost',
          ruleType: ValidationType.DATA_TYPE,
          severity: Severity.ERROR,
          description: 'Standard Cost must be a number',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          dataTypeRule: { type: 'number' }
        }
      ];
      validationService.addRules(rules);
    });

    it('should calculate completeness score', async () => {
      const records = [
        { partNumber: 'P-001', standardCost: 10 }, // complete
        { partNumber: null, standardCost: 20 },    // missing partNumber
        { partNumber: 'P-002', standardCost: 30 }  // complete
      ];

      const result = await validationService.validateBatch(
        records,
        EntityType.PART,
        { mode: ValidationMode.PRE_IMPORT }
      );

      // 2 out of 3 records have no required field errors
      expect(result.dimensionScores.completeness).toBe(67);
    });

    it('should calculate validity score', async () => {
      const records = [
        { partNumber: 'P-001', standardCost: 10 },      // valid
        { partNumber: 'P-002', standardCost: 'abc' },   // invalid cost
        { partNumber: 'P-003', standardCost: 30 }       // valid
      ];

      const result = await validationService.validateBatch(
        records,
        EntityType.PART,
        { mode: ValidationMode.PRE_IMPORT }
      );

      // 2 out of 3 records have no type errors
      expect(result.dimensionScores.validity).toBe(67);
    });

    it('should calculate overall quality score', async () => {
      const records = [
        { partNumber: 'P-001', standardCost: 10 },
        { partNumber: 'P-002', standardCost: 20 }
      ];

      const result = await validationService.validateBatch(
        records,
        EntityType.PART,
        { mode: ValidationMode.PRE_IMPORT }
      );

      expect(result.overallQualityScore).toBe(100);
    });

    it('should reflect quality degradation with errors', async () => {
      const records = [
        { partNumber: null },           // 1 error: -10 points = 90
        { partNumber: 'P-001' }         // valid = 100
      ];

      const result = await validationService.validateBatch(
        records,
        EntityType.PART,
        { mode: ValidationMode.PRE_IMPORT }
      );

      // Average of 90 and 100 = 95
      expect(result.overallQualityScore).toBe(95);
    });
  });

  // ============================================================================
  // CONDITIONAL RULES
  // ============================================================================

  describe('Conditional Rule Evaluation', () => {
    beforeEach(() => {
      const rule: ValidationRule = {
        id: 'PART_012',
        entityType: EntityType.PART,
        field: 'lotNumber',
        ruleType: ValidationType.REQUIRED_FIELD,
        severity: Severity.ERROR,
        description: 'Lot Number required for serialized parts',
        condition: "record.isSerialized === true", // Only applies when isSerialized is true
        enabled: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
      };
      validationService.addRule(rule);
    });

    it('should apply rule when condition is true', async () => {
      const record = { isSerialized: true, lotNumber: null };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should skip rule when condition is false', async () => {
      const record = { isSerialized: false, lotNumber: null };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ============================================================================
  // RULE REGISTRY
  // ============================================================================

  describe('Rule Registry Management', () => {
    it('should add single rule to registry', () => {
      const rule: ValidationRule = {
        id: 'TEST_001',
        entityType: EntityType.PART,
        field: 'testField',
        ruleType: ValidationType.REQUIRED_FIELD,
        severity: Severity.ERROR,
        description: 'Test rule',
        enabled: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
      };

      validationService.addRule(rule);
      const rules = validationService.getRules(EntityType.PART);

      expect(rules).toContainEqual(rule);
    });

    it('should add multiple rules at once', () => {
      const rules: ValidationRule[] = [
        {
          id: 'TEST_001',
          entityType: EntityType.PART,
          field: 'field1',
          ruleType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          description: 'Test rule 1',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
        },
        {
          id: 'TEST_002',
          entityType: EntityType.PART,
          field: 'field2',
          ruleType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          description: 'Test rule 2',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
        }
      ];

      validationService.addRules(rules);
      const retrievedRules = validationService.getRules(EntityType.PART);

      expect(retrievedRules).toHaveLength(2);
    });

    it('should skip disabled rules', async () => {
      const rule: ValidationRule = {
        id: 'DISABLED_001',
        entityType: EntityType.PART,
        field: 'testField',
        ruleType: ValidationType.REQUIRED_FIELD,
        severity: Severity.ERROR,
        description: 'Disabled rule',
        enabled: false, // DISABLED
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
      };

      validationService.addRule(rule);
      const record = { testField: null };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should provide clear error messages', async () => {
      const rule: ValidationRule = {
        id: 'TEST_001',
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
      };

      validationService.addRule(rule);
      const record = { partNumber: null };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.errors[0].message).toBeTruthy();
      expect(result.errors[0].message.length > 0).toBe(true);
    });

    it('should provide suggested fixes', async () => {
      const rule: ValidationRule = {
        id: 'TEST_002',
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
      };

      validationService.addRule(rule);
      const record = { partNumber: null };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.errors[0].suggestedFix).toBeTruthy();
    });

    it('should include actual and expected values', async () => {
      const rule: ValidationRule = {
        id: 'TEST_003',
        entityType: EntityType.PART,
        field: 'quantity',
        ruleType: ValidationType.RANGE,
        severity: Severity.ERROR,
        description: 'Invalid quantity',
        enabled: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        rangeRule: { min: 1, max: 100, inclusive: true }
      };

      validationService.addRule(rule);
      const record = { quantity: 150 };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.errors[0].actualValue).toBe(150);
      expect(result.errors[0].expectedValue).toBeTruthy();
    });
  });

  // ============================================================================
  // RECORD QUALITY SCORE
  // ============================================================================

  describe('Record Quality Score Calculation', () => {
    beforeEach(() => {
      const rules: ValidationRule[] = [
        {
          id: 'RULE_001',
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
          id: 'RULE_002',
          entityType: EntityType.PART,
          field: 'description',
          ruleType: ValidationType.REQUIRED_FIELD,
          severity: Severity.WARNING,
          description: 'Description is recommended',
          enabled: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
        }
      ];
      validationService.addRules(rules);
    });

    it('should be 100 with no errors or warnings', async () => {
      const record = { partNumber: 'P-001', description: 'Test Part' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.qualityScore).toBe(100);
    });

    it('should be 90 with one error (100 - 10)', async () => {
      const record = { partNumber: null, description: 'Test Part' };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.qualityScore).toBe(90);
    });

    it('should be 98 with one warning (100 - 2)', async () => {
      const record = { partNumber: 'P-001', description: null };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.qualityScore).toBe(98);
    });

    it('should not go below 0', async () => {
      // Create a rule that will always fail
      const rule: ValidationRule = {
        id: 'RULE_ERROR',
        entityType: EntityType.PART,
        field: 'test',
        ruleType: ValidationType.REQUIRED_FIELD,
        severity: Severity.ERROR,
        description: 'Test',
        enabled: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        requiredRule: { allowEmpty: false, allowNull: false, allowWhitespace: false }
      };
      validationService.addRule(rule);

      // Add many more rules
      for (let i = 0; i < 20; i++) {
        validationService.addRule({ ...rule, id: `RULE_${i}`, field: `field${i}` });
      }

      const record = { partNumber: null };
      const result = await validationService.validateRecord(record, EntityType.PART);

      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
    });
  });
});
