/**
 * Plugin Event Bus Dashboard (Issue #75 Phase 5)
 *
 * Real-time monitoring dashboard for plugin event bus, webhook queue,
 * and delivery metrics with automatic refresh.
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Empty,
  Divider,
  Table,
  Button,
  Space,
  Tag,
  Alert,
  Tabs,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { usePluginStore } from '../../store/pluginStore';

const PluginEventBusDashboard: React.FC = () => {
  const {
    plugins,
    webhooks,
    eventBusStats,
    webhookQueueStats,
    isLoadingStats,
    loadPlugins,
    loadEventBusStats,
  } = usePluginStore();

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  useEffect(() => {
    loadPlugins();
    loadEventBusStats();
  }, [loadPlugins, loadEventBusStats]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadEventBusStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadEventBusStats]);

  const handleRefresh = () => {
    loadEventBusStats();
  };

  const getTotalWebhooks = () => webhooks.length;
  const getActiveWebhooks = () => webhooks.filter((w) => w.isActive).length;
  const getTotalSuccesses = () =>
    webhooks.reduce((sum, w) => sum + w.successCount, 0);
  const getTotalFailures = () =>
    webhooks.reduce((sum, w) => sum + w.failureCount, 0);

  const getSuccessRate = () => {
    const total = getTotalSuccesses() + getTotalFailures();
    if (total === 0) return 0;
    return ((getTotalSuccesses() / total) * 100).toFixed(2);
  };

  const webhookMetricsColumns = [
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
      width: '30%',
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
      title: 'Successes',
      dataIndex: 'successCount',
      key: 'successCount',
      width: 100,
      render: (count: number) => (
        <span style={{ color: '#52c41a' }}>
          <CheckCircleOutlined /> {count}
        </span>
      ),
    },
    {
      title: 'Failures',
      dataIndex: 'failureCount',
      key: 'failureCount',
      width: 100,
      render: (count: number) => (
        <span style={{ color: count > 0 ? '#f5222d' : '#999' }}>
          <CloseCircleOutlined /> {count}
        </span>
      ),
    },
    {
      title: 'Last Triggered',
      dataIndex: 'lastTriggeredAt',
      key: 'lastTriggeredAt',
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString() : 'Never',
    },
  ];

  const queueStatsColumns = [
    {
      title: 'Plugin ID',
      dataIndex: 'pluginId',
      key: 'pluginId',
    },
    {
      title: 'Queued Items',
      dataIndex: 'queueLength',
      key: 'queueLength',
      render: (length: number) => (
        <span>
          <ClockCircleOutlined /> {length}
        </span>
      ),
    },
  ];

  const queueData = webhookQueueStats
    ? Object.entries(webhookQueueStats.pluginQueues).map(([pluginId, length]) => ({
        pluginId,
        queueLength: length,
      }))
    : [];

  const eventBusData = eventBusStats
    ? Object.entries(eventBusStats.channels).map(([channel, count]) => ({
        channel,
        subscriptions: count,
      }))
    : [];

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
              <h1>Event Bus & Webhook Monitoring</h1>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={isLoadingStats}
                >
                  Refresh
                </Button>
                <Button
                  type={autoRefresh ? 'primary' : 'default'}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  Auto Refresh: {autoRefresh ? 'On' : 'Off'}
                </Button>
              </Space>
            </div>
          </Col>
        </Row>

        <Divider />

        {/* Key Metrics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Total Webhooks"
              value={getTotalWebhooks()}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Active Webhooks"
              value={getActiveWebhooks()}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Success Rate"
              value={getSuccessRate()}
              suffix="%"
              valueStyle={{
                color:
                  parseFloat(getSuccessRate()) > 90
                    ? '#52c41a'
                    : parseFloat(getSuccessRate()) > 70
                      ? '#faad14'
                      : '#f5222d',
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Queue Size"
              value={webhookQueueStats?.totalQueued || 0}
              valueStyle={{
                color: (webhookQueueStats?.totalQueued || 0) > 0 ? '#faad14' : '#999',
              }}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Total Successes"
              value={getTotalSuccesses()}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Total Failures"
              value={getTotalFailures()}
              valueStyle={{
                color: getTotalFailures() > 0 ? '#f5222d' : '#999',
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Event Channels"
              value={eventBusStats?.channelsWithHandlers || 0}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Total Subscriptions"
              value={eventBusStats?.totalSubscriptions || 0}
            />
          </Col>
        </Row>

        <Divider />

        {/* Alerts */}
        {getTotalFailures() > 0 && (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Alert
                message="Warning"
                description={`${getTotalFailures()} webhook deliveries have failed. Consider checking and retrying failed webhooks.`}
                type="warning"
                showIcon
              />
            </Col>
          </Row>
        )}

        {(webhookQueueStats?.totalQueued || 0) > 100 && (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Alert
                message="Warning"
                description={`Webhook queue has ${webhookQueueStats?.totalQueued} pending items. Processing may be slow.`}
                type="warning"
                showIcon
              />
            </Col>
          </Row>
        )}

        <Divider />

        {/* Detailed Tabs */}
        <Tabs
          items={[
            {
              key: 'webhooks',
              label: `Webhook Metrics (${getTotalWebhooks()})`,
              children: (
                <Spin spinning={isLoadingStats}>
                  {webhooks.length === 0 ? (
                    <Empty description="No webhooks registered" />
                  ) : (
                    <Table
                      columns={webhookMetricsColumns}
                      dataSource={webhooks}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 1000 }}
                    />
                  )}
                </Spin>
              ),
            },
            {
              key: 'queue',
              label: `Queue Status`,
              children: (
                <Spin spinning={isLoadingStats}>
                  {queueData.length === 0 ? (
                    <Empty description="No queued items" />
                  ) : (
                    <Table
                      columns={queueStatsColumns}
                      dataSource={queueData}
                      rowKey="pluginId"
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </Spin>
              ),
            },
            {
              key: 'channels',
              label: `Event Channels (${eventBusStats?.channelsWithHandlers || 0})`,
              children: (
                <Spin spinning={isLoadingStats}>
                  {eventBusData.length === 0 ? (
                    <Empty description="No active event channels" />
                  ) : (
                    <Table
                      columns={[
                        {
                          title: 'Channel',
                          dataIndex: 'channel',
                          key: 'channel',
                        },
                        {
                          title: 'Subscriptions',
                          dataIndex: 'subscriptions',
                          key: 'subscriptions',
                        },
                      ]}
                      dataSource={eventBusData}
                      rowKey="channel"
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </Spin>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default PluginEventBusDashboard;
