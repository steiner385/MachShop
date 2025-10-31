/**
 * Andon Configuration Store - State management for Andon configuration
 * GitHub Issue #171: Production Alerts & Andon Core Infrastructure
 *
 * Manages global and site-specific configuration state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { andonApi } from '@/api/andon';
import type {
  AndonConfiguration,
  AndonSiteConfiguration
} from '@/types/andon';

interface AndonConfigStoreState {
  // State
  globalConfigurations: AndonConfiguration[];
  siteConfigurations: AndonSiteConfiguration[];
  notificationTemplates: any[];
  systemSettings: any[];
  isLoading: boolean;
  error?: string;

  // Selected context
  selectedSiteId?: string;
  selectedCategory?: string;

  // Actions - Global Configuration
  loadGlobalConfigurations: (category?: string) => Promise<void>;
  createGlobalConfiguration: (data: any) => Promise<AndonConfiguration>;
  updateGlobalConfiguration: (id: string, data: any) => Promise<AndonConfiguration>;
  deleteGlobalConfiguration: (key: string) => Promise<void>;
  getGlobalConfiguration: (key: string, siteId?: string) => Promise<any>;

  // Actions - Site Configuration
  loadSiteConfigurations: (siteId: string) => Promise<void>;
  createSiteConfiguration: (data: any) => Promise<AndonSiteConfiguration>;
  updateSiteConfiguration: (id: string, data: any) => Promise<AndonSiteConfiguration>;
  deleteSiteConfiguration: (siteId: string, key: string) => Promise<void>;

  // Actions - Notification Templates
  loadNotificationTemplates: (siteId?: string) => Promise<void>;
  createNotificationTemplate: (data: any) => Promise<any>;
  updateNotificationTemplate: (id: string, data: any) => Promise<any>;
  deleteNotificationTemplate: (id: string) => Promise<void>;

  // Actions - System Settings
  loadSystemSettings: (siteId?: string) => Promise<void>;
  updateSystemSettings: (data: any) => Promise<any>;

  // Actions - Bulk Operations
  setBulkGlobalConfigurations: (configurations: any[]) => Promise<AndonConfiguration[]>;
  setBulkSiteConfigurations: (siteId: string, configurations: any[]) => Promise<AndonSiteConfiguration[]>;

  // Actions - Validation and Export
  validateConfigurations: (configurations: any[], siteId?: string) => Promise<any>;
  exportConfiguration: (params?: { siteId?: string; includeGlobal?: boolean }) => Promise<any>;

  // State management
  setSelectedSite: (siteId?: string) => void;
  setSelectedCategory: (category?: string) => void;
  clearError: () => void;
  reset: () => void;
}

export const useAndonConfigStore = create<AndonConfigStoreState>()(
  devtools(
    (set, get) => ({
      // Initial state
      globalConfigurations: [],
      siteConfigurations: [],
      notificationTemplates: [],
      systemSettings: [],
      isLoading: false,
      error: undefined,
      selectedSiteId: undefined,
      selectedCategory: undefined,

      // Global Configuration Actions
      loadGlobalConfigurations: async (category?: string) => {
        set({ isLoading: true, error: undefined });

        try {
          const configurations = await andonApi.getGlobalConfigurations({
            category,
            activeOnly: true
          });

          set({
            globalConfigurations: configurations,
            selectedCategory: category,
            isLoading: false
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load global configurations';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      createGlobalConfiguration: async (data: any) => {
        set({ isLoading: true, error: undefined });

        try {
          const configuration = await andonApi.setGlobalConfiguration(data);

          set(state => ({
            globalConfigurations: [...state.globalConfigurations, configuration],
            isLoading: false
          }));

          return configuration;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create global configuration';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      updateGlobalConfiguration: async (id: string, data: any) => {
        set({ isLoading: true, error: undefined });

        try {
          const updatedConfiguration = await andonApi.setGlobalConfiguration({
            ...data,
            id // Include ID for update
          });

          set(state => ({
            globalConfigurations: state.globalConfigurations.map(config =>
              config.id === id ? updatedConfiguration : config
            ),
            isLoading: false
          }));

          return updatedConfiguration;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update global configuration';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      deleteGlobalConfiguration: async (key: string) => {
        set({ isLoading: true, error: undefined });

        try {
          await andonApi.deleteGlobalConfiguration(key);

          set(state => ({
            globalConfigurations: state.globalConfigurations.filter(config =>
              config.configKey !== key
            ),
            isLoading: false
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete global configuration';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      getGlobalConfiguration: async (key: string, siteId?: string) => {
        try {
          return await andonApi.getConfiguration(key, siteId);
        } catch (error) {
          console.error(`Failed to get configuration ${key}:`, error);
          throw error;
        }
      },

      // Site Configuration Actions
      loadSiteConfigurations: async (siteId: string) => {
        set({ isLoading: true, error: undefined, selectedSiteId: siteId });

        try {
          const configurations = await andonApi.getSiteConfigurations(siteId, {
            activeOnly: true
          });

          set({
            siteConfigurations: configurations,
            isLoading: false
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load site configurations';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      createSiteConfiguration: async (data: any) => {
        set({ isLoading: true, error: undefined });

        try {
          const configuration = await andonApi.setSiteConfiguration(data);

          set(state => ({
            siteConfigurations: [...state.siteConfigurations, configuration],
            isLoading: false
          }));

          return configuration;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create site configuration';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      updateSiteConfiguration: async (id: string, data: any) => {
        set({ isLoading: true, error: undefined });

        try {
          const updatedConfiguration = await andonApi.setSiteConfiguration({
            ...data,
            id // Include ID for update
          });

          set(state => ({
            siteConfigurations: state.siteConfigurations.map(config =>
              config.id === id ? updatedConfiguration : config
            ),
            isLoading: false
          }));

          return updatedConfiguration;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update site configuration';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      deleteSiteConfiguration: async (siteId: string, key: string) => {
        set({ isLoading: true, error: undefined });

        try {
          await andonApi.deleteSiteConfiguration(siteId, key);

          set(state => ({
            siteConfigurations: state.siteConfigurations.filter(config =>
              !(config.siteId === siteId && config.configKey === key)
            ),
            isLoading: false
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete site configuration';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Notification Template Actions
      loadNotificationTemplates: async (siteId?: string) => {
        set({ isLoading: true, error: undefined });

        try {
          const templates = await andonApi.getNotificationTemplates({
            siteId,
            activeOnly: true
          });

          set({
            notificationTemplates: templates,
            isLoading: false
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load notification templates';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      createNotificationTemplate: async (data: any) => {
        set({ isLoading: true, error: undefined });

        try {
          const template = await andonApi.createNotificationTemplate(data);

          set(state => ({
            notificationTemplates: [...state.notificationTemplates, template],
            isLoading: false
          }));

          return template;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create notification template';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      updateNotificationTemplate: async (id: string, data: any) => {
        set({ isLoading: true, error: undefined });

        try {
          const updatedTemplate = await andonApi.updateNotificationTemplate(id, data);

          set(state => ({
            notificationTemplates: state.notificationTemplates.map(template =>
              template.id === id ? updatedTemplate : template
            ),
            isLoading: false
          }));

          return updatedTemplate;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update notification template';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      deleteNotificationTemplate: async (id: string) => {
        set({ isLoading: true, error: undefined });

        try {
          // Assuming delete endpoint exists
          // await andonApi.deleteNotificationTemplate(id);

          set(state => ({
            notificationTemplates: state.notificationTemplates.filter(template =>
              template.id !== id
            ),
            isLoading: false
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete notification template';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // System Settings Actions
      loadSystemSettings: async (siteId?: string) => {
        set({ isLoading: true, error: undefined });

        try {
          const settings = await andonApi.getSystemSettings({ siteId });

          set({
            systemSettings: settings,
            isLoading: false
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load system settings';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      updateSystemSettings: async (data: any) => {
        set({ isLoading: true, error: undefined });

        try {
          const updatedSettings = await andonApi.updateSystemSettings(data);

          set(state => ({
            systemSettings: state.systemSettings.map(setting =>
              setting.siteId === data.siteId ? updatedSettings : setting
            ),
            isLoading: false
          }));

          return updatedSettings;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update system settings';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Bulk Operations
      setBulkGlobalConfigurations: async (configurations: any[]) => {
        set({ isLoading: true, error: undefined });

        try {
          const results = await andonApi.setBulkGlobalConfigurations(configurations);

          // Reload all global configurations to get the latest state
          const { loadGlobalConfigurations } = get();
          await loadGlobalConfigurations();

          return results;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to set bulk global configurations';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      setBulkSiteConfigurations: async (siteId: string, configurations: any[]) => {
        set({ isLoading: true, error: undefined });

        try {
          const results = await andonApi.setBulkSiteConfigurations(siteId, configurations);

          // Reload site configurations to get the latest state
          const { loadSiteConfigurations } = get();
          await loadSiteConfigurations(siteId);

          return results;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to set bulk site configurations';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Validation and Export
      validateConfigurations: async (configurations: any[], siteId?: string) => {
        try {
          return await andonApi.validateConfigurations(configurations, siteId);
        } catch (error) {
          console.error('Failed to validate configurations:', error);
          throw error;
        }
      },

      exportConfiguration: async (params = {}) => {
        try {
          return await andonApi.exportConfiguration(params);
        } catch (error) {
          console.error('Failed to export configuration:', error);
          throw error;
        }
      },

      // State Management
      setSelectedSite: (siteId?: string) => {
        set({ selectedSiteId: siteId });
      },

      setSelectedCategory: (category?: string) => {
        set({ selectedCategory: category });
      },

      clearError: () => {
        set({ error: undefined });
      },

      reset: () => {
        set({
          globalConfigurations: [],
          siteConfigurations: [],
          notificationTemplates: [],
          systemSettings: [],
          isLoading: false,
          error: undefined,
          selectedSiteId: undefined,
          selectedCategory: undefined
        });
      }
    }),
    {
      name: 'andon-config-store',
      partialize: (state) => ({
        // Only persist non-sensitive, non-transient state
        selectedSiteId: state.selectedSiteId,
        selectedCategory: state.selectedCategory
      })
    }
  )
);

// Selector hooks for specific data
export const useGlobalConfigurations = () => useAndonConfigStore(state => state.globalConfigurations);
export const useSiteConfigurations = () => useAndonConfigStore(state => state.siteConfigurations);
export const useNotificationTemplates = () => useAndonConfigStore(state => state.notificationTemplates);
export const useSystemSettings = () => useAndonConfigStore(state => state.systemSettings);
export const useAndonConfigLoading = () => useAndonConfigStore(state => state.isLoading);
export const useAndonConfigError = () => useAndonConfigStore(state => state.error);

// Action hooks
export const useAndonConfigActions = () => useAndonConfigStore(state => ({
  loadGlobalConfigurations: state.loadGlobalConfigurations,
  createGlobalConfiguration: state.createGlobalConfiguration,
  updateGlobalConfiguration: state.updateGlobalConfiguration,
  deleteGlobalConfiguration: state.deleteGlobalConfiguration,
  getGlobalConfiguration: state.getGlobalConfiguration,
  loadSiteConfigurations: state.loadSiteConfigurations,
  createSiteConfiguration: state.createSiteConfiguration,
  updateSiteConfiguration: state.updateSiteConfiguration,
  deleteSiteConfiguration: state.deleteSiteConfiguration,
  loadNotificationTemplates: state.loadNotificationTemplates,
  createNotificationTemplate: state.createNotificationTemplate,
  updateNotificationTemplate: state.updateNotificationTemplate,
  deleteNotificationTemplate: state.deleteNotificationTemplate,
  loadSystemSettings: state.loadSystemSettings,
  updateSystemSettings: state.updateSystemSettings,
  setBulkGlobalConfigurations: state.setBulkGlobalConfigurations,
  setBulkSiteConfigurations: state.setBulkSiteConfigurations,
  validateConfigurations: state.validateConfigurations,
  exportConfiguration: state.exportConfiguration,
  setSelectedSite: state.setSelectedSite,
  setSelectedCategory: state.setSelectedCategory,
  clearError: state.clearError,
  reset: state.reset
}));