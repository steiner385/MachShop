/**
 * Enhanced Metadata Extractor
 * Combines Prisma schema parsing with external documentation files
 */

import * as fs from 'fs';
import * as path from 'path';
import MetadataExtractor from './metadata-extractor';
import {
  SchemaMetadata,
  ModelMetadata,
  FieldMetadata,
  TableDocumentation,
  BusinessRule
} from './types/schema-metadata';

export interface ExternalDocumentation {
  tableDescriptions: Record<string, TableDocumentation>;
  fieldDescriptions: Record<string, Record<string, FieldDocumentation>>;
  businessRules: Record<string, BusinessRule[]>;
}

export interface FieldDocumentation {
  description?: string;
  businessRule?: string;
  dataSource?: string;
  format?: string;
  examples?: string[];
  validation?: string;
  calculations?: string;
  privacy?: string;
  retention?: string;
  auditTrail?: string;
  integrationMapping?: Record<string, string>;
  businessImpact?: string;
  validValues?: string[];
  complianceNotes?: string;
}

export interface TableDocumentation {
  description: string;
  businessPurpose: string;
  dataOwner: string;
  updateFrequency?: string;
  complianceNotes?: string;
  integrations?: string[];
  dataRetention?: string;
  securityClassification?: string;
  examples?: Array<{
    scenario: string;
    sampleData: Record<string, any>;
    explanation?: string;
  }>;
  relatedTables?: string[];
  commonQueries?: string[];
}

export class EnhancedMetadataExtractor extends MetadataExtractor {
  private externalDocsPath: string;
  private externalDocs: ExternalDocumentation | null = null;

  constructor(schemaPath: string = './prisma/schema.prisma', externalDocsPath: string = './docs/schema-documentation') {
    super(schemaPath);
    this.externalDocsPath = externalDocsPath;
  }

  /**
   * Load external documentation files
   */
  async loadExternalDocumentation(): Promise<ExternalDocumentation> {
    // Return empty documentation if external docs are disabled
    if (!this.externalDocsPath) {
      return {
        tableDescriptions: {},
        fieldDescriptions: {},
        businessRules: {}
      };
    }

    const tableDescriptionsPath = path.join(this.externalDocsPath, 'table-descriptions.json');
    const fieldDescriptionsPath = path.join(this.externalDocsPath, 'field-descriptions.json');
    const businessRulesPath = path.join(this.externalDocsPath, 'business-rules.json');

    const externalDocs: ExternalDocumentation = {
      tableDescriptions: {},
      fieldDescriptions: {},
      businessRules: {}
    };

    // Load table descriptions
    if (fs.existsSync(tableDescriptionsPath)) {
      try {
        const tableDocsContent = await fs.promises.readFile(tableDescriptionsPath, 'utf8');
        externalDocs.tableDescriptions = JSON.parse(tableDocsContent);
        console.log(`✓ Loaded table descriptions for ${Object.keys(externalDocs.tableDescriptions).length} tables`);
      } catch (error) {
        console.warn(`⚠️  Failed to load table descriptions: ${error}`);
      }
    }

    // Load field descriptions
    if (fs.existsSync(fieldDescriptionsPath)) {
      try {
        const fieldDocsContent = await fs.promises.readFile(fieldDescriptionsPath, 'utf8');
        externalDocs.fieldDescriptions = JSON.parse(fieldDocsContent);
        const fieldCount = Object.values(externalDocs.fieldDescriptions).reduce((sum, fields) => sum + Object.keys(fields).length, 0);
        console.log(`✓ Loaded field descriptions for ${fieldCount} fields across ${Object.keys(externalDocs.fieldDescriptions).length} tables`);
      } catch (error) {
        console.warn(`⚠️  Failed to load field descriptions: ${error}`);
      }
    }

    // Load business rules
    if (fs.existsSync(businessRulesPath)) {
      try {
        const businessRulesContent = await fs.promises.readFile(businessRulesPath, 'utf8');
        externalDocs.businessRules = JSON.parse(businessRulesContent);

        // Filter out _metadata and count only table-specific rules
        const tableRules = Object.entries(externalDocs.businessRules)
          .filter(([key]) => !key.startsWith('_'))
          .reduce((acc, [key, rules]) => {
            acc[key] = rules;
            return acc;
          }, {} as Record<string, BusinessRule[]>);

        const ruleCount = Object.values(tableRules).reduce((sum, rules) => sum + (Array.isArray(rules) ? rules.length : 0), 0);
        const tableCount = Object.keys(tableRules).length;
        console.log(`✓ Loaded ${ruleCount} business rules for ${tableCount} tables`);
      } catch (error) {
        console.warn(`⚠️  Failed to load business rules: ${error}`);
      }
    }

    this.externalDocs = externalDocs;
    return externalDocs;
  }

  /**
   * Extract enhanced metadata combining schema and external documentation
   */
  async extractEnhancedMetadata(): Promise<SchemaMetadata> {
    console.log('🔍 Extracting schema metadata...');

    // Extract base metadata from Prisma schema
    const baseMetadata = await this.extractMetadata();

    console.log('📚 Loading external documentation...');

    // Load external documentation
    if (!this.externalDocs) {
      await this.loadExternalDocumentation();
    }

    console.log('🔄 Merging documentation...');

    // Merge external documentation with schema metadata
    const enhancedMetadata = this.mergeDocumentation(baseMetadata, this.externalDocs!);

    console.log('✅ Enhanced metadata extraction complete');

    return enhancedMetadata;
  }

  /**
   * Merge external documentation with schema metadata
   */
  private mergeDocumentation(schemaMetadata: SchemaMetadata, externalDocs: ExternalDocumentation): SchemaMetadata {
    const enhancedModels = schemaMetadata.models.map(model => this.enhanceModel(model, externalDocs));

    return {
      ...schemaMetadata,
      models: enhancedModels
    };
  }

  /**
   * Enhance individual model with external documentation
   */
  private enhanceModel(model: ModelMetadata, externalDocs: ExternalDocumentation): ModelMetadata {
    const tableDoc = externalDocs?.tableDescriptions?.[model.name];
    const fieldDocs = externalDocs?.fieldDescriptions?.[model.name] || {};
    const businessRules = externalDocs?.businessRules?.[model.name] || [];

    // Enhance fields with external documentation and unit information
    const enhancedFields = model.fields.map(field => {
      const enhancedField = this.enhanceField(field, fieldDocs[field.name]);

      // Apply unit enhancements to measurement fields
      if (this.isMeasurementField(enhancedField)) {
        const enhancedDescription = this.enhanceDescriptionWithUnits(
          enhancedField,
          model,
          enhancedField.documentation || 'No description available'
        );
        return {
          ...enhancedField,
          documentation: enhancedDescription
        };
      }

      return enhancedField;
    });

    // Merge table-level documentation (external takes priority over schema comments)
    const enhancedModel: ModelMetadata = {
      ...model,
      fields: enhancedFields,
      documentation: tableDoc?.description || model.documentation,
      businessRules: this.mergeBusinessRules(model.businessRules, businessRules.map(rule => rule.description))
    };

    // Add additional table metadata if available
    if (tableDoc) {
      (enhancedModel as any).businessPurpose = tableDoc.businessPurpose;
      (enhancedModel as any).dataOwner = tableDoc.dataOwner;
      (enhancedModel as any).updateFrequency = tableDoc.updateFrequency;
      (enhancedModel as any).complianceNotes = tableDoc.complianceNotes;
      (enhancedModel as any).integrations = tableDoc.integrations;
      (enhancedModel as any).dataRetention = tableDoc.dataRetention;
      (enhancedModel as any).securityClassification = tableDoc.securityClassification;
      (enhancedModel as any).examples = tableDoc.examples;
      (enhancedModel as any).relatedTables = tableDoc.relatedTables;
      (enhancedModel as any).commonQueries = tableDoc.commonQueries;
    }

    return enhancedModel;
  }

  /**
   * Enhance individual field with external documentation
   */
  private enhanceField(field: FieldMetadata, fieldDoc?: FieldDocumentation): FieldMetadata {
    if (!fieldDoc) {
      return field;
    }

    // Merge field documentation (external takes priority over schema comments)
    const enhancedField: FieldMetadata = {
      ...field,
      documentation: fieldDoc.description || field.documentation,
      businessRule: fieldDoc.businessRule || field.businessRule
    };

    // Add additional field metadata
    (enhancedField as any).dataSource = fieldDoc.dataSource;
    (enhancedField as any).format = fieldDoc.format;
    (enhancedField as any).examples = fieldDoc.examples;
    (enhancedField as any).validation = fieldDoc.validation;
    (enhancedField as any).calculations = fieldDoc.calculations;
    (enhancedField as any).privacy = fieldDoc.privacy;
    (enhancedField as any).retention = fieldDoc.retention;
    (enhancedField as any).auditTrail = fieldDoc.auditTrail;
    (enhancedField as any).integrationMapping = fieldDoc.integrationMapping;
    (enhancedField as any).businessImpact = fieldDoc.businessImpact;
    (enhancedField as any).validValues = fieldDoc.validValues;
    (enhancedField as any).complianceNotes = fieldDoc.complianceNotes;

    return enhancedField;
  }

  /**
   * Merge business rules from schema and external documentation
   */
  private mergeBusinessRules(schemaRules?: string[], externalRules?: string[]): string[] | undefined {
    const allRules = [
      ...(schemaRules || []),
      ...(externalRules || [])
    ];

    // Remove duplicates and empty values
    const uniqueRules = Array.from(new Set(allRules.filter(rule => rule && rule.trim())));

    return uniqueRules.length > 0 ? uniqueRules : undefined;
  }

  /**
   * Generate documentation coverage report
   */
  async generateCoverageReport(): Promise<DocumentationCoverageReport> {
    const metadata = await this.extractMetadata();

    if (!this.externalDocs) {
      await this.loadExternalDocumentation();
    }

    const report: DocumentationCoverageReport = {
      totalTables: metadata.totalModels,
      totalFields: metadata.totalFields,
      tablesWithDocumentation: 0,
      fieldsWithDocumentation: 0,
      coverageByCategory: {},
      missingDocumentation: {
        tables: [],
        fields: []
      }
    };

    // Analyze table coverage
    for (const model of metadata.models) {
      const hasTableDoc = !!(model.documentation || this.externalDocs?.tableDescriptions?.[model.name]?.description);
      if (hasTableDoc) {
        report.tablesWithDocumentation++;
      } else {
        report.missingDocumentation.tables.push(model.name);
      }

      // Analyze field coverage for this table
      const tableFieldDocs = this.externalDocs?.fieldDescriptions?.[model.name] || {};
      let fieldsWithDocs = 0;

      for (const field of model.fields) {
        const hasFieldDoc = !!(field.documentation || tableFieldDocs[field.name]?.description);
        if (hasFieldDoc) {
          fieldsWithDocs++;
          report.fieldsWithDocumentation++;
        } else {
          report.missingDocumentation.fields.push(`${model.name}.${field.name}`);
        }
      }

      // Track coverage by category
      const category = model.category || 'Other';
      if (!report.coverageByCategory[category]) {
        report.coverageByCategory[category] = {
          tables: 0,
          tablesWithDocs: 0,
          fields: 0,
          fieldsWithDocs: 0
        };
      }

      report.coverageByCategory[category].tables++;
      report.coverageByCategory[category].fields += model.fields.length;

      if (hasTableDoc) {
        report.coverageByCategory[category].tablesWithDocs++;
      }

      report.coverageByCategory[category].fieldsWithDocs += fieldsWithDocs;
    }

    return report;
  }

  /**
   * Generate templates for missing documentation
   */
  async generateDocumentationTemplates(outputDir: string = './docs/schema-documentation/generated-templates'): Promise<void> {
    const metadata = await this.extractMetadata();

    if (!this.externalDocs) {
      await this.loadExternalDocumentation();
    }

    await fs.promises.mkdir(outputDir, { recursive: true });

    // Generate table documentation templates for undocumented tables
    const undocumentedTables = metadata.models.filter(model =>
      !this.externalDocs!.tableDescriptions[model.name]?.description && !model.documentation
    );

    if (undocumentedTables.length > 0) {
      const tableTemplate: Record<string, any> = {};

      for (const model of undocumentedTables) {
        tableTemplate[model.name] = {
          description: `[TODO] Brief description of ${model.name}`,
          businessPurpose: `[TODO] Explain the business purpose of ${model.name}`,
          dataOwner: "[TODO] Specify the team or role responsible for this data",
          updateFrequency: "[TODO] How often is this data updated",
          complianceNotes: "[TODO] Any regulatory or compliance considerations",
          integrations: ["[TODO] List systems that integrate with this table"],
          examples: [
            {
              scenario: `[TODO] Describe a common use case for ${model.name}`,
              sampleData: {},
              explanation: "[TODO] Explain what this example demonstrates"
            }
          ]
        };
      }

      const tableTemplatePath = path.join(outputDir, 'table-templates.json');
      await fs.promises.writeFile(tableTemplatePath, JSON.stringify(tableTemplate, null, 2));
      console.log(`📝 Generated table documentation templates: ${tableTemplatePath}`);
    }

    // Generate field documentation templates for undocumented fields
    const fieldTemplate: Record<string, Record<string, any>> = {};

    for (const model of metadata.models) {
      const tableFieldDocs = this.externalDocs!.fieldDescriptions[model.name] || {};
      const undocumentedFields = model.fields.filter(field =>
        !tableFieldDocs[field.name]?.description && !field.documentation
      );

      if (undocumentedFields.length > 0) {
        fieldTemplate[model.name] = {};

        for (const field of undocumentedFields) {
          fieldTemplate[model.name][field.name] = {
            description: `[TODO] Describe what ${field.name} represents`,
            businessRule: "[TODO] Any business rules or constraints",
            dataSource: "[TODO] Where this data comes from",
            format: `[TODO] Expected format for ${field.type}`,
            examples: ["[TODO] Provide realistic examples"],
            businessImpact: "[TODO] What happens if this field is incorrect"
          };
        }
      }
    }

    if (Object.keys(fieldTemplate).length > 0) {
      const fieldTemplatePath = path.join(outputDir, 'field-templates.json');
      await fs.promises.writeFile(fieldTemplatePath, JSON.stringify(fieldTemplate, null, 2));
      console.log(`📝 Generated field documentation templates: ${fieldTemplatePath}`);
    }
  }

  /**
   * Check if a field is a measurement field that should have unit information
   */
  private isMeasurementField(field: any): boolean {
    // Only consider numeric fields (Int, Float)
    if (!['Int', 'Float'].includes(field.type)) {
      return false;
    }

    const fieldName = field.name.toLowerCase();

    // Time-related measurements
    const timeFields = ['duration', 'time', 'setuptime', 'teardowntime', 'cycletime', 'mincycletime', 'maxcycletime'];

    // Statistical Process Control and limits
    const spcFields = ['minvalue', 'maxvalue', 'engineeringmin', 'engineeringmax', 'lsl', 'usl', 'nominalvalue', 'lowerlimit', 'upperlimit'];

    // Physical measurements
    const physicalFields = ['weight', 'length', 'width', 'height', 'depth', 'thickness', 'diameter', 'radius', 'area', 'volume', 'quantity'];

    // Process measurements
    const processFields = ['temperature', 'pressure', 'voltage', 'current', 'power', 'flow', 'rate', 'speed', 'velocity', 'rpm'];

    // Alarm and monitoring values
    const alarmFields = ['highalarm', 'lowalarm', 'highhighalarm', 'lowlowalarm'];

    // General measurement and result fields
    const measurementFields = ['value', 'result', 'reading', 'measurement'];

    const allMeasurementFields = [
      ...timeFields,
      ...spcFields,
      ...physicalFields,
      ...processFields,
      ...alarmFields,
      ...measurementFields
    ];

    return allMeasurementFields.some(pattern => fieldName.includes(pattern));
  }

  /**
   * Enhance field description with unit information
   */
  private enhanceDescriptionWithUnits(field: any, model: any, currentDescription: string): string {
    const fieldName = field.name.toLowerCase();

    // Skip if description already mentions specific units (but allow general "unit" references)
    if (currentDescription.toLowerCase().includes('kg') ||
        currentDescription.toLowerCase().includes('minute') ||
        currentDescription.toLowerCase().includes('second') ||
        currentDescription.toLowerCase().includes('meter') ||
        currentDescription.toLowerCase().includes('degree') ||
        currentDescription.toLowerCase().includes('volts') ||
        currentDescription.toLowerCase().includes('amperes') ||
        currentDescription.toLowerCase().includes('watts') ||
        currentDescription.toLowerCase().includes('typically in') ||
        currentDescription.toLowerCase().includes('units specified in')) {
      return currentDescription;
    }

    // Check if model has unitOfMeasure or unit field
    const hasUnitField = model.fields?.some((f: any) =>
      f.name === 'unitOfMeasure' || f.name === 'unit'
    );

    let unitInfo = '';

    // Time-related fields - specify common units
    if (fieldName.includes('duration') || fieldName.includes('time')) {
      if (fieldName.includes('cycle')) {
        unitInfo = ' (typically in seconds)';
      } else {
        unitInfo = ' (typically in minutes)';
      }
    }

    // Statistical Process Control fields
    else if (['lsl', 'usl', 'nominalvalue', 'minvalue', 'maxvalue', 'engineeringmin', 'engineeringmax'].some(term => fieldName.includes(term))) {
      if (hasUnitField) {
        unitInfo = ' (units specified in `unitOfMeasure` field)';
      } else {
        // Specific SPC term explanations
        if (fieldName.includes('lsl')) {
          return currentDescription.replace('L s l', 'Lower Specification Limit (LSL)') + ' (units vary by characteristic)';
        } else if (fieldName.includes('usl')) {
          return currentDescription.replace('U s l', 'Upper Specification Limit (USL)') + ' (units vary by characteristic)';
        } else {
          unitInfo = ' (units vary by parameter type)';
        }
      }
    }

    // Weight fields
    else if (fieldName.includes('weight')) {
      unitInfo = ' (typically in kilograms)';
    }

    // Quantity fields
    else if (fieldName.includes('quantity')) {
      if (hasUnitField) {
        unitInfo = '. Quantity units specified in `unitOfMeasure` field';
        return currentDescription.replace('Numerical quantity', 'Material or part quantity') + unitInfo;
      } else {
        return currentDescription.replace('Numerical quantity', 'Material or part quantity (units context-dependent)');
      }
    }

    // Alarm values
    else if (['highalarm', 'lowalarm', 'highhighalarm', 'lowlowalarm'].some(term => fieldName.includes(term))) {
      unitInfo = ' (units match monitored parameter)';
    }

    // Temperature
    else if (fieldName.includes('temperature') || fieldName.includes('temp')) {
      unitInfo = ' (typically in °C)';
    }

    // Pressure
    else if (fieldName.includes('pressure')) {
      unitInfo = ' (typically in bar or PSI)';
    }

    // Electrical measurements
    else if (fieldName.includes('voltage')) {
      unitInfo = ' (in volts)';
    } else if (fieldName.includes('current')) {
      unitInfo = ' (in amperes)';
    } else if (fieldName.includes('power')) {
      unitInfo = ' (in watts)';
    }

    // Dimensional measurements
    else if (['length', 'width', 'height', 'depth', 'thickness', 'diameter', 'radius'].some(term => fieldName.includes(term))) {
      unitInfo = ' (typically in millimeters)';
    } else if (fieldName.includes('area')) {
      unitInfo = ' (typically in mm²)';
    } else if (fieldName.includes('volume')) {
      unitInfo = ' (typically in cm³ or liters)';
    }

    // Speed/Rate measurements
    else if (fieldName.includes('rpm')) {
      unitInfo = ' (in revolutions per minute)';
    } else if (fieldName.includes('rate') || fieldName.includes('speed') || fieldName.includes('velocity')) {
      unitInfo = ' (units vary by context)';
    } else if (fieldName.includes('flow')) {
      unitInfo = ' (typically in L/min or m³/h)';
    }

    // Generic measurement fields
    else if (['value', 'result', 'reading', 'measurement'].some(term => fieldName.includes(term))) {
      if (hasUnitField) {
        unitInfo = ' (units specified in associated `unit` field)';
      } else {
        unitInfo = ' (units context-dependent)';
      }
    }

    return currentDescription + unitInfo;
  }
}

export interface DocumentationCoverageReport {
  totalTables: number;
  totalFields: number;
  tablesWithDocumentation: number;
  fieldsWithDocumentation: number;
  coverageByCategory: Record<string, {
    tables: number;
    tablesWithDocs: number;
    fields: number;
    fieldsWithDocs: number;
  }>;
  missingDocumentation: {
    tables: string[];
    fields: string[];
  };
}

export default EnhancedMetadataExtractor;