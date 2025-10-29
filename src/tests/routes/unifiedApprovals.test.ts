/**
 * ✅ GITHUB ISSUE #147: Core Unified Workflow Engine
 *
 * Tests for Unified Approval API Routes - Testing the REST endpoints
 * for the unified approval workflow system.
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import unifiedApprovalsRouter from '../../routes/unifiedApprovals';
import { authenticateJWT } from '../../middleware/auth';

const app = express();
const prisma = new PrismaClient();

// Setup Express app for testing
app.use(express.json());
app.use('/api/v1/approvals', unifiedApprovalsRouter);

// Test data
let testUser: any;
let testToken: string;
let testWorkInstructionId: string;
let testFAIId: string;

describe('Unified Approval API Routes', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.workflowInstance.deleteMany();
    await prisma.workflowDefinition.deleteMany();
    await prisma.workInstruction.deleteMany();
    await prisma.fAI.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test.approver@example.com',
        name: 'Test Approver',
        badgeNumber: 'API001',
        passwordHash: 'test-hash',
        roles: ['quality_manager', 'manager'],
        isActive: true
      }
    });

    // Create JWT token for authentication
    testToken = jwt.sign(
      {
        id: testUser.id,
        email: testUser.email,
        roles: testUser.roles
      },
      process.env.JWT_SECRET || 'test-secret-that-is-at-least-32-characters-long',
      { expiresIn: '1h' }
    );

    // Create test entities
    const testWorkInstruction = await prisma.workInstruction.create({
      data: {
        title: 'API Test Work Instruction',
        description: 'Test work instruction for API testing',
        content: { steps: ['API test step 1', 'API test step 2'] },
        status: 'DRAFT',
        version: '1.0.0',
        createdById: testUser.id,
        updatedById: testUser.id
      }
    });
    testWorkInstructionId = testWorkInstruction.id;

    const testFAI = await prisma.fAI.create({
      data: {
        partNumber: 'API-TEST-001',
        revision: 'A',
        status: 'IN_PROGRESS',
        inspectionData: { measurements: [] },
        createdById: testUser.id,
        updatedById: testUser.id
      }
    });
    testFAIId = testFAI.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.workflowInstance.deleteMany();
    await prisma.workflowDefinition.deleteMany();
    await prisma.workInstruction.deleteMany();
    await prisma.fAI.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for protected endpoints', async () => {
      const response = await request(app)
        .post('/api/v1/approvals/initiate')
        .send({
          entityType: 'WORK_INSTRUCTION',
          entityId: testWorkInstructionId,
          priority: 'MEDIUM',
          requiredApproverRoles: ['quality_manager']
        });

      expect(response.status).toBe(401);
    });

    test('should accept valid JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/approvals/my-tasks')
        .set('Authorization', `Bearer ${testToken}`);

      // Should not be 401 (unauthorized)
      expect(response.status).not.toBe(401);
    });

    test('should reject invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/approvals/my-tasks')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/approvals/initiate', () => {
    test('should initiate approval workflow successfully', async () => {
      const response = await request(app)
        .post('/api/v1/approvals/initiate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          entityType: 'WORK_INSTRUCTION',
          entityId: testWorkInstructionId,
          priority: 'MEDIUM',
          requiredApproverRoles: ['quality_manager'],
          metadata: { apiTest: true }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('workflowInstanceId');
      expect(response.body.data).toHaveProperty('currentStage');
      expect(response.body.message).toContain('WORK_INSTRUCTION');
    });

    test('should validate request body', async () => {
      const response = await request(app)
        .post('/api/v1/approvals/initiate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          entityType: 'INVALID_TYPE',
          entityId: testWorkInstructionId,
          priority: 'MEDIUM',
          requiredApproverRoles: ['quality_manager']
        });

      expect(response.status).toBe(400);
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/approvals/initiate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          entityType: 'WORK_INSTRUCTION',
          // Missing entityId
          priority: 'MEDIUM',
          requiredApproverRoles: ['quality_manager']
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/approvals/:entityType/:entityId/approve', () => {
    beforeAll(async () => {
      // Ensure we have a workflow to approve
      await request(app)
        .post('/api/v1/approvals/initiate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          entityType: 'FAI_REPORT',
          entityId: testFAIId,
          priority: 'HIGH',
          requiredApproverRoles: ['quality_manager']
        });
    });

    test('should approve entity successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/approvals/FAI_REPORT/${testFAIId}/approve`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          comments: 'API test approval',
          requiresSignature: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('workflowInstanceId');
      expect(response.body.message).toContain('approved successfully');
    });

    test('should handle approval with signature', async () => {
      // Create new entity for signature test
      const newFAI = await prisma.fAI.create({
        data: {
          partNumber: 'SIGNATURE-TEST-001',
          revision: 'A',
          status: 'IN_PROGRESS',
          inspectionData: { measurements: [] },
          createdById: testUser.id,
          updatedById: testUser.id
        }
      });

      // Initiate workflow
      await request(app)
        .post('/api/v1/approvals/initiate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          entityType: 'FAI_REPORT',
          entityId: newFAI.id,
          priority: 'HIGH',
          requiredApproverRoles: ['quality_manager']
        });

      // Approve with signature
      const response = await request(app)
        .post(`/api/v1/approvals/FAI_REPORT/${newFAI.id}/approve`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          comments: 'FAI approved with signature',
          requiresSignature: true,
          signatureReason: 'Regulatory compliance'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle non-existent entity', async () => {
      const response = await request(app)
        .post('/api/v1/approvals/WORK_INSTRUCTION/non-existent-id/approve')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          comments: 'Test approval'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/approvals/:entityType/:entityId/reject', () => {
    test('should reject entity with comments', async () => {
      // Create new entity for rejection test
      const rejectWorkInstruction = await prisma.workInstruction.create({
        data: {
          title: 'Reject Test Work Instruction',
          description: 'For API rejection testing',
          content: { steps: ['Incomplete step'] },
          status: 'DRAFT',
          version: '1.0.0',
          createdById: testUser.id,
          updatedById: testUser.id
        }
      });

      // Initiate workflow
      await request(app)
        .post('/api/v1/approvals/initiate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          entityType: 'WORK_INSTRUCTION',
          entityId: rejectWorkInstruction.id,
          priority: 'MEDIUM',
          requiredApproverRoles: ['quality_manager']
        });

      // Reject with comments
      const response = await request(app)
        .post(`/api/v1/approvals/WORK_INSTRUCTION/${rejectWorkInstruction.id}/reject`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          comments: 'Work instruction needs more detail on safety procedures'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rejected');
    });

    test('should require comments for rejection', async () => {
      const response = await request(app)
        .post(`/api/v1/approvals/WORK_INSTRUCTION/${testWorkInstructionId}/reject`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          // No comments provided
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Comments are required');
    });

    test('should require non-empty comments', async () => {
      const response = await request(app)
        .post(`/api/v1/approvals/WORK_INSTRUCTION/${testWorkInstructionId}/reject`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          comments: '   ' // Only whitespace
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/approvals/:entityType/:entityId/status', () => {
    test('should get approval status for entity with workflow', async () => {
      const response = await request(app)
        .get(`/api/v1/approvals/WORK_INSTRUCTION/${testWorkInstructionId}/status`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('hasActiveWorkflow');
    });

    test('should get status for entity without workflow', async () => {
      const newWorkInstruction = await prisma.workInstruction.create({
        data: {
          title: 'No Workflow Work Instruction',
          description: 'For status testing',
          content: { steps: ['Test'] },
          status: 'DRAFT',
          version: '1.0.0',
          createdById: testUser.id,
          updatedById: testUser.id
        }
      });

      const response = await request(app)
        .get(`/api/v1/approvals/WORK_INSTRUCTION/${newWorkInstruction.id}/status`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.hasActiveWorkflow).toBe(false);
    });
  });

  describe('GET /api/v1/approvals/my-tasks', () => {
    test('should get user pending tasks', async () => {
      const response = await request(app)
        .get('/api/v1/approvals/my-tasks')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('limit');
      expect(response.body.data).toHaveProperty('offset');
      expect(Array.isArray(response.body.data.tasks)).toBe(true);
    });

    test('should support query filters', async () => {
      const response = await request(app)
        .get('/api/v1/approvals/my-tasks')
        .query({
          entityType: 'WORK_INSTRUCTION',
          priority: 'MEDIUM',
          limit: 10,
          offset: 0
        })
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.limit).toBe(10);
      expect(response.body.data.offset).toBe(0);
    });

    test('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/approvals/my-tasks')
        .query({
          entityType: 'INVALID_TYPE',
          limit: 'invalid'
        })
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/approvals/dashboard', () => {
    test('should get dashboard for managers', async () => {
      const response = await request(app)
        .get('/api/v1/approvals/dashboard')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalPendingApprovals');
      expect(response.body.data).toHaveProperty('myPendingTasks');
      expect(response.body.data).toHaveProperty('approvalsByType');
      expect(response.body.data).toHaveProperty('approvalsByPriority');
    });

    test('should require manager role for dashboard', async () => {
      // Create user without manager role
      const regularUser = await prisma.user.create({
        data: {
          email: 'regular.user@example.com',
          name: 'Regular User',
          badgeNumber: 'REG001',
          passwordHash: 'test-hash',
          roles: ['operator'], // No manager role
          isActive: true
        }
      });

      const regularToken = jwt.sign(
        {
          id: regularUser.id,
          email: regularUser.email,
          roles: regularUser.roles
        },
        process.env.JWT_SECRET || 'test-secret-that-is-at-least-32-characters-long',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/v1/approvals/dashboard')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403); // Forbidden
    });
  });

  describe('Entity-Specific Convenience Endpoints', () => {
    test('should approve work instruction via convenience endpoint', async () => {
      const newWorkInstruction = await prisma.workInstruction.create({
        data: {
          title: 'Convenience Endpoint Test',
          description: 'For convenience endpoint testing',
          content: { steps: ['Test step'] },
          status: 'DRAFT',
          version: '1.0.0',
          createdById: testUser.id,
          updatedById: testUser.id
        }
      });

      // First initiate workflow
      await request(app)
        .post('/api/v1/approvals/initiate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          entityType: 'WORK_INSTRUCTION',
          entityId: newWorkInstruction.id,
          priority: 'MEDIUM',
          requiredApproverRoles: ['quality_manager']
        });

      // Then use convenience endpoint
      const response = await request(app)
        .post(`/api/v1/approvals/work-instructions/${newWorkInstruction.id}/approve`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          comments: 'Approved via convenience endpoint',
          requiresSignature: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Work instruction approved');
    });

    test('should approve FAI report via convenience endpoint with signature', async () => {
      const newFAI = await prisma.fAI.create({
        data: {
          partNumber: 'CONVENIENCE-FAI-001',
          revision: 'A',
          status: 'IN_PROGRESS',
          inspectionData: { measurements: [] },
          createdById: testUser.id,
          updatedById: testUser.id
        }
      });

      // First initiate workflow
      await request(app)
        .post('/api/v1/approvals/initiate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          entityType: 'FAI_REPORT',
          entityId: newFAI.id,
          priority: 'HIGH',
          requiredApproverRoles: ['quality_manager']
        });

      // Then use convenience endpoint (should require comments for FAI)
      const response = await request(app)
        .post(`/api/v1/approvals/fai-reports/${newFAI.id}/approve`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          comments: 'FAI approved - all measurements within tolerance',
          signatureReason: 'Regulatory compliance signature'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('FAI report approved');
    });

    test('should require comments for FAI approval', async () => {
      const response = await request(app)
        .post(`/api/v1/approvals/fai-reports/${testFAIId}/approve`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          // No comments provided
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/approvals/unknown-endpoint')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Endpoint not found');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/approvals/initiate')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    test('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/approvals/my-tasks');

      expect(response.status).toBe(401);
    });
  });

  describe('Performance and Rate Limiting', () => {
    test('should handle multiple concurrent requests', async () => {
      const promises = [];

      // Make multiple concurrent status requests
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get(`/api/v1/approvals/WORK_INSTRUCTION/${testWorkInstructionId}/status`)
            .set('Authorization', `Bearer ${testToken}`)
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});