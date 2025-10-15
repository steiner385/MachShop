import React, { useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Typography, 
  Progress,
  Table,
  Tag,
  Button,
  Space,
  Tooltip,
  Timeline
} from 'antd';
import {
  ExperimentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  AlertOutlined,
  RiseOutlined,
  EyeOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const Quality: React.FC = () => {
  const navigate = useNavigate();

  // Set page title
  useEffect(() => {
    document.title = 'Quality Management - Manufacturing Execution System';
  }, []);

  const qualityMetrics = {
    firstPassYield: 94.5,
    defectRate: 2.1,
    customerComplaints: 0.3,
    ncrCount: 15,
    inspectionsToday: 28,
    passedInspections: 26,
  };

  const recentInspections = [
    {
      key: '1',
      inspectionId: 'QI-2024-001',
      workOrder: 'WO-2024-001001',
      partNumber: 'ENG-BLADE-001',
      operation: 'Final Inspection',
      result: 'PASS',
      inspector: 'Jane Smith',
      completedAt: '2024-01-25 14:30',
    },
    {
      key: '2',
      inspectionId: 'QI-2024-002',
      workOrder: 'WO-2024-001002',
      partNumber: 'ENG-VANE-002',
      operation: 'Dimensional Check',
      result: 'FAIL',
      inspector: 'Mike Johnson',
      completedAt: '2024-01-25 13:15',
    },
    {
      key: '3',
      inspectionId: 'QI-2024-003',
      workOrder: 'WO-2024-001003',
      partNumber: 'ENG-DISK-003',
      operation: 'Surface Finish',
      result: 'PASS',
      inspector: 'Sarah Wilson',
      completedAt: '2024-01-25 11:45',
    },
  ];

  const activeNCRs = [
    {
      id: 'NCR-2024-001',
      partNumber: 'ENG-BLADE-001',
      description: 'Dimension out of tolerance - Blade length',
      severity: 'MAJOR',
      status: 'OPEN',
      createdBy: 'Jane Smith',
      createdAt: '2024-01-25 10:30',
    },
    {
      id: 'NCR-2024-002',
      partNumber: 'ENG-VANE-002',
      description: 'Surface finish defect on leading edge',
      severity: 'MINOR',
      status: 'IN_REVIEW',
      createdBy: 'Mike Johnson',
      createdAt: '2024-01-24 16:20',
    },
  ];

  const getResultColor = (result: string) => {
    switch (result) {
      case 'PASS': return 'green';
      case 'FAIL': return 'red';
      case 'CONDITIONAL': return 'orange';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'red';
      case 'MAJOR': return 'orange';
      case 'MINOR': return 'blue';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'red';
      case 'IN_REVIEW': return 'orange';
      case 'CLOSED': return 'green';
      default: return 'default';
    }
  };

  const inspectionColumns = [
    {
      title: 'Inspection ID',
      dataIndex: 'inspectionId',
      key: 'inspectionId',
      render: (text: string, record: any) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/quality/inspections/${record.key}`)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Work Order',
      dataIndex: 'workOrder',
      key: 'workOrder',
    },
    {
      title: 'Part Number',
      dataIndex: 'partNumber',
      key: 'partNumber',
    },
    {
      title: 'Operation',
      dataIndex: 'operation',
      key: 'operation',
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      render: (result: string) => (
        <Tag color={getResultColor(result)}>
          {result}
        </Tag>
      ),
    },
    {
      title: 'Inspector',
      dataIndex: 'inspector',
      key: 'inspector',
    },
    {
      title: 'Completed',
      dataIndex: 'completedAt',
      key: 'completedAt',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => navigate(`/quality/inspections/${record.key}`)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              icon={<EditOutlined />} 
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Quality Management</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />}>
            New Inspection
          </Button>
          <Button icon={<AlertOutlined />}>
            Create NCR
          </Button>
        </Space>
      </div>

      {/* Quality Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="First Pass Yield"
              value={qualityMetrics.firstPassYield}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ 
                color: qualityMetrics.firstPassYield >= 95 ? '#52c41a' : 
                       qualityMetrics.firstPassYield >= 90 ? '#faad14' : '#ff4d4f' 
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Defect Rate"
              value={qualityMetrics.defectRate}
              precision={1}
              suffix="%"
              prefix={<WarningOutlined />}
              valueStyle={{ 
                color: qualityMetrics.defectRate <= 2 ? '#52c41a' : 
                       qualityMetrics.defectRate <= 5 ? '#faad14' : '#ff4d4f' 
              }}
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              <RiseOutlined style={{ color: '#52c41a' }} /> 0.3% improvement
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Customer Complaints"
              value={qualityMetrics.customerComplaints}
              precision={1}
              suffix="%"
              prefix={<AlertOutlined />}
              valueStyle={{ 
                color: qualityMetrics.customerComplaints <= 0.5 ? '#52c41a' : 
                       qualityMetrics.customerComplaints <= 1 ? '#faad14' : '#ff4d4f' 
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Active NCRs"
              value={qualityMetrics.ncrCount}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Inspections Today"
              value={qualityMetrics.inspectionsToday}
              prefix={<ExperimentOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress 
              percent={Math.round((qualityMetrics.passedInspections / qualityMetrics.inspectionsToday) * 100)}
              size="small"
              format={(percent) => `${qualityMetrics.passedInspections}/${qualityMetrics.inspectionsToday} passed`}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Recent Inspections */}
        <Col xs={24} lg={16}>
          <Card 
            title="Recent Inspections" 
            extra={
              <Button type="link" onClick={() => navigate('/quality/inspections')}>
                View All
              </Button>
            }
          >
            <Table
              dataSource={recentInspections}
              columns={inspectionColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Active NCRs */}
        <Col xs={24} lg={8}>
          <Card 
            title="Active NCRs" 
            extra={
              <Button type="link" onClick={() => navigate('/quality/ncrs')}>
                View All
              </Button>
            }
          >
            <Timeline 
              items={activeNCRs.map((ncr) => ({
                key: ncr.id,
                dot: (
                  <AlertOutlined 
                    style={{ 
                      color: ncr.severity === 'CRITICAL' ? '#ff4d4f' : 
                             ncr.severity === 'MAJOR' ? '#faad14' : '#1890ff' 
                    }} 
                  />
                ),
                children: (
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      <Button 
                        type="link" 
                        size="small" 
                        style={{ padding: 0, height: 'auto' }}
                        onClick={() => navigate(`/quality/ncrs/${ncr.id}`)}
                      >
                        {ncr.id}
                      </Button>
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                      {ncr.partNumber}
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      {ncr.description}
                    </div>
                    <Space size="small">
                      <Tag color={getSeverityColor(ncr.severity)} size="small">
                        {ncr.severity}
                      </Tag>
                      <Tag color={getStatusColor(ncr.status)} size="small">
                        {ncr.status}
                      </Tag>
                    </Space>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                      {ncr.createdBy} • {ncr.createdAt}
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

export default Quality;