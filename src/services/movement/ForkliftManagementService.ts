/**
 * Forklift Management Service
 * Phase 3: Implements forklift fleet management, request/dispatch system, and operator tracking
 * Issue #64: Material Movement & Logistics Management System
 */

import { PrismaClient, ForkliftStatus, ForkliftType } from '@prisma/client';
import pino from 'pino';

const logger = pino();

interface CreateForkliftInput {
  siteId: string;
  equipmentNumber: string;
  forkliftType: ForkliftType;
  make: string;
  model: string;
  yearManufactured?: number;
  serialNumber?: string;
  capacityLbs: number;
  maxLiftHeightInches?: number;
  fuelType?: string;
  hasGPS?: boolean;
}

interface UpdateForkliftInput {
  status?: ForkliftStatus;
  currentLocationId?: string;
  currentOperatorId?: string;
  meterHours?: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  notes?: string;
}

interface CreateForkliftRequestInput {
  siteId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  containerIds: string[];
  priority?: string;
  estimatedStartTime?: Date;
  notes?: string;
  createdBy: string;
}

interface AssignForkliftInput {
  forkliftId: string;
  operatorId?: string;
  estimatedStartTime?: Date;
}

export class ForkliftManagementService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new forklift in the fleet
   */
  async createForklift(input: CreateForkliftInput) {
    try {
      logger.info(`Creating forklift: ${input.equipmentNumber} at site ${input.siteId}`);

      // Check if equipment number is already in use at this site
      const existing = await this.prisma.forklift.findFirst({
        where: {
          siteId: input.siteId,
          equipmentNumber: input.equipmentNumber,
        },
      });

      if (existing) {
        throw new Error(`Equipment number already exists: ${input.equipmentNumber}`);
      }

      const forklift = await this.prisma.forklift.create({
        data: {
          siteId: input.siteId,
          equipmentNumber: input.equipmentNumber,
          forkliftType: input.forkliftType,
          status: 'ACTIVE',
          make: input.make,
          model: input.model,
          yearManufactured: input.yearManufactured,
          serialNumber: input.serialNumber,
          capacityLbs: input.capacityLbs,
          maxLiftHeightInches: input.maxLiftHeightInches,
          fuelType: input.fuelType,
          hasGPS: input.hasGPS || false,
        },
      });

      logger.info(`Forklift created successfully: ${forklift.id}`);
      return forklift;
    } catch (error) {
      logger.error(`Error creating forklift: ${error}`);
      throw error;
    }
  }

  /**
   * Get a forklift by ID
   */
  async getForklift(forkliftId: string) {
    try {
      const forklift = await this.prisma.forklift.findUnique({
        where: { id: forkliftId },
        include: {
          site: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          currentOperator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!forklift) {
        throw new Error(`Forklift not found: ${forkliftId}`);
      }

      return forklift;
    } catch (error) {
      logger.error(`Error retrieving forklift: ${error}`);
      throw error;
    }
  }

  /**
   * Get all forklifts for a site with optional filtering
   */
  async getForkliftsBySite(
    siteId: string,
    filters?: {
      status?: ForkliftStatus;
      type?: ForkliftType;
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
        where.forkliftType = filters.type;
      }

      const forklifts = await this.prisma.forklift.findMany({
        where,
        include: {
          currentOperator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { equipmentNumber: 'asc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      });

      return forklifts;
    } catch (error) {
      logger.error(`Error retrieving forklifts for site: ${error}`);
      throw error;
    }
  }

  /**
   * Update forklift information
   */
  async updateForklift(forkliftId: string, input: UpdateForkliftInput) {
    try {
      logger.info(`Updating forklift: ${forkliftId}`);

      const forklift = await this.prisma.forklift.findUnique({
        where: { id: forkliftId },
      });

      if (!forklift) {
        throw new Error(`Forklift not found: ${forkliftId}`);
      }

      const updated = await this.prisma.forklift.update({
        where: { id: forkliftId },
        data: {
          status: input.status,
          currentLocationId: input.currentLocationId,
          currentOperatorId: input.currentOperatorId,
          meterHours: input.meterHours,
          lastMaintenanceDate: input.lastMaintenanceDate,
          nextMaintenanceDate: input.nextMaintenanceDate,
          notes: input.notes,
        },
        include: {
          currentOperator: true,
        },
      });

      logger.info(`Forklift updated successfully: ${forkliftId}`);
      return updated;
    } catch (error) {
      logger.error(`Error updating forklift: ${error}`);
      throw error;
    }
  }

  /**
   * Assign a forklift to an operator
   */
  async assignOperator(forkliftId: string, operatorId: string, locationId?: string) {
    try {
      logger.info(`Assigning forklift ${forkliftId} to operator ${operatorId}`);

      const forklift = await this.prisma.forklift.findUnique({
        where: { id: forkliftId },
      });

      if (!forklift) {
        throw new Error(`Forklift not found: ${forkliftId}`);
      }

      if (forklift.status === 'MAINTENANCE' || forklift.status === 'DAMAGED') {
        throw new Error(`Cannot assign forklift in status: ${forklift.status}`);
      }

      // Verify operator exists
      const operator = await this.prisma.user.findUnique({
        where: { id: operatorId },
      });

      if (!operator) {
        throw new Error(`Operator not found: ${operatorId}`);
      }

      const updated = await this.prisma.forklift.update({
        where: { id: forkliftId },
        data: {
          currentOperatorId: operatorId,
          currentLocationId: locationId,
          status: 'ACTIVE',
        },
        include: {
          currentOperator: true,
        },
      });

      logger.info(`Operator assigned to forklift: ${forkliftId}`);
      return updated;
    } catch (error) {
      logger.error(`Error assigning operator: ${error}`);
      throw error;
    }
  }

  /**
   * Release a forklift from an operator
   */
  async releaseOperator(forkliftId: string) {
    try {
      logger.info(`Releasing forklift: ${forkliftId}`);

      const updated = await this.prisma.forklift.update({
        where: { id: forkliftId },
        data: {
          currentOperatorId: null,
        },
        include: {
          currentOperator: true,
        },
      });

      logger.info(`Operator released from forklift: ${forkliftId}`);
      return updated;
    } catch (error) {
      logger.error(`Error releasing operator: ${error}`);
      throw error;
    }
  }

  /**
   * Update GPS location for a forklift
   */
  async updateGPSLocation(
    forkliftId: string,
    latitude: number,
    longitude: number,
    altitude?: number
  ) {
    try {
      logger.info(`Updating GPS location for forklift ${forkliftId}: ${latitude}, ${longitude}`);

      const forklift = await this.prisma.forklift.findUnique({
        where: { id: forkliftId },
      });

      if (!forklift) {
        throw new Error(`Forklift not found: ${forkliftId}`);
      }

      if (!forklift.hasGPS) {
        throw new Error(`Forklift does not have GPS capability`);
      }

      const updated = await this.prisma.forklift.update({
        where: { id: forkliftId },
        data: {
          lastGPSLocation: JSON.stringify({
            latitude,
            longitude,
            altitude: altitude || null,
          }),
          lastGPSUpdateAt: new Date(),
        },
      });

      logger.info(`GPS location updated: ${forkliftId}`);
      return updated;
    } catch (error) {
      logger.error(`Error updating GPS location: ${error}`);
      throw error;
    }
  }

  /**
   * Mark forklift for maintenance
   */
  async markForMaintenance(forkliftId: string, maintenanceNotes?: string) {
    try {
      logger.info(`Marking forklift for maintenance: ${forkliftId}`);

      const forklift = await this.prisma.forklift.findUnique({
        where: { id: forkliftId },
      });

      if (!forklift) {
        throw new Error(`Forklift not found: ${forkliftId}`);
      }

      const updated = await this.prisma.forklift.update({
        where: { id: forkliftId },
        data: {
          status: 'MAINTENANCE',
          currentOperatorId: null,
          notes: maintenanceNotes,
          lastMaintenanceDate: new Date(),
        },
      });

      logger.info(`Forklift marked for maintenance: ${forkliftId}`);
      return updated;
    } catch (error) {
      logger.error(`Error marking forklift for maintenance: ${error}`);
      throw error;
    }
  }

  /**
   * Complete maintenance on a forklift
   */
  async completeMaintenance(forkliftId: string, nextMaintenanceDate: Date) {
    try {
      logger.info(`Completing maintenance for forklift: ${forkliftId}`);

      const updated = await this.prisma.forklift.update({
        where: { id: forkliftId },
        data: {
          status: 'ACTIVE',
          nextMaintenanceDate,
        },
      });

      logger.info(`Maintenance completed: ${forkliftId}`);
      return updated;
    } catch (error) {
      logger.error(`Error completing maintenance: ${error}`);
      throw error;
    }
  }

  /**
   * Create a forklift move request
   */
  async createMoveRequest(input: CreateForkliftRequestInput) {
    try {
      logger.info(
        `Creating forklift move request from ${input.sourceLocationId} to ${input.destinationLocationId}`
      );

      const site = await this.prisma.site.findUnique({
        where: { id: input.siteId },
      });

      if (!site) {
        throw new Error(`Site not found: ${input.siteId}`);
      }

      const request = await this.prisma.forkliftMoveRequest.create({
        data: {
          siteId: input.siteId,
          sourceLocationId: input.sourceLocationId,
          destinationLocationId: input.destinationLocationId,
          containerIds: JSON.stringify(input.containerIds),
          priority: input.priority || 'NORMAL',
          status: 'OPEN',
          estimatedStartTime: input.estimatedStartTime,
          createdBy: input.createdBy,
          notes: input.notes,
        },
      });

      logger.info(`Move request created successfully: ${request.id}`);
      return this.parseForkliftRequest(request);
    } catch (error) {
      logger.error(`Error creating move request: ${error}`);
      throw error;
    }
  }

  /**
   * Get a forklift move request by ID
   */
  async getMoveRequest(requestId: string) {
    try {
      const request = await this.prisma.forkliftMoveRequest.findUnique({
        where: { id: requestId },
        include: {
          assignedForklift: true,
          operator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!request) {
        throw new Error(`Move request not found: ${requestId}`);
      }

      return this.parseForkliftRequest(request);
    } catch (error) {
      logger.error(`Error retrieving move request: ${error}`);
      throw error;
    }
  }

  /**
   * Get open move requests for a site
   */
  async getOpenMoveRequests(
    siteId: string,
    filters?: {
      priority?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const where: any = {
        siteId,
        status: { in: ['OPEN', 'ASSIGNED'] },
      };

      if (filters?.priority) {
        where.priority = filters.priority;
      }

      const requests = await this.prisma.forkliftMoveRequest.findMany({
        where,
        include: {
          assignedForklift: true,
          operator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { estimatedStartTime: 'asc' },
        take: filters?.limit || 100,
        skip: filters?.offset || 0,
      });

      return requests.map((r) => this.parseForkliftRequest(r));
    } catch (error) {
      logger.error(`Error retrieving open move requests: ${error}`);
      throw error;
    }
  }

  /**
   * Assign a forklift to a move request
   */
  async assignForkliftToRequest(requestId: string, input: AssignForkliftInput) {
    try {
      logger.info(`Assigning forklift ${input.forkliftId} to request ${requestId}`);

      const request = await this.prisma.forkliftMoveRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error(`Move request not found: ${requestId}`);
      }

      if (request.status !== 'OPEN') {
        throw new Error(`Cannot assign forklift to request in status: ${request.status}`);
      }

      const forklift = await this.prisma.forklift.findUnique({
        where: { id: input.forkliftId },
      });

      if (!forklift) {
        throw new Error(`Forklift not found: ${input.forkliftId}`);
      }

      if (forklift.status !== 'ACTIVE') {
        throw new Error(`Forklift is not available: ${forklift.status}`);
      }

      const updated = await this.prisma.forkliftMoveRequest.update({
        where: { id: requestId },
        data: {
          assignedForkliftId: input.forkliftId,
          operatorId: input.operatorId,
          estimatedStartTime: input.estimatedStartTime,
          status: 'ASSIGNED',
          actualStartTime: null,
        },
        include: {
          assignedForklift: true,
          operator: true,
        },
      });

      logger.info(`Forklift assigned to request: ${requestId}`);
      return this.parseForkliftRequest(updated);
    } catch (error) {
      logger.error(`Error assigning forklift to request: ${error}`);
      throw error;
    }
  }

  /**
   * Start a forklift move request
   */
  async startMoveRequest(requestId: string) {
    try {
      logger.info(`Starting move request: ${requestId}`);

      const request = await this.prisma.forkliftMoveRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error(`Move request not found: ${requestId}`);
      }

      if (request.status !== 'ASSIGNED') {
        throw new Error(`Can only start request in ASSIGNED status, current: ${request.status}`);
      }

      const updated = await this.prisma.forkliftMoveRequest.update({
        where: { id: requestId },
        data: {
          status: 'IN_PROGRESS',
          actualStartTime: new Date(),
        },
        include: {
          assignedForklift: true,
          operator: true,
        },
      });

      logger.info(`Move request started: ${requestId}`);
      return this.parseForkliftRequest(updated);
    } catch (error) {
      logger.error(`Error starting move request: ${error}`);
      throw error;
    }
  }

  /**
   * Complete a forklift move request
   */
  async completeMoveRequest(requestId: string) {
    try {
      logger.info(`Completing move request: ${requestId}`);

      const request = await this.prisma.forkliftMoveRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error(`Move request not found: ${requestId}`);
      }

      if (request.status !== 'IN_PROGRESS') {
        throw new Error(`Can only complete request in IN_PROGRESS status`);
      }

      const updated = await this.prisma.forkliftMoveRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
        },
        include: {
          assignedForklift: true,
          operator: true,
        },
      });

      logger.info(`Move request completed: ${requestId}`);
      return this.parseForkliftRequest(updated);
    } catch (error) {
      logger.error(`Error completing move request: ${error}`);
      throw error;
    }
  }

  /**
   * Cancel a forklift move request
   */
  async cancelMoveRequest(requestId: string, reason?: string) {
    try {
      logger.info(`Cancelling move request: ${requestId}`);

      const request = await this.prisma.forkliftMoveRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error(`Move request not found: ${requestId}`);
      }

      const updated = await this.prisma.forkliftMoveRequest.update({
        where: { id: requestId },
        data: {
          status: 'CANCELLED',
          notes: reason ? `${request.notes || ''} - Cancelled: ${reason}` : request.notes,
        },
        include: {
          assignedForklift: true,
          operator: true,
        },
      });

      logger.info(`Move request cancelled: ${requestId}`);
      return this.parseForkliftRequest(updated);
    } catch (error) {
      logger.error(`Error cancelling move request: ${error}`);
      throw error;
    }
  }

  /**
   * Get forklift fleet summary statistics
   */
  async getFleetSummary(siteId: string) {
    try {
      const [totalForklifts, byStatus, byType, activeOperations] = await Promise.all([
        // Total forklifts
        this.prisma.forklift.count({
          where: { siteId },
        }),

        // Count by status
        this.prisma.forklift.groupBy({
          by: ['status'],
          where: { siteId },
          _count: true,
        }),

        // Count by type
        this.prisma.forklift.groupBy({
          by: ['forkliftType'],
          where: { siteId },
          _count: true,
        }),

        // Active move operations
        this.prisma.forkliftMoveRequest.count({
          where: {
            siteId,
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
          },
        }),
      ]);

      return {
        totalForklifts,
        byStatus: byStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        byType: byType.reduce(
          (acc, item) => {
            acc[item.forkliftType] = item._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        activeOperations,
      };
    } catch (error) {
      logger.error(`Error retrieving fleet summary: ${error}`);
      throw error;
    }
  }

  /**
   * Parse forklift request object, converting JSON fields
   */
  private parseForkliftRequest(request: any) {
    return {
      ...request,
      containerIds: request.containerIds ? JSON.parse(request.containerIds) : [],
      palletIds: request.palletIds ? JSON.parse(request.palletIds) : [],
    };
  }
}
