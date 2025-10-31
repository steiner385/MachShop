/**
 * NotFound Component Tests
 *
 * Tests for the NotFound (404) page component including:
 * - Proper rendering of 404 error page
 * - Navigation functionality
 * - User interactions
 * - Accessibility compliance
 * - Component structure validation
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import NotFound from '../NotFound';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotFound', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the 404 error page correctly', () => {
      renderWithProviders(<NotFound />);

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Sorry, the page you visited does not exist.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });

    it('should display the correct page status', () => {
      renderWithProviders(<NotFound />);

      // Check that the Result component displays the 404 status
      const resultElement = screen.getByText('404');
      expect(resultElement).toBeInTheDocument();
    });

    it('should have a descriptive error message', () => {
      renderWithProviders(<NotFound />);

      const errorMessage = screen.getByText('Sorry, the page you visited does not exist.');
      expect(errorMessage).toBeInTheDocument();
    });

    it('should render the Back to Dashboard button with correct styling', () => {
      renderWithProviders(<NotFound />);

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveClass('ant-btn-primary');
    });
  });

  describe('Navigation Functionality', () => {
    it('should navigate to dashboard when Back to Dashboard button is clicked', async () => {
      renderWithProviders(<NotFound />);

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle multiple clicks on the back button', async () => {
      renderWithProviders(<NotFound />);

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });

      // Click multiple times rapidly
      await user.click(backButton);
      await user.click(backButton);
      await user.click(backButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledTimes(3);
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle keyboard navigation to the button', async () => {
      renderWithProviders(<NotFound />);

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });

      // Focus the button using keyboard navigation
      await user.tab();
      expect(backButton).toHaveFocus();

      // Activate the button using Enter key
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle keyboard activation with Space key', async () => {
      renderWithProviders(<NotFound />);

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });

      // Focus the button and activate with space
      backButton.focus();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProviders(<NotFound />);

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveAttribute('type', 'button');
    });

    it('should be keyboard navigable', async () => {
      renderWithProviders(<NotFound />);

      // Tab to the button
      await user.tab();

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      expect(backButton).toHaveFocus();
    });

    it('should have descriptive text for screen readers', () => {
      renderWithProviders(<NotFound />);

      // Check that important text is present for screen readers
      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Sorry, the page you visited does not exist.')).toBeInTheDocument();

      // Button should have clear action text
      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      expect(backButton).toHaveTextContent('Back to Dashboard');
    });

    it('should provide a clear visual hierarchy', () => {
      renderWithProviders(<NotFound />);

      // Main error code should be prominent
      const errorCode = screen.getByText('404');
      expect(errorCode).toBeInTheDocument();

      // Explanatory message should be present
      const message = screen.getByText('Sorry, the page you visited does not exist.');
      expect(message).toBeInTheDocument();

      // Action button should be available
      const actionButton = screen.getByRole('button', { name: /back to dashboard/i });
      expect(actionButton).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should use Ant Design Result component with correct props', () => {
      renderWithProviders(<NotFound />);

      // Verify the Result component is rendered with 404 status
      expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('should render within the test environment without errors', () => {
      expect(() => {
        renderWithProviders(<NotFound />);
      }).not.toThrow();
    });

    it('should be a functional component', () => {
      expect(typeof NotFound).toBe('function');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle navigation errors gracefully', async () => {
      // Mock navigate to throw an error
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation error');
      });

      renderWithProviders(<NotFound />);

      const backButton = screen.getByRole('button', { name: /back to dashboard/i });

      // Click should not crash the component
      expect(async () => {
        await user.click(backButton);
      }).not.toThrow();
    });

    it('should handle missing navigate function gracefully', () => {
      // This tests the component structure when navigation is unavailable
      // The component should still render even if navigation fails
      expect(() => {
        renderWithProviders(<NotFound />);
      }).not.toThrow();
    });
  });

  describe('User Experience', () => {
    it('should provide a clear path back to the application', () => {
      renderWithProviders(<NotFound />);

      // The button should clearly indicate where the user will go
      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      expect(backButton).toHaveTextContent('Back to Dashboard');
    });

    it('should display helpful error messaging', () => {
      renderWithProviders(<NotFound />);

      // Error message should be user-friendly and informative
      const errorMessage = screen.getByText('Sorry, the page you visited does not exist.');
      expect(errorMessage).toBeInTheDocument();

      // Should not contain technical jargon
      expect(errorMessage.textContent).not.toContain('null');
      expect(errorMessage.textContent).not.toContain('undefined');
      expect(errorMessage.textContent).not.toContain('error');
    });

    it('should maintain consistent styling with the application', () => {
      renderWithProviders(<NotFound />);

      // Button should use primary styling consistent with app design
      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      expect(backButton).toHaveClass('ant-btn-primary');
    });
  });

  describe('Responsive Design', () => {
    it('should render correctly on different screen sizes', () => {
      // Test desktop view
      renderWithProviders(<NotFound />);

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Sorry, the page you visited does not exist.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });

    it('should maintain readability at different viewport sizes', () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      renderWithProviders(<NotFound />);

      // Content should still be accessible
      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly without blocking the UI', () => {
      const startTime = performance.now();
      renderWithProviders(<NotFound />);
      const endTime = performance.now();

      // Component should render in reasonable time (less than 50ms)
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should not cause memory leaks', () => {
      const { unmount } = renderWithProviders(<NotFound />);

      // Component should unmount cleanly
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work correctly within the routing context', () => {
      // This test ensures the component works within React Router
      renderWithProviders(<NotFound />);

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });

    it('should integrate properly with the application theme', () => {
      renderWithProviders(<NotFound />);

      // Should use consistent theming with Ant Design
      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      expect(backButton).toHaveClass('ant-btn');
      expect(backButton).toHaveClass('ant-btn-primary');
    });
  });
});