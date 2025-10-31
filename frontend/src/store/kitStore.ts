/**
 * Kit Management Store
 *
 * Zustand store for kit management state including kits, staging locations,
 * filters, loading states, and error handling
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { message } from 'antd';
import {
  Kit,
  KitItem,
  StagingLocation,
  KitStatusHistory,
  KitShortageAlert,
  KitStatus,
  KitPriority,
  AssemblyStage,
  CreateKitRequest,
  UpdateKitRequest,
  KitGenerationRequest,
  KitTransitionRequest,
  StagingAssignmentRequest,
  KitMetricsResponse,
  KitFilters,
  KitSearchParams
} from '../types/kits';
import { kitsApiClient } from '../api/kits';

// Store State Interface
interface KitStoreState {
  // Data
  kits: Kit[];
  selectedKit: Kit | null;
  kitItems: KitItem[];
  stagingLocations: StagingLocation[];
  kitShortages: KitShortageAlert[];
  kitMetrics: KitMetricsResponse | null;
  kitStatistics: {
    totalKits: number;
    activeKits: number;
    completedKits: number;
    overdueKits: number;
    totalShortages: number;
    stagingUtilization: number;
  } | null;

  // Loading States
  loading: {
    kits: boolean;
    kit: boolean;
    kitItems: boolean;
    stagingLocations: boolean;
    shortages: boolean;
    metrics: boolean;
    statistics: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
    generating: boolean;
    transitioning: boolean;
    scanning: boolean;
  };

  // Error States
  error: {
    kits: string | null;
    kit: string | null;
    kitItems: string | null;
    stagingLocations: string | null;
    shortages: string | null;
    metrics: string | null;
    statistics: string | null;
    general: string | null;
  };

  // UI State
  filters: KitFilters;
  searchText: string;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  sortBy: 'kitNumber' | 'kitName' | 'status' | 'priority' | 'dueDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';

  // Modal States
  modals: {
    createKit: boolean;
    editKit: boolean;
    viewKit: boolean;
    generateKits: boolean;
    assignStaging: boolean;
    scanBarcode: boolean;
  };

  // Actions
  // Kit CRUD
  fetchKits: (params?: KitSearchParams) => Promise<void>;
  fetchKit: (id: string) => Promise<void>;
  createKit: (data: CreateKitRequest) => Promise<boolean>;
  updateKit: (id: string, data: UpdateKitRequest) => Promise<boolean>;
  deleteKit: (id: string) => Promise<boolean>;

  // Kit Generation
  generateKits: (data: KitGenerationRequest) => Promise<boolean>;
  generateKitsFromWorkOrder: (workOrderId: string, data: Omit<KitGenerationRequest, 'workOrderId'>) => Promise<boolean>;

  // Kit Workflow
  transitionKitStatus: (data: KitTransitionRequest) => Promise<boolean>;
  fetchKitStatusHistory: (kitId: string) => Promise<KitStatusHistory[]>;

  // Kit Items
  fetchKitItems: (kitId: string) => Promise<void>;
  addKitItem: (kitId: string, data: { partId: string; requiredQuantity: number; notes?: string }) => Promise<boolean>;
  updateKitItem: (kitId: string, itemId: string, data: { requiredQuantity?: number; stagedQuantity?: number; consumedQuantity?: number; notes?: string }) => Promise<boolean>;
  removeKitItem: (kitId: string, itemId: string) => Promise<boolean>;

  // Staging
  fetchStagingLocations: (filters?: any) => Promise<void>;
  assignKitToLocation: (data: StagingAssignmentRequest) => Promise<boolean>;
  findOptimalLocation: (requirements: any) => Promise<any>;

  // Shortages
  fetchKitShortages: (kitId?: string) => Promise<void>;
  identifyKitShortages: (kitId: string) => Promise<void>;
  resolveShortage: (shortageId: string, resolution: any) => Promise<boolean>;

  // Analytics
  fetchKitMetrics: () => Promise<void>;
  fetchKitStatistics: () => Promise<void>;

  // Barcode Scanning
  scanKit: (barcodeString: string, operatorId?: string) => Promise<any>;
  scanPart: (barcodeString: string, operatorId?: string) => Promise<any>;
  scanLocation: (barcodeString: string, operatorId?: string) => Promise<any>;

  // UI Actions
  setFilters: (filters: Partial<KitFilters>) => void;
  setSearchText: (text: string) => void;
  setPagination: (pagination: Partial<{ current: number; pageSize: number; total: number }>) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setSelectedKit: (kit: Kit | null) => void;
  openModal: (modal: keyof KitStoreState['modals']) => void;
  closeModal: (modal: keyof KitStoreState['modals']) => void;
  clearErrors: () => void;
  resetFilters: () => void;
}

// Initial State
const initialState = {
  // Data
  kits: [],
  selectedKit: null,
  kitItems: [],
  stagingLocations: [],
  kitShortages: [],
  kitMetrics: null,
  kitStatistics: null,

  // Loading States
  loading: {
    kits: false,
    kit: false,
    kitItems: false,
    stagingLocations: false,
    shortages: false,
    metrics: false,
    statistics: false,
    creating: false,
    updating: false,
    deleting: false,
    generating: false,
    transitioning: false,
    scanning: false,
  },

  // Error States
  error: {
    kits: null,
    kit: null,
    kitItems: null,
    stagingLocations: null,
    shortages: null,
    metrics: null,
    statistics: null,
    general: null,
  },

  // UI State
  filters: {},
  searchText: '',
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
  },
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const,

  // Modal States
  modals: {
    createKit: false,
    editKit: false,
    viewKit: false,
    generateKits: false,
    assignStaging: false,
    scanBarcode: false,
  },
};

// Create Store
export const useKitStore = create<KitStoreState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Kit CRUD Actions
      fetchKits: async (params?: KitSearchParams) => {
        set((state) => ({
          loading: { ...state.loading, kits: true },
          error: { ...state.error, kits: null },
        }));

        try {
          const { filters, searchText, pagination, sortBy, sortOrder } = get();
          const searchParams = {
            ...params,
            searchText: params?.searchText || searchText,
            filters: { ...filters, ...params?.filters },
            sortBy: params?.sortBy || sortBy,
            sortOrder: params?.sortOrder || sortOrder,
            page: params?.page || pagination.current,
            pageSize: params?.pageSize || pagination.pageSize,
          };

          const response = await kitsApiClient.getKits(searchParams);

          set((state) => ({
            kits: response.kits,
            loading: { ...state.loading, kits: false },
            pagination: {
              ...state.pagination,
              total: response.totalCount,
              current: response.currentPage,
              pageSize: response.pageSize,
            },
          }));
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, kits: false },
            error: { ...state.error, kits: errorMessage },
          }));
          message.error(`Failed to fetch kits: ${errorMessage}`);
        }
      },

      fetchKit: async (id: string) => {
        set((state) => ({
          loading: { ...state.loading, kit: true },
          error: { ...state.error, kit: null },
        }));

        try {
          const kit = await kitsApiClient.getKit(id);
          set((state) => ({
            selectedKit: kit,
            loading: { ...state.loading, kit: false },
          }));
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, kit: false },
            error: { ...state.error, kit: errorMessage },
          }));
          message.error(`Failed to fetch kit: ${errorMessage}`);
        }
      },

      createKit: async (data: CreateKitRequest) => {
        set((state) => ({
          loading: { ...state.loading, creating: true },
          error: { ...state.error, general: null },
        }));

        try {
          const newKit = await kitsApiClient.createKit(data);
          set((state) => ({
            kits: [newKit, ...state.kits],
            loading: { ...state.loading, creating: false },
            modals: { ...state.modals, createKit: false },
          }));
          message.success('Kit created successfully');
          return true;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, creating: false },
            error: { ...state.error, general: errorMessage },
          }));
          message.error(`Failed to create kit: ${errorMessage}`);
          return false;
        }
      },

      updateKit: async (id: string, data: UpdateKitRequest) => {
        set((state) => ({
          loading: { ...state.loading, updating: true },
          error: { ...state.error, general: null },
        }));

        try {
          const updatedKit = await kitsApiClient.updateKit(id, data);
          set((state) => ({
            kits: state.kits.map((kit) => (kit.id === id ? updatedKit : kit)),
            selectedKit: state.selectedKit?.id === id ? updatedKit : state.selectedKit,
            loading: { ...state.loading, updating: false },
            modals: { ...state.modals, editKit: false },
          }));
          message.success('Kit updated successfully');
          return true;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, updating: false },
            error: { ...state.error, general: errorMessage },
          }));
          message.error(`Failed to update kit: ${errorMessage}`);
          return false;
        }
      },

      deleteKit: async (id: string) => {
        set((state) => ({
          loading: { ...state.loading, deleting: true },
          error: { ...state.error, general: null },
        }));

        try {
          await kitsApiClient.deleteKit(id);
          set((state) => ({
            kits: state.kits.filter((kit) => kit.id !== id),
            selectedKit: state.selectedKit?.id === id ? null : state.selectedKit,
            loading: { ...state.loading, deleting: false },
          }));
          message.success('Kit deleted successfully');
          return true;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, deleting: false },
            error: { ...state.error, general: errorMessage },
          }));
          message.error(`Failed to delete kit: ${errorMessage}`);
          return false;
        }
      },

      // Kit Generation Actions
      generateKits: async (data: KitGenerationRequest) => {
        set((state) => ({
          loading: { ...state.loading, generating: true },
          error: { ...state.error, general: null },
        }));

        try {
          const result = await kitsApiClient.generateKits(data);
          set((state) => ({
            kits: [...result.kits, ...state.kits],
            loading: { ...state.loading, generating: false },
            modals: { ...state.modals, generateKits: false },
          }));
          message.success(`Generated ${result.kits.length} kit(s) successfully`);
          if (result.analysis.shortages.length > 0) {
            message.warning(`${result.analysis.shortages.length} shortages identified`);
          }
          return true;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, generating: false },
            error: { ...state.error, general: errorMessage },
          }));
          message.error(`Failed to generate kits: ${errorMessage}`);
          return false;
        }
      },

      generateKitsFromWorkOrder: async (workOrderId: string, data: Omit<KitGenerationRequest, 'workOrderId'>) => {
        set((state) => ({
          loading: { ...state.loading, generating: true },
          error: { ...state.error, general: null },
        }));

        try {
          const result = await kitsApiClient.generateKitsFromWorkOrder(workOrderId, data);
          set((state) => ({
            kits: [...result.kits, ...state.kits],
            loading: { ...state.loading, generating: false },
          }));
          message.success(`Generated ${result.kits.length} kit(s) from work order successfully`);
          return true;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, generating: false },
            error: { ...state.error, general: errorMessage },
          }));
          message.error(`Failed to generate kits: ${errorMessage}`);
          return false;
        }
      },

      // Kit Workflow Actions
      transitionKitStatus: async (data: KitTransitionRequest) => {
        set((state) => ({
          loading: { ...state.loading, transitioning: true },
          error: { ...state.error, general: null },
        }));

        try {
          const result = await kitsApiClient.transitionKitStatus(data);
          if (result.success && result.kit) {
            set((state) => ({
              kits: state.kits.map((kit) => (kit.id === data.kitId ? result.kit! : kit)),
              selectedKit: state.selectedKit?.id === data.kitId ? result.kit! : state.selectedKit,
              loading: { ...state.loading, transitioning: false },
            }));
            message.success('Kit status updated successfully');

            // Show warnings if any
            const warnings = result.validationResults.filter(r => r.type === 'WARNING');
            warnings.forEach(warning => message.warning(warning.message));
          } else {
            const errors = result.validationResults.filter(r => r.type === 'ERROR');
            const errorMessage = errors.map(e => e.message).join(', ');
            set((state) => ({
              loading: { ...state.loading, transitioning: false },
              error: { ...state.error, general: errorMessage },
            }));
            message.error(`Status transition failed: ${errorMessage}`);
          }
          return result.success;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, transitioning: false },
            error: { ...state.error, general: errorMessage },
          }));
          message.error(`Failed to transition kit status: ${errorMessage}`);
          return false;
        }
      },

      fetchKitStatusHistory: async (kitId: string) => {
        try {
          return await kitsApiClient.getKitStatusHistory(kitId);
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          message.error(`Failed to fetch status history: ${errorMessage}`);
          return [];
        }
      },

      // Kit Items Actions
      fetchKitItems: async (kitId: string) => {
        set((state) => ({
          loading: { ...state.loading, kitItems: true },
          error: { ...state.error, kitItems: null },
        }));

        try {
          const items = await kitsApiClient.getKitItems(kitId);
          set((state) => ({
            kitItems: items,
            loading: { ...state.loading, kitItems: false },
          }));
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, kitItems: false },
            error: { ...state.error, kitItems: errorMessage },
          }));
          message.error(`Failed to fetch kit items: ${errorMessage}`);
        }
      },

      addKitItem: async (kitId: string, data: { partId: string; requiredQuantity: number; notes?: string }) => {
        try {
          const newItem = await kitsApiClient.addKitItem(kitId, data);
          set((state) => ({
            kitItems: [...state.kitItems, newItem],
          }));
          message.success('Kit item added successfully');
          return true;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          message.error(`Failed to add kit item: ${errorMessage}`);
          return false;
        }
      },

      updateKitItem: async (kitId: string, itemId: string, data: any) => {
        try {
          const updatedItem = await kitsApiClient.updateKitItem(kitId, itemId, data);
          set((state) => ({
            kitItems: state.kitItems.map((item) => (item.id === itemId ? updatedItem : item)),
          }));
          message.success('Kit item updated successfully');
          return true;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          message.error(`Failed to update kit item: ${errorMessage}`);
          return false;
        }
      },

      removeKitItem: async (kitId: string, itemId: string) => {
        try {
          await kitsApiClient.removeKitItem(kitId, itemId);
          set((state) => ({
            kitItems: state.kitItems.filter((item) => item.id !== itemId),
          }));
          message.success('Kit item removed successfully');
          return true;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          message.error(`Failed to remove kit item: ${errorMessage}`);
          return false;
        }
      },

      // Staging Actions
      fetchStagingLocations: async (filters?: any) => {
        set((state) => ({
          loading: { ...state.loading, stagingLocations: true },
          error: { ...state.error, stagingLocations: null },
        }));

        try {
          const locations = await kitsApiClient.staging.getStagingLocations(filters);
          set((state) => ({
            stagingLocations: locations,
            loading: { ...state.loading, stagingLocations: false },
          }));
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, stagingLocations: false },
            error: { ...state.error, stagingLocations: errorMessage },
          }));
          message.error(`Failed to fetch staging locations: ${errorMessage}`);
        }
      },

      assignKitToLocation: async (data: StagingAssignmentRequest) => {
        try {
          const result = await kitsApiClient.staging.assignKitToLocation(data);
          if (result.success) {
            set((state) => ({
              kits: state.kits.map((kit) => (kit.id === data.kitId ? result.kit : kit)),
              selectedKit: state.selectedKit?.id === data.kitId ? result.kit : state.selectedKit,
              modals: { ...state.modals, assignStaging: false },
            }));
            message.success('Kit assigned to staging location successfully');

            // Show warnings if any
            const warnings = result.validationResults.filter(r => r.type === 'WARNING');
            warnings.forEach(warning => message.warning(warning.message));
          }
          return result.success;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          message.error(`Failed to assign kit to staging location: ${errorMessage}`);
          return false;
        }
      },

      findOptimalLocation: async (requirements: any) => {
        try {
          return await kitsApiClient.staging.findOptimalLocation(requirements);
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          message.error(`Failed to find optimal location: ${errorMessage}`);
          return null;
        }
      },

      // Shortages Actions
      fetchKitShortages: async (kitId?: string) => {
        set((state) => ({
          loading: { ...state.loading, shortages: true },
          error: { ...state.error, shortages: null },
        }));

        try {
          const shortages = await kitsApiClient.getKitShortages(kitId);
          set((state) => ({
            kitShortages: shortages,
            loading: { ...state.loading, shortages: false },
          }));
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, shortages: false },
            error: { ...state.error, shortages: errorMessage },
          }));
          message.error(`Failed to fetch shortages: ${errorMessage}`);
        }
      },

      identifyKitShortages: async (kitId: string) => {
        try {
          const shortages = await kitsApiClient.identifyKitShortages(kitId);
          set((state) => ({
            kitShortages: [...state.kitShortages, ...shortages],
          }));
          if (shortages.length > 0) {
            message.warning(`Identified ${shortages.length} shortage(s) for this kit`);
          } else {
            message.success('No shortages found for this kit');
          }
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          message.error(`Failed to identify shortages: ${errorMessage}`);
        }
      },

      resolveShortage: async (shortageId: string, resolution: any) => {
        try {
          await kitsApiClient.resolveShortage(shortageId, resolution);
          set((state) => ({
            kitShortages: state.kitShortages.map((shortage) =>
              shortage.id === shortageId
                ? { ...shortage, isResolved: true, resolvedAt: new Date().toISOString() }
                : shortage
            ),
          }));
          message.success('Shortage resolved successfully');
          return true;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          message.error(`Failed to resolve shortage: ${errorMessage}`);
          return false;
        }
      },

      // Analytics Actions
      fetchKitMetrics: async () => {
        set((state) => ({
          loading: { ...state.loading, metrics: true },
          error: { ...state.error, metrics: null },
        }));

        try {
          const metrics = await kitsApiClient.getKitMetrics();
          set((state) => ({
            kitMetrics: metrics,
            loading: { ...state.loading, metrics: false },
          }));
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, metrics: false },
            error: { ...state.error, metrics: errorMessage },
          }));
          message.error(`Failed to fetch metrics: ${errorMessage}`);
        }
      },

      fetchKitStatistics: async () => {
        set((state) => ({
          loading: { ...state.loading, statistics: true },
          error: { ...state.error, statistics: null },
        }));

        try {
          const statistics = await kitsApiClient.getKitStatistics();
          set((state) => ({
            kitStatistics: statistics,
            loading: { ...state.loading, statistics: false },
          }));
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, statistics: false },
            error: { ...state.error, statistics: errorMessage },
          }));
          message.error(`Failed to fetch statistics: ${errorMessage}`);
        }
      },

      // Barcode Scanning Actions
      scanKit: async (barcodeString: string, operatorId?: string) => {
        set((state) => ({
          loading: { ...state.loading, scanning: true },
        }));

        try {
          const result = await kitsApiClient.scanKit({ barcodeString, operatorId });
          set((state) => ({
            loading: { ...state.loading, scanning: false },
          }));

          if (result.success) {
            message.success('Kit scanned successfully');
          } else {
            message.warning(result.validation.errors.join(', '));
          }

          return result;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, scanning: false },
          }));
          message.error(`Scan failed: ${errorMessage}`);
          return null;
        }
      },

      scanPart: async (barcodeString: string, operatorId?: string) => {
        set((state) => ({
          loading: { ...state.loading, scanning: true },
        }));

        try {
          const result = await kitsApiClient.scanPart({ barcodeString, operatorId });
          set((state) => ({
            loading: { ...state.loading, scanning: false },
          }));

          if (result.success) {
            message.success('Part scanned successfully');
          } else {
            message.warning(result.validation.errors.join(', '));
          }

          return result;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, scanning: false },
          }));
          message.error(`Scan failed: ${errorMessage}`);
          return null;
        }
      },

      scanLocation: async (barcodeString: string, operatorId?: string) => {
        set((state) => ({
          loading: { ...state.loading, scanning: true },
        }));

        try {
          const result = await kitsApiClient.scanLocation({ barcodeString, operatorId });
          set((state) => ({
            loading: { ...state.loading, scanning: false },
          }));

          if (result.success) {
            message.success('Location scanned successfully');
          } else {
            message.warning(result.validation.errors.join(', '));
          }

          return result;
        } catch (error) {
          const errorMessage = kitsApiClient.handleError(error);
          set((state) => ({
            loading: { ...state.loading, scanning: false },
          }));
          message.error(`Scan failed: ${errorMessage}`);
          return null;
        }
      },

      // UI Actions
      setFilters: (filters: Partial<KitFilters>) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
          pagination: { ...state.pagination, current: 1 }, // Reset to first page
        }));
      },

      setSearchText: (text: string) => {
        set((state) => ({
          searchText: text,
          pagination: { ...state.pagination, current: 1 }, // Reset to first page
        }));
      },

      setPagination: (pagination: Partial<{ current: number; pageSize: number; total: number }>) => {
        set((state) => ({
          pagination: { ...state.pagination, ...pagination },
        }));
      },

      setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => {
        set((state) => ({
          sortBy: sortBy as any,
          sortOrder,
          pagination: { ...state.pagination, current: 1 }, // Reset to first page
        }));
      },

      setSelectedKit: (kit: Kit | null) => {
        set({ selectedKit: kit });
      },

      openModal: (modal: keyof KitStoreState['modals']) => {
        set((state) => ({
          modals: { ...state.modals, [modal]: true },
        }));
      },

      closeModal: (modal: keyof KitStoreState['modals']) => {
        set((state) => ({
          modals: { ...state.modals, [modal]: false },
        }));
      },

      clearErrors: () => {
        set((state) => ({
          error: {
            kits: null,
            kit: null,
            kitItems: null,
            stagingLocations: null,
            shortages: null,
            metrics: null,
            statistics: null,
            general: null,
          },
        }));
      },

      resetFilters: () => {
        set((state) => ({
          filters: {},
          searchText: '',
          pagination: { ...state.pagination, current: 1 },
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }));
      },
    }),
    {
      name: 'kit-store',
      version: 1,
    }
  )
);