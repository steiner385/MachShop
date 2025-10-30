/**
 * Torque Management API Routes
 * RESTful endpoints for digital torque management system
 * Supports CRUD operations, real-time sessions, and validation workflows
 */

import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { TorqueService } from '../services/TorqueService';
import { TorqueOrchestrationService } from '../services/TorqueOrchestrationService';
import { TorqueValidationService } from '../services/TorqueValidationService';
import { DigitalWrenchService } from '../services/DigitalWrenchService';
import {
  CreateTorqueSpecRequest,
  UpdateTorqueSpecRequest,
  CreateTorqueSequenceRequest,
  RecordTorqueEventRequest,
  TorqueReportRequest,
  DigitalWrenchConfig,
  TorqueSystemConfig
} from '../types/torque';

const router = express.Router();

// Validation schemas
const createTorqueSpecSchema = z.object({
  torqueSpecCode: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  targetTorque: z.number().positive(),
  tolerancePlus: z.number().positive(),
  toleranceMinus: z.number().positive(),
  torqueUnit: z.string().default('Nm'),
  fastenerType: z.string().min(1),
  fastenerGrade: z.string().optional(),
  fastenerCount: z.number().int().positive(),
  tighteningMethod: z.enum(['TORQUE_ONLY', 'TORQUE_ANGLE', 'TORQUE_TO_YIELD', 'ANGLE_ONLY']).default('TORQUE_ONLY'),
  numberOfPasses: z.number().int().positive().default(1),
  passPercentages: z.array(z.number()).optional(),
  sequencePattern: z.enum(['LINEAR', 'STAR', 'SPIRAL', 'CROSS', 'CUSTOM']).default('LINEAR'),
  customSequence: z.array(z.number()).optional(),
  partId: z.string().optional(),
  operationId: z.string().optional(),
  routingOperationId: z.string().optional(),
  workCenter: z.string().optional(),
  effectiveDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime().optional()
});

const updateTorqueSpecSchema = createTorqueSpecSchema.partial().extend({
  id: z.string(),
  revision: z.string().optional(),
  engineerApprovedBy: z.string().optional(),
  engineerApprovedAt: z.string().datetime().optional()
});

const createSequenceSchema = z.object({
  torqueSpecId: z.string(),
  sequenceName: z.string().min(1),
  boltPositions: z.array(z.object({
    position: z.number().int().positive(),
    coordinates: z.object({
      x: z.number(),
      y: z.number(),
      rotation: z.number().optional()
    }).optional(),
    label: z.string().optional(),
    fastenerType: z.string().optional(),
    notes: z.string().optional()
  })),
  sequenceOrder: z.array(z.number().int().positive()),
  passNumber: z.number().int().positive(),
  passPercentage: z.number().min(0).max(100),
  visualPattern: z.any().optional(),
  instructions: z.string().optional()
});

const recordEventSchema = z.object({
  workOrderId: z.string(),
  torqueSpecId: z.string(),
  sequenceId: z.string().optional(),
  serialNumber: z.string().optional(),
  actualTorque: z.number().positive(),
  boltPosition: z.number().int().positive(),
  passNumber: z.number().int().positive(),
  digitalWrenchData: z.object({
    wrenchId: z.string(),
    serialNumber: z.string(),
    calibrationDate: z.string().datetime(),
    torqueValue: z.number(),
    torqueUnit: z.string(),
    angle: z.number().optional(),
    timestamp: z.string().datetime(),
    isCalibrated: z.boolean(),
    batteryLevel: z.number().optional(),
    connectionType: z.enum(['Bluetooth', 'WiFi', 'USB', 'Serial'])
  }).optional(),
  duration: z.number().optional()
});

const reportRequestSchema = z.object({
  workOrderId: z.string().optional(),
  serialNumber: z.string().optional(),
  partNumber: z.string().optional(),
  torqueSpecId: z.string().optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  includeMetadata: z.boolean().default(false),
  format: z.enum(['PDF', 'CSV', 'JSON']).default('PDF')
});

// Services (would be injected in real implementation)
let torqueService: TorqueService;
let orchestrationService: TorqueOrchestrationService;
let validationService: TorqueValidationService;
let wrenchService: DigitalWrenchService;

// Initialize services (would be done in app startup)
export function initializeTorqueRoutes(services: {
  torqueService: TorqueService;
  orchestrationService: TorqueOrchestrationService;
  validationService: TorqueValidationService;
  wrenchService: DigitalWrenchService;
}) {
  torqueService = services.torqueService;
  orchestrationService = services.orchestrationService;
  validationService = services.validationService;
  wrenchService = services.wrenchService;
}

// =====================================================================================
// TORQUE SPECIFICATIONS ENDPOINTS
// =====================================================================================

/**
 * GET /api/torque/specifications
 * Get all torque specifications with optional filtering
 */
router.get('/specifications', authenticate, async (req, res) => {
  try {
    const {
      partId,
      operationId,
      workCenter,
      isActive,
      page = 1,
      limit = 50,
      search
    } = req.query;

    const specifications = await torqueService.getTorqueSpecifications({
      partId: partId as string,
      operationId: operationId as string,
      workCenter: workCenter as string,
      isActive: isActive === 'true',
      search: search as string,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }
    });

    res.json({
      success: true,
      data: specifications.data,
      pagination: specifications.pagination,
      total: specifications.total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve torque specifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/torque/specifications/:id
 * Get a specific torque specification
 */
router.get('/specifications/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const specification = await torqueService.getTorqueSpecification(id);

    if (!specification) {
      return res.status(404).json({
        success: false,
        error: 'Torque specification not found'
      });
    }

    res.json({
      success: true,
      data: specification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve torque specification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/torque/specifications
 * Create a new torque specification
 */
router.post('/specifications',
  authenticate,
  authorize(['quality_engineer', 'manufacturing_engineer', 'admin']),
  validateRequest(createTorqueSpecSchema),
  async (req, res) => {
    try {
      const specData: CreateTorqueSpecRequest = req.body;
      specData.createdBy = req.user.id;

      const specification = await torqueService.createTorqueSpecification(specData);

      res.status(201).json({
        success: true,
        data: specification,
        message: 'Torque specification created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create torque specification',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/torque/specifications/:id
 * Update an existing torque specification
 */
router.put('/specifications/:id',
  authenticate,
  authorize(['quality_engineer', 'manufacturing_engineer', 'admin']),
  validateRequest(updateTorqueSpecSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData: UpdateTorqueSpecRequest = { ...req.body, id };

      const specification = await torqueService.updateTorqueSpecification(updateData);

      res.json({
        success: true,
        data: specification,
        message: 'Torque specification updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update torque specification',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /api/torque/specifications/:id
 * Delete a torque specification (soft delete)
 */
router.delete('/specifications/:id',
  authenticate,
  authorize(['quality_engineer', 'manufacturing_engineer', 'admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      await torqueService.deleteTorqueSpecification(id);

      res.json({
        success: true,
        message: 'Torque specification deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to delete torque specification',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// =====================================================================================
// TORQUE SEQUENCES ENDPOINTS
// =====================================================================================

/**
 * GET /api/torque/sequences
 * Get torque sequences for a specification
 */
router.get('/sequences', authenticate, async (req, res) => {
  try {
    const { torqueSpecId } = req.query;

    if (!torqueSpecId) {
      return res.status(400).json({
        success: false,
        error: 'torqueSpecId is required'
      });
    }

    const sequences = await torqueService.getTorqueSequences(torqueSpecId as string);

    res.json({
      success: true,
      data: sequences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve torque sequences',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/torque/sequences
 * Create a new torque sequence
 */
router.post('/sequences',
  authenticate,
  authorize(['quality_engineer', 'manufacturing_engineer', 'admin']),
  validateRequest(createSequenceSchema),
  async (req, res) => {
    try {
      const sequenceData: CreateTorqueSequenceRequest = req.body;
      const sequence = await torqueService.createTorqueSequence(sequenceData);

      res.status(201).json({
        success: true,
        data: sequence,
        message: 'Torque sequence created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create torque sequence',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/torque/sequences/:id
 * Update a torque sequence
 */
router.put('/sequences/:id',
  authenticate,
  authorize(['quality_engineer', 'manufacturing_engineer', 'admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, id };

      const sequence = await torqueService.updateTorqueSequence(updateData);

      res.json({
        success: true,
        data: sequence,
        message: 'Torque sequence updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update torque sequence',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /api/torque/sequences/:id
 * Delete a torque sequence
 */
router.delete('/sequences/:id',
  authenticate,
  authorize(['quality_engineer', 'manufacturing_engineer', 'admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      await torqueService.deleteTorqueSequence(id);

      res.json({
        success: true,
        message: 'Torque sequence deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to delete torque sequence',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// =====================================================================================
// TORQUE EVENTS ENDPOINTS
// =====================================================================================

/**
 * GET /api/torque/events
 * Get torque events with filtering
 */
router.get('/events', authenticate, async (req, res) => {
  try {
    const {
      workOrderId,
      torqueSpecId,
      operatorId,
      dateRange,
      isInSpec,
      requiresRework,
      page = 1,
      limit = 100
    } = req.query;

    const events = await torqueService.getTorqueEvents({
      workOrderId: workOrderId as string,
      torqueSpecId: torqueSpecId as string,
      operatorId: operatorId as string,
      dateRange: dateRange ? JSON.parse(dateRange as string) : undefined,
      isInSpec: isInSpec === 'true',
      requiresRework: requiresRework === 'true',
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      }
    });

    res.json({
      success: true,
      data: events.data,
      pagination: events.pagination,
      total: events.total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve torque events',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/torque/events
 * Record a new torque event
 */
router.post('/events',
  authenticate,
  validateRequest(recordEventSchema),
  async (req, res) => {
    try {
      const eventData: RecordTorqueEventRequest = {
        ...req.body,
        operatorId: req.user.id
      };

      const event = await torqueService.recordTorqueEvent(eventData);

      res.status(201).json({
        success: true,
        data: event,
        message: 'Torque event recorded successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to record torque event',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/torque/events/:id
 * Get a specific torque event
 */
router.get('/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await torqueService.getTorqueEvent(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Torque event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve torque event',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =====================================================================================
// REAL-TIME SESSION ENDPOINTS
// =====================================================================================

/**
 * POST /api/torque/sessions
 * Start a new torque session
 */
router.post('/sessions',
  authenticate,
  async (req, res) => {
    try {
      const { workOrderId, torqueSpecId, wrenchId } = req.body;

      if (!workOrderId || !torqueSpecId) {
        return res.status(400).json({
          success: false,
          error: 'workOrderId and torqueSpecId are required'
        });
      }

      const sessionId = await orchestrationService.startTorqueSession(
        workOrderId,
        torqueSpecId,
        req.user.id,
        wrenchId
      );

      res.status(201).json({
        success: true,
        data: { sessionId },
        message: 'Torque session started successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to start torque session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/torque/sessions/:sessionId
 * Get session status
 */
router.get('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = orchestrationService.getActiveSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/torque/sessions/:sessionId/readings
 * Process a torque reading for a session
 */
router.post('/sessions/:sessionId/readings',
  authenticate,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { reading, boltPosition, passNumber } = req.body;

      if (!reading || !boltPosition || !passNumber) {
        return res.status(400).json({
          success: false,
          error: 'reading, boltPosition, and passNumber are required'
        });
      }

      const result = await orchestrationService.processTorqueReading(
        sessionId,
        reading,
        boltPosition,
        passNumber
      );

      res.json({
        success: true,
        data: result,
        message: 'Torque reading processed successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to process torque reading',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/torque/sessions/:sessionId/complete
 * Complete a torque session
 */
router.post('/sessions/:sessionId/complete',
  authenticate,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      await orchestrationService.completeSession(sessionId);

      res.json({
        success: true,
        message: 'Torque session completed successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to complete torque session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/torque/sessions
 * Get all active sessions
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = orchestrationService.getAllActiveSessions();

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =====================================================================================
// DIGITAL WRENCH ENDPOINTS
// =====================================================================================

/**
 * GET /api/torque/wrenches
 * Get all registered digital wrenches
 */
router.get('/wrenches', authenticate, async (req, res) => {
  try {
    const wrenches = wrenchService.getRegisteredWrenches();

    res.json({
      success: true,
      data: wrenches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve digital wrenches',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/torque/wrenches
 * Register a new digital wrench
 */
router.post('/wrenches',
  authenticate,
  authorize(['quality_engineer', 'manufacturing_engineer', 'admin']),
  async (req, res) => {
    try {
      const wrenchConfig: DigitalWrenchConfig = req.body;
      await wrenchService.registerWrench(wrenchConfig);

      res.status(201).json({
        success: true,
        data: wrenchConfig,
        message: 'Digital wrench registered successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to register digital wrench',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/torque/wrenches/:wrenchId/connect
 * Connect to a digital wrench
 */
router.post('/wrenches/:wrenchId/connect', authenticate, async (req, res) => {
  try {
    const { wrenchId } = req.params;
    const connected = await wrenchService.connectWrench(wrenchId);

    res.json({
      success: connected,
      message: connected ? 'Wrench connected successfully' : 'Failed to connect to wrench'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to connect to wrench',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/torque/wrenches/:wrenchId/disconnect
 * Disconnect from a digital wrench
 */
router.post('/wrenches/:wrenchId/disconnect', authenticate, async (req, res) => {
  try {
    const { wrenchId } = req.params;
    await wrenchService.disconnectWrench(wrenchId);

    res.json({
      success: true,
      message: 'Wrench disconnected successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to disconnect from wrench',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/torque/wrenches/:wrenchId/status
 * Get wrench connection status
 */
router.get('/wrenches/:wrenchId/status', authenticate, async (req, res) => {
  try {
    const { wrenchId } = req.params;
    const status = await wrenchService.getWrenchStatus(wrenchId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get wrench status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/torque/wrenches/discover
 * Discover available digital wrenches
 */
router.post('/wrenches/discover',
  authenticate,
  authorize(['quality_engineer', 'manufacturing_engineer', 'admin']),
  async (req, res) => {
    try {
      const discovered = await wrenchService.discoverWrenches();

      res.json({
        success: true,
        data: discovered,
        message: `Discovered ${discovered.length} digital wrenches`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to discover wrenches',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// =====================================================================================
// REPORTING ENDPOINTS
// =====================================================================================

/**
 * POST /api/torque/reports
 * Generate torque report
 */
router.post('/reports',
  authenticate,
  validateRequest(reportRequestSchema),
  async (req, res) => {
    try {
      const reportRequest: TorqueReportRequest = req.body;
      const report = await torqueService.generateTorqueReport(reportRequest);

      res.json({
        success: true,
        data: report,
        message: 'Torque report generated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to generate torque report',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/torque/analytics
 * Get torque analytics dashboard data
 */
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const { dateRange, workOrderId } = req.query;

    const analytics = await torqueService.getTorqueAnalytics({
      dateRange: dateRange ? JSON.parse(dateRange as string) : undefined,
      workOrderId: workOrderId as string
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve torque analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =====================================================================================
// VALIDATION ENDPOINTS
// =====================================================================================

/**
 * GET /api/torque/validation/rules
 * Get validation rules
 */
router.get('/validation/rules', authenticate, async (req, res) => {
  try {
    const rules = validationService.getValidationRules();

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve validation rules',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/torque/validation/rules
 * Add custom validation rule
 */
router.post('/validation/rules',
  authenticate,
  authorize(['quality_engineer', 'admin']),
  async (req, res) => {
    try {
      const rule = req.body;
      validationService.addValidationRule(rule);

      res.status(201).json({
        success: true,
        data: rule,
        message: 'Validation rule added successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to add validation rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/torque/validation/rules/:ruleId/enabled
 * Enable/disable validation rule
 */
router.put('/validation/rules/:ruleId/enabled',
  authenticate,
  authorize(['quality_engineer', 'admin']),
  async (req, res) => {
    try {
      const { ruleId } = req.params;
      const { enabled } = req.body;

      validationService.setRuleEnabled(ruleId, enabled);

      res.json({
        success: true,
        message: `Validation rule ${enabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update validation rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/torque/validation/statistics
 * Get validation statistics
 */
router.get('/validation/statistics', authenticate, async (req, res) => {
  try {
    const { workOrderId } = req.query;
    const statistics = validationService.getValidationStatistics(workOrderId as string);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve validation statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =====================================================================================
// SYSTEM STATUS ENDPOINTS
// =====================================================================================

/**
 * GET /api/torque/status
 * Get system status and statistics
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = orchestrationService.getServiceStatistics();

    res.json({
      success: true,
      data: {
        ...status,
        timestamp: new Date(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;