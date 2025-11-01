#!/usr/bin/env node

/**
 * Integration Mapping Validation Script
 * Validates completeness and consistency of integration mappings across all database fields
 */

const fs = require('fs');
const path = require('path');

// Expected external systems that should be present in most mappings
const EXPECTED_SYSTEMS = [
  'ERP',
  'MES',
  'Scheduling',
  'QualitySystem',
  'PLM',
  'Analytics'
];

// Systems that should map to specific field types
const SYSTEM_FIELD_PATTERNS = {
  'ERP': ['Number', 'Code', 'Status', 'Amount', 'Identifier'],
  'MES': ['Number', 'Status', 'Quantity', 'ID'],
  'Scheduling': ['Number', 'Time', 'Status'],
  'QualitySystem': ['Test', 'LotID', 'Value'],
  'PLM': ['Filename', 'Revision', 'Entity'],
  'HRSystem': ['EmployeeID', 'Name', 'Number'],
  'Analytics': ['Value', 'Timestamp', 'Metric']
};

/**
 * Load documentation file
 */
function loadDocumentation(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading documentation: ${error.message}`);
    return null;
  }
}

/**
 * Validate a single field's integration mappings
 */
function validateFieldMapping(table, field) {
  const issues = [];

  if (!field.integrationMapping) {
    issues.push({
      type: 'MISSING_MAPPING',
      severity: 'ERROR',
      message: `Missing integrationMapping for ${table}.${field.name}`
    });
    return issues;
  }

  const mapping = field.integrationMapping;

  // Check for empty mapping
  if (Object.keys(mapping).length === 0) {
    issues.push({
      type: 'EMPTY_MAPPING',
      severity: 'ERROR',
      message: `Empty integrationMapping for ${table}.${field.name}`
    });
    return issues;
  }

  // Check for valid system names
  for (const [system, fieldPath] of Object.entries(mapping)) {
    // Validate system name format
    if (!system || system.length === 0) {
      issues.push({
        type: 'INVALID_SYSTEM_NAME',
        severity: 'ERROR',
        message: `Invalid system name in mapping for ${table}.${field.name}`
      });
    }

    // Validate field path format
    if (!fieldPath || typeof fieldPath !== 'string') {
      issues.push({
        type: 'INVALID_FIELD_PATH',
        severity: 'ERROR',
        message: `Invalid field path for system "${system}" in ${table}.${field.name}: ${fieldPath}`
      });
    }

    // Check for placeholder values that should have been replaced
    if (fieldPath && fieldPath.includes('[') && fieldPath.includes(']')) {
      issues.push({
        type: 'UNREPLACED_PLACEHOLDER',
        severity: 'WARNING',
        message: `Unreplaced placeholder in ${system} mapping for ${table}.${field.name}: ${fieldPath}`
      });
    }
  }

  // Check for minimum coverage (should have at least 2-3 mappings)
  if (Object.keys(mapping).length < 2 && !field.name.includes('internal')) {
    // This is a warning, not an error, as some fields may only map to one system
    issues.push({
      type: 'LOW_COVERAGE',
      severity: 'INFO',
      message: `Low coverage for ${table}.${field.name}: only ${Object.keys(mapping).length} system mapping(s)`
    });
  }

  return issues;
}

/**
 * Analyze mapping patterns
 */
function analyzeMappingPatterns(documentation) {
  const patterns = {
    systemCoverage: {},
    systemsByFieldType: {},
    orphanedFields: [],
    highCoverageFields: [],
    commonMappings: {}
  };

  for (const table of documentation.tables) {
    for (const field of table.fields) {
      if (!field.integrationMapping) {
        patterns.orphanedFields.push(`${table.name}.${field.name}`);
        continue;
      }

      // Count system coverage
      for (const system of Object.keys(field.integrationMapping)) {
        if (!patterns.systemCoverage[system]) {
          patterns.systemCoverage[system] = 0;
        }
        patterns.systemCoverage[system]++;
      }

      // Track high coverage
      if (Object.keys(field.integrationMapping).length >= 4) {
        patterns.highCoverageFields.push({
          field: `${table.name}.${field.name}`,
          systems: Object.keys(field.integrationMapping)
        });
      }

      // Find common mapping patterns
      const mappingKey = Object.keys(field.integrationMapping).sort().join('|');
      if (!patterns.commonMappings[mappingKey]) {
        patterns.commonMappings[mappingKey] = 0;
      }
      patterns.commonMappings[mappingKey]++;
    }
  }

  return patterns;
}

/**
 * Generate validation report
 */
function generateReport(documentation) {
  console.log('\n📋 INTEGRATION MAPPING VALIDATION REPORT\n');
  console.log('=' .repeat(60));

  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  // Validate all fields
  const allIssues = [];

  for (const table of documentation.tables) {
    for (const field of table.fields) {
      const issues = validateFieldMapping(table.name, field);
      allIssues.push(...issues);

      for (const issue of issues) {
        if (issue.severity === 'ERROR') errorCount++;
        else if (issue.severity === 'WARNING') warningCount++;
        else infoCount++;
      }
    }
  }

  // Print issues by severity
  if (errorCount > 0) {
    console.log(`\n❌ ERRORS (${errorCount}):`);
    const errors = allIssues.filter(i => i.severity === 'ERROR').slice(0, 10);
    for (const issue of errors) {
      console.log(`   - ${issue.message}`);
    }
    if (errorCount > 10) {
      console.log(`   ... and ${errorCount - 10} more errors`);
    }
  }

  if (warningCount > 0) {
    console.log(`\n⚠️  WARNINGS (${warningCount}):`);
    const warnings = allIssues.filter(i => i.severity === 'WARNING').slice(0, 5);
    for (const warning of warnings) {
      console.log(`   - ${warning.message}`);
    }
    if (warningCount > 5) {
      console.log(`   ... and ${warningCount - 5} more warnings`);
    }
  }

  // Analyze patterns
  console.log('\n📊 MAPPING COVERAGE ANALYSIS:\n');
  const patterns = analyzeMappingPatterns(documentation);

  console.log('System Coverage:');
  const sortedSystems = Object.entries(patterns.systemCoverage)
    .sort((a, b) => b[1] - a[1]);
  for (const [system, count] of sortedSystems) {
    const percentage = ((count / documentation.summary.totalFields) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5));
    console.log(`   ${system.padEnd(20)} ${bar} ${count} fields (${percentage}%)`);
  }

  // Most common mapping combinations
  const topMappings = Object.entries(patterns.commonMappings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('\nMost Common Integration Patterns:');
  for (const [pattern, count] of topMappings) {
    const systems = pattern.split('|');
    const percentage = ((count / documentation.summary.totalFields) * 100).toFixed(1);
    console.log(`   ${systems.join(' + ').padEnd(40)} ${count} fields (${percentage}%)`);
  }

  // Summary statistics
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ VALIDATION SUMMARY:\n');
  console.log(`   Total Tables: ${documentation.summary.totalTables}`);
  console.log(`   Total Fields: ${documentation.summary.totalFields}`);
  console.log(`   Fields with Mappings: ${documentation.summary.totalFields - patterns.orphanedFields.length}`);
  console.log(`   Mapping Coverage: ${(((documentation.summary.totalFields - patterns.orphanedFields.length) / documentation.summary.totalFields) * 100).toFixed(1)}%`);
  console.log(`   \n   Validation Status:`);
  console.log(`   ✅ Errors: ${errorCount}`);
  console.log(`   ⚠️  Warnings: ${warningCount}`);
  console.log(`   ℹ️  Info: ${infoCount}`);

  if (errorCount === 0) {
    console.log('\n✅ All integration mappings are valid!');
  } else {
    console.log(`\n❌ Found ${errorCount} validation errors that need to be addressed.`);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  return {
    errors: errorCount,
    warnings: warningCount,
    info: infoCount,
    valid: errorCount === 0
  };
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Integration Mapping Validation Script\n');

  const docPath = path.join(process.cwd(), 'docs', 'generated', 'comprehensive-field-documentation.json');

  console.log(`📖 Loading documentation from: ${docPath}`);
  const documentation = loadDocumentation(docPath);

  if (!documentation) {
    console.error('❌ Failed to load documentation');
    process.exit(1);
  }

  const result = generateReport(documentation);

  // Exit with appropriate code
  process.exit(result.valid ? 0 : 1);
}

main();
