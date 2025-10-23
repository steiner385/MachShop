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
  Progress,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { workOrderApi, WorkOrder, WorkOrderFilters } from '@/services/workOrderApi';
import { message } from 'antd';
import { useAuthStore, usePermissionCheck } from '@/store/AuthStore';
import { PERMISSIONS } from '@/types/auth';
import { WorkOrderCreate } from '@/components/WorkOrders/WorkOrderCreate';
import { WorkOrderPriorityChange } from '@/components/WorkOrders/WorkOrderPriorityChange';
import { WorkOrderReschedule } from '@/components/WorkOrders/WorkOrderReschedule';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const WorkOrders: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [priorityChangeModalVisible, setPriorityChangeModalVisible] = useState(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { hasPermission } = usePermissionCheck();

  // Set page title
  useEffect(() => {
    document.title = 'Work Orders - Manufacturing Execution System';
  }, []);

  // Fetch work orders
  useEffect(() => {
    loadWorkOrders();
  }, [pagination.current, pagination.pageSize, statusFilter]);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      const filters: WorkOrderFilters = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (statusFilter) {
        filters.status = statusFilter as WorkOrder['status'];
      }

      if (searchText) {
        filters.partNumber = searchText;
      }

      const response = await workOrderApi.getWorkOrders(filters);
      setWorkOrders(response.workOrders);
      setPagination(prev => ({
        ...prev,
        total: response.total,
      }));
    } catch (error: any) {
      console.error('Failed to load work orders:', error);
      message.error('Failed to load work orders. Please try again.');
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    loadWorkOrders();
  };

  // Transform work orders to match table format
  const tableData = workOrders.map((wo, index) => ({
    key: wo.id,
    id: wo.workOrderNumber,
    partNumber: wo.partNumber,
    partName: wo.partName,
    quantity: wo.quantity,
    completed: wo.completed,
    status: wo.status,
    priority: wo.priority,
    dueDate: wo.dueDate,
    progress: wo.progress,
    scheduledStartDate: wo.scheduledStartDate,
    scheduledEndDate: wo.scheduledEndDate,
    rawWorkOrder: wo, // Keep reference to full work order object
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATED': return 'default';
      case 'RELEASED': return 'blue';
      case 'IN_PROGRESS': return 'orange';
      case 'COMPLETED': return 'green';
      case 'CANCELLED': return 'red';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'red';
      case 'HIGH': return 'orange';
      case 'NORMAL': return 'blue';
      case 'LOW': return 'green';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Work Order #',
      dataIndex: 'id',
      key: 'id',
      render: (text: string, record: any) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/workorders/${record.key}`)}
        >
          {text}
        </Button>
      ),
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
      title: 'Quantity',
      key: 'quantity',
      render: (record: any) => (
        <span>{record.completed}/{record.quantity}</span>
      ),
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => (
        <Progress 
          percent={progress} 
          size="small" 
          status={progress === 100 ? 'success' : 'active'}
        />
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
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {priority}
        </Tag>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => {
        const canEdit = hasPermission(PERMISSIONS.WORKORDERS_UPDATE);
        const canRelease = hasPermission(PERMISSIONS.WORKORDERS_RELEASE);

        return (
          <Space>
            <Tooltip title="View Details">
              <Button
                icon={<EyeOutlined />}
                size="small"
                onClick={() => navigate(`/workorders/${record.key}`)}
              />
            </Tooltip>
            <Tooltip title={!canEdit ? "No permission to edit" : "Edit"}>
              <Button
                icon={<EditOutlined />}
                size="small"
                disabled={!canEdit}
              />
            </Tooltip>
            {canEdit && (
              <>
                <Tooltip title="Change Priority">
                  <Button
                    icon={<ThunderboltOutlined />}
                    size="small"
                    onClick={() => {
                      setSelectedWorkOrder(record);
                      setPriorityChangeModalVisible(true);
                    }}
                    data-testid="change-priority-button"
                  />
                </Tooltip>
                <Tooltip title="Reschedule">
                  <Button
                    icon={<CalendarOutlined />}
                    size="small"
                    onClick={() => {
                      setSelectedWorkOrder(record);
                      setRescheduleModalVisible(true);
                    }}
                    data-testid="reschedule-button"
                  />
                </Tooltip>
              </>
            )}
            {record.status === 'CREATED' && (
              <Tooltip title={!canRelease ? "No permission to release" : "Release"}>
                <Button
                  icon={<PlayCircleOutlined />}
                  size="small"
                  type="primary"
                  disabled={!canRelease}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  // Check if user has permission to create work orders
  const canCreateWorkOrder = hasPermission(PERMISSIONS.WORKORDERS_CREATE);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Work Orders</Title>
        <Tooltip title={!canCreateWorkOrder ? "You don't have permission to create work orders" : ""}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canCreateWorkOrder}
            onClick={() => setCreateModalVisible(true)}
            data-testid="create-work-order-button"
          >
            Create Work Order
          </Button>
        </Tooltip>
      </div>

      <Card>
        {/* Filters */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search work orders..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              data-testid="work-order-search-input"
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="Status"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              data-testid="status-filter-select"
            >
              <Select.Option value="CREATED">Created</Select.Option>
              <Select.Option value="RELEASED">Released</Select.Option>
              <Select.Option value="IN_PROGRESS">In Progress</Select.Option>
              <Select.Option value="COMPLETED">Completed</Select.Option>
              <Select.Option value="CANCELLED">Cancelled</Select.Option>
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
          dataSource={tableData}
          columns={columns}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} work orders`,
            onChange: (page, size) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: size || prev.pageSize,
              }));
            },
          }}
        />
      </Card>

      {/* Create Work Order Modal */}
      <WorkOrderCreate
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          loadWorkOrders();
        }}
      />

      {/* Priority Change Modal */}
      {selectedWorkOrder && (
        <WorkOrderPriorityChange
          workOrderId={selectedWorkOrder.key}
          workOrderNumber={selectedWorkOrder.id}
          currentPriority={selectedWorkOrder.priority}
          visible={priorityChangeModalVisible}
          onClose={() => {
            setPriorityChangeModalVisible(false);
            setSelectedWorkOrder(null);
          }}
          onSuccess={() => {
            setPriorityChangeModalVisible(false);
            setSelectedWorkOrder(null);
            loadWorkOrders();
          }}
        />
      )}

      {/* Reschedule Modal */}
      {selectedWorkOrder && (
        <WorkOrderReschedule
          workOrderId={selectedWorkOrder.key}
          workOrderNumber={selectedWorkOrder.id}
          currentStartDate={selectedWorkOrder.scheduledStartDate}
          currentEndDate={selectedWorkOrder.scheduledEndDate}
          currentDueDate={selectedWorkOrder.dueDate}
          visible={rescheduleModalVisible}
          onClose={() => {
            setRescheduleModalVisible(false);
            setSelectedWorkOrder(null);
          }}
          onSuccess={() => {
            setRescheduleModalVisible(false);
            setSelectedWorkOrder(null);
            loadWorkOrders();
          }}
        />
      )}
    </div>
  );
};

export default WorkOrders;