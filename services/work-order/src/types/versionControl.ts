/**
 * Version Control Types
 * Type definitions for work instruction version control system
 * GitHub Issue #20: Comprehensive Revision Control System
 */

// ============================================================================
// Base Types from Prisma (re-exported for convenience)
// ============================================================================

export {
  WorkInstruction,
  WorkInstructionDelta,
  WorkInstructionComparison,
  WorkInstructionBranch,
  WorkInstructionAuditLog,
  WorkInstructionRollback,
  VersionControlConfig,
  ChangeType,
  ChangeReason,
  DeltaType,
  DeltaOperation,
  ImpactLevel,
  ComparisonType,
  ComparisonStatus,
  BranchType,
  BranchStatus,
  AuditAction,
  RollbackType,
  RollbackStatus,
  VersioningStrategy,
  ConflictStrategy,
  AuditLevel,
  DiffAlgorithm
} from '@prisma/client-work-order';

// ============================================================================
// Service Interface Types
// ============================================================================

export interface VersionMetadata {
  version: string;
  changeType: ChangeType;
  changeReason: ChangeReason;
  impactLevel: ImpactLevel;
  description?: string;
  createdBy: string;
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  branchName?: string;
}

export interface VersionHistoryOptions {
  limit?: number;
  offset?: number;
  branchName?: string;
  changeType?: ChangeType[];
  impactLevel?: ImpactLevel[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  includeDeltas?: boolean;
  includeContent?: boolean;
}

export interface VersionComparisonResult {
  id: string;
  fromVersion: string;
  toVersion: string;
  comparisonType: ComparisonType;
  status: ComparisonStatus;
  totalChanges: number;
  addedLines: number;
  deletedLines: number;
  modifiedLines: number;
  conflictCount: number;
  diffData: DiffData;
  summary: ComparisonSummary;
  comparisonTime?: number;
  complexityScore?: number;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface DiffData {
  sections: DiffSection[];
  metadata: {
    totalSections: number;
    changesByType: Record<ChangeType, number>;
    affectedSteps: number[];
    affectedFields: string[];
  };
}

export interface DiffSection {
  sectionType: 'content' | 'step' | 'media' | 'metadata';
  sectionId: string;
  sectionName: string;
  changeType: 'added' | 'removed' | 'modified' | 'moved';
  changes: DiffChange[];
  impactLevel: ImpactLevel;
}

export interface DiffChange {
  fieldPath: string;
  fieldName: string;
  operation: DeltaOperation;
  oldValue?: any;
  newValue?: any;
  context?: {
    lineNumber?: number;
    surrounding?: string;
    stepNumber?: number;
  };
}

export interface ComparisonSummary {
  overview: string;
  keyChanges: string[];
  impactAnalysis: {
    trainingRequired: boolean;
    approvalRequired: boolean;
    estimatedReviewTime: number; // minutes
    affectedRoles: string[];
  };
  recommendations: string[];
}

export interface BranchInfo {
  id: string;
  workInstructionId: string;
  branchName: string;
  branchType: BranchType;
  description?: string;
  parentBranch?: string;
  basedOnVersion: string;
  latestVersion: string;
  status: BranchStatus;
  isProtected: boolean;
  isDefault: boolean;
  totalCommits: number;
  lastActivityAt: Date;
  hasConflicts: boolean;
  conflictsWith: string[];
  createdBy: string;
  createdAt: Date;
  mergedAt?: Date;
  mergedBy?: string;
}

export interface BranchMergeResult {
  success: boolean;
  mergeCommitVersion?: string;
  conflicts?: ConflictInfo[];
  mergedAt: Date;
  mergedBy: string;
}

export interface ConflictInfo {
  fieldPath: string;
  conflictType: 'content' | 'structure' | 'metadata';
  description: string;
  sourceBranchValue: any;
  targetBranchValue: any;
  suggestedResolution?: any;
  resolutionStrategy: 'manual' | 'auto_source' | 'auto_target' | 'auto_merge';
}

export interface RollbackPlan {
  id: string;
  workInstructionId: string;
  fromVersion: string;
  toVersion: string;
  rollbackType: RollbackType;
  reason: string;
  affectedSteps: number[];
  affectedFields: string[];
  dataLossWarning?: string;
  impactAssessment: RollbackImpactAssessment;
  riskLevel: ImpactLevel;
  executionPlan: RollbackExecutionPlan;
  status: RollbackStatus;
  requiresApproval: boolean;
  scheduledAt?: Date;
  estimatedDuration: number; // milliseconds
  createdBy: string;
  createdAt: Date;
}

export interface RollbackImpactAssessment {
  riskLevel: ImpactLevel;
  affectedAreas: string[];
  dataLossRisk: boolean;
  reversibilityScore: number; // 0-1, 1 = fully reversible
  estimatedDowntime: number; // milliseconds
  dependencies: string[];
  prerequisiteChecks: PrerequisiteCheck[];
  warnings: string[];
}

export interface PrerequisiteCheck {
  checkType: string;
  description: string;
  required: boolean;
  status: 'pending' | 'passed' | 'failed';
  result?: any;
}

export interface RollbackExecutionPlan {
  steps: RollbackStep[];
  totalSteps: number;
  estimatedDuration: number;
  rollbackOrder: string[];
  validationPoints: ValidationPoint[];
  emergencyProcedures: EmergencyProcedure[];
}

export interface RollbackStep {
  stepId: string;
  stepNumber: number;
  stepName: string;
  description: string;
  stepType: 'backup' | 'validation' | 'rollback' | 'verification';
  estimatedDuration: number;
  dependencies: string[];
  rollbackable: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  result?: any;
  errorMessage?: string;
}

export interface ValidationPoint {
  pointId: string;
  pointName: string;
  description: string;
  validationType: 'integrity' | 'functionality' | 'performance' | 'security';
  required: boolean;
  validationCriteria: any;
  status: 'pending' | 'passed' | 'failed';
  result?: any;
}

export interface EmergencyProcedure {
  procedureId: string;
  procedureName: string;
  description: string;
  triggerConditions: string[];
  steps: string[];
  contactInfo: string[];
}

export interface AuditLogEntry {
  id: string;
  workInstructionId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description: string;
  oldValue?: any;
  newValue?: any;
  changeSet?: any;
  version?: string;
  branchName?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  impactLevel: ImpactLevel;
  affectedUsers: string[];
  complianceRequired: boolean;
  complianceStatus?: string;
  retentionUntil?: Date;
  performedBy: string;
  performedAt: Date;
}

export interface VersionControlConfiguration {
  id: string;
  versioningStrategy: VersioningStrategy;
  autoVersioning: boolean;
  majorVersionTriggers: ChangeType[];
  minorVersionTriggers: ChangeType[];
  requireApprovalFor: ChangeType[];
  approvalMatrix: ApprovalMatrix;
  parallelApprovals: boolean;
  retainVersionsFor: number; // days
  maxVersionsPerDoc?: number;
  archiveOldVersions: boolean;
  allowBranching: boolean;
  maxBranchesPerDoc: number;
  autoMergePolicyFor: string[];
  branchNamingPattern?: string;
  conflictResolutionStrategy: ConflictStrategy;
  autoMergeThreshold: number;
  auditLevel: AuditLevel;
  complianceMode: boolean;
  dataRetentionYears: number;
  enableDeltaCompression: boolean;
  diffAlgorithm: DiffAlgorithm;
  maxComparisonSize: number;
  notifyOnConflicts: boolean;
  notifyOnMajorChanges: boolean;
  notificationChannels: string[];
  isActive: boolean;
  effectiveAt: Date;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalMatrix {
  roles: ApprovalRole[];
  workflows: ApprovalWorkflow[];
  escalationPolicies: EscalationPolicy[];
}

export interface ApprovalRole {
  roleId: string;
  roleName: string;
  permissions: string[];
  canApprove: ChangeType[];
  canReject: ChangeType[];
  canEscalate: boolean;
  maxApprovalAmount?: number;
}

export interface ApprovalWorkflow {
  workflowId: string;
  workflowName: string;
  triggerConditions: string[];
  steps: ApprovalStep[];
  parallelProcessing: boolean;
  timeoutMinutes: number;
}

export interface ApprovalStep {
  stepId: string;
  stepName: string;
  requiredRoles: string[];
  minimumApprovers: number;
  timeoutMinutes: number;
  escalationOnTimeout: boolean;
}

export interface EscalationPolicy {
  policyId: string;
  policyName: string;
  triggerConditions: string[];
  escalationChain: EscalationLevel[];
  maxEscalationLevels: number;
}

export interface EscalationLevel {
  levelNumber: number;
  roles: string[];
  timeoutMinutes: number;
  notificationMethods: string[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateVersionRequest {
  workInstructionId: string;
  changes: any;
  changeType: ChangeType;
  changeReason: ChangeReason;
  description?: string;
  impactLevel?: ImpactLevel;
  requiresApproval?: boolean;
  branchName?: string;
  metadata?: Record<string, any>;
}

export interface CreateVersionResponse {
  version: string;
  deltaId: string;
  requiresApproval: boolean;
  approvalWorkflowId?: string;
  estimatedReviewTime?: number;
}

export interface GetVersionHistoryRequest {
  workInstructionId: string;
  options?: VersionHistoryOptions;
}

export interface GetVersionHistoryResponse {
  versions: VersionMetadata[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface CompareVersionsRequest {
  workInstructionId: string;
  fromVersion: string;
  toVersion: string;
  comparisonType?: ComparisonType;
  includeContext?: boolean;
  options?: {
    ignoreWhitespace?: boolean;
    ignoreFormatting?: boolean;
    focusAreas?: string[];
  };
}

export interface CompareVersionsResponse {
  comparisonId: string;
  status: ComparisonStatus;
  result?: VersionComparisonResult;
  estimatedCompletion?: Date;
}

export interface CreateBranchRequest {
  workInstructionId: string;
  branchName: string;
  branchType: BranchType;
  description?: string;
  basedOnVersion: string;
  copyContent?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateBranchResponse {
  branchId: string;
  branchName: string;
  initialVersion: string;
  createdAt: Date;
}

export interface MergeBranchRequest {
  workInstructionId: string;
  sourceBranch: string;
  targetBranch: string;
  mergeStrategy?: 'auto' | 'manual' | 'squash';
  conflictResolution?: ConflictResolution[];
  mergeMessage?: string;
}

export interface ConflictResolution {
  fieldPath: string;
  resolution: 'source' | 'target' | 'manual';
  manualValue?: any;
}

export interface MergeBranchResponse {
  success: boolean;
  mergeCommitVersion?: string;
  conflicts?: ConflictInfo[];
  requiresManualResolution?: boolean;
}

export interface CreateRollbackRequest {
  workInstructionId: string;
  fromVersion: string;
  toVersion: string;
  rollbackType: RollbackType;
  reason: string;
  affectedSteps?: number[];
  affectedFields?: string[];
  scheduledAt?: Date;
  emergencyRollback?: boolean;
  bypassApproval?: boolean;
}

export interface CreateRollbackResponse {
  rollbackId: string;
  requiresApproval: boolean;
  estimatedDuration: number;
  impactAssessment: RollbackImpactAssessment;
  approvalWorkflowId?: string;
}

export interface ExecuteRollbackRequest {
  rollbackId: string;
  confirmationCode?: string;
  bypassValidation?: boolean;
}

export interface ExecuteRollbackResponse {
  success: boolean;
  executionId: string;
  estimatedCompletion: Date;
  monitoringUrl?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface VersionControlEvent {
  eventId: string;
  eventType: VersionControlEventType;
  workInstructionId: string;
  version?: string;
  branchName?: string;
  userId: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export enum VersionControlEventType {
  VERSION_CREATED = 'VERSION_CREATED',
  VERSION_APPROVED = 'VERSION_APPROVED',
  VERSION_REJECTED = 'VERSION_REJECTED',
  BRANCH_CREATED = 'BRANCH_CREATED',
  BRANCH_MERGED = 'BRANCH_MERGED',
  BRANCH_DELETED = 'BRANCH_DELETED',
  COMPARISON_COMPLETED = 'COMPARISON_COMPLETED',
  ROLLBACK_INITIATED = 'ROLLBACK_INITIATED',
  ROLLBACK_COMPLETED = 'ROLLBACK_COMPLETED',
  ROLLBACK_FAILED = 'ROLLBACK_FAILED',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_COMPLETED = 'APPROVAL_COMPLETED'
}

// ============================================================================
// Error Types
// ============================================================================

export class VersionControlError extends Error {
  constructor(
    message: string,
    public code: string,
    public workInstructionId?: string,
    public version?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VersionControlError';
  }
}

export class VersionNotFoundError extends VersionControlError {
  constructor(workInstructionId: string, version: string) {
    super(
      `Version ${version} not found for work instruction ${workInstructionId}`,
      'VERSION_NOT_FOUND',
      workInstructionId,
      version
    );
  }
}

export class BranchNotFoundError extends VersionControlError {
  constructor(workInstructionId: string, branchName: string) {
    super(
      `Branch ${branchName} not found for work instruction ${workInstructionId}`,
      'BRANCH_NOT_FOUND',
      workInstructionId,
      undefined,
      { branchName }
    );
  }
}

export class ConflictError extends VersionControlError {
  constructor(workInstructionId: string, conflicts: ConflictInfo[]) {
    super(
      `Merge conflicts detected for work instruction ${workInstructionId}`,
      'MERGE_CONFLICTS',
      workInstructionId,
      undefined,
      { conflicts }
    );
  }
}

export class ApprovalRequiredError extends VersionControlError {
  constructor(workInstructionId: string, version: string, workflowId: string) {
    super(
      `Approval required for version ${version} of work instruction ${workInstructionId}`,
      'APPROVAL_REQUIRED',
      workInstructionId,
      version,
      { workflowId }
    );
  }
}

export class RollbackError extends VersionControlError {
  constructor(workInstructionId: string, reason: string, rollbackId?: string) {
    super(
      `Rollback failed for work instruction ${workInstructionId}: ${reason}`,
      'ROLLBACK_FAILED',
      workInstructionId,
      undefined,
      { rollbackId, reason }
    );
  }
}