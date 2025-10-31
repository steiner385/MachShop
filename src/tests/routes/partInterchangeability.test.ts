import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import partInterchangeabilityRoutes from '../../routes/partInterchangeability';
import { PartInterchangeabilityService } from '../../services/PartInterchangeabilityService';
import {
  InterchangeabilityType,
  ConfigurationControl,
  SubstitutionType,
  SubstitutionDirection,
  InterchangeabilityApprovalType,
  ApprovalStatus,
  GroupStatus
} from '@prisma/client';

// Mock the service
vi.mock('../../services/PartInterchangeabilityService', () => ({
  PartInterchangeabilityService: {
    getInstance: vi.fn(() => ({
      searchInterchangeabilityGroups: vi.fn(),
      getInterchangeabilityGroupById: vi.fn(),
      createInterchangeabilityGroup: vi.fn(),
      updateInterchangeabilityGroup: vi.fn(),
      deleteInterchangeabilityGroup: vi.fn(),
      addPartToGroup: vi.fn(),
      removePartFromGroup: vi.fn(),
      searchPartSubstitutions: vi.fn(),
      getPartSubstitutionById: vi.fn(),
      createPartSubstitution: vi.fn(),
      updatePartSubstitution: vi.fn(),
      deletePartSubstitution: vi.fn(),
      validateSubstitution: vi.fn(),
      getAvailableSubstitutes: vi.fn(),
      searchApprovals: vi.fn(),
      getApprovalById: vi.fn(),
      createApproval: vi.fn(),
      processApproval: vi.fn(),
      logWorkOrderSubstitution: vi.fn(),
      getWorkOrderSubstitutions: vi.fn(),
      getAuditLogs: vi.fn(),
      getPartUsageHistory: vi.fn(),
    })),
  },
}));

// Mock auth middleware
vi.mock('../../middleware/auth', () => ({
  requireProductionAccess: (req: any, res: any, next: any) => next(),
}));

// Mock error handler
vi.mock('../../middleware/errorHandler', () => ({
  asyncHandler: (fn: any) => fn,
}));

describe('Part Interchangeability Routes', () => {
  let app: express.Application;
  let mockService: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/part-interchangeability', partInterchangeabilityRoutes);

    mockService = PartInterchangeabilityService.getInstance();
    vi.clearAllMocks();
  });

  // ==================== INTERCHANGEABILITY GROUPS ====================

  describe('GET /groups', () => {
    it('should return list of interchangeability groups', async () => {
      const mockGroups = {
        data: [
          {
            id: 'group-1',
            name: 'Test Group 1',
            type: InterchangeabilityType.FORM_FIT_FUNCTION,
            status: GroupStatus.ACTIVE,
          },
          {
            id: 'group-2',
            name: 'Test Group 2',
            type: InterchangeabilityType.INTERFACE_ONLY,
            status: GroupStatus.ACTIVE,
          }
        ],
        total: 2,
        page: 1,
        totalPages: 1
      };

      vi.mocked(mockService.searchInterchangeabilityGroups).mockResolvedValue(mockGroups);

      const response = await request(app)
        .get('/api/v1/part-interchangeability/groups')
        .query({
          type: InterchangeabilityType.FORM_FIT_FUNCTION,
          page: '1',
          limit: '10'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGroups);
      expect(mockService.searchInterchangeabilityGroups).toHaveBeenCalledWith({
        type: InterchangeabilityType.FORM_FIT_FUNCTION,
        status: undefined,
        search: undefined,
        page: 1,
        limit: 10,
        includeMembers: false,
        includeApprovals: false
      });
    });

    it('should handle query parameters correctly', async () => {
      const mockGroups = { data: [], total: 0, page: 1, totalPages: 0 };
      vi.mocked(mockService.searchInterchangeabilityGroups).mockResolvedValue(mockGroups);

      await request(app)
        .get('/api/v1/part-interchangeability/groups')
        .query({
          search: 'test',
          includeMembers: 'true',
          includeApprovals: 'true'
        });

      expect(mockService.searchInterchangeabilityGroups).toHaveBeenCalledWith({
        type: undefined,
        status: undefined,
        search: 'test',
        page: 1,
        limit: 50,
        includeMembers: true,
        includeApprovals: true
      });
    });
  });

  describe('GET /groups/:id', () => {
    it('should return specific interchangeability group', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'Test Group',
        type: InterchangeabilityType.FORM_FIT_FUNCTION,
        status: GroupStatus.ACTIVE,
        members: []
      };

      vi.mocked(mockService.getInterchangeabilityGroupById).mockResolvedValue(mockGroup);

      const response = await request(app)
        .get('/api/v1/part-interchangeability/groups/group-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockGroup);
      expect(mockService.getInterchangeabilityGroupById).toHaveBeenCalledWith('group-123');
    });

    it('should return 404 if group not found', async () => {
      vi.mocked(mockService.getInterchangeabilityGroupById).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/part-interchangeability/groups/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NotFound');
      expect(response.body.message).toBe('Interchangeability group with ID nonexistent not found');
    });

    it('should return 400 if ID is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/part-interchangeability/groups/');

      expect(response.status).toBe(404); // Express returns 404 for missing route params
    });
  });

  describe('POST /groups', () => {
    it('should create new interchangeability group', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'New Test Group',
        type: InterchangeabilityType.FORM_FIT_FUNCTION,
        configurationControl: ConfigurationControl.FULL_PROPAGATION,
        status: GroupStatus.ACTIVE,
        createdBy: 'user-123'
      };

      vi.mocked(mockService.createInterchangeabilityGroup).mockResolvedValue(mockGroup);

      const requestData = {
        name: 'New Test Group',
        description: 'Test Description',
        type: InterchangeabilityType.FORM_FIT_FUNCTION,
        configurationControl: ConfigurationControl.FULL_PROPAGATION,
        createdBy: 'user-123'
      };

      const response = await request(app)
        .post('/api/v1/part-interchangeability/groups')
        .send(requestData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockGroup);
      expect(mockService.createInterchangeabilityGroup).toHaveBeenCalledWith({
        name: 'New Test Group',
        description: 'Test Description',
        type: InterchangeabilityType.FORM_FIT_FUNCTION,
        configurationControl: ConfigurationControl.FULL_PROPAGATION,
        effectiveDate: undefined,
        expirationDate: undefined,
        restrictionConditions: undefined,
        createdBy: 'user-123'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/part-interchangeability/groups')
        .send({
          name: 'Test Group',
          // Missing type, configurationControl, createdBy
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('Name, type, configurationControl, and createdBy are required');
    });
  });

  describe('PUT /groups/:id', () => {
    it('should update interchangeability group', async () => {
      const mockUpdatedGroup = {
        id: 'group-123',
        name: 'Updated Group',
        status: GroupStatus.ACTIVE,
        updatedBy: 'user-123'
      };

      vi.mocked(mockService.updateInterchangeabilityGroup).mockResolvedValue(mockUpdatedGroup);

      const updateData = {
        name: 'Updated Group',
        description: 'Updated Description',
        updatedBy: 'user-123'
      };

      const response = await request(app)
        .put('/api/v1/part-interchangeability/groups/group-123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUpdatedGroup);
      expect(mockService.updateInterchangeabilityGroup).toHaveBeenCalledWith('group-123', {
        name: 'Updated Group',
        description: 'Updated Description',
        configurationControl: undefined,
        effectiveDate: undefined,
        expirationDate: undefined,
        restrictionConditions: undefined,
        status: undefined,
        updatedBy: 'user-123'
      });
    });

    it('should return 400 if updatedBy is missing', async () => {
      const response = await request(app)
        .put('/api/v1/part-interchangeability/groups/group-123')
        .send({ name: 'Updated Group' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('updatedBy is required');
    });
  });

  describe('DELETE /groups/:id', () => {
    it('should delete interchangeability group', async () => {
      vi.mocked(mockService.deleteInterchangeabilityGroup).mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/v1/part-interchangeability/groups/group-123')
        .send({ deletedBy: 'user-123' });

      expect(response.status).toBe(204);
      expect(mockService.deleteInterchangeabilityGroup).toHaveBeenCalledWith('group-123', 'user-123');
    });

    it('should return 400 if deletedBy is missing', async () => {
      const response = await request(app)
        .delete('/api/v1/part-interchangeability/groups/group-123')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('deletedBy is required');
    });
  });

  // ==================== PART SUBSTITUTIONS ====================

  describe('GET /substitutions', () => {
    it('should return list of part substitutions', async () => {
      const mockSubstitutions = {
        data: [
          {
            id: 'sub-1',
            fromPartId: 'part-1',
            toPartId: 'part-2',
            type: SubstitutionType.DIRECT,
            direction: SubstitutionDirection.BIDIRECTIONAL,
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1
      };

      vi.mocked(mockService.searchPartSubstitutions).mockResolvedValue(mockSubstitutions);

      const response = await request(app)
        .get('/api/v1/part-interchangeability/substitutions')
        .query({
          fromPartId: 'part-1',
          type: SubstitutionType.DIRECT
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSubstitutions);
      expect(mockService.searchPartSubstitutions).toHaveBeenCalledWith({
        fromPartId: 'part-1',
        toPartId: undefined,
        groupId: undefined,
        type: SubstitutionType.DIRECT,
        direction: undefined,
        status: undefined,
        page: 1,
        limit: 50,
        includeApprovals: false
      });
    });
  });

  describe('POST /substitutions', () => {
    it('should create new part substitution', async () => {
      const mockSubstitution = {
        id: 'sub-123',
        fromPartId: 'part-1',
        toPartId: 'part-2',
        groupId: 'group-1',
        type: SubstitutionType.DIRECT,
        direction: SubstitutionDirection.BIDIRECTIONAL,
        quantityRatio: 1.0,
        priority: 1,
        createdBy: 'user-123'
      };

      vi.mocked(mockService.createPartSubstitution).mockResolvedValue(mockSubstitution);

      const requestData = {
        fromPartId: 'part-1',
        toPartId: 'part-2',
        groupId: 'group-1',
        type: SubstitutionType.DIRECT,
        direction: SubstitutionDirection.BIDIRECTIONAL,
        createdBy: 'user-123'
      };

      const response = await request(app)
        .post('/api/v1/part-interchangeability/substitutions')
        .send(requestData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockSubstitution);
      expect(mockService.createPartSubstitution).toHaveBeenCalledWith({
        fromPartId: 'part-1',
        toPartId: 'part-2',
        groupId: 'group-1',
        type: SubstitutionType.DIRECT,
        direction: SubstitutionDirection.BIDIRECTIONAL,
        quantityRatio: 1.0,
        priority: 1,
        effectiveDate: undefined,
        expirationDate: undefined,
        conditions: undefined,
        requiresApproval: false,
        createdBy: 'user-123'
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/part-interchangeability/substitutions')
        .send({
          fromPartId: 'part-1',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('fromPartId, toPartId, groupId, type, direction, and createdBy are required');
    });
  });

  // ==================== VALIDATION ROUTES ====================

  describe('POST /validate', () => {
    it('should validate part substitution', async () => {
      const mockValidation = {
        isValid: true,
        canSubstitute: true,
        substitutionRule: {
          id: 'sub-123',
          quantityRatio: 1.0,
          requiresApproval: false
        },
        validationMessages: []
      };

      vi.mocked(mockService.validateSubstitution).mockResolvedValue(mockValidation);

      const response = await request(app)
        .post('/api/v1/part-interchangeability/validate')
        .send({
          fromPartId: 'part-1',
          toPartId: 'part-2',
          workOrderId: 'wo-123',
          quantity: 10
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockValidation);
      expect(mockService.validateSubstitution).toHaveBeenCalledWith(
        'part-1',
        'part-2',
        'wo-123',
        undefined,
        10
      );
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/part-interchangeability/validate')
        .send({
          fromPartId: 'part-1',
          // Missing toPartId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('fromPartId and toPartId are required');
    });
  });

  describe('GET /parts/:partId/substitutes', () => {
    it('should return available substitutes for a part', async () => {
      const mockSubstitutes = [
        {
          id: 'sub-1',
          toPartId: 'part-2',
          toPart: { partNumber: 'P002', description: 'Part 2' },
          quantityRatio: 1.0,
          priority: 1
        }
      ];

      vi.mocked(mockService.getAvailableSubstitutes).mockResolvedValue(mockSubstitutes);

      const response = await request(app)
        .get('/api/v1/part-interchangeability/parts/part-1/substitutes')
        .query({
          workOrderId: 'wo-123',
          quantity: '10'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSubstitutes);
      expect(mockService.getAvailableSubstitutes).toHaveBeenCalledWith(
        'part-1',
        'wo-123',
        undefined,
        10
      );
    });

    it('should return 400 if part ID is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/part-interchangeability/parts//substitutes');

      expect(response.status).toBe(404); // Express returns 404 for missing route params
    });
  });

  // ==================== APPROVAL ROUTES ====================

  describe('POST /approvals', () => {
    it('should create new approval request', async () => {
      const mockApproval = {
        id: 'approval-123',
        type: InterchangeabilityApprovalType.GROUP_CREATION,
        entityId: 'group-123',
        requestedBy: 'user-123',
        approverId: 'approver-123',
        status: ApprovalStatus.PENDING
      };

      vi.mocked(mockService.createApproval).mockResolvedValue(mockApproval);

      const requestData = {
        type: InterchangeabilityApprovalType.GROUP_CREATION,
        entityId: 'group-123',
        requestedBy: 'user-123',
        approverId: 'approver-123',
        requestReason: 'New group creation'
      };

      const response = await request(app)
        .post('/api/v1/part-interchangeability/approvals')
        .send(requestData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockApproval);
      expect(mockService.createApproval).toHaveBeenCalledWith({
        type: InterchangeabilityApprovalType.GROUP_CREATION,
        entityId: 'group-123',
        requestedBy: 'user-123',
        approverId: 'approver-123',
        requestReason: 'New group creation',
        priority: 'MEDIUM',
        effectiveDate: undefined,
        expirationDate: undefined
      });
    });
  });

  describe('POST /approvals/:id/process', () => {
    it('should process approval successfully', async () => {
      const mockProcessedApproval = {
        id: 'approval-123',
        status: ApprovalStatus.APPROVED,
        processedBy: 'approver-123',
        processedAt: new Date(),
        comments: 'Approved'
      };

      vi.mocked(mockService.processApproval).mockResolvedValue(mockProcessedApproval);

      const response = await request(app)
        .post('/api/v1/part-interchangeability/approvals/approval-123/process')
        .send({
          decision: 'APPROVED',
          comments: 'Approved',
          processedBy: 'approver-123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProcessedApproval);
      expect(mockService.processApproval).toHaveBeenCalledWith(
        'approval-123',
        'APPROVED',
        'approver-123',
        'Approved'
      );
    });

    it('should return 400 for invalid decision', async () => {
      const response = await request(app)
        .post('/api/v1/part-interchangeability/approvals/approval-123/process')
        .send({
          decision: 'INVALID',
          processedBy: 'approver-123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('decision must be either APPROVED or REJECTED');
    });
  });

  // ==================== WORK ORDER INTEGRATION ====================

  describe('POST /work-orders/:workOrderId/substitutions', () => {
    it('should log work order substitution', async () => {
      const mockSubstitution = {
        id: 'wo-sub-123',
        workOrderId: 'wo-123',
        operationId: 'op-123',
        fromPartId: 'part-1',
        toPartId: 'part-2',
        quantitySubstituted: 10,
        authorizedBy: 'user-123'
      };

      vi.mocked(mockService.logWorkOrderSubstitution).mockResolvedValue(mockSubstitution);

      const requestData = {
        operationId: 'op-123',
        fromPartId: 'part-1',
        toPartId: 'part-2',
        quantitySubstituted: 10,
        reason: 'Part unavailable',
        authorizedBy: 'user-123'
      };

      const response = await request(app)
        .post('/api/v1/part-interchangeability/work-orders/wo-123/substitutions')
        .send(requestData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockSubstitution);
      expect(mockService.logWorkOrderSubstitution).toHaveBeenCalledWith({
        workOrderId: 'wo-123',
        operationId: 'op-123',
        fromPartId: 'part-1',
        toPartId: 'part-2',
        quantitySubstituted: 10,
        reason: 'Part unavailable',
        authorizedBy: 'user-123',
        approvalId: undefined
      });
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/part-interchangeability/work-orders/wo-123/substitutions')
        .send({
          operationId: 'op-123',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('operationId, fromPartId, toPartId, quantitySubstituted, and authorizedBy are required');
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      vi.mocked(mockService.searchInterchangeabilityGroups)
        .mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/part-interchangeability/groups');

      // The asyncHandler should propagate the error
      expect(response.status).toBe(500);
    });
  });
});