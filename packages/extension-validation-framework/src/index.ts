/**
 * Extension Validation Framework
 *
 * Comprehensive validation and testing framework for MachShop extensions.
 *
 * @module extension-validation-framework
 */

// Export validators
export { validateExtension, formatValidationReport } from './validator';

export {
  validateManifestSchema,
  validateManifestSemantics,
  validateCapabilities,
  validateUIComponents,
  validateNavigation,
} from './validators/manifestValidator';

export {
  validateTypeScriptConfig,
  validateCodeQuality,
  validateSecurity,
  validateErrorHandling,
} from './validators/codeValidator';

export {
  validateAccessibility,
  validateColorContrast,
} from './validators/accessibilityValidator';

// Export types
export type {
  ValidationRule,
  ValidationContext,
  ValidationIssue,
  ValidationReport,
  ManifestSchema,
  TestResult,
  TestSuiteResult,
  AccessibilityResult,
  AccessibilityIssue,
  PerformanceMetric,
  PerformanceReport,
} from './types';

/**
 * Framework Version
 */
export const VALIDATION_FRAMEWORK_VERSION = '2.0.0';

/**
 * Initialize validation framework
 */
export async function initializeValidationFramework(): Promise<void> {
  console.info(`Extension Validation Framework v${VALIDATION_FRAMEWORK_VERSION} initialized`);
}
