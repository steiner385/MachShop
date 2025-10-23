import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Space, Button, Typography, Row, Col, Statistic } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface OperatorWorkItem {
  operatorId: string;
  operatorName: string;
  workOrderNumber: string;
  partNumber: string;
  operation: string;
  status: string;
  startTime?: string;
  estimatedCompletion?: string;
  priority: string;
}

interface TeamMetrics {
  totalOperators: number;
  activeOperators: number;
  idleOperators: number;
  workOrdersInProgress: number;
}

/**
 * Team Work Queue Page
 *
 * Production supervisors use this to monitor all operators
 * and their current work assignments in real-time.
 */
const TeamWorkQueue: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [workQueue, setWorkQueue] = useState<OperatorWorkItem[]>([]);
  const [metrics, setMetrics] = useState<TeamMetrics>({
    totalOperators: 0,
    activeOperators: 0,
    idleOperators: 0,
    workOrdersInProgress: 0,
  });

  useEffect(() => {
    fetchTeamWorkQueue();
  }, []);

  const fetchTeamWorkQueue = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockQueue: OperatorWorkItem[] = [
        {
          operatorId: '1',
          operatorName: 'John Doe',
          workOrderNumber: 'WO-2024-001001',
          partNumber: 'TURB-BLADE-001',
          operation: 'Machining Op-10',
          status: 'IN_PROGRESS',
          startTime: '08:00',
          estimatedCompletion: '12:00',
          priority: 'HIGH',
        },
        {
          operatorId: '2',
          operatorName: 'Production Operator',
          workOrderNumber: 'WO-2024-001002',
          partNumber: 'GUIDE-VANE-001',
          operation: 'Assembly Op-20',
          status: 'IN_PROGRESS',
          startTime: '09:00',
          estimatedCompletion: '14:00',
          priority: 'NORMAL',
        },
      ];

      setWorkQueue(mockQueue);
      setMetrics({
        totalOperators: 5,
        activeOperators: 2,
        idleOperators: 3,
        workOrdersInProgress: 2,
      });
    } catch (error) {
      console.error('Failed to fetch team work queue', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<OperatorWorkItem> = [
    {
      title: 'Operator',
      dataIndex: 'operatorName',
      key: 'operatorName',
      render: (text) => (
        <Space>
          <UserOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Work Order',
      dataIndex: 'workOrderNumber',
      key: 'workOrderNumber',
    },
    {
      title: 'Part',
      dataIndex: 'partNumber',
      key: 'partNumber',
    },
    {
      title: 'Operation',
      dataIndex: 'operation',
      key: 'operation',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'IN_PROGRESS' ? 'processing' : 'default';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => {
        const color = priority === 'HIGH' ? 'red' : priority === 'NORMAL' ? 'blue' : 'default';
        return <Tag color={color}>{priority}</Tag>;
      },
    },
    {
      title: 'Start Time',
      dataIndex: 'startTime',
      key: 'startTime',
    },
    {
      title: 'Est. Completion',
      dataIndex: 'estimatedCompletion',
      key: 'estimatedCompletion',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" data-testid="view-details-button">
            Details
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Team Work Queue</Title>

      {/* Team Metrics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Operators"
              value={metrics.totalOperators}
              prefix={<UserOutlined />}
              data-testid="total-operators-stat"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Operators"
              value={metrics.activeOperators}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
              data-testid="active-operators-stat"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Idle Operators"
              value={metrics.idleOperators}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
              data-testid="idle-operators-stat"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Work Orders"
              value={metrics.workOrdersInProgress}
              prefix={<WarningOutlined />}
              data-testid="active-workorders-stat"
            />
          </Card>
        </Col>
      </Row>

      {/* Work Queue Table */}
      <Card title="Current Assignments" extra={<Button onClick={fetchTeamWorkQueue}>Refresh</Button>}>
        <Table
          columns={columns}
          dataSource={workQueue}
          loading={loading}
          rowKey="operatorId"
          pagination={{ pageSize: 10 }}
          data-testid="team-work-queue-table"
        />
      </Card>
    </div>
  );
};

export default TeamWorkQueue;
