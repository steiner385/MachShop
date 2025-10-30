#!/usr/bin/env node

/**
 * Generate Data Dictionary CLI Tool
 * Main entry point for generating comprehensive database documentation
 */

import * as path from 'path';
import * as fs from 'fs';
import MetadataExtractor from './metadata-extractor';
import DocumentationGenerator from './doc-generator';

interface CLIOptions {
  schemaPath?: string;
  outputDir?: string;
  formats?: string[];
  verbose?: boolean;
  help?: boolean;
}

class DataDictionaryCLI {
  private options: CLIOptions;

  constructor(args: string[]) {
    this.options = this.parseArgs(args);
  }

  /**
   * Parse command line arguments
   */
  private parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {
      schemaPath: './prisma/schema.prisma',
      outputDir: './docs/generated',
      formats: ['all'],
      verbose: false,
      help: false
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
      }
    }

    return options;
  }

  /**
   * Show help message
   */
  private showHelp(): void {
    console.log(`
📊 MachShop Data Dictionary Generator

USAGE:
  npx tsx src/tools/generate-data-dictionary.ts [OPTIONS]

OPTIONS:
  -s, --schema <path>     Path to Prisma schema file (default: ./prisma/schema.prisma)
  -o, --output <path>     Output directory (default: ./docs/generated)
  -f, --formats <list>    Output formats: html,markdown,csv,json,all (default: all)
  -v, --verbose           Verbose output
  -h, --help              Show this help message

EXAMPLES:
  # Generate all documentation formats
  npx tsx src/tools/generate-data-dictionary.ts

  # Generate only HTML and Markdown
  npx tsx src/tools/generate-data-dictionary.ts --formats html,markdown

  # Use custom schema location
  npx tsx src/tools/generate-data-dictionary.ts --schema ./custom/schema.prisma

  # Generate to custom output directory
  npx tsx src/tools/generate-data-dictionary.ts --output ./docs/custom

OUTPUT FILES:
  📄 schema-tables.md          - Comprehensive Markdown documentation
  🌐 data-dictionary.html      - Interactive HTML data dictionary
  📊 schema-export.csv         - CSV export for spreadsheets
  📋 schema-metadata.json      - Machine-readable schema metadata
  🔗 schema-relationships.md   - Detailed relationship documentation
  📈 schema-summary.md         - High-level analysis and statistics
`);
  }

  /**
   * Run the data dictionary generation
   */
  async run(): Promise<void> {
    if (this.options.help) {
      this.showHelp();
      return;
    }

    try {
      console.log('🚀 Starting MachShop Data Dictionary Generation\n');

      // Validate inputs
      await this.validateInputs();

      // Extract metadata
      console.log('📖 Extracting schema metadata...');
      const extractor = new MetadataExtractor(this.options.schemaPath!);
      const metadata = await extractor.extractMetadata();

      if (this.options.verbose) {
        console.log(`   ✓ Found ${metadata.totalModels} models`);
        console.log(`   ✓ Found ${metadata.totalFields} fields`);
        console.log(`   ✓ Found ${metadata.totalRelationships} relationships`);
        console.log(`   ✓ Found ${metadata.enums.length} enumerations\n`);
      }

      // Generate documentation
      console.log('📝 Generating documentation...');
      const generator = new DocumentationGenerator(metadata, this.options.outputDir!);

      if (this.options.formats!.includes('all')) {
        await generator.generateAll();
      } else {
        await this.generateSelectedFormats(generator);
      }

      // Show completion summary
      await this.showCompletionSummary(metadata);

    } catch (error) {
      console.error('❌ Error generating data dictionary:', error);
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

    // Ensure output directory exists
    await fs.promises.mkdir(this.options.outputDir!, { recursive: true });

    if (this.options.verbose) {
      console.log(`   ✓ Schema file: ${path.resolve(this.options.schemaPath!)}`);
      console.log(`   ✓ Output directory: ${path.resolve(this.options.outputDir!)}\n`);
    }
  }

  /**
   * Generate selected formats
   */
  private async generateSelectedFormats(generator: DocumentationGenerator): Promise<void> {
    const formats = this.options.formats!;

    const tasks = [];

    if (formats.includes('markdown')) {
      tasks.push(generator.generateMarkdownDocumentation());
    }

    if (formats.includes('html')) {
      tasks.push(generator.generateHTMLDataDictionary());
    }

    if (formats.includes('csv')) {
      tasks.push(generator.generateCSVExport());
    }

    if (formats.includes('json')) {
      tasks.push(generator.generateJSONExport());
    }

    await Promise.all(tasks);
  }

  /**
   * Show completion summary
   */
  private async showCompletionSummary(metadata: any): Promise<void> {
    console.log('\n✅ Data Dictionary Generation Complete!\n');

    console.log('📊 STATISTICS:');
    console.log(`   • ${metadata.totalModels} database models documented`);
    console.log(`   • ${metadata.totalFields} fields analyzed`);
    console.log(`   • ${metadata.totalRelationships} relationships mapped`);
    console.log(`   • ${metadata.enums.length} enumerations cataloged\n`);

    console.log('📁 OUTPUT FILES:');
    const outputDir = path.resolve(this.options.outputDir!);

    const expectedFiles = [
      'schema-tables.md',
      'data-dictionary.html',
      'schema-export.csv',
      'schema-metadata.json',
      'schema-relationships.md',
      'schema-summary.md'
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
    console.log('\n🌐 To view the interactive HTML data dictionary:');
    console.log(`   open ${path.join(outputDir, 'data-dictionary.html')}\n`);

    // Show quick access commands
    console.log('🔗 QUICK ACCESS:');
    console.log(`   # View main documentation`);
    console.log(`   cat ${path.join(outputDir, 'schema-summary.md')}\n`);
    console.log(`   # Import to spreadsheet`);
    console.log(`   open ${path.join(outputDir, 'schema-export.csv')}\n`);
    console.log(`   # API integration`);
    console.log(`   cat ${path.join(outputDir, 'schema-metadata.json')}\n`);
  }
}

/**
 * CLI Entry Point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cli = new DataDictionaryCLI(args);
  await cli.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default DataDictionaryCLI;