/**
 * Personnel Info Sync Service
 * Task 1.8: Level 4 (ERP) Integration Model
 *
 * Manages bidirectional personnel information exchange between MES and ERP
 * Following ISA-95 Part 3 specification for personnel information sync
 */

import { PrismaClient, PersonnelActionType, B2MMessageStatus, IntegrationDirection } from '@prisma/client';
import { PersonnelInfoExchangeInput, PersonnelInfoSyncResult } from '../types/b2m';
import B2MMessageBuilder from './B2MMessageBuilder';
import { v4 as uuidv4 } from 'uuid';

export class PersonnelInfoSyncService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Export personnel information to ERP (MES → ERP)
   * Creates outbound personnel info message for ERP integration
   */
  async exportPersonnelInfo(params: {
    configId: string;
    userId: string;
    actionType: PersonnelActionType;
    createdBy: string;
  }): Promise<PersonnelInfoSyncResult> {
    const { configId, userId, actionType, createdBy } = params;

    try {
      // Get user information
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
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

      // Build skills array from user data
      // Note: This is a placeholder - actual skill data structure depends on your User model
      const skills: Array<{ code: string; level: string }> = [];
      // TODO: Extract skills from user profile when skill tracking is implemented

      // Build certifications array
      const certifications: Array<{ code: string; expirationDate?: string }> = [];
      // TODO: Extract certifications from user profile when certification tracking is implemented

      // Generate message ID
      const messageId = `PERS-${user.username}-${Date.now()}`;

      // Build ISA-95 message
      const isa95Message = B2MMessageBuilder.buildPersonnelInfoMessage({
        messageId,
        sender: 'MES',
        receiver: config.name,
        actionType,
        personnel: {
          externalId: user.username, // Use username as external ID
          employeeNumber: user.employeeId || undefined,
          firstName: user.name?.split(' ')[0],
          lastName: user.name?.split(' ').slice(1).join(' '),
          email: user.email,
          department: undefined, // TODO: Add department tracking to User model
          jobTitle: undefined, // TODO: Add job title tracking to User model
        },
        skills: skills.length > 0 ? skills : undefined,
        certifications: certifications.length > 0 ? certifications : undefined,
        availability: {
          shiftCode: undefined, // TODO: Add shift tracking to User model
          calendar: undefined,
          from: undefined,
          to: undefined,
        },
      });

      // Validate message
      const validation = B2MMessageBuilder.validatePersonnelInfoMessage(isa95Message);
      if (!validation.isValid) {
        throw new Error(`Invalid personnel info message: ${validation.errors?.join(', ')}`);
      }

      // Create PersonnelInfoExchange record
      const exchangeInput: PersonnelInfoExchangeInput = {
        messageId,
        configId,
        externalPersonnelId: user.username,
        personnelId: user.id,
        actionType,
        direction: 'OUTBOUND' as IntegrationDirection,
        firstName: user.name?.split(' ')[0],
        lastName: user.name?.split(' ').slice(1).join(' '),
        email: user.email,
        employeeNumber: user.employeeId || undefined,
        department: undefined,
        jobTitle: undefined,
        skills: skills.length > 0 ? (skills as any) : undefined,
        certifications: certifications.length > 0 ? (certifications as any) : undefined,
        qualifications: undefined,
        shiftCode: undefined,
        workCalendar: undefined,
        availableFrom: undefined,
        availableTo: undefined,
        employmentStatus: user.isActive ? 'ACTIVE' : 'INACTIVE',
        lastWorkDate: undefined,
        messagePayload: isa95Message as any,
      };

      const exchange = await this.prisma.personnelInfoExchange.create({
        data: {
          ...exchangeInput,
          status: 'PENDING',
          skills: exchangeInput.skills as any,
          certifications: exchangeInput.certifications as any,
          qualifications: exchangeInput.qualifications as any,
          messagePayload: exchangeInput.messagePayload as any,
        },
      });

      // TODO: Send to ERP via IntegrationManager (to be implemented in future PR)
      // For now, mark as PROCESSED (would be SENT after actual transmission)
      await this.prisma.personnelInfoExchange.update({
        where: { id: exchange.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      return {
        messageId: exchange.messageId,
        externalPersonnelId: exchange.externalPersonnelId,
        personnelId: exchange.personnelId || undefined,
        actionType: exchange.actionType,
        status: 'PROCESSED' as B2MMessageStatus,
        processedAt: new Date(),
        errorMessage: undefined,
      };
    } catch (error) {
      throw new Error(`Failed to export personnel info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process inbound personnel information from ERP (ERP → MES)
   * Creates or updates MES user based on ERP personnel data
   */
  async processInboundPersonnelInfo(params: {
    configId: string;
    messagePayload: any;
    createdBy: string;
  }): Promise<PersonnelInfoSyncResult> {
    const { configId, messagePayload, createdBy } = params;

    try {
      // Parse and validate message
      const parsed = B2MMessageBuilder.parseMessage(JSON.stringify(messagePayload));
      if (!parsed.isValid) {
        throw new Error(`Invalid message format: ${parsed.errors?.join(', ')}`);
      }

      if (parsed.messageType !== 'PersonnelInfo') {
        throw new Error(`Expected PersonnelInfo message, got ${parsed.messageType}`);
      }

      const message = parsed.message;
      const validation = B2MMessageBuilder.validatePersonnelInfoMessage(message);
      if (!validation.isValid) {
        throw new Error(`Invalid personnel info: ${validation.errors?.join(', ')}`);
      }

      // Get integration config
      const config = await this.prisma.integrationConfig.findUnique({
        where: { id: configId },
      });

      if (!config) {
        throw new Error(`Integration config ${configId} not found`);
      }

      // Find existing user by external ID (username)
      let user = await this.prisma.user.findFirst({
        where: { username: message.personnel.externalId },
      });

      let personnelId: string | undefined;

      // Process based on action type
      switch (message.actionType) {
        case 'CREATE':
          if (user) {
            throw new Error(`User with username ${message.personnel.externalId} already exists`);
          }

          // Validate required fields for CREATE
          if (!message.personnel.firstName || !message.personnel.lastName) {
            throw new Error('firstName and lastName are required for CREATE action');
          }

          // Create new user
          user = await this.prisma.user.create({
            data: {
              username: message.personnel.externalId,
              name: `${message.personnel.firstName} ${message.personnel.lastName}`.trim(),
              email: message.personnel.email || `${message.personnel.externalId}@company.com`,
              password: 'PLACEHOLDER', // TODO: Implement proper password handling
              employeeId: message.personnel.employeeNumber,
              role: 'OPERATOR', // Default role
              isActive: true,
            },
          });

          personnelId = user.id;
          break;

        case 'UPDATE':
          if (!user) {
            throw new Error(`User with username ${message.personnel.externalId} not found`);
          }

          // Update existing user
          const updateData: any = {};

          if (message.personnel.firstName && message.personnel.lastName) {
            updateData.name = `${message.personnel.firstName} ${message.personnel.lastName}`.trim();
          }

          if (message.personnel.email) {
            updateData.email = message.personnel.email;
          }

          if (message.personnel.employeeNumber) {
            updateData.employeeId = message.personnel.employeeNumber;
          }

          user = await this.prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          personnelId = user.id;
          break;

        case 'DELETE':
          if (!user) {
            throw new Error(`User with username ${message.personnel.externalId} not found`);
          }

          // Soft delete - mark as inactive
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              isActive: false,
            },
          });

          personnelId = user.id;
          break;

        case 'QUERY':
          // QUERY action - just return current state, don't modify
          if (user) {
            personnelId = user.id;
          }
          break;

        default:
          throw new Error(`Unknown action type: ${message.actionType}`);
      }

      // Create PersonnelInfoExchange record
      const exchange = await this.prisma.personnelInfoExchange.create({
        data: {
          messageId: message.messageId,
          configId,
          externalPersonnelId: message.personnel.externalId,
          personnelId,
          actionType: message.actionType,
          direction: 'INBOUND',
          firstName: message.personnel.firstName,
          lastName: message.personnel.lastName,
          email: message.personnel.email,
          employeeNumber: message.personnel.employeeNumber,
          department: message.personnel.department,
          jobTitle: message.personnel.jobTitle,
          skills: message.skills as any,
          certifications: message.certifications as any,
          qualifications: undefined,
          shiftCode: message.availability?.shiftCode,
          workCalendar: message.availability?.calendar,
          availableFrom: message.availability?.from ? new Date(message.availability.from) : undefined,
          availableTo: message.availability?.to ? new Date(message.availability.to) : undefined,
          employmentStatus: undefined,
          lastWorkDate: undefined,
          status: 'PENDING',
          messagePayload: message,
        },
      });

      // Mark as processed
      await this.prisma.personnelInfoExchange.update({
        where: { id: exchange.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      return {
        messageId: exchange.messageId,
        externalPersonnelId: exchange.externalPersonnelId,
        personnelId: exchange.personnelId || undefined,
        actionType: exchange.actionType,
        status: 'PROCESSED' as B2MMessageStatus,
        processedAt: new Date(),
        errorMessage: undefined,
      };
    } catch (error) {
      throw new Error(`Failed to process inbound personnel info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get personnel info exchange status
   */
  async getExchangeStatus(messageId: string) {
    const exchange = await this.prisma.personnelInfoExchange.findUnique({
      where: { messageId },
      include: {
        config: {
          select: {
            name: true,
            systemType: true,
          },
        },
      },
    });

    if (!exchange) {
      throw new Error(`Personnel info exchange ${messageId} not found`);
    }

    // Get user info if personnelId exists
    let userInfo: any = undefined;
    if (exchange.personnelId) {
      const user = await this.prisma.user.findUnique({
        where: { id: exchange.personnelId },
        select: {
          username: true,
          name: true,
          email: true,
          employeeId: true,
          role: true,
          isActive: true,
        },
      });
      userInfo = user;
    }

    return {
      messageId: exchange.messageId,
      externalPersonnelId: exchange.externalPersonnelId,
      personnelId: exchange.personnelId,
      actionType: exchange.actionType,
      direction: exchange.direction,
      status: exchange.status,
      firstName: exchange.firstName,
      lastName: exchange.lastName,
      email: exchange.email,
      employeeNumber: exchange.employeeNumber,
      department: exchange.department,
      jobTitle: exchange.jobTitle,
      processedAt: exchange.processedAt,
      errorMessage: exchange.errorMessage,
      integrationSystem: exchange.config.name,
      userInfo,
      createdAt: exchange.createdAt,
    };
  }

  /**
   * Get all personnel exchanges for a user
   */
  async getUserExchanges(userId: string, filters?: {
    actionType?: PersonnelActionType;
    direction?: IntegrationDirection;
    status?: B2MMessageStatus;
    startDate?: Date;
    endDate?: Date;
  }) {
    const whereClause: any = { personnelId: userId };

    if (filters?.actionType) {
      whereClause.actionType = filters.actionType;
    }

    if (filters?.direction) {
      whereClause.direction = filters.direction;
    }

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = filters.endDate;
      }
    }

    const exchanges = await this.prisma.personnelInfoExchange.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        messageId: true,
        actionType: true,
        direction: true,
        status: true,
        processedAt: true,
        createdAt: true,
        config: {
          select: {
            name: true,
            systemType: true,
          },
        },
      },
    });

    return exchanges;
  }

  /**
   * Get all personnel exchanges by external ID
   */
  async getExternalPersonnelExchanges(externalPersonnelId: string) {
    const exchanges = await this.prisma.personnelInfoExchange.findMany({
      where: { externalPersonnelId },
      orderBy: { createdAt: 'desc' },
      include: {
        config: {
          select: {
            name: true,
            systemType: true,
          },
        },
      },
    });

    return exchanges.map(e => ({
      messageId: e.messageId,
      actionType: e.actionType,
      direction: e.direction,
      status: e.status,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      employeeNumber: e.employeeNumber,
      processedAt: e.processedAt,
      integrationSystem: e.config.name,
      createdAt: e.createdAt,
    }));
  }

  /**
   * Retry failed personnel exchange
   */
  async retryExchange(messageId: string, createdBy: string) {
    const exchange = await this.prisma.personnelInfoExchange.findUnique({
      where: { messageId },
    });

    if (!exchange) {
      throw new Error(`Personnel info exchange ${messageId} not found`);
    }

    if (exchange.status === 'PROCESSED') {
      throw new Error(`Exchange ${messageId} is already processed, cannot retry`);
    }

    // Reset status to PENDING for retry
    await this.prisma.personnelInfoExchange.update({
      where: { messageId },
      data: {
        status: 'PENDING',
        errorMessage: null,
      },
    });

    // Re-process based on direction
    if (exchange.direction === 'OUTBOUND') {
      // Re-export to ERP
      if (!exchange.personnelId) {
        throw new Error(`Cannot retry: Personnel ID is missing`);
      }

      return await this.exportPersonnelInfo({
        configId: exchange.configId,
        userId: exchange.personnelId,
        actionType: exchange.actionType,
        createdBy,
      });
    } else {
      // Re-process inbound from ERP
      return await this.processInboundPersonnelInfo({
        configId: exchange.configId,
        messagePayload: exchange.messagePayload,
        createdBy,
      });
    }
  }

  /**
   * Bulk sync personnel from ERP to MES
   * Processes multiple personnel records in a single operation
   */
  async bulkSyncPersonnel(params: {
    configId: string;
    personnelData: Array<any>;
    createdBy: string;
  }): Promise<PersonnelInfoSyncResult[]> {
    const { configId, personnelData, createdBy } = params;

    try {
      const results: PersonnelInfoSyncResult[] = [];

      for (const personnel of personnelData) {
        try {
          const result = await this.processInboundPersonnelInfo({
            configId,
            messagePayload: personnel,
            createdBy,
          });

          results.push(result);
        } catch (error) {
          // Continue processing other records even if one fails
          results.push({
            messageId: personnel.messageId || `FAILED-${Date.now()}`,
            externalPersonnelId: personnel.personnel?.externalId || 'UNKNOWN',
            personnelId: undefined,
            actionType: personnel.actionType || 'QUERY',
            status: 'FAILED' as B2MMessageStatus,
            processedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to bulk sync personnel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync all active users to ERP
   * Exports all active MES users to ERP system
   */
  async syncAllActiveUsers(params: {
    configId: string;
    createdBy: string;
  }): Promise<PersonnelInfoSyncResult[]> {
    const { configId, createdBy } = params;

    try {
      // Get all active users
      const users = await this.prisma.user.findMany({
        where: { isActive: true },
      });

      const results: PersonnelInfoSyncResult[] = [];

      for (const user of users) {
        try {
          const result = await this.exportPersonnelInfo({
            configId,
            userId: user.id,
            actionType: 'UPDATE', // Use UPDATE to sync existing users
            createdBy,
          });

          results.push(result);
        } catch (error) {
          // Continue processing other users even if one fails
          results.push({
            messageId: `FAILED-${user.username}-${Date.now()}`,
            externalPersonnelId: user.username,
            personnelId: user.id,
            actionType: 'UPDATE',
            status: 'FAILED' as B2MMessageStatus,
            processedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to sync all active users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export both class and default singleton instance
export default new PersonnelInfoSyncService();
