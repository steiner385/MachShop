/**
 * Operation Store Tests
 * Issue #408: RoutingStore & OperationStore tests
 *
 * Comprehensive test suite for OperationStore Zustand store
 * Coverage: State management, filters, operations, error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOperationStore } from '../operationStore';
import type { Operation, OperationFilters } from '@/types/operation';

// ============================================
// MOCK DATA
// ============================================

const mockOperation: Operation = {
  id: 'op-1',
  code: 'OP001',
  description: 'Machining operation',
  operationType: 'MACHINE',
  estimatedTime: 30,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockOperation2: Operation = {
  id: 'op-2',
  code: 'OP002',
  description: 'Assembly operation',
  operationType: 'ASSEMBLY',
  estimatedTime: 45,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ============================================
// TESTS
// ============================================

describe('OperationStore', () => {
  beforeEach(() => {
    // Reset store state
    useOperationStore.setState({
      operations: [],
      selectedOperation: null,
      filters: {},
      loading: false,
      error: null,
    });

    vi.clearAllMocks();
  });

  // ============================================
  // INITIALIZATION TESTS
  // ============================================

  describe('State Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useOperationStore());

      expect(result.current.operations).toEqual([]);
      expect(result.current.selectedOperation).toBeNull();
      expect(result.current.filters).toEqual({});
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should maintain state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useOperationStore());
      const { result: result2 } = renderHook(() => useOperationStore());

      act(() => {
        result1.current.setLoading(true);
      });

      expect(result2.current.loading).toBe(true);
    });

    it('should access all initial state values', () => {
      const { result } = renderHook(() => useOperationStore());

      expect(result.current).toHaveProperty('operations');
      expect(result.current).toHaveProperty('selectedOperation');
      expect(result.current).toHaveProperty('filters');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
    });
  });

  // ============================================
  // OPERATIONS STATE TESTS
  // ============================================

  describe('Operations State', () => {
    it('should set operations list', () => {
      const { result } = renderHook(() => useOperationStore());
      const operations = [mockOperation, mockOperation2];

      act(() => {
        result.current.setOperations(operations);
      });

      expect(result.current.operations).toHaveLength(2);
      expect(result.current.operations[0].id).toBe('op-1');
      expect(result.current.operations[1].id).toBe('op-2');
    });

    it('should set empty operations list', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setOperations([mockOperation]);
      });

      expect(result.current.operations).toHaveLength(1);

      act(() => {
        result.current.setOperations([]);
      });

      expect(result.current.operations).toHaveLength(0);
    });

    it('should replace previous operations when setting new list', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setOperations([mockOperation]);
      });

      expect(result.current.operations).toHaveLength(1);

      act(() => {
        result.current.setOperations([mockOperation2]);
      });

      expect(result.current.operations).toHaveLength(1);
      expect(result.current.operations[0].id).toBe('op-2');
    });

    it('should set multiple operations preserving order', () => {
      const { result } = renderHook(() => useOperationStore());
      const operations = [
        mockOperation,
        mockOperation2,
        { ...mockOperation, id: 'op-3', code: 'OP003' },
      ];

      act(() => {
        result.current.setOperations(operations);
      });

      expect(result.current.operations).toHaveLength(3);
      expect(result.current.operations[0].code).toBe('OP001');
      expect(result.current.operations[1].code).toBe('OP002');
      expect(result.current.operations[2].code).toBe('OP003');
    });
  });

  // ============================================
  // SELECTED OPERATION TESTS
  // ============================================

  describe('Selected Operation', () => {
    it('should set selected operation', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setSelectedOperation(mockOperation);
      });

      expect(result.current.selectedOperation).toEqual(mockOperation);
      expect(result.current.selectedOperation?.id).toBe('op-1');
    });

    it('should clear selected operation when set to null', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setSelectedOperation(mockOperation);
      });

      expect(result.current.selectedOperation).not.toBeNull();

      act(() => {
        result.current.setSelectedOperation(null);
      });

      expect(result.current.selectedOperation).toBeNull();
    });

    it('should change selected operation', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setSelectedOperation(mockOperation);
      });

      expect(result.current.selectedOperation?.id).toBe('op-1');

      act(() => {
        result.current.setSelectedOperation(mockOperation2);
      });

      expect(result.current.selectedOperation?.id).toBe('op-2');
    });

    it('should maintain operations list when changing selected operation', () => {
      const { result } = renderHook(() => useOperationStore());
      const operations = [mockOperation, mockOperation2];

      act(() => {
        result.current.setOperations(operations);
      });

      expect(result.current.operations).toHaveLength(2);

      act(() => {
        result.current.setSelectedOperation(mockOperation);
      });

      expect(result.current.operations).toHaveLength(2);
      expect(result.current.selectedOperation?.id).toBe('op-1');
    });
  });

  // ============================================
  // FILTERS TESTS
  // ============================================

  describe('Filters Management', () => {
    it('should set filters', () => {
      const { result } = renderHook(() => useOperationStore());
      const filters: OperationFilters = {
        operationType: 'MACHINE',
        searchText: 'drill',
      };

      act(() => {
        result.current.setFilters(filters);
      });

      expect(result.current.filters).toEqual(filters);
      expect(result.current.filters.operationType).toBe('MACHINE');
      expect(result.current.filters.searchText).toBe('drill');
    });

    it('should replace filters when setting new ones', () => {
      const { result } = renderHook(() => useOperationStore());

      const filters1: OperationFilters = {
        operationType: 'MACHINE',
      };

      act(() => {
        result.current.setFilters(filters1);
      });

      expect(result.current.filters.operationType).toBe('MACHINE');

      const filters2: OperationFilters = {
        searchText: 'assembly',
      };

      act(() => {
        result.current.setFilters(filters2);
      });

      expect(result.current.filters).toEqual(filters2);
      expect(result.current.filters.operationType).toBeUndefined();
    });

    it('should clear filters', () => {
      const { result } = renderHook(() => useOperationStore());
      const filters: OperationFilters = {
        operationType: 'MACHINE',
        searchText: 'test',
      };

      act(() => {
        result.current.setFilters(filters);
      });

      expect(result.current.filters).not.toEqual({});

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
    });

    it('should set empty filters object', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setFilters({});
      });

      expect(result.current.filters).toEqual({});
    });
  });

  // ============================================
  // LOADING STATE TESTS
  // ============================================

  describe('Loading State', () => {
    it('should set loading to true', () => {
      const { result } = renderHook(() => useOperationStore());

      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it('should set loading to false', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });

    it('should maintain other state when changing loading', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setOperations([mockOperation]);
      });

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.operations).toHaveLength(1);
      expect(result.current.loading).toBe(true);
    });
  });

  // ============================================
  // ERROR STATE TESTS
  // ============================================

  describe('Error State', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setError('Operation failed');
      });

      expect(result.current.error).toBe('Operation failed');
    });

    it('should clear error by setting to null', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setError('Operation failed');
      });

      expect(result.current.error).toBe('Operation failed');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });

    it('should replace previous error message', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setError('First error');
      });

      expect(result.current.error).toBe('First error');

      act(() => {
        result.current.setError('Second error');
      });

      expect(result.current.error).toBe('Second error');
    });

    it('should maintain other state when setting error', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setOperations([mockOperation]);
        result.current.setLoading(true);
      });

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.operations).toHaveLength(1);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe('Test error');
    });
  });

  // ============================================
  // COMPLEX STATE INTERACTIONS
  // ============================================

  describe('Complex State Interactions', () => {
    it('should handle loading operations then setting them', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.operations).toHaveLength(0);

      act(() => {
        result.current.setOperations([mockOperation, mockOperation2]);
        result.current.setLoading(false);
      });

      expect(result.current.operations).toHaveLength(2);
      expect(result.current.loading).toBe(false);
    });

    it('should handle operation selection during loading', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setLoading(true);
      });

      act(() => {
        result.current.setSelectedOperation(mockOperation);
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.selectedOperation).toEqual(mockOperation);
    });

    it('should handle error state with operations', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setOperations([mockOperation]);
        result.current.setError('Failed to fetch');
        result.current.setLoading(false);
      });

      expect(result.current.operations).toHaveLength(1);
      expect(result.current.error).toBe('Failed to fetch');
      expect(result.current.loading).toBe(false);
    });

    it('should clear error but maintain operations', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setOperations([mockOperation, mockOperation2]);
        result.current.setError('Test error');
      });

      expect(result.current.operations).toHaveLength(2);
      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.operations).toHaveLength(2);
      expect(result.current.error).toBeNull();
    });

    it('should maintain all state during filter changes', () => {
      const { result } = renderHook(() => useOperationStore());

      act(() => {
        result.current.setOperations([mockOperation]);
        result.current.setSelectedOperation(mockOperation);
        result.current.setLoading(false);
        result.current.setFilters({ operationType: 'MACHINE' });
      });

      const initialOps = result.current.operations.length;
      const initialSelected = result.current.selectedOperation;

      act(() => {
        result.current.setFilters({ operationType: 'ASSEMBLY' });
      });

      expect(result.current.operations).toHaveLength(initialOps);
      expect(result.current.selectedOperation).toEqual(initialSelected);
    });
  });

  // ============================================
  // SELECTOR HOOKS TESTS
  // ============================================

  describe('Selector Hooks', () => {
    it('should select operations without unnecessary re-renders', () => {
      const { result: result1 } = renderHook(() =>
        useOperationStore((state) => state.operations)
      );
      const { result: result2 } = renderHook(() =>
        useOperationStore((state) => state.operations)
      );

      act(() => {
        useOperationStore.setState({ operations: [mockOperation] });
      });

      expect(result1.current).toEqual(result2.current);
    });

    it('should select loading state independently', () => {
      const { result } = renderHook(() =>
        useOperationStore((state) => state.loading)
      );

      act(() => {
        useOperationStore.setState({ operations: [mockOperation] });
      });

      expect(result.current).toBe(false);

      act(() => {
        useOperationStore.setState({ loading: true });
      });

      expect(result.current).toBe(true);
    });

    it('should select error state independently', () => {
      const { result } = renderHook(() =>
        useOperationStore((state) => state.error)
      );

      expect(result.current).toBeNull();

      act(() => {
        useOperationStore.setState({ error: 'Test error' });
      });

      expect(result.current).toBe('Test error');
    });
  });
});
