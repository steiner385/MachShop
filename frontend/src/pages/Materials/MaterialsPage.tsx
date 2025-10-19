import React from 'react';
import { Card, Typography, Space, Alert, Row, Col, Statistic } from 'antd';
import { InboxOutlined, BarcodeOutlined, DatabaseOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * Materials Management Page (Placeholder)
 * Navigation UI Improvement - Sprint 1
 *
 * This is a placeholder page for the Materials Management module.
 * Full implementation scheduled for Sprint 3.
 */

const MaterialsPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>
            <InboxOutlined style={{ marginRight: 8 }} />
            Materials Management
          </Title>
          <Text type="secondary">
            Manage material inventory, lot tracking, and material traceability
          </Text>
        </div>

        <Alert
          message="Feature Coming Soon"
          description="The Materials Management module is currently under development. Expected delivery: Sprint 3."
          type="info"
          showIcon
        />

        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Material Types"
                value="--"
                prefix={<DatabaseOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Active Lots"
                value="--"
                prefix={<BarcodeOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Low Stock Alerts"
                value="--"
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Planned Features" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>Material Inventory</Title>
              <Paragraph>
                Real-time inventory tracking with min/max levels, reorder points, and automated alerts.
                View current stock levels across all storage locations.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Lot Tracking</Title>
              <Paragraph>
                Complete lot genealogy and traceability. Track material lots from receipt through consumption.
                Support for shelf life management and FIFO/FEFO policies.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Material Transactions</Title>
              <Paragraph>
                Record material receipts, issues, transfers, and adjustments.
                Full audit trail of all material movements.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Integration with Traceability</Title>
              <Paragraph>
                Seamless integration with the existing Traceability module.
                Link materials to serial numbers and work orders for complete genealogy.
              </Paragraph>
            </div>
          </Space>
        </Card>

        <Card title="Backend API Status" bordered={false}>
          <Alert
            message="API Ready"
            description="The backend API endpoint (/api/v1/materials) is already available and ready for integration."
            type="success"
            showIcon
          />
        </Card>
      </Space>
    </div>
  );
};

export default MaterialsPage;
