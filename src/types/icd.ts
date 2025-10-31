/**
 * ✅ GITHUB ISSUE #224: Interface Control Document (ICD) Type Definitions
 *
 * TypeScript interfaces and types for the ICD system
 * Supports SAE AIR6181A, ASME Y14.24, NASA Interface Management Guidelines, ISO 10007
 */

import {
  ICDStatus,
  InterfaceType,
  InterfaceDirection,
  InterfaceCriticality,
  VerificationMethod,
  ComplianceStatus,
  InterfaceEffectivityType
} from '@prisma/client';

// ============================================================================
// ICD Input/Output Types
// ============================================================================

export interface ICDCreateInput {
  icdNumber: string;
  icdName: string;
  title: string;
  description?: string;
  version: string;
  revisionLevel?: string;
  interfaceType: InterfaceType;
  interfaceDirection?: InterfaceDirection;
  criticality?: InterfaceCriticality;
  applicableStandards?: string[];
  complianceNotes?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  effectivityType?: InterfaceEffectivityType;
  effectivityValue?: string;
  ownerId?: string;
  ownerName?: string;
  ownerDepartment?: string;
  reviewCycle?: number;
  documentationUrl?: string;
  drawingReferences?: string[];
  specificationRefs?: string[];
  createdById?: string;
}

export interface ICDUpdateInput {
  icdName?: string;
  title?: string;
  description?: string;
  version?: string;
  revisionLevel?: string;
  status?: ICDStatus;
  interfaceType?: InterfaceType;
  interfaceDirection?: InterfaceDirection;
  criticality?: InterfaceCriticality;
  applicableStandards?: string[];
  complianceNotes?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  effectivityType?: InterfaceEffectivityType;
  effectivityValue?: string;
  ownerId?: string;
  ownerName?: string;
  ownerDepartment?: string;
  approvedById?: string;
  approvedDate?: Date;
  reviewCycle?: number;
  nextReviewDate?: Date;
  documentationUrl?: string;
  drawingReferences?: string[];
  specificationRefs?: string[];
  lastModifiedById?: string;
}

export interface ICDResponse {
  id: string;
  persistentUuid: string;
  icdNumber: string;
  icdName: string;
  title: string;
  description?: string;
  version: string;
  revisionLevel?: string;
  status: ICDStatus;
  interfaceType: InterfaceType;
  interfaceDirection: InterfaceDirection;
  criticality: InterfaceCriticality;
  applicableStandards: string[];
  complianceNotes?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  effectivityType?: InterfaceEffectivityType;
  effectivityValue?: string;
  ownerId?: string;
  ownerName?: string;
  ownerDepartment?: string;
  approvedById?: string;
  approvedDate?: Date;
  reviewCycle?: number;
  nextReviewDate?: Date;
  documentationUrl?: string;
  drawingReferences: string[];
  specificationRefs: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById?: string;
  lastModifiedById?: string;
  requirements?: InterfaceRequirementResponse[];
  implementingParts?: ICDPartImplementationResponse[];
  consumingAssemblies?: ICDPartConsumptionResponse[];
  versions?: ICDVersionResponse[];
  history?: ICDHistoryResponse[];
  attachments?: ICDAttachmentResponse[];
  complianceChecks?: ICDComplianceCheckResponse[];
  changeRequests?: ICDChangeRequestResponse[];
}

// ============================================================================
// Interface Requirement Types
// ============================================================================

export interface InterfaceRequirementCreateInput {
  icdId: string;
  requirementId: string;
  category: string;
  subcategory?: string;
  title: string;
  description: string;
  specification?: string;
  tolerance?: string;
  units?: string;
  nominalValue?: string;
  minimumValue?: string;
  maximumValue?: string;
  testConditions?: string;
  verificationMethod?: VerificationMethod;
  verificationProcedure?: string;
  acceptanceCriteria?: string;
  parentRequirementId?: string;
  flowdownFrom?: string[];
  rationale?: string;
  priority?: string;
  safetyRelated?: boolean;
  missionCritical?: boolean;
}

export interface InterfaceRequirementUpdateInput {
  category?: string;
  subcategory?: string;
  title?: string;
  description?: string;
  specification?: string;
  tolerance?: string;
  units?: string;
  nominalValue?: string;
  minimumValue?: string;
  maximumValue?: string;
  testConditions?: string;
  verificationMethod?: VerificationMethod;
  verificationProcedure?: string;
  acceptanceCriteria?: string;
  parentRequirementId?: string;
  flowdownFrom?: string[];
  rationale?: string;
  priority?: string;
  safetyRelated?: boolean;
  missionCritical?: boolean;
}

export interface InterfaceRequirementResponse {
  id: string;
  icdId: string;
  requirementId: string;
  category: string;
  subcategory?: string;
  title: string;
  description: string;
  specification?: string;
  tolerance?: string;
  units?: string;
  nominalValue?: string;
  minimumValue?: string;
  maximumValue?: string;
  testConditions?: string;
  verificationMethod: VerificationMethod;
  verificationProcedure?: string;
  acceptanceCriteria?: string;
  parentRequirementId?: string;
  flowdownFrom: string[];
  rationale?: string;
  priority: string;
  safetyRelated: boolean;
  missionCritical: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  childRequirements?: InterfaceRequirementResponse[];
  complianceChecks?: ICDComplianceCheckResponse[];
}

// ============================================================================
// ICD-Part Relationship Types
// ============================================================================

export interface ICDPartImplementationCreateInput {
  icdId: string;
  partId: string;
  implementationType: string;
  implementationNotes?: string;
  configurationDetails?: any;
  complianceStatus?: ComplianceStatus;
  complianceNotes?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  effectivityCondition?: string;
}

export interface ICDPartImplementationResponse {
  id: string;
  icdId: string;
  partId: string;
  implementationType: string;
  implementationNotes?: string;
  configurationDetails?: any;
  complianceStatus: ComplianceStatus;
  lastComplianceCheck?: Date;
  complianceNotes?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  effectivityCondition?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICDPartConsumptionCreateInput {
  icdId: string;
  partId: string;
  consumptionType: string;
  quantityRequired?: number;
  consumptionNotes?: string;
  alternativeOptions?: string[];
  isRequired?: boolean;
  isCritical?: boolean;
  failureMode?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  effectivityCondition?: string;
}

export interface ICDPartConsumptionResponse {
  id: string;
  icdId: string;
  partId: string;
  consumptionType: string;
  quantityRequired?: number;
  consumptionNotes?: string;
  alternativeOptions: string[];
  isRequired: boolean;
  isCritical: boolean;
  failureMode?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  effectivityCondition?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ICD Compliance Types
// ============================================================================

export interface ICDComplianceCheckCreateInput {
  icdId: string;
  requirementId?: string;
  partId?: string;
  checkType: string;
  checkMethod?: VerificationMethod;
  checkProcedure?: string;
  checkResult: string;
  actualValue?: string;
  expectedValue?: string;
  variance?: string;
  testResults?: any;
  evidenceUrl?: string;
  checkNotes?: string;
  nonComplianceReason?: string;
  correctiveAction?: string;
  checkedById?: string;
  checkedByName?: string;
  reviewedById?: string;
  nextCheckDate?: Date;
  reCheckRequired?: boolean;
  escalationRequired?: boolean;
}

export interface ICDComplianceCheckResponse {
  id: string;
  icdId: string;
  requirementId?: string;
  partId?: string;
  checkType: string;
  checkMethod: VerificationMethod;
  checkProcedure?: string;
  complianceStatus: ComplianceStatus;
  checkResult: string;
  actualValue?: string;
  expectedValue?: string;
  variance?: string;
  testResults?: any;
  evidenceUrl?: string;
  checkNotes?: string;
  nonComplianceReason?: string;
  correctiveAction?: string;
  checkDate: Date;
  checkedById?: string;
  checkedByName?: string;
  reviewedById?: string;
  reviewedDate?: Date;
  nextCheckDate?: Date;
  reCheckRequired: boolean;
  escalationRequired: boolean;
  isActive: boolean;
}

// ============================================================================
// ICD Version and History Types
// ============================================================================

export interface ICDVersionResponse {
  id: string;
  icdId: string;
  versionNumber: string;
  versionType: string;
  changeDescription: string;
  changeReason?: string;
  changeCategory: string[];
  createdDate: Date;
  approvedDate?: Date;
  releasedDate?: Date;
  supersededDate?: Date;
  createdById?: string;
  approvedById?: string;
  versionData?: any;
  isActive: boolean;
}

export interface ICDHistoryResponse {
  id: string;
  icdId: string;
  actionType: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  changeDescription?: string;
  changeReason?: string;
  impactAssessment?: string;
  relatedEcoId?: string;
  changedAt: Date;
  changedById?: string;
  changedByName?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ICDAttachmentResponse {
  id: string;
  icdId: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  fileExtension?: string;
  storageUrl?: string;
  storageKey?: string;
  checksum?: string;
  documentType: string;
  category?: string;
  securityLevel?: string;
  description?: string;
  version?: string;
  isActive: boolean;
  uploadedAt: Date;
  uploadedById?: string;
}

export interface ICDChangeRequestResponse {
  id: string;
  icdId: string;
  requestNumber: string;
  title: string;
  description: string;
  requestType: string;
  priority: string;
  proposedChange: string;
  changeReason: string;
  alternativesConsidered?: string;
  impactAnalysis?: any;
  affectedParts: string[];
  affectedAssemblies: string[];
  estimatedEffort?: string;
  riskAssessment?: string;
  requestorId?: string;
  requestorName: string;
  requestorDept?: string;
  requestorEmail?: string;
  requestDate: Date;
  status: string;
  reviewerId?: string;
  reviewerNotes?: string;
  reviewDate?: Date;
  approvalRequired: boolean;
  approvedById?: string;
  approvedDate?: Date;
  implementationPlan?: string;
  implementationDate?: Date;
  implementedById?: string;
  relatedEcoId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface ICDFilters {
  status?: ICDStatus[];
  interfaceType?: InterfaceType[];
  criticality?: InterfaceCriticality[];
  ownerId?: string;
  ownerDepartment?: string;
  effectiveDateFrom?: Date;
  effectiveDateTo?: Date;
  standards?: string[];
  partNumber?: string;
  search?: string;
  isActive?: boolean;
}

export interface ICDComplianceFilters {
  icdId?: string;
  partId?: string;
  complianceStatus?: ComplianceStatus[];
  checkType?: string[];
  checkedBy?: string;
  checkDateFrom?: Date;
  checkDateTo?: Date;
  escalationRequired?: boolean;
  reCheckRequired?: boolean;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface ICDAnalytics {
  totalICDs: number;
  icdsByStatus: Record<ICDStatus, number>;
  icdsByType: Record<InterfaceType, number>;
  icdsByCriticality: Record<InterfaceCriticality, number>;
  complianceOverview: {
    compliant: number;
    nonCompliant: number;
    underEvaluation: number;
    conditionallyCompliant: number;
  };
  requirementMetrics: {
    totalRequirements: number;
    safetyRelated: number;
    missionCritical: number;
  };
  upcomingReviews: number;
  expiringSoon: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class ICDError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'ICDError';
  }
}

export class ICDValidationError extends ICDError {
  constructor(message: string, public field?: string, public value?: any) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ICDValidationError';
  }
}

export class ICDStateError extends ICDError {
  constructor(message: string, public currentState?: string, public requestedAction?: string) {
    super(message, 'STATE_ERROR');
    this.name = 'ICDStateError';
  }
}

export class ICDPermissionError extends ICDError {
  constructor(message: string, public userId?: string, public action?: string) {
    super(message, 'PERMISSION_ERROR');
    this.name = 'ICDPermissionError';
  }
}

export class ICDNotFoundError extends ICDError {
  constructor(identifier: string, type: string = 'id') {
    super(`ICD not found with ${type}: ${identifier}`, 'NOT_FOUND');
    this.name = 'ICDNotFoundError';
  }
}

export class ICDComplianceError extends ICDError {
  constructor(message: string, public icdId?: string, public requirementId?: string) {
    super(message, 'COMPLIANCE_ERROR');
    this.name = 'ICDComplianceError';
  }
}