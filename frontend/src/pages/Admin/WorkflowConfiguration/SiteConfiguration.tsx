/**
 * Site Configuration Page
 * Created for GitHub Issue #40 - Site-Level Workflow Configuration System
 *
 * Main admin page for managing site-level workflow configuration
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Button,
  Space,
  message,
  Spin,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Alert,
  Steps,
  Divider,
  Empty,
  Drawer,
  List,
  Avatar,
  Tag,
  Typography,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  UndoOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { workflowConfigurationAPI } from '@/api/workflowConfiguration';
import {
  SiteWorkflowConfiguration,
  WorkflowMode,
  UpdateSiteConfigurationRequest,
} from '@/types/workflowConfiguration';
import { ModeSelector } from './ModeSelector';
import { RuleToggle } from './RuleToggle';
import { ConfigurationHistoryTimeline } from './ConfigurationHistory';

const { Title, Text, Paragraph } = Typography;

interface SiteConfigurationPageProps {
  siteId: string;
}

export const SiteConfigurationPage: React.FC<SiteConfigurationPageProps> = ({ siteId }) => {
  const [currentMode, setCurrentMode] = useState<WorkflowMode>('STRICT');
  const [configuration, setConfiguration] = useState<Partial<SiteWorkflowConfiguration> | null>(
    null
  );
  const [isDirty, setIsDirty] = useState(false);
  const [selectedTab, setSelectedTab] = useState('configuration');
  const [historyPage, setHistoryPage] = useState(1);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  // Fetch current configuration
  const {
    data: siteConfig,
    isLoading: configLoading,
    refetch: refetchConfig,
    error: configError,
  } = useQuery({
    queryKey: [`site-workflow-config-${siteId}`],
    queryFn: () => workflowConfigurationAPI.getSiteConfiguration(siteId),
    enabled: !!siteId,
  });

  // Fetch configuration history
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: [`site-workflow-history-${siteId}`, historyPage],
    queryFn: () =>
      workflowConfigurationAPI.getSiteConfigurationHistory(siteId, 10, historyPage),
    enabled: !!siteId && selectedTab === 'history',
  });

  // Update configuration mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateSiteConfigurationRequest) =>
      workflowConfigurationAPI.updateSiteConfiguration(siteId, data),
    onSuccess: (updatedConfig) => {
      setConfiguration(updatedConfig);
      setIsDirty(false);
      setShowReasonModal(false);
      setChangeReason('');
      message.success('Configuration updated successfully');
      refetchConfig();
      refetchHistory();
    },
    onError: (error) => {
      message.error(`Failed to update configuration: ${error.message}`);
    },
  });

  // Initialize configuration
  useEffect(() => {
    if (siteConfig) {
      setConfiguration(siteConfig);
      setCurrentMode(siteConfig.mode);
    }
  }, [siteConfig]);

  const handleModeChange = (mode: WorkflowMode) => {
    setCurrentMode(mode);
    setConfiguration((prev) => ({
      ...prev,
      mode,
    }));
    setIsDirty(true);
  };

  const handleConfigChange = (newConfig: any) => {
    setConfiguration((prev) => ({
      ...prev,
      ...newConfig,
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!configuration) return;

    if (!changeReason) {
      setShowReasonModal(true);
      return;
    }

    updateMutation.mutate({
      ...configuration,
      reason: changeReason,
    } as UpdateSiteConfigurationRequest);
  };

  const handleReset = () => {
    Modal.confirm({
      title: 'Reset Configuration',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to discard unsaved changes?',
      okText: 'Yes, Discard',
      okType: 'danger',
      onOk() {
        setConfiguration(siteConfig || null);
        setCurrentMode(siteConfig?.mode || 'STRICT');
        setIsDirty(false);
      },
    });
  };

  if (configLoading) {
    return (
      <Card>
        <Spin size="large" />
      </Card>
    );
  }

  if (configError) {
    return (
      <Card>
        <Alert
          message="Error Loading Configuration"
          description="Failed to load site workflow configuration. Please try again."
          type="error"
          showIcon
        />
      </Card>
    );
  }

  if (!configuration) {
    return (
      <Card>
        <Empty description="No configuration found" />
      </Card>
    );
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>Site Workflow Configuration</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetchConfig()}
              loading={configLoading}
            >
              Refresh
            </Button>
            {isDirty && (
              <>
                <Button
                  icon={<UndoOutlined />}
                  onClick={handleReset}
                  danger
                >
                  Discard Changes
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={updateMutation.isPending}
                >
                  Save Changes
                </Button>
              </>
            )}
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        {isDirty && (
          <Alert
            message="Unsaved Changes"
            description="You have unsaved configuration changes. Save them now or discard to continue."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            icon={<WarningOutlined />}
          />
        )}

        <Tabs
          activeKey={selectedTab}
          onChange={setSelectedTab}
          items={[
            {
              key: 'configuration',
              label: 'Configuration',
              children: (
                <div style={{ marginTop: 16 }}>
                  {/* Mode Selection */}
                  <div style={{ marginBottom: 32 }}>
                    <ModeSelector
                      selectedMode={currentMode}
                      onModeSelect={handleModeChange}
                      disabled={!isDirty && !!siteConfig}
                    />
                  </div>

                  <Divider />

                  {/* Rule Configuration */}
                  <div style={{ marginBottom: 32 }}>
                    <Title level={3}>Enforcement Rules Configuration</Title>
                    <Paragraph>
                      Customize enforcement rules for the <strong>{currentMode}</strong> mode. Some
                      rules may be locked depending on the selected mode.
                    </Paragraph>
                    <RuleToggle
                      mode={currentMode}
                      config={configuration}
                      onConfigChange={handleConfigChange}
                    />
                  </div>

                  <Divider />

                  {/* Configuration Preview */}
                  <div>
                    <Title level={3}>Configuration Preview</Title>
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Card title="Current Settings" size="small">
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                              <Text type="secondary">Workflow Mode:</Text>
                              <div>
                                <Tag color="blue" style={{ marginTop: 4 }}>
                                  {currentMode}
                                </Tag>
                              </div>
                            </div>
                            <div>
                              <Text type="secondary">Enforcement Rules Enabled:</Text>
                              <div style={{ marginTop: 8 }}>
                                {configuration.enforceOperationSequence && (
                                  <div style={{ color: '#52c41a' }}>
                                    ✓ Operation Sequence
                                  </div>
                                )}
                                {configuration.enforceStatusGating && (
                                  <div style={{ color: '#52c41a' }}>
                                    ✓ Status Gating
                                  </div>
                                )}
                                {configuration.enforceQualityChecks && (
                                  <div style={{ color: '#52c41a' }}>
                                    ✓ Quality Checks
                                  </div>
                                )}
                                {configuration.allowExternalVouching && (
                                  <div style={{ color: '#52c41a' }}>
                                    ✓ External Vouching
                                  </div>
                                )}
                              </div>
                            </div>
                          </Space>
                        </Card>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Card title="Impact Analysis" size="small">
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                              <Text>Operations must follow sequence</Text>
                            </div>
                            {configuration.enforceStatusGating && (
                              <div>
                                <CheckCircleOutlined
                                  style={{ color: '#52c41a', marginRight: 8 }}
                                />
                                <Text>Work orders require IN_PROGRESS status</Text>
                              </div>
                            )}
                            {configuration.allowExternalVouching && (
                              <div>
                                <CheckCircleOutlined
                                  style={{ color: '#52c41a', marginRight: 8 }}
                                />
                                <Text>External systems can complete operations</Text>
                              </div>
                            )}
                          </Space>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                </div>
              ),
            },
            {
              key: 'history',
              label: (
                <Space>
                  <HistoryOutlined />
                  Configuration History
                </Space>
              ),
              children: (
                <div style={{ marginTop: 16 }}>
                  <ConfigurationHistoryTimeline
                    history={historyData?.data || []}
                    isLoading={historyLoading}
                    total={historyData?.pagination?.total || 0}
                    current={historyPage}
                    pageSize={10}
                    onPageChange={setHistoryPage}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Change Reason Modal */}
      <Modal
        title="Configuration Change Reason"
        open={showReasonModal}
        onOk={() => {
          if (changeReason.trim()) {
            handleSave();
          } else {
            message.error('Please provide a reason for the configuration change');
          }
        }}
        onCancel={() => setShowReasonModal(false)}
      >
        <Form layout="vertical">
          <Form.Item label="Change Reason (Required)">
            <Input.TextArea
              rows={4}
              placeholder="Explain why this configuration change is necessary..."
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
            />
          </Form.Item>
          <Alert
            message="This reason will be recorded in the configuration history for audit purposes"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default SiteConfigurationPage;
