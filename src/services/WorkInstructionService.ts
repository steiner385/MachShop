import { PrismaClient, WorkInstruction, WorkInstructionStep, WorkInstructionStatus, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  CreateWorkInstructionInput,
  UpdateWorkInstructionInput,
  CreateStepInput,
  UpdateStepInput,
  WorkInstructionQueryParams,
  WorkInstructionResponse,
  WorkInstructionListResponse,
} from '../types/workInstruction';

const prisma = new PrismaClient();

export class WorkInstructionService {
  /**
   * Create a new work instruction
   */
  async createWorkInstruction(
    data: CreateWorkInstructionInput,
    userId: string
  ): Promise<WorkInstructionResponse> {
    try {
      const workInstruction = await prisma.workInstruction.create({
        data: {
          ...data,
          createdById: userId,
          updatedById: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });

      logger.info(`Work instruction created: ${workInstruction.id}`, {
        workInstructionId: workInstruction.id,
        title: workInstruction.title,
        userId,
      });

      return workInstruction as WorkInstructionResponse;
    } catch (error) {
      logger.error('Error creating work instruction:', error);
      throw error;
    }
  }

  /**
   * Get work instruction by ID
   */
  async getWorkInstructionById(id: string): Promise<WorkInstructionResponse | null> {
    try {
      const workInstruction = await prisma.workInstruction.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });

      return workInstruction as WorkInstructionResponse | null;
    } catch (error) {
      logger.error(`Error fetching work instruction ${id}:`, error);
      throw error;
    }
  }

  /**
   * List work instructions with filtering and pagination
   */
  async listWorkInstructions(
    params: WorkInstructionQueryParams
  ): Promise<WorkInstructionListResponse> {
    try {
      const {
        page = 1,
        pageSize = 20,
        status,
        partId,
        search,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = params;

      const skip = (page - 1) * pageSize;
      const take = pageSize;

      // Build where clause
      const where: Prisma.WorkInstructionWhereInput = {};

      if (status) {
        where.status = status;
      }

      if (partId) {
        where.partId = partId;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { version: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Build orderBy clause
      const orderBy: Prisma.WorkInstructionOrderByWithRelationInput = {
        [sortBy]: sortOrder,
      };

      // Execute queries
      const [data, total] = await Promise.all([
        prisma.workInstruction.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            createdBy: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            updatedBy: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            approvedBy: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                steps: true,
              },
            },
          },
        }),
        prisma.workInstruction.count({ where }),
      ]);

      const totalPages = Math.ceil(total / pageSize);

      return {
        data: data as WorkInstructionResponse[],
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      logger.error('Error listing work instructions:', error);
      throw error;
    }
  }

  /**
   * Update work instruction
   */
  async updateWorkInstruction(
    id: string,
    data: UpdateWorkInstructionInput,
    userId: string
  ): Promise<WorkInstructionResponse> {
    try {
      const workInstruction = await prisma.workInstruction.update({
        where: { id },
        data: {
          ...data,
          updatedById: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });

      logger.info(`Work instruction updated: ${id}`, {
        workInstructionId: id,
        userId,
      });

      return workInstruction as WorkInstructionResponse;
    } catch (error) {
      logger.error(`Error updating work instruction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete work instruction
   */
  async deleteWorkInstruction(id: string): Promise<void> {
    try {
      await prisma.workInstruction.delete({
        where: { id },
      });

      logger.info(`Work instruction deleted: ${id}`);
    } catch (error) {
      logger.error(`Error deleting work instruction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add step to work instruction
   */
  async addStep(
    workInstructionId: string,
    data: CreateStepInput
  ): Promise<WorkInstructionStep> {
    try {
      const step = await prisma.workInstructionStep.create({
        data: {
          workInstructionId,
          ...data,
        },
      });

      logger.info(`Step added to work instruction: ${workInstructionId}`, {
        stepId: step.id,
        stepNumber: step.stepNumber,
      });

      return step;
    } catch (error) {
      logger.error(`Error adding step to work instruction ${workInstructionId}:`, error);
      throw error;
    }
  }

  /**
   * Update step
   */
  async updateStep(
    stepId: string,
    data: UpdateStepInput
  ): Promise<WorkInstructionStep> {
    try {
      const step = await prisma.workInstructionStep.update({
        where: { id: stepId },
        data,
      });

      logger.info(`Step updated: ${stepId}`);

      return step;
    } catch (error) {
      logger.error(`Error updating step ${stepId}:`, error);
      throw error;
    }
  }

  /**
   * Delete step
   */
  async deleteStep(stepId: string): Promise<void> {
    try {
      await prisma.workInstructionStep.delete({
        where: { id: stepId },
      });

      logger.info(`Step deleted: ${stepId}`);
    } catch (error) {
      logger.error(`Error deleting step ${stepId}:`, error);
      throw error;
    }
  }

  /**
   * Approve work instruction
   */
  async approveWorkInstruction(
    id: string,
    userId: string
  ): Promise<WorkInstructionResponse> {
    try {
      const workInstruction = await prisma.workInstruction.update({
        where: { id },
        data: {
          status: WorkInstructionStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
          updatedById: userId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });

      logger.info(`Work instruction approved: ${id}`, {
        workInstructionId: id,
        approvedBy: userId,
      });

      return workInstruction as WorkInstructionResponse;
    } catch (error) {
      logger.error(`Error approving work instruction ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get work instructions by part ID
   */
  async getWorkInstructionsByPartId(partId: string): Promise<WorkInstructionResponse[]> {
    try {
      const workInstructions = await prisma.workInstruction.findMany({
        where: {
          partId,
          status: WorkInstructionStatus.APPROVED,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
        orderBy: {
          version: 'desc',
        },
      });

      return workInstructions as WorkInstructionResponse[];
    } catch (error) {
      logger.error(`Error fetching work instructions for part ${partId}:`, error);
      throw error;
    }
  }

  /**
   * Reorder steps
   */
  async reorderSteps(
    workInstructionId: string,
    stepOrder: { stepId: string; newStepNumber: number }[]
  ): Promise<void> {
    try {
      // Use transaction to update all steps atomically
      await prisma.$transaction(
        stepOrder.map(({ stepId, newStepNumber }) =>
          prisma.workInstructionStep.update({
            where: { id: stepId },
            data: { stepNumber: newStepNumber },
          })
        )
      );

      logger.info(`Steps reordered for work instruction: ${workInstructionId}`);
    } catch (error) {
      logger.error(`Error reordering steps for work instruction ${workInstructionId}:`, error);
      throw error;
    }
  }

  /**
   * Reject work instruction
   */
  async rejectWorkInstruction(
    id: string,
    userId: string,
    rejectionReason: string,
    comments: string
  ): Promise<WorkInstructionResponse> {
    try {
      // Get user details for rejection record
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get current work instruction to retrieve approval history
      const currentWI = await prisma.workInstruction.findUnique({
        where: { id },
        select: { approvalHistory: true },
      });

      const approvalHistory = (currentWI?.approvalHistory as any) || [];

      // Create rejection entry
      const rejectionEntry = {
        id: Date.now().toString(),
        title: 'Review',
        description: 'Technical review',
        status: 'error',
        approver: {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          email: user.email,
          avatar: undefined,
        },
        rejectedAt: new Date().toISOString(),
        rejectionReason,
        comments,
      };

      // Update work instruction with rejection
      const workInstruction = await prisma.workInstruction.update({
        where: { id },
        data: {
          status: 'REJECTED' as WorkInstructionStatus,
          updatedById: userId,
          approvalHistory: [...approvalHistory, rejectionEntry] as any,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          steps: {
            orderBy: {
              stepNumber: 'asc',
            },
          },
        },
      });

      logger.info(`Work instruction rejected: ${id}`, {
        workInstructionId: id,
        rejectedBy: userId,
        rejectionReason,
      });

      // TODO: Send email notification to author
      // const authorEmail = workInstruction.createdBy.email;
      // await sendRejectionEmail(authorEmail, workInstruction.title, rejectionReason, comments);

      return workInstruction as WorkInstructionResponse;
    } catch (error) {
      logger.error(`Error rejecting work instruction ${id}:`, error);
      throw error;
    }
  }
}

export const workInstructionService = new WorkInstructionService();
