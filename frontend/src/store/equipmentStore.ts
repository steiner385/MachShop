/**
 * Equipment Store
 * Phase 3: Equipment Maintenance Scheduling State Management
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Equipment,
  MaintenanceRecord,
  EquipmentStateHistory,
  EquipmentStatistics,
  OEEMetrics,
  EquipmentQueryParams,
  MaintenanceQueryParams,
} from '@/types/equipment';
import {
  equipmentAPI,
  maintenanceAPI,
  oeeAPI,
  equipmentStateAPI,
  getEquipmentDashboard,
  getMaintenanceCalendar,
} from '@/api/equipment';

// ============================================
// STATE INTERFACE
// ============================================

interface EquipmentState {
  // Equipment
  equipment: Equipment[];
  currentEquipment: Equipment | null;
  equipmentLoading: boolean;
  equipmentError: string | null;

  // Maintenance Records
  maintenanceRecords: MaintenanceRecord[];
  currentMaintenance: MaintenanceRecord | null;
  maintenanceLoading: boolean;
  maintenanceError: string | null;

  // OEE Metrics
  oeeMetrics: OEEMetrics | null;
  oeeHistory: OEEMetrics[];
  oeeSummary: { equipmentId: string; equipmentNumber: string; equipmentName: string; oee: OEEMetrics }[];
  oeeLoading: boolean;
  oeeError: string | null;

  // State History
  stateHistory: EquipmentStateHistory[];
  stateHistoryLoading: boolean;
  stateHistoryError: string | null;

  // Statistics
  statistics: EquipmentStatistics | null;
  statisticsLoading: boolean;
  statisticsError: string | null;

  // Dashboard data
  upcomingMaintenance: MaintenanceRecord[];
  overdueMaintenance: MaintenanceRecord[];
  criticalEquipment: Equipment[];

  // Filters and pagination
  equipmentFilters: EquipmentQueryParams;
  maintenanceFilters: MaintenanceQueryParams;
  searchText: string;
}

// ============================================
// ACTIONS INTERFACE
// ============================================

interface EquipmentActions {
  // Equipment
  fetchEquipment: (params?: EquipmentQueryParams) => Promise<void>;
  fetchEquipmentById: (id: string, includeRelations?: boolean) => Promise<void>;
  fetchEquipmentByNumber: (equipmentNumber: string, includeRelations?: boolean) => Promise<void>;
  fetchEquipmentHierarchy: (id: string) => Promise<void>;
  fetchChildEquipment: (id: string) => Promise<void>;
  fetchEquipmentBySite: (siteId: string) => Promise<void>;
  fetchEquipmentByArea: (areaId: string) => Promise<void>;
  fetchEquipmentByWorkCenter: (workCenterId: string) => Promise<void>;
  setEquipmentFilters: (filters: Partial<EquipmentQueryParams>) => void;
  clearEquipmentFilters: () => void;

  // Maintenance
  fetchMaintenance: (params?: MaintenanceQueryParams) => Promise<void>;
  fetchMaintenanceById: (id: string, includeRelations?: boolean) => Promise<void>;
  fetchMaintenanceByEquipment: (equipmentId: string, params?: MaintenanceQueryParams) => Promise<void>;
  fetchScheduledMaintenance: (startDate?: string, endDate?: string) => Promise<void>;
  fetchOverdueMaintenance: () => Promise<void>;
  fetchUpcomingMaintenance: (days?: number) => Promise<void>;
  createMaintenance: (data: Partial<MaintenanceRecord>) => Promise<void>;
  updateMaintenance: (id: string, data: Partial<MaintenanceRecord>) => Promise<void>;
  completeMaintenance: (id: string, data: { completedDate: string; performedBy?: string; notes?: string; duration?: number; cost?: number }) => Promise<void>;
  cancelMaintenance: (id: string, reason?: string) => Promise<void>;
  setMaintenanceFilters: (filters: Partial<MaintenanceQueryParams>) => void;
  clearMaintenanceFilters: () => void;

  // OEE
  fetchOEEMetrics: (equipmentId: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchOEEHistory: (equipmentId: string, startDate?: string, endDate?: string) => Promise<void>;
  fetchOEESummary: (startDate?: string, endDate?: string) => Promise<void>;

  // State History
  fetchStateHistory: (equipmentId: string, startDate?: string, endDate?: string) => Promise<void>;
  updateEquipmentState: (equipmentId: string, data: { newState: string; reason?: string; changedBy?: string }) => Promise<void>;

  // Statistics
  fetchStatistics: () => Promise<void>;

  // Dashboard
  fetchDashboard: () => Promise<void>;
  fetchMaintenanceCalendar: (startDate: string, endDate: string) => Promise<void>;

  // Search
  setSearchText: (text: string) => void;

  // Utility
  clearErrors: () => void;
  reset: () => void;
}

// ============================================
// STORE TYPE
// ============================================

type EquipmentStore = EquipmentState & EquipmentActions;

// ============================================
// INITIAL STATE
// ============================================

const initialState: EquipmentState = {
  // Equipment
  equipment: [],
  currentEquipment: null,
  equipmentLoading: false,
  equipmentError: null,

  // Maintenance Records
  maintenanceRecords: [],
  currentMaintenance: null,
  maintenanceLoading: false,
  maintenanceError: null,

  // OEE Metrics
  oeeMetrics: null,
  oeeHistory: [],
  oeeSummary: [],
  oeeLoading: false,
  oeeError: null,

  // State History
  stateHistory: [],
  stateHistoryLoading: false,
  stateHistoryError: null,

  // Statistics
  statistics: null,
  statisticsLoading: false,
  statisticsError: null,

  // Dashboard data
  upcomingMaintenance: [],
  overdueMaintenance: [],
  criticalEquipment: [],

  // Filters
  equipmentFilters: {},
  maintenanceFilters: {},
  searchText: '',
};

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useEquipmentStore = create<EquipmentStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ============================================
      // EQUIPMENT
      // ============================================

      fetchEquipment: async (params?: EquipmentQueryParams) => {
        set({ equipmentLoading: true, equipmentError: null });
        try {
          const filters = params || get().equipmentFilters;
          const response = await equipmentAPI.getAllEquipment(filters);

          if (response.success && response.data) {
            set({ equipment: response.data, equipmentLoading: false });
          } else {
            set({ equipmentError: response.error || 'Failed to fetch equipment', equipmentLoading: false });
          }
        } catch (error) {
          console.error('[EquipmentStore] fetchEquipment error:', error);
          set({
            equipmentError: error instanceof Error ? error.message : 'Network error while fetching equipment',
            equipmentLoading: false
          });
        }
      },

      fetchEquipmentById: async (id: string, includeRelations: boolean = true) => {
        set({ equipmentLoading: true, equipmentError: null });
        const response = await equipmentAPI.getEquipmentById(id, includeRelations);

        if (response.success && response.data) {
          set({ currentEquipment: response.data, equipmentLoading: false });
        } else {
          set({ equipmentError: response.error || 'Failed to fetch equipment', equipmentLoading: false });
        }
      },

      fetchEquipmentByNumber: async (equipmentNumber: string, includeRelations: boolean = true) => {
        set({ equipmentLoading: true, equipmentError: null });
        const response = await equipmentAPI.getEquipmentByNumber(equipmentNumber, includeRelations);

        if (response.success && response.data) {
          set({ currentEquipment: response.data, equipmentLoading: false });
        } else {
          set({ equipmentError: response.error || 'Failed to fetch equipment', equipmentLoading: false });
        }
      },

      fetchEquipmentHierarchy: async (id: string) => {
        set({ equipmentLoading: true, equipmentError: null });
        const response = await equipmentAPI.getEquipmentHierarchy(id);

        if (response.success && response.data) {
          set({ equipment: response.data, equipmentLoading: false });
        } else {
          set({ equipmentError: response.error || 'Failed to fetch hierarchy', equipmentLoading: false });
        }
      },

      fetchChildEquipment: async (id: string) => {
        set({ equipmentLoading: true, equipmentError: null });
        const response = await equipmentAPI.getChildEquipment(id);

        if (response.success && response.data) {
          set({ equipment: response.data, equipmentLoading: false });
        } else {
          set({ equipmentError: response.error || 'Failed to fetch child equipment', equipmentLoading: false });
        }
      },

      fetchEquipmentBySite: async (siteId: string) => {
        set({ equipmentLoading: true, equipmentError: null });
        const response = await equipmentAPI.getEquipmentBySite(siteId);

        if (response.success && response.data) {
          set({ equipment: response.data, equipmentLoading: false });
        } else {
          set({ equipmentError: response.error || 'Failed to fetch equipment by site', equipmentLoading: false });
        }
      },

      fetchEquipmentByArea: async (areaId: string) => {
        set({ equipmentLoading: true, equipmentError: null });
        const response = await equipmentAPI.getEquipmentByArea(areaId);

        if (response.success && response.data) {
          set({ equipment: response.data, equipmentLoading: false });
        } else {
          set({ equipmentError: response.error || 'Failed to fetch equipment by area', equipmentLoading: false });
        }
      },

      fetchEquipmentByWorkCenter: async (workCenterId: string) => {
        set({ equipmentLoading: true, equipmentError: null });
        const response = await equipmentAPI.getEquipmentByWorkCenter(workCenterId);

        if (response.success && response.data) {
          set({ equipment: response.data, equipmentLoading: false });
        } else {
          set({ equipmentError: response.error || 'Failed to fetch equipment by work center', equipmentLoading: false });
        }
      },

      setEquipmentFilters: (filters: Partial<EquipmentQueryParams>) => {
        set({ equipmentFilters: { ...get().equipmentFilters, ...filters } });
      },

      clearEquipmentFilters: () => {
        set({ equipmentFilters: {} });
      },

      // ============================================
      // MAINTENANCE
      // ============================================

      fetchMaintenance: async (params?: MaintenanceQueryParams) => {
        set({ maintenanceLoading: true, maintenanceError: null });
        try {
          const filters = params || get().maintenanceFilters;
          const response = await maintenanceAPI.getAllMaintenance(filters);

          if (response.success && response.data) {
            set({ maintenanceRecords: response.data, maintenanceLoading: false });
          } else {
            set({ maintenanceError: response.error || 'Failed to fetch maintenance records', maintenanceLoading: false });
          }
        } catch (error) {
          console.error('[EquipmentStore] fetchMaintenance error:', error);
          set({
            maintenanceError: error instanceof Error ? error.message : 'Network error while fetching maintenance records',
            maintenanceLoading: false
          });
        }
      },

      fetchMaintenanceById: async (id: string, includeRelations: boolean = true) => {
        set({ maintenanceLoading: true, maintenanceError: null });
        const response = await maintenanceAPI.getMaintenanceById(id, includeRelations);

        if (response.success && response.data) {
          set({ currentMaintenance: response.data, maintenanceLoading: false });
        } else {
          set({ maintenanceError: response.error || 'Failed to fetch maintenance record', maintenanceLoading: false });
        }
      },

      fetchMaintenanceByEquipment: async (equipmentId: string, params?: MaintenanceQueryParams) => {
        set({ maintenanceLoading: true, maintenanceError: null });
        const response = await maintenanceAPI.getMaintenanceByEquipment(equipmentId, params);

        if (response.success && response.data) {
          set({ maintenanceRecords: response.data, maintenanceLoading: false });
        } else {
          set({ maintenanceError: response.error || 'Failed to fetch maintenance records', maintenanceLoading: false });
        }
      },

      fetchScheduledMaintenance: async (startDate?: string, endDate?: string) => {
        set({ maintenanceLoading: true, maintenanceError: null });
        const response = await maintenanceAPI.getScheduledMaintenance(startDate, endDate);

        if (response.success && response.data) {
          set({ maintenanceRecords: response.data, maintenanceLoading: false });
        } else {
          set({ maintenanceError: response.error || 'Failed to fetch scheduled maintenance', maintenanceLoading: false });
        }
      },

      fetchOverdueMaintenance: async () => {
        set({ maintenanceLoading: true, maintenanceError: null });
        const response = await maintenanceAPI.getOverdueMaintenance();

        if (response.success && response.data) {
          set({ overdueMaintenance: response.data, maintenanceLoading: false });
        } else {
          set({ maintenanceError: response.error || 'Failed to fetch overdue maintenance', maintenanceLoading: false });
        }
      },

      fetchUpcomingMaintenance: async (days: number = 30) => {
        set({ maintenanceLoading: true, maintenanceError: null });
        const response = await maintenanceAPI.getUpcomingMaintenance(days);

        if (response.success && response.data) {
          set({ upcomingMaintenance: response.data, maintenanceLoading: false });
        } else {
          set({ maintenanceError: response.error || 'Failed to fetch upcoming maintenance', maintenanceLoading: false });
        }
      },

      createMaintenance: async (data: Partial<MaintenanceRecord>) => {
        set({ maintenanceLoading: true, maintenanceError: null });
        const response = await maintenanceAPI.createMaintenance(data);

        if (response.success && response.data) {
          set({
            currentMaintenance: response.data,
            maintenanceRecords: [...get().maintenanceRecords, response.data],
            maintenanceLoading: false,
          });
        } else {
          set({ maintenanceError: response.error || 'Failed to create maintenance record', maintenanceLoading: false });
        }
      },

      updateMaintenance: async (id: string, data: Partial<MaintenanceRecord>) => {
        set({ maintenanceLoading: true, maintenanceError: null });
        const response = await maintenanceAPI.updateMaintenance(id, data);

        if (response.success && response.data) {
          set({
            currentMaintenance: response.data,
            maintenanceRecords: get().maintenanceRecords.map((record) =>
              record.id === id ? response.data! : record
            ),
            maintenanceLoading: false,
          });
        } else {
          set({ maintenanceError: response.error || 'Failed to update maintenance record', maintenanceLoading: false });
        }
      },

      completeMaintenance: async (
        id: string,
        data: { completedDate: string; performedBy?: string; notes?: string; duration?: number; cost?: number }
      ) => {
        set({ maintenanceLoading: true, maintenanceError: null });
        const response = await maintenanceAPI.completeMaintenance(id, data);

        if (response.success && response.data) {
          set({
            currentMaintenance: response.data,
            maintenanceRecords: get().maintenanceRecords.map((record) =>
              record.id === id ? response.data! : record
            ),
            maintenanceLoading: false,
          });
        } else {
          set({ maintenanceError: response.error || 'Failed to complete maintenance record', maintenanceLoading: false });
        }
      },

      cancelMaintenance: async (id: string, reason?: string) => {
        set({ maintenanceLoading: true, maintenanceError: null });
        const response = await maintenanceAPI.cancelMaintenance(id, reason);

        if (response.success && response.data) {
          set({
            currentMaintenance: response.data,
            maintenanceRecords: get().maintenanceRecords.map((record) =>
              record.id === id ? response.data! : record
            ),
            maintenanceLoading: false,
          });
        } else {
          set({ maintenanceError: response.error || 'Failed to cancel maintenance record', maintenanceLoading: false });
        }
      },

      setMaintenanceFilters: (filters: Partial<MaintenanceQueryParams>) => {
        set({ maintenanceFilters: { ...get().maintenanceFilters, ...filters } });
      },

      clearMaintenanceFilters: () => {
        set({ maintenanceFilters: {} });
      },

      // ============================================
      // OEE
      // ============================================

      fetchOEEMetrics: async (equipmentId: string, startDate?: string, endDate?: string) => {
        set({ oeeLoading: true, oeeError: null });
        const response = await oeeAPI.getOEEMetrics(equipmentId, startDate, endDate);

        if (response.success && response.data) {
          set({ oeeMetrics: response.data, oeeLoading: false });
        } else {
          set({ oeeError: response.error || 'Failed to fetch OEE metrics', oeeLoading: false });
        }
      },

      fetchOEEHistory: async (equipmentId: string, startDate?: string, endDate?: string) => {
        set({ oeeLoading: true, oeeError: null });
        const response = await oeeAPI.getOEEHistory(equipmentId, startDate, endDate);

        if (response.success && response.data) {
          set({ oeeHistory: response.data, oeeLoading: false });
        } else {
          set({ oeeError: response.error || 'Failed to fetch OEE history', oeeLoading: false });
        }
      },

      fetchOEESummary: async (startDate?: string, endDate?: string) => {
        set({ oeeLoading: true, oeeError: null });
        const response = await oeeAPI.getOEESummary(startDate, endDate);

        if (response.success && response.data) {
          set({ oeeSummary: response.data, oeeLoading: false });
        } else {
          set({ oeeError: response.error || 'Failed to fetch OEE summary', oeeLoading: false });
        }
      },

      // ============================================
      // STATE HISTORY
      // ============================================

      fetchStateHistory: async (equipmentId: string, startDate?: string, endDate?: string) => {
        set({ stateHistoryLoading: true, stateHistoryError: null });
        const response = await equipmentStateAPI.getStateHistory(equipmentId, startDate, endDate);

        if (response.success && response.data) {
          set({ stateHistory: response.data, stateHistoryLoading: false });
        } else {
          set({ stateHistoryError: response.error || 'Failed to fetch state history', stateHistoryLoading: false });
        }
      },

      updateEquipmentState: async (
        equipmentId: string,
        data: { newState: string; reason?: string; changedBy?: string }
      ) => {
        set({ equipmentLoading: true, equipmentError: null });
        const response = await equipmentStateAPI.updateEquipmentState(equipmentId, data);

        if (response.success && response.data) {
          set({
            currentEquipment: response.data,
            equipment: get().equipment.map((equip) =>
              equip.id === equipmentId ? response.data! : equip
            ),
            equipmentLoading: false,
          });
        } else {
          set({ equipmentError: response.error || 'Failed to update equipment state', equipmentLoading: false });
        }
      },

      // ============================================
      // STATISTICS
      // ============================================

      fetchStatistics: async () => {
        set({ statisticsLoading: true, statisticsError: null });
        const response = await equipmentAPI.getEquipmentStatistics();

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
          equipmentLoading: true,
          maintenanceLoading: true,
          statisticsLoading: true,
          equipmentError: null,
          maintenanceError: null,
          statisticsError: null,
        });

        const response = await getEquipmentDashboard();

        if (response.success && response.data) {
          set({
            statistics: response.data.statistics,
            upcomingMaintenance: response.data.upcomingMaintenance,
            overdueMaintenance: response.data.overdueMaintenance,
            criticalEquipment: response.data.criticalEquipment,
            equipmentLoading: false,
            maintenanceLoading: false,
            statisticsLoading: false,
          });
        } else {
          set({
            equipmentError: response.error || 'Failed to fetch dashboard data',
            maintenanceError: response.error || 'Failed to fetch dashboard data',
            statisticsError: response.error || 'Failed to fetch dashboard data',
            equipmentLoading: false,
            maintenanceLoading: false,
            statisticsLoading: false,
          });
        }
      },

      fetchMaintenanceCalendar: async (startDate: string, endDate: string) => {
        set({ maintenanceLoading: true, maintenanceError: null });
        const response = await getMaintenanceCalendar(startDate, endDate);

        if (response.success && response.data) {
          set({ maintenanceRecords: response.data, maintenanceLoading: false });
        } else {
          set({ maintenanceError: response.error || 'Failed to fetch maintenance calendar', maintenanceLoading: false });
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
          equipmentError: null,
          maintenanceError: null,
          oeeError: null,
          stateHistoryError: null,
          statisticsError: null,
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    { name: 'EquipmentStore' }
  )
);
