/**
 * NCR Approval Dashboard Component
 *
 * Comprehensive dashboard for managing NCR approvals:
 * - Pending approvals queue with filtering and sorting
 * - Approval statistics (pending, approved, rejected, delegated)
 * - Escalation tracking for overdue approvals
 * - Quick action buttons (approve, reject, delegate)
 * - Approval history and notes
 * - Role-based filtering
 *
 * Supports different approval request types:
 * - STATE_TRANSITION: State change approvals
 * - DISPOSITION: Disposition approvals
 * - CTP_AUTHORIZATION: Continue to Process
 * - MRB_DECISION: Material Review Board
 * - CLOSURE: NCR closure
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Badge,
  Statistic,
  Row,
  Col,
  Input,
  Select,
  Empty,
  Tooltip,
  Modal,
  Form,
  TextArea,
  Checkbox,
  Avatar,
  Timeline,
  Alert,
  Segmented,
  Progress,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';

dayjs.extend(relativeTime);
dayjs.extend(duration);

/**
 * Approval Status Type
 */
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'EXPIRED';

/**
 * Approval Request Type
 */
type ApprovalRequestType = 'STATE_TRANSITION' | 'DISPOSITION' | 'CTP_AUTHORIZATION' | 'MRB_DECISION' | 'CLOSURE';

/**
 * Approval request entry
 */
export interface ApprovalRequest {
  id: string;
  ncrId: string;
  ncrNumber: string;
  requestType: ApprovalRequestType;
  requestedBy: string;
  requestedByName?: string;
  requestedAt: Date;
  approverUserId: string;
  approverName?: string;
  status: ApprovalStatus;
  approvalNotes?: string;
  approvedAt?: Date;
  dueDate?: Date;
  escalated: boolean;
  escalatedAt?: Date;
  daysOverdue?: number;
}

/**
 * Approval statistics
 */
export interface ApprovalStatistics {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalDelegated: number;
  averageApprovalTime: number; // in hours
  overduePending: number;
}

/**
 * NCR Approval Dashboard Props
 */
interface NCRApprovalDashboardProps {
  /** Pending approvals for current user */
  pendingApprovals: ApprovalRequest[];
  /** Approval statistics */
  statistics: ApprovalStatistics;
  /** Current user ID */
  currentUserId: string;
  /** Current user role */
  userRole?: string;
  /** Whether dashboard is loading */
  isLoading?: boolean;
  /** Callback when approval is submitted */
  onApprove?: (approvalId: string, notes?: string) => Promise<void>;
  /** Callback when approval is rejected */
  onReject?: (approvalId: string, reason: string) => Promise<void>;
  /** Callback when approval is delegated */
  onDelegate?: (approvalId: string, delegateToUserId: string) => Promise<void>;
}

/**
 * Approval Request Type Display
 */
const REQUEST_TYPE_LABELS: Record<ApprovalRequestType, { label: string; color: string }> = {
  STATE_TRANSITION: { label: 'State Transition', color: 'blue' },
  DISPOSITION: { label: 'Disposition', color: 'purple' },
  CTP_AUTHORIZATION: { label: 'CTP Authorization', color: 'cyan' },
  MRB_DECISION: { label: 'MRB Decision', color: 'magenta' },
  CLOSURE: { label: 'Closure', color: 'green' },
};

/**
 * Status color mapping
 */
const STATUS_COLORS: Record<ApprovalStatus, string> = {
  PENDING: 'processing',
  APPROVED: 'success',
  REJECTED: 'error',
  DELEGATED: 'warning',
  EXPIRED: 'default',
};

/**
 * NCR Approval Dashboard Component
 */
export const NCRApprovalDashboard: React.FC<NCRApprovalDashboardProps> = ({
  pendingApprovals = [],
  statistics = {
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalDelegated: 0,
    averageApprovalTime: 0,
    overduePending: 0,
  },
  currentUserId,
  userRole,
  isLoading = false,
  onApprove,
  onReject,
  onDelegate,
}) => {
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const [filterType, setFilterType] = useState<ApprovalRequestType | 'ALL'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [delegateModalVisible, setDelegateModalVisible] = useState(false);
  const [approvalForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [delegateForm] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);

  /**
   * Filter approvals based on selected filters
   */
  const filteredApprovals = useMemo(() => {
    return pendingApprovals.filter((approval) => {
      const matchesStatus =
        filterStatus === 'ALL' || approval.status === filterStatus;
      const matchesType = filterType === 'ALL' || approval.requestType === filterType;
      const matchesSearch =
        approval.ncrNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        approval.requestedByName?.toLowerCase().includes(searchText.toLowerCase()) ||
        approval.approvalNotes?.toLowerCase().includes(searchText.toLowerCase());

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [pendingApprovals, filterStatus, filterType, searchText]);

  /**
   * Handle approve action
   */
  const handleApprove = async (approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    approvalForm.resetFields();
    setApprovalModalVisible(true);
  };

  /**
   * Submit approval
   */
  const submitApproval = async () => {
    try {
      const values = await approvalForm.validateFields();
      setActionLoading(true);
      await onApprove?.(selectedApproval!.id, values.notes);
      setApprovalModalVisible(false);
      approvalForm.resetFields();
    } catch (error) {
      console.error('Error approving request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handle reject action
   */
  const handleReject = async (approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    rejectForm.resetFields();
    setRejectModalVisible(true);
  };

  /**
   * Submit rejection
   */
  const submitReject = async () => {
    try {
      const values = await rejectForm.validateFields();
      setActionLoading(true);
      await onReject?.(selectedApproval!.id, values.rejectionReason);
      setRejectModalVisible(false);
      rejectForm.resetFields();
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handle delegate action
   */
  const handleDelegate = async (approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    delegateForm.resetFields();
    setDelegateModalVisible(true);
  };

  /**
   * Submit delegation
   */
  const submitDelegate = async () => {
    try {
      const values = await delegateForm.validateFields();
      setActionLoading(true);
      await onDelegate?.(selectedApproval!.id, values.delegateTo);
      setDelegateModalVisible(false);
      delegateForm.resetFields();
    } catch (error) {
      console.error('Error delegating request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Get urgency color based on days overdue
   */
  const getUrgencyColor = (approval: ApprovalRequest) => {
    if (!approval.daysOverdue) return 'default';
    if (approval.daysOverdue > 5) return 'red';
    if (approval.daysOverdue > 2) return 'orange';
    return 'yellow';
  };

  /**
   * Get days remaining or overdue
   */
  const getDaysDisplay = (approval: ApprovalRequest) => {
    if (!approval.dueDate) return 'No due date';
    const now = dayjs();
    const due = dayjs(approval.dueDate);
    const diff = due.diff(now, 'day');
    return diff > 0 ? `${diff} days remaining` : `${Math.abs(diff)} days overdue`;
  };

  /**
   * Table columns for approvals
   */
  const columns: ColumnsType<ApprovalRequest> = [
    {
      title: 'NCR Number',
      dataIndex: 'ncrNumber',
      key: 'ncrNumber',
      width: 120,
      render: (text) => (
        <Tooltip title={`View NCR ${text}`}>
          <a>{text}</a>
        </Tooltip>
      ),
    },
    {
      title: 'Request Type',
      dataIndex: 'requestType',
      key: 'requestType',
      width: 140,
      render: (type: ApprovalRequestType) => (
        <Tag color={REQUEST_TYPE_LABELS[type].color}>
          {REQUEST_TYPE_LABELS[type].label}
        </Tag>
      ),
    },
    {
      title: 'Requested By',
      dataIndex: 'requestedByName',
      key: 'requestedBy',
      width: 130,
      render: (text, record) => (
        <Space size="small">
          <Avatar size="small" icon={<UserOutlined />} />
          <span>{text || record.requestedBy}</span>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: ApprovalStatus, record) => (
        <Space direction="vertical" size={0}>
          <Tag color={STATUS_COLORS[status]}>{status}</Tag>
          {record.escalated && (
            <Tag icon={<WarningOutlined />} color="red">
              Escalated
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 130,
      render: (dueDate: Date, record) => (
        <Tooltip title={dueDate ? dayjs(dueDate).format('MMMM D, YYYY h:mm A') : 'N/A'}>
          <div>
            {dueDate ? dayjs(dueDate).fromNow() : 'No deadline'}
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              {getDaysDisplay(record)}
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) =>
        record.status === 'PENDING' ? (
          <Space size="small" wrap>
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApprove(record)}
              loading={actionLoading}
            >
              Approve
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => handleReject(record)}
              loading={actionLoading}
            >
              Reject
            </Button>
            <Button
              size="small"
              onClick={() => handleDelegate(record)}
              loading={actionLoading}
            >
              Delegate
            </Button>
          </Space>
        ) : (
          <Tag color={STATUS_COLORS[record.status]}>{record.status}</Tag>
        ),
    },
  ];

  /**
   * Calculate approval completion rate
   */
  const totalApprovals =
    statistics.totalPending +
    statistics.totalApproved +
    statistics.totalRejected +
    statistics.totalDelegated;
  const completionRate = totalApprovals > 0 ? (statistics.totalApproved / totalApprovals) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Statistics Overview */}
      <Card loading={isLoading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Pending Approvals"
              value={statistics.totalPending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Approved"
              value={statistics.totalApproved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Rejected"
              value={statistics.totalRejected}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Overdue"
              value={statistics.overduePending}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12}>
            <div>
              <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 500 }}>
                Approval Completion Rate
              </div>
              <Progress
                percent={Math.round(completionRate)}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <Statistic
              title="Avg Approval Time"
              value={statistics.averageApprovalTime}
              suffix="hours"
              prefix={<CalendarOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Overdue Alerts */}
      {statistics.overduePending > 0 && (
        <Alert
          message={`${statistics.overduePending} approval${statistics.overduePending > 1 ? 's' : ''} overdue`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          action={
            <Button size="small" danger>
              Escalate
            </Button>
          }
        />
      )}

      {/* Filters and Search */}
      <Card title="Pending Approvals Queue" loading={isLoading}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Search and Filter Controls */}
          <Space wrap style={{ width: '100%' }}>
            <Input
              placeholder="Search NCR number, requester, or notes..."
              prefix={<FileTextOutlined />}
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Select
              value={filterType}
              onChange={setFilterType}
              style={{ width: 160 }}
              options={[
                { label: 'All Types', value: 'ALL' },
                ...Object.entries(REQUEST_TYPE_LABELS).map(([key, val]) => ({
                  label: val.label,
                  value: key,
                })),
              ]}
            />
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 160 }}
              options={[
                { label: 'All Status', value: 'ALL' },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Approved', value: 'APPROVED' },
                { label: 'Rejected', value: 'REJECTED' },
                { label: 'Delegated', value: 'DELEGATED' },
                { label: 'Expired', value: 'EXPIRED' },
              ]}
            />
          </Space>

          {/* Approvals Table */}
          {filteredApprovals.length > 0 ? (
            <Table
              columns={columns}
              dataSource={filteredApprovals}
              rowKey="id"
              loading={isLoading}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1200 }}
            />
          ) : (
            <Empty
              description={
                pendingApprovals.length === 0 ? 'No pending approvals' : 'No approvals match filters'
              }
              style={{ paddingTop: 24, paddingBottom: 24 }}
            />
          )}
        </Space>
      </Card>

      {/* Approval Modal */}
      <Modal
        title={`Approve Request - ${selectedApproval?.ncrNumber}`}
        open={approvalModalVisible}
        onOk={submitApproval}
        onCancel={() => setApprovalModalVisible(false)}
        loading={actionLoading}
        okText="Approve"
        okType="primary"
      >
        <Form form={approvalForm} layout="vertical">
          <Form.Item label="Request Type">
            <Tag color={REQUEST_TYPE_LABELS[selectedApproval?.requestType || 'STATE_TRANSITION'].color}>
              {REQUEST_TYPE_LABELS[selectedApproval?.requestType || 'STATE_TRANSITION'].label}
            </Tag>
          </Form.Item>
          <Form.Item label="NCR Number">
            <span>{selectedApproval?.ncrNumber}</span>
          </Form.Item>
          <Form.Item
            name="notes"
            label="Approval Notes (Optional)"
            rules={[
              {
                max: 500,
                message: 'Notes must be less than 500 characters',
              },
            ]}
          >
            <Input.TextArea
              placeholder="Add any notes or comments..."
              rows={4}
              showCount
              maxLength={500}
            />
          </Form.Item>
          <Form.Item
            name="acknowledge"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(new Error('You must acknowledge this approval')),
              },
            ]}
          >
            <Checkbox>I acknowledge this approval and its consequences</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title={`Reject Request - ${selectedApproval?.ncrNumber}`}
        open={rejectModalVisible}
        onOk={submitReject}
        onCancel={() => setRejectModalVisible(false)}
        loading={actionLoading}
        okText="Reject"
        okType="danger"
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item label="Request Type">
            <Tag color={REQUEST_TYPE_LABELS[selectedApproval?.requestType || 'STATE_TRANSITION'].color}>
              {REQUEST_TYPE_LABELS[selectedApproval?.requestType || 'STATE_TRANSITION'].label}
            </Tag>
          </Form.Item>
          <Form.Item
            name="rejectionReason"
            label="Rejection Reason"
            rules={[
              {
                required: true,
                message: 'Rejection reason is required',
              },
              {
                max: 500,
                message: 'Reason must be less than 500 characters',
              },
            ]}
          >
            <Input.TextArea
              placeholder="Explain why this approval is being rejected..."
              rows={4}
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delegate Modal */}
      <Modal
        title={`Delegate Request - ${selectedApproval?.ncrNumber}`}
        open={delegateModalVisible}
        onOk={submitDelegate}
        onCancel={() => setDelegateModalVisible(false)}
        loading={actionLoading}
        okText="Delegate"
      >
        <Form form={delegateForm} layout="vertical">
          <Form.Item label="Request Type">
            <Tag color={REQUEST_TYPE_LABELS[selectedApproval?.requestType || 'STATE_TRANSITION'].color}>
              {REQUEST_TYPE_LABELS[selectedApproval?.requestType || 'STATE_TRANSITION'].label}
            </Tag>
          </Form.Item>
          <Form.Item
            name="delegateTo"
            label="Delegate To (User ID)"
            rules={[
              {
                required: true,
                message: 'Please select a user to delegate to',
              },
            ]}
          >
            <Input placeholder="Enter user ID or email..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NCRApprovalDashboard;
