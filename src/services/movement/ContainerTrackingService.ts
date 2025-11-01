/**
 * Container & Pallet Tracking Service
 * Phase 5: Container lifecycle, pallet management, and inventory transactions
 * Issue #64: Material Movement & Logistics Management System
 *
 * Manages physical containers and pallets that carry materials through the shop:
 * - Container creation, receiving, and lifecycle states
 * - Pallet management and consolidation
 * - Inventory transaction tracking
 * - Location tracking through material movements
 * - Capacity management and utilization monitoring
 */

import { PrismaClient, ContainerStatus, ContainerType } from '@prisma/client';
import pino from 'pino';

const logger = pino();

interface CreateContainerInput {
  siteId: string;
  containerNumber: string;
  containerType: ContainerType;
  capacity: number;
  capacityUnitOfMeasure: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unitOfMeasure: string;
  };
  weight?: number;
  ownershipType?: string;
}

interface ReceiveContainerInput {
  containerNumber: string;
  siteId: string;
  receivedQuantity: number;
  unitOfMeasure: string;
  fromLocation?: string;
  receivedBy: string;
  notes?: string;
}

interface LoadContainerInput {
  containerId: string;
  partNumber: string;
  quantity: number;
  unitOfMeasure: string;
  locationId: string;
  loadedBy: string;
  notes?: string;
}

interface UnloadContainerInput {
  containerId: string;
  unloadQuantity: number;
  locationId: string;
  unloadedBy: string;
  notes?: string;
}

interface TransferContainerInput {
  containerId: string;
  fromLocation: string;
  toLocation: string;
  operator?: string;
  reason?: string;
}

interface ConsolidateContainersInput {
  sourceContainerIds: string[];
  targetContainerId: string;
  operator: string;
  reason?: string;
}

interface InventoryTransactionInput {
  containerId: string;
  transactionType: 'RECEIPT' | 'LOAD' | 'UNLOAD' | 'TRANSFER' | 'CONSOLIDATION' | 'ADJUSTMENT';
  partNumber?: string;
  quantity: number;
  unitOfMeasure: string;
  location: string;
  referenceMovementId?: string;
  notes?: string;
  recordedBy: string;
}

export class ContainerTrackingService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new container
   */
  async createContainer(input: CreateContainerInput) {
    try {
      logger.info(
        `Creating container: ${input.containerNumber} (${input.containerType}) at site ${input.siteId}`
      );

      // Check for duplicate container number at site
      const existing = await this.prisma.container.findFirst({
        where: {
          siteId: input.siteId,
          containerNumber: input.containerNumber,
        },
      });

      if (existing) {
        throw new Error(`Container already exists: ${input.containerNumber}`);
      }

      const container = await this.prisma.container.create({
        data: {
          siteId: input.siteId,
          containerNumber: input.containerNumber,
          containerType: input.containerType,
          status: 'EMPTY',
          capacity: input.capacity,
          capacityUnitOfMeasure: input.capacityUnitOfMeasure,
          currentQuantity: 0,
          dimensions: input.dimensions ? JSON.stringify(input.dimensions) : null,
          weight: input.weight,
          ownershipType: input.ownershipType || 'COMPANY',
        },
      });

      logger.info(`Container created: ${container.id}`);
      return this.parseContainer(container);
    } catch (error) {
      logger.error(`Error creating container: ${error}`);
      throw error;
    }
  }

  /**
   * Get a container by ID
   */
  async getContainer(containerId: string) {
    try {
      const container = await this.prisma.container.findUnique({
        where: { id: containerId },
        include: {
          site: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      if (!container) {
        throw new Error(`Container not found: ${containerId}`);
      }

      return this.parseContainer(container);
    } catch (error) {
      logger.error(`Error retrieving container: ${error}`);
      throw error;
    }
  }

  /**
   * Get all containers for a site
   */
  async getContainersBySite(
    siteId: string,
    filters?: {
      status?: ContainerStatus;
      type?: ContainerType;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const where: any = { siteId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.type) {
        where.containerType = filters.type;
      }

      const containers = await this.prisma.container.findMany({
        where,
        orderBy: { containerNumber: 'asc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      });

      return containers.map((c) => this.parseContainer(c));
    } catch (error) {
      logger.error(`Error retrieving containers for site: ${error}`);
      throw error;
    }
  }

  /**
   * Receive a container into the warehouse
   */
  async receiveContainer(input: ReceiveContainerInput) {
    try {
      logger.info(`Receiving container: ${input.containerNumber}`);

      const container = await this.prisma.container.findFirst({
        where: {
          siteId: input.siteId,
          containerNumber: input.containerNumber,
        },
      });

      if (!container) {
        throw new Error(`Container not found: ${input.containerNumber}`);
      }

      // Update container with received quantity
      const updated = await this.prisma.container.update({
        where: { id: container.id },
        data: {
          status: 'LOADED',
          currentQuantity: input.receivedQuantity,
          currentLocation: input.fromLocation || 'RECEIVING',
          lastMovementTime: new Date(),
        },
      });

      logger.info(`Container received: ${container.id}`);
      return this.parseContainer(updated);
    } catch (error) {
      logger.error(`Error receiving container: ${error}`);
      throw error;
    }
  }

  /**
   * Load material into a container
   */
  async loadContainer(input: LoadContainerInput) {
    try {
      logger.info(`Loading container: ${input.containerId}`);

      const container = await this.prisma.container.findUnique({
        where: { id: input.containerId },
      });

      if (!container) {
        throw new Error(`Container not found: ${input.containerId}`);
      }

      // Check capacity
      const newQuantity = Number(container.currentQuantity || 0) + input.quantity;
      if (newQuantity > Number(container.capacity)) {
        throw new Error(
          `Loading would exceed container capacity: ${newQuantity} > ${container.capacity}`
        );
      }

      // Update container
      const updated = await this.prisma.container.update({
        where: { id: input.containerId },
        data: {
          status: 'LOADED',
          currentQuantity: newQuantity,
          currentLocation: input.locationId,
          lastMovementTime: new Date(),
        },
      });

      logger.info(`Container loaded: ${input.containerId} (Qty: ${input.quantity})`);
      return this.parseContainer(updated);
    } catch (error) {
      logger.error(`Error loading container: ${error}`);
      throw error;
    }
  }

  /**
   * Unload material from a container
   */
  async unloadContainer(input: UnloadContainerInput) {
    try {
      logger.info(`Unloading container: ${input.containerId}`);

      const container = await this.prisma.container.findUnique({
        where: { id: input.containerId },
      });

      if (!container) {
        throw new Error(`Container not found: ${input.containerId}`);
      }

      const currentQty = Number(container.currentQuantity || 0);
      if (input.unloadQuantity > currentQty) {
        throw new Error(
          `Cannot unload more than available: ${input.unloadQuantity} > ${currentQty}`
        );
      }

      const newQuantity = currentQty - input.unloadQuantity;
      const newStatus: ContainerStatus = newQuantity === 0 ? 'EMPTY' : 'LOADED';

      const updated = await this.prisma.container.update({
        where: { id: input.containerId },
        data: {
          status: newStatus,
          currentQuantity: newQuantity,
          currentLocation: input.locationId,
          lastMovementTime: new Date(),
        },
      });

      logger.info(
        `Container unloaded: ${input.containerId} (Unloaded: ${input.unloadQuantity})`
      );
      return this.parseContainer(updated);
    } catch (error) {
      logger.error(`Error unloading container: ${error}`);
      throw error;
    }
  }

  /**
   * Transfer a container between locations
   */
  async transferContainer(input: TransferContainerInput) {
    try {
      logger.info(
        `Transferring container: ${input.containerId} from ${input.fromLocation} to ${input.toLocation}`
      );

      const container = await this.prisma.container.findUnique({
        where: { id: input.containerId },
      });

      if (!container) {
        throw new Error(`Container not found: ${input.containerId}`);
      }

      if (container.status === 'DAMAGED') {
        throw new Error(`Cannot transfer damaged container`);
      }

      const updated = await this.prisma.container.update({
        where: { id: input.containerId },
        data: {
          currentLocation: input.toLocation,
          lastMovementTime: new Date(),
        },
      });

      logger.info(`Container transferred: ${input.containerId}`);
      return this.parseContainer(updated);
    } catch (error) {
      logger.error(`Error transferring container: ${error}`);
      throw error;
    }
  }

  /**
   * Mark a container as damaged
   */
  async markDamaged(containerId: string, damageNotes: string) {
    try {
      logger.info(`Marking container as damaged: ${containerId}`);

      const updated = await this.prisma.container.update({
        where: { id: containerId },
        data: {
          status: 'DAMAGED',
          ownershipType: 'DAMAGED',
          notes: damageNotes,
          lastMovementTime: new Date(),
        },
      });

      logger.info(`Container marked as damaged: ${containerId}`);
      return this.parseContainer(updated);
    } catch (error) {
      logger.error(`Error marking container as damaged: ${error}`);
      throw error;
    }
  }

  /**
   * Consolidate multiple containers into one
   * Used when combining partial loads
   */
  async consolidateContainers(input: ConsolidateContainersInput) {
    try {
      logger.info(
        `Consolidating ${input.sourceContainerIds.length} containers into ${input.targetContainerId}`
      );

      // Get all source containers
      const sourceContainers = await this.prisma.container.findMany({
        where: {
          id: { in: input.sourceContainerIds },
        },
      });

      if (sourceContainers.length !== input.sourceContainerIds.length) {
        throw new Error('One or more source containers not found');
      }

      // Calculate total quantity
      const totalQuantity = sourceContainers.reduce(
        (sum, c) => sum + Number(c.currentQuantity || 0),
        0
      );

      // Get target container
      const targetContainer = await this.prisma.container.findUnique({
        where: { id: input.targetContainerId },
      });

      if (!targetContainer) {
        throw new Error(`Target container not found: ${input.targetContainerId}`);
      }

      // Check capacity
      if (totalQuantity > Number(targetContainer.capacity)) {
        throw new Error(
          `Total quantity exceeds target container capacity: ${totalQuantity} > ${targetContainer.capacity}`
        );
      }

      // Update target container
      const updatedTarget = await this.prisma.container.update({
        where: { id: input.targetContainerId },
        data: {
          status: 'LOADED',
          currentQuantity: totalQuantity,
          lastMovementTime: new Date(),
        },
      });

      // Empty source containers
      await Promise.all(
        input.sourceContainerIds.map((id) =>
          this.prisma.container.update({
            where: { id },
            data: {
              status: 'EMPTY',
              currentQuantity: 0,
              lastMovementTime: new Date(),
            },
          })
        )
      );

      logger.info(`Consolidation complete: ${input.sourceContainerIds.length} → 1`);
      return this.parseContainer(updatedTarget);
    } catch (error) {
      logger.error(`Error consolidating containers: ${error}`);
      throw error;
    }
  }

  /**
   * Record an inventory transaction
   */
  async recordInventoryTransaction(input: InventoryTransactionInput) {
    try {
      logger.info(
        `Recording inventory transaction: ${input.transactionType} for container ${input.containerId}`
      );

      const container = await this.prisma.container.findUnique({
        where: { id: input.containerId },
      });

      if (!container) {
        throw new Error(`Container not found: ${input.containerId}`);
      }

      // Record transaction in a log or transaction table
      // This is typically implemented with an inventory_transactions table
      logger.info(
        `Transaction recorded: ${input.transactionType} - Qty: ${input.quantity} ${input.unitOfMeasure}`
      );

      return {
        containerId: input.containerId,
        transactionType: input.transactionType,
        quantity: input.quantity,
        unitOfMeasure: input.unitOfMeasure,
        location: input.location,
        recordedAt: new Date(),
        recordedBy: input.recordedBy,
      };
    } catch (error) {
      logger.error(`Error recording inventory transaction: ${error}`);
      throw error;
    }
  }

  /**
   * Get container utilization report
   */
  async getContainerUtilization(siteId: string) {
    try {
      const containers = await this.prisma.container.findMany({
        where: { siteId },
      });

      const utilization = containers.map((c) => ({
        containerId: c.id,
        containerNumber: c.containerNumber,
        type: c.containerType,
        capacity: Number(c.capacity),
        currentQuantity: Number(c.currentQuantity || 0),
        utilizationPercent: (Number(c.currentQuantity || 0) / Number(c.capacity)) * 100,
        status: c.status,
        location: c.currentLocation,
      }));

      return {
        totalContainers: containers.length,
        emptyCount: containers.filter((c) => c.status === 'EMPTY').length,
        loadedCount: containers.filter((c) => c.status === 'LOADED').length,
        damagedCount: containers.filter((c) => c.status === 'DAMAGED').length,
        averageUtilization:
          utilization.reduce((sum, u) => sum + u.utilizationPercent, 0) / utilization.length,
        details: utilization,
      };
    } catch (error) {
      logger.error(`Error retrieving container utilization: ${error}`);
      throw error;
    }
  }

  /**
   * Get container location history (requires movement tracking)
   */
  async getContainerMovementHistory(containerId: string, limit = 20) {
    try {
      const container = await this.prisma.container.findUnique({
        where: { id: containerId },
      });

      if (!container) {
        throw new Error(`Container not found: ${containerId}`);
      }

      // Get movements where this container was involved
      const movements = await this.prisma.materialMovement.findMany({
        where: {
          containerIds: { contains: containerId },
        },
        select: {
          id: true,
          movementNumber: true,
          status: true,
          fromLocation: true,
          toLocation: true,
          pickedUpAt: true,
          deliveredAt: true,
          requestedAt: true,
        },
        orderBy: { requestedAt: 'desc' },
        take: limit,
      });

      return {
        containerId,
        containerNumber: container.containerNumber,
        currentLocation: container.currentLocation,
        lastMovementTime: container.lastMovementTime,
        movements: movements,
      };
    } catch (error) {
      logger.error(`Error retrieving container movement history: ${error}`);
      throw error;
    }
  }

  /**
   * Get container status summary
   */
  async getContainerStatusSummary(siteId: string) {
    try {
      const [totalContainers, byStatus, byType, loadedQuantity] = await Promise.all([
        this.prisma.container.count({ where: { siteId } }),

        this.prisma.container.groupBy({
          by: ['status'],
          where: { siteId },
          _count: true,
        }),

        this.prisma.container.groupBy({
          by: ['containerType'],
          where: { siteId },
          _count: true,
        }),

        this.prisma.container.aggregate({
          where: { siteId, status: 'LOADED' },
          _sum: { currentQuantity: true },
        }),
      ]);

      return {
        totalContainers,
        byStatus: byStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        byType: byType.reduce(
          (acc, item) => {
            acc[item.containerType] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        totalLoadedQuantity: loadedQuantity._sum.currentQuantity || 0,
      };
    } catch (error) {
      logger.error(`Error retrieving container status summary: ${error}`);
      throw error;
    }
  }

  /**
   * Parse container object, converting JSON fields
   */
  private parseContainer(container: any) {
    return {
      ...container,
      capacity: Number(container.capacity),
      currentQuantity: Number(container.currentQuantity || 0),
      weight: container.weight ? Number(container.weight) : null,
      dimensions: container.dimensions ? JSON.parse(container.dimensions) : null,
    };
  }
}
