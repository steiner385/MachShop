/**
 * Test Cell Routes
 * Issue #233: Test Cell Integration & Engine Acceptance Testing
 *
 * API endpoints for test cell management:
 * - CRUD operations for test cells
 * - Test cell scheduling
 * - Test run creation and management
 * - Acceptance criteria evaluation
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TestCellService } from '../services/TestCellService';
import { TestRunService } from '../services/TestRunService';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();
const testCellService = new TestCellService(prisma);
const testRunService = new TestRunService(prisma);

// ============================================================================
// TEST CELL ENDPOINTS
// ============================================================================

/**
 * POST /api/test-cells
 * Create a new test cell
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const testCell = await testCellService.createTestCell(req.body);
    res.status(201).json({ success: true, data: testCell });
  } catch (error) {
    logger.error(`Error creating test cell: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/test-cells/:testCellId
 * Get test cell by ID
 */
router.get('/:testCellId', async (req: Request, res: Response) => {
  try {
    const testCell = await testCellService.getTestCell(req.params.testCellId);
    if (!testCell) {
      res.status(404).json({ success: false, error: 'Test cell not found' });
      return;
    }
    res.json({ success: true, data: testCell });
  } catch (error) {
    logger.error(`Error fetching test cell: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/test-cells/site/:siteId
 * Get all test cells for a site
 */
router.get('/site/:siteId', async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const testCells = await testCellService.getSiteTestCells(req.params.siteId, activeOnly);
    res.json({ success: true, data: testCells });
  } catch (error) {
    logger.error(`Error fetching site test cells: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * PATCH /api/test-cells/:testCellId
 * Update test cell
 */
router.patch('/:testCellId', async (req: Request, res: Response) => {
  try {
    const testCell = await testCellService.updateTestCell(req.params.testCellId, req.body);
    res.json({ success: true, data: testCell });
  } catch (error) {
    logger.error(`Error updating test cell: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * PATCH /api/test-cells/:testCellId/status
 * Set test cell status
 */
router.patch('/:testCellId/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required' });
      return;
    }
    const testCell = await testCellService.setTestCellStatus(req.params.testCellId, status);
    res.json({ success: true, data: testCell });
  } catch (error) {
    logger.error(`Error setting test cell status: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * DELETE /api/test-cells/:testCellId
 * Deactivate test cell
 */
router.delete('/:testCellId', async (req: Request, res: Response) => {
  try {
    const testCell = await testCellService.deactivateTestCell(req.params.testCellId);
    res.json({ success: true, data: testCell });
  } catch (error) {
    logger.error(`Error deactivating test cell: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/test-cells/:testCellId/maintenance
 * Record maintenance for test cell
 */
router.post('/:testCellId/maintenance', async (req: Request, res: Response) => {
  try {
    const { maintenanceDate, nextMaintenanceDate, intervalDays } = req.body;
    const testCell = await testCellService.recordMaintenance(
      req.params.testCellId,
      new Date(maintenanceDate),
      new Date(nextMaintenanceDate),
      intervalDays
    );
    res.json({ success: true, data: testCell });
  } catch (error) {
    logger.error(`Error recording maintenance: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/test-cells/:testCellId/schedule
 * Schedule test cell availability
 */
router.post('/:testCellId/schedule', async (req: Request, res: Response) => {
  try {
    const { scheduledDate, startTime, endTime, scheduleType, notes } = req.body;
    const schedule = await testCellService.scheduleTestCell({
      testCellId: req.params.testCellId,
      scheduledDate: new Date(scheduledDate),
      startTime,
      endTime,
      scheduleType,
      notes,
    });
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    logger.error(`Error scheduling test cell: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/test-cells/:testCellId/schedule
 * Get test cell schedule
 */
router.get('/:testCellId/schedule', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: 'startDate and endDate are required' });
      return;
    }
    const schedule = await testCellService.getSchedule(
      req.params.testCellId,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.json({ success: true, data: schedule });
  } catch (error) {
    logger.error(`Error fetching test cell schedule: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/test-cells/:testCellId/availability
 * Check test cell availability
 */
router.get('/:testCellId/availability', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: 'startDate and endDate are required' });
      return;
    }
    const available = await testCellService.isAvailable(
      req.params.testCellId,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.json({ success: true, data: { available } });
  } catch (error) {
    logger.error(`Error checking test cell availability: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * PATCH /api/test-cells/:testCellId/daq-status
 * Update DAQ system status
 */
router.patch('/:testCellId/daq-status', async (req: Request, res: Response) => {
  try {
    const { daqStatus } = req.body;
    if (!daqStatus) {
      res.status(400).json({ success: false, error: 'DAQ status is required' });
      return;
    }
    const testCell = await testCellService.updateDAQStatus(req.params.testCellId, daqStatus);
    res.json({ success: true, data: testCell });
  } catch (error) {
    logger.error(`Error updating DAQ status: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/test-cells/:testCellId/compliance
 * Verify FAA AC 43-207 compliance
 */
router.get('/:testCellId/compliance', async (req: Request, res: Response) => {
  try {
    const compliance = await testCellService.verifyCompliance(req.params.testCellId);
    res.json({ success: true, data: compliance });
  } catch (error) {
    logger.error(`Error verifying compliance: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================================================
// TEST RUN ENDPOINTS
// ============================================================================

/**
 * POST /api/test-cells/runs
 * Create a new test run
 */
router.post('/runs', async (req: Request, res: Response) => {
  try {
    const testRun = await testRunService.createTestRun(req.body);
    res.status(201).json({ success: true, data: testRun });
  } catch (error) {
    logger.error(`Error creating test run: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/test-cells/runs/:testRunId
 * Get test run by ID
 */
router.get('/runs/:testRunId', async (req: Request, res: Response) => {
  try {
    const testRun = await testRunService.getTestRun(req.params.testRunId);
    if (!testRun) {
      res.status(404).json({ success: false, error: 'Test run not found' });
      return;
    }
    res.json({ success: true, data: testRun });
  } catch (error) {
    logger.error(`Error fetching test run: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/test-cells/build/:buildRecordId/runs
 * Get test runs for a build record
 */
router.get('/build/:buildRecordId/runs', async (req: Request, res: Response) => {
  try {
    const testRuns = await testRunService.getBuildRecordTestRuns(req.params.buildRecordId);
    res.json({ success: true, data: testRuns });
  } catch (error) {
    logger.error(`Error fetching build test runs: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * PATCH /api/test-cells/runs/:testRunId
 * Update test run
 */
router.patch('/runs/:testRunId', async (req: Request, res: Response) => {
  try {
    const testRun = await testRunService.updateTestRun(req.params.testRunId, req.body);
    res.json({ success: true, data: testRun });
  } catch (error) {
    logger.error(`Error updating test run: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/test-cells/runs/:testRunId/start
 * Start a test run
 */
router.post('/runs/:testRunId/start', async (req: Request, res: Response) => {
  try {
    const testRun = await testRunService.startTestRun(req.params.testRunId, req.body.operatorId);
    res.json({ success: true, data: testRun });
  } catch (error) {
    logger.error(`Error starting test run: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/test-cells/runs/:testRunId/complete
 * Complete a test run
 */
router.post('/runs/:testRunId/complete', async (req: Request, res: Response) => {
  try {
    const { testPassed, qualityApprovedById } = req.body;
    if (testPassed === undefined) {
      res.status(400).json({ success: false, error: 'testPassed is required' });
      return;
    }
    const testRun = await testRunService.completeTestRun(req.params.testRunId, testPassed, qualityApprovedById);
    res.json({ success: true, data: testRun });
  } catch (error) {
    logger.error(`Error completing test run: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/test-cells/runs/:testRunId/measurements
 * Record measurement for test run
 */
router.post('/runs/:testRunId/measurements', async (req: Request, res: Response) => {
  try {
    const measurement = await testRunService.recordMeasurement({
      ...req.body,
      testRunId: req.params.testRunId,
    });
    res.status(201).json({ success: true, data: measurement });
  } catch (error) {
    logger.error(`Error recording measurement: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/test-cells/runs/:testRunId/measurements
 * Get measurements for test run
 */
router.get('/runs/:testRunId/measurements', async (req: Request, res: Response) => {
  try {
    const measurements = await testRunService.getTestMeasurements(req.params.testRunId);
    res.json({ success: true, data: measurements });
  } catch (error) {
    logger.error(`Error fetching measurements: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * POST /api/test-cells/runs/:testRunId/evaluate-criteria
 * Evaluate acceptance criteria
 */
router.post('/runs/:testRunId/evaluate-criteria', async (req: Request, res: Response) => {
  try {
    const result = await testRunService.evaluateAcceptanceCriteria({
      ...req.body,
      testRunId: req.params.testRunId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error(`Error evaluating criteria: ${error}`);
    res.status(400).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/test-cells/runs/:testRunId/criteria-status
 * Check if all acceptance criteria are met
 */
router.get('/runs/:testRunId/criteria-status', async (req: Request, res: Response) => {
  try {
    const allMet = await testRunService.checkAllCriteriaMet(req.params.testRunId);
    res.json({ success: true, data: { allCriteriaMet: allMet } });
  } catch (error) {
    logger.error(`Error checking criteria status: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * GET /api/test-cells/runs/:testRunId/status-history
 * Get test run status history
 */
router.get('/runs/:testRunId/status-history', async (req: Request, res: Response) => {
  try {
    const history = await testRunService.getStatusHistory(req.params.testRunId);
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error(`Error fetching status history: ${error}`);
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
