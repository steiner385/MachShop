/**
 * ETL API Routes
 * Issue #34: Database Direct Import/ETL Engine
 *
 * REST API endpoints for database connections, ETL jobs, and executions
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../logging/logger';
import DatabaseConnectionService, { DatabaseConfig } from '../../services/migration/database/DatabaseConnectionService';
import ETLJobService, { ETLJobDefinition } from '../../services/migration/ETLJobService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const dbService = new DatabaseConnectionService();
const etlService = new ETLJobService();

// ============================================================================
// Database Connections
// ============================================================================

/**
 * POST /api/v1/migration/etl/connections
 * Create new database connection
 */
router.post('/connections', async (req: Request, res: Response) => {
  try {
    const config: DatabaseConfig = req.body;

    // Validate required fields
    if (!config.name || !config.type || !config.host || !config.database) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, host, database'
      });
    }

    // Store connection config
    const dbConnection = await prisma.databaseConnection.create({
      data: {
        name: config.name,
        type: config.type,
        host: config.host,
        port: config.port,
        database: config.database,
        username: config.username,
        encryptedPassword: config.password, // In production, encrypt this
        ssl: config.ssl || false,
        createdBy: req.user?.id || 'system'
      }
    });

    logger.info('Database connection created', { connectionId: dbConnection.id });

    res.status(201).json({
      success: true,
      data: {
        id: dbConnection.id,
        name: dbConnection.name,
        type: dbConnection.type,
        host: dbConnection.host,
        database: dbConnection.database
      }
    });
  } catch (error) {
    logger.error('Failed to create database connection:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/migration/etl/connections
 * List all database connections
 */
router.get('/connections', async (req: Request, res: Response) => {
  try {
    const connections = await prisma.databaseConnection.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        host: true,
        database: true,
        isActive: true,
        lastTestedAt: true,
        lastTestSuccess: true
      }
    });

    res.json({
      success: true,
      data: connections,
      count: connections.length
    });
  } catch (error) {
    logger.error('Failed to list database connections:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/migration/etl/connections/:id
 * Get specific database connection
 */
router.get('/connections/:id', async (req: Request, res: Response) => {
  try {
    const connection = await prisma.databaseConnection.findUnique({
      where: { id: req.params.id }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    res.json({
      success: true,
      data: connection
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/migration/etl/connections/:id/test
 * Test database connection
 */
router.post('/connections/:id/test', async (req: Request, res: Response) => {
  try {
    const connection = await prisma.databaseConnection.findUnique({
      where: { id: req.params.id }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const config: DatabaseConfig = {
      name: connection.name,
      type: connection.type as any,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: connection.encryptedPassword,
      ssl: connection.ssl
    };

    const result = await dbService.testConnection(config);

    // Update test result in database
    await prisma.databaseConnection.update({
      where: { id: req.params.id },
      data: {
        lastTestedAt: new Date(),
        lastTestSuccess: result.success
      }
    });

    res.json(result);
  } catch (error) {
    logger.error('Connection test failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Connection test failed'
    });
  }
});

/**
 * POST /api/v1/migration/etl/connections/:id/discover
 * Discover database schema
 */
router.post('/connections/:id/discover', async (req: Request, res: Response) => {
  try {
    const connection = await prisma.databaseConnection.findUnique({
      where: { id: req.params.id }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const config: DatabaseConfig = {
      name: connection.name,
      type: connection.type as any,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: connection.encryptedPassword,
      ssl: connection.ssl
    };

    // Create connection for schema discovery
    const connectionId = await dbService.createConnection(config);
    const schema = await dbService.discoverSchema(connectionId);
    await dbService.closeConnection(connectionId);

    res.json({
      success: true,
      data: schema,
      tableCount: schema.tables.length,
      viewCount: schema.views.length
    });
  } catch (error) {
    logger.error('Schema discovery failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Schema discovery failed'
    });
  }
});

// ============================================================================
// ETL Jobs
// ============================================================================

/**
 * POST /api/v1/migration/etl/jobs
 * Create ETL job
 */
router.post('/jobs', async (req: Request, res: Response) => {
  try {
    const jobDef: ETLJobDefinition = req.body;

    const job = await etlService.createJob(jobDef);

    // Store in database
    const dbJob = await prisma.eTLJob.create({
      data: {
        name: job.name || '',
        description: job.description,
        sourceConnectionId: job.sourceConnectionId,
        targetEntityType: job.targetEntityType,
        extractionConfig: job.extraction,
        transformationConfig: job.transformation,
        loadConfig: job.load,
        scheduleConfig: job.schedule,
        createdBy: req.user?.id || 'system'
      }
    });

    res.status(201).json({
      success: true,
      data: { id: dbJob.id, name: dbJob.name }
    });
  } catch (error) {
    logger.error('Failed to create ETL job:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create job'
    });
  }
});

/**
 * GET /api/v1/migration/etl/jobs
 * List ETL jobs
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.eTLJob.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        targetEntityType: true,
        isActive: true,
        lastExecutedAt: true
      }
    });

    res.json({
      success: true,
      data: jobs,
      count: jobs.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/migration/etl/jobs/:id/preview
 * Preview extraction
 */
router.post('/jobs/:id/preview', async (req: Request, res: Response) => {
  try {
    const dbJob = await prisma.eTLJob.findUnique({
      where: { id: req.params.id }
    });

    if (!dbJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job: ETLJobDefinition = {
      id: dbJob.id,
      name: dbJob.name,
      sourceConnectionId: dbJob.sourceConnectionId,
      targetEntityType: dbJob.targetEntityType,
      extraction: dbJob.extractionConfig as any,
      transformation: dbJob.transformationConfig as any,
      load: dbJob.loadConfig as any
    };

    const preview = await etlService.previewExtraction(req.params.id, 100);

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    logger.error('Preview failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Preview failed'
    });
  }
});

/**
 * POST /api/v1/migration/etl/jobs/:id/execute
 * Execute ETL job
 */
router.post('/jobs/:id/execute', async (req: Request, res: Response) => {
  try {
    const dbJob = await prisma.eTLJob.findUnique({
      where: { id: req.params.id }
    });

    if (!dbJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job: ETLJobDefinition = {
      id: dbJob.id,
      name: dbJob.name,
      sourceConnectionId: dbJob.sourceConnectionId,
      targetEntityType: dbJob.targetEntityType,
      extraction: dbJob.extractionConfig as any,
      transformation: dbJob.transformationConfig as any,
      load: dbJob.loadConfig as any
    };

    const execution = await etlService.executeJob(req.params.id);

    // Store execution in database
    const dbExecution = await prisma.eTLJobExecution.create({
      data: {
        jobId: dbJob.id,
        status: execution.status,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        duration: execution.duration,
        extractedRows: execution.extractedRows,
        transformedRows: execution.transformedRows,
        loadedRows: execution.loadedRows,
        failedRows: execution.failedRows,
        skippedRows: execution.skippedRows,
        errorLog: execution.errors,
        warningLog: execution.warnings
      }
    });

    // Update job last executed time
    await prisma.eTLJob.update({
      where: { id: req.params.id },
      data: { lastExecutedAt: new Date() }
    });

    res.json({
      success: true,
      data: {
        executionId: dbExecution.id,
        status: execution.status,
        extracted: execution.extractedRows,
        transformed: execution.transformedRows,
        loaded: execution.loadedRows,
        failed: execution.failedRows,
        duration: execution.duration
      }
    });
  } catch (error) {
    logger.error('Job execution failed:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Execution failed'
    });
  }
});

/**
 * GET /api/v1/migration/etl/executions/:id
 * Get execution status
 */
router.get('/executions/:id', async (req: Request, res: Response) => {
  try {
    const execution = await prisma.eTLJobExecution.findUnique({
      where: { id: req.params.id }
    });

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
