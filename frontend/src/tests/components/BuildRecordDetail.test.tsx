import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import BuildRecordDetail from '../../components/BuildRecords/BuildRecordDetail';

// Mock fetch
global.fetch = vi.fn();

// Mock react-router-dom navigation and params
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'test-build-record-id' }),
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

// Mock dayjs
vi.mock('dayjs', () => {
  const mockDayjs = vi.fn(() => ({
    format: vi.fn(() => 'Jan 01, 2024 08:00'),
    diff: vi.fn(() => 8.5),
  }));
  return {
    default: mockDayjs,
  };
});

// Test data
const mockBuildRecord = {
  id: 'test-build-record-id',
  buildRecordNumber: 'BR-2024-001',
  status: 'COMPLETED',
  finalDisposition: 'ACCEPT',
  startedAt: '2024-01-01T08:00:00Z',
  completedAt: '2024-01-01T17:00:00Z',
  createdAt: '2024-01-01T08:00:00Z',
  updatedAt: '2024-01-01T17:00:00Z',
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
  inspector: {
    id: 'user-2',
    name: 'Jane Inspector',
    email: 'jane@example.com',
  },
  operations: [
    {
      id: 'bro-1',
      operation: {
        operationNumber: '010',
        description: 'Assembly Operation',
        workCenter: {
          name: 'Assembly Station 1',
        },
      },
      status: 'COMPLETED',
      startedAt: '2024-01-01T08:00:00Z',
      completedAt: '2024-01-01T10:00:00Z',
      actualTimeMinutes: 120,
      standardTimeMinutes: 90,
      operator: {
        name: 'John Operator',
      },
      inspector: {
        name: 'Jane Inspector',
      },
      notes: 'Operation completed successfully',
      toolsUsed: ['Torque Wrench', 'Digital Caliper'],
      signatures: [
        {
          id: 'sig-1',
          type: 'OPERATOR',
          signedAt: '2024-01-01T10:00:00Z',
          signer: {
            name: 'John Operator',
            email: 'john@example.com',
          },
          comments: 'Operation completed successfully',
        },
        {
          id: 'sig-2',
          type: 'INSPECTOR',
          signedAt: '2024-01-01T10:30:00Z',
          signer: {
            name: 'Jane Inspector',
            email: 'jane@example.com',
          },
          comments: 'Inspection passed',
        },
      ],
    },
    {
      id: 'bro-2',
      operation: {
        operationNumber: '020',
        description: 'Inspection Operation',
        workCenter: {
          name: 'Inspection Station 1',
        },
      },
      status: 'COMPLETED',
      startedAt: '2024-01-01T10:30:00Z',
      completedAt: '2024-01-01T12:00:00Z',
      actualTimeMinutes: 90,
      standardTimeMinutes: 60,
      operator: {
        name: 'John Operator',
      },
      inspector: {
        name: 'Jane Inspector',
      },
      notes: 'Inspection completed',
      toolsUsed: ['Measuring Tools'],
      signatures: [
        {
          id: 'sig-3',
          type: 'INSPECTOR',
          signedAt: '2024-01-01T12:00:00Z',
          signer: {
            name: 'Jane Inspector',
            email: 'jane@example.com',
          },
          comments: 'Final inspection approved',
        },
      ],
    },
  ],
  deviations: [
    {
      id: 'dev-1',
      type: 'PROCESS',
      category: 'QUALITY',
      severity: 'MEDIUM',
      title: 'Torque specification deviation',
      description: 'Bolt torque was 5% over specification',
      rootCause: 'Calibration drift in torque wrench',
      correctiveAction: 'Re-torqued to specification',
      preventiveAction: 'Implement more frequent calibration schedule',
      status: 'RESOLVED',
      detectedAt: '2024-01-01T09:30:00Z',
      detector: {
        name: 'John Operator',
      },
      approvals: [
        {
          level: 'ENGINEER',
          approver: {
            name: 'Bob Engineer',
          },
          status: 'APPROVED',
          approvedAt: '2024-01-01T11:00:00Z',
          comments: 'Acceptable deviation, corrective action approved',
        },
      ],
    },
  ],
  photos: [
    {
      id: 'photo-1',
      filename: 'assembly_complete.jpg',
      originalName: 'Assembly Complete.jpg',
      filePath: '/uploads/photos/assembly_complete.jpg',
      thumbnailPath: '/uploads/photos/thumb_assembly_complete.jpg',
      caption: 'Final assembly state',
      takenAt: '2024-01-01T16:00:00Z',
      takenBy: 'John Operator',
      operationId: 'bro-1',
    },
    {
      id: 'photo-2',
      filename: 'inspection_view.jpg',
      originalName: 'Inspection View.jpg',
      filePath: '/uploads/photos/inspection_view.jpg',
      thumbnailPath: '/uploads/photos/thumb_inspection_view.jpg',
      caption: 'Inspection checkpoint',
      takenAt: '2024-01-01T12:30:00Z',
      takenBy: 'Jane Inspector',
      operationId: 'bro-2',
    },
  ],
  documents: [
    {
      id: 'doc-1',
      type: 'CERTIFICATE',
      filename: 'quality_cert.pdf',
      originalName: 'Quality Certificate.pdf',
      uploadedAt: '2024-01-01T16:30:00Z',
      uploadedBy: 'Jane Inspector',
    },
  ],
  signatures: [
    {
      id: 'sig-final',
      type: 'FINAL_APPROVAL',
      signedAt: '2024-01-01T17:00:00Z',
      signer: {
        name: 'Manager Smith',
        email: 'manager@example.com',
      },
      comments: 'Final approval granted',
      isValid: true,
    },
  ],
  statusHistory: [
    {
      id: 'hist-1',
      status: 'PENDING',
      changedAt: '2024-01-01T08:00:00Z',
      changer: {
        name: 'System',
      },
      reason: 'Build record created',
    },
    {
      id: 'hist-2',
      status: 'IN_PROGRESS',
      changedAt: '2024-01-01T08:30:00Z',
      changer: {
        name: 'John Operator',
      },
      reason: 'Started first operation',
    },
    {
      id: 'hist-3',
      status: 'COMPLETED',
      changedAt: '2024-01-01T17:00:00Z',
      changer: {
        name: 'Manager Smith',
      },
      reason: 'All operations completed and approved',
    },
  ],
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/build-records/test-build-record-id']}>
    {children}
  </MemoryRouter>
);

describe('BuildRecordDetail Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API response by default
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBuildRecord),
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

    // Mock URL.createObjectURL for file downloads
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders build record details', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Check basic information
    expect(screen.getByText('ENG123456 (V12-TURBO)')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('ACCEPT')).toBeInTheDocument();
  });

  it('displays progress bar correctly', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Should show 100% progress since all operations are completed
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('displays build record information in overview tab', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Check overview tab content
    expect(screen.getByText('Work Order')).toBeInTheDocument();
    expect(screen.getByText('WO-2024-001')).toBeInTheDocument();
    expect(screen.getByText('Engine Serial')).toBeInTheDocument();
    expect(screen.getByText('ENG123456')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Aerospace Corp')).toBeInTheDocument();
    expect(screen.getByText('Operator')).toBeInTheDocument();
    expect(screen.getByText('John Operator')).toBeInTheDocument();
    expect(screen.getByText('Inspector')).toBeInTheDocument();
    expect(screen.getByText('Jane Inspector')).toBeInTheDocument();
  });

  it('displays operations in operations tab', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Click on operations tab
    const operationsTab = screen.getByText('Operations (2)');
    await user.click(operationsTab);

    // Check operations table
    expect(screen.getByText('010')).toBeInTheDocument();
    expect(screen.getByText('Assembly Operation')).toBeInTheDocument();
    expect(screen.getByText('Assembly Station 1')).toBeInTheDocument();
    expect(screen.getByText('020')).toBeInTheDocument();
    expect(screen.getByText('Inspection Operation')).toBeInTheDocument();
    expect(screen.getByText('Inspection Station 1')).toBeInTheDocument();
  });

  it('expands operation details when row is expanded', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Click on operations tab
    const operationsTab = screen.getByText('Operations (2)');
    await user.click(operationsTab);

    // Find and click expand button for first operation
    const expandButtons = screen.getAllByRole('button', { name: /expand/i });
    if (expandButtons.length > 0) {
      await user.click(expandButtons[0]);

      // Check expanded content
      await waitFor(() => {
        expect(screen.getByText('Notes:')).toBeInTheDocument();
        expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
        expect(screen.getByText('Tools Used:')).toBeInTheDocument();
        expect(screen.getByText('Torque Wrench')).toBeInTheDocument();
        expect(screen.getByText('Digital Caliper')).toBeInTheDocument();
      });
    }
  });

  it('displays deviations in deviations tab', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Click on deviations tab - look for tab with badge
    const deviationsTab = screen.getByRole('tab', { name: /deviations/i });
    await user.click(deviationsTab);

    // Check deviations content
    expect(screen.getByText('PROCESS')).toBeInTheDocument();
    expect(screen.getByText('QUALITY')).toBeInTheDocument();
    expect(screen.getByText('Torque specification deviation')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('RESOLVED')).toBeInTheDocument();
  });

  it('displays photos in photos tab', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Click on photos tab
    const photosTab = screen.getByRole('tab', { name: /photos/i });
    await user.click(photosTab);

    // Check photos content
    expect(screen.getByText('Final assembly state')).toBeInTheDocument();
    expect(screen.getByText('Inspection checkpoint')).toBeInTheDocument();

    // Check that images are displayed
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('opens photo modal when photo is clicked', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Click on photos tab
    const photosTab = screen.getByRole('tab', { name: /photos/i });
    await user.click(photosTab);

    // Click on first photo
    const photos = screen.getAllByRole('img');
    if (photos.length > 0) {
      await user.click(photos[0]);

      // Check that modal opens
      await waitFor(() => {
        expect(screen.getByText('Final assembly state')).toBeInTheDocument();
      });
    }
  });

  it('displays documents in documents tab', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Click on documents tab
    const documentsTab = screen.getByRole('tab', { name: /documents/i });
    await user.click(documentsTab);

    // Check documents content
    expect(screen.getByText('CERTIFICATE')).toBeInTheDocument();
    expect(screen.getByText('Quality Certificate.pdf')).toBeInTheDocument();
    expect(screen.getByText('Jane Inspector')).toBeInTheDocument();
  });

  it('displays status history in history tab', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Click on history tab
    const historyTab = screen.getByRole('tab', { name: /history/i });
    await user.click(historyTab);

    // Check history content
    expect(screen.getByText('Status changed to PENDING')).toBeInTheDocument();
    expect(screen.getByText('Status changed to IN_PROGRESS')).toBeInTheDocument();
    expect(screen.getByText('Status changed to COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('Build record created')).toBeInTheDocument();
  });

  it('generates build book when button is clicked', async () => {
    // Mock successful build book generation
    (global.fetch as Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['PDF content'], { type: 'application/pdf' })),
      })
    );

    // Mock document methods for file download
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
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Click generate build book button
    const generateButton = screen.getByText('Generate Build Book');
    await user.click(generateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/build-books/generate/test-build-record-id'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('shows actions dropdown', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Click actions dropdown
    const actionsButton = screen.getByText('Actions');
    await user.click(actionsButton);

    // Check dropdown items
    await waitFor(() => {
      expect(screen.getByText('Edit Build Record')).toBeInTheDocument();
      expect(screen.getByText('Print Summary')).toBeInTheDocument();
      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });
  });

  it('shows deviation alert when deviations exist', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Check for deviation alert
    expect(screen.getByText('1 deviation(s) recorded')).toBeInTheDocument();
    expect(screen.getByText('This build record contains deviations that require review and approval.')).toBeInTheDocument();
  });

  it('displays statistics correctly', async () => {
    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Check statistics in overview tab
    expect(screen.getByText('2')).toBeInTheDocument(); // Operations count
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Deviations count
    expect(screen.getByText('Deviations')).toBeInTheDocument();
    expect(screen.getByText('Photos')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    // Mock API error
    (global.fetch as Mock).mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Build record not found')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    // Mock pending promise
    (global.fetch as Mock).mockReturnValue(new Promise(() => {}));

    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    // Should show loading message
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles missing data gracefully', async () => {
    const incompleteRecord = {
      ...mockBuildRecord,
      inspector: null,
      completedAt: null,
      deviations: [],
      photos: [],
      documents: [],
    };

    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(incompleteRecord),
    });

    render(
      <TestWrapper>
        <BuildRecordDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Build Record BR-2024-001')).toBeInTheDocument();
    });

    // Should handle missing inspector
    expect(screen.getByText('Not assigned')).toBeInTheDocument();

    // Should handle missing completion time
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });
});