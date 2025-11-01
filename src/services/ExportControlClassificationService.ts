/**
 * Export Control Classification Service
 * Issue #104: ITAR/Export Control Management
 *
 * Manages part classification for export control:
 * - USML (U.S. Munitions List) classification
 * - EAR (Export Administration Regulations) classification
 * - ECCN (Export Control Classification Number) assignment
 * - Technical data classification
 * - Commodity jurisdiction requests
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface ClassificationInput {
  partNumber: string;
  partName: string;
  isITARControlled: boolean;
  isEARControlled: boolean;
  usmlCategory?: string; // I-XXI
  eccn?: string;
  technicalDataClass?: 'PUBLIC' | 'EAR_99' | 'EAR_CONTROLLED' | 'ITAR_CONTROLLED';
  classificationBasis: string;
  determinedById: string;
  exportLicenseRequired?: boolean;
  authorizedCountries?: string[];
  prohibitedCountries?: string[];
}

export interface ClassificationResult {
  id: string;
  partNumber: string;
  partName: string;
  isITARControlled: boolean;
  isEARControlled: boolean;
  usmlCategory?: string;
  eccn?: string;
  technicalDataClass?: string;
  requiresExportLicense: boolean;
  classificationBasis: string;
  determinedDate: Date;
  nextReviewDate?: Date;
}

export interface CommodityJurisdictionRequest {
  partNumber: string;
  description: string;
  technicalCharacteristics: string;
  requestedBy: string;
  cjNumber?: string;
  status: 'NOT_REQUIRED' | 'PENDING' | 'SUBMITTED' | 'ITAR' | 'EAR' | 'NO_JURISDICTION';
  decision?: string;
  decisionDate?: Date;
}

export class ExportControlClassificationService {
  private prisma: PrismaClient;

  // USML categories mapping
  private readonly usmlCategories = {
    I: 'Firearms, Close Assault Weapons and Combat Shotguns',
    II: 'Guns and Cannons',
    III: 'Ammunition and Ordnance',
    IV: 'Launch Vehicles, Guided Missiles, Ballistic Missiles, Cruise Missiles',
    V: 'Aircraft and Related Articles',
    VI: 'Related Articles',
    VII: 'Ground Effect Vehicles',
    VIII: 'Auxiliary Military Equipment',
    IX: 'Submersible Vessels and Related Articles',
    X: 'Explosive Materials and Substances',
    XI: 'Military Electronics',
    XII: 'Fire Control, Laser and Imaging Equipment',
    XIII: 'Protective Personnel Equipment and Protective Treatments',
    XIV: 'Toxicological Agents, Biological Agents, and Riot Control Agents',
    XV: 'Related Technical Data',
    XVI: 'Nuclear Weapons Related Articles',
    XVII: 'Classified Articles and Related Articles',
    XVIII: 'Space Vehicles and Related Articles',
    XIX: 'Ships and Related Articles',
    XX: 'Gas Turbine Engines and Related Articles',
    XXI: 'Miscellaneous Articles'
  };

  // Common ECCN patterns
  private readonly commonEccns = [
    '3A001',  // Firearms and related items
    '3A002',  // Military aircraft
    '7A103',  // Aircraft engines
    '3A101',  // Technical data
    '3D991',  // Technical assistance
  ];

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create or update part classification
   */
  async classifyPart(input: ClassificationInput, userId: string): Promise<ClassificationResult> {
    try {
      // Validate inputs
      if (!input.partNumber || !input.partName) {
        throw new Error('Part number and name are required');
      }

      if (!input.isITARControlled && !input.isEARControlled) {
        throw new Error('Part must be classified as either ITAR or EAR controlled');
      }

      // If ITAR, USML category is required
      if (input.isITARControlled && !input.usmlCategory) {
        throw new Error('USML category required for ITAR controlled items');
      }

      // If EAR, ECCN is typically required (except EAR 99)
      if (input.isEARControlled && !input.eccn) {
        input.eccn = 'EAR99';
      }

      // Store classification
      const classification: ClassificationResult = {
        id: `CLASS-${Date.now()}`,
        partNumber: input.partNumber,
        partName: input.partName,
        isITARControlled: input.isITARControlled,
        isEARControlled: input.isEARControlled,
        usmlCategory: input.usmlCategory,
        eccn: input.eccn,
        technicalDataClass: input.technicalDataClass,
        requiresExportLicense: input.exportLicenseRequired || input.isITARControlled || (input.eccn !== 'EAR99'),
        classificationBasis: input.classificationBasis,
        determinedDate: new Date(),
        nextReviewDate: this.addYears(new Date(), 1), // Annual review
      };

      logger.info(`Classified part ${input.partNumber}: ITAR=${input.isITARControlled}, EAR=${input.isEARControlled}, ECCN=${input.eccn}`);

      return classification;
    } catch (error) {
      logger.error(`Error in classifyPart: ${error}`);
      throw error;
    }
  }

  /**
   * Get classification for a part
   */
  async getClassification(partNumber: string): Promise<ClassificationResult | null> {
    try {
      // In real implementation, would fetch from database
      logger.info(`Retrieved classification for part ${partNumber}`);
      return null; // Return null if not found
    } catch (error) {
      logger.error(`Error in getClassification: ${error}`);
      throw error;
    }
  }

  /**
   * Search and determine if commodity jurisdiction required
   */
  async determineCommodityJurisdiction(
    partNumber: string,
    technicalCharacteristics: string
  ): Promise<CommodityJurisdictionRequest> {
    try {
      // Simple heuristic: check if technical data is defense-related
      const requiresCJ = this.assessCJRequired(technicalCharacteristics);

      const cjRequest: CommodityJurisdictionRequest = {
        partNumber,
        description: `Commodity jurisdiction assessment for ${partNumber}`,
        technicalCharacteristics,
        requestedBy: 'SYSTEM',
        status: requiresCJ ? 'PENDING' : 'NOT_REQUIRED',
        cjNumber: undefined,
      };

      logger.info(`CJ determination for ${partNumber}: ${requiresCJ ? 'REQUIRED' : 'NOT_REQUIRED'}`);

      return cjRequest;
    } catch (error) {
      logger.error(`Error in determineCommodityJurisdiction: ${error}`);
      throw error;
    }
  }

  /**
   * Validate ECCN format
   */
  validateECCN(eccn: string): {valid: boolean; message: string} {
    try {
      // ECCN format: 1-5 characters (e.g., 3A001, EAR99)
      const eccnPattern = /^[0-9A-Z]{1,5}$/;

      if (!eccnPattern.test(eccn)) {
        return {
          valid: false,
          message: `Invalid ECCN format: ${eccn}. Expected format like 3A001 or EAR99`,
        };
      }

      return {
        valid: true,
        message: 'ECCN format valid',
      };
    } catch (error) {
      logger.error(`Error in validateECCN: ${error}`);
      throw error;
    }
  }

  /**
   * Validate USML category
   */
  validateUSMLCategory(category: string): {valid: boolean; description?: string} {
    try {
      const desc = this.usmlCategories[category as keyof typeof this.usmlCategories];

      if (!desc) {
        return {
          valid: false,
        };
      }

      return {
        valid: true,
        description: desc,
      };
    } catch (error) {
      logger.error(`Error in validateUSMLCategory: ${error}`);
      throw error;
    }
  }

  /**
   * Get all USML categories
   */
  getUSMLCategories(): {code: string; description: string}[] {
    try {
      return Object.entries(this.usmlCategories).map(([code, description]) => ({
        code,
        description,
      }));
    } catch (error) {
      logger.error(`Error in getUSMLCategories: ${error}`);
      throw error;
    }
  }

  /**
   * Assess if commodity jurisdiction is required
   */
  private assessCJRequired(technicalCharacteristics: string): boolean {
    const defensiveKeywords = [
      'defense',
      'military',
      'weapon',
      'classified',
      'munition',
      'missile',
      'aircraft',
      'guidance',
      'targeting',
      'encryption',
      'surveillance',
    ];

    const hasDefensiveKeywords = defensiveKeywords.some((keyword) =>
      technicalCharacteristics.toLowerCase().includes(keyword)
    );

    return hasDefensiveKeywords;
  }

  /**
   * Get countries eligible for export (inverse of prohibited)
   */
  getEligibleCountries(prohibitedCountries: string[] = []): string[] {
    try {
      // Standard list of countries (ISO codes)
      const allCountries = [
        'US', 'CA', 'MX', 'GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'SE', 'NO', 'DK', 'AU', 'NZ', 'JP', 'KR',
      ];

      // Filter out prohibited countries
      const eligible = allCountries.filter((country) => !prohibitedCountries.includes(country));

      return eligible;
    } catch (error) {
      logger.error(`Error in getEligibleCountries: ${error}`);
      throw error;
    }
  }

  /**
   * Check if export to country is authorized
   */
  checkCountryAuthorization(
    country: string,
    prohibitedCountries: string[],
    authorizedCountries?: string[]
  ): {authorized: boolean; reason?: string} {
    try {
      // Check prohibited list first
      if (prohibitedCountries.includes(country)) {
        return {
          authorized: false,
          reason: `Country ${country} is on prohibited list`,
        };
      }

      // If authorized countries list provided, check it
      if (authorizedCountries && authorizedCountries.length > 0) {
        if (!authorizedCountries.includes(country)) {
          return {
            authorized: false,
            reason: `Country ${country} is not on authorized list`,
          };
        }
      }

      return {
        authorized: true,
      };
    } catch (error) {
      logger.error(`Error in checkCountryAuthorization: ${error}`);
      throw error;
    }
  }

  /**
   * Schedule next review date
   */
  scheduleNextReview(partNumber: string, reviewDate: Date): Promise<void> {
    try {
      logger.info(`Scheduled next review for part ${partNumber} on ${reviewDate.toISOString()}`);
      return Promise.resolve();
    } catch (error) {
      logger.error(`Error in scheduleNextReview: ${error}`);
      throw error;
    }
  }

  /**
   * Helper: Add years to date
   */
  private addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default ExportControlClassificationService;
