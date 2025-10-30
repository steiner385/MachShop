/**
 * TypeScript types for database schema metadata
 * Used by data dictionary infrastructure tools
 */

export interface SchemaMetadata {
  models: ModelMetadata[];
  enums: EnumMetadata[];
  generators: GeneratorMetadata[];
  datasource: DatasourceMetadata;
  generatedAt: string;
  totalModels: number;
  totalFields: number;
  totalRelationships: number;
}

export interface ModelMetadata {
  name: string;
  dbName?: string;
  fields: FieldMetadata[];
  primaryKey?: PrimaryKeyMetadata;
  uniqueFields: UniqueConstraintMetadata[];
  indices: IndexMetadata[];
  documentation?: string;
  businessRules?: string[];
  category?: string;
  relationships: RelationshipMetadata[];
  isJunctionTable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FieldMetadata {
  name: string;
  type: string;
  kind: 'scalar' | 'object' | 'enum' | 'unsupported';
  isList: boolean;
  isOptional: boolean;
  isReadOnly: boolean;
  hasDefaultValue: boolean;
  defaultValue?: any;
  isGenerated: boolean;
  generationStrategy?: string;
  isId: boolean;
  isUnique: boolean;
  dbNames?: string[];
  documentation?: string;
  businessRule?: string;
  constraints?: FieldConstraint[];
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  relationOnDelete?: string;
  relationOnUpdate?: string;
}

export interface FieldConstraint {
  type: 'length' | 'range' | 'pattern' | 'custom';
  value: any;
  description: string;
}

export interface RelationshipMetadata {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  relatedModel: string;
  fieldName: string;
  isRequired: boolean;
  description?: string;
  throughModel?: string; // For many-to-many relationships
}

export interface EnumMetadata {
  name: string;
  values: EnumValueMetadata[];
  documentation?: string;
  dbName?: string;
}

export interface EnumValueMetadata {
  name: string;
  dbName?: string;
  documentation?: string;
}

export interface PrimaryKeyMetadata {
  name?: string;
  fields: string[];
}

export interface UniqueConstraintMetadata {
  name?: string;
  fields: string[];
}

export interface IndexMetadata {
  name?: string;
  fields: string[];
  type?: string;
}

export interface GeneratorMetadata {
  name: string;
  provider: string;
  output?: string;
  config: Record<string, any>;
}

export interface DatasourceMetadata {
  name: string;
  provider: string;
  url: string;
  shadowDatabaseUrl?: string;
}

export interface TableDocumentation {
  tableName: string;
  description: string;
  businessPurpose: string;
  dataOwner: string;
  updateFrequency: string;
  complianceNotes?: string;
  examples?: Array<{
    scenario: string;
    sampleData: Record<string, any>;
  }>;
}

export interface BusinessRule {
  id: string;
  description: string;
  type: 'validation' | 'calculation' | 'workflow' | 'constraint';
  scope: 'field' | 'record' | 'table' | 'cross-table';
  implementation: 'database' | 'application' | 'manual';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface DataDictionaryConfig {
  includeGeneratedFields: boolean;
  includeSystemTables: boolean;
  groupByCategory: boolean;
  includeBusinessRules: boolean;
  outputFormats: Array<'html' | 'markdown' | 'json' | 'csv'>;
  customCategories: Record<string, string[]>;
}

export interface DocumentationTemplate {
  name: string;
  description: string;
  template: string;
  requiredFields: string[];
  optionalFields: string[];
}