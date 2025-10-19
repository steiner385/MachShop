import { z } from 'zod';
import {
  ElectronicSignatureType,
  ElectronicSignatureLevel,
  BiometricType
} from '@prisma/client';

/**
 * Zod Schema for creating an electronic signature
 * 21 CFR Part 11 compliant electronic signature
 */
export const createSignatureSchema = z.object({
  signatureType: z.nativeEnum(ElectronicSignatureType),
  signatureLevel: z.nativeEnum(ElectronicSignatureLevel),
  userId: z.string().cuid(),
  signedEntityType: z.string().min(1, 'Entity type is required'),
  signedEntityId: z.string().cuid(),
  signatureReason: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'), // For verification
  ipAddress: z.string().ip(),
  userAgent: z.string().min(1),

  // Biometric data (optional)
  biometricType: z.nativeEnum(BiometricType).optional(),
  biometricTemplate: z.string().optional(), // Base64 encoded biometric data
  biometricScore: z.number().min(0).max(1).optional(),

  // Optional metadata
  certificateId: z.string().optional(), // For qualified signatures
  signedDocument: z.record(z.any()).optional(), // Snapshot of the signed document
});

export type CreateSignatureInput = z.infer<typeof createSignatureSchema>;

/**
 * Zod Schema for verifying an electronic signature
 */
export const verifySignatureSchema = z.object({
  signatureId: z.string().cuid(),
  userId: z.string().cuid().optional(), // Optional: verify specific user
  signedEntityType: z.string().optional(), // Optional: verify specific entity type
  signedEntityId: z.string().cuid().optional(), // Optional: verify specific entity
});

export type VerifySignatureInput = z.infer<typeof verifySignatureSchema>;

/**
 * Zod Schema for invalidating an electronic signature
 */
export const invalidateSignatureSchema = z.object({
  signatureId: z.string().cuid(),
  invalidatedById: z.string().cuid(),
  invalidationReason: z.string().min(10, 'Invalidation reason must be at least 10 characters'),
});

export type InvalidateSignatureInput = z.infer<typeof invalidateSignatureSchema>;

/**
 * Zod Schema for listing signatures with filters
 */
export const listSignaturesSchema = z.object({
  userId: z.string().cuid().optional(),
  signedEntityType: z.string().optional(),
  signedEntityId: z.string().cuid().optional(),
  signatureType: z.nativeEnum(ElectronicSignatureType).optional(),
  signatureLevel: z.nativeEnum(ElectronicSignatureLevel).optional(),
  isValid: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['timestamp', 'signatureType', 'signatureLevel']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListSignaturesInput = z.infer<typeof listSignaturesSchema>;

/**
 * TypeScript interfaces for signature operations
 */

export interface SignatureData {
  passwordHash: string;
  timestamp: Date;
  userId: string;
  signedEntityType: string;
  signedEntityId: string;
}

export interface VerificationResult {
  isValid: boolean;
  signature?: {
    id: string;
    userId: string;
    signatureType: ElectronicSignatureType;
    signatureLevel: ElectronicSignatureLevel;
    timestamp: Date;
    signedEntityType: string;
    signedEntityId: string;
    signatureReason?: string;
    user: {
      id: string;
      username: string;
      firstName?: string;
      lastName?: string;
    };
  };
  invalidationReason?: string;
  error?: string;
}

export interface SignatureAuditTrail {
  signatureId: string;
  userId: string;
  username: string;
  signatureType: ElectronicSignatureType;
  signatureLevel: ElectronicSignatureLevel;
  timestamp: Date;
  ipAddress: string;
  isValid: boolean;
  invalidatedAt?: Date;
  invalidatedBy?: string;
  invalidationReason?: string;
}

/**
 * Response types
 */

export interface CreateSignatureResponse {
  id: string;
  signatureType: ElectronicSignatureType;
  signatureLevel: ElectronicSignatureLevel;
  timestamp: Date;
  signatureHash: string;
  message: string;
}

export interface VerifySignatureResponse {
  isValid: boolean;
  signature?: {
    id: string;
    userId: string;
    signatureType: ElectronicSignatureType;
    signatureLevel: ElectronicSignatureLevel;
    timestamp: Date;
    signedEntityType: string;
    signedEntityId: string;
    user: {
      username: string;
      firstName?: string;
      lastName?: string;
    };
  };
  invalidationReason?: string;
}

export interface ListSignaturesResponse {
  signatures: SignatureAuditTrail[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
