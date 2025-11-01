/**
 * Component Override Framework Components
 *
 * React components for managing and displaying overrides.
 *
 * @module component-override-framework/components
 */

import * as React from 'react';
import {
  Alert,
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Space,
  Spin,
  Statistic,
  Row,
  Col,
} from 'antd';
import { useExtensionContext, useTheme, usePermission } from '@machshop/frontend-extension-sdk';
import { useComponentOverrideStore } from './store';
import type { OverrideRegistryEntry } from './types';

/**
 * Component override status indicator
 */
export function OverrideStatusBadge({
  status,
}: {
  status: 'active' | 'inactive' | 'failed' | 'pending';
}): React.ReactElement {
  const colorMap = {
    active: 'green',
    inactive: 'blue',
    failed: 'red',
    pending: 'orange',
  };

  return <Tag color={colorMap[status]}>{status.toUpperCase()}</Tag>;
}

/**
 * Component override list component
 */
export function OverridesList(): React.ReactElement {
  const { tokens } = useTheme();
  const { hasPermission } = usePermission();
  const { registry } = useComponentOverrideStore();

  if (!hasPermission('admin:manage-overrides')) {
    return (
      <Alert
        message="You do not have permission to view component overrides"
        type="info"
        showIcon
      />
    );
  }

  const columns = [
    {
      title: 'Contract',
      dataIndex: ['contract', 'name'],
      key: 'contract',
    },
    {
      title: 'Extension',
      dataIndex: ['override', 'extensionId'],
      key: 'extension',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive: boolean) => (
        <OverrideStatusBadge status={isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      title: 'Validation',
      dataIndex: ['validation', 'valid'],
      key: 'validation',
      render: (valid: boolean) => (
        <Tag color={valid ? 'green' : 'red'}>{valid ? 'VALID' : 'INVALID'}</Tag>
      ),
    },
    {
      title: 'Risk Level',
      dataIndex: ['compatibility', 'riskLevel'],
      key: 'risk',
      render: (risk: string) => {
        const colors = {
          low: 'green',
          medium: 'orange',
          high: 'red',
          critical: 'red',
        };
        return <Tag color={colors[risk as keyof typeof colors]}>{risk}</Tag>;
      },
    },
    {
      title: 'Usage',
      dataIndex: 'usageCount',
      key: 'usage',
    },
  ];

  return (
    <div
      style={{
        backgroundColor: tokens.colorBgPrimary,
        padding: tokens.spacingMd,
        borderRadius: tokens.borderRadius,
      }}
    >
      <h3 style={{ color: tokens.colorTextPrimary, marginBottom: tokens.spacingMd }}>
        Component Overrides ({registry.length})
      </h3>

      {registry.length === 0 ? (
        <Alert message="No component overrides registered" type="info" showIcon />
      ) : (
        <Table
          columns={columns as any}
          dataSource={registry.map((entry) => ({
            ...entry,
            key: entry.override.id,
          }))}
          size="small"
          pagination={{ pageSize: 10 }}
        />
      )}
    </div>
  );
}

/**
 * Override validation results component
 */
export function OverrideValidationResults({
  entry,
}: {
  entry: OverrideRegistryEntry;
}): React.ReactElement {
  const { tokens } = useTheme();
  const [detailsVisible, setDetailsVisible] = React.useState(false);

  const { validation, compatibility } = entry;
  const hasErrors = validation.errors.length > 0;
  const hasIssues = compatibility.issues.length > 0;

  return (
    <Card
      style={{
        borderLeft: `4px solid ${
          hasErrors || hasIssues ? tokens.colorError : tokens.colorSuccess
        }`,
      }}
    >
      <Row gutter={tokens.spacingMd}>
        <Col span={12}>
          <Statistic
            title="Validation Status"
            value={validation.valid ? 'VALID' : 'INVALID'}
            valueStyle={{
              color: validation.valid ? tokens.colorSuccess : tokens.colorError,
            }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="Compatibility"
            value={compatibility.compatible ? 'OK' : 'ISSUES'}
            valueStyle={{
              color: compatibility.compatible ? tokens.colorSuccess : tokens.colorError,
            }}
          />
        </Col>
      </Row>

      {hasErrors && (
        <Alert
          type="error"
          message={`${validation.errors.length} Validation Errors`}
          style={{ marginTop: tokens.spacingMd }}
        />
      )}

      {hasIssues && (
        <Alert
          type="warning"
          message={`${compatibility.issues.length} Compatibility Issues`}
          style={{ marginTop: tokens.spacingMd }}
        />
      )}

      <Button
        type="link"
        onClick={() => setDetailsVisible(!detailsVisible)}
        style={{ marginTop: tokens.spacingMd }}
      >
        {detailsVisible ? 'Hide Details' : 'Show Details'}
      </Button>

      {detailsVisible && (
        <div style={{ marginTop: tokens.spacingMd }}>
          {hasErrors && (
            <div style={{ marginBottom: tokens.spacingMd }}>
              <h4 style={{ color: tokens.colorError }}>Errors</h4>
              {validation.errors.map((error, i) => (
                <div key={i} style={{ marginBottom: tokens.spacingSm }}>
                  <p style={{ color: tokens.colorTextPrimary, fontWeight: 500 }}>
                    {error.message}
                  </p>
                  {error.fix && (
                    <p style={{ color: tokens.colorTextSecondary, fontSize: '12px' }}>
                      Fix: {error.fix}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {hasIssues && (
            <div>
              <h4 style={{ color: tokens.colorWarning }}>Compatibility Issues</h4>
              {compatibility.issues.map((issue, i) => (
                <div key={i} style={{ marginBottom: tokens.spacingSm }}>
                  <p style={{ color: tokens.colorTextPrimary, fontWeight: 500 }}>
                    {issue.description}
                  </p>
                  {issue.suggestedFix && (
                    <p style={{ color: tokens.colorTextSecondary, fontSize: '12px' }}>
                      Suggested Fix: {issue.suggestedFix}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * Loading overrides state component
 */
export function OverridesLoading(): React.ReactElement {
  const { tokens } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spacingLg,
        minHeight: '200px',
      }}
    >
      <Spin size="large" />
      <p style={{ marginTop: tokens.spacingMd, color: tokens.colorTextSecondary }}>
        Loading component overrides...
      </p>
    </div>
  );
}
