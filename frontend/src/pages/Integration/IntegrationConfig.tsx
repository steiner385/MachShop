/**
 * Integration Configuration Page
 *
 * CRUD interface for managing ERP/PLM integration configurations.
 * Allows creation, editing, enabling/disabling, and deletion of integrations.
 */

import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Card,
  Typography,
  Tag,
  Divider,
  Alert,
  Spin,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ApiOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Integration {
  id: string;
  name: string;
  displayName: string;
  type: 'ERP' | 'PLM' | 'CMMS';
  enabled: boolean;
  lastSync?: string;
  lastSyncStatus?: string;
  errorCount: number;
  totalSyncs: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

interface IntegrationFormData {
  name: string;
  displayName: string;
  type: 'ERP' | 'PLM' | 'CMMS';
  integrationType: 'oracle_fusion' | 'oracle_ebs' | 'teamcenter';
  enabled: boolean;
  config: any;
}

const IntegrationConfig: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    document.title = 'Integration Configuration - MES';
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/integrations');
      setIntegrations(response.data);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      message.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingIntegration(null);
    form.resetFields();
    form.setFieldsValue({
      enabled: true,
      type: 'ERP',
      integrationType: 'oracle_fusion',
    });
    setModalVisible(true);
  };

  const handleEdit = (integration: Integration) => {
    setEditingIntegration(integration);
    form.setFieldsValue({
      name: integration.name,
      displayName: integration.displayName,
      type: integration.type,
      enabled: integration.enabled,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/v1/integrations/${id}`);
      message.success('Integration deleted successfully');
      fetchIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      message.error('Failed to delete integration');
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      const values = await form.validateFields();

      // Build config based on integration type
      const config = buildConfigFromForm(values);

      // Create temporary integration for testing
      const response = await axios.post('/api/v1/integrations', {
        name: `test_${Date.now()}`,
        displayName: 'Test Connection',
        type: values.type,
        config,
        enabled: false,
      });

      // Test connection
      const testResponse = await axios.post(`/api/v1/integrations/${response.data.id}/test`);

      // Delete temporary integration
      await axios.delete(`/api/v1/integrations/${response.data.id}`);

      if (testResponse.data.success) {
        message.success(`Connection successful! Response time: ${testResponse.data.responseTime}ms`);
      } else {
        message.error(`Connection failed: ${testResponse.data.error}`);
      }
    } catch (error: any) {
      console.error('Error testing connection:', error);
      message.error('Connection test failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setTestingConnection(false);
    }
  };

  const buildConfigFromForm = (values: any): any => {
    switch (values.integrationType) {
      case 'oracle_fusion':
        return {
          oicBaseUrl: values.oicBaseUrl,
          fusionBaseUrl: values.fusionBaseUrl,
          clientId: values.clientId,
          clientSecret: values.clientSecret,
          tokenUrl: values.tokenUrl,
          scopes: values.scopes?.split(',').map((s: string) => s.trim()) || [],
          webhookSecret: values.webhookSecret || '',
          syncInterval: parseInt(values.syncInterval) || 60,
          batchSize: parseInt(values.batchSize) || 100,
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000,
        };

      case 'oracle_ebs':
        return {
          ebsBaseUrl: values.ebsBaseUrl,
          isgRestPath: values.isgRestPath || '/webservices/rest',
          ebsVersion: values.ebsVersion,
          authType: values.authType || 'BASIC',
          username: values.username,
          password: values.password,
          responsibility: values.responsibility,
          respApplication: values.respApplication,
          securityGroup: values.securityGroup,
          orgId: values.orgId ? parseInt(values.orgId) : undefined,
          modules: {
            wip: values.module_wip !== false,
            inv: values.module_inv !== false,
            bom: values.module_bom !== false,
            po: values.module_po !== false,
          },
          syncInterval: parseInt(values.syncInterval) || 60,
          batchSize: parseInt(values.batchSize) || 100,
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000,
        };

      case 'teamcenter':
        return {
          tcBaseUrl: values.tcBaseUrl,
          soaRestPath: values.soaRestPath || '/tc/soa/rest',
          tcVersion: values.tcVersion,
          username: values.username,
          password: values.password,
          discriminator: values.discriminator || '',
          locale: values.locale || 'en_US',
          groupName: values.groupName,
          roleName: values.roleName,
          modules: {
            itemManagement: values.module_itemManagement !== false,
            bom: values.module_bom !== false,
            changeManagement: values.module_changeManagement || false,
            mpp: values.module_mpp || false,
            documents: values.module_documents || false,
          },
          bomViewType: values.bomViewType || 'Manufacturing',
          bomRevisionRule: values.bomRevisionRule || 'Working',
          syncInterval: parseInt(values.syncInterval) || 60,
          batchSize: parseInt(values.batchSize) || 100,
          includeCADData: values.includeCADData || false,
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000,
        };

      default:
        return {};
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const config = buildConfigFromForm(values);

      const data: any = {
        name: values.name,
        displayName: values.displayName,
        type: values.type,
        enabled: values.enabled,
        config,
      };

      if (editingIntegration) {
        await axios.put(`/api/v1/integrations/${editingIntegration.id}`, data);
        message.success('Integration updated successfully');
      } else {
        await axios.post('/api/v1/integrations', data);
        message.success('Integration created successfully');
      }

      setModalVisible(false);
      fetchIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      message.error('Failed to save integration');
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await axios.put(`/api/v1/integrations/${id}`, { enabled });
      message.success(`Integration ${enabled ? 'enabled' : 'disabled'}`);
      fetchIntegrations();
    } catch (error) {
      console.error('Error toggling integration:', error);
      message.error('Failed to update integration');
    }
  };

  const renderConfigForm = () => {
    const integrationType = Form.useWatch('integrationType', form);

    return (
      <>
        <Form.Item
          name="integrationType"
          label="Integration System"
          rules={[{ required: true }]}
        >
          <Select disabled={!!editingIntegration}>
            <Select.Option value="oracle_fusion">Oracle Fusion Cloud ERP</Select.Option>
            <Select.Option value="oracle_ebs">Oracle E-Business Suite (EBS)</Select.Option>
            <Select.Option value="teamcenter">Siemens Teamcenter PLM</Select.Option>
          </Select>
        </Form.Item>

        {integrationType === 'oracle_fusion' && (
          <>
            <Divider>Oracle Fusion Configuration</Divider>
            <Form.Item name="oicBaseUrl" label="OIC Base URL" rules={[{ required: true }]}>
              <Input placeholder="https://your-instance.oic.oraclecloud.com" />
            </Form.Item>
            <Form.Item name="fusionBaseUrl" label="Fusion Base URL" rules={[{ required: true }]}>
              <Input placeholder="https://your-instance.fa.us2.oraclecloud.com" />
            </Form.Item>
            <Form.Item name="clientId" label="Client ID" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="clientSecret" label="Client Secret" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item name="tokenUrl" label="Token URL" rules={[{ required: true }]}>
              <Input placeholder="https://idcs-xxxxx.identity.oraclecloud.com/oauth2/v1/token" />
            </Form.Item>
            <Form.Item name="scopes" label="OAuth Scopes" help="Comma-separated">
              <Input placeholder="urn:opc:resource:fa:instanceid=xxxx" />
            </Form.Item>
            <Form.Item name="webhookSecret" label="Webhook Secret">
              <Input.Password />
            </Form.Item>
          </>
        )}

        {integrationType === 'oracle_ebs' && (
          <>
            <Divider>Oracle EBS Configuration</Divider>
            <Form.Item name="ebsBaseUrl" label="EBS Base URL" rules={[{ required: true }]}>
              <Input placeholder="https://ebs.company.com" />
            </Form.Item>
            <Form.Item name="isgRestPath" label="ISG REST Path" initialValue="/webservices/rest">
              <Input />
            </Form.Item>
            <Form.Item name="ebsVersion" label="EBS Version" rules={[{ required: true }]}>
              <Input placeholder="12.2.10" />
            </Form.Item>
            <Form.Item name="authType" label="Auth Type" initialValue="BASIC">
              <Select>
                <Select.Option value="BASIC">Basic Authentication</Select.Option>
                <Select.Option value="SESSION">Session-based</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="username" label="Username" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item name="responsibility" label="Responsibility" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="respApplication" label="Resp Application" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="securityGroup" label="Security Group" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="orgId" label="Operating Unit ID">
              <Input type="number" />
            </Form.Item>
            <Divider>EBS Modules</Divider>
            <Form.Item name="module_wip" label="Work In Process (WIP)" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="module_inv" label="Inventory (INV)" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="module_bom" label="Bill of Materials (BOM)" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="module_po" label="Purchase Orders (PO)" valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
          </>
        )}

        {integrationType === 'teamcenter' && (
          <>
            <Divider>Teamcenter Configuration</Divider>
            <Form.Item name="tcBaseUrl" label="Teamcenter Base URL" rules={[{ required: true }]}>
              <Input placeholder="https://tc.company.com" />
            </Form.Item>
            <Form.Item name="soaRestPath" label="SOA REST Path" initialValue="/tc/soa/rest">
              <Input />
            </Form.Item>
            <Form.Item name="tcVersion" label="Teamcenter Version" rules={[{ required: true }]}>
              <Input placeholder="13.3.0" />
            </Form.Item>
            <Form.Item name="username" label="Username" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item name="discriminator" label="Discriminator (LDAP/SSO)">
              <Input />
            </Form.Item>
            <Form.Item name="locale" label="Locale" initialValue="en_US">
              <Input />
            </Form.Item>
            <Form.Item name="groupName" label="Group Name">
              <Input />
            </Form.Item>
            <Form.Item name="roleName" label="Role Name">
              <Input />
            </Form.Item>
            <Divider>BOM Configuration</Divider>
            <Form.Item name="bomViewType" label="BOM View Type" initialValue="Manufacturing">
              <Select>
                <Select.Option value="Manufacturing">Manufacturing</Select.Option>
                <Select.Option value="Engineering">Engineering</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="bomRevisionRule" label="BOM Revision Rule" initialValue="Working">
              <Select>
                <Select.Option value="Working">Working</Select.Option>
                <Select.Option value="Latest Released">Latest Released</Select.Option>
              </Select>
            </Form.Item>
            <Divider>Teamcenter Modules</Divider>
            <Form.Item name="module_itemManagement" label="Item Management" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="module_bom" label="BOM Management" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="module_changeManagement" label="Change Management (ECO/ECN)" valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
            <Form.Item name="module_mpp" label="Manufacturing Process Plans" valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
            <Form.Item name="module_documents" label="Document Management" valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
            <Form.Item name="includeCADData" label="Include CAD Metadata" valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
          </>
        )}

        <Divider>Sync Settings</Divider>
        <Form.Item name="syncInterval" label="Sync Interval (minutes)" initialValue={60}>
          <Input type="number" min={5} />
        </Form.Item>
        <Form.Item name="batchSize" label="Batch Size" initialValue={100}>
          <Input type="number" min={10} max={1000} />
        </Form.Item>
      </>
    );
  };

  const columns = [
    {
      title: 'Integration',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: Integration) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.name} ({record.type})
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: Integration) => (
        <Space>
          {record.enabled ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Enabled
            </Tag>
          ) : (
            <Tag color="default" icon={<CloseCircleOutlined />}>
              Disabled
            </Tag>
          )}
          {record.errorCount > 0 && (
            <Tooltip title={`${record.errorCount} error(s)`}>
              <Tag color="warning" icon={<WarningOutlined />}>
                Errors
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Last Sync',
      dataIndex: 'lastSync',
      key: 'lastSync',
      render: (date?: string, record?: Integration) => (
        date ? (
          <div>
            <div>{new Date(date).toLocaleString()}</div>
            {record?.lastSyncStatus && (
              <Tag
                color={
                  record.lastSyncStatus === 'SUCCESS' ? 'success' :
                  record.lastSyncStatus === 'PARTIAL' ? 'warning' : 'error'
                }
                style={{ marginTop: 4 }}
              >
                {record.lastSyncStatus}
              </Tag>
            )}
          </div>
        ) : (
          <Text type="secondary">Never</Text>
        )
      ),
    },
    {
      title: 'Syncs',
      dataIndex: 'totalSyncs',
      key: 'totalSyncs',
      render: (total: number, record: Integration) => (
        <div>
          <div>{total} total</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.successCount} success / {record.failureCount} failed
          </Text>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Integration) => (
        <Space>
          <Tooltip title={record.enabled ? 'Disable' : 'Enable'}>
            <Switch
              checked={record.enabled}
              onChange={(checked) => handleToggleEnabled(record.id, checked)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete integration?"
            description="This will delete all associated logs. This action cannot be undone."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Tooltip title="Delete">
              <Button icon={<DeleteOutlined />} danger size="small" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Integration Configuration
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          New Integration
        </Button>
      </div>

      <Alert
        message="Integration Management"
        description="Configure connections to external ERP and PLM systems. Integrations sync data automatically based on the configured schedule."
        type="info"
        showIcon
        icon={<ApiOutlined />}
        style={{ marginBottom: 24 }}
        closable
      />

      <Card>
        <Table
          dataSource={integrations.map(i => ({ ...i, key: i.id }))}
          columns={columns}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} integrations`,
          }}
        />
      </Card>

      <Modal
        title={editingIntegration ? 'Edit Integration' : 'Create Integration'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="test"
            icon={<ApiOutlined />}
            onClick={handleTestConnection}
            loading={testingConnection}
            disabled={!!editingIntegration}
          >
            Test Connection
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            {editingIntegration ? 'Update' : 'Create'}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Internal Name"
            rules={[{ required: true }, { pattern: /^[a-z0-9_]+$/, message: 'Use lowercase, numbers, and underscores only' }]}
            help="Unique identifier (e.g., oracle_fusion_prod)"
          >
            <Input disabled={!!editingIntegration} />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="Display Name"
            rules={[{ required: true }]}
          >
            <Input placeholder="Oracle Fusion Production" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Integration Type"
            rules={[{ required: true }]}
          >
            <Select disabled={!!editingIntegration}>
              <Select.Option value="ERP">ERP (Enterprise Resource Planning)</Select.Option>
              <Select.Option value="PLM">PLM (Product Lifecycle Management)</Select.Option>
              <Select.Option value="CMMS">CMMS (Maintenance Management)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="enabled"
            label="Enabled"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Divider />

          {renderConfigForm()}
        </Form>
      </Modal>
    </div>
  );
};

export default IntegrationConfig;
