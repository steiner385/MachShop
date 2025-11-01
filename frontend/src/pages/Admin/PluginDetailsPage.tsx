/**
 * Plugin Details Page (Issue #75 Phase 5)
 *
 * Detailed view of a single plugin with configuration management,
 * webhook management, and execution history monitoring.
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Form,
  Button,
  Input,
  Spin,
  Table,
  Tag,
  Modal,
  Space,
  Popconfirm,
  Alert,
  Empty,
  Row,
  Col,
  Divider,
  Descriptions,
  Statistic,
} from 'antd';
import {
  SaveOutlined,
  DeleteOutlined,
  SendOutlined,
  ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { usePluginStore } from '../../store/pluginStore';
import { useNavigate, useParams } from 'react-router-dom';

const PluginDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { pluginId } = useParams<{ pluginId: string }>();

  const {
    selectedPlugin,
    webhooks,
    executions,
    isLoadingPlugins,
    isLoadingWebhooks,
    isLoadingExecutions,
    pluginError,
    getPlugin,
    updatePluginConfiguration,
    loadWebhooks,
    loadExecutions,
    registerWebhook,
    unregisterWebhook,
    testWebhook,
    retryWebhook,
    clearError,
  } = usePluginStore();

  const [configForm] = Form.useForm();
  const [webhookForm] = Form.useForm();
  const [isWebhookModalVisible, setIsWebhookModalVisible] = useState(false);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);

  useEffect(() => {
    if (pluginId) {
      getPlugin(pluginId);
    }
  }, [pluginId, getPlugin]);

  useEffect(() => {
    if (selectedPlugin) {
      configForm.setFieldsValue(selectedPlugin.configuration || {});
      loadWebhooks(selectedPlugin.pluginId);
      loadExecutions(selectedPlugin.pluginId);
    }
  }, [selectedPlugin, configForm, loadWebhooks, loadExecutions]);

  const handleUpdateConfiguration = async (values: any) => {
    try {
      setIsUpdatingConfig(true);
      if (selectedPlugin) {
        await updatePluginConfiguration(selectedPlugin.pluginId, values);
      }
    } catch (error) {
      console.error('Failed to update configuration:', error);
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  const handleRegisterWebhook = async (values: any) => {
    try {
      setIsRegisteringWebhook(true);
      if (selectedPlugin) {
        await registerWebhook(
          selectedPlugin.pluginId,
          values.eventType,
          values.webhookUrl,
          values.secret
        );
        setIsWebhookModalVisible(false);
        webhookForm.resetFields();
      }
    } catch (error) {
      console.error('Failed to register webhook:', error);
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      if (selectedPlugin) {
        await testWebhook(selectedPlugin.pluginId, webhookId);
      }
    } catch (error) {
      console.error('Failed to test webhook:', error);
    }
  };

  const handleRetryWebhook = async (webhookId: string) => {
    try {
      if (selectedPlugin) {
        await retryWebhook(selectedPlugin.pluginId, webhookId);
      }
    } catch (error) {
      console.error('Failed to retry webhook:', error);
    }
  };

  const handleUnregisterWebhook = async (webhookId: string) => {
    try {
      if (selectedPlugin) {
        await unregisterWebhook(selectedPlugin.pluginId, webhookId);
      }
    } catch (error) {
      console.error('Failed to unregister webhook:', error);
    }
  };

  if (!pluginId) {
    return <Empty description="No plugin selected" />;
  }

  if (isLoadingPlugins) {
    return <Spin />;
  }

  if (!selectedPlugin) {
    return <Empty description="Plugin not found" />;
  }

  const webhookColumns = [
    {
      title: 'Event Type',
      dataIndex: 'eventType',
      key: 'eventType',
    },
    {
      title: 'URL',
      dataIndex: 'webhookUrl',
      key: 'webhookUrl',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Success',
      dataIndex: 'successCount',
      key: 'successCount',
      width: 80,
    },
    {
      title: 'Failed',
      dataIndex: 'failureCount',
      key: 'failureCount',
      width: 80,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: any) => (
        <Space size="small" wrap>
          <Button
            size="small"
            type="primary"
            icon={<SendOutlined />}
            onClick={() => handleTestWebhook(record.id)}
          >
            Test
          </Button>
          {record.failureCount > 0 && (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRetryWebhook(record.id)}
            >
              Retry
            </Button>
          )}
          <Popconfirm
            title="Delete Webhook"
            description="Are you sure?"
            onConfirm={() => handleUnregisterWebhook(record.id)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const executionColumns = [
    {
      title: 'Hook Point',
      dataIndex: 'hookPoint',
      key: 'hookPoint',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          COMPLETED: 'green',
          FAILED: 'red',
          TIMEOUT: 'orange',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Duration (ms)',
      dataIndex: 'duration',
      key: 'duration',
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  const successRate = webhooks.length > 0
    ? (
        (webhooks.reduce((sum, w) => sum + w.successCount, 0) /
          (webhooks.reduce((sum, w) => sum + w.successCount + w.failureCount, 0) || 1)) *
        100
      ).toFixed(2)
    : '0';

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col span={24}>
            <Button type="text" onClick={() => navigate('/admin/plugins')}>
              ← Back to Plugins
            </Button>
          </Col>
        </Row>

        <Divider />

        {pluginError && (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Alert
                message="Error"
                description={pluginError}
                type="error"
                closable
                onClose={clearError}
              />
            </Col>
          </Row>
        )}

        {/* Plugin Info */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <h2>{selectedPlugin.name}</h2>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Version"
              value={selectedPlugin.version}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Status"
              value={selectedPlugin.status}
              valueStyle={{
                color: selectedPlugin.isActive ? '#52c41a' : '#999',
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Webhooks"
              value={webhooks.length}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Success Rate"
              value={successRate}
              suffix="%"
            />
          </Col>
        </Row>

        <Divider />

        {/* Details */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Plugin ID">
                {selectedPlugin.pluginId}
              </Descriptions.Item>
              <Descriptions.Item label="Author">
                {selectedPlugin.author || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Installed By">
                {selectedPlugin.installedBy}
              </Descriptions.Item>
              <Descriptions.Item label="Installed At">
                {new Date(selectedPlugin.installedAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>

        <Divider />

        {/* Tabs */}
        <Tabs
          items={[
            {
              key: 'configuration',
              label: 'Configuration',
              children: (
                <Form
                  form={configForm}
                  layout="vertical"
                  onFinish={handleUpdateConfiguration}
                >
                  {Object.entries(selectedPlugin.configuration || {}).map(
                    ([key, value]) => (
                      <Form.Item
                        key={key}
                        label={key}
                        name={key}
                        initialValue={value}
                      >
                        <Input.TextArea rows={3} />
                      </Form.Item>
                    )
                  )}
                  {Object.keys(selectedPlugin.configuration || {}).length === 0 && (
                    <Empty description="No configuration items" />
                  )}
                  {Object.keys(selectedPlugin.configuration || {}).length > 0 && (
                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SaveOutlined />}
                        loading={isUpdatingConfig}
                      >
                        Save Configuration
                      </Button>
                    </Form.Item>
                  )}
                </Form>
              ),
            },
            {
              key: 'webhooks',
              label: 'Webhooks',
              children: (
                <div>
                  <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setIsWebhookModalVisible(true)}
                      >
                        Register Webhook
                      </Button>
                    </Col>
                  </Row>
                  <Spin spinning={isLoadingWebhooks}>
                    {webhooks.length === 0 ? (
                      <Empty description="No webhooks registered" />
                    ) : (
                      <Table
                        columns={webhookColumns}
                        dataSource={webhooks}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                      />
                    )}
                  </Spin>
                </div>
              ),
            },
            {
              key: 'executions',
              label: 'Executions',
              children: (
                <Spin spinning={isLoadingExecutions}>
                  {executions.length === 0 ? (
                    <Empty description="No executions recorded" />
                  ) : (
                    <Table
                      columns={executionColumns}
                      dataSource={executions}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </Spin>
              ),
            },
          ]}
        />
      </Card>

      {/* Register Webhook Modal */}
      <Modal
        title="Register Webhook"
        open={isWebhookModalVisible}
        onCancel={() => setIsWebhookModalVisible(false)}
        footer={null}
      >
        <Form
          form={webhookForm}
          layout="vertical"
          onFinish={handleRegisterWebhook}
        >
          <Form.Item
            label="Event Type"
            name="eventType"
            rules={[{ required: true, message: 'Please enter event type' }]}
          >
            <Input placeholder="e.g., plugin.installed, plugin.activated" />
          </Form.Item>

          <Form.Item
            label="Webhook URL"
            name="webhookUrl"
            rules={[
              { required: true, message: 'Please enter webhook URL' },
              { type: 'url', message: 'Please enter a valid URL' },
            ]}
          >
            <Input placeholder="https://example.com/webhook" />
          </Form.Item>

          <Form.Item
            label="Secret"
            name="secret"
            rules={[{ required: true, message: 'Please enter webhook secret' }]}
          >
            <Input.Password placeholder="Webhook signing secret" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isRegisteringWebhook}
              block
            >
              Register
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PluginDetailsPage;
