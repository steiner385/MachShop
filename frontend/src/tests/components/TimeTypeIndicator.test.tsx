import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimeTypeIndicator, {
  TimeStatusDot,
  getTimeTypeColor,
  getTimeTypeLabel,
  TIME_TYPE_COLORS
} from '../../components/TimeTracking/TimeTypeIndicator';

describe('TimeTypeIndicator Component', () => {
  const user = userEvent.setup();

  it('renders direct labor indicator', () => {
    render(<TimeTypeIndicator timeType="DIRECT_LABOR" />);

    expect(screen.getByText('Direct Labor')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveClass('anticon-clock-circle');
  });

  it('renders indirect time indicator', () => {
    render(<TimeTypeIndicator timeType="INDIRECT" />);

    expect(screen.getByText('Indirect Time')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveClass('anticon-clock-circle');
  });

  it('renders indirect time with specific category', () => {
    render(
      <TimeTypeIndicator
        timeType="INDIRECT"
        indirectCategory="BREAK"
      />
    );

    expect(screen.getByText('Break')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveClass('anticon-coffee');
  });

  it('renders in compact variant', () => {
    render(
      <TimeTypeIndicator
        timeType="DIRECT_LABOR"
        variant="compact"
      />
    );

    const indicator = screen.getByText('Direct Labor').closest('div');
    expect(indicator).toHaveStyle({ display: 'inline-flex' });
  });

  it('renders in dot variant', () => {
    render(
      <TimeTypeIndicator
        timeType="DIRECT_LABOR"
        variant="dot"
      />
    );

    expect(screen.getByText('Direct Labor')).toBeInTheDocument();
    // Should have a status dot
    const container = screen.getByText('Direct Labor').closest('span');
    expect(container?.querySelector('div')).toBeInTheDocument();
  });

  it('renders in large variant', () => {
    render(
      <TimeTypeIndicator
        timeType="DIRECT_LABOR"
        variant="large"
      />
    );

    const tag = screen.getByText('Direct Labor').closest('.ant-tag');
    expect(tag).toHaveStyle({ fontSize: '16px' });
  });

  it('shows animation when active', () => {
    render(
      <TimeTypeIndicator
        timeType="DIRECT_LABOR"
        isActive={true}
      />
    );

    const tag = screen.getByText('Direct Labor').closest('.ant-tag');
    expect(tag).toHaveAttribute('animate', 'true');
    expect(screen.getByRole('img')).toHaveClass('anticon-loading');
  });

  it('shows status-based color when status provided', () => {
    render(
      <TimeTypeIndicator
        timeType="DIRECT_LABOR"
        status="COMPLETED"
      />
    );

    const tag = screen.getByText('Direct Labor').closest('.ant-tag');
    expect(tag).toHaveAttribute('color', '#1890ff');
  });

  it('hides icon when showIcon is false', () => {
    render(
      <TimeTypeIndicator
        timeType="DIRECT_LABOR"
        showIcon={false}
      />
    );

    expect(screen.getByText('Direct Labor')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('hides text when showText is false', () => {
    render(
      <TimeTypeIndicator
        timeType="DIRECT_LABOR"
        showText={false}
      />
    );

    expect(screen.queryByText('Direct Labor')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('shows tooltip on hover', async () => {
    render(<TimeTypeIndicator timeType="DIRECT_LABOR" />);

    const indicator = screen.getByText('Direct Labor');
    await user.hover(indicator);

    await screen.findByText('Work performed directly on production orders');
  });

  it('shows status in tooltip when provided', async () => {
    render(
      <TimeTypeIndicator
        timeType="DIRECT_LABOR"
        status="PENDING_APPROVAL"
      />
    );

    const indicator = screen.getByText('Direct Labor');
    await user.hover(indicator);

    await screen.findByText('Status: Pending Approval');
  });

  describe('Indirect Categories', () => {
    const categories = [
      { category: 'BREAK', label: 'Break', icon: 'anticon-coffee' },
      { category: 'LUNCH', label: 'Lunch', icon: 'anticon-coffee' },
      { category: 'TRAINING', label: 'Training', icon: 'anticon-book' },
      { category: 'MEETING', label: 'Meeting', icon: 'anticon-team' },
      { category: 'MAINTENANCE', label: 'Maintenance', icon: 'anticon-tool' },
      { category: 'SETUP', label: 'Setup', icon: 'anticon-setting' },
      { category: 'CLEANUP', label: 'Cleanup', icon: 'anticon-setting' },
      { category: 'WAITING', label: 'Waiting', icon: 'anticon-clock-circle' },
      { category: 'ADMINISTRATIVE', label: 'Administrative', icon: 'anticon-book' },
      { category: 'OTHER', label: 'Other', icon: 'anticon-question-circle' },
    ];

    categories.forEach(({ category, label, icon }) => {
      it(`renders ${category} category correctly`, () => {
        render(
          <TimeTypeIndicator
            timeType="INDIRECT"
            indirectCategory={category as any}
          />
        );

        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByRole('img')).toHaveClass(icon);
      });
    });
  });

  describe('Status Colors', () => {
    const statuses = [
      { status: 'ACTIVE', color: '#52c41a' },
      { status: 'COMPLETED', color: '#1890ff' },
      { status: 'PENDING_APPROVAL', color: '#faad14' },
      { status: 'APPROVED', color: '#52c41a' },
      { status: 'REJECTED', color: '#f5222d' },
    ];

    statuses.forEach(({ status, color }) => {
      it(`uses correct color for ${status} status`, () => {
        render(
          <TimeTypeIndicator
            timeType="DIRECT_LABOR"
            status={status as any}
          />
        );

        const tag = screen.getByText('Direct Labor').closest('.ant-tag');
        expect(tag).toHaveAttribute('color', color);
      });
    });
  });
});

describe('TimeStatusDot Component', () => {
  it('renders status dot for direct labor', () => {
    render(<TimeStatusDot timeType="DIRECT_LABOR" />);

    const dot = document.querySelector('div');
    expect(dot).toHaveStyle({ backgroundColor: '#52c41a' });
  });

  it('renders status dot for indirect time', () => {
    render(<TimeStatusDot timeType="INDIRECT" indirectCategory="BREAK" />);

    const dot = document.querySelector('div');
    expect(dot).toHaveStyle({ backgroundColor: '#722ed1' });
  });

  it('renders custom size', () => {
    render(<TimeStatusDot timeType="DIRECT_LABOR" size={16} />);

    const dot = document.querySelector('div');
    expect(dot).toHaveStyle({ width: '16px', height: '16px' });
  });

  it('animates when active', () => {
    render(<TimeStatusDot timeType="DIRECT_LABOR" isActive={true} />);

    const dot = document.querySelector('div');
    expect(dot).toHaveAttribute('animate', 'true');
  });
});

describe('Utility Functions', () => {
  describe('getTimeTypeColor', () => {
    it('returns direct labor color', () => {
      expect(getTimeTypeColor('DIRECT_LABOR')).toBe('#52c41a');
    });

    it('returns indirect category color', () => {
      expect(getTimeTypeColor('INDIRECT', 'BREAK')).toBe('#722ed1');
    });

    it('returns general indirect color when no category', () => {
      expect(getTimeTypeColor('INDIRECT')).toBe('#faad14');
    });
  });

  describe('getTimeTypeLabel', () => {
    it('returns direct labor label', () => {
      expect(getTimeTypeLabel('DIRECT_LABOR')).toBe('Direct Labor');
    });

    it('returns indirect category label', () => {
      expect(getTimeTypeLabel('INDIRECT', 'BREAK')).toBe('Break');
    });

    it('returns general indirect label when no category', () => {
      expect(getTimeTypeLabel('INDIRECT')).toBe('Indirect Time');
    });
  });

  describe('TIME_TYPE_COLORS', () => {
    it('contains all expected colors', () => {
      expect(TIME_TYPE_COLORS).toHaveProperty('DIRECT_LABOR', '#52c41a');
      expect(TIME_TYPE_COLORS).toHaveProperty('INDIRECT', '#faad14');
      expect(TIME_TYPE_COLORS).toHaveProperty('BREAK', '#722ed1');
      expect(TIME_TYPE_COLORS).toHaveProperty('LUNCH', '#eb2f96');
      expect(TIME_TYPE_COLORS).toHaveProperty('TRAINING', '#1890ff');
      expect(TIME_TYPE_COLORS).toHaveProperty('MEETING', '#13c2c2');
      expect(TIME_TYPE_COLORS).toHaveProperty('MAINTENANCE', '#fa8c16');
      expect(TIME_TYPE_COLORS).toHaveProperty('SETUP', '#a0d911');
      expect(TIME_TYPE_COLORS).toHaveProperty('CLEANUP', '#f5222d');
      expect(TIME_TYPE_COLORS).toHaveProperty('WAITING', '#fadb14');
      expect(TIME_TYPE_COLORS).toHaveProperty('ADMINISTRATIVE', '#722ed1');
      expect(TIME_TYPE_COLORS).toHaveProperty('OTHER', '#8c8c8c');
    });
  });
});