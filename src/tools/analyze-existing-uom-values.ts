/**
 * UOM Migration Analysis Tool
 * Analyzes existing string unitOfMeasure values across all tables to prepare for migration
 * Maps current values to new standardized UnitOfMeasure lookup table
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export interface UOMAnalysisResult {
  tableName: string;
  fieldName: string;
  totalRecords: number;
  recordsWithUOM: number;
  uniqueValues: Array<{
    value: string;
    count: number;
    percentage: number;
    suggestedMapping?: string;
    mappingConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNMAPPED';
    notes?: string;
  }>;
}

export interface MigrationMapping {
  originalValue: string;
  standardUnitCode: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  requiresReview: boolean;
  notes?: string;
}

export interface AnalysisReport {
  executedAt: Date;
  totalTablesAnalyzed: number;
  totalRecordsAnalyzed: number;
  totalUniqueValues: number;
  mappingStats: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    unmapped: number;
  };
  tableResults: UOMAnalysisResult[];
  migrationMappings: MigrationMapping[];
  recommendations: string[];
  dataQualityIssues: string[];
}

/**
 * Define all tables and fields that contain unitOfMeasure strings
 * Using actual database column names (camelCase)
 */
const UOM_FIELDS_CONFIG = [
  // Material Management
  { table: 'material_definitions', field: 'baseUnitOfMeasure' },
  { table: 'material_definitions', field: 'alternateUnitOfMeasure' },
  { table: 'material_properties', field: 'unitOfMeasure' },
  { table: 'material_lots', field: 'unitOfMeasure' },
  { table: 'material_sublots', field: 'unitOfMeasure' },
  { table: 'material_lot_genealogy', field: 'unitOfMeasure' },
  { table: 'material_state_history', field: 'unitOfMeasure' },

  // Production Management
  { table: 'operation_parameters', field: 'unitOfMeasure' },
  { table: 'material_operation_specifications', field: 'unitOfMeasure' },
  { table: 'routing_step_parameters', field: 'unitOfMeasure' },
  { table: 'schedule_entries', field: 'unitOfMeasure' },
  { table: 'schedule_constraints', field: 'unitOfMeasure' },
  { table: 'production_schedule_requests', field: 'unitOfMeasure' },

  // Product Management
  { table: 'parts', field: 'unitOfMeasure' },
  { table: 'parts', field: 'weightUnit' },
  { table: 'bom_items', field: 'unitOfMeasure' },
  { table: 'product_specifications', field: 'unitOfMeasure' },

  // Quality Management
  { table: 'quality_characteristics', field: 'unitOfMeasure' },

  // Inventory Management
  { table: 'inventory', field: 'unitOfMeasure' },
  { table: 'material_transactions', field: 'unitOfMeasure' },
  { table: 'erp_material_transactions', field: 'unitOfMeasure' },

  // Equipment Integration
  { table: 'equipment_material_movements', field: 'unitOfMeasure' },
];

/**
 * Standard unit mapping patterns for automated matching
 */
const UNIT_MAPPING_PATTERNS = [
  // Quantity/Count
  { patterns: ['ea', 'each', 'pcs', 'piece', 'pc', 'pieces', 'count', 'cnt', 'unit', 'units'], standardCode: 'EA', confidence: 'HIGH' },
  { patterns: ['dozen', 'dz', 'doz'], standardCode: 'DZ', confidence: 'HIGH' },
  { patterns: ['pair', 'pr', 'pairs'], standardCode: 'PAIR', confidence: 'HIGH' },
  { patterns: ['gross', 'gr'], standardCode: 'GROSS', confidence: 'HIGH' },

  // Mass - Metric
  { patterns: ['kg', 'kilogram', 'kilograms', 'kilo'], standardCode: 'KG', confidence: 'HIGH' },
  { patterns: ['g', 'gram', 'grams', 'gr'], standardCode: 'G', confidence: 'HIGH' },
  { patterns: ['mg', 'milligram', 'milligrams'], standardCode: 'MG', confidence: 'HIGH' },
  { patterns: ['t', 'ton', 'tons', 'tonne', 'tonnes', 'metric ton'], standardCode: 'T', confidence: 'HIGH' },

  // Mass - Imperial
  { patterns: ['lb', 'lbs', 'pound', 'pounds', '#'], standardCode: 'LB', confidence: 'HIGH' },
  { patterns: ['oz', 'ounce', 'ounces'], standardCode: 'OZ', confidence: 'HIGH' },
  { patterns: ['ton', 'tons', 'short ton'], standardCode: 'TON', confidence: 'MEDIUM' }, // Can conflict with metric

  // Length - Metric
  { patterns: ['m', 'meter', 'meters', 'metre', 'metres'], standardCode: 'M', confidence: 'HIGH' },
  { patterns: ['mm', 'millimeter', 'millimeters', 'millimetre'], standardCode: 'MM', confidence: 'HIGH' },
  { patterns: ['cm', 'centimeter', 'centimeters', 'centimetre'], standardCode: 'CM', confidence: 'HIGH' },
  { patterns: ['km', 'kilometer', 'kilometers', 'kilometre'], standardCode: 'KM', confidence: 'HIGH' },

  // Length - Imperial
  { patterns: ['ft', 'feet', 'foot', "'"], standardCode: 'FT', confidence: 'HIGH' },
  { patterns: ['in', 'inch', 'inches', '"'], standardCode: 'IN', confidence: 'HIGH' },
  { patterns: ['yd', 'yard', 'yards'], standardCode: 'YD', confidence: 'HIGH' },
  { patterns: ['mi', 'mile', 'miles'], standardCode: 'MI', confidence: 'HIGH' },

  // Volume - Metric
  { patterns: ['l', 'liter', 'liters', 'litre', 'litres'], standardCode: 'L', confidence: 'HIGH' },
  { patterns: ['ml', 'milliliter', 'milliliters', 'millilitre'], standardCode: 'ML', confidence: 'HIGH' },
  { patterns: ['m3', 'm³', 'cubic meter', 'cubic metre'], standardCode: 'M3', confidence: 'HIGH' },

  // Volume - Imperial
  { patterns: ['gal', 'gallon', 'gallons'], standardCode: 'GAL', confidence: 'HIGH' },
  { patterns: ['qt', 'quart', 'quarts'], standardCode: 'QT', confidence: 'HIGH' },
  { patterns: ['pt', 'pint', 'pints'], standardCode: 'PT', confidence: 'HIGH' },
  { patterns: ['fl oz', 'floz', 'fluid ounce'], standardCode: 'FLOZ', confidence: 'HIGH' },

  // Area
  { patterns: ['m2', 'm²', 'sq m', 'square meter'], standardCode: 'M2', confidence: 'HIGH' },
  { patterns: ['cm2', 'cm²', 'sq cm', 'square centimeter'], standardCode: 'CM2', confidence: 'HIGH' },
  { patterns: ['mm2', 'mm²', 'sq mm', 'square millimeter'], standardCode: 'MM2', confidence: 'HIGH' },
  { patterns: ['ft2', 'ft²', 'sq ft', 'square foot'], standardCode: 'FT2', confidence: 'HIGH' },
  { patterns: ['in2', 'in²', 'sq in', 'square inch'], standardCode: 'IN2', confidence: 'HIGH' },

  // Time
  { patterns: ['sec', 's', 'second', 'seconds'], standardCode: 'SEC', confidence: 'HIGH' },
  { patterns: ['min', 'minute', 'minutes'], standardCode: 'MIN', confidence: 'HIGH' },
  { patterns: ['hr', 'h', 'hour', 'hours'], standardCode: 'HR', confidence: 'HIGH' },
  { patterns: ['day', 'days', 'd'], standardCode: 'DAY', confidence: 'HIGH' },

  // Temperature
  { patterns: ['c', '°c', 'celsius', 'centigrade'], standardCode: 'C', confidence: 'HIGH' },
  { patterns: ['f', '°f', 'fahrenheit'], standardCode: 'F', confidence: 'HIGH' },
  { patterns: ['k', 'kelvin'], standardCode: 'K', confidence: 'HIGH' },

  // Pressure
  { patterns: ['pa', 'pascal', 'pascals'], standardCode: 'PA', confidence: 'HIGH' },
  { patterns: ['kpa', 'kilopascal', 'kilopascals'], standardCode: 'KPA', confidence: 'HIGH' },
  { patterns: ['bar', 'bars'], standardCode: 'BAR', confidence: 'HIGH' },
  { patterns: ['psi', 'pounds per square inch'], standardCode: 'PSI', confidence: 'HIGH' },

  // Energy/Power
  { patterns: ['j', 'joule', 'joules'], standardCode: 'J', confidence: 'HIGH' },
  { patterns: ['kj', 'kilojoule', 'kilojoules'], standardCode: 'KJ', confidence: 'HIGH' },
  { patterns: ['kwh', 'kw-h', 'kilowatt hour'], standardCode: 'KWH', confidence: 'HIGH' },
  { patterns: ['btu', 'british thermal unit'], standardCode: 'BTU', confidence: 'HIGH' },
  { patterns: ['w', 'watt', 'watts'], standardCode: 'W', confidence: 'HIGH' },
  { patterns: ['kw', 'kilowatt', 'kilowatts'], standardCode: 'KW', confidence: 'HIGH' },
  { patterns: ['hp', 'horsepower'], standardCode: 'HP', confidence: 'HIGH' },

  // Special Manufacturing Units
  { patterns: ['ppm', 'parts per million'], standardCode: 'PPM', confidence: 'HIGH' },
  { patterns: ['%', 'percent', 'percentage'], standardCode: 'PERCENT', confidence: 'HIGH' },
  { patterns: ['rpm', 'revolutions per minute'], standardCode: 'RPM', confidence: 'HIGH' },
];

export class UOMAnalyzer {
  private standardUnits: Map<string, any> = new Map();

  constructor() {}

  /**
   * Load standard units from database for mapping reference
   */
  async loadStandardUnits(): Promise<void> {
    console.log('📋 Loading standard units for mapping reference...');

    const units = await prisma.unitOfMeasure.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        symbol: true,
        unitType: true,
        systemOfMeasure: true,
        isActive: true,
      },
    });

    units.forEach(unit => {
      this.standardUnits.set(unit.code, unit);
    });

    console.log(`   ✓ Loaded ${units.length} standard units`);
  }

  /**
   * Analyze UOM values in a specific table and field
   */
  async analyzeTableField(tableName: string, fieldName: string): Promise<UOMAnalysisResult> {
    console.log(`🔍 Analyzing ${tableName}.${fieldName}...`);

    try {
      // Build dynamic query to get value frequencies
      const query = `
        SELECT
          "${fieldName}" as value,
          COUNT(*) as count,
          COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
        FROM "${tableName}"
        WHERE "${fieldName}" IS NOT NULL
          AND "${fieldName}" != ''
        GROUP BY "${fieldName}"
        ORDER BY count DESC
      `;

      const results = await prisma.$queryRawUnsafe(query) as Array<{
        value: string;
        count: bigint;
        percentage: number;
      }>;

      // Get total record counts
      const totalQuery = `SELECT COUNT(*) as total FROM "${tableName}"`;
      const totalResult = await prisma.$queryRawUnsafe(totalQuery) as Array<{ total: bigint }>;
      const totalRecords = Number(totalResult[0]?.total || 0);

      const recordsWithUOM = results.reduce((sum, row) => sum + Number(row.count), 0);

      // Map values to standard units
      const uniqueValues = results.map(row => {
        const value = row.value.toLowerCase().trim();
        const mapping = this.findBestMapping(value);

        return {
          value: row.value,
          count: Number(row.count),
          percentage: Number(row.percentage.toFixed(2)),
          suggestedMapping: mapping?.standardCode,
          mappingConfidence: mapping?.confidence || 'UNMAPPED',
          notes: mapping?.notes,
        };
      });

      return {
        tableName,
        fieldName,
        totalRecords,
        recordsWithUOM,
        uniqueValues,
      };

    } catch (error) {
      console.warn(`   ⚠️ Warning: Could not analyze ${tableName}.${fieldName}: ${error.message}`);
      return {
        tableName,
        fieldName,
        totalRecords: 0,
        recordsWithUOM: 0,
        uniqueValues: [],
      };
    }
  }

  /**
   * Find the best mapping for a UOM value using pattern matching
   */
  private findBestMapping(value: string): { standardCode: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; notes?: string } | null {
    const normalizedValue = value.toLowerCase().trim();

    // Direct code match (highest confidence)
    if (this.standardUnits.has(value.toUpperCase())) {
      return { standardCode: value.toUpperCase(), confidence: 'HIGH', notes: 'Direct code match' };
    }

    // Pattern matching
    for (const mapping of UNIT_MAPPING_PATTERNS) {
      for (const pattern of mapping.patterns) {
        if (normalizedValue === pattern.toLowerCase() ||
            normalizedValue.includes(pattern.toLowerCase())) {
          return {
            standardCode: mapping.standardCode,
            confidence: mapping.confidence,
            notes: `Pattern match: "${pattern}"`
          };
        }
      }
    }

    // Fuzzy matching for common variations
    if (normalizedValue.includes('each') || normalizedValue.includes('ea')) {
      return { standardCode: 'EA', confidence: 'MEDIUM', notes: 'Fuzzy match for "each"' };
    }

    return null;
  }

  /**
   * Generate comprehensive migration mappings
   */
  generateMigrationMappings(tableResults: UOMAnalysisResult[]): MigrationMapping[] {
    const mappings: MigrationMapping[] = [];
    const processedValues = new Set<string>();

    for (const tableResult of tableResults) {
      for (const valueData of tableResult.uniqueValues) {
        const normalizedValue = valueData.value.toLowerCase().trim();

        if (processedValues.has(normalizedValue)) continue;
        processedValues.add(normalizedValue);

        if (valueData.suggestedMapping) {
          mappings.push({
            originalValue: valueData.value,
            standardUnitCode: valueData.suggestedMapping,
            confidence: valueData.mappingConfidence as 'HIGH' | 'MEDIUM' | 'LOW',
            requiresReview: valueData.mappingConfidence !== 'HIGH',
            notes: valueData.notes,
          });
        }
      }
    }

    return mappings.sort((a, b) => {
      // Sort by confidence (HIGH first), then alphabetically
      const confidenceOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
      const aDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
      return aDiff !== 0 ? aDiff : a.originalValue.localeCompare(b.originalValue);
    });
  }

  /**
   * Generate analysis recommendations
   */
  generateRecommendations(tableResults: UOMAnalysisResult[], mappings: MigrationMapping[]): string[] {
    const recommendations: string[] = [];

    const totalUniqueValues = tableResults.reduce((sum, table) => sum + table.uniqueValues.length, 0);
    const mappedValues = mappings.filter(m => m.confidence === 'HIGH').length;
    const unmappedValues = totalUniqueValues - mappings.length;

    recommendations.push(`🎯 Migration Planning Recommendations:`);
    recommendations.push(`   • ${mappedValues} values have high-confidence mappings - ready for automated migration`);

    if (mappings.filter(m => m.confidence === 'MEDIUM').length > 0) {
      recommendations.push(`   • ${mappings.filter(m => m.confidence === 'MEDIUM').length} values need manual review before migration`);
    }

    if (unmappedValues > 0) {
      recommendations.push(`   • ${unmappedValues} values require manual mapping or new standard units`);
    }

    // Table-specific recommendations
    const highVolumeUnmapped = tableResults.filter(table =>
      table.uniqueValues.some(v => v.mappingConfidence === 'UNMAPPED' && v.count > 100)
    );

    if (highVolumeUnmapped.length > 0) {
      recommendations.push(`   ⚠️ High-volume unmapped values found in: ${highVolumeUnmapped.map(t => t.tableName).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Identify data quality issues
   */
  identifyDataQualityIssues(tableResults: UOMAnalysisResult[]): string[] {
    const issues: string[] = [];

    for (const table of tableResults) {
      // Check for empty or suspicious values
      const suspiciousValues = table.uniqueValues.filter(v =>
        v.value.length === 0 ||
        v.value.trim() === '' ||
        v.value.includes('null') ||
        v.value.includes('undefined') ||
        v.value.length > 50 ||
        /\d{10,}/.test(v.value) // Very long numbers
      );

      if (suspiciousValues.length > 0) {
        issues.push(`📊 ${table.tableName}.${table.fieldName}: ${suspiciousValues.length} suspicious values found`);
      }

      // Check for low UOM usage
      if (table.recordsWithUOM < table.totalRecords * 0.5 && table.totalRecords > 100) {
        const usagePercent = ((table.recordsWithUOM / table.totalRecords) * 100).toFixed(1);
        issues.push(`📊 ${table.tableName}.${table.fieldName}: Low UOM usage (${usagePercent}% of records)`);
      }
    }

    return issues;
  }

  /**
   * Run comprehensive UOM analysis across all configured tables
   */
  async runCompleteAnalysis(): Promise<AnalysisReport> {
    console.log('🚀 Starting Comprehensive UOM Analysis');
    console.log('=====================================');

    await this.loadStandardUnits();

    const tableResults: UOMAnalysisResult[] = [];
    let totalRecordsAnalyzed = 0;

    // Analyze each configured table/field
    for (const config of UOM_FIELDS_CONFIG) {
      const result = await this.analyzeTableField(config.table, config.field);
      tableResults.push(result);
      totalRecordsAnalyzed += result.totalRecords;
    }

    // Generate migration mappings and recommendations
    const migrationMappings = this.generateMigrationMappings(tableResults);
    const recommendations = this.generateRecommendations(tableResults, migrationMappings);
    const dataQualityIssues = this.identifyDataQualityIssues(tableResults);

    // Calculate mapping statistics
    const mappingStats = {
      highConfidence: migrationMappings.filter(m => m.confidence === 'HIGH').length,
      mediumConfidence: migrationMappings.filter(m => m.confidence === 'MEDIUM').length,
      lowConfidence: migrationMappings.filter(m => m.confidence === 'LOW').length,
      unmapped: tableResults.reduce((sum, table) =>
        sum + table.uniqueValues.filter(v => v.mappingConfidence === 'UNMAPPED').length, 0
      ),
    };

    const totalUniqueValues = tableResults.reduce((sum, table) => sum + table.uniqueValues.length, 0);

    return {
      executedAt: new Date(),
      totalTablesAnalyzed: tableResults.length,
      totalRecordsAnalyzed,
      totalUniqueValues,
      mappingStats,
      tableResults,
      migrationMappings,
      recommendations,
      dataQualityIssues,
    };
  }

  /**
   * Save analysis report to files
   */
  async saveAnalysisReport(report: AnalysisReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = './docs/generated';

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save JSON report
    const jsonPath = path.join(outputDir, `uom-analysis-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Save readable summary report
    const summaryPath = path.join(outputDir, `uom-migration-summary.md`);
    const summaryContent = this.generateSummaryReport(report);
    fs.writeFileSync(summaryPath, summaryContent);

    // Save migration mapping CSV
    const csvPath = path.join(outputDir, `uom-migration-mappings.csv`);
    const csvContent = this.generateMappingCSV(report.migrationMappings);
    fs.writeFileSync(csvPath, csvContent);

    console.log(`\n📄 Analysis reports saved:`);
    console.log(`   • Detailed JSON: ${jsonPath}`);
    console.log(`   • Summary Report: ${summaryPath}`);
    console.log(`   • Migration CSV: ${csvPath}`);
  }

  /**
   * Generate human-readable summary report
   */
  private generateSummaryReport(report: AnalysisReport): string {
    return `# UnitOfMeasure Migration Analysis Report

**Generated:** ${report.executedAt.toISOString()}

## Executive Summary

- **Tables Analyzed:** ${report.totalTablesAnalyzed}
- **Total Records:** ${report.totalRecordsAnalyzed.toLocaleString()}
- **Unique UOM Values:** ${report.totalUniqueValues}

## Mapping Analysis

| Confidence Level | Count | Percentage |
|------------------|-------|------------|
| High Confidence | ${report.mappingStats.highConfidence} | ${((report.mappingStats.highConfidence / report.totalUniqueValues) * 100).toFixed(1)}% |
| Medium Confidence | ${report.mappingStats.mediumConfidence} | ${((report.mappingStats.mediumConfidence / report.totalUniqueValues) * 100).toFixed(1)}% |
| Low Confidence | ${report.mappingStats.lowConfidence} | ${((report.mappingStats.lowConfidence / report.totalUniqueValues) * 100).toFixed(1)}% |
| Unmapped | ${report.mappingStats.unmapped} | ${((report.mappingStats.unmapped / report.totalUniqueValues) * 100).toFixed(1)}% |

## Migration Readiness

✅ **Ready for Automated Migration:** ${report.mappingStats.highConfidence} values
⚠️ **Requires Review:** ${report.mappingStats.mediumConfidence + report.mappingStats.lowConfidence} values
❌ **Needs Manual Mapping:** ${report.mappingStats.unmapped} values

## Recommendations

${report.recommendations.join('\n')}

## Data Quality Issues

${report.dataQualityIssues.length > 0 ? report.dataQualityIssues.join('\n') : '*No major data quality issues identified*'}

## Table Analysis Summary

${report.tableResults.map(table => `
### ${table.tableName}.${table.fieldName}
- **Total Records:** ${table.totalRecords.toLocaleString()}
- **Records with UOM:** ${table.recordsWithUOM.toLocaleString()} (${((table.recordsWithUOM / table.totalRecords) * 100).toFixed(1)}%)
- **Unique Values:** ${table.uniqueValues.length}
- **Top Values:** ${table.uniqueValues.slice(0, 5).map(v => `${v.value} (${v.count})`).join(', ')}
`).join('\n')}

---

*Generated by MachShop UOM Migration Analysis Tool*
`;
  }

  /**
   * Generate CSV for migration mappings
   */
  private generateMappingCSV(mappings: MigrationMapping[]): string {
    const headers = ['Original Value', 'Standard Unit Code', 'Confidence', 'Requires Review', 'Notes'];
    const rows = mappings.map(m => [
      `"${m.originalValue.replace(/"/g, '""')}"`,
      m.standardUnitCode,
      m.confidence,
      m.requiresReview.toString(),
      `"${(m.notes || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

/**
 * Main execution function for CLI usage
 */
export async function main(): Promise<void> {
  try {
    const analyzer = new UOMAnalyzer();
    const report = await analyzer.runCompleteAnalysis();

    console.log('\n📊 Analysis Complete!');
    console.log('====================');
    console.log(`Total Tables Analyzed: ${report.totalTablesAnalyzed}`);
    console.log(`Total Records: ${report.totalRecordsAnalyzed.toLocaleString()}`);
    console.log(`Unique UOM Values: ${report.totalUniqueValues}`);
    console.log(`\nMapping Confidence:`);
    console.log(`  High: ${report.mappingStats.highConfidence} (${((report.mappingStats.highConfidence / report.totalUniqueValues) * 100).toFixed(1)}%)`);
    console.log(`  Medium: ${report.mappingStats.mediumConfidence} (${((report.mappingStats.mediumConfidence / report.totalUniqueValues) * 100).toFixed(1)}%)`);
    console.log(`  Low: ${report.mappingStats.lowConfidence} (${((report.mappingStats.lowConfidence / report.totalUniqueValues) * 100).toFixed(1)}%)`);
    console.log(`  Unmapped: ${report.mappingStats.unmapped} (${((report.mappingStats.unmapped / report.totalUniqueValues) * 100).toFixed(1)}%)`);

    await analyzer.saveAnalysisReport(report);

    console.log('\n✅ UOM Migration Analysis Complete!');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI execution
if (require.main === module) {
  main().catch(console.error);
}

export default UOMAnalyzer;