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
  Switch,
  Divider,
  message
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  AlertOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { qualityApi, NCR, NCRStatus, NCRSeverity } from '../../services/qualityApi';
import { useAuthStore } from '@/store/AuthStore';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const NCRs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Set page title
  useEffect(() => {
    document.title = 'Non-Conformance Reports - Manufacturing Execution System';
  }, []);

  // Fetch NCRs
  useEffect(() => {
    loadNCRs();
  }, [pagination.current, pagination.pageSize, statusFilter, severityFilter]);

  const loadNCRs = async () => {
    try {
      setLoading(true);

      const filters: any = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (statusFilter) {
        filters.status = statusFilter as NCRStatus;
      }

      if (severityFilter) {
        filters.severity = severityFilter as NCRSeverity;
      }

      if (searchText) {
        filters.workOrderId = searchText;
      }

      const response = await qualityApi.getNCRs(filters);
      setNcrs(response.ncrs);
      setPagination(prev => ({
        ...prev,
        total: response.total,
      }));
    } catch (error: any) {
      console.error('Failed to load NCRs:', error);
      message.error('Failed to load NCRs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    loadNCRs();
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
      case 'CORRECTIVE_ACTION': return 'purple';
      case 'CLOSED': return 'green';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <CloseCircleOutlined />;
      case 'MAJOR': return <ExclamationCircleOutlined />;
      case 'MINOR': return <AlertOutlined />;
      default: return null;
    }
  };

  const columns = [
    {
      title: 'NCR ID',
      dataIndex: 'ncrId',
      key: 'ncrId',
      render: (text: string, record: any) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/quality/ncrs/${record.key}`)}
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
      title: 'Defect Type',
      dataIndex: 'defectType',
      key: 'defectType',
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)} icon={getSeverityIcon(severity)}>
          {severity}
        </Tag>
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
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string, record: any) => {
        const isOverdue = record.status !== 'CLOSED' && new Date(date) < new Date();
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {date}
            {isOverdue && ' (Overdue)'}
          </span>
        );
      },
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
              onClick={() => navigate(`/quality/ncrs/${record.key}`)}
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

  const handleCreateNCR = () => {
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      await qualityApi.createNCR({
        workOrderId: values.workOrder,
        operation: values.operation,
        defectType: values.defectType,
        description: values.description,
        severity: values.severity,
        quantity: parseInt(values.quantity),
        assignedTo: values.assignedTo,
        dueDate: values.dueDate.toISOString(),
        immediateAction: values.immediateAction,
        customerNotification: values.customerNotification,
        rootCause: values.rootCause
      });

      message.success('NCR created successfully');
      setIsModalVisible(false);
      form.resetFields();
      loadNCRs(); // Refresh the list
    } catch (error: any) {
      console.error('Failed to create NCR:', error);
      message.error('Failed to create NCR. Please try again.');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  // Check if user has permission to create NCRs
  const canCreateNCR = user?.permissions?.includes('quality.write') || user?.permissions?.includes('ncr.write') || false;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Non-Conformance Reports</Title>
        <Tooltip title={!canCreateNCR ? "You don't have permission to create NCRs" : ""}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateNCR}
            disabled={!canCreateNCR}
          >
            Create NCR
          </Button>
        </Tooltip>
      </div>

      <Card>
        {/* Filters */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} md={5}>
            <Input
              placeholder="Search NCRs..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Select.Option value="OPEN">Open</Select.Option>
              <Select.Option value="IN_REVIEW">In Review</Select.Option>
              <Select.Option value="CORRECTIVE_ACTION">Corrective Action</Select.Option>
              <Select.Option value="CLOSED">Closed</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="Severity"
              style={{ width: '100%' }}
              value={severityFilter}
              onChange={setSeverityFilter}
              allowClear
            >
              <Select.Option value="CRITICAL">Critical</Select.Option>
              <Select.Option value="MAJOR">Major</Select.Option>
              <Select.Option value="MINOR">Minor</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={5}>
            <RangePicker placeholder={['Start Date', 'End Date']} style={{ width: '100%' }} />
          </Col>
          <Col xs={24} sm={16} md={6}>
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
          dataSource={ncrs.map(ncr => ({
            key: ncr.id,
            ncrId: ncr.ncrNumber,
            workOrder: ncr.workOrderNumber || ncr.workOrderId,
            partNumber: ncr.partNumber,
            partName: ncr.partName,
            operation: ncr.operation,
            defectType: ncr.defectType,
            severity: ncr.severity,
            status: ncr.status,
            quantity: ncr.quantity,
            assignedTo: ncr.assignedTo,
            dueDate: new Date(ncr.dueDate).toLocaleDateString(),
            closedAt: ncr.closedAt
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
              `${range[0]}-${range[1]} of ${total} NCRs`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize || prev.pageSize
              }));
            }
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Create NCR Modal */}
      <Modal
        title="Create Non-Conformance Report"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={800}
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
                  <Select.Option value="WO-2024-001001">WO-2024-001001 - Turbine Blade</Select.Option>
                  <Select.Option value="WO-2024-001002">WO-2024-001002 - Guide Vane</Select.Option>
                  <Select.Option value="WO-2024-001003">WO-2024-001003 - Compressor Disk</Select.Option>
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
            <Col span={8}>
              <Form.Item
                name="defectType"
                label="Defect Type"
                rules={[{ required: true, message: 'Please select defect type' }]}
              >
                <Select placeholder="Select defect type">
                  <Select.Option value="Dimensional">Dimensional</Select.Option>
                  <Select.Option value="Surface">Surface</Select.Option>
                  <Select.Option value="Material">Material</Select.Option>
                  <Select.Option value="Process">Process</Select.Option>
                  <Select.Option value="Assembly">Assembly</Select.Option>
                  <Select.Option value="Documentation">Documentation</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="severity"
                label="Severity"
                rules={[{ required: true, message: 'Please select severity' }]}
              >
                <Select placeholder="Select severity">
                  <Select.Option value="CRITICAL">Critical</Select.Option>
                  <Select.Option value="MAJOR">Major</Select.Option>
                  <Select.Option value="MINOR">Minor</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label="Affected Quantity"
                rules={[{ required: true, message: 'Please enter quantity' }]}
              >
                <Input placeholder="Number of affected parts" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Defect Description"
            rules={[{ required: true, message: 'Please describe the defect' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Detailed description of the non-conformance..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assignedTo"
                label="Assign To"
                rules={[{ required: true, message: 'Please assign to someone' }]}
              >
                <Select placeholder="Select assignee">
                  <Select.Option value="quality.engineer">Quality Engineer</Select.Option>
                  <Select.Option value="process.engineer">Process Engineer</Select.Option>
                  <Select.Option value="materials.engineer">Materials Engineer</Select.Option>
                  <Select.Option value="engineering.team">Engineering Team</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label="Due Date"
                rules={[{ required: true, message: 'Please select due date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="immediateAction"
                label="Immediate Action Required"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="customerNotification"
                label="Customer Notification Required"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="rootCause"
            label="Initial Root Cause Assessment"
          >
            <TextArea 
              rows={3} 
              placeholder="Preliminary assessment of root cause..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NCRs;