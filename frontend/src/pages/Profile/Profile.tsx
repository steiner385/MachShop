import React, { useEffect } from 'react';
import { Card, Descriptions, Button, Space, Avatar, Tag, Row, Col } from 'antd';
import { UserOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store/AuthStore';

const Profile: React.FC = () => {
  const { user } = useAuthStore();

  // Set page title
  useEffect(() => {
    document.title = 'Profile - Manufacturing Execution System';
  }, []);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 24 
      }}>
        <h1>User Profile</h1>
        <Space>
          <Button icon={<EditOutlined />}>Edit Profile</Button>
          <Button icon={<SettingOutlined />}>Account Settings</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* Profile Information */}
        <Col xs={24} lg={16}>
          <Card title="Profile Information">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
              <Avatar size={64} icon={<UserOutlined />} style={{ marginRight: 16 }} />
              <div>
                <h3 style={{ margin: 0 }}>{user.username}</h3>
                <p style={{ margin: 0, color: '#666' }}>{user.email}</p>
              </div>
            </div>
            
            <Descriptions column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Username">
                {user.username}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {user.email}
              </Descriptions.Item>
              <Descriptions.Item label="User ID">
                {user.id}
              </Descriptions.Item>
              <Descriptions.Item label="Account Status">
                <Tag color="green">Active</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Roles and Permissions */}
        <Col xs={24} lg={8}>
          <Card title="Roles & Permissions" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <h4>Roles:</h4>
              <Space wrap>
                {user.roles.map((role) => (
                  <Tag color="blue" key={`role-${role}`}>
                    {role}
                  </Tag>
                ))}
              </Space>
            </div>
            
            <div>
              <h4>Permissions:</h4>
              <Space wrap>
                {user.permissions.map((permission) => (
                  <Tag color="green" key={`permission-${permission}`} style={{ fontSize: '10px' }}>
                    {permission}
                  </Tag>
                ))}
              </Space>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block type="default">
                Change Password
              </Button>
              <Button block type="default">
                Download Activity Report
              </Button>
              <Button block type="default">
                Update Preferences
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;