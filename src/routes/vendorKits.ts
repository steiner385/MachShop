/**
 * Vendor Kitting API Routes
 *
 * RESTful API endpoints for managing vendor-supplied kits, including
 * kit requests, tracking, receiving, and performance analytics.
 * Integrates with the main kitting system for seamless operations.
 */

import express from 'express';
import { body, query, param } from 'express-validator';
import { requireAuth, requirePermissions, requireRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { VendorKittingService } from '../services/VendorKittingService';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const vendorKittingService = new VendorKittingService(prisma);

// Apply authentication to all vendor kitting routes
router.use(requireAuth);

/**
 * GET /api/vendor-kits
 * List vendor kits with filtering and pagination
 */
router.get(
  '/',
  requireRoles(['Production Planner', 'Manufacturing Engineer', 'Material Coordinator', 'Plant Manager']),
  [
    query('status').optional().isIn(['REQUESTED', 'ACKNOWLEDGED', 'IN_PRODUCTION', 'SHIPPED', 'RECEIVED', 'INSPECTING', 'ACCEPTED', 'REJECTED', 'CANCELLED']),
    query('vendorId').optional().isString(),
    query('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'EXPEDITE']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['createdAt', 'requiredDate', 'status', 'priority']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        status,
        vendorId,
        priority,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filters = {
        ...(status && { status }),
        ...(vendorId && { vendorId }),
        ...(priority && { priority })
      };

      const result = await vendorKittingService.getVendorKits({
        filters,
        pagination: { page: Number(page), limit: Number(limit) },
        sorting: { sortBy: sortBy as string, sortOrder: sortOrder as 'asc' | 'desc' }
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching vendor kits:', error);
      res.status(500).json({ error: 'Failed to fetch vendor kits' });
    }
  }
);

/**
 * POST /api/vendor-kits
 * Request a new vendor kit
 */
router.post(
  '/',
  requireRoles(['Production Planner', 'Manufacturing Engineer', 'Material Coordinator']),
  [
    body('vendorId').isString().notEmpty(),
    body('kitId').optional().isString(),
    body('partNumbers').isArray().notEmpty(),
    body('partNumbers.*').isString(),
    body('quantityOrdered').isInt({ min: 1 }),
    body('requiredDate').isISO8601(),
    body('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'EXPEDITE']),
    body('qualityRequirements').optional().isString(),
    body('notes').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const vendorKitRequest = {
        ...req.body,
        requestedBy: userId
      };

      const vendorKit = await vendorKittingService.requestVendorKit(vendorKitRequest);

      res.status(201).json(vendorKit);
    } catch (error) {
      console.error('Error creating vendor kit request:', error);
      res.status(500).json({ error: 'Failed to create vendor kit request' });
    }
  }
);

/**
 * GET /api/vendor-kits/:id
 * Get vendor kit details
 */
router.get(
  '/:id',
  requireRoles(['Production Planner', 'Manufacturing Engineer', 'Material Coordinator', 'Plant Manager']),
  [
    param('id').isString().notEmpty()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const vendorKit = await vendorKittingService.getVendorKitById(id);

      if (!vendorKit) {
        return res.status(404).json({ error: 'Vendor kit not found' });
      }

      res.json(vendorKit);
    } catch (error) {
      console.error('Error fetching vendor kit:', error);
      res.status(500).json({ error: 'Failed to fetch vendor kit details' });
    }
  }
);

/**
 * PUT /api/vendor-kits/:id/status
 * Update vendor kit status
 */
router.put(
  '/:id/status',
  requireRoles(['Production Planner', 'Manufacturing Engineer', 'Material Coordinator']),
  [
    param('id').isString().notEmpty(),
    body('status').isIn(['REQUESTED', 'ACKNOWLEDGED', 'IN_PRODUCTION', 'SHIPPED', 'RECEIVED', 'INSPECTING', 'ACCEPTED', 'REJECTED', 'CANCELLED']),
    body('notes').optional().isString(),
    body('metadata').optional().isObject()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, metadata } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const updatedVendorKit = await vendorKittingService.updateVendorKitStatus(
        id,
        status,
        userId,
        notes,
        metadata
      );

      res.json(updatedVendorKit);
    } catch (error) {
      console.error('Error updating vendor kit status:', error);
      res.status(500).json({ error: 'Failed to update vendor kit status' });
    }
  }
);

/**
 * POST /api/vendor-kits/:id/receive
 * Receive vendor kit shipment
 */
router.post(
  '/:id/receive',
  requireRoles(['Material Coordinator', 'Quality Inspector']),
  [
    param('id').isString().notEmpty(),
    body('actualReceiveDate').optional().isISO8601(),
    body('trackingNumber').optional().isString(),
    body('deliveryNotes').optional().isString(),
    body('items').isArray().notEmpty(),
    body('items.*.vendorKitItemId').isString(),
    body('items.*.quantityReceived').isNumeric({ min: 0 }),
    body('items.*.lotNumber').optional().isString(),
    body('items.*.serialNumbers').optional().isArray(),
    body('items.*.notes').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const receiptData = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const result = await vendorKittingService.receiveVendorKit(id, receiptData, userId);

      res.json(result);
    } catch (error) {
      console.error('Error receiving vendor kit:', error);
      res.status(500).json({ error: 'Failed to receive vendor kit' });
    }
  }
);

/**
 * POST /api/vendor-kits/:id/inspect
 * Perform vendor kit inspection
 */
router.post(
  '/:id/inspect',
  requireRoles(['Quality Inspector', 'Quality Engineer']),
  [
    param('id').isString().notEmpty(),
    body('inspectionType').isIn(['RECEIVING', 'FIRST_ARTICLE', 'SAMPLING', 'FULL_INSPECTION', 'CERTIFICATION_REVIEW', 'DIMENSIONAL', 'MATERIAL_VERIFICATION']),
    body('result').isIn(['PASS', 'PASS_WITH_DEVIATION', 'FAIL', 'PENDING', 'WAIVED']),
    body('conformingQuantity').isInt({ min: 0 }),
    body('nonConformingQuantity').isInt({ min: 0 }),
    body('notes').optional().isString(),
    body('correctionRequired').optional().isBoolean(),
    body('correctionNotes').optional().isString(),
    body('certificatesReceived').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const inspectionData = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const inspection = await vendorKittingService.performInspection(id, inspectionData, userId);

      res.status(201).json(inspection);
    } catch (error) {
      console.error('Error performing vendor kit inspection:', error);
      res.status(500).json({ error: 'Failed to perform vendor kit inspection' });
    }
  }
);

/**
 * GET /api/vendor-kits/:id/history
 * Get vendor kit status history
 */
router.get(
  '/:id/history',
  requireRoles(['Production Planner', 'Manufacturing Engineer', 'Material Coordinator', 'Plant Manager']),
  [
    param('id').isString().notEmpty()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const history = await vendorKittingService.getVendorKitHistory(id);

      res.json(history);
    } catch (error) {
      console.error('Error fetching vendor kit history:', error);
      res.status(500).json({ error: 'Failed to fetch vendor kit history' });
    }
  }
);

/**
 * GET /api/vendors
 * List vendors with filtering
 */
router.get(
  '/vendors',
  requireRoles(['Production Planner', 'Manufacturing Engineer', 'Material Coordinator', 'Plant Manager']),
  [
    query('isActive').optional().isBoolean(),
    query('preferredVendor').optional().isBoolean(),
    query('search').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { isActive, preferredVendor, search } = req.query;

      const filters = {
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(preferredVendor !== undefined && { preferredVendor: preferredVendor === 'true' }),
        ...(search && { search: search as string })
      };

      const vendors = await vendorKittingService.getVendors(filters);

      res.json(vendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      res.status(500).json({ error: 'Failed to fetch vendors' });
    }
  }
);

/**
 * GET /api/vendors/:vendorId/performance
 * Get vendor performance metrics
 */
router.get(
  '/vendors/:vendorId/performance',
  requireRoles(['Production Planner', 'Manufacturing Engineer', 'Material Coordinator', 'Plant Manager']),
  [
    param('vendorId').isString().notEmpty(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('metricType').optional().isIn(['ON_TIME_DELIVERY', 'QUALITY_RATING', 'COST_PERFORMANCE', 'LEAD_TIME', 'DEFECT_RATE', 'DELIVERY_PERFORMANCE', 'RESPONSIVENESS', 'CERTIFICATION_COMPLIANCE'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { vendorId } = req.params;
      const { startDate, endDate, metricType } = req.query;

      const performance = await vendorKittingService.getVendorPerformance(vendorId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        metricType: metricType as string
      });

      res.json(performance);
    } catch (error) {
      console.error('Error fetching vendor performance:', error);
      res.status(500).json({ error: 'Failed to fetch vendor performance metrics' });
    }
  }
);

/**
 * GET /api/vendor-kits/analytics/dashboard
 * Get vendor kitting analytics dashboard data
 */
router.get(
  '/analytics/dashboard',
  requireRoles(['Production Planner', 'Manufacturing Engineer', 'Material Coordinator', 'Plant Manager']),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('vendorId').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { startDate, endDate, vendorId } = req.query;

      const analytics = await vendorKittingService.getAnalyticsDashboard({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        vendorId: vendorId as string
      });

      res.json(analytics);
    } catch (error) {
      console.error('Error fetching vendor kitting analytics:', error);
      res.status(500).json({ error: 'Failed to fetch vendor kitting analytics' });
    }
  }
);

/**
 * POST /api/vendor-kits/bulk-update
 * Bulk update vendor kit statuses
 */
router.post(
  '/bulk-update',
  requireRoles(['Production Planner', 'Manufacturing Engineer', 'Material Coordinator']),
  [
    body('vendorKitIds').isArray().notEmpty(),
    body('vendorKitIds.*').isString(),
    body('status').isIn(['REQUESTED', 'ACKNOWLEDGED', 'IN_PRODUCTION', 'SHIPPED', 'RECEIVED', 'INSPECTING', 'ACCEPTED', 'REJECTED', 'CANCELLED']),
    body('notes').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { vendorKitIds, status, notes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const results = await Promise.all(
        vendorKitIds.map((id: string) =>
          vendorKittingService.updateVendorKitStatus(id, status, userId, notes)
        )
      );

      res.json({
        updated: results.length,
        results
      });
    } catch (error) {
      console.error('Error bulk updating vendor kits:', error);
      res.status(500).json({ error: 'Failed to bulk update vendor kits' });
    }
  }
);

export default router;