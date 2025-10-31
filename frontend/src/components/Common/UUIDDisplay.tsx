/**
 * UUIDDisplay Component
 * Displays persistent UUIDs with copy functionality and format options
 */

import React, { useState, useCallback } from 'react';
import { Button, Tooltip, Typography, Space, Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  DownOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import {
  truncateUUID,
  copyUUIDToClipboard,
  getAllStandardFormats,
  isValidUUID,
  UUIDDisplayOptions,
  DEFAULT_UUID_DISPLAY_OPTIONS,
  FRONTEND_UUID_CONSTANTS
} from '../../utils/uuidUtils';

const { Text } = Typography;

export interface UUIDDisplayProps {
  uuid: string;
  entityType?: string;
  displayName?: string;
  options?: Partial<UUIDDisplayOptions>;
  size?: 'small' | 'default' | 'large';
  variant?: 'inline' | 'block' | 'badge';
  showStandardFormats?: boolean;
  className?: string;
}

export const UUIDDisplay: React.FC<UUIDDisplayProps> = ({
  uuid,
  entityType,
  displayName,
  options = {},
  size = 'default',
  variant = 'inline',
  showStandardFormats = false,
  className
}) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied'>('idle');
  const [lastCopiedFormat, setLastCopiedFormat] = useState<string>('');

  const config = { ...DEFAULT_UUID_DISPLAY_OPTIONS, ...options };

  // Validate UUID
  if (!isValidUUID(uuid)) {
    return (
      <Text type="danger" className={className}>
        Invalid UUID: {uuid}
      </Text>
    );
  }

  // Handle copy to clipboard
  const handleCopy = useCallback(async (format: 'raw' | 'step' | 'qif' | 'itar' = 'raw') => {
    setCopyStatus('copying');

    const success = await copyUUIDToClipboard(uuid, format);

    if (success) {
      setCopyStatus('copied');
      setLastCopiedFormat(format);
      message.success(`UUID copied to clipboard (${format.toUpperCase()} format)`);

      setTimeout(() => {
        setCopyStatus('idle');
        setLastCopiedFormat('');
      }, FRONTEND_UUID_CONSTANTS.COPY_TIMEOUT);
    } else {
      setCopyStatus('idle');
      message.error('Failed to copy UUID to clipboard');
    }
  }, [uuid]);

  // Create dropdown menu for format options
  const formatMenuItems: MenuProps['items'] = showStandardFormats ? [
    {
      key: 'raw',
      label: 'Raw UUID',
      onClick: () => handleCopy('raw')
    },
    {
      key: 'step',
      label: 'STEP Format (urn:uuid:...)',
      onClick: () => handleCopy('step')
    },
    {
      key: 'qif',
      label: 'QIF Format (urn:uuid:...)',
      onClick: () => handleCopy('qif')
    },
    {
      key: 'itar',
      label: 'ITAR Format (ITAR-UUID:...)',
      onClick: () => handleCopy('itar')
    }
  ] : [];

  // Display text logic
  const getDisplayText = () => {
    if (displayName) {
      return displayName;
    }

    if (config.truncate) {
      return truncateUUID(uuid, config.truncateLength);
    }

    return uuid.toLowerCase();
  };

  // Tooltip content
  const getTooltipContent = () => {
    if (!config.showTooltip) return null;

    const standardFormats = getAllStandardFormats(uuid);

    return (
      <div style={{ maxWidth: 400 }}>
        <div><strong>Persistent UUID</strong></div>
        <div style={{ fontFamily: 'monospace', marginBottom: 8 }}>{uuid.toLowerCase()}</div>

        {entityType && (
          <div style={{ marginBottom: 8 }}>
            <strong>Entity Type:</strong> {entityType}
          </div>
        )}

        <div style={{ fontSize: '12px', color: '#888' }}>
          NIST AMS 300-12 Compliant • RFC 4122 UUID v4
        </div>

        {showStandardFormats && (
          <div style={{ marginTop: 8, fontSize: '11px' }}>
            <div><strong>Standard Formats:</strong></div>
            <div>STEP: {standardFormats.step}</div>
            <div>QIF: {standardFormats.qif}</div>
            <div>ITAR: {standardFormats.itar}</div>
          </div>
        )}
      </div>
    );
  };

  // Copy button component
  const CopyButton = () => (
    <Button
      type="text"
      size={size}
      icon={
        copyStatus === 'copied' && lastCopiedFormat === 'raw' ? (
          <CheckOutlined style={{ color: '#52c41a' }} />
        ) : (
          <CopyOutlined />
        )
      }
      loading={copyStatus === 'copying'}
      onClick={() => handleCopy('raw')}
      style={{ padding: '0 4px', height: 'auto' }}
    />
  );

  // Format dropdown button
  const FormatDropdown = () => (
    <Dropdown
      menu={{ items: formatMenuItems }}
      trigger={['click']}
      placement="bottomRight"
    >
      <Button
        type="text"
        size={size}
        icon={<DownOutlined />}
        style={{ padding: '0 4px', height: 'auto' }}
      />
    </Dropdown>
  );

  // Main display component
  const UUIDText = () => (
    <Text
      style={{
        fontFamily: 'monospace',
        fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
        userSelect: 'all'
      }}
      className={className}
    >
      {config.showPrefix && config.prefix && `${config.prefix}: `}
      {getDisplayText()}
    </Text>
  );

  // Render based on variant
  switch (variant) {
    case 'badge':
      return (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#f0f0f0',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: size === 'small' ? '12px' : '14px'
          }}
          className={className}
        >
          <InfoCircleOutlined style={{ marginRight: 4, color: '#1890ff' }} />
          {config.showTooltip ? (
            <Tooltip title={getTooltipContent()}>
              <UUIDText />
            </Tooltip>
          ) : (
            <UUIDText />
          )}
          {config.showCopy && (
            <Space size={2} style={{ marginLeft: 8 }}>
              <CopyButton />
              {showStandardFormats && <FormatDropdown />}
            </Space>
          )}
        </div>
      );

    case 'block':
      return (
        <div className={className} style={{ margin: '8px 0' }}>
          <div style={{ marginBottom: 4 }}>
            <Text strong>Persistent UUID:</Text>
          </div>
          <Space align="center">
            {config.showTooltip ? (
              <Tooltip title={getTooltipContent()}>
                <UUIDText />
              </Tooltip>
            ) : (
              <UUIDText />
            )}
            {config.showCopy && (
              <Space size={2}>
                <CopyButton />
                {showStandardFormats && <FormatDropdown />}
              </Space>
            )}
          </Space>
        </div>
      );

    case 'inline':
    default:
      return (
        <Space align="center" size={4} className={className}>
          {config.showTooltip ? (
            <Tooltip title={getTooltipContent()}>
              <UUIDText />
            </Tooltip>
          ) : (
            <UUIDText />
          )}
          {config.showCopy && (
            <Space size={2}>
              <CopyButton />
              {showStandardFormats && <FormatDropdown />}
            </Space>
          )}
        </Space>
      );
  }
};

export default UUIDDisplay;