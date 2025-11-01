/**
 * Entity & Enum Registry Implementation
 * Manages custom entity and enum definitions for extensions
 * Issue #441: Custom Entity & Enum Extension System
 */

import type {
  EntityDefinition,
  EnumDefinition,
  EntityData,
  EntityValidationResult,
  JSONSchema,
  JSONSchemaProperty,
  TypeScriptType,
  EntityEvent,
  IEntityRegistry,
  IEnumRegistry,
} from './types';

import {
  EntityError,
  EntityNotFoundError,
  EntityValidationError,
  DuplicateEntityError,
  EntityEventType,
} from './types';

/**
 * Entity Registry - Manages custom entity definitions
 */
export class EntityRegistry implements IEntityRegistry {
  private entities: Map<string, EntityDefinition> = new Map();
  private listeners: Set<(event: EntityEvent) => void> = new Set();

  /**
   * Register a custom entity
   */
  register(definition: EntityDefinition): void {
    if (this.entities.has(definition.name)) {
      throw new DuplicateEntityError(definition.name);
    }

    // Validate entity definition
    this.validateDefinition(definition);

    // Generate JSON schema if not provided
    if (!definition.schema) {
      definition.schema = this.generateSchemaFromDefinition(definition);
    }

    this.entities.set(definition.name, definition);

    this.emitEvent({
      type: EntityEventType.REGISTERED,
      entityName: definition.name,
      timestamp: new Date(),
      data: { version: definition.version },
    });
  }

  /**
   * Unregister an entity
   */
  unregister(entityName: string): void {
    if (!this.entities.has(entityName)) {
      throw new EntityNotFoundError(entityName);
    }

    this.entities.delete(entityName);
  }

  /**
   * Get entity definition
   */
  get(entityName: string): EntityDefinition | undefined {
    return this.entities.get(entityName);
  }

  /**
   * List all registered entities
   */
  list(): EntityDefinition[] {
    return Array.from(this.entities.values());
  }

  /**
   * Validate entity data
   */
  validate(entityName: string, data: EntityData): EntityValidationResult {
    const entity = this.get(entityName);
    if (!entity) {
      throw new EntityNotFoundError(entityName);
    }

    const errors: any[] = [];

    for (const field of entity.fields) {
      const value = data[field.name];

      // Check required fields
      if (field.required && (value === undefined || value === null)) {
        errors.push({
          field: field.name,
          message: `Field ${field.name} is required`,
          code: 'REQUIRED_FIELD',
        });
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      const typeValid = this.validateFieldType(field.type, value);
      if (!typeValid) {
        errors.push({
          field: field.name,
          message: `Field ${field.name} has invalid type. Expected ${field.type}, got ${typeof value}`,
          code: 'INVALID_TYPE',
        });
        continue;
      }

      // Enum validation
      if (field.type === 'enum' && field.enumType) {
        const enumDef = enumRegistry.get(field.enumType);
        if (enumDef && !enumRegistry.validate(field.enumType, value)) {
          errors.push({
            field: field.name,
            message: `Field ${field.name} has invalid enum value`,
            code: 'INVALID_ENUM',
          });
        }
      }

      // String validation
      if (field.type === 'string' && field.validation) {
        if (field.validation.minLength && value.length < field.validation.minLength) {
          errors.push({
            field: field.name,
            message: `Field ${field.name} is too short (min: ${field.validation.minLength})`,
            code: 'MIN_LENGTH',
          });
        }
        if (field.validation.maxLength && value.length > field.validation.maxLength) {
          errors.push({
            field: field.name,
            message: `Field ${field.name} is too long (max: ${field.validation.maxLength})`,
            code: 'MAX_LENGTH',
          });
        }
        if (field.validation.pattern && !new RegExp(field.validation.pattern).test(value)) {
          errors.push({
            field: field.name,
            message: `Field ${field.name} does not match pattern`,
            code: 'PATTERN_MISMATCH',
          });
        }
      }

      // Number validation
      if ((field.type === 'number' || field.type === 'integer') && field.validation) {
        if (field.validation.min !== undefined && value < field.validation.min) {
          errors.push({
            field: field.name,
            message: `Field ${field.name} is below minimum (min: ${field.validation.min})`,
            code: 'MIN_VALUE',
          });
        }
        if (field.validation.max !== undefined && value > field.validation.max) {
          errors.push({
            field: field.name,
            message: `Field ${field.name} exceeds maximum (max: ${field.validation.max})`,
            code: 'MAX_VALUE',
          });
        }
      }

      // Unique validation
      if (field.unique) {
        // In a real implementation, this would check the database
        // For now, we'll just mark it as needing validation
      }
    }

    if (errors.length > 0) {
      this.emitEvent({
        type: EntityEventType.VALIDATION_FAILED,
        entityName,
        timestamp: new Date(),
        data: { errors },
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate JSON schema from entity definition
   */
  generateSchema(entityName: string): JSONSchema {
    const entity = this.get(entityName);
    if (!entity) {
      throw new EntityNotFoundError(entityName);
    }

    return entity.schema || this.generateSchemaFromDefinition(entity);
  }

  /**
   * Generate TypeScript types from entity definition
   */
  generateTypeScript(entityName: string): TypeScriptType {
    const entity = this.get(entityName);
    if (!entity) {
      throw new EntityNotFoundError(entityName);
    }

    const imports: string[] = [];
    const interfaceLines: string[] = [];
    const propertyLines: string[] = [];

    interfaceLines.push(`export interface ${entity.name} {`);

    for (const field of entity.fields) {
      const tsType = this.fieldToTypeScript(field);
      const optional = field.required ? '' : '?';
      propertyLines.push(`  /** ${field.description || ''} */`);
      propertyLines.push(`  ${field.name}${optional}: ${tsType};`);
    }

    interfaceLines.push(...propertyLines);
    interfaceLines.push(`}`);

    // Add timestamps if enabled
    if (entity.timestamps) {
      imports.push('import { Timestamps } from \'./types\';');
      interfaceLines.push(`\nexport interface ${entity.name}WithTimestamps extends ${entity.name}, Timestamps {}`);
    }

    // Add relationship types
    if (entity.relationships) {
      for (const rel of entity.relationships) {
        const relType = this.relationshipToTypeScript(rel, entity.name);
        interfaceLines.push(`\n${relType}`);
      }
    }

    const code = interfaceLines.join('\n');

    return {
      name: entity.name,
      code,
      imports,
      interfaces: [entity.name],
    };
  }

  /**
   * Register event listener
   */
  onEntityEvent(listener: (event: EntityEvent) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit entity event
   */
  private emitEvent(event: EntityEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in entity event listener:', error);
      }
    }
  }

  /**
   * Validate entity definition
   */
  private validateDefinition(definition: EntityDefinition): void {
    if (!definition.name) {
      throw new EntityError('Entity name is required', 'INVALID_DEFINITION');
    }

    if (!definition.fields || definition.fields.length === 0) {
      throw new EntityError(`Entity ${definition.name} must have at least one field`, 'INVALID_DEFINITION');
    }

    const fieldNames = new Set<string>();
    for (const field of definition.fields) {
      if (!field.name) {
        throw new EntityError(`Field name is required in ${definition.name}`, 'INVALID_DEFINITION');
      }
      if (fieldNames.has(field.name)) {
        throw new EntityError(`Duplicate field name: ${field.name}`, 'INVALID_DEFINITION');
      }
      fieldNames.add(field.name);
    }
  }

  /**
   * Generate schema from entity definition
   */
  private generateSchemaFromDefinition(definition: EntityDefinition): JSONSchema {
    const properties: Record<string, JSONSchemaProperty> = {};
    const required: string[] = [];

    for (const field of definition.fields) {
      properties[field.name] = {
        type: this.fieldTypeToSchemaType(field.type),
        description: field.description,
        default: field.default,
      };

      if (field.required) {
        required.push(field.name);
      }

      if (field.type === 'enum' && field.enumType) {
        const enumDef = enumRegistry.get(field.enumType);
        if (enumDef) {
          properties[field.name].enum = enumDef.values.map((v) => v.value);
        }
      }

      if (field.validation) {
        if (field.validation.minLength !== undefined) {
          properties[field.name].minLength = field.validation.minLength;
        }
        if (field.validation.maxLength !== undefined) {
          properties[field.name].maxLength = field.validation.maxLength;
        }
        if (field.validation.pattern !== undefined) {
          properties[field.name].pattern = field.validation.pattern;
        }
        if (field.validation.min !== undefined) {
          properties[field.name].minimum = field.validation.min;
        }
        if (field.validation.max !== undefined) {
          properties[field.name].maximum = field.validation.max;
        }
      }
    }

    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      id: definition.name,
      title: definition.name,
      description: definition.description,
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    };
  }

  /**
   * Validate field type
   */
  private validateFieldType(fieldType: string, value: any): boolean {
    switch (fieldType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !Number.isNaN(value);
      case 'integer':
        return Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || typeof value === 'string';
      case 'json':
        return typeof value === 'object';
      case 'enum':
        return true; // Enum validation handled separately
      case 'relation':
        return typeof value === 'object' || typeof value === 'string';
      default:
        return false;
    }
  }

  /**
   * Convert field type to JSON schema type
   */
  private fieldTypeToSchemaType(fieldType: string): string {
    switch (fieldType) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'integer':
        return 'integer';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'string';
      case 'json':
        return 'object';
      case 'enum':
        return 'string';
      case 'relation':
        return 'object';
      default:
        return 'string';
    }
  }

  /**
   * Convert field to TypeScript type
   */
  private fieldToTypeScript(field: any): string {
    let type = '';

    switch (field.type) {
      case 'string':
        type = 'string';
        break;
      case 'number':
        type = 'number';
        break;
      case 'integer':
        type = 'number';
        break;
      case 'boolean':
        type = 'boolean';
        break;
      case 'date':
        type = 'Date | string';
        break;
      case 'json':
        type = 'any';
        break;
      case 'enum':
        type = field.enumType || 'string';
        break;
      case 'relation':
        type = field.relationTarget || 'any';
        break;
      default:
        type = 'any';
    }

    return field.type === 'array' ? `${type}[]` : type;
  }

  /**
   * Convert relationship to TypeScript
   */
  private relationshipToTypeScript(rel: any, entityName: string): string {
    switch (rel.type) {
      case 'one-to-one':
        return `export interface ${entityName}With${rel.targetEntity} extends ${entityName} {\n  ${rel.name}: ${rel.targetEntity};\n}`;
      case 'one-to-many':
        return `export interface ${entityName}With${rel.targetEntity} extends ${entityName} {\n  ${rel.name}: ${rel.targetEntity}[];\n}`;
      case 'many-to-many':
        return `export interface ${entityName}With${rel.targetEntity} extends ${entityName} {\n  ${rel.name}: ${rel.targetEntity}[];\n}`;
      default:
        return '';
    }
  }
}

/**
 * Enum Registry - Manages custom enum definitions
 */
export class EnumRegistry implements IEnumRegistry {
  private enums: Map<string, EnumDefinition> = new Map();

  /**
   * Register an enum
   */
  register(definition: EnumDefinition): void {
    if (this.enums.has(definition.name)) {
      throw new DuplicateEntityError(definition.name);
    }

    if (!definition.values || definition.values.length === 0) {
      throw new EntityError(`Enum ${definition.name} must have at least one value`, 'INVALID_ENUM');
    }

    this.enums.set(definition.name, definition);
  }

  /**
   * Unregister an enum
   */
  unregister(enumName: string): void {
    if (!this.enums.has(enumName)) {
      throw new EntityNotFoundError(enumName);
    }

    this.enums.delete(enumName);
  }

  /**
   * Get enum definition
   */
  get(enumName: string): EnumDefinition | undefined {
    return this.enums.get(enumName);
  }

  /**
   * List all enums
   */
  list(): EnumDefinition[] {
    return Array.from(this.enums.values());
  }

  /**
   * Validate enum value
   */
  validate(enumName: string, value: any): boolean {
    const enumDef = this.get(enumName);
    if (!enumDef) {
      return false;
    }

    return enumDef.values.some((v) => v.value === value || v.name === value);
  }

  /**
   * Get enum values
   */
  values(enumName: string): any[] {
    const enumDef = this.get(enumName);
    return enumDef ? enumDef.values.map((v) => v.value) : [];
  }

  /**
   * Generate TypeScript type for enum
   */
  generateTypeScript(enumName: string): TypeScriptType {
    const enumDef = this.get(enumName);
    if (!enumDef) {
      throw new EntityNotFoundError(enumName);
    }

    const lines = [`export enum ${enumName} {`];

    for (const value of enumDef.values) {
      const stringValue = typeof value.value === 'string' ? `'${value.value}'` : value.value;
      lines.push(`  /** ${value.description || ''} */`);
      lines.push(`  ${value.name} = ${stringValue},`);
    }

    lines.push(`}`);

    return {
      name: enumName,
      code: lines.join('\n'),
      imports: [],
      interfaces: [enumName],
    };
  }
}

/**
 * Global entity registry instance
 */
export const entityRegistry = new EntityRegistry();

/**
 * Global enum registry instance
 */
export const enumRegistry = new EnumRegistry();
