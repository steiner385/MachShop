/**
 * Forklift Management Service Tests
 * Phase 3: Comprehensive testing for fleet management, dispatch, and operator tracking
 * Issue #64: Material Movement & Logistics Management System
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient, ForkliftType, ForkliftStatus } from '@prisma/client';
import { ForkliftManagementService } from '../../../services/movement/ForkliftManagementService';

describe('ForkliftManagementService - Phase 3', () => {
  let prisma: PrismaClient;
  let service: ForkliftManagementService;
  let testSiteId: string;
  let testOperatorId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new ForkliftManagementService(prisma);

    // Create test site
    const site = await prisma.site.create({
      data: {
        name: 'Forklift Test Site',
        code: 'FK-TEST',
        address: '456 Fleet St',
        city: 'Warehouse City',
        state: 'WC',
        zipCode: '54321',
        country: 'US',
      },
    });
    testSiteId = site.id;

    // Create test operator user
    const operator = await prisma.user.create({
      data: {
        username: 'operator001',
        email: 'operator@example.com',
        passwordHash: 'hashed',
        firstName: 'John',
        lastName: 'Operator',
      },
    });
    testOperatorId = operator.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.forkliftMoveRequest.deleteMany({ where: { siteId: testSiteId } });
    await prisma.forklift.deleteMany({ where: { siteId: testSiteId } });
    await prisma.site.delete({ where: { id: testSiteId } });
    await prisma.user.delete({ where: { id: testOperatorId } });
    await prisma.$disconnect();
  });

  describe('Forklift CRUD Operations', () => {
    it('should create a new forklift', async () => {
      const forklift = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-001',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
        hasGPS: true,
      });

      expect(forklift).toBeDefined();
      expect(forklift.id).toBeDefined();
      expect(forklift.equipmentNumber).toBe('FK-001');
      expect(forklift.status).toBe('ACTIVE');
      expect(forklift.hasGPS).toBe(true);
    });

    it('should fail to create forklift with duplicate equipment number', async () => {
      await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-DUP',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      await expect(
        service.createForklift({
          siteId: testSiteId,
          equipmentNumber: 'FK-DUP',
          forkliftType: 'ELECTRIC_RIDER',
          make: 'Toyota',
          model: '8FGCU25',
          capacityLbs: 5000,
        })
      ).rejects.toThrow();
    });

    it('should retrieve a forklift by ID', async () => {
      const created = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-GET-001',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      const retrieved = await service.getForklift(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.equipmentNumber).toBe('FK-GET-001');
      expect(retrieved.status).toBe('ACTIVE');
    });

    it('should get all forklifts for a site', async () => {
      await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-SITE-001',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-SITE-002',
        forkliftType: 'REACH_TRUCK',
        make: 'Toyota',
        model: '8FRCXT',
        capacityLbs: 3000,
      });

      const forklifts = await service.getForkliftsBySite(testSiteId);

      expect(forklifts.length).toBe(2);
    });

    it('should filter forklifts by status', async () => {
      const fk1 = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-STATUS-001',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-STATUS-002',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      // Mark one as maintenance
      await service.markForMaintenance(fk1.id);

      const activeOnly = await service.getForkliftsBySite(testSiteId, {
        status: 'ACTIVE',
      });

      expect(activeOnly.length).toBe(1);
    });

    it('should update forklift details', async () => {
      const forklift = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-UPDATE',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      const updated = await service.updateForklift(forklift.id, {
        meterHours: 2500,
        notes: 'Recently serviced',
      });

      expect(updated.meterHours).toBe(2500);
      expect(updated.notes).toBe('Recently serviced');
    });
  });

  describe('Operator Assignment', () => {
    it('should assign an operator to a forklift', async () => {
      const forklift = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-ASSIGN',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      const assigned = await service.assignOperator(forklift.id, testOperatorId, 'LOC-001');

      expect(assigned.currentOperatorId).toBe(testOperatorId);
      expect(assigned.currentLocationId).toBe('LOC-001');
    });

    it('should release an operator from a forklift', async () => {
      const forklift = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-RELEASE',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      await service.assignOperator(forklift.id, testOperatorId);
      const released = await service.releaseOperator(forklift.id);

      expect(released.currentOperatorId).toBeNull();
    });

    it('should fail to assign operator to maintenance forklift', async () => {
      const forklift = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-MAINT-ASSIGN',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      await service.markForMaintenance(forklift.id);

      await expect(service.assignOperator(forklift.id, testOperatorId)).rejects.toThrow();
    });
  });

  describe('Maintenance Management', () => {
    it('should mark forklift for maintenance', async () => {
      const forklift = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-MAINTENANCE',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      const marked = await service.markForMaintenance(forklift.id, 'Battery replacement');

      expect(marked.status).toBe('MAINTENANCE');
      expect(marked.lastMaintenanceDate).toBeDefined();
    });

    it('should complete maintenance on forklift', async () => {
      const forklift = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-MAINT-COMPLETE',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      await service.markForMaintenance(forklift.id);

      const nextMaintenanceDate = new Date();
      nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + 90);

      const completed = await service.completeMaintenance(forklift.id, nextMaintenanceDate);

      expect(completed.status).toBe('ACTIVE');
      expect(completed.nextMaintenanceDate).toBeDefined();
    });
  });

  describe('GPS Location Tracking', () => {
    it('should update GPS location for GPS-enabled forklift', async () => {
      const forklift = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-GPS',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
        hasGPS: true,
      });

      const updated = await service.updateGPSLocation(forklift.id, 40.7128, -74.006, 10);

      expect(updated.lastGPSLocation).toBeDefined();
      expect(updated.lastGPSUpdateAt).toBeDefined();
    });

    it('should fail to update GPS for non-GPS forklift', async () => {
      const forklift = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-NO-GPS',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
        hasGPS: false,
      });

      await expect(service.updateGPSLocation(forklift.id, 40.7128, -74.006)).rejects.toThrow();
    });
  });

  describe('Forklift Move Requests', () => {
    it('should create a forklift move request', async () => {
      const request = await service.createMoveRequest({
        siteId: testSiteId,
        sourceLocationId: 'LOC-A',
        destinationLocationId: 'LOC-B',
        containerIds: ['CONT-001', 'CONT-002'],
        createdBy: testOperatorId,
        priority: 'HIGH',
      });

      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.status).toBe('OPEN');
      expect(request.containerIds).toEqual(['CONT-001', 'CONT-002']);
    });

    it('should get open move requests for a site', async () => {
      await service.createMoveRequest({
        siteId: testSiteId,
        sourceLocationId: 'LOC-A',
        destinationLocationId: 'LOC-B',
        containerIds: ['CONT-001'],
        createdBy: testOperatorId,
      });

      await service.createMoveRequest({
        siteId: testSiteId,
        sourceLocationId: 'LOC-C',
        destinationLocationId: 'LOC-D',
        containerIds: ['CONT-002'],
        createdBy: testOperatorId,
      });

      const openRequests = await service.getOpenMoveRequests(testSiteId);

      expect(openRequests.length).toBe(2);
    });

    it('should assign forklift to move request', async () => {
      const forklift = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-ASSIGN-REQ',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      const request = await service.createMoveRequest({
        siteId: testSiteId,
        sourceLocationId: 'LOC-A',
        destinationLocationId: 'LOC-B',
        containerIds: ['CONT-001'],
        createdBy: testOperatorId,
      });

      const assigned = await service.assignForkliftToRequest(request.id, {
        forkliftId: forklift.id,
        operatorId: testOperatorId,
      });

      expect(assigned.assignedForkliftId).toBe(forklift.id);
      expect(assigned.operatorId).toBe(testOperatorId);
      expect(assigned.status).toBe('ASSIGNED');
    });

    it('should start a move request', async () => {
      const forklift = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-START-REQ',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      const request = await service.createMoveRequest({
        siteId: testSiteId,
        sourceLocationId: 'LOC-A',
        destinationLocationId: 'LOC-B',
        containerIds: ['CONT-001'],
        createdBy: testOperatorId,
      });

      await service.assignForkliftToRequest(request.id, {
        forkliftId: forklift.id,
        operatorId: testOperatorId,
      });

      const started = await service.startMoveRequest(request.id);

      expect(started.status).toBe('IN_PROGRESS');
      expect(started.actualStartTime).toBeDefined();
    });

    it('should complete a move request', async () => {
      const forklift = await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-COMPLETE-REQ',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      const request = await service.createMoveRequest({
        siteId: testSiteId,
        sourceLocationId: 'LOC-A',
        destinationLocationId: 'LOC-B',
        containerIds: ['CONT-001'],
        createdBy: testOperatorId,
      });

      await service.assignForkliftToRequest(request.id, {
        forkliftId: forklift.id,
        operatorId: testOperatorId,
      });

      await service.startMoveRequest(request.id);
      const completed = await service.completeMoveRequest(request.id);

      expect(completed.status).toBe('COMPLETED');
    });

    it('should cancel a move request', async () => {
      const request = await service.createMoveRequest({
        siteId: testSiteId,
        sourceLocationId: 'LOC-A',
        destinationLocationId: 'LOC-B',
        containerIds: ['CONT-001'],
        createdBy: testOperatorId,
      });

      const cancelled = await service.cancelMoveRequest(request.id, 'Location unavailable');

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.notes).toContain('Cancelled');
    });
  });

  describe('Fleet Summary', () => {
    it('should return fleet summary statistics', async () => {
      await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-SUM-001',
        forkliftType: 'ELECTRIC_RIDER',
        make: 'Toyota',
        model: '8FGCU25',
        capacityLbs: 5000,
      });

      await service.createForklift({
        siteId: testSiteId,
        equipmentNumber: 'FK-SUM-002',
        forkliftType: 'REACH_TRUCK',
        make: 'Toyota',
        model: '8FRCXT',
        capacityLbs: 3000,
      });

      const summary = await service.getFleetSummary(testSiteId);

      expect(summary).toBeDefined();
      expect(summary.totalForklifts).toBe(2);
      expect(summary.byStatus).toBeDefined();
      expect(summary.byType).toBeDefined();
    });
  });
});
