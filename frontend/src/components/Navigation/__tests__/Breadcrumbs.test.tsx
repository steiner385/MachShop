import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import Breadcrumbs from '../Breadcrumbs';

// Mock react-router-dom
const mockUseLocation = vi.fn();
vi.mock('react-router-dom', () => ({
  useLocation: () => mockUseLocation(),
  Link: ({ to, children }: any) => (
    <a href={to} data-testid="breadcrumb-link">
      {children}
    </a>
  )
}));

// Mock antd components
vi.mock('antd', () => ({
  Breadcrumb: ({ style, items, ...props }: any) => (
    <nav data-testid="breadcrumb" style={style} {...props}>
      {items?.map((item: any, index: number) => (
        <div key={index} data-testid="breadcrumb-item">
          {item.title}
        </div>
      ))}
    </nav>
  )
}));

// Mock antd icons
vi.mock('@ant-design/icons', () => ({
  HomeOutlined: (props: any) => (
    <span data-testid="home-icon" {...props}>🏠</span>
  )
}));

describe('Breadcrumbs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup(); // Clean up DOM between tests
  });

  describe('conditional rendering', () => {
    it('should return null for root path', () => {
      mockUseLocation.mockReturnValue({ pathname: '/' });

      const { container } = render(<Breadcrumbs />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null for login page', () => {
      mockUseLocation.mockReturnValue({ pathname: '/login' });

      const { container } = render(<Breadcrumbs />);
      expect(container.firstChild).toBeNull();
    });

    it('should render breadcrumbs for other paths', () => {
      mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

      render(<Breadcrumbs />);
      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
    });
  });

  describe('basic breadcrumb structure', () => {
    it('should always include home icon as first item', () => {
      mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

      render(<Breadcrumbs />);

      const homeIcon = screen.getByTestId('home-icon');
      expect(homeIcon).toBeInTheDocument();

      const homeLink = screen.getByTestId('breadcrumb-link');
      expect(homeLink).toHaveAttribute('href', '/dashboard');
    });

    it('should apply correct styling', () => {
      mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

      render(<Breadcrumbs />);

      const breadcrumb = screen.getByTestId('breadcrumb');
      expect(breadcrumb).toHaveStyle({ marginBottom: '16px' });
    });
  });

  describe('route name mapping', () => {
    it('should map known route names correctly', () => {
      mockUseLocation.mockReturnValue({ pathname: '/workorders' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Work Orders')).toBeInTheDocument();
    });

    it('should map work-instructions correctly', () => {
      mockUseLocation.mockReturnValue({ pathname: '/work-instructions' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Work Instructions')).toBeInTheDocument();
    });

    it('should map quality routes correctly', () => {
      mockUseLocation.mockReturnValue({ pathname: '/quality' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Quality')).toBeInTheDocument();
    });

    it('should map equipment routes correctly', () => {
      mockUseLocation.mockReturnValue({ pathname: '/equipment' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Equipment')).toBeInTheDocument();
    });

    it('should map admin routes correctly', () => {
      mockUseLocation.mockReturnValue({ pathname: '/admin' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Administration')).toBeInTheDocument();
    });

    it('should capitalize unknown route names', () => {
      mockUseLocation.mockReturnValue({ pathname: '/customroute' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Customroute')).toBeInTheDocument();
    });

    it('should handle camelCase route names', () => {
      mockUseLocation.mockReturnValue({ pathname: '/myCustomRoute' });

      render(<Breadcrumbs />);

      expect(screen.getByText('MyCustomRoute')).toBeInTheDocument();
    });
  });

  describe('nested paths', () => {
    it('should create breadcrumbs for nested paths', () => {
      mockUseLocation.mockReturnValue({ pathname: '/workorders/create' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Create New')).toBeInTheDocument();
    });

    it('should create links for non-final segments', () => {
      mockUseLocation.mockReturnValue({ pathname: '/workorders/create' });

      render(<Breadcrumbs />);

      const links = screen.getAllByTestId('breadcrumb-link');
      // Should have home link and workorders link
      expect(links).toHaveLength(2);
      expect(links[1]).toHaveAttribute('href', '/workorders');
      expect(links[1]).toHaveTextContent('Work Orders');
    });

    it('should not create link for final segment', () => {
      mockUseLocation.mockReturnValue({ pathname: '/workorders/create' });

      render(<Breadcrumbs />);

      // "Create New" should be text, not a link
      const createText = screen.getByText('Create New');
      expect(createText.closest('a')).toBeNull();
    });

    it('should handle deep nested paths', () => {
      mockUseLocation.mockReturnValue({ pathname: '/admin/users/roles' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Administration')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Roles')).toBeInTheDocument();
    });
  });

  describe('ID detection', () => {
    it('should detect UUID format and show "Details"', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      mockUseLocation.mockReturnValue({ pathname: `/workorders/${uuid}` });

      render(<Breadcrumbs />);

      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.queryByText(uuid)).not.toBeInTheDocument();
    });

    it('should detect CUID format and show "Details"', () => {
      const cuid = 'c123456789012345678901234';
      mockUseLocation.mockReturnValue({ pathname: `/workorders/${cuid}` });

      render(<Breadcrumbs />);

      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.queryByText(cuid)).not.toBeInTheDocument();
    });

    it('should detect numeric ID format and show "Details"', () => {
      mockUseLocation.mockReturnValue({ pathname: '/workorders/12345' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.queryByText('12345')).not.toBeInTheDocument();
    });

    it('should create link for ID when not final segment', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      mockUseLocation.mockReturnValue({ pathname: `/workorders/${uuid}/edit` });

      render(<Breadcrumbs />);

      const links = screen.getAllByTestId('breadcrumb-link');
      // Should have home, workorders, and details links
      expect(links).toHaveLength(3);
      expect(links[2]).toHaveAttribute('href', `/workorders/${uuid}`);
      expect(links[2]).toHaveTextContent('Details');
    });

    it('should handle mixed IDs and regular segments', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      mockUseLocation.mockReturnValue({ pathname: `/workorders/${uuid}/instructions/edit` });

      render(<Breadcrumbs />);

      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Instructions')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  describe('ID format validation', () => {
    it('should not treat partial UUID as ID', () => {
      mockUseLocation.mockReturnValue({ pathname: '/workorders/123e4567-e89b-12d3' });

      render(<Breadcrumbs />);

      expect(screen.getByText('123e4567-e89b-12d3')).toBeInTheDocument();
      expect(screen.queryByText('Details')).not.toBeInTheDocument();
    });

    it('should not treat invalid CUID as ID', () => {
      mockUseLocation.mockReturnValue({ pathname: '/workorders/x123456789012345678901234' });

      render(<Breadcrumbs />);

      expect(screen.getByText('X123456789012345678901234')).toBeInTheDocument();
      expect(screen.queryByText('Details')).not.toBeInTheDocument();
    });

    it('should not treat alphanumeric string as numeric ID', () => {
      mockUseLocation.mockReturnValue({ pathname: '/workorders/abc123' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Abc123')).toBeInTheDocument();
      expect(screen.queryByText('Details')).not.toBeInTheDocument();
    });

    it('should handle empty segments gracefully', () => {
      mockUseLocation.mockReturnValue({ pathname: '/workorders//create' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Create New')).toBeInTheDocument();
      // Should not have empty segments
      const items = screen.getAllByTestId('breadcrumb-item');
      items.forEach(item => {
        expect(item.textContent).not.toBe('');
      });
    });
  });

  describe('link construction', () => {
    it('should build cumulative paths correctly', () => {
      mockUseLocation.mockReturnValue({ pathname: '/admin/users/roles' });

      render(<Breadcrumbs />);

      const links = screen.getAllByTestId('breadcrumb-link');
      expect(links[0]).toHaveAttribute('href', '/dashboard'); // Home
      expect(links[1]).toHaveAttribute('href', '/admin'); // Admin
      expect(links[2]).toHaveAttribute('href', '/admin/users'); // Users
      // Roles should not be a link (final segment)
    });

    it('should handle single segment paths', () => {
      mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

      render(<Breadcrumbs />);

      const links = screen.getAllByTestId('breadcrumb-link');
      expect(links).toHaveLength(1); // Only home link
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('complex path scenarios', () => {
    it('should handle execution paths correctly', () => {
      mockUseLocation.mockReturnValue({ pathname: '/workorders/execute' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Execute')).toBeInTheDocument();
    });

    it('should handle process segments paths', () => {
      mockUseLocation.mockReturnValue({ pathname: '/process-segments/create' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Process Segments')).toBeInTheDocument();
      expect(screen.getByText('Create New')).toBeInTheDocument();
    });

    it('should handle traceability paths', () => {
      const serialId = '987654321';
      mockUseLocation.mockReturnValue({ pathname: `/traceability/serialization/${serialId}` });

      render(<Breadcrumbs />);

      expect(screen.getByText('Traceability')).toBeInTheDocument();
      expect(screen.getByText('Serialization')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('should handle skills matrix paths', () => {
      mockUseLocation.mockReturnValue({ pathname: '/personnel/skills' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Personnel')).toBeInTheDocument();
      expect(screen.getByText('Skills Matrix')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle paths with trailing slash', () => {
      mockUseLocation.mockReturnValue({ pathname: '/workorders/create/' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Create New')).toBeInTheDocument();
    });

    it('should handle paths with multiple slashes', () => {
      mockUseLocation.mockReturnValue({ pathname: '//workorders///create//' });

      render(<Breadcrumbs />);

      expect(screen.getByText('Work Orders')).toBeInTheDocument();
      expect(screen.getByText('Create New')).toBeInTheDocument();
    });

    it('should handle very long UUIDs correctly', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      mockUseLocation.mockReturnValue({ pathname: `/items/${validUuid}/edit` });

      render(<Breadcrumbs />);

      expect(screen.getByText('Items')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.queryByText(validUuid)).not.toBeInTheDocument();
    });

    it('should handle case sensitivity in UUID detection', () => {
      const upperUuid = '550E8400-E29B-41D4-A716-446655440000';
      mockUseLocation.mockReturnValue({ pathname: `/items/${upperUuid}` });

      render(<Breadcrumbs />);

      expect(screen.getByText('Items')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.queryByText(upperUuid)).not.toBeInTheDocument();
    });
  });

  describe('breadcrumb item count', () => {
    it('should have correct number of items for simple path', () => {
      mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

      render(<Breadcrumbs />);

      const items = screen.getAllByTestId('breadcrumb-item');
      expect(items).toHaveLength(2); // Home + Dashboard
    });

    it('should have correct number of items for nested path', () => {
      mockUseLocation.mockReturnValue({ pathname: '/admin/users/roles' });

      render(<Breadcrumbs />);

      const items = screen.getAllByTestId('breadcrumb-item');
      expect(items).toHaveLength(4); // Home + Admin + Users + Roles
    });

    it('should have correct number of items with ID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      mockUseLocation.mockReturnValue({ pathname: `/workorders/${uuid}` });

      render(<Breadcrumbs />);

      const items = screen.getAllByTestId('breadcrumb-item');
      expect(items).toHaveLength(3); // Home + Work Orders + Details
    });
  });
});