import React from 'react';
import { Tag, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  ToolOutlined,
  CoffeeOutlined,
  BookOutlined,
  TeamOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';

// Animations
const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Styled Components
const AnimatedTag = styled(Tag)<{ animate?: boolean }>`
  animation: ${props => props.animate ? pulse : 'none'} 1.5s infinite;

  .anticon-loading {
    animation: ${rotate} 1s linear infinite;
  }
`;

const StatusDot = styled.div<{ color: string; animate?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.color};
  display: inline-block;
  margin-right: 6px;
  animation: ${props => props.animate ? pulse : 'none'} 1.5s infinite;
`;

const CompactIndicator = styled.div<{ color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: ${props => props.color}20;
  border: 1px solid ${props => props.color};
  font-size: 11px;
  font-weight: 500;
  color: ${props => props.color};
`;

// Types
export type TimeType = 'DIRECT_LABOR' | 'INDIRECT';
export type IndirectCategory = 'BREAK' | 'LUNCH' | 'TRAINING' | 'MEETING' | 'MAINTENANCE' | 'SETUP' | 'CLEANUP' | 'WAITING' | 'ADMINISTRATIVE' | 'OTHER';
export type TimeEntryStatus = 'ACTIVE' | 'COMPLETED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

interface TimeTypeIndicatorProps {
  timeType: TimeType;
  indirectCategory?: IndirectCategory;
  status?: TimeEntryStatus;
  isActive?: boolean;
  variant?: 'default' | 'compact' | 'dot' | 'large';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

// Configuration
const TIME_TYPE_CONFIG = {
  DIRECT_LABOR: {
    color: '#52c41a',
    label: 'Direct Labor',
    icon: ClockCircleOutlined,
    description: 'Work performed directly on production orders'
  },
  INDIRECT: {
    color: '#faad14',
    label: 'Indirect Time',
    icon: ClockCircleOutlined,
    description: 'Non-production activities and overhead time'
  }
};

const INDIRECT_CATEGORY_CONFIG = {
  BREAK: {
    color: '#722ed1',
    label: 'Break',
    icon: CoffeeOutlined,
    description: 'Scheduled break time'
  },
  LUNCH: {
    color: '#eb2f96',
    label: 'Lunch',
    icon: CoffeeOutlined,
    description: 'Lunch break time'
  },
  TRAINING: {
    color: '#1890ff',
    label: 'Training',
    icon: BookOutlined,
    description: 'Skills training and development'
  },
  MEETING: {
    color: '#13c2c2',
    label: 'Meeting',
    icon: TeamOutlined,
    description: 'Team meetings and communication'
  },
  MAINTENANCE: {
    color: '#fa8c16',
    label: 'Maintenance',
    icon: ToolOutlined,
    description: 'Equipment maintenance and repair'
  },
  SETUP: {
    color: '#a0d911',
    label: 'Setup',
    icon: SettingOutlined,
    description: 'Job setup and preparation'
  },
  CLEANUP: {
    color: '#f5222d',
    label: 'Cleanup',
    icon: SettingOutlined,
    description: 'Workspace cleanup and organization'
  },
  WAITING: {
    color: '#fadb14',
    label: 'Waiting',
    icon: ClockCircleOutlined,
    description: 'Waiting for materials, instructions, or equipment'
  },
  ADMINISTRATIVE: {
    color: '#722ed1',
    label: 'Administrative',
    icon: BookOutlined,
    description: 'Paperwork and administrative tasks'
  },
  OTHER: {
    color: '#8c8c8c',
    label: 'Other',
    icon: QuestionCircleOutlined,
    description: 'Other indirect activities'
  }
};

const STATUS_CONFIG = {
  ACTIVE: {
    color: '#52c41a',
    label: 'Active',
    animate: true
  },
  COMPLETED: {
    color: '#1890ff',
    label: 'Completed',
    animate: false
  },
  PENDING_APPROVAL: {
    color: '#faad14',
    label: 'Pending Approval',
    animate: false
  },
  APPROVED: {
    color: '#52c41a',
    label: 'Approved',
    animate: false
  },
  REJECTED: {
    color: '#f5222d',
    label: 'Rejected',
    animate: false
  }
};

// Helper Functions
const getTimeTypeConfig = (timeType: TimeType, indirectCategory?: IndirectCategory) => {
  if (timeType === 'INDIRECT' && indirectCategory) {
    return INDIRECT_CATEGORY_CONFIG[indirectCategory];
  }
  return TIME_TYPE_CONFIG[timeType];
};

const getDisplayText = (timeType: TimeType, indirectCategory?: IndirectCategory) => {
  const config = getTimeTypeConfig(timeType, indirectCategory);
  return config.label;
};

const getDisplayColor = (timeType: TimeType, indirectCategory?: IndirectCategory, status?: TimeEntryStatus) => {
  if (status) {
    return STATUS_CONFIG[status].color;
  }
  const config = getTimeTypeConfig(timeType, indirectCategory);
  return config.color;
};

const getDisplayIcon = (timeType: TimeType, indirectCategory?: IndirectCategory, isActive?: boolean) => {
  if (isActive) {
    return LoadingOutlined;
  }
  const config = getTimeTypeConfig(timeType, indirectCategory);
  return config.icon;
};

// Main Component
const TimeTypeIndicator: React.FC<TimeTypeIndicatorProps> = ({
  timeType,
  indirectCategory,
  status,
  isActive = false,
  variant = 'default',
  showIcon = true,
  showText = true,
  className
}) => {
  const config = getTimeTypeConfig(timeType, indirectCategory);
  const color = getDisplayColor(timeType, indirectCategory, status);
  const text = getDisplayText(timeType, indirectCategory);
  const IconComponent = getDisplayIcon(timeType, indirectCategory, isActive);
  const shouldAnimate = isActive || (status === 'ACTIVE');

  const tooltipContent = (
    <div>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{text}</div>
      <div style={{ fontSize: '12px' }}>{config.description}</div>
      {status && (
        <div style={{ fontSize: '11px', color: '#999', marginTop: 4 }}>
          Status: {STATUS_CONFIG[status].label}
        </div>
      )}
    </div>
  );

  if (variant === 'dot') {
    return (
      <Tooltip title={tooltipContent}>
        <span className={className}>
          <StatusDot color={color} animate={shouldAnimate} />
          {showText && (
            <span style={{ fontSize: '12px' }}>{text}</span>
          )}
        </span>
      </Tooltip>
    );
  }

  if (variant === 'compact') {
    return (
      <Tooltip title={tooltipContent}>
        <CompactIndicator color={color} className={className}>
          {showIcon && <IconComponent style={{ marginRight: 4, fontSize: '10px' }} />}
          {showText && text}
        </CompactIndicator>
      </Tooltip>
    );
  }

  if (variant === 'large') {
    return (
      <Tooltip title={tooltipContent}>
        <AnimatedTag
          color={color}
          animate={shouldAnimate}
          className={className}
          style={{
            fontSize: '16px',
            padding: '8px 12px',
            lineHeight: '1.2',
            borderRadius: '8px'
          }}
        >
          {showIcon && (
            <IconComponent style={{ marginRight: 8, fontSize: '18px' }} />
          )}
          {showText && text}
        </AnimatedTag>
      </Tooltip>
    );
  }

  // Default variant
  return (
    <Tooltip title={tooltipContent}>
      <AnimatedTag
        color={color}
        animate={shouldAnimate}
        className={className}
      >
        {showIcon && (
          <IconComponent style={{ marginRight: showText ? 4 : 0 }} />
        )}
        {showText && text}
      </AnimatedTag>
    </Tooltip>
  );
};

// Export additional components and utilities
export const TimeStatusDot: React.FC<{
  timeType: TimeType;
  indirectCategory?: IndirectCategory;
  isActive?: boolean;
  size?: number;
}> = ({ timeType, indirectCategory, isActive, size = 8 }) => {
  const color = getDisplayColor(timeType, indirectCategory);

  return (
    <StatusDot
      color={color}
      animate={isActive}
      style={{ width: size, height: size }}
    />
  );
};

export const getTimeTypeColor = (timeType: TimeType, indirectCategory?: IndirectCategory): string => {
  return getDisplayColor(timeType, indirectCategory);
};

export const getTimeTypeLabel = (timeType: TimeType, indirectCategory?: IndirectCategory): string => {
  return getDisplayText(timeType, indirectCategory);
};

export const TIME_TYPE_COLORS = {
  DIRECT_LABOR: TIME_TYPE_CONFIG.DIRECT_LABOR.color,
  INDIRECT: TIME_TYPE_CONFIG.INDIRECT.color,
  ...Object.fromEntries(
    Object.entries(INDIRECT_CATEGORY_CONFIG).map(([key, config]) => [key, config.color])
  )
};

export default TimeTypeIndicator;