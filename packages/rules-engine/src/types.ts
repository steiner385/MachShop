/**
 * Type Definitions for Automation Rules Engine
 * Comprehensive types for rule definition, execution, and management
 */

// ============================================================================
// Core Rule Types
// ============================================================================

/**
 * Trigger types for rules
 */
export enum TriggerType {
  EVENT = 'event',           // Event-based triggers
  SCHEDULE = 'schedule',     // Time-based triggers
  THRESHOLD = 'threshold',   // Data threshold triggers
  WEBHOOK = 'webhook',       // External webhook triggers
  MANUAL = 'manual',         // Manual trigger
}

/**
 * Condition operators
 */
export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_EQUAL = 'greater_equal',
  LESS_EQUAL = 'less_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  MATCHES_REGEX = 'matches_regex',
  IN_ARRAY = 'in_array',
  BETWEEN = 'between',
  EXISTS = 'exists',
}

/**
 * Logical operators for combining conditions
 */
export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not',
}

/**
 * Action types
 */
export enum ActionType {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP_ALERT = 'in_app_alert',
  SLACK = 'slack',
  TEAMS = 'teams',
  CREATE_RECORD = 'create_record',
  UPDATE_RECORD = 'update_record',
  DELETE_RECORD = 'delete_record',
  WORKFLOW_START = 'workflow_start',
  API_CALL = 'api_call',
  WEBHOOK = 'webhook',
  DATA_TRANSFORM = 'data_transform',
  QUALITY_HOLD = 'quality_hold',
  ESCALATE = 'escalate',
  SCHEDULE_CHANGE = 'schedule_change',
  LOG_EVENT = 'log_event',
  WAIT = 'wait',
  BRANCH = 'branch',
  LOOP = 'loop',
}

/**
 * Rule status
 */
export enum RuleStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  ERROR = 'error',
}

/**
 * Execution result status
 */
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  PARTIAL_SUCCESS = 'partial_success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  SKIPPED = 'skipped',
}

// ============================================================================
// Trigger Definitions
// ============================================================================

/**
 * Event trigger configuration
 */
export interface EventTrigger {
  type: TriggerType.EVENT;
  event: string; // e.g., "workOrder.afterCreate", "material.beforeConsume"
  hookPoint?: string; // Explicit hook point
  filters?: Record<string, unknown>; // Additional event filters
}

/**
 * Schedule trigger configuration
 */
export interface ScheduleTrigger {
  type: TriggerType.SCHEDULE;
  scheduleType: 'once' | 'recurring' | 'cron' | 'delay';
  scheduleExpression: string; // Cron expression or ISO duration
  timezone?: string;
  maxExecutions?: number;
}

/**
 * Threshold trigger configuration
 */
export interface ThresholdTrigger {
  type: TriggerType.THRESHOLD;
  field: string;
  condition: ConditionOperator;
  value: unknown;
  evaluationFrequency: 'real-time' | 'periodic';
  evaluationIntervalMs?: number;
}

/**
 * Webhook trigger configuration
 */
export interface WebhookTrigger {
  type: TriggerType.WEBHOOK;
  webhookId: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  validateSignature?: boolean;
}

/**
 * Manual trigger configuration
 */
export interface ManualTrigger {
  type: TriggerType.MANUAL;
  requiresApproval?: boolean;
  requiresContext?: string[];
}

/**
 * Union type for all triggers
 */
export type Trigger = EventTrigger | ScheduleTrigger | ThresholdTrigger | WebhookTrigger | ManualTrigger;

// ============================================================================
// Condition Definitions
// ============================================================================

/**
 * Simple condition
 */
export interface SimpleCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  caseSensitive?: boolean;
}

/**
 * Compound condition (AND/OR/NOT)
 */
export interface CompoundCondition {
  operator: LogicalOperator;
  conditions: (SimpleCondition | CompoundCondition)[];
}

/**
 * Context-based condition (user, role, time)
 */
export interface ContextCondition {
  type: 'user' | 'role' | 'time' | 'site';
  operator: ConditionOperator;
  value: unknown;
}

/**
 * Union type for all conditions
 */
export type Condition = SimpleCondition | CompoundCondition | ContextCondition;

// ============================================================================
// Action Definitions
// ============================================================================

/**
 * Notification action
 */
export interface NotificationAction {
  type: ActionType.EMAIL | ActionType.SMS | ActionType.IN_APP_ALERT | ActionType.SLACK | ActionType.TEAMS;
  recipients: string[] | string; // Email addresses, user IDs, channel names
  subject?: string;
  template?: string;
  variables?: Record<string, unknown>;
  attachments?: string[];
}

/**
 * Record operation action
 */
export interface RecordAction {
  type: ActionType.CREATE_RECORD | ActionType.UPDATE_RECORD | ActionType.DELETE_RECORD;
  entity: string; // Entity type (workOrder, material, etc.)
  data?: Record<string, unknown>; // For create/update
  conditions?: Condition; // For update/delete
  returnFields?: string[];
}

/**
 * Workflow action
 */
export interface WorkflowAction {
  type: ActionType.WORKFLOW_START;
  workflowId: string;
  payload?: Record<string, unknown>;
  waitForCompletion?: boolean;
  timeoutMs?: number;
}

/**
 * API action
 */
export interface APIAction {
  type: ActionType.API_CALL | ActionType.WEBHOOK;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  payload?: Record<string, unknown>;
  authentication?: { type: string; credentials: unknown };
  timeoutMs?: number;
  retryPolicy?: { maxAttempts: number; backoffMs: number };
}

/**
 * Data transformation action
 */
export interface TransformAction {
  type: ActionType.DATA_TRANSFORM;
  transformScript: string;
  inputData?: Record<string, unknown>;
  outputVariable?: string;
}

/**
 * Quality hold action
 */
export interface QualityHoldAction {
  type: ActionType.QUALITY_HOLD;
  reason: string;
  holdType: 'soft' | 'hard';
  releaseCondition?: Condition;
  notifyRoles?: string[];
}

/**
 * Escalation action
 */
export interface EscalationAction {
  type: ActionType.ESCALATE;
  escalateTo: string | string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
  escalationChain?: string[];
}

/**
 * Wait action
 */
export interface WaitAction {
  type: ActionType.WAIT;
  duration: string; // ISO duration
  until?: Condition;
}

/**
 * Branch action (conditional)
 */
export interface BranchAction {
  type: ActionType.BRANCH;
  branches: {
    condition: Condition;
    actions: Action[];
  }[];
  defaultActions?: Action[];
}

/**
 * Loop action
 */
export interface LoopAction {
  type: ActionType.LOOP;
  iterations: number | { field: string; countExpression: string };
  actions: Action[];
  breakCondition?: Condition;
}

/**
 * Union type for all actions
 */
export type Action =
  | NotificationAction
  | RecordAction
  | WorkflowAction
  | APIAction
  | TransformAction
  | QualityHoldAction
  | EscalationAction
  | WaitAction
  | BranchAction
  | LoopAction;

// ============================================================================
// Rule Definition
// ============================================================================

/**
 * Complete rule definition
 */
export interface Rule {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: RuleStatus;

  // Rule logic
  trigger: Trigger;
  conditions?: Condition;
  actions: Action[];

  // Hook integration
  hookPoint?: string;
  priority?: number; // 0-100
  blocking?: boolean;
  async?: boolean;

  // Multi-site support
  siteId?: string;
  siteOverrides?: Record<string, unknown>;

  // Metadata
  category?: string;
  tags?: string[];
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;

  // Configuration
  enabled: boolean;
  timeout?: number;
  maxExecutions?: number;
  executionCount?: number;
  lastExecutedAt?: Date;

  // Testing
  isDraft?: boolean;
  testData?: Record<string, unknown>;
}

// ============================================================================
// Execution Context
// ============================================================================

/**
 * Execution context passed to rules
 */
export interface RuleExecutionContext {
  ruleId: string;
  ruleName: string;
  executionId: string;
  trigger: Trigger;
  triggerData: Record<string, unknown>;
  user?: { id: string; name: string; roles: string[] };
  site?: { id: string; name: string };
  timestamp: Date;
  metadata?: Record<string, unknown>;
  variables?: Record<string, unknown>;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  executionId: string;
  ruleId: string;
  ruleName: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  executionTimeMs?: number;

  // Results
  conditionsMet?: boolean;
  conditionEvaluationMs?: number;
  actionResults: ActionResult[];

  // Errors
  error?: { code: string; message: string; details?: unknown };
  warnings?: string[];

  // Metrics
  dataProcessed?: number;
  recordsAffected?: number;
  externalCallsMade?: number;
}

/**
 * Individual action result
 */
export interface ActionResult {
  actionIndex: number;
  actionType: ActionType;
  status: ExecutionStatus;
  output?: unknown;
  error?: { code: string; message: string };
  executionTimeMs: number;
}

// ============================================================================
// Rule Analytics
// ============================================================================

/**
 * Rule execution statistics
 */
export interface RuleStatistics {
  ruleId: string;
  ruleName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  partialSuccesses: number;
  totalExecutionTimeMs: number;
  averageExecutionTimeMs: number;
  p95ExecutionTimeMs: number;
  lastExecutedAt?: Date;
  errorBreakdown?: Record<string, number>;
  actionStats?: Record<ActionType, ActionStatistics>;
}

/**
 * Action statistics
 */
export interface ActionStatistics {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  averageExecutionTimeMs: number;
  lastError?: string;
}

// ============================================================================
// Hook System
// ============================================================================

/**
 * Hook registration for rules
 */
export interface RuleHookRegistration {
  ruleId: string;
  hookPoint: string;
  priority: number; // 0-100
  async: boolean;
  blocking: boolean;
  enabled: boolean;
}

/**
 * Hook execution event
 */
export interface HookEvent {
  hookPoint: string;
  eventData: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
  siteId?: string;
}

// ============================================================================
// Rule Templates
// ============================================================================

/**
 * Pre-built rule template
 */
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: Trigger;
  conditions?: Condition;
  actions: Action[];
  variables?: { name: string; type: string; required: boolean; defaultValue?: unknown }[];
  documentation?: string;
  exampleScenarios?: string[];
  tags?: string[];
}

// ============================================================================
// Rule Repository
// ============================================================================

/**
 * Rule filter options
 */
export interface RuleFilter {
  status?: RuleStatus;
  category?: string;
  tags?: string[];
  siteId?: string;
  enabled?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Paginated results
 */
export interface PaginatedResults<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
