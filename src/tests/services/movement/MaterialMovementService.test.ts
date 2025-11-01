/**
 * Material Movement Service Tests
 * Phase 2: Comprehensive testing for movement creation, status transitions, and tracking
 * Issue #64: Material Movement & Logistics Management System
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { MaterialMovementService } from '../../../services/movement/MaterialMovementService';

describe('MaterialMovementService - Phase 2', () => {
  let prisma: PrismaClient;
  let service: MaterialMovementService;
  let testSiteId: string;
  let testMovementTypeId: string;
  let testForkliftId: string;
  let testUserId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new MaterialMovementService(prisma);

    // Create test data
    const site = await prisma.site.create({
      data: {
        name: 'Test Site',
        code: 'TEST-SITE',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
      },
    });
    testSiteId = site.id;

    const movementType = await prisma.movementType.create({
      data: {
        siteId: testSiteId,
        code: 'MANUAL_MOVE',
        name: 'Manual Material Movement',
        description: 'Manual warehouse movement',
        requiresApproval: false,
        isActive: true,
      },
    });
    testMovementTypeId = movementType.id;

    const forklift = await prisma.forklift.create({
      data: {
        siteId: testSiteId,
        equipmentNumber: 'FORK-001',
        forkliftType: 'ELECTRIC_RIDER',
        status: 'ACTIVE',
        capacityLbs: 5000,
      },
    });
    testForkliftId = forklift.id;

    const user = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'testuser@example.com',
        passwordHash: 'hashed',
        firstName: 'Test',
        lastName: 'User',
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Cleanup test data
    await prisma.materialMovement.deleteMany({ where: { siteId: testSiteId } });
    await prisma.forklift.deleteMany({ where: { siteId: testSiteId } });
    await prisma.movementType.deleteMany({ where: { siteId: testSiteId } });
    await prisma.site.delete({ where: { id: testSiteId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('createMovement', () => {
    it('should create a new material movement in DRAFT status', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-001',
        description: 'Test movement',
        fromLocationId: 'LOC-001',
        toLocationId: 'LOC-002',
        quantity: 100,
        unitOfMeasure: 'EACH',
        createdBy: testUserId,
      });

      expect(movement).toBeDefined();
      expect(movement.id).toBeDefined();
      expect(movement.movementNumber).toBe('MOV-001');
      expect(movement.status).toBe('DRAFT');
      expect(movement.priority).toBe('NORMAL');
      expect(movement.quantity).toBeDefined();
    });

    it('should create a movement with work order IDs', async () => {
      const workOrderIds = ['WO-001', 'WO-002'];
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-WO-001',
        workOrderIds,
        createdBy: testUserId,
      });

      expect(movement.workOrderIds).toEqual(workOrderIds);
    });

    it('should create a movement with HIGH priority', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-HIGH',
        priority: 'HIGH',
        createdBy: testUserId,
      });

      expect(movement.priority).toBe('HIGH');
    });

    it('should fail if movement type does not exist', async () => {
      await expect(
        service.createMovement({
          siteId: testSiteId,
          movementTypeId: 'INVALID-ID',
          movementNumber: 'MOV-FAIL',
          createdBy: testUserId,
        })
      ).rejects.toThrow();
    });

    it('should include tracking event on creation', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-TRACK',
        createdBy: testUserId,
      });

      expect(movement.trackingEvents).toBeDefined();
      expect(Array.isArray(movement.trackingEvents)).toBe(true);
      expect(movement.trackingEvents.length).toBeGreaterThan(0);
      expect(movement.trackingEvents[0].status).toBe('DRAFT');
    });
  });

  describe('getMovement', () => {
    it('should retrieve a movement by ID', async () => {
      const created = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-GET-001',
        createdBy: testUserId,
      });

      const retrieved = await service.getMovement(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.movementNumber).toBe('MOV-GET-001');
      expect(retrieved.status).toBe('DRAFT');
    });

    it('should include related forklift and operator data', async () => {
      const created = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-WITH-FK',
        createdBy: testUserId,
      });

      // Assign forklift
      await service.assignForklift(created.id, {
        forkliftId: testForkliftId,
        operatorId: testUserId,
      });

      const retrieved = await service.getMovement(created.id);

      expect(retrieved.forklift).toBeDefined();
      expect(retrieved.forkliftOperator).toBeDefined();
    });

    it('should fail if movement does not exist', async () => {
      await expect(service.getMovement('INVALID-ID')).rejects.toThrow();
    });
  });

  describe('getMovementsBySite', () => {
    it('should retrieve all movements for a site', async () => {
      await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-SITE-001',
        createdBy: testUserId,
      });

      await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-SITE-002',
        createdBy: testUserId,
      });

      const movements = await service.getMovementsBySite(testSiteId);

      expect(movements.length).toBe(2);
    });

    it('should filter movements by status', async () => {
      const mov1 = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-STATUS-001',
        createdBy: testUserId,
      });

      const mov2 = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-STATUS-002',
        createdBy: testUserId,
      });

      // Transition one to SCHEDULED
      await service.transitionStatus(mov2.id, {
        status: 'SCHEDULED',
      });

      const drafts = await service.getMovementsBySite(testSiteId, {
        status: 'DRAFT',
      });

      expect(drafts.length).toBe(1);
      expect(drafts[0].movementNumber).toBe('MOV-STATUS-001');
    });

    it('should filter movements by priority', async () => {
      await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-PRI-001',
        priority: 'HIGH',
        createdBy: testUserId,
      });

      const highPriority = await service.getMovementsBySite(testSiteId, {
        priority: 'HIGH',
      });

      expect(highPriority.length).toBe(1);
      expect(highPriority[0].priority).toBe('HIGH');
    });

    it('should respect limit and offset parameters', async () => {
      for (let i = 0; i < 5; i++) {
        await service.createMovement({
          siteId: testSiteId,
          movementTypeId: testMovementTypeId,
          movementNumber: `MOV-PAGE-${i}`,
          createdBy: testUserId,
        });
      }

      const page1 = await service.getMovementsBySite(testSiteId, { limit: 2, offset: 0 });
      const page2 = await service.getMovementsBySite(testSiteId, { limit: 2, offset: 2 });

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
    });
  });

  describe('updateMovement', () => {
    it('should update a DRAFT movement', async () => {
      const created = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-UPDATE-001',
        description: 'Original description',
        createdBy: testUserId,
      });

      const updated = await service.updateMovement(created.id, {
        description: 'Updated description',
        priority: 'HIGH',
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.priority).toBe('HIGH');
    });

    it('should fail to update a SCHEDULED movement', async () => {
      const created = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-NO-UPDATE',
        createdBy: testUserId,
      });

      await service.transitionStatus(created.id, { status: 'SCHEDULED' });

      await expect(
        service.updateMovement(created.id, {
          description: 'New description',
        })
      ).rejects.toThrow();
    });

    it('should allow updating ON_HOLD movements', async () => {
      const created = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-ON-HOLD-UPDATE',
        createdBy: testUserId,
      });

      await service.transitionStatus(created.id, { status: 'SCHEDULED' });
      await service.transitionStatus(created.id, { status: 'ON_HOLD' });

      const updated = await service.updateMovement(created.id, {
        notes: 'Updated while on hold',
      });

      expect(updated.notes).toBe('Updated while on hold');
    });
  });

  describe('transitionStatus', () => {
    it('should transition from DRAFT to SCHEDULED', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-TRANS-001',
        createdBy: testUserId,
      });

      const updated = await service.transitionStatus(movement.id, { status: 'SCHEDULED' });

      expect(updated.status).toBe('SCHEDULED');
      expect(updated.trackingEvents.length).toBe(2);
    });

    it('should transition from SCHEDULED to IN_TRANSIT', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-TRANS-002',
        createdBy: testUserId,
      });

      await service.transitionStatus(movement.id, { status: 'SCHEDULED' });
      const updated = await service.transitionStatus(movement.id, { status: 'IN_TRANSIT' });

      expect(updated.status).toBe('IN_TRANSIT');
      expect(updated.actualStartTime).toBeDefined();
    });

    it('should transition from IN_TRANSIT to COMPLETED', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-TRANS-003',
        createdBy: testUserId,
      });

      await service.transitionStatus(movement.id, { status: 'SCHEDULED' });
      await service.transitionStatus(movement.id, { status: 'IN_TRANSIT' });
      const updated = await service.transitionStatus(movement.id, { status: 'COMPLETED' });

      expect(updated.status).toBe('COMPLETED');
      expect(updated.actualCompletionTime).toBeDefined();
    });

    it('should support ON_HOLD from multiple statuses', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-HOLD',
        createdBy: testUserId,
      });

      await service.transitionStatus(movement.id, { status: 'SCHEDULED' });
      const updated = await service.transitionStatus(movement.id, { status: 'ON_HOLD' });

      expect(updated.status).toBe('ON_HOLD');
    });

    it('should reject invalid status transitions', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-INVALID-TRANS',
        createdBy: testUserId,
      });

      await expect(
        service.transitionStatus(movement.id, { status: 'COMPLETED' })
      ).rejects.toThrow();
    });

    it('should record transition reason in tracking events', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-REASON',
        createdBy: testUserId,
      });

      const reason = 'Scheduled for morning pickup';
      const updated = await service.transitionStatus(movement.id, {
        status: 'SCHEDULED',
        reason,
      });

      const lastEvent = updated.trackingEvents[updated.trackingEvents.length - 1];
      expect(lastEvent.notes).toBe(reason);
    });
  });

  describe('assignForklift', () => {
    it('should assign a forklift to a movement', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-ASSIGN-FK',
        createdBy: testUserId,
      });

      const updated = await service.assignForklift(movement.id, {
        forkliftId: testForkliftId,
        operatorId: testUserId,
      });

      expect(updated.forkliftId).toBe(testForkliftId);
      expect(updated.forkliftOperatorId).toBe(testUserId);
    });

    it('should fail if forklift does not exist', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-INVALID-FK',
        createdBy: testUserId,
      });

      await expect(
        service.assignForklift(movement.id, {
          forkliftId: 'INVALID-FK',
        })
      ).rejects.toThrow();
    });

    it('should fail if forklift is not ACTIVE', async () => {
      // Create an inactive forklift
      const inactive = await prisma.forklift.create({
        data: {
          siteId: testSiteId,
          equipmentNumber: 'FORK-INACTIVE',
          forkliftType: 'ELECTRIC_RIDER',
          status: 'MAINTENANCE',
          capacityLbs: 5000,
        },
      });

      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-INACTIVE-FK',
        createdBy: testUserId,
      });

      await expect(
        service.assignForklift(movement.id, {
          forkliftId: inactive.id,
        })
      ).rejects.toThrow();
    });
  });

  describe('recordLocationUpdate', () => {
    it('should record a location update with tracking event', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-LOC-UPDATE',
        createdBy: testUserId,
      });

      const updated = await service.recordLocationUpdate(movement.id, 'LOC-WAREHOUSE', testUserId);

      expect(updated.fromLocationId).toBe('LOC-WAREHOUSE');
      expect(updated.trackingEvents.length).toBe(2);
    });

    it('should include user ID in location tracking event', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-LOC-USER',
        createdBy: testUserId,
      });

      const updated = await service.recordLocationUpdate(movement.id, 'LOC-A', testUserId);

      const lastEvent = updated.trackingEvents[updated.trackingEvents.length - 1];
      expect(lastEvent.userId).toBe(testUserId);
      expect(lastEvent.location).toBe('LOC-A');
    });
  });

  describe('getTrackingHistory', () => {
    it('should return complete tracking history', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-HISTORY',
        createdBy: testUserId,
      });

      await service.transitionStatus(movement.id, { status: 'SCHEDULED' });
      await service.recordLocationUpdate(movement.id, 'LOC-X', testUserId);
      await service.transitionStatus(movement.id, { status: 'IN_TRANSIT' });

      const history = await service.getTrackingHistory(movement.id);

      expect(history.length).toBe(4); // creation + 2 transitions + 1 location
      expect(history[0].status).toBe('DRAFT');
      expect(history[1].status).toBe('SCHEDULED');
      expect(history[3].status).toBe('IN_TRANSIT');
    });
  });

  describe('deleteMovement', () => {
    it('should delete a DRAFT movement', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-DELETE',
        createdBy: testUserId,
      });

      await service.deleteMovement(movement.id);

      await expect(service.getMovement(movement.id)).rejects.toThrow();
    });

    it('should fail to delete a SCHEDULED movement', async () => {
      const movement = await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-NO-DELETE',
        createdBy: testUserId,
      });

      await service.transitionStatus(movement.id, { status: 'SCHEDULED' });

      await expect(service.deleteMovement(movement.id)).rejects.toThrow();
    });
  });

  describe('getMovementsSummary', () => {
    it('should return summary statistics', async () => {
      await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-SUM-001',
        priority: 'HIGH',
        createdBy: testUserId,
      });

      await service.createMovement({
        siteId: testSiteId,
        movementTypeId: testMovementTypeId,
        movementNumber: 'MOV-SUM-002',
        priority: 'NORMAL',
        createdBy: testUserId,
      });

      const summary = await service.getMovementsSummary(testSiteId);

      expect(summary).toBeDefined();
      expect(summary.totalCount).toBeGreaterThanOrEqual(2);
      expect(summary.byStatus).toBeDefined();
      expect(summary.byPriority).toBeDefined();
    });
  });
});
