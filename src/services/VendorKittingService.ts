/**
 * Vendor Kitting Service
 *
 * Service for managing vendor-supplied kits including vendor-specific workflows,
 * tracking, quality control, and integration with main kit management system
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  KittingError,
  KittingErrorHandler,
  KittingErrorType,
  KittingErrorSeverity,
  KittingCircuitBreaker
} from '../utils/kittingErrors';

export interface VendorKitRequest {
  vendorId: string;
  workOrderId: string;
  operationId?: string;
  kitSpecification: {
    kitName: string;
    assemblyStage?: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    requiredDeliveryDate: Date;
    specialInstructions?: string;
  };
  kitItems: Array<{
    partId: string;
    requiredQuantity: number;
    specifications?: Record<string, any>;
    qualityRequirements?: string[];
  }>;
  deliveryLocation: {
    locationId: string;
    contactPerson: string;
    specialHandling?: string[];
  };
  qualityRequirements: {
    inspectionLevel: 'STANDARD' | 'ENHANCED' | 'CRITICAL';
    certificationRequired: boolean;
    testRequirements?: string[];
    complianceStandards: string[]; // e.g., ['AS9100', 'ISO9001']
  };
}

export interface VendorKit {
  id: string;
  vendorKitNumber: string;
  vendorId: string;
  workOrderId: string;
  operationId?: string;
  status: 'REQUESTED' | 'ACKNOWLEDGED' | 'IN_PRODUCTION' | 'SHIPPED' | 'RECEIVED' | 'INSPECTED' | 'APPROVED' | 'REJECTED';
  kitName: string;
  assemblyStage?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

  // Dates and timeline
  requestedDate: Date;
  acknowledgedDate?: Date;
  promisedDate?: Date;
  shippedDate?: Date;
  receivedDate?: Date;
  inspectedDate?: Date;
  approvedDate?: Date;
  requiredDeliveryDate: Date;

  // Tracking information
  trackingNumber?: string;
  carrierService?: string;

  // Quality and compliance
  qualityStatus: 'PENDING' | 'IN_INSPECTION' | 'PASSED' | 'FAILED' | 'CONDITIONAL';
  certificationStatus: 'NOT_REQUIRED' | 'PENDING' | 'RECEIVED' | 'VERIFIED' | 'EXPIRED';
  complianceScore?: number;

  // Cost information
  quotedCost?: number;
  actualCost?: number;

  // Performance metrics
  onTimeDelivery?: boolean;
  qualityScore?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface VendorKitItem {
  id: string;
  vendorKitId: string;
  partId: string;
  requiredQuantity: number;
  deliveredQuantity?: number;
  acceptedQuantity?: number;
  rejectedQuantity?: number;
  status: 'PENDING' | 'DELIVERED' | 'INSPECTED' | 'ACCEPTED' | 'REJECTED';
  qualityNotes?: string;
  certificationNumber?: string;
}

export interface VendorPerformance {
  vendorId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    totalKits: number;
    onTimeDeliveryRate: number;
    qualityScore: number;
    defectRate: number;
    averageLeadTime: number;
    costPerformance: number;
    responsiveness: number;
  };
  trends: {
    deliveryTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    qualityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    costTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  };
  recommendations: Array<{
    type: 'DELIVERY' | 'QUALITY' | 'COST' | 'COMMUNICATION';
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

export interface VendorKitInspection {
  id: string;
  vendorKitId: string;
  inspectorId: string;
  inspectionDate: Date;
  inspectionType: 'RECEIVING' | 'FIRST_ARTICLE' | 'RANDOM' | 'AUDIT';
  overallResult: 'PASS' | 'FAIL' | 'CONDITIONAL';

  checkpoints: Array<{
    checkpoint: string;
    result: 'PASS' | 'FAIL' | 'N/A';
    notes?: string;
    measurements?: Array<{
      parameter: string;
      value: number;
      unit: string;
      tolerance: string;
      result: 'PASS' | 'FAIL';
    }>;
  }>;

  defectsFound: Array<{
    description: string;
    severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
    quantity: number;
    disposition: 'ACCEPT' | 'REJECT' | 'REWORK' | 'USE_AS_IS';
  }>;

  correctedDefects?: Array<{
    originalDefectId: string;
    correctionMethod: string;
    verifiedBy: string;
    verificationDate: Date;
  }>;

  finalDisposition: 'ACCEPT' | 'REJECT' | 'CONDITIONAL_ACCEPT';
  notes?: string;
}

export class VendorKittingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Request a kit from a vendor
   */
  async requestVendorKit(request: VendorKitRequest, requesterId: string): Promise<VendorKit> {
    logger.info('Requesting vendor kit', {
      vendorId: request.vendorId,
      workOrderId: request.workOrderId,
      kitName: request.kitSpecification.kitName
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Generate vendor kit number
        const vendorKitNumber = await this.generateVendorKitNumber(request.vendorId);

        // Create vendor kit record
        const vendorKit = await tx.vendorKit.create({
          data: {
            vendorKitNumber,
            vendorId: request.vendorId,
            workOrderId: request.workOrderId,
            operationId: request.operationId,
            status: 'REQUESTED',
            kitName: request.kitSpecification.kitName,
            assemblyStage: request.kitSpecification.assemblyStage,
            priority: request.kitSpecification.priority,
            requestedDate: new Date(),
            requiredDeliveryDate: request.kitSpecification.requiredDeliveryDate,
            qualityStatus: 'PENDING',
            certificationStatus: request.qualityRequirements.certificationRequired ? 'PENDING' : 'NOT_REQUIRED',
            createdBy: requesterId
          }
        });

        // Create vendor kit items
        await Promise.all(
          request.kitItems.map(item =>
            tx.vendorKitItem.create({
              data: {
                vendorKitId: vendorKit.id,
                partId: item.partId,
                requiredQuantity: item.requiredQuantity,
                status: 'PENDING',
                specifications: item.specifications,
                qualityRequirements: item.qualityRequirements
              }
            })
          )
        );

        // Log the request
        await tx.vendorKitHistory.create({
          data: {
            vendorKitId: vendorKit.id,
            action: 'REQUESTED',
            performedBy: requesterId,
            notes: `Kit requested with ${request.kitItems.length} items`,
            timestamp: new Date()
          }
        });

        // Send notification to vendor (placeholder)
        await this.notifyVendor(vendorKit.id, 'KIT_REQUESTED');

        return vendorKit;
      });

    } catch (error) {
      // If it's already a KittingError, re-throw it
      if (error instanceof KittingError) {
        throw error;
      }

      // Otherwise, wrap in a vendor kit error
      logger.error('Failed to request vendor kit', { error, request });
      throw KittingErrorHandler.createVendorKitError(
        KittingErrorType.VENDOR_REQUEST_FAILED,
        `Failed to request vendor kit: ${error.message}`,
        undefined,
        request.vendorId,
        { originalError: error.message, workOrderId: request.workOrderId }
      );
    }
  }

  /**
   * Update vendor kit status
   */
  async updateVendorKitStatus(
    vendorKitId: string,
    newStatus: VendorKit['status'],
    updateData: Partial<VendorKit>,
    updatedBy: string
  ): Promise<VendorKit> {
    logger.info('Updating vendor kit status', {
      vendorKitId,
      newStatus,
      updatedBy
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        const currentKit = await tx.vendorKit.findUnique({
          where: { id: vendorKitId }
        });

        if (!currentKit) {
          throw new Error(`Vendor kit ${vendorKitId} not found`);
        }

        // Validate status transition
        if (!this.isValidStatusTransition(currentKit.status, newStatus)) {
          throw new Error(`Invalid status transition from ${currentKit.status} to ${newStatus}`);
        }

        // Update kit with new status and data
        const updatedKit = await tx.vendorKit.update({
          where: { id: vendorKitId },
          data: {
            ...updateData,
            status: newStatus,
            updatedAt: new Date(),
            // Set specific date fields based on status
            ...(newStatus === 'ACKNOWLEDGED' && { acknowledgedDate: new Date() }),
            ...(newStatus === 'SHIPPED' && { shippedDate: new Date() }),
            ...(newStatus === 'RECEIVED' && { receivedDate: new Date() }),
            ...(newStatus === 'INSPECTED' && { inspectedDate: new Date() }),
            ...(newStatus === 'APPROVED' && { approvedDate: new Date() })
          }
        });

        // Log the status change
        await tx.vendorKitHistory.create({
          data: {
            vendorKitId,
            action: newStatus,
            performedBy: updatedBy,
            notes: `Status changed from ${currentKit.status} to ${newStatus}`,
            timestamp: new Date()
          }
        });

        // Handle specific status logic
        await this.handleStatusSpecificLogic(tx, updatedKit, newStatus);

        return updatedKit;
      });

    } catch (error) {
      logger.error('Failed to update vendor kit status', { error, vendorKitId, newStatus });
      throw error;
    }
  }

  /**
   * Receive vendor kit and initiate inspection
   */
  async receiveVendorKit(
    vendorKitId: string,
    receivingData: {
      receivedBy: string;
      receivingNotes?: string;
      trackingNumber?: string;
      carrierService?: string;
      receivedItems: Array<{
        vendorKitItemId: string;
        deliveredQuantity: number;
        condition: 'GOOD' | 'DAMAGED' | 'MISSING';
        notes?: string;
      }>;
    }
  ): Promise<{
    vendorKit: VendorKit;
    inspectionRequired: boolean;
    nextActions: string[];
  }> {
    logger.info('Receiving vendor kit', {
      vendorKitId,
      receivedBy: receivingData.receivedBy
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Update kit status to received
        const updatedKit = await this.updateVendorKitStatus(
          vendorKitId,
          'RECEIVED',
          {
            trackingNumber: receivingData.trackingNumber,
            carrierService: receivingData.carrierService
          },
          receivingData.receivedBy
        );

        // Update item quantities
        await Promise.all(
          receivingData.receivedItems.map(item =>
            tx.vendorKitItem.update({
              where: { id: item.vendorKitItemId },
              data: {
                deliveredQuantity: item.deliveredQuantity,
                status: 'DELIVERED',
                qualityNotes: item.notes
              }
            })
          )
        );

        // Determine if inspection is required
        const kitWithItems = await tx.vendorKit.findUnique({
          where: { id: vendorKitId },
          include: { vendorKitItems: true, vendor: true }
        });

        const inspectionRequired = this.determineInspectionRequirement(kitWithItems);

        let nextActions: string[] = [];

        if (inspectionRequired) {
          nextActions.push('Schedule quality inspection');
          nextActions.push('Verify certifications');

          // Auto-schedule inspection if configured
          await this.scheduleInspection(vendorKitId, 'RECEIVING', receivingData.receivedBy);
        } else {
          nextActions.push('Review for direct approval');
          nextActions.push('Update inventory');
        }

        return {
          vendorKit: updatedKit,
          inspectionRequired,
          nextActions
        };
      });

    } catch (error) {
      logger.error('Failed to receive vendor kit', { error, vendorKitId });
      throw error;
    }
  }

  /**
   * Perform vendor kit inspection
   */
  async performInspection(
    vendorKitId: string,
    inspectionData: Omit<VendorKitInspection, 'id' | 'vendorKitId'>
  ): Promise<{
    inspection: VendorKitInspection;
    kitStatus: VendorKit['status'];
    requiredActions: string[];
  }> {
    logger.info('Performing vendor kit inspection', {
      vendorKitId,
      inspectorId: inspectionData.inspectorId,
      inspectionType: inspectionData.inspectionType
    });

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create inspection record
        const inspection = await tx.vendorKitInspection.create({
          data: {
            ...inspectionData,
            vendorKitId
          }
        });

        // Determine kit status based on inspection results
        let newKitStatus: VendorKit['status'];
        let newQualityStatus: VendorKit['qualityStatus'];
        let requiredActions: string[] = [];

        switch (inspectionData.finalDisposition) {
          case 'ACCEPT':
            newKitStatus = 'APPROVED';
            newQualityStatus = 'PASSED';
            requiredActions.push('Release to production');
            requiredActions.push('Update inventory');
            break;

          case 'REJECT':
            newKitStatus = 'REJECTED';
            newQualityStatus = 'FAILED';
            requiredActions.push('Initiate vendor corrective action');
            requiredActions.push('Request replacement kit');
            break;

          case 'CONDITIONAL_ACCEPT':
            newKitStatus = 'APPROVED';
            newQualityStatus = 'CONDITIONAL';
            requiredActions.push('Monitor during production');
            requiredActions.push('Enhanced tracking required');
            break;
        }

        // Update kit status
        await tx.vendorKit.update({
          where: { id: vendorKitId },
          data: {
            status: newKitStatus,
            qualityStatus: newQualityStatus,
            qualityScore: this.calculateQualityScore(inspectionData),
            inspectedDate: new Date()
          }
        });

        // Update item statuses based on inspection results
        await this.updateItemStatusesFromInspection(tx, vendorKitId, inspectionData);

        // Log inspection completion
        await tx.vendorKitHistory.create({
          data: {
            vendorKitId,
            action: 'INSPECTED',
            performedBy: inspectionData.inspectorId,
            notes: `Inspection completed: ${inspectionData.finalDisposition}`,
            timestamp: new Date()
          }
        });

        return {
          inspection,
          kitStatus: newKitStatus,
          requiredActions
        };
      });

    } catch (error) {
      logger.error('Failed to perform vendor kit inspection', { error, vendorKitId });
      throw error;
    }
  }

  /**
   * Get vendor performance metrics
   */
  async getVendorPerformance(
    vendorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VendorPerformance> {
    logger.info('Calculating vendor performance', {
      vendorId,
      startDate,
      endDate
    });

    try {
      const vendorKits = await this.prisma.vendorKit.findMany({
        where: {
          vendorId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          vendorKitItems: true
        }
      });

      if (vendorKits.length === 0) {
        throw new Error(`No vendor kits found for vendor ${vendorId} in specified period`);
      }

      // Calculate metrics
      const totalKits = vendorKits.length;
      const completedKits = vendorKits.filter(kit =>
        ['APPROVED', 'REJECTED'].includes(kit.status)
      );

      const onTimeDeliveries = vendorKits.filter(kit =>
        kit.receivedDate && kit.requiredDeliveryDate &&
        kit.receivedDate <= kit.requiredDeliveryDate
      ).length;

      const qualityScores = vendorKits
        .filter(kit => kit.qualityScore !== null)
        .map(kit => kit.qualityScore);

      const leadTimes = vendorKits
        .filter(kit => kit.receivedDate && kit.requestedDate)
        .map(kit => {
          const leadTime = kit.receivedDate.getTime() - kit.requestedDate.getTime();
          return leadTime / (1000 * 60 * 60 * 24); // Convert to days
        });

      const metrics = {
        totalKits,
        onTimeDeliveryRate: (onTimeDeliveries / completedKits.length) * 100,
        qualityScore: qualityScores.length > 0
          ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
          : 0,
        defectRate: this.calculateDefectRate(vendorKits),
        averageLeadTime: leadTimes.length > 0
          ? leadTimes.reduce((sum, time) => sum + time, 0) / leadTimes.length
          : 0,
        costPerformance: this.calculateCostPerformance(vendorKits),
        responsiveness: this.calculateResponsiveness(vendorKits)
      };

      // Calculate trends (would need historical data for real implementation)
      const trends = {
        deliveryTrend: 'STABLE' as const,
        qualityTrend: 'STABLE' as const,
        costTrend: 'STABLE' as const
      };

      // Generate recommendations
      const recommendations = this.generateVendorRecommendations(metrics);

      return {
        vendorId,
        period: { startDate, endDate },
        metrics,
        trends,
        recommendations
      };

    } catch (error) {
      logger.error('Failed to calculate vendor performance', { error, vendorId });
      throw error;
    }
  }

  // Private helper methods

  private async generateVendorKitNumber(vendorId: string): Promise<string> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = await this.getNextSequenceNumber(vendorId, today);

    return `VK-${vendor?.vendorCode || 'UNK'}-${today}-${sequence.toString().padStart(3, '0')}`;
  }

  private async getNextSequenceNumber(vendorId: string, date: string): Promise<number> {
    const count = await this.prisma.vendorKit.count({
      where: {
        vendorId,
        vendorKitNumber: {
          contains: date
        }
      }
    });

    return count + 1;
  }

  private isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'REQUESTED': ['ACKNOWLEDGED', 'REJECTED'],
      'ACKNOWLEDGED': ['IN_PRODUCTION', 'REJECTED'],
      'IN_PRODUCTION': ['SHIPPED', 'REJECTED'],
      'SHIPPED': ['RECEIVED'],
      'RECEIVED': ['INSPECTED', 'APPROVED'], // Direct approval possible
      'INSPECTED': ['APPROVED', 'REJECTED'],
      'APPROVED': [], // Terminal state
      'REJECTED': ['REQUESTED'] // Can restart process
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private async handleStatusSpecificLogic(
    tx: any,
    vendorKit: VendorKit,
    newStatus: VendorKit['status']
  ): Promise<void> {
    switch (newStatus) {
      case 'SHIPPED':
        // Calculate on-time delivery prediction
        if (vendorKit.promisedDate && vendorKit.requiredDeliveryDate) {
          const onTimeDelivery = vendorKit.promisedDate <= vendorKit.requiredDeliveryDate;
          await tx.vendorKit.update({
            where: { id: vendorKit.id },
            data: { onTimeDelivery }
          });
        }
        break;

      case 'APPROVED':
        // Integrate with main kit system
        await this.integrateWithMainKitSystem(tx, vendorKit);
        break;

      case 'REJECTED':
        // Initiate corrective action process
        await this.initiateCorrectiveAction(tx, vendorKit);
        break;
    }
  }

  private determineInspectionRequirement(kitWithDetails: any): boolean {
    // Always require inspection for critical items or new vendors
    if (kitWithDetails.vendor.riskLevel === 'HIGH') {
      return true;
    }

    // Check if any items require certification
    const hasCertificationRequirements = kitWithDetails.vendorKitItems.some(
      (item: any) => item.qualityRequirements?.includes('CERTIFICATION_REQUIRED')
    );

    return hasCertificationRequirements || kitWithDetails.priority === 'URGENT';
  }

  private async scheduleInspection(
    vendorKitId: string,
    inspectionType: string,
    scheduledBy: string
  ): Promise<void> {
    // Placeholder for inspection scheduling logic
    logger.info('Scheduling inspection', {
      vendorKitId,
      inspectionType,
      scheduledBy
    });
  }

  private calculateQualityScore(inspectionData: any): number {
    // Simple quality score calculation based on inspection results
    const totalCheckpoints = inspectionData.checkpoints.length;
    const passedCheckpoints = inspectionData.checkpoints.filter(
      (cp: any) => cp.result === 'PASS'
    ).length;

    const baseScore = (passedCheckpoints / totalCheckpoints) * 100;

    // Deduct points for defects
    const criticalDefects = inspectionData.defectsFound.filter(
      (d: any) => d.severity === 'CRITICAL'
    ).length;
    const majorDefects = inspectionData.defectsFound.filter(
      (d: any) => d.severity === 'MAJOR'
    ).length;

    const deductions = (criticalDefects * 20) + (majorDefects * 10);

    return Math.max(0, baseScore - deductions);
  }

  private async updateItemStatusesFromInspection(
    tx: any,
    vendorKitId: string,
    inspectionData: any
  ): Promise<void> {
    // Update item statuses based on inspection results
    // This would map inspection results to specific items
    await tx.vendorKitItem.updateMany({
      where: { vendorKitId },
      data: {
        status: inspectionData.finalDisposition === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'
      }
    });
  }

  private calculateDefectRate(vendorKits: any[]): number {
    // Placeholder calculation
    return 2.5; // 2.5% defect rate
  }

  private calculateCostPerformance(vendorKits: any[]): number {
    // Placeholder calculation
    return 95; // 95% cost performance
  }

  private calculateResponsiveness(vendorKits: any[]): number {
    // Calculate based on acknowledgment time, communication, etc.
    return 90; // 90% responsiveness score
  }

  private generateVendorRecommendations(metrics: any): Array<{
    type: 'DELIVERY' | 'QUALITY' | 'COST' | 'COMMUNICATION';
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    const recommendations = [];

    if (metrics.onTimeDeliveryRate < 90) {
      recommendations.push({
        type: 'DELIVERY' as const,
        message: 'Improve delivery performance through better planning and buffer time management',
        priority: 'HIGH' as const
      });
    }

    if (metrics.qualityScore < 95) {
      recommendations.push({
        type: 'QUALITY' as const,
        message: 'Implement additional quality controls and provide quality training',
        priority: 'HIGH' as const
      });
    }

    return recommendations;
  }

  private async integrateWithMainKitSystem(tx: any, vendorKit: VendorKit): Promise<void> {
    // Create corresponding kit in main system
    logger.info('Integrating vendor kit with main system', {
      vendorKitId: vendorKit.id
    });
    // Implementation would create Kit record with reference to vendor kit
  }

  private async initiateCorrectiveAction(tx: any, vendorKit: VendorKit): Promise<void> {
    // Start corrective action process
    logger.info('Initiating corrective action for vendor kit', {
      vendorKitId: vendorKit.id
    });
    // Implementation would create corrective action request
  }

  private async notifyVendor(vendorKitId: string, eventType: string): Promise<void> {
    // Send notification to vendor (email, API, etc.)
    logger.info('Notifying vendor', { vendorKitId, eventType });
    // Implementation would send actual notifications
  }
}