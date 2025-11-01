/**
 * ICD Integration Tests
 * End-to-end tests for Interface Control Document (ICD) API endpoints
 *
 * GitHub Issue #224: Interface Control Document (ICD) System
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import prisma from '../../lib/database';
import {
  ICDCreateInput,
  ICDUpdateInput,
  InterfaceRequirementCreateInput,
  ICDPartImplementationCreateInput,
  ICDComplianceCheckCreateInput,
  ICDChangeRequestCreateInput,
} from '../../types/icd';
import {
  ICDStatus,
  InterfaceType,
  InterfaceDirection,
  InterfaceCriticality,
  VerificationMethod,
  ComplianceStatus,
} from '@prisma/client';

describe('ICD API Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testPartId: string;
  let createdICDId: string;

  // Test data
  const validICDData: ICDCreateInput = {
    icdNumber: 'ICD-TEST-001',
    icdName: 'Test Interface Integration',
    title: 'Integration Test Interface Control Document',
    description: 'An ICD created for integration testing',
    version: '1.0',
    interfaceType: InterfaceType.MECHANICAL,
    interfaceDirection: InterfaceDirection.BIDIRECTIONAL,
    criticality: InterfaceCriticality.MINOR,
    applicableStandards: ['SAE AIR6181A', 'ASME Y14.24'],
    effectiveDate: new Date('2024-01-01'),
    ownerId: 'test-owner-123',
    ownerName: 'Test Owner',
    ownerDepartment: 'Engineering',
    documentationUrl: 'https://example.com/docs/icd-test-001',
    drawingReferences: ['DWG-001', 'DWG-002'],
    specificationRefs: ['SPEC-001'],
  };

  beforeAll(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'icd-test@example.com',
        employeeNumber: 'EMP-ICD-001',
        firstName: 'ICD',
        lastName: 'Tester',
        isActive: true,
        personnelClassId: 'class-123',
      },
    });
    testUserId = testUser.id;

    // Create test part
    const testPart = await prisma.part.create({
      data: {
        partNumber: 'P-ICD-TEST-001',
        partName: 'Test Part for ICD',
        description: 'A test part for ICD integration tests',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
        isActive: true,
      },
    });
    testPartId = testPart.id;

    // Mock authentication (adjust based on your auth implementation)
    authToken = 'mock-jwt-token-for-testing';
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.iCDHistory.deleteMany({
      where: { icd: { createdById: testUserId } },
    });
    await prisma.iCDComplianceCheck.deleteMany({
      where: { icd: { createdById: testUserId } },
    });
    await prisma.iCDChangeRequest.deleteMany({
      where: { icd: { createdById: testUserId } },
    });
    await prisma.iCDPartImplementation.deleteMany({
      where: { icd: { createdById: testUserId } },
    });
    await prisma.interfaceRequirement.deleteMany({
      where: { icd: { createdById: testUserId } },
    });
    await prisma.interfaceControlDocument.deleteMany({
      where: { createdById: testUserId },
    });
    await prisma.part.delete({ where: { id: testPartId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  beforeEach(() => {
    // Reset any state between tests if needed
  });

  afterEach(() => {
    // Cleanup between tests if needed
  });

  describe('POST /api/icd', () => {
    it('should create a new ICD successfully', async () => {
      const response = await request(app)
        .post('/api/icd')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validICDData, createdById: testUserId })
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          icdNumber: validICDData.icdNumber,
          icdName: validICDData.icdName,
          title: validICDData.title,
          status: ICDStatus.DRAFT,
          interfaceType: validICDData.interfaceType,
          isActive: true,
        }),
      });

      createdICDId = response.body.data.id;
    });

    it('should return 400 for invalid ICD data', async () => {
      const invalidData = { ...validICDData, icdNumber: '' };

      const response = await request(app)
        .post('/api/icd')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: expect.stringContaining('ICD number is required'),
      });
    });

    it('should return 409 for duplicate ICD number', async () => {
      const duplicateData = { ...validICDData, icdNumber: 'ICD-TEST-001' };

      const response = await request(app)
        .post('/api/icd')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...duplicateData, createdById: testUserId })
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: expect.stringContaining('already exists'),
      });
    });
  });

  describe('GET /api/icd/:id', () => {
    it('should retrieve ICD by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/icd/${createdICDId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: createdICDId,
          icdNumber: validICDData.icdNumber,
          icdName: validICDData.icdName,
        }),
      });
    });

    it('should return 404 for nonexistent ICD', async () => {
      const response = await request(app)
        .get('/api/icd/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: expect.stringContaining('not found'),
      });
    });
  });

  describe('GET /api/icd/number/:icdNumber', () => {
    it('should retrieve ICD by number successfully', async () => {
      const response = await request(app)
        .get(`/api/icd/number/${validICDData.icdNumber}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          icdNumber: validICDData.icdNumber,
        }),
      });
    });
  });

  describe('PUT /api/icd/:id', () => {
    it('should update ICD successfully', async () => {
      const updateData: ICDUpdateInput = {
        icdName: 'Updated Interface Name',
        description: 'Updated description for integration test',
        status: ICDStatus.UNDER_REVIEW,
        lastModifiedById: testUserId,
      };

      const response = await request(app)
        .put(`/api/icd/${createdICDId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: createdICDId,
          icdName: updateData.icdName,
          description: updateData.description,
          status: updateData.status,
        }),
      });
    });

    it('should return 400 for invalid status transition', async () => {
      const invalidUpdate = {
        status: ICDStatus.OBSOLETE, // Invalid transition from UNDER_REVIEW
      };

      const response = await request(app)
        .put(`/api/icd/${createdICDId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/icd', () => {
    it('should list ICDs with pagination', async () => {
      const response = await request(app)
        .get('/api/icd')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          icds: expect.any(Array),
          total: expect.any(Number),
          page: 1,
          pageSize: 10,
          totalPages: expect.any(Number),
        }),
      });
    });

    it('should filter ICDs by status', async () => {
      const response = await request(app)
        .get('/api/icd')
        .query({ status: ICDStatus.UNDER_REVIEW })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.icds.forEach((icd: any) => {
        expect(icd.status).toBe(ICDStatus.UNDER_REVIEW);
      });
    });

    it('should search ICDs by text', async () => {
      const response = await request(app)
        .get('/api/icd')
        .query({ search: 'Updated Interface' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/icd/:id/requirements', () => {
    it('should add requirement to ICD successfully', async () => {
      const requirementData: InterfaceRequirementCreateInput = {
        icdId: createdICDId,
        requirementId: 'REQ-001',
        category: 'Form',
        title: 'Test Requirement',
        description: 'A test requirement for integration testing',
        specification: 'Must meet specified dimensions',
        tolerance: '±0.1mm',
        units: 'mm',
        nominalValue: '10.0',
        minimumValue: '9.9',
        maximumValue: '10.1',
        verificationMethod: VerificationMethod.INSPECTION,
        priority: 'HIGH',
        safetyRelated: true,
        missionCritical: false,
      };

      const response = await request(app)
        .post(`/api/icd/${createdICDId}/requirements`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(requirementData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          requirementId: 'REQ-001',
          title: 'Test Requirement',
          category: 'Form',
          priority: 'HIGH',
        }),
      });
    });
  });

  describe('POST /api/icd/:id/parts/implementations', () => {
    it('should link part implementation successfully', async () => {
      const implementationData: ICDPartImplementationCreateInput = {
        icdId: createdICDId,
        partId: testPartId,
        implementationType: 'DIRECT',
        implementationNotes: 'Direct implementation of interface',
        complianceStatus: ComplianceStatus.COMPLIANT,
        effectiveDate: new Date('2024-01-01'),
      };

      const response = await request(app)
        .post(`/api/icd/${createdICDId}/parts/implementations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(implementationData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          implementationType: 'DIRECT',
          complianceStatus: ComplianceStatus.COMPLIANT,
        }),
      });
    });
  });

  describe('POST /api/icd/:id/compliance', () => {
    it('should record compliance check successfully', async () => {
      const complianceData: ICDComplianceCheckCreateInput = {
        icdId: createdICDId,
        checkType: 'DESIGN_REVIEW',
        checkMethod: VerificationMethod.INSPECTION,
        checkResult: 'PASS',
        actualValue: '10.05',
        expectedValue: '10.0',
        variance: '0.05',
        complianceStatus: ComplianceStatus.COMPLIANT,
        checkNotes: 'All requirements met during design review',
        checkedById: testUserId,
        checkedByName: 'ICD Tester',
      };

      const response = await request(app)
        .post(`/api/icd/${createdICDId}/compliance`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(complianceData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          checkType: 'DESIGN_REVIEW',
          checkResult: 'PASS',
          complianceStatus: ComplianceStatus.COMPLIANT,
        }),
      });
    });
  });

  describe('POST /api/icd/:id/change-requests', () => {
    it('should create change request successfully', async () => {
      const changeRequestData: ICDChangeRequestCreateInput = {
        icdId: createdICDId,
        requestNumber: 'ICR-001',
        title: 'Test Change Request',
        description: 'A test change request for integration testing',
        requestType: 'ENHANCEMENT',
        priority: 'MEDIUM',
        proposedChange: 'Add new requirement for temperature tolerance',
        changeReason: 'Customer requirement for extreme environment operation',
        requestorName: 'Integration Tester',
        requestorDept: 'Engineering',
        affectedParts: [testPartId],
        affectedAssemblies: ['ASM-001'],
      };

      const response = await request(app)
        .post(`/api/icd/${createdICDId}/change-requests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(changeRequestData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          requestNumber: 'ICR-001',
          title: 'Test Change Request',
          status: 'SUBMITTED',
        }),
      });
    });
  });

  describe('GET /api/icd/analytics', () => {
    it('should return analytics data', async () => {
      const response = await request(app)
        .get('/api/icd/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          totalICDs: expect.any(Number),
          icdsByStatus: expect.any(Object),
          icdsByType: expect.any(Object),
          icdsByCriticality: expect.any(Object),
          complianceOverview: expect.objectContaining({
            compliant: expect.any(Number),
            nonCompliant: expect.any(Number),
            underEvaluation: expect.any(Number),
            conditionallyCompliant: expect.any(Number),
          }),
          requirementMetrics: expect.objectContaining({
            totalRequirements: expect.any(Number),
            safetyRelated: expect.any(Number),
            missionCritical: expect.any(Number),
          }),
          upcomingReviews: expect.any(Number),
          expiringSoon: expect.any(Number),
        }),
      });
    });
  });

  describe('GET /api/icd/:id/history', () => {
    it('should retrieve ICD history', async () => {
      const response = await request(app)
        .get(`/api/icd/${createdICDId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.any(Array),
      });

      // Should have at least creation and update history entries
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          actionType: expect.any(String),
          changedAt: expect.any(String),
        })
      );
    });
  });

  describe('PUT /api/icd/:id/status', () => {
    it('should update ICD status successfully', async () => {
      const response = await request(app)
        .put(`/api/icd/${createdICDId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: ICDStatus.APPROVED,
          userId: testUserId,
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: createdICDId,
          status: ICDStatus.APPROVED,
        }),
      });
    });
  });

  describe('DELETE /api/icd/:id', () => {
    it('should deactivate ICD successfully', async () => {
      const response = await request(app)
        .delete(`/api/icd/${createdICDId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: expect.stringContaining('deactivated'),
      });

      // Verify ICD is marked as inactive
      const getResponse = await request(app)
        .get(`/api/icd/${createdICDId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.data.isActive).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const response = await request(app)
        .get('/api/icd')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/icd')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // Implementation depends on your error handling strategy
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk ICD creation within acceptable time', async () => {
      const startTime = Date.now();

      const promises = Array.from({ length: 10 }, (_, index) =>
        request(app)
          .post('/api/icd')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...validICDData,
            icdNumber: `ICD-PERF-${String(index).padStart(3, '0')}`,
            icdName: `Performance Test Interface ${index}`,
            createdById: testUserId,
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should complete within reasonable time (adjust threshold as needed)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Cleanup performance test data
      await prisma.interfaceControlDocument.deleteMany({
        where: {
          icdNumber: {
            startsWith: 'ICD-PERF-'
          }
        }
      });
    });
  });
});