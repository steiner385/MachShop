/**
 * Staging Workflow API Routes
 *
 * Dedicated endpoints for managing the staging workflow process:
 * kit staging assignment, location optimization, progress tracking,
 * and staging area management for aerospace manufacturing.
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { StagingLocationService } from '../../services/StagingLocationService';
import { KitWorkflowService } from '../../services/KitWorkflowService';
import { BarcodeScanningService } from '../../services/BarcodeScanningService';
import { logger } from '../../utils/logger';
import { validateRequest, authenticateUser, requirePermission } from '../../middleware';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Initialize services
const stagingLocationService = new StagingLocationService(prisma);
const kitWorkflowService = new KitWorkflowService(prisma);
const barcodeScanningService = new BarcodeScanningService(prisma);

// Validation schemas
const stagingInitiationSchema = z.object({
  kitId: z.string(),
  workCellId: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
  requiresCleanRoom: z.boolean().optional(),
  requiresHazmatHandling: z.boolean().optional(),
  requiresHighSecurity: z.boolean().optional(),
  preferredLocationId: z.string().optional(),
  estimatedStagingTime: z.number().optional(),
  specialInstructions: z.string().optional()
});

const stagingAssignmentSchema = z.object({
  kitId: z.string(),
  locationId: z.string(),
  assignedById: z.string().optional(),
  notes: z.string().optional(),
  estimatedCompletionTime: z.string().datetime().optional()
});

const stagingProgressSchema = z.object({
  kitId: z.string(),
  itemsStaged: z.array(z.object({
    kitItemId: z.string(),
    quantity: z.number(),
    location: z.string().optional(),
    notes: z.string().optional(),
    scannedBarcode: z.string().optional()
  })),
  progressPercentage: z.number().min(0).max(100).optional(),
  issues: z.array(z.object({
    type: z.enum(['missing_item', 'quantity_mismatch', 'damage', 'other']),
    description: z.string(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    itemId: z.string().optional()
  })).optional(),
  notes: z.string().optional()
});

const stagingCompletionSchema = z.object({
  kitId: z.string(),
  completedById: z.string().optional(),
  verificationRequired: z.boolean().optional(),
  qualityCheckPassed: z.boolean().optional(),
  finalNotes: z.string().optional(),
  photosAttached: z.array(z.string()).optional()
});

const stagingAreaFiltersSchema = z.object({
  areaId: z.string().optional(),
  workCellId: z.string().optional(),
  status: z.enum(['available', 'occupied', 'maintenance', 'all']).optional(),
  locationTypes: z.array(z.string()).optional(),
  securityLevels: z.array(z.string()).optional(),
  capacityThreshold: z.number().min(0).max(100).optional()
});

/**
 * Staging Workflow Endpoints
 */

// POST /api/staging/initiate - Initiate staging process for a kit
router.post('/initiate',
  authenticateUser,
  requirePermission('staging:write'),
  validateRequest(stagingInitiationSchema),
  async (req, res) => {
    try {
      const {
        kitId,
        workCellId,
        priority,
        requiresCleanRoom,
        requiresHazmatHandling,
        requiresHighSecurity,
        preferredLocationId,
        estimatedStagingTime,
        specialInstructions
      } = req.body;

      // Verify kit exists and is in correct status
      const kit = await prisma.kit.findUnique({
        where: { id: kitId },
        include: {
          kitItems: {
            include: { part: true }
          },
          workOrder: {
            select: {
              workOrderNumber: true,
              part: { select: { partNumber: true, partName: true } }
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

      if (kit.status !== 'PLANNED') {
        return res.status(400).json({
          success: false,
          message: `Kit must be in PLANNED status to initiate staging. Current status: ${kit.status}`
        });
      }

      // Find optimal staging location
      const stagingOptions = {
        kitId,
        workCellId,
        requiresCleanRoom,
        requiresHazmatHandling,
        requiresHighSecurity,
        preferredLocationId
      };

      const locationResult = await stagingLocationService.findOptimalLocation(stagingOptions);

      // Update kit status to STAGING
      const updatedKit = await prisma.kit.update({
        where: { id: kitId },
        data: {
          status: 'STAGING',
          stagingInitiatedAt: new Date(),
          stagingInitiatedById: req.user.id,
          priority: priority || kit.priority,
          specialInstructions: specialInstructions || kit.specialInstructions
        }
      });

      // Create staging workflow record
      const stagingRecord = await prisma.kitStatusHistory.create({
        data: {
          kitId: kitId,
          fromStatus: 'PLANNED',
          toStatus: 'STAGING',
          changedById: req.user.id,
          reason: 'Staging process initiated',
          notes: specialInstructions,
          metadata: {
            recommendedLocation: locationResult.recommendedLocation.id,
            locationScore: locationResult.score.score,
            estimatedStagingTime
          }
        }
      });

      logger.info('Staging process initiated', {
        kitId,
        kitNumber: kit.kitNumber,
        recommendedLocationId: locationResult.recommendedLocation.id,
        initiatedBy: req.user.id
      });

      res.json({
        success: true,
        message: 'Staging process initiated successfully',
        data: {
          kit: updatedKit,
          recommendedLocation: locationResult.recommendedLocation,
          locationAnalysis: {
            score: locationResult.score,
            alternatives: locationResult.alternativeLocations,
            warnings: locationResult.warnings
          },
          stagingRecord
        }
      });

    } catch (error) {
      logger.error('Staging initiation failed', { error, kitId: req.body.kitId });
      res.status(500).json({
        success: false,
        message: 'Failed to initiate staging process',
        error: error.message
      });
    }
  }
);

// POST /api/staging/assign - Assign kit to specific staging location
router.post('/assign',
  authenticateUser,
  requirePermission('staging:write'),
  validateRequest(stagingAssignmentSchema),
  async (req, res) => {
    try {
      const {
        kitId,
        locationId,
        assignedById,
        notes,
        estimatedCompletionTime
      } = req.body;

      // Verify kit and location
      const [kit, location] = await Promise.all([
        prisma.kit.findUnique({
          where: { id: kitId },
          include: { kitItems: true }
        }),
        prisma.stagingLocation.findUnique({
          where: { id: locationId },
          include: { area: true }
        })
      ]);

      if (!kit) {
        return res.status(404).json({
          success: false,
          message: 'Kit not found'
        });
      }

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Staging location not found'
        });
      }

      if (kit.status !== 'STAGING') {
        return res.status(400).json({
          success: false,
          message: `Kit must be in STAGING status. Current status: ${kit.status}`
        });
      }

      // Check location availability
      if (!location.isAvailable || location.currentOccupancy >= location.maxCapacity) {
        return res.status(400).json({
          success: false,
          message: 'Staging location is not available or at capacity'
        });
      }

      // Assign kit to location
      await stagingLocationService.assignKitToLocation(
        kitId,
        locationId,
        assignedById || req.user.id
      );

      // Create assignment record
      await prisma.kitStatusHistory.create({
        data: {
          kitId: kitId,
          fromStatus: 'STAGING',
          toStatus: 'STAGING',
          changedById: req.user.id,
          reason: 'Kit assigned to staging location',
          notes: notes || `Assigned to ${location.locationCode}`,
          metadata: {
            locationId,
            locationCode: location.locationCode,
            estimatedCompletionTime
          }
        }
      });

      logger.info('Kit assigned to staging location', {
        kitId,
        locationId,
        locationCode: location.locationCode,
        assignedBy: req.user.id
      });

      res.json({
        success: true,
        message: 'Kit assigned to staging location successfully',
        data: {
          kitId,
          location: {
            id: location.id,
            locationCode: location.locationCode,
            locationName: location.locationName,
            area: location.area
          },
          estimatedCompletionTime
        }
      });

    } catch (error) {
      logger.error('Staging assignment failed', { error, kitId: req.body.kitId });
      res.status(500).json({
        success: false,
        message: 'Failed to assign kit to staging location',
        error: error.message
      });
    }
  }
);

// PUT /api/staging/progress - Update staging progress
router.put('/progress',
  authenticateUser,
  requirePermission('staging:write'),
  validateRequest(stagingProgressSchema),
  async (req, res) => {
    try {
      const {
        kitId,
        itemsStaged,
        progressPercentage,
        issues,
        notes
      } = req.body;

      // Verify kit exists and is in staging
      const kit = await prisma.kit.findUnique({
        where: { id: kitId },
        include: {
          kitItems: true,
          stagingLocation: true
        }
      });

      if (!kit) {
        return res.status(404).json({
          success: false,
          message: 'Kit not found'
        });
      }

      if (kit.status !== 'STAGING') {
        return res.status(400).json({
          success: false,
          message: `Kit must be in STAGING status. Current status: ${kit.status}`
        });
      }

      // Update staged items
      const updatePromises = itemsStaged.map(async (stagedItem) => {
        const kitItem = kit.kitItems.find(item => item.id === stagedItem.kitItemId);
        if (!kitItem) {
          throw new Error(`Kit item ${stagedItem.kitItemId} not found in kit`);
        }

        return prisma.kitItem.update({
          where: { id: stagedItem.kitItemId },
          data: {
            stagedQuantity: stagedItem.quantity,
            status: stagedItem.quantity >= kitItem.requiredQuantity ? 'STAGED' : 'PARTIAL',
            stagedAt: new Date(),
            stagedLocation: stagedItem.location,
            stagingNotes: stagedItem.notes
          }
        });
      });

      await Promise.all(updatePromises);

      // Calculate overall progress
      const totalItems = kit.kitItems.length;
      const stagedItems = itemsStaged.length;
      const calculatedProgress = progressPercentage || Math.round((stagedItems / totalItems) * 100);

      // Update kit progress
      const updatedKit = await prisma.kit.update({
        where: { id: kitId },
        data: {
          completionPercent: calculatedProgress,
          lastStagingUpdate: new Date(),
          stagingNotes: notes
        }
      });

      // Log issues if any
      if (issues && issues.length > 0) {
        const issuePromises = issues.map(issue =>
          prisma.kitStatusHistory.create({
            data: {
              kitId: kitId,
              fromStatus: 'STAGING',
              toStatus: 'STAGING',
              changedById: req.user.id,
              reason: `Issue reported: ${issue.type}`,
              notes: issue.description,
              metadata: {
                issueType: issue.type,
                severity: issue.severity,
                itemId: issue.itemId
              }
            }
          })
        );
        await Promise.all(issuePromises);
      }

      logger.info('Staging progress updated', {
        kitId,
        itemsStaged: itemsStaged.length,
        progressPercentage: calculatedProgress,
        issuesReported: issues?.length || 0
      });

      res.json({
        success: true,
        message: 'Staging progress updated successfully',
        data: {
          kitId,
          progressPercentage: calculatedProgress,
          itemsStaged: itemsStaged.length,
          totalItems,
          issuesReported: issues?.length || 0
        }
      });

    } catch (error) {
      logger.error('Staging progress update failed', { error, kitId: req.body.kitId });
      res.status(500).json({
        success: false,
        message: 'Failed to update staging progress',
        error: error.message
      });
    }
  }
);

// POST /api/staging/complete - Complete staging process
router.post('/complete',
  authenticateUser,
  requirePermission('staging:write'),
  validateRequest(stagingCompletionSchema),
  async (req, res) => {
    try {
      const {
        kitId,
        completedById,
        verificationRequired,
        qualityCheckPassed,
        finalNotes,
        photosAttached
      } = req.body;

      // Verify kit and check all items are staged
      const kit = await prisma.kit.findUnique({
        where: { id: kitId },
        include: {
          kitItems: true,
          stagingLocation: true
        }
      });

      if (!kit) {
        return res.status(404).json({
          success: false,
          message: 'Kit not found'
        });
      }

      if (kit.status !== 'STAGING') {
        return res.status(400).json({
          success: false,
          message: `Kit must be in STAGING status. Current status: ${kit.status}`
        });
      }

      // Check if all items are staged
      const unstagedItems = kit.kitItems.filter(item =>
        item.status !== 'STAGED' && item.stagedQuantity < item.requiredQuantity
      );

      if (unstagedItems.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot complete staging. ${unstagedItems.length} items not fully staged`,
          unstagedItems: unstagedItems.map(item => ({
            id: item.id,
            partId: item.partId,
            requiredQuantity: item.requiredQuantity,
            stagedQuantity: item.stagedQuantity || 0
          }))
        });
      }

      // Complete staging using workflow service
      const completionResult = await kitWorkflowService.transitionKitStatus({
        kitId,
        newStatus: 'STAGED',
        userId: completedById || req.user.id,
        reason: 'Staging completed',
        notes: finalNotes,
        validationData: {
          qualityCheckPassed,
          verificationRequired,
          photosAttached
        }
      });

      if (!completionResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to complete staging',
          validationResults: completionResult.validationResults
        });
      }

      logger.info('Staging completed', {
        kitId,
        kitNumber: kit.kitNumber,
        completedBy: completedById || req.user.id,
        qualityCheckPassed,
        verificationRequired
      });

      res.json({
        success: true,
        message: 'Staging completed successfully',
        data: {
          kitId,
          newStatus: 'STAGED',
          completedAt: new Date(),
          nextActions: completionResult.nextActions,
          validationResults: completionResult.validationResults
        }
      });

    } catch (error) {
      logger.error('Staging completion failed', { error, kitId: req.body.kitId });
      res.status(500).json({
        success: false,
        message: 'Failed to complete staging',
        error: error.message
      });
    }
  }
);

/**
 * Staging Area Management Endpoints
 */

// GET /api/staging/areas - List staging areas with filters
router.get('/areas',
  authenticateUser,
  requirePermission('staging:read'),
  async (req, res) => {
    try {
      const {
        areaId,
        workCellId,
        status = 'all',
        locationTypes,
        securityLevels,
        capacityThreshold
      } = req.query;

      const whereClause: any = {};

      if (areaId) whereClause.areaId = areaId;
      if (status !== 'all') {
        switch (status) {
          case 'available':
            whereClause.isAvailable = true;
            whereClause.currentOccupancy = { lt: prisma.stagingLocation.fields.maxCapacity };
            break;
          case 'occupied':
            whereClause.currentOccupancy = { gt: 0 };
            break;
          case 'maintenance':
            whereClause.maintenanceMode = true;
            break;
        }
      }

      if (locationTypes) {
        const types = Array.isArray(locationTypes) ? locationTypes : [locationTypes];
        whereClause.locationType = { in: types };
      }

      if (securityLevels) {
        const levels = Array.isArray(securityLevels) ? securityLevels : [securityLevels];
        whereClause.securityLevel = { in: levels };
      }

      const locations = await prisma.stagingLocation.findMany({
        where: whereClause,
        include: {
          area: true,
          kits: {
            where: {
              status: { in: ['STAGING', 'STAGED'] }
            },
            select: {
              id: true,
              kitNumber: true,
              status: true,
              priority: true,
              createdAt: true
            }
          }
        },
        orderBy: [
          { area: { areaName: 'asc' } },
          { locationCode: 'asc' }
        ]
      });

      // Filter by capacity threshold if specified
      let filteredLocations = locations;
      if (capacityThreshold) {
        const threshold = Number(capacityThreshold);
        filteredLocations = locations.filter(location => {
          const utilizationPercent = (location.currentOccupancy / location.maxCapacity) * 100;
          return utilizationPercent <= threshold;
        });
      }

      // Calculate summary statistics
      const summary = {
        totalLocations: filteredLocations.length,
        availableLocations: filteredLocations.filter(l => l.isAvailable && l.currentOccupancy < l.maxCapacity).length,
        occupiedLocations: filteredLocations.filter(l => l.currentOccupancy > 0).length,
        maintenanceLocations: filteredLocations.filter(l => l.maintenanceMode).length,
        totalCapacity: filteredLocations.reduce((sum, l) => sum + l.maxCapacity, 0),
        currentOccupancy: filteredLocations.reduce((sum, l) => sum + l.currentOccupancy, 0)
      };

      res.json({
        success: true,
        data: {
          locations: filteredLocations.map(location => ({
            ...location,
            utilizationPercent: Math.round((location.currentOccupancy / location.maxCapacity) * 100),
            availableCapacity: location.maxCapacity - location.currentOccupancy,
            activeKits: location.kits.length
          })),
          summary
        }
      });

    } catch (error) {
      logger.error('Error retrieving staging areas', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staging areas',
        error: error.message
      });
    }
  }
);

// GET /api/staging/areas/:areaId/utilization - Get detailed area utilization
router.get('/areas/:areaId/utilization',
  authenticateUser,
  requirePermission('staging:read'),
  async (req, res) => {
    try {
      const { areaId } = req.params;
      const { timeframe = '24h' } = req.query;

      const utilization = await stagingLocationService.getStagingUtilization(
        areaId,
        timeframe as string
      );

      res.json({
        success: true,
        data: utilization
      });

    } catch (error) {
      logger.error('Error retrieving area utilization', { error, areaId: req.params.areaId });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve area utilization',
        error: error.message
      });
    }
  }
);

// GET /api/staging/dashboard - Staging workflow dashboard data
router.get('/dashboard',
  authenticateUser,
  requirePermission('staging:read'),
  async (req, res) => {
    try {
      const { timeframe = '24h' } = req.query;

      // Get staging metrics
      const [
        stagingKits,
        stagedKits,
        completedToday,
        locationUtilization,
        stagingAreas
      ] = await Promise.all([
        // Kits currently in staging
        prisma.kit.findMany({
          where: { status: 'STAGING' },
          include: {
            workOrder: { select: { workOrderNumber: true } },
            stagingLocation: { select: { locationCode: true, area: true } }
          }
        }),

        // Kits that are staged and ready
        prisma.kit.findMany({
          where: { status: 'STAGED' },
          include: {
            workOrder: { select: { workOrderNumber: true } },
            stagingLocation: { select: { locationCode: true, area: true } }
          }
        }),

        // Kits completed today
        prisma.kit.count({
          where: {
            status: 'STAGED',
            stagedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),

        // Overall location utilization
        stagingLocationService.getStagingUtilization(undefined, timeframe as string),

        // Staging area summary
        prisma.stagingLocation.groupBy({
          by: ['areaId'],
          _count: { id: true },
          _sum: { maxCapacity: true, currentOccupancy: true }
        })
      ]);

      // Calculate staging performance metrics
      const stagingMetrics = {
        activeStaging: stagingKits.length,
        readyForIssue: stagedKits.length,
        completedToday,
        averageUtilization: locationUtilization.reduce((sum, area) =>
          sum + area.utilizationPercent, 0) / locationUtilization.length,
        bottlenecks: locationUtilization.filter(area =>
          area.bottleneckRisk === 'HIGH').length
      };

      // Priority distribution
      const priorityDistribution = {
        URGENT: stagingKits.filter(k => k.priority === 'URGENT').length,
        HIGH: stagingKits.filter(k => k.priority === 'HIGH').length,
        NORMAL: stagingKits.filter(k => k.priority === 'NORMAL').length,
        LOW: stagingKits.filter(k => k.priority === 'LOW').length
      };

      res.json({
        success: true,
        data: {
          metrics: stagingMetrics,
          priorityDistribution,
          activeKits: {
            staging: stagingKits,
            staged: stagedKits
          },
          utilization: locationUtilization,
          areas: stagingAreas
        }
      });

    } catch (error) {
      logger.error('Error generating staging dashboard', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to generate staging dashboard',
        error: error.message
      });
    }
  }
);

export default router;