import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Typography, Row, Col, Avatar, Alert, Spin, Grid, message } from 'antd';
import { UserOutlined, ClockCircleOutlined, StopOutlined, LogoutOutlined, ScanOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// Styled Components for Kiosk Interface
const KioskContainer = styled.div`
  height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #1f4037 0%, #99f2c8 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
`;

const KioskHeader = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const CompanyLogo = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #1890ff;
`;

const CurrentDateTime = styled.div`
  text-align: right;

  .date {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .time {
    font-size: 32px;
    font-weight: 700;
    color: #1890ff;
    font-family: 'Courier New', monospace;
  }
`;

const MainContent = styled.div`
  max-width: 800px;
  width: 100%;
  margin-top: 100px;
  margin-bottom: 100px;
`;

const BadgeScanPrompt = styled(Card)`
  text-align: center;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

  .scan-icon {
    font-size: 120px;
    color: #1890ff;
    margin-bottom: 20px;
  }

  .ant-typography h2 {
    margin-bottom: 30px;
  }
`;

const PersonnelView = styled(Card)`
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
`;

const PersonnelHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;

  .avatar {
    margin-right: 20px;
  }

  .info {
    flex: 1;

    .name {
      font-size: 28px;
      font-weight: bold;
      color: #333;
      margin: 0;
    }

    .details {
      font-size: 16px;
      color: #666;
      margin: 5px 0;
    }
  }
`;

const ClockInOptions = styled.div`
  margin: 30px 0;
`;

const WorkOrderButton = styled(Button)`
  width: 100%;
  height: 80px;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  border-radius: 12px;
`;

const IndirectTimeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 15px;
  margin-top: 20px;
`;

const IndirectCodeButton = styled(Button)<{ bgColor?: string }>`
  height: 100px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  background-color: ${props => props.bgColor || '#f0f0f0'};
  border-color: ${props => props.bgColor || '#d9d9d9'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .icon {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .label {
    font-size: 14px;
    text-align: center;
  }
`;

const ActiveEntries = styled.div`
  margin: 20px 0;
`;

const ActiveEntryCard = styled(Card)`
  margin-bottom: 15px;
  border-radius: 12px;
  border-left: 6px solid #52c41a;

  &.indirect {
    border-left-color: #faad14;
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .entry-type {
    font-weight: bold;
    font-size: 16px;
  }

  .running-timer {
    font-family: 'Courier New', monospace;
    font-size: 20px;
    font-weight: bold;
    color: #52c41a;
  }

  .work-order-info {
    color: #666;
    margin-bottom: 10px;
  }
`;

const KioskFooter = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
`;

const PINEntryPanel = styled.div`
  max-width: 400px;
  margin: 0 auto;

  .pin-input {
    font-size: 24px;
    text-align: center;
    letter-spacing: 10px;
    margin-bottom: 20px;
    height: 60px;
  }

  .keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }

  .key-button {
    height: 60px;
    font-size: 24px;
    font-weight: bold;
  }
`;

// Interfaces
interface Personnel {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  badgeNumber?: string;
  department?: string;
  shift?: string;
  photoUrl?: string;
}

interface LaborTimeEntry {
  id: string;
  userId: string;
  workOrderId?: string;
  operationId?: string;
  indirectCodeId?: string;
  timeType: 'DIRECT_LABOR' | 'INDIRECT';
  clockInTime: Date;
  elapsedMinutes: number;
  workOrderNumber?: string;
  operationDescription?: string;
  indirectCode?: {
    code: string;
    description: string;
    category: string;
    displayColor?: string;
    displayIcon?: string;
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

// Custom Hooks
const useBadgeScanner = (onBadgeScan: (badgeNumber: string) => void) => {
  useEffect(() => {
    let scanBuffer = '';
    let scanTimeout: NodeJS.Timeout;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Badge scanners typically send data quickly followed by Enter
      if (event.key === 'Enter') {
        if (scanBuffer.length > 3) { // Minimum badge length
          onBadgeScan(scanBuffer.trim());
          scanBuffer = '';
        }
      } else if (event.key.length === 1) {
        scanBuffer += event.key;

        // Clear buffer if typing is too slow (manual input)
        clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => {
          scanBuffer = '';
        }, 500);
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      clearTimeout(scanTimeout);
    };
  }, [onBadgeScan]);
};

const useRunningTimer = (clockInTime: Date) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
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
const PINEntry: React.FC<{ onSubmit: (pin: string) => void }> = ({ onSubmit }) => {
  const [pin, setPin] = useState('');

  const handleKeyClick = (key: string) => {
    if (key === 'CLEAR') {
      setPin('');
    } else if (key === 'ENTER') {
      if (pin.length >= 4) {
        onSubmit(pin);
      }
    } else if (pin.length < 8) {
      setPin(prev => prev + key);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'ENTER'];

  return (
    <PINEntryPanel>
      <Input.Password
        value={pin}
        placeholder="Enter PIN"
        className="pin-input"
        maxLength={8}
        onChange={(e) => setPin(e.target.value)}
        onPressEnter={() => handleKeyClick('ENTER')}
      />
      <div className="keypad">
        {keys.map(key => (
          <Button
            key={key}
            className="key-button"
            type={key === 'ENTER' ? 'primary' : 'default'}
            onClick={() => handleKeyClick(key)}
            disabled={key === 'ENTER' && pin.length < 4}
          >
            {key}
          </Button>
        ))}
      </div>
    </PINEntryPanel>
  );
};

const PersonnelTimeClock: React.FC<{
  personnel: Personnel;
  activeEntries: LaborTimeEntry[];
  onLogout: () => void;
  onClockIn: (type: 'work-order' | 'indirect', targetId?: string) => void;
  onClockOut: (entryId: string) => void;
}> = ({ personnel, activeEntries, onLogout, onClockIn, onClockOut }) => {
  const [indirectCodes, setIndirectCodes] = useState<IndirectCostCode[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleClockOut = async (entryId: string) => {
    setLoading(true);
    try {
      await onClockOut(entryId);
      message.success('Clocked out successfully');
    } catch (error) {
      message.error('Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async (type: 'work-order' | 'indirect', targetId?: string) => {
    setLoading(true);
    try {
      await onClockIn(type, targetId);
      message.success('Clocked in successfully');
    } catch (error) {
      message.error('Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PersonnelView>
      <PersonnelHeader>
        <Avatar
          size={80}
          src={personnel.photoUrl}
          icon={<UserOutlined />}
          className="avatar"
        />
        <div className="info">
          <div className="name">{personnel.firstName} {personnel.lastName}</div>
          <div className="details">Employee #: {personnel.employeeNumber}</div>
          <div className="details">Department: {personnel.department || 'Not Assigned'}</div>
          <div className="details">Shift: {personnel.shift || 'Not Assigned'}</div>
        </div>
      </PersonnelHeader>

      <Spin spinning={loading}>
        {activeEntries.length === 0 ? (
          <ClockInOptions>
            <WorkOrderButton
              type="primary"
              icon={<ClockCircleOutlined />}
              onClick={() => handleClockIn('work-order')}
            >
              Clock In to Work Order
            </WorkOrderButton>

            <Title level={4} style={{ marginTop: 30, marginBottom: 15 }}>
              Or select indirect time:
            </Title>

            <IndirectTimeGrid>
              {indirectCodes.map(code => (
                <IndirectCodeButton
                  key={code.id}
                  bgColor={code.displayColor}
                  onClick={() => handleClockIn('indirect', code.id)}
                >
                  <div className="icon">
                    {code.displayIcon ? (
                      <span style={{ fontSize: '24px' }}>{code.displayIcon}</span>
                    ) : (
                      <ClockCircleOutlined />
                    )}
                  </div>
                  <div className="label">{code.description}</div>
                </IndirectCodeButton>
              ))}
            </IndirectTimeGrid>
          </ClockInOptions>
        ) : (
          <ActiveEntries>
            <Title level={4} style={{ marginBottom: 20 }}>
              Active Time Entries:
            </Title>
            {activeEntries.map(entry => (
              <ActiveTimeEntry
                key={entry.id}
                entry={entry}
                onClockOut={() => handleClockOut(entry.id)}
              />
            ))}
          </ActiveEntries>
        )}
      </Spin>
    </PersonnelView>
  );
};

const ActiveTimeEntry: React.FC<{
  entry: LaborTimeEntry;
  onClockOut: () => void;
}> = ({ entry, onClockOut }) => {
  const runningTime = useRunningTimer(entry.clockInTime);

  return (
    <ActiveEntryCard className={entry.timeType === 'INDIRECT' ? 'indirect' : ''}>
      <div className="entry-header">
        <div className="entry-type">
          {entry.timeType === 'DIRECT_LABOR' ? (
            <>
              <ClockCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              Direct Labor
            </>
          ) : (
            <>
              <ClockCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
              {entry.indirectCode?.description || 'Indirect Time'}
            </>
          )}
        </div>
        <div className="running-timer">{runningTime}</div>
      </div>

      {entry.workOrderNumber && (
        <div className="work-order-info">
          <Text strong>Work Order:</Text> {entry.workOrderNumber}
          {entry.operationDescription && (
            <> - {entry.operationDescription}</>
          )}
        </div>
      )}

      <div style={{ marginTop: 15 }}>
        <Button
          type="primary"
          danger
          icon={<StopOutlined />}
          onClick={onClockOut}
          size="large"
        >
          Clock Out
        </Button>
      </div>
    </ActiveEntryCard>
  );
};

// Main Component
const TimeClockKiosk: React.FC = () => {
  const [personnel, setPersonnel] = useState<Personnel | null>(null);
  const [activeEntries, setActiveEntries] = useState<LaborTimeEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const autoLogoutRef = useRef<NodeJS.Timeout>();

  const screens = useBreakpoint();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-logout after 30 seconds of inactivity
  useEffect(() => {
    const resetAutoLogout = () => {
      if (autoLogoutRef.current) {
        clearTimeout(autoLogoutRef.current);
      }
      if (personnel) {
        autoLogoutRef.current = setTimeout(() => {
          handleLogout();
        }, 30000); // 30 seconds
      }
    };

    const handleActivity = () => {
      resetAutoLogout();
    };

    document.addEventListener('mousedown', handleActivity);
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('touchstart', handleActivity);

    resetAutoLogout();

    return () => {
      document.removeEventListener('mousedown', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('touchstart', handleActivity);
      if (autoLogoutRef.current) {
        clearTimeout(autoLogoutRef.current);
      }
    };
  }, [personnel]);

  const handleBadgeScan = async (badgeNumber: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/v1/personnel/by-badge/${badgeNumber}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const person = await response.json();
        setPersonnel(person);
        await loadActiveEntries(person.id);
      } else {
        setError('Badge not found. Please try again or use PIN entry.');
      }
    } catch (error) {
      console.error('Badge scan error:', error);
      setError('System error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePINEntry = async (pin: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/v1/personnel/by-employee-number/${pin}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const person = await response.json();
        setPersonnel(person);
        await loadActiveEntries(person.id);
      } else {
        setError('Employee number not found. Please try again.');
      }
    } catch (error) {
      console.error('PIN entry error:', error);
      setError('System error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveEntries = async (userId: string) => {
    try {
      const response = await fetch(`/api/v1/time-tracking/active-entries/${userId}`, {
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

  const handleClockIn = async (type: 'work-order' | 'indirect', targetId?: string) => {
    if (!personnel) return;

    const clockInRequest = {
      userId: personnel.id,
      timeType: type === 'work-order' ? 'DIRECT_LABOR' : 'INDIRECT',
      entrySource: 'KIOSK',
      deviceId: 'KIOSK_01', // Could be configured per kiosk
      ...(type === 'work-order' ? {} : { indirectCodeId: targetId }),
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
      await loadActiveEntries(personnel.id);
    } else {
      throw new Error('Clock in failed');
    }
  };

  const handleClockOut = async (entryId: string) => {
    const response = await fetch(`/api/v1/time-tracking/clock-out/${entryId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        entrySource: 'KIOSK',
        deviceId: 'KIOSK_01',
      }),
    });

    if (response.ok) {
      if (personnel) {
        await loadActiveEntries(personnel.id);
      }
    } else {
      throw new Error('Clock out failed');
    }
  };

  const handleLogout = () => {
    setPersonnel(null);
    setActiveEntries([]);
    setError('');
    if (autoLogoutRef.current) {
      clearTimeout(autoLogoutRef.current);
    }
  };

  useBadgeScanner(handleBadgeScan);

  return (
    <KioskContainer>
      <KioskHeader>
        <CompanyLogo>MachShop MES</CompanyLogo>
        <CurrentDateTime>
          <div className="date">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div className="time">
            {currentTime.toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </CurrentDateTime>
      </KioskHeader>

      <MainContent>
        <Spin spinning={loading}>
          {!personnel ? (
            <BadgeScanPrompt>
              <ScanOutlined className="scan-icon" />
              <Title level={2}>Scan Badge or Enter PIN</Title>
              {error && (
                <Alert
                  message={error}
                  type="error"
                  showIcon
                  style={{ marginBottom: 20 }}
                />
              )}
              <PINEntry onSubmit={handlePINEntry} />
              <Text type="secondary" style={{ fontSize: '16px', marginTop: 20, display: 'block' }}>
                Scan your badge or enter your employee number using the keypad above
              </Text>
            </BadgeScanPrompt>
          ) : (
            <PersonnelTimeClock
              personnel={personnel}
              activeEntries={activeEntries}
              onLogout={handleLogout}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
            />
          )}
        </Spin>
      </MainContent>

      {personnel && (
        <KioskFooter>
          <Button
            type="default"
            size="large"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ fontSize: '18px', height: '50px', paddingInline: '30px' }}
          >
            Done
          </Button>
        </KioskFooter>
      )}
    </KioskContainer>
  );
};

export default TimeClockKiosk;