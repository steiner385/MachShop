/**
 * UI Builder Comprehensive Types
 * Covers Canvas Editor (#485), Templates (#486), Multi-Site (#487), API (#488), Documentation (#489)
 */

// ============================================================================
// Canvas Editor Types (#485)
// ============================================================================

export enum CanvasElementType {
  CONTAINER = 'container',
  FORM = 'form',
  BUTTON = 'button',
  TEXT = 'text',
  IMAGE = 'image',
  INPUT = 'input',
  SELECT = 'select',
  TABLE = 'table',
  CHART = 'chart',
  CARD = 'card',
  GRID = 'grid',
  FLEX = 'flex',
  MODAL = 'modal',
  PANEL = 'panel',
  SECTION = 'section',
}

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  name: string;
  parent?: string;
  children?: string[];
  props: Record<string, unknown>;
  styles: CSSProperties;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  visible: boolean;
  locked: boolean;
  selected?: boolean;
}

export interface CSSProperties {
  [key: string]: string | number | undefined;
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  padding?: string;
  margin?: string;
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string | number;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
  opacity?: number;
  transform?: string;
  transition?: string;
}

export interface CanvasState {
  elements: Map<string, CanvasElement>;
  selectedElementId?: string;
  history: CanvasHistoryEntry[];
  historyIndex: number;
  zoom: number;
  panX: number;
  panY: number;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
}

export interface CanvasHistoryEntry {
  action: 'add' | 'remove' | 'modify' | 'move' | 'resize';
  elementId: string;
  before: CanvasElement | undefined;
  after: CanvasElement | undefined;
  timestamp: number;
}

export interface DataBinding {
  elementId: string;
  property: string;
  source: 'api' | 'database' | 'variable' | 'form';
  sourceId: string;
  dataPath?: string;
  transform?: string; // JS expression
  refreshInterval?: number;
}

export interface LayoutBreakpoint {
  name: 'mobile' | 'tablet' | 'desktop';
  minWidth: number;
  maxWidth: number;
  columnCount: number;
}

// ============================================================================
// Template Types (#486)
// ============================================================================

export enum FormCategory {
  WORK_ORDER = 'work_order',
  QUALITY = 'quality',
  INVENTORY = 'inventory',
  EQUIPMENT = 'equipment',
  PERSONNEL = 'personnel',
  MAINTENANCE = 'maintenance',
  INSPECTION = 'inspection',
  ROUTING = 'routing',
  PRODUCTION = 'production',
  REPORTING = 'reporting',
}

export interface FormTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  category: FormCategory;
  icon?: string;
  thumbnail?: string;
  version: string;
  tags: string[];

  // Canvas representation
  canvasElements: CanvasElement[];
  dataBindings: DataBinding[];

  // Manufacturing specific
  manufacturingDomain: 'MES' | 'Quality' | 'Inventory' | 'Equipment' | 'Personnel';
  useCases: string[];
  sampleData?: Record<string, unknown>;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  previewImage?: string;
}

export interface ManufacturingFormTemplate extends FormTemplate {
  requiredFields: string[];
  validationRules: ValidationRule[];
  workflowIntegration?: {
    trigger: string;
    action: string;
  };
  qualityGates?: QualityGate[];
}

export interface ValidationRule {
  fieldId: string;
  rule: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface QualityGate {
  name: string;
  condition: string;
  action: 'hold' | 'escalate' | 'log';
  notifyRoles?: string[];
}

export const WORK_ORDER_TEMPLATES = {
  standard: 'workorder_standard',
  complex: 'workorder_complex',
  rapid: 'workorder_rapid',
};

export const QUALITY_TEMPLATES = {
  inspection: 'quality_inspection',
  ncr: 'quality_ncr',
  capa: 'quality_capa',
  fai: 'quality_fai',
};

export const INVENTORY_TEMPLATES = {
  receipt: 'inventory_receipt',
  staging: 'inventory_staging',
  consumption: 'inventory_consumption',
};

// ============================================================================
// Multi-Site Types (#487)
// ============================================================================

export enum InheritanceLevel {
  GLOBAL = 'global',
  REGION = 'region',
  SITE = 'site',
}

export interface SiteConfiguration {
  siteId: string;
  siteName: string;
  region: string;
  parentSiteId?: string;
  inheritsFrom: InheritanceLevel;
  customizations: Map<string, FormTemplate>;
  overrides: Map<string, Record<string, unknown>>;
  permissions: Record<string, string[]>;
  timezone: string;
  locale: string;
}

export interface MultiSiteFormManager {
  formId: string;
  globalTemplate: FormTemplate;
  siteConfigs: Map<string, SiteConfiguration>;
  versionHistory: FormVersion[];
  synchronizationStatus: SyncStatus;
}

export interface FormVersion {
  version: string;
  formId: string;
  template: FormTemplate;
  createdAt: Date;
  createdBy: string;
  releaseNotes?: string;
  isActive: boolean;
  rolloutStrategy: 'immediate' | 'staged' | 'canary' | 'scheduled';
  rolloutDates?: {
    startDate: Date;
    endDate?: Date;
    targetSites?: string[];
  };
}

export interface SyncStatus {
  status: 'synced' | 'pending' | 'conflict' | 'error';
  lastSyncTime?: Date;
  syncedSites: string[];
  pendingSites: string[];
  conflicts?: SyncConflict[];
  error?: { code: string; message: string };
}

export interface SyncConflict {
  siteId: string;
  fieldId: string;
  globalValue: unknown;
  siteValue: unknown;
  resolution?: 'use-global' | 'use-site' | 'merge';
}

// ============================================================================
// REST API Types (#488)
// ============================================================================

export interface APIRequest<T = any> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  body?: T;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  auth?: { type: string; token: string };
}

export interface APIResponse<T = any> {
  success: boolean;
  status: number;
  data?: T;
  error?: { code: string; message: string };
  timestamp: number;
  requestId: string;
}

export interface FormAPIEndpoints {
  // Form CRUD
  createForm: '/api/forms' | 'POST';
  getForm: '/api/forms/:id' | 'GET';
  updateForm: '/api/forms/:id' | 'PUT';
  deleteForm: '/api/forms/:id' | 'DELETE';
  listForms: '/api/forms' | 'GET';

  // Field management
  addField: '/api/forms/:id/fields' | 'POST';
  updateField: '/api/forms/:id/fields/:fieldId' | 'PUT';
  removeField: '/api/forms/:id/fields/:fieldId' | 'DELETE';
  listFields: '/api/forms/:id/fields' | 'GET';

  // Form data
  submitFormData: '/api/forms/:id/submit' | 'POST';
  getFormData: '/api/forms/:id/data/:dataId' | 'GET';
  listFormData: '/api/forms/:id/data' | 'GET';
  updateFormData: '/api/forms/:id/data/:dataId' | 'PUT';

  // Versioning
  getFormVersion: '/api/forms/:id/versions/:version' | 'GET';
  listFormVersions: '/api/forms/:id/versions' | 'GET';
  rollbackVersion: '/api/forms/:id/versions/:version/rollback' | 'POST';

  // Templates
  createTemplate: '/api/templates' | 'POST';
  getTemplate: '/api/templates/:id' | 'GET';
  listTemplates: '/api/templates' | 'GET';
  publishTemplate: '/api/templates/:id/publish' | 'POST';

  // Multi-site
  getSiteConfig: '/api/sites/:siteId/forms/:formId' | 'GET';
  updateSiteConfig: '/api/sites/:siteId/forms/:formId' | 'PUT';
  syncForm: '/api/forms/:id/sync' | 'POST';

  // Integration
  validateFormSchema: '/api/forms/:id/validate' | 'POST';
  exportForm: '/api/forms/:id/export' | 'GET';
  importForm: '/api/forms/import' | 'POST';
}

// ============================================================================
// Documentation & Testing Types (#489)
// ============================================================================

export interface FormDocumentation {
  formId: string;
  title: string;
  description: string;
  overview: string;

  // User guide
  userGuide: {
    quickStart: string;
    fieldDescriptions: Record<string, FieldDocumentation>;
    workflowInstructions: string;
    examples: Example[];
  };

  // Developer guide
  developerGuide: {
    architecture: string;
    apiReference: APIDocumentation[];
    codeExamples: CodeExample[];
    dataModel: DataModelDoc;
  };

  // Admin guide
  adminGuide: {
    configuration: string;
    permissions: PermissionDocumentation[];
    multiSiteSetup: string;
    troubleshooting: TroubleshootingGuide[];
  };

  // Testing
  testScenarios: TestScenario[];
  testData: Record<string, TestDataSet>;
}

export interface FieldDocumentation {
  name: string;
  type: string;
  required: boolean;
  description: string;
  validationRules?: string[];
  examples?: string[];
}

export interface Example {
  name: string;
  description: string;
  steps: string[];
  expectedResult: string;
}

export interface APIDocumentation {
  method: string;
  endpoint: string;
  description: string;
  parameters: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: { example: unknown; schema: Record<string, unknown> };
  responseBody?: { example: unknown; schema: Record<string, unknown> };
  errorCodes: { code: string; description: string }[];
}

export interface CodeExample {
  language: string;
  title: string;
  description: string;
  code: string;
}

export interface DataModelDoc {
  entities: { name: string; fields: string[]; relationships: string[] }[];
  diagram?: string;
}

export interface PermissionDocumentation {
  permission: string;
  description: string;
  roles: string[];
}

export interface TroubleshootingGuide {
  issue: string;
  symptoms: string[];
  causes: string[];
  solutions: string[];
}

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  category: 'functional' | 'integration' | 'performance' | 'accessibility';
  steps: TestStep[];
  expectedResults: string[];
  preconditions?: string[];
  postconditions?: string[];
}

export interface TestStep {
  step: number;
  action: string;
  expectedBehavior?: string;
}

export interface TestDataSet {
  name: string;
  description: string;
  data: Record<string, unknown>[];
  cleanup?: string;
}

export interface ComplianceChecklist {
  wcag2_1_aa: boolean;
  fda_21_cfr_part_11?: boolean;
  iso_9001_2015?: boolean;
  iec_61508_2010?: boolean;
  dataPrivacy?: boolean;
  accessControl?: boolean;
  auditTrail?: boolean;
}
