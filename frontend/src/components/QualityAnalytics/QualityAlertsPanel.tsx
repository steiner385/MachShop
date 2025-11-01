/**
 * Quality Alerts Panel Component
 * Displays active quality alerts and notifications
 */

import React, { useEffect, useState } from 'react';
import { Table, Tag, Empty, Button, Space, Modal, Drawer, Form, Input, Select } from 'antd';
import { CheckOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Alert {
  id: string;
  alertType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'URGENT';
  title: string;
  description: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED';
  createdAt: string;
  threshold?: number;
  actualValue?: number;
  trend?: number;
}

interface QualityAlertsPanelProps {
  siteId: string;
}

const QualityAlertsPanel: React.FC<QualityAlertsPanelProps> = ({ siteId }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [acknowledgeModalOpen, setAcknowledgeModalOpen] = useState(false);
  const [acknowledgeForm] = Form.useForm();

  // Mock alerts data - in real implementation, fetch from API
  useEffect(() => {
    // TODO: Fetch alerts from qualityAnalyticsService
    const mockAlerts: Alert[] = [
      {
        id: 'alert1',
        alertType: 'THRESHOLD_EXCEEDED',
        severity: 'CRITICAL',
        title: 'NCR Rate Threshold Exceeded',
        description: 'NCR rate has exceeded the configured threshold of 1.0%',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        threshold: 1.0,
        actualValue: 1.5,
        trend: 15,
      },
      {
        id: 'alert2',
        alertType: 'ESCAPED_DEFECT',
        severity: 'URGENT',
        title: 'Escaped Defect Detected',
        description: 'A critical defect was discovered at the customer site',
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        actualValue: 1,
      },
      {
        id: 'alert3',
        alertType: 'TREND_DEGRADATION',
        severity: 'WARNING',
        title: 'Quality Trend Degrading',
        description: 'First Pass Yield has declined 5% over the last week',
        status: 'ACKNOWLEDGED',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        trend: -5,
      },
    ];
    setAlerts(mockAlerts);
  }, [siteId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'INFO':
        return 'blue';
      case 'WARNING':
        return 'orange';
      case 'CRITICAL':
        return 'red';
      case 'URGENT':
        return 'magenta';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'red';
      case 'ACKNOWLEDGED':
        return 'orange';
      case 'RESOLVED':
        return 'green';
      case 'SUPPRESSED':
        return 'gray';
      default:
        return 'default';
    }
  };

  const handleAcknowledge = (alert: Alert) => {
    setSelectedAlert(alert);
    setAcknowledgeModalOpen(true);
  };

  const handleAcknowledgeSubmit = async (values: any) => {
    // TODO: Call API to acknowledge alert
    console.log('Acknowledging alert:', selectedAlert?.id, values);
    setAlerts(prev =>
      prev.map(a =>
        a.id === selectedAlert?.id
          ? { ...a, status: 'ACKNOWLEDGED' }
          : a
      )
    );
    setAcknowledgeModalOpen(false);
    acknowledgeForm.resetFields();
  };

  const handleResolve = (alert: Alert) => {
    // TODO: Call API to resolve alert
    setAlerts(prev =>
      prev.map(a =>
        a.id === alert.id
          ? { ...a, status: 'RESOLVED' }
          : a
      )
    );
  };

  const columns: ColumnsType<Alert> = [
    {
      title: 'Alert Type',
      dataIndex: 'alertType',
      key: 'alertType',
      width: '18%',
      render: (text: string) => {
        const typeLabel = text.replace(/_/g, ' ');
        return <span>{typeLabel}</span>;
      },
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: '28%',
      render: (text: string, record: Alert) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedAlert(record);
            setDetailsDrawerOpen(true);
          }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: '14%',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>{severity}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '14%',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '14%',
      render: (createdAt: string) => {
        const date = new Date(createdAt);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);

        if (hours > 0) return `${hours}h ago`;
        return `${minutes}m ago`;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '12%',
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.status === 'ACTIVE' && (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleAcknowledge(record)}
            >
              Acknowledge
            </Button>
          )}
          {record.status === 'ACKNOWLEDGED' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleResolve(record)}
            >
              Resolve
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {alerts.length === 0 ? (
        <Empty description="No active alerts" />
      ) : (
        <>
          <Table
            columns={columns}
            dataSource={alerts.map((alert, index) => ({ ...alert, key: index }))}
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
          />

          {/* Alert Details Drawer */}
          {selectedAlert && (
            <Drawer
              title="Alert Details"
              placement="right"
              onClose={() => setDetailsDrawerOpen(false)}
              open={detailsDrawerOpen}
            >
              <div style={{ paddingBottom: '16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Alert Type:</strong>
                  <p>{selectedAlert.alertType.replace(/_/g, ' ')}</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Title:</strong>
                  <p>{selectedAlert.title}</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Description:</strong>
                  <p>{selectedAlert.description}</p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Severity:</strong>
                  <p>
                    <Tag color={getSeverityColor(selectedAlert.severity)}>
                      {selectedAlert.severity}
                    </Tag>
                  </p>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Status:</strong>
                  <p>
                    <Tag color={getStatusColor(selectedAlert.status)}>
                      {selectedAlert.status}
                    </Tag>
                  </p>
                </div>
                {selectedAlert.threshold !== undefined && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong>Threshold:</strong>
                    <p>{selectedAlert.threshold}</p>
                  </div>
                )}
                {selectedAlert.actualValue !== undefined && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong>Actual Value:</strong>
                    <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                      {selectedAlert.actualValue}
                    </p>
                  </div>
                )}
              </div>
            </Drawer>
          )}

          {/* Acknowledge Modal */}
          <Modal
            title="Acknowledge Alert"
            open={acknowledgeModalOpen}
            onOk={() => acknowledgeForm.submit()}
            onCancel={() => setAcknowledgeModalOpen(false)}
          >
            <Form
              form={acknowledgeForm}
              layout="vertical"
              onFinish={handleAcknowledgeSubmit}
            >
              <Form.Item
                label="Comment"
                name="comment"
                rules={[{ message: 'Please enter a comment' }]}
              >
                <Input.TextArea rows={3} placeholder="Add comment about this alert..." />
              </Form.Item>
            </Form>
          </Modal>
        </>
      )}
    </div>
  );
};

export default QualityAlertsPanel;
