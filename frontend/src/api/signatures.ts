import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export interface CreateSignatureRequest {
  signatureType: 'BASIC' | 'ADVANCED' | 'QUALIFIED';
  signatureLevel: 'OPERATOR' | 'SUPERVISOR' | 'QUALITY' | 'ENGINEER' | 'MANAGER';
  userId: string;
  password: string;
  signedEntityType: string;
  signedEntityId: string;
  signedEntityName?: string;
  signatureReason?: string;
  biometricType?: 'FINGERPRINT' | 'FACIAL' | 'IRIS' | 'VOICE' | 'NONE';
  biometricTemplate?: string;
  biometricScore?: number;
  certificateId?: string;
  signedDocument?: any;
}

export interface SignatureResponse {
  id: string;
  signatureType: string;
  signatureLevel: string;
  timestamp: Date;
  signatureHash: string;
  message: string;
}

export interface VerifySignatureRequest {
  signatureId: string;
  userId?: string;
  signedEntityType?: string;
  signedEntityId?: string;
}

export interface VerificationResult {
  isValid: boolean;
  signature?: {
    id: string;
    userId: string;
    signatureType: string;
    signatureLevel: string;
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
  error?: string;
  invalidationReason?: string;
}

export interface ListSignaturesParams {
  page?: number;
  limit?: number;
  userId?: string;
  signedEntityType?: string;
  signedEntityId?: string;
  signatureType?: string;
  signatureLevel?: string;
  isValid?: boolean;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'timestamp' | 'signatureType' | 'signatureLevel';
  sortOrder?: 'asc' | 'desc';
}

export interface SignatureAuditTrail {
  signatureId: string;
  userId: string;
  username: string;
  signatureType: string;
  signatureLevel: string;
  timestamp: Date;
  ipAddress: string;
  isValid: boolean;
  invalidatedAt?: Date;
  invalidatedBy?: string;
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

/**
 * Electronic Signature API Client
 *
 * Provides methods for creating, verifying, and managing electronic signatures
 */
class SignatureAPI {
  /**
   * Create a new electronic signature
   */
  async createSignature(data: CreateSignatureRequest): Promise<SignatureResponse> {
    const response = await axios.post(`${API_BASE_URL}/signatures`, data);
    return response.data;
  }

  /**
   * Verify an electronic signature
   */
  async verifySignature(data: VerifySignatureRequest): Promise<VerificationResult> {
    const response = await axios.post(`${API_BASE_URL}/signatures/verify`, data);
    return response.data;
  }

  /**
   * Get signature by ID
   */
  async getSignature(signatureId: string): Promise<VerificationResult> {
    const response = await axios.get(`${API_BASE_URL}/signatures/${signatureId}`);
    return response.data;
  }

  /**
   * List signatures with filtering and pagination
   */
  async listSignatures(params: ListSignaturesParams): Promise<ListSignaturesResponse> {
    const response = await axios.get(`${API_BASE_URL}/signatures`, { params });
    return response.data;
  }

  /**
   * Get signatures for a specific entity
   */
  async getSignaturesForEntity(
    entityType: string,
    entityId: string
  ): Promise<SignatureAuditTrail[]> {
    const response = await axios.get(
      `${API_BASE_URL}/signatures/entity/${entityType}/${entityId}`
    );
    return response.data;
  }

  /**
   * Invalidate a signature (requires admin permission)
   */
  async invalidateSignature(
    signatureId: string,
    invalidatedById: string,
    invalidationReason: string
  ): Promise<void> {
    await axios.post(`${API_BASE_URL}/signatures/${signatureId}/invalidate`, {
      invalidatedById,
      invalidationReason,
    });
  }
}

export const signatureAPI = new SignatureAPI();
export default signatureAPI;
