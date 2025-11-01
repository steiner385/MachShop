/**
 * Core types for configuration validation service
 */

import {
  ValidationError,
  ComplianceDelegationRole,
} from '@machshop/extension-sdk';

/**
 * Configuration of an extension at a specific site
 */
export interface SiteExtensionConfiguration {
  siteId: string;
  extensionId: string;
  version: string;
  enabledAt: Date;
  configurationHash: string; // SHA-256 of configuration
  configuration: Record<string, any>;
  validated: boolean;
  validationErrors?: ValidationError[];
  detectedConflicts?: string[]; // IDs of conflicting extensions
}

/**
 * Compliance signoff for a configuration aspect
 */
export interface ComplianceSignoff {
  siteId: string;
  extensionId: string;
  aspect: string; // e.g., "electronic-signature-validation"
  signedBy: string; // User ID
  role: ComplianceDelegationRole;
  timestamp: Date;
  configurationHash: string; // What configuration was signed off
  notes?: string;
}

/**
 * Detected conflict between extensions
 */
export interface DetectedConflict {
  type: 'explicit' | 'policy';
  extensionId1: string;
  extensionId2: string;
  scope?: 'global' | 'capability' | 'resource';
  capability?: string;
  resource?: string;
  policy1?: string;
  policy2?: string;
  reason: string;
  severity: 'error' | 'warning';
}

/**
 * Dependency resolution result
 */
export interface DependencyResolution {
  satisfied: boolean;
  missingDependencies: {
    type: 'extension' | 'capability';
    id: string;
    version?: string;
    message: string;
  }[];
  warnings: string[];
}

/**
 * Complete validation report
 */
export interface ValidationReport {
  siteId: string;
  extensionId: string;
  valid: boolean;
  timestamp: Date;

  // Validation results by category
  schemaErrors: ValidationError[];
  dependencyErrors: ValidationError[];
  conflictErrors: DetectedConflict[];
  complianceWarnings: {
    aspect: string;
    message: string;
    severity: 'error' | 'warning';
  }[];

  // Summary of issues
  detectedConflicts: DetectedConflict[];
  dependencyResolution: DependencyResolution;
  missingSignoffs: {
    extensionId: string;
    aspects: string[];
  }[];

  // Remediation advice
  recommendations: string[];
}

/**
 * Request to validate configuration before activation
 */
export interface PreActivationValidationRequest {
  siteId: string;
  extensionId: string;
  version: string;
  configuration: Record<string, any>;
  ignoreConflicts?: string[]; // Extensions to ignore conflicts with
}

/**
 * Request to activate extension at site
 */
export interface ActivateExtensionRequest {
  siteId: string;
  extensionId: string;
  version: string;
  configuration: Record<string, any>;
  complianceSignoffs: ComplianceSignoffInput[];
  activatedBy: string; // User ID
  reason?: string;
}

/**
 * Compliance signoff input
 */
export interface ComplianceSignoffInput {
  aspect: string;
  signedBy: string; // User ID
  role: ComplianceDelegationRole;
  notes?: string;
}

/**
 * Request to deactivate extension
 */
export interface DeactivateExtensionRequest {
  siteId: string;
  extensionId: string;
  deactivatedBy: string; // User ID
  reason?: string;
}

/**
 * Result of deactivation request
 */
export interface DeactivationResult {
  ok: boolean;
  deactivated?: boolean;
  dependentExtensions?: string[]; // Extensions that depend on this one
  message?: string;
}

/**
 * Compliance signoff record
 */
export interface SignoffRecord {
  extensionId: string;
  aspect: string;
  signedBy: string;
  role: ComplianceDelegationRole;
  signedAt: Date;
  configurationHash: string;
  notes?: string;
}

/**
 * Audit log entry
 */
export interface ConfigurationAuditEntry {
  id: string;
  siteId: string;
  extensionId: string;
  action: 'activated' | 'deactivated' | 'reconfigured' | 'signoff';
  changedBy: string; // User ID
  changedAt: Date;
  oldConfigHash?: string;
  newConfigHash?: string;
  metadata?: Record<string, any>;
  reason?: string;
}

/**
 * Query filter for finding configurations
 */
export interface ConfigurationFilter {
  siteId?: string;
  extensionId?: string;
  includeInvalid?: boolean;
  includeWithConflicts?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Query filter for compliance signoffs
 */
export interface SignoffFilter {
  siteId?: string;
  extensionId?: string;
  aspect?: string;
  signedBy?: string;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Configuration change notification
 */
export interface ConfigurationChangeEvent {
  type: 'activated' | 'deactivated' | 'reconfigured' | 'validation_failed';
  siteId: string;
  extensionId: string;
  timestamp: Date;
  changedBy: string;
  details?: Record<string, any>;
}

/**
 * Site-wide configuration status
 */
export interface SiteConfigurationStatus {
  siteId: string;
  totalExtensions: number;
  validConfigurations: number;
  invalidConfigurations: number;
  conflictingConfigurations: number;
  unsignedCompliance: {
    extensionId: string;
    aspects: string[];
  }[];
  lastValidatedAt: Date;
  requiresAttention: boolean;
}

/**
 * Configuration with signoff status
 */
export interface ConfigurationWithSignoffStatus extends SiteExtensionConfiguration {
  complianceSignoffs: SignoffRecord[];
  pendingSignoffs: {
    aspect: string;
    requiredRole: ComplianceDelegationRole;
  }[];
  isFullySigned: boolean;
}
