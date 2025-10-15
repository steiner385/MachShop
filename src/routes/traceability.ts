import express from 'express';
import { z } from 'zod';
import prisma from '../lib/database';
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
    partName: part.part.name,
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
                operation: true,
                equipment: true
              }
            }
          },
          orderBy: {
            actualStartTime: 'asc'
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
                material: true
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
      partName: serializedPart.part.name,
      genealogy,
      manufacturingHistory: manufacturingHistory.map(op => ({
        id: op.id,
        operationNumber: op.routingOperation.sequenceNumber.toString(),
        operationName: op.routingOperation.operation.name,
        workOrderNumber: '', // Would need to join work order
        machineId: op.routingOperation.equipment?.id,
        machineName: op.routingOperation.equipment?.name,
        operatorId: op.operatorId || '',
        operatorName: '', // Would need to join user
        startTime: op.actualStartTime?.toISOString() || '',
        endTime: op.actualEndTime?.toISOString() || '',
        status: op.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        notes: op.notes
      })),
      materialCertificates: materialCertificates.map(mt => ({
        id: mt.id,
        certificateNumber: mt.reference || `CERT-${mt.id.slice(-8)}`,
        supplierName: '', // Would need supplier info
        materialType: mt.inventory.material.name,
        lotNumber: mt.inventory.lotNumber || '',
        heatNumber: mt.inventory.heatNumber,
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

    res.status(200).json(traceabilityDetails);
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

    res.status(200).json(genealogy);
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
            operation: true,
            equipment: true
          }
        },
        workOrder: true
      },
      orderBy: {
        actualStartTime: 'asc'
      }
    });

    const manufacturingHistory = operations.map(op => ({
      id: op.id,
      operationNumber: op.routingOperation.sequenceNumber.toString(),
      operationName: op.routingOperation.operation.name,
      workOrderNumber: op.workOrder.workOrderNumber,
      machineId: op.routingOperation.equipment?.id,
      machineName: op.routingOperation.equipment?.name,
      operatorId: op.operatorId || '',
      operatorName: '', // Would need to join user table
      startTime: op.actualStartTime?.toISOString() || '',
      endTime: op.actualEndTime?.toISOString() || '',
      status: op.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
      notes: op.notes
    }));

    logger.info('Manufacturing history retrieved', {
      userId: req.user?.id,
      serialNumber,
      operationCount: manufacturingHistory.length
    });

    res.status(200).json(manufacturingHistory);
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
            material: true
          }
        }
      }
    });

    const certificates = materialTransactions.map(mt => ({
      id: mt.id,
      certificateNumber: mt.reference || `CERT-${mt.id.slice(-8)}`,
      supplierName: '', // Would need supplier relationship
      materialType: mt.inventory.material.name,
      lotNumber: mt.inventory.lotNumber || '',
      heatNumber: mt.inventory.heatNumber,
      receivedDate: mt.inventory.receivedDate?.toISOString() || '',
      expiryDate: mt.inventory.expiryDate?.toISOString(),
      documentUrl: undefined
    }));

    logger.info('Material certificates retrieved', {
      userId: req.user?.id,
      serialNumber,
      certificateCount: certificates.length
    });

    res.status(200).json(certificates);
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

    res.status(200).json(qualityRecords);
  })
);

/**
 * @route GET /api/v1/traceability/forward/:materialLot
 * @desc Forward traceability - find where a material lot was used
 * @access Private
 */
router.get('/forward/:materialLot',
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
          partName: sp.part.name,
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

    res.status(200).json(result);
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
      partName: sp.part.name
    }));

    logger.info('Traceability search executed', {
      userId: req.user?.id,
      filters: validationResult.data,
      resultCount: searchResults.length
    });

    res.status(200).json(searchResults);
  })
);

export default router;