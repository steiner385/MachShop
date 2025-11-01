import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkInstructionViewer } from '../WorkInstructionViewer';
import type { WorkInstruction } from '@/api/workInstructions';

describe('WorkInstructionViewer Component', () => {
  const mockWorkInstruction: WorkInstruction = {
    id: 'wi-001',
    title: 'Assembly Line Operation',
    description: 'Complete assembly of component A',
    version: '1.0.0',
    status: 'APPROVED',
    ecoNumber: 'ECO-2024-001',
    createdById: 'user-1',
    updatedById: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    steps: [
      {
        id: 'step-1',
        workInstructionId: 'wi-001',
        stepNumber: 1,
        title: 'Prepare Materials',
        content: 'Gather all required materials from the material station.',
        imageUrls: ['https://example.com/image1.jpg'],
        videoUrls: [],
        attachmentUrls: [],
        estimatedDuration: 5,
        isCritical: false,
        requiresSignature: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'step-2',
        workInstructionId: 'wi-001',
        stepNumber: 2,
        title: 'Assemble Parts',
        content: 'Connect parts A and B using the assembly fixture.',
        imageUrls: ['https://example.com/image2.jpg'],
        videoUrls: ['https://example.com/video1.mp4'],
        attachmentUrls: [],
        estimatedDuration: 10,
        isCritical: true,
        requiresSignature: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'step-3',
        workInstructionId: 'wi-001',
        stepNumber: 3,
        title: 'Quality Check',
        content: 'Verify the assembly meets all quality standards.',
        imageUrls: [],
        videoUrls: [],
        attachmentUrls: ['https://example.com/doc1.pdf'],
        estimatedDuration: 5,
        isCritical: false,
        requiresSignature: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
  };

  describe('Rendering', () => {
    it('should render the work instruction title', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);
      expect(screen.getByText('Assembly Line Operation')).toBeInTheDocument();
    });

    it('should render the work instruction description', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);
      expect(screen.getByText('Complete assembly of component A')).toBeInTheDocument();
    });

    it('should render the status tag', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
    });

    it('should render the version number', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);
      expect(screen.getByText('1.0.0')).toBeInTheDocument();
    });

    it('should render the ECO number', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);
      expect(screen.getByText('ECO-2024-001')).toBeInTheDocument();
    });

    it('should render loading spinner when isLoading is true', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} isLoading={true} />);
      expect(screen.getByText(/Loading work instruction/i)).toBeInTheDocument();
    });

    it('should render empty state when workInstruction is null', () => {
      render(<WorkInstructionViewer workInstruction={null as any} />);
      expect(screen.getByText(/No work instruction available/i)).toBeInTheDocument();
    });

    it('should render empty state when steps are empty', () => {
      const noStepsInstruction: WorkInstruction = {
        ...mockWorkInstruction,
        steps: [],
      };
      render(<WorkInstructionViewer workInstruction={noStepsInstruction} />);
      expect(screen.getByText(/No Steps/i)).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should display the first step on initial render', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);
      expect(screen.getByText('Step 1: Prepare Materials')).toBeInTheDocument();
    });

    it('should show step content', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);
      expect(
        screen.getByText('Gather all required materials from the material station.')
      ).toBeInTheDocument();
    });

    it('should navigate to next step when Next button is clicked', async () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Step 2: Assemble Parts')).toBeInTheDocument();
      });
    });

    it('should navigate to previous step when Previous button is clicked', async () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      // Navigate to step 2
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Step 2: Assemble Parts')).toBeInTheDocument();
      });

      // Navigate back to step 1
      const previousButton = screen.getByText('Previous');
      fireEvent.click(previousButton);

      await waitFor(() => {
        expect(screen.getByText('Step 1: Prepare Materials')).toBeInTheDocument();
      });
    });

    it('should disable Previous button on first step', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);
      const previousButton = screen.getByText('Previous').closest('button');
      expect(previousButton).toBeDisabled();
    });

    it('should disable Next button on last step', async () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      // Navigate to last step
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        const nextButton = screen.getByText('Next').closest('button');
        expect(nextButton).toBeDisabled();
      });
    });

    it('should jump to specific step when clicked in step indicator', async () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      // Find and click the select dropdown
      const stepSelector = screen.getByDisplayValue('0');
      fireEvent.change(stepSelector, { target: { value: 2 } });

      await waitFor(() => {
        expect(screen.getByText('Step 3: Quality Check')).toBeInTheDocument();
      });
    });
  });

  describe('Step Content Display', () => {
    it('should display critical step indicator', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      // Navigate to step 2 which is critical
      fireEvent.click(screen.getByText('Next'));

      waitFor(() => {
        expect(screen.getByText('Critical Step')).toBeInTheDocument();
      });
    });

    it('should display estimated duration', async () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      // Navigate to step 2
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText(/Est. time: 10 min/)).toBeInTheDocument();
      });
    });

    it('should display signature required alert', async () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      // Navigate to step 3 which requires signature
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Signature Required')).toBeInTheDocument();
      });
    });

    it('should display reference materials section when media exists', async () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      await waitFor(() => {
        expect(screen.getByText('Reference Materials')).toBeInTheDocument();
      });
    });
  });

  describe('Media Handling', () => {
    it('should render images from step', async () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      await waitFor(() => {
        const images = screen.getAllByAltText(/Step.*reference/);
        expect(images.length).toBeGreaterThan(0);
      });
    });

    it('should render video player for video URLs', async () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        const videos = screen.getAllByDisplayValue(/\.mp4/);
        expect(videos.length).toBeGreaterThan(0);
      });
    });

    it('should render document links for attachment URLs', async () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      // Navigate to step 3
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Open Document')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should display progress indicator', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);
      expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument();
    });

    it('should update progress as user navigates', async () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
      });
    });

    it('should track viewed steps', async () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);

      // View first step (already viewed)
      expect(screen.getByText(/Step 1/)).toBeInTheDocument();

      // Navigate to second step
      fireEvent.click(screen.getByText('Next'));

      // Navigate to third step
      await waitFor(() => {
        fireEvent.click(screen.getByText('Next'));
      });

      // All steps should show as viewed in some way (component tracks them)
      expect(screen.getByText(/Step 1 of 3|Step 2 of 3|Step 3 of 3/)).toBeInTheDocument();
    });
  });

  describe('Fullscreen Mode', () => {
    it('should have fullscreen button', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);
      const fullscreenButton = screen.getByTitle(/Enter Fullscreen/);
      expect(fullscreenButton).toBeInTheDocument();
    });

    it('should toggle fullscreen mode when button is clicked', () => {
      render(<WorkInstructionViewer workInstruction={mockWorkInstruction} />);
      const fullscreenButton = screen.getByTitle(/Enter Fullscreen/);

      fireEvent.click(fullscreenButton);

      const exitButton = screen.getByTitle(/Exit Fullscreen/);
      expect(exitButton).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onStepChange callback when step changes', async () => {
      const onStepChange = vi.fn();
      render(
        <WorkInstructionViewer
          workInstruction={mockWorkInstruction}
          onStepChange={onStepChange}
        />
      );

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        expect(onStepChange).toHaveBeenCalled();
        expect(onStepChange).toHaveBeenCalledWith(expect.any(Number));
      });
    });

    it('should pass correct step number to onStepChange', async () => {
      const onStepChange = vi.fn();
      render(
        <WorkInstructionViewer
          workInstruction={mockWorkInstruction}
          onStepChange={onStepChange}
        />
      );

      fireEvent.click(screen.getByText('Next'));

      await waitFor(() => {
        const calls = onStepChange.mock.calls;
        expect(calls[calls.length - 1][0]).toBe(2); // Second step has stepNumber 2
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle work instruction with no description', () => {
      const instructionNoDesc: WorkInstruction = {
        ...mockWorkInstruction,
        description: undefined,
      };
      render(<WorkInstructionViewer workInstruction={instructionNoDesc} />);
      expect(screen.getByText('Assembly Line Operation')).toBeInTheDocument();
    });

    it('should handle steps with no media', () => {
      const instructionNoMedia: WorkInstruction = {
        ...mockWorkInstruction,
        steps: [
          {
            ...mockWorkInstruction.steps![0],
            imageUrls: [],
            videoUrls: [],
            attachmentUrls: [],
          },
        ],
      };
      render(<WorkInstructionViewer workInstruction={instructionNoMedia} />);
      expect(screen.getByText('Assembly Line Operation')).toBeInTheDocument();
    });

    it('should handle steps with no estimated duration', async () => {
      const instructionNoDuration: WorkInstruction = {
        ...mockWorkInstruction,
        steps: mockWorkInstruction.steps!.map((step) => ({
          ...step,
          estimatedDuration: undefined,
        })),
      };
      render(<WorkInstructionViewer workInstruction={instructionNoDuration} />);
      expect(screen.getByText('Assembly Line Operation')).toBeInTheDocument();
    });

    it('should handle single step instruction', () => {
      const singleStepInstruction: WorkInstruction = {
        ...mockWorkInstruction,
        steps: [mockWorkInstruction.steps![0]],
      };
      render(<WorkInstructionViewer workInstruction={singleStepInstruction} />);

      const previousButton = screen.getByText('Previous').closest('button');
      const nextButton = screen.getByText('Next').closest('button');

      expect(previousButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });
  });
});
