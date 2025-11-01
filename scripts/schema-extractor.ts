/**
 * Automated Schema Extraction and Documentation Generator
 * Issue #167: SDK & Extensibility: Automated Data Dictionary & CI/CD Integration
 *
 * This script extracts the Prisma schema and generates comprehensive documentation
 * including field mappings, relationships, and validation rules.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface FieldMetadata {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  default?: any;
  description?: string;
  validation?: string[];
}

interface ModelMetadata {
  name: string;
  pluralName: string;
  description?: string;
  fields: FieldMetadata[];
  relationships: string[];
  indexes?: string[];
}

interface SchemaMetadata {
  version: string;
  lastUpdated: string;
  models: ModelMetadata[];
  enums: Record<string, string[]>;
}

class SchemaExtractor {
  private schemaPath: string;
  private outputDir: string;
  private metadata: SchemaMetadata;

  constructor(schemaPath = './prisma/schema.prisma', outputDir = './docs/generated') {
    this.schemaPath = schemaPath;
    this.outputDir = outputDir;
    this.metadata = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      models: [],
      enums: {},
    };
  }

  /**
   * Extract schema information from Prisma schema file
   */
  public extractSchema(): SchemaMetadata {
    console.log(`📖 Extracting schema from ${this.schemaPath}...`);

    if (!fs.existsSync(this.schemaPath)) {
      throw new Error(`Schema file not found: ${this.schemaPath}`);
    }

    const schemaContent = fs.readFileSync(this.schemaPath, 'utf-8');

    // Extract models
    this.extractModels(schemaContent);

    // Extract enums
    this.extractEnums(schemaContent);

    this.metadata.lastUpdated = new Date().toISOString();

    console.log(`✅ Schema extraction complete`);
    console.log(`   - Models: ${this.metadata.models.length}`);
    console.log(`   - Enums: ${Object.keys(this.metadata.enums).length}`);

    return this.metadata;
  }

  /**
   * Extract model definitions from schema
   */
  private extractModels(schemaContent: string): void {
    // Match all model blocks: model ModelName { ... }
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];

      const model: ModelMetadata = {
        name: modelName,
        pluralName: this.pluralize(modelName),
        fields: [],
        relationships: [],
      };

      // Extract fields
      this.extractFields(modelBody, model);

      // Extract relationships
      this.extractRelationships(modelBody, model);

      this.metadata.models.push(model);
    }
  }

  /**
   * Extract field definitions from a model body
   */
  private extractFields(modelBody: string, model: ModelMetadata): void {
    // Match field lines (excluding comments and relationships)
    const fieldRegex = /^\s*(\w+)\s+(\w+[\?\[\]]*)\s*(@.*)?$/gm;
    let match;

    while ((match = fieldRegex.exec(modelBody)) !== null) {
      const fieldName = match[1];
      const fieldType = match[2];
      const attributes = match[3] || '';

      // Skip if it's a relation (contains @relation)
      if (attributes.includes('@relation')) {
        continue;
      }

      // Skip if it's an ID or internal field
      if (fieldName === 'id' && attributes.includes('@id')) {
        continue;
      }

      const field: FieldMetadata = {
        name: fieldName,
        type: fieldType,
        required: !fieldType.endsWith('?'),
      };

      // Extract attributes
      if (attributes.includes('@unique')) {
        field.unique = true;
      }

      if (attributes.includes('@default')) {
        const defaultMatch = /@default\(([^)]+)\)/.exec(attributes);
        if (defaultMatch) {
          field.default = defaultMatch[1];
        }
      }

      // Add field map for database column mapping
      if (attributes.includes('@map')) {
        const mapMatch = /@map\("([^"]+)"\)/.exec(attributes);
        if (mapMatch) {
          field.description = `Maps to database column: ${mapMatch[1]}`;
        }
      }

      model.fields.push(field);
    }
  }

  /**
   * Extract relationship fields from a model body
   */
  private extractRelationships(modelBody: string, model: ModelMetadata): void {
    // Match relationship lines (fields with @relation)
    const relationRegex = /^\s*(\w+)\s+(\w+[\?\[\]]*)\s+@relation\([^)]*\)/gm;
    let match;

    while ((match = relationRegex.exec(modelBody)) !== null) {
      const relationName = match[1];
      const relationType = match[2];

      model.relationships.push(`${relationName}: ${relationType}`);
    }
  }

  /**
   * Extract enum definitions from schema
   */
  private extractEnums(schemaContent: string): void {
    // Match all enum blocks: enum EnumName { ... }
    const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = enumRegex.exec(schemaContent)) !== null) {
      const enumName = match[1];
      const enumBody = match[2];

      // Extract enum values
      const values: string[] = [];
      const valueRegex = /^\s*(\w+)/gm;
      let valueMatch;

      while ((valueMatch = valueRegex.exec(enumBody)) !== null) {
        values.push(valueMatch[1]);
      }

      this.metadata.enums[enumName] = values;
    }
  }

  /**
   * Generate markdown documentation from extracted metadata
   */
  public generateDocumentation(): string {
    console.log('📝 Generating documentation...');

    const lines: string[] = [
      '# Automated Database Schema Documentation',
      '',
      `**Generated**: ${new Date().toISOString()}`,
      `**Version**: ${this.metadata.version}`,
      '',
      '## Table of Contents',
      '1. [Models](#models)',
      '2. [Enums](#enums)',
      '3. [Field Reference](#field-reference)',
      '',
      '---',
      '',
      '## Models',
      '',
    ];

    // Document each model
    for (const model of this.metadata.models) {
      lines.push(`### ${model.name}`);
      lines.push(`**Plural**: ${model.pluralName}`);
      lines.push('');
      lines.push('**Fields**:');
      lines.push('');
      lines.push('| Field | Type | Required | Notes |');
      lines.push('|-------|------|----------|-------|');

      for (const field of model.fields) {
        const required = field.required ? '✓' : '✗';
        const notes = field.description || (field.unique ? 'Unique' : '');
        lines.push(
          `| ${field.name} | \`${field.type}\` | ${required} | ${notes} |`
        );
      }

      if (model.relationships.length > 0) {
        lines.push('');
        lines.push('**Relationships**:');
        lines.push('');
        for (const rel of model.relationships) {
          lines.push(`- ${rel}`);
        }
      }

      lines.push('');
    }

    // Document enums
    if (Object.keys(this.metadata.enums).length > 0) {
      lines.push('---');
      lines.push('');
      lines.push('## Enums');
      lines.push('');

      for (const [enumName, values] of Object.entries(this.metadata.enums)) {
        lines.push(`### ${enumName}`);
        lines.push('');
        for (const value of values) {
          lines.push(`- \`${value}\``);
        }
        lines.push('');
      }
    }

    // Field reference
    lines.push('---');
    lines.push('');
    lines.push('## Field Reference');
    lines.push('');

    const fieldMap = new Map<string, string[]>();
    for (const model of this.metadata.models) {
      for (const field of model.fields) {
        const key = field.type;
        if (!fieldMap.has(key)) {
          fieldMap.set(key, []);
        }
        fieldMap.get(key)!.push(`${model.name}.${field.name}`);
      }
    }

    for (const [type, fields] of Array.from(fieldMap.entries()).sort()) {
      lines.push(`**${type}**:`);
      lines.push(fields.map(f => `- ${f}`).join('\n'));
      lines.push('');
    }

    const documentation = lines.join('\n');

    console.log('✅ Documentation generated');

    return documentation;
  }

  /**
   * Save extracted metadata to JSON file
   */
  public saveMetadata(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const metadataPath = path.join(this.outputDir, 'schema-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(this.metadata, null, 2));

    console.log(`💾 Metadata saved to ${metadataPath}`);
  }

  /**
   * Save generated documentation to markdown file
   */
  public saveDocumentation(documentation: string): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const docPath = path.join(this.outputDir, 'SCHEMA_DOCUMENTATION.md');
    fs.writeFileSync(docPath, documentation);

    console.log(`📄 Documentation saved to ${docPath}`);
  }

  /**
   * Generate Entity Relationship Diagram (ERD) in Mermaid format
   */
  public generateERD(): string {
    console.log('🔗 Generating Entity Relationship Diagram...');

    const lines: string[] = [
      'erDiagram',
      '',
    ];

    // Add entities
    for (const model of this.metadata.models) {
      lines.push(`    ${model.name} {`);
      for (const field of model.fields) {
        const type = field.required ? `${field.type} pk` : field.type;
        lines.push(`        ${type} ${field.name}`);
      }
      lines.push('    }');
    }

    lines.push('');

    // Add relationships (simple representation)
    const relationships = new Set<string>();
    for (const model of this.metadata.models) {
      for (const rel of model.relationships) {
        relationships.add(`${model.name} ||--|| ${rel}`);
      }
    }

    for (const rel of relationships) {
      lines.push(rel);
    }

    const erd = lines.join('\n');

    console.log('✅ ERD generated');

    return erd;
  }

  /**
   * Save ERD to file
   */
  public saveERD(erd: string): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const erdPath = path.join(this.outputDir, 'schema-erd.mmd');
    fs.writeFileSync(erdPath, erd);

    console.log(`📊 ERD saved to ${erdPath}`);
  }

  /**
   * Run complete extraction and documentation pipeline
   */
  public async run(): Promise<void> {
    try {
      // Extract schema
      this.extractSchema();

      // Save metadata
      this.saveMetadata();

      // Generate and save documentation
      const documentation = this.generateDocumentation();
      this.saveDocumentation(documentation);

      // Generate and save ERD
      const erd = this.generateERD();
      this.saveERD(erd);

      console.log('');
      console.log('✨ Schema extraction and documentation complete!');
      console.log('');
      console.log('Generated files:');
      console.log(`  - ${path.join(this.outputDir, 'schema-metadata.json')}`);
      console.log(`  - ${path.join(this.outputDir, 'SCHEMA_DOCUMENTATION.md')}`);
      console.log(`  - ${path.join(this.outputDir, 'schema-erd.mmd')}`);
    } catch (error) {
      console.error('❌ Error during schema extraction:', error);
      process.exit(1);
    }
  }

  /**
   * Simple pluralization utility
   */
  private pluralize(word: string): string {
    if (word.endsWith('y')) {
      return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z')) {
      return word + 'es';
    }
    return word + 's';
  }
}

// Run if executed directly
if (require.main === module) {
  const extractor = new SchemaExtractor();
  extractor.run();
}

export { SchemaExtractor, SchemaMetadata, ModelMetadata };
