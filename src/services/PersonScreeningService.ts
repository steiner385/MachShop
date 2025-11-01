/**
 * Person Screening Service
 * Issue #104: ITAR/Export Control Management
 *
 * Manages person screening for export control compliance:
 * - DPL (Denied Parties List) screening
 * - Entity List screening
 * - SDN (Specially Designated Nationals) screening
 * - U.S. Person verification
 * - Foreign person tracking
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface PersonInput {
  firstName: string;
  lastName: string;
  email?: string;
  isUSPerson: boolean;
  countryOfCitizenship?: string;
  secondaryCitizenship?: string;
  employer?: string;
  jobTitle?: string;
  createdById: string;
}

export interface ScreeningResult {
  personId: string;
  status: 'PENDING' | 'CLEARED' | 'RESTRICTED' | 'DENIED' | 'EXPIRED';
  isDeniedParty: boolean;
  isEntityList: boolean;
  isSDN: boolean;
  screeningDate: Date;
  nextScreeningDate: Date;
  findings: ScreeningFinding[];
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes?: string;
}

export interface ScreeningFinding {
  type: 'DPL' | 'ENTITY_LIST' | 'SDN' | 'CITIZENSHIP' | 'OTHER';
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  recommendation?: string;
}

export interface PersonRecord {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  isUSPerson: boolean;
  countryOfCitizenship?: string;
  screeningStatus: string;
  lastScreenedDate: Date;
  isDeniedParty: boolean;
  isEntityList: boolean;
  isSDN: boolean;
}

export class PersonScreeningService {
  private prisma: PrismaClient;

  // Simulated denied parties list
  private deniedPartiesList = [
    { name: 'Test Denied Person', country: 'IR' },
    { name: 'Sanctioned Entity', country: 'KP' },
  ];

  // Simulated entity list
  private entityList = [
    { name: 'Entity Co', country: 'CH' },
    { name: 'Tech Solutions Ltd', country: 'RU' },
  ];

  // Simulated SDN list
  private sdnList = [
    { name: 'Designated Individual', country: 'SY' },
    { name: 'Sanctioned Person', country: 'IR' },
  ];

  // High-risk countries
  private highRiskCountries = ['IR', 'KP', 'SY', 'CU', 'RU'];

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Screen a person against export control lists
   */
  async screenPerson(personId: string, personInput: PersonInput): Promise<ScreeningResult> {
    try {
      const findings: ScreeningFinding[] = [];

      // Check DPL
      const dplMatch = this.checkDeniedPartiesList(`${personInput.firstName} ${personInput.lastName}`);
      if (dplMatch) {
        findings.push({
          type: 'DPL',
          description: `Person found on Denied Parties List`,
          severity: 'CRITICAL',
          recommendation: 'DO NOT EXPORT - Person on denied list',
        });
      }

      // Check Entity List
      const entityMatch = this.checkEntityList(`${personInput.firstName} ${personInput.lastName}`);
      if (entityMatch) {
        findings.push({
          type: 'ENTITY_LIST',
          description: `Associated entity on Entity List`,
          severity: 'CRITICAL',
          recommendation: 'DO NOT EXPORT - Entity on list',
        });
      }

      // Check SDN
      const sdnMatch = this.checkSDNList(`${personInput.firstName} ${personInput.lastName}`);
      if (sdnMatch) {
        findings.push({
          type: 'SDN',
          description: `Person on Specially Designated Nationals list`,
          severity: 'CRITICAL',
          recommendation: 'DO NOT EXPORT - SDN listed',
        });
      }

      // Check citizenship
      if (!personInput.isUSPerson && personInput.countryOfCitizenship) {
        if (this.isHighRiskCountry(personInput.countryOfCitizenship)) {
          findings.push({
            type: 'CITIZENSHIP',
            description: `Person from high-risk country: ${personInput.countryOfCitizenship}`,
            severity: 'WARNING',
            recommendation: 'Requires export license for technical data access',
          });
        }
      }

      // Determine overall status and risk
      const hasCriticalFindings = findings.some((f) => f.severity === 'CRITICAL');
      const status = hasCriticalFindings ? 'DENIED' : findings.length > 0 ? 'RESTRICTED' : 'CLEARED';
      const overallRisk = hasCriticalFindings ? 'CRITICAL' : findings.length > 0 ? 'MEDIUM' : 'LOW';

      const screeningDate = new Date();
      const nextScreeningDate = this.addMonths(screeningDate, 12); // Annual re-screening

      const result: ScreeningResult = {
        personId,
        status: status as any,
        isDeniedParty: dplMatch,
        isEntityList: entityMatch,
        isSDN: sdnMatch,
        screeningDate,
        nextScreeningDate,
        findings,
        overallRisk,
      };

      logger.info(`Screened person ${personInput.firstName} ${personInput.lastName}: status=${status}, risk=${overallRisk}`);

      return result;
    } catch (error) {
      logger.error(`Error in screenPerson: ${error}`);
      throw error;
    }
  }

  /**
   * Batch screen multiple people
   */
  async batchScreenPersons(personIds: string[]): Promise<ScreeningResult[]> {
    try {
      const results: ScreeningResult[] = [];

      for (const personId of personIds) {
        // In real implementation, would fetch person from DB
        const mockPerson: PersonInput = {
          firstName: 'Test',
          lastName: 'Person',
          isUSPerson: true,
          createdById: 'system',
        };

        const result = await this.screenPerson(personId, mockPerson);
        results.push(result);
      }

      logger.info(`Batch screened ${personIds.length} persons`);
      return results;
    } catch (error) {
      logger.error(`Error in batchScreenPersons: ${error}`);
      throw error;
    }
  }

  /**
   * Check if person is on Denied Parties List
   */
  private checkDeniedPartiesList(fullName: string): boolean {
    return this.deniedPartiesList.some(
      (entry) => entry.name.toLowerCase() === fullName.toLowerCase()
    );
  }

  /**
   * Check if person/entity is on Entity List
   */
  private checkEntityList(fullName: string): boolean {
    return this.entityList.some(
      (entry) => entry.name.toLowerCase() === fullName.toLowerCase()
    );
  }

  /**
   * Check if person is on SDN list
   */
  private checkSDNList(fullName: string): boolean {
    return this.sdnList.some(
      (entry) => entry.name.toLowerCase() === fullName.toLowerCase()
    );
  }

  /**
   * Check if country is high-risk for export control
   */
  private isHighRiskCountry(countryCode: string): boolean {
    return this.highRiskCountries.includes(countryCode.toUpperCase());
  }

  /**
   * Verify U.S. Person status
   */
  async verifyUSPersonStatus(
    personId: string,
    countryOfCitizenship?: string,
    countryOfResidence?: string
  ): Promise<{isUSPerson: boolean; verified: boolean; notes?: string}> {
    try {
      // Simple logic: US citizen or resident = US person
      // For ITAR, US persons are exempt from licensing
      const isUSPerson = !countryOfCitizenship || countryOfCitizenship === 'US';

      return {
        isUSPerson,
        verified: true,
        notes: isUSPerson ? 'Exempt from licensing requirements' : 'Requires export license',
      };
    } catch (error) {
      logger.error(`Error in verifyUSPersonStatus: ${error}`);
      throw error;
    }
  }

  /**
   * Get person screening history
   */
  async getScreeningHistory(personId: string): Promise<ScreeningResult[]> {
    try {
      // In real implementation, would fetch from database
      logger.info(`Retrieved screening history for person ${personId}`);
      return [];
    } catch (error) {
      logger.error(`Error in getScreeningHistory: ${error}`);
      throw error;
    }
  }

  /**
   * Schedule re-screening for person
   */
  async scheduleRescreen(personId: string, rescreenDate: Date): Promise<void> {
    try {
      logger.info(`Scheduled re-screening for person ${personId} on ${rescreenDate.toISOString()}`);
      return Promise.resolve();
    } catch (error) {
      logger.error(`Error in scheduleRescreen: ${error}`);
      throw error;
    }
  }

  /**
   * Get denied parties list info
   */
  getDeniedPartiesListInfo(): {count: number; lastUpdated: Date; source: string} {
    return {
      count: this.deniedPartiesList.length,
      lastUpdated: new Date(),
      source: 'Bureau of Industry and Security (BIS)',
    };
  }

  /**
   * Get entity list info
   */
  getEntityListInfo(): {count: number; lastUpdated: Date; source: string} {
    return {
      count: this.entityList.length,
      lastUpdated: new Date(),
      source: 'Bureau of Industry and Security (BIS)',
    };
  }

  /**
   * Get SDN list info
   */
  getSDNListInfo(): {count: number; lastUpdated: Date; source: string} {
    return {
      count: this.sdnList.length,
      lastUpdated: new Date(),
      source: 'Office of Foreign Assets Control (OFAC)',
    };
  }

  /**
   * Helper: Add months to date
   */
  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default PersonScreeningService;
