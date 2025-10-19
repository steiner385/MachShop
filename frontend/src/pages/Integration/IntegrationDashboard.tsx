/**
 * Integration Dashboard Page
 *
 * Displays status and health of all ERP/PLM integrations.
 * Shows KPIs, recent sync activities, health status, and quick actions.
 */

import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Alert,
  message,
  Spin,
  Progress,
  Typography,
  Tooltip,
} from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  CloudServerOutlined,
  SettingOutlined,
  HistoryOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

interface IntegrationHealth {
  configId: string;
  name: string;
  type: 'ERP' | 'PLM' | 'CMMS';
  enabled: boolean;
  connected: boolean;
  lastSync?: string;
  lastSyncStatus?: string;
  responseTime?: number;
  errorCount: number;
  lastError?: string;
  statistics: {
    totalSyncs: number;
    successCount: number;
    failureCount: number;
    successRate: number;
  };
}

interface IntegrationLog {
  id: string;
  configId: string;
  operation: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'SUCCESS' | 'PARTIAL' | 'FAILURE';
  recordCount: number;
  successCount: number;
  errorCount: number;
  duration: number;
  createdAt: string;
}

const IntegrationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<IntegrationHealth[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    document.title = 'Integration Dashboard - MES';
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/integrations/health/all');
      setHealthData(response.data);
    } catch (error: any) {
      console.error('Error fetching integration health:', error);
      message.error('Failed to load integration health data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHealthData();
    setRefreshing(false);
    message.success('Integration health refreshed');
  };

  const handleManualSync = async (configId: string, jobType: string) => {
    try {
      await axios.post(`/api/v1/integrations/${configId}/sync`, {
        jobType,
      });
      message.success(`${jobType.replace('_', ' ')} synchronization started`);

      // Refresh after 2 seconds
      setTimeout(fetchHealthData, 2000);
    } catch (error: any) {
      console.error('Error triggering sync:', error);
      message.error('Failed to start synchronization');
    }
  };

  const getStatusIcon = (health: IntegrationHealth) => {
    if (!health.enabled) {
      return <CloseCircleOutlined style={{ color: '#999' }} />;
    }
    if (!health.connected) {
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
    if (health.errorCount > 0) {
      return <WarningOutlined style={{ color: '#faad14' }} />;
    }
    return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
  };

  const getStatusColor = (health: IntegrationHealth) => {
    if (!health.enabled) return 'default';
    if (!health.connected) return 'error';
    if (health.errorCount > 0) return 'warning';
    return 'success';
  };

  const getStatusText = (health: IntegrationHealth) => {
    if (!health.enabled) return 'Disabled';
    if (!health.connected) return 'Disconnected';
    if (health.errorCount > 0) return 'Warning';
    return 'Healthy';
  };

  // Calculate KPIs
  const totalIntegrations = healthData.length;
  const activeIntegrations = healthData.filter(h => h.enabled).length;
  const connectedIntegrations = healthData.filter(h => h.connected && h.enabled).length;
  const totalSyncs = healthData.reduce((sum, h) => sum + h.statistics.totalSyncs, 0);
  const avgSuccessRate = healthData.length > 0
    ? healthData.reduce((sum, h) => sum + h.statistics.successRate, 0) / healthData.length
    : 0;

  const columns = [
    {
      title: 'Integration',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: IntegrationHealth) => (
        <Space>
          {getStatusIcon(record)}
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.type}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_: any, record: IntegrationHealth) => (
        <Tag color={getStatusColor(record)}>
          {getStatusText(record)}
        </Tag>
      ),
    },
    {
      title: 'Last Sync',
      dataIndex: 'lastSync',
      key: 'lastSync',
      render: (lastSync?: string, record?: IntegrationHealth) => (
        <div>
          {lastSync ? (
            <>
              <div>{new Date(lastSync).toLocaleString()}</div>
              {record?.lastSyncStatus && (
                <Tag
                  color={record.lastSyncStatus === 'SUCCESS' ? 'success' :
                         record.lastSyncStatus === 'PARTIAL' ? 'warning' : 'error'}
                  style={{ marginTop: 4 }}
                >
                  {record.lastSyncStatus}
                </Tag>
              )}
            </>
          ) : (
            <Text type="secondary">Never</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Success Rate',
      dataIndex: 'statistics',
      key: 'successRate',
      render: (stats: IntegrationHealth['statistics']) => (
        <div>
          <Progress
            percent={stats.successRate}
            size="small"
            strokeColor={stats.successRate >= 95 ? '#52c41a' : stats.successRate >= 80 ? '#faad14' : '#ff4d4f'}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {stats.successCount}/{stats.totalSyncs} syncs
          </Text>
        </div>
      ),
    },
    {
      title: 'Response Time',
      dataIndex: 'responseTime',
      key: 'responseTime',
      render: (time?: number) => (
        time !== undefined ? (
          <Text>{time}ms</Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: IntegrationHealth) => (
        <Space>
          {record.enabled && (
            <>
              <Tooltip title="Sync Items">
                <Button
                  size="small"
                  icon={<SyncOutlined />}
                  onClick={() => handleManualSync(record.configId, 'sync_items')}
                >
                  Items
                </Button>
              </Tooltip>
              <Tooltip title="Sync BOMs">
                <Button
                  size="small"
                  icon={<SyncOutlined />}
                  onClick={() => handleManualSync(record.configId, 'sync_boms')}
                >
                  BOMs
                </Button>
              </Tooltip>
            </>
          )}
          <Tooltip title="View Logs">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => navigate(`/integrations/logs?config=${record.configId}`)}
            />
          </Tooltip>
          <Tooltip title="Settings">
            <Button
              size="small"
              icon={<SettingOutlined />}
              onClick={() => navigate(`/integrations/config/${record.configId}`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="Loading integrations..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Integration Dashboard
        </Title>
        <Space>
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<SettingOutlined />}
            onClick={() => navigate('/integrations/config')}
          >
            Manage Integrations
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Integrations"
              value={totalIntegrations}
              prefix={<CloudServerOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Integrations"
              value={activeIntegrations}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Connected"
              value={connectedIntegrations}
              suffix={`/ ${activeIntegrations}`}
              prefix={<SyncOutlined />}
              valueStyle={{
                color: connectedIntegrations === activeIntegrations ? '#52c41a' : '#faad14',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Success Rate"
              value={avgSuccessRate}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{
                color: avgSuccessRate >= 95 ? '#52c41a' : avgSuccessRate >= 80 ? '#faad14' : '#ff4d4f',
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {healthData.some(h => !h.connected && h.enabled) && (
        <Alert
          message="Connection Issues Detected"
          description={
            <div>
              The following integrations are disconnected:
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                {healthData
                  .filter(h => !h.connected && h.enabled)
                  .map(h => (
                    <li key={h.configId}>
                      <strong>{h.name}</strong>: {h.lastError || 'Connection failed'}
                    </li>
                  ))}
              </ul>
            </div>
          }
          type="error"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}

      {healthData.some(h => h.errorCount > 0 && h.connected) && (
        <Alert
          message="Recent Sync Errors"
          description={
            <div>
              Some integrations have experienced errors:
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                {healthData
                  .filter(h => h.errorCount > 0 && h.connected)
                  .map(h => (
                    <li key={h.configId}>
                      <strong>{h.name}</strong>: {h.errorCount} error(s) - {h.lastError}
                    </li>
                  ))}
              </ul>
            </div>
          }
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24 }}
          closable
        />
      )}

      {/* Integration Status Table */}
      <Card title="Integration Status">
        <Table
          dataSource={healthData.map(h => ({ ...h, key: h.configId }))}
          columns={columns}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default IntegrationDashboard;
