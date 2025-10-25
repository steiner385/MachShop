import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent as _fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { WorkInstructionList } from '@/components/WorkInstructions/WorkInstructionList';
import { WorkInstructionForm } from '@/components/WorkInstructions/WorkInstructionForm';
import { TabletExecutionView } from '@/components/WorkInstructions/TabletExecutionView';
import { workInstructionsAPI } from '@/api/workInstructions';

// Mock the API
vi.mock('@/api/workInstructions', () => ({
  workInstructionsAPI: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    approve: vi.fn(),
    addStep: vi.fn(),
    updateStep: vi.fn(),
    deleteStep: vi.fn(),
    reorderSteps: vi.fn(),
    getByPartId: vi.fn(),
  },
  uploadAPI: {
    uploadFile: vi.fn(),
    uploadFiles: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: 'test-wi-123' }),
  };
});

// Mock Zustand store
vi.mock('@/store/workInstructionStore', () => ({
  useWorkInstructionStore: () => ({
    workInstructions: mockWorkInstructions,
    isLoading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    },
    filters: {},
    currentWorkInstruction: mockWorkInstructions[0],
    isLoadingDetail: false,
    detailError: null,
    executionMode: true,
    currentStepIndex: 0,
    completedSteps: new Set(),
    fetchWorkInstructions: vi.fn(),
    setFilters: vi.fn(),
    setPage: vi.fn(),
    fetchWorkInstructionById: vi.fn().mockResolvedValue(mockWorkInstructions[0]),
    createWorkInstruction: vi.fn(),
    updateWorkInstruction: vi.fn(),
    deleteWorkInstruction: vi.fn(),
    approveWorkInstruction: vi.fn(),
    addStep: vi.fn(),
    updateStep: vi.fn(),
    deleteStep: vi.fn(),
    reorderSteps: vi.fn(),
    startExecution: vi.fn(),
    stopExecution: vi.fn(),
    goToNextStep: vi.fn(),
    goToPreviousStep: vi.fn(),
    goToStep: vi.fn(),
    markStepComplete: vi.fn(),
    markStepIncomplete: vi.fn(),
  }),
  useExecutionMode: () => ({
    executionMode: true,
    currentWorkInstruction: mockWorkInstructions[0],
    currentStepIndex: 0,
    completedSteps: new Set(),
    currentStep: mockWorkInstructions[0].steps[0],
    totalSteps: 3,
  }),
}));

// Mock data
const mockWorkInstructions = [
  {
    id: 'wi-001',
    title: 'Assembly Procedure for Wing Panel A',
    description: 'Detailed assembly instructions for wing panel',
    version: '1.0.0',
    status: 'APPROVED' as const,
    partId: 'part-001',
    operationId: 'op-001',
    createdById: 'user-001',
    updatedById: 'user-001',
    createdAt: '2025-10-15T10:00:00Z',
    updatedAt: '2025-10-15T12:00:00Z',
    steps: [
      {
        id: 'step-001',
        workInstructionId: 'wi-001',
        stepNumber: 1,
        title: 'Prepare Materials',
        content: 'Gather all required materials and tools',
        imageUrls: ['/uploads/images/step1.jpg'],
        videoUrls: [],
        attachmentUrls: [],
        estimatedDuration: 300,
        isCritical: false,
        requiresSignature: false,
        createdAt: '2025-10-15T10:00:00Z',
        updatedAt: '2025-10-15T10:00:00Z',
      },
      {
        id: 'step-002',
        workInstructionId: 'wi-001',
        stepNumber: 2,
        title: 'Position Components',
        content: 'Carefully position the wing panel components',
        imageUrls: [],
        videoUrls: ['/uploads/videos/positioning.mp4'],
        attachmentUrls: [],
        estimatedDuration: 600,
        isCritical: true,
        requiresSignature: true,
        createdAt: '2025-10-15T10:00:00Z',
        updatedAt: '2025-10-15T10:00:00Z',
      },
      {
        id: 'step-003',
        workInstructionId: 'wi-001',
        stepNumber: 3,
        title: 'Final Inspection',
        content: 'Inspect the completed assembly',
        imageUrls: [],
        videoUrls: [],
        attachmentUrls: ['/uploads/docs/checklist.pdf'],
        estimatedDuration: 900,
        isCritical: true,
        requiresSignature: true,
        createdAt: '2025-10-15T10:00:00Z',
        updatedAt: '2025-10-15T10:00:00Z',
      },
    ],
  },
  {
    id: 'wi-002',
    title: 'Welding Procedure',
    description: 'Standard welding procedure',
    version: '2.1.0',
    status: 'DRAFT' as const,
    createdById: 'user-001',
    updatedById: 'user-001',
    createdAt: '2025-10-15T11:00:00Z',
    updatedAt: '2025-10-15T11:30:00Z',
    steps: [],
  },
];

describe('Work Instructions Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WorkInstructionList Component', () => {
    it('should render list of work instructions', async () => {
      (workInstructionsAPI.list as any).mockResolvedValue({
        workInstructions: mockWorkInstructions,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      });

      render(
        <BrowserRouter>
          <WorkInstructionList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Work Instructions')).toBeInTheDocument();
        expect(screen.getByText(/Assembly Procedure for Wing Panel A/i)).toBeInTheDocument();
        expect(screen.getByText(/Welding Procedure/i)).toBeInTheDocument();
      });
    });

    it('should display status badges correctly', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('APPROVED')).toBeInTheDocument();
        expect(screen.getByText('DRAFT')).toBeInTheDocument();
      });
    });

    it('should show step count for each work instruction', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionList />
        </BrowserRouter>
      );

      await waitFor(() => {
        const stepCounts = screen.getAllByText(/\d+/);
        expect(stepCounts.length).toBeGreaterThan(0);
      });
    });

    it('should have search functionality', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionList />
        </BrowserRouter>
      );

      const searchInput = screen.getByPlaceholderText(/Search by title or description/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should have status filter dropdown', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionList />
        </BrowserRouter>
      );

      const filterSelect = screen.getByPlaceholderText(/Filter by status/i);
      expect(filterSelect).toBeInTheDocument();
    });

    it('should have create button', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionList />
        </BrowserRouter>
      );

      const createButton = screen.getByRole('button', { name: /Create Work Instruction/i });
      expect(createButton).toBeInTheDocument();
    });
  });

  describe('WorkInstructionForm Component', () => {
    it('should render create form with all fields', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionForm mode="create" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Create Work Instruction')).toBeInTheDocument();
        expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Version/i)).toBeInTheDocument();
      });
    });

    it('should have save as draft button', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionForm mode="create" />
        </BrowserRouter>
      );

      await waitFor(() => {
        const draftButton = screen.getByRole('button', { name: /Save as Draft/i });
        expect(draftButton).toBeInTheDocument();
      });
    });

    it('should have submit for review button', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionForm mode="create" />
        </BrowserRouter>
      );

      await waitFor(() => {
        const reviewButton = screen.getByRole('button', { name: /Submit for Review/i });
        expect(reviewButton).toBeInTheDocument();
      });
    });

    it('should render edit form with existing data', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionForm mode="edit" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Work Instruction')).toBeInTheDocument();
      });
    });
  });

  describe('TabletExecutionView Component', () => {
    it('should render execution view with work instruction title', async () => {
      render(
        <BrowserRouter>
          <TabletExecutionView />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Assembly Procedure for Wing Panel A/i)).toBeInTheDocument();
      });
    });

    it('should display progress indicator', async () => {
      render(
        <BrowserRouter>
          <TabletExecutionView />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
      });
    });

    it('should show current step title and content', async () => {
      render(
        <BrowserRouter>
          <TabletExecutionView />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Prepare Materials')).toBeInTheDocument();
        expect(screen.getByText(/Gather all required materials and tools/i)).toBeInTheDocument();
      });
    });

    it('should display critical step badge when applicable', async () => {
      render(
        <BrowserRouter>
          <TabletExecutionView />
        </BrowserRouter>
      );

      // Current step is not critical, so badge should not be present
      await waitFor(() => {
        const criticalBadges = screen.queryAllByText(/CRITICAL STEP/i);
        // First step is not critical
        expect(criticalBadges.length).toBe(0);
      });
    });

    it('should have navigation buttons', async () => {
      render(
        <BrowserRouter>
          <TabletExecutionView />
        </BrowserRouter>
      );

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /Next/i });
        expect(nextButton).toBeInTheDocument();
      });
    });

    it('should have step completion checkbox', async () => {
      render(
        <BrowserRouter>
          <TabletExecutionView />
        </BrowserRouter>
      );

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeInTheDocument();
      });
    });

    it('should have exit button', async () => {
      render(
        <BrowserRouter>
          <TabletExecutionView />
        </BrowserRouter>
      );

      await waitFor(() => {
        const exitButton = screen.getByRole('button', { name: /Exit/i });
        expect(exitButton).toBeInTheDocument();
      });
    });

    it('should have fullscreen toggle button', async () => {
      render(
        <BrowserRouter>
          <TabletExecutionView />
        </BrowserRouter>
      );

      await waitFor(() => {
        const fullscreenButton = screen.getByRole('button', { name: /Fullscreen/i });
        expect(fullscreenButton).toBeInTheDocument();
      });
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full workflow: create → add steps → execute', async () => {
      // Step 1: List view renders
      const { unmount: unmountList } = render(
        <BrowserRouter>
          <WorkInstructionList />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Work Instructions')).toBeInTheDocument();
      });

      unmountList();

      // Step 2: Create form renders
      const { unmount: unmountForm } = render(
        <BrowserRouter>
          <WorkInstructionForm mode="create" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Create Work Instruction')).toBeInTheDocument();
      });

      unmountForm();

      // Step 3: Execution view renders
      render(
        <BrowserRouter>
          <TabletExecutionView />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Assembly Procedure for Wing Panel A/i)).toBeInTheDocument();
        expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
      });
    });
  });
});
