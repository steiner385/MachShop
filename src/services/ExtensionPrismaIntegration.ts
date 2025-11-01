/**
 * Extension Prisma ORM Integration
 *
 * Provides type-safe access to custom extension entities
 * for the Extension Schema Framework (Issue #438)
 */

import { PrismaClient } from '@prisma/client'
import {
  ExtensionDatabaseSchema,
  PrismaSchemaResult,
  PrismaModel,
  PrismaField,
} from '../types/extensionSchema'

/**
 * Extension entity query builder interface
 */
export interface ExtensionEntityQuery {
  where?: Record<string, any>
  select?: Record<string, any>
  include?: Record<string, any>
  orderBy?: Record<string, any>
  skip?: number
  take?: number
}

/**
 * Extension entity result
 */
export interface ExtensionEntityResult {
  success: boolean
  data?: any[]
  count?: number
  error?: string
}

/**
 * Extension Prisma ORM Integration
 *
 * Manages dynamic Prisma schema updates and type-safe queries for custom entities
 */
export class ExtensionPrismaIntegration {
  private prisma: PrismaClient
  private generatedModels: Map<string, PrismaModel> = new Map()
  private prismaSchemaCache: string | null = null
  private clientReady: boolean = true

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Register extension models with Prisma
   *
   * @param schema - Extension schema with tables/models
   * @returns Updated Prisma schema string
   */
  async registerExtensionModels(schema: ExtensionDatabaseSchema): Promise<string> {
    try {
      // Generate Prisma schema from extension tables
      const prismaSchema = this.generatePrismaSchema(schema)

      // Cache the schema
      this.prismaSchemaCache = prismaSchema

      // Store generated models for later use
      schema.tables?.forEach((table) => {
        const modelName = this.formatTableName(table.name)
        this.generatedModels.set(modelName, {
          name: modelName,
          fields: (table.fields || []).map((field) => ({
            name: field.name,
            type: this.mapFieldType(field.type),
            isList: false,
            isRequired: field.required,
            hasDefaultValue: field.default !== undefined,
            default: field.default,
            isId: field.name === 'id',
            isUnique: field.unique || false,
          })),
        })
      })

      // Note: In a real implementation, this would trigger Prisma client regeneration
      // For now, we track that models have been registered
      await this.invalidatePrismaClient()

      return prismaSchema
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to register extension models: ${message}`)
    }
  }

  /**
   * Generate Prisma schema from extension schema
   * @private
   */
  private generatePrismaSchema(schema: ExtensionDatabaseSchema): string {
    let schemaStr = ''

    // Generate enums
    schema.enums?.forEach((enumDef) => {
      schemaStr += `enum ${enumDef.name} {\n`
      enumDef.values.forEach((value) => {
        schemaStr += `  ${value}\n`
      })
      schemaStr += '}\n\n'
    })

    // Generate models
    schema.tables?.forEach((table) => {
      const modelName = this.formatTableName(table.name)
      schemaStr += `model ${modelName} {\n`

      // Add id field
      schemaStr += `  id String @id @default(cuid())\n`

      // Add user fields
      table.fields?.forEach((field) => {
        const prismaType = this.mapFieldType(field.type)
        const required = field.required ? '' : '?'
        const modifiers: string[] = []

        if (field.default !== undefined) {
          const defaultValue = this.formatPrismaDefault(field.default, field.type)
          modifiers.push(`@default(${defaultValue})`)
        }

        if (field.unique) {
          modifiers.push('@unique')
        }

        const modifierStr = modifiers.length > 0 ? ` ${modifiers.join(' ')}` : ''
        schemaStr += `  ${field.name} ${prismaType}${required}${modifierStr}\n`
      })

      // Add timestamps
      if (table.timestamps?.createdAt !== false) {
        schemaStr += `  createdAt DateTime @default(now())\n`
      }
      if (table.timestamps?.updatedAt !== false) {
        schemaStr += `  updatedAt DateTime @updatedAt\n`
      }

      // Add table name mapping
      schemaStr += `\n  @@map("${table.namespace}_${table.name}")\n`
      schemaStr += '}\n\n'
    })

    return schemaStr
  }

  /**
   * Query custom extension entity
   *
   * @param modelName - Name of the custom model
   * @param query - Query parameters
   * @returns Entity result
   */
  async queryEntity(modelName: string, query: ExtensionEntityQuery): Promise<ExtensionEntityResult> {
    try {
      if (!this.generatedModels.has(modelName)) {
        return {
          success: false,
          error: `Model "${modelName}" not found in registered extensions`,
        }
      }

      // Build query options
      const queryOptions: any = {}

      if (query.where) {
        queryOptions.where = query.where
      }

      if (query.select) {
        queryOptions.select = query.select
      }

      if (query.include) {
        queryOptions.include = query.include
      }

      if (query.orderBy) {
        queryOptions.orderBy = query.orderBy
      }

      if (query.skip !== undefined) {
        queryOptions.skip = query.skip
      }

      if (query.take !== undefined) {
        queryOptions.take = query.take
      }

      // Execute query using Prisma's dynamic querying
      // Note: This uses dynamic property access which requires runtime model registration
      const data = await (this.prisma as any)[modelName].findMany(queryOptions)

      return {
        success: true,
        data,
        count: data.length,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: `Query execution failed: ${message}`,
      }
    }
  }

  /**
   * Create custom extension entity
   *
   * @param modelName - Name of the custom model
   * @param data - Entity data
   * @returns Created entity or error
   */
  async createEntity(modelName: string, data: Record<string, any>): Promise<ExtensionEntityResult> {
    try {
      if (!this.generatedModels.has(modelName)) {
        return {
          success: false,
          error: `Model "${modelName}" not found in registered extensions`,
        }
      }

      const entity = await (this.prisma as any)[modelName].create({
        data,
      })

      return {
        success: true,
        data: [entity],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: `Failed to create entity: ${message}`,
      }
    }
  }

  /**
   * Update custom extension entity
   *
   * @param modelName - Name of the custom model
   * @param id - Entity ID
   * @param data - Update data
   * @returns Updated entity or error
   */
  async updateEntity(
    modelName: string,
    id: string,
    data: Record<string, any>
  ): Promise<ExtensionEntityResult> {
    try {
      if (!this.generatedModels.has(modelName)) {
        return {
          success: false,
          error: `Model "${modelName}" not found in registered extensions`,
        }
      }

      const entity = await (this.prisma as any)[modelName].update({
        where: { id },
        data,
      })

      return {
        success: true,
        data: [entity],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: `Failed to update entity: ${message}`,
      }
    }
  }

  /**
   * Delete custom extension entity
   *
   * @param modelName - Name of the custom model
   * @param id - Entity ID
   * @returns Deletion result
   */
  async deleteEntity(modelName: string, id: string): Promise<ExtensionEntityResult> {
    try {
      if (!this.generatedModels.has(modelName)) {
        return {
          success: false,
          error: `Model "${modelName}" not found in registered extensions`,
        }
      }

      const entity = await (this.prisma as any)[modelName].delete({
        where: { id },
      })

      return {
        success: true,
        data: [entity],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: `Failed to delete entity: ${message}`,
      }
    }
  }

  /**
   * Count entities matching criteria
   *
   * @param modelName - Name of the custom model
   * @param where - Query criteria
   * @returns Count result
   */
  async countEntities(
    modelName: string,
    where?: Record<string, any>
  ): Promise<ExtensionEntityResult> {
    try {
      if (!this.generatedModels.has(modelName)) {
        return {
          success: false,
          error: `Model "${modelName}" not found in registered extensions`,
        }
      }

      const count = await (this.prisma as any)[modelName].count({
        where: where || {},
      })

      return {
        success: true,
        count,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: `Failed to count entities: ${message}`,
      }
    }
  }

  /**
   * Batch create entities
   *
   * @param modelName - Name of the custom model
   * @param records - Array of entities to create
   * @returns Creation results
   */
  async batchCreateEntities(
    modelName: string,
    records: Record<string, any>[]
  ): Promise<ExtensionEntityResult> {
    try {
      if (!this.generatedModels.has(modelName)) {
        return {
          success: false,
          error: `Model "${modelName}" not found in registered extensions`,
        }
      }

      const entities = await Promise.all(
        records.map((record) =>
          (this.prisma as any)[modelName].create({
            data: record,
          })
        )
      )

      return {
        success: true,
        data: entities,
        count: entities.length,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: `Batch creation failed: ${message}`,
      }
    }
  }

  /**
   * Batch update entities
   *
   * @param modelName - Name of the custom model
   * @param updates - Array of {id, data} objects
   * @returns Update results
   */
  async batchUpdateEntities(
    modelName: string,
    updates: Array<{ id: string; data: Record<string, any> }>
  ): Promise<ExtensionEntityResult> {
    try {
      if (!this.generatedModels.has(modelName)) {
        return {
          success: false,
          error: `Model "${modelName}" not found in registered extensions`,
        }
      }

      const entities = await Promise.all(
        updates.map(({ id, data }) =>
          (this.prisma as any)[modelName].update({
            where: { id },
            data,
          })
        )
      )

      return {
        success: true,
        data: entities,
        count: entities.length,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        error: `Batch update failed: ${message}`,
      }
    }
  }

  /**
   * Get list of registered custom models
   */
  getRegisteredModels(): string[] {
    return Array.from(this.generatedModels.keys())
  }

  /**
   * Get model definition
   */
  getModelDefinition(modelName: string): PrismaModel | null {
    return this.generatedModels.get(modelName) || null
  }

  /**
   * Get all registered model definitions
   */
  getAllModelDefinitions(): PrismaModel[] {
    return Array.from(this.generatedModels.values())
  }

  /**
   * Get cached Prisma schema
   */
  getPrismaSchema(): string | null {
    return this.prismaSchemaCache
  }

  /**
   * Invalidate Prisma client (triggers regeneration)
   * @private
   */
  private async invalidatePrismaClient(): Promise<void> {
    // In a real implementation, this would:
    // 1. Regenerate Prisma client from updated schema
    // 2. Rebuild type definitions
    // 3. Restart the Prisma client connection
    //
    // For now, we mark the client as needing refresh
    this.clientReady = true
  }

  /**
   * Map extension field type to Prisma type
   * @private
   */
  private mapFieldType(type: string): string {
    const typeMap: Record<string, string> = {
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
   * Format Prisma default value
   * @private
   */
  private formatPrismaDefault(value: unknown, type: string): string {
    if (value === null || value === undefined) {
      return 'null'
    }

    if (type === 'String') {
      return `"${String(value)}"`
    }

    if (type === 'Boolean') {
      return value === true || value === 'true' ? 'true' : 'false'
    }

    if (type === 'DateTime') {
      return 'now()'
    }

    return String(value)
  }

  /**
   * Format table name for Prisma model
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
