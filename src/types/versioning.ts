/**
 * API Versioning & Backward Compatibility Types
 * Implements a comprehensive versioning strategy with support for multiple concurrent versions,
 * deprecation management, and backward compatibility.
 */

/**
 * API Version Status - Lifecycle state of an API version
 */
export enum ApiVersionStatus {
  /** Under active development, may have breaking changes */
  BETA = 'BETA',
  /** Current production version, actively developed */
  CURRENT = 'CURRENT',
  /** In maintenance mode, bug fixes and security patches only */
  MAINTENANCE = 'MAINTENANCE',
  /** Marked for deprecation, sunset date announced */
  DEPRECATED = 'DEPRECATED',
  /** No longer available, removed from service */
  SUNSET = 'SUNSET',
}

/**
 * Type of breaking change
 */
export enum BreakingChangeType {
  ENDPOINT_REMOVED = 'ENDPOINT_REMOVED',
  FIELD_REMOVED = 'FIELD_REMOVED',
  FIELD_TYPE_CHANGED = 'FIELD_TYPE_CHANGED',
  RESPONSE_STRUCTURE_CHANGED = 'RESPONSE_STRUCTURE_CHANGED',
  VALIDATION_STRENGTHENED = 'VALIDATION_STRENGTHENED',
  AUTHENTICATION_CHANGED = 'AUTHENTICATION_CHANGED',
  ERROR_FORMAT_CHANGED = 'ERROR_FORMAT_CHANGED',
  HTTP_STATUS_CHANGED = 'HTTP_STATUS_CHANGED',
  PAGINATION_CHANGED = 'PAGINATION_CHANGED',
  RATE_LIMIT_CHANGED = 'RATE_LIMIT_CHANGED',
}

/**
 * API Version metadata
 */
export interface ApiVersion {
  id: string;
  version: string; // e.g., 'v1', 'v2'
  semver: string; // e.g., '1.0.0', '2.1.5'
  releaseDate: Date;
  status: ApiVersionStatus;

  // Support timeline
  maintenanceUntil?: Date; // When maintenance mode ends
  deprecatedAt?: Date; // When deprecation announced
  sunsetDate?: Date; // When version is removed

  // Metadata & Links
  changelogUrl?: string;
  migrationGuideUrl?: string;
  documentationUrl?: string;

  // Breaking changes in this version
  breakingChanges?: BreakingChangeInfo[];

  // Deprecations introduced in this version
  deprecations?: DeprecationInfo[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Information about a breaking change
 */
export interface BreakingChangeInfo {
  id: string;
  fromVersion: string; // e.g., 'v1'
  toVersion: string; // e.g., 'v2'
  changeType: BreakingChangeType;

  // What changed
  endpoint?: string; // e.g., 'GET /api/v1/work-orders/:id'
  field?: string; // e.g., 'workOrder.status'
  description: string;

  // Migration help
  before?: Record<string, unknown>; // Example before
  after?: Record<string, unknown>; // Example after
  migrationSteps?: string[]; // Step-by-step migration instructions
  migrationGuideUrl?: string;

  // Timeline
  announcedAt: Date;
  effectiveDate: Date;
}

/**
 * Deprecation information for features
 */
export interface DeprecationInfo {
  id: string;
  version: string; // Which version introduced deprecation
  feature: string; // Endpoint or field being deprecated
  deprecatedAt: Date;
  sunsetDate: Date;

  // Replacement
  replacement?: string; // New endpoint/field to use instead
  migrationGuideUrl?: string;

  // Communication
  affectedAccounts?: number; // Count of accounts using this feature
  notificationsSent?: number; // How many notifications sent

  // Impact
  severity: 'low' | 'medium' | 'high'; // Impact severity
  description: string;
}

/**
 * Version detection context - attached to requests
 */
export interface VersionContext {
  requestedVersion: string; // Version client requested (e.g., 'v1', 'v2')
  resolvedVersion: string; // Version that will be used
  versionSource: 'url' | 'header' | 'default'; // Where version came from
  isDeprecated: boolean; // Is requested version deprecated
  sunsetDate?: Date; // When version sunsets
  supportedVersions: string[]; // All currently supported versions
}

/**
 * Request with version context
 */
export interface VersionedRequest {
  versionContext: VersionContext;
  apiVersion?: string; // Convenience property
  // ... other Express request properties
}

/**
 * API response with version information
 */
export interface VersionedResponse {
  data: unknown;
  meta?: {
    version: string;
    timestamp: string;
    requestId?: string;
  };
  deprecation?: DeprecationWarning;
  error?: unknown;
}

/**
 * Deprecation warning to include in response
 */
export interface DeprecationWarning {
  deprecated: boolean;
  sunsetDate?: string; // ISO date
  alternativeEndpoint?: string;
  migrationGuide?: string;
  message: string;
}

/**
 * API usage by version - for analytics
 */
export interface ApiUsageByVersion {
  id: string;
  version: string; // e.g., 'v1'
  apiKeyId: string;

  // Usage stats
  requestCount: number;
  lastRequestAt: Date;
  failureCount?: number;
  lastFailureAt?: Date;

  // Tracking
  date: Date; // Date these stats are for

  // Metadata
  clientName?: string;
  integrationName?: string;
}

/**
 * Version compatibility report
 */
export interface CompatibilityReport {
  sourceVersion: string;
  targetVersion: string;
  compatible: boolean;

  // Issues found
  breakingChanges: BreakingChangeInfo[];
  deprecatedFeatures: DeprecationInfo[];
  unsupportedEndpoints: string[];
  unsupportedFields: string[];

  // Recommendations
  recommendations: string[];
  estimatedMigrationEffort: 'low' | 'medium' | 'high';
  migrationGuideUrl?: string;

  // Metadata
  generatedAt: Date;
  expiresAt: Date;
}

/**
 * Version adapter interface - transforms between versions
 */
export interface IVersionAdapter {
  /** Convert internal domain model to API response format */
  toApiResponse(data: unknown): unknown;

  /** Convert API request format to internal domain model */
  fromApiRequest(data: unknown): unknown;

  /** Validate request against this version's schema */
  validateRequest(data: unknown): Promise<{ valid: boolean; errors?: string[] }>;

  /** Validate response against this version's schema */
  validateResponse(data: unknown): Promise<{ valid: boolean; errors?: string[] }>;
}

/**
 * Request/Response capturing for compatibility testing
 */
export interface CapturedApiCall {
  id: string;
  apiKeyId: string;
  apiVersion: string;

  // Request
  method: string;
  endpoint: string;
  requestPath: string;
  requestHeaders: Record<string, string>;
  requestBody?: Record<string, unknown>;
  requestQuery?: Record<string, unknown>;

  // Response
  statusCode: number;
  responseHeaders: Record<string, string>;
  responseBody?: Record<string, unknown>;

  // Metadata
  timestamp: Date;
  duration: number; // milliseconds
  success: boolean;
  errorMessage?: string;
}

/**
 * Changelog entry
 */
export interface ChangelogEntry {
  id: string;
  version: string; // e.g., '2.0.0'
  releaseDate: Date;
  category: 'breaking' | 'feature' | 'deprecation' | 'fix' | 'security';

  // Content
  title: string;
  description: string;
  endpoint?: string; // Affected endpoint
  field?: string; // Affected field

  // Migration info
  migrationGuide?: string;
  alternativeFeature?: string;

  // Impact
  severity?: 'low' | 'medium' | 'high';
  affectedApiKeys?: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Migration guide
 */
export interface MigrationGuide {
  id: string;
  fromVersion: string;
  toVersion: string;

  // Content
  title: string;
  overview: string;
  estimatedTime: string; // e.g., '2 hours', '1 day'
  difficulty: 'easy' | 'medium' | 'hard';

  // Sections
  sections: MigrationSection[];

  // Testing
  testingSteps: string[];
  commonIssues: {
    issue: string;
    solution: string;
  }[];

  // Support
  supportUrl?: string;
  contactEmail?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Section within a migration guide
 */
export interface MigrationSection {
  id: string;
  title: string;
  description: string;

  // Changes
  changes: {
    field?: string;
    endpoint?: string;
    old: string;
    new: string;
    reason: string;
  }[];

  // Code examples
  codeExample?: {
    before: string;
    after: string;
    language: string;
  };

  // Order
  order: number;
}

/**
 * Version-specific response headers
 */
export interface VersionResponseHeaders {
  'X-API-Version': string; // e.g., 'v1'
  'X-API-Version-Semver': string; // e.g., '1.0.0'
  'Deprecation'?: 'true'; // RFC 8594
  'Sunset'?: string; // RFC 8594 - sunset date
  'Link'?: string; // RFC 5988 - link to deprecation info
}

/**
 * Deprecation headers per RFC 8594
 */
export interface DeprecationHeaders {
  deprecation: 'true' | 'false';
  sunset?: string; // HTTP date format
  link?: string; // Link to deprecation documentation
}
