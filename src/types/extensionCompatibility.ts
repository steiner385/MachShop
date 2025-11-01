/**
 * Extension Compatibility Types
 * Defines interfaces for extension compatibility matrix and pre-installation validation
 */

/**
 * MES Version Requirement
 * Specifies which MES versions an extension is compatible with
 */
export interface MESVersionRequirement {
  min: string;
  max?: string;
}

/**
 * Platform Capability Requirement
 * Specifies platform capabilities required by an extension
 */
export interface PlatformCapabilityRequirement {
  name: string;
  version?: string;
  optional?: boolean;
}

/**
 * Extension Conflict Declaration
 * Specifies extensions that cannot coexist
 */
export interface ExtensionConflict {
  extensionId: string;
  conflictType: 'route' | 'entity' | 'capability' | 'policy' | 'hook';
  reason: string;
}

/**
 * Compatibility Check Context
 * Information needed to perform compatibility checks
 */
export interface CompatibilityContext {
  mesVersion: string;
  installedExtensions: InstalledExtensionInfo[];
  platformCapabilities: string[];
  targetSite?: string;
}

/**
 * Information about an installed extension
 */
export interface InstalledExtensionInfo {
  extensionId: string;
  version: string;
  status: 'active' | 'disabled' | 'error';
  capabilities: string[];
  hooked: string[];
  registeredRoutes: string[];
  customEntities: string[];
}

/**
 * Extension Compatibility Record
 * Stores compatibility information for a specific extension version
 */
export interface ExtensionCompatibilityRecord {
  extensionId: string;
  extensionVersion: string;
  mesVersionMin: string;
  mesVersionMax?: string;
  platformCapabilities?: string[];
  tested: boolean;
  testDate?: Date;
  testStatus?: 'passed' | 'failed' | 'warning';
  testResults?: Record<string, unknown>;
  notes?: string;
}

/**
 * Dependency Compatibility Record
 * Tracks compatibility between two extensions
 */
export interface DependencyCompatibilityRecord {
  sourceExtensionId: string;
  sourceVersion: string;
  targetExtensionId: string;
  targetVersionMin: string;
  targetVersionMax?: string;
  compatibilityType: 'requires' | 'compatible' | 'incompatible' | 'optional';
  conflictType?: 'route' | 'entity' | 'capability' | 'policy' | 'hook';
  tested: boolean;
  testDate?: Date;
  testResults?: Record<string, unknown>;
  notes?: string;
}

/**
 * Capability Compatibility Record
 * Tracks compatibility of capabilities across versions and MES versions
 */
export interface CapabilityCompatibilityRecord {
  capabilityName: string;
  capabilityVersion: string;
  mesVersionMin: string;
  mesVersionMax?: string;
  providedByExtensions?: Array<{ extensionId: string; versions: string[] }>;
  tested: boolean;
  testDate?: Date;
  testResults?: Record<string, unknown>;
}

/**
 * Conflict Details
 * Describes a specific conflict between extensions or with the platform
 */
export interface ConflictDetail {
  type: 'error' | 'warning' | 'info';
  code: string;
  extension1Id: string;
  extension1Version?: string;
  extension2Id?: string;
  extension2Version?: string;
  resource?: string;
  message: string;
  suggestion?: string;
}

/**
 * Compatibility Check Result
 * Result of checking compatibility for installing an extension
 */
export interface CompatibilityCheckResult {
  compatible: boolean;
  extensionId: string;
  extensionVersion: string;
  mesVersion: string;
  conflicts: ConflictDetail[];
  warnings: ConflictDetail[];
  suggestions: string[];
  checkedAt: Date;
  cached: boolean;
}

/**
 * Installation Compatibility Request
 * Request to check if an extension can be installed
 */
export interface ExtensionInstallRequest {
  extensionId: string;
  version: string;
  targetSite?: string;
}

/**
 * Bulk Installation Compatibility Result
 * Result of checking compatibility for installing multiple extensions
 */
export interface InstallationCompatibilityResult {
  compatible: boolean;
  totalExtensions: number;
  compatibleCount: number;
  conflictingCount: number;
  installationOrder: string[];
  conflicts: ConflictDetail[];
  warnings: ConflictDetail[];
  suggestions: string[];
  checkedAt: Date;
}

/**
 * Compatibility Test Suite
 * Defines tests to run for compatibility validation
 */
export interface CompatibilityTestSuite {
  testMESVersions: string[];
  testWithExtensions: ExtensionInstallRequest[];
  performanceThresholds?: {
    installTimeMs: number;
    memoryMb: number;
  };
}

/**
 * Compatibility Test Result
 * Results from running a compatibility test suite
 */
export interface CompatibilityTestResult {
  extensionId: string;
  extensionVersion: string;
  testDate: Date;
  passed: boolean;
  testsRun: number;
  testsFailed: number;
  testsWarned: number;
  details: Array<{
    mesVersion: string;
    extensionsPresent: string[];
    passed: boolean;
    message: string;
    duration?: number;
  }>;
}

/**
 * Extension Compatibility Error
 * Custom error for compatibility-related issues
 */
export class CompatibilityError extends Error {
  constructor(
    public code: string,
    public conflicts: ConflictDetail[],
    public suggestions: string[] = []
  ) {
    super(`Extension compatibility error: ${code}`);
    this.name = 'CompatibilityError';
  }
}
