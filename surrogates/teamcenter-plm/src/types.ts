/**
 * Type definitions for Teamcenter PLM Surrogate
 * Issue #241: Testing Infrastructure - PLM System Surrogates
 */

// ============================================================================
// PART MANAGEMENT TYPES
// ============================================================================

export enum PartLifecycleState {
  DESIGN = 'DESIGN',
  REVIEW = 'REVIEW',
  RELEASED = 'RELEASED',
  PRODUCTION = 'PRODUCTION',
  OBSOLETE = 'OBSOLETE'
}

export interface PartAttribute {
  name: string;
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

export interface Part {
  id: string;
  partNumber: string;
  partName: string;
  description?: string;
  revision: string;
  version: number;
  lifecycleState: PartLifecycleState;
  classification?: string;
  family?: string;
  manufacturer?: string;
  materialSpecification?: string;
  unitOfMeasure?: string;
  attributes: PartAttribute[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  revisedBy?: string;
  revisionHistory: PartRevision[];
}

export interface PartRevision {
  revision: string;
  version: number;
  lifecycleState: PartLifecycleState;
  createdAt: Date;
  createdBy: string;
  description?: string;
}

// ============================================================================
// BOM TYPES
// ============================================================================

export enum BOMEffectivityType {
  DATE = 'DATE',
  SERIAL_NUMBER = 'SERIAL_NUMBER',
  PRODUCTION_RUN = 'PRODUCTION_RUN',
  NONE = 'NONE'
}

export interface BOMLineItem {
  lineNumber: number;
  partId: string;
  partNumber: string;
  quantity: number;
  unitOfMeasure: string;
  optionalFlag: boolean;
  alternatePartId?: string;
  alternatePartNumber?: string;
  effectivityType: BOMEffectivityType;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  notes?: string;
  configurationId?: string;
}

export interface BOM {
  id: string;
  topLevelPartId: string;
  topLevelPartNumber: string;
  revision: string;
  version: number;
  bomType: 'ENGINEERING' | 'MANUFACTURING' | 'SERVICE';
  lineItems: BOMLineItem[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface BOMLevel {
  level: number;
  lineNumber: number;
  partId: string;
  partNumber: string;
  partName: string;
  quantity: number;
  unitOfMeasure: string;
  children?: BOMLevel[];
}

export interface BOMExplosion {
  topLevelPartId: string;
  totalLevels: number;
  totalPartCount: number;
  structure: BOMLevel[];
}

export interface WhereUsedResult {
  partId: string;
  partNumber: string;
  usedInAssemblies: string[];
  usedAtLevels: Record<string, number[]>;
  totalUsageCount: number;
}

// ============================================================================
// CHARACTERISTICS & SPECIFICATIONS TYPES
// ============================================================================

export enum CharacteristicType {
  DIMENSION = 'DIMENSION',
  TOLERANCE = 'TOLERANCE',
  MATERIAL = 'MATERIAL',
  SURFACE_FINISH = 'SURFACE_FINISH',
  HARDNESS = 'HARDNESS',
  WEIGHT = 'WEIGHT',
  PERFORMANCE = 'PERFORMANCE',
  OTHER = 'OTHER'
}

export interface Characteristic {
  id: string;
  partId: string;
  characteristicType: CharacteristicType;
  name: string;
  specification: string;
  nominalValue?: number;
  upperControlLimit?: number;
  lowerControlLimit?: number;
  tolerance?: {
    upper: number;
    lower: number;
  };
  unit?: string;
  inspectionRequired: boolean;
  testProcedure?: string;
  criticality: 'CRITICAL' | 'MAJOR' | 'MINOR';
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityPlan {
  id: string;
  partId: string;
  planCode: string;
  planName: string;
  characteristics: Characteristic[];
  inspectionLevel: 'NORMAL' | 'TIGHTENED' | 'REDUCED';
  sampleSize?: number;
  acceptanceCriteria?: string;
  revisionLevel: number;
  effectiveFrom: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ENGINEERING CHANGE MANAGEMENT TYPES
// ============================================================================

export enum ECRState {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum ECOState {
  PROPOSED = 'PROPOSED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  IMPLEMENTED = 'IMPLEMENTED',
  CANCELLED = 'CANCELLED'
}

export interface ChangeItem {
  partId?: string;
  partNumber?: string;
  bomLineId?: string;
  changeType: 'ADD' | 'REMOVE' | 'MODIFY' | 'REPLACE';
  description: string;
  justification: string;
  impactedAssemblies?: string[];
}

export interface ECR {
  id: string;
  ecrNumber: string;
  title: string;
  description: string;
  initiator: string;
  state: ECRState;
  reason: string;
  changeItems: ChangeItem[];
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  submittedBy?: string;
}

export interface ECO {
  id: string;
  ecoNumber: string;
  ecrId: string;
  title: string;
  description: string;
  changeItems: ChangeItem[];
  state: ECOState;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  implementationDate?: Date;
  effectivityType: BOMEffectivityType;
  effectiveDate?: Date;
  approvers: string[];
  approvalHistory: ApprovalRecord[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  implementedAt?: Date;
  implementedBy?: string;
}

export interface ApprovalRecord {
  approver: string;
  action: 'APPROVED' | 'REJECTED' | 'PENDING';
  comment?: string;
  timestamp: Date;
}

// ============================================================================
// CAD INTEGRATION TYPES
// ============================================================================

export interface CADMetadata {
  id: string;
  partId: string;
  fileFormat: 'STEP' | 'IGES' | 'PDF' | 'JPEG' | 'SVG' | 'OTHER';
  filePath: string;
  fileSize: number;
  fileUUID?: string;
  checksum?: string;
  modelType: 'SOLID' | 'SURFACE' | 'WIREFRAME' | 'DRAWING';
  title?: string;
  description?: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface PMIData {
  id: string;
  partId: string;
  characteristicId?: string;
  type: 'DIMENSION' | 'TOLERANCE' | 'GEOMETRIC_TOLERANCE' | 'ANNOTATION';
  value?: string;
  unit?: string;
  linkedToDrawing?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface STEPMetadata {
  id: string;
  partId: string;
  stepUUID: string;
  stepVersion: string;
  modelData: Record<string, any>;
  pmiData: PMIData[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DOCUMENT MANAGEMENT TYPES
// ============================================================================

export interface Document {
  id: string;
  docNumber: string;
  title: string;
  type: 'WORK_INSTRUCTION' | 'SPEC' | 'QUALITY_PLAN' | 'TEST_PROCEDURE' | 'DRAWING';
  partId?: string;
  revision: string;
  status: 'DRAFT' | 'APPROVED' | 'SUPERSEDED';
  owner: string;
  content?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

// ============================================================================
// ERROR SCENARIO TYPES
// ============================================================================

export interface ErrorScenario {
  id: string;
  name: string;
  description: string;
  triggerCondition: string;
  httpStatus: number;
  errorCode: string;
  errorMessage: string;
  enabled: boolean;
  createdAt: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  timestamp: Date;
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sort?: string;
  filter?: Record<string, any>;
}

// ============================================================================
// TEST DATA CONFIGURATION
// ============================================================================

export interface TestDataConfig {
  scenario: 'SIMPLE' | 'MEDIUM' | 'COMPLEX' | 'GE9X';
  partCount: number;
  bomLevels: number;
  enableECOs: boolean;
  enableCADData: boolean;
  seed?: number;
}

export interface MockDataState {
  parts: Map<string, Part>;
  boms: Map<string, BOM>;
  characteristics: Map<string, Characteristic>;
  ecrs: Map<string, ECR>;
  ecos: Map<string, ECO>;
  documents: Map<string, Document>;
  cadMetadata: Map<string, CADMetadata>;
  errorScenarios: Map<string, ErrorScenario>;
  lastUpdated: Date;
}
