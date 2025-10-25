import React, { useState, useEffect } from 'react';
import {
  Alert,
  List,
  Card,
  Tag,
  Space,
  Typography,
  Button,
  Modal,
  Input,
  Badge,
  Tabs,
  Empty,
  Tooltip,
  message,
  Descriptions,
} from 'antd';
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

/**
 * Rule Violation
 */
interface RuleViolation {
  id: string;
  configurationId: string;
  ruleNumber: number;
  ruleName: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  dataPointId?: string;
  value: number;
  timestamp: string;
  subgroupNumber?: number;
  UCL?: number;
  LCL?: number;
  centerLine?: number;
  deviationSigma?: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolution?: string;
  createdAt: string;
}

/**
 * RuleViolationAlert Props
 */
interface RuleViolationAlertProps {
  /** Parameter ID to show violations for */
  parameterId: string;
  /** Parameter name */
  parameterName?: string;
  /** Auto-refresh interval in milliseconds (0 to disable) */
  refreshInterval?: number;
  /** Max violations to display */
  maxViolations?: number;
  /** Show acknowledged violations */
  showAcknowledged?: boolean;
}

/**
 * RuleViolationAlert Component
 *
 * Displays and manages SPC rule violations with acknowledgement workflow.
 *
 * Features:
 * - Real-time violation alerts
 * - Severity-based styling (critical, warning, info)
 * - Acknowledgement workflow
 * - Resolution tracking
 * - Filtering by severity and status
 * - Auto-refresh
 * - Violation details modal
 *
 * @example
 * ```tsx
 * <RuleViolationAlert
 *   parameterId="param-123"
 *   parameterName="Temperature"
 *   refreshInterval={30000}
 *   maxViolations={20}
 * />
 * ```
 */
export const RuleViolationAlert: React.FC<RuleViolationAlertProps> = ({
  parameterId,
  parameterName = 'Parameter',
  refreshInterval = 30000,
  maxViolations = 50,
  showAcknowledged = true,
}) => {
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [loading, setLoading] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<RuleViolation | null>(null);
  const [resolution, setResolution] = useState('');
  const [activeTab, setActiveTab] = useState('unacknowledged');

  // Fetch violations
  const fetchViolations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/spc/rule-violations/${parameterId}`, {
        params: {
          acknowledged: showAcknowledged ? undefined : false,
        },
      });
      setViolations(response.data.slice(0, maxViolations));
    } catch (error) {
      console.error('Error fetching rule violations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchViolations();
  }, [parameterId, showAcknowledged]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchViolations, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, parameterId, showAcknowledged]);

  // Acknowledge violation
  const handleAcknowledge = async () => {
    if (!selectedViolation || !resolution.trim()) {
      message.error('Please provide a resolution description');
      return;
    }

    try {
      setAcknowledging(true);
      await axios.post(`/api/v1/spc/rule-violations/${selectedViolation.id}/acknowledge`, {
        resolution,
      });
      message.success('Violation acknowledged successfully');
      setSelectedViolation(null);
      setResolution('');
      fetchViolations();
    } catch (error: any) {
      console.error('Error acknowledging violation:', error);
      message.error(error.response?.data?.error || 'Failed to acknowledge violation');
    } finally {
      setAcknowledging(false);
    }
  };

  // Get severity icon and color
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return { icon: <WarningOutlined />, color: 'red', text: 'Critical' };
      case 'WARNING':
        return { icon: <ExclamationCircleOutlined />, color: 'orange', text: 'Warning' };
      case 'INFO':
        return { icon: <InfoCircleOutlined />, color: 'blue', text: 'Info' };
      default:
        return { icon: <InfoCircleOutlined />, color: 'default', text: severity };
    }
  };

  // Get violation summary
  const violationSummary = {
    total: violations.length,
    critical: violations.filter((v) => v.severity === 'CRITICAL' && !v.acknowledged).length,
    warning: violations.filter((v) => v.severity === 'WARNING' && !v.acknowledged).length,
    info: violations.filter((v) => v.severity === 'INFO' && !v.acknowledged).length,
    unacknowledged: violations.filter((v) => !v.acknowledged).length,
    acknowledged: violations.filter((v) => v.acknowledged).length,
  };

  // Filter violations by tab
  const getFilteredViolations = () => {
    switch (activeTab) {
      case 'unacknowledged':
        return violations.filter((v) => !v.acknowledged);
      case 'acknowledged':
        return violations.filter((v) => v.acknowledged);
      case 'critical':
        return violations.filter((v) => v.severity === 'CRITICAL');
      case 'warning':
        return violations.filter((v) => v.severity === 'WARNING');
      default:
        return violations;
    }
  };

  const filteredViolations = getFilteredViolations();

  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            Rule Violations - {parameterName}
          </Title>
          {violationSummary.unacknowledged > 0 && (
            <Badge
              count={violationSummary.unacknowledged}
              style={{ backgroundColor: '#f5222d' }}
              overflowCount={99}
            />
          )}
        </Space>
      }
      extra={
        <Button onClick={fetchViolations} loading={loading}>
          Refresh
        </Button>
      }
    >
      {/* Summary Alerts */}
      {violationSummary.critical > 0 && (
        <Alert
          message={`${violationSummary.critical} Critical Violation(s)`}
          description="Immediate action required. Process is out of control."
          type="error"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: '16px' }}
        />
      )}
      {violationSummary.warning > 0 && violationSummary.critical === 0 && (
        <Alert
          message={`${violationSummary.warning} Warning Violation(s)`}
          description="Process showing signs of instability. Investigation recommended."
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <Space>
              Unacknowledged
              {violationSummary.unacknowledged > 0 && (
                <Badge count={violationSummary.unacknowledged} />
              )}
            </Space>
          }
          key="unacknowledged"
        />
        <TabPane
          tab={
            <Space>
              Acknowledged
              {violationSummary.acknowledged > 0 && (
                <Badge count={violationSummary.acknowledged} style={{ backgroundColor: '#52c41a' }} />
              )}
            </Space>
          }
          key="acknowledged"
        />
        <TabPane
          tab={
            <Space>
              Critical
              {violations.filter((v) => v.severity === 'CRITICAL').length > 0 && (
                <Badge count={violations.filter((v) => v.severity === 'CRITICAL').length} />
              )}
            </Space>
          }
          key="critical"
        />
        <TabPane
          tab={
            <Space>
              Warning
              {violations.filter((v) => v.severity === 'WARNING').length > 0 && (
                <Badge count={violations.filter((v) => v.severity === 'WARNING').length} />
              )}
            </Space>
          }
          key="warning"
        />
      </Tabs>

      {/* Violations List */}
      {filteredViolations.length === 0 ? (
        <Empty description="No violations found" style={{ marginTop: '24px' }} />
      ) : (
        <List
          dataSource={filteredViolations}
          loading={loading}
          renderItem={(violation) => {
            const severityConfig = getSeverityConfig(violation.severity);
            return (
              <List.Item
                actions={[
                  !violation.acknowledged && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        setSelectedViolation(violation);
                        setResolution('');
                      }}
                    >
                      Acknowledge
                    </Button>
                  ),
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedViolation(violation);
                    }}
                  >
                    Details
                  </Button>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ fontSize: '24px', color: severityConfig.color === 'red' ? '#f5222d' : '#fa8c16' }}>
                      {severityConfig.icon}
                    </div>
                  }
                  title={
                    <Space>
                      <Tag color={severityConfig.color} icon={severityConfig.icon}>
                        {severityConfig.text}
                      </Tag>
                      <Text strong>Rule {violation.ruleNumber}</Text>
                      <Text>{violation.ruleName}</Text>
                      {violation.acknowledged && (
                        <Tag color="green" icon={<CheckCircleOutlined />}>
                          Acknowledged
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <Paragraph style={{ marginBottom: '8px' }}>
                        Value: <Text strong>{violation.value.toFixed(3)}</Text>
                        {violation.UCL && <> (UCL: {violation.UCL.toFixed(3)})</>}
                        {violation.LCL && <> (LCL: {violation.LCL.toFixed(3)})</>}
                      </Paragraph>
                      <Space size={16}>
                        <Tooltip title={dayjs(violation.timestamp).format('YYYY-MM-DD HH:mm:ss')}>
                          <Text type="secondary">{dayjs(violation.timestamp).fromNow()}</Text>
                        </Tooltip>
                        {violation.subgroupNumber && <Text type="secondary">Subgroup #{violation.subgroupNumber}</Text>}
                      </Space>
                      {violation.acknowledged && violation.acknowledgedBy && (
                        <div style={{ marginTop: '8px' }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Acknowledged by {violation.acknowledgedBy} {dayjs(violation.acknowledgedAt).fromNow()}
                          </Text>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}

      {/* Violation Details / Acknowledgement Modal */}
      <Modal
        title={
          <Space>
            {selectedViolation && getSeverityConfig(selectedViolation.severity).icon}
            <Text>Violation Details - Rule {selectedViolation?.ruleNumber}</Text>
          </Space>
        }
        open={!!selectedViolation}
        onCancel={() => {
          setSelectedViolation(null);
          setResolution('');
        }}
        footer={
          selectedViolation?.acknowledged
            ? [
                <Button key="close" onClick={() => setSelectedViolation(null)}>
                  Close
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={() => setSelectedViolation(null)}>
                  Cancel
                </Button>,
                <Button
                  key="acknowledge"
                  type="primary"
                  loading={acknowledging}
                  onClick={handleAcknowledge}
                  disabled={!resolution.trim()}
                >
                  Acknowledge Violation
                </Button>,
              ]
        }
        width={700}
      >
        {selectedViolation && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Rule Number">{selectedViolation.ruleNumber}</Descriptions.Item>
              <Descriptions.Item label="Severity">
                <Tag color={getSeverityConfig(selectedViolation.severity).color}>
                  {selectedViolation.severity}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Rule Name" span={2}>
                {selectedViolation.ruleName}
              </Descriptions.Item>
              <Descriptions.Item label="Value">{selectedViolation.value.toFixed(3)}</Descriptions.Item>
              <Descriptions.Item label="Timestamp">
                {dayjs(selectedViolation.timestamp).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              {selectedViolation.UCL && (
                <Descriptions.Item label="Upper Control Limit (UCL)">
                  {selectedViolation.UCL.toFixed(3)}
                </Descriptions.Item>
              )}
              {selectedViolation.LCL && (
                <Descriptions.Item label="Lower Control Limit (LCL)">
                  {selectedViolation.LCL.toFixed(3)}
                </Descriptions.Item>
              )}
              {selectedViolation.centerLine && (
                <Descriptions.Item label="Center Line (CL)">{selectedViolation.centerLine.toFixed(3)}</Descriptions.Item>
              )}
              {selectedViolation.deviationSigma && (
                <Descriptions.Item label="Deviation (σ)">
                  {selectedViolation.deviationSigma.toFixed(3)}σ
                </Descriptions.Item>
              )}
              {selectedViolation.subgroupNumber && (
                <Descriptions.Item label="Subgroup Number">{selectedViolation.subgroupNumber}</Descriptions.Item>
              )}
              <Descriptions.Item label="Status">
                {selectedViolation.acknowledged ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    Acknowledged
                  </Tag>
                ) : (
                  <Tag color="red" icon={<CloseCircleOutlined />}>
                    Unacknowledged
                  </Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            {selectedViolation.acknowledged && selectedViolation.resolution && (
              <div style={{ marginTop: '16px' }}>
                <Text strong>Resolution:</Text>
                <Paragraph style={{ marginTop: '8px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                  {selectedViolation.resolution}
                </Paragraph>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Acknowledged by {selectedViolation.acknowledgedBy} on{' '}
                  {dayjs(selectedViolation.acknowledgedAt).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              </div>
            )}

            {!selectedViolation.acknowledged && (
              <div style={{ marginTop: '16px' }}>
                <Text strong>Resolution / Action Taken:</Text>
                <TextArea
                  rows={4}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Describe the corrective action taken or investigation results..."
                  maxLength={1000}
                  showCount
                  style={{ marginTop: '8px' }}
                />
                <Alert
                  message="Acknowledgement Required"
                  description="Please describe the corrective action taken or investigation results before acknowledging this violation."
                  type="info"
                  showIcon
                  style={{ marginTop: '12px' }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default RuleViolationAlert;
