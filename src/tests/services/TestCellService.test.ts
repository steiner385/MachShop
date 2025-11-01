/**
 * Test Suite for TestCellService
 * Issue #233: Test Cell Integration & Engine Acceptance Testing
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient, TestCellStatus, DAQSystemType } from '@prisma/client';
import { TestCellService } from '../../services/TestCellService';

describe('TestCellService', () => {
  let prisma: PrismaClient;
  let testCellService: TestCellService;
  let testSiteId: string;
  let testCellId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    testCellService = new TestCellService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createTestCell', () => {
    it('should create a test cell with valid input', async () => {
      const input = {
        siteId: 'test-site-1',
        cellName: 'Test Cell Alpha',
        cellIdentifier: `TC-ALPHA-${Date.now()}`,
        testType: 'Engine Acceptance',
        location: 'Building A, Test Bay 1',
        daqSystemType: 'NI_LABVIEW' as DAQSystemType,
        daqSystemId: 'DAQ-001',
        daqApiEndpoint: 'http://localhost:8080',
        maxConcurrentTests: 2,
        estimatedTestDuration: 120,
        certificationNumber: 'FAA-2025-001',
        complianceNotes: 'FAA AC 43-207 compliant',
      };

      const result = await testCellService.createTestCell(input);

      expect(result).toBeDefined();
      expect(result.cellName).toBe(input.cellName);
      expect(result.cellIdentifier).toBe(input.cellIdentifier);
      expect(result.status).toBe('OPERATIONAL');
      expect(result.isActive).toBe(true);

      testCellId = result.id;
      testSiteId = result.siteId;
    });

    it('should reject duplicate cell identifier', async () => {
      const input = {
        siteId: testSiteId,
        cellName: 'Duplicate Test',
        cellIdentifier: `TC-DUPLICATE-${Date.now()}`,
        testType: 'Performance',
        location: 'Building B',
        daqSystemType: 'SIEMENS_TESTLAB' as DAQSystemType,
      };

      // Create first cell
      const first = await testCellService.createTestCell(input);
      expect(first).toBeDefined();

      // Try to create duplicate
      await expect(
        testCellService.createTestCell({
          ...input,
          cellName: 'Different Name',
        })
      ).rejects.toThrow();
    });

    it('should reject missing required fields', async () => {
      await expect(
        testCellService.createTestCell({
          siteId: testSiteId,
          cellName: 'Test',
          // Missing cellIdentifier
          cellIdentifier: '',
          testType: 'Test',
          location: 'Test',
          daqSystemType: 'OTHER' as DAQSystemType,
        })
      ).rejects.toThrow();
    });
  });

  describe('getTestCell', () => {
    it('should retrieve test cell by ID', async () => {
      const result = await testCellService.getTestCell(testCellId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testCellId);
      expect(result?.cellName).toBe('Test Cell Alpha');
    });

    it('should return null for non-existent cell', async () => {
      const result = await testCellService.getTestCell('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('getSiteTestCells', () => {
    it('should retrieve all test cells for a site', async () => {
      const results = await testCellService.getSiteTestCells(testSiteId);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('cellName');
    });

    it('should only return active cells when activeOnly is true', async () => {
      const results = await testCellService.getSiteTestCells(testSiteId, true);

      expect(results.every(cell => cell.isActive)).toBe(true);
    });
  });

  describe('setTestCellStatus', () => {
    it('should change test cell status', async () => {
      const newStatus: TestCellStatus = 'MAINTENANCE';
      const result = await testCellService.setTestCellStatus(testCellId, newStatus);

      expect(result.status).toBe(newStatus);
    });

    it('should track status changes', async () => {
      const operational: TestCellStatus = 'OPERATIONAL';
      await testCellService.setTestCellStatus(testCellId, operational);

      const updated = await testCellService.getTestCell(testCellId);
      expect(updated?.status).toBe(operational);
    });
  });

  describe('recordMaintenance', () => {
    it('should record maintenance information', async () => {
      const maintenanceDate = new Date();
      const nextMaintenanceDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const intervalDays = 30;

      const result = await testCellService.recordMaintenance(
        testCellId,
        maintenanceDate,
        nextMaintenanceDate,
        intervalDays
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('OPERATIONAL');
    });
  });

  describe('scheduleTestCell', () => {
    it('should schedule test cell availability', async () => {
      const schedule = await testCellService.scheduleTestCell({
        testCellId,
        scheduledDate: new Date(),
        startTime: '09:00',
        endTime: '17:00',
        scheduleType: 'AVAILABLE',
        notes: 'Standard business hours',
      });

      expect(schedule).toBeDefined();
      expect(schedule.scheduleType).toBe('AVAILABLE');
      expect(schedule.isActive).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('should check availability for operational cell', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

      const available = await testCellService.isAvailable(testCellId, startDate, endDate);

      expect(typeof available).toBe('boolean');
    });

    it('should return false for non-operational cell', async () => {
      // Set to maintenance
      await testCellService.setTestCellStatus(testCellId, 'MAINTENANCE' as TestCellStatus);

      const startDate = new Date();
      const endDate = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const available = await testCellService.isAvailable(testCellId, startDate, endDate);

      expect(available).toBe(false);

      // Restore to operational
      await testCellService.setTestCellStatus(testCellId, 'OPERATIONAL' as TestCellStatus);
    });
  });

  describe('verifyCompliance', () => {
    it('should verify FAA compliance status', async () => {
      const compliance = await testCellService.verifyCompliance(testCellId);

      expect(compliance).toHaveProperty('isCompliant');
      expect(compliance).toHaveProperty('notes');
      expect(typeof compliance.isCompliant).toBe('boolean');
    });

    it('should check certification expiry', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await testCellService.updateTestCell(testCellId, {
        certificationExpiry: futureDate,
      });

      const compliance = await testCellService.verifyCompliance(testCellId);
      expect(compliance.isCompliant).toBe(true);
    });
  });

  describe('deactivateTestCell', () => {
    it('should deactivate a test cell', async () => {
      const result = await testCellService.deactivateTestCell(testCellId);

      expect(result.isActive).toBe(false);
      expect(result.status).toBe('OUT_OF_SERVICE');
    });
  });
});
