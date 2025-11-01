/**
 * Multi-Site Extension Deployment Types
 * Defines interfaces for site-level extension management, deployment, and configuration
 * Implements hybrid governance model: enterprise catalog + site autonomy
 */

/**
 * Site Extension Status
 * Represents the deployment and operational status of an extension at a site
 */
export interface SiteExtensionStatus {
  extensionId: string;
  extensionVersion: string;
  siteId: string;
  enabledStatus: 'enabled' | 'disabled' | 'scheduled' | 'error';
  deploymentStatus: 'pending' | 'deploying' | 'deployed' | 'failed' | 'rolling_back';
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  deployedAt?: Date;
  lastHealthCheckAt?: Date;
  errorMessage?: string;
}

/**
 * Configuration Hierarchy Levels
 * Three-level inheritance for extension configuration
 */
export interface ConfigurationHierarchy {
  extensionDefault: Record<string, unknown>;  // Level 0: Extension's built-in defaults
  enterpriseOverride?: Record<string, unknown>;  // Level 1: Enterprise-wide configuration
  siteOverride?: Record<string, unknown>;  // Level 2: Site-specific configuration
  resolvedConfig: Record<string, unknown>;  // Final resolved configuration
  inheritFromEnterprise: boolean;
  inheritFromExtension: boolean;
}

/**
 * Site Extension Configuration
 * Site-specific configuration with inheritance support
 */
export interface SiteExtensionConfiguration {
  siteExtensionId: string;
  siteId: string;
  extensionId: string;
  configData: Record<string, unknown>;
  featureFlags?: Record<string, boolean>;
  performanceSettings?: PerformanceSettings;
  integrationSettings?: IntegrationSettings;
  customMetadata?: Record<string, unknown>;
  configHash?: string;
  appliedAt?: Date;
  hierarchy: ConfigurationHierarchy;
}

/**
 * Performance Settings for Extensions
 * Resource limits and performance tuning
 */
export interface PerformanceSettings {
  maxMemoryMb?: number;
  maxCpuPercent?: number;
  requestTimeoutMs?: number;
  maxConcurrentRequests?: number;
  rateLimitPerMinute?: number;
  cacheEnabled?: boolean;
  cacheTtlSeconds?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Integration Settings for Extensions
 * External system integration configuration per-site
 */
export interface IntegrationSettings {
  externalSystems?: Array<{
    systemName: string;
    enabled: boolean;
    credentials?: Record<string, unknown>;
    endpoints?: Record<string, string>;
    apiKey?: string;
    webhookUrl?: string;
    retryPolicy?: RetryPolicy;
  }>;
  dataMapping?: Record<string, string>;
  transformations?: Record<string, TransformationRule>;
}

/**
 * Retry Policy for Integration
 */
export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrorCodes?: number[];
}

/**
 * Data Transformation Rule
 */
export interface TransformationRule {
  sourceField: string;
  targetField: string;
  transformationType: 'map' | 'concat' | 'split' | 'custom';
  parameters?: Record<string, unknown>;
}

/**
 * Multi-Site Extension License Information
 */
export interface SiteExtensionLicense {
  id: string;
  siteExtensionId: string;
  licenseKey: string;
  licenseType: 'named' | 'concurrent' | 'consumption' | 'perpetual' | 'trial';
  licensedUsers?: number;
  concurrentSessions?: number;
  consumptionLimit?: number;
  consumptionUsed: number;
  isActive: boolean;
  isOverride: boolean;
  expiresAt?: Date;
  validationStatus?: 'valid' | 'invalid' | 'expired' | 'over_limit';
  seatAllocation?: Array<{ userId: string; allocationDate: Date }>;
  usageMetrics?: {
    totalActivations: number;
    peakConcurrentUsers: number;
    totalConsumption: number;
  };
}

/**
 * Extension Deployment Request
 * Request to deploy an extension to a site
 */
export interface ExtensionDeploymentRequest {
  siteId: string;
  extensionId: string;
  extensionVersion: string;
  deploymentType: 'initial' | 'upgrade' | 'downgrade' | 'rollback' | 'hotfix';
  rolloutStrategy?: 'immediate' | 'staged' | 'canary' | 'blue_green';
  rolloutSchedule?: RolloutSchedule;
  preDeploymentChecks?: boolean;
  postDeploymentChecks?: boolean;
  enableAutoRollback?: boolean;
  rollbackThreshold?: RollbackThreshold;
  requestedBy?: string;
  notes?: string;
}

/**
 * Rollout Schedule for Staged Deployment
 */
export interface RolloutSchedule {
  phases: DeploymentPhase[];
  totalDuration?: number;  // Minutes
}

/**
 * Single Deployment Phase
 */
export interface DeploymentPhase {
  phaseNumber: number;
  percentRollout: number;  // 0-100
  targetUsers?: number;
  duration?: number;  // Minutes
  healthCheckInterval?: number;  // Seconds
  pauseIfErrorRate?: number;  // Percentage
}

/**
 * Rollback Threshold Configuration
 */
export interface RollbackThreshold {
  errorRatePercent: number;
  responseTimeMs: number;
  consecutiveFailures: number;
  userImpactedPercent: number;
}

/**
 * Deployment History Record
 */
export interface DeploymentRecord {
  id: string;
  deploymentRequestId: string;
  siteId: string;
  extensionId: string;
  deploymentType: 'initial' | 'upgrade' | 'downgrade' | 'rollback' | 'hotfix';
  rolloutStrategy?: 'immediate' | 'staged' | 'canary' | 'blue_green';
  sourceVersion?: string;
  targetVersion: string;
  status: 'pending' | 'in_progress' | 'succeeded' | 'failed' | 'rolled_back';
  rolloutPhases?: DeploymentPhase[];
  preDeploymentChecks?: CheckResult[];
  postDeploymentChecks?: CheckResult[];
  healthMetricsBaseline?: HealthMetrics;
  healthMetricsAfter?: HealthMetrics;
  affectedUsers: number;
  successRate?: number;
  downtime?: number;  // Minutes
  requestedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorCode?: string;
  errorDetails?: string;
}

/**
 * Pre/Post Deployment Check Result
 */
export interface CheckResult {
  checkName: string;
  checkType: 'compatibility' | 'dependency' | 'performance' | 'security' | 'integration';
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  details?: Record<string, unknown>;
  executedAt: Date;
  duration: number;  // Milliseconds
}

/**
 * Health Metrics for Extensions
 */
export interface HealthMetrics {
  timestamp: Date;
  errorCount: number;
  errorRate: number;  // Percentage
  averageResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  uptime: number;  // Percentage
  memoryUsageMb: number;
  cpuUsagePercent: number;
  activeUsers: number;
  totalRequests: number;
  customMetrics?: Record<string, unknown>;
}

/**
 * Health Check Result
 */
export interface HealthCheckResult {
  id: string;
  siteExtensionId: string;
  checkType: 'startup' | 'periodic' | 'on_demand' | 'pre_rollback';
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  statusCode?: number;
  responseTime?: number;  // Milliseconds
  memoryUsage?: number;  // MB
  cpuUsage?: number;  // Percentage
  errorLog?: string;
  checkDetails?: Record<string, unknown>;
  triggeredRollback: boolean;
  rollbackReason?: string;
  checkedAt: Date;
}

/**
 * Bulk Deployment Request
 * Deploy multiple extensions across multiple sites
 */
export interface BulkDeploymentRequest {
  extensions: Array<{
    extensionId: string;
    extensionVersion: string;
    sites: string[];  // Site IDs
  }>;
  deploymentType: 'initial' | 'upgrade';
  rolloutStrategy?: 'immediate' | 'staged' | 'canary';
  preDeploymentValidation?: boolean;
  orderByDependency?: boolean;
  requestedBy?: string;
  notes?: string;
}

/**
 * Bulk Deployment Result
 */
export interface BulkDeploymentResult {
  requestId: string;
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  pendingDeployments: number;
  deploymentSequence: Array<{
    extensionId: string;
    siteId: string;
    deploymentRequestId: string;
    sequence: number;
  }>;
  errors: Array<{
    extensionId: string;
    siteId: string;
    error: string;
  }>;
  createdAt: Date;
}

/**
 * Site Extension Enablement Request
 * Enable or disable an extension for a site
 */
export interface SiteExtensionEnablementRequest {
  siteId: string;
  extensionId: string;
  enabled: boolean;
  reason?: string;
  scheduleFor?: Date;  // Optional future scheduling
  requestedBy?: string;
}

/**
 * Multi-Tenancy Context
 * Information about current site for data isolation
 */
export interface MultiTenancyContext {
  siteId: string;
  enterpriseId?: string;
  userId?: string;
  roles?: string[];
  permissions?: string[];
  resourceQuota?: ResourceQuota;
}

/**
 * Resource Quota for Sites
 */
export interface ResourceQuota {
  maxExtensions: number;
  maxUsers: number;
  storageGb: number;
  apiCallsPerMonth: number;
  customFieldsAllowed: number;
  databaseConnections: number;
}

/**
 * Multi-Site Extension Deployment Error
 */
export class SiteDeploymentError extends Error {
  constructor(
    public code: string,
    public siteId: string,
    public extensionId: string,
    public details: Record<string, unknown> = {}
  ) {
    super(`Site deployment error [${code}] for ${extensionId} at site ${siteId}`);
    this.name = 'SiteDeploymentError';
  }
}
