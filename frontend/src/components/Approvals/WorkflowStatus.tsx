/**
 * Workflow Status Component
 *
 * Displays approval workflow progress with visual indicators:
 * - Progress stepper showing workflow stages
 * - Timeline view of approval history
 * - Rejection reasons and comments
 * - Approver information with avatars
 */

import React from 'react';
import { Steps, Card, Avatar, Timeline, Tag, Tooltip, Space } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Approval Step Interface
 */
export interface ApprovalStep {
  id: string;
  title: string;
  description: string;
  status: 'wait' | 'process' | 'finish' | 'error';
  approver?: {
    id: string;
    name: string;
    avatar?: string;
    email: string;
  };
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  comments?: string;
}

/**
 * Workflow Status Props
 */
interface WorkflowStatusProps {
  /** Type of workflow (work_instruction, fai_report, ncr, etc.) */
  workflowType: 'work_instruction' | 'fai_report' | 'ncr' | 'work_order';
  /** Overall status of the item */
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | 'ARCHIVED';
  /** Array of approval steps with their history */
  approvalHistory: ApprovalStep[];
}

/**
 * Workflow Status Component
 */
export const WorkflowStatus: React.FC<WorkflowStatusProps> = ({
  status,
  approvalHistory,
}) => {
  /**
   * Get icon for step status
   */
  const getStatusIcon = (stepStatus: ApprovalStep['status']) => {
    switch (stepStatus) {
      case 'finish':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'process':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  /**
   * Get current step index
   */
  const getCurrentStepIndex = () => {
    const processIndex = approvalHistory.findIndex((s) => s.status === 'process');
    return processIndex !== -1 ? processIndex : approvalHistory.length;
  };

  /**
   * Get overall step status
   */
  const getOverallStatus = (): 'wait' | 'process' | 'finish' | 'error' => {
    if (status === 'REJECTED') return 'error';
    if (status === 'APPROVED') return 'finish';
    return 'process';
  };

  // Filter completed steps for timeline
  const completedSteps = approvalHistory.filter(
    (step) => step.approvedAt || step.rejectedAt
  );

  return (
    <Card
      title={
        <Space>
          <span>Approval Workflow</span>
          <Tag color={status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : 'blue'}>
            {status}
          </Tag>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      {/* Progress Stepper */}
      <div style={{ marginBottom: 32 }}>
        <Steps
          current={getCurrentStepIndex()}
          status={getOverallStatus()}
          items={approvalHistory.map((step) => ({
            title: step.title,
            description: step.description,
            icon: getStatusIcon(step.status),
          }))}
        />
      </div>

      {/* Approval History Timeline */}
      {completedSteps.length > 0 && (
        <div>
          <div
            style={{
              fontWeight: 500,
              marginBottom: 16,
              fontSize: 15,
              color: 'rgba(0, 0, 0, 0.85)',
            }}
          >
            Approval History
          </div>
          <Timeline
            items={completedSteps.map((step) => {
              const isRejected = !!step.rejectedAt;
              const timestamp = step.approvedAt || step.rejectedAt;

              return {
                color: isRejected ? 'red' : 'green',
                dot: step.approver?.avatar ? (
                  <Tooltip title={step.approver.name}>
                    <Avatar src={step.approver.avatar} size="small" />
                  </Tooltip>
                ) : (
                  <Tooltip title={step.approver?.name || 'Unknown'}>
                    <Avatar icon={<UserOutlined />} size="small" />
                  </Tooltip>
                ),
                children: (
                  <div>
                    {/* Step Title and Status */}
                    <div style={{ marginBottom: 4 }}>
                      <Space size="small">
                        <span style={{ fontWeight: 500 }}>{step.title}</span>
                        {isRejected ? (
                          <Tag color="red" icon={<CloseCircleOutlined />}>
                            Rejected
                          </Tag>
                        ) : (
                          <Tag color="green" icon={<CheckCircleOutlined />}>
                            Approved
                          </Tag>
                        )}
                      </Space>
                    </div>

                    {/* Approver Info */}
                    <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>
                      By: <strong>{step.approver?.name || 'Unknown'}</strong>
                      {step.approver?.email && (
                        <span style={{ color: '#999' }}> ({step.approver.email})</span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>
                      {timestamp && (
                        <Tooltip title={dayjs(timestamp).format('MMMM D, YYYY h:mm A')}>
                          <span>{dayjs(timestamp).fromNow()}</span>
                        </Tooltip>
                      )}
                    </div>

                    {/* Rejection Reason */}
                    {step.rejectionReason && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 12,
                          background: '#fff2e8',
                          border: '1px solid #ffbb96',
                          borderRadius: 4,
                          fontSize: 13,
                        }}
                      >
                        <div style={{ marginBottom: 4 }}>
                          <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />
                          <strong>Rejection Reason:</strong>
                        </div>
                        <div>{step.rejectionReason}</div>
                      </div>
                    )}

                    {/* Comments */}
                    {step.comments && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 12,
                          background: '#f5f5f5',
                          borderRadius: 4,
                          fontSize: 13,
                          color: '#666',
                          fontStyle: 'italic',
                        }}
                      >
                        <div style={{ marginBottom: 4, fontStyle: 'normal', fontWeight: 500 }}>
                          Comments:
                        </div>
                        <div>"{step.comments}"</div>
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        </div>
      )}

      {/* Empty State */}
      {completedSteps.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#999' }}>
          <ClockCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
          <div>No approval actions taken yet</div>
          <div style={{ fontSize: 12 }}>
            The approval history will appear here once reviewers take action
          </div>
        </div>
      )}
    </Card>
  );
};

export default WorkflowStatus;
