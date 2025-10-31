/**
 * Time Entry History Component
 * Displays edit history and audit trail for time entries
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Typography,
  Tooltip,
  Button,
  Modal,
  Descriptions,
  Timeline,
  Alert,
  Badge,
  Drawer,
  Tabs,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  HistoryOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  EyeOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styled from 'styled-components';
import TimeTypeIndicator from './TimeTypeIndicator';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

// Styled Components
const HistoryContainer = styled.div`
  .ant-table-tbody > tr > td {
    padding: 12px 16px;
  }

  .history-timeline {
    .ant-timeline-item-content {
      margin-left: 8px;
    }
  }
`;

const StatusBadge = styled(Badge)<{ status: string }>`
  .ant-badge-count {
    background-color: ${props => {
      switch (props.status) {
        case 'AUTO_APPROVED': return '#52c41a';
        case 'APPROVED': return '#52c41a';
        case 'PENDING': return '#faad14';
        case 'REJECTED': return '#f5222d';
        case 'MORE_INFO_NEEDED': return '#722ed1';
        case 'ESCALATED': return '#fa8c16';
        default: return '#d9d9d9';
      }
    }};
  }
`;

const DiffContainer = styled.div`
  .diff-old {
    background-color: #fff2f0;
    color: #f5222d;
    padding: 2px 4px;
    border-radius: 2px;
    text-decoration: line-through;
  }

  .diff-new {
    background-color: #f6ffed;
    color: #52c41a;
    padding: 2px 4px;
    border-radius: 2px;
    font-weight: 500;
  }
`;

// Types
export interface TimeEntryEdit {
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
  approvalRequired: boolean;
  approvalStatus: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  autoApproved: boolean;
  riskScore: number;
  appliedAt?: string;
  editor: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  approvals: TimeEntryApproval[];
}

export interface TimeEntryApproval {
  id: string;
  timeEntryEditId: string;
  approverUserId: string;
  status: string;
  approvalNotes?: string;
  createdAt: string;
  approver: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
}

export interface TimeEntry {
  id: string;
  userId: string;
  timeType: 'DIRECT_LABOR' | 'INDIRECT';
  clockInTime: string;
  clockOutTime?: string;
  duration?: number;
  status: string;
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
  };
  user: {
    firstName: string;
    lastName: string;
    username: string;
  };
}

interface TimeEntryHistoryProps {
  timeEntry: TimeEntry;
  visible: boolean;
  onClose: () => void;
}

const TimeEntryHistory: React.FC<TimeEntryHistoryProps> = ({
  timeEntry,
  visible,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState<TimeEntryEdit[]>([]);
  const [selectedEdit, setSelectedEdit] = useState<TimeEntryEdit | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    if (visible && timeEntry) {
      loadEditHistory();
    }
  }, [visible, timeEntry]);

  const loadEditHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/time-entry-management/edits?timeEntryId=${timeEntry.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const result = await response.json();
      if (result.success) {
        setEdits(result.data.edits || []);
      }
    } catch (error) {
      console.error('Failed to load edit history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AUTO_APPROVED':
      case 'APPROVED':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'REJECTED':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      case 'PENDING':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'MORE_INFO_NEEDED':
        return <ExclamationCircleOutlined style={{ color: '#722ed1' }} />;
      case 'ESCALATED':
        return <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AUTO_APPROVED':
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'PENDING':
        return 'warning';
      case 'MORE_INFO_NEEDED':
        return 'purple';
      case 'ESCALATED':
        return 'orange';
      default:
        return 'default';
    }
  };

  const formatFieldChange = (field: string, oldValue: any, newValue: any) => {
    const formatValue = (value: any) => {
      if (value === null || value === undefined) return 'Not set';
      if (typeof value === 'string' && value.includes('T')) {
        // Assume it's a date
        return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
      }
      return String(value);
    };

    return (
      <DiffContainer>
        <div>
          <Text strong>{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</Text>
        </div>
        <div>
          <span className="diff-old">{formatValue(oldValue)}</span>
          <Text style={{ margin: '0 8px' }}>→</Text>
          <span className="diff-new">{formatValue(newValue)}</span>
        </div>
      </DiffContainer>
    );
  };

  const renderEditDetails = (edit: TimeEntryEdit) => {
    return (
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Edit ID">{edit.id}</Descriptions.Item>
        <Descriptions.Item label="Edit Type">
          <Tag>{edit.editType.replace(/_/g, ' ')}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Reason Category">
          <Tag color="blue">{edit.reasonCategory.replace(/_/g, ' ')}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Detailed Reason">
          {edit.reason}
        </Descriptions.Item>
        <Descriptions.Item label="Edited By">
          <Space>
            <UserOutlined />
            {edit.editor.firstName} {edit.editor.lastName} ({edit.editor.username})
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Edit Date">
          {dayjs(edit.editedAt).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        <Descriptions.Item label="Risk Score">
          <Space>
            <Text>{edit.riskScore}/100</Text>
            <Tag color={edit.riskScore <= 30 ? 'green' : edit.riskScore <= 70 ? 'orange' : 'red'}>
              {edit.riskScore <= 30 ? 'Low Risk' : edit.riskScore <= 70 ? 'Medium Risk' : 'High Risk'}
            </Tag>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Auto Approved">
          {edit.autoApproved ? (
            <Tag color="green">Yes</Tag>
          ) : (
            <Tag color="orange">No</Tag>
          )}
        </Descriptions.Item>
        {edit.approvedBy && (
          <>
            <Descriptions.Item label="Approved By">
              <Space>
                <UserOutlined />
                {edit.approver?.firstName} {edit.approver?.lastName} ({edit.approver?.username})
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Approval Date">
              {edit.approvedAt ? dayjs(edit.approvedAt).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
            </Descriptions.Item>
          </>
        )}
        {edit.appliedAt && (
          <Descriptions.Item label="Applied Date">
            {dayjs(edit.appliedAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
        )}
      </Descriptions>
    );
  };

  const renderChanges = (edit: TimeEntryEdit) => {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {edit.changedFields.map(field => (
          <div key={field}>
            {formatFieldChange(
              field,
              edit.originalValues[field],
              edit.newValues[field]
            )}
          </div>
        ))}
      </Space>
    );
  };

  const renderApprovalHistory = (edit: TimeEntryEdit) => {
    if (!edit.approvals || edit.approvals.length === 0) {
      return <Text type="secondary">No approval history</Text>;
    }

    return (
      <Timeline size="small">
        {edit.approvals.map(approval => (
          <Timeline.Item
            key={approval.id}
            dot={getStatusIcon(approval.status)}
          >
            <Space direction="vertical" size="small">
              <Space>
                <Text strong>{approval.approver.firstName} {approval.approver.lastName}</Text>
                <Tag color={getStatusColor(approval.status)}>
                  {approval.status.replace(/_/g, ' ')}
                </Tag>
              </Space>
              <Text type="secondary">
                {dayjs(approval.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Text>
              {approval.approvalNotes && (
                <Text>{approval.approvalNotes}</Text>
              )}
            </Space>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };

  const renderSummaryStats = () => {
    const totalEdits = edits.length;
    const autoApprovedCount = edits.filter(edit => edit.autoApproved).length;
    const pendingCount = edits.filter(edit => edit.approvalStatus === 'PENDING').length;
    const rejectedCount = edits.filter(edit => edit.approvalStatus === 'REJECTED').length;

    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Statistic title="Total Edits" value={totalEdits} />
        </Col>
        <Col span={6}>
          <Statistic title="Auto Approved" value={autoApprovedCount} />
        </Col>
        <Col span={6}>
          <Statistic title="Pending" value={pendingCount} />
        </Col>
        <Col span={6}>
          <Statistic title="Rejected" value={rejectedCount} />
        </Col>
      </Row>
    );
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'editedAt',
      key: 'editedAt',
      width: 160,
      render: (date: string) => dayjs(date).format('MM/DD HH:mm'),
      sorter: (a: TimeEntryEdit, b: TimeEntryEdit) =>
        dayjs(a.editedAt).unix() - dayjs(b.editedAt).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Type',
      dataIndex: 'editType',
      key: 'editType',
      width: 100,
      render: (type: string) => (
        <Tag size="small">{type.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Changes',
      dataIndex: 'changedFields',
      key: 'changedFields',
      render: (fields: string[]) => (
        <Space wrap>
          {fields.slice(0, 3).map(field => (
            <Tag key={field} size="small" color="blue">
              {field.replace(/([A-Z])/g, ' $1').trim()}
            </Tag>
          ))}
          {fields.length > 3 && (
            <Tag size="small">+{fields.length - 3} more</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 140,
      render: (status: string, record: TimeEntryEdit) => (
        <StatusBadge status={status}>
          <Tag
            color={getStatusColor(status)}
            icon={getStatusIcon(status)}
          >
            {status.replace(/_/g, ' ')}
          </Tag>
        </StatusBadge>
      ),
    },
    {
      title: 'Editor',
      dataIndex: 'editor',
      key: 'editor',
      width: 120,
      render: (editor: any) => (
        <Tooltip title={`${editor.firstName} ${editor.lastName} (${editor.username})`}>
          <Text>{editor.firstName} {editor.lastName}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Risk',
      dataIndex: 'riskScore',
      key: 'riskScore',
      width: 80,
      render: (score: number) => (
        <Tooltip title={`Risk Score: ${score}/100`}>
          <Tag color={score <= 30 ? 'green' : score <= 70 ? 'orange' : 'red'}>
            {score}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record: TimeEntryEdit) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedEdit(record);
            setDetailVisible(true);
          }}
        />
      ),
    },
  ];

  return (
    <>
      <Drawer
        title={
          <Space>
            <HistoryOutlined />
            Time Entry History
            <TimeTypeIndicator
              timeType={timeEntry.timeType}
              indirectCategory={timeEntry.indirectCode?.category as any}
              variant="compact"
            />
          </Space>
        }
        width={1000}
        open={visible}
        onClose={onClose}
        destroyOnClose
      >
        <HistoryContainer>
          {/* Time Entry Summary */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={3} size="small">
              <Descriptions.Item label="Entry ID">{timeEntry.id}</Descriptions.Item>
              <Descriptions.Item label="User">
                {timeEntry.user.firstName} {timeEntry.user.lastName}
              </Descriptions.Item>
              <Descriptions.Item label="Duration">
                {timeEntry.duration ? `${timeEntry.duration.toFixed(2)}h` : 'Active'}
              </Descriptions.Item>
              <Descriptions.Item label="Clock In">
                {dayjs(timeEntry.clockInTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="Clock Out">
                {timeEntry.clockOutTime
                  ? dayjs(timeEntry.clockOutTime).format('YYYY-MM-DD HH:mm:ss')
                  : 'Active'
                }
              </Descriptions.Item>
              <Descriptions.Item label="Assignment">
                {timeEntry.workOrder?.workOrderNumber ||
                 timeEntry.indirectCode?.description ||
                 'Unassigned'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Summary Statistics */}
          {renderSummaryStats()}

          {/* Edit History Table */}
          {edits.length > 0 ? (
            <Table
              columns={columns}
              dataSource={edits}
              rowKey="id"
              loading={loading}
              size="small"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} edits`,
              }}
            />
          ) : (
            <Alert
              type="info"
              message="No Edit History"
              description="This time entry has not been edited."
              showIcon
            />
          )}
        </HistoryContainer>
      </Drawer>

      {/* Edit Detail Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            Edit Details
            {selectedEdit && (
              <Tag color={getStatusColor(selectedEdit.approvalStatus)}>
                {selectedEdit.approvalStatus.replace(/_/g, ' ')}
              </Tag>
            )}
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            Close
          </Button>
        ]}
      >
        {selectedEdit && (
          <Tabs defaultActiveKey="details">
            <TabPane tab="Edit Details" key="details">
              {renderEditDetails(selectedEdit)}
            </TabPane>
            <TabPane tab="Changes" key="changes">
              {renderChanges(selectedEdit)}
            </TabPane>
            <TabPane tab="Approval History" key="approvals">
              {renderApprovalHistory(selectedEdit)}
            </TabPane>
          </Tabs>
        )}
      </Modal>
    </>
  );
};

export default TimeEntryHistory;