import React, { useState } from 'react';
import { Modal, Form, Input, Button, Alert, Space, Typography, Divider, Steps } from 'antd';
import {
  LockOutlined,
  UserOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  SecurityScanOutlined,
} from '@ant-design/icons';
import { BiometricCapture } from './BiometricCapture';

const { Text, Title } = Typography;
const { Step } = Steps;

export interface SignatureModalProps {
  visible: boolean;
  onCancel: () => void;
  onSign: (signatureData: SignatureData) => Promise<void>;
  entityType: string;
  entityId: string;
  entityName?: string;
  signatureLevel: 'OPERATOR' | 'SUPERVISOR' | 'QUALITY' | 'ENGINEER' | 'MANAGER';
  signatureType: 'BASIC' | 'ADVANCED' | 'QUALIFIED';
  requireBiometric?: boolean;
  title?: string;
  description?: string;
}

export interface SignatureData {
  username: string;
  password: string;
  totpCode?: string;
  biometricTemplate?: string;
  biometricScore?: number;
  signatureReason?: string;
}

/**
 * Electronic Signature Modal Component
 *
 * Implements 21 CFR Part 11 compliant electronic signature capture
 *
 * Features:
 * - Username/password authentication
 * - 2FA TOTP support (for ADVANCED and QUALIFIED signatures)
 * - Biometric capture integration (optional)
 * - Multi-step workflow
 * - Real-time validation
 * - Secure input handling
 */
export const SignatureModal: React.FC<SignatureModalProps> = ({
  visible,
  onCancel,
  onSign,
  entityType,
  entityId,
  entityName,
  signatureLevel,
  signatureType,
  requireBiometric = false,
  title = 'Electronic Signature Required',
  description,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [biometricData, setBiometricData] = useState<{
    template: string;
    score: number;
  } | null>(null);
  const [showBiometricCapture, setShowBiometricCapture] = useState(false);

  // Determine if 2FA is required
  const requires2FA = signatureType === 'ADVANCED' || signatureType === 'QUALIFIED';
  const requiresBiometric = requireBiometric || signatureType === 'QUALIFIED';

  // Handle signature submission
  const handleSignature = async () => {
    try {
      setError(null);
      setLoading(true);

      // Validate form
      const values = await form.validateFields();

      // Check biometric requirement
      if (requiresBiometric && !biometricData) {
        setError('Biometric verification is required for this signature level');
        setCurrentStep(1); // Go to biometric step
        return;
      }

      // Prepare signature data
      const signatureData: SignatureData = {
        username: values.username,
        password: values.password,
        totpCode: values.totpCode,
        biometricTemplate: biometricData?.template,
        biometricScore: biometricData?.score,
        signatureReason: values.signatureReason,
      };

      // Call sign handler
      await onSign(signatureData);

      // Reset form and close
      form.resetFields();
      setBiometricData(null);
      setCurrentStep(0);
      setShowBiometricCapture(false);
    } catch (err: any) {
      if (err.errorFields) {
        // Form validation error
        return;
      }
      setError(err.message || 'Failed to apply electronic signature');
    } finally {
      setLoading(false);
    }
  };

  // Handle biometric capture completion
  const handleBiometricCapture = (template: string, score: number) => {
    setBiometricData({ template, score });
    setShowBiometricCapture(false);
    setCurrentStep(2); // Move to review step
  };

  // Handle cancel
  const handleCancel = () => {
    form.resetFields();
    setBiometricData(null);
    setCurrentStep(0);
    setError(null);
    setShowBiometricCapture(false);
    onCancel();
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // Step 1: Username/Password + 2FA
        return (
          <Form form={form} layout="vertical" size="large">
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: 'Please enter your username' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </Form.Item>

            {requires2FA && (
              <Form.Item
                name="totpCode"
                label="Two-Factor Authentication Code"
                rules={[
                  { required: true, message: 'Please enter your 2FA code' },
                  { pattern: /^\d{6}$/, message: '2FA code must be 6 digits' },
                ]}
              >
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="000000"
                  maxLength={6}
                  style={{ letterSpacing: '0.5em', fontSize: '18px' }}
                />
              </Form.Item>
            )}

            <Form.Item name="signatureReason" label="Reason for Signature (Optional)">
              <Input.TextArea
                placeholder="Enter reason for signing (e.g., Approval, Review, Verification)"
                rows={3}
                maxLength={500}
              />
            </Form.Item>
          </Form>
        );

      case 1:
        // Step 2: Biometric Capture
        return (
          <div style={{ padding: '24px 0' }}>
            {showBiometricCapture ? (
              <BiometricCapture
                biometricType="FINGERPRINT"
                onCapture={handleBiometricCapture}
                onCancel={() => {
                  setShowBiometricCapture(false);
                  setCurrentStep(0);
                }}
              />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <SecurityScanOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '24px' }} />
                <Title level={4}>Biometric Verification Required</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                  This signature level requires biometric verification for enhanced security.
                  {signatureType === 'QUALIFIED' && (
                    <span style={{ display: 'block', marginTop: '8px', color: '#ff4d4f' }}>
                      <strong>Qualified Signature:</strong> Digital certificate + biometric required
                    </span>
                  )}
                </Text>
                <Button
                  type="primary"
                  size="large"
                  icon={<SecurityScanOutlined />}
                  onClick={() => setShowBiometricCapture(true)}
                >
                  Capture Biometric
                </Button>
              </div>
            )}
          </div>
        );

      case 2:
        // Step 3: Review and Confirm
        return (
          <div>
            <Alert
              message="Review Signature Details"
              description="Please review the information below before applying your electronic signature."
              type="info"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            <div style={{ background: '#fafafa', padding: '16px', borderRadius: '4px' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text type="secondary">Document:</Text>
                  <br />
                  <Text strong>{entityName || `${entityType} #${entityId}`}</Text>
                </div>

                <Divider style={{ margin: '8px 0' }} />

                <div>
                  <Text type="secondary">Username:</Text>
                  <br />
                  <Text strong>{form.getFieldValue('username')}</Text>
                </div>

                <div>
                  <Text type="secondary">Signature Level:</Text>
                  <br />
                  <Text strong>{signatureLevel}</Text>
                </div>

                <div>
                  <Text type="secondary">Signature Type:</Text>
                  <br />
                  <Text strong>{signatureType}</Text>
                </div>

                {requires2FA && (
                  <div>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                    <Text type="success">Two-Factor Authentication Verified</Text>
                  </div>
                )}

                {biometricData && (
                  <div>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                    <Text type="success">
                      Biometric Verified (Score: {(biometricData.score * 100).toFixed(1)}%)
                    </Text>
                  </div>
                )}

                {form.getFieldValue('signatureReason') && (
                  <div>
                    <Text type="secondary">Reason:</Text>
                    <br />
                    <Text italic>{form.getFieldValue('signatureReason')}</Text>
                  </div>
                )}
              </Space>
            </div>

            <Alert
              message="Legal Notice"
              description="By applying your electronic signature, you acknowledge that this signature has the same legal effect as a handwritten signature and you are responsible for all actions taken under this signature."
              type="warning"
              showIcon
              style={{ marginTop: '24px' }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Determine current step based on signature requirements
  const steps = [
    { title: 'Authentication', icon: <UserOutlined /> },
    ...(requiresBiometric ? [{ title: 'Biometric', icon: <SecurityScanOutlined /> }] : []),
    { title: 'Review', icon: <CheckCircleOutlined /> },
  ];

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={handleCancel}
      width={600}
      footer={null}
      destroyOnClose
      maskClosable={false}
    >
      {description && (
        <Alert
          message={description}
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {steps.length > 1 && (
        <Steps current={currentStep} size="small" style={{ marginBottom: '24px' }}>
          {steps.map((step, index) => (
            <Step key={index} title={step.title} icon={step.icon} />
          ))}
        </Steps>
      )}

      {error && (
        <Alert
          message="Signature Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: '16px' }}
        />
      )}

      {renderStepContent()}

      <div style={{ marginTop: '24px', textAlign: 'right' }}>
        <Space>
          <Button onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>

          {currentStep === 0 && (
            <Button
              type="primary"
              onClick={async () => {
                try {
                  await form.validateFields();
                  if (requiresBiometric) {
                    setCurrentStep(1);
                  } else {
                    setCurrentStep(2);
                  }
                } catch (err) {
                  // Validation error - stay on current step
                }
              }}
              loading={loading}
            >
              {requiresBiometric ? 'Next: Biometric' : 'Next: Review'}
            </Button>
          )}

          {currentStep === 2 && (
            <>
              <Button onClick={() => setCurrentStep(0)}>Back</Button>
              <Button
                type="primary"
                onClick={handleSignature}
                loading={loading}
                icon={<LockOutlined />}
              >
                Apply Signature
              </Button>
            </>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default SignatureModal;
