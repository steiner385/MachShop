#!/usr/bin/env tsx

/**
 * Enum Field Matcher for Issue #215
 * Matches enum fields in the database with their Prisma enum definitions
 * and populates validValues for all enum-typed fields
 */

import * as fs from 'fs';
import * as path from 'path';

interface FieldDocumentation {
  [key: string]: any;
  validValues?: string[];
}

class EnumFieldMatcher {
  private fieldDocumentationPath = path.join(
    __dirname,
    '../../docs/schema-documentation/field-descriptions.json'
  );

  private prismaSchemaPath = path.join(
    __dirname,
    '../../prisma/modular/modules/documented'
  );

  private enums: Map<string, string[]> = new Map();

  private stats = {
    totalFields: 0,
    fieldsWithValidValues: 0,
    fieldsUpdated: 0,
    enumerationsExtracted: 0,
    tablesProcessed: 0
  };

  /**
   * Extract all enums from Prisma schema files
   */
  async extractAllEnums(): Promise<void> {
    console.log('📋 Extracting all enum definitions from Prisma schema...\n');

    // Read the main enums file
    const enumsFile = path.join(this.prismaSchemaPath, 'enums.prisma');
    if (!fs.existsSync(enumsFile)) {
      console.log('⚠️  Enums file not found at', enumsFile);
      return;
    }

    const content = fs.readFileSync(enumsFile, 'utf-8');
    const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = enumRegex.exec(content)) !== null) {
      const enumName = match[1];
      const enumBody = match[2];
      const values = enumBody
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(line => line.replace(/\s+.*/, ''));

      this.enums.set(enumName, values);
      this.stats.enumerationsExtracted++;
    }

    console.log(`✅ Extracted ${this.stats.enumerationsExtracted} enumerations\n`);
  }

  /**
   * Map field names to enum types based on Prisma schema
   * Parses all Prisma model definitions to understand field types
   */
  private getEnumTypeMapping(): Map<string, Map<string, string>> {
    const tableEnumFields = new Map<string, Map<string, string>>();

    // Read main schema file
    const schemaFile = path.join(this.prismaSchemaPath, '../../schema.prisma');
    if (fs.existsSync(schemaFile)) {
      this.parseSchemaForEnumFields(schemaFile, tableEnumFields);
    }

    // Read all documented module files
    const modulesDir = path.join(this.prismaSchemaPath);
    if (fs.existsSync(modulesDir)) {
      const files = fs.readdirSync(modulesDir).filter(f => f.endsWith('.prisma'));
      for (const file of files) {
        this.parseSchemaForEnumFields(path.join(modulesDir, file), tableEnumFields);
      }
    }

    return tableEnumFields;
  }

  /**
   * Parse a Prisma schema file to extract field type information
   */
  private parseSchemaForEnumFields(
    filePath: string,
    mapping: Map<string, Map<string, string>>
  ): void {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Match model definitions: model ModelName { ... }
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/gs;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];

      if (!mapping.has(modelName)) {
        mapping.set(modelName, new Map());
      }

      const fieldMap = mapping.get(modelName)!;

      // Match field definitions: fieldName TypeName or fieldName EnumType or fieldName TypeName?
      const fieldRegex = /(\w+)\s+(\w+)[\?@]/gm;
      let fieldMatch;

      while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];

        // If type matches an enum we've extracted, store the mapping
        if (this.enums.has(fieldType)) {
          fieldMap.set(fieldName, fieldType);
        }
      }
    }
  }

  /**
   * Populate validValues based on Prisma schema enum type information
   */
  async populateEnumValidValues(): Promise<void> {
    console.log('🔗 Building field-to-enum type mapping from Prisma schema...');
    const enumTypeMapping = this.getEnumTypeMapping();
    console.log(`✅ Identified enum-typed fields from Prisma schema\n`);

    // Load documentation
    console.log('📂 Loading field documentation...');
    const documentation = JSON.parse(
      fs.readFileSync(this.fieldDocumentationPath, 'utf-8')
    );
    console.log('✅ Documentation loaded\n');

    // Process each table
    console.log('🔄 Populating validValues for enum-typed fields...\n');

    for (const table in documentation) {
      if (table === '_metadata') continue;

      const tableData = documentation[table];
      let tableUpdated = 0;

      // Get enum field mapping for this table
      const tableEnumFields = enumTypeMapping.get(table);
      if (!tableEnumFields) continue;

      for (const fieldName in tableData) {
        const field = tableData[fieldName];
        const enumTypeName = tableEnumFields.get(fieldName);

        if (enumTypeName && this.enums.has(enumTypeName)) {
          // Only populate if not already set
          if (!field.validValues || field.validValues.length === 0) {
            field.validValues = this.enums.get(enumTypeName)!;
            tableUpdated++;
            this.stats.fieldsUpdated++;
          }

          this.stats.fieldsWithValidValues++;
        }
      }

      if (tableUpdated > 0) {
        this.stats.tablesProcessed++;
        process.stdout.write(`  ✓ ${table} (${tableUpdated} enum fields updated)\n`);
      }
    }

    // Save updated documentation
    console.log('\n📝 Saving updated documentation...');
    fs.writeFileSync(
      this.fieldDocumentationPath,
      JSON.stringify(documentation, null, 2),
      'utf-8'
    );

    // Display summary
    console.log('\n✅ Enum Field Matching Complete!\n');
    console.log(`📈 Coverage Report:`);
    console.log(`   Total Enumerations: ${this.stats.enumerationsExtracted}`);
    console.log(`   Fields with ValidValues: ${this.stats.fieldsWithValidValues}`);
    console.log(`   Fields Updated: ${this.stats.fieldsUpdated}`);
    console.log(`   Tables Processed: ${this.stats.tablesProcessed}`);
    console.log(`\n📁 Updated: ${this.fieldDocumentationPath}`);
  }

  /**
   * Main execution
   */
  async run(): Promise<void> {
    console.log('🚀 Starting Enum Field Matcher\n');
    await this.extractAllEnums();
    await this.populateEnumValidValues();
  }
}

// Execute
const matcher = new EnumFieldMatcher();
matcher.run().catch(error => {
  console.error('❌ Error matching enum fields:', error);
  process.exit(1);
});
