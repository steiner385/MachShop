import React from 'react';
import { Badge, Tooltip, Space, Typography, Tag, Popover, Descriptions } from 'antd';
import {
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  LockOutlined,
  SecurityScanOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

export interface SignatureInfo {
  id: string;
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  signatureType: 'BASIC' | 'ADVANCED' | 'QUALIFIED';
  signatureLevel: 'OPERATOR' | 'SUPERVISOR' | 'QUALITY' | 'ENGINEER' | 'MANAGER';
  timestamp: Date;
  isValid: boolean;
  biometricType?: 'FINGERPRINT' | 'FACIAL' | 'IRIS' | 'VOICE';
  biometricScore?: number;
  invalidationReason?: string;
  invalidatedAt?: Date;
  signatureReason?: string;
}

export interface SignatureDisplayProps {
  signatures: SignatureInfo[];
  compact?: boolean;
  showDetails?: boolean;
}

/**
 * Signature Display Component
 *
 * Displays electronic signatures with verification status
 *
 * Features:
 * - Signature badge with verification status
 * - Detailed signature information on hover
 * - Color-coded signature levels
 * - Biometric indicator
 * - Invalidation status
 */
export const SignatureDisplay: React.FC<SignatureDisplayProps> = ({
  signatures,
  compact = false,
  showDetails = true,
}) => {
  if (!signatures || signatures.length === 0) {
    return (
      <Text type="secondary" italic>
        <InfoCircleOutlined /> No signatures
      </Text>
    );
  }

  // Get signature type icon
  const getSignatureTypeIcon = (type: string) => {
    switch (type) {
      case 'BASIC':
        return <LockOutlined />;
      case 'ADVANCED':
        return <SafetyOutlined />;
      case 'QUALIFIED':
        return <SafetyOutlined style={{ color: '#faad14' }} />;
      default:
        return <LockOutlined />;
    }
  };

  // Get signature level color
  const getSignatureLevelColor = (level: string) => {
    switch (level) {
      case 'OPERATOR':
        return 'blue';
      case 'SUPERVISOR':
        return 'cyan';
      case 'QUALITY':
        return 'purple';
      case 'ENGINEER':
        return 'orange';
      case 'MANAGER':
        return 'red';
      default:
        return 'default';
    }
  };

  // Render signature details popover
  const renderSignatureDetails = (signature: SignatureInfo) => (
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label="Signer">
        {signature.firstName && signature.lastName
          ? `${signature.firstName} ${signature.lastName}`
          : signature.username}
      </Descriptions.Item>
      <Descriptions.Item label="User ID">
        <Text code style={{ fontSize: '11px' }}>
          {signature.userId}
        </Text>
      </Descriptions.Item>
      <Descriptions.Item label="Signature Type">
        <Tag color={signature.signatureType === 'QUALIFIED' ? 'gold' : 'blue'}>
          {signature.signatureType}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label="Signature Level">
        <Tag color={getSignatureLevelColor(signature.signatureLevel)}>
          {signature.signatureLevel}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label="Timestamp">
        {dayjs(signature.timestamp).format('MMM D, YYYY h:mm A')}
      </Descriptions.Item>
      <Descriptions.Item label="Status">
        {signature.isValid ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Valid
          </Tag>
        ) : (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Invalid
          </Tag>
        )}
      </Descriptions.Item>
      {signature.biometricType && (
        <Descriptions.Item label="Biometric">
          <Space>
            <SecurityScanOutlined />
            <Text>{signature.biometricType}</Text>
            {signature.biometricScore && (
              <Text type="secondary">
                ({(signature.biometricScore * 100).toFixed(1)}%)
              </Text>
            )}
          </Space>
        </Descriptions.Item>
      )}
      {signature.signatureReason && (
        <Descriptions.Item label="Reason">
          <Text italic>{signature.signatureReason}</Text>
        </Descriptions.Item>
      )}
      {!signature.isValid && signature.invalidationReason && (
        <Descriptions.Item label="Invalidation Reason">
          <Text type="danger">{signature.invalidationReason}</Text>
          {signature.invalidatedAt && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Invalidated: {dayjs(signature.invalidatedAt).format('MMM D, YYYY h:mm A')}
              </Text>
            </div>
          )}
        </Descriptions.Item>
      )}
      <Descriptions.Item label="Signature ID">
        <Text code style={{ fontSize: '10px' }}>
          {signature.id}
        </Text>
      </Descriptions.Item>
    </Descriptions>
  );

  // Render compact view
  if (compact) {
    return (
      <Space size="small" wrap>
        {signatures.map((signature) => (
          <Popover
            key={signature.id}
            content={renderSignatureDetails(signature)}
            title="Signature Details"
            trigger="hover"
          >
            <Badge
              status={signature.isValid ? 'success' : 'error'}
              text={
                <Space size={4}>
                  {getSignatureTypeIcon(signature.signatureType)}
                  <Text style={{ fontSize: '12px' }}>
                    {signature.username}
                  </Text>
                  {signature.biometricType && (
                    <SecurityScanOutlined style={{ fontSize: '12px', color: '#52c41a' }} />
                  )}
                </Space>
              }
            />
          </Popover>
        ))}
      </Space>
    );
  }

  // Render detailed view
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {signatures.map((signature) => (
        <div
          key={signature.id}
          style={{
            padding: '12px',
            border: `1px solid ${signature.isValid ? '#52c41a' : '#ff4d4f'}`,
            borderRadius: '4px',
            background: signature.isValid ? '#f6ffed' : '#fff2f0',
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                {signature.isValid ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />
                )}
                <Text strong>
                  {signature.firstName && signature.lastName
                    ? `${signature.firstName} ${signature.lastName}`
                    : signature.username}
                </Text>
                <Tag color={getSignatureLevelColor(signature.signatureLevel)}>
                  {signature.signatureLevel}
                </Tag>
              </Space>
              <Space>
                {signature.biometricType && (
                  <Tooltip title={`Biometric: ${signature.biometricType} (${(signature.biometricScore || 0) * 100}%)`}>
                    <SecurityScanOutlined style={{ color: '#52c41a' }} />
                  </Tooltip>
                )}
                <Tag color={signature.signatureType === 'QUALIFIED' ? 'gold' : 'blue'}>
                  {getSignatureTypeIcon(signature.signatureType)} {signature.signatureType}
                </Tag>
              </Space>
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              Signed: {dayjs(signature.timestamp).format('MMM D, YYYY h:mm A')}
            </Text>

            {signature.signatureReason && (
              <Text italic style={{ fontSize: '12px' }}>
                Reason: {signature.signatureReason}
              </Text>
            )}

            {!signature.isValid && signature.invalidationReason && (
              <div>
                <Text type="danger" style={{ fontSize: '12px' }}>
                  ⚠️ Invalidated: {signature.invalidationReason}
                </Text>
                {signature.invalidatedAt && (
                  <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                    ({dayjs(signature.invalidatedAt).format('MMM D, YYYY h:mm A')})
                  </Text>
                )}
              </div>
            )}

            {showDetails && (
              <Popover
                content={renderSignatureDetails(signature)}
                title="Full Signature Details"
                trigger="click"
              >
                <a style={{ fontSize: '12px' }}>
                  <InfoCircleOutlined /> View details
                </a>
              </Popover>
            )}
          </Space>
        </div>
      ))}
    </Space>
  );
};

export default SignatureDisplay;
