import express from 'express';
import { z } from 'zod';
import prisma from '../lib/database';
import { traceabilityService } from '../services/TraceabilityService';
import { requireProductionAccess, requireSiteAccess } from '../middleware/auth';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const searchSchema = z.object({
  serialNumber: z.string().optional(),
  partNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  workOrderNumber: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const createGenealogySchema = z.object({
  parentSerialNumber: z.string(),
  componentSerialNumber: z.string(),
  assemblyDate: z.string().datetime().optional(),
  assemblyOperator: z.string().optional(),
});

// ===== SPRINT 4 ENHANCED TRACEABILITY APIS =====

/**
 * @route GET /api/v1/traceability/forward/:lotNumber
 * @desc Forward traceability - Find all products made from a specific lot
 * @access Private (Production Access Required)
 */
router.get('/forward/:lotNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { lotNumber } = req.params;

    const result = await traceabilityService.getForwardTraceability(lotNumber);

    logger.info('Forward traceability retrieved', {
      userId: req.user?.id,
      lotNumber,
      productCount: result.totalProducts,
    });

    return res.status(200).json(result);
  })
);

/**
 * @route GET /api/v1/traceability/backward/:serialNumber
 * @desc Backward traceability - Find all materials/components used to make a product
 * @access Private (Production Access Required)
 */
router.get('/backward/:serialNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serialNumber } = req.params;

    const result = await traceabilityService.getBackwardTraceability(serialNumber);

    logger.info('Backward traceability retrieved', {
      userId: req.user?.id,
      serialNumber,
      componentCount: result.totalComponents,
    });

    return res.status(200).json(result);
  })
);

/**
 * @route GET /api/v1/traceability/genealogy-graph/:serialNumber
 * @desc Get genealogy tree as graph (optimized for D3.js visualization)
 * @access Private (Production Access Required)
 */
router.get('/genealogy-graph/:serialNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serialNumber } = req.params;
    const maxDepth = req.query.maxDepth
      ? parseInt(req.query.maxDepth as string, 10)
      : 10;

    const graph = await traceabilityService.getGenealogyGraph(serialNumber, maxDepth);

    logger.info('Genealogy graph generated', {
      userId: req.user?.id,
      serialNumber,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      maxDepth: graph.maxDepth,
    });

    return res.status(200).json(graph);
  })
);

/**
 * @route POST /api/v1/traceability/genealogy
 * @desc Create genealogy relationship between parts
 * @access Private (Production Access Required)
 */
router.post('/genealogy',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validationResult = createGenealogySchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid genealogy data', validationResult.error.errors);
    }

    const { parentSerialNumber, componentSerialNumber, assemblyDate, assemblyOperator } =
      validationResult.data;

    const genealogy = await traceabilityService.createGenealogyRelationship(
      parentSerialNumber,
      componentSerialNumber,
      assemblyDate ? new Date(assemblyDate) : undefined,
      assemblyOperator
    );

    logger.info('Genealogy relationship created', {
      userId: req.user?.id,
      parentSerialNumber,
      componentSerialNumber,
      genealogyId: genealogy.id,
    });

    return res.status(201).json(genealogy);
  })
);

/**
 * @route GET /api/v1/traceability/circular-check/:serialNumber
 * @desc Check if genealogy has circular references
 * @access Private (Production Access Required)
 */
router.get('/circular-check/:serialNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serialNumber } = req.params;

    const hasCircular = await traceabilityService.detectCircularReferences(serialNumber);

    logger.info('Circular reference check', {
      userId: req.user?.id,
      serialNumber,
      hasCircular,
    });

    return res.status(200).json({
      serialNumber,
      hasCircularReferences: hasCircular,
    });
  })
);

// ===== LEGACY ENDPOINTS (Sprint 1-3) =====

/**
 * Helper function to build genealogy tree recursively
 */
async function buildGenealogyTree(serializedPartId: string): Promise<any> {
  const part = await prisma.serializedPart.findUnique({
    where: { id: serializedPartId },
    include: {
      part: true,
      components: {
        include: {
          componentPart: {
            include: {
              part: true
            }
          }
        }
      }
    }
  });

  if (!part) {
    return null;
  }

  // Recursively build children
  const children = await Promise.all(
    part.components.map(async (comp) => {
      return await buildGenealogyTree(comp.componentPartId);
    })
  );

  return {
    id: part.id,
    serialNumber: part.serialNumber,
    partNumber: part.part.partNumber,
    partName: part.part.partName,
    lotNumber: part.lotNumber,
    quantity: 1,
    children: children.filter(Boolean)
  };
}

/**
 * @route GET /api/v1/traceability/serial/:serialNumber
 * @desc Get complete traceability details for a serial number
 * @access Private
 */
router.get('/serial/:serialNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serialNumber } = req.params;

    // Get serialized part with all relationships
    const serializedPart = await prisma.serializedPart.findUnique({
      where: { serialNumber },
      include: {
        part: true
      }
    });

    if (!serializedPart) {
      throw new NotFoundError('Serialized part not found');
    }

    // Get genealogy tree
    const genealogy = await buildGenealogyTree(serializedPart.id);

    // Get manufacturing history (operations from work order)
    const manufacturingHistory = serializedPart.workOrderId
      ? await prisma.workOrderOperation.findMany({
          where: {
            workOrderId: serializedPart.workOrderId,
            status: 'COMPLETED'
          },
          include: {
            routingOperation: {
              include: {
                workCenter: true
              }
            }
          },
          orderBy: {
            startedAt: 'asc'
          }
        })
      : [];

    // Get material certificates from materials used in work order
    const materialCertificates = serializedPart.workOrderId
      ? await prisma.materialTransaction.findMany({
          where: {
            workOrderId: serializedPart.workOrderId,
            transactionType: 'ISSUE'
          },
          include: {
            inventory: {
              include: {
                part: true
              }
            }
          }
        })
      : [];

    // Get quality records (inspections)
    const qualityRecords = serializedPart.workOrderId
      ? await prisma.qualityInspection.findMany({
          where: {
            workOrderId: serializedPart.workOrderId
          },
          orderBy: {
            startedAt: 'asc'
          }
        })
      : [];

    const traceabilityDetails = {
      serialNumber: serializedPart.serialNumber,
      partNumber: serializedPart.part.partNumber,
      partName: serializedPart.part.partName,
      genealogy,
      manufacturingHistory: manufacturingHistory.map(op => ({
        id: op.id,
        operationNumber: op.routingOperation.operationNumber.toString(),
        operationName: op.routingOperation.operationName,
        workOrderNumber: '', // Would need to join work order
        machineId: op.routingOperation.workCenter?.id,
        machineName: op.routingOperation.workCenter?.name,
        operatorId: op.operatorId || '',
        operatorName: '', // Would need to join user
        startTime: op.startedAt?.toISOString() || '',
        endTime: op.completedAt?.toISOString() || '',
        status: op.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        notes: op.notes
      })),
      materialCertificates: materialCertificates.map(mt => ({
        id: mt.id,
        certificateNumber: mt.reference || `CERT-${mt.id.slice(-8)}`,
        supplierName: '', // Would need supplier info
        materialType: mt.inventory.part.partName,
        lotNumber: mt.inventory.lotNumber || '',
        heatNumber: '', // heatNumber not available in Inventory model
        receivedDate: mt.inventory.receivedDate?.toISOString() || '',
        expiryDate: mt.inventory.expiryDate?.toISOString(),
        documentUrl: undefined
      })),
      qualityRecords: qualityRecords.map(qr => ({
        id: qr.id,
        inspectionType: qr.operation,
        inspectionDate: qr.startedAt.toISOString(),
        inspector: qr.inspector,
        result: qr.result,
        notes: qr.notes,
        documentUrl: undefined
      }))
    };

    logger.info('Traceability details retrieved', {
      userId: req.user?.id,
      serialNumber,
      partNumber: serializedPart.part.partNumber
    });

    return res.status(200).json(traceabilityDetails);
  })
);

/**
 * @route GET /api/v1/traceability/genealogy/:serialNumber
 * @desc Get component genealogy tree (backward traceability)
 * @access Private
 */
router.get('/genealogy/:serialNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serialNumber } = req.params;

    const serializedPart = await prisma.serializedPart.findUnique({
      where: { serialNumber }
    });

    if (!serializedPart) {
      throw new NotFoundError('Serialized part not found');
    }

    const genealogy = await buildGenealogyTree(serializedPart.id);

    logger.info('Genealogy tree retrieved', {
      userId: req.user?.id,
      serialNumber
    });

    return res.status(200).json(genealogy);
  })
);

/**
 * @route GET /api/v1/traceability/history/:serialNumber
 * @desc Get manufacturing history timeline for a serial number
 * @access Private
 */
router.get('/history/:serialNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serialNumber } = req.params;

    const serializedPart = await prisma.serializedPart.findUnique({
      where: { serialNumber }
    });

    if (!serializedPart) {
      throw new NotFoundError('Serialized part not found');
    }

    if (!serializedPart.workOrderId) {
      return res.status(200).json([]);
    }

    const operations = await prisma.workOrderOperation.findMany({
      where: {
        workOrderId: serializedPart.workOrderId,
        status: 'COMPLETED'
      },
      include: {
        routingOperation: {
          include: {
            workCenter: true
          }
        },
        workOrder: true
      },
      orderBy: {
        startedAt: 'asc'
      }
    });

    const manufacturingHistory = operations.map(op => ({
      id: op.id,
      operationNumber: op.routingOperation.operationNumber.toString(),
      operationName: op.routingOperation.operationName,
      workOrderNumber: op.workOrder.workOrderNumber,
      machineId: op.routingOperation.workCenter?.id,
      machineName: op.routingOperation.workCenter?.name,
      operatorId: op.operatorId || '',
      operatorName: '', // Would need to join user table
      startTime: op.startedAt?.toISOString() || '',
      endTime: op.completedAt?.toISOString() || '',
      status: op.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
      notes: op.notes
    }));

    logger.info('Manufacturing history retrieved', {
      userId: req.user?.id,
      serialNumber,
      operationCount: manufacturingHistory.length
    });

    return res.status(200).json(manufacturingHistory);
  })
);

/**
 * @route GET /api/v1/traceability/certificates/:serialNumber
 * @desc Get material certificates for a serial number
 * @access Private
 */
router.get('/certificates/:serialNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serialNumber } = req.params;

    const serializedPart = await prisma.serializedPart.findUnique({
      where: { serialNumber }
    });

    if (!serializedPart) {
      throw new NotFoundError('Serialized part not found');
    }

    if (!serializedPart.workOrderId) {
      return res.status(200).json([]);
    }

    const materialTransactions = await prisma.materialTransaction.findMany({
      where: {
        workOrderId: serializedPart.workOrderId,
        transactionType: 'ISSUE'
      },
      include: {
        inventory: {
          include: {
            part: true
          }
        }
      }
    });

    const certificates = materialTransactions.map(mt => ({
      id: mt.id,
      certificateNumber: mt.reference || `CERT-${mt.id.slice(-8)}`,
      supplierName: '', // Would need supplier relationship
      materialType: mt.inventory.part.partName,
      lotNumber: mt.inventory.lotNumber || '',
      heatNumber: '', // heatNumber not available in Inventory model
      receivedDate: mt.inventory.receivedDate?.toISOString() || '',
      expiryDate: mt.inventory.expiryDate?.toISOString(),
      documentUrl: undefined
    }));

    logger.info('Material certificates retrieved', {
      userId: req.user?.id,
      serialNumber,
      certificateCount: certificates.length
    });

    return res.status(200).json(certificates);
  })
);

/**
 * @route GET /api/v1/traceability/quality/:serialNumber
 * @desc Get quality records for a serial number
 * @access Private
 */
router.get('/quality/:serialNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serialNumber } = req.params;

    const serializedPart = await prisma.serializedPart.findUnique({
      where: { serialNumber }
    });

    if (!serializedPart) {
      throw new NotFoundError('Serialized part not found');
    }

    if (!serializedPart.workOrderId) {
      return res.status(200).json([]);
    }

    const qualityInspections = await prisma.qualityInspection.findMany({
      where: {
        workOrderId: serializedPart.workOrderId
      },
      orderBy: {
        startedAt: 'asc'
      }
    });

    const qualityRecords = qualityInspections.map(qr => ({
      id: qr.id,
      inspectionType: qr.operation,
      inspectionDate: qr.startedAt.toISOString(),
      inspector: qr.inspector,
      result: qr.result,
      notes: qr.notes,
      documentUrl: undefined
    }));

    logger.info('Quality records retrieved', {
      userId: req.user?.id,
      serialNumber,
      recordCount: qualityRecords.length
    });

    return res.status(200).json(qualityRecords);
  })
);

/**
 * @route GET /api/v1/traceability/forward-legacy/:materialLot
 * @desc Forward traceability (legacy) - find where a material lot was used
 * @access Private
 * @deprecated Use GET /forward/:lotNumber instead
 */
router.get('/forward-legacy/:materialLot',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { materialLot } = req.params;

    // Find inventory with this lot number
    const inventory = await prisma.inventory.findFirst({
      where: {
        lotNumber: materialLot
      }
    });

    if (!inventory) {
      throw new NotFoundError('Material lot not found');
    }

    // Find material transactions where this lot was issued
    const transactions = await prisma.materialTransaction.findMany({
      where: {
        inventoryId: inventory.id,
        transactionType: 'ISSUE',
        workOrderId: { not: null }
      },
      include: {
        workOrder: {
          include: {
            part: true
          }
        }
      }
    });

    // Find serialized parts from those work orders
    const usedInParts = await Promise.all(
      transactions.map(async (tx) => {
        if (!tx.workOrderId) return null;

        const serializedParts = await prisma.serializedPart.findMany({
          where: {
            workOrderId: tx.workOrderId
          },
          include: {
            part: true
          }
        });

        return serializedParts.map(sp => ({
          serialNumber: sp.serialNumber,
          partNumber: sp.part.partNumber,
          partName: sp.part.partName,
          workOrderNumber: tx.workOrder?.workOrderNumber || '',
          dateUsed: tx.transactionDate.toISOString()
        }));
      })
    );

    const result = {
      materialLot,
      usedInParts: usedInParts.flat().filter(Boolean)
    };

    logger.info('Forward traceability retrieved', {
      userId: req.user?.id,
      materialLot,
      usageCount: result.usedInParts.length
    });

    return res.status(200).json(result);
  })
);

/**
 * @route GET /api/v1/traceability/search
 * @desc Search for traceability records with filters
 * @access Private
 */
router.get('/search',
  requireProductionAccess,
  requireSiteAccess,
  asyncHandler(async (req, res) => {
    const validationResult = searchSchema.safeParse(req.query);
    if (!validationResult.success) {
      throw new ValidationError('Invalid search parameters', validationResult.error.errors);
    }

    const {
      serialNumber,
      partNumber,
      lotNumber,
      workOrderNumber,
      startDate,
      endDate
    } = validationResult.data;

    // Build where clause
    const where: any = {
      ...(serialNumber && { serialNumber: { contains: serialNumber } }),
      ...(lotNumber && { lotNumber: { contains: lotNumber } }),
      ...(partNumber && {
        part: { partNumber: { contains: partNumber } }
      }),
      ...(startDate && endDate && {
        manufactureDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const results = await prisma.serializedPart.findMany({
      where,
      include: {
        part: true
      },
      take: 100,
      orderBy: {
        createdAt: 'desc'
      }
    });

    const searchResults = results.map(sp => ({
      serialNumber: sp.serialNumber,
      partNumber: sp.part.partNumber,
      partName: sp.part.partName
    }));

    logger.info('Traceability search executed', {
      userId: req.user?.id,
      filters: validationResult.data,
      resultCount: searchResults.length
    });

    return res.status(200).json(searchResults);
  })
);

export default router;