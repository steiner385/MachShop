/**
 * Andon Configuration Manager Component
 * GitHub Issue #171: Production Alerts & Andon Core Infrastructure
 *
 * Administrative interface for managing Andon system configurations
 * Supports global and site-specific settings management
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Alert,
  Space,
  Typography,
  Tag,
  Tooltip,
  Popconfirm,
  Upload,
  message,
  Spin,
  Row,
  Col,
  Divider,
  Badge,
  Empty
} from 'antd';
import {
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  BankOutlined,
  BellOutlined,
  SecurityScanOutlined,
  DatabaseOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAndonConfigStore } from '@/store/andonConfigStore';
import { useSiteStore } from '@/store/siteStore';
import { useUserStore } from '@/store/userStore';
import type { AndonConfiguration, AndonSiteConfiguration } from '@/types/andon';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

// Configuration categories with metadata
const CONFIG_CATEGORIES = {
  GENERAL: {
    label: 'General Settings',
    icon: <SettingOutlined />,
    color: '#1890ff',
    description: 'Basic system configuration and behavior'
  },
  ESCALATION: {
    label: 'Escalation Rules',
    icon: <ExclamationCircleOutlined />,
    color: '#fa541c',
    description: 'Escalation timing and automation settings'
  },
  NOTIFICATION: {
    label: 'Notifications',
    icon: <BellOutlined />,
    color: '#52c41a',
    description: 'Communication preferences and templates'
  },
  UI: {
    label: 'User Interface',
    icon: <GlobalOutlined />,
    color: '#722ed1',
    description: 'User experience and interface settings'
  },
  INTEGRATION: {
    label: 'Integrations',
    icon: <DatabaseOutlined />,
    color: '#fa8c16',
    description: 'External system integration settings'
  }
};

const DATA_TYPES = [
  { value: 'STRING', label: 'Text', example: 'Hello World' },
  { value: 'NUMBER', label: 'Number', example: '42' },
  { value: 'BOOLEAN', label: 'Yes/No', example: 'true' },
  { value: 'JSON', label: 'JSON Object', example: '{"key": "value"}' },
  { value: 'ARRAY', label: 'Array', example: '["item1", "item2"]' }
];

const ACCESS_LEVELS = [
  { value: 'ADMIN', label: 'Admin Only', color: 'red' },
  { value: 'MANAGER', label: 'Manager+', color: 'orange' },
  { value: 'SUPERVISOR', label: 'Supervisor+', color: 'blue' }
];

interface AndonConfigurationManagerProps {
  defaultTab?: string;
}

export const AndonConfigurationManager: React.FC<AndonConfigurationManagerProps> = ({
  defaultTab = 'global'
}) => {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // Store hooks
  const {
    globalConfigurations,
    siteConfigurations,
    notificationTemplates,
    systemSettings,
    isLoading,
    error,
    loadGlobalConfigurations,
    loadSiteConfigurations,
    loadNotificationTemplates,
    loadSystemSettings,
    createGlobalConfiguration,
    updateGlobalConfiguration,
    deleteGlobalConfiguration,
    createSiteConfiguration,
    updateSiteConfiguration,
    deleteSiteConfiguration,
    validateConfigurations,
    exportConfiguration
  } = useAndonConfigStore();

  const { sites, loadSites } = useSiteStore();
  const { currentUser } = useUserStore();

  // Component state
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedSite, setSelectedSite] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>('GENERAL');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AndonConfiguration | AndonSiteConfiguration | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkConfigurations, setBulkConfigurations] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any>(null);

  // Load data on component mount
  useEffect(() => {
    loadGlobalConfigurations();
    loadNotificationTemplates();
    loadSystemSettings();
    loadSites();
  }, []);

  // Load site configurations when site is selected
  useEffect(() => {
    if (selectedSite) {
      loadSiteConfigurations(selectedSite);
    }
  }, [selectedSite]);

  // Filter configurations by category
  const getFilteredConfigurations = (configs: AndonConfiguration[], category?: string) => {
    return configs.filter(config => !category || config.category === category);
  };

  // Handle configuration creation
  const handleCreateConfiguration = async (values: any) => {
    try {
      if (activeTab === 'global') {
        await createGlobalConfiguration({
          ...values,
          lastModifiedBy: currentUser?.id
        });
        message.success('Global configuration created successfully');
      } else if (activeTab === 'site' && selectedSite) {
        await createSiteConfiguration({
          ...values,
          siteId: selectedSite,
          lastModifiedBy: currentUser?.id
        });
        message.success('Site configuration created successfully');
      }

      setIsCreateModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error creating configuration:', error);
      message.error('Failed to create configuration');
    }
  };

  // Handle configuration editing
  const handleEditConfiguration = (config: AndonConfiguration | AndonSiteConfiguration) => {
    setEditingConfig(config);
    editForm.setFieldsValue({
      configKey: config.configKey,
      configValue: typeof config.configValue === 'object'
        ? JSON.stringify(config.configValue, null, 2)
        : config.configValue,
      description: config.description,
      ...(('dataType' in config) && {
        dataType: config.dataType,
        category: config.category,
        isRequired: config.isRequired,
        accessLevel: config.accessLevel
      }),
      ...(('isOverride' in config) && {
        isOverride: config.isOverride,
        inheritFromGlobal: config.inheritFromGlobal
      })
    });
    setIsEditModalVisible(true);
  };

  // Handle configuration update
  const handleUpdateConfiguration = async (values: any) => {
    if (!editingConfig) return;

    try {
      let processedValue = values.configValue;

      // Parse JSON if needed
      if (('dataType' in editingConfig) &&
          (editingConfig.dataType === 'JSON' || editingConfig.dataType === 'ARRAY')) {
        try {
          processedValue = JSON.parse(values.configValue);
        } catch (error) {
          message.error('Invalid JSON format');
          return;
        }
      }

      const updateData = {
        ...values,
        configValue: processedValue,
        lastModifiedBy: currentUser?.id
      };

      if ('dataType' in editingConfig) {
        // Global configuration
        await updateGlobalConfiguration(editingConfig.id, updateData);
        message.success('Global configuration updated successfully');
      } else {
        // Site configuration
        await updateSiteConfiguration(editingConfig.id, updateData);
        message.success('Site configuration updated successfully');
      }

      setIsEditModalVisible(false);
      setEditingConfig(null);
      editForm.resetFields();
    } catch (error) {
      console.error('Error updating configuration:', error);
      message.error('Failed to update configuration');
    }
  };

  // Handle configuration deletion
  const handleDeleteConfiguration = async (config: AndonConfiguration | AndonSiteConfiguration) => {
    try {
      if ('dataType' in config) {
        // Global configuration
        await deleteGlobalConfiguration(config.configKey);
        message.success('Global configuration deleted successfully');
      } else {
        // Site configuration
        await deleteSiteConfiguration(config.siteId, config.configKey);
        message.success('Site configuration deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      message.error('Failed to delete configuration');
    }
  };

  // Handle bulk validation
  const handleValidateConfigurations = async () => {
    if (bulkConfigurations.length === 0) {
      message.warning('No configurations to validate');
      return;
    }

    try {
      const results = await validateConfigurations(bulkConfigurations, selectedSite);
      setValidationResults(results);

      if (results.isValid) {
        message.success('All configurations are valid');
      } else {
        message.warning(`${results.invalidConfigurations} configuration(s) have validation errors`);
      }
    } catch (error) {
      console.error('Error validating configurations:', error);
      message.error('Failed to validate configurations');
    }
  };

  // Handle configuration export
  const handleExportConfiguration = async () => {
    try {
      const exportData = await exportConfiguration({
        siteId: selectedSite,
        includeGlobal: true
      });

      // Create download link
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `andon-config-${selectedSite || 'global'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success('Configuration exported successfully');
    } catch (error) {
      console.error('Error exporting configuration:', error);
      message.error('Failed to export configuration');
    }
  };

  // Table columns for global configurations
  const globalConfigColumns: ColumnsType<AndonConfiguration> = [
    {
      title: 'Key',
      dataIndex: 'configKey',
      key: 'configKey',
      width: 200,
      render: (key: string) => <Text code>{key}</Text>
    },
    {
      title: 'Value',
      dataIndex: 'configValue',
      key: 'configValue',
      width: 250,
      render: (value: any) => (
        <Text ellipsis style={{ maxWidth: 200 }}>
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </Text>
      )
    },
    {
      title: 'Type',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 100,
      render: (type: string) => (
        <Tag color="blue">{type}</Tag>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const config = CONFIG_CATEGORIES[category as keyof typeof CONFIG_CATEGORIES];
        return config ? (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        ) : (
          <Tag>{category}</Tag>
        );
      }
    },
    {
      title: 'Access',
      dataIndex: 'accessLevel',
      key: 'accessLevel',
      width: 100,
      render: (level: string) => {
        const access = ACCESS_LEVELS.find(a => a.value === level);
        return access ? (
          <Tag color={access.color}>{access.label}</Tag>
        ) : (
          <Tag>{level}</Tag>
        );
      }
    },
    {
      title: 'Required',
      dataIndex: 'isRequired',
      key: 'isRequired',
      width: 80,
      render: (required: boolean) => (
        required ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : null
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditConfiguration(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete configuration?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteConfiguration(record)}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Table columns for site configurations
  const siteConfigColumns: ColumnsType<AndonSiteConfiguration> = [
    {
      title: 'Key',
      dataIndex: 'configKey',
      key: 'configKey',
      width: 200,
      render: (key: string) => <Text code>{key}</Text>
    },
    {
      title: 'Value',
      dataIndex: 'configValue',
      key: 'configValue',
      width: 250,
      render: (value: any) => (
        <Text ellipsis style={{ maxWidth: 200 }}>
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </Text>
      )
    },
    {
      title: 'Override',
      dataIndex: 'isOverride',
      key: 'isOverride',
      width: 100,
      render: (isOverride: boolean) => (
        <Tag color={isOverride ? 'orange' : 'green'}>
          {isOverride ? 'Override' : 'Inherit'}
        </Tag>
      )
    },
    {
      title: 'Modified By',
      dataIndex: ['lastModifiedByUser', 'username'],
      key: 'lastModifiedBy',
      width: 120
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditConfiguration(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete site configuration?"
            description="This will revert to global setting."
            onConfirm={() => handleDeleteConfiguration(record)}
          >
            <Tooltip title="Delete Override">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="andon-configuration-manager">
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={3}>
                <SettingOutlined /> Andon Configuration Management
              </Title>
              <Paragraph type="secondary">
                Manage global and site-specific Andon system settings
              </Paragraph>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    loadGlobalConfigurations();
                    if (selectedSite) loadSiteConfigurations(selectedSite);
                  }}
                />
                <Button
                  icon={<ExportOutlined />}
                  onClick={handleExportConfiguration}
                >
                  Export
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateModalVisible(true)}
                >
                  Add Configuration
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
        >
          <TabPane
            tab={
              <span>
                <GlobalOutlined />
                Global Settings
                <Badge
                  count={globalConfigurations.length}
                  style={{ marginLeft: 8 }}
                />
              </span>
            }
            key="global"
          >
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space>
                <Text strong>Category Filter:</Text>
                {Object.entries(CONFIG_CATEGORIES).map(([key, config]) => (
                  <Button
                    key={key}
                    type={selectedCategory === key ? 'primary' : 'default'}
                    size="small"
                    icon={config.icon}
                    onClick={() => setSelectedCategory(key)}
                  >
                    {config.label}
                  </Button>
                ))}
                <Button
                  size="small"
                  onClick={() => setSelectedCategory('')}
                  type={selectedCategory === '' ? 'primary' : 'default'}
                >
                  All
                </Button>
              </Space>
            </Card>

            <Table
              columns={globalConfigColumns}
              dataSource={getFilteredConfigurations(globalConfigurations, selectedCategory)}
              rowKey="id"
              loading={isLoading}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `Total ${total} configurations`
              }}
              size="small"
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <BankOutlined />
                Site Settings
                <Badge
                  count={siteConfigurations.length}
                  style={{ marginLeft: 8 }}
                />
              </span>
            }
            key="site"
          >
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Text strong>Site:</Text>
                  <Select
                    placeholder="Select a site"
                    value={selectedSite}
                    onChange={setSelectedSite}
                    style={{ width: '100%', marginLeft: 8 }}
                    allowClear
                  >
                    {sites.map(site => (
                      <Option key={site.id} value={site.id}>
                        {site.siteName}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col span={16}>
                  {selectedSite && (
                    <Alert
                      message="Site-specific configurations override global settings"
                      type="info"
                      showIcon
                      style={{ margin: 0 }}
                    />
                  )}
                </Col>
              </Row>
            </Card>

            {selectedSite ? (
              <Table
                columns={siteConfigColumns}
                dataSource={siteConfigurations}
                rowKey="id"
                loading={isLoading}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `Total ${total} site configurations`
                }}
                size="small"
                locale={{
                  emptyText: (
                    <Empty
                      description="No site-specific configurations"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )
                }}
              />
            ) : (
              <Empty
                description="Please select a site to view configurations"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* Create Configuration Modal */}
      <Modal
        title="Add Configuration"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Create"
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateConfiguration}
        >
          <Form.Item
            name="configKey"
            label="Configuration Key"
            rules={[{ required: true, message: 'Please enter configuration key' }]}
            help="Unique identifier for the configuration (e.g., andon.escalation.timeout)"
          >
            <Input placeholder="andon.system.enabled" />
          </Form.Item>

          {activeTab === 'global' && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="dataType"
                    label="Data Type"
                    rules={[{ required: true, message: 'Please select data type' }]}
                  >
                    <Select placeholder="Select data type">
                      {DATA_TYPES.map(type => (
                        <Option key={type.value} value={type.value}>
                          {type.label} - {type.example}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="category"
                    label="Category"
                    rules={[{ required: true, message: 'Please select category' }]}
                  >
                    <Select placeholder="Select category">
                      {Object.entries(CONFIG_CATEGORIES).map(([key, config]) => (
                        <Option key={key} value={key}>
                          {config.icon} {config.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="accessLevel"
                    label="Access Level"
                    initialValue="ADMIN"
                  >
                    <Select>
                      {ACCESS_LEVELS.map(level => (
                        <Option key={level.value} value={level.value}>
                          {level.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="isRequired"
                    label="Required"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {activeTab === 'site' && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="isOverride"
                  label="Override Global"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="inheritFromGlobal"
                  label="Inherit When Not Set"
                  valuePropName="checked"
                  initialValue={false}
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item
            name="configValue"
            label="Configuration Value"
            rules={[{ required: true, message: 'Please enter configuration value' }]}
          >
            <TextArea
              placeholder="Enter configuration value"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            help="Brief description of what this configuration controls"
          >
            <TextArea
              placeholder="Describe the purpose and impact of this configuration"
              rows={2}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Configuration Modal */}
      <Modal
        title="Edit Configuration"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingConfig(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        okText="Update"
        width={600}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateConfiguration}
        >
          <Form.Item
            name="configKey"
            label="Configuration Key"
          >
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="configValue"
            label="Configuration Value"
            rules={[{ required: true, message: 'Please enter configuration value' }]}
          >
            <TextArea
              placeholder="Enter configuration value"
              rows={4}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea
              placeholder="Describe the purpose and impact of this configuration"
              rows={2}
            />
          </Form.Item>

          {editingConfig && 'dataType' in editingConfig && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="dataType"
                    label="Data Type"
                  >
                    <Select disabled>
                      {DATA_TYPES.map(type => (
                        <Option key={type.value} value={type.value}>
                          {type.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="category"
                    label="Category"
                  >
                    <Select>
                      {Object.entries(CONFIG_CATEGORIES).map(([key, config]) => (
                        <Option key={key} value={key}>
                          {config.icon} {config.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="accessLevel"
                    label="Access Level"
                  >
                    <Select>
                      {ACCESS_LEVELS.map(level => (
                        <Option key={level.value} value={level.value}>
                          {level.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="isRequired"
                    label="Required"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {editingConfig && 'isOverride' in editingConfig && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="isOverride"
                  label="Override Global"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="inheritFromGlobal"
                  label="Inherit When Not Set"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Form>
      </Modal>

      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};

export default AndonConfigurationManager;