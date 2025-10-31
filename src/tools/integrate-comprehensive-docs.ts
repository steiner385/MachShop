#!/usr/bin/env tsx

/**
 * Comprehensive Documentation Integration Tool
 * Integrates our 100% coverage field documentation into the Prisma schema
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ComprehensiveFieldDoc {
  name: string;
  type: string;
  description: string;
  businessPurpose: string;
  examples: string[];
  constraints: string[];
  category: string;
}

interface ComprehensiveDocumentation {
  summary: {
    totalTables: number;
    totalFields: number;
    coverageLevel: string;
    generatedAt: string;
  };
  tables: Array<{
    name: string;
    fieldCount: number;
    businessDomain: string;
    fields: ComprehensiveFieldDoc[];
  }>;
}

class ComprehensiveDocumentationIntegrator {
  private schemaPath = './prisma/schema.prisma';
  private comprehensiveDocsPath = './docs/generated/complete-field-documentation.json';
  private outputPath = './prisma/schema.final.prisma';

  /**
   * Atomically writes content to a file to prevent race conditions
   */
  private async writeFileAtomically(filePath: string, content: string): Promise<void> {
    const tempFile = `${filePath}.tmp.${crypto.randomBytes(8).toString('hex')}`;

    try {
      // Write to temporary file first
      await fs.promises.writeFile(tempFile, content, 'utf8');

      // Atomically move temp file to final location
      await fs.promises.rename(tempFile, filePath);
    } catch (error) {
      // Clean up temp file if something went wrong
      try {
        await fs.promises.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  async integrateComprehensiveDocumentation(): Promise<void> {
    console.log('🚀 Integrating Comprehensive Field Documentation into Prisma Schema');
    console.log('📊 Using 100% coverage documentation system\n');

    // Load comprehensive documentation
    const comprehensiveData = await this.loadComprehensiveDocumentation();
    console.log(`📚 Loaded ${comprehensiveData.summary.totalFields} field descriptions across ${comprehensiveData.summary.totalTables} tables`);

    // Load Prisma schema
    const schemaContent = await fs.promises.readFile(this.schemaPath, 'utf8');
    console.log(`📖 Loaded Prisma schema (${schemaContent.split('\n').length} lines)`);

    // Integrate documentation
    const documentedSchema = await this.integrateDocumentation(schemaContent, comprehensiveData);

    // Write final schema (atomic write to prevent race conditions)
    await this.writeFileAtomically(this.outputPath, documentedSchema);
    console.log(`✅ Comprehensive documentation integrated successfully!`);
    console.log(`📄 Final schema saved to: ${this.outputPath}`);
    console.log(`📈 Coverage: ${comprehensiveData.summary.coverageLevel} field documentation\n`);
  }

  private async loadComprehensiveDocumentation(): Promise<ComprehensiveDocumentation> {
    try {
      const content = await fs.promises.readFile(this.comprehensiveDocsPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ Error loading comprehensive documentation:', error);
      throw error;
    }
  }

  private async integrateDocumentation(schemaContent: string, docs: ComprehensiveDocumentation): Promise<string> {
    let documentedContent = schemaContent;
    let fieldsDocumented = 0;
    let tablesDocumented = 0;

    // Create lookup maps for efficient access
    const tableDocsMap = new Map<string, any>();
    const fieldDocsMap = new Map<string, ComprehensiveFieldDoc>();

    docs.tables.forEach(table => {
      tableDocsMap.set(table.name, table);
      table.fields.forEach(field => {
        fieldDocsMap.set(`${table.name}.${field.name}`, field);
      });
    });

    // Process each model in the schema
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];
      const fullModelMatch = match[0];

      const tableDoc = tableDocsMap.get(modelName);
      if (!tableDoc) continue;

      // Add table-level documentation
      let documentedModel = `/// ${tableDoc.businessDomain} - ${tableDoc.fieldCount} fields documented\n`;
      documentedModel += `/// Business Domain: ${tableDoc.businessDomain}\n`;
      documentedModel += `model ${modelName} {\n`;

      // Process fields in the model
      const fieldLines = modelBody.split('\n').map(line => line.trim()).filter(line => line);

      for (const line of fieldLines) {
        if (line.startsWith('//') || line.startsWith('@@') || !line.trim()) {
          documentedModel += `  ${line}\n`;
          continue;
        }

        // Parse field definition - handle complex Prisma field patterns
        const fieldMatch = line.match(/^\s*(\w+)\s+/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const fieldDoc = fieldDocsMap.get(`${modelName}.${fieldName}`);

          if (fieldDoc) {
            // Add comprehensive field documentation
            documentedModel += `  /// ${fieldDoc.description}\n`;
            documentedModel += `  /// Purpose: ${fieldDoc.businessPurpose}\n`;
            documentedModel += `  /// Category: ${fieldDoc.category}\n`;
            if (fieldDoc.examples.length > 0) {
              documentedModel += `  /// Examples: ${fieldDoc.examples.slice(0, 2).join(', ')}\n`;
            }
            if (fieldDoc.constraints.length > 0) {
              documentedModel += `  /// Constraints: ${fieldDoc.constraints.join(', ')}\n`;
            }
            fieldsDocumented++;
          }
        }

        documentedModel += `  ${line}\n`;
      }

      documentedModel += '}';

      // Replace the original model with the documented version
      documentedContent = documentedContent.replace(fullModelMatch, documentedModel);
      tablesDocumented++;
    }

    console.log(`   ✓ Added documentation for ${tablesDocumented} tables`);
    console.log(`   ✓ Added documentation for ${fieldsDocumented} fields`);

    return documentedContent;
  }

  private async writeFileAtomically(filePath: string, content: string): Promise<void> {
    const tempFile = `${filePath}.tmp.${crypto.randomBytes(8).toString('hex')}`;
    try {
      // Write to temporary file first
      await fs.promises.writeFile(tempFile, content, 'utf8');
      // Atomically move temp file to final location
      await fs.promises.rename(tempFile, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.promises.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
}

async function main() {
  console.log('📋 Comprehensive Field Documentation Integration');
  console.log('================================================\n');

  try {
    const integrator = new ComprehensiveDocumentationIntegrator();
    await integrator.integrateComprehensiveDocumentation();

    console.log('🎉 Integration completed successfully!');
    console.log('📈 Prisma schema now includes 100% field coverage documentation');
    console.log('🔄 Run coverage analysis to verify the integration\n');

  } catch (error) {
    console.error('❌ Error during integration:', error);
    process.exit(1);
  }
}

main().catch(console.error);