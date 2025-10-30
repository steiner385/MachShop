/**
 * Metadata Extractor
 * Simple utility to extract basic metadata from Prisma schema file
 * This is a fallback approach when DMMF is not available
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  SchemaMetadata,
  ModelMetadata,
  FieldMetadata,
  EnumMetadata,
  RelationshipMetadata
} from './types/schema-metadata';

export class MetadataExtractor {
  private schemaContent: string;
  private schemaPath: string;

  constructor(schemaPath: string = './prisma/schema.prisma') {
    this.schemaPath = path.resolve(schemaPath);
  }

  /**
   * Load and parse Prisma schema file
   */
  async loadSchema(): Promise<void> {
    try {
      this.schemaContent = await fs.promises.readFile(this.schemaPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to load schema file: ${this.schemaPath}. Error: ${error}`);
    }
  }

  /**
   * Extract comprehensive metadata from schema
   */
  async extractMetadata(): Promise<SchemaMetadata> {
    if (!this.schemaContent) {
      await this.loadSchema();
    }

    const models = this.extractModels();
    const enums = this.extractEnums();
    const generators = this.extractGenerators();
    const datasource = this.extractDatasource();

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
   * Extract all models from schema
   */
  private extractModels(): ModelMetadata[] {
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    const models: ModelMetadata[] = [];
    let match;

    while ((match = modelRegex.exec(this.schemaContent)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];
      const modelMetadata = this.parseModel(modelName, modelBody);
      models.push(modelMetadata);
    }

    return models;
  }

  /**
   * Parse individual model
   */
  private parseModel(name: string, body: string): ModelMetadata {
    const fields = this.extractFields(body);
    const relationships = this.extractModelRelationships(fields);

    // Extract documentation comment if it exists (appears before the model)
    const modelPosition = this.schemaContent.indexOf(`model ${name}`);
    const precedingContent = this.schemaContent.substring(Math.max(0, modelPosition - 500), modelPosition);
    const documentation = this.extractDocumentation(precedingContent);

    return {
      name,
      fields,
      relationships,
      documentation,
      category: this.categorizeModel(name),
      isJunctionTable: this.isJunctionTable(fields),
      primaryKey: this.extractPrimaryKey(fields),
      uniqueFields: this.extractUniqueConstraints(body),
      indices: this.extractIndices(body),
      businessRules: this.extractBusinessRules(documentation),
      createdAt: fields.find(f => f.name === 'createdAt') ? 'createdAt' : undefined,
      updatedAt: fields.find(f => f.name === 'updatedAt') ? 'updatedAt' : undefined
    };
  }

  /**
   * Extract fields from model body
   */
  private extractFields(modelBody: string): FieldMetadata[] {
    const lines = modelBody.split('\n').map(line => line.trim()).filter(line => line);
    const fields: FieldMetadata[] = [];
    let pendingDocumentation: string[] = [];

    for (const line of lines) {
      // Handle documentation comments
      if (line.startsWith('///')) {
        pendingDocumentation.push(line.substring(3).trim());
        continue;
      }

      // Skip other comments, @@map directives, and other non-field lines
      if (line.startsWith('//') || line.startsWith('@@') || line.startsWith('*') || !line.includes(' ')) {
        continue;
      }

      const field = this.parseField(line);
      if (field) {
        // Add accumulated documentation to this field
        if (pendingDocumentation.length > 0) {
          field.documentation = pendingDocumentation.join('\n');
          pendingDocumentation = [];
        }
        fields.push(field);
      }
    }

    return fields;
  }

  /**
   * Parse individual field line
   */
  private parseField(line: string): FieldMetadata | null {
    // Handle field documentation comments
    const docMatch = line.match(/\/\/\/\s*(.+)/);
    if (docMatch) {
      // This is a documentation line, we'll handle it in context
      return null;
    }

    // Basic field pattern: fieldName Type @attributes
    const fieldMatch = line.match(/^(\w+)\s+(\w+)(\[\])?\??(\s+@.+)?/);
    if (!fieldMatch) {
      return null;
    }

    const [, name, type, isList, attributes] = fieldMatch;
    const isOptional = line.includes('?') && !line.includes('??');
    const isId = attributes?.includes('@id') || false;
    const isUnique = attributes?.includes('@unique') || false;
    const hasDefault = attributes?.includes('@default') || false;

    // Extract default value
    let defaultValue: any = undefined;
    if (hasDefault) {
      const defaultMatch = attributes?.match(/@default\(([^)]+)\)/);
      if (defaultMatch) {
        defaultValue = this.parseDefaultValue(defaultMatch[1]);
      }
    }

    // Determine field kind
    const kind = this.determineFieldKind(type);

    // Extract relation information
    let relationName: string | undefined;
    let relationFromFields: string[] | undefined;
    let relationToFields: string[] | undefined;

    if (attributes?.includes('@relation')) {
      const relationMatch = attributes.match(/@relation\(([^)]+)\)/);
      if (relationMatch) {
        const relationArgs = relationMatch[1];
        const nameMatch = relationArgs.match(/name:\s*"([^"]+)"/);
        const fieldsMatch = relationArgs.match(/fields:\s*\[([^\]]+)\]/);
        const referencesMatch = relationArgs.match(/references:\s*\[([^\]]+)\]/);

        if (nameMatch) relationName = nameMatch[1];
        if (fieldsMatch) relationFromFields = fieldsMatch[1].split(',').map(f => f.trim().replace(/"/g, ''));
        if (referencesMatch) relationToFields = referencesMatch[1].split(',').map(f => f.trim().replace(/"/g, ''));
      }
    }

    return {
      name,
      type,
      kind,
      isList: !!isList,
      isOptional,
      isReadOnly: false, // Cannot determine from schema file
      hasDefaultValue: hasDefault,
      defaultValue,
      isGenerated: type === 'String' && hasDefault && defaultValue === 'cuid()',
      isId,
      isUnique,
      relationName,
      relationFromFields,
      relationToFields,
      constraints: []
    };
  }

  /**
   * Determine field kind based on type
   */
  private determineFieldKind(type: string): 'scalar' | 'object' | 'enum' | 'unsupported' {
    const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes'];

    if (scalarTypes.includes(type)) {
      return 'scalar';
    }

    // Check if it's an enum
    const enumExists = this.schemaContent.includes(`enum ${type}`);
    if (enumExists) {
      return 'enum';
    }

    // Check if it's a model reference
    const modelExists = this.schemaContent.includes(`model ${type}`);
    if (modelExists) {
      return 'object';
    }

    return 'unsupported';
  }

  /**
   * Parse default value
   */
  private parseDefaultValue(value: string): any {
    value = value.trim();

    if (value === 'true' || value === 'false') {
      return value === 'true';
    }

    if (value.match(/^\d+$/)) {
      return parseInt(value);
    }

    if (value.match(/^\d+\.\d+$/)) {
      return parseFloat(value);
    }

    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }

    // Functions like cuid(), now(), etc.
    if (value.includes('()')) {
      return value;
    }

    return value;
  }

  /**
   * Extract relationships from fields
   */
  private extractModelRelationships(fields: FieldMetadata[]): RelationshipMetadata[] {
    return fields
      .filter(field => field.kind === 'object')
      .map(field => {
        const relationType = field.isList ? 'one-to-many' : 'one-to-one';

        // Generate meaningful relationship description
        const description = this.generateRelationshipDescription(field, relationType);

        return {
          type: relationType,
          relatedModel: field.type,
          fieldName: field.name,
          isRequired: !field.isOptional,
          description: description
        };
      });
  }

  /**
   * Generate meaningful relationship descriptions
   */
  private generateRelationshipDescription(field: FieldMetadata, relationType: string): string {
    // Use existing documentation if available
    if (field.documentation && field.documentation.trim()) {
      return field.documentation;
    }

    // Generate description based on field name and relationship type
    const fieldName = field.name;
    const relatedModel = field.type;

    if (relationType === 'one-to-many') {
      // Convert fieldName to human readable (e.g., userSiteRoles -> user site roles)
      const humanFieldName = this.camelCaseToHumanReadable(fieldName);
      return `One ${relatedModel} can have multiple ${humanFieldName}`;
    } else {
      // one-to-one relationship
      const humanFieldName = this.camelCaseToHumanReadable(fieldName);
      return `References associated ${humanFieldName} record in ${relatedModel} table`;
    }
  }

  /**
   * Convert camelCase to human readable text
   */
  private camelCaseToHumanReadable(text: string): string {
    return text
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim()
      .replace(/^./, str => str.toUpperCase());
  }

  /**
   * Extract enums from schema
   */
  private extractEnums(): EnumMetadata[] {
    const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
    const enums: EnumMetadata[] = [];
    let match;

    while ((match = enumRegex.exec(this.schemaContent)) !== null) {
      const enumName = match[1];
      const enumBody = match[2];

      const values = enumBody
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(line => ({
          name: line,
          documentation: undefined
        }));

      enums.push({
        name: enumName,
        values,
        documentation: undefined
      });
    }

    return enums;
  }

  /**
   * Extract generators from schema
   */
  private extractGenerators(): any[] {
    const generatorRegex = /generator\s+(\w+)\s*\{([^}]+)\}/g;
    const generators: any[] = [];
    let match;

    while ((match = generatorRegex.exec(this.schemaContent)) !== null) {
      const name = match[1];
      const body = match[2];

      const providerMatch = body.match(/provider\s*=\s*"([^"]+)"/);
      const outputMatch = body.match(/output\s*=\s*"([^"]+)"/);

      generators.push({
        name,
        provider: providerMatch ? providerMatch[1] : 'unknown',
        output: outputMatch ? outputMatch[1] : undefined,
        config: {}
      });
    }

    return generators;
  }

  /**
   * Extract datasource from schema
   */
  private extractDatasource(): any {
    const datasourceMatch = this.schemaContent.match(/datasource\s+(\w+)\s*\{([^}]+)\}/);

    if (!datasourceMatch) {
      return { name: 'unknown', provider: 'unknown', url: 'unknown' };
    }

    const name = datasourceMatch[1];
    const body = datasourceMatch[2];

    const providerMatch = body.match(/provider\s*=\s*"([^"]+)"/);
    const urlMatch = body.match(/url\s*=\s*(.+)/);

    return {
      name,
      provider: providerMatch ? providerMatch[1] : 'unknown',
      url: urlMatch ? urlMatch[1].trim() : 'unknown'
    };
  }

  /**
   * Extract documentation from comments
   */
  private extractDocumentation(content: string): string | undefined {
    const docLines = content
      .split('\n')
      .filter(line => line.trim().startsWith('///'))
      .map(line => line.trim().replace(/^\/\/\/\s*/, ''));

    return docLines.length > 0 ? docLines.join('\n') : undefined;
  }

  /**
   * Extract business rules from documentation
   */
  private extractBusinessRules(documentation?: string): string[] | undefined {
    if (!documentation) return undefined;

    const rules = documentation
      .split('\n')
      .filter(line => line.includes('@business_rule:'))
      .map(line => line.replace('@business_rule:', '').trim());

    return rules.length > 0 ? rules : undefined;
  }

  /**
   * Categorize model based on name
   */
  private categorizeModel(modelName: string): string {
    const categories = {
      'Core Infrastructure': ['Enterprise', 'Site', 'Area', 'WorkCenter', 'Equipment'],
      'Personnel Management': ['User', 'PersonnelClass', 'UserSkill', 'UserCertification', 'UserSiteRole'],
      'Quality Management': ['QualityPlan', 'QualityMeasurement', 'NCR', 'AuditReport', 'QualityInspection'],
      'Production Management': ['WorkOrder', 'Operation', 'Routing', 'ProductionSchedule', 'RoutingStep', 'DispatchLog', 'ProductionVariance', 'ProcessDataCollection', 'ScheduleConstraint', 'ScheduleStateHistory', 'RoutingStepParameter', 'MaterialOperationSpecification', 'WorkUnit', 'PersonnelOperationSpecification', 'OperationGaugeRequirement', 'ProductionScheduleRequest', 'ProductionScheduleResponse', 'PhysicalAssetOperationSpecification'],
      'Material Management': ['Material', 'BOM', 'InventoryTransaction', 'Lot', 'PartNumber'],
      'Document Management': ['WorkInstruction', 'Document', 'DocumentRevision', 'DocumentComment'],
      'Security & Access': ['Role', 'Permission', 'SecurityEvent', 'PermissionUsageLog'],
      'Time Tracking': ['TimeEntry', 'TimeTrackingConfiguration', 'IndirectCostCode']
    };

    for (const [category, models] of Object.entries(categories)) {
      if (models.some(model => modelName.includes(model))) {
        return category;
      }
    }

    return 'Other';
  }

  /**
   * Check if model is a junction table
   */
  private isJunctionTable(fields: FieldMetadata[]): boolean {
    const relationFields = fields.filter(f => f.kind === 'object');
    const scalarFields = fields.filter(f =>
      f.kind === 'scalar' &&
      !f.isId &&
      !['createdAt', 'updatedAt'].includes(f.name)
    );

    return relationFields.length >= 2 && scalarFields.length <= 2;
  }

  /**
   * Extract primary key information
   */
  private extractPrimaryKey(fields: FieldMetadata[]): { fields: string[] } | undefined {
    const idFields = fields.filter(f => f.isId);
    return idFields.length > 0 ? { fields: idFields.map(f => f.name) } : undefined;
  }

  /**
   * Extract unique constraints
   */
  private extractUniqueConstraints(modelBody: string): Array<{ fields: string[] }> {
    const uniqueMatches = modelBody.match(/@@unique\(\[([^\]]+)\]/g);
    if (!uniqueMatches) return [];

    return uniqueMatches.map(match => {
      const fieldsMatch = match.match(/\[([^\]]+)\]/);
      if (fieldsMatch) {
        const fields = fieldsMatch[1].split(',').map(f => f.trim().replace(/"/g, ''));
        return { fields };
      }
      return { fields: [] };
    });
  }

  /**
   * Extract index information
   */
  private extractIndices(modelBody: string): Array<{ fields: string[] }> {
    const indexMatches = modelBody.match(/@@index\(\[([^\]]+)\]/g);
    if (!indexMatches) return [];

    return indexMatches.map(match => {
      const fieldsMatch = match.match(/\[([^\]]+)\]/);
      if (fieldsMatch) {
        const fields = fieldsMatch[1].split(',').map(f => f.trim().replace(/"/g, ''));
        return { fields };
      }
      return { fields: [] };
    });
  }

  /**
   * Export metadata to JSON file
   */
  async exportToFile(metadata: SchemaMetadata, outputPath: string): Promise<void> {
    const jsonData = JSON.stringify(metadata, null, 2);
    await fs.promises.writeFile(outputPath, jsonData, 'utf8');
    console.log(`✅ Schema metadata exported to: ${outputPath}`);
  }
}

export default MetadataExtractor;