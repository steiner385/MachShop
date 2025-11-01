/**
 * Prisma Validation Extension
 * Extends ValidationService with database-backed foreign key and duplicate validation
 * Phase 2 Implementation: Foreign Key and Duplicate Validation with Caching
 */

import { PrismaClient } from '@prisma/client';
import {
  ValidationService,
  ValidationRule,
  ValidationType,
  Severity,
  EntityType,
  ValidationError
} from './ValidationService';

interface ForeignKeyLookupConfig {
  table: string;
  field: string;
  displayField?: string;
}

interface DuplicateCheckConfig {
  table: string;
  field: string;
  caseSensitive?: boolean;
}

/**
 * Extension class that adds Prisma-backed validation to ValidationService
 * Provides:
 * - Actual foreign key database lookups
 * - Duplicate detection against existing database records
 * - Batch foreign key verification
 * - Performance-optimized caching strategies
 */
export class PrismaValidationExtension {
  private prisma: PrismaClient;
  private foreignKeyCache: Map<string, boolean>;
  private duplicateCache: Map<string, boolean>;
  private readonly MAX_CACHE_SIZE = 100000;
  private readonly CACHE_TTL_MS = 3600000; // 1 hour
  private cacheTimestamp: Date = new Date();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.foreignKeyCache = new Map();
    this.duplicateCache = new Map();
  }

  /**
   * Validate foreign key against database
   * Uses cache for performance optimization
   */
  async validateForeignKeyExists(
    value: any,
    config: ForeignKeyLookupConfig,
    allowNull: boolean = false
  ): Promise<boolean> {
    // Handle null values
    if (value === null || value === undefined) {
      return allowNull;
    }

    // Check cache first
    const cacheKey = `fk:${config.table}:${config.field}:${value}`;
    if (this.foreignKeyCache.has(cacheKey)) {
      return this.foreignKeyCache.get(cacheKey)!;
    }

    try {
      // Get Prisma model name (convert table name to model name)
      const modelName = this.tableNameToModelName(config.table);
      const model = (this.prisma as any)[modelName];

      if (!model) {
        console.error(`Prisma model not found for table: ${config.table}`);
        return true; // Assume valid if model not found
      }

      // Query database
      const exists = await model.findUnique({
        where: { [config.field]: this.parseValue(value) },
        select: { [config.field]: true }
      });

      const result = !!exists;

      // Cache the result
      this.foreignKeyCache.set(cacheKey, result);
      this.manageCacheSize();

      return result;
    } catch (error) {
      console.error(`Error validating foreign key:`, error);
      // Assume valid on error to not block import
      return true;
    }
  }

  /**
   * Check for duplicates within database
   * Returns true if duplicate exists, false if unique
   */
  async checkDuplicateExists(
    value: any,
    config: DuplicateCheckConfig,
    excludeId?: string
  ): Promise<boolean> {
    if (value === null || value === undefined) {
      return false; // Null is not a duplicate
    }

    // Check cache
    const cacheKey = `dup:${config.table}:${config.field}:${value}:${excludeId || ''}`;
    if (this.duplicateCache.has(cacheKey)) {
      return this.duplicateCache.get(cacheKey)!;
    }

    try {
      const modelName = this.tableNameToModelName(config.table);
      const model = (this.prisma as any)[modelName];

      if (!model) {
        return false;
      }

      const where: any = config.caseSensitive !== false
        ? { [config.field]: value }
        : { [config.field]: { equals: value, mode: 'insensitive' } };

      // Exclude current record if ID provided
      if (excludeId) {
        where.NOT = { id: excludeId };
      }

      const duplicate = await model.findFirst({ where });

      const result = !!duplicate;
      this.duplicateCache.set(cacheKey, result);
      this.manageCacheSize();

      return result;
    } catch (error) {
      console.error(`Error checking duplicate:`, error);
      return false;
    }
  }

  /**
   * Batch check foreign keys
   * More efficient than individual checks for multiple values
   */
  async checkForeignKeysBatch(
    values: any[],
    config: ForeignKeyLookupConfig
  ): Promise<Map<any, boolean>> {
    const result = new Map<any, boolean>();

    try {
      const modelName = this.tableNameToModelName(config.table);
      const model = (this.prisma as any)[modelName];

      if (!model) {
        // Return all as valid if model not found
        values.forEach(v => result.set(v, true));
        return result;
      }

      // Check cache first
      const uncachedValues = values.filter(v => {
        const cacheKey = `fk:${config.table}:${config.field}:${v}`;
        if (this.foreignKeyCache.has(cacheKey)) {
          result.set(v, this.foreignKeyCache.get(cacheKey)!);
          return false;
        }
        return true;
      });

      if (uncachedValues.length === 0) {
        return result;
      }

      // Query all at once
      const existing = await model.findMany({
        where: {
          [config.field]: { in: uncachedValues.map(v => this.parseValue(v)) }
        },
        select: { [config.field]: true }
      });

      const existingSet = new Set(existing.map(e => String(e[config.field])));

      // Cache and populate results
      uncachedValues.forEach(v => {
        const exists = existingSet.has(String(v));
        const cacheKey = `fk:${config.table}:${config.field}:${v}`;
        this.foreignKeyCache.set(cacheKey, exists);
        result.set(v, exists);
      });

      this.manageCacheSize();
    } catch (error) {
      console.error(`Error in batch foreign key check:`, error);
      // Return all as valid on error
      values.forEach(v => result.set(v, true));
    }

    return result;
  }

  /**
   * Find similar records for fuzzy matching
   * Useful for suggesting corrections to invalid foreign keys
   */
  async findSimilarRecords(
    value: string,
    config: ForeignKeyLookupConfig,
    limit: number = 5
  ): Promise<any[]> {
    try {
      const modelName = this.tableNameToModelName(config.table);
      const model = (this.prisma as any)[modelName];

      if (!model) {
        return [];
      }

      // Find records that start with the value (simple similarity)
      const displayField = config.displayField || config.field;
      const similar = await model.findMany({
        where: {
          [displayField]: { startsWith: value, mode: 'insensitive' }
        },
        select: { [config.field]: true, [displayField]: true },
        take: limit
      });

      return similar;
    } catch (error) {
      console.error(`Error finding similar records:`, error);
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    foreignKeyCache: { size: number; maxSize: number };
    duplicateCache: { size: number; maxSize: number };
  } {
    return {
      foreignKeyCache: {
        size: this.foreignKeyCache.size,
        maxSize: this.MAX_CACHE_SIZE
      },
      duplicateCache: {
        size: this.duplicateCache.size,
        maxSize: this.MAX_CACHE_SIZE
      }
    };
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.foreignKeyCache.clear();
    this.duplicateCache.clear();
    this.cacheTimestamp = new Date();
  }

  /**
   * Clear old cache entries if TTL expired
   */
  private manageCacheSize(): void {
    const now = new Date();

    // Clear if over max size
    if (this.foreignKeyCache.size > this.MAX_CACHE_SIZE) {
      this.foreignKeyCache.clear();
    }

    if (this.duplicateCache.size > this.MAX_CACHE_SIZE) {
      this.duplicateCache.clear();
    }

    // Clear if TTL expired
    if (now.getTime() - this.cacheTimestamp.getTime() > this.CACHE_TTL_MS) {
      this.foreignKeyCache.clear();
      this.duplicateCache.clear();
      this.cacheTimestamp = now;
    }
  }

  /**
   * Convert table name to Prisma model name
   * Handles common naming conversions:
   * - parts -> Part
   * - bom_items -> BOMItem
   * - work_orders -> WorkOrder
   */
  private tableNameToModelName(tableName: string): string {
    // Map common table names to model names
    const tableToModelMap: Record<string, string> = {
      'parts': 'Part',
      'bom_items': 'BOMItem',
      'work_orders': 'WorkOrder',
      'material_lots': 'MaterialLot',
      'operations': 'Operation',
      'equipment': 'Equipment',
      'users': 'User',
      'work_centers': 'WorkCenter',
      'routings': 'Routing',
      'sites': 'Site',
      'enterprises': 'Enterprise'
    };

    return tableToModelMap[tableName.toLowerCase()] || this.pascalCase(tableName);
  }

  /**
   * Convert snake_case to PascalCase
   */
  private pascalCase(str: string): string {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Parse value based on type
   */
  private parseValue(value: any): any {
    // Convert string UUIDs and numeric IDs
    if (typeof value === 'string') {
      // Check if it's a number string
      if (/^\d+$/.test(value)) {
        return parseInt(value, 10);
      }
      // Return as-is for UUIDs and other strings
      return value;
    }
    return value;
  }

  /**
   * Validate multiple records for duplicates in batch
   * Returns map of record indices to duplicate status
   */
  async checkDuplicatesInBatch(
    records: any[],
    fieldName: string,
    tableName: string,
    caseSensitive: boolean = false
  ): Promise<Map<number, boolean>> {
    const result = new Map<number, boolean>();

    if (records.length === 0) {
      return result;
    }

    try {
      const modelName = this.tableNameToModelName(tableName);
      const model = (this.prisma as any)[modelName];

      if (!model) {
        return result;
      }

      // Extract values and their indices
      const valueIndexMap = new Map<string, number[]>();
      records.forEach((record, index) => {
        const value = record[fieldName];
        if (value !== null && value !== undefined) {
          const key = caseSensitive ? String(value) : String(value).toLowerCase();
          if (!valueIndexMap.has(key)) {
            valueIndexMap.set(key, []);
          }
          valueIndexMap.get(key)!.push(index);
        }
      });

      // Check for duplicates in batch query
      const uniqueValues = Array.from(valueIndexMap.keys());
      const where: any = caseSensitive !== false
        ? { [fieldName]: { in: uniqueValues } }
        : {
          [fieldName]: {
            in: uniqueValues,
            mode: 'insensitive'
          }
        };

      const duplicates = await model.findMany({
        where,
        select: { [fieldName]: true }
      });

      const duplicateValues = new Set(duplicates.map(d => String(d[fieldName]).toLowerCase()));

      // Mark records as duplicates if they have duplicates in DB
      valueIndexMap.forEach((indices, value) => {
        const isDuplicate = duplicateValues.has(value.toLowerCase());
        indices.forEach(index => {
          result.set(index, isDuplicate);
        });
      });
    } catch (error) {
      console.error(`Error checking duplicates in batch:`, error);
    }

    return result;
  }
}

/**
 * Create enhanced validation context with Prisma support
 */
export function createPrismaValidationContext(
  prisma: PrismaClient,
  validationService: ValidationService
): PrismaValidationExtension {
  return new PrismaValidationExtension(prisma);
}
