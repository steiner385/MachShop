/**
 * OSP (Outside Processing/Farmout) Service
 * Issue #59: Core OSP/Farmout Operations Management System
 *
 * Manages the complete lifecycle of manufacturing operations sent to external suppliers
 * Relies on ERP system for actual procurement/sourcing/costing functions
 */

import { PrismaClient, OSPOperation, OSPOperationStatus, OSPShipment, OSPCapability } from '@prisma/client';
import { logger } from '../utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CreateOSPOperationRequest {
  workOrderId?: string;
  operationId: string;
  vendorId: string;
  capabilityId?: string;
  quantitySent: number;
  requestedReturnDate: Date;
  expectedReturnDate?: Date;
  inspectionRequired?: boolean;
  certificationRequired?: boolean;
  notes?: string;
}

export interface UpdateOSPOperationRequest {
  quantityReceived?: number;
  quantityAccepted?: number;
  quantityRejected?: number;
  status?: OSPOperationStatus;
  actualReturnDate?: Date;
  inspectionStatus?: string;
  inspectionNotes?: string;
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
}

export interface OSPOperationResponse {
  id: string;
  ospNumber: string;
  workOrderId?: string;
  operationId: string;
  vendorId: string;
  quantitySent: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  status: OSPOperationStatus;
  requestedReturnDate: Date;
  expectedReturnDate?: Date;
  actualReturnDate?: Date;
  inspectionRequired: boolean;
  inspectionStatus?: string;
  estimatedCost?: number;
  actualCost?: number;
  costVariance?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OSPOperationCandidate {
  operationId: string;
  operationName: string;
  vendorId: string;
  vendorName: string;
  capabilityAvailable: boolean;
  leadDays: number;
  certificationRequired: boolean;
}

// ============================================================================
// OSP Service
// ============================================================================

export default class OSPService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new OSP operation
   */
  async createOSPOperation(request: CreateOSPOperationRequest): Promise<OSPOperationResponse> {
    try {
      logger.info('Creating OSP operation', {
        operationId: request.operationId,
        vendorId: request.vendorId,
        quantitySent: request.quantitySent
      });

      // Validate operation exists and is OSP-capable
      const operation = await this.prisma.operation.findUniqueOrThrow({
        where: { id: request.operationId }
      });

      if (!operation.isOSPCapable) {
        throw new Error(`Operation ${operation.operationCode} is not marked as OSP-capable`);
      }

      // Validate vendor exists
      const vendor = await this.prisma.vendor.findUniqueOrThrow({
        where: { id: request.vendorId }
      });

      // Validate capability if provided
      if (request.capabilityId) {
        await this.prisma.ospCapability.findUniqueOrThrow({
          where: { id: request.capabilityId }
        });
      }

      // Generate unique OSP number
      const ospNumber = await this.generateOSPNumber();

      // Create OSP operation
      const ospOperation = await this.prisma.ospOperation.create({
        data: {
          ospNumber,
          workOrderId: request.workOrderId,
          operationId: request.operationId,
          vendorId: request.vendorId,
          capabilityId: request.capabilityId,
          quantitySent: request.quantitySent,
          requestedReturnDate: request.requestedReturnDate,
          expectedReturnDate: request.expectedReturnDate,
          inspectionRequired: request.inspectionRequired ?? true,
          certificationRequired: request.certificationRequired ?? false,
          status: 'PENDING_SHIPMENT' as OSPOperationStatus,
          notes: request.notes
        }
      });

      logger.info('OSP operation created', {
        ospId: ospOperation.id,
        ospNumber: ospOperation.ospNumber,
        vendorId: vendor.code
      });

      return this.mapToResponse(ospOperation);
    } catch (error) {
      logger.error('Failed to create OSP operation:', error);
      throw error;
    }
  }

  /**
   * Update an existing OSP operation
   */
  async updateOSPOperation(ospId: string, request: UpdateOSPOperationRequest): Promise<OSPOperationResponse> {
    try {
      logger.info('Updating OSP operation', { ospId });

      const ospOperation = await this.prisma.ospOperation.update({
        where: { id: ospId },
        data: {
          quantityReceived: request.quantityReceived,
          quantityAccepted: request.quantityAccepted,
          quantityRejected: request.quantityRejected,
          status: request.status,
          actualReturnDate: request.actualReturnDate,
          inspectionStatus: request.inspectionStatus,
          inspectionNotes: request.inspectionNotes,
          estimatedCost: request.estimatedCost,
          actualCost: request.actualCost,
          notes: request.notes
        }
      });

      // Calculate cost variance if both costs are available
      if (ospOperation.estimatedCost && ospOperation.actualCost) {
        ospOperation.costVariance = ospOperation.actualCost - ospOperation.estimatedCost;
      }

      logger.info('OSP operation updated', { ospId, newStatus: request.status });

      return this.mapToResponse(ospOperation);
    } catch (error) {
      logger.error('Failed to update OSP operation:', error);
      throw error;
    }
  }

  /**
   * Get OSP operation by ID
   */
  async getOSPOperation(ospId: string): Promise<OSPOperationResponse> {
    try {
      const ospOperation = await this.prisma.ospOperation.findUniqueOrThrow({
        where: { id: ospId }
      });

      return this.mapToResponse(ospOperation);
    } catch (error) {
      logger.error('Failed to get OSP operation:', error);
      throw error;
    }
  }

  /**
   * Get OSP operations for a work order
   */
  async getWorkOrderOSPOperations(workOrderId: string): Promise<OSPOperationResponse[]> {
    try {
      const ospOperations = await this.prisma.ospOperation.findMany({
        where: { workOrderId },
        orderBy: { createdAt: 'desc' }
      });

      return ospOperations.map(op => this.mapToResponse(op));
    } catch (error) {
      logger.error('Failed to get work order OSP operations:', error);
      throw error;
    }
  }

  /**
   * Get OSP operations for a supplier
   */
  async getSupplierOSPOperations(vendorId: string, status?: OSPOperationStatus): Promise<OSPOperationResponse[]> {
    try {
      const where: any = { vendorId };
      if (status) {
        where.status = status;
      }

      const ospOperations = await this.prisma.ospOperation.findMany({
        where,
        orderBy: { requestedReturnDate: 'asc' }
      });

      return ospOperations.map(op => this.mapToResponse(op));
    } catch (error) {
      logger.error('Failed to get supplier OSP operations:', error);
      throw error;
    }
  }

  /**
   * Get OSP operations by status
   */
  async getOSPOperationsByStatus(status: OSPOperationStatus, limit: number = 50): Promise<OSPOperationResponse[]> {
    try {
      const ospOperations = await this.prisma.ospOperation.findMany({
        where: { status },
        orderBy: { requestedReturnDate: 'asc' },
        take: limit
      });

      return ospOperations.map(op => this.mapToResponse(op));
    } catch (error) {
      logger.error('Failed to get OSP operations by status:', error);
      throw error;
    }
  }

  /**
   * Transition OSP operation to next status
   */
  async transitionStatus(ospId: string, newStatus: OSPOperationStatus): Promise<OSPOperationResponse> {
    try {
      logger.info('Transitioning OSP operation status', { ospId, newStatus });

      const ospOperation = await this.prisma.ospOperation.findUniqueOrThrow({
        where: { id: ospId }
      });

      // Validate status transition
      const validTransitions: Record<OSPOperationStatus, OSPOperationStatus[]> = {
        PENDING_SHIPMENT: ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['AT_SUPPLIER', 'CANCELLED'],
        AT_SUPPLIER: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['INSPECTION', 'CANCELLED'],
        INSPECTION: ['RECEIVED', 'REJECTED', 'CANCELLED'],
        RECEIVED: ['ACCEPTED', 'REJECTED'],
        ACCEPTED: [],
        REJECTED: ['PENDING_SHIPMENT', 'CANCELLED'],
        CANCELLED: []
      };

      if (!validTransitions[ospOperation.status].includes(newStatus)) {
        throw new Error(
          `Invalid status transition from ${ospOperation.status} to ${newStatus}`
        );
      }

      return this.updateOSPOperation(ospId, { status: newStatus });
    } catch (error) {
      logger.error('Failed to transition OSP operation status:', error);
      throw error;
    }
  }

  /**
   * Get OSP candidates - operations that can be sent to suppliers
   */
  async getOSPCandidates(): Promise<OSPOperationCandidate[]> {
    try {
      const operations = await this.prisma.operation.findMany({
        where: { isOSPCapable: true, isActive: true },
        include: {
          site: true
        }
      });

      const candidates: OSPOperationCandidate[] = [];

      for (const operation of operations) {
        // Get vendors with this capability
        const capabilities = await this.prisma.ospCapability.findMany({
          where: { operationId: operation.id, isActive: true },
          include: { vendor: true }
        });

        for (const cap of capabilities) {
          candidates.push({
            operationId: operation.id,
            operationName: operation.operationName,
            vendorId: cap.vendor.id,
            vendorName: cap.vendor.name,
            capabilityAvailable: true,
            leadDays: cap.standardLeadDays,
            certificationRequired: cap.certifications.length > 0
          });
        }
      }

      return candidates;
    } catch (error) {
      logger.error('Failed to get OSP candidates:', error);
      throw error;
    }
  }

  /**
   * Cancel an OSP operation
   */
  async cancelOSPOperation(ospId: string, reason?: string): Promise<OSPOperationResponse> {
    try {
      logger.info('Cancelling OSP operation', { ospId, reason });

      const ospOperation = await this.prisma.ospOperation.findUniqueOrThrow({
        where: { id: ospId }
      });

      if (ospOperation.status === 'ACCEPTED' || ospOperation.status === 'CANCELLED') {
        throw new Error(`Cannot cancel OSP operation with status ${ospOperation.status}`);
      }

      const notes = reason ? `${ospOperation.notes || ''}\nCancelled: ${reason}` : ospOperation.notes;

      return this.updateOSPOperation(ospId, {
        status: 'CANCELLED' as OSPOperationStatus,
        notes
      });
    } catch (error) {
      logger.error('Failed to cancel OSP operation:', error);
      throw error;
    }
  }

  /**
   * Close/complete an accepted OSP operation
   */
  async completeOSPOperation(ospId: string): Promise<OSPOperationResponse> {
    try {
      logger.info('Completing OSP operation', { ospId });

      const ospOperation = await this.prisma.ospOperation.findUniqueOrThrow({
        where: { id: ospId }
      });

      if (ospOperation.status !== 'ACCEPTED') {
        throw new Error(`OSP operation must be ACCEPTED to complete, current status: ${ospOperation.status}`);
      }

      return this.mapToResponse(ospOperation);
    } catch (error) {
      logger.error('Failed to complete OSP operation:', error);
      throw error;
    }
  }

  /**
   * Generate unique OSP number
   */
  private async generateOSPNumber(): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const latestOSP = await this.prisma.ospOperation.findFirst({
        where: {
          ospNumber: {
            startsWith: `OSP-${year}`
          }
        },
        orderBy: {
          ospNumber: 'desc'
        }
      });

      let sequence = 1;
      if (latestOSP) {
        const lastSequence = parseInt(latestOSP.ospNumber.split('-')[2] || '0', 10);
        sequence = lastSequence + 1;
      }

      return `OSP-${year}-${String(sequence).padStart(5, '0')}`;
    } catch (error) {
      logger.error('Failed to generate OSP number:', error);
      throw error;
    }
  }

  /**
   * Map database model to response DTO
   */
  private mapToResponse(ospOperation: any): OSPOperationResponse {
    return {
      id: ospOperation.id,
      ospNumber: ospOperation.ospNumber,
      workOrderId: ospOperation.workOrderId,
      operationId: ospOperation.operationId,
      vendorId: ospOperation.vendorId,
      quantitySent: ospOperation.quantitySent,
      quantityReceived: ospOperation.quantityReceived,
      quantityAccepted: ospOperation.quantityAccepted,
      quantityRejected: ospOperation.quantityRejected,
      status: ospOperation.status,
      requestedReturnDate: ospOperation.requestedReturnDate,
      expectedReturnDate: ospOperation.expectedReturnDate,
      actualReturnDate: ospOperation.actualReturnDate,
      inspectionRequired: ospOperation.inspectionRequired,
      inspectionStatus: ospOperation.inspectionStatus,
      estimatedCost: ospOperation.estimatedCost,
      actualCost: ospOperation.actualCost,
      costVariance: ospOperation.costVariance,
      notes: ospOperation.notes,
      createdAt: ospOperation.createdAt,
      updatedAt: ospOperation.updatedAt
    };
  }
}
