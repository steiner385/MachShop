import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { BuildRecordService } from '../../services/BuildRecordService';
import { prisma } from '../../lib/prisma';
import { BuildRecordStatus, FinalDisposition, OperationStatus } from '@prisma/client';

// Mock Prisma client
vi.mock('../../lib/prisma', () => ({
  prisma: {
    buildRecord: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    buildRecordOperation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    buildRecordSignature: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    buildRecordStatusHistory: {
      create: vi.fn(),
    },
    workOrder: {
      findUnique: vi.fn(),
    },
    operation: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('BuildRecordService', () => {
  let buildRecordService: BuildRecordService;
  const mockPrisma = prisma as any;

  beforeEach(() => {
    buildRecordService = new BuildRecordService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createBuildRecord', () => {
    const mockWorkOrder = {
      id: 'wo-1',
      orderNumber: 'WO-2024-001',
      engineSerial: 'ENG123456',
      operations: [
        {
          id: 'op-1',
          operationNumber: '010',
          description: 'Assembly operation',
          standardTimeMinutes: 60,
          workCenterId: 'wc-1',
        },
        {
          id: 'op-2',
          operationNumber: '020',
          description: 'Inspection operation',
          standardTimeMinutes: 30,
          workCenterId: 'wc-2',
        },
      ],
    };

    const mockUser = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
    };

    const createBuildRecordData = {
      workOrderId: 'wo-1',
      operatorId: 'user-1',
    };

    it('should create a build record with operations successfully', async () => {
      const mockBuildRecord = {
        id: 'br-1',
        buildRecordNumber: 'BR-2024-001',
        workOrderId: 'wo-1',
        status: BuildRecordStatus.PENDING,
        finalDisposition: FinalDisposition.PENDING,
        operatorId: 'user-1',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOperations = [
        {
          id: 'bro-1',
          buildRecordId: 'br-1',
          operationId: 'op-1',
          status: OperationStatus.PENDING,
          standardTimeMinutes: 60,
        },
        {
          id: 'bro-2',
          buildRecordId: 'br-1',
          operationId: 'op-2',
          status: OperationStatus.PENDING,
          standardTimeMinutes: 30,
        },
      ];

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockImplementation(async (callback: Function) => {
        return callback({
          buildRecord: {
            create: vi.fn().mockResolvedValue(mockBuildRecord),
          },
          buildRecordOperation: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
            findMany: vi.fn().mockResolvedValue(mockOperations),
          },
          buildRecordStatusHistory: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await buildRecordService.createBuildRecord(createBuildRecordData);

      expect(mockPrisma.workOrder.findUnique).toHaveBeenCalledWith({
        where: { id: 'wo-1' },
        include: { operations: true },
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });

      expect(result).toEqual({
        ...mockBuildRecord,
        operations: mockOperations,
      });
    });

    it('should throw error if work order not found', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);

      await expect(
        buildRecordService.createBuildRecord(createBuildRecordData)
      ).rejects.toThrow('Work order not found');
    });

    it('should throw error if operator not found', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        buildRecordService.createBuildRecord(createBuildRecordData)
      ).rejects.toThrow('Operator not found');
    });

    it('should generate unique build record number', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      let buildRecordCreateData: any;
      mockPrisma.$transaction.mockImplementation(async (callback: Function) => {
        return callback({
          buildRecord: {
            create: vi.fn().mockImplementation((data) => {
              buildRecordCreateData = data;
              return Promise.resolve({
                id: 'br-1',
                ...data.data,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }),
          },
          buildRecordOperation: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
            findMany: vi.fn().mockResolvedValue([]),
          },
          buildRecordStatusHistory: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });

      await buildRecordService.createBuildRecord(createBuildRecordData);

      expect(buildRecordCreateData.data.buildRecordNumber).toMatch(/^BR-\d{4}-\d{3}$/);
    });
  });

  describe('getBuildRecordById', () => {
    it('should return build record with all relations', async () => {
      const mockBuildRecord = {
        id: 'br-1',
        buildRecordNumber: 'BR-2024-001',
        workOrderId: 'wo-1',
        status: BuildRecordStatus.IN_PROGRESS,
        workOrder: {
          id: 'wo-1',
          orderNumber: 'WO-2024-001',
          engineSerial: 'ENG123456',
        },
        operations: [],
        deviations: [],
        photos: [],
        documents: [],
        signatures: [],
        statusHistory: [],
      };

      mockPrisma.buildRecord.findUnique.mockResolvedValue(mockBuildRecord);

      const result = await buildRecordService.getBuildRecordById('br-1');

      expect(mockPrisma.buildRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'br-1' },
        include: {
          workOrder: true,
          operator: true,
          inspector: true,
          operations: {
            include: {
              operation: {
                include: {
                  workCenter: true,
                },
              },
              operator: true,
              inspector: true,
              signatures: {
                include: {
                  signer: true,
                },
              },
            },
          },
          deviations: {
            include: {
              approvals: {
                include: {
                  approver: true,
                },
              },
            },
          },
          photos: true,
          documents: true,
          signatures: {
            include: {
              signer: true,
            },
          },
          statusHistory: {
            include: {
              changer: true,
            },
            orderBy: {
              changedAt: 'desc',
            },
          },
        },
      });

      expect(result).toEqual(mockBuildRecord);
    });

    it('should return null if build record not found', async () => {
      mockPrisma.buildRecord.findUnique.mockResolvedValue(null);

      const result = await buildRecordService.getBuildRecordById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('startOperation', () => {
    const mockOperation = {
      id: 'bro-1',
      buildRecordId: 'br-1',
      operationId: 'op-1',
      status: OperationStatus.PENDING,
      operatorId: null,
      startedAt: null,
    };

    it('should start operation successfully', async () => {
      const startedOperation = {
        ...mockOperation,
        status: OperationStatus.IN_PROGRESS,
        operatorId: 'user-1',
        startedAt: new Date(),
      };

      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(mockOperation);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'John Doe' });
      mockPrisma.buildRecordOperation.update.mockResolvedValue(startedOperation);

      const result = await buildRecordService.startOperation('bro-1', 'user-1');

      expect(mockPrisma.buildRecordOperation.update).toHaveBeenCalledWith({
        where: { id: 'bro-1' },
        data: {
          status: OperationStatus.IN_PROGRESS,
          operatorId: 'user-1',
          startedAt: expect.any(Date),
        },
        include: {
          operation: {
            include: {
              workCenter: true,
            },
          },
          operator: true,
          inspector: true,
          signatures: {
            include: {
              signer: true,
            },
          },
        },
      });

      expect(result).toEqual(startedOperation);
    });

    it('should throw error if operation not found', async () => {
      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(null);

      await expect(
        buildRecordService.startOperation('nonexistent', 'user-1')
      ).rejects.toThrow('Operation not found');
    });

    it('should throw error if operation already started', async () => {
      const startedOperation = {
        ...mockOperation,
        status: OperationStatus.IN_PROGRESS,
        startedAt: new Date(),
      };

      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(startedOperation);

      await expect(
        buildRecordService.startOperation('bro-1', 'user-1')
      ).rejects.toThrow('Operation has already been started');
    });

    it('should throw error if operator not found', async () => {
      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(mockOperation);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        buildRecordService.startOperation('bro-1', 'nonexistent')
      ).rejects.toThrow('Operator not found');
    });
  });

  describe('completeOperation', () => {
    const mockOperation = {
      id: 'bro-1',
      buildRecordId: 'br-1',
      operationId: 'op-1',
      status: OperationStatus.IN_PROGRESS,
      operatorId: 'user-1',
      startedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      completedAt: null,
      actualTimeMinutes: null,
    };

    const completeOperationData = {
      notes: 'Operation completed successfully',
      toolsUsed: ['Tool 1', 'Tool 2'],
      partsUsed: [
        { partNumber: 'P001', quantity: 2, serialNumbers: ['S001', 'S002'] },
      ],
    };

    it('should complete operation successfully', async () => {
      const completedOperation = {
        ...mockOperation,
        status: OperationStatus.COMPLETED,
        completedAt: new Date(),
        actualTimeMinutes: 60,
        notes: completeOperationData.notes,
        toolsUsed: completeOperationData.toolsUsed,
        partsUsed: completeOperationData.partsUsed,
      };

      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(mockOperation);
      mockPrisma.buildRecordOperation.update.mockResolvedValue(completedOperation);

      const result = await buildRecordService.completeOperation('bro-1', completeOperationData);

      expect(mockPrisma.buildRecordOperation.update).toHaveBeenCalledWith({
        where: { id: 'bro-1' },
        data: {
          status: OperationStatus.COMPLETED,
          completedAt: expect.any(Date),
          actualTimeMinutes: expect.any(Number),
          notes: completeOperationData.notes,
          toolsUsed: completeOperationData.toolsUsed,
          partsUsed: completeOperationData.partsUsed,
        },
        include: {
          operation: {
            include: {
              workCenter: true,
            },
          },
          operator: true,
          inspector: true,
          signatures: {
            include: {
              signer: true,
            },
          },
        },
      });

      expect(result).toEqual(completedOperation);
    });

    it('should calculate actual time correctly', async () => {
      const startTime = new Date(Date.now() - 90 * 60 * 1000); // 90 minutes ago
      const operationWithStartTime = {
        ...mockOperation,
        startedAt: startTime,
      };

      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(operationWithStartTime);

      let updateData: any;
      mockPrisma.buildRecordOperation.update.mockImplementation((args) => {
        updateData = args.data;
        return Promise.resolve({
          ...operationWithStartTime,
          ...args.data,
        });
      });

      await buildRecordService.completeOperation('bro-1', completeOperationData);

      expect(updateData.actualTimeMinutes).toBe(90);
    });

    it('should throw error if operation not found', async () => {
      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(null);

      await expect(
        buildRecordService.completeOperation('nonexistent', completeOperationData)
      ).rejects.toThrow('Operation not found');
    });

    it('should throw error if operation not in progress', async () => {
      const pendingOperation = {
        ...mockOperation,
        status: OperationStatus.PENDING,
      };

      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(pendingOperation);

      await expect(
        buildRecordService.completeOperation('bro-1', completeOperationData)
      ).rejects.toThrow('Operation must be in progress to complete');
    });
  });

  describe('inspectorSignOff', () => {
    const mockOperation = {
      id: 'bro-1',
      buildRecordId: 'br-1',
      operationId: 'op-1',
      status: OperationStatus.COMPLETED,
      signatures: [],
    };

    const signOffData = {
      inspectorId: 'inspector-1',
      comments: 'Inspection passed',
      signatureData: 'base64signature',
    };

    it('should create inspector signature successfully', async () => {
      const mockSignature = {
        id: 'sig-1',
        type: 'INSPECTOR',
        signedAt: new Date(),
        signedBy: 'inspector-1',
        operationId: 'bro-1',
        comments: 'Inspection passed',
        isValid: true,
        signatureData: 'base64signature',
      };

      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(mockOperation);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'inspector-1',
        name: 'Jane Inspector',
        role: 'INSPECTOR',
      });
      mockPrisma.buildRecordSignature.create.mockResolvedValue(mockSignature);

      const result = await buildRecordService.inspectorSignOff('bro-1', signOffData);

      expect(mockPrisma.buildRecordSignature.create).toHaveBeenCalledWith({
        data: {
          type: 'INSPECTOR',
          signedAt: expect.any(Date),
          signedBy: 'inspector-1',
          operationId: 'bro-1',
          comments: 'Inspection passed',
          isValid: true,
          signatureData: 'base64signature',
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
        },
        include: {
          signer: true,
        },
      });

      expect(result).toEqual(mockSignature);
    });

    it('should throw error if operation not found', async () => {
      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(null);

      await expect(
        buildRecordService.inspectorSignOff('nonexistent', signOffData)
      ).rejects.toThrow('Operation not found');
    });

    it('should throw error if operation not completed', async () => {
      const incompleteOperation = {
        ...mockOperation,
        status: OperationStatus.IN_PROGRESS,
      };

      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(incompleteOperation);

      await expect(
        buildRecordService.inspectorSignOff('bro-1', signOffData)
      ).rejects.toThrow('Operation must be completed before inspector sign-off');
    });

    it('should throw error if inspector already signed', async () => {
      const operationWithSignature = {
        ...mockOperation,
        signatures: [
          {
            id: 'sig-1',
            type: 'INSPECTOR',
            signedBy: 'inspector-1',
            isValid: true,
          },
        ],
      };

      mockPrisma.buildRecordOperation.findUnique.mockResolvedValue(operationWithSignature);

      await expect(
        buildRecordService.inspectorSignOff('bro-1', signOffData)
      ).rejects.toThrow('Inspector has already signed off on this operation');
    });
  });

  describe('updateBuildRecordStatus', () => {
    const mockBuildRecord = {
      id: 'br-1',
      status: BuildRecordStatus.IN_PROGRESS,
    };

    it('should update build record status successfully', async () => {
      const updatedBuildRecord = {
        ...mockBuildRecord,
        status: BuildRecordStatus.COMPLETED,
        completedAt: new Date(),
      };

      mockPrisma.buildRecord.findUnique.mockResolvedValue(mockBuildRecord);
      mockPrisma.$transaction.mockImplementation(async (callback: Function) => {
        return callback({
          buildRecord: {
            update: vi.fn().mockResolvedValue(updatedBuildRecord),
          },
          buildRecordStatusHistory: {
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await buildRecordService.updateBuildRecordStatus(
        'br-1',
        BuildRecordStatus.COMPLETED,
        'user-1',
        'All operations completed'
      );

      expect(result).toEqual(updatedBuildRecord);
    });

    it('should create status history entry', async () => {
      mockPrisma.buildRecord.findUnique.mockResolvedValue(mockBuildRecord);

      let statusHistoryData: any;
      mockPrisma.$transaction.mockImplementation(async (callback: Function) => {
        return callback({
          buildRecord: {
            update: vi.fn().mockResolvedValue(mockBuildRecord),
          },
          buildRecordStatusHistory: {
            create: vi.fn().mockImplementation((data) => {
              statusHistoryData = data;
              return Promise.resolve({});
            }),
          },
        });
      });

      await buildRecordService.updateBuildRecordStatus(
        'br-1',
        BuildRecordStatus.COMPLETED,
        'user-1',
        'All operations completed'
      );

      expect(statusHistoryData.data).toEqual({
        buildRecordId: 'br-1',
        status: BuildRecordStatus.COMPLETED,
        changedAt: expect.any(Date),
        changedBy: 'user-1',
        reason: 'All operations completed',
      });
    });

    it('should throw error if build record not found', async () => {
      mockPrisma.buildRecord.findUnique.mockResolvedValue(null);

      await expect(
        buildRecordService.updateBuildRecordStatus(
          'nonexistent',
          BuildRecordStatus.COMPLETED,
          'user-1'
        )
      ).rejects.toThrow('Build record not found');
    });
  });

  describe('listBuildRecords', () => {
    const mockBuildRecords = [
      {
        id: 'br-1',
        buildRecordNumber: 'BR-2024-001',
        status: BuildRecordStatus.IN_PROGRESS,
        workOrder: {
          orderNumber: 'WO-2024-001',
          engineSerial: 'ENG123456',
        },
      },
      {
        id: 'br-2',
        buildRecordNumber: 'BR-2024-002',
        status: BuildRecordStatus.COMPLETED,
        workOrder: {
          orderNumber: 'WO-2024-002',
          engineSerial: 'ENG789012',
        },
      },
    ];

    it('should return paginated build records', async () => {
      mockPrisma.buildRecord.findMany.mockResolvedValue(mockBuildRecords);

      const result = await buildRecordService.listBuildRecords({
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.buildRecord.findMany).toHaveBeenCalledWith({
        include: {
          workOrder: true,
          operator: true,
          inspector: true,
          operations: true,
          deviations: true,
          _count: {
            select: {
              photos: true,
              documents: true,
              signatures: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });

      expect(result).toEqual(mockBuildRecords);
    });

    it('should apply status filter', async () => {
      mockPrisma.buildRecord.findMany.mockResolvedValue([mockBuildRecords[0]]);

      await buildRecordService.listBuildRecords({
        page: 1,
        limit: 10,
        status: BuildRecordStatus.IN_PROGRESS,
      });

      expect(mockPrisma.buildRecord.findMany).toHaveBeenCalledWith({
        where: {
          status: BuildRecordStatus.IN_PROGRESS,
        },
        include: {
          workOrder: true,
          operator: true,
          inspector: true,
          operations: true,
          deviations: true,
          _count: {
            select: {
              photos: true,
              documents: true,
              signatures: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
    });

    it('should apply search filter', async () => {
      await buildRecordService.listBuildRecords({
        page: 1,
        limit: 10,
        search: 'ENG123',
      });

      expect(mockPrisma.buildRecord.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              buildRecordNumber: {
                contains: 'ENG123',
                mode: 'insensitive',
              },
            },
            {
              workOrder: {
                orderNumber: {
                  contains: 'ENG123',
                  mode: 'insensitive',
                },
              },
            },
            {
              workOrder: {
                engineSerial: {
                  contains: 'ENG123',
                  mode: 'insensitive',
                },
              },
            },
          ],
        },
        include: {
          workOrder: true,
          operator: true,
          inspector: true,
          operations: true,
          deviations: true,
          _count: {
            select: {
              photos: true,
              documents: true,
              signatures: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
    });
  });
});