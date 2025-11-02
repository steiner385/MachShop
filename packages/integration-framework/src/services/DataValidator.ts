/**
 * Data Validator Service
 * Provides schema validation and business rule enforcement
 */

import { DataMappingConfig } from '../types';

/**
 * Validation rule types
 */
export enum ValidationRuleType {
  REQUIRED = 'required',
  MAX_LENGTH = 'max-length',
  MIN_LENGTH = 'min-length',
  PATTERN = 'pattern',
  MIN_VALUE = 'min-value',
  MAX_VALUE = 'max-value',
  ENUM = 'enum',
  TYPE = 'type',
  CUSTOM = 'custom',
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  type: ValidationRuleType;
  message: string;
  config?: unknown;
  validator?: (value: unknown) => boolean;
}

/**
 * Field validation configuration
 */
export interface FieldValidationConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required?: boolean;
  rules?: ValidationRule[];
  defaultValue?: unknown;
}

/**
 * Schema definition
 */
export interface Schema {
  name: string;
  version: string;
  fields: FieldValidationConfig[];
  requiredFields?: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  rule: ValidationRuleType;
  message: string;
  value?: unknown;
}

/**
 * Data validator with schema and business rule support
 */
export class DataValidator {
  private schemas: Map<string, Schema> = new Map();
  private customValidators: Map<string, (data: unknown) => boolean> = new Map();

  /**
   * Register a schema
   */
  registerSchema(schema: Schema): void {
    if (this.schemas.has(schema.name)) {
      throw new Error(`Schema ${schema.name} already registered`);
    }
    this.schemas.set(schema.name, schema);
  }

  /**
   * Get registered schema
   */
  getSchema(schemaName: string): Schema | undefined {
    return this.schemas.get(schemaName);
  }

  /**
   * List all schemas
   */
  listSchemas(): Schema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Validate data against schema
   */
  validateAgainstSchema(schemaName: string, data: unknown): ValidationResult {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return {
        valid: false,
        errors: [
          {
            field: '',
            rule: ValidationRuleType.TYPE,
            message: `Schema ${schemaName} not found`,
          },
        ],
      };
    }

    if (typeof data !== 'object' || data === null) {
      return {
        valid: false,
        errors: [
          {
            field: '',
            rule: ValidationRuleType.TYPE,
            message: 'Data must be an object',
            value: data,
          },
        ],
      };
    }

    const errors: ValidationError[] = [];
    const obj = data as Record<string, unknown>;

    // Validate each field in schema
    for (const fieldConfig of schema.fields) {
      const fieldValue = obj[fieldConfig.name];

      // Check required fields
      if (fieldConfig.required && (fieldValue === undefined || fieldValue === null)) {
        errors.push({
          field: fieldConfig.name,
          rule: ValidationRuleType.REQUIRED,
          message: `Field ${fieldConfig.name} is required`,
          value: fieldValue,
        });
        continue;
      }

      // Skip validation if field is not required and not provided
      if (!fieldConfig.required && (fieldValue === undefined || fieldValue === null)) {
        continue;
      }

      // Check type
      const typeValid = this.validateType(fieldValue, fieldConfig.type);
      if (!typeValid && fieldValue !== null && fieldValue !== undefined) {
        errors.push({
          field: fieldConfig.name,
          rule: ValidationRuleType.TYPE,
          message: `Field ${fieldConfig.name} must be of type ${fieldConfig.type}`,
          value: fieldValue,
        });
        continue;
      }

      // Apply validation rules
      if (fieldConfig.rules) {
        for (const rule of fieldConfig.rules) {
          const ruleValid = this.validateRule(fieldValue, rule);
          if (!ruleValid) {
            errors.push({
              field: fieldConfig.name,
              rule: rule.type,
              message: rule.message,
              value: fieldValue,
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate type
   */
  private validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Validate individual rule
   */
  private validateRule(value: unknown, rule: ValidationRule): boolean {
    if (value === null || value === undefined) {
      return true; // Already checked in required validation
    }

    switch (rule.type) {
      case ValidationRuleType.REQUIRED:
        return value !== null && value !== undefined && value !== '';

      case ValidationRuleType.MAX_LENGTH:
        if (typeof value === 'string' && rule.config) {
          return value.length <= (rule.config as number);
        }
        return true;

      case ValidationRuleType.MIN_LENGTH:
        if (typeof value === 'string' && rule.config) {
          return value.length >= (rule.config as number);
        }
        return true;

      case ValidationRuleType.PATTERN:
        if (typeof value === 'string' && rule.config instanceof RegExp) {
          return rule.config.test(value);
        }
        return true;

      case ValidationRuleType.MIN_VALUE:
        if (typeof value === 'number' && rule.config) {
          return value >= (rule.config as number);
        }
        return true;

      case ValidationRuleType.MAX_VALUE:
        if (typeof value === 'number' && rule.config) {
          return value <= (rule.config as number);
        }
        return true;

      case ValidationRuleType.ENUM:
        if (Array.isArray(rule.config)) {
          return rule.config.includes(value);
        }
        return true;

      case ValidationRuleType.CUSTOM:
        if (rule.validator) {
          return rule.validator(value);
        }
        return true;

      default:
        return true;
    }
  }

  /**
   * Validate data mapping
   */
  validateDataMapping(config: DataMappingConfig, data: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate against source schema
    const sourceSchema: Schema = {
      name: 'source',
      version: '1.0.0',
      fields: Object.entries(config.sourceSchema).map(([name, type]) => ({
        name,
        type: typeof type === 'string' ? (type as FieldValidationConfig['type']) : 'object',
      })),
    };

    // Check all mapped fields exist in source
    for (const [sourcePath] of Object.entries(config.fieldMappings)) {
      if (!data.hasOwnProperty(sourcePath)) {
        errors.push({
          field: sourcePath,
          rule: ValidationRuleType.REQUIRED,
          message: `Source field ${sourcePath} not found in data`,
        });
      }
    }

    // Apply transformations if present
    const transformed: Record<string, unknown> = {};
    for (const [sourcePath, targetPath] of Object.entries(config.fieldMappings)) {
      let value = data[sourcePath];

      // Apply transformation if defined
      if (config.transformations && config.transformations[sourcePath]) {
        try {
          value = config.transformations[sourcePath](value);
        } catch (error) {
          errors.push({
            field: sourcePath,
            rule: ValidationRuleType.CUSTOM,
            message: `Transformation failed: ${error instanceof Error ? error.message : String(error)}`,
            value,
          });
          continue;
        }
      }

      // Apply validation rule if defined
      if (config.validationRules && config.validationRules[sourcePath]) {
        if (!config.validationRules[sourcePath](value)) {
          errors.push({
            field: sourcePath,
            rule: ValidationRuleType.CUSTOM,
            message: `Validation rule failed for field ${sourcePath}`,
            value,
          });
          continue;
        }
      }

      transformed[targetPath] = value;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize data against schema
   */
  sanitizeData(schemaName: string, data: unknown): Record<string, unknown> | null {
    const schema = this.schemas.get(schemaName);
    if (!schema || typeof data !== 'object' || data === null) {
      return null;
    }

    const sanitized: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;

    for (const fieldConfig of schema.fields) {
      const value = obj[fieldConfig.name];

      if (value === undefined || value === null) {
        if (fieldConfig.defaultValue !== undefined) {
          sanitized[fieldConfig.name] = fieldConfig.defaultValue;
        }
      } else {
        // Only include fields that are in the schema
        sanitized[fieldConfig.name] = value;
      }
    }

    return sanitized;
  }

  /**
   * Register custom validator
   */
  registerCustomValidator(name: string, validator: (data: unknown) => boolean): void {
    this.customValidators.set(name, validator);
  }

  /**
   * Get custom validator
   */
  getCustomValidator(name: string): ((data: unknown) => boolean) | undefined {
    return this.customValidators.get(name);
  }

  /**
   * Run custom validator
   */
  runCustomValidator(name: string, data: unknown): boolean {
    const validator = this.customValidators.get(name);
    if (!validator) {
      throw new Error(`Custom validator ${name} not found`);
    }
    return validator(data);
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.schemas.clear();
    this.customValidators.clear();
  }
}

// Singleton instance
export const dataValidator = new DataValidator();
