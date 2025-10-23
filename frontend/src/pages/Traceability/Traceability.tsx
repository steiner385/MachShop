import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Input,
  Button,
  Typography,
  Timeline,
  Descriptions,
  Tag,
  Space,
  Table,
  Tabs,
  Alert,
  Divider,
  message,
} from 'antd';
import {
  QrcodeOutlined,
  SearchOutlined,
  ApartmentOutlined,
  HistoryOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ToolOutlined,
  UserOutlined,
  CalendarOutlined,
  BarcodeOutlined,
} from '@ant-design/icons';
import { traceabilityApi, ManufacturingHistoryEntry, MaterialCertificate, QualityRecord } from '../../services/traceabilityApi';
import { GenealogyTreeVisualization } from '@/components/Traceability/GenealogyTreeVisualization';
import { safeAPICall } from '@/utils/apiErrorHandler';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Search } = Input;

const Traceability: React.FC = () => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traceabilityData, setTraceabilityData] = useState<any>(null);
  const [manufacturingHistory, setManufacturingHistory] = useState<ManufacturingHistoryEntry[]>([]);
  const [materialCertificates, setMaterialCertificates] = useState<MaterialCertificate[]>([]);
  const [qualityRecords, setQualityRecords] = useState<QualityRecord[]>([]);

  // Forward/backward traceability states
  const [forwardSearchValue, setForwardSearchValue] = useState('');
  const [forwardResults, setForwardResults] = useState<any[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [backwardSearchValue, setBackwardSearchValue] = useState('');
  const [backwardResults, setBackwardResults] = useState<any[]>([]);
  const [backwardLoading, setBackwardLoading] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = 'Material Traceability - Manufacturing Execution System';
  }, []);

  const handleForwardTraceability = async (lotNumber: string) => {
    if (!lotNumber.trim()) {
      message.warning('Please enter a lot number');
      return;
    }

    setForwardLoading(true);
    setForwardSearchValue(lotNumber);

    const result = await safeAPICall(
      () => traceabilityApi.getForwardTraceability(lotNumber),
      {
        errorMessage: `Failed to search for lot number ${lotNumber}`,
        onError: (error) => {
          setForwardResults([]);
          if (error.response?.status === 404) {
            message.error(`Lot number ${lotNumber} not found`);
          }
        }
      }
    );

    if (result) {
      if (result.usedInParts && result.usedInParts.length > 0) {
        // Format data for display in table
        const formattedResults = result.usedInParts.map((part: any, index: number) => ({
          key: `${part.serialNumber}-${index}`,
          serialNumber: part.serialNumber,
          partNumber: part.partNumber,
          status: 'ACTIVE', // Would come from API
          date: part.dateUsed ? new Date(part.dateUsed).toLocaleDateString() : 'N/A'
        }));
        setForwardResults(formattedResults);
        message.success(`Found ${formattedResults.length} products using lot ${lotNumber}`);
      } else {
        setForwardResults([]);
        message.info('No products found using this lot number');
      }
    }

    setForwardLoading(false);
  };

  const handleBackwardTraceability = async (serialNumber: string) => {
    if (!serialNumber.trim()) {
      message.warning('Please enter a serial number');
      return;
    }

    setBackwardLoading(true);
    setBackwardSearchValue(serialNumber);

    const result = await safeAPICall(
      () => traceabilityApi.getBackwardTraceability(serialNumber),
      {
        errorMessage: `Failed to search for serial number ${serialNumber}`,
        onError: (error) => {
          setBackwardResults([]);
          if (error.response?.status === 404) {
            message.error(`Serial number ${serialNumber} not found`);
          }
        }
      }
    );

    if (result) {
      if (result.components && result.components.length > 0) {
        // Format data for display in table
        const formattedResults = result.components.map((component: any, index: number) => ({
          key: `${component.serialNumber || component.lotNumber}-${index}`,
          material: component.partName || component.partNumber || 'Unknown',
          lotNumber: component.lotNumber || 'N/A',
          supplier: component.supplier || 'N/A',
          certificate: component.certificateNumber || 'N/A'
        }));
        setBackwardResults(formattedResults);
        message.success(`Found ${formattedResults.length} components/materials for serial ${serialNumber}`);
      } else {
        setBackwardResults([]);
        message.info('No component data found for this serial number');
      }
    }

    setBackwardLoading(false);
  };

  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      message.warning('Please enter a serial number to search');
      return;
    }

    setLoading(true);
    setSearchValue(value);
    setError(null); // Clear any previous errors

    // Fetch complete traceability data
    const data = await safeAPICall(
      () => traceabilityApi.getTraceabilityBySerialNumber(value),
      {
        onError: (error) => {
          const errorMessage = error.response?.status === 404
            ? 'No traceability data found for this serial number'
            : 'Failed to load traceability data. Please try again.';

          setError(errorMessage);
          setTraceabilityData(null);
          setManufacturingHistory([]);
          setMaterialCertificates([]);
          setQualityRecords([]);
        }
      }
    );

    if (data) {
      // Set the basic part information
      setTraceabilityData({
        serialNumber: data.serialNumber,
        partNumber: data.partNumber,
        partName: data.partName,
        lotNumber: data.genealogy.lotNumber,
        status: 'IN_SERVICE', // Would come from API in real system
        currentLocation: 'See tracking system', // Would come from API
        workOrder: data.manufacturingHistory[0]?.workOrderNumber || 'N/A',
        customer: 'See order system', // Would come from API
        manufactureDate: data.manufacturingHistory[0]?.startTime || new Date().toISOString(),
        heatNumber: data.materialCertificates[0]?.heatNumber || 'N/A',
        materialCert: data.materialCertificates[0]?.certificateNumber || 'N/A'
      });

      // Set data
      setManufacturingHistory(data.manufacturingHistory);
      setMaterialCertificates(data.materialCertificates);
      setQualityRecords(data.qualityRecords);
    }

    setLoading(false);
  };

  const materialColumns = [
    {
      title: 'Certificate #',
      dataIndex: 'certNumber',
      key: 'certNumber',
    },
    {
      title: 'Material',
      dataIndex: 'material',
      key: 'material',
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
    },
    {
      title: 'Heat/Batch #',
      key: 'batch',
      render: (record: any) => record.heatNumber || record.batchNumber,
    },
    {
      title: 'Certification',
      dataIndex: 'certification',
      key: 'certification',
    },
    {
      title: 'Expiry',
      dataIndex: 'expiry',
      key: 'expiry',
    },
  ];

  const qualityColumns = [
    {
      title: 'Inspection ID',
      dataIndex: 'inspectionId',
      key: 'inspectionId',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      render: (result: string) => (
        <Tag color={result === 'PASS' ? 'green' : 'red'}>
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
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Details',
      dataIndex: 'characteristics',
      key: 'characteristics',
    },
  ];

  const tabItems = [
    {
      key: 'forward',
      label: 'Forward Traceability',
      children: (
        <Card title="Forward Traceability (Lot to Products)">
          <Alert
            message="Forward Traceability"
            description="Track where materials from a specific lot number were used. Enter a lot number to see all products that contain materials from that lot."
            type="info"
            style={{ marginBottom: 16 }}
          />
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Search
              placeholder="Enter lot number (e.g., LOT-20251015-001)"
              allowClear
              enterButton={<Button type="primary" icon={<SearchOutlined />} data-testid="forward-search-button">Search</Button>}
              size="large"
              onSearch={handleForwardTraceability}
              loading={forwardLoading}
            />
            {forwardSearchValue && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">
                  Search results for lot: {forwardSearchValue}
                </Text>
                <Table
                  dataSource={forwardResults}
                  columns={[
                    { title: 'Product Serial Number', dataIndex: 'serialNumber', key: 'serialNumber' },
                    { title: 'Part Number', dataIndex: 'partNumber', key: 'partNumber' },
                    { title: 'Status', dataIndex: 'status', key: 'status' },
                    { title: 'Date', dataIndex: 'date', key: 'date' }
                  ]}
                  pagination={false}
                  size="small"
                  locale={{ emptyText: 'No data - Forward traceability feature implemented, API integration pending' }}
                />
              </div>
            )}
          </Space>
        </Card>
      ),
    },
    {
      key: 'backward',
      label: 'Backward Traceability',
      children: (
        <Card title="Backward Traceability (Serial to Materials)">
          <Alert
            message="Backward Traceability"
            description="Track all materials and components used to manufacture a specific product. Enter a serial number to see its complete material genealogy."
            type="info"
            style={{ marginBottom: 16 }}
          />
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Search
              placeholder="Enter serial number (e.g., SN-20251015-000001-7)"
              allowClear
              enterButton={<Button type="primary" icon={<SearchOutlined />} data-testid="backward-search-button">Search</Button>}
              size="large"
              onSearch={handleBackwardTraceability}
              loading={backwardLoading}
            />
            {backwardSearchValue && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">
                  Search results for serial: {backwardSearchValue}
                </Text>
                <Table
                  dataSource={backwardResults}
                  columns={[
                    { title: 'Material/Component', dataIndex: 'material', key: 'material' },
                    { title: 'Lot Number', dataIndex: 'lotNumber', key: 'lotNumber' },
                    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier' },
                    { title: 'Certificate', dataIndex: 'certificate', key: 'certificate' }
                  ]}
                  pagination={false}
                  size="small"
                  locale={{ emptyText: 'No data - Backward traceability feature implemented, API integration pending' }}
                />
              </div>
            )}
          </Space>
        </Card>
      ),
    },
    {
      key: '1',
      label: 'Genealogy',
      children: (
        <Card title="Part Genealogy Tree">
          <Alert
            message="Component Breakdown"
            description="This interactive tree shows the complete breakdown of components and materials that make up this part. Use zoom/pan controls to navigate."
            type="info"
            style={{ marginBottom: 16 }}
          />
          {traceabilityData?.serialNumber ? (
            <GenealogyTreeVisualization
              serialNumber={traceabilityData.serialNumber}
              maxDepth={5}
              width={1200}
              height={600}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              No genealogy data available
            </div>
          )}
        </Card>
      ),
    },
    {
      key: '2',
      label: 'Manufacturing History',
      children: (
        <Card title="Manufacturing History">
          {manufacturingHistory.length > 0 ? (
            <Timeline
              items={manufacturingHistory.map((item) => ({
                key: `${item.id}-${item.operationNumber}`,
                color: item.status === 'COMPLETED' ? 'green' : 'orange',
                children: (
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      Operation {item.operationNumber}: {item.operationName}
                    </div>
                    <Space size="small" style={{ marginBottom: 4 }}>
                      <UserOutlined />
                      <Text type="secondary">{item.operatorName || item.operatorId}</Text>
                      {item.machineName && (
                        <>
                          <ToolOutlined />
                          <Text type="secondary">{item.machineName}</Text>
                        </>
                      )}
                      <CalendarOutlined />
                      <Text type="secondary">{new Date(item.startTime).toLocaleString()}</Text>
                    </Space>
                    {item.notes && (
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                )
              }))}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              No manufacturing history available
            </div>
          )}
        </Card>
      ),
    },
    {
      key: '3',
      label: 'Material Certificates',
      children: (
        <Card title="Material Certificates">
          <Table
            dataSource={materialCertificates.map(cert => ({
              key: cert.id,
              certNumber: cert.certificateNumber,
              material: cert.materialType,
              supplier: cert.supplierName,
              heatNumber: cert.heatNumber,
              batchNumber: cert.lotNumber,
              certification: 'See Certificate', // Would be in API
              expiry: cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'N/A'
            }))}
            columns={materialColumns}
            pagination={false}
            size="small"
          />
        </Card>
      ),
    },
    {
      key: '4',
      label: 'Quality Records',
      children: (
        <Card title="Quality Records">
          <Table
            dataSource={qualityRecords.map(qr => ({
              key: qr.id,
              inspectionId: qr.id,
              type: qr.inspectionType,
              result: qr.result,
              inspector: qr.inspector,
              date: new Date(qr.inspectionDate).toLocaleString(),
              characteristics: qr.notes || 'See inspection details'
            }))}
            columns={qualityColumns}
            pagination={false}
            size="small"
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      {/* Header with Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Material Traceability
        </Title>
        <Space>
          <Button
            icon={<BarcodeOutlined />}
            onClick={() => navigate('/serialization')}
          >
            Manage Serial Numbers
          </Button>
        </Space>
      </div>

      {/* Search Section */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={18}>
            <Search
              placeholder="Enter serial number, lot number or work order to search"
              allowClear
              enterButton={<Button type="primary" icon={<SearchOutlined />} data-testid="main-search-button">Search</Button>}
              size="large"
              onSearch={handleSearch}
              loading={loading}
            />
          </Col>
          <Col xs={24} md={6}>
            <Button icon={<QrcodeOutlined />} size="large" style={{ width: '100%' }}>
              Scan QR Code
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
          showIcon
        />
      )}

      {/* Initial state - Welcome message with feature highlights */}
      {!traceabilityData && !loading && !error && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Title level={3}>Search for Part Traceability</Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
              Enter a serial number, lot number, or work order to view complete traceability information
            </Text>
            <Divider />
            <Row gutter={[24, 24]} style={{ marginTop: 32 }}>
              <Col xs={24} sm={12} md={6}>
                <div style={{ textAlign: 'center' }}>
                  <ApartmentOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                  <div style={{ fontWeight: 500 }}>Genealogy</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Component breakdown</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div style={{ textAlign: 'center' }}>
                  <HistoryOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                  <div style={{ fontWeight: 500 }}>History</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Manufacturing operations</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div style={{ textAlign: 'center' }}>
                  <FileTextOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                  <div style={{ fontWeight: 500 }}>Certificates</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Material certifications</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div style={{ textAlign: 'center' }}>
                  <ExperimentOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                  <div style={{ fontWeight: 500 }}>Quality</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Inspection records</Text>
                </div>
              </Col>
            </Row>
          </div>
        </Card>
      )}

      {/* Part Information - Only show when traceabilityData exists */}
      {traceabilityData && (
        <Card title="Part Information" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Serial Number">
                  <Text strong>{traceabilityData.serialNumber}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Part Number">
                  {traceabilityData.partNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Part Name">
                  {traceabilityData.partName}
                </Descriptions.Item>
                <Descriptions.Item label="Lot Number">
                  {traceabilityData.lotNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Work Order">
                  {traceabilityData.workOrder}
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col xs={24} lg={12}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Status">
                  <Tag color="green">{traceabilityData.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Current Location">
                  {traceabilityData.currentLocation}
                </Descriptions.Item>
                <Descriptions.Item label="Customer">
                  {traceabilityData.customer}
                </Descriptions.Item>
                <Descriptions.Item label="Manufacture Date">
                  {traceabilityData.manufactureDate}
                </Descriptions.Item>
                <Descriptions.Item label="Heat Number">
                  {traceabilityData.heatNumber}
                </Descriptions.Item>
              </Descriptions>
            </Col>
          </Row>
        </Card>
      )}

      {/* Traceability Tabs - Always visible */}
      <Card>
        <Tabs defaultActiveKey="forward" items={tabItems} />
      </Card>
    </div>
  );
};

export default Traceability;