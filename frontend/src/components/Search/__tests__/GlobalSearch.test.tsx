/**
 * GlobalSearch Component Tests
 *
 * Tests for the GlobalSearch component including:
 * - Search input and debouncing
 * - UUID detection and reconstruction
 * - Search API integration
 * - Result rendering and grouping
 * - Scope filtering
 * - User interactions and navigation
 * - Loading and error states
 * - Compact mode rendering
 * - Accessibility features
 */

import React from 'react';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { GlobalSearch } from '../GlobalSearch';
import { searchAPI } from '@/api/search';
import {
  SearchScope,
  SearchResult,
  SearchEntityType,
} from '@/types/search';

// Mock the search API
vi.mock('@/api/search', () => ({
  searchAPI: {
    search: vi.fn(),
  },
}));

// Mock UUID utils
vi.mock('../../../utils/uuidUtils', () => ({
  isLikelyUUIDQuery: vi.fn(),
  isValidUUID: vi.fn(),
  reconstructUUID: vi.fn(),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock search utility functions
vi.mock('@/types/search', async () => {
  const actual = await vi.importActual('@/types/search');
  return {
    ...actual,
    groupResultsByType: vi.fn((results: SearchResult[]) => [
      {
        entityType: SearchEntityType.WORK_ORDER,
        results: results.filter(r => r.entityType === SearchEntityType.WORK_ORDER),
        count: results.filter(r => r.entityType === SearchEntityType.WORK_ORDER).length,
      },
      {
        entityType: SearchEntityType.MATERIAL,
        results: results.filter(r => r.entityType === SearchEntityType.MATERIAL),
        count: results.filter(r => r.entityType === SearchEntityType.MATERIAL).length,
      },
    ].filter(group => group.count > 0)),
    formatSearchExecutionTime: vi.fn((ms: number) => `${ms}ms`),
  };
});

const mockSearchAPI = vi.mocked(searchAPI);

// Mock search results
const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    entityType: SearchEntityType.WORK_ORDER,
    primaryText: 'WO-001',
    secondaryText: 'Engine Assembly Work Order',
    url: '/workorders/1',
    status: 'In Progress',
    relevanceScore: 0.9,
    metadata: {},
  },
  {
    id: '2',
    entityType: SearchEntityType.MATERIAL,
    primaryText: 'MAT-123',
    secondaryText: 'Titanium Alloy Sheet',
    url: '/materials/2',
    status: 'Available',
    relevanceScore: 0.8,
    metadata: {},
  },
];

describe('GlobalSearch', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();

    // Default successful search response
    mockSearchAPI.search.mockResolvedValue({
      success: true,
      data: {
        results: mockSearchResults,
        totalResults: 2,
        executionTimeMs: 45,
        entityCounts: {},
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render search input with default placeholder', () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders, materials, equipment/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      renderWithProviders(<GlobalSearch placeholder="Custom search placeholder" />);

      const searchInput = screen.getByPlaceholderText('Custom search placeholder');
      expect(searchInput).toBeInTheDocument();
    });

    it('should render scope selector in non-compact mode', () => {
      renderWithProviders(<GlobalSearch />);

      const scopeSelector = screen.getByRole('combobox');
      expect(scopeSelector).toBeInTheDocument();
    });

    it('should not render scope selector in compact mode', () => {
      renderWithProviders(<GlobalSearch compact={true} />);

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should render search icon in input prefix', () => {
      renderWithProviders(<GlobalSearch />);

      const searchIcon = screen.getByRole('img', { name: /search/i });
      expect(searchIcon).toBeInTheDocument();
    });
  });

  describe('Search Input Handling', () => {
    it('should update query state when typing', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test query');

      expect(searchInput).toHaveValue('test query');
    });

    it('should show clear button when input has text', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      expect(screen.getByRole('button', { name: /close-circle/i })).toBeInTheDocument();
    });

    it('should clear input when clear button is clicked', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      const clearButton = screen.getByRole('button', { name: /close-circle/i });
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
    });

    it('should handle allowClear functionality', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      // Ant Design's allowClear provides built-in clear functionality
      expect(searchInput).toHaveValue('test');
    });
  });

  describe('Search Debouncing', () => {
    it('should debounce search requests by 300ms', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      // Search should not be called immediately
      expect(mockSearchAPI.search).not.toHaveBeenCalled();

      // Fast-forward timers by 299ms (just before debounce threshold)
      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(mockSearchAPI.search).not.toHaveBeenCalled();

      // Fast-forward to 300ms (debounce threshold)
      act(() => {
        vi.advanceTimersByTime(1);
      });

      await waitFor(() => {
        expect(mockSearchAPI.search).toHaveBeenCalledTimes(1);
      });
    });

    it('should cancel previous search requests when typing rapidly', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);

      // Type multiple characters rapidly
      await user.type(searchInput, 'test');
      act(() => {
        vi.advanceTimersByTime(100);
      });

      await user.type(searchInput, '123');
      act(() => {
        vi.advanceTimersByTime(100);
      });

      await user.type(searchInput, 'abc');

      // Fast-forward to trigger only the last search
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSearchAPI.search).toHaveBeenCalledTimes(1);
        expect(mockSearchAPI.search).toHaveBeenCalledWith({
          query: 'test123abc',
          scope: SearchScope.ALL,
          limit: 10,
        });
      });
    });

    it('should not search for queries shorter than 2 characters', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'a');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockSearchAPI.search).not.toHaveBeenCalled();
    });
  });

  describe('Search API Integration', () => {
    it('should call search API with correct parameters', async () => {
      renderWithProviders(<GlobalSearch defaultScope={SearchScope.WORK_ORDERS} />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test query');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSearchAPI.search).toHaveBeenCalledWith({
          query: 'test query',
          scope: SearchScope.WORK_ORDERS,
          limit: 10,
        });
      });
    });

    it('should handle search API success response', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Found 2 results')).toBeInTheDocument();
        expect(screen.getByText('45ms')).toBeInTheDocument();
      });
    });

    it('should handle search API failure', async () => {
      mockSearchAPI.search.mockResolvedValueOnce({
        success: false,
        error: 'Search failed',
      });

      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during search', async () => {
      // Mock a delayed response
      let resolveSearch: (value: any) => void;
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve;
      });
      mockSearchAPI.search.mockReturnValue(searchPromise);

      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });

      // Resolve the search
      act(() => {
        resolveSearch!({
          success: true,
          data: {
            results: mockSearchResults,
            totalResults: 2,
            executionTimeMs: 45,
            entityCounts: {},
          },
        });
      });

      await waitFor(() => {
        expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
      });
    });
  });

  describe('UUID Detection and Handling', () => {
    it('should detect UUID-like queries', async () => {
      const mockIsLikelyUUIDQuery = vi.mocked(require('../../../utils/uuidUtils').isLikelyUUIDQuery);
      const mockReconstructUUID = vi.mocked(require('../../../utils/uuidUtils').reconstructUUID);
      const mockIsValidUUID = vi.mocked(require('../../../utils/uuidUtils').isValidUUID);

      mockIsLikelyUUIDQuery.mockReturnValue(true);
      mockReconstructUUID.mockReturnValue('12345678-1234-1234-1234-123456789012');
      mockIsValidUUID.mockReturnValue(true);

      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, '12345678-1234');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSearchAPI.search).toHaveBeenCalledWith({
          query: '12345678-1234-1234-1234-123456789012',
          scope: SearchScope.ALL,
          limit: 10,
        });
      });
    });

    it('should handle partial UUID reconstruction', async () => {
      const mockIsLikelyUUIDQuery = vi.mocked(require('../../../utils/uuidUtils').isLikelyUUIDQuery);
      const mockReconstructUUID = vi.mocked(require('../../../utils/uuidUtils').reconstructUUID);

      mockIsLikelyUUIDQuery.mockReturnValue(true);
      mockReconstructUUID.mockReturnValue(null); // Unable to reconstruct

      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'partial-uuid');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSearchAPI.search).toHaveBeenCalledWith({
          query: 'partial-uuid',
          scope: SearchScope.ALL,
          limit: 10,
        });
      });
    });
  });

  describe('Search Results Display', () => {
    it('should show "no results" message when search returns empty', async () => {
      mockSearchAPI.search.mockResolvedValueOnce({
        success: true,
        data: {
          results: [],
          totalResults: 0,
          executionTimeMs: 25,
          entityCounts: {},
        },
      });

      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'nonexistent');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/no results found for "nonexistent"/i)).toBeInTheDocument();
      });
    });

    it('should display search results grouped by entity type', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Found 2 results')).toBeInTheDocument();
        expect(screen.getByText('WO-001')).toBeInTheDocument();
        expect(screen.getByText('Engine Assembly Work Order')).toBeInTheDocument();
        expect(screen.getByText('MAT-123')).toBeInTheDocument();
        expect(screen.getByText('Titanium Alloy Sheet')).toBeInTheDocument();
      });
    });

    it('should display result statuses as tags', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('Available')).toBeInTheDocument();
      });
    });

    it('should show execution time in results header', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('45ms')).toBeInTheDocument();
      });
    });
  });

  describe('Scope Selection', () => {
    it('should allow changing search scope', async () => {
      renderWithProviders(<GlobalSearch />);

      const scopeSelector = screen.getByRole('combobox');
      await user.click(scopeSelector);

      // Select Work Orders scope
      const workOrdersOption = screen.getByText('Work Orders');
      await user.click(workOrdersOption);

      // Type a search query to trigger search with new scope
      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSearchAPI.search).toHaveBeenCalledWith({
          query: 'test',
          scope: SearchScope.WORK_ORDERS,
          limit: 10,
        });
      });
    });

    it('should retrigger search when scope changes with existing query', async () => {
      renderWithProviders(<GlobalSearch />);

      // First, type a search query
      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSearchAPI.search).toHaveBeenCalledTimes(1);
      });

      // Then change scope
      const scopeSelector = screen.getByRole('combobox');
      await user.click(scopeSelector);

      const materialsOption = screen.getByText('Materials');
      await user.click(materialsOption);

      await waitFor(() => {
        expect(mockSearchAPI.search).toHaveBeenCalledTimes(2);
        expect(mockSearchAPI.search).toHaveBeenLastCalledWith({
          query: 'test',
          scope: SearchScope.MATERIALS,
          limit: 10,
        });
      });
    });

    it('should use default scope prop', () => {
      renderWithProviders(<GlobalSearch defaultScope={SearchScope.EQUIPMENT} />);

      const scopeSelector = screen.getByDisplayValue('Equipment');
      expect(scopeSelector).toBeInTheDocument();
    });
  });

  describe('Result Interactions', () => {
    it('should navigate to result URL when result is clicked', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('WO-001')).toBeInTheDocument();
      });

      const workOrderResult = screen.getByText('WO-001');
      await user.click(workOrderResult);

      expect(mockNavigate).toHaveBeenCalledWith('/workorders/1');
    });

    it('should call custom onResultClick when provided', async () => {
      const mockOnResultClick = vi.fn();
      renderWithProviders(<GlobalSearch onResultClick={mockOnResultClick} />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('WO-001')).toBeInTheDocument();
      });

      const workOrderResult = screen.getByText('WO-001');
      await user.click(workOrderResult);

      expect(mockOnResultClick).toHaveBeenCalledWith(mockSearchResults[0]);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should clear search when navigating via default behavior', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('WO-001')).toBeInTheDocument();
      });

      const workOrderResult = screen.getByText('WO-001');
      await user.click(workOrderResult);

      expect(searchInput).toHaveValue('');
    });

    it('should close results panel after navigation', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Found 2 results')).toBeInTheDocument();
      });

      const workOrderResult = screen.getByText('WO-001');
      await user.click(workOrderResult);

      expect(screen.queryByText('Found 2 results')).not.toBeInTheDocument();
    });
  });

  describe('Results Panel Controls', () => {
    it('should close results panel when close button is clicked', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Found 2 results')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByText('Found 2 results')).not.toBeInTheDocument();
    });

    it('should show results when input is focused with existing query', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Found 2 results')).toBeInTheDocument();
      });

      // Close results
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByText('Found 2 results')).not.toBeInTheDocument();

      // Focus input again
      await user.click(searchInput);

      expect(screen.getByText('Found 2 results')).toBeInTheDocument();
    });
  });

  describe('Hover Effects', () => {
    it('should apply hover styles to result items', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('WO-001')).toBeInTheDocument();
      });

      const resultItem = screen.getByText('WO-001').closest('.ant-list-item');
      expect(resultItem).toBeInTheDocument();

      // Simulate mouse enter
      fireEvent.mouseEnter(resultItem!);
      expect(resultItem).toHaveStyle({ background: '#f5f5f5' });

      // Simulate mouse leave
      fireEvent.mouseLeave(resultItem!);
      expect(resultItem).toHaveStyle({ background: 'transparent' });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      expect(searchInput).toHaveAttribute('type', 'text');

      const scopeSelector = screen.getByRole('combobox');
      expect(scopeSelector).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      renderWithProviders(<GlobalSearch />);

      // Tab to scope selector
      await user.tab();
      expect(screen.getByRole('combobox')).toHaveFocus();

      // Tab to search input
      await user.tab();
      expect(screen.getByPlaceholderText(/search work orders/i)).toHaveFocus();
    });

    it('should provide screen reader friendly content', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Found 2 results')).toBeInTheDocument();
      });

      // Results should be accessible to screen readers
      expect(screen.getByText('Engine Assembly Work Order')).toBeInTheDocument();
      expect(screen.getByText('Titanium Alloy Sheet')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search query gracefully', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');
      await user.clear(searchInput);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockSearchAPI.search).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only queries', async () => {
      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, '   ');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockSearchAPI.search).not.toHaveBeenCalled();
    });

    it('should handle results without URLs', async () => {
      const resultsWithoutUrls = mockSearchResults.map(result => ({
        ...result,
        url: undefined,
      }));

      mockSearchAPI.search.mockResolvedValueOnce({
        success: true,
        data: {
          results: resultsWithoutUrls,
          totalResults: 2,
          executionTimeMs: 45,
          entityCounts: {},
        },
      });

      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('WO-001')).toBeInTheDocument();
      });

      const workOrderResult = screen.getByText('WO-001');
      await user.click(workOrderResult);

      // Should not navigate when URL is undefined
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle API timeout gracefully', async () => {
      mockSearchAPI.search.mockRejectedValueOnce(new Error('Request timeout'));

      renderWithProviders(<GlobalSearch />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Component should handle the error gracefully without crashing
      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Compact Mode', () => {
    it('should adjust positioning in compact mode', async () => {
      renderWithProviders(<GlobalSearch compact={true} />);

      const searchInput = screen.getByPlaceholderText(/search work orders/i);
      await user.type(searchInput, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Found 2 results')).toBeInTheDocument();
      });

      // Results panel should be positioned differently in compact mode
      const resultsPanel = screen.getByText('Found 2 results').closest('.ant-card');
      expect(resultsPanel).toHaveStyle({ top: '45px' });
    });
  });
});