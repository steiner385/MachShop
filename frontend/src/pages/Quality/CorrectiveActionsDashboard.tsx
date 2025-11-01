/**
 * CorrectiveActions Dashboard - Issue #56 Phase 2
 *
 * Displays CAPA tracking with Kanban board workflow visualization
 * Shows lifecycle progression: OPEN → IN_PROGRESS → IMPLEMENTED → VERIFIED
 */

import React, { useState, useEffect } from 'react';
import {
  Page,
  PageHeader,
  PageContent,
  Button,
  Card,
  Row,
  Col,
  Tag,
  Statistic,
  Empty,
  Spin,
  Space,
  Tooltip,
  Badge,
  Progress,
  Dropdown,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  message,
} from '@/components/ui';
import {
  PlusOutlined,
  FilterOutlined,
  RefreshOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AlertCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isBetween from 'dayjs/plugin/isBetween';
import styled from 'styled-components';

dayjs.extend(relativeTime);
dayjs.extend(isBetween);

// Types
interface CorrectiveAction {
  id: string;
  caNumber: string;
  title: string;
  description: string;
  status: string;
  priority?: string;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  targetDate: string;
  implementedDate?: string;
  verifiedDate?: string;
  isEffective?: boolean;
  source?: string;
  sourceReference?: string;
  createdAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
}

interface DashboardMetrics {
  total: number;
  byStatus: Record<string, number>;
  overdue: number;
  approachingDeadline: number;
  averageResolutionDays: number;
  effectivenessRate: number;
}

// Styled Components
const KanbanBoard = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
`;

const KanbanColumn = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
  font-weight: 600;

  .count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: #e6e6e6;
    font-size: 12px;
    margin-left: 8px;
  }
`;

const CACard = styled.div<{ overdue?: boolean; approaching?: boolean }>`
  background-color: white;
  border: 1px solid ${props => props.overdue ? '#ff4d4f' : props.approaching ? '#faad14' : '#d9d9d9'};
  border-left: 4px solid ${props => props.overdue ? '#ff4d4f' : props.approaching ? '#faad14' : '#1890ff'};
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }

  .ca-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;

    .ca-number {
      font-weight: 600;
      color: #1890ff;
      font-size: 12px;
    }

    .priority-tag {
      font-size: 11px;
    }
  }

  .ca-title {
    font-weight: 500;
    color: #262626;
    font-size: 13px;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .ca-meta {
    font-size: 12px;
    color: #8c8c8c;
    margin-bottom: 8px;

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 4px;
    }
  }

  .ca-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
    font-size: 12px;

    .assignee {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #595959;
    }

    .days-left {
      color: ${props => props.overdue ? '#ff4d4f' : props.approaching ? '#faad14' : '#52c41a'};
      font-weight: 500;
    }
  }
`;

const MetricsGrid = styled(Row)`
  margin-bottom: 24px;
`;

const StatusColors: Record<string, string> = {
  OPEN: '#1890ff',
  IN_PROGRESS: '#faad14',
  IMPLEMENTED: '#52c41a',
  VERIFICATION_IN_PROGRESS: '#1890ff',
  VERIFIED_EFFECTIVE: '#52c41a',
  VERIFIED_INEFFECTIVE: '#ff4d4f',
  CLOSED: '#8c8c8c',
};

const StatusIcons: Record<string, React.ReactNode> = {
  OPEN: <AlertCircleOutlined />,
  IN_PROGRESS: <ClockCircleOutlined />,
  IMPLEMENTED: <CheckCircleOutlined />,
  VERIFICATION_IN_PROGRESS: <ClockCircleOutlined />,
  VERIFIED_EFFECTIVE: <CheckCircleOutlined />,
  VERIFIED_INEFFECTIVE: <CloseCircleOutlined />,
  CLOSED: <CheckCircleOutlined />,
};

const CorrectiveActionsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // State
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Load dashboard data
  const loadDashboard = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API calls
      // For now, show mock data that demonstrates the Phase 2 features

      const mockMetrics: DashboardMetrics = {
        total: 12,
        byStatus: {
          OPEN: 3,
          IN_PROGRESS: 4,
          IMPLEMENTED: 3,
          VERIFICATION_IN_PROGRESS: 2,
          VERIFIED_EFFECTIVE: 0,
          VERIFIED_INEFFECTIVE: 0,
        },
        overdue: 1,
        approachingDeadline: 3,
        averageResolutionDays: 14,
        effectivenessRate: 0,
      };

      const mockActions: CorrectiveAction[] = [
        // OPEN Status
        {
          id: '1',
          caNumber: 'CA-2025-0001',
          title: 'Implement QC checkpoints on Line 3',
          description: 'Add visual inspection checkpoints to prevent defects',
          status: 'OPEN',
          priority: 'HIGH',
          assignedTo: {
            id: 'user1',
            firstName: 'John',
            lastName: 'Smith',
            email: 'john.smith@example.com',
          },
          targetDate: dayjs().add(5, 'days').toISOString(),
          createdAt: dayjs().subtract(2, 'days').toISOString(),
          source: 'NCR',
          sourceReference: 'NCR-2025-001',
        },
        {
          id: '2',
          caNumber: 'CA-2025-0002',
          title: 'Update maintenance schedule for equipment A',
          description: 'Based on failure pattern analysis',
          status: 'OPEN',
          priority: 'MEDIUM',
          assignedTo: {
            id: 'user2',
            firstName: 'Sarah',
            lastName: 'Johnson',
            email: 'sarah.johnson@example.com',
          },
          targetDate: dayjs().subtract(2, 'days').toISOString(),
          createdAt: dayjs().subtract(5, 'days').toISOString(),
          source: 'PREVENTIVE',
        },

        // IN_PROGRESS Status
        {
          id: '3',
          caNumber: 'CA-2025-0003',
          title: 'Retrain operators on process protocol',
          description: 'Update training materials and conduct sessions',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          assignedTo: {
            id: 'user3',
            firstName: 'Mike',
            lastName: 'Davis',
            email: 'mike.davis@example.com',
          },
          targetDate: dayjs().add(3, 'days').toISOString(),
          createdAt: dayjs().subtract(3, 'days').toISOString(),
        },
        {
          id: '4',
          caNumber: 'CA-2025-0004',
          title: 'Upgrade control system firmware',
          description: 'Install latest version with bug fixes',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          assignedTo: {
            id: 'user1',
            firstName: 'John',
            lastName: 'Smith',
            email: 'john.smith@example.com',
          },
          targetDate: dayjs().add(7, 'days').toISOString(),
          createdAt: dayjs().subtract(4, 'days').toISOString(),
        },

        // IMPLEMENTED Status (Awaiting Verification)
        {
          id: '5',
          caNumber: 'CA-2025-0005',
          title: 'Install additional pressure relief valve',
          description: 'Enhance system safety margins',
          status: 'IMPLEMENTED',
          priority: 'HIGH',
          assignedTo: {
            id: 'user2',
            firstName: 'Sarah',
            lastName: 'Johnson',
            email: 'sarah.johnson@example.com',
          },
          implementedDate: dayjs().subtract(1, 'days').toISOString(),
          targetDate: dayjs().subtract(3, 'days').toISOString(),
          createdAt: dayjs().subtract(10, 'days').toISOString(),
        },

        // VERIFICATION_IN_PROGRESS Status
        {
          id: '6',
          caNumber: 'CA-2025-0006',
          title: 'Implement waste reduction program',
          description: 'Reduce material waste by 20%',
          status: 'VERIFICATION_IN_PROGRESS',
          priority: 'MEDIUM',
          assignedTo: {
            id: 'user3',
            firstName: 'Mike',
            lastName: 'Davis',
            email: 'mike.davis@example.com',
          },
          implementedDate: dayjs().subtract(5, 'days').toISOString(),
          targetDate: dayjs().subtract(8, 'days').toISOString(),
          createdAt: dayjs().subtract(15, 'days').toISOString(),
        },
      ];

      setMetrics(mockMetrics);
      setActions(mockActions);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      message.error('Failed to load CAPA dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Helper functions
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      OPEN: 'Open',
      IN_PROGRESS: 'In Progress',
      IMPLEMENTED: 'Implemented',
      VERIFICATION_IN_PROGRESS: 'Verifying',
      VERIFIED_EFFECTIVE: 'Verified - Effective',
      VERIFIED_INEFFECTIVE: 'Verified - Ineffective',
      CLOSED: 'Closed',
    };
    return labels[status] || status;
  };

  const getDaysUntilTarget = (targetDate: string): number => {
    return dayjs(targetDate).diff(dayjs(), 'days');
  };

  const isOverdue = (targetDate: string, implementedDate?: string): boolean => {
    const checkDate = implementedDate ? dayjs(implementedDate) : dayjs();
    return checkDate.isAfter(dayjs(targetDate));
  };

  const isApproachingDeadline = (targetDate: string, implementedDate?: string): boolean => {
    if (implementedDate) return false;
    const daysLeft = getDaysUntilTarget(targetDate);
    return daysLeft > 0 && daysLeft <= 7;
  };

  const actionsByStatus = (status: string): CorrectiveAction[] => {
    return actions.filter(action => action.status === status);
  };

  const handleCAClick = (id: string) => {
    navigate(`/quality/corrective-actions/${id}`);
  };

  const handleCreateCA = () => {
    setCreateModalVisible(true);
  };

  const handleCreateSubmit = async (values: any) => {
    try {
      // TODO: Call API to create CA
      message.success(`CAPA ${values.caNumber} created successfully`);
      setCreateModalVisible(false);
      form.resetFields();
      loadDashboard();
    } catch (error) {
      message.error('Failed to create CAPA');
    }
  };

  // Render CA Card
  const renderCACard = (action: CorrectiveAction) => {
    const overdue = isOverdue(action.targetDate, action.implementedDate);
    const approaching = isApproachingDeadline(action.targetDate, action.implementedDate);
    const daysLeft = getDaysUntilTarget(action.targetDate);

    return (
      <CACard
        key={action.id}
        overdue={overdue}
        approaching={approaching}
        onClick={() => handleCAClick(action.id)}
      >
        <div className="ca-header">
          <span className="ca-number">{action.caNumber}</span>
          {action.priority && (
            <Tag
              color={action.priority === 'HIGH' ? 'red' : 'orange'}
              className="priority-tag"
            >
              {action.priority}
            </Tag>
          )}
        </div>

        <div className="ca-title">{action.title}</div>

        <div className="ca-meta">
          {action.source && (
            <div className="meta-item">
              <FileTextOutlined /> {action.source}
            </div>
          )}
          <div className="meta-item">
            <CalendarOutlined />
            {overdue ? (
              <span style={{ color: '#ff4d4f', fontWeight: 500 }}>
                Overdue {Math.abs(daysLeft)} days
              </span>
            ) : approaching ? (
              <span style={{ color: '#faad14', fontWeight: 500 }}>
                {daysLeft} days left
              </span>
            ) : (
              <span>{daysLeft} days left</span>
            )}
          </div>
        </div>

        <div className="ca-footer">
          <div className="assignee">
            <UserOutlined />
            {action.assignedTo.firstName} {action.assignedTo.lastName.charAt(0)}.
          </div>
          <div className="days-left">
            {dayjs(action.targetDate).format('MMM D')}
          </div>
        </div>
      </CACard>
    );
  };

  // Render Kanban Column
  const renderKanbanColumn = (status: string, color: string) => {
    const columnActions = actionsByStatus(status);

    return (
      <KanbanColumn key={status}>
        <ColumnHeader>
          <span style={{ color }}>
            {StatusIcons[status]} {getStatusLabel(status)}
          </span>
          <span className="count">{columnActions.length}</span>
        </ColumnHeader>

        {columnActions.length > 0 ? (
          <div>
            {columnActions.map(action => renderCACard(action))}
          </div>
        ) : (
          <Empty
            description="No actions"
            style={{ marginTop: 20, marginBottom: 20 }}
          />
        )}
      </KanbanColumn>
    );
  };

  return (
    <Page>
      <PageHeader
        title="Corrective Actions Dashboard"
        subtitle="Phase 2: Lifecycle Management & Tracking"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateCA}
            >
              New CA
            </Button>
            <Button
              icon={<RefreshOutlined />}
              onClick={loadDashboard}
              loading={loading}
            />
          </Space>
        }
      />

      <PageContent>
        {/* Metrics Overview */}
        {metrics && !loading && (
          <MetricsGrid gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total CAs"
                  value={metrics.total}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Overdue"
                  value={metrics.overdue}
                  valueStyle={{ color: metrics.overdue > 0 ? '#ff4d4f' : '#52c41a' }}
                  prefix={metrics.overdue > 0 ? <AlertCircleOutlined /> : undefined}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Approaching Deadline"
                  value={metrics.approachingDeadline}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Avg Resolution"
                  value={metrics.averageResolutionDays}
                  suffix="days"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          </MetricsGrid>
        )}

        {/* Kanban Board */}
        <Spin spinning={loading}>
          <KanbanBoard>
            {renderKanbanColumn('OPEN', StatusColors.OPEN)}
            {renderKanbanColumn('IN_PROGRESS', StatusColors.IN_PROGRESS)}
            {renderKanbanColumn('IMPLEMENTED', StatusColors.IMPLEMENTED)}
            {renderKanbanColumn('VERIFICATION_IN_PROGRESS', StatusColors.VERIFICATION_IN_PROGRESS)}
            {renderKanbanColumn('VERIFIED_EFFECTIVE', StatusColors.VERIFIED_EFFECTIVE)}
            {renderKanbanColumn('VERIFIED_INEFFECTIVE', StatusColors.VERIFIED_INEFFECTIVE)}
          </KanbanBoard>
        </Spin>
      </PageContent>

      {/* Create CA Modal */}
      <Modal
        title="Create New Corrective Action"
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSubmit}
        >
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Please enter title' }]}
          >
            <Input placeholder="CA title" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item
            label="Assign To"
            name="assigneeId"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select assignee">
              <Select.Option value="user1">John Smith</Select.Option>
              <Select.Option value="user2">Sarah Johnson</Select.Option>
              <Select.Option value="user3">Mike Davis</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Target Date"
            name="targetDate"
            rules={[{ required: true }]}
          >
            <DatePicker />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Create CA
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Page>
  );
};

export default CorrectiveActionsDashboard;
