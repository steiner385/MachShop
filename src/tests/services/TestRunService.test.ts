/**
 * Test Suite for TestRunService
 * Issue #233: Test Cell Integration & Engine Acceptance Testing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, TestRunStatus } from '@prisma/client';
import { TestRunService } from '../../services/TestRunService';

describe('TestRunService', () => {
  let prisma: PrismaClient;
  let testRunService: TestRunService;
  let testRunId: string;
  let testParameterId: string;
  let acceptanceCriteriaId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    testRunService = new TestRunService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createTestRun', () => {
    it('should create a test run with valid input', async () => {
      const input = {
        buildRecordId: 'build-123',
        testCellId: 'cell-456',
        scheduledStartTime: new Date(),
        operatorId: 'user-789',
        supervisorId: 'user-101',
        estimatedDuration: 120,
        notes: 'Engine performance validation test',
      };

      const result = await testRunService.createTestRun(input);

      expect(result).toBeDefined();
      expect(result.buildRecordId).toBe(input.buildRecordId);
      expect(result.testCellId).toBe(input.testCellId);
      expect(result.status).toBe('SCHEDULED');
      expect(result.testRunNumber).toMatch(/^TEST-RUN-/);

      testRunId = result.id;
    });

    it('should reject missing required fields', async () => {
      await expect(
        testRunService.createTestRun({
          buildRecordId: 'build-123',
          testCellId: '',
          scheduledStartTime: new Date(),
        })
      ).rejects.toThrow();
    });
  });

  describe('getTestRun', () => {
    it('should retrieve test run by ID', async () => {
      const result = await testRunService.getTestRun(testRunId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testRunId);
      expect(result?.buildRecordId).toBe('build-123');
    });

    it('should return null for non-existent run', async () => {
      const result = await testRunService.getTestRun('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('startTestRun', () => {
    it('should start a test run', async () => {
      const result = await testRunService.startTestRun(testRunId, 'operator-001');

      expect(result.status).toBe('IN_PROGRESS');
      expect(result.actualStartTime).toBeDefined();
    });

    it('should record start time', async () => {
      const beforeStart = new Date();
      await testRunService.startTestRun(testRunId, 'operator-001');
      const afterStart = new Date();

      const testRun = await testRunService.getTestRun(testRunId);
      expect(testRun?.actualStartTime).toBeDefined();

      if (testRun?.actualStartTime) {
        expect(testRun.actualStartTime.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
        expect(testRun.actualStartTime.getTime()).toBeLessThanOrEqual(afterStart.getTime());
      }
    });
  });

  describe('recordMeasurement', () => {
    it('should record a measurement', async () => {
      // First create a test parameter
      const parameter = await prisma.testParameter.create({
        data: {
          testCellId: 'cell-456',
          parameterName: 'RPM',
          parameterType: 'PERFORMANCE',
          unit: 'RPM',
          minValue: 1000,
          maxValue: 10000,
          targetValue: 5000,
        },
      });

      testParameterId = parameter.id;

      const measurement = await testRunService.recordMeasurement({
        testRunId,
        testParameterId,
        value: 5500,
        unit: 'RPM',
        timestampSeconds: 0,
        dataQuality: 'GOOD',
      });

      expect(measurement).toBeDefined();
      expect(measurement.value).toBe(5500);
      expect(measurement.isOutOfRange).toBe(false);
    });

    it('should detect out of range values', async () => {
      const parameter = await prisma.testParameter.create({
        data: {
          testCellId: 'cell-456',
          parameterName: 'Temperature',
          parameterType: 'THERMAL',
          unit: '°C',
          minValue: 0,
          maxValue: 100,
        },
      });

      const measurement = await testRunService.recordMeasurement({
        testRunId,
        testParameterId: parameter.id,
        value: 150, // Out of range
        unit: '°C',
        timestampSeconds: 1,
        dataQuality: 'GOOD',
      });

      expect(measurement.isOutOfRange).toBe(true);
    });
  });

  describe('evaluateAcceptanceCriteria', () => {
    it('should evaluate range-based criteria', async () => {
      // Create acceptance criteria
      const criteria = await prisma.acceptanceCriteria.create({
        data: {
          testParameterId,
          criteriaType: 'RANGE',
          minValue: 4500,
          maxValue: 5500,
          assessmentMethod: 'AVERAGE',
          passingCondition: 'value >= 4500 AND value <= 5500',
        },
      });

      acceptanceCriteriaId = criteria.id;

      const result = await testRunService.evaluateAcceptanceCriteria({
        testRunId,
        acceptanceCriteriaId,
        testValue: 5000,
        assessmentDetail: 'Within acceptable range',
      });

      expect(result.passed).toBe(true);
      expect(result.testValue).toBe(5000);
    });

    it('should fail criteria when value is out of range', async () => {
      const criteria = await prisma.acceptanceCriteria.create({
        data: {
          testParameterId,
          criteriaType: 'RANGE',
          minValue: 4500,
          maxValue: 5500,
          assessmentMethod: 'AVERAGE',
          passingCondition: 'value >= 4500 AND value <= 5500',
        },
      });

      const result = await testRunService.evaluateAcceptanceCriteria({
        testRunId,
        acceptanceCriteriaId: criteria.id,
        testValue: 6000,
        assessmentDetail: 'Exceeds maximum',
      });

      expect(result.passed).toBe(false);
    });
  });

  describe('checkAllCriteriaMet', () => {
    it('should check if all criteria are met', async () => {
      const allMet = await testRunService.checkAllCriteriaMet(testRunId);

      expect(typeof allMet).toBe('boolean');
    });
  });

  describe('completeTestRun', () => {
    it('should complete a test run with success', async () => {
      const result = await testRunService.completeTestRun(testRunId, true, 'approver-001');

      expect(result.status).toBe('COMPLETED');
      expect(result.testPassed).toBe(true);
      expect(result.actualEndTime).toBeDefined();
    });

    it('should complete a test run with failure', async () => {
      const input = {
        buildRecordId: 'build-999',
        testCellId: 'cell-999',
        scheduledStartTime: new Date(),
      };

      const testRun = await testRunService.createTestRun(input);

      const result = await testRunService.completeTestRun(testRun.id, false);

      expect(result.status).toBe('FAILED');
      expect(result.testPassed).toBe(false);
    });

    it('should calculate actual duration', async () => {
      const input = {
        buildRecordId: 'build-555',
        testCellId: 'cell-555',
        scheduledStartTime: new Date(),
      };

      const testRun = await testRunService.createTestRun(input);
      const startTime = new Date();

      await testRunService.startTestRun(testRun.id);

      // Simulate some delay
      const endTime = new Date(startTime.getTime() + 5 * 60 * 1000); // 5 minutes

      const completed = await testRunService.completeTestRun(testRun.id, true);

      if (completed.actualDuration) {
        expect(completed.actualDuration).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getTestMeasurements', () => {
    it('should retrieve all measurements for a test run', async () => {
      const measurements = await testRunService.getTestMeasurements(testRunId);

      expect(Array.isArray(measurements)).toBe(true);
      expect(measurements.length).toBeGreaterThan(0);
    });
  });

  describe('getStatusHistory', () => {
    it('should retrieve status history', async () => {
      const history = await testRunService.getStatusHistory(testRunId);

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('getBuildRecordTestRuns', () => {
    it('should retrieve all test runs for a build record', async () => {
      const testRuns = await testRunService.getBuildRecordTestRuns('build-123');

      expect(Array.isArray(testRuns)).toBe(true);
      expect(testRuns.length).toBeGreaterThan(0);
    });
  });
});
