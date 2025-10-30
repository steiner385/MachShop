import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Tabs,
  Alert,
  Switch,
  Select,
  Divider,
  Row,
  Col,
  Badge,
  Tag,
  message,
  Modal,
  Spin,
} from 'antd';
import {
  CloudOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  SecurityScanOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/AuthStore';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

interface AzureADProvider {
  id: string;
  name: string;
  enabled: boolean;
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  syncEnabled: boolean;
  lastSync?: string;
  status: 'active' | 'inactive' | 'error';
  userCount?: number;
  groupCount?: number;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    authentication: 'success' | 'failed';
    apiAccess: 'success' | 'failed';
    permissions: 'verified' | 'insufficient';
  };
  error?: string;
}

const AzureADConfig: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [providers, setProviders] = useState<AzureADProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('configuration');
  const { user } = useAuthStore();

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/admin/sso/providers?type=AZURE_AD', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
        if (data.providers?.length > 0 && !selectedProvider) {
          setSelectedProvider(data.providers[0].id);
          form.setFieldsValue(data.providers[0]);
        }
      }
    } catch (error) {
      message.error('Failed to fetch Azure AD providers');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    try {
      setLoading(true);
      const endpoint = selectedProvider
        ? `/api/v1/admin/sso/providers/${selectedProvider}`
        : '/api/v1/admin/sso/providers';

      const method = selectedProvider ? 'PUT' : 'POST';

      const payload = {
        type: 'AZURE_AD',
        name: values.name,
        enabled: values.enabled,
        metadata: {
          tenantId: values.tenantId,
          clientId: values.clientId,
          clientSecret: values.clientSecret,
          syncEnabled: values.syncEnabled,
          syncSettings: {
            syncUsers: values.syncUsers,
            syncGroups: values.syncGroups,
            autoCreateUsers: values.autoCreateUsers,
            userMapping: values.userMapping,
          },
        },
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        message.success('Azure AD configuration saved successfully');
        fetchProviders();
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to save configuration');
      }
    } catch (error) {
      message.error('Failed to save Azure AD configuration');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionResult(null);

      const values = form.getFieldsValue();
      const response = await fetch('/api/v1/admin/azure-ad/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          providerId: selectedProvider,
          tenantId: values.tenantId,
          clientId: values.clientId,
          clientSecret: values.clientSecret,
        }),
      });

      const result = await response.json();
      setConnectionResult(result.connectionTest || result);
    } catch (error) {
      setConnectionResult({
        success: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const triggerSync = async () => {
    if (!selectedProvider) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/v1/admin/azure-ad/sync/${selectedProvider}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        message.success('Synchronization started successfully');
        fetchProviders();
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to start synchronization');
      }
    } catch (error) {
      message.error('Failed to start synchronization');
    } finally {
      setLoading(false);
    }
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);

  const renderConnectionStatus = () => {
    if (!connectionResult) return null;

    return (
      <Alert
        type={connectionResult.success ? 'success' : 'error'}
        message={connectionResult.message}
        description={
          connectionResult.details && (
            <Space direction="vertical">
              <div>
                <Tag color={connectionResult.details.authentication === 'success' ? 'green' : 'red'}>
                  Authentication: {connectionResult.details.authentication}
                </Tag>
                <Tag color={connectionResult.details.apiAccess === 'success' ? 'green' : 'red'}>
                  API Access: {connectionResult.details.apiAccess}
                </Tag>
                <Tag color={connectionResult.details.permissions === 'verified' ? 'green' : 'red'}>
                  Permissions: {connectionResult.details.permissions}
                </Tag>
              </div>
              {connectionResult.error && (
                <Text type="danger">{connectionResult.error}</Text>
              )}
            </Space>
          )
        }
        style={{ marginBottom: 16 }}
      />
    );
  };

  const renderProviderSelect = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Row gutter={16} align="middle">
        <Col flex="auto">
          <Select
            style={{ width: '100%' }}
            placeholder="Select Azure AD Provider"
            value={selectedProvider}
            onChange={(value) => {
              setSelectedProvider(value);
              const provider = providers.find(p => p.id === value);
              if (provider) {
                form.setFieldsValue(provider);
              }
            }}
            loading={loading}
          >
            {providers.map(provider => (
              <Option key={provider.id} value={provider.id}>
                <Space>
                  <Badge
                    status={provider.status === 'active' ? 'success' : provider.status === 'error' ? 'error' : 'default'}
                  />
                  {provider.name}
                  {provider.enabled && <Tag color="blue">Enabled</Tag>}
                </Space>
              </Option>
            ))}
          </Select>
        </Col>
        <Col>
          <Button
            type="dashed"
            onClick={() => {
              setSelectedProvider(null);
              form.resetFields();
            }}
          >
            Create New
          </Button>
        </Col>
      </Row>
    </Card>
  );

  const renderConfigurationTab = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSave}
      initialValues={{
        enabled: true,
        syncEnabled: true,
        syncUsers: true,
        syncGroups: true,
        autoCreateUsers: false,
      }}
    >
      <Row gutter={24}>
        <Col span={12}>
          <Card title="Basic Configuration" size="small">
            <Form.Item
              name="name"
              label="Provider Name"
              rules={[{ required: true, message: 'Please enter provider name' }]}
            >
              <Input placeholder="e.g., Corporate Azure AD" />
            </Form.Item>

            <Form.Item name="enabled" label="Enable Provider" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item
              name="tenantId"
              label="Tenant ID"
              rules={[{ required: true, message: 'Please enter tenant ID' }]}
            >
              <Input placeholder="Your Azure AD Tenant ID" />
            </Form.Item>

            <Form.Item
              name="clientId"
              label="Application (Client) ID"
              rules={[{ required: true, message: 'Please enter client ID' }]}
            >
              <Input placeholder="Azure AD Application Client ID" />
            </Form.Item>

            <Form.Item
              name="clientSecret"
              label="Client Secret"
              rules={[{ required: !selectedProvider, message: 'Please enter client secret' }]}
            >
              <Input.Password
                placeholder="Azure AD Application Client Secret"
                visibilityToggle
              />
            </Form.Item>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Synchronization Settings" size="small">
            <Form.Item name="syncEnabled" label="Enable Synchronization" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item name="syncUsers" label="Sync Users" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item name="syncGroups" label="Sync Groups" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item name="autoCreateUsers" label="Auto-Create Users" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item name="userMapping" label="User Attribute Mapping">
              <TextArea
                placeholder="JSON mapping configuration (optional)"
                rows={4}
              />
            </Form.Item>
          </Card>
        </Col>
      </Row>

      {renderConnectionStatus()}

      <Card size="small" style={{ marginTop: 16 }}>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            <SettingOutlined />
            Save Configuration
          </Button>

          <Button onClick={testConnection} loading={testingConnection}>
            <SecurityScanOutlined />
            Test Connection
          </Button>

          {currentProvider?.syncEnabled && (
            <Button onClick={triggerSync} loading={loading}>
              <ReloadOutlined />
              Sync Now
            </Button>
          )}
        </Space>
      </Card>
    </Form>
  );

  const renderStatusTab = () => (
    <Row gutter={16}>
      <Col span={8}>
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <CloudOutlined style={{ fontSize: 32, color: '#1890ff' }} />
              <Title level={4}>Connection Status</Title>
              <Badge
                status={currentProvider?.status === 'active' ? 'success' : 'error'}
                text={currentProvider?.status || 'Unknown'}
              />
            </div>
          </Space>
        </Card>
      </Col>

      <Col span={8}>
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <UserOutlined style={{ fontSize: 32, color: '#52c41a' }} />
              <Title level={4}>Synced Users</Title>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
                {currentProvider?.userCount || 0}
              </Text>
            </div>
          </Space>
        </Card>
      </Col>

      <Col span={8}>
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <TeamOutlined style={{ fontSize: 32, color: '#faad14' }} />
              <Title level={4}>Synced Groups</Title>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
                {currentProvider?.groupCount || 0}
              </Text>
            </div>
          </Space>
        </Card>
      </Col>

      <Col span={24} style={{ marginTop: 16 }}>
        <Card title="Synchronization History" size="small">
          <Alert
            message="Last Synchronization"
            description={
              currentProvider?.lastSync
                ? `Completed on ${new Date(currentProvider.lastSync).toLocaleString()}`
                : 'No synchronization performed yet'
            }
            type="info"
            showIcon
          />
        </Card>
      </Col>
    </Row>
  );

  const renderApiEndpointsTab = () => (
    <Card title="Azure AD Graph API Endpoints" size="small">
      <Paragraph>
        The following API endpoints are available for Azure AD integration:
      </Paragraph>

      <div style={{ marginBottom: 16 }}>
        <Tag color="blue">GET</Tag>
        <Text code>/api/v1/admin/azure-ad/status</Text>
        <Text type="secondary"> - Get Azure AD integration status</Text>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Tag color="blue">GET</Tag>
        <Text code>/api/v1/admin/azure-ad/health</Text>
        <Text type="secondary"> - Check Azure AD connectivity and health</Text>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Tag color="green">POST</Tag>
        <Text code>/api/v1/admin/azure-ad/test-connection</Text>
        <Text type="secondary"> - Test Azure AD connection</Text>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Tag color="green">POST</Tag>
        <Text code>/api/v1/admin/azure-ad/sync/{'{providerId}'}</Text>
        <Text type="secondary"> - Trigger user/group synchronization</Text>
      </div>

      <Divider />

      <Alert
        message="API Authentication"
        description="All API endpoints require valid authentication tokens and system administrator privileges."
        type="warning"
        showIcon
      />
    </Card>
  );

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>
            <ApiOutlined /> Azure AD / Entra ID Configuration
          </Title>
          <Paragraph>
            Configure Azure Active Directory integration for single sign-on and user synchronization.
            Ensure your Azure AD application has the necessary Microsoft Graph API permissions.
          </Paragraph>
        </div>

        {renderProviderSelect()}

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <SettingOutlined />
                Configuration
              </span>
            }
            key="configuration"
          >
            <Spin spinning={loading}>
              {renderConfigurationTab()}
            </Spin>
          </TabPane>

          <TabPane
            tab={
              <span>
                <CheckCircleOutlined />
                Status
              </span>
            }
            key="status"
          >
            {renderStatusTab()}
          </TabPane>

          <TabPane
            tab={
              <span>
                <ApiOutlined />
                API Reference
              </span>
            }
            key="api"
          >
            {renderApiEndpointsTab()}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default AzureADConfig;