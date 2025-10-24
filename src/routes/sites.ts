/**
 * Sites API Routes
 * Provides endpoints for site management and multi-site operations
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/sites
 * Get all sites with optional filtering
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { active } = req.query;

    const where = active !== undefined
      ? { isActive: active === 'true' }
      : undefined;

    const sites = await prisma.site.findMany({
      where,
      orderBy: {
        siteName: 'asc'
      },
      select: {
        id: true,
        siteName: true,
        siteCode: true,
        location: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        enterpriseId: true
      }
    });

    res.json({
      success: true,
      data: sites,
      sites // For backwards compatibility with frontend
    });
  } catch (error: any) {
    console.error('Error fetching sites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sites',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/sites/:id
 * Get a single site by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const site = await prisma.site.findUnique({
      where: { id },
      include: {
        areas: {
          include: {
            workCenters: true
          }
        },
        equipment: {
          take: 10 // Limit equipment to first 10
        },
        _count: {
          select: {
            workOrders: true,
            routings: true,
            operations: true
          }
        }
      }
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    res.json({
      success: true,
      data: site
    });
  } catch (error: any) {
    console.error('Error fetching site:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch site',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/sites/code/:siteCode
 * Get a site by site code
 */
router.get('/code/:siteCode', async (req: Request, res: Response): Promise<any> => {
  try {
    const { siteCode } = req.params;

    const site = await prisma.site.findUnique({
      where: { siteCode },
      include: {
        areas: true,
        _count: {
          select: {
            workOrders: true,
            routings: true
          }
        }
      }
    });

    if (!site) {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    res.json({
      success: true,
      data: site
    });
  } catch (error: any) {
    console.error('Error fetching site by code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch site',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/sites
 * Create a new site
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { siteName, siteCode, location, enterpriseId, isActive = true } = req.body;

    // Validate required fields
    if (!siteName || !siteCode) {
      return res.status(400).json({
        success: false,
        error: 'Site name and site code are required'
      });
    }

    const site = await prisma.site.create({
      data: {
        siteName,
        siteCode,
        location,
        enterpriseId,
        isActive
      }
    });

    res.status(201).json({
      success: true,
      data: site,
      message: 'Site created successfully'
    });
  } catch (error: any) {
    console.error('Error creating site:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Site code already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create site',
      message: error.message
    });
  }
});

/**
 * PUT /api/v1/sites/:id
 * Update an existing site
 */
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { siteName, siteCode, location, enterpriseId, isActive } = req.body;

    const site = await prisma.site.update({
      where: { id },
      data: {
        ...(siteName && { siteName }),
        ...(siteCode && { siteCode }),
        ...(location !== undefined && { location }),
        ...(enterpriseId !== undefined && { enterpriseId }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({
      success: true,
      data: site,
      message: 'Site updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating site:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Site code already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update site',
      message: error.message
    });
  }
});

/**
 * DELETE /api/v1/sites/:id
 * Delete a site (soft delete by setting isActive to false)
 */
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      // Hard delete (use with caution)
      await prisma.site.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Site permanently deleted'
      });
    } else {
      // Soft delete
      const site = await prisma.site.update({
        where: { id },
        data: { isActive: false }
      });

      res.json({
        success: true,
        data: site,
        message: 'Site deactivated successfully'
      });
    }
  } catch (error: any) {
    console.error('Error deleting site:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Site not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete site',
      message: error.message
    });
  }
});

export default router;
