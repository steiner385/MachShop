/**
 * Test Cell Service
 * Issue #233: Test Cell Integration & Engine Acceptance Testing
 *
 * Manages test cell operations:
 * - Test cell creation and configuration
 * - Test cell scheduling and availability management
 * - DAQ system integration
 * - Test cell compliance and maintenance tracking
 * - Test cell status management
 */

import { PrismaClient, TestCell, TestCellStatus, DAQSystemType, TestCellSchedule } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CreateTestCellInput {
  siteId: string;
  cellName: string;
  cellIdentifier: string;
  testType: string;
  location: string;
  daqSystemType: DAQSystemType;
  daqSystemId?: string;
  daqApiEndpoint?: string;
  maxConcurrentTests?: number;
  estimatedTestDuration?: number;
  certificationNumber?: string;
  complianceNotes?: string;
}

export interface UpdateTestCellInput {
  cellName?: string;
  status?: TestCellStatus;
  testType?: string;
  location?: string;
  daqSystemType?: DAQSystemType;
  daqSystemId?: string;
  daqApiEndpoint?: string;
  maxConcurrentTests?: number;
  estimatedTestDuration?: number;
  certificationExpiry?: Date;
  isCompliant?: boolean;
  complianceNotes?: string;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  maintenanceIntervalDays?: number;
}

export interface ScheduleTestCellInput {
  testCellId: string;
  scheduledDate: Date;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  scheduleType: string; // AVAILABLE, MAINTENANCE, RESERVED
  notes?: string;
}

export interface TestCellResponse {
  id: string;
  siteId: string;
  cellName: string;
  cellIdentifier: string;
  status: TestCellStatus;
  testType: string;
  location: string;
  daqSystemType: string;
  daqStatus?: string;
  isCompliant: boolean;
  certificationExpiry?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class TestCellService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create a new test cell
   */
  async createTestCell(input: CreateTestCellInput): Promise<TestCellResponse> {
    try {
      // Validate required fields
      if (!input.siteId || !input.cellName || !input.cellIdentifier || !input.daqSystemType) {
        throw new Error('Missing required fields: siteId, cellName, cellIdentifier, daqSystemType');
      }

      // Check for duplicate cell identifier
      const existing = await this.prisma.testCell.findUnique({
        where: { cellIdentifier: input.cellIdentifier },
      });

      if (existing) {
        throw new Error(`Test cell with identifier "${input.cellIdentifier}" already exists`);
      }

      const testCell = await this.prisma.testCell.create({
        data: {
          siteId: input.siteId,
          cellName: input.cellName,
          cellIdentifier: input.cellIdentifier,
          testType: input.testType,
          location: input.location,
          daqSystemType: input.daqSystemType,
          daqSystemId: input.daqSystemId,
          daqApiEndpoint: input.daqApiEndpoint,
          maxConcurrentTests: input.maxConcurrentTests || 1,
          estimatedTestDuration: input.estimatedTestDuration,
          certificationNumber: input.certificationNumber,
          complianceNotes: input.complianceNotes,
          isActive: true,
        },
      });

      logger.info(`Created test cell: ${testCell.cellName} (${testCell.cellIdentifier})`);
      return this.mapToResponse(testCell);
    } catch (error) {
      logger.error(`Error in createTestCell: ${error}`);
      throw error;
    }
  }

  /**
   * Get test cell by ID
   */
  async getTestCell(testCellId: string): Promise<TestCellResponse | null> {
    try {
      const testCell = await this.prisma.testCell.findUnique({
        where: { id: testCellId },
      });

      if (!testCell) {
        logger.warn(`Test cell not found: ${testCellId}`);
        return null;
      }

      return this.mapToResponse(testCell);
    } catch (error) {
      logger.error(`Error in getTestCell: ${error}`);
      throw error;
    }
  }

  /**
   * Get all test cells for a site
   */
  async getSiteTestCells(siteId: string, activeOnly: boolean = true): Promise<TestCellResponse[]> {
    try {
      const testCells = await this.prisma.testCell.findMany({
        where: {
          siteId,
          ...(activeOnly && { isActive: true }),
        },
        orderBy: { cellName: 'asc' },
      });

      return testCells.map(tc => this.mapToResponse(tc));
    } catch (error) {
      logger.error(`Error in getSiteTestCells: ${error}`);
      throw error;
    }
  }

  /**
   * Update test cell
   */
  async updateTestCell(testCellId: string, input: UpdateTestCellInput): Promise<TestCellResponse> {
    try {
      const testCell = await this.prisma.testCell.update({
        where: { id: testCellId },
        data: {
          ...input,
          updatedAt: new Date(),
        },
      });

      logger.info(`Updated test cell: ${testCell.cellName}`);
      return this.mapToResponse(testCell);
    } catch (error) {
      logger.error(`Error in updateTestCell: ${error}`);
      throw error;
    }
  }

  /**
   * Set test cell status
   */
  async setTestCellStatus(testCellId: string, status: TestCellStatus): Promise<TestCellResponse> {
    try {
      const testCell = await this.prisma.testCell.update({
        where: { id: testCellId },
        data: {
          status,
          updatedAt: new Date(),
        },
      });

      logger.info(`Test cell ${testCell.cellName} status changed to: ${status}`);
      return this.mapToResponse(testCell);
    } catch (error) {
      logger.error(`Error in setTestCellStatus: ${error}`);
      throw error;
    }
  }

  /**
   * Deactivate test cell
   */
  async deactivateTestCell(testCellId: string): Promise<TestCellResponse> {
    try {
      const testCell = await this.prisma.testCell.update({
        where: { id: testCellId },
        data: {
          isActive: false,
          status: 'OUT_OF_SERVICE' as TestCellStatus,
          updatedAt: new Date(),
        },
      });

      logger.info(`Deactivated test cell: ${testCell.cellName}`);
      return this.mapToResponse(testCell);
    } catch (error) {
      logger.error(`Error in deactivateTestCell: ${error}`);
      throw error;
    }
  }

  /**
   * Record maintenance for test cell
   */
  async recordMaintenance(testCellId: string, maintenanceDate: Date, nextMaintenanceDate: Date, intervalDays: number): Promise<TestCellResponse> {
    try {
      const testCell = await this.prisma.testCell.update({
        where: { id: testCellId },
        data: {
          lastMaintenanceDate: maintenanceDate,
          nextMaintenanceDate: nextMaintenanceDate,
          maintenanceIntervalDays: intervalDays,
          status: 'OPERATIONAL' as TestCellStatus,
          updatedAt: new Date(),
        },
      });

      logger.info(`Recorded maintenance for test cell: ${testCell.cellName}`);
      return this.mapToResponse(testCell);
    } catch (error) {
      logger.error(`Error in recordMaintenance: ${error}`);
      throw error;
    }
  }

  /**
   * Schedule test cell availability
   */
  async scheduleTestCell(input: ScheduleTestCellInput): Promise<TestCellSchedule> {
    try {
      const schedule = await this.prisma.testCellSchedule.create({
        data: {
          testCellId: input.testCellId,
          scheduledDate: input.scheduledDate,
          startTime: input.startTime,
          endTime: input.endTime,
          scheduleType: input.scheduleType,
          notes: input.notes,
        },
      });

      logger.info(`Scheduled test cell: ${input.testCellId} for ${input.scheduledDate}`);
      return schedule;
    } catch (error) {
      logger.error(`Error in scheduleTestCell: ${error}`);
      throw error;
    }
  }

  /**
   * Get test cell schedule for a date range
   */
  async getSchedule(testCellId: string, startDate: Date, endDate: Date): Promise<TestCellSchedule[]> {
    try {
      const schedules = await this.prisma.testCellSchedule.findMany({
        where: {
          testCellId,
          scheduledDate: {
            gte: startDate,
            lte: endDate,
          },
          isActive: true,
        },
        orderBy: { scheduledDate: 'asc' },
      });

      return schedules;
    } catch (error) {
      logger.error(`Error in getSchedule: ${error}`);
      throw error;
    }
  }

  /**
   * Check test cell availability for a time slot
   */
  async isAvailable(testCellId: string, startDate: Date, endDate: Date): Promise<boolean> {
    try {
      const conflicting = await this.prisma.testCellSchedule.findFirst({
        where: {
          testCellId,
          scheduledDate: {
            gte: startDate,
            lte: endDate,
          },
          scheduleType: {
            in: ['MAINTENANCE', 'RESERVED'],
          },
          isActive: true,
        },
      });

      const testCell = await this.prisma.testCell.findUnique({
        where: { id: testCellId },
      });

      if (!testCell || testCell.status !== 'OPERATIONAL') {
        logger.warn(`Test cell ${testCellId} is not operational`);
        return false;
      }

      const isAvailable = !conflicting;
      logger.info(`Test cell ${testCellId} availability check: ${isAvailable}`);
      return isAvailable;
    } catch (error) {
      logger.error(`Error in isAvailable: ${error}`);
      throw error;
    }
  }

  /**
   * Update DAQ system status
   */
  async updateDAQStatus(testCellId: string, daqStatus: string): Promise<TestCellResponse> {
    try {
      const testCell = await this.prisma.testCell.update({
        where: { id: testCellId },
        data: {
          daqStatus,
          updatedAt: new Date(),
        },
      });

      logger.info(`Updated DAQ status for test cell ${testCell.cellName}: ${daqStatus}`);
      return this.mapToResponse(testCell);
    } catch (error) {
      logger.error(`Error in updateDAQStatus: ${error}`);
      throw error;
    }
  }

  /**
   * Get test cells by DAQ system type
   */
  async getTestCellsByDAQType(siteId: string, daqSystemType: DAQSystemType): Promise<TestCellResponse[]> {
    try {
      const testCells = await this.prisma.testCell.findMany({
        where: {
          siteId,
          daqSystemType,
          isActive: true,
        },
        orderBy: { cellName: 'asc' },
      });

      return testCells.map(tc => this.mapToResponse(tc));
    } catch (error) {
      logger.error(`Error in getTestCellsByDAQType: ${error}`);
      throw error;
    }
  }

  /**
   * Verify FAA AC 43-207 compliance
   */
  async verifyCompliance(testCellId: string): Promise<{ isCompliant: boolean; expiryDate?: Date; notes: string }> {
    try {
      const testCell = await this.prisma.testCell.findUnique({
        where: { id: testCellId },
      });

      if (!testCell) {
        throw new Error(`Test cell not found: ${testCellId}`);
      }

      const isCompliant = testCell.isCompliant &&
                         (!testCell.certificationExpiry || new Date() <= testCell.certificationExpiry);

      return {
        isCompliant,
        expiryDate: testCell.certificationExpiry || undefined,
        notes: testCell.complianceNotes || 'No compliance notes available',
      };
    } catch (error) {
      logger.error(`Error in verifyCompliance: ${error}`);
      throw error;
    }
  }

  /**
   * Helper method to map TestCell to response
   */
  private mapToResponse(testCell: TestCell): TestCellResponse {
    return {
      id: testCell.id,
      siteId: testCell.siteId,
      cellName: testCell.cellName,
      cellIdentifier: testCell.cellIdentifier,
      status: testCell.status,
      testType: testCell.testType,
      location: testCell.location,
      daqSystemType: testCell.daqSystemType,
      daqStatus: testCell.daqStatus || undefined,
      isCompliant: testCell.isCompliant,
      certificationExpiry: testCell.certificationExpiry || undefined,
      isActive: testCell.isActive,
      createdAt: testCell.createdAt,
      updatedAt: testCell.updatedAt,
    };
  }
}
