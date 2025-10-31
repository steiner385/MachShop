/**
 * ICDService Tests
 * Comprehensive test suite for Interface Control Document (ICD) system
 *
 * GitHub Issue #224: Interface Control Document (ICD) System
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ICDService } from '../../services/ICDService';
import {
  ICDCreateInput,
  ICDUpdateInput,
  ICDResponse,
  ICDFilters,
  ICDAnalytics,
  ICDError,
  ICDValidationError,
  ICDNotFoundError,
  ICDStateError,
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
  InterfaceEffectivityType,
} from '@prisma/client';
import prisma from '../../lib/database';

// Mock Prisma
vi.mock('../../lib/database', () => ({
  default: {
    interfaceControlDocument: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    interfaceRequirement: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    iCDPartImplementation: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    iCDPartConsumption: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    iCDComplianceCheck: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    iCDChangeRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    iCDHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    iCDVersion: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    iCDAttachment: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    part: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}));

describe('ICDService', () => {
  let icdService: ICDService;
  let mockPrisma: any;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  };

  const validICDCreateInput: ICDCreateInput = {
    icdNumber: 'ICD-TEST-001',
    icdName: 'Test Interface',
    title: 'Test Interface Control Document',
    description: 'A test ICD for unit testing',
    version: '1.0',
    interfaceType: InterfaceType.MECHANICAL,
    interfaceDirection: InterfaceDirection.BIDIRECTIONAL,
    criticality: InterfaceCriticality.MINOR,
    applicableStandards: ['SAE AIR6181A', 'ASME Y14.24'],
    effectiveDate: new Date('2024-01-01'),
    ownerId: 'owner-123',
    ownerName: 'Test Owner',
    createdById: mockUser.id,
  };

  const mockICDResponse: ICDResponse = {
    id: 'icd-123',
    persistentUuid: '550e8400-e29b-41d4-a716-446655440000',
    icdNumber: 'ICD-TEST-001',
    icdName: 'Test Interface',
    title: 'Test Interface Control Document',
    description: 'A test ICD for unit testing',
    version: '1.0',
    revisionLevel: null,
    status: ICDStatus.DRAFT,
    interfaceType: InterfaceType.MECHANICAL,
    interfaceDirection: InterfaceDirection.BIDIRECTIONAL,
    criticality: InterfaceCriticality.MINOR,
    applicableStandards: ['SAE AIR6181A', 'ASME Y14.24'],
    complianceNotes: null,
    effectiveDate: new Date('2024-01-01'),
    expirationDate: null,
    effectivityType: null,
    effectivityValue: null,
    ownerId: 'owner-123',
    ownerName: 'Test Owner',
    ownerDepartment: null,
    approvedById: null,
    approvedDate: null,
    reviewCycle: null,
    nextReviewDate: null,
    documentationUrl: null,
    drawingReferences: [],
    specificationRefs: [],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdById: mockUser.id,
    lastModifiedById: null,
  };

  beforeEach(() => {
    icdService = new ICDService();
    mockPrisma = prisma as any;

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createICD', () => {
    it('should create a new ICD successfully', async () => {
      // Arrange
      mockPrisma.interfaceControlDocument.findFirst.mockResolvedValueOnce(null); // No existing ICD
      mockPrisma.interfaceControlDocument.create.mockResolvedValueOnce(mockICDResponse);
      mockPrisma.iCDHistory.create.mockResolvedValueOnce({});

      // Act
      const result = await icdService.createICD(validICDCreateInput);

      // Assert
      expect(result).toEqual(mockICDResponse);
      expect(mockPrisma.interfaceControlDocument.findFirst).toHaveBeenCalledWith({
        where: { icdNumber: validICDCreateInput.icdNumber }
      });
      expect(mockPrisma.interfaceControlDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          icdNumber: validICDCreateInput.icdNumber,
          icdName: validICDCreateInput.icdName,
          title: validICDCreateInput.title,
          interfaceType: validICDCreateInput.interfaceType,
          status: ICDStatus.DRAFT,
        }),
        include: expect.any(Object)
      });
      expect(mockPrisma.iCDHistory.create).toHaveBeenCalled();
    });

    it('should throw validation error for duplicate ICD number', async () => {
      // Arrange
      mockPrisma.interfaceControlDocument.findFirst.mockResolvedValueOnce({ id: 'existing' });

      // Act & Assert
      await expect(icdService.createICD(validICDCreateInput))
        .rejects.toThrow(ICDValidationError);
      await expect(icdService.createICD(validICDCreateInput))
        .rejects.toThrow('ICD number ICD-TEST-001 already exists');
    });

    it('should throw validation error for invalid ICD number format', async () => {
      // Arrange
      const invalidInput = { ...validICDCreateInput, icdNumber: 'invalid-format' };

      // Act & Assert
      await expect(icdService.createICD(invalidInput))
        .rejects.toThrow(ICDValidationError);
      await expect(icdService.createICD(invalidInput))
        .rejects.toThrow('ICD number must follow format: ICD-[DEPT]-[###]');
    });

    it('should throw validation error for missing required fields', async () => {
      // Arrange
      const invalidInput = { ...validICDCreateInput, icdName: '' };

      // Act & Assert
      await expect(icdService.createICD(invalidInput))
        .rejects.toThrow(ICDValidationError);
    });
  });

  describe('getICDById', () => {
    it('should return ICD when found', async () => {
      // Arrange
      mockPrisma.interfaceControlDocument.findUnique.mockResolvedValueOnce(mockICDResponse);

      // Act
      const result = await icdService.getICDById('icd-123');

      // Assert
      expect(result).toEqual(mockICDResponse);
      expect(mockPrisma.interfaceControlDocument.findUnique).toHaveBeenCalledWith({
        where: { id: 'icd-123' },
        include: expect.any(Object)
      });
    });

    it('should throw not found error when ICD does not exist', async () => {
      // Arrange
      mockPrisma.interfaceControlDocument.findUnique.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(icdService.getICDById('nonexistent'))
        .rejects.toThrow(ICDNotFoundError);
      await expect(icdService.getICDById('nonexistent'))
        .rejects.toThrow('ICD not found with id: nonexistent');
    });
  });

  describe('getICDByNumber', () => {
    it('should return ICD when found by number', async () => {
      // Arrange
      mockPrisma.interfaceControlDocument.findFirst.mockResolvedValueOnce(mockICDResponse);

      // Act
      const result = await icdService.getICDByNumber('ICD-TEST-001');

      // Assert
      expect(result).toEqual(mockICDResponse);
      expect(mockPrisma.interfaceControlDocument.findFirst).toHaveBeenCalledWith({
        where: { icdNumber: 'ICD-TEST-001' },
        include: expect.any(Object)
      });
    });

    it('should throw not found error when ICD number does not exist', async () => {
      // Arrange
      mockPrisma.interfaceControlDocument.findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(icdService.getICDByNumber('ICD-NONEXISTENT-001'))
        .rejects.toThrow(ICDNotFoundError);
    });
  });

  describe('updateICD', () => {
    const updateInput: ICDUpdateInput = {
      icdName: 'Updated Interface Name',
      description: 'Updated description',
      status: ICDStatus.UNDER_REVIEW,
      lastModifiedById: mockUser.id,
    };

    it('should update ICD successfully', async () => {
      // Arrange
      const updatedICD = { ...mockICDResponse, ...updateInput };
      mockPrisma.interfaceControlDocument.findUnique.mockResolvedValueOnce(mockICDResponse);
      mockPrisma.interfaceControlDocument.update.mockResolvedValueOnce(updatedICD);
      mockPrisma.iCDHistory.create.mockResolvedValueOnce({});

      // Act
      const result = await icdService.updateICD('icd-123', updateInput);

      // Assert
      expect(result).toEqual(updatedICD);
      expect(mockPrisma.interfaceControlDocument.update).toHaveBeenCalledWith({
        where: { id: 'icd-123' },
        data: expect.objectContaining(updateInput),
        include: expect.any(Object)
      });
      expect(mockPrisma.iCDHistory.create).toHaveBeenCalled();
    });

    it('should throw not found error for nonexistent ICD', async () => {
      // Arrange
      mockPrisma.interfaceControlDocument.findUnique.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(icdService.updateICD('nonexistent', updateInput))
        .rejects.toThrow(ICDNotFoundError);
    });

    it('should prevent invalid status transitions', async () => {
      // Arrange
      const releasedICD = { ...mockICDResponse, status: ICDStatus.RELEASED };
      mockPrisma.interfaceControlDocument.findUnique.mockResolvedValueOnce(releasedICD);

      // Act & Assert
      await expect(icdService.updateICD('icd-123', { status: ICDStatus.DRAFT }))
        .rejects.toThrow(ICDStateError);
    });
  });

  describe('listICDs', () => {
    it('should return paginated list of ICDs', async () => {
      // Arrange
      const mockICDs = [mockICDResponse];
      mockPrisma.interfaceControlDocument.findMany.mockResolvedValueOnce(mockICDs);
      mockPrisma.interfaceControlDocument.count.mockResolvedValueOnce(1);

      const filters: ICDFilters = {
        status: [ICDStatus.DRAFT],
        interfaceType: [InterfaceType.MECHANICAL],
      };

      // Act
      const result = await icdService.listICDs(filters, 1, 10);

      // Assert
      expect(result.icds).toEqual(mockICDs);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(mockPrisma.interfaceControlDocument.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: { in: [ICDStatus.DRAFT] },
          interfaceType: { in: [InterfaceType.MECHANICAL] },
        }),
        include: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should handle search filtering', async () => {
      // Arrange
      mockPrisma.interfaceControlDocument.findMany.mockResolvedValueOnce([]);
      mockPrisma.interfaceControlDocument.count.mockResolvedValueOnce(0);

      const filters: ICDFilters = {
        search: 'test interface',
      };

      // Act
      await icdService.listICDs(filters);

      // Assert
      expect(mockPrisma.interfaceControlDocument.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
        include: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('addRequirement', () => {
    const requirementInput: InterfaceRequirementCreateInput = {
      icdId: 'icd-123',
      requirementId: 'REQ-001',
      category: 'Form',
      title: 'Test Requirement',
      description: 'A test requirement',
      verificationMethod: VerificationMethod.INSPECTION,
      priority: 'HIGH',
      safetyRelated: true,
      missionCritical: false,
    };

    it('should add requirement to ICD successfully', async () => {
      // Arrange
      mockPrisma.interfaceControlDocument.findUnique.mockResolvedValueOnce(mockICDResponse);
      mockPrisma.interfaceRequirement.create.mockResolvedValueOnce({
        id: 'req-123',
        ...requirementInput,
      });

      // Act
      const result = await icdService.addRequirement(requirementInput);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: 'req-123',
        requirementId: 'REQ-001',
        title: 'Test Requirement',
      }));
      expect(mockPrisma.interfaceRequirement.create).toHaveBeenCalledWith({
        data: expect.objectContaining(requirementInput),
        include: expect.any(Object)
      });
    });

    it('should throw error for nonexistent ICD', async () => {
      // Arrange
      mockPrisma.interfaceControlDocument.findUnique.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(icdService.addRequirement(requirementInput))
        .rejects.toThrow(ICDNotFoundError);
    });
  });

  describe('linkPartImplementation', () => {
    const implementationInput: ICDPartImplementationCreateInput = {
      icdId: 'icd-123',
      partId: 'part-123',
      implementationType: 'DIRECT',
      implementationNotes: 'Direct implementation',
      complianceStatus: ComplianceStatus.COMPLIANT,
    };

    it('should link part implementation successfully', async () => {
      // Arrange
      mockPrisma.interfaceControlDocument.findUnique.mockResolvedValueOnce(mockICDResponse);
      mockPrisma.part.findUnique.mockResolvedValueOnce({ id: 'part-123', partNumber: 'P-123' });
      mockPrisma.iCDPartImplementation.create.mockResolvedValueOnce({
        id: 'impl-123',
        ...implementationInput,
      });

      // Act
      const result = await icdService.linkPartImplementation(implementationInput);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: 'impl-123',
        implementationType: 'DIRECT',
      }));
      expect(mockPrisma.iCDPartImplementation.create).toHaveBeenCalled();
    });

    it('should throw error for nonexistent part', async () => {
      // Arrange
      mockPrisma.interfaceControlDocument.findUnique.mockResolvedValueOnce(mockICDResponse);
      mockPrisma.part.findUnique.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(icdService.linkPartImplementation(implementationInput))
        .rejects.toThrow(ICDValidationError);
    });
  });

  // Additional integration tests can be added here as the service API expands

  describe('Error Handling', () => {
    it('should handle validation errors properly', async () => {
      // Arrange
      const invalidInput = { ...validICDCreateInput, icdName: '' };

      // Act & Assert
      await expect(icdService.createICD(invalidInput))
        .rejects.toThrow(ICDValidationError);
    });
  });
});