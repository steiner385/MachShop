/**
 * ✅ GITHUB ISSUE #22: ECO (Engineering Change Order) Type Definitions
 *
 * TypeScript interfaces and types for the ECO system
 */

import {
  ECOType,
  ECOPriority,
  ECOStatus,
  ECOTaskType,
  ECOTaskStatus,
  ECOEventType,
  EffectivityType,
  CRBDecision,
  AttachmentType,
  ECORelationType,
  VotingRule,
  DocUpdateStatus
} from '@prisma/client';

// ============================================================================
// ECO Input/Output Types
// ============================================================================

export interface ECOCreateInput {
  title: string;
  description: string;
  ecoType: ECOType;
  priority: ECOPriority;
  currentState: string;
  proposedChange: string;
  reasonForChange: string;
  benefitsExpected?: string;
  risksIfNotImplemented?: string;
  requestorId: string;
  requestorName: string;
  requestorDept?: string;
  sponsorId?: string;
  sponsorName?: string;
  affectedParts?: string[];
  affectedOperations?: string[];
  estimatedCost?: number;
  estimatedSavings?: number;
  requestedEffectiveDate?: Date;
  effectivityType?: EffectivityType;
  effectivityValue?: string;
  isInterchangeable?: boolean;
}

export interface ECOUpdateInput {
  title?: string;
  description?: string;
  ecoType?: ECOType;
  priority?: ECOPriority;
  currentState?: string;
  proposedChange?: string;
  reasonForChange?: string;
  benefitsExpected?: string;
  risksIfNotImplemented?: string;
  sponsorId?: string;
  sponsorName?: string;
  affectedParts?: string[];
  affectedOperations?: string[];
  estimatedCost?: number;
  actualCost?: number;
  estimatedSavings?: number;
  actualSavings?: number;
  requestedEffectiveDate?: Date;
  plannedEffectiveDate?: Date;
  actualEffectiveDate?: Date;
  effectivityType?: EffectivityType;
  effectivityValue?: string;
  isInterchangeable?: boolean;
  impactAnalysis?: any;
}

export interface ECOResponse {
  id: string;
  ecoNumber: string;
  title: string;
  description: string;
  ecoType: ECOType;
  priority: ECOPriority;
  status: ECOStatus;
  currentState: string;
  proposedChange: string;
  reasonForChange: string;
  benefitsExpected?: string;
  risksIfNotImplemented?: string;
  requestorId: string;
  requestorName: string;
  requestorDept?: string;
  requestDate: Date;
  sponsorId?: string;
  sponsorName?: string;
  impactAnalysis?: any;
  affectedParts: string[];
  affectedOperations: string[];
  estimatedCost?: number;
  actualCost?: number;
  estimatedSavings?: number;
  actualSavings?: number;
  costCurrency: string;
  requestedEffectiveDate?: Date;
  plannedEffectiveDate?: Date;
  actualEffectiveDate?: Date;
  effectivityType?: EffectivityType;
  effectivityValue?: string;
  isInterchangeable: boolean;
  crbReviewDate?: Date;
  crbDecision?: CRBDecision;
  crbNotes?: string;
  completedDate?: Date;
  verifiedDate?: Date;
  closedDate?: Date;
  closedById?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  affectedDocuments?: ECOAffectedDocumentResponse[];
  tasks?: ECOTaskResponse[];
  attachments?: ECOAttachmentResponse[];
  history?: ECOHistoryResponse[];
  crbReviews?: ECOCRBReviewResponse[];
  relatedECOs?: ECORelationResponse[];
}

// ============================================================================
// ECO Task Types
// ============================================================================

export interface ECOTaskCreateInput {
  taskName: string;
  description?: string;
  taskType: ECOTaskType;
  assignedToId?: string;
  assignedToName?: string;
  assignedToDept?: string;
  dueDate?: Date;
  prerequisiteTasks?: string[];
}

export interface ECOTaskUpdateInput {
  taskName?: string;
  description?: string;
  taskType?: ECOTaskType;
  assignedToId?: string;
  assignedToName?: string;
  assignedToDept?: string;
  status?: ECOTaskStatus;
  dueDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  prerequisiteTasks?: string[];
  completionNotes?: string;
  verifiedById?: string;
  verifiedAt?: Date;
}

export interface ECOTaskResponse {
  id: string;
  ecoId: string;
  taskName: string;
  description?: string;
  taskType: ECOTaskType;
  assignedToId?: string;
  assignedToName?: string;
  assignedToDept?: string;
  status: ECOTaskStatus;
  dueDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  prerequisiteTasks: string[];
  completionNotes?: string;
  verifiedById?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ECO Affected Document Types
// ============================================================================

export interface ECOAffectedDocumentCreateInput {
  documentType: string;
  documentId: string;
  documentTitle: string;
  currentVersion?: string;
  targetVersion?: string;
  assignedToId?: string;
  assignedToName?: string;
}

export interface ECOAffectedDocumentResponse {
  id: string;
  ecoId: string;
  documentType: string;
  documentId: string;
  documentTitle: string;
  currentVersion?: string;
  targetVersion?: string;
  status: DocUpdateStatus;
  assignedToId?: string;
  assignedToName?: string;
  updateStartedAt?: Date;
  updateCompletedAt?: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ECO Attachment Types
// ============================================================================

export interface ECOAttachmentCreateInput {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  attachmentType: AttachmentType;
  description?: string;
  uploadedById: string;
  uploadedByName: string;
}

export interface ECOAttachmentResponse {
  id: string;
  ecoId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  attachmentType: AttachmentType;
  description?: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: Date;
}

// ============================================================================
// ECO History Types
// ============================================================================

export interface ECOHistoryCreateInput {
  eventType: ECOEventType;
  eventDescription: string;
  fromStatus?: ECOStatus;
  toStatus?: ECOStatus;
  details?: any;
  performedById: string;
  performedByName: string;
  performedByRole?: string;
}

export interface ECOHistoryResponse {
  id: string;
  ecoId: string;
  eventType: ECOEventType;
  eventDescription: string;
  fromStatus?: ECOStatus;
  toStatus?: ECOStatus;
  details?: any;
  performedById: string;
  performedByName: string;
  performedByRole?: string;
  occurredAt: Date;
}

// ============================================================================
// CRB Review Types
// ============================================================================

export interface ECOCRBReviewCreateInput {
  meetingDate: Date;
  meetingAgenda?: string;
  members: CRBMember[];
  discussionNotes?: string;
  questionsConcerns?: string;
  decision: CRBDecision;
  decisionRationale?: string;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstain?: number;
  conditions?: string;
  actionItems?: CRBActionItem[];
  nextReviewDate?: Date;
  createdById: string;
}

export interface ECOCRBReviewResponse {
  id: string;
  ecoId: string;
  meetingDate: Date;
  meetingAgenda?: string;
  members: CRBMember[];
  discussionNotes?: string;
  questionsConcerns?: string;
  decision: CRBDecision;
  decisionRationale?: string;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstain?: number;
  conditions?: string;
  actionItems?: CRBActionItem[];
  nextReviewDate?: Date;
  createdById: string;
  createdAt: Date;
}

export interface CRBMember {
  userId: string;
  userName: string;
  role: string;
  department: string;
  isPresent: boolean;
  vote?: 'FOR' | 'AGAINST' | 'ABSTAIN';
}

export interface CRBActionItem {
  id: string;
  description: string;
  assignedToId: string;
  assignedToName: string;
  dueDate?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

// ============================================================================
// ECO Relation Types
// ============================================================================

export interface ECORelationCreateInput {
  relatedEcoId: string;
  relationType: ECORelationType;
  description?: string;
}

export interface ECORelationResponse {
  id: string;
  parentEcoId: string;
  relatedEcoId: string;
  relationType: ECORelationType;
  description?: string;
  createdAt: Date;
  relatedEco?: {
    ecoNumber: string;
    title: string;
    status: ECOStatus;
  };
}

// ============================================================================
// Impact Analysis Types
// ============================================================================

export interface ImpactAnalysisInput {
  ecoId: string;
  includeDocuments?: boolean;
  includeOperational?: boolean;
  includeCost?: boolean;
}

export interface ImpactAnalysisResponse {
  ecoId: string;
  totalDocumentsAffected: number;
  documentsByType: Record<string, number>;
  operationalImpact: OperationalImpact;
  costImpact: CostImpact;
  riskAssessment: RiskAssessment;
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedImplementationTime: number; // in days
  affectedDocuments: ECOAffectedDocumentResponse[];
  generatedAt: Date;
}

export interface OperationalImpact {
  activeWorkOrdersAffected: number;
  plannedWorkOrdersAffected: number;
  inventoryImpact: {
    wipValue: number;
    finishedGoodsValue: number;
    rawMaterialsValue: number;
  };
  productionCapacityImpact: number; // percentage
  trainingRequired: boolean;
  trainingHours?: number;
}

export interface CostImpact {
  implementationCost: number;
  toolingCost: number;
  equipmentCost: number;
  trainingCost: number;
  scrapReworkCost: number;
  totalCost: number;
  potentialSavings: number;
  netBenefit: number;
  paybackPeriodMonths?: number;
}

export interface RiskAssessment {
  technicalRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  scheduleRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  costRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  qualityRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigationActions: string[];
}

// ============================================================================
// ECO Filters and Search
// ============================================================================

export interface ECOFilters {
  status?: ECOStatus[];
  priority?: ECOPriority[];
  ecoType?: ECOType[];
  requestorId?: string;
  requestDateFrom?: Date;
  requestDateTo?: Date;
  assignedToId?: string;
  affectedPart?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ECOTaskFilters {
  status?: ECOTaskStatus[];
  taskType?: ECOTaskType[];
  assignedToId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  ecoId?: string;
  department?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// ECO Analytics Types
// ============================================================================

export interface ECOAnalytics {
  totalECOs: number;
  ecosByStatus: Record<ECOStatus, number>;
  ecosByType: Record<ECOType, number>;
  ecosByPriority: Record<ECOPriority, number>;
  averageCycleTime: number; // in days
  averageCostPerECO: number;
  totalCostSavings: number;
  approvalRate: number; // percentage
  onTimeCompletionRate: number; // percentage
  topBottlenecks: Array<{
    stage: string;
    averageTime: number;
    count: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    created: number;
    completed: number;
    cost: number;
    savings: number;
  }>;
}

// ============================================================================
// Effectivity Types
// ============================================================================

export interface EffectivityInput {
  effectivityType: EffectivityType;
  effectivityValue: string;
  isInterchangeable: boolean;
  plannedEffectiveDate?: Date;
}

export interface EffectivityContext {
  entityType: string;
  entityId: string;
  date?: Date;
  serialNumber?: string;
  workOrderNumber?: string;
  lotBatch?: string;
}

export interface TransitionPlan {
  ecoId: string;
  oldVersionDepletion: Date;
  newVersionStart: Date;
  transitionPeriod: number; // days
  affectedInventory: {
    wip: number;
    finished: number;
    raw: number;
  };
  exceptions: Array<{
    entityType: string;
    entityId: string;
    reason: string;
    approvedBy: string;
    validUntil: Date;
  }>;
}

// ============================================================================
// ECO Error Types
// ============================================================================

export class ECOError extends Error {
  constructor(message: string, public code: string = 'ECO_ERROR') {
    super(message);
    this.name = 'ECOError';
  }
}

export class ECOValidationError extends ECOError {
  constructor(message: string, public field?: string) {
    super(message, 'ECO_VALIDATION_ERROR');
    this.name = 'ECOValidationError';
  }
}

export class ECOStateError extends ECOError {
  constructor(message: string, public currentStatus: ECOStatus) {
    super(message, 'ECO_STATE_ERROR');
    this.name = 'ECOStateError';
  }
}

export class ECOPermissionError extends ECOError {
  constructor(message: string, public userId: string) {
    super(message, 'ECO_PERMISSION_ERROR');
    this.name = 'ECOPermissionError';
  }
}