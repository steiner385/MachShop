/**
 * ✅ GITHUB ISSUE #21: Advanced Multi-Stage Approval Workflow Engine
 * Enhanced Workflow Progress Component
 *
 * Advanced workflow progress visualization with interactive features:
 * - Interactive workflow diagram with stage details
 * - Real-time progress tracking and updates
 * - Performance metrics and bottleneck identification
 * - Timeline visualization with detailed history
 * - Stage assignment management
 * - Escalation and notification tracking
 * - Parallel stage coordination display
 * - Conditional routing visualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Progress,
  Steps,
  Timeline,
  Tag,
  Avatar,
  Tooltip,
  Space,
  Button,
  Badge,
  Statistic,
  Alert,
  Collapse,
  Table,
  Descriptions,
  Divider,
  Typography,
  Select,
  Switch,
  Modal,
  message,
  Popover,
  Empty
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  TeamOutlined,
  WarningOutlined,
  TrophyOutlined,
  RocketOutlined,
  BugOutlined,
  EyeOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  SettingOutlined,
  BellOutlined,
  CalendarOutlined,
  LineChartOutlined,
  NodeIndexOutlined,
  BranchesOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(duration);
dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Panel } = Collapse;

/**
 * Enhanced Workflow Instance Interface
 */
interface WorkflowInstanceEnhanced {
  id: string;
  workflowId: string;
  workflowDefinition: {
    id: string;
    name: string;
    description?: string;
    workflowType: string;
    version: string;
    structure: {
      stages: Array<{
        stageNumber: number;
        stageName: string;
        description?: string;
        approvalType: string;
        minimumApprovals?: number;
        requiredRoles: string[];
        deadlineHours?: number;
        allowDelegation: boolean;
        requiresSignature: boolean;
      }>;
      connections: Array<{
        fromStage: number;
        toStage: number;
        condition?: string;
      }>;
    };
  };
  entityType: string;
  entityId: string;
  status: string;
  priority: string;
  impactLevel?: string;
  currentStageNumber?: number;
  progressPercentage: number;
  startedAt: string;
  completedAt?: string;
  deadline?: string;
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
    deadline?: string;
    notes?: string;
    assignments: Array<{
      id: string;
      assignedToId: string;
      assignedToName?: string;
      assignedToRole?: string;
      assignmentType: string;
      action?: string;
      actionTakenAt?: string;
      comments?: string;
      escalationLevel: number;
      isDelegated: boolean;
      delegatedFromId?: string;
    }>;
    approvalProgress: {
      total: number;
      completed: number;
      approved: number;
      rejected: number;
      pending: number;
      percentage: number;
    };
  }>;
  history: Array<{
    id: string;
    eventType: string;
    eventDescription: string;
    stageNumber?: number;
    fromStatus?: string;
    toStatus?: string;
    performedById: string;
    performedByName: string;
    performedByRole?: string;
    details?: Record<string, any>;
    occurredAt: string;
  }>;
  analytics?: {
    totalDurationHours: number;
    averageStageHours: number;
    bottlenecks: Array<{
      stageNumber: number;
      stageName: string;
      delayHours: number;
      reason: string;
    }>;
    performance: {
      onTime: boolean;
      efficiency: number;
      qualityScore: number;
    };
  };
}

/**
 * Enhanced Workflow Progress Props
 */
interface WorkflowProgressEnhancedProps {
  /** Workflow instance ID to display */
  workflowInstanceId: string;
  /** Show detailed analytics */
  showAnalytics?: boolean;
  /** Enable real-time updates */
  realTimeUpdates?: boolean;
  /** Update interval in seconds */
  refreshInterval?: number;
  /** Show in compact mode */
  compact?: boolean;
  /** Allow stage management actions */
  allowStageActions?: boolean;
  /** Show performance metrics */
  showPerformance?: boolean;
  /** Height for the workflow diagram */
  diagramHeight?: number;
}

/**
 * Enhanced Workflow Progress Component
 */
export const WorkflowProgressEnhanced: React.FC<WorkflowProgressEnhancedProps> = ({
  workflowInstanceId,
  showAnalytics = true,
  realTimeUpdates = true,
  refreshInterval = 30,
  compact = false,
  allowStageActions = false,
  showPerformance = true,
  diagramHeight = 400
}) => {
  // State management
  const [workflow, setWorkflow] = useState<WorkflowInstanceEnhanced | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagramExpanded, setDiagramExpanded] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'diagram' | 'timeline' | 'table'>('diagram');
  const [autoRefresh, setAutoRefresh] = useState(realTimeUpdates);

  /**
   * Load workflow data
   */
  const loadWorkflowData = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/v1/workflows/instances/${workflowInstanceId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load workflow data');
      }

      const data = await response.json();

      // Enhance with analytics if available
      if (showAnalytics) {
        try {
          const analyticsResponse = await fetch(
            `/api/v1/workflows/instances/${workflowInstanceId}/analytics`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            data.analytics = analyticsData;
          }
        } catch (error) {
          console.warn('Failed to load analytics data:', error);
        }
      }

      setWorkflow(data);
    } catch (error: any) {
      message.error(error.message || 'Failed to load workflow data');
    } finally {
      setLoading(false);
    }
  }, [workflowInstanceId, showAnalytics]);

  /**
   * Auto-refresh effect
   */
  useEffect(() => {
    loadWorkflowData();

    if (autoRefresh) {
      const interval = setInterval(loadWorkflowData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [loadWorkflowData, autoRefresh, refreshInterval]);

  /**
   * Get stage status configuration
   */
  const getStageStatusConfig = (status: string) => {
    const configs = {
      PENDING: { color: 'default', icon: <ClockCircleOutlined />, text: 'Pending' },
      ACTIVE: { color: 'processing', icon: <ClockCircleOutlined />, text: 'In Progress' },
      COMPLETED: { color: 'success', icon: <CheckCircleOutlined />, text: 'Completed' },
      REJECTED: { color: 'error', icon: <ExclamationCircleOutlined />, text: 'Rejected' },
      SKIPPED: { color: 'default', icon: <CheckCircleOutlined />, text: 'Skipped' }
    };
    return configs[status as keyof typeof configs] || configs.PENDING;
  };

  /**
   * Calculate stage performance
   */
  const getStagePerformance = (stage: any) => {
    if (!stage.startedAt) return null;

    const started = dayjs(stage.startedAt);
    const completed = stage.completedAt ? dayjs(stage.completedAt) : dayjs();
    const actual = completed.diff(started, 'hours', true);
    const expected = workflow?.workflowDefinition.structure.stages
      .find(s => s.stageNumber === stage.stageNumber)?.deadlineHours || 24;

    return {
      actual,
      expected,
      efficiency: Math.max(0, Math.min(100, ((expected - actual) / expected) * 100)),
      status: actual <= expected ? 'good' : actual <= expected * 1.2 ? 'warning' : 'critical'
    };
  };

  /**
   * Render stage assignments table
   */
  const stageAssignmentsColumns: ColumnsType<any> = [
    {
      title: 'Assignee',
      key: 'assignee',
      render: (_, assignment) => (
        <Space>
          <Avatar size="small">{assignment.assignedToName?.charAt(0) || 'U'}</Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{assignment.assignedToName || 'Unknown'}</div>
            {assignment.assignedToRole && (
              <Text type="secondary" style={{ fontSize: 12 }}>{assignment.assignedToRole}</Text>
            )}
          </div>
          {assignment.isDelegated && (
            <Tooltip title="Delegated assignment">
              <Badge dot color="blue" />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'assignmentType',
      render: (type) => <Tag>{type}</Tag>
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, assignment) => {
        if (assignment.action) {
          const config = assignment.action === 'APPROVED' ?
            { color: 'green', icon: <CheckCircleOutlined /> } :
            { color: 'red', icon: <ExclamationCircleOutlined /> };

          return (
            <Space>
              <Tag color={config.color} icon={config.icon}>
                {assignment.action}
              </Tag>
              {assignment.actionTakenAt && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {dayjs(assignment.actionTakenAt).fromNow()}
                </Text>
              )}
            </Space>
          );
        }
        return <Tag color="default">Pending</Tag>;
      }
    },
    {
      title: 'Escalation',
      key: 'escalation',
      render: (_, assignment) => (
        <Badge count={assignment.escalationLevel} style={{ backgroundColor: '#fa8c16' }} />
      )
    }
  ];

  if (loading || !workflow) {
    return (
      <Card loading={loading}>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          {!workflow && !loading && (
            <Empty description="Workflow data not available" />
          )}
        </div>
      </Card>
    );
  }

  /**
   * Header with controls
   */
  const header = (
    <Row justify="space-between" align="middle">
      <Col>
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            {workflow.workflowDefinition.name}
          </Title>
          <Tag color="blue">{workflow.status}</Tag>
          <Tag color="orange">{workflow.priority}</Tag>
        </Space>
      </Col>
      <Col>
        <Space>
          <Select
            value={viewMode}
            onChange={setViewMode}
            style={{ width: 120 }}
            size="small"
          >
            <Select.Option value="diagram">
              <NodeIndexOutlined /> Diagram
            </Select.Option>
            <Select.Option value="timeline">
              <CalendarOutlined /> Timeline
            </Select.Option>
            <Select.Option value="table">
              <Table /> Table
            </Select.Option>
          </Select>

          <Tooltip title="Auto-refresh">
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              checkedChildren={<BellOutlined />}
              unCheckedChildren={<BellOutlined />}
              size="small"
            />
          </Tooltip>

          <Button
            icon={<ReloadOutlined />}
            onClick={loadWorkflowData}
            size="small"
            loading={loading}
          >
            Refresh
          </Button>

          <Button
            icon={<FullscreenOutlined />}
            onClick={() => setDiagramExpanded(true)}
            size="small"
          >
            Expand
          </Button>
        </Space>
      </Col>
    </Row>
  );

  /**
   * Progress overview
   */
  const progressOverview = (
    <Row gutter={[16, 16]}>
      <Col span={8}>
        <Card size="small">
          <Statistic
            title="Overall Progress"
            value={workflow.progressPercentage}
            suffix="%"
            prefix={<RocketOutlined />}
          />
          <Progress
            percent={workflow.progressPercentage}
            status={workflow.status === 'COMPLETED' ? 'success' : 'active'}
            strokeColor="#1890ff"
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card size="small">
          <Statistic
            title="Current Stage"
            value={workflow.currentStageNumber || 0}
            suffix={`/ ${workflow.stageInstances.length}`}
            prefix={<TeamOutlined />}
          />
          {workflow.currentStageNumber && (
            <Text type="secondary">
              {workflow.stageInstances.find(s => s.stageNumber === workflow.currentStageNumber)?.stageName}
            </Text>
          )}
        </Card>
      </Col>
      <Col span={8}>
        <Card size="small">
          <Statistic
            title="Duration"
            value={dayjs().diff(dayjs(workflow.startedAt), 'hours')}
            suffix="hours"
            prefix={<ClockCircleOutlined />}
          />
          {workflow.deadline && (
            <Text type={dayjs().isAfter(dayjs(workflow.deadline)) ? 'danger' : 'secondary'}>
              Due {dayjs(workflow.deadline).fromNow()}
            </Text>
          )}
        </Card>
      </Col>
    </Row>
  );

  /**
   * Workflow diagram view
   */
  const workflowDiagram = (
    <Card
      title={
        <Space>
          <BranchesOutlined />
          <span>Workflow Stages</span>
        </Space>
      }
      style={{ minHeight: diagramHeight }}
    >
      <Steps
        direction="vertical"
        current={workflow.currentStageNumber ? workflow.currentStageNumber - 1 : -1}
        items={workflow.stageInstances.map(stage => {
          const statusConfig = getStageStatusConfig(stage.status);
          const performance = showPerformance ? getStagePerformance(stage) : null;

          return {
            title: (
              <Space>
                <span>{stage.stageName}</span>
                <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
                {performance && (
                  <Tag color={performance.status === 'good' ? 'green' :
                              performance.status === 'warning' ? 'orange' : 'red'}>
                    {performance.efficiency.toFixed(0)}% efficient
                  </Tag>
                )}
              </Space>
            ),
            description: (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Progress
                    percent={stage.approvalProgress.percentage}
                    size="small"
                    strokeColor={statusConfig.color === 'error' ? '#ff4d4f' : '#1890ff'}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {stage.approvalProgress.completed} of {stage.approvalProgress.total} approvals
                  </Text>
                </div>

                {stage.assignments.length > 0 && (
                  <Space wrap>
                    {stage.assignments.map(assignment => (
                      <Tooltip
                        key={assignment.id}
                        title={`${assignment.assignedToName} - ${assignment.action || 'Pending'}`}
                      >
                        <Avatar
                          size="small"
                          style={{
                            backgroundColor: assignment.action === 'APPROVED' ? '#52c41a' :
                                           assignment.action === 'REJECTED' ? '#ff4d4f' : '#d9d9d9'
                          }}
                        >
                          {assignment.assignedToName?.charAt(0) || 'U'}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </Space>
                )}

                {stage.status === 'ACTIVE' && (
                  <div style={{ marginTop: 8 }}>
                    <Button
                      size="small"
                      onClick={() => setSelectedStage(stage.stageNumber)}
                    >
                      View Details
                    </Button>
                  </div>
                )}
              </div>
            ),
            icon: statusConfig.icon,
            status: statusConfig.color as any
          };
        })}
      />
    </Card>
  );

  /**
   * Timeline view
   */
  const timelineView = (
    <Card
      title={
        <Space>
          <CalendarOutlined />
          <span>Workflow Timeline</span>
        </Space>
      }
    >
      <Timeline
        items={workflow.history.map(event => ({
          color: event.eventType.includes('APPROVED') ? 'green' :
                 event.eventType.includes('REJECTED') ? 'red' : 'blue',
          children: (
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>
                {event.eventDescription}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                By: {event.performedByName}
                {event.performedByRole && ` (${event.performedByRole})`}
              </div>
              <div style={{ fontSize: 11, color: '#999' }}>
                {dayjs(event.occurredAt).format('MMM D, YYYY h:mm A')}
              </div>
              {event.details && (
                <div style={{
                  marginTop: 8,
                  padding: 8,
                  background: '#f5f5f5',
                  borderRadius: 4,
                  fontSize: 12
                }}>
                  {JSON.stringify(event.details, null, 2)}
                </div>
              )}
            </div>
          )
        }))}
      />
    </Card>
  );

  /**
   * Table view
   */
  const stageTableColumns: ColumnsType<any> = [
    {
      title: 'Stage',
      key: 'stage',
      render: (_, stage) => (
        <Space>
          <Badge count={stage.stageNumber} style={{ backgroundColor: '#1890ff' }} />
          <span>{stage.stageName}</span>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => {
        const config = getStageStatusConfig(status);
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      }
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (_, stage) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Progress
            percent={stage.approvalProgress.percentage}
            size="small"
            format={() => `${stage.approvalProgress.completed}/${stage.approvalProgress.total}`}
          />
        </Space>
      )
    },
    {
      title: 'Assignees',
      key: 'assignees',
      render: (_, stage) => (
        <Avatar.Group maxCount={3} size="small">
          {stage.assignments.map((assignment: any) => (
            <Tooltip key={assignment.id} title={assignment.assignedToName}>
              <Avatar>{assignment.assignedToName?.charAt(0) || 'U'}</Avatar>
            </Tooltip>
          ))}
        </Avatar.Group>
      )
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, stage) => {
        if (!stage.startedAt) return <Text type="secondary">Not started</Text>;

        const start = dayjs(stage.startedAt);
        const end = stage.completedAt ? dayjs(stage.completedAt) : dayjs();
        const hours = end.diff(start, 'hours', true);

        return (
          <Space direction="vertical" size="small">
            <Text>{hours.toFixed(1)}h</Text>
            {showPerformance && (() => {
              const performance = getStagePerformance(stage);
              return performance && (
                <Tag color={performance.status === 'good' ? 'green' :
                           performance.status === 'warning' ? 'orange' : 'red'}>
                  {performance.efficiency.toFixed(0)}%
                </Tag>
              );
            })()}
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, stage) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setSelectedStage(stage.stageNumber)}
        >
          Details
        </Button>
      )
    }
  ];

  const tableView = (
    <Card
      title={
        <Space>
          <Table />
          <span>Stage Overview</span>
        </Space>
      }
    >
      <Table
        columns={stageTableColumns}
        dataSource={workflow.stageInstances}
        rowKey="id"
        size="small"
        pagination={false}
      />
    </Card>
  );

  /**
   * Analytics panel
   */
  const analyticsPanel = workflow.analytics && showAnalytics && (
    <Card
      title={
        <Space>
          <LineChartOutlined />
          <span>Performance Analytics</span>
        </Space>
      }
    >
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Statistic
            title="Total Duration"
            value={workflow.analytics.totalDurationHours}
            suffix="hours"
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Efficiency"
            value={workflow.analytics.performance.efficiency}
            suffix="%"
            prefix={<TrophyOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Quality Score"
            value={workflow.analytics.performance.qualityScore}
            suffix="/10"
            prefix={<TrophyOutlined />}
          />
        </Col>
      </Row>

      {workflow.analytics.bottlenecks.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Title level={5}>Bottlenecks</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            {workflow.analytics.bottlenecks.map(bottleneck => (
              <Alert
                key={bottleneck.stageNumber}
                message={`Stage ${bottleneck.stageNumber}: ${bottleneck.stageName}`}
                description={`Delayed by ${bottleneck.delayHours} hours - ${bottleneck.reason}`}
                type="warning"
                icon={<BugOutlined />}
                showIcon
              />
            ))}
          </Space>
        </div>
      )}
    </Card>
  );

  /**
   * Main content based on view mode
   */
  const renderMainContent = () => {
    switch (viewMode) {
      case 'timeline':
        return timelineView;
      case 'table':
        return tableView;
      default:
        return workflowDiagram;
    }
  };

  return (
    <div>
      {!compact && (
        <Card style={{ marginBottom: 16 }}>
          {header}
          <Divider />
          {progressOverview}
        </Card>
      )}

      {renderMainContent()}

      {analyticsPanel}

      {/* Stage Detail Modal */}
      <Modal
        title={
          selectedStage ?
          `Stage ${selectedStage}: ${workflow.stageInstances.find(s => s.stageNumber === selectedStage)?.stageName}` :
          'Stage Details'
        }
        open={selectedStage !== null}
        onCancel={() => setSelectedStage(null)}
        width={800}
        footer={null}
      >
        {selectedStage && (() => {
          const stage = workflow.stageInstances.find(s => s.stageNumber === selectedStage);
          if (!stage) return null;

          return (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Descriptions bordered size="small">
                <Descriptions.Item label="Status" span={2}>
                  <Tag color={getStageStatusConfig(stage.status).color}>
                    {getStageStatusConfig(stage.status).text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Progress">
                  {stage.approvalProgress.percentage}%
                </Descriptions.Item>
                <Descriptions.Item label="Started" span={2}>
                  {stage.startedAt ? dayjs(stage.startedAt).format('MMM D, YYYY h:mm A') : 'Not started'}
                </Descriptions.Item>
                <Descriptions.Item label="Completed">
                  {stage.completedAt ? dayjs(stage.completedAt).format('MMM D, YYYY h:mm A') : 'In progress'}
                </Descriptions.Item>
                <Descriptions.Item label="Notes" span={3}>
                  {stage.notes || 'No notes'}
                </Descriptions.Item>
              </Descriptions>

              <Card title="Assignments" size="small">
                <Table
                  columns={stageAssignmentsColumns}
                  dataSource={stage.assignments}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              </Card>
            </Space>
          );
        })()}
      </Modal>

      {/* Expanded Diagram Modal */}
      <Modal
        title="Workflow Diagram"
        open={diagramExpanded}
        onCancel={() => setDiagramExpanded(false)}
        width="90%"
        style={{ top: 20 }}
        footer={null}
      >
        {workflowDiagram}
      </Modal>
    </div>
  );
};

export default WorkflowProgressEnhanced;