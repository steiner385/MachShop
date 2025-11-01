/**
 * Component Override Safety System - Module Exports
 * Issue #428: Component Override Safety System with Fallback & Approval
 */

// Types
export type {
  ComponentOverrideDeclaration,
  ComponentOverride,
  ValidationReport,
  ComponentContract,
  ConflictDetectionResult,
  OverrideQueryOptions,
  OverrideEvent,
  IOverrideRegistry,
  IOverrideValidator,
  RolloutInfo,
  ApprovalRequest,
  TestReport,
  OverrideMetrics,
  OverrideError,
} from './types';

export {
  OverrideStatus,
  RolloutStatus,
  RolloutPhase,
  OverrideError,
  OverrideNotFoundError,
  ComponentNotFoundError,
  OverrideValidationError,
  OverrideConflictError,
  ApprovalRequiredError,
  OverrideLoadError,
} from './types';

// Registry
export { OverrideRegistry, getOverrideRegistry } from './registry';

// Validator
export { OverrideValidator, getOverrideValidator } from './validator';

// React Components
export {
  withOverride,
  withFallback,
  OverrideErrorBoundary,
  useComponentOverride,
  OverrideMetrics,
} from './withOverride';

// Loader & Rollout
export { loadComponentWithOverride, RolloutManager, OverrideDeploymentScheduler, OverridePerformanceMonitor } from './loader';
