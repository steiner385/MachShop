/**
 * Extension License Management Module
 *
 * Comprehensive license management for extensions with:
 * - Multiple license types (perpetual, subscription, trial, enterprise)
 * - Activation and validation
 * - Usage tracking per feature
 * - Multi-site license management
 * - Entitlements and compliance tracking
 * - Audit logging
 */

export { LicenseManagerImpl, createLicenseManager } from './license-manager';

export type {
  License,
  LicenseActivationRequest,
  LicenseActivationResponse,
  LicenseValidationResult,
  LicenseUsage,
  LicenseEntitlement,
  SiteLicenseConfig,
  LicenseAuditLogEntry,
  ILicenseManager,
} from './types';

export { LicenseType, LicenseStatus } from './types';

/**
 * Initialize license management
 *
 * @example
 * ```typescript
 * import { createLicenseManager } from '@machshop/extension-sdk/licensing';
 *
 * const licenseManager = createLicenseManager();
 *
 * // Activate a license
 * const response = await licenseManager.activate({
 *   extensionId: 'my-extension',
 *   licenseKey: 'LICENSE-KEY-HERE',
 *   siteId: 'site-1',
 *   licensee: 'Company Inc'
 * });
 *
 * // Validate license
 * const validation = await licenseManager.validate(response.license.id);
 *
 * // Track usage
 * await licenseManager.trackUsage(response.license.id, 'advanced_features', 1);
 *
 * // Check entitlements
 * const hasPremium = licenseManager.hasEntitlement(response.license.id, 'premium_features');
 * ```
 */
