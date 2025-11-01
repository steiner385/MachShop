/**
 * Material Movement Service
 * Phase 2: Implements movement creation, status transitions, location tracking, and history
 * Issue #64: Material Movement & Logistics Management System
 */

import { PrismaClient, MovementStatus, MovementPriority } from '@prisma/client';
import pino from 'pino';

const logger = pino();

interface CreateMovementInput {
  movementTypeId: string;
  fromLocation: string;
  toLocation: string;
  workOrderIds: string[];
  requestedBy: string;
  priority?: MovementPriority;
  specialInstructions?: string;
  fromSupplier?: string;
  toSupplier?: string;
  fromSiteId?: string;
  toSiteId?: string;
}

interface UpdateMovementInput {
  fromLocation?: string;
  toLocation?: string;
  specialInstructions?: string;
  priority?: MovementPriority;
  estimatedDeliveryAt?: Date;
}

interface TransitionMovementInput {
  status: MovementStatus;
}

export class MaterialMovementService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new material movement
   */
  async createMovement(input: CreateMovementInput) {
    try {
      logger.info(`Creating material movement from ${input.fromLocation} to ${input.toLocation}`);

      const movement = await this.prisma.materialMovement.create({
        data: {
          movementTypeId: input.movementTypeId,
          fromLocation: input.fromLocation,
          toLocation: input.toLocation,
          workOrderIds: JSON.stringify(input.workOrderIds),
          requestedBy: input.requestedBy,
          priority: input.priority || 'NORMAL',
          specialInstructions: input.specialInstructions,
          fromSupplier: input.fromSupplier,
          toSupplier: input.toSupplier,
          fromSiteId: input.fromSiteId,
          toSiteId: input.toSiteId,
          status: 'REQUESTED',
        },
        include: {
          movementType: true,
        },
      });

      logger.info(`Movement created successfully: ${movement.id}`);
      return this.parseMovement(movement);
    } catch (error) {
      logger.error(`Error creating material movement: ${error}`);
      throw error;
    }
  }

  /**
   * Get a movement by ID
   */
  async getMovement(movementId: string) {
    try {
      const movement = await this.prisma.materialMovement.findUnique({
        where: { id: movementId },
        include: {
          movementType: true,
          shipment: {
            select: {
              id: true,
              shipmentNumber: true,
              status: true,
              trackingNumber: true,
            },
          },
        },
      });

      if (!movement) {
        throw new Error(`Movement not found: ${movementId}`);
      }

      return this.parseMovement(movement);
    } catch (error) {
      logger.error(`Error retrieving movement: ${error}`);
      throw error;
    }
  }

  /**
   * Get movements with optional filters
   */
  async getMovements(filters?: {
    status?: MovementStatus;
    priority?: MovementPriority;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = {};

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.priority) {
        where.priority = filters.priority;
      }

      if (filters?.fromDate || filters?.toDate) {
        where.requestedAt = {};
        if (filters?.fromDate) {
          where.requestedAt.gte = filters.fromDate;
        }
        if (filters?.toDate) {
          where.requestedAt.lte = filters.toDate;
        }
      }

      const movements = await this.prisma.materialMovement.findMany({
        where,
        include: {
          movementType: true,
          shipment: {
            select: {
              id: true,
              shipmentNumber: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      });

      return movements.map((m) => this.parseMovement(m));
    } catch (error) {
      logger.error(`Error retrieving movements: ${error}`);
      throw error;
    }
  }

  /**
   * Update a movement
   */
  async updateMovement(movementId: string, input: UpdateMovementInput) {
    try {
      logger.info(`Updating material movement: ${movementId}`);

      const movement = await this.prisma.materialMovement.findUnique({
        where: { id: movementId },
      });

      if (!movement) {
        throw new Error(`Movement not found: ${movementId}`);
      }

      // Can only update if not delivered/cancelled
      if (['DELIVERED', 'CANCELLED'].includes(movement.status)) {
        throw new Error(`Cannot update movement in status: ${movement.status}`);
      }

      const updated = await this.prisma.materialMovement.update({
        where: { id: movementId },
        data: {
          fromLocation: input.fromLocation,
          toLocation: input.toLocation,
          specialInstructions: input.specialInstructions,
          priority: input.priority,
          estimatedDeliveryAt: input.estimatedDeliveryAt,
        },
        include: {
          movementType: true,
        },
      });

      logger.info(`Movement updated successfully: ${movementId}`);
      return this.parseMovement(updated);
    } catch (error) {
      logger.error(`Error updating material movement: ${error}`);
      throw error;
    }
  }

  /**
   * Transition movement status
   */
  async transitionStatus(movementId: string, input: TransitionMovementInput) {
    try {
      logger.info(`Transitioning movement ${movementId} to status: ${input.status}`);

      const movement = await this.prisma.materialMovement.findUnique({
        where: { id: movementId },
      });

      if (!movement) {
        throw new Error(`Movement not found: ${movementId}`);
      }

      const updateData: any = { status: input.status };

      if (input.status === 'IN_TRANSIT') {
        updateData.pickedUpAt = new Date();
      }

      if (input.status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      }

      const updated = await this.prisma.materialMovement.update({
        where: { id: movementId },
        data: updateData,
        include: {
          movementType: true,
        },
      });

      logger.info(`Movement status transitioned successfully: ${movementId}`);
      return this.parseMovement(updated);
    } catch (error) {
      logger.error(`Error transitioning movement status: ${error}`);
      throw error;
    }
  }

  /**
   * Approve a movement
   */
  async approveMovement(movementId: string, approvedBy: string) {
    try {
      logger.info(`Approving movement: ${movementId}`);

      const movement = await this.prisma.materialMovement.findUnique({
        where: { id: movementId },
      });

      if (!movement) {
        throw new Error(`Movement not found: ${movementId}`);
      }

      const updated = await this.prisma.materialMovement.update({
        where: { id: movementId },
        data: {
          approvedBy,
          approvedAt: new Date(),
          status: 'APPROVED',
        },
        include: {
          movementType: true,
        },
      });

      logger.info(`Movement approved: ${movementId}`);
      return this.parseMovement(updated);
    } catch (error) {
      logger.error(`Error approving movement: ${error}`);
      throw error;
    }
  }

  /**
   * Assign a forklift request to a movement
   */
  async assignForkliftRequest(movementId: string, forkliftRequestId: string) {
    try {
      logger.info(`Assigning forklift request ${forkliftRequestId} to movement ${movementId}`);

      const updated = await this.prisma.materialMovement.update({
        where: { id: movementId },
        data: {
          forkliftRequestId,
        },
        include: {
          movementType: true,
        },
      });

      logger.info(`Forklift request assigned: ${movementId}`);
      return this.parseMovement(updated);
    } catch (error) {
      logger.error(`Error assigning forklift request: ${error}`);
      throw error;
    }
  }

  /**
   * Assign a shipment to a movement
   */
  async assignShipment(movementId: string, shipmentId: string) {
    try {
      logger.info(`Assigning shipment ${shipmentId} to movement ${movementId}`);

      const updated = await this.prisma.materialMovement.update({
        where: { id: movementId },
        data: {
          shipmentId,
        },
        include: {
          movementType: true,
          shipment: true,
        },
      });

      logger.info(`Shipment assigned: ${movementId}`);
      return this.parseMovement(updated);
    } catch (error) {
      logger.error(`Error assigning shipment: ${error}`);
      throw error;
    }
  }

  /**
   * Record tracking information
   */
  async recordTracking(
    movementId: string,
    carrier: string,
    trackingNumber: string,
    freightCost?: number
  ) {
    try {
      logger.info(`Recording tracking for movement ${movementId}: ${trackingNumber}`);

      const updated = await this.prisma.materialMovement.update({
        where: { id: movementId },
        data: {
          carrier,
          trackingNumber,
          freightCost: freightCost ? parseFloat(freightCost.toFixed(2)) : undefined,
        },
        include: {
          movementType: true,
        },
      });

      logger.info(`Tracking recorded: ${movementId}`);
      return this.parseMovement(updated);
    } catch (error) {
      logger.error(`Error recording tracking: ${error}`);
      throw error;
    }
  }

  /**
   * Cancel a movement
   */
  async cancelMovement(movementId: string) {
    try {
      logger.info(`Cancelling movement: ${movementId}`);

      const movement = await this.prisma.materialMovement.findUnique({
        where: { id: movementId },
      });

      if (!movement) {
        throw new Error(`Movement not found: ${movementId}`);
      }

      if (['DELIVERED', 'CANCELLED'].includes(movement.status)) {
        throw new Error(`Cannot cancel movement in status: ${movement.status}`);
      }

      const updated = await this.prisma.materialMovement.update({
        where: { id: movementId },
        data: {
          status: 'CANCELLED',
        },
        include: {
          movementType: true,
        },
      });

      logger.info(`Movement cancelled: ${movementId}`);
      return this.parseMovement(updated);
    } catch (error) {
      logger.error(`Error cancelling movement: ${error}`);
      throw error;
    }
  }

  /**
   * Get summary statistics
   */
  async getMovementsSummary(timeRangeHours: number = 24) {
    try {
      const timeThreshold = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

      const [totalCount, byStatus, byPriority, inTransitCount, deliveredCount] = await Promise.all(
        [
          // Total movements
          this.prisma.materialMovement.count(),

          // Count by status
          this.prisma.materialMovement.groupBy({
            by: ['status'],
            where: { requestedAt: { gte: timeThreshold } },
            _count: true,
          }),

          // Count by priority
          this.prisma.materialMovement.groupBy({
            by: ['priority'],
            where: { requestedAt: { gte: timeThreshold } },
            _count: true,
          }),

          // In transit count
          this.prisma.materialMovement.count({
            where: { status: 'IN_TRANSIT' },
          }),

          // Recently delivered count
          this.prisma.materialMovement.count({
            where: {
              status: 'DELIVERED',
              deliveredAt: { gte: timeThreshold },
            },
          }),
        ]
      );

      return {
        totalCount,
        byStatus: byStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        byPriority: byPriority.reduce(
          (acc, item) => {
            acc[item.priority] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        inTransitCount,
        recentlyDeliveredCount: deliveredCount,
        timeRangeHours,
      };
    } catch (error) {
      logger.error(`Error retrieving movements summary: ${error}`);
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
