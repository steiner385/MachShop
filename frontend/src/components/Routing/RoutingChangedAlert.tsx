/**
 * Routing Changed Alert Component
 * Sprint 4: Collaborative Routing Features
 *
 * Displays an alert when a routing has been modified by another user
 */

import React from 'react';
import { Alert, Button, Space, Typography, Descriptions, Tag } from 'antd';
import {
  WarningOutlined,
  ReloadOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { RoutingChangeInfo } from '../../hooks/useRoutingChangeDetection';
import './RoutingChangedAlert.css';

const { Text } = Typography;

export interface RoutingChangedAlertProps {
  changeInfo: RoutingChangeInfo;
  onReload: () => void;
  onDismiss: () => void;
  style?: React.CSSProperties;
}

/**
 * Alert component for routing change notifications
 *
 * Features:
 * - Prominent warning about version changes
 * - Displays who made the change and when
 * - Clear action buttons (Reload / Continue Working)
 * - Professional, non-blocking UI
 *
 * @example
 * <RoutingChangedAlert
 *   changeInfo={changeInfo}
 *   onReload={() => fetchRoutingById(id)}
 *   onDismiss={() => dismissChange()}
 * />
 */
export const RoutingChangedAlert: React.FC<RoutingChangedAlertProps> = ({
  changeInfo,
  onReload,
  onDismiss,
  style,
}) => {
  const formatDateTime = (date: Date): string => {
    try {
      return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  const getTimeAgo = (date: Date): string => {
    try {
      const now = new Date();
      const diffMs = now.getTime() - new Date(date).getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'just now';
      if (diffMins === 1) return '1 minute ago';
      if (diffMins < 60) return `${diffMins} minutes ago`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return '1 day ago';
      return `${diffDays} days ago`;
    } catch (error) {
      return 'recently';
    }
  };

  return (
    <div className="routing-changed-alert" style={style}>
      <Alert
        message={
          <Space>
            <WarningOutlined style={{ fontSize: '18px' }} />
            <strong>Routing Has Been Modified</strong>
          </Space>
        }
        description={
          <div style={{ marginTop: '12px' }}>
            <Text>
              This routing has been updated by another user. Your local version may be outdated.
            </Text>

            <Descriptions
              bordered
              column={2}
              size="small"
              style={{ marginTop: '16px', marginBottom: '16px' }}
            >
              <Descriptions.Item label="Your Version" span={1}>
                <Tag color="blue">{changeInfo.currentVersion}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Latest Version" span={1}>
                <Tag color="green">{changeInfo.newVersion}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Modified" span={1}>
                <Space>
                  <ClockCircleOutlined />
                  <Text>{getTimeAgo(changeInfo.lastModified)}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Modified By" span={1}>
                <Space>
                  <UserOutlined />
                  <Text>{changeInfo.modifiedBy || 'Unknown User'}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Timestamp" span={2}>
                {formatDateTime(changeInfo.lastModified)}
              </Descriptions.Item>
            </Descriptions>

            <Alert
              type="info"
              showIcon
              message="What should you do?"
              description={
                <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '8px' }}>
                  <li>
                    <strong>Reload:</strong> Discard your local changes and load the latest version
                    (recommended if you haven't made changes)
                  </li>
                  <li>
                    <strong>Continue Working:</strong> Keep working with your current version. You
                    may encounter a conflict if you try to save.
                  </li>
                </ul>
              }
              style={{ marginBottom: '16px' }}
            />

            <Space size="middle">
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={onReload}
                size="large"
              >
                Reload Latest Version
              </Button>
              <Button icon={<CloseOutlined />} onClick={onDismiss} size="large">
                Continue Working
              </Button>
            </Space>
          </div>
        }
        type="warning"
        showIcon
        icon={<WarningOutlined style={{ fontSize: '24px' }} />}
        closable={false}
      />
    </div>
  );
};

export default RoutingChangedAlert;
