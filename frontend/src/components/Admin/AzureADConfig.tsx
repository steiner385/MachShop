import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Alert,
  Tabs,
  Typography,
  Switch,
  Row,
  Col,
  Divider,
  message,
  Spin,
  Badge,
  List,
  Tooltip,
  Select,
  InputNumber
} from 'antd';
import {
  CloudOutlined,
  KeyOutlined,
  SecurityScanOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  ApiOutlined,
  TeamOutlined,
  SettingOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface AzureADConfiguration {
  id?: string;
  name: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  authority?: string;
  redirectUri: string;
  scopes: string[];
  enabled: boolean;
  autoUserCreation: boolean;
  defaultRoles: string[];
  userAttributeMapping: {
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    department: string;
    jobTitle: string;
  };
  groupSync: {
    enabled: boolean;
    groupFilter: string;
    roleMapping: Record<string, string>;
  };
  advancedSettings: {
    tokenValidationEnabled: boolean;
    claimsValidation: string[];
    sessionTimeout: number;
    refreshTokenLifetime: number;
  };
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

const AzureADConfig: React.FC = () => {
  const [form] = Form.useForm<AzureADConfiguration>();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionTestResult | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // Initialize form with default values
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const response = await axios.get('/api/admin/azure-ad/config');
        const configData = response.data;
        form.setFieldsValue(configData);
      } catch (error) {
        // Initialize with default configuration if none exists
        const defaultConfig: AzureADConfiguration = {
          name: 'Azure AD Integration',
          tenantId: '',
          clientId: '',
          clientSecret: '',
          authority: 'https://login.microsoftonline.com/',
          redirectUri: `${window.location.origin}/auth/callback/azure`,
          scopes: ['openid', 'profile', 'email', 'User.Read'],
          enabled: false,
          autoUserCreation: true,
          defaultRoles: ['user'],
          userAttributeMapping: {
            email: 'mail',
            firstName: 'givenName',
            lastName: 'surname',
            displayName: 'displayName',
            department: 'department',
            jobTitle: 'jobTitle',
          },
          groupSync: {
            enabled: false,
            groupFilter: '',
            roleMapping: {},
          },
          advancedSettings: {
            tokenValidationEnabled: true,
            claimsValidation: ['aud', 'iss', 'exp'],
            sessionTimeout: 480, // 8 hours in minutes
            refreshTokenLifetime: 7 * 24 * 60, // 7 days in minutes
          },
        };
        form.setFieldsValue(defaultConfig);
      }
    };

    loadConfiguration();
  }, [form]);

  const handleSave = async (values: AzureADConfiguration) => {
    setLoading(true);
    try {
      await axios.post('/api/admin/azure-ad/config', values);
      message.success('Azure AD configuration saved successfully');
    } catch (error) {
      console.error('Failed to save Azure AD configuration:', error);
      message.error('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTestLoading(true);
    try {
      const values = await form.validateFields();
      const response = await axios.post('/api/admin/azure-ad/test-connection', values);

      const result: ConnectionTestResult = {
        success: response.data.success,
        message: response.data.message,
        details: response.data.details,
        timestamp: new Date().toISOString(),
      };

      setConnectionStatus(result);

      if (result.success) {
        message.success('Connection test successful');
      } else {
        message.error('Connection test failed');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus({
        success: false,
        message: 'Connection test failed with an error',
        timestamp: new Date().toISOString(),
      });
      message.error('Connection test failed');
    } finally {
      setTestLoading(false);
    }
  };

  const getConnectionStatusBadge = () => {
    if (!connectionStatus) return null;

    return (
      <Badge
        status={connectionStatus.success ? 'success' : 'error'}
        text={connectionStatus.success ? 'Connected' : 'Connection Failed'}
      />
    );
  };

  const basicConfigTab = (
    <Card title="Basic Configuration" size="small">
      <Form.Item
        name="name"
        label="Configuration Name"
        rules={[{ required: true, message: 'Please enter a configuration name' }]}
        tooltip="A friendly name for this Azure AD configuration"
      >
        <Input placeholder="Azure AD Integration" />
      </Form.Item>

      <Row gutter={24}>
        <Col span={12}>
          <Form.Item
            name="tenantId"
            label="Tenant ID"
            rules={[{ required: true, message: 'Please enter your Azure AD Tenant ID' }]}
            tooltip="Your Azure AD tenant ID (Directory ID)"
          >
            <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="clientId"
            label="Application (Client) ID"
            rules={[{ required: true, message: 'Please enter your Application Client ID' }]}
            tooltip="The Application (client) ID of your Azure AD app registration"
          >
            <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="clientSecret"
        label="Client Secret"
        rules={[{ required: true, message: 'Please enter your client secret' }]}
        tooltip="The client secret value (not the secret ID)"
      >
        <Input.Password placeholder="Enter client secret" />
      </Form.Item>

      <Row gutter={24}>
        <Col span={12}>
          <Form.Item
            name="authority"
            label="Authority URL"
            rules={[{ required: true, message: 'Please enter the authority URL' }]}
            tooltip="The Azure AD authority URL"
          >
            <Input placeholder="https://login.microsoftonline.com/" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="redirectUri"
            label="Redirect URI"
            rules={[{ required: true, message: 'Please enter the redirect URI' }]}
            tooltip="The redirect URI configured in your Azure AD app registration"
          >
            <Input placeholder={`${window.location.origin}/auth/callback/azure`} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="scopes"
        label="OAuth Scopes"
        tooltip="OAuth scopes to request from Azure AD"
      >
        <Select
          mode="tags"
          placeholder="Add OAuth scopes"
          defaultValue={['openid', 'profile', 'email', 'User.Read']}
          style={{ width: '100%' }}
        />
      </Form.Item>
    </Card>
  );

  const userManagementTab = (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="User Creation & Mapping" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="autoUserCreation" label="Auto-create Users" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="defaultRoles" label="Default Roles">
              <Select mode="multiple" placeholder="Select default roles">
                <Select.Option value="user">User</Select.Option>
                <Select.Option value="operator">Operator</Select.Option>
                <Select.Option value="supervisor">Supervisor</Select.Option>
                <Select.Option value="admin">Admin</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider>Attribute Mapping</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name={['userAttributeMapping', 'email']} label="Email Field">
              <Input placeholder="mail" />
            </Form.Item>
            <Form.Item name={['userAttributeMapping', 'firstName']} label="First Name Field">
              <Input placeholder="givenName" />
            </Form.Item>
            <Form.Item name={['userAttributeMapping', 'lastName']} label="Last Name Field">
              <Input placeholder="surname" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={['userAttributeMapping', 'displayName']} label="Display Name Field">
              <Input placeholder="displayName" />
            </Form.Item>
            <Form.Item name={['userAttributeMapping', 'department']} label="Department Field">
              <Input placeholder="department" />
            </Form.Item>
            <Form.Item name={['userAttributeMapping', 'jobTitle']} label="Job Title Field">
              <Input placeholder="jobTitle" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Group Synchronization" size="small">
        <Form.Item name={['groupSync', 'enabled']} label="Enable Group Sync" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name={['groupSync', 'groupFilter']} label="Group Filter">
          <Input placeholder="e.g., displayName startswith 'MES-'" />
        </Form.Item>
        <Form.Item name={['groupSync', 'roleMapping']} label="Group to Role Mapping">
          <TextArea
            rows={4}
            placeholder={`JSON format:
{
  "MES-Admins": "admin",
  "MES-Operators": "operator",
  "MES-Supervisors": "supervisor"
}`}
          />
        </Form.Item>
      </Card>
    </Space>
  );

  const advancedConfigTab = (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="Integration Settings" size="small">
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="enabled"
              label="Enable Azure AD Integration"
              valuePropName="checked"
              tooltip="Enable or disable Azure AD authentication"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Security & Session Settings" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name={['advancedSettings', 'tokenValidationEnabled']}
              label="Enable Token Validation"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item name={['advancedSettings', 'sessionTimeout']} label="Session Timeout (minutes)">
              <InputNumber min={1} max={1440} placeholder="480" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={['advancedSettings', 'claimsValidation']} label="Required Claims">
              <Select mode="tags" placeholder="Select or enter claims">
                <Select.Option value="aud">aud (Audience)</Select.Option>
                <Select.Option value="iss">iss (Issuer)</Select.Option>
                <Select.Option value="exp">exp (Expiration)</Select.Option>
                <Select.Option value="nbf">nbf (Not Before)</Select.Option>
                <Select.Option value="iat">iat (Issued At)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name={['advancedSettings', 'refreshTokenLifetime']} label="Refresh Token Lifetime (minutes)">
              <InputNumber min={60} max={43200} placeholder="10080" />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </Space>
  );

  const testingTab = (
    <Card title="Connection Testing" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message="Test your Azure AD configuration"
          description="Use this tool to verify that your Azure AD configuration is correct and the connection is working."
          type="info"
          showIcon
        />

        <Row gutter={24} align="middle">
          <Col span={18}>
            <Space direction="vertical" size="small">
              <Text strong>Connection Status</Text>
              {connectionStatus ? (
                <div>
                  {getConnectionStatusBadge()}
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    Last tested: {new Date(connectionStatus.timestamp).toLocaleString()}
                  </Text>
                </div>
              ) : (
                <Text type="secondary">No test performed yet</Text>
              )}
            </Space>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<SecurityScanOutlined />}
              loading={testLoading}
              onClick={testConnection}
            >
              Test Connection
            </Button>
          </Col>
        </Row>

        {connectionStatus && (
          <Card size="small" title="Test Results">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Status: </Text>
                {connectionStatus.success ? (
                  <Text type="success">
                    <CheckCircleOutlined /> Success
                  </Text>
                ) : (
                  <Text type="danger">
                    <ExclamationCircleOutlined /> Failed
                  </Text>
                )}
              </div>
              <div>
                <Text strong>Message: </Text>
                <Text>{connectionStatus.message}</Text>
              </div>
              {connectionStatus.details && (
                <div>
                  <Text strong>Details:</Text>
                  <pre style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    fontSize: '12px',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(connectionStatus.details, null, 2)}
                  </pre>
                </div>
              )}
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  );

  const tabItems = [
    {
      key: 'basic',
      label: (
        <span>
          <SettingOutlined />
          Basic
        </span>
      ),
      children: basicConfigTab,
    },
    {
      key: 'users',
      label: (
        <span>
          <TeamOutlined />
          User Management
        </span>
      ),
      children: userManagementTab,
    },
    {
      key: 'advanced',
      label: (
        <span>
          <ApiOutlined />
          Advanced
        </span>
      ),
      children: advancedConfigTab,
    },
    {
      key: 'testing',
      label: (
        <span>
          <SecurityScanOutlined />
          Testing
        </span>
      ),
      children: testingTab,
    },
  ];

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSave}
      style={{ width: '100%' }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={4}>
            <CloudOutlined style={{ marginRight: 8 }} />
            Azure AD Configuration
          </Title>
          <Paragraph type="secondary">
            Configure your Azure Active Directory integration settings. Make sure to register
            your application in Azure AD before configuring these settings.
          </Paragraph>
        </div>

        {/* Configuration Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="default"
        />

        {/* Action Buttons */}
        <Card>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Button
                  icon={<SyncOutlined />}
                  onClick={() => form.resetFields()}
                >
                  Reset
                </Button>
                <Button
                  icon={<SecurityScanOutlined />}
                  loading={testLoading}
                  onClick={testConnection}
                >
                  Test Configuration
                </Button>
              </Space>
            </Col>
            <Col>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<CheckCircleOutlined />}
              >
                Save Configuration
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Help Section */}
        <Card title="Configuration Help" size="small">
          <List
            size="small"
            dataSource={[
              {
                title: 'Azure AD App Registration',
                description: 'Create an app registration in Azure AD portal and obtain the Tenant ID, Client ID, and Client Secret.',
              },
              {
                title: 'Redirect URI',
                description: 'Add the redirect URI to your Azure AD app registration under Authentication settings.',
              },
              {
                title: 'API Permissions',
                description: 'Grant the necessary permissions (User.Read, openid, profile, email) in your Azure AD app.',
              },
              {
                title: 'Admin Consent',
                description: 'If required by your organization, request admin consent for the application permissions.',
              },
            ]}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={item.title}
                  description={item.description}
                />
              </List.Item>
            )}
          />
        </Card>
      </Space>
    </Form>
  );
};

export default AzureADConfig;