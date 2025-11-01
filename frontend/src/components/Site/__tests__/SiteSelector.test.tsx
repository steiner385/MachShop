/**
 * SiteSelector Component Tests
 *
 * Tests for the SiteSelector component including:
 * - Component rendering in different states
 * - Site context integration
 * - Site selection functionality
 * - Search and filtering
 * - Loading, error, and empty states
 * - Inactive site handling
 * - Accessibility features
 * - User interactions
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { SiteSelector } from '../SiteSelector';
import { Site, useSite } from '@/contexts/SiteContext';

// Mock the SiteContext
const mockUseSite = vi.fn();
vi.mock('@/contexts/SiteContext', () => ({
  useSite: () => mockUseSite(),
  Site: {},
}));

// Mock CSS import
vi.mock('../SiteSelector.css', () => ({}));

// Mock sites data
const mockSites: Site[] = [
  {
    id: 'site-1',
    siteName: 'Main Manufacturing Plant',
    siteCode: 'MAIN',
    location: 'Detroit, MI',
    isActive: true,
    timezone: 'America/Detroit',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: 'site-2',
    siteName: 'Secondary Assembly',
    siteCode: 'SEC',
    location: 'Cleveland, OH',
    isActive: true,
    timezone: 'America/New_York',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
  {
    id: 'site-3',
    siteName: 'Inactive Facility',
    siteCode: 'INACT',
    location: 'Chicago, IL',
    isActive: false,
    timezone: 'America/Chicago',
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03'),
  },
];

describe('SiteSelector', () => {
  const user = userEvent.setup();
  const mockSetCurrentSite = vi.fn();
  const mockClearError = vi.fn();

  const defaultSiteContext = {
    currentSite: mockSites[0],
    allSites: mockSites,
    isLoading: false,
    error: null,
    setCurrentSite: mockSetCurrentSite,
    clearError: mockClearError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSite.mockReturnValue(defaultSiteContext);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render site selector with default props', () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      expect(selector).toBeInTheDocument();
      expect(selector).toHaveDisplayValue('Main Manufacturing Plant (MAIN)');
    });

    it('should render with custom className and style', () => {
      const customStyle = { width: '300px', background: 'red' };
      renderWithProviders(
        <SiteSelector className="custom-class" style={customStyle} />
      );

      const container = screen.getByRole('combobox').closest('.site-selector-container');
      expect(container).toHaveClass('custom-class');
      expect(container).toHaveStyle(customStyle);
    });

    it('should render with custom size', () => {
      renderWithProviders(<SiteSelector size="small" />);

      const selector = screen.getByRole('combobox');
      expect(selector).toHaveClass('ant-select-sm');
    });

    it('should render with custom placeholder', () => {
      mockUseSite.mockReturnValue({
        ...defaultSiteContext,
        currentSite: null,
      });

      renderWithProviders(<SiteSelector placeholder="Choose a site" />);

      expect(screen.getByPlaceholderText('Choose a site')).toBeInTheDocument();
    });

    it('should show or hide icon based on showIcon prop', () => {
      const { rerender } = renderWithProviders(<SiteSelector showIcon={true} />);

      // Icon should be present
      expect(screen.getByRole('img', { name: /global/i })).toBeInTheDocument();

      rerender(<SiteSelector showIcon={false} />);

      // Icon should not be present
      expect(screen.queryByRole('img', { name: /global/i })).not.toBeInTheDocument();
    });

    it('should enable allowClear when prop is true', () => {
      renderWithProviders(<SiteSelector allowClear={true} />);

      const selector = screen.getByRole('combobox');
      expect(selector.closest('.ant-select')).toHaveClass('ant-select-allow-clear');
    });
  });

  describe('Loading State', () => {
    it('should render loading state correctly', () => {
      mockUseSite.mockReturnValue({
        ...defaultSiteContext,
        isLoading: true,
      });

      renderWithProviders(<SiteSelector />);

      expect(screen.getByPlaceholderText('Loading sites...')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeDisabled();
      expect(screen.getByRole('img', { name: /loading/i })).toBeInTheDocument();
    });

    it('should show loading icon in loading state', () => {
      mockUseSite.mockReturnValue({
        ...defaultSiteContext,
        isLoading: true,
      });

      renderWithProviders(<SiteSelector />);

      const loadingIcon = screen.getByRole('img', { name: /loading/i });
      expect(loadingIcon).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should render error state correctly', () => {
      mockUseSite.mockReturnValue({
        ...defaultSiteContext,
        error: 'Failed to load sites',
      });

      renderWithProviders(<SiteSelector />);

      expect(screen.getByPlaceholderText('Error loading sites')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should show error tooltip on hover', async () => {
      mockUseSite.mockReturnValue({
        ...defaultSiteContext,
        error: 'Network connection failed',
      });

      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.hover(selector);

      await waitFor(() => {
        expect(screen.getByText('Network connection failed')).toBeInTheDocument();
      });
    });

    it('should apply error status to select component', () => {
      mockUseSite.mockReturnValue({
        ...defaultSiteContext,
        error: 'Some error',
      });

      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      expect(selector.closest('.ant-select')).toHaveClass('ant-select-status-error');
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no sites available', () => {
      mockUseSite.mockReturnValue({
        ...defaultSiteContext,
        allSites: [],
      });

      renderWithProviders(<SiteSelector />);

      expect(screen.getByPlaceholderText('No sites available')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  describe('Site Selection', () => {
    it('should display current site correctly', () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      expect(selector).toHaveDisplayValue('Main Manufacturing Plant (MAIN)');
    });

    it('should handle site selection', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByText('Secondary Assembly')).toBeInTheDocument();
      });

      // Click on a different site
      await user.click(screen.getByText('Secondary Assembly'));

      expect(mockClearError).toHaveBeenCalledTimes(1);
      expect(mockSetCurrentSite).toHaveBeenCalledWith(mockSites[1]);
    });

    it('should handle clearing selection when allowClear is true', async () => {
      renderWithProviders(<SiteSelector allowClear={true} />);

      const selector = screen.getByRole('combobox');

      // Click the clear button (X)
      const clearButton = selector.closest('.ant-select')?.querySelector('.ant-select-clear');
      if (clearButton) {
        await user.click(clearButton);
      }

      expect(mockClearError).toHaveBeenCalled();
      expect(mockSetCurrentSite).toHaveBeenCalledWith(null);
    });

    it('should handle selection of null value', async () => {
      renderWithProviders(<SiteSelector />);

      // Simulate onChange with null value (clear selection)
      const selector = screen.getByRole('combobox');
      fireEvent.change(selector, { target: { value: null } });

      expect(mockSetCurrentSite).toHaveBeenCalledWith(null);
    });

    it('should ignore selection of invalid site ID', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');

      // Simulate selecting an invalid site ID
      fireEvent.change(selector, { target: { value: 'invalid-site-id' } });

      expect(mockSetCurrentSite).not.toHaveBeenCalled();
    });
  });

  describe('Site Options Rendering', () => {
    it('should render all active sites as options', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Main Manufacturing Plant')).toBeInTheDocument();
        expect(screen.getByText('Secondary Assembly')).toBeInTheDocument();
        expect(screen.getByText('(MAIN)')).toBeInTheDocument();
        expect(screen.getByText('(SEC)')).toBeInTheDocument();
      });
    });

    it('should display site locations', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Detroit, MI')).toBeInTheDocument();
        expect(screen.getByText('Cleveland, OH')).toBeInTheDocument();
      });
    });

    it('should mark inactive sites as disabled', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Inactive Facility')).toBeInTheDocument();
        expect(screen.getByText('Inactive')).toBeInTheDocument();
      });

      // Inactive site option should be disabled
      const inactiveOption = screen.getByText('Inactive Facility').closest('.ant-select-item');
      expect(inactiveOption).toHaveClass('ant-select-item-option-disabled');
    });

    it('should show environment icons for each site', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      await waitFor(() => {
        const environmentIcons = screen.getAllByRole('img', { name: /environment/i });
        expect(environmentIcons).toHaveLength(3); // One for each site
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should enable search functionality', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      // Type to search
      await user.type(selector, 'Main');

      await waitFor(() => {
        expect(screen.getByText('Main Manufacturing Plant')).toBeInTheDocument();
        expect(screen.queryByText('Secondary Assembly')).not.toBeInTheDocument();
      });
    });

    it('should filter by site code', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      // Search by site code
      await user.type(selector, 'SEC');

      await waitFor(() => {
        expect(screen.getByText('Secondary Assembly')).toBeInTheDocument();
        expect(screen.queryByText('Main Manufacturing Plant')).not.toBeInTheDocument();
      });
    });

    it('should be case-insensitive in search', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      // Search with different case
      await user.type(selector, 'main');

      await waitFor(() => {
        expect(screen.getByText('Main Manufacturing Plant')).toBeInTheDocument();
      });
    });

    it('should show no options when search yields no results', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      // Search for non-existent site
      await user.type(selector, 'NonExistent');

      await waitFor(() => {
        expect(screen.queryByText('Main Manufacturing Plant')).not.toBeInTheDocument();
        expect(screen.queryByText('Secondary Assembly')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      expect(selector).toBeInTheDocument();
      expect(selector).toHaveAttribute('aria-expanded', 'false');
    });

    it('should be keyboard navigable', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');

      // Tab to the selector
      await user.tab();
      expect(selector).toHaveFocus();

      // Open dropdown with keyboard
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(selector).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should support keyboard navigation through options', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Main Manufacturing Plant')).toBeInTheDocument();
      });

      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(mockSetCurrentSite).toHaveBeenCalled();
    });

    it('should provide screen reader friendly content', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      await waitFor(() => {
        // Check that option content is accessible
        expect(screen.getByText('Main Manufacturing Plant')).toBeInTheDocument();
        expect(screen.getByText('Detroit, MI')).toBeInTheDocument();
      });
    });
  });

  describe('Component Styling and Layout', () => {
    it('should apply minimum width styling', () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      expect(selector.closest('.ant-select')).toHaveStyle({ minWidth: '200px' });
    });

    it('should apply custom style properties', () => {
      const customStyle = { backgroundColor: 'red', border: '2px solid blue' };
      renderWithProviders(<SiteSelector style={customStyle} />);

      const selector = screen.getByRole('combobox');
      const selectElement = selector.closest('.ant-select');
      expect(selectElement).toHaveStyle(customStyle);
    });

    it('should apply site-selector class', () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      expect(selector.closest('.ant-select')).toHaveClass('site-selector');
    });

    it('should not match select width for popup', () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      const selectElement = selector.closest('.ant-select');

      // This tests the popupMatchSelectWidth={false} prop
      expect(selectElement).toHaveAttribute('data-popup-match-select-width', 'false');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing site location gracefully', async () => {
      const sitesWithoutLocation = mockSites.map((site, index) => ({
        ...site,
        location: index === 0 ? undefined : site.location,
      }));

      mockUseSite.mockReturnValue({
        ...defaultSiteContext,
        allSites: sitesWithoutLocation,
      });

      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Main Manufacturing Plant')).toBeInTheDocument();
        // Location should not be shown for the first site
      });
    });

    it('should handle empty site name gracefully', async () => {
      const sitesWithEmptyName = [
        {
          ...mockSites[0],
          siteName: '',
        },
      ];

      mockUseSite.mockReturnValue({
        ...defaultSiteContext,
        allSites: sitesWithEmptyName,
      });

      renderWithProviders(<SiteSelector />);

      // Component should still render without crashing
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should handle context with undefined values', () => {
      mockUseSite.mockReturnValue({
        currentSite: undefined,
        allSites: undefined,
        isLoading: false,
        error: null,
        setCurrentSite: mockSetCurrentSite,
        clearError: mockClearError,
      });

      expect(() => {
        renderWithProviders(<SiteSelector />);
      }).not.toThrow();
    });

    it('should handle rapid selection changes', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Secondary Assembly')).toBeInTheDocument();
      });

      // Rapid clicks
      await user.click(screen.getByText('Secondary Assembly'));
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Main Manufacturing Plant')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Main Manufacturing Plant'));

      // Should handle rapid changes gracefully
      expect(mockSetCurrentSite).toHaveBeenCalled();
    });
  });

  describe('Integration with Site Context', () => {
    it('should clear errors when making a selection', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Secondary Assembly')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Secondary Assembly'));

      expect(mockClearError).toHaveBeenCalledTimes(1);
    });

    it('should call setCurrentSite with the correct site object', async () => {
      renderWithProviders(<SiteSelector />);

      const selector = screen.getByRole('combobox');
      await user.click(selector);

      await waitFor(() => {
        expect(screen.getByText('Secondary Assembly')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Secondary Assembly'));

      expect(mockSetCurrentSite).toHaveBeenCalledWith(mockSites[1]);
    });

    it('should reflect context changes in the UI', () => {
      const { rerender } = renderWithProviders(<SiteSelector />);

      // Initially shows the first site
      expect(screen.getByDisplayValue('Main Manufacturing Plant (MAIN)')).toBeInTheDocument();

      // Change context to show second site
      mockUseSite.mockReturnValue({
        ...defaultSiteContext,
        currentSite: mockSites[1],
      });

      rerender(<SiteSelector />);

      expect(screen.getByDisplayValue('Secondary Assembly (SEC)')).toBeInTheDocument();
    });
  });
});