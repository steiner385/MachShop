/**
 * Movement API Routes
 * Phase 8: API Routes & Endpoints
 * Issue #64: Material Movement & Logistics Management System
 *
 * Provides REST API endpoints for material movements, forklift management,
 * and container tracking
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireProductionAccess } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { MaterialMovementService } from '../services/movement/MaterialMovementService';
import { ForkliftManagementService } from '../services/movement/ForkliftManagementService';
import { ContainerTrackingService } from '../services/movement/ContainerTrackingService';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize services
const movementService = new MaterialMovementService(prisma);
const forkliftService = new ForkliftManagementService(prisma);
const containerService = new ContainerTrackingService(prisma);

// ========================================
// MATERIAL MOVEMENT ENDPOINTS
// ========================================

/**
 * @route POST /api/movements
 * @desc Create a new material movement
 * @access Private
 * @body {Object} Movement creation parameters
 * @returns {Movement} Created movement
 */
router.post('/',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const {
      movementTypeId,
      fromLocation,
      toLocation,
      workOrderIds,
      requestedBy,
      priority,
      specialInstructions,
      fromSupplier,
      toSupplier,
      fromSiteId,
      toSiteId
    } = req.body;

    // Validate required fields
    if (!movementTypeId || !fromLocation || !toLocation || !requestedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: movementTypeId, fromLocation, toLocation, requestedBy'
      });
    }

    const movement = await movementService.createMovement({
      movementTypeId,
      fromLocation,
      toLocation,
      workOrderIds: workOrderIds || [],
      requestedBy,
      priority: priority || 'NORMAL',
      specialInstructions,
      fromSupplier,
      toSupplier,
      fromSiteId,
      toSiteId
    });

    return res.status(201).json(movement);
  })
);

/**
 * @route GET /api/movements/:id
 * @desc Get movement by ID
 * @access Private
 * @param {string} id Movement ID
 * @returns {Movement} Movement details
 */
router.get('/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Movement ID is required'
      });
    }

    const movement = await movementService.getMovement(id);

    if (!movement) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Movement with ID ${id} not found`
      });
    }

    return res.status(200).json(movement);
  })
);

/**
 * @route GET /api/movements
 * @desc Get movements with optional filters
 * @access Private
 * @query {string} status Filter by status (REQUESTED, APPROVED, ASSIGNED, IN_TRANSIT, DELIVERED, CANCELLED)
 * @query {string} priority Filter by priority (URGENT, HIGH, NORMAL, LOW)
 * @query {string} fromDate Filter movements from this date (ISO 8601)
 * @query {string} toDate Filter movements until this date (ISO 8601)
 * @query {number} limit Limit number of results (default: 100)
 * @query {number} offset Pagination offset (default: 0)
 * @returns {Array} Array of movements with metadata
 */
router.get('/',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { status, priority, fromDate, toDate, limit, offset } = req.query;

    const movements = await movementService.getMovements({
      status: status as any,
      priority: priority as any,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 100,
      offset: offset ? parseInt(offset as string, 10) : 0
    });

    return res.status(200).json({
      data: movements,
      count: movements.length,
      limit: limit ? parseInt(limit as string, 10) : 100,
      offset: offset ? parseInt(offset as string, 10) : 0
    });
  })
);

/**
 * @route PUT /api/movements/:id
 * @desc Update movement details
 * @access Private
 * @param {string} id Movement ID
 * @body {Object} Fields to update
 * @returns {Movement} Updated movement
 */
router.put('/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fromLocation, toLocation, specialInstructions, priority, estimatedDeliveryAt } = req.body;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Movement ID is required'
      });
    }

    const movement = await movementService.updateMovement(id, {
      fromLocation,
      toLocation,
      specialInstructions,
      priority,
      estimatedDeliveryAt: estimatedDeliveryAt ? new Date(estimatedDeliveryAt) : undefined
    });

    return res.status(200).json(movement);
  })
);

/**
 * @route POST /api/movements/:id/approve
 * @desc Approve a movement request
 * @access Private
 * @param {string} id Movement ID
 * @body {Object} Approval data including approvedBy user ID
 * @returns {Movement} Approved movement
 */
router.post('/:id/approve',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { approvedBy } = req.body;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Movement ID is required'
      });
    }

    if (!approvedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'approvedBy is required'
      });
    }

    const movement = await movementService.approveMovement(id, approvedBy);

    return res.status(200).json(movement);
  })
);

/**
 * @route POST /api/movements/:id/transition
 * @desc Transition movement status
 * @access Private
 * @param {string} id Movement ID
 * @body {Object} Status transition data
 * @returns {Movement} Movement with new status
 */
router.post('/:id/transition',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Movement ID is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'status is required'
      });
    }

    const movement = await movementService.transitionStatus(id, { status });

    return res.status(200).json(movement);
  })
);

/**
 * @route POST /api/movements/:id/assign-shipment
 * @desc Assign a shipment to a movement
 * @access Private
 * @param {string} id Movement ID
 * @body {Object} Shipment assignment data
 * @returns {Movement} Movement with shipment assignment
 */
router.post('/:id/assign-shipment',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { shipmentId } = req.body;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Movement ID is required'
      });
    }

    if (!shipmentId) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'shipmentId is required'
      });
    }

    const movement = await movementService.assignShipment(id, shipmentId);

    return res.status(200).json(movement);
  })
);

/**
 * @route POST /api/movements/:id/tracking
 * @desc Record tracking information for a movement
 * @access Private
 * @param {string} id Movement ID
 * @body {Object} Tracking data (carrier, trackingNumber, optional freightCost)
 * @returns {Movement} Movement with tracking info
 */
router.post('/:id/tracking',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { carrier, trackingNumber, freightCost } = req.body;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Movement ID is required'
      });
    }

    if (!carrier || !trackingNumber) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'carrier and trackingNumber are required'
      });
    }

    const movement = await movementService.recordTracking(id, carrier, trackingNumber, freightCost);

    return res.status(200).json(movement);
  })
);

/**
 * @route POST /api/movements/:id/cancel
 * @desc Cancel a movement
 * @access Private
 * @param {string} id Movement ID
 * @returns {Movement} Cancelled movement
 */
router.post('/:id/cancel',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Movement ID is required'
      });
    }

    const movement = await movementService.cancelMovement(id);

    return res.status(200).json(movement);
  })
);

/**
 * @route GET /api/movements/summary/stats
 * @desc Get movement statistics
 * @access Private
 * @query {number} timeRangeHours Time range for statistics in hours (default: 24)
 * @returns {Object} Statistics including counts by status, priority, and in-transit/delivered counts
 */
router.get('/summary/stats',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { timeRangeHours } = req.query;

    const summary = await movementService.getMovementsSummary(
      timeRangeHours ? parseInt(timeRangeHours as string, 10) : 24
    );

    return res.status(200).json(summary);
  })
);

// ========================================
// FORKLIFT MANAGEMENT ENDPOINTS
// ========================================

/**
 * @route POST /api/movements/forklifts
 * @desc Create a new forklift
 * @access Private
 * @body {Object} Forklift creation parameters
 * @returns {Forklift} Created forklift
 */
router.post('/forklifts',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const {
      siteId,
      equipmentNumber,
      forkliftType,
      make,
      model,
      yearManufactured,
      serialNumber,
      capacityLbs,
      maxLiftHeightInches,
      fuelType,
      hasGPS
    } = req.body;

    if (!siteId || !equipmentNumber || !forkliftType || !make || !model || !capacityLbs) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields'
      });
    }

    const forklift = await forkliftService.createForklift({
      siteId,
      equipmentNumber,
      forkliftType,
      make,
      model,
      yearManufactured,
      serialNumber,
      capacityLbs,
      maxLiftHeightInches,
      fuelType,
      hasGPS
    });

    return res.status(201).json(forklift);
  })
);

/**
 * @route GET /api/movements/forklifts/:id
 * @desc Get forklift by ID
 * @access Private
 * @param {string} id Forklift ID
 * @returns {Forklift} Forklift details
 */
router.get('/forklifts/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Forklift ID is required'
      });
    }

    const forklift = await forkliftService.getForklift(id);

    if (!forklift) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Forklift with ID ${id} not found`
      });
    }

    return res.status(200).json(forklift);
  })
);

/**
 * @route GET /api/movements/forklifts/site/:siteId
 * @desc Get forklifts for a specific site
 * @access Private
 * @param {string} siteId Site ID
 * @query {string} status Filter by status
 * @query {string} type Filter by type
 * @query {number} limit Limit results
 * @returns {Array} Array of forklifts
 */
router.get('/forklifts/site/:siteId',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { siteId } = req.params;
    const { status, type, limit } = req.query;

    if (!siteId || siteId.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Site ID is required'
      });
    }

    const forklifts = await forkliftService.getForkliftsBySite(siteId, {
      status: status as any,
      type: type as any,
      limit: limit ? parseInt(limit as string, 10) : 100
    });

    return res.status(200).json({
      data: forklifts,
      count: forklifts.length
    });
  })
);

/**
 * @route PUT /api/movements/forklifts/:id
 * @desc Update forklift status and details
 * @access Private
 * @param {string} id Forklift ID
 * @body {Object} Update data
 * @returns {Forklift} Updated forklift
 */
router.put('/forklifts/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      status,
      currentLocationId,
      currentOperatorId,
      meterHours,
      lastMaintenanceDate,
      nextMaintenanceDate,
      notes
    } = req.body;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Forklift ID is required'
      });
    }

    const forklift = await forkliftService.updateForklift(id, {
      status,
      currentLocationId,
      currentOperatorId,
      meterHours,
      lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : undefined,
      nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : undefined,
      notes
    });

    return res.status(200).json(forklift);
  })
);

// ========================================
// CONTAINER TRACKING ENDPOINTS
// ========================================

/**
 * @route POST /api/movements/containers
 * @desc Create a new container
 * @access Private
 * @body {Object} Container parameters
 * @returns {Container} Created container
 */
router.post('/containers',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const {
      containerNumber,
      containerType,
      siteId,
      size,
      description,
      createdBy
    } = req.body;

    if (!containerNumber || !containerType || !siteId || !size) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: containerNumber, containerType, siteId, size'
      });
    }

    const container = await containerService.createContainer({
      containerNumber,
      containerType,
      siteId,
      size,
      description,
      createdBy: createdBy || req.user?.id || 'system'
    });

    return res.status(201).json(container);
  })
);

/**
 * @route GET /api/movements/containers/:id
 * @desc Get container by ID
 * @access Private
 * @param {string} id Container ID
 * @returns {Container} Container details
 */
router.get('/containers/:id',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Container ID is required'
      });
    }

    const container = await containerService.getContainer(id);

    if (!container) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Container with ID ${id} not found`
      });
    }

    return res.status(200).json(container);
  })
);

/**
 * @route POST /api/movements/containers/:id/load
 * @desc Load materials into a container
 * @access Private
 * @param {string} id Container ID
 * @body {Object} Load data (partNumbers, quantity, loadedBy)
 * @returns {Container} Updated container
 */
router.post('/containers/:id/load',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { partNumbers, quantity, loadedBy } = req.body;

    if (!id || !partNumbers || !quantity || !loadedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: partNumbers, quantity, loadedBy'
      });
    }

    const container = await containerService.loadContainer(id, {
      partNumbers,
      quantity,
      loadedBy
    });

    return res.status(200).json(container);
  })
);

/**
 * @route POST /api/movements/containers/:id/unload
 * @desc Unload materials from a container
 * @access Private
 * @param {string} id Container ID
 * @body {Object} Unload data (quantity, unloadedBy, targetLocation)
 * @returns {Container} Updated container
 */
router.post('/containers/:id/unload',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quantity, unloadedBy, targetLocation } = req.body;

    if (!id || !quantity || !unloadedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: quantity, unloadedBy'
      });
    }

    const container = await containerService.unloadContainer(id, {
      quantity,
      unloadedBy,
      targetLocation
    });

    return res.status(200).json(container);
  })
);

/**
 * @route POST /api/movements/containers/:id/transfer
 * @desc Transfer container to a new location
 * @access Private
 * @param {string} id Container ID
 * @body {Object} Transfer data (toLocation, transferredBy)
 * @returns {Container} Updated container
 */
router.post('/containers/:id/transfer',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { toLocation, transferredBy } = req.body;

    if (!id || !toLocation || !transferredBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: toLocation, transferredBy'
      });
    }

    const container = await containerService.transferContainer(id, toLocation, transferredBy);

    return res.status(200).json(container);
  })
);

/**
 * @route GET /api/movements/containers/:id/history
 * @desc Get container movement history
 * @access Private
 * @param {string} id Container ID
 * @returns {Array} Container movement history
 */
router.get('/containers/:id/history',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Container ID is required'
      });
    }

    const history = await containerService.getContainerMovementHistory(id);

    return res.status(200).json(history);
  })
);

/**
 * @route GET /api/movements/containers/:id/utilization
 * @desc Get container utilization metrics
 * @access Private
 * @param {string} id Container ID
 * @returns {Object} Utilization metrics
 */
router.get('/containers/:id/utilization',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id || id.trim() === '') {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Container ID is required'
      });
    }

    const utilization = await containerService.getContainerUtilization(id);

    return res.status(200).json(utilization);
  })
);

export default router;
