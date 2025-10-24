/**
 * Operation Store
 * Zustand store for managing operation state
 */

import { create } from 'zustand';
import type {
  Operation,
  OperationFilters,
} from '@/types/operation';

interface OperationStore {
  // State
  operations: Operation[];
  selectedOperation: Operation | null;
  filters: OperationFilters;
  loading: boolean;
  error: string | null;

  // Actions
  setOperations: (operations: Operation[]) => void;
  setSelectedOperation: (operation: Operation | null) => void;
  setFilters: (filters: OperationFilters) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearFilters: () => void;
}

export const useOperationStore = create<OperationStore>((set) => ({
  // Initial state
  operations: [],
  selectedOperation: null,
  filters: {},
  loading: false,
  error: null,

  // Actions
  setOperations: (operations) => set({ operations: operations }),
  setSelectedOperation: (operation) => set({ selectedOperation: operation }),
  setFilters: (filters) => set({ filters }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearFilters: () => set({ filters: {} }),
}));
