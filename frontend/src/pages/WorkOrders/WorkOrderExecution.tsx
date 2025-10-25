/**
 * Work Order Execution Page
 * Interface for production operators to execute work orders
 * - Start/stop operations
 * - Record production quantities
 * - Report issues
 * - View assigned work
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Alert,
  Spin,
  Modal,
  message,
  Breadcrumb,
  Row,
  Col,
  Statistic,
  Typography,
  Divider,
  Timeline,
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ToolOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { ProductionEntryForm, ProductionEntryValues } from '@/components/WorkOrders/ProductionEntryForm';
import { ConditionalRender } from '@/components/Auth/ProtectedRoute';
import {
  startOperation,
  recordProduction,
  completeOperation,
  reportIssue,
  getOperation,
  WorkOrderOperation,
} from '@/api/workOrderExecution';

const { Title } = Typography;

const WorkOrderExecution: React.FC = () => {
  const { id, operationNumber } = useParams<{ id: string; operationNumber: string }>();
  const navigate = useNavigate();
  const [operation, setOperation] = useState<WorkOrderOperation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showProductionEntry, setShowProductionEntry] = useState(false);
  const [_showIssueReport, _setShowIssueReport] = useState(false);

  useEffect(() => {
    if (id && operationNumber) {
      loadOperation();
    }
  }, [id, operationNumber]);

  const loadOperation = async () => {
    if (!id || !operationNumber) return;

    setLoading(true);
    try {
      const response = await getOperation(id, parseInt(operationNumber));
      setOperation(response.data || null);
    } catch (error) {
      message.error(`Failed to load operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOperation = async () => {
    if (!id || !operationNumber) return;

    setActionLoading(true);
    try {
      const response = await startOperation({
        workOrderId: id,
        operationNumber: parseInt(operationNumber),
      });
      message.success('Operation started successfully');
      setOperation(response.operation);
    } catch (error) {
      message.error(`Failed to start operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteOperation = async () => {
    if (!id || !operationNumber) return;

    Modal.confirm({
      title: 'Complete Operation',
      content: 'Are you sure you want to complete this operation? This action cannot be undone.',
      okText: 'Yes, Complete',
      cancelText: 'Cancel',
      onOk: async () => {
        setActionLoading(true);
        try {
          const response = await completeOperation({
            workOrderId: id,
            operationNumber: parseInt(operationNumber),
          });
          message.success('Operation completed successfully');
          setOperation(response.operation);
        } catch (error) {
          message.error(`Failed to complete operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleRecordProduction = async (values: ProductionEntryValues) => {
    if (!id || !operationNumber) return;

    const response = await recordProduction({
      workOrderId: id,
      operationNumber: parseInt(operationNumber),
      ...values,
    });

    setOperation(response.operation);
    setShowProductionEntry(false);
  };

  const handleReportIssue = (issueType: 'quality' | 'equipment') => {
    Modal.confirm({
      title: `Report ${issueType === 'quality' ? 'Quality' : 'Equipment'} Issue`,
      content: `Do you want to report a ${issueType} issue for this operation?`,
      okText: 'Report Issue',
      cancelText: 'Cancel',
      onOk: async () => {
        if (!id || !operationNumber) return;

        try {
          await reportIssue({
            workOrderId: id,
            operationNumber: parseInt(operationNumber),
            issueType,
            description: `${issueType} issue reported by operator`,
            severity: 'medium',
          });
          message.success(`${issueType} issue reported successfully`);
        } catch (error) {
          message.error(`Failed to report issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'green';
      case 'IN_PROGRESS':
        return 'blue';
      case 'ON_HOLD':
        return 'red';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading operation...</div>
      </div>
    );
  }

  if (!operation) {
    return (
      <Alert
        message="Operation Not Found"
        description="The requested operation could not be found or you don't have permission to access it."
        type="error"
        showIcon
      />
    );
  }

  const remainingQuantity = operation.orderedQuantity - operation.completedQuantity - operation.scrappedQuantity;
  const progressPercent = Math.round(
    ((operation.completedQuantity + operation.scrappedQuantity) / operation.orderedQuantity) * 100
  );

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: (
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/workorders')}
                style={{ padding: 0 }}
              >
                Work Orders
              </Button>
            ),
          },
          {
            title: operation.workOrderNumber || operation.workOrderId,
          },
          {
            title: `Operation ${operation.operationNumber}`,
          },
        ]}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Operation {operation.operationNumber}: {operation.operationName}
        </Title>
        <Tag color={getStatusColor(operation.status)} style={{ fontSize: 14, padding: '4px 12px' }}>
          {operation.status.replace('_', ' ')}
        </Tag>
      </div>

      <Row gutter={[16, 16]}>
        {/* Left Column - Operation Details & Actions */}
        <Col xs={24} lg={16}>
          {/* Operation Information */}
          <Card title="Operation Information">
            <Descriptions column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Work Order">{operation.workOrderNumber || operation.workOrderId}</Descriptions.Item>
              <Descriptions.Item label="Operation Number">{operation.operationNumber}</Descriptions.Item>
              <Descriptions.Item label="Operation Name">{operation.operationName}</Descriptions.Item>
              <Descriptions.Item label="Work Center">{operation.workCenterName || 'Not assigned'}</Descriptions.Item>
              <Descriptions.Item label="Assigned Operator">
                {operation.assignedOperatorName || 'Not assigned'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(operation.status)}>{operation.status.replace('_', ' ')}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            {/* Quick Stats */}
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="Ordered" value={operation.orderedQuantity} />
              </Col>
              <Col span={6}>
                <Statistic title="Completed" value={operation.completedQuantity} valueStyle={{ color: '#3f8600' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Scrapped" value={operation.scrappedQuantity} valueStyle={{ color: '#cf1322' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Remaining" value={remainingQuantity} />
              </Col>
            </Row>
          </Card>

          {/* Operation Actions - Only visible to operators with execute permission */}
          <ConditionalRender permissions={['workorders.execute' as any]}>
            <Card title="Production Actions" style={{ marginTop: 16 }}>
              {operation.status === 'PENDING' && (
                <div>
                  <Alert
                    message="Operation Not Started"
                    description="Click 'Start Operation' to begin production."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartOperation}
                    loading={actionLoading}
                    data-testid="start-operation-button"
                  >
                    Start Operation
                  </Button>
                </div>
              )}

              {operation.status === 'IN_PROGRESS' && (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {/* Record Production */}
                  {!showProductionEntry && (
                    <Space wrap>
                      <Button
                        type="primary"
                        size="large"
                        icon={<CheckCircleOutlined />}
                        onClick={() => setShowProductionEntry(true)}
                        data-testid="record-button"
                      >
                        Record Production
                      </Button>
                      <Button
                        size="large"
                        icon={<WarningOutlined />}
                        onClick={() => handleReportIssue('quality')}
                        data-testid="report-quality-issue-button"
                      >
                        Report Quality Issue
                      </Button>
                      <Button
                        size="large"
                        icon={<ToolOutlined />}
                        onClick={() => handleReportIssue('equipment')}
                        data-testid="report-equipment-issue-button"
                      >
                        Report Equipment Problem
                      </Button>
                      {remainingQuantity === 0 && (
                        <Button
                          type="primary"
                          danger
                          size="large"
                          icon={<CheckCircleOutlined />}
                          onClick={handleCompleteOperation}
                          loading={actionLoading}
                          data-testid="complete-operation-button"
                        >
                          Complete Operation
                        </Button>
                      )}
                    </Space>
                  )}

                  {/* Production Entry Form */}
                  {showProductionEntry && (
                    <ProductionEntryForm
                      workOrderId={operation.workOrderId}
                      operationNumber={operation.operationNumber}
                      orderedQuantity={operation.orderedQuantity}
                      completedQuantity={operation.completedQuantity}
                      onSubmit={handleRecordProduction}
                      onCancel={() => setShowProductionEntry(false)}
                    />
                  )}
                </Space>
              )}

              {operation.status === 'COMPLETED' && (
                <Alert
                  message="Operation Completed"
                  description="This operation has been completed."
                  type="success"
                  showIcon
                />
              )}

              {operation.status === 'ON_HOLD' && (
                <Alert
                  message="Operation On Hold"
                  description="This operation is currently on hold. Contact your supervisor for details."
                  type="warning"
                  showIcon
                />
              )}
            </Card>
          </ConditionalRender>
        </Col>

        {/* Right Column - Progress & Activity */}
        <Col xs={24} lg={8}>
          {/* Progress Card */}
          <Card title="Production Progress">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Statistic
                title="Overall Progress"
                value={progressPercent}
                suffix="%"
                valueStyle={{ color: progressPercent === 100 ? '#3f8600' : '#1890ff' }}
              />
            </div>

            <Timeline
              items={[
                {
                  color: 'green',
                  children: `Completed: ${operation.completedQuantity} units`,
                },
                {
                  color: 'red',
                  children: `Scrapped: ${operation.scrappedQuantity} units`,
                },
                {
                  color: operation.reworkQuantity > 0 ? 'orange' : 'gray',
                  children: `Rework: ${operation.reworkQuantity} units`,
                },
                {
                  color: remainingQuantity > 0 ? 'blue' : 'gray',
                  children: `Remaining: ${remainingQuantity} units`,
                },
              ]}
            />

            {operation.startTime && (
              <div style={{ marginTop: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
                <Space direction="vertical" size="small">
                  <div>
                    <ClockCircleOutlined /> <strong>Started:</strong>{' '}
                    {new Date(operation.startTime).toLocaleString()}
                  </div>
                  {operation.endTime && (
                    <div>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} /> <strong>Completed:</strong>{' '}
                      {new Date(operation.endTime).toLocaleString()}
                    </div>
                  )}
                </Space>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WorkOrderExecution;
