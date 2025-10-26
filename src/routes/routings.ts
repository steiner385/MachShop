/**
 * Routing API Routes
 * Sprint 2: Backend Services & APIs
 *
 * REST API endpoints for multi-site routing management
 */

import express from 'express';
import { z } from 'zod';
import { routingService } from '../services/RoutingService';
import {
  requireSiteAccess,
  requireRoutingAccess,
  requireRoutingWrite,
  requireRoutingApproval,
  requireRoutingActivation
} from '../middleware/auth';
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
  partId: z.string(), // Cuid2 format
  siteId: z.string(), // Cuid2 format
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
    operationId: z.string(), // ISA-95: processSegmentId (Cuid2 format)
    workCenterId: z.string().optional(), // Cuid2 format
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
  partId: z.string().optional(), // Cuid2 format
  siteId: z.string().optional(), // Cuid2 format
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
  notes: z.string().optional(),
  currentVersion: z.string().optional() // For optimistic locking
});

const createRoutingStepSchema = z.object({
  routingId: z.string().uuid(),
  stepNumber: z.number().int().positive(),
  operationId: z.string().uuid(), // ISA-95: processSegmentId
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
  operationId: z.string().uuid().optional(), // ISA-95: processSegmentId
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
 * @access Private (Routing Write Permission Required)
 */
router.post('/',
  requireRoutingWrite,
  asyncHandler(async (req, res) => {
    console.log('[DEBUG] Routing creation - Request body:', JSON.stringify(req.body, null, 2));
    try {
      const validatedData = createRoutingSchema.parse(req.body);
      console.log('[DEBUG] Routing creation - Validation passed:', JSON.stringify(validatedData, null, 2));
    } catch (zodError: any) {
      console.error('[DEBUG] Routing creation - Zod validation error:', JSON.stringify(zodError, null, 2));
      throw zodError;
    }
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
 * @access Private (Routing Read Access Required)
 */
router.get('/',
  requireRoutingAccess,
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
 * @access Private (Routing Read Access Required)
 */
router.get('/:id',
  requireRoutingAccess,
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
 * @access Private (Routing Access Required)
 */
router.get('/number/:routingNumber',
  requireRoutingAccess,
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
 * @access Private (Routing Write Permission Required)
 */
router.put('/:id',
  requireRoutingWrite,
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
 * @access Private (Routing Write Permission Required)
 */
router.delete('/:id',
  requireRoutingWrite,
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
 * @access Private (Routing Write Permission Required)
 */
router.post('/:routingId/steps',
  requireRoutingWrite,
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
 * @access Private (Routing Access Required)
 */
router.get('/:routingId/steps',
  requireRoutingAccess,
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
 * @access Private (Routing Access Required)
 */
router.get('/steps/:stepId',
  requireRoutingAccess,
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
 * @access Private (Routing Write Permission Required)
 */
router.put('/steps/:stepId',
  requireRoutingWrite,
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
 * @access Private (Routing Write Permission Required)
 */
router.delete('/steps/:stepId',
  requireRoutingWrite,
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
 * @access Private (Routing Write Permission Required)
 */
router.post('/:routingId/steps/resequence',
  requireRoutingWrite,
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
 * @access Private (Routing Write Permission Required)
 */
router.post('/steps/dependencies',
  requireRoutingWrite,
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
 * @access Private (Routing Write Permission Required)
 */
router.delete('/steps/dependencies/:dependencyId',
  requireRoutingWrite,
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
 * @access Private (Routing Write Permission Required)
 */
router.post('/part-site-availability',
  requireRoutingWrite,
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
 * @access Private (Routing Access Required)
 */
router.get('/part-site-availability/:partId/:siteId',
  requireRoutingAccess,
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
 * @access Private (Routing Access Required)
 */
router.get('/parts/:partId/available-sites',
  requireRoutingAccess,
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
 * @access Private (Routing Write Permission Required)
 */
router.put('/part-site-availability/:id',
  requireRoutingWrite,
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
 * @access Private (Routing Write Permission Required)
 */
router.delete('/part-site-availability/:id',
  requireRoutingWrite,
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
 * @access Private (Routing Write Permission Required)
 */
router.post('/:id/copy',
  requireRoutingWrite,
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
 * @access Private (Routing Approval Permission Required)
 */
router.post('/:id/approve',
  requireRoutingApproval,
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
 * @access Private (Routing Activation Permission Required)
 */
router.post('/:id/activate',
  requireRoutingActivation,
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
 * @access Private (Routing Write Permission Required)
 */
router.post('/:id/obsolete',
  requireRoutingWrite,
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
 * @access Private (Routing Access Required)
 */
router.get('/:partId/:siteId/versions',
  requireRoutingAccess,
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
 * @access Private (Routing Access Required)
 */
router.get('/:id/timing',
  requireRoutingAccess,
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
 * @access Private (Routing Access Required)
 */
router.get('/:id/validate',
  requireRoutingAccess,
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

// ============================================
// ROUTING TEMPLATE ENDPOINTS (Phase 3.3)
// ============================================

/**
 * @route GET /api/v1/routings/templates
 * @desc Get all routing templates with optional filtering
 * @access Private (Routing Access Required)
 */
router.get('/templates',
  requireRoutingAccess,
  asyncHandler(async (req, res) => {
    const { category, isFavorite, createdBy, searchText, tags } = req.query;

    const params = {
      category: category as string | undefined,
      isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
      createdBy: createdBy as string | undefined,
      searchText: searchText as string | undefined,
      tags: tags ? (tags as string).split(',') : undefined
    };

    const templates = await routingService.getRoutingTemplates(params);

    logger.info('Routing templates retrieved', {
      userId: req.user?.id,
      templateCount: templates.length,
      filters: params
    });

    res.status(200).json({
      success: true,
      data: templates
    });
  })
);

/**
 * @route GET /api/v1/routings/templates/categories
 * @desc Get template categories with counts
 * @access Private (Routing Access Required)
 */
router.get('/templates/categories',
  requireRoutingAccess,
  asyncHandler(async (req, res) => {
    const categories = await routingService.getTemplateCategories();

    logger.info('Template categories retrieved', {
      userId: req.user?.id,
      categoryCount: categories.length
    });

    res.status(200).json({
      success: true,
      data: categories
    });
  })
);

/**
 * @route POST /api/v1/routings/templates
 * @desc Create a new routing template
 * @access Private (Routing Write Permission Required)
 */
router.post('/templates',
  requireRoutingWrite,
  asyncHandler(async (req, res) => {
    const { name, description, category, tags, visualData, isFavorite } = req.body;

    const template = await routingService.createRoutingTemplate({
      name,
      description,
      category,
      tags,
      visualData,
      isFavorite,
      createdBy: req.user?.id
    });

    logger.info('Routing template created', {
      userId: req.user?.id,
      templateId: template.id,
      templateName: template.name
    });

    res.status(201).json({
      success: true,
      data: template
    });
  })
);

/**
 * @route GET /api/v1/routings/templates/:id
 * @desc Get a single routing template by ID
 * @access Private (Routing Access Required)
 */
router.get('/templates/:id',
  requireRoutingAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await routingService.getRoutingTemplateById(id);

    if (!template) {
      throw new NotFoundError(`Template ${id} not found`);
    }

    logger.info('Routing template retrieved', {
      userId: req.user?.id,
      templateId: id
    });

    res.status(200).json({
      success: true,
      data: template
    });
  })
);

/**
 * @route PUT /api/v1/routings/templates/:id
 * @desc Update a routing template
 * @access Private (Routing Write Permission Required)
 */
router.put('/templates/:id',
  requireRoutingWrite,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, category, tags, visualData, isFavorite } = req.body;

    const template = await routingService.updateRoutingTemplate(id, {
      name,
      description,
      category,
      tags,
      visualData,
      isFavorite
    });

    logger.info('Routing template updated', {
      userId: req.user?.id,
      templateId: id
    });

    res.status(200).json({
      success: true,
      data: template
    });
  })
);

/**
 * @route DELETE /api/v1/routings/templates/:id
 * @desc Delete a routing template
 * @access Private (Routing Write Permission Required)
 */
router.delete('/templates/:id',
  requireRoutingWrite,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await routingService.deleteRoutingTemplate(id);

    logger.info('Routing template deleted', {
      userId: req.user?.id,
      templateId: id
    });

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully'
    });
  })
);

/**
 * @route POST /api/v1/routings/templates/:id/favorite
 * @desc Toggle template favorite status
 * @access Private (Routing Write Permission Required)
 */
router.post('/templates/:id/favorite',
  requireRoutingWrite,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await routingService.toggleTemplateFavorite(id);

    logger.info('Template favorite toggled', {
      userId: req.user?.id,
      templateId: id,
      isFavorite: template.isFavorite
    });

    res.status(200).json({
      success: true,
      data: template
    });
  })
);

/**
 * @route POST /api/v1/routings/templates/:id/use
 * @desc Create routing from template
 * @access Private (Routing Write Permission Required)
 */
router.post('/templates/:id/use',
  requireRoutingWrite,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const routingData = req.body;

    const routing = await routingService.createRoutingFromTemplate(
      id,
      routingData,
      req.user?.id
    );

    logger.info('Routing created from template', {
      userId: req.user?.id,
      templateId: id,
      routingId: routing.id
    });

    res.status(201).json({
      success: true,
      data: routing
    });
  })
);

// ============================================
// VISUAL ROUTING DATA ENDPOINTS (Phase 3.3)
// ============================================

/**
 * @route GET /api/v1/routings/:id/visual-data
 * @desc Get visual routing data for a routing
 * @access Private (Routing Access Required)
 */
router.get('/:id/visual-data',
  requireRoutingAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const visualData = await routingService.getRoutingVisualData(id);

    logger.info('Visual routing data retrieved', {
      userId: req.user?.id,
      routingId: id,
      hasVisualData: !!visualData
    });

    res.status(200).json({
      success: true,
      data: visualData
    });
  })
);

/**
 * @route POST /api/v1/routings/visual
 * @desc Create routing with visual data
 * @access Private (Routing Write Permission Required)
 */
router.post('/visual',
  requireRoutingWrite,
  asyncHandler(async (req, res) => {
    const routingData = req.body;

    const routing = await routingService.createRoutingWithVisualData({
      ...routingData,
      createdBy: req.user?.id
    });

    logger.info('Routing created with visual data', {
      userId: req.user?.id,
      routingId: routing.id,
      routingNumber: routing.routingNumber
    });

    res.status(201).json({
      success: true,
      data: routing
    });
  })
);

/**
 * @route PUT /api/v1/routings/:id/visual
 * @desc Update routing with visual data
 * @access Private (Routing Write Permission Required)
 */
router.put('/:id/visual',
  requireRoutingWrite,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const routing = await routingService.updateRoutingWithVisualData(id, updateData);

    logger.info('Routing updated with visual data', {
      userId: req.user?.id,
      routingId: id
    });

    res.status(200).json({
      success: true,
      data: routing
    });
  })
);

// ============================================================================
// NEW: MES ENHANCEMENT ROUTES (Oracle/Teamcenter Alignment)
// ============================================================================

// ------------------------------
// Routing Type Routes (Phase 3)
// ------------------------------

/**
 * @route GET /api/v1/routings/by-type/:partId/:siteId/:routingType
 * @desc Get routings by type (PRIMARY, ALTERNATE, REWORK, etc.)
 * @access Private
 */
router.get('/by-type/:partId/:siteId/:routingType',
  requireRoutingAccess,
  asyncHandler(async (req, res) => {
    const { partId, siteId, routingType } = req.params;

    const routings = await routingService.getRoutingsByType(partId, siteId, routingType);

    res.status(200).json({
      success: true,
      data: routings
    });
  })
);

/**
 * @route GET /api/v1/routings/primary/:partId/:siteId
 * @desc Get PRIMARY routing for a part at a site
 * @access Private
 */
router.get('/primary/:partId/:siteId',
  requireRoutingAccess,
  asyncHandler(async (req, res) => {
    const { partId, siteId } = req.params;

    const routing = await routingService.getPrimaryRouting(partId, siteId);

    if (!routing) {
      throw new NotFoundError(`No PRIMARY routing found for part ${partId} at site ${siteId}`);
    }

    res.status(200).json({
      success: true,
      data: routing
    });
  })
);

/**
 * @route GET /api/v1/routings/:id/alternates
 * @desc Get ALTERNATE routings for a PRIMARY routing
 * @access Private
 */
router.get('/:id/alternates',
  requireRoutingAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const alternates = await routingService.getAlternateRoutings(id);

    res.status(200).json({
      success: true,
      data: alternates
    });
  })
);

// ------------------------------
// Parameter Override Routes (Phase 2)
// ------------------------------

/**
 * @route POST /api/v1/routings/steps/:stepId/parameters
 * @desc Set parameter override for a routing step
 * @access Private (Routing Write Permission Required)
 */
router.post('/steps/:stepId/parameters',
  requireRoutingWrite,
  asyncHandler(async (req, res) => {
    const { stepId } = req.params;
    const { parameterName, parameterValue, unitOfMeasure, notes } = req.body;

    if (!parameterName || !parameterValue) {
      throw new ValidationError('parameterName and parameterValue are required');
    }

    const override = await routingService.setRoutingStepParameterOverride(
      stepId,
      parameterName,
      parameterValue,
      unitOfMeasure,
      notes
    );

    logger.info('Parameter override set', {
      userId: req.user?.id,
      stepId,
      parameterName
    });

    res.status(201).json({
      success: true,
      data: override
    });
  })
);

/**
 * @route GET /api/v1/routings/steps/:stepId/parameters
 * @desc Get parameter overrides for a routing step
 * @access Private
 */
router.get('/steps/:stepId/parameters',
  requireRoutingAccess,
  asyncHandler(async (req, res) => {
    const { stepId } = req.params;

    const overrides = await routingService.getRoutingStepParameterOverrides(stepId);

    res.status(200).json({
      success: true,
      data: overrides
    });
  })
);

/**
 * @route GET /api/v1/routings/steps/:stepId/parameters/effective
 * @desc Get effective parameters for a routing step (base + overrides)
 * @access Private
 */
router.get('/steps/:stepId/parameters/effective',
  requireRoutingAccess,
  asyncHandler(async (req, res) => {
    const { stepId } = req.params;

    const effectiveParameters = await routingService.getEffectiveStepParameters(stepId);

    res.status(200).json({
      success: true,
      data: effectiveParameters
    });
  })
);

/**
 * @route DELETE /api/v1/routings/steps/:stepId/parameters/:parameterName
 * @desc Delete parameter override for a routing step
 * @access Private (Routing Write Permission Required)
 */
router.delete('/steps/:stepId/parameters/:parameterName',
  requireRoutingWrite,
  asyncHandler(async (req, res) => {
    const { stepId, parameterName } = req.params;

    const deleted = await routingService.deleteRoutingStepParameterOverride(stepId, parameterName);

    if (!deleted) {
      throw new NotFoundError(`Parameter override ${parameterName} not found for step ${stepId}`);
    }

    logger.info('Parameter override deleted', {
      userId: req.user?.id,
      stepId,
      parameterName
    });

    res.status(200).json({
      success: true,
      message: 'Parameter override deleted successfully'
    });
  })
);

// ------------------------------
// Work Instruction Assignment Routes (Phase 1)
// ------------------------------

/**
 * @route POST /api/v1/routings/steps/:stepId/work-instruction
 * @desc Assign work instruction to routing step
 * @access Private (Routing Write Permission Required)
 */
router.post('/steps/:stepId/work-instruction',
  requireRoutingWrite,
  asyncHandler(async (req, res) => {
    const { stepId } = req.params;
    const { workInstructionId } = req.body;

    if (!workInstructionId) {
      throw new ValidationError('workInstructionId is required');
    }

    const step = await routingService.assignWorkInstructionToStep(stepId, workInstructionId);

    logger.info('Work instruction assigned to routing step', {
      userId: req.user?.id,
      stepId,
      workInstructionId
    });

    res.status(200).json({
      success: true,
      data: step
    });
  })
);

/**
 * @route DELETE /api/v1/routings/steps/:stepId/work-instruction
 * @desc Remove work instruction override from routing step
 * @access Private (Routing Write Permission Required)
 */
router.delete('/steps/:stepId/work-instruction',
  requireRoutingWrite,
  asyncHandler(async (req, res) => {
    const { stepId } = req.params;

    const step = await routingService.removeWorkInstructionFromStep(stepId);

    logger.info('Work instruction removed from routing step', {
      userId: req.user?.id,
      stepId
    });

    res.status(200).json({
      success: true,
      data: step,
      message: 'Work instruction override removed successfully'
    });
  })
);

/**
 * @route GET /api/v1/routings/steps/:stepId/work-instruction/effective
 * @desc Get effective work instruction for a routing step
 * @access Private
 */
router.get('/steps/:stepId/work-instruction/effective',
  requireRoutingAccess,
  asyncHandler(async (req, res) => {
    const { stepId } = req.params;

    const workInstruction = await routingService.getEffectiveWorkInstruction(stepId);

    res.status(200).json({
      success: true,
      data: workInstruction
    });
  })
);

export default router;
