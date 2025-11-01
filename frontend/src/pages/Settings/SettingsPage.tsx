import React, { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Divider,
  Switch,
  Select,
  Button,
  Form,
  Input,
  message,
  Modal,
  Spin,
  Alert,
  Tooltip,
  Row,
  Col,
  Badge
} from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  BellOutlined,
  SecurityScanOutlined,
  SaveOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  InfoCircleOutlined,
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { useSettingsStore, useSettingsActions, useSettingsState } from '@/store/settingsStore';
import { useAuthStore, usePermissionCheck } from '@/store/AuthStore';
import { AccessibleChartWrapper } from '@/components/common/ChartAccessibility';
import { DEFAULT_USER_SETTINGS, ChangePasswordRequest } from '@/types/settings';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

/**
 * Enhanced Settings Page Component
 *
 * Provides comprehensive user settings and application preferences configuration
 * with RBAC integration, accessibility features, and persistent state management.
 * Addresses GitHub Issue #282 - Implement functional User Settings Page.
 */
const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const permissionCheck = usePermissionCheck();
  const settings = useSettingsStore((state) => state.settings);
  const { isLoading, isSaving, error, isDirty, lastSaved } = useSettingsState();
  const {
    loadSettings,
    saveSettings,
    resetSettings,
    setLocalSetting,
    changePassword,
    setupTwoFactor,
    exportSettings,
    importSettings,
  } = useSettingsActions();

  // Local state for modals and forms
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [twoFactorModalVisible, setTwoFactorModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // RBAC permissions
  const canModifySettings = permissionCheck.hasAnyPermission(['ADMIN_USERS', 'ADMIN_SYSTEM']) ||
                           permissionCheck.hasRole('System Administrator');
  const canModifySecuritySettings = canModifySettings ||
                                   permissionCheck.hasPermission('ADMIN_USERS');

  // Load settings on component mount
  useEffect(() => {
    if (!settings) {
      loadSettings();
    }
  }, [settings, loadSettings]);

  // Auto-save functionality
  useEffect(() => {
    if (isDirty) {
      const autoSaveTimer = setTimeout(() => {
        handleSaveSettings();
      }, 30000); // Auto-save after 30 seconds of inactivity

      return () => clearTimeout(autoSaveTimer);
    }
  }, [isDirty]);

  const handleSaveSettings = async () => {
    try {
      await saveSettings();
      message.success('Settings saved successfully');
    } catch (error) {
      message.error('Failed to save settings');
    }
  };

  const handleResetSettings = () => {
    confirm({
      title: 'Reset Settings to Defaults',
      content: 'Are you sure you want to reset all settings to their default values? This action cannot be undone.',
      okText: 'Reset',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await resetSettings();
          message.success('Settings reset to defaults');
        } catch (error) {
          message.error('Failed to reset settings');
        }
      },
    });
  };

  const handleExportSettings = async () => {
    try {
      const exportedSettings = await exportSettings();
      const blob = new Blob([JSON.stringify(exportedSettings, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `machshop-settings-${user?.username || 'user'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Settings exported successfully');
    } catch (error) {
      message.error('Failed to export settings');
    }
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const importedSettings = JSON.parse(text);
          await importSettings(importedSettings);
          message.success('Settings imported successfully');
        } catch (error) {
          message.error('Failed to import settings - invalid file format');
        }
      }
    };
    input.click();
  };

  const handleChangePassword = async (values: ChangePasswordRequest) => {
    try {
      await changePassword(values);
      message.success('Password changed successfully');
      setChangePasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error.message || 'Failed to change password');
    }
  };

  const handleSetupTwoFactor = async () => {
    try {
      const response = await setupTwoFactor({
        enabled: !settings?.security.twoFactorEnabled,
      });

      if (response.qrCode) {
        // Show QR code modal for setup
        Modal.info({
          title: 'Two-Factor Authentication Setup',
          content: (
            <div>
              <p>Scan this QR code with your authenticator app:</p>
              <img src={response.qrCode} alt="2FA QR Code" style={{ width: '100%', maxWidth: 200 }} />
              {response.backupCodes && (
                <div style={{ marginTop: 16 }}>
                  <p><strong>Backup Codes (save these safely):</strong></p>
                  <ul>
                    {response.backupCodes.map((code, index) => (
                      <li key={index}><code>{code}</code></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ),
          width: 600,
        });
      }

      message.success(settings?.security.twoFactorEnabled ?
        'Two-factor authentication disabled' :
        'Two-factor authentication enabled'
      );
      setTwoFactorModalVisible(false);
    } catch (error: any) {
      message.error(error.message || 'Failed to setup two-factor authentication');
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }} role="main" aria-labelledby="settings-title">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title id="settings-title" level={2}>
              <SettingOutlined style={{ marginRight: 8 }} />
              Settings
            </Title>
            <Text type="secondary">
              Manage your account settings and application preferences
              {lastSaved && (
                <span style={{ marginLeft: 8 }}>
                  • Last saved: {new Date(lastSaved).toLocaleString()}
                </span>
              )}
            </Text>
          </Col>
          <Col>
            <Space>
              {isDirty && (
                <Badge dot>
                  <Text type="warning">Unsaved changes</Text>
                </Badge>
              )}
              <Tooltip title="Export settings to JSON file">
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleExportSettings}
                  aria-label="Export settings"
                >
                  Export
                </Button>
              </Tooltip>
              <Tooltip title="Import settings from JSON file">
                <Button
                  icon={<ImportOutlined />}
                  onClick={handleImportSettings}
                  aria-label="Import settings"
                >
                  Import
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Settings Error"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 24 }}
          onClose={() => useSettingsStore.getState().setError(null)}
        />
      )}

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* User Preferences */}
        <Card
          title={
            <span>
              <UserOutlined style={{ marginRight: 8 }} />
              User Preferences
            </span>
          }
          extra={
            <Tooltip title="Customize your interface preferences">
              <InfoCircleOutlined />
            </Tooltip>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Theme</Text>
                <br />
                <Text type="secondary">Choose your preferred interface theme</Text>
              </div>
              <Select
                value={settings?.preferences.theme || 'light'}
                style={{ width: 120 }}
                onChange={(value) => setLocalSetting('preferences', { theme: value })}
                aria-label="Select theme preference"
              >
                <Option value="light">Light</Option>
                <Option value="dark">Dark</Option>
                <Option value="auto">Auto</Option>
              </Select>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Language</Text>
                <br />
                <Text type="secondary">Select your preferred language</Text>
              </div>
              <Select
                value={settings?.preferences.language || 'en'}
                style={{ width: 120 }}
                onChange={(value) => setLocalSetting('preferences', { language: value })}
                aria-label="Select language preference"
              >
                <Option value="en">English</Option>
                <Option value="es">Español</Option>
                <Option value="fr">Français</Option>
              </Select>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Compact Layout</Text>
                <br />
                <Text type="secondary">Use compact spacing for better screen utilization</Text>
              </div>
              <Switch
                checked={settings?.preferences.compactLayout || false}
                onChange={(checked) => setLocalSetting('preferences', { compactLayout: checked })}
                aria-label="Toggle compact layout"
              />
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Time Format</Text>
                <br />
                <Text type="secondary">Choose 12-hour or 24-hour time display</Text>
              </div>
              <Select
                value={settings?.preferences.timeFormat || '12h'}
                style={{ width: 120 }}
                onChange={(value) => setLocalSetting('preferences', { timeFormat: value })}
                aria-label="Select time format"
              >
                <Option value="12h">12 Hour</Option>
                <Option value="24h">24 Hour</Option>
              </Select>
            </div>
          </Space>
        </Card>

        {/* Notifications */}
        <Card
          title={
            <span>
              <BellOutlined style={{ marginRight: 8 }} />
              Notifications
            </span>
          }
          extra={
            <Tooltip title="Configure notification preferences">
              <InfoCircleOutlined />
            </Tooltip>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Work Order Notifications</Text>
                <br />
                <Text type="secondary">Receive notifications for work order updates</Text>
              </div>
              <Switch
                checked={settings?.notifications.workOrderNotifications ?? true}
                onChange={(checked) => setLocalSetting('notifications', { workOrderNotifications: checked })}
                aria-label="Toggle work order notifications"
              />
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Quality Alerts</Text>
                <br />
                <Text type="secondary">Get alerted about quality issues and NCRs</Text>
              </div>
              <Switch
                checked={settings?.notifications.qualityAlerts ?? true}
                onChange={(checked) => setLocalSetting('notifications', { qualityAlerts: checked })}
                aria-label="Toggle quality alerts"
              />
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Email Notifications</Text>
                <br />
                <Text type="secondary">Receive email notifications for important events</Text>
              </div>
              <Switch
                checked={settings?.notifications.emailNotifications ?? false}
                onChange={(checked) => setLocalSetting('notifications', { emailNotifications: checked })}
                aria-label="Toggle email notifications"
              />
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Material Shortage Alerts</Text>
                <br />
                <Text type="secondary">Get notified when materials are running low</Text>
              </div>
              <Switch
                checked={settings?.notifications.materialShortageAlerts ?? true}
                onChange={(checked) => setLocalSetting('notifications', { materialShortageAlerts: checked })}
                aria-label="Toggle material shortage alerts"
              />
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Equipment Maintenance Alerts</Text>
                <br />
                <Text type="secondary">Receive alerts for scheduled maintenance</Text>
              </div>
              <Switch
                checked={settings?.notifications.equipmentMaintenanceAlerts ?? true}
                onChange={(checked) => setLocalSetting('notifications', { equipmentMaintenanceAlerts: checked })}
                aria-label="Toggle equipment maintenance alerts"
              />
            </div>
          </Space>
        </Card>

        {/* Security */}
        <Card
          title={
            <span>
              <SecurityScanOutlined style={{ marginRight: 8 }} />
              Security
            </span>
          }
          extra={
            <Tooltip title="Manage your account security settings">
              <InfoCircleOutlined />
            </Tooltip>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Two-Factor Authentication</Text>
                <br />
                <Text type="secondary">Add an extra layer of security to your account</Text>
                {settings?.security.twoFactorEnabled && (
                  <Badge status="success" text="Enabled" style={{ display: 'block', marginTop: 4 }} />
                )}
              </div>
              <Button
                type={settings?.security.twoFactorEnabled ? 'default' : 'primary'}
                icon={<LockOutlined />}
                onClick={handleSetupTwoFactor}
                disabled={!canModifySecuritySettings}
                aria-label={settings?.security.twoFactorEnabled ? 'Disable two-factor authentication' : 'Enable two-factor authentication'}
              >
                {settings?.security.twoFactorEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Session Timeout</Text>
                <br />
                <Text type="secondary">Automatically log out after period of inactivity</Text>
              </div>
              <Select
                value={settings?.security.sessionTimeout || 30}
                style={{ width: 120 }}
                onChange={(value) => setLocalSetting('security', { sessionTimeout: value })}
                disabled={!canModifySecuritySettings}
                aria-label="Select session timeout duration"
              >
                <Option value={15}>15 minutes</Option>
                <Option value={30}>30 minutes</Option>
                <Option value={60}>1 hour</Option>
                <Option value={120}>2 hours</Option>
                <Option value={240}>4 hours</Option>
              </Select>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Change Password</Text>
                <br />
                <Text type="secondary">Update your account password</Text>
              </div>
              <Button
                icon={<LockOutlined />}
                onClick={() => setChangePasswordModalVisible(true)}
                disabled={!canModifySecuritySettings}
                aria-label="Change password"
              >
                Change Password
              </Button>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Security Notifications</Text>
                <br />
                <Text type="secondary">Get notified about security events on your account</Text>
              </div>
              <Switch
                checked={settings?.security.securityNotificationsEnabled ?? true}
                onChange={(checked) => setLocalSetting('security', { securityNotificationsEnabled: checked })}
                disabled={!canModifySecuritySettings}
                aria-label="Toggle security notifications"
              />
            </div>
          </Space>
        </Card>

        {/* Display Settings */}
        <Card
          title={
            <span>
              <EyeOutlined style={{ marginRight: 8 }} />
              Display Settings
            </span>
          }
          extra={
            <Tooltip title="Customize how information is displayed">
              <InfoCircleOutlined />
            </Tooltip>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Dashboard Layout</Text>
                <br />
                <Text type="secondary">Choose how your dashboard is organized</Text>
              </div>
              <Select
                value={settings?.display.dashboardLayout || 'standard'}
                style={{ width: 120 }}
                onChange={(value) => setLocalSetting('display', { dashboardLayout: value })}
                aria-label="Select dashboard layout"
              >
                <Option value="compact">Compact</Option>
                <Option value="standard">Standard</Option>
                <Option value="expanded">Expanded</Option>
              </Select>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Default Page Size</Text>
                <br />
                <Text type="secondary">Number of items to show per page in tables</Text>
              </div>
              <Select
                value={settings?.display.defaultPageSize || 25}
                style={{ width: 120 }}
                onChange={(value) => setLocalSetting('display', { defaultPageSize: value })}
                aria-label="Select default page size"
              >
                <Option value={10}>10 items</Option>
                <Option value={25}>25 items</Option>
                <Option value={50}>50 items</Option>
                <Option value={100}>100 items</Option>
              </Select>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>High Contrast Mode</Text>
                <br />
                <Text type="secondary">Improve visibility with high contrast colors</Text>
              </div>
              <Switch
                checked={settings?.display.highContrastMode || false}
                onChange={(checked) => setLocalSetting('display', { highContrastMode: checked })}
                aria-label="Toggle high contrast mode"
              />
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Font Size</Text>
                <br />
                <Text type="secondary">Adjust text size for better readability</Text>
              </div>
              <Select
                value={settings?.display.fontSize || 'medium'}
                style={{ width: 120 }}
                onChange={(value) => setLocalSetting('display', { fontSize: value })}
                aria-label="Select font size"
              >
                <Option value="small">Small</Option>
                <Option value="medium">Medium</Option>
                <Option value="large">Large</Option>
              </Select>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Enable Animations</Text>
                <br />
                <Text type="secondary">Show smooth transitions and animations</Text>
              </div>
              <Switch
                checked={settings?.display.enableAnimations ?? true}
                onChange={(checked) => setLocalSetting('display', { enableAnimations: checked })}
                aria-label="Toggle animations"
              />
            </div>
          </Space>
        </Card>

        {/* Actions */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleResetSettings}
                disabled={!canModifySettings}
                aria-label="Reset all settings to defaults"
              >
                Reset to Defaults
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveSettings}
                loading={isSaving}
                disabled={!isDirty}
                aria-label="Save all changes"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Card>
      </Space>

      {/* Change Password Modal */}
      <Modal
        title="Change Password"
        open={changePasswordModalVisible}
        onCancel={() => {
          setChangePasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            label="Current Password"
            name="currentPassword"
            rules={[{ required: true, message: 'Please enter your current password' }]}
          >
            <Input.Password
              placeholder="Enter current password"
              aria-label="Current password"
            />
          </Form.Item>

          <Form.Item
            label="New Password"
            name="newPassword"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 8, message: 'Password must be at least 8 characters long' },
            ]}
          >
            <Input.Password
              placeholder="Enter new password"
              aria-label="New password"
            />
          </Form.Item>

          <Form.Item
            label="Confirm New Password"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="Confirm new password"
              aria-label="Confirm new password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setChangePasswordModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Change Password
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SettingsPage;