/**
 * Routing API Routes
 * Sprint 2: Backend Services & APIs
 *
 * REST API endpoints for multi-site routing management
 */

import express from 'express';
import { z } from 'zod';
import { routingService } from '../services/RoutingService';
import { requireProductionAccess, requireSiteAccess } from '../middleware/auth';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import {
  RoutingLifecycleState,
  DependencyType,
  DependencyTimingType,
  CreateRoutingDTO
} from '../types/routing';

const router = express.Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createRoutingSchema = z.object({
  routingNumber: z.string().min(1),
  partId: z.string().uuid(),
  siteId: z.string().uuid(),
  version: z.string().optional().default('1.0'),
  lifecycleState: z.nativeEnum(RoutingLifecycleState).optional().default(RoutingLifecycleState.DRAFT),
  description: z.string().optional(),
  isPrimaryRoute: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  effectiveDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime().optional(),
  createdBy: z.string().optional(),
  notes: z.string().optional(),
  steps: z.array(z.object({
    stepNumber: z.number().int().positive(),
    processSegmentId: z.string().uuid(),
    workCenterId: z.string().uuid().optional(),
    setupTimeOverride: z.number().int().nonnegative().optional(),
    cycleTimeOverride: z.number().int().nonnegative().optional(),
    teardownTimeOverride: z.number().int().nonnegative().optional(),
    isOptional: z.boolean().optional().default(false),
    isQualityInspection: z.boolean().optional().default(false),
    isCriticalPath: z.boolean().optional().default(false),
    stepInstructions: z.string().optional(),
    notes: z.string().optional()
  })).optional()
});

const updateRoutingSchema = z.object({
  routingNumber: z.string().min(1).optional(),
  partId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  version: z.string().optional(),
  lifecycleState: z.nativeEnum(RoutingLifecycleState).optional(),
  description: z.string().optional(),
  isPrimaryRoute: z.boolean().optional(),
  isActive: z.boolean().optional(),
  effectiveDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().datetime().optional(),
  createdBy: z.string().optional(),
  notes: z.string().optional()
});

const createRoutingStepSchema = z.object({
  routingId: z.string().uuid(),
  stepNumber: z.number().int().positive(),
  processSegmentId: z.string().uuid(),
  workCenterId: z.string().uuid().optional(),
  setupTimeOverride: z.number().int().nonnegative().optional(),
  cycleTimeOverride: z.number().int().nonnegative().optional(),
  teardownTimeOverride: z.number().int().nonnegative().optional(),
  isOptional: z.boolean().optional().default(false),
  isQualityInspection: z.boolean().optional().default(false),
  isCriticalPath: z.boolean().optional().default(false),
  stepInstructions: z.string().optional(),
  notes: z.string().optional()
});

const updateRoutingStepSchema = z.object({
  stepNumber: z.number().int().positive().optional(),
  processSegmentId: z.string().uuid().optional(),
  workCenterId: z.string().uuid().optional(),
  setupTimeOverride: z.number().int().nonnegative().optional(),
  cycleTimeOverride: z.number().int().nonnegative().optional(),
  teardownTimeOverride: z.number().int().nonnegative().optional(),
  isOptional: z.boolean().optional(),
  isQualityInspection: z.boolean().optional(),
  isCriticalPath: z.boolean().optional(),
  stepInstructions: z.string().optional(),
  notes: z.string().optional()
});

const createStepDependencySchema = z.object({
  dependentStepId: z.string().uuid(),
  prerequisiteStepId: z.string().uuid(),
  dependencyType: z.nativeEnum(DependencyType),
  timingType: z.nativeEnum(DependencyTimingType),
  lagTime: z.number().int().nonnegative().optional(),
  leadTime: z.number().int().nonnegative().optional()
});

const createPartSiteAvailabilitySchema = z.object({
  partId: z.string().uuid(),
  siteId: z.string().uuid(),
  isPreferred: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  leadTimeDays: z.number().int().nonnegative().optional(),
  minimumLotSize: z.number().int().positive().optional(),
  maximumLotSize: z.number().int().positive().optional(),
  standardCost: z.number().nonnegative().optional(),
  setupCost: z.number().nonnegative().optional(),
  effectiveDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime().optional(),
  notes: z.string().optional()
});

const updatePartSiteAvailabilitySchema = z.object({
  isPreferred: z.boolean().optional(),
  isActive: z.boolean().optional(),
  leadTimeDays: z.number().int().nonnegative().optional(),
  minimumLotSize: z.number().int().positive().optional(),
  maximumLotSize: z.number().int().positive().optional(),
  standardCost: z.number().nonnegative().optional(),
  setupCost: z.number().nonnegative().optional(),
  effectiveDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime().optional(),
  notes: z.string().optional()
});

const copyRoutingSchema = z.object({
  targetSiteId: z.string().uuid().optional(),
  newVersion: z.string().optional(),
  includeSteps: z.boolean().default(true),
  includeDependencies: z.boolean().default(true),
  newLifecycleState: z.nativeEnum(RoutingLifecycleState).optional()
});

const approveRoutingSchema = z.object({
  routingId: z.string().uuid(),
  approvedBy: z.string().min(1),
  notes: z.string().optional()
});

const resequenceStepsSchema = z.object({
  routingId: z.string().uuid(),
  stepOrder: z.array(z.object({
    stepId: z.string().uuid(),
    newStepNumber: z.number().int().positive()
  })).min(1)
});

// ============================================
// ROUTING ENDPOINTS
// ============================================

/**
 * @route POST /api/v1/routings
 * @desc Create a new routing
 * @access Private (Production Access Required)
 */
router.post('/',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validatedData = createRoutingSchema.parse(req.body);

    // Convert datetime strings to Date objects
    const data = {
      ...validatedData,
      effectiveDate: validatedData.effectiveDate ? new Date(validatedData.effectiveDate) : undefined,
      expirationDate: validatedData.expirationDate ? new Date(validatedData.expirationDate) : undefined
    };

    // Note: steps in validated data don't have routingId (not needed for inline creation)
    // Type assertion is safe here as the service handles inline step creation
    const routing = await routingService.createRouting(data as CreateRoutingDTO);

    logger.info('Routing created', {
      userId: req.user?.id,
      routingId: routing.id,
      routingNumber: routing.routingNumber,
      partId: routing.partId,
      siteId: routing.siteId
    });

    res.status(201).json({
      success: true,
      data: routing
    });
  })
);

/**
 * @route GET /api/v1/routings
 * @desc Query routings with filters
 * @access Private (Production Access Required)
 */
router.get('/',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const queryParams = {
      partId: req.query.partId as string | undefined,
      siteId: req.query.siteId as string | undefined,
      lifecycleState: req.query.lifecycleState as RoutingLifecycleState | undefined,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      isPrimaryRoute: req.query.isPrimaryRoute === 'true' ? true : req.query.isPrimaryRoute === 'false' ? false : undefined,
      version: req.query.version as string | undefined,
      includeSteps: req.query.includeSteps === 'true',
      includeExpired: req.query.includeExpired === 'true'
    };

    const routings = await routingService.queryRoutings(queryParams);

    logger.info('Routings queried', {
      userId: req.user?.id,
      filters: queryParams,
      resultCount: routings.length
    });

    res.status(200).json({
      success: true,
      data: routings
    });
  })
);

/**
 * @route GET /api/v1/routings/:id
 * @desc Get routing by ID
 * @access Private (Production Access Required)
 */
router.get('/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const includeSteps = req.query.includeSteps !== 'false'; // Default true

    const routing = await routingService.getRoutingById(id, includeSteps);

    if (!routing) {
      throw new NotFoundError(`Routing ${id} not found`);
    }

    logger.info('Routing retrieved', {
      userId: req.user?.id,
      routingId: id
    });

    res.status(200).json({
      success: true,
      data: routing
    });
  })
);

/**
 * @route GET /api/v1/routings/number/:routingNumber
 * @desc Get routing by routing number
 * @access Private (Production Access Required)
 */
router.get('/number/:routingNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { routingNumber } = req.params;

    const routing = await routingService.getRoutingByNumber(routingNumber);

    if (!routing) {
      throw new NotFoundError(`Routing ${routingNumber} not found`);
    }

    logger.info('Routing retrieved by number', {
      userId: req.user?.id,
      routingNumber
    });

    res.status(200).json({
      success: true,
      data: routing
    });
  })
);

/**
 * @route PUT /api/v1/routings/:id
 * @desc Update routing
 * @access Private (Production Access Required)
 */
router.put('/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = updateRoutingSchema.parse(req.body);

    // Convert datetime strings to Date objects
    const data = {
      ...validatedData,
      effectiveDate: validatedData.effectiveDate ? new Date(validatedData.effectiveDate) : undefined,
      expirationDate: validatedData.expirationDate ? new Date(validatedData.expirationDate) : undefined,
      approvedAt: validatedData.approvedAt ? new Date(validatedData.approvedAt) : undefined
    };

    const routing = await routingService.updateRouting(id, data);

    logger.info('Routing updated', {
      userId: req.user?.id,
      routingId: id,
      updates: Object.keys(data)
    });

    res.status(200).json({
      success: true,
      data: routing
    });
  })
);

/**
 * @route DELETE /api/v1/routings/:id
 * @desc Delete routing
 * @access Private (Production Access Required)
 */
router.delete('/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await routingService.deleteRouting(id);

    logger.info('Routing deleted', {
      userId: req.user?.id,
      routingId: id
    });

    res.status(200).json({
      success: true,
      message: 'Routing deleted successfully'
    });
  })
);

// ============================================
// ROUTING STEP ENDPOINTS
// ============================================

/**
 * @route POST /api/v1/routings/:routingId/steps
 * @desc Create a routing step
 * @access Private (Production Access Required)
 */
router.post('/:routingId/steps',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { routingId } = req.params;
    const validatedData = createRoutingStepSchema.parse({
      ...req.body,
      routingId
    });

    const step = await routingService.createRoutingStep(validatedData);

    logger.info('Routing step created', {
      userId: req.user?.id,
      routingId,
      stepId: step.id,
      stepNumber: step.stepNumber
    });

    res.status(201).json({
      success: true,
      data: step
    });
  })
);

/**
 * @route GET /api/v1/routings/:routingId/steps
 * @desc Get all steps for a routing
 * @access Private (Production Access Required)
 */
router.get('/:routingId/steps',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { routingId } = req.params;

    const steps = await routingService.getRoutingSteps(routingId);

    logger.info('Routing steps retrieved', {
      userId: req.user?.id,
      routingId,
      stepCount: steps.length
    });

    res.status(200).json({
      success: true,
      data: steps
    });
  })
);

/**
 * @route GET /api/v1/routings/steps/:stepId
 * @desc Get routing step by ID
 * @access Private (Production Access Required)
 */
router.get('/steps/:stepId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { stepId } = req.params;

    const step = await routingService.getRoutingStepById(stepId);

    if (!step) {
      throw new NotFoundError(`Routing step ${stepId} not found`);
    }

    logger.info('Routing step retrieved', {
      userId: req.user?.id,
      stepId
    });

    res.status(200).json({
      success: true,
      data: step
    });
  })
);

/**
 * @route PUT /api/v1/routings/steps/:stepId
 * @desc Update routing step
 * @access Private (Production Access Required)
 */
router.put('/steps/:stepId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { stepId } = req.params;
    const validatedData = updateRoutingStepSchema.parse(req.body);

    const step = await routingService.updateRoutingStep(stepId, validatedData);

    logger.info('Routing step updated', {
      userId: req.user?.id,
      stepId,
      updates: Object.keys(validatedData)
    });

    res.status(200).json({
      success: true,
      data: step
    });
  })
);

/**
 * @route DELETE /api/v1/routings/steps/:stepId
 * @desc Delete routing step
 * @access Private (Production Access Required)
 */
router.delete('/steps/:stepId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { stepId } = req.params;

    await routingService.deleteRoutingStep(stepId);

    logger.info('Routing step deleted', {
      userId: req.user?.id,
      stepId
    });

    res.status(200).json({
      success: true,
      message: 'Routing step deleted successfully'
    });
  })
);

/**
 * @route POST /api/v1/routings/:routingId/steps/resequence
 * @desc Resequence routing steps
 * @access Private (Production Access Required)
 */
router.post('/:routingId/steps/resequence',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { routingId } = req.params;
    const validatedData = resequenceStepsSchema.parse({
      ...req.body,
      routingId
    });

    const steps = await routingService.resequenceSteps(validatedData);

    logger.info('Routing steps resequenced', {
      userId: req.user?.id,
      routingId,
      stepCount: steps.length
    });

    res.status(200).json({
      success: true,
      data: steps
    });
  })
);

// ============================================
// ROUTING STEP DEPENDENCY ENDPOINTS
// ============================================

/**
 * @route POST /api/v1/routings/steps/dependencies
 * @desc Create routing step dependency
 * @access Private (Production Access Required)
 */
router.post('/steps/dependencies',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validatedData = createStepDependencySchema.parse(req.body);

    const dependency = await routingService.createStepDependency(validatedData);

    logger.info('Routing step dependency created', {
      userId: req.user?.id,
      dependencyId: dependency.id,
      dependentStepId: dependency.dependentStepId,
      prerequisiteStepId: dependency.prerequisiteStepId
    });

    res.status(201).json({
      success: true,
      data: dependency
    });
  })
);

/**
 * @route DELETE /api/v1/routings/steps/dependencies/:dependencyId
 * @desc Delete routing step dependency
 * @access Private (Production Access Required)
 */
router.delete('/steps/dependencies/:dependencyId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { dependencyId } = req.params;

    await routingService.deleteStepDependency(dependencyId);

    logger.info('Routing step dependency deleted', {
      userId: req.user?.id,
      dependencyId
    });

    res.status(200).json({
      success: true,
      message: 'Routing step dependency deleted successfully'
    });
  })
);

// ============================================
// PART SITE AVAILABILITY ENDPOINTS
// ============================================

/**
 * @route POST /api/v1/routings/part-site-availability
 * @desc Create part site availability
 * @access Private (Production Access Required)
 */
router.post('/part-site-availability',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validatedData = createPartSiteAvailabilitySchema.parse(req.body);

    // Convert datetime strings to Date objects
    const data = {
      ...validatedData,
      effectiveDate: validatedData.effectiveDate ? new Date(validatedData.effectiveDate) : undefined,
      expirationDate: validatedData.expirationDate ? new Date(validatedData.expirationDate) : undefined
    };

    const availability = await routingService.createPartSiteAvailability(data);

    logger.info('Part site availability created', {
      userId: req.user?.id,
      partId: availability.partId,
      siteId: availability.siteId
    });

    res.status(201).json({
      success: true,
      data: availability
    });
  })
);

/**
 * @route GET /api/v1/routings/part-site-availability/:partId/:siteId
 * @desc Get part site availability
 * @access Private (Production Access Required)
 */
router.get('/part-site-availability/:partId/:siteId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { partId, siteId } = req.params;

    const availability = await routingService.getPartSiteAvailability(partId, siteId);

    if (!availability) {
      throw new NotFoundError(`Part site availability not found for part ${partId} at site ${siteId}`);
    }

    logger.info('Part site availability retrieved', {
      userId: req.user?.id,
      partId,
      siteId
    });

    res.status(200).json({
      success: true,
      data: availability
    });
  })
);

/**
 * @route GET /api/v1/routings/parts/:partId/available-sites
 * @desc Get all sites where a part is available
 * @access Private (Production Access Required)
 */
router.get('/parts/:partId/available-sites',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { partId } = req.params;

    const sites = await routingService.getPartAvailableSites(partId);

    logger.info('Part available sites retrieved', {
      userId: req.user?.id,
      partId,
      siteCount: sites.length
    });

    res.status(200).json({
      success: true,
      data: sites
    });
  })
);

/**
 * @route PUT /api/v1/routings/part-site-availability/:id
 * @desc Update part site availability
 * @access Private (Production Access Required)
 */
router.put('/part-site-availability/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = updatePartSiteAvailabilitySchema.parse(req.body);

    // Convert datetime strings to Date objects
    const data = {
      ...validatedData,
      effectiveDate: validatedData.effectiveDate ? new Date(validatedData.effectiveDate) : undefined,
      expirationDate: validatedData.expirationDate ? new Date(validatedData.expirationDate) : undefined
    };

    const availability = await routingService.updatePartSiteAvailability(id, data);

    logger.info('Part site availability updated', {
      userId: req.user?.id,
      availabilityId: id
    });

    res.status(200).json({
      success: true,
      data: availability
    });
  })
);

/**
 * @route DELETE /api/v1/routings/part-site-availability/:id
 * @desc Delete part site availability
 * @access Private (Production Access Required)
 */
router.delete('/part-site-availability/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await routingService.deletePartSiteAvailability(id);

    logger.info('Part site availability deleted', {
      userId: req.user?.id,
      availabilityId: id
    });

    res.status(200).json({
      success: true,
      message: 'Part site availability deleted successfully'
    });
  })
);

// ============================================
// BUSINESS LOGIC ENDPOINTS
// ============================================

/**
 * @route POST /api/v1/routings/:id/copy
 * @desc Copy routing to new version or site
 * @access Private (Production Access Required)
 */
router.post('/:id/copy',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = copyRoutingSchema.parse(req.body);

    const newRouting = await routingService.copyRouting(id, validatedData);

    logger.info('Routing copied', {
      userId: req.user?.id,
      sourceRoutingId: id,
      newRoutingId: newRouting.id,
      newRoutingNumber: newRouting.routingNumber
    });

    res.status(201).json({
      success: true,
      data: newRouting
    });
  })
);

/**
 * @route POST /api/v1/routings/:id/approve
 * @desc Approve routing (move to RELEASED state)
 * @access Private (Production Access Required)
 */
router.post('/:id/approve',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = approveRoutingSchema.parse({
      ...req.body,
      routingId: id
    });

    const routing = await routingService.approveRouting(validatedData);

    logger.info('Routing approved', {
      userId: req.user?.id,
      routingId: id,
      approvedBy: validatedData.approvedBy
    });

    res.status(200).json({
      success: true,
      data: routing
    });
  })
);

/**
 * @route POST /api/v1/routings/:id/activate
 * @desc Activate routing (move to PRODUCTION state)
 * @access Private (Production Access Required)
 */
router.post('/:id/activate',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const routing = await routingService.activateRouting(id);

    logger.info('Routing activated', {
      userId: req.user?.id,
      routingId: id
    });

    res.status(200).json({
      success: true,
      data: routing
    });
  })
);

/**
 * @route POST /api/v1/routings/:id/obsolete
 * @desc Mark routing as obsolete
 * @access Private (Production Access Required)
 */
router.post('/:id/obsolete',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const routing = await routingService.obsoleteRouting(id);

    logger.info('Routing marked as obsolete', {
      userId: req.user?.id,
      routingId: id
    });

    res.status(200).json({
      success: true,
      data: routing
    });
  })
);

/**
 * @route GET /api/v1/routings/:partId/:siteId/versions
 * @desc Get all versions of a routing
 * @access Private (Production Access Required)
 */
router.get('/:partId/:siteId/versions',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { partId, siteId } = req.params;

    const versionInfo = await routingService.getRoutingVersions(partId, siteId);

    logger.info('Routing versions retrieved', {
      userId: req.user?.id,
      partId,
      siteId,
      versionCount: versionInfo.allVersions.length
    });

    res.status(200).json({
      success: true,
      data: versionInfo
    });
  })
);

/**
 * @route GET /api/v1/routings/:id/timing
 * @desc Calculate routing timing
 * @access Private (Production Access Required)
 */
router.get('/:id/timing',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const timing = await routingService.calculateRoutingTiming(id);

    logger.info('Routing timing calculated', {
      userId: req.user?.id,
      routingId: id,
      totalTime: timing.totalTime
    });

    res.status(200).json({
      success: true,
      data: timing
    });
  })
);

/**
 * @route GET /api/v1/routings/:id/validate
 * @desc Validate routing
 * @access Private (Production Access Required)
 */
router.get('/:id/validate',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const validation = await routingService.validateRouting(id);

    logger.info('Routing validated', {
      userId: req.user?.id,
      routingId: id,
      isValid: validation.isValid,
      errorCount: validation.errors.length
    });

    res.status(200).json({
      success: true,
      data: validation
    });
  })
);

export default router;
