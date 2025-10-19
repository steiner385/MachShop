/**
 * Quality Service Types
 * TypeScript type definitions for quality management
 */

// ============================================================================
// Enums from Prisma Schema
// ============================================================================

export enum InspectionType {
  RECEIVING = 'RECEIVING',
  IN_PROCESS = 'IN_PROCESS',
  FINAL = 'FINAL',
  AUDIT = 'AUDIT',
  FIRST_ARTICLE = 'FIRST_ARTICLE',
  LAYOUT = 'LAYOUT'
}

export enum SamplingPlan {
  NONE = 'NONE',
  SAMPLE = 'SAMPLE',
  SKIP_LOT = 'SKIP_LOT',
  FIRST_LAST = 'FIRST_LAST',
  STATISTICAL = 'STATISTICAL'
}

export enum CharacteristicType {
  VARIABLE = 'VARIABLE',
  ATTRIBUTE = 'ATTRIBUTE',
  VISUAL = 'VISUAL',
  FUNCTIONAL = 'FUNCTIONAL',
  DIMENSIONAL = 'DIMENSIONAL',
  COSMETIC = 'COSMETIC'
}

export enum InspectionFrequency {
  EACH = 'EACH',
  FIRST = 'FIRST',
  LAST = 'LAST',
  FIRST_LAST = 'FIRST_LAST',
  SAMPLE = 'SAMPLE',
  HOURLY = 'HOURLY',
  SHIFT = 'SHIFT',
  DAILY = 'DAILY'
}

export enum InspectionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum InspectionResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  CONDITIONAL = 'CONDITIONAL',
  PENDING = 'PENDING'
}

export enum MeasurementResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  WARNING = 'WARNING',
  OUT_OF_SPEC = 'OUT_OF_SPEC'
}

export enum NCRType {
  INTERNAL = 'INTERNAL',
  SUPPLIER = 'SUPPLIER',
  CUSTOMER = 'CUSTOMER',
  AUDIT = 'AUDIT'
}

export enum NCRSeverity {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL'
}

export enum NCRStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DISPOSITION_PENDING = 'DISPOSITION_PENDING',
  CORRECTIVE_ACTION = 'CORRECTIVE_ACTION',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export enum NCRDisposition {
  USE_AS_IS = 'USE_AS_IS',
  REWORK = 'REWORK',
  SCRAP = 'SCRAP',
  RETURN = 'RETURN',
  REPAIR = 'REPAIR',
  SORT = 'SORT'
}

export enum FAIType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  DELTA = 'DELTA'
}

export enum FAIReason {
  NEW_PART = 'NEW_PART',
  ENGINEERING_CHANGE = 'ENGINEERING_CHANGE',
  TOOLING_CHANGE = 'TOOLING_CHANGE',
  PROCESS_CHANGE = 'PROCESS_CHANGE',
  SUPPLIER_CHANGE = 'SUPPLIER_CHANGE',
  RELOCATION = 'RELOCATION',
  PRODUCTION_BREAK = 'PRODUCTION_BREAK'
}

export enum FAIStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum FAIResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  CONDITIONAL = 'CONDITIONAL'
}

export enum FAICharResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  DEVIATION = 'DEVIATION'
}

export enum SignatureType {
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  WITNESSED = 'WITNESSED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  VERIFIED = 'VERIFIED'
}

// ============================================================================
// Quality Plan Types
// ============================================================================

export interface QualityPlan {
  id: string;
  planNumber: string;
  planName: string;
  description?: string;

  // Cross-service references
  partId: string;
  partNumber?: string;
  routingOperationId?: string;

  // Plan details
  inspectionType: InspectionType;
  samplingPlan: SamplingPlan;
  sampleSize?: number;
  acceptanceLevel?: number;

  // Version control
  version: string;
  isActive: boolean;
  effectiveDate?: Date;
  expirationDate?: Date;

  // Audit
  createdById: string;
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  characteristics?: QualityCharacteristic[];
  inspections?: QualityInspection[];
}

export interface QualityCharacteristic {
  id: string;
  planId: string;

  characteristicNumber: number;
  characteristicName: string;
  description?: string;
  characteristicType: CharacteristicType;

  // Specification
  nominalValue?: number;
  lowerTolerance?: number;
  upperTolerance?: number;
  unit?: string;

  // For attribute characteristics
  acceptableCriteria?: string;
  rejectionCriteria?: string;

  // Criticality
  isCritical: boolean;
  isMajor: boolean;
  isMinor: boolean;

  // Measurement method
  measurementMethod?: string;
  measurementEquipment?: string;
  testMethod?: string;

  // Frequency
  inspectionFrequency: InspectionFrequency;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  plan?: QualityPlan;
  measurements?: QualityMeasurement[];
}

// ============================================================================
// Quality Inspection Types
// ============================================================================

export interface QualityInspection {
  id: string;
  inspectionNumber: string;

  // Cross-service references
  planId: string;
  workOrderId?: string;
  partId: string;
  lotNumber?: string;
  serialNumber?: string;

  // Inspection details
  inspectionType: InspectionType;
  inspectionDate: Date;
  inspectorId: string;

  // Results
  status: InspectionStatus;
  result: InspectionResult;
  quantityInspected: number;
  quantityAccepted: number;
  quantityRejected: number;

  // NCR generation
  ncrGenerated: boolean;
  ncrId?: string;

  // Notes
  notes?: string;
  attachmentUrls: string[];

  createdAt: Date;
  updatedAt: Date;

  // Relations
  plan?: QualityPlan;
  measurements?: QualityMeasurement[];
  signatures?: ElectronicSignature[];
}

export interface QualityMeasurement {
  id: string;
  inspectionId: string;
  characteristicId: string;

  // Measurement value
  measuredValue?: number;
  measuredAttribute?: string;
  result: MeasurementResult;

  // Deviation
  deviation?: number;
  deviationPercent?: number;

  // Measurement details
  measuredBy?: string;
  measuredAt: Date;
  measurementEquipment?: string;
  measurementMethod?: string;

  // Notes
  notes?: string;

  createdAt: Date;

  // Relations
  inspection?: QualityInspection;
  characteristic?: QualityCharacteristic;
}

// ============================================================================
// NCR (Non-Conformance Report) Types
// ============================================================================

export interface NCR {
  id: string;
  ncrNumber: string;

  // Cross-service references
  partId: string;
  workOrderId?: string;
  supplierId?: string;
  lotNumber?: string;
  serialNumber?: string;

  // NCR details
  ncrType: NCRType;
  severity: NCRSeverity;
  status: NCRStatus;

  // Problem description
  problemDescription: string;
  rootCause?: string;
  quantityAffected: number;

  // Disposition
  disposition?: NCRDisposition;
  dispositionDate?: Date;
  dispositionBy?: string;
  dispositionNotes?: string;

  // Cost impact
  scrapCost?: number;
  reworkCost?: number;
  totalCost?: number;

  // Containment
  containmentAction?: string;
  containmentDate?: Date;

  // Corrective action
  correctiveAction?: string;
  correctiveActionDue?: Date;
  correctiveActionComplete: boolean;
  correctiveActionDate?: Date;

  // Preventive action
  preventiveAction?: string;
  preventiveActionComplete: boolean;

  // Audit
  createdById: string;
  assignedToId?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  signatures?: ElectronicSignature[];
}

// ============================================================================
// FAI (First Article Inspection) Types
// ============================================================================

export interface FAIReport {
  id: string;
  faiNumber: string;

  // Cross-service references
  partId: string;
  partNumber: string;
  partRevision: string;
  serialNumber?: string;

  // FAI details
  faiType: FAIType;
  reason: FAIReason;
  status: FAIStatus;

  // Dates
  inspectionDate: Date;
  submittedDate?: Date;
  approvedDate?: Date;

  // Personnel
  inspectedBy: string;
  submittedBy?: string;
  approvedBy?: string;

  // Results
  result?: FAIResult;
  quantityInspected: number;

  // Documents
  attachmentUrls: string[];
  drawingUrls: string[];

  // Notes
  notes?: string;
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  characteristics?: FAICharacteristic[];
  signatures?: ElectronicSignature[];
}

export interface FAICharacteristic {
  id: string;
  faiReportId: string;
  characteristicNumber: number;

  // Characteristic details
  characteristicName: string;
  specification: string;
  nominalValue?: number;
  lowerTolerance?: number;
  upperTolerance?: number;
  unit?: string;

  // Measurement
  measuredValue: number;
  deviation?: number;
  result: FAICharResult;

  // Measurement details
  measurementMethod?: string;
  measurementEquipment?: string;

  // Balloon number (drawing callout)
  balloonNumber?: string;

  notes?: string;
  createdAt: Date;

  // Relations
  faiReport?: FAIReport;
}

// ============================================================================
// Electronic Signature Types
// ============================================================================

export interface ElectronicSignature {
  id: string;

  // Signature details
  signatureType: SignatureType;
  meaning: string;

  // Signer
  signedById: string;
  signedByName: string;
  signedByTitle?: string;

  // Signature data
  signedAt: Date;
  ipAddress: string;
  signatureHash: string;
  signatureReason?: string;

  // Record being signed
  recordType: string;
  recordId: string;

  // Verification
  isVerified: boolean;
  verificationCode?: string;

  // Invalidation
  isInvalidated: boolean;
  invalidatedAt?: Date;
  invalidatedBy?: string;
  invalidationReason?: string;

  // Metadata
  metadata?: any;
  createdAt: Date;

  // Relations
  inspection?: QualityInspection;
  ncr?: NCR;
  faiReport?: FAIReport;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateInspectionRequest {
  planId: string;
  workOrderId?: string;
  partId: string;
  lotNumber?: string;
  serialNumber?: string;
  inspectionType: InspectionType;
  inspectionDate: Date;
  quantityInspected: number;
  notes?: string;
}

export interface UpdateInspectionRequest {
  status?: InspectionStatus;
  result?: InspectionResult;
  quantityAccepted?: number;
  quantityRejected?: number;
  notes?: string;
}

export interface CreateNCRRequest {
  partId: string;
  workOrderId?: string;
  supplierId?: string;
  lotNumber?: string;
  serialNumber?: string;
  ncrType: NCRType;
  severity: NCRSeverity;
  problemDescription: string;
  quantityAffected: number;
}

export interface UpdateNCRRequest {
  status?: NCRStatus;
  disposition?: NCRDisposition;
  dispositionNotes?: string;
  rootCause?: string;
  containmentAction?: string;
  correctiveAction?: string;
  correctiveActionDue?: Date;
  preventiveAction?: string;
  scrapCost?: number;
  reworkCost?: number;
}

export interface CreateFAIRequest {
  partId: string;
  partNumber: string;
  partRevision: string;
  serialNumber?: string;
  faiType: FAIType;
  reason: FAIReason;
  inspectionDate: Date;
}

export interface UpdateFAIRequest {
  status?: FAIStatus;
  result?: FAIResult;
  submittedDate?: Date;
  approvedDate?: Date;
  notes?: string;
  rejectionReason?: string;
}

export interface InspectionListResponse {
  inspections: QualityInspection[];
  total: number;
  page: number;
  limit: number;
}

export interface NCRListResponse {
  ncrs: NCR[];
  total: number;
  page: number;
  limit: number;
}

export interface FAIListResponse {
  faiReports: FAIReport[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardMetrics {
  inspections: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    passRate: number;
  };
  ncrs: {
    total: number;
    open: number;
    underReview: number;
    closed: number;
    byType: Record<NCRType, number>;
    bySeverity: Record<NCRSeverity, number>;
  };
  fai: {
    total: number;
    inProgress: number;
    submitted: number;
    approved: number;
    passRate: number;
  };
}

// ============================================================================
// Validation & Business Rules
// ============================================================================

export interface InspectionValidationResult {
  valid: boolean;
  errors: string[];
}

export interface NCRValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Event Types (for Kafka)
// ============================================================================

export interface InspectionCompletedEvent {
  inspectionId: string;
  inspectionNumber: string;
  result: InspectionResult;
  partId: string;
  workOrderId?: string;
  timestamp: Date;
}

export interface NCRCreatedEvent {
  ncrId: string;
  ncrNumber: string;
  severity: NCRSeverity;
  partId: string;
  workOrderId?: string;
  timestamp: Date;
}

export interface FAIApprovedEvent {
  faiId: string;
  faiNumber: string;
  result: FAIResult;
  partId: string;
  timestamp: Date;
}
