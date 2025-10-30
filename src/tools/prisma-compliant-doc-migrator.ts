#!/usr/bin/env node

/**
 * Prisma-Compliant Documentation Migrator
 * Migrates external JSON documentation into Prisma schema using only valid Prisma syntax
 */

import * as fs from 'fs';
import * as path from 'path';

interface ExternalTableDoc {
  description: string;
  businessPurpose: string;
  dataOwner: string;
  updateFrequency: string;
  complianceNotes: string;
  integrations: string[];
  dataRetention?: string;
  securityClassification?: string;
  examples: Array<{
    scenario: string;
    sampleData: any;
    explanation: string;
  }>;
  relatedTables?: string[];
  commonQueries?: string[];
}

interface ExternalFieldDoc {
  description: string;
  businessRule: string;
  dataSource: string;
  format?: string;
  examples?: string[];
  validation?: string;
  privacy?: string;
  integrationMapping?: Record<string, string>;
  businessImpact?: string;
  validValues?: string[];
  auditTrail?: string;
  complianceNotes?: string;
  retention?: string;
}

interface PrismaModel {
  name: string;
  startLine: number;
  endLine: number;
  fields: PrismaField[];
  content: string;
}

interface PrismaField {
  name: string;
  type: string;
  lineNumber: number;
  attributes: string[];
  content: string;
}

export class PrismaCompliantDocMigrator {
  private schemaPath: string;
  private docsPath: string;
  private outputPath: string;
  private externalDocs: {
    tables: Record<string, ExternalTableDoc>;
    fields: Record<string, Record<string, ExternalFieldDoc>>;
  };
  private schemaLines: string[];

  constructor(schemaPath: string, docsPath: string, outputPath?: string) {
    this.schemaPath = schemaPath;
    this.docsPath = docsPath;
    this.outputPath = outputPath || schemaPath.replace('.prisma', '.documented.prisma');
    this.externalDocs = { tables: {}, fields: {} };
    this.schemaLines = [];
  }

  /**
   * Main migration process
   */
  async migrate(): Promise<void> {
    console.log('🔄 Starting Prisma-Compliant Documentation Migration\n');

    // Load external documentation
    await this.loadExternalDocumentation();

    // Parse Prisma schema
    await this.parseSchema();

    // Generate documented schema
    await this.generateDocumentedSchema();

    console.log('✅ Migration completed successfully!');
    console.log(`📄 Documented schema saved to: ${this.outputPath}`);
  }

  /**
   * Load external documentation files
   */
  private async loadExternalDocumentation(): Promise<void> {
    console.log('📚 Loading external documentation...');

    try {
      // Load table descriptions
      const tableDescPath = path.join(this.docsPath, 'table-descriptions.json');
      if (fs.existsSync(tableDescPath)) {
        const tableData = JSON.parse(fs.readFileSync(tableDescPath, 'utf8'));
        this.externalDocs.tables = tableData;
        console.log(`   ✓ Loaded table descriptions for ${Object.keys(tableData).length} tables`);
      }

      // Load field descriptions
      const fieldDescPath = path.join(this.docsPath, 'field-descriptions.json');
      if (fs.existsSync(fieldDescPath)) {
        const fieldData = JSON.parse(fs.readFileSync(fieldDescPath, 'utf8'));
        this.externalDocs.fields = fieldData;
        const totalFields = Object.values(fieldData).reduce((sum, table: any) => sum + Object.keys(table).length, 0);
        console.log(`   ✓ Loaded field descriptions for ${totalFields} fields across ${Object.keys(fieldData).length} tables`);
      }

    } catch (error) {
      console.error('❌ Error loading external documentation:', error);
      throw error;
    }
  }

  /**
   * Parse Prisma schema file
   */
  private async parseSchema(): Promise<void> {
    console.log('📖 Parsing Prisma schema...');

    try {
      const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
      this.schemaLines = schemaContent.split('\n');
      console.log(`   ✓ Loaded schema with ${this.schemaLines.length} lines`);
    } catch (error) {
      console.error('❌ Error reading schema file:', error);
      throw error;
    }
  }

  /**
   * Generate documented schema with Prisma-compliant comments
   */
  private async generateDocumentedSchema(): Promise<void> {
    console.log('📝 Generating documented schema...');

    const models = this.extractModels();
    const documentedLines = [...this.schemaLines];

    let linesAdded = 0;

    for (const model of models) {
      const tableDoc = this.externalDocs.tables[model.name];
      const fieldDocs = this.externalDocs.fields[model.name] || {};

      if (tableDoc || Object.keys(fieldDocs).length > 0) {
        // Add table documentation before model
        if (tableDoc) {
          const tableComments = this.generateTableComments(tableDoc);
          const insertPosition = model.startLine + linesAdded;

          // Insert table comments before model declaration
          documentedLines.splice(insertPosition, 0, ...tableComments);
          linesAdded += tableComments.length;
        }

        // Add field documentation
        for (const field of model.fields) {
          const fieldDoc = fieldDocs[field.name];
          if (fieldDoc) {
            const fieldComments = this.generateFieldComments(fieldDoc);
            const insertPosition = field.lineNumber + linesAdded;

            // Insert field comments before field declaration
            documentedLines.splice(insertPosition, 0, ...fieldComments);
            linesAdded += fieldComments.length;
          }
        }
      }
    }

    // Write documented schema
    const documentedContent = documentedLines.join('\n');
    fs.writeFileSync(this.outputPath, documentedContent, 'utf8');

    console.log(`   ✓ Added documentation for ${models.filter(m => this.externalDocs.tables[m.name]).length} tables`);
    console.log(`   ✓ Added documentation for ${this.getTotalDocumentedFields()} fields`);
  }

  /**
   * Extract models from schema
   */
  private extractModels(): PrismaModel[] {
    const models: PrismaModel[] = [];
    let currentModel: PrismaModel | null = null;
    let inModel = false;
    let braceCount = 0;

    for (let i = 0; i < this.schemaLines.length; i++) {
      const line = this.schemaLines[i].trim();

      // Start of model
      if (line.startsWith('model ') && !inModel) {
        const modelName = line.split(' ')[1];
        currentModel = {
          name: modelName,
          startLine: i,
          endLine: 0,
          fields: [],
          content: ''
        };
        inModel = true;
        braceCount = 0;
      }

      if (inModel && currentModel) {
        // Track braces to find model end
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        // Parse fields within model
        if (braceCount > 0 && !line.startsWith('model') && !line.startsWith('///') && !line.startsWith('//') && line.includes(' ')) {
          const fieldMatch = line.match(/^\s*(\w+)\s+(\w+.*?)(?:\s|$)/);
          if (fieldMatch) {
            const [, fieldName, fieldType] = fieldMatch;
            const attributes = this.extractAttributes(line);

            currentModel.fields.push({
              name: fieldName,
              type: fieldType,
              lineNumber: i,
              attributes,
              content: line
            });
          }
        }

        // End of model
        if (braceCount === 0 && line.includes('}')) {
          currentModel.endLine = i;
          currentModel.content = this.schemaLines.slice(currentModel.startLine, i + 1).join('\n');
          models.push(currentModel);
          inModel = false;
          currentModel = null;
        }
      }
    }

    return models;
  }

  /**
   * Extract field attributes
   */
  private extractAttributes(line: string): string[] {
    const attributes: string[] = [];
    const attrMatches = line.match(/@\w+(\([^)]*\))?/g);
    if (attrMatches) {
      attributes.push(...attrMatches);
    }
    return attributes;
  }

  /**
   * Generate table-level comments using only Prisma-compliant syntax
   */
  private generateTableComments(tableDoc: ExternalTableDoc): string[] {
    const comments: string[] = [];

    // Primary description
    comments.push(`/// ${tableDoc.description}`);
    comments.push('///');

    // Business annotations
    comments.push(`/// **Business Purpose:** ${tableDoc.businessPurpose}`);
    comments.push(`/// **Data Owner:** ${tableDoc.dataOwner}`);
    comments.push(`/// **Update Frequency:** ${tableDoc.updateFrequency}`);

    if (tableDoc.complianceNotes) {
      comments.push(`/// **Compliance:** ${tableDoc.complianceNotes}`);
    }

    if (tableDoc.dataRetention) {
      comments.push(`/// **Data Retention:** ${tableDoc.dataRetention}`);
    }

    if (tableDoc.securityClassification) {
      comments.push(`/// **Security:** ${tableDoc.securityClassification}`);
    }

    if (tableDoc.integrations && tableDoc.integrations.length > 0) {
      comments.push(`/// **Integrations:** ${tableDoc.integrations.join(', ')}`);
    }

    if (tableDoc.relatedTables && tableDoc.relatedTables.length > 0) {
      comments.push(`/// **Related Tables:** ${tableDoc.relatedTables.join(', ')}`);
    }

    // Add examples
    if (tableDoc.examples && tableDoc.examples.length > 0) {
      comments.push('///');
      comments.push('/// **Examples:**');
      tableDoc.examples.forEach(example => {
        comments.push(`/// - ${example.scenario}: ${example.explanation}`);
      });
    }

    // Add common queries
    if (tableDoc.commonQueries && tableDoc.commonQueries.length > 0) {
      comments.push('///');
      comments.push('/// **Common Queries:**');
      tableDoc.commonQueries.forEach(query => {
        comments.push(`/// - ${query}`);
      });
    }

    comments.push('///');

    return comments;
  }

  /**
   * Generate field-level comments using only Prisma-compliant syntax
   */
  private generateFieldComments(fieldDoc: ExternalFieldDoc): string[] {
    const comments: string[] = [];

    // Primary description
    comments.push(`  /// ${fieldDoc.description}`);

    if (fieldDoc.businessRule) {
      comments.push(`  /// **Business Rule:** ${fieldDoc.businessRule}`);
    }

    if (fieldDoc.dataSource) {
      comments.push(`  /// **Data Source:** ${fieldDoc.dataSource}`);
    }

    if (fieldDoc.format) {
      comments.push(`  /// **Format:** ${fieldDoc.format}`);
    }

    if (fieldDoc.validation) {
      comments.push(`  /// **Validation:** ${fieldDoc.validation}`);
    }

    if (fieldDoc.businessImpact) {
      comments.push(`  /// **Business Impact:** ${fieldDoc.businessImpact}`);
    }

    if (fieldDoc.privacy) {
      comments.push(`  /// **Privacy:** ${fieldDoc.privacy}`);
    }

    if (fieldDoc.auditTrail) {
      comments.push(`  /// **Audit Trail:** ${fieldDoc.auditTrail}`);
    }

    if (fieldDoc.complianceNotes) {
      comments.push(`  /// **Compliance:** ${fieldDoc.complianceNotes}`);
    }

    // Add valid values
    if (fieldDoc.validValues && fieldDoc.validValues.length > 0) {
      comments.push('  /// **Valid Values:**');
      fieldDoc.validValues.forEach(value => {
        comments.push(`  /// - ${value}`);
      });
    }

    // Add examples
    if (fieldDoc.examples && fieldDoc.examples.length > 0) {
      comments.push('  /// **Examples:**');
      fieldDoc.examples.forEach(example => {
        comments.push(`  /// - ${example}`);
      });
    }

    // Add integration mapping
    if (fieldDoc.integrationMapping && Object.keys(fieldDoc.integrationMapping).length > 0) {
      comments.push('  /// **Integration Mapping:**');
      Object.entries(fieldDoc.integrationMapping).forEach(([system, field]) => {
        comments.push(`  /// - ${system}: ${field}`);
      });
    }

    return comments;
  }

  /**
   * Get total number of documented fields
   */
  private getTotalDocumentedFields(): number {
    return Object.values(this.externalDocs.fields)
      .reduce((sum, table) => sum + Object.keys(table).length, 0);
  }
}

/**
 * CLI Entry Point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const schemaPath = args[0] || './prisma/schema.prisma';
  const docsPath = args[1] || './docs/schema-documentation';
  const outputPath = args[2];

  console.log('🚀 Prisma-Compliant Documentation Migration Tool\n');
  console.log(`📄 Schema: ${schemaPath}`);
  console.log(`📚 External docs: ${docsPath}`);
  console.log(`💾 Output: ${outputPath || schemaPath.replace('.prisma', '.documented.prisma')}\n`);

  try {
    const migrator = new PrismaCompliantDocMigrator(schemaPath, docsPath, outputPath);
    await migrator.migrate();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default PrismaCompliantDocMigrator;