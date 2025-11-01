/**
 * Schema Extension Registry - Core registry for database schema extensions
 * Issue #438: Database Schema Extension Framework
 */

import type {
  SchemaExtension,
  SchemaTable,
  SchemaField,
  SchemaValidationResult,
  CompatibilityResult,
  SchemaConflict,
  PrismaSchema,
  ISchemaRegistry,
  SchemaMigration,
} from './types';

import {
  SchemaError,
  SchemaValidationError,
  SchemaConflictError,
} from './types';

/**
 * Core registry for managing database schema extensions
 */
export class SchemaExtensionRegistry implements ISchemaRegistry {
  private schemas = new Map<string, SchemaExtension>();
  private listeners: Array<(event: SchemaRegistryEvent) => void> = [];

  /**
   * Register a new schema extension
   */
  register(schema: SchemaExtension): void {
    // Validate before registration
    const validation = this.validate(schema);
    if (!validation.valid) {
      throw new SchemaValidationError(validation.errors);
    }

    // Check compatibility with existing schemas
    const compatibility = this.checkCompatibility(schema);
    if (!compatibility.compatible) {
      throw new SchemaConflictError(compatibility.conflicts);
    }

    // Store the schema
    this.schemas.set(schema.extensionId, schema);

    // Emit event
    this.emit({
      type: 'schema:registered',
      extensionId: schema.extensionId,
      schema,
    });
  }

  /**
   * Unregister a schema extension
   */
  unregister(extensionId: string): void {
    const schema = this.schemas.get(extensionId);
    if (schema) {
      this.schemas.delete(extensionId);

      this.emit({
        type: 'schema:unregistered',
        extensionId,
        schema,
      });
    }
  }

  /**
   * Get a schema by extension ID
   */
  get(extensionId: string): SchemaExtension | undefined {
    return this.schemas.get(extensionId);
  }

  /**
   * List all registered schemas
   */
  list(): SchemaExtension[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Validate a schema extension
   */
  validate(schema: SchemaExtension): SchemaValidationResult {
    const errors: Array<{
      table?: string;
      field?: string;
      message: string;
      code: string;
    }> = [];

    // Basic validation
    if (!schema.id || schema.id.trim() === '') {
      errors.push({
        message: 'Schema must have an ID',
        code: 'MISSING_ID',
      });
    }

    if (!schema.name || schema.name.trim() === '') {
      errors.push({
        message: 'Schema must have a name',
        code: 'MISSING_NAME',
      });
    }

    if (!schema.extensionId || schema.extensionId.trim() === '') {
      errors.push({
        message: 'Schema must have an extensionId',
        code: 'MISSING_EXTENSION_ID',
      });
    }

    if (!schema.version || schema.version.trim() === '') {
      errors.push({
        message: 'Schema must have a version',
        code: 'MISSING_VERSION',
      });
    }

    if (!Array.isArray(schema.tables) || schema.tables.length === 0) {
      errors.push({
        message: 'Schema must have at least one table',
        code: 'NO_TABLES',
      });
    }

    // Validate tables
    const tableNames = new Set<string>();
    for (const table of schema.tables) {
      // Table name validation
      if (!table.name || table.name.trim() === '') {
        errors.push({
          table: '[unknown]',
          message: 'Table must have a name',
          code: 'MISSING_TABLE_NAME',
        });
        continue;
      }

      if (tableNames.has(table.name.toLowerCase())) {
        errors.push({
          table: table.name,
          message: `Duplicate table name: ${table.name}`,
          code: 'DUPLICATE_TABLE_NAME',
        });
      }
      tableNames.add(table.name.toLowerCase());

      // Table must reference correct extension
      if (table.extensionId !== schema.extensionId) {
        errors.push({
          table: table.name,
          message: `Table extensionId must match schema extensionId`,
          code: 'EXTENSION_ID_MISMATCH',
        });
      }

      // Validate fields
      const fieldNames = new Set<string>();
      for (const field of table.fields) {
        // Field name validation
        if (!field.name || field.name.trim() === '') {
          errors.push({
            table: table.name,
            message: 'Field must have a name',
            code: 'MISSING_FIELD_NAME',
          });
          continue;
        }

        if (fieldNames.has(field.name.toLowerCase())) {
          errors.push({
            table: table.name,
            field: field.name,
            message: `Duplicate field name in table: ${field.name}`,
            code: 'DUPLICATE_FIELD_NAME',
          });
        }
        fieldNames.add(field.name.toLowerCase());

        // Type validation
        const validTypes = [
          'String',
          'Int',
          'Float',
          'Boolean',
          'DateTime',
          'Json',
          'Decimal',
          'Bytes',
        ];
        if (!validTypes.includes(field.type)) {
          errors.push({
            table: table.name,
            field: field.name,
            message: `Invalid field type: ${field.type}. Must be one of: ${validTypes.join(', ')}`,
            code: 'INVALID_FIELD_TYPE',
          });
        }

        // Validation rules
        if (field.validation) {
          if (
            field.validation.minLength !== undefined &&
            field.validation.maxLength !== undefined &&
            field.validation.minLength > field.validation.maxLength
          ) {
            errors.push({
              table: table.name,
              field: field.name,
              message:
                'minLength must be less than or equal to maxLength',
              code: 'INVALID_VALIDATION_RANGE',
            });
          }

          if (
            field.validation.min !== undefined &&
            field.validation.max !== undefined &&
            field.validation.min > field.validation.max
          ) {
            errors.push({
              table: table.name,
              field: field.name,
              message: 'min must be less than or equal to max',
              code: 'INVALID_VALIDATION_RANGE',
            });
          }

          if (field.validation.pattern) {
            try {
              new RegExp(field.validation.pattern);
            } catch (e) {
              errors.push({
                table: table.name,
                field: field.name,
                message: `Invalid regex pattern: ${(e as Error).message}`,
                code: 'INVALID_REGEX_PATTERN',
              });
            }
          }
        }
      }

      // Validate indexes
      if (table.indexes) {
        for (const index of table.indexes) {
          if (!index.name || index.name.trim() === '') {
            errors.push({
              table: table.name,
              message: 'Index must have a name',
              code: 'MISSING_INDEX_NAME',
            });
          }

          if (!index.fields || index.fields.length === 0) {
            errors.push({
              table: table.name,
              message: 'Index must have at least one field',
              code: 'EMPTY_INDEX_FIELDS',
            });
          }

          for (const fieldName of index.fields || []) {
            if (!table.fields.find((f) => f.name === fieldName)) {
              errors.push({
                table: table.name,
                message: `Index references non-existent field: ${fieldName}`,
                code: 'INVALID_INDEX_FIELD',
              });
            }
          }
        }
      }

      // Validate relations
      if (table.relations) {
        for (const relation of table.relations) {
          if (!relation.name || relation.name.trim() === '') {
            errors.push({
              table: table.name,
              message: 'Relation must have a name',
              code: 'MISSING_RELATION_NAME',
            });
          }

          if (!relation.target || relation.target.trim() === '') {
            errors.push({
              table: table.name,
              message: 'Relation must have a target table',
              code: 'MISSING_RELATION_TARGET',
            });
          }

          const validTypes = [
            'one-to-one',
            'one-to-many',
            'many-to-many',
          ];
          if (!validTypes.includes(relation.type)) {
            errors.push({
              table: table.name,
              message: `Invalid relation type: ${relation.type}`,
              code: 'INVALID_RELATION_TYPE',
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
   * Check compatibility with existing schemas
   */
  checkCompatibility(schema: SchemaExtension): CompatibilityResult {
    const conflicts: Array<{
      table?: string;
      field?: string;
      existingTable?: string;
      message: string;
    }> = [];
    const suggestions: string[] = [];

    for (const table of schema.tables) {
      // Check for table name collisions with other extensions
      for (const existingSchema of this.schemas.values()) {
        if (existingSchema.extensionId === schema.extensionId) continue;

        for (const existingTable of existingSchema.tables) {
          if (existingTable.name.toLowerCase() === table.name.toLowerCase()) {
            conflicts.push({
              table: table.name,
              existingTable: existingTable.name,
              message: `Table name conflicts with existing table: ${existingTable.name}`,
            });

            suggestions.push(
              `Rename table "${table.name}" to avoid collision (e.g., "${schema.extensionId}_${table.name}")`
            );
          }
        }
      }

      // Check for field name issues
      for (const field of table.fields) {
        // Reserved field names
        const reserved = [
          'id',
          'createdAt',
          'updatedAt',
          'deletedAt',
        ];
        if (reserved.includes(field.name.toLowerCase()) && !table.timestamps) {
          suggestions.push(
            `Consider enabling timestamps for table "${table.name}" to auto-manage date fields`
          );
        }
      }
    }

    return {
      compatible: conflicts.length === 0,
      conflicts,
      suggestions,
    };
  }

  /**
   * Generate Prisma schema from schema extension
   */
  generatePrismaSchema(schema: SchemaExtension): PrismaSchema {
    const models = schema.tables.map((table) => {
      const fields: PrismaSchema['models'][0]['fields'] = [];

      // Add timestamp fields if enabled
      if (table.timestamps) {
        fields.push({
          name: 'createdAt',
          type: 'DateTime',
          attributes: ['@default(now())'],
        });

        fields.push({
          name: 'updatedAt',
          type: 'DateTime',
          attributes: ['@updatedAt'],
        });
      }

      // Add regular fields
      for (const field of table.fields) {
        const attributes: string[] = [];

        if (field.unique) {
          attributes.push('@unique');
        }

        if (field.indexed) {
          attributes.push('@index');
        }

        if (field.default !== undefined) {
          const defaultValue =
            typeof field.default === 'string'
              ? `"${field.default}"`
              : field.default;
          attributes.push(`@default(${defaultValue})`);
        }

        if (field.relationName && field.relationTarget) {
          attributes.push(`@relation("${field.relationName}")`);
        }

        fields.push({
          name: field.name,
          type: field.type,
          attributes: attributes.length > 0 ? attributes : undefined,
          relationName: field.relationName,
          relationTarget: field.relationTarget,
        });
      }

      // Add model attributes
      const modelAttributes: string[] = [];
      if (table.indexes) {
        for (const index of table.indexes) {
          const indexAttr = index.unique
            ? '@@unique'
            : '@@index';
          modelAttributes.push(
            `${indexAttr}([${index.fields.join(', ')}], name: "${index.name}")`
          );
        }
      }

      return {
        name: table.name,
        fields,
        attributes: modelAttributes.length > 0 ? modelAttributes : undefined,
      };
    });

    return {
      datasource: 'postgresql', // Default to postgresql
      models,
    };
  }

  /**
   * Apply a migration
   */
  async applyMigration(migration: SchemaMigration): Promise<void> {
    const schema = this.schemas.get(migration.extensionId);
    if (!schema) {
      throw new SchemaError(
        `Schema not found: ${migration.extensionId}`,
        'SCHEMA_NOT_FOUND'
      );
    }

    // Validate migration
    if (!migration.id) {
      throw new SchemaError(
        'Migration must have an ID',
        'INVALID_MIGRATION'
      );
    }

    if (!migration.tableName) {
      throw new SchemaError(
        'Migration must specify a table',
        'INVALID_MIGRATION'
      );
    }

    // Find the table
    const table = schema.tables.find((t) => t.name === migration.tableName);
    if (!table) {
      throw new SchemaError(
        `Table not found: ${migration.tableName}`,
        'TABLE_NOT_FOUND'
      );
    }

    // Apply changes based on migration type
    switch (migration.type) {
      case 'create':
        // Table should already exist in schema
        break;

      case 'modify':
        for (const change of migration.changes) {
          if (change.operation === 'add' && change.field) {
            const fieldExists = table.fields.find(
              (f) => f.name === change.field
            );
            if (!fieldExists && change.newValue) {
              table.fields.push(change.newValue);
            }
          } else if (change.operation === 'remove' && change.field) {
            table.fields = table.fields.filter(
              (f) => f.name !== change.field
            );
          } else if (change.operation === 'modify' && change.field) {
            const field = table.fields.find(
              (f) => f.name === change.field
            );
            if (field && change.newValue) {
              Object.assign(field, change.newValue);
            }
          }
        }
        break;

      case 'delete':
        // Mark table for deletion (soft delete in this context)
        const tableIndex = schema.tables.findIndex(
          (t) => t.name === migration.tableName
        );
        if (tableIndex >= 0) {
          schema.tables.splice(tableIndex, 1);
        }
        break;

      case 'rename':
        if (table) {
          const newName = migration.changes.find(
            (c) => c.operation === 'rename'
          )?.newValue;
          if (newName) {
            table.name = newName;
          }
        }
        break;
    }

    // Update schema timestamp
    schema.updatedAt = new Date();

    // Emit event
    this.emit({
      type: 'migration:applied',
      extensionId: migration.extensionId,
      migration,
    });
  }

  /**
   * Listen to registry events
   */
  onEvent(listener: (event: SchemaRegistryEvent) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event
   */
  private emit(event: SchemaRegistryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        // Prevent listener errors from affecting the registry
        console.error('Error in schema registry listener:', e);
      }
    }
  }
}

/**
 * Registry event types
 */
export type SchemaRegistryEvent =
  | {
      type: 'schema:registered';
      extensionId: string;
      schema: SchemaExtension;
    }
  | {
      type: 'schema:unregistered';
      extensionId: string;
      schema?: SchemaExtension;
    }
  | {
      type: 'migration:applied';
      extensionId: string;
      migration: SchemaMigration;
    };

/**
 * Singleton instance
 */
export const schemaRegistry = new SchemaExtensionRegistry();
