import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  BuildRecord,
  BuildRecordOperation,
  BuildDeviation,
  BuildRecordStatus,
  FinalDisposition,
  OperationStatus,
  DeviationType,
  DeviationSeverity,
  DeviationStatus,
  DeviationDisposition,
  BuildRecordPhoto,
  PhotoType
} from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const CreateBuildRecordSchema = z.object({
  workOrderId: z.string().cuid(),
  serializedPartId: z.string().cuid().optional(),
  engineModel: z.string().min(1),
  serialNumber: z.string().min(1),
  customerName: z.string().optional(),
  contractNumber: z.string().optional(),
  buildStartDate: z.date(),
  targetCompletionDate: z.date().optional(),
  assignedToId: z.string().cuid().optional(),
  notes: z.string().optional(),
  complianceNotes: z.string().optional(),
});

export const UpdateBuildRecordSchema = z.object({
  status: z.nativeEnum(BuildRecordStatus).optional(),
  buildEndDate: z.date().optional(),
  actualCompletionDate: z.date().optional(),
  finalDisposition: z.nativeEnum(FinalDisposition).optional(),
  hasDeviations: z.boolean().optional(),
  qualityApproved: z.boolean().optional(),
  engineeringApproved: z.boolean().optional(),
  customerApproved: z.boolean().optional(),
  notes: z.string().optional(),
  complianceNotes: z.string().optional(),
});

export const CreateBuildRecordOperationSchema = z.object({
  buildRecordId: z.string().cuid(),
  workOrderOperationId: z.string().cuid().optional(),
  operationNumber: z.string().min(1),
  operationName: z.string().min(1),
  routingStepId: z.string().cuid().optional(),
  plannedStartDate: z.date().optional(),
  plannedEndDate: z.date().optional(),
  plannedDuration: z.number().int().positive().optional(),
  quantityPlanned: z.number().int().positive(),
  operatorId: z.string().cuid().optional(),
  inspectorId: z.string().cuid().optional(),
  workCenterId: z.string().cuid().optional(),
  equipmentUsed: z.string().optional(),
  qualityCheckRequired: z.boolean().default(false),
  workInstructions: z.string().optional(),
  specialInstructions: z.string().optional(),
});

export const CreateBuildDeviationSchema = z.object({
  buildRecordId: z.string().cuid(),
  operationId: z.string().cuid().optional(),
  ncrId: z.string().cuid().optional(),
  deviationType: z.nativeEnum(DeviationType),
  title: z.string().min(1),
  description: z.string().min(1),
  detectedBy: z.string().cuid(),
  partNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  operationNumber: z.string().optional(),
  asDesigned: z.string().optional(),
  asBuilt: z.string().optional(),
  variance: z.string().optional(),
  severity: z.nativeEnum(DeviationSeverity),
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CreateBuildRecordRequest = z.infer<typeof CreateBuildRecordSchema>;
export type UpdateBuildRecordRequest = z.infer<typeof UpdateBuildRecordSchema>;
export type CreateBuildRecordOperationRequest = z.infer<typeof CreateBuildRecordOperationSchema>;
export type CreateBuildDeviationRequest = z.infer<typeof CreateBuildDeviationSchema>;

export interface BuildRecordWithDetails extends BuildRecord {
  operations: BuildRecordOperation[];
  deviations: BuildDeviation[];
  photos: BuildRecordPhoto[];
  workOrder: {
    workOrderNumber: string;
    part: {
      partNumber: string;
      description: string;
    };
  };
  serializedPart?: {
    serialNumber: string;
    status: string;
  } | null;
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedTo?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface OperationSignOffRequest {
  operationId: string;
  userId: string;
  signatureType: 'OPERATOR' | 'INSPECTOR' | 'ENGINEER';
  signatureData: any;
  notes?: string;
}

export interface BuildRecordSummary {
  totalBuildRecords: number;
  activeBuildRecords: number;
  completedBuildRecords: number;
  buildRecordsWithDeviations: number;
  averageBuildTime: number; // in days
  complianceRate: number; // percentage
}

// ============================================================================
// BUILD RECORD SERVICE
// ============================================================================

export class BuildRecordService {

  /**
   * Create a new build record from a work order
   */
  static async createBuildRecord(
    data: CreateBuildRecordRequest,
    createdById: string
  ): Promise<BuildRecord> {
    // Validate input
    const validatedData = CreateBuildRecordSchema.parse(data);

    // Check if work order exists and doesn't already have a build record
    const existingWorkOrder = await prisma.workOrder.findUnique({
      where: { id: validatedData.workOrderId },
      include: { buildRecord: true }
    });

    if (!existingWorkOrder) {
      throw new Error('Work order not found');
    }

    if (existingWorkOrder.buildRecord) {
      throw new Error('Build record already exists for this work order');
    }

    // Generate build record number
    const buildRecordNumber = await this.generateBuildRecordNumber(validatedData.engineModel);

    // Create build record
    const buildRecord = await prisma.buildRecord.create({
      data: {
        buildRecordNumber,
        workOrderId: validatedData.workOrderId,
        serializedPartId: validatedData.serializedPartId,
        engineModel: validatedData.engineModel,
        serialNumber: validatedData.serialNumber,
        customerName: validatedData.customerName,
        contractNumber: validatedData.contractNumber,
        buildStartDate: validatedData.buildStartDate,
        targetCompletionDate: validatedData.targetCompletionDate,
        status: BuildRecordStatus.DRAFT,
        isCompliant: true,
        hasDeviations: false,
        buildBookGenerated: false,
        qualityApprovalRequired: true,
        qualityApproved: false,
        engineeringApprovalRequired: false,
        engineeringApproved: false,
        customerApprovalRequired: false,
        customerApproved: false,
        createdById,
        assignedToId: validatedData.assignedToId,
        notes: validatedData.notes,
        complianceNotes: validatedData.complianceNotes,
      },
    });

    // Create initial status history
    await prisma.buildRecordStatusHistory.create({
      data: {
        buildRecordId: buildRecord.id,
        newStatus: BuildRecordStatus.DRAFT,
        changedBy: createdById,
        reason: 'Build record created',
        automaticChange: true,
      },
    });

    // Auto-generate operations from work order operations
    await this.autoGenerateOperationsFromWorkOrder(buildRecord.id, validatedData.workOrderId);

    return buildRecord;
  }

  /**
   * Get build record by ID with full details
   */
  static async getBuildRecordById(id: string): Promise<BuildRecordWithDetails | null> {
    const buildRecord = await prisma.buildRecord.findUnique({
      where: { id },
      include: {
        operations: {
          include: {
            operator: {
              select: { firstName: true, lastName: true, email: true }
            },
            inspector: {
              select: { firstName: true, lastName: true, email: true }
            },
            workCenter: {
              select: { name: true, description: true }
            },
            photos: true,
            signatures: true,
            deviations: true,
          },
          orderBy: { operationNumber: 'asc' }
        },
        deviations: {
          include: {
            detectedByUser: {
              select: { firstName: true, lastName: true, email: true }
            },
            engineeringApprover: {
              select: { firstName: true, lastName: true, email: true }
            },
            qualityApprover: {
              select: { firstName: true, lastName: true, email: true }
            },
            photos: true,
            documents: true,
          },
          orderBy: { detectedAt: 'desc' }
        },
        photos: {
          include: {
            capturedByUser: {
              select: { firstName: true, lastName: true, email: true }
            }
          },
          orderBy: { capturedAt: 'desc' }
        },
        documents: {
          include: {
            uploadedByUser: {
              select: { firstName: true, lastName: true, email: true }
            }
          },
          orderBy: { uploadedAt: 'desc' }
        },
        statusHistory: {
          include: {
            changedByUser: {
              select: { firstName: true, lastName: true, email: true }
            }
          },
          orderBy: { changedAt: 'desc' }
        },
        signatures: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true }
            }
          },
          orderBy: { timestamp: 'desc' }
        },
        workOrder: {
          select: {
            workOrderNumber: true,
            part: {
              select: {
                partNumber: true,
                description: true,
              }
            }
          }
        },
        serializedPart: {
          select: {
            serialNumber: true,
            status: true,
          }
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        qualityApprovedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        engineeringApprovedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
      },
    });

    return buildRecord as BuildRecordWithDetails | null;
  }

  /**
   * Update build record
   */
  static async updateBuildRecord(
    id: string,
    data: UpdateBuildRecordRequest,
    updatedById: string
  ): Promise<BuildRecord> {
    const validatedData = UpdateBuildRecordSchema.parse(data);

    // Get current build record
    const currentRecord = await prisma.buildRecord.findUnique({
      where: { id }
    });

    if (!currentRecord) {
      throw new Error('Build record not found');
    }

    // Update build record
    const updatedRecord = await prisma.buildRecord.update({
      where: { id },
      data: validatedData,
    });

    // Create status history if status changed
    if (validatedData.status && validatedData.status !== currentRecord.status) {
      await prisma.buildRecordStatusHistory.create({
        data: {
          buildRecordId: id,
          previousStatus: currentRecord.status,
          newStatus: validatedData.status,
          changedBy: updatedById,
          reason: 'Status updated',
          automaticChange: false,
        },
      });
    }

    return updatedRecord;
  }

  /**
   * Create build record operation
   */
  static async createBuildRecordOperation(
    data: CreateBuildRecordOperationRequest
  ): Promise<BuildRecordOperation> {
    const validatedData = CreateBuildRecordOperationSchema.parse(data);

    // Verify build record exists
    const buildRecord = await prisma.buildRecord.findUnique({
      where: { id: validatedData.buildRecordId }
    });

    if (!buildRecord) {
      throw new Error('Build record not found');
    }

    // Create operation
    const operation = await prisma.buildRecordOperation.create({
      data: {
        ...validatedData,
        status: OperationStatus.NOT_STARTED,
        quantityCompleted: 0,
        quantityScrap: 0,
        operatorSignedOff: false,
        inspectorSignedOff: false,
        hasDeviations: false,
        requiresEngApproval: false,
        engineeringApproved: false,
        torqueSpecsApplied: false,
        calibrationVerified: false,
        reworkRequired: false,
        reworkCompleted: false,
      },
    });

    return operation;
  }

  /**
   * Start operation (operator sign-on)
   */
  static async startOperation(
    operationId: string,
    operatorId: string
  ): Promise<BuildRecordOperation> {
    const operation = await prisma.buildRecordOperation.findUnique({
      where: { id: operationId }
    });

    if (!operation) {
      throw new Error('Operation not found');
    }

    if (operation.status !== OperationStatus.NOT_STARTED) {
      throw new Error('Operation cannot be started - invalid status');
    }

    // Update operation
    const updatedOperation = await prisma.buildRecordOperation.update({
      where: { id: operationId },
      data: {
        status: OperationStatus.IN_PROGRESS,
        operatorId,
        actualStartDate: new Date(),
      },
    });

    return updatedOperation;
  }

  /**
   * Complete operation (operator sign-off)
   */
  static async completeOperation(
    operationId: string,
    operatorId: string,
    signatureData: any,
    notes?: string
  ): Promise<BuildRecordOperation> {
    const operation = await prisma.buildRecordOperation.findUnique({
      where: { id: operationId }
    });

    if (!operation) {
      throw new Error('Operation not found');
    }

    if (operation.status !== OperationStatus.IN_PROGRESS) {
      throw new Error('Operation cannot be completed - invalid status');
    }

    const now = new Date();
    const actualDuration = operation.actualStartDate
      ? Math.round((now.getTime() - operation.actualStartDate.getTime()) / (1000 * 60))
      : null;

    // Update operation
    const updatedOperation = await prisma.buildRecordOperation.update({
      where: { id: operationId },
      data: {
        status: OperationStatus.COMPLETE,
        actualEndDate: now,
        actualDuration,
        operatorSignedOff: true,
        operatorSignOffDate: now,
        quantityCompleted: operation.quantityPlanned, // Default to planned quantity
      },
    });

    // Create operator signature
    await prisma.buildRecordSignature.create({
      data: {
        buildRecordId: operation.buildRecordId,
        operationId,
        signatureType: 'OPERATOR',
        signatureLevel: 'OPERATION',
        userId: operatorId,
        signatureRole: 'Operator',
        signatureReason: 'Operation completion sign-off',
        signatureData,
        ipAddress: '127.0.0.1', // Should be passed from request
        userAgent: 'BuildRecordService',
        signatureHash: this.generateSignatureHash(signatureData),
        operationNumber: operation.operationNumber,
      },
    });

    return updatedOperation;
  }

  /**
   * Inspector sign-off for operation
   */
  static async inspectorSignOff(
    operationId: string,
    inspectorId: string,
    signatureData: any,
    qualityApproved: boolean,
    notes?: string
  ): Promise<BuildRecordOperation> {
    const operation = await prisma.buildRecordOperation.findUnique({
      where: { id: operationId }
    });

    if (!operation) {
      throw new Error('Operation not found');
    }

    if (!operation.operatorSignedOff) {
      throw new Error('Operator must sign off before inspector sign-off');
    }

    const now = new Date();

    // Update operation
    const updatedOperation = await prisma.buildRecordOperation.update({
      where: { id: operationId },
      data: {
        inspectorId,
        inspectorSignedOff: true,
        inspectorSignOffDate: now,
        qualityCheckComplete: true,
        qualityCheckDate: now,
      },
    });

    // Create inspector signature
    await prisma.buildRecordSignature.create({
      data: {
        buildRecordId: operation.buildRecordId,
        operationId,
        signatureType: 'INSPECTOR',
        signatureLevel: 'OPERATION',
        userId: inspectorId,
        signatureRole: 'Quality Inspector',
        signatureReason: qualityApproved ? 'Quality inspection approved' : 'Quality inspection with issues',
        signatureData,
        ipAddress: '127.0.0.1',
        userAgent: 'BuildRecordService',
        signatureHash: this.generateSignatureHash(signatureData),
        operationNumber: operation.operationNumber,
      },
    });

    return updatedOperation;
  }

  /**
   * Create build deviation
   */
  static async createBuildDeviation(
    data: CreateBuildDeviationRequest
  ): Promise<BuildDeviation> {
    const validatedData = CreateBuildDeviationSchema.parse(data);

    // Create deviation
    const deviation = await prisma.buildDeviation.create({
      data: {
        ...validatedData,
        detectedAt: new Date(),
        status: DeviationStatus.OPEN,
        engineeringReview: false,
        engineeringApproval: false,
        qualityReview: false,
        qualityApproval: false,
        customerNotificationReq: validatedData.severity === DeviationSeverity.CRITICAL,
        customerNotified: false,
        customerApprovalReq: validatedData.severity === DeviationSeverity.CRITICAL,
        customerApproved: false,
      },
    });

    // Update build record to indicate deviations
    await prisma.buildRecord.update({
      where: { id: validatedData.buildRecordId },
      data: {
        hasDeviations: true,
        isCompliant: false // Deviations affect compliance until resolved
      },
    });

    // Update operation if linked
    if (validatedData.operationId) {
      await prisma.buildRecordOperation.update({
        where: { id: validatedData.operationId },
        data: { hasDeviations: true },
      });
    }

    return deviation;
  }

  /**
   * Get build records list with filtering and pagination
   */
  static async getBuildRecords(
    filters: {
      status?: BuildRecordStatus;
      engineModel?: string;
      customerName?: string;
      hasDeviations?: boolean;
      isCompliant?: boolean;
      assignedToId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
    pagination: {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'buildStartDate',
      sortOrder = 'desc'
    } = pagination;

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.engineModel) where.engineModel = { contains: filters.engineModel, mode: 'insensitive' };
    if (filters.customerName) where.customerName = { contains: filters.customerName, mode: 'insensitive' };
    if (filters.hasDeviations !== undefined) where.hasDeviations = filters.hasDeviations;
    if (filters.isCompliant !== undefined) where.isCompliant = filters.isCompliant;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;

    if (filters.dateFrom || filters.dateTo) {
      where.buildStartDate = {};
      if (filters.dateFrom) where.buildStartDate.gte = filters.dateFrom;
      if (filters.dateTo) where.buildStartDate.lte = filters.dateTo;
    }

    // Get total count
    const total = await prisma.buildRecord.count({ where });

    // Get records
    const records = await prisma.buildRecord.findMany({
      where,
      include: {
        workOrder: {
          select: {
            workOrderNumber: true,
            part: {
              select: {
                partNumber: true,
                description: true,
              }
            }
          }
        },
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        _count: {
          select: {
            operations: true,
            deviations: true,
            photos: true,
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: pageSize,
    });

    return {
      records,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get build record summary statistics
   */
  static async getBuildRecordSummary(
    filters: {
      dateFrom?: Date;
      dateTo?: Date;
      engineModel?: string;
      customerName?: string;
    } = {}
  ): Promise<BuildRecordSummary> {
    const where: any = {};

    if (filters.engineModel) where.engineModel = { contains: filters.engineModel, mode: 'insensitive' };
    if (filters.customerName) where.customerName = { contains: filters.customerName, mode: 'insensitive' };

    if (filters.dateFrom || filters.dateTo) {
      where.buildStartDate = {};
      if (filters.dateFrom) where.buildStartDate.gte = filters.dateFrom;
      if (filters.dateTo) where.buildStartDate.lte = filters.dateTo;
    }

    // Get counts
    const [
      totalBuildRecords,
      activeBuildRecords,
      completedBuildRecords,
      buildRecordsWithDeviations,
      compliantRecords,
      avgBuildTimeResult
    ] = await Promise.all([
      prisma.buildRecord.count({ where }),
      prisma.buildRecord.count({
        where: {
          ...where,
          status: { in: [BuildRecordStatus.ACTIVE, BuildRecordStatus.DRAFT] }
        }
      }),
      prisma.buildRecord.count({
        where: {
          ...where,
          status: { in: [BuildRecordStatus.COMPLETE, BuildRecordStatus.APPROVED] }
        }
      }),
      prisma.buildRecord.count({
        where: {
          ...where,
          hasDeviations: true
        }
      }),
      prisma.buildRecord.count({
        where: {
          ...where,
          isCompliant: true
        }
      }),
      prisma.buildRecord.aggregate({
        where: {
          ...where,
          buildEndDate: { not: null },
          buildStartDate: { not: null },
        },
        _avg: {
          // Note: This is a simplified calculation, in practice you'd use raw SQL
        }
      })
    ]);

    // Calculate average build time (simplified - would need raw SQL for proper calculation)
    const averageBuildTime = 0; // Would calculate from buildStartDate to buildEndDate

    // Calculate compliance rate
    const complianceRate = totalBuildRecords > 0
      ? (compliantRecords / totalBuildRecords) * 100
      : 100;

    return {
      totalBuildRecords,
      activeBuildRecords,
      completedBuildRecords,
      buildRecordsWithDeviations,
      averageBuildTime,
      complianceRate,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate unique build record number
   */
  private static async generateBuildRecordNumber(engineModel: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BR-${engineModel.toUpperCase()}-${year}`;

    // Find the highest sequence number for this prefix
    const lastRecord = await prisma.buildRecord.findFirst({
      where: {
        buildRecordNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        buildRecordNumber: 'desc'
      }
    });

    let sequence = 1;
    if (lastRecord) {
      const lastSequence = parseInt(lastRecord.buildRecordNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Auto-generate operations from work order operations
   */
  private static async autoGenerateOperationsFromWorkOrder(
    buildRecordId: string,
    workOrderId: string
  ): Promise<void> {
    // Get work order operations
    const workOrderOps = await prisma.workOrderOperation.findMany({
      where: { workOrderId },
      include: {
        routingOperation: {
          include: {
            operation: true,
            routingStep: true,
          }
        }
      },
      orderBy: { routingOperation: { sequenceNumber: 'asc' } }
    });

    // Create build record operations
    for (const workOrderOp of workOrderOps) {
      await prisma.buildRecordOperation.create({
        data: {
          buildRecordId,
          workOrderOperationId: workOrderOp.id,
          operationNumber: workOrderOp.routingOperation.sequenceNumber.toString(),
          operationName: workOrderOp.routingOperation.operation.operationName,
          routingStepId: workOrderOp.routingStepId,
          quantityPlanned: workOrderOp.quantity,
          status: OperationStatus.NOT_STARTED,
          quantityCompleted: 0,
          quantityScrap: 0,
          operatorSignedOff: false,
          inspectorSignedOff: false,
          hasDeviations: false,
          requiresEngApproval: false,
          engineeringApproved: false,
          torqueSpecsApplied: false,
          calibrationVerified: false,
          reworkRequired: false,
          reworkCompleted: false,
        },
      });
    }
  }

  /**
   * Generate signature hash for integrity
   */
  private static generateSignatureHash(signatureData: any): string {
    // In a real implementation, use a proper cryptographic hash
    return Buffer.from(JSON.stringify(signatureData)).toString('base64');
  }
}

export default BuildRecordService;