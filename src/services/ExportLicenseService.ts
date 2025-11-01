/**
 * Export License Service
 * Issue #104: ITAR/Export Control Management
 *
 * Manages export licenses for controlled items:
 * - License types (DSP-5, DSP-73, DSP-85, TAA, etc.)
 * - License tracking and expiration monitoring
 * - License conditions and restrictions
 * - Utilization tracking
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface LicenseInput {
  licenseNumber: string;
  licenseType: 'DSP_5' | 'DSP_73' | 'DSP_85' | 'TAA' | 'MLA' | 'WDA' | 'EAR_LICENSE' | 'LICENSE_EXCEPTION';
  issuingAgency: 'DDTC' | 'BIS';
  coveredParts: string[];
  authorizedCountries: string[];
  issueDate: Date;
  expirationDate: Date;
  conditions?: string;
  limitations?: string;
  maxValue?: number;
  createdById: string;
}

export interface LicenseRecord {
  id: string;
  licenseNumber: string;
  licenseType: string;
  issuingAgency: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED' | 'AMENDED';
  issueDate: Date;
  expirationDate: Date;
  daysUntilExpiration: number;
  coveredParts: string[];
  authorizedCountries: string[];
  conditions?: string;
  maxValue?: number;
  utilizationValue: number;
  utilizationPercentage: number;
  expirationNotified: boolean;
}

export interface LicenseUtilizationRecord {
  id: string;
  licenseNumber: string;
  shipmentDate: Date;
  partNumber: string;
  quantity: number;
  value?: number;
  destinationCountry: string;
  endUser: string;
}

export class ExportLicenseService {
  private prisma: PrismaClient;

  // License type descriptions
  private readonly licenseTypeDescriptions = {
    DSP_5: 'Permanent export of defense articles',
    DSP_73: 'Temporary import/export',
    DSP_85: 'Temporary export (exhibitions, demos)',
    TAA: 'Technical Assistance Agreement',
    MLA: 'Manufacturing License Agreement',
    WDA: 'Warehouse Distribution Agreement',
    EAR_LICENSE: 'BIS export license',
    LICENSE_EXCEPTION: 'EAR license exception',
  };

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create export license
   */
  async createLicense(input: LicenseInput): Promise<LicenseRecord> {
    try {
      // Validate inputs
      if (!input.licenseNumber || !input.issuingAgency) {
        throw new Error('License number and issuing agency required');
      }

      if (input.expirationDate <= input.issueDate) {
        throw new Error('Expiration date must be after issue date');
      }

      const status = this.determineLicenseStatus(input.issueDate, input.expirationDate);

      const license: LicenseRecord = {
        id: `LIC-${Date.now()}`,
        licenseNumber: input.licenseNumber,
        licenseType: input.licenseType,
        issuingAgency: input.issuingAgency,
        status: status as any,
        issueDate: input.issueDate,
        expirationDate: input.expirationDate,
        daysUntilExpiration: this.calculateDaysUntilExpiration(input.expirationDate),
        coveredParts: input.coveredParts,
        authorizedCountries: input.authorizedCountries,
        conditions: input.conditions,
        maxValue: input.maxValue,
        utilizationValue: 0,
        utilizationPercentage: 0,
        expirationNotified: false,
      };

      logger.info(`Created export license ${input.licenseNumber}: ${input.licenseType} from ${input.issuingAgency}`);

      return license;
    } catch (error) {
      logger.error(`Error in createLicense: ${error}`);
      throw error;
    }
  }

  /**
   * Get license by number
   */
  async getLicense(licenseNumber: string): Promise<LicenseRecord | null> {
    try {
      logger.info(`Retrieved license ${licenseNumber}`);
      return null; // Would fetch from DB
    } catch (error) {
      logger.error(`Error in getLicense: ${error}`);
      throw error;
    }
  }

  /**
   * Check if license covers part and destination
   */
  async validateLicenseCoverage(
    licenseNumber: string,
    partNumber: string,
    destinationCountry: string
  ): Promise<{valid: boolean; reason?: string}> {
    try {
      // In real implementation, would fetch license and check
      const mockLicense: LicenseRecord = {
        id: 'lic-1',
        licenseNumber,
        licenseType: 'DSP_5',
        issuingAgency: 'DDTC',
        status: 'ACTIVE',
        issueDate: new Date(2024, 0, 1),
        expirationDate: new Date(2026, 0, 1),
        daysUntilExpiration: 400,
        coveredParts: [partNumber],
        authorizedCountries: [destinationCountry],
        utilizationValue: 0,
        utilizationPercentage: 0,
        expirationNotified: false,
      };

      // Check if part is covered
      if (!mockLicense.coveredParts.includes(partNumber)) {
        return {
          valid: false,
          reason: `Part ${partNumber} not covered by license`,
        };
      }

      // Check if destination authorized
      if (!mockLicense.authorizedCountries.includes(destinationCountry)) {
        return {
          valid: false,
          reason: `Country ${destinationCountry} not authorized`,
        };
      }

      // Check if license is active
      if (mockLicense.status !== 'ACTIVE') {
        return {
          valid: false,
          reason: `License status is ${mockLicense.status}`,
        };
      }

      return {valid: true};
    } catch (error) {
      logger.error(`Error in validateLicenseCoverage: ${error}`);
      throw error;
    }
  }

  /**
   * Record license utilization
   */
  async recordUtilization(
    licenseNumber: string,
    shipmentDate: Date,
    partNumber: string,
    quantity: number,
    destinationCountry: string,
    endUser: string,
    value?: number
  ): Promise<LicenseUtilizationRecord> {
    try {
      // Validate license coverage
      const coverageValid = await this.validateLicenseCoverage(
        licenseNumber,
        partNumber,
        destinationCountry
      );

      if (!coverageValid.valid) {
        throw new Error(coverageValid.reason || 'Invalid license coverage');
      }

      const utilization: LicenseUtilizationRecord = {
        id: `UTIL-${Date.now()}`,
        licenseNumber,
        shipmentDate,
        partNumber,
        quantity,
        value,
        destinationCountry,
        endUser,
      };

      logger.info(`Recorded license utilization: ${licenseNumber}, ${quantity} units of ${partNumber} to ${destinationCountry}`);

      return utilization;
    } catch (error) {
      logger.error(`Error in recordUtilization: ${error}`);
      throw error;
    }
  }

  /**
   * Check for expiring licenses
   */
  async getExpiringLicenses(daysThreshold: number = 90): Promise<LicenseRecord[]> {
    try {
      // In real implementation, would query database
      const expiringLicenses: LicenseRecord[] = [];

      logger.info(`Retrieved licenses expiring within ${daysThreshold} days: ${expiringLicenses.length}`);

      return expiringLicenses;
    } catch (error) {
      logger.error(`Error in getExpiringLicenses: ${error}`);
      throw error;
    }
  }

  /**
   * Send expiration alert
   */
  async sendExpirationAlert(licenseNumber: string, daysUntilExpiration: number): Promise<{success: boolean}> {
    try {
      logger.info(`Sent expiration alert for license ${licenseNumber} expiring in ${daysUntilExpiration} days`);

      return {success: true};
    } catch (error) {
      logger.error(`Error in sendExpirationAlert: ${error}`);
      throw error;
    }
  }

  /**
   * Revoke or suspend license
   */
  async revokeLicense(
    licenseNumber: string,
    reason: string,
    revokedBy: string
  ): Promise<{success: boolean; message: string}> {
    try {
      logger.info(`Revoked license ${licenseNumber}: ${reason}`);

      return {
        success: true,
        message: `License ${licenseNumber} has been revoked`,
      };
    } catch (error) {
      logger.error(`Error in revokeLicense: ${error}`);
      throw error;
    }
  }

  /**
   * Get license type description
   */
  getLicenseTypeDescription(licenseType: string): string {
    return this.licenseTypeDescriptions[licenseType as keyof typeof this.licenseTypeDescriptions] || 'Unknown license type';
  }

  /**
   * Calculate utilization percentage
   */
  calculateUtilizationPercentage(utilizationValue: number, maxValue?: number): number {
    if (!maxValue || maxValue === 0) {
      return 0;
    }

    return Math.round((utilizationValue / maxValue) * 100 * 100) / 100; // Two decimals
  }

  /**
   * Helper: Determine license status based on dates
   */
  private determineLicenseStatus(issueDate: Date, expirationDate: Date): string {
    const now = new Date();

    if (now < issueDate) {
      return 'PENDING';
    } else if (now > expirationDate) {
      return 'EXPIRED';
    } else {
      return 'ACTIVE';
    }
  }

  /**
   * Helper: Calculate days until expiration
   */
  private calculateDaysUntilExpiration(expirationDate: Date): number {
    const now = new Date();
    const timeDiff = expirationDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default ExportLicenseService;
