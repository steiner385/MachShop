#!/usr/bin/env tsx

/**
 * Expands field documentation with comprehensive compliance data
 * Converts comprehensive-field-documentation.json into field-descriptions.json format
 * with full compliance and governance attributes
 */

import * as fs from 'fs';
import * as path from 'path';

interface ComprehensiveField {
  name: string;
  type: string;
  description: string;
  businessPurpose?: string;
  exampleValues?: string[];
  constraints?: string[];
  [key: string]: any;
}

interface ExpandedFieldDoc {
  description: string;
  privacy: string;
  retention: string;
  auditTrail: string;
  complianceNotes: string;
  consequences: string;
  [key: string]: any;
}

class FieldDocumentationExpander {
  private comprehensivePath = path.join(
    __dirname,
    '../../docs/generated/comprehensive-field-documentation.json'
  );

  private fieldDocPath = path.join(
    __dirname,
    '../../docs/schema-documentation/field-descriptions.json'
  );

  private stats = {
    totalFieldsProcessed: 0,
    complianceFieldsAdded: 0,
    tablesProcessed: 0
  };

  private complianceProfiles = this.buildComplianceProfiles();

  private buildComplianceProfiles() {
    return {
      identity: {
        privacy: 'Internal System - Restricted to authorized personnel only',
        retention: 'Permanent retention required for system integrity and historical records',
        auditTrail: 'All access and modifications tracked; immutable audit history required',
        complianceNotes: 'AS9100: Required for traceability. ISO 9001: Part of quality record system. SOX: Critical control point.',
        consequences: 'ID corruption breaks all relationships and renders historical data inaccessible; catastrophic impact on system integrity'
      },
      measurement: {
        privacy: 'Business Sensitive - Quality data, potential customer-specific data',
        retention: 'Minimum 7 years for aerospace; extend per customer contract requirements',
        auditTrail: 'Complete measurement history with equipment used, operator, timestamp required',
        complianceNotes: 'AS9100: Critical quality record. FDA: May require validation of measurement equipment.',
        consequences: 'Inaccurate measurements invalidate quality certifications and create safety risks'
      },
      status: {
        privacy: 'Business Sensitive - Production workflow state',
        retention: 'Permanent retention for operational history and compliance',
        auditTrail: 'All status transitions recorded with timestamp and authorized user ID',
        complianceNotes: 'FDA 21 CFR Part 11: State transitions must be audited. ISO 9001: Process step documentation.',
        consequences: 'Status corruption breaks workflow automation and prevents accurate process execution'
      },
      audit: {
        privacy: 'Business Sensitive - System audit information, restricted access',
        retention: 'Permanent retention for audit trail and production history compliance',
        auditTrail: 'Immutable record of system events; captured at system level',
        complianceNotes: 'FDA 21 CFR Part 11: Required for electronic records validation. AS9100: Mandatory audit trail element.',
        consequences: 'Inaccurate audit information invalidates audit trails and compliance certifications'
      },
      financial: {
        privacy: 'Business Confidential - Financial data, restricted to finance personnel',
        retention: 'Retain minimum 7 years per financial regulations (SOX, tax requirements)',
        auditTrail: 'All financial entries and modifications tracked with responsible user and timestamp',
        complianceNotes: 'SOX: Critical financial control. Tax: Required for audit trail. ISO 9001: Cost accounting records.',
        consequences: 'Financial data corruption breaks reporting and enables fraud'
      },
      regulatory: {
        privacy: 'Business Sensitive - Compliance and regulatory information',
        retention: 'Permanent retention or per specific regulatory timelines',
        auditTrail: 'Complete compliance history tracked with evidence of certifications',
        complianceNotes: 'AS9100: Critical for regulatory compliance. FDA: Safety-related data. ITAR: Export control data.',
        consequences: 'Lost regulatory data prevents compliance verification and enables violations'
      },
      traceability: {
        privacy: 'Business Sensitive - Supply chain data, customer information',
        retention: 'Permanent retention for traceability and accountability',
        auditTrail: 'Complete genealogy and chain of custody tracked',
        complianceNotes: 'AS9100: Mandatory for product traceability. ITAR: Export control tracking required.',
        consequences: 'Lost traceability prevents recalls and breaks supply chain accountability'
      },
      personnel: {
        privacy: 'Personal Data - Employee identification, PII restricted',
        retention: 'Retain indefinitely for employment history and compliance',
        auditTrail: 'All personnel actions tracked with timestamp; access logs maintained',
        complianceNotes: 'GDPR: Personal data requiring protection. FDA 21 CFR Part 11: Operator ID required.',
        consequences: 'Personnel tracking failures prevent accountability and compliance verification'
      },
      default: {
        privacy: 'Business Sensitive - General business data',
        retention: 'Minimum 7 years or per specific retention policies',
        auditTrail: 'Changes tracked when material to operations',
        complianceNotes: 'AS9100: Part of quality system documentation. ISO 9001: General compliance.',
        consequences: 'Data loss impacts business operations and compliance'
      }
    };
  }

  private inferFieldType(field: ComprehensiveField): keyof typeof this.complianceProfiles {
    const name = field.name.toLowerCase();
    const desc = (field.description || '').toLowerCase();
    const type = (field.type || '').toLowerCase();

    if (name.endsWith('id') || name === 'id' || name.includes('uuid')) {
      return 'identity';
    }

    if (
      name.includes('measurement') ||
      name.includes('value') ||
      name.includes('limit') ||
      name.includes('quantity') ||
      desc.includes('measurement')
    ) {
      return 'measurement';
    }

    if (name.includes('status') || name.includes('state')) {
      return 'status';
    }

    if (name.includes('createdat') || name.includes('updatedat') || name.includes('deleted')) {
      return 'audit';
    }

    if (name.includes('cost') || name.includes('price') || name.includes('financial')) {
      return 'financial';
    }

    if (name.includes('compliance') || name.includes('regulatory')) {
      return 'regulatory';
    }

    if (
      name.includes('serial') ||
      name.includes('lot') ||
      name.includes('batch') ||
      name.includes('genealogy')
    ) {
      return 'traceability';
    }

    if (name.includes('operator') || name.includes('user') || name.includes('personnel')) {
      return 'personnel';
    }

    return 'default';
  }

  async expandDocumentation(): Promise<void> {
    console.log('🚀 Expanding Field Documentation with Compliance Data\n');

    // Load comprehensive documentation
    console.log('📂 Loading comprehensive field documentation...');
    const comprehensive = JSON.parse(
      fs.readFileSync(this.comprehensivePath, 'utf-8')
    );
    console.log(`✅ Loaded ${comprehensive.summary.totalFields} fields\n`);

    // Load existing field documentation
    console.log('📂 Loading existing field documentation...');
    const fieldDocs = JSON.parse(fs.readFileSync(this.fieldDocPath, 'utf-8'));
    console.log('✅ Loaded\n');

    // Process comprehensive fields and add compliance attributes
    console.log('🔄 Processing fields and adding compliance attributes...\n');

    for (const table of comprehensive.tables) {
      if (!fieldDocs[table.name]) {
        fieldDocs[table.name] = {};
      }

      const tableData = fieldDocs[table.name];
      let tableUpdated = 0;

      for (const field of table.fields) {
        this.stats.totalFieldsProcessed++;

        // Create or update field documentation
        if (!tableData[field.name]) {
          tableData[field.name] = {};
        }

        const fieldEntry = tableData[field.name];

        // Add description if not present
        if (!fieldEntry.description && field.description) {
          fieldEntry.description = field.description;
        }

        // Add examples if not present
        if (!fieldEntry.examples && field.exampleValues && field.exampleValues.length > 0) {
          fieldEntry.examples = field.exampleValues.slice(0, 3);
        }

        // Infer field type and apply compliance profile
        const fieldType = this.inferFieldType(field);
        const profile = this.complianceProfiles[fieldType];

        // Add compliance attributes if not present
        let fieldUpdated = false;
        if (!fieldEntry.privacy) {
          fieldEntry.privacy = profile.privacy;
          fieldUpdated = true;
        }
        if (!fieldEntry.retention) {
          fieldEntry.retention = profile.retention;
          fieldUpdated = true;
        }
        if (!fieldEntry.auditTrail) {
          fieldEntry.auditTrail = profile.auditTrail;
          fieldUpdated = true;
        }
        if (!fieldEntry.complianceNotes) {
          fieldEntry.complianceNotes = profile.complianceNotes;
          fieldUpdated = true;
        }
        if (!fieldEntry.consequences) {
          fieldEntry.consequences = profile.consequences;
          fieldUpdated = true;
        }

        if (fieldUpdated) {
          tableUpdated++;
          this.stats.complianceFieldsAdded++;
        }
      }

      if (tableUpdated > 0) {
        this.stats.tablesProcessed++;
        process.stdout.write(`  ✓ ${table.name} (${tableUpdated} fields enhanced)\n`);
      }
    }

    // Save expanded documentation
    console.log('\n📝 Saving expanded field documentation...');
    fs.writeFileSync(this.fieldDocPath, JSON.stringify(fieldDocs, null, 2), 'utf-8');

    // Display summary
    console.log('\n✅ Field Documentation Expansion Complete!\n');
    console.log(`📈 Coverage Report:`);
    console.log(`   Total Fields Processed: ${this.stats.totalFieldsProcessed}`);
    console.log(`   Fields with Compliance Data Added: ${this.stats.complianceFieldsAdded}`);
    console.log(`   Tables Enhanced: ${this.stats.tablesProcessed}`);
    console.log(`\n📁 Updated: ${this.fieldDocPath}`);
  }
}

// Execute
const expander = new FieldDocumentationExpander();
expander.expandDocumentation().catch(error => {
  console.error('❌ Error expanding field documentation:', error);
  process.exit(1);
});
