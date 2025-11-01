/**
 * License Manager
 *
 * Manages extension licenses, activation, validation, and usage tracking
 * across multiple sites.
 */

import { randomUUID } from 'crypto';
import type {
  License,
  LicenseActivationRequest,
  LicenseActivationResponse,
  LicenseValidationResult,
  LicenseUsage,
  LicenseStatus,
  SiteLicenseConfig,
  LicenseAuditLogEntry,
  LicenseEntitlement,
  ILicenseManager,
} from './types';
import { LicenseStatus, LicenseType } from './types';

/**
 * License Manager Implementation
 */
export class LicenseManagerImpl implements ILicenseManager {
  private licenses: Map<string, License> = new Map();
  private usageTracking: Map<string, Map<string, LicenseUsage>> = new Map();
  private auditLogs: LicenseAuditLogEntry[] = [];
  private siteConfigs: Map<string, SiteLicenseConfig> = new Map();

  /**
   * Activate a license
   */
  async activate(request: LicenseActivationRequest): Promise<LicenseActivationResponse> {
    try {
      // Validate license key format
      if (!this.isValidLicenseKey(request.licenseKey)) {
        return {
          success: false,
          error: 'Invalid license key format',
        };
      }

      // Check if already activated
      const existingLicense = Array.from(this.licenses.values()).find(
        (l) =>
          l.licenseKey === request.licenseKey &&
          l.extensionId === request.extensionId &&
          l.siteId === request.siteId
      );

      if (existingLicense) {
        return {
          success: false,
          error: 'License already activated for this extension and site',
          license: existingLicense,
        };
      }

      // Create and activate license
      const license: License = {
        id: randomUUID(),
        extensionId: request.extensionId,
        licenseKey: request.licenseKey,
        siteId: request.siteId,
        licensee: request.licensee,
        type: LicenseType.SUBSCRIPTION,
        status: LicenseStatus.ACTIVE,
        entitlements: this.getDefaultEntitlements(),
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        activatedAt: new Date(),
        activeUsers: 0,
        lastCheckAt: new Date(),
      };

      this.licenses.set(license.id, license);
      this.initializeUsageTracking(license.id);
      this.recordAuditLog({
        licenseId: license.id,
        extensionId: request.extensionId,
        action: 'ACTIVATED',
        statusBefore: LicenseStatus.INACTIVE,
        statusAfter: LicenseStatus.ACTIVE,
        timestamp: new Date(),
      });

      this.updateSiteConfig(request.siteId);

      return {
        success: true,
        license,
      };
    } catch (error) {
      return {
        success: false,
        error: `Activation failed: ${String(error)}`,
      };
    }
  }

  /**
   * Deactivate a license
   */
  async deactivate(licenseId: string): Promise<void> {
    const license = this.licenses.get(licenseId);
    if (!license) return;

    const oldStatus = license.status;
    license.status = LicenseStatus.INACTIVE;

    this.recordAuditLog({
      licenseId,
      extensionId: license.extensionId,
      action: 'DEACTIVATED',
      statusBefore: oldStatus,
      statusAfter: LicenseStatus.INACTIVE,
      timestamp: new Date(),
    });

    this.updateSiteConfig(license.siteId);
  }

  /**
   * Validate a license
   */
  async validate(licenseId: string): Promise<LicenseValidationResult> {
    const license = this.licenses.get(licenseId);
    if (!license) {
      return {
        valid: false,
        status: LicenseStatus.INACTIVE,
        errors: ['License not found'],
        warnings: [],
        gracePeriod: false,
      };
    }

    const now = new Date();
    const errors: string[] = [];
    const warnings: string[] = [];
    let status = license.status;

    // Check expiration
    if (license.expiresAt && now > license.expiresAt) {
      if (license.gracePeriod && license.gracePeriodEndsAt && now < license.gracePeriodEndsAt) {
        warnings.push('License in grace period');
      } else {
        status = LicenseStatus.EXPIRED;
        errors.push('License expired');
      }
    }

    // Check entitlements usage
    const usage = this.usageTracking.get(licenseId) || new Map();
    for (const [feature, usageData] of usage) {
      if (usageData.exceeded) {
        warnings.push(`Usage exceeded for feature: ${feature}`);
      }
    }

    license.lastCheckAt = new Date();

    const expiresIn = license.expiresAt
      ? Math.ceil((license.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    return {
      valid: errors.length === 0,
      status,
      errors,
      warnings,
      expiresIn: expiresIn && expiresIn > 0 ? expiresIn : undefined,
      gracePeriod: license.gracePeriod || false,
    };
  }

  /**
   * Get license
   */
  getLicense(licenseId: string): License | undefined {
    return this.licenses.get(licenseId);
  }

  /**
   * Get licenses for extension
   */
  getExtensionLicenses(extensionId: string): License[] {
    return Array.from(this.licenses.values()).filter((l) => l.extensionId === extensionId);
  }

  /**
   * Get licenses for site
   */
  getSiteLicenses(siteId: string): License[] {
    return Array.from(this.licenses.values()).filter((l) => l.siteId === siteId);
  }

  /**
   * Track feature usage
   */
  async trackUsage(licenseId: string, feature: string, increment: number): Promise<void> {
    const license = this.licenses.get(licenseId);
    if (!license) return;

    const usageMap = this.usageTracking.get(licenseId) || new Map();
    const entitlement = license.entitlements.find((e) => e.name === feature);

    if (!entitlement || !entitlement.included) {
      return;
    }

    const current = usageMap.get(feature) || {
      licenseId,
      feature,
      current: 0,
      limit: entitlement.limit,
      percentage: 0,
      exceeded: false,
      updatedAt: new Date(),
    };

    current.current += increment;
    current.updatedAt = new Date();

    if (current.limit) {
      current.percentage = (current.current / current.limit) * 100;
      current.exceeded = current.current > current.limit;
    } else {
      current.percentage = 0;
      current.exceeded = false;
    }

    usageMap.set(feature, current);
    this.usageTracking.set(licenseId, usageMap);
  }

  /**
   * Get usage for feature
   */
  getUsage(licenseId: string, feature: string): LicenseUsage | undefined {
    return this.usageTracking.get(licenseId)?.get(feature);
  }

  /**
   * Check entitlement
   */
  hasEntitlement(licenseId: string, entitlementName: string): boolean {
    const license = this.licenses.get(licenseId);
    if (!license) return false;

    return license.entitlements.some(
      (e) => e.name === entitlementName && e.included
    );
  }

  /**
   * Get site configuration
   */
  getSiteConfig(siteId: string): SiteLicenseConfig | undefined {
    return this.siteConfigs.get(siteId);
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filters?: {
    licenseId?: string;
    extensionId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<LicenseAuditLogEntry[]> {
    let logs = [...this.auditLogs];

    if (filters?.licenseId) {
      logs = logs.filter((l) => l.licenseId === filters.licenseId);
    }

    if (filters?.extensionId) {
      logs = logs.filter((l) => l.extensionId === filters.extensionId);
    }

    if (filters?.startDate) {
      logs = logs.filter((l) => l.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      logs = logs.filter((l) => l.timestamp <= filters.endDate!);
    }

    return logs;
  }

  /**
   * Check multi-site compliance
   */
  async checkMultiSiteCompliance(siteIds: string[]): Promise<boolean> {
    for (const siteId of siteIds) {
      const config = this.siteConfigs.get(siteId);
      if (!config || !config.compliant) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validate license key format
   */
  private isValidLicenseKey(licenseKey: string): boolean {
    return licenseKey && licenseKey.length >= 20;
  }

  /**
   * Get default entitlements
   */
  private getDefaultEntitlements(): LicenseEntitlement[] {
    return [
      { name: 'basic_features', included: true },
      { name: 'advanced_features', included: true, limit: 100 },
      { name: 'premium_features', included: false },
      { name: 'max_users', included: true, limit: 10 },
    ];
  }

  /**
   * Initialize usage tracking
   */
  private initializeUsageTracking(licenseId: string): void {
    const usageMap = new Map<string, LicenseUsage>();
    this.usageTracking.set(licenseId, usageMap);
  }

  /**
   * Record audit log
   */
  private recordAuditLog(entry: Omit<LicenseAuditLogEntry, 'timestamp'>): void {
    this.auditLogs.push({
      ...entry,
      timestamp: new Date(),
    });

    // Keep only recent logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000);
    }
  }

  /**
   * Update site configuration
   */
  private updateSiteConfig(siteId: string): void {
    const licenses = this.getSiteLicenses(siteId);
    const entitlements: LicenseEntitlement[] = [];
    let totalUsers = 0;
    const expirations: Date[] = [];

    for (const license of licenses) {
      if (license.status === LicenseStatus.ACTIVE) {
        for (const ent of license.entitlements) {
          const existing = entitlements.find((e) => e.name === ent.name);
          if (!existing) {
            entitlements.push(ent);
          }
        }
        totalUsers += license.activeUsers;
        if (license.expiresAt) {
          expirations.push(license.expiresAt);
        }
      }
    }

    const compliant = licenses.every((l) => l.status !== LicenseStatus.EXPIRED);

    this.siteConfigs.set(siteId, {
      siteId,
      licenses,
      entitlements,
      totalUsers,
      maxUsers: licenses.reduce((max, l) => (l.maxUsers && l.maxUsers > max ? l.maxUsers : max), 0) || undefined,
      compliant,
      expirations,
    });
  }
}

/**
 * Create license manager instance
 */
export function createLicenseManager(): ILicenseManager {
  return new LicenseManagerImpl();
}
