/**
 * Rule Toggle Component
 * Created for GitHub Issue #40 - Site-Level Workflow Configuration System
 *
 * Displays enforcement rule toggles with descriptions
 */

import React from 'react';
import {
  Card,
  Space,
  Switch,
  Typography,
  Row,
  Col,
  Collapse,
  Alert,
} from 'antd';
import {
  InfoCircleOutlined,
  LockOutlined,
  ExclamationOutlined,
} from '@ant-design/icons';
import { WorkflowMode, WorkflowConfigurationBase } from '@/types/workflowConfiguration';

const { Text, Paragraph } = Typography;

interface Rule {
  key: keyof WorkflowConfigurationBase;
  label: string;
  description: string;
  help: string;
  defaultValue: boolean;
  allowedInModes: WorkflowMode[];
  lockedInStrict?: boolean;
}

interface RuleToggleProps {
  mode: WorkflowMode;
  config: WorkflowConfigurationBase;
  onConfigChange: (config: WorkflowConfigurationBase) => void;
  disabled?: boolean;
}

const rules: Rule[] = [
  {
    key: 'enforceOperationSequence',
    label: 'Enforce Operation Sequence',
    description: 'Require operations to be completed in defined order',
    help: 'Operations must be completed sequentially according to the routing. Prevents skipping or reordering operations.',
    defaultValue: true,
    allowedInModes: ['STRICT', 'FLEXIBLE', 'HYBRID'],
  },
  {
    key: 'enforceStatusGating',
    label: 'Enforce Status Gating',
    description: 'Require specific status before data collection',
    help: 'Work order must be in IN_PROGRESS status before data collection is allowed. Critical for strict manufacturing control.',
    defaultValue: true,
    allowedInModes: ['STRICT'],
    lockedInStrict: true,
  },
  {
    key: 'allowExternalVouching',
    label: 'Allow External Vouching',
    description: 'Accept operation completions from external systems',
    help: 'External systems (ERP, legacy systems) can report operation completions that MES will accept. Enables hybrid execution modes.',
    defaultValue: false,
    allowedInModes: ['HYBRID'],
  },
  {
    key: 'enforceQualityChecks',
    label: 'Enforce Quality Checks',
    description: 'Require quality verification before operation completion',
    help: 'All quality checks must be completed and passed before marking operations as complete. Mandatory in all modes.',
    defaultValue: true,
    allowedInModes: ['STRICT', 'FLEXIBLE', 'HYBRID'],
  },
  {
    key: 'requireStartTransition',
    label: 'Require Start Transition',
    description: 'Explicitly require start action before work begins',
    help: 'Operators must explicitly start work. Provides clear audit trail of when work actually began.',
    defaultValue: true,
    allowedInModes: ['STRICT', 'FLEXIBLE', 'HYBRID'],
  },
  {
    key: 'requireJustification',
    label: 'Require Justification for Deviations',
    description: 'Document reason for any workflow deviations',
    help: 'Any deviation from standard workflow requires documented justification. Important for compliance and root cause analysis.',
    defaultValue: false,
    allowedInModes: ['STRICT', 'FLEXIBLE', 'HYBRID'],
  },
  {
    key: 'requireApproval',
    label: 'Require Approval for Status Changes',
    description: 'Supervisory approval needed for status transitions',
    help: 'Critical status changes require supervisor approval. Prevents unauthorized workflow progression.',
    defaultValue: false,
    allowedInModes: ['STRICT', 'FLEXIBLE', 'HYBRID'],
  },
];

export const RuleToggle: React.FC<RuleToggleProps> = ({
  mode,
  config,
  onConfigChange,
  disabled = false,
}) => {
  const handleRuleChange = (ruleKey: keyof WorkflowConfigurationBase, value: boolean) => {
    onConfigChange({
      ...config,
      [ruleKey]: value,
    });
  };

  const applicableRules = rules.filter((rule) => rule.allowedInModes.includes(mode));

  return (
    <div>
      {mode === 'STRICT' && (
        <Alert
          message="STRICT Mode - Limited Customization"
          description="In STRICT mode, most enforcement rules are locked to ensure full ISA-95 compliance. You can only customize optional policies."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          icon={<LockOutlined />}
        />
      )}

      <Collapse
        items={applicableRules.map((rule) => {
          const isLocked = mode === 'STRICT' && rule.lockedInStrict;
          const currentValue =
            (config[rule.key] as boolean) ?? rule.defaultValue;

          return {
            key: rule.key,
            label: (
              <Space>
                <Text strong>{rule.label}</Text>
                {isLocked && <LockOutlined style={{ color: '#faad14' }} />}
              </Space>
            ),
            extra: (
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={currentValue}
                  onChange={(value) => handleRuleChange(rule.key, value)}
                  disabled={disabled || isLocked}
                />
              </div>
            ),
            children: (
              <div>
                <Paragraph>{rule.description}</Paragraph>
                <Card
                  size="small"
                  style={{
                    backgroundColor: '#f6f8fb',
                    marginTop: 12,
                  }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <InfoCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                      <Text>{rule.help}</Text>
                    </div>
                    {isLocked && (
                      <div>
                        <ExclamationOutlined
                          style={{ marginRight: 8, color: '#faad14' }}
                        />
                        <Text type="warning">
                          This rule is locked in STRICT mode for compliance reasons.
                        </Text>
                      </div>
                    )}
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Current Value: <strong>{currentValue ? 'Enabled' : 'Disabled'}</strong>
                      </Text>
                    </div>
                  </Space>
                </Card>
              </div>
            ),
          };
        })}
        defaultActiveKey={[]}
      />

      {/* Summary */}
      <Card
        style={{
          marginTop: 16,
          backgroundColor: '#fafafa',
        }}
        size="small"
      >
        <Row gutter={16}>
          {applicableRules.map((rule) => {
            const value = (config[rule.key] as boolean) ?? rule.defaultValue;
            return (
              <Col xs={24} sm={12} md={8} key={rule.key}>
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                  <Text type="secondary">{rule.label}</Text>
                  <div style={{ marginTop: 4 }}>
                    <Text strong style={{ color: value ? '#52c41a' : '#ff4d4f' }}>
                      {value ? '✓ Enabled' : '✗ Disabled'}
                    </Text>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>
    </div>
  );
};
