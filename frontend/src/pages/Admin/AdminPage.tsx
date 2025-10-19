import React from 'react';
import { Card, Typography, Space, Alert, Row, Col } from 'antd';
import { SettingOutlined, UserOutlined, SafetyOutlined, ApiOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * Administration Page (Placeholder)
 * Navigation UI Improvement - Sprint 1
 *
 * This is a placeholder page for the Administration module.
 * Full implementation scheduled for Sprint 5.
 */

const AdminPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>
            <SettingOutlined style={{ marginRight: 8 }} />
            Administration
          </Title>
          <Text type="secondary">
            System configuration, user management, and security settings
          </Text>
        </div>

        <Alert
          message="Feature Coming Soon"
          description="The Administration module is currently under development. Expected delivery: Sprint 5."
          type="info"
          showIcon
        />

        <Row gutter={16}>
          <Col span={12}>
            <Card
              hoverable
              style={{ height: '100%' }}
              cover={
                <div style={{ padding: 40, textAlign: 'center', background: '#f0f2f5' }}>
                  <UserOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                </div>
              }
            >
              <Card.Meta
                title="User Management"
                description="Create, modify, and delete user accounts. Manage user profiles and contact information."
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card
              hoverable
              style={{ height: '100%' }}
              cover={
                <div style={{ padding: 40, textAlign: 'center', background: '#f0f2f5' }}>
                  <SafetyOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                </div>
              }
            >
              <Card.Meta
                title="Role & Permission Management"
                description="Configure roles and assign permissions. Control access to features and data."
              />
            </Card>
          </Col>
        </Row>

        <Card title="Planned Features" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>User Management</Title>
              <Paragraph>
                Complete user lifecycle management including creation, modification, deactivation, and deletion.
                Support for password resets, account locking, and session management.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Role-Based Access Control (RBAC)</Title>
              <Paragraph>
                Define custom roles with granular permission assignments.
                View and modify the current role hierarchy.
                Support for role inheritance and permission delegation.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>System Configuration</Title>
              <Paragraph>
                Configure system-wide settings such as time zones, date formats, and localization.
                Manage integrations with external systems (currently available via Integrations menu).
                Set notification preferences and alert thresholds.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Audit Logging</Title>
              <Paragraph>
                View comprehensive audit trails of all system activities.
                Track user actions, data changes, and security events.
                Export audit logs for compliance reporting.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Backup & Recovery</Title>
              <Paragraph>
                Schedule automated database backups.
                Restore from backup points.
                Monitor backup status and storage usage.
              </Paragraph>
            </div>
          </Space>
        </Card>

        <Card title="Current Access" bordered={false}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="Integrations Available"
              description="System integrations with external systems (Oracle EBS, Oracle Fusion, Teamcenter, etc.) are currently available via the Integrations menu."
              type="success"
              showIcon
              icon={<ApiOutlined />}
            />
            <Alert
              message="Profile Settings Available"
              description="Users can currently access their profile settings via the user menu in the top-right corner."
              type="info"
              showIcon
            />
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default AdminPage;
