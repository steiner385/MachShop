/**
 * ERP Shipment Integration Service
 * Phase 4: Bridges MES material movements with ERP shipment management for external movements
 * Issue #64: Material Movement & Logistics Management System
 *
 * This service manages material movements that cross shop floor boundaries:
 * - Inter-site transfers
 * - Drop-ship supplier-to-supplier workflows
 * - Returns and reverse logistics
 * - All external carrier management delegated to ERP
 */

import { PrismaClient, ShipmentStatus } from '@prisma/client';
import pino from 'pino';

const logger = pino();

interface CreateShipmentMovementInput {
  siteId: string;
  shipmentId: string;
  movementTypeId: string;
  workOrderIds: string[];
  containerIds: string[];
  shipFromCompanyName: string;
  shipToCompanyName: string;
  shipFromAddress: string;
  shipToAddress: string;
  quantity: number;
  unitOfMeasure: string;
  createdBy: string;
  notes?: string;
}

interface UpdateShipmentMovementInput {
  shipFromAddress?: string;
  shipToAddress?: string;
  estimatedDeliveryAt?: Date;
  notes?: string;
}

interface ShipmentStatusUpdateInput {
  shipmentId: string;
  status: ShipmentStatus;
  trackingNumber?: string;
  carrierType?: string;
  estimatedDeliveryAt?: Date;
  actualDeliveryAt?: Date;
}

interface DropShipWorkflowInput {
  siteId: string;
  sourceSupplierName: string;
  destinationSupplierName: string;
  workOrderIds: string[];
  containerIds: string[];
  quantity: number;
  unitOfMeasure: string;
  createdBy: string;
}

export class ERPShipmentIntegrationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a material movement for an ERP-managed shipment
   * This links MES movements to external shipments managed by the ERP
   */
  async createShipmentMovement(input: CreateShipmentMovementInput) {
    try {
      logger.info(
        `Creating shipment movement: ${input.shipFromCompanyName} → ${input.shipToCompanyName}`
      );

      // Verify movement type and shipment exist
      const [movementType, shipment] = await Promise.all([
        this.prisma.movementType.findUnique({
          where: { id: input.movementTypeId },
        }),
        this.prisma.shipment.findUnique({
          where: { id: input.shipmentId },
        }),
      ]);

      if (!movementType) {
        throw new Error(`Movement type not found: ${input.movementTypeId}`);
      }

      if (!shipment) {
        throw new Error(`Shipment not found: ${input.shipmentId}`);
      }

      // Create material movement linked to shipment
      const movement = await this.prisma.materialMovement.create({
        data: {
          movementTypeId: input.movementTypeId,
          fromLocation: input.shipFromAddress,
          toLocation: input.shipToAddress,
          fromSupplier: input.shipFromCompanyName,
          toSupplier: input.shipToCompanyName,
          workOrderIds: JSON.stringify(input.workOrderIds),
          containerIds: JSON.stringify(input.containerIds),
          quantity: input.quantity,
          unitOfMeasure: input.unitOfMeasure,
          requestedBy: input.createdBy,
          shipmentId: input.shipmentId,
          status: 'REQUESTED',
          specialInstructions: input.notes,
        },
        include: {
          movementType: true,
          shipment: true,
        },
      });

      logger.info(`Shipment movement created: ${movement.id} → Shipment: ${input.shipmentId}`);
      return this.parseMovement(movement);
    } catch (error) {
      logger.error(`Error creating shipment movement: ${error}`);
      throw error;
    }
  }

  /**
   * Handle shipment status update from ERP
   * Updates MES movement status when ERP shipment status changes
   * This is typically called via webhook from ERP system
   */
  async handleShipmentStatusUpdate(input: ShipmentStatusUpdateInput) {
    try {
      logger.info(
        `Handling shipment status update: ${input.shipmentId} → ${input.status}`
      );

      // Find movements linked to this shipment
      const movements = await this.prisma.materialMovement.findMany({
        where: {
          shipmentId: input.shipmentId,
        },
      });

      if (movements.length === 0) {
        logger.warn(`No movements found for shipment: ${input.shipmentId}`);
        return null;
      }

      // Update shipment in MES
      const updatedShipment = await this.prisma.shipment.update({
        where: { id: input.shipmentId },
        data: {
          status: input.status,
          trackingNumber: input.trackingNumber,
          carrierType: input.carrierType,
          estimatedDeliveryDate: input.estimatedDeliveryAt,
          actualDeliveryDate: input.actualDeliveryAt,
        },
      });

      // Update linked movements based on shipment status
      const movementUpdates = await Promise.all(
        movements.map(async (movement) => {
          let movementStatus;

          switch (input.status) {
            case 'DRAFT':
            case 'READY_TO_SHIP':
              movementStatus = 'REQUESTED';
              break;
            case 'PICKED':
              movementStatus = 'APPROVED';
              break;
            case 'PACKED':
              movementStatus = 'ASSIGNED';
              break;
            case 'SHIPPED':
            case 'IN_TRANSIT':
              movementStatus = 'IN_TRANSIT';
              break;
            case 'DELIVERED':
              movementStatus = 'DELIVERED';
              break;
            case 'CANCELLED':
              movementStatus = 'CANCELLED';
              break;
            default:
              movementStatus = movement.status;
          }

          return this.prisma.materialMovement.update({
            where: { id: movement.id },
            data: {
              status: movementStatus,
              trackingNumber: input.trackingNumber,
              carrier: input.carrierType,
              estimatedDeliveryAt: input.estimatedDeliveryAt,
              deliveredAt: input.actualDeliveryAt,
            },
            include: {
              movementType: true,
              shipment: true,
            },
          });
        })
      );

      logger.info(
        `Shipment status updated: ${input.shipmentId} - Updated ${movementUpdates.length} movements`
      );

      return {
        shipment: updatedShipment,
        movements: movementUpdates.map((m) => this.parseMovement(m)),
      };
    } catch (error) {
      logger.error(`Error handling shipment status update: ${error}`);
      throw error;
    }
  }

  /**
   * Get shipment movement with full tracking details
   */
  async getShipmentMovement(movementId: string) {
    try {
      const movement = await this.prisma.materialMovement.findUnique({
        where: { id: movementId },
        include: {
          movementType: true,
          shipment: {
            include: {
              carrierAccount: true,
            },
          },
        },
      });

      if (!movement) {
        throw new Error(`Movement not found: ${movementId}`);
      }

      return this.parseMovement(movement);
    } catch (error) {
      logger.error(`Error retrieving shipment movement: ${error}`);
      throw error;
    }
  }

  /**
   * Get all shipment movements for a site
   */
  async getShipmentMovements(
    siteId: string,
    filters?: {
      status?: string;
      shipFromCompany?: string;
      shipToCompany?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const where: any = {
        fromSiteId: siteId,
      };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.shipFromCompany) {
        where.fromSupplier = filters.shipFromCompany;
      }

      if (filters?.shipToCompany) {
        where.toSupplier = filters.shipToCompany;
      }

      const movements = await this.prisma.materialMovement.findMany({
        where,
        include: {
          movementType: true,
          shipment: true,
        },
        orderBy: { requestedAt: 'desc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      });

      return movements.map((m) => this.parseMovement(m));
    } catch (error) {
      logger.error(`Error retrieving shipment movements: ${error}`);
      throw error;
    }
  }

  /**
   * Create drop-ship workflow movement
   * Handles direct supplier-to-supplier shipments without MES storage
   */
  async createDropShipWorkflow(input: DropShipWorkflowInput) {
    try {
      logger.info(
        `Creating drop-ship workflow: ${input.sourceSupplierName} → ${input.destinationSupplierName}`
      );

      // Get drop-ship movement type
      const movementType = await this.prisma.movementType.findFirst({
        where: {
          siteId: input.siteId,
          code: 'SHIP_TO_SUPPLIER',
        },
      });

      if (!movementType) {
        throw new Error(
          `Drop-ship movement type not found. Ensure SHIP_TO_SUPPLIER type exists.`
        );
      }

      // Create drop-ship movement (no physical container at MES)
      const movement = await this.prisma.materialMovement.create({
        data: {
          movementTypeId: movementType.id,
          fromLocation: 'SUPPLIER',
          toLocation: 'SUPPLIER',
          fromSupplier: input.sourceSupplierName,
          toSupplier: input.destinationSupplierName,
          workOrderIds: JSON.stringify(input.workOrderIds),
          containerIds: JSON.stringify(input.containerIds),
          quantity: input.quantity,
          unitOfMeasure: input.unitOfMeasure,
          requestedBy: input.createdBy,
          status: 'REQUESTED',
          specialInstructions: 'Drop-ship: Direct supplier transfer - No MES handling',
        },
        include: {
          movementType: true,
        },
      });

      logger.info(
        `Drop-ship workflow created: ${movement.id} (${input.sourceSupplierName} → ${input.destinationSupplierName})`
      );
      return this.parseMovement(movement);
    } catch (error) {
      logger.error(`Error creating drop-ship workflow: ${error}`);
      throw error;
    }
  }

  /**
   * Get inter-site transfer movements
   */
  async getInterSiteTransfers(
    fromSiteId: string,
    filters?: {
      toSiteId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const where: any = {
        fromSiteId,
        toSiteId: { not: null },
      };

      if (filters?.toSiteId) {
        where.toSiteId = filters.toSiteId;
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      const transfers = await this.prisma.materialMovement.findMany({
        where,
        include: {
          movementType: true,
          shipment: true,
        },
        orderBy: { requestedAt: 'desc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      });

      return transfers.map((m) => this.parseMovement(m));
    } catch (error) {
      logger.error(`Error retrieving inter-site transfers: ${error}`);
      throw error;
    }
  }

  /**
   * Sync shipment with ERP
   * This would be called before creating movement to ensure shipment exists in ERP
   * Returns ERP reference ID for tracking
   */
  async syncShipmentWithERP(shipmentId: string): Promise<{
    shipmentId: string;
    erpReference: string;
    syncedAt: Date;
    status: string;
  }> {
    try {
      logger.info(`Syncing shipment with ERP: ${shipmentId}`);

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          carrierAccount: true,
        },
      });

      if (!shipment) {
        throw new Error(`Shipment not found: ${shipmentId}`);
      }

      // In a real scenario, this would call the ERP system's shipment API
      // For now, we generate a reference and log the sync intent
      const erpReference = `ERP-${shipment.shipmentNumber}-${Date.now()}`;

      logger.info(
        `Shipment synced with ERP: ${shipmentId} (Reference: ${erpReference})`
      );

      return {
        shipmentId,
        erpReference,
        syncedAt: new Date(),
        status: shipment.status,
      };
    } catch (error) {
      logger.error(`Error syncing shipment with ERP: ${error}`);
      throw error;
    }
  }

  /**
   * Get shipment tracking status from ERP
   * This would query the ERP system for current shipment status
   */
  async getShipmentTrackingFromERP(shipmentId: string): Promise<{
    shipmentId: string;
    status: string;
    trackingNumber?: string;
    currentLocation?: string;
    estimatedDelivery?: Date;
    lastUpdated: Date;
  }> {
    try {
      logger.info(`Fetching shipment tracking from ERP: ${shipmentId}`);

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: shipmentId },
      });

      if (!shipment) {
        throw new Error(`Shipment not found: ${shipmentId}`);
      }

      // In a real scenario, this would call the ERP system's tracking API
      // Returns the current state from MES (which should be synced from ERP)
      return {
        shipmentId,
        status: shipment.status,
        trackingNumber: shipment.trackingNumber || undefined,
        currentLocation: undefined, // Would come from ERP
        estimatedDelivery: shipment.estimatedDeliveryDate || undefined,
        lastUpdated: shipment.updatedAt,
      };
    } catch (error) {
      logger.error(`Error fetching shipment tracking from ERP: ${error}`);
      throw error;
    }
  }

  /**
   * Get shipment integration summary
   */
  async getShipmentIntegrationSummary(siteId: string) {
    try {
      const [
        totalShipments,
        byStatus,
        dropShipMovements,
        interSiteTransfers,
        activeShipments,
      ] = await Promise.all([
        // Total shipments
        this.prisma.shipment.count({
          where: { siteId },
        }),

        // Count by status
        this.prisma.shipment.groupBy({
          by: ['status'],
          where: { siteId },
          _count: true,
        }),

        // Drop-ship movements
        this.prisma.materialMovement.count({
          where: {
            movementType: {
              code: 'SHIP_TO_SUPPLIER',
            },
          },
        }),

        // Inter-site transfers
        this.prisma.materialMovement.count({
          where: {
            fromSiteId: siteId,
            toSiteId: { not: null },
          },
        }),

        // Active shipments
        this.prisma.shipment.count({
          where: {
            siteId,
            status: { in: ['PICKED', 'PACKED', 'SHIPPED', 'IN_TRANSIT'] },
          },
        }),
      ]);

      return {
        totalShipments,
        byStatus: byStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        dropShipMovements,
        interSiteTransfers,
        activeShipments,
        note: 'Carrier management and detailed tracking delegated to ERP system',
      };
    } catch (error) {
      logger.error(`Error retrieving shipment integration summary: ${error}`);
      throw error;
    }
  }

  /**
   * Parse movement object, converting JSON fields
   */
  private parseMovement(movement: any) {
    return {
      ...movement,
      workOrderIds: movement.workOrderIds ? JSON.parse(movement.workOrderIds) : [],
      containerIds: movement.containerIds ? JSON.parse(movement.containerIds) : [],
      palletIds: movement.palletIds ? JSON.parse(movement.palletIds) : [],
      attachments: movement.attachments ? JSON.parse(movement.attachments) : [],
      dimensions: movement.dimensions ? JSON.parse(movement.dimensions) : null,
    };
  }
}
