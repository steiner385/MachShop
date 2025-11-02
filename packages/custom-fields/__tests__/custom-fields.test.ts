/**
 * Comprehensive Test Suite for Custom Fields System
 * Tests for migrations, field validation, data type mapping, and rollback
 */

import {
  CustomFieldType,
  DatabaseColumnType,
  CustomFieldMetadata,
  CreateCustomFieldRequest,
  MigrationStatus,
  FieldStorageType,
} from '../src/types';
import { DataTypeMapper } from '../src/mapping/DataTypeMapper';
import { MigrationEngine } from '../src/migrations/MigrationEngine';
import { FieldValidator } from '../src/validation/FieldValidator';

// ============================================================================
// Data Type Mapper Tests
// ============================================================================

describe('DataTypeMapper', () => {
  describe('Type Mapping', () => {
    test('should map STRING to VARCHAR', () => {
      const dbType = DataTypeMapper.mapFieldType(CustomFieldType.STRING);
      expect(dbType).toBe(DatabaseColumnType.VARCHAR);
    });

    test('should map INTEGER to INTEGER', () => {
      const dbType = DataTypeMapper.mapFieldType(CustomFieldType.INTEGER);
      expect(dbType).toBe(DatabaseColumnType.INTEGER);
    });

    test('should map DECIMAL to DECIMAL', () => {
      const dbType = DataTypeMapper.mapFieldType(CustomFieldType.DECIMAL);
      expect(dbType).toBe(DatabaseColumnType.DECIMAL);
    });

    test('should map BOOLEAN to BOOLEAN', () => {
      const dbType = DataTypeMapper.mapFieldType(CustomFieldType.BOOLEAN);
      expect(dbType).toBe(DatabaseColumnType.BOOLEAN);
    });

    test('should map DATE to DATE', () => {
      const dbType = DataTypeMapper.mapFieldType(CustomFieldType.DATE);
      expect(dbType).toBe(DatabaseColumnType.DATE);
    });

    test('should map DATETIME to DATETIME', () => {
      const dbType = DataTypeMapper.mapFieldType(CustomFieldType.DATETIME);
      expect(dbType).toBe(DatabaseColumnType.DATETIME);
    });

    test('should map JSON to JSON', () => {
      const dbType = DataTypeMapper.mapFieldType(CustomFieldType.JSON);
      expect(dbType).toBe(DatabaseColumnType.JSON);
    });

    test('should map ENUM to VARCHAR', () => {
      const dbType = DataTypeMapper.mapFieldType(CustomFieldType.ENUM);
      expect(dbType).toBe(DatabaseColumnType.VARCHAR);
    });
  });

  describe('Column Definition Generation', () => {
    test('should generate simple column definition', () => {
      const field: CustomFieldMetadata = {
        id: 'field1',
        name: 'test_field',
        label: 'Test Field',
        type: CustomFieldType.STRING,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.VARCHAR,
        required: true,
        maxLength: 100,
        version: 1,
      };

      const def = DataTypeMapper.generateColumnDefinition(field);

      expect(def).toContain('test_field');
      expect(def).toContain('VARCHAR');
      expect(def).toContain('NOT NULL');
    });

    test('should include maxLength in VARCHAR definition', () => {
      const field: CustomFieldMetadata = {
        id: 'field1',
        name: 'text_field',
        label: 'Text Field',
        type: CustomFieldType.STRING,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.VARCHAR,
        maxLength: 255,
        required: true,
        version: 1,
      };

      const def = DataTypeMapper.generateColumnDefinition(field);
      expect(def).toContain('VARCHAR(255)');
    });

    test('should include precision and scale in DECIMAL definition', () => {
      const field: CustomFieldMetadata = {
        id: 'field1',
        name: 'price',
        label: 'Price',
        type: CustomFieldType.DECIMAL,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.DECIMAL,
        precision: 10,
        scale: 2,
        required: true,
        version: 1,
      };

      const def = DataTypeMapper.generateColumnDefinition(field);
      expect(def).toContain('DECIMAL(10,2)');
    });

    test('should include DEFAULT value', () => {
      const field: CustomFieldMetadata = {
        id: 'field1',
        name: 'status',
        label: 'Status',
        type: CustomFieldType.STRING,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.VARCHAR,
        defaultValue: 'active',
        version: 1,
      };

      const def = DataTypeMapper.generateColumnDefinition(field);
      expect(def).toContain("DEFAULT 'active'");
    });

    test('should include UNIQUE constraint', () => {
      const field: CustomFieldMetadata = {
        id: 'field1',
        name: 'email',
        label: 'Email',
        type: CustomFieldType.STRING,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.VARCHAR,
        unique: true,
        required: true,
        version: 1,
      };

      const def = DataTypeMapper.generateColumnDefinition(field);
      expect(def).toContain('UNIQUE');
    });
  });

  describe('Type Compatibility', () => {
    test('should allow VARCHAR to TEXT conversion', () => {
      const compat = DataTypeMapper.checkCompatibility(
        DatabaseColumnType.VARCHAR,
        DatabaseColumnType.TEXT
      );

      expect(compat).toBeDefined();
      expect(compat?.compatible).toBe(true);
      expect(compat?.requiresConversion).toBe(false);
    });

    test('should warn about TEXT to VARCHAR data loss', () => {
      const compat = DataTypeMapper.checkCompatibility(
        DatabaseColumnType.TEXT,
        DatabaseColumnType.VARCHAR
      );

      expect(compat).toBeDefined();
      expect(compat?.dateLoss).toBe(true);
      expect(compat?.conversionWarnings).toBeDefined();
    });

    test('should allow INTEGER to BIGINT conversion', () => {
      const compat = DataTypeMapper.checkCompatibility(
        DatabaseColumnType.INTEGER,
        DatabaseColumnType.BIGINT
      );

      expect(compat?.compatible).toBe(true);
    });

    test('should warn about BIGINT to INTEGER data loss', () => {
      const compat = DataTypeMapper.checkCompatibility(
        DatabaseColumnType.BIGINT,
        DatabaseColumnType.INTEGER
      );

      expect(compat?.dateLoss).toBe(true);
    });
  });

  describe('Supported Types', () => {
    test('should return all supported field types', () => {
      const types = DataTypeMapper.getSupportedTypes();
      expect(types.length).toBeGreaterThan(10);
      expect(types).toContain(CustomFieldType.STRING);
      expect(types).toContain(CustomFieldType.INTEGER);
      expect(types).toContain(CustomFieldType.JSON);
    });

    test('should return all supported database types', () => {
      const types = DataTypeMapper.getSupportedDatabaseTypes();
      expect(types.length).toBeGreaterThan(5);
      expect(types).toContain(DatabaseColumnType.VARCHAR);
      expect(types).toContain(DatabaseColumnType.INTEGER);
    });
  });

  describe('Type Validation', () => {
    test('should validate string field mapping', () => {
      const field: CustomFieldMetadata = {
        id: 'field1',
        name: 'text',
        label: 'Text',
        type: CustomFieldType.STRING,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.VARCHAR,
        version: 1,
      };

      const errors = DataTypeMapper.validateTypeMapping(field);
      expect(errors).toHaveLength(0);
    });

    test('should reject invalid decimal precision', () => {
      const field: CustomFieldMetadata = {
        id: 'field1',
        name: 'price',
        label: 'Price',
        type: CustomFieldType.DECIMAL,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.DECIMAL,
        precision: 100, // Too large
        scale: 2,
        version: 1,
      };

      const errors = DataTypeMapper.validateTypeMapping(field);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('INVALID_PRECISION');
    });

    test('should reject enum without values', () => {
      const field: CustomFieldMetadata = {
        id: 'field1',
        name: 'status',
        label: 'Status',
        type: CustomFieldType.ENUM,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.VARCHAR,
        enumValues: [],
        version: 1,
      };

      const errors = DataTypeMapper.validateTypeMapping(field);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('MISSING_ENUM_VALUES');
    });

    test('should reject calculated field without SQL expression', () => {
      const field: CustomFieldMetadata = {
        id: 'field1',
        name: 'total',
        label: 'Total',
        type: CustomFieldType.CALCULATED,
        storageType: FieldStorageType.CALCULATED,
        databaseType: DatabaseColumnType.DECIMAL,
        dependencies: ['price', 'quantity'],
        version: 1,
      };

      const errors = DataTypeMapper.validateTypeMapping(field);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('MISSING_SQL_EXPRESSION');
    });
  });
});

// ============================================================================
// Migration Engine Tests
// ============================================================================

describe('MigrationEngine', () => {
  let engine: MigrationEngine;

  beforeEach(() => {
    engine = new MigrationEngine();
  });

  describe('Migration Creation', () => {
    test('should create a migration', () => {
      const migration = engine.createMigration(
        'add_phone',
        'ALTER TABLE users ADD COLUMN phone VARCHAR(20);',
        'ALTER TABLE users DROP COLUMN phone;'
      );

      expect(migration).toBeDefined();
      expect(migration.id).toBeDefined();
      expect(migration.name).toBe('add_phone');
      expect(migration.status).toBe(MigrationStatus.DRAFT);
    });

    test('should generate ADD COLUMN migration', () => {
      const field: CustomFieldMetadata = {
        id: 'phone',
        name: 'phone',
        label: 'Phone',
        type: CustomFieldType.STRING,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.VARCHAR,
        maxLength: 20,
        required: true,
        version: 1,
      };

      const { upSql, downSql } = engine.generateAddFieldMigration('users', field);

      expect(upSql).toContain('ALTER TABLE users');
      expect(upSql).toContain('ADD COLUMN');
      expect(upSql).toContain('phone');
      expect(downSql).toContain('DROP COLUMN');
    });

    test('should generate DROP COLUMN migration', () => {
      const field: CustomFieldMetadata = {
        id: 'phone',
        name: 'phone',
        label: 'Phone',
        type: CustomFieldType.STRING,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.VARCHAR,
        version: 1,
      };

      const { upSql, downSql } = engine.generateDropFieldMigration('users', field);

      expect(upSql).toContain('DROP COLUMN');
      expect(downSql).toContain('ADD COLUMN');
    });

    test('should generate INDEX migration', () => {
      const { upSql, downSql } = engine.generateIndexMigration(
        'users',
        'idx_email',
        ['email']
      );

      expect(upSql).toContain('CREATE INDEX');
      expect(upSql).toContain('idx_email');
      expect(downSql).toContain('DROP INDEX');
    });

    test('should generate UNIQUE INDEX migration', () => {
      const { upSql } = engine.generateIndexMigration(
        'users',
        'idx_email_unique',
        ['email'],
        true
      );

      expect(upSql).toContain('UNIQUE');
      expect(upSql).toContain('INDEX');
    });
  });

  describe('Migration Validation', () => {
    test('should validate correct migration', () => {
      const migration = engine.createMigration(
        'add_field',
        'ALTER TABLE users ADD COLUMN age INTEGER;',
        'ALTER TABLE users DROP COLUMN age;'
      );

      const result = engine.validateMigration(migration);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject empty SQL migration', () => {
      const migration = engine.createMigration('empty', '', '');

      const result = engine.validateMigration(migration);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('EMPTY_MIGRATION_SQL');
    });

    test('should reject dangerous operations', () => {
      const migration = engine.createMigration(
        'dangerous',
        'DROP DATABASE mydb;',
        'CREATE DATABASE mydb;'
      );

      const result = engine.validateMigration(migration);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('DANGEROUS_OPERATION');
    });

    test('should warn about TRUNCATE operations', () => {
      const migration = engine.createMigration(
        'truncate',
        'TRUNCATE TABLE users;',
        'INSERT INTO users VALUES (...);'
      );

      const result = engine.validateMigration(migration);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should warn about missing rollback SQL', () => {
      const migration = engine.createMigration(
        'no_rollback',
        'ALTER TABLE users ADD COLUMN age INTEGER;',
        ''
      );

      const result = engine.validateMigration(migration);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Migration Execution', () => {
    test('should execute migration successfully', async () => {
      const migration = engine.createMigration(
        'add_field',
        'ALTER TABLE users ADD COLUMN age INTEGER;',
        'ALTER TABLE users DROP COLUMN age;'
      );

      const result = await engine.executeMigration(migration);

      expect(result.success).toBe(true);
      expect(result.status).toBe(MigrationStatus.SUCCESS);
      expect(result.rollbackAvailable).toBe(true);
    });

    test('should fail invalid migration', async () => {
      const migration = engine.createMigration(
        'invalid',
        'INVALID SQL SYNTAX HERE',
        ''
      );

      const result = await engine.executeMigration(migration);

      expect(result.success).toBe(false);
      expect(result.status).toBe(MigrationStatus.FAILED);
    });

    test('should track execution history', async () => {
      const migration1 = engine.createMigration(
        'migration1',
        'ALTER TABLE users ADD COLUMN age INTEGER;',
        'ALTER TABLE users DROP COLUMN age;'
      );

      const migration2 = engine.createMigration(
        'migration2',
        'ALTER TABLE users ADD COLUMN status VARCHAR(20);',
        'ALTER TABLE users DROP COLUMN status;'
      );

      await engine.executeMigration(migration1);
      await engine.executeMigration(migration2);

      const history = engine.getExecutionHistory();

      expect(history.length).toBe(2);
      expect(history[0].name).toBe('migration1');
      expect(history[1].name).toBe('migration2');
    });
  });

  describe('Migration Rollback', () => {
    test('should rollback executed migration', async () => {
      const migration = engine.createMigration(
        'add_field',
        'ALTER TABLE users ADD COLUMN age INTEGER;',
        'ALTER TABLE users DROP COLUMN age;'
      );

      await engine.executeMigration(migration);

      const rollbackResult = await engine.rollbackMigration(migration.id);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.status).toBe(MigrationStatus.ROLLED_BACK);
    });

    test('should not rollback draft migration', async () => {
      const migration = engine.createMigration(
        'draft',
        'ALTER TABLE users ADD COLUMN age INTEGER;',
        'ALTER TABLE users DROP COLUMN age;'
      );

      const result = await engine.rollbackMigration(migration.id);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CANNOT_ROLLBACK');
    });

    test('should track rollback history', async () => {
      const migration = engine.createMigration(
        'test_rollback',
        'ALTER TABLE users ADD COLUMN age INTEGER;',
        'ALTER TABLE users DROP COLUMN age;'
      );

      await engine.executeMigration(migration);
      await engine.rollbackMigration(migration.id);

      const history = engine.getRollbackHistory();

      expect(history.length).toBe(1);
      expect(history[0].name).toBe('test_rollback');
    });
  });

  describe('Migration Queries', () => {
    test('should get pending migrations', async () => {
      const migration1 = engine.createMigration(
        'pending1',
        'ALTER TABLE users ADD COLUMN age INTEGER;',
        'ALTER TABLE users DROP COLUMN age;'
      );

      const migration2 = engine.createMigration(
        'pending2',
        'ALTER TABLE users ADD COLUMN status VARCHAR(20);',
        'ALTER TABLE users DROP COLUMN status;'
      );

      await engine.executeMigration(migration1); // This won't be pending

      const pending = engine.getPendingMigrations();

      expect(pending.length).toBe(1);
      expect(pending[0].name).toBe('pending2');
    });

    test('should get failed migrations', async () => {
      const migration = engine.createMigration(
        'invalid',
        'INVALID SYNTAX',
        ''
      );

      await engine.executeMigration(migration);

      const failed = engine.getFailedMigrations();

      expect(failed.length).toBe(1);
      expect(failed[0].name).toBe('invalid');
    });
  });
});

// ============================================================================
// Field Validator Tests
// ============================================================================

describe('FieldValidator', () => {
  let validator: FieldValidator;

  beforeEach(() => {
    validator = new FieldValidator();
  });

  describe('Create Request Validation', () => {
    test('should validate valid create request', () => {
      const request: CreateCustomFieldRequest = {
        name: 'phone',
        label: 'Phone Number',
        type: CustomFieldType.STRING,
        maxLength: 20,
        required: true,
      };

      const errors = validator.validateCreateRequest(request);

      expect(errors).toHaveLength(0);
    });

    test('should reject missing name', () => {
      const request: CreateCustomFieldRequest = {
        name: '',
        label: 'Test',
        type: CustomFieldType.STRING,
      };

      const errors = validator.validateCreateRequest(request);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('MISSING_NAME');
    });

    test('should reject invalid field name', () => {
      const request: CreateCustomFieldRequest = {
        name: '123invalid', // Cannot start with number
        label: 'Test',
        type: CustomFieldType.STRING,
      };

      const errors = validator.validateCreateRequest(request);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('INVALID_NAME');
    });

    test('should reject missing label', () => {
      const request: CreateCustomFieldRequest = {
        name: 'test',
        label: '',
        type: CustomFieldType.STRING,
      };

      const errors = validator.validateCreateRequest(request);

      expect(errors.length).toBeGreaterThan(0);
    });

    test('should reject unique nullable field', () => {
      const request: CreateCustomFieldRequest = {
        name: 'email',
        label: 'Email',
        type: CustomFieldType.STRING,
        unique: true,
        required: false,
      };

      const errors = validator.validateCreateRequest(request);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('UNIQUE_NULLABLE');
    });

    test('should reject enum without values', () => {
      const request: CreateCustomFieldRequest = {
        name: 'status',
        label: 'Status',
        type: CustomFieldType.ENUM,
        enumValues: [],
      };

      const errors = validator.validateCreateRequest(request);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('MISSING_ENUM_VALUES');
    });

    test('should reject duplicate enum values', () => {
      const request: CreateCustomFieldRequest = {
        name: 'status',
        label: 'Status',
        type: CustomFieldType.ENUM,
        enumValues: ['active', 'inactive', 'active'], // Duplicate
      };

      const errors = validator.validateCreateRequest(request);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('DUPLICATE_ENUM_VALUES');
    });
  });

  describe('Field Metadata Validation', () => {
    test('should validate valid field metadata', () => {
      const field: CustomFieldMetadata = {
        id: 'field1',
        name: 'phone',
        label: 'Phone',
        type: CustomFieldType.STRING,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.VARCHAR,
        version: 1,
      };

      const errors = validator.validateFieldMetadata(field);

      expect(errors).toHaveLength(0);
    });

    test('should reject missing required fields', () => {
      const field: CustomFieldMetadata = {
        id: '',
        name: '',
        label: '',
        type: CustomFieldType.STRING,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.VARCHAR,
        version: 1,
      };

      const errors = validator.validateFieldMetadata(field);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Dependency Validation', () => {
    test('should detect missing dependency', () => {
      const field: CustomFieldMetadata = {
        id: 'total',
        name: 'total',
        label: 'Total',
        type: CustomFieldType.CALCULATED,
        storageType: FieldStorageType.CALCULATED,
        databaseType: DatabaseColumnType.DECIMAL,
        dependencies: ['price', 'quantity'],
        sqlExpression: 'price * quantity',
        version: 1,
      };

      const existingFields = new Map<string, CustomFieldMetadata>();

      const errors = validator.validateDependencies(field, existingFields);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe('MISSING_DEPENDENCY');
    });

    test('should pass with existing dependencies', () => {
      const priceField: CustomFieldMetadata = {
        id: 'price',
        name: 'price',
        label: 'Price',
        type: CustomFieldType.DECIMAL,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.DECIMAL,
        version: 1,
      };

      const quantityField: CustomFieldMetadata = {
        id: 'quantity',
        name: 'quantity',
        label: 'Quantity',
        type: CustomFieldType.INTEGER,
        storageType: FieldStorageType.STORED,
        databaseType: DatabaseColumnType.INTEGER,
        version: 1,
      };

      const totalField: CustomFieldMetadata = {
        id: 'total',
        name: 'total',
        label: 'Total',
        type: CustomFieldType.CALCULATED,
        storageType: FieldStorageType.CALCULATED,
        databaseType: DatabaseColumnType.DECIMAL,
        dependencies: ['price', 'quantity'],
        sqlExpression: 'price * quantity',
        version: 1,
      };

      const existingFields = new Map<string, CustomFieldMetadata>([
        ['price', priceField],
        ['quantity', quantityField],
      ]);

      const errors = validator.validateDependencies(totalField, existingFields);

      expect(errors).toHaveLength(0);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Custom Fields Integration', () => {
  test('should create field and generate migration', () => {
    const validator = new FieldValidator();
    const engine = new MigrationEngine();

    // Create field request
    const request: CreateCustomFieldRequest = {
      name: 'phone',
      label: 'Phone Number',
      type: CustomFieldType.STRING,
      maxLength: 20,
      required: true,
    };

    // Validate request
    const errors = validator.validateCreateRequest(request);
    expect(errors).toHaveLength(0);

    // Create metadata
    const field: CustomFieldMetadata = {
      id: `field_${Date.now()}`,
      name: request.name,
      label: request.label,
      type: request.type,
      storageType: FieldStorageType.STORED,
      databaseType: DatabaseColumnType.VARCHAR,
      maxLength: request.maxLength,
      required: request.required,
      version: 1,
    };

    // Generate migration
    const { upSql, downSql } = engine.generateAddFieldMigration('users', field);

    expect(upSql).toContain('ALTER TABLE users');
    expect(upSql).toContain('ADD COLUMN');
    expect(downSql).toContain('DROP COLUMN');
  });

  test('should validate type transition', () => {
    const oldField: CustomFieldMetadata = {
      id: 'field1',
      name: 'amount',
      label: 'Amount',
      type: CustomFieldType.INTEGER,
      storageType: FieldStorageType.STORED,
      databaseType: DatabaseColumnType.INTEGER,
      version: 1,
    };

    const newField: CustomFieldMetadata = {
      ...oldField,
      type: CustomFieldType.DECIMAL,
      databaseType: DatabaseColumnType.DECIMAL,
      precision: 10,
      scale: 2,
      version: 2,
    };

    const engine = new MigrationEngine();
    const { upSql } = engine.generateModifyFieldMigration('products', oldField, newField);

    expect(upSql).toBeDefined();
    expect(upSql.length).toBeGreaterThan(0);
  });
});
