/**
 * Oracle EBS Surrogate - Test Data Routes
 * REST API endpoints for test data generation and error scenario simulation
 */

import express, { Router, Request, Response } from 'express';
import { TestDataService, TestDataScenario, ScenarioResult } from '../services/test-data.service';
import { Logger } from '../utils/logger';

const router: Router = express.Router();
const logger = Logger.getInstance();
const testDataService = TestDataService.getInstance();

/**
 * POST /test-data/generate
 * Generate test data based on scenario configuration
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const scenario: TestDataScenario = {
      name: req.body.name || 'Default Test Scenario',
      description: req.body.description || 'Automated test data generation',
      dataSet: req.body.dataSet || 'comprehensive',
      includeSuccessScenarios: req.body.includeSuccessScenarios !== false,
      includeErrorScenarios: req.body.includeErrorScenarios !== false,
      includeEdgeCases: req.body.includeEdgeCases !== false
    };

    logger.info(`Generating test data: ${scenario.name}`);

    const result = await testDataService.generateTestData(scenario);

    res.status(200).json({
      success: result.status === 'success',
      data: result,
      message: result.status === 'success'
        ? `Test data generated successfully. Created ${result.recordsCreated} records.`
        : `Test data generation completed with ${result.errors.length} errors`
    });
  } catch (error) {
    logger.error('Test data generation endpoint error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to generate test data'
    });
  }
});

/**
 * POST /test-data/generate/basic
 * Quick generation of basic test data
 */
router.post('/generate/basic', async (req: Request, res: Response) => {
  try {
    const scenario: TestDataScenario = {
      name: 'Basic Test Data',
      description: 'Quick test data generation with limited records',
      dataSet: 'basic',
      includeSuccessScenarios: true,
      includeErrorScenarios: true,
      includeEdgeCases: false
    };

    const result = await testDataService.generateTestData(scenario);

    res.status(200).json({
      success: result.status === 'success',
      data: result
    });
  } catch (error) {
    logger.error('Basic test data generation error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /test-data/generate/comprehensive
 * Generate comprehensive test data with all scenarios
 */
router.post('/generate/comprehensive', async (req: Request, res: Response) => {
  try {
    const scenario: TestDataScenario = {
      name: 'Comprehensive Test Data',
      description: 'Full test data generation with all scenarios',
      dataSet: 'comprehensive',
      includeSuccessScenarios: true,
      includeErrorScenarios: true,
      includeEdgeCases: true
    };

    const result = await testDataService.generateTestData(scenario);

    res.status(200).json({
      success: result.status === 'success',
      data: result
    });
  } catch (error) {
    logger.error('Comprehensive test data generation error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /test-data/generate/stress-test
 * Generate large dataset for stress testing
 */
router.post('/generate/stress-test', async (req: Request, res: Response) => {
  try {
    const scenario: TestDataScenario = {
      name: 'Stress Test Data',
      description: 'Large dataset for performance and stress testing',
      dataSet: 'stress_test',
      includeSuccessScenarios: false,
      includeErrorScenarios: false,
      includeEdgeCases: false
    };

    const result = await testDataService.generateTestData(scenario);

    res.status(200).json({
      success: result.status === 'success',
      data: result
    });
  } catch (error) {
    logger.error('Stress test data generation error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /test-data/reset
 * Reset all test data to clean state
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    logger.info('Resetting test data...');

    const result = await testDataService.resetTestData();

    res.status(200).json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    logger.error('Test data reset error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to reset test data'
    });
  }
});

/**
 * GET /test-data/summary
 * Get summary of test data in system
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await testDataService.getTestDataSummary();

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Test data summary error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /test-data/scenarios
 * Get available test data scenarios documentation
 */
router.get('/scenarios', (req: Request, res: Response) => {
  const scenarios = [
    {
      name: 'Basic',
      path: '/generate/basic',
      description: 'Quick test data generation with limited records',
      recordCounts: {
        parts: 50,
        equipment: 10,
        workOrders: 25,
        purchaseOrders: 10
      },
      scenarios: ['success', 'error'],
      duration: '< 5 seconds'
    },
    {
      name: 'Comprehensive',
      path: '/generate/comprehensive',
      description: 'Full test data generation with all scenarios',
      recordCounts: {
        parts: 200,
        equipment: 30,
        workOrders: 100,
        purchaseOrders: 50
      },
      scenarios: ['success', 'error', 'edgeCases'],
      duration: '10-30 seconds'
    },
    {
      name: 'Stress Test',
      path: '/generate/stress-test',
      description: 'Large dataset for performance and stress testing',
      recordCounts: {
        parts: 500,
        equipment: 100,
        workOrders: 500,
        purchaseOrders: 200
      },
      scenarios: ['dataGeneration'],
      duration: '30-60 seconds'
    }
  ];

  res.status(200).json({
    success: true,
    data: {
      scenarios,
      documentation: {
        successScenarios: [
          'Normal work order flow (RELEASED → IN_PROCESS → COMPLETED)',
          'Successful inventory receipt transactions',
          'Successful inventory issue transactions',
          'Standard PO receipt processing'
        ],
        errorScenarios: [
          'Insufficient inventory rejection',
          'Invalid work order status transitions',
          'Invalid PO receipt with mismatched quantities',
          'Equipment not found errors'
        ],
        edgeCases: [
          'Zero quantity transactions',
          'Fractional quantity handling',
          'Very large quantity transactions',
          'Duplicate transaction detection (idempotency)',
          'Expired material detection'
        ]
      }
    }
  });
});

export default router;
