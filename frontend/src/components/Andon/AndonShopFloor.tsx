/**
 * Andon Shop Floor Component
 * GitHub Issue #171: Production Alerts & Andon Core Infrastructure
 *
 * Primary shop floor interface for raising Andon alerts
 * Optimized for touch-screen use in industrial environments
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Select,
  Input,
  Alert,
  Space,
  Badge,
  Typography,
  Divider,
  message,
  Spin,
  Avatar,
  Tag,
  Tooltip,
  Upload,
  Form
} from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  StopOutlined,
  InfoCircleOutlined,
  CameraOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UploadOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAndonStore } from '@/store/andonStore';
import { useEquipmentStore } from '@/store/equipmentStore';
import { useUserStore } from '@/store/userStore';
import type { AndonIssueType, CreateAndonAlertData, AndonSeverity, AndonPriority } from '@/types/andon';
import type { Equipment, WorkOrder } from '@/types/equipment';
import './AndonShopFloor.styles.css';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Quick alert buttons configuration for common issues
const QUICK_ALERTS = [
  {
    key: 'QUALITY',
    title: 'Quality Issue',
    icon: <ExclamationCircleOutlined />,
    color: '#f5222d',
    severity: 'HIGH' as AndonSeverity,
    description: 'Product quality concerns'
  },
  {
    key: 'SAFETY',
    title: 'Safety Concern',
    icon: <WarningOutlined />,
    color: '#fa541c',
    severity: 'CRITICAL' as AndonSeverity,
    description: 'Safety hazard or incident'
  },
  {
    key: 'EQUIPMENT',
    title: 'Equipment Down',
    icon: <StopOutlined />,
    color: '#722ed1',
    severity: 'HIGH' as AndonSeverity,
    description: 'Equipment malfunction or breakdown'
  },
  {
    key: 'MATERIAL',
    title: 'Material Issue',
    icon: <InfoCircleOutlined />,
    color: '#fa8c16',
    severity: 'MEDIUM' as AndonSeverity,
    description: 'Material shortage or defect'
  }
];

// Severity colors for visual indication
const SEVERITY_COLORS = {
  CRITICAL: '#ff4d4f',
  HIGH: '#ff7a45',
  MEDIUM: '#ffa940',
  LOW: '#52c41a'
};

const SEVERITY_ICONS = {
  CRITICAL: <ExclamationCircleOutlined />,
  HIGH: <WarningOutlined />,
  MEDIUM: <InfoCircleOutlined />,
  LOW: <CheckCircleOutlined />
};

interface AndonShopFloorProps {
  workStationId?: string;
  equipmentId?: string;
  workOrderId?: string;
  operationId?: string;
  isKioskMode?: boolean;
}

export const AndonShopFloor: React.FC<AndonShopFloorProps> = ({
  workStationId,
  equipmentId,
  workOrderId,
  operationId,
  isKioskMode = false
}) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // Store hooks
  const {
    issueTypes,
    activeAlerts,
    isLoading,
    createAlert,
    loadIssueTypes,
    loadActiveAlerts
  } = useAndonStore();

  const { equipment, loadEquipment } = useEquipmentStore();
  const { currentUser, currentSite } = useUserStore();

  // Component state
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedIssueType, setSelectedIssueType] = useState<string | null>(null);
  const [selectedQuickAlert, setSelectedQuickAlert] = useState<string | null>(null);
  const [alertDescription, setAlertDescription] = useState('');
  const [customSeverity, setCustomSeverity] = useState<AndonSeverity>('MEDIUM');
  const [customPriority, setCustomPriority] = useState<AndonPriority>('NORMAL');
  const [selectedEquipment, setSelectedEquipment] = useState<string | undefined>(equipmentId);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadIssueTypes(currentSite?.id);
    loadActiveAlerts(currentSite?.id);
    if (currentSite?.id) {
      loadEquipment({ siteId: currentSite.id });
    }
  }, [currentSite?.id]);

  // Refresh active alerts every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveAlerts(currentSite?.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentSite?.id]);

  // Handle quick alert button click
  const handleQuickAlert = (alertKey: string) => {
    const quickAlert = QUICK_ALERTS.find(alert => alert.key === alertKey);
    if (!quickAlert) return;

    // Find matching issue type
    const matchingIssueType = issueTypes.find(type =>
      type.typeCode === alertKey || type.typeName.toUpperCase().includes(alertKey)
    );

    if (matchingIssueType) {
      setSelectedIssueType(matchingIssueType.id);
      setCustomSeverity(quickAlert.severity);
      setSelectedQuickAlert(alertKey);
      setIsCreateModalVisible(true);
    } else {
      message.error(`Issue type for ${quickAlert.title} not configured. Please use custom alert.`);
    }
  };

  // Handle custom alert creation
  const handleCustomAlert = () => {
    setSelectedQuickAlert(null);
    setIsCreateModalVisible(true);
  };

  // Handle alert submission
  const handleSubmitAlert = async () => {
    try {
      setIsSubmitting(true);

      if (!selectedIssueType) {
        message.error('Please select an issue type');
        return;
      }

      if (!currentUser?.id) {
        message.error('User not authenticated');
        return;
      }

      const alertData: CreateAndonAlertData = {
        title: selectedQuickAlert
          ? QUICK_ALERTS.find(a => a.key === selectedQuickAlert)?.title || 'Alert'
          : 'Custom Alert',
        description: alertDescription,
        issueTypeId: selectedIssueType,
        severity: customSeverity,
        priority: customPriority,
        raisedById: currentUser.id,
        siteId: currentSite?.id,
        equipmentId: selectedEquipment,
        workOrderId,
        operationId,
        metadata: {
          workStationId,
          quickAlert: selectedQuickAlert,
          source: 'shop_floor'
        },
        attachments: attachments.map(file => ({
          name: file.name,
          type: file.type,
          size: file.size
        }))
      };

      await createAlert(alertData);

      message.success('Andon alert created successfully');
      handleCloseModal();

      // Refresh active alerts
      loadActiveAlerts(currentSite?.id);

    } catch (error) {
      console.error('Error creating alert:', error);
      message.error('Failed to create alert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsCreateModalVisible(false);
    setSelectedIssueType(null);
    setSelectedQuickAlert(null);
    setAlertDescription('');
    setCustomSeverity('MEDIUM');
    setCustomPriority('NORMAL');
    setAttachments([]);
    form.resetFields();
  };

  // Get equipment options for dropdown
  const equipmentOptions = equipment.filter(eq =>
    !currentSite?.id || eq.siteId === currentSite.id
  );

  // Count active alerts by severity
  const alertCounts = activeAlerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<AndonSeverity, number>);

  return (
    <div className={`andon-shop-floor ${isKioskMode ? 'kiosk-mode' : ''}`}>
      {/* Header with status indicators */}
      <Card className="andon-header" bodyStyle={{ padding: '16px 24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <Title level={isKioskMode ? 2 : 3} style={{ margin: 0, color: '#1890ff' }}>
                <AlertOutlined /> Andon System
              </Title>
              {currentSite && (
                <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                  {currentSite.siteName}
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Space size="large">
              {/* Active alerts summary */}
              {Object.entries(alertCounts).map(([severity, count]) => (
                count > 0 && (
                  <Badge key={severity} count={count} style={{ backgroundColor: SEVERITY_COLORS[severity as AndonSeverity] }}>
                    <Avatar
                      style={{ backgroundColor: SEVERITY_COLORS[severity as AndonSeverity] }}
                      icon={SEVERITY_ICONS[severity as AndonSeverity]}
                    />
                  </Badge>
                )
              ))}

              {/* Emergency contact button */}
              <Tooltip title="Emergency Contact">
                <Button
                  type="primary"
                  danger
                  size="large"
                  icon={<PhoneOutlined />}
                  onClick={() => window.open('tel:911')}
                >
                  Emergency
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Quick alert buttons */}
      <Card
        title="Quick Alerts"
        className="quick-alerts-card"
        extra={
          <Button
            type="primary"
            size="large"
            onClick={handleCustomAlert}
          >
            Custom Alert
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          {QUICK_ALERTS.map((alert) => (
            <Col key={alert.key} xs={24} sm={12} md={6}>
              <Card
                hoverable
                className="quick-alert-button"
                bodyStyle={{
                  height: isKioskMode ? '120px' : '100px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '16px'
                }}
                style={{
                  borderColor: alert.color,
                  borderWidth: '2px',
                  cursor: 'pointer'
                }}
                onClick={() => handleQuickAlert(alert.key)}
              >
                <div style={{
                  fontSize: isKioskMode ? '32px' : '24px',
                  color: alert.color,
                  marginBottom: '8px'
                }}>
                  {alert.icon}
                </div>
                <Text
                  strong
                  style={{
                    fontSize: isKioskMode ? '18px' : '16px',
                    textAlign: 'center',
                    color: alert.color
                  }}
                >
                  {alert.title}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Active alerts display */}
      {activeAlerts.length > 0 && (
        <Card title="Active Alerts" className="active-alerts-card">
          <Row gutter={[16, 16]}>
            {activeAlerts.slice(0, 4).map((alert) => (
              <Col key={alert.id} xs={24} sm={12} md={6}>
                <Card
                  size="small"
                  style={{ borderLeft: `4px solid ${SEVERITY_COLORS[alert.severity]}` }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Tag color={SEVERITY_COLORS[alert.severity]}>
                        {alert.severity}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <ClockCircleOutlined /> {alert.alertNumber}
                      </Text>
                    </div>
                    <Text strong>{alert.title}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {new Date(alert.createdAt).toLocaleTimeString()}
                    </Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
          {activeAlerts.length > 4 && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Button
                type="link"
                onClick={() => navigate('/andon/alerts')}
              >
                View All Active Alerts ({activeAlerts.length})
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Alert creation modal */}
      <Modal
        title={selectedQuickAlert ?
          `Create ${QUICK_ALERTS.find(a => a.key === selectedQuickAlert)?.title} Alert` :
          'Create Custom Alert'
        }
        open={isCreateModalVisible}
        onCancel={handleCloseModal}
        onOk={handleSubmitAlert}
        confirmLoading={isSubmitting}
        width={isKioskMode ? 800 : 600}
        okText="Submit Alert"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: '16px' }}>
          {/* Issue Type Selection */}
          <Form.Item
            label="Issue Type"
            required
            help={selectedQuickAlert ? 'Auto-selected based on quick alert' : 'Select the type of issue'}
          >
            <Select
              placeholder="Select issue type"
              value={selectedIssueType}
              onChange={setSelectedIssueType}
              size="large"
              disabled={!!selectedQuickAlert}
            >
              {issueTypes.map(type => (
                <Option key={type.id} value={type.id}>
                  <Space>
                    {type.iconName && <span>{type.iconName}</span>}
                    <span>{type.typeName}</span>
                    <Tag color={type.colorCode}>{type.typeCode}</Tag>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Description */}
          <Form.Item
            label="Description"
            help="Provide details about the issue (optional but recommended)"
          >
            <TextArea
              placeholder="Describe the issue in detail..."
              value={alertDescription}
              onChange={(e) => setAlertDescription(e.target.value)}
              rows={4}
              maxLength={1000}
              showCount
            />
          </Form.Item>

          {/* Severity and Priority */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Severity">
                <Select
                  value={customSeverity}
                  onChange={setCustomSeverity}
                  size="large"
                >
                  {Object.entries(SEVERITY_COLORS).map(([severity, color]) => (
                    <Option key={severity} value={severity}>
                      <Space>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: color,
                          borderRadius: '50%'
                        }} />
                        {severity}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Priority">
                <Select
                  value={customPriority}
                  onChange={setCustomPriority}
                  size="large"
                >
                  <Option value="URGENT">🔴 Urgent</Option>
                  <Option value="HIGH">🟠 High</Option>
                  <Option value="NORMAL">🟡 Normal</Option>
                  <Option value="LOW">🟢 Low</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Equipment Selection */}
          {equipmentOptions.length > 0 && (
            <Form.Item label="Equipment (Optional)">
              <Select
                placeholder="Select equipment if applicable"
                value={selectedEquipment}
                onChange={setSelectedEquipment}
                size="large"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  option?.children?.toString().toLowerCase().includes(input.toLowerCase()) || false
                }
              >
                {equipmentOptions.map(eq => (
                  <Option key={eq.id} value={eq.id}>
                    {eq.name} ({eq.equipmentNumber})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {/* File attachments */}
          <Form.Item label="Attachments (Optional)">
            <Upload
              multiple
              beforeUpload={() => false}
              fileList={attachments.map((file, index) => ({
                uid: index.toString(),
                name: file.name,
                status: 'done' as const
              }))}
              onChange={({ fileList }) => {
                setAttachments(fileList.map(f => f.originFileObj).filter(Boolean) as File[]);
              }}
            >
              <Button icon={<UploadOutlined />} size="large">
                Attach Photos/Documents
              </Button>
            </Upload>
          </Form.Item>

          {/* Alert preview */}
          {selectedIssueType && (
            <Alert
              message="Alert Preview"
              description={
                <Space direction="vertical">
                  <Text>
                    <strong>Type:</strong> {issueTypes.find(t => t.id === selectedIssueType)?.typeName}
                  </Text>
                  <Text>
                    <strong>Severity:</strong> {customSeverity}
                  </Text>
                  <Text>
                    <strong>Priority:</strong> {customPriority}
                  </Text>
                  {alertDescription && (
                    <Text>
                      <strong>Description:</strong> {alertDescription}
                    </Text>
                  )}
                </Space>
              }
              type="info"
              style={{ marginTop: '16px' }}
            />
          )}
        </Form>
      </Modal>

      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};

export default AndonShopFloor;