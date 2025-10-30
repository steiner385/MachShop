#!/usr/bin/env node

/**
 * Prisma Schema Modularizer
 * Splits large Prisma schema into logical, manageable modules and creates composition build process
 */

import * as fs from 'fs';
import * as path from 'path';

interface ModelInfo {
  name: string;
  content: string;
  startLine: number;
  endLine: number;
  category: string;
  dependencies: string[];
}

interface SchemaModule {
  name: string;
  category: string;
  models: ModelInfo[];
  enums: string[];
  content: string;
}

interface ModularizationConfig {
  categories: Record<string, {
    description: string;
    models: string[];
    priority: number; // For dependency ordering
  }>;
}

export class SchemaModularizer {
  private schemaPath: string;
  private outputDir: string;
  private schemaContent: string;
  private models: ModelInfo[] = [];
  private enums: string[] = [];
  private config: ModularizationConfig;

  constructor(schemaPath: string, outputDir: string) {
    this.schemaPath = schemaPath;
    this.outputDir = outputDir;
    this.schemaContent = '';

    // Define logical categories for MES system
    this.config = {
      categories: {
        'core-foundation': {
          description: 'Core foundational models for enterprise structure',
          models: ['Enterprise', 'Site', 'Area'],
          priority: 1
        },
        'user-management': {
          description: 'User accounts, authentication, and personnel management',
          models: ['User', 'PersonnelClass', 'PersonnelQualification', 'PersonnelCertification',
                  'PersonnelSkill', 'PersonnelSkillAssignment', 'PersonnelWorkCenterAssignment',
                  'PersonnelAvailability'],
          priority: 2
        },
        'security-access': {
          description: 'Security, permissions, and access control',
          models: ['Role', 'Permission', 'UserSiteRole', 'ElectronicSignature', 'SecurityEvent',
                  'PermissionChangeLog', 'PermissionUsageLog'],
          priority: 3
        },
        'material-management': {
          description: 'Materials, inventory, and supply chain',
          models: ['MaterialClass', 'MaterialDefinition', 'MaterialProperty', 'MaterialLot',
                  'MaterialSublot', 'MaterialLotGenealogy', 'MaterialStateHistory', 'MaterialTransaction',
                  'MaterialCost', 'MaterialHandling'],
          priority: 4
        },
        'operations-routing': {
          description: 'Manufacturing operations and routing definitions',
          models: ['Operation', 'OperationParameter', 'ParameterLimits', 'ParameterGroup',
                  'ParameterFormula', 'OperationDependency', 'PersonnelOperationSpecification',
                  'EquipmentOperationSpecification', 'MaterialOperationSpecification',
                  'PhysicalAssetOperationSpecification'],
          priority: 5
        },
        'parts-bom': {
          description: 'Parts, bills of materials, and product structure',
          models: ['Part', 'PartSiteAvailability', 'BOM', 'BOMItem', 'BOMApproval', 'PartRevision',
                  'PartCategory', 'PartSpecification'],
          priority: 6
        },
        'routing-templates': {
          description: 'Manufacturing routing templates and configurations',
          models: ['RoutingTemplate', 'RoutingTemplateOperation', 'RoutingTemplateApproval',
                  'Routing', 'RoutingOperation', 'RoutingApproval'],
          priority: 7
        },
        'work-orders': {
          description: 'Work orders and production execution',
          models: ['WorkOrder', 'WorkOrderOperation', 'WorkOrderMaterial', 'WorkOrderSetting',
                  'WorkOrderApproval', 'WorkOrderStatusHistory'],
          priority: 8
        },
        'production-scheduling': {
          description: 'Production scheduling and capacity planning',
          models: ['ProductionSchedule', 'ScheduleEntry', 'ScheduleConstraint', 'CapacityPlan',
                  'LoadBalancing', 'ScheduleOptimization'],
          priority: 9
        },
        'equipment-assets': {
          description: 'Equipment, tools, and physical assets',
          models: ['Equipment', 'EquipmentLog', 'EquipmentCapability', 'WorkCenter',
                  'Tool', 'ToolAssignment', 'Fixture', 'FixtureAssignment', 'PhysicalAsset'],
          priority: 10
        },
        'quality-management': {
          description: 'Quality plans, inspections, and measurements',
          models: ['QualityPlan', 'InspectionPlan', 'QualityInspection', 'QualityMeasurement',
                  'CalibrationRecord', 'NonConformanceReport', 'CorrectiveAction', 'PreventiveAction'],
          priority: 11
        },
        'time-tracking': {
          description: 'Time tracking and labor management',
          models: ['TimeEntry', 'TimeApproval', 'LaborRate', 'ShiftSchedule', 'ShiftAssignment'],
          priority: 12
        },
        'document-management': {
          description: 'Document management and version control',
          models: ['Document', 'DocumentVersion', 'DocumentApproval', 'DocumentCategory',
                  'DocumentLink', 'DocumentAccess', 'DocumentTemplate', 'AttachmentMetadata',
                  'FileUpload', 'DocumentReview', 'DocumentDistribution', 'DocumentRetention',
                  'DocumentSearch'],
          priority: 13
        },
        'audit-compliance': {
          description: 'Audit trails, compliance, and regulatory support',
          models: ['AuditReport', 'AuditFinding', 'ComplianceCheck', 'RegulatoryRequirement',
                  'TraceabilityRecord'],
          priority: 14
        },
        'cost-tracking': {
          description: 'Cost tracking and financial management',
          models: ['CostCenter', 'IndirectCostCode', 'LaborCost', 'OverheadCost', 'CostAllocation'],
          priority: 15
        },
        'integration-external': {
          description: 'External system integration and data exchange',
          models: ['IntegrationLog', 'DataExchange', 'ExternalSystemConfig', 'ApiEndpoint'],
          priority: 16
        }
      }
    };
  }

  /**
   * Main modularization process
   */
  async modularize(): Promise<void> {
    console.log('🔧 Starting Prisma Schema Modularization\n');
    console.log(`📄 Source schema: ${this.schemaPath} (${fs.statSync(this.schemaPath).size} bytes)`);
    console.log(`📁 Output directory: ${this.outputDir}\n`);

    // Create output directory
    await this.ensureOutputDirectory();

    // Parse the schema
    await this.parseSchema();

    // Categorize models
    await this.categorizeModels();

    // Generate modular schema files
    await this.generateModularSchemas();

    // Create composition build script
    await this.createBuildProcess();

    // Generate documentation
    await this.generateModularizationReport();

    console.log('✅ Schema modularization completed successfully!');
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    await fs.promises.mkdir(this.outputDir, { recursive: true });
    await fs.promises.mkdir(path.join(this.outputDir, 'modules'), { recursive: true });
  }

  /**
   * Parse the schema file
   */
  private async parseSchema(): Promise<void> {
    console.log('📖 Parsing schema file...');

    this.schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    const lines = this.schemaContent.split('\n');

    let currentModel: ModelInfo | null = null;
    let inModel = false;
    let braceCount = 0;
    let modelStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Track enums
      if (line.startsWith('enum ')) {
        const enumMatch = line.match(/enum\s+(\w+)/);
        if (enumMatch) {
          this.enums.push(enumMatch[1]);
        }
      }

      // Start of model
      if (line.startsWith('model ') && !inModel) {
        const modelMatch = line.match(/model\s+(\w+)/);
        if (modelMatch) {
          const modelName = modelMatch[1];
          currentModel = {
            name: modelName,
            content: '',
            startLine: i,
            endLine: 0,
            category: 'uncategorized',
            dependencies: []
          };
          modelStartLine = i;
          inModel = true;
          braceCount = 0;
        }
      }

      if (inModel && currentModel) {
        // Track braces
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        // End of model
        if (braceCount === 0 && line.includes('}')) {
          currentModel.endLine = i;
          currentModel.content = lines.slice(modelStartLine, i + 1).join('\n');
          currentModel.dependencies = this.extractDependencies(currentModel.content);
          this.models.push(currentModel);
          inModel = false;
          currentModel = null;
        }
      }
    }

    console.log(`   ✓ Found ${this.models.length} models`);
    console.log(`   ✓ Found ${this.enums.length} enums`);
  }

  /**
   * Extract model dependencies (references to other models)
   */
  private extractDependencies(modelContent: string): string[] {
    const dependencies: string[] = [];
    const modelNames = this.models.map(m => m.name);

    // Look for references to other models in field types and relations
    for (const modelName of modelNames) {
      if (modelContent.includes(modelName) && !modelContent.startsWith(`model ${modelName}`)) {
        dependencies.push(modelName);
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Categorize models based on configuration
   */
  private async categorizeModels(): Promise<void> {
    console.log('📂 Categorizing models...');

    // First pass: categorize based on config
    for (const model of this.models) {
      for (const [category, config] of Object.entries(this.config.categories)) {
        if (config.models.includes(model.name)) {
          model.category = category;
          break;
        }
      }
    }

    // Second pass: handle uncategorized models by inferring from name patterns
    const uncategorized = this.models.filter(m => m.category === 'uncategorized');
    for (const model of uncategorized) {
      model.category = this.inferCategory(model.name);
    }

    // Report categorization
    const categoryStats = this.models.reduce((stats, model) => {
      stats[model.category] = (stats[model.category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    console.log('   ✓ Model categorization:');
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`     - ${category}: ${count} models`);
    });
  }

  /**
   * Infer category from model name patterns
   */
  private inferCategory(modelName: string): string {
    const patterns = [
      { pattern: /^(Material|Inventory|Stock|Supply)/, category: 'material-management' },
      { pattern: /^(Work|Job|Production|Schedule)/, category: 'work-orders' },
      { pattern: /^(Quality|Inspection|Measurement|Calibration|NCR)/, category: 'quality-management' },
      { pattern: /^(Equipment|Tool|Machine|Asset|Fixture)/, category: 'equipment-assets' },
      { pattern: /^(Document|File|Attachment|Version)/, category: 'document-management' },
      { pattern: /^(Time|Labor|Shift|Hour)/, category: 'time-tracking' },
      { pattern: /^(Audit|Compliance|Regulatory|Trace)/, category: 'audit-compliance' },
      { pattern: /^(Cost|Financial|Budget|Rate)/, category: 'cost-tracking' },
      { pattern: /^(Integration|External|Api|Data)/, category: 'integration-external' },
      { pattern: /^(User|Personnel|Person|Employee)/, category: 'user-management' },
      { pattern: /^(Role|Permission|Security|Access)/, category: 'security-access' },
      { pattern: /^(Part|BOM|Component|Product)/, category: 'parts-bom' },
      { pattern: /^(Routing|Template|Operation)/, category: 'operations-routing' }
    ];

    for (const { pattern, category } of patterns) {
      if (pattern.test(modelName)) {
        return category;
      }
    }

    return 'miscellaneous';
  }

  /**
   * Generate modular schema files
   */
  private async generateModularSchemas(): Promise<void> {
    console.log('📝 Generating modular schema files...');

    // Extract schema header (generator, datasource, etc.)
    const header = this.extractSchemaHeader();

    // Group models by category
    const modulesByCategory = this.models.reduce((modules, model) => {
      if (!modules[model.category]) {
        modules[model.category] = [];
      }
      modules[model.category].push(model);
      return modules;
    }, {} as Record<string, ModelInfo[]>);

    // Generate a file for each category
    for (const [category, models] of Object.entries(modulesByCategory)) {
      const categoryConfig = this.config.categories[category] || { description: 'Miscellaneous models' };

      const moduleContent = this.generateModuleContent(category, categoryConfig.description, models, header);
      const filename = `${category}.prisma`;
      const filepath = path.join(this.outputDir, 'modules', filename);

      await fs.promises.writeFile(filepath, moduleContent, 'utf8');
      console.log(`   ✓ Created ${filename} (${models.length} models)`);
    }

    // Generate enum definitions file
    if (this.enums.length > 0) {
      await this.generateEnumsFile(header);
    }
  }

  /**
   * Extract schema header (generator, datasource, etc.)
   */
  private extractSchemaHeader(): string {
    const lines = this.schemaContent.split('\n');
    const headerLines: string[] = [];
    let inModelOrEnum = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('model ') || trimmed.startsWith('enum ')) {
        break;
      }

      if (trimmed.startsWith('generator ') || trimmed.startsWith('datasource ') ||
          trimmed.startsWith('//') || trimmed === '' ||
          (headerLines.length > 0 && (line.startsWith(' ') || line.startsWith('\t')))) {
        headerLines.push(line);
      }
    }

    return headerLines.join('\n') + '\n\n';
  }

  /**
   * Generate content for a module file
   */
  private generateModuleContent(category: string, description: string, models: ModelInfo[], header: string): string {
    const content = [
      header,
      `// ====================================================================`,
      `// ${category.toUpperCase().replace(/-/g, ' ')} MODULE`,
      `// ${description}`,
      `// ====================================================================`,
      '',
      ...models.map(model => model.content)
    ];

    return content.join('\n');
  }

  /**
   * Generate enums file
   */
  private async generateEnumsFile(header: string): Promise<void> {
    const enumDefinitions = this.extractEnumDefinitions();

    const content = [
      header,
      `// ====================================================================`,
      `// ENUMS MODULE`,
      `// Enumeration definitions used across the application`,
      `// ====================================================================`,
      '',
      ...enumDefinitions
    ].join('\n');

    const filepath = path.join(this.outputDir, 'modules', 'enums.prisma');
    await fs.promises.writeFile(filepath, content, 'utf8');
    console.log(`   ✓ Created enums.prisma (${this.enums.length} enums)`);
  }

  /**
   * Extract enum definitions from original schema
   */
  private extractEnumDefinitions(): string[] {
    const lines = this.schemaContent.split('\n');
    const enumDefs: string[] = [];
    let inEnum = false;
    let currentEnum: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('enum ')) {
        inEnum = true;
        currentEnum = [line];
      } else if (inEnum) {
        currentEnum.push(line);
        if (trimmed === '}') {
          enumDefs.push(currentEnum.join('\n'));
          inEnum = false;
          currentEnum = [];
        }
      }
    }

    return enumDefs;
  }

  /**
   * Create build process to combine modules
   */
  private async createBuildProcess(): Promise<void> {
    console.log('🔨 Creating build process...');

    // Create package.json script
    const buildScript = `#!/bin/bash

# Prisma Schema Build Process
# Combines modular schema files into single schema.prisma

echo "🔨 Building Prisma schema from modules..."

OUTPUT_FILE="./prisma/schema.prisma"
MODULES_DIR="${this.outputDir}/modules"

# Create temporary build directory
mkdir -p ./prisma/build

# Start with base configuration
cat > "$OUTPUT_FILE" << 'EOF'
// This file is auto-generated from modular schema files
// Do not edit directly - modify source files in ${this.outputDir}/modules/
// Run 'npm run schema:build' to regenerate

EOF

# Add modules in dependency order
MODULES=(
${Object.entries(this.config.categories)
  .sort(([,a], [,b]) => a.priority - b.priority)
  .map(([category]) => `  "${category}.prisma"`)
  .join('\n')}
  "enums.prisma"
  "miscellaneous.prisma"
)

for module in "\${MODULES[@]}"; do
  MODULE_FILE="$MODULES_DIR/$module"
  if [ -f "$MODULE_FILE" ]; then
    echo "   ✓ Adding $module"

    # Skip the header for non-first modules
    if [ "$module" != "${Object.keys(this.config.categories)[0]}.prisma" ]; then
      tail -n +20 "$MODULE_FILE" >> "$OUTPUT_FILE"
    else
      cat "$MODULE_FILE" >> "$OUTPUT_FILE"
    fi

    echo "" >> "$OUTPUT_FILE"
  fi
done

echo "✅ Schema built successfully: $OUTPUT_FILE"
echo "📊 $(grep -c '^model ' "$OUTPUT_FILE") models, $(grep -c '^enum ' "$OUTPUT_FILE") enums"

# Validate the built schema
npx prisma validate || {
  echo "❌ Schema validation failed"
  exit 1
}

echo "✅ Schema validation passed"
`;

    const buildScriptPath = path.join(this.outputDir, 'build-schema.sh');
    await fs.promises.writeFile(buildScriptPath, buildScript, 'utf8');
    await fs.promises.chmod(buildScriptPath, 0o755);

    // Create npm script entry suggestion
    const packageJsonUpdate = {
      scripts: {
        "schema:build": `bash ${this.outputDir}/build-schema.sh`,
        "schema:dev": "npm run schema:build && npx prisma generate",
        "schema:migrate": "npm run schema:build && npx prisma migrate dev",
        "schema:deploy": "npm run schema:build && npx prisma migrate deploy"
      }
    };

    await fs.promises.writeFile(
      path.join(this.outputDir, 'package-scripts.json'),
      JSON.stringify(packageJsonUpdate, null, 2),
      'utf8'
    );

    console.log(`   ✓ Created build script: ${buildScriptPath}`);
    console.log(`   ✓ Created npm scripts suggestion: ${path.join(this.outputDir, 'package-scripts.json')}`);
  }

  /**
   * Generate modularization report
   */
  private async generateModularizationReport(): Promise<void> {
    const categoryStats = this.models.reduce((stats, model) => {
      const category = model.category;
      if (!stats[category]) {
        stats[category] = { count: 0, models: [] };
      }
      stats[category].count++;
      stats[category].models.push(model.name);
      return stats;
    }, {} as Record<string, { count: number; models: string[] }>);

    const report = `# Prisma Schema Modularization Report

Generated: ${new Date().toLocaleString()}

## Overview

The large Prisma schema (${this.models.length} models, ${fs.statSync(this.schemaPath).size} bytes) has been split into logical modules for better maintainability.

## Module Structure

| Module | Models | Description |
|--------|--------|-------------|
${Object.entries(this.config.categories)
  .map(([category, config]) => {
    const stats = categoryStats[category];
    return `| ${category} | ${stats ? stats.count : 0} | ${config.description} |`;
  })
  .join('\n')}

## Benefits

- ✅ **Improved maintainability** - Logical separation of concerns
- ✅ **Better collaboration** - Teams can work on specific modules
- ✅ **Easier navigation** - Find relevant models quickly
- ✅ **Reduced conflicts** - Fewer merge conflicts in version control
- ✅ **Domain expertise** - Each module aligns with business domains

## Usage

### Build Complete Schema
\`\`\`bash
npm run schema:build
\`\`\`

### Development Workflow
\`\`\`bash
# 1. Edit module files in ${this.outputDir}/modules/
# 2. Build and generate
npm run schema:dev

# 3. Create migration
npm run schema:migrate
\`\`\`

### Module Files

${Object.entries(categoryStats)
  .map(([category, stats]) => `
#### ${category}.prisma (${stats.count} models)
${stats.models.map(model => `- ${model}`).join('\n')}
`)
  .join('\n')}

## File Structure

\`\`\`
${this.outputDir}/
├── modules/
${Object.keys(this.config.categories).map(cat => `│   ├── ${cat}.prisma`).join('\n')}
│   ├── enums.prisma
│   └── miscellaneous.prisma
├── build-schema.sh
├── package-scripts.json
└── modularization-report.md
\`\`\`

## Next Steps

1. **Review module organization** - Ensure models are in appropriate modules
2. **Update development workflow** - Use modular files for schema changes
3. **Add documentation** - Document each module's purpose and dependencies
4. **Set up CI/CD** - Automate schema building in deployment pipeline

---

*Schema modularization completed successfully. Use modular files for all future schema changes.*
`;

    const reportPath = path.join(this.outputDir, 'modularization-report.md');
    await fs.promises.writeFile(reportPath, report, 'utf8');
    console.log(`📋 Modularization report saved to: ${reportPath}`);
  }
}

/**
 * CLI Entry Point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const schemaPath = args[0] || './prisma/schema.prisma';
  const outputDir = args[1] || './prisma/modular';

  console.log('🚀 Prisma Schema Modularization Tool\n');

  try {
    const modularizer = new SchemaModularizer(schemaPath, outputDir);
    await modularizer.modularize();
  } catch (error) {
    console.error('❌ Modularization failed:', error);
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

export default SchemaModularizer;