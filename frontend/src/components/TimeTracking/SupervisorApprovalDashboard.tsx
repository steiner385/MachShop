/**
 * Supervisor Approval Dashboard Component
 * Dashboard for supervisors to manage time entry approval workflows
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  Alert,
  Typography,
  Badge,
  Modal,
  Form,
  message,
  Spin,
  Tabs,
  Progress,
  List,
  Avatar,
  Divider,
  Checkbox,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  BulkOutlined,
  EyeOutlined,
  WarningOutlined,
  TrophyOutlined,
  TeamOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import styled from 'styled-components';
import TimeTypeIndicator from './TimeTypeIndicator';
import TimeEntryHistory from './TimeEntryHistory';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text, Title } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

// Styled Components
const DashboardContainer = styled.div`
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
`;

const StatsCard = styled(Card)`
  .ant-card-body {
    padding: 16px;
  }

  .ant-statistic-title {
    font-size: 12px;
    color: #666;
  }

  .ant-statistic-content {
    font-size: 20px;
  }
`;

const PriorityBadge = styled(Badge)<{ priority: 'high' | 'medium' | 'low' }>`
  .ant-badge-count {
    background-color: ${props => {
      switch (props.priority) {
        case 'high': return '#f5222d';
        case 'medium': return '#faad14';
        case 'low': return '#52c41a';
        default: return '#d9d9d9';
      }
    }};
  }
`;

const ApprovalCard = styled(Card)<{ selected?: boolean }>`
  margin-bottom: 8px;
  cursor: pointer;
  border: ${props => props.selected ? '2px solid #1890ff' : '1px solid #d9d9d9'};
  background: ${props => props.selected ? '#f0f9ff' : 'white'};

  &:hover {
    border-color: #1890ff;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
  }

  .ant-card-body {
    padding: 12px;
  }
`;

const MetricsCard = styled(Card)`
  .metric-item {
    text-align: center;
    padding: 8px;
  }

  .metric-value {
    font-size: 24px;
    font-weight: bold;
    color: #1890ff;
  }

  .metric-label {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
  }
`;

// Types
export interface PendingApproval {
  id: string;
  timeEntryId: string;
  timeEntryType: 'LABOR' | 'MACHINE';
  editType: string;
  originalValues: Record<string, any>;
  newValues: Record<string, any>;
  changedFields: string[];
  reason: string;
  reasonCategory: string;
  editedBy: string;
  editedAt: string;
  riskScore: number;
  autoApprovalEvaluation: {
    shouldAutoApprove: boolean;
    reason: string;
    appliedRules: string[];
  };
  editor: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  laborTimeEntry?: {
    id: string;
    clockInTime: string;
    clockOutTime?: string;
    duration?: number;
    workOrder?: {
      workOrderNumber: string;
    };
    operation?: {
      operationNumber: string;
      description: string;
    };
    indirectCode?: {
      code: string;
      description: string;
      category: string;
      displayColor: string;
    };
    user: {
      firstName: string;
      lastName: string;
      username: string;
    };
  };
  machineTimeEntry?: {
    id: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    equipment: {
      name: string;
      equipmentNumber: string;
    };
  };
}

export interface ApprovalMetrics {
  pendingCount: number;
  averageApprovalTime: number;
  approvalRate: number;
  escalationRate: number;
  autoApprovalRate: number;
  oldestPendingDays: number;
  byApprover: Array<{
    approverId: string;
    approverName: string;
    pendingCount: number;
    avgTimeHours: number;
    approvalRate: number;
  }>;
}

interface SupervisorApprovalDashboardProps {
  siteId?: string;
}

const SupervisorApprovalDashboard: React.FC<SupervisorApprovalDashboardProps> = ({ siteId }) => {
  const [loading, setLoading] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<ApprovalMetrics | null>(null);

  // Filter states
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [sortBy, setSortBy] = useState<string>('oldest');

  // Modal states
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [bulkApprovalVisible, setBulkApprovalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);

  // Form states
  const [approvalForm] = Form.useForm();
  const [bulkForm] = Form.useForm();

  useEffect(() => {
    loadPendingApprovals();
    loadMetrics();
  }, [siteId, riskFilter, typeFilter, dateRange, sortBy]);

  const loadPendingApprovals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy,
        limit: '100',
      });

      if (siteId) params.append('siteId', siteId);
      if (riskFilter !== 'all') {
        if (riskFilter === 'high') {
          params.append('riskScoreMin', '70');
        } else if (riskFilter === 'medium') {
          params.append('riskScoreMin', '30');
          params.append('riskScoreMax', '69');
        } else if (riskFilter === 'low') {
          params.append('riskScoreMax', '29');
        }
      }

      if (typeFilter.length > 0) {
        params.append('editType', typeFilter.join(','));
      }

      if (dateRange) {
        params.append('startDate', dateRange[0].toISOString());
        params.append('endDate', dateRange[1].toISOString());
      }

      const response = await fetch(`/api/v1/time-entry-management/pending-approvals?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setPendingApprovals(result.data.edits || []);
      }
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
      message.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const params = new URLSearchParams();
      if (siteId) params.append('siteId', siteId);
      if (dateRange) {
        params.append('startDate', dateRange[0].toISOString());
        params.append('endDate', dateRange[1].toISOString());
      }

      const response = await fetch(`/api/v1/time-entry-management/metrics?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setMetrics(result.data);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const handleApprovalAction = async (
    approvalId: string,
    action: 'APPROVED' | 'REJECTED' | 'MORE_INFO_NEEDED',
    notes?: string
  ) => {
    try {
      const response = await fetch(`/api/v1/time-entry-management/approvals/${approvalId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          status: action,
          approvalNotes: notes,
        }),
      });

      const result = await response.json();
      if (result.success) {
        message.success(`Edit ${action.toLowerCase().replace('_', ' ')} successfully`);
        loadPendingApprovals();
        loadMetrics();
        setApprovalModalVisible(false);
      } else {
        message.error(result.error || 'Failed to process approval');
      }
    } catch (error) {
      console.error('Approval action error:', error);
      message.error('Failed to process approval');
    }
  };

  const handleBulkApproval = async (values: any) => {
    try {
      const response = await fetch('/api/v1/time-entry-management/approvals/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          timeEntryEditIds: selectedApprovals,
          status: values.status,
          approvalNotes: values.notes,
          batchName: values.batchName || `Bulk ${values.status} - ${dayjs().format('YYYY-MM-DD')}`,
        }),
      });

      const result = await response.json();
      if (result.success) {
        message.success(`Bulk ${values.status.toLowerCase()} processed successfully`);
        setBulkApprovalVisible(false);
        setSelectedApprovals([]);
        loadPendingApprovals();
        loadMetrics();
      } else {
        message.error(result.error || 'Failed to process bulk approval');
      }
    } catch (error) {
      console.error('Bulk approval error:', error);
      message.error('Failed to process bulk approval');
    }
  };

  const getRiskPriority = (score: number): 'high' | 'medium' | 'low' => {
    if (score >= 70) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  };

  const formatDiff = (field: string, oldValue: any, newValue: any) => {
    const formatValue = (value: any) => {
      if (value === null || value === undefined) return 'Not set';
      if (typeof value === 'string' && value.includes('T')) {
        return dayjs(value).format('MM/DD HH:mm');
      }
      return String(value);
    };

    return (
      <div style={{ fontSize: '12px' }}>
        <Text type="secondary">{field}:</Text>{' '}
        <Text delete type="secondary">{formatValue(oldValue)}</Text>{' '}
        → <Text strong>{formatValue(newValue)}</Text>
      </div>
    );
  };

  const renderApprovalCard = (approval: PendingApproval) => {
    const isSelected = selectedApprovals.includes(approval.id);
    const timeEntry = approval.laborTimeEntry || approval.machineTimeEntry;
    const priority = getRiskPriority(approval.riskScore);
    const hoursAgo = dayjs().diff(dayjs(approval.editedAt), 'hours');

    return (
      <ApprovalCard
        key={approval.id}
        size="small"
        selected={isSelected}
        onClick={() => {
          if (isSelected) {
            setSelectedApprovals(prev => prev.filter(id => id !== approval.id));
          } else {
            setSelectedApprovals(prev => [...prev, approval.id]);
          }
        }}
      >
        <Row justify="space-between" align="top">
          <Col span={20}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {/* Header */}
              <Row justify="space-between" align="center">
                <Col>
                  <Space>
                    <Checkbox checked={isSelected} onChange={() => {}} />
                    <Text strong>
                      {approval.laborTimeEntry ? (
                        `${timeEntry?.user.firstName} ${timeEntry?.user.lastName}`
                      ) : (
                        approval.machineTimeEntry?.equipment.name
                      )}
                    </Text>
                    <PriorityBadge priority={priority}>
                      <Tag color={priority === 'high' ? 'red' : priority === 'medium' ? 'orange' : 'green'}>
                        Risk: {approval.riskScore}
                      </Tag>
                    </PriorityBadge>
                  </Space>
                </Col>
                <Col>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {hoursAgo}h ago
                  </Text>
                </Col>
              </Row>

              {/* Assignment Info */}
              <div>
                {approval.laborTimeEntry?.workOrder ? (
                  <Space>
                    <TimeTypeIndicator
                      timeType="DIRECT_LABOR"
                      variant="compact"
                      showText={false}
                    />
                    <Text>{approval.laborTimeEntry.workOrder.workOrderNumber}</Text>
                    {approval.laborTimeEntry.operation && (
                      <Text type="secondary">
                        Op: {approval.laborTimeEntry.operation.operationNumber}
                      </Text>
                    )}
                  </Space>
                ) : approval.laborTimeEntry?.indirectCode ? (
                  <Space>
                    <TimeTypeIndicator
                      timeType="INDIRECT"
                      indirectCategory={approval.laborTimeEntry.indirectCode.category as any}
                      variant="compact"
                      showText={false}
                    />
                    <Text>{approval.laborTimeEntry.indirectCode.description}</Text>
                  </Space>
                ) : (
                  <Text type="secondary">Machine Time</Text>
                )}
              </div>

              {/* Changes */}
              <div style={{ background: '#fafafa', padding: '8px', borderRadius: '4px' }}>
                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                  Changes ({approval.changedFields.length}):
                </Text>
                {approval.changedFields.slice(0, 2).map(field => (
                  <div key={field}>
                    {formatDiff(field, approval.originalValues[field], approval.newValues[field])}
                  </div>
                ))}
                {approval.changedFields.length > 2 && (
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    +{approval.changedFields.length - 2} more changes
                  </Text>
                )}
              </div>

              {/* Reason */}
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Reason: {approval.reason}
                </Text>
              </div>
            </Space>
          </Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            <Space direction="vertical" size="small">
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedApproval(approval);
                  approvalForm.setFieldsValue({ action: 'APPROVED' });
                  setApprovalModalVisible(true);
                }}
              >
                Approve
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedApproval(approval);
                  approvalForm.setFieldsValue({ action: 'REJECTED' });
                  setApprovalModalVisible(true);
                }}
              >
                Reject
              </Button>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (approval.laborTimeEntry) {
                    setSelectedApproval(approval);
                    setHistoryModalVisible(true);
                  }
                }}
              >
                Details
              </Button>
            </Space>
          </Col>
        </Row>
      </ApprovalCard>
    );
  };

  const renderMetrics = () => {
    if (!metrics) return null;

    return (
      <Row gutter={16}>
        <Col span={6}>
          <StatsCard>
            <Statistic
              title="Pending Approvals"
              value={metrics.pendingCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: metrics.pendingCount > 0 ? '#faad14' : '#52c41a' }}
            />
          </StatsCard>
        </Col>
        <Col span={6}>
          <StatsCard>
            <Statistic
              title="Avg Approval Time"
              value={metrics.averageApprovalTime}
              precision={1}
              suffix="h"
              prefix={<ClockCircleOutlined />}
            />
          </StatsCard>
        </Col>
        <Col span={6}>
          <StatsCard>
            <Statistic
              title="Approval Rate"
              value={metrics.approvalRate * 100}
              precision={1}
              suffix="%"
              prefix={<CheckOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </StatsCard>
        </Col>
        <Col span={6}>
          <StatsCard>
            <Statistic
              title="Auto-Approval Rate"
              value={metrics.autoApprovalRate * 100}
              precision={1}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </StatsCard>
        </Col>
      </Row>
    );
  };

  const renderApproverMetrics = () => {
    if (!metrics?.byApprover || metrics.byApprover.length === 0) return null;

    return (
      <MetricsCard title="Approver Performance" size="small">
        <List
          dataSource={metrics.byApprover}
          renderItem={(approver) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={approver.approverName}
                description={
                  <Row gutter={16}>
                    <Col span={6}>
                      <div className="metric-item">
                        <div className="metric-value">{approver.pendingCount}</div>
                        <div className="metric-label">Pending</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className="metric-item">
                        <div className="metric-value">{approver.avgTimeHours.toFixed(1)}h</div>
                        <div className="metric-label">Avg Time</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className="metric-item">
                        <div className="metric-value">{(approver.approvalRate * 100).toFixed(0)}%</div>
                        <div className="metric-label">Rate</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <Progress
                        percent={approver.approvalRate * 100}
                        size="small"
                        showInfo={false}
                      />
                    </Col>
                  </Row>
                }
              />
            </List.Item>
          )}
        />
      </MetricsCard>
    );
  };

  return (
    <DashboardContainer>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3}>Time Entry Approvals</Title>
        </Col>
        <Col>
          <Space>
            <Button
              type="primary"
              icon={<BulkOutlined />}
              disabled={selectedApprovals.length === 0}
              onClick={() => setBulkApprovalVisible(true)}
            >
              Bulk Actions ({selectedApprovals.length})
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadPendingApprovals();
                loadMetrics();
              }}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      <Tabs defaultActiveKey="approvals">
        <TabPane tab="Pending Approvals" key="approvals">
          {/* Metrics */}
          <div style={{ marginBottom: 24 }}>
            {renderMetrics()}
          </div>

          {/* Filters */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={4}>
                <Select
                  value={riskFilter}
                  onChange={setRiskFilter}
                  style={{ width: '100%' }}
                >
                  <Option value="all">All Risk Levels</Option>
                  <Option value="high">High Risk (70+)</Option>
                  <Option value="medium">Medium Risk (30-69)</Option>
                  <Option value="low">Low Risk (&lt;30)</Option>
                </Select>
              </Col>
              <Col span={4}>
                <Select
                  mode="multiple"
                  placeholder="Edit Types"
                  value={typeFilter}
                  onChange={setTypeFilter}
                  style={{ width: '100%' }}
                  allowClear
                >
                  <Option value="MODIFIED">Modified</Option>
                  <Option value="SPLIT">Split</Option>
                  <Option value="MERGED">Merged</Option>
                  <Option value="TRANSFERRED">Transferred</Option>
                </Select>
              </Col>
              <Col span={6}>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={4}>
                <Select
                  value={sortBy}
                  onChange={setSortBy}
                  style={{ width: '100%' }}
                >
                  <Option value="oldest">Oldest First</Option>
                  <Option value="newest">Newest First</Option>
                  <Option value="priority">Highest Risk First</Option>
                </Select>
              </Col>
              <Col span={6}>
                <Space>
                  <Button
                    icon={<FilterOutlined />}
                    onClick={() => {
                      setRiskFilter('all');
                      setTypeFilter([]);
                      setDateRange(null);
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Text type="secondary">
                    {pendingApprovals.length} pending approval(s)
                  </Text>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Approval Cards */}
          <Spin spinning={loading}>
            {pendingApprovals.length > 0 ? (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {pendingApprovals.map(renderApprovalCard)}
              </div>
            ) : (
              <Alert
                type="success"
                message="No Pending Approvals"
                description="All time entry edits have been processed."
                showIcon
                style={{ textAlign: 'center' }}
              />
            )}
          </Spin>
        </TabPane>

        <TabPane tab="Analytics" key="analytics">
          <Row gutter={16}>
            <Col span={16}>
              {renderMetrics()}
              {metrics && metrics.oldestPendingDays > 0 && (
                <Alert
                  type="warning"
                  message={`Oldest pending approval is ${metrics.oldestPendingDays} days old`}
                  description="Consider reviewing and processing older approvals to maintain workflow efficiency."
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </Col>
            <Col span={8}>
              {renderApproverMetrics()}
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* Approval Modal */}
      <Modal
        title="Process Approval"
        open={approvalModalVisible}
        onCancel={() => setApprovalModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedApproval && (
          <Form
            form={approvalForm}
            layout="vertical"
            onFinish={(values) => {
              handleApprovalAction(selectedApproval.id, values.action, values.notes);
            }}
          >
            <Alert
              type="info"
              message={`Processing edit for ${selectedApproval.editor.firstName} ${selectedApproval.editor.lastName}`}
              description={selectedApproval.reason}
              style={{ marginBottom: 16 }}
            />

            <Form.Item
              label="Action"
              name="action"
              rules={[{ required: true, message: 'Please select an action' }]}
            >
              <Select>
                <Option value="APPROVED">Approve</Option>
                <Option value="REJECTED">Reject</Option>
                <Option value="MORE_INFO_NEEDED">Request More Information</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Notes"
              name="notes"
              rules={[{ required: true, message: 'Please provide notes' }]}
            >
              <TextArea
                rows={4}
                placeholder="Provide reason for your decision..."
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Submit
                </Button>
                <Button onClick={() => setApprovalModalVisible(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Bulk Approval Modal */}
      <Modal
        title={`Bulk Process ${selectedApprovals.length} Approvals`}
        open={bulkApprovalVisible}
        onCancel={() => setBulkApprovalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={bulkForm}
          layout="vertical"
          onFinish={handleBulkApproval}
        >
          <Alert
            type="warning"
            message={`You are about to process ${selectedApprovals.length} approvals`}
            description="This action cannot be undone. Please review carefully."
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            label="Action"
            name="status"
            rules={[{ required: true, message: 'Please select an action' }]}
          >
            <Select>
              <Option value="APPROVED">Approve All</Option>
              <Option value="REJECTED">Reject All</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Batch Name"
            name="batchName"
          >
            <Input placeholder="Optional batch name for tracking" />
          </Form.Item>

          <Form.Item
            label="Notes"
            name="notes"
            rules={[{ required: true, message: 'Please provide notes' }]}
          >
            <TextArea
              rows={3}
              placeholder="Reason for bulk action..."
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Process All
              </Button>
              <Button onClick={() => setBulkApprovalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* History Modal */}
      {selectedApproval?.laborTimeEntry && (
        <TimeEntryHistory
          timeEntry={selectedApproval.laborTimeEntry as any}
          visible={historyModalVisible}
          onClose={() => setHistoryModalVisible(false)}
        />
      )}
    </DashboardContainer>
  );
};

export default SupervisorApprovalDashboard;