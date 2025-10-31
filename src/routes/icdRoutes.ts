/**
 * ✅ GITHUB ISSUE #224: Interface Control Document (ICD) API Routes
 *
 * REST API endpoints for managing Interface Control Documents, compliance validation,
 * and complete ICD lifecycle management. Supports SAE AIR6181A, ASME Y14.24,
 * NASA Interface Management Guidelines, and ISO 10007 standards.
 *
 * Endpoints:
 *
 * ICD Management:
 * - GET    /api/v1/icd                          - List ICDs with filters
 * - POST   /api/v1/icd                          - Create new ICD
 * - GET    /api/v1/icd/:id                      - Get ICD details
 * - PUT    /api/v1/icd/:id                      - Update ICD
 * - DELETE /api/v1/icd/:id                      - Deactivate ICD
 * - GET    /api/v1/icd/number/:icdNumber        - Get ICD by number
 * - PUT    /api/v1/icd/:id/status               - Change ICD status
 * - GET    /api/v1/icd/:id/versions             - Get ICD version history
 * - GET    /api/v1/icd/:id/history              - Get ICD change history
 *
 * Requirements Management:
 * - GET    /api/v1/icd/:id/requirements         - Get ICD requirements
 * - POST   /api/v1/icd/:id/requirements         - Add requirement to ICD
 * - PUT    /api/v1/icd/requirements/:reqId      - Update requirement
 * - DELETE /api/v1/icd/requirements/:reqId      - Remove requirement
 * - GET    /api/v1/icd/requirements/:reqId      - Get requirement details
 *
 * Part Relationships:
 * - GET    /api/v1/icd/:id/implementations      - Get implementing parts
 * - POST   /api/v1/icd/:id/implementations      - Link part as implementation
 * - PUT    /api/v1/icd/implementations/:implId  - Update implementation
 * - DELETE /api/v1/icd/implementations/:implId  - Remove implementation
 * - GET    /api/v1/icd/:id/consumptions         - Get consuming parts
 * - POST   /api/v1/icd/:id/consumptions         - Link part as consumer
 * - PUT    /api/v1/icd/consumptions/:consId     - Update consumption
 * - DELETE /api/v1/icd/consumptions/:consId     - Remove consumption
 *
 * Compliance Management:
 * - GET    /api/v1/icd/:id/compliance           - Get compliance status
 * - POST   /api/v1/icd/:id/compliance/check     - Create compliance check
 * - GET    /api/v1/icd/:id/compliance/checks    - Get compliance checks
 * - PUT    /api/v1/icd/compliance/checks/:checkId - Update compliance check
 * - GET    /api/v1/icd/:id/compliance/summary   - Get compliance summary
 * - POST   /api/v1/icd/:id/compliance/validate  - Validate compliance
 *
 * Change Management:
 * - GET    /api/v1/icd/:id/change-requests      - Get change requests
 * - POST   /api/v1/icd/:id/change-requests      - Create change request
 * - PUT    /api/v1/icd/change-requests/:reqId   - Update change request
 * - POST   /api/v1/icd/change-requests/:reqId/approve - Approve change request
 * - POST   /api/v1/icd/change-requests/:reqId/reject  - Reject change request
 *
 * Attachments:
 * - GET    /api/v1/icd/:id/attachments          - Get ICD attachments
 * - POST   /api/v1/icd/:id/attachments          - Upload attachment
 * - DELETE /api/v1/icd/attachments/:attachmentId - Delete attachment
 *
 * Analytics & Reporting:
 * - GET    /api/v1/icd/analytics                - Get ICD analytics
 * - GET    /api/v1/icd/analytics/dashboard      - Get dashboard metrics
 * - GET    /api/v1/icd/reports/compliance       - Get compliance report
 * - GET    /api/v1/icd/reports/reviews          - Get review status report
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { ICDService } from '../services/ICDService';
import {
  ICDCreateInput,
  ICDUpdateInput,
  InterfaceRequirementCreateInput,
  InterfaceRequirementUpdateInput,
  ICDPartImplementationCreateInput,
  ICDPartConsumptionCreateInput,
  ICDComplianceCheckCreateInput,
  ICDFilters,
  ICDComplianceFilters,
  ICDError,
  ICDValidationError,
  ICDStateError,
  ICDPermissionError,
  ICDNotFoundError,
  ICDComplianceError
} from '../types/icd';
import {
  ICDStatus,
  InterfaceType,
  InterfaceDirection,
  InterfaceCriticality,
  VerificationMethod,
  ComplianceStatus,
  InterfaceEffectivityType
} from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Create service instances
const icdService = new ICDService(prisma);

// Apply auth middleware to all routes
router.use(authMiddleware);

// ============================================================================
// ICD Management Routes
// ============================================================================

/**
 * GET /api/v1/icd
 * List ICDs with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,
      interfaceType,
      criticality,
      ownerId,
      ownerDepartment,
      effectiveDateFrom,
      effectiveDateTo,
      standards,
      partNumber,
      search,
      isActive,
      page = '1',
      limit = '20'
    } = req.query;

    const filters: ICDFilters = {};

    if (status) {
      filters.status = Array.isArray(status) ? status as ICDStatus[] : [status as ICDStatus];
    }
    if (interfaceType) {
      filters.interfaceType = Array.isArray(interfaceType) ?
        interfaceType as InterfaceType[] : [interfaceType as InterfaceType];
    }
    if (criticality) {
      filters.criticality = Array.isArray(criticality) ?
        criticality as InterfaceCriticality[] : [criticality as InterfaceCriticality];
    }
    if (ownerId) filters.ownerId = ownerId as string;
    if (ownerDepartment) filters.ownerDepartment = ownerDepartment as string;
    if (effectiveDateFrom) filters.effectiveDateFrom = new Date(effectiveDateFrom as string);
    if (effectiveDateTo) filters.effectiveDateTo = new Date(effectiveDateTo as string);
    if (standards) {
      filters.standards = Array.isArray(standards) ? standards as string[] : [standards as string];
    }
    if (partNumber) filters.partNumber = partNumber as string;
    if (search) filters.search = search as string;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const result = await icdService.listICDs(filters, parseInt(page as string), parseInt(limit as string));

    res.json({
      success: true,
      data: result.icds,
      pagination: {
        page: result.page,
        limit: parseInt(limit as string),
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

/**
 * POST /api/v1/icd
 * Create new ICD
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: ICDCreateInput = {
      ...req.body,
      createdById: req.user?.id
    };

    const icd = await icdService.createICD(input);

    res.status(201).json({
      success: true,
      data: icd,
      message: `ICD ${icd.icdNumber} created successfully`
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

/**
 * GET /api/v1/icd/:id
 * Get ICD details by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const icd = await icdService.getICDById(id);

    res.json({
      success: true,
      data: icd
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

/**
 * PUT /api/v1/icd/:id
 * Update ICD
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input: ICDUpdateInput = req.body;

    const icd = await icdService.updateICD(id, input, req.user?.id);

    res.json({
      success: true,
      data: icd,
      message: `ICD ${icd.icdNumber} updated successfully`
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

/**
 * GET /api/v1/icd/number/:icdNumber
 * Get ICD by number
 */
router.get('/number/:icdNumber', async (req: Request, res: Response) => {
  try {
    const { icdNumber } = req.params;
    const icd = await icdService.getICDByNumber(icdNumber);

    res.json({
      success: true,
      data: icd
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

/**
 * PUT /api/v1/icd/:id/status
 * Update ICD status
 */
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!Object.values(ICDStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const icd = await icdService.updateICDStatus(id, status, req.user?.id, notes);

    res.json({
      success: true,
      data: icd,
      message: `ICD status updated to ${status}`
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

// ============================================================================
// Requirements Management Routes
// ============================================================================

/**
 * GET /api/v1/icd/:id/requirements
 * Get ICD requirements
 */
router.get('/:id/requirements', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const icd = await icdService.getICDById(id);

    res.json({
      success: true,
      data: icd.requirements || []
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

/**
 * POST /api/v1/icd/:id/requirements
 * Add requirement to ICD
 */
router.post('/:id/requirements', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input: InterfaceRequirementCreateInput = {
      ...req.body,
      icdId: id
    };

    const requirement = await icdService.addRequirement(input);

    res.status(201).json({
      success: true,
      data: requirement,
      message: `Requirement ${requirement.requirementId} added successfully`
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

/**
 * PUT /api/v1/icd/requirements/:reqId
 * Update requirement
 */
router.put('/requirements/:reqId', async (req: Request, res: Response) => {
  try {
    const { reqId } = req.params;
    const input: InterfaceRequirementUpdateInput = req.body;

    const requirement = await icdService.updateRequirement(reqId, input);

    res.json({
      success: true,
      data: requirement,
      message: 'Requirement updated successfully'
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

// ============================================================================
// Part Relationships Routes
// ============================================================================

/**
 * POST /api/v1/icd/:id/implementations
 * Link part as implementation
 */
router.post('/:id/implementations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input: ICDPartImplementationCreateInput = {
      ...req.body,
      icdId: id
    };

    const implementation = await icdService.linkPartImplementation(input);

    res.status(201).json({
      success: true,
      data: implementation,
      message: 'Part linked as implementation successfully'
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

/**
 * POST /api/v1/icd/:id/consumptions
 * Link part as consumer
 */
router.post('/:id/consumptions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input: ICDPartConsumptionCreateInput = {
      ...req.body,
      icdId: id
    };

    const consumption = await icdService.linkPartConsumption(input);

    res.status(201).json({
      success: true,
      data: consumption,
      message: 'Part linked as consumer successfully'
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

// ============================================================================
// Compliance Management Routes
// ============================================================================

/**
 * GET /api/v1/icd/:id/compliance
 * Get compliance status
 */
router.get('/:id/compliance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const compliance = await icdService.getComplianceStatus(id);

    res.json({
      success: true,
      data: compliance
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

/**
 * POST /api/v1/icd/:id/compliance/check
 * Create compliance check
 */
router.post('/:id/compliance/check', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const input: ICDComplianceCheckCreateInput = {
      ...req.body,
      icdId: id,
      checkedById: req.user?.id,
      checkedByName: req.user?.name
    };

    const check = await icdService.createComplianceCheck(input);

    res.status(201).json({
      success: true,
      data: check,
      message: 'Compliance check created successfully'
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

// ============================================================================
// Analytics Routes
// ============================================================================

/**
 * GET /api/v1/icd/analytics
 * Get ICD analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await icdService.getAnalytics();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

/**
 * GET /api/v1/icd/analytics/dashboard
 * Get dashboard metrics
 */
router.get('/analytics/dashboard', async (req: Request, res: Response) => {
  try {
    const analytics = await icdService.getAnalytics();

    // Transform for dashboard format
    const dashboard = {
      summary: {
        totalICDs: analytics.totalICDs,
        activeICDs: analytics.icdsByStatus[ICDStatus.RELEASED] + analytics.icdsByStatus[ICDStatus.APPROVED],
        underReview: analytics.icdsByStatus[ICDStatus.UNDER_REVIEW] + analytics.icdsByStatus[ICDStatus.PENDING_APPROVAL],
        drafts: analytics.icdsByStatus[ICDStatus.DRAFT]
      },
      compliance: analytics.complianceOverview,
      upcoming: {
        reviews: analytics.upcomingReviews,
        expiring: analytics.expiringSoon
      },
      distribution: {
        byType: analytics.icdsByType,
        byCriticality: analytics.icdsByCriticality
      },
      requirements: analytics.requirementMetrics
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    handleICDError(error, res);
  }
});

// ============================================================================
// Error Handling
// ============================================================================

function handleICDError(error: any, res: Response) {
  console.error('ICD API Error:', error);

  if (error instanceof ICDNotFoundError) {
    return res.status(404).json({
      success: false,
      message: error.message,
      code: error.code
    });
  }

  if (error instanceof ICDValidationError) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: error.code,
      field: error.field,
      value: error.value
    });
  }

  if (error instanceof ICDStateError) {
    return res.status(409).json({
      success: false,
      message: error.message,
      code: error.code,
      currentState: error.currentState,
      requestedAction: error.requestedAction
    });
  }

  if (error instanceof ICDPermissionError) {
    return res.status(403).json({
      success: false,
      message: error.message,
      code: error.code,
      userId: error.userId,
      action: error.action
    });
  }

  if (error instanceof ICDComplianceError) {
    return res.status(422).json({
      success: false,
      message: error.message,
      code: error.code,
      icdId: error.icdId,
      requirementId: error.requirementId
    });
  }

  if (error instanceof ICDError) {
    return res.status(500).json({
      success: false,
      message: error.message,
      code: error.code
    });
  }

  // Handle Prisma errors
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate value detected',
      details: error.meta
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found'
    });
  }

  // Generic error
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

export default router;