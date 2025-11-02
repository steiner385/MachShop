/**
 * DarkModeAwareComponent - Theme-aware component example
 *
 * This example demonstrates:
 * - Theme token access via useTheme hook
 * - Dark/light mode handling
 * - CSS variable usage
 * - Dynamic theme switching
 * - Responsive theme adaptation
 *
 * @example
 * <DarkModeAwareComponent />
 */

import React, { useMemo } from 'react';
import { Card, Switch, Space, Typography, Divider, Tag } from 'antd';
import {
  BulbOutlined,
  BulbFilled,
  SunOutlined,
  MoonOutlined
} from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import styles from './DarkModeAwareComponent.module.css';

const { Title, Paragraph, Text } = Typography;

/**
 * Props interface
 */
export interface DarkModeAwareComponentProps {
  /** Show theme toggle switch */
  showToggle?: boolean;

  /** Custom title */
  title?: string;
}

/**
 * DarkModeAwareComponent
 *
 * Demonstrates how to build components that adapt to theme changes.
 * Uses theme tokens for consistent styling in both light and dark modes.
 */
export const DarkModeAwareComponent: React.FC<DarkModeAwareComponentProps> = ({
  showToggle = true,
  title = 'Theme-Aware Component',
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  /**
   * Example: Compute theme-specific values
   */
  const themeColors = useMemo(() => ({
    primary: theme.tokens.colorPrimary,
    success: theme.tokens.colorSuccess,
    warning: theme.tokens.colorWarning,
    error: theme.tokens.colorError,
    info: theme.tokens.colorInfo,
  }), [theme]);

  /**
   * Example: Dynamic styles based on theme
   */
  const cardStyle = useMemo(() => ({
    backgroundColor: theme.tokens.colorBgContainer,
    borderColor: theme.tokens.colorBorder,
    boxShadow: isDark ? 'none' : theme.tokens.boxShadow,
  }), [theme, isDark]);

  /**
   * Example: Theme-aware text colors
   */
  const textStyles = useMemo(() => ({
    primary: {
      color: theme.tokens.colorTextBase,
      fontSize: theme.tokens.fontSize,
    },
    secondary: {
      color: theme.tokens.colorTextSecondary,
      fontSize: theme.tokens.fontSize * 0.875,
    },
    heading: {
      color: theme.tokens.colorTextBase,
      fontSize: theme.tokens.fontSizeHeading3,
      fontWeight: theme.tokens.fontWeightStrong,
    },
  }), [theme]);

  return (
    <Card
      className={styles.container}
      style={cardStyle}
      title={
        <Space>
          {isDark ? <MoonOutlined /> : <SunOutlined />}
          <span style={textStyles.heading}>{title}</span>
        </Space>
      }
      extra={
        showToggle && (
          <Space>
            <Text style={textStyles.secondary}>
              {isDark ? 'Dark' : 'Light'} Mode
            </Text>
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              checkedChildren={<BulbFilled />}
              unCheckedChildren={<BulbOutlined />}
            />
          </Space>
        )
      }
    >
      {/* Current theme information */}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4} style={textStyles.heading}>
            Current Theme: {isDark ? 'Dark' : 'Light'}
          </Title>
          <Paragraph style={textStyles.secondary}>
            This component automatically adapts to theme changes.
            All colors and spacing use design tokens for consistency.
          </Paragraph>
        </div>

        <Divider style={{ borderColor: theme.tokens.colorBorder }} />

        {/* Color palette display */}
        <div>
          <Title level={5} style={textStyles.heading}>
            Theme Colors
          </Title>
          <Space wrap>
            <Tag
              color={themeColors.primary}
              style={{ padding: '4px 12px', fontSize: '14px' }}
            >
              Primary
            </Tag>
            <Tag
              color={themeColors.success}
              style={{ padding: '4px 12px', fontSize: '14px' }}
            >
              Success
            </Tag>
            <Tag
              color={themeColors.warning}
              style={{ padding: '4px 12px', fontSize: '14px' }}
            >
              Warning
            </Tag>
            <Tag
              color={themeColors.error}
              style={{ padding: '4px 12px', fontSize: '14px' }}
            >
              Error
            </Tag>
            <Tag
              color={themeColors.info}
              style={{ padding: '4px 12px', fontSize: '14px' }}
            >
              Info
            </Tag>
          </Space>
        </div>

        <Divider style={{ borderColor: theme.tokens.colorBorder }} />

        {/* Typography examples */}
        <div>
          <Title level={5} style={textStyles.heading}>
            Typography
          </Title>
          <Space direction="vertical">
            <Text style={textStyles.primary}>
              Primary text color (colorTextBase)
            </Text>
            <Text style={textStyles.secondary}>
              Secondary text color (colorTextSecondary)
            </Text>
            <Text style={{ color: theme.tokens.colorTextTertiary }}>
              Tertiary text color (colorTextTertiary)
            </Text>
            <Text
              style={{
                color: theme.tokens.colorPrimary,
                fontWeight: theme.tokens.fontWeightStrong
              }}
            >
              Primary color text
            </Text>
          </Space>
        </div>

        <Divider style={{ borderColor: theme.tokens.colorBorder }} />

        {/* Background examples */}
        <div>
          <Title level={5} style={textStyles.heading}>
            Background Layers
          </Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div
              className={styles.backgroundExample}
              style={{
                backgroundColor: theme.tokens.colorBgBase,
                padding: theme.tokens.marginMD,
                borderRadius: '4px',
                border: `1px solid ${theme.tokens.colorBorder}`
              }}
            >
              <Text style={textStyles.primary}>
                Base Background (colorBgBase)
              </Text>
            </div>
            <div
              className={styles.backgroundExample}
              style={{
                backgroundColor: theme.tokens.colorBgContainer,
                padding: theme.tokens.marginMD,
                borderRadius: '4px',
                border: `1px solid ${theme.tokens.colorBorder}`
              }}
            >
              <Text style={textStyles.primary}>
                Container Background (colorBgContainer)
              </Text>
            </div>
            <div
              className={styles.backgroundExample}
              style={{
                backgroundColor: theme.tokens.colorBgElevated,
                padding: theme.tokens.marginMD,
                borderRadius: '4px',
                border: `1px solid ${theme.tokens.colorBorder}`,
                boxShadow: theme.tokens.boxShadow
              }}
            >
              <Text style={textStyles.primary}>
                Elevated Background (colorBgElevated)
              </Text>
            </div>
          </Space>
        </div>

        <Divider style={{ borderColor: theme.tokens.colorBorder }} />

        {/* Spacing examples */}
        <div>
          <Title level={5} style={textStyles.heading}>
            Spacing Tokens
          </Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            {[
              { label: 'XS', value: theme.tokens.marginXS },
              { label: 'SM', value: theme.tokens.marginSM },
              { label: 'MD', value: theme.tokens.marginMD },
              { label: 'LG', value: theme.tokens.marginLG },
              { label: 'XL', value: theme.tokens.marginXL },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Text style={{ ...textStyles.secondary, minWidth: '40px' }}>
                  {label}:
                </Text>
                <div
                  style={{
                    width: value,
                    height: '24px',
                    backgroundColor: theme.tokens.colorPrimary,
                    borderRadius: '2px'
                  }}
                />
                <Text style={textStyles.secondary}>
                  {value}px
                </Text>
              </div>
            ))}
          </Space>
        </div>

        {/* Developer information */}
        <div
          className={styles.footer}
          style={{
            marginTop: theme.tokens.marginLG,
            padding: theme.tokens.marginMD,
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.02)',
            borderRadius: '4px',
            border: `1px solid ${theme.tokens.colorBorder}`
          }}
        >
          <Text style={textStyles.secondary}>
            <strong>Tip:</strong> Use theme tokens instead of hard-coded values
            to ensure your components work in both light and dark modes.
          </Text>
        </div>
      </Space>
    </Card>
  );
};

DarkModeAwareComponent.displayName = 'DarkModeAwareComponent';

export default DarkModeAwareComponent;
