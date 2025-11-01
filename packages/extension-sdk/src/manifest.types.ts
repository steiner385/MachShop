/**
 * MachShop Extension Manifest Types
 * Type-safe TypeScript definitions for extension manifests
 * Based on manifest.schema.json v1.0
 */

// ============================================
// ENUMS
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
 * Hook execution phases
 */
export enum HookPhase {
  PRE = 'pre',
  CORE = 'core',
  POST = 'post',
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
// INTERFACES
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
 * Extension dependency with version constraint
 */
export type DependencyMap = Record<string, string>;

/**
 * Conflicting extension reference
 */
export interface ConflictingExtension {
  id: string;
  reason?: string;
}

/**
 * UI extension capabilities
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
  phase?: HookPhase;
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
 * Extension capabilities declaration
 */
export interface Capabilities {
  ui?: UICapabilities;
  hooks?: HookRegistration[];
  dataSchema?: DataSchemaCapabilities;
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
 * Testing configuration
 */
export interface TestingConfig {
  testingUrl?: string;
  hasTests?: boolean;
  coverage?: number;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  sandboxed?: boolean;
  allowedOrigins?: string[];
  signatureRequired?: boolean;
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
 * Extension Manifest v1.0
 * Complete type-safe representation of extension manifest
 */
export interface ExtensionManifest {
  // Required fields
  id: string;
  version: string;
  name: string;
  type: ExtensionType;
  category: ExtensionCategory;
  description: string;
  apiVersion: string;
  mesVersion: string;
  extensionSchemaVersion: '1.0';

  // Author & licensing
  author?: Author;
  license?: License;

  // Repository & documentation
  repository?: string;
  homepage?: string;
  documentation?: Documentation;
  keywords?: string[];

  // Dependencies and conflicts
  dependencies?: DependencyMap;
  conflicts?: ConflictingExtension[];

  // Capabilities and permissions
  capabilities?: Capabilities;
  permissions?: Permission[];

  // Configuration
  configuration?: ConfigurationSchema;

  // Entry points
  entryPoint?: EntryPoint;

  // System requirements
  requirements?: SystemRequirements;

  // Testing and security
  testing?: TestingConfig;
  security?: SecurityConfig;

  // Performance
  performance?: PerformanceHints;

  // Additional metadata
  tags?: string[];
  releaseDate?: string;
  deprecated?: boolean;
  deprecationNotice?: string;
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
}

/**
 * Manifest validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  manifest?: ExtensionManifest;
}

/**
 * Extension registry entry
 */
export interface RegistryEntry {
  manifest: ExtensionManifest;
  registeredAt: Date;
  registeredBy: string;
  checksum: string;
  signature?: string;
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard to check if object is a valid ExtensionManifest
 */
export function isExtensionManifest(value: any): value is ExtensionManifest {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.version === 'string' &&
    typeof value.name === 'string' &&
    Object.values(ExtensionType).includes(value.type) &&
    Object.values(ExtensionCategory).includes(value.category) &&
    typeof value.description === 'string'
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
 * Type guard to check if value is a valid Permission
 */
export function isPermission(value: any): value is Permission {
  return Object.values(Permission).includes(value);
}
