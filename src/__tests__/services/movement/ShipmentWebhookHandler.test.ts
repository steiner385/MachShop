/**
 * Tests for ShipmentWebhookHandler Service
 * Phase 11: Comprehensive Testing
 * Issue #64: Material Movement & Logistics Management System
 *
 * Tests webhook handling functionality including:
 * - Signature verification and validation
 * - Source system validation
 * - Webhook event processing
 * - Error handling and recovery
 * - Event emission and listeners
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShipmentWebhookHandler } from '../../../services/movement/ShipmentWebhookHandler';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    shipment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    movement: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    container: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    webhookEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  })),
}));

describe('ShipmentWebhookHandler Service', () => {
  let handler: ShipmentWebhookHandler;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = new PrismaClient();
    handler = new ShipmentWebhookHandler(mockPrisma, {
      enableSignatureVerification: true,
      secretKey: 'test-secret-key',
      allowedSources: ['ERP', 'CARRIER_SYSTEM'],
      maxAge: 300,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Signature Verification', () => {
    it('should verify valid webhook signature', () => {
      const payload = JSON.stringify({
        erpShipmentNumber: 'SHP-001',
        status: 'SHIPPED',
      });

      // Generate a valid signature (HMAC SHA256)
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'test-secret-key')
        .update(payload)
        .digest('hex');

      const isValid = handler.verifyWebhookSignature(
        payload,
        signature,
        'test-secret-key'
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = JSON.stringify({
        erpShipmentNumber: 'SHP-001',
        status: 'SHIPPED',
      });

      const isValid = handler.verifyWebhookSignature(
        payload,
        'invalid-signature-xyz',
        'test-secret-key'
      );

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret key', () => {
      const payload = JSON.stringify({
        erpShipmentNumber: 'SHP-001',
        status: 'SHIPPED',
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', 'wrong-secret-key')
        .update(payload)
        .digest('hex');

      const isValid = handler.verifyWebhookSignature(
        payload,
        signature,
        'test-secret-key'
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Source Validation', () => {
    it('should allow whitelisted source systems', () => {
      const isAllowed1 = handler.isAllowedSource('ERP');
      const isAllowed2 = handler.isAllowedSource('CARRIER_SYSTEM');

      expect(isAllowed1).toBe(true);
      expect(isAllowed2).toBe(true);
    });

    it('should reject non-whitelisted source systems', () => {
      const isAllowed = handler.isAllowedSource('UNKNOWN_SYSTEM');

      expect(isAllowed).toBe(false);
    });

    it('should be case-sensitive for source validation', () => {
      const isAllowed = handler.isAllowedSource('erp'); // lowercase

      expect(isAllowed).toBe(false);
    });
  });

  describe('Timestamp Validation', () => {
    it('should accept recent timestamps', () => {
      const recentTime = new Date(Date.now() - 60000); // 1 minute ago

      const isValid = handler.isValidTimestamp(recentTime, 300); // 5 minute window

      expect(isValid).toBe(true);
    });

    it('should reject old timestamps beyond maxAge', () => {
      const oldTime = new Date(Date.now() - 600000); // 10 minutes ago

      const isValid = handler.isValidTimestamp(oldTime, 300); // 5 minute window

      expect(isValid).toBe(false);
    });

    it('should accept current timestamps', () => {
      const currentTime = new Date();

      const isValid = handler.isValidTimestamp(currentTime, 300);

      expect(isValid).toBe(true);
    });
  });

  describe('Shipment Status Update', () => {
    it('should handle shipment status update successfully', async () => {
      const mockShipment = {
        id: 'ship-1',
        erpShipmentNumber: 'SHP-2024-001',
        status: 'PENDING',
      };

      mockPrisma.shipment.findUnique.mockResolvedValue(mockShipment);
      mockPrisma.shipment.update.mockResolvedValue({
        ...mockShipment,
        status: 'SHIPPED',
      });

      const result = await handler.handleShipmentStatusUpdate({
        erpShipmentNumber: 'SHP-2024-001',
        status: 'SHIPPED',
        trackingNumber: '1Z999AA10123456784',
        carrier: 'FedEx',
        lastUpdateTime: new Date(),
        updateSource: 'ERP',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('shipment status updated');
      expect(mockPrisma.shipment.update).toHaveBeenCalled();
    });

    it('should handle shipment not found', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue(null);

      const result = await handler.handleShipmentStatusUpdate({
        erpShipmentNumber: 'NONEXISTENT',
        status: 'SHIPPED',
        trackingNumber: '1Z999AA10123456784',
        carrier: 'FedEx',
        lastUpdateTime: new Date(),
        updateSource: 'ERP',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should map ERP status codes to internal status', async () => {
      const mockShipment = {
        id: 'ship-1',
        erpShipmentNumber: 'SHP-2024-001',
        status: 'PENDING',
      };

      mockPrisma.shipment.findUnique.mockResolvedValue(mockShipment);
      mockPrisma.shipment.update.mockResolvedValue({
        ...mockShipment,
        status: 'DELIVERED',
      });

      await handler.handleShipmentStatusUpdate({
        erpShipmentNumber: 'SHP-2024-001',
        status: 'DELIVERED',
        lastUpdateTime: new Date(),
        updateSource: 'ERP',
      });

      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { erpShipmentNumber: 'SHP-2024-001' },
          data: expect.objectContaining({
            status: 'DELIVERED',
          }),
        })
      );
    });
  });

  describe('Tracking Update', () => {
    it('should handle tracking updates', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        trackingNumber: '1Z999AA10123456784',
      });

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-1',
        trackingNumber: '1Z999AA10123456784',
        lastLocation: 'Memphis, TN',
      });

      const result = await handler.handleTrackingUpdate({
        shipmentId: 'ship-1',
        trackingNumber: '1Z999AA10123456784',
        carrier: 'FedEx',
        lastLocation: 'Memphis, TN Distribution Center',
        lastUpdateTime: new Date(),
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.shipment.update).toHaveBeenCalled();
    });
  });

  describe('Delivery Confirmation', () => {
    it('should handle delivery confirmation', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        status: 'IN_TRANSIT',
      });

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-1',
        status: 'DELIVERED',
        deliveryTime: new Date(),
      });

      const result = await handler.handleDeliveryConfirmation({
        shipmentId: 'ship-1',
        containerIds: ['CONT-001'],
        receivedBy: 'John Doe',
        location: 'Warehouse A',
        deliveryTime: new Date(),
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.shipment.update).toHaveBeenCalled();
    });

    it('should update container status on delivery', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        status: 'IN_TRANSIT',
      });

      mockPrisma.container.findUnique.mockResolvedValue({
        id: 'cont-1',
        status: 'IN_TRANSIT',
      });

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-1',
        status: 'DELIVERED',
      });

      mockPrisma.container.update.mockResolvedValue({
        id: 'cont-1',
        status: 'AT_LOCATION',
      });

      await handler.handleDeliveryConfirmation({
        shipmentId: 'ship-1',
        containerIds: ['CONT-001'],
        receivedBy: 'John Doe',
        location: 'Warehouse A',
      });

      expect(mockPrisma.container.update).toHaveBeenCalled();
    });
  });

  describe('Exception Handling', () => {
    it('should handle shipment exceptions', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        status: 'IN_TRANSIT',
      });

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-1',
        status: 'DELAYED',
      });

      const result = await handler.handleShipmentException(
        'ship-1',
        'DELAY',
        'Vehicle breakdown, rerouting',
        new Date(Date.now() + 86400000) // 1 day later
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-1' },
          data: expect.objectContaining({
            status: expect.stringMatching(/DELAY|DELAYED/i),
          }),
        })
      );
    });
  });

  describe('Container Receipt', () => {
    it('should handle container receipt confirmation', async () => {
      mockPrisma.container.findUnique.mockResolvedValue({
        id: 'cont-1',
        status: 'IN_TRANSIT',
      });

      mockPrisma.container.update.mockResolvedValue({
        id: 'cont-1',
        status: 'AT_LOCATION',
      });

      const result = await handler.handleContainerReceipt(
        'CONT-001',
        'Warehouse A, Bay 5',
        'Jane Smith'
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.container.update).toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    it('should emit shipment status updated event', (done) => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        erpShipmentNumber: 'SHP-001',
      });

      mockPrisma.shipment.update.mockResolvedValue({
        id: 'ship-1',
        status: 'SHIPPED',
      });

      handler.on('shipment:status_updated', (data: any) => {
        expect(data.erpShipmentNumber).toBe('SHP-001');
        expect(data.status).toBe('SHIPPED');
        done();
      });

      handler.handleShipmentStatusUpdate({
        erpShipmentNumber: 'SHP-001',
        status: 'SHIPPED',
        lastUpdateTime: new Date(),
        updateSource: 'ERP',
      });
    });

    it('should allow unsubscribing from events', (done) => {
      let callCount = 0;

      const listener = () => {
        callCount++;
      };

      handler.on('shipment:status_updated', listener);
      handler.off('shipment:status_updated', listener);

      // Manually emit to test unsubscribe
      handler.emit('shipment:status_updated', { test: true });

      setTimeout(() => {
        expect(callCount).toBe(0);
        done();
      }, 100);
    });
  });

  describe('Webhook History', () => {
    it('should store webhook history', async () => {
      mockPrisma.webhookEvent.create.mockResolvedValue({
        id: 'event-1',
        eventType: 'shipment:status_updated',
        sourceSystem: 'ERP',
        payload: {},
        timestamp: new Date(),
      });

      const events = await handler.getWebhookHistory({
        eventType: 'shipment:status_updated',
        limit: 10,
        offset: 0,
      });

      expect(mockPrisma.webhookEvent.create).toHaveBeenCalled();
    });

    it('should filter history by date range', async () => {
      const fromDate = new Date(Date.now() - 86400000);
      const toDate = new Date();

      mockPrisma.webhookEvent.findMany.mockResolvedValue([]);

      await handler.getWebhookHistory({
        fromDate,
        toDate,
        limit: 10,
        offset: 0,
      });

      expect(mockPrisma.webhookEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: fromDate,
              lte: toDate,
            },
          }),
        })
      );
    });
  });

  describe('Webhook Statistics', () => {
    it('should calculate webhook statistics', async () => {
      mockPrisma.webhookEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          eventType: 'shipment:status_updated',
          sourceSystem: 'ERP',
          success: true,
          timestamp: new Date(),
        },
        {
          id: 'event-2',
          eventType: 'tracking:updated',
          sourceSystem: 'CARRIER_SYSTEM',
          success: true,
          timestamp: new Date(),
        },
      ]);

      const stats = await handler.getWebhookStats(24);

      expect(stats).toBeDefined();
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.successfulEvents).toBeGreaterThan(0);
      expect(stats.failedEvents).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Recovery', () => {
    it('should continue processing after partial failure', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        status: 'PENDING',
      });

      // First update succeeds
      mockPrisma.shipment.update.mockResolvedValueOnce({
        id: 'ship-1',
        status: 'SHIPPED',
      });

      // Container update fails but should not stop shipment update
      mockPrisma.container.update.mockRejectedValueOnce(
        new Error('Container not found')
      );

      const result = await handler.handleShipmentStatusUpdate({
        erpShipmentNumber: 'SHP-001',
        status: 'SHIPPED',
        containerIds: ['NONEXISTENT'],
        lastUpdateTime: new Date(),
        updateSource: 'ERP',
      });

      // Shipment update should still succeed
      expect(mockPrisma.shipment.update).toHaveBeenCalled();
    });

    it('should log errors for failed webhook events', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockPrisma.shipment.findUnique.mockRejectedValue(
        new Error('Database error')
      );

      try {
        await handler.handleShipmentStatusUpdate({
          erpShipmentNumber: 'SHP-001',
          status: 'SHIPPED',
          lastUpdateTime: new Date(),
          updateSource: 'ERP',
        });
      } catch (err) {
        // Expected
      }

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('Concurrent Webhook Processing', () => {
    it('should handle multiple concurrent webhooks', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        status: 'PENDING',
      });

      mockPrisma.shipment.update.mockResolvedValue({
        status: 'SHIPPED',
      });

      const promises = [
        handler.handleShipmentStatusUpdate({
          erpShipmentNumber: 'SHP-001',
          status: 'SHIPPED',
          lastUpdateTime: new Date(),
          updateSource: 'ERP',
        }),
        handler.handleShipmentStatusUpdate({
          erpShipmentNumber: 'SHP-002',
          status: 'SHIPPED',
          lastUpdateTime: new Date(),
          updateSource: 'ERP',
        }),
        handler.handleShipmentStatusUpdate({
          erpShipmentNumber: 'SHP-003',
          status: 'SHIPPED',
          lastUpdateTime: new Date(),
          updateSource: 'ERP',
        }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockPrisma.shipment.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customHandler = new ShipmentWebhookHandler(mockPrisma, {
        enableSignatureVerification: false,
        secretKey: 'custom-secret',
        allowedSources: ['CUSTOM_SOURCE'],
        maxAge: 600,
      });

      expect(customHandler.isAllowedSource('CUSTOM_SOURCE')).toBe(true);
      expect(customHandler.isAllowedSource('ERP')).toBe(false);
    });

    it('should allow disabled signature verification', () => {
      const noVerifyHandler = new ShipmentWebhookHandler(mockPrisma, {
        enableSignatureVerification: false,
      });

      const isValid = noVerifyHandler.verifyWebhookSignature(
        'any payload',
        'any signature',
        'any secret'
      );

      // When disabled, should always return true
      expect(isValid).toBe(true);
    });
  });
});
