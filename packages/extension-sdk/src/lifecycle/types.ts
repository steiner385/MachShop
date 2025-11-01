/**
 * Extension Lifecycle Management Types
 *
 * Defines types for extension versioning, state management, and lifecycle operations.
 */

/**
 * Extension lifecycle states
 */
export enum ExtensionState {
  /** Extension is available for installation */
  AVAILABLE = 'AVAILABLE',
  /** Extension is being installed */
  INSTALLING = 'INSTALLING',
  /** Extension is installed and active */
  ACTIVE = 'ACTIVE',
  /** Extension is temporarily disabled */
  DISABLED = 'DISABLED',
  /** Extension is being updated */
  UPDATING = 'UPDATING',
  /** Extension is being uninstalled */
  UNINSTALLING = 'UNINSTALLING',
  /** Extension has been uninstalled */
  UNINSTALLED = 'UNINSTALLED',
  /** Extension encountered an error */
  ERROR = 'ERROR',
  /** Extension is deprecated and scheduled for removal */
  DEPRECATED = 'DEPRECATED',
}

/**
 * Semantic version representation
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  metadata?: string;
}

/**
 * Breaking change information
 */
export interface BreakingChange {
  version: string;
  description: string;
  affectedApis: string[];
  migrationGuide: string;
  deprecatedSince?: string;
  removedIn: string;
}

/**
 * Deprecation information
 */
export interface DeprecationInfo {
  deprecatedSince: string;
  removedIn: string;
  reason: string;
  alternative?: string;
  migrationGuide: string;
  notifyUsers: boolean;
}

/**
 * Extension version information
 */
export interface ExtensionVersion {
  version: string;
  semver: SemanticVersion;
  releaseDate: Date;
  changelog: string;
  compatibleWith: {
    minMachShopVersion: string;
    maxMachShopVersion?: string;
  };
  dependencies?: Record<string, string>;
  breakingChanges?: BreakingChange[];
  deprecations?: Record<string, DeprecationInfo>;
  security?: {
    vulnerabilities?: string[];
    securityPatches?: string[];
  };
  experimental?: boolean;
  beta?: boolean;
}

/**
 * Extension lifecycle event
 */
export interface ExtensionLifecycleEvent {
  extensionId: string;
  version: string;
  eventType: 'installed' | 'updated' | 'disabled' | 'enabled' | 'uninstalled' | 'error';
  timestamp: Date;
  details?: Record<string, unknown>;
  userId?: string;
  success: boolean;
  error?: string;
}

/**
 * Extension with lifecycle metadata
 */
export interface ExtensionWithLifecycle {
  id: string;
  name: string;
  description: string;
  currentVersion: string;
  previousVersion?: string;
  state: ExtensionState;
  installedAt: Date;
  lastUpdatedAt?: Date;
  disabledAt?: Date;
  versions: ExtensionVersion[];
  dependencies: ExtensionDependency[];
  deprecated?: DeprecationInfo;
  compatibilityStatus: CompatibilityStatus;
  healthCheck?: HealthCheckResult;
}

/**
 * Extension dependency
 */
export interface ExtensionDependency {
  extensionId: string;
  minVersion: string;
  maxVersion?: string;
  optional: boolean;
}

/**
 * Compatibility status
 */
export interface CompatibilityStatus {
  compatible: boolean;
  machShopVersion: string;
  incompatibilityReason?: string;
  upgradePath?: string[];
  breakingChanges?: BreakingChange[];
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  lastCheckedAt: Date;
  issues: HealthCheckIssue[];
  metrics: HealthCheckMetrics;
}

/**
 * Health check issue
 */
export interface HealthCheckIssue {
  severity: 'info' | 'warning' | 'error' | 'critical';
  code: string;
  message: string;
  suggestion?: string;
}

/**
 * Health check metrics
 */
export interface HealthCheckMetrics {
  uptime: number;
  errorRate: number;
  averageResponseTime: number;
  lastError?: {
    message: string;
    timestamp: Date;
  };
}

/**
 * Migration information for version upgrade
 */
export interface MigrationInfo {
  fromVersion: string;
  toVersion: string;
  steps: MigrationStep[];
  estimatedDuration: number; // in minutes
  rollbackPossible: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  testingRequired: boolean;
  backupRequired: boolean;
}

/**
 * Individual migration step
 */
export interface MigrationStep {
  order: number;
  name: string;
  description: string;
  type: 'automatic' | 'manual' | 'validation';
  operation?: () => Promise<void>;
  rollback?: () => Promise<void>;
  estimatedDuration: number; // in seconds
  requiredPermissions?: string[];
}

/**
 * Version constraint for dependency resolution
 */
export interface VersionConstraint {
  minVersion: string;
  maxVersion?: string;
  exact?: string;
  excludeVersions?: string[];
}

/**
 * Dependency resolution result
 */
export interface DependencyResolutionResult {
  resolvable: boolean;
  conflicts: DependencyConflict[];
  suggestedResolution?: string[];
}

/**
 * Dependency conflict
 */
export interface DependencyConflict {
  extension1: string;
  extension2: string;
  version1: string;
  version2: string;
  conflictReason: string;
  suggestedAction?: string;
}

/**
 * Extension manifest with lifecycle metadata
 */
export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  homepage?: string;
  repository?: {
    type: 'git';
    url: string;
  };
  bugs?: {
    url: string;
  };
  keywords?: string[];
  main: string;
  types?: string;
  engines: {
    machshop: string; // e.g., ">=1.0.0 <2.0.0"
  };
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  config?: {
    lifecycle?: {
      supportsHotReload?: boolean;
      maxInstances?: number;
      timeoutMs?: number;
    };
  };
  deprecation?: DeprecationInfo;
  breakingChanges?: BreakingChange[];
  changelog?: string;
  security?: {
    vulnerabilities?: string[];
    contactEmail?: string;
  };
}

/**
 * Lifecycle manager configuration
 */
export interface LifecycleManagerConfig {
  checkHealthInterval?: number; // in milliseconds
  maxConcurrentOperations?: number;
  enableAutoUpdates?: boolean;
  autoUpdateCheckInterval?: number; // in milliseconds
  deprecationWarningDays?: number;
  notifyUsers?: boolean;
  enableRollback?: boolean;
  maxBackupVersions?: number;
}

/**
 * Version comparison result
 */
export interface VersionComparisonResult {
  isNewer: boolean;
  isOlder: boolean;
  isSame: boolean;
  majorChanged: boolean;
  minorChanged: boolean;
  patchChanged: boolean;
}
