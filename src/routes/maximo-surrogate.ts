import express from 'express';
import { z } from 'zod';
import {
  MaximoSurrogate,
  EquipmentStatus,
  EquipmentType,
  WorkOrderStatus,
  WorkOrderType,
  DowntimeReason,
  Equipment,
  WorkOrder,
  DowntimeEvent
} from '../services/MaximoSurrogate';

const router = express.Router();

// Create singleton instance of Maximo surrogate
const maximoSurrogate = new MaximoSurrogate({
  mockMode: true,
  enableDataExport: true,
  enableAuditLogging: true,
  autoGeneratePMWorkOrders: true
});

// Validation schemas
const equipmentCreateSchema = z.object({
  assetNum: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  equipmentType: z.nativeEnum(EquipmentType),
  status: z.nativeEnum(EquipmentStatus).optional(),
  location: z.string().min(1, 'Location is required'),
  department: z.string().min(1, 'Department is required'),
  workCell: z.string().optional(),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  model: z.string().min(1, 'Model is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  installDate: z.string().transform(str => new Date(str)).optional(),
  acquisitionCost: z.number().positive().optional(),
  specifications: z.record(z.any()).optional(),
  customAttributes: z.record(z.any()).optional()
});

const equipmentUpdateSchema = equipmentCreateSchema.partial();

const equipmentQuerySchema = z.object({
  equipmentType: z.nativeEnum(EquipmentType).optional(),
  status: z.nativeEnum(EquipmentStatus).optional(),
  location: z.string().optional(),
  department: z.string().optional(),
  manufacturer: z.string().optional(),
  installedAfter: z.string().transform(str => new Date(str)).optional(),
  installedBefore: z.string().transform(str => new Date(str)).optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional()
});

const workOrderCreateSchema = z.object({
  equipmentId: z.string().min(1, 'Equipment ID is required'),
  workOrderNum: z.string().optional(),
  workOrderType: z.nativeEnum(WorkOrderType),
  status: z.nativeEnum(WorkOrderStatus).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  description: z.string().min(1, 'Description is required'),
  scheduledStartDate: z.string().transform(str => new Date(str)),
  scheduledEndDate: z.string().transform(str => new Date(str)),
  assignedTechnician: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  pmScheduleId: z.string().optional(),
  instructions: z.string().optional(),
  safetyNotes: z.string().optional(),
  requiredParts: z.array(z.object({
    partNumber: z.string(),
    description: z.string(),
    quantityRequired: z.number().positive(),
    unitCost: z.number().positive().optional(),
    stockLocation: z.string()
  })).optional()
});

const workOrderQuerySchema = z.object({
  equipmentId: z.string().optional(),
  workOrderType: z.nativeEnum(WorkOrderType).optional(),
  status: z.nativeEnum(WorkOrderStatus).optional(),
  priority: z.string().transform(Number).optional(),
  assignedTechnician: z.string().optional(),
  scheduledAfter: z.string().transform(str => new Date(str)).optional(),
  scheduledBefore: z.string().transform(str => new Date(str)).optional(),
  createdAfter: z.string().transform(str => new Date(str)).optional(),
  createdBefore: z.string().transform(str => new Date(str)).optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional()
});

const downtimeEventSchema = z.object({
  equipmentId: z.string().min(1, 'Equipment ID is required'),
  startDateTime: z.string().transform(str => new Date(str)),
  endDateTime: z.string().transform(str => new Date(str)).optional(),
  reason: z.nativeEnum(DowntimeReason),
  description: z.string().min(1, 'Description is required'),
  rootCause: z.string().optional(),
  reportedBy: z.string().min(1, 'Reported by is required'),
  resolvedBy: z.string().optional(),
  workOrderId: z.string().optional(),
  impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  cost: z.number().positive().optional()
});

// Equipment Management Endpoints

/**
 * @swagger
 * /api/testing/maximo/equipment:
 *   post:
 *     summary: Create new equipment record
 *     tags: [Maximo Equipment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, equipmentType, location, department, manufacturer, model, serialNumber]
 *             properties:
 *               assetNum:
 *                 type: string
 *                 description: Asset number (auto-generated if not provided)
 *               description:
 *                 type: string
 *                 description: Equipment description
 *               equipmentType:
 *                 type: string
 *                 enum: [CNC_MACHINE, FURNACE, PRESS, TEST_EQUIPMENT, ASSEMBLY_STATION, INSPECTION_STATION, TOOLING, FIXTURE]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, DOWN, MAINTENANCE, RETIRED, PLANNED]
 *               location:
 *                 type: string
 *                 description: Equipment location
 *               department:
 *                 type: string
 *                 description: Department responsible for equipment
 *               manufacturer:
 *                 type: string
 *                 description: Equipment manufacturer
 *               model:
 *                 type: string
 *                 description: Equipment model
 *               serialNumber:
 *                 type: string
 *                 description: Equipment serial number
 *     responses:
 *       201:
 *         description: Equipment created successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/equipment', async (req, res) => {
  try {
    const equipmentData = equipmentCreateSchema.parse(req.body);
    const result = await maximoSurrogate.createEquipment(equipmentData);

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
 * /api/testing/maximo/equipment:
 *   get:
 *     summary: Query equipment records
 *     tags: [Maximo Equipment]
 *     parameters:
 *       - in: query
 *         name: equipmentType
 *         schema:
 *           type: string
 *           enum: [CNC_MACHINE, FURNACE, PRESS, TEST_EQUIPMENT, ASSEMBLY_STATION, INSPECTION_STATION, TOOLING, FIXTURE]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, DOWN, MAINTENANCE, RETIRED, PLANNED]
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
 *         description: Search in description, asset number, or serial number
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
 *         description: Equipment records retrieved successfully
 */
router.get('/equipment', async (req, res) => {
  try {
    const filter = equipmentQuerySchema.parse(req.query);
    const result = await maximoSurrogate.queryEquipment(filter);
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
 * /api/testing/maximo/equipment/{equipmentId}:
 *   get:
 *     summary: Get equipment by ID
 *     tags: [Maximo Equipment]
 *     parameters:
 *       - in: path
 *         name: equipmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Equipment record retrieved successfully
 *       404:
 *         description: Equipment not found
 */
router.get('/equipment/:equipmentId', async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const result = await maximoSurrogate.getEquipment(equipmentId);

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

/**
 * @swagger
 * /api/testing/maximo/equipment/{equipmentId}:
 *   put:
 *     summary: Update equipment record
 *     tags: [Maximo Equipment]
 *     parameters:
 *       - in: path
 *         name: equipmentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial equipment data to update
 *     responses:
 *       200:
 *         description: Equipment updated successfully
 *       404:
 *         description: Equipment not found
 */
router.put('/equipment/:equipmentId', async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const updates = equipmentUpdateSchema.parse(req.body);
    const result = await maximoSurrogate.updateEquipment(equipmentId, updates);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
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
 * /api/testing/maximo/equipment/{equipmentId}:
 *   delete:
 *     summary: Delete equipment record
 *     tags: [Maximo Equipment]
 *     parameters:
 *       - in: path
 *         name: equipmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Equipment deleted successfully
 *       404:
 *         description: Equipment not found
 *       400:
 *         description: Cannot delete equipment with active work orders
 */
router.delete('/equipment/:equipmentId', async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const result = await maximoSurrogate.deleteEquipment(equipmentId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: ['Internal server error'],
      timestamp: new Date()
    });
  }
});

// Work Order Management Endpoints

/**
 * @swagger
 * /api/testing/maximo/work-orders:
 *   post:
 *     summary: Create new work order
 *     tags: [Maximo Work Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [equipmentId, workOrderType, description, scheduledStartDate, scheduledEndDate]
 *     responses:
 *       201:
 *         description: Work order created successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/work-orders', async (req, res) => {
  try {
    const workOrderData = workOrderCreateSchema.parse(req.body);
    const result = await maximoSurrogate.createWorkOrder(workOrderData);

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

// Health Check Endpoint

/**
 * @swagger
 * /api/testing/maximo/health:
 *   get:
 *     summary: Get Maximo surrogate health status
 *     tags: [Maximo System]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 */
router.get('/health', async (req, res) => {
  try {
    const result = await maximoSurrogate.getHealthStatus();
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
 * /api/testing/maximo/system/reset:
 *   post:
 *     summary: Reset mock data for testing
 *     tags: [Maximo System]
 *     responses:
 *       200:
 *         description: Mock data reset successfully
 */
router.post('/system/reset', async (req, res) => {
  try {
    const result = await maximoSurrogate.resetMockData();
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
maximoSurrogate.on('erpExport', (data) => {
  console.log(`[Maximo → ERP] Exporting ${data.type}:`, data.data);
  // TODO: Integrate with ERP surrogate when available
});

// Event logging for monitoring
maximoSurrogate.on('equipmentCreated', (equipment) => {
  console.log(`[Maximo] Equipment created: ${equipment.assetNum} - ${equipment.description}`);
});

maximoSurrogate.on('workOrderCreated', (workOrder) => {
  console.log(`[Maximo] Work order created: ${workOrder.workOrderNum} for equipment ${workOrder.equipmentId}`);
});

maximoSurrogate.on('equipmentUpdated', (updatedEquipment, originalEquipment) => {
  console.log(`[Maximo] Equipment updated: ${updatedEquipment.assetNum}`);
});

maximoSurrogate.on('equipmentDeleted', (equipment) => {
  console.log(`[Maximo] Equipment deleted: ${equipment.assetNum}`);
});

export default router;