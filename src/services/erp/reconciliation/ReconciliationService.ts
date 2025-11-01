/**
 * ReconciliationService - Coordinates reconciliation between MES and ERP data
 * Issue #60: Phase 3 - Data reconciliation and audit capability
 *
 * Provides:
 * - Reconciliation job orchestration
 * - Discrepancy detection and reporting
 * - Reconciliation history tracking
 * - Manual correction workflow
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';
import ERPIntegrationService from '../ERPIntegrationService';
import WebhookService, { WebhookEventType } from '../webhooks/WebhookService';

/**
 * Discrepancy found between MES and ERP
 */
export interface Discrepancy {
  id?: string;
  entityType: string;
  entityId: string;
  mesValue: any;
  erpValue: any;
  fieldName: string;
  discrepancyType: 'MISSING_IN_MES' | 'MISSING_IN_ERP' | 'VALUE_MISMATCH' | 'QUANTITY_VARIANCE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  correctionRequired: boolean;
  correctionStatus?: 'PENDING' | 'APPROVED' | 'APPLIED' | 'REJECTED';
}

/**
 * Reconciliation report
 */
export interface ReconciliationReport {
  id?: string;
  integrationId: string;
  entityType: string;
  startTime: Date;
  endTime?: Date;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  totalRecords: number;
  matchedRecords: number;
  discrepancyCount: number;
  discrepancies: Discrepancy[];
  error?: string;
}

/**
 * Abstract base class for entity-specific reconciliation
 */
export abstract class EntityReconciliation {
  protected prisma: PrismaClient;
  protected erpService: ERPIntegrationService;

  constructor(prisma?: PrismaClient, erpService?: ERPIntegrationService) {
    this.prisma = prisma || new PrismaClient();
    this.erpService = erpService || new ERPIntegrationService(this.prisma);
  }

  /**
   * Get entity type this reconciliation handles
   */
  abstract getEntityType(): string;

  /**
   * Fetch MES records for reconciliation
   */
  abstract fetchMESRecords(integrationId: string, filters?: any): Promise<any[]>;

  /**
   * Fetch ERP records for reconciliation
   */
  abstract fetchERPRecords(integrationId: string, filters?: any): Promise<any[]>;

  /**
   * Compare individual records and detect discrepancies
   */
  abstract compareRecords(
    mesRecord: any,
    erpRecord: any,
    integrationId: string
  ): Promise<Discrepancy[]>;

  /**
   * Get unique identifier for a record
   */
  abstract getRecordId(record: any): string;

  /**
   * Execute reconciliation for this entity type
   */
  async reconcile(
    integrationId: string,
    filters?: any
  ): Promise<ReconciliationReport> {
    const startTime = new Date();
    const report: ReconciliationReport = {
      integrationId,
      entityType: this.getEntityType(),
      startTime,
      status: 'IN_PROGRESS',
      totalRecords: 0,
      matchedRecords: 0,
      discrepancyCount: 0,
      discrepancies: [],
    };

    try {
      logger.info(`Starting reconciliation for ${this.getEntityType()}`, {
        integrationId,
      });

      // Fetch records from both systems
      const mesRecords = await this.fetchMESRecords(integrationId, filters);
      const erpRecords = await this.fetchERPRecords(integrationId, filters);

      report.totalRecords = mesRecords.length + erpRecords.length;

      // Create maps for quick lookup
      const mesMap = new Map<string, any>();
      const erpMap = new Map<string, any>();

      for (const record of mesRecords) {
        mesMap.set(this.getRecordId(record), record);
      }

      for (const record of erpRecords) {
        erpMap.set(this.getRecordId(record), record);
      }

      // Check for records in MES but not in ERP
      for (const [id, mesRecord] of mesMap) {
        if (!erpMap.has(id)) {
          report.discrepancies.push({
            entityType: this.getEntityType(),
            entityId: id,
            mesValue: mesRecord,
            erpValue: null,
            fieldName: 'RECORD',
            discrepancyType: 'MISSING_IN_ERP',
            severity: 'MEDIUM',
            description: `Record exists in MES but not in ERP: ${id}`,
            correctionRequired: true,
          });
        } else {
          // Compare matching records
          const discrepancies = await this.compareRecords(
            mesRecord,
            erpMap.get(id)!,
            integrationId
          );

          if (discrepancies.length === 0) {
            report.matchedRecords++;
          } else {
            report.discrepancies.push(...discrepancies);
          }
        }
      }

      // Check for records in ERP but not in MES
      for (const [id, erpRecord] of erpMap) {
        if (!mesMap.has(id)) {
          report.discrepancies.push({
            entityType: this.getEntityType(),
            entityId: id,
            mesValue: null,
            erpValue: erpRecord,
            fieldName: 'RECORD',
            discrepancyType: 'MISSING_IN_MES',
            severity: 'MEDIUM',
            description: `Record exists in ERP but not in MES: ${id}`,
            correctionRequired: true,
          });
        }
      }

      report.discrepancyCount = report.discrepancies.length;
      report.status = 'COMPLETED';
      report.endTime = new Date();

      logger.info(`Completed reconciliation for ${this.getEntityType()}`, {
        integrationId,
        matchedRecords: report.matchedRecords,
        discrepancies: report.discrepancyCount,
        duration: report.endTime.getTime() - startTime.getTime(),
      });

      return report;
    } catch (error) {
      report.status = 'FAILED';
      report.error = error instanceof Error ? error.message : String(error);
      report.endTime = new Date();

      logger.error(`Reconciliation failed for ${this.getEntityType()}`, {
        integrationId,
        error: report.error,
      });

      return report;
    }
  }
}

/**
 * Main reconciliation service
 */
export class ReconciliationService {
  private prisma: PrismaClient;
  private erpService: ERPIntegrationService;
  private webhookService: WebhookService;
  private entityReconciliations: Map<string, EntityReconciliation> = new Map();

  constructor(prisma?: PrismaClient, erpService?: ERPIntegrationService) {
    this.prisma = prisma || new PrismaClient();
    this.erpService = erpService || new ERPIntegrationService(this.prisma);
    this.webhookService = new WebhookService(this.prisma);
  }

  /**
   * Register entity reconciliation handler
   */
  registerEntityReconciliation(
    entityType: string,
    reconciliation: EntityReconciliation
  ): void {
    this.entityReconciliations.set(entityType, reconciliation);
    logger.debug(`Registered reconciliation for ${entityType}`);
  }

  /**
   * Execute reconciliation for specific entity type
   */
  async reconcile(
    integrationId: string,
    entityType: string,
    filters?: any
  ): Promise<ReconciliationReport | null> {
    const reconciliation = this.entityReconciliations.get(entityType);

    if (!reconciliation) {
      logger.warn(`No reconciliation handler for entity type: ${entityType}`);
      return null;
    }

    // Emit RECONCILIATION_STARTED webhook event
    try {
      await this.webhookService.emitEvent(
        integrationId,
        WebhookEventType.RECONCILIATION_STARTED,
        {
          entityType,
          filters,
        }
      );
    } catch (err) {
      logger.warn('Failed to emit RECONCILIATION_STARTED webhook event', {
        error: err instanceof Error ? err.message : String(err),
        integrationId,
      });
    }

    const report = await reconciliation.reconcile(integrationId, filters);

    // Save report to database
    try {
      await this.saveReconciliationReport(report);
    } catch (error) {
      logger.warn('Failed to save reconciliation report', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Emit RECONCILIATION_COMPLETED or DISCREPANCY_FOUND webhook events
    try {
      if (report.status === 'COMPLETED') {
        if (report.discrepancyCount > 0) {
          await this.webhookService.emitEvent(
            integrationId,
            WebhookEventType.RECONCILIATION_DISCREPANCY_FOUND,
            {
              entityType: report.entityType,
              discrepancyCount: report.discrepancyCount,
              matchedRecords: report.matchedRecords,
              totalRecords: report.totalRecords,
              discrepancies: report.discrepancies.slice(0, 10), // First 10 for preview
            }
          );
        } else {
          await this.webhookService.emitEvent(
            integrationId,
            WebhookEventType.RECONCILIATION_COMPLETED,
            {
              entityType: report.entityType,
              matchedRecords: report.matchedRecords,
              totalRecords: report.totalRecords,
              discrepancyCount: 0,
            }
          );
        }
      }
    } catch (err) {
      logger.warn('Failed to emit reconciliation completion webhook event', {
        error: err instanceof Error ? err.message : String(err),
        integrationId,
      });
    }

    return report;
  }

  /**
   * Execute reconciliation for all registered entity types
   */
  async reconcileAll(integrationId: string): Promise<ReconciliationReport[]> {
    const reports: ReconciliationReport[] = [];

    for (const [entityType, reconciliation] of this.entityReconciliations) {
      const report = await reconciliation.reconcile(integrationId);

      if (report) {
        reports.push(report);

        // Save report
        try {
          await this.saveReconciliationReport(report);
        } catch (error) {
          logger.warn(`Failed to save reconciliation report for ${entityType}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    logger.info(`Completed full reconciliation for integration`, {
      integrationId,
      entityTypes: Array.from(this.entityReconciliations.keys()),
      totalDiscrepancies: reports.reduce((sum, r) => sum + r.discrepancyCount, 0),
    });

    return reports;
  }

  /**
   * Get reconciliation report by ID
   */
  async getReconciliationReport(reportId: string): Promise<any> {
    try {
      return await this.prisma.erpReconciliationReport.findUnique({
        where: { id: reportId },
        include: {
          discrepancies: true,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch reconciliation report', {
        reportId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get reconciliation reports for integration
   */
  async getReconciliationReports(
    integrationId: string,
    options?: {
      limit?: number;
      offset?: number;
      entityType?: string;
    }
  ): Promise<any[]> {
    try {
      const where: any = { erpIntegrationId: integrationId };

      if (options?.entityType) {
        where.entityType = options.entityType;
      }

      return await this.prisma.erpReconciliationReport.findMany({
        where,
        include: {
          discrepancies: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      });
    } catch (error) {
      logger.error('Failed to fetch reconciliation reports', {
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get discrepancies for review/correction
   */
  async getPendingDiscrepancies(integrationId: string): Promise<any[]> {
    try {
      return await this.prisma.erpReconciliationDiscrepancy.findMany({
        where: {
          reconciliationReport: {
            erpIntegrationId: integrationId,
          },
          correctionStatus: { in: ['PENDING', 'APPROVED'] },
        },
        include: {
          reconciliationReport: true,
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'asc' }],
      });
    } catch (error) {
      logger.error('Failed to fetch pending discrepancies', {
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Apply correction to a discrepancy
   */
  async applyCorrection(
    discrepancyId: string,
    action: 'UPDATE_MES' | 'UPDATE_ERP' | 'ACCEPT_DISCREPANCY'
  ): Promise<void> {
    try {
      const discrepancy = await this.prisma.erpReconciliationDiscrepancy.findUnique({
        where: { id: discrepancyId },
      });

      if (!discrepancy) {
        throw new Error(`Discrepancy not found: ${discrepancyId}`);
      }

      // TODO: Implement correction logic in Phase 3+
      // For now, just update the status
      await this.prisma.erpReconciliationDiscrepancy.update({
        where: { id: discrepancyId },
        data: {
          correctionStatus: 'APPLIED',
          correctionAppliedAt: new Date(),
        },
      });

      logger.info(`Applied correction to discrepancy`, {
        discrepancyId,
        action,
      });
    } catch (error) {
      logger.error('Failed to apply correction', {
        discrepancyId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Save reconciliation report to database
   */
  private async saveReconciliationReport(report: ReconciliationReport): Promise<void> {
    try {
      // Create report record
      const savedReport = await this.prisma.erpReconciliationReport.create({
        data: {
          erpIntegrationId: report.integrationId,
          entityType: report.entityType,
          status: report.status as any,
          totalRecords: report.totalRecords,
          matchedRecords: report.matchedRecords,
          discrepancyCount: report.discrepancyCount,
          errorMessage: report.error,
          startedAt: report.startTime,
          completedAt: report.endTime,
        },
      });

      // Save discrepancies
      if (report.discrepancies.length > 0) {
        await this.prisma.erpReconciliationDiscrepancy.createMany({
          data: report.discrepancies.map((d) => ({
            reconciliationReportId: savedReport.id,
            entityType: d.entityType,
            entityId: d.entityId,
            fieldName: d.fieldName,
            mesValue: d.mesValue ? JSON.stringify(d.mesValue) : null,
            erpValue: d.erpValue ? JSON.stringify(d.erpValue) : null,
            discrepancyType: d.discrepancyType as any,
            severity: d.severity as any,
            description: d.description,
            correctionRequired: d.correctionRequired,
            correctionStatus: (d.correctionStatus || 'PENDING') as any,
          })),
        });
      }

      logger.debug(`Saved reconciliation report: ${savedReport.id}`, {
        entityType: report.entityType,
        discrepancies: report.discrepancies.length,
      });
    } catch (error) {
      logger.error('Failed to save reconciliation report', {
        entityType: report.entityType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    await this.erpService.disconnect();
    await this.prisma.$disconnect();
  }
}

export default ReconciliationService;
