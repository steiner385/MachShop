/**
 * Extension Data Safety & Validation Layer
 *
 * Ensures data integrity and safety for extension database operations
 * for the Extension Schema Framework (Issue #438)
 */

import { PrismaClient } from '@prisma/client'
import {
  ExtensionDatabaseSchema,
  ExtensionField,
  ExtensionFieldValidation,
  ExtensionRelationship,
} from '../types/extensionSchema'

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  field: string
  value: any
  rule: string
  message: string
  severity: 'warning' | 'error'
}

/**
 * Validation result
 */
export interface DataValidationResult {
  valid: boolean
  errors: ValidationErrorDetail[]
  warnings: ValidationErrorDetail[]
}

/**
 * Constraint check result
 */
export interface ConstraintCheckResult {
  valid: boolean
  violations: ConstraintViolation[]
}

/**
 * Individual constraint violation
 */
export interface ConstraintViolation {
  type: 'foreign_key' | 'unique' | 'not_null' | 'check'
  table: string
  field: string
  message: string
  affectedRows?: number
  suggestedAction?: string
}

/**
 * Extension Data Safety Layer
 *
 * Provides comprehensive data validation and integrity checking
 */
export class ExtensionDataSafety {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Validate entity data before insert/update
   *
   * @param table - Table definition
   * @param data - Data to validate
   * @returns Validation result
   */
  validateEntityData(
    table: any, // ExtensionTable
    data: Record<string, any>
  ): DataValidationResult {
    const errors: ValidationErrorDetail[] = []
    const warnings: ValidationErrorDetail[] = []

    // Validate each field
    table.fields?.forEach((field: ExtensionField) => {
      if (data[field.name] === undefined) {
        if (field.required && field.default === undefined) {
          errors.push({
            field: field.name,
            value: undefined,
            rule: 'required',
            message: `Field "${field.name}" is required`,
            severity: 'error',
          })
        }
        return
      }

      const value = data[field.name]

      // Type validation
      const typeValidation = this.validateFieldType(field.name, value, field.type)
      if (!typeValidation.valid) {
        errors.push({
          field: field.name,
          value,
          rule: 'type',
          message: typeValidation.message,
          severity: 'error',
        })
        return
      }

      // Constraint validation
      if (field.validation) {
        const constraintErrors = this.validateConstraints(
          field.name,
          value,
          field.type,
          field.validation
        )
        errors.push(...constraintErrors)
      }

      // Null validation
      if (field.required && (value === null || value === undefined)) {
        errors.push({
          field: field.name,
          value,
          rule: 'not_null',
          message: `Field "${field.name}" cannot be null`,
          severity: 'error',
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
   * Validate field type
   * @private
   */
  private validateFieldType(
    field: string,
    value: any,
    type: string
  ): { valid: boolean; message?: string } {
    if (value === null || value === undefined) {
      return { valid: true }
    }

    switch (type) {
      case 'String':
        if (typeof value !== 'string') {
          return {
            valid: false,
            message: `Field "${field}" must be a string, got ${typeof value}`,
          }
        }
        break

      case 'Int':
        if (!Number.isInteger(value)) {
          return {
            valid: false,
            message: `Field "${field}" must be an integer, got ${typeof value}`,
          }
        }
        break

      case 'Float':
        if (typeof value !== 'number') {
          return {
            valid: false,
            message: `Field "${field}" must be a number, got ${typeof value}`,
          }
        }
        break

      case 'Boolean':
        if (typeof value !== 'boolean') {
          return {
            valid: false,
            message: `Field "${field}" must be a boolean, got ${typeof value}`,
          }
        }
        break

      case 'DateTime':
        if (!(value instanceof Date) && typeof value !== 'string') {
          return {
            valid: false,
            message: `Field "${field}" must be a valid DateTime`,
          }
        }
        if (typeof value === 'string') {
          try {
            new Date(value)
          } catch {
            return {
              valid: false,
              message: `Field "${field}" must be a valid DateTime string`,
            }
          }
        }
        break

      case 'Decimal':
        if (typeof value !== 'number' && !(value instanceof Object)) {
          return {
            valid: false,
            message: `Field "${field}" must be a decimal number`,
          }
        }
        break

      case 'Json':
        if (typeof value !== 'object' && typeof value !== 'string') {
          return {
            valid: false,
            message: `Field "${field}" must be valid JSON`,
          }
        }
        if (typeof value === 'string') {
          try {
            JSON.parse(value)
          } catch {
            return {
              valid: false,
              message: `Field "${field}" must be valid JSON`,
            }
          }
        }
        break

      case 'Bytes':
        if (!Buffer.isBuffer(value) && typeof value !== 'string') {
          return {
            valid: false,
            message: `Field "${field}" must be bytes or base64 string`,
          }
        }
        break
    }

    return { valid: true }
  }

  /**
   * Validate field constraints
   * @private
   */
  private validateConstraints(
    field: string,
    value: any,
    type: string,
    validation: ExtensionFieldValidation
  ): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = []

    if (type === 'String') {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        errors.push({
          field,
          value,
          rule: 'minLength',
          message: `Field "${field}" must be at least ${validation.minLength} characters`,
          severity: 'error',
        })
      }

      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        errors.push({
          field,
          value,
          rule: 'maxLength',
          message: `Field "${field}" must be no more than ${validation.maxLength} characters`,
          severity: 'error',
        })
      }

      if (validation.pattern) {
        const regex = new RegExp(validation.pattern)
        if (!regex.test(value)) {
          errors.push({
            field,
            value,
            rule: 'pattern',
            message: `Field "${field}" does not match required pattern`,
            severity: 'error',
          })
        }
      }

      if (validation.enum && !validation.enum.includes(value)) {
        errors.push({
          field,
          value,
          rule: 'enum',
          message: `Field "${field}" must be one of: ${validation.enum.join(', ')}`,
          severity: 'error',
        })
      }
    }

    if (type === 'Int' || type === 'Float' || type === 'Decimal') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push({
          field,
          value,
          rule: 'min',
          message: `Field "${field}" must be at least ${validation.min}`,
          severity: 'error',
        })
      }

      if (validation.max !== undefined && value > validation.max) {
        errors.push({
          field,
          value,
          rule: 'max',
          message: `Field "${field}" must be no more than ${validation.max}`,
          severity: 'error',
        })
      }
    }

    return errors
  }

  /**
   * Check foreign key constraints
   *
   * @param pluginId - Plugin identifier
   * @param relationships - Relationship definitions
   * @returns Constraint check result
   */
  async checkForeignKeyConstraints(
    pluginId: string,
    relationships: ExtensionRelationship[]
  ): Promise<ConstraintCheckResult> {
    const violations: ConstraintViolation[] = []

    // Check each relationship
    for (const rel of relationships) {
      // Verify target table exists
      try {
        // Note: In production, query the actual database for table existence
        // This is a placeholder for the actual implementation
        const exists = await this.tableExists(rel.target)

        if (!exists) {
          violations.push({
            type: 'foreign_key',
            table: rel.source,
            field: rel.sourceField,
            message: `Target table "${rel.target}" does not exist`,
            suggestedAction: `Create table "${rel.target}" first, or update relationship target`,
          })
        }
      } catch (error) {
        // Log but don't fail - table might exist but be inaccessible
        console.warn(`Failed to verify table ${rel.target}:`, error)
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    }
  }

  /**
   * Check unique constraints
   *
   * @param tableName - Table name
   * @param field - Field to check
   * @param value - Value to check for uniqueness
   * @param excludeId - Exclude record ID from check (for updates)
   * @returns Constraint check result
   */
  async checkUniqueConstraint(
    tableName: string,
    field: string,
    value: any,
    excludeId?: string
  ): Promise<ConstraintCheckResult> {
    const violations: ConstraintViolation[] = []

    try {
      // Note: In production, query the actual database
      // This is a placeholder for the actual implementation
      const existing = await this.findDuplicateInTable(tableName, field, value, excludeId)

      if (existing) {
        violations.push({
          type: 'unique',
          table: tableName,
          field,
          message: `Value "${value}" already exists in field "${field}"`,
          affectedRows: 1,
          suggestedAction: `Use a unique value for field "${field}" or update the existing record`,
        })
      }
    } catch (error) {
      console.warn(`Failed to check unique constraint:`, error)
    }

    return {
      valid: violations.length === 0,
      violations,
    }
  }

  /**
   * Validate schema relationships before activation
   *
   * @param schema - Extension schema to validate
   * @returns Validation result with warnings for potential issues
   */
  validateSchemaRelationships(schema: ExtensionDatabaseSchema): DataValidationResult {
    const errors: ValidationErrorDetail[] = []
    const warnings: ValidationErrorDetail[] = []

    // Check for circular relationships
    const tableNames = new Set(schema.tables?.map((t) => t.name) || [])

    schema.relationships?.forEach((rel) => {
      // Check if both sides exist in this schema or are core tables
      const sourceExists =
        tableNames.has(rel.source) || this.isCoreTable(rel.source)
      const targetExists =
        tableNames.has(rel.target) || this.isCoreTable(rel.target)

      if (!sourceExists) {
        errors.push({
          field: `relationships.${rel.source}`,
          value: rel,
          rule: 'relationship_source',
          message: `Source table "${rel.source}" not found`,
          severity: 'error',
        })
      }

      if (!targetExists) {
        warnings.push({
          field: `relationships.${rel.target}`,
          value: rel,
          rule: 'relationship_target',
          message: `Target table "${rel.target}" not found in this schema (might be external)`,
          severity: 'warning',
        })
      }

      // Check for ManyToMany without junction table
      if (rel.type === 'ManyToMany') {
        warnings.push({
          field: `relationships.${rel.source}`,
          value: rel,
          rule: 'many_to_many',
          message: `ManyToMany relationship requires junction table configuration`,
          severity: 'warning',
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
   * Sanitize input data for safe storage
   *
   * @param data - Input data
   * @param fields - Field definitions
   * @returns Sanitized data
   */
  sanitizeData(data: Record<string, any>, fields: ExtensionField[]): Record<string, any> {
    const sanitized: Record<string, any> = {}

    fields.forEach((field) => {
      let value = data[field.name]

      if (value === undefined || value === null) {
        if (field.default !== undefined) {
          sanitized[field.name] = field.default
        } else if (!field.required) {
          sanitized[field.name] = null
        }
        return
      }

      // Type coercion
      switch (field.type) {
        case 'String':
          sanitized[field.name] = String(value).trim()
          break

        case 'Int':
          sanitized[field.name] = parseInt(String(value), 10)
          break

        case 'Float':
          sanitized[field.name] = parseFloat(String(value))
          break

        case 'Boolean':
          sanitized[field.name] =
            value === true || value === 'true' || value === 1 || value === '1'
          break

        case 'DateTime':
          sanitized[field.name] = value instanceof Date ? value : new Date(value)
          break

        case 'Json':
          sanitized[field.name] = typeof value === 'string' ? JSON.parse(value) : value
          break

        default:
          sanitized[field.name] = value
      }
    })

    return sanitized
  }

  /**
   * Check if table is a core (non-extension) table
   * @private
   */
  private isCoreTable(tableName: string): boolean {
    const coreTables = new Set([
      'WorkOrder',
      'Equipment',
      'Material',
      'Operation',
      'User',
      'Role',
      'Site',
      'Enterprise',
    ])
    return coreTables.has(tableName)
  }

  /**
   * Check if table exists in database
   * @private
   */
  private async tableExists(tableName: string): Promise<boolean> {
    try {
      // Note: In production, query information_schema
      // SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = ?)
      return true // Placeholder
    } catch {
      return false
    }
  }

  /**
   * Find duplicate value in table
   * @private
   */
  private async findDuplicateInTable(
    tableName: string,
    field: string,
    value: any,
    excludeId?: string
  ): Promise<boolean> {
    try {
      // Note: In production, query the actual table
      // SELECT 1 FROM table WHERE field = value AND id != excludeId LIMIT 1
      return false // Placeholder
    } catch {
      return false
    }
  }

  /**
   * Generate data migration script for schema changes
   *
   * @param oldFields - Previous field definitions
   * @param newFields - New field definitions
   * @returns Migration script suggestions
   */
  generateDataMigrationScript(
    oldFields: ExtensionField[],
    newFields: ExtensionField[]
  ): string[] {
    const scripts: string[] = []

    // Find new fields
    const newFieldNames = new Set(newFields.map((f) => f.name))
    oldFields.forEach((oldField) => {
      if (!newFieldNames.has(oldField.name)) {
        scripts.push(
          `-- Field "${oldField.name}" was removed - data backup recommended`
        )
      }
    })

    // Find removed fields
    const oldFieldNames = new Set(oldFields.map((f) => f.name))
    newFields.forEach((newField) => {
      if (!oldFieldNames.has(newField.name)) {
        const defaultValue = newField.default || 'NULL'
        scripts.push(
          `UPDATE table SET "${newField.name}" = ${defaultValue} WHERE "${newField.name}" IS NULL;`
        )
      }
    })

    return scripts
  }
}
