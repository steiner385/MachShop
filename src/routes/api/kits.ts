/**
 * Kit Management API Routes
 *
 * RESTful API endpoints for kit generation, staging, workflow management,
 * and shortage identification. Integrates with all kitting services.
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { KitGenerationService } from '../../services/KitGenerationService';
import { StagingLocationService } from '../../services/StagingLocationService';
import { KitWorkflowService } from '../../services/KitWorkflowService';
import { KitShortageService } from '../../services/KitShortageService';
import { BarcodeScanningService } from '../../services/BarcodeScanningService';
import { logger } from '../../utils/logger';
import { validateRequest, authenticateUser, requirePermission } from '../../middleware';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Initialize services
const kitGenerationService = new KitGenerationService(prisma);
const stagingLocationService = new StagingLocationService(prisma);
const kitWorkflowService = new KitWorkflowService(prisma);
const kitShortageService = new KitShortageService(prisma);
const barcodeScanningService = new BarcodeScanningService(prisma);

// Validation schemas
const kitGenerationSchema = z.object({
  workOrderId: z.string(),
  operationId: z.string().optional(),
  assemblyStage: z.string().optional(),
  workCellId: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
  scrapFactor: z.number().min(0).max(1).optional(),
  autoStage: z.boolean().optional(),
  includeTools: z.boolean().optional(),
  vendorKitHandling: z.enum(['include', 'separate', 'exclude']).optional(),
  maxKitSize: z.number().positive().optional()
});

const statusTransitionSchema = z.object({
  newStatus: z.enum(['PLANNED', 'STAGING', 'STAGED', 'ISSUED', 'PARTIAL', 'CONSUMED', 'RETURNED', 'CANCELLED', 'ON_HOLD']),
  reason: z.string().optional(),
  notes: z.string().optional(),
  validationData: z.object({
    scannedItems: z.array(z.object({
      kitItemId: z.string(),
      partNumber: z.string(),
      scannedQuantity: z.number(),
      location: z.string().optional(),
      batchNumber: z.string().optional(),
      serialNumber: z.string().optional()
    })).optional(),
    locationVerified: z.boolean().optional(),
    qualityCheck: z.boolean().optional(),
    signatureRequired: z.boolean().optional(),
    photosRequired: z.boolean().optional()
  }).optional()
});

const barcodeScanSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  expectedType: z.enum(['kit', 'part', 'location', 'serial', 'batch']).optional(),
  operatorId: z.string().optional(),
  scanLocation: z.string().optional()
});

const qrCodeGenerationSchema = z.object({
  entityType: z.enum(['kit', 'part', 'location']),
  entityId: z.string(),
  format: z.enum(['json', 'simple']).default('json'),
  size: z.number().min(100).max(1000).default(256)
});

const stagingAssignmentSchema = z.object({
  workCellId: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
  requiresCleanRoom: z.boolean().optional(),
  requiresHazmatHandling: z.boolean().optional(),
  requiresHighSecurity: z.boolean().optional(),
  preferredLocationId: z.string().optional(),
  maxDistance: z.number().optional(),
  environmentalRequirements: z.object({
    temperatureMin: z.number().optional(),
    temperatureMax: z.number().optional(),
    humidityMax: z.number().optional(),
    esdProtection: z.boolean().optional(),
    climateControl: z.boolean().optional()
  }).optional()
});

/**
 * Kit Generation Endpoints
 */

// POST /api/kits/generate - Generate kits for work order
router.post('/generate',
  authenticateUser,
  requirePermission('kit:create'),
  validateRequest(kitGenerationSchema),
  async (req, res) => {
    try {
      logger.info('Kit generation requested', {
        workOrderId: req.body.workOrderId,
        userId: req.user.id
      });

      const result = await kitGenerationService.generateKitsForWorkOrder(req.body);

      res.status(201).json({
        success: true,
        message: `Generated ${result.kits.length} kit(s) for work order`,
        data: {
          kits: result.kits.map(kit => ({
            id: kit.id,
            kitNumber: kit.kitNumber,
            kitName: kit.kitName,
            status: kit.status,
            assemblyStage: kit.assemblyStage
          })),
          analysis: result.analysis,
          shortages: result.shortages,
          warnings: result.warnings,
          estimatedStagingTime: result.estimatedStagingTime
        }
      });

    } catch (error) {
      logger.error('Kit generation failed', { error, workOrderId: req.body.workOrderId });
      res.status(400).json({
        success: false,
        message: 'Kit generation failed',
        error: error.message
      });
    }
  }
);

/**
 * Kit Management Endpoints
 */

// GET /api/kits - List kits with filtering
router.get('/',
  authenticateUser,
  requirePermission('kit:read'),
  async (req, res) => {
    try {
      const {
        workOrderId,
        status,
        assemblyStage,
        priority,
        stagingLocationId,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const whereClause: any = {};
      if (workOrderId) whereClause.workOrderId = workOrderId;
      if (status) whereClause.status = status;
      if (assemblyStage) whereClause.assemblyStage = assemblyStage;
      if (priority) whereClause.priority = priority;
      if (stagingLocationId) whereClause.stagingLocationId = stagingLocationId;

      const [kits, totalCount] = await Promise.all([
        prisma.kit.findMany({
          where: whereClause,
          include: {
            workOrder: {
              select: {
                workOrderNumber: true,
                part: {
                  select: { partNumber: true, partName: true }
                }
              }
            },
            stagingLocation: {
              select: { locationCode: true, locationName: true }
            },
            kitItems: {
              select: {
                id: true,
                requiredQuantity: true,
                stagedQuantity: true,
                status: true
              }
            },
            _count: {
              select: { kitItems: true }
            }
          },
          skip,
          take,
          orderBy: { [sortBy as string]: sortOrder }
        }),
        prisma.kit.count({ where: whereClause })
      ]);

      res.json({
        success: true,
        data: {
          kits: kits.map(kit => ({
            ...kit,
            itemCount: kit._count.kitItems,
            completionPercent: kit.completionPercent || 0
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            totalCount,
            totalPages: Math.ceil(totalCount / Number(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Error listing kits', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve kits',
        error: error.message
      });
    }
  }
);

// GET /api/kits/:id - Get kit details
router.get('/:id',
  authenticateUser,
  requirePermission('kit:read'),
  async (req, res) => {
    try {
      const kit = await prisma.kit.findUnique({
        where: { id: req.params.id },
        include: {
          workOrder: {
            include: {
              part: true
            }
          },
          operation: true,
          stagingLocation: {
            include: {
              area: true
            }
          },
          kitItems: {
            include: {
              part: {
                select: {
                  partNumber: true,
                  partName: true,
                  unitOfMeasure: true,
                  standardCost: true
                }
              },
              bomItem: {
                select: {
                  findNumber: true,
                  referenceDesignator: true,
                  sequence: true
                }
              }
            },
            orderBy: { sequence: 'asc' }
          },
          statusHistory: {
            include: {
              changedBy: {
                select: { firstName: true, lastName: true }
              }
            },
            orderBy: { changedAt: 'desc' }
          },
          shortageAlerts: {
            where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
            include: {
              part: {
                select: { partNumber: true, partName: true }
              }
            }
          }
        }
      });

      if (!kit) {
        return res.status(404).json({
          success: false,
          message: 'Kit not found'
        });
      }

      res.json({
        success: true,
        data: kit
      });

    } catch (error) {
      logger.error('Error retrieving kit details', { error, kitId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve kit details',
        error: error.message
      });
    }
  }
);

/**
 * Kit Workflow Endpoints
 */

// POST /api/kits/:id/transition - Transition kit status
router.post('/:id/transition',
  authenticateUser,
  requirePermission('kit:update'),
  validateRequest(statusTransitionSchema),
  async (req, res) => {
    try {
      const result = await kitWorkflowService.transitionKitStatus({
        kitId: req.params.id,
        userId: req.user.id,
        ...req.body
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Status transition validation failed',
          validationResults: result.validationResults,
          warnings: result.warnings
        });
      }

      res.json({
        success: true,
        message: `Kit status transitioned to ${result.newStatus}`,
        data: {
          newStatus: result.newStatus,
          validationResults: result.validationResults,
          nextActions: result.nextActions,
          warnings: result.warnings
        }
      });

    } catch (error) {
      logger.error('Kit status transition failed', { error, kitId: req.params.id });
      res.status(400).json({
        success: false,
        message: 'Status transition failed',
        error: error.message
      });
    }
  }
);

// POST /api/kits/:id/consume - Process item consumption
router.post('/:id/consume',
  authenticateUser,
  requirePermission('kit:update'),
  async (req, res) => {
    try {
      const { itemConsumption } = req.body;

      if (!Array.isArray(itemConsumption)) {
        return res.status(400).json({
          success: false,
          message: 'itemConsumption must be an array'
        });
      }

      const result = await kitWorkflowService.processItemConsumption(
        req.params.id,
        itemConsumption,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Item consumption processed',
        data: {
          newStatus: result.newStatus,
          nextActions: result.nextActions
        }
      });

    } catch (error) {
      logger.error('Item consumption processing failed', { error, kitId: req.params.id });
      res.status(400).json({
        success: false,
        message: 'Item consumption processing failed',
        error: error.message
      });
    }
  }
);

// POST /api/kits/:id/return - Process kit return
router.post('/:id/return',
  authenticateUser,
  requirePermission('kit:update'),
  async (req, res) => {
    try {
      const { returnedItems, returnReason } = req.body;

      if (!returnReason) {
        return res.status(400).json({
          success: false,
          message: 'Return reason is required'
        });
      }

      const result = await kitWorkflowService.processKitReturn(
        req.params.id,
        returnedItems || [],
        returnReason,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Kit return processed',
        data: {
          newStatus: result.newStatus,
          nextActions: result.nextActions
        }
      });

    } catch (error) {
      logger.error('Kit return processing failed', { error, kitId: req.params.id });
      res.status(400).json({
        success: false,
        message: 'Kit return processing failed',
        error: error.message
      });
    }
  }
);

/**
 * Staging Location Endpoints
 */

// POST /api/kits/:id/staging/optimize - Find optimal staging location
router.post('/:id/staging/optimize',
  authenticateUser,
  requirePermission('kit:stage'),
  validateRequest(stagingAssignmentSchema),
  async (req, res) => {
    try {
      const result = await stagingLocationService.findOptimalLocation({
        kitId: req.params.id,
        ...req.body
      });

      res.json({
        success: true,
        message: 'Optimal staging location identified',
        data: {
          recommendedLocation: result.recommendedLocation,
          score: result.score,
          alternativeLocations: result.alternativeLocations,
          estimatedAssignmentTime: result.estimatedAssignmentTime,
          warnings: result.warnings
        }
      });

    } catch (error) {
      logger.error('Staging location optimization failed', { error, kitId: req.params.id });
      res.status(400).json({
        success: false,
        message: 'Staging location optimization failed',
        error: error.message
      });
    }
  }
);

// POST /api/kits/:id/staging/assign - Assign kit to staging location
router.post('/:id/staging/assign',
  authenticateUser,
  requirePermission('kit:stage'),
  async (req, res) => {
    try {
      const { locationId } = req.body;

      if (!locationId) {
        return res.status(400).json({
          success: false,
          message: 'locationId is required'
        });
      }

      await stagingLocationService.assignKitToLocation(
        req.params.id,
        locationId,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Kit assigned to staging location'
      });

    } catch (error) {
      logger.error('Kit staging assignment failed', { error, kitId: req.params.id });
      res.status(400).json({
        success: false,
        message: 'Kit staging assignment failed',
        error: error.message
      });
    }
  }
);

/**
 * Shortage Management Endpoints
 */

// POST /api/kits/shortages/analyze - Analyze material shortages
router.post('/shortages/analyze',
  authenticateUser,
  requirePermission('kit:shortage'),
  async (req, res) => {
    try {
      const result = await kitShortageService.identifyShortages(req.body);

      res.json({
        success: true,
        message: 'Shortage analysis completed',
        data: result
      });

    } catch (error) {
      logger.error('Shortage analysis failed', { error });
      res.status(500).json({
        success: false,
        message: 'Shortage analysis failed',
        error: error.message
      });
    }
  }
);

// GET /api/kits/shortages/dashboard - Get shortage dashboard
router.get('/shortages/dashboard',
  authenticateUser,
  requirePermission('kit:shortage'),
  async (req, res) => {
    try {
      const dashboard = await kitShortageService.getShortagesDashboard(req.query as any);

      res.json({
        success: true,
        data: dashboard
      });

    } catch (error) {
      logger.error('Error retrieving shortage dashboard', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve shortage dashboard',
        error: error.message
      });
    }
  }
);

// GET /api/kits/shortages/parts/:partId - Get part shortage details
router.get('/shortages/parts/:partId',
  authenticateUser,
  requirePermission('kit:shortage'),
  async (req, res) => {
    try {
      const { lookaheadDays = 30 } = req.query;

      const shortage = await kitShortageService.getPartShortageDetails(
        req.params.partId,
        Number(lookaheadDays)
      );

      if (!shortage) {
        return res.json({
          success: true,
          message: 'No shortage identified for this part',
          data: null
        });
      }

      res.json({
        success: true,
        data: shortage
      });

    } catch (error) {
      logger.error('Error retrieving part shortage details', { error, partId: req.params.partId });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve part shortage details',
        error: error.message
      });
    }
  }
);

/**
 * Analytics and Metrics Endpoints
 */

// GET /api/kits/metrics - Get kit metrics and analytics
router.get('/metrics',
  authenticateUser,
  requirePermission('kit:analytics'),
  async (req, res) => {
    try {
      const filters: any = {};

      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      if (req.query.workOrderId) filters.workOrderId = req.query.workOrderId;
      if (req.query.assemblyStage) filters.assemblyStage = req.query.assemblyStage;

      const metrics = await kitWorkflowService.getKitMetrics(filters);

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      logger.error('Error retrieving kit metrics', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve kit metrics',
        error: error.message
      });
    }
  }
);

// GET /api/kits/staging/utilization - Get staging location utilization
router.get('/staging/utilization',
  authenticateUser,
  requirePermission('kit:analytics'),
  async (req, res) => {
    try {
      const { areaId } = req.query;

      const utilization = await stagingLocationService.getLocationUtilization(
        areaId as string
      );

      res.json({
        success: true,
        data: utilization
      });

    } catch (error) {
      logger.error('Error retrieving staging utilization', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staging utilization',
        error: error.message
      });
    }
  }
);

/**
 * Barcode Scanning Endpoints
 */

// POST /api/kits/scan/kit - Scan a kit barcode
router.post('/scan/kit',
  authenticateUser,
  requirePermission('kit:scan'),
  validateRequest(barcodeScanSchema),
  async (req, res) => {
    try {
      const { barcode, operatorId, scanLocation } = req.body;

      const result = await barcodeScanningService.scanKit(
        barcode,
        operatorId || req.user.id
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Kit scan failed',
          validation: result.validation,
          nextActions: result.nextActions,
          warnings: result.warnings
        });
      }

      logger.info('Kit scan successful', {
        kitId: result.kit?.id,
        kitNumber: result.kit?.kitNumber,
        operatorId: operatorId || req.user.id,
        scanLocation
      });

      res.json({
        success: true,
        message: 'Kit scanned successfully',
        data: {
          kit: result.kit,
          nextActions: result.nextActions,
          warnings: result.warnings
        }
      });

    } catch (error) {
      logger.error('Kit scan error', { error, barcode: req.body.barcode });
      res.status(500).json({
        success: false,
        message: 'Kit scan failed',
        error: error.message
      });
    }
  }
);

// POST /api/kits/scan/part - Scan a part barcode
router.post('/scan/part',
  authenticateUser,
  requirePermission('kit:scan'),
  validateRequest(barcodeScanSchema),
  async (req, res) => {
    try {
      const { barcode, operatorId, scanLocation } = req.body;

      const result = await barcodeScanningService.scanPart(
        barcode,
        operatorId || req.user.id
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Part scan failed',
          validation: result.validation,
          alternativeParts: result.alternativeParts
        });
      }

      logger.info('Part scan successful', {
        partId: result.part?.id,
        partNumber: result.part?.partNumber,
        operatorId: operatorId || req.user.id,
        scanLocation
      });

      res.json({
        success: true,
        message: 'Part scanned successfully',
        data: {
          part: result.part,
          inventory: result.inventory,
          location: result.location,
          alternativeParts: result.alternativeParts,
          kitAssociations: result.kitAssociations
        }
      });

    } catch (error) {
      logger.error('Part scan error', { error, barcode: req.body.barcode });
      res.status(500).json({
        success: false,
        message: 'Part scan failed',
        error: error.message
      });
    }
  }
);

// POST /api/kits/scan/location - Scan a location barcode
router.post('/scan/location',
  authenticateUser,
  requirePermission('kit:scan'),
  validateRequest(barcodeScanSchema),
  async (req, res) => {
    try {
      const { barcode, operatorId, scanLocation } = req.body;

      const result = await barcodeScanningService.scanLocation(
        barcode,
        operatorId || req.user.id
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Location scan failed',
          validation: result.validation
        });
      }

      logger.info('Location scan successful', {
        locationId: result.location?.id,
        locationCode: result.location?.locationCode,
        operatorId: operatorId || req.user.id,
        scanLocation
      });

      res.json({
        success: true,
        message: 'Location scanned successfully',
        data: {
          location: result.location,
          currentKits: result.currentKits,
          capacity: result.capacity
        }
      });

    } catch (error) {
      logger.error('Location scan error', { error, barcode: req.body.barcode });
      res.status(500).json({
        success: false,
        message: 'Location scan failed',
        error: error.message
      });
    }
  }
);

// POST /api/kits/scan/validate - Validate any barcode
router.post('/scan/validate',
  authenticateUser,
  requirePermission('kit:scan'),
  validateRequest(barcodeScanSchema),
  async (req, res) => {
    try {
      const { barcode, expectedType } = req.body;

      const validation = await barcodeScanningService.parseBarcodeData(
        barcode,
        expectedType
      );

      res.json({
        success: validation.isValid,
        message: validation.isValid ? 'Barcode is valid' : 'Barcode validation failed',
        validation
      });

    } catch (error) {
      logger.error('Barcode validation error', { error, barcode: req.body.barcode });
      res.status(500).json({
        success: false,
        message: 'Barcode validation failed',
        error: error.message
      });
    }
  }
);

/**
 * QR Code Generation Endpoints
 */

// POST /api/kits/qr/generate - Generate QR code data
router.post('/qr/generate',
  authenticateUser,
  requirePermission('kit:read'),
  validateRequest(qrCodeGenerationSchema),
  async (req, res) => {
    try {
      const { entityType, entityId, format, size } = req.body;

      let qrData: string;
      let entity: any;

      switch (entityType) {
        case 'kit':
          entity = await prisma.kit.findUnique({
            where: { id: entityId },
            include: {
              workOrder: { select: { workOrderNumber: true } }
            }
          });
          if (!entity) {
            return res.status(404).json({
              success: false,
              message: 'Kit not found'
            });
          }
          qrData = barcodeScanningService.generateKitQRData(entity);
          break;

        case 'part':
          entity = await prisma.part.findUnique({
            where: { id: entityId }
          });
          if (!entity) {
            return res.status(404).json({
              success: false,
              message: 'Part not found'
            });
          }
          qrData = barcodeScanningService.generatePartQRData(entity);
          break;

        case 'location':
          entity = await prisma.stagingLocation.findUnique({
            where: { id: entityId },
            include: { area: true }
          });
          if (!entity) {
            return res.status(404).json({
              success: false,
              message: 'Location not found'
            });
          }
          qrData = JSON.stringify({
            type: 'location',
            id: entity.id,
            locationCode: entity.locationCode,
            locationName: entity.locationName,
            generated: new Date().toISOString()
          });
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid entity type'
          });
      }

      logger.info('QR code generated', {
        entityType,
        entityId,
        format,
        size,
        operatorId: req.user.id
      });

      res.json({
        success: true,
        message: 'QR code data generated',
        data: {
          qrData,
          format,
          size,
          entity: {
            type: entityType,
            id: entityId
          }
        }
      });

    } catch (error) {
      logger.error('QR code generation error', { error, body: req.body });
      res.status(500).json({
        success: false,
        message: 'QR code generation failed',
        error: error.message
      });
    }
  }
);

// GET /api/kits/:id/qr - Get QR code data for a specific kit
router.get('/:id/qr',
  authenticateUser,
  requirePermission('kit:read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { format = 'json', size = 256 } = req.query;

      const kit = await prisma.kit.findUnique({
        where: { id },
        include: {
          workOrder: { select: { workOrderNumber: true } },
          stagingLocation: { select: { locationCode: true } }
        }
      });

      if (!kit) {
        return res.status(404).json({
          success: false,
          message: 'Kit not found'
        });
      }

      const qrData = barcodeScanningService.generateKitQRData(kit);

      res.json({
        success: true,
        data: {
          kitId: kit.id,
          kitNumber: kit.kitNumber,
          qrData,
          format,
          size: Number(size)
        }
      });

    } catch (error) {
      logger.error('Kit QR code generation error', { error, kitId: req.params.id });
      res.status(500).json({
        success: false,
        message: 'Failed to generate kit QR code',
        error: error.message
      });
    }
  }
);

export default router;