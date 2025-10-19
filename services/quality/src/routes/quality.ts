/**
 * Quality Service Routes
 * HTTP endpoints for quality management (inspections, NCRs, FAI)
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  InspectionStatus,
  InspectionResult,
  NCRStatus,
  FAIStatus,
  CreateInspectionRequest,
  UpdateInspectionRequest,
  CreateNCRRequest,
  UpdateNCRRequest,
  CreateFAIRequest,
  UpdateFAIRequest,
  InspectionListResponse,
  NCRListResponse,
  FAIListResponse,
  DashboardMetrics
} from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// Quality Inspections
// ============================================================================

/**
 * GET /api/v1/quality/inspections
 * Get filtered list of inspections with pagination
 */
router.get('/inspections', async (req: Request, res: Response) => {
  try {
    const {
      status,
      result,
      inspectionType,
      partId,
      workOrderId,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const where: any = {};
    if (status) where.status = status;
    if (result) where.result = result;
    if (inspectionType) where.inspectionType = inspectionType;
    if (partId) where.partId = partId;
    if (workOrderId) where.workOrderId = workOrderId;

    // Execute query
    const [inspections, total] = await Promise.all([
      prisma.qualityInspection.findMany({
        where,
        include: {
          plan: true,
          measurements: true,
          signatures: true
        },
        orderBy: { inspectionDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.qualityInspection.count({ where })
    ]);

    const response: InspectionListResponse = {
      inspections,
      total,
      page: pageNum,
      limit: limitNum
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[INSPECTIONS] Error fetching inspections:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch inspections'
    });
  }
});

/**
 * GET /api/v1/quality/inspections/:id
 * Get single inspection by ID
 */
router.get('/inspections/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const inspection = await prisma.qualityInspection.findUnique({
      where: { id },
      include: {
        plan: {
          include: {
            characteristics: true
          }
        },
        measurements: {
          include: {
            characteristic: true
          }
        },
        signatures: true
      }
    });

    if (!inspection) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Inspection ${id} not found`
      });
    }

    res.status(200).json(inspection);
  } catch (error: any) {
    console.error('[INSPECTIONS] Error fetching inspection:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch inspection'
    });
  }
});

/**
 * POST /api/v1/quality/inspections
 * Create new inspection
 */
router.post('/inspections', async (req: Request, res: Response) => {
  try {
    const request: CreateInspectionRequest = req.body;

    // TODO: Add validation

    // Generate inspection number
    const inspectionNumber = await generateInspectionNumber();

    const inspection = await prisma.qualityInspection.create({
      data: {
        inspectionNumber,
        planId: request.planId,
        workOrderId: request.workOrderId,
        partId: request.partId,
        lotNumber: request.lotNumber,
        serialNumber: request.serialNumber,
        inspectionType: request.inspectionType,
        inspectionDate: new Date(request.inspectionDate),
        inspectorId: 'demo-inspector', // TODO: Get from auth context
        status: InspectionStatus.PENDING,
        result: InspectionResult.PENDING,
        quantityInspected: request.quantityInspected,
        quantityAccepted: 0,
        quantityRejected: 0,
        notes: request.notes,
        attachmentUrls: []
      },
      include: {
        plan: true
      }
    });

    res.status(201).json(inspection);
  } catch (error: any) {
    console.error('[INSPECTIONS] Error creating inspection:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create inspection'
    });
  }
});

/**
 * PUT /api/v1/quality/inspections/:id
 * Update inspection
 */
router.put('/inspections/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: UpdateInspectionRequest = req.body;

    const inspection = await prisma.qualityInspection.update({
      where: { id },
      data: {
        ...updates
      },
      include: {
        plan: true,
        measurements: true
      }
    });

    res.status(200).json(inspection);
  } catch (error: any) {
    console.error('[INSPECTIONS] Error updating inspection:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update inspection'
    });
  }
});

/**
 * DELETE /api/v1/quality/inspections/:id
 * Delete inspection
 */
router.delete('/inspections/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.qualityInspection.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('[INSPECTIONS] Error deleting inspection:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete inspection'
    });
  }
});

// ============================================================================
// Non-Conformance Reports (NCRs)
// ============================================================================

/**
 * GET /api/v1/quality/ncrs
 * Get filtered list of NCRs with pagination
 */
router.get('/ncrs', async (req: Request, res: Response) => {
  try {
    const {
      status,
      ncrType,
      severity,
      partId,
      workOrderId,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const where: any = {};
    if (status) where.status = status;
    if (ncrType) where.ncrType = ncrType;
    if (severity) where.severity = severity;
    if (partId) where.partId = partId;
    if (workOrderId) where.workOrderId = workOrderId;

    // Execute query
    const [ncrs, total] = await Promise.all([
      prisma.nCR.findMany({
        where,
        include: {
          signatures: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.nCR.count({ where })
    ]);

    const response: NCRListResponse = {
      ncrs,
      total,
      page: pageNum,
      limit: limitNum
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[NCR] Error fetching NCRs:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch NCRs'
    });
  }
});

/**
 * GET /api/v1/quality/ncrs/:id
 * Get single NCR by ID
 */
router.get('/ncrs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ncr = await prisma.nCR.findUnique({
      where: { id },
      include: {
        signatures: true
      }
    });

    if (!ncr) {
      return res.status(404).json({
        error: 'Not Found',
        message: `NCR ${id} not found`
      });
    }

    res.status(200).json(ncr);
  } catch (error: any) {
    console.error('[NCR] Error fetching NCR:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch NCR'
    });
  }
});

/**
 * POST /api/v1/quality/ncrs
 * Create new NCR
 */
router.post('/ncrs', async (req: Request, res: Response) => {
  try {
    const request: CreateNCRRequest = req.body;

    // TODO: Add validation

    // Generate NCR number
    const ncrNumber = await generateNCRNumber();

    const ncr = await prisma.nCR.create({
      data: {
        ncrNumber,
        partId: request.partId,
        workOrderId: request.workOrderId,
        supplierId: request.supplierId,
        lotNumber: request.lotNumber,
        serialNumber: request.serialNumber,
        ncrType: request.ncrType,
        severity: request.severity,
        status: NCRStatus.OPEN,
        problemDescription: request.problemDescription,
        quantityAffected: request.quantityAffected,
        correctiveActionComplete: false,
        preventiveActionComplete: false,
        createdById: 'demo-user', // TODO: Get from auth context
      }
    });

    // TODO: Publish NCRCreatedEvent to Kafka

    res.status(201).json(ncr);
  } catch (error: any) {
    console.error('[NCR] Error creating NCR:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create NCR'
    });
  }
});

/**
 * PUT /api/v1/quality/ncrs/:id
 * Update NCR
 */
router.put('/ncrs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: UpdateNCRRequest = req.body;

    const ncr = await prisma.nCR.update({
      where: { id },
      data: {
        ...updates
      }
    });

    res.status(200).json(ncr);
  } catch (error: any) {
    console.error('[NCR] Error updating NCR:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update NCR'
    });
  }
});

// ============================================================================
// FAI (First Article Inspection)
// ============================================================================

/**
 * GET /api/v1/quality/fai
 * Get filtered list of FAI reports
 */
router.get('/fai', async (req: Request, res: Response) => {
  try {
    const {
      status,
      faiType,
      partId,
      page = '1',
      limit = '20'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const where: any = {};
    if (status) where.status = status;
    if (faiType) where.faiType = faiType;
    if (partId) where.partId = partId;

    // Execute query
    const [faiReports, total] = await Promise.all([
      prisma.fAIReport.findMany({
        where,
        include: {
          characteristics: true,
          signatures: true
        },
        orderBy: { inspectionDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.fAIReport.count({ where })
    ]);

    const response: FAIListResponse = {
      faiReports,
      total,
      page: pageNum,
      limit: limitNum
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('[FAI] Error fetching FAI reports:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch FAI reports'
    });
  }
});

/**
 * GET /api/v1/quality/fai/:id
 * Get single FAI report by ID
 */
router.get('/fai/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const faiReport = await prisma.fAIReport.findUnique({
      where: { id },
      include: {
        characteristics: true,
        signatures: true
      }
    });

    if (!faiReport) {
      return res.status(404).json({
        error: 'Not Found',
        message: `FAI report ${id} not found`
      });
    }

    res.status(200).json(faiReport);
  } catch (error: any) {
    console.error('[FAI] Error fetching FAI report:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch FAI report'
    });
  }
});

/**
 * POST /api/v1/quality/fai
 * Create new FAI report
 */
router.post('/fai', async (req: Request, res: Response) => {
  try {
    const request: CreateFAIRequest = req.body;

    // TODO: Add validation

    // Generate FAI number
    const faiNumber = await generateFAINumber();

    const faiReport = await prisma.fAIReport.create({
      data: {
        faiNumber,
        partId: request.partId,
        partNumber: request.partNumber,
        partRevision: request.partRevision,
        serialNumber: request.serialNumber,
        faiType: request.faiType,
        reason: request.reason,
        status: FAIStatus.IN_PROGRESS,
        inspectionDate: new Date(request.inspectionDate),
        inspectedBy: 'demo-inspector', // TODO: Get from auth context
        quantityInspected: 1,
        attachmentUrls: [],
        drawingUrls: []
      }
    });

    res.status(201).json(faiReport);
  } catch (error: any) {
    console.error('[FAI] Error creating FAI report:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create FAI report'
    });
  }
});

/**
 * PUT /api/v1/quality/fai/:id
 * Update FAI report
 */
router.put('/fai/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: UpdateFAIRequest = req.body;

    const faiReport = await prisma.fAIReport.update({
      where: { id },
      data: {
        ...updates
      },
      include: {
        characteristics: true
      }
    });

    res.status(200).json(faiReport);
  } catch (error: any) {
    console.error('[FAI] Error updating FAI report:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update FAI report'
    });
  }
});

// ============================================================================
// Dashboard Metrics
// ============================================================================

/**
 * GET /api/v1/quality/dashboard/metrics
 * Get quality dashboard metrics
 */
router.get('/dashboard/metrics', async (req: Request, res: Response) => {
  try {
    // Inspections metrics
    const [
      totalInspections,
      pendingInspections,
      inProgressInspections,
      completedInspections,
      passedInspections
    ] = await Promise.all([
      prisma.qualityInspection.count(),
      prisma.qualityInspection.count({ where: { status: InspectionStatus.PENDING } }),
      prisma.qualityInspection.count({ where: { status: InspectionStatus.IN_PROGRESS } }),
      prisma.qualityInspection.count({ where: { status: InspectionStatus.COMPLETED } }),
      prisma.qualityInspection.count({ where: { result: InspectionResult.PASS } })
    ]);

    const passRate = completedInspections > 0
      ? (passedInspections / completedInspections) * 100
      : 0;

    // NCR metrics
    const [
      totalNCRs,
      openNCRs,
      underReviewNCRs,
      closedNCRs
    ] = await Promise.all([
      prisma.nCR.count(),
      prisma.nCR.count({ where: { status: NCRStatus.OPEN } }),
      prisma.nCR.count({ where: { status: NCRStatus.UNDER_REVIEW } }),
      prisma.nCR.count({ where: { status: NCRStatus.CLOSED } })
    ]);

    // FAI metrics
    const [
      totalFAI,
      inProgressFAI,
      submittedFAI,
      approvedFAI,
      passedFAI
    ] = await Promise.all([
      prisma.fAIReport.count(),
      prisma.fAIReport.count({ where: { status: FAIStatus.IN_PROGRESS } }),
      prisma.fAIReport.count({ where: { status: FAIStatus.SUBMITTED } }),
      prisma.fAIReport.count({ where: { status: FAIStatus.APPROVED } }),
      prisma.fAIReport.count({ where: { status: FAIStatus.APPROVED } })
    ]);

    const faiPassRate = totalFAI > 0 ? (passedFAI / totalFAI) * 100 : 0;

    const metrics: DashboardMetrics = {
      inspections: {
        total: totalInspections,
        pending: pendingInspections,
        inProgress: inProgressInspections,
        completed: completedInspections,
        passRate: Math.round(passRate * 10) / 10
      },
      ncrs: {
        total: totalNCRs,
        open: openNCRs,
        underReview: underReviewNCRs,
        closed: closedNCRs,
        byType: {} as any, // TODO: Aggregate by type
        bySeverity: {} as any // TODO: Aggregate by severity
      },
      fai: {
        total: totalFAI,
        inProgress: inProgressFAI,
        submitted: submittedFAI,
        approved: approvedFAI,
        passRate: Math.round(faiPassRate * 10) / 10
      }
    };

    res.status(200).json(metrics);
  } catch (error: any) {
    console.error('[DASHBOARD] Error fetching metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch dashboard metrics'
    });
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

async function generateInspectionNumber(): Promise<string> {
  const count = await prisma.qualityInspection.count();
  const num = (count + 1).toString().padStart(6, '0');
  return `INS-${num}`;
}

async function generateNCRNumber(): Promise<string> {
  const count = await prisma.nCR.count();
  const num = (count + 1).toString().padStart(6, '0');
  return `NCR-${num}`;
}

async function generateFAINumber(): Promise<string> {
  const count = await prisma.fAIReport.count();
  const num = (count + 1).toString().padStart(6, '0');
  return `FAI-${num}`;
}

export default router;
