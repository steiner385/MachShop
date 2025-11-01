import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, Typography, Button, Descriptions, Tag, Space, Tabs, message } from 'antd';
import { ArrowLeftOutlined, SyncOutlined } from '@ant-design/icons';
import { NCRStateVisualizer, type AvailableTransition, type StateHistoryEntry } from '@/components/NCRWorkflow';
import { useAuthStore } from '@/store/AuthStore';

const { Title, Text } = Typography;

interface NCR {
  id: string;
  ncrNumber: string;
  status: string;
  partNumber: string;
  lotNumber: string;
  defectDescription: string;
  reportedBy: string;
  dateReported: string;
  severity: string;
}

const NCRDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [ncr, setNCR] = useState<NCR | null>(null);
  const [transitions, setTransitions] = useState<AvailableTransition[]>([]);
  const [stateHistory, setStateHistory] = useState<StateHistoryEntry[]>([]);
  const [transitionLoading, setTransitionLoading] = useState(false);

  useEffect(() => {
    // Placeholder - In a real implementation, this would fetch from API
    setLoading(true);
    setTimeout(() => {
      setNCR({
        id: id || '',
        ncrNumber: `NCR-${id}`,
        status: 'PENDING_DISPOSITION',
        partNumber: 'TB-450-001',
        lotNumber: 'LOT-2024-001',
        defectDescription: 'Surface finish out of specification',
        reportedBy: 'Jane Smith',
        dateReported: new Date().toISOString().split('T')[0],
        severity: 'MAJOR',
      });

      // Mock available transitions
      setTransitions([
        {
          toState: 'CTP',
          description: 'Authorize Continue to Process',
          requiresApproval: true,
          requiredFields: [],
        },
        {
          toState: 'DDR',
          description: 'Delayed Disposition Required',
          requiresApproval: false,
          requiredFields: ['ddrExpectedDate'],
        },
        {
          toState: 'MRB',
          description: 'Schedule Material Review Board',
          requiresApproval: true,
          requiredFields: ['mrbMeetingDate'],
        },
      ]);

      // Mock state history
      setStateHistory([
        {
          id: 'history-1',
          fromState: 'SUBMITTED',
          toState: 'UNDER_INVESTIGATION',
          changedBy: 'user-1',
          changedByName: 'John Doe',
          changeReason: 'Investigation initiated',
          approvalRequired: true,
          approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'history-2',
          fromState: 'UNDER_INVESTIGATION',
          toState: 'PENDING_DISPOSITION',
          changedBy: 'user-1',
          changedByName: 'John Doe',
          changeReason: 'Root cause identified',
          approvalRequired: false,
          approvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      ]);

      setLoading(false);
    }, 300);
  }, [id]);

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      OPEN: 'error',
      IN_REVIEW: 'warning',
      CLOSED: 'success',
      REJECTED: 'default',
    };
    return colorMap[status] || 'default';
  };

  const getSeverityColor = (severity: string) => {
    const colorMap: Record<string, string> = {
      CRITICAL: 'red',
      MAJOR: 'orange',
      MINOR: 'gold',
      COSMETIC: 'blue',
    };
    return colorMap[severity] || 'default';
  };

  const handleTransition = async (toState: string) => {
    if (!ncr) return;

    try {
      setTransitionLoading(true);
      // TODO: Call API endpoint to transition state
      // const result = await fetch(`/api/v2/ncr/${id}/transition`, {
      //   method: 'POST',
      //   body: JSON.stringify({ toState })
      // })
      message.success(`Transitioning to ${toState}...`);
      setTransitionLoading(false);
    } catch (error) {
      message.error('Failed to transition NCR');
      setTransitionLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/quality/ncrs')}
            style={{ marginBottom: 16 }}
          >
            Back to NCRs
          </Button>
          <Title level={2}>NCR Details: {ncr?.ncrNumber || id}</Title>
          <Text type="secondary">Non-Conformance Report</Text>
        </div>

        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: 'Overview',
              children: (
                <Card>
                  <Spin spinning={loading}>
                    {ncr && (
                      <Descriptions bordered column={2}>
                        <Descriptions.Item label="NCR Number" span={2}>
                          {ncr.ncrNumber}
                        </Descriptions.Item>
                        <Descriptions.Item label="Status">
                          <Tag color={getStatusColor(ncr.status)}>
                            {ncr.status}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Severity">
                          <Tag color={getSeverityColor(ncr.severity)}>
                            {ncr.severity}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Part Number">
                          {ncr.partNumber}
                        </Descriptions.Item>
                        <Descriptions.Item label="Lot Number">
                          {ncr.lotNumber}
                        </Descriptions.Item>
                        <Descriptions.Item label="Reported By">
                          {ncr.reportedBy}
                        </Descriptions.Item>
                        <Descriptions.Item label="Date Reported">
                          {ncr.dateReported}
                        </Descriptions.Item>
                        <Descriptions.Item label="Defect Description" span={2}>
                          {ncr.defectDescription}
                        </Descriptions.Item>
                      </Descriptions>
                    )}
                  </Spin>
                </Card>
              ),
            },
            {
              key: 'workflow',
              label: 'Workflow & Approvals',
              children: ncr && (
                <Spin spinning={transitionLoading}>
                  <NCRStateVisualizer
                    currentState={ncr.status}
                    ncrNumber={ncr.ncrNumber}
                    availableTransitions={transitions}
                    stateHistory={stateHistory}
                    userRole={user?.role}
                    onTransitionSelect={handleTransition}
                  />
                </Spin>
              ),
            },
            {
              key: 'investigation',
              label: 'Investigation',
              children: (
                <Card>
                  <Title level={4}>Root Cause Analysis</Title>
                  <Text type="secondary">Investigation details would be displayed here</Text>
                </Card>
              ),
            },
            {
              key: 'disposition',
              label: 'Disposition',
              children: (
                <Card>
                  <Title level={4}>Disposition Details</Title>
                  <Text type="secondary">Disposition information would be displayed here</Text>
                </Card>
              ),
            },
          ]}
        />
      </Space>
    </div>
  );
};

export default NCRDetail;
