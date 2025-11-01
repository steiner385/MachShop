/**
 * OSP Shipment Service Unit Tests
 * Issue #59: Core OSP/Farmout Operations Management System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import OSPShipmentService, { CreateOSPShipmentRequest } from '../../services/OSPShipmentService';
import { OSPShipmentType, OSPShipmentStatus } from '@prisma/client';

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    oSPOperation: {
      findUniqueOrThrow: vi.fn(),
    },
    vendor: {
      findUniqueOrThrow: vi.fn(),
    },
    oSPShipment: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  })),
}));

describe('OSPShipmentService', () => {
  let shipmentService: OSPShipmentService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    shipmentService = new OSPShipmentService();
    mockPrisma = (shipmentService as any).prisma;
  });

  describe('createShipment', () => {
    it('should create a new shipment successfully', async () => {
      // Arrange
      const mockCreatedShipment = {
        id: 'shipment-123',
        shipmentNumber: 'SHP-202501-0001',
        ospOperationId: 'osp-123',
        shipmentType: 'TO_SUPPLIER',
        status: 'DRAFT',
        quantity: 100,
        sendingVendorId: 'vendor-internal',
        receivingVendorId: 'vendor-supplier',
      };

      mockPrisma.oSPOperation.findUniqueOrThrow.mockResolvedValue({
        id: 'osp-123',
      });
      mockPrisma.vendor.findUniqueOrThrow.mockResolvedValue({ id: 'vendor-1' });
      mockPrisma.oSPShipment.findFirst.mockResolvedValue(null);
      mockPrisma.oSPShipment.create.mockResolvedValue(mockCreatedShipment);

      const request: CreateOSPShipmentRequest = {
        ospOperationId: 'osp-123',
        shipmentType: 'TO_SUPPLIER' as OSPShipmentType,
        sendingVendorId: 'vendor-internal',
        receivingVendorId: 'vendor-supplier',
        quantity: 100,
      };

      // Act
      const result = await shipmentService.createShipment(request);

      // Assert
      expect(result.shipmentNumber).toBe('SHP-202501-0001');
      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.oSPShipment.create).toHaveBeenCalled();
    });

    it('should fail if OSP operation does not exist', async () => {
      // Arrange
      mockPrisma.oSPOperation.findUniqueOrThrow.mockRejectedValue(
        new Error('OSP operation not found')
      );

      const request: CreateOSPShipmentRequest = {
        ospOperationId: 'invalid-osp',
        shipmentType: 'TO_SUPPLIER' as OSPShipmentType,
        sendingVendorId: 'vendor-1',
        receivingVendorId: 'vendor-2',
        quantity: 100,
      };

      // Act & Assert
      await expect(shipmentService.createShipment(request)).rejects.toThrow();
    });
  });

  describe('updateShipment', () => {
    it('should update shipment status and tracking info', async () => {
      // Arrange
      const mockUpdatedShipment = {
        id: 'shipment-123',
        shipmentNumber: 'SHP-202501-0001',
        status: 'SHIPPED',
        trackingNumber: 'TRACK-123456',
        carrierName: 'FedEx',
      };

      mockPrisma.oSPShipment.update.mockResolvedValue(mockUpdatedShipment);

      // Act
      const result = await shipmentService.updateShipment('shipment-123', {
        status: 'SHIPPED' as OSPShipmentStatus,
        trackingNumber: 'TRACK-123456',
        carrierName: 'FedEx',
      });

      // Assert
      expect(result.status).toBe('SHIPPED');
      expect(result.trackingNumber).toBe('TRACK-123456');
    });
  });

  describe('markShipped', () => {
    it('should mark shipment as shipped with tracking', async () => {
      // Arrange
      const mockShipment = {
        id: 'shipment-123',
        status: 'SHIPPED',
        trackingNumber: 'TRACK-123456',
        carrierName: 'FedEx',
        shipDate: new Date(),
      };

      mockPrisma.oSPShipment.update.mockResolvedValue(mockShipment);

      // Act
      const result = await shipmentService.markShipped(
        'shipment-123',
        'TRACK-123456',
        'FedEx'
      );

      // Assert
      expect(result.status).toBe('SHIPPED');
      expect(result.trackingNumber).toBe('TRACK-123456');
    });
  });

  describe('markReceived', () => {
    it('should mark shipment as received', async () => {
      // Arrange
      const mockShipment = {
        id: 'shipment-123',
        status: 'RECEIVED',
        actualDeliveryDate: new Date(),
      };

      mockPrisma.oSPShipment.update.mockResolvedValue(mockShipment);

      // Act
      const result = await shipmentService.markReceived('shipment-123');

      // Assert
      expect(result.status).toBe('RECEIVED');
    });
  });

  describe('transitionStatus', () => {
    it('should validate shipment status transitions', async () => {
      // Arrange
      const mockShipment = {
        id: 'shipment-123',
        status: 'DRAFT',
      };

      mockPrisma.oSPShipment.findUniqueOrThrow.mockResolvedValue(mockShipment);
      mockPrisma.oSPShipment.update.mockResolvedValue({
        ...mockShipment,
        status: 'RELEASED',
      });

      // Act
      const result = await shipmentService.transitionStatus(
        'shipment-123',
        'RELEASED' as OSPShipmentStatus
      );

      // Assert
      expect(result.status).toBe('RELEASED');
    });

    it('should reject invalid shipment status transitions', async () => {
      // Arrange
      const mockShipment = {
        id: 'shipment-123',
        status: 'RECEIVED',
      };

      mockPrisma.oSPShipment.findUniqueOrThrow.mockResolvedValue(mockShipment);

      // Act & Assert
      await expect(
        shipmentService.transitionStatus(
          'shipment-123',
          'DRAFT' as OSPShipmentStatus
        )
      ).rejects.toThrow('Invalid shipment status transition');
    });
  });

  describe('getShipmentByTracking', () => {
    it('should find shipment by tracking number', async () => {
      // Arrange
      const mockShipment = {
        id: 'shipment-123',
        trackingNumber: 'TRACK-123456',
        status: 'IN_TRANSIT',
      };

      mockPrisma.oSPShipment.findFirst.mockResolvedValue(mockShipment);

      // Act
      const result = await shipmentService.getShipmentByTracking('TRACK-123456');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.trackingNumber).toBe('TRACK-123456');
    });

    it('should return null if tracking number not found', async () => {
      // Arrange
      mockPrisma.oSPShipment.findFirst.mockResolvedValue(null);

      // Act
      const result = await shipmentService.getShipmentByTracking('INVALID');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getInboundShipments', () => {
    it('should retrieve inbound shipments for supplier', async () => {
      // Arrange
      const mockShipments = [
        {
          id: 'shipment-1',
          shipmentType: 'FROM_SUPPLIER',
          status: 'IN_TRANSIT',
        },
        {
          id: 'shipment-2',
          shipmentType: 'FROM_SUPPLIER',
          status: 'DELIVERED',
        },
      ];

      mockPrisma.oSPShipment.findMany.mockResolvedValue(mockShipments);

      // Act
      const result = await shipmentService.getInboundShipments('vendor-123');

      // Assert
      expect(result.length).toBe(2);
      expect(result[0].shipmentType).toBe('FROM_SUPPLIER');
    });
  });
});
