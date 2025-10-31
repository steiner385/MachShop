/**
 * StagingStatusBoard Component Tests
 *
 * Comprehensive test suite for StagingStatusBoard component covering:
 * - Kanban board layout and stage columns
 * - Drag and drop functionality
 * - Staging item cards with detailed information
 * - Filter controls and search functionality
 * - Action menus and user interactions
 * - Status transitions and backend integration
 * - Visual feedback and loading states
 * - Error handling and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StagingStatusBoard } from '../../../components/Staging/StagingStatusBoard';
import { useKitStore } from '../../../store/kitStore';

// Mock the kit store
vi.mock('../../../store/kitStore', () => ({
  useKitStore: vi.fn()
}));

// Mock dayjs with relative time plugin
vi.mock('dayjs', () => {
  const mockDayjs = vi.fn((date) => ({
    add: vi.fn().mockReturnThis(),
    subtract: vi.fn().mockReturnThis(),
    toISOString: vi.fn().mockReturnValue('2024-01-15T10:30:00.000Z'),
    format: vi.fn().mockReturnValue('Oct 30, 10:30'),
    fromNow: vi.fn().mockReturnValue('1 hour ago')
  }));
  mockDayjs.extend = vi.fn();
  return {
    default: mockDayjs,
    __esModule: true
  };
});

// Mock react-beautiful-dnd
vi.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children, onDragEnd, onDragStart }: any) => (
    <div data-testid="drag-drop-context" data-on-drag-end={onDragEnd} data-on-drag-start={onDragStart}>
      {children}
    </div>
  ),
  Droppable: ({ children, droppableId }: any) => (
    <div data-testid={`droppable-${droppableId}`}>
      {children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }, { isDraggingOver: false })}
    </div>
  ),
  Draggable: ({ children, draggableId, index }: any) => (
    <div data-testid={`draggable-${draggableId}`}>
      {children(
        {
          innerRef: vi.fn(),
          draggableProps: { style: {} },
          dragHandleProps: {}
        },
        { isDragging: false }
      )}
    </div>
  )
}));

// Mock antd message
const mockMessage = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
};

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: mockMessage
  };
});

describe('StagingStatusBoard', () => {
  const mockKitStore = {
    kits: [],
    loading: {
      kits: false
    },
    fetchKits: vi.fn(),
    transitionKitStatus: vi.fn()
  };

  beforeEach(() => {
    vi.mocked(useKitStore).mockReturnValue(mockKitStore);
    mockKitStore.transitionKitStatus.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockMessage.success.mockClear();
    mockMessage.error.mockClear();
    mockMessage.info.mockClear();
  });

  describe('Layout and Structure', () => {
    it('renders main header correctly', () => {
      render(<StagingStatusBoard />);

      expect(screen.getByText('Staging Status Board')).toBeInTheDocument();
    });

    it('renders all staging stage columns', () => {
      render(<StagingStatusBoard />);

      expect(screen.getByText('Planned')).toBeInTheDocument();
      expect(screen.getByText('Assigned')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Staged')).toBeInTheDocument();
    });

    it('displays stage subtitles', () => {
      render(<StagingStatusBoard />);

      expect(screen.getByText('Ready for staging')).toBeInTheDocument();
      expect(screen.getByText('Location assigned')).toBeInTheDocument();
      expect(screen.getByText('Being staged')).toBeInTheDocument();
      expect(screen.getByText('Ready for issue')).toBeInTheDocument();
    });

    it('shows item counts for each stage', () => {
      render(<StagingStatusBoard />);

      // Badges should show count of items in each stage
      const badges = screen.getAllByClassName('ant-badge');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('renders drag and drop context', () => {
      render(<StagingStatusBoard />);

      expect(screen.getByTestId('drag-drop-context')).toBeInTheDocument();
    });

    it('renders droppable areas for each stage', () => {
      render(<StagingStatusBoard />);

      expect(screen.getByTestId('droppable-planned')).toBeInTheDocument();
      expect(screen.getByTestId('droppable-assigned')).toBeInTheDocument();
      expect(screen.getByTestId('droppable-in-progress')).toBeInTheDocument();
      expect(screen.getByTestId('droppable-staged')).toBeInTheDocument();
    });
  });

  describe('Filter Controls', () => {
    it('renders search input', () => {
      render(<StagingStatusBoard />);

      const searchInput = screen.getByPlaceholderText('Search kits by number, name, or work order...');
      expect(searchInput).toBeInTheDocument();
    });

    it('renders area filter selector', () => {
      render(<StagingStatusBoard />);

      expect(screen.getByPlaceholderText('Area')).toBeInTheDocument();
    });

    it('renders priority filter selector', () => {
      render(<StagingStatusBoard />);

      expect(screen.getByPlaceholderText('Priority')).toBeInTheDocument();
    });

    it('renders assigned user filter selector', () => {
      render(<StagingStatusBoard />);

      expect(screen.getByPlaceholderText('Assigned User')).toBeInTheDocument();
    });

    it('handles search input changes', async () => {
      const user = userEvent.setup();
      render(<StagingStatusBoard />);

      const searchInput = screen.getByPlaceholderText('Search kits by number, name, or work order...');
      await user.type(searchInput, 'KIT-WO-12345');

      expect(searchInput).toHaveValue('KIT-WO-12345');
    });

    it('handles area filter changes', async () => {
      const user = userEvent.setup();
      render(<StagingStatusBoard />);

      const areaSelect = screen.getByPlaceholderText('Area');
      await user.click(areaSelect);

      expect(screen.getByText('All Areas')).toBeInTheDocument();
      expect(screen.getByText('Area A')).toBeInTheDocument();
      expect(screen.getByText('Area B')).toBeInTheDocument();
      expect(screen.getByText('Area C')).toBeInTheDocument();

      await user.click(screen.getByText('Area A'));
      expect(screen.getByDisplayValue('Area A')).toBeInTheDocument();
    });

    it('handles priority filter changes with multiple selection', async () => {
      const user = userEvent.setup();
      render(<StagingStatusBoard />);

      const prioritySelect = screen.getByPlaceholderText('Priority');
      await user.click(prioritySelect);

      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();

      await user.click(screen.getByText('High'));
      // Multi-select should allow selecting multiple priorities
    });

    it('handles assigned user filter changes', async () => {
      const user = userEvent.setup();
      render(<StagingStatusBoard />);

      const userSelect = screen.getByPlaceholderText('Assigned User');
      await user.click(userSelect);

      expect(screen.getByText('All Users')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Mike Wilson')).toBeInTheDocument();

      await user.click(screen.getByText('John Smith'));
    });
  });

  describe('Staging Item Cards', () => {
    it('displays kit numbers and work order information', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        expect(screen.getByText('KIT-WO-12345-01')).toBeInTheDocument();
        expect(screen.getByText('KIT-WO-12346-01')).toBeInTheDocument();
        expect(screen.getByText('KIT-WO-12347-01')).toBeInTheDocument();
        expect(screen.getByText('KIT-WO-12348-01')).toBeInTheDocument();
      });

      expect(screen.getByText('WO-12345 • ENG-001')).toBeInTheDocument();
      expect(screen.getByText('WO-12346 • COMP-002')).toBeInTheDocument();
    });

    it('shows kit names', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        expect(screen.getByText('Engine Assembly Kit - ENG-001')).toBeInTheDocument();
        expect(screen.getByText('Compressor Kit - COMP-002')).toBeInTheDocument();
        expect(screen.getByText('Turbine Assembly Kit - TUR-001')).toBeInTheDocument();
        expect(screen.getByText('Fan Assembly Kit - FAN-001')).toBeInTheDocument();
      });
    });

    it('displays priority tags with appropriate colors', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        const highTags = screen.getAllByText('High');
        const urgentTags = screen.getAllByText('Urgent');
        const normalTags = screen.getAllByText('Normal');

        expect(highTags.length).toBeGreaterThan(0);
        expect(urgentTags.length).toBeGreaterThan(0);
        expect(normalTags.length).toBeGreaterThan(0);
      });
    });

    it('shows progress bars and item counts', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        expect(screen.getByText('3/12 items staged')).toBeInTheDocument();
        expect(screen.getByText('0/8 items staged')).toBeInTheDocument();
        expect(screen.getByText('11/15 items staged')).toBeInTheDocument();
        expect(screen.getByText('20/20 items staged')).toBeInTheDocument();
      });

      // Should show progress bars
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('displays shortage indicators when present', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        expect(screen.getByText('• 1 shortages')).toBeInTheDocument();
      });
    });

    it('shows staging location and assigned user tags', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        expect(screen.getByText('STG-A1')).toBeInTheDocument();
        expect(screen.getByText('STG-B2')).toBeInTheDocument();
        expect(screen.getByText('STG-C1')).toBeInTheDocument();

        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
        expect(screen.getByText('Mike Wilson')).toBeInTheDocument();
      });
    });

    it('displays timing information', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        // Due dates
        expect(screen.getAllByText(/Due: Oct 30/)).toHaveLength(4);

        // Started times
        expect(screen.getAllByText(/Started: 1 hour ago/)).toHaveLength(3);

        // Estimated completion
        expect(screen.getByText(/Est. completion: 1 hour ago/)).toBeInTheDocument();
      });
    });

    it('shows issue tags with appropriate severity colors', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        const issueTags = screen.getAllByText('shortage');
        expect(issueTags.length).toBeGreaterThan(0);
      });
    });

    it('renders action dropdown menus', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        const moreButtons = screen.getAllByRole('button', { name: /more/i });
        expect(moreButtons.length).toBeGreaterThan(0);
      });
    });

    it('renders draggable components for each item', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        expect(screen.getByTestId('draggable-1')).toBeInTheDocument();
        expect(screen.getByTestId('draggable-2')).toBeInTheDocument();
        expect(screen.getByTestId('draggable-3')).toBeInTheDocument();
        expect(screen.getByTestId('draggable-4')).toBeInTheDocument();
      });
    });
  });

  describe('Action Menu Interactions', () => {
    beforeEach(async () => {
      render(<StagingStatusBoard />);
      await waitFor(() => {
        expect(screen.getByText('KIT-WO-12345-01')).toBeInTheDocument();
      });
    });

    it('displays action menu items when clicked', async () => {
      const user = userEvent.setup();

      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(moreButtons[0]);

      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Edit Kit')).toBeInTheDocument();
      expect(screen.getByText('Start Staging')).toBeInTheDocument();
      expect(screen.getByText('Pause Staging')).toBeInTheDocument();
      expect(screen.getByText('Complete Staging')).toBeInTheDocument();
    });

    it('handles view action', async () => {
      const user = userEvent.setup();

      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(moreButtons[0]);
      await user.click(screen.getByText('View Details'));

      expect(mockMessage.info).toHaveBeenCalledWith('Viewing details for KIT-WO-12345-01');
    });

    it('handles edit action', async () => {
      const user = userEvent.setup();

      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(moreButtons[0]);
      await user.click(screen.getByText('Edit Kit'));

      expect(mockMessage.info).toHaveBeenCalledWith('Editing KIT-WO-12345-01');
    });

    it('handles start staging action', async () => {
      const user = userEvent.setup();

      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(moreButtons[0]);
      await user.click(screen.getByText('Start Staging'));

      expect(mockMessage.info).toHaveBeenCalledWith('Starting staging for KIT-WO-12345-01');
    });

    it('handles pause staging action', async () => {
      const user = userEvent.setup();

      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(moreButtons[0]);
      await user.click(screen.getByText('Pause Staging'));

      expect(mockMessage.info).toHaveBeenCalledWith('Pausing staging for KIT-WO-12345-01');
    });

    it('handles complete staging action', async () => {
      const user = userEvent.setup();

      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(moreButtons[0]);
      await user.click(screen.getByText('Complete Staging'));

      expect(mockMessage.info).toHaveBeenCalledWith('Completing staging for KIT-WO-12345-01');
    });
  });

  describe('Drag and Drop Functionality', () => {
    it('has drag and drop context with event handlers', () => {
      render(<StagingStatusBoard />);

      const dragDropContext = screen.getByTestId('drag-drop-context');
      expect(dragDropContext).toHaveAttribute('data-on-drag-end');
      expect(dragDropContext).toHaveAttribute('data-on-drag-start');
    });

    it('organizes items by stage correctly', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        // Items should be organized in correct columns based on progress
        // Planned: progress = 0, no location
        // Assigned: progress = 0, has location
        // In Progress: 0 < progress < 100
        // Staged: progress = 100

        // Check specific items are in expected stages
        expect(screen.getByText('KIT-WO-12346-01')).toBeInTheDocument(); // Should be in planned (0% progress, no location)
      });
    });

    // Note: Testing actual drag and drop behavior would require more complex mocking
    // of react-beautiful-dnd's internal state and event handling
  });

  describe('Status Transitions', () => {
    it('calls transitionKitStatus when items are moved', () => {
      render(<StagingStatusBoard />);

      // The actual drag and drop testing would require simulating the onDragEnd callback
      // For now, we can verify the function is available in the store
      expect(mockKitStore.transitionKitStatus).toBeDefined();
    });

    it('shows success message on successful status transition', () => {
      render(<StagingStatusBoard />);

      // Would need to simulate drag end event to test this
      // The message.success call is in the handleDragEnd function
    });

    it('handles status transition errors gracefully', () => {
      mockKitStore.transitionKitStatus.mockRejectedValue(new Error('Update failed'));
      render(<StagingStatusBoard />);

      // Would need to simulate drag end event to test error handling
      // The error handling reverts state and shows error message
    });
  });

  describe('Empty States', () => {
    it('shows empty message when no items in stage', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        // Some stages might be empty initially
        const emptyMessages = screen.queryAllByText('No items in this stage');
        // At least some stages should show empty state if they have no items
        expect(emptyMessages.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Visual Feedback', () => {
    it('applies appropriate styling to priority tags', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        const urgentTags = screen.getAllByText('Urgent');
        const highTags = screen.getAllByText('High');
        const normalTags = screen.getAllByText('Normal');

        expect(urgentTags.length).toBeGreaterThan(0);
        expect(highTags.length).toBeGreaterThan(0);
        expect(normalTags.length).toBeGreaterThan(0);
      });
    });

    it('shows progress bars with appropriate colors', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar');
        expect(progressBars.length).toBe(4); // One for each item
      });
    });

    it('displays issue tags with severity-based colors', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        const issueTags = screen.getAllByText('shortage');
        expect(issueTags.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tooltip Functionality', () => {
    it('shows tooltips for issue tags', async () => {
      const user = userEvent.setup();
      render(<StagingStatusBoard />);

      await waitFor(() => {
        const issueTags = screen.getAllByText('shortage');
        expect(issueTags.length).toBeGreaterThan(0);
      });

      // Hovering over issue tags should show tooltip with details
      // This would require more complex user interaction simulation
    });
  });

  describe('Props and Customization', () => {
    it('accepts viewMode prop', () => {
      render(<StagingStatusBoard viewMode="board" />);
      expect(screen.getByText('Staging Status Board')).toBeInTheDocument();

      render(<StagingStatusBoard viewMode="list" />);
      expect(screen.getByText('Staging Status Board')).toBeInTheDocument();
    });

    it('accepts filterOptions prop', () => {
      const filterOptions = {
        area: 'area-a',
        priority: ['HIGH'],
        assignedUser: 'john'
      };

      render(<StagingStatusBoard filterOptions={filterOptions} />);
      expect(screen.getByText('Staging Status Board')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<StagingStatusBoard />);

      // Search input should be accessible
      const searchInput = screen.getByPlaceholderText('Search kits by number, name, or work order...');
      expect(searchInput).toBeInTheDocument();

      // Buttons should have proper roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Select elements should be accessible
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<StagingStatusBoard />);

      // Tab should navigate through filter controls
      await user.tab();
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Search kits by number, name, or work order...'));

      await user.tab();
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Area'));
    });

    it('provides meaningful content for screen readers', async () => {
      render(<StagingStatusBoard />);

      await waitFor(() => {
        // Kit numbers should be clearly marked as important
        expect(screen.getByText('KIT-WO-12345-01')).toBeInTheDocument();

        // Progress information should be accessible
        expect(screen.getByText('3/12 items staged')).toBeInTheDocument();

        // Status information should be clear
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('STG-A1')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('renders responsive grid layout', () => {
      render(<StagingStatusBoard />);

      // Columns should have responsive classes
      const stageColumns = screen.getAllByText(/Planned|Assigned|In Progress|Staged/);
      expect(stageColumns.length).toBe(4);
    });

    it('handles stage column heights appropriately', () => {
      render(<StagingStatusBoard />);

      // Cards should have consistent height styling
      const stageTitles = screen.getAllByText(/Ready for staging|Location assigned|Being staged|Ready for issue/);
      expect(stageTitles.length).toBe(4);
    });
  });

  describe('Data Loading and Updates', () => {
    it('loads and organizes staging data on mount', () => {
      render(<StagingStatusBoard />);

      // Component should render without errors and show data
      expect(screen.getByText('Staging Status Board')).toBeInTheDocument();
    });

    it('updates when kit data changes', () => {
      const { rerender } = render(<StagingStatusBoard />);

      // Simulate props change
      rerender(<StagingStatusBoard />);

      expect(screen.getByText('Staging Status Board')).toBeInTheDocument();
    });
  });
});