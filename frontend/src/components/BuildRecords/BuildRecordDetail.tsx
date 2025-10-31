import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Table,
  Button,
  Space,
  Tag,
  Timeline,
  Tabs,
  Row,
  Col,
  Divider,
  Image,
  Typography,
  Badge,
  Progress,
  Alert,
  Tooltip,
  Modal,
  message,
  Dropdown,
  Menu,
  Popconfirm
} from 'antd';
import {
  DownloadOutlined,
  EditOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PictureOutlined,
  FileTextOutlined,
  UserOutlined,
  SettingOutlined,
  HistoryOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// Types based on our Prisma schema
interface BuildRecord {
  id: string;
  buildRecordNumber: string;
  workOrderId: string;
  workOrder: {
    id: string;
    orderNumber: string;
    engineSerial: string;
    engineModel: string;
    customer: string;
  };
  status: string;
  finalDisposition: string;
  startedAt: string;
  completedAt?: string;
  operatorId: string;
  operator: {
    id: string;
    name: string;
    email: string;
  };
  inspectorId?: string;
  inspector?: {
    id: string;
    name: string;
    email: string;
  };
  operations: BuildRecordOperation[];
  deviations: BuildDeviation[];
  photos: BuildRecordPhoto[];
  documents: BuildRecordDocument[];
  signatures: BuildRecordSignature[];
  statusHistory: BuildRecordStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

interface BuildRecordOperation {
  id: string;
  operationId: string;
  operation: {
    id: string;
    operationNumber: string;
    description: string;
    workCenterId: string;
    workCenter: {
      name: string;
    };
  };
  status: string;
  startedAt?: string;
  completedAt?: string;
  actualTimeMinutes?: number;
  standardTimeMinutes: number;
  operatorId?: string;
  operator?: {
    name: string;
  };
  inspectorId?: string;
  inspector?: {
    name: string;
  };
  notes?: string;
  toolsUsed: string[];
  partsUsed: any[];
  signatures: BuildRecordSignature[];
}

interface BuildDeviation {
  id: string;
  type: string;
  category: string;
  description: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  severity: string;
  status: string;
  detectedAt: string;
  detectedBy: string;
  approvals: any[];
}

interface BuildRecordPhoto {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  thumbnailPath?: string;
  operationId?: string;
  caption?: string;
  annotations?: any;
  takenAt: string;
  takenBy: string;
}

interface BuildRecordDocument {
  id: string;
  type: string;
  filename: string;
  originalName: string;
  filePath: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface BuildRecordSignature {
  id: string;
  type: string;
  signedAt: string;
  signedBy: string;
  signer: {
    name: string;
    email: string;
  };
  operationId?: string;
  comments?: string;
  isValid: boolean;
}

interface BuildRecordStatusHistory {
  id: string;
  status: string;
  changedAt: string;
  changedBy: string;
  changer: {
    name: string;
  };
  reason?: string;
}

const BuildRecordDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [buildRecord, setBuildRecord] = useState<BuildRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<BuildRecordPhoto | null>(null);
  const [generateBookLoading, setGenerateBookLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBuildRecord();
    }
  }, [id]);

  const fetchBuildRecord = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/build-records/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBuildRecord(data);
      } else {
        message.error('Failed to fetch build record details');
      }
    } catch (error) {
      console.error('Error fetching build record:', error);
      message.error('Error loading build record');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBuildBook = async () => {
    if (!buildRecord) return;

    try {
      setGenerateBookLoading(true);
      const response = await fetch(`/api/build-books/generate/${buildRecord.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BuildBook_${buildRecord.buildRecordNumber}_${buildRecord.workOrder.engineSerial}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        message.success('Build book generated and downloaded successfully');
      } else {
        message.error('Failed to generate build book');
      }
    } catch (error) {
      console.error('Error generating build book:', error);
      message.error('Error generating build book');
    } finally {
      setGenerateBookLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colorMap: { [key: string]: string } = {
      'PENDING': 'orange',
      'IN_PROGRESS': 'blue',
      'COMPLETED': 'green',
      'ON_HOLD': 'red',
      'CANCELLED': 'gray',
      'APPROVED': 'green',
      'REJECTED': 'red',
      'UNDER_REVIEW': 'orange'
    };
    return colorMap[status] || 'default';
  };

  const getDispositionIcon = (disposition: string) => {
    switch (disposition) {
      case 'ACCEPT':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'CONDITIONAL_ACCEPT':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'REJECT':
        return <ClockCircleOutlined style={{ color: '#f5222d' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const calculateProgress = (): number => {
    if (!buildRecord?.operations.length) return 0;
    const completedOps = buildRecord.operations.filter(op => op.status === 'COMPLETED').length;
    return Math.round((completedOps / buildRecord.operations.length) * 100);
  };

  const operationsColumns = [
    {
      title: 'Operation #',
      dataIndex: ['operation', 'operationNumber'],
      key: 'operationNumber',
      width: 120,
      sorter: (a: BuildRecordOperation, b: BuildRecordOperation) =>
        a.operation.operationNumber.localeCompare(b.operation.operationNumber),
    },
    {
      title: 'Description',
      dataIndex: ['operation', 'description'],
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Work Center',
      dataIndex: ['operation', 'workCenter', 'name'],
      key: 'workCenter',
      width: 150,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.replace('_', ' ')}</Tag>
      ),
    },
    {
      title: 'Operator',
      dataIndex: ['operator', 'name'],
      key: 'operator',
      width: 150,
    },
    {
      title: 'Time (min)',
      key: 'time',
      width: 120,
      render: (record: BuildRecordOperation) => (
        <span>
          {record.actualTimeMinutes || '--'} / {record.standardTimeMinutes}
          {record.actualTimeMinutes && record.actualTimeMinutes > record.standardTimeMinutes && (
            <Tooltip title="Over standard time">
              <ExclamationCircleOutlined style={{ color: '#faad14', marginLeft: 4 }} />
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      title: 'Signatures',
      key: 'signatures',
      width: 100,
      render: (record: BuildRecordOperation) => (
        <Badge count={record.signatures.length} showZero>
          <UserOutlined />
        </Badge>
      ),
    },
  ];

  const deviationColumns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'CRITICAL' ? 'red' : type === 'MAJOR' ? 'orange' : 'blue'}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 150,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <Tag color={severity === 'HIGH' ? 'red' : severity === 'MEDIUM' ? 'orange' : 'green'}>
          {severity}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.replace('_', ' ')}</Tag>
      ),
    },
    {
      title: 'Detected',
      dataIndex: 'detectedAt',
      key: 'detectedAt',
      width: 150,
      render: (date: string) => dayjs(date).format('MMM DD, YYYY HH:mm'),
    },
  ];

  const actionMenu = (
    <Menu>
      <Menu.Item key="edit" icon={<EditOutlined />}>
        Edit Build Record
      </Menu.Item>
      <Menu.Item key="print" icon={<PrinterOutlined />}>
        Print Summary
      </Menu.Item>
      <Menu.Item key="export" icon={<DownloadOutlined />}>
        Export Data
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="archive" disabled>
        Archive Record
      </Menu.Item>
    </Menu>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!buildRecord) {
    return <div>Build record not found</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              Build Record {buildRecord.buildRecordNumber}
              <Tag
                color={getStatusColor(buildRecord.status)}
                style={{ marginLeft: '16px' }}
              >
                {buildRecord.status.replace('_', ' ')}
              </Tag>
            </Title>
            <Text type="secondary">
              Engine: {buildRecord.workOrder.engineSerial} ({buildRecord.workOrder.engineModel})
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={generateBookLoading}
                onClick={handleGenerateBuildBook}
              >
                Generate Build Book
              </Button>
              <Dropdown overlay={actionMenu} placement="bottomRight">
                <Button icon={<SettingOutlined />}>
                  Actions
                </Button>
              </Dropdown>
            </Space>
          </Col>
        </Row>

        {/* Progress Bar */}
        <Progress
          percent={calculateProgress()}
          status={buildRecord.status === 'COMPLETED' ? 'success' : 'active'}
          style={{ marginTop: '16px' }}
        />
      </div>

      {/* Alert for deviations */}
      {buildRecord.deviations.length > 0 && (
        <Alert
          message={`${buildRecord.deviations.length} deviation(s) recorded`}
          description="This build record contains deviations that require review and approval."
          type="warning"
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      <Tabs defaultActiveKey="overview" size="large">
        {/* Overview Tab */}
        <TabPane tab="Overview" key="overview">
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card title="Build Record Information" size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Work Order">
                    {buildRecord.workOrder.orderNumber}
                  </Descriptions.Item>
                  <Descriptions.Item label="Engine Serial">
                    {buildRecord.workOrder.engineSerial}
                  </Descriptions.Item>
                  <Descriptions.Item label="Engine Model">
                    {buildRecord.workOrder.engineModel}
                  </Descriptions.Item>
                  <Descriptions.Item label="Customer">
                    {buildRecord.workOrder.customer}
                  </Descriptions.Item>
                  <Descriptions.Item label="Operator">
                    {buildRecord.operator.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="Inspector">
                    {buildRecord.inspector?.name || 'Not assigned'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Final Disposition">
                    <Space>
                      {getDispositionIcon(buildRecord.finalDisposition)}
                      {buildRecord.finalDisposition.replace('_', ' ')}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="Timeline" size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Started">
                    {dayjs(buildRecord.startedAt).format('MMM DD, YYYY HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Completed">
                    {buildRecord.completedAt
                      ? dayjs(buildRecord.completedAt).format('MMM DD, YYYY HH:mm')
                      : 'In progress'
                    }
                  </Descriptions.Item>
                  <Descriptions.Item label="Duration">
                    {buildRecord.completedAt
                      ? dayjs(buildRecord.completedAt).diff(dayjs(buildRecord.startedAt), 'hour', true).toFixed(1) + ' hours'
                      : dayjs().diff(dayjs(buildRecord.startedAt), 'hour', true).toFixed(1) + ' hours (ongoing)'
                    }
                  </Descriptions.Item>
                  <Descriptions.Item label="Last Updated">
                    {dayjs(buildRecord.updatedAt).format('MMM DD, YYYY HH:mm')}
                  </Descriptions.Item>
                </Descriptions>

                <Divider />

                {/* Statistics */}
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Title level={4} style={{ margin: 0 }}>
                        {buildRecord.operations.length}
                      </Title>
                      <Text type="secondary">Operations</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Title level={4} style={{ margin: 0 }}>
                        {buildRecord.deviations.length}
                      </Title>
                      <Text type="secondary">Deviations</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ textAlign: 'center' }}>
                      <Title level={4} style={{ margin: 0 }}>
                        {buildRecord.photos.length}
                      </Title>
                      <Text type="secondary">Photos</Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* Operations Tab */}
        <TabPane tab={`Operations (${buildRecord.operations.length})`} key="operations">
          <Table
            columns={operationsColumns}
            dataSource={buildRecord.operations}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            expandable={{
              expandedRowRender: (record: BuildRecordOperation) => (
                <div style={{ padding: '16px', background: '#fafafa' }}>
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {record.notes && (
                          <div>
                            <Text strong>Notes:</Text>
                            <Paragraph>{record.notes}</Paragraph>
                          </div>
                        )}

                        {record.toolsUsed.length > 0 && (
                          <div>
                            <Text strong>Tools Used:</Text>
                            <div style={{ marginTop: '8px' }}>
                              {record.toolsUsed.map((tool, index) => (
                                <Tag key={index}>{tool}</Tag>
                              ))}
                            </div>
                          </div>
                        )}

                        {record.signatures.length > 0 && (
                          <div>
                            <Text strong>Signatures:</Text>
                            <Timeline style={{ marginTop: '8px' }}>
                              {record.signatures.map((sig) => (
                                <Timeline.Item key={sig.id}>
                                  <Text>{sig.signer.name} - {sig.type}</Text>
                                  <br />
                                  <Text type="secondary">
                                    {dayjs(sig.signedAt).format('MMM DD, YYYY HH:mm')}
                                  </Text>
                                  {sig.comments && (
                                    <>
                                      <br />
                                      <Text italic>"{sig.comments}"</Text>
                                    </>
                                  )}
                                </Timeline.Item>
                              ))}
                            </Timeline>
                          </div>
                        )}
                      </Space>
                    </Col>
                  </Row>
                </div>
              ),
              rowExpandable: (record) => record.notes || record.toolsUsed.length > 0 || record.signatures.length > 0,
            }}
          />
        </TabPane>

        {/* Deviations Tab */}
        <TabPane
          tab={
            <Badge count={buildRecord.deviations.length} offset={[10, 0]}>
              Deviations
            </Badge>
          }
          key="deviations"
        >
          <Table
            columns={deviationColumns}
            dataSource={buildRecord.deviations}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
            expandable={{
              expandedRowRender: (record: BuildDeviation) => (
                <div style={{ padding: '16px', background: '#fafafa' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Root Cause:</Text>
                      <Paragraph>{record.rootCause || 'Not specified'}</Paragraph>
                    </div>
                    <div>
                      <Text strong>Corrective Action:</Text>
                      <Paragraph>{record.correctiveAction || 'Not specified'}</Paragraph>
                    </div>
                    <div>
                      <Text strong>Preventive Action:</Text>
                      <Paragraph>{record.preventiveAction || 'Not specified'}</Paragraph>
                    </div>
                  </Space>
                </div>
              ),
            }}
          />
        </TabPane>

        {/* Photos Tab */}
        <TabPane
          tab={
            <Badge count={buildRecord.photos.length} offset={[10, 0]}>
              <PictureOutlined /> Photos
            </Badge>
          }
          key="photos"
        >
          <Row gutter={[16, 16]}>
            {buildRecord.photos.map((photo) => (
              <Col xs={12} sm={8} md={6} lg={4} key={photo.id}>
                <Card
                  size="small"
                  cover={
                    <Image
                      src={photo.thumbnailPath || photo.filePath}
                      alt={photo.caption || photo.originalName}
                      style={{ height: '120px', objectFit: 'cover' }}
                      preview={false}
                      onClick={() => {
                        setSelectedPhoto(photo);
                        setPhotoModalVisible(true);
                      }}
                    />
                  }
                  actions={[
                    <DownloadOutlined key="download" />,
                    <EyeOutlined key="view" />
                  ]}
                >
                  <Card.Meta
                    title={photo.caption || 'Photo'}
                    description={
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {dayjs(photo.takenAt).format('MMM DD, HH:mm')}
                      </Text>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </TabPane>

        {/* Documents Tab */}
        <TabPane
          tab={
            <Badge count={buildRecord.documents.length} offset={[10, 0]}>
              <FileTextOutlined /> Documents
            </Badge>
          }
          key="documents"
        >
          <Table
            dataSource={buildRecord.documents}
            rowKey="id"
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Type',
                dataIndex: 'type',
                key: 'type',
                width: 120,
                render: (type: string) => <Tag>{type}</Tag>,
              },
              {
                title: 'Document Name',
                dataIndex: 'originalName',
                key: 'originalName',
              },
              {
                title: 'Uploaded By',
                dataIndex: 'uploadedBy',
                key: 'uploadedBy',
                width: 150,
              },
              {
                title: 'Upload Date',
                dataIndex: 'uploadedAt',
                key: 'uploadedAt',
                width: 180,
                render: (date: string) => dayjs(date).format('MMM DD, YYYY HH:mm'),
              },
              {
                title: 'Actions',
                key: 'actions',
                width: 100,
                render: () => (
                  <Space>
                    <Button type="link" size="small" icon={<DownloadOutlined />}>
                      Download
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </TabPane>

        {/* History Tab */}
        <TabPane tab={<><HistoryOutlined /> History</>} key="history">
          <Timeline>
            {buildRecord.statusHistory.map((history) => (
              <Timeline.Item key={history.id}>
                <div>
                  <Text strong>Status changed to {history.status.replace('_', ' ')}</Text>
                  <br />
                  <Text type="secondary">
                    {dayjs(history.changedAt).format('MMM DD, YYYY HH:mm')} by {history.changer.name}
                  </Text>
                  {history.reason && (
                    <>
                      <br />
                      <Text italic>Reason: {history.reason}</Text>
                    </>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </TabPane>
      </Tabs>

      {/* Photo Modal */}
      <Modal
        visible={photoModalVisible}
        title={selectedPhoto?.caption || selectedPhoto?.originalName}
        footer={null}
        onCancel={() => setPhotoModalVisible(false)}
        width={800}
      >
        {selectedPhoto && (
          <div>
            <Image
              src={selectedPhoto.filePath}
              alt={selectedPhoto.caption || selectedPhoto.originalName}
              style={{ width: '100%' }}
            />
            <div style={{ marginTop: '16px' }}>
              <Descriptions size="small" column={2}>
                <Descriptions.Item label="Taken">
                  {dayjs(selectedPhoto.takenAt).format('MMM DD, YYYY HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="Taken By">
                  {selectedPhoto.takenBy}
                </Descriptions.Item>
                <Descriptions.Item label="Operation">
                  {selectedPhoto.operationId ? `Operation ${selectedPhoto.operationId}` : 'General'}
                </Descriptions.Item>
                <Descriptions.Item label="File Size">
                  {/* File size would be calculated on backend */}
                  --
                </Descriptions.Item>
              </Descriptions>
              {selectedPhoto.caption && (
                <div style={{ marginTop: '8px' }}>
                  <Text strong>Caption:</Text>
                  <Paragraph>{selectedPhoto.caption}</Paragraph>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BuildRecordDetail;