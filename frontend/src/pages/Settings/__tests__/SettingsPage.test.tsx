import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SettingsPage from '../SettingsPage';
import { useSettingsStore, useSettingsActions, useSettingsState } from '@/store/settingsStore';
import { useAuthStore, usePermissionCheck } from '@/store/AuthStore';
import { DEFAULT_USER_SETTINGS } from '@/types/settings';

// Mock the hooks
vi.mock('@/store/settingsStore');
vi.mock('@/store/AuthStore');
vi.mock('@/components/common/ChartAccessibility', () => ({
  AccessibleChartWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock antd message
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

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  roles: ['Operator'],
  permissions: ['workorders.read'],
  isActive: true,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockSettings = {
  ...DEFAULT_USER_SETTINGS,
  id: 'settings-1',
  userId: 'user-1',
};

const mockSettingsActions = {
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  resetSettings: vi.fn(),
  setLocalSetting: vi.fn(),
  changePassword: vi.fn(),
  setupTwoFactor: vi.fn(),
  exportSettings: vi.fn(),
  importSettings: vi.fn(),
};

const mockSettingsState = {
  isLoading: false,
  isSaving: false,
  error: null,
  isDirty: false,
  lastSaved: '2023-01-01T00:00:00Z',
};

const mockPermissionCheck = {
  hasPermission: vi.fn(() => false),
  hasRole: vi.fn(() => false),
  hasAnyRole: vi.fn(() => false),
  hasAllRoles: vi.fn(() => false),
  hasAnyPermission: vi.fn(() => false),
  hasAllPermissions: vi.fn(() => false),
  permissions: [],
  roles: [],
};

describe('SettingsPage', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    (useAuthStore as any).mockReturnValue({ user: mockUser });
    (usePermissionCheck as any).mockReturnValue(mockPermissionCheck);
    (useSettingsStore as any).mockReturnValue(mockSettings);
    (useSettingsActions as any).mockReturnValue(mockSettingsActions);
    (useSettingsState as any).mockReturnValue(mockSettingsState);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render settings page with all sections', () => {
      render(<SettingsPage />);

      // Check page title
      expect(screen.getByRole('heading', { name: /Settings/i })).toBeInTheDocument();

      // Check section titles
      expect(screen.getByText('User Preferences')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Display Settings')).toBeInTheDocument();
    });

    it('should show loading spinner when loading', () => {
      (useSettingsState as any).mockReturnValue({
        ...mockSettingsState,
        isLoading: true,
      });

      render(<SettingsPage />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show error alert when there is an error', () => {
      (useSettingsState as any).mockReturnValue({
        ...mockSettingsState,
        error: 'Failed to load settings',
      });

      render(<SettingsPage />);

      expect(screen.getByText('Settings Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
    });

    it('should show unsaved changes indicator when dirty', () => {
      (useSettingsState as any).mockReturnValue({
        ...mockSettingsState,
        isDirty: true,
      });

      render(<SettingsPage />);

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
  });

  describe('User Preferences', () => {
    it('should render theme selection with current value', () => {
      render(<SettingsPage />);

      const themeSelect = screen.getByLabelText('Select theme preference');
      expect(themeSelect).toHaveValue('light');
    });

    it('should update theme when selection changes', () => {
      render(<SettingsPage />);

      const themeSelect = screen.getByLabelText('Select theme preference');
      fireEvent.change(themeSelect, { target: { value: 'dark' } });

      expect(mockSettingsActions.setLocalSetting).toHaveBeenCalledWith('preferences', { theme: 'dark' });
    });

    it('should render language selection with current value', () => {
      render(<SettingsPage />);

      const languageSelect = screen.getByLabelText('Select language preference');
      expect(languageSelect).toHaveValue('en');
    });

    it('should update language when selection changes', () => {
      render(<SettingsPage />);

      const languageSelect = screen.getByLabelText('Select language preference');
      fireEvent.change(languageSelect, { target: { value: 'es' } });

      expect(mockSettingsActions.setLocalSetting).toHaveBeenCalledWith('preferences', { language: 'es' });
    });

    it('should render compact layout toggle', () => {
      render(<SettingsPage />);

      const compactToggle = screen.getByLabelText('Toggle compact layout');
      expect(compactToggle).not.toBeChecked();
    });

    it('should update compact layout when toggled', () => {
      render(<SettingsPage />);

      const compactToggle = screen.getByLabelText('Toggle compact layout');
      fireEvent.click(compactToggle);

      expect(mockSettingsActions.setLocalSetting).toHaveBeenCalledWith('preferences', { compactLayout: true });
    });
  });

  describe('Notifications', () => {
    it('should render notification toggles with correct initial values', () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText('Toggle work order notifications')).toBeChecked();
      expect(screen.getByLabelText('Toggle quality alerts')).toBeChecked();
      expect(screen.getByLabelText('Toggle email notifications')).not.toBeChecked();
    });

    it('should update notification settings when toggled', () => {
      render(<SettingsPage />);

      const emailNotifications = screen.getByLabelText('Toggle email notifications');
      fireEvent.click(emailNotifications);

      expect(mockSettingsActions.setLocalSetting).toHaveBeenCalledWith('notifications', { emailNotifications: true });
    });
  });

  describe('Security Settings', () => {
    it('should render two-factor authentication section', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
      expect(screen.getByLabelText(/two-factor authentication/i)).toBeInTheDocument();
    });

    it('should show enabled badge when 2FA is enabled', () => {
      const settingsWithTwoFactor = {
        ...mockSettings,
        security: {
          ...mockSettings.security,
          twoFactorEnabled: true,
        },
      };

      (useSettingsStore as any).mockReturnValue(settingsWithTwoFactor);

      render(<SettingsPage />);

      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });

    it('should render change password button', () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText('Change password')).toBeInTheDocument();
    });

    it('should open change password modal when button clicked', () => {
      render(<SettingsPage />);

      const changePasswordBtn = screen.getByLabelText('Change password');
      fireEvent.click(changePasswordBtn);

      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    it('should render session timeout selection', () => {
      render(<SettingsPage />);

      const sessionTimeoutSelect = screen.getByLabelText('Select session timeout duration');
      expect(sessionTimeoutSelect).toHaveValue(30);
    });

    it('should disable security settings when user lacks permissions', () => {
      // Mock user without security permissions
      mockPermissionCheck.hasAnyPermission.mockReturnValue(false);
      mockPermissionCheck.hasRole.mockReturnValue(false);

      render(<SettingsPage />);

      const twoFactorBtn = screen.getByLabelText(/two-factor authentication/i);
      const changePasswordBtn = screen.getByLabelText('Change password');
      const sessionTimeoutSelect = screen.getByLabelText('Select session timeout duration');

      expect(twoFactorBtn).toBeDisabled();
      expect(changePasswordBtn).toBeDisabled();
      expect(sessionTimeoutSelect).toBeDisabled();
    });
  });

  describe('Display Settings', () => {
    it('should render display settings with correct initial values', () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText('Select dashboard layout')).toHaveValue('standard');
      expect(screen.getByLabelText('Select default page size')).toHaveValue(25);
      expect(screen.getByLabelText('Toggle high contrast mode')).not.toBeChecked();
      expect(screen.getByLabelText('Select font size')).toHaveValue('medium');
    });

    it('should update display settings when changed', () => {
      render(<SettingsPage />);

      const dashboardLayout = screen.getByLabelText('Select dashboard layout');
      fireEvent.change(dashboardLayout, { target: { value: 'compact' } });

      expect(mockSettingsActions.setLocalSetting).toHaveBeenCalledWith('display', { dashboardLayout: 'compact' });
    });
  });

  describe('Actions', () => {
    it('should render save and reset buttons', () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText('Save all changes')).toBeInTheDocument();
      expect(screen.getByLabelText('Reset all settings to defaults')).toBeInTheDocument();
    });

    it('should disable save button when not dirty', () => {
      render(<SettingsPage />);

      const saveBtn = screen.getByLabelText('Save all changes');
      expect(saveBtn).toBeDisabled();
    });

    it('should enable save button when dirty', () => {
      (useSettingsState as any).mockReturnValue({
        ...mockSettingsState,
        isDirty: true,
      });

      render(<SettingsPage />);

      const saveBtn = screen.getByLabelText('Save all changes');
      expect(saveBtn).not.toBeDisabled();
    });

    it('should call saveSettings when save button clicked', async () => {
      (useSettingsState as any).mockReturnValue({
        ...mockSettingsState,
        isDirty: true,
      });

      render(<SettingsPage />);

      const saveBtn = screen.getByLabelText('Save all changes');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockSettingsActions.saveSettings).toHaveBeenCalled();
      });
    });

    it('should show loading state when saving', () => {
      (useSettingsState as any).mockReturnValue({
        ...mockSettingsState,
        isSaving: true,
        isDirty: true,
      });

      render(<SettingsPage />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should render export and import buttons', () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText('Export settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Import settings')).toBeInTheDocument();
    });

    it('should call exportSettings when export button clicked', async () => {
      mockSettingsActions.exportSettings.mockResolvedValue(mockSettings);

      render(<SettingsPage />);

      const exportBtn = screen.getByLabelText('Export settings');
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(mockSettingsActions.exportSettings).toHaveBeenCalled();
      });
    });
  });

  describe('RBAC Integration', () => {
    it('should disable reset button when user lacks permissions', () => {
      // Mock user without admin permissions
      mockPermissionCheck.hasAnyPermission.mockReturnValue(false);
      mockPermissionCheck.hasRole.mockReturnValue(false);

      render(<SettingsPage />);

      const resetBtn = screen.getByLabelText('Reset all settings to defaults');
      expect(resetBtn).toBeDisabled();
    });

    it('should enable reset button when user has admin permissions', () => {
      // Mock user with admin permissions
      mockPermissionCheck.hasAnyPermission.mockReturnValue(true);

      render(<SettingsPage />);

      const resetBtn = screen.getByLabelText('Reset all settings to defaults');
      expect(resetBtn).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('main')).toHaveAttribute('aria-labelledby', 'settings-title');
      expect(screen.getByRole('heading', { name: /Settings/i })).toHaveAttribute('id', 'settings-title');
    });

    it('should have proper form labels', () => {
      render(<SettingsPage />);

      // Check that all form controls have associated labels
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

    it('should be keyboard navigable', () => {
      render(<SettingsPage />);

      const firstFocusable = screen.getByLabelText('Export settings');
      firstFocusable.focus();

      expect(document.activeElement).toBe(firstFocusable);
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      const mockError = new Error('Save failed');
      mockSettingsActions.saveSettings.mockRejectedValue(mockError);

      (useSettingsState as any).mockReturnValue({
        ...mockSettingsState,
        isDirty: true,
      });

      render(<SettingsPage />);

      const saveBtn = screen.getByLabelText('Save all changes');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockSettingsActions.saveSettings).toHaveBeenCalled();
      });
    });

    it('should handle export errors gracefully', async () => {
      const mockError = new Error('Export failed');
      mockSettingsActions.exportSettings.mockRejectedValue(mockError);

      render(<SettingsPage />);

      const exportBtn = screen.getByLabelText('Export settings');
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(mockSettingsActions.exportSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Auto-save Functionality', () => {
    it('should load settings on mount when not available', () => {
      (useSettingsStore as any).mockReturnValue(null);

      render(<SettingsPage />);

      expect(mockSettingsActions.loadSettings).toHaveBeenCalled();
    });

    it('should not load settings on mount when already available', () => {
      render(<SettingsPage />);

      expect(mockSettingsActions.loadSettings).not.toHaveBeenCalled();
    });
  });
});