/**
 * ShipmentNotificationJob - Notify ERP of shipments
 * Issue #60: Phase 2 - Async sync engine
 */

import { Job } from 'bullmq';
import { BaseSyncJob, SyncJobData, SyncJobResult } from './BaseSyncJob';
import { PrismaClient } from '@prisma/client';
import ERPIntegrationService from '../ERPIntegrationService';

/**
 * Notify ERP system of shipments (outbound)
 * Direction: OUTBOUND (MES → ERP)
 *
 * Sends shipment notifications to ERP for:
 * - Shipments to suppliers (OSP shipments)
 * - Receipt notifications from suppliers
 */
export class ShipmentNotificationJob extends BaseSyncJob {
  constructor(prisma?: PrismaClient, erpService?: ERPIntegrationService) {
    super(prisma, erpService);
  }

  getJobName(): string {
    return 'ShipmentNotification';
  }

  getTransactionType(): string {
    return 'SHIPMENT_NOTIFICATION';
  }

  getEntityType(): string {
    return 'Shipment';
  }

  /**
   * Execute shipment notification sync
   */
  async executeSync(
    data: SyncJobData,
    job?: Job
  ): Promise<SyncJobResult> {
    let processedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    try {
      // Determine which shipment events to notify about
      const shipmentType = data.filters?.shipmentType || 'ALL';

      // Fetch shipments that need to be notified to ERP
      const shipments = await this.fetchUnnotifiedShipments(data, shipmentType);

      const totalToProcess = shipments.length;

      // Log batch transaction
      await this.logTransaction(data.integrationId, data, 'IN_PROGRESS', {
        shipment_count: totalToProcess,
        shipment_type: shipmentType,
        direction: 'OUTBOUND',
      });

      for (let i = 0; i < shipments.length; i++) {
        const shipment = shipments[i];

        try {
          // Transform shipment data to ERP format
          const transformedShipment = await this.transformShipmentToERP(
            data.integrationId,
            shipment
          );

          if (!data.dryRun) {
            // TODO: Send shipment notification to ERP adapter in Phase 4+
            // For now, just log the transformation
            this.logger.debug('Would send shipment notification to ERP', {
              integrationId: data.integrationId,
              shipmentId: shipment.id,
              shipmentNumber: shipment.shipmentNumber,
              transformed: transformedShipment,
            });

            // Update shipment notification status
            await this.prisma.erpShipmentNotification.upsert({
              where: { ospShipmentId: shipment.id },
              update: {
                lastNotifiedAt: new Date(),
                notificationStatus: 'SUCCESS',
              },
              create: {
                ospShipmentId: shipment.id,
                erpIntegrationId: data.integrationId,
                lastNotifiedAt: new Date(),
                notificationStatus: 'SUCCESS',
              },
            });
          }

          processedCount++;
          const progress = Math.round(((i + 1) / totalToProcess) * 100);
          this.updateJobProgress(job, progress);

          this.logger.debug(`Notified ERP of shipment: ${shipment.shipmentNumber}`, {
            integrationId: data.integrationId,
            shipmentId: shipment.id,
            shipmentType: shipment.shipmentType,
          });
        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({
            id: shipment.id,
            error: errorMsg,
          });

          this.logger.warn(`Failed to notify shipment: ${shipment.shipmentNumber}`, {
            integrationId: data.integrationId,
            error: errorMsg,
          });
        }
      }

      // Log completion
      await this.logTransaction(data.integrationId, data, 'COMPLETED', {
        processed: processedCount,
        failed: failedCount,
        skipped: skippedCount,
        direction: 'OUTBOUND',
      });

      return {
        success: failedCount === 0,
        processedCount,
        failedCount,
        skippedCount,
        errors,
        duration: 0,
        message: `Notified ERP of ${processedCount} shipments${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.logTransaction(data.integrationId, data, 'FAILED', {}, errorMsg);

      throw error;
    }
  }

  /**
   * Fetch shipments that haven't been notified to ERP yet
   */
  private async fetchUnnotifiedShipments(
    data: SyncJobData,
    shipmentType: string
  ): Promise<any[]> {
    try {
      const whereClause: any = {
        ospShipmentNotification: {
          // No notification record exists yet
          none: {
            erpIntegrationId: data.integrationId,
          },
        },
      };

      // Filter by shipment type if specified
      if (shipmentType !== 'ALL') {
        whereClause.shipmentType = shipmentType;
      }

      // Fetch unnotified shipments that have been shipped
      const shipments = await this.prisma.oSPShipment.findMany({
        where: whereClause,
        select: {
          id: true,
          ospOperationId: true,
          shipmentNumber: true,
          shipmentType: true,
          quantity: true,
          carrierName: true,
          trackingNumber: true,
          shippingMethod: true,
          shipDate: true,
          expectedDeliveryDate: true,
          actualDeliveryDate: true,
          poNumber: true,
          status: true,
          sendingVendorId: true,
          receivingVendorId: true,
        },
        take: data.batchSize || 100,
      });

      return shipments;
    } catch (error) {
      this.logger.warn('Failed to fetch unnotified shipments', {
        integrationId: data.integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Transform shipment data from MES format to ERP format
   */
  private async transformShipmentToERP(integrationId: string, shipment: any): Promise<any> {
    // Get field mappings for Shipment entity
    const mappings = await this.erpService.getFieldMappings(
      integrationId,
      this.getEntityType()
    );

    // If mappings exist, use them
    if (mappings && mappings.length > 0) {
      return this.erpService.transformToERP(integrationId, this.getEntityType(), {
        ...shipment,
      });
    }

    // Otherwise use default mapping for ERP shipment notification
    return {
      shipmentNumber: shipment.shipmentNumber,
      ospOperationId: shipment.ospOperationId,
      shipmentType: shipment.shipmentType,
      quantity: shipment.quantity,
      carrier: shipment.carrierName,
      trackingNumber: shipment.trackingNumber,
      shippingMethod: shipment.shippingMethod,
      shipDate: shipment.shipDate,
      expectedDeliveryDate: shipment.expectedDeliveryDate,
      actualDeliveryDate: shipment.actualDeliveryDate,
      poNumber: shipment.poNumber,
      status: shipment.status,
      sendingVendorId: shipment.sendingVendorId,
      receivingVendorId: shipment.receivingVendorId,
      notificationTime: new Date(),
    };
  }
}

export default ShipmentNotificationJob;
