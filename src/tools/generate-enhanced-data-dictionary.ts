#!/usr/bin/env node

/**
 * Generate Enhanced Data Dictionary CLI Tool
 * Main entry point for generating enhanced database documentation with external docs
 */

import * as path from 'path';
import * as fs from 'fs';
import EnhancedMetadataExtractor, { DocumentationCoverageReport } from './enhanced-metadata-extractor';
import EnhancedDocumentationGenerator from './enhanced-doc-generator';
import DocumentationGenerator from './doc-generator';

interface EnhancedCLIOptions {
  schemaPath?: string;
  docsPath?: string;
  outputDir?: string;
  formats?: string[];
  verbose?: boolean;
  help?: boolean;
  coverage?: boolean;
  generateTemplates?: boolean;
  templateDir?: string;
}

class EnhancedDataDictionaryCLI {
  private options: EnhancedCLIOptions;

  constructor(args: string[]) {
    this.options = this.parseArgs(args);
  }

  /**
   * Parse command line arguments
   */
  private parseArgs(args: string[]): EnhancedCLIOptions {
    const options: EnhancedCLIOptions = {
      schemaPath: './prisma/schema.prisma',
      docsPath: './docs/schema-documentation',
      outputDir: './docs/generated',
      formats: ['all'],
      verbose: false,
      help: false,
      coverage: false,
      generateTemplates: false,
      templateDir: './docs/schema-documentation/generated-templates'
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--help':
        case '-h':
          options.help = true;
          break;

        case '--schema':
        case '-s':
          options.schemaPath = args[++i];
          break;

        case '--docs':
        case '-d':
          options.docsPath = args[++i];
          break;

        case '--output':
        case '-o':
          options.outputDir = args[++i];
          break;

        case '--formats':
        case '-f':
          options.formats = args[++i].split(',');
          break;

        case '--verbose':
        case '-v':
          options.verbose = true;
          break;

        case '--coverage':
        case '-c':
          options.coverage = true;
          break;

        case '--generate-templates':
        case '-t':
          options.generateTemplates = true;
          break;

        case '--template-dir':
          options.templateDir = args[++i];
          break;
      }
    }

    return options;
  }

  /**
   * Show help message
   */
  private showHelp(): void {
    console.log(`
📊 MachShop Enhanced Data Dictionary Generator

USAGE:
  npx tsx src/tools/generate-enhanced-data-dictionary.ts [OPTIONS]

OPTIONS:
  -s, --schema <path>        Path to Prisma schema file (default: ./prisma/schema.prisma)
  -d, --docs <path>          Path to external documentation directory (default: ./docs/schema-documentation)
  -o, --output <path>        Output directory (default: ./docs/generated)
  -f, --formats <list>       Output formats: html,markdown,csv,json,all (default: all)
  -c, --coverage             Generate documentation coverage report
  -t, --generate-templates   Generate templates for missing documentation
  --template-dir <path>      Template output directory (default: ./docs/schema-documentation/generated-templates)
  -v, --verbose              Verbose output
  -h, --help                 Show this help message

EXAMPLES:
  # Generate enhanced documentation with external docs
  npx tsx src/tools/generate-enhanced-data-dictionary.ts

  # Generate only enhanced HTML and Markdown
  npx tsx src/tools/generate-enhanced-data-dictionary.ts --formats html,markdown

  # Generate coverage report
  npx tsx src/tools/generate-enhanced-data-dictionary.ts --coverage

  # Generate templates for missing documentation
  npx tsx src/tools/generate-enhanced-data-dictionary.ts --generate-templates

  # Use custom external documentation location
  npx tsx src/tools/generate-enhanced-data-dictionary.ts --docs ./custom-docs

EXTERNAL DOCUMENTATION STRUCTURE:
  docs/schema-documentation/
  ├── table-descriptions.json      # Table-level descriptions and metadata
  ├── field-descriptions.json      # Field-level descriptions and business rules
  ├── business-rules.json         # Cross-table business rules and constraints
  └── templates/                  # Templates for new documentation

OUTPUT FILES:
  📄 schema-tables-enhanced.md     - Enhanced Markdown documentation with business context
  🌐 data-dictionary.html          - Interactive HTML data dictionary
  📊 schema-export.csv             - CSV export for spreadsheets
  📋 schema-metadata.json          - Machine-readable schema metadata
  🔗 schema-relationships.md       - Detailed relationship documentation
  📈 schema-summary.md             - High-level analysis and statistics
  📈 coverage-report.md            - Documentation coverage analysis
`);
  }

  /**
   * Run the enhanced data dictionary generation
   */
  async run(): Promise<void> {
    if (this.options.help) {
      this.showHelp();
      return;
    }

    try {
      console.log('🚀 Starting Enhanced MachShop Data Dictionary Generation\n');

      // Validate inputs
      await this.validateInputs();

      // Initialize enhanced metadata extractor
      const extractor = new EnhancedMetadataExtractor(this.options.schemaPath!, this.options.docsPath!);

      // Generate templates if requested
      if (this.options.generateTemplates) {
        await this.generateTemplates(extractor);
        return;
      }

      // Generate coverage report if requested
      if (this.options.coverage) {
        await this.generateCoverageReport(extractor);
        return;
      }

      // Extract enhanced metadata
      console.log('📖 Extracting enhanced schema metadata...');
      const metadata = await extractor.extractEnhancedMetadata();

      if (this.options.verbose) {
        console.log(`   ✓ Found ${metadata.totalModels} models`);
        console.log(`   ✓ Found ${metadata.totalFields} fields`);
        console.log(`   ✓ Found ${metadata.totalRelationships} relationships`);
        console.log(`   ✓ Found ${metadata.enums.length} enumerations\n`);
      }

      // Generate enhanced documentation
      console.log('📝 Generating enhanced documentation...');

      if (this.options.formats!.includes('all')) {
        await this.generateAllFormats(metadata);
      } else {
        await this.generateSelectedFormats(metadata);
      }

      // Generate coverage report alongside documentation
      await this.generateCoverageReport(extractor, false);

      // Show completion summary
      await this.showCompletionSummary(metadata);

    } catch (error) {
      console.error('❌ Error generating enhanced data dictionary:', error);
      process.exit(1);
    }
  }

  /**
   * Validate inputs
   */
  private async validateInputs(): Promise<void> {
    // Check if schema file exists
    if (!fs.existsSync(this.options.schemaPath!)) {
      throw new Error(`Schema file not found: ${this.options.schemaPath}`);
    }

    // Check if external docs directory exists, create if not
    if (!fs.existsSync(this.options.docsPath!)) {
      console.log(`⚠️  External documentation directory not found: ${this.options.docsPath}`);
      console.log('   📁 Creating directory structure...');
      await fs.promises.mkdir(this.options.docsPath!, { recursive: true });
      await this.createInitialDocumentationStructure();
    }

    // Ensure output directory exists
    await fs.promises.mkdir(this.options.outputDir!, { recursive: true });

    if (this.options.verbose) {
      console.log(`   ✓ Schema file: ${path.resolve(this.options.schemaPath!)}`);
      console.log(`   ✓ External docs: ${path.resolve(this.options.docsPath!)}`);
      console.log(`   ✓ Output directory: ${path.resolve(this.options.outputDir!)}\n`);
    }
  }

  /**
   * Create initial documentation structure if it doesn't exist
   */
  private async createInitialDocumentationStructure(): Promise<void> {
    const docsPath = this.options.docsPath!;

    // Create empty documentation files
    const emptyTableDocs = {};
    const emptyFieldDocs = {};
    const emptyBusinessRules = {};

    await fs.promises.writeFile(
      path.join(docsPath, 'table-descriptions.json'),
      JSON.stringify(emptyTableDocs, null, 2)
    );

    await fs.promises.writeFile(
      path.join(docsPath, 'field-descriptions.json'),
      JSON.stringify(emptyFieldDocs, null, 2)
    );

    await fs.promises.writeFile(
      path.join(docsPath, 'business-rules.json'),
      JSON.stringify(emptyBusinessRules, null, 2)
    );

    console.log(`   ✓ Created initial documentation structure in ${docsPath}`);
  }

  /**
   * Generate all documentation formats
   */
  private async generateAllFormats(metadata: any): Promise<void> {
    const enhancedGenerator = new EnhancedDocumentationGenerator(metadata, this.options.outputDir!);
    const standardGenerator = new DocumentationGenerator(metadata, this.options.outputDir!);

    await Promise.all([
      enhancedGenerator.generateMarkdownDocumentation(), // Enhanced markdown
      standardGenerator.generateHTMLDataDictionary(),     // Standard HTML (enhanced version would be complex)
      standardGenerator.generateCSVExport(),              // Standard CSV
      standardGenerator.generateJSONExport(),             // Standard JSON
      standardGenerator.generateRelationshipDocumentation(), // Standard relationships
      standardGenerator.generateSummaryReport()           // Standard summary
    ]);
  }

  /**
   * Generate selected formats
   */
  private async generateSelectedFormats(metadata: any): Promise<void> {
    const enhancedGenerator = new EnhancedDocumentationGenerator(metadata, this.options.outputDir!);
    const standardGenerator = new DocumentationGenerator(metadata, this.options.outputDir!);

    const formats = this.options.formats!;
    const tasks = [];

    if (formats.includes('markdown')) {
      tasks.push(enhancedGenerator.generateMarkdownDocumentation());
    }

    if (formats.includes('html')) {
      tasks.push(standardGenerator.generateHTMLDataDictionary());
    }

    if (formats.includes('csv')) {
      tasks.push(standardGenerator.generateCSVExport());
    }

    if (formats.includes('json')) {
      tasks.push(standardGenerator.generateJSONExport());
    }

    await Promise.all(tasks);
  }

  /**
   * Generate documentation coverage report
   */
  private async generateCoverageReport(extractor: EnhancedMetadataExtractor, exitAfter: boolean = true): Promise<void> {
    console.log('📊 Generating documentation coverage report...');

    const report = await extractor.generateCoverageReport();
    const coverageContent = this.formatCoverageReport(report);

    const outputPath = path.join(this.options.outputDir!, 'coverage-report.md');
    await fs.promises.writeFile(outputPath, coverageContent, 'utf8');

    console.log(`📈 Coverage report generated: ${outputPath}`);

    if (this.options.verbose || exitAfter) {
      this.displayCoverageSummary(report);
    }

    if (exitAfter) {
      console.log('\n💡 To improve coverage, run with --generate-templates to create documentation templates');
    }
  }

  /**
   * Format coverage report
   */
  private formatCoverageReport(report: DocumentationCoverageReport): string {
    let content = `# Documentation Coverage Report

Generated: ${new Date().toLocaleString()}

## Summary

| Metric | Value | Coverage |
|--------|-------|----------|
| **Tables** | ${report.tablesWithDocumentation} / ${report.totalTables} | ${Math.round((report.tablesWithDocumentation / report.totalTables) * 100)}% |
| **Fields** | ${report.fieldsWithDocumentation} / ${report.totalFields} | ${Math.round((report.fieldsWithDocumentation / report.totalFields) * 100)}% |

## Coverage by Category

| Category | Tables | Table Coverage | Fields | Field Coverage |
|----------|--------|----------------|--------|----------------|
`;

    for (const [category, stats] of Object.entries(report.coverageByCategory)) {
      const tableCoverage = Math.round((stats.tablesWithDocs / stats.tables) * 100);
      const fieldCoverage = Math.round((stats.fieldsWithDocs / stats.fields) * 100);
      content += `| ${category} | ${stats.tablesWithDocs}/${stats.tables} | ${tableCoverage}% | ${stats.fieldsWithDocs}/${stats.fields} | ${fieldCoverage}% |\n`;
    }

    content += `\n## Missing Documentation

### Tables Without Documentation (${report.missingDocumentation.tables.length})
`;

    for (const table of report.missingDocumentation.tables.slice(0, 20)) {
      content += `- ${table}\n`;
    }

    if (report.missingDocumentation.tables.length > 20) {
      content += `\n... and ${report.missingDocumentation.tables.length - 20} more tables.\n`;
    }

    content += `\n### Fields Without Documentation (${report.missingDocumentation.fields.length})
`;

    for (const field of report.missingDocumentation.fields.slice(0, 30)) {
      content += `- ${field}\n`;
    }

    if (report.missingDocumentation.fields.length > 30) {
      content += `\n... and ${report.missingDocumentation.fields.length - 30} more fields.\n`;
    }

    content += `\n## Recommendations

### Priority Actions
1. **Document core tables**: Focus on User, WorkOrder, QualityPlan, Equipment, Material
2. **Add field descriptions**: Prioritize fields marked with business rules or constraints
3. **Define data owners**: Specify responsible teams for each category
4. **Add compliance notes**: Document PII and regulatory requirements

### Quick Wins
- Use \`--generate-templates\` to create documentation scaffolding
- Start with high-usage tables that appear in common queries
- Document integration points first for external system clarity

---

*Run \`npm run docs:schema:enhanced --generate-templates\` to create templates for missing documentation.*
`;

    return content;
  }

  /**
   * Display coverage summary in console
   */
  private displayCoverageSummary(report: DocumentationCoverageReport): void {
    const tableCoverage = Math.round((report.tablesWithDocumentation / report.totalTables) * 100);
    const fieldCoverage = Math.round((report.fieldsWithDocumentation / report.totalFields) * 100);

    console.log(`\n📊 COVERAGE SUMMARY:`);
    console.log(`   • Tables: ${report.tablesWithDocumentation}/${report.totalTables} (${tableCoverage}%)`);
    console.log(`   • Fields: ${report.fieldsWithDocumentation}/${report.totalFields} (${fieldCoverage}%)`);
    console.log(`   • Missing table docs: ${report.missingDocumentation.tables.length}`);
    console.log(`   • Missing field docs: ${report.missingDocumentation.fields.length}`);
  }

  /**
   * Generate templates for missing documentation
   */
  private async generateTemplates(extractor: EnhancedMetadataExtractor): Promise<void> {
    console.log('📝 Generating documentation templates...');

    await extractor.generateDocumentationTemplates(this.options.templateDir!);

    console.log(`\n✅ Templates generated in: ${this.options.templateDir}`);
    console.log('\n📋 Next steps:');
    console.log('   1. Review generated templates');
    console.log('   2. Fill in documentation with subject matter experts');
    console.log('   3. Move completed sections to main documentation files');
    console.log('   4. Run enhanced data dictionary generation again');
  }

  /**
   * Show completion summary
   */
  private async showCompletionSummary(metadata: any): Promise<void> {
    console.log('\n✅ Enhanced Data Dictionary Generation Complete!\n');

    console.log('📊 STATISTICS:');
    console.log(`   • ${metadata.totalModels} database models documented`);
    console.log(`   • ${metadata.totalFields} fields analyzed`);
    console.log(`   • ${metadata.totalRelationships} relationships mapped`);
    console.log(`   • ${metadata.enums.length} enumerations cataloged\n`);

    console.log('📁 OUTPUT FILES:');
    const outputDir = path.resolve(this.options.outputDir!);

    const expectedFiles = [
      'schema-tables-enhanced.md',
      'data-dictionary.html',
      'schema-export.csv',
      'schema-metadata.json',
      'schema-relationships.md',
      'schema-summary.md',
      'coverage-report.md'
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(outputDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        console.log(`   ✓ ${file} (${sizeKB} KB)`);
      }
    }

    console.log(`\n📂 All files saved to: ${outputDir}`);
    console.log('\n🌐 To view enhanced documentation:');
    console.log(`   # Enhanced business context`);
    console.log(`   cat ${path.join(outputDir, 'schema-tables-enhanced.md')}\n`);
    console.log(`   # Interactive data dictionary`);
    console.log(`   open ${path.join(outputDir, 'data-dictionary.html')}\n`);
    console.log(`   # Coverage analysis`);
    console.log(`   cat ${path.join(outputDir, 'coverage-report.md')}\n`);
  }
}

/**
 * CLI Entry Point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cli = new EnhancedDataDictionaryCLI(args);
  await cli.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default EnhancedDataDictionaryCLI;