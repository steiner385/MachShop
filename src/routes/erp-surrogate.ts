/**
 * ERP Surrogate REST API Routes
 *
 * Comprehensive API endpoints for ERP surrogate system integration
 * Handles asset management, financial tracking, and reporting
 * GitHub Issue #243: Testing Infrastructure: Asset/Calibration Management Surrogates
 */

import { Router } from 'express';
import { z } from 'zod';
import { ERPSurrogate, DataImportRequest } from '../services/ERPSurrogate';

const router = Router();

// Initialize ERP surrogate service
const erpSurrogate = new ERPSurrogate({
  mockMode: true,
  enableFinancialIntegration: true,
  enableComplianceTracking: true,
  enableDepreciation: true,
  autoProcessImports: true,
  batchProcessingEnabled: true,
  maxBatchSize: 1000
});

// Validation schemas
const dataImportSchema = z.object({
  sourceSystem: z.enum(['MAXIMO', 'INDYSOFT']),
  importType: z.enum(['FULL', 'INCREMENTAL', 'DELTA']),
  data: z.array(z.any()),
  batchId: z.string().optional(),
  requestedBy: z.string().min(1, 'Requested by is required')
});

const assetQuerySchema = z.object({
  sourceSystem: z.enum(['MAXIMO', 'INDYSOFT']).optional(),
  assetType: z.enum(['EQUIPMENT', 'GAUGE', 'TOOL']).optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  department: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const maintenanceRecordSchema = z.object({
  erpAssetId: z.string().min(1, 'ERP Asset ID is required'),
  maintenanceType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'CALIBRATION', 'INSPECTION']),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  scheduledDate: z.coerce.date(),
  completedDate: z.coerce.date().optional(),
  technician: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  laborHours: z.number().min(0).optional(),
  laborCost: z.number().min(0).optional(),
  materialCost: z.number().min(0).optional(),
  workOrderNumber: z.string().optional(),
  notes: z.string().optional()
});

const financialTransactionSchema = z.object({
  erpAssetId: z.string().min(1, 'ERP Asset ID is required'),
  transactionType: z.enum(['ACQUISITION', 'DEPRECIATION', 'MAINTENANCE', 'DISPOSAL', 'CALIBRATION']),
  amount: z.number().min(0, 'Amount must be positive'),
  currency: z.string().length(3).optional(),
  accountCode: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  transactionDate: z.coerce.date().optional(),
  approvedBy: z.string().optional(),
  reference: z.string().optional()
});

const reportQuerySchema = z.object({
  reportType: z.enum(['ASSET_SUMMARY', 'MAINTENANCE_COSTS', 'CALIBRATION_STATUS', 'COMPLIANCE_OVERVIEW']),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sourceSystem: z.enum(['MAXIMO', 'INDYSOFT']).optional(),
  location: z.string().optional(),
  department: z.string().optional()
});

/**
 * @swagger
 * /api/testing/erp/import/assets:
 *   post:
 *     summary: Import asset data from external systems
 *     tags: [ERP Surrogate]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sourceSystem, importType, data, requestedBy]
 *             properties:
 *               sourceSystem:
 *                 type: string
 *                 enum: [MAXIMO, INDYSOFT]
 *               importType:
 *                 type: string
 *                 enum: [FULL, INCREMENTAL, DELTA]
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *               batchId:
 *                 type: string
 *               requestedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Import completed
 *       400:
 *         description: Invalid request data
 */
router.post('/import/assets', async (req, res) => {
  try {
    const importRequest = dataImportSchema.parse(req.body);
    const result = await erpSurrogate.importAssetData(importRequest);

    if (result.success) {
      res.status(200).json(result);
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
        errors: [(error as Error).message],
        timestamp: new Date()
      });
    }
  }
});

/**
 * @swagger
 * /api/testing/erp/import/calibrations:
 *   post:
 *     summary: Import calibration data from IndySoft
 *     tags: [ERP Surrogate]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [data]
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Import completed
 *       400:
 *         description: Invalid request data
 */
router.post('/import/calibrations', async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        errors: ['Data must be an array'],
        timestamp: new Date()
      });
    }

    const result = await erpSurrogate.importCalibrationData(data, 'INDYSOFT');

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
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
 * /api/testing/erp/assets:
 *   get:
 *     summary: Query ERP assets with filters
 *     tags: [ERP Surrogate]
 *     parameters:
 *       - in: query
 *         name: sourceSystem
 *         schema:
 *           type: string
 *           enum: [MAXIMO, INDYSOFT]
 *       - in: query
 *         name: assetType
 *         schema:
 *           type: string
 *           enum: [EQUIPMENT, GAUGE, TOOL]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *     responses:
 *       200:
 *         description: Assets retrieved successfully
 *       400:
 *         description: Invalid query parameters
 */
router.get('/assets', async (req, res) => {
  try {
    const queryParams = assetQuerySchema.parse(req.query);
    const result = await erpSurrogate.queryAssets(queryParams);

    res.status(200).json(result);
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
 * /api/testing/erp/assets/{erpAssetId}:
 *   get:
 *     summary: Get specific ERP asset by ID
 *     tags: [ERP Surrogate]
 *     parameters:
 *       - in: path
 *         name: erpAssetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asset found
 *       404:
 *         description: Asset not found
 */
router.get('/assets/:erpAssetId', async (req, res) => {
  try {
    const { erpAssetId } = req.params;
    const result = await erpSurrogate.getAsset(erpAssetId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
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
 * /api/testing/erp/maintenance:
 *   post:
 *     summary: Create maintenance record
 *     tags: [ERP Surrogate]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [erpAssetId, maintenanceType, scheduledDate, description]
 *             properties:
 *               erpAssetId:
 *                 type: string
 *               maintenanceType:
 *                 type: string
 *                 enum: [PREVENTIVE, CORRECTIVE, CALIBRATION, INSPECTION]
 *               status:
 *                 type: string
 *                 enum: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED]
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *               completedDate:
 *                 type: string
 *                 format: date-time
 *               technician:
 *                 type: string
 *               description:
 *                 type: string
 *               laborHours:
 *                 type: number
 *               laborCost:
 *                 type: number
 *               materialCost:
 *                 type: number
 *               workOrderNumber:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Maintenance record created
 *       400:
 *         description: Invalid request data
 */
router.post('/maintenance', async (req, res) => {
  try {
    const maintenanceData = maintenanceRecordSchema.parse(req.body);
    const result = await erpSurrogate.createMaintenanceRecord(maintenanceData);

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
        errors: [(error as Error).message],
        timestamp: new Date()
      });
    }
  }
});

/**
 * @swagger
 * /api/testing/erp/financial:
 *   post:
 *     summary: Create financial transaction
 *     tags: [ERP Surrogate]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [erpAssetId, transactionType, amount, description]
 *             properties:
 *               erpAssetId:
 *                 type: string
 *               transactionType:
 *                 type: string
 *                 enum: [ACQUISITION, DEPRECIATION, MAINTENANCE, DISPOSAL, CALIBRATION]
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               accountCode:
 *                 type: string
 *               description:
 *                 type: string
 *               transactionDate:
 *                 type: string
 *                 format: date-time
 *               approvedBy:
 *                 type: string
 *               reference:
 *                 type: string
 *     responses:
 *       201:
 *         description: Financial transaction created
 *       400:
 *         description: Invalid request data
 */
router.post('/financial', async (req, res) => {
  try {
    const transactionData = financialTransactionSchema.parse(req.body);
    const result = await erpSurrogate.createFinancialTransaction(transactionData);

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
        errors: [(error as Error).message],
        timestamp: new Date()
      });
    }
  }
});

/**
 * @swagger
 * /api/testing/erp/reports:
 *   get:
 *     summary: Generate ERP reports
 *     tags: [ERP Surrogate]
 *     parameters:
 *       - in: query
 *         name: reportType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ASSET_SUMMARY, MAINTENANCE_COSTS, CALIBRATION_STATUS, COMPLIANCE_OVERVIEW]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sourceSystem
 *         schema:
 *           type: string
 *           enum: [MAXIMO, INDYSOFT]
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report generated successfully
 *       400:
 *         description: Invalid query parameters
 */
router.get('/reports', async (req, res) => {
  try {
    const { reportType, ...filters } = reportQuerySchema.parse(req.query);
    const result = await erpSurrogate.generateReport(reportType, filters);

    res.status(200).json(result);
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
 * /api/testing/erp/health:
 *   get:
 *     summary: Get ERP surrogate health status
 *     tags: [ERP Surrogate]
 *     responses:
 *       200:
 *         description: Health status retrieved
 */
router.get('/health', async (req, res) => {
  try {
    const result = await erpSurrogate.getHealthStatus();
    res.status(200).json(result);
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
 * /api/testing/erp/reset:
 *   post:
 *     summary: Reset ERP surrogate mock data
 *     tags: [ERP Surrogate]
 *     responses:
 *       200:
 *         description: Mock data reset successfully
 */
router.post('/reset', async (req, res) => {
  try {
    const result = await erpSurrogate.resetMockData();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [(error as Error).message],
      timestamp: new Date()
    });
  }
});

export default router;