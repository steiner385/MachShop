import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button, Space, Row, Col, Statistic, Spin, message, Tooltip } from 'antd';
import {
  PlusOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { equipmentApi, Equipment as EquipmentType, EquipmentStatistics } from '../../services/equipmentApi';
import { usePermissionCheck } from '@/store/AuthStore';
import { PERMISSIONS } from '@/types/auth';

const Equipment: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [statistics, setStatistics] = useState<EquipmentStatistics | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const { hasPermission } = usePermissionCheck();

  // Set page title
  useEffect(() => {
    document.title = 'Equipment - Manufacturing Execution System';
  }, []);

  // Fetch equipment data
  useEffect(() => {
    loadEquipment();
  }, [pagination.current, pagination.pageSize]);

  const loadEquipment = async () => {
    try {
      setLoading(true);

      // Fetch equipment list and statistics in parallel
      const [equipmentResponse, stats] = await Promise.all([
        equipmentApi.getEquipment({
          page: pagination.current,
          limit: pagination.pageSize
        }),
        equipmentApi.getStatistics()
      ]);

      setEquipment(equipmentResponse.equipment);
      setStatistics(stats);
      setPagination(prev => ({
        ...prev,
        total: equipmentResponse.total
      }));
    } catch (error: any) {
      console.error('Failed to load equipment:', error);
      message.error('Failed to load equipment data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return 'green';
      case 'MAINTENANCE': return 'orange';
      case 'DOWN': return 'red';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return <CheckCircleOutlined />;
      case 'MAINTENANCE': return <ExclamationCircleOutlined />;
      case 'DOWN': return <CloseCircleOutlined />;
      default: return <ToolOutlined />;
    }
  };

  const columns = [
    {
      title: 'Equipment ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Last Maintenance',
      dataIndex: 'lastMaintenance',
      key: 'lastMaintenance',
    },
    {
      title: 'Next Maintenance',
      dataIndex: 'nextMaintenance',
      key: 'nextMaintenance',
    },
    {
      title: 'Utilization',
      dataIndex: 'utilizationRate',
      key: 'utilizationRate',
      render: (rate: number) => `${rate}%`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space>
          <Tooltip title={!canViewEquipment ? "No permission to view equipment" : ""}>
            <Button size="small" disabled={!canViewEquipment}>View</Button>
          </Tooltip>
          <Tooltip title={!canMaintainEquipment ? "No permission to perform maintenance" : ""}>
            <Button size="small" disabled={!canMaintainEquipment}>Maintain</Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (loading && equipment.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="Loading equipment..."><div /></Spin>
      </div>
    );
  }

  // Permission checks
  const canViewEquipment = hasPermission(PERMISSIONS.EQUIPMENT_READ);
  const canUpdateEquipment = hasPermission(PERMISSIONS.EQUIPMENT_UPDATE);
  const canMaintainEquipment = hasPermission(PERMISSIONS.EQUIPMENT_MAINTENANCE);

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <h1>Equipment Management</h1>
        <Tooltip title={!canUpdateEquipment ? "No permission to add equipment" : ""}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canUpdateEquipment}
          >
            Add Equipment
          </Button>
        </Tooltip>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Equipment"
              value={statistics?.total || 0}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Operational"
              value={statistics?.operational || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Under Maintenance"
              value={statistics?.maintenance || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Average Utilization"
              value={statistics?.averageUtilization || 0}
              suffix="%"
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Equipment List */}
      <Card title="Equipment List">
        <Table
          dataSource={equipment.map(eq => ({
            key: eq.id,
            id: eq.serialNumber || eq.name,
            name: eq.name,
            type: eq.type,
            status: eq.status,
            lastMaintenance: eq.lastMaintenanceDate ? new Date(eq.lastMaintenanceDate).toLocaleDateString() : 'N/A',
            nextMaintenance: eq.nextMaintenanceDate ? new Date(eq.nextMaintenanceDate).toLocaleDateString() : 'N/A',
            utilizationRate: eq.utilizationRate
          }))}
          columns={columns}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} equipment`,
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
    </div>
  );
};

export default Equipment;