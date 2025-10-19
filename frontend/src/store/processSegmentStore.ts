/**
 * Process Segment Store
 * Zustand store for managing process segment state
 */

import { create } from 'zustand';
import type {
  ProcessSegment,
  ProcessSegmentFilters,
} from '@/types/processSegment';

interface ProcessSegmentStore {
  // State
  processSegments: ProcessSegment[];
  selectedSegment: ProcessSegment | null;
  filters: ProcessSegmentFilters;
  loading: boolean;
  error: string | null;

  // Actions
  setProcessSegments: (segments: ProcessSegment[]) => void;
  setSelectedSegment: (segment: ProcessSegment | null) => void;
  setFilters: (filters: ProcessSegmentFilters) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearFilters: () => void;
}

export const useProcessSegmentStore = create<ProcessSegmentStore>((set) => ({
  // Initial state
  processSegments: [],
  selectedSegment: null,
  filters: {},
  loading: false,
  error: null,

  // Actions
  setProcessSegments: (segments) => set({ processSegments: segments }),
  setSelectedSegment: (segment) => set({ selectedSegment: segment }),
  setFilters: (filters) => set({ filters }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearFilters: () => set({ filters: {} }),
}));
