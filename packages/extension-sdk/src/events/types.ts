/**
 * Extension Event & Hook System Types
 *
 * Comprehensive type definitions for event publishing, hook registration,
 * conditional execution, and cross-extension communication.
 */

/**
 * Hook types supported by the system
 */
export enum HookType {
  /** Fired during extension lifecycle events */
  LIFECYCLE = 'LIFECYCLE',
  /** Fired during permission checks */
  PERMISSION = 'PERMISSION',
  /** Fired during data validation */
  VALIDATION = 'VALIDATION',
  /** Fired to transform data */
  TRANSFORMATION = 'TRANSFORMATION',
  /** Fired to manage caching */
  CACHE = 'CACHE',
  /** Custom hook types */
  CUSTOM = 'CUSTOM',
}

/**
 * Event priority for execution ordering
 */
export enum EventPriority {
  /** Highest priority - executed first */
  CRITICAL = 'CRITICAL',
  /** High priority */
  HIGH = 'HIGH',
  /** Normal priority (default) */
  NORMAL = 'NORMAL',
  /** Low priority */
  LOW = 'LOW',
  /** Lowest priority - executed last */
  DEFERRED = 'DEFERRED',
}

/**
 * Event stage for filtering and ordering
 */
export enum EventStage {
  /** Pre-event (before action) */
  PRE = 'PRE',
  /** Post-event (after action) */
  POST = 'POST',
  /** During event processing */
  DURING = 'DURING',
  /** Error handling stage */
  ERROR = 'ERROR',
}

/**
 * Hook execution result
 */
export interface HookExecutionResult {
  /** Whether hook executed successfully */
  success: boolean;
  /** Hook ID that executed */
  hookId: string;
  /** Extension ID that owns the hook */
  extensionId: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Return value from hook handler */
  result?: unknown;
  /** Error if hook failed */
  error?: Error;
  /** Whether hook was skipped (condition not met) */
  skipped: boolean;
}

/**
 * CEL expression condition for conditional hook execution
 */
export interface CelCondition {
  /** CEL expression string */
  expression: string;
  /** Optional timeout in milliseconds */
  timeout?: number;
  /** Optional cached expression result */
  cached?: boolean;
}

/**
 * Hook registration with metadata
 */
export interface Hook {
  /** Unique hook identifier */
  id: string;
  /** Hook type */
  type: HookType;
  /** Extension ID that registered the hook */
  extensionId: string;
  /** Event name this hook listens to */
  event: string;
  /** Hook handler function */
  handler: (context: HookContext) => Promise<unknown>;
  /** Event stage (PRE, POST, DURING, ERROR) */
  stage?: EventStage;
  /** Execution priority */
  priority?: EventPriority;
  /** CEL expression condition for conditional execution */
  condition?: CelCondition;
  /** Hook dependencies (other hook IDs this depends on) */
  dependencies?: string[];
  /** Hook blockers (hooks that block this one) */
  blockers?: string[];
  /** Whether to continue on error */
  continueOnError?: boolean;
  /** Maximum execution time in milliseconds */
  timeout?: number;
  /** Whether hook is active */
  active: boolean;
  /** Registration timestamp */
  registeredAt: Date;
  /** Execution count */
  executionCount: number;
  /** Last execution time */
  lastExecutedAt?: Date;
  /** Average execution duration */
  averageDuration?: number;
}

/**
 * Hook context passed to handlers
 */
export interface HookContext {
  /** Event name */
  event: string;
  /** Event data */
  data: Record<string, unknown>;
  /** Hook metadata */
  hook: Hook;
  /** Extension context */
  extensionId: string;
  /** User ID if applicable */
  userId?: string;
  /** Request ID for tracing */
  requestId: string;
  /** Event metadata */
  metadata?: Record<string, unknown>;
  /** Abort signal to cancel execution */
  signal?: AbortSignal;
}

/**
 * Event definition and metadata
 */
export interface Event {
  /** Event name */
  name: string;
  /** Event data */
  data: Record<string, unknown>;
  /** Event source (extension ID) */
  source: string;
  /** Event priority */
  priority?: EventPriority;
  /** Event stage */
  stage?: EventStage;
  /** Whether event is async or sync */
  async?: boolean;
  /** Request ID for tracing */
  requestId?: string;
  /** Timestamp */
  timestamp: Date;
  /** Event metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Hook registration request
 */
export interface HookRegistrationRequest {
  /** Extension ID */
  extensionId: string;
  /** Extension version */
  version: string;
  /** Hooks to register */
  hooks: Array<Omit<Hook, 'id' | 'registeredAt' | 'executionCount'>>;
}

/**
 * Hook registration response
 */
export interface HookRegistrationResponse {
  /** Whether registration was successful */
  success: boolean;
  /** Registered hook IDs */
  hookIds: string[];
  /** Error message if registration failed */
  error?: string;
  /** Warnings during registration */
  warnings?: string[];
}

/**
 * Cross-extension request/reply pattern
 */
export interface CrossExtensionRequest {
  /** Request ID for correlation */
  requestId: string;
  /** Requesting extension ID */
  requesterId: string;
  /** Target extension ID */
  targetId: string;
  /** Request event name */
  event: string;
  /** Request payload */
  payload: Record<string, unknown>;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Response expected */
  expectResponse?: boolean;
}

/**
 * Cross-extension response
 */
export interface CrossExtensionResponse {
  /** Response ID (correlates with request) */
  requestId: string;
  /** Responding extension ID */
  responderId: string;
  /** Whether request succeeded */
  success: boolean;
  /** Response payload */
  payload?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
}

/**
 * Hook execution metrics
 */
export interface HookExecutionMetrics {
  /** Hook ID */
  hookId: string;
  /** Total executions */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** Skipped executions */
  skippedExecutions: number;
  /** Average execution time (milliseconds) */
  averageDuration: number;
  /** Min execution time */
  minDuration: number;
  /** Max execution time */
  maxDuration: number;
  /** Error rate (0-100) */
  errorRate: number;
  /** Last 10 execution results */
  recentExecutions: HookExecutionResult[];
}

/**
 * Audit log entry for hook execution
 */
export interface HookAuditLogEntry {
  /** Timestamp */
  timestamp: Date;
  /** Hook ID */
  hookId: string;
  /** Extension ID */
  extensionId: string;
  /** Event name */
  event: string;
  /** Execution status */
  status: 'success' | 'failure' | 'skipped';
  /** Execution duration (milliseconds) */
  duration: number;
  /** Error message if failed */
  error?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** User ID if applicable */
  userId?: string;
}

/**
 * Event filter for querying events
 */
export interface EventFilter {
  /** Event name pattern */
  event?: string;
  /** Source extension ID */
  extensionId?: string;
  /** Start date */
  startDate?: Date;
  /** End date */
  endDate?: Date;
  /** Event priority */
  priority?: EventPriority;
  /** Event stage */
  stage?: EventStage;
  /** Maximum results */
  limit?: number;
}

/**
 * Hook filter for querying hooks
 */
export interface HookFilter {
  /** Hook type */
  type?: HookType;
  /** Extension ID */
  extensionId?: string;
  /** Event name */
  event?: string;
  /** Hook stage */
  stage?: EventStage;
  /** Only active hooks */
  activeOnly?: boolean;
}

/**
 * Event bus interface
 */
export interface IEventBus {
  /** Publish event */
  publish(event: Event): Promise<void>;
  /** Subscribe to event */
  subscribe(event: string, handler: (event: Event) => Promise<void>): string;
  /** Unsubscribe from event */
  unsubscribe(subscriberId: string): void;
  /** Register hooks */
  registerHooks(request: HookRegistrationRequest): Promise<HookRegistrationResponse>;
  /** Unregister hooks */
  unregisterHooks(extensionId: string): Promise<void>;
  /** Get hook */
  getHook(hookId: string): Hook | undefined;
  /** Get all hooks */
  getAllHooks(): Hook[];
  /** Get hooks by extension */
  getExtensionHooks(extensionId: string): Hook[];
  /** Get hooks by event */
  getEventHooks(event: string): Hook[];
  /** Execute hooks for event */
  executeHooks(event: Event): Promise<HookExecutionResult[]>;
  /** Send cross-extension request */
  sendRequest(request: CrossExtensionRequest): Promise<CrossExtensionResponse>;
  /** Get hook metrics */
  getHookMetrics(hookId: string): HookExecutionMetrics | undefined;
  /** Get audit logs */
  getAuditLogs(filters?: {
    hookId?: string;
    extensionId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<HookAuditLogEntry[]>;
}
