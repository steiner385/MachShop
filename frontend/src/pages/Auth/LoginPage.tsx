import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  Layout, 
  Card, 
  Form, 
  Input, 
  Button, 
  Alert, 
  Typography, 
  Divider,
  Checkbox,
  Space,
  Row,
  Col,
  Tag
} from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/AuthStore.tsx';
import { LoginRequest } from '../../types/auth.ts';
import { getDemoCredentialsForDisplay, DEMO_WARNING } from '../../config/demoCredentials.ts';
import styles from './LoginPage.module.css';

const { Content } = Layout;
const { Title, Text } = Typography;

interface LocationState {
  from?: {
    pathname: string;
  };
}

const LoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, error, clearError } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as LocationState;
  // Check for redirect URL in query parameters first, then fall back to state
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect');
  const from = redirectUrl || state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  // Show loading state briefly to avoid flash of 404 during redirect
  if (isAuthenticated) {
    if (isLoading) {
      return (
        <Layout style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Space direction="vertical" align="center">
            <div>Redirecting...</div>
          </Space>
        </Layout>
      );
    }
    return <Navigate to={from} replace />;
  }

  const handleLogin = async (values: LoginRequest & { rememberMe?: boolean }) => {
    try {
      setIsLoading(true);
      clearError();

      await login({
        username: values.username,
        password: values.password,
        rememberMe: values.rememberMe,
      });

      // Navigate to the intended destination after successful login
      navigate(from, { replace: true });
    } catch (error) {
      // Error is handled by the auth store
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = () => {
    if (error) {
      clearError();
    }
  };

  const handleCredentialSelect = (username: string, password: string) => {
    form.setFieldsValue({
      username,
      password
    });
    // Clear any existing errors
    if (error) {
      clearError();
    }
  };

  return (
    <Layout className={styles.loginLayout}>
      <Content className={styles.loginContent}>
        <div className={styles.loginContainer}>
          {/* Header */}
          <div className={styles.loginHeader}>
            <Title level={2} className={styles.loginTitle}>
              Manufacturing Execution System
            </Title>
            <Text type="secondary" className={styles.loginSubtitle}>
              Jet Engine Component Manufacturing
            </Text>
          </div>

          {/* Login Card */}
          <Card className={styles.loginCard}>
            <div className={styles.cardHeader}>
              <LoginOutlined className={styles.loginIcon} />
              <Title level={3}>Sign In</Title>
              <Text type="secondary">
                Enter your credentials to access the system
              </Text>
            </div>

            <Divider />

            {/* Error Alert */}
            {error && (
              <Alert
                message="Login Failed"
                description={error}
                type="error"
                showIcon
                closable
                onClose={clearError}
                style={{ marginBottom: 24 }}
              />
            )}

            {/* Login Form */}
            <Form
              form={form}
              layout="vertical"
              onFinish={handleLogin}
              onChange={handleFormChange}
              size="large"
              autoComplete="off"
            >
              <Form.Item
                name="username"
                label="Username"
                rules={[
                  { required: true, message: 'Please enter your username' },
                  { min: 3, message: 'Username must be at least 3 characters' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter username"
                  autoComplete="username"
                  disabled={isLoading}
                  data-testid="username-input"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please enter your password' },
                  { min: 6, message: 'Password must be at least 6 characters' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  data-testid="password-input"
                />
              </Form.Item>

              <Form.Item name="rememberMe" valuePropName="checked">
                <Checkbox disabled={isLoading}>
                  Remember me for 30 days
                </Checkbox>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={isLoading}
                  icon={<LoginOutlined />}
                  data-testid="login-button"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Form.Item>
            </Form>

            <Divider />

            {/* Help Section */}
            <div className={styles.loginHelp}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Having trouble accessing your account?
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Contact your system administrator for assistance.
                </Text>
              </Space>
            </div>
          </Card>

          {/* Demo Credentials */}
          {import.meta.env.MODE === 'development' && (
            <Card className={styles.demoCard} size="small">
              <div className={styles.demoHeader}>
                <ExperimentOutlined className={styles.demoIcon} />
                <Title level={4} style={{ margin: 0 }}>Development Mode - Demo Credentials</Title>
              </div>
              <Alert
                message={DEMO_WARNING}
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginBottom: 12, display: 'block' }}>
                Click any credential below to auto-fill the login form:
              </Text>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {getDemoCredentialsForDisplay().map((credential) => (
                  <Card
                    key={credential.username}
                    size="small"
                    hoverable
                    className={styles.credentialCard}
                    onClick={() => handleCredentialSelect(credential.username, credential.password)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Row justify="space-between" align="middle">
                      <Col flex="auto">
                        <Space direction="vertical" size={0}>
                          <Text strong>{credential.displayName}</Text>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {credential.description}
                          </Text>
                        </Space>
                      </Col>
                      <Col>
                        <Space>
                          <Tag color="blue">{credential.username}</Tag>
                          <Tag color="green">{credential.password}</Tag>
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            </Card>
          )}

          {/* Footer */}
          <div className={styles.loginFooter}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              © 2024 Manufacturing Execution System. All rights reserved.
            </Text>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default LoginPage;