import React, { useEffect } from 'react';
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
  Breadcrumb
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const WorkOrderDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Set page title
  useEffect(() => {
    document.title = 'Work Order Details - Manufacturing Execution System';
  }, []);

  // Mock data
  const workOrder = {
    id: 'WO-2024-001001',
    partNumber: 'ENG-BLADE-001',
    partName: 'Turbine Blade',
    quantity: 10,
    completed: 6,
    scrapped: 1,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: '2024-02-15',
    customerOrder: 'CO-2024-001',
    createdDate: '2024-01-15',
    startedDate: '2024-01-20',
  };

  const operations = [
    {
      key: '1',
      operationNumber: 10,
      operationName: 'Rough Machining',
      status: 'COMPLETED',
      completed: 10,
      scrapped: 0,
      progress: 100,
    },
    {
      key: '2',
      operationNumber: 20,
      operationName: 'Finish Machining',
      status: 'IN_PROGRESS',
      completed: 6,
      scrapped: 1,
      progress: 60,
    },
    {
      key: '3',
      operationNumber: 30,
      operationName: 'Quality Inspection',
      status: 'PENDING',
      completed: 0,
      scrapped: 0,
      progress: 0,
    },
  ];

  const history = [
    {
      time: '2024-01-20 09:30',
      action: 'Work Order Released',
      user: 'Production Planner',
      status: 'success',
    },
    {
      time: '2024-01-20 10:15',
      action: 'Operation 10 Started',
      user: 'Operator Smith',
      status: 'success',
    },
    {
      time: '2024-01-22 16:45',
      action: 'Operation 10 Completed',
      user: 'Operator Smith',
      status: 'success',
    },
    {
      time: '2024-01-23 08:00',
      action: 'Operation 20 Started',
      user: 'Operator Jones',
      status: 'processing',
    },
  ];

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
        <span>{record.completed}/{workOrder.quantity}</span>
      ),
    },
    {
      title: 'Scrapped',
      dataIndex: 'scrapped',
      key: 'scrapped',
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => (
        <Progress percent={progress} size="small" />
      ),
    },
  ];

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
            title: workOrder.id
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
          Work Order {workOrder.id}
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
                {workOrder.id}
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
            <Timeline 
              items={history.map((item) => ({
                key: `${item.time}-${item.action}`,
                dot: item.status === 'success' ? 
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                  <ClockCircleOutlined style={{ color: '#1890ff' }} />,
                children: (
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.action}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {item.user} • {item.time}
                    </div>
                  </div>
                )
              }))}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default WorkOrderDetails;