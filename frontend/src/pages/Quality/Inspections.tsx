import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Typography,
  Tooltip,
  Modal,
  Form,
  InputNumber,
  Switch,
  message
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { qualityApi, QualityInspection, InspectionResult } from '../../services/qualityApi';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const Inspections: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [resultFilter, setResultFilter] = useState<string>('');
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // Set page title
  useEffect(() => {
    document.title = 'Quality Inspections - Manufacturing Execution System';
  }, []);

  // Fetch inspections
  useEffect(() => {
    loadInspections();
  }, [pagination.current, pagination.pageSize, resultFilter]);

  const loadInspections = async () => {
    try {
      setLoading(true);

      const filters: any = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (resultFilter) {
        filters.result = resultFilter as InspectionResult;
      }

      if (searchText) {
        filters.workOrderId = searchText;
      }

      const response = await qualityApi.getInspections(filters);
      setInspections(response.inspections);
      setPagination(prev => ({
        ...prev,
        total: response.total,
      }));
    } catch (error: any) {
      console.error('Failed to load inspections:', error);
      message.error('Failed to load inspections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    loadInspections();
  };


  const getResultColor = (result: string) => {
    switch (result) {
      case 'PASS': return 'green';
      case 'FAIL': return 'red';
      case 'CONDITIONAL': return 'orange';
      default: return 'default';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'PASS': return <CheckCircleOutlined />;
      case 'FAIL': return <CloseCircleOutlined />;
      case 'CONDITIONAL': return <ExperimentOutlined />;
      default: return null;
    }
  };

  const columns = [
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
      title: 'Part Name',
      dataIndex: 'partName',
      key: 'partName',
    },
    {
      title: 'Operation',
      dataIndex: 'operation',
      key: 'operation',
    },
    {
      title: 'Inspection Plan',
      dataIndex: 'planName',
      key: 'planName',
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      render: (result: string) => (
        <Tag color={getResultColor(result)} icon={getResultIcon(result)}>
          {result}
        </Tag>
      ),
    },
    {
      title: 'Characteristics',
      key: 'characteristics',
      render: (record: any) => (
        <span>
          {record.passedCharacteristics}/{record.characteristics}
        </span>
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

  const handleCreateInspection = () => {
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      await qualityApi.createInspection({
        workOrderId: values.workOrder,
        operation: values.operation,
        qualityPlanId: values.inspectionPlan,
        inspector: values.inspector,
        quantity: values.quantity,
        notes: values.notes
      });

      message.success('Inspection created successfully');
      setIsModalVisible(false);
      form.resetFields();
      loadInspections(); // Refresh the list
    } catch (error: any) {
      console.error('Failed to create inspection:', error);
      message.error('Failed to create inspection. Please try again.');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Quality Inspections</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateInspection}>
          New Inspection
        </Button>
      </div>

      <Card>
        {/* Filters */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search inspections..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="Result"
              style={{ width: '100%' }}
              value={resultFilter}
              onChange={setResultFilter}
              allowClear
            >
              <Select.Option value="PASS">Pass</Select.Option>
              <Select.Option value="FAIL">Fail</Select.Option>
              <Select.Option value="CONDITIONAL">Conditional</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <RangePicker placeholder={['Start Date', 'End Date']} style={{ width: '100%' }} />
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Space>
              <Button icon={<FilterOutlined />}>
                More Filters
              </Button>
              <Button>
                Export
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Table */}
        <Table
          dataSource={inspections.map(inspection => ({
            key: inspection.id,
            inspectionId: inspection.id,
            workOrder: inspection.workOrderNumber || inspection.workOrderId,
            partNumber: inspection.partNumber,
            partName: inspection.partName,
            operation: inspection.operation,
            planName: inspection.qualityPlanName,
            result: inspection.result,
            inspector: inspection.inspector,
            startedAt: new Date(inspection.startedAt).toLocaleString(),
            completedAt: inspection.completedAt ? new Date(inspection.completedAt).toLocaleString() : 'In Progress',
            characteristics: inspection.totalCharacteristics,
            passedCharacteristics: inspection.passedCharacteristics
          }))}
          columns={columns}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} inspections`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || prev.pageSize
              }));
            }
          }}
        />
      </Card>

      {/* Create Inspection Modal */}
      <Modal
        title="Create New Inspection"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="workOrder"
                label="Work Order"
                rules={[{ required: true, message: 'Please select a work order' }]}
              >
                <Select placeholder="Select work order">
                  <Select.Option value="WO-2024-001001">WO-2024-001001</Select.Option>
                  <Select.Option value="WO-2024-001002">WO-2024-001002</Select.Option>
                  <Select.Option value="WO-2024-001003">WO-2024-001003</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="operation"
                label="Operation"
                rules={[{ required: true, message: 'Please enter operation' }]}
              >
                <Input placeholder="e.g., Final Inspection" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="inspectionPlan"
                label="Inspection Plan"
                rules={[{ required: true, message: 'Please select inspection plan' }]}
              >
                <Select placeholder="Select inspection plan">
                  <Select.Option value="PLAN-001">Blade Final Inspection Plan</Select.Option>
                  <Select.Option value="PLAN-002">Vane Dimensional Plan</Select.Option>
                  <Select.Option value="PLAN-003">Disk Surface Inspection</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="inspector"
                label="Inspector"
                rules={[{ required: true, message: 'Please select inspector' }]}
              >
                <Select placeholder="Select inspector">
                  <Select.Option value="jane.smith">Jane Smith</Select.Option>
                  <Select.Option value="mike.johnson">Mike Johnson</Select.Option>
                  <Select.Option value="sarah.wilson">Sarah Wilson</Select.Option>
                  <Select.Option value="david.brown">David Brown</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="Quantity to Inspect"
                rules={[{ required: true, message: 'Please enter quantity' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="autoStart"
                label="Auto Start Inspection"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={3} placeholder="Optional inspection notes" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Inspections;