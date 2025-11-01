import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Button, Alert, Space, Typography, Divider, Steps } from 'antd';
import {
  LockOutlined,
  UserOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  SecurityScanOutlined,
} from '@ant-design/icons';
import { BiometricCapture } from './BiometricCapture';
import { useFocusManagement } from '../../hooks/useFocusManagement';
import { useKeyboardHandler } from '../../hooks/useKeyboardHandler';
import { useComponentShortcuts } from '../../contexts/KeyboardShortcutContext';
import { announceToScreenReader } from '../../utils/ariaUtils';

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

  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);

  // Focus management for modal
  const {
    focusFirst,
    focusElement,
  } = useFocusManagement({
    containerRef: modalRef,
    enableFocusTrap: visible,
    restoreFocus: true,
    autoFocus: true,
  });

  // Determine if 2FA is required
  const requires2FA = signatureType === 'ADVANCED' || signatureType === 'QUALIFIED';
  const requiresBiometric = requireBiometric || signatureType === 'QUALIFIED';

  // Keyboard handler for step navigation and actions
  const { keyboardProps } = useKeyboardHandler({
    enableActivation: false,
    enableEscape: true,
    onEscape: (event) => {
      // Confirm before closing signature modal (regulatory requirement)
      if (window.confirm('Are you sure you want to cancel the electronic signature? This action cannot be undone.')) {
        handleCancel();
      }
      event.preventDefault();
    },
  });

  // Register keyboard shortcuts for signature modal
  useComponentShortcuts('signature-modal', [
    {
      description: 'Previous step',
      keys: 'Alt+ArrowLeft',
      handler: () => {
        if (currentStep > 0 && !loading) {
          navigateToStep(currentStep - 1);
        }
      },
      category: 'signature',
      priority: 3,
    },
    {
      description: 'Next step',
      keys: 'Alt+ArrowRight',
      handler: () => {
        if (!loading) {
          handleNextStep();
        }
      },
      category: 'signature',
      priority: 3,
    },
    {
      description: 'Submit signature',
      keys: 'Ctrl+Enter',
      handler: () => {
        if (currentStep === 2 && !loading) {
          handleSignature();
        }
      },
      category: 'signature',
      priority: 3,
    },
  ]);

  // Step navigation with focus management
  const navigateToStep = useCallback((stepIndex: number) => {
    const maxSteps = requiresBiometric ? 2 : 1; // 0: auth, 1: biometric (optional), 2: review

    if (stepIndex < 0 || stepIndex > maxSteps) return;

    setCurrentStep(stepIndex);

    // Announce step change to screen readers
    const stepNames = ['Authentication', 'Biometric Verification', 'Review and Confirm'];
    const stepName = stepNames[stepIndex] || 'Unknown Step';
    announceToScreenReader(`Moved to ${stepName} step`, 'POLITE');

    // Focus management after step change
    setTimeout(() => {
      if (stepContentRef.current) {
        const firstInput = stepContentRef.current.querySelector('input, button') as HTMLElement;
        if (firstInput) {
          focusElement(firstInput);
        } else {
          focusFirst();
        }
      }
    }, 100);
  }, [requiresBiometric, focusElement, focusFirst]);

  // Handle next step navigation
  const handleNextStep = useCallback(async () => {
    if (currentStep === 0) {
      try {
        await form.validateFields();
        if (requiresBiometric) {
          navigateToStep(1);
        } else {
          navigateToStep(2);
        }
      } catch (err) {
        // Validation error - stay on current step
        announceToScreenReader('Please correct the form errors before proceeding', 'ASSERTIVE');
      }
    } else if (currentStep === 1) {
      // From biometric step to review
      navigateToStep(2);
    }
  }, [currentStep, form, requiresBiometric, navigateToStep]);

  // Enhanced focus management when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        // Focus the first input when modal opens
        const firstInput = modalRef.current?.querySelector('input') as HTMLElement;
        if (firstInput) {
          focusElement(firstInput);
        }
      }, 100);
    }
  }, [visible, focusElement]);

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

      // Announce success to screen readers
      announceToScreenReader('Electronic signature successfully applied', 'POLITE');

      // Reset form and close
      form.resetFields();
      setBiometricData(null);
      setCurrentStep(0);
      setShowBiometricCapture(false);
    } catch (err: any) {
      if (err.errorFields) {
        // Form validation error
        announceToScreenReader('Please correct the form errors before proceeding', 'ASSERTIVE');
        return;
      }
      const errorMessage = err.message || 'Failed to apply electronic signature';
      setError(errorMessage);
      announceToScreenReader(`Error: ${errorMessage}`, 'ASSERTIVE');
    } finally {
      setLoading(false);
    }
  };

  // Handle biometric capture completion
  const handleBiometricCapture = (template: string, score: number) => {
    setBiometricData({ template, score });
    setShowBiometricCapture(false);
    announceToScreenReader('Biometric verification completed successfully', 'POLITE');
    navigateToStep(2); // Move to review step
  };

  // Handle cancel with confirmation
  const handleCancel = useCallback(() => {
    // Confirm before closing if user has entered data
    const hasFormData = form.getFieldsValue().username || form.getFieldsValue().password;
    if (hasFormData || currentStep > 0) {
      if (!window.confirm('Are you sure you want to cancel the electronic signature? Any entered information will be lost.')) {
        return;
      }
    }

    form.resetFields();
    setBiometricData(null);
    setCurrentStep(0);
    setError(null);
    setShowBiometricCapture(false);
    announceToScreenReader('Electronic signature cancelled', 'POLITE');
    onCancel();
  }, [form, currentStep, onCancel]);

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
      modalRender={(modal) => (
        <div
          ref={modalRef}
          {...keyboardProps}
          role="dialog"
          aria-labelledby="signature-modal-title"
          aria-describedby="signature-modal-description"
          aria-modal="true"
        >
          {modal}
        </div>
      )}
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

      <div ref={stepContentRef} aria-live="polite" aria-atomic="true">
        {renderStepContent()}
      </div>

      <div style={{ marginTop: '24px', textAlign: 'right' }}>
        <Space>
          <Button onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>

          {currentStep === 0 && (
            <Button
              type="primary"
              onClick={handleNextStep}
              loading={loading}
              aria-describedby="step-navigation-hint"
            >
              {requiresBiometric ? 'Next: Biometric' : 'Next: Review'}
            </Button>
          )}

          {currentStep === 2 && (
            <>
              <Button
                onClick={() => navigateToStep(0)}
                aria-label="Go back to authentication step"
              >
                Back
              </Button>
              <Button
                type="primary"
                onClick={handleSignature}
                loading={loading}
                icon={<LockOutlined />}
                aria-describedby="signature-submit-hint"
              >
                Apply Signature
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* Hidden ARIA hints for screen readers */}
      <div id="signature-modal-title" style={{ display: 'none' }}>
        {title}
      </div>
      <div id="signature-modal-description" style={{ display: 'none' }}>
        Electronic signature modal for {entityName || `${entityType} #${entityId}`}. Use Alt+Left/Right arrows to navigate steps, Escape to cancel, Ctrl+Enter to submit on review step.
      </div>
      <div id="step-navigation-hint" style={{ display: 'none' }}>
        Use Alt+Right arrow or click to proceed to next step
      </div>
      <div id="signature-submit-hint" style={{ display: 'none' }}>
        Use Ctrl+Enter or click to apply electronic signature
      </div>
    </Modal>
  );
};

export default SignatureModal;
