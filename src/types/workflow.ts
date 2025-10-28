/**
 * ✅ GITHUB ISSUE #21: Advanced Multi-Stage Approval Workflow Engine
 * Type definitions for workflow system supporting sequential stages,
 * parallel approvals, conditional routing, and role-based assignment
 */

import {
  WorkflowType,
  WorkflowStatus,
  Priority,
  ImpactLevel,
  ApprovalType,
  AssignmentStrategy,
  StageStatus,
  StageOutcome,
  AssignmentType,
  ApprovalAction,
  WorkflowEventType,
  TaskStatus,
  ConditionOperator,
  RuleActionType
} from '@prisma/client';

// ============================================================================
// Core Workflow Types
// ============================================================================

export interface WorkflowDefinitionInput {
  name: string;
  description?: string;
  workflowType: WorkflowType;
  version?: string;
  structure: WorkflowStructure;
  isActive?: boolean;
  isTemplate?: boolean;
}

export interface WorkflowDefinitionUpdate {
  name?: string;
  description?: string;
  isActive?: boolean;
  structure?: WorkflowStructure;
}

export interface WorkflowStructure {
  stages: WorkflowStageConfig[];
  connections: WorkflowConnection[];
  metadata: WorkflowMetadata;
}

export interface WorkflowStageConfig {
  stageNumber: number;
  stageName: string;
  description?: string;
  approvalType: ApprovalType;
  minimumApprovals?: number;
  approvalThreshold?: number;
  requiredRoles: string[];
  optionalRoles: string[];
  assignmentStrategy: AssignmentStrategy;
  deadlineHours?: number;
  escalationRules?: EscalationRule[];
  allowDelegation: boolean;
  allowSkip: boolean;
  skipConditions?: SkipCondition[];
  requiresSignature: boolean;
  signatureType?: string;
}

export interface WorkflowConnection {
  fromStage: number;
  toStage: number;
  condition?: string; // Optional condition for branching
}

export interface WorkflowMetadata {
  version: string;
  createdAt: Date;
  createdBy: string;
  tags: string[];
}

// ============================================================================
// Workflow Instance Management
// ============================================================================

export interface WorkflowInstanceInput {
  workflowId: string;
  entityType: string;
  entityId: string;
  priority?: Priority;
  impactLevel?: ImpactLevel;
  contextData?: Record<string, any>;
  deadline?: Date;
}

export interface WorkflowInstanceResponse {
  id: string;
  workflowId: string;
  entityType: string;
  entityId: string;
  status: WorkflowStatus;
  currentStageNumber?: number;
  priority: Priority;
  impactLevel?: ImpactLevel;
  startedAt: Date;
  completedAt?: Date;
  deadline?: Date;
  createdById: string;
  stageInstances: WorkflowStageInstanceResponse[];
  history: WorkflowHistoryResponse[];
  progressPercentage: number;
}

export interface WorkflowStageInstanceResponse {
  id: string;
  stageNumber: number;
  stageName: string;
  status: StageStatus;
  outcome?: StageOutcome;
  startedAt?: Date;
  completedAt?: Date;
  deadline?: Date;
  notes?: string;
  assignments: WorkflowAssignmentResponse[];
  approvalProgress: ApprovalProgress;
}

export interface WorkflowAssignmentResponse {
  id: string;
  assignedToId: string;
  assignedToName?: string;
  assignedToRole?: string;
  assignmentType: AssignmentType;
  action?: ApprovalAction;
  actionTakenAt?: Date;
  comments?: string;
  signatureId?: string;
  signatureType?: string;
  assignedAt: Date;
  dueDate?: Date;
  escalationLevel: number;
  escalatedAt?: Date;
  escalatedToId?: string;
  isDelegated: boolean;
  delegatedFromId?: string;
  delegationReason?: string;
  delegationExpiry?: Date;
}

export interface ApprovalProgress {
  total: number;
  completed: number;
  approved: number;
  rejected: number;
  pending: number;
  percentage: number;
}

// ============================================================================
// Assignment and Actions
// ============================================================================

export interface AssignmentInput {
  stageInstanceId: string;
  assignedToId: string;
  assignedToRole?: string;
  assignmentType: AssignmentType;
  dueDate?: Date;
}

export interface ApprovalActionInput {
  assignmentId: string;
  action: ApprovalAction;
  comments?: string;
  signatureId?: string;
  signatureType?: string;
}

export interface DelegationInput {
  assignmentId: string;
  delegateeId: string;
  reason: string;
  expiry?: Date;
}

// ============================================================================
// Rules Engine
// ============================================================================

export interface WorkflowRuleInput {
  workflowId: string;
  ruleName: string;
  description?: string;
  conditionField: string;
  conditionOperator: ConditionOperator;
  conditionValue: any;
  actionType: RuleActionType;
  actionConfig: Record<string, any>;
  priority?: number;
  isActive?: boolean;
}

export interface RuleContext {
  workflowInstanceId: string;
  entityData: Record<string, any>;
  userContext: {
    userId: string;
    roles: string[];
  };
  environmentContext: Record<string, any>;
}

export interface RuleAction {
  actionType: RuleActionType;
  config: Record<string, any>;
  priority: number;
}

export interface SkipCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

// ============================================================================
// Escalation and Notifications
// ============================================================================

export interface EscalationRule {
  level: number;
  triggerAfterHours: number;
  escalateToRole?: string;
  escalateToUserId?: string;
  notificationTemplate: string;
  actions: string[];
}

export interface WorkflowHistoryResponse {
  id: string;
  eventType: WorkflowEventType;
  eventDescription: string;
  stageNumber?: number;
  fromStatus?: string;
  toStatus?: string;
  performedById: string;
  performedByName: string;
  performedByRole?: string;
  details?: Record<string, any>;
  occurredAt: Date;
}

// ============================================================================
// Task Queue Management
// ============================================================================

export interface WorkflowTaskResponse {
  id: string;
  assignmentId: string;
  assignedToId: string;
  workflowInstanceId: string;
  stageNumber: number;
  entityType: string;
  entityId: string;
  taskTitle: string;
  taskDescription?: string;
  priority: Priority;
  status: TaskStatus;
  createdAt: Date;
  dueDate?: Date;
  lastReminderSent?: Date;
  reminderCount: number;
  workflowInstance?: WorkflowInstanceSummary;
  assignment?: WorkflowAssignmentResponse;
}

export interface WorkflowInstanceSummary {
  id: string;
  entityType: string;
  entityId: string;
  status: WorkflowStatus;
  priority: Priority;
  currentStageNumber?: number;
  deadline?: Date;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: Priority[];
  entityType?: string[];
  dueDateBefore?: Date;
  dueDateAfter?: Date;
  overdue?: boolean;
  assignedToId?: string;
  workflowType?: WorkflowType[];
  page?: number;
  limit?: number;
  sortBy?: 'dueDate' | 'priority' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TaskBulkAction {
  assignmentIds: string[];
  action: ApprovalAction;
  comments?: string;
}

// ============================================================================
// Workflow Analytics and Metrics
// ============================================================================

export interface WorkflowStatusSummary {
  instanceId: string;
  status: WorkflowStatus;
  currentStage?: number;
  totalStages: number;
  completedStages: number;
  progressPercentage: number;
  estimatedCompletion?: Date;
  isOverdue: boolean;
  bottlenecks: WorkflowBottleneck[];
}

export interface WorkflowBottleneck {
  stageNumber: number;
  stageName: string;
  assignedToId: string;
  assignedToName?: string;
  daysPending: number;
  escalationLevel: number;
}

export interface WorkflowAnalyticsResponse {
  totalWorkflows: number;
  activeWorkflows: number;
  completedWorkflows: number;
  averageCompletionDays: number;
  overDueWorkflows: number;
  bottleneckStages: Array<{
    stageName: string;
    averageDelayHours: number;
    count: number;
  }>;
  approverPerformance: Array<{
    userId: string;
    userName: string;
    averageResponseHours: number;
    onTimePercentage: number;
    totalAssignments: number;
  }>;
}

// ============================================================================
// Template Management
// ============================================================================

export interface WorkflowTemplateInput {
  name: string;
  description?: string;
  workflowType: WorkflowType;
  category?: string;
  templateDefinition: WorkflowStructure;
  isActive?: boolean;
}

export interface WorkflowTemplateResponse {
  id: string;
  name: string;
  description?: string;
  workflowType: WorkflowType;
  category: string;
  templateDefinition: WorkflowStructure;
  usageCount: number;
  lastUsedAt?: Date;
  isActive: boolean;
  isBuiltIn: boolean;
  createdAt: Date;
  createdById: string;
}

// ============================================================================
// Delegation Management
// ============================================================================

export interface DelegationInput {
  delegatorId: string;
  delegateeId: string;
  workflowType?: WorkflowType;
  specificWorkflowId?: string;
  startDate: Date;
  endDate?: Date;
  reason: string;
}

export interface DelegationResponse {
  id: string;
  delegatorId: string;
  delegateeId: string;
  delegatorName?: string;
  delegateeName?: string;
  workflowType?: WorkflowType;
  specificWorkflowId?: string;
  startDate: Date;
  endDate?: Date;
  reason: string;
  isActive: boolean;
  createdAt: Date;
}

// ============================================================================
// Error Types
// ============================================================================

export class WorkflowEngineError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'WorkflowEngineError';
  }
}

export class WorkflowValidationError extends WorkflowEngineError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class WorkflowStateError extends WorkflowEngineError {
  constructor(message: string, details?: any) {
    super(message, 'STATE_ERROR', details);
  }
}

export class WorkflowPermissionError extends WorkflowEngineError {
  constructor(message: string, details?: any) {
    super(message, 'PERMISSION_ERROR', details);
  }
}