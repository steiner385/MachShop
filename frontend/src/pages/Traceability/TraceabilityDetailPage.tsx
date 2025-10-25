import React, { useState } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  Tabs,
  Alert,
  Breadcrumb,
} from 'antd';
import {
  SearchOutlined,
  BarcodeOutlined,
  ApartmentOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { GenealogyTreeVisualization } from '@/components/Traceability/GenealogyTreeVisualization';

const { Title, Text } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;

/**
 * Traceability Detail Page
 *
 * Route: /traceability/:serialNumber
 *
 * Displays complete traceability information for a serialized part:
 * - Genealogy tree visualization
 * - Forward traceability (where used)
 * - Backward traceability (materials used)
 * - Manufacturing history
 */
const TraceabilityDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { serialNumber: urlSerialNumber } = useParams<{ serialNumber: string }>();
  const [serialNumber, setSerialNumber] = useState<string>(urlSerialNumber || '');
  const [searchedSerial, setSearchedSerial] = useState<string>(urlSerialNumber || '');

  const handleSearch = (value: string) => {
    if (value.trim()) {
      setSearchedSerial(value.trim());
      navigate(`/traceability/${value.trim()}`);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item onClick={() => navigate('/dashboard')}>
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item onClick={() => navigate('/traceability')}>
          Traceability
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          {searchedSerial || 'Search Serial Number'}
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Space align="center" style={{ marginBottom: '12px' }}>
          <ApartmentOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
          <Title level={2} style={{ margin: 0 }}>
            Product Genealogy & Traceability
          </Title>
        </Space>
        <Text type="secondary">
          Complete traceability visualization showing component relationships and material genealogy.
        </Text>
      </div>

      {/* Search */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>Search by Serial Number</Text>
          <Search
            placeholder="Enter serial number (e.g., SN-20251015-000001-7)"
            allowClear
            enterButton={
              <Button type="primary" icon={<SearchOutlined />}>
                Search
              </Button>
            }
            size="large"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            onSearch={handleSearch}
            prefix={<BarcodeOutlined />}
            style={{ maxWidth: 600 }}
          />
        </Space>
      </Card>

      {/* Results */}
      {searchedSerial ? (
        <Tabs defaultActiveKey="genealogy" type="card">
          <TabPane
            tab={
              <span>
                <ApartmentOutlined />
                Genealogy Tree
              </span>
            }
            key="genealogy"
          >
            <GenealogyTreeVisualization
              serialNumber={searchedSerial}
              maxDepth={5}
              width={1200}
              height={700}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <SearchOutlined />
                Forward Traceability
              </span>
            }
            key="forward"
          >
            <Card>
              <Alert
                message="Forward Traceability"
                description="Shows where this material/lot was used in finished products. (To be implemented)"
                type="info"
                showIcon
              />
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <SearchOutlined />
                Backward Traceability
              </span>
            }
            key="backward"
          >
            <Card>
              <Alert
                message="Backward Traceability"
                description="Shows all materials and components used to make this product. (To be implemented)"
                type="info"
                showIcon
              />
            </Card>
          </TabPane>
        </Tabs>
      ) : (
        <Card>
          <Alert
            message="No Serial Number Entered"
            description="Please enter a serial number in the search box above to view traceability information."
            type="info"
            showIcon
          />
        </Card>
      )}
    </div>
  );
};

export default TraceabilityDetailPage;
