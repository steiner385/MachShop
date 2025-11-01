/**
 * Materials Store Tests
 * Issue #410: MaterialsStore, EquipmentStore, SchedulingStore tests
 *
 * Comprehensive test suite for MaterialsStore Zustand store
 * Coverage: Definitions, lots, classes, transactions, statistics, filters, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMaterialsStore } from '../materialsStore';
import type {
  MaterialDefinition,
  MaterialLot,
  MaterialClass,
  MaterialTransaction,
  MaterialStatistics,
  MaterialQueryParams,
  MaterialLotQueryParams,
  MaterialTransactionQueryParams,
} from '@/types/materials';

// ============================================
// MOCK DATA
// ============================================

const mockMaterialDefinition: MaterialDefinition = {
  id: 'mat-1',
  materialNumber: 'MAT001',
  description: 'Steel plate',
  materialClass: 'METAL',
  supplier: 'Steel Co',
  unitOfMeasure: 'KG',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMaterialLot: MaterialLot = {
  id: 'lot-1',
  lotNumber: 'LOT001',
  materialId: 'mat-1',
  quantity: 100,
  unitOfMeasure: 'KG',
  receivedDate: new Date(),
  expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  location: 'A1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMaterialClass: MaterialClass = {
  id: 'class-1',
  className: 'Metals',
  description: 'Metal materials',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMaterialTransaction: MaterialTransaction = {
  id: 'txn-1',
  materialId: 'mat-1',
  lotId: 'lot-1',
  transactionType: 'CONSUMPTION',
  quantity: 10,
  timestamp: new Date(),
  performedBy: 'user1',
};

const mockMaterialStatistics: MaterialStatistics = {
  totalMaterials: 50,
  totalLots: 150,
  totalValue: 50000,
  expiringCount: 5,
  expiredCount: 2,
  lowStockCount: 10,
};

// ============================================
// MOCK API
// ============================================

const mockMaterialAPI = {
  materialDefinitionAPI: {
    getAllDefinitions: vi.fn(),
    getDefinitionById: vi.fn(),
    getDefinitionByNumber: vi.fn(),
  },
  materialLotAPI: {
    getAllLots: vi.fn(),
    getLotById: vi.fn(),
    getLotByNumber: vi.fn(),
    getExpiringSoon: vi.fn(),
    getExpired: vi.fn(),
    getLotStatistics: vi.fn(),
  },
  materialClassAPI: {
    getAllClasses: vi.fn(),
    getClassById: vi.fn(),
    getClassHierarchy: vi.fn(),
    getChildClasses: vi.fn(),
  },
  materialTransactionAPI: {
    getAllTransactions: vi.fn(),
    getTransactionById: vi.fn(),
    getTransactionsByMaterial: vi.fn(),
    getTransactionsByLot: vi.fn(),
  },
  getMaterialsDashboard: vi.fn(),
};

vi.mock('@/api/materials', () => ({
  materialDefinitionAPI: mockMaterialAPI.materialDefinitionAPI,
  materialLotAPI: mockMaterialAPI.materialLotAPI,
  materialClassAPI: mockMaterialAPI.materialClassAPI,
  materialTransactionAPI: mockMaterialAPI.materialTransactionAPI,
  getMaterialsDashboard: mockMaterialAPI.getMaterialsDashboard,
}));

// ============================================
// TESTS
// ============================================

describe('MaterialsStore', () => {
  beforeEach(() => {
    useMaterialsStore.setState({
      definitions: [],
      currentDefinition: null,
      definitionsLoading: false,
      definitionsError: null,
      lots: [],
      currentLot: null,
      lotsLoading: false,
      lotsError: null,
      classes: [],
      currentClass: null,
      classesLoading: false,
      classesError: null,
      transactions: [],
      currentTransaction: null,
      transactionsLoading: false,
      transactionsError: null,
      statistics: null,
      statisticsLoading: false,
      statisticsError: null,
      expiringSoon: [],
      lowStock: [],
      recentTransactions: [],
      definitionFilters: {},
      lotFilters: {},
      transactionFilters: {},
      searchText: '',
    });
    vi.clearAllMocks();
  });

  // ============================================
  // MATERIAL DEFINITIONS TESTS
  // ============================================

  describe('Material Definitions', () => {
    it('should fetch all definitions successfully', async () => {
      mockMaterialAPI.materialDefinitionAPI.getAllDefinitions.mockResolvedValue({
        success: true,
        data: [mockMaterialDefinition],
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchDefinitions();
      });

      expect(result.current.definitions).toHaveLength(1);
      expect(result.current.definitions[0].materialNumber).toBe('MAT001');
      expect(result.current.definitionsLoading).toBe(false);
    });

    it('should fetch definition by ID', async () => {
      mockMaterialAPI.materialDefinitionAPI.getDefinitionById.mockResolvedValue({
        success: true,
        data: mockMaterialDefinition,
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchDefinitionById('mat-1');
      });

      expect(result.current.currentDefinition).toEqual(mockMaterialDefinition);
      expect(result.current.definitionsLoading).toBe(false);
    });

    it('should fetch definition by number', async () => {
      mockMaterialAPI.materialDefinitionAPI.getDefinitionByNumber.mockResolvedValue({
        success: true,
        data: mockMaterialDefinition,
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchDefinitionByNumber('MAT001');
      });

      expect(result.current.currentDefinition).toEqual(mockMaterialDefinition);
    });

    it('should set and clear definition filters', () => {
      const { result } = renderHook(() => useMaterialsStore());

      act(() => {
        result.current.setDefinitionFilters({ supplier: 'Steel Co' });
      });

      expect(result.current.definitionFilters.supplier).toBe('Steel Co');

      act(() => {
        result.current.clearDefinitionFilters();
      });

      expect(result.current.definitionFilters).toEqual({});
    });

    it('should handle definition fetch error', async () => {
      const error = new Error('Network error');
      mockMaterialAPI.materialDefinitionAPI.getAllDefinitions.mockRejectedValue(error);
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        try {
          await result.current.fetchDefinitions();
        } catch {
          // Expected
        }
      });

      expect(result.current.definitionsError).toBe('Network error');
    });
  });

  // ============================================
  // MATERIAL LOTS TESTS
  // ============================================

  describe('Material Lots', () => {
    it('should fetch all lots successfully', async () => {
      mockMaterialAPI.materialLotAPI.getAllLots.mockResolvedValue({
        success: true,
        data: [mockMaterialLot],
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchLots();
      });

      expect(result.current.lots).toHaveLength(1);
      expect(result.current.lots[0].lotNumber).toBe('LOT001');
      expect(result.current.lotsLoading).toBe(false);
    });

    it('should fetch lot by ID', async () => {
      mockMaterialAPI.materialLotAPI.getLotById.mockResolvedValue({
        success: true,
        data: mockMaterialLot,
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchLotById('lot-1');
      });

      expect(result.current.currentLot).toEqual(mockMaterialLot);
    });

    it('should fetch lot by number', async () => {
      mockMaterialAPI.materialLotAPI.getLotByNumber.mockResolvedValue({
        success: true,
        data: mockMaterialLot,
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchLotByNumber('LOT001');
      });

      expect(result.current.currentLot).toEqual(mockMaterialLot);
    });

    it('should fetch expiring lots', async () => {
      mockMaterialAPI.materialLotAPI.getExpiringSoon.mockResolvedValue({
        success: true,
        data: [mockMaterialLot],
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchExpiringSoon(30);
      });

      expect(result.current.expiringSoon).toHaveLength(1);
      expect(result.current.lotsLoading).toBe(false);
    });

    it('should fetch expired lots', async () => {
      mockMaterialAPI.materialLotAPI.getExpired.mockResolvedValue({
        success: true,
        data: [],
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchExpired();
      });

      expect(result.current.lots).toHaveLength(0);
    });

    it('should set and clear lot filters', () => {
      const { result } = renderHook(() => useMaterialsStore());

      act(() => {
        result.current.setLotFilters({ location: 'A1' });
      });

      expect(result.current.lotFilters.location).toBe('A1');

      act(() => {
        result.current.clearLotFilters();
      });

      expect(result.current.lotFilters).toEqual({});
    });
  });

  // ============================================
  // MATERIAL CLASSES TESTS
  // ============================================

  describe('Material Classes', () => {
    it('should fetch all classes successfully', async () => {
      mockMaterialAPI.materialClassAPI.getAllClasses.mockResolvedValue({
        success: true,
        data: [mockMaterialClass],
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchClasses();
      });

      expect(result.current.classes).toHaveLength(1);
      expect(result.current.classesLoading).toBe(false);
    });

    it('should fetch class by ID', async () => {
      mockMaterialAPI.materialClassAPI.getClassById.mockResolvedValue({
        success: true,
        data: mockMaterialClass,
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchClassById('class-1');
      });

      expect(result.current.currentClass).toEqual(mockMaterialClass);
    });

    it('should fetch class hierarchy', async () => {
      mockMaterialAPI.materialClassAPI.getClassHierarchy.mockResolvedValue({
        success: true,
        data: [mockMaterialClass],
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchClassHierarchy('class-1');
      });

      expect(result.current.classes).toHaveLength(1);
    });

    it('should fetch child classes', async () => {
      mockMaterialAPI.materialClassAPI.getChildClasses.mockResolvedValue({
        success: true,
        data: [mockMaterialClass],
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchChildClasses('class-1');
      });

      expect(result.current.classes).toHaveLength(1);
    });
  });

  // ============================================
  // MATERIAL TRANSACTIONS TESTS
  // ============================================

  describe('Material Transactions', () => {
    it('should fetch all transactions successfully', async () => {
      mockMaterialAPI.materialTransactionAPI.getAllTransactions.mockResolvedValue({
        success: true,
        data: [mockMaterialTransaction],
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchTransactions();
      });

      expect(result.current.transactions).toHaveLength(1);
      expect(result.current.transactionsLoading).toBe(false);
    });

    it('should fetch transaction by ID', async () => {
      mockMaterialAPI.materialTransactionAPI.getTransactionById.mockResolvedValue({
        success: true,
        data: mockMaterialTransaction,
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchTransactionById('txn-1');
      });

      expect(result.current.currentTransaction).toEqual(mockMaterialTransaction);
    });

    it('should fetch transactions by material', async () => {
      mockMaterialAPI.materialTransactionAPI.getTransactionsByMaterial.mockResolvedValue({
        success: true,
        data: [mockMaterialTransaction],
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchTransactionsByMaterial('mat-1');
      });

      expect(result.current.transactions).toHaveLength(1);
    });

    it('should fetch transactions by lot', async () => {
      mockMaterialAPI.materialTransactionAPI.getTransactionsByLot.mockResolvedValue({
        success: true,
        data: [mockMaterialTransaction],
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchTransactionsByLot('lot-1');
      });

      expect(result.current.transactions).toHaveLength(1);
    });

    it('should set and clear transaction filters', () => {
      const { result } = renderHook(() => useMaterialsStore());

      act(() => {
        result.current.setTransactionFilters({ transactionType: 'CONSUMPTION' });
      });

      expect(result.current.transactionFilters.transactionType).toBe('CONSUMPTION');

      act(() => {
        result.current.clearTransactionFilters();
      });

      expect(result.current.transactionFilters).toEqual({});
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    it('should fetch statistics successfully', async () => {
      mockMaterialAPI.materialLotAPI.getLotStatistics.mockResolvedValue({
        success: true,
        data: mockMaterialStatistics,
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchStatistics();
      });

      expect(result.current.statistics).toEqual(mockMaterialStatistics);
      expect(result.current.statisticsLoading).toBe(false);
    });
  });

  // ============================================
  // DASHBOARD TESTS
  // ============================================

  describe('Dashboard', () => {
    it('should fetch dashboard data successfully', async () => {
      const dashboardData = {
        statistics: mockMaterialStatistics,
        expiringSoon: [mockMaterialLot],
        lowStock: [mockMaterialDefinition],
        recentTransactions: [mockMaterialTransaction],
      };

      mockMaterialAPI.getMaterialsDashboard.mockResolvedValue({
        success: true,
        data: dashboardData,
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchDashboard();
      });

      expect(result.current.statistics).toEqual(mockMaterialStatistics);
      expect(result.current.expiringSoon).toHaveLength(1);
      expect(result.current.lowStock).toHaveLength(1);
      expect(result.current.recentTransactions).toHaveLength(1);
      expect(result.current.definitionsLoading).toBe(false);
    });

    it('should handle dashboard error', async () => {
      mockMaterialAPI.getMaterialsDashboard.mockResolvedValue({
        success: false,
        error: 'Dashboard error',
      });
      const { result } = renderHook(() => useMaterialsStore());

      await act(async () => {
        await result.current.fetchDashboard();
      });

      expect(result.current.definitionsError).toBe('Dashboard error');
      expect(result.current.statisticsLoading).toBe(false);
    });
  });

  // ============================================
  // SEARCH TESTS
  // ============================================

  describe('Search', () => {
    it('should set search text', () => {
      const { result } = renderHook(() => useMaterialsStore());

      act(() => {
        result.current.setSearchText('steel');
      });

      expect(result.current.searchText).toBe('steel');
    });
  });

  // ============================================
  // UTILITY TESTS
  // ============================================

  describe('Utility', () => {
    it('should clear all errors', () => {
      const { result } = renderHook(() => useMaterialsStore());

      useMaterialsStore.setState({
        definitionsError: 'Def error',
        lotsError: 'Lots error',
        classesError: 'Class error',
        transactionsError: 'Txn error',
        statisticsError: 'Stats error',
      });

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.definitionsError).toBeNull();
      expect(result.current.lotsError).toBeNull();
      expect(result.current.classesError).toBeNull();
      expect(result.current.transactionsError).toBeNull();
      expect(result.current.statisticsError).toBeNull();
    });

    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useMaterialsStore());

      useMaterialsStore.setState({
        definitions: [mockMaterialDefinition],
        lots: [mockMaterialLot],
        searchText: 'test',
      });

      expect(result.current.definitions).toHaveLength(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.definitions).toHaveLength(0);
      expect(result.current.lots).toHaveLength(0);
      expect(result.current.searchText).toBe('');
    });
  });
});
