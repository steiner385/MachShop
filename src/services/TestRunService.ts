/**
 * Test Run Service
 * Issue #233: Test Cell Integration & Engine Acceptance Testing
 *
 * Manages test execution operations:
 * - Test run creation and scheduling
 * - Test data collection and processing
 * - Acceptance criteria evaluation
 * - Test result determination
 * - FAA AC 43-207 compliance tracking
 */

import {
  PrismaClient,
  TestRun,
  TestRunStatus,
  TestMeasurement,
  TestRunAcceptanceCriteria,
  AcceptanceCriteria,
} from '@prisma/client';
import { logger } from '../utils/logger';

export interface CreateTestRunInput {
  buildRecordId: string;
  testCellId: string;
  scheduledStartTime: Date;
  operatorId?: string;
  supervisorId?: string;
  estimatedDuration?: number;
  notes?: string;
}

export interface UpdateTestRunInput {
  status?: TestRunStatus;
  actualStartTime?: Date;
  actualEndTime?: Date;
  testData?: Record<string, unknown>;
  dataCollectionStatus?: string;
  daqFileReference?: string;
  testPassed?: boolean;
  testCompletedSuccessfully?: boolean;
  hasAnomolies?: boolean;
  anomolyNotes?: string;
  failureReason?: string;
  failureCode?: string;
  notes?: string;
}

export interface RecordMeasurementInput {
  testRunId: string;
  testParameterId: string;
  value: number;
  unit: string;
  timestampSeconds: number;
  dataQuality?: 'GOOD' | 'QUESTIONABLE' | 'REJECTED';
}

export interface EvaluateAcceptanceCriteriaInput {
  testRunId: string;
  acceptanceCriteriaId: string;
  testValue: number;
  assessmentDetail?: string;
}

export interface TestRunResponse {
  id: string;
  testRunNumber: string;
  buildRecordId: string;
  testCellId: string;
  status: TestRunStatus;
  scheduledStartTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  actualDuration?: number;
  testPassed?: boolean;
  allCriteriaMet?: boolean;
  faaCompliant: boolean;
  testCertificateGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class TestRunService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create a new test run
   */
  async createTestRun(input: CreateTestRunInput): Promise<TestRunResponse> {
    try {
      // Validate required fields
      if (!input.buildRecordId || !input.testCellId || !input.scheduledStartTime) {
        throw new Error('Missing required fields: buildRecordId, testCellId, scheduledStartTime');
      }

      // Generate unique test run number
      const timestamp = Date.now();
      const testRunNumber = `TEST-RUN-${timestamp}`;

      const testRun = await this.prisma.testRun.create({
        data: {
          testRunNumber,
          buildRecordId: input.buildRecordId,
          testCellId: input.testCellId,
          scheduledStartTime: input.scheduledStartTime,
          operatorId: input.operatorId,
          supervisorId: input.supervisorId,
          estimatedDuration: input.estimatedDuration,
          notes: input.notes,
          status: 'SCHEDULED' as TestRunStatus,
        },
      });

      logger.info(`Created test run: ${testRunNumber} for build record: ${input.buildRecordId}`);
      return this.mapToResponse(testRun);
    } catch (error) {
      logger.error(`Error in createTestRun: ${error}`);
      throw error;
    }
  }

  /**
   * Get test run by ID
   */
  async getTestRun(testRunId: string): Promise<TestRunResponse | null> {
    try {
      const testRun = await this.prisma.testRun.findUnique({
        where: { id: testRunId },
      });

      if (!testRun) {
        logger.warn(`Test run not found: ${testRunId}`);
        return null;
      }

      return this.mapToResponse(testRun);
    } catch (error) {
      logger.error(`Error in getTestRun: ${error}`);
      throw error;
    }
  }

  /**
   * Get test runs for a build record
   */
  async getBuildRecordTestRuns(buildRecordId: string): Promise<TestRunResponse[]> {
    try {
      const testRuns = await this.prisma.testRun.findMany({
        where: { buildRecordId },
        orderBy: { createdAt: 'desc' },
      });

      return testRuns.map(tr => this.mapToResponse(tr));
    } catch (error) {
      logger.error(`Error in getBuildRecordTestRuns: ${error}`);
      throw error;
    }
  }

  /**
   * Update test run
   */
  async updateTestRun(testRunId: string, input: UpdateTestRunInput): Promise<TestRunResponse> {
    try {
      // Calculate duration if both times are set
      let actualDuration: number | undefined;
      if (input.actualStartTime && input.actualEndTime) {
        actualDuration = Math.round(
          (input.actualEndTime.getTime() - input.actualStartTime.getTime()) / 60000
        ); // in minutes
      }

      const testRun = await this.prisma.testRun.update({
        where: { id: testRunId },
        data: {
          ...input,
          actualDuration,
          updatedAt: new Date(),
        },
      });

      logger.info(`Updated test run: ${testRun.testRunNumber}`);
      return this.mapToResponse(testRun);
    } catch (error) {
      logger.error(`Error in updateTestRun: ${error}`);
      throw error;
    }
  }

  /**
   * Start a test run
   */
  async startTestRun(testRunId: string, operatorId?: string): Promise<TestRunResponse> {
    try {
      const testRun = await this.prisma.testRun.update({
        where: { id: testRunId },
        data: {
          status: 'IN_PROGRESS' as TestRunStatus,
          actualStartTime: new Date(),
          operatorId: operatorId,
          updatedAt: new Date(),
        },
      });

      logger.info(`Started test run: ${testRun.testRunNumber}`);
      return this.mapToResponse(testRun);
    } catch (error) {
      logger.error(`Error in startTestRun: ${error}`);
      throw error;
    }
  }

  /**
   * Complete a test run
   */
  async completeTestRun(testRunId: string, testPassed: boolean, qualityApprovedById?: string): Promise<TestRunResponse> {
    try {
      const testRun = await this.prisma.testRun.update({
        where: { id: testRunId },
        data: {
          status: testPassed ? 'COMPLETED' as TestRunStatus : 'FAILED' as TestRunStatus,
          actualEndTime: new Date(),
          testPassed,
          testCompletedSuccessfully: !testPassed ? false : undefined,
          qualityApprovedById,
          updatedAt: new Date(),
        },
      });

      logger.info(`Completed test run: ${testRun.testRunNumber} - Result: ${testPassed ? 'PASSED' : 'FAILED'}`);
      return this.mapToResponse(testRun);
    } catch (error) {
      logger.error(`Error in completeTestRun: ${error}`);
      throw error;
    }
  }

  /**
   * Record a measurement for a test
   */
  async recordMeasurement(input: RecordMeasurementInput): Promise<TestMeasurement> {
    try {
      // Get test parameter to check ranges
      const param = await this.prisma.testParameter.findUnique({
        where: { id: input.testParameterId },
      });

      if (!param) {
        throw new Error(`Test parameter not found: ${input.testParameterId}`);
      }

      const isOutOfRange = (param.minValue && input.value < param.minValue) ||
                          (param.maxValue && input.value > param.maxValue);

      const measurement = await this.prisma.testMeasurement.create({
        data: {
          testRunId: input.testRunId,
          testParameterId: input.testParameterId,
          value: input.value,
          unit: input.unit,
          timestampSeconds: input.timestampSeconds,
          recordedAt: new Date(),
          isOutOfRange,
          dataQuality: input.dataQuality || 'GOOD',
        },
      });

      if (isOutOfRange) {
        logger.warn(`Out of range measurement recorded for parameter ${input.testParameterId}: ${input.value}`);
      }

      return measurement;
    } catch (error) {
      logger.error(`Error in recordMeasurement: ${error}`);
      throw error;
    }
  }

  /**
   * Get measurements for a test run
   */
  async getTestMeasurements(testRunId: string): Promise<TestMeasurement[]> {
    try {
      const measurements = await this.prisma.testMeasurement.findMany({
        where: { testRunId },
        orderBy: { recordedAt: 'asc' },
      });

      return measurements;
    } catch (error) {
      logger.error(`Error in getTestMeasurements: ${error}`);
      throw error;
    }
  }

  /**
   * Evaluate acceptance criteria for a measurement
   */
  async evaluateAcceptanceCriteria(input: EvaluateAcceptanceCriteriaInput): Promise<TestRunAcceptanceCriteria> {
    try {
      const criteria = await this.prisma.acceptanceCriteria.findUnique({
        where: { id: input.acceptanceCriteriaId },
      });

      if (!criteria) {
        throw new Error(`Acceptance criteria not found: ${input.acceptanceCriteriaId}`);
      }

      // Evaluate based on criteria type
      let passed = false;

      switch (criteria.criteriaType) {
        case 'EXACT_MATCH':
          passed = input.testValue === criteria.targetValue;
          break;
        case 'RANGE':
          passed = (criteria.minValue === null || input.testValue >= criteria.minValue) &&
                  (criteria.maxValue === null || input.testValue <= criteria.maxValue);
          break;
        case 'THRESHOLD':
          passed = input.testValue >= (criteria.minValue || 0);
          break;
        default:
          passed = true; // Custom logic handled in custom implementation
      }

      const result = await this.prisma.testRunAcceptanceCriteria.create({
        data: {
          testRunId: input.testRunId,
          acceptanceCriteriaId: input.acceptanceCriteriaId,
          criteria: criteria.description || 'Acceptance Criteria',
          testValue: input.testValue,
          minRequired: criteria.minValue ? Number(criteria.minValue) : undefined,
          maxRequired: criteria.maxValue ? Number(criteria.maxValue) : undefined,
          passed,
          assessmentDetail: input.assessmentDetail,
        },
      });

      logger.info(`Evaluated criteria for test run ${input.testRunId}: ${passed ? 'PASSED' : 'FAILED'}`);
      return result;
    } catch (error) {
      logger.error(`Error in evaluateAcceptanceCriteria: ${error}`);
      throw error;
    }
  }

  /**
   * Check if all acceptance criteria are met
   */
  async checkAllCriteriaMet(testRunId: string): Promise<boolean> {
    try {
      const results = await this.prisma.testRunAcceptanceCriteria.findMany({
        where: { testRunId },
      });

      if (results.length === 0) {
        logger.warn(`No acceptance criteria found for test run ${testRunId}`);
        return false;
      }

      const allMet = results.every(r => r.passed === true);

      if (allMet) {
        // Update test run to reflect all criteria met
        await this.prisma.testRun.update({
          where: { id: testRunId },
          data: { allCriteriaMet: true },
        });
      }

      logger.info(`All criteria met check for test run ${testRunId}: ${allMet}`);
      return allMet;
    } catch (error) {
      logger.error(`Error in checkAllCriteriaMet: ${error}`);
      throw error;
    }
  }

  /**
   * Get test run status history
   */
  async getStatusHistory(testRunId: string) {
    try {
      const history = await this.prisma.testRunStatusHistory.findMany({
        where: { testRunId },
        orderBy: { changedAt: 'asc' },
      });

      return history;
    } catch (error) {
      logger.error(`Error in getStatusHistory: ${error}`);
      throw error;
    }
  }

  /**
   * Helper method to map TestRun to response
   */
  private mapToResponse(testRun: TestRun): TestRunResponse {
    const actualDuration = testRun.actualStartTime && testRun.actualEndTime
      ? Math.round((testRun.actualEndTime.getTime() - testRun.actualStartTime.getTime()) / 60000)
      : testRun.actualDuration || undefined;

    return {
      id: testRun.id,
      testRunNumber: testRun.testRunNumber,
      buildRecordId: testRun.buildRecordId,
      testCellId: testRun.testCellId,
      status: testRun.status,
      scheduledStartTime: testRun.scheduledStartTime,
      actualStartTime: testRun.actualStartTime || undefined,
      actualEndTime: testRun.actualEndTime || undefined,
      actualDuration,
      testPassed: testRun.testPassed || undefined,
      allCriteriaMet: testRun.allCriteriaMet || undefined,
      faaCompliant: testRun.faaCompliant,
      testCertificateGenerated: testRun.testCertificateGenerated,
      createdAt: testRun.createdAt,
      updatedAt: testRun.updatedAt,
    };
  }
}
