import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Grid, message, Drawer, List, Avatar } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  MoreOutlined,
  ScanOutlined,
  StopOutlined,
  SettingOutlined
} from '@ant-design/icons';
import styled from 'styled-components';
import TimeTypeIndicator from './TimeTypeIndicator';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// Styled Components
const MobileContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 16px;
  color: white;

  @media (max-width: 576px) {
    padding: 16px 12px;
  }
`;

const StatusCard = styled(Card)`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;

  .ant-card-body {
    padding: 20px;
  }
`;

const TimeDisplay = styled.div`
  text-align: center;
  margin: 20px 0;

  .time {
    font-family: 'Courier New', monospace;
    font-size: 48px;
    font-weight: bold;
    color: #52c41a;
    line-height: 1;
    margin-bottom: 8px;

    @media (max-width: 576px) {
      font-size: 36px;
    }
  }

  .status {
    font-size: 16px;
    color: #666;
    font-weight: 500;
  }
`;

const ActionButton = styled(Button)`
  width: 100%;
  height: 64px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 12px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  .anticon {
    font-size: 24px;
    margin-right: 8px;
  }

  &.start-button {
    background: #52c41a;
    border-color: #52c41a;
    color: white;

    &:hover, &:focus {
      background: #73d13d;
      border-color: #73d13d;
      color: white;
    }
  }

  &.stop-button {
    background: #ff4d4f;
    border-color: #ff4d4f;
    color: white;

    &:hover, &:focus {
      background: #ff7875;
      border-color: #ff7875;
      color: white;
    }
  }

  &.secondary-button {
    background: #1890ff;
    border-color: #1890ff;
    color: white;

    &:hover, &:focus {
      background: #40a9ff;
      border-color: #40a9ff;
      color: white;
    }
  }
`;

const QuickActionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 16px 0;

  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const QuickActionButton = styled(Button)<{ bgColor?: string }>`
  height: 80px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  background-color: ${props => props.bgColor || '#f0f0f0'};
  border-color: ${props => props.bgColor || '#d9d9d9'};
  color: ${props => props.bgColor ? 'white' : '#333'};

  &:hover, &:focus {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    background-color: ${props => props.bgColor || '#f0f0f0'};
    border-color: ${props => props.bgColor || '#d9d9d9'};
    color: ${props => props.bgColor ? 'white' : '#333'};
  }

  .icon {
    font-size: 24px;
    margin-bottom: 6px;
  }

  .label {
    font-size: 12px;
    text-align: center;
    line-height: 1.2;
  }
`;

const ActiveEntryCard = styled(Card)`
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  border: none;
  margin-bottom: 12px;
  border-left: 4px solid #52c41a;

  &.indirect {
    border-left-color: #faad14;
  }

  .ant-card-body {
    padding: 16px;
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .entry-time {
    font-family: 'Courier New', monospace;
    font-size: 18px;
    font-weight: bold;
    color: #52c41a;
  }

  .entry-details {
    font-size: 14px;
    color: #666;
    margin-bottom: 12px;
  }
`;

const FloatingHeader = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .user-info {
    display: flex;
    align-items: center;
    color: #333;
  }

  .app-title {
    font-weight: bold;
    color: #1890ff;
  }
`;

const OfflineIndicator = styled.div`
  background: #faad14;
  color: white;
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 12px;
  font-weight: 500;
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
  displayIcon?: string;
  isActive: boolean;
}

interface Personnel {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  department?: string;
  photoUrl?: string;
}

interface MobileTimeTrackerProps {
  userId?: string;
  showHeader?: boolean;
  offlineMode?: boolean;
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

const useOfflineQueue = () => {
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = async () => {
      if (offlineQueue.length > 0) {
        message.info('Processing offline actions...');
        // Process offline queue
        for (const action of offlineQueue) {
          try {
            await fetch(action.url, action.options);
          } catch (error) {
            console.error('Failed to sync offline action:', error);
          }
        }
        setOfflineQueue([]);
        message.success('Offline actions synced');
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [offlineQueue]);

  const addToQueue = (url: string, options: RequestInit) => {
    setOfflineQueue(prev => [...prev, { url, options, timestamp: Date.now() }]);
  };

  return { offlineQueue, addToQueue };
};

// Sub-components
const ActiveTimeDisplay: React.FC<{
  entry: LaborTimeEntry;
  onStop: () => void;
  loading: boolean;
}> = ({ entry, onStop, loading }) => {
  const runningTime = useRunningTimer(entry.clockInTime);

  return (
    <ActiveEntryCard className={entry.timeType === 'INDIRECT' ? 'indirect' : ''}>
      <div className="entry-header">
        <TimeTypeIndicator
          timeType={entry.timeType}
          indirectCategory={entry.indirectCode?.category as any}
          isActive={true}
          variant="compact"
        />
        <div className="entry-time">{runningTime}</div>
      </div>

      <div className="entry-details">
        {entry.timeType === 'DIRECT_LABOR' ? (
          <>
            <div><strong>Work Order:</strong> {entry.workOrderNumber}</div>
            {entry.operationDescription && (
              <div><strong>Operation:</strong> {entry.operationDescription}</div>
            )}
          </>
        ) : (
          <div><strong>Activity:</strong> {entry.indirectCode?.description}</div>
        )}
      </div>

      <ActionButton
        className="stop-button"
        icon={<StopOutlined />}
        onClick={onStop}
        loading={loading}
      >
        Stop Time
      </ActionButton>
    </ActiveEntryCard>
  );
};

const QuickActions: React.FC<{
  indirectCodes: IndirectCostCode[];
  onStartIndirect: (codeId: string) => void;
  loading: boolean;
}> = ({ indirectCodes, onStartIndirect, loading }) => {
  // Show most common indirect codes as quick actions
  const quickCodes = indirectCodes
    .filter(code => ['BREAK', 'LUNCH', 'SETUP', 'MAINTENANCE'].includes(code.category))
    .slice(0, 4);

  return (
    <QuickActionGrid>
      {quickCodes.map(code => (
        <QuickActionButton
          key={code.id}
          bgColor={code.displayColor}
          onClick={() => onStartIndirect(code.id)}
          loading={loading}
        >
          <div className="icon">
            {code.displayIcon ? (
              <span>{code.displayIcon}</span>
            ) : (
              <ClockCircleOutlined />
            )}
          </div>
          <div className="label">{code.description}</div>
        </QuickActionButton>
      ))}
    </QuickActionGrid>
  );
};

// Main Component
const MobileTimeTracker: React.FC<MobileTimeTrackerProps> = ({
  userId,
  showHeader = true,
  offlineMode = false
}) => {
  const [activeEntries, setActiveEntries] = useState<LaborTimeEntry[]>([]);
  const [indirectCodes, setIndirectCodes] = useState<IndirectCostCode[]>([]);
  const [personnel, setPersonnel] = useState<Personnel | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>(userId || '');

  const screens = useBreakpoint();
  const { offlineQueue, addToQueue } = useOfflineQueue();
  const isOnline = navigator.onLine;

  useEffect(() => {
    if (!currentUserId) {
      // Get current user from auth context
      const token = localStorage.getItem('token');
      if (token) {
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
      loadData();

      // Refresh every 30 seconds when online
      if (isOnline) {
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [currentUserId, isOnline]);

  const loadData = async () => {
    if (!currentUserId || !isOnline) return;

    try {
      await Promise.all([
        loadActiveEntries(),
        loadIndirectCodes(),
        loadPersonnel()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

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

  const loadIndirectCodes = async () => {
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

  const loadPersonnel = async () => {
    if (!currentUserId) return;

    try {
      const response = await fetch(`/api/v1/personnel/${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const person = await response.json();
        setPersonnel(person);
      }
    } catch (error) {
      console.error('Failed to load personnel:', error);
    }
  };

  const handleStartDirectTime = async () => {
    if (!currentUserId) {
      message.error('User not authenticated');
      return;
    }

    const clockInRequest = {
      userId: currentUserId,
      timeType: 'DIRECT_LABOR',
      entrySource: 'MOBILE',
      deviceId: 'MOBILE_APP',
    };

    if (!isOnline) {
      addToQueue('/api/v1/time-tracking/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(clockInRequest),
      });
      message.info('Action queued for when online');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/time-tracking/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(clockInRequest),
      });

      if (response.ok) {
        message.success('Direct time started');
        await loadActiveEntries();
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

    const clockInRequest = {
      userId: currentUserId,
      timeType: 'INDIRECT',
      entrySource: 'MOBILE',
      deviceId: 'MOBILE_APP',
      indirectCodeId,
    };

    if (!isOnline) {
      addToQueue('/api/v1/time-tracking/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(clockInRequest),
      });
      message.info('Action queued for when online');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/time-tracking/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(clockInRequest),
      });

      if (response.ok) {
        message.success('Indirect time started');
        await loadActiveEntries();
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
    if (!isOnline) {
      addToQueue(`/api/v1/time-tracking/clock-out/${entryId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          entrySource: 'MOBILE',
          deviceId: 'MOBILE_APP',
        }),
      });
      message.info('Action queued for when online');
      return;
    }

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
          deviceId: 'MOBILE_APP',
        }),
      });

      if (response.ok) {
        message.success('Time stopped');
        await loadActiveEntries();
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to stop time');
      }
    } catch (error) {
      console.error('Clock out error:', error);
      message.error('Failed to stop time');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveEntries = activeEntries.length > 0;
  const primaryEntry = activeEntries[0];

  return (
    <MobileContainer>
      {showHeader && (
        <FloatingHeader>
          <div className="user-info">
            <Avatar
              size="small"
              src={personnel?.photoUrl}
              icon={<UserOutlined />}
              style={{ marginRight: 8 }}
            />
            <span>{personnel ? `${personnel.firstName} ${personnel.lastName}` : 'Loading...'}</span>
          </div>
          <div className="app-title">Time Tracker</div>
          <Button
            type="text"
            icon={<MoreOutlined />}
            onClick={() => setDrawerVisible(true)}
          />
        </FloatingHeader>
      )}

      <div style={{ marginTop: showHeader ? 70 : 0 }}>
        {(!isOnline || offlineMode) && (
          <OfflineIndicator>
            📱 Offline Mode {offlineQueue.length > 0 && `(${offlineQueue.length} queued)`}
          </OfflineIndicator>
        )}

        {hasActiveEntries ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <StatusCard>
              <Title level={4} style={{ margin: 0, marginBottom: 16, textAlign: 'center' }}>
                Active Time Tracking
              </Title>

              {activeEntries.map(entry => (
                <ActiveTimeDisplay
                  key={entry.id}
                  entry={entry}
                  onStop={() => handleStopTime(entry.id)}
                  loading={loading}
                />
              ))}
            </StatusCard>

            <StatusCard>
              <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
                Quick Actions
              </Title>
              <QuickActions
                indirectCodes={indirectCodes}
                onStartIndirect={handleStartIndirectTime}
                loading={loading}
              />
            </StatusCard>
          </Space>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }}>
            <StatusCard>
              <TimeDisplay>
                <div className="time">00:00:00</div>
                <div className="status">No active time tracking</div>
              </TimeDisplay>

              <ActionButton
                className="start-button"
                icon={<PlayCircleOutlined />}
                onClick={handleStartDirectTime}
                loading={loading}
              >
                Start Direct Labor
              </ActionButton>

              <ActionButton
                className="secondary-button"
                icon={<ScanOutlined />}
                onClick={() => setDrawerVisible(true)}
              >
                Start Indirect Time
              </ActionButton>
            </StatusCard>

            <StatusCard>
              <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
                Quick Start
              </Title>
              <QuickActions
                indirectCodes={indirectCodes}
                onStartIndirect={handleStartIndirectTime}
                loading={loading}
              />
            </StatusCard>
          </Space>
        )}
      </div>

      <Drawer
        title="Time Tracking Options"
        placement="bottom"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        height="60%"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={5}>All Indirect Time Codes</Title>
          <List
            dataSource={indirectCodes}
            renderItem={code => (
              <List.Item
                onClick={() => {
                  handleStartIndirectTime(code.id);
                  setDrawerVisible(false);
                }}
                style={{ cursor: 'pointer' }}
              >
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: code.displayColor || '#f0f0f0',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '16px'
                      }}
                    >
                      {code.displayIcon || '⏰'}
                    </div>
                  }
                  title={code.description}
                  description={`Category: ${code.category.replace('_', ' ')}`}
                />
              </List.Item>
            )}
          />
        </Space>
      </Drawer>
    </MobileContainer>
  );
};

export default MobileTimeTracker;