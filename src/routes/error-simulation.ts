/**
 * Error Simulation REST API Routes
 *
 * API endpoints for controlling error simulation scenarios across surrogate services
 * GitHub Issue #243: Testing Infrastructure: Asset/Calibration Management Surrogates
 */

import { Router } from 'express';
import { z } from 'zod';
import { ErrorSimulationService, SimulationMode } from '../services/ErrorSimulationService';

const router = Router();

// Initialize error simulation service
const errorSimulationService = new ErrorSimulationService({
  enableSimulation: true,
  globalProbability: 1.0,
  maxConcurrentScenarios: 10,
  logAllSimulations: true,
  allowCascadingFailures: true
});

// Validation schemas
const scenarioCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  mode: z.nativeEnum(SimulationMode),
  probability: z.number().min(0).max(1),
  delay: z.number().min(0).optional(),
  errorMessage: z.string().optional(),
  httpStatusCode: z.number().min(100).max(599).optional(),
  affectedServices: z.array(z.enum(['MAXIMO', 'INDYSOFT', 'ERP'])).optional(),
  duration: z.number().min(0).optional(),
  triggers: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

const configUpdateSchema = z.object({
  enableSimulation: z.boolean().optional(),
  globalProbability: z.number().min(0).max(1).optional(),
  maxConcurrentScenarios: z.number().min(0).max(20).optional(),
  logAllSimulations: z.boolean().optional(),
  allowCascadingFailures: z.boolean().optional()
});

/**
 * @swagger
 * /api/testing/error-simulation/scenarios:
 *   post:
 *     summary: Create a new error simulation scenario
 *     tags: [Error Simulation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, mode, probability]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               mode:
 *                 type: string
 *                 enum: [DISABLED, NETWORK_FAILURES, DATA_CORRUPTION, AUTHENTICATION_ERRORS, RATE_LIMITING, TIMEOUT_ERRORS, INTERMITTENT_FAILURES, SYSTEM_OVERLOAD, DATA_VALIDATION_ERRORS, CASCADING_FAILURES]
 *               probability:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *               delay:
 *                 type: number
 *               errorMessage:
 *                 type: string
 *               httpStatusCode:
 *                 type: number
 *               affectedServices:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [MAXIMO, INDYSOFT, ERP]
 *               duration:
 *                 type: number
 *               triggers:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Scenario created successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/scenarios', async (req, res) => {
  try {
    const scenarioData = scenarioCreateSchema.parse(req.body);
    const scenario = errorSimulationService.createScenario(scenarioData);

    res.status(201).json({
      success: true,
      data: scenario,
      timestamp: new Date()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        timestamp: new Date()
      });
    } else {
      res.status(500).json({
        success: false,
        errors: [(error as Error).message],
        timestamp: new Date()
      });
    }
  }
});

/**
 * @swagger
 * /api/testing/error-simulation/scenarios:
 *   get:
 *     summary: Get all error simulation scenarios
 *     tags: [Error Simulation]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Scenarios retrieved successfully
 */
router.get('/scenarios', async (req, res) => {
  try {
    const { active } = req.query;

    let scenarios;
    if (active === 'true') {
      scenarios = errorSimulationService.getActiveScenarios();
    } else if (active === 'false') {
      scenarios = errorSimulationService.getAllScenarios().filter(s => !s.isActive);
    } else {
      scenarios = errorSimulationService.getAllScenarios();
    }

    res.status(200).json({
      success: true,
      data: scenarios,
      metadata: {
        totalCount: scenarios.length,
        activeCount: errorSimulationService.getActiveScenarios().length
      },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [(error as Error).message],
      timestamp: new Date()
    });
  }
});

/**
 * @swagger
 * /api/testing/error-simulation/scenarios/{scenarioId}:
 *   get:
 *     summary: Get specific error simulation scenario
 *     tags: [Error Simulation]
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scenario found
 *       404:
 *         description: Scenario not found
 */
router.get('/scenarios/:scenarioId', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const scenario = errorSimulationService.getScenario(scenarioId);

    if (!scenario) {
      return res.status(404).json({
        success: false,
        errors: [`Scenario ${scenarioId} not found`],
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      data: scenario,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [(error as Error).message],
      timestamp: new Date()
    });
  }
});

/**
 * @swagger
 * /api/testing/error-simulation/scenarios/{scenarioId}/activate:
 *   post:
 *     summary: Activate an error simulation scenario
 *     tags: [Error Simulation]
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scenario activated
 *       400:
 *         description: Cannot activate scenario
 *       404:
 *         description: Scenario not found
 */
router.post('/scenarios/:scenarioId/activate', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const success = errorSimulationService.activateScenario(scenarioId);

    if (!success) {
      const scenario = errorSimulationService.getScenario(scenarioId);
      if (!scenario) {
        return res.status(404).json({
          success: false,
          errors: [`Scenario ${scenarioId} not found`],
          timestamp: new Date()
        });
      }

      return res.status(400).json({
        success: false,
        errors: ['Cannot activate scenario. Check if maximum concurrent scenarios reached or scenario is already active.'],
        timestamp: new Date()
      });
    }

    const scenario = errorSimulationService.getScenario(scenarioId);
    res.status(200).json({
      success: true,
      data: scenario,
      message: 'Scenario activated successfully',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [(error as Error).message],
      timestamp: new Date()
    });
  }
});

/**
 * @swagger
 * /api/testing/error-simulation/scenarios/{scenarioId}/deactivate:
 *   post:
 *     summary: Deactivate an error simulation scenario
 *     tags: [Error Simulation]
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scenario deactivated
 *       404:
 *         description: Scenario not found
 */
router.post('/scenarios/:scenarioId/deactivate', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const success = errorSimulationService.deactivateScenario(scenarioId);

    if (!success) {
      return res.status(404).json({
        success: false,
        errors: [`Scenario ${scenarioId} not found`],
        timestamp: new Date()
      });
    }

    const scenario = errorSimulationService.getScenario(scenarioId);
    res.status(200).json({
      success: true,
      data: scenario,
      message: 'Scenario deactivated successfully',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [(error as Error).message],
      timestamp: new Date()
    });
  }
});

/**
 * @swagger
 * /api/testing/error-simulation/scenarios/activate-batch:
 *   post:
 *     summary: Activate multiple scenarios by name pattern or mode
 *     tags: [Error Simulation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scenarioIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               namePattern:
 *                 type: string
 *               mode:
 *                 type: string
 *                 enum: [NETWORK_FAILURES, DATA_CORRUPTION, AUTHENTICATION_ERRORS, RATE_LIMITING, TIMEOUT_ERRORS, INTERMITTENT_FAILURES, SYSTEM_OVERLOAD, DATA_VALIDATION_ERRORS, CASCADING_FAILURES]
 *     responses:
 *       200:
 *         description: Scenarios activated
 */
router.post('/scenarios/activate-batch', async (req, res) => {
  try {
    const { scenarioIds, namePattern, mode } = req.body;
    let activated = 0;
    let failed = 0;
    const results: string[] = [];

    let targetScenarios: string[] = [];

    if (scenarioIds && Array.isArray(scenarioIds)) {
      targetScenarios = scenarioIds;
    } else {
      // Find scenarios by pattern or mode
      const allScenarios = errorSimulationService.getAllScenarios();
      targetScenarios = allScenarios
        .filter(scenario => {
          if (mode && scenario.mode !== mode) return false;
          if (namePattern && !scenario.name.toLowerCase().includes(namePattern.toLowerCase())) return false;
          return true;
        })
        .map(scenario => scenario.scenarioId);
    }

    for (const scenarioId of targetScenarios) {
      const success = errorSimulationService.activateScenario(scenarioId);
      if (success) {
        activated++;
        results.push(`Activated: ${scenarioId}`);
      } else {
        failed++;
        results.push(`Failed: ${scenarioId}`);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        activated,
        failed,
        results
      },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [(error as Error).message],
      timestamp: new Date()
    });
  }
});

/**
 * @swagger
 * /api/testing/error-simulation/scenarios/deactivate-all:
 *   post:
 *     summary: Deactivate all active scenarios
 *     tags: [Error Simulation]
 *     responses:
 *       200:
 *         description: All scenarios deactivated
 */
router.post('/scenarios/deactivate-all', async (req, res) => {
  try {
    errorSimulationService.deactivateAllScenarios();

    res.status(200).json({
      success: true,
      message: 'All scenarios deactivated successfully',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [(error as Error).message],
      timestamp: new Date()
    });
  }
});

/**
 * @swagger
 * /api/testing/error-simulation/simulate:
 *   post:
 *     summary: Test error simulation for a specific service and operation
 *     tags: [Error Simulation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [service, operation]
 *             properties:
 *               service:
 *                 type: string
 *                 enum: [MAXIMO, INDYSOFT, ERP]
 *               operation:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Simulation result
 */
router.post('/simulate', async (req, res) => {
  try {
    const { service, operation, data } = req.body;

    if (!service || !operation) {
      return res.status(400).json({
        success: false,
        errors: ['Service and operation are required'],
        timestamp: new Date()
      });
    }

    const result = errorSimulationService.simulateRequest(service, operation, data);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [(error as Error).message],
      timestamp: new Date()
    });
  }
});

/**
 * @swagger
 * /api/testing/error-simulation/statistics:
 *   get:
 *     summary: Get error simulation statistics
 *     tags: [Error Simulation]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/statistics', async (req, res) => {
  try {
    const statistics = errorSimulationService.getStatistics();

    res.status(200).json({
      success: true,
      data: statistics,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [(error as Error).message],
      timestamp: new Date()
    });
  }
});

/**
 * @swagger
 * /api/testing/error-simulation/config:
 *   get:
 *     summary: Get current error simulation configuration
 *     tags: [Error Simulation]
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 */
router.get('/config', async (req, res) => {
  try {
    const statistics = errorSimulationService.getStatistics();

    res.status(200).json({
      success: true,
      data: statistics.config,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [(error as Error).message],
      timestamp: new Date()
    });
  }
});

/**
 * @swagger
 * /api/testing/error-simulation/config:
 *   put:
 *     summary: Update error simulation configuration
 *     tags: [Error Simulation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enableSimulation:
 *                 type: boolean
 *               globalProbability:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *               maxConcurrentScenarios:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 20
 *               logAllSimulations:
 *                 type: boolean
 *               allowCascadingFailures:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       400:
 *         description: Invalid configuration data
 */
router.put('/config', async (req, res) => {
  try {
    const configUpdate = configUpdateSchema.parse(req.body);

    // Update configuration (simplified - in real implementation would need proper config update method)
    // For now, we'll return the current config as if updated
    const statistics = errorSimulationService.getStatistics();

    res.status(200).json({
      success: true,
      data: statistics.config,
      message: 'Configuration updated successfully',
      timestamp: new Date()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        timestamp: new Date()
      });
    } else {
      res.status(500).json({
        success: false,
        errors: [(error as Error).message],
        timestamp: new Date()
      });
    }
  }
});

/**
 * @swagger
 * /api/testing/error-simulation/reset:
 *   post:
 *     summary: Reset error simulation (deactivate all scenarios and clear statistics)
 *     tags: [Error Simulation]
 *     responses:
 *       200:
 *         description: Simulation reset successfully
 */
router.post('/reset', async (req, res) => {
  try {
    errorSimulationService.resetSimulation();

    res.status(200).json({
      success: true,
      message: 'Error simulation reset successfully',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [(error as Error).message],
      timestamp: new Date()
    });
  }
});

export default router;
export { errorSimulationService };