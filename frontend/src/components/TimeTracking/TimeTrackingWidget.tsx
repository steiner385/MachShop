import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Tag, Popover, Select, message, Tooltip } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  SwapOutlined,
  StopOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Text } = Typography;
const { Option } = Select;

// Styled Components
const WidgetContainer = styled(Card)`
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .ant-card-body {
    padding: 16px;
  }
`;

const TimeDisplay = styled.div`
  font-family: 'Courier New', monospace;
  font-size: 20px;
  font-weight: bold;
  color: #52c41a;
  text-align: center;
  margin: 8px 0;
`;

const StatusIndicator = styled.div<{ status: 'active' | 'inactive' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.status === 'active' ? '#52c41a' : '#d9d9d9'};
    margin-right: 8px;
    animation: ${props => props.status === 'active' ? 'pulse 1.5s infinite' : 'none'};
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;

const ActionButton = styled(Button)`
  width: 100%;
  height: 40px;
  font-weight: 600;
  border-radius: 6px;
  margin-bottom: 8px;

  &.start-button {
    background: #52c41a;
    border-color: #52c41a;
    color: white;

    &:hover {
      background: #73d13d;
      border-color: #73d13d;
    }
  }

  &.stop-button {
    background: #ff4d4f;
    border-color: #ff4d4f;
    color: white;

    &:hover {
      background: #ff7875;
      border-color: #ff7875;
    }
  }
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;

  &:first-child {
    border-top: none;
  }

  .label {
    color: #666;
  }

  .value {
    font-weight: 600;
    color: #333;
  }
`;

const MultiEntryContainer = styled.div`
  .entry-item {
    display: flex;
    justify-content: between;
    align-items: center;
    padding: 8px;
    margin: 4px 0;
    background: #f8f9fa;
    border-radius: 4px;
    border-left: 4px solid #52c41a;

    &.indirect {
      border-left-color: #faad14;
    }

    .entry-info {
      flex: 1;
      font-size: 12px;
    }

    .entry-time {
      font-family: 'Courier New', monospace;
      font-weight: bold;
      font-size: 11px;
      color: #52c41a;
    }

    .stop-button {
      margin-left: 8px;
    }
  }
`;

// Interfaces
interface LaborTimeEntry {
  id: string;
  userId: string;
  workOrderId?: string;
  operationId?: string;
  indirectCodeId?: string;
  timeType: 'DIRECT_LABOR' | 'INDIRECT';
  clockInTime: Date;
  workOrderNumber?: string;
  operationDescription?: string;
  indirectCode?: {
    code: string;
    description: string;
    category: string;
    displayColor?: string;
  };
}

interface IndirectCostCode {
  id: string;
  code: string;
  description: string;
  category: string;
  displayColor?: string;
  isActive: boolean;
}

interface TimeTrackingSummary {
  todayHours: number;
  weekHours: number;
  currentWorkOrderHours: number;
}

interface TimeTrackingWidgetProps {
  workOrderId?: string;
  operationId?: string;
  userId?: string;
  onTimeStarted?: (entry: LaborTimeEntry) => void;
  onTimeStopped?: (entryId: string) => void;
  compact?: boolean;
  showSummary?: boolean;
}

// Custom Hooks
const useRunningTimer = (clockInTime: Date | null) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!clockInTime) {
      setElapsedTime(0);
      return;
    }

    const timer = setInterval(() => {
      const elapsed = Date.now() - clockInTime.getTime();
      setElapsedTime(Math.floor(elapsed / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [clockInTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return formatTime(elapsedTime);
};

// Sub-components
const IndirectTimeSelector: React.FC<{
  onSelect: (codeId: string) => void;
  loading: boolean;
}> = ({ onSelect, loading }) => {
  const [indirectCodes, setIndirectCodes] = useState<IndirectCostCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');

  useEffect(() => {
    fetchIndirectCodes();
  }, []);

  const fetchIndirectCodes = async () => {
    try {
      const response = await fetch('/api/v1/time-tracking/indirect-cost-codes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const codes = await response.json();
        setIndirectCodes(codes.filter((code: IndirectCostCode) => code.isActive));
      }
    } catch (error) {
      console.error('Failed to fetch indirect codes:', error);
    }
  };

  const handleSelect = () => {
    if (selectedCode) {
      onSelect(selectedCode);
      setSelectedCode('');
    }
  };

  const groupedCodes = indirectCodes.reduce((acc, code) => {
    if (!acc[code.category]) {
      acc[code.category] = [];
    }
    acc[code.category].push(code);
    return acc;
  }, {} as Record<string, IndirectCostCode[]>);

  return (
    <div style={{ width: 250 }}>
      <Text strong style={{ fontSize: '12px', marginBottom: 8, display: 'block' }}>
        Select Indirect Time Code:
      </Text>
      <Select
        value={selectedCode}
        onChange={setSelectedCode}
        placeholder="Choose time code..."
        style={{ width: '100%', marginBottom: 12 }}
        size="small"
      >
        {Object.entries(groupedCodes).map(([category, codes]) => (
          <Select.OptGroup key={category} label={category.replace('_', ' ')}>
            {codes.map(code => (
              <Option key={code.id} value={code.id}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {code.displayColor && (
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: code.displayColor,
                        borderRadius: 2,
                        marginRight: 8,
                      }}
                    />
                  )}
                  <span>{code.description}</span>
                </div>
              </Option>
            ))}
          </Select.OptGroup>
        ))}
      </Select>
      <Button
        type="primary"
        size="small"
        block
        disabled={!selectedCode || loading}
        onClick={handleSelect}
      >
        Start Indirect Time
      </Button>
    </div>
  );
};

const MultiEntryDisplay: React.FC<{
  entries: LaborTimeEntry[];
  onStopEntry: (entryId: string) => void;
  loading: boolean;
}> = ({ entries, onStopEntry, loading }) => {
  return (
    <MultiEntryContainer>
      {entries.map(entry => {
        const runningTime = useRunningTimer(entry.clockInTime);

        return (
          <div
            key={entry.id}
            className={`entry-item ${entry.timeType === 'INDIRECT' ? 'indirect' : ''}`}
          >
            <div className="entry-info">
              <div style={{ fontWeight: 600 }}>
                {entry.timeType === 'DIRECT_LABOR' ? (
                  <>WO: {entry.workOrderNumber}</>
                ) : (
                  <>{entry.indirectCode?.description}</>
                )}
              </div>
              {entry.operationDescription && (
                <div style={{ color: '#666' }}>{entry.operationDescription}</div>
              )}
            </div>
            <div className="entry-time">{runningTime}</div>
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              className="stop-button"
              onClick={() => onStopEntry(entry.id)}
              loading={loading}
            />
          </div>
        );
      })}
    </MultiEntryContainer>
  );
};

// Main Component
const TimeTrackingWidget: React.FC<TimeTrackingWidgetProps> = ({
  workOrderId,
  operationId,
  userId,
  onTimeStarted,
  onTimeStopped,
  compact = false,
  showSummary = true,
}) => {
  const [activeEntries, setActiveEntries] = useState<LaborTimeEntry[]>([]);
  const [summary, setSummary] = useState<TimeTrackingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>(userId || '');

  useEffect(() => {
    if (!currentUserId) {
      // Get current user from auth context or localStorage
      const token = localStorage.getItem('token');
      if (token) {
        // Decode token to get user ID (simplified)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentUserId(payload.userId || payload.sub);
        } catch (error) {
          console.error('Failed to decode token:', error);
        }
      }
    }
  }, [userId]);

  useEffect(() => {
    if (currentUserId) {
      loadActiveEntries();
      if (showSummary) {
        loadSummary();
      }

      // Refresh every 30 seconds
      const interval = setInterval(() => {
        loadActiveEntries();
        if (showSummary) {
          loadSummary();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [currentUserId, showSummary]);

  const loadActiveEntries = async () => {
    if (!currentUserId) return;

    try {
      const response = await fetch(`/api/v1/time-tracking/active-entries/${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const entries = await response.json();
        setActiveEntries(entries.map((entry: any) => ({
          ...entry,
          clockInTime: new Date(entry.clockInTime),
        })));
      }
    } catch (error) {
      console.error('Failed to load active entries:', error);
    }
  };

  const loadSummary = async () => {
    if (!currentUserId) return;

    try {
      const response = await fetch(`/api/v1/time-tracking/summary/${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const summaryData = await response.json();
        setSummary(summaryData);
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const handleStartDirectTime = async () => {
    if (!currentUserId) {
      message.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const clockInRequest = {
        userId: currentUserId,
        timeType: 'DIRECT_LABOR',
        entrySource: 'MOBILE',
        ...(workOrderId && { workOrderId }),
        ...(operationId && { operationId }),
      };

      const response = await fetch('/api/v1/time-tracking/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(clockInRequest),
      });

      if (response.ok) {
        const newEntry = await response.json();
        message.success('Time tracking started');
        await loadActiveEntries();
        onTimeStarted?.(newEntry);
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to start time tracking');
      }
    } catch (error) {
      console.error('Clock in error:', error);
      message.error('Failed to start time tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleStartIndirectTime = async (indirectCodeId: string) => {
    if (!currentUserId) {
      message.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const clockInRequest = {
        userId: currentUserId,
        timeType: 'INDIRECT',
        entrySource: 'MOBILE',
        indirectCodeId,
      };

      const response = await fetch('/api/v1/time-tracking/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(clockInRequest),
      });

      if (response.ok) {
        const newEntry = await response.json();
        message.success('Indirect time started');
        await loadActiveEntries();
        onTimeStarted?.(newEntry);
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to start indirect time');
      }
    } catch (error) {
      console.error('Indirect clock in error:', error);
      message.error('Failed to start indirect time');
    } finally {
      setLoading(false);
    }
  };

  const handleStopTime = async (entryId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/time-tracking/clock-out/${entryId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          entrySource: 'MOBILE',
        }),
      });

      if (response.ok) {
        message.success('Time tracking stopped');
        await loadActiveEntries();
        if (showSummary) {
          await loadSummary();
        }
        onTimeStopped?.(entryId);
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to stop time tracking');
      }
    } catch (error) {
      console.error('Clock out error:', error);
      message.error('Failed to stop time tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleStopAllEntries = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/time-tracking/stop-all/${currentUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          reason: 'Stopped from widget',
          entrySource: 'MOBILE',
        }),
      });

      if (response.ok) {
        message.success('All time entries stopped');
        await loadActiveEntries();
        if (showSummary) {
          await loadSummary();
        }
      } else {
        message.error('Failed to stop all entries');
      }
    } catch (error) {
      console.error('Stop all error:', error);
      message.error('Failed to stop all entries');
    } finally {
      setLoading(false);
    }
  };

  // Find current work order entry
  const currentWorkOrderEntry = workOrderId
    ? activeEntries.find(entry => entry.workOrderId === workOrderId && entry.timeType === 'DIRECT_LABOR')
    : null;

  const currentRunningTime = currentWorkOrderEntry
    ? useRunningTimer(currentWorkOrderEntry.clockInTime)
    : null;

  const hasActiveEntries = activeEntries.length > 0;
  const hasMultipleEntries = activeEntries.length > 1;

  if (compact) {
    return (
      <WidgetContainer size="small">
        <StatusIndicator status={hasActiveEntries ? 'active' : 'inactive'}>
          <div className="status-dot" />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {hasActiveEntries ? 'Time Tracking Active' : 'No Active Time'}
          </Text>
        </StatusIndicator>

        {currentWorkOrderEntry ? (
          <>
            <TimeDisplay>{currentRunningTime}</TimeDisplay>
            <ActionButton
              className="stop-button"
              icon={<PauseCircleOutlined />}
              onClick={() => handleStopTime(currentWorkOrderEntry.id)}
              loading={loading}
            >
              Stop Time
            </ActionButton>
          </>
        ) : (
          <ActionButton
            className="start-button"
            icon={<PlayCircleOutlined />}
            onClick={handleStartDirectTime}
            loading={loading}
            disabled={!workOrderId}
          >
            Start Time
          </ActionButton>
        )}

        {hasMultipleEntries && (
          <Text type="secondary" style={{ fontSize: '11px', textAlign: 'center', display: 'block' }}>
            +{activeEntries.length - 1} other active
          </Text>
        )}
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer
      title={
        <Space>
          <ClockCircleOutlined />
          Time Tracking
          {hasActiveEntries && (
            <Tag color="green" style={{ fontSize: '10px' }}>
              {activeEntries.length} Active
            </Tag>
          )}
        </Space>
      }
      extra={
        hasActiveEntries && (
          <Popover
            content={
              <Space direction="vertical">
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => {}}
                >
                  Switch Tasks
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  onClick={handleStopAllEntries}
                  loading={loading}
                >
                  Stop All
                </Button>
              </Space>
            }
            trigger="click"
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Popover>
        )
      }
    >
      {hasActiveEntries ? (
        hasMultipleEntries ? (
          <MultiEntryDisplay
            entries={activeEntries}
            onStopEntry={handleStopTime}
            loading={loading}
          />
        ) : (
          <>
            <StatusIndicator status="active">
              <div className="status-dot" />
              <Text strong>
                {activeEntries[0].timeType === 'DIRECT_LABOR' ? 'Direct Labor' : 'Indirect Time'}
              </Text>
            </StatusIndicator>

            <TimeDisplay>{useRunningTimer(activeEntries[0].clockInTime)}</TimeDisplay>

            {activeEntries[0].workOrderNumber && (
              <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
                Work Order: {activeEntries[0].workOrderNumber}
              </Text>
            )}

            {activeEntries[0].indirectCode && (
              <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
                {activeEntries[0].indirectCode.description}
              </Text>
            )}

            <ActionButton
              className="stop-button"
              icon={<PauseCircleOutlined />}
              onClick={() => handleStopTime(activeEntries[0].id)}
              loading={loading}
            >
              Stop Time
            </ActionButton>
          </>
        )
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <ActionButton
            className="start-button"
            icon={<PlayCircleOutlined />}
            onClick={handleStartDirectTime}
            loading={loading}
            disabled={!workOrderId}
          >
            {workOrderId ? 'Start Work Order Time' : 'No Work Order Selected'}
          </ActionButton>

          <Popover
            content={<IndirectTimeSelector onSelect={handleStartIndirectTime} loading={loading} />}
            trigger="click"
            placement="bottomLeft"
          >
            <Button
              block
              icon={<ClockCircleOutlined />}
              loading={loading}
            >
              Start Indirect Time
            </Button>
          </Popover>
        </Space>
      )}

      {showSummary && summary && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
          <SummaryRow>
            <span className="label">Today:</span>
            <span className="value">{summary.todayHours.toFixed(1)}h</span>
          </SummaryRow>
          <SummaryRow>
            <span className="label">This Week:</span>
            <span className="value">{summary.weekHours.toFixed(1)}h</span>
          </SummaryRow>
          {workOrderId && summary.currentWorkOrderHours > 0 && (
            <SummaryRow>
              <span className="label">This WO:</span>
              <span className="value">{summary.currentWorkOrderHours.toFixed(1)}h</span>
            </SummaryRow>
          )}
        </div>
      )}
    </WidgetContainer>
  );
};

export default TimeTrackingWidget;