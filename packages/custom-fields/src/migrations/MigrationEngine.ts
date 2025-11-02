/**
 * Migration Engine
 * Handles database migrations for custom fields with Prisma integration
 */

import {
  FieldMigration,
  MigrationResult,
  MigrationStatus,
  MigrationValidationResult,
  ValidationError,
  CustomFieldMetadata,
  FieldStorageConfig,
  MigrationPlan,
  RollbackPlan,
} from '../types';
import { DataTypeMapper } from '../mapping/DataTypeMapper';

/**
 * Migration engine for executing and managing database migrations
 */
export class MigrationEngine {
  private migrations: Map<string, FieldMigration> = new Map();
  private executionHistory: FieldMigration[] = [];
  private rollbackHistory: Map<string, FieldMigration> = new Map();

  /**
   * Create a new field migration
   */
  public createMigration(
    fieldName: string,
    upSql: string,
    downSql: string,
    description?: string
  ): FieldMigration {
    const migration: FieldMigration = {
      id: `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: fieldName,
      description,
      status: MigrationStatus.DRAFT,
      upSql,
      downSql,
      createdBy: 'system',
      createdAt: new Date(),
      version: 1,
    };

    this.migrations.set(migration.id, migration);
    return migration;
  }

  /**
   * Generate migration SQL for adding a custom field
   */
  public generateAddFieldMigration(
    tableName: string,
    field: CustomFieldMetadata
  ): { upSql: string; downSql: string } {
    // Validate field configuration
    const typeErrors = DataTypeMapper.validateTypeMapping(field);
    if (typeErrors.length > 0) {
      throw new Error(`Invalid field configuration: ${typeErrors[0].message}`);
    }

    // Generate ADD COLUMN SQL
    const columnDef = DataTypeMapper.generateColumnDefinition(field);
    const upSql = `ALTER TABLE ${tableName} ADD COLUMN ${columnDef};`;

    // Generate DROP COLUMN SQL for rollback
    const downSql = `ALTER TABLE ${tableName} DROP COLUMN ${field.name};`;

    return { upSql, downSql };
  }

  /**
   * Generate migration SQL for modifying a field
   */
  public generateModifyFieldMigration(
    tableName: string,
    oldField: CustomFieldMetadata,
    newField: CustomFieldMetadata
  ): { upSql: string; downSql: string } {
    const upSqls: string[] = [];
    const downSqls: string[] = [];

    // Name change
    if (oldField.name !== newField.name) {
      upSqls.push(`ALTER TABLE ${tableName} RENAME COLUMN ${oldField.name} TO ${newField.name};`);
      downSqls.unshift(
        `ALTER TABLE ${tableName} RENAME COLUMN ${newField.name} TO ${oldField.name};`
      );
    }

    // Type change
    if (oldField.databaseType !== newField.databaseType) {
      // Validate type compatibility
      const typeErrors = DataTypeMapper.validateTypeTransition(
        oldField.databaseType,
        newField.databaseType
      );

      if (typeErrors.some((e) => e.severity === 'error')) {
        throw new Error(`Cannot change field type: ${typeErrors[0].message}`);
      }

      const newColumnDef = DataTypeMapper.generateColumnDefinition(newField);
      upSqls.push(`ALTER TABLE ${tableName} MODIFY COLUMN ${newColumnDef};`);

      const oldColumnDef = DataTypeMapper.generateColumnDefinition(oldField);
      downSqls.unshift(`ALTER TABLE ${tableName} MODIFY COLUMN ${oldColumnDef};`);
    }

    // Constraint changes
    if ((oldField.required ?? false) !== (newField.required ?? false)) {
      if (newField.required) {
        upSqls.push(`ALTER TABLE ${tableName} ADD CONSTRAINT ${newField.name}_not_null CHECK (${newField.name} IS NOT NULL);`);
        downSqls.unshift(
          `ALTER TABLE ${tableName} DROP CONSTRAINT ${newField.name}_not_null;`
        );
      } else {
        downSqls.unshift(
          `ALTER TABLE ${tableName} ADD CONSTRAINT ${newField.name}_not_null CHECK (${newField.name} IS NOT NULL);`
        );
        upSqls.push(
          `ALTER TABLE ${tableName} DROP CONSTRAINT ${newField.name}_not_null;`
        );
      }
    }

    return {
      upSql: upSqls.join('\n'),
      downSql: downSqls.join('\n'),
    };
  }

  /**
   * Generate migration SQL for removing a field
   */
  public generateDropFieldMigration(
    tableName: string,
    field: CustomFieldMetadata
  ): { upSql: string; downSql: string } {
    const upSql = `ALTER TABLE ${tableName} DROP COLUMN ${field.name};`;
    const columnDef = DataTypeMapper.generateColumnDefinition(field);
    const downSql = `ALTER TABLE ${tableName} ADD COLUMN ${columnDef};`;

    return { upSql, downSql };
  }

  /**
   * Generate migration SQL for adding an index
   */
  public generateIndexMigration(
    tableName: string,
    indexName: string,
    columns: string[],
    unique: boolean = false
  ): { upSql: string; downSql: string } {
    const uniqueKeyword = unique ? 'UNIQUE' : '';
    const upSql = `CREATE ${uniqueKeyword} INDEX ${indexName} ON ${tableName} (${columns.join(', ')});`;
    const downSql = `DROP INDEX ${indexName};`;

    return { upSql, downSql };
  }

  /**
   * Validate migration before execution
   */
  public validateMigration(migration: FieldMigration): MigrationValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check for empty SQL
    if (!migration.upSql || migration.upSql.trim().length === 0) {
      errors.push({
        code: 'EMPTY_MIGRATION_SQL',
        message: 'Migration has no SQL to execute',
        severity: 'error',
      });
    }

    // Check for dangerous operations
    if (migration.upSql.toUpperCase().includes('DROP DATABASE')) {
      errors.push({
        code: 'DANGEROUS_OPERATION',
        message: 'Migration contains DROP DATABASE operation',
        severity: 'error',
      });
    }

    if (migration.upSql.toUpperCase().includes('TRUNCATE')) {
      warnings.push('Migration contains TRUNCATE operation - data will be lost');
    }

    // Check rollback SQL
    if (!migration.downSql || migration.downSql.trim().length === 0) {
      warnings.push('Migration has no rollback SQL defined');
    }

    // Validate SQL syntax (basic check)
    if (!this.validateSqlSyntax(migration.upSql)) {
      errors.push({
        code: 'INVALID_SQL_SYNTAX',
        message: 'Migration SQL has syntax errors',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Execute migration
   */
  public async executeMigration(migration: FieldMigration): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      // Validate migration
      const validation = this.validateMigration(migration);
      if (!validation.isValid) {
        return {
          migrationId: migration.id,
          status: MigrationStatus.FAILED,
          success: false,
          executionTimeMs: Date.now() - startTime,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Migration validation failed',
            details: validation.errors,
          },
          rollbackAvailable: false,
        };
      }

      // Update migration status
      migration.status = MigrationStatus.IN_PROGRESS;
      this.migrations.set(migration.id, migration);

      // Execute migration (in real implementation, this would execute against actual database)
      // For now, we simulate successful execution
      await this.simulateExecution(migration.upSql);

      // Mark as successful
      migration.status = MigrationStatus.SUCCESS;
      migration.appliedAt = new Date();
      migration.appliedBy = 'system';
      this.migrations.set(migration.id, migration);
      this.executionHistory.push(migration);

      return {
        migrationId: migration.id,
        status: MigrationStatus.SUCCESS,
        success: true,
        executionTimeMs: Date.now() - startTime,
        rollbackAvailable: true,
        rollbackSql: migration.downSql,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      migration.status = MigrationStatus.FAILED;
      migration.error = {
        code: 'EXECUTION_FAILED',
        message: errorMessage,
      };
      this.migrations.set(migration.id, migration);

      return {
        migrationId: migration.id,
        status: MigrationStatus.FAILED,
        success: false,
        executionTimeMs: Date.now() - startTime,
        error: {
          code: 'EXECUTION_FAILED',
          message: errorMessage,
        },
        rollbackAvailable: false,
      };
    }
  }

  /**
   * Rollback migration
   */
  public async rollbackMigration(migrationId: string): Promise<MigrationResult> {
    const startTime = Date.now();
    const migration = this.migrations.get(migrationId);

    if (!migration) {
      return {
        migrationId,
        status: MigrationStatus.FAILED,
        success: false,
        executionTimeMs: Date.now() - startTime,
        error: {
          code: 'MIGRATION_NOT_FOUND',
          message: `Migration ${migrationId} not found`,
        },
        rollbackAvailable: false,
      };
    }

    if (migration.status !== MigrationStatus.SUCCESS) {
      return {
        migrationId,
        status: MigrationStatus.FAILED,
        success: false,
        executionTimeMs: Date.now() - startTime,
        error: {
          code: 'CANNOT_ROLLBACK',
          message: `Cannot rollback migration with status ${migration.status}`,
        },
        rollbackAvailable: false,
      };
    }

    try {
      // Execute rollback SQL
      await this.simulateExecution(migration.downSql);

      // Update migration status
      migration.status = MigrationStatus.ROLLED_BACK;
      migration.rollbackAt = new Date();
      migration.rollbackBy = 'system';
      this.migrations.set(migrationId, migration);
      this.rollbackHistory.set(migrationId, migration);

      return {
        migrationId,
        status: MigrationStatus.ROLLED_BACK,
        success: true,
        executionTimeMs: Date.now() - startTime,
        rollbackAvailable: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      migration.error = {
        code: 'ROLLBACK_FAILED',
        message: errorMessage,
      };

      return {
        migrationId,
        status: MigrationStatus.FAILED,
        success: false,
        executionTimeMs: Date.now() - startTime,
        error: {
          code: 'ROLLBACK_FAILED',
          message: errorMessage,
        },
        rollbackAvailable: true,
      };
    }
  }

  /**
   * Get migration by ID
   */
  public getMigration(migrationId: string): FieldMigration | undefined {
    return this.migrations.get(migrationId);
  }

  /**
   * Get execution history
   */
  public getExecutionHistory(): FieldMigration[] {
    return [...this.executionHistory];
  }

  /**
   * Get rollback history
   */
  public getRollbackHistory(): FieldMigration[] {
    return Array.from(this.rollbackHistory.values());
  }

  /**
   * Get pending migrations
   */
  public getPendingMigrations(): FieldMigration[] {
    return Array.from(this.migrations.values()).filter((m) => m.status === MigrationStatus.DRAFT);
  }

  /**
   * Get failed migrations
   */
  public getFailedMigrations(): FieldMigration[] {
    return Array.from(this.migrations.values()).filter((m) => m.status === MigrationStatus.FAILED);
  }

  /**
   * Validate SQL syntax (basic check)
   */
  private validateSqlSyntax(sql: string): boolean {
    if (!sql || sql.trim().length === 0) {
      return false;
    }

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of sql) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) return false;
    }

    if (parenCount !== 0) return false;

    // Check for common SQL keywords
    const upperSql = sql.toUpperCase();
    const hasValidKeyword =
      upperSql.includes('ALTER') ||
      upperSql.includes('CREATE') ||
      upperSql.includes('DROP') ||
      upperSql.includes('MODIFY');

    return hasValidKeyword;
  }

  /**
   * Simulate SQL execution (for testing purposes)
   */
  private async simulateExecution(sql: string): Promise<void> {
    // In a real implementation, this would execute against the database
    // For now, we just validate and simulate
    if (!this.validateSqlSyntax(sql)) {
      throw new Error('Invalid SQL syntax');
    }

    // Simulate network/execution delay
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
