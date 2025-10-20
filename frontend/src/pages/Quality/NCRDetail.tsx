import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, Typography, Button, Descriptions, Tag, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface NCR {
  id: string;
  ncrNumber: string;
  status: string;
  partNumber: string;
  lotNumber: string;
  defectDescription: string;
  reportedBy: string;
  dateReported: string;
  severity: string;
}

const NCRDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ncr, setNCR] = useState<NCR | null>(null);

  useEffect(() => {
    // Placeholder - In a real implementation, this would fetch from API
    setLoading(true);
    setTimeout(() => {
      setNCR({
        id: id || '',
        ncrNumber: `NCR-${id}`,
        status: 'OPEN',
        partNumber: 'TB-450-001',
        lotNumber: 'LOT-2024-001',
        defectDescription: 'Surface finish out of specification',
        reportedBy: 'Jane Smith',
        dateReported: new Date().toISOString().split('T')[0],
        severity: 'MAJOR',
      });
      setLoading(false);
    }, 300);
  }, [id]);

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      OPEN: 'error',
      IN_REVIEW: 'warning',
      CLOSED: 'success',
      REJECTED: 'default',
    };
    return colorMap[status] || 'default';
  };

  const getSeverityColor = (severity: string) => {
    const colorMap: Record<string, string> = {
      CRITICAL: 'red',
      MAJOR: 'orange',
      MINOR: 'gold',
      COSMETIC: 'blue',
    };
    return colorMap[severity] || 'default';
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/quality/ncrs')}
            style={{ marginBottom: 16 }}
          >
            Back to NCRs
          </Button>
          <Title level={2}>NCR Details: {id}</Title>
          <Text type="secondary">Non-Conformance Report</Text>
        </div>

        <Card>
          <Spin spinning={loading}>
            {ncr && (
              <Descriptions bordered column={2}>
                <Descriptions.Item label="NCR Number" span={2}>
                  {ncr.ncrNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={getStatusColor(ncr.status)}>
                    {ncr.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Severity">
                  <Tag color={getSeverityColor(ncr.severity)}>
                    {ncr.severity}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Part Number">
                  {ncr.partNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Lot Number">
                  {ncr.lotNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Reported By">
                  {ncr.reportedBy}
                </Descriptions.Item>
                <Descriptions.Item label="Date Reported">
                  {ncr.dateReported}
                </Descriptions.Item>
                <Descriptions.Item label="Defect Description" span={2}>
                  {ncr.defectDescription}
                </Descriptions.Item>
              </Descriptions>
            )}
          </Spin>
        </Card>
      </Space>
    </div>
  );
};

export default NCRDetail;
