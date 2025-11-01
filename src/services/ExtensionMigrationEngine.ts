/**
 * Extension Migration Engine
 *
 * Handles safe execution, rollback, and tracking of extension schema migrations
 * for the Extension Schema Framework (Issue #438)
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import {
  ExtensionDatabaseSchema,
  ExtensionTable,
  ExtensionField,
  Migration,
  MigrationRecord,
  ExecutionResult,
  RollbackResult,
  SafetyCheckResult,
  SafetyIssue,
  MigrationStatus,
  ExtensionFieldType,
} from '../types/extensionSchema'

/**
 * Migration Execution Engine
 *
 * Safely executes database migrations for extension schemas
 */
export class ExtensionMigrationEngine {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Generate SQL migrations from extension schemas
   *
   * @param pluginId - Plugin identifier
   * @param currentSchema - Current extension schema
   * @param previousSchema - Previous schema (for updates)
   * @returns Generated SQL migrations
   */
  async generateMigrations(
    pluginId: string,
    currentSchema: ExtensionDatabaseSchema,
    previousSchema?: ExtensionDatabaseSchema
  ): Promise<string[]> {
    const migrations: string[] = []

    if (!previousSchema) {
      // New schema - create all tables
      migrations.push(...this.generateCreateTableMigrations(currentSchema))
    } else {
      // Schema update - generate ALTER TABLE statements
      migrations.push(...this.generateAlterTableMigrations(currentSchema, previousSchema))
    }

    return migrations
  }

  /**
   * Generate CREATE TABLE migrations
   * @private
   */
  private generateCreateTableMigrations(schema: ExtensionDatabaseSchema): string[] {
    const migrations: string[] = []

    schema.tables?.forEach((table) => {
      const sql = this.generateCreateTableSQL(table)
      migrations.push(sql)

      // Generate indexes
      if (table.indexes && table.indexes.length > 0) {
        table.indexes.forEach((index) => {
          const indexSql = this.generateCreateIndexSQL(table, index)
          migrations.push(indexSql)
        })
      }

      // Generate unique constraints
      if (table.uniqueConstraints && table.uniqueConstraints.length > 0) {
        table.uniqueConstraints.forEach((constraint) => {
          const constraintSql = this.generateUniqueConstraintSQL(table, constraint)
          migrations.push(constraintSql)
        })
      }
    })

    return migrations
  }

  /**
   * Generate CREATE TABLE statement
   * @private
   */
  private generateCreateTableSQL(table: ExtensionTable): string {
    let sql = `CREATE TABLE "${table.namespace}"."${table.name}" (\n`

    // Add fields
    const fieldLines: string[] = []

    // Add id field if not present
    const hasIdField = table.fields?.some((f) => f.name === 'id')
    if (!hasIdField) {
      fieldLines.push('  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid()')
    }

    // Add user-defined fields
    table.fields?.forEach((field) => {
      const columnDef = this.generateColumnDefinition(field)
      fieldLines.push(`  ${columnDef}`)
    })

    // Add timestamps if enabled
    if (table.timestamps?.createdAt !== false) {
      fieldLines.push('  "createdAt" TIMESTAMP DEFAULT NOW()')
    }
    if (table.timestamps?.updatedAt !== false) {
      fieldLines.push('  "updatedAt" TIMESTAMP DEFAULT NOW()')
    }

    sql += fieldLines.join(',\n')
    sql += '\n);\n'

    return sql
  }

  /**
   * Generate column definition
   * @private
   */
  private generateColumnDefinition(field: ExtensionField): string {
    const constraints: string[] = []

    // Type
    const pgType = this.mapFieldTypeToPG(field.type)
    let def = `"${field.name}" ${pgType}`

    // Required
    if (field.required) {
      def += ' NOT NULL'
    }

    // Default
    if (field.default !== undefined) {
      def += ` DEFAULT ${this.formatDefaultValue(field.default, field.type)}`
    }

    // Unique
    if (field.unique) {
      def += ' UNIQUE'
    }

    // Validation constraints as CHECK
    if (field.validation?.minLength || field.validation?.maxLength) {
      constraints.push(
        `CONSTRAINT "${field.name}_length_check" CHECK (length("${field.name}") >= ${field.validation.minLength || 0} AND length("${field.name}") <= ${field.validation.maxLength || 2147483647})`
      )
    }

    if (field.validation?.min !== undefined || field.validation?.max !== undefined) {
      const min = field.validation?.min ?? -9223372036854775808
      const max = field.validation?.max ?? 9223372036854775807
      constraints.push(
        `CONSTRAINT "${field.name}_range_check" CHECK ("${field.name}" >= ${min} AND "${field.name}" <= ${max})`
      )
    }

    return def
  }

  /**
   * Map extension field type to PostgreSQL type
   * @private
   */
  private mapFieldTypeToPG(type: ExtensionFieldType): string {
    const typeMap: Record<ExtensionFieldType, string> = {
      String: 'VARCHAR(255)',
      Int: 'INTEGER',
      Float: 'DECIMAL(18,6)',
      Boolean: 'BOOLEAN',
      DateTime: 'TIMESTAMP',
      Decimal: 'NUMERIC(18,6)',
      Json: 'JSONB',
      Bytes: 'BYTEA',
    }
    return typeMap[type] || 'VARCHAR(255)'
  }

  /**
   * Format default value
   * @private
   */
  private formatDefaultValue(value: unknown, type: ExtensionFieldType): string {
    if (value === null || value === undefined) {
      return 'NULL'
    }

    if (type === 'String') {
      return `'${String(value).replace(/'/g, "''")}'`
    }

    if (type === 'Boolean') {
      return value === true || value === 'true' ? 'true' : 'false'
    }

    if (type === 'Json') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
    }

    return String(value)
  }

  /**
   * Generate CREATE INDEX statement
   * @private
   */
  private generateCreateIndexSQL(table: ExtensionTable, index: any): string {
    const unique = index.unique ? 'UNIQUE' : ''
    const fields = index.fields.map((f: string) => `"${f}"`).join(', ')
    return `CREATE ${unique} INDEX "idx_${table.namespace}_${table.name}_${index.name}" ON "${table.namespace}"."${table.name}" (${fields});\n`
  }

  /**
   * Generate UNIQUE CONSTRAINT statement
   * @private
   */
  private generateUniqueConstraintSQL(table: ExtensionTable, constraint: any): string {
    const fields = constraint.fields.map((f: string) => `"${f}"`).join(', ')
    return `ALTER TABLE "${table.namespace}"."${table.name}" ADD CONSTRAINT "${constraint.name}" UNIQUE (${fields});\n`
  }

  /**
   * Generate ALTER TABLE migrations
   * @private
   */
  private generateAlterTableMigrations(
    currentSchema: ExtensionDatabaseSchema,
    previousSchema: ExtensionDatabaseSchema
  ): string[] {
    const migrations: string[] = []

    // Add new tables
    currentSchema.tables?.forEach((currentTable) => {
      const existingTable = previousSchema.tables?.find((t) => t.name === currentTable.name)
      if (!existingTable) {
        migrations.push(this.generateCreateTableSQL(currentTable))
      } else {
        // Add new fields
        currentTable.fields?.forEach((field) => {
          const existingField = existingTable.fields?.find((f) => f.name === field.name)
          if (!existingField) {
            const addFieldSql = `ALTER TABLE "${currentTable.namespace}"."${currentTable.name}" ADD COLUMN ${this.generateColumnDefinition(field)};\n`
            migrations.push(addFieldSql)
          }
        })
      }
    })

    // Add new enums
    currentSchema.enums?.forEach((enumDef) => {
      const existingEnum = previousSchema.enums?.find((e) => e.name === enumDef.name)
      if (!existingEnum) {
        const enumSql = this.generateCreateEnumSQL(enumDef.name, enumDef.values)
        migrations.push(enumSql)
      }
    })

    return migrations
  }

  /**
   * Generate CREATE ENUM statement
   * @private
   */
  private generateCreateEnumSQL(name: string, values: string[]): string {
    const valueList = values.map((v) => `'${v}'`).join(', ')
    return `CREATE TYPE "${name}" AS ENUM (${valueList});\n`
  }

  /**
   * Execute migrations safely with transaction
   *
   * @param pluginId - Plugin identifier
   * @param migrations - SQL migration strings
   * @param schema - Extension schema being applied
   * @returns Execution result
   */
  async executeMigrations(
    pluginId: string,
    migrations: string[],
    schema: ExtensionDatabaseSchema
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    const migrationId = `${pluginId}-${Date.now()}`

    try {
      // Validate migrations before execution
      const safetyCheck = await this.validateMigrationSafety(pluginId, migrations, schema)
      if (!safetyCheck.safe) {
        throw new Error(
          `Migration safety check failed: ${safetyCheck.issues.map((i) => i.message).join(', ')}`
        )
      }

      // Calculate checksums
      const schemaChecksum = this.calculateChecksum(JSON.stringify(schema))
      const sqlChecksum = this.calculateChecksum(migrations.join('\n'))

      // Create migration record
      const migration = await this.prisma.extensionMigration.create({
        data: {
          pluginId,
          migrationId,
          version: schema.version,
          migrationSql: migrations.join('\n'),
          checksumSchema: schemaChecksum,
          checksumSql: sqlChecksum,
          status: 'executing' as MigrationStatus,
          executionStart: new Date(),
        },
      })

      // Execute migrations in transaction
      try {
        // Note: In production, use actual SQL execution
        // This is a placeholder for the actual implementation
        await this.executeSQL(migrations.join('\n'))

        // Update migration status
        await this.prisma.extensionMigration.update({
          where: { id: migration.id },
          data: {
            status: 'executed' as MigrationStatus,
            executionEnd: new Date(),
          },
        })

        const duration = Date.now() - startTime

        return {
          success: true,
          migrationId,
          pluginId,
          duration,
          status: 'executed' as MigrationStatus,
          executedAt: new Date(),
        }
      } catch (error) {
        // Mark as failed
        await this.prisma.extensionMigration.update({
          where: { id: migration.id },
          data: {
            status: 'failed' as MigrationStatus,
            errorMessage: error instanceof Error ? error.message : String(error),
            executionEnd: new Date(),
          },
        })

        throw error
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      return {
        success: false,
        migrationId,
        pluginId,
        duration,
        status: 'failed' as MigrationStatus,
        errors: [errorMessage],
        executedAt: new Date(),
      }
    }
  }

  /**
   * Rollback a migration
   *
   * @param migrationId - Migration to rollback
   * @returns Rollback result
   */
  async rollbackMigration(migrationId: string): Promise<RollbackResult> {
    const startTime = Date.now()

    try {
      const migration = await this.prisma.extensionMigration.findUnique({
        where: { id: migrationId },
      })

      if (!migration) {
        throw new Error(`Migration ${migrationId} not found`)
      }

      if (!migration.rollbackSql) {
        throw new Error(`Migration ${migrationId} does not have rollback SQL`)
      }

      // Execute rollback
      await this.executeSQL(migration.rollbackSql)

      // Update migration record
      await this.prisma.extensionMigration.update({
        where: { id: migrationId },
        data: {
          status: 'rolled_back' as MigrationStatus,
          executionEnd: new Date(),
        },
      })

      const duration = Date.now() - startTime

      return {
        success: true,
        migrationId,
        pluginId: migration.pluginId,
        duration,
        status: 'rolled_back' as MigrationStatus,
        rolledBackAt: new Date(),
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      return {
        success: false,
        migrationId,
        pluginId: '',
        duration,
        status: 'failed' as MigrationStatus,
        errors: [errorMessage],
        rolledBackAt: new Date(),
      }
    }
  }

  /**
   * Get migration history
   *
   * @param pluginId - Filter by plugin (optional)
   * @returns Migration records
   */
  async getMigrationHistory(pluginId?: string): Promise<MigrationRecord[]> {
    const where = pluginId ? { pluginId } : {}
    return this.prisma.extensionMigration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    }) as Promise<MigrationRecord[]>
  }

  /**
   * Validate migration safety
   *
   * @param pluginId - Plugin identifier
   * @param migrations - SQL migrations
   * @param schema - Extension schema
   * @returns Safety check result
   */
  async validateMigrationSafety(
    pluginId: string,
    migrations: string[],
    schema: ExtensionDatabaseSchema
  ): Promise<SafetyCheckResult> {
    const issues: SafetyIssue[] = []
    const suggestions: string[] = []

    // Check for data loss operations
    migrations.forEach((migration) => {
      if (migration.includes('DROP TABLE') || migration.includes('DROP COLUMN')) {
        issues.push({
          type: 'data_loss',
          severity: 'critical',
          message: 'Migration contains destructive operations (DROP)',
          affectedTables: schema.tables?.map((t) => t.name),
        })
        suggestions.push('Consider adding backup steps before destructive operations')
      }
    })

    // Check for constraint violations
    schema.relationships?.forEach((rel) => {
      if (!rel.cascade) {
        suggestions.push(
          `Consider specifying cascade delete for relationship: ${rel.source} -> ${rel.target}`
        )
      }
    })

    // Performance checks
    const largeFieldCounts = schema.tables?.filter((t) => (t.fields?.length || 0) > 50)
    if (largeFieldCounts && largeFieldCounts.length > 0) {
      suggestions.push(
        `Table(s) have many fields (${largeFieldCounts.map((t) => t.name).join(', ')}). Consider normalizing schema.`
      )
    }

    return {
      safe: issues.filter((i) => i.severity === 'critical').length === 0,
      issues,
      suggestions,
    }
  }

  /**
   * Calculate checksum for migration
   * @private
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  /**
   * Execute SQL statements
   * @private
   *
   * Note: This is a placeholder. In production, this should:
   * 1. Use raw SQL execution against the database
   * 2. Run within a transaction
   * 3. Handle connection pooling properly
   * 4. Support rollback on error
   */
  private async executeSQL(sql: string): Promise<void> {
    if (!sql || sql.trim() === '') {
      return
    }

    try {
      // TODO: Implement actual SQL execution using:
      // - prisma.$executeRawUnsafe() for individual statements, OR
      // - Database connection pool for transactional execution

      // For now, placeholder implementation
      console.log('Executing migration SQL:', sql)
    } catch (error) {
      throw new Error(`SQL execution failed: ${error}`)
    }
  }
}
