/**
 * Expedite Request Service
 *
 * Manages the complete expedite workflow lifecycle including request creation,
 * approval processes, supplier coordination, cost tracking, and resolution management.
 */

import {
  PrismaClient,
  ExpeditRequest,
  ExpeditStatus,
  ExpeditUrgency,
  ExpeditResolution,
  AlertPriority
} from '@prisma/client';
import { ShortageNotificationService } from './ShortageNotificationService';
import { logger } from '../utils/logger';

export interface CreateExpeditRequestData {
  shortageAlertId?: string;
  partId: string;
  requiredQuantity: number;
  urgencyLevel: ExpeditUrgency;
  requestedByDate: Date;
  justification: string;
  impactAssessment?: string;
  costImpact?: number;
  alternativesSuggested?: string[];
  requestedById: string;
  vendorId?: string;
}

export interface ApproveExpeditRequestData {
  approvedById: string;
  approvedCost?: number;
  approvalNotes?: string;
}

export interface UpdateSupplierResponseData {
  vendorResponse: string;
  vendorCommitmentDate?: Date;
  estimatedDeliveryDate?: Date;
  expediteFee?: number;
}

export interface ResolveExpeditRequestData {
  resolution: ExpeditResolution;
  resolutionNotes?: string;
  actualDeliveryDate?: Date;
  finalCost?: number;
  qualityImpact?: boolean;
  resolvedById: string;
}

export interface ExpeditRequestWithDetails extends ExpeditRequest {
  part: {
    partNumber: string;
    partName: string;
    unitOfMeasure: string;
  };
  requestedBy: {
    id: string;
    username: string;
    email: string;
  };
  approvedBy?: {
    id: string;
    username: string;
    email: string;
  };
  vendor?: {
    id: string;
    name: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  shortageAlert?: {
    id: string;
    kitId: string;
    priority: AlertPriority;
  };
}

export interface ExpeditRequestFilters {
  status?: ExpeditStatus[];
  urgencyLevel?: ExpeditUrgency[];
  partId?: string;
  vendorId?: string;
  requestedById?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  pendingApproval?: boolean;
  overdue?: boolean;
}

export interface ExpeditRequestMetrics {
  totalRequests: number;
  pendingApproval: number;
  inProgress: number;
  resolved: number;
  averageResolutionDays: number;
  successRate: number;
  totalCostSaved: number;
  averageExpediteFee: number;
  topReasons: Array<{ reason: string; count: number }>;
  performanceByUrgency: Record<ExpeditUrgency, {
    count: number;
    averageResolutionDays: number;
    successRate: number;
  }>;
}

/**
 * Service for managing expedite requests and workflow
 */
export class ExpeditRequestService {
  private prisma: PrismaClient;
  private notificationService: ShortageNotificationService;

  constructor(prisma: PrismaClient, notificationService: ShortageNotificationService) {
    this.prisma = prisma;
    this.notificationService = notificationService;
  }

  /**
   * Create a new expedite request
   */
  async createExpeditRequest(data: CreateExpeditRequestData): Promise<string> {
    logger.info('Creating expedite request', {
      partId: data.partId,
      urgencyLevel: data.urgencyLevel,
      requestedById: data.requestedById
    });

    try {
      // Validate the request
      await this.validateExpeditRequest(data);

      // Create the expedite request
      const expeditRequest = await this.prisma.expeditRequest.create({
        data: {
          shortageAlertId: data.shortageAlertId,
          partId: data.partId,
          requiredQuantity: data.requiredQuantity,
          urgencyLevel: data.urgencyLevel,
          requestedByDate: data.requestedByDate,
          justification: data.justification,
          impactAssessment: data.impactAssessment,
          costImpact: data.costImpact,
          alternativesSuggested: data.alternativesSuggested || [],
          requestedById: data.requestedById,
          vendorId: data.vendorId,
          status: ExpeditStatus.REQUESTED,
        },
      });

      // Create initial status history entry
      await this.createStatusHistoryEntry(
        expeditRequest.id,
        null,
        ExpeditStatus.REQUESTED,
        data.requestedById,
        'Expedite request created'
      );

      // Send notification for request creation
      await this.notificationService.notifyExpeditRequestCreated({
        expeditRequestId: expeditRequest.id,
        partNumber: '', // Will be populated by notification service
        partName: '',   // Will be populated by notification service
        urgencyLevel: data.urgencyLevel,
        requiredByDate: data.requestedByDate,
        requestedBy: data.requestedById,
        expediteFee: data.costImpact,
        justification: data.justification,
        vendorName: undefined, // Will be populated if vendor exists
      });

      logger.info('Expedite request created successfully', {
        expeditRequestId: expeditRequest.id,
        partId: data.partId
      });

      return expeditRequest.id;

    } catch (error) {
      logger.error('Failed to create expedite request', { error, data });
      throw new Error(`Failed to create expedite request: ${error.message}`);
    }
  }

  /**
   * Approve an expedite request
   */
  async approveExpeditRequest(
    expeditRequestId: string,
    approvalData: ApproveExpeditRequestData
  ): Promise<void> {
    logger.info('Approving expedite request', { expeditRequestId, approvedById: approvalData.approvedById });

    try {
      const expeditRequest = await this.getExpeditRequest(expeditRequestId);

      if (!expeditRequest) {
        throw new Error('Expedite request not found');
      }

      if (expeditRequest.status !== ExpeditStatus.REQUESTED && expeditRequest.status !== ExpeditStatus.PENDING_APPROVAL) {
        throw new Error(`Cannot approve expedite request with status: ${expeditRequest.status}`);
      }

      // Update the expedite request
      await this.prisma.expeditRequest.update({
        where: { id: expeditRequestId },
        data: {
          status: ExpeditStatus.APPROVED,
          approvedById: approvalData.approvedById,
          approvedAt: new Date(),
          approvedCost: approvalData.approvedCost,
        },
      });

      // Create status history entry
      await this.createStatusHistoryEntry(
        expeditRequestId,
        expeditRequest.status,
        ExpeditStatus.APPROVED,
        approvalData.approvedById,
        approvalData.approvalNotes || 'Expedite request approved'
      );

      // Send approval notification
      await this.notificationService.notifyExpeditRequestApproved(
        expeditRequestId,
        approvalData.approvedById,
        approvalData.approvedCost
      );

      logger.info('Expedite request approved successfully', { expeditRequestId });

    } catch (error) {
      logger.error('Failed to approve expedite request', { error, expeditRequestId });
      throw new Error(`Failed to approve expedite request: ${error.message}`);
    }
  }

  /**
   * Reject an expedite request
   */
  async rejectExpeditRequest(
    expeditRequestId: string,
    rejectedById: string,
    rejectionReason: string
  ): Promise<void> {
    logger.info('Rejecting expedite request', { expeditRequestId, rejectedById });

    try {
      const expeditRequest = await this.getExpeditRequest(expeditRequestId);

      if (!expeditRequest) {
        throw new Error('Expedite request not found');
      }

      if (expeditRequest.status !== ExpeditStatus.REQUESTED && expeditRequest.status !== ExpeditStatus.PENDING_APPROVAL) {
        throw new Error(`Cannot reject expedite request with status: ${expeditRequest.status}`);
      }

      // Update the expedite request
      await this.prisma.expeditRequest.update({
        where: { id: expeditRequestId },
        data: {
          status: ExpeditStatus.REJECTED,
          rejectedAt: new Date(),
          rejectionReason,
        },
      });

      // Create status history entry
      await this.createStatusHistoryEntry(
        expeditRequestId,
        expeditRequest.status,
        ExpeditStatus.REJECTED,
        rejectedById,
        `Request rejected: ${rejectionReason}`
      );

      logger.info('Expedite request rejected', { expeditRequestId });

    } catch (error) {
      logger.error('Failed to reject expedite request', { error, expeditRequestId });
      throw new Error(`Failed to reject expedite request: ${error.message}`);
    }
  }

  /**
   * Update supplier response for an expedite request
   */
  async updateSupplierResponse(
    expeditRequestId: string,
    responseData: UpdateSupplierResponseData,
    updatedById: string
  ): Promise<void> {
    logger.info('Updating supplier response', { expeditRequestId });

    try {
      const expeditRequest = await this.getExpeditRequest(expeditRequestId);

      if (!expeditRequest) {
        throw new Error('Expedite request not found');
      }

      // Update the expedite request
      await this.prisma.expeditRequest.update({
        where: { id: expeditRequestId },
        data: {
          status: ExpeditStatus.VENDOR_RESPONDED,
          vendorResponse: responseData.vendorResponse,
          vendorCommitmentDate: responseData.vendorCommitmentDate,
          estimatedDeliveryDate: responseData.estimatedDeliveryDate,
          expediteFee: responseData.expediteFee,
        },
      });

      // Create status history entry
      await this.createStatusHistoryEntry(
        expeditRequestId,
        expeditRequest.status,
        ExpeditStatus.VENDOR_RESPONDED,
        updatedById,
        `Supplier response received: ${responseData.vendorResponse}`
      );

      // Send notification
      await this.notificationService.notifySupplierResponseReceived(
        expeditRequestId,
        responseData.vendorResponse,
        responseData.vendorCommitmentDate
      );

      logger.info('Supplier response updated successfully', { expeditRequestId });

    } catch (error) {
      logger.error('Failed to update supplier response', { error, expeditRequestId });
      throw new Error(`Failed to update supplier response: ${error.message}`);
    }
  }

  /**
   * Mark expedite request as in transit
   */
  async markInTransit(
    expeditRequestId: string,
    expectedArrivalDate: Date,
    updatedById: string
  ): Promise<void> {
    logger.info('Marking expedite request as in transit', { expeditRequestId });

    try {
      await this.updateExpeditStatus(
        expeditRequestId,
        ExpeditStatus.IN_TRANSIT,
        updatedById,
        'Material in transit'
      );

      // Send arrival notification
      await this.notificationService.notifyMaterialArrivalExpected(
        expeditRequestId,
        expectedArrivalDate
      );

    } catch (error) {
      logger.error('Failed to mark expedite request as in transit', { error, expeditRequestId });
      throw error;
    }
  }

  /**
   * Mark expedite request as delivered
   */
  async markDelivered(
    expeditRequestId: string,
    actualDeliveryDate: Date,
    updatedById: string
  ): Promise<void> {
    logger.info('Marking expedite request as delivered', { expeditRequestId });

    try {
      await this.prisma.expeditRequest.update({
        where: { id: expeditRequestId },
        data: {
          status: ExpeditStatus.DELIVERED,
          actualDeliveryDate,
        },
      });

      // Create status history entry
      await this.createStatusHistoryEntry(
        expeditRequestId,
        ExpeditStatus.IN_TRANSIT,
        ExpeditStatus.DELIVERED,
        updatedById,
        `Material delivered on ${actualDeliveryDate.toLocaleDateString()}`
      );

    } catch (error) {
      logger.error('Failed to mark expedite request as delivered', { error, expeditRequestId });
      throw error;
    }
  }

  /**
   * Resolve an expedite request
   */
  async resolveExpeditRequest(
    expeditRequestId: string,
    resolutionData: ResolveExpeditRequestData
  ): Promise<void> {
    logger.info('Resolving expedite request', { expeditRequestId, resolution: resolutionData.resolution });

    try {
      const expeditRequest = await this.getExpeditRequest(expeditRequestId);

      if (!expeditRequest) {
        throw new Error('Expedite request not found');
      }

      // Update the expedite request
      await this.prisma.expeditRequest.update({
        where: { id: expeditRequestId },
        data: {
          status: ExpeditStatus.RESOLVED,
          resolution: resolutionData.resolution,
          resolutionNotes: resolutionData.resolutionNotes,
          resolvedAt: new Date(),
          actualDeliveryDate: resolutionData.actualDeliveryDate,
          totalCost: resolutionData.finalCost,
        },
      });

      // Create status history entry
      await this.createStatusHistoryEntry(
        expeditRequestId,
        expeditRequest.status,
        ExpeditStatus.RESOLVED,
        resolutionData.resolvedById,
        `Request resolved: ${resolutionData.resolution}`
      );

      // Create shortage resolution record if linked to shortage alert
      if (expeditRequest.shortageAlertId) {
        await this.createShortageResolutionRecord(expeditRequest, resolutionData);
      }

      logger.info('Expedite request resolved successfully', { expeditRequestId });

    } catch (error) {
      logger.error('Failed to resolve expedite request', { error, expeditRequestId });
      throw new Error(`Failed to resolve expedite request: ${error.message}`);
    }
  }

  /**
   * Cancel an expedite request
   */
  async cancelExpeditRequest(
    expeditRequestId: string,
    cancelledById: string,
    cancellationReason: string
  ): Promise<void> {
    logger.info('Cancelling expedite request', { expeditRequestId });

    try {
      await this.updateExpeditStatus(
        expeditRequestId,
        ExpeditStatus.CANCELLED,
        cancelledById,
        `Request cancelled: ${cancellationReason}`
      );

    } catch (error) {
      logger.error('Failed to cancel expedite request', { error, expeditRequestId });
      throw error;
    }
  }

  /**
   * Get expedite request with full details
   */
  async getExpeditRequestWithDetails(expeditRequestId: string): Promise<ExpeditRequestWithDetails | null> {
    return this.prisma.expeditRequest.findUnique({
      where: { id: expeditRequestId },
      include: {
        part: {
          select: {
            partNumber: true,
            partName: true,
            unitOfMeasure: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactPhone: true,
          },
        },
        shortageAlert: {
          select: {
            id: true,
            kitId: true,
            priority: true,
          },
        },
      },
    }) as Promise<ExpeditRequestWithDetails | null>;
  }

  /**
   * Get expedite requests with filtering
   */
  async getExpeditRequests(filters: ExpeditRequestFilters = {}): Promise<ExpeditRequestWithDetails[]> {
    const where: any = {};

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.urgencyLevel?.length) {
      where.urgencyLevel = { in: filters.urgencyLevel };
    }

    if (filters.partId) {
      where.partId = filters.partId;
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters.requestedById) {
      where.requestedById = filters.requestedById;
    }

    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.from,
        lte: filters.dateRange.to,
      };
    }

    if (filters.pendingApproval) {
      where.status = { in: [ExpeditStatus.REQUESTED, ExpeditStatus.PENDING_APPROVAL] };
    }

    if (filters.overdue) {
      where.requestedByDate = { lt: new Date() };
      where.status = { notIn: [ExpeditStatus.RESOLVED, ExpeditStatus.CANCELLED] };
    }

    return this.prisma.expeditRequest.findMany({
      where,
      include: {
        part: {
          select: {
            partNumber: true,
            partName: true,
            unitOfMeasure: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactPhone: true,
          },
        },
        shortageAlert: {
          select: {
            id: true,
            kitId: true,
            priority: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as Promise<ExpeditRequestWithDetails[]>;
  }

  /**
   * Get expedite request metrics and analytics
   */
  async getExpeditRequestMetrics(days: number = 30): Promise<ExpeditRequestMetrics> {
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const [
      totalRequests,
      statusCounts,
      resolutionMetrics,
      costMetrics,
      urgencyMetrics,
    ] = await this.prisma.$transaction([
      // Total requests
      this.prisma.expeditRequest.count({
        where: { createdAt: { gte: since } },
      }),

      // Status counts
      this.prisma.expeditRequest.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),

      // Resolution time metrics
      this.prisma.expeditRequest.aggregate({
        where: {
          createdAt: { gte: since },
          resolvedAt: { not: null },
        },
        _avg: {
          // Note: Would need to calculate this via raw SQL or app logic
          // Average days = (resolvedAt - createdAt) / (1000 * 60 * 60 * 24)
        },
      }),

      // Cost metrics
      this.prisma.expeditRequest.aggregate({
        where: { createdAt: { gte: since } },
        _avg: {
          expediteFee: true,
          totalCost: true,
        },
        _sum: {
          expediteFee: true,
          totalCost: true,
        },
      }),

      // Urgency level performance
      this.prisma.expeditRequest.groupBy({
        by: ['urgencyLevel'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
    ]);

    // Process status counts
    const pendingApproval = statusCounts.find(s =>
      s.status === ExpeditStatus.REQUESTED || s.status === ExpeditStatus.PENDING_APPROVAL
    )?._count || 0;

    const inProgress = statusCounts.find(s =>
      [ExpeditStatus.APPROVED, ExpeditStatus.VENDOR_CONTACTED, ExpeditStatus.VENDOR_RESPONDED, ExpeditStatus.IN_TRANSIT, ExpeditStatus.DELIVERED].includes(s.status)
    )?._count || 0;

    const resolved = statusCounts.find(s => s.status === ExpeditStatus.RESOLVED)?._count || 0;

    // Calculate success rate
    const successfulResolutions = statusCounts.filter(s =>
      s.status === ExpeditStatus.RESOLVED
    ).reduce((sum, s) => sum + s._count, 0);

    const successRate = totalRequests > 0 ? (successfulResolutions / totalRequests) * 100 : 0;

    // Build performance by urgency (placeholder - would need actual calculations)
    const performanceByUrgency: ExpeditRequestMetrics['performanceByUrgency'] = {
      [ExpeditUrgency.LOW]: { count: 0, averageResolutionDays: 0, successRate: 0 },
      [ExpeditUrgency.NORMAL]: { count: 0, averageResolutionDays: 0, successRate: 0 },
      [ExpeditUrgency.HIGH]: { count: 0, averageResolutionDays: 0, successRate: 0 },
      [ExpeditUrgency.CRITICAL]: { count: 0, averageResolutionDays: 0, successRate: 0 },
      [ExpeditUrgency.EMERGENCY]: { count: 0, averageResolutionDays: 0, successRate: 0 },
    };

    urgencyMetrics.forEach(metric => {
      performanceByUrgency[metric.urgencyLevel] = {
        count: metric._count,
        averageResolutionDays: 0, // Would need to calculate
        successRate: 0, // Would need to calculate
      };
    });

    return {
      totalRequests,
      pendingApproval,
      inProgress,
      resolved,
      averageResolutionDays: 0, // Would need to calculate from timestamps
      successRate,
      totalCostSaved: 0, // Would need business logic to calculate
      averageExpediteFee: costMetrics._avg.expediteFee || 0,
      topReasons: [], // Would need to analyze justification text
      performanceByUrgency,
    };
  }

  /**
   * Private helper methods
   */

  private async getExpeditRequest(expeditRequestId: string): Promise<ExpeditRequest | null> {
    return this.prisma.expeditRequest.findUnique({
      where: { id: expeditRequestId },
    });
  }

  private async updateExpeditStatus(
    expeditRequestId: string,
    newStatus: ExpeditStatus,
    updatedById: string,
    notes?: string
  ): Promise<void> {
    const expeditRequest = await this.getExpeditRequest(expeditRequestId);

    if (!expeditRequest) {
      throw new Error('Expedite request not found');
    }

    await this.prisma.expeditRequest.update({
      where: { id: expeditRequestId },
      data: { status: newStatus },
    });

    await this.createStatusHistoryEntry(
      expeditRequestId,
      expeditRequest.status,
      newStatus,
      updatedById,
      notes
    );
  }

  private async createStatusHistoryEntry(
    expeditRequestId: string,
    fromStatus: ExpeditStatus | null,
    toStatus: ExpeditStatus,
    changedById?: string,
    notes?: string
  ): Promise<void> {
    await this.prisma.expeditStatusHistory.create({
      data: {
        expeditRequestId,
        fromStatus,
        toStatus,
        changedById,
        notes,
      },
    });
  }

  private async createShortageResolutionRecord(
    expeditRequest: ExpeditRequest,
    resolutionData: ResolveExpeditRequestData
  ): Promise<void> {
    if (!expeditRequest.shortageAlertId) return;

    await this.prisma.shortageResolution.create({
      data: {
        shortageAlertId: expeditRequest.shortageAlertId,
        expeditRequestId: expeditRequest.id,
        resolutionType: 'EXPEDITE_DELIVERED',
        resolvedById: resolutionData.resolvedById,
        actualDeliveryDate: resolutionData.actualDeliveryDate,
        quantityReceived: expeditRequest.requiredQuantity,
        receivedCondition: 'GOOD',
        expediteCost: expeditRequest.expediteFee,
        totalAdditionalCost: resolutionData.finalCost,
        qualityImpact: resolutionData.qualityImpact || false,
        notes: resolutionData.resolutionNotes,
      },
    });
  }

  private async validateExpeditRequest(data: CreateExpeditRequestData): Promise<void> {
    // Validate part exists
    const part = await this.prisma.part.findUnique({
      where: { id: data.partId },
    });

    if (!part) {
      throw new Error(`Part not found: ${data.partId}`);
    }

    // Validate requested quantity is positive
    if (data.requiredQuantity <= 0) {
      throw new Error('Required quantity must be greater than zero');
    }

    // Validate requested by date is in the future
    if (data.requestedByDate <= new Date()) {
      throw new Error('Requested by date must be in the future');
    }

    // Validate vendor if provided
    if (data.vendorId) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: data.vendorId },
      });

      if (!vendor) {
        throw new Error(`Vendor not found: ${data.vendorId}`);
      }
    }

    // Check for duplicate active requests
    const existingRequest = await this.prisma.expeditRequest.findFirst({
      where: {
        partId: data.partId,
        status: {
          notIn: [ExpeditStatus.RESOLVED, ExpeditStatus.CANCELLED, ExpeditStatus.REJECTED],
        },
      },
    });

    if (existingRequest) {
      throw new Error(`Active expedite request already exists for part: ${data.partId}`);
    }
  }
}