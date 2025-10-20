import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, Typography, Button, Descriptions, Tag, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface Inspection {
  id: string;
  inspectionNumber: string;
  status: string;
  partNumber: string;
  lotNumber: string;
  inspector: string;
  datePerformed: string;
  result: string;
}

const InspectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [inspection, setInspection] = useState<Inspection | null>(null);

  useEffect(() => {
    // Placeholder - In a real implementation, this would fetch from API
    setLoading(true);
    setTimeout(() => {
      setInspection({
        id: id || '',
        inspectionNumber: `INS-${id}`,
        status: 'PASSED',
        partNumber: 'TB-450-001',
        lotNumber: 'LOT-2024-001',
        inspector: 'John Doe',
        datePerformed: new Date().toISOString().split('T')[0],
        result: 'All measurements within tolerance',
      });
      setLoading(false);
    }, 300);
  }, [id]);

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      PASSED: 'success',
      FAILED: 'error',
      PENDING: 'warning',
      IN_PROGRESS: 'processing',
    };
    return colorMap[status] || 'default';
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/quality/inspections')}
            style={{ marginBottom: 16 }}
          >
            Back to Inspections
          </Button>
          <Title level={2}>Inspection Details: {id}</Title>
          <Text type="secondary">Quality inspection record</Text>
        </div>

        <Card>
          <Spin spinning={loading}>
            {inspection && (
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Inspection Number" span={2}>
                  {inspection.inspectionNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Status" span={2}>
                  <Tag color={getStatusColor(inspection.status)}>
                    {inspection.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Part Number">
                  {inspection.partNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Lot Number">
                  {inspection.lotNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Inspector">
                  {inspection.inspector}
                </Descriptions.Item>
                <Descriptions.Item label="Date Performed">
                  {inspection.datePerformed}
                </Descriptions.Item>
                <Descriptions.Item label="Result" span={2}>
                  {inspection.result}
                </Descriptions.Item>
              </Descriptions>
            )}
          </Spin>
        </Card>
      </Space>
    </div>
  );
};

export default InspectionDetail;
