/**
 * Vendor Serial Service Tests
 * Issue #150: Serialization - Advanced Assignment Workflows
 * Phase 2: Vendor Serial Acceptance and Validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import VendorSerialService from '../../../services/serialization/VendorSerialService';

describe('VendorSerialService', () => {
  let prisma: PrismaClient;
  let service: VendorSerialService;
  let testPartId: string;
  let testSiteId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new VendorSerialService(prisma);

    // Create test site with unique code
    const uniqueSiteCode = `VST-${Date.now()}`;
    const site = await prisma.site.create({
      data: {
        siteCode: uniqueSiteCode,
        siteName: 'Vendor Serial Test Site',
        location: '123 Test St',
      },
    });
    testSiteId = site.id;

    // Create test part with unique part number
    const uniquePartNumber = `PART-VS-${Date.now()}`;
    const part = await prisma.part.create({
      data: {
        partNumber: uniquePartNumber,
        partName: 'Test Part for Vendor Serials',
        description: 'Test Part for Vendor Serials',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
        revision: '1.0',
      },
    });
    testPartId = part.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.serialAssignmentAudit.deleteMany({ where: { partId: testPartId } });
    await prisma.vendorSerial.deleteMany({ where: { partId: testPartId } });
    await prisma.serialUniquenessScope.deleteMany({ where: { partId: testPartId } });
    await prisma.part.delete({ where: { id: testPartId } });
    await prisma.site.delete({ where: { id: testSiteId } });
    await prisma.$disconnect();
  });

  describe('Vendor Serial Reception', () => {
    it('should receive and record a new vendor serial', async () => {
      const result = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-12345',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.vendorSerialNumber).toBe('VEN-12345');
      expect(result.vendorName).toBe('Acme Manufacturing');
      expect(result.receivedDate).toBeDefined();
    });

    it('should reject vendor serial with empty serial number', async () => {
      await expect(
        service.receiveVendorSerial({
          vendorSerialNumber: '',
          vendorName: 'Acme Manufacturing',
          partId: testPartId,
        })
      ).rejects.toThrow('Vendor serial number cannot be empty');
    });

    it('should reject vendor serial with missing vendor name', async () => {
      await expect(
        service.receiveVendorSerial({
          vendorSerialNumber: 'VEN-12345',
          vendorName: '',
          partId: testPartId,
        })
      ).rejects.toThrow('Vendor name is required');
    });

    it('should reject vendor serial with invalid part ID', async () => {
      await expect(
        service.receiveVendorSerial({
          vendorSerialNumber: 'VEN-12345',
          vendorName: 'Acme Manufacturing',
          partId: 'INVALID-PART-ID',
        })
      ).rejects.toThrow();
    });

    it('should prevent duplicate vendor serials for same vendor and part', async () => {
      await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-DUP',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      await expect(
        service.receiveVendorSerial({
          vendorSerialNumber: 'VEN-DUP',
          vendorName: 'Acme Manufacturing',
          partId: testPartId,
        })
      ).rejects.toThrow('already exists');
    });

    it('should allow same serial number from different vendors', async () => {
      await service.receiveVendorSerial({
        vendorSerialNumber: 'SHARED-001',
        vendorName: 'Vendor A',
        partId: testPartId,
      });

      const result = await service.receiveVendorSerial({
        vendorSerialNumber: 'SHARED-001',
        vendorName: 'Vendor B',
        partId: testPartId,
      });

      expect(result.vendorSerialNumber).toBe('SHARED-001');
      expect(result.vendorName).toBe('Vendor B');
    });

    it('should accept custom received date', async () => {
      const customDate = new Date('2024-01-01');
      const result = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-CUSTOM',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
        receivedDate: customDate,
      });

      expect(result.receivedDate).toEqual(customDate);
    });
  });

  describe('Vendor Serial Validation', () => {
    it('should validate received vendor serial', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-VALID',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      const validation = await service.validateVendorSerial(vendorSerial.id);

      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
      expect(validation.formatValid).toBeDefined();
      expect(validation.isUnique).toBeDefined();
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should detect invalid vendor serial ID', async () => {
      await expect(service.validateVendorSerial('INVALID-ID')).rejects.toThrow(
        'not found'
      );
    });

    it('should warn about already accepted vendor serial', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-WARN',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      // Accept the serial
      await service.acceptVendorSerial({
        vendorSerialId: vendorSerial.id,
        acceptedBy: 'test-user',
      });

      const validation = await service.validateVendorSerial(vendorSerial.id);

      expect(validation.warnings.some((w) => w.includes('already accepted'))).toBe(true);
    });

    it('should error on rejected vendor serial', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-REJECT',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      // Reject the serial
      await service.rejectVendorSerial({
        vendorSerialId: vendorSerial.id,
        rejectionReason: 'Invalid format',
        rejectedBy: 'test-user',
      });

      const validation = await service.validateVendorSerial(vendorSerial.id);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('rejected'))).toBe(true);
    });
  });

  describe('Vendor Serial Acceptance', () => {
    it('should accept a vendor serial', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-ACCEPT',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      const accepted = await service.acceptVendorSerial({
        vendorSerialId: vendorSerial.id,
        acceptedBy: 'quality-inspector',
      });

      expect(accepted.acceptedDate).toBeDefined();
      expect(accepted.acceptedBy).toBe('quality-inspector');
      expect(accepted.isUnique).toBe(true);
    });

    it('should accept vendor serial and link to internal serial', async () => {
      // Create internal serial
      const internalSerial = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'INT-12345',
          status: 'ACTIVE',
        },
      });

      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-LINK',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      const accepted = await service.acceptVendorSerial({
        vendorSerialId: vendorSerial.id,
        acceptedBy: 'quality-inspector',
        internalSerialId: internalSerial.id,
      });

      expect(accepted.internalSerialId).toBe(internalSerial.id);
    });

    it('should prevent accepting already accepted vendor serial', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-ALREADY-ACCEPT',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      await service.acceptVendorSerial({
        vendorSerialId: vendorSerial.id,
        acceptedBy: 'quality-inspector',
      });

      await expect(
        service.acceptVendorSerial({
          vendorSerialId: vendorSerial.id,
          acceptedBy: 'quality-inspector',
        })
      ).rejects.toThrow('already been accepted');
    });

    it('should prevent accepting rejected vendor serial', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-REJECT-THEN-ACCEPT',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      await service.rejectVendorSerial({
        vendorSerialId: vendorSerial.id,
        rejectionReason: 'Invalid',
        rejectedBy: 'quality-inspector',
      });

      await expect(
        service.acceptVendorSerial({
          vendorSerialId: vendorSerial.id,
          acceptedBy: 'quality-inspector',
        })
      ).rejects.toThrow('rejected');
    });

    it('should validate internal serial exists before linking', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-BAD-LINK',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      await expect(
        service.acceptVendorSerial({
          vendorSerialId: vendorSerial.id,
          acceptedBy: 'quality-inspector',
          internalSerialId: 'INVALID-INTERNAL-ID',
        })
      ).rejects.toThrow('not found');
    });

    it('should validate part match when linking serials', async () => {
      // Create internal serial with different part
      const otherPart = await prisma.part.create({
        data: {
          partNumber: `PART-OTHER-${Date.now()}`,
          partName: 'Other Part',
          description: 'Other Part',
          partType: 'COMPONENT',
          unitOfMeasure: 'EA',
          revision: '1.0',
        },
      });

      const internalSerial = await prisma.serializedPart.create({
        data: {
          partId: otherPart.id,
          serialNumber: 'INT-OTHER',
          status: 'ACTIVE',
        },
      });

      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-PART-MISMATCH',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      await expect(
        service.acceptVendorSerial({
          vendorSerialId: vendorSerial.id,
          acceptedBy: 'quality-inspector',
          internalSerialId: internalSerial.id,
        })
      ).rejects.toThrow('mismatch');

      await prisma.serializedPart.delete({ where: { id: internalSerial.id } });
      await prisma.part.delete({ where: { id: otherPart.id } });
    });
  });

  describe('Vendor Serial Rejection', () => {
    it('should reject a vendor serial with reason', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-BAD',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      const rejected = await service.rejectVendorSerial({
        vendorSerialId: vendorSerial.id,
        rejectionReason: 'Format does not match specification',
        rejectedBy: 'quality-inspector',
      });

      expect(rejected.rejectedDate).toBeDefined();
      expect(rejected.rejectionReason).toBe('Format does not match specification');
    });

    it('should prevent rejecting already accepted vendor serial', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-ACCEPT-THEN-REJECT',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      await service.acceptVendorSerial({
        vendorSerialId: vendorSerial.id,
        acceptedBy: 'quality-inspector',
      });

      await expect(
        service.rejectVendorSerial({
          vendorSerialId: vendorSerial.id,
          rejectionReason: 'Change of mind',
          rejectedBy: 'quality-inspector',
        })
      ).rejects.toThrow('Cannot reject an already accepted');
    });

    it('should prevent double rejection', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-DOUBLE-REJECT',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      await service.rejectVendorSerial({
        vendorSerialId: vendorSerial.id,
        rejectionReason: 'First rejection',
        rejectedBy: 'quality-inspector',
      });

      await expect(
        service.rejectVendorSerial({
          vendorSerialId: vendorSerial.id,
          rejectionReason: 'Second rejection',
          rejectedBy: 'quality-inspector',
        })
      ).rejects.toThrow('already been rejected');
    });
  });

  describe('Vendor Serial Propagation', () => {
    it('should propagate accepted vendor serial through operation', async () => {
      // Create and accept vendor serial
      const internalSerial = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'INT-PROP',
          status: 'ACTIVE',
        },
      });

      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-PROP',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      await service.acceptVendorSerial({
        vendorSerialId: vendorSerial.id,
        acceptedBy: 'quality-inspector',
        internalSerialId: internalSerial.id,
      });

      // Propagate
      await expect(
        service.propagateVendorSerial({
          vendorSerialId: vendorSerial.id,
          operationCode: 'OP-001',
          quantity: 1,
          propagatedBy: 'operator',
        })
      ).resolves.not.toThrow();
    });

    it('should prevent propagation of unaccepted vendor serial', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-NO-PROP',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      await expect(
        service.propagateVendorSerial({
          vendorSerialId: vendorSerial.id,
          operationCode: 'OP-001',
          quantity: 1,
          propagatedBy: 'operator',
        })
      ).rejects.toThrow('must be accepted');
    });

    it('should prevent propagation of unlinked vendor serial', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-NO-LINK-PROP',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      await service.acceptVendorSerial({
        vendorSerialId: vendorSerial.id,
        acceptedBy: 'quality-inspector',
      });

      await expect(
        service.propagateVendorSerial({
          vendorSerialId: vendorSerial.id,
          operationCode: 'OP-001',
          quantity: 1,
          propagatedBy: 'operator',
        })
      ).rejects.toThrow('must be linked');
    });
  });

  describe('Vendor Serial Retrieval', () => {
    it('should retrieve vendor serial by ID', async () => {
      const created = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-GET',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      const retrieved = await service.getVendorSerial(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.vendorSerialNumber).toBe('VEN-GET');
    });

    it('should return null for non-existent vendor serial', async () => {
      const result = await service.getVendorSerial('INVALID-ID');

      expect(result).toBeNull();
    });

    it('should get all vendor serials for a part', async () => {
      await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-PART-1',
        vendorName: 'Vendor A',
        partId: testPartId,
      });

      await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-PART-2',
        vendorName: 'Vendor B',
        partId: testPartId,
      });

      const result = await service.getVendorSerialsByPart(testPartId);

      expect(result.length).toBe(2);
    });

    it('should filter vendor serials by status', async () => {
      const serial1 = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-STATUS-1',
        vendorName: 'Vendor A',
        partId: testPartId,
      });

      const serial2 = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-STATUS-2',
        vendorName: 'Vendor B',
        partId: testPartId,
      });

      await service.acceptVendorSerial({
        vendorSerialId: serial1.id,
        acceptedBy: 'inspector',
      });

      await service.rejectVendorSerial({
        vendorSerialId: serial2.id,
        rejectionReason: 'Invalid',
        rejectedBy: 'inspector',
      });

      const pending = await service.getVendorSerialsByPart(testPartId, { status: 'pending' });
      const accepted = await service.getVendorSerialsByPart(testPartId, { status: 'accepted' });
      const rejected = await service.getVendorSerialsByPart(testPartId, { status: 'rejected' });

      expect(pending.length).toBe(0);
      expect(accepted.length).toBe(1);
      expect(rejected.length).toBe(1);
    });

    it('should filter vendor serials by vendor name', async () => {
      await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-VENDOR-A',
        vendorName: 'Vendor A',
        partId: testPartId,
      });

      await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-VENDOR-B',
        vendorName: 'Vendor B',
        partId: testPartId,
      });

      const result = await service.getVendorSerialsByPart(testPartId, {
        vendorName: 'Vendor A',
      });

      expect(result.length).toBe(1);
      expect(result[0].vendorName).toBe('Vendor A');
    });
  });

  describe('Audit Trail', () => {
    it('should create audit entry on vendor serial acceptance', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-AUDIT',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      await service.acceptVendorSerial({
        vendorSerialId: vendorSerial.id,
        acceptedBy: 'quality-inspector',
      });

      const audits = await prisma.serialAssignmentAudit.findMany({
        where: { serialId: vendorSerial.id },
      });

      expect(audits.length).toBeGreaterThan(0);
      expect(audits.some((a) => a.eventType === 'ACCEPTED')).toBe(true);
    });

    it('should create audit entry on vendor serial rejection', async () => {
      const vendorSerial = await service.receiveVendorSerial({
        vendorSerialNumber: 'VEN-AUDIT-REJECT',
        vendorName: 'Acme Manufacturing',
        partId: testPartId,
      });

      await service.rejectVendorSerial({
        vendorSerialId: vendorSerial.id,
        rejectionReason: 'Test rejection',
        rejectedBy: 'quality-inspector',
      });

      const audits = await prisma.serialAssignmentAudit.findMany({
        where: { serialId: vendorSerial.id },
      });

      expect(audits.length).toBeGreaterThan(0);
    });
  });
});
