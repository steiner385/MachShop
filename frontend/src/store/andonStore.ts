/**
 * Andon Store - State management for Andon system
 * GitHub Issue #171: Production Alerts & Andon Core Infrastructure
 *
 * Uses Zustand for state management following existing patterns
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { andonApi } from '@/api/andon';
import type {
  AndonAlert,
  AndonIssueType,
  AndonEscalationRule,
  AndonSystemStats,
  AndonAlertFilters,
  PaginationOptions,
  AndonAlertListResult,
  CreateAndonAlertData,
  UpdateAndonAlertData,
  AndonStore
} from '@/types/andon';

interface AndonStoreState {
  // State
  alerts: AndonAlert[];
  activeAlerts: AndonAlert[];
  issueTypes: AndonIssueType[];
  escalationRules: AndonEscalationRule[];
  systemStats?: AndonSystemStats;
  isLoading: boolean;
  error?: string;

  // Pagination state
  currentPage: number;
  pageSize: number;
  totalAlerts: number;
  totalPages: number;

  // Filter state
  activeFilters: AndonAlertFilters;
  searchTerm?: string;

  // Actions
  loadAlerts: (filters?: AndonAlertFilters, pagination?: PaginationOptions) => Promise<AndonAlertListResult>;
  loadActiveAlerts: (siteId?: string) => Promise<void>;
  loadIssueTypes: (siteId?: string, activeOnly?: boolean) => Promise<void>;
  loadEscalationRules: (siteId?: string, issueTypeId?: string) => Promise<void>;
  loadSystemStats: (siteId?: string, dateRange?: { from: Date; to: Date }) => Promise<void>;

  createAlert: (data: CreateAndonAlertData) => Promise<AndonAlert>;
  updateAlert: (id: string, data: UpdateAndonAlertData) => Promise<AndonAlert>;
  closeAlert: (id: string, resolutionNotes?: string, resolutionActionTaken?: string) => Promise<AndonAlert>;
  escalateAlert: (id: string) => Promise<any>;

  createIssueType: (data: any) => Promise<AndonIssueType>;
  updateIssueType: (id: string, data: any) => Promise<AndonIssueType>;

  createEscalationRule: (data: any) => Promise<AndonEscalationRule>;
  updateEscalationRule: (id: string, data: any) => Promise<AndonEscalationRule>;

  // Utility actions
  searchAlerts: (searchTerm: string, filters?: AndonAlertFilters) => Promise<AndonAlertListResult>;
  getOverdueAlerts: (siteId?: string) => Promise<AndonAlert[]>;
  processEscalations: (siteId?: string) => Promise<any>;

  setFilters: (filters: AndonAlertFilters) => void;
  setSearchTerm: (searchTerm: string) => void;
  setPagination: (page: number, pageSize: number) => void;

  clearError: () => void;
  reset: () => void;
}

export const useAndonStore = create<AndonStoreState>()(
  devtools(
    (set, get) => ({
      // Initial state
      alerts: [],
      activeAlerts: [],
      issueTypes: [],
      escalationRules: [],
      systemStats: undefined,
      isLoading: false,
      error: undefined,

      // Pagination state
      currentPage: 1,
      pageSize: 20,
      totalAlerts: 0,
      totalPages: 0,

      // Filter state
      activeFilters: {},
      searchTerm: undefined,

      // Actions
      loadAlerts: async (filters = {}, pagination = {}) => {
        set({ isLoading: true, error: undefined });

        try {
          const result = await andonApi.getAlerts({
            ...filters,
            ...pagination
          });

          set({
            alerts: result.alerts,
            currentPage: result.page,
            pageSize: result.pageSize,
            totalAlerts: result.total,
            totalPages: result.totalPages,
            activeFilters: filters,
            isLoading: false
          });

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load alerts';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      loadActiveAlerts: async (siteId?: string) => {
        try {
          const filters: AndonAlertFilters = {
            status: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED'],
            ...(siteId && { siteId })
          };

          const result = await andonApi.getAlerts(filters);
          set({ activeAlerts: result.alerts });
        } catch (error) {
          console.error('Failed to load active alerts:', error);
          set({ error: 'Failed to load active alerts' });
        }
      },

      loadIssueTypes: async (siteId?: string, activeOnly = true) => {
        set({ isLoading: true, error: undefined });

        try {
          const issueTypes = await andonApi.getIssueTypes({ siteId, activeOnly });
          set({ issueTypes, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load issue types';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      loadEscalationRules: async (siteId?: string, issueTypeId?: string) => {
        set({ isLoading: true, error: undefined });

        try {
          const escalationRules = await andonApi.getEscalationRules({ siteId, issueTypeId });
          set({ escalationRules, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load escalation rules';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      loadSystemStats: async (siteId?: string, dateRange?: { from: Date; to: Date }) => {
        try {
          const systemStats = await andonApi.getSystemStats({ siteId, dateRange });
          set({ systemStats });
        } catch (error) {
          console.error('Failed to load system stats:', error);
          set({ error: 'Failed to load system statistics' });
        }
      },

      createAlert: async (data: CreateAndonAlertData) => {
        set({ isLoading: true, error: undefined });

        try {
          const alert = await andonApi.createAlert(data);

          // Add to alerts array and active alerts if applicable
          set(state => ({
            alerts: [alert, ...state.alerts],
            activeAlerts: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED'].includes(alert.status)
              ? [alert, ...state.activeAlerts]
              : state.activeAlerts,
            isLoading: false
          }));

          return alert;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create alert';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      updateAlert: async (id: string, data: UpdateAndonAlertData) => {
        set({ isLoading: true, error: undefined });

        try {
          const updatedAlert = await andonApi.updateAlert(id, data);

          // Update in alerts array
          set(state => ({
            alerts: state.alerts.map(alert =>
              alert.id === id ? updatedAlert : alert
            ),
            activeAlerts: state.activeAlerts.map(alert =>
              alert.id === id ? updatedAlert : alert
            ).filter(alert =>
              ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED'].includes(alert.status)
            ),
            isLoading: false
          }));

          return updatedAlert;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update alert';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      closeAlert: async (id: string, resolutionNotes?: string, resolutionActionTaken?: string) => {
        set({ isLoading: true, error: undefined });

        try {
          const closedAlert = await andonApi.closeAlert(id, {
            resolutionNotes,
            resolutionActionTaken
          });

          // Update in alerts array and remove from active alerts
          set(state => ({
            alerts: state.alerts.map(alert =>
              alert.id === id ? closedAlert : alert
            ),
            activeAlerts: state.activeAlerts.filter(alert => alert.id !== id),
            isLoading: false
          }));

          return closedAlert;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to close alert';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      escalateAlert: async (id: string) => {
        set({ isLoading: true, error: undefined });

        try {
          const result = await andonApi.escalateAlert(id);

          // Reload active alerts to get updated status
          const { loadActiveAlerts } = get();
          await loadActiveAlerts();

          set({ isLoading: false });
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to escalate alert';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      createIssueType: async (data: any) => {
        set({ isLoading: true, error: undefined });

        try {
          const issueType = await andonApi.createIssueType(data);

          set(state => ({
            issueTypes: [...state.issueTypes, issueType],
            isLoading: false
          }));

          return issueType;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create issue type';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      updateIssueType: async (id: string, data: any) => {
        set({ isLoading: true, error: undefined });

        try {
          const updatedIssueType = await andonApi.updateIssueType(id, data);

          set(state => ({
            issueTypes: state.issueTypes.map(type =>
              type.id === id ? updatedIssueType : type
            ),
            isLoading: false
          }));

          return updatedIssueType;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update issue type';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      createEscalationRule: async (data: any) => {
        set({ isLoading: true, error: undefined });

        try {
          const rule = await andonApi.createEscalationRule(data);

          set(state => ({
            escalationRules: [...state.escalationRules, rule],
            isLoading: false
          }));

          return rule;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create escalation rule';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      updateEscalationRule: async (id: string, data: any) => {
        set({ isLoading: true, error: undefined });

        try {
          const updatedRule = await andonApi.updateEscalationRule(id, data);

          set(state => ({
            escalationRules: state.escalationRules.map(rule =>
              rule.id === id ? updatedRule : rule
            ),
            isLoading: false
          }));

          return updatedRule;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update escalation rule';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Utility actions
      searchAlerts: async (searchTerm: string, filters = {}) => {
        set({ isLoading: true, error: undefined, searchTerm });

        try {
          const result = await andonApi.getAlerts({
            ...filters,
            search: searchTerm
          });

          set({
            alerts: result.alerts,
            currentPage: result.page,
            pageSize: result.pageSize,
            totalAlerts: result.total,
            totalPages: result.totalPages,
            activeFilters: { ...filters, search: searchTerm },
            isLoading: false
          });

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to search alerts';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      getOverdueAlerts: async (siteId?: string) => {
        try {
          const overdueAlerts = await andonApi.getOverdueAlerts({ siteId });
          return overdueAlerts;
        } catch (error) {
          console.error('Failed to load overdue alerts:', error);
          throw error;
        }
      },

      processEscalations: async (siteId?: string) => {
        try {
          const result = await andonApi.processEscalations({ siteId });

          // Reload active alerts after processing
          const { loadActiveAlerts } = get();
          await loadActiveAlerts(siteId);

          return result;
        } catch (error) {
          console.error('Failed to process escalations:', error);
          throw error;
        }
      },

      // State management actions
      setFilters: (filters: AndonAlertFilters) => {
        set({ activeFilters: filters });
      },

      setSearchTerm: (searchTerm: string) => {
        set({ searchTerm });
      },

      setPagination: (page: number, pageSize: number) => {
        set({ currentPage: page, pageSize });
      },

      clearError: () => {
        set({ error: undefined });
      },

      reset: () => {
        set({
          alerts: [],
          activeAlerts: [],
          issueTypes: [],
          escalationRules: [],
          systemStats: undefined,
          isLoading: false,
          error: undefined,
          currentPage: 1,
          pageSize: 20,
          totalAlerts: 0,
          totalPages: 0,
          activeFilters: {},
          searchTerm: undefined
        });
      }
    }),
    {
      name: 'andon-store',
      partialize: (state) => ({
        // Only persist non-sensitive, non-transient state
        pageSize: state.pageSize,
        activeFilters: state.activeFilters
      })
    }
  )
);

// Selector hooks for specific data
export const useAndonAlerts = () => useAndonStore(state => state.alerts);
export const useActiveAndonAlerts = () => useAndonStore(state => state.activeAlerts);
export const useAndonIssueTypes = () => useAndonStore(state => state.issueTypes);
export const useAndonEscalationRules = () => useAndonStore(state => state.escalationRules);
export const useAndonSystemStats = () => useAndonStore(state => state.systemStats);
export const useAndonLoading = () => useAndonStore(state => state.isLoading);
export const useAndonError = () => useAndonStore(state => state.error);

// Action hooks
export const useAndonActions = () => useAndonStore(state => ({
  loadAlerts: state.loadAlerts,
  loadActiveAlerts: state.loadActiveAlerts,
  loadIssueTypes: state.loadIssueTypes,
  loadEscalationRules: state.loadEscalationRules,
  loadSystemStats: state.loadSystemStats,
  createAlert: state.createAlert,
  updateAlert: state.updateAlert,
  closeAlert: state.closeAlert,
  escalateAlert: state.escalateAlert,
  createIssueType: state.createIssueType,
  updateIssueType: state.updateIssueType,
  createEscalationRule: state.createEscalationRule,
  updateEscalationRule: state.updateEscalationRule,
  searchAlerts: state.searchAlerts,
  getOverdueAlerts: state.getOverdueAlerts,
  processEscalations: state.processEscalations,
  setFilters: state.setFilters,
  setSearchTerm: state.setSearchTerm,
  setPagination: state.setPagination,
  clearError: state.clearError,
  reset: state.reset
}));