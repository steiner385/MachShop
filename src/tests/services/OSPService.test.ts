/**
 * OSP Service Unit Tests
 * Issue #59: Core OSP/Farmout Operations Management System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import OSPService, { CreateOSPOperationRequest, UpdateOSPOperationRequest } from '../../services/OSPService';
import { PrismaClient, OSPOperationStatus } from '@prisma/client';

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    operation: {
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
    vendor: {
      findUniqueOrThrow: vi.fn(),
    },
    oSPCapability: {
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
    oSPOperation: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  })),
}));

describe('OSPService', () => {
  let ospService: OSPService;
  let mockPrisma: any;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    ospService = new OSPService();
    mockPrisma = (ospService as any).prisma;
  });

  describe('createOSPOperation', () => {
    it('should create a new OSP operation successfully', async () => {
      // Arrange
      const mockOperation = { id: 'op-123', isOSPCapable: true, operationCode: 'OP001' };
      const mockVendor = { id: 'vendor-123', name: 'Test Vendor' };
      const mockCreatedOSP = {
        id: 'osp-123',
        ospNumber: 'OSP-2025-00001',
        operationId: 'op-123',
        vendorId: 'vendor-123',
        status: 'PENDING_SHIPMENT',
        quantitySent: 100,
        quantityReceived: 0,
        quantityAccepted: 0,
        quantityRejected: 0,
      };

      mockPrisma.operation.findUniqueOrThrow.mockResolvedValue(mockOperation);
      mockPrisma.vendor.findUniqueOrThrow.mockResolvedValue(mockVendor);
      mockPrisma.oSPOperation.findFirst.mockResolvedValue(null);
      mockPrisma.oSPOperation.create.mockResolvedValue(mockCreatedOSP);

      const request: CreateOSPOperationRequest = {
        operationId: 'op-123',
        vendorId: 'vendor-123',
        quantitySent: 100,
        requestedReturnDate: new Date('2025-01-30'),
      };

      // Act
      const result = await ospService.createOSPOperation(request);

      // Assert
      expect(result.ospNumber).toBe('OSP-2025-00001');
      expect(result.status).toBe('PENDING_SHIPMENT');
      expect(mockPrisma.oSPOperation.create).toHaveBeenCalled();
    });

    it('should throw error if operation is not OSP-capable', async () => {
      // Arrange
      const mockOperation = { id: 'op-123', isOSPCapable: false };
      mockPrisma.operation.findUniqueOrThrow.mockResolvedValue(mockOperation);

      const request: CreateOSPOperationRequest = {
        operationId: 'op-123',
        vendorId: 'vendor-123',
        quantitySent: 100,
        requestedReturnDate: new Date('2025-01-30'),
      };

      // Act & Assert
      await expect(ospService.createOSPOperation(request)).rejects.toThrow(
        'is not marked as OSP-capable'
      );
    });
  });

  describe('updateOSPOperation', () => {
    it('should update OSP operation status successfully', async () => {
      // Arrange
      const mockUpdatedOSP = {
        id: 'osp-123',
        ospNumber: 'OSP-2025-00001',
        status: 'SHIPPED',
        quantitySent: 100,
        quantityReceived: 0,
        quantityAccepted: 0,
        quantityRejected: 0,
        estimatedCost: 1000,
        actualCost: null,
      };

      mockPrisma.oSPOperation.update.mockResolvedValue(mockUpdatedOSP);

      const request: UpdateOSPOperationRequest = {
        status: 'SHIPPED' as OSPOperationStatus,
      };

      // Act
      const result = await ospService.updateOSPOperation('osp-123', request);

      // Assert
      expect(result.status).toBe('SHIPPED');
      expect(mockPrisma.oSPOperation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'osp-123' },
        })
      );
    });
  });

  describe('transitionStatus', () => {
    it('should validate status transitions correctly', async () => {
      // Arrange
      const mockOSP = {
        id: 'osp-123',
        status: 'PENDING_SHIPMENT',
      };

      mockPrisma.oSPOperation.findUniqueOrThrow.mockResolvedValue(mockOSP);
      mockPrisma.oSPOperation.update.mockResolvedValue({
        ...mockOSP,
        status: 'SHIPPED',
      });

      // Act
      const result = await ospService.transitionStatus('osp-123', 'SHIPPED' as OSPOperationStatus);

      // Assert
      expect(result.status).toBe('SHIPPED');
    });

    it('should reject invalid status transitions', async () => {
      // Arrange
      const mockOSP = {
        id: 'osp-123',
        status: 'ACCEPTED',
      };

      mockPrisma.oSPOperation.findUniqueOrThrow.mockResolvedValue(mockOSP);

      // Act & Assert
      await expect(
        ospService.transitionStatus('osp-123', 'PENDING_SHIPMENT' as OSPOperationStatus)
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('cancelOSPOperation', () => {
    it('should cancel an OSP operation with reason', async () => {
      // Arrange
      const mockOSP = {
        id: 'osp-123',
        status: 'PENDING_SHIPMENT',
        notes: 'Original notes',
      };

      mockPrisma.oSPOperation.findUniqueOrThrow.mockResolvedValue(mockOSP);
      mockPrisma.oSPOperation.update.mockResolvedValue({
        ...mockOSP,
        status: 'CANCELLED',
        notes: 'Original notes\nCancelled: Supplier issues',
      });

      // Act
      const result = await ospService.cancelOSPOperation('osp-123', 'Supplier issues');

      // Assert
      expect(result.status).toBe('CANCELLED');
      expect(mockPrisma.oSPOperation.update).toHaveBeenCalled();
    });

    it('should not allow cancellation of accepted operations', async () => {
      // Arrange
      const mockOSP = {
        id: 'osp-123',
        status: 'ACCEPTED',
      };

      mockPrisma.oSPOperation.findUniqueOrThrow.mockResolvedValue(mockOSP);

      // Act & Assert
      await expect(
        ospService.cancelOSPOperation('osp-123', 'Reason')
      ).rejects.toThrow('Cannot cancel OSP operation');
    });
  });

  describe('getOSPCandidates', () => {
    it('should return list of operations that can be sent to suppliers', async () => {
      // Arrange
      const mockOperations = [
        { id: 'op-1', operationName: 'Heat Treat', isOSPCapable: true },
        { id: 'op-2', operationName: 'Plating', isOSPCapable: true },
      ];

      const mockCapabilities = [
        {
          id: 'cap-1',
          operationId: 'op-1',
          vendor: { id: 'vendor-1', name: 'Vendor 1' },
          standardLeadDays: 5,
          certifications: [],
        },
      ];

      mockPrisma.operation.findMany.mockResolvedValue(mockOperations);
      mockPrisma.oSPCapability.findMany.mockResolvedValue(mockCapabilities);

      // Act
      const result = await ospService.getOSPCandidates();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
