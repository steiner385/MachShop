#!/usr/bin/env tsx

/**
 * Examples and Valid Values Populator for Issue #215
 * Systematically populates examples and validValues for all 7,859 fields
 * across 398 database tables using manufacturing domain knowledge
 */

import * as fs from 'fs';
import * as path from 'path';

interface FieldDocumentation {
  [key: string]: any;
  examples?: string[];
  validValues?: string[];
}

interface TableDocumentation {
  [fieldName: string]: FieldDocumentation;
}

interface EnumDefinition {
  name: string;
  values: string[];
}

class ExamplesAndValidValuesPopulator {
  private fieldDocumentationPath = path.join(
    __dirname,
    '../../docs/schema-documentation/field-descriptions.json'
  );

  private prismaSchemaPath = path.join(
    __dirname,
    '../../prisma/modular/modules/documented'
  );

  private stats = {
    totalFields: 0,
    fieldsWithExamples: 0,
    fieldsWithValidValues: 0,
    fieldsPopulated: 0,
    tablesProcessed: 0,
    enumerationsExtracted: 0
  };

  private enums: Map<string, string[]> = new Map();

  /**
   * Manufacturing domain examples mapped by field naming patterns
   */
  private exampleTemplates = {
    // Work Order Fields
    'workOrderNumber': [
      'WO-2024-000123',
      'WO-2024-R00456',
      'WO-2025-000001',
      'WO-2025-REV789'
    ],
    'lineNumber': [
      'WO-2024-000123-01',
      'WO-2024-000123-02',
      'PO-2024-000456-03'
    ],
    'partNumber': [
      'PN-ABC-123-Rev-C',
      'ASSY-TURB-456-A',
      'MFG-001-2024',
      'CUST-XYZ-789-B'
    ],
    'serialNumber': [
      'SN-ABC123DEF',
      'SN-2024-001234',
      'TRB-2024-001234',
      'ASSY-2024-456789'
    ],
    'lotNumber': [
      'LOT240301001',
      'LOT2403AB0456',
      'MAT-2024-03-001',
      'BATCH-240315-002'
    ],
    'batchNumber': [
      'BATCH-2024-01-001',
      'BTC-240301-500',
      'BA-2024-0001-A'
    ],

    // Status Fields (mapped to enum values when available)
    'status': [
      'ACTIVE',
      'INACTIVE',
      'PENDING',
      'COMPLETED'
    ],

    // Timestamps and Dates
    'createdAt': [
      '2024-10-30T08:15:30.000Z',
      '2024-11-01T14:45:22.500Z',
      '2024-10-15T09:00:00.000Z'
    ],
    'updatedAt': [
      '2024-10-30T16:22:45.123Z',
      '2024-11-01T15:30:15.000Z',
      '2024-10-28T11:20:00.000Z'
    ],
    'startDate': [
      '2024-10-30',
      '2024-11-01',
      '2024-10-15'
    ],
    'endDate': [
      '2024-11-15',
      '2024-11-30',
      '2024-12-01'
    ],
    'dueDate': [
      '2024-11-15',
      '2024-12-05',
      '2024-10-30'
    ],
    'completionDate': [
      '2024-10-30',
      '2024-10-31',
      '2024-11-01'
    ],
    'scheduledStartTime': [
      '2024-10-30T07:00:00.000Z',
      '2024-11-01T06:30:00.000Z'
    ],
    'actualStartTime': [
      '2024-10-30T07:15:30.000Z',
      '2024-11-01T06:45:22.500Z'
    ],
    'completedAt': [
      '2024-10-30T16:45:00.000Z',
      '2024-11-01T15:30:00.000Z'
    ],

    // Equipment & Asset Fields
    'equipmentId': [
      'EQUIP-001',
      'MILL-A-003',
      'LATHE-B-005',
      'PRESS-C-002'
    ],
    'machineCode': [
      'M001',
      'M002',
      'LATHE-001',
      'CNC-MILL-A01'
    ],
    'assetTag': [
      'AT-2024-001',
      'ASSET-001234',
      'TAG-000567'
    ],
    'calibrationId': [
      'CAL-2024-001',
      'CALIB-001-2024',
      'CERT-2024-ABC'
    ],

    // Quality & Measurement Fields
    'qualityCode': [
      'PASS',
      'FAIL',
      'CONDITIONAL',
      'REWORK',
      'SCRAP'
    ],
    'defectCode': [
      'D001',
      'D002',
      'DENT',
      'SCRATCH',
      'MISSING'
    ],
    'measurementValue': [
      '125.45',
      '98.6',
      '0.5',
      '1.234'
    ],
    'upperControlLimit': [
      '10.0',
      '100.5',
      '0.100'
    ],
    'lowerControlLimit': [
      '9.5',
      '99.5',
      '0.050'
    ],
    'targetValue': [
      '9.75',
      '100.0',
      '0.075'
    ],

    // User & Operator Fields
    'operatorId': [
      'OP-001',
      'OP-002',
      'EMP001',
      'TECH001'
    ],
    'userId': [
      'USER-001',
      'USER-002',
      'EMP001'
    ],
    'employeeId': [
      'EMP001',
      'EMP002',
      'OP-2024-001'
    ],

    // Material & Inventory
    'unitOfMeasure': [
      'KG',
      'LB',
      'PIECES',
      'HOURS',
      'METERS',
      'LITERS'
    ],
    'quantity': [
      '100',
      '1000',
      '50.5',
      '1'
    ],
    'warehouseLocation': [
      'BIN-A1-001',
      'SHELF-B2-003',
      'RACK-C3-005',
      'LOC-001-A'
    ],
    'storageLocation': [
      'STORAGE-01',
      'STORAGE-02',
      'WAREHOUSE-A'
    ],

    // Financial Fields
    'cost': [
      '125.50',
      '1500.00',
      '45.99'
    ],
    'price': [
      '199.99',
      '2500.00',
      '75.50'
    ],
    'laborHours': [
      '8.5',
      '10.0',
      '2.25'
    ],
    'machineHours': [
      '4.5',
      '6.0',
      '1.75'
    ],

    // Document & Reference Fields
    'documentNumber': [
      'DOC-2024-001',
      'CERT-2024-ABC',
      'INSP-2024-001'
    ],
    'revisionNumber': [
      'A',
      'B',
      'Rev-A',
      'Rev-001'
    ],
    'revision': [
      '1.0',
      '1.1',
      '2.0'
    ],
    'version': [
      '1.0.0',
      '1.1.0',
      '2.0.0'
    ],
    'referenceNumber': [
      'REF-2024-001',
      'REF-ABC123',
      'PO-2024-456'
    ],
    'externalId': [
      'EXT-001',
      'VENDOR-ABC-123',
      'CUST-XYZ-789'
    ],

    // Code Fields
    'code': [
      'CODE-001',
      'MFG-CODE-A',
      'ITEM-CODE-001'
    ],
    'typeCode': [
      'TYPE-A',
      'TYPE-B',
      'CUST'
    ],
    'categoryCode': [
      'CAT-001',
      'CAT-RAW',
      'CAT-FINISH'
    ],
    'classCode': [
      'CLASS-A',
      'CLASS-B',
      'STANDARD'
    ],

    // Percentage & Numeric Fields
    'percentage': [
      '85.5',
      '100.0',
      '45.75'
    ],
    'rate': [
      '0.05',
      '0.10',
      '1.5'
    ],
    'priority': [
      '1',
      '2',
      '3'
    ],

    // Boolean/Flag Fields (when not explicitly in schema)
    'isActive': [
      'true',
      'false'
    ],
    'isRequired': [
      'true',
      'false'
    ],
    'isApproved': [
      'true',
      'false'
    ],

    // Name/Description Fields
    'name': [
      'Operation 1',
      'Quality Check',
      'Assembly Station A'
    ],
    'description': [
      'This is a sample description',
      'Process step description',
      'Equipment description'
    ],
    'title': [
      'Work Order Title',
      'Document Title',
      'Process Title'
    ],
    'label': [
      'Label A',
      'Label B',
      'Sample Label'
    ],

    // Notes & Comments
    'notes': [
      'Standard processing notes',
      'Special handling required',
      'Rush order - expedite'
    ],
    'comments': [
      'Sample comment text',
      'Please review carefully',
      'Approved for production'
    ],
    'remarks': [
      'Standard remarks',
      'Special attention needed',
      'Review complete'
    ],

    // Generic Fallback
    'default': [
      'Value-001',
      'Value-002',
      'Sample Value'
    ]
  };

  /**
   * Extract enums from Prisma schema files
   */
  async extractEnums(): Promise<void> {
    console.log('📋 Extracting enum definitions from Prisma schema...\n');

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
   * Get field type based on naming patterns and enum references
   */
  private getFieldType(fieldName: string): 'enum' | 'number' | 'string' | 'date' | 'boolean' {
    const lower = fieldName.toLowerCase();

    // Check for date/timestamp patterns
    if (
      lower.includes('date') ||
      lower.includes('time') ||
      lower.includes('at') ||
      lower.includes('when') ||
      lower === 'createdat' ||
      lower === 'updatedat' ||
      lower === 'deletedat'
    ) {
      return 'date';
    }

    // Check for boolean patterns
    if (
      lower.startsWith('is') ||
      lower.startsWith('has') ||
      lower.startsWith('can') ||
      lower.startsWith('should') ||
      lower === 'active' ||
      lower === 'enabled'
    ) {
      return 'boolean';
    }

    // Check for numeric patterns
    if (
      lower.includes('quantity') ||
      lower.includes('count') ||
      lower.includes('number') ||
      lower.includes('hours') ||
      lower.includes('minutes') ||
      lower.includes('seconds') ||
      lower.includes('value') ||
      lower.includes('limit') ||
      lower.includes('rate') ||
      lower.includes('cost') ||
      lower.includes('price') ||
      lower.includes('percentage')
    ) {
      return 'number';
    }

    return 'string';
  }

  /**
   * Get template examples for a field
   */
  private getExamples(fieldName: string, enumName?: string): string[] {
    // If it's an enum field, use enum values as examples
    if (enumName && this.enums.has(enumName)) {
      return this.enums.get(enumName)!.slice(0, 5); // Return first 5 values as examples
    }

    // Check direct field name matches (case-insensitive)
    for (const [pattern, examples] of Object.entries(this.exampleTemplates)) {
      if (pattern === 'default') continue;
      if (fieldName.toLowerCase().includes(pattern.toLowerCase())) {
        return examples;
      }
    }

    // Check for common suffixes
    const lower = fieldName.toLowerCase();
    if (lower.endsWith('number') || lower.endsWith('code')) {
      return [
        `${fieldName.substring(0, fieldName.length - 6).toUpperCase()}-001`,
        `${fieldName.substring(0, fieldName.length - 6).toUpperCase()}-002`
      ];
    }

    if (lower.endsWith('id')) {
      return [
        `ID-${Math.random().toString(36).substring(7).toUpperCase()}`,
        `ID-${Math.random().toString(36).substring(7).toUpperCase()}`
      ];
    }

    // Default fallback
    return this.exampleTemplates.default;
  }

  /**
   * Get valid values for enum fields
   */
  private getValidValues(enumName?: string): string[] | null {
    if (enumName && this.enums.has(enumName)) {
      return this.enums.get(enumName)!;
    }
    return null;
  }

  /**
   * Populate a single field with examples and valid values
   */
  private populateField(
    field: FieldDocumentation,
    fieldName: string,
    enumName?: string
  ): boolean {
    let updated = false;

    // Populate examples if not already set
    if (!field.examples || field.examples.length === 0) {
      field.examples = this.getExamples(fieldName, enumName);
      updated = true;
    }

    // Populate validValues for enum fields
    if ((!field.validValues || field.validValues.length === 0) && enumName) {
      const validValues = this.getValidValues(enumName);
      if (validValues) {
        field.validValues = validValues;
        updated = true;
      }
    }

    return updated;
  }

  /**
   * Infer enum name from field metadata
   */
  private inferEnumName(field: FieldDocumentation): string | undefined {
    // Check validation field for enum patterns
    if (field.validation && typeof field.validation === 'string') {
      const enumMatch = field.validation.match(/enum\s*['\"]?(\w+)['\"]?/i);
      if (enumMatch) {
        return enumMatch[1];
      }
    }

    // Check format field
    if (field.format && typeof field.format === 'string') {
      const enumMatch = field.format.match(/enum|enumerated|one of/i);
      if (enumMatch) {
        // Try to infer from description or other fields
        const nameMatch = field.description?.match(/(\w+Enum|\w+Type|\w+Status|\w+Priority)/);
        if (nameMatch) {
          return nameMatch[1];
        }
      }
    }

    return undefined;
  }

  /**
   * Main population routine
   */
  async populate(): Promise<void> {
    console.log('🚀 Starting Examples and Valid Values Population\n');

    // Step 1: Extract enums
    await this.extractEnums();

    // Step 2: Load documentation
    console.log('📂 Loading field documentation...');
    const documentation = JSON.parse(
      fs.readFileSync(this.fieldDocumentationPath, 'utf-8')
    );
    console.log('✅ Documentation loaded\n');

    // Step 3: Process all tables and fields
    console.log('🔄 Processing tables and fields...\n');
    let totalFields = 0;
    let fieldsUpdated = 0;

    for (const table in documentation) {
      if (table === '_metadata') continue;

      const tableData = documentation[table];
      let tableUpdated = 0;

      for (const fieldName in tableData) {
        totalFields++;
        const field = tableData[fieldName];

        // Infer enum name if applicable
        const enumName = this.inferEnumName(field);

        // Populate examples and valid values
        if (this.populateField(field, fieldName, enumName)) {
          fieldsUpdated++;
          tableUpdated++;
        }

        // Track coverage
        if (field.examples && field.examples.length > 0) {
          this.stats.fieldsWithExamples++;
        }
        if (field.validValues && field.validValues.length > 0) {
          this.stats.fieldsWithValidValues++;
        }
      }

      if (tableUpdated > 0) {
        this.stats.tablesProcessed++;
        process.stdout.write(`  ✓ ${table} (${tableUpdated} fields updated)\n`);
      }
    }

    this.stats.totalFields = totalFields;
    this.stats.fieldsPopulated = fieldsUpdated;

    // Step 4: Save updated documentation
    console.log('\n📝 Saving updated documentation...');
    const outputPath = this.fieldDocumentationPath;
    fs.writeFileSync(outputPath, JSON.stringify(documentation, null, 2), 'utf-8');

    // Step 5: Display summary
    console.log('\n✅ Examples and Valid Values Population Complete!\n');
    console.log(`📈 Coverage Report:`);
    console.log(`   Total Fields: ${this.stats.totalFields}`);
    console.log(`   Fields with Examples: ${this.stats.fieldsWithExamples} (${((this.stats.fieldsWithExamples / this.stats.totalFields) * 100).toFixed(2)}%)`);
    console.log(`   Fields with Valid Values: ${this.stats.fieldsWithValidValues} (${((this.stats.fieldsWithValidValues / this.stats.totalFields) * 100).toFixed(2)}%)`);
    console.log(`   Enumerations Processed: ${this.stats.enumerationsExtracted}`);
    console.log(`   Tables Updated: ${this.stats.tablesProcessed}`);
    console.log(`\n📁 Updated: ${outputPath}`);
  }
}

// Execute
const populator = new ExamplesAndValidValuesPopulator();
populator.populate().catch(error => {
  console.error('❌ Error populating examples and valid values:', error);
  process.exit(1);
});
