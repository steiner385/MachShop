/**
 * Database Documentation Types
 * Defines comprehensive documentation metadata for database fields and entities
 */

/**
 * Business Context Information for a Field
 * Explains why a field exists and its business purpose
 */
export interface BusinessContextDocumentation {
  fieldName: string;
  tableName: string;
  businessRule: string;        // What business rule does this field enforce?
  businessPurpose: string;      // Why does this field exist?
  businessJustification: string; // What business problem does it solve?
  businessImpact: string;        // What happens if this field is wrong?
  relatedFields: string[];       // Other fields this depends on
  legalBasis?: string;           // Why is this legally required?
  auditRelevance: boolean;       // Is this field subject to audit?
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
  owner?: string;                // Department/person responsible
  lastReviewedDate?: Date;
  reviewNotes?: string;
}

/**
 * Technical Specification for a Field
 */
export interface TechnicalSpecification {
  fieldName: string;
  tableName: string;
  dataType: string;
  dataSource: string;            // Where does this data come from?
  format: string;                 // What format should this be in?
  validation: string;             // What validation rules apply?
  calculations?: string;          // How is this calculated?
  defaultValue?: unknown;
  nullable: boolean;
  encrypted: boolean;
  indexed: boolean;
  version: string;                // Schema version this was added
  deprecated: boolean;
  deprecationReason?: string;
  replacementField?: string;
}

/**
 * Examples and Valid Values for a Field
 */
export interface ExamplesAndValues {
  fieldName: string;
  tableName: string;
  examples: Array<{
    value: unknown;
    description: string;
    useCase: string;
  }>;
  validValues?: Array<{
    value: unknown;
    description: string;
    frequency?: string;
    deprecated?: boolean;
  }>;
  validRange?: {
    min?: number | string | Date;
    max?: number | string | Date;
    step?: number;
  };
  pattern?: string;              // Regex pattern for format
  constraints: string[];          // Additional constraints
}

/**
 * Compliance and Governance Information
 */
export interface ComplianceDocumentation {
  fieldName: string;
  tableName: string;
  privacy: 'public' | 'internal' | 'confidential' | 'restricted' | 'pii' | 'phi';
  retention: {
    retentionPeriod: number;      // Days
    retentionUnit: 'days' | 'months' | 'years';
    reason: string;
    legalBasis: string;
  };
  auditTrail: boolean;            // Must changes be audited?
  complianceNotes: string;        // Compliance implications
  regulations: string[];          // GDPR, HIPAA, SOX, etc.
  consequences: string;           // What happens if compliance is violated?
}

/**
 * Integration Mapping Information
 * Documents how this field connects to external systems
 */
export interface IntegrationMapping {
  fieldName: string;
  tableName: string;
  externalSystems: Array<{
    systemName: string;           // e.g., "SAP", "Salesforce", "NetSuite"
    fieldMapping: string;         // How this maps to external field
    direction: 'import' | 'export' | 'bidirectional';
    transformations?: string;     // Any transformations needed
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
    lastSyncedAt?: Date;
    syncStatus?: 'active' | 'inactive' | 'error' | 'pending';
  }>;
  dataFlowDiagram?: string;       // Visual or text representation
  criticalityForIntegration: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Complete Field Documentation
 * Combines all documentation layers for a single field
 */
export interface FieldDocumentation {
  fieldName: string;
  tableName: string;
  fieldId: string;                // Unique identifier
  businessContext: BusinessContextDocumentation;
  technicalSpec: TechnicalSpecification;
  examplesAndValues: ExamplesAndValues;
  compliance: ComplianceDocumentation;
  integrationMapping: IntegrationMapping;
  metadata: {
    createdAt: Date;
    lastUpdatedAt: Date;
    documentationComplete: boolean;
    documentationPercentage: number; // 0-100
    knownIssues: string[];
    improvementSuggestions: string[];
    relatedDocumentation: string[];  // Links to related docs
  };
}

/**
 * Table Documentation
 * High-level documentation for an entire table
 */
export interface TableDocumentation {
  tableName: string;
  description: string;
  businessPurpose: string;
  primaryKey: string;
  relationships: Array<{
    relatedTable: string;
    relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
    foreignKey: string;
  }>;
  indexes: string[];
  partitionStrategy?: string;
  archivalPolicy?: string;
  fields: FieldDocumentation[];
  statistics: {
    totalFields: number;
    documentedFields: number;
    documentationPercentage: number;
  };
}

/**
 * Database Documentation Report
 * Comprehensive documentation for entire database
 */
export interface DatabaseDocumentationReport {
  generatedAt: Date;
  version: string;
  totalTables: number;
  totalFields: number;
  documentedTables: number;
  documentedFields: number;
  overallCompleteness: number; // 0-100
  tables: TableDocumentation[];
  summary: {
    completelyDocumented: string[];
    partiallyDocumented: string[];
    undocumented: string[];
    areasNeedingWork: string[];
  };
}

/**
 * Documentation Generation Request
 */
export interface DocumentationGenerationRequest {
  tables?: string[];             // Specific tables, or all if empty
  fields?: string[];             // Specific fields
  includeExamples: boolean;
  includeCompliance: boolean;
  includeIntegrations: boolean;
  outputFormat: 'json' | 'markdown' | 'html' | 'csv';
  validate: boolean;
}

/**
 * Documentation Generation Result
 */
export interface DocumentationGenerationResult {
  success: boolean;
  tablesProcessed: number;
  fieldsProcessed: number;
  documentation: FieldDocumentation[];
  errors: Array<{
    table: string;
    field: string;
    error: string;
  }>;
  warnings: string[];
  report: DatabaseDocumentationReport;
}

/**
 * Business Context Template
 * Standard template for documenting business context
 */
export interface BusinessContextTemplate {
  fieldName: string;
  tableName: string;
  // Complete template would be filled by business analysts
  businessRule: string;
  businessPurpose: string;
  businessJustification: string;
  businessImpact: string;
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
}
