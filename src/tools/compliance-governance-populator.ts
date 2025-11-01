#!/usr/bin/env tsx

/**
 * Compliance and Governance Populator for Issue #216
 * Systematically populates compliance and governance attributes
 * (privacy, retention, auditTrail, complianceNotes, consequences)
 * for all 7,869 fields across 398 database tables
 */

import * as fs from 'fs';
import * as path from 'path';

interface FieldDocumentation {
  [key: string]: any;
  privacy?: string;
  retention?: string;
  auditTrail?: string;
  complianceNotes?: string;
  consequences?: string;
}

interface ComplianceProfile {
  privacy: string;
  retention: string;
  auditTrail: string;
  complianceNotes: string;
  consequences: string;
}

class ComplianceGovernancePopulator {
  private fieldDocumentationPath = path.join(
    __dirname,
    '../../docs/schema-documentation/field-descriptions.json'
  );

  private stats = {
    totalFields: 0,
    fieldsWithPrivacy: 0,
    fieldsWithRetention: 0,
    fieldsWithAuditTrail: 0,
    fieldsWithComplianceNotes: 0,
    fieldsWithConsequences: 0,
    fieldsPopulated: 0,
    tablesProcessed: 0
  };

  /**
   * Compliance profiles mapped by field naming patterns and types
   * Based on manufacturing domain and regulatory requirements
   */
  private getComplianceTemplates() {
    return {
      // Identity and Primary Key Fields
      id: {
        privacy: 'Internal System - Restricted to authorized personnel only',
        retention: 'Permanent retention required for system integrity and historical records',
        auditTrail: 'All access and modifications tracked; immutable audit history required',
        complianceNotes: 'AS9100: Required for traceability. ISO 9001: Part of quality record system. SOX: Critical control point.',
        consequences: 'ID corruption breaks all relationships and renders historical data inaccessible; catastrophic impact on system integrity'
      },

      // Timestamps and Audit Fields
      createdAt: {
        privacy: 'Business Sensitive - System audit information, restricted access',
        retention: 'Permanent retention for audit trail and production history compliance',
        auditTrail: 'Immutable record of when entity was created; captured at system level',
        complianceNotes: 'FDA 21 CFR Part 11: Required for electronic records validation. AS9100: Mandatory audit trail element.',
        consequences: 'Inaccurate creation timestamps invalidate audit trails and compliance certifications'
      },

      updatedAt: {
        privacy: 'Business Sensitive - System audit information, restricted access',
        retention: 'Retain for minimum 7 years or per regulatory requirement',
        auditTrail: 'All modifications tracked with automatic timestamp; change history maintained',
        complianceNotes: 'FDA 21 CFR Part 11: Part of electronic record validation. ISO 9001: Change control evidence.',
        consequences: 'Inaccurate update timestamps mislead about data recency and break change control tracking'
      },

      deletedAt: {
        privacy: 'Business Sensitive - Deletion history, restricted access',
        retention: 'Retain indefinitely with soft-deleted records for recovery and compliance',
        auditTrail: 'Record of all soft deletions with timestamp and responsible user required',
        complianceNotes: 'FDA: Required for audit trail of data availability changes. ISO 9001: Evidence of deletion decisions.',
        consequences: 'Improper deletion tracking breaks audit trails and enables unauthorized data removal'
      },

      // Work Order and Production Fields
      workOrderNumber: {
        privacy: 'Business Sensitive - Production planning, customer information',
        retention: 'Permanent retention required for production history and customer support',
        auditTrail: 'All changes tracked; creation timestamp, modification history maintained',
        complianceNotes: 'AS9100: Critical for traceability requirements. ITAR: May require export control tracking.',
        consequences: 'Lost work order numbers break production traceability and customer order history'
      },

      priority: {
        privacy: 'Business Confidential - Strategic business decisions',
        retention: 'Retain for 7 years minimum per manufacturing records policy',
        auditTrail: 'All priority changes tracked with timestamp and responsible user',
        complianceNotes: 'ISO 9001: Part of planning documentation. AS9100: Affects scheduling compliance.',
        consequences: 'Incorrect priority tracking misleads scheduling systems and breaks customer commitments'
      },

      status: {
        privacy: 'Business Sensitive - Production workflow state',
        retention: 'Permanent retention for operational history and compliance',
        auditTrail: 'All status transitions recorded with timestamp and authorized user ID',
        complianceNotes: 'FDA 21 CFR Part 11: State transitions must be audited. ISO 9001: Process step documentation.',
        consequences: 'Status corruption breaks workflow automation and prevents accurate process execution'
      },

      // Quality and Measurement Fields
      measurementValue: {
        privacy: 'Business Sensitive - Quality data, potential customer-specific data',
        retention: 'Minimum 7 years for aerospace; extend per customer contract requirements',
        auditTrail: 'Complete measurement history with equipment used, operator, timestamp required',
        complianceNotes: 'AS9100: Critical quality record. FDA: May require validation of measurement equipment.',
        consequences: 'Inaccurate measurements invalidate quality certifications and create safety risks'
      },

      qualityCode: {
        privacy: 'Business Sensitive - Quality decisions and rework instructions',
        retention: 'Retain for minimum 7 years per aerospace quality standards',
        auditTrail: 'All quality decisions tracked with inspector ID, timestamp, and justification',
        complianceNotes: 'AS9100: Critical for quality gate control. FDA: Required for product disposition records.',
        consequences: 'Incorrect quality codes result in defective products reaching customers; safety and compliance violation'
      },

      defectCode: {
        privacy: 'Business Sensitive - Defect analysis, root cause information',
        retention: 'Permanent retention for trend analysis and supplier management',
        auditTrail: 'Full genealogy of defects tracked with discovery timestamp and disposition',
        complianceNotes: 'AS9100: Failure mode tracking. ISO 9001: Non-conformance data required.',
        consequences: 'Lost defect history prevents root cause analysis and enables recurring defects'
      },

      // Material and Traceability Fields
      partNumber: {
        privacy: 'Business Sensitive - Product identification, potential customer proprietary',
        retention: 'Permanent retention for supply chain traceability',
        auditTrail: 'Part number creation and changes tracked; revision history maintained',
        complianceNotes: 'ITAR: May contain defense-related technical data. AS9100: Critical for configuration control.',
        consequences: 'Part number corruption breaks supply chain traceability and product identification'
      },

      serialNumber: {
        privacy: 'Business Sensitive - Customer-specific unit identification, potential ITAR controlled',
        retention: 'Permanent retention per regulatory requirement and customer contracts',
        auditTrail: 'Serial assignment history, transfer history, and custody chain tracked',
        complianceNotes: 'ITAR: Export control data requiring restricted handling. AS9100: Mandatory for traceability.',
        consequences: 'Lost serial numbers enable counterfeiting and break product traceability chains'
      },

      lotNumber: {
        privacy: 'Business Sensitive - Material batch identification, supplier information',
        retention: 'Minimum 10 years for aerospace materials per AS9100',
        auditTrail: 'Complete lot genealogy tracked from supplier through production',
        complianceNotes: 'AS9100: Mandatory material traceability. FDA: Critical for medical device materials.',
        consequences: 'Lost lot numbers prevent material recalls and supplier accountability'
      },

      // Personnel and Authorization Fields
      operatorId: {
        privacy: 'Personal Data - Employee identification, PII restricted',
        retention: 'Retain indefinitely for employment history and compliance',
        auditTrail: 'All operator actions tracked with timestamp; access logs maintained',
        complianceNotes: 'GDPR: Personal data requiring protection. FDA 21 CFR Part 11: Operator ID required for all entries.',
        consequences: 'Operator tracking failures prevent accountability and compliance verification'
      },

      userId: {
        privacy: 'Personal Data - User identification, PII with access restrictions',
        retention: 'Retain for tenure plus 7 years per employment and compliance requirements',
        auditTrail: 'All user actions logged with timestamp; access control violations tracked',
        complianceNotes: 'GDPR: Personal data requiring data protection controls. SOX: User accountability mandatory.',
        consequences: 'Missing user tracking breaks audit trails and enables unauthorized access'
      },

      // Financial Fields
      cost: {
        privacy: 'Business Confidential - Financial data, restricted to finance personnel',
        retention: 'Retain minimum 7 years per financial regulations (SOX, tax requirements)',
        auditTrail: 'All cost entries and modifications tracked with responsible user and timestamp',
        complianceNotes: 'SOX: Critical financial control. Tax: Required for audit trail. ISO 9001: Cost accounting records.',
        consequences: 'Cost data corruption breaks financial reporting and enables fraud'
      },

      price: {
        privacy: 'Business Confidential - Pricing information, customer-sensitive',
        retention: 'Retain for 7 years minimum for contract compliance and dispute resolution',
        auditTrail: 'All price changes tracked with approval history and effective dates',
        complianceNotes: 'SOX: Financial control. Antitrust: Price fixing prevention documentation required.',
        consequences: 'Inaccurate pricing enables financial fraud and antitrust violations'
      },

      // Generic/Common Fields (Fallback Templates)
      default_id_field: {
        privacy: 'Internal System - System identifier, restricted access',
        retention: 'Permanent retention for referential integrity',
        auditTrail: 'Immutable record created at system level; no modifications allowed',
        complianceNotes: 'AS9100: Part of traceability chain. ISO 9001: System data.',
        consequences: 'ID field corruption breaks data relationships and system integrity'
      },

      default_code_field: {
        privacy: 'Business Sensitive - Classification code, may be customer-specific',
        retention: 'Permanent retention for classification history',
        auditTrail: 'Code assignments and changes tracked with timestamp',
        complianceNotes: 'AS9100: May be critical for configuration control. ISO 9001: Classification records.',
        consequences: 'Incorrect codes break classification systems and traceability'
      },

      default_date_field: {
        privacy: 'Business Sensitive - Operational timeline information',
        retention: 'Minimum 7 years per manufacturing records policy',
        auditTrail: 'Date entries tracked for audit trail completeness',
        complianceNotes: 'FDA 21 CFR Part 11: Accurate timestamps required. AS9100: Scheduling compliance.',
        consequences: 'Inaccurate dates break scheduling compliance and audit trails'
      },

      default_status_field: {
        privacy: 'Business Sensitive - State information',
        retention: 'Permanent retention for operational history',
        auditTrail: 'All status changes tracked with timestamp and responsible user',
        complianceNotes: 'FDA: Required for process state validation. ISO 9001: Process documentation.',
        consequences: 'Status corruption breaks process control and compliance verification'
      },

      default_measurement_field: {
        privacy: 'Business Sensitive - Measurement data, potential safety-critical',
        retention: 'Minimum 10 years for aerospace; extend per customer requirements',
        auditTrail: 'Complete measurement history with equipment and operator tracking',
        complianceNotes: 'AS9100: Critical for dimensional control. FDA: May be safety-critical data.',
        consequences: 'Inaccurate measurements create safety risks and quality failures'
      },

      default_generic_field: {
        privacy: 'Business Sensitive - General business data',
        retention: 'Minimum 7 years or per specific retention policies',
        auditTrail: 'Changes tracked when material to operations',
        complianceNotes: 'AS9100: Part of quality system documentation. ISO 9001: General compliance.',
        consequences: 'Data loss impacts business operations and compliance'
      }
    };
  }

  /**
   * Determine field classification based on naming patterns
   */
  private getFieldClassification(
    fieldName: string,
    fieldDescription?: string
  ): keyof ReturnType<typeof this.getComplianceTemplates> {
    const lower = fieldName.toLowerCase();
    const desc = (fieldDescription || '').toLowerCase();

    // Check direct field name matches
    const templates = this.getComplianceTemplates();
    for (const pattern of Object.keys(templates)) {
      if (pattern === 'default_generic_field' || pattern === 'default_measurement_field') continue;
      if (lower === pattern || lower.endsWith(pattern)) {
        return pattern as any;
      }
    }

    // Check for pattern-based classifications
    if (
      lower.endsWith('id') ||
      lower.endsWith('uuid') ||
      lower === 'id' ||
      lower === 'persistentUuid'
    ) {
      return 'default_id_field' as any;
    }

    if (lower.endsWith('code') || lower.endsWith('type')) {
      return 'default_code_field' as any;
    }

    if (
      lower.endsWith('date') ||
      lower.endsWith('time') ||
      lower.endsWith('at') ||
      lower === 'createdat' ||
      lower === 'updatedat'
    ) {
      return 'default_date_field' as any;
    }

    if (lower.endsWith('status') || lower.endsWith('state')) {
      return 'default_status_field' as any;
    }

    if (
      lower.includes('measurement') ||
      lower.includes('value') ||
      lower.includes('limit') ||
      lower.includes('quantity')
    ) {
      return 'default_measurement_field' as any;
    }

    return 'default_generic_field' as any;
  }

  /**
   * Get compliance profile for a field
   */
  private getComplianceProfile(fieldName: string, fieldDescription?: string): ComplianceProfile {
    const templates = this.getComplianceTemplates();
    const classification = this.getFieldClassification(fieldName, fieldDescription);

    if (templates[classification]) {
      return templates[classification] as ComplianceProfile;
    }

    return templates['default_generic_field'] as ComplianceProfile;
  }

  /**
   * Populate a single field with compliance attributes
   */
  private populateField(field: FieldDocumentation, fieldName: string): boolean {
    const profile = this.getComplianceProfile(fieldName, field.description);
    let updated = false;

    // Populate privacy if not already set
    if (!field.privacy || field.privacy.trim().length === 0) {
      field.privacy = profile.privacy;
      updated = true;
    }

    // Populate retention if not already set
    if (!field.retention || field.retention.trim().length === 0) {
      field.retention = profile.retention;
      updated = true;
    }

    // Populate auditTrail if not already set
    if (!field.auditTrail || field.auditTrail.trim().length === 0) {
      field.auditTrail = profile.auditTrail;
      updated = true;
    }

    // Populate complianceNotes if not already set
    if (!field.complianceNotes || field.complianceNotes.trim().length === 0) {
      field.complianceNotes = profile.complianceNotes;
      updated = true;
    }

    // Populate consequences if not already set
    if (!field.consequences || field.consequences.trim().length === 0) {
      field.consequences = profile.consequences;
      updated = true;
    }

    return updated;
  }

  /**
   * Main population routine
   */
  async populate(): Promise<void> {
    console.log('🚀 Starting Compliance and Governance Population\n');

    // Load documentation
    console.log('📂 Loading field documentation...');
    const documentation = JSON.parse(
      fs.readFileSync(this.fieldDocumentationPath, 'utf-8')
    );
    console.log('✅ Documentation loaded\n');

    // Process all tables and fields
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

        // Populate compliance attributes
        if (this.populateField(field, fieldName)) {
          fieldsUpdated++;
          tableUpdated++;
        }

        // Track coverage
        if (field.privacy && field.privacy.trim().length > 0) {
          this.stats.fieldsWithPrivacy++;
        }
        if (field.retention && field.retention.trim().length > 0) {
          this.stats.fieldsWithRetention++;
        }
        if (field.auditTrail && field.auditTrail.trim().length > 0) {
          this.stats.fieldsWithAuditTrail++;
        }
        if (field.complianceNotes && field.complianceNotes.trim().length > 0) {
          this.stats.fieldsWithComplianceNotes++;
        }
        if (field.consequences && field.consequences.trim().length > 0) {
          this.stats.fieldsWithConsequences++;
        }
      }

      if (tableUpdated > 0) {
        this.stats.tablesProcessed++;
        process.stdout.write(`  ✓ ${table} (${tableUpdated} fields updated)\n`);
      }
    }

    this.stats.totalFields = totalFields;
    this.stats.fieldsPopulated = fieldsUpdated;

    // Save updated documentation
    console.log('\n📝 Saving updated documentation...');
    const outputPath = this.fieldDocumentationPath;
    fs.writeFileSync(outputPath, JSON.stringify(documentation, null, 2), 'utf-8');

    // Display summary
    console.log('\n✅ Compliance and Governance Population Complete!\n');
    console.log(`📈 Coverage Report:`);
    console.log(`   Total Fields: ${this.stats.totalFields}`);
    console.log(`   Fields with Privacy: ${this.stats.fieldsWithPrivacy} (${((this.stats.fieldsWithPrivacy / this.stats.totalFields) * 100).toFixed(2)}%)`);
    console.log(`   Fields with Retention: ${this.stats.fieldsWithRetention} (${((this.stats.fieldsWithRetention / this.stats.totalFields) * 100).toFixed(2)}%)`);
    console.log(`   Fields with AuditTrail: ${this.stats.fieldsWithAuditTrail} (${((this.stats.fieldsWithAuditTrail / this.stats.totalFields) * 100).toFixed(2)}%)`);
    console.log(`   Fields with ComplianceNotes: ${this.stats.fieldsWithComplianceNotes} (${((this.stats.fieldsWithComplianceNotes / this.stats.totalFields) * 100).toFixed(2)}%)`);
    console.log(`   Fields with Consequences: ${this.stats.fieldsWithConsequences} (${((this.stats.fieldsWithConsequences / this.stats.totalFields) * 100).toFixed(2)}%)`);
    console.log(`   Tables Processed: ${this.stats.tablesProcessed}`);
    console.log(`\n📁 Updated: ${outputPath}`);
  }
}

// Execute
const populator = new ComplianceGovernancePopulator();
populator.populate().catch(error => {
  console.error('❌ Error populating compliance and governance:', error);
  process.exit(1);
});
