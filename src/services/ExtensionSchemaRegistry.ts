/**
 * Extension Schema Registry Service
 *
 * Implements the schema registration, validation, and conflict detection
 * for the Extension Schema Framework (Issue #438)
 *
 * Enables plugins to register custom database entities and fields
 * without modifying the core Prisma schema.
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import {
  ExtensionDatabaseSchema,
  ExtensionTable,
  ExtensionField,
  ExtensionEnum,
  ExtensionRelationship,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ConflictReport,
  Conflict,
  RegistrationResult,
  PrismaSchemaResult,
  PrismaModel,
  PrismaField,
  PrismaEnum,
  ExtensionSchemaStatus,
  ExtensionFieldType,
} from '../types/extensionSchema'

/**
 * Extension Schema Registry
 *
 * Central service for managing extension database schemas
 */
export class ExtensionSchemaRegistry {
  private prisma: PrismaClient
  private registeredSchemas: Map<string, ExtensionDatabaseSchema> = new Map()
  private prismaSchemaCache: string | null = null

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Register a new extension schema
   *
   * @param pluginId - Unique identifier for the plugin
   * @param schema - Extension schema definition
   * @returns Registration result with status and validation
   */
  async registerSchema(
    pluginId: string,
    schema: ExtensionDatabaseSchema
  ): Promise<RegistrationResult> {
    const startTime = Date.now()

    try {
      // Validate schema
      const validationResult = this.validateSchema(schema)
      if (!validationResult.valid) {
        return {
          success: false,
          pluginId,
          schemaId: `${pluginId}-${schema.version}`,
          version: schema.version,
          status: 'failed' as ExtensionSchemaStatus,
          errors: validationResult.errors.map((e) => e.message),
          warnings: validationResult.warnings.map((w) => w.message),
          registeredAt: new Date(),
        }
      }

      // Check for conflicts
      const conflictReport = this.detectConflicts(schema)
      if (conflictReport.hasConflicts) {
        // Store conflicts in database
        await this.storeConflicts(conflictReport)

        // If critical conflicts, fail registration
        const criticalConflicts = conflictReport.conflicts.filter(
          (c) => c.severity === 'error'
        )
        if (criticalConflicts.length > 0) {
          return {
            success: false,
            pluginId,
            schemaId: `${pluginId}-${schema.version}`,
            version: schema.version,
            status: 'failed' as ExtensionSchemaStatus,
            errors: criticalConflicts.map((c) => c.message),
            warnings: conflictReport.conflicts
              .filter((c) => c.severity === 'warning')
              .map((c) => c.message),
            registeredAt: new Date(),
          }
        }
      }

      // Store schema in database
      const extensionSchema = await this.prisma.extensionSchema.upsert({
        where: { pluginId },
        update: {
          version: schema.version,
          schemaDefinition: schema,
          status: 'validating' as ExtensionSchemaStatus,
          validationErrors: null,
          updatedAt: new Date(),
        },
        create: {
          pluginId,
          version: schema.version,
          schemaDefinition: schema,
          status: 'validating' as ExtensionSchemaStatus,
        },
      })

      // Register in memory
      this.registeredSchemas.set(pluginId, schema)

      // Invalidate Prisma schema cache
      this.prismaSchemaCache = null

      // Store table metadata
      await this.storeTableMetadata(pluginId, schema)

      // Store version history
      await this.storeVersionHistory(pluginId, schema)

      // Audit log
      await this.auditLog(pluginId, 'SCHEMA_REGISTERED', {
        version: schema.version,
        tables: schema.tables.length,
        enums: schema.enums.length,
        relationships: schema.relationships.length,
      })

      return {
        success: true,
        pluginId,
        schemaId: extensionSchema.id,
        version: schema.version,
        status: extensionSchema.status,
        warnings: validationResult.warnings.map((w) => w.message),
        registeredAt: extensionSchema.registeredAt || new Date(),
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      await this.auditLog(pluginId, 'SCHEMA_REGISTRATION_FAILED', {
        error: errorMessage,
      })

      return {
        success: false,
        pluginId,
        schemaId: `${pluginId}-${schema.version}`,
        version: schema.version,
        status: 'failed' as ExtensionSchemaStatus,
        errors: [errorMessage],
        registeredAt: new Date(),
      }
    }
  }

  /**
   * Validate extension schema
   *
   * @param schema - Schema to validate
   * @returns Validation result with errors and warnings
   */
  validateSchema(schema: ExtensionDatabaseSchema): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Validate required fields
    if (!schema.pluginId || schema.pluginId.trim() === '') {
      errors.push({
        field: 'pluginId',
        message: 'pluginId is required',
        severity: 'error',
        code: 'MISSING_PLUGIN_ID',
      })
    }

    if (!schema.version || schema.version.trim() === '') {
      errors.push({
        field: 'version',
        message: 'version is required',
        severity: 'error',
        code: 'MISSING_VERSION',
      })
    }

    if (!schema.metadata?.namespace) {
      errors.push({
        field: 'metadata.namespace',
        message: 'namespace is required in metadata',
        severity: 'error',
        code: 'MISSING_NAMESPACE',
      })
    }

    // Validate plugin ID format
    if (schema.pluginId && !/^[a-zA-Z0-9_-]+$/.test(schema.pluginId)) {
      errors.push({
        field: 'pluginId',
        message:
          'pluginId must contain only alphanumeric characters, hyphens, and underscores',
        severity: 'error',
        code: 'INVALID_PLUGIN_ID_FORMAT',
      })
    }

    // Validate version format (semver)
    if (schema.version && !/^\d+\.\d+\.\d+/.test(schema.version)) {
      warnings.push({
        field: 'version',
        message: 'version should follow semantic versioning (e.g., 1.0.0)',
        code: 'INVALID_VERSION_FORMAT',
      })
    }

    // Validate tables
    if (!schema.tables || schema.tables.length === 0) {
      warnings.push({
        field: 'tables',
        message: 'schema should define at least one table',
        code: 'NO_TABLES',
      })
    }

    // Validate each table
    schema.tables?.forEach((table, tableIndex) => {
      const tableErrors = this.validateTable(table)
      errors.push(...tableErrors)

      // Check for reserved table names
      if (this.isReservedTableName(table.name)) {
        errors.push({
          field: `tables[${tableIndex}].name`,
          message: `table name "${table.name}" is reserved`,
          severity: 'error',
          code: 'RESERVED_TABLE_NAME',
        })
      }

      // Validate fields
      table.fields?.forEach((field, fieldIndex) => {
        const fieldErrors = this.validateField(field)
        errors.push(
          ...fieldErrors.map((e) => ({
            ...e,
            field: `tables[${tableIndex}].fields[${fieldIndex}].${e.field}`,
          }))
        )
      })
    })

    // Validate enums
    schema.enums?.forEach((enumDef, enumIndex) => {
      if (!enumDef.name || enumDef.name.trim() === '') {
        errors.push({
          field: `enums[${enumIndex}].name`,
          message: 'enum name is required',
          severity: 'error',
          code: 'MISSING_ENUM_NAME',
        })
      }

      if (!enumDef.values || enumDef.values.length === 0) {
        errors.push({
          field: `enums[${enumIndex}].values`,
          message: 'enum must have at least one value',
          severity: 'error',
          code: 'EMPTY_ENUM_VALUES',
        })
      }

      // Check for reserved enum names
      if (this.isReservedEnumName(enumDef.name)) {
        errors.push({
          field: `enums[${enumIndex}].name`,
          message: `enum name "${enumDef.name}" is reserved`,
          severity: 'error',
          code: 'RESERVED_ENUM_NAME',
        })
      }
    })

    // Validate relationships
    schema.relationships?.forEach((rel, relIndex) => {
      if (!rel.source || rel.source.trim() === '') {
        errors.push({
          field: `relationships[${relIndex}].source`,
          message: 'relationship source is required',
          severity: 'error',
          code: 'MISSING_RELATIONSHIP_SOURCE',
        })
      }

      if (!rel.target || rel.target.trim() === '') {
        errors.push({
          field: `relationships[${relIndex}].target`,
          message: 'relationship target is required',
          severity: 'error',
          code: 'MISSING_RELATIONSHIP_TARGET',
        })
      }

      // Validate relationship type
      if (!['OneToOne', 'OneToMany', 'ManyToMany'].includes(rel.type)) {
        errors.push({
          field: `relationships[${relIndex}].type`,
          message: `invalid relationship type "${rel.type}"`,
          severity: 'error',
          code: 'INVALID_RELATIONSHIP_TYPE',
        })
      }
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Validate individual table
   * @private
   */
  private validateTable(table: ExtensionTable): ValidationError[] {
    const errors: ValidationError[] = []

    if (!table.name || table.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'table name is required',
        severity: 'error',
        code: 'MISSING_TABLE_NAME',
      })
    }

    if (!table.namespace || table.namespace.trim() === '') {
      errors.push({
        field: 'namespace',
        message: 'table namespace is required',
        severity: 'error',
        code: 'MISSING_NAMESPACE',
      })
    }

    if (!table.fields || table.fields.length === 0) {
      errors.push({
        field: 'fields',
        message: 'table must have at least one field',
        severity: 'error',
        code: 'EMPTY_TABLE_FIELDS',
      })
    }

    return errors
  }

  /**
   * Validate individual field
   * @private
   */
  private validateField(field: ExtensionField): ValidationError[] {
    const errors: ValidationError[] = []

    if (!field.name || field.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'field name is required',
        severity: 'error',
        code: 'MISSING_FIELD_NAME',
      })
    }

    if (!field.type) {
      errors.push({
        field: 'type',
        message: 'field type is required',
        severity: 'error',
        code: 'MISSING_FIELD_TYPE',
      })
    }

    const validTypes: ExtensionFieldType[] = [
      'String',
      'Int',
      'Float',
      'Boolean',
      'DateTime',
      'Decimal',
      'Json',
      'Bytes',
    ]
    if (field.type && !validTypes.includes(field.type)) {
      errors.push({
        field: 'type',
        message: `invalid field type "${field.type}"`,
        severity: 'error',
        code: 'INVALID_FIELD_TYPE',
      })
    }

    if (field.validation?.pattern && !this.isValidRegex(field.validation.pattern)) {
      errors.push({
        field: 'validation.pattern',
        message: 'validation pattern is not a valid regex',
        severity: 'error',
        code: 'INVALID_REGEX_PATTERN',
      })
    }

    return errors
  }

  /**
   * Check if table name is reserved
   * @private
   */
  private isReservedTableName(name: string): boolean {
    const reservedNames = new Set([
      'users',
      'roles',
      'permissions',
      'sessions',
      'audit_logs',
    ])
    return reservedNames.has(name.toLowerCase())
  }

  /**
   * Check if enum name is reserved
   * @private
   */
  private isReservedEnumName(name: string): boolean {
    const reservedNames = new Set([
      'Role',
      'Status',
      'State',
      'UserStatus',
      'WorkflowStatus',
    ])
    return reservedNames.has(name)
  }

  /**
   * Check if regex pattern is valid
   * @private
   */
  private isValidRegex(pattern: string): boolean {
    try {
      new RegExp(pattern)
      return true
    } catch {
      return false
    }
  }

  /**
   * Detect conflicts between registered schemas
   *
   * @param schema - New schema to check for conflicts
   * @returns Conflict report
   */
  detectConflicts(schema: ExtensionDatabaseSchema): ConflictReport {
    const conflicts: Conflict[] = []
    const warnings: any[] = []

    // Check table name conflicts
    schema.tables?.forEach((table) => {
      this.registeredSchemas.forEach((registeredSchema, registeredPluginId) => {
        registeredSchema.tables?.forEach((registeredTable) => {
          if (
            table.name === registeredTable.name &&
            table.namespace === registeredTable.namespace
          ) {
            conflicts.push({
              type: 'table_name',
              plugin1: schema.pluginId,
              plugin2: registeredPluginId,
              item1: table.name,
              item2: registeredTable.name,
              message: `Table name conflict: "${table.name}" already exists in plugin "${registeredPluginId}"`,
              severity: 'error',
            })
          }
        })
      })
    })

    // Check enum name conflicts
    schema.enums?.forEach((enumDef) => {
      this.registeredSchemas.forEach((registeredSchema, registeredPluginId) => {
        registeredSchema.enums?.forEach((registeredEnum) => {
          if (enumDef.name === registeredEnum.name) {
            conflicts.push({
              type: 'enum_name',
              plugin1: schema.pluginId,
              plugin2: registeredPluginId,
              item1: enumDef.name,
              item2: registeredEnum.name,
              message: `Enum name conflict: "${enumDef.name}" already exists in plugin "${registeredPluginId}"`,
              severity: 'error',
            })
          }
        })
      })
    })

    // Check field name conflicts within tables
    schema.tables?.forEach((table) => {
      const fieldNames = new Set<string>()
      table.fields?.forEach((field) => {
        if (fieldNames.has(field.name)) {
          conflicts.push({
            type: 'field_name',
            plugin1: schema.pluginId,
            plugin2: schema.pluginId,
            item1: field.name,
            item2: field.name,
            message: `Duplicate field name "${field.name}" in table "${table.name}"`,
            severity: 'error',
          })
        }
        fieldNames.add(field.name)
      })
    })

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      warnings,
    }
  }

  /**
   * Get all registered schemas
   */
  getAllSchemas(): ExtensionDatabaseSchema[] {
    return Array.from(this.registeredSchemas.values())
  }

  /**
   * Get schema by plugin ID
   */
  getPluginSchema(pluginId: string): ExtensionDatabaseSchema | null {
    return this.registeredSchemas.get(pluginId) || null
  }

  /**
   * Generate Prisma schema from all registered schemas
   */
  generatePrismaSchema(): PrismaSchemaResult {
    try {
      const models: PrismaModel[] = []
      const enums: PrismaEnum[] = []

      this.registeredSchemas.forEach((schema) => {
        // Generate models from tables
        schema.tables?.forEach((table) => {
          const fields: PrismaField[] = table.fields?.map((field) => ({
            name: field.name,
            type: this.mapFieldType(field.type),
            isList: false,
            isRequired: field.required,
            hasDefaultValue: field.default !== undefined,
            default: field.default,
            isId: field.name === 'id',
            isUnique: field.unique || false,
          })) || []

          models.push({
            name: this.formatTableName(table.name),
            fields,
          })
        })

        // Generate enums
        schema.enums?.forEach((enumDef) => {
          enums.push({
            name: enumDef.name,
            values: enumDef.values,
          })
        })
      })

      // Build Prisma schema string
      let schemaString = ''
      enums.forEach((enumDef) => {
        schemaString += `\nenum ${enumDef.name} {\n`
        enumDef.values.forEach((value) => {
          schemaString += `  ${value}\n`
        })
        schemaString += '}\n'
      })

      models.forEach((model) => {
        schemaString += `\nmodel ${model.name} {\n`
        model.fields.forEach((field) => {
          const modifiers = []
          if (field.isId) modifiers.push('@id')
          if (field.isUnique) modifiers.push('@unique')
          if (field.hasDefaultValue) modifiers.push(`@default(${field.default})`)

          const modifierStr = modifiers.length > 0 ? ` ${modifiers.join(' ')}` : ''
          const typeStr = field.isList ? `${field.type}[]` : field.type
          const requiredStr = field.isRequired ? '' : '?'

          schemaString += `  ${field.name} ${typeStr}${requiredStr}${modifierStr}\n`
        })
        schemaString += '}\n'
      })

      return {
        success: true,
        schema: schemaString,
        models,
        enums,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        schema: '',
        models: [],
        enums: [],
        errors: [errorMessage],
      }
    }
  }

  /**
   * Unregister schema
   */
  async unregisterSchema(pluginId: string): Promise<void> {
    try {
      this.registeredSchemas.delete(pluginId)
      this.prismaSchemaCache = null

      await this.prisma.extensionSchema.delete({
        where: { pluginId },
      })

      await this.auditLog(pluginId, 'SCHEMA_UNREGISTERED', {})
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await this.auditLog(pluginId, 'SCHEMA_UNREGISTRATION_FAILED', {
        error: errorMessage,
      })
      throw error
    }
  }

  /**
   * Helper: Store conflicts in database
   * @private
   */
  private async storeConflicts(report: ConflictReport): Promise<void> {
    for (const conflict of report.conflicts) {
      await this.prisma.extensionSchemaConflict.create({
        data: {
          plugin1Id: conflict.plugin1,
          plugin2Id: conflict.plugin2,
          conflictType: conflict.type,
          item1: conflict.item1,
          item2: conflict.item2,
          message: conflict.message,
          severity: conflict.severity as any,
        },
      })
    }
  }

  /**
   * Helper: Store table metadata
   * @private
   */
  private async storeTableMetadata(
    pluginId: string,
    schema: ExtensionDatabaseSchema
  ): Promise<void> {
    for (const table of schema.tables || []) {
      await this.prisma.extensionTableMetadata.upsert({
        where: {
          pluginId_tableName: {
            pluginId,
            tableName: table.name,
          },
        },
        update: {
          displayName: table.displayName,
          description: table.description,
          namespace: table.namespace,
          fieldCount: table.fields?.length || 0,
          indexCount: table.indexes?.length || 0,
        },
        create: {
          pluginId,
          tableName: table.name,
          displayName: table.displayName,
          description: table.description,
          namespace: table.namespace,
          fieldCount: table.fields?.length || 0,
          indexCount: table.indexes?.length || 0,
        },
      })
    }
  }

  /**
   * Helper: Store version history
   * @private
   */
  private async storeVersionHistory(
    pluginId: string,
    schema: ExtensionDatabaseSchema
  ): Promise<void> {
    await this.prisma.extensionSchemaVersion.create({
      data: {
        pluginId,
        version: schema.version,
        schemaDefinition: schema,
      },
    })
  }

  /**
   * Helper: Audit log
   * @private
   */
  private async auditLog(
    pluginId: string,
    action: string,
    changes: any
  ): Promise<void> {
    try {
      await this.prisma.extensionSchemaAuditLog.create({
        data: {
          pluginId,
          action,
          changes,
        },
      })
    } catch (error) {
      // Log but don't throw - don't let audit failures break the flow
      console.error('Failed to write audit log:', error)
    }
  }

  /**
   * Helper: Map field types
   * @private
   */
  private mapFieldType(type: ExtensionFieldType): string {
    const typeMap: Record<ExtensionFieldType, string> = {
      String: 'String',
      Int: 'Int',
      Float: 'Float',
      Boolean: 'Boolean',
      DateTime: 'DateTime',
      Decimal: 'Decimal',
      Json: 'Json',
      Bytes: 'Bytes',
    }
    return typeMap[type] || 'String'
  }

  /**
   * Helper: Format table name for Prisma model
   * @private
   */
  private formatTableName(name: string): string {
    // Convert snake_case to PascalCase
    return name
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  }
}
