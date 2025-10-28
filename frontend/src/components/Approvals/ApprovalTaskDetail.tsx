/**
 * ✅ GITHUB ISSUE #21: Advanced Multi-Stage Approval Workflow Engine
 * Approval Task Detail Component
 *
 * Displays comprehensive details for a specific approval task including:
 * - Task information and context
 * - Related entity details (work instruction, FAI report, etc.)
 * - Workflow progress and stage information
 * - Approval history and timeline
 * - Action buttons for approve/reject/delegate
 * - Electronic signature integration
 * - Comments and collaboration features
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Button,
  Space,
  Avatar,
  Timeline,
  Divider,
  Tooltip,
  Progress,
  Alert,
  Tabs,
  Form,
  Input,
  Select,
  message,
  Modal,
  Badge,
  Spin,
  Typography,
  Collapse,
  List,
  Image,
  Steps
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  FileTextOutlined,
  SendOutlined,
  EditOutlined,
  EyeOutlined,
  DownloadOutlined,
  BellOutlined,
  CalendarOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  LinkOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { RejectModal } from './RejectModal';
import { WorkflowStatus } from './WorkflowStatus';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;
const { Step } = Steps;

/**
 * Task Detail Interface (extended from ApprovalTask)
 */
interface TaskDetail {
  id: string;
  assignmentId: string;
  workflowInstanceId: string;
  stageNumber: number;
  stageName: string;
  stageDescription?: string;
  entityType: string;
  entityId: string;
  taskTitle: string;
  taskDescription?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  createdAt: string;
  dueDate?: string;
  assignedToId: string;
  assignedToName?: string;
  assignedToRole?: string;
  assignmentType: string;
  escalationLevel: number;
  reminderCount: number;
  lastReminderSent?: string;
  isDelegated: boolean;
  delegatedFromId?: string;
  delegationReason?: string;
  delegationExpiry?: string;
  requiresSignature: boolean;
  signatureType?: string;
  workflowInstance: {
    id: string;
    workflowId: string;
    entityType: string;
    entityId: string;
    status: string;
    priority: string;
    currentStageNumber?: number;
    deadline?: string;
    progressPercentage: number;
    startedAt: string;
    completedAt?: string;
    createdBy: {
      id: string;
      name: string;
      email?: string;
    };
    stageInstances: Array<{
      id: string;
      stageNumber: number;
      stageName: string;
      status: string;
      outcome?: string;
      startedAt?: string;
      completedAt?: string;
      assignments: Array<{
        id: string;
        assignedToName: string;
        assignmentType: string;
        action?: string;
        actionTakenAt?: string;
        comments?: string;
      }>;
    }>;
  };
  relatedEntity?: {
    id: string;
    title: string;
    description?: string;
    version?: string;
    status: string;
    createdBy?: {
      name: string;
      email?: string;
    };
    updatedAt: string;
    tags?: string[];
    attachments?: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
    }>;
  };
}

/**
 * Approval Task Detail Props
 */
interface ApprovalTaskDetailProps {
  /** Task ID to display */
  taskId: string;
  /** Assignment ID (alternative identifier) */
  assignmentId?: string;
  /** Callback when task is updated */
  onTaskUpdate?: (task: TaskDetail) => void;
  /** Show in modal mode */
  modal?: boolean;
  /** Modal visibility (when in modal mode) */
  modalVisible?: boolean;
  /** Modal close callback */
  onModalClose?: () => void;
}

/**
 * Approval Task Detail Component
 */
export const ApprovalTaskDetail: React.FC<ApprovalTaskDetailProps> = ({
  taskId,
  assignmentId,
  onTaskUpdate,
  modal = false,
  modalVisible = true,
  onModalClose
}) => {
  // State management
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [delegationModalVisible, setDelegationModalVisible] = useState(false);
  const [commentForm] = Form.useForm();

  /**
   * Load task details
   */
  const loadTaskDetails = async () => {
    try {
      setLoading(true);

      const identifier = taskId || assignmentId;
      if (!identifier) {
        throw new Error('Task ID or Assignment ID is required');
      }

      // Load task details from assignment endpoint
      const response = await fetch(`/api/v1/workflows/tasks/${identifier}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load task details');
      }

      const taskData = await response.json();

      // Load workflow instance details
      const workflowResponse = await fetch(
        `/api/v1/workflows/instances/${taskData.workflowInstanceId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (workflowResponse.ok) {
        const workflowData = await workflowResponse.json();
        taskData.workflowInstance = workflowData;
      }

      // Load related entity details based on entity type
      if (taskData.entityType === 'WORK_INSTRUCTION') {
        const entityResponse = await fetch(
          `/api/v1/work-instructions/${taskData.entityId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (entityResponse.ok) {
          const entityData = await entityResponse.json();
          taskData.relatedEntity = entityData;
        }
      }

      setTask(taskData);
      onTaskUpdate?.(taskData);
    } catch (error: any) {
      message.error(error.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId || assignmentId) {
      loadTaskDetails();
    }
  }, [taskId, assignmentId]);

  /**
   * Handle task approval
   */
  const handleApprove = async () => {
    if (!task) return;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/v1/workflows/tasks/${task.assignmentId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comments: 'Approved from task detail view'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to approve task');
      }

      message.success('Task approved successfully');
      loadTaskDetails();
    } catch (error: any) {
      message.error(error.message || 'Failed to approve task');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Handle task rejection
   */
  const handleReject = async (reason: string, comments: string) => {
    if (!task) return;

    try {
      const response = await fetch(`/api/v1/workflows/tasks/${task.assignmentId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comments
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reject task');
      }

      message.success('Task rejected successfully');
      loadTaskDetails();
    } catch (error: any) {
      message.error(error.message || 'Failed to reject task');
      throw error;
    }
  };

  /**
   * Handle task delegation
   */
  const handleDelegate = async (values: any) => {
    if (!task) return;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/v1/workflows/tasks/${task.assignmentId}/delegate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          delegateeId: values.delegateeId,
          reason: values.reason,
          expiry: values.expiry ? dayjs(values.expiry).toISOString() : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delegate task');
      }

      message.success('Task delegated successfully');
      setDelegationModalVisible(false);
      loadTaskDetails();
    } catch (error: any) {
      message.error(error.message || 'Failed to delegate task');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Get priority color and icon
   */
  const getPriorityConfig = (priority: string) => {
    const configs = {
      CRITICAL: { color: 'red', icon: <ExclamationCircleOutlined /> },
      HIGH: { color: 'orange', icon: <ExclamationCircleOutlined /> },
      MEDIUM: { color: 'blue', icon: <InfoCircleOutlined /> },
      LOW: { color: 'green', icon: <InfoCircleOutlined /> }
    };
    return configs[priority as keyof typeof configs] || configs.MEDIUM;
  };

  /**
   * Check if task is overdue
   */
  const isOverdue = (): boolean => {
    return task?.dueDate ? dayjs().isAfter(dayjs(task.dueDate)) : false;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading task details...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <Alert
        message="Task Not Found"
        description="The requested approval task could not be found."
        type="error"
        showIcon
      />
    );
  }

  const priorityConfig = getPriorityConfig(task.priority);

  /**
   * Task Overview Card
   */
  const taskOverviewCard = (
    <Card
      title={
        <Space>
          <Avatar icon={<FileTextOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <span>{task.taskTitle}</span>
          <Tag color={priorityConfig.color} icon={priorityConfig.icon}>
            {task.priority}
          </Tag>
          {isOverdue() && (
            <Tag color="red" icon={<ClockCircleOutlined />}>
              Overdue
            </Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={actionLoading}
            onClick={handleApprove}
            size="large"
          >
            Approve
          </Button>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => setRejectModalVisible(true)}
            size="large"
          >
            Reject
          </Button>
          <Button
            icon={<SendOutlined />}
            onClick={() => setDelegationModalVisible(true)}
          >
            Delegate
          </Button>
        </Space>
      }
    >
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Descriptions title="Task Information" bordered size="small">
            <Descriptions.Item label="Stage" span={3}>
              <Space>
                <Badge count={task.stageNumber} style={{ backgroundColor: '#52c41a' }} />
                <span>{task.stageName}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={3}>
              {task.taskDescription || task.stageDescription || 'No description provided'}
            </Descriptions.Item>
            <Descriptions.Item label="Entity Type">
              <Tag color="blue">{task.entityType.replace('_', ' ')}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Assignment Type">
              {task.assignmentType}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {dayjs(task.createdAt).format('MMM D, YYYY h:mm A')}
            </Descriptions.Item>
            <Descriptions.Item label="Due Date">
              {task.dueDate ? (
                <Space>
                  <span>{dayjs(task.dueDate).format('MMM D, YYYY h:mm A')}</span>
                  <Text type={isOverdue() ? 'danger' : 'secondary'}>
                    ({dayjs(task.dueDate).fromNow()})
                  </Text>
                </Space>
              ) : (
                <Text type="secondary">No deadline</Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Col>
        <Col span={12}>
          <Descriptions title="Assignment Details" bordered size="small">
            <Descriptions.Item label="Assigned To" span={3}>
              <Space>
                <Avatar size="small">{task.assignedToName?.charAt(0) || 'U'}</Avatar>
                <span>{task.assignedToName || 'Unknown'}</span>
                {task.assignedToRole && (
                  <Tag color="purple">{task.assignedToRole}</Tag>
                )}
              </Space>
            </Descriptions.Item>
            {task.isDelegated && (
              <>
                <Descriptions.Item label="Delegation Reason" span={3}>
                  {task.delegationReason}
                </Descriptions.Item>
                <Descriptions.Item label="Delegation Expiry">
                  {task.delegationExpiry ?
                    dayjs(task.delegationExpiry).format('MMM D, YYYY') : 'No expiry'}
                </Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="Escalation Level">
              <Badge count={task.escalationLevel} style={{ backgroundColor: '#fa541c' }} />
            </Descriptions.Item>
            <Descriptions.Item label="Reminders Sent">
              {task.reminderCount}
            </Descriptions.Item>
            {task.requiresSignature && (
              <Descriptions.Item label="Signature Required" span={3}>
                <Space>
                  <SafetyCertificateOutlined style={{ color: '#fa8c16' }} />
                  <span>Electronic signature required</span>
                  {task.signatureType && (
                    <Tag color="orange">{task.signatureType}</Tag>
                  )}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Col>
      </Row>
    </Card>
  );

  /**
   * Workflow Progress Card
   */
  const workflowProgressCard = (
    <Card
      title={
        <Space>
          <TeamOutlined />
          <span>Workflow Progress</span>
        </Space>
      }
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Overall Progress</Text>
            <Progress
              percent={task.workflowInstance.progressPercentage}
              status={isOverdue() ? 'exception' : 'active'}
              strokeColor={isOverdue() ? '#ff4d4f' : '#1890ff'}
            />
          </div>
        </Col>
        <Col span={24}>
          <Steps
            current={task.workflowInstance.currentStageNumber || 0}
            size="small"
            items={task.workflowInstance.stageInstances?.map(stage => ({
              title: stage.stageName,
              description: `Stage ${stage.stageNumber}`,
              status: stage.status === 'COMPLETED' ? 'finish' :
                      stage.status === 'ACTIVE' ? 'process' : 'wait'
            })) || []}
          />
        </Col>
      </Row>
    </Card>
  );

  /**
   * Related Entity Card
   */
  const relatedEntityCard = task.relatedEntity && (
    <Card
      title={
        <Space>
          <LinkOutlined />
          <span>Related {task.entityType.replace('_', ' ')}</span>
        </Space>
      }
      extra={
        <Button icon={<EyeOutlined />} type="link">
          View Details
        </Button>
      }
    >
      <Descriptions bordered size="small">
        <Descriptions.Item label="Title" span={3}>
          {task.relatedEntity.title}
        </Descriptions.Item>
        {task.relatedEntity.description && (
          <Descriptions.Item label="Description" span={3}>
            {task.relatedEntity.description}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Version">
          {task.relatedEntity.version || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color="blue">{task.relatedEntity.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Last Updated">
          {dayjs(task.relatedEntity.updatedAt).format('MMM D, YYYY')}
        </Descriptions.Item>
        {task.relatedEntity.createdBy && (
          <Descriptions.Item label="Created By" span={3}>
            <Space>
              <Avatar size="small">{task.relatedEntity.createdBy.name.charAt(0)}</Avatar>
              <span>{task.relatedEntity.createdBy.name}</span>
              {task.relatedEntity.createdBy.email && (
                <Text type="secondary">({task.relatedEntity.createdBy.email})</Text>
              )}
            </Space>
          </Descriptions.Item>
        )}
        {task.relatedEntity.tags && task.relatedEntity.tags.length > 0 && (
          <Descriptions.Item label="Tags" span={3}>
            <Space wrap>
              {task.relatedEntity.tags.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </Descriptions.Item>
        )}
      </Descriptions>

      {task.relatedEntity.attachments && task.relatedEntity.attachments.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Title level={5}>Attachments</Title>
          <List
            size="small"
            dataSource={task.relatedEntity.attachments}
            renderItem={attachment => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    icon={<DownloadOutlined />}
                    onClick={() => window.open(attachment.fileUrl, '_blank')}
                  >
                    Download
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined />}
                  title={attachment.fileName}
                  description={`${(attachment.fileSize / 1024).toFixed(1)} KB`}
                />
              </List.Item>
            )}
          />
        </div>
      )}
    </Card>
  );

  /**
   * Approval History
   */
  const approvalHistory = task.workflowInstance.stageInstances && (
    <Card
      title={
        <Space>
          <HistoryOutlined />
          <span>Approval History</span>
        </Space>
      }
    >
      <Timeline
        items={task.workflowInstance.stageInstances
          .filter(stage => stage.assignments.some(a => a.action))
          .map(stage => {
            const completedAssignment = stage.assignments.find(a => a.action);
            if (!completedAssignment) return null;

            return {
              color: completedAssignment.action === 'APPROVED' ? 'green' : 'red',
              children: (
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>
                    {stage.stageName}
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                    {completedAssignment.action} by {completedAssignment.assignedToName}
                  </div>
                  {completedAssignment.actionTakenAt && (
                    <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                      {dayjs(completedAssignment.actionTakenAt).format('MMM D, YYYY h:mm A')}
                    </div>
                  )}
                  {completedAssignment.comments && (
                    <div style={{
                      padding: 8,
                      background: '#f5f5f5',
                      borderRadius: 4,
                      fontSize: 12,
                      fontStyle: 'italic'
                    }}>
                      "{completedAssignment.comments}"
                    </div>
                  )}
                </div>
              )
            };
          })
          .filter(Boolean)}
      />
    </Card>
  );

  /**
   * Content tabs
   */
  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {taskOverviewCard}
          {workflowProgressCard}
        </Space>
      )
    },
    {
      key: 'entity',
      label: 'Related Entity',
      children: relatedEntityCard
    },
    {
      key: 'history',
      label: 'History',
      children: approvalHistory
    }
  ];

  const content = (
    <div style={{ minHeight: 400 }}>
      <Tabs defaultActiveKey="overview" items={tabItems} />

      {/* Reject Modal */}
      <RejectModal
        visible={rejectModalVisible}
        onClose={() => setRejectModalVisible(false)}
        onReject={handleReject}
        title="Task"
        itemIdentifier={task.taskTitle}
      />

      {/* Delegation Modal */}
      <Modal
        title="Delegate Task"
        open={delegationModalVisible}
        onCancel={() => setDelegationModalVisible(false)}
        onOk={() => {
          // TODO: Implement delegation form submission
          message.info('Delegation functionality coming soon');
        }}
        confirmLoading={actionLoading}
      >
        <Alert
          message="Delegation functionality is not yet implemented"
          type="info"
          style={{ marginBottom: 16 }}
        />
        <Form layout="vertical">
          <Form.Item label="Delegate To" name="delegateeId">
            <Select placeholder="Select a user to delegate to">
              {/* TODO: Populate with actual users */}
            </Select>
          </Form.Item>
          <Form.Item label="Reason" name="reason">
            <TextArea rows={4} placeholder="Explain why you're delegating this task..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );

  if (modal) {
    return (
      <Modal
        title={`Task: ${task.taskTitle}`}
        open={modalVisible}
        onCancel={onModalClose}
        width={1200}
        footer={null}
        destroyOnClose
      >
        {content}
      </Modal>
    );
  }

  return content;
};

export default ApprovalTaskDetail;