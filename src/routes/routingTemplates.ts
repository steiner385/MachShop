/**
 * Routing Template API Routes
 * Sprint 2: Backend Services & APIs
 *
 * REST API endpoints for routing template library management
 */

import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import {
  requireSiteAccess,
  requireRoutingAccess,
  requireRoutingWrite
} from '../middleware/auth';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createTemplateSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  isPublic: z.boolean().optional().default(false),
  visualData: z.any().optional(), // ReactFlow graph structure
  sourceRoutingId: z.string().uuid().optional(),
  siteId: z.string().uuid(),
  createdById: z.string().uuid()
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  rating: z.number().min(1).max(5).optional(),
  visualData: z.any().optional()
});

const searchTemplatesSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  siteId: z.string().uuid().optional(),
  isPublic: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  sortBy: z.enum(['name', 'usageCount', 'rating', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.number().int().positive().optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0)
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/v1/routing-templates
 * List and search routing templates
 */
router.get(
  '/',
  requireSiteAccess,
  asyncHandler(async (req: any, res) => {
    const query = searchTemplatesSchema.parse({
      search: req.query.search,
      category: req.query.category,
      tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : undefined,
      siteId: req.query.siteId,
      isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
      isFavorite: req.query.isFavorite === 'true' ? true : req.query.isFavorite === 'false' ? false : undefined,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    });

    // Build where clause for filtering
    const where: any = {
      AND: [
        {
          OR: [
            { siteId: req.user.siteId },
            { isPublic: true }
          ]
        }
      ]
    };

    if (query.search) {
      where.AND.push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { tags: { hasSome: [query.search] } }
        ]
      });
    }

    if (query.category) {
      where.AND.push({ category: query.category });
    }

    if (query.tags && query.tags.length > 0) {
      where.AND.push({ tags: { hasSome: query.tags } });
    }

    if (query.siteId) {
      // Override the site filter with specific siteId
      where.AND[0] = { siteId: query.siteId };
    }

    if (query.isFavorite !== undefined) {
      where.AND.push({ isFavorite: query.isFavorite });
    }

    // Execute query with pagination and sorting
    const [templates, total] = await Promise.all([
      prisma.routingTemplate.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          site: {
            select: {
              id: true,
              name: true
            }
          },
          sourceRouting: {
            select: {
              id: true,
              routingNumber: true,
              description: true
            }
          }
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        take: query.limit,
        skip: query.offset
      }),
      prisma.routingTemplate.count({ where })
    ]);

    logger.info(`Found ${templates.length} routing templates for user ${req.user.id}`);

    res.json({
      templates,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + templates.length < total
      }
    });
  })
);

/**
 * GET /api/v1/routing-templates/:id
 * Get routing template details
 */
router.get(
  '/:id',
  requireSiteAccess,
  asyncHandler(async (req: any, res) => {
    const { id } = req.params;

    const template = await prisma.routingTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        site: {
          select: {
            id: true,
            name: true
          }
        },
        sourceRouting: {
          include: {
            steps: {
              include: {
                operation: true,
                workCenter: true
              },
              orderBy: { stepNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!template) {
      throw new NotFoundError('Routing template not found');
    }

    // Check access: must be public or from user's site
    if (!template.isPublic && template.siteId !== req.user.siteId) {
      throw new ValidationError('Access denied to this template');
    }

    logger.info(`Retrieved routing template ${id} for user ${req.user.id}`);

    res.json(template);
  })
);

/**
 * POST /api/v1/routing-templates
 * Create a new routing template (typically from an existing routing)
 */
router.post(
  '/',
  requireRoutingWrite,
  asyncHandler(async (req: any, res) => {
    const data = createTemplateSchema.parse(req.body);

    // If creating from a routing, extract visual data and steps
    let visualData = data.visualData;
    if (data.sourceRoutingId && !visualData) {
      const sourceRouting = await prisma.routing.findUnique({
        where: { id: data.sourceRoutingId },
        include: {
          steps: {
            include: {
              operation: true,
              workCenter: true
            },
            orderBy: { stepNumber: 'asc' }
          }
        }
      });

      if (!sourceRouting) {
        throw new NotFoundError('Source routing not found');
      }

      // Extract visual data from routing notes if present
      if (sourceRouting.notes) {
        const visualDataMatch = sourceRouting.notes.match(/\[VISUAL_DATA\](.*?)\[\/VISUAL_DATA\]/s);
        if (visualDataMatch) {
          try {
            visualData = JSON.parse(visualDataMatch[1]);
          } catch (error) {
            logger.warn(`Failed to parse visual data from routing ${data.sourceRoutingId}`);
          }
        }
      }
    }

    const template = await prisma.routingTemplate.create({
      data: {
        name: data.name,
        category: data.category,
        description: data.description,
        tags: data.tags,
        isPublic: data.isPublic,
        visualData: visualData || {},
        sourceRoutingId: data.sourceRoutingId,
        siteId: data.siteId,
        createdById: data.createdById
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        site: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    logger.info(`Created routing template ${template.id} from routing ${data.sourceRoutingId || 'scratch'}`);

    res.status(201).json(template);
  })
);

/**
 * PUT /api/v1/routing-templates/:id
 * Update a routing template
 */
router.put(
  '/:id',
  requireRoutingWrite,
  asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const data = updateTemplateSchema.parse(req.body);

    // Check template exists and user has access
    const existingTemplate = await prisma.routingTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      throw new NotFoundError('Routing template not found');
    }

    if (existingTemplate.siteId !== req.user.siteId) {
      throw new ValidationError('Cannot update template from another site');
    }

    const template = await prisma.routingTemplate.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        site: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    logger.info(`Updated routing template ${id}`);

    res.json(template);
  })
);

/**
 * DELETE /api/v1/routing-templates/:id
 * Delete a routing template
 */
router.delete(
  '/:id',
  requireRoutingWrite,
  asyncHandler(async (req: any, res) => {
    const { id } = req.params;

    // Check template exists and user has access
    const existingTemplate = await prisma.routingTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      throw new NotFoundError('Routing template not found');
    }

    if (existingTemplate.siteId !== req.user.siteId) {
      throw new ValidationError('Cannot delete template from another site');
    }

    await prisma.routingTemplate.delete({
      where: { id }
    });

    logger.info(`Deleted routing template ${id}`);

    res.status(204).send();
  })
);

/**
 * POST /api/v1/routing-templates/:id/favorite
 * Toggle favorite status for a template
 */
router.post(
  '/:id/favorite',
  requireSiteAccess,
  asyncHandler(async (req: any, res) => {
    const { id } = req.params;

    // Check template exists and user has access
    const existingTemplate = await prisma.routingTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      throw new NotFoundError('Routing template not found');
    }

    // Check access: must be public or from user's site
    if (!existingTemplate.isPublic && existingTemplate.siteId !== req.user.siteId) {
      throw new ValidationError('Access denied to this template');
    }

    const template = await prisma.routingTemplate.update({
      where: { id },
      data: {
        isFavorite: !existingTemplate.isFavorite
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        site: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    logger.info(`Toggled favorite for routing template ${id} to ${template.isFavorite}`);

    res.json(template);
  })
);

/**
 * POST /api/v1/routing-templates/:id/use
 * Create a new routing from a template
 */
router.post(
  '/:id/use',
  requireRoutingWrite,
  asyncHandler(async (req: any, res) => {
    const { id } = req.params;
    const { partId, routingNumber, siteId } = req.body;

    if (!partId || !routingNumber || !siteId) {
      throw new ValidationError('partId, routingNumber, and siteId are required');
    }

    // Get template with source routing data
    const template = await prisma.routingTemplate.findUnique({
      where: { id },
      include: {
        sourceRouting: {
          include: {
            steps: {
              include: {
                operation: true,
                workCenter: true
              },
              orderBy: { stepNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!template) {
      throw new NotFoundError('Routing template not found');
    }

    // Check access: must be public or from user's site
    if (!template.isPublic && template.siteId !== req.user.siteId) {
      throw new ValidationError('Access denied to this template');
    }

    // Create new routing from template
    const routingData: any = {
      routingNumber,
      partId,
      siteId,
      version: '1.0',
      lifecycleState: 'DRAFT',
      description: template.description || `Created from template: ${template.name}`,
      notes: template.visualData ? `[VISUAL_DATA]${JSON.stringify(template.visualData)}[/VISUAL_DATA]` : undefined
    };

    // Copy steps from source routing if available
    if (template.sourceRouting && template.sourceRouting.steps.length > 0) {
      routingData.steps = {
        create: template.sourceRouting.steps.map(step => ({
          stepNumber: step.stepNumber,
          operationId: step.operationId,
          workCenterId: step.workCenterId,
          stepType: step.stepType,
          setupTimeOverride: step.setupTimeOverride,
          cycleTimeOverride: step.cycleTimeOverride,
          teardownTimeOverride: step.teardownTimeOverride,
          isOptional: step.isOptional,
          isQualityInspection: step.isQualityInspection,
          isCriticalPath: step.isCriticalPath,
          stepInstructions: step.stepInstructions,
          notes: step.notes
        }))
      };
    }

    const newRouting = await prisma.routing.create({
      data: routingData,
      include: {
        steps: {
          include: {
            operation: true,
            workCenter: true
          },
          orderBy: { stepNumber: 'asc' }
        },
        part: true,
        site: true
      }
    });

    // Increment template usage count
    await prisma.routingTemplate.update({
      where: { id },
      data: {
        usageCount: { increment: 1 }
      }
    });

    logger.info(`Created routing ${newRouting.id} from template ${id}, usage count incremented`);

    res.status(201).json(newRouting);
  })
);

export default router;
