import React from 'react';
import { Card, Typography, Space, Alert, Row, Col, Statistic } from 'antd';
import { TeamOutlined, SafetyCertificateOutlined, TrophyOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * Personnel Management Page (Placeholder)
 * Navigation UI Improvement - Sprint 1
 *
 * This is a placeholder page for the Personnel Management module.
 * Full implementation scheduled for Sprint 3.
 */

const PersonnelPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>
            <TeamOutlined style={{ marginRight: 8 }} />
            Personnel Management
          </Title>
          <Text type="secondary">
            Manage personnel skills, certifications, and training records
          </Text>
        </div>

        <Alert
          message="Feature Coming Soon"
          description="The Personnel Management module is currently under development. Expected delivery: Sprint 3."
          type="info"
          showIcon
        />

        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Active Personnel"
                value="--"
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Active Certifications"
                value="--"
                prefix={<SafetyCertificateOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Expiring Soon"
                value="--"
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Planned Features" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>Skills Matrix</Title>
              <Paragraph>
                Visual grid showing personnel competencies across different operations and equipment.
                Identify skill gaps and training needs. Support for skill level ratings (Beginner, Intermediate, Expert).
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Certification Tracking</Title>
              <Paragraph>
                Track operator certifications, qualifications, and licenses.
                Automated expiration alerts and renewal reminders.
                Integration with work order assignment to ensure qualified personnel only.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Training Records</Title>
              <Paragraph>
                Complete training history for each team member.
                Track training courses, completion dates, and assessment scores.
                Link training to skill matrix updates.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Resource Planning</Title>
              <Paragraph>
                View personnel availability and workload.
                Support for shift schedules and time-off tracking.
                Integration with production scheduling for resource allocation.
              </Paragraph>
            </div>
          </Space>
        </Card>

        <Card title="Backend API Status" bordered={false}>
          <Alert
            message="API Ready"
            description="The backend API endpoint (/api/v1/personnel) is already available and ready for integration."
            type="success"
            showIcon
          />
        </Card>
      </Space>
    </div>
  );
};

export default PersonnelPage;
