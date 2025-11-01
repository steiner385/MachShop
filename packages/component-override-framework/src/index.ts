/**
 * Component Override Framework
 *
 * Safety system for component overrides with contract validation and fallback mechanisms.
 *
 * @module component-override-framework
 */

// Export types
export type {
  ComponentContract,
  ComponentOverrideDeclaration,
  ComponentOverrideState,
  OverrideRegistryEntry,
  OverrideSafetyPolicy,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  CompatibilityCheckResult,
  CompatibilityIssue,
  PropDefinition,
} from './types';

// Export validator functions
export { validateOverride, checkCompatibility, createFallbackWrapper, wrapWithValidation } from './validator';

// Export store
export { useComponentOverrideStore, type ComponentOverrideStoreActions } from './store';

// Export hooks
export {
  useRegisterComponentOverride,
  useComponentOverride,
  useOverridableComponent,
  useOverrideValidation,
  useOverrideAnalytics,
} from './hooks';

// Export components
export { OverrideStatusBadge, OverridesList, OverrideValidationResults, OverridesLoading } from './components';

/**
 * Framework Version
 */
export const COMPONENT_OVERRIDE_FRAMEWORK_VERSION = '2.0.0';

/**
 * Initialize component override framework
 */
export async function initializeComponentOverrideFramework(): Promise<void> {
  console.info(
    `Component Override Framework v${COMPONENT_OVERRIDE_FRAMEWORK_VERSION} initialized`
  );
}
