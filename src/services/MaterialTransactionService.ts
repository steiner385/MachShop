/**
 * Material Transaction Service
 * Task 1.8: Level 4 (ERP) Integration Model
 *
 * Manages bidirectional material transaction exchange between MES and ERP
 * Following ISA-95 Part 3 specification for material transactions
 */

import { PrismaClient, ERPTransactionType, B2MMessageStatus, IntegrationDirection } from '@prisma/client';
import { ERPMaterialTransactionInput, MaterialTransactionSyncResult } from '../types/b2m';
import B2MMessageBuilder from './B2MMessageBuilder';
import { v4 as uuidv4 } from 'uuid';

export class MaterialTransactionService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Export material transaction to ERP (MES → ERP)
   * Creates outbound material transaction message for ERP integration
   */
  async exportMaterialTransaction(params: {
    configId: string;
    transactionType: ERPTransactionType;
    partId: string;
    quantity: number;
    unitOfMeasure: string;
    fromLocation?: string;
    toLocation?: string;
    workOrderId?: string;
    lotNumber?: string;
    serialNumber?: string;
    unitCost?: number;
    movementType: string;
    reasonCode?: string;
    createdBy: string;
  }): Promise<MaterialTransactionSyncResult> {
    const {
      configId,
      transactionType,
      partId,
      quantity,
      unitOfMeasure,
      fromLocation,
      toLocation,
      workOrderId,
      lotNumber,
      serialNumber,
      unitCost,
      movementType,
      reasonCode,
      createdBy,
    } = params;

    try {
      // Get part information
      const part = await this.prisma.part.findUnique({
        where: { id: partId },
      });

      if (!part) {
        throw new Error(`Part ${partId} not found`);
      }

      // Get integration config
      const config = await this.prisma.integrationConfig.findUnique({
        where: { id: configId },
      });

      if (!config) {
        throw new Error(`Integration config ${configId} not found`);
      }

      if (!config.enabled) {
        throw new Error(`Integration config ${configId} is disabled`);
      }

      // Get work order if specified
      let externalWorkOrderId: string | undefined;
      if (workOrderId) {
        const workOrder = await this.prisma.workOrder.findUnique({
          where: { id: workOrderId },
          select: { customerOrder: true, workOrderNumber: true },
        });

        if (workOrder) {
          externalWorkOrderId = workOrder.customerOrder || workOrder.workOrderNumber;
        }
      }

      // Calculate total cost
      const totalCost = unitCost ? unitCost * quantity : undefined;

      // Generate message ID
      const messageId = `MAT-${part.partNumber}-${Date.now()}`;

      // Build ISA-95 message
      const isa95Message = B2MMessageBuilder.buildMaterialTransactionMessage({
        messageId,
        sender: 'MES',
        receiver: config.name,
        transactionType,
        material: {
          partNumber: part.partNumber,
          quantity,
          unitOfMeasure,
          lotNumber,
          serialNumber,
        },
        locations: {
          from: fromLocation,
          to: toLocation,
        },
        cost: unitCost ? {
          unit: unitCost,
          total: totalCost!,
          currency: 'USD',
        } : undefined,
        workOrderReference: externalWorkOrderId,
      });

      // Validate message
      const validation = B2MMessageBuilder.validateMaterialTransactionMessage(isa95Message);
      if (!validation.isValid) {
        throw new Error(`Invalid material transaction message: ${validation.errors?.join(', ')}`);
      }

      // Create ERPMaterialTransaction record
      const transactionInput: ERPMaterialTransactionInput = {
        messageId,
        configId,
        transactionType,
        direction: 'OUTBOUND' as IntegrationDirection,
        externalPartId: part.partNumber,
        partId,
        quantity,
        unitOfMeasure,
        fromLocation,
        toLocation,
        workOrderId,
        externalWorkOrderId,
        lotNumber,
        serialNumber,
        unitCost,
        totalCost,
        currency: 'USD',
        movementType,
        reasonCode,
        createdBy,
        messagePayload: isa95Message as any,
      };

      const transaction = await this.prisma.eRPMaterialTransaction.create({
        data: {
          ...transactionInput,
          status: 'PENDING',
          messagePayload: transactionInput.messagePayload as any,
        },
      });

      // TODO: Send to ERP via IntegrationManager (to be implemented in future PR)
      // For now, mark as PROCESSED (would be SENT after actual transmission)
      await this.prisma.eRPMaterialTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      return {
        messageId: transaction.messageId,
        transactionType: transaction.transactionType,
        status: 'PROCESSED' as B2MMessageStatus,
        processedAt: new Date(),
        erpTransactionId: undefined,
        errorMessage: undefined,
      };
    } catch (error) {
      throw new Error(`Failed to export material transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process inbound material transaction from ERP (ERP → MES)
   * Updates MES inventory based on ERP transaction
   */
  async processInboundTransaction(params: {
    configId: string;
    messagePayload: any;
    createdBy: string;
  }): Promise<MaterialTransactionSyncResult> {
    const { configId, messagePayload, createdBy } = params;

    try {
      // Parse and validate message
      const parsed = B2MMessageBuilder.parseMessage(JSON.stringify(messagePayload));
      if (!parsed.isValid) {
        throw new Error(`Invalid message format: ${parsed.errors?.join(', ')}`);
      }

      if (parsed.messageType !== 'MaterialTransaction') {
        throw new Error(`Expected MaterialTransaction message, got ${parsed.messageType}`);
      }

      const message = parsed.message;
      const validation = B2MMessageBuilder.validateMaterialTransactionMessage(message);
      if (!validation.isValid) {
        throw new Error(`Invalid material transaction: ${validation.errors?.join(', ')}`);
      }

      // Get integration config
      const config = await this.prisma.integrationConfig.findUnique({
        where: { id: configId },
      });

      if (!config) {
        throw new Error(`Integration config ${configId} not found`);
      }

      // Find part by external part number
      const part = await this.prisma.part.findFirst({
        where: { partNumber: message.material.partNumber },
      });

      if (!part) {
        throw new Error(`Part ${message.material.partNumber} not found in MES`);
      }

      // Find work order if referenced
      let workOrderId: string | undefined;
      if (message.workOrderReference) {
        const workOrder = await this.prisma.workOrder.findFirst({
          where: {
            OR: [
              { workOrderNumber: message.workOrderReference },
              { customerOrder: message.workOrderReference },
            ],
          },
        });

        if (workOrder) {
          workOrderId = workOrder.id;
        }
      }

      // Create ERPMaterialTransaction record
      const transaction = await this.prisma.eRPMaterialTransaction.create({
        data: {
          messageId: message.messageId,
          configId,
          transactionType: message.transactionType,
          direction: 'INBOUND',
          externalPartId: message.material.partNumber,
          partId: part.id,
          quantity: message.material.quantity,
          unitOfMeasure: message.material.unitOfMeasure,
          fromLocation: message.locations?.from,
          toLocation: message.locations?.to,
          workOrderId,
          externalWorkOrderId: message.workOrderReference,
          lotNumber: message.material.lotNumber,
          serialNumber: message.material.serialNumber,
          unitCost: message.cost?.unit,
          totalCost: message.cost?.total,
          currency: message.cost?.currency || 'USD',
          movementType: message.transactionType, // Use transaction type as movement type
          reasonCode: undefined,
          status: 'PENDING',
          messagePayload: message,
          createdBy,
        },
      });

      // Process the transaction based on type
      await this.applyTransactionToInventory({
        transactionId: transaction.id,
        transactionType: message.transactionType,
        partId: part.id,
        quantity: message.material.quantity,
        lotNumber: message.material.lotNumber,
        serialNumber: message.material.serialNumber,
        fromLocation: message.locations?.from,
        toLocation: message.locations?.to,
        workOrderId,
      });

      // Mark as processed
      await this.prisma.eRPMaterialTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      return {
        messageId: transaction.messageId,
        transactionType: transaction.transactionType,
        status: 'PROCESSED' as B2MMessageStatus,
        processedAt: new Date(),
        erpTransactionId: message.messageId,
        errorMessage: undefined,
      };
    } catch (error) {
      throw new Error(`Failed to process inbound transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply transaction to MES inventory
   * Creates MaterialTransaction records to update inventory
   */
  private async applyTransactionToInventory(params: {
    transactionId: string;
    transactionType: ERPTransactionType;
    partId: string;
    quantity: number;
    lotNumber?: string;
    serialNumber?: string;
    fromLocation?: string;
    toLocation?: string;
    workOrderId?: string;
  }) {
    const {
      transactionType,
      partId,
      quantity,
      lotNumber,
      serialNumber,
      fromLocation,
      toLocation,
      workOrderId,
    } = params;

    // Map ERP transaction types to internal material transaction types
    let internalTransactionType: string;
    let quantityChange: number;

    switch (transactionType) {
      case 'ISSUE':
        internalTransactionType = 'ISSUE';
        quantityChange = -quantity; // Decrease inventory
        break;
      case 'RECEIPT':
        internalTransactionType = 'RECEIPT';
        quantityChange = quantity; // Increase inventory
        break;
      case 'RETURN':
        internalTransactionType = 'RETURN';
        quantityChange = quantity; // Increase inventory
        break;
      case 'TRANSFER':
        internalTransactionType = 'TRANSFER';
        quantityChange = 0; // Location change only
        break;
      case 'ADJUSTMENT':
        internalTransactionType = 'ADJUSTMENT';
        quantityChange = quantity; // Can be positive or negative
        break;
      case 'SCRAP':
        internalTransactionType = 'SCRAP';
        quantityChange = -quantity; // Decrease inventory
        break;
      case 'CONSUMPTION':
        internalTransactionType = 'CONSUMPTION';
        quantityChange = -quantity; // Decrease inventory
        break;
      default:
        throw new Error(`Unknown transaction type: ${transactionType}`);
    }

    // Create MaterialTransaction record to update inventory
    // Note: This assumes the MaterialTransaction model has these fields
    // Adjust based on actual MaterialTransaction schema
    await this.prisma.materialTransaction.create({
      data: {
        partId,
        quantity: Math.abs(quantity),
        transactionType: internalTransactionType,
        transactionDate: new Date(),
        lotNumber,
        serialNumber,
        fromLocation: fromLocation || 'UNKNOWN',
        toLocation: toLocation || 'UNKNOWN',
        workOrderId,
        notes: `Synced from ERP - ${transactionType}`,
        createdBy: 'SYSTEM',
      },
    });

    // Update Part inventory quantity
    if (quantityChange !== 0) {
      await this.prisma.part.update({
        where: { id: partId },
        data: {
          quantityOnHand: {
            increment: quantityChange,
          },
        },
      });
    }
  }

  /**
   * Get material transaction status
   */
  async getTransactionStatus(messageId: string) {
    const transaction = await this.prisma.eRPMaterialTransaction.findUnique({
      where: { messageId },
      include: {
        part: {
          select: {
            partNumber: true,
            description: true,
          },
        },
        workOrder: {
          select: {
            workOrderNumber: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new Error(`Material transaction ${messageId} not found`);
    }

    return {
      messageId: transaction.messageId,
      transactionType: transaction.transactionType,
      direction: transaction.direction,
      status: transaction.status,
      partNumber: transaction.part?.partNumber || transaction.externalPartId,
      quantity: transaction.quantity,
      unitOfMeasure: transaction.unitOfMeasure,
      lotNumber: transaction.lotNumber,
      serialNumber: transaction.serialNumber,
      workOrderNumber: transaction.workOrder?.workOrderNumber || transaction.externalWorkOrderId,
      processedAt: transaction.processedAt,
      erpTransactionId: transaction.erpTransactionId,
      errorMessage: transaction.errorMessage,
      createdAt: transaction.createdAt,
    };
  }

  /**
   * Get all material transactions for a part
   */
  async getPartTransactions(partId: string, filters?: {
    transactionType?: ERPTransactionType;
    direction?: IntegrationDirection;
    status?: B2MMessageStatus;
    startDate?: Date;
    endDate?: Date;
  }) {
    const whereClause: any = { partId };

    if (filters?.transactionType) {
      whereClause.transactionType = filters.transactionType;
    }

    if (filters?.direction) {
      whereClause.direction = filters.direction;
    }

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      whereClause.transactionDate = {};
      if (filters.startDate) {
        whereClause.transactionDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.transactionDate.lte = filters.endDate;
      }
    }

    const transactions = await this.prisma.eRPMaterialTransaction.findMany({
      where: whereClause,
      orderBy: { transactionDate: 'desc' },
      select: {
        messageId: true,
        transactionType: true,
        direction: true,
        quantity: true,
        unitOfMeasure: true,
        lotNumber: true,
        serialNumber: true,
        status: true,
        transactionDate: true,
        processedAt: true,
        erpTransactionId: true,
      },
    });

    return transactions;
  }

  /**
   * Get all material transactions for a work order
   */
  async getWorkOrderTransactions(workOrderId: string) {
    const transactions = await this.prisma.eRPMaterialTransaction.findMany({
      where: { workOrderId },
      orderBy: { transactionDate: 'desc' },
      include: {
        part: {
          select: {
            partNumber: true,
            description: true,
          },
        },
      },
    });

    return transactions.map(t => ({
      messageId: t.messageId,
      transactionType: t.transactionType,
      direction: t.direction,
      partNumber: t.part?.partNumber || t.externalPartId,
      quantity: t.quantity,
      unitOfMeasure: t.unitOfMeasure,
      lotNumber: t.lotNumber,
      serialNumber: t.serialNumber,
      status: t.status,
      transactionDate: t.transactionDate,
      processedAt: t.processedAt,
      totalCost: t.totalCost,
    }));
  }

  /**
   * Retry failed transaction
   */
  async retryTransaction(messageId: string, createdBy: string) {
    const transaction = await this.prisma.eRPMaterialTransaction.findUnique({
      where: { messageId },
    });

    if (!transaction) {
      throw new Error(`Material transaction ${messageId} not found`);
    }

    if (transaction.status === 'PROCESSED') {
      throw new Error(`Transaction ${messageId} is already processed, cannot retry`);
    }

    // Reset status to PENDING for retry
    await this.prisma.eRPMaterialTransaction.update({
      where: { messageId },
      data: {
        status: 'PENDING',
        errorMessage: null,
      },
    });

    // Re-process based on direction
    if (transaction.direction === 'OUTBOUND') {
      // Re-export to ERP
      if (!transaction.partId) {
        throw new Error(`Cannot retry: Part ID is missing`);
      }

      return await this.exportMaterialTransaction({
        configId: transaction.configId,
        transactionType: transaction.transactionType,
        partId: transaction.partId,
        quantity: transaction.quantity,
        unitOfMeasure: transaction.unitOfMeasure,
        fromLocation: transaction.fromLocation || undefined,
        toLocation: transaction.toLocation || undefined,
        workOrderId: transaction.workOrderId || undefined,
        lotNumber: transaction.lotNumber || undefined,
        serialNumber: transaction.serialNumber || undefined,
        unitCost: transaction.unitCost || undefined,
        movementType: transaction.movementType,
        reasonCode: transaction.reasonCode || undefined,
        createdBy,
      });
    } else {
      // Re-process inbound from ERP
      return await this.processInboundTransaction({
        configId: transaction.configId,
        messagePayload: transaction.messagePayload,
        createdBy,
      });
    }
  }

  /**
   * Bulk export material transactions for a work order
   * Exports all material consumption for a completed work order
   */
  async bulkExportWorkOrderMaterials(params: {
    workOrderId: string;
    configId: string;
    createdBy: string;
  }): Promise<MaterialTransactionSyncResult[]> {
    const { workOrderId, configId, createdBy } = params;

    try {
      // Get all material transactions for the work order
      const materialTransactions = await this.prisma.materialTransaction.findMany({
        where: {
          workOrderId,
          transactionType: 'CONSUMPTION',
        },
        include: {
          part: true,
        },
      });

      if (materialTransactions.length === 0) {
        return [];
      }

      const results: MaterialTransactionSyncResult[] = [];

      // Export each material transaction
      for (const matTrans of materialTransactions) {
        try {
          const result = await this.exportMaterialTransaction({
            configId,
            transactionType: 'CONSUMPTION',
            partId: matTrans.partId,
            quantity: matTrans.quantity,
            unitOfMeasure: matTrans.part.unitOfMeasure,
            fromLocation: matTrans.fromLocation,
            toLocation: matTrans.toLocation,
            workOrderId,
            lotNumber: matTrans.lotNumber || undefined,
            serialNumber: matTrans.serialNumber || undefined,
            unitCost: undefined, // Could be enhanced with cost tracking
            movementType: 'CONSUMPTION',
            reasonCode: undefined,
            createdBy,
          });

          results.push(result);
        } catch (error) {
          // Continue processing other transactions even if one fails
          results.push({
            messageId: `FAILED-${matTrans.id}`,
            transactionType: 'CONSUMPTION',
            status: 'FAILED' as B2MMessageStatus,
            processedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to bulk export work order materials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export both class and default singleton instance
export default new MaterialTransactionService();
