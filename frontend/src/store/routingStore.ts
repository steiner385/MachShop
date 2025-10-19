/**
 * Routing Zustand Store
 * Sprint 4: Routing Management UI
 *
 * Global state management for routing operations
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  routingAPI,
  routingStepAPI,
  stepDependencyAPI,
  partSiteAvailabilityAPI,
} from '@/api/routing';
import {
  Routing,
  RoutingStep,
  RoutingStepDependency,
  PartSiteAvailability,
  RoutingQueryParams,
  CreateRoutingRequest,
  UpdateRoutingRequest,
  CreateRoutingStepRequest,
  UpdateRoutingStepRequest,
  CreateStepDependencyRequest,
  CopyRoutingRequest,
  ApproveRoutingRequest,
  ResequenceStepsRequest,
  RoutingLifecycleState,
  RoutingFilters,
} from '@/types/routing';

// ============================================
// STATE INTERFACE
// ============================================

interface RoutingState {
  // List view state
  routings: Routing[];
  isLoading: boolean;
  error: string | null;
  filters: RoutingFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Detail view state
  currentRouting: Routing | null;
  isLoadingDetail: boolean;
  detailError: string | null;

  // Steps state
  currentSteps: RoutingStep[];
  isLoadingSteps: boolean;
  stepsError: string | null;

  // Part site availability
  availableSites: PartSiteAvailability[];
  isLoadingAvailability: boolean;

  // Timing calculation
  routingTiming: {
    totalSetupTime: number;
    totalCycleTime: number;
    totalTeardownTime: number;
    totalTime: number;
    criticalPathTime: number;
  } | null;

  // Validation results
  validationResult: {
    isValid: boolean;
    errors: Array<{
      field: string;
      message: string;
      value?: any;
    }>;
  } | null;
}

// ============================================
// ACTIONS INTERFACE
// ============================================

interface RoutingActions {
  // List operations
  fetchRoutings: (params?: RoutingQueryParams) => Promise<void>;
  setFilters: (filters: Partial<RoutingFilters>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  refreshRoutings: () => Promise<void>;

  // CRUD operations
  fetchRoutingById: (id: string) => Promise<void>;
  createRouting: (data: CreateRoutingRequest) => Promise<Routing>;
  updateRouting: (id: string, data: UpdateRoutingRequest) => Promise<void>;
  deleteRouting: (id: string) => Promise<void>;
  copyRouting: (id: string, options: CopyRoutingRequest) => Promise<Routing>;

  // Lifecycle operations
  approveRouting: (request: ApproveRoutingRequest) => Promise<void>;
  activateRouting: (id: string) => Promise<void>;
  obsoleteRouting: (id: string) => Promise<void>;

  // Step operations
  fetchRoutingSteps: (routingId: string) => Promise<void>;
  createRoutingStep: (routingId: string, data: CreateRoutingStepRequest) => Promise<void>;
  updateRoutingStep: (stepId: string, data: UpdateRoutingStepRequest) => Promise<void>;
  deleteRoutingStep: (stepId: string) => Promise<void>;
  resequenceSteps: (request: ResequenceStepsRequest) => Promise<void>;

  // Dependency operations
  createStepDependency: (data: CreateStepDependencyRequest) => Promise<void>;
  deleteStepDependency: (dependencyId: string) => Promise<void>;

  // Part site availability
  fetchPartAvailableSites: (partId: string) => Promise<void>;

  // Timing & validation
  calculateRoutingTiming: (id: string) => Promise<void>;
  validateRouting: (id: string) => Promise<void>;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  setDetailError: (error: string | null) => void;
  clearDetailError: () => void;

  // State clearing
  clearCurrentRouting: () => void;
  clearCurrentSteps: () => void;
}

type RoutingStore = RoutingState & RoutingActions;

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_FILTERS: RoutingFilters = {
  search: '',
  siteId: null,
  partId: null,
  lifecycleState: null,
  isActive: null,
  isPrimaryRoute: null,
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

export const useRoutingStore = create<RoutingStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      routings: [],
      isLoading: false,
      error: null,
      filters: DEFAULT_FILTERS,
      pagination: DEFAULT_PAGINATION,
      currentRouting: null,
      isLoadingDetail: false,
      detailError: null,
      currentSteps: [],
      isLoadingSteps: false,
      stepsError: null,
      availableSites: [],
      isLoadingAvailability: false,
      routingTiming: null,
      validationResult: null,

      // ============================================
      // LIST OPERATIONS
      // ============================================

      fetchRoutings: async (params?: RoutingQueryParams) => {
        try {
          set({ isLoading: true, error: null });

          const queryParams: RoutingQueryParams = {
            ...params,
            page: params?.page || get().pagination.page,
            limit: params?.limit || get().pagination.limit,
            includeSteps: params?.includeSteps ?? false,
          };

          const response = await routingAPI.getAllRoutings(queryParams);

          if (response.success && response.data) {
            set({
              routings: response.data,
              pagination: response.pagination || DEFAULT_PAGINATION,
              isLoading: false,
            });
          } else {
            throw new Error(response.error || 'Failed to fetch routings');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch routings',
          });
          throw error;
        }
      },

      setFilters: (newFilters: Partial<RoutingFilters>) => {
        const currentFilters = get().filters;
        const updatedFilters = { ...currentFilters, ...newFilters };
        set({ filters: updatedFilters, pagination: { ...get().pagination, page: 1 } });

        // Build query params from filters
        const queryParams: RoutingQueryParams = {
          siteId: updatedFilters.siteId || undefined,
          partId: updatedFilters.partId || undefined,
          lifecycleState: updatedFilters.lifecycleState || undefined,
          isActive: updatedFilters.isActive === null ? undefined : updatedFilters.isActive,
          isPrimaryRoute: updatedFilters.isPrimaryRoute === null ? undefined : updatedFilters.isPrimaryRoute,
          search: updatedFilters.search || undefined,
          page: 1,
        };

        get().fetchRoutings(queryParams);
      },

      clearFilters: () => {
        set({ filters: DEFAULT_FILTERS, pagination: { ...get().pagination, page: 1 } });
        get().fetchRoutings({ page: 1 });
      },

      setPage: (page: number) => {
        const currentFilters = get().filters;
        const queryParams: RoutingQueryParams = {
          siteId: currentFilters.siteId || undefined,
          partId: currentFilters.partId || undefined,
          lifecycleState: currentFilters.lifecycleState || undefined,
          isActive: currentFilters.isActive === null ? undefined : currentFilters.isActive,
          isPrimaryRoute: currentFilters.isPrimaryRoute === null ? undefined : currentFilters.isPrimaryRoute,
          search: currentFilters.search || undefined,
          page,
        };

        set({ pagination: { ...get().pagination, page } });
        get().fetchRoutings(queryParams);
      },

      refreshRoutings: async () => {
        const currentFilters = get().filters;
        const queryParams: RoutingQueryParams = {
          siteId: currentFilters.siteId || undefined,
          partId: currentFilters.partId || undefined,
          lifecycleState: currentFilters.lifecycleState || undefined,
          isActive: currentFilters.isActive === null ? undefined : currentFilters.isActive,
          isPrimaryRoute: currentFilters.isPrimaryRoute === null ? undefined : currentFilters.isPrimaryRoute,
          search: currentFilters.search || undefined,
          page: get().pagination.page,
        };

        await get().fetchRoutings(queryParams);
      },

      // ============================================
      // CRUD OPERATIONS
      // ============================================

      fetchRoutingById: async (id: string) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          const response = await routingAPI.getRoutingById(id, true);

          if (response.success && response.data) {
            set({
              currentRouting: response.data,
              currentSteps: response.data.steps || [],
              isLoadingDetail: false,
            });
          } else {
            throw new Error(response.error || 'Failed to fetch routing');
          }
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to fetch routing',
          });
          throw error;
        }
      },

      createRouting: async (data: CreateRoutingRequest) => {
        try {
          set({ isLoading: true, error: null });

          const response = await routingAPI.createRouting(data);

          if (response.success && response.data) {
            set({ isLoading: false });
            await get().refreshRoutings();
            return response.data;
          } else {
            throw new Error(response.error || 'Failed to create routing');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to create routing',
          });
          throw error;
        }
      },

      updateRouting: async (id: string, data: UpdateRoutingRequest) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          const response = await routingAPI.updateRouting(id, data);

          if (response.success && response.data) {
            set({
              currentRouting: response.data,
              isLoadingDetail: false,
            });
            await get().refreshRoutings();
          } else {
            throw new Error(response.error || 'Failed to update routing');
          }
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to update routing',
          });
          throw error;
        }
      },

      deleteRouting: async (id: string) => {
        try {
          set({ isLoading: true, error: null });

          await routingAPI.deleteRouting(id);

          set({ isLoading: false });
          await get().refreshRoutings();
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to delete routing',
          });
          throw error;
        }
      },

      copyRouting: async (id: string, options: CopyRoutingRequest) => {
        try {
          set({ isLoading: true, error: null });

          const response = await routingAPI.copyRouting(id, options);

          if (response.success && response.data) {
            set({ isLoading: false });
            await get().refreshRoutings();
            return response.data;
          } else {
            throw new Error(response.error || 'Failed to copy routing');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to copy routing',
          });
          throw error;
        }
      },

      // ============================================
      // LIFECYCLE OPERATIONS
      // ============================================

      approveRouting: async (request: ApproveRoutingRequest) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          const response = await routingAPI.approveRouting(request);

          if (response.success && response.data) {
            set({
              currentRouting: response.data,
              isLoadingDetail: false,
            });
            await get().refreshRoutings();
          } else {
            throw new Error(response.error || 'Failed to approve routing');
          }
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to approve routing',
          });
          throw error;
        }
      },

      activateRouting: async (id: string) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          const response = await routingAPI.activateRouting(id);

          if (response.success && response.data) {
            set({
              currentRouting: response.data,
              isLoadingDetail: false,
            });
            await get().refreshRoutings();
          } else {
            throw new Error(response.error || 'Failed to activate routing');
          }
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to activate routing',
          });
          throw error;
        }
      },

      obsoleteRouting: async (id: string) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          const response = await routingAPI.obsoleteRouting(id);

          if (response.success && response.data) {
            set({
              currentRouting: response.data,
              isLoadingDetail: false,
            });
            await get().refreshRoutings();
          } else {
            throw new Error(response.error || 'Failed to obsolete routing');
          }
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to obsolete routing',
          });
          throw error;
        }
      },

      // ============================================
      // STEP OPERATIONS
      // ============================================

      fetchRoutingSteps: async (routingId: string) => {
        try {
          set({ isLoadingSteps: true, stepsError: null });

          const response = await routingStepAPI.getRoutingSteps(routingId);

          if (response.success && response.data) {
            set({
              currentSteps: response.data,
              isLoadingSteps: false,
            });
          } else {
            throw new Error(response.error || 'Failed to fetch routing steps');
          }
        } catch (error: any) {
          set({
            isLoadingSteps: false,
            stepsError: error.message || 'Failed to fetch routing steps',
          });
          throw error;
        }
      },

      createRoutingStep: async (routingId: string, data: CreateRoutingStepRequest) => {
        try {
          set({ isLoadingSteps: true, stepsError: null });

          await routingStepAPI.createRoutingStep(routingId, data);

          set({ isLoadingSteps: false });
          await get().fetchRoutingSteps(routingId);
          await get().fetchRoutingById(routingId);
        } catch (error: any) {
          set({
            isLoadingSteps: false,
            stepsError: error.message || 'Failed to create routing step',
          });
          throw error;
        }
      },

      updateRoutingStep: async (stepId: string, data: UpdateRoutingStepRequest) => {
        try {
          set({ isLoadingSteps: true, stepsError: null });

          await routingStepAPI.updateRoutingStep(stepId, data);

          set({ isLoadingSteps: false });
          const currentRouting = get().currentRouting;
          if (currentRouting) {
            await get().fetchRoutingSteps(currentRouting.id);
          }
        } catch (error: any) {
          set({
            isLoadingSteps: false,
            stepsError: error.message || 'Failed to update routing step',
          });
          throw error;
        }
      },

      deleteRoutingStep: async (stepId: string) => {
        try {
          set({ isLoadingSteps: true, stepsError: null });

          await routingStepAPI.deleteRoutingStep(stepId);

          set({ isLoadingSteps: false });
          const currentRouting = get().currentRouting;
          if (currentRouting) {
            await get().fetchRoutingSteps(currentRouting.id);
          }
        } catch (error: any) {
          set({
            isLoadingSteps: false,
            stepsError: error.message || 'Failed to delete routing step',
          });
          throw error;
        }
      },

      resequenceSteps: async (request: ResequenceStepsRequest) => {
        try {
          set({ isLoadingSteps: true, stepsError: null });

          const response = await routingStepAPI.resequenceSteps(request);

          if (response.success && response.data) {
            set({
              currentSteps: response.data,
              isLoadingSteps: false,
            });
          } else {
            throw new Error(response.error || 'Failed to resequence steps');
          }
        } catch (error: any) {
          set({
            isLoadingSteps: false,
            stepsError: error.message || 'Failed to resequence steps',
          });
          throw error;
        }
      },

      // ============================================
      // DEPENDENCY OPERATIONS
      // ============================================

      createStepDependency: async (data: CreateStepDependencyRequest) => {
        try {
          set({ isLoadingSteps: true, stepsError: null });

          await stepDependencyAPI.createStepDependency(data);

          set({ isLoadingSteps: false });
          const currentRouting = get().currentRouting;
          if (currentRouting) {
            await get().fetchRoutingSteps(currentRouting.id);
          }
        } catch (error: any) {
          set({
            isLoadingSteps: false,
            stepsError: error.message || 'Failed to create step dependency',
          });
          throw error;
        }
      },

      deleteStepDependency: async (dependencyId: string) => {
        try {
          set({ isLoadingSteps: true, stepsError: null });

          await stepDependencyAPI.deleteStepDependency(dependencyId);

          set({ isLoadingSteps: false });
          const currentRouting = get().currentRouting;
          if (currentRouting) {
            await get().fetchRoutingSteps(currentRouting.id);
          }
        } catch (error: any) {
          set({
            isLoadingSteps: false,
            stepsError: error.message || 'Failed to delete step dependency',
          });
          throw error;
        }
      },

      // ============================================
      // PART SITE AVAILABILITY
      // ============================================

      fetchPartAvailableSites: async (partId: string) => {
        try {
          set({ isLoadingAvailability: true });

          const response = await partSiteAvailabilityAPI.getPartAvailableSites(partId);

          if (response.success && response.data) {
            set({
              availableSites: response.data,
              isLoadingAvailability: false,
            });
          } else {
            throw new Error('Failed to fetch available sites');
          }
        } catch (error: any) {
          set({ isLoadingAvailability: false });
          throw error;
        }
      },

      // ============================================
      // TIMING & VALIDATION
      // ============================================

      calculateRoutingTiming: async (id: string) => {
        try {
          const response = await routingAPI.calculateRoutingTiming(id);

          if (response.success && response.data) {
            set({ routingTiming: response.data });
          }
        } catch (error: any) {
          console.error('Failed to calculate routing timing:', error);
        }
      },

      validateRouting: async (id: string) => {
        try {
          const response = await routingAPI.validateRouting(id);

          if (response.success && response.data) {
            set({ validationResult: response.data });
          }
        } catch (error: any) {
          console.error('Failed to validate routing:', error);
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

      clearCurrentRouting: () => {
        set({
          currentRouting: null,
          currentSteps: [],
          routingTiming: null,
          validationResult: null,
        });
      },

      clearCurrentSteps: () => {
        set({ currentSteps: [] });
      },
    }),
    { name: 'RoutingStore' }
  )
);

export default useRoutingStore;
