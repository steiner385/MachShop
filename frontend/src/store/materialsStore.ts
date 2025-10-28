/**
 * Materials Store
 * Phase 3: Material Movement Tracking State Management
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  MaterialDefinition,
  MaterialLot,
  MaterialClass,
  MaterialTransaction,
  MaterialStatistics,
  MaterialQueryParams,
  MaterialLotQueryParams,
  MaterialTransactionQueryParams,
} from '@/types/materials';
import {
  materialClassAPI,
  materialDefinitionAPI,
  materialLotAPI,
  materialTransactionAPI,
  getMaterialsDashboard,
} from '@/api/materials';

// ============================================
// STATE INTERFACE
// ============================================

interface MaterialsState {
  // Material Definitions
  definitions: MaterialDefinition[];
  currentDefinition: MaterialDefinition | null;
  definitionsLoading: boolean;
  definitionsError: string | null;

  // Material Lots
  lots: MaterialLot[];
  currentLot: MaterialLot | null;
  lotsLoading: boolean;
  lotsError: string | null;

  // Material Classes
  classes: MaterialClass[];
  currentClass: MaterialClass | null;
  classesLoading: boolean;
  classesError: string | null;

  // Transactions
  transactions: MaterialTransaction[];
  currentTransaction: MaterialTransaction | null;
  transactionsLoading: boolean;
  transactionsError: string | null;

  // Statistics
  statistics: MaterialStatistics | null;
  statisticsLoading: boolean;
  statisticsError: string | null;

  // Dashboard data
  expiringSoon: MaterialLot[];
  lowStock: MaterialDefinition[];
  recentTransactions: MaterialTransaction[];

  // Filters and pagination
  definitionFilters: MaterialQueryParams;
  lotFilters: MaterialLotQueryParams;
  transactionFilters: MaterialTransactionQueryParams;
  searchText: string;
}

// ============================================
// ACTIONS INTERFACE
// ============================================

interface MaterialsActions {
  // Material Definitions
  fetchDefinitions: (params?: MaterialQueryParams) => Promise<void>;
  fetchDefinitionById: (id: string, includeRelations?: boolean) => Promise<void>;
  fetchDefinitionByNumber: (materialNumber: string, includeRelations?: boolean) => Promise<void>;
  setDefinitionFilters: (filters: Partial<MaterialQueryParams>) => void;
  clearDefinitionFilters: () => void;

  // Material Lots
  fetchLots: (params?: MaterialLotQueryParams) => Promise<void>;
  fetchLotById: (id: string, includeRelations?: boolean) => Promise<void>;
  fetchLotByNumber: (lotNumber: string, includeRelations?: boolean) => Promise<void>;
  fetchExpiringSoon: (days?: number) => Promise<void>;
  fetchExpired: () => Promise<void>;
  setLotFilters: (filters: Partial<MaterialLotQueryParams>) => void;
  clearLotFilters: () => void;

  // Material Classes
  fetchClasses: (includeRelations?: boolean) => Promise<void>;
  fetchClassById: (id: string, includeRelations?: boolean) => Promise<void>;
  fetchClassHierarchy: (id: string) => Promise<void>;
  fetchChildClasses: (id: string) => Promise<void>;

  // Transactions
  fetchTransactions: (params?: MaterialTransactionQueryParams) => Promise<void>;
  fetchTransactionById: (id: string, includeRelations?: boolean) => Promise<void>;
  fetchTransactionsByMaterial: (materialId: string, params?: MaterialTransactionQueryParams) => Promise<void>;
  fetchTransactionsByLot: (lotId: string, params?: MaterialTransactionQueryParams) => Promise<void>;
  setTransactionFilters: (filters: Partial<MaterialTransactionQueryParams>) => void;
  clearTransactionFilters: () => void;

  // Statistics
  fetchStatistics: () => Promise<void>;

  // Dashboard
  fetchDashboard: () => Promise<void>;

  // Search
  setSearchText: (text: string) => void;

  // Utility
  clearErrors: () => void;
  reset: () => void;
}

// ============================================
// STORE TYPE
// ============================================

type MaterialsStore = MaterialsState & MaterialsActions;

// ============================================
// INITIAL STATE
// ============================================

const initialState: MaterialsState = {
  // Material Definitions
  definitions: [],
  currentDefinition: null,
  definitionsLoading: false,
  definitionsError: null,

  // Material Lots
  lots: [],
  currentLot: null,
  lotsLoading: false,
  lotsError: null,

  // Material Classes
  classes: [],
  currentClass: null,
  classesLoading: false,
  classesError: null,

  // Transactions
  transactions: [],
  currentTransaction: null,
  transactionsLoading: false,
  transactionsError: null,

  // Statistics
  statistics: null,
  statisticsLoading: false,
  statisticsError: null,

  // Dashboard data
  expiringSoon: [],
  lowStock: [],
  recentTransactions: [],

  // Filters
  definitionFilters: {},
  lotFilters: {},
  transactionFilters: {},
  searchText: '',
};

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useMaterialsStore = create<MaterialsStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ============================================
      // MATERIAL DEFINITIONS
      // ============================================

      fetchDefinitions: async (params?: MaterialQueryParams) => {
        set({ definitionsLoading: true, definitionsError: null });
        try {
          const filters = params || get().definitionFilters;
          const response = await materialDefinitionAPI.getAllDefinitions(filters);

          if (response.success && response.data) {
            set({ definitions: response.data, definitionsLoading: false });
          } else {
            set({ definitionsError: response.error || 'Failed to fetch definitions', definitionsLoading: false });
          }
        } catch (error) {
          console.error('[MaterialsStore] fetchDefinitions error:', error);
          set({
            definitionsError: error instanceof Error ? error.message : 'Network error while fetching definitions',
            definitionsLoading: false
          });
        }
      },

      fetchDefinitionById: async (id: string, includeRelations: boolean = true) => {
        set({ definitionsLoading: true, definitionsError: null });
        try {
          const response = await materialDefinitionAPI.getDefinitionById(id, includeRelations);

          if (response.success && response.data) {
            set({ currentDefinition: response.data, definitionsLoading: false });
          } else {
            set({ definitionsError: response.error || 'Failed to fetch definition', definitionsLoading: false });
          }
        } catch (error) {
          console.error('[MaterialsStore] fetchDefinitionById error:', error);
          set({
            definitionsError: error instanceof Error ? error.message : 'Network error while fetching definition',
            definitionsLoading: false
          });
        }
      },

      fetchDefinitionByNumber: async (materialNumber: string, includeRelations: boolean = true) => {
        set({ definitionsLoading: true, definitionsError: null });
        try {
          const response = await materialDefinitionAPI.getDefinitionByNumber(materialNumber, includeRelations);

          if (response.success && response.data) {
            set({ currentDefinition: response.data, definitionsLoading: false });
          } else {
            set({ definitionsError: response.error || 'Failed to fetch definition', definitionsLoading: false });
          }
        } catch (error) {
          console.error('[MaterialsStore] fetchDefinitionByNumber error:', error);
          set({
            definitionsError: error instanceof Error ? error.message : 'Network error while fetching definition',
            definitionsLoading: false
          });
        }
      },

      setDefinitionFilters: (filters: Partial<MaterialQueryParams>) => {
        set({ definitionFilters: { ...get().definitionFilters, ...filters } });
      },

      clearDefinitionFilters: () => {
        set({ definitionFilters: {} });
      },

      // ============================================
      // MATERIAL LOTS
      // ============================================

      fetchLots: async (params?: MaterialLotQueryParams) => {
        set({ lotsLoading: true, lotsError: null });
        try {
          const filters = params || get().lotFilters;
          const response = await materialLotAPI.getAllLots(filters);

          if (response.success && response.data) {
            set({ lots: response.data, lotsLoading: false });
          } else {
            set({ lotsError: response.error || 'Failed to fetch lots', lotsLoading: false });
          }
        } catch (error) {
          console.error('[MaterialsStore] fetchLots error:', error);
          set({
            lotsError: error instanceof Error ? error.message : 'Network error while fetching lots',
            lotsLoading: false
          });
        }
      },

      fetchLotById: async (id: string, includeRelations: boolean = true) => {
        set({ lotsLoading: true, lotsError: null });
        try {
          const response = await materialLotAPI.getLotById(id, includeRelations);

          if (response.success && response.data) {
            set({ currentLot: response.data, lotsLoading: false });
          } else {
            set({ lotsError: response.error || 'Failed to fetch lot', lotsLoading: false });
          }
        } catch (error) {
          console.error('[MaterialsStore] fetchLotById error:', error);
          set({
            lotsError: error instanceof Error ? error.message : 'Network error while fetching lot',
            lotsLoading: false
          });
        }
      },

      fetchLotByNumber: async (lotNumber: string, includeRelations: boolean = true) => {
        set({ lotsLoading: true, lotsError: null });
        const response = await materialLotAPI.getLotByNumber(lotNumber, includeRelations);

        if (response.success && response.data) {
          set({ currentLot: response.data, lotsLoading: false });
        } else {
          set({ lotsError: response.error || 'Failed to fetch lot', lotsLoading: false });
        }
      },

      fetchExpiringSoon: async (days: number = 30) => {
        set({ lotsLoading: true, lotsError: null });
        const response = await materialLotAPI.getExpiringSoon(days);

        if (response.success && response.data) {
          set({ expiringSoon: response.data, lotsLoading: false });
        } else {
          set({ lotsError: response.error || 'Failed to fetch expiring lots', lotsLoading: false });
        }
      },

      fetchExpired: async () => {
        set({ lotsLoading: true, lotsError: null });
        const response = await materialLotAPI.getExpired();

        if (response.success && response.data) {
          set({ lots: response.data, lotsLoading: false });
        } else {
          set({ lotsError: response.error || 'Failed to fetch expired lots', lotsLoading: false });
        }
      },

      setLotFilters: (filters: Partial<MaterialLotQueryParams>) => {
        set({ lotFilters: { ...get().lotFilters, ...filters } });
      },

      clearLotFilters: () => {
        set({ lotFilters: {} });
      },

      // ============================================
      // MATERIAL CLASSES
      // ============================================

      fetchClasses: async (includeRelations: boolean = false) => {
        set({ classesLoading: true, classesError: null });
        try {
          const response = await materialClassAPI.getAllClasses(includeRelations);

          if (response.success && response.data) {
            set({ classes: response.data, classesLoading: false });
          } else {
            set({ classesError: response.error || 'Failed to fetch classes', classesLoading: false });
          }
        } catch (error) {
          console.error('[MaterialsStore] fetchClasses error:', error);
          set({
            classesError: error instanceof Error ? error.message : 'Network error while fetching classes',
            classesLoading: false
          });
        }
      },

      fetchClassById: async (id: string, includeRelations: boolean = false) => {
        set({ classesLoading: true, classesError: null });
        const response = await materialClassAPI.getClassById(id, includeRelations);

        if (response.success && response.data) {
          set({ currentClass: response.data, classesLoading: false });
        } else {
          set({ classesError: response.error || 'Failed to fetch class', classesLoading: false });
        }
      },

      fetchClassHierarchy: async (id: string) => {
        set({ classesLoading: true, classesError: null });
        const response = await materialClassAPI.getClassHierarchy(id);

        if (response.success && response.data) {
          set({ classes: response.data, classesLoading: false });
        } else {
          set({ classesError: response.error || 'Failed to fetch hierarchy', classesLoading: false });
        }
      },

      fetchChildClasses: async (id: string) => {
        set({ classesLoading: true, classesError: null });
        const response = await materialClassAPI.getChildClasses(id);

        if (response.success && response.data) {
          set({ classes: response.data, classesLoading: false });
        } else {
          set({ classesError: response.error || 'Failed to fetch child classes', classesLoading: false });
        }
      },

      // ============================================
      // TRANSACTIONS
      // ============================================

      fetchTransactions: async (params?: MaterialTransactionQueryParams) => {
        set({ transactionsLoading: true, transactionsError: null });
        const filters = params || get().transactionFilters;
        const response = await materialTransactionAPI.getAllTransactions(filters);

        if (response.success && response.data) {
          set({ transactions: response.data, transactionsLoading: false });
        } else {
          set({ transactionsError: response.error || 'Failed to fetch transactions', transactionsLoading: false });
        }
      },

      fetchTransactionById: async (id: string, includeRelations: boolean = true) => {
        set({ transactionsLoading: true, transactionsError: null });
        const response = await materialTransactionAPI.getTransactionById(id, includeRelations);

        if (response.success && response.data) {
          set({ currentTransaction: response.data, transactionsLoading: false });
        } else {
          set({ transactionsError: response.error || 'Failed to fetch transaction', transactionsLoading: false });
        }
      },

      fetchTransactionsByMaterial: async (materialId: string, params?: MaterialTransactionQueryParams) => {
        set({ transactionsLoading: true, transactionsError: null });
        const response = await materialTransactionAPI.getTransactionsByMaterial(materialId, params);

        if (response.success && response.data) {
          set({ transactions: response.data, transactionsLoading: false });
        } else {
          set({ transactionsError: response.error || 'Failed to fetch transactions', transactionsLoading: false });
        }
      },

      fetchTransactionsByLot: async (lotId: string, params?: MaterialTransactionQueryParams) => {
        set({ transactionsLoading: true, transactionsError: null });
        const response = await materialTransactionAPI.getTransactionsByLot(lotId, params);

        if (response.success && response.data) {
          set({ transactions: response.data, transactionsLoading: false });
        } else {
          set({ transactionsError: response.error || 'Failed to fetch transactions', transactionsLoading: false });
        }
      },

      setTransactionFilters: (filters: Partial<MaterialTransactionQueryParams>) => {
        set({ transactionFilters: { ...get().transactionFilters, ...filters } });
      },

      clearTransactionFilters: () => {
        set({ transactionFilters: {} });
      },

      // ============================================
      // STATISTICS
      // ============================================

      fetchStatistics: async () => {
        set({ statisticsLoading: true, statisticsError: null });
        const response = await materialLotAPI.getLotStatistics();

        if (response.success && response.data) {
          set({ statistics: response.data, statisticsLoading: false });
        } else {
          set({ statisticsError: response.error || 'Failed to fetch statistics', statisticsLoading: false });
        }
      },

      // ============================================
      // DASHBOARD
      // ============================================

      fetchDashboard: async () => {
        set({
          definitionsLoading: true,
          lotsLoading: true,
          statisticsLoading: true,
          definitionsError: null,
          lotsError: null,
          statisticsError: null,
        });

        const response = await getMaterialsDashboard();

        if (response.success && response.data) {
          set({
            statistics: response.data.statistics,
            expiringSoon: response.data.expiringSoon,
            lowStock: response.data.lowStock,
            recentTransactions: response.data.recentTransactions,
            definitionsLoading: false,
            lotsLoading: false,
            statisticsLoading: false,
          });
        } else {
          set({
            definitionsError: response.error || 'Failed to fetch dashboard data',
            lotsError: response.error || 'Failed to fetch dashboard data',
            statisticsError: response.error || 'Failed to fetch dashboard data',
            definitionsLoading: false,
            lotsLoading: false,
            statisticsLoading: false,
          });
        }
      },

      // ============================================
      // SEARCH
      // ============================================

      setSearchText: (text: string) => {
        set({ searchText: text });
      },

      // ============================================
      // UTILITY
      // ============================================

      clearErrors: () => {
        set({
          definitionsError: null,
          lotsError: null,
          classesError: null,
          transactionsError: null,
          statisticsError: null,
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    { name: 'MaterialsStore' }
  )
);
