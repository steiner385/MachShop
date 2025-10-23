/**
 * Version Conflict Resolution Modal
 *
 * Displays when a routing update conflicts with another user's changes
 * Provides options to:
 * - Reload and view the latest version (discard local changes)
 * - View differences between versions
 * - Force overwrite (if user has appropriate permissions)
 */

import React, { useState } from 'react';
import { Modal, Button, Alert, Descriptions, Typography, Space, Tabs } from 'antd';
import {
  ReloadOutlined,
  SaveOutlined,
  WarningOutlined,
  DiffOutlined,
} from '@ant-design/icons';
import { VersionConflictError } from '@/api/routing';

const { Text, Title, Paragraph } = Typography;
const { TabPane } = Tabs;

export interface VersionConflictModalProps {
  visible: boolean;
  error: VersionConflictError;
  localChanges: Record<string, any>; // The changes the user was trying to save
  onReload: () => void; // Reload the latest version (discard local changes)
  onForceOverwrite?: () => void; // Force save (override server version) - optional
  onClose: () => void;
}

export const VersionConflictModal: React.FC<VersionConflictModalProps> = ({
  visible,
  error,
  localChanges,
  onReload,
  onForceOverwrite,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const renderChangesComparison = () => {
    const changedFields = Object.keys(localChanges).filter(
      (key) => key !== 'currentVersion'
    );

    if (changedFields.length === 0) {
      return <Text type="secondary">No changes to display</Text>;
    }

    return (
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        <Descriptions bordered column={1} size="small">
          {changedFields.map((field) => (
            <Descriptions.Item
              key={field}
              label={<Text strong>{field}</Text>}
            >
              <div>
                <Text type="secondary">Your change: </Text>
                <Text code>{String(localChanges[field])}</Text>
              </div>
            </Descriptions.Item>
          ))}
        </Descriptions>
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: '#faad14' }} />
          <span>Version Conflict Detected</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="reload"
          icon={<ReloadOutlined />}
          onClick={() => {
            onReload();
            onClose();
          }}
        >
          Reload Latest Version
        </Button>,
        ...(onForceOverwrite
          ? [
              <Button
                key="force"
                type="primary"
                danger
                icon={<SaveOutlined />}
                onClick={() => {
                  onForceOverwrite();
                  onClose();
                }}
              >
                Force Overwrite
              </Button>,
            ]
          : []),
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Conflict Alert */}
        <Alert
          message="Another user has modified this routing"
          description={error.message}
          type="warning"
          showIcon
        />

        {/* Conflict Details */}
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Your Version" span={1}>
            <Text code>{error.details.attemptedVersion}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Current Version" span={1}>
            <Text code strong>
              {error.details.currentVersion}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Last Modified" span={1}>
            {formatDateTime(error.details.lastModified)}
          </Descriptions.Item>
          <Descriptions.Item label="Modified By" span={1}>
            {error.details.lastModifiedBy || 'Unknown'}
          </Descriptions.Item>
        </Descriptions>

        {/* Tabs for Details */}
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <DiffOutlined />
                Your Changes
              </span>
            }
            key="overview"
          >
            <div>
              <Paragraph type="secondary">
                The following changes were in your update that could not be saved:
              </Paragraph>
              {renderChangesComparison()}
            </div>
          </TabPane>

          <TabPane tab="Resolution Options" key="options">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Title level={5}>Option 1: Reload Latest Version (Recommended)</Title>
                <Paragraph>
                  Discard your changes and load the latest version from the server. You will need to
                  re-apply your changes manually after reviewing what was changed by the other user.
                </Paragraph>
                <Button icon={<ReloadOutlined />} onClick={() => {
                  onReload();
                  onClose();
                }}>
                  Reload Latest Version
                </Button>
              </div>

              {onForceOverwrite && (
                <div>
                  <Title level={5}>Option 2: Force Overwrite (Use with Caution)</Title>
                  <Alert
                    message="Warning"
                    description="This will overwrite the other user's changes with yours. Only use this if you're certain your changes should take precedence."
                    type="error"
                    showIcon
                  />
                  <Button
                    danger
                    icon={<SaveOutlined />}
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      onForceOverwrite();
                      onClose();
                    }}
                  >
                    Force Overwrite
                  </Button>
                </div>
              )}
            </Space>
          </TabPane>
        </Tabs>
      </Space>
    </Modal>
  );
};

export default VersionConflictModal;
