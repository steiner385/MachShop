import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Input,
  Button,
  Typography,
  Tree,
  Timeline,
  Descriptions,
  Tag,
  Space,
  Table,
  Tabs,
  Alert,
  Divider,
  message,
  Spin
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
  BarcodeOutlined
} from '@ant-design/icons';
import { traceabilityApi, GenealogyNode, ManufacturingHistoryEntry, MaterialCertificate, QualityRecord } from '../../services/traceabilityApi';

const { Title, Text } = Typography;
const { Search } = Input;

const Traceability: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [traceabilityData, setTraceabilityData] = useState<any>(null);
  const [genealogy, setGenealogy] = useState<any[]>([]);
  const [manufacturingHistory, setManufacturingHistory] = useState<ManufacturingHistoryEntry[]>([]);
  const [materialCertificates, setMaterialCertificates] = useState<MaterialCertificate[]>([]);
  const [qualityRecords, setQualityRecords] = useState<QualityRecord[]>([]);

  // Set page title
  useEffect(() => {
    document.title = 'Material Traceability - Manufacturing Execution System';
  }, []);

  // Helper function to transform genealogy node to tree format
  const transformGenealogyToTree = (node: GenealogyNode): any => {
    return {
      title: `${node.serialNumber} (${node.partName})`,
      key: node.id,
      icon: <ApartmentOutlined />,
      children: node.children?.map(child => transformGenealogyToTree(child)) || []
    };
  };

  // These are removed - we now use real API data from state variables

  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      message.warning('Please enter a serial number to search');
      return;
    }

    try {
      setLoading(true);
      setSearchValue(value);

      // Fetch complete traceability data
      const data = await traceabilityApi.getTraceabilityBySerialNumber(value);

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

      // Transform genealogy tree
      if (data.genealogy) {
        setGenealogy([transformGenealogyToTree(data.genealogy)]);
      }

      // Set other data
      setManufacturingHistory(data.manufacturingHistory);
      setMaterialCertificates(data.materialCertificates);
      setQualityRecords(data.qualityRecords);

    } catch (error: any) {
      console.error('Failed to load traceability data:', error);
      if (error.response?.status === 404) {
        message.error('No traceability data found for this serial number');
      } else {
        message.error('Failed to load traceability data. Please try again.');
      }
      setTraceabilityData(null);
      setGenealogy([]);
      setManufacturingHistory([]);
      setMaterialCertificates([]);
      setQualityRecords([]);
    } finally {
      setLoading(false);
    }
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
      key: '1',
      label: 'Genealogy',
      children: (
        <Card title="Part Genealogy Tree">
          <Alert
            message="Component Breakdown"
            description="This tree shows the complete breakdown of components and materials that make up this part."
            type="info"
            style={{ marginBottom: 16 }}
          />
          {genealogy.length > 0 ? (
            <Tree
              showIcon
              defaultExpandAll
              treeData={genealogy}
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
      <Title level={2} style={{ marginBottom: 24 }}>
        Material Traceability
      </Title>

      {/* Search Section */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={18}>
            <Search
              placeholder="Enter serial number, lot number, or work order..."
              allowClear
              enterButton={<Button type="primary" icon={<SearchOutlined />}>Search</Button>}
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

      {/* Results Section */}
      {traceabilityData && (
        <>
          {/* Part Information */}
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

          {/* Detailed Traceability Information */}
          <Card>
            <Tabs defaultActiveKey="1" items={tabItems} />
          </Card>
        </>
      )}

      {/* No Results State */}
      {!traceabilityData && searchValue && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <QrcodeOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
            <Title level={3} style={{ color: '#999' }}>
              No traceability data found
            </Title>
            <Text type="secondary">
              Please check your search term and try again
            </Text>
          </div>
        </Card>
      )}

      {/* Initial State */}
      {!traceabilityData && !searchValue && (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <QrcodeOutlined style={{ fontSize: 80, color: '#1890ff' }} />
            <Title level={3} style={{ marginTop: 16 }}>
              Search for Part Traceability
            </Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
              Enter a serial number, lot number, or work order to view complete traceability information
            </Text>
            <Divider />
            <Space size="large">
              <div style={{ textAlign: 'center' }}>
                <ApartmentOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                <div style={{ marginTop: 8 }}>
                  <Text strong>Genealogy</Text>
                  <br />
                  <Text type="secondary">Component breakdown</Text>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <HistoryOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <div style={{ marginTop: 8 }}>
                  <Text strong>History</Text>
                  <br />
                  <Text type="secondary">Manufacturing timeline</Text>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <FileTextOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                <div style={{ marginTop: 8 }}>
                  <Text strong>Certificates</Text>
                  <br />
                  <Text type="secondary">Material documentation</Text>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <ExperimentOutlined style={{ fontSize: 24, color: '#faad14' }} />
                <div style={{ marginTop: 8 }}>
                  <Text strong>Quality</Text>
                  <br />
                  <Text type="secondary">Inspection records</Text>
                </div>
              </div>
            </Space>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Traceability;