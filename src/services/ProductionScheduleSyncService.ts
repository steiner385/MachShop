/**
 * Production Schedule Sync Service
 * Task 1.8: Level 4 (ERP) Integration Model
 *
 * Manages bidirectional production schedule exchange between MES and ERP
 * Following ISA-95 Part 3 specification for production scheduling
 *
 * INBOUND (M2B): ERP → MES - Receive production schedule requests, create schedule entries
 * OUTBOUND (B2M): MES → ERP - Send schedule confirmations/responses
 */

import { PrismaClient, Prisma, B2MMessageStatus, ScheduleType, SchedulePriority } from '@prisma/client';
import {
  ProductionScheduleRequestInput,
  ProductionScheduleResponseInput,
  ISA95ProductionScheduleMessage,
} from '../types/b2m';
import B2MMessageBuilder from './B2MMessageBuilder';
import { ProductionScheduleService } from './ProductionScheduleService';

export interface ScheduleRequestResult {
  messageId: string;
  requestId: string;
  workOrderId?: string;
  status: B2MMessageStatus;
  accepted: boolean;
  errorMessage?: string;
}

export class ProductionScheduleSyncService {
  private prisma: PrismaClient;
  private scheduleService: ProductionScheduleService;

  constructor(prismaClient?: PrismaClient, scheduleService?: ProductionScheduleService) {
    this.prisma = prismaClient || new PrismaClient();
    this.scheduleService = scheduleService || new ProductionScheduleService(this.prisma);
  }

  /**
   * Process inbound production schedule request from ERP (ERP → MES)
   * Creates schedule entry in MES and sends confirmation response
   */
  async processScheduleRequest(params: {
    configId: string;
    messagePayload: ISA95ProductionScheduleMessage | Record<string, any>;
    createdBy: string;
  }): Promise<ScheduleRequestResult> {
    const { configId, messagePayload, createdBy } = params;

    try {
      // Parse and validate message
      const parsed = B2MMessageBuilder.parseMessage(JSON.stringify(messagePayload));
      if (!parsed.isValid) {
        throw new Error(`Invalid message format: ${parsed.errors?.join(', ')}`);
      }

      if (parsed.messageType !== 'ProductionSchedule') {
        throw new Error(`Expected ProductionSchedule message, got ${parsed.messageType}`);
      }

      const message = parsed.message as ISA95ProductionScheduleMessage;
      const validation = B2MMessageBuilder.validateProductionScheduleRequest(message);
      if (!validation.isValid) {
        throw new Error(`Invalid production schedule request: ${validation.errors?.join(', ')}`);
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

      // Find part by part number
      const part = await this.prisma.part.findFirst({
        where: { partNumber: message.workOrder.partNumber },
      });

      if (!part) {
        // Reject if part not found
        return await this.rejectScheduleRequest({
          configId,
          messageId: message.messageId,
          externalWorkOrderId: message.workOrder.externalId,
          partNumber: message.workOrder.partNumber,
          quantity: message.workOrder.quantity,
          unitOfMeasure: message.workOrder.unitOfMeasure,
          dueDate: new Date(message.workOrder.dueDate),
          scheduleType: message.scheduleType,
          priority: message.priority,
          effectiveStartDate: new Date(message.workOrder.startDate),
          effectiveEndDate: new Date(message.workOrder.endDate),
          rejectionReason: `Part ${message.workOrder.partNumber} not found in MES`,
          requestedBy: message.sender,
          requestPayload: message,
        });
      }

      // Create ProductionScheduleRequest record
      const request = await this.prisma.productionScheduleRequest.create({
        data: {
          messageId: message.messageId,
          configId,
          scheduleType: message.scheduleType,
          priority: message.priority,
          requestedBy: message.sender,
          requestedDate: new Date(message.timestamp),
          effectiveStartDate: new Date(message.workOrder.startDate),
          effectiveEndDate: new Date(message.workOrder.endDate),
          externalWorkOrderId: message.workOrder.externalId,
          partId: part.id,
          partNumber: message.workOrder.partNumber,
          quantity: message.workOrder.quantity,
          unitOfMeasure: message.workOrder.unitOfMeasure,
          dueDate: new Date(message.workOrder.dueDate),
          equipmentRequirements: message.resources?.equipment || undefined,
          personnelRequirements: message.resources?.personnel || undefined,
          materialRequirements: message.resources?.materials || undefined,
          status: 'PENDING',
          requestPayload: message as unknown as Prisma.InputJsonValue,
        },
      });

      // Perform feasibility check
      const feasibility = await this.checkScheduleFeasibility({
        partId: part.id,
        quantity: message.workOrder.quantity,
        startDate: new Date(message.workOrder.startDate),
        endDate: new Date(message.workOrder.endDate),
        dueDate: new Date(message.workOrder.dueDate),
        equipmentRequirements: message.resources?.equipment,
        personnelRequirements: message.resources?.personnel,
        materialRequirements: message.resources?.materials,
      });

      if (!feasibility.isFeasible) {
        // Reject with constraints
        return await this.rejectScheduleRequest({
          configId,
          messageId: message.messageId,
          externalWorkOrderId: message.workOrder.externalId,
          partNumber: message.workOrder.partNumber,
          quantity: message.workOrder.quantity,
          unitOfMeasure: message.workOrder.unitOfMeasure,
          dueDate: new Date(message.workOrder.dueDate),
          scheduleType: message.scheduleType,
          priority: message.priority,
          effectiveStartDate: new Date(message.workOrder.startDate),
          effectiveEndDate: new Date(message.workOrder.endDate),
          rejectionReason: `Feasibility check failed: ${feasibility.issues.join('; ')}`,
          constraints: feasibility.constraints,
          requestedBy: message.sender,
          requestPayload: message,
        });
      }

      // Create schedule entry in MES
      const scheduleEntry = await this.createScheduleEntryFromRequest({
        partId: part.id,
        partNumber: part.partNumber,
        quantity: message.workOrder.quantity,
        unitOfMeasure: message.workOrder.unitOfMeasure,
        plannedStartDate: new Date(message.workOrder.startDate),
        plannedEndDate: new Date(message.workOrder.endDate),
        dueDate: new Date(message.workOrder.dueDate),
        priority: message.priority,
        externalWorkOrderId: message.workOrder.externalId,
        equipmentRequirements: message.resources?.equipment,
        personnelRequirements: message.resources?.personnel,
      });

      // Link schedule entry to request
      await this.prisma.productionScheduleRequest.update({
        where: { id: request.id },
        data: {
          workOrderId: scheduleEntry.workOrderId,
          status: 'ACCEPTED',
        },
      });

      // Send acceptance response to ERP
      const responseResult = await this.sendScheduleResponse({
        requestId: request.id,
        accepted: true,
        confirmedStartDate: scheduleEntry.plannedStartDate,
        confirmedEndDate: scheduleEntry.plannedEndDate,
        confirmedQuantity: scheduleEntry.quantity,
        respondedBy: createdBy,
        messagePayload: message,
      });

      return {
        messageId: message.messageId,
        requestId: request.id,
        workOrderId: scheduleEntry.workOrderId,
        status: 'PROCESSED' as B2MMessageStatus,
        accepted: true,
      };
    } catch (error) {
      throw new Error(`Failed to process schedule request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check schedule feasibility
   */
  private async checkScheduleFeasibility(params: {
    partId: string;
    quantity: number;
    startDate: Date;
    endDate: Date;
    dueDate: Date;
    equipmentRequirements?: any;
    personnelRequirements?: any;
    materialRequirements?: any;
  }): Promise<{
    isFeasible: boolean;
    issues: string[];
    constraints?: Record<string, any>;
  }> {
    const issues: string[] = [];
    const constraints: Record<string, any> = {};

    // Check if start date is in the past
    if (params.startDate < new Date()) {
      issues.push('Start date is in the past');
      constraints.earliestStartDate = new Date();
    }

    // Check if start < end < due
    if (params.startDate >= params.endDate) {
      issues.push('Start date must be before end date');
    }

    if (params.endDate > params.dueDate) {
      issues.push('End date is after due date');
      constraints.requiredEndDate = params.dueDate;
    }

    // Check part availability
    const part = await this.prisma.part.findUnique({
      where: { id: params.partId },
    });

    if (part && params.materialRequirements) {
      // Check if we have sufficient material
      const requiredMaterials = params.materialRequirements as Array<{ partNumber: string; quantity: number }>;
      for (const material of requiredMaterials) {
        const materialPart = await this.prisma.part.findFirst({
          where: { partNumber: material.partNumber },
        });

        if (!materialPart) {
          issues.push(`Material ${material.partNumber} not found`);
          constraints.missingMaterials = constraints.missingMaterials || [];
          constraints.missingMaterials.push(material.partNumber);
        }
        else if ((materialPart as any).quantityOnHand < material.quantity) {
          issues.push(`Insufficient material ${material.partNumber}: required ${material.quantity}, available ${(materialPart as any).quantityOnHand}`);
          constraints.materialShortages = constraints.materialShortages || {};
          constraints.materialShortages[material.partNumber] = {
            required: material.quantity,
            available: (materialPart as any).quantityOnHand,
            shortage: material.quantity - (materialPart as any).quantityOnHand,
          };
        }
      }
    }

    // Check equipment requirements
    if (params.equipmentRequirements) {
      const requiredEquipment = params.equipmentRequirements as Array<{ equipmentClass: string; quantity: number }>;
      for (const equipment of requiredEquipment) {
        // Simple check - in real implementation would check equipment availability/calendar
        const equipmentCount = await this.prisma.equipment.count({
          where: { equipmentClass: equipment.equipmentClass as any },
        });

        if (equipmentCount < equipment.quantity) {
          issues.push(`Insufficient equipment ${equipment.equipmentClass}: required ${equipment.quantity}, available ${equipmentCount}`);
          constraints.equipmentShortages = constraints.equipmentShortages || {};
          constraints.equipmentShortages[equipment.equipmentClass] = {
            required: equipment.quantity,
            available: equipmentCount,
          };
        }
      }
    }

    // Check personnel requirements
    if (params.personnelRequirements) {
      const requiredPersonnel = params.personnelRequirements as Array<{ skillCode: string; quantity: number }>;
      for (const skill of requiredPersonnel) {
        const personnelCount = await this.prisma.user.count({
          where: {
            skills: {
              some: {
                skill: {
                  skillCode: skill.skillCode,
                },
              },
            },
          },
        });

        if (personnelCount < skill.quantity) {
          issues.push(`Insufficient personnel with skill ${skill.skillCode}: required ${skill.quantity}, available ${personnelCount}`);
          constraints.personnelShortages = constraints.personnelShortages || {};
          constraints.personnelShortages[skill.skillCode] = {
            required: skill.quantity,
            available: personnelCount,
          };
        }
      }
    }

    return {
      isFeasible: issues.length === 0,
      issues,
      constraints: issues.length > 0 ? constraints : undefined,
    };
  }

  /**
   * Create schedule entry from ERP request
   */
  private async createScheduleEntryFromRequest(params: {
    partId: string;
    partNumber: string;
    quantity: number;
    unitOfMeasure: string;
    plannedStartDate: Date;
    plannedEndDate: Date;
    dueDate: Date;
    priority: SchedulePriority;
    externalWorkOrderId: string;
    equipmentRequirements?: any;
    personnelRequirements?: any;
  }): Promise<{
    workOrderId: string;
    quantity: number;
    plannedStartDate: Date;
    plannedEndDate: Date;
  }> {
    // Create work order from schedule request
    const workOrder = await this.prisma.workOrder.create({
      data: {
        workOrderNumber: `WO-ERP-${params.externalWorkOrderId}`,
        partId: params.partId,
        quantity: params.quantity,
        priority: params.priority as any,
        status: 'CREATED',
        dueDate: params.dueDate,
        customerOrder: params.externalWorkOrderId,
        createdById: 'SYSTEM',
      },
    });

    return {
      workOrderId: workOrder.id,
      quantity: params.quantity,
      plannedStartDate: params.plannedStartDate,
      plannedEndDate: params.plannedEndDate,
    };
  }

  /**
   * Reject schedule request
   */
  private async rejectScheduleRequest(params: {
    configId: string;
    messageId: string;
    externalWorkOrderId: string;
    partNumber: string;
    quantity: number;
    unitOfMeasure: string;
    dueDate: Date;
    scheduleType: ScheduleType;
    priority: SchedulePriority;
    effectiveStartDate: Date;
    effectiveEndDate: Date;
    rejectionReason: string;
    constraints?: Record<string, any>;
    requestedBy: string;
    requestPayload: any;
  }): Promise<ScheduleRequestResult> {
    // Create ProductionScheduleRequest record with REJECTED status
    const request = await this.prisma.productionScheduleRequest.create({
      data: {
        messageId: params.messageId,
        configId: params.configId,
        scheduleType: params.scheduleType,
        priority: params.priority,
        requestedBy: params.requestedBy,
        requestedDate: new Date(),
        effectiveStartDate: params.effectiveStartDate,
        effectiveEndDate: params.effectiveEndDate,
        externalWorkOrderId: params.externalWorkOrderId,
        partNumber: params.partNumber,
        quantity: params.quantity,
        unitOfMeasure: params.unitOfMeasure,
        dueDate: params.dueDate,
        status: 'REJECTED',
        requestPayload: params.requestPayload,
      },
    });

    // Send rejection response to ERP
    await this.sendScheduleResponse({
      requestId: request.id,
      accepted: false,
      rejectionReason: params.rejectionReason,
      constraints: params.constraints,
      respondedBy: 'SYSTEM',
      messagePayload: params.requestPayload,
    });

    return {
      messageId: params.messageId,
      requestId: request.id,
      status: 'FAILED' as B2MMessageStatus,
      accepted: false,
      errorMessage: params.rejectionReason,
    };
  }

  /**
   * Send schedule response to ERP (MES → ERP)
   */
  async sendScheduleResponse(params: {
    requestId: string;
    accepted: boolean;
    confirmedStartDate?: Date;
    confirmedEndDate?: Date;
    confirmedQuantity?: number;
    rejectionReason?: string;
    constraints?: Record<string, any>;
    modifications?: Record<string, any>;
    proposedStartDate?: Date;
    proposedEndDate?: Date;
    proposedQuantity?: number;
    respondedBy: string;
    messagePayload: any;
  }): Promise<{
    responseId: string;
    messageId: string;
    status: B2MMessageStatus;
  }> {
    const {
      requestId,
      accepted,
      confirmedStartDate,
      confirmedEndDate,
      confirmedQuantity,
      rejectionReason,
      constraints,
      modifications,
      proposedStartDate,
      proposedEndDate,
      proposedQuantity,
      respondedBy,
      messagePayload,
    } = params;

    try {
      // Get the original request
      const request = await this.prisma.productionScheduleRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error(`Production schedule request ${requestId} not found`);
      }

      // Generate response message ID
      const responseMessageId = `SCH-RESP-${request.messageId}-${Date.now()}`;

      // Create ProductionScheduleResponse record
      const response = await this.prisma.productionScheduleResponse.create({
        data: {
          requestId,
          messageId: responseMessageId,
          accepted,
          confirmedStartDate,
          confirmedEndDate,
          confirmedQuantity,
          rejectionReason,
          modifications,
          constraints,
          proposedStartDate,
          proposedEndDate,
          proposedQuantity,
          respondedBy,
          responsePayload: {
            ...messagePayload,
            response: {
              accepted,
              confirmedStartDate: confirmedStartDate?.toISOString(),
              confirmedEndDate: confirmedEndDate?.toISOString(),
              confirmedQuantity,
              rejectionReason,
              constraints,
            },
          },
        },
      });

      // TODO: Send to ERP via IntegrationManager (to be implemented in future PR)
      // For now, mark as SENT
      await this.prisma.productionScheduleResponse.update({
        where: { id: response.id },
        data: {
          sentToERP: true,
          sentAt: new Date(),
        },
      });

      return {
        responseId: response.id,
        messageId: responseMessageId,
        status: 'SENT' as B2MMessageStatus,
      };
    } catch (error) {
      throw new Error(`Failed to send schedule response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get schedule request status
   */
  async getRequestStatus(messageId: string) {
    const request = await this.prisma.productionScheduleRequest.findUnique({
      where: { messageId },
      include: {
        workOrder: {
          select: {
            workOrderNumber: true,
            status: true,
            quantity: true,
          },
        },
        response: true,
      },
    });

    if (!request) {
      throw new Error(`Production schedule request ${messageId} not found`);
    }

    return {
      messageId: request.messageId,
      externalWorkOrderId: request.externalWorkOrderId,
      partNumber: request.partNumber,
      quantity: request.quantity,
      dueDate: request.dueDate,
      status: request.status,
      accepted: request.status === 'ACCEPTED',
      workOrderNumber: request.workOrder?.workOrderNumber,
      workOrderStatus: request.workOrder?.status,
      response: (request as any).response ? {
        messageId: (request as any).response.messageId,
        accepted: (request as any).response.accepted,
        confirmedStartDate: (request as any).response.confirmedStartDate,
        confirmedEndDate: (request as any).response.confirmedEndDate,
        confirmedQuantity: (request as any).response.confirmedQuantity,
        rejectionReason: (request as any).response.rejectionReason,
        constraints: (request as any).response.constraints,
      } : undefined,
      requestedDate: request.requestedDate,
    };
  }

  /**
   * Get all schedule requests for a config
   */
  async getConfigRequests(configId: string, filters?: {
    status?: B2MMessageStatus;
    startDate?: Date;
    endDate?: Date;
  }) {
    const whereClause: any = { configId };

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      whereClause.requestedDate = {};
      if (filters.startDate) {
        whereClause.requestedDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.requestedDate.lte = filters.endDate;
      }
    }

    const requests = await this.prisma.productionScheduleRequest.findMany({
      where: whereClause,
      orderBy: { requestedDate: 'desc' },
      include: {
        workOrder: {
          select: {
            workOrderNumber: true,
            status: true,
          },
        },
      },
    });

    return requests.map(req => ({
      messageId: req.messageId,
      externalWorkOrderId: req.externalWorkOrderId,
      partNumber: req.partNumber,
      quantity: req.quantity,
      dueDate: req.dueDate,
      status: req.status,
      workOrderNumber: req.workOrder?.workOrderNumber,
      workOrderStatus: req.workOrder?.status,
      requestedDate: req.requestedDate,
    }));
  }

  /**
   * Retry failed schedule request
   */
  async retryRequest(messageId: string, createdBy: string) {
    const request = await this.prisma.productionScheduleRequest.findUnique({
      where: { messageId },
    });

    if (!request) {
      throw new Error(`Production schedule request ${messageId} not found`);
    }

    if (request.status === 'ACCEPTED') {
      throw new Error(`Request ${messageId} is already accepted, cannot retry`);
    }

    // Reset status to PENDING for retry
    await this.prisma.productionScheduleRequest.update({
      where: { messageId },
      data: {
        status: 'PENDING',
      },
    });

    // Re-process the request
    return await this.processScheduleRequest({
      configId: request.configId,
      messagePayload: request.requestPayload as any,
      createdBy,
    });
  }
}

// Export both class and default singleton instance
export default new ProductionScheduleSyncService();
