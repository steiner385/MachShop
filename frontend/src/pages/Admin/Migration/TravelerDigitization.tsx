/**
 * Traveler Digitization Page
 * Issue #36: Paper-Based Traveler Digitization - Phase 5
 *
 * Main page for OCR-based and manual traveler digitization
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tabs,
  Button,
  Upload,
  Space,
  message,
  Progress,
  Alert,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Spin,
  Drawer,
  Empty,
  Timeline,
  Badge
} from 'antd';
import {
  CloudUploadOutlined,
  FileImageOutlined,
  FormOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import TravelerEntryForm from '../../../components/Migration/TravelerEntryForm';
import type { TravelerFormData } from '../../../components/Migration/TravelerEntryForm';
import './TravelerDigitization.css';

interface DigitizedTraveler {
  id: string;
  workOrderNumber: string;
  partNumber: string;
  partDescription?: string;
  quantity: number;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'work_order_created';
  confidence: number;
  sourceFileName?: string;
  createdAt: string;
}

interface ProcessingResult {
  id: string;
  fileName: string;
  status: 'processing' | 'success' | 'failed';
  message?: string;
  travelerId?: string;
  progress: number;
}

/**
 * Status badge configuration
 */
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'draft': 'default',
    'pending_review': 'processing',
    'approved': 'success',
    'rejected': 'error',
    'work_order_created': 'success'
  };
  return colors[status] || 'default';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'draft': 'Draft',
    'pending_review': 'Pending Review',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'work_order_created': 'Work Order Created'
  };
  return labels[status] || status;
};

/**
 * Traveler Digitization Main Component
 */
const TravelerDigitizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('ocr');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [travelers, setTravelers] = useState<DigitizedTraveler[]>([]);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedTraveler, setSelectedTraveler] = useState<DigitizedTraveler | null>(null);
  const [loadingTravelers, setLoadingTravelers] = useState(false);

  /**
   * Load travelers list
   */
  const loadTravelers = useCallback(async () => {
    try {
      setLoadingTravelers(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/v1/migration/traveler-digitization/travelers');
      // const data = await response.json();
      // setTravelers(data.data);
      message.info('Travelers list loading - API integration pending');
    } catch (error) {
      message.error('Failed to load travelers');
    } finally {
      setLoadingTravelers(false);
    }
  }, []);

  /**
   * Load travelers on mount
   */
  useEffect(() => {
    loadTravelers();
  }, [loadTravelers]);

  /**
   * Handle OCR upload
   */
  const handleOCRUpload = useCallback(
    async (file: UploadFile) => {
      try {
        setUploading(true);

        const formData = new FormData();
        formData.append('document', file as unknown as Blob);

        // TODO: Replace with actual API call
        // const response = await fetch('/api/v1/migration/traveler-digitization/digitize', {
        //   method: 'POST',
        //   body: formData
        // });
        // const result = await response.json();

        message.success(`${file.name} processed successfully`);

        // Simulate processing result
        setProcessingResults(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            fileName: file.name,
            status: 'success',
            progress: 100,
            message: 'OCR processing completed'
          }
        ]);

        // Reload travelers
        await loadTravelers();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        message.error(`Failed to process ${file.name}: ${errorMsg}`);
        setProcessingResults(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            fileName: file.name,
            status: 'failed',
            progress: 0,
            message: errorMsg
          }
        ]);
      } finally {
        setUploading(false);
      }
    },
    [loadTravelers]
  );

  /**
   * Handle manual entry submission
   */
  const handleManualEntrySubmit = useCallback(
    async (data: TravelerFormData) => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch('/api/v1/migration/traveler-digitization/manual', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(data)
        // });
        // const result = await response.json();

        message.success('Traveler created successfully');

        // Reload travelers
        await loadTravelers();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(errorMsg);
      }
    },
    [loadTravelers]
  );

  /**
   * Download traveler as PDF
   */
  const handleDownload = useCallback((travelerId: string) => {
    message.info(`Downloading traveler ${travelerId}`);
    // TODO: Implement PDF download
  }, []);

  /**
   * Delete traveler
   */
  const handleDeleteTraveler = useCallback(async (travelerId: string) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/v1/migration/traveler-digitization/travelers/${travelerId}`, {
      //   method: 'DELETE'
      // });

      message.success('Traveler deleted');
      await loadTravelers();
    } catch (error) {
      message.error('Failed to delete traveler');
    }
  }, [loadTravelers]);

  /**
   * Travelers table columns
   */
  const travelersColumns = [
    {
      title: 'Work Order',
      dataIndex: 'workOrderNumber',
      key: 'workOrderNumber',
      width: 150,
      render: (text: string) => (
        <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{text}</span>
      )
    },
    {
      title: 'Part Number',
      dataIndex: 'partNumber',
      key: 'partNumber',
      width: 120
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'center' as const,
      render: (qty: number) => <strong>{qty}</strong>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusLabel(status)}
        </Tag>
      )
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 120,
      render: (confidence: number) => (
        <Progress
          type="circle"
          percent={Math.round(confidence * 100)}
          width={40}
          strokeColor={confidence > 0.8 ? '#52c41a' : confidence > 0.6 ? '#faad14' : '#ff7875'}
        />
      )
    },
    {
      title: 'Source',
      dataIndex: 'sourceFileName',
      key: 'sourceFileName',
      width: 150,
      render: (fileName: string) => fileName ? <FileImageOutlined /> : <FormOutlined />,
      align: 'center' as const
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: DigitizedTraveler) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => {
              setSelectedTraveler(record);
              setDetailsVisible(true);
            }}
          />
          <Button
            type="link"
            icon={<DownloadOutlined />}
            size="small"
            onClick={() => handleDownload(record.id)}
          />
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleDeleteTraveler(record.id)}
          />
        </Space>
      )
    }
  ];

  /**
   * Processing results timeline
   */
  const renderProcessingTimeline = () => {
    if (processingResults.length === 0) {
      return <Empty description="No processing results" />;
    }

    return (
      <Timeline
        items={processingResults.map(result => ({
          dot: result.status === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ExclamationCircleOutlined style={{ color: '#ff7875' }} />,
          children: (
            <div>
              <p>
                <strong>{result.fileName}</strong>
                <Tag
                  color={result.status === 'success' ? 'success' : 'error'}
                  style={{ marginLeft: 8 }}
                >
                  {result.status === 'success' ? 'Processed' : 'Failed'}
                </Tag>
              </p>
              {result.message && <p style={{ color: '#595959', fontSize: 12 }}>{result.message}</p>}
            </div>
          )
        }))}
      />
    );
  };

  return (
    <div className="traveler-digitization-page">
      {/* Page Header */}
      <Card className="page-header-card" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} sm={6}>
            <Statistic
              title="Total Travelers"
              value={travelers.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic
              title="Pending Review"
              value={travelers.filter(t => t.status === 'pending_review').length}
              suffix={`/ ${travelers.length}`}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic
              title="Approved"
              value={travelers.filter(t => t.status === 'approved').length}
              suffix={`/ ${travelers.length}`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic
              title="Work Orders Created"
              value={travelers.filter(t => t.status === 'work_order_created').length}
              suffix={`/ ${travelers.length}`}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Main Content Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'ocr',
            label: '📄 OCR Upload',
            children: (
              <Card>
                <Alert
                  message="OCR Document Upload"
                  description="Upload scanned paper documents (JPG, PNG, PDF) to automatically extract traveler information using optical character recognition."
                  type="info"
                  showIcon
                  style={{ marginBottom: 24 }}
                />

                <Upload.Dragger
                  accept=".jpg,.jpeg,.png,.pdf"
                  multiple
                  disabled={uploading}
                  onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                  customRequest={({ file, onSuccess, onError }) => {
                    handleOCRUpload(file as unknown as UploadFile)
                      .then(() => onSuccess?.({}, new XMLHttpRequest()))
                      .catch(error => onError?.(error));
                  }}
                  maxCount={10}
                >
                  <p className="ant-upload-drag-icon">
                    <CloudUploadOutlined style={{ fontSize: 48 }} />
                  </p>
                  <p className="ant-upload-text">Click or drag files to this area</p>
                  <p className="ant-upload-hint">
                    Support for JPG, PNG, and PDF files. Max 10 files per upload.
                  </p>
                </Upload.Dragger>

                {processingResults.length > 0 && (
                  <Card
                    title="Processing Results"
                    style={{ marginTop: 24 }}
                  >
                    {renderProcessingTimeline()}
                  </Card>
                )}
              </Card>
            )
          },
          {
            key: 'manual',
            label: '✏️ Manual Entry',
            children: (
              <TravelerEntryForm
                onSubmit={handleManualEntrySubmit}
                mode="create"
              />
            )
          },
          {
            key: 'list',
            label: '📋 Travelers List',
            children: (
              <Spin spinning={loadingTravelers}>
                <Table
                  columns={travelersColumns}
                  dataSource={travelers}
                  pagination={{
                    pageSize: 10,
                    total: travelers.length,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} travelers`
                  }}
                  rowKey="id"
                  scroll={{ x: 1200 }}
                  size="small"
                  locale={{ emptyText: <Empty description="No travelers found" /> }}
                />
              </Spin>
            )
          }
        ]}
      />

      {/* Traveler Details Drawer */}
      <Drawer
        title={selectedTraveler ? `Traveler: ${selectedTraveler.workOrderNumber}` : 'Details'}
        placement="right"
        onClose={() => {
          setDetailsVisible(false);
          setSelectedTraveler(null);
        }}
        open={detailsVisible}
        width={600}
      >
        {selectedTraveler && (
          <div className="traveler-details">
            <h3>Work Order Information</h3>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <label>Work Order Number</label>
                  <p>{selectedTraveler.workOrderNumber}</p>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <label>Part Number</label>
                  <p>{selectedTraveler.partNumber}</p>
                </div>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <label>Quantity</label>
                  <p>{selectedTraveler.quantity}</p>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <label>Status</label>
                  <p>
                    <Tag color={getStatusColor(selectedTraveler.status)}>
                      {getStatusLabel(selectedTraveler.status)}
                    </Tag>
                  </p>
                </div>
              </Col>
            </Row>

            <div className="detail-item">
              <label>Confidence Score</label>
              <Progress
                percent={Math.round(selectedTraveler.confidence * 100)}
                strokeColor={selectedTraveler.confidence > 0.8 ? '#52c41a' : selectedTraveler.confidence > 0.6 ? '#faad14' : '#ff7875'}
              />
            </div>

            {selectedTraveler.sourceFileName && (
              <div className="detail-item">
                <label>Source File</label>
                <p>{selectedTraveler.sourceFileName}</p>
              </div>
            )}

            <div className="detail-item">
              <label>Created</label>
              <p>{new Date(selectedTraveler.createdAt).toLocaleString()}</p>
            </div>

            <Space style={{ marginTop: 24, width: '100%' }} direction="vertical">
              <Button
                type="primary"
                block
                icon={<EyeOutlined />}
              >
                Review Details
              </Button>
              <Button
                block
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(selectedTraveler.id)}
              >
                Download PDF
              </Button>
              <Button
                danger
                block
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteTraveler(selectedTraveler.id)}
              >
                Delete
              </Button>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default TravelerDigitizationPage;
