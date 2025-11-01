import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../SettingsPage';
import { DEFAULT_USER_SETTINGS } from '@/types/settings';

/**
 * Integration Tests for Settings Page
 *
 * These tests validate the acceptance criteria from GitHub Issue #282:
 * 1. ✅ User preferences (theme, language, layout)
 * 2. ✅ Theme options (light, dark, auto)
 * 3. ✅ Notifications settings (granular controls)
 * 4. ✅ RBAC integration (role-based access)
 * 5. ✅ Accessibility compliance (WCAG 2.1 Level AA)
 */

// Mock dependencies
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    ...DEFAULT_USER_SETTINGS,
    id: 'test-settings',
    userId: 'test-user',
  })),
  useSettingsActions: vi.fn(() => ({
    loadSettings: vi.fn(),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    resetSettings: vi.fn().mockResolvedValue(undefined),
    setLocalSetting: vi.fn(),
    changePassword: vi.fn().mockResolvedValue(undefined),
    setupTwoFactor: vi.fn().mockResolvedValue({ success: true }),
    exportSettings: vi.fn().mockResolvedValue(DEFAULT_USER_SETTINGS),
    importSettings: vi.fn().mockResolvedValue(undefined),
  })),
  useSettingsState: vi.fn(() => ({
    isLoading: false,
    isSaving: false,
    error: null,
    isDirty: false,
    lastSaved: null,
  })),
}));

vi.mock('@/store/AuthStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: {
      id: 'test-user',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['Operator'],
      permissions: ['workorders.read'],
      isActive: true,
    },
  })),
  usePermissionCheck: vi.fn(() => ({
    hasPermission: vi.fn(() => true),
    hasRole: vi.fn(() => true),
    hasAnyRole: vi.fn(() => true),
    hasAllRoles: vi.fn(() => true),
    hasAnyPermission: vi.fn(() => true),
    hasAllPermissions: vi.fn(() => true),
    permissions: ['*'],
    roles: ['System Administrator'],
  })),
}));

vi.mock('@/components/common/ChartAccessibility', () => ({
  AccessibleChartWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('antd', async () => {
  const antd = await vi.importActual('antd');
  return {
    ...antd,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  };
});

describe('Settings Page Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Acceptance Criteria Validation', () => {
    describe('AC1: User Preferences Configuration', () => {
      it('should allow users to configure theme preferences', async () => {
        const user = userEvent.setup();
        const mockSetLocalSetting = vi.fn();

        const { useSettingsActions } = await import('@/store/settingsStore');
        (useSettingsActions as any).mockReturnValue({
          loadSettings: vi.fn(),
          saveSettings: vi.fn(),
          resetSettings: vi.fn(),
          setLocalSetting: mockSetLocalSetting,
          changePassword: vi.fn(),
          setupTwoFactor: vi.fn(),
          exportSettings: vi.fn(),
          importSettings: vi.fn(),
        });

        render(<SettingsPage />);

        // Verify theme options are available
        const themeSelect = screen.getByLabelText('Select theme preference');
        expect(themeSelect).toBeInTheDocument();

        // Test theme selection
        await user.selectOptions(themeSelect, 'dark');
        expect(mockSetLocalSetting).toHaveBeenCalledWith('preferences', { theme: 'dark' });
      });

      it('should allow users to configure language preferences', async () => {
        const user = userEvent.setup();
        const mockSetLocalSetting = vi.fn();

        const { useSettingsActions } = await import('@/store/settingsStore');
        (useSettingsActions as any).mockReturnValue({
          loadSettings: vi.fn(),
          saveSettings: vi.fn(),
          resetSettings: vi.fn(),
          setLocalSetting: mockSetLocalSetting,
          changePassword: vi.fn(),
          setupTwoFactor: vi.fn(),
          exportSettings: vi.fn(),
          importSettings: vi.fn(),
        });

        render(<SettingsPage />);

        // Verify language options are available
        const languageSelect = screen.getByLabelText('Select language preference');
        expect(languageSelect).toBeInTheDocument();

        // Test language selection
        await user.selectOptions(languageSelect, 'es');
        expect(mockSetLocalSetting).toHaveBeenCalledWith('preferences', { language: 'es' });
      });

      it('should allow users to configure layout preferences', async () => {
        const user = userEvent.setup();
        const mockSetLocalSetting = vi.fn();

        const { useSettingsActions } = await import('@/store/settingsStore');
        (useSettingsActions as any).mockReturnValue({
          loadSettings: vi.fn(),
          saveSettings: vi.fn(),
          resetSettings: vi.fn(),
          setLocalSetting: mockSetLocalSetting,
          changePassword: vi.fn(),
          setupTwoFactor: vi.fn(),
          exportSettings: vi.fn(),
          importSettings: vi.fn(),
        });

        render(<SettingsPage />);

        // Verify compact layout toggle is available
        const compactToggle = screen.getByLabelText('Toggle compact layout');
        expect(compactToggle).toBeInTheDocument();

        // Test compact layout toggle
        await user.click(compactToggle);
        expect(mockSetLocalSetting).toHaveBeenCalledWith('preferences', { compactLayout: true });
      });
    });

    describe('AC2: Theme Options (Light, Dark, Auto)', () => {
      it('should provide all required theme options', () => {
        render(<SettingsPage />);

        const themeSelect = screen.getByLabelText('Select theme preference');
        expect(themeSelect).toBeInTheDocument();

        // Check that all theme options are available
        const lightOption = screen.getByDisplayValue('light');
        const darkOption = screen.getByText('Dark');
        const autoOption = screen.getByText('Auto');

        expect(lightOption).toBeInTheDocument();
        expect(darkOption).toBeInTheDocument();
        expect(autoOption).toBeInTheDocument();
      });

      it('should show current theme selection', () => {
        const { useSettingsStore } = require('@/store/settingsStore');
        (useSettingsStore as any).mockReturnValue({
          ...DEFAULT_USER_SETTINGS,
          preferences: {
            ...DEFAULT_USER_SETTINGS.preferences,
            theme: 'dark',
          },
        });

        render(<SettingsPage />);

        const themeSelect = screen.getByLabelText('Select theme preference');
        expect(themeSelect).toHaveValue('dark');
      });
    });

    describe('AC3: Notification Settings with Granular Controls', () => {
      it('should provide granular notification controls', () => {
        render(<SettingsPage />);

        // Verify all notification toggles are present
        expect(screen.getByLabelText('Toggle work order notifications')).toBeInTheDocument();
        expect(screen.getByLabelText('Toggle quality alerts')).toBeInTheDocument();
        expect(screen.getByLabelText('Toggle email notifications')).toBeInTheDocument();
        expect(screen.getByLabelText('Toggle material shortage alerts')).toBeInTheDocument();
        expect(screen.getByLabelText('Toggle equipment maintenance alerts')).toBeInTheDocument();
      });

      it('should allow users to configure individual notification types', async () => {
        const user = userEvent.setup();
        const mockSetLocalSetting = vi.fn();

        const { useSettingsActions } = await import('@/store/settingsStore');
        (useSettingsActions as any).mockReturnValue({
          loadSettings: vi.fn(),
          saveSettings: vi.fn(),
          resetSettings: vi.fn(),
          setLocalSetting: mockSetLocalSetting,
          changePassword: vi.fn(),
          setupTwoFactor: vi.fn(),
          exportSettings: vi.fn(),
          importSettings: vi.fn(),
        });

        render(<SettingsPage />);

        // Test toggling email notifications
        const emailToggle = screen.getByLabelText('Toggle email notifications');
        await user.click(emailToggle);

        expect(mockSetLocalSetting).toHaveBeenCalledWith('notifications', { emailNotifications: true });
      });
    });

    describe('AC4: RBAC Integration', () => {
      it('should respect role-based access controls for security settings', () => {
        const { usePermissionCheck } = require('@/store/AuthStore');
        (usePermissionCheck as any).mockReturnValue({
          hasPermission: vi.fn(() => false),
          hasRole: vi.fn(() => false),
          hasAnyRole: vi.fn(() => false),
          hasAllRoles: vi.fn(() => false),
          hasAnyPermission: vi.fn(() => false),
          hasAllPermissions: vi.fn(() => false),
          permissions: [],
          roles: ['Operator'],
        });

        render(<SettingsPage />);

        // Security settings should be disabled for non-admin users
        const twoFactorBtn = screen.getByLabelText(/two-factor authentication/i);
        const changePasswordBtn = screen.getByLabelText('Change password');
        const sessionTimeoutSelect = screen.getByLabelText('Select session timeout duration');
        const resetBtn = screen.getByLabelText('Reset all settings to defaults');

        expect(twoFactorBtn).toBeDisabled();
        expect(changePasswordBtn).toBeDisabled();
        expect(sessionTimeoutSelect).toBeDisabled();
        expect(resetBtn).toBeDisabled();
      });

      it('should allow full access for administrators', () => {
        const { usePermissionCheck } = require('@/store/AuthStore');
        (usePermissionCheck as any).mockReturnValue({
          hasPermission: vi.fn(() => true),
          hasRole: vi.fn(() => true),
          hasAnyRole: vi.fn(() => true),
          hasAllRoles: vi.fn(() => true),
          hasAnyPermission: vi.fn(() => true),
          hasAllPermissions: vi.fn(() => true),
          permissions: ['ADMIN_USERS', 'ADMIN_SYSTEM'],
          roles: ['System Administrator'],
        });

        render(<SettingsPage />);

        // Security settings should be enabled for admin users
        const twoFactorBtn = screen.getByLabelText(/two-factor authentication/i);
        const changePasswordBtn = screen.getByLabelText('Change password');
        const sessionTimeoutSelect = screen.getByLabelText('Select session timeout duration');
        const resetBtn = screen.getByLabelText('Reset all settings to defaults');

        expect(twoFactorBtn).not.toBeDisabled();
        expect(changePasswordBtn).not.toBeDisabled();
        expect(sessionTimeoutSelect).not.toBeDisabled();
        expect(resetBtn).not.toBeDisabled();
      });
    });

    describe('AC5: Accessibility Compliance (WCAG 2.1 Level AA)', () => {
      it('should have proper semantic structure', () => {
        render(<SettingsPage />);

        // Check for proper landmark roles
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      });

      it('should have proper ARIA labels', () => {
        render(<SettingsPage />);

        // Check that all interactive elements have proper labels
        const selects = screen.getAllByRole('combobox');
        const switches = screen.getAllByRole('switch');
        const buttons = screen.getAllByRole('button');

        selects.forEach(select => {
          expect(select).toHaveAttribute('aria-label');
        });

        switches.forEach(switchElement => {
          expect(switchElement).toHaveAttribute('aria-label');
        });

        buttons.forEach(button => {
          expect(button).toHaveAttribute('aria-label');
        });
      });

      it('should have proper heading hierarchy', () => {
        render(<SettingsPage />);

        const mainHeading = screen.getByRole('heading', { level: 2 });
        expect(mainHeading).toHaveTextContent('Settings');
        expect(mainHeading).toHaveAttribute('id', 'settings-title');
      });

      it('should have proper form associations', () => {
        render(<SettingsPage />);

        // Check that form controls are properly associated with their labels
        const themeSelect = screen.getByLabelText('Select theme preference');
        const languageSelect = screen.getByLabelText('Select language preference');
        const compactToggle = screen.getByLabelText('Toggle compact layout');

        expect(themeSelect).toBeInTheDocument();
        expect(languageSelect).toBeInTheDocument();
        expect(compactToggle).toBeInTheDocument();
      });

      it('should be keyboard navigable', async () => {
        const user = userEvent.setup();
        render(<SettingsPage />);

        // Test keyboard navigation
        const firstButton = screen.getByLabelText('Export settings');
        await user.tab();
        expect(document.activeElement).toBe(firstButton);
      });

      it('should provide descriptive text for screen readers', () => {
        render(<SettingsPage />);

        // Check for descriptive text
        expect(screen.getByText('Manage your account settings and application preferences')).toBeInTheDocument();
        expect(screen.getByText('Choose your preferred interface theme')).toBeInTheDocument();
        expect(screen.getByText('Select your preferred language')).toBeInTheDocument();
      });
    });

    describe('AC6: Settings Persistence', () => {
      it('should save settings when save button is clicked', async () => {
        const user = userEvent.setup();
        const mockSaveSettings = vi.fn().mockResolvedValue(undefined);

        const { useSettingsActions, useSettingsState } = await import('@/store/settingsStore');
        (useSettingsActions as any).mockReturnValue({
          loadSettings: vi.fn(),
          saveSettings: mockSaveSettings,
          resetSettings: vi.fn(),
          setLocalSetting: vi.fn(),
          changePassword: vi.fn(),
          setupTwoFactor: vi.fn(),
          exportSettings: vi.fn(),
          importSettings: vi.fn(),
        });

        (useSettingsState as any).mockReturnValue({
          isLoading: false,
          isSaving: false,
          error: null,
          isDirty: true, // Enable save button
          lastSaved: null,
        });

        render(<SettingsPage />);

        const saveButton = screen.getByLabelText('Save all changes');
        expect(saveButton).not.toBeDisabled();

        await user.click(saveButton);
        expect(mockSaveSettings).toHaveBeenCalled();
      });

      it('should reset settings when reset button is clicked', async () => {
        const user = userEvent.setup();
        const mockResetSettings = vi.fn().mockResolvedValue(undefined);

        const { useSettingsActions } = await import('@/store/settingsStore');
        (useSettingsActions as any).mockReturnValue({
          loadSettings: vi.fn(),
          saveSettings: vi.fn(),
          resetSettings: mockResetSettings,
          setLocalSetting: vi.fn(),
          changePassword: vi.fn(),
          setupTwoFactor: vi.fn(),
          exportSettings: vi.fn(),
          importSettings: vi.fn(),
        });

        render(<SettingsPage />);

        const resetButton = screen.getByLabelText('Reset all settings to defaults');
        await user.click(resetButton);

        // Should show confirmation dialog
        const confirmButton = await screen.findByRole('button', { name: 'Reset' });
        await user.click(confirmButton);

        expect(mockResetSettings).toHaveBeenCalled();
      });
    });

    describe('AC7: Export/Import Functionality', () => {
      it('should provide export functionality', async () => {
        const user = userEvent.setup();
        const mockExportSettings = vi.fn().mockResolvedValue(DEFAULT_USER_SETTINGS);

        const { useSettingsActions } = await import('@/store/settingsStore');
        (useSettingsActions as any).mockReturnValue({
          loadSettings: vi.fn(),
          saveSettings: vi.fn(),
          resetSettings: vi.fn(),
          setLocalSetting: vi.fn(),
          changePassword: vi.fn(),
          setupTwoFactor: vi.fn(),
          exportSettings: mockExportSettings,
          importSettings: vi.fn(),
        });

        render(<SettingsPage />);

        const exportButton = screen.getByLabelText('Export settings');
        await user.click(exportButton);

        expect(mockExportSettings).toHaveBeenCalled();
      });

      it('should provide import functionality', () => {
        render(<SettingsPage />);

        const importButton = screen.getByLabelText('Import settings');
        expect(importButton).toBeInTheDocument();
      });
    });

    describe('AC8: Error Handling and User Feedback', () => {
      it('should display error messages when operations fail', () => {
        const { useSettingsState } = require('@/store/settingsStore');
        (useSettingsState as any).mockReturnValue({
          isLoading: false,
          isSaving: false,
          error: 'Failed to save settings',
          isDirty: false,
          lastSaved: null,
        });

        render(<SettingsPage />);

        expect(screen.getByText('Settings Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to save settings')).toBeInTheDocument();
      });

      it('should show loading states during operations', () => {
        const { useSettingsState } = require('@/store/settingsStore');
        (useSettingsState as any).mockReturnValue({
          isLoading: true,
          isSaving: false,
          error: null,
          isDirty: false,
          lastSaved: null,
        });

        render(<SettingsPage />);

        expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
      });

      it('should show saving state when settings are being saved', () => {
        const { useSettingsState } = require('@/store/settingsStore');
        (useSettingsState as any).mockReturnValue({
          isLoading: false,
          isSaving: true,
          error: null,
          isDirty: true,
          lastSaved: null,
        });

        render(<SettingsPage />);

        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      it('should show unsaved changes indicator', () => {
        const { useSettingsState } = require('@/store/settingsStore');
        (useSettingsState as any).mockReturnValue({
          isLoading: false,
          isSaving: false,
          error: null,
          isDirty: true,
          lastSaved: null,
        });

        render(<SettingsPage />);

        expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      });
    });
  });

  describe('End-to-End User Workflows', () => {
    it('should support complete settings configuration workflow', async () => {
      const user = userEvent.setup();
      const mockSetLocalSetting = vi.fn();
      const mockSaveSettings = vi.fn().mockResolvedValue(undefined);

      const { useSettingsActions, useSettingsState } = await import('@/store/settingsStore');
      (useSettingsActions as any).mockReturnValue({
        loadSettings: vi.fn(),
        saveSettings: mockSaveSettings,
        resetSettings: vi.fn(),
        setLocalSetting: mockSetLocalSetting,
        changePassword: vi.fn(),
        setupTwoFactor: vi.fn(),
        exportSettings: vi.fn(),
        importSettings: vi.fn(),
      });

      // Start with dirty state to enable save
      (useSettingsState as any).mockReturnValue({
        isLoading: false,
        isSaving: false,
        error: null,
        isDirty: true,
        lastSaved: null,
      });

      render(<SettingsPage />);

      // 1. Change theme
      const themeSelect = screen.getByLabelText('Select theme preference');
      await user.selectOptions(themeSelect, 'dark');
      expect(mockSetLocalSetting).toHaveBeenCalledWith('preferences', { theme: 'dark' });

      // 2. Toggle notification
      const emailToggle = screen.getByLabelText('Toggle email notifications');
      await user.click(emailToggle);
      expect(mockSetLocalSetting).toHaveBeenCalledWith('notifications', { emailNotifications: true });

      // 3. Save settings
      const saveButton = screen.getByLabelText('Save all changes');
      await user.click(saveButton);
      expect(mockSaveSettings).toHaveBeenCalled();
    });
  });
});