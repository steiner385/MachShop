/**
 * Workflow Builder - Type Definitions
 * Issue #394: Low-Code/No-Code Workflow Builder - Visual Workflow Designer
 * Phase 1: Backend Infrastructure
 */

// ============================================================================
// Core Workflow Types
// ============================================================================

/**
 * Workflow status enumeration
 */
export enum WorkflowStatus {
  DRAFT = 'draft',                // Being edited
  ACTIVE = 'active',              // Available for execution
  ARCHIVED = 'archived',          // No longer used
  DISABLED = 'disabled',          // Temporarily disabled
}

/**
 * Execution status enumeration
 */
export enum ExecutionStatus {
  PENDING = 'pending',            // Waiting to start
  RUNNING = 'running',            // Currently executing
  COMPLETED = 'completed',        // Finished successfully
  FAILED = 'failed',              // Execution error
  CANCELLED = 'cancelled',        // User cancelled
  PAUSED = 'paused',              // Temporarily paused
}

/**
 * Node type enumeration - Core categories
 */
export enum NodeType {
  // Start/End
  START = 'start',
  END = 'end',

  // Operations
  MATERIAL_CONSUME = 'material_consume',
  EQUIPMENT_OPERATION = 'equipment_operation',
  QUALITY_CHECK = 'quality_check',
  DATA_TRANSFORMATION = 'data_transformation',
  API_CALL = 'api_call',
  SUBPROCESS = 'subprocess',

  // Decision
  IF_THEN_ELSE = 'if_then_else',
  SWITCH = 'switch',
  LOOP = 'loop',
  WAIT = 'wait',
  PARALLEL = 'parallel',

  // Integration
  SALESFORCE_CONNECTOR = 'salesforce_connector',
  SAP_CONNECTOR = 'sap_connector',
  NETSUITE_CONNECTOR = 'netsuite_connector',
  CUSTOM_API = 'custom_api',
  EVENT_PUBLISHER = 'event_publisher',
  EVENT_SUBSCRIBER = 'event_subscriber',

  // Error Handling
  ERROR_HANDLER = 'error_handler',
  RETRY_LOGIC = 'retry_logic',
  FALLBACK_PATH = 'fallback_path',
  NOTIFICATION = 'notification',
}

/**
 * Variable type enumeration
 */
export enum VariableType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  DATETIME = 'datetime',
}

/**
 * Variable scope enumeration
 */
export enum VariableScope {
  GLOBAL = 'global',              // Accessible throughout workflow
  LOCAL = 'local',                // Scoped to specific nodes/regions
  PARAMETER = 'parameter',        // Input parameters
  OUTPUT = 'output',              // Return values
}

/**
 * Workflow variable definition
 */
export interface WorkflowVariable {
  id: string;
  name: string;
  type: VariableType;
  scope: VariableScope;
  defaultValue?: any;
  description?: string;
  required: boolean;
  constraints?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    enum?: any[];
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Node configuration
 */
export interface NodeConfig {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  x: number;                      // Canvas X position
  y: number;                      // Canvas Y position
  width?: number;                 // Node width
  height?: number;                // Node height
  properties: Record<string, any>;
  inputs?: string[];              // Input variable names
  outputs?: string[];             // Output variable names
  condition?: string;             // Condition expression for routing
  retryPolicy?: {
    maxRetries: number;
    backoffType: 'exponential' | 'linear' | 'custom';
    initialDelayMs: number;
    maxDelayMs: number;
  };
  timeout?: number;               // Timeout in milliseconds
  errorHandler?: string;          // ID of error handler node
  metadata?: {
    category?: string;
    tags?: string[];
    icon?: string;
  };
}

/**
 * Connection between nodes
 */
export interface Connection {
  id: string;
  source: string;                 // Source node ID
  sourceHandle?: string;          // Output handle
  target: string;                 // Target node ID
  targetHandle?: string;          // Input handle
  condition?: string;             // Condition for routing
  label?: string;
}

/**
 * Core Workflow definition
 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  version: number;
  nodes: NodeConfig[];
  connections: Connection[];
  variables: WorkflowVariable[];
  metadata?: {
    author?: string;
    tags?: string[];
    category?: string;
    icon?: string;
    documentation?: string;
  };
  validationErrors?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * Execution request
 */
export interface ExecutionRequest {
  workflowId: string;
  inputs: Record<string, any>;
  context?: {
    userId?: string;
    siteId?: string;
    correlationId?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Execution record
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: ExecutionStatus;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  nodeExecutions: NodeExecution[];
  variables: Record<string, any>;
  error?: {
    message: string;
    code: string;
    nodeId?: string;
    details?: any;
  };
  startedAt: Date;
  completedAt?: Date;
  duration?: number;              // Duration in milliseconds
  context?: {
    userId?: string;
    siteId?: string;
    correlationId?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Individual node execution record
 */
export interface NodeExecution {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: ExecutionStatus;
  input?: Record<string, any>;
  output?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: {
    message: string;
    code: string;
    stack?: string;
  };
}

/**
 * Workflow version record
 */
export interface WorkflowVersion {
  id: string;
  workflowId: string;
  versionNumber: number;
  workflow: Workflow;
  createdAt: Date;
  createdBy: string;
  changelog?: string;
  isActive: boolean;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  connectionId?: string;
  field?: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  nodeId?: string;
  suggestion?: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    database: {
      status: boolean;
      responseTime: number;
    };
    cache: {
      status: boolean;
      responseTime: number;
    };
    executionEngine: {
      status: boolean;
      activeExecutions: number;
      queuedExecutions: number;
    };
  };
  uptime: number;
  version: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes: NodeConfig[];
  connections: Connection[];
  variables: WorkflowVariable[];
  metadata?: Workflow['metadata'];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  nodes?: NodeConfig[];
  connections?: Connection[];
  variables?: WorkflowVariable[];
  metadata?: Workflow['metadata'];
  status?: WorkflowStatus;
}

export interface WorkflowListResponse {
  workflows: Workflow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExecutionHistoryResponse {
  executions: WorkflowExecution[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// Database Model Types (for Prisma)
// ============================================================================

/**
 * Database schema definitions for Prisma
 * These will be implemented in schema.prisma
 */
export interface WorkflowModel {
  id: string;
  name: string;
  description: string | null;
  status: string;                 // WorkflowStatus enum
  version: number;
  definition: string;             // JSON stringified Workflow
  validationErrors: string | null;
  metadata: string | null;        // JSON stringified metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface WorkflowExecutionModel {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: string;                 // ExecutionStatus enum
  inputs: string;                 // JSON stringified inputs
  outputs: string | null;         // JSON stringified outputs
  variables: string;              // JSON stringified variables
  error: string | null;           // JSON stringified error
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  context: string | null;         // JSON stringified context
}

export interface WorkflowVersionModel {
  id: string;
  workflowId: string;
  versionNumber: number;
  definition: string;             // JSON stringified Workflow
  changelog: string | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
}
