import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Progress,
  Table,
  Typography,
  Row,
  Col,
  Timeline,
  Breadcrumb,
  Spin,
  Alert,
  message
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;

const WorkOrderDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    document.title = 'Work Order Details - Manufacturing Execution System';
  }, []);

  // Fetch work order details
  useEffect(() => {
    if (id) {
      fetchWorkOrderDetails();
    }
  }, [id]);

  const fetchWorkOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('mes-auth-storage');
      let authData;
      try {
        authData = JSON.parse(token || '{}');
      } catch {
        throw new Error('Invalid authentication token');
      }

      const accessToken = authData?.state?.token || authData?.token;
      if (!accessToken) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`/api/v1/workorders/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      setWorkOrder(response.data.workOrder || response.data);

      // Fetch operations if available
      try {
        const opsResponse = await axios.get(`/api/v1/workorders/${id}/operations`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        // Backend returns array directly, not wrapped in {operations: [...]}
        setOperations(Array.isArray(opsResponse.data) ? opsResponse.data : []);
      } catch (opsError) {
        console.warn('Could not fetch operations:', opsError);
        // Operations are optional, so don't fail the whole page
      }

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load work order';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'green';
      case 'IN_PROGRESS': return 'orange';
      case 'PENDING': return 'default';
      default: return 'default';
    }
  };

  const operationColumns = [
    {
      title: 'Op #',
      dataIndex: 'operationNumber',
      key: 'operationNumber',
      width: 80,
    },
    {
      title: 'Operation',
      dataIndex: 'operationName',
      key: 'operationName',
      render: (operationName: string, record: any) => (
        <Button
          type="link"
          onClick={() => navigate(`/workorders/${id}/execute/${record.operationNumber}`)}
          style={{ padding: 0, height: 'auto' }}
        >
          {operationName}
        </Button>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Quantity',
      key: 'quantity',
      render: (record: any) => (
        <span>{record.completed || record.quantityCompleted || 0}/{record.quantity || workOrder.quantity}</span>
      ),
    },
    {
      title: 'Scrapped',
      dataIndex: 'scrapped',
      key: 'scrapped',
      render: (scrapped: number, record: any) => scrapped || record.quantityScrap || 0,
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => (
        <Progress percent={progress || 0} size="small" />
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading work order details...</p>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div>
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
              )
            },
            {
              title: 'Error'
            }
          ]}
        />
        <Alert
          message="Error Loading Work Order"
          description={error || 'Work order not found'}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchWorkOrderDetails}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

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
            )
          },
          {
            title: workOrder.workOrderNumber || workOrder.id
          }
        ]}
      />

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <Title level={2} style={{ margin: 0 }}>
          Work Order {workOrder.workOrderNumber || workOrder.id}
        </Title>
        <Space>
          <Button icon={<EditOutlined />}>
            Edit
          </Button>
          {workOrder.status !== 'COMPLETED' && (
            <Button type="primary" icon={<PlayCircleOutlined />}>
              Start Next Operation
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* Work Order Information */}
        <Col xs={24} lg={16}>
          <Card title="Work Order Information">
            <Descriptions column={{ xs: 1, sm: 2, md: 2 }}>
              <Descriptions.Item label="Work Order #">
                {workOrder.workOrderNumber || workOrder.id}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(workOrder.status)}>
                  {workOrder.status.replace('_', ' ')}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Part Number">
                {workOrder.partNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Part Name">
                {workOrder.partName}
              </Descriptions.Item>
              <Descriptions.Item label="Quantity Ordered">
                {workOrder.quantity}
              </Descriptions.Item>
              <Descriptions.Item label="Quantity Completed">
                {workOrder.completed}
              </Descriptions.Item>
              <Descriptions.Item label="Quantity Scrapped">
                {workOrder.scrapped}
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color="orange">{workOrder.priority}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Customer Order">
                {workOrder.customerOrder}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                {workOrder.dueDate}
              </Descriptions.Item>
              <Descriptions.Item label="Created Date">
                {workOrder.createdDate}
              </Descriptions.Item>
              <Descriptions.Item label="Started Date">
                {workOrder.startedDate}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Operations */}
          <Card title="Operations" style={{ marginTop: 16 }}>
            <Table
              dataSource={operations}
              columns={operationColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Progress & History */}
        <Col xs={24} lg={8}>
          {/* Overall Progress */}
          <Card title="Overall Progress">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Progress
                type="circle"
                percent={Math.round((workOrder.completed / workOrder.quantity) * 100)}
                format={(percent) => `${percent}%`}
                size={120}
              />
            </div>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Completed">
                {workOrder.completed} / {workOrder.quantity}
              </Descriptions.Item>
              <Descriptions.Item label="Scrapped">
                {workOrder.scrapped}
              </Descriptions.Item>
              <Descriptions.Item label="Remaining">
                {workOrder.quantity - workOrder.completed - workOrder.scrapped}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* History Timeline */}
          <Card title="Activity History" style={{ marginTop: 16 }}>
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
              Activity history will be available soon
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WorkOrderDetails;