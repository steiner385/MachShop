/**
 * Integration Logs Viewer Page
 *
 * Displays integration activity logs with filtering, pagination, and detail viewing.
 * Allows users to troubleshoot integration issues and monitor sync operations.
 */

import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Select,
  DatePicker,
  Drawer,
  Descriptions,
  Alert,
  Input,
  message,
  Tooltip,
  Badge,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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
  requestData?: any;
  responseData?: any;
  errors?: any;
  createdAt: string;
}

interface Integration {
  id: string;
  name: string;
  displayName: string;
}

interface LogFilters {
  configId?: string;
  operation?: string;
  status?: string;
  dateRange?: [Dayjs, Dayjs];
}

const IntegrationLogs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filters, setFilters] = useState<LogFilters>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  useEffect(() => {
    document.title = 'Integration Logs - MES';
    fetchIntegrations();

    // Parse query params
    const params = new URLSearchParams(location.search);
    const configId = params.get('config');
    if (configId) {
      setFilters(prev => ({ ...prev, configId }));
    }
  }, [location]);

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.current, pagination.pageSize]);

  const fetchIntegrations = async () => {
    try {
      const response = await axios.get('/api/v1/integrations');
      setIntegrations(response.data);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const params: any = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (filters.configId) {
        const response = await axios.get(`/api/v1/integrations/${filters.configId}/logs`, {
          params: {
            ...params,
            operation: filters.operation,
            status: filters.status,
          },
        });

        setLogs(response.data.logs);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
        }));
      } else {
        // If no config selected, show empty
        setLogs([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      message.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof LogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
  };

  const handleRefresh = () => {
    fetchLogs();
    message.success('Logs refreshed');
  };

  const handleViewDetails = (log: IntegrationLog) => {
    setSelectedLog(log);
    setDrawerVisible(true);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      message.warning('No logs to export');
      return;
    }

    const headers = ['Date', 'Integration', 'Operation', 'Direction', 'Status', 'Records', 'Success', 'Errors', 'Duration (ms)'];
    const rows = logs.map(log => {
      const integration = integrations.find(i => i.id === log.configId);
      return [
        new Date(log.createdAt).toLocaleString(),
        integration?.displayName || log.configId,
        log.operation,
        log.direction,
        log.status,
        log.recordCount,
        log.successCount,
        log.errorCount,
        log.duration,
      ];
    });

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integration-logs-${new Date().toISOString()}.csv`;
    a.click();

    message.success('Logs exported to CSV');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'PARTIAL':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'FAILURE':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'PARTIAL':
        return 'warning';
      case 'FAILURE':
        return 'error';
      default:
        return 'default';
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'INBOUND' ? (
      <Tooltip title="Inbound (External → MES)">
        <ArrowDownOutlined style={{ color: '#1890ff' }} />
      </Tooltip>
    ) : (
      <Tooltip title="Outbound (MES → External)">
        <ArrowUpOutlined style={{ color: '#722ed1' }} />
      </Tooltip>
    );
  };

  const columns: ColumnsType<IntegrationLog> = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => (
        <div>
          <div>{new Date(date).toLocaleDateString()}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(date).toLocaleTimeString()}
          </Text>
        </div>
      ),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Operation',
      dataIndex: 'operation',
      key: 'operation',
      render: (operation: string, record: IntegrationLog) => (
        <Space>
          {getDirectionIcon(record.direction)}
          <span>{operation.replace(/_/g, ' ').toUpperCase()}</span>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status}
        </Tag>
      ),
      filters: [
        { text: 'Success', value: 'SUCCESS' },
        { text: 'Partial', value: 'PARTIAL' },
        { text: 'Failure', value: 'FAILURE' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Records',
      key: 'records',
      width: 180,
      render: (_: any, record: IntegrationLog) => (
        <div>
          <Space size={4}>
            <Badge status="processing" />
            <Text>{record.recordCount} total</Text>
          </Space>
          <div style={{ marginTop: 4 }}>
            <Space size={16}>
              <Space size={4}>
                <Badge status="success" />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {record.successCount} OK
                </Text>
              </Space>
              {record.errorCount > 0 && (
                <Space size={4}>
                  <Badge status="error" />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {record.errorCount} errors
                  </Text>
                </Space>
              )}
            </Space>
          </div>
        </div>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => (
        <Space>
          <ClockCircleOutlined />
          <span>{duration}ms</span>
        </Space>
      ),
      sorter: (a, b) => a.duration - b.duration,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: IntegrationLog) => (
        <Button
          size="small"
          icon={<InfoCircleOutlined />}
          onClick={() => handleViewDetails(record)}
        >
          Details
        </Button>
      ),
    },
  ];

  const selectedIntegration = integrations.find(i => i.id === filters.configId);

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Integration Logs
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            Refresh
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportCSV} disabled={logs.length === 0}>
            Export CSV
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap>
            <Select
              style={{ width: 300 }}
              placeholder="Select integration"
              value={filters.configId}
              onChange={(value) => handleFilterChange('configId', value)}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {integrations.map(integration => (
                <Select.Option key={integration.id} value={integration.id}>
                  {integration.displayName} ({integration.name})
                </Select.Option>
              ))}
            </Select>

            <Select
              style={{ width: 200 }}
              placeholder="Operation"
              value={filters.operation}
              onChange={(value) => handleFilterChange('operation', value)}
              allowClear
            >
              <Select.Option value="sync_items">Sync Items</Select.Option>
              <Select.Option value="sync_boms">Sync BOMs</Select.Option>
              <Select.Option value="sync_workorders">Sync Work Orders</Select.Option>
              <Select.Option value="health_check">Health Check</Select.Option>
            </Select>

            <Select
              style={{ width: 150 }}
              placeholder="Status"
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              allowClear
            >
              <Select.Option value="SUCCESS">Success</Select.Option>
              <Select.Option value="PARTIAL">Partial</Select.Option>
              <Select.Option value="FAILURE">Failure</Select.Option>
            </Select>
          </Space>

          {filters.configId && selectedIntegration && (
            <Alert
              message={`Viewing logs for: ${selectedIntegration.displayName}`}
              type="info"
              closable
              onClose={() => handleFilterChange('configId', undefined)}
            />
          )}

          {!filters.configId && (
            <Alert
              message="Please select an integration to view logs"
              type="warning"
              showIcon
            />
          )}
        </Space>
      </Card>

      {/* Logs Table */}
      <Card>
        <Table
          dataSource={logs.map(log => ({ ...log, key: log.id }))}
          columns={columns}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} log entries`,
            pageSizeOptions: ['25', '50', '100', '200'],
          }}
          onChange={(newPagination) => {
            setPagination({
              current: newPagination.current || 1,
              pageSize: newPagination.pageSize || 50,
              total: pagination.total,
            });
          }}
        />
      </Card>

      {/* Log Details Drawer */}
      <Drawer
        title="Log Details"
        placement="right"
        width={720}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedLog && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Timestamp">
                {new Date(selectedLog.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Integration">
                {integrations.find(i => i.id === selectedLog.configId)?.displayName || selectedLog.configId}
              </Descriptions.Item>
              <Descriptions.Item label="Operation">
                {selectedLog.operation.replace(/_/g, ' ').toUpperCase()}
              </Descriptions.Item>
              <Descriptions.Item label="Direction">
                <Space>
                  {getDirectionIcon(selectedLog.direction)}
                  <span>{selectedLog.direction}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedLog.status)} icon={getStatusIcon(selectedLog.status)}>
                  {selectedLog.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Records Processed">
                {selectedLog.recordCount}
              </Descriptions.Item>
              <Descriptions.Item label="Successful">
                {selectedLog.successCount}
              </Descriptions.Item>
              <Descriptions.Item label="Errors">
                {selectedLog.errorCount}
              </Descriptions.Item>
              <Descriptions.Item label="Duration">
                {selectedLog.duration}ms ({(selectedLog.duration / 1000).toFixed(2)}s)
              </Descriptions.Item>
            </Descriptions>

            {selectedLog.errors && selectedLog.errors.length > 0 && (
              <div>
                <Title level={5}>Errors</Title>
                <Alert
                  message={`${selectedLog.errors.length} error(s) occurred during this operation`}
                  type="error"
                  showIcon
                />
                <div style={{ marginTop: 16 }}>
                  {selectedLog.errors.map((error: any, index: number) => (
                    <Alert
                      key={index}
                      message={error.record || `Error ${index + 1}`}
                      description={error.error}
                      type="error"
                      style={{ marginBottom: 8 }}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedLog.requestData && (
              <div>
                <Title level={5}>Request Data</Title>
                <pre style={{
                  background: '#f5f5f5',
                  padding: 16,
                  borderRadius: 4,
                  overflow: 'auto',
                  maxHeight: 300,
                }}>
                  {JSON.stringify(selectedLog.requestData, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.responseData && (
              <div>
                <Title level={5}>Response Data</Title>
                <pre style={{
                  background: '#f5f5f5',
                  padding: 16,
                  borderRadius: 4,
                  overflow: 'auto',
                  maxHeight: 300,
                }}>
                  {JSON.stringify(selectedLog.responseData, null, 2)}
                </pre>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default IntegrationLogs;
