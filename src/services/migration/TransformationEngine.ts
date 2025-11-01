/**
 * Transformation Engine
 * Issue #34: Database Direct Import/ETL Engine
 *
 * Applies data transformations to extracted records
 * Supports field mapping, type conversion, concatenation, lookup, calculated fields
 */

import { logger } from '../../logging/logger';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  dataType: string;
  required: boolean;
  defaultValue?: any;
}

export interface Transformation {
  type: 'convert' | 'concat' | 'split' | 'lookup' | 'calculate' | 'conditional';
  sourceFields: string[];
  targetField: string;
  config: any;
}

export interface TransformationResult {
  success: boolean;
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
}

export class TransformationEngine {
  /**
   * Apply all transformations to a record
   */
  static transformRecord(
    record: any,
    fieldMappings: FieldMapping[],
    transformations: Transformation[]
  ): TransformationResult {
    const result: TransformationResult = {
      success: true,
      data: {},
      errors: [],
      warnings: []
    };

    try {
      // First, apply field mappings
      for (const mapping of fieldMappings) {
        try {
          let value = record[mapping.sourceField];

          // Apply type conversion
          if (value !== null && value !== undefined) {
            value = this.convertDataType(value, this.inferDataType(value), mapping.dataType);
          } else if (mapping.required && mapping.defaultValue !== undefined) {
            value = mapping.defaultValue;
          } else if (mapping.required) {
            result.errors.push(`Required field '${mapping.targetField}' is missing`);
            result.success = false;
            continue;
          }

          result.data[mapping.targetField] = value;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Error mapping field '${mapping.sourceField}': ${errorMsg}`);
          result.success = false;
        }
      }

      // Then, apply transformations
      for (const transformation of transformations) {
        try {
          switch (transformation.type) {
            case 'convert':
              this.applyConversion(result.data, transformation);
              break;

            case 'concat':
              this.applyConcatenation(result.data, transformation);
              break;

            case 'split':
              this.applySplit(result.data, transformation);
              break;

            case 'lookup':
              this.applyLookup(result.data, transformation);
              break;

            case 'calculate':
              this.applyCalculation(result.data, transformation);
              break;

            case 'conditional':
              this.applyConditional(result.data, transformation);
              break;

            default:
              result.warnings.push(`Unknown transformation type: ${transformation.type}`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Transformation error in '${transformation.targetField}': ${errorMsg}`);
          result.success = false;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Record transformation failed: ${errorMsg}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Infer data type from value
   */
  private static inferDataType(value: any): string {
    if (value === null || value === undefined) {
      return 'string';
    } else if (typeof value === 'boolean') {
      return 'boolean';
    } else if (typeof value === 'number') {
      return Number.isInteger(value) ? 'int' : 'decimal';
    } else if (value instanceof Date) {
      return 'datetime';
    } else if (typeof value === 'string') {
      return 'string';
    }
    return 'string';
  }

  /**
   * Convert data type
   */
  private static convertDataType(value: any, fromType: string, toType: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    const normalizedToType = toType.toLowerCase();

    switch (normalizedToType) {
      case 'string':
      case 'varchar':
      case 'char':
      case 'text':
        return String(value);

      case 'int':
      case 'integer':
      case 'bigint':
      case 'smallint':
        return parseInt(String(value), 10);

      case 'decimal':
      case 'float':
      case 'numeric':
      case 'double':
        return parseFloat(String(value));

      case 'boolean':
      case 'bit':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        const strVal = String(value).toLowerCase();
        return strVal === 'true' || strVal === '1' || strVal === 'yes' || strVal === 'y';

      case 'date':
      case 'datetime':
      case 'timestamp':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date value: ${value}`);
        }
        return date;

      case 'json':
      case 'jsonb':
        if (typeof value === 'string') {
          return JSON.parse(value);
        }
        return value;

      default:
        return value;
    }
  }

  /**
   * Apply data type conversion transformation
   */
  private static applyConversion(data: any, transformation: Transformation): void {
    const value = data[transformation.sourceFields[0]];

    if (value === null || value === undefined) {
      data[transformation.targetField] = null;
      return;
    }

    const converted = this.convertDataType(
      value,
      this.inferDataType(value),
      transformation.config.toType
    );

    data[transformation.targetField] = converted;
  }

  /**
   * Apply concatenation transformation
   */
  private static applyConcatenation(data: any, transformation: Transformation): void {
    const separator = transformation.config.separator || '';
    const values = transformation.sourceFields.map((field: string) => data[field] || '');
    data[transformation.targetField] = values.join(separator);
  }

  /**
   * Apply split transformation
   */
  private static applySplit(data: any, transformation: Transformation): void {
    const sourceValue = data[transformation.sourceFields[0]];
    const delimiter = transformation.config.delimiter || ',';
    const index = transformation.config.index || 0;

    if (typeof sourceValue === 'string') {
      const parts = sourceValue.split(delimiter);
      data[transformation.targetField] = parts[index] || null;
    } else {
      data[transformation.targetField] = null;
    }
  }

  /**
   * Apply lookup transformation
   */
  private static applyLookup(data: any, transformation: Transformation): void {
    const sourceValue = data[transformation.sourceFields[0]];
    const lookupTable = transformation.config.lookupTable || {};

    if (sourceValue === null || sourceValue === undefined) {
      data[transformation.targetField] = transformation.config.defaultValue || null;
      return;
    }

    const key = String(sourceValue);
    data[transformation.targetField] = lookupTable[key] || transformation.config.defaultValue || sourceValue;
  }

  /**
   * Apply calculated field transformation
   */
  private static applyCalculation(data: any, transformation: Transformation): void {
    const expression = transformation.config.expression;

    if (!expression) {
      throw new Error('Calculation expression required');
    }

    try {
      // Create a safe expression context
      const context = new Function(...Object.keys(data), `return ${expression}`);
      const result = context(...Object.values(data));

      data[transformation.targetField] = result;
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${expression}`);
    }
  }

  /**
   * Apply conditional transformation
   */
  private static applyConditional(data: any, transformation: Transformation): void {
    const condition = transformation.config.condition;
    const trueValue = transformation.config.trueValue;
    const falseValue = transformation.config.falseValue;

    if (!condition) {
      throw new Error('Condition required for conditional transformation');
    }

    try {
      // Create a safe expression context for the condition
      const context = new Function(...Object.keys(data), `return ${condition}`);
      const conditionResult = context(...Object.values(data));

      data[transformation.targetField] = conditionResult ? trueValue : falseValue;
    } catch (error) {
      throw new Error(`Failed to evaluate condition: ${condition}`);
    }
  }

  /**
   * Validate transformations
   */
  static validateTransformations(transformations: Transformation[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const transformation of transformations) {
      if (!transformation.type) {
        errors.push('Transformation type is required');
      }

      if (!transformation.targetField) {
        errors.push('Target field is required');
      }

      if (!transformation.sourceFields || transformation.sourceFields.length === 0) {
        errors.push(`Transformation for '${transformation.targetField}' requires source fields`);
      }

      switch (transformation.type) {
        case 'convert':
          if (!transformation.config.toType) {
            errors.push(`Conversion for '${transformation.targetField}' requires 'toType'`);
          }
          break;

        case 'concat':
          if (!transformation.config.separator && transformation.config.separator !== '') {
            transformation.config.separator = '';
          }
          break;

        case 'split':
          if (!transformation.config.delimiter) {
            errors.push(`Split for '${transformation.targetField}' requires 'delimiter'`);
          }
          if (transformation.config.index === undefined) {
            transformation.config.index = 0;
          }
          break;

        case 'lookup':
          if (!transformation.config.lookupTable) {
            errors.push(`Lookup for '${transformation.targetField}' requires 'lookupTable'`);
          }
          break;

        case 'calculate':
          if (!transformation.config.expression) {
            errors.push(`Calculation for '${transformation.targetField}' requires 'expression'`);
          }
          break;

        case 'conditional':
          if (!transformation.config.condition) {
            errors.push(`Conditional for '${transformation.targetField}' requires 'condition'`);
          }
          if (transformation.config.trueValue === undefined || transformation.config.falseValue === undefined) {
            errors.push(
              `Conditional for '${transformation.targetField}' requires 'trueValue' and 'falseValue'`
            );
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default TransformationEngine;
