/**
 * Personnel List Component
 * Phase 2: Personnel Management Enhancements
 */

import React, { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  Badge,
  Tooltip,
  Button,
  Input,
  Select,
} from 'antd';
import {
  TeamOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined,
  UserOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  Personnel,
  COMPETENCY_LEVEL_COLORS,
  COMPETENCY_LEVEL_LABELS,
} from '@/types/personnel';
import { personnelAPI } from '@/api/personnel';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;

export const PersonnelList: React.FC = () => {
  const navigate = useNavigate();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(true);

  // Fetch personnel
  const fetchPersonnel = async () => {
    setIsLoading(true);
    try {
      const response = await personnelAPI.getAllPersonnel({
        includeRelations: true,
        isActive: activeFilter,
      });
      if (response.success && response.data) {
        setPersonnel(response.data);
        setFilteredPersonnel(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch personnel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonnel();
  }, [activeFilter]);

  // Handle search and filtering
  useEffect(() => {
    let filtered = personnel;

    if (searchText) {
      filtered = filtered.filter(
        (p) =>
          p.firstName.toLowerCase().includes(searchText.toLowerCase()) ||
          p.lastName.toLowerCase().includes(searchText.toLowerCase()) ||
          p.employeeNumber.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (departmentFilter) {
      filtered = filtered.filter((p) => p.department === departmentFilter);
    }

    setFilteredPersonnel(filtered);
  }, [searchText, departmentFilter, personnel]);

  // Get unique departments
  const departments = Array.from(new Set(personnel.map((p) => p.department).filter(Boolean)));

  // Calculate statistics
  const stats = {
    total: personnel.length,
    active: personnel.filter((p) => p.isActive).length,
    activeCertifications: personnel.reduce(
      (sum, p) => sum + (p.certifications?.filter((c) => c.status === 'ACTIVE').length || 0),
      0
    ),
    expiringSoon: personnel.reduce((sum, p) => {
      const expiring = p.certifications?.filter((c) => {
        if (!c.expirationDate) return false;
        const daysUntil = Math.floor(
          (new Date(c.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntil > 0 && daysUntil <= 30;
      });
      return sum + (expiring?.length || 0);
    }, 0),
  };

  // Table columns
  const columns: ColumnsType<Personnel> = [
    {
      title: 'Employee',
      key: 'employee',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.firstName} {record.lastName}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.employeeNumber}</div>
        </div>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      render: (dept) => dept || 'N/A',
    },
    {
      title: 'Job Title',
      dataIndex: 'jobTitle',
      key: 'jobTitle',
      width: 150,
      render: (title) => title || 'N/A',
    },
    {
      title: 'Certifications',
      key: 'certifications',
      width: 200,
      render: (_, record) => {
        const certs = record.certifications || [];
        const active = certs.filter((c) => c.status === 'ACTIVE').length;
        const expired = certs.filter((c) => c.status === 'EXPIRED').length;

        return (
          <Space size="small">
            {active > 0 && (
              <Tooltip title={`${active} active certifications`}>
                <Tag color="green" icon={<SafetyCertificateOutlined />}>
                  {active}
                </Tag>
              </Tooltip>
            )}
            {expired > 0 && (
              <Tooltip title={`${expired} expired certifications`}>
                <Tag color="red">{expired} Expired</Tag>
              </Tooltip>
            )}
            {certs.length === 0 && <Tag>None</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Competencies',
      key: 'competencies',
      width: 200,
      render: (_, record) => {
        const comps = record.competencies || [];
        if (comps.length === 0) return <Tag>None</Tag>;

        const topComp = comps[0];
        return (
          <Space size="small">
            <Tag color={COMPETENCY_LEVEL_COLORS[topComp.level]}>
              {topComp.skillName}: {COMPETENCY_LEVEL_LABELS[topComp.level]}
            </Tag>
            {comps.length > 1 && <Tag>+{comps.length - 1} more</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Work Centers',
      key: 'workCenters',
      width: 150,
      render: (_, record) => {
        const assignments = record.workAssignments || [];
        const primary = assignments.find((a) => a.isPrimary);

        if (assignments.length === 0) return <Tag>Unassigned</Tag>;

        return (
          <Space size="small">
            {primary && (
              <Tag color="blue">{primary.workCenter?.workcenterName || 'Unknown'}</Tag>
            )}
            {assignments.length > 1 && <Tag>+{assignments.length - 1}</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Badge status={record.isActive ? 'success' : 'error'} text={record.isActive ? 'Active' : 'Inactive'} />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<UserOutlined />}
          onClick={() => navigate(`/personnel/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1>
          <TeamOutlined style={{ marginRight: 8 }} />
          Personnel Management
        </h1>
        <p style={{ color: '#666', marginTop: '8px' }}>
          Manage personnel skills, certifications, and work assignments
        </p>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Personnel"
              value={stats.active}
              suffix={`/ ${stats.total}`}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Certifications"
              value={stats.activeCertifications}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Expiring in 30 Days"
              value={stats.expiringSoon}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: stats.expiringSoon > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Competencies"
              value={personnel.reduce((sum, p) => sum + (p.competencies?.length || 0), 0)}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <Space>
          <Search
            placeholder="Search by name or employee number"
            allowClear
            enterButton={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '300px' }}
          />

          <Select
            placeholder="Filter by department"
            allowClear
            value={departmentFilter}
            onChange={setDepartmentFilter}
            style={{ width: '180px' }}
          >
            {departments.map((dept) => (
              <Option key={dept} value={dept}>
                {dept}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="Filter by status"
            value={activeFilter}
            onChange={setActiveFilter}
            style={{ width: '150px' }}
          >
            <Option value={undefined}>All</Option>
            <Option value={true}>Active</Option>
            <Option value={false}>Inactive</Option>
          </Select>
        </Space>

        <Button icon={<ReloadOutlined />} onClick={fetchPersonnel}>
          Refresh
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredPersonnel}
        rowKey="id"
        loading={isLoading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} personnel`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 1200 }}
        bordered
      />
    </div>
  );
};

export default PersonnelList;
