/**
 * LLP Alert Management Component
 *
 * Comprehensive alert management interface for Life-Limited Parts including:
 * - Active alert monitoring and filtering
 * - Alert acknowledgment and resolution workflows
 * - Escalation tracking and management
 * - Alert configuration and threshold management
 * - Historical alert analysis
 * - Notification preferences
 *
 * Safety-critical component for monitoring LLP alerts
 * and ensuring timely response to retirement warnings.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Modal,
  Form,
  Alert,
  Badge,
  Tooltip,
  Statistic,
  Progress,
  Tabs,
  message,
  Popconfirm,
  Drawer,
  Switch,
  InputNumber,
  Divider
} from 'antd';
import {
  AlertOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  EditOutlined,
  FilterOutlined,
  ReloadOutlined,
  SettingOutlined,
  HistoryOutlined,
  UserOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface LLPAlertData {
  id: string;
  serializedPartId: string;
  partNumber: string;
  serialNumber: string;
  alertType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'URGENT' | 'EXPIRED';
  triggerCycles?: number;
  triggerDate?: string;
  thresholdPercentage?: number;
  message: string;
  isActive: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  actionRequired?: string;
  dueDate?: string;
  escalationLevel: number;
  notificationsSent: number;
  createdAt: string;
  updatedAt: string;
}

interface AlertStatistics {
  totalActive: number;
  bySeeverity: {
    urgent: number;
    critical: number;
    warning: number;
    info: number;
  };
  byType: {
    retirementWarning: number;
    inspectionDue: number;
    complianceIssue: number;
    certificationExpiring: number;
  };
  acknowledgmentRate: number;
  averageResolutionTime: number;
}

interface AlertConfigurationData {
  enabled: boolean;
  thresholds: {
    info: number;
    warning: number;
    critical: number;
    urgent: number;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    dashboard: boolean;
  };
  recipients: string[];
  escalationRules: EscalationRule[];
}

interface EscalationRule {
  condition: string;
  delayMinutes: number;
  escalateTo: string[];
  requiresAcknowledgment: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LLPAlertManagement: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<LLPAlertData[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<LLPAlertData[]>([]);
  const [statistics, setStatistics] = useState<AlertStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<LLPAlertData | null>(null);
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfigurationData | null>(null);
  const [acknowledgeForm] = Form.useForm();
  const [resolveForm] = Form.useForm();
  const [configForm] = Form.useForm();

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  useEffect(() => {
    loadAlerts();
    loadStatistics();
    loadAlertConfiguration();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [alerts, searchText, severityFilter, typeFilter, statusFilter, dateRange]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/llp/alerts?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.data || []);
      } else {
        // Use mock data if API fails
        setAlerts(getMockAlerts());
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAlerts(getMockAlerts());
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/llp/alerts/statistics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      } else {
        setStatistics(getMockStatistics());
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
      setStatistics(getMockStatistics());
    }
  };

  const loadAlertConfiguration = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/llp/alerts/configuration', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAlertConfig(data);
        configForm.setFieldsValue(data);
      } else {
        const mockConfig = getMockConfiguration();
        setAlertConfig(mockConfig);
        configForm.setFieldsValue(mockConfig);
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      const mockConfig = getMockConfiguration();
      setAlertConfig(mockConfig);
      configForm.setFieldsValue(mockConfig);
    }
  };

  const getMockAlerts = (): LLPAlertData[] => [
    {
      id: '1',
      serializedPartId: 'sp1',
      partNumber: 'TURB-BLADE-001',
      serialNumber: 'TB001-2024-001',
      alertType: 'RETIREMENT_WARNING',
      severity: 'URGENT',
      triggerCycles: 14750,
      thresholdPercentage: 98.3,
      message: 'Part at 98.3% of cycle limit. Immediate retirement required.',
      isActive: true,
      actionRequired: 'Schedule immediate retirement',
      dueDate: '2024-12-15T00:00:00Z',
      escalationLevel: 1,
      notificationsSent: 3,
      createdAt: '2024-10-25T14:30:00Z',
      updatedAt: '2024-10-25T14:30:00Z'
    },
    {
      id: '2',
      serializedPartId: 'sp2',
      partNumber: 'GUIDE-VANE-002',
      serialNumber: 'GV002-2024-003',
      alertType: 'INSPECTION_DUE',
      severity: 'CRITICAL',
      triggerCycles: 14950,
      message: 'Inspection due at 15,000 cycles (current: 14,950 cycles)',
      isActive: true,
      actionRequired: 'Schedule inspection',
      dueDate: '2024-11-05T00:00:00Z',
      escalationLevel: 1,
      notificationsSent: 1,
      createdAt: '2024-10-26T09:15:00Z',
      updatedAt: '2024-10-26T09:15:00Z'
    },
    {
      id: '3',
      serializedPartId: 'sp3',
      partNumber: 'BEARING-004',
      serialNumber: 'BR004-2024-001',
      alertType: 'COMPLIANCE_ISSUE',
      severity: 'WARNING',
      message: 'Missing Form 1 certification',
      isActive: false,
      acknowledgedBy: 'Jane Smith',
      acknowledgedAt: '2024-10-27T10:00:00Z',
      resolvedBy: 'Quality Team',
      resolvedAt: '2024-10-28T15:30:00Z',
      escalationLevel: 1,
      notificationsSent: 2,
      createdAt: '2024-10-20T11:45:00Z',
      updatedAt: '2024-10-28T15:30:00Z'
    }
  ];

  const getMockStatistics = (): AlertStatistics => ({
    totalActive: 15,
    bySeeverity: {
      urgent: 2,
      critical: 4,
      warning: 6,
      info: 3
    },
    byType: {
      retirementWarning: 3,
      inspectionDue: 5,
      complianceIssue: 4,
      certificationExpiring: 3
    },
    acknowledgmentRate: 85.7,
    averageResolutionTime: 2.3
  });

  const getMockConfiguration = (): AlertConfigurationData => ({
    enabled: true,
    thresholds: {
      info: 80,
      warning: 90,
      critical: 95,
      urgent: 98
    },
    notifications: {
      email: true,
      sms: false,
      dashboard: true
    },
    recipients: ['quality@company.com', 'maintenance@company.com'],
    escalationRules: [
      {
        condition: 'severity >= CRITICAL && acknowledged == false',
        delayMinutes: 60,
        escalateTo: ['supervisor@company.com'],
        requiresAcknowledgment: true
      }
    ]
  });

  const applyFilters = () => {
    let filtered = [...alerts];

    // Text search
    if (searchText) {
      filtered = filtered.filter(alert =>
        alert.partNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        alert.serialNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === severityFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(alert => alert.alertType === typeFilter);
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(alert => alert.isActive);
    } else if (statusFilter === 'acknowledged') {
      filtered = filtered.filter(alert => alert.acknowledgedBy && !alert.resolvedBy);
    } else if (statusFilter === 'resolved') {
      filtered = filtered.filter(alert => alert.resolvedBy);
    }

    // Date range filter
    if (dateRange) {
      filtered = filtered.filter(alert => {
        const alertDate = moment(alert.createdAt);
        return alertDate.isBetween(dateRange[0], dateRange[1], 'day', '[]');
      });
    }

    setFilteredAlerts(filtered);
  };

  const handleAcknowledgeAlert = async (values: any) => {
    if (!selectedAlert) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/llp/alerts/${selectedAlert.id}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: values.notes
        })
      });

      if (response.ok) {
        message.success('Alert acknowledged successfully');
        setShowAcknowledgeModal(false);
        acknowledgeForm.resetFields();
        loadAlerts();
      } else {
        message.error('Failed to acknowledge alert');
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      message.error('Failed to acknowledge alert');
    }
  };

  const handleResolveAlert = async (values: any) => {
    if (!selectedAlert) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/llp/alerts/${selectedAlert.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          resolution: values.resolution,
          notes: values.notes
        })
      });

      if (response.ok) {
        message.success('Alert resolved successfully');
        setShowResolveModal(false);
        resolveForm.resetFields();
        loadAlerts();
      } else {
        message.error('Failed to resolve alert');
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      message.error('Failed to resolve alert');
    }
  };

  const handleUpdateConfiguration = async (values: AlertConfigurationData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/llp/alerts/configuration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('Alert configuration updated successfully');
        setShowConfigDrawer(false);
        setAlertConfig(values);
      } else {
        message.error('Failed to update configuration');
      }
    } catch (error) {
      console.error('Failed to update configuration:', error);
      message.error('Failed to update configuration');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'URGENT': return 'red';
      case 'CRITICAL': return 'red';
      case 'WARNING': return 'orange';
      case 'INFO': return 'blue';
      case 'EXPIRED': return 'purple';
      default: return 'gray';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'URGENT': return <ExclamationCircleOutlined />;
      case 'CRITICAL': return <AlertOutlined />;
      case 'WARNING': return <WarningOutlined />;
      case 'INFO': return <InfoCircleOutlined />;
      case 'EXPIRED': return <CloseCircleOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  // ============================================================================
  // TABLE CONFIGURATION
  // ============================================================================

  const alertColumns: ColumnsType<LLPAlertData> = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity) => (
        <Tag color={getSeverityColor(severity)} icon={getSeverityIcon(severity)}>
          {severity}
        </Tag>
      ),
      sorter: (a, b) => {
        const severityOrder = { URGENT: 4, CRITICAL: 3, WARNING: 2, INFO: 1, EXPIRED: 0 };
        return (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0);
      },
      defaultSortOrder: 'descend',
    },
    {
      title: 'Part',
      key: 'part',
      render: (_, record) => (
        <div>
          <Button
            type="link"
            onClick={() => navigate(`/llp/parts/${record.serializedPartId}`)}
            style={{ padding: 0, fontWeight: 'bold' }}
          >
            {record.partNumber}
          </Button>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              S/N: {record.serialNumber}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Alert Type',
      dataIndex: 'alertType',
      key: 'alertType',
      render: (type) => type.replace('_', ' '),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message) => (
        <Tooltip title={message}>
          {message}
        </Tooltip>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => moment(date).format('MMM DD, YYYY HH:mm'),
      sorter: (a, b) => moment(a.createdAt).unix() - moment(b.createdAt).unix(),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => {
        if (!date) return 'N/A';
        const dueDate = moment(date);
        const isOverdue = dueDate.isBefore(moment());
        return (
          <Tag color={isOverdue ? 'red' : 'blue'}>
            {dueDate.format('MMM DD, YYYY')}
            {isOverdue && ' (Overdue)'}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (record.resolvedBy) {
          return <Tag color="green" icon={<CheckCircleOutlined />}>Resolved</Tag>;
        } else if (record.acknowledgedBy) {
          return <Tag color="orange" icon={<EyeOutlined />}>Acknowledged</Tag>;
        } else {
          return <Tag color="red" icon={<AlertOutlined />}>Active</Tag>;
        }
      },
    },
    {
      title: 'Escalation',
      dataIndex: 'escalationLevel',
      key: 'escalationLevel',
      render: (level, record) => (
        <div>
          <Badge count={level} style={{ backgroundColor: level > 1 ? '#ff4d4f' : '#1890ff' }} />
          <div style={{ fontSize: 11, color: '#666' }}>
            {record.notificationsSent} sent
          </div>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          {record.isActive && !record.acknowledgedBy && (
            <Button
              size="small"
              type="primary"
              ghost
              onClick={() => {
                setSelectedAlert(record);
                setShowAcknowledgeModal(true);
              }}
            >
              Acknowledge
            </Button>
          )}
          {record.acknowledgedBy && !record.resolvedBy && (
            <Button
              size="small"
              type="primary"
              onClick={() => {
                setSelectedAlert(record);
                setShowResolveModal(true);
              }}
            >
              Resolve
            </Button>
          )}
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/llp/parts/${record.serializedPartId}`)}
          >
            View Part
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              <BellOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              LLP Alert Management
            </Title>
            <Text type="secondary">
              Monitor and manage Life-Limited Parts alerts and notifications
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadAlerts}>
                Refresh
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setShowConfigDrawer(true)}
              >
                Configuration
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Active Alerts"
                value={statistics.totalActive}
                prefix={<AlertOutlined />}
                valueStyle={{ color: statistics.totalActive > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Urgent/Critical"
                value={statistics.bySeeverity.urgent + statistics.bySeeverity.critical}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Acknowledgment Rate"
                value={statistics.acknowledgmentRate}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: statistics.acknowledgmentRate >= 80 ? '#52c41a' : '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Avg Resolution Time"
                value={statistics.averageResolutionTime}
                suffix="days"
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Search
              placeholder="Search alerts..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Severity"
              value={severityFilter}
              onChange={setSeverityFilter}
            >
              <Option value="all">All Severities</Option>
              <Option value="URGENT">Urgent</Option>
              <Option value="CRITICAL">Critical</Option>
              <Option value="WARNING">Warning</Option>
              <Option value="INFO">Info</Option>
              <Option value="EXPIRED">Expired</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Type"
              value={typeFilter}
              onChange={setTypeFilter}
            >
              <Option value="all">All Types</Option>
              <Option value="RETIREMENT_WARNING">Retirement Warning</Option>
              <Option value="INSPECTION_DUE">Inspection Due</Option>
              <Option value="COMPLIANCE_ISSUE">Compliance Issue</Option>
              <Option value="CERTIFICATION_EXPIRING">Certification Expiring</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              placeholder="Status"
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="all">All Statuses</Option>
              <Option value="active">Active</Option>
              <Option value="acknowledged">Acknowledged</Option>
              <Option value="resolved">Resolved</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Start Date', 'End Date']}
            />
          </Col>
        </Row>
      </Card>

      {/* Alerts Table */}
      <Card>
        <Table
          dataSource={filteredAlerts}
          columns={alertColumns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} alerts`,
          }}
          rowClassName={(record) => {
            if (record.severity === 'URGENT') return 'alert-urgent';
            if (record.severity === 'CRITICAL') return 'alert-critical';
            return '';
          }}
        />
      </Card>

      {/* Acknowledge Modal */}
      <Modal
        title="Acknowledge Alert"
        open={showAcknowledgeModal}
        onCancel={() => setShowAcknowledgeModal(false)}
        footer={null}
      >
        {selectedAlert && (
          <div>
            <Alert
              message={`${selectedAlert.partNumber} - ${selectedAlert.serialNumber}`}
              description={selectedAlert.message}
              type="warning"
              style={{ marginBottom: 16 }}
            />
            <Form
              form={acknowledgeForm}
              onFinish={handleAcknowledgeAlert}
              layout="vertical"
            >
              <Form.Item
                name="notes"
                label="Acknowledgment Notes"
                rules={[{ required: true, message: 'Please provide acknowledgment notes' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="Enter reason for acknowledgment and planned actions..."
                />
              </Form.Item>
              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setShowAcknowledgeModal(false)}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit">
                    Acknowledge Alert
                  </Button>
                </Space>
              </div>
            </Form>
          </div>
        )}
      </Modal>

      {/* Resolve Modal */}
      <Modal
        title="Resolve Alert"
        open={showResolveModal}
        onCancel={() => setShowResolveModal(false)}
        footer={null}
      >
        {selectedAlert && (
          <div>
            <Alert
              message={`${selectedAlert.partNumber} - ${selectedAlert.serialNumber}`}
              description={selectedAlert.message}
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Form
              form={resolveForm}
              onFinish={handleResolveAlert}
              layout="vertical"
            >
              <Form.Item
                name="resolution"
                label="Resolution Action"
                rules={[{ required: true, message: 'Please specify the resolution action' }]}
              >
                <Select placeholder="Select resolution action">
                  <Option value="PART_RETIRED">Part Retired</Option>
                  <Option value="INSPECTION_COMPLETED">Inspection Completed</Option>
                  <Option value="DOCUMENTATION_UPDATED">Documentation Updated</Option>
                  <Option value="MAINTENANCE_PERFORMED">Maintenance Performed</Option>
                  <Option value="FALSE_ALERT">False Alert</Option>
                  <Option value="OTHER">Other</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="notes"
                label="Resolution Notes"
                rules={[{ required: true, message: 'Please provide resolution details' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="Enter details of how this alert was resolved..."
                />
              </Form.Item>
              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setShowResolveModal(false)}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit">
                    Resolve Alert
                  </Button>
                </Space>
              </div>
            </Form>
          </div>
        )}
      </Modal>

      {/* Configuration Drawer */}
      <Drawer
        title="Alert Configuration"
        placement="right"
        width={600}
        open={showConfigDrawer}
        onClose={() => setShowConfigDrawer(false)}
      >
        {alertConfig && (
          <Form
            form={configForm}
            onFinish={handleUpdateConfiguration}
            layout="vertical"
          >
            <Card title="Alert Thresholds" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item name={['thresholds', 'info']} label="Info (%)">
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['thresholds', 'warning']} label="Warning (%)">
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['thresholds', 'critical']} label="Critical (%)">
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['thresholds', 'urgent']} label="Urgent (%)">
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Notification Settings" size="small" style={{ marginBottom: 16 }}>
              <Form.Item name={['notifications', 'email']} valuePropName="checked">
                <Switch /> Email Notifications
              </Form.Item>
              <Form.Item name={['notifications', 'sms']} valuePropName="checked">
                <Switch /> SMS Notifications
              </Form.Item>
              <Form.Item name={['notifications', 'dashboard']} valuePropName="checked">
                <Switch /> Dashboard Notifications
              </Form.Item>
            </Card>

            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setShowConfigDrawer(false)}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  Save Configuration
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Drawer>

      <style jsx>{`
        .alert-urgent {
          background-color: #fff2f0 !important;
          border-left: 4px solid #ff4d4f !important;
        }
        .alert-critical {
          background-color: #fff7e6 !important;
          border-left: 4px solid #fa8c16 !important;
        }
      `}</style>
    </div>
  );
};

export default LLPAlertManagement;