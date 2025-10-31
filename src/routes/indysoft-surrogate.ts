import express from 'express';
import { z } from 'zod';
import {
  IndySoftSurrogate,
  GaugeType,
  GaugeStatus,
  CalibrationStatus,
  CalibrationFrequency,
  MeasurementUncertaintyType,
  Gauge,
  CalibrationRecord,
  GageRRStudy
} from '../services/IndySoftSurrogate';

const router = express.Router();

// Create singleton instance of IndySoft surrogate
const indySoftSurrogate = new IndySoftSurrogate({
  mockMode: true,
  enableDataExport: true,
  enableAuditLogging: true,
  autoGenerateCalibrationDueNotifications: true
});

// Validation schemas
const measurementRangeSchema = z.object({
  minimum: z.number(),
  maximum: z.number(),
  units: z.string(),
  nominalValue: z.number().optional()
});

const gaugeCreateSchema = z.object({
  assetTag: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  gaugeType: z.nativeEnum(GaugeType),
  status: z.nativeEnum(GaugeStatus).optional(),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  model: z.string().min(1, 'Model is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  measurementRange: measurementRangeSchema,
  resolution: z.number().positive(),
  accuracy: z.number().positive(),
  location: z.string().min(1, 'Location is required'),
  assignedTo: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  costCenter: z.string().min(1, 'Cost center is required'),
  acquisitionDate: z.string().transform(str => new Date(str)).optional(),
  acquisitionCost: z.number().positive().optional(),
  calibrationFrequency: z.number().positive().optional(),
  lastCalibrationDate: z.string().transform(str => new Date(str)).optional(),
  certificateNumber: z.string().optional(),
  customAttributes: z.record(z.any()).optional()
});

const gaugeUpdateSchema = gaugeCreateSchema.partial();

const gaugeQuerySchema = z.object({
  gaugeType: z.nativeEnum(GaugeType).optional(),
  status: z.nativeEnum(GaugeStatus).optional(),
  location: z.string().optional(),
  department: z.string().optional(),
  assignedTo: z.string().optional(),
  manufacturer: z.string().optional(),
  calibrationDueBefore: z.string().transform(str => new Date(str)).optional(),
  calibrationDueAfter: z.string().transform(str => new Date(str)).optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional()
});

const calibrationReadingSchema = z.object({
  nominalValue: z.number(),
  actualValue: z.number(),
  error: z.number(),
  tolerance: z.number(),
  withinTolerance: z.boolean(),
  units: z.string()
});

const environmentalConditionsSchema = z.object({
  temperature: z.number(),
  humidity: z.number(),
  pressure: z.number(),
  vibration: z.string().optional(),
  other: z.record(z.any()).optional()
});

const uncertaintyComponentSchema = z.object({
  source: z.string(),
  value: z.number(),
  distribution: z.enum(['NORMAL', 'RECTANGULAR', 'TRIANGULAR']),
  sensitivity: z.number()
});

const measurementUncertaintySchema = z.object({
  value: z.number(),
  type: z.nativeEnum(MeasurementUncertaintyType),
  coverageFactor: z.number(),
  confidenceLevel: z.number(),
  contributingFactors: z.array(uncertaintyComponentSchema)
});

const passFailCriteriaSchema = z.object({
  tolerancePercentage: z.number(),
  acceptanceLimit: z.number(),
  units: z.string(),
  specification: z.string()
});

const calibrationAttachmentSchema = z.object({
  attachmentId: z.string(),
  filename: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  description: z.string(),
  uploadDate: z.string().transform(str => new Date(str)),
  uploadedBy: z.string()
});

const calibrationRecordCreateSchema = z.object({
  gaugeId: z.string().min(1, 'Gauge ID is required'),
  calibrationDate: z.string().transform(str => new Date(str)).optional(),
  status: z.nativeEnum(CalibrationStatus).optional(),
  technician: z.string().min(1, 'Technician is required'),
  calibrationStandard: z.string().min(1, 'Calibration standard is required'),
  environmentalConditions: environmentalConditionsSchema,
  procedure: z.string().min(1, 'Procedure is required'),
  certificateNumber: z.string().optional(),
  asFoundReadings: z.array(calibrationReadingSchema),
  asLeftReadings: z.array(calibrationReadingSchema),
  adjustmentsMade: z.array(z.string()),
  measurementUncertainty: measurementUncertaintySchema,
  passFailCriteria: passFailCriteriaSchema,
  overallResult: z.enum(['PASS', 'FAIL', 'LIMITED_USE']),
  comments: z.string().optional(),
  attachments: z.array(calibrationAttachmentSchema).optional()
});

const calibrationQuerySchema = z.object({
  gaugeId: z.string().optional(),
  status: z.nativeEnum(CalibrationStatus).optional(),
  technician: z.string().optional(),
  calibrationAfter: z.string().transform(str => new Date(str)).optional(),
  calibrationBefore: z.string().transform(str => new Date(str)).optional(),
  overdue: z.string().transform(str => str === 'true').optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional()
});

// Gauge Management Endpoints

/**
 * @swagger
 * /api/testing/indysoft/gauges:
 *   post:
 *     summary: Create new gauge record
 *     tags: [IndySoft Gauges]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, gaugeType, manufacturer, model, serialNumber, measurementRange, resolution, accuracy, location, department, costCenter]
 *             properties:
 *               assetTag:
 *                 type: string
 *                 description: Asset tag (auto-generated if not provided)
 *               description:
 *                 type: string
 *                 description: Gauge description
 *               gaugeType:
 *                 type: string
 *                 enum: [CALIPER, MICROMETER, HEIGHT_GAUGE, INDICATOR, CMM, SURFACE_PLATE, TORQUE_WRENCH, PRESSURE_GAUGE, THERMOMETER, SCALE, THREAD_GAUGE, OPTICAL_COMPARATOR]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, CALIBRATION_DUE, OVERDUE, OUT_OF_TOLERANCE, OUT_OF_SERVICE, RETIRED]
 *               manufacturer:
 *                 type: string
 *                 description: Gauge manufacturer
 *               model:
 *                 type: string
 *                 description: Gauge model
 *               serialNumber:
 *                 type: string
 *                 description: Gauge serial number
 *               measurementRange:
 *                 type: object
 *                 properties:
 *                   minimum:
 *                     type: number
 *                   maximum:
 *                     type: number
 *                   units:
 *                     type: string
 *               resolution:
 *                 type: number
 *                 description: Gauge resolution
 *               accuracy:
 *                 type: number
 *                 description: Gauge accuracy
 *               location:
 *                 type: string
 *                 description: Gauge location
 *               department:
 *                 type: string
 *                 description: Department responsible for gauge
 *               costCenter:
 *                 type: string
 *                 description: Cost center
 *               calibrationFrequency:
 *                 type: number
 *                 description: Calibration frequency in days
 *     responses:
 *       201:
 *         description: Gauge created successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/gauges', async (req, res) => {
  try {
    const gaugeData = gaugeCreateSchema.parse(req.body);
    const result = await indySoftSurrogate.createGauge(gaugeData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
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
        errors: ['Internal server error'],
        timestamp: new Date()
      });
    }
  }
});

/**
 * @swagger
 * /api/testing/indysoft/gauges:
 *   get:
 *     summary: Query gauge records
 *     tags: [IndySoft Gauges]
 *     parameters:
 *       - in: query
 *         name: gaugeType
 *         schema:
 *           type: string
 *           enum: [CALIPER, MICROMETER, HEIGHT_GAUGE, INDICATOR, CMM, SURFACE_PLATE, TORQUE_WRENCH, PRESSURE_GAUGE, THERMOMETER, SCALE, THREAD_GAUGE, OPTICAL_COMPARATOR]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, CALIBRATION_DUE, OVERDUE, OUT_OF_TOLERANCE, OUT_OF_SERVICE, RETIRED]
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in description, asset tag, or serial number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Gauge records retrieved successfully
 */
router.get('/gauges', async (req, res) => {
  try {
    const filter = gaugeQuerySchema.parse(req.query);
    const result = await indySoftSurrogate.queryGauges(filter);
    res.json(result);
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
        errors: ['Internal server error'],
        timestamp: new Date()
      });
    }
  }
});

/**
 * @swagger
 * /api/testing/indysoft/gauges/{gaugeId}:
 *   get:
 *     summary: Get gauge by ID
 *     tags: [IndySoft Gauges]
 *     parameters:
 *       - in: path
 *         name: gaugeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gauge record retrieved successfully
 *       404:
 *         description: Gauge not found
 */
router.get('/gauges/:gaugeId', async (req, res) => {
  try {
    const { gaugeId } = req.params;
    const result = await indySoftSurrogate.getGauge(gaugeId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: ['Internal server error'],
      timestamp: new Date()
    });
  }
});

// Calibration Management Endpoints

/**
 * @swagger
 * /api/testing/indysoft/calibrations:
 *   post:
 *     summary: Create new calibration record
 *     tags: [IndySoft Calibrations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gaugeId, technician, calibrationStandard, environmentalConditions, procedure, asFoundReadings, asLeftReadings, measurementUncertainty, passFailCriteria, overallResult]
 *     responses:
 *       201:
 *         description: Calibration record created successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/calibrations', async (req, res) => {
  try {
    const calibrationData = calibrationRecordCreateSchema.parse(req.body);
    const result = await indySoftSurrogate.createCalibrationRecord(calibrationData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
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
        errors: ['Internal server error'],
        timestamp: new Date()
      });
    }
  }
});

// Calibration Due Notifications

/**
 * @swagger
 * /api/testing/indysoft/calibrations/due:
 *   get:
 *     summary: Get gauges due for calibration
 *     tags: [IndySoft Calibrations]
 *     parameters:
 *       - in: query
 *         name: daysAhead
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days ahead to check for due calibrations
 *       - in: query
 *         name: includeOverdue
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include overdue gauges in results
 *     responses:
 *       200:
 *         description: Due calibrations retrieved successfully
 */
router.get('/calibrations/due', async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.daysAhead as string) || 7;
    const includeOverdue = req.query.includeOverdue !== 'false';

    const now = new Date();
    const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

    const filter: any = {
      calibrationDueBefore: futureDate
    };

    if (!includeOverdue) {
      filter.calibrationDueAfter = now;
    }

    const result = await indySoftSurrogate.queryGauges(filter);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: ['Internal server error'],
      timestamp: new Date()
    });
  }
});

// Out-of-Tolerance Management

/**
 * @swagger
 * /api/testing/indysoft/out-of-tolerance:
 *   get:
 *     summary: Get out-of-tolerance events
 *     tags: [IndySoft OOT Management]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, INVESTIGATING, RESOLVED, CLOSED]
 *       - in: query
 *         name: gaugeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Out-of-tolerance events retrieved successfully
 */
router.get('/out-of-tolerance', async (req, res) => {
  try {
    // This would be implemented in the service layer
    // For now, return empty array as placeholder
    res.json({
      success: true,
      data: [],
      metadata: {
        totalCount: 0,
        pageSize: 50,
        currentPage: 1,
        hasMore: false
      },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: ['Internal server error'],
      timestamp: new Date()
    });
  }
});

// Gage R&R Studies

/**
 * @swagger
 * /api/testing/indysoft/gage-rr:
 *   get:
 *     summary: Get Gage R&R studies
 *     tags: [IndySoft Gage R&R]
 *     parameters:
 *       - in: query
 *         name: gaugeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PLANNED, IN_PROGRESS, COMPLETED, CANCELLED]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Gage R&R studies retrieved successfully
 */
router.get('/gage-rr', async (req, res) => {
  try {
    // This would be implemented in the service layer
    // For now, return empty array as placeholder
    res.json({
      success: true,
      data: [],
      metadata: {
        totalCount: 0,
        pageSize: 20,
        currentPage: 1,
        hasMore: false
      },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: ['Internal server error'],
      timestamp: new Date()
    });
  }
});

// Health Check Endpoint

/**
 * @swagger
 * /api/testing/indysoft/health:
 *   get:
 *     summary: Get IndySoft surrogate health status
 *     tags: [IndySoft System]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 */
router.get('/health', async (req, res) => {
  try {
    const result = await indySoftSurrogate.getHealthStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: ['Health check failed'],
      timestamp: new Date()
    });
  }
});

// System Management Endpoints

/**
 * @swagger
 * /api/testing/indysoft/system/reset:
 *   post:
 *     summary: Reset mock data for testing
 *     tags: [IndySoft System]
 *     responses:
 *       200:
 *         description: Mock data reset successfully
 */
router.post('/system/reset', async (req, res) => {
  try {
    const result = await indySoftSurrogate.resetMockData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: ['Failed to reset mock data'],
      timestamp: new Date()
    });
  }
});

// ERP Export Integration
indySoftSurrogate.on('erpExport', (data) => {
  console.log(`[IndySoft → ERP] Exporting ${data.type}:`, data.data);
  // TODO: Integrate with ERP surrogate when available
});

// Event logging for monitoring
indySoftSurrogate.on('gaugeCreated', (gauge) => {
  console.log(`[IndySoft] Gauge created: ${gauge.assetTag} - ${gauge.description}`);
});

indySoftSurrogate.on('calibrationCompleted', (calibration, gauge) => {
  console.log(`[IndySoft] Calibration completed: ${calibration.calibrationId} for gauge ${gauge.assetTag} (${calibration.overallResult})`);
});

indySoftSurrogate.on('calibrationDue', (gauge) => {
  console.log(`[IndySoft] Calibration due: ${gauge.assetTag} - due ${gauge.nextCalibrationDate.toISOString()}`);
});

indySoftSurrogate.on('calibrationOverdue', (gauge) => {
  console.warn(`[IndySoft] Calibration overdue: ${gauge.assetTag} - was due ${gauge.nextCalibrationDate.toISOString()}`);
});

indySoftSurrogate.on('outOfToleranceDetected', (ootEvent) => {
  console.warn(`[IndySoft] Out-of-tolerance detected: ${ootEvent.ootId} for gauge ${ootEvent.gaugeId}`);
});

export default router;