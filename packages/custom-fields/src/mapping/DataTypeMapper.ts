/**
 * Data Type Mapper
 * Maps custom field types to database column types with validation
 */

import {
  CustomFieldType,
  DatabaseColumnType,
  DataTypeMapping,
  DataTypeCompatibility,
  CustomFieldMetadata,
  ValidationError,
} from '../types';

/**
 * Data type mapper for field type → database type conversion
 */
export class DataTypeMapper {
  private static readonly TYPE_MAPPINGS: Map<CustomFieldType, DataTypeMapping> = new Map([
    [
      CustomFieldType.STRING,
      {
        fieldType: CustomFieldType.STRING,
        databaseType: DatabaseColumnType.VARCHAR,
        maxLength: 255,
      },
    ],
    [
      CustomFieldType.INTEGER,
      {
        fieldType: CustomFieldType.INTEGER,
        databaseType: DatabaseColumnType.INTEGER,
      },
    ],
    [
      CustomFieldType.DECIMAL,
      {
        fieldType: CustomFieldType.DECIMAL,
        databaseType: DatabaseColumnType.DECIMAL,
        precision: 10,
        scale: 2,
      },
    ],
    [
      CustomFieldType.BOOLEAN,
      {
        fieldType: CustomFieldType.BOOLEAN,
        databaseType: DatabaseColumnType.BOOLEAN,
        sqlDefault: 'false',
      },
    ],
    [
      CustomFieldType.DATE,
      {
        fieldType: CustomFieldType.DATE,
        databaseType: DatabaseColumnType.DATE,
      },
    ],
    [
      CustomFieldType.DATETIME,
      {
        fieldType: CustomFieldType.DATETIME,
        databaseType: DatabaseColumnType.DATETIME,
        sqlDefault: 'CURRENT_TIMESTAMP',
      },
    ],
    [
      CustomFieldType.TIME,
      {
        fieldType: CustomFieldType.TIME,
        databaseType: DatabaseColumnType.TIME,
      },
    ],
    [
      CustomFieldType.JSON,
      {
        fieldType: CustomFieldType.JSON,
        databaseType: DatabaseColumnType.JSON,
      },
    ],
    [
      CustomFieldType.ARRAY,
      {
        fieldType: CustomFieldType.ARRAY,
        databaseType: DatabaseColumnType.JSON,
      },
    ],
    [
      CustomFieldType.ENUM,
      {
        fieldType: CustomFieldType.ENUM,
        databaseType: DatabaseColumnType.VARCHAR,
        maxLength: 50,
      },
    ],
    [
      CustomFieldType.CALCULATED,
      {
        fieldType: CustomFieldType.CALCULATED,
        databaseType: DatabaseColumnType.VARCHAR,
      },
    ],
    [
      CustomFieldType.VIRTUAL,
      {
        fieldType: CustomFieldType.VIRTUAL,
        databaseType: DatabaseColumnType.TEXT,
      },
    ],
    [
      CustomFieldType.REFERENCE,
      {
        fieldType: CustomFieldType.REFERENCE,
        databaseType: DatabaseColumnType.UUID,
      },
    ],
  ]);

  private static readonly COMPATIBILITY_MATRIX: Map<string, DataTypeCompatibility> = new Map([
    [
      `${DatabaseColumnType.VARCHAR}→${DatabaseColumnType.TEXT}`,
      {
        sourceType: DatabaseColumnType.VARCHAR,
        targetType: DatabaseColumnType.TEXT,
        compatible: true,
        requiresConversion: false,
        dateLoss: false,
      },
    ],
    [
      `${DatabaseColumnType.TEXT}→${DatabaseColumnType.VARCHAR}`,
      {
        sourceType: DatabaseColumnType.TEXT,
        targetType: DatabaseColumnType.VARCHAR,
        compatible: true,
        requiresConversion: true,
        conversionFunction: 'CAST(value AS VARCHAR(255))',
        dateLoss: true,
        conversionWarnings: ['Data truncation may occur if content exceeds 255 characters'],
      },
    ],
    [
      `${DatabaseColumnType.INTEGER}→${DatabaseColumnType.BIGINT}`,
      {
        sourceType: DatabaseColumnType.INTEGER,
        targetType: DatabaseColumnType.BIGINT,
        compatible: true,
        requiresConversion: false,
        dateLoss: false,
      },
    ],
    [
      `${DatabaseColumnType.BIGINT}→${DatabaseColumnType.INTEGER}`,
      {
        sourceType: DatabaseColumnType.BIGINT,
        targetType: DatabaseColumnType.INTEGER,
        compatible: true,
        requiresConversion: true,
        conversionFunction: 'CAST(value AS INTEGER)',
        dateLoss: true,
        conversionWarnings: ['Data loss possible for values > 2147483647'],
      },
    ],
    [
      `${DatabaseColumnType.INTEGER}→${DatabaseColumnType.DECIMAL}`,
      {
        sourceType: DatabaseColumnType.INTEGER,
        targetType: DatabaseColumnType.DECIMAL,
        compatible: true,
        requiresConversion: false,
        dateLoss: false,
      },
    ],
    [
      `${DatabaseColumnType.DECIMAL}→${DatabaseColumnType.INTEGER}`,
      {
        sourceType: DatabaseColumnType.DECIMAL,
        targetType: DatabaseColumnType.INTEGER,
        compatible: true,
        requiresConversion: true,
        conversionFunction: 'CAST(value AS INTEGER)',
        dateLoss: true,
        conversionWarnings: ['Decimal values will be truncated'],
      },
    ],
    [
      `${DatabaseColumnType.DATE}→${DatabaseColumnType.DATETIME}`,
      {
        sourceType: DatabaseColumnType.DATE,
        targetType: DatabaseColumnType.DATETIME,
        compatible: true,
        requiresConversion: false,
        dateLoss: false,
      },
    ],
    [
      `${DatabaseColumnType.DATETIME}→${DatabaseColumnType.DATE}`,
      {
        sourceType: DatabaseColumnType.DATETIME,
        targetType: DatabaseColumnType.DATE,
        compatible: true,
        requiresConversion: true,
        conversionFunction: 'CAST(value AS DATE)',
        dateLoss: true,
        conversionWarnings: ['Time portion will be lost'],
      },
    ],
  ]);

  /**
   * Get mapping for custom field type
   */
  public static getMapping(fieldType: CustomFieldType): DataTypeMapping | undefined {
    return this.TYPE_MAPPINGS.get(fieldType);
  }

  /**
   * Map custom field to database column type
   */
  public static mapFieldType(fieldType: CustomFieldType): DatabaseColumnType | undefined {
    const mapping = this.getMapping(fieldType);
    return mapping?.databaseType;
  }

  /**
   * Generate column definition SQL
   */
  public static generateColumnDefinition(field: CustomFieldMetadata): string {
    const parts: string[] = [];

    // Column name and type
    parts.push(`${field.name} ${field.databaseType}`);

    // Type-specific parameters
    if (
      field.databaseType === DatabaseColumnType.VARCHAR &&
      field.maxLength
    ) {
      parts[0] = `${field.name} VARCHAR(${field.maxLength})`;
    }

    if (
      field.databaseType === DatabaseColumnType.DECIMAL &&
      field.precision &&
      field.scale
    ) {
      parts[0] = `${field.name} DECIMAL(${field.precision},${field.scale})`;
    }

    // Constraints
    if (!field.required) {
      parts.push('NULL');
    } else {
      parts.push('NOT NULL');
    }

    if (field.unique) {
      parts.push('UNIQUE');
    }

    if (field.defaultValue !== undefined) {
      if (typeof field.defaultValue === 'string') {
        parts.push(`DEFAULT '${field.defaultValue}'`);
      } else if (field.defaultValue === null) {
        parts.push('DEFAULT NULL');
      } else {
        parts.push(`DEFAULT ${field.defaultValue}`);
      }
    }

    if (field.pattern) {
      parts.push(`CHECK (${field.name} ~ '${field.pattern}')`);
    }

    return parts.join(' ');
  }

  /**
   * Check type compatibility
   */
  public static checkCompatibility(
    sourceType: DatabaseColumnType,
    targetType: DatabaseColumnType
  ): DataTypeCompatibility | undefined {
    const key = `${sourceType}→${targetType}`;
    return this.COMPATIBILITY_MATRIX.get(key);
  }

  /**
   * Get compatible target types
   */
  public static getCompatibleTypes(sourceType: DatabaseColumnType): DatabaseColumnType[] {
    const compatible: DatabaseColumnType[] = [];

    for (const [key, compat] of this.COMPATIBILITY_MATRIX) {
      if (compat.sourceType === sourceType && compat.compatible) {
        compatible.push(compat.targetType);
      }
    }

    return compatible;
  }

  /**
   * Validate field type and database type pairing
   */
  public static validateTypeMapping(field: CustomFieldMetadata): ValidationError[] {
    const errors: ValidationError[] = [];

    const mapping = this.getMapping(field.type);
    if (!mapping) {
      errors.push({
        code: 'UNKNOWN_FIELD_TYPE',
        message: `Unknown custom field type: ${field.type}`,
        field: 'type',
        severity: 'error',
      });
      return errors;
    }

    // Validate max length for string types
    if (
      field.type === CustomFieldType.STRING &&
      field.maxLength &&
      field.maxLength > 65535
    ) {
      errors.push({
        code: 'INVALID_MAX_LENGTH',
        message: 'Max length for string fields cannot exceed 65535',
        field: 'maxLength',
        severity: 'error',
      });
    }

    // Validate decimal precision and scale
    if (field.type === CustomFieldType.DECIMAL) {
      if (!field.precision || field.precision < 1 || field.precision > 65) {
        errors.push({
          code: 'INVALID_PRECISION',
          message: 'Decimal precision must be between 1 and 65',
          field: 'precision',
          severity: 'error',
        });
      }

      if (!field.scale || field.scale < 0 || (field.precision && field.scale > field.precision)) {
        errors.push({
          code: 'INVALID_SCALE',
          message: 'Decimal scale must be non-negative and not exceed precision',
          field: 'scale',
          severity: 'error',
        });
      }
    }

    // Validate enum values
    if (field.type === CustomFieldType.ENUM) {
      if (!field.enumValues || field.enumValues.length === 0) {
        errors.push({
          code: 'MISSING_ENUM_VALUES',
          message: 'Enum fields must have at least one value',
          field: 'enumValues',
          severity: 'error',
        });
      }

      if (field.enumValues && field.enumValues.length > 100) {
        errors.push({
          code: 'TOO_MANY_ENUM_VALUES',
          message: 'Enum fields cannot have more than 100 values',
          field: 'enumValues',
          severity: 'error',
        });
      }
    }

    // Validate calculated field requirements
    if (field.type === CustomFieldType.CALCULATED) {
      if (!field.sqlExpression) {
        errors.push({
          code: 'MISSING_SQL_EXPRESSION',
          message: 'Calculated fields require a SQL expression',
          field: 'sqlExpression',
          severity: 'error',
        });
      }

      if (!field.dependencies || field.dependencies.length === 0) {
        errors.push({
          code: 'MISSING_DEPENDENCIES',
          message: 'Calculated fields must declare field dependencies',
          field: 'dependencies',
          severity: 'error',
        });
      }
    }

    // Validate virtual field requirements
    if (field.type === CustomFieldType.VIRTUAL) {
      if (!field.computeFunction) {
        errors.push({
          code: 'MISSING_COMPUTE_FUNCTION',
          message: 'Virtual fields require a compute function name',
          field: 'computeFunction',
          severity: 'error',
        });
      }
    }

    // Validate reference field requirements
    if (field.type === CustomFieldType.REFERENCE) {
      if (!field.referenceTable || !field.referenceField) {
        errors.push({
          code: 'MISSING_REFERENCE',
          message: 'Reference fields must specify a reference table and field',
          field: 'reference',
          severity: 'error',
        });
      }
    }

    return errors;
  }

  /**
   * Suggest appropriate database type for field type
   */
  public static suggestDatabaseType(fieldType: CustomFieldType): DatabaseColumnType | undefined {
    return this.mapFieldType(fieldType);
  }

  /**
   * Get all supported field types
   */
  public static getSupportedTypes(): CustomFieldType[] {
    return Array.from(this.TYPE_MAPPINGS.keys());
  }

  /**
   * Get all supported database types
   */
  public static getSupportedDatabaseTypes(): DatabaseColumnType[] {
    const types = new Set<DatabaseColumnType>();
    for (const mapping of this.TYPE_MAPPINGS.values()) {
      types.add(mapping.databaseType);
    }
    return Array.from(types);
  }

  /**
   * Validate data type transition
   */
  public static validateTypeTransition(
    oldType: DatabaseColumnType,
    newType: DatabaseColumnType
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (oldType === newType) {
      return errors;
    }

    const compat = this.checkCompatibility(oldType, newType);

    if (!compat || !compat.compatible) {
      errors.push({
        code: 'INCOMPATIBLE_TYPE_CHANGE',
        message: `Cannot change column type from ${oldType} to ${newType}`,
        severity: 'error',
      });
      return errors;
    }

    if (compat.dateLoss) {
      errors.push({
        code: 'POTENTIAL_DATA_LOSS',
        message: `Type change may result in data loss`,
        details: compat.conversionWarnings,
        severity: 'warning',
      });
    }

    return errors;
  }
}
