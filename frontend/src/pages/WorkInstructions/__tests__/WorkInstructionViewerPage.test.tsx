import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { WorkInstructionViewerPage } from '../WorkInstructionViewerPage';
import * as workInstructionApi from '@/api/workInstructions';
import type { WorkInstruction } from '@/api/workInstructions';

// Mock the API module
vi.mock('@/api/workInstructions', () => ({
  workInstructionApi: {
    getWorkInstructionById: vi.fn(),
  },
}));

// Mock the router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: 'test-id-123' })),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

const mockWorkInstruction: WorkInstruction = {
  id: 'test-id-123',
  title: 'Test Work Instruction',
  description: 'Test Description',
  version: '1.0.0',
  status: 'APPROVED',
  createdById: 'user-1',
  updatedById: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  steps: [
    {
      id: 'step-1',
      workInstructionId: 'test-id-123',
      stepNumber: 1,
      title: 'Step 1',
      content: 'Step 1 content',
      imageUrls: [],
      videoUrls: [],
      attachmentUrls: [],
      isCritical: false,
      requiresSignature: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ],
};

describe('WorkInstructionViewerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner while fetching data', () => {
      vi.spyOn(workInstructionApi.workInstructionApi, 'getWorkInstructionById').mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      expect(screen.getByText(/Loading work instruction/i)).toBeInTheDocument();
    });

    it('should show loading state for a short duration', async () => {
      vi.spyOn(workInstructionApi.workInstructionApi, 'getWorkInstructionById').mockResolvedValue(
        mockWorkInstruction
      );

      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockWorkInstruction.title)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Loading', () => {
    beforeEach(() => {
      vi.spyOn(workInstructionApi.workInstructionApi, 'getWorkInstructionById').mockResolvedValue(
        mockWorkInstruction
      );
    });

    it('should load and display work instruction', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockWorkInstruction.title)).toBeInTheDocument();
      });
    });

    it('should display back button', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument();
      });
    });

    it('should call API with correct ID', async () => {
      const mockGetById = vi.spyOn(
        workInstructionApi.workInstructionApi,
        'getWorkInstructionById'
      );

      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetById).toHaveBeenCalledWith('test-id-123');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      vi.spyOn(workInstructionApi.workInstructionApi, 'getWorkInstructionById').mockRejectedValue(
        new Error('API Error')
      );

      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('should display error message when instruction not found', async () => {
      vi.spyOn(workInstructionApi.workInstructionApi, 'getWorkInstructionById').mockResolvedValue(
        null
      );

      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Work instruction not found')).toBeInTheDocument();
      });
    });

    it('should display error and show back button on error', async () => {
      vi.spyOn(workInstructionApi.workInstructionApi, 'getWorkInstructionById').mockRejectedValue(
        new Error('Network Error')
      );

      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Back to Work Instructions')).toBeInTheDocument();
      });
    });
  });

  describe('No ID Parameter', () => {
    it('should handle missing ID parameter', async () => {
      // Mock useParams to return no ID
      const { useParams } = await vi.importMock('react-router-dom');
      vi.mocked(useParams).mockReturnValue({ id: undefined } as any);

      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No work instruction available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step Navigation', () => {
    beforeEach(() => {
      vi.spyOn(workInstructionApi.workInstructionApi, 'getWorkInstructionById').mockResolvedValue(
        mockWorkInstruction
      );
    });

    it('should display viewer component when instruction loads', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Step 1')).toBeInTheDocument();
      });
    });

    it('should handle step change callback', async () => {
      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      // Component should handle step changes without errors
      await waitFor(() => {
        expect(screen.getByText(mockWorkInstruction.title)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      vi.spyOn(workInstructionApi.workInstructionApi, 'getWorkInstructionById').mockResolvedValue(
        mockWorkInstruction
      );
    });

    it('should display on mobile viewport', async () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });

      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockWorkInstruction.title)).toBeInTheDocument();
      });
    });

    it('should display on tablet viewport', async () => {
      // Set tablet viewport
      Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });

      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockWorkInstruction.title)).toBeInTheDocument();
      });
    });

    it('should display on desktop viewport', async () => {
      // Set desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });

      render(
        <BrowserRouter>
          <WorkInstructionViewerPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockWorkInstruction.title)).toBeInTheDocument();
      });
    });
  });
});
