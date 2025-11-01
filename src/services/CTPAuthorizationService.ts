/**
 * ✅ GITHUB ISSUE #55: Enhanced NCR Workflow States & Disposition Management
 * CTP (Continue to Process) Authorization Service - Phase 1-2
 *
 * Manages Continue-to-Process authorizations
 * Allows continued use of nonconforming material pending final disposition
 */

import {
  CTPAuthorization,
  CTPAuthorizationStatus,
  NCRApprovalRequest,
} from '@/types/quality';
import { NCRWorkflowConfigService } from './NCRWorkflowConfigService';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * CTPAuthorizationService
 * Manages CTP authorization lifecycle
 */
export class CTPAuthorizationService {
  private configService: NCRWorkflowConfigService;

  constructor(private prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.configService = new NCRWorkflowConfigService(prisma);
  }

  /**
   * Create a new CTP authorization
   */
  async createCTPAuthorization(
    ncrId: string,
    justification: string,
    authorizedBy: string,
    siteId: string,
    expirationDays?: number
  ): Promise<CTPAuthorization> {
    // Validate justification
    if (!justification || justification.trim().length === 0) {
      throw new Error('CTP justification is required');
    }

    // Get default expiration days from config
    const config = await this.configService.getConfigBySiteAndSeverity(siteId, 'MINOR' as any);
    const expirationDaysToUse = expirationDays || config.ctpExpirationDays;

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expirationDaysToUse);

    const authorization: CTPAuthorization = {
      id: uuidv4(),
      ncrId,
      justification: justification.trim(),
      authorizedBy,
      authorizationDate: new Date(),
      expirationDate,
      status: CTPAuthorizationStatus.APPROVED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    await this.prisma?.cTPAuthorization.create({
      data: {
        id: authorization.id,
        ncrId: authorization.ncrId,
        justification: authorization.justification,
        authorizedBy: authorization.authorizedBy,
        authorizationDate: authorization.authorizationDate,
        expirationDate: authorization.expirationDate,
        status: authorization.status,
        createdAt: authorization.createdAt,
        updatedAt: authorization.updatedAt,
      },
    });

    return authorization;
  }

  /**
   * Get CTP authorization for an NCR
   */
  async getCTPAuthorization(ncrId: string): Promise<CTPAuthorization | null> {
    const auth = await this.prisma?.cTPAuthorization.findUnique({
      where: { ncrId },
    });

    if (auth) {
      // Check if expired
      if (new Date() > auth.expirationDate && auth.status === CTPAuthorizationStatus.APPROVED) {
        // Update status to expired
        await this.prisma?.cTPAuthorization.update({
          where: { ncrId },
          data: { status: CTPAuthorizationStatus.EXPIRED },
        });
        return { ...auth, status: CTPAuthorizationStatus.EXPIRED };
      }
    }

    return auth || null;
  }

  /**
   * Check if CTP authorization is currently active
   */
  async isCTPActive(ncrId: string): Promise<boolean> {
    const auth = await this.getCTPAuthorization(ncrId);

    if (!auth) {
      return false;
    }

    return (
      auth.status === CTPAuthorizationStatus.APPROVED &&
      new Date() <= auth.expirationDate
    );
  }

  /**
   * Revoke a CTP authorization
   */
  async revokeCTPAuthorization(
    ncrId: string,
    revokedBy: string,
    reason?: string
  ): Promise<CTPAuthorization> {
    const auth = await this.getCTPAuthorization(ncrId);

    if (!auth) {
      throw new Error(`No CTP authorization found for NCR ${ncrId}`);
    }

    const updated = await this.prisma?.cTPAuthorization.update({
      where: { ncrId },
      data: {
        status: CTPAuthorizationStatus.REJECTED,
        updatedAt: new Date(),
      },
    });

    return updated!;
  }

  /**
   * Track CTP usage through an operation
   */
  async trackCTPUsage(
    ncrId: string,
    operationId: string,
    trackedQuantity: number
  ): Promise<CTPAuthorization> {
    const auth = await this.getCTPAuthorization(ncrId);

    if (!auth) {
      throw new Error(`No CTP authorization found for NCR ${ncrId}`);
    }

    if (!auth.authorizationDate) {
      throw new Error(`CTP authorization is invalid`);
    }

    const updatedAuth = await this.prisma?.cTPAuthorization.update({
      where: { ncrId },
      data: {
        operationId,
        trackedQuantity,
        completedQuantity: 0,
        updatedAt: new Date(),
      },
    });

    return updatedAuth!;
  }

  /**
   * Update CTP usage completion
   */
  async updateCTPCompletion(
    ncrId: string,
    completedQuantity: number
  ): Promise<CTPAuthorization> {
    const auth = await this.getCTPAuthorization(ncrId);

    if (!auth) {
      throw new Error(`No CTP authorization found for NCR ${ncrId}`);
    }

    if (auth.trackedQuantity && completedQuantity > auth.trackedQuantity) {
      throw new Error(
        `Completed quantity (${completedQuantity}) exceeds tracked quantity (${auth.trackedQuantity})`
      );
    }

    const updated = await this.prisma?.cTPAuthorization.update({
      where: { ncrId },
      data: {
        completedQuantity,
        updatedAt: new Date(),
      },
    });

    return updated!;
  }

  /**
   * Get all expired CTP authorizations
   */
  async checkExpiredCTPAuthorizations(): Promise<CTPAuthorization[]> {
    const now = new Date();

    const expired = await this.prisma?.cTPAuthorization.findMany({
      where: {
        AND: [
          { status: CTPAuthorizationStatus.APPROVED },
          { expirationDate: { lt: now } },
        ],
      },
    });

    // Mark as expired
    if (expired && expired.length > 0) {
      await this.prisma?.cTPAuthorization.updateMany({
        where: {
          id: { in: expired.map(e => e.id) },
        },
        data: {
          status: CTPAuthorizationStatus.EXPIRED,
          updatedAt: now,
        },
      });
    }

    return expired || [];
  }

  /**
   * Get CTP statistics for a site
   */
  async getCTPStats(siteId: string): Promise<{
    activeCount: number;
    expiredCount: number;
    averageDuration: number; // in days
    usageStats: Record<string, number>;
  }> {
    const authorizations = await this.prisma?.cTPAuthorization.findMany({
      // No direct siteId filter without relation
    });

    if (!authorizations || authorizations.length === 0) {
      return {
        activeCount: 0,
        expiredCount: 0,
        averageDuration: 0,
        usageStats: {},
      };
    }

    const now = new Date();
    let activeCount = 0;
    let expiredCount = 0;
    let totalDuration = 0;
    const usageStats: Record<string, number> = {};

    for (const auth of authorizations) {
      if (auth.status === CTPAuthorizationStatus.APPROVED && now <= auth.expirationDate) {
        activeCount++;
      } else if (auth.status === CTPAuthorizationStatus.EXPIRED) {
        expiredCount++;
      }

      // Calculate duration
      const duration = auth.expirationDate.getTime() - auth.authorizationDate.getTime();
      totalDuration += duration;

      // Track usage
      if (auth.operationId) {
        usageStats[auth.operationId] = (usageStats[auth.operationId] || 0) + (auth.trackedQuantity || 0);
      }
    }

    const averageDuration = totalDuration / authorizations.length / (1000 * 60 * 60 * 24); // Convert to days

    return {
      activeCount,
      expiredCount,
      averageDuration,
      usageStats,
    };
  }

  /**
   * Extend CTP authorization
   */
  async extendCTPAuthorization(
    ncrId: string,
    additionalDays: number,
    extendedBy: string
  ): Promise<CTPAuthorization> {
    const auth = await this.getCTPAuthorization(ncrId);

    if (!auth) {
      throw new Error(`No CTP authorization found for NCR ${ncrId}`);
    }

    const newExpirationDate = new Date(auth.expirationDate);
    newExpirationDate.setDate(newExpirationDate.getDate() + additionalDays);

    const updated = await this.prisma?.cTPAuthorization.update({
      where: { ncrId },
      data: {
        expirationDate: newExpirationDate,
        updatedAt: new Date(),
      },
    });

    return updated!;
  }

  /**
   * Get CTP notes
   */
  async addCTPNote(ncrId: string, note: string): Promise<CTPAuthorization> {
    const auth = await this.getCTPAuthorization(ncrId);

    if (!auth) {
      throw new Error(`No CTP authorization found for NCR ${ncrId}`);
    }

    const currentNotes = auth.notes ? `${auth.notes}\n${note}` : note;

    const updated = await this.prisma?.cTPAuthorization.update({
      where: { ncrId },
      data: {
        notes: currentNotes,
        updatedAt: new Date(),
      },
    });

    return updated!;
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
