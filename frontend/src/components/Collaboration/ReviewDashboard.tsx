import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Progress,
  Typography,
  Input,
  Select,
  DatePicker,
  Modal,
  Form,
  Checkbox,
  Avatar,
  Tooltip,
  Badge,
  Empty,
  message,
  Statistic,
  Row,
  Col,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  ReviewAssignment,
  ReviewAssignmentInput,
  ReviewStatus,
  ReviewPriority,
} from '@/api/collaboration';
import { collaborationApi } from '@/api/collaboration';
import { useRealTimeCollaboration } from '@/hooks/useRealTimeCollaboration';

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ReviewDashboardProps {
  currentUserId: string;
  currentUserName: string;
  mode?: 'assigned' | 'all' | 'my-reviews';
  showStats?: boolean;
  className?: string;
}

interface ReviewFilters {
  status?: ReviewStatus;
  priority?: ReviewPriority;
  assigneeId?: string;
  documentType?: string;
  dueDateRange?: [string, string];
  search?: string;
}

interface ReviewStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  avgCompletionTime: number;
}

/**
 * Review Dashboard Component
 * Displays and manages document review assignments
 */
export const ReviewDashboard: React.FC<ReviewDashboardProps> = ({
  currentUserId,
  currentUserName,
  mode = 'assigned',
  showStats = true,
  className,
}) => {
  // State
  const [reviews, setReviews] = useState<ReviewAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReviewFilters>({});
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewAssignment | null>(null);

  // Form
  const [assignForm] = Form.useForm();

  // Real-time updates
  const { isConnected } = useRealTimeCollaboration({
    documentType: 'review',
    documentId: 'dashboard',
    autoConnect: true,
    onReviewUpdate: (event) => {
      if (event.action === 'created' || event.action === 'updated' || event.action === 'deleted') {
        loadReviews();
        loadStats();
      }
    },
  });

  // Load reviews
  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        ...filters,
        ...(mode === 'assigned' && { assigneeId: currentUserId }),
        ...(mode === 'my-reviews' && { assignerId: currentUserId }),
      };

      const response = await collaborationApi.getReviews(params);
      setReviews(response.data);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load reviews';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [filters, mode, currentUserId]);

  // Load statistics
  const loadStats = useCallback(async () => {
    if (!showStats) return;

    try {
      const params = {
        ...(mode === 'assigned' && { assigneeId: currentUserId }),
        ...(mode === 'my-reviews' && { assignerId: currentUserId }),
      };

      const response = await collaborationApi.getReviewStats(params);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load review stats:', error);
    }
  }, [showStats, mode, currentUserId]);

  // Initial load
  useEffect(() => {
    loadReviews();
    loadStats();
  }, [loadReviews, loadStats]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<ReviewFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Handle review assignment
  const handleAssignReview = useCallback(async (values: any) => {
    try {
      const assignmentData: ReviewAssignmentInput = {
        documentType: values.documentType,
        documentId: values.documentId,
        assigneeId: values.assigneeId,
        assignerId: currentUserId,
        deadline: values.deadline?.toISOString(),
        priority: values.priority,
        reviewChecklist: values.checklist || [],
        instructions: values.instructions,
      };

      await collaborationApi.assignReview(assignmentData);
      message.success('Review assigned successfully');
      setShowAssignModal(false);
      assignForm.resetFields();
      loadReviews();
      loadStats();
    } catch (error: any) {
      message.error(error.message || 'Failed to assign review');
    }
  }, [currentUserId, assignForm, loadReviews, loadStats]);

  // Handle review completion
  const handleCompleteReview = useCallback(async (reviewId: string) => {
    try {
      await collaborationApi.completeReview(reviewId, {
        notes: 'Review completed via dashboard',
      });
      message.success('Review marked as completed');
      loadReviews();
      loadStats();
    } catch (error: any) {
      message.error(error.message || 'Failed to complete review');
    }
  }, [loadReviews, loadStats]);

  // Handle review details view
  const handleViewReview = useCallback((review: ReviewAssignment) => {
    setSelectedReview(review);
  }, []);

  // Status color mapping
  const statusColors: Record<ReviewStatus, string> = {
    PENDING: 'orange',
    IN_PROGRESS: 'blue',
    COMPLETED: 'green',
    REJECTED: 'red',
    CANCELLED: 'gray',
  };

  // Priority color mapping
  const priorityColors: Record<ReviewPriority, string> = {
    LOW: 'green',
    MEDIUM: 'orange',
    HIGH: 'red',
    URGENT: 'purple',
  };

  // Table columns
  const columns: ColumnsType<ReviewAssignment> = [
    {
      title: 'Document',
      key: 'document',
      render: (_, record) => (
        <Space>
          <FileTextOutlined />
          <div>
            <Text strong>{record.documentTitle || `${record.documentType} #${record.documentId}`}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.documentType}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Assignee',
      key: 'assignee',
      render: (_, record) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />}>
            {record.assigneeName?.[0]?.toUpperCase()}
          </Avatar>
          <Text>{record.assigneeName}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: ReviewStatus) => (
        <Tag color={statusColors[status]}>{status.replace('_', ' ')}</Tag>
      ),
      filters: [
        { text: 'Pending', value: 'PENDING' },
        { text: 'In Progress', value: 'IN_PROGRESS' },
        { text: 'Completed', value: 'COMPLETED' },
        { text: 'Rejected', value: 'REJECTED' },
        { text: 'Cancelled', value: 'CANCELLED' },
      ],
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: ReviewPriority) => (
        <Tag color={priorityColors[priority]}>{priority}</Tag>
      ),
      filters: [
        { text: 'Low', value: 'LOW' },
        { text: 'Medium', value: 'MEDIUM' },
        { text: 'High', value: 'HIGH' },
        { text: 'Urgent', value: 'URGENT' },
      ],
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (_, record) => {
        const progress = record.progress || 0;
        return (
          <div style={{ width: '80px' }}>
            <Progress
              percent={Math.round(progress * 100)}
              size="small"
              status={record.status === 'COMPLETED' ? 'success' : 'active'}
            />
          </div>
        );
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (deadline: string) => {
        if (!deadline) return <Text type="secondary">No deadline</Text>;

        const dueDate = new Date(deadline);
        const isOverdue = dueDate < new Date();
        const timeFromNow = formatDistanceToNow(dueDate, { addSuffix: true });

        return (
          <Tooltip title={dueDate.toLocaleString()}>
            <Space>
              <CalendarOutlined />
              <Text type={isOverdue ? 'danger' : 'secondary'}>
                {timeFromNow}
              </Text>
              {isOverdue && <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            </Space>
          </Tooltip>
        );
      },
      sorter: (a, b) => new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewReview(record)}
            />
          </Tooltip>

          {record.status !== 'COMPLETED' && record.assigneeId === currentUserId && (
            <Tooltip title="Mark Complete">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleCompleteReview(record.id)}
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // Tab items for different views
  const tabItems = [
    {
      key: 'assigned',
      label: `Assigned to Me (${stats?.pending || 0})`,
      children: null,
    },
    {
      key: 'all',
      label: 'All Reviews',
      children: null,
    },
    {
      key: 'my-reviews',
      label: 'Reviews I Created',
      children: null,
    },
  ];

  return (
    <div className={className}>
      {/* Statistics Cards */}
      {showStats && stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Total Reviews"
                value={stats.total}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Pending"
                value={stats.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Completed"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small">
              <Statistic
                title="Overdue"
                value={stats.overdue}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Content */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                Review Dashboard
              </Title>
              {isConnected && (
                <Badge status="success" text="Live" />
              )}
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAssignModal(true)}
            >
              Assign Review
            </Button>
          </div>
        }
      >
        {/* Filters */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Search
            placeholder="Search reviews..."
            style={{ width: '250px' }}
            onSearch={(value) => handleFilterChange({ search: value || undefined })}
            allowClear
          />

          <Select
            placeholder="Status"
            style={{ width: '120px' }}
            allowClear
            onChange={(value) => handleFilterChange({ status: value })}
          >
            <Option value="PENDING">Pending</Option>
            <Option value="IN_PROGRESS">In Progress</Option>
            <Option value="COMPLETED">Completed</Option>
            <Option value="REJECTED">Rejected</Option>
            <Option value="CANCELLED">Cancelled</Option>
          </Select>

          <Select
            placeholder="Priority"
            style={{ width: '120px' }}
            allowClear
            onChange={(value) => handleFilterChange({ priority: value })}
          >
            <Option value="LOW">Low</Option>
            <Option value="MEDIUM">Medium</Option>
            <Option value="HIGH">High</Option>
            <Option value="URGENT">Urgent</Option>
          </Select>

          <RangePicker
            placeholder={['Start Date', 'End Date']}
            onChange={(dates) => {
              const range = dates ? [dates[0]?.toISOString(), dates[1]?.toISOString()] as [string, string] : undefined;
              handleFilterChange({ dueDateRange: range });
            }}
          />
        </div>

        {/* Reviews Table */}
        <Table
          columns={columns}
          dataSource={reviews}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} reviews`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Assign Review Modal */}
      <Modal
        title="Assign Review"
        open={showAssignModal}
        onCancel={() => {
          setShowAssignModal(false);
          assignForm.resetFields();
        }}
        onOk={() => assignForm.submit()}
        width={600}
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={handleAssignReview}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="documentType"
                label="Document Type"
                rules={[{ required: true, message: 'Please select document type' }]}
              >
                <Select placeholder="Select document type">
                  <Option value="work-instruction">Work Instruction</Option>
                  <Option value="sop">SOP</Option>
                  <Option value="setup-sheet">Setup Sheet</Option>
                  <Option value="inspection-plan">Inspection Plan</Option>
                  <Option value="tool-drawing">Tool Drawing</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="documentId"
                label="Document ID"
                rules={[{ required: true, message: 'Please enter document ID' }]}
              >
                <Input placeholder="Enter document ID" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assigneeId"
                label="Assignee"
                rules={[{ required: true, message: 'Please select assignee' }]}
              >
                <Select placeholder="Select reviewer">
                  {/* This would be populated with actual users */}
                  <Option value="user1">John Doe</Option>
                  <Option value="user2">Jane Smith</Option>
                  <Option value="user3">Bob Johnson</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true, message: 'Please select priority' }]}
              >
                <Select placeholder="Select priority">
                  <Option value="LOW">Low</Option>
                  <Option value="MEDIUM">Medium</Option>
                  <Option value="HIGH">High</Option>
                  <Option value="URGENT">Urgent</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="deadline"
            label="Deadline"
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="Select deadline"
            />
          </Form.Item>

          <Form.Item
            name="checklist"
            label="Review Checklist"
          >
            <Checkbox.Group
              options={[
                { label: 'Accuracy of content', value: 'accuracy' },
                { label: 'Completeness of information', value: 'completeness' },
                { label: 'Compliance with standards', value: 'compliance' },
                { label: 'Language and clarity', value: 'language' },
                { label: 'Technical correctness', value: 'technical' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="instructions"
            label="Review Instructions"
          >
            <Input.TextArea
              rows={3}
              placeholder="Special instructions for the reviewer..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Review Details Modal */}
      <Modal
        title="Review Details"
        open={!!selectedReview}
        onCancel={() => setSelectedReview(null)}
        footer={null}
        width={700}
      >
        {selectedReview && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Document:</Text>
                  <div>{selectedReview.documentTitle || `${selectedReview.documentType} #${selectedReview.documentId}`}</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Status:</Text>
                  <div>
                    <Tag color={statusColors[selectedReview.status]}>
                      {selectedReview.status.replace('_', ' ')}
                    </Tag>
                  </div>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Assignee:</Text>
                  <div>{selectedReview.assigneeName}</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: '16px' }}>
                  <Text strong>Priority:</Text>
                  <div>
                    <Tag color={priorityColors[selectedReview.priority]}>
                      {selectedReview.priority}
                    </Tag>
                  </div>
                </div>
              </Col>
            </Row>

            {selectedReview.deadline && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Deadline:</Text>
                <div>{new Date(selectedReview.deadline).toLocaleString()}</div>
              </div>
            )}

            {selectedReview.instructions && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Instructions:</Text>
                <div>{selectedReview.instructions}</div>
              </div>
            )}

            {selectedReview.reviewChecklist && selectedReview.reviewChecklist.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Checklist:</Text>
                <div>
                  {selectedReview.reviewChecklist.map((item, index) => (
                    <div key={index}>• {item}</div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <Text strong>Progress:</Text>
              <Progress
                percent={Math.round((selectedReview.progress || 0) * 100)}
                status={selectedReview.status === 'COMPLETED' ? 'success' : 'active'}
              />
            </div>

            {selectedReview.completionNotes && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>Completion Notes:</Text>
                <div>{selectedReview.completionNotes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReviewDashboard;