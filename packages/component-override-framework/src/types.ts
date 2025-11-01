/**
 * Component Override Safety System Types
 *
 * Type definitions for component overrides, contracts, and safety validation.
 *
 * @module component-override-framework/types
 */

import * as React from 'react';

/**
 * Component contract defining the interface that must be implemented
 */
export interface ComponentContract {
  /**
   * Contract ID
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Component description
   */
  description?: string;

  /**
   * Version of the contract
   */
  version: string;

  /**
   * Required props that must be accepted
   */
  requiredProps: PropDefinition[];

  /**
   * Optional props that can be accepted
   */
  optionalProps?: PropDefinition[];

  /**
   * Return type / JSX element type
   */
  returnType: string;

  /**
   * Hooks this component uses
   */
  hooks?: string[];

  /**
   * Dependencies on other components
   */
  dependencies?: string[];

  /**
   * Breaking changes from previous version
   */
  breakingChanges?: string[];

  /**
   * Compatibility range (semver)
   */
  compatibilityRange?: string;

  /**
   * Component category
   */
  category?: string;

  /**
   * Approval required for overrides
   */
  requiresApproval?: boolean;

  /**
   * Custom validation function
   */
  customValidator?: (component: any) => ValidationResult;

  /**
   * Metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Property definition
 */
export interface PropDefinition {
  /**
   * Property name
   */
  name: string;

  /**
   * TypeScript type as string
   */
  type: string;

  /**
   * Description
   */
  description?: string;

  /**
   * Default value
   */
  defaultValue?: any;

  /**
   * Allowed values (for enums)
   */
  allowedValues?: any[];

  /**
   * Whether this prop must be provided
   */
  required: boolean;

  /**
   * Whether prop can be spread from parent
   */
  canSpread?: boolean;
}

/**
 * Component override declaration
 */
export interface ComponentOverrideDeclaration {
  /**
   * Unique identifier for the override
   */
  id: string;

  /**
   * Contract ID being overridden
   */
  contractId: string;

  /**
   * The override component
   */
  component: React.ComponentType<any>;

  /**
   * Extension providing the override
   */
  extensionId: string;

  /**
   * Site ID for multi-site isolation
   */
  siteId: string;

  /**
   * Fallback component if override fails
   */
  fallback?: React.ComponentType<any>;

  /**
   * Custom validation for this override
   */
  customValidator?: (component: any, props: any) => ValidationResult;

  /**
   * Metadata about the override
   */
  metadata?: Record<string, any>;

  /**
   * Priority (higher = applied first)
   */
  priority?: number;

  /**
   * Feature flags that enable this override
   */
  featureFlags?: string[];

  /**
   * Whether override requires approval
   */
  requiresApproval?: boolean;

  /**
   * Approval status if required
   */
  approvalStatus?: 'pending' | 'approved' | 'rejected';

  /**
   * Created timestamp
   */
  createdAt: Date;

  /**
   * Last modified timestamp
   */
  modifiedAt: Date;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  valid: boolean;

  /**
   * Validation errors
   */
  errors: ValidationError[];

  /**
   * Validation warnings
   */
  warnings: ValidationWarning[];

  /**
   * Details about validation
   */
  details?: Record<string, any>;
}

/**
 * Validation error
 */
export interface ValidationError {
  /**
   * Error code
   */
  code: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Affected prop (if applicable)
   */
  prop?: string;

  /**
   * Suggested fix
   */
  fix?: string;

  /**
   * Error severity (critical, error, warning)
   */
  severity: 'critical' | 'error' | 'warning';
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /**
   * Warning code
   */
  code: string;

  /**
   * Warning message
   */
  message: string;

  /**
   * Affected prop (if applicable)
   */
  prop?: string;

  /**
   * Suggested improvement
   */
  suggestion?: string;
}

/**
 * Override registry entry
 */
export interface OverrideRegistryEntry {
  /**
   * Override declaration
   */
  override: ComponentOverrideDeclaration;

  /**
   * Contract for this override
   */
  contract: ComponentContract;

  /**
   * Validation results
   */
  validation: ValidationResult;

  /**
   * Whether override is active
   */
  isActive: boolean;

  /**
   * Why override is inactive (if applicable)
   */
  inactiveReason?: string;

  /**
   * Applied fallback (if override failed)
   */
  appliedFallback?: boolean;

  /**
   * Usage count in current session
   */
  usageCount: number;

  /**
   * Last used timestamp
   */
  lastUsedAt?: Date;

  /**
   * Performance metrics
   */
  metrics?: {
    renderTime?: number;
    memoryUsage?: number;
    errorRate?: number;
  };
}

/**
 * Compatibility check result
 */
export interface CompatibilityCheckResult {
  /**
   * Overall compatibility
   */
  compatible: boolean;

  /**
   * Compatibility issues
   */
  issues: CompatibilityIssue[];

  /**
   * Suggestions for compatibility
   */
  suggestions: string[];

  /**
   * Estimated risk level (low, medium, high, critical)
   */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  /**
   * Details
   */
  details?: Record<string, any>;
}

/**
 * Compatibility issue
 */
export interface CompatibilityIssue {
  /**
   * Type of incompatibility
   */
  type: 'prop_mismatch' | 'type_mismatch' | 'version_incompatible' | 'dependency_missing' | 'hook_incompatible' | 'other';

  /**
   * Description
   */
  description: string;

  /**
   * Affected component/prop
   */
  affected: string;

  /**
   * Severity
   */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /**
   * Suggested fix
   */
  suggestedFix?: string;
}

/**
 * Override safety policy
 */
export interface OverrideSafetyPolicy {
  /**
   * Policy ID
   */
  id: string;

  /**
   * Site ID
   */
  siteId: string;

  /**
   * Whether overrides are allowed
   */
  allowOverrides: boolean;

  /**
   * Whether approval is required for overrides
   */
  requireApprovalForOverrides: boolean;

  /**
   * Roles that can approve overrides
   */
  approverRoles: string[];

  /**
   * Contracts that cannot be overridden
   */
  protectedContracts: string[];

  /**
   * Extensions allowed to override (whitelist)
   */
  allowedExtensions?: string[];

  /**
   * Extensions forbidden from overriding (blacklist)
   */
  forbiddenExtensions?: string[];

  /**
   * Maximum number of stacked overrides per component
   */
  maxOverrideDepth: number;

  /**
   * Fallback required
   */
  requireFallback: boolean;

  /**
   * Automatic rollback on error threshold (percentage)
   */
  autoRollbackThreshold?: number;

  /**
   * Policy active
   */
  isActive: boolean;

  /**
   * Created date
   */
  createdAt: Date;

  /**
   * Modified date
   */
  modifiedAt: Date;
}

/**
 * Override state for store
 */
export interface ComponentOverrideState {
  /**
   * All component contracts
   */
  contracts: ComponentContract[];

  /**
   * All registered overrides
   */
  overrides: ComponentOverrideDeclaration[];

  /**
   * Registry entries
   */
  registry: OverrideRegistryEntry[];

  /**
   * Override policies per site
   */
  policies: Record<string, OverrideSafetyPolicy>;

  /**
   * Active overrides (applied)
   */
  activeOverrides: Map<string, ComponentOverrideDeclaration>;

  /**
   * Failed overrides with fallbacks active
   */
  failedOverrides: Map<string, { error: Error; fallbackActive: boolean }>;

  /**
   * Last sync time
   */
  lastSyncTime: Date | null;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error message if any
   */
  error: string | null;
}
