/**
 * CorrectiveAction Detail Page - Issue #56 Phase 2
 *
 * Comprehensive CAPA record management with lifecycle, RCA, verification, and audit trail
 */

import React, { useState, useEffect } from 'react';
import {
  Page,
  PageHeader,
  PageContent,
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  Timeline,
  Tag,
  Space,
  Divider,
  Row,
  Col,
  Statistic,
  Modal,
  message,
  Spin,
  Empty,
  Badge,
  Tooltip,
  Collapse,
  Progress,
} from '@/components/ui';
import {
  SaveOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
  HistoryOutlined,
  BugOutlined,
  CheckOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { qualityApi } from '@/services/qualityApi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import styled from 'styled-components';

dayjs.extend(relativeTime);

// Types
interface CorrectiveAction {
  id: string;
  caNumber: string;
  title: string;
  description: string;
  status: string;
  priority?: string;
  source?: string;
  sourceReference?: string;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdBy: {
    firstName: string;
    lastName: string;
  };
  targetDate: string;
  implementedDate?: string;
  verifiedDate?: string;
  isEffective?: boolean;
  rootCause?: string;
  rootCauseMethod?: string;
  correctiveAction: string;
  preventiveAction?: string;
  verificationMethod?: string;
  estimatedCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  fieldName?: string;
  previousValue?: any;
  newValue?: any;
  notes?: string;
}

// Styled Components
const StatusBadge = styled(Badge)`
  .ant-badge-status-dot {
    width: 8px;
    height: 8px;
  }
`;

const DetailSection = styled(Card)`
  margin-bottom: 16px;
`;

const TimelineItem = styled.div`
  padding: 12px;
  border-left: 3px solid #1890ff;
  margin-bottom: 12px;

  &.success {
    border-left-color: #52c41a;
  }

  &.error {
    border-left-color: #ff4d4f;
  }

  .timestamp {
    font-size: 12px;
    color: #8c8c8c;
    margin-bottom: 4px;
  }

  .action {
    font-weight: 500;
    color: #262626;
    margin-bottom: 4px;
  }

  .details {
    font-size: 12px;
    color: #595959;
  }
`;

const StatusTimeline = styled.div`
  position: relative;
  padding: 20px 0;

  .status-item {
    display: flex;
    align-items: center;
    margin-bottom: 20px;

    .status-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      margin-right: 16px;
      flex-shrink: 0;

      &.completed {
        background-color: #52c41a;
      }

      &.current {
        background-color: #1890ff;
      }

      &.pending {
        background-color: #d9d9d9;
      }
    }

    .status-content {
      flex: 1;

      .status-label {
        font-weight: 500;
        color: #262626;
        margin-bottom: 4px;
      }

      .status-date {
        font-size: 12px;
        color: #8c8c8c;
      }
    }
  }

  .connector {
    position: absolute;
    left: 20px;
    top: 60px;
    width: 0;
    height: 100%;
    border-left: 2px dashed #d9d9d9;
  }
`;

const CorrectiveActionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // State
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [ca, setCA] = useState<CorrectiveAction | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [form] = Form.useForm();

  // Load CA details
  useEffect(() => {
    loadCADetails();
  }, [id]);

  const loadCADetails = async () => {
    try {
      setLoading(true);

      if (!id) {
        message.error('No CA ID provided');
        return;
      }

      // Fetch real data from API
      const [caData, auditData] = await Promise.all([
        qualityApi.getCorrectiveActionById(id),
        qualityApi.getAuditTrail(id),
      ]);

      // Format audit trail for display
      const formattedAudit: AuditEntry[] = auditData.map((entry: any) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        userId: entry.userId,
        userName: entry.userId, // TODO: Map userId to actual name from user service
        action: entry.action,
        fieldName: entry.previousValue || entry.newValue ? 'field' : undefined,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        notes: entry.notes,
      }));

      setCA(caData as any);
      setAuditTrail(formattedAudit);
      form.setFieldsValue(caData);
    } catch (error) {
      console.error('Error loading CA:', error);
      message.error('Failed to load corrective action');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    Modal.confirm({
      title: 'Confirm Status Change',
      content: `Are you sure you want to change status to ${newStatus}?`,
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        try {
          // TODO: Call API to update status
          if (ca) {
            setCA({
              ...ca,
              status: newStatus,
              updatedAt: dayjs().toISOString(),
            });
            message.success(`Status updated to ${newStatus}`);
          }
        } catch (error) {
          message.error('Failed to update status');
        }
      },
    });
  };

  const handleSave = async (values: any) => {
    try {
      // TODO: Call API to update CA
      if (ca) {
        setCA({
          ...ca,
          ...values,
          updatedAt: dayjs().toISOString(),
        });
      }
      message.success('Corrective action updated successfully');
      setEditMode(false);
    } catch (error) {
      message.error('Failed to update corrective action');
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      OPEN: 'blue',
      IN_PROGRESS: 'orange',
      IMPLEMENTED: 'cyan',
      VERIFICATION_IN_PROGRESS: 'blue',
      VERIFIED_EFFECTIVE: 'green',
      VERIFIED_INEFFECTIVE: 'red',
      CLOSED: 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      OPEN: 'Open',
      IN_PROGRESS: 'In Progress',
      IMPLEMENTED: 'Implemented',
      VERIFICATION_IN_PROGRESS: 'Verifying Effectiveness',
      VERIFIED_EFFECTIVE: 'Verified - Effective',
      VERIFIED_INEFFECTIVE: 'Verified - Ineffective',
      CLOSED: 'Closed',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <Page>
        <PageContent>
          <Spin spinning={true} />
        </PageContent>
      </Page>
    );
  }

  if (!ca) {
    return (
      <Page>
        <PageContent>
          <Empty description="Corrective action not found" />
        </PageContent>
      </Page>
    );
  }

  const daysUntilTarget = dayjs(ca.targetDate).diff(dayjs(), 'days');
  const isOverdue = daysUntilTarget < 0;

  return (
    <Page>
      <PageHeader
        title={ca.caNumber}
        subtitle={ca.title}
        onBack={() => navigate('/quality/corrective-actions')}
        extra={
          <Space>
            {!editMode && (
              <Button
                icon={<EditOutlined />}
                onClick={() => setEditMode(true)}
              >
                Edit
              </Button>
            )}
            {editMode && (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => form.submit()}
              >
                Save
              </Button>
            )}
          </Space>
        }
      />

      <PageContent>
        {/* Status Overview */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Status"
                value={getStatusLabel(ca.status)}
                prefix={<StatusBadge status={getStatusColor(ca.status)} text="" />}
                valueStyle={{ fontSize: 16 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Priority"
                value={ca.priority || 'MEDIUM'}
                valueStyle={{ color: ca.priority === 'HIGH' ? '#ff4d4f' : '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Days Until Target"
                value={Math.abs(daysUntilTarget)}
                suffix={isOverdue ? ' (OVERDUE)' : ' days'}
                valueStyle={{ color: isOverdue ? '#ff4d4f' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Assigned To"
                value={`${ca.assignedTo.firstName} ${ca.assignedTo.lastName}`}
                valueStyle={{ fontSize: 14 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Status Timeline */}
        <DetailSection title="Lifecycle Status" type="inner">
          <StatusTimeline>
            <div className="connector" />

            <div className="status-item">
              <div className="status-icon completed">
                <CheckOutlined />
              </div>
              <div className="status-content">
                <div className="status-label">Created</div>
                <div className="status-date">{dayjs(ca.createdAt).format('MMM D, YYYY HH:mm')}</div>
              </div>
            </div>

            <div className="status-item">
              <div className={`status-icon ${ca.status !== 'OPEN' ? 'completed' : 'current'}`}>
                <ArrowRightOutlined />
              </div>
              <div className="status-content">
                <div className="status-label">In Progress</div>
                <div className="status-date">Target: {dayjs(ca.targetDate).format('MMM D, YYYY')}</div>
              </div>
            </div>

            <div className="status-item">
              <div className={`status-icon ${ca.implementedDate ? 'completed' : 'pending'}`}>
                <CheckCircleOutlined />
              </div>
              <div className="status-content">
                <div className="status-label">Implemented</div>
                {ca.implementedDate ? (
                  <div className="status-date">{dayjs(ca.implementedDate).format('MMM D, YYYY HH:mm')}</div>
                ) : (
                  <div className="status-date">Pending</div>
                )}
              </div>
            </div>

            <div className="status-item">
              <div className={`status-icon ${ca.verifiedDate ? (ca.isEffective ? 'completed' : 'error') : 'pending'}`}>
                {ca.verifiedDate && (ca.isEffective ? <CheckCircleOutlined /> : <CloseCircleOutlined />)}
              </div>
              <div className="status-content">
                <div className="status-label">Verification</div>
                {ca.verifiedDate ? (
                  <>
                    <div className="status-date">{dayjs(ca.verifiedDate).format('MMM D, YYYY HH:mm')}</div>
                    <div className="status-date">
                      {ca.isEffective ? '✓ Effective' : '✗ Ineffective'}
                    </div>
                  </>
                ) : (
                  <div className="status-date">Pending</div>
                )}
              </div>
            </div>
          </StatusTimeline>
        </DetailSection>

        {/* Main Details */}
        <Tabs>
          {/* Details Tab */}
          <Tabs.TabPane tab="Details" key="details">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              disabled={!editMode}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="CA Number"
                    name="caNumber"
                  >
                    <Input disabled />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Source"
                    name="source"
                  >
                    <Input disabled />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Title"
                name="title"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Description"
                name="description"
              >
                <Input.TextArea rows={3} />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Target Date"
                    name="targetDate"
                  >
                    <DatePicker />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Priority"
                    name="priority"
                  >
                    <Select>
                      <Select.Option value="LOW">Low</Select.Option>
                      <Select.Option value="MEDIUM">Medium</Select.Option>
                      <Select.Option value="HIGH">High</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {editMode && (
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    Save Changes
                  </Button>
                </Form.Item>
              )}
            </Form>
          </Tabs.TabPane>

          {/* Root Cause Analysis Tab */}
          <Tabs.TabPane tab="Root Cause Analysis" key="rca">
            <DetailSection title="RCA Method & Analysis" type="inner">
              <Form layout="vertical">
                <Form.Item label="RCA Method">
                  <Tag color="blue">{ca.rootCauseMethod || 'Not selected'}</Tag>
                </Form.Item>
                <Form.Item label="Root Cause">
                  <Input.TextArea
                    value={ca.rootCause}
                    readOnly
                    rows={4}
                  />
                </Form.Item>
              </Form>
            </DetailSection>
          </Tabs.TabPane>

          {/* Corrective Action Tab */}
          <Tabs.TabPane tab="Actions" key="actions">
            <DetailSection title="Corrective & Preventive Actions" type="inner">
              <Collapse
                items={[
                  {
                    key: '1',
                    label: 'Corrective Action',
                    children: (
                      <p>{ca.correctiveAction}</p>
                    ),
                  },
                  {
                    key: '2',
                    label: 'Preventive Action',
                    children: (
                      <p>{ca.preventiveAction || 'No preventive action defined'}</p>
                    ),
                  },
                ]}
              />
            </DetailSection>
          </Tabs.TabPane>

          {/* Verification Tab */}
          <Tabs.TabPane tab="Verification" key="verification">
            <DetailSection title="Effectiveness Verification" type="inner">
              <Form layout="vertical">
                <Form.Item label="Verification Method">
                  <Input
                    value={ca.verificationMethod}
                    readOnly
                  />
                </Form.Item>
                <Form.Item label="Verification Status">
                  {ca.verifiedDate ? (
                    <Tag color={ca.isEffective ? 'green' : 'red'}>
                      {ca.isEffective ? 'Verified - Effective' : 'Verified - Ineffective'}
                    </Tag>
                  ) : (
                    <Tag>Pending Verification</Tag>
                  )}
                </Form.Item>
              </Form>
            </DetailSection>
          </Tabs.TabPane>

          {/* Audit Trail Tab */}
          <Tabs.TabPane tab="Audit Trail" key="audit">
            <DetailSection title="Change History" type="inner">
              <Timeline>
                {auditTrail.map(entry => (
                  <Timeline.Item
                    key={entry.id}
                    dot={
                      entry.action === 'Created' ? (
                        <FileTextOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                      ) : entry.action.includes('changed') ? (
                        <EditOutlined style={{ fontSize: 16, color: '#faad14' }} />
                      ) : (
                        <CheckOutlined style={{ fontSize: 16, color: '#52c41a' }} />
                      )
                    }
                  >
                    <p>
                      <strong>{entry.action}</strong>
                      {entry.fieldName && ` - ${entry.fieldName}`}
                      <br />
                      <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                        {entry.userName} • {dayjs(entry.timestamp).format('MMM D, YYYY HH:mm')}
                      </span>
                      {entry.notes && <br />}
                      {entry.notes && <span style={{ fontSize: 12, fontStyle: 'italic' }}>{entry.notes}</span>}
                    </p>
                  </Timeline.Item>
                ))}
              </Timeline>
            </DetailSection>
          </Tabs.TabPane>
        </Tabs>
      </PageContent>
    </Page>
  );
};

export default CorrectiveActionDetail;
