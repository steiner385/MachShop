#!/usr/bin/env node

/**
 * Modular Documentation Migrator
 * Migrates external JSON documentation into modular Prisma schema files
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

interface ModularFile {
  path: string;
  content: string;
  models: ModelInfo[];
}

interface ModelInfo {
  name: string;
  startLine: number;
  endLine: number;
  fields: FieldInfo[];
}

interface FieldInfo {
  name: string;
  lineNumber: number;
  content: string;
}

export class ModularDocumentationMigrator {
  private modulesDir: string;
  private docsPath: string;
  private outputDir: string;
  private externalDocs: {
    tables: Record<string, ExternalTableDoc>;
    fields: Record<string, Record<string, ExternalFieldDoc>>;
  };

  constructor(modulesDir: string, docsPath: string, outputDir?: string) {
    this.modulesDir = modulesDir;
    this.docsPath = docsPath;
    this.outputDir = outputDir || path.join(modulesDir, 'documented');
    this.externalDocs = { tables: {}, fields: {} };
  }

  /**
   * Main migration process
   */
  async migrate(): Promise<void> {
    console.log('🔄 Starting Modular Documentation Migration\n');
    console.log(`📁 Modules directory: ${this.modulesDir}`);
    console.log(`📚 External docs: ${this.docsPath}`);
    console.log(`💾 Output directory: ${this.outputDir}\n`);

    // Load external documentation
    await this.loadExternalDocumentation();

    // Process each module file
    await this.processModularSchemas();

    // Update build script for documented modules
    await this.updateBuildScript();

    // Generate migration report
    await this.generateMigrationReport();

    console.log('✅ Modular documentation migration completed successfully!');
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
   * Process all modular schema files
   */
  private async processModularSchemas(): Promise<void> {
    console.log('📝 Processing modular schema files...');

    // Ensure output directory exists
    await fs.promises.mkdir(this.outputDir, { recursive: true });

    // Get all .prisma files from modules directory
    const moduleFiles = fs.readdirSync(this.modulesDir)
      .filter(file => file.endsWith('.prisma'))
      .map(file => path.join(this.modulesDir, file));

    let totalTablesDocumented = 0;
    let totalFieldsDocumented = 0;

    for (const moduleFile of moduleFiles) {
      const moduleName = path.basename(moduleFile, '.prisma');
      console.log(`   📄 Processing ${moduleName}...`);

      const { tablesDocumented, fieldsDocumented } = await this.processModuleFile(moduleFile);
      totalTablesDocumented += tablesDocumented;
      totalFieldsDocumented += fieldsDocumented;

      if (tablesDocumented > 0 || fieldsDocumented > 0) {
        console.log(`     ✓ Added docs: ${tablesDocumented} tables, ${fieldsDocumented} fields`);
      }
    }

    console.log(`\n   📊 Total documentation added:`);
    console.log(`     - ${totalTablesDocumented} tables documented`);
    console.log(`     - ${totalFieldsDocumented} fields documented`);
  }

  /**
   * Process a single module file
   */
  private async processModuleFile(moduleFile: string): Promise<{ tablesDocumented: number; fieldsDocumented: number }> {
    const content = fs.readFileSync(moduleFile, 'utf8');
    const lines = content.split('\n');
    const models = this.extractModelsFromContent(content);

    let documentedLines = [...lines];
    let linesAdded = 0;
    let tablesDocumented = 0;
    let fieldsDocumented = 0;

    for (const model of models) {
      const tableDoc = this.externalDocs.tables[model.name];
      const fieldDocs = this.externalDocs.fields[model.name] || {};

      // Add table documentation
      if (tableDoc) {
        const tableComments = this.generateTableComments(tableDoc);
        const insertPosition = model.startLine + linesAdded;

        documentedLines.splice(insertPosition, 0, ...tableComments);
        linesAdded += tableComments.length;
        tablesDocumented++;
      }

      // Add field documentation
      for (const field of model.fields) {
        const fieldDoc = fieldDocs[field.name];
        if (fieldDoc) {
          const fieldComments = this.generateFieldComments(fieldDoc);
          const insertPosition = field.lineNumber + linesAdded;

          documentedLines.splice(insertPosition, 0, ...fieldComments);
          linesAdded += fieldComments.length;
          fieldsDocumented++;
        }
      }
    }

    // Write documented module if changes were made
    if (linesAdded > 0) {
      const outputFile = path.join(this.outputDir, path.basename(moduleFile));
      const documentedContent = documentedLines.join('\n');
      fs.writeFileSync(outputFile, documentedContent, 'utf8');
    } else {
      // Copy original file if no documentation was added
      const outputFile = path.join(this.outputDir, path.basename(moduleFile));
      fs.copyFileSync(moduleFile, outputFile);
    }

    return { tablesDocumented, fieldsDocumented };
  }

  /**
   * Extract models from module content
   */
  private extractModelsFromContent(content: string): ModelInfo[] {
    const lines = content.split('\n');
    const models: ModelInfo[] = [];
    let currentModel: ModelInfo | null = null;
    let inModel = false;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Start of model
      if (line.startsWith('model ') && !inModel) {
        const modelMatch = line.match(/model\s+(\w+)/);
        if (modelMatch) {
          currentModel = {
            name: modelMatch[1],
            startLine: i,
            endLine: 0,
            fields: []
          };
          inModel = true;
          braceCount = 0;
        }
      }

      if (inModel && currentModel) {
        // Track braces
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        // Parse fields within model
        if (braceCount > 0 && !line.startsWith('model') && !line.startsWith('//') && line.includes(' ')) {
          const fieldMatch = line.match(/^\s*(\w+)\s+(\w+.*?)(?:\s|$)/);
          if (fieldMatch) {
            const [, fieldName] = fieldMatch;
            currentModel.fields.push({
              name: fieldName,
              lineNumber: i,
              content: line
            });
          }
        }

        // End of model
        if (braceCount === 0 && line.includes('}')) {
          currentModel.endLine = i;
          models.push(currentModel);
          inModel = false;
          currentModel = null;
        }
      }
    }

    return models;
  }

  /**
   * Generate table-level comments
   */
  private generateTableComments(tableDoc: ExternalTableDoc): string[] {
    const comments: string[] = [];

    comments.push('/**');
    comments.push(` * ${tableDoc.description}`);
    comments.push(' *');
    comments.push(` * @businessPurpose ${tableDoc.businessPurpose}`);
    comments.push(` * @dataOwner ${tableDoc.dataOwner}`);
    comments.push(` * @updateFrequency ${tableDoc.updateFrequency}`);

    if (tableDoc.complianceNotes) {
      comments.push(` * @complianceNotes ${tableDoc.complianceNotes}`);
    }

    if (tableDoc.dataRetention) {
      comments.push(` * @dataRetention ${tableDoc.dataRetention}`);
    }

    if (tableDoc.securityClassification) {
      comments.push(` * @securityClassification ${tableDoc.securityClassification}`);
    }

    if (tableDoc.integrations && tableDoc.integrations.length > 0) {
      comments.push(` * @integrations ${tableDoc.integrations.join(', ')}`);
    }

    if (tableDoc.relatedTables && tableDoc.relatedTables.length > 0) {
      comments.push(` * @relatedTables ${tableDoc.relatedTables.join(', ')}`);
    }

    // Add examples
    if (tableDoc.examples && tableDoc.examples.length > 0) {
      comments.push(' *');
      comments.push(' * @examples');
      tableDoc.examples.forEach(example => {
        comments.push(` * - ${example.scenario}: ${example.explanation}`);
      });
    }

    // Add common queries
    if (tableDoc.commonQueries && tableDoc.commonQueries.length > 0) {
      comments.push(' *');
      comments.push(' * @commonQueries');
      tableDoc.commonQueries.forEach(query => {
        comments.push(` * - ${query}`);
      });
    }

    comments.push(' */');

    return comments;
  }

  /**
   * Generate field-level comments
   */
  private generateFieldComments(fieldDoc: ExternalFieldDoc): string[] {
    const comments: string[] = [];

    comments.push(`  /// ${fieldDoc.description}`);

    if (fieldDoc.businessRule) {
      comments.push(`  /// @businessRule ${fieldDoc.businessRule}`);
    }

    if (fieldDoc.dataSource) {
      comments.push(`  /// @dataSource ${fieldDoc.dataSource}`);
    }

    if (fieldDoc.format) {
      comments.push(`  /// @format ${fieldDoc.format}`);
    }

    if (fieldDoc.validation) {
      comments.push(`  /// @validation ${fieldDoc.validation}`);
    }

    if (fieldDoc.businessImpact) {
      comments.push(`  /// @businessImpact ${fieldDoc.businessImpact}`);
    }

    if (fieldDoc.privacy) {
      comments.push(`  /// @privacy ${fieldDoc.privacy}`);
    }

    if (fieldDoc.auditTrail) {
      comments.push(`  /// @auditTrail ${fieldDoc.auditTrail}`);
    }

    if (fieldDoc.complianceNotes) {
      comments.push(`  /// @complianceNotes ${fieldDoc.complianceNotes}`);
    }

    // Add valid values
    if (fieldDoc.validValues && fieldDoc.validValues.length > 0) {
      comments.push('  /// @validValues');
      fieldDoc.validValues.forEach(value => {
        comments.push(`  /// - ${value}`);
      });
    }

    // Add examples
    if (fieldDoc.examples && fieldDoc.examples.length > 0) {
      comments.push('  /// @examples');
      fieldDoc.examples.forEach(example => {
        comments.push(`  /// - ${example}`);
      });
    }

    // Add integration mapping
    if (fieldDoc.integrationMapping && Object.keys(fieldDoc.integrationMapping).length > 0) {
      comments.push('  /// @integrationMapping');
      Object.entries(fieldDoc.integrationMapping).forEach(([system, field]) => {
        comments.push(`  /// - ${system}: ${field}`);
      });
    }

    return comments;
  }

  /**
   * Update build script to use documented modules
   */
  private async updateBuildScript(): Promise<void> {
    console.log('🔨 Updating build script for documented modules...');

    const buildScriptPath = path.join(path.dirname(this.modulesDir), 'build-documented-schema.sh');

    const buildScript = `#!/bin/bash

# Prisma Documented Schema Build Process
# Combines documented modular schema files into single schema.prisma

echo "🔨 Building documented Prisma schema from modules..."

OUTPUT_FILE="./prisma/schema.documented.prisma"
MODULES_DIR="${this.outputDir}"

# Create temporary build directory
mkdir -p ./prisma/build

# Start with base configuration
cat > "$OUTPUT_FILE" << 'EOF'
// This file is auto-generated from documented modular schema files
// Source: ${this.outputDir}/
// Generated: $(date)

EOF

# Find all module files and combine them
for module_file in "$MODULES_DIR"/*.prisma; do
  if [ -f "$module_file" ]; then
    module_name=$(basename "$module_file")
    echo "   ✓ Adding $module_name"

    # Add module content
    cat "$module_file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
  fi
done

echo "✅ Documented schema built successfully: $OUTPUT_FILE"
echo "📊 $(grep -c '^model ' "$OUTPUT_FILE") models, $(grep -c '^enum ' "$OUTPUT_FILE") enums"

# Validate the built schema
echo "🔍 Validating documented schema..."
if npx prisma validate --schema="$OUTPUT_FILE"; then
  echo "✅ Schema validation passed"
else
  echo "❌ Schema validation failed"
  exit 1
fi

echo "📋 Documentation statistics:"
echo "   - $(grep -c '/\\*\\*' "$OUTPUT_FILE") table documentation blocks"
echo "   - $(grep -c '///' "$OUTPUT_FILE") field documentation lines"
`;

    fs.writeFileSync(buildScriptPath, buildScript, 'utf8');
    await fs.promises.chmod(buildScriptPath, 0o755);

    console.log(`   ✓ Created documented build script: ${buildScriptPath}`);
  }

  /**
   * Generate migration report
   */
  private async generateMigrationReport(): Promise<void> {
    const documentedFiles = fs.readdirSync(this.outputDir).filter(f => f.endsWith('.prisma'));
    const totalTables = Object.keys(this.externalDocs.tables).length;
    const totalFields = Object.values(this.externalDocs.fields)
      .reduce((sum, table) => sum + Object.keys(table).length, 0);

    const report = `# Modular Prisma Schema Documentation Migration Report

Generated: ${new Date().toLocaleString()}

## Migration Summary

| Metric | Value |
|--------|-------|
| **Module Files Processed** | ${documentedFiles.length} |
| **Tables Documented** | ${totalTables} |
| **Fields Documented** | ${totalFields} |
| **Output Directory** | \`${this.outputDir}\` |

## Documented Modules

${documentedFiles.map(file => `- ${file}`).join('\n')}

## Documentation Features

Each documented model now includes:

### Table-Level Documentation
- **Business Purpose** - Why the data exists and how it's used
- **Data Owner** - Team responsible for data governance
- **Update Frequency** - How often data changes
- **Compliance Notes** - Regulatory requirements (AS9100, ISO 9001, etc.)
- **Integration Points** - External systems that connect
- **Data Retention** - How long data is kept
- **Security Classification** - Data sensitivity level
- **Examples** - Real-world usage scenarios
- **Common Queries** - Typical data access patterns

### Field-Level Documentation
- **Business Rules** - What constraints and logic apply
- **Data Source** - Where the data originates
- **Format Requirements** - Expected data format
- **Validation Rules** - What makes data valid
- **Business Impact** - Why this field matters
- **Privacy Classification** - PII and sensitivity handling
- **Audit Trail** - Whether changes are tracked
- **Integration Mappings** - How external systems map to this field

## Usage

### Build Documented Schema
\`\`\`bash
bash ./prisma/modular/build-documented-schema.sh
\`\`\`

### Development Workflow
\`\`\`bash
# 1. Edit documented module files in ${this.outputDir}/
# 2. Build complete documented schema
bash ./prisma/modular/build-documented-schema.sh

# 3. Use for development (optional - keeps original schema)
cp ./prisma/schema.documented.prisma ./prisma/schema.prisma
npm run db:generate
\`\`\`

### Documentation Maintenance
\`\`\`bash
# Update external documentation
code docs/schema-documentation/table-descriptions.json
code docs/schema-documentation/field-descriptions.json

# Re-migrate to modular schema
npm run schema:docs:migrate

# Rebuild documented schema
bash ./prisma/modular/build-documented-schema.sh
\`\`\`

## Benefits of Modular + Documented Schema

- ✅ **Maintainable** - Logical separation by domain
- ✅ **Documented** - Comprehensive business context
- ✅ **Collaborative** - Teams can work on specific modules
- ✅ **Version Controlled** - Documentation tracked with schema changes
- ✅ **IDE Integration** - Documentation visible in code editor
- ✅ **Self-Documenting** - Schema serves as living documentation

## Next Steps

1. **Review documented modules** - Ensure documentation is complete and accurate
2. **Update development workflow** - Use modular documented files for changes
3. **Team training** - Educate developers on new modular structure
4. **CI/CD integration** - Automate documented schema building
5. **Documentation standards** - Establish guidelines for future documentation

## File Structure

\`\`\`
prisma/
├── schema.prisma                    # Original large schema
├── schema.documented.prisma         # Built documented schema
├── modular/
│   ├── modules/                     # Original modular files
│   │   ├── core-foundation.prisma
│   │   ├── user-management.prisma
│   │   └── ... (17 modules)
│   ├── documented/                  # Documented modular files
│   │   ├── core-foundation.prisma
│   │   ├── user-management.prisma
│   │   └── ... (17 modules)
│   ├── build-schema.sh             # Build original schema
│   ├── build-documented-schema.sh  # Build documented schema
│   └── modularization-report.md
└── docs/
    └── schema-documentation/        # External documentation source
        ├── table-descriptions.json
        └── field-descriptions.json
\`\`\`

---

*Modular documentation migration completed successfully. Your schema now combines maintainable modular structure with comprehensive business documentation.*
`;

    const reportPath = path.join(path.dirname(this.outputDir), 'documentation-migration-report.md');
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`📋 Migration report saved to: ${reportPath}`);
  }
}

/**
 * CLI Entry Point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const modulesDir = args[0] || './prisma/modular/modules';
  const docsPath = args[1] || './docs/schema-documentation';
  const outputDir = args[2];

  console.log('🚀 Modular Documentation Migration Tool\n');

  try {
    const migrator = new ModularDocumentationMigrator(modulesDir, docsPath, outputDir);
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

export default ModularDocumentationMigrator;