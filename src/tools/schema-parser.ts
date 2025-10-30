/**
 * Prisma Schema Parser
 * Extracts comprehensive metadata from Prisma schema using DMMF (Data Model Meta Format)
 */

import { DMMF } from '@prisma/client/runtime/library';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  SchemaMetadata,
  ModelMetadata,
  FieldMetadata,
  RelationshipMetadata,
  EnumMetadata,
  FieldConstraint,
  BusinessRule,
  DataDictionaryConfig
} from './types/schema-metadata';

export class SchemaParser {
  private dmmf: DMMF.Document;
  private config: DataDictionaryConfig;

  constructor(config: Partial<DataDictionaryConfig> = {}) {
    this.config = {
      includeGeneratedFields: true,
      includeSystemTables: true,
      groupByCategory: true,
      includeBusinessRules: true,
      outputFormats: ['html', 'markdown', 'json'],
      customCategories: {
        'Core Infrastructure': ['Enterprise', 'Site', 'Area', 'WorkCenter', 'Equipment'],
        'Personnel Management': ['User', 'PersonnelClass', 'UserSkill', 'UserCertification'],
        'Quality Management': ['QualityPlan', 'QualityMeasurement', 'NCR', 'AuditReport'],
        'Production Management': ['WorkOrder', 'Operation', 'Routing', 'ProductionSchedule'],
        'Material Management': ['Material', 'BOM', 'InventoryTransaction', 'Lot'],
        'Document Management': ['WorkInstruction', 'Document', 'DocumentRevision']
      },
      ...config
    };
  }

  /**
   * Initialize parser with Prisma client
   */
  async initialize(): Promise<void> {
    try {
      const prisma = new PrismaClient();
      this.dmmf = Prisma.dmmf;
      await prisma.$disconnect();
    } catch (error) {
      console.error('Failed to initialize Prisma DMMF:', error);
      throw error;
    }
  }

  /**
   * Parse complete schema and return metadata
   */
  async parseSchema(): Promise<SchemaMetadata> {
    if (!this.dmmf) {
      await this.initialize();
    }

    const models = this.parseModels();
    const enums = this.parseEnums();
    const generators = this.parseGenerators();
    const datasource = this.parseDatasource();

    const totalFields = models.reduce((sum, model) => sum + model.fields.length, 0);
    const totalRelationships = models.reduce((sum, model) => sum + model.relationships.length, 0);

    return {
      models,
      enums,
      generators,
      datasource,
      generatedAt: new Date().toISOString(),
      totalModels: models.length,
      totalFields,
      totalRelationships
    };
  }

  /**
   * Parse all models from DMMF
   */
  private parseModels(): ModelMetadata[] {
    return this.dmmf.datamodel.models.map(model => this.parseModel(model));
  }

  /**
   * Parse individual model
   */
  private parseModel(model: DMMF.Model): ModelMetadata {
    const fields = model.fields.map(field => this.parseField(field, model));
    const relationships = this.extractRelationships(model);

    return {
      name: model.name,
      dbName: model.dbName || undefined,
      fields,
      primaryKey: model.primaryKey ? {
        name: model.primaryKey.name || undefined,
        fields: model.primaryKey.fields
      } : undefined,
      uniqueFields: model.uniqueFields.map(unique => ({
        name: unique.name || undefined,
        fields: unique.fields
      })),
      indices: [], // Note: DMMF doesn't expose indices directly
      documentation: model.documentation || undefined,
      businessRules: this.extractBusinessRules(model),
      category: this.categorizeModel(model.name),
      relationships,
      isJunctionTable: this.isJunctionTable(model),
      createdAt: this.extractTimestampField(fields, 'createdAt'),
      updatedAt: this.extractTimestampField(fields, 'updatedAt')
    };
  }

  /**
   * Parse individual field
   */
  private parseField(field: DMMF.Field, model: DMMF.Model): FieldMetadata {
    return {
      name: field.name,
      type: field.type,
      kind: field.kind,
      isList: field.isList,
      isOptional: field.isOptional,
      isReadOnly: field.isReadOnly,
      hasDefaultValue: field.hasDefaultValue,
      defaultValue: field.default,
      isGenerated: field.isGenerated,
      generationStrategy: field.isGenerated ? 'auto' : undefined,
      isId: field.isId,
      isUnique: field.isUnique,
      dbNames: field.dbNames,
      documentation: field.documentation || undefined,
      businessRule: this.extractFieldBusinessRule(field),
      constraints: this.extractFieldConstraints(field),
      relationName: field.relationName || undefined,
      relationFromFields: field.relationFromFields || undefined,
      relationToFields: field.relationToFields || undefined,
      relationOnDelete: field.relationOnDelete || undefined,
      relationOnUpdate: field.relationOnUpdate || undefined
    };
  }

  /**
   * Extract relationships from model
   */
  private extractRelationships(model: DMMF.Model): RelationshipMetadata[] {
    return model.fields
      .filter(field => field.kind === 'object')
      .map(field => {
        const relationType = this.determineRelationType(field, model);

        return {
          type: relationType,
          relatedModel: field.type,
          fieldName: field.name,
          isRequired: !field.isOptional,
          description: field.documentation || undefined,
          throughModel: this.findThroughModel(field, model)
        };
      });
  }

  /**
   * Determine relationship type
   */
  private determineRelationType(field: DMMF.Field, model: DMMF.Model): 'one-to-one' | 'one-to-many' | 'many-to-many' {
    if (field.isList) {
      // Check if it's many-to-many by looking for junction table pattern
      const hasJunctionTable = this.hasJunctionTablePattern(field, model);
      return hasJunctionTable ? 'many-to-many' : 'one-to-many';
    } else {
      // Check if the related model has a corresponding list field pointing back
      const relatedModel = this.dmmf.datamodel.models.find(m => m.name === field.type);
      if (relatedModel) {
        const backReference = relatedModel.fields.find(f =>
          f.kind === 'object' && f.type === model.name && f.isList
        );
        return backReference ? 'one-to-many' : 'one-to-one';
      }
      return 'one-to-one';
    }
  }

  /**
   * Parse enums from DMMF
   */
  private parseEnums(): EnumMetadata[] {
    return this.dmmf.datamodel.enums.map(enumDef => ({
      name: enumDef.name,
      values: enumDef.values.map(value => ({
        name: value.name,
        dbName: value.dbName || undefined,
        documentation: value.documentation || undefined
      })),
      documentation: enumDef.documentation || undefined,
      dbName: enumDef.dbName || undefined
    }));
  }

  /**
   * Parse generators (limited info available in DMMF)
   */
  private parseGenerators(): any[] {
    // Note: DMMF doesn't expose generator info, this would need to be parsed from schema file directly
    return [
      {
        name: 'client',
        provider: 'prisma-client-js',
        config: {}
      },
      {
        name: 'erd',
        provider: 'prisma-erd-generator',
        output: '../docs/erd.md',
        config: { theme: 'default' }
      }
    ];
  }

  /**
   * Parse datasource (limited info available in DMMF)
   */
  private parseDatasource(): any {
    // Note: DMMF doesn't expose full datasource info
    return {
      name: 'db',
      provider: 'postgresql',
      url: 'env("DATABASE_URL")'
    };
  }

  /**
   * Extract business rules from model documentation
   */
  private extractBusinessRules(model: DMMF.Model): string[] | undefined {
    if (!model.documentation) return undefined;

    const rules = [];
    const lines = model.documentation.split('\n');

    for (const line of lines) {
      if (line.includes('@business_rule:')) {
        rules.push(line.replace('@business_rule:', '').trim());
      }
    }

    return rules.length > 0 ? rules : undefined;
  }

  /**
   * Extract business rule from field documentation
   */
  private extractFieldBusinessRule(field: DMMF.Field): string | undefined {
    if (!field.documentation) return undefined;

    const match = field.documentation.match(/@business_rule:\s*(.+)/);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Extract field constraints from documentation
   */
  private extractFieldConstraints(field: DMMF.Field): FieldConstraint[] {
    const constraints: FieldConstraint[] = [];

    if (!field.documentation) return constraints;

    const lines = field.documentation.split('\n');
    for (const line of lines) {
      if (line.includes('@length:')) {
        const match = line.match(/@length:\s*(\d+)-(\d+)/);
        if (match) {
          constraints.push({
            type: 'length',
            value: { min: parseInt(match[1]), max: parseInt(match[2]) },
            description: `Length must be between ${match[1]} and ${match[2]} characters`
          });
        }
      }

      if (line.includes('@pattern:')) {
        const match = line.match(/@pattern:\s*(.+)/);
        if (match) {
          constraints.push({
            type: 'pattern',
            value: match[1].trim(),
            description: `Must match pattern: ${match[1].trim()}`
          });
        }
      }
    }

    return constraints;
  }

  /**
   * Categorize model based on name patterns
   */
  private categorizeModel(modelName: string): string | undefined {
    for (const [category, models] of Object.entries(this.config.customCategories)) {
      if (models.includes(modelName)) {
        return category;
      }
    }

    // Fallback categorization based on naming patterns
    if (['User', 'Role', 'Permission'].some(pattern => modelName.includes(pattern))) {
      return 'Security & Access Control';
    }

    if (['NCR', 'Quality', 'Audit', 'Inspection'].some(pattern => modelName.includes(pattern))) {
      return 'Quality Management';
    }

    if (['Work', 'Operation', 'Production', 'Schedule'].some(pattern => modelName.includes(pattern))) {
      return 'Production Management';
    }

    if (['Material', 'BOM', 'Inventory', 'Lot'].some(pattern => modelName.includes(pattern))) {
      return 'Material Management';
    }

    return 'Other';
  }

  /**
   * Check if model is a junction table (many-to-many relationship table)
   */
  private isJunctionTable(model: DMMF.Model): boolean {
    const relationFields = model.fields.filter(f => f.kind === 'object');
    const scalarFields = model.fields.filter(f => f.kind === 'scalar' && !f.isId && f.name !== 'createdAt' && f.name !== 'updatedAt');

    // Junction tables typically have 2+ foreign keys and few/no other fields
    return relationFields.length >= 2 && scalarFields.length <= 2;
  }

  /**
   * Extract timestamp field value
   */
  private extractTimestampField(fields: FieldMetadata[], fieldName: string): string | undefined {
    const field = fields.find(f => f.name === fieldName);
    return field ? fieldName : undefined;
  }

  /**
   * Check if relationship has junction table pattern
   */
  private hasJunctionTablePattern(field: DMMF.Field, model: DMMF.Model): boolean {
    // This is a simplified check - in reality, you'd need more sophisticated analysis
    return field.relationName ? field.relationName.includes('Junction') : false;
  }

  /**
   * Find through model for many-to-many relationships
   */
  private findThroughModel(field: DMMF.Field, model: DMMF.Model): string | undefined {
    // This would require more complex analysis of the relationship patterns
    // For now, return undefined
    return undefined;
  }

  /**
   * Export metadata to JSON file
   */
  async exportToFile(metadata: SchemaMetadata, outputPath: string): Promise<void> {
    const jsonData = JSON.stringify(metadata, null, 2);
    await fs.promises.writeFile(outputPath, jsonData, 'utf8');
    console.log(`✅ Schema metadata exported to: ${outputPath}`);
  }

  /**
   * Get category statistics
   */
  getCategoryStatistics(metadata: SchemaMetadata): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const model of metadata.models) {
      const category = model.category || 'Uncategorized';
      stats[category] = (stats[category] || 0) + 1;
    }

    return stats;
  }
}

// Export for use in other modules
export default SchemaParser;