/**
 * ERPController - Handles ERP integration operations
 * Issue #60: Phase 7 - REST API for ERP Integration Management
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import ERPIntegrationService from '../services/erp/ERPIntegrationService';
import { ERPAdapterFactory } from '../services/erp/adapters/ERPAdapterFactory';
import { SyncJobScheduler } from '../services/erp/SyncJobScheduler';
import { ReconciliationService, SupplierReconciliation, POReconciliation, InventoryReconciliation } from '../services/erp/reconciliation';
import { logger } from '../utils/logger';

/**
 * ERP Controller
 */
export class ERPController {
  private prisma: PrismaClient;
  private erpService: ERPIntegrationService;
  private scheduler: SyncJobScheduler;
  private reconciliationService: ReconciliationService;

  constructor(
    prisma?: PrismaClient,
    erpService?: ERPIntegrationService,
    scheduler?: SyncJobScheduler
  ) {
    this.prisma = prisma || new PrismaClient();
    this.erpService = erpService || new ERPIntegrationService(this.prisma);
    this.scheduler = scheduler || new SyncJobScheduler(this.prisma, this.erpService);

    // Initialize reconciliation service
    this.reconciliationService = new ReconciliationService(this.prisma, this.erpService);
    this.reconciliationService.registerEntityReconciliation('Supplier', new SupplierReconciliation(this.prisma, this.erpService));
    this.reconciliationService.registerEntityReconciliation('PurchaseOrder', new POReconciliation(this.prisma, this.erpService));
    this.reconciliationService.registerEntityReconciliation('Inventory', new InventoryReconciliation(this.prisma, this.erpService));
  }

  /**
   * Create new ERP integration
   */
  async createIntegration(req: Request, res: Response): Promise<void> {
    try {
      const { name, erpSystem, config, description } = req.body;

      // Validate required fields
      if (!name || !erpSystem || !config) {
        res.status(400).json({
          error: 'Missing required fields: name, erpSystem, config',
        });
        return;
      }

      const integration = await this.erpService.configureERPSystem(
        name,
        erpSystem,
        {
          ...config,
          description,
        }
      );

      logger.info('Created ERP integration', {
        integrationId: integration.id,
        name,
        erpSystem,
      });

      res.status(201).json({
        message: 'ERP integration created successfully',
        integration,
      });
    } catch (error) {
      logger.error('Failed to create ERP integration', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to create ERP integration',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update ERP integration
   */
  async updateIntegration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const integration = await this.prisma.erpIntegration.update({
        where: { id },
        data: updates,
      });

      logger.info('Updated ERP integration', {
        integrationId: id,
      });

      res.json({
        message: 'ERP integration updated successfully',
        integration,
      });
    } catch (error) {
      logger.error('Failed to update ERP integration', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to update ERP integration',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get ERP integration by ID
   */
  async getIntegration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const integration = await this.prisma.erpIntegration.findUnique({
        where: { id },
        include: {
          fieldMappings: true,
          syncTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!integration) {
        res.status(404).json({
          error: 'Integration not found',
        });
        return;
      }

      res.json({
        integration,
      });
    } catch (error) {
      logger.error('Failed to get ERP integration', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to get ERP integration',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * List all ERP integrations
   */
  async listIntegrations(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const integrations = await this.prisma.erpIntegration.findMany({
        take: parseInt(String(limit)),
        skip: parseInt(String(offset)),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              fieldMappings: true,
              syncTransactions: true,
            },
          },
        },
      });

      const total = await this.prisma.erpIntegration.count();

      res.json({
        integrations,
        pagination: {
          total,
          limit: parseInt(String(limit)),
          offset: parseInt(String(offset)),
        },
      });
    } catch (error) {
      logger.error('Failed to list ERP integrations', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to list ERP integrations',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete ERP integration
   */
  async deleteIntegration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Check if integration has active syncs
      const activeSyncs = await this.prisma.erpSyncTransaction.count({
        where: {
          erpIntegrationId: id,
          status: 'IN_PROGRESS',
        },
      });

      if (activeSyncs > 0) {
        res.status(400).json({
          error: 'Cannot delete integration with active sync operations',
          activeSyncs,
        });
        return;
      }

      await this.prisma.erpIntegration.delete({
        where: { id },
      });

      logger.info('Deleted ERP integration', {
        integrationId: id,
      });

      res.json({
        message: 'ERP integration deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete ERP integration', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to delete ERP integration',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Test ERP connection
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.erpService.testConnection(id);

      logger.info('Tested ERP connection', {
        integrationId: id,
        connected: result.connected,
      });

      res.json({
        connectionTest: result,
      });
    } catch (error) {
      logger.error('Failed to test ERP connection', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to test ERP connection',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Set field mappings for an entity type
   */
  async setFieldMappings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { entityType, mappings } = req.body;

      if (!entityType || !mappings || !Array.isArray(mappings)) {
        res.status(400).json({
          error: 'Missing required fields: entityType, mappings (array)',
        });
        return;
      }

      const result = await this.erpService.setFieldMappings(id, entityType, mappings);

      logger.info('Set field mappings', {
        integrationId: id,
        entityType,
        mappingCount: mappings.length,
      });

      res.status(201).json({
        message: 'Field mappings configured successfully',
        result,
      });
    } catch (error) {
      logger.error('Failed to set field mappings', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to set field mappings',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get field mappings for an entity type
   */
  async getFieldMappings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { entityType } = req.query;

      if (!entityType) {
        res.status(400).json({
          error: 'Missing required query parameter: entityType',
        });
        return;
      }

      const mappings = await this.erpService.getFieldMappings(id, String(entityType));

      res.json({
        entityType,
        mappings,
      });
    } catch (error) {
      logger.error('Failed to get field mappings', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to get field mappings',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Manually trigger a sync job
   */
  async triggerSync(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { jobType, batchSize, dryRun, filters } = req.body;

      if (!jobType) {
        res.status(400).json({
          error: 'Missing required field: jobType',
        });
        return;
      }

      const job = await this.scheduler.queueSyncJob(id, jobType, {
        batchSize: batchSize || 100,
        dryRun: dryRun || false,
        filters: filters || {},
      });

      logger.info('Triggered manual sync job', {
        integrationId: id,
        jobType,
        jobId: job.id,
      });

      res.status(202).json({
        message: 'Sync job queued successfully',
        job: {
          id: job.id,
          name: job.name,
          data: job.data,
        },
      });
    } catch (error) {
      logger.error('Failed to trigger sync job', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to trigger sync job',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get sync transaction log
   */
  async getSyncTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0, status, entityType } = req.query;

      const where: any = {
        erpIntegrationId: id,
      };

      if (status) where.status = status;
      if (entityType) where.entityType = entityType;

      const transactions = await this.prisma.erpSyncTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(String(limit)),
        skip: parseInt(String(offset)),
      });

      const total = await this.prisma.erpSyncTransaction.count({ where });

      res.json({
        transactions,
        pagination: {
          total,
          limit: parseInt(String(limit)),
          offset: parseInt(String(offset)),
        },
      });
    } catch (error) {
      logger.error('Failed to get sync transactions', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to get sync transactions',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get reconciliation reports
   */
  async getReconciliationReports(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0, entityType } = req.query;

      const reports = await this.reconciliationService.getReconciliationReports(id, {
        limit: parseInt(String(limit)),
        offset: parseInt(String(offset)),
        entityType: String(entityType) || undefined,
      });

      res.json({
        reports,
      });
    } catch (error) {
      logger.error('Failed to get reconciliation reports', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to get reconciliation reports',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Trigger reconciliation manually
   */
  async triggerReconciliation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { entityType } = req.body;

      if (!entityType) {
        res.status(400).json({
          error: 'Missing required field: entityType',
        });
        return;
      }

      const report = await this.reconciliationService.reconcile(id, entityType);

      if (!report) {
        res.status(400).json({
          error: `No reconciliation handler for entity type: ${entityType}`,
        });
        return;
      }

      logger.info('Triggered reconciliation', {
        integrationId: id,
        entityType,
        discrepancies: report.discrepancyCount,
      });

      res.status(202).json({
        message: 'Reconciliation completed',
        report,
      });
    } catch (error) {
      logger.error('Failed to trigger reconciliation', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to trigger reconciliation',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get pending discrepancies
   */
  async getPendingDiscrepancies(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const discrepancies = await this.reconciliationService.getPendingDiscrepancies(id);

      res.json({
        discrepancies,
        count: discrepancies.length,
      });
    } catch (error) {
      logger.error('Failed to get pending discrepancies', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to get pending discrepancies',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Apply correction to discrepancy
   */
  async applyCorrection(req: Request, res: Response): Promise<void> {
    try {
      const { discrepancyId } = req.params;
      const { action } = req.body;

      if (!action) {
        res.status(400).json({
          error: 'Missing required field: action (UPDATE_MES, UPDATE_ERP, or ACCEPT_DISCREPANCY)',
        });
        return;
      }

      await this.reconciliationService.applyCorrection(discrepancyId, action);

      logger.info('Applied correction to discrepancy', {
        discrepancyId,
        action,
      });

      res.json({
        message: 'Correction applied successfully',
      });
    } catch (error) {
      logger.error('Failed to apply correction', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to apply correction',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const stats = await this.scheduler.getQueueStats(id);

      res.json({
        stats,
      });
    } catch (error) {
      logger.error('Failed to get queue stats', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to get queue stats',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get available ERP adapters
   */
  async getAvailableAdapters(req: Request, res: Response): Promise<void> {
    try {
      const stats = ERPAdapterFactory.getStatistics();

      res.json({
        adapters: stats.adapters,
        registeredAdapters: stats.registeredAdapters,
        activeInstances: stats.activeInstances,
      });
    } catch (error) {
      logger.error('Failed to get available adapters', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'Failed to get available adapters',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default ERPController;
