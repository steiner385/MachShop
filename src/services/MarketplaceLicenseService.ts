/**
 * Marketplace License Service
 * Manages template licenses, activation, and usage tracking
 * Issue #401 - Manufacturing Template Marketplace for Low-Code Platform
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';

/**
 * License Type
 */
export type LicenseType = 'free' | 'perpetual' | 'subscription' | 'trial' | 'enterprise';

/**
 * License Status
 */
export type LicenseStatus = 'active' | 'inactive' | 'expired' | 'suspended' | 'canceled';

/**
 * License
 */
export interface License {
  id: string;
  templateId: string;
  siteId: string;
  licenseType: LicenseType;
  licenseKey: string;
  status: LicenseStatus;
  activationDate: Date;
  expirationDate?: Date;
  maxConcurrentUsers?: number;
  maxTransactionsPerMonth?: number;
  currentUsage: {
    concurrentUsers: number;
    transactionsThisMonth: number;
  };
  autoRenewal?: boolean;
  purchaseDate: Date;
  paymentMethod?: string;
}

/**
 * License Purchase Order
 */
export interface LicensePurchaseOrder {
  id: string;
  orderId: string;
  templateId: string;
  siteId?: string;
  publisherId: string;
  licenseType: LicenseType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  purchaseDate: Date;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentDetails: {
    method: 'credit_card' | 'invoice' | 'bank_transfer';
    transactionId: string;
    approvalDate?: Date;
  };
  invoiceUrl?: string;
}

/**
 * License Usage Record
 */
export interface LicenseUsageRecord {
  id: string;
  licenseId: string;
  date: Date;
  concurrentUsers: number;
  transactionCount: number;
  usagePercentage: number; // 0-100
  warnings: string[];
}

/**
 * Marketplace License Service
 * Manages licensing, activation, and usage tracking
 */
export class MarketplaceLicenseService {
  private readonly prisma: PrismaClient;
  private readonly logger: Logger;

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Create license from purchase
   */
  async createLicenseFromPurchase(
    templateId: string,
    siteId: string,
    licenseType: LicenseType,
    publisherId: string,
    quantity: number = 1,
    durationMonths?: number
  ): Promise<License> {
    this.logger.info(
      `Creating license for template ${templateId} at site ${siteId}, type: ${licenseType}`
    );

    const licenseKey = this.generateLicenseKey();
    const activationDate = new Date();
    let expirationDate: Date | undefined;

    if (licenseType === 'subscription' && durationMonths) {
      expirationDate = new Date(activationDate);
      expirationDate.setMonth(expirationDate.getMonth() + durationMonths);
    } else if (licenseType === 'trial') {
      expirationDate = new Date(activationDate);
      expirationDate.setDate(expirationDate.getDate() + 30); // 30-day trial
    }

    const license: License = {
      id: `lic-${templateId}-${siteId}-${Date.now()}`,
      templateId,
      siteId,
      licenseType,
      licenseKey,
      status: 'active',
      activationDate,
      expirationDate,
      maxConcurrentUsers: licenseType === 'enterprise' ? 1000 : 100,
      maxTransactionsPerMonth: licenseType === 'enterprise' ? 1000000 : 100000,
      currentUsage: {
        concurrentUsers: 0,
        transactionsThisMonth: 0,
      },
      autoRenewal: licenseType === 'subscription',
      purchaseDate: new Date(),
    };

    this.logger.info(`License created: ${license.id} with key ${licenseKey}`);
    return license;
  }

  /**
   * Activate license with license key
   */
  async activateLicense(licenseKey: string): Promise<License> {
    this.logger.info(`Activating license with key: ${licenseKey.substring(0, 8)}...`);

    // Simulate license lookup and activation
    const license: License = {
      id: `lic-${Date.now()}`,
      templateId: 'template-wom',
      siteId: 'site-1',
      licenseType: 'subscription',
      licenseKey,
      status: 'active',
      activationDate: new Date(),
      expirationDate: new Date(Date.now() + 31536000000), // 1 year
      maxConcurrentUsers: 100,
      maxTransactionsPerMonth: 100000,
      currentUsage: {
        concurrentUsers: 0,
        transactionsThisMonth: 0,
      },
      autoRenewal: true,
      purchaseDate: new Date(),
    };

    this.logger.info(`License activated successfully: ${license.id}`);
    return license;
  }

  /**
   * Validate license
   */
  async validateLicense(licenseKey: string): Promise<{
    valid: boolean;
    license?: License;
    reason?: string;
  }> {
    this.logger.debug(`Validating license: ${licenseKey.substring(0, 8)}...`);

    // Simulate validation
    const isValid = licenseKey.length >= 32;

    if (!isValid) {
      return {
        valid: false,
        reason: 'Invalid license key format',
      };
    }

    const license: License = {
      id: `lic-${Date.now()}`,
      templateId: 'template-wom',
      siteId: 'site-1',
      licenseType: 'subscription',
      licenseKey,
      status: 'active',
      activationDate: new Date(Date.now() - 86400000),
      expirationDate: new Date(Date.now() + 31536000000),
      currentUsage: {
        concurrentUsers: 45,
        transactionsThisMonth: 45000,
      },
      autoRenewal: true,
      purchaseDate: new Date(Date.now() - 2592000000),
    };

    return {
      valid: true,
      license,
    };
  }

  /**
   * Check license usage
   */
  async checkLicenseUsage(licenseId: string): Promise<{
    withinLimits: boolean;
    usagePercentage: number;
    warnings: string[];
  }> {
    this.logger.info(`Checking usage for license ${licenseId}`);

    // Simulate usage check
    const concurrentUsers = Math.floor(Math.random() * 100);
    const transactionsThisMonth = Math.floor(Math.random() * 100000);
    const maxConcurrent = 100;
    const maxTransactions = 100000;

    const concurrentPercent = (concurrentUsers / maxConcurrent) * 100;
    const transactionPercent = (transactionsThisMonth / maxTransactions) * 100;
    const usagePercentage = Math.max(concurrentPercent, transactionPercent);

    const warnings: string[] = [];
    if (concurrentPercent > 80) {
      warnings.push(`Concurrent users at ${concurrentPercent.toFixed(1)}% of limit`);
    }
    if (transactionPercent > 90) {
      warnings.push(`Transactions at ${transactionPercent.toFixed(1)}% of monthly limit`);
    }

    return {
      withinLimits: usagePercentage <= 100,
      usagePercentage,
      warnings,
    };
  }

  /**
   * Record license usage
   */
  async recordUsage(
    licenseId: string,
    concurrentUsers: number,
    transactionCount: number
  ): Promise<LicenseUsageRecord> {
    this.logger.debug(`Recording usage for license ${licenseId}`);

    const usageRecord: LicenseUsageRecord = {
      id: `usage-${licenseId}-${Date.now()}`,
      licenseId,
      date: new Date(),
      concurrentUsers,
      transactionCount,
      usagePercentage: Math.random() * 100,
      warnings: [],
    };

    if (usageRecord.usagePercentage > 80) {
      usageRecord.warnings.push('High usage detected');
    }

    return usageRecord;
  }

  /**
   * Get license usage history
   */
  async getLicenseUsageHistory(
    licenseId: string,
    days: number = 30
  ): Promise<LicenseUsageRecord[]> {
    this.logger.info(`Retrieving usage history for license ${licenseId} (last ${days} days)`);

    const records: LicenseUsageRecord[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      records.push({
        id: `usage-${licenseId}-${date.getTime()}`,
        licenseId,
        date,
        concurrentUsers: Math.floor(Math.random() * 100),
        transactionCount: Math.floor(Math.random() * 5000),
        usagePercentage: Math.random() * 100,
        warnings: [],
      });
    }

    return records;
  }

  /**
   * Renew subscription license
   */
  async renewSubscriptionLicense(licenseId: string, durationMonths: number = 12): Promise<License> {
    this.logger.info(`Renewing subscription license ${licenseId} for ${durationMonths} months`);

    const renewalDate = new Date();
    const expirationDate = new Date(renewalDate);
    expirationDate.setMonth(expirationDate.getMonth() + durationMonths);

    const license: License = {
      id: licenseId,
      templateId: 'template-wom',
      siteId: 'site-1',
      licenseType: 'subscription',
      licenseKey: 'license-key-xyz',
      status: 'active',
      activationDate: new Date(Date.now() - 31536000000),
      expirationDate,
      maxConcurrentUsers: 100,
      maxTransactionsPerMonth: 100000,
      currentUsage: {
        concurrentUsers: 0,
        transactionsThisMonth: 0,
      },
      autoRenewal: true,
      purchaseDate: new Date(Date.now() - 31536000000),
    };

    this.logger.info(`License renewed until ${expirationDate.toISOString()}`);
    return license;
  }

  /**
   * Check for expiring licenses
   */
  async getExpiringLicenses(daysUntilExpiration: number = 30): Promise<License[]> {
    this.logger.info(`Checking for licenses expiring within ${daysUntilExpiration} days`);

    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + daysUntilExpiration);

    // Simulate query
    const licenses: License[] = [
      {
        id: 'lic-123',
        templateId: 'template-wom',
        siteId: 'site-1',
        licenseType: 'subscription',
        licenseKey: 'key-123',
        status: 'active',
        activationDate: new Date(Date.now() - 31536000000),
        expirationDate: new Date(Date.now() + 864000000), // 10 days
        autoRenewal: false,
        purchaseDate: new Date(Date.now() - 31536000000),
        currentUsage: {
          concurrentUsers: 50,
          transactionsThisMonth: 50000,
        },
      },
    ];

    return licenses;
  }

  /**
   * Suspend license
   */
  async suspendLicense(licenseId: string, reason: string): Promise<License> {
    this.logger.info(`Suspending license ${licenseId}: ${reason}`);

    const license: License = {
      id: licenseId,
      templateId: 'template-wom',
      siteId: 'site-1',
      licenseType: 'subscription',
      licenseKey: 'key-xyz',
      status: 'suspended',
      activationDate: new Date(Date.now() - 2592000000),
      expirationDate: new Date(Date.now() + 31536000000),
      currentUsage: {
        concurrentUsers: 0,
        transactionsThisMonth: 0,
      },
      autoRenewal: true,
      purchaseDate: new Date(Date.now() - 2592000000),
    };

    this.logger.warn(`License suspended: ${licenseId}`);
    return license;
  }

  /**
   * Resume suspended license
   */
  async resumeLicense(licenseId: string): Promise<License> {
    this.logger.info(`Resuming license ${licenseId}`);

    const license: License = {
      id: licenseId,
      templateId: 'template-wom',
      siteId: 'site-1',
      licenseType: 'subscription',
      licenseKey: 'key-xyz',
      status: 'active',
      activationDate: new Date(Date.now() - 2592000000),
      expirationDate: new Date(Date.now() + 31536000000),
      currentUsage: {
        concurrentUsers: 0,
        transactionsThisMonth: 0,
      },
      autoRenewal: true,
      purchaseDate: new Date(Date.now() - 2592000000),
    };

    this.logger.info(`License resumed: ${licenseId}`);
    return license;
  }

  /**
   * Cancel license
   */
  async cancelLicense(licenseId: string, reason: string): Promise<void> {
    this.logger.info(`Canceling license ${licenseId}: ${reason}`);

    // Simulate cancellation
    this.logger.info(`License canceled: ${licenseId}`);
  }

  /**
   * Get license purchase history
   */
  async getLicensePurchaseHistory(siteId: string): Promise<LicensePurchaseOrder[]> {
    this.logger.info(`Retrieving purchase history for site ${siteId}`);

    const orders: LicensePurchaseOrder[] = [
      {
        id: 'po-1',
        orderId: 'ORD-001',
        templateId: 'template-wom',
        siteId,
        publisherId: 'pub-internal',
        licenseType: 'subscription',
        quantity: 1,
        unitPrice: 500,
        totalPrice: 500,
        currency: 'USD',
        purchaseDate: new Date(Date.now() - 2592000000),
        status: 'paid',
        paymentDetails: {
          method: 'credit_card',
          transactionId: 'txn-123',
          approvalDate: new Date(Date.now() - 2592000000),
        },
        invoiceUrl: 'https://invoices.example.com/inv-001',
      },
    ];

    return orders;
  }

  /**
   * Generate license key
   */
  private generateLicenseKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  /**
   * Request license refund
   */
  async requestRefund(
    licenseId: string,
    reason: string,
    contactEmail: string
  ): Promise<{ refundId: string; status: string; estimatedDays: number }> {
    this.logger.info(`Refund requested for license ${licenseId}`);

    return {
      refundId: `refund-${Date.now()}`,
      status: 'submitted',
      estimatedDays: 5,
    };
  }

  /**
   * Get revenue report for publisher
   */
  async getPublisherRevenueReport(
    publisherId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRevenue: number;
    transactionCount: number;
    averageOrderValue: number;
    topTemplates: Array<{ templateId: string; revenue: number; salesCount: number }>;
  }> {
    this.logger.info(`Generating revenue report for publisher ${publisherId}`);

    return {
      totalRevenue: 45250.0,
      transactionCount: 92,
      averageOrderValue: 491.85,
      topTemplates: [
        { templateId: 'template-wom', revenue: 18500, salesCount: 37 },
        { templateId: 'template-ncm', revenue: 15750, salesCount: 21 },
        { templateId: 'template-dtc', revenue: 11000, salesCount: 34 },
      ],
    };
  }
}
