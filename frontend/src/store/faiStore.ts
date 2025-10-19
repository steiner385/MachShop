import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  faiAPI,
  FAIReport,
  FAICharacteristic,
  CreateFAIReportInput,
  UpdateFAIReportInput,
  CreateCharacteristicInput,
  UpdateCharacteristicInput,
  ListFAIReportsParams,
} from '../api/fai';

interface FAIState {
  // State
  reports: FAIReport[];
  currentReport: FAIReport | null;
  characteristics: FAICharacteristic[];
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;
  detailError: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Actions
  createFAIReport: (data: CreateFAIReportInput) => Promise<FAIReport>;
  getFAIReport: (id: string) => Promise<FAIReport>;
  getFAIReportByNumber: (faiNumber: string) => Promise<FAIReport>;
  listFAIReports: (params?: ListFAIReportsParams) => Promise<void>;
  updateFAIReport: (id: string, data: UpdateFAIReportInput) => Promise<FAIReport>;
  deleteFAIReport: (id: string) => Promise<void>;
  addCharacteristic: (faiReportId: string, data: CreateCharacteristicInput) => Promise<FAICharacteristic>;
  getCharacteristics: (faiReportId: string) => Promise<void>;
  updateCharacteristic: (
    faiReportId: string,
    characteristicId: string,
    data: UpdateCharacteristicInput
  ) => Promise<FAICharacteristic>;
  deleteCharacteristic: (faiReportId: string, characteristicId: string) => Promise<void>;
  approveFAIReport: (id: string) => Promise<FAIReport>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFilters: (filters: Partial<ListFAIReportsParams>) => void;
  clearError: () => void;
  clearDetailError: () => void;
  reset: () => void;
}

const initialState = {
  reports: [],
  currentReport: null,
  characteristics: [],
  isLoading: false,
  isLoadingDetail: false,
  error: null,
  detailError: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

/**
 * FAI Store
 *
 * Manages AS9102 First Article Inspection state with Zustand
 *
 * Features:
 * - Create, read, update, delete FAI reports
 * - Manage characteristics
 * - Pagination and filtering
 * - Approval workflow
 */
export const useFAIStore = create<FAIState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      /**
       * Create a new FAI report
       */
      createFAIReport: async (data: CreateFAIReportInput) => {
        set({ isLoading: true, error: null });
        try {
          const report = await faiAPI.createFAIReport(data);
          set({ isLoading: false, currentReport: report });
          return report;
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to create FAI report';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Get FAI report by ID
       */
      getFAIReport: async (id: string) => {
        set({ isLoadingDetail: true, detailError: null });
        try {
          const report = await faiAPI.getFAIReport(id);
          set({ currentReport: report, isLoadingDetail: false });
          return report;
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to get FAI report';
          set({ detailError: errorMessage, isLoadingDetail: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Get FAI report by FAI number
       */
      getFAIReportByNumber: async (faiNumber: string) => {
        set({ isLoadingDetail: true, detailError: null });
        try {
          const report = await faiAPI.getFAIReportByNumber(faiNumber);
          set({ currentReport: report, isLoadingDetail: false });
          return report;
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to get FAI report';
          set({ detailError: errorMessage, isLoadingDetail: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * List FAI reports with pagination
       */
      listFAIReports: async (params?: ListFAIReportsParams) => {
        set({ isLoading: true, error: null });
        try {
          const { page, limit } = get().pagination;
          const queryParams = {
            page,
            limit,
            ...params,
          };

          const response = await faiAPI.listFAIReports(queryParams);

          set({
            reports: response.reports,
            pagination: response.pagination,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to list FAI reports';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Update FAI report
       */
      updateFAIReport: async (id: string, data: UpdateFAIReportInput) => {
        set({ isLoading: true, error: null });
        try {
          const report = await faiAPI.updateFAIReport(id, data);
          set({ currentReport: report, isLoading: false });

          // Update in list if present
          const reports = get().reports;
          const updatedReports = reports.map((r) => (r.id === id ? report : r));
          set({ reports: updatedReports });

          return report;
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to update FAI report';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Delete FAI report
       */
      deleteFAIReport: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await faiAPI.deleteFAIReport(id);

          // Remove from list
          const reports = get().reports.filter((r) => r.id !== id);
          set({ reports, isLoading: false });

          // Clear current report if it was deleted
          if (get().currentReport?.id === id) {
            set({ currentReport: null });
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to delete FAI report';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Add characteristic to FAI report
       */
      addCharacteristic: async (faiReportId: string, data: CreateCharacteristicInput) => {
        set({ isLoading: true, error: null });
        try {
          const characteristic = await faiAPI.addCharacteristic(faiReportId, data);

          // Add to characteristics list
          const characteristics = [...get().characteristics, characteristic];
          set({ characteristics, isLoading: false });

          return characteristic;
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to add characteristic';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Get characteristics for FAI report
       */
      getCharacteristics: async (faiReportId: string) => {
        set({ isLoading: true, error: null });
        try {
          const characteristics = await faiAPI.getCharacteristics(faiReportId);
          set({ characteristics, isLoading: false });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to get characteristics';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Update characteristic
       */
      updateCharacteristic: async (
        faiReportId: string,
        characteristicId: string,
        data: UpdateCharacteristicInput
      ) => {
        set({ isLoading: true, error: null });
        try {
          const characteristic = await faiAPI.updateCharacteristic(faiReportId, characteristicId, data);

          // Update in list
          const characteristics = get().characteristics.map((c) =>
            c.id === characteristicId ? characteristic : c
          );
          set({ characteristics, isLoading: false });

          return characteristic;
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to update characteristic';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Delete characteristic
       */
      deleteCharacteristic: async (faiReportId: string, characteristicId: string) => {
        set({ isLoading: true, error: null });
        try {
          await faiAPI.deleteCharacteristic(faiReportId, characteristicId);

          // Remove from list
          const characteristics = get().characteristics.filter((c) => c.id !== characteristicId);
          set({ characteristics, isLoading: false });
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to delete characteristic';
          set({ error: errorMessage, isLoading: false });
          throw new Error(errorMessage);
        }
      },

      /**
       * Approve FAI report
       */
      approveFAIReport: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const report = await faiAPI.approveFAIReport(id);
          set({ currentReport: report, isLoading: false });

          // Update in list if present
          const reports = get().reports;
          const updatedReports = reports.map((r) => (r.id === id ? report : r));
          set({ reports: updatedReports });

          return report;
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || error.message || 'Failed to approve FAI report';
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
        get().listFAIReports();
      },

      /**
       * Set page size
       */
      setPageSize: (pageSize: number) => {
        set((state) => ({
          pagination: { ...state.pagination, limit: pageSize, page: 1 },
        }));
        get().listFAIReports();
      },

      /**
       * Set filters and refresh
       */
      setFilters: (filters: Partial<ListFAIReportsParams>) => {
        get().listFAIReports(filters);
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Clear detail error
       */
      clearDetailError: () => {
        set({ detailError: null });
      },

      /**
       * Reset store to initial state
       */
      reset: () => {
        set(initialState);
      },
    }),
    { name: 'FAIStore' }
  )
);

export default useFAIStore;
