import axios from 'axios';
import {
  UserSettings,
  UserSettingsUpdateRequest,
  UserSettingsResponse,
  ChangePasswordRequest,
  TwoFactorSetupRequest,
  TwoFactorSetupResponse,
} from '@/types/settings';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create axios instance for settings API
const settingsClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
settingsClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.data) {
      throw new Error(error.response.data.message || 'Settings operation failed');
    }
    throw new Error(error.message || 'Network error');
  }
);

// Request interceptor to add auth token
settingsClient.interceptors.request.use(
  (config) => {
    try {
      const authStorage = localStorage.getItem('mes-auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        const token = parsed.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.warn('Failed to add auth token to settings request:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const settingsAPI = {
  /**
   * Get current user's settings
   */
  getUserSettings: async (): Promise<UserSettings> => {
    return settingsClient.get('/settings/user');
  },

  /**
   * Update user settings (partial update)
   */
  updateUserSettings: async (updates: UserSettingsUpdateRequest): Promise<UserSettingsResponse> => {
    return settingsClient.patch('/settings/user', updates);
  },

  /**
   * Reset user settings to defaults
   */
  resetUserSettings: async (): Promise<UserSettingsResponse> => {
    return settingsClient.post('/settings/user/reset');
  },

  /**
   * Export user settings as JSON
   */
  exportUserSettings: async (): Promise<{ data: UserSettings; exportedAt: string }> => {
    return settingsClient.get('/settings/user/export');
  },

  /**
   * Import user settings from JSON
   */
  importUserSettings: async (settings: Partial<UserSettings>): Promise<UserSettingsResponse> => {
    return settingsClient.post('/settings/user/import', { settings });
  },

  // Security-related settings endpoints

  /**
   * Change user password
   */
  changePassword: async (passwordData: ChangePasswordRequest): Promise<{ success: boolean; message: string }> => {
    return settingsClient.post('/settings/security/change-password', passwordData);
  },

  /**
   * Setup or disable two-factor authentication
   */
  setupTwoFactor: async (twoFactorData: TwoFactorSetupRequest): Promise<TwoFactorSetupResponse> => {
    return settingsClient.post('/settings/security/two-factor', twoFactorData);
  },

  /**
   * Get two-factor authentication status
   */
  getTwoFactorStatus: async (): Promise<{ enabled: boolean; backupCodesRemaining?: number }> => {
    return settingsClient.get('/settings/security/two-factor');
  },

  /**
   * Generate new backup codes for two-factor authentication
   */
  generateBackupCodes: async (): Promise<{ backupCodes: string[] }> => {
    return settingsClient.post('/settings/security/two-factor/backup-codes');
  },

  /**
   * Get user's login history
   */
  getLoginHistory: async (limit: number = 50): Promise<Array<{
    id: string;
    loginTime: string;
    ipAddress: string;
    userAgent: string;
    location?: string;
    success: boolean;
  }>> => {
    return settingsClient.get(`/settings/security/login-history?limit=${limit}`);
  },

  /**
   * Get active sessions
   */
  getActiveSessions: async (): Promise<Array<{
    id: string;
    createdAt: string;
    lastActivity: string;
    ipAddress: string;
    userAgent: string;
    current: boolean;
  }>> => {
    return settingsClient.get('/settings/security/sessions');
  },

  /**
   * Revoke a specific session
   */
  revokeSession: async (sessionId: string): Promise<{ success: boolean }> => {
    return settingsClient.delete(`/settings/security/sessions/${sessionId}`);
  },

  /**
   * Revoke all sessions except current
   */
  revokeAllSessions: async (): Promise<{ success: boolean; revokedCount: number }> => {
    return settingsClient.post('/settings/security/sessions/revoke-all');
  },

  // Notification preferences endpoints

  /**
   * Test notification settings by sending a test notification
   */
  testNotificationSettings: async (type: 'email' | 'push' | 'sound'): Promise<{ success: boolean; message: string }> => {
    return settingsClient.post('/settings/notifications/test', { type });
  },

  /**
   * Get notification delivery history
   */
  getNotificationHistory: async (limit: number = 100): Promise<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    sentAt: string;
    delivered: boolean;
    readAt?: string;
  }>> => {
    return settingsClient.get(`/settings/notifications/history?limit=${limit}`);
  },

  /**
   * Mark notification as read
   */
  markNotificationRead: async (notificationId: string): Promise<{ success: boolean }> => {
    return settingsClient.patch(`/settings/notifications/${notificationId}/read`);
  },

  // Theme and display settings

  /**
   * Get available themes
   */
  getAvailableThemes: async (): Promise<Array<{
    id: string;
    name: string;
    description: string;
    preview?: string;
  }>> => {
    return settingsClient.get('/settings/display/themes');
  },

  /**
   * Get available languages
   */
  getAvailableLanguages: async (): Promise<Array<{
    code: string;
    name: string;
    nativeName: string;
    flag?: string;
  }>> => {
    return settingsClient.get('/settings/display/languages');
  },

  /**
   * Get available timezones
   */
  getAvailableTimezones: async (): Promise<Array<{
    value: string;
    label: string;
    offset: string;
  }>> => {
    return settingsClient.get('/settings/display/timezones');
  },
};

export default settingsClient;