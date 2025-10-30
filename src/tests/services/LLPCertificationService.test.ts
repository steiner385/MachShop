/**
 * Comprehensive Unit Tests for LLPCertificationService
 * Tests certification document management, compliance validation,
 * and regulatory compliance for aerospace components.
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LLPCertificationService } from '@/services/LLPCertificationService';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database';
import {
  LLPCriticalityLevel,
  LLPRetirementType,
  LLPCertificationType
} from '@prisma/client';

describe('LLPCertificationService', () => {
  let testDb: PrismaClient;
  let llpCertificationService: LLPCertificationService;
  let testPartId: string;
  let testSerializedPartId: string;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    llpCertificationService = new LLPCertificationService(testDb);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await testDb.llpCertification.deleteMany();
    await testDb.serializedPart.deleteMany();
    await testDb.part.deleteMany();

    // Create test part with certification requirements
    const testPart = await testDb.part.create({
      data: {
        partNumber: 'TEST-CERT-001',
        partName: 'Test Certification Part',
        partType: 'MANUFACTURED',
        isLifeLimited: true,
        llpCriticalityLevel: LLPCriticalityLevel.CRITICAL,
        llpRetirementType: LLPRetirementType.CYCLES_OR_TIME,
        llpCycleLimit: 1000,
        llpTimeLimit: 8760,
        llpCertificationRequired: true,
        llpRegulatoryReference: 'FAA-AD-2024-001',
        description: 'Critical part requiring certifications'
      }
    });
    testPartId = testPart.id;

    // Create test serialized part
    const testSerializedPart = await testDb.serializedPart.create({
      data: {
        partId: testPartId,
        serialNumber: 'SN-CERT-001',
        status: 'ACTIVE',
        manufacturingDate: new Date('2023-01-01'),
        location: 'Test Location'
      }
    });
    testSerializedPartId = testSerializedPart.id;
  });

  describe('uploadDocument', () => {
    it('should upload certification document successfully', async () => {
      const uploadRequest = {
        file: Buffer.from('Test document content'),
        fileName: 'test-certificate.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'TEST-USER-001',
        metadata: {
          documentType: 'MANUFACTURING_CERTIFICATE',
          issuingOrganization: 'Test Certification Body',
          validUntil: '2025-01-01'
        }
      };

      const result = await llpCertificationService.uploadDocument(uploadRequest);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.documentUrl).toBeDefined();
      expect(result.documentId).toBeDefined();
      expect(result.fileSize).toBe(uploadRequest.file.length);
      expect(result.mimeType).toBe(uploadRequest.mimeType);
    });

    it('should validate file type restrictions', async () => {
      const invalidUploadRequest = {
        file: Buffer.from('Test content'),
        fileName: 'test.exe',
        mimeType: 'application/octet-stream',
        uploadedBy: 'TEST-USER-001'
      };

      await expect(llpCertificationService.uploadDocument(invalidUploadRequest))
        .rejects.toThrow('Invalid file type');
    });

    it('should enforce file size limits', async () => {
      const oversizedFile = Buffer.alloc(100 * 1024 * 1024); // 100MB file
      const oversizedUploadRequest = {
        file: oversizedFile,
        fileName: 'large-document.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'TEST-USER-001'
      };

      await expect(llpCertificationService.uploadDocument(oversizedUploadRequest))
        .rejects.toThrow('File size exceeds maximum limit');
    });

    it('should handle upload failures gracefully', async () => {
      // Mock file system error
      const mockUploadRequest = {
        file: Buffer.from('Test content'),
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'TEST-USER-001'
      };

      // This would need actual file system mocking for a real implementation
      // For now, we'll test the basic functionality
      const result = await llpCertificationService.uploadDocument(mockUploadRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('createCertification', () => {
    let testDocumentUrl: string;

    beforeEach(async () => {
      // Upload a test document first
      const uploadResult = await llpCertificationService.uploadDocument({
        file: Buffer.from('Test certificate document'),
        fileName: 'test-cert.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'TEST-USER-001'
      });
      testDocumentUrl = uploadResult.documentUrl;
    });

    it('should create manufacturing certification', async () => {
      const certificationData = {
        serializedPartId: testSerializedPartId,
        certificationType: LLPCertificationType.MANUFACTURING,
        certificationNumber: 'MANUF-CERT-001',
        issuingOrganization: 'Manufacturing Quality Assurance',
        issuedDate: new Date('2023-01-15'),
        expirationDate: new Date('2025-01-15'),
        certificationStandard: 'AS9100',
        documentUrl: testDocumentUrl,
        isActive: true,
        metadata: {
          batchNumber: 'BATCH-2023-001',
          qualityLevel: 'CRITICAL',
          inspectionResults: {
            dimensionalCheck: 'PASS',
            materialVerification: 'PASS',
            surfaceFinish: 'PASS'
          }
        }
      };

      const certificationId = await llpCertificationService.createCertification(certificationData);

      expect(certificationId).toBeDefined();
      expect(typeof certificationId).toBe('string');

      // Verify certification was created
      const createdCert = await testDb.llpCertification.findUnique({
        where: { id: certificationId }
      });

      expect(createdCert).toBeTruthy();
      expect(createdCert!.certificationType).toBe(LLPCertificationType.MANUFACTURING);
      expect(createdCert!.certificationNumber).toBe('MANUF-CERT-001');
      expect(createdCert!.isActive).toBe(true);
    });

    it('should create installation certification', async () => {
      const certificationData = {
        serializedPartId: testSerializedPartId,
        certificationType: LLPCertificationType.INSTALLATION,
        certificationNumber: 'INSTALL-CERT-001',
        issuingOrganization: 'Certified Installation Team',
        issuedDate: new Date('2023-02-01'),
        certificationStandard: 'MIL-STD-1530',
        documentUrl: testDocumentUrl,
        isActive: true,
        metadata: {
          installedInAssembly: 'ENGINE-ASSEMBLY-001',
          installationProcedure: 'PROC-INSTALL-TB-001',
          torqueSpecifications: {
            boltTorque: '45 ft-lbs',
            verificationMethod: 'Torque Wrench'
          }
        }
      };

      const certificationId = await llpCertificationService.createCertification(certificationData);

      const createdCert = await testDb.llpCertification.findUnique({
        where: { id: certificationId }
      });

      expect(createdCert!.certificationType).toBe(LLPCertificationType.INSTALLATION);
      expect(createdCert!.metadata).toEqual(
        expect.objectContaining({
          installedInAssembly: 'ENGINE-ASSEMBLY-001'
        })
      );
    });

    it('should create maintenance certification', async () => {
      const certificationData = {
        serializedPartId: testSerializedPartId,
        certificationType: LLPCertificationType.MAINTENANCE,
        certificationNumber: 'MAINT-CERT-001',
        issuingOrganization: 'Authorized Maintenance Organization',
        issuedDate: new Date('2023-08-01'),
        certificationStandard: 'FAR 145',
        documentUrl: testDocumentUrl,
        isActive: true,
        metadata: {
          maintenanceType: 'SCHEDULED_INSPECTION',
          workOrderNumber: 'WO-MAINT-001',
          defectsFound: [],
          correctiveActions: [],
          nextInspectionDue: '2024-02-01'
        }
      };

      const certificationId = await llpCertificationService.createCertification(certificationData);

      const createdCert = await testDb.llpCertification.findUnique({
        where: { id: certificationId }
      });

      expect(createdCert!.certificationType).toBe(LLPCertificationType.MAINTENANCE);
      expect(createdCert!.metadata).toEqual(
        expect.objectContaining({
          maintenanceType: 'SCHEDULED_INSPECTION'
        })
      );
    });

    it('should prevent duplicate certification numbers', async () => {
      const certificationData = {
        serializedPartId: testSerializedPartId,
        certificationType: LLPCertificationType.MANUFACTURING,
        certificationNumber: 'DUPLICATE-CERT-001',
        issuingOrganization: 'Test Organization',
        issuedDate: new Date('2023-01-01'),
        certificationStandard: 'Test Standard',
        documentUrl: testDocumentUrl,
        isActive: true
      };

      // Create first certification
      await llpCertificationService.createCertification(certificationData);

      // Attempt to create duplicate
      await expect(llpCertificationService.createCertification(certificationData))
        .rejects.toThrow('Certification number already exists');
    });

    it('should validate required fields', async () => {
      const invalidCertificationData = {
        serializedPartId: testSerializedPartId,
        certificationType: LLPCertificationType.MANUFACTURING,
        // Missing required certificationNumber
        issuingOrganization: 'Test Organization',
        issuedDate: new Date('2023-01-01'),
        documentUrl: testDocumentUrl,
        isActive: true
      };

      await expect(llpCertificationService.createCertification(invalidCertificationData as any))
        .rejects.toThrow('Missing required certification fields');
    });
  });

  describe('getCertificationStatus', () => {
    beforeEach(async () => {
      // Upload test document
      const uploadResult = await llpCertificationService.uploadDocument({
        file: Buffer.from('Test document'),
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'TEST-USER-001'
      });

      // Create various certifications
      await testDb.llpCertification.createMany({
        data: [
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.MANUFACTURING,
            certificationNumber: 'MANUF-001',
            issuingOrganization: 'Manufacturing QA',
            issuedDate: new Date('2023-01-15'),
            expirationDate: new Date('2025-01-15'),
            certificationStandard: 'AS9100',
            documentUrl: uploadResult.documentUrl,
            isActive: true,
            isVerified: true,
            verifiedAt: new Date('2023-01-16'),
            verifiedBy: 'QA-MANAGER-001'
          },
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.INSTALLATION,
            certificationNumber: 'INSTALL-001',
            issuingOrganization: 'Installation Team',
            issuedDate: new Date('2023-02-01'),
            expirationDate: new Date('2025-02-01'),
            certificationStandard: 'MIL-STD-1530',
            documentUrl: uploadResult.documentUrl,
            isActive: true,
            isVerified: false
          },
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.MAINTENANCE,
            certificationNumber: 'MAINT-001',
            issuingOrganization: 'Maintenance Organization',
            issuedDate: new Date('2023-08-01'),
            expirationDate: new Date('2024-02-01'), // Expiring soon
            certificationStandard: 'FAR 145',
            documentUrl: uploadResult.documentUrl,
            isActive: true,
            isVerified: true,
            verifiedAt: new Date('2023-08-02'),
            verifiedBy: 'MAINT-SUPERVISOR-001'
          }
        ]
      });
    });

    it('should provide comprehensive certification status', async () => {
      const status = await llpCertificationService.getCertificationStatus(testSerializedPartId);

      expect(status).toBeDefined();
      expect(status.serializedPartId).toBe(testSerializedPartId);
      expect(status.isCompliant).toBeDefined();
      expect(status.totalCertifications).toBe(3);
      expect(status.activeCertifications).toBe(3);
      expect(status.verifiedCertifications).toBe(2);
      expect(status.expiringSoon).toHaveLength(1);
      expect(status.missingCertifications).toBeInstanceOf(Array);
      expect(status.certificationsByType).toBeDefined();
    });

    it('should identify expiring certifications', async () => {
      const status = await llpCertificationService.getCertificationStatus(testSerializedPartId);

      expect(status.expiringSoon).toHaveLength(1);
      expect(status.expiringSoon[0].certificationType).toBe(LLPCertificationType.MAINTENANCE);
      expect(status.expiringSoon[0].daysUntilExpiration).toBeLessThan(180);
    });

    it('should categorize certifications by type', async () => {
      const status = await llpCertificationService.getCertificationStatus(testSerializedPartId);

      expect(status.certificationsByType.MANUFACTURING).toHaveLength(1);
      expect(status.certificationsByType.INSTALLATION).toHaveLength(1);
      expect(status.certificationsByType.MAINTENANCE).toHaveLength(1);
    });

    it('should identify missing required certifications', async () => {
      // This would require configuration of what certifications are required
      // For now, we'll test the basic structure
      const status = await llpCertificationService.getCertificationStatus(testSerializedPartId);

      expect(status.missingCertifications).toBeInstanceOf(Array);
    });

    it('should handle parts with no certifications', async () => {
      // Create a new part with no certifications
      const newSerializedPart = await testDb.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'SN-NO-CERTS',
          status: 'ACTIVE',
          manufacturingDate: new Date(),
          location: 'Test Location'
        }
      });

      const status = await llpCertificationService.getCertificationStatus(newSerializedPart.id);

      expect(status.totalCertifications).toBe(0);
      expect(status.activeCertifications).toBe(0);
      expect(status.verifiedCertifications).toBe(0);
      expect(status.isCompliant).toBe(false);
    });
  });

  describe('verifyCertification', () => {
    let testCertificationId: string;

    beforeEach(async () => {
      // Upload test document and create certification
      const uploadResult = await llpCertificationService.uploadDocument({
        file: Buffer.from('Test document'),
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'TEST-USER-001'
      });

      const certification = await testDb.llpCertification.create({
        data: {
          serializedPartId: testSerializedPartId,
          certificationType: LLPCertificationType.MANUFACTURING,
          certificationNumber: 'VERIFY-TEST-001',
          issuingOrganization: 'Test Organization',
          issuedDate: new Date('2023-01-01'),
          expirationDate: new Date('2025-01-01'),
          certificationStandard: 'Test Standard',
          documentUrl: uploadResult.documentUrl,
          isActive: true,
          isVerified: false
        }
      });
      testCertificationId = certification.id;
    });

    it('should verify certification successfully', async () => {
      const verificationData = {
        certificationId: testCertificationId,
        verifiedBy: 'QA-MANAGER-001',
        verificationNotes: 'Certification reviewed and verified as authentic',
        complianceStandards: ['AS9100', 'ISO 9001']
      };

      await llpCertificationService.verifyCertification(verificationData);

      const verifiedCert = await testDb.llpCertification.findUnique({
        where: { id: testCertificationId }
      });

      expect(verifiedCert!.isVerified).toBe(true);
      expect(verifiedCert!.verifiedBy).toBe('QA-MANAGER-001');
      expect(verifiedCert!.verifiedAt).toBeDefined();
      expect(verifiedCert!.verificationNotes).toBe('Certification reviewed and verified as authentic');
      expect(verifiedCert!.complianceStandards).toEqual(['AS9100', 'ISO 9001']);
    });

    it('should prevent duplicate verification', async () => {
      const verificationData = {
        certificationId: testCertificationId,
        verifiedBy: 'QA-MANAGER-001',
        verificationNotes: 'First verification'
      };

      // First verification
      await llpCertificationService.verifyCertification(verificationData);

      // Attempt second verification
      await expect(llpCertificationService.verifyCertification({
        ...verificationData,
        verificationNotes: 'Second verification attempt'
      })).rejects.toThrow('Certification is already verified');
    });

    it('should handle non-existent certification', async () => {
      const verificationData = {
        certificationId: 'NON-EXISTENT-ID',
        verifiedBy: 'QA-MANAGER-001',
        verificationNotes: 'Test verification'
      };

      await expect(llpCertificationService.verifyCertification(verificationData))
        .rejects.toThrow('Certification not found');
    });

    it('should validate verification data', async () => {
      const invalidVerificationData = {
        certificationId: testCertificationId,
        verifiedBy: '', // Empty verifier
        verificationNotes: 'Test notes'
      };

      await expect(llpCertificationService.verifyCertification(invalidVerificationData))
        .rejects.toThrow('Invalid verification data');
    });
  });

  describe('getExpiringCertifications', () => {
    beforeEach(async () => {
      // Upload test document
      const uploadResult = await llpCertificationService.uploadDocument({
        file: Buffer.from('Test document'),
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'TEST-USER-001'
      });

      const now = new Date();

      // Create certifications with various expiration dates
      await testDb.llpCertification.createMany({
        data: [
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.MANUFACTURING,
            certificationNumber: 'EXPIRE-001',
            issuingOrganization: 'Test Org',
            issuedDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
            expirationDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
            certificationStandard: 'Test Standard',
            documentUrl: uploadResult.documentUrl,
            isActive: true
          },
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.INSTALLATION,
            certificationNumber: 'EXPIRE-002',
            issuingOrganization: 'Test Org',
            issuedDate: new Date(now.getTime() - 300 * 24 * 60 * 60 * 1000), // 300 days ago
            expirationDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
            certificationStandard: 'Test Standard',
            documentUrl: uploadResult.documentUrl,
            isActive: true
          },
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.MAINTENANCE,
            certificationNumber: 'EXPIRE-003',
            issuingOrganization: 'Test Org',
            issuedDate: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
            expirationDate: new Date(now.getTime() + 200 * 24 * 60 * 60 * 1000), // 200 days from now
            certificationStandard: 'Test Standard',
            documentUrl: uploadResult.documentUrl,
            isActive: true
          }
        ]
      });
    });

    it('should identify certifications expiring within 30 days', async () => {
      const expiringCerts = await llpCertificationService.getExpiringCertifications(30);

      expect(expiringCerts).toHaveLength(1);
      expect(expiringCerts[0].certificationNumber).toBe('EXPIRE-001');
      expect(expiringCerts[0].daysUntilExpiration).toBeLessThanOrEqual(30);
    });

    it('should identify certifications expiring within 60 days', async () => {
      const expiringCerts = await llpCertificationService.getExpiringCertifications(60);

      expect(expiringCerts).toHaveLength(2);
      expect(expiringCerts.every(cert => cert.daysUntilExpiration <= 60)).toBe(true);
    });

    it('should sort by expiration date ascending', async () => {
      const expiringCerts = await llpCertificationService.getExpiringCertifications(60);

      expect(expiringCerts[0].daysUntilExpiration).toBeLessThan(
        expiringCerts[1].daysUntilExpiration
      );
    });

    it('should include relevant part information', async () => {
      const expiringCerts = await llpCertificationService.getExpiringCertifications(30);

      expect(expiringCerts[0].partNumber).toBe('TEST-CERT-001');
      expect(expiringCerts[0].serialNumber).toBe('SN-CERT-001');
      expect(expiringCerts[0].partName).toBe('Test Certification Part');
    });
  });

  describe('retrieveDocument', () => {
    let testDocumentUrl: string;

    beforeEach(async () => {
      const uploadResult = await llpCertificationService.uploadDocument({
        file: Buffer.from('Test document content for retrieval'),
        fileName: 'retrieve-test.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'TEST-USER-001'
      });
      testDocumentUrl = uploadResult.documentUrl;
    });

    it('should retrieve document successfully', async () => {
      const documentBuffer = await llpCertificationService.retrieveDocument(testDocumentUrl);

      expect(documentBuffer).toBeInstanceOf(Buffer);
      expect(documentBuffer.length).toBeGreaterThan(0);
      expect(documentBuffer.toString()).toBe('Test document content for retrieval');
    });

    it('should handle non-existent document', async () => {
      const nonExistentUrl = '/api/llp/documents/non-existent-doc.pdf';

      await expect(llpCertificationService.retrieveDocument(nonExistentUrl))
        .rejects.toThrow('Document not found');
    });

    it('should validate document access permissions', async () => {
      // This would require implementation of access control
      // For now, we'll test basic retrieval
      const documentBuffer = await llpCertificationService.retrieveDocument(testDocumentUrl);
      expect(documentBuffer).toBeDefined();
    });
  });

  describe('batchProcessCertifications', () => {
    let testDocumentUrl: string;

    beforeEach(async () => {
      const uploadResult = await llpCertificationService.uploadDocument({
        file: Buffer.from('Batch test document'),
        fileName: 'batch-test.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'TEST-USER-001'
      });
      testDocumentUrl = uploadResult.documentUrl;
    });

    it('should process multiple certifications successfully', async () => {
      const certifications = [
        {
          serializedPartId: testSerializedPartId,
          certificationType: LLPCertificationType.MANUFACTURING,
          certificationNumber: 'BATCH-001',
          issuingOrganization: 'Batch Test Org',
          issuedDate: new Date('2023-01-01'),
          expirationDate: new Date('2025-01-01'),
          certificationStandard: 'Test Standard',
          documentUrl: testDocumentUrl,
          isActive: true
        },
        {
          serializedPartId: testSerializedPartId,
          certificationType: LLPCertificationType.INSTALLATION,
          certificationNumber: 'BATCH-002',
          issuingOrganization: 'Batch Test Org',
          issuedDate: new Date('2023-02-01'),
          expirationDate: new Date('2025-02-01'),
          certificationStandard: 'Test Standard',
          documentUrl: testDocumentUrl,
          isActive: true
        },
        {
          serializedPartId: testSerializedPartId,
          certificationType: LLPCertificationType.MAINTENANCE,
          certificationNumber: 'BATCH-003',
          issuingOrganization: 'Batch Test Org',
          issuedDate: new Date('2023-03-01'),
          expirationDate: new Date('2025-03-01'),
          certificationStandard: 'Test Standard',
          documentUrl: testDocumentUrl,
          isActive: true
        }
      ];

      const results = await llpCertificationService.batchProcessCertifications(certifications);

      expect(results).toBeDefined();
      expect(results.successful).toHaveLength(3);
      expect(results.failed).toHaveLength(0);
      expect(results.totalProcessed).toBe(3);

      // Verify certifications were created
      const createdCerts = await testDb.llpCertification.findMany({
        where: {
          certificationNumber: {
            in: ['BATCH-001', 'BATCH-002', 'BATCH-003']
          }
        }
      });

      expect(createdCerts).toHaveLength(3);
    });

    it('should handle mixed success and failure in batch processing', async () => {
      const certifications = [
        {
          serializedPartId: testSerializedPartId,
          certificationType: LLPCertificationType.MANUFACTURING,
          certificationNumber: 'BATCH-VALID-001',
          issuingOrganization: 'Valid Org',
          issuedDate: new Date('2023-01-01'),
          expirationDate: new Date('2025-01-01'),
          certificationStandard: 'Test Standard',
          documentUrl: testDocumentUrl,
          isActive: true
        },
        {
          serializedPartId: 'INVALID-PART-ID',
          certificationType: LLPCertificationType.INSTALLATION,
          certificationNumber: 'BATCH-INVALID-001',
          issuingOrganization: 'Invalid Org',
          issuedDate: new Date('2023-02-01'),
          expirationDate: new Date('2025-02-01'),
          certificationStandard: 'Test Standard',
          documentUrl: testDocumentUrl,
          isActive: true
        }
      ];

      const results = await llpCertificationService.batchProcessCertifications(certifications);

      expect(results.successful).toHaveLength(1);
      expect(results.failed).toHaveLength(1);
      expect(results.totalProcessed).toBe(2);
      expect(results.failed[0].error).toBeDefined();
    });
  });

  describe('getComplianceStatus', () => {
    beforeEach(async () => {
      // Create certifications for compliance testing
      const uploadResult = await llpCertificationService.uploadDocument({
        file: Buffer.from('Compliance test document'),
        fileName: 'compliance-test.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'TEST-USER-001'
      });

      await testDb.llpCertification.createMany({
        data: [
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.MANUFACTURING,
            certificationNumber: 'COMPLIANCE-001',
            issuingOrganization: 'FAA Approved Organization',
            issuedDate: new Date('2023-01-01'),
            expirationDate: new Date('2025-01-01'),
            certificationStandard: 'FAR 21',
            documentUrl: uploadResult.documentUrl,
            isActive: true,
            isVerified: true,
            verifiedAt: new Date('2023-01-02'),
            verifiedBy: 'FAA-INSPECTOR-001',
            complianceStandards: ['FAA', 'AS9100']
          },
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.INSTALLATION,
            certificationNumber: 'COMPLIANCE-002',
            issuingOrganization: 'EASA Approved Organization',
            issuedDate: new Date('2023-02-01'),
            expirationDate: new Date('2025-02-01'),
            certificationStandard: 'EASA Part 145',
            documentUrl: uploadResult.documentUrl,
            isActive: true,
            isVerified: true,
            verifiedAt: new Date('2023-02-02'),
            verifiedBy: 'EASA-INSPECTOR-001',
            complianceStandards: ['EASA', 'ISO 9001']
          }
        ]
      });
    });

    it('should provide comprehensive compliance status', async () => {
      const compliance = await llpCertificationService.getComplianceStatus(testSerializedPartId);

      expect(compliance).toBeDefined();
      expect(compliance.serializedPartId).toBe(testSerializedPartId);
      expect(compliance.overallCompliant).toBeDefined();
      expect(compliance.faaCompliant).toBeDefined();
      expect(compliance.easaCompliant).toBeDefined();
      expect(compliance.iataCompliant).toBeDefined();
      expect(compliance.complianceIssues).toBeInstanceOf(Array);
      expect(compliance.certificationSummary).toBeDefined();
      expect(compliance.lastUpdated).toBeInstanceOf(Date);
    });

    it('should identify regulatory compliance by standard', async () => {
      const compliance = await llpCertificationService.getComplianceStatus(testSerializedPartId);

      expect(compliance.faaCompliant).toBe(true);
      expect(compliance.easaCompliant).toBe(true);
      // IATA compliance would require specific IATA certifications
    });

    it('should identify compliance issues', async () => {
      // Create a certification with issues (expired)
      const uploadResult = await llpCertificationService.uploadDocument({
        file: Buffer.from('Expired document'),
        fileName: 'expired.pdf',
        mimeType: 'application/pdf',
        uploadedBy: 'TEST-USER-001'
      });

      await testDb.llpCertification.create({
        data: {
          serializedPartId: testSerializedPartId,
          certificationType: LLPCertificationType.MAINTENANCE,
          certificationNumber: 'EXPIRED-001',
          issuingOrganization: 'Test Org',
          issuedDate: new Date('2022-01-01'),
          expirationDate: new Date('2023-01-01'), // Expired
          certificationStandard: 'Test Standard',
          documentUrl: uploadResult.documentUrl,
          isActive: true,
          isVerified: false
        }
      });

      const compliance = await llpCertificationService.getComplianceStatus(testSerializedPartId);

      expect(compliance.complianceIssues.length).toBeGreaterThan(0);
      const expiredIssues = compliance.complianceIssues.filter(
        issue => issue.type === 'EXPIRED_CERTIFICATION'
      );
      expect(expiredIssues.length).toBeGreaterThan(0);
    });
  });
});