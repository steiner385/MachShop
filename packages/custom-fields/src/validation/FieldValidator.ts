/**
 * Field Validator
 * Validates custom field definitions and configurations
 */

import {
  CustomFieldMetadata,
  CreateCustomFieldRequest,
  UpdateCustomFieldRequest,
  ValidationError,
  CustomFieldType,
  FieldStorageType,
} from '../types';
import { DataTypeMapper } from '../mapping/DataTypeMapper';

/**
 * Field validator for custom field validation
 */
export class FieldValidator {
  /**
   * Validate field metadata
   */
  public validateFieldMetadata(field: CustomFieldMetadata): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate required fields
    if (!field.id || field.id.trim().length === 0) {
      errors.push({
        code: 'MISSING_FIELD_ID',
        message: 'Field ID is required',
        severity: 'error',
      });
    }

    if (!field.name || field.name.trim().length === 0) {
      errors.push({
        code: 'MISSING_FIELD_NAME',
        message: 'Field name is required',
        severity: 'error',
      });
    } else if (!this.isValidFieldName(field.name)) {
      errors.push({
        code: 'INVALID_FIELD_NAME',
        message:
          'Field name must start with a letter and contain only letters, numbers, and underscores',
        severity: 'error',
      });
    }

    if (!field.label || field.label.trim().length === 0) {
      errors.push({
        code: 'MISSING_FIELD_LABEL',
        message: 'Field label is required',
        severity: 'error',
      });
    }

    // Validate field type
    if (!field.type) {
      errors.push({
        code: 'MISSING_FIELD_TYPE',
        message: 'Field type is required',
        severity: 'error',
      });
    } else if (!this.isSupportedType(field.type)) {
      errors.push({
        code: 'UNSUPPORTED_FIELD_TYPE',
        message: `Field type ${field.type} is not supported`,
        severity: 'error',
      });
    }

    // Validate database type
    if (!field.databaseType) {
      errors.push({
        code: 'MISSING_DATABASE_TYPE',
        message: 'Database type is required',
        severity: 'error',
      });
    } else if (!this.isSupportedDatabaseType(field.databaseType)) {
      errors.push({
        code: 'UNSUPPORTED_DATABASE_TYPE',
        message: `Database type ${field.databaseType} is not supported`,
        severity: 'error',
      });
    }

    // Validate type mapping
    const typeErrors = DataTypeMapper.validateTypeMapping(field);
    errors.push(...typeErrors);

    // Validate version
    if (field.version < 1) {
      errors.push({
        code: 'INVALID_VERSION',
        message: 'Field version must be at least 1',
        severity: 'error',
      });
    }

    // Validate constraint compatibility
    if (field.unique && !field.required) {
      errors.push({
        code: 'UNIQUE_NULLABLE_CONFLICT',
        message: 'Unique fields cannot be nullable',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate create request
   */
  public validateCreateRequest(request: CreateCustomFieldRequest): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate name
    if (!request.name || request.name.trim().length === 0) {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Field name is required',
        severity: 'error',
      });
    } else if (!this.isValidFieldName(request.name)) {
      errors.push({
        code: 'INVALID_NAME',
        message:
          'Field name must start with a letter and contain only letters, numbers, and underscores',
        severity: 'error',
      });
    }

    // Validate label
    if (!request.label || request.label.trim().length === 0) {
      errors.push({
        code: 'MISSING_LABEL',
        message: 'Field label is required',
        severity: 'error',
      });
    }

    // Validate type
    if (!request.type) {
      errors.push({
        code: 'MISSING_TYPE',
        message: 'Field type is required',
        severity: 'error',
      });
    } else if (!this.isSupportedType(request.type)) {
      errors.push({
        code: 'UNSUPPORTED_TYPE',
        message: `Field type ${request.type} is not supported`,
        severity: 'error',
      });
    }

    // Validate constraints
    if (request.unique && !request.required) {
      errors.push({
        code: 'UNIQUE_NULLABLE',
        message: 'Unique fields cannot be nullable',
        severity: 'error',
      });
    }

    // Type-specific validation
    if (request.type === CustomFieldType.ENUM) {
      if (!request.enumValues || request.enumValues.length === 0) {
        errors.push({
          code: 'MISSING_ENUM_VALUES',
          message: 'Enum fields require at least one value',
          severity: 'error',
        });
      }

      if (request.enumValues && request.enumValues.length > 100) {
        errors.push({
          code: 'TOO_MANY_ENUM_VALUES',
          message: 'Enum fields cannot have more than 100 values',
          severity: 'error',
        });
      }

      // Check for duplicate enum values
      const uniqueValues = new Set(request.enumValues);
      if (uniqueValues.size !== request.enumValues?.length) {
        errors.push({
          code: 'DUPLICATE_ENUM_VALUES',
          message: 'Enum values must be unique',
          severity: 'error',
        });
      }
    }

    // Validate calculated field
    if (request.type === CustomFieldType.CALCULATED) {
      if (!request.sqlExpression) {
        errors.push({
          code: 'MISSING_SQL_EXPRESSION',
          message: 'Calculated fields require a SQL expression',
          severity: 'error',
        });
      }

      if (!request.dependencies || request.dependencies.length === 0) {
        errors.push({
          code: 'MISSING_DEPENDENCIES',
          message: 'Calculated fields must declare dependencies',
          severity: 'error',
        });
      }
    }

    // Validate virtual field
    if (request.type === CustomFieldType.VIRTUAL) {
      if (!request.computeFunction) {
        errors.push({
          code: 'MISSING_COMPUTE_FUNCTION',
          message: 'Virtual fields require a compute function',
          severity: 'error',
        });
      }
    }

    // Validate reference field
    if (request.type === CustomFieldType.REFERENCE) {
      if (!request.referenceTable) {
        errors.push({
          code: 'MISSING_REFERENCE_TABLE',
          message: 'Reference fields require a reference table',
          severity: 'error',
        });
      }

      if (!request.referenceField) {
        errors.push({
          code: 'MISSING_REFERENCE_FIELD',
          message: 'Reference fields require a reference field',
          severity: 'error',
        });
      }
    }

    // Validate numeric constraints
    if (request.type === CustomFieldType.STRING && request.maxLength) {
      if (request.maxLength < 1 || request.maxLength > 65535) {
        errors.push({
          code: 'INVALID_MAX_LENGTH',
          message: 'Max length must be between 1 and 65535',
          severity: 'error',
        });
      }
    }

    if (request.type === CustomFieldType.DECIMAL) {
      if (request.precision && (request.precision < 1 || request.precision > 65)) {
        errors.push({
          code: 'INVALID_PRECISION',
          message: 'Precision must be between 1 and 65',
          severity: 'error',
        });
      }

      if (request.scale && request.scale < 0) {
        errors.push({
          code: 'INVALID_SCALE',
          message: 'Scale must be non-negative',
          severity: 'error',
        });
      }

      if (
        request.precision &&
        request.scale &&
        request.scale > request.precision
      ) {
        errors.push({
          code: 'INVALID_SCALE_PRECISION',
          message: 'Scale cannot exceed precision',
          severity: 'error',
        });
      }
    }

    return errors;
  }

  /**
   * Validate update request
   */
  public validateUpdateRequest(
    request: UpdateCustomFieldRequest,
    existingField: CustomFieldMetadata
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate label if provided
    if (request.label !== undefined && request.label.trim().length === 0) {
      errors.push({
        code: 'INVALID_LABEL',
        message: 'Field label cannot be empty',
        severity: 'error',
      });
    }

    // Validate enum values if provided
    if (request.enumValues !== undefined) {
      if (request.enumValues.length === 0) {
        errors.push({
          code: 'MISSING_ENUM_VALUES',
          message: 'Enum fields require at least one value',
          severity: 'error',
        });
      }

      const uniqueValues = new Set(request.enumValues);
      if (uniqueValues.size !== request.enumValues.length) {
        errors.push({
          code: 'DUPLICATE_ENUM_VALUES',
          message: 'Enum values must be unique',
          severity: 'error',
        });
      }
    }

    // Check constraints compatibility
    if (request.unique && request.required === false) {
      errors.push({
        code: 'UNIQUE_NULLABLE',
        message: 'Unique fields cannot be nullable',
        severity: 'error',
      });
    }

    // Warn about deprecation
    if (request.deprecated) {
      // This is allowed, just informational
    }

    return errors;
  }

  /**
   * Validate field naming convention
   */
  private isValidFieldName(name: string): boolean {
    // Must start with letter, contain only letters, numbers, underscores
    const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    return nameRegex.test(name);
  }

  /**
   * Check if field type is supported
   */
  private isSupportedType(type: CustomFieldType): boolean {
    const supported = DataTypeMapper.getSupportedTypes();
    return supported.includes(type);
  }

  /**
   * Check if database type is supported
   */
  private isSupportedDatabaseType(type: string): boolean {
    const supported = DataTypeMapper.getSupportedDatabaseTypes();
    return supported.includes(type as any);
  }

  /**
   * Validate field dependencies
   */
  public validateDependencies(
    field: CustomFieldMetadata,
    existingFields: Map<string, CustomFieldMetadata>
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!field.dependencies || field.dependencies.length === 0) {
      return errors;
    }

    for (const depId of field.dependencies) {
      if (!existingFields.has(depId)) {
        errors.push({
          code: 'MISSING_DEPENDENCY',
          message: `Dependent field ${depId} does not exist`,
          severity: 'error',
        });
      }
    }

    // Check for circular dependencies
    if (this.hasCyclicDependency(field, existingFields)) {
      errors.push({
        code: 'CYCLIC_DEPENDENCY',
        message: 'Field has cyclic dependency',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Check for cyclic dependencies
   */
  private hasCyclicDependency(
    field: CustomFieldMetadata,
    existingFields: Map<string, CustomFieldMetadata>,
    visited: Set<string> = new Set(),
    recursionStack: Set<string> = new Set()
  ): boolean {
    visited.add(field.id);
    recursionStack.add(field.id);

    if (!field.dependencies) {
      return false;
    }

    for (const depId of field.dependencies) {
      if (!visited.has(depId)) {
        const depField = existingFields.get(depId);
        if (depField && this.hasCyclicDependency(depField, existingFields, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(depId)) {
        return true;
      }
    }

    recursionStack.delete(field.id);
    return false;
  }
}
