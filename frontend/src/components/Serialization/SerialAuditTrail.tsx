/**
 * Serial Audit Trail Component
 * Issue #150: Serialization - Advanced Assignment Workflows
 * Phase 10: Audit Trail Display System
 *
 * Component for viewing and analyzing serial number audit events and compliance history
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  DatePicker,
  Select,
  Button,
  Space,
  Tag,
  Timeline,
  Drawer,
  Descriptions,
  Badge,
  Input,
  Row,
  Col,
  Statistic,
  Empty,
  Spin,
  message,
  Tooltip,
  Modal,
  Form,
} from 'antd';
import {
  FilterOutlined,
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { apiClient } from '@/services/apiClient';

interface AuditEvent {
  id: string;
  serialNumber: string;
  serialId: string;
  partId: string;
  eventType: string;
  eventSource: string;
  performedBy: string;
  performedAt: string;
  details?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

interface SerialAuditTrailProps {
  serialNumber?: string;
  partId?: string;
  onClose?: () => void;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  'VENDOR_RECEIVED': 'blue',
  'VENDOR_ACCEPTED': 'green',
  'VENDOR_REJECTED': 'red',
  'SERIAL_GENERATED': 'cyan',
  'PROPAGATED': 'orange',
  'CONFLICT_DETECTED': 'volcano',
  'CONFLICT_RESOLVED': 'green',
  'TRIGGER_CREATED': 'purple',
  'TRIGGER_EXECUTED': 'blue',
  'LATE_ASSIGNMENT': 'magenta',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'SUCCESS': <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  'FAILED': <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
  'PENDING': <ClockCircleOutlined style={{ color: '#faad14' }} />,
};

const SerialAuditTrail: React.FC<SerialAuditTrailProps> = ({
  serialNumber,
  partId,
  onClose,
}) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filterEventType, setFilterEventType] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [view, setView] = useState<'table' | 'timeline'>('table');

  useEffect(() => {
    loadAuditEvents();
  }, [serialNumber, partId, filterEventType, filterStatus, dateRange]);

  const loadAuditEvents = async () => {
    try {
      setLoading(true);

      let query = '/api/v1/serialization/audit/events?';
      if (serialNumber) query += `serialNumber=${serialNumber}&`;
      if (partId) query += `partId=${partId}&`;
      if (filterEventType) query += `eventType=${filterEventType}&`;
      if (filterStatus) query += `status=${filterStatus}&`;
      if (dateRange?.[0] && dateRange?.[1]) {
        query += `startDate=${dateRange[0].toISOString()}&`;
        query += `endDate=${dateRange[1].toISOString()}&`;
      }

      const response = await apiClient.get(query.slice(0, -1));
      setEvents(response.data);
    } catch (error: any) {
      message.error('Failed to load audit events');
    } finally {
      setLoading(false);
    }
  };

  const handleExportToCSV = () => {
    try {
      const csv = [
        ['Serial Number', 'Event Type', 'Status', 'Performed By', 'Performed At', 'Details'],
        ...events.map(e => [
          e.serialNumber,
          e.eventType,
          e.status,
          e.performedBy,
          new Date(e.performedAt).toLocaleString(),
          e.details || '',
        ]),
      ]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      message.success('Audit trail exported successfully');
    } catch (error) {
      message.error('Failed to export audit trail');
    }
  };

  const handleCopyEvent = (event: AuditEvent) => {
    const text = JSON.stringify(event, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      message.success('Event details copied to clipboard');
    });
  };

  const columns = [
    {
      title: 'Serial Number',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      width: 150,
    },
    {
      title: 'Event Type',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 160,
      render: (text: string) => (
        <Tag color={EVENT_TYPE_COLORS[text] || 'default'}>
          {text.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => (
        <Space size="small">
          {STATUS_ICONS[status]}
          <span>{status}</span>
        </Space>
      ),
    },
    {
      title: 'Performed By',
      dataIndex: 'performedBy',
      key: 'performedBy',
      width: 130,
      render: (text: string) => (
        <span>
          <UserOutlined style={{ marginRight: '4px' }} />
          {text}
        </span>
      ),
    },
    {
      title: 'Performed At',
      dataIndex: 'performedAt',
      key: 'performedAt',
      width: 180,
      render: (text: string) => (
        new Date(text).toLocaleString()
      ),
      sorter: (a: AuditEvent, b: AuditEvent) =>
        new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: AuditEvent) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedEvent(record);
                setDrawerVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Copy">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyEvent(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const complianceStats = {
    total: events.length,
    successful: events.filter(e => e.status === 'SUCCESS').length,
    failed: events.filter(e => e.status === 'FAILED').length,
    successRate: events.length > 0
      ? Math.round((events.filter(e => e.status === 'SUCCESS').length / events.length) * 100)
      : 0,
  };

  return (
    <div>
      <Card
        title="Serial Audit Trail"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={handleExportToCSV}
              disabled={events.length === 0}
            >
              Export CSV
            </Button>
            {onClose && (
              <Button onClick={onClose}>
                Close
              </Button>
            )}
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {/* Compliance Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic
              title="Total Events"
              value={complianceStats.total}
              prefix={<Badge count={complianceStats.total} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Successful"
              value={complianceStats.successful}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Failed"
              value={complianceStats.failed}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Success Rate"
              value={complianceStats.successRate}
              suffix="%"
              valueStyle={{ color: complianceStats.successRate >= 95 ? '#52c41a' : '#faad14' }}
            />
          </Col>
        </Row>

        {/* Filters */}
        <Card
          type="inner"
          title="Filters"
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <label style={{ display: 'block', marginBottom: '8px' }}>Event Type:</label>
              <Select
                style={{ width: '100%' }}
                placeholder="All event types"
                allowClear
                onChange={setFilterEventType}
                options={[
                  { label: 'Vendor Received', value: 'VENDOR_RECEIVED' },
                  { label: 'Vendor Accepted', value: 'VENDOR_ACCEPTED' },
                  { label: 'Serial Generated', value: 'SERIAL_GENERATED' },
                  { label: 'Propagated', value: 'PROPAGATED' },
                  { label: 'Conflict Detected', value: 'CONFLICT_DETECTED' },
                  { label: 'Conflict Resolved', value: 'CONFLICT_RESOLVED' },
                ]}
              />
            </Col>
            <Col span={8}>
              <label style={{ display: 'block', marginBottom: '8px' }}>Status:</label>
              <Select
                style={{ width: '100%' }}
                placeholder="All statuses"
                allowClear
                onChange={setFilterStatus}
                options={[
                  { label: 'Success', value: 'SUCCESS' },
                  { label: 'Failed', value: 'FAILED' },
                  { label: 'Pending', value: 'PENDING' },
                ]}
              />
            </Col>
            <Col span={8}>
              <label style={{ display: 'block', marginBottom: '8px' }}>Date Range:</label>
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : null)}
              />
            </Col>
          </Row>
        </Card>
      </Card>

      {/* View Toggle */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          type={view === 'table' ? 'primary' : 'default'}
          onClick={() => setView('table')}
        >
          Table View
        </Button>
        <Button
          type={view === 'timeline' ? 'primary' : 'default'}
          onClick={() => setView('timeline')}
        >
          Timeline View
        </Button>
      </Space>

      {/* Events Display */}
      <Card loading={loading}>
        {events.length === 0 ? (
          <Empty description="No audit events found" />
        ) : view === 'table' ? (
          <Table
            dataSource={events}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10, total: events.length }}
            size="small"
          />
        ) : (
          <Timeline
            items={events.map(event => ({
              dot: STATUS_ICONS[event.status],
              children: (
                <div
                  style={{
                    padding: '12px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '4px',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <strong>{event.serialNumber}</strong>
                    <Tag color={EVENT_TYPE_COLORS[event.eventType] || 'default'} style={{ marginLeft: '8px' }}>
                      {event.eventType}
                    </Tag>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <div>Performed by: {event.performedBy}</div>
                    <div>{new Date(event.performedAt).toLocaleString()}</div>
                  </div>
                </div>
              ),
            }))}
          />
        )}
      </Card>

      {/* Event Details Drawer */}
      <Drawer
        title="Event Details"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={500}
      >
        {selectedEvent && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Event ID">
              {selectedEvent.id}
            </Descriptions.Item>
            <Descriptions.Item label="Serial Number">
              {selectedEvent.serialNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Event Type">
              <Tag color={EVENT_TYPE_COLORS[selectedEvent.eventType]}>
                {selectedEvent.eventType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Space size="small">
                {STATUS_ICONS[selectedEvent.status]}
                <span>{selectedEvent.status}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Event Source">
              {selectedEvent.eventSource}
            </Descriptions.Item>
            <Descriptions.Item label="Performed By">
              {selectedEvent.performedBy}
            </Descriptions.Item>
            <Descriptions.Item label="Performed At">
              {new Date(selectedEvent.performedAt).toLocaleString()}
            </Descriptions.Item>
            {selectedEvent.details && (
              <Descriptions.Item label="Details">
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedEvent.details}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default SerialAuditTrail;
