import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { settingsAPI } from '../settings';
import { DEFAULT_USER_SETTINGS } from '@/types/settings';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('settingsAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();

    // Mock axios create
    mockedAxios.create.mockReturnValue({
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      defaults: {
        headers: {
          common: {},
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserSettings', () => {
    it('should fetch user settings successfully', async () => {
      const mockSettings = { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' };
      const mockClient = mockedAxios.create();
      mockClient.get.mockResolvedValue(mockSettings);

      const result = await settingsAPI.getUserSettings();

      expect(mockClient.get).toHaveBeenCalledWith('/settings/user');
      expect(result).toEqual(mockSettings);
    });

    it('should handle errors correctly', async () => {
      const mockClient = mockedAxios.create();
      const error = new Error('Network error');
      mockClient.get.mockRejectedValue(error);

      await expect(settingsAPI.getUserSettings()).rejects.toThrow('Network error');
    });
  });

  describe('updateUserSettings', () => {
    it('should update user settings successfully', async () => {
      const updates = { preferences: { theme: 'dark' } };
      const mockResponse = {
        success: true,
        data: { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' },
      };
      const mockClient = mockedAxios.create();
      mockClient.patch.mockResolvedValue(mockResponse);

      const result = await settingsAPI.updateUserSettings(updates);

      expect(mockClient.patch).toHaveBeenCalledWith('/settings/user', updates);
      expect(result).toEqual(mockResponse);
    });

    it('should handle update errors', async () => {
      const updates = { preferences: { theme: 'dark' } };
      const mockClient = mockedAxios.create();
      const error = new Error('Update failed');
      mockClient.patch.mockRejectedValue(error);

      await expect(settingsAPI.updateUserSettings(updates)).rejects.toThrow('Update failed');
    });
  });

  describe('resetUserSettings', () => {
    it('should reset user settings successfully', async () => {
      const mockResponse = {
        success: true,
        data: { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' },
      };
      const mockClient = mockedAxios.create();
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await settingsAPI.resetUserSettings();

      expect(mockClient.post).toHaveBeenCalledWith('/settings/user/reset');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('exportUserSettings', () => {
    it('should export user settings successfully', async () => {
      const mockExportData = {
        data: { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' },
        exportedAt: '2023-01-01T00:00:00Z',
      };
      const mockClient = mockedAxios.create();
      mockClient.get.mockResolvedValue(mockExportData);

      const result = await settingsAPI.exportUserSettings();

      expect(mockClient.get).toHaveBeenCalledWith('/settings/user/export');
      expect(result).toEqual(mockExportData);
    });
  });

  describe('importUserSettings', () => {
    it('should import user settings successfully', async () => {
      const importSettings = { preferences: { theme: 'dark' } };
      const mockResponse = {
        success: true,
        data: { ...DEFAULT_USER_SETTINGS, id: 'test-1', userId: 'user-1' },
      };
      const mockClient = mockedAxios.create();
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await settingsAPI.importUserSettings(importSettings);

      expect(mockClient.post).toHaveBeenCalledWith('/settings/user/import', { settings: importSettings });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'old123',
        newPassword: 'new456',
        confirmPassword: 'new456',
      };
      const mockResponse = { success: true, message: 'Password changed successfully' };
      const mockClient = mockedAxios.create();
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await settingsAPI.changePassword(passwordData);

      expect(mockClient.post).toHaveBeenCalledWith('/settings/security/change-password', passwordData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('setupTwoFactor', () => {
    it('should setup two-factor authentication successfully', async () => {
      const twoFactorData = { enabled: true };
      const mockResponse = {
        success: true,
        qrCode: 'data:image/png;base64,mockqrcode',
        backupCodes: ['code1', 'code2'],
      };
      const mockClient = mockedAxios.create();
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await settingsAPI.setupTwoFactor(twoFactorData);

      expect(mockClient.post).toHaveBeenCalledWith('/settings/security/two-factor', twoFactorData);
      expect(result).toEqual(mockResponse);
    });

    it('should disable two-factor authentication', async () => {
      const twoFactorData = { enabled: false };
      const mockResponse = { success: true };
      const mockClient = mockedAxios.create();
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await settingsAPI.setupTwoFactor(twoFactorData);

      expect(mockClient.post).toHaveBeenCalledWith('/settings/security/two-factor', twoFactorData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getTwoFactorStatus', () => {
    it('should get two-factor status successfully', async () => {
      const mockStatus = { enabled: true, backupCodesRemaining: 5 };
      const mockClient = mockedAxios.create();
      mockClient.get.mockResolvedValue(mockStatus);

      const result = await settingsAPI.getTwoFactorStatus();

      expect(mockClient.get).toHaveBeenCalledWith('/settings/security/two-factor');
      expect(result).toEqual(mockStatus);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate backup codes successfully', async () => {
      const mockCodes = { backupCodes: ['code1', 'code2', 'code3'] };
      const mockClient = mockedAxios.create();
      mockClient.post.mockResolvedValue(mockCodes);

      const result = await settingsAPI.generateBackupCodes();

      expect(mockClient.post).toHaveBeenCalledWith('/settings/security/two-factor/backup-codes');
      expect(result).toEqual(mockCodes);
    });
  });

  describe('getLoginHistory', () => {
    it('should get login history with default limit', async () => {
      const mockHistory = [
        {
          id: '1',
          loginTime: '2023-01-01T00:00:00Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          location: 'New York, NY',
          success: true,
        },
      ];
      const mockClient = mockedAxios.create();
      mockClient.get.mockResolvedValue(mockHistory);

      const result = await settingsAPI.getLoginHistory();

      expect(mockClient.get).toHaveBeenCalledWith('/settings/security/login-history?limit=50');
      expect(result).toEqual(mockHistory);
    });

    it('should get login history with custom limit', async () => {
      const mockHistory = [];
      const mockClient = mockedAxios.create();
      mockClient.get.mockResolvedValue(mockHistory);

      const result = await settingsAPI.getLoginHistory(100);

      expect(mockClient.get).toHaveBeenCalledWith('/settings/security/login-history?limit=100');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getActiveSessions', () => {
    it('should get active sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          createdAt: '2023-01-01T00:00:00Z',
          lastActivity: '2023-01-01T01:00:00Z',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          current: true,
        },
      ];
      const mockClient = mockedAxios.create();
      mockClient.get.mockResolvedValue(mockSessions);

      const result = await settingsAPI.getActiveSessions();

      expect(mockClient.get).toHaveBeenCalledWith('/settings/security/sessions');
      expect(result).toEqual(mockSessions);
    });
  });

  describe('revokeSession', () => {
    it('should revoke session successfully', async () => {
      const sessionId = 'session-123';
      const mockResponse = { success: true };
      const mockClient = mockedAxios.create();
      mockClient.delete.mockResolvedValue(mockResponse);

      const result = await settingsAPI.revokeSession(sessionId);

      expect(mockClient.delete).toHaveBeenCalledWith(`/settings/security/sessions/${sessionId}`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions successfully', async () => {
      const mockResponse = { success: true, revokedCount: 3 };
      const mockClient = mockedAxios.create();
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await settingsAPI.revokeAllSessions();

      expect(mockClient.post).toHaveBeenCalledWith('/settings/security/sessions/revoke-all');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('testNotificationSettings', () => {
    it('should test email notifications successfully', async () => {
      const mockResponse = { success: true, message: 'Test email sent' };
      const mockClient = mockedAxios.create();
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await settingsAPI.testNotificationSettings('email');

      expect(mockClient.post).toHaveBeenCalledWith('/settings/notifications/test', { type: 'email' });
      expect(result).toEqual(mockResponse);
    });

    it('should test push notifications successfully', async () => {
      const mockResponse = { success: true, message: 'Test notification sent' };
      const mockClient = mockedAxios.create();
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await settingsAPI.testNotificationSettings('push');

      expect(mockClient.post).toHaveBeenCalledWith('/settings/notifications/test', { type: 'push' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getNotificationHistory', () => {
    it('should get notification history with default limit', async () => {
      const mockHistory = [
        {
          id: '1',
          type: 'work_order',
          title: 'Work Order Updated',
          message: 'Work order WO-123 has been updated',
          sentAt: '2023-01-01T00:00:00Z',
          delivered: true,
          readAt: '2023-01-01T00:05:00Z',
        },
      ];
      const mockClient = mockedAxios.create();
      mockClient.get.mockResolvedValue(mockHistory);

      const result = await settingsAPI.getNotificationHistory();

      expect(mockClient.get).toHaveBeenCalledWith('/settings/notifications/history?limit=100');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('markNotificationRead', () => {
    it('should mark notification as read successfully', async () => {
      const notificationId = 'notif-123';
      const mockResponse = { success: true };
      const mockClient = mockedAxios.create();
      mockClient.patch.mockResolvedValue(mockResponse);

      const result = await settingsAPI.markNotificationRead(notificationId);

      expect(mockClient.patch).toHaveBeenCalledWith(`/settings/notifications/${notificationId}/read`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAvailableThemes', () => {
    it('should get available themes successfully', async () => {
      const mockThemes = [
        { id: 'light', name: 'Light Theme', description: 'Clean light theme', preview: 'preview-url' },
        { id: 'dark', name: 'Dark Theme', description: 'Modern dark theme', preview: 'preview-url' },
      ];
      const mockClient = mockedAxios.create();
      mockClient.get.mockResolvedValue(mockThemes);

      const result = await settingsAPI.getAvailableThemes();

      expect(mockClient.get).toHaveBeenCalledWith('/settings/display/themes');
      expect(result).toEqual(mockThemes);
    });
  });

  describe('getAvailableLanguages', () => {
    it('should get available languages successfully', async () => {
      const mockLanguages = [
        { code: 'en', name: 'English', nativeName: 'English', flag: 'us' },
        { code: 'es', name: 'Spanish', nativeName: 'Español', flag: 'es' },
      ];
      const mockClient = mockedAxios.create();
      mockClient.get.mockResolvedValue(mockLanguages);

      const result = await settingsAPI.getAvailableLanguages();

      expect(mockClient.get).toHaveBeenCalledWith('/settings/display/languages');
      expect(result).toEqual(mockLanguages);
    });
  });

  describe('getAvailableTimezones', () => {
    it('should get available timezones successfully', async () => {
      const mockTimezones = [
        { value: 'America/New_York', label: 'Eastern Time', offset: 'UTC-5' },
        { value: 'America/Chicago', label: 'Central Time', offset: 'UTC-6' },
      ];
      const mockClient = mockedAxios.create();
      mockClient.get.mockResolvedValue(mockTimezones);

      const result = await settingsAPI.getAvailableTimezones();

      expect(mockClient.get).toHaveBeenCalledWith('/settings/display/timezones');
      expect(result).toEqual(mockTimezones);
    });
  });

  describe('Request Interceptor', () => {
    it('should add auth token to requests when available', () => {
      const mockAuthStorage = {
        state: {
          token: 'test-token-123',
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAuthStorage));

      const mockClient = mockedAxios.create();
      const mockConfig = { headers: {} };

      // Simulate the request interceptor
      const requestInterceptor = mockClient.interceptors.request.use.mock.calls[0][0];
      const result = requestInterceptor(mockConfig);

      expect(result.headers.Authorization).toBe('Bearer test-token-123');
    });

    it('should handle missing auth storage gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const mockClient = mockedAxios.create();
      const mockConfig = { headers: {} };

      // Simulate the request interceptor
      const requestInterceptor = mockClient.interceptors.request.use.mock.calls[0][0];
      const result = requestInterceptor(mockConfig);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should handle malformed auth storage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const mockClient = mockedAxios.create();
      const mockConfig = { headers: {} };

      // Simulate the request interceptor
      const requestInterceptor = mockClient.interceptors.request.use.mock.calls[0][0];
      const result = requestInterceptor(mockConfig);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor', () => {
    it('should return response data on success', () => {
      const mockClient = mockedAxios.create();
      const mockResponse = { data: { success: true } };

      // Simulate the response interceptor
      const responseInterceptor = mockClient.interceptors.response.use.mock.calls[0][0];
      const result = responseInterceptor(mockResponse);

      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error with custom message on failure', () => {
      const mockClient = mockedAxios.create();
      const mockError = {
        response: {
          data: {
            message: 'Custom error message',
          },
        },
      };

      // Simulate the response interceptor error handler
      const errorHandler = mockClient.interceptors.response.use.mock.calls[0][1];

      expect(() => errorHandler(mockError)).toThrow('Custom error message');
    });

    it('should throw generic error when no custom message', () => {
      const mockClient = mockedAxios.create();
      const mockError = {
        message: 'Network error',
      };

      // Simulate the response interceptor error handler
      const errorHandler = mockClient.interceptors.response.use.mock.calls[0][1];

      expect(() => errorHandler(mockError)).toThrow('Network error');
    });
  });
});