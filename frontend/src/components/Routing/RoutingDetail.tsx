/**
 * Routing Detail Component
 * Sprint 4: Routing Management UI
 *
 * Comprehensive routing detail view with tabs for steps, dependencies, and history
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Spin,
  Typography,
  Tabs,
  Table,
  Alert,
  message,
  Statistic,
  Row,
  Col,
  Popconfirm,
  Badge,
  Tooltip,
  Segmented,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  HistoryOutlined,
  NodeIndexOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  ControlOutlined,
  TableOutlined,
  BarChartOutlined,
  ApartmentOutlined,
  FileAddOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoutingStore } from '@/store/routingStore';
import {
  RoutingStep,
  LIFECYCLE_STATE_COLORS,
  LIFECYCLE_STATE_LABELS,
  CreateRoutingStepRequest,
} from '@/types/routing';
import { formatTime, isRoutingEditable } from '@/api/routing';
import type { ColumnsType } from 'antd/es/table';
import { StepBuilderModal } from './StepBuilderModal';
import { DraggableStepsTable } from './DraggableStepsTable';
import { DependencyGraph } from './DependencyGraph';
import { GanttChartView } from './GanttChartView';
import { ActiveUsersIndicator } from './ActiveUsersIndicator';
import { RoutingChangedAlert } from './RoutingChangedAlert';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';
import { useRoutingChangeDetection } from '@/hooks/useRoutingChangeDetection';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

/**
 * Routing Detail Component
 *
 * Displays full routing details with tabbed interface
 */
export const RoutingDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('details');
  const [stepsView, setStepsView] = useState<'table' | 'graph' | 'gantt'>('table');
  const [stepModalVisible, setStepModalVisible] = useState(false);
  const [editingStep, setEditingStep] = useState<RoutingStep | undefined>(undefined);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);

  const {
    currentRouting,
    currentSteps,
    isLoadingDetail,
    isLoadingSteps,
    detailError,
    stepsError,
    routingTiming,
    fetchRoutingById,
    fetchRoutingSteps,
    calculateRoutingTiming,
    deleteRoutingStep,
    createRoutingStep,
    updateRoutingStep,
    resequenceSteps,
    approveRouting,
    activateRouting,
    obsoleteRouting,
  } = useRoutingStore();

  // Change detection for collaborative editing
  const {
    hasChanges,
    changeInfo,
    acceptChange,
    dismissChange,
  } = useRoutingChangeDetection({
    routingId: id || '',
    currentVersion: currentRouting?.version || '',
    enabled: !!id && !!currentRouting?.version && !isLoadingDetail,
    onChangeDetected: (info) => {
      console.log('Routing changed:', info);
      message.info(`Routing was updated by ${info.modifiedBy || 'another user'}`);
    },
  });

  // Handle reload when change is accepted
  const handleReloadAfterChange = () => {
    if (id) {
      acceptChange();
      fetchRoutingById(id);
      fetchRoutingSteps(id);
      calculateRoutingTiming(id);
      message.success('Routing reloaded successfully');
    }
  };

  // Load routing and steps on mount
  useEffect(() => {
    if (id) {
      fetchRoutingById(id);
      fetchRoutingSteps(id);
      calculateRoutingTiming(id);
    }
  }, [id]);

  // Handle back button
  const handleBack = () => {
    navigate('/routings');
  };

  // Handle edit
  const handleEdit = () => {
    navigate(`/routings/${id}/edit`);
  };

  // Handle clone
  const handleClone = () => {
    navigate(`/routings/${id}/copy`);
  };

  // Handle lifecycle transitions
  const handleApprove = async () => {
    if (!id || !currentRouting) return;
    try {
      await approveRouting({
        routingId: id,
        approvedBy: 'current-user', // TODO: Get from auth context
        notes: 'Approved via UI',
      });
      message.success('Routing approved successfully');
      fetchRoutingById(id); // Refresh
    } catch (error: any) {
      message.error(error.message || 'Failed to approve routing');
    }
  };

  const handleActivate = async () => {
    if (!id) return;
    try {
      await activateRouting(id);
      message.success('Routing activated successfully');
      fetchRoutingById(id); // Refresh
    } catch (error: any) {
      message.error(error.message || 'Failed to activate routing');
    }
  };

  const handleObsolete = async () => {
    if (!id) return;
    try {
      await obsoleteRouting(id);
      message.success('Routing marked as obsolete');
      fetchRoutingById(id); // Refresh
    } catch (error: any) {
      message.error(error.message || 'Failed to mark routing as obsolete');
    }
  };

  // Handle add step
  const handleAddStep = () => {
    setEditingStep(undefined);
    setStepModalVisible(true);
  };

  // Handle edit step
  const handleEditStep = (step: RoutingStep) => {
    setEditingStep(step);
    setStepModalVisible(true);
  };

  // Handle save step
  const handleSaveStep = async (stepData: CreateRoutingStepRequest) => {
    try {
      if (editingStep) {
        // Update existing step
        await updateRoutingStep(editingStep.id, stepData);
        message.success('Step updated successfully');
      } else {
        // Create new step
        await createRoutingStep(id!, stepData);
        message.success('Step added successfully');
      }

      // Close modal and refresh data
      setStepModalVisible(false);
      setEditingStep(undefined);

      if (id) {
        fetchRoutingSteps(id);
        calculateRoutingTiming(id);
      }
    } catch (error: any) {
      throw error; // Let modal handle the error
    }
  };

  // Handle close step modal
  const handleCloseStepModal = () => {
    setStepModalVisible(false);
    setEditingStep(undefined);
  };

  // Handle delete step
  const handleDeleteStep = async (stepId: string) => {
    try {
      await deleteRoutingStep(stepId);
      message.success('Step deleted successfully');
      if (id) {
        fetchRoutingSteps(id); // Refresh steps
        calculateRoutingTiming(id); // Recalculate timing
      }
    } catch (error: any) {
      message.error(error.message || 'Failed to delete step');
    }
  };

  // Handle reorder steps
  const handleReorderSteps = async (reorderedSteps: RoutingStep[]) => {
    if (!id) return;

    const stepOrder = reorderedSteps.map((step, index) => ({
      stepId: step.id,
      newStepNumber: (index + 1) * 10,
    }));

    await resequenceSteps({ routingId: id, stepOrder });

    // Refresh data
    fetchRoutingSteps(id);
    calculateRoutingTiming(id);
  };

  // Table columns for steps
  const stepColumns: ColumnsType<RoutingStep> = [
    {
      title: 'Step #',
      dataIndex: 'stepNumber',
      key: 'stepNumber',
      width: 80,
      align: 'center',
      sorter: (a, b) => a.stepNumber - b.stepNumber,
    },
    {
      title: 'Operation', // ISA-95: Process Segment
      key: 'operation',
      width: '25%',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.operation?.operationName || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.operation?.operationType || ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Work Center',
      key: 'workCenter',
      width: '15%',
      render: (_, record) => record.workCenter?.name || 'Not Assigned',
    },
    {
      title: 'Setup',
      key: 'setupTime',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const time = record.setupTimeOverride ?? record.operation?.setupTime ?? 0;
        return formatTime(time);
      },
    },
    {
      title: 'Cycle',
      key: 'cycleTime',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const time = record.cycleTimeOverride ?? record.operation?.duration ?? 0;
        return formatTime(time);
      },
    },
    {
      title: 'Teardown',
      key: 'teardownTime',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const time = record.teardownTimeOverride ?? record.operation?.teardownTime ?? 0;
        return formatTime(time);
      },
    },
    {
      title: 'Flags',
      key: 'flags',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {record.isOptional && <Tag color="blue">Optional</Tag>}
          {record.isQualityInspection && <Tag color="green">QC</Tag>}
          {record.isCriticalPath && <Tag color="red">Critical</Tag>}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {currentRouting && isRoutingEditable(currentRouting) && (
            <>
              <Tooltip title="Edit">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEditStep(record)}
                />
              </Tooltip>
              <Tooltip title="Delete">
                <Popconfirm
                  title="Delete this step?"
                  description="This action cannot be undone."
                  onConfirm={() => handleDeleteStep(record.id)}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  // Loading state
  if (isLoadingDetail) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>Loading routing...</div>
      </div>
    );
  }

  // Error state
  if (detailError) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Error Loading Routing"
          description={detailError}
          type="error"
          showIcon
        />
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          style={{ marginTop: '16px' }}
        >
          Back to List
        </Button>
      </div>
    );
  }

  // Not found
  if (!currentRouting) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert message="Routing not found" type="warning" showIcon />
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          style={{ marginTop: '16px' }}
        >
          Back to List
        </Button>
      </div>
    );
  }

  const editable = isRoutingEditable(currentRouting);

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Space style={{ marginBottom: '16px' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            Back
          </Button>
        </Space>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ marginBottom: '8px' }}>
              <ControlOutlined style={{ marginRight: '8px' }} />
              {currentRouting.routingNumber}
              <Tag
                color={LIFECYCLE_STATE_COLORS[currentRouting.lifecycleState]}
                style={{ marginLeft: '16px', fontSize: '14px' }}
              >
                {LIFECYCLE_STATE_LABELS[currentRouting.lifecycleState]}
              </Tag>
            </Title>
            <Space size="middle">
              <Text type="secondary">
                Part: <strong>{currentRouting.part?.partNumber}</strong> - {currentRouting.part?.partName}
              </Text>
              <Text type="secondary">|</Text>
              <Text type="secondary">
                Site: <strong>{currentRouting.site?.siteName}</strong>
              </Text>
              <Text type="secondary">|</Text>
              <Text type="secondary">
                Version: <strong>{currentRouting.version}</strong>
              </Text>
            </Space>

            {/* Active Users Indicator */}
            {id && (
              <div style={{ marginTop: '12px' }}>
                <ActiveUsersIndicator
                  resourceType="routing"
                  resourceId={id}
                  action="viewing"
                  enabled={true}
                />
              </div>
            )}
          </div>

          <Space size="middle">
            {editable && (
              <Button icon={<EditOutlined />} onClick={handleEdit}>
                Edit
              </Button>
            )}
            <Button icon={<CopyOutlined />} onClick={handleClone}>
              Clone
            </Button>
            <Button
              icon={<FileAddOutlined />}
              onClick={() => setTemplateModalVisible(true)}
            >
              Save as Template
            </Button>

            {/* Lifecycle transition buttons */}
            {currentRouting.lifecycleState === 'DRAFT' && (
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleApprove}>
                Submit for Review
              </Button>
            )}
            {currentRouting.lifecycleState === 'REVIEW' && (
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleApprove}>
                Approve & Release
              </Button>
            )}
            {currentRouting.lifecycleState === 'RELEASED' && (
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleActivate}>
                Activate for Production
              </Button>
            )}
            {currentRouting.lifecycleState === 'PRODUCTION' && (
              <Popconfirm
                title="Mark this routing as obsolete?"
                description="This will prevent it from being used for new work orders."
                onConfirm={handleObsolete}
                okText="Yes"
                cancelText="No"
              >
                <Button danger>Mark as Obsolete</Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      </div>

      {/* Change Detection Alert */}
      {hasChanges && changeInfo && (
        <RoutingChangedAlert
          changeInfo={changeInfo}
          onReload={handleReloadAfterChange}
          onDismiss={dismissChange}
        />
      )}

      {/* Timing Statistics */}
      {routingTiming && (
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Total Setup Time"
                value={formatTime(routingTiming.totalSetupTime)}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Total Cycle Time"
                value={formatTime(routingTiming.totalCycleTime)}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Total Teardown Time"
                value={formatTime(routingTiming.totalTeardownTime)}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Total Time"
                value={formatTime(routingTiming.totalTime)}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Tabbed Content */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* Details Tab */}
          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                Details
              </span>
            }
            key="details"
          >
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Routing Number">
                {currentRouting.routingNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Version">{currentRouting.version}</Descriptions.Item>
              <Descriptions.Item label="Part">
                {currentRouting.part?.partNumber} - {currentRouting.part?.partName}
              </Descriptions.Item>
              <Descriptions.Item label="Site">
                {currentRouting.site?.siteName} ({currentRouting.site?.siteCode})
              </Descriptions.Item>
              <Descriptions.Item label="Lifecycle State">
                <Tag color={LIFECYCLE_STATE_COLORS[currentRouting.lifecycleState]}>
                  {LIFECYCLE_STATE_LABELS[currentRouting.lifecycleState]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Primary Route">
                <Badge
                  status={currentRouting.isPrimaryRoute ? 'success' : 'default'}
                  text={currentRouting.isPrimaryRoute ? 'Yes' : 'No'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Active">
                <Badge
                  status={currentRouting.isActive ? 'success' : 'error'}
                  text={currentRouting.isActive ? 'Yes' : 'No'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {new Date(currentRouting.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Effective Date">
                {currentRouting.effectiveDate
                  ? new Date(currentRouting.effectiveDate).toLocaleDateString()
                  : 'Not Set'}
              </Descriptions.Item>
              <Descriptions.Item label="Expiration Date">
                {currentRouting.expirationDate
                  ? new Date(currentRouting.expirationDate).toLocaleDateString()
                  : 'Not Set'}
              </Descriptions.Item>
              {currentRouting.approvedBy && (
                <>
                  <Descriptions.Item label="Approved By">
                    {currentRouting.approvedBy}
                  </Descriptions.Item>
                  <Descriptions.Item label="Approved At">
                    {currentRouting.approvedAt
                      ? new Date(currentRouting.approvedAt).toLocaleString()
                      : 'N/A'}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Description" span={2}>
                {currentRouting.description || 'No description provided'}
              </Descriptions.Item>
              {currentRouting.notes && (
                <Descriptions.Item label="Notes" span={2}>
                  {currentRouting.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </TabPane>

          {/* Steps Tab */}
          <TabPane
            tab={
              <span>
                <NodeIndexOutlined />
                Steps ({currentSteps.length})
              </span>
            }
            key="steps"
          >
            {/* View Toggle and Actions */}
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <Space>
                {editable && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStep}>
                    Add Step
                  </Button>
                )}
              </Space>

              {/* View Toggle */}
              <Segmented
                value={stepsView}
                onChange={(value) => setStepsView(value as 'table' | 'graph' | 'gantt')}
                options={[
                  {
                    label: 'Table View',
                    value: 'table',
                    icon: <TableOutlined />,
                  },
                  {
                    label: 'Graph View',
                    value: 'graph',
                    icon: <ApartmentOutlined />,
                  },
                  {
                    label: 'Gantt Chart',
                    value: 'gantt',
                    icon: <BarChartOutlined />,
                  },
                ]}
              />
            </div>

            {editable && stepsView === 'table' && (
              <div style={{ marginBottom: '12px' }}>
                <Text type="secondary">
                  🎯 Drag and drop steps to reorder them
                </Text>
              </div>
            )}

            {stepsError && (
              <Alert
                message="Error Loading Steps"
                description={stepsError}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

            {/* Conditional View Rendering */}
            {stepsView === 'table' && (
              <DraggableStepsTable
                steps={currentSteps}
                loading={isLoadingSteps}
                editable={editable}
                onReorder={handleReorderSteps}
                onEdit={handleEditStep}
                onDelete={handleDeleteStep}
              />
            )}

            {stepsView === 'graph' && (
              <DependencyGraph
                steps={currentSteps}
                dependencies={currentSteps.flatMap((step) => step.dependencies || [])}
                loading={isLoadingSteps}
              />
            )}

            {stepsView === 'gantt' && (
              <GanttChartView
                steps={currentSteps}
                loading={isLoadingSteps}
              />
            )}
          </TabPane>

          {/* Dependencies Tab */}
          <TabPane
            tab={
              <span>
                <NodeIndexOutlined />
                Dependencies
              </span>
            }
            key="dependencies"
          >
            {/* Fetch dependencies from steps */}
            {currentSteps.length > 0 ? (
              <DependencyGraph
                steps={currentSteps}
                dependencies={
                  currentSteps.flatMap((step) => step.dependencies || [])
                }
                loading={isLoadingSteps}
              />
            ) : (
              <Alert
                message="No Steps Available"
                description="Add routing steps first to visualize dependencies."
                type="info"
                showIcon
              />
            )}

            <Alert
              message="Dependency Management"
              description="Full dependency creation and editing functionality coming soon. You'll be able to create Finish-to-Start, Start-to-Start, Finish-to-Finish, and Start-to-Finish dependencies with lag and lead times."
              type="info"
              showIcon
              style={{ marginTop: '16px' }}
            />
          </TabPane>

          {/* History Tab */}
          <TabPane
            tab={
              <span>
                <HistoryOutlined />
                History
              </span>
            }
            key="history"
          >
            <Alert
              message="Audit Trail"
              description="Routing history and audit trail coming soon. You'll be able to see all changes made to this routing, including who made the changes and when."
              type="info"
              showIcon
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Step Builder Modal */}
      {id && (
        <StepBuilderModal
          visible={stepModalVisible}
          mode={editingStep ? 'edit' : 'create'}
          routingId={id}
          step={editingStep}
          existingSteps={currentSteps}
          onSave={handleSaveStep}
          onCancel={handleCloseStepModal}
        />
      )}

      {/* Save as Template Modal */}
      {currentRouting && (
        <SaveAsTemplateModal
          visible={templateModalVisible}
          routingId={currentRouting.id}
          routingNumber={currentRouting.routingNumber}
          onClose={() => setTemplateModalVisible(false)}
          onSuccess={() => {
            message.success('Routing saved as template!');
            setTemplateModalVisible(false);
          }}
        />
      )}
    </div>
  );
};

export default RoutingDetail;
