/**
 * MachShop Extension Manifest Types - v2.0
 * Type-safe TypeScript definitions for extension manifests
 * BREAKING CHANGE from v1.0: Capability-based dependencies, policy-driven conflicts, compliance delegation
 * Based on manifest.v2.schema.json
 */

// ============================================
// ENUMS - Extension Types & Categories
// ============================================

/**
 * Extension type from 6-tier taxonomy
 */
export enum ExtensionType {
  /** UI Extensions (Frontend) - Dashboard widgets, pages, components, themes */
  UI_EXTENSION = 'ui-extension',
  /** Business Logic Extensions - Workflow hooks, validation rules, calculations */
  BUSINESS_LOGIC = 'business-logic',
  /** Data Extensions - Custom fields, entities, relationships */
  DATA_EXTENSION = 'data-extension',
  /** Integration Extensions - ERP adapters, equipment integration, quality systems */
  INTEGRATION = 'integration',
  /** Compliance & Regulatory Extensions - AS9100, FDA, IATF, ISO 9001 */
  COMPLIANCE = 'compliance',
  /** Infrastructure Extensions - Auth providers, storage, caching, monitoring */
  INFRASTRUCTURE = 'infrastructure',
}

/**
 * Extension category for granular classification
 */
export enum ExtensionCategory {
  // UI categories
  DASHBOARD_WIDGET = 'dashboard-widget',
  PAGE_EXTENSION = 'page-extension',
  COMPONENT_OVERRIDE = 'component-override',
  THEME = 'theme',
  REPORT_TEMPLATE = 'report-template',

  // Business logic categories
  WORKFLOW_HOOK = 'workflow-hook',
  VALIDATION_RULE = 'validation-rule',
  CALCULATION_ENGINE = 'calculation-engine',
  STATE_MACHINE = 'state-machine',
  BUSINESS_RULE = 'business-rule',

  // Data categories
  CUSTOM_FIELD = 'custom-field',
  CUSTOM_ENTITY = 'custom-entity',
  RELATIONSHIP = 'relationship',
  COMPUTED_FIELD = 'computed-field',
  VIRTUAL_ENTITY = 'virtual-entity',

  // Integration categories
  ERP_ADAPTER = 'erp-adapter',
  EQUIPMENT_INTEGRATION = 'equipment-integration',
  QUALITY_SYSTEM = 'quality-system',
  DOCUMENT_MANAGEMENT = 'document-management',
  IDENTITY_PROVIDER = 'identity-provider',

  // Compliance categories
  AEROSPACE_COMPLIANCE = 'aerospace-compliance',
  MEDICAL_DEVICE_COMPLIANCE = 'medical-device-compliance',
  AUTOMOTIVE_COMPLIANCE = 'automotive-compliance',
  QUALITY_COMPLIANCE = 'quality-compliance',

  // Infrastructure categories
  CUSTOM_AUTH = 'custom-auth',
  STORAGE_BACKEND = 'storage-backend',
  CACHING = 'caching',
  MONITORING = 'monitoring',
  MIGRATION_TOOL = 'migration-tool',

  OTHER = 'other',
}

/**
 * Foundation tier classification for governance requirements
 */
export enum FoundationTier {
  /** Core MachShop foundation tier - Highest requirements (test coverage 90%+, security audits, code signing, performance SLAs) */
  CORE_FOUNDATION = 'core-foundation',
  /** Required infrastructure tier - High requirements (test coverage 80%+, security reviews, perf benchmarks) */
  FOUNDATION = 'foundation',
  /** Application feature tier - Standard requirements (test coverage 70%+, basic testing) */
  APPLICATION = 'application',
  /** Optional add-on tier - Minimal requirements (no mandatory testing) */
  OPTIONAL = 'optional',
}

/**
 * Approval process for foundation tier governance
 */
export enum ApprovalProcess {
  STANDARD = 'standard',
  EXPEDITED = 'expedited',
  SECURITY_REVIEW = 'security-review',
  COMPLIANCE_REVIEW = 'compliance-review',
}

/**
 * Conflict scope for policy-based exclusions (hierarchical)
 */
export enum ConflictScope {
  /** Global system-wide conflict */
  GLOBAL = 'global',
  /** Capability-level conflict (multiple resources using same capability) */
  CAPABILITY = 'capability',
  /** Resource-specific conflict (specific resource type) */
  RESOURCE = 'resource',
}

/**
 * Compliance model for handling regulatory requirements
 */
export enum ComplianceModel {
  /** System enforces all compliance aspects */
  ENFORCED = 'enforced',
  /** System enables compliance through features */
  ENABLED = 'enabled',
  /** Site delegates compliance responsibility to personnel */
  DELEGATED = 'delegated',
}

/**
 * Roles responsible for compliance delegations
 */
export enum ComplianceDelegationRole {
  QUALITY_FOCAL = 'quality-focal',
  QUALITY_MANAGER = 'quality-manager',
  SITE_MANAGER = 'site-manager',
  COMPLIANCE_OFFICER = 'compliance-officer',
}

/**
 * Test types supported by extension
 */
export enum TestType {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  E2E = 'e2e',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  REGRESSION = 'regression',
}

/**
 * Security level classification
 */
export enum SecurityLevel {
  FOUNDATION = 'foundation',
  STANDARD = 'standard',
  RESTRICTED = 'restricted',
}

/**
 * Software licenses
 */
export enum License {
  MIT = 'MIT',
  APACHE_2_0 = 'Apache-2.0',
  GPL_3_0 = 'GPL-3.0',
  BSD_3_CLAUSE = 'BSD-3-Clause',
  ISC = 'ISC',
  AGPL_3_0 = 'AGPL-3.0',
  PROPRIETARY = 'Proprietary',
  UNLICENSE = 'Unlicense',
  OTHER = 'Other',
}

/**
 * Required permissions
 */
export enum Permission {
  READ_WORK_ORDERS = 'read:work-orders',
  WRITE_WORK_ORDERS = 'write:work-orders',
  READ_ROUTING = 'read:routing',
  WRITE_ROUTING = 'write:routing',
  READ_MATERIALS = 'read:materials',
  WRITE_MATERIALS = 'write:materials',
  READ_EQUIPMENT = 'read:equipment',
  WRITE_EQUIPMENT = 'write:equipment',
  READ_QUALITY = 'read:quality',
  WRITE_QUALITY = 'write:quality',
  READ_USERS = 'read:users',
  WRITE_USERS = 'write:users',
  ADMIN_SYSTEM = 'admin:system',
  ADMIN_SECURITY = 'admin:security',
  INTEGRATION_EXTERNAL_SYSTEMS = 'integration:external-systems',
  DATA_EXPORT = 'data:export',
  DATA_IMPORT = 'data:import',
}

// ============================================
// INTERFACES - Core Structures
// ============================================

/**
 * Author or organization information
 */
export interface Author {
  name: string;
  email?: string;
  url?: string;
}

/**
 * Documentation links
 */
export interface Documentation {
  guide?: string;
  api?: string;
  changelog?: string;
  support?: string;
}

/**
 * Capability-based dependency declaration
 * Allows extension to depend on ANY extension providing a specific capability
 */
export interface CapabilityDependency {
  /** Capability identifier (e.g., 'erp-integration', 'work-instruction-authoring') */
  capability: string;
  /** Minimum capability version (format: vMAJOR or vMAJOR.MINOR) */
  minVersion?: string;
  /** Optional: Specific preferred provider if multiple implementations exist */
  provider?: string;
}

/**
 * Specific extension dependency with version constraint
 * Allows extension to depend on a specific extension ID
 */
export type ExtensionDependencyMap = Record<string, string>;

/**
 * Extension dependency declaration - NEW in v2.0
 * Combines specific extension dependencies and capability-based dependencies
 */
export interface DependencyDeclaration {
  /** Dependencies on specific extension IDs with version constraints */
  extensions?: ExtensionDependencyMap;
  /** Dependencies on ANY extension providing a specific capability */
  capabilities?: CapabilityDependency[];
}

/**
 * Explicit extension conflict declaration
 */
export interface ExplicitConflict {
  /** ID of conflicting extension */
  id: string;
  /** Reason for the conflict */
  reason?: string;
}

/**
 * Policy-based conflict exclusion - NEW in v2.0
 * Supports hierarchical conflict resolution: global > capability > resource
 */
export interface PolicyConflict {
  /** Conflict scope: global (system-wide), capability (specific capability), resource (specific resource) */
  scope: ConflictScope;
  /** Capability identifier (required if scope is 'capability' or 'resource') */
  capability?: string;
  /** Resource type (required only if scope is 'resource'). Example: 'work-instructions', 'routings' */
  resource?: string;
  /** This extension's policy (e.g., 'mes-authoring', 'plm-authoring', 'external-only') */
  policy: string;
  /** List of incompatible policies (e.g., ['plm-authoring', 'external-authoring']) */
  conflictsWith: string[];
  /** Explanation of policy conflict */
  reason?: string;
}

/**
 * Extension conflict declaration - NEW in v2.0
 * Combines explicit conflicts and policy-based exclusions
 */
export interface ConflictDeclaration {
  /** Explicitly named conflicting extensions */
  explicit?: ExplicitConflict[];
  /** Hierarchical policy-based exclusions */
  policyExclusions?: PolicyConflict[];
}

/**
 * Capability contract declaration
 * Defines capability provided by this extension with contract reference
 */
export interface CapabilityProvides {
  /** Capability identifier (e.g., 'erp-integration', 'work-instruction-authoring') */
  name: string;
  /** Capability contract version (format: vMAJOR[.MINOR[.PATCH]]) */
  version: string;
  /** URL to capability contract definition/interface */
  contract?: string;
  /** List of methods/APIs implemented from the contract */
  implements?: string[];
  /** Policy enforced by this capability (e.g., 'mes-authoring' for work-instruction capability) */
  policy?: string;
}

/**
 * UI extension capabilities (backward compatible with v1.0)
 */
export interface UICapabilities {
  widgets?: string[];
  pages?: string[];
  components?: string[];
  reports?: string[];
}

/**
 * Hook registration information
 */
export interface HookRegistration {
  hook: string;
  priority?: number;
}

/**
 * Data schema extension capabilities
 */
export interface DataSchemaCapabilities {
  entities?: string[];
  fields?: string[];
}

/**
 * External system integration
 */
export interface SystemIntegration {
  system: string;
  version?: string;
}

/**
 * Extension capabilities declaration - UPDATED for v2.0
 * Now includes capability contract declarations
 */
export interface Capabilities {
  /** Capabilities this extension provides with contract reference */
  provides?: CapabilityProvides[];
  /** UI extension capabilities (backward compatible) */
  ui?: UICapabilities;
  /** Hook point registrations */
  hooks?: HookRegistration[];
  /** Data schema extensions */
  dataSchema?: DataSchemaCapabilities;
  /** External system integrations */
  integrations?: SystemIntegration[];
}

/**
 * Configuration schema definition
 */
export interface ConfigurationSchema {
  required?: string[];
  properties?: Record<string, any>;
}

/**
 * Extension entry points
 */
export interface EntryPoint {
  main?: string;
  module?: string;
  browser?: string;
}

/**
 * System requirements
 */
export interface SystemRequirements {
  nodeVersion?: string;
  memory?: string;
  disk?: string;
}

/**
 * Performance baseline metrics
 */
export interface PerformanceBaseline {
  memoryUsageMB?: number;
  cpuUsagePercent?: number;
  responseTimeMs?: number;
  throughputOpsPerSec?: number;
}

/**
 * Testing configuration - UPDATED for v2.0
 * More comprehensive with test types and performance baselines
 */
export interface TestingConfig {
  /** Whether extension includes test suite */
  hasTests: boolean;
  /** Test coverage percentage (minimum varies by foundation tier) */
  coverage: number;
  /** URL to test instance */
  testingUrl?: string;
  /** Types of tests included */
  testTypes?: TestType[];
  /** Whether tests run in CI/CD pipeline */
  cicdIntegration?: boolean;
  /** Performance characteristics */
  performanceBaseline?: PerformanceBaseline;
}

/**
 * Data encryption configuration
 */
export interface DataEncryption {
  /** Whether data is encrypted at rest */
  atRest?: boolean;
  /** Whether data is encrypted in transit */
  inTransit?: boolean;
}

/**
 * Security configuration - UPDATED for v2.0
 * Enhanced with security level, vulnerability scanning, audit logging, encryption
 */
export interface SecurityConfig {
  /** Whether extension runs in sandboxed environment */
  sandboxed: boolean;
  /** Whether extension must be cryptographically signed */
  signatureRequired: boolean;
  /** Allowed CORS origins */
  allowedOrigins?: string[];
  /** Required security validation level */
  securityLevel?: SecurityLevel;
  /** Whether extension must pass vulnerability scanning */
  vulnerabilityScanRequired?: boolean;
  /** Whether extension actions are audit-logged */
  auditLog?: boolean;
  /** Data encryption configuration */
  dataEncryption?: DataEncryption;
}

/**
 * Compliance delegation to site personnel - NEW in v2.0
 * Tracks compliance responsibilities delegated to site roles
 */
export interface ComplianceDelegation {
  /** Compliance aspect (e.g., 'electronic-signature-validation') */
  aspect: string;
  /** Role responsible for this compliance aspect */
  delegatedTo: ComplianceDelegationRole;
  /** Whether signoff is required from designated role */
  requiresSignoff: boolean;
  /** URL to documentation on how to fulfill this compliance aspect */
  documentation?: string;
  /** Whether delegation decisions and signoffs are audit-trailed */
  auditTrail?: boolean;
}

/**
 * Compliance and regulatory configuration - NEW in v2.0
 * Supports delegated compliance model with site signoff tracking
 */
export interface ComplianceConfig {
  /** List of applicable regulations */
  applicableRegulations?: string[];
  /** How compliance is handled: enforced by system, enabled through features, or delegated to site */
  complianceModel?: ComplianceModel;
  /** Compliance aspects delegated to site personnel with signoff requirements */
  delegations?: ComplianceDelegation[];
}

/**
 * Governance requirements for foundation tier - NEW in v2.0
 * Defines approval and enforcement requirements
 */
export interface GovernanceRequirements {
  /** Whether extension requires platform approval before deployment */
  requiresPlatformApproval: boolean;
  /** Type of approval process required */
  approvalProcess?: ApprovalProcess;
}

/**
 * Performance hints
 */
export interface PerformanceHints {
  lazyLoad?: boolean;
  bundleSize?: string;
  asyncCapable?: boolean;
}

// ============================================
// MAIN MANIFEST INTERFACE
// ============================================

/**
 * Extension Manifest v2.0
 * BREAKING CHANGE from v1.0:
 * - New capability-based dependency model (dependencies.capabilities)
 * - New hierarchical policy-based conflict model (conflicts.policyExclusions)
 * - New capability provides declarations (capabilities.provides)
 * - New compliance delegation model (compliance.delegations)
 * - New foundation tier classification and governance requirements
 * - Enhanced testing and security requirements
 */
export interface ExtensionManifest {
  // === REQUIRED CORE FIELDS ===
  id: string;
  version: string;
  name: string;
  type: ExtensionType;
  category: ExtensionCategory;
  description: string;
  apiVersion: string;
  mesVersion: string;
  /** Must be "2.0" for v2.0 manifests */
  extensionSchemaVersion: '2.0';
  /** Foundation tier classification */
  foundationTier: FoundationTier;

  // === OPTIONAL METADATA ===
  author?: Author;
  license?: License;
  repository?: string;
  homepage?: string;
  documentation?: Documentation;
  keywords?: string[];
  tags?: string[];
  releaseDate?: string;
  deprecated?: boolean;
  deprecationNotice?: string;

  // === NEW v2.0: DEPENDENCY SYSTEM ===
  /**
   * Dependencies on specific extensions and/or capabilities
   * BREAKING CHANGE from v1.0: New structure supporting capability-based dependencies
   */
  dependencies?: DependencyDeclaration;

  // === NEW v2.0: CONFLICT SYSTEM ===
  /**
   * Extension conflicts - explicit and policy-based
   * BREAKING CHANGE from v1.0: New structure supporting hierarchical policy conflicts
   */
  conflicts?: ConflictDeclaration;

  // === CAPABILITIES ===
  /** Capabilities this extension provides and declares */
  capabilities?: Capabilities;

  // === PERMISSIONS ===
  permissions?: Permission[];

  // === CONFIGURATION ===
  configuration?: ConfigurationSchema;

  // === ENTRY POINTS ===
  entryPoint?: EntryPoint;

  // === SYSTEM REQUIREMENTS ===
  requirements?: SystemRequirements;

  // === TESTING (Required for foundation tiers) ===
  /**
   * Testing configuration
   * BREAKING CHANGE from v1.0: Now required and with more comprehensive fields
   * for foundation tier extensions (core-foundation, foundation)
   */
  testing?: TestingConfig;

  // === SECURITY (Required for foundation tiers) ===
  /**
   * Security configuration
   * BREAKING CHANGE from v1.0: Now required with stricter fields
   * for foundation tier extensions
   */
  security?: SecurityConfig;

  // === NEW v2.0: COMPLIANCE DELEGATION ===
  /**
   * Compliance and regulatory configuration
   * NEW in v2.0: Supports delegated compliance model with site signoff tracking
   */
  compliance?: ComplianceConfig;

  // === NEW v2.0: GOVERNANCE ===
  /**
   * Governance requirements for this extension
   * NEW in v2.0: Foundation tier extensions may require platform approval
   */
  governance?: GovernanceRequirements;

  // === PERFORMANCE ===
  performance?: PerformanceHints;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Read-only version of manifest (for validation results)
 */
export type ReadOnlyManifest = Readonly<ExtensionManifest>;

/**
 * Partial manifest for updates
 */
export type PartialManifest = Partial<ExtensionManifest>;

/**
 * Manifest validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
  /** Severity level: error, warning, info */
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Dependency resolution result
 */
export interface DependencyResolution {
  satisfied: boolean;
  missingDependencies: string[];
  conflictingExtensions: string[];
  warnings: string[];
}

/**
 * Compliance signoff audit trail entry
 */
export interface ComplianceSignoff {
  aspect: string;
  signedBy: string;
  role: ComplianceDelegationRole;
  timestamp: Date;
  siteId: string;
  configurationHash: string;
  notes?: string;
}

/**
 * Manifest validation result - UPDATED for v2.0
 * Now includes dependency resolution and compliance information
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  manifest?: ExtensionManifest;
  /** Dependency resolution information */
  dependencies?: DependencyResolution;
  /** Compliance signoff requirements for this manifest */
  complianceSignoffsRequired?: ComplianceDelegation[];
}

/**
 * Extension registry entry - UPDATED for v2.0
 * Now includes governance and compliance metadata
 */
export interface RegistryEntry {
  manifest: ExtensionManifest;
  registeredAt: Date;
  registeredBy: string;
  checksum: string;
  signature?: string;
  /** Whether extension has platform approval (if required by governance) */
  platformApproved?: boolean;
  approvalDate?: Date;
  approvedBy?: string;
}

/**
 * Site-specific extension configuration with compliance signoffs
 */
export interface SiteExtensionConfiguration {
  siteId: string;
  extensionId: string;
  version: string;
  enabledAt: Date;
  configurationHash: string;
  /** Compliance signoffs for this configuration at this site */
  complianceSignoffs: ComplianceSignoff[];
  /** Whether configuration has been validated */
  validated: boolean;
  validationErrors?: ValidationError[];
  /** Conflicts detected at this site */
  detectedConflicts?: string[];
}

// ============================================
// TYPE GUARDS - Runtime Validation
// ============================================

/**
 * Type guard to check if object is a valid ExtensionManifest v2.0
 */
export function isExtensionManifestV2(value: any): value is ExtensionManifest {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.version === 'string' &&
    typeof value.name === 'string' &&
    Object.values(ExtensionType).includes(value.type) &&
    Object.values(ExtensionCategory).includes(value.category) &&
    typeof value.description === 'string' &&
    value.extensionSchemaVersion === '2.0' &&
    Object.values(FoundationTier).includes(value.foundationTier)
  );
}

/**
 * Type guard to check if value is a valid ExtensionType
 */
export function isExtensionType(value: any): value is ExtensionType {
  return Object.values(ExtensionType).includes(value);
}

/**
 * Type guard to check if value is a valid ExtensionCategory
 */
export function isExtensionCategory(value: any): value is ExtensionCategory {
  return Object.values(ExtensionCategory).includes(value);
}

/**
 * Type guard to check if value is a valid FoundationTier
 */
export function isFoundationTier(value: any): value is FoundationTier {
  return Object.values(FoundationTier).includes(value);
}

/**
 * Type guard to check if value is a valid Permission
 */
export function isPermission(value: any): value is Permission {
  return Object.values(Permission).includes(value);
}

/**
 * Type guard to check if dependency is capability-based
 */
export function isCapabilityDependency(value: any): value is CapabilityDependency {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.capability === 'string'
  );
}

/**
 * Type guard to check if conflict is policy-based
 */
export function isPolicyConflict(value: any): value is PolicyConflict {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(ConflictScope).includes(value.scope) &&
    typeof value.policy === 'string' &&
    Array.isArray(value.conflictsWith)
  );
}

/**
 * Type guard to check if compliance model is delegated
 */
export function isDelegatedComplianceModel(
  value: any
): value is ComplianceConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.complianceModel === ComplianceModel.DELEGATED
  );
}

/**
 * Type guard to check if value is a valid ConflictScope
 */
export function isConflictScope(value: any): value is ConflictScope {
  return Object.values(ConflictScope).includes(value);
}

/**
 * Type guard to check if value is a valid ComplianceDelegationRole
 */
export function isComplianceDelegationRole(
  value: any
): value is ComplianceDelegationRole {
  return Object.values(ComplianceDelegationRole).includes(value);
}

/**
 * Type guard to check if value is a valid TestType
 */
export function isTestType(value: any): value is TestType {
  return Object.values(TestType).includes(value);
}

/**
 * Type guard to check if value is a valid SecurityLevel
 */
export function isSecurityLevel(value: any): value is SecurityLevel {
  return Object.values(SecurityLevel).includes(value);
}
