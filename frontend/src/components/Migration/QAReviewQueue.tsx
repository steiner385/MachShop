/**
 * QA Review Queue Component
 * Issue #36: Paper-Based Traveler Digitization - Phase 6
 *
 * Displays and manages the review queue for travelers awaiting approval
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Card,
  Empty,
  Progress,
  Modal,
  Spin,
  message,
  Drawer,
  Row,
  Col,
  Statistic,
  Timeline,
  Tooltip,
  Badge,
  Select,
  Input
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
  SortAscendingOutlined
} from '@ant-design/icons';
import './QAReviewQueue.css';

interface DigitizedTraveler {
  id: string;
  workOrderNumber: string;
  partNumber: string;
  partDescription?: string;
  quantity: number;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'work_order_created';
  confidence: number;
  sourceFileName?: string;
  sourceUploadedAt?: string;
  createdAt: string;
  extractedFrom?: {
    templateName: string;
    matchConfidence: number;
  };
  errors?: string[];
  warnings?: string[];
  operationCount?: number;
}

interface QAReviewQueueProps {
  onApprove?: (travelerId: string, corrections?: any) => Promise<void>;
  onReject?: (travelerId: string, reason?: string) => Promise<void>;
  onEdit?: (travelerId: string) => void;
  onDelete?: (travelerId: string) => Promise<void>;
  refreshTrigger?: number;
}

/**
 * QA Review Queue Component
 */
const QAReviewQueue: React.FC<QAReviewQueueProps> = ({
  onApprove,
  onReject,
  onEdit,
  onDelete,
  refreshTrigger
}) => {
  const [queue, setQueue] = useState<DigitizedTraveler[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTraveler, setSelectedTraveler] = useState<DigitizedTraveler | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [filterConfidence, setFilterConfidence] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'confidence' | 'date'>('date');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  /**
   * Load review queue
   */
  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/v1/migration/traveler-digitization/review-queue');
      // const data = await response.json();
      // setQueue(data.data);

      // Mock data for demonstration
      const mockQueue: DigitizedTraveler[] = [
        {
          id: 'traveler_1',
          workOrderNumber: 'WO001234',
          partNumber: 'P001',
          partDescription: 'Control Panel Assembly',
          quantity: 50,
          status: 'pending_review',
          confidence: 0.92,
          sourceFileName: 'traveler_001.jpg',
          sourceUploadedAt: '2025-11-01T10:30:00Z',
          createdAt: '2025-11-01T10:35:00Z',
          extractedFrom: {
            templateName: 'Standard Traveler',
            matchConfidence: 0.92
          },
          operationCount: 5,
          warnings: []
        },
        {
          id: 'traveler_2',
          workOrderNumber: 'WO001235',
          partNumber: 'P002',
          partDescription: 'Motor Assembly',
          quantity: 25,
          status: 'pending_review',
          confidence: 0.78,
          sourceFileName: 'traveler_002.jpg',
          sourceUploadedAt: '2025-11-01T11:00:00Z',
          createdAt: '2025-11-01T11:05:00Z',
          extractedFrom: {
            templateName: 'Standard Traveler',
            matchConfidence: 0.78
          },
          operationCount: 3,
          warnings: ['Low confidence on part description']
        }
      ];

      setQueue(mockQueue);
    } catch (error) {
      message.error('Failed to load review queue');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load queue on mount and when refreshTrigger changes
   */
  useEffect(() => {
    loadQueue();
  }, [loadQueue, refreshTrigger]);

  /**
   * Filter and sort queue
   */
  const getFilteredQueue = useCallback(() => {
    let filtered = [...queue];

    // Filter by confidence level
    if (filterConfidence !== 'all') {
      if (filterConfidence === 'high') {
        filtered = filtered.filter(t => t.confidence >= 0.8);
      } else if (filterConfidence === 'medium') {
        filtered = filtered.filter(t => t.confidence >= 0.6 && t.confidence < 0.8);
      } else if (filterConfidence === 'low') {
        filtered = filtered.filter(t => t.confidence < 0.6);
      }
    }

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(t =>
        t.workOrderNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        t.partNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        (t.partDescription?.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    // Sort
    if (sortBy === 'confidence') {
      filtered.sort((a, b) => a.confidence - b.confidence); // Low confidence first (needs attention)
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return filtered;
  }, [queue, filterConfidence, searchText, sortBy]);

  /**
   * Handle approve
   */
  const handleApprove = useCallback(async (travelerId: string) => {
    Modal.confirm({
      title: 'Approve Traveler',
      content: 'Are you sure you want to approve this traveler?',
      okText: 'Approve',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setApproving(true);
          if (onApprove) {
            await onApprove(travelerId);
          }
          message.success('Traveler approved');
          await loadQueue();
        } catch (error) {
          message.error('Failed to approve traveler');
        } finally {
          setApproving(false);
        }
      }
    });
  }, [onApprove, loadQueue]);

  /**
   * Handle reject
   */
  const handleReject = useCallback((travelerId: string) => {
    Modal.confirm({
      title: 'Reject Traveler',
      content: 'Are you sure you want to reject this traveler?',
      okText: 'Reject',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setRejecting(true);
          if (onReject) {
            await onReject(travelerId);
          }
          message.success('Traveler rejected');
          await loadQueue();
        } catch (error) {
          message.error('Failed to reject traveler');
        } finally {
          setRejecting(false);
        }
      }
    });
  }, [onReject, loadQueue]);

  /**
   * Handle delete
   */
  const handleDelete = useCallback((travelerId: string) => {
    Modal.confirm({
      title: 'Delete Traveler',
      content: 'Are you sure you want to delete this traveler?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          if (onDelete) {
            await onDelete(travelerId);
          }
          message.success('Traveler deleted');
          await loadQueue();
        } catch (error) {
          message.error('Failed to delete traveler');
        }
      }
    });
  }, [onDelete, loadQueue]);

  /**
   * Review queue columns
   */
  const columns = [
    {
      title: 'Priority',
      key: 'priority',
      width: 80,
      render: (_: any, record: DigitizedTraveler) => {
        let color = 'green';
        if (record.confidence < 0.6) color = 'red';
        else if (record.confidence < 0.8) color = 'orange';
        return <Badge color={color} text={`${Math.round(record.confidence * 100)}%`} />;
      }
    },
    {
      title: 'Work Order',
      dataIndex: 'workOrderNumber',
      key: 'workOrderNumber',
      width: 140,
      render: (text: string) => (
        <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{text}</span>
      )
    },
    {
      title: 'Part Number',
      dataIndex: 'partNumber',
      key: 'partNumber',
      width: 120,
      render: (text: string, record: DigitizedTraveler) => (
        <Tooltip title={record.partDescription}>{text}</Tooltip>
      )
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
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 140,
      render: (confidence: number) => (
        <Progress
          percent={Math.round(confidence * 100)}
          size="small"
          strokeColor={confidence > 0.8 ? '#52c41a' : confidence > 0.6 ? '#faad14' : '#ff7875'}
        />
      )
    },
    {
      title: 'Source',
      key: 'source',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: DigitizedTraveler) => {
        if (record.sourceFileName) {
          return <Tooltip title={record.sourceFileName}>📄 OCR</Tooltip>;
        }
        return <Tooltip title="Manual entry">✏️ Manual</Tooltip>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: DigitizedTraveler) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedTraveler(record);
              setDetailsVisible(true);
            }}
          />
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleApprove(record.id)}
            loading={approving}
          >
            Approve
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => handleReject(record.id)}
            loading={rejecting}
          >
            Reject
          </Button>
        </Space>
      )
    }
  ];

  const filteredQueue = getFilteredQueue();

  return (
    <div className="qa-review-queue">
      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Pending Review"
              value={queue.length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Low Confidence"
              value={queue.filter(t => t.confidence < 0.6).length}
              valueStyle={{ color: '#ff7875' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Medium Confidence"
              value={queue.filter(t => t.confidence >= 0.6 && t.confidence < 0.8).length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="High Confidence"
              value={queue.filter(t => t.confidence >= 0.8).length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap style={{ width: '100%' }}>
          <Input.Search
            placeholder="Search by WO or part number..."
            prefix={<FilterOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Select
            value={filterConfidence}
            onChange={setFilterConfidence}
            style={{ width: 150 }}
          >
            <Select.Option value="all">All Confidence</Select.Option>
            <Select.Option value="high">High (≥80%)</Select.Option>
            <Select.Option value="medium">Medium (60-80%)</Select.Option>
            <Select.Option value="low">Low (<60%)</Select.Option>
          </Select>
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 150 }}
            prefix={<SortAscendingOutlined />}
          >
            <Select.Option value="date">Newest First</Select.Option>
            <Select.Option value="confidence">Lowest Confidence</Select.Option>
          </Select>
          <Button onClick={loadQueue} loading={loading}>
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Review Queue Table */}
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={filteredQueue}
          pagination={{
            pageSize: 10,
            total: filteredQueue.length,
            showSizeChanger: true,
            showTotal: (total) => `${total} travelers pending review`
          }}
          rowKey="id"
          scroll={{ x: 1400 }}
          size="middle"
          locale={{ emptyText: <Empty description="No travelers pending review" /> }}
          className="review-queue-table"
        />
      </Spin>

      {/* Details Drawer */}
      <Drawer
        title={selectedTraveler ? `Review: ${selectedTraveler.workOrderNumber}` : 'Details'}
        placement="right"
        onClose={() => {
          setDetailsVisible(false);
          setSelectedTraveler(null);
        }}
        open={detailsVisible}
        width={600}
        footer={
          selectedTraveler && (
            <Space style={{ float: 'right' }}>
              <Button onClick={() => setDetailsVisible(false)}>Cancel</Button>
              <Button
                danger
                onClick={() => {
                  handleReject(selectedTraveler.id);
                  setDetailsVisible(false);
                }}
              >
                Reject
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  handleApprove(selectedTraveler.id);
                  setDetailsVisible(false);
                }}
              >
                Approve
              </Button>
            </Space>
          )
        }
      >
        {selectedTraveler && (
          <div className="traveler-review-details">
            <h3>Traveler Information</h3>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <label>Work Order</label>
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

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <label>Quantity</label>
                  <p>{selectedTraveler.quantity}</p>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className="detail-item">
                  <label>Operations</label>
                  <p>{selectedTraveler.operationCount || 'N/A'}</p>
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

            {selectedTraveler.warnings && selectedTraveler.warnings.length > 0 && (
              <div className="detail-item">
                <label>Warnings</label>
                <Timeline
                  items={selectedTraveler.warnings.map(warning => ({
                    color: 'orange',
                    children: <p>{warning}</p>
                  }))}
                />
              </div>
            )}

            {selectedTraveler.sourceFileName && (
              <div className="detail-item">
                <label>Source File</label>
                <p>{selectedTraveler.sourceFileName}</p>
              </div>
            )}

            <div className="detail-item">
              <label>Extracted From</label>
              <p>{selectedTraveler.extractedFrom?.templateName || 'Manual Entry'}</p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default QAReviewQueue;
export type { DigitizedTraveler };
