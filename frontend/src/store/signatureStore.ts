import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  signatureAPI,
  CreateSignatureRequest,
  SignatureResponse,
  VerificationResult,
  ListSignaturesParams,
  SignatureAuditTrail,
} from '../api/signatures';

interface SignatureState {
  // State
  signatures: SignatureAuditTrail[];
  currentSignature: VerificationResult | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Actions
  createSignature: (data: CreateSignatureRequest) => Promise<SignatureResponse>;
  verifySignature: (signatureId: string) => Promise<VerificationResult>;
  getSignature: (signatureId: string) => Promise<void>;
  listSignatures: (params?: ListSignaturesParams) => Promise<void>;
  getSignaturesForEntity: (entityType: string, entityId: string) => Promise<SignatureAuditTrail[]>;
  invalidateSignature: (
    signatureId: string,
    invalidatedById: string,
    invalidationReason: string
  ) => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFilters: (filters: Partial<ListSignaturesParams>) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  signatures: [],
  currentSignature: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

/**
 * Signature Store
 *
 * Manages electronic signature state with Zustand
 *
 * Features:
 * - Create and verify signatures
 * - List signatures with pagination
 * - Filter by entity, user, date range
 * - Invalidate signatures
 * - Error handling
 */
export const useSignatureStore = create<SignatureState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      /**
       * Create a new electronic signature
       */
      createSignature: async (data: CreateSignatureRequest) => {
        set({ isLoading: true, error: null });
        try {
          const signature = await signatureAPI.createSignature(data);

          // Refresh signatures list if we're viewing the same entity
          const currentFilters = get().pagination;
          if (
            currentFilters &&
            data.signedEntityType &&
            data.signedEntityId
          ) {
            // Optionally refresh the list
            await get().listSignatures({
              signedEntityType: data.signedEntityType,
              signedEntityId: data.signedEntityId,
            });
          }

          set({ isLoading: false });
          return signature;
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to create signature';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Verify a signature
       */
      verifySignature: async (signatureId: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await signatureAPI.verifySignature({ signatureId });
          set({ currentSignature: result, isLoading: false });
          return result;
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to verify signature';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Get signature by ID
       */
      getSignature: async (signatureId: string) => {
        set({ isLoading: true, error: null });
        try {
          const signature = await signatureAPI.getSignature(signatureId);
          set({ currentSignature: signature, isLoading: false });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to get signature';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * List signatures with filtering and pagination
       */
      listSignatures: async (params?: ListSignaturesParams) => {
        set({ isLoading: true, error: null });
        try {
          const { page, limit } = get().pagination;
          const queryParams = {
            page,
            limit,
            ...params,
          };

          const response = await signatureAPI.listSignatures(queryParams);

          set({
            signatures: response.signatures,
            pagination: response.pagination,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to list signatures';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Get signatures for a specific entity
       */
      getSignaturesForEntity: async (entityType: string, entityId: string) => {
        set({ isLoading: true, error: null });
        try {
          const signatures = await signatureAPI.getSignaturesForEntity(entityType, entityId);
          set({ signatures, isLoading: false });
          return signatures;
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to get entity signatures';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Invalidate a signature
       */
      invalidateSignature: async (
        signatureId: string,
        invalidatedById: string,
        invalidationReason: string
      ) => {
        set({ isLoading: true, error: null });
        try {
          await signatureAPI.invalidateSignature(signatureId, invalidatedById, invalidationReason);

          // Refresh signatures list
          await get().listSignatures();

          set({ isLoading: false });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to invalidate signature';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Set current page
       */
      setPage: (page: number) => {
        set((state) => ({
          pagination: { ...state.pagination, page },
        }));
        get().listSignatures();
      },

      /**
       * Set page size
       */
      setPageSize: (pageSize: number) => {
        set((state) => ({
          pagination: { ...state.pagination, limit: pageSize, page: 1 },
        }));
        get().listSignatures();
      },

      /**
       * Set filters and refresh
       */
      setFilters: (filters: Partial<ListSignaturesParams>) => {
        get().listSignatures(filters);
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Reset store to initial state
       */
      reset: () => {
        set(initialState);
      },
    }),
    { name: 'SignatureStore' }
  )
);

export default useSignatureStore;
