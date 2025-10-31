export enum InspectionResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  CONDITIONAL = 'CONDITIONAL'
}

// ✅ GITHUB ISSUE #55: Enhanced NCR Workflow States - Phase 1-2
// Extended from 4 to 12 states to support CTP, DDR, MRB workflows
export enum NCRStatus {
  // Basic states
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',

  // Investigation states
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  CONTAINMENT = 'CONTAINMENT',

  // Disposition states
  PENDING_DISPOSITION = 'PENDING_DISPOSITION',

  // Advanced dispositions
  CTP = 'CTP',                  // Continue to Process
  DDR = 'DDR',                  // Delayed Disposition Required
  MRB = 'MRB',                  // Material Review Board

  // Final states
  CORRECTIVE_ACTION = 'CORRECTIVE_ACTION',
  VERIFICATION = 'VERIFICATION',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',

  // Legacy support (deprecated in Phase 2+)
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DISPOSITION_SET = 'DISPOSITION_SET'
}

export enum NCRSeverity {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL'
}

// ✅ GITHUB ISSUE #55: Enhanced NCR Dispositions - Phase 1-2
// Extended from 5 to 8 dispositions to support aerospace requirements
export enum NCRDisposition {
  REWORK = 'REWORK',
  REPAIR = 'REPAIR',
  SCRAP = 'SCRAP',
  USE_AS_IS = 'USE_AS_IS',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
  SORT_AND_SEGREGATE = 'SORT_AND_SEGREGATE',
  RETURN_TO_STOCK = 'RETURN_TO_STOCK',
  ENGINEER_USE_ONLY = 'ENGINEER_USE_ONLY'
}

export enum CharacteristicType {
  DIMENSIONAL = 'DIMENSIONAL',
  VISUAL = 'VISUAL',
  ATTRIBUTE = 'ATTRIBUTE',
  VARIABLE = 'VARIABLE'
}

export interface QualityCharacteristic {
  id: string;
  qualityPlanId: string;
  characteristicNumber: number;
  characteristicName: string;
  characteristicType: CharacteristicType;
  specificationNominal?: number;
  specificationLowerLimit?: number;
  specificationUpperLimit?: number;
  uom?: string;
  measurementMethod?: string;
  requiredEquipment?: string;
  isCritical: boolean;
  controlChartType?: string;
  createdAt: Date;
}

export interface Inspection {
  id: string;
  inspectionNumber: string;
  workOrderOperationId: string;
  qualityPlanId: string;
  lotNumber?: string;
  serialNumber?: string;
  sampleSize: number;
  inspectorId: string;
  inspectionDate: Date;
  overallResult: InspectionResult;
  notes?: string;
  certificateRequired: boolean;
  certificateGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
  results?: InspectionMeasurement[];
}

export interface InspectionMeasurement {
  id: string;
  inspectionId: string;
  qualityCharacteristicId: string;
  sampleNumber: number;
  measuredValue?: number;
  attributeValue?: string;
  result: InspectionResult;
  outOfSpecReason?: string;
  measurementEquipment?: string;
  measuredAt: Date;
  measuredBy?: string;
  createdAt: Date;
}

export interface NonConformanceReport {
  id: string;
  ncrNumber: string;
  inspectionId?: string;
  workOrderId?: string;
  partId: string;
  description: string;
  quantityAffected: number;
  severity: NCRSeverity;
  status: NCRStatus;
  disposition?: NCRDisposition;
  dispositionReason?: string;
  rootCause?: string;
  correctiveAction?: string;
  reportedBy: string;
  reportedDate: Date;
  reviewedBy?: string;
  reviewedDate?: Date;
  closedBy?: string;
  closedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeasurementValidationResult {
  isValid: boolean;
  result: InspectionResult;
  deviation?: number;
  message?: string;
}

export interface QualityMetrics {
  firstPassYield: number;
  defectRate: number;
  customerComplaints: number;
  ncrCount: number;
  averageInspectionTime: number;
}

// ============================================================================
// ✅ GITHUB ISSUE #55: Enhanced NCR Workflow Types - Phase 1-2
// ============================================================================

/**
 * Effectivity types for NCR disposition applicability
 */
export enum NCREffectivityType {
  SERIAL_NUMBER = 'SERIAL_NUMBER',
  PRODUCTION_RUN = 'PRODUCTION_RUN',
  DATE_EFFECTIVE = 'DATE_EFFECTIVE',
  NONE = 'NONE'
}

/**
 * CTP (Continue to Process) Authorization status
 */
export enum CTPAuthorizationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

/**
 * DDR (Delayed Disposition Required) status
 */
export enum DDRStatus {
  PENDING = 'PENDING',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED'
}

/**
 * MRB (Material Review Board) voting status
 */
export enum MRBVoteStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ABSTAIN = 'ABSTAIN'
}

/**
 * CTP (Continue to Process) Authorization
 * Allows continued use of nonconforming material pending final disposition
 */
export interface CTPAuthorization {
  id: string;
  ncrId: string;
  justification: string;
  authorizedBy: string;
  authorizationDate: Date;
  expirationDate: Date;
  status: CTPAuthorizationStatus;
  operationId?: string;
  trackedQuantity?: number;
  completedQuantity?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pending item in a DDR request
 */
export interface DDRPendingItem {
  id: string;
  description: string;
  ownerEmail: string;
  targetDate: Date;
  isCompleted: boolean;
  completedDate?: Date;
  notes?: string;
}

/**
 * DDR (Delayed Disposition Required) Request
 * Used when disposition cannot be determined immediately
 */
export interface DDRRequest {
  id: string;
  ncrId: string;
  reason: string;
  expectedResolutionDate: Date;
  requiredApprovals: string[];
  pendingItems: DDRPendingItem[];
  escalationLevel: number;
  status: DDRStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MRB member information
 */
export interface MRBMember {
  email: string;
  role: string;           // e.g., 'ENGINEERING', 'QUALITY', 'OPERATIONS'
  votingStatus: MRBVoteStatus;
}

/**
 * Individual MRB vote
 */
export interface MRBVote {
  memberId: string;
  memberEmail: string;
  disposition: NCRDisposition;
  voteReason: string;
  votedAt: Date;
}

/**
 * MRB (Material Review Board) Meeting
 * Formal review and disposition voting for critical NCRs
 */
export interface MRBMeeting {
  id: string;
  ncrId: string;
  scheduledDate: Date;
  meetingLocation?: string;
  mrbMembers: MRBMember[];
  mrbVotes: MRBVote[];
  decision?: NCRDisposition;
  decisionReason?: string;
  decisionDate?: Date;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  meetingNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * NCR state history record (audit trail)
 */
export interface NCRStateHistory {
  id: string;
  ncrId: string;
  fromStatus: NCRStatus;
  toStatus: NCRStatus;
  changedBy: string;
  changedAt: Date;
  reason?: string;
  approvalDetails?: {
    approvalId: string;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
}

/**
 * NCR approval request (integrates with Issue #147 unified approval system)
 */
export interface NCRApprovalRequest {
  id: string;
  ncrId: string;
  approvalType: 'DISPOSITION' | 'CTP_AUTHORIZATION' | 'DDR_RESOLUTION' | 'MRB_DECISION';
  approverEmail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: Date;
  responseDate?: Date;
  responseComment?: string;
  unifiedApprovalId?: string;  // Reference to Issue #147 unified approval
}

/**
 * Disposition cost tracking
 */
export interface DispositionCost {
  id: string;
  ncrId: string;
  disposition: NCRDisposition;
  estimatedCost: number;
  actualCost?: number;
  scrapCost?: number;
  reworkCost?: number;
  returnCost?: number;
  currency: string;           // e.g., 'USD', 'EUR'
  costCenter?: string;
  costApprovedBy?: string;
  costApprovalDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Disposition effectivity details
 */
export interface DispositionEffectivity {
  type: NCREffectivityType;
  value?: string;  // Serial number, date, production run
}

/**
 * NCR workflow configuration (site-specific, severity-level-specific)
 * Controls allowed state transitions and required approvals
 */
export interface NCRWorkflowConfig {
  id: string;
  siteId: string;
  severityLevel: NCRSeverity;
  allowedStateTransitions: {
    from: NCRStatus;
    to: NCRStatus[];
  }[];
  dispositionsByState: {
    status: NCRStatus;
    allowedDispositions: NCRDisposition[];
  }[];
  requiredApprovalsForDisposition: {
    severity: NCRSeverity;
    disposition: NCRDisposition;
    approverRoles: string[];
    approvalCount: number;
  }[];
  ctpExpirationDays: number;     // Default: 30 days
  ddrMaxDays: number;            // Default: 15 days
  mrbScheduleBuffer?: number;    // Days before MRB scheduling
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enhanced NonConformanceReport with Phase 1-2 features
 * Extends base NonConformanceReport with advanced workflow support
 */
export interface NonConformanceReportEnhanced extends NonConformanceReport {
  // Phase 1-2: Enhanced status tracking
  status: NCRStatus;
  disposition?: NCRDisposition;
  dispositionEffectivity?: DispositionEffectivity;

  // Phase 1-2: State history (audit trail)
  stateHistory: NCRStateHistory[];

  // Phase 1-2: Advanced disposition tracking
  ctpAuthorization?: CTPAuthorization;
  ddrRequest?: DDRRequest;
  mrbMeeting?: MRBMeeting;

  // Phase 1-2: Cost tracking
  dispositionCost?: DispositionCost;

  // Phase 1-2: Approval integration (Issue #147)
  approvalRequests: NCRApprovalRequest[];

  // Audit fields
  lastModifiedBy: string;
  lastModifiedAt: Date;
}