/**
 * User Settings Types
 *
 * Defines the structure for user preferences, theme options, notifications,
 * and security settings in the MachShop2 application.
 */

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'es' | 'fr';
  compactLayout: boolean;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
}

export interface NotificationSettings {
  workOrderNotifications: boolean;
  qualityAlerts: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  materialShortageAlerts: boolean;
  equipmentMaintenanceAlerts: boolean;
  productionMilestoneAlerts: boolean;
  scheduleChangeAlerts: boolean;
  approvalRequestAlerts: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number; // in minutes
  passwordExpirationDays?: number;
  loginHistoryEnabled: boolean;
  securityNotificationsEnabled: boolean;
}

export interface DisplaySettings {
  dashboardLayout: 'compact' | 'standard' | 'expanded';
  defaultPageSize: number;
  showAdvancedFeatures: boolean;
  enableAnimations: boolean;
  highContrastMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export interface UserSettings {
  id?: string;
  userId: string;
  preferences: UserPreferences;
  notifications: NotificationSettings;
  security: SecuritySettings;
  display: DisplaySettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSettingsUpdateRequest {
  preferences?: Partial<UserPreferences>;
  notifications?: Partial<NotificationSettings>;
  security?: Partial<SecuritySettings>;
  display?: Partial<DisplaySettings>;
}

export interface UserSettingsResponse {
  success: boolean;
  data: UserSettings;
  message?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TwoFactorSetupRequest {
  enabled: boolean;
  backupCodes?: string[];
}

export interface TwoFactorSetupResponse {
  success: boolean;
  qrCode?: string;
  backupCodes?: string[];
  message?: string;
}

// Default settings for new users
export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  preferences: {
    theme: 'light',
    language: 'en',
    compactLayout: false,
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  notifications: {
    workOrderNotifications: true,
    qualityAlerts: true,
    emailNotifications: false,
    pushNotifications: true,
    soundEnabled: true,
    materialShortageAlerts: true,
    equipmentMaintenanceAlerts: true,
    productionMilestoneAlerts: true,
    scheduleChangeAlerts: true,
    approvalRequestAlerts: true,
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 30,
    passwordExpirationDays: 90,
    loginHistoryEnabled: true,
    securityNotificationsEnabled: true,
  },
  display: {
    dashboardLayout: 'standard',
    defaultPageSize: 25,
    showAdvancedFeatures: false,
    enableAnimations: true,
    highContrastMode: false,
    fontSize: 'medium',
  },
};

// Settings that require specific permissions to modify
export interface SettingsPermissions {
  canModifySecuritySettings: boolean;
  canModifyNotifications: boolean;
  canModifyPreferences: boolean;
  canModifyDisplay: boolean;
  canExportSettings: boolean;
  canResetSettings: boolean;
}

// Form validation schemas
export interface SettingsValidationError {
  field: string;
  message: string;
}

export interface SettingsValidationResult {
  isValid: boolean;
  errors: SettingsValidationError[];
}