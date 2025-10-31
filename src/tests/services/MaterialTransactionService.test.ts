import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient, ERPTransactionType, B2MMessageStatus, IntegrationDirection } from '@prisma/client';
import { MaterialTransactionService } from '../../services/MaterialTransactionService';
import prisma from '../../lib/database';

// Mock Prisma Client
vi.mock('../../lib/database', () => ({
  default: {
    part: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    integrationConfig: {
      findUnique: vi.fn(),
    },
    workOrder: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    inventory: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    eRPMaterialTransaction: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    materialTransaction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('MaterialTransactionService', () => {
  let service: MaterialTransactionService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = prisma;
    service = new MaterialTransactionService();
    vi.clearAllMocks();
  });

  describe('exportMaterialTransaction', () => {
    const mockPart = {
      id: 'part-1',
      partNumber: 'PN-123',
      description: 'Test Part',
      unitOfMeasure: 'EA',
      quantityOnHand: 500,
      isActive: true,
    };

    const mockConfig = {
      id: 'config-1',
      name: 'Oracle Fusion',
      type: 'ERP',
      enabled: true,
    };

    it('should export ISSUE transaction successfully', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'txn-1',
        messageId: 'MAT-PN-123-ISSUE-123456',
        transactionType: 'ISSUE',
        direction: 'OUTBOUND',
        status: 'PENDING',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({
        id: 'txn-1',
        status: 'PROCESSED',
      });

      const result = await service.exportMaterialTransaction({
        configId: 'config-1',
        transactionType: 'ISSUE',
        partId: 'part-1',
        quantity: 10,
        unitOfMeasure: 'EA',
        workOrderId: 'wo-1',
        fromLocation: 'WH-01',
        toLocation: 'PROD-FLOOR',
        movementType: 'ISSUE',
        createdBy: 'user-admin',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
      expect(mockPrisma.eRPMaterialTransaction.create).toHaveBeenCalledOnce();
    });

    it('should export RECEIPT transaction successfully', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'txn-1',
        messageId: 'MAT-PN-123-RECEIPT-123456',
        transactionType: 'RECEIPT',
        direction: 'OUTBOUND',
        status: 'PENDING',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({
        id: 'txn-1',
        status: 'PROCESSED',
      });

      const result = await service.exportMaterialTransaction({
        configId: 'config-1',
        transactionType: 'RECEIPT',
        partId: 'part-1',
        quantity: 100,
        unitOfMeasure: 'EA',
        toLocation: 'WH-01',
        movementType: 'RECEIPT',
        createdBy: 'user-receiving',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
    });

    it('should export RETURN transaction successfully', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'txn-1',
        messageId: 'MAT-PN-123-RETURN-123456',
        transactionType: 'RETURN',
        direction: 'OUTBOUND',
        status: 'PENDING',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({
        id: 'txn-1',
        status: 'PROCESSED',
      });

      const result = await service.exportMaterialTransaction({
        configId: 'config-1',
        transactionType: 'RETURN',
        partId: 'part-1',
        quantity: 5,
        unitOfMeasure: 'EA',
        workOrderId: 'wo-1',
        reasonCode: 'OVERISSUE',
        fromLocation: 'PROD-FLOOR',
        toLocation: 'WH-01',
        movementType: 'RETURN',
        createdBy: 'user-operator',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
    });

    it('should export SCRAP transaction successfully', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'txn-1',
        messageId: 'MAT-PN-123-SCRAP-123456',
        transactionType: 'SCRAP',
        direction: 'OUTBOUND',
        status: 'PENDING',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({
        id: 'txn-1',
        status: 'PROCESSED',
      });

      const result = await service.exportMaterialTransaction({
        configId: 'config-1',
        transactionType: 'SCRAP',
        partId: 'part-1',
        quantity: 2,
        unitOfMeasure: 'EA',
        workOrderId: 'wo-1',
        reasonCode: 'DEFECTIVE',
        fromLocation: 'PROD-FLOOR',
        movementType: 'SCRAP',
        createdBy: 'user-qc',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
    });

    it('should throw error if part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);

      await expect(
        service.exportMaterialTransaction({
          configId: 'config-1',
          transactionType: 'ISSUE',
          partId: 'invalid-part',
          quantity: 10,
          unitOfMeasure: 'EA',
          movementType: 'ISSUE',
          createdBy: 'user-admin',
        })
      ).rejects.toThrow('Part invalid-part not found');
    });

    it('should throw error if config not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(null);

      await expect(
        service.exportMaterialTransaction({
          configId: 'invalid-config',
          transactionType: 'ISSUE',
          partId: 'part-1',
          quantity: 10,
          unitOfMeasure: 'EA',
          movementType: 'ISSUE',
          createdBy: 'user-admin',
        })
      ).rejects.toThrow('Integration config invalid-config not found');
    });

    it('should throw error if config disabled', async () => {
      const disabledConfig = { ...mockConfig, enabled: false };

      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(disabledConfig);

      await expect(
        service.exportMaterialTransaction({
          configId: 'config-1',
          transactionType: 'ISSUE',
          partId: 'part-1',
          quantity: 10,
          unitOfMeasure: 'EA',
          movementType: 'ISSUE',
          createdBy: 'user-admin',
        })
      ).rejects.toThrow('Integration config config-1 is disabled');
    });
  });

  describe('processInboundTransaction', () => {
    const mockConfig = {
      id: 'config-1',
      name: 'Oracle Fusion',
      type: 'ERP',
      enabled: true,
    };

    const mockPart = {
      id: 'part-1',
      partNumber: 'PN-123',
      quantityOnHand: 100,
      isActive: true,
    };

    it('should process inbound ISSUE transaction successfully', async () => {
      const messagePayload = {
        messageType: 'MaterialTransaction',
        messageId: 'ERP-ISSUE-001',
        sender: 'Oracle',
        receiver: 'MES',
        transactionType: 'ISSUE',
        timestamp: '2025-10-15T10:00:00Z',
        material: {
          partNumber: 'PN-123',
          quantity: 10,
          unitOfMeasure: 'EA',
        },
        locations: {
          from: 'WH-01',
          to: 'PROD-FLOOR',
        },
        workOrderReference: 'WO-001',
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst.mockResolvedValue(mockPart);
      mockPrisma.workOrder.findFirst.mockResolvedValue({ id: 'wo-1' });
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'txn-1',
        messageId: 'ERP-ISSUE-001',
        status: 'PENDING',
        direction: 'INBOUND',
      });
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.inventory.findFirst.mockResolvedValue({
        id: 'inv-1',
        partId: 'part-1',
        quantity: 100,
        location: 'PROD-FLOOR',
      });
      mockPrisma.materialTransaction.create.mockResolvedValue({
        id: 'internal-txn-1',
      });
      mockPrisma.part.update.mockResolvedValue({
        ...mockPart,
        quantityOnHand: 90,
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({
        id: 'txn-1',
        status: 'PROCESSED',
      });

      const result = await service.processInboundTransaction({
        configId: 'config-1',
        messagePayload,
        createdBy: 'system',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
      expect(mockPrisma.materialTransaction.create).toHaveBeenCalledOnce();
      expect(mockPrisma.part.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'part-1' },
          data: expect.objectContaining({
            updatedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should process inbound RECEIPT transaction successfully', async () => {
      const messagePayload = {
        messageType: 'MaterialTransaction',
        messageId: 'ERP-RECEIPT-001',
        sender: 'Oracle',
        receiver: 'MES',
        transactionType: 'RECEIPT',
        timestamp: '2025-10-15T09:00:00Z',
        material: {
          partNumber: 'PN-123',
          quantity: 100,
          unitOfMeasure: 'EA',
        },
        locations: {
          to: 'WH-01',
        },
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst.mockResolvedValue(mockPart);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'txn-1',
        messageId: 'ERP-RECEIPT-001',
        status: 'PENDING',
        direction: 'INBOUND',
      });
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.inventory.findFirst.mockResolvedValue({
        id: 'inv-1',
        partId: 'part-1',
        quantity: 100,
        location: 'WH-01',
      });
      mockPrisma.materialTransaction.create.mockResolvedValue({
        id: 'internal-txn-1',
      });
      mockPrisma.part.update.mockResolvedValue({
        ...mockPart,
        quantityOnHand: 200,
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({
        id: 'txn-1',
        status: 'PROCESSED',
      });

      const result = await service.processInboundTransaction({
        configId: 'config-1',
        messagePayload,
        createdBy: 'system',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('PROCESSED');
      expect(mockPrisma.part.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'part-1' },
          data: expect.objectContaining({
            updatedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should throw error if part not found for inbound transaction', async () => {
      const messagePayload = {
        messageType: 'MaterialTransaction',
        messageId: 'ERP-ISSUE-001',
        sender: 'Oracle',
        receiver: 'MES',
        transactionType: 'ISSUE',
        timestamp: '2025-10-15T10:00:00Z',
        material: {
          partNumber: 'INVALID-PN',
          quantity: 10,
          unitOfMeasure: 'EA',
        },
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst.mockResolvedValue(null);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'txn-1',
        messageId: 'ERP-ISSUE-001',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({});

      await expect(
        service.processInboundTransaction({
          configId: 'config-1',
          messagePayload,
          createdBy: 'system',
        })
      ).rejects.toThrow('Part INVALID-PN not found in MES');
    });
  });

  describe('getTransactionStatus', () => {
    it('should return transaction status successfully', async () => {
      const mockTransaction = {
        messageId: 'MAT-PN-123-ISSUE-001',
        transactionType: 'ISSUE',
        direction: 'OUTBOUND',
        status: 'PROCESSED',
        externalPartId: 'PN-123',
        quantity: 10,
        unitOfMeasure: 'EA',
        lotNumber: null,
        serialNumber: null,
        externalWorkOrderId: null,
        processedAt: new Date('2025-10-15T10:00:00Z'),
        erpTransactionId: null,
        errorMessage: null,
        createdAt: new Date('2025-10-15T10:00:00Z'),
        part: {
          partNumber: 'PN-123',
          description: 'Test Part',
        },
        workOrder: null,
      };

      mockPrisma.eRPMaterialTransaction.findUnique.mockResolvedValue(mockTransaction);

      const result = await service.getTransactionStatus('MAT-PN-123-ISSUE-001');

      expect(result).toBeDefined();
      expect(result.messageId).toBe('MAT-PN-123-ISSUE-001');
      expect(result.status).toBe('PROCESSED');
      expect(result.partNumber).toBe('PN-123');
    });

    it('should throw error if transaction not found', async () => {
      mockPrisma.eRPMaterialTransaction.findUnique.mockResolvedValue(null);

      await expect(
        service.getTransactionStatus('invalid-message-id')
      ).rejects.toThrow('Material transaction invalid-message-id not found');
    });
  });

  describe('getPartTransactions', () => {
    it('should return all transactions for a part', async () => {
      const mockTransactions = [
        {
          messageId: 'MAT-PN-123-ISSUE-001',
          transactionType: 'ISSUE',
          direction: 'OUTBOUND',
          quantity: 10,
          unitOfMeasure: 'EA',
          lotNumber: null,
          serialNumber: null,
          status: 'PROCESSED',
          transactionDate: new Date('2025-10-15T10:00:00Z'),
          processedAt: new Date('2025-10-15T10:00:00Z'),
          erpTransactionId: null,
        },
        {
          messageId: 'MAT-PN-123-RECEIPT-001',
          transactionType: 'RECEIPT',
          direction: 'INBOUND',
          quantity: 100,
          unitOfMeasure: 'EA',
          lotNumber: null,
          serialNumber: null,
          status: 'PROCESSED',
          transactionDate: new Date('2025-10-15T09:00:00Z'),
          processedAt: new Date('2025-10-15T09:00:00Z'),
          erpTransactionId: null,
        },
      ];

      mockPrisma.eRPMaterialTransaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getPartTransactions('part-1');

      expect(result).toHaveLength(2);
      expect(result[0].transactionType).toBe('ISSUE');
      expect(result[1].transactionType).toBe('RECEIPT');
    });

    it('should filter transactions by type', async () => {
      const mockTransactions = [
        {
          messageId: 'MAT-PN-123-ISSUE-001',
          transactionType: 'ISSUE',
          direction: 'OUTBOUND',
          quantity: 10,
          unitOfMeasure: 'EA',
          lotNumber: null,
          serialNumber: null,
          status: 'PROCESSED',
          transactionDate: new Date('2025-10-15T10:00:00Z'),
          processedAt: new Date('2025-10-15T10:00:00Z'),
          erpTransactionId: null,
        },
      ];

      mockPrisma.eRPMaterialTransaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getPartTransactions('part-1', { transactionType: 'ISSUE' });

      expect(result).toHaveLength(1);
      expect(result[0].transactionType).toBe('ISSUE');
    });

    it('should filter transactions by direction', async () => {
      const mockTransactions = [
        {
          messageId: 'MAT-PN-123-ISSUE-001',
          transactionType: 'ISSUE',
          direction: 'OUTBOUND',
          quantity: 10,
          unitOfMeasure: 'EA',
          lotNumber: null,
          serialNumber: null,
          status: 'PROCESSED',
          transactionDate: new Date('2025-10-15T10:00:00Z'),
          processedAt: new Date('2025-10-15T10:00:00Z'),
          erpTransactionId: null,
        },
      ];

      mockPrisma.eRPMaterialTransaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getPartTransactions('part-1', { direction: 'OUTBOUND' });

      expect(result).toHaveLength(1);
      expect(result[0].direction).toBe('OUTBOUND');
    });

    it('should return empty array if no transactions found', async () => {
      mockPrisma.eRPMaterialTransaction.findMany.mockResolvedValue([]);

      const result = await service.getPartTransactions('part-no-txns');

      expect(result).toEqual([]);
    });
  });

  describe('getWorkOrderTransactions', () => {
    it('should return all transactions for a work order', async () => {
      const mockTransactions = [
        {
          messageId: 'MAT-WO-001-ISSUE-001',
          transactionType: 'ISSUE',
          direction: 'OUTBOUND',
          externalPartId: 'PN-123',
          quantity: 10,
          unitOfMeasure: 'EA',
          lotNumber: null,
          serialNumber: null,
          status: 'PROCESSED',
          transactionDate: new Date('2025-10-15T10:00:00Z'),
          processedAt: new Date('2025-10-15T10:00:00Z'),
          totalCost: 100.0,
          part: { partNumber: 'PN-123', description: 'Test Part' },
        },
        {
          messageId: 'MAT-WO-001-RETURN-001',
          transactionType: 'RETURN',
          direction: 'INBOUND',
          externalPartId: 'PN-123',
          quantity: 2,
          unitOfMeasure: 'EA',
          lotNumber: null,
          serialNumber: null,
          status: 'PROCESSED',
          transactionDate: new Date('2025-10-15T11:00:00Z'),
          processedAt: new Date('2025-10-15T11:00:00Z'),
          totalCost: 20.0,
          part: { partNumber: 'PN-123', description: 'Test Part' },
        },
      ];

      mockPrisma.eRPMaterialTransaction.findMany.mockResolvedValue(mockTransactions);

      const result = await service.getWorkOrderTransactions('wo-1');

      expect(result).toHaveLength(2);
      expect(result[0].transactionType).toBe('ISSUE');
      expect(result[1].transactionType).toBe('RETURN');
    });

    it('should return empty array if no transactions found', async () => {
      mockPrisma.eRPMaterialTransaction.findMany.mockResolvedValue([]);

      const result = await service.getWorkOrderTransactions('wo-no-txns');

      expect(result).toEqual([]);
    });
  });

  describe('retryTransaction', () => {
    it('should retry failed OUTBOUND transaction successfully', async () => {
      const mockFailedTransaction = {
        messageId: 'MAT-PN-123-ISSUE-001',
        transactionType: 'ISSUE',
        direction: 'OUTBOUND',
        status: 'FAILED',
        configId: 'config-1',
        partId: 'part-1',
        quantity: 10,
        unitOfMeasure: 'EA',
        fromLocation: 'WH-01',
        toLocation: 'PROD-FLOOR',
        workOrderId: 'wo-1',
        lotNumber: null,
        serialNumber: null,
        unitCost: null,
        movementType: 'ISSUE',
        reasonCode: null,
      };

      const mockPart = {
        id: 'part-1',
        partNumber: 'PN-123',
        unitOfMeasure: 'EA',
        quantityOnHand: 100,
        isActive: true,
      };

      const mockConfig = {
        id: 'config-1',
        name: 'Oracle Fusion',
        type: 'ERP',
        enabled: true,
      };

      mockPrisma.eRPMaterialTransaction.findUnique.mockResolvedValue(mockFailedTransaction);
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValueOnce({
        ...mockFailedTransaction,
        status: 'PENDING',
        errorMessage: null,
      });
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'txn-retry',
        messageId: 'MAT-PN-123-ISSUE-001-retry',
        status: 'PENDING',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValueOnce({});

      const result = await service.retryTransaction('MAT-PN-123-ISSUE-001', 'user-admin');

      expect(result).toBeDefined();
      expect(mockPrisma.eRPMaterialTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { messageId: 'MAT-PN-123-ISSUE-001' },
          data: {
            status: 'PENDING',
            errorMessage: null,
          },
        })
      );
    });

    it('should throw error if transaction not found for retry', async () => {
      mockPrisma.eRPMaterialTransaction.findUnique.mockResolvedValue(null);

      await expect(
        service.retryTransaction('invalid-message-id', 'user-admin')
      ).rejects.toThrow('Material transaction invalid-message-id not found');
    });

    it('should throw error if transaction already processed', async () => {
      const mockProcessedTransaction = {
        messageId: 'MAT-PN-123-ISSUE-001',
        status: 'PROCESSED',
      };

      mockPrisma.eRPMaterialTransaction.findUnique.mockResolvedValue(mockProcessedTransaction);

      await expect(
        service.retryTransaction('MAT-PN-123-ISSUE-001', 'user-admin')
      ).rejects.toThrow('Transaction MAT-PN-123-ISSUE-001 is already processed, cannot retry');
    });
  });

  describe('bulkExportWorkOrderMaterials', () => {
    it('should export all material consumption for work order', async () => {
      const mockMaterialTransactions = [
        {
          id: 'txn-1',
          partId: 'part-1',
          quantity: 10,
          transactionType: 'ISSUE',
          transactionDate: new Date('2025-10-15T10:00:00Z'),
          fromLocation: 'WH-01',
          toLocation: 'PROD-FLOOR',
          lotNumber: null,
          serialNumber: null,
          unitOfMeasure: 'EA',
          part: {
            id: 'part-1',
            partNumber: 'PN-123',
            description: 'Test Part 1',
            unitOfMeasure: 'EA',
            quantityOnHand: 100,
            isActive: true,
          },
        },
        {
          id: 'txn-2',
          partId: 'part-2',
          quantity: 5,
          transactionType: 'ISSUE',
          transactionDate: new Date('2025-10-15T10:30:00Z'),
          fromLocation: 'WH-01',
          toLocation: 'PROD-FLOOR',
          lotNumber: null,
          serialNumber: null,
          unitOfMeasure: 'EA',
          part: {
            id: 'part-2',
            partNumber: 'PN-456',
            description: 'Test Part 2',
            unitOfMeasure: 'EA',
            quantityOnHand: 50,
            isActive: true,
          },
        },
      ];

      const mockConfig = {
        id: 'config-1',
        name: 'Oracle Fusion',
        type: 'ERP',
        enabled: true,
      };

      mockPrisma.materialTransaction.findMany.mockResolvedValue(mockMaterialTransactions);

      // Mock for first transaction
      mockPrisma.part.findUnique.mockResolvedValueOnce(mockMaterialTransactions[0].part);
      mockPrisma.integrationConfig.findUnique.mockResolvedValueOnce(mockConfig);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValueOnce({
        id: 'erp-txn-1',
        messageId: 'MAT-PN-123-CONSUMPTION-001',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValueOnce({});

      // Mock for second transaction
      mockPrisma.part.findUnique.mockResolvedValueOnce(mockMaterialTransactions[1].part);
      mockPrisma.integrationConfig.findUnique.mockResolvedValueOnce(mockConfig);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValueOnce({
        id: 'erp-txn-2',
        messageId: 'MAT-PN-456-CONSUMPTION-001',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValueOnce({});

      const result = await service.bulkExportWorkOrderMaterials({
        workOrderId: 'wo-1',
        configId: 'config-1',
        createdBy: 'user-admin',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('PROCESSED');
      expect(result[1].status).toBe('PROCESSED');
      expect(mockPrisma.eRPMaterialTransaction.create).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk export', async () => {
      const mockMaterialTransactions = [
        {
          id: 'txn-1',
          partId: 'part-1',
          quantity: 10,
          transactionType: 'ISSUE',
          transactionDate: new Date('2025-10-15T10:00:00Z'),
          fromLocation: 'WH-01',
          toLocation: 'PROD-FLOOR',
          lotNumber: null,
          serialNumber: null,
          unitOfMeasure: 'EA',
          part: {
            id: 'part-1',
            partNumber: 'PN-123',
            description: 'Test Part 1',
            unitOfMeasure: 'EA',
            quantityOnHand: 100,
            isActive: true,
          },
        },
        {
          id: 'txn-2',
          partId: 'part-invalid',
          quantity: 5,
          transactionType: 'ISSUE',
          transactionDate: new Date('2025-10-15T10:30:00Z'),
          fromLocation: 'WH-01',
          toLocation: 'PROD-FLOOR',
          lotNumber: null,
          serialNumber: null,
          unitOfMeasure: 'EA',
          part: {
            id: 'part-invalid',
            partNumber: 'INVALID',
            description: 'Invalid Part',
            unitOfMeasure: 'EA',
            quantityOnHand: 0,
            isActive: true,
          },
        },
      ];

      const mockConfig = {
        id: 'config-1',
        name: 'Oracle Fusion',
        type: 'ERP',
        enabled: true,
      };

      mockPrisma.materialTransaction.findMany.mockResolvedValue(mockMaterialTransactions);

      // First succeeds
      mockPrisma.part.findUnique.mockResolvedValueOnce(mockMaterialTransactions[0].part);
      mockPrisma.integrationConfig.findUnique.mockResolvedValueOnce(mockConfig);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValueOnce({
        id: 'erp-txn-1',
        messageId: 'MAT-PN-123-CONSUMPTION-001',
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValueOnce({});

      // Second fails (part not found)
      mockPrisma.part.findUnique.mockResolvedValueOnce(null);

      const result = await service.bulkExportWorkOrderMaterials({
        workOrderId: 'wo-1',
        configId: 'config-1',
        createdBy: 'user-admin',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('PROCESSED');
      expect(result[1].status).toBe('FAILED');
      expect(result[1].errorMessage).toBeDefined();
    });

    it('should handle work order with no material transactions', async () => {
      mockPrisma.materialTransaction.findMany.mockResolvedValue([]);

      const result = await service.bulkExportWorkOrderMaterials({
        workOrderId: 'wo-1',
        configId: 'config-1',
        createdBy: 'user-admin',
      });

      expect(result).toBeDefined();
      expect(result).toEqual([]);
    });
  });

  describe('transaction type mapping', () => {
    it('should correctly map CONSUMPTION to internal transaction type', async () => {
      const messagePayload = {
        messageType: 'MaterialTransaction',
        messageId: 'ERP-CONSUMPTION-001',
        sender: 'Oracle',
        receiver: 'MES',
        transactionType: 'CONSUMPTION',
        timestamp: '2025-10-15T10:00:00Z',
        material: {
          partNumber: 'PN-123',
          quantity: 10,
          unitOfMeasure: 'EA',
        },
      };

      const mockConfig = {
        id: 'config-1',
        name: 'Oracle',
        type: 'ERP',
        enabled: true,
      };

      const mockPart = {
        id: 'part-1',
        partNumber: 'PN-123',
        quantityOnHand: 100,
        isActive: true,
      };

      mockPrisma.integrationConfig.findUnique.mockResolvedValue(mockConfig);
      mockPrisma.part.findFirst.mockResolvedValue(mockPart);
      mockPrisma.eRPMaterialTransaction.create.mockResolvedValue({
        id: 'txn-1',
        messageId: 'ERP-CONSUMPTION-001',
      });
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.inventory.findFirst.mockResolvedValue({
        id: 'inv-1',
        partId: 'part-1',
        quantity: 100,
        location: 'WAREHOUSE',
      });
      mockPrisma.materialTransaction.create.mockResolvedValue({
        id: 'internal-txn-1',
        transactionType: 'CONSUMPTION',
      });
      mockPrisma.part.update.mockResolvedValue({
        ...mockPart,
        quantityOnHand: 90,
      });
      mockPrisma.eRPMaterialTransaction.update.mockResolvedValue({});

      await service.processInboundTransaction({
        configId: 'config-1',
        messagePayload,
        createdBy: 'system',
      });

      expect(mockPrisma.materialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionType: 'CONSUMPTION',
          }),
        })
      );
    });
  });
});
