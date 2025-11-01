/**
 * ERP Shipment Integration Service Tests
 * Phase 4: Testing ERP-based external movement management
 * Issue #64: Material Movement & Logistics Management System
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ERPShipmentIntegrationService } from '../../../services/movement/ERPShipmentIntegrationService';

describe('ERPShipmentIntegrationService - Phase 4', () => {
  let prisma: PrismaClient;
  let service: ERPShipmentIntegrationService;
  let testSiteId: string;
  let testMovementTypeId: string;
  let testShipmentId: string;
  let testUserId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new ERPShipmentIntegrationService(prisma);

    // Create test site
    const site = await prisma.site.create({
      data: {
        name: 'ERP Integration Test Site',
        code: 'ERP-TEST',
        address: '789 Integration Ave',
        city: 'ERP City',
        state: 'EC',
        zipCode: '98765',
        country: 'US',
      },
    });
    testSiteId = site.id;

    // Create movement type for shipments
    const movementType = await prisma.movementType.create({
      data: {
        siteId: testSiteId,
        code: 'EXTERNAL_SHIPMENT',
        name: 'External Shipment',
        requiresCarrier: true,
        isActive: true,
      },
    });
    testMovementTypeId = movementType.id;

    // Create drop-ship movement type
    await prisma.movementType.create({
      data: {
        siteId: testSiteId,
        code: 'SHIP_TO_SUPPLIER',
        name: 'Drop-Ship to Supplier',
        requiresCarrier: true,
        isActive: true,
      },
    });

    // Create test shipment
    const shipment = await prisma.shipment.create({
      data: {
        siteId: testSiteId,
        shipmentNumber: 'SHIP-ERP-001',
        shipmentType: 'STANDARD',
        status: 'DRAFT',
        shipFromCompanyName: 'Test Company A',
        shipToCompanyName: 'Test Company B',
        carrierType: 'FEDEX',
      },
    });
    testShipmentId = shipment.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        username: 'erpuser',
        email: 'erp@example.com',
        passwordHash: 'hashed',
        firstName: 'ERP',
        lastName: 'User',
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.materialMovement.deleteMany({ where: { movementTypeId: testMovementTypeId } });
    await prisma.movementType.deleteMany({ where: { siteId: testSiteId } });
    await prisma.shipment.deleteMany({ where: { siteId: testSiteId } });
    await prisma.site.delete({ where: { id: testSiteId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('Shipment Movement Creation', () => {
    it('should create a shipment movement linked to ERP shipment', async () => {
      const movement = await service.createShipmentMovement({
        siteId: testSiteId,
        shipmentId: testShipmentId,
        movementTypeId: testMovementTypeId,
        workOrderIds: ['WO-001', 'WO-002'],
        containerIds: ['CONT-001'],
        shipFromCompanyName: 'Supplier A',
        shipToCompanyName: 'Customer B',
        shipFromAddress: '123 Supplier St',
        shipToAddress: '456 Customer Ave',
        quantity: 500,
        unitOfMeasure: 'EACH',
        createdBy: testUserId,
        notes: 'Urgent shipment',
      });

      expect(movement).toBeDefined();
      expect(movement.id).toBeDefined();
      expect(movement.shipmentId).toBe(testShipmentId);
      expect(movement.status).toBe('REQUESTED');
      expect(movement.workOrderIds).toEqual(['WO-001', 'WO-002']);
    });

    it('should fail if shipment does not exist', async () => {
      await expect(
        service.createShipmentMovement({
          siteId: testSiteId,
          shipmentId: 'INVALID-ID',
          movementTypeId: testMovementTypeId,
          workOrderIds: ['WO-001'],
          containerIds: ['CONT-001'],
          shipFromCompanyName: 'Supplier A',
          shipToCompanyName: 'Customer B',
          shipFromAddress: '123 Supplier St',
          shipToAddress: '456 Customer Ave',
          quantity: 500,
          unitOfMeasure: 'EACH',
          createdBy: testUserId,
        })
      ).rejects.toThrow();
    });

    it('should retrieve a shipment movement', async () => {
      const created = await service.createShipmentMovement({
        siteId: testSiteId,
        shipmentId: testShipmentId,
        movementTypeId: testMovementTypeId,
        workOrderIds: ['WO-001'],
        containerIds: ['CONT-001'],
        shipFromCompanyName: 'Supplier A',
        shipToCompanyName: 'Customer B',
        shipFromAddress: '123 Supplier St',
        shipToAddress: '456 Customer Ave',
        quantity: 500,
        unitOfMeasure: 'EACH',
        createdBy: testUserId,
      });

      const retrieved = await service.getShipmentMovement(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.shipmentId).toBe(testShipmentId);
    });
  });

  describe('Shipment Status Updates from ERP', () => {
    it('should handle shipment status update to PICKED', async () => {
      const movement = await service.createShipmentMovement({
        siteId: testSiteId,
        shipmentId: testShipmentId,
        movementTypeId: testMovementTypeId,
        workOrderIds: ['WO-001'],
        containerIds: ['CONT-001'],
        shipFromCompanyName: 'Supplier A',
        shipToCompanyName: 'Customer B',
        shipFromAddress: '123 Supplier St',
        shipToAddress: '456 Customer Ave',
        quantity: 500,
        unitOfMeasure: 'EACH',
        createdBy: testUserId,
      });

      const result = await service.handleShipmentStatusUpdate({
        shipmentId: testShipmentId,
        status: 'PICKED',
      });

      expect(result).toBeDefined();
      expect(result.shipment.status).toBe('PICKED');
      expect(result.movements.length).toBeGreaterThan(0);
      expect(result.movements[0].status).toBe('APPROVED');
    });

    it('should update movement to IN_TRANSIT when shipment shipped', async () => {
      const movement = await service.createShipmentMovement({
        siteId: testSiteId,
        shipmentId: testShipmentId,
        movementTypeId: testMovementTypeId,
        workOrderIds: ['WO-001'],
        containerIds: ['CONT-001'],
        shipFromCompanyName: 'Supplier A',
        shipToCompanyName: 'Customer B',
        shipFromAddress: '123 Supplier St',
        shipToAddress: '456 Customer Ave',
        quantity: 500,
        unitOfMeasure: 'EACH',
        createdBy: testUserId,
      });

      const result = await service.handleShipmentStatusUpdate({
        shipmentId: testShipmentId,
        status: 'SHIPPED',
        trackingNumber: 'FDX-123456789',
        carrierType: 'FEDEX',
      });

      expect(result.movements[0].status).toBe('IN_TRANSIT');
      expect(result.movements[0].trackingNumber).toBe('FDX-123456789');
      expect(result.movements[0].carrier).toBe('FEDEX');
    });

    it('should update movement to DELIVERED when shipment delivered', async () => {
      const movement = await service.createShipmentMovement({
        siteId: testSiteId,
        shipmentId: testShipmentId,
        movementTypeId: testMovementTypeId,
        workOrderIds: ['WO-001'],
        containerIds: ['CONT-001'],
        shipFromCompanyName: 'Supplier A',
        shipToCompanyName: 'Customer B',
        shipFromAddress: '123 Supplier St',
        shipToAddress: '456 Customer Ave',
        quantity: 500,
        unitOfMeasure: 'EACH',
        createdBy: testUserId,
      });

      const deliveryDate = new Date();
      const result = await service.handleShipmentStatusUpdate({
        shipmentId: testShipmentId,
        status: 'DELIVERED',
        actualDeliveryAt: deliveryDate,
      });

      expect(result.movements[0].status).toBe('DELIVERED');
      expect(result.movements[0].deliveredAt).toBeDefined();
    });

    it('should handle cancelled shipment status', async () => {
      const movement = await service.createShipmentMovement({
        siteId: testSiteId,
        shipmentId: testShipmentId,
        movementTypeId: testMovementTypeId,
        workOrderIds: ['WO-001'],
        containerIds: ['CONT-001'],
        shipFromCompanyName: 'Supplier A',
        shipToCompanyName: 'Customer B',
        shipFromAddress: '123 Supplier St',
        shipToAddress: '456 Customer Ave',
        quantity: 500,
        unitOfMeasure: 'EACH',
        createdBy: testUserId,
      });

      const result = await service.handleShipmentStatusUpdate({
        shipmentId: testShipmentId,
        status: 'CANCELLED',
      });

      expect(result.movements[0].status).toBe('CANCELLED');
    });
  });

  describe('Drop-Ship Workflow', () => {
    it('should create a drop-ship workflow movement', async () => {
      const movement = await service.createDropShipWorkflow({
        siteId: testSiteId,
        sourceSupplierName: 'Source Supplier',
        destinationSupplierName: 'Destination Supplier',
        workOrderIds: ['WO-DROP-001'],
        containerIds: ['DROP-CONT-001'],
        quantity: 1000,
        unitOfMeasure: 'LB',
        createdBy: testUserId,
      });

      expect(movement).toBeDefined();
      expect(movement.id).toBeDefined();
      expect(movement.fromSupplier).toBe('Source Supplier');
      expect(movement.toSupplier).toBe('Destination Supplier');
      expect(movement.status).toBe('REQUESTED');
      expect(movement.specialInstructions).toContain('Drop-ship');
    });

    it('should get inter-site transfer movements', async () => {
      // Create another site
      const site2 = await prisma.site.create({
        data: {
          name: 'Second Site',
          code: 'SITE-2',
          address: '999 Second St',
          city: 'Second City',
          state: 'SC',
          zipCode: '11111',
          country: 'US',
        },
      });

      // Create inter-site shipment
      const shipment2 = await prisma.shipment.create({
        data: {
          siteId: testSiteId,
          shipmentNumber: 'INTER-SITE-001',
          shipmentType: 'INTERCOMPANY',
          status: 'DRAFT',
          shipFromCompanyName: 'Site 1',
          shipToCompanyName: 'Site 2',
          carrierType: 'LTL',
        },
      });

      // Create inter-site movement
      await service.createShipmentMovement({
        siteId: testSiteId,
        shipmentId: shipment2.id,
        movementTypeId: testMovementTypeId,
        workOrderIds: ['WO-INTER-001'],
        containerIds: ['INTER-CONT-001'],
        shipFromCompanyName: 'Site 1',
        shipToCompanyName: 'Site 2',
        shipFromAddress: '123 Site 1',
        shipToAddress: '123 Site 2',
        quantity: 750,
        unitOfMeasure: 'EACH',
        createdBy: testUserId,
      });

      // Query inter-site transfers
      const transfers = await service.getInterSiteTransfers(testSiteId);

      expect(transfers.length).toBeGreaterThan(0);

      // Cleanup
      await prisma.shipment.deleteMany({ where: { siteId: site2.id } });
      await prisma.site.delete({ where: { id: site2.id } });
    });
  });

  describe('ERP Synchronization', () => {
    it('should sync shipment with ERP', async () => {
      const syncResult = await service.syncShipmentWithERP(testShipmentId);

      expect(syncResult).toBeDefined();
      expect(syncResult.shipmentId).toBe(testShipmentId);
      expect(syncResult.erpReference).toBeDefined();
      expect(syncResult.syncedAt).toBeDefined();
      expect(syncResult.status).toBe('DRAFT');
    });

    it('should get shipment tracking from ERP', async () => {
      const trackingInfo = await service.getShipmentTrackingFromERP(testShipmentId);

      expect(trackingInfo).toBeDefined();
      expect(trackingInfo.shipmentId).toBe(testShipmentId);
      expect(trackingInfo.status).toBe('DRAFT');
      expect(trackingInfo.lastUpdated).toBeDefined();
    });
  });

  describe('Shipment Integration Summary', () => {
    it('should return shipment integration summary', async () => {
      // Create multiple shipments
      await service.createShipmentMovement({
        siteId: testSiteId,
        shipmentId: testShipmentId,
        movementTypeId: testMovementTypeId,
        workOrderIds: ['WO-001'],
        containerIds: ['CONT-001'],
        shipFromCompanyName: 'Supplier A',
        shipToCompanyName: 'Customer B',
        shipFromAddress: '123 Supplier St',
        shipToAddress: '456 Customer Ave',
        quantity: 500,
        unitOfMeasure: 'EACH',
        createdBy: testUserId,
      });

      await service.createDropShipWorkflow({
        siteId: testSiteId,
        sourceSupplierName: 'Supplier X',
        destinationSupplierName: 'Supplier Y',
        workOrderIds: ['WO-DROP-001'],
        containerIds: ['DROP-CONT-001'],
        quantity: 1000,
        unitOfMeasure: 'LB',
        createdBy: testUserId,
      });

      const summary = await service.getShipmentIntegrationSummary(testSiteId);

      expect(summary).toBeDefined();
      expect(summary.totalShipments).toBeGreaterThan(0);
      expect(summary.byStatus).toBeDefined();
      expect(summary.dropShipMovements).toBeGreaterThan(0);
      expect(summary.note).toContain('ERP');
    });
  });

  describe('ERP Shipment Integration Patterns', () => {
    it('should support inter-site transfer workflow', async () => {
      // Create shipment for inter-site transfer
      const shipment = await prisma.shipment.create({
        data: {
          siteId: testSiteId,
          shipmentNumber: 'INTER-TRANSFER-001',
          shipmentType: 'INTERCOMPANY',
          status: 'DRAFT',
          shipFromCompanyName: 'Factory A',
          shipToCompanyName: 'Warehouse B',
          carrierType: 'LTL',
        },
      });

      // Create movement for transfer
      const movement = await service.createShipmentMovement({
        siteId: testSiteId,
        shipmentId: shipment.id,
        movementTypeId: testMovementTypeId,
        workOrderIds: ['WO-INTER-001', 'WO-INTER-002'],
        containerIds: ['CONT-INTER-001'],
        shipFromCompanyName: 'Factory A',
        shipToCompanyName: 'Warehouse B',
        shipFromAddress: 'Factory A Address',
        shipToAddress: 'Warehouse B Address',
        quantity: 250,
        unitOfMeasure: 'EACH',
        createdBy: testUserId,
      });

      // Simulate ERP status transitions
      await service.handleShipmentStatusUpdate({
        shipmentId: shipment.id,
        status: 'READY_TO_SHIP',
      });

      await service.handleShipmentStatusUpdate({
        shipmentId: shipment.id,
        status: 'SHIPPED',
        trackingNumber: 'LTL-123456',
      });

      const finalMovement = await service.getShipmentMovement(movement.id);

      expect(finalMovement.status).toBe('IN_TRANSIT');
      expect(finalMovement.trackingNumber).toBe('LTL-123456');
    });

    it('should support return/reverse logistics workflow', async () => {
      // Create return shipment
      const returnShipment = await prisma.shipment.create({
        data: {
          siteId: testSiteId,
          shipmentNumber: 'RETURN-001',
          shipmentType: 'RETURN',
          status: 'DRAFT',
          shipFromCompanyName: 'Customer X',
          shipToCompanyName: 'Supplier Y',
          carrierType: 'FEDEX',
        },
      });

      const returnMovement = await service.createShipmentMovement({
        siteId: testSiteId,
        shipmentId: returnShipment.id,
        movementTypeId: testMovementTypeId,
        workOrderIds: ['WO-RETURN-001'],
        containerIds: ['CONT-RETURN-001'],
        shipFromCompanyName: 'Customer X',
        shipToCompanyName: 'Supplier Y',
        shipFromAddress: 'Customer Address',
        shipToAddress: 'Supplier Address',
        quantity: 100,
        unitOfMeasure: 'EACH',
        createdBy: testUserId,
        notes: 'Return for credit - defective units',
      });

      // Simulate return shipment through ERP
      await service.handleShipmentStatusUpdate({
        shipmentId: returnShipment.id,
        status: 'IN_TRANSIT',
        trackingNumber: 'FDX-RETURN-123',
      });

      const updated = await service.getShipmentMovement(returnMovement.id);

      expect(updated.status).toBe('IN_TRANSIT');
      expect(updated.specialInstructions).toContain('defective');
    });
  });
});
