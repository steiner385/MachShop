/**
 * Shipment Webhook Handler Service
 * Phase 9: Processes ERP shipment status updates
 * Issue #64: Material Movement & Logistics Management System
 *
 * Provides webhook receivers and processors for:
 * - ERP shipment status updates
 * - Tracking number updates
 * - Delivery confirmations
 * - Exception/delay notifications
 * - Container receipt confirmations
 */

import { PrismaClient, MaterialMovement, Shipment } from '@prisma/client';
import pino from 'pino';
import { EventEmitter } from 'events';

const logger = pino();

interface WebhookPayload {
  eventType: string;
  timestamp: Date;
  sourceSystem: string;
  payload: Record<string, any>;
  signature?: string;
}

interface ShipmentStatusUpdate {
  erpShipmentNumber: string;
  erpOrderNumber: string;
  status: string;
  statusReason?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  trackingNumber?: string;
  carrier?: string;
  containerIds?: string[];
  lastUpdateTime?: Date;
  updateSource: string;
}

interface TrackingUpdate {
  shipmentId: string;
  trackingNumber: string;
  carrier: string;
  lastLocation?: string;
  lastUpdateTime: Date;
  estimatedDeliveryDate?: Date;
}

interface DeliveryConfirmation {
  shipmentId: string;
  containerIds: string[];
  deliveryTime: Date;
  receivedBy: string;
  location: string;
  signatureRequired?: boolean;
  comments?: string;
}

interface WebhookVerificationOptions {
  enableSignatureVerification: boolean;
  secretKey?: string;
  allowedSources?: string[];
  maxAge?: number; // in seconds
}

export class ShipmentWebhookHandler {
  private prisma: PrismaClient;
  private eventEmitter: EventEmitter;
  private verificationOptions: WebhookVerificationOptions;

  constructor(
    prisma: PrismaClient,
    verificationOptions?: WebhookVerificationOptions
  ) {
    this.prisma = prisma;
    this.eventEmitter = new EventEmitter();
    this.verificationOptions = verificationOptions || {
      enableSignatureVerification: false,
      allowedSources: ['ERP', 'CARRIER_SYSTEM', 'FULFILLMENT_CENTER']
    };
  }

  /**
   * Verify webhook authenticity
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    if (!this.verificationOptions.enableSignatureVerification) {
      return true;
    }

    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Verify webhook is from allowed source
   */
  isAllowedSource(sourceSystem: string): boolean {
    if (!this.verificationOptions.allowedSources) {
      return true;
    }

    return this.verificationOptions.allowedSources.includes(sourceSystem);
  }

  /**
   * Check if webhook is not too old
   */
  isWithinTimeWindow(timestamp: Date): boolean {
    const maxAge = this.verificationOptions.maxAge || 300; // 5 minutes default
    const now = new Date();
    const ageSeconds = (now.getTime() - timestamp.getTime()) / 1000;

    return ageSeconds <= maxAge;
  }

  /**
   * Handle shipment status update webhook
   */
  async handleShipmentStatusUpdate(
    update: ShipmentStatusUpdate
  ): Promise<{ success: boolean; message: string; shipmentId?: string }> {
    try {
      logger.info(
        `Processing shipment status update for ${update.erpShipmentNumber} - Status: ${update.status}`
      );

      // Find existing shipment
      const shipment = await this.prisma.shipment.findFirst({
        where: {
          erpShipmentNumber: update.erpShipmentNumber
        }
      });

      if (!shipment) {
        logger.warn(`Shipment not found: ${update.erpShipmentNumber}`);
        return {
          success: false,
          message: `Shipment not found: ${update.erpShipmentNumber}`
        };
      }

      // Map ERP status to internal status
      const internalStatus = this.mapERPStatusToInternal(update.status);

      // Update shipment status
      const updatedShipment = await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          status: internalStatus,
          lastStatusUpdate: update.lastUpdateTime || new Date(),
          statusReason: update.statusReason,
          estimatedArrival: update.estimatedDeliveryDate,
          actualArrival: update.actualDeliveryDate,
          erpStatus: update.status,
          lastExternalUpdate: new Date()
        }
      });

      // Update linked movements
      const movements = await this.prisma.materialMovement.findMany({
        where: { shipmentId: shipment.id }
      });

      for (const movement of movements) {
        await this.updateMovementFromShipmentStatus(movement.id, internalStatus);
      }

      // Emit event for other systems
      this.eventEmitter.emit('shipment:status-updated', {
        shipmentId: updatedShipment.id,
        erpShipmentNumber: update.erpShipmentNumber,
        status: internalStatus,
        timestamp: new Date()
      });

      logger.info(
        `Shipment status updated: ${updatedShipment.id} - ${internalStatus}`
      );

      return {
        success: true,
        message: `Shipment status updated to ${internalStatus}`,
        shipmentId: updatedShipment.id
      };
    } catch (error) {
      logger.error(
        `Error processing shipment status update: ${error}`
      );
      return {
        success: false,
        message: `Error processing update: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle tracking number update webhook
   */
  async handleTrackingUpdate(
    update: TrackingUpdate
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info(
        `Processing tracking update for shipment ${update.shipmentId}`
      );

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: update.shipmentId }
      });

      if (!shipment) {
        return {
          success: false,
          message: `Shipment not found: ${update.shipmentId}`
        };
      }

      // Update tracking info
      await this.prisma.shipment.update({
        where: { id: update.shipmentId },
        data: {
          trackingNumber: update.trackingNumber,
          carrier: update.carrier,
          lastStatusUpdate: update.lastUpdateTime,
          estimatedArrival: update.estimatedDeliveryDate
        }
      });

      // Emit event
      this.eventEmitter.emit('shipment:tracking-updated', {
        shipmentId: update.shipmentId,
        trackingNumber: update.trackingNumber,
        carrier: update.carrier,
        timestamp: new Date()
      });

      logger.info(
        `Tracking updated for shipment ${update.shipmentId}: ${update.trackingNumber}`
      );

      return {
        success: true,
        message: `Tracking information updated`
      };
    } catch (error) {
      logger.error(`Error processing tracking update: ${error}`);
      return {
        success: false,
        message: `Error processing tracking update: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle delivery confirmation webhook
   */
  async handleDeliveryConfirmation(
    confirmation: DeliveryConfirmation
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info(
        `Processing delivery confirmation for shipment ${confirmation.shipmentId}`
      );

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: confirmation.shipmentId }
      });

      if (!shipment) {
        return {
          success: false,
          message: `Shipment not found: ${confirmation.shipmentId}`
        };
      }

      // Update shipment as delivered
      await this.prisma.shipment.update({
        where: { id: confirmation.shipmentId },
        data: {
          status: 'DELIVERED',
          actualArrival: confirmation.deliveryTime,
          lastStatusUpdate: new Date(),
          deliveryLocation: confirmation.location,
          deliveryReceivedBy: confirmation.receivedBy,
          deliveryNotes: confirmation.comments
        }
      });

      // Update linked movements
      const movements = await this.prisma.materialMovement.findMany({
        where: { shipmentId: confirmation.shipmentId }
      });

      for (const movement of movements) {
        await this.prisma.materialMovement.update({
          where: { id: movement.id },
          data: {
            status: 'DELIVERED',
            deliveredAt: confirmation.deliveryTime
          }
        });
      }

      // Update containers as received
      if (confirmation.containerIds && confirmation.containerIds.length > 0) {
        await this.prisma.container.updateMany({
          where: { id: { in: confirmation.containerIds } },
          data: {
            status: 'AT_LOCATION',
            currentLocation: confirmation.location
          }
        });
      }

      // Emit event
      this.eventEmitter.emit('shipment:delivered', {
        shipmentId: confirmation.shipmentId,
        deliveryTime: confirmation.deliveryTime,
        location: confirmation.location,
        containerCount: confirmation.containerIds?.length || 0,
        timestamp: new Date()
      });

      logger.info(`Delivery confirmed for shipment ${confirmation.shipmentId}`);

      return {
        success: true,
        message: `Delivery confirmed for shipment`
      };
    } catch (error) {
      logger.error(`Error processing delivery confirmation: ${error}`);
      return {
        success: false,
        message: `Error processing delivery: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle shipment exception/delay webhook
   */
  async handleShipmentException(
    shipmentId: string,
    exceptionType: string,
    reason: string,
    revisedDeliveryDate?: Date
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.warn(
        `Processing shipment exception for ${shipmentId}: ${exceptionType} - ${reason}`
      );

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: shipmentId }
      });

      if (!shipment) {
        return {
          success: false,
          message: `Shipment not found: ${shipmentId}`
        };
      }

      // Update shipment with exception info
      await this.prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          status: 'DELAYED',
          statusReason: reason,
          estimatedArrival: revisedDeliveryDate,
          lastStatusUpdate: new Date()
        }
      });

      // Emit event for notifications
      this.eventEmitter.emit('shipment:exception', {
        shipmentId,
        exceptionType,
        reason,
        revisedDeliveryDate,
        timestamp: new Date()
      });

      logger.warn(`Exception recorded for shipment ${shipmentId}`);

      return {
        success: true,
        message: `Exception recorded: ${exceptionType}`
      };
    } catch (error) {
      logger.error(`Error processing shipment exception: ${error}`);
      return {
        success: false,
        message: `Error processing exception: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle container receipt confirmation
   */
  async handleContainerReceipt(
    containerId: string,
    location: string,
    receivedBy: string,
    receiptTime?: Date
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.info(`Processing container receipt for ${containerId}`);

      const container = await this.prisma.container.findUnique({
        where: { id: containerId }
      });

      if (!container) {
        return {
          success: false,
          message: `Container not found: ${containerId}`
        };
      }

      // Update container status
      await this.prisma.container.update({
        where: { id: containerId },
        data: {
          status: 'AT_LOCATION',
          currentLocation: location
        }
      });

      // Emit event
      this.eventEmitter.emit('container:received', {
        containerId,
        location,
        receivedBy,
        timestamp: receiptTime || new Date()
      });

      logger.info(`Container received: ${containerId} at ${location}`);

      return {
        success: true,
        message: `Container receipt confirmed`
      };
    } catch (error) {
      logger.error(`Error processing container receipt: ${error}`);
      return {
        success: false,
        message: `Error processing receipt: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Map ERP status codes to internal status
   */
  private mapERPStatusToInternal(erpStatus: string): string {
    const statusMap: Record<string, string> = {
      'CREATED': 'PENDING',
      'CONFIRMED': 'APPROVED',
      'PICKED': 'IN_TRANSIT',
      'SHIPPED': 'IN_TRANSIT',
      'IN_TRANSIT': 'IN_TRANSIT',
      'DELIVERED': 'DELIVERED',
      'CANCELLED': 'CANCELLED',
      'DELAYED': 'DELAYED',
      'EXCEPTION': 'DELAYED',
      'RETURNED': 'CANCELLED'
    };

    return statusMap[erpStatus] || 'PENDING';
  }

  /**
   * Update movement based on shipment status
   */
  private async updateMovementFromShipmentStatus(
    movementId: string,
    newStatus: string
  ): Promise<void> {
    try {
      const statusMap: Record<string, string> = {
        'PENDING': 'REQUESTED',
        'APPROVED': 'APPROVED',
        'IN_TRANSIT': 'IN_TRANSIT',
        'DELIVERED': 'DELIVERED',
        'CANCELLED': 'CANCELLED',
        'DELAYED': 'IN_TRANSIT'
      };

      const movementStatus = statusMap[newStatus] || 'REQUESTED';

      await this.prisma.materialMovement.update({
        where: { id: movementId },
        data: {
          status: movementStatus as any,
          ...(newStatus === 'DELIVERED' && {
            deliveredAt: new Date()
          })
        }
      });

      logger.info(`Movement ${movementId} updated to ${movementStatus}`);
    } catch (error) {
      logger.error(`Error updating movement status: ${error}`);
    }
  }

  /**
   * Subscribe to webhook events
   */
  onEvent(
    eventType: string,
    handler: (data: any) => void
  ): void {
    this.eventEmitter.on(eventType, handler);
  }

  /**
   * Unsubscribe from webhook events
   */
  offEvent(
    eventType: string,
    handler: (data: any) => void
  ): void {
    this.eventEmitter.off(eventType, handler);
  }

  /**
   * Get webhook event history
   */
  async getWebhookHistory(
    filters?: {
      eventType?: string;
      sourceSystem?: string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    try {
      // This would query a webhook_log table if we had one
      // For now, return empty array
      logger.info('Retrieving webhook history');
      return [];
    } catch (error) {
      logger.error(`Error retrieving webhook history: ${error}`);
      return [];
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(timeRangeHours: number = 24): Promise<any> {
    try {
      const timeThreshold = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

      const shipments = await this.prisma.shipment.findMany({
        where: {
          lastExternalUpdate: { gte: timeThreshold }
        }
      });

      return {
        timeRangeHours,
        webhooksProcessed: shipments.length,
        shipmentsUpdated: shipments.length,
        statusBreakdown: {
          pending: shipments.filter(s => s.status === 'PENDING').length,
          approved: shipments.filter(s => s.status === 'APPROVED').length,
          inTransit: shipments.filter(s => s.status === 'IN_TRANSIT').length,
          delivered: shipments.filter(s => s.status === 'DELIVERED').length,
          delayed: shipments.filter(s => s.status === 'DELAYED').length,
          cancelled: shipments.filter(s => s.status === 'CANCELLED').length
        }
      };
    } catch (error) {
      logger.error(`Error retrieving webhook stats: ${error}`);
      return {};
    }
  }
}
