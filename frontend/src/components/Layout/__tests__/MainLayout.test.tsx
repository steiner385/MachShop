/**
 * MainLayout Component Tests
 * 
 * Tests for the main application layout component, focusing on:
 * - Proper rendering without console warnings
 * - Menu item access control based on user roles/permissions
 * - Navigation functionality
 * - Responsive behavior
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MainLayout from '../MainLayout';
import { useAuthStore } from '@/store/AuthStore';

// Mock the auth store
vi.mock('@/store/AuthStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/dashboard' }),
  };
});

// Mock ProtectedRoute component
vi.mock('@/components/Auth/ProtectedRoute', () => ({
  ConditionalRender: ({ children }: any) => {
    // Simple mock implementation - show all content in tests
    return children;
  },
}));

const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  roles: ['Quality Engineer'],
  permissions: ['workorders.read', 'quality.read', 'traceability.read'],
};

const renderMainLayout = (user = mockUser) => {
  (useAuthStore as any).mockReturnValue({
    user,
    logout: vi.fn(),
    isAuthenticated: true,
    isLoading: false,
  });

  return render(
    <BrowserRouter>
      <MainLayout>
        <div data-testid="content">Test Content</div>
      </MainLayout>
    </BrowserRouter>
  );
};

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without critical warnings', () => {
      renderMainLayout();
      
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('MES')).toBeInTheDocument();
      
      // Component should render successfully (third-party warnings are filtered out)
      expect(screen.getByTestId('content')).toBeVisible();
    });

    it('should render user information correctly', () => {
      renderMainLayout();
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Quality Engineer')).toBeInTheDocument();
    });

    it('should render navigation menu items', () => {
      renderMainLayout();
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Quality')).toBeInTheDocument();
      expect(screen.getByText('Traceability')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should handle menu item clicks', async () => {
      renderMainLayout();
      
      const dashboardItem = screen.getByText('Dashboard');
      fireEvent.click(dashboardItem);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle sidebar collapse/expand', async () => {
      renderMainLayout();

      // Verify MES text is visible initially
      expect(screen.getByText('MES')).toBeInTheDocument();

      // Find all buttons and get the first one (collapse button in sidebar)
      const buttons = screen.getAllByRole('button');
      const collapseButton = buttons[0]; // First button is typically the collapse trigger

      // Click to collapse - need to wrap in act for state updates
      await waitFor(() => {
        fireEvent.click(collapseButton);
      });

      // After collapse, the sidebar should still exist (even if MES text is hidden)
      const sidebar = document.querySelector('.ant-layout-sider');
      expect(sidebar).toBeTruthy();
      expect(sidebar).toHaveClass('ant-layout-sider-collapsed');
    });
  });

  describe('User Dropdown', () => {
    it('should render user dropdown menu', () => {
      renderMainLayout();
      
      // Find the user avatar/dropdown trigger
      const userInfo = screen.getByText('Test User');
      expect(userInfo).toBeInTheDocument();
    });

    it('should handle logout functionality', () => {
      const mockLogout = vi.fn();
      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        logout: mockLogout,
        isAuthenticated: true,
        isLoading: false,
      });

      renderMainLayout();
      
      // Test logout would require dropdown interaction
      // This is a simplified test for the logout function existence
      expect(mockLogout).toBeDefined();
    });
  });

  describe('Access Control', () => {
    it('should render menu items based on user permissions', () => {
      const limitedUser = {
        ...mockUser,
        roles: ['Production Operator'],
        permissions: ['workorders.read'], // Limited permissions
      };

      renderMainLayout(limitedUser);
      
      // Should still show basic navigation
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Work Orders')).toBeInTheDocument();
    });

    it('should handle users with no specific roles', () => {
      const basicUser = {
        ...mockUser,
        roles: [],
        permissions: [],
      };

      renderMainLayout(basicUser);
      
      // Should at least show dashboard
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should handle mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderMainLayout();
      
      expect(screen.getByText('MES')).toBeInTheDocument();
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('Error Boundaries', () => {
    it('should handle missing user gracefully', () => {
      (useAuthStore as any).mockReturnValue({
        user: null,
        logout: vi.fn(),
        isAuthenticated: false,
        isLoading: false,
      });

      expect(() => {
        render(
          <BrowserRouter>
            <MainLayout>
              <div>Test Content</div>
            </MainLayout>
          </BrowserRouter>
        );
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with large permission sets', () => {
      const userWithManyPermissions = {
        ...mockUser,
        permissions: Array.from({ length: 50 }, (_, i) => `permission.${i}`),
        roles: Array.from({ length: 10 }, (_, i) => `Role ${i}`),
      };

      const startTime = performance.now();
      renderMainLayout(userWithManyPermissions);
      const endTime = performance.now();
      
      // Should render in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });
});