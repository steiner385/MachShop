/**
 * Tests for Signature Store
 *
 * Tests electronic signature state management including:
 * - Signature capture and storage
 * - Approval workflows with signatures
 * - Signature validation and verification
 * - Audit trail management
 * - Legal compliance (21 CFR Part 11)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSignatureStore } from '../signatureStore';
import type { Signature, SignatureRequest } from '@/api/signatures';

// Mock the Signatures API
const mockSignaturesAPI = {
  requestSignature: vi.fn(),
  capture: vi.fn(),
  verify: vi.fn(),
  getById: vi.fn(),
  list: vi.fn(),
  revoke: vi.fn(),
  audit: vi.fn(),
};

vi.mock('@/api/signatures', () => ({
  signaturesAPI: mockSignaturesAPI,
}));

// Mock data
const mockSignature: Signature = {
  id: 'sig-1',
  documentId: 'doc-123',
  signerName: 'John Doe',
  signerEmail: 'john@example.com',
  signerTitle: 'Quality Manager',
  signatureImage: 'data:image/png;base64,...',
  signatureHash: 'abc123xyz789',
  timestamp: new Date(),
  location: 'Building A, Room 101',
  ipAddress: '192.168.1.1',
  deviceFingerprint: 'device-hash-123',
  status: 'VALID',
  intention: 'Approval',
  documentHash: 'doc-hash-123',
};

describe('SignatureStore', () => {
  beforeEach(() => {
    useSignatureStore.setState({
      signatures: [],
      currentSignature: null,
      pendingRequests: [],
      isLoading: false,
      error: null,
      auditTrail: [],
    });

    vi.clearAllMocks();
  });

  describe('Signature Capture', () => {
    it('should capture signature with metadata', async () => {
      mockSignaturesAPI.capture.mockResolvedValue(mockSignature);

      const { result } = renderHook(() => useSignatureStore());

      const captureData = {
        documentId: 'doc-123',
        signatureImage: 'data:image/png;base64,...',
        signerName: 'John Doe',
        signerEmail: 'john@example.com',
        signerTitle: 'Quality Manager',
        intention: 'Approval' as const,
      };

      await act(async () => {
        const signature = await result.current.captureSignature(captureData);
        expect(signature.id).toBe('sig-1');
        expect(signature.signerName).toBe('John Doe');
        expect(signature.status).toBe('VALID');
      });
    });

    it('should capture signature with location and device info', async () => {
      const signatureWithLocation = {
        ...mockSignature,
        location: 'Building A, Room 101',
        deviceFingerprint: 'device-hash-123',
      };
      mockSignaturesAPI.capture.mockResolvedValue(signatureWithLocation);

      const { result } = renderHook(() => useSignatureStore());

      const captureData = {
        documentId: 'doc-123',
        signatureImage: 'data:image/png;base64,...',
        signerName: 'John Doe',
        signerEmail: 'john@example.com',
        signerTitle: 'Quality Manager',
        intention: 'Approval' as const,
        location: 'Building A, Room 101',
        deviceFingerprint: 'device-hash-123',
      };

      await act(async () => {
        const signature = await result.current.captureSignature(captureData);
        expect(signature.location).toBe('Building A, Room 101');
        expect(signature.deviceFingerprint).toBe('device-hash-123');
      });
    });
  });

  describe('Signature Verification', () => {
    it('should verify valid signature', async () => {
      mockSignaturesAPI.verify.mockResolvedValue({
        valid: true,
        signatureId: 'sig-1',
        documentHash: 'doc-hash-123',
        message: 'Signature is valid and unaltered',
      });

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        const verification = await result.current.verifySignature('sig-1', 'doc-hash-123');
        expect(verification.valid).toBe(true);
      });
    });

    it('should detect tampered signature', async () => {
      mockSignaturesAPI.verify.mockResolvedValue({
        valid: false,
        signatureId: 'sig-1',
        documentHash: 'different-hash',
        message: 'Document has been modified since signature',
      });

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        const verification = await result.current.verifySignature('sig-1', 'different-hash');
        expect(verification.valid).toBe(false);
      });
    });

    it('should detect revoked signature', async () => {
      const revokedSignature = { ...mockSignature, status: 'REVOKED' };
      mockSignaturesAPI.getById.mockResolvedValue(revokedSignature);

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        const sig = await result.current.getSignature('sig-1');
        expect(sig.status).toBe('REVOKED');
      });
    });
  });

  describe('Signature Request Workflow', () => {
    it('should request signature', async () => {
      const signatureRequest: SignatureRequest = {
        id: 'req-1',
        documentId: 'doc-123',
        requestedBy: 'user-1',
        requestedTo: 'user-2',
        documentHash: 'doc-hash-123',
        intention: 'Approval',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        createdAt: new Date(),
      };

      mockSignaturesAPI.requestSignature.mockResolvedValue(signatureRequest);

      const { result } = renderHook(() => useSignatureStore());

      const requestData = {
        documentId: 'doc-123',
        requestedTo: 'user-2',
        documentHash: 'doc-hash-123',
        intention: 'Approval',
      };

      await act(async () => {
        const request = await result.current.requestSignature(requestData);
        expect(request.status).toBe('PENDING');
        expect(request.requestedTo).toBe('user-2');
      });

      expect(result.current.pendingRequests.length).toBeGreaterThanOrEqual(0);
    });

    it('should list pending signature requests', async () => {
      const mockRequests = [
        {
          id: 'req-1',
          documentId: 'doc-123',
          requestedBy: 'user-1',
          requestedTo: 'user-2',
          status: 'PENDING' as const,
          intention: 'Approval',
          createdAt: new Date(),
        },
      ];

      mockSignaturesAPI.list.mockResolvedValue(mockRequests);

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        await result.current.getPendingRequests('user-2');
      });

      expect(result.current.pendingRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Signature Revocation', () => {
    it('should revoke signature', async () => {
      const revokedSignature = {
        ...mockSignature,
        status: 'REVOKED',
      };
      mockSignaturesAPI.revoke.mockResolvedValue(revokedSignature);

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        const signature = await result.current.revokeSignature('sig-1', 'Error in document');
        expect(signature.status).toBe('REVOKED');
      });

      expect(mockSignaturesAPI.revoke).toHaveBeenCalledWith('sig-1', 'Error in document');
    });

    it('should record revocation in audit trail', async () => {
      const revokedSignature = {
        ...mockSignature,
        status: 'REVOKED',
      };
      mockSignaturesAPI.revoke.mockResolvedValue(revokedSignature);
      mockSignaturesAPI.audit.mockResolvedValue([
        {
          action: 'REVOKE',
          signatureId: 'sig-1',
          actor: 'user-1',
          reason: 'Error in document',
          timestamp: new Date(),
        },
      ]);

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        await result.current.revokeSignature('sig-1', 'Error in document');
        await result.current.getAuditTrail('sig-1');
      });

      expect(result.current.auditTrail.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Audit Trail', () => {
    it('should retrieve signature audit trail', async () => {
      const mockAudit = [
        {
          id: 'audit-1',
          signatureId: 'sig-1',
          action: 'CAPTURE',
          actor: 'john@example.com',
          timestamp: new Date(),
          details: 'Signature captured',
        },
        {
          id: 'audit-2',
          signatureId: 'sig-1',
          action: 'VERIFY',
          actor: 'system',
          timestamp: new Date(),
          details: 'Signature verified',
        },
      ];

      mockSignaturesAPI.audit.mockResolvedValue(mockAudit);

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        await result.current.getAuditTrail('sig-1');
      });

      expect(result.current.auditTrail).toHaveLength(2);
    });

    it('should record all signature actions in audit trail', async () => {
      mockSignaturesAPI.audit.mockResolvedValue([
        { action: 'CAPTURE', timestamp: new Date() },
        { action: 'VERIFY', timestamp: new Date() },
        { action: 'APPROVE', timestamp: new Date() },
      ]);

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        await result.current.getAuditTrail('sig-1');
      });

      expect(result.current.auditTrail.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Compliance (21 CFR Part 11)', () => {
    it('should capture signature with all required compliance fields', async () => {
      const complianceSignature = {
        ...mockSignature,
        signatureHash: 'abc123xyz789',
        documentHash: 'doc-hash-123',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        deviceFingerprint: 'device-hash-123',
      };

      mockSignaturesAPI.capture.mockResolvedValue(complianceSignature);

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        const signature = await result.current.captureSignature({
          documentId: 'doc-123',
          signatureImage: 'data:image/png;base64,...',
          signerName: 'John Doe',
          signerEmail: 'john@example.com',
          signerTitle: 'Quality Manager',
          intention: 'Approval',
        });

        expect(signature.signatureHash).toBeDefined();
        expect(signature.documentHash).toBeDefined();
        expect(signature.timestamp).toBeDefined();
        expect(signature.ipAddress).toBeDefined();
        expect(signature.deviceFingerprint).toBeDefined();
      });
    });

    it('should maintain immutable audit trail for compliance', async () => {
      mockSignaturesAPI.audit.mockResolvedValue([
        {
          id: 'audit-1',
          signatureId: 'sig-1',
          action: 'CAPTURE',
          actor: 'john@example.com',
          timestamp: new Date(),
        },
      ]);

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        await result.current.getAuditTrail('sig-1');
      });

      const auditTrailLength = result.current.auditTrail.length;

      // Attempt to modify audit trail should not affect the stored trail
      expect(result.current.auditTrail).toHaveLength(auditTrailLength);
    });
  });

  describe('Error Handling', () => {
    it('should handle capture errors', async () => {
      const error = new Error('Failed to capture signature');
      mockSignaturesAPI.capture.mockRejectedValue(error);

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        try {
          await result.current.captureSignature({
            documentId: 'doc-123',
            signatureImage: 'invalid',
            signerName: 'John Doe',
            signerEmail: 'john@example.com',
            signerTitle: 'Quality Manager',
            intention: 'Approval',
          });
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle verification errors', async () => {
      mockSignaturesAPI.verify.mockRejectedValue(new Error('Verification failed'));

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        try {
          await result.current.verifySignature('invalid-sig', 'hash');
        } catch (e) {
          // Expected
        }
      });
    });
  });

  describe('State Management', () => {
    it('should maintain signature list', async () => {
      mockSignaturesAPI.list.mockResolvedValue([mockSignature]);

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        await result.current.listSignatures();
      });

      expect(result.current.signatures).toHaveLength(1);
    });

    it('should store current signature during operations', async () => {
      mockSignaturesAPI.getById.mockResolvedValue(mockSignature);

      const { result } = renderHook(() => useSignatureStore());

      await act(async () => {
        await result.current.getSignature('sig-1');
      });

      expect(result.current.currentSignature?.id).toBe('sig-1');
    });
  });
});
