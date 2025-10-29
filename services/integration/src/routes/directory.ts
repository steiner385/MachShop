/**
 * Directory Configuration API Routes
 * Issue #128: External Integration: LDAP/AD Role Synchronization
 *
 * REST API endpoints for managing directory configurations
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client-integration';
import { directoryServiceFactory } from '../services/directory/factory';
import { directoryLogger } from '../utils/logger';
import { DirectoryConfigInput, DirectoryConfigUpdate } from '../types/directory';

const router = Router();
const prisma = new PrismaClient();

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * GET /api/v1/directory/configs
 * Get all directory configurations with optional filtering
 */
router.get('/configs', async (req, res) => {
  try {
    const { type, isActive, limit = 50, offset = 0 } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const configs = await prisma.directoryConfig.findMany({
      where,
      include: {
        userMappings: true,
        groupMappings: true,
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.directoryConfig.count({ where });

    res.json({
      success: true,
      data: configs,
      meta: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    directoryLogger.error('Failed to fetch directory configurations', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch directory configurations',
    });
  }
});

/**
 * GET /api/v1/directory/configs/:id
 * Get specific directory configuration
 */
router.get('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const config = await prisma.directoryConfig.findUnique({
      where: { id },
      include: {
        userMappings: true,
        groupMappings: true,
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Directory configuration not found',
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    directoryLogger.error('Failed to fetch directory configuration', {
      configId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch directory configuration',
    });
  }
});

/**
 * POST /api/v1/directory/configs
 * Create new directory configuration
 */
router.post('/configs', async (req, res) => {
  try {
    const configData: DirectoryConfigInput = req.body;

    // Validate required fields
    if (!configData.name || !configData.type || !configData.host || !configData.baseDN) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, host, baseDN',
      });
    }

    const config = await prisma.directoryConfig.create({
      data: {
        name: configData.name,
        description: configData.description,
        type: configData.type,
        host: configData.host,
        port: configData.port || 389,
        useSSL: configData.useSSL || false,
        useStartTLS: configData.useStartTLS || false,
        baseDN: configData.baseDN,
        bindDN: configData.bindDN,
        bindPassword: configData.bindPassword,
        userSearchBase: configData.userSearchBase,
        userSearchFilter: configData.userSearchFilter,
        groupSearchBase: configData.groupSearchBase,
        groupSearchFilter: configData.groupSearchFilter,
        timeout: configData.timeout || 30000,
        maxConnections: configData.maxConnections || 5,
        enableSync: configData.enableSync || false,
        syncInterval: configData.syncInterval || 3600,
        isActive: true,
      },
    });

    directoryLogger.info('Directory configuration created', {
      configId: config.id,
      name: config.name,
      type: config.type,
    });

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error) {
    directoryLogger.error('Failed to create directory configuration', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create directory configuration',
    });
  }
});

/**
 * PUT /api/v1/directory/configs/:id
 * Update directory configuration
 */
router.put('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: DirectoryConfigUpdate = req.body;

    const config = await prisma.directoryConfig.update({
      where: { id },
      data: updateData,
    });

    directoryLogger.info('Directory configuration updated', {
      configId: config.id,
      name: config.name,
    });

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    directoryLogger.error('Failed to update directory configuration', {
      configId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update directory configuration',
    });
  }
});

/**
 * DELETE /api/v1/directory/configs/:id
 * Delete directory configuration
 */
router.delete('/configs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.directoryConfig.delete({
      where: { id },
    });

    directoryLogger.info('Directory configuration deleted', {
      configId: id,
    });

    res.json({
      success: true,
      message: 'Directory configuration deleted successfully',
    });
  } catch (error) {
    directoryLogger.error('Failed to delete directory configuration', {
      configId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete directory configuration',
    });
  }
});

// ============================================================================
// Connection Testing
// ============================================================================

/**
 * POST /api/v1/directory/configs/:id/test-connection
 * Test connection to directory server
 */
router.post('/configs/:id/test-connection', async (req, res) => {
  try {
    const { id } = req.params;

    const config = await prisma.directoryConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Directory configuration not found',
      });
    }

    const service = await directoryServiceFactory.createService(config);
    const result = await service.testConnection(config);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    directoryLogger.error('Connection test failed', {
      configId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Connection test failed',
    });
  }
});

/**
 * POST /api/v1/directory/configs/:id/test-search
 * Test search operations
 */
router.post('/configs/:id/test-search', async (req, res) => {
  try {
    const { id } = req.params;

    const config = await prisma.directoryConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Directory configuration not found',
      });
    }

    const service = await directoryServiceFactory.createService(config);
    const result = await service.testSearch(config);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    directoryLogger.error('Search test failed', {
      configId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Search test failed',
    });
  }
});

// ============================================================================
// Synchronization Operations
// ============================================================================

/**
 * POST /api/v1/directory/configs/:id/sync
 * Trigger synchronization
 */
router.post('/configs/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'full', dryRun = false } = req.body;

    const config = await prisma.directoryConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Directory configuration not found',
      });
    }

    if (!config.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Directory configuration is not active',
      });
    }

    const service = await directoryServiceFactory.createService(config);
    const result = await service.fullSync({ type, dryRun });

    // Log sync result
    await prisma.directorySyncLog.create({
      data: {
        configId: config.id,
        type: type.toUpperCase(),
        status: result.success ? 'COMPLETED' : 'FAILED',
        batchId: result.batchId,
        startedAt: new Date(Date.now() - result.duration),
        completedAt: new Date(),
        usersProcessed: result.statistics.usersProcessed,
        usersCreated: result.statistics.usersCreated,
        usersUpdated: result.statistics.usersUpdated,
        usersDeactivated: result.statistics.usersDeactivated,
        groupsProcessed: result.statistics.groupsProcessed,
        rolesAssigned: result.statistics.rolesAssigned,
        rolesRevoked: result.statistics.rolesRevoked,
        errorCount: result.statistics.errorCount,
        warningCount: result.statistics.warningCount,
        summary: result.summary,
        errors: result.errors,
        warnings: result.warnings,
      },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    directoryLogger.error('Synchronization failed', {
      configId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Synchronization failed',
    });
  }
});

/**
 * GET /api/v1/directory/configs/:id/sync-logs
 * Get synchronization logs
 */
router.get('/configs/:id/sync-logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const logs = await prisma.directorySyncLog.findMany({
      where: { configId: id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.directorySyncLog.count({
      where: { configId: id },
    });

    res.json({
      success: true,
      data: logs,
      meta: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    directoryLogger.error('Failed to fetch sync logs', {
      configId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync logs',
    });
  }
});

// ============================================================================
// Health and Status
// ============================================================================

/**
 * GET /api/v1/directory/health
 * Get directory service health status
 */
router.get('/health', async (req, res) => {
  try {
    const activeConfigs = await prisma.directoryConfig.count({
      where: { isActive: true },
    });

    const recentSyncs = await prisma.directorySyncLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    const failedSyncs = await prisma.directorySyncLog.count({
      where: {
        status: 'FAILED',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    res.json({
      success: true,
      data: {
        activeConfigurations: activeConfigs,
        recentSyncs,
        failedSyncs,
        factoryStats: directoryServiceFactory.getCacheStats(),
        timestamp: new Date(),
      },
    });
  } catch (error) {
    directoryLogger.error('Failed to get health status', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get health status',
    });
  }
});

export default router;