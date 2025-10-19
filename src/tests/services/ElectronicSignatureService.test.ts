import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient, ElectronicSignatureType, ElectronicSignatureLevel, BiometricType } from '@prisma/client';
import { ElectronicSignatureService } from '@/services/ElectronicSignatureService';
import bcrypt from 'bcrypt';

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    electronicSignature: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    workInstruction: {
      findUnique: vi.fn(),
    },
    workInstructionStep: {
      findUnique: vi.fn(),
    },
    nCR: {
      findUnique: vi.fn(),
    },
    qualityInspection: {
      findUnique: vi.fn(),
    },
    workOrder: {
      findUnique: vi.fn(),
    },
  };

  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
    ElectronicSignatureType: {
      BASIC: 'BASIC',
      ADVANCED: 'ADVANCED',
      QUALIFIED: 'QUALIFIED',
    },
    ElectronicSignatureLevel: {
      OPERATOR: 'OPERATOR',
      SUPERVISOR: 'SUPERVISOR',
      QUALITY: 'QUALITY',
      ENGINEER: 'ENGINEER',
      MANAGER: 'MANAGER',
    },
    BiometricType: {
      FINGERPRINT: 'FINGERPRINT',
      FACIAL: 'FACIAL',
      IRIS: 'IRIS',
      VOICE: 'VOICE',
      NONE: 'NONE',
    },
  };
});

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

describe('ElectronicSignatureService', () => {
  let service: ElectronicSignatureService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    service = new ElectronicSignatureService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('createSignature', () => {
    const validInput = {
      signatureType: ElectronicSignatureType.BASIC,
      signatureLevel: ElectronicSignatureLevel.OPERATOR,
      userId: 'user-123',
      signedEntityType: 'work_instructions',
      signedEntityId: 'wi-456',
      signatureReason: 'Approval',
      password: 'password123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      passwordHash: '$2b$10$hashedsamplepassword',
      isActive: true,
    };

    const mockSignature = {
      id: 'sig-789',
      signatureType: ElectronicSignatureType.BASIC,
      signatureLevel: ElectronicSignatureLevel.OPERATOR,
      userId: 'user-123',
      signedEntityType: 'work_instructions',
      signedEntityId: 'wi-456',
      signatureReason: 'Approval',
      signatureData: {},
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      biometricType: null,
      biometricTemplate: null,
      biometricScore: null,
      signatureHash: 'abcdef123456',
      isValid: true,
      invalidatedAt: null,
      invalidatedById: null,
      invalidationReason: null,
      signedDocument: null,
      certificateId: null,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a signature successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      mockPrisma.workInstruction.findUnique.mockResolvedValue({ id: 'wi-456' });
      mockPrisma.electronicSignature.create.mockResolvedValue(mockSignature);

      const result = await service.createSignature(validInput);

      expect(result.id).toBe('sig-789');
      expect(result.signatureType).toBe(ElectronicSignatureType.BASIC);
      expect(result.signatureLevel).toBe(ElectronicSignatureLevel.OPERATOR);
      expect(result.message).toBe('Electronic signature created successfully');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { id: true, username: true, passwordHash: true, isActive: true },
      });
      expect(mockPrisma.electronicSignature.create).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.createSignature(validInput)).rejects.toThrow('User not found');
    });

    it('should throw error if user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.createSignature(validInput)).rejects.toThrow('User account is inactive');
    });

    it('should throw error if password is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(service.createSignature(validInput)).rejects.toThrow('Invalid password');
    });

    it('should throw error if entity does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      mockPrisma.workInstruction.findUnique.mockResolvedValue(null);

      await expect(service.createSignature(validInput)).rejects.toThrow('Entity not found');
    });

    it('should create signature with biometric data', async () => {
      const inputWithBiometric = {
        ...validInput,
        biometricType: BiometricType.FINGERPRINT,
        biometricTemplate: 'base64encodedtemplate',
        biometricScore: 0.95,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      mockPrisma.workInstruction.findUnique.mockResolvedValue({ id: 'wi-456' });
      mockPrisma.electronicSignature.create.mockResolvedValue({
        ...mockSignature,
        biometricType: BiometricType.FINGERPRINT,
        biometricScore: 0.95,
      });

      const result = await service.createSignature(inputWithBiometric);

      expect(result.id).toBe('sig-789');
      expect(mockPrisma.electronicSignature.create).toHaveBeenCalled();
    });

    it('should throw error for unknown entity type', async () => {
      const invalidInput = {
        ...validInput,
        signedEntityType: 'unknown_entity',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      await expect(service.createSignature(invalidInput)).rejects.toThrow('Unknown entity type');
    });
  });

  describe('verifySignature', () => {
    // Pre-compute the correct signature hash for the mock data
    const crypto = require('crypto');
    const signatureData = {
      passwordHash: '$2b$10$hashedsamplepassword',
      timestamp: new Date('2025-10-15T10:00:00Z'),
      userId: 'user-123',
      signedEntityType: 'work_instructions',
      signedEntityId: 'wi-456',
    };
    const hashInput = JSON.stringify({
      passwordHash: signatureData.passwordHash,
      timestamp: signatureData.timestamp.toISOString(),
      userId: signatureData.userId,
      signedEntityType: signatureData.signedEntityType,
      signedEntityId: signatureData.signedEntityId,
    });
    const correctHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    const mockSignature = {
      id: 'sig-789',
      signatureType: ElectronicSignatureType.BASIC,
      signatureLevel: ElectronicSignatureLevel.OPERATOR,
      userId: 'user-123',
      signedEntityType: 'work_instructions',
      signedEntityId: 'wi-456',
      signatureReason: 'Approval',
      signatureData,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      biometricType: null,
      biometricTemplate: null,
      biometricScore: null,
      signatureHash: correctHash, // Use the correctly computed hash
      isValid: true,
      invalidatedAt: null,
      invalidatedById: null,
      invalidationReason: null,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      },
    };

    it('should verify a valid signature', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue(mockSignature);

      const result = await service.verifySignature({ signatureId: 'sig-789' });

      expect(result.isValid).toBe(true);
      expect(result.signature?.id).toBe('sig-789');
      expect(result.signature?.userId).toBe('user-123');
    });

    it('should return invalid if signature not found', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue(null);

      const result = await service.verifySignature({ signatureId: 'sig-999' });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Signature not found');
    });

    it('should return invalid if signature was invalidated', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue({
        ...mockSignature,
        isValid: false,
        invalidationReason: 'Security breach',
      });

      const result = await service.verifySignature({ signatureId: 'sig-789' });

      expect(result.isValid).toBe(false);
      expect(result.invalidationReason).toBe('Security breach');
    });

    it('should verify specific user ID', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue(mockSignature);

      const result = await service.verifySignature({
        signatureId: 'sig-789',
        userId: 'user-123',
      });

      expect(result.isValid).toBe(true);
    });

    it('should return invalid if user ID does not match', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue(mockSignature);

      const result = await service.verifySignature({
        signatureId: 'sig-789',
        userId: 'user-999',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Signature does not belong to specified user');
    });

    it('should verify specific entity type', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue(mockSignature);

      const result = await service.verifySignature({
        signatureId: 'sig-789',
        signedEntityType: 'work_instructions',
      });

      expect(result.isValid).toBe(true);
    });

    it('should return invalid if entity type does not match', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue(mockSignature);

      const result = await service.verifySignature({
        signatureId: 'sig-789',
        signedEntityType: 'ncrs',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Signature does not match specified entity type');
    });

    it('should verify specific entity ID', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue(mockSignature);

      const result = await service.verifySignature({
        signatureId: 'sig-789',
        signedEntityId: 'wi-456',
      });

      expect(result.isValid).toBe(true);
    });

    it('should return invalid if entity ID does not match', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue(mockSignature);

      const result = await service.verifySignature({
        signatureId: 'sig-789',
        signedEntityId: 'wi-999',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Signature does not match specified entity ID');
    });
  });

  describe('invalidateSignature', () => {
    const mockSignature = {
      id: 'sig-789',
      isValid: true,
      signatureType: ElectronicSignatureType.BASIC,
      signatureLevel: ElectronicSignatureLevel.OPERATOR,
      userId: 'user-123',
      signedEntityType: 'work_instructions',
      signedEntityId: 'wi-456',
      signatureData: {},
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      signatureHash: 'hash123',
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should invalidate a signature successfully', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue(mockSignature);
      mockPrisma.electronicSignature.update.mockResolvedValue({
        ...mockSignature,
        isValid: false,
        invalidatedAt: new Date(),
        invalidatedById: 'admin-123',
        invalidationReason: 'Security breach',
      });

      const result = await service.invalidateSignature({
        signatureId: 'sig-789',
        invalidatedById: 'admin-123',
        invalidationReason: 'Security breach',
      });

      expect(result.isValid).toBe(false);
      expect(result.invalidationReason).toBe('Security breach');
      expect(mockPrisma.electronicSignature.update).toHaveBeenCalledWith({
        where: { id: 'sig-789' },
        data: expect.objectContaining({
          isValid: false,
          invalidatedById: 'admin-123',
          invalidationReason: 'Security breach',
        }),
      });
    });

    it('should throw error if signature not found', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue(null);

      await expect(
        service.invalidateSignature({
          signatureId: 'sig-999',
          invalidatedById: 'admin-123',
          invalidationReason: 'Test',
        })
      ).rejects.toThrow('Signature not found');
    });

    it('should throw error if signature is already invalidated', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue({
        ...mockSignature,
        isValid: false,
      });

      await expect(
        service.invalidateSignature({
          signatureId: 'sig-789',
          invalidatedById: 'admin-123',
          invalidationReason: 'Test',
        })
      ).rejects.toThrow('Signature is already invalidated');
    });
  });

  describe('getSignatureById', () => {
    it('should get signature by ID successfully', async () => {
      const mockSignature = {
        id: 'sig-789',
        signatureType: ElectronicSignatureType.BASIC,
        signatureLevel: ElectronicSignatureLevel.OPERATOR,
        userId: 'user-123',
        signedEntityType: 'work_instructions',
        signedEntityId: 'wi-456',
        isValid: true,
        timestamp: new Date(),
        invalidationReason: null,
        user: {
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      mockPrisma.electronicSignature.findUnique.mockResolvedValue(mockSignature);

      const result = await service.getSignatureById('sig-789');

      expect(result.isValid).toBe(true);
      expect(result.signature?.id).toBe('sig-789');
      expect(result.signature?.user.username).toBe('testuser');
    });

    it('should throw error if signature not found', async () => {
      mockPrisma.electronicSignature.findUnique.mockResolvedValue(null);

      await expect(service.getSignatureById('sig-999')).rejects.toThrow('Signature not found');
    });
  });

  describe('listSignatures', () => {
    const mockSignatures = [
      {
        id: 'sig-1',
        signatureType: ElectronicSignatureType.BASIC,
        signatureLevel: ElectronicSignatureLevel.OPERATOR,
        userId: 'user-123',
        signedEntityType: 'work_instructions',
        signedEntityId: 'wi-456',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        isValid: true,
        invalidatedAt: null,
        invalidationReason: null,
        user: { username: 'user1' },
        invalidatedBy: null,
      },
      {
        id: 'sig-2',
        signatureType: ElectronicSignatureType.ADVANCED,
        signatureLevel: ElectronicSignatureLevel.SUPERVISOR,
        userId: 'user-456',
        signedEntityType: 'ncrs',
        signedEntityId: 'ncr-789',
        timestamp: new Date(),
        ipAddress: '192.168.1.2',
        isValid: false,
        invalidatedAt: new Date(),
        invalidationReason: 'Security breach',
        user: { username: 'user2' },
        invalidatedBy: { username: 'admin' },
      },
    ];

    it('should list signatures with pagination', async () => {
      mockPrisma.electronicSignature.count.mockResolvedValue(2);
      mockPrisma.electronicSignature.findMany.mockResolvedValue(mockSignatures);

      const result = await service.listSignatures({
        page: 1,
        limit: 20,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });

      expect(result.signatures.length).toBe(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter signatures by userId', async () => {
      mockPrisma.electronicSignature.count.mockResolvedValue(1);
      mockPrisma.electronicSignature.findMany.mockResolvedValue([mockSignatures[0]]);

      const result = await service.listSignatures({
        userId: 'user-123',
        page: 1,
        limit: 20,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });

      expect(result.signatures.length).toBe(1);
      expect(result.signatures[0].userId).toBe('user-123');
    });

    it('should filter signatures by date range', async () => {
      mockPrisma.electronicSignature.count.mockResolvedValue(1);
      mockPrisma.electronicSignature.findMany.mockResolvedValue([mockSignatures[0]]);

      const result = await service.listSignatures({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        page: 1,
        limit: 20,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });

      expect(mockPrisma.electronicSignature.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });
  });

  describe('getSignaturesForEntity', () => {
    it('should get all signatures for a specific entity', async () => {
      const mockSignatures = [
        {
          id: 'sig-1',
          userId: 'user-123',
          signatureType: ElectronicSignatureType.BASIC,
          signatureLevel: ElectronicSignatureLevel.OPERATOR,
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          isValid: true,
          invalidatedAt: null,
          invalidationReason: null,
          user: { username: 'user1' },
          invalidatedBy: null,
        },
      ];

      mockPrisma.electronicSignature.findMany.mockResolvedValue(mockSignatures);

      const result = await service.getSignaturesForEntity('work_instructions', 'wi-456');

      expect(result.length).toBe(1);
      expect(result[0].signatureId).toBe('sig-1');
      expect(mockPrisma.electronicSignature.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            signedEntityType: 'work_instructions',
            signedEntityId: 'wi-456',
          },
        })
      );
    });
  });
});
