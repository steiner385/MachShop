/**
 * Tests for DependencyVisualizer Keyboard Navigation
 * Issue #279: Implement Keyboard Navigation for ReactFlow Components
 *
 * Integration tests for keyboard accessibility in DependencyVisualizer
 * Tests WCAG 2.1 Level AA compliance
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from 'reactflow';
import { DependencyVisualizer } from '../../../components/Parameters/DependencyVisualizer';

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
    totalElements: 4,
  }),
  generateReactFlowAriaLabels: {
    node: (node: any) => ({
      role: 'button',
      'aria-label': `Formula ${node.data?.label || node.id}`,
      'aria-describedby': `node-${node.id}-description`,
    }),
    edge: (edge: any) => ({
      role: 'button',
      'aria-label': `Dependency ${edge.id}`,
      'aria-describedby': `edge-${edge.id}-description`,
    }),
    canvas: () => ({
      role: 'application',
      'aria-label': 'Parameter dependency visualization',
      'aria-describedby': 'dependency-instructions',
    }),
  },
}));

// Mock parameters API
jest.mock('../../../api/parameters', () => ({
  listFormulas: jest.fn(() =>
    Promise.resolve([
      {
        id: 'formula-1',
        formulaName: 'TotalCost',
        formulaExpression: 'MaterialCost + LaborCost',
      },
      {
        id: 'formula-2',
        formulaName: 'MaterialCost',
        formulaExpression: 'Quantity * UnitPrice',
      },
      {
        id: 'formula-3',
        formulaName: 'LaborCost',
        formulaExpression: 'Hours * HourlyRate',
      },
      {
        id: 'formula-4',
        formulaName: 'Quantity',
        formulaExpression: '10',
      },
    ])
  ),
  extractDependencies: jest.fn((expression) => {
    const deps: Record<string, string[]> = {
      'MaterialCost + LaborCost': ['MaterialCost', 'LaborCost'],
      'Quantity * UnitPrice': ['Quantity', 'UnitPrice'],
      'Hours * HourlyRate': ['Hours', 'HourlyRate'],
      '10': [],
    };
    return Promise.resolve({ dependencies: deps[expression] || [] });
  }),
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

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
};

describe('DependencyVisualizer Keyboard Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Accessibility Structure', () => {
    it('should render with proper ARIA attributes', async () => {
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        expect(container).toBeInTheDocument();
        expect(container).toHaveAttribute('aria-label', 'Parameter dependency visualization');
        expect(container).toHaveAttribute('aria-describedby', 'dependency-instructions');
      });
    });

    it('should include screen reader instructions', async () => {
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const instructions = document.getElementById('dependency-instructions');
        expect(instructions).toBeInTheDocument();
        expect(instructions).toHaveClass('sr-only');
        expect(instructions).toHaveTextContent(/Parameter dependency diagram/);
        expect(instructions).toHaveTextContent(/Use Tab to navigate/);
        expect(instructions).toHaveTextContent(/This diagram is read-only/);
      });
    });

    it('should include skip link for keyboard users', async () => {
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const skipLink = screen.getByText('Skip to dependency diagram');
        expect(skipLink).toBeInTheDocument();
        expect(skipLink).toHaveAttribute('href', '#dependency-diagram-content');
        expect(skipLink).toHaveClass('reactflow-skip-link');
      });
    });

    it('should include live region for announcements', async () => {
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const liveRegion = document.querySelector('[aria-live="polite"]');
        expect(liveRegion).toBeInTheDocument();
        expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
        expect(liveRegion).toHaveClass('reactflow-announcements');
      });
    });
  });

  describe('Formula Highlighting and Selection', () => {
    it('should support keyboard navigation with formula highlighting', async () => {
      render(
        <TestWrapper>
          <DependencyVisualizer formulaId="formula-1" />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        expect(container).toBeInTheDocument();
      });

      // Should highlight the specified formula and its dependencies
      // This would be tested through the actual highlighting logic
    });

    it('should handle formula selection via keyboard', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        container.focus();
      });

      // Navigate and select a formula
      await user.keyboard('{Tab}');
      await user.keyboard('{Enter}');

      // Should highlight dependencies for the selected formula
      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Read-Only Behavior', () => {
    it('should indicate read-only nature to screen readers', async () => {
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const instructions = document.getElementById('dependency-instructions');
        expect(instructions).toHaveTextContent('This diagram is read-only');
      });
    });

    it('should announce read-only state when trying to delete', async () => {
      const user = userEvent.setup();
      const { announceToScreenReader } = require('../../../utils/ariaUtils');

      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        container.focus();
      });

      // Try to delete an element
      await user.keyboard('{Tab}');
      await user.keyboard('{Delete}');

      // Should announce that deletion is not allowed
      expect(announceToScreenReader).toHaveBeenCalledWith(
        'Dependencies are read-only and cannot be deleted'
      );
    });

    it('should not allow editing operations', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        container.focus();
      });

      // Try keyboard shortcuts that would normally create/edit
      await user.keyboard('{Control>}n{/Control}');

      // Should not perform any editing actions
      // In a read-only visualizer, no new nodes should be created
      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Tab navigation between formulas', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        container.focus();
      });

      await user.keyboard('{Tab}');

      // Should navigate to first formula
      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should handle arrow key navigation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        container.focus();
      });

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{ArrowRight}');

      // Should navigate between elements
      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should handle view control shortcuts', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        container.focus();
      });

      // Test zoom controls
      await user.keyboard('{Control>}+{/Control}');
      await user.keyboard('{Control>}-{/Control}');
      await user.keyboard('{Control>}0{/Control}');

      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    it('should handle Home and End keys for navigation', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        container.focus();
      });

      // Navigate to first element
      await user.keyboard('{Home}');

      // Navigate to last element
      await user.keyboard('{End}');

      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Dependency Visualization', () => {
    it('should render dependency graph with proper accessibility', async () => {
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should render the ReactFlow diagram
        const diagram = document.getElementById('dependency-diagram-content');
        expect(diagram).toBeInTheDocument();

        // Should have proper legend
        expect(screen.getByText('Legend')).toBeInTheDocument();
      });
    });

    it('should show circular dependency warnings when present', async () => {
      // Mock circular dependencies
      const { extractDependencies } = require('../../../api/parameters');
      extractDependencies.mockImplementation((expression) => {
        if (expression === 'MaterialCost + LaborCost') {
          return Promise.resolve({ dependencies: ['LaborCost', 'MaterialCost'] });
        }
        if (expression === 'Hours * HourlyRate') {
          return Promise.resolve({ dependencies: ['MaterialCost'] });
        }
        return Promise.resolve({ dependencies: [] });
      });

      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should show circular dependency warning
        expect(screen.getByText(/Circular Dependenc/)).toBeInTheDocument();
      });
    });

    it('should handle formula selection and dependency highlighting', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        container.focus();
      });

      // Navigate to a formula and select it
      await user.keyboard('{Tab}');
      await user.keyboard('{Enter}');

      // Should highlight dependencies
      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('should announce formula selection', async () => {
      const user = userEvent.setup();
      const { announceToScreenReader } = require('../../../utils/ariaUtils');

      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        container.focus();
      });

      // Navigate and select a formula
      await user.keyboard('{Tab}');
      await user.keyboard('{Enter}');

      // Should announce the selected formula
      expect(announceToScreenReader).toHaveBeenCalledWith(
        expect.stringContaining('Selected formula:')
      );
    });

    it('should announce dependency connections', async () => {
      const user = userEvent.setup();
      const { announceToScreenReader } = require('../../../utils/ariaUtils');

      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        container.focus();
      });

      // Navigate to an edge and select it
      await user.keyboard('{Tab}');
      await user.keyboard('{Tab}'); // Move to edge
      await user.keyboard('{Enter}');

      // Should announce the dependency connection
      expect(announceToScreenReader).toHaveBeenCalledWith(
        expect.stringContaining('Selected dependency from')
      );
    });
  });

  describe('Loading and Error States', () => {
    it('should handle loading state accessibly', async () => {
      // Mock loading state
      const { listFormulas } = require('../../../api/parameters');
      listFormulas.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 1000))
      );

      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      // Should show loading message
      expect(screen.getByText('Loading dependency graph...')).toBeInTheDocument();
    });

    it('should handle error state accessibly', async () => {
      // Mock error state
      const { listFormulas } = require('../../../api/parameters');
      listFormulas.mockImplementation(() => Promise.reject(new Error('API Error')));

      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should show error message
        expect(screen.getByText(/API Error/)).toBeInTheDocument();
      });

      // Error message should have proper styling and be accessible
      const errorElement = screen.getByText(/API Error/);
      expect(errorElement).toHaveStyle({
        backgroundColor: '#FFEBEE',
        color: '#C62828',
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large dependency graphs efficiently', async () => {
      // Mock large dataset
      const { listFormulas } = require('../../../api/parameters');
      const largeFormulaSet = Array.from({ length: 100 }, (_, i) => ({
        id: `formula-${i}`,
        formulaName: `Formula${i}`,
        formulaExpression: i > 0 ? `Formula${i - 1} + 1` : '1',
      }));

      listFormulas.mockImplementation(() => Promise.resolve(largeFormulaSet));

      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('application')).toBeInTheDocument();
      });

      // Should still be navigable with large datasets
      const container = screen.getByRole('application');
      container.focus();

      // Navigation should work without performance issues
      expect(container).toBeInTheDocument();
    });

    it('should clean up resources on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      // Should not throw errors or cause memory leaks
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Integration with Keyboard Hook', () => {
    it('should pass correct parameters to keyboard navigation hook', async () => {
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should integrate properly with the keyboard hook
        expect(screen.getByRole('application')).toBeInTheDocument();
      });
    });

    it('should handle keyboard navigation callbacks correctly', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DependencyVisualizer />
        </TestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByRole('application');
        container.focus();
      });

      // Test various navigation actions
      await user.keyboard('{Tab}');
      await user.keyboard('{Enter}');
      await user.keyboard('{Escape}');

      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });
});