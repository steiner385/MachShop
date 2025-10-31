import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimeTrackingWidget from '../../components/TimeTracking/TimeTrackingWidget';

// Mock fetch
global.fetch = vi.fn();

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

// Test data
const mockActiveEntries = [
  {
    id: 'entry-1',
    userId: 'user-1',
    workOrderId: 'wo-1',
    operationId: 'op-1',
    timeType: 'DIRECT_LABOR' as const,
    clockInTime: new Date('2023-01-01T10:00:00Z'),
    workOrderNumber: 'WO001',
    operationDescription: 'Assembly Operation',
  },
  {
    id: 'entry-2',
    userId: 'user-1',
    indirectCodeId: 'code-1',
    timeType: 'INDIRECT' as const,
    clockInTime: new Date('2023-01-01T11:00:00Z'),
    indirectCode: {
      code: 'BREAK',
      description: 'Break Time',
      category: 'BREAK',
      displayColor: '#722ed1',
    },
  },
];

const mockIndirectCodes = [
  {
    id: 'code-1',
    code: 'BREAK',
    description: 'Break Time',
    category: 'BREAK',
    displayColor: '#722ed1',
    isActive: true,
  },
  {
    id: 'code-2',
    code: 'LUNCH',
    description: 'Lunch Break',
    category: 'LUNCH',
    displayColor: '#eb2f96',
    isActive: true,
  },
  {
    id: 'code-3',
    code: 'SETUP',
    description: 'Job Setup',
    category: 'SETUP',
    displayColor: '#a0d911',
    isActive: true,
  },
];

const mockSummary = {
  todayHours: 6.5,
  weekHours: 32.5,
  currentWorkOrderHours: 2.5,
};

describe('TimeTrackingWidget Component', () => {
  const user = userEvent.setup();

  const defaultProps = {
    workOrderId: 'wo-1',
    operationId: 'op-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });

    // Mock successful API responses
    (global.fetch as Mock).mockImplementation((url: string) => {
      if (url.includes('/active-entries/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/indirect-cost-codes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockIndirectCodes),
        });
      }
      if (url.includes('/summary/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSummary),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders time tracking widget', async () => {
    render(<TimeTrackingWidget {...defaultProps} />);

    expect(screen.getByText('Time Tracking')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Start Work Order Time')).toBeInTheDocument();
      expect(screen.getByText('Start Indirect Time')).toBeInTheDocument();
    });
  });

  it('loads active entries on mount', async () => {
    render(<TimeTrackingWidget {...defaultProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/time-tracking/active-entries/user-1',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer mock-token',
          },
        })
      );
    });
  });

  it('loads summary data when showSummary is true', async () => {
    render(<TimeTrackingWidget {...defaultProps} showSummary={true} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/time-tracking/summary/user-1',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer mock-token',
          },
        })
      );
    });
  });

  it('displays summary when available', async () => {
    (global.fetch as Mock).mockImplementation((url: string) => {
      if (url.includes('/summary/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSummary),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<TimeTrackingWidget {...defaultProps} showSummary={true} />);

    await waitFor(() => {
      expect(screen.getByText('6.5h')).toBeInTheDocument();
      expect(screen.getByText('32.5h')).toBeInTheDocument();
      expect(screen.getByText('2.5h')).toBeInTheDocument();
    });
  });

  it('starts direct time when button is clicked', async () => {
    (global.fetch as Mock).mockImplementation((url: string, options: any) => {
      if (options?.method === 'POST' && url.includes('/clock-in')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'new-entry-1' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<TimeTrackingWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Start Work Order Time')).toBeInTheDocument();
    });

    const startButton = screen.getByText('Start Work Order Time');
    await user.click(startButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/time-tracking/clock-in',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify({
            userId: 'user-1',
            timeType: 'DIRECT_LABOR',
            entrySource: 'MOBILE',
            workOrderId: 'wo-1',
            operationId: 'op-1',
          }),
        })
      );
    });
  });

  it('displays active entry with running timer', async () => {
    (global.fetch as Mock).mockImplementation((url: string) => {
      if (url.includes('/active-entries/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockActiveEntries[0]]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<TimeTrackingWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Direct Labor')).toBeInTheDocument();
      expect(screen.getByText('Work Order: WO001')).toBeInTheDocument();
      expect(screen.getByText('Stop Time')).toBeInTheDocument();
    });

    // Timer should be running and display time
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('displays multiple active entries', async () => {
    (global.fetch as Mock).mockImplementation((url: string) => {
      if (url.includes('/active-entries/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockActiveEntries),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<TimeTrackingWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('2 Active')).toBeInTheDocument();
      expect(screen.getByText('WO: WO001')).toBeInTheDocument();
      expect(screen.getByText('Break Time')).toBeInTheDocument();
    });
  });

  it('stops time entry when stop button is clicked', async () => {
    (global.fetch as Mock).mockImplementation((url: string, options: any) => {
      if (url.includes('/active-entries/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockActiveEntries[0]]),
        });
      }
      if (options?.method === 'POST' && url.includes('/clock-out/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<TimeTrackingWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Stop Time')).toBeInTheDocument();
    });

    const stopButton = screen.getByText('Stop Time');
    await user.click(stopButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/time-tracking/clock-out/entry-1',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify({
            entrySource: 'MOBILE',
          }),
        })
      );
    });
  });

  it('opens indirect time selector popover', async () => {
    render(<TimeTrackingWidget {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Start Indirect Time')).toBeInTheDocument();
    });

    const indirectButton = screen.getByText('Start Indirect Time');
    await user.click(indirectButton);

    await waitFor(() => {
      expect(screen.getByText('Select Indirect Time Code:')).toBeInTheDocument();
      expect(screen.getByText('Break Time')).toBeInTheDocument();
      expect(screen.getByText('Lunch Break')).toBeInTheDocument();
      expect(screen.getByText('Job Setup')).toBeInTheDocument();
    });
  });

  it('starts indirect time from popover selector', async () => {
    (global.fetch as Mock).mockImplementation((url: string, options: any) => {
      if (options?.method === 'POST' && url.includes('/clock-in')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'new-indirect-entry' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<TimeTrackingWidget {...defaultProps} />);

    // Open popover
    const indirectButton = screen.getByText('Start Indirect Time');
    await user.click(indirectButton);

    await waitFor(() => {
      expect(screen.getByText('Select Indirect Time Code:')).toBeInTheDocument();
    });

    // Select break time
    const dropdown = screen.getByPlaceholderText('Choose time code...');
    await user.click(dropdown);

    await waitFor(() => {
      const breakOption = screen.getByText('Break Time');
      await user.click(breakOption);
    });

    // Click start button
    const startIndirectButton = screen.getByText('Start Indirect Time');
    await user.click(startIndirectButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/time-tracking/clock-in',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-1',
            timeType: 'INDIRECT',
            entrySource: 'MOBILE',
            indirectCodeId: 'code-1',
          }),
        })
      );
    });
  });

  it('renders in compact mode', () => {
    render(<TimeTrackingWidget {...defaultProps} compact={true} />);

    expect(screen.getByText('No Active Time')).toBeInTheDocument();
    expect(screen.getByText('Start Time')).toBeInTheDocument();

    // Should not show title in compact mode
    expect(screen.queryByText('Time Tracking')).not.toBeInTheDocument();
  });

  it('disables start button when no work order provided', () => {
    render(<TimeTrackingWidget userId="user-1" />);

    const startButton = screen.getByText('No Work Order Selected');
    expect(startButton).toBeDisabled();
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as Mock).mockImplementation((url: string, options: any) => {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Clock in failed' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<TimeTrackingWidget {...defaultProps} />);

    const startButton = screen.getByText('Start Work Order Time');
    await user.click(startButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('refreshes data every 30 seconds', async () => {
    vi.useFakeTimers();

    render(<TimeTrackingWidget {...defaultProps} />);

    // Clear initial calls
    vi.clearAllMocks();

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/time-tracking/active-entries/user-1',
        expect.any(Object)
      );
    });

    vi.useRealTimers();
  });

  it('calls onTimeStarted callback when time is started', async () => {
    const onTimeStarted = vi.fn();

    (global.fetch as Mock).mockImplementation((url: string, options: any) => {
      if (options?.method === 'POST' && url.includes('/clock-in')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'new-entry-1' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<TimeTrackingWidget {...defaultProps} onTimeStarted={onTimeStarted} />);

    const startButton = screen.getByText('Start Work Order Time');
    await user.click(startButton);

    await waitFor(() => {
      expect(onTimeStarted).toHaveBeenCalledWith({ id: 'new-entry-1' });
    });
  });

  it('calls onTimeStopped callback when time is stopped', async () => {
    const onTimeStopped = vi.fn();

    (global.fetch as Mock).mockImplementation((url: string, options: any) => {
      if (url.includes('/active-entries/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockActiveEntries[0]]),
        });
      }
      if (options?.method === 'POST' && url.includes('/clock-out/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<TimeTrackingWidget {...defaultProps} onTimeStopped={onTimeStopped} />);

    await waitFor(() => {
      expect(screen.getByText('Stop Time')).toBeInTheDocument();
    });

    const stopButton = screen.getByText('Stop Time');
    await user.click(stopButton);

    await waitFor(() => {
      expect(onTimeStopped).toHaveBeenCalledWith('entry-1');
    });
  });

  it('does not show summary when showSummary is false', async () => {
    render(<TimeTrackingWidget {...defaultProps} showSummary={false} />);

    await waitFor(() => {
      expect(screen.getByText('Start Work Order Time')).toBeInTheDocument();
    });

    // Should not fetch or display summary
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/summary/'),
      expect.any(Object)
    );
    expect(screen.queryByText('Today:')).not.toBeInTheDocument();
  });

  it('extracts user ID from token when not provided', async () => {
    // Mock token with user ID
    const mockToken = btoa(JSON.stringify({ userId: 'token-user-id' }));
    (window.localStorage.getItem as Mock).mockReturnValue(`header.${mockToken}.signature`);

    render(<TimeTrackingWidget workOrderId="wo-1" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/time-tracking/active-entries/token-user-id',
        expect.any(Object)
      );
    });
  });
});