/**
 * OSP Shipment Service
 * Issue #59: Core OSP/Farmout Operations Management System
 *
 * Manages shipments for OSP operations (outbound to suppliers and inbound from suppliers)
 */

import { PrismaClient, OSPShipment, OSPShipmentType, OSPShipmentStatus } from '@prisma/client';
import { logger } from '../utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CreateOSPShipmentRequest {
  ospOperationId: string;
  shipmentType: OSPShipmentType;
  sendingVendorId: string;
  receivingVendorId: string;
  quantity: number;
  carrierName?: string;
  trackingNumber?: string;
  shippingMethod?: string;
  poNumber?: string;
  notes?: string;
}

export interface UpdateOSPShipmentRequest {
  status?: OSPShipmentStatus;
  trackingNumber?: string;
  shipDate?: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  carrierName?: string;
  notes?: string;
}

export interface OSPShipmentResponse {
  id: string;
  ospOperationId: string;
  shipmentType: OSPShipmentType;
  shipmentNumber: string;
  sendingVendorId: string;
  receivingVendorId: string;
  quantity: number;
  status: OSPShipmentStatus;
  carrierName?: string;
  trackingNumber?: string;
  shippingMethod?: string;
  shipDate?: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  poNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShipmentTrackingInfo {
  shipmentNumber: string;
  status: OSPShipmentStatus;
  trackingNumber?: string;
  carrierName?: string;
  shipDate?: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
}

// ============================================================================
// OSP Shipment Service
// ============================================================================

export default class OSPShipmentService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new shipment for an OSP operation
   */
  async createShipment(request: CreateOSPShipmentRequest): Promise<OSPShipmentResponse> {
    try {
      logger.info('Creating OSP shipment', {
        ospOperationId: request.ospOperationId,
        shipmentType: request.shipmentType,
        quantity: request.quantity
      });

      // Validate OSP operation exists
      const ospOperation = await this.prisma.ospOperation.findUniqueOrThrow({
        where: { id: request.ospOperationId }
      });

      // Validate vendors exist
      await this.prisma.vendor.findUniqueOrThrow({
        where: { id: request.sendingVendorId }
      });

      await this.prisma.vendor.findUniqueOrThrow({
        where: { id: request.receivingVendorId }
      });

      // Generate unique shipment number
      const shipmentNumber = await this.generateShipmentNumber();

      // Determine initial status based on shipment type
      let initialStatus: OSPShipmentStatus = 'DRAFT';
      if (request.trackingNumber) {
        initialStatus = 'RELEASED'; // If tracking number provided, assume released
      }

      // Create shipment
      const shipment = await this.prisma.ospShipment.create({
        data: {
          ospOperationId: request.ospOperationId,
          shipmentType: request.shipmentType,
          shipmentNumber,
          sendingVendorId: request.sendingVendorId,
          receivingVendorId: request.receivingVendorId,
          quantity: request.quantity,
          status: initialStatus,
          carrierName: request.carrierName,
          trackingNumber: request.trackingNumber,
          shippingMethod: request.shippingMethod,
          poNumber: request.poNumber,
          notes: request.notes
        }
      });

      logger.info('OSP shipment created', {
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        ospOperationId: request.ospOperationId
      });

      return this.mapToResponse(shipment);
    } catch (error) {
      logger.error('Failed to create OSP shipment:', error);
      throw error;
    }
  }

  /**
   * Update shipment status and tracking information
   */
  async updateShipment(shipmentId: string, request: UpdateOSPShipmentRequest): Promise<OSPShipmentResponse> {
    try {
      logger.info('Updating OSP shipment', { shipmentId, newStatus: request.status });

      const shipment = await this.prisma.ospShipment.update({
        where: { id: shipmentId },
        data: {
          status: request.status,
          trackingNumber: request.trackingNumber,
          shipDate: request.shipDate,
          expectedDeliveryDate: request.expectedDeliveryDate,
          actualDeliveryDate: request.actualDeliveryDate,
          carrierName: request.carrierName,
          notes: request.notes
        }
      });

      return this.mapToResponse(shipment);
    } catch (error) {
      logger.error('Failed to update OSP shipment:', error);
      throw error;
    }
  }

  /**
   * Get shipment by ID
   */
  async getShipment(shipmentId: string): Promise<OSPShipmentResponse> {
    try {
      const shipment = await this.prisma.ospShipment.findUniqueOrThrow({
        where: { id: shipmentId }
      });

      return this.mapToResponse(shipment);
    } catch (error) {
      logger.error('Failed to get OSP shipment:', error);
      throw error;
    }
  }

  /**
   * Get shipment by tracking number
   */
  async getShipmentByTracking(trackingNumber: string): Promise<OSPShipmentResponse | null> {
    try {
      const shipment = await this.prisma.ospShipment.findFirst({
        where: { trackingNumber }
      });

      return shipment ? this.mapToResponse(shipment) : null;
    } catch (error) {
      logger.error('Failed to get shipment by tracking:', error);
      throw error;
    }
  }

  /**
   * Get shipments for an OSP operation
   */
  async getOSPOperationShipments(ospOperationId: string): Promise<OSPShipmentResponse[]> {
    try {
      const shipments = await this.prisma.ospShipment.findMany({
        where: { ospOperationId },
        orderBy: { createdAt: 'desc' }
      });

      return shipments.map(s => this.mapToResponse(s));
    } catch (error) {
      logger.error('Failed to get OSP operation shipments:', error);
      throw error;
    }
  }

  /**
   * Get shipments by status
   */
  async getShipmentsByStatus(status: OSPShipmentStatus, limit: number = 50): Promise<OSPShipmentResponse[]> {
    try {
      const shipments = await this.prisma.ospShipment.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return shipments.map(s => this.mapToResponse(s));
    } catch (error) {
      logger.error('Failed to get shipments by status:', error);
      throw error;
    }
  }

  /**
   * Get inbound shipments for a supplier (items arriving from supplier)
   */
  async getInboundShipments(supplierId: string, status?: OSPShipmentStatus): Promise<OSPShipmentResponse[]> {
    try {
      const where: any = {
        sendingVendorId: supplierId,
        shipmentType: 'FROM_SUPPLIER'
      };

      if (status) {
        where.status = status;
      }

      const shipments = await this.prisma.ospShipment.findMany({
        where,
        orderBy: { expectedDeliveryDate: 'asc' }
      });

      return shipments.map(s => this.mapToResponse(s));
    } catch (error) {
      logger.error('Failed to get inbound shipments:', error);
      throw error;
    }
  }

  /**
   * Get outbound shipments to a supplier
   */
  async getOutboundShipments(supplierId: string, status?: OSPShipmentStatus): Promise<OSPShipmentResponse[]> {
    try {
      const where: any = {
        receivingVendorId: supplierId,
        shipmentType: 'TO_SUPPLIER'
      };

      if (status) {
        where.status = status;
      }

      const shipments = await this.prisma.ospShipment.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return shipments.map(s => this.mapToResponse(s));
    } catch (error) {
      logger.error('Failed to get outbound shipments:', error);
      throw error;
    }
  }

  /**
   * Transition shipment to next status
   */
  async transitionStatus(shipmentId: string, newStatus: OSPShipmentStatus): Promise<OSPShipmentResponse> {
    try {
      logger.info('Transitioning shipment status', { shipmentId, newStatus });

      const shipment = await this.prisma.ospShipment.findUniqueOrThrow({
        where: { id: shipmentId }
      });

      // Validate status transition
      const validTransitions: Record<OSPShipmentStatus, OSPShipmentStatus[]> = {
        DRAFT: ['RELEASED', 'CANCELLED'],
        RELEASED: ['PICKED', 'CANCELLED'],
        PICKED: ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['IN_TRANSIT'],
        IN_TRANSIT: ['DELIVERED'],
        DELIVERED: ['RECEIVED'],
        RECEIVED: [],
        CANCELLED: []
      };

      if (!validTransitions[shipment.status].includes(newStatus)) {
        throw new Error(
          `Invalid shipment status transition from ${shipment.status} to ${newStatus}`
        );
      }

      return this.updateShipment(shipmentId, { status: newStatus });
    } catch (error) {
      logger.error('Failed to transition shipment status:', error);
      throw error;
    }
  }

  /**
   * Mark shipment as shipped
   */
  async markShipped(shipmentId: string, trackingNumber?: string, carrierName?: string): Promise<OSPShipmentResponse> {
    try {
      logger.info('Marking shipment as shipped', { shipmentId, trackingNumber });

      return this.updateShipment(shipmentId, {
        status: 'SHIPPED' as OSPShipmentStatus,
        trackingNumber,
        carrierName,
        shipDate: new Date()
      });
    } catch (error) {
      logger.error('Failed to mark shipment as shipped:', error);
      throw error;
    }
  }

  /**
   * Mark shipment as received
   */
  async markReceived(shipmentId: string): Promise<OSPShipmentResponse> {
    try {
      logger.info('Marking shipment as received', { shipmentId });

      return this.updateShipment(shipmentId, {
        status: 'RECEIVED' as OSPShipmentStatus,
        actualDeliveryDate: new Date()
      });
    } catch (error) {
      logger.error('Failed to mark shipment as received:', error);
      throw error;
    }
  }

  /**
   * Get tracking information for shipment
   */
  async getTrackingInfo(shipmentId: string): Promise<ShipmentTrackingInfo> {
    try {
      const shipment = await this.prisma.ospShipment.findUniqueOrThrow({
        where: { id: shipmentId }
      });

      return {
        shipmentNumber: shipment.shipmentNumber,
        status: shipment.status,
        trackingNumber: shipment.trackingNumber || undefined,
        carrierName: shipment.carrierName || undefined,
        shipDate: shipment.shipDate || undefined,
        expectedDeliveryDate: shipment.expectedDeliveryDate || undefined,
        actualDeliveryDate: shipment.actualDeliveryDate || undefined
      };
    } catch (error) {
      logger.error('Failed to get tracking info:', error);
      throw error;
    }
  }

  /**
   * Generate unique shipment number
   */
  private async generateShipmentNumber(): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');

      const latestShipment = await this.prisma.ospShipment.findFirst({
        where: {
          shipmentNumber: {
            startsWith: `SHP-${year}${month}`
          }
        },
        orderBy: {
          shipmentNumber: 'desc'
        }
      });

      let sequence = 1;
      if (latestShipment) {
        const lastSequence = parseInt(latestShipment.shipmentNumber.split('-')[2] || '0', 10);
        sequence = lastSequence + 1;
      }

      return `SHP-${year}${month}-${String(sequence).padStart(4, '0')}`;
    } catch (error) {
      logger.error('Failed to generate shipment number:', error);
      throw error;
    }
  }

  /**
   * Map database model to response DTO
   */
  private mapToResponse(shipment: any): OSPShipmentResponse {
    return {
      id: shipment.id,
      ospOperationId: shipment.ospOperationId,
      shipmentType: shipment.shipmentType,
      shipmentNumber: shipment.shipmentNumber,
      sendingVendorId: shipment.sendingVendorId,
      receivingVendorId: shipment.receivingVendorId,
      quantity: shipment.quantity,
      status: shipment.status,
      carrierName: shipment.carrierName,
      trackingNumber: shipment.trackingNumber,
      shippingMethod: shipment.shippingMethod,
      shipDate: shipment.shipDate,
      expectedDeliveryDate: shipment.expectedDeliveryDate,
      actualDeliveryDate: shipment.actualDeliveryDate,
      poNumber: shipment.poNumber,
      notes: shipment.notes,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt
    };
  }
}
