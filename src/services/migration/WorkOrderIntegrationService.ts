/**
 * Work Order Integration Service
 * Issue #36: Paper-Based Traveler Digitization - Phase 8
 *
 * Converts digitized travelers into work orders with operations and materials
 */

import { PrismaClient, DigitizedTraveler } from '@prisma/client';
import { logger } from '../../utils/logger';
import WorkOrderService from '../WorkOrderService';
import KitGenerationService from '../KitGenerationService';
import { DigitizedTravelerData } from './TravelerDigitizationService';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface WorkOrderCreationResult {
  success: boolean;
  travelerId: string;
  workOrderId?: string;
  workOrderNumber?: string;
  error?: string;
  warnings: string[];
}

export interface BulkConversionResult {
  submitted: number;
  completed: number;
  successful: number;
  failed: number;
  results: WorkOrderCreationResult[];
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}

export interface WorkOrderCandidate {
  id: string;
  workOrderNumber: string;
  status: string;
  partNumber: string;
  quantity: number;
  priority?: string;
  confidence: number;
  operationCount?: number;
  conversionStatus: string;
  conversionErrors: string[];
}

// ============================================================================
// Work Order Integration Service
// ============================================================================

export default class WorkOrderIntegrationService {
  private prisma: PrismaClient;
  private workOrderService: WorkOrderService;
  private kitGenerationService: KitGenerationService;

  constructor() {
    this.prisma = new PrismaClient();
    this.workOrderService = new WorkOrderService();
    this.kitGenerationService = new KitGenerationService();
  }

  /**
   * Create work order from a single approved traveler
   */
  async createWorkOrderFromTraveler(travelerId: string, userId?: string): Promise<WorkOrderCreationResult> {
    try {
      logger.info('Creating work order from traveler', { travelerId });

      // Get traveler
      const traveler = await this.prisma.digitizedTraveler.findUniqueOrThrow({
        where: { id: travelerId },
        include: { operations: true }
      });

      // Validate traveler status
      if (traveler.status !== 'approved') {
        throw new Error(`Traveler must be approved, current status: ${traveler.status}`);
      }

      if (traveler.conversionStatus === 'COMPLETED' && traveler.workOrderId) {
        return {
          success: true,
          travelerId,
          workOrderId: traveler.workOrderId,
          workOrderNumber: traveler.workOrderNumber,
          warnings: []
        };
      }

      // Update traveler conversion status to IN_PROGRESS
      await this.prisma.digitizedTraveler.update({
        where: { id: travelerId },
        data: {
          conversionStatus: 'IN_PROGRESS'
        }
      });

      const warnings: string[] = [];

      // Create work order
      const workOrder = await this.workOrderService.createWorkOrder({
        workOrderNumber: traveler.workOrderNumber,
        partNumber: traveler.partNumber,
        quantity: traveler.quantity,
        priority: (traveler.priority as any) || 'NORMAL',
        dueDate: traveler.dueDate ? new Date(traveler.dueDate) : undefined,
        notes: `Created from digitized traveler: ${traveler.sourceFileName || 'manual entry'}. Confidence: ${Math.round(traveler.confidence * 100)}%`,
        createdById: userId,
        assignedToId: userId
      });

      logger.info('Work order created', {
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.workOrderNumber,
        travelerId
      });

      // Assign operations
      try {
        await this.assignOperationsToWorkOrder(workOrder.id, traveler.id);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        warnings.push(`Failed to assign operations: ${msg}`);
        logger.warn('Failed to assign operations', { error });
      }

      // Allocate materials
      try {
        await this.allocateMaterialsForWorkOrder(workOrder.id, traveler.partNumber);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        warnings.push(`Failed to allocate materials: ${msg}`);
        logger.warn('Failed to allocate materials', { error });
      }

      // Update traveler with work order reference and COMPLETED status
      await this.prisma.digitizedTraveler.update({
        where: { id: travelerId },
        data: {
          workOrderId: workOrder.id,
          workOrderCreatedAt: new Date(),
          conversionStatus: 'COMPLETED',
          status: 'work_order_created',
          conversionErrors: []
        }
      });

      return {
        success: true,
        travelerId,
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.workOrderNumber,
        warnings
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to create work order from traveler:', error);

      // Update traveler with error status
      await this.prisma.digitizedTraveler.update({
        where: { id: travelerId },
        data: {
          conversionStatus: 'FAILED',
          conversionErrors: [errorMsg]
        }
      }).catch(err => logger.error('Failed to update traveler error status:', err));

      return {
        success: false,
        travelerId,
        error: errorMsg,
        warnings: []
      };
    }
  }

  /**
   * Assign operations from traveler to work order
   */
  private async assignOperationsToWorkOrder(workOrderId: string, travelerId: string): Promise<void> {
    try {
      const traveler = await this.prisma.digitizedTraveler.findUniqueOrThrow({
        where: { id: travelerId },
        include: { operations: true }
      });

      // Create work order operations from digitized operations
      for (const digitizedOp of traveler.operations) {
        // For now, create basic work order operations
        // In production, would link to actual routing operations
        logger.info('Assigning operation to work order', {
          workOrderId,
          operationNumber: digitizedOp.operationNumber
        });

        // TODO: Implement full operation assignment with routing
        // This would involve:
        // 1. Finding matching routing operation
        // 2. Creating WorkOrderOperation record
        // 3. Setting labor hour estimates
        // 4. Setting dependencies/sequencing
      }
    } catch (error) {
      logger.error('Failed to assign operations:', error);
      throw error;
    }
  }

  /**
   * Allocate materials for work order based on BOM
   */
  private async allocateMaterialsForWorkOrder(workOrderId: string, partNumber: string): Promise<void> {
    try {
      // Get part
      const part = await this.prisma.part.findFirst({
        where: { partNumber }
      });

      if (!part) {
        throw new Error(`Part not found: ${partNumber}`);
      }

      // Use KitGenerationService to generate material kit
      const kit = await this.kitGenerationService.generateKit(part.id, 1, true);

      logger.info('Material kit generated', {
        workOrderId,
        partId: part.id,
        materialCount: kit.materials?.length || 0,
        shortages: kit.shortages?.length || 0
      });

      // TODO: In production, would:
      // 1. Reserve materials for work order
      // 2. Generate picking list
      // 3. Update inventory availability
      // 4. Track shortages for procurement
    } catch (error) {
      logger.error('Failed to allocate materials:', error);
      throw error;
    }
  }

  /**
   * Get candidates for work order creation (approved travelers not yet converted)
   */
  async getWorkOrderCandidates(options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}): Promise<{
    candidates: WorkOrderCandidate[];
    total: number;
  }> {
    try {
      const limit = options.limit ?? 20;
      const offset = options.offset ?? 0;

      const where: any = {
        status: 'approved',
        conversionStatus: {
          not: 'COMPLETED'
        }
      };

      const [travelers, total] = await Promise.all([
        this.prisma.digitizedTraveler.findMany({
          where,
          include: { operations: { select: { id: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        this.prisma.digitizedTraveler.count({ where })
      ]);

      const candidates: WorkOrderCandidate[] = travelers.map(t => ({
        id: t.id,
        workOrderNumber: t.workOrderNumber,
        status: t.status,
        partNumber: t.partNumber,
        quantity: t.quantity,
        priority: t.priority,
        confidence: t.confidence,
        operationCount: t.operations.length,
        conversionStatus: t.conversionStatus,
        conversionErrors: t.conversionErrors
      }));

      return { candidates, total };
    } catch (error) {
      logger.error('Failed to get work order candidates:', error);
      throw error;
    }
  }

  /**
   * Bulk create work orders from multiple approved travelers
   */
  async bulkCreateWorkOrders(
    travelerIds: string[],
    userId?: string
  ): Promise<BulkConversionResult> {
    const result: BulkConversionResult = {
      submitted: travelerIds.length,
      completed: 0,
      successful: 0,
      failed: 0,
      results: [],
      startedAt: new Date()
    };

    try {
      logger.info('Starting bulk work order creation', {
        count: travelerIds.length
      });

      for (const travelerId of travelerIds) {
        try {
          const conversionResult = await this.createWorkOrderFromTraveler(travelerId, userId);
          result.results.push(conversionResult);

          if (conversionResult.success) {
            result.successful++;
          } else {
            result.failed++;
          }

          result.completed++;
        } catch (error) {
          result.failed++;
          result.completed++;
          result.results.push({
            success: false,
            travelerId,
            error: error instanceof Error ? error.message : String(error),
            warnings: []
          });
          logger.error(`Failed to convert traveler ${travelerId}:`, error);
        }
      }

      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - result.startedAt.getTime();

      logger.info('Bulk work order creation completed', {
        successful: result.successful,
        failed: result.failed,
        duration: result.duration
      });

      return result;
    } catch (error) {
      logger.error('Bulk work order creation failed:', error);
      throw error;
    }
  }

  /**
   * Get work order linked to traveler
   */
  async getTravelerWorkOrder(travelerId: string) {
    try {
      const traveler = await this.prisma.digitizedTraveler.findUniqueOrThrow({
        where: { id: travelerId }
      });

      if (!traveler.workOrderId) {
        return null;
      }

      return this.workOrderService.getWorkOrderById(traveler.workOrderId);
    } catch (error) {
      logger.error('Failed to get traveler work order:', error);
      throw error;
    }
  }

  /**
   * Sync traveler status to work order status
   */
  async syncTravelerToWorkOrder(travelerId: string): Promise<void> {
    try {
      const traveler = await this.prisma.digitizedTraveler.findUniqueOrThrow({
        where: { id: travelerId }
      });

      if (!traveler.workOrderId) {
        throw new Error('Traveler has no linked work order');
      }

      // Sync status based on traveler approval
      const workOrder = await this.workOrderService.getWorkOrderById(traveler.workOrderId);

      if (traveler.status === 'approved' && workOrder.status === 'CREATED') {
        // Auto-release work order when traveler is approved
        await this.workOrderService.releaseWorkOrder(traveler.workOrderId);

        logger.info('Work order auto-released from traveler approval', {
          workOrderId: traveler.workOrderId,
          travelerId
        });
      }

      if (traveler.status === 'rejected') {
        // Cancel work order if traveler is rejected
        logger.warn('Traveler was rejected, consider canceling work order', {
          workOrderId: traveler.workOrderId,
          travelerId
        });
      }
    } catch (error) {
      logger.error('Failed to sync traveler to work order:', error);
      throw error;
    }
  }

  /**
   * Cleanup old conversion records
   */
  async cleanupOldConversions(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.prisma.digitizedTraveler.updateMany({
        where: {
          conversionStatus: 'COMPLETED',
          workOrderCreatedAt: {
            lt: cutoffDate
          }
        },
        data: {
          conversionStatus: 'COMPLETED' // Just clean up/archive if needed
        }
      });

      logger.info('Cleaned up old conversion records', {
        count: result.count,
        cutoffDate
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup old conversions:', error);
      throw error;
    }
  }
}
