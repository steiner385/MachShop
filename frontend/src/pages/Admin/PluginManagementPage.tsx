/**
 * Plugin Management Page (Issue #75 Phase 5)
 *
 * Admin interface for managing plugins, including listing, filtering,
 * lifecycle management (install, approve, activate, deactivate, uninstall),
 * and webhook configuration.
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Popconfirm,
  Spin,
  Empty,
  Row,
  Col,
  Alert,
  Divider,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  PlayCircleOutlined,
  StopOutlined,
  EditOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { usePluginStore } from '../../store/pluginStore';

const PluginManagementPage: React.FC = () => {
  const {
    plugins,
    isLoadingPlugins,
    pluginError,
    loadPlugins,
    installPlugin,
    approvePlugin,
    activatePlugin,
    deactivatePlugin,
    uninstallPlugin,
    clearError,
  } = usePluginStore();

  const [isInstallModalVisible, setIsInstallModalVisible] = useState(false);
  const [installForm] = Form.useForm();
  const [isInstallingPlugin, setIsInstallingPlugin] = useState(false);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  const handleInstallPlugin = async (values: any) => {
    try {
      setIsInstallingPlugin(true);
      const manifestStr = values.manifest;
      const manifest = JSON.parse(manifestStr);

      await installPlugin(manifest, values.packageUrl);
      setIsInstallModalVisible(false);
      installForm.resetFields();
    } catch (error) {
      console.error('Failed to install plugin:', error);
    } finally {
      setIsInstallingPlugin(false);
    }
  };

  const handleApprovePlugin = async (pluginId: string) => {
    try {
      await approvePlugin(pluginId);
    } catch (error) {
      console.error('Failed to approve plugin:', error);
    }
  };

  const handleActivatePlugin = async (pluginId: string) => {
    try {
      await activatePlugin(pluginId);
    } catch (error) {
      console.error('Failed to activate plugin:', error);
    }
  };

  const handleDeactivatePlugin = async (pluginId: string) => {
    try {
      await deactivatePlugin(pluginId);
    } catch (error) {
      console.error('Failed to deactivate plugin:', error);
    }
  };

  const handleUninstallPlugin = async (pluginId: string) => {
    try {
      await uninstallPlugin(pluginId);
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING_APPROVAL: 'orange',
      INSTALLED: 'default',
      ACTIVE: 'green',
      DISABLED: 'red',
      FAILED: 'red',
      UNINSTALLED: 'default',
    };
    return colors[status] || 'default';
  };

  const getActionButtons = (record: any) => {
    const buttons: React.ReactNode[] = [];

    if (record.status === 'PENDING_APPROVAL') {
      buttons.push(
        <Popconfirm
          key="approve"
          title="Approve Plugin"
          description={`Approve plugin ${record.name}?`}
          onConfirm={() => handleApprovePlugin(record.pluginId)}
        >
          <Button type="primary" size="small" icon={<CheckOutlined />}>
            Approve
          </Button>
        </Popconfirm>
      );
    }

    if (record.status === 'INSTALLED' && !record.isActive) {
      buttons.push(
        <Popconfirm
          key="activate"
          title="Activate Plugin"
          description={`Activate plugin ${record.name}?`}
          onConfirm={() => handleActivatePlugin(record.pluginId)}
        >
          <Button type="primary" size="small" icon={<PlayCircleOutlined />}>
            Activate
          </Button>
        </Popconfirm>
      );
    }

    if (record.isActive) {
      buttons.push(
        <Popconfirm
          key="deactivate"
          title="Deactivate Plugin"
          description={`Deactivate plugin ${record.name}?`}
          onConfirm={() => handleDeactivatePlugin(record.pluginId)}
        >
          <Button size="small" icon={<StopOutlined />}>
            Deactivate
          </Button>
        </Popconfirm>
      );
    }

    if (record.status !== 'PENDING_APPROVAL' && !record.isActive) {
      buttons.push(
        <Popconfirm
          key="uninstall"
          title="Uninstall Plugin"
          description={`Uninstall plugin ${record.name}? This action cannot be undone.`}
          onConfirm={() => handleUninstallPlugin(record.pluginId)}
        >
          <Button danger size="small" icon={<DeleteOutlined />}>
            Uninstall
          </Button>
        </Popconfirm>
      );
    }

    return buttons;
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
      render: (text: string, record: any) => (
        <div>
          <strong>{text}</strong>
          <br />
          <small>{record.pluginId}</small>
        </div>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: '10%',
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
      width: '15%',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '15%',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: '10%',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? 'Running' : 'Stopped'}
        </Tag>
      ),
    },
    {
      title: 'Installed',
      dataIndex: 'installedAt',
      key: 'installedAt',
      width: '15%',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      render: (_: any, record: any) => (
        <Space wrap size="small">
          {getActionButtons(record)}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h1>Plugin Management</h1>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsInstallModalVisible(true)}
              >
                Install Plugin
              </Button>
            </div>
          </Col>
        </Row>

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

        <Divider />

        <Spin spinning={isLoadingPlugins}>
          {plugins.length === 0 ? (
            <Empty description="No plugins installed" />
          ) : (
            <Table
              columns={columns}
              dataSource={plugins}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1200 }}
            />
          )}
        </Spin>
      </Card>

      {/* Install Plugin Modal */}
      <Modal
        title="Install Plugin"
        open={isInstallModalVisible}
        onCancel={() => setIsInstallModalVisible(false)}
        footer={null}
      >
        <Form form={installForm} layout="vertical" onFinish={handleInstallPlugin}>
          <Form.Item
            label="Manifest (JSON)"
            name="manifest"
            rules={[
              { required: true, message: 'Please enter plugin manifest' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  try {
                    JSON.parse(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('Invalid JSON format'));
                  }
                },
              },
            ]}
          >
            <Input.TextArea
              rows={8}
              placeholder={JSON.stringify(
                {
                  id: 'my-plugin',
                  name: 'My Plugin',
                  version: '1.0.0',
                  description: 'Plugin description',
                  author: 'Author Name',
                  apiVersion: '1.0.0',
                },
                null,
                2
              )}
            />
          </Form.Item>

          <Form.Item
            label="Package URL"
            name="packageUrl"
            rules={[
              { required: true, message: 'Please enter package URL' },
              { type: 'url', message: 'Please enter a valid URL' },
            ]}
          >
            <Input placeholder="https://example.com/plugin-package.tar.gz" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isInstallingPlugin} block>
              Install
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PluginManagementPage;
