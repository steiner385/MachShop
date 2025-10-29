import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient, PersonnelActionType, B2MMessageStatus, IntegrationDirection } from '@prisma/client';
import { PersonnelInfoSyncService } from '../../services/PersonnelInfoSyncService';

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    integrationConfig: {
      findUnique: vi.fn(),
    },
    personnelInfoExchange: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };

  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
    PersonnelActionType: {
      CREATE: 'CREATE',
      UPDATE: 'UPDATE',
      DELETE: 'DELETE',
      DEACTIVATE: 'DEACTIVATE',
      QUERY: 'QUERY',
    },
    B2MMessageStatus: {
      PENDING: 'PENDING',
      PROCESSED: 'PROCESSED',
      SENT: 'SENT',
      CONFIRMED: 'CONFIRMED',
      FAILED: 'FAILED',
    },
    IntegrationDirection: {
      INBOUND: 'INBOUND',
      OUTBOUND: 'OUTBOUND',
    },
  };
});

describe('PersonnelInfoSyncService', () => {
  let service: PersonnelInfoSyncService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    service = new PersonnelInfoSyncService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('exportPersonnelInfo', () => {
    const mockUser = {
      id: 'user-1',
      employeeId: 'EMP-001',
      employeeNumber: 'EMP-001',
      username: 'jsmith',
      name: 'John Smith',
      firstName: 'John',
      lastName: 'Smith',
      email: 'jsmith@example.com',
      role: 'OPERATOR',
      department: 'PRODUCTION',
      shiftId: 'shift-1',
      isActive: true,
    };

    const mockConfig = {
      id: 'config-1',
      name: 'Oracle HCM',
      type: 'ERP',
      enabled: true,
    };

    it('should export personnel CREATE action successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.personnelInfoExchange.create.mockResolvedValue({
        id: 'exchange-1',
        messageId: 'PERS-EMP-001-CREATE-123456',
        actionType: 'CREATE',
        direction: 'OUTBOUND',
        status: 'PENDING',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValue({
        id: 'exchange-1',
        status: 'PROCESSED',
      });

      const result = await service.exportPersonnelInfo({
        configId: 'config-1',
        userId: 'user-1',
        actionType: 'CREATE',
        createdBy: 'user-admin',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
      expect(mockPrisma.personnelInfoExchange.create).toHaveBeenCalledOnce();
    });

    it('should export personnel UPDATE action successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.personnelInfoExchange.create.mockResolvedValue({
        id: 'exchange-1',
        messageId: 'PERS-EMP-001-UPDATE-123456',
        actionType: 'UPDATE',
        direction: 'OUTBOUND',
        status: 'PENDING',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValue({
        id: 'exchange-1',
        status: 'PROCESSED',
      });

      const result = await service.exportPersonnelInfo({
        configId: 'config-1',
        userId: 'user-1',
        actionType: 'UPDATE',
        createdBy: 'user-admin',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
    });

    it('should export personnel DEACTIVATE action successfully', async () => {
      const inactiveUser = { ...mockUser, isActive: false };

      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.personnelInfoExchange.create.mockResolvedValue({
        id: 'exchange-1',
        messageId: 'PERS-EMP-001-DEACTIVATE-123456',
        actionType: 'DEACTIVATE',
        direction: 'OUTBOUND',
        status: 'PENDING',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValue({
        id: 'exchange-1',
        status: 'PROCESSED',
      });

      const result = await service.exportPersonnelInfo({
        configId: 'config-1',
        userId: 'user-1',
        actionType: 'DEACTIVATE',
        createdBy: 'user-admin',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.exportPersonnelInfo({
          configId: 'config-1',
          userId: 'invalid-user',
          actionType: 'CREATE',
          createdBy: 'user-admin',
        })
      ).rejects.toThrow('User invalid-user not found');
    });

    it('should throw error if config not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(null);

      await expect(
        service.exportPersonnelInfo({
          configId: 'invalid-config',
          userId: 'user-1',
          actionType: 'CREATE',
          createdBy: 'user-admin',
        })
      ).rejects.toThrow('Integration config invalid-config not found');
    });

    it('should throw error if config disabled', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(disabledConfig);

      await expect(
        service.exportPersonnelInfo({
          configId: 'config-1',
          userId: 'user-1',
          actionType: 'CREATE',
          createdBy: 'user-admin',
        })
      ).rejects.toThrow('Integration config config-1 is disabled');
    });
  });

  describe('processInboundPersonnelInfo', () => {
    const mockConfig = {
      id: 'config-1',
      name: 'Oracle HCM',
      type: 'ERP',
      enabled: true,
    };

    it('should process inbound CREATE action successfully', async () => {
      const messagePayload = {
        messageType: 'PersonnelInfo',
        messageId: 'ERP-PERS-CREATE-001',
        sender: 'Oracle HCM',
        receiver: 'MES',
        timestamp: '2025-10-15T10:00:00Z',
        actionType: 'CREATE',
        personnel: {
          externalId: 'mjones',
          employeeNumber: 'EMP-002',
          firstName: 'Mary',
          lastName: 'Jones',
          email: 'mjones@example.com',
          department: 'QUALITY',
          jobTitle: 'SUPERVISOR',
        },
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.personnelInfoExchange.create.mockResolvedValue({
        id: 'exchange-1',
        messageId: 'ERP-PERS-CREATE-001',
        status: 'PENDING',
        direction: 'INBOUND',
      });
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-new',
        employeeId: 'EMP-002',
        username: 'mjones',
        isActive: true,
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValue({
        id: 'exchange-1',
        status: 'PROCESSED',
      });

      const result = await service.processInboundPersonnelInfo({
        configId: 'config-1',
        messagePayload,
        createdBy: 'system',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: 'mjones',
            firstName: 'Mary',
            lastName: 'Jones',
            email: 'mjones@example.com',
            roles: ['OPERATOR'],
            isActive: true,
          }),
        })
      );
    });

    it('should process inbound UPDATE action successfully', async () => {
      const messagePayload = {
        messageType: 'PersonnelInfo',
        messageId: 'ERP-PERS-UPDATE-001',
        sender: 'Oracle HCM',
        receiver: 'MES',
        timestamp: '2025-10-15T10:00:00Z',
        actionType: 'UPDATE',
        personnel: {
          externalId: 'jsmith',
          employeeNumber: 'EMP-001',
          email: 'john.smith.updated@example.com',
          department: 'ENGINEERING',
          jobTitle: 'LEAD',
        },
      };

      const existingUser = {
        id: 'user-1',
        employeeId: 'EMP-001',
        username: 'jsmith',
        email: 'jsmith@example.com',
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.personnelInfoExchange.create.mockResolvedValue({
        id: 'exchange-1',
        messageId: 'ERP-PERS-UPDATE-001',
      });
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        email: 'john.smith.updated@example.com',
        department: 'ENGINEERING',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValue({
        id: 'exchange-1',
        status: 'PROCESSED',
      });

      const result = await service.processInboundPersonnelInfo({
        configId: 'config-1',
        messagePayload,
        createdBy: 'system',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            email: 'john.smith.updated@example.com',
          }),
        })
      );
    });

    it('should process inbound DELETE action successfully (soft delete)', async () => {
      const messagePayload = {
        messageType: 'PersonnelInfo',
        messageId: 'ERP-PERS-DELETE-001',
        sender: 'Oracle HCM',
        receiver: 'MES',
        timestamp: '2025-10-15T10:00:00Z',
        actionType: 'DELETE',
        personnel: {
          externalId: 'jsmith',
          employeeNumber: 'EMP-001',
        },
      };

      const existingUser = {
        id: 'user-1',
        employeeId: 'EMP-001',
        username: 'jsmith',
        isActive: true,
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.personnelInfoExchange.create.mockResolvedValue({
        id: 'exchange-1',
        messageId: 'ERP-PERS-DELETE-001',
      });
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        isActive: false,
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValue({
        id: 'exchange-1',
        status: 'PROCESSED',
      });

      const result = await service.processInboundPersonnelInfo({
        configId: 'config-1',
        messagePayload,
        createdBy: 'system',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { isActive: false },
        })
      );
    });

    it('should process inbound QUERY action successfully', async () => {
      const messagePayload = {
        messageType: 'PersonnelInfo',
        messageId: 'ERP-PERS-QUERY-001',
        sender: 'Oracle HCM',
        receiver: 'MES',
        timestamp: '2025-10-15T10:00:00Z',
        actionType: 'QUERY',
        personnel: {
          externalId: 'jsmith',
          employeeNumber: 'EMP-001',
        },
      };

      const existingUser = {
        id: 'user-1',
        employeeId: 'EMP-001',
        username: 'jsmith',
        email: 'jsmith@example.com',
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.personnelInfoExchange.create.mockResolvedValue({
        id: 'exchange-1',
        messageId: 'ERP-PERS-QUERY-001',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValue({
        id: 'exchange-1',
        status: 'PROCESSED',
      });

      const result = await service.processInboundPersonnelInfo({
        configId: 'config-1',
        messagePayload,
        createdBy: 'system',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw error if user not found for UPDATE action', async () => {
      const messagePayload = {
        messageType: 'PersonnelInfo',
        messageId: 'ERP-PERS-UPDATE-001',
        sender: 'Oracle HCM',
        receiver: 'MES',
        timestamp: '2025-10-15T10:00:00Z',
        actionType: 'UPDATE',
        personnel: {
          externalId: 'invalid-username',
          employeeNumber: 'INVALID-EMP',
        },
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.personnelInfoExchange.create.mockResolvedValue({
        id: 'exchange-1',
        messageId: 'ERP-PERS-UPDATE-001',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValue({});

      await expect(
        service.processInboundPersonnelInfo({
          configId: 'config-1',
          messagePayload,
          createdBy: 'system',
        })
      ).rejects.toThrow('User with username invalid-username not found');
    });

    it('should throw error if user already exists for CREATE action', async () => {
      const messagePayload = {
        messageType: 'PersonnelInfo',
        messageId: 'ERP-PERS-CREATE-001',
        sender: 'Oracle HCM',
        receiver: 'MES',
        timestamp: '2025-10-15T10:00:00Z',
        actionType: 'CREATE',
        personnel: {
          externalId: 'jsmith',
          employeeNumber: 'EMP-001',
          firstName: 'John',
          lastName: 'Smith',
          email: 'jsmith@example.com',
        },
      };

      const existingUser = {
        id: 'user-1',
        employeeId: 'EMP-001',
        username: 'jsmith',
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.personnelInfoExchange.create.mockResolvedValue({
        id: 'exchange-1',
        messageId: 'ERP-PERS-CREATE-001',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValue({});

      await expect(
        service.processInboundPersonnelInfo({
          configId: 'config-1',
          messagePayload,
          createdBy: 'system',
        })
      ).rejects.toThrow('User with username jsmith already exists');
    });
  });

  describe('getExchangeStatus', () => {
    it('should return exchange status successfully', async () => {
      const mockExchange = {
        messageId: 'PERS-EMP-001-CREATE-123',
        actionType: 'CREATE',
        direction: 'OUTBOUND',
        status: 'PROCESSED',
        sentToERP: false,
        sentAt: null,
        erpConfirmation: null,
        errorMessage: null,
        createdAt: new Date('2025-10-15T10:00:00Z'),
        personnelId: 'user-1',
        config: {
          name: 'Oracle HCM',
          systemType: 'ERP',
        },
      };

      mockPrisma.personnelInfoExchange.findUnique.mockResolvedValue(mockExchange);
      mockPrisma.user.findUnique.mockResolvedValue({
        username: 'jsmith',
        name: 'John Smith',
        email: 'jsmith@example.com',
        employeeId: 'EMP-001',
        role: 'OPERATOR',
        isActive: true,
      });

      const result = await service.getExchangeStatus('PERS-EMP-001-CREATE-123');

      expect(result).toBeDefined();
      expect(result.messageId).toBe('PERS-EMP-001-CREATE-123');
      expect(result.status).toBe('PROCESSED');
      expect(result.userInfo).toBeDefined();
    });

    it('should throw error if exchange not found', async () => {
      mockPrisma.personnelInfoExchange.findUnique.mockResolvedValue(null);

      await expect(
        service.getExchangeStatus('invalid-message-id')
      ).rejects.toThrow('Personnel info exchange invalid-message-id not found');
    });
  });

  describe('getUserExchanges', () => {
    it('should return all exchanges for a user', async () => {
      const mockExchanges = [
        {
          messageId: 'PERS-EMP-001-CREATE-001',
          actionType: 'CREATE',
          direction: 'OUTBOUND',
          status: 'PROCESSED',
          processedAt: new Date('2025-10-15T10:00:00Z'),
          createdAt: new Date('2025-10-15T10:00:00Z'),
          config: {
            name: 'Oracle HCM',
            systemType: 'ERP',
          },
        },
        {
          messageId: 'PERS-EMP-001-UPDATE-001',
          actionType: 'UPDATE',
          direction: 'OUTBOUND',
          status: 'PROCESSED',
          processedAt: new Date('2025-10-16T10:00:00Z'),
          createdAt: new Date('2025-10-16T10:00:00Z'),
          config: {
            name: 'Oracle HCM',
            systemType: 'ERP',
          },
        },
      ];

      mockPrisma.personnelInfoExchange.findMany.mockResolvedValue(mockExchanges);

      const result = await service.getUserExchanges('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].actionType).toBe('CREATE');
      expect(result[1].actionType).toBe('UPDATE');
    });

    it('should filter exchanges by action type', async () => {
      const mockExchanges = [
        {
          messageId: 'PERS-EMP-001-CREATE-001',
          actionType: 'CREATE',
          direction: 'OUTBOUND',
          status: 'PROCESSED',
          processedAt: new Date('2025-10-15T10:00:00Z'),
          createdAt: new Date('2025-10-15T10:00:00Z'),
          config: {
            name: 'Oracle HCM',
            systemType: 'ERP',
          },
        },
      ];

      mockPrisma.personnelInfoExchange.findMany.mockResolvedValue(mockExchanges);

      const result = await service.getUserExchanges('user-1', { actionType: 'CREATE' });

      expect(result).toHaveLength(1);
      expect(result[0].actionType).toBe('CREATE');
    });

    it('should filter exchanges by direction', async () => {
      const mockExchanges = [
        {
          messageId: 'PERS-EMP-001-CREATE-001',
          actionType: 'CREATE',
          direction: 'OUTBOUND',
          status: 'PROCESSED',
          processedAt: new Date('2025-10-15T10:00:00Z'),
          createdAt: new Date('2025-10-15T10:00:00Z'),
          config: {
            name: 'Oracle HCM',
            systemType: 'ERP',
          },
        },
      ];

      mockPrisma.personnelInfoExchange.findMany.mockResolvedValue(mockExchanges);

      const result = await service.getUserExchanges('user-1', { direction: 'OUTBOUND' });

      expect(result).toHaveLength(1);
      expect(result[0].direction).toBe('OUTBOUND');
    });

    it('should return empty array if no exchanges found', async () => {
      mockPrisma.personnelInfoExchange.findMany.mockResolvedValue([]);

      const result = await service.getUserExchanges('user-no-exchanges');

      expect(result).toEqual([]);
    });
  });

  describe('getExternalPersonnelExchanges', () => {
    it('should return exchanges by external employee ID', async () => {
      const mockExchanges = [
        {
          messageId: 'PERS-EMP-001-CREATE-001',
          externalPersonnelId: 'ERP-EMP-001',
          actionType: 'CREATE',
          direction: 'INBOUND',
          status: 'PROCESSED',
          firstName: 'John',
          lastName: 'Smith',
          email: 'jsmith@example.com',
          employeeNumber: 'EMP-001',
          processedAt: new Date('2025-10-15T10:00:00Z'),
          createdAt: new Date('2025-10-15T10:00:00Z'),
          config: {
            name: 'Oracle HCM',
            systemType: 'ERP',
          },
        },
      ];

      mockPrisma.personnelInfoExchange.findMany.mockResolvedValue(mockExchanges);

      const result = await service.getExternalPersonnelExchanges('ERP-EMP-001');

      expect(result).toHaveLength(1);
      expect(result[0].messageId).toBe('PERS-EMP-001-CREATE-001');
    });

    it('should return empty array if no exchanges found', async () => {
      mockPrisma.personnelInfoExchange.findMany.mockResolvedValue([]);

      const result = await service.getExternalPersonnelExchanges('INVALID-EMP');

      expect(result).toEqual([]);
    });
  });

  describe('retryExchange', () => {
    it('should retry failed OUTBOUND exchange successfully', async () => {
      const mockFailedExchange = {
        messageId: 'PERS-EMP-001-CREATE-123',
        actionType: 'CREATE',
        direction: 'OUTBOUND',
        status: 'FAILED',
        configId: 'config-1',
        personnelId: 'user-1',
      };

      const mockUser = {
        id: 'user-1',
        employeeId: 'EMP-001',
        employeeNumber: 'EMP-001',
        username: 'jsmith',
        name: 'John Smith',
        firstName: 'John',
        lastName: 'Smith',
        email: 'jsmith@example.com',
        isActive: true,
      };

      const mockConfig = {
        id: 'config-1',
        name: 'Oracle HCM',
        type: 'ERP',
        enabled: true,
      };

      mockPrisma.personnelInfoExchange.findUnique.mockResolvedValue(mockFailedExchange);
      mockPrisma.personnelInfoExchange.update.mockResolvedValueOnce({
        ...mockFailedExchange,
        status: 'PENDING',
        errorMessage: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.personnelInfoExchange.create.mockResolvedValue({
        id: 'exchange-retry',
        messageId: 'PERS-EMP-001-CREATE-123-retry',
        status: 'PENDING',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValueOnce({});

      const result = await service.retryExchange('PERS-EMP-001-CREATE-123', 'user-admin');

      expect(result).toBeDefined();
      expect(mockPrisma.personnelInfoExchange.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { messageId: 'PERS-EMP-001-CREATE-123' },
          data: {
            status: 'PENDING',
            errorMessage: null,
          },
        })
      );
    });

    it('should throw error if exchange not found for retry', async () => {
      mockPrisma.personnelInfoExchange.findUnique.mockResolvedValue(null);

      await expect(
        service.retryExchange('invalid-message-id', 'user-admin')
      ).rejects.toThrow('Personnel info exchange invalid-message-id not found');
    });

    it('should throw error if exchange already processed', async () => {
      const mockProcessedExchange = {
        messageId: 'PERS-EMP-001-CREATE-123',
        status: 'PROCESSED',
      };

      mockPrisma.personnelInfoExchange.findUnique.mockResolvedValue(mockProcessedExchange);

      await expect(
        service.retryExchange('PERS-EMP-001-CREATE-123', 'user-admin')
      ).rejects.toThrow('Exchange PERS-EMP-001-CREATE-123 is already processed, cannot retry');
    });
  });

  describe('bulkSyncPersonnel', () => {
    it('should process multiple personnel records successfully', async () => {
      const personnelRecords = [
        {
          messageType: 'PersonnelInfo',
          messageId: 'BULK-CREATE-001',
          sender: 'Oracle HCM',
          receiver: 'MES',
          timestamp: '2025-10-15T10:00:00Z',
          actionType: 'CREATE',
          personnel: {
            externalId: 'mjones',
            employeeNumber: 'EMP-002',
            firstName: 'Mary',
            lastName: 'Jones',
            email: 'mjones@example.com',
          },
        },
        {
          messageType: 'PersonnelInfo',
          messageId: 'BULK-UPDATE-001',
          sender: 'Oracle HCM',
          receiver: 'MES',
          timestamp: '2025-10-15T10:00:00Z',
          actionType: 'UPDATE',
          personnel: {
            externalId: 'jsmith',
            employeeNumber: 'EMP-001',
            email: 'jsmith.updated@example.com',
          },
        },
      ];

      const mockConfig = {
        id: 'config-1',
        name: 'Oracle HCM',
        type: 'ERP',
        enabled: true,
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);

      // Mock for first record (CREATE)
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);
      mockPrisma.personnelInfoExchange.create.mockResolvedValueOnce({
        id: 'exchange-1',
        messageId: 'BULK-CREATE-001',
      });
      mockPrisma.user.create.mockResolvedValueOnce({
        id: 'user-new',
        employeeId: 'EMP-002',
        username: 'mjones',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValueOnce({
        id: 'exchange-1',
        status: 'PROCESSED',
      });

      // Mock for second record (UPDATE)
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'user-1', employeeId: 'EMP-001', username: 'jsmith' });
      mockPrisma.personnelInfoExchange.create.mockResolvedValueOnce({
        id: 'exchange-2',
        messageId: 'BULK-UPDATE-001',
      });
      mockPrisma.user.update.mockResolvedValueOnce({
        id: 'user-1',
        email: 'jsmith.updated@example.com',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValueOnce({
        id: 'exchange-2',
        status: 'PROCESSED',
      });

      const result = await service.bulkSyncPersonnel({
        configId: 'config-1',
        personnelData: personnelRecords,
        createdBy: 'system',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('PROCESSED');
      expect(result[1].status).toBe('PROCESSED');
    });

    it('should handle partial failures in bulk sync', async () => {
      const personnelRecords = [
        {
          messageType: 'PersonnelInfo',
          messageId: 'BULK-CREATE-001',
          sender: 'Oracle HCM',
          receiver: 'MES',
          timestamp: '2025-10-15T10:00:00Z',
          actionType: 'CREATE',
          personnel: {
            externalId: 'mjones',
            employeeNumber: 'EMP-002',
            firstName: 'Mary',
            lastName: 'Jones',
            email: 'mjones@example.com',
          },
        },
        {
          messageType: 'PersonnelInfo',
          messageId: 'BULK-UPDATE-001',
          sender: 'Oracle HCM',
          receiver: 'MES',
          timestamp: '2025-10-15T10:00:00Z',
          actionType: 'UPDATE',
          personnel: {
            externalId: 'invalid-username',
            employeeNumber: 'INVALID-EMP',
          },
        },
      ];

      const mockConfig = {
        id: 'config-1',
        name: 'Oracle HCM',
        type: 'ERP',
        enabled: true,
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);

      // First succeeds
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);
      mockPrisma.personnelInfoExchange.create.mockResolvedValueOnce({
        id: 'exchange-1',
        messageId: 'BULK-CREATE-001',
      });
      mockPrisma.user.create.mockResolvedValueOnce({
        id: 'user-new',
        employeeId: 'EMP-002',
        username: 'mjones',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValueOnce({
        status: 'PROCESSED',
      });

      // Second fails (user not found)
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);
      mockPrisma.personnelInfoExchange.create.mockResolvedValueOnce({
        id: 'exchange-2',
        messageId: 'BULK-UPDATE-001',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValueOnce({});

      const result = await service.bulkSyncPersonnel({
        configId: 'config-1',
        personnelData: personnelRecords,
        createdBy: 'system',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('PROCESSED');
      expect(result[1].status).toBe('FAILED');
    });
  });

  describe('syncAllActiveUsers', () => {
    it('should export all active users to ERP', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          employeeId: 'EMP-001',
          username: 'jsmith',
          isActive: true,
        },
        {
          id: 'user-2',
          employeeId: 'EMP-002',
          username: 'mjones',
          isActive: true,
        },
      ];

      const mockConfig = {
        id: 'config-1',
        name: 'Oracle HCM',
        type: 'ERP',
        enabled: true,
      };

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);

      // Mock for first user
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUsers[0]);
      mockPrisma.personnelInfoExchange.create.mockResolvedValueOnce({
        id: 'exchange-1',
        messageId: 'SYNC-ALL-001',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValueOnce({
        status: 'PROCESSED',
      });

      // Mock for second user
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUsers[1]);
      mockPrisma.personnelInfoExchange.create.mockResolvedValueOnce({
        id: 'exchange-2',
        messageId: 'SYNC-ALL-002',
      });
      mockPrisma.personnelInfoExchange.update.mockResolvedValueOnce({
        status: 'PROCESSED',
      });

      const result = await service.syncAllActiveUsers({
        configId: 'config-1',
        createdBy: 'user-admin',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('PROCESSED');
      expect(result[1].status).toBe('PROCESSED');
    });

    it('should handle no active users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.syncAllActiveUsers({
        configId: 'config-1',
        createdBy: 'user-admin',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });
  });
});
