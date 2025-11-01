/**
 * NCR Approvals Page
 *
 * Comprehensive approval management interface for NCR workflow
 * Displays pending approvals, statistics, and allows quick actions
 */

import React, { useEffect, useState } from 'react';
import { Card, Spin, Typography, Button, Space, Empty, message, Tabs } from 'antd';
import { ArrowLeftOutlined, RefreshOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { NCRApprovalDashboard, type ApprovalRequest, type ApprovalStatistics } from '@/components/NCRWorkflow';
import { useAuthStore } from '@/store/AuthStore';

const { Title, Text } = Typography;

const Approvals: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [statistics, setStatistics] = useState<ApprovalStatistics>({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalDelegated: 0,
    averageApprovalTime: 0,
    overduePending: 0,
  });

  useEffect(() => {
    document.title = 'NCR Approvals - Manufacturing Execution System';
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API call
      // const response = await fetch(`/api/v2/ncr/approvals/pending`, {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // const data = await response.json();

      // Mock data
      const mockApprovals: ApprovalRequest[] = [
        {
          id: 'approval-1',
          ncrId: 'ncr-1',
          ncrNumber: 'NCR-001',
          requestType: 'STATE_TRANSITION',
          requestedBy: 'user-1',
          requestedByName: 'John Doe',
          requestedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          approverUserId: user?.id || 'user-2',
          approverName: user?.name,
          status: 'PENDING',
          dueDate: new Date(Date.now() + 36 * 60 * 60 * 1000),
          escalated: false,
        },
        {
          id: 'approval-2',
          ncrId: 'ncr-2',
          ncrNumber: 'NCR-002',
          requestType: 'DISPOSITION',
          requestedBy: 'user-1',
          requestedByName: 'John Doe',
          requestedAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
          approverUserId: user?.id || 'user-2',
          approverName: user?.name,
          status: 'PENDING',
          dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
          escalated: true,
          escalatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          daysOverdue: 1,
        },
        {
          id: 'approval-3',
          ncrId: 'ncr-3',
          ncrNumber: 'NCR-003',
          requestType: 'CTP_AUTHORIZATION',
          requestedBy: 'user-3',
          requestedByName: 'Jane Smith',
          requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          approverUserId: user?.id || 'user-2',
          approverName: user?.name,
          status: 'PENDING',
          dueDate: new Date(Date.now() + 46 * 60 * 60 * 1000),
          escalated: false,
        },
      ];

      setPendingApprovals(mockApprovals);

      // Mock statistics
      setStatistics({
        totalPending: 5,
        totalApproved: 42,
        totalRejected: 3,
        totalDelegated: 2,
        averageApprovalTime: 18,
        overduePending: 1,
      });

      setLoading(false);
    } catch (error) {
      message.error('Failed to load approvals');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadApprovals();
    setRefreshing(false);
    message.success('Approvals refreshed');
  };

  const handleApprove = async (approvalId: string, notes?: string) => {
    try {
      // TODO: Call API to approve
      // const response = await fetch(`/api/v2/ncr/approvals/${approvalId}/approve`, {
      //   method: 'POST',
      //   body: JSON.stringify({ approvalNotes: notes })
      // });

      // Update local state
      setPendingApprovals(
        pendingApprovals.map((a) =>
          a.id === approvalId ? { ...a, status: 'APPROVED' as const } : a
        )
      );

      message.success('Approval submitted');
      await loadApprovals();
    } catch (error) {
      message.error('Failed to approve request');
    }
  };

  const handleReject = async (approvalId: string, reason: string) => {
    try {
      // TODO: Call API to reject
      // const response = await fetch(`/api/v2/ncr/approvals/${approvalId}/reject`, {
      //   method: 'POST',
      //   body: JSON.stringify({ rejectionReason: reason })
      // });

      setPendingApprovals(
        pendingApprovals.map((a) =>
          a.id === approvalId ? { ...a, status: 'REJECTED' as const } : a
        )
      );

      message.success('Request rejected');
      await loadApprovals();
    } catch (error) {
      message.error('Failed to reject request');
    }
  };

  const handleDelegate = async (approvalId: string, delegateToUserId: string) => {
    try {
      // TODO: Call API to delegate
      // const response = await fetch(`/api/v2/ncr/approvals/${approvalId}/delegate`, {
      //   method: 'POST',
      //   body: JSON.stringify({ delegateTo: delegateToUserId })
      // });

      setPendingApprovals(
        pendingApprovals.map((a) =>
          a.id === approvalId ? { ...a, status: 'DELEGATED' as const } : a
        )
      );

      message.success('Request delegated');
      await loadApprovals();
    } catch (error) {
      message.error('Failed to delegate request');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/quality')}
              style={{ marginBottom: 16 }}
            >
              Back to Quality
            </Button>
            <Title level={2}>NCR Approval Dashboard</Title>
            <Text type="secondary">Manage pending approvals and workflow approvals</Text>
          </div>
          <Button
            icon={<RefreshOutlined />}
            onClick={handleRefresh}
            loading={refreshing}
            size="large"
          >
            Refresh
          </Button>
        </div>

        {!user ? (
          <Empty
            description="Please log in to view approvals"
            style={{ marginTop: 48 }}
          />
        ) : (
          <Spin spinning={loading}>
            <NCRApprovalDashboard
              pendingApprovals={pendingApprovals}
              statistics={statistics}
              currentUserId={user.id}
              userRole={user.role}
              isLoading={loading}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelegate={handleDelegate}
            />
          </Spin>
        )}
      </Space>
    </div>
  );
};

export default Approvals;
