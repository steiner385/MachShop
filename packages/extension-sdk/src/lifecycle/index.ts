/**
 * Extension Lifecycle Management Module
 *
 * Comprehensive lifecycle management for MachShop extensions including:
 * - Version management with semantic versioning
 * - State transitions and lifecycle events
 * - Dependency resolution and conflict detection
 * - Deprecation and breaking change tracking
 * - Migration tooling and utilities
 */

export { ExtensionLifecycleManager } from './manager';
export { VersionManager } from './version';
export { DependencyResolver } from './dependencies';

export type {
  ExtensionState,
  SemanticVersion,
  BreakingChange,
  DeprecationInfo,
  ExtensionVersion,
  ExtensionLifecycleEvent,
  ExtensionWithLifecycle,
  ExtensionDependency,
  CompatibilityStatus,
  HealthCheckResult,
  HealthCheckIssue,
  HealthCheckMetrics,
  MigrationInfo,
  MigrationStep,
  VersionConstraint,
  DependencyResolutionResult,
  DependencyConflict,
  ExtensionManifest,
  LifecycleManagerConfig,
  VersionComparisonResult,
} from './types';

export { ExtensionState as ExtensionStateEnum } from './types';

/**
 * Initialize extension lifecycle management
 *
 * @example
 * ```typescript
 * import { ExtensionLifecycleManager } from '@machshop/extension-sdk/lifecycle';
 *
 * const lifecycleManager = new ExtensionLifecycleManager({
 *   enableAutoUpdates: false,
 *   deprecationWarningDays: 30,
 *   maxBackupVersions: 5,
 * });
 *
 * // Install an extension
 * await lifecycleManager.installExtension(manifest, '1.0.0');
 *
 * // Listen to lifecycle events
 * lifecycleManager.onLifecycleEvent((event) => {
 *   console.log(`Extension ${event.extensionId} ${event.eventType}`);
 * });
 * ```
 */
