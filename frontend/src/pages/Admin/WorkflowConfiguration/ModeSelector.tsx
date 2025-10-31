/**
 * Mode Selector Component
 * Created for GitHub Issue #40 - Site-Level Workflow Configuration System
 *
 * Displays three workflow modes as visual cards with descriptions and use cases
 */

import React from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Button,
  Alert,
} from 'antd';
import {
  LockOutlined,
  SwitcherOutlined,
  ConnectOutlined,
  CheckCircleOutlined,
  ExclamationOutlined,
} from '@ant-design/icons';
import { WorkflowMode } from '@/types/workflowConfiguration';
import styles from './WorkflowConfiguration.module.css';

const { Title, Text, Paragraph } = Typography;

interface ModeSelectorProps {
  selectedMode: WorkflowMode;
  onModeSelect: (mode: WorkflowMode) => void;
  disabled?: boolean;
}

const modeConfigs = {
  STRICT: {
    icon: <LockOutlined style={{ fontSize: 48 }} />,
    color: '#ff4d4f',
    title: 'STRICT Mode',
    description: 'Full ISA-95 enforcement with comprehensive workflow controls',
    useCases: [
      'FDA-regulated production',
      'Aerospace critical parts',
      'Full MES execution required',
      'Complete compliance traceability',
    ],
    rules: [
      { label: 'Enforce Operation Sequence', value: true },
      { label: 'Enforce Status Gating', value: true },
      { label: 'Allow External Vouching', value: false },
      { label: 'Enforce Quality Checks', value: true },
    ],
  },
  FLEXIBLE: {
    icon: <SwitcherOutlined style={{ fontSize: 48 }} />,
    color: '#faad14',
    title: 'FLEXIBLE Mode',
    description: 'Relaxed prerequisites for data collection while maintaining quality',
    useCases: [
      'Route authoring & iteration',
      'Data collection without status constraints',
      'Work instruction viewing',
      'Shop floor forms',
    ],
    rules: [
      { label: 'Enforce Operation Sequence', value: true },
      { label: 'Enforce Status Gating', value: false },
      { label: 'Allow External Vouching', value: false },
      { label: 'Enforce Quality Checks', value: true },
    ],
  },
  HYBRID: {
    icon: <ConnectOutlined style={{ fontSize: 48 }} />,
    color: '#1890ff',
    title: 'HYBRID Mode',
    description: 'External system execution with flexible MES data collection',
    useCases: [
      'External ERP execution',
      'Legacy system integration',
      'Phased migration scenarios',
      'Multi-system orchestration',
    ],
    rules: [
      { label: 'Enforce Operation Sequence', value: true },
      { label: 'Enforce Status Gating', value: false },
      { label: 'Allow External Vouching', value: true },
      { label: 'Enforce Quality Checks', value: true },
    ],
  },
};

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  selectedMode,
  onModeSelect,
  disabled = false,
}) => {
  const selectedConfig = modeConfigs[selectedMode];

  return (
    <div>
      <Title level={3}>Workflow Mode Selection</Title>
      <Paragraph>
        Choose a workflow mode that matches your operational requirements. Each mode provides
        different levels of enforcement and flexibility.
      </Paragraph>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {(Object.entries(modeConfigs) as [WorkflowMode, typeof modeConfigs.STRICT][]).map(
          ([mode, config]) => {
            const isSelected = mode === selectedMode;
            return (
              <Col xs={24} sm={24} md={8} key={mode}>
                <Card
                  hoverable
                  onClick={() => !disabled && onModeSelect(mode)}
                  style={{
                    border: isSelected ? `2px solid ${config.color}` : '1px solid #f0f0f0',
                    backgroundColor: isSelected ? `${config.color}08` : 'transparent',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                  }}
                  className={styles.modeCard}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div style={{ color: config.color, textAlign: 'center' }}>
                      {config.icon}
                    </div>

                    <div>
                      <Title level={4} style={{ margin: 0, color: config.color }}>
                        {config.title}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {config.description}
                      </Text>
                    </div>

                    <div>
                      <Text strong style={{ fontSize: 12 }}>
                        Use Cases:
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        {config.useCases.map((useCase, idx) => (
                          <div key={idx} style={{ fontSize: 12, marginBottom: 4 }}>
                            <CheckCircleOutlined
                              style={{ color: config.color, marginRight: 6 }}
                            />
                            {useCase}
                          </div>
                        ))}
                      </div>
                    </div>

                    {isSelected && (
                      <Button
                        type="primary"
                        block
                        style={{ backgroundColor: config.color, borderColor: config.color }}
                      >
                        Currently Selected
                      </Button>
                    )}
                  </Space>
                </Card>
              </Col>
            );
          }
        )}
      </Row>

      {/* Selected Mode Details */}
      <Card style={{ marginBottom: 24, backgroundColor: '#f6f8fb' }}>
        <Title level={4}>Selected Mode: {selectedConfig.title}</Title>
        <Paragraph>{selectedConfig.description}</Paragraph>

        <Title level={5}>Default Enforcement Rules:</Title>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
          {selectedConfig.rules.map((rule, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {rule.value ? (
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
              ) : (
                <ExclamationOutlined style={{ color: '#faad14', fontSize: 16 }} />
              )}
              <Text>
                {rule.label}: <strong>{rule.value ? 'Enabled' : 'Disabled'}</strong>
              </Text>
            </div>
          ))}
        </div>
      </Card>

      <Alert
        message="Mode Constraints"
        description={
          <div>
            <Paragraph style={{ marginBottom: 8 }}>
              <strong>STRICT mode</strong> enforces all controls and cannot be relaxed.
            </Paragraph>
            <Paragraph>
              <strong>FLEXIBLE and HYBRID modes</strong> allow configuration of individual rules
              while maintaining security and quality requirements.
            </Paragraph>
          </div>
        }
        type="info"
        showIcon
      />
    </div>
  );
};
