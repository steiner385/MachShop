import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSettingsStore } from '../settingsStore';
import { settingsAPI } from '@/api/settings';
import { DEFAULT_USER_SETTINGS } from '@/types/settings';

// Mock the settings API
vi.mock('@/api/settings');

const mockSettingsAPI = settingsAPI as any;

describe('settingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store state
    useSettingsStore.setState({
      settings: null,
      permissions: null,
      isLoading: false,
      isSaving: false,
      error: null,
      lastSaved: null,
      isDirty: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useSettingsStore.getState();

      expect(state.settings).toBeNull();
      expect(state.permissions).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isSaving).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastSaved).toBeNull();
      expect(state.isDirty).toBe(false);
    });
  });

  describe('loadSettings', () => {
    it('should load settings successfully', async () => {
      const mockSettings = { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' };
      mockSettingsAPI.getUserSettings.mockResolvedValue(mockSettings);

      const { loadSettings } = useSettingsStore.getState();
      await loadSettings();

      const state = useSettingsStore.getState();
      expect(state.settings).toEqual(mockSettings);
      expect(state.isLoading).toBe(false);
      expect(state.isDirty).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastSaved).toBeTruthy();
    });

    it('should handle 404 error and create default settings', async () => {
      const error = new Error('Settings not found');
      mockSettingsAPI.getUserSettings.mockRejectedValue(error);

      const { loadSettings } = useSettingsStore.getState();
      await loadSettings();

      const state = useSettingsStore.getState();
      expect(state.settings).toMatchObject(DEFAULT_USER_SETTINGS);
      expect(state.isLoading).toBe(false);
      expect(state.isDirty).toBe(true); // Should be dirty to trigger save
    });

    it('should handle other errors', async () => {
      const error = new Error('Network error');
      mockSettingsAPI.getUserSettings.mockRejectedValue(error);

      const { loadSettings } = useSettingsStore.getState();
      await loadSettings();

      const state = useSettingsStore.getState();
      expect(state.settings).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockSettingsAPI.getUserSettings.mockReturnValue(promise);

      const { loadSettings } = useSettingsStore.getState();
      const loadPromise = loadSettings();

      // Check loading state
      const loadingState = useSettingsStore.getState();
      expect(loadingState.isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!({ ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' });
      await loadPromise;

      // Check final state
      const finalState = useSettingsStore.getState();
      expect(finalState.isLoading).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      const mockResponse = {
        success: true,
        data: { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' },
      };
      mockSettingsAPI.updateUserSettings.mockResolvedValue(mockResponse);

      const { updateSettings } = useSettingsStore.getState();
      const updates = { preferences: { theme: 'dark' } };
      await updateSettings(updates);

      const state = useSettingsStore.getState();
      expect(state.settings).toEqual(mockResponse.data);
      expect(state.isSaving).toBe(false);
      expect(state.isDirty).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastSaved).toBeTruthy();
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockSettingsAPI.updateUserSettings.mockRejectedValue(error);

      const { updateSettings } = useSettingsStore.getState();
      const updates = { preferences: { theme: 'dark' } };

      await expect(updateSettings(updates)).rejects.toThrow('Update failed');

      const state = useSettingsStore.getState();
      expect(state.isSaving).toBe(false);
      expect(state.error).toBe('Update failed');
    });

    it('should set saving state during update', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockSettingsAPI.updateUserSettings.mockReturnValue(promise);

      const { updateSettings } = useSettingsStore.getState();
      const updatePromise = updateSettings({ preferences: { theme: 'dark' } });

      // Check saving state
      const savingState = useSettingsStore.getState();
      expect(savingState.isSaving).toBe(true);

      // Resolve the promise
      const mockResponse = {
        success: true,
        data: { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' },
      };
      resolvePromise!(mockResponse);
      await updatePromise;

      // Check final state
      const finalState = useSettingsStore.getState();
      expect(finalState.isSaving).toBe(false);
    });
  });

  describe('saveSettings', () => {
    it('should save current settings when dirty', async () => {
      const currentSettings = { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' };
      const mockResponse = {
        success: true,
        data: currentSettings,
      };

      // Set initial state
      useSettingsStore.setState({
        settings: currentSettings,
        isDirty: true,
      });

      mockSettingsAPI.updateUserSettings.mockResolvedValue(mockResponse);

      const { saveSettings } = useSettingsStore.getState();
      await saveSettings();

      expect(mockSettingsAPI.updateUserSettings).toHaveBeenCalledWith({
        preferences: currentSettings.preferences,
        notifications: currentSettings.notifications,
        security: currentSettings.security,
        display: currentSettings.display,
      });

      const state = useSettingsStore.getState();
      expect(state.isDirty).toBe(false);
      expect(state.lastSaved).toBeTruthy();
    });

    it('should not save when not dirty', async () => {
      const currentSettings = { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' };

      // Set initial state as clean
      useSettingsStore.setState({
        settings: currentSettings,
        isDirty: false,
      });

      const { saveSettings } = useSettingsStore.getState();
      await saveSettings();

      expect(mockSettingsAPI.updateUserSettings).not.toHaveBeenCalled();
    });

    it('should not save when no settings', async () => {
      useSettingsStore.setState({
        settings: null,
        isDirty: true,
      });

      const { saveSettings } = useSettingsStore.getState();
      await saveSettings();

      expect(mockSettingsAPI.updateUserSettings).not.toHaveBeenCalled();
    });
  });

  describe('resetSettings', () => {
    it('should reset settings to defaults', async () => {
      const mockResponse = {
        success: true,
        data: { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' },
      };
      mockSettingsAPI.resetUserSettings.mockResolvedValue(mockResponse);

      const { resetSettings } = useSettingsStore.getState();
      await resetSettings();

      const state = useSettingsStore.getState();
      expect(state.settings).toEqual(mockResponse.data);
      expect(state.isSaving).toBe(false);
      expect(state.isDirty).toBe(false);
      expect(state.lastSaved).toBeTruthy();
    });

    it('should handle reset errors', async () => {
      const error = new Error('Reset failed');
      mockSettingsAPI.resetUserSettings.mockRejectedValue(error);

      const { resetSettings } = useSettingsStore.getState();

      await expect(resetSettings()).rejects.toThrow('Reset failed');

      const state = useSettingsStore.getState();
      expect(state.isSaving).toBe(false);
      expect(state.error).toBe('Reset failed');
    });
  });

  describe('setLocalSetting', () => {
    it('should update local settings and mark as dirty', () => {
      const currentSettings = { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' };

      useSettingsStore.setState({
        settings: currentSettings,
        isDirty: false,
      });

      const { setLocalSetting } = useSettingsStore.getState();
      setLocalSetting('preferences', { theme: 'dark' });

      const state = useSettingsStore.getState();
      expect(state.settings?.preferences.theme).toBe('dark');
      expect(state.isDirty).toBe(true);
    });

    it('should not update when no settings', () => {
      useSettingsStore.setState({
        settings: null,
        isDirty: false,
      });

      const { setLocalSetting } = useSettingsStore.getState();
      setLocalSetting('preferences', { theme: 'dark' });

      const state = useSettingsStore.getState();
      expect(state.settings).toBeNull();
      expect(state.isDirty).toBe(false);
    });

    it('should merge updates with existing settings', () => {
      const currentSettings = {
        ...DEFAULT_USER_SETTINGS,
        id: 'test-1',
        userId: 'user-1',
        preferences: {
          ...DEFAULT_USER_SETTINGS.preferences,
          language: 'es',
        },
      };

      useSettingsStore.setState({
        settings: currentSettings,
        isDirty: false,
      });

      const { setLocalSetting } = useSettingsStore.getState();
      setLocalSetting('preferences', { theme: 'dark' });

      const state = useSettingsStore.getState();
      expect(state.settings?.preferences.theme).toBe('dark');
      expect(state.settings?.preferences.language).toBe('es'); // Should preserve existing values
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockSettingsAPI.changePassword.mockResolvedValue({ success: true });

      const { changePassword } = useSettingsStore.getState();
      const passwordData = {
        currentPassword: 'old123',
        newPassword: 'new456',
        confirmPassword: 'new456',
      };

      await changePassword(passwordData);

      expect(mockSettingsAPI.changePassword).toHaveBeenCalledWith(passwordData);

      const state = useSettingsStore.getState();
      expect(state.isSaving).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle password change errors', async () => {
      const error = new Error('Password change failed');
      mockSettingsAPI.changePassword.mockRejectedValue(error);

      const { changePassword } = useSettingsStore.getState();
      const passwordData = {
        currentPassword: 'old123',
        newPassword: 'new456',
        confirmPassword: 'new456',
      };

      await expect(changePassword(passwordData)).rejects.toThrow('Password change failed');

      const state = useSettingsStore.getState();
      expect(state.isSaving).toBe(false);
      expect(state.error).toBe('Password change failed');
    });
  });

  describe('setupTwoFactor', () => {
    it('should setup two-factor authentication successfully', async () => {
      const mockResponse = {
        success: true,
        qrCode: 'data:image/png;base64,mockqrcode',
        backupCodes: ['code1', 'code2'],
      };
      mockSettingsAPI.setupTwoFactor.mockResolvedValue(mockResponse);

      const currentSettings = { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' };
      useSettingsStore.setState({ settings: currentSettings });

      const { setupTwoFactor } = useSettingsStore.getState();
      const result = await setupTwoFactor({ enabled: true });

      expect(result).toEqual(mockResponse);
      expect(mockSettingsAPI.setupTwoFactor).toHaveBeenCalledWith({ enabled: true });

      const state = useSettingsStore.getState();
      expect(state.settings?.security.twoFactorEnabled).toBe(true);
      expect(state.isDirty).toBe(true);
    });

    it('should disable two-factor authentication', async () => {
      const mockResponse = { success: true };
      mockSettingsAPI.setupTwoFactor.mockResolvedValue(mockResponse);

      const currentSettings = {
        ...DEFAULT_USER_SETTINGS,
        id: 'test-1',
        userId: 'user-1',
        security: {
          ...DEFAULT_USER_SETTINGS.security,
          twoFactorEnabled: true,
        },
      };
      useSettingsStore.setState({ settings: currentSettings });

      const { setupTwoFactor } = useSettingsStore.getState();
      await setupTwoFactor({ enabled: false });

      const state = useSettingsStore.getState();
      expect(state.settings?.security.twoFactorEnabled).toBe(false);
    });
  });

  describe('exportSettings', () => {
    it('should export settings successfully', async () => {
      const mockExportData = {
        data: { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' },
        exportedAt: '2023-01-01T00:00:00Z',
      };
      mockSettingsAPI.exportUserSettings.mockResolvedValue(mockExportData);

      const { exportSettings } = useSettingsStore.getState();
      const result = await exportSettings();

      expect(result).toEqual(mockExportData.data);
      expect(mockSettingsAPI.exportUserSettings).toHaveBeenCalled();
    });

    it('should handle export errors', async () => {
      const error = new Error('Export failed');
      mockSettingsAPI.exportUserSettings.mockRejectedValue(error);

      const { exportSettings } = useSettingsStore.getState();

      await expect(exportSettings()).rejects.toThrow('Export failed');

      const state = useSettingsStore.getState();
      expect(state.error).toBe('Export failed');
    });
  });

  describe('importSettings', () => {
    it('should import settings successfully', async () => {
      const importData = { preferences: { theme: 'dark' } };
      const mockResponse = {
        success: true,
        data: { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' },
      };
      mockSettingsAPI.importUserSettings.mockResolvedValue(mockResponse);

      const { importSettings } = useSettingsStore.getState();
      await importSettings(importData);

      expect(mockSettingsAPI.importUserSettings).toHaveBeenCalledWith(importData);

      const state = useSettingsStore.getState();
      expect(state.settings).toEqual(mockResponse.data);
      expect(state.isDirty).toBe(false);
      expect(state.lastSaved).toBeTruthy();
    });

    it('should handle import errors', async () => {
      const error = new Error('Import failed');
      mockSettingsAPI.importUserSettings.mockRejectedValue(error);

      const { importSettings } = useSettingsStore.getState();

      await expect(importSettings({})).rejects.toThrow('Import failed');

      const state = useSettingsStore.getState();
      expect(state.isSaving).toBe(false);
      expect(state.error).toBe('Import failed');
    });
  });

  describe('Utility Actions', () => {
    it('should set error', () => {
      const { setError } = useSettingsStore.getState();
      setError('Test error');

      const state = useSettingsStore.getState();
      expect(state.error).toBe('Test error');
    });

    it('should clear error', () => {
      useSettingsStore.setState({ error: 'Test error' });

      const { clearError } = useSettingsStore.getState();
      clearError();

      const state = useSettingsStore.getState();
      expect(state.error).toBeNull();
    });

    it('should set loading state', () => {
      const { setLoading } = useSettingsStore.getState();
      setLoading(true);

      const state = useSettingsStore.getState();
      expect(state.isLoading).toBe(true);
    });

    it('should set saving state', () => {
      const { setSaving } = useSettingsStore.getState();
      setSaving(true);

      const state = useSettingsStore.getState();
      expect(state.isSaving).toBe(true);
    });

    it('should mark as clean', () => {
      useSettingsStore.setState({ isDirty: true });

      const { markClean } = useSettingsStore.getState();
      markClean();

      const state = useSettingsStore.getState();
      expect(state.isDirty).toBe(false);
    });

    it('should mark as dirty', () => {
      useSettingsStore.setState({ isDirty: false });

      const { markDirty } = useSettingsStore.getState();
      markDirty();

      const state = useSettingsStore.getState();
      expect(state.isDirty).toBe(true);
    });
  });

  describe('Selector Hooks', () => {
    it('should return user preferences with defaults', () => {
      const { useUserPreferences } = require('../settingsStore');

      // Test with no settings
      useSettingsStore.setState({ settings: null });
      expect(useUserPreferences()).toEqual(DEFAULT_USER_SETTINGS.preferences);

      // Test with settings
      const customSettings = {
        ...DEFAULT_USER_SETTINGS,
        preferences: { ...DEFAULT_USER_SETTINGS.preferences, theme: 'dark' as const },
      };
      useSettingsStore.setState({ settings: customSettings });
      expect(useUserPreferences()).toEqual(customSettings.preferences);
    });

    it('should return notification settings with defaults', () => {
      const { useNotificationSettings } = require('../settingsStore');

      // Test with no settings
      useSettingsStore.setState({ settings: null });
      expect(useNotificationSettings()).toEqual(DEFAULT_USER_SETTINGS.notifications);
    });

    it('should return security settings with defaults', () => {
      const { useSecuritySettings } = require('../settingsStore');

      // Test with no settings
      useSettingsStore.setState({ settings: null });
      expect(useSecuritySettings()).toEqual(DEFAULT_USER_SETTINGS.security);
    });

    it('should return display settings with defaults', () => {
      const { useDisplaySettings } = require('../settingsStore');

      // Test with no settings
      useSettingsStore.setState({ settings: null });
      expect(useDisplaySettings()).toEqual(DEFAULT_USER_SETTINGS.display);
    });
  });
});