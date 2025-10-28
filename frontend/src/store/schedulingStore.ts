/**
 * Production Scheduling Zustand Store
 * Phase 2: Production Scheduling Dashboard
 *
 * Global state management for production scheduling operations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  schedulingAPI,
  scheduleEntryAPI,
  constraintAPI,
  stateAPI,
  sequencingAPI,
  dispatchAPI,
  statisticsAPI,
} from '@/api/scheduling';
import {
  ProductionSchedule,
  ScheduleEntry,
  ScheduleConstraint,
  ScheduleStateHistory,
  ScheduleStatistics,
  FeasibilityResult,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  CreateScheduleEntryRequest,
  UpdateScheduleEntryRequest,
  TransitionStateRequest,
  ScheduleQueryParams,
  ScheduleFilters,
} from '@/types/scheduling';

// ============================================
// STATE INTERFACE
// ============================================

interface SchedulingState {
  // List view state
  schedules: ProductionSchedule[];
  isLoading: boolean;
  error: string | null;
  filters: ScheduleFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Detail view state
  currentSchedule: ProductionSchedule | null;
  isLoadingDetail: boolean;
  detailError: string | null;

  // Entries state
  currentEntries: ScheduleEntry[];
  isLoadingEntries: boolean;
  entriesError: string | null;

  // Constraints state
  currentConstraints: ScheduleConstraint[];
  isLoadingConstraints: boolean;
  constraintsError: string | null;

  // State history
  stateHistory: ScheduleStateHistory[];
  isLoadingHistory: boolean;

  // Statistics
  statistics: ScheduleStatistics | null;
  isLoadingStatistics: boolean;

  // Feasibility
  feasibilityResult: FeasibilityResult | null;
  isLoadingFeasibility: boolean;

  // Dispatch-ready entries
  dispatchReadyEntries: ScheduleEntry[];
  isLoadingDispatchReady: boolean;
}

// ============================================
// ACTIONS INTERFACE
// ============================================

interface SchedulingActions {
  // List operations
  fetchSchedules: (params?: ScheduleQueryParams) => Promise<void>;
  setFilters: (filters: Partial<ScheduleFilters>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  refreshSchedules: () => Promise<void>;

  // CRUD operations
  fetchScheduleById: (id: string) => Promise<void>;
  fetchScheduleByNumber: (scheduleNumber: string) => Promise<void>;
  createSchedule: (data: CreateScheduleRequest) => Promise<ProductionSchedule>;
  updateSchedule: (id: string, data: UpdateScheduleRequest) => Promise<void>;
  deleteSchedule: (id: string, hardDelete?: boolean) => Promise<void>;
  fetchSchedulesByState: (state: string) => Promise<void>;

  // Entry operations
  fetchScheduleEntries: (scheduleId: string) => Promise<void>;
  createScheduleEntry: (scheduleId: string, data: CreateScheduleEntryRequest) => Promise<void>;
  updateScheduleEntry: (entryId: string, data: UpdateScheduleEntryRequest) => Promise<void>;
  cancelScheduleEntry: (entryId: string, reason: string, cancelledBy?: string) => Promise<void>;
  fetchDispatchReadyEntries: (siteId?: string) => Promise<void>;

  // Constraint operations
  fetchEntryConstraints: (entryId: string) => Promise<void>;
  createConstraint: (entryId: string, data: Partial<ScheduleConstraint>) => Promise<void>;
  updateConstraint: (constraintId: string, data: Partial<ScheduleConstraint>) => Promise<void>;
  resolveConstraint: (constraintId: string, resolvedBy: string, resolutionNotes: string) => Promise<void>;
  checkConstraintViolation: (constraintId: string) => Promise<void>;

  // State management
  transitionScheduleState: (scheduleId: string, data: TransitionStateRequest) => Promise<void>;
  fetchStateHistory: (scheduleId: string) => Promise<void>;

  // Sequencing operations
  applyPrioritySequencing: (scheduleId: string) => Promise<{ entriesAffected: number }>;
  applyEDDSequencing: (scheduleId: string) => Promise<{ entriesAffected: number }>;
  checkScheduleFeasibility: (scheduleId: string) => Promise<void>;

  // Dispatch operations
  dispatchScheduleEntry: (entryId: string, dispatchedBy: string) => Promise<{ entry: ScheduleEntry; workOrder: any }>;
  dispatchAllEntries: (scheduleId: string, dispatchedBy: string) => Promise<{ dispatchedCount: number }>;

  // Statistics
  fetchStatistics: () => Promise<void>;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  setDetailError: (error: string | null) => void;
  clearDetailError: () => void;

  // State clearing
  clearCurrentSchedule: () => void;
  clearCurrentEntries: () => void;
  clearCurrentConstraints: () => void;
}

type SchedulingStore = SchedulingState & SchedulingActions;

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_FILTERS: ScheduleFilters = {
  search: '',
  state: null,
  priority: null,
  siteId: null,
  isLocked: null,
  isFeasible: null,
};

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useSchedulingStore = create<SchedulingStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      schedules: [],
      isLoading: false,
      error: null,
      filters: DEFAULT_FILTERS,
      pagination: DEFAULT_PAGINATION,
      currentSchedule: null,
      isLoadingDetail: false,
      detailError: null,
      currentEntries: [],
      isLoadingEntries: false,
      entriesError: null,
      currentConstraints: [],
      isLoadingConstraints: false,
      constraintsError: null,
      stateHistory: [],
      isLoadingHistory: false,
      statistics: null,
      isLoadingStatistics: false,
      feasibilityResult: null,
      isLoadingFeasibility: false,
      dispatchReadyEntries: [],
      isLoadingDispatchReady: false,

      // ============================================
      // LIST OPERATIONS
      // ============================================

      fetchSchedules: async (params?: ScheduleQueryParams) => {
        try {
          set({ isLoading: true, error: null });

          const queryParams: ScheduleQueryParams = {
            ...params,
            includeRelations: params?.includeRelations ?? true,
          };

          const response = await schedulingAPI.getAllSchedules(queryParams);

          if (response.success && response.data) {
            set({
              schedules: response.data,
              isLoading: false,
            });
          } else {
            throw new Error(response.error || 'Failed to fetch schedules');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch schedules',
          });
          throw error;
        }
      },

      setFilters: (newFilters: Partial<ScheduleFilters>) => {
        const currentFilters = get().filters;
        const updatedFilters = { ...currentFilters, ...newFilters };
        set({ filters: updatedFilters, pagination: { ...get().pagination, page: 1 } });

        // Build query params from filters
        const queryParams: ScheduleQueryParams = {
          state: updatedFilters.state || undefined,
          priority: updatedFilters.priority || undefined,
          siteId: updatedFilters.siteId || undefined,
          isLocked: updatedFilters.isLocked === null ? undefined : updatedFilters.isLocked,
          isFeasible: updatedFilters.isFeasible === null ? undefined : updatedFilters.isFeasible,
        };

        get().fetchSchedules(queryParams);
      },

      clearFilters: () => {
        set({ filters: DEFAULT_FILTERS, pagination: { ...get().pagination, page: 1 } });
        get().fetchSchedules();
      },

      setPage: (page: number) => {
        const currentFilters = get().filters;
        const queryParams: ScheduleQueryParams = {
          state: currentFilters.state || undefined,
          priority: currentFilters.priority || undefined,
          siteId: currentFilters.siteId || undefined,
          isLocked: currentFilters.isLocked === null ? undefined : currentFilters.isLocked,
          isFeasible: currentFilters.isFeasible === null ? undefined : currentFilters.isFeasible,
          page,
        };

        set({ pagination: { ...get().pagination, page } });
        get().fetchSchedules(queryParams);
      },

      refreshSchedules: async () => {
        const currentFilters = get().filters;
        const queryParams: ScheduleQueryParams = {
          state: currentFilters.state || undefined,
          priority: currentFilters.priority || undefined,
          siteId: currentFilters.siteId || undefined,
          isLocked: currentFilters.isLocked === null ? undefined : currentFilters.isLocked,
          isFeasible: currentFilters.isFeasible === null ? undefined : currentFilters.isFeasible,
          page: get().pagination.page,
        };

        await get().fetchSchedules(queryParams);
      },

      // ============================================
      // CRUD OPERATIONS
      // ============================================

      fetchScheduleById: async (id: string) => {
        try {
          // ✅ PHASE 5: Defensive validation to prevent undefined parameters
          if (!id || typeof id !== 'string' || id.trim() === '') {
            throw new Error('Schedule ID is required and must be a valid string');
          }

          set({ isLoadingDetail: true, detailError: null });

          const response = await schedulingAPI.getScheduleById(id.trim(), true);

          if (response.success && response.data) {
            set({
              currentSchedule: response.data,
              currentEntries: response.data.entries || [],
              isLoadingDetail: false,
            });
          } else {
            throw new Error(response.error || 'Failed to fetch schedule');
          }
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to fetch schedule',
          });
          throw error;
        }
      },

      fetchScheduleByNumber: async (scheduleNumber: string) => {
        try {
          // ✅ PHASE 5: Defensive validation to prevent undefined parameters
          if (!scheduleNumber || typeof scheduleNumber !== 'string' || scheduleNumber.trim() === '') {
            throw new Error('Schedule number is required and must be a valid string');
          }

          set({ isLoadingDetail: true, detailError: null });

          const response = await schedulingAPI.getScheduleByNumber(scheduleNumber.trim(), true);

          if (response.success && response.data) {
            set({
              currentSchedule: response.data,
              currentEntries: response.data.entries || [],
              isLoadingDetail: false,
            });
          } else {
            throw new Error(response.error || 'Failed to fetch schedule');
          }
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to fetch schedule',
          });
          throw error;
        }
      },

      createSchedule: async (data: CreateScheduleRequest) => {
        try {
          set({ isLoading: true, error: null });

          const response = await schedulingAPI.createSchedule(data);

          if (response.success && response.data) {
            set({ isLoading: false });
            await get().refreshSchedules();
            return response.data;
          } else {
            throw new Error(response.error || 'Failed to create schedule');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to create schedule',
          });
          throw error;
        }
      },

      updateSchedule: async (id: string, data: UpdateScheduleRequest) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          const response = await schedulingAPI.updateSchedule(id, data);

          if (response.success && response.data) {
            set({
              currentSchedule: response.data,
              isLoadingDetail: false,
            });
            await get().refreshSchedules();
          } else {
            throw new Error(response.error || 'Failed to update schedule');
          }
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to update schedule',
          });
          throw error;
        }
      },

      deleteSchedule: async (id: string, hardDelete: boolean = false) => {
        try {
          set({ isLoading: true, error: null });

          await schedulingAPI.deleteSchedule(id, hardDelete);

          set({ isLoading: false });
          await get().refreshSchedules();
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to delete schedule',
          });
          throw error;
        }
      },

      fetchSchedulesByState: async (state: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await schedulingAPI.getSchedulesByState(state);

          if (response.success && response.data) {
            set({
              schedules: response.data,
              isLoading: false,
            });
          } else {
            throw new Error(response.error || 'Failed to fetch schedules by state');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch schedules by state',
          });
          throw error;
        }
      },

      // ============================================
      // ENTRY OPERATIONS
      // ============================================

      fetchScheduleEntries: async (scheduleId: string) => {
        try {
          set({ isLoadingEntries: true, entriesError: null });

          const response = await scheduleEntryAPI.getScheduleEntries(scheduleId, true);

          if (response.success && response.data) {
            set({
              currentEntries: response.data,
              isLoadingEntries: false,
            });
          } else {
            throw new Error(response.error || 'Failed to fetch schedule entries');
          }
        } catch (error: any) {
          set({
            isLoadingEntries: false,
            entriesError: error.message || 'Failed to fetch schedule entries',
          });
          throw error;
        }
      },

      createScheduleEntry: async (scheduleId: string, data: CreateScheduleEntryRequest) => {
        try {
          set({ isLoadingEntries: true, entriesError: null });

          await scheduleEntryAPI.createScheduleEntry(scheduleId, data);

          set({ isLoadingEntries: false });
          await get().fetchScheduleEntries(scheduleId);
          await get().fetchScheduleById(scheduleId);
        } catch (error: any) {
          set({
            isLoadingEntries: false,
            entriesError: error.message || 'Failed to create schedule entry',
          });
          throw error;
        }
      },

      updateScheduleEntry: async (entryId: string, data: UpdateScheduleEntryRequest) => {
        try {
          set({ isLoadingEntries: true, entriesError: null });

          await scheduleEntryAPI.updateScheduleEntry(entryId, data);

          set({ isLoadingEntries: false });
          const currentSchedule = get().currentSchedule;
          if (currentSchedule) {
            await get().fetchScheduleEntries(currentSchedule.id);
          }
        } catch (error: any) {
          set({
            isLoadingEntries: false,
            entriesError: error.message || 'Failed to update schedule entry',
          });
          throw error;
        }
      },

      cancelScheduleEntry: async (entryId: string, reason: string, cancelledBy?: string) => {
        try {
          set({ isLoadingEntries: true, entriesError: null });

          await scheduleEntryAPI.cancelScheduleEntry(entryId, reason, cancelledBy);

          set({ isLoadingEntries: false });
          const currentSchedule = get().currentSchedule;
          if (currentSchedule) {
            await get().fetchScheduleEntries(currentSchedule.id);
          }
        } catch (error: any) {
          set({
            isLoadingEntries: false,
            entriesError: error.message || 'Failed to cancel schedule entry',
          });
          throw error;
        }
      },

      fetchDispatchReadyEntries: async (siteId?: string) => {
        try {
          set({ isLoadingDispatchReady: true });

          const response = await scheduleEntryAPI.getEntriesReadyForDispatch(siteId);

          if (response.success && response.data) {
            set({
              dispatchReadyEntries: response.data,
              isLoadingDispatchReady: false,
            });
          } else {
            throw new Error(response.error || 'Failed to fetch dispatch-ready entries');
          }
        } catch (error: any) {
          set({ isLoadingDispatchReady: false });
          throw error;
        }
      },

      // ============================================
      // CONSTRAINT OPERATIONS
      // ============================================

      fetchEntryConstraints: async (entryId: string) => {
        try {
          set({ isLoadingConstraints: true, constraintsError: null });

          const response = await constraintAPI.getEntryConstraints(entryId);

          if (response.success && response.data) {
            set({
              currentConstraints: response.data,
              isLoadingConstraints: false,
            });
          } else {
            throw new Error(response.error || 'Failed to fetch constraints');
          }
        } catch (error: any) {
          set({
            isLoadingConstraints: false,
            constraintsError: error.message || 'Failed to fetch constraints',
          });
          throw error;
        }
      },

      createConstraint: async (entryId: string, data: Partial<ScheduleConstraint>) => {
        try {
          set({ isLoadingConstraints: true, constraintsError: null });

          await constraintAPI.createConstraint(entryId, data);

          set({ isLoadingConstraints: false });
          await get().fetchEntryConstraints(entryId);
        } catch (error: any) {
          set({
            isLoadingConstraints: false,
            constraintsError: error.message || 'Failed to create constraint',
          });
          throw error;
        }
      },

      updateConstraint: async (constraintId: string, data: Partial<ScheduleConstraint>) => {
        try {
          set({ isLoadingConstraints: true, constraintsError: null });

          await constraintAPI.updateConstraint(constraintId, data);

          set({ isLoadingConstraints: false });
        } catch (error: any) {
          set({
            isLoadingConstraints: false,
            constraintsError: error.message || 'Failed to update constraint',
          });
          throw error;
        }
      },

      resolveConstraint: async (constraintId: string, resolvedBy: string, resolutionNotes: string) => {
        try {
          set({ isLoadingConstraints: true, constraintsError: null });

          await constraintAPI.resolveConstraint(constraintId, resolvedBy, resolutionNotes);

          set({ isLoadingConstraints: false });
        } catch (error: any) {
          set({
            isLoadingConstraints: false,
            constraintsError: error.message || 'Failed to resolve constraint',
          });
          throw error;
        }
      },

      checkConstraintViolation: async (constraintId: string) => {
        try {
          await constraintAPI.checkConstraintViolation(constraintId);
        } catch (error: any) {
          console.error('Failed to check constraint violation:', error);
        }
      },

      // ============================================
      // STATE MANAGEMENT OPERATIONS
      // ============================================

      transitionScheduleState: async (scheduleId: string, data: TransitionStateRequest) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          const response = await stateAPI.transitionScheduleState(scheduleId, data);

          if (response.success) {
            set({ isLoadingDetail: false });
            await get().fetchScheduleById(scheduleId);
            await get().fetchStateHistory(scheduleId);
          } else {
            throw new Error(response.error || 'Failed to transition schedule state');
          }
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to transition schedule state',
          });
          throw error;
        }
      },

      fetchStateHistory: async (scheduleId: string) => {
        try {
          set({ isLoadingHistory: true });

          const response = await stateAPI.getScheduleStateHistory(scheduleId);

          if (response.success && response.data) {
            set({
              stateHistory: response.data,
              isLoadingHistory: false,
            });
          } else {
            throw new Error(response.error || 'Failed to fetch state history');
          }
        } catch (error: any) {
          set({ isLoadingHistory: false });
          throw error;
        }
      },

      // ============================================
      // SEQUENCING OPERATIONS
      // ============================================

      applyPrioritySequencing: async (scheduleId: string) => {
        try {
          const response = await sequencingAPI.applyPrioritySequencing(scheduleId);

          if (response.success && response.data) {
            await get().fetchScheduleEntries(scheduleId);
            return { entriesAffected: response.data.entriesAffected };
          } else {
            throw new Error(response.error || 'Failed to apply priority sequencing');
          }
        } catch (error: any) {
          throw error;
        }
      },

      applyEDDSequencing: async (scheduleId: string) => {
        try {
          const response = await sequencingAPI.applyEDDSequencing(scheduleId);

          if (response.success && response.data) {
            await get().fetchScheduleEntries(scheduleId);
            return { entriesAffected: response.data.entriesAffected };
          } else {
            throw new Error(response.error || 'Failed to apply EDD sequencing');
          }
        } catch (error: any) {
          throw error;
        }
      },

      checkScheduleFeasibility: async (scheduleId: string) => {
        try {
          set({ isLoadingFeasibility: true });

          const response = await sequencingAPI.checkScheduleFeasibility(scheduleId);

          if (response.success && response.data) {
            set({
              feasibilityResult: response.data,
              isLoadingFeasibility: false,
            });
          } else {
            throw new Error(response.error || 'Failed to check schedule feasibility');
          }
        } catch (error: any) {
          set({ isLoadingFeasibility: false });
          throw error;
        }
      },

      // ============================================
      // DISPATCH OPERATIONS
      // ============================================

      dispatchScheduleEntry: async (entryId: string, dispatchedBy: string) => {
        try {
          const response = await dispatchAPI.dispatchScheduleEntry(entryId, dispatchedBy);

          if (response.success && response.data) {
            const currentSchedule = get().currentSchedule;
            if (currentSchedule) {
              await get().fetchScheduleEntries(currentSchedule.id);
            }
            return response.data;
          } else {
            throw new Error(response.error || 'Failed to dispatch schedule entry');
          }
        } catch (error: any) {
          throw error;
        }
      },

      dispatchAllEntries: async (scheduleId: string, dispatchedBy: string) => {
        try {
          const response = await dispatchAPI.dispatchAllEntries(scheduleId, dispatchedBy);

          if (response.success && response.data) {
            await get().fetchScheduleEntries(scheduleId);
            return { dispatchedCount: response.data.dispatchedCount };
          } else {
            throw new Error(response.error || 'Failed to dispatch all entries');
          }
        } catch (error: any) {
          throw error;
        }
      },

      // ============================================
      // STATISTICS
      // ============================================

      fetchStatistics: async () => {
        try {
          set({ isLoadingStatistics: true });

          const response = await statisticsAPI.getStatistics();

          if (response.success && response.data) {
            set({
              statistics: response.data,
              isLoadingStatistics: false,
            });
          } else {
            throw new Error(response.error || 'Failed to fetch statistics');
          }
        } catch (error: any) {
          set({ isLoadingStatistics: false });
          throw error;
        }
      },

      // ============================================
      // ERROR HANDLING
      // ============================================

      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
      setDetailError: (error: string | null) => set({ detailError: error }),
      clearDetailError: () => set({ detailError: null }),

      // ============================================
      // STATE CLEARING
      // ============================================

      clearCurrentSchedule: () => {
        set({
          currentSchedule: null,
          currentEntries: [],
          currentConstraints: [],
          stateHistory: [],
          feasibilityResult: null,
        });
      },

      clearCurrentEntries: () => {
        set({ currentEntries: [] });
      },

      clearCurrentConstraints: () => {
        set({ currentConstraints: [] });
      },
    }),
    { name: 'SchedulingStore' }
  )
);

export default useSchedulingStore;
