import React, { useState } from 'react';
import { Button, Progress, Alert, Space, Typography, Card } from 'antd';
import {
  SecurityScanOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

export interface BiometricCaptureProps {
  biometricType: 'FINGERPRINT' | 'FACIAL' | 'IRIS' | 'VOICE';
  onCapture: (template: string, score: number) => void;
  onCancel: () => void;
  minQualityScore?: number;
}

/**
 * Biometric Capture Component
 *
 * Simulates biometric capture for electronic signatures
 * In production, this would integrate with actual biometric hardware SDK
 *
 * Features:
 * - Simulated fingerprint capture
 * - Quality score validation
 * - Retry mechanism
 * - Visual feedback
 * - Progress indication
 */
export const BiometricCapture: React.FC<BiometricCaptureProps> = ({
  biometricType,
  onCapture,
  onCancel,
  minQualityScore = 0.8,
}) => {
  const [capturing, setCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'capturing' | 'success' | 'failed'>('idle');
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [template, setTemplate] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  // Simulate biometric capture
  const startCapture = () => {
    setCapturing(true);
    setStatus('capturing');
    setProgress(0);
    setAttempts(attempts + 1);

    // Simulate progressive capture
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          completeCapture();
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const completeCapture = () => {
    // Simulate biometric quality score (in production, this comes from hardware)
    const simulatedScore = Math.random() * 0.3 + 0.7; // Random between 0.7 and 1.0
    const simulatedTemplate = generateBiometricTemplate();

    setQualityScore(simulatedScore);
    setTemplate(simulatedTemplate);
    setCapturing(false);

    if (simulatedScore >= minQualityScore) {
      setStatus('success');
    } else {
      setStatus('failed');
    }
  };

  // Generate simulated biometric template
  const generateBiometricTemplate = (): string => {
    // In production, this would be the actual biometric template from hardware
    const timestamp = Date.now();
    const randomData = Math.random().toString(36).substring(2, 15);
    return `BIO_${biometricType}_${timestamp}_${randomData}`;
  };

  // Handle confirm
  const handleConfirm = () => {
    if (template && qualityScore) {
      onCapture(template, qualityScore);
    }
  };

  // Handle retry
  const handleRetry = () => {
    setStatus('idle');
    setProgress(0);
    setQualityScore(null);
    setTemplate(null);
  };

  // Render status content
  const renderContent = () => {
    switch (status) {
      case 'idle':
        return (
          <div style={{ textAlign: 'center' }}>
            <SecurityScanOutlined
              style={{
                fontSize: '120px',
                color: '#d9d9d9',
                marginBottom: '24px',
              }}
            />
            <Title level={4}>Ready to Capture</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
              Place your {biometricType.toLowerCase()} on the reader
            </Text>
            <Space>
              <Button type="primary" size="large" onClick={startCapture}>
                Start Capture
              </Button>
              <Button size="large" onClick={onCancel}>
                Cancel
              </Button>
            </Space>
            {attempts > 0 && (
              <Text type="secondary" style={{ display: 'block', marginTop: '16px' }}>
                Attempt {attempts}/{maxAttempts}
              </Text>
            )}
          </div>
        );

      case 'capturing':
        return (
          <div style={{ textAlign: 'center' }}>
            <SecurityScanOutlined
              style={{
                fontSize: '120px',
                color: '#1890ff',
                marginBottom: '24px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <Title level={4}>Capturing...</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
              Please hold still
            </Text>
            <Progress
              percent={progress}
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>
        );

      case 'success':
        return (
          <div style={{ textAlign: 'center' }}>
            <CheckCircleOutlined
              style={{
                fontSize: '120px',
                color: '#52c41a',
                marginBottom: '24px',
              }}
            />
            <Title level={4}>Capture Successful</Title>
            <Card style={{ marginTop: '24px', textAlign: 'left' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">Quality Score:</Text>
                  <br />
                  <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                    {qualityScore ? (qualityScore * 100).toFixed(1) : 0}%
                  </Text>
                  <Progress
                    percent={qualityScore ? qualityScore * 100 : 0}
                    status="success"
                    showInfo={false}
                    style={{ marginTop: '8px' }}
                  />
                </div>
                <div>
                  <Text type="secondary">Template ID:</Text>
                  <br />
                  <Text code style={{ fontSize: '11px' }}>
                    {template?.substring(0, 40)}...
                  </Text>
                </div>
              </Space>
            </Card>
            <Alert
              message="High Quality Capture"
              description={`Biometric quality score exceeds minimum requirement of ${(minQualityScore * 100).toFixed(0)}%`}
              type="success"
              showIcon
              style={{ marginTop: '16px', textAlign: 'left' }}
            />
            <Space style={{ marginTop: '24px' }}>
              <Button type="primary" size="large" onClick={handleConfirm}>
                Confirm & Continue
              </Button>
              <Button size="large" onClick={handleRetry}>
                Recapture
              </Button>
            </Space>
          </div>
        );

      case 'failed':
        return (
          <div style={{ textAlign: 'center' }}>
            <CloseCircleOutlined
              style={{
                fontSize: '120px',
                color: '#ff4d4f',
                marginBottom: '24px',
              }}
            />
            <Title level={4}>Capture Failed</Title>
            <Card style={{ marginTop: '24px', textAlign: 'left' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">Quality Score:</Text>
                  <br />
                  <Text strong style={{ fontSize: '18px', color: '#ff4d4f' }}>
                    {qualityScore ? (qualityScore * 100).toFixed(1) : 0}%
                  </Text>
                  <Progress
                    percent={qualityScore ? qualityScore * 100 : 0}
                    status="exception"
                    showInfo={false}
                    style={{ marginTop: '8px' }}
                  />
                </div>
              </Space>
            </Card>
            <Alert
              message="Low Quality Capture"
              description={`Biometric quality score is below minimum requirement of ${(minQualityScore * 100).toFixed(0)}%. Please try again.`}
              type="error"
              showIcon
              style={{ marginTop: '16px', textAlign: 'left' }}
            />
            {attempts < maxAttempts ? (
              <Space style={{ marginTop: '24px' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<ReloadOutlined />}
                  onClick={handleRetry}
                >
                  Try Again
                </Button>
                <Button size="large" onClick={onCancel}>
                  Cancel
                </Button>
              </Space>
            ) : (
              <div style={{ marginTop: '24px' }}>
                <Alert
                  message="Maximum Attempts Reached"
                  description="Please contact your supervisor or try again later."
                  type="warning"
                  showIcon
                />
                <Button size="large" onClick={onCancel} style={{ marginTop: '16px' }}>
                  Close
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '400px', padding: '24px' }}>
      {renderContent()}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

export default BiometricCapture;
