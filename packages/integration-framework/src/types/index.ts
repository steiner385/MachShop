/**
 * Core Type Definitions for Safe/Guardrailed Data Integration Framework
 * Provides type-safe interfaces for connectors, adapters, and integration operations
 */

// ============================================================================
// Connector and Adapter Types
// ============================================================================

/**
 * Authentication types supported by the framework
 */
export enum AuthenticationType {
  OAUTH2 = 'oauth2',
  API_KEY = 'api-key',
  SAML = 'saml',
  BASIC = 'basic',
  BEARER_TOKEN = 'bearer-token',
  CUSTOM = 'custom',
}

/**
 * Integration operation types
 */
export enum IntegrationOperationType {
  READ = 'read',
  WRITE = 'write',
  SYNC = 'sync',
  DELETE = 'delete',
  TRANSFORM = 'transform',
  WEBHOOK = 'webhook',
}

/**
 * Connector status
 */
export enum ConnectorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEGRADED = 'degraded',
  ERROR = 'error',
  UNAVAILABLE = 'unavailable',
}

/**
 * Retry policy strategies
 */
export enum RetryPolicy {
  EXPONENTIAL_BACKOFF = 'exponential-backoff',
  LINEAR_BACKOFF = 'linear-backoff',
  FIXED_DELAY = 'fixed-delay',
  NO_RETRY = 'no-retry',
}

/**
 * Fallback strategies for failed operations
 */
export enum FallbackStrategy {
  DEFAULT_VALUE = 'default-value',
  PREVIOUS_VALUE = 'previous-value',
  FAIL_FAST = 'fail-fast',
  CACHE = 'cache',
}

/**
 * Authentication credential types
 */
export interface AuthenticationCredential {
  type: AuthenticationType;
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  samlAssertion?: string;
  customPayload?: Record<string, unknown>;
  expiresAt?: Date;
  refreshToken?: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  concurrentConnections?: number;
  bytesPerSecond?: number;
  queueSize?: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  policy: RetryPolicy;
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

/**
 * Connector configuration
 */
export interface ConnectorConfig {
  id: string;
  name: string;
  description?: string;
  type: string;
  version: string;
  apiVersion: string;
  enabled: boolean;
  authentication: AuthenticationCredential;
  endpoint?: string;
  timeout?: number;
  rateLimits?: RateLimitConfig;
  retryConfig?: RetryConfig;
  fallbackStrategy?: FallbackStrategy;
  metadata?: Record<string, unknown>;
}

/**
 * Query depth limit configuration
 */
export interface QueryDepthLimit {
  maxDepth: number;
  maxFieldsPerLevel: number;
  maxNestedArrays: number;
}

/**
 * Cost control configuration
 */
export interface CostControlConfig {
  maxDataTransferMB?: number;
  maxQueryRowCount?: number;
  maxOperationsPerHour?: number;
  estimateCost?: boolean;
}

/**
 * Safe query configuration and constraints
 */
export interface SafeQueryConfig {
  allowedOperations: IntegrationOperationType[];
  queryDepthLimit: QueryDepthLimit;
  costControls: CostControlConfig;
  requiresApproval?: boolean;
  approvalThreshold?: number;
  maxQueryDurationMs?: number;
  allowedPatterns?: RegExp[];
  blockedPatterns?: RegExp[];
}

/**
 * Data mapping configuration
 */
export interface DataMappingConfig {
  sourceSchema: Record<string, unknown>;
  targetSchema: Record<string, unknown>;
  fieldMappings: Record<string, string>;
  transformations?: Record<string, (value: unknown) => unknown>;
  validationRules?: Record<string, (value: unknown) => boolean>;
}

/**
 * Integration operation request
 */
export interface IntegrationRequest {
  id: string;
  connectorId: string;
  operationType: IntegrationOperationType;
  query?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  requestedBy?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeoutMs?: number;
  requiresApproval?: boolean;
  impactAnalysis?: ImpactAnalysis;
  createdAt: Date;
}

/**
 * Integration operation response
 */
export interface IntegrationResponse {
  id: string;
  requestId: string;
  connectorId: string;
  status: 'success' | 'failure' | 'partial' | 'timeout';
  data?: unknown;
  error?: IntegrationError;
  metadata?: Record<string, unknown>;
  executionTimeMs?: number;
  rowsAffected?: number;
  warnings?: string[];
  completedAt: Date;
}

/**
 * Integration error with details
 */
export interface IntegrationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  suggestion?: string;
  causedBy?: Error;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  operationType: IntegrationOperationType;
  connectorId: string;
  userId: string;
  action: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  status: 'success' | 'failure';
  errorCode?: string;
  ipAddress?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

/**
 * Impact analysis for proposed integration changes
 */
export interface ImpactAnalysis {
  estimatedRowsAffected: number;
  estimatedDataVolumeGB: number;
  affectedSystems: string[];
  affectedUsers: number;
  estimatedCost: number;
  risksIdentified: RiskAssessment[];
  requiresRollback: boolean;
}

/**
 * Risk assessment for integration operations
 */
export interface RiskAssessment {
  type: 'data-loss' | 'data-corruption' | 'performance' | 'security' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
}

/**
 * Connector adapter manifest
 */
export interface AdapterManifest {
  id: string;
  type: 'integration-adapter';
  version: string;
  apiVersion: string;
  name: string;
  description: string;
  author: string;
  license?: string;
  homepage?: string;
  dependencies: {
    required?: Record<string, string>;
    optional?: Record<string, string>;
  };
  provides: {
    capabilities: string[];
    adapters: string[];
    authentication: AuthenticationType[];
  };
  integration: {
    rateLimits: RateLimitConfig;
    timeout: number;
    retryPolicy: RetryPolicy;
    maxConcurrentOperations?: number;
  };
  compatibility?: {
    minVersion?: string;
    maxVersion?: string;
    platforms?: string[];
  };
}

/**
 * Connector health status
 */
export interface ConnectorHealthStatus {
  connectorId: string;
  status: ConnectorStatus;
  lastCheckedAt: Date;
  uptime: number; // percentage
  successRate: number; // percentage
  averageResponseTimeMs: number;
  totalOperations: number;
  failedOperations: number;
  lastError?: IntegrationError;
  metrics?: {
    operationsPerSecond: number;
    dataTransferMBps: number;
    errorRate: number;
  };
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureAt?: Date;
  nextRetryAt?: Date;
  totalFailures: number;
}

/**
 * Recovery point for safe rollback
 */
export interface RecoveryPoint {
  id: string;
  connectorId: string;
  timestamp: Date;
  snapshot: {
    data: unknown;
    configuration: Record<string, unknown>;
    metadata: Record<string, unknown>;
  };
  createdBy: string;
  description?: string;
  isAutomatic: boolean;
}

/**
 * Integration site configuration
 */
export interface SiteIntegrationConfig {
  siteId: string;
  connectorId: string;
  enabledConnectors: string[];
  disabledConnectors: string[];
  rateLimits: RateLimitConfig;
  resourceQuotas: {
    maxConcurrentOperations: number;
    maxDataTransferMBPerDay: number;
    maxOperationsPerHour: number;
  };
  credentialsId?: string; // Reference to CyberArk
  approvalRequired: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Approval workflow for new adapters
 */
export interface AdapterApprovalRequest {
  id: string;
  adapterId: string;
  requestedBy: string;
  requestedAt: Date;
  manifest: AdapterManifest;
  compatibilityChecks: CompatibilityCheckResult[];
  securityReview?: SecurityReviewResult;
  status: 'pending' | 'approved' | 'rejected';
  approvalChain: ApprovalStep[];
  rejectionReason?: string;
}

/**
 * Approval step in workflow
 */
export interface ApprovalStep {
  role: 'analyst' | 'manager' | 'architect' | 'admin';
  approvedBy?: string;
  approvedAt?: Date;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
}

/**
 * Compatibility check result
 */
export interface CompatibilityCheckResult {
  checkType: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Security review result
 */
export interface SecurityReviewResult {
  passed: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  findings: SecurityFinding[];
}

/**
 * Security finding
 */
export interface SecurityFinding {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  recommendation: string;
}

/**
 * Connector statistics
 */
export interface ConnectorStatistics {
  connectorId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  totalDataTransferGB: number;
  errorBreakdown: Record<string, number>;
  topErrors: { errorCode: string; count: number }[];
}

/**
 * Query cost estimate
 */
export interface QueryCostEstimate {
  estimatedRowCount: number;
  estimatedDataVolumeGB: number;
  estimatedExecutionTimeMs: number;
  estimatedCost: number;
  costBreakdown?: Record<string, number>;
  wouldExceedQuota: boolean;
}
