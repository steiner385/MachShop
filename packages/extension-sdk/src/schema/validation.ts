/**
 * Data Safety & Validation Layer - Enforces data safety policies and validation rules
 * Issue #438: Database Schema Extension Framework
 */

import type {
  SchemaField,
  SchemaTable,
  DataSafetyPolicy,
  SchemaValidationResult,
} from './types';

/**
 * Data safety validator and enforcer
 */
export class DataSafetyValidator {
  private defaultPolicy: DataSafetyPolicy = {
    allowNullOnDelete: true,
    cascadeDelete: false,
    onConflict: 'error',
    backupBeforeMigration: true,
    requireApprovalForDestructive: true,
  };

  /**
   * Validate field against safety rules
   */
  validateField(
    field: SchemaField,
    table: SchemaTable,
    policy: DataSafetyPolicy = this.defaultPolicy
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check max field size
    if (policy.maxRecordSize) {
      const estimatedSize = this.estimateFieldSize(field);
      if (estimatedSize > policy.maxRecordSize) {
        errors.push(
          `Field ${field.name} exceeds max record size: ${estimatedSize} > ${policy.maxRecordSize}`
        );
      }
    }

    // Validate required + default
    if (field.required && field.default === null) {
      errors.push(
        `Field ${field.name} is required but has null default`
      );
    }

    // Validate unique constraint
    if (field.unique && field.type === 'Json') {
      errors.push(
        `Field ${field.name} cannot be unique (JSON type)`
      );
    }

    // Validate null safety in relations
    if (field.relationTarget && !field.required && !policy.allowNullOnDelete) {
      errors.push(
        `Field ${field.name} is a non-required relation but policy requires non-null`
      );
    }

    // Validate field name safety
    const unsafeNames = [
      '__proto__',
      'constructor',
      'prototype',
      'toString',
      'valueOf',
    ];
    if (unsafeNames.includes(field.name.toLowerCase())) {
      errors.push(
        `Field ${field.name} uses unsafe name`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate table against safety rules
   */
  validateTable(
    table: SchemaTable,
    policy: DataSafetyPolicy = this.defaultPolicy
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate table size limit
    if (policy.maxTableSize) {
      const estimatedSize = this.estimateTableSize(table);
      if (estimatedSize > policy.maxTableSize) {
        errors.push(
          `Table ${table.name} exceeds max table size: ${estimatedSize} > ${policy.maxTableSize}`
        );
      }
    }

    // Validate field count
    if (table.fields.length === 0) {
      errors.push(`Table ${table.name} must have at least one field`);
    }

    if (table.fields.length > 256) {
      errors.push(
        `Table ${table.name} exceeds maximum field count (256)`
      );
    }

    // Validate all fields individually
    for (const field of table.fields) {
      const fieldValidation = this.validateField(field, table, policy);
      if (!fieldValidation.valid) {
        errors.push(...fieldValidation.errors);
      }
    }

    // Validate primary key
    if (table.primaryKey) {
      const primaryKeyField = table.fields.find(
        (f) => f.name === table.primaryKey
      );
      if (!primaryKeyField) {
        errors.push(
          `Primary key field not found: ${table.primaryKey}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate cascade delete safety
   */
  validateCascadeDelete(
    sourceTable: SchemaTable,
    targetTable: SchemaTable,
    policy: DataSafetyPolicy = this.defaultPolicy
  ): { safe: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (!policy.cascadeDelete) {
      return { safe: true, warnings: [] };
    }

    // Warn about potential data loss
    warnings.push(
      `Cascade delete enabled: Deleting from ${sourceTable.name} will delete related records in ${targetTable.name}`
    );

    // Check for circular cascade
    if (this.hasCascadeCycle(sourceTable, targetTable)) {
      return {
        safe: false,
        warnings: [
          `Circular cascade detected between ${sourceTable.name} and ${targetTable.name}`,
        ],
      };
    }

    return { safe: true, warnings };
  }

  /**
   * Validate field type safety
   */
  validateTypeConversion(
    fromType: string,
    toType: string
  ): { safe: boolean; warnings: string[] } {
    const warnings: string[] = [];

    const typeConversionMap: Record<string, string[]> = {
      String: ['String', 'Json'],
      Int: ['Int', 'Float', 'String', 'Decimal'],
      Float: ['Float', 'String', 'Decimal'],
      Boolean: ['Boolean', 'String'],
      DateTime: ['DateTime', 'String'],
      Json: ['Json', 'String'],
      Decimal: ['Decimal', 'Float', 'Int', 'String'],
      Bytes: ['Bytes', 'String'],
    };

    const compatibleTypes = typeConversionMap[fromType] || [];

    if (!compatibleTypes.includes(toType)) {
      return {
        safe: false,
        warnings: [
          `Cannot safely convert from ${fromType} to ${toType}`,
        ],
      };
    }

    if (fromType !== toType) {
      warnings.push(
        `Type conversion required: ${fromType} to ${toType} (potential data loss)`
      );
    }

    return { safe: true, warnings };
  }

  /**
   * Estimate field size in bytes
   */
  private estimateFieldSize(field: SchemaField): number {
    const baseSizes: Record<string, number> = {
      String: 255,
      Int: 8,
      Float: 8,
      Boolean: 1,
      DateTime: 8,
      Json: 1024,
      Decimal: 16,
      Bytes: 1024,
    };

    let size = baseSizes[field.type] || 1024;

    if (field.validation?.maxLength) {
      size = Math.max(size, field.validation.maxLength);
    }

    return size;
  }

  /**
   * Estimate table size in bytes
   */
  private estimateTableSize(table: SchemaTable): number {
    let totalSize = 0;

    for (const field of table.fields) {
      totalSize += this.estimateFieldSize(field);
    }

    return totalSize;
  }

  /**
   * Detect cascade delete cycles
   */
  private hasCascadeCycle(
    sourceTable: SchemaTable,
    targetTable: SchemaTable,
    visited = new Set<string>()
  ): boolean {
    if (visited.has(targetTable.name)) {
      return true;
    }

    visited.add(targetTable.name);

    // Check if target has relations back to source
    if (targetTable.relations) {
      for (const relation of targetTable.relations) {
        if (relation.target === sourceTable.name) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validate data against field constraints
   */
  validateData(
    data: Record<string, any>,
    field: SchemaField
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const value = data[field.name];

    // Check required
    if (field.required && (value === null || value === undefined)) {
      errors.push(`Field ${field.name} is required`);
      return { valid: false, errors };
    }

    if (value === null || value === undefined) {
      return { valid: true, errors: [] };
    }

    // Type checking
    const typeErrors = this.checkFieldType(field, value);
    if (typeErrors.length > 0) {
      errors.push(...typeErrors);
    }

    // Validation rules
    if (field.validation) {
      const validationErrors = this.checkValidationRules(
        field,
        value
      );
      if (validationErrors.length > 0) {
        errors.push(...validationErrors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check field type correctness
   */
  private checkFieldType(field: SchemaField, value: any): string[] {
    const errors: string[] = [];

    switch (field.type) {
      case 'String':
        if (typeof value !== 'string') {
          errors.push(
            `Field ${field.name} must be a string, got ${typeof value}`
          );
        }
        break;

      case 'Int':
        if (!Number.isInteger(value)) {
          errors.push(
            `Field ${field.name} must be an integer, got ${typeof value}`
          );
        }
        break;

      case 'Float':
        if (typeof value !== 'number') {
          errors.push(
            `Field ${field.name} must be a number, got ${typeof value}`
          );
        }
        break;

      case 'Boolean':
        if (typeof value !== 'boolean') {
          errors.push(
            `Field ${field.name} must be a boolean, got ${typeof value}`
          );
        }
        break;

      case 'DateTime':
        if (!(value instanceof Date) && typeof value !== 'string') {
          errors.push(
            `Field ${field.name} must be a Date, got ${typeof value}`
          );
        }
        break;

      case 'Json':
        if (typeof value !== 'object') {
          errors.push(
            `Field ${field.name} must be a JSON object, got ${typeof value}`
          );
        }
        break;

      case 'Bytes':
        if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
          errors.push(
            `Field ${field.name} must be bytes, got ${typeof value}`
          );
        }
        break;

      case 'Decimal':
        if (typeof value !== 'number' && typeof value !== 'string') {
          errors.push(
            `Field ${field.name} must be a decimal, got ${typeof value}`
          );
        }
        break;
    }

    return errors;
  }

  /**
   * Check validation rules
   */
  private checkValidationRules(
    field: SchemaField,
    value: any
  ): string[] {
    const errors: string[] = [];
    const validation = field.validation;

    if (!validation) return errors;

    // String length validation
    if (typeof value === 'string') {
      if (
        validation.minLength &&
        value.length < validation.minLength
      ) {
        errors.push(
          `Field ${field.name} minimum length is ${validation.minLength}`
        );
      }

      if (
        validation.maxLength &&
        value.length > validation.maxLength
      ) {
        errors.push(
          `Field ${field.name} maximum length is ${validation.maxLength}`
        );
      }

      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          errors.push(
            `Field ${field.name} does not match pattern ${validation.pattern}`
          );
        }
      }
    }

    // Numeric validation
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push(
          `Field ${field.name} minimum value is ${validation.min}`
        );
      }

      if (validation.max !== undefined && value > validation.max) {
        errors.push(
          `Field ${field.name} maximum value is ${validation.max}`
        );
      }
    }

    return errors;
  }

  /**
   * Get default safety policy
   */
  getDefaultPolicy(): DataSafetyPolicy {
    return { ...this.defaultPolicy };
  }

  /**
   * Set default safety policy
   */
  setDefaultPolicy(policy: Partial<DataSafetyPolicy>): void {
    this.defaultPolicy = { ...this.defaultPolicy, ...policy };
  }
}

/**
 * Singleton instance
 */
export const dataSafetyValidator = new DataSafetyValidator();
