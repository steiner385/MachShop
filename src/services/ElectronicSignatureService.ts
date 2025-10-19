import { PrismaClient, ElectronicSignature } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { logger } from '@/utils/logger';
import {
  CreateSignatureInput,
  VerifySignatureInput,
  InvalidateSignatureInput,
  ListSignaturesInput,
  SignatureData,
  VerificationResult,
  CreateSignatureResponse,
  VerifySignatureResponse,
  ListSignaturesResponse,
  SignatureAuditTrail,
} from '@/types/signature';

/**
 * ElectronicSignatureService
 *
 * Provides electronic signature functionality compliant with 21 CFR Part 11
 *
 * Key features:
 * - Multi-level signatures (Basic, Advanced, Qualified)
 * - Password verification
 * - Biometric support (fingerprint, facial, iris, voice)
 * - SHA-256 hashing for integrity
 * - Signature invalidation with audit trail
 * - Comprehensive verification
 */
export class ElectronicSignatureService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create an electronic signature
   *
   * @param input - Signature creation parameters
   * @returns Created signature with hash
   */
  async createSignature(input: CreateSignatureInput): Promise<CreateSignatureResponse> {
    try {
      // Step 1: Verify user exists and password is correct
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, username: true, passwordHash: true, isActive: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('User account is inactive');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isPasswordValid) {
        logger.warn(`Failed signature attempt for user ${input.userId}`, {
          userId: input.userId,
          ipAddress: input.ipAddress,
        });
        throw new Error('Invalid password');
      }

      // Step 2: Verify the entity being signed exists
      await this.verifyEntityExists(input.signedEntityType, input.signedEntityId);

      // Step 3: Create signature data object
      const signatureData: SignatureData = {
        passwordHash: user.passwordHash,
        timestamp: new Date(),
        userId: input.userId,
        signedEntityType: input.signedEntityType,
        signedEntityId: input.signedEntityId,
      };

      // Step 4: Generate signature hash (SHA-256)
      const signatureHash = this.generateSignatureHash(signatureData);

      // Step 5: Encrypt biometric template if provided
      let encryptedBiometricTemplate: string | undefined;
      if (input.biometricTemplate) {
        encryptedBiometricTemplate = this.encryptBiometricData(input.biometricTemplate);
      }

      // Step 6: Create signature record
      const signature = await this.prisma.electronicSignature.create({
        data: {
          signatureType: input.signatureType,
          signatureLevel: input.signatureLevel,
          userId: input.userId,
          signedEntityType: input.signedEntityType,
          signedEntityId: input.signedEntityId,
          signatureReason: input.signatureReason,
          signatureData: signatureData as any,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          biometricType: input.biometricType,
          biometricTemplate: encryptedBiometricTemplate,
          biometricScore: input.biometricScore,
          signatureHash,
          certificateId: input.certificateId,
          signedDocument: input.signedDocument as any,
          isValid: true,
        },
      });

      logger.info(`Electronic signature created`, {
        signatureId: signature.id,
        userId: input.userId,
        signatureType: input.signatureType,
        signatureLevel: input.signatureLevel,
        signedEntityType: input.signedEntityType,
        signedEntityId: input.signedEntityId,
      });

      return {
        id: signature.id,
        signatureType: signature.signatureType,
        signatureLevel: signature.signatureLevel,
        timestamp: signature.timestamp,
        signatureHash: signature.signatureHash,
        message: 'Electronic signature created successfully',
      };
    } catch (error) {
      logger.error('Error creating electronic signature', { error, input });
      throw error;
    }
  }

  /**
   * Verify an electronic signature
   *
   * @param input - Verification parameters
   * @returns Verification result with signature details
   */
  async verifySignature(input: VerifySignatureInput): Promise<VerificationResult> {
    try {
      const signature = await this.prisma.electronicSignature.findUnique({
        where: { id: input.signatureId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!signature) {
        return {
          isValid: false,
          error: 'Signature not found',
        };
      }

      // Check if signature has been invalidated
      if (!signature.isValid) {
        return {
          isValid: false,
          invalidationReason: signature.invalidationReason || 'Signature has been invalidated',
        };
      }

      // Optional: Verify specific user
      if (input.userId && signature.userId !== input.userId) {
        return {
          isValid: false,
          error: 'Signature does not belong to specified user',
        };
      }

      // Optional: Verify specific entity
      if (input.signedEntityType && signature.signedEntityType !== input.signedEntityType) {
        return {
          isValid: false,
          error: 'Signature does not match specified entity type',
        };
      }

      if (input.signedEntityId && signature.signedEntityId !== input.signedEntityId) {
        return {
          isValid: false,
          error: 'Signature does not match specified entity ID',
        };
      }

      // Verify signature hash integrity
      const signatureData = signature.signatureData as unknown as SignatureData;
      const expectedHash = this.generateSignatureHash(signatureData);

      if (signature.signatureHash !== expectedHash) {
        logger.error('Signature hash mismatch detected', {
          signatureId: signature.id,
          expectedHash,
          actualHash: signature.signatureHash,
        });

        return {
          isValid: false,
          error: 'Signature integrity check failed - hash mismatch',
        };
      }

      // All checks passed
      return {
        isValid: true,
        signature: {
          id: signature.id,
          userId: signature.userId,
          signatureType: signature.signatureType,
          signatureLevel: signature.signatureLevel,
          timestamp: signature.timestamp,
          signedEntityType: signature.signedEntityType,
          signedEntityId: signature.signedEntityId,
          signatureReason: signature.signatureReason || undefined,
          user: {
            id: signature.user.id,
            username: signature.user.username,
            firstName: signature.user.firstName || undefined,
            lastName: signature.user.lastName || undefined,
          },
        },
      };
    } catch (error) {
      logger.error('Error verifying electronic signature', { error, input });
      throw error;
    }
  }

  /**
   * Invalidate an electronic signature
   *
   * @param input - Invalidation parameters
   * @returns Updated signature
   */
  async invalidateSignature(input: InvalidateSignatureInput): Promise<ElectronicSignature> {
    try {
      const signature = await this.prisma.electronicSignature.findUnique({
        where: { id: input.signatureId },
      });

      if (!signature) {
        throw new Error('Signature not found');
      }

      if (!signature.isValid) {
        throw new Error('Signature is already invalidated');
      }

      const updatedSignature = await this.prisma.electronicSignature.update({
        where: { id: input.signatureId },
        data: {
          isValid: false,
          invalidatedAt: new Date(),
          invalidatedById: input.invalidatedById,
          invalidationReason: input.invalidationReason,
        },
      });

      logger.warn(`Electronic signature invalidated`, {
        signatureId: input.signatureId,
        invalidatedById: input.invalidatedById,
        reason: input.invalidationReason,
      });

      return updatedSignature;
    } catch (error) {
      logger.error('Error invalidating electronic signature', { error, input });
      throw error;
    }
  }

  /**
   * Get signature by ID
   *
   * @param signatureId - Signature ID
   * @returns Signature with user details
   */
  async getSignatureById(signatureId: string): Promise<VerifySignatureResponse> {
    try {
      const signature = await this.prisma.electronicSignature.findUnique({
        where: { id: signatureId },
        include: {
          user: {
            select: {
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!signature) {
        throw new Error('Signature not found');
      }

      return {
        isValid: signature.isValid,
        signature: {
          id: signature.id,
          userId: signature.userId,
          signatureType: signature.signatureType,
          signatureLevel: signature.signatureLevel,
          timestamp: signature.timestamp,
          signedEntityType: signature.signedEntityType,
          signedEntityId: signature.signedEntityId,
          user: {
            username: signature.user.username,
            firstName: signature.user.firstName || undefined,
            lastName: signature.user.lastName || undefined,
          },
        },
        invalidationReason: signature.invalidationReason || undefined,
      };
    } catch (error) {
      logger.error('Error getting signature by ID', { error, signatureId });
      throw error;
    }
  }

  /**
   * List signatures with filtering and pagination
   *
   * @param input - Filter and pagination parameters
   * @returns Paginated list of signatures
   */
  async listSignatures(input: ListSignaturesInput): Promise<ListSignaturesResponse> {
    try {
      const { page, limit, sortBy, sortOrder, ...filters } = input;

      // Build where clause
      const where: any = {};

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.signedEntityType) {
        where.signedEntityType = filters.signedEntityType;
      }

      if (filters.signedEntityId) {
        where.signedEntityId = filters.signedEntityId;
      }

      if (filters.signatureType) {
        where.signatureType = filters.signatureType;
      }

      if (filters.signatureLevel) {
        where.signatureLevel = filters.signatureLevel;
      }

      if (filters.isValid !== undefined) {
        where.isValid = filters.isValid;
      }

      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) {
          where.timestamp.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.timestamp.lte = filters.endDate;
        }
      }

      // Get total count
      const total = await this.prisma.electronicSignature.count({ where });

      // Get paginated results
      const signatures = await this.prisma.electronicSignature.findMany({
        where,
        include: {
          user: {
            select: {
              username: true,
            },
          },
          invalidatedBy: {
            select: {
              username: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      const auditTrail: SignatureAuditTrail[] = signatures.map((sig) => ({
        signatureId: sig.id,
        userId: sig.userId,
        username: sig.user.username,
        signatureType: sig.signatureType,
        signatureLevel: sig.signatureLevel,
        timestamp: sig.timestamp,
        ipAddress: sig.ipAddress,
        isValid: sig.isValid,
        invalidatedAt: sig.invalidatedAt || undefined,
        invalidatedBy: sig.invalidatedBy?.username,
        invalidationReason: sig.invalidationReason || undefined,
      }));

      return {
        signatures: auditTrail,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing signatures', { error, input });
      throw error;
    }
  }

  /**
   * Get signatures for a specific entity
   *
   * @param entityType - Entity type (e.g., 'work_instructions')
   * @param entityId - Entity ID
   * @returns List of signatures for the entity
   */
  async getSignaturesForEntity(
    entityType: string,
    entityId: string
  ): Promise<SignatureAuditTrail[]> {
    try {
      const signatures = await this.prisma.electronicSignature.findMany({
        where: {
          signedEntityType: entityType,
          signedEntityId: entityId,
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
          invalidatedBy: {
            select: {
              username: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      return signatures.map((sig) => ({
        signatureId: sig.id,
        userId: sig.userId,
        username: sig.user.username,
        signatureType: sig.signatureType,
        signatureLevel: sig.signatureLevel,
        timestamp: sig.timestamp,
        ipAddress: sig.ipAddress,
        isValid: sig.isValid,
        invalidatedAt: sig.invalidatedAt || undefined,
        invalidatedBy: sig.invalidatedBy?.username,
        invalidationReason: sig.invalidationReason || undefined,
      }));
    } catch (error) {
      logger.error('Error getting signatures for entity', { error, entityType, entityId });
      throw error;
    }
  }

  /**
   * Private helper: Generate SHA-256 signature hash
   */
  private generateSignatureHash(data: SignatureData): string {
    const hashInput = JSON.stringify({
      passwordHash: data.passwordHash,
      timestamp: data.timestamp.toISOString(),
      userId: data.userId,
      signedEntityType: data.signedEntityType,
      signedEntityId: data.signedEntityId,
    });

    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Private helper: Encrypt biometric data
   *
   * In production, use a proper encryption library (e.g., @aws-crypto/client-node)
   * This is a placeholder implementation
   */
  private encryptBiometricData(data: string): string {
    // TODO: Implement proper encryption using AWS KMS, Azure Key Vault, or similar
    // For now, just base64 encode (NOT SECURE FOR PRODUCTION)
    return Buffer.from(data).toString('base64');
  }

  /**
   * Private helper: Verify entity exists in the database
   */
  private async verifyEntityExists(entityType: string, entityId: string): Promise<void> {
    // Map entity types to Prisma models
    const entityMap: { [key: string]: any } = {
      work_instructions: this.prisma.workInstruction,
      work_instruction_steps: this.prisma.workInstructionStep,
      ncrs: this.prisma.nCR,
      quality_inspections: this.prisma.qualityInspection,
      work_orders: this.prisma.workOrder,
      // Add more entity types as needed
    };

    const model = entityMap[entityType];

    if (!model) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    const entity = await model.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new Error(`Entity not found: ${entityType} with ID ${entityId}`);
    }
  }
}
