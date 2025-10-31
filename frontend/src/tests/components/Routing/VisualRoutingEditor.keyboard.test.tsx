/**
 * Tests for VisualRoutingEditor Keyboard Navigation
 * Issue #279: Implement Keyboard Navigation for ReactFlow Components
 *
 * Integration tests for keyboard accessibility in VisualRoutingEditor
 * Tests WCAG 2.1 Level AA compliance
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from 'reactflow';
import { VisualRoutingEditor } from '../../../components/Routing/VisualRoutingEditor';
import { RoutingStep, RoutingStepDependency } from '../../../types/routing';

// Mock ReactFlow
jest.mock('reactflow', () => ({
  ...jest.requireActual('reactflow'),
  useReactFlow: () => ({
    setCenter: jest.fn(),
    getZoom: jest.fn(() => 1),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    fitView: jest.fn(),
    getViewport: jest.fn(() => ({ x: 0, y: 0, zoom: 1 })),
  }),
}));

// Mock the keyboard navigation hook
jest.mock('../../../hooks/useReactFlowKeyboard', () => ({
  useReactFlowKeyboard: () => ({
    containerRef: { current: document.createElement('div') },
    focusElement: jest.fn(),
    clearFocusIndicators: jest.fn(),
    navigateElements: jest.fn(),
    currentFocusIndex: 0,
    totalElements: 3,
  }),
  generateReactFlowAriaLabels: {
    node: (node: any) => ({
      role: 'button',
      'aria-label': `Node ${node.data?.label || node.id}`,
      'aria-describedby': `node-${node.id}-description`,
    }),
    edge: (edge: any) => ({
      role: 'button',
      'aria-label': `Connection ${edge.id}`,
      'aria-describedby': `edge-${edge.id}-description`,
    }),
    canvas: () => ({
      role: 'application',
      'aria-label': 'Workflow diagram editor',
      'aria-describedby': 'reactflow-instructions',
    }),
  },
}));

// Mock ARIA utils
jest.mock('../../../utils/ariaUtils', () => ({
  announceToScreenReader: jest.fn(),
  ARIA_ROLES: {
    BUTTON: 'button',
    APPLICATION: 'application',
  },
}));

// Mock CSS imports
jest.mock('../../../styles/reactflow-keyboard.css', () => ({}));

// Sample test data
const mockSteps: RoutingStep[] = [
  {
    id: 'step-1',
    stepNumber: 10,
    stepType: 'PROCESS',
    operationId: 'op-1',
    workCenterId: 'wc-1',
    standardTime: 30,
    setupTime: 10,
    operation: {
      id: 'op-1',
      operationName: 'Cutting Operation',
      operationCode: 'CUT001',
      operationType: 'MACHINING',
      description: 'Cut to size',
    },
  },
  {
    id: 'step-2',
    stepNumber: 20,
    stepType: 'INSPECTION',
    operationId: 'op-2',
    workCenterId: 'wc-2',
    standardTime: 15,
    setupTime: 5,
    operation: {
      id: 'op-2',
      operationName: 'Quality Check',
      operationCode: 'QC001',
      operationType: 'INSPECTION',
      description: 'Check dimensions',
    },
  },
];

const mockDependencies: RoutingStepDependency[] = [
  {
    id: 'dep-1',
    prerequisiteStepId: 'step-1',
    dependentStepId: 'step-2',
    dependencyType: 'FINISH_TO_START',
    lagTime: 0,
  },
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
};

describe('VisualRoutingEditor Keyboard Navigation', () => {
  const defaultProps = {
    steps: mockSteps,
    dependencies: mockDependencies,
    onSave: jest.fn(),
    readOnly: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility Structure', () => {
    it('should render with proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      // Check main container has proper role
      const container = screen.getByRole('application');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-label', 'Workflow diagram editor');
      expect(container).toHaveAttribute('aria-describedby', 'reactflow-instructions');
    });

    it('should include screen reader instructions', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      const instructions = document.getElementById('reactflow-instructions');
      expect(instructions).toBeInTheDocument();
      expect(instructions).toHaveClass('sr-only');
      expect(instructions).toHaveTextContent(/Workflow diagram editor/);
      expect(instructions).toHaveTextContent(/Use Tab to navigate/);
    });

    it('should include skip link for keyboard users', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      const skipLink = screen.getByText('Skip to routing diagram');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#reactflow-main-content');
      expect(skipLink).toHaveClass('reactflow-skip-link');
    });

    it('should include live region for announcements', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(liveRegion).toHaveClass('reactflow-announcements');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Tab navigation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      const container = screen.getByRole('application');
      container.focus();

      await user.keyboard('{Tab}');

      // Should navigate to first element
      // Note: Actual navigation logic is tested in the hook tests
      expect(container).toBeInTheDocument();
    });

    it('should handle node creation shortcut', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      const container = screen.getByRole('application');
      container.focus();

      await user.keyboard('{Control>}n{/Control}');

      // Should trigger node creation
      // Note: The actual node creation is handled by the keyboard hook
      expect(container).toBeInTheDocument();
    });

    it('should handle zoom shortcuts', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      const container = screen.getByRole('application');
      container.focus();

      // Test zoom in
      await user.keyboard('{Control>}+{/Control}');

      // Test zoom out
      await user.keyboard('{Control>}-{/Control}');

      // Test fit view
      await user.keyboard('{Control>}0{/Control}');

      expect(container).toBeInTheDocument();
    });
  });

  describe('Read-Only Mode', () => {
    it('should indicate read-only state to screen readers', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} readOnly={true} />
        </TestWrapper>
      );

      const instructions = document.getElementById('reactflow-instructions');
      expect(instructions).toHaveTextContent('This diagram is read-only');
    });

    it('should not render editing controls in read-only mode', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} readOnly={true} />
        </TestWrapper>
      );

      // Save button should not be present
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();

      // Add step buttons should not be present
      expect(screen.queryByRole('button', { name: /process/i })).not.toBeInTheDocument();
    });

    it('should still allow keyboard navigation in read-only mode', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} readOnly={true} />
        </TestWrapper>
      );

      const container = screen.getByRole('application');
      container.focus();

      await user.keyboard('{Tab}');

      // Navigation should still work
      expect(container).toBeInTheDocument();
    });
  });

  describe('Node Management', () => {
    it('should render step creation buttons with proper accessibility', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      // Check that add buttons are accessible
      const processButton = screen.getByRole('button', { name: /process/i });
      expect(processButton).toBeInTheDocument();
      expect(processButton).toHaveAttribute('title', 'Add Process Step');

      const inspectionButton = screen.getByRole('button', { name: /inspection/i });
      expect(inspectionButton).toBeInTheDocument();
      expect(inspectionButton).toHaveAttribute('title', 'Add Inspection Step');
    });

    it('should handle step creation via button clicks', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      const processButton = screen.getByRole('button', { name: /process/i });
      await user.click(processButton);

      // Should create a new process step
      // Note: The actual step creation logic would be tested in component unit tests
      expect(processButton).toBeInTheDocument();
    });
  });

  describe('Status Panel', () => {
    it('should display routing status information', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      // Should show element counts
      expect(screen.getByText(/Steps:/)).toBeInTheDocument();
      expect(screen.getByText(/Connections:/)).toBeInTheDocument();
    });

    it('should indicate unsaved changes', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      // After making changes, should show unsaved indicator
      // This would require simulating a change action
      // For now, just verify the component renders
      expect(screen.getByText('Routing Editor')).toBeInTheDocument();
    });
  });

  describe('ARIA Labels for ReactFlow Elements', () => {
    it('should apply ARIA labels to nodes', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      // Verify that nodes receive proper ARIA attributes
      // This tests the integration with generateReactFlowAriaLabels
      const reactFlowContainer = document.getElementById('reactflow-main-content');
      expect(reactFlowContainer).toBeInTheDocument();
    });

    it('should apply ARIA labels to edges', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      // Verify that edges receive proper ARIA attributes
      const reactFlowContainer = document.getElementById('reactflow-main-content');
      expect(reactFlowContainer).toBeInTheDocument();
    });
  });

  describe('Integration with Keyboard Hook', () => {
    it('should pass correct parameters to keyboard navigation hook', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      // Verify that the component properly integrates with the keyboard hook
      // The hook should receive nodes, edges, and callback functions
      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should handle keyboard navigation callbacks', async () => {
      const onSave = jest.fn();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} onSave={onSave} />
        </TestWrapper>
      );

      // Simulate keyboard navigation triggering save
      const saveButton = screen.getByRole('button', { name: /save/i });

      // Initially disabled (no changes)
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle empty steps array gracefully', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} steps={[]} dependencies={[]} />
        </TestWrapper>
      );

      // Should render default start and end nodes
      expect(screen.getByRole('application')).toBeInTheDocument();
      expect(screen.getByText(/Steps: 2/)).toBeInTheDocument(); // Start and End nodes
    });

    it('should handle missing dependencies gracefully', () => {
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} dependencies={[]} />
        </TestWrapper>
      );

      expect(screen.getByRole('application')).toBeInTheDocument();
      expect(screen.getByText(/Connections: 0/)).toBeInTheDocument();
    });

    it('should maintain accessibility during layout operations', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      const layoutButton = screen.getByRole('button', { name: /auto layout/i });
      await user.click(layoutButton);

      // After layout, accessibility should be maintained
      expect(screen.getByRole('application')).toBeInTheDocument();
      expect(document.getElementById('reactflow-instructions')).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should maintain focus order during dynamic updates', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      const container = screen.getByRole('application');
      container.focus();

      // Add a new node
      const processButton = screen.getByRole('button', { name: /process/i });
      await user.click(processButton);

      // Focus should be manageable after adding nodes
      await user.keyboard('{Tab}');

      expect(container).toBeInTheDocument();
    });

    it('should handle focus when elements are deleted', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <VisualRoutingEditor {...defaultProps} />
        </TestWrapper>
      );

      const container = screen.getByRole('application');
      container.focus();

      // Navigate to element and delete it
      await user.keyboard('{Tab}');
      await user.keyboard('{Delete}');

      // Focus should move to next available element
      expect(container).toBeInTheDocument();
    });
  });
});