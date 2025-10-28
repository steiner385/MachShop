import React from 'react';
import { Card, Typography, Space, Divider, Switch, Select, Button } from 'antd';
import { SettingOutlined, UserOutlined, BellOutlined, SecurityScanOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * Settings Page Component
 *
 * Provides user settings and application preferences configuration.
 * Addresses GitHub Issue #15 - UI Navigation improvements by ensuring
 * the Settings page is reachable via navigation menu.
 */
const SettingsPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <SettingOutlined style={{ marginRight: 8 }} />
          Settings
        </Title>
        <Text type="secondary">
          Manage your account settings and application preferences
        </Text>
      </div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* User Preferences */}
        <Card
          title={
            <span>
              <UserOutlined style={{ marginRight: 8 }} />
              User Preferences
            </span>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Theme</Text>
                <br />
                <Text type="secondary">Choose your preferred interface theme</Text>
              </div>
              <Select defaultValue="light" style={{ width: 120 }}>
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
              <Select defaultValue="en" style={{ width: 120 }}>
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
              <Switch />
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
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Work Order Notifications</Text>
                <br />
                <Text type="secondary">Receive notifications for work order updates</Text>
              </div>
              <Switch defaultChecked />
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Quality Alerts</Text>
                <br />
                <Text type="secondary">Get alerted about quality issues and NCRs</Text>
              </div>
              <Switch defaultChecked />
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Email Notifications</Text>
                <br />
                <Text type="secondary">Receive email notifications for important events</Text>
              </div>
              <Switch />
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
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Two-Factor Authentication</Text>
                <br />
                <Text type="secondary">Add an extra layer of security to your account</Text>
              </div>
              <Button type="primary">Configure</Button>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Session Timeout</Text>
                <br />
                <Text type="secondary">Automatically log out after period of inactivity</Text>
              </div>
              <Select defaultValue="30" style={{ width: 120 }}>
                <Option value="15">15 minutes</Option>
                <Option value="30">30 minutes</Option>
                <Option value="60">1 hour</Option>
                <Option value="120">2 hours</Option>
              </Select>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Change Password</Text>
                <br />
                <Text type="secondary">Update your account password</Text>
              </div>
              <Button>Change Password</Button>
            </div>
          </Space>
        </Card>

        {/* Actions */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
            <Button>Reset to Defaults</Button>
            <Button type="primary">Save Changes</Button>
          </div>
        </Card>
      </Space>
    </div>
  );
};

export default SettingsPage;