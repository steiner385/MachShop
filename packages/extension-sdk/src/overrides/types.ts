/**
 * Component Override Safety System - Type Definitions
 * Issue #428: Component Override Safety System with Fallback & Approval
 */

import React from 'react';

/**
 * Override status enum
 */
export enum OverrideStatus {
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  ACTIVE = 'active',
  PAUSED = 'paused',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
  DEPRECATED = 'deprecated',
}

/**
 * Rollout status enum
 */
export enum RolloutStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ROLLED_BACK = 'rolled_back',
  FAILED = 'failed',
}

/**
 * Rollout phase for gradual deployment
 */
export enum RolloutPhase {
  SINGLE_SITE = 'single_site',
  REGIONAL = 'regional',
  GLOBAL = 'global',
}

/**
 * Component override declaration from manifest
 */
export interface ComponentOverrideDeclaration {
  /** Unique override identifier */
  id?: string;

  /** Component ID being overridden */
  overridesComponentId: string;

  /** Override component implementation */
  component: React.ComponentType<any>;

  /** Contract/interface being implemented */
  implementsContract?: string;

  /** Business reason for override */
  reason: string;

  /** URL to test report validating override */
  testingReport?: string;

  /** If provided, restrict override to these sites only */
  scopedToSites?: string[];

  /** Fallback component if override fails */
  fallbackComponent?: React.ComponentType<any>;

  /** Version constraints for compatibility */
  versionConstraints?: Record<string, string>;

  /** Compatible with specific versions */
  compatibleWith?: Record<string, string>;

  /** Requires approval before activation */
  requiresApproval?: boolean;

  /** Whether this is a breaking change */
  breaking?: boolean;

  /** Extension ID that owns this override */
  extensionId: string;

  /** Version of override */
  version: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Component override with computed/stored fields
 */
export interface ComponentOverride extends ComponentOverrideDeclaration {
  /** Generated unique ID */
  id: string;

  /** Current status */
  status: OverrideStatus;

  /** When override was registered */
  registeredAt: Date;

  /** When override became active */
  activatedAt?: Date;

  /** Approval details if applicable */
  approval?: {
    approvedBy: string;
    approvedAt: Date;
    approvalComment?: string;
  };

  /** Rollout information */
  rollout?: RolloutInfo;

  /** Performance metrics */
  metrics?: OverrideMetrics;

  /** Errors if any */
  errors?: OverrideError[];
}

/**
 * Rollout information
 */
export interface RolloutInfo {
  /** Current rollout status */
  status: RolloutStatus;

  /** Current rollout phase */
  phase: RolloutPhase;

  /** Sites deployed to in current phase */
  deployedSites: string[];

  /** When rollout started */
  startedAt: Date;

  /** When rollout completed or failed */
  completedAt?: Date;

  /** Schedule for next phase (if any) */
  nextPhaseScheduledAt?: Date;

  /** Rollback details if applicable */
  rollback?: {
    rolledBackAt: Date;
    reason: string;
    initiatedBy: string;
  };
}

/**
 * Override metrics for monitoring
 */
export interface OverrideMetrics {
  /** Load time of override component (ms) */
  loadTimeMs: number;

  /** Load time of original component (ms) */
  originalLoadTimeMs: number;

  /** Error count */
  errorCount: number;

  /** Error rate (0-1) */
  errorRate: number;

  /** Total renders */
  renderCount: number;

  /** Failed renders */
  failedRenderCount: number;

  /** Average render time (ms) */
  avgRenderTimeMs: number;

  /** Accessibility compliance score (0-100) */
  a11yScore: number;

  /** Test coverage percentage */
  testCoverage: number;

  /** Last updated */
  lastUpdated: Date;
}

/**
 * Override error information
 */
export interface OverrideError {
  /** Error timestamp */
  timestamp: Date;

  /** Error message */
  message: string;

  /** Error code/category */
  code: string;

  /** Error details */
  details?: Record<string, any>;

  /** Stack trace if available */
  stack?: string;

  /** Site where error occurred */
  siteId?: string;
}

/**
 * Validation report for override
 */
export interface ValidationReport {
  /** Overall valid */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings: ValidationWarning[];

  /** Validation details */
  details: {
    contractValid: boolean;
    versionConstraintsValid: boolean;
    testReportValid: boolean;
    fallbackValid: boolean;
    conflictsFree: boolean;
  };
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error field */
  field: string;

  /** Error message */
  message: string;

  /** Error code */
  code: string;

  /** Severity: error, critical */
  severity: 'error' | 'critical';
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning field */
  field: string;

  /** Warning message */
  message: string;

  /** Warning code */
  code: string;
}

/**
 * Contract definition for components
 */
export interface ComponentContract {
  /** Contract identifier */
  id: string;

  /** Required props */
  requiredProps: Record<string, string>;

  /** Optional props */
  optionalProps?: Record<string, string>;

  /** Required methods */
  requiredMethods?: string[];

  /** Events that must be emitted */
  emittedEvents?: string[];

  /** Accessibility requirements */
  a11yRequirements?: string[];

  /** Theme token requirements */
  themeTokens?: string[];

  /** Permission requirements */
  permissionsRequired?: string[];

  /** Performance requirements */
  performanceRequirements?: {
    maxLoadTimeMs?: number;
    maxRenderTimeMs?: number;
  };
}

/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
  /** Has conflicts */
  hasConflicts: boolean;

  /** List of conflicting overrides */
  conflicts: OverrideConflict[];
}

/**
 * Override conflict information
 */
export interface OverrideConflict {
  /** First conflicting override ID */
  overrideId1: string;

  /** Second conflicting override ID */
  overrideId2: string;

  /** Component ID being overridden */
  componentId: string;

  /** Type of conflict */
  conflictType: 'duplicate' | 'incompatible_versions' | 'site_overlap' | 'incompatible_contracts';

  /** Conflict description */
  description: string;

  /** Suggested resolution */
  suggestedResolution?: string;
}

/**
 * Test report from CI/CD
 */
export interface TestReport {
  /** Report URL */
  url: string;

  /** Report ID */
  id: string;

  /** Test results */
  results: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    coverage: number;
  };

  /** Accessibility test results */
  a11yResults?: {
    violations: number;
    warnings: number;
    score: number;
  };

  /** Performance benchmarks */
  performance?: {
    loadTimeMs: number;
    renderTimeMs: number;
  };

  /** Report generated at */
  generatedAt: Date;

  /** Report valid until */
  validUntil?: Date;
}

/**
 * Approval request for override
 */
export interface ApprovalRequest {
  /** Override ID requiring approval */
  overrideId: string;

  /** Component ID */
  componentId: string;

  /** Requester extension ID */
  extensionId: string;

  /** Business justification */
  justification: string;

  /** Test report URL */
  testReportUrl?: string;

  /** Risk level: low, medium, high, critical */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  /** Request date */
  requestedAt: Date;

  /** Request status */
  status: 'pending' | 'approved' | 'rejected';

  /** Approval details if applicable */
  approval?: {
    approvedBy: string;
    approvedAt: Date;
    comment?: string;
  };

  /** Rejection details if applicable */
  rejection?: {
    rejectedBy: string;
    rejectedAt: Date;
    reason: string;
  };
}

/**
 * Override query options
 */
export interface OverrideQueryOptions {
  /** Filter by component ID */
  componentId?: string;

  /** Filter by extension ID */
  extensionId?: string;

  /** Filter by site ID */
  siteId?: string;

  /** Filter by status */
  status?: OverrideStatus;

  /** Include inactive overrides */
  includeInactive?: boolean;
}

/**
 * Override event
 */
export interface OverrideEvent {
  /** Event type */
  type: 'registered' | 'activated' | 'deactivated' | 'approved' | 'rejected' | 'failed' | 'rolled_back' | 'metrics_updated';

  /** Override ID */
  overrideId: string;

  /** Component ID */
  componentId: string;

  /** Extension ID */
  extensionId: string;

  /** Event details */
  details?: Record<string, any>;

  /** Event timestamp */
  timestamp: Date;
}

/**
 * Override registry interface
 */
export interface IOverrideRegistry {
  /**
   * Register a component override
   */
  registerOverride(declaration: ComponentOverrideDeclaration): Promise<ComponentOverride>;

  /**
   * Unregister an override
   */
  unregisterOverride(overrideId: string): Promise<void>;

  /**
   * Get override by ID
   */
  getOverride(overrideId: string): ComponentOverride | undefined;

  /**
   * Get all overrides for a component
   */
  getOverridesForComponent(componentId: string): ComponentOverride[];

  /**
   * Get active override for component at site
   */
  getActiveOverride(componentId: string, siteId?: string): ComponentOverride | undefined;

  /**
   * Activate an override
   */
  activateOverride(overrideId: string): Promise<void>;

  /**
   * Deactivate an override
   */
  deactivateOverride(overrideId: string): Promise<void>;

  /**
   * Get rollout status
   */
  getRolloutStatus(overrideId: string): RolloutInfo | undefined;

  /**
   * Query overrides
   */
  queryOverrides(options: OverrideQueryOptions): ComponentOverride[];

  /**
   * Listen to override events
   */
  onOverrideEvent(listener: (event: OverrideEvent) => void): () => void;
}

/**
 * Override validator interface
 */
export interface IOverrideValidator {
  /**
   * Validate override declaration
   */
  validateOverride(declaration: ComponentOverrideDeclaration): ValidationReport;

  /**
   * Validate contract compatibility
   */
  validateContractCompatibility(
    override: ComponentOverrideDeclaration,
    contract: ComponentContract
  ): ValidationReport;

  /**
   * Validate version constraints
   */
  validateVersionConstraints(override: ComponentOverrideDeclaration): ValidationReport;

  /**
   * Validate test report
   */
  validateTestReport(testReportUrl: string): Promise<ValidationReport>;

  /**
   * Detect conflicts with other overrides
   */
  detectConflicts(override: ComponentOverrideDeclaration): ConflictDetectionResult;
}

/**
 * Override errors
 */
export class OverrideError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'OverrideError';
  }
}

export class OverrideNotFoundError extends OverrideError {
  constructor(overrideId: string) {
    super(`Override not found: ${overrideId}`, 'OVERRIDE_NOT_FOUND', { overrideId });
    this.name = 'OverrideNotFoundError';
  }
}

export class ComponentNotFoundError extends OverrideError {
  constructor(componentId: string) {
    super(`Component not found: ${componentId}`, 'COMPONENT_NOT_FOUND', { componentId });
    this.name = 'ComponentNotFoundError';
  }
}

export class OverrideValidationError extends OverrideError {
  constructor(
    public validationErrors: ValidationError[],
    public validationWarnings: ValidationWarning[]
  ) {
    super(
      `Override validation failed with ${validationErrors.length} errors`,
      'VALIDATION_FAILED',
      { errors: validationErrors, warnings: validationWarnings }
    );
    this.name = 'OverrideValidationError';
  }
}

export class OverrideConflictError extends OverrideError {
  constructor(
    public conflicts: OverrideConflict[]
  ) {
    super(
      `Override conflicts detected: ${conflicts.length} conflict(s)`,
      'CONFLICT_DETECTED',
      { conflicts }
    );
    this.name = 'OverrideConflictError';
  }
}

export class ApprovalRequiredError extends OverrideError {
  constructor(overrideId: string, reason: string) {
    super(
      `Approval required for override: ${reason}`,
      'APPROVAL_REQUIRED',
      { overrideId, reason }
    );
    this.name = 'ApprovalRequiredError';
  }
}

export class OverrideLoadError extends OverrideError {
  constructor(overrideId: string, reason: string) {
    super(
      `Failed to load override: ${reason}`,
      'LOAD_FAILED',
      { overrideId, reason }
    );
    this.name = 'OverrideLoadError';
  }
}
