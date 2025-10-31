import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BuildRecordList from '../../components/BuildRecords/BuildRecordList';

// Mock fetch
global.fetch = vi.fn();

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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
const mockBuildRecords = [
  {
    id: 'br-1',
    buildRecordNumber: 'BR-2024-001',
    status: 'IN_PROGRESS',
    finalDisposition: 'PENDING',
    startedAt: '2024-01-01T08:00:00Z',
    completedAt: null,
    workOrder: {
      id: 'wo-1',
      orderNumber: 'WO-2024-001',
      engineSerial: 'ENG123456',
      engineModel: 'V12-TURBO',
      customer: 'Aerospace Corp',
    },
    operator: {
      id: 'user-1',
      name: 'John Operator',
      email: 'john@example.com',
    },
    inspector: null,
    operations: [
      {
        id: 'bro-1',
        status: 'COMPLETED',
      },
      {
        id: 'bro-2',
        status: 'IN_PROGRESS',
      },
    ],
    deviations: [],
    _count: {
      photos: 5,
      documents: 2,
      signatures: 3,
    },
  },
  {
    id: 'br-2',
    buildRecordNumber: 'BR-2024-002',
    status: 'COMPLETED',
    finalDisposition: 'ACCEPT',
    startedAt: '2024-01-02T08:00:00Z',
    completedAt: '2024-01-02T17:00:00Z',
    workOrder: {
      id: 'wo-2',
      orderNumber: 'WO-2024-002',
      engineSerial: 'ENG789012',
      engineModel: 'V8-STANDARD',
      customer: 'Defense Systems Inc',
    },
    operator: {
      id: 'user-1',
      name: 'John Operator',
      email: 'john@example.com',
    },
    inspector: {
      id: 'user-2',
      name: 'Jane Inspector',
      email: 'jane@example.com',
    },
    operations: [
      {
        id: 'bro-3',
        status: 'COMPLETED',
      },
      {
        id: 'bro-4',
        status: 'COMPLETED',
      },
    ],
    deviations: [
      {
        id: 'dev-1',
        severity: 'MEDIUM',
        status: 'RESOLVED',
      },
    ],
    _count: {
      photos: 8,
      documents: 3,
      signatures: 6,
    },
  },
];

const mockApiResponse = {
  data: mockBuildRecords,
  pagination: {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  },
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('BuildRecordList Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API response by default
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders build records list', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('BR-2024-001')).toBeInTheDocument();
      expect(screen.getByText('BR-2024-002')).toBeInTheDocument();
    });

    // Check if table headers are present
    expect(screen.getByText('Build Record #')).toBeInTheDocument();
    expect(screen.getByText('Work Order')).toBeInTheDocument();
    expect(screen.getByText('Engine Serial')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('displays summary statistics', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Records')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Total count
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // In progress count
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('BR-2024-001')).toBeInTheDocument();
    });

    // Find and use search input
    const searchInput = screen.getByPlaceholderText(/search build records/i);
    await user.type(searchInput, 'ENG123456');

    // Wait for search API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=ENG123456'),
        expect.any(Object)
      );
    });
  });

  it('handles status filter', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BR-2024-001')).toBeInTheDocument();
    });

    // Find status filter dropdown
    const statusFilter = screen.getByText('All Statuses');
    await user.click(statusFilter);

    // Select "In Progress" option
    const inProgressOption = screen.getByText('In Progress');
    await user.click(inProgressOption);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=IN_PROGRESS'),
        expect.any(Object)
      );
    });
  });

  it('handles customer filter', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BR-2024-001')).toBeInTheDocument();
    });

    // Find customer filter dropdown
    const customerFilter = screen.getByText('All Customers');
    await user.click(customerFilter);

    // Select a customer option
    const customerOption = screen.getByText('Aerospace Corp');
    await user.click(customerOption);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('customer=Aerospace Corp'),
        expect.any(Object)
      );
    });
  });

  it('navigates to build record detail on row click', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BR-2024-001')).toBeInTheDocument();
    });

    // Click on the first build record row
    const buildRecordRow = screen.getByText('BR-2024-001').closest('tr');
    expect(buildRecordRow).toBeInTheDocument();

    await user.click(buildRecordRow!);

    expect(mockNavigate).toHaveBeenCalledWith('/build-records/br-1');
  });

  it('displays progress correctly', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BR-2024-001')).toBeInTheDocument();
    });

    // Check progress display for in-progress record (1 of 2 operations completed)
    const progressElements = screen.getAllByText('50%');
    expect(progressElements.length).toBeGreaterThan(0);

    // Check progress for completed record (2 of 2 operations completed)
    const completedProgressElements = screen.getAllByText('100%');
    expect(completedProgressElements.length).toBeGreaterThan(0);
  });

  it('displays status tags with correct colors', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });

    // Status tags should be present
    const inProgressTag = screen.getByText('IN_PROGRESS');
    const completedTag = screen.getByText('COMPLETED');

    expect(inProgressTag).toHaveClass('ant-tag');
    expect(completedTag).toHaveClass('ant-tag');
  });

  it('shows action menu and handles actions', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BR-2024-001')).toBeInTheDocument();
    });

    // Find action menu button (three dots)
    const actionButtons = screen.getAllByRole('button');
    const actionMenuButton = actionButtons.find(button =>
      button.querySelector('.anticon-more')
    );

    expect(actionMenuButton).toBeInTheDocument();

    // Click action menu
    await user.click(actionMenuButton!);

    // Check for action menu items
    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Generate Build Book')).toBeInTheDocument();
    });
  });

  it('handles build book generation', async () => {
    // Mock successful build book generation
    (global.fetch as Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['PDF content'], { type: 'application/pdf' })),
        headers: {
          get: (name: string) => {
            if (name === 'content-disposition') {
              return 'attachment; filename="BuildBook_BR-2024-001.pdf"';
            }
            return null;
          },
        },
      })
    );

    // Mock URL.createObjectURL and related functions
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document.createElement and appendChild
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    document.createElement = vi.fn().mockReturnValue(mockAnchor);
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();

    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BR-2024-001')).toBeInTheDocument();
    });

    // Open action menu
    const actionButtons = screen.getAllByRole('button');
    const actionMenuButton = actionButtons.find(button =>
      button.querySelector('.anticon-more')
    );
    await user.click(actionMenuButton!);

    // Click generate build book
    const generateButton = screen.getByText('Generate Build Book');
    await user.click(generateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/build-books/generate/br-1'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('handles bulk operations', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BR-2024-001')).toBeInTheDocument();
    });

    // Select multiple records
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is "select all", skip it
    const firstRecordCheckbox = checkboxes[1];
    const secondRecordCheckbox = checkboxes[2];

    await user.click(firstRecordCheckbox);
    await user.click(secondRecordCheckbox);

    // Check that bulk actions appear
    await waitFor(() => {
      expect(screen.getByText(/2 items selected/)).toBeInTheDocument();
    });

    // Look for bulk action buttons
    expect(screen.getByText('Bulk Generate Build Books')).toBeInTheDocument();
    expect(screen.getByText('Export Selected')).toBeInTheDocument();
  });

  it('handles pagination', async () => {
    // Mock response with pagination
    const paginatedResponse = {
      ...mockApiResponse,
      pagination: {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      },
    };

    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(paginatedResponse),
    });

    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BR-2024-001')).toBeInTheDocument();
    });

    // Check pagination info
    expect(screen.getByText(/Total 25 items/)).toBeInTheDocument();

    // Find and click next page button
    const nextButton = screen.getByTitle('Next Page');
    await user.click(nextButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    (global.fetch as Mock).mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    // Mock pending promise
    (global.fetch as Mock).mockReturnValue(new Promise(() => {}));

    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    // Should show loading spinner
    expect(screen.getByTestId('loading-spinner') || screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('refreshes data when refresh button is clicked', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BR-2024-001')).toBeInTheDocument();
    });

    // Clear the previous fetch calls
    vi.clearAllMocks();

    // Find and click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    // Should make new API call
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/build-records'),
      expect.any(Object)
    );
  });

  it('displays deviation indicators', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BR-2024-002')).toBeInTheDocument();
    });

    // Second record has deviations, should show indicator
    const deviationBadges = screen.getAllByText('1'); // 1 deviation
    expect(deviationBadges.length).toBeGreaterThan(0);
  });

  it('handles sorting', async () => {
    render(
      <TestWrapper>
        <BuildRecordList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('BR-2024-001')).toBeInTheDocument();
    });

    // Click on a sortable column header
    const statusHeader = screen.getByText('Status');
    await user.click(statusHeader);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sortBy=status'),
        expect.any(Object)
      );
    });
  });
});