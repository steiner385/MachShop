/**
 * Extension Validation Framework Types
 *
 * @module extension-validation-framework/types
 */

/**
 * Validation rule configuration
 */
export interface ValidationRule {
  /**
   * Rule ID
   */
  id: string;

  /**
   * Rule name
   */
  name: string;

  /**
   * Rule description
   */
  description: string;

  /**
   * Severity level
   */
  severity: 'error' | 'warning' | 'info';

  /**
   * Whether rule is enabled
   */
  enabled: boolean;

  /**
   * Rule validator function
   */
  validate: (context: ValidationContext) => Promise<ValidationIssue[]>;
}

/**
 * Validation context
 */
export interface ValidationContext {
  /**
   * Extension manifest path
   */
  manifestPath: string;

  /**
   * Parsed manifest
   */
  manifest: any;

  /**
   * Source directory
   */
  sourceDir: string;

  /**
   * Extension files
   */
  files: string[];

  /**
   * Package.json contents
   */
  packageJson?: any;

  /**
   * TypeScript config
   */
  tsConfig?: any;

  /**
   * Additional options
   */
  options?: Record<string, any>;
}

/**
 * Validation issue found
 */
export interface ValidationIssue {
  /**
   * Issue code
   */
  code: string;

  /**
   * Issue message
   */
  message: string;

  /**
   * Severity level
   */
  severity: 'error' | 'warning' | 'info';

  /**
   * File path where issue occurred
   */
  file?: string;

  /**
   * Line number
   */
  line?: number;

  /**
   * Column number
   */
  column?: number;

  /**
   * Suggested fix
   */
  fix?: string;

  /**
   * Rule ID that found this issue
   */
  ruleId: string;
}

/**
 * Validation report
 */
export interface ValidationReport {
  /**
   * Whether validation passed
   */
  valid: boolean;

  /**
   * All issues found
   */
  issues: ValidationIssue[];

  /**
   * Error count
   */
  errorCount: number;

  /**
   * Warning count
   */
  warningCount: number;

  /**
   * Info count
   */
  infoCount: number;

  /**
   * Validation duration in ms
   */
  duration: number;

  /**
   * Rules that were run
   */
  rulesRun: string[];

  /**
   * Timestamp of validation
   */
  timestamp: Date;

  /**
   * Metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Manifest validation schema
 */
export interface ManifestSchema {
  $schema: string;
  title: string;
  type: 'object';
  required: string[];
  properties: Record<string, any>;
}

/**
 * Test result
 */
export interface TestResult {
  /**
   * Test name
   */
  name: string;

  /**
   * Whether test passed
   */
  passed: boolean;

  /**
   * Error message if failed
   */
  error?: Error;

  /**
   * Test duration in ms
   */
  duration: number;

  /**
   * Test output
   */
  output?: string;
}

/**
 * Test suite result
 */
export interface TestSuiteResult {
  /**
   * Suite name
   */
  name: string;

  /**
   * All test results
   */
  tests: TestResult[];

  /**
   * Total tests
   */
  total: number;

  /**
   * Passed tests
   */
  passed: number;

  /**
   * Failed tests
   */
  failed: number;

  /**
   * Suite duration in ms
   */
  duration: number;

  /**
   * Suite output
   */
  output?: string;
}

/**
 * Accessibility validation result
 */
export interface AccessibilityResult {
  /**
   * Overall WCAG level
   */
  wcagLevel: 'A' | 'AA' | 'AAA' | 'FAIL';

  /**
   * Issues found
   */
  issues: AccessibilityIssue[];

  /**
   * Critical issues
   */
  criticalIssues: AccessibilityIssue[];

  /**
   * Warnings
   */
  warnings: AccessibilityIssue[];

  /**
   * Validation score (0-100)
   */
  score: number;
}

/**
 * Accessibility issue
 */
export interface AccessibilityIssue {
  /**
   * Issue code
   */
  code: string;

  /**
   * Issue description
   */
  description: string;

  /**
   * Affected element
   */
  element?: string;

  /**
   * WCAG guideline
   */
  wcagGuideline: string;

  /**
   * Severity
   */
  severity: 'critical' | 'serious' | 'moderate' | 'minor';

  /**
   * How to fix
   */
  howToFix: string;
}

/**
 * Performance metric
 */
export interface PerformanceMetric {
  /**
   * Metric name
   */
  name: string;

  /**
   * Metric value
   */
  value: number;

  /**
   * Unit of measurement
   */
  unit: string;

  /**
   * Recommended threshold
   */
  threshold?: number;

  /**
   * Whether metric passes threshold
   */
  passes: boolean;

  /**
   * Details
   */
  details?: string;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  /**
   * All metrics
   */
  metrics: PerformanceMetric[];

  /**
   * Overall score (0-100)
   */
  score: number;

  /**
   * Performance issues
   */
  issues: ValidationIssue[];

  /**
   * Recommendations
   */
  recommendations: string[];
}
