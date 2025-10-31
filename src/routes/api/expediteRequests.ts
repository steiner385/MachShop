/**
 * API Routes for Expedite Request Management
 *
 * Provides REST endpoints for managing expedite requests, including creation,
 * approval workflows, supplier coordination, and analytics.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, ExpeditStatus, ExpeditUrgency } from '@prisma/client';
import { ExpeditRequestService, CreateExpeditRequestData, ExpeditRequestFilters } from '../../services/ExpeditRequestService';
import { ShortageNotificationService } from '../../services/ShortageNotificationService';
import { NotificationService } from '../../services/NotificationService';
import { authMiddleware } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { logger } from '../../utils/logger';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Initialize services
const notificationService = new NotificationService(prisma);
const shortageNotificationService = new ShortageNotificationService(
  prisma,
  notificationService,
  {
    enableEmailNotifications: true,
    enableSMSNotifications: true,
    enableInAppNotifications: true,
    enableSlackIntegration: false,
    escalationRules: {
      materialPlannerEscalationMinutes: 30,
      managerEscalationMinutes: 120,
      directorEscalationMinutes: 240,
    },
    stakeholderRoles: {
      materialPlanners: ['MATERIAL_PLANNER', 'SENIOR_MATERIAL_PLANNER'],
      procurementTeam: ['PROCUREMENT_SPECIALIST', 'BUYER', 'PROCUREMENT_MANAGER'],
      productionSupervisors: ['PRODUCTION_SUPERVISOR', 'PRODUCTION_MANAGER'],
      managers: ['MATERIAL_MANAGER', 'PRODUCTION_MANAGER', 'OPERATIONS_MANAGER'],
      directors: ['OPERATIONS_DIRECTOR', 'MANUFACTURING_DIRECTOR'],
    },
  }
);
const expeditRequestService = new ExpeditRequestService(prisma, shortageNotificationService);

// Validation schemas
const createExpeditRequestSchema = z.object({
  shortageAlertId: z.string().optional(),
  partId: z.string().cuid(),
  requiredQuantity: z.number().positive(),
  urgencyLevel: z.nativeEnum(ExpeditUrgency),
  requestedByDate: z.string().datetime(),
  justification: z.string().min(10),
  impactAssessment: z.string().optional(),
  costImpact: z.number().positive().optional(),
  alternativesSuggested: z.array(z.string()).optional(),
  vendorId: z.string().cuid().optional(),
});

const approveExpeditRequestSchema = z.object({
  approvedCost: z.number().positive().optional(),
  approvalNotes: z.string().optional(),
});

const rejectExpeditRequestSchema = z.object({
  rejectionReason: z.string().min(5),
});

const updateSupplierResponseSchema = z.object({
  vendorResponse: z.string().min(5),
  vendorCommitmentDate: z.string().datetime().optional(),
  estimatedDeliveryDate: z.string().datetime().optional(),
  expediteFee: z.number().positive().optional(),
});

const resolveExpeditRequestSchema = z.object({
  resolution: z.enum([
    'DELIVERED_ON_TIME',
    'DELIVERED_LATE',
    'ALTERNATIVE_USED',
    'PARTIAL_DELIVERY',
    'CANCELLED_NOT_NEEDED',
    'CANCELLED_TOO_LATE',
    'VENDOR_UNABLE'
  ]),
  resolutionNotes: z.string().optional(),
  actualDeliveryDate: z.string().datetime().optional(),
  finalCost: z.number().positive().optional(),
  qualityImpact: z.boolean().optional(),
});

/**
 * @route POST /api/v1/expedite-requests
 * @desc Create a new expedite request
 * @access Private (Material Planners, Procurement)
 */
router.post('/',
  authMiddleware,
  validateRequest(createExpeditRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const data: CreateExpeditRequestData = {
        ...req.body,
        requestedByDate: new Date(req.body.requestedByDate),
        requestedById: req.user.id,
      };

      const expeditRequestId = await expeditRequestService.createExpeditRequest(data);

      logger.info('Expedite request created via API', {
        expeditRequestId,
        partId: data.partId,
        userId: req.user.id
      });

      res.status(201).json({
        success: true,
        data: { expeditRequestId },
        message: 'Expedite request created successfully'
      });

    } catch (error) {
      logger.error('Failed to create expedite request via API', { error });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/v1/expedite-requests
 * @desc Get expedite requests with filtering
 * @access Private (Material Planners, Procurement, Managers)
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Build filters from query parameters
    const filters: ExpeditRequestFilters = {};

    if (req.query.status) {
      filters.status = Array.isArray(req.query.status)
        ? req.query.status as ExpeditStatus[]
        : [req.query.status as ExpeditStatus];
    }

    if (req.query.urgencyLevel) {
      filters.urgencyLevel = Array.isArray(req.query.urgencyLevel)
        ? req.query.urgencyLevel as ExpeditUrgency[]
        : [req.query.urgencyLevel as ExpeditUrgency];
    }

    if (req.query.partId) {
      filters.partId = req.query.partId as string;
    }

    if (req.query.vendorId) {
      filters.vendorId = req.query.vendorId as string;
    }

    if (req.query.requestedById) {
      filters.requestedById = req.query.requestedById as string;
    }

    if (req.query.pendingApproval === 'true') {
      filters.pendingApproval = true;
    }

    if (req.query.overdue === 'true') {
      filters.overdue = true;
    }

    if (req.query.dateFrom && req.query.dateTo) {
      filters.dateRange = {
        from: new Date(req.query.dateFrom as string),
        to: new Date(req.query.dateTo as string),
      };
    }

    const expeditRequests = await expeditRequestService.getExpeditRequests(filters);

    res.json({
      success: true,
      data: expeditRequests,
      count: expeditRequests.length
    });

  } catch (error) {
    logger.error('Failed to get expedite requests via API', { error });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/expedite-requests/:id
 * @desc Get a specific expedite request with details
 * @access Private
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const expeditRequest = await expeditRequestService.getExpeditRequestWithDetails(req.params.id);

    if (!expeditRequest) {
      return res.status(404).json({
        success: false,
        error: 'Expedite request not found'
      });
    }

    res.json({
      success: true,
      data: expeditRequest
    });

  } catch (error) {
    logger.error('Failed to get expedite request via API', { error });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/expedite-requests/:id/approve
 * @desc Approve an expedite request
 * @access Private (Procurement Managers, Directors)
 */
router.post('/:id/approve',
  authMiddleware,
  validateRequest(approveExpeditRequestSchema),
  async (req: Request, res: Response) => {
    try {
      await expeditRequestService.approveExpeditRequest(req.params.id, {
        approvedById: req.user.id,
        approvedCost: req.body.approvedCost,
        approvalNotes: req.body.approvalNotes,
      });

      logger.info('Expedite request approved via API', {
        expeditRequestId: req.params.id,
        approvedById: req.user.id
      });

      res.json({
        success: true,
        message: 'Expedite request approved successfully'
      });

    } catch (error) {
      logger.error('Failed to approve expedite request via API', { error });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/expedite-requests/:id/reject
 * @desc Reject an expedite request
 * @access Private (Procurement Managers, Directors)
 */
router.post('/:id/reject',
  authMiddleware,
  validateRequest(rejectExpeditRequestSchema),
  async (req: Request, res: Response) => {
    try {
      await expeditRequestService.rejectExpeditRequest(
        req.params.id,
        req.user.id,
        req.body.rejectionReason
      );

      logger.info('Expedite request rejected via API', {
        expeditRequestId: req.params.id,
        rejectedById: req.user.id
      });

      res.json({
        success: true,
        message: 'Expedite request rejected'
      });

    } catch (error) {
      logger.error('Failed to reject expedite request via API', { error });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/expedite-requests/:id/supplier-response
 * @desc Update supplier response for expedite request
 * @access Private (Material Planners, Procurement)
 */
router.post('/:id/supplier-response',
  authMiddleware,
  validateRequest(updateSupplierResponseSchema),
  async (req: Request, res: Response) => {
    try {
      await expeditRequestService.updateSupplierResponse(
        req.params.id,
        {
          vendorResponse: req.body.vendorResponse,
          vendorCommitmentDate: req.body.vendorCommitmentDate ? new Date(req.body.vendorCommitmentDate) : undefined,
          estimatedDeliveryDate: req.body.estimatedDeliveryDate ? new Date(req.body.estimatedDeliveryDate) : undefined,
          expediteFee: req.body.expediteFee,
        },
        req.user.id
      );

      logger.info('Supplier response updated via API', {
        expeditRequestId: req.params.id,
        updatedById: req.user.id
      });

      res.json({
        success: true,
        message: 'Supplier response updated successfully'
      });

    } catch (error) {
      logger.error('Failed to update supplier response via API', { error });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/expedite-requests/:id/in-transit
 * @desc Mark expedite request as in transit
 * @access Private (Material Planners, Procurement)
 */
router.post('/:id/in-transit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { expectedArrivalDate } = req.body;

    if (!expectedArrivalDate) {
      return res.status(400).json({
        success: false,
        error: 'Expected arrival date is required'
      });
    }

    await expeditRequestService.markInTransit(
      req.params.id,
      new Date(expectedArrivalDate),
      req.user.id
    );

    res.json({
      success: true,
      message: 'Expedite request marked as in transit'
    });

  } catch (error) {
    logger.error('Failed to mark expedite request as in transit via API', { error });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/expedite-requests/:id/delivered
 * @desc Mark expedite request as delivered
 * @access Private (Material Planners, Warehouse)
 */
router.post('/:id/delivered', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { actualDeliveryDate } = req.body;

    if (!actualDeliveryDate) {
      return res.status(400).json({
        success: false,
        error: 'Actual delivery date is required'
      });
    }

    await expeditRequestService.markDelivered(
      req.params.id,
      new Date(actualDeliveryDate),
      req.user.id
    );

    res.json({
      success: true,
      message: 'Expedite request marked as delivered'
    });

  } catch (error) {
    logger.error('Failed to mark expedite request as delivered via API', { error });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/expedite-requests/:id/resolve
 * @desc Resolve an expedite request
 * @access Private (Material Planners, Procurement Managers)
 */
router.post('/:id/resolve',
  authMiddleware,
  validateRequest(resolveExpeditRequestSchema),
  async (req: Request, res: Response) => {
    try {
      await expeditRequestService.resolveExpeditRequest(req.params.id, {
        ...req.body,
        resolvedById: req.user.id,
        actualDeliveryDate: req.body.actualDeliveryDate ? new Date(req.body.actualDeliveryDate) : undefined,
      });

      logger.info('Expedite request resolved via API', {
        expeditRequestId: req.params.id,
        resolvedById: req.user.id,
        resolution: req.body.resolution
      });

      res.json({
        success: true,
        message: 'Expedite request resolved successfully'
      });

    } catch (error) {
      logger.error('Failed to resolve expedite request via API', { error });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/v1/expedite-requests/:id/cancel
 * @desc Cancel an expedite request
 * @access Private (Requester, Material Planners, Managers)
 */
router.post('/:id/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { cancellationReason } = req.body;

    if (!cancellationReason) {
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required'
      });
    }

    await expeditRequestService.cancelExpeditRequest(
      req.params.id,
      req.user.id,
      cancellationReason
    );

    res.json({
      success: true,
      message: 'Expedite request cancelled'
    });

  } catch (error) {
    logger.error('Failed to cancel expedite request via API', { error });
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/expedite-requests/metrics
 * @desc Get expedite request metrics and analytics
 * @access Private (Managers, Directors)
 */
router.get('/metrics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const metrics = await expeditRequestService.getExpeditRequestMetrics(days);

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Failed to get expedite request metrics via API', { error });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/expedite-requests/dashboard
 * @desc Get expedite requests dashboard data
 * @access Private
 */
router.get('/dashboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Get pending approvals
    const pendingApprovals = await expeditRequestService.getExpeditRequests({
      pendingApproval: true,
    });

    // Get overdue requests
    const overdueRequests = await expeditRequestService.getExpeditRequests({
      overdue: true,
    });

    // Get recent requests (last 7 days)
    const recentRequests = await expeditRequestService.getExpeditRequests({
      dateRange: {
        from: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)),
        to: new Date(),
      },
    });

    // Get metrics
    const metrics = await expeditRequestService.getExpeditRequestMetrics(30);

    res.json({
      success: true,
      data: {
        pendingApprovals: pendingApprovals.slice(0, 10), // Limit to 10 for dashboard
        overdueRequests: overdueRequests.slice(0, 10),
        recentRequests: recentRequests.slice(0, 20),
        metrics,
        summary: {
          totalPendingApprovals: pendingApprovals.length,
          totalOverdueRequests: overdueRequests.length,
          totalRecentRequests: recentRequests.length,
        },
      }
    });

  } catch (error) {
    logger.error('Failed to get expedite requests dashboard data via API', { error });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;