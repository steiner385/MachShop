/**
 * ✅ GITHUB ISSUE #55: Enhanced NCR Workflow States & Disposition Management
 * NCR Disposition Service - Phase 1-2
 *
 * Manages disposition setting, cost tracking, and approval integration
 * Replaces hardcoded restrictions with config-based validation
 */

import {
  NonConformanceReportEnhanced,
  NonConformanceReport,
  NCRDisposition,
  NCRStatus,
  NCRSeverity,
  DispositionCost,
  DispositionEffectivity,
  NCREffectivityType,
  NCRApprovalRequest,
} from '@/types/quality';
import { NCRWorkflowConfigService } from './NCRWorkflowConfigService';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * NCRDispositionService
 * Manages all disposition-related operations with config-based validation
 */
export class NCRDispositionService {
  private configService: NCRWorkflowConfigService;

  constructor(private prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.configService = new NCRWorkflowConfigService(prisma);
  }

  /**
   * Set disposition on an NCR
   * Validates against workflow configuration instead of hardcoded rules
   */
  async setDisposition(
    ncr: NonConformanceReport,
    disposition: NCRDisposition,
    reason: string,
    setBy: string,
    siteId?: string,
    rootCause?: string,
    correctiveAction?: string
  ): Promise<NonConformanceReportEnhanced> {
    // Use provided siteId or default
    const currentSiteId = siteId || 'DEFAULT';

    // Validate disposition reason is provided
    if (!reason || reason.trim().length === 0) {
      throw new Error('Disposition reason is required');
    }

    // Validate disposition is allowed in current state
    const status = ncr.status as NCRStatus;
    const isAllowed = await this.configService.isDispositionAllowedInState(
      currentSiteId,
      status,
      disposition
    );

    if (!isAllowed) {
      throw new Error(
        `Disposition ${disposition} is not allowed in state ${status}. ` +
        `Allowed dispositions: ${await this.getValidDispositionsForCurrentState(ncr, currentSiteId)}`
      );
    }

    // Check if approval is required
    const approvers = await this.configService.getRequiredApproversForDisposition(
      currentSiteId,
      ncr.severity,
      disposition
    );

    // Create approval request if required
    const approvalRequest: NCRApprovalRequest = {
      id: uuidv4(),
      ncrId: ncr.id,
      approvalType: 'DISPOSITION',
      approverEmail: approvers.roles.join(','), // Placeholder - will be resolved by unified approval service
      status: 'PENDING',
      requestedAt: new Date(),
    };

    // Save approval request
    await this.prisma?.nCRApprovalRequest.create({
      data: {
        id: approvalRequest.id,
        ncrId: approvalRequest.ncrId,
        approvalType: approvalRequest.approvalType,
        approverEmail: approvalRequest.approverEmail,
        status: approvalRequest.status,
        requestedAt: approvalRequest.requestedAt,
      },
    });

    // Create enhanced NCR
    const enhancedNCR: NonConformanceReportEnhanced = {
      ...ncr,
      disposition,
      dispositionReason: reason.trim(),
      rootCause: rootCause?.trim(),
      correctiveAction: correctiveAction?.trim(),
      status: NCRStatus.CORRECTIVE_ACTION,
      reviewedBy: setBy,
      reviewedDate: new Date(),
      stateHistory: [],
      approvalRequests: [approvalRequest],
      lastModifiedBy: setBy,
      lastModifiedAt: new Date(),
    };

    return enhancedNCR;
  }

  /**
   * Get valid dispositions for NCR's current state
   */
  private async getValidDispositionsForCurrentState(
    ncr: NonConformanceReport,
    siteId: string
  ): Promise<string> {
    const validDispositions = await this.configService.getValidDispositionsForState(
      siteId,
      ncr.status as NCRStatus
    );

    return validDispositions.join(', ');
  }

  /**
   * Set disposition cost
   */
  async setDispositionCost(
    ncrId: string,
    estimatedCost: number,
    disposition: NCRDisposition,
    approvedBy?: string,
    actualCost?: number,
    scrapCost?: number,
    reworkCost?: number,
    returnCost?: number,
    costCenter?: string
  ): Promise<DispositionCost> {
    if (estimatedCost < 0) {
      throw new Error('Estimated cost cannot be negative');
    }

    const cost: DispositionCost = {
      id: uuidv4(),
      ncrId,
      disposition,
      estimatedCost,
      actualCost,
      scrapCost,
      reworkCost,
      returnCost,
      currency: 'USD',
      costCenter,
      costApprovedBy: approvedBy,
      costApprovalDate: approvedBy ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    await this.prisma?.dispositionCost.upsert({
      where: { ncrId },
      update: {
        estimatedCost: cost.estimatedCost,
        disposition: cost.disposition,
        actualCost: cost.actualCost,
        scrapCost: cost.scrapCost,
        reworkCost: cost.reworkCost,
        returnCost: cost.returnCost,
        costCenter: cost.costCenter,
        costApprovedBy: cost.costApprovedBy,
        costApprovalDate: cost.costApprovalDate,
        updatedAt: cost.updatedAt,
      },
      create: {
        id: cost.id,
        ncrId: cost.ncrId,
        disposition: cost.disposition,
        estimatedCost: cost.estimatedCost,
        actualCost: cost.actualCost,
        scrapCost: cost.scrapCost,
        reworkCost: cost.reworkCost,
        returnCost: cost.returnCost,
        currency: cost.currency,
        costCenter: cost.costCenter,
        costApprovedBy: cost.costApprovedBy,
        costApprovalDate: cost.costApprovalDate,
        createdAt: cost.createdAt,
        updatedAt: cost.updatedAt,
      },
    });

    return cost;
  }

  /**
   * Get disposition cost
   */
  async getDispositionCost(ncrId: string): Promise<DispositionCost | null> {
    const cost = await this.prisma?.dispositionCost.findUnique({
      where: { ncrId },
    });

    return cost || null;
  }

  /**
   * Update disposition cost with actual values
   */
  async updateDispositionCostWithActuals(
    ncrId: string,
    actualCost: number,
    scrapCost?: number,
    reworkCost?: number,
    returnCost?: number
  ): Promise<DispositionCost> {
    const existing = await this.getDispositionCost(ncrId);

    if (!existing) {
      throw new Error(`No disposition cost found for NCR ${ncrId}`);
    }

    const updated = await this.prisma?.dispositionCost.update({
      where: { ncrId },
      data: {
        actualCost,
        scrapCost,
        reworkCost,
        returnCost,
        updatedAt: new Date(),
      },
    });

    return updated!;
  }

  /**
   * Calculate total cost for a disposition
   */
  async calculateTotalDispositionCost(ncrId: string): Promise<number> {
    const cost = await this.getDispositionCost(ncrId);

    if (!cost) {
      return 0;
    }

    // Calculate total from component costs if available
    if (cost.actualCost !== undefined) {
      return cost.actualCost;
    }

    const total =
      (cost.scrapCost || 0) +
      (cost.reworkCost || 0) +
      (cost.returnCost || 0);

    return total > 0 ? total : cost.estimatedCost;
  }

  /**
   * Perform bulk disposition setting
   */
  async bulkSetDisposition(
    ncrIds: string[],
    disposition: NCRDisposition,
    reason: string,
    setBy: string,
    ncrs: NonConformanceReport[],
    siteId?: string
  ): Promise<NonConformanceReportEnhanced[]> {
    const results: NonConformanceReportEnhanced[] = [];
    const failures: { ncrId: string; error: string }[] = [];

    for (const ncr of ncrs) {
      try {
        const result = await this.setDisposition(ncr, disposition, reason, setBy, siteId);
        results.push(result);
      } catch (error) {
        failures.push({
          ncrId: ncr.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (failures.length > 0) {
      console.warn(`Bulk disposition completed with ${failures.length} failures:`, failures);
    }

    return results;
  }

  /**
   * Set disposition effectivity
   */
  async setDispositionEffectivity(
    ncrId: string,
    type: NCREffectivityType,
    value?: string
  ): Promise<DispositionEffectivity> {
    const effectivity: DispositionEffectivity = {
      type,
      value,
    };

    // Save to database (would be part of NCR record)
    // For now, returning the effectivity object
    return effectivity;
  }

  /**
   * Validate disposition compatibility with severity
   */
  async isDispositionAllowedForSeverity(
    siteId: string,
    severity: NCRSeverity,
    disposition: NCRDisposition
  ): Promise<boolean> {
    const approvers = await this.configService.getRequiredApproversForDisposition(
      siteId,
      severity,
      disposition
    );

    // If approval is configured for this combination, it's allowed
    return approvers.roles.length > 0;
  }

  /**
   * Get disposition history for an NCR
   */
  async getDispositionHistory(ncrId: string): Promise<DispositionCost[]> {
    // This would query a disposition_history table if available
    // For Phase 1-2, returning current cost only
    const cost = await this.getDispositionCost(ncrId);
    return cost ? [cost] : [];
  }

  /**
   * Archive disposition (when NCR is closed)
   */
  async archiveDisposition(ncrId: string): Promise<void> {
    const cost = await this.getDispositionCost(ncrId);

    if (!cost) {
      return;
    }

    // Mark as archived (would need archived field in schema)
    await this.prisma?.dispositionCost.update({
      where: { ncrId },
      data: {
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get disposition statistics for a site
   */
  async getDispositionStats(siteId: string): Promise<{
    totalNCRs: number;
    dispositionCounts: Record<NCRDisposition, number>;
    averageCost: number;
    totalCost: number;
  }> {
    // Query would filter by site (via NCR.siteId)
    const costs = await this.prisma?.dispositionCost.findMany({
      // where: { ncr: { siteId } }, // Not available without proper relation
    });

    if (!costs || costs.length === 0) {
      return {
        totalNCRs: 0,
        dispositionCounts: {} as Record<NCRDisposition, number>,
        averageCost: 0,
        totalCost: 0,
      };
    }

    // Calculate disposition counts
    const dispositionCounts: Record<string, number> = {};
    let totalCost = 0;

    for (const cost of costs) {
      dispositionCounts[cost.disposition] = (dispositionCounts[cost.disposition] || 0) + 1;
      totalCost += cost.actualCost || cost.estimatedCost;
    }

    const averageCost = totalCost / costs.length;

    return {
      totalNCRs: costs.length,
      dispositionCounts: dispositionCounts as Record<NCRDisposition, number>,
      averageCost,
      totalCost,
    };
  }

  /**
   * Close connection to database
   */
  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}
