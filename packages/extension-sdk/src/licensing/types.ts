/**
 * Extension License Management Types
 *
 * Comprehensive type definitions for license management, validation,
 * usage tracking, and compliance across multiple sites.
 */

/**
 * License types supported
 */
export enum LicenseType {
  /** Perpetual license - one-time purchase */
  PERPETUAL = 'PERPETUAL',
  /** Subscription license - requires renewal */
  SUBSCRIPTION = 'SUBSCRIPTION',
  /** Trial license - limited time evaluation */
  TRIAL = 'TRIAL',
  /** Enterprise license - volume/site-based */
  ENTERPRISE = 'ENTERPRISE',
}

/**
 * License status
 */
export enum LicenseStatus {
  /** License is active and valid */
  ACTIVE = 'ACTIVE',
  /** License is inactive */
  INACTIVE = 'INACTIVE',
  /** License expired */
  EXPIRED = 'EXPIRED',
  /** License is suspended due to violation */
  SUSPENDED = 'SUSPENDED',
  /** Trial period ended */
  TRIAL_ENDED = 'TRIAL_ENDED',
}

/**
 * License entitlement
 */
export interface LicenseEntitlement {
  /** Entitlement name (e.g., 'max_users', 'advanced_features') */
  name: string;
  /** Whether entitlement is included */
  included: boolean;
  /** Limit value (null = unlimited) */
  limit?: number;
  /** Current usage */
  usage?: number;
}

/**
 * License definition
 */
export interface License {
  /** Unique license ID */
  id: string;
  /** Extension ID */
  extensionId: string;
  /** License type */
  type: LicenseType;
  /** License key */
  licenseKey: string;
  /** Organization/site ID */
  siteId: string;
  /** License holder name */
  licensee: string;
  /** License status */
  status: LicenseStatus;
  /** Entitlements included in this license */
  entitlements: LicenseEntitlement[];
  /** Issued date */
  issuedAt: Date;
  /** Expiration date (null for perpetual) */
  expiresAt?: Date;
  /** Activation date */
  activatedAt?: Date;
  /** Maximum concurrent users allowed */
  maxUsers?: number;
  /** Current active users */
  activeUsers: number;
  /** Whether grace period is active */
  gracePeriod?: boolean;
  /** Grace period end date */
  gracePeriodEndsAt?: Date;
  /** Last check timestamp */
  lastCheckAt: Date;
  /** License signature for verification */
  signature?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * License activation request
 */
export interface LicenseActivationRequest {
  /** Extension ID */
  extensionId: string;
  /** License key */
  licenseKey: string;
  /** Site ID */
  siteId: string;
  /** Licensee information */
  licensee: string;
}

/**
 * License activation response
 */
export interface LicenseActivationResponse {
  /** Whether activation was successful */
  success: boolean;
  /** License if activated */
  license?: License;
  /** Error message */
  error?: string;
  /** Validation details */
  details?: Record<string, unknown>;
}

/**
 * License validation result
 */
export interface LicenseValidationResult {
  /** Whether license is valid */
  valid: boolean;
  /** License status */
  status: LicenseStatus;
  /** Validation errors */
  errors: string[];
  /** Warnings */
  warnings: string[];
  /** Expiration info */
  expiresIn?: number; // days until expiration
  /** Grace period active */
  gracePeriod: boolean;
}

/**
 * License usage tracking
 */
export interface LicenseUsage {
  /** License ID */
  licenseId: string;
  /** Feature name */
  feature: string;
  /** Current usage */
  current: number;
  /** Limit (null = unlimited) */
  limit?: number;
  /** Usage percentage */
  percentage: number;
  /** Exceeds limit */
  exceeded: boolean;
  /** Last updated */
  updatedAt: Date;
}

/**
 * Site license configuration
 */
export interface SiteLicenseConfig {
  /** Site ID */
  siteId: string;
  /** Licenses for this site */
  licenses: License[];
  /** Aggregated entitlements */
  entitlements: LicenseEntitlement[];
  /** Total users across all licenses */
  totalUsers: number;
  /** Max users allowed */
  maxUsers?: number;
  /** Compliance status */
  compliant: boolean;
  /** License expiration dates */
  expirations: Date[];
}

/**
 * Audit log entry for license operations
 */
export interface LicenseAuditLogEntry {
  /** Timestamp */
  timestamp: Date;
  /** License ID */
  licenseId: string;
  /** Extension ID */
  extensionId: string;
  /** Action performed */
  action: 'ACTIVATED' | 'VALIDATED' | 'DEACTIVATED' | 'RENEWED' | 'SUSPENDED';
  /** User ID performing action */
  userId?: string;
  /** Status before action */
  statusBefore: LicenseStatus;
  /** Status after action */
  statusAfter: LicenseStatus;
  /** Details */
  details?: Record<string, unknown>;
}

/**
 * License manager interface
 */
export interface ILicenseManager {
  /** Activate a license */
  activate(request: LicenseActivationRequest): Promise<LicenseActivationResponse>;
  /** Deactivate a license */
  deactivate(licenseId: string): Promise<void>;
  /** Validate a license */
  validate(licenseId: string): Promise<LicenseValidationResult>;
  /** Get license */
  getLicense(licenseId: string): License | undefined;
  /** Get all licenses for extension */
  getExtensionLicenses(extensionId: string): License[];
  /** Get all licenses for site */
  getSiteLicenses(siteId: string): License[];
  /** Track feature usage */
  trackUsage(licenseId: string, feature: string, increment: number): Promise<void>;
  /** Get usage for feature */
  getUsage(licenseId: string, feature: string): LicenseUsage | undefined;
  /** Check entitlement */
  hasEntitlement(licenseId: string, entitlementName: string): boolean;
  /** Get site configuration */
  getSiteConfig(siteId: string): SiteLicenseConfig | undefined;
  /** Get audit logs */
  getAuditLogs(filters?: {
    licenseId?: string;
    extensionId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<LicenseAuditLogEntry[]>;
  /** Check multi-site compliance */
  checkMultiSiteCompliance(siteIds: string[]): Promise<boolean>;
}
