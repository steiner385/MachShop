import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  ToolOutlined,
  SafetyOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';

import { unifiedDocumentApi, UnifiedDocument, DocumentType } from '@/api/unifiedDocuments';
import { setupSheetApi } from '@/api/setupSheets';
import { inspectionPlanApi } from '@/api/inspectionPlans';
import { sopApi } from '@/api/sops';
import { toolDrawingApi } from '@/api/toolDrawings';

const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

/**
 * Status color mapping for document statuses
 */
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default',
  REVIEW: 'processing',
  APPROVED: 'success',
  REJECTED: 'error',
  SUPERSEDED: 'warning',
  ARCHIVED: 'error',
};

/**
 * Document type icons
 */
const DOCUMENT_TYPE_ICONS: Record<DocumentType, React.ReactNode> = {
  SETUP_SHEET: <ToolOutlined />,
  INSPECTION_PLAN: <ExperimentOutlined />,
  SOP: <SafetyOutlined />,
  TOOL_DRAWING: <ToolOutlined />,
  WORK_INSTRUCTION: <FileTextOutlined />,
};

/**
 * Unified Documents Page
 *
 * Provides a unified interface for managing all document types with:
 * - Cross-document search
 * - Document type statistics
 * - Quick access to create new documents
 * - Impact analysis capabilities
 */
const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<DocumentType[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>();
  const [documentStats, setDocumentStats] = useState<Array<{ type: DocumentType; count: number }>>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Fetch document statistics
  const fetchDocumentStats = async () => {
    try {
      const stats = await unifiedDocumentApi.getDocumentTypes();
      setDocumentStats(stats);
    } catch (error: any) {
      console.error('Failed to fetch document statistics:', error);
    }
  };

  // Fetch documents
  const fetchDocuments = async (page = 1) => {
    setLoading(true);
    try {
      const result = await unifiedDocumentApi.searchDocuments({
        query: searchText || undefined,
        documentTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
        status: statusFilter ? [statusFilter] : undefined,
        page,
        pageSize: pagination.pageSize,
      });

      setDocuments(result.documents);
      setPagination(prev => ({
        ...prev,
        current: result.page,
        total: result.totalCount,
      }));
    } catch (error: any) {
      message.error(error.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentStats();
    fetchDocuments();
  }, []);

  useEffect(() => {
    fetchDocuments(1);
  }, [searchText, selectedTypes, statusFilter]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  // Handle pagination change
  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    if (paginationConfig.current) {
      fetchDocuments(paginationConfig.current);
    }
  };

  // Navigate to document detail
  const handleViewDocument = (record: UnifiedDocument) => {
    const routeMap: Record<DocumentType, string> = {
      SETUP_SHEET: `/documents/setup-sheets/${record.id}`,
      INSPECTION_PLAN: `/documents/inspection-plans/${record.id}`,
      SOP: `/documents/sops/${record.id}`,
      TOOL_DRAWING: `/documents/tool-drawings/${record.id}`,
      WORK_INSTRUCTION: `/work-instructions/${record.id}`,
    };

    navigate(routeMap[record.type]);
  };

  // Navigate to create new document
  const handleCreateDocument = (documentType: DocumentType) => {
    const routeMap: Record<DocumentType, string> = {
      SETUP_SHEET: '/documents/setup-sheets/create',
      INSPECTION_PLAN: '/documents/inspection-plans/create',
      SOP: '/documents/sops/create',
      TOOL_DRAWING: '/documents/tool-drawings/create',
      WORK_INSTRUCTION: '/work-instructions/create',
    };

    navigate(routeMap[documentType]);
  };

  const columns: ColumnsType<UnifiedDocument> = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: DocumentType) => (
        <Tag icon={DOCUMENT_TYPE_ICONS[type]} color="blue">
          {type.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Document Number',
      dataIndex: 'documentNumber',
      key: 'documentNumber',
      width: 150,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: 80,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => handleViewDocument(record)}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="documents-page">
      <div style={{ marginBottom: 24 }}>
        <h1>Document Management</h1>
        <p>Unified interface for managing all document types across the manufacturing process.</p>
      </div>

      {/* Document Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {documentStats.map(stat => (
          <Col span={6} key={stat.type}>
            <Card>
              <Statistic
                title={stat.type.replace('_', ' ')}
                value={stat.count}
                prefix={DOCUMENT_TYPE_ICONS[stat.type]}
              />
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleCreateDocument(stat.type)}
              >
                Create New
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Search and Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Search
              placeholder="Search documents..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <Select
              mode="multiple"
              placeholder="Filter by document type"
              style={{ width: '100%' }}
              value={selectedTypes}
              onChange={setSelectedTypes}
            >
              <Option value="SETUP_SHEET">Setup Sheets</Option>
              <Option value="INSPECTION_PLAN">Inspection Plans</Option>
              <Option value="SOP">SOPs</Option>
              <Option value="TOOL_DRAWING">Tool Drawings</Option>
              <Option value="WORK_INSTRUCTION">Work Instructions</Option>
            </Select>
          </Col>
          <Col span={8}>
            <Select
              placeholder="Filter by status"
              style={{ width: '100%' }}
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="DRAFT">Draft</Option>
              <Option value="REVIEW">Under Review</Option>
              <Option value="APPROVED">Approved</Option>
              <Option value="REJECTED">Rejected</Option>
              <Option value="SUPERSEDED">Superseded</Option>
              <Option value="ARCHIVED">Archived</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Documents Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} documents`,
          }}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
};

export default DocumentsPage;