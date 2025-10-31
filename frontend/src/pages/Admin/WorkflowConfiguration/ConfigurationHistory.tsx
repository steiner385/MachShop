/**
 * Configuration History Component
 * Created for GitHub Issue #40 - Site-Level Workflow Configuration System
 *
 * Displays configuration change history as a timeline
 */

import React, { useState } from 'react';
import {
  Card,
  Timeline,
  Typography,
  Empty,
  Spin,
  Button,
  Space,
  Tag,
  Modal,
  Descriptions,
  Avatar,
  Row,
  Col,
  Pagination,
} from 'antd';
import {
  HistoryOutlined,
  UserOutlined,
  ExclamationOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { ConfigurationHistory } from '@/types/workflowConfiguration';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

interface ConfigurationHistoryProps {
  history: ConfigurationHistory[];
  isLoading?: boolean;
  total?: number;
  current?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

const getConfigTypeLabel = (type: string) => {
  switch (type) {
    case 'SITE':
      return { label: 'Site', color: 'blue' };
    case 'ROUTING':
      return { label: 'Routing', color: 'orange' };
    case 'WORK_ORDER':
      return { label: 'Work Order', color: 'green' };
    default:
      return { label: type, color: 'default' };
  }
};

const getChangeIcon = (history: ConfigurationHistory) => {
  if (history.newMode) {
    return <CheckCircleOutlined style={{ color: '#1890ff' }} />;
  }
  return <ExclamationOutlined style={{ color: '#faad14' }} />;
};

export const ConfigurationHistoryTimeline: React.FC<ConfigurationHistoryProps> = ({
  history,
  isLoading = false,
  total = 0,
  current = 1,
  pageSize = 10,
  onPageChange,
}) => {
  const [selectedHistory, setSelectedHistory] = useState<ConfigurationHistory | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const handleShowDetails = (hist: ConfigurationHistory) => {
    setSelectedHistory(hist);
    setDetailModalVisible(true);
  };

  if (isLoading) {
    return (
      <Card>
        <Spin size="large" style={{ display: 'flex', justifyContent: 'center' }} />
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No configuration changes recorded yet"
        />
      </Card>
    );
  }

  const configTypeInfo = getConfigTypeLabel(history[0]?.configType || 'SITE');

  return (
    <div>
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>Configuration Change History</span>
          </Space>
        }
      >
        <Timeline
          items={history.map((item, index) => ({
            dot: getChangeIcon(item),
            key: item.id,
            children: (
              <div
                style={{
                  paddingBottom: index < history.length - 1 ? 24 : 0,
                  cursor: 'pointer',
                }}
                onClick={() => handleShowDetails(item)}
              >
                <Row gutter={16} align="middle">
                  <Col flex="auto">
                    <div style={{ marginBottom: 8 }}>
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} />
                        <Text strong>{item.createdBy || 'System'}</Text>
                        <Tag color={getConfigTypeLabel(item.configType).color}>
                          {getConfigTypeLabel(item.configType).label}
                        </Tag>
                      </Space>
                    </div>

                    {item.newMode && (
                      <div style={{ marginBottom: 8 }}>
                        <Text type="secondary">
                          Changed mode from{' '}
                          <strong style={{ color: '#faad14' }}>
                            {item.previousMode || 'N/A'}
                          </strong>{' '}
                          to{' '}
                          <strong style={{ color: '#1890ff' }}>
                            {item.newMode}
                          </strong>
                        </Text>
                      </div>
                    )}

                    {item.changeReason && (
                      <div style={{ marginBottom: 8 }}>
                        <Text type="secondary">
                          Reason: <em>{item.changeReason}</em>
                        </Text>
                      </div>
                    )}

                    {Object.keys(item.changedFields || {}).length > 0 && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {Object.keys(item.changedFields).length} field(s) modified
                        </Text>
                      </div>
                    )}

                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.createdAt).format('MMM DD, YYYY HH:mm')} (
                        {dayjs(item.createdAt).fromNow()})
                      </Text>
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <Button
                        type="link"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowDetails(item);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </Col>
                </Row>
              </div>
            ),
          }))}
        />

        {total > pageSize && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Pagination
              current={current}
              pageSize={pageSize}
              total={total}
              onChange={onPageChange}
              showSizeChanger={false}
            />
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            Configuration Change Details
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedHistory && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Configuration Type">
                <Tag color={getConfigTypeLabel(selectedHistory.configType).color}>
                  {getConfigTypeLabel(selectedHistory.configType).label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Configuration ID">
                <code>{selectedHistory.configId}</code>
              </Descriptions.Item>
              <Descriptions.Item label="Modified By">
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  {selectedHistory.createdBy || 'System'}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Timestamp">
                {dayjs(selectedHistory.createdAt).format('MMM DD, YYYY HH:mm:ss')}
              </Descriptions.Item>
              {selectedHistory.changeReason && (
                <Descriptions.Item label="Change Reason">
                  {selectedHistory.changeReason}
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedHistory.previousMode && selectedHistory.newMode && (
              <Card
                size="small"
                title="Mode Change"
                style={{ backgroundColor: '#f6f8fb' }}
              >
                <Row gutter={16}>
                  <Col span={10}>
                    <Text type="secondary">Previous:</Text>
                    <Tag color="orange" style={{ marginTop: 8, display: 'block' }}>
                      {selectedHistory.previousMode}
                    </Tag>
                  </Col>
                  <Col span={4} style={{ textAlign: 'center', paddingTop: 8 }}>
                    <Text> → </Text>
                  </Col>
                  <Col span={10}>
                    <Text type="secondary">New:</Text>
                    <Tag color="blue" style={{ marginTop: 8, display: 'block' }}>
                      {selectedHistory.newMode}
                    </Tag>
                  </Col>
                </Row>
              </Card>
            )}

            {Object.keys(selectedHistory.changedFields || {}).length > 0 && (
              <Card
                size="small"
                title={`Field Changes (${Object.keys(selectedHistory.changedFields).length})`}
                style={{ backgroundColor: '#f6f8fb' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {Object.entries(selectedHistory.changedFields).map(([key, value]) => (
                    <div key={key}>
                      <Text strong>{key}:</Text>
                      <div style={{ marginLeft: 16, marginTop: 4 }}>
                        <code style={{ color: '#ff4d4f' }}>
                          {value?.previous !== undefined ? String(value.previous) : 'N/A'}
                        </code>
                        <Text style={{ margin: '0 8px' }}>→</Text>
                        <code style={{ color: '#52c41a' }}>
                          {value?.current !== undefined ? String(value.current) : 'N/A'}
                        </code>
                      </div>
                    </div>
                  ))}
                </Space>
              </Card>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};
