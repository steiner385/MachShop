/**
 * ✅ GITHUB ISSUE #55: Enhanced NCR Workflow States & Disposition Management
 * DDR (Delayed Disposition Required) Request Service - Phase 1-2
 *
 * Manages Delayed Disposition Required requests with pending items tracking
 * Supports escalation and notifications
 */

import {
  DDRRequest,
  DDRPendingItem,
  DDRStatus,
} from '@/types/quality';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * DDRRequestService
 * Manages DDR request lifecycle and escalation
 */
export class DDRRequestService {
  constructor(private prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create a new DDR request
   */
  async createDDRRequest(
    ncrId: string,
    reason: string,
    expectedResolutionDate: Date,
    createdBy: string
  ): Promise<DDRRequest> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('DDR reason is required');
    }

    if (expectedResolutionDate < new Date()) {
      throw new Error('Expected resolution date must be in the future');
    }

    const ddrRequest: DDRRequest = {
      id: uuidv4(),
      ncrId,
      reason: reason.trim(),
      expectedResolutionDate,
      requiredApprovals: [],
      pendingItems: [],
      escalationLevel: 0,
      status: DDRStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    await this.prisma?.dDRRequest.create({
      data: {
        id: ddrRequest.id,
        ncrId: ddrRequest.ncrId,
        reason: ddrRequest.reason,
        expectedResolutionDate: ddrRequest.expectedResolutionDate,
        escalationLevel: ddrRequest.escalationLevel,
        status: ddrRequest.status,
        createdAt: ddrRequest.createdAt,
        updatedAt: ddrRequest.updatedAt,
      },
    });

    return ddrRequest;
  }

  /**
   * Get DDR request
   */
  async getDDRRequest(ddrId: string): Promise<DDRRequest | null> {
    const ddr = await this.prisma?.dDRRequest.findUnique({
      where: { id: ddrId },
    });

    return ddr || null;
  }

  /**
   * Get DDR request by NCR ID
   */
  async getDDRRequestByNCRId(ncrId: string): Promise<DDRRequest | null> {
    const ddr = await this.prisma?.dDRRequest.findUnique({
      where: { ncrId },
    });

    return ddr || null;
  }

  /**
   * Update DDR request
   */
  async updateDDRRequest(
    ddrId: string,
    updates: Partial<Omit<DDRRequest, 'id' | 'createdAt'>>
  ): Promise<DDRRequest> {
    const ddr = await this.prisma?.dDRRequest.update({
      where: { id: ddrId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    return ddr!;
  }

  /**
   * Add pending item to DDR request
   */
  async addPendingItem(
    ddrId: string,
    description: string,
    ownerEmail: string,
    targetDate: Date
  ): Promise<DDRRequest> {
    const ddr = await this.getDDRRequest(ddrId);

    if (!ddr) {
      throw new Error(`DDR request ${ddrId} not found`);
    }

    const newItem: DDRPendingItem = {
      id: uuidv4(),
      description,
      ownerEmail,
      targetDate,
      isCompleted: false,
    };

    const updatedPendingItems = [...ddr.pendingItems, newItem];

    return this.updateDDRRequest(ddrId, {
      pendingItems: updatedPendingItems,
    });
  }

  /**
   * Complete pending item
   */
  async completePendingItem(
    ddrId: string,
    itemId: string,
    completionNotes?: string
  ): Promise<DDRRequest> {
    const ddr = await this.getDDRRequest(ddrId);

    if (!ddr) {
      throw new Error(`DDR request ${ddrId} not found`);
    }

    const updatedPendingItems = ddr.pendingItems.map(item =>
      item.id === itemId
        ? {
            ...item,
            isCompleted: true,
            completedDate: new Date(),
            notes: completionNotes,
          }
        : item
    );

    return this.updateDDRRequest(ddrId, {
      pendingItems: updatedPendingItems,
    });
  }

  /**
   * Check if all pending items are completed
   */
  async areAllItemsCompleted(ddrId: string): Promise<boolean> {
    const ddr = await this.getDDRRequest(ddrId);

    if (!ddr) {
      throw new Error(`DDR request ${ddrId} not found`);
    }

    if (ddr.pendingItems.length === 0) {
      return true;
    }

    return ddr.pendingItems.every(item => item.isCompleted);
  }

  /**
   * Escalate DDR request
   */
  async escalateDDRRequest(
    ddrId: string,
    escalatedBy: string
  ): Promise<DDRRequest> {
    const ddr = await this.getDDRRequest(ddrId);

    if (!ddr) {
      throw new Error(`DDR request ${ddrId} not found`);
    }

    const newEscalationLevel = ddr.escalationLevel + 1;

    return this.updateDDRRequest(ddrId, {
      escalationLevel: newEscalationLevel,
      status: DDRStatus.ESCALATED,
    });
  }

  /**
   * Resolve DDR request
   */
  async resolveDDRRequest(
    ddrId: string,
    resolvedBy: string
  ): Promise<DDRRequest> {
    const ddr = await this.getDDRRequest(ddrId);

    if (!ddr) {
      throw new Error(`DDR request ${ddrId} not found`);
    }

    return this.updateDDRRequest(ddrId, {
      status: DDRStatus.RESOLVED,
    });
  }

  /**
   * Check if DDR is overdue
   */
  async isDDROverdue(ddrId: string): Promise<boolean> {
    const ddr = await this.getDDRRequest(ddrId);

    if (!ddr) {
      throw new Error(`DDR request ${ddrId} not found`);
    }

    return new Date() > ddr.expectedResolutionDate && ddr.status !== DDRStatus.RESOLVED;
  }

  /**
   * Get days remaining for DDR resolution
   */
  async getDaysRemaining(ddrId: string): Promise<number> {
    const ddr = await this.getDDRRequest(ddrId);

    if (!ddr) {
      throw new Error(`DDR request ${ddrId} not found`);
    }

    const now = new Date();
    const diffMs = ddr.expectedResolutionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Get completion percentage for DDR
   */
  async getCompletionPercentage(ddrId: string): Promise<number> {
    const ddr = await this.getDDRRequest(ddrId);

    if (!ddr) {
      throw new Error(`DDR request ${ddrId} not found`);
    }

    if (ddr.pendingItems.length === 0) {
      return 100;
    }

    const completedCount = ddr.pendingItems.filter(item => item.isCompleted).length;
    return Math.round((completedCount / ddr.pendingItems.length) * 100);
  }

  /**
   * Get overdue DDR requests
   */
  async getOverdueDDRRequests(): Promise<DDRRequest[]> {
    const now = new Date();

    const overdue = await this.prisma?.dDRRequest.findMany({
      where: {
        AND: [
          { expectedResolutionDate: { lt: now } },
          { status: { not: DDRStatus.RESOLVED } },
        ],
      },
    });

    return overdue || [];
  }

  /**
   * Get DDR statistics
   */
  async getDDRStats(): Promise<{
    totalDDRs: number;
    pendingCount: number;
    escalatedCount: number;
    resolvedCount: number;
    overdueCount: number;
    averageResolutionTime: number; // in days
  }> {
    const all = await this.prisma?.dDRRequest.findMany();

    if (!all || all.length === 0) {
      return {
        totalDDRs: 0,
        pendingCount: 0,
        escalatedCount: 0,
        resolvedCount: 0,
        overdueCount: 0,
        averageResolutionTime: 0,
      };
    }

    const now = new Date();
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    const stats = {
      totalDDRs: all.length,
      pendingCount: all.filter(d => d.status === DDRStatus.PENDING).length,
      escalatedCount: all.filter(d => d.status === DDRStatus.ESCALATED).length,
      resolvedCount: 0,
      overdueCount: all.filter(d => d.expectedResolutionDate < now && d.status !== DDRStatus.RESOLVED).length,
      averageResolutionTime: 0,
    };

    for (const ddr of all) {
      if (ddr.status === DDRStatus.RESOLVED) {
        stats.resolvedCount++;
        const resolutionTime = ddr.updatedAt.getTime() - ddr.createdAt.getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    }

    if (resolvedCount > 0) {
      stats.averageResolutionTime = totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24);
    }

    return stats;
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
