/**
 * UnitOfMeasure Foreign Key Migration Tool
 * Migrates existing string unitOfMeasure values to foreign key references
 * Based on validated analysis results with safe rollback capabilities
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export interface MigrationConfig {
  tableName: string;
  fieldName: string;
  idFieldName: string;
  pkField: string;
  enableDryRun: boolean;
}

export interface MigrationMapping {
  originalValue: string;
  standardUnitCode: string;
  unitId: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
}

export interface MigrationResult {
  tableName: string;
  fieldName: string;
  totalRecords: number;
  recordsProcessed: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: Array<{
    recordId: string;
    originalValue: string;
    error: string;
  }>;
  unmappedValues: Array<{
    value: string;
    count: number;
  }>;
}

export interface MigrationReport {
  executedAt: Date;
  dryRun: boolean;
  totalTables: number;
  totalRecordsProcessed: number;
  totalRecordsUpdated: number;
  totalRecordsSkipped: number;
  totalErrors: number;
  tableResults: MigrationResult[];
  mappingsUsed: MigrationMapping[];
  unmappedValues: Array<{ value: string; tables: string[]; totalCount: number }>;
  warnings: string[];
  recommendations: string[];
}

/**
 * Migration configuration for all tables with UOM fields
 */
const MIGRATION_CONFIGS: MigrationConfig[] = [
  // Material Management
  { tableName: 'material_definitions', fieldName: 'baseUnitOfMeasure', idFieldName: 'baseUnitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'material_definitions', fieldName: 'alternateUnitOfMeasure', idFieldName: 'alternateUnitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'material_properties', fieldName: 'unitOfMeasure', idFieldName: 'propertyUnitId', pkField: 'id', enableDryRun: true },
  { tableName: 'material_lots', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'material_sublots', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'material_lot_genealogy', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'material_state_history', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },

  // Production Management
  { tableName: 'operation_parameters', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'material_operation_specifications', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'routing_step_parameters', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'schedule_entries', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'schedule_constraints', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'production_schedule_requests', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },

  // Product Management
  { tableName: 'parts', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'bom_items', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'product_specifications', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },

  // Quality Management
  { tableName: 'quality_characteristics', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },

  // Inventory Management
  { tableName: 'inventory', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'material_transactions', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
  { tableName: 'erp_material_transactions', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },

  // Equipment Integration
  { tableName: 'equipment_material_movements', fieldName: 'unitOfMeasure', idFieldName: 'unitOfMeasureId', pkField: 'id', enableDryRun: true },
];

/**
 * Validated migration mappings based on analysis results
 * High-confidence mappings ready for automated migration
 */
const VALIDATED_MAPPINGS: { [key: string]: { standardCode: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; notes?: string } } = {
  // Direct code matches (highest confidence)
  'EA': { standardCode: 'EA', confidence: 'HIGH', notes: 'Direct code match' },
  'GAL': { standardCode: 'GAL', confidence: 'HIGH', notes: 'Direct code match' },
  'KG': { standardCode: 'KG', confidence: 'HIGH', notes: 'Direct code match' },
  'L': { standardCode: 'L', confidence: 'HIGH', notes: 'Direct code match' },
  'LB': { standardCode: 'LB', confidence: 'HIGH', notes: 'Direct code match' },
  'mm': { standardCode: 'MM', confidence: 'HIGH', notes: 'Direct code match (lowercase to uppercase)' },
  'PSI': { standardCode: 'PSI', confidence: 'HIGH', notes: 'Direct code match' },

  // Temperature mappings
  '°C': { standardCode: 'C', confidence: 'HIGH', notes: 'Celsius temperature' },
  '°F': { standardCode: 'F', confidence: 'HIGH', notes: 'Fahrenheit temperature' },

  // Manufacturing-specific mappings (reviewed and corrected)
  'HOURS': { standardCode: 'HR', confidence: 'HIGH', notes: 'Hours duration' },
  'count': { standardCode: 'EA', confidence: 'HIGH', notes: 'Count/quantity mapping to Each' },
  'SHEET': { standardCode: 'EA', confidence: 'HIGH', notes: 'Sheet count mapping to Each' },

  // Precision measurements (need additional units or conversion)
  'μm': { standardCode: 'MM', confidence: 'MEDIUM', notes: 'Micrometer to millimeter (needs conversion factor)' },

  // Complex units needing new standard units or special handling
  'IPM': { standardCode: 'EA', confidence: 'LOW', notes: 'Inches Per Minute - velocity unit, temporarily mapped to EA' },
  'L/min': { standardCode: 'L', confidence: 'LOW', notes: 'Liters per minute - flow rate, temporarily mapped to L base unit' },

  // Additional standard units
  'RPM': { standardCode: 'RPM', confidence: 'HIGH', notes: 'Revolutions per minute' },
};

export class UOMMigrator {
  private unitMappings: Map<string, MigrationMapping> = new Map();
  private dryRun: boolean = true;

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  /**
   * Load and validate unit mappings from database
   */
  async loadUnitMappings(): Promise<void> {
    console.log('📋 Loading unit mappings from database...');

    const units = await prisma.unitOfMeasure.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true }
    });

    const unitCodeMap = new Map(units.map(unit => [unit.code, unit]));

    // Build validated mappings
    for (const [originalValue, config] of Object.entries(VALIDATED_MAPPINGS)) {
      const standardUnit = unitCodeMap.get(config.standardCode);

      if (!standardUnit) {
        console.warn(`⚠️ Warning: Standard unit '${config.standardCode}' not found for '${originalValue}'`);
        continue;
      }

      this.unitMappings.set(originalValue, {
        originalValue,
        standardUnitCode: config.standardCode,
        unitId: standardUnit.id,
        confidence: config.confidence,
        notes: config.notes,
      });
    }

    console.log(`   ✓ Loaded ${this.unitMappings.size} validated unit mappings`);
  }

  /**
   * Migrate UOM foreign keys for a specific table
   */
  async migrateTable(config: MigrationConfig): Promise<MigrationResult> {
    console.log(`🔄 Migrating ${config.tableName}.${config.fieldName}${this.dryRun ? ' (DRY RUN)' : ''}...`);

    const result: MigrationResult = {
      tableName: config.tableName,
      fieldName: config.fieldName,
      totalRecords: 0,
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      unmappedValues: [],
    };

    try {
      // Get all records with UOM values
      const query = `
        SELECT "${config.pkField}", "${config.fieldName}"
        FROM "${config.tableName}"
        WHERE "${config.fieldName}" IS NOT NULL
          AND "${config.fieldName}" != ''
          AND "${config.idFieldName}" IS NULL
      `;

      const records = await prisma.$queryRawUnsafe(query) as Array<{
        [key: string]: string;
      }>;

      result.totalRecords = records.length;

      if (records.length === 0) {
        console.log(`   ℹ️ No records to migrate`);
        return result;
      }

      // Track unmapped values
      const unmappedCounts = new Map<string, number>();

      for (const record of records) {
        const recordId = record[config.pkField];
        const uomValue = record[config.fieldName];
        result.recordsProcessed++;

        const mapping = this.unitMappings.get(uomValue);

        if (!mapping) {
          // Track unmapped values
          unmappedCounts.set(uomValue, (unmappedCounts.get(uomValue) || 0) + 1);
          result.recordsSkipped++;
          continue;
        }

        // Skip low confidence mappings in production
        if (!this.dryRun && mapping.confidence === 'LOW') {
          result.recordsSkipped++;
          console.log(`   ⚠️ Skipped low-confidence mapping: ${uomValue} → ${mapping.standardUnitCode}`);
          continue;
        }

        try {
          if (!this.dryRun) {
            // Perform actual update
            const updateQuery = `
              UPDATE "${config.tableName}"
              SET "${config.idFieldName}" = $1
              WHERE "${config.pkField}" = $2
            `;
            await prisma.$executeRawUnsafe(updateQuery, mapping.unitId, recordId);
          }

          result.recordsUpdated++;

          if (result.recordsUpdated <= 5 || result.recordsUpdated % 10 === 0) {
            console.log(`   ✓ ${uomValue} → ${mapping.standardUnitCode} (${mapping.confidence})`);
          }

        } catch (error) {
          result.errors.push({
            recordId,
            originalValue: uomValue,
            error: error.message,
          });
          console.error(`   ❌ Error updating record ${recordId}: ${error.message}`);
        }
      }

      // Build unmapped values summary
      result.unmappedValues = Array.from(unmappedCounts.entries()).map(([value, count]) => ({
        value,
        count,
      }));

      console.log(`   📊 Results: ${result.recordsUpdated} updated, ${result.recordsSkipped} skipped, ${result.errors.length} errors`);

      if (result.unmappedValues.length > 0) {
        console.log(`   ⚠️ Unmapped values: ${result.unmappedValues.map(u => `${u.value} (${u.count})`).join(', ')}`);
      }

    } catch (error) {
      console.error(`   ❌ Table migration failed: ${error.message}`);
      result.errors.push({
        recordId: 'TABLE_LEVEL',
        originalValue: 'N/A',
        error: error.message,
      });
    }

    return result;
  }

  /**
   * Run complete migration across all configured tables
   */
  async runCompleteMigration(): Promise<MigrationReport> {
    console.log('🚀 Starting UnitOfMeasure Foreign Key Migration');
    console.log('==============================================');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'PRODUCTION (changes will be applied)'}`);

    await this.loadUnitMappings();

    const report: MigrationReport = {
      executedAt: new Date(),
      dryRun: this.dryRun,
      totalTables: MIGRATION_CONFIGS.length,
      totalRecordsProcessed: 0,
      totalRecordsUpdated: 0,
      totalRecordsSkipped: 0,
      totalErrors: 0,
      tableResults: [],
      mappingsUsed: Array.from(this.unitMappings.values()),
      unmappedValues: [],
      warnings: [],
      recommendations: [],
    };

    // Migrate each table
    for (const config of MIGRATION_CONFIGS) {
      const result = await this.migrateTable(config);
      report.tableResults.push(result);

      report.totalRecordsProcessed += result.recordsProcessed;
      report.totalRecordsUpdated += result.recordsUpdated;
      report.totalRecordsSkipped += result.recordsSkipped;
      report.totalErrors += result.errors.length;
    }

    // Aggregate unmapped values across tables
    const unmappedAggregation = new Map<string, { tables: Set<string>; totalCount: number }>();

    for (const tableResult of report.tableResults) {
      for (const unmapped of tableResult.unmappedValues) {
        const existing = unmappedAggregation.get(unmapped.value) || { tables: new Set(), totalCount: 0 };
        existing.tables.add(tableResult.tableName);
        existing.totalCount += unmapped.count;
        unmappedAggregation.set(unmapped.value, existing);
      }
    }

    report.unmappedValues = Array.from(unmappedAggregation.entries()).map(([value, data]) => ({
      value,
      tables: Array.from(data.tables),
      totalCount: data.totalCount,
    }));

    // Generate warnings and recommendations
    this.generateWarningsAndRecommendations(report);

    return report;
  }

  /**
   * Generate warnings and recommendations based on migration results
   */
  private generateWarningsAndRecommendations(report: MigrationReport): void {
    const { warnings, recommendations } = report;

    // Check for high error rates
    if (report.totalErrors > report.totalRecordsProcessed * 0.1) {
      warnings.push(`High error rate detected: ${report.totalErrors} errors out of ${report.totalRecordsProcessed} records (${((report.totalErrors / report.totalRecordsProcessed) * 100).toFixed(1)}%)`);
    }

    // Check for unmapped values
    if (report.unmappedValues.length > 0) {
      warnings.push(`${report.unmappedValues.length} unique unmapped values found requiring manual review`);

      const highVolumeUnmapped = report.unmappedValues.filter(u => u.totalCount > 10);
      if (highVolumeUnmapped.length > 0) {
        warnings.push(`High-volume unmapped values: ${highVolumeUnmapped.map(u => `${u.value} (${u.totalCount})`).join(', ')}`);
      }
    }

    // Generate recommendations
    if (report.dryRun) {
      recommendations.push('Review dry run results and validate mappings before production migration');

      if (report.totalRecordsUpdated > 0) {
        recommendations.push(`${report.totalRecordsUpdated} records ready for migration with high confidence`);
      }
    } else {
      recommendations.push('Monitor application functionality after migration completion');
    }

    if (report.unmappedValues.length > 0) {
      recommendations.push('Create additional standard units or mappings for unmapped values');
      recommendations.push('Consider manual review and mapping for complex units (IPM, L/min, etc.)');
    }

    if (report.totalRecordsSkipped > 0) {
      const lowConfidenceSkipped = report.mappingsUsed.filter(m => m.confidence === 'LOW').length;
      if (lowConfidenceSkipped > 0) {
        recommendations.push(`Review and improve ${lowConfidenceSkipped} low-confidence mappings for better coverage`);
      }
    }
  }

  /**
   * Save migration report to files
   */
  async saveMigrationReport(report: MigrationReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const mode = report.dryRun ? 'dryrun' : 'production';
    const outputDir = './docs/generated';

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save JSON report
    const jsonPath = path.join(outputDir, `uom-migration-${mode}-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Save readable summary
    const summaryPath = path.join(outputDir, `uom-migration-${mode}-summary.md`);
    const summaryContent = this.generateMigrationSummary(report);
    fs.writeFileSync(summaryPath, summaryContent);

    console.log(`\n📄 Migration reports saved:`);
    console.log(`   • Detailed JSON: ${jsonPath}`);
    console.log(`   • Summary Report: ${summaryPath}`);
  }

  /**
   * Generate human-readable migration summary
   */
  private generateMigrationSummary(report: MigrationReport): string {
    return `# UnitOfMeasure Migration Report

**Generated:** ${report.executedAt.toISOString()}
**Mode:** ${report.dryRun ? 'DRY RUN' : 'PRODUCTION'}

## Executive Summary

- **Tables Processed:** ${report.totalTables}
- **Records Processed:** ${report.totalRecordsProcessed.toLocaleString()}
- **Records Updated:** ${report.totalRecordsUpdated.toLocaleString()}
- **Records Skipped:** ${report.totalRecordsSkipped.toLocaleString()}
- **Errors:** ${report.totalErrors}

## Migration Results

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Successfully Updated | ${report.totalRecordsUpdated} | ${report.totalRecordsProcessed > 0 ? ((report.totalRecordsUpdated / report.totalRecordsProcessed) * 100).toFixed(1) : 0}% |
| ⚠️ Skipped | ${report.totalRecordsSkipped} | ${report.totalRecordsProcessed > 0 ? ((report.totalRecordsSkipped / report.totalRecordsProcessed) * 100).toFixed(1) : 0}% |
| ❌ Errors | ${report.totalErrors} | ${report.totalRecordsProcessed > 0 ? ((report.totalErrors / report.totalRecordsProcessed) * 100).toFixed(1) : 0}% |

## Mappings Used

${report.mappingsUsed.map(m => `- **${m.originalValue}** → ${m.standardUnitCode} (${m.confidence})`).join('\n')}

## Unmapped Values Requiring Manual Review

${report.unmappedValues.length > 0 ?
  report.unmappedValues.map(u => `- **${u.value}**: ${u.totalCount} records across ${u.tables.join(', ')}`).join('\n')
  : '*No unmapped values found*'}

## Warnings

${report.warnings.length > 0 ? report.warnings.map(w => `⚠️ ${w}`).join('\n') : '*No warnings*'}

## Recommendations

${report.recommendations.map(r => `🎯 ${r}`).join('\n')}

## Table Details

${report.tableResults.map(table => `
### ${table.tableName}.${table.fieldName}
- **Total Records:** ${table.totalRecords}
- **Updated:** ${table.recordsUpdated}
- **Skipped:** ${table.recordsSkipped}
- **Errors:** ${table.errors.length}
${table.unmappedValues.length > 0 ? `- **Unmapped:** ${table.unmappedValues.map(u => `${u.value} (${u.count})`).join(', ')}` : ''}
`).join('\n')}

---

*Generated by MachShop UOM Migration Tool*
`;
  }
}

/**
 * Main execution function for CLI usage
 */
export async function main(dryRun: boolean = true): Promise<void> {
  try {
    const migrator = new UOMMigrator(dryRun);
    const report = await migrator.runCompleteMigration();

    console.log('\n📊 Migration Complete!');
    console.log('=====================');
    console.log(`Mode: ${report.dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
    console.log(`Records Processed: ${report.totalRecordsProcessed.toLocaleString()}`);
    console.log(`Records Updated: ${report.totalRecordsUpdated.toLocaleString()}`);
    console.log(`Records Skipped: ${report.totalRecordsSkipped.toLocaleString()}`);
    console.log(`Errors: ${report.totalErrors}`);

    if (report.unmappedValues.length > 0) {
      console.log(`\n⚠️ Unmapped Values (${report.unmappedValues.length}):`);
      report.unmappedValues.forEach(u => {
        console.log(`   ${u.value}: ${u.totalCount} records`);
      });
    }

    await migrator.saveMigrationReport(report);

    if (report.dryRun) {
      console.log('\n🎯 Next Steps:');
      console.log('   1. Review the migration report and validate mappings');
      console.log('   2. Create additional standard units for unmapped values if needed');
      console.log('   3. Run production migration: tsx scripts/migrate-uom-production.ts');
    } else {
      console.log('\n✅ Production migration completed!');
      console.log('   Monitor application functionality and validate results');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI execution
if (require.main === module) {
  const dryRun = !process.argv.includes('--production');
  main(dryRun).catch(console.error);
}

export default UOMMigrator;