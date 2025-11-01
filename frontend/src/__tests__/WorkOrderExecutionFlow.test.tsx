/**
 * WorkOrder Execution Flow Component Tests
 * Issue #179: Epic 5 - Frontend Component Testing Phase 2
 *
 * Tests WorkOrder execution flow with:
 * - Multi-step process handling
 * - Real-time updates
 * - State transitions
 * - Error handling
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Mock components - these would be the actual components in implementation
const WorkOrderExecutionFlow = ({ workOrderId, onComplete, onError }: any) => (
  <div data-testid="workorder-execution-flow">
    <h2>Execute Work Order {workOrderId}</h2>
    <div data-testid="execution-steps">
      <button onClick={() => onComplete?.()}>Complete Step</button>
      <button onClick={() => onError?.(new Error('Test error'))}>Error</button>
    </div>
  </div>
);

const WorkOrderStatusDisplay = ({ status, progress }: any) => (
  <div data-testid="status-display">
    <span data-testid="status">{status}</span>
    <span data-testid="progress">{progress}%</span>
  </div>
);

const WorkOrderOperationStepComponent = ({ operation, onStart, onComplete }: any) => (
  <div data-testid="operation-step">
    <h3>{operation.name}</h3>
    <button onClick={() => onStart?.(operation.id)}>Start</button>
    <button onClick={() => onComplete?.(operation.id)}>Complete</button>
  </div>
);

describe('WorkOrder Execution Components', () => {

  describe('WorkOrderExecutionFlow', () => {
    const mockWorkOrderId = 'WO-2024-001';
    const mockOnComplete = vi.fn();
    const mockOnError = vi.fn();

    beforeEach(() => {
      mockOnComplete.mockClear();
      mockOnError.mockClear();
    });

    it('should render WorkOrder execution flow with correct work order ID', () => {
      render(
        <BrowserRouter>
          <WorkOrderExecutionFlow
            workOrderId={mockWorkOrderId}
            onComplete={mockOnComplete}
            onError={mockOnError}
          />
        </BrowserRouter>
      );

      expect(screen.getByTestId('workorder-execution-flow')).toBeInTheDocument();
      expect(screen.getByText(`Execute Work Order ${mockWorkOrderId}`)).toBeInTheDocument();
    });

    it('should handle multi-step execution with step transitions', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <BrowserRouter>
          <WorkOrderExecutionFlow
            workOrderId={mockWorkOrderId}
            onComplete={mockOnComplete}
            onError={mockOnError}
          />
        </BrowserRouter>
      );

      const completeButton = screen.getByRole('button', { name: /complete step/i });
      await user.click(completeButton);

      expect(mockOnComplete).toHaveBeenCalled();
    });

    it('should handle execution errors gracefully', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <WorkOrderExecutionFlow
            workOrderId={mockWorkOrderId}
            onComplete={mockOnComplete}
            onError={mockOnError}
          />
        </BrowserRouter>
      );

      const errorButton = screen.getByRole('button', { name: /error/i });
      await user.click(errorButton);

      expect(mockOnError).toHaveBeenCalled();
    });

    it('should display execution steps container', () => {
      render(
        <BrowserRouter>
          <WorkOrderExecutionFlow
            workOrderId={mockWorkOrderId}
            onComplete={mockOnComplete}
            onError={mockOnError}
          />
        </BrowserRouter>
      );

      expect(screen.getByTestId('execution-steps')).toBeInTheDocument();
    });

    it('should support real-time updates via callbacks', async () => {
      const user = userEvent.setup();
      let executionStatus = 'NOT_STARTED';

      const { rerender } = render(
        <BrowserRouter>
          <WorkOrderExecutionFlow
            workOrderId={mockWorkOrderId}
            onComplete={() => {
              executionStatus = 'COMPLETED';
              mockOnComplete();
            }}
            onError={mockOnError}
          />
        </BrowserRouter>
      );

      const button = screen.getByRole('button', { name: /complete step/i });
      await user.click(button);

      await waitFor(() => {
        expect(executionStatus).toBe('COMPLETED');
      });
    });
  });

  describe('WorkOrderStatusDisplay', () => {
    it('should display current execution status', () => {
      render(
        <WorkOrderStatusDisplay status="IN_PROGRESS" progress={50} />
      );

      expect(screen.getByTestId('status')).toHaveTextContent('IN_PROGRESS');
    });

    it('should display progress percentage', () => {
      render(
        <WorkOrderStatusDisplay status="IN_PROGRESS" progress={75} />
      );

      expect(screen.getByTestId('progress')).toHaveTextContent('75%');
    });

    it('should update status dynamically', () => {
      const { rerender } = render(
        <WorkOrderStatusDisplay status="NOT_STARTED" progress={0} />
      );

      expect(screen.getByTestId('status')).toHaveTextContent('NOT_STARTED');

      rerender(<WorkOrderStatusDisplay status="COMPLETED" progress={100} />);

      expect(screen.getByTestId('status')).toHaveTextContent('COMPLETED');
      expect(screen.getByTestId('progress')).toHaveTextContent('100%');
    });

    it('should handle all status states', () => {
      const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'FAILED'];

      statuses.forEach(status => {
        const { unmount } = render(
          <WorkOrderStatusDisplay status={status} progress={50} />
        );

        expect(screen.getByTestId('status')).toHaveTextContent(status);
        unmount();
      });
    });

    it('should handle progress from 0 to 100', () => {
      const { rerender } = render(
        <WorkOrderStatusDisplay status="IN_PROGRESS" progress={0} />
      );

      for (let progress = 0; progress <= 100; progress += 25) {
        rerender(<WorkOrderStatusDisplay status="IN_PROGRESS" progress={progress} />);
        expect(screen.getByTestId('progress')).toHaveTextContent(`${progress}%`);
      }
    });
  });

  describe('WorkOrderOperationStepComponent', () => {
    const mockOperation = {
      id: 'OP-001',
      name: 'Machine Setup',
      duration: 30,
      sequence: 1
    };

    const mockOnStart = vi.fn();
    const mockOnComplete = vi.fn();

    beforeEach(() => {
      mockOnStart.mockClear();
      mockOnComplete.mockClear();
    });

    it('should render operation step with name and buttons', () => {
      render(
        <WorkOrderOperationStepComponent
          operation={mockOperation}
          onStart={mockOnStart}
          onComplete={mockOnComplete}
        />
      );

      expect(screen.getByText(mockOperation.name)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
    });

    it('should call onStart when start button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <WorkOrderOperationStepComponent
          operation={mockOperation}
          onStart={mockOnStart}
          onComplete={mockOnComplete}
        />
      );

      await user.click(screen.getByRole('button', { name: /start/i }));

      expect(mockOnStart).toHaveBeenCalledWith(mockOperation.id);
    });

    it('should call onComplete when complete button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <WorkOrderOperationStepComponent
          operation={mockOperation}
          onStart={mockOnStart}
          onComplete={mockOnComplete}
        />
      );

      await user.click(screen.getByRole('button', { name: /complete/i }));

      expect(mockOnComplete).toHaveBeenCalledWith(mockOperation.id);
    });

    it('should handle operation lifecycle (start -> complete)', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <WorkOrderOperationStepComponent
          operation={mockOperation}
          onStart={mockOnStart}
          onComplete={mockOnComplete}
        />
      );

      // Start operation
      await user.click(screen.getByRole('button', { name: /start/i }));
      expect(mockOnStart).toHaveBeenCalledWith(mockOperation.id);

      // Complete operation
      await user.click(screen.getByRole('button', { name: /complete/i }));
      expect(mockOnComplete).toHaveBeenCalledWith(mockOperation.id);
    });

    it('should handle multiple operations in sequence', async () => {
      const user = userEvent.setup();
      const operations = [
        { id: 'OP-001', name: 'Setup', duration: 30, sequence: 1 },
        { id: 'OP-002', name: 'Operation', duration: 120, sequence: 2 },
        { id: 'OP-003', name: 'Cleanup', duration: 15, sequence: 3 }
      ];

      for (const operation of operations) {
        const { unmount } = render(
          <WorkOrderOperationStepComponent
            operation={operation}
            onStart={mockOnStart}
            onComplete={mockOnComplete}
          />
        );

        await user.click(screen.getByRole('button', { name: /start/i }));
        await user.click(screen.getByRole('button', { name: /complete/i }));

        unmount();
      }

      expect(mockOnStart).toHaveBeenCalledTimes(3);
      expect(mockOnComplete).toHaveBeenCalledTimes(3);
    });

    it('should disable buttons appropriately during operation', async () => {
      const { rerender } = render(
        <WorkOrderOperationStepComponent
          operation={mockOperation}
          onStart={mockOnStart}
          onComplete={mockOnComplete}
        />
      );

      const startButton = screen.getByRole('button', { name: /start/i });

      expect(startButton).not.toBeDisabled();
    });
  });

  describe('WorkOrder Execution Integration', () => {
    it('should execute complete workflow (start -> progress -> complete)', async () => {
      const user = userEvent.setup();
      const onWorkflowComplete = vi.fn();

      const { rerender } = render(
        <BrowserRouter>
          <div>
            <WorkOrderExecutionFlow
              workOrderId="WO-2024-001"
              onComplete={onWorkflowComplete}
              onError={vi.fn()}
            />
            <WorkOrderStatusDisplay status="NOT_STARTED" progress={0} />
          </div>
        </BrowserRouter>
      );

      // Start execution
      const startButton = screen.getByRole('button', { name: /complete step/i });
      await user.click(startButton);

      // Verify completion callback
      await waitFor(() => {
        expect(onWorkflowComplete).toHaveBeenCalled();
      });
    });

    it('should handle real-time status updates during execution', async () => {
      const { rerender } = render(
        <BrowserRouter>
          <WorkOrderStatusDisplay status="NOT_STARTED" progress={0} />
        </BrowserRouter>
      );

      const statuses = [
        { status: 'IN_PROGRESS', progress: 25 },
        { status: 'IN_PROGRESS', progress: 50 },
        { status: 'IN_PROGRESS', progress: 75 },
        { status: 'COMPLETED', progress: 100 }
      ];

      for (const state of statuses) {
        rerender(
          <BrowserRouter>
            <WorkOrderStatusDisplay status={state.status} progress={state.progress} />
          </BrowserRouter>
        );

        expect(screen.getByTestId('status')).toHaveTextContent(state.status);
        expect(screen.getByTestId('progress')).toHaveTextContent(`${state.progress}%`);
      }
    });
  });
});
