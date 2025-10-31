import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { settingsAPI } from '@/api/settings';
import {
  UserSettings,
  UserSettingsUpdateRequest,
  DEFAULT_USER_SETTINGS,
  SettingsPermissions,
  ChangePasswordRequest,
  TwoFactorSetupRequest,
} from '@/types/settings';

interface SettingsState {
  settings: UserSettings | null;
  permissions: SettingsPermissions | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastSaved: string | null;
  isDirty: boolean; // Has unsaved changes
}

interface SettingsActions {
  // Settings CRUD operations
  loadSettings: () => Promise<void>;
  updateSettings: (updates: UserSettingsUpdateRequest) => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;

  // Local state management
  setLocalSetting: <K extends keyof UserSettings>(
    category: K,
    updates: Partial<UserSettings[K]>
  ) => void;

  // Security operations
  changePassword: (passwordData: ChangePasswordRequest) => Promise<void>;
  setupTwoFactor: (twoFactorData: TwoFactorSetupRequest) => Promise<any>;

  // Utility actions
  setError: (error: string | null) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  markClean: () => void;
  markDirty: () => void;

  // Export/Import
  exportSettings: () => Promise<UserSettings>;
  importSettings: (settings: Partial<UserSettings>) => Promise<void>;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        settings: null,
        permissions: null,
        isLoading: false,
        isSaving: false,
        error: null,
        lastSaved: null,
        isDirty: false,

        // Load settings from API
        loadSettings: async () => {
          try {
            set({ isLoading: true, error: null });

            const settings = await settingsAPI.getUserSettings();

            set({
              settings,
              isLoading: false,
              isDirty: false,
              lastSaved: new Date().toISOString(),
            });
          } catch (error: any) {
            // If settings don't exist, create with defaults
            if (error.message?.includes('not found') || error.message?.includes('404')) {
              console.log('No existing settings found, using defaults');
              set({
                settings: {
                  ...DEFAULT_USER_SETTINGS,
                  userId: 'current-user', // This will be updated when we integrate with auth
                } as UserSettings,
                isLoading: false,
                isDirty: true, // Mark as dirty so it gets saved
              });
            } else {
              set({
                isLoading: false,
                error: error.message || 'Failed to load settings',
              });
            }
          }
        },

        // Update settings via API
        updateSettings: async (updates: UserSettingsUpdateRequest) => {
          try {
            set({ isSaving: true, error: null });

            const response = await settingsAPI.updateUserSettings(updates);

            set({
              settings: response.data,
              isSaving: false,
              isDirty: false,
              lastSaved: new Date().toISOString(),
            });
          } catch (error: any) {
            set({
              isSaving: false,
              error: error.message || 'Failed to update settings',
            });
            throw error;
          }
        },

        // Save current local settings to API
        saveSettings: async () => {
          const { settings, isDirty } = get();

          if (!settings || !isDirty) {
            return;
          }

          try {
            set({ isSaving: true, error: null });

            const { id, userId, createdAt, updatedAt, ...updateData } = settings;
            const response = await settingsAPI.updateUserSettings(updateData);

            set({
              settings: response.data,
              isSaving: false,
              isDirty: false,
              lastSaved: new Date().toISOString(),
            });
          } catch (error: any) {
            set({
              isSaving: false,
              error: error.message || 'Failed to save settings',
            });
            throw error;
          }
        },

        // Reset settings to defaults
        resetSettings: async () => {
          try {
            set({ isSaving: true, error: null });

            const response = await settingsAPI.resetUserSettings();

            set({
              settings: response.data,
              isSaving: false,
              isDirty: false,
              lastSaved: new Date().toISOString(),
            });
          } catch (error: any) {
            set({
              isSaving: false,
              error: error.message || 'Failed to reset settings',
            });
            throw error;
          }
        },

        // Update local settings without API call
        setLocalSetting: (category, updates) => {
          const { settings } = get();
          if (!settings) return;

          const updatedSettings = {
            ...settings,
            [category]: {
              ...settings[category],
              ...updates,
            },
          };

          set({
            settings: updatedSettings,
            isDirty: true,
          });
        },

        // Security operations
        changePassword: async (passwordData: ChangePasswordRequest) => {
          try {
            set({ isSaving: true, error: null });

            await settingsAPI.changePassword(passwordData);

            set({
              isSaving: false,
            });
          } catch (error: any) {
            set({
              isSaving: false,
              error: error.message || 'Failed to change password',
            });
            throw error;
          }
        },

        setupTwoFactor: async (twoFactorData: TwoFactorSetupRequest) => {
          try {
            set({ isSaving: true, error: null });

            const response = await settingsAPI.setupTwoFactor(twoFactorData);

            // Update local security settings
            const { settings } = get();
            if (settings) {
              set({
                settings: {
                  ...settings,
                  security: {
                    ...settings.security,
                    twoFactorEnabled: twoFactorData.enabled,
                  },
                },
                isSaving: false,
                isDirty: true,
              });
            } else {
              set({ isSaving: false });
            }

            return response;
          } catch (error: any) {
            set({
              isSaving: false,
              error: error.message || 'Failed to setup two-factor authentication',
            });
            throw error;
          }
        },

        // Export settings
        exportSettings: async () => {
          try {
            const response = await settingsAPI.exportUserSettings();
            return response.data;
          } catch (error: any) {
            set({
              error: error.message || 'Failed to export settings',
            });
            throw error;
          }
        },

        // Import settings
        importSettings: async (importedSettings: Partial<UserSettings>) => {
          try {
            set({ isSaving: true, error: null });

            const response = await settingsAPI.importUserSettings(importedSettings);

            set({
              settings: response.data,
              isSaving: false,
              isDirty: false,
              lastSaved: new Date().toISOString(),
            });
          } catch (error: any) {
            set({
              isSaving: false,
              error: error.message || 'Failed to import settings',
            });
            throw error;
          }
        },

        // Utility actions
        setError: (error: string | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },

        setSaving: (saving: boolean) => {
          set({ isSaving: saving });
        },

        markClean: () => {
          set({ isDirty: false });
        },

        markDirty: () => {
          set({ isDirty: true });
        },
      }),
      {
        name: 'mes-settings-storage',
        partialize: (state) => ({
          settings: state.settings,
          lastSaved: state.lastSaved,
        }),
      }
    ),
    {
      name: 'settings-store',
    }
  )
);

// Selector hooks for specific settings categories
export const useUserPreferences = () => {
  const settings = useSettingsStore((state) => state.settings);
  return settings?.preferences || DEFAULT_USER_SETTINGS.preferences;
};

export const useNotificationSettings = () => {
  const settings = useSettingsStore((state) => state.settings);
  return settings?.notifications || DEFAULT_USER_SETTINGS.notifications;
};

export const useSecuritySettings = () => {
  const settings = useSettingsStore((state) => state.settings);
  return settings?.security || DEFAULT_USER_SETTINGS.security;
};

export const useDisplaySettings = () => {
  const settings = useSettingsStore((state) => state.settings);
  return settings?.display || DEFAULT_USER_SETTINGS.display;
};

// Utility hooks
export const useSettingsActions = () => {
  const {
    loadSettings,
    updateSettings,
    saveSettings,
    resetSettings,
    setLocalSetting,
    changePassword,
    setupTwoFactor,
    exportSettings,
    importSettings,
  } = useSettingsStore();

  return {
    loadSettings,
    updateSettings,
    saveSettings,
    resetSettings,
    setLocalSetting,
    changePassword,
    setupTwoFactor,
    exportSettings,
    importSettings,
  };
};

export const useSettingsState = () => {
  const {
    isLoading,
    isSaving,
    error,
    isDirty,
    lastSaved,
  } = useSettingsStore();

  return {
    isLoading,
    isSaving,
    error,
    isDirty,
    lastSaved,
  };
};