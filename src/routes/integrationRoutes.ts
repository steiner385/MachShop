/**
 * Integration API Routes
 *
 * REST API endpoints for managing ERP/PLM integrations.
 * Provides CRUD operations for integration configurations,
 * manual sync triggers, health monitoring, and log viewing.
 *
 * Endpoints:
 * - GET    /api/integrations              - List all integrations
 * - GET    /api/integrations/:id          - Get integration details
 * - POST   /api/integrations              - Create new integration
 * - PUT    /api/integrations/:id          - Update integration
 * - DELETE /api/integrations/:id          - Delete integration
 * - POST   /api/integrations/:id/sync     - Trigger manual sync
 * - GET    /api/integrations/:id/health   - Get health status
 * - GET    /api/integrations/health/all   - Get all health statuses
 * - GET    /api/integrations/:id/logs     - Get integration logs
 * - POST   /api/integrations/:id/test     - Test connection
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { getIntegrationManager } from '../services/IntegrationManager';

const router = express.Router();
const prisma = new PrismaClient();

// Require authentication for all integration routes
router.use(authMiddleware);

/**
 * GET /api/integrations
 * List all integration configurations
 */
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const integrations = await prisma.integrationConfig.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
        enabled: true,
        lastSync: true,
        lastSyncStatus: true,
        lastError: true,
        errorCount: true,
        totalSyncs: true,
        successCount: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { displayName: 'asc' },
    });

    res.json(integrations);
  } catch (error: any) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

/**
 * GET /api/integrations/:id
 * Get integration configuration details
 */
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const integration = await prisma.integrationConfig.findUnique({
      where: { id },
      include: {
        logs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Don't expose sensitive config details
    const sanitized = {
      ...integration,
      config: {}, // Hide config for security
    };

    res.json(sanitized);
  } catch (error: any) {
    console.error('Error fetching integration:', error);
    res.status(500).json({ error: 'Failed to fetch integration' });
  }
});

/**
 * POST /api/integrations
 * Create new integration configuration
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, displayName, type, config, enabled } = req.body;

    // Validate required fields
    if (!name || !displayName || !type || !config) {
      return res.status(400).json({
        error: 'Missing required fields: name, displayName, type, config',
      });
    }

    // Encrypt configuration
    const manager = getIntegrationManager();
    const encryptedConfig = manager.encryptConfig(config);

    // Create integration config
    const integration = await prisma.integrationConfig.create({
      data: {
        name,
        displayName,
        type,
        config: encryptedConfig as any,
        enabled: enabled !== undefined ? enabled : true,
      },
    });

    // Initialize adapter if enabled
    if (integration.enabled) {
      await manager.initialize();
    }

    res.status(201).json({
      id: integration.id,
      name: integration.name,
      displayName: integration.displayName,
      type: integration.type,
      enabled: integration.enabled,
    });
  } catch (error: any) {
    console.error('Error creating integration:', error);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

/**
 * PUT /api/integrations/:id
 * Update integration configuration
 */
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { displayName, config, enabled } = req.body;

    const existing = await prisma.integrationConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const updateData: any = {};

    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }

    if (config !== undefined) {
      const manager = getIntegrationManager();
      updateData.config = manager.encryptConfig(config) as any;
    }

    if (enabled !== undefined) {
      updateData.enabled = enabled;
    }

    const updated = await prisma.integrationConfig.update({
      where: { id },
      data: updateData,
    });

    // Reinitialize if enabled status changed
    if (enabled !== undefined && enabled !== existing.enabled) {
      const manager = getIntegrationManager();
      await manager.initialize();
    }

    res.json({
      id: updated.id,
      name: updated.name,
      displayName: updated.displayName,
      type: updated.type,
      enabled: updated.enabled,
    });
  } catch (error: any) {
    console.error('Error updating integration:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

/**
 * DELETE /api/integrations/:id
 * Delete integration configuration
 */
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const existing = await prisma.integrationConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Delete associated logs first
    await prisma.integrationLog.deleteMany({
      where: { configId: id },
    });

    // Delete config
    await prisma.integrationConfig.delete({
      where: { id },
    });

    // Reinitialize manager
    const manager = getIntegrationManager();
    await manager.initialize();

    res.json({ message: 'Integration deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting integration:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

/**
 * POST /api/integrations/:id/sync
 * Trigger manual synchronization
 */
router.post('/:id/sync', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { jobType, filters } = req.body;

    const integration = await prisma.integrationConfig.findUnique({
      where: { id },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (!integration.enabled) {
      return res.status(400).json({ error: 'Integration is disabled' });
    }

    // Validate job type
    const validJobTypes = ['sync_items', 'sync_boms', 'sync_workorders'];
    if (!validJobTypes.includes(jobType)) {
      return res.status(400).json({
        error: `Invalid job type. Must be one of: ${validJobTypes.join(', ')}`,
      });
    }

    // Execute sync job
    const manager = getIntegrationManager();

    // Run sync in background and return immediately
    manager.executeSyncJob({
      configName: integration.name,
      jobType,
      filters,
    }).catch((error) => {
      console.error(`Background sync failed for ${integration.name}:`, error);
    });

    res.json({
      message: 'Synchronization started',
      integration: integration.name,
      jobType,
    });
  } catch (error: any) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ error: 'Failed to trigger synchronization' });
  }
});

/**
 * GET /api/integrations/:id/health
 * Get health status for specific integration
 */
router.get('/:id/health', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const integration = await prisma.integrationConfig.findUnique({
      where: { id },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const manager = getIntegrationManager();
    const adapter = manager.getAdapter(id);

    let health: any = {
      connected: false,
      error: 'Adapter not loaded',
    };

    if (adapter) {
      health = await adapter.getHealthStatus();
    }

    res.json({
      id: integration.id,
      name: integration.displayName,
      type: integration.type,
      enabled: integration.enabled,
      ...health,
      lastSync: integration.lastSync,
      lastSyncStatus: integration.lastSyncStatus,
      errorCount: integration.errorCount,
      lastError: integration.lastError,
    });
  } catch (error: any) {
    console.error('Error checking health:', error);
    res.status(500).json({ error: 'Failed to check health' });
  }
});

/**
 * GET /api/integrations/health/all
 * Get health status for all integrations
 */
router.get('/health/all', async (req: Request, res: Response): Promise<any> => {
  try {
    const manager = getIntegrationManager();
    const healthStatuses = await manager.getAllHealthStatus();

    res.json(healthStatuses);
  } catch (error: any) {
    console.error('Error fetching health statuses:', error);
    res.status(500).json({ error: 'Failed to fetch health statuses' });
  }
});

/**
 * GET /api/integrations/:id/logs
 * Get integration logs with pagination
 */
router.get('/:id/logs', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const operation = req.query.operation as string;
    const status = req.query.status as string;

    const integration = await prisma.integrationConfig.findUnique({
      where: { id },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Build filter
    const where: any = { configId: id };

    if (operation) {
      where.operation = operation;
    }

    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.integrationLog.count({ where });

    // Get logs
    const logs = await prisma.integrationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/**
 * POST /api/integrations/:id/test
 * Test connection to integration system
 */
router.post('/:id/test', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const integration = await prisma.integrationConfig.findUnique({
      where: { id },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const manager = getIntegrationManager();
    const adapter = manager.getAdapter(id);

    if (!adapter) {
      return res.status(400).json({ error: 'Adapter not loaded' });
    }

    // Run health check
    const health = await adapter.getHealthStatus();

    res.json({
      success: health.connected,
      ...health,
    });
  } catch (error: any) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
