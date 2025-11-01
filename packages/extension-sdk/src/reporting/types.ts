/**
 * Report Template Extension System - Type Definitions
 * Issue #442: Report Template Extension System
 */

/**
 * Report data type
 */
export enum ReportDataType {
  ENTITY = 'entity',
  AGGREGATION = 'aggregation',
  CALCULATION = 'calculation',
  STATIC = 'static',
}

/**
 * Report field definition
 */
export interface ReportField {
  id: string;
  name: string;
  label: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'currency';
  dataSource: string; // Entity field or calculation
  format?: string;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct';
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  alignment?: 'left' | 'center' | 'right';
  visible?: boolean;
  conditional?: {
    expression: string;
    trueStyle?: ReportFieldStyle;
    falseStyle?: ReportFieldStyle;
  };
}

/**
 * Report field style
 */
export interface ReportFieldStyle {
  backgroundColor?: string;
  textColor?: string;
  fontWeight?: 'normal' | 'bold';
  textDecoration?: 'underline' | 'strikethrough';
  borderColor?: string;
  borderWidth?: number;
}

/**
 * Report group definition
 */
export interface ReportGroup {
  id: string;
  name: string;
  fieldId: string;
  sortOrder?: 'asc' | 'desc';
  subtotals?: string[]; // Field IDs to calculate subtotals
  pageBreak?: boolean;
}

/**
 * Report section definition
 */
export interface ReportSection {
  id: string;
  name: string;
  type: 'header' | 'body' | 'footer' | 'detail';
  height?: number;
  backgroundColor?: string;
  elements: ReportElement[];
  visible?: boolean;
}

/**
 * Report element (header, text, table, etc.)
 */
export interface ReportElement {
  id: string;
  type: 'text' | 'field' | 'table' | 'chart' | 'image' | 'page-number' | 'date';
  content?: string;
  fieldId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  style?: ReportFieldStyle;
  properties?: Record<string, any>;
}

/**
 * Report filter definition
 */
export interface ReportFilter {
  id: string;
  fieldId: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'between';
  value: any;
  label?: string;
  userSelectable?: boolean;
}

/**
 * Report parameter (for user input)
 */
export interface ReportParameter {
  id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'select' | 'multiselect';
  required?: boolean;
  defaultValue?: any;
  options?: { label: string; value: any }[];
}

/**
 * Report template definition
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  entityName: string; // Data source entity
  version: string;
  extensionId: string;
  createdAt: Date;
  updatedAt: Date;
  sections: ReportSection[];
  fields: ReportField[];
  groups?: ReportGroup[];
  filters?: ReportFilter[];
  parameters?: ReportParameter[];
  sortFields?: { fieldId: string; direction: 'asc' | 'desc' }[];
  pageSize?: 'letter' | 'A4' | 'legal' | 'custom';
  pageOrientation?: 'portrait' | 'landscape';
  pageMargins?: { top: number; right: number; bottom: number; left: number };
  repeatHeaderOnPages?: boolean;
  numberPages?: boolean;
  includeTimestamp?: boolean;
  columnCount?: number;
  columnSpacing?: number;
  designer?: {
    zoom?: number;
    gridSize?: number;
  };
}

/**
 * Report template configuration
 */
export interface ReportTemplateConfig {
  template: ReportTemplate;
  permissions?: ReportPermissions;
  scheduling?: ReportScheduling;
}

/**
 * Field-level permissions
 */
export interface ReportPermissions {
  canEdit: string[]; // Role/user IDs
  canView: string[]; // Role/user IDs
  canExport: string[]; // Role/user IDs
  fieldAccess?: Record<string, string[]>; // Field ID -> Role/user IDs
}

/**
 * Report scheduling
 */
export interface ReportScheduling {
  enabled?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time?: string; // HH:MM format
  timezone?: string;
  recipients?: string[]; // Email addresses
  format?: 'pdf' | 'excel' | 'csv';
}

/**
 * Report data context
 */
export interface ReportDataContext {
  entityData: any[];
  filters?: Record<string, any>;
  parameters?: Record<string, any>;
  groups?: ReportGroup[];
  totals?: Record<string, number>;
}

/**
 * Report rendering result
 */
export interface ReportRenderResult {
  html?: string;
  pdf?: Buffer;
  excel?: Buffer;
  csv?: string;
  json?: any;
  metadata: {
    generatedAt: Date;
    totalPages?: number;
    totalRows?: number;
    templateId: string;
    format: string;
  };
}

/**
 * Report export options
 */
export interface ReportExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json' | 'html';
  includeCharts?: boolean;
  includeImages?: boolean;
  compression?: boolean;
  pageBreaks?: boolean;
  filename?: string;
}

/**
 * Template element builder
 */
export interface TemplateElementBuilder {
  addTextField(id: string, label: string, dataSource: string): TemplateElementBuilder;
  addTable(id: string, fieldIds: string[]): TemplateElementBuilder;
  addChart(id: string, type: 'pie' | 'bar' | 'line', dataSource: string): TemplateElementBuilder;
  addImage(id: string, url: string): TemplateElementBuilder;
  addHeader(content: string): TemplateElementBuilder;
  addFooter(content: string): TemplateElementBuilder;
  build(): ReportTemplate;
}

/**
 * Report validation result
 */
export interface ReportValidationResult {
  valid: boolean;
  errors: {
    fieldId?: string;
    message: string;
    code: string;
  }[];
}

/**
 * Report cache entry
 */
export interface ReportCacheEntry {
  templateId: string;
  cacheKey: string;
  data: any;
  expiresAt: Date;
}

/**
 * Report generation request
 */
export interface ReportGenerationRequest {
  templateId: string;
  exportOptions: ReportExportOptions;
  filters?: Record<string, any>;
  parameters?: Record<string, any>;
  userId?: string;
}

/**
 * Report generation result
 */
export interface ReportGenerationResult {
  success: boolean;
  reportId: string;
  generatedAt: Date;
  expiresAt: Date;
  downloadUrl?: string;
  size?: number;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Report errors
 */
export class ReportError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ReportError';
  }
}

export class ReportTemplateNotFoundError extends ReportError {
  constructor(templateId: string) {
    super(`Report template not found: ${templateId}`, 'TEMPLATE_NOT_FOUND', { templateId });
    this.name = 'ReportTemplateNotFoundError';
  }
}

export class ReportValidationError extends ReportError {
  constructor(
    templateId: string,
    public validationErrors: any[]
  ) {
    super(`Validation failed for template: ${templateId}`, 'TEMPLATE_VALIDATION_ERROR', {
      templateId,
      errors: validationErrors,
    });
    this.name = 'ReportValidationError';
  }
}

export class ReportRenderingError extends ReportError {
  constructor(
    templateId: string,
    message: string
  ) {
    super(`Error rendering report: ${message}`, 'RENDERING_ERROR', { templateId });
    this.name = 'ReportRenderingError';
  }
}

export class ReportPermissionError extends ReportError {
  constructor(
    templateId: string,
    action: string
  ) {
    super(`Permission denied for ${action} on template: ${templateId}`, 'PERMISSION_DENIED', {
      templateId,
      action,
    });
    this.name = 'ReportPermissionError';
  }
}

/**
 * Report template registry interface
 */
export interface IReportTemplateRegistry {
  register(config: ReportTemplateConfig): void;
  unregister(templateId: string): void;
  get(templateId: string): ReportTemplate | undefined;
  list(): ReportTemplate[];
  validate(template: ReportTemplate): ReportValidationResult;
  clone(templateId: string, newName: string): ReportTemplate;
}

/**
 * Report rendering interface
 */
export interface IReportRenderer {
  render(template: ReportTemplate, data: ReportDataContext, options: ReportExportOptions): Promise<ReportRenderResult>;
}
