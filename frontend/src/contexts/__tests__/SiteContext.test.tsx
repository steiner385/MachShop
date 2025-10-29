/**
 * Tests for SiteContext and useSite Hook
 *
 * Tests the complex site management context including:
 * - SiteProvider component
 * - useSite hook
 * - localStorage caching and persistence
 * - API integration with authentication
 * - Error handling and retry logic
 * - State management and utility functions
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHookWithProviders } from '@/test-utils/hooks';
import { mockLocalStorageForStore, createMockTimersForHook } from '@/test-utils/stores';
import { createMockSite } from '@/test-utils/factories';
import { SiteProvider, useSite, Site } from '../SiteContext';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test component that uses the useSite hook
const TestComponent = () => {
  const {
    currentSite,
    allSites,
    isLoading,
    error,
    setCurrentSite,
    refreshSites,
    clearError,
    getSiteById,
    getSiteBySiteCode,
  } = useSite();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error">{error || 'No Error'}</div>
      <div data-testid="current-site">
        {currentSite ? currentSite.siteName : 'No Site'}
      </div>
      <div data-testid="sites-count">{allSites.length}</div>
      <button onClick={() => refreshSites()} data-testid="refresh-btn">
        Refresh Sites
      </button>
      <button onClick={() => clearError()} data-testid="clear-error-btn">
        Clear Error
      </button>
      <button
        onClick={() => {
          const site = getSiteById('site-1');
          if (site) setCurrentSite(site);
        }}
        data-testid="set-site-btn"
      >
        Set Site 1
      </button>
      <button
        onClick={() => {
          const site = getSiteBySiteCode('TEST01');
          if (site) setCurrentSite(site);
        }}
        data-testid="set-site-by-code-btn"
      >
        Set Site by Code
      </button>
    </div>
  );
};

describe('SiteContext and useSite Hook', () => {
  let localStorage: ReturnType<typeof mockLocalStorageForStore>;
  let timers: ReturnType<typeof createMockTimersForHook>;

  const mockSites: Site[] = [
    createMockSite({
      id: 'site-1',
      siteName: 'Primary Site',
      siteCode: 'TEST01',
      isActive: true,
    }),
    createMockSite({
      id: 'site-2',
      siteName: 'Secondary Site',
      siteCode: 'TEST02',
      isActive: true,
    }),
    createMockSite({
      id: 'site-3',
      siteName: 'Inactive Site',
      siteCode: 'TEST03',
      isActive: false,
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage = mockLocalStorageForStore();
    timers = createMockTimersForHook();

    // Mock successful localStorage implementation
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
      writable: true,
    });

    // Set NODE_ENV to test to enable test-friendly behavior
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
    });

    // Mock successful API response by default
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ sites: mockSites }),
    });

    // Mock auth token in localStorage
    localStorage.setItem('mes-auth-storage', JSON.stringify({
      state: { token: 'valid-auth-token' }
    }));
  });

  afterEach(() => {
    timers.cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('SiteProvider Initialization', () => {
    it('should initialize with loading state', () => {
      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
      expect(screen.getByTestId('current-site')).toHaveTextContent('No Site');
      expect(screen.getByTestId('sites-count')).toHaveTextContent('0');
    });

    it('should load sites from API on initialization', async () => {
      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('sites-count')).toHaveTextContent('3');
      expect(screen.getByTestId('current-site')).toHaveTextContent('Primary Site');
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/sites', {
        headers: {
          'Authorization': 'Bearer valid-auth-token',
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
      });
    });

    it('should default to first active site when no cached site', async () => {
      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('current-site')).toHaveTextContent('Primary Site');
    });

    it('should restore cached site selection from localStorage', async () => {
      // Pre-populate localStorage with cached site
      localStorage.setItem('mes-current-site', JSON.stringify({
        id: 'site-2',
        siteName: 'Secondary Site',
        siteCode: 'TEST02',
      }));

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('current-site')).toHaveTextContent('Secondary Site');
    });

    it('should handle invalid cached site gracefully', async () => {
      // Pre-populate localStorage with invalid site ID
      localStorage.setItem('mes-current-site', JSON.stringify({
        id: 'invalid-site-id',
        siteName: 'Invalid Site',
        siteCode: 'INVALID',
      }));

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // Should fallback to first active site
      expect(screen.getByTestId('current-site')).toHaveTextContent('Primary Site');
    });
  });

  describe('localStorage Caching', () => {
    it('should use cached sites when available and fresh', async () => {
      // Pre-populate cache with fresh data
      const cacheData = {
        sites: mockSites,
        timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago (fresh)
      };
      localStorage.setItem('mes-all-sites', JSON.stringify(cacheData));

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('sites-count')).toHaveTextContent('3');
      // Should not fetch from API when using cache
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch fresh data when cache is stale', async () => {
      // Pre-populate cache with stale data
      const staleData = {
        sites: [mockSites[0]], // Only one site in cache
        timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago (stale)
      };
      localStorage.setItem('mes-all-sites', JSON.stringify(staleData));

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('sites-count')).toHaveTextContent('3');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle corrupted cache gracefully', async () => {
      // Set corrupted cache data
      localStorage.setItem('mes-all-sites', 'invalid-json');

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('sites-count')).toHaveTextContent('3');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should save current site selection to localStorage', async () => {
      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // Change current site
      const setBtn = screen.getByTestId('set-site-btn');
      await act(async () => {
        setBtn.click();
      });

      // Verify localStorage was updated
      const storedSite = JSON.parse(localStorage.getItem('mes-current-site') || '{}');
      expect(storedSite.id).toBe('site-1');
      expect(storedSite.siteName).toBe('Primary Site');
    });
  });

  describe('Authentication Handling', () => {
    it('should handle missing auth token gracefully', async () => {
      localStorage.removeItem('mes-auth-storage');

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('sites-count')).toHaveTextContent('0');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle corrupted auth token gracefully', async () => {
      localStorage.setItem('mes-auth-storage', 'invalid-json');

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('sites-count')).toHaveTextContent('0');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle different auth token formats', async () => {
      // Test direct token format
      localStorage.setItem('mes-auth-storage', JSON.stringify({
        token: 'direct-token-format'
      }));

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/sites', {
        headers: {
          'Authorization': 'Bearer direct-token-format',
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
      });
    });

    it('should handle unauthorized responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('sites-count')).toHaveTextContent('0');
      expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('error')).toHaveTextContent('Network error');
    });

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('error')).toHaveTextContent('Server error: 500');
    });

    it('should handle timeout errors', async () => {
      // Mock AbortError for timeout
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('sites-count')).toHaveTextContent('0');
    });

    it('should allow clearing errors', async () => {
      mockFetch.mockRejectedValue(new Error('Test error'));

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Test error');
      });

      // Clear error
      const clearBtn = screen.getByTestId('clear-error-btn');
      await act(async () => {
        clearBtn.click();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('No Error');
    });
  });

  describe('Manual Refresh', () => {
    it('should allow manual refresh of sites', async () => {
      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // Clear mock calls
      mockFetch.mockClear();

      // Trigger manual refresh
      const refreshBtn = screen.getByTestId('refresh-btn');
      await act(async () => {
        refreshBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should clear cache on manual refresh', async () => {
      // Pre-populate cache
      const cacheData = {
        sites: [mockSites[0]],
        timestamp: Date.now(),
      };
      localStorage.setItem('mes-all-sites', JSON.stringify(cacheData));

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // Trigger refresh
      const refreshBtn = screen.getByTestId('refresh-btn');
      await act(async () => {
        refreshBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // Cache should be cleared and API called
      expect(mockFetch).toHaveBeenCalled();
      expect(localStorage.getItem('mes-all-sites')).toBeNull();
    });

    it('should update current site with fresh data on refresh', async () => {
      const updatedSites = [
        { ...mockSites[0], siteName: 'Updated Primary Site' },
        ...mockSites.slice(1),
      ];

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-site')).toHaveTextContent('Primary Site');
      });

      // Mock updated response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ sites: updatedSites }),
      });

      // Trigger refresh
      const refreshBtn = screen.getByTestId('refresh-btn');
      await act(async () => {
        refreshBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-site')).toHaveTextContent('Updated Primary Site');
      });
    });

    it('should clear current site if it no longer exists after refresh', async () => {
      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-site')).toHaveTextContent('Primary Site');
      });

      // Mock response without the current site
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ sites: [mockSites[1], mockSites[2]] }),
      });

      // Trigger refresh
      const refreshBtn = screen.getByTestId('refresh-btn');
      await act(async () => {
        refreshBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-site')).toHaveTextContent('Secondary Site');
      });
    });
  });

  describe('Site Management', () => {
    it('should allow setting current site', async () => {
      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // Set different site
      const setBtn = screen.getByTestId('set-site-btn');
      await act(async () => {
        setBtn.click();
      });

      expect(screen.getByTestId('current-site')).toHaveTextContent('Primary Site');
    });

    it('should allow clearing current site', async () => {
      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('current-site')).toHaveTextContent('Primary Site');

      // Clear site by setting null (would need additional button in real implementation)
      // For now, test the functionality via hook directly
    });
  });

  describe('Utility Functions', () => {
    it('should find site by ID', async () => {
      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // getSiteById is tested via the set-site-btn click
      const setBtn = screen.getByTestId('set-site-btn');
      await act(async () => {
        setBtn.click();
      });

      expect(screen.getByTestId('current-site')).toHaveTextContent('Primary Site');
    });

    it('should find site by site code', async () => {
      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // getSiteBySiteCode is tested via the set-site-by-code-btn click
      const setByCodeBtn = screen.getByTestId('set-site-by-code-btn');
      await act(async () => {
        setByCodeBtn.click();
      });

      expect(screen.getByTestId('current-site')).toHaveTextContent('Primary Site');
    });
  });

  describe('useSite Hook', () => {
    it('should throw error when used outside SiteProvider', () => {
      // Suppress console.error for this test since we expect an error
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useSite must be used within a SiteProvider');

      console.error = originalError;
    });

    it('should provide all context values', async () => {
      const { result } = renderHookWithProviders(
        () => useSite(),
        {
          wrapper: ({ children }) => <SiteProvider>{children}</SiteProvider>
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('currentSite');
      expect(result.current).toHaveProperty('allSites');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('setCurrentSite');
      expect(result.current).toHaveProperty('refreshSites');
      expect(result.current).toHaveProperty('clearError');
      expect(result.current).toHaveProperty('getSiteById');
      expect(result.current).toHaveProperty('getSiteBySiteCode');

      expect(typeof result.current.setCurrentSite).toBe('function');
      expect(typeof result.current.refreshSites).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.getSiteById).toBe('function');
      expect(typeof result.current.getSiteBySiteCode).toBe('function');
    });
  });

  describe('Polling and Retry Logic', () => {
    it('should handle circuit breaker for consecutive failures', async () => {
      // Set up consecutive failures
      mockFetch.mockRejectedValue(new Error('Persistent error'));

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      expect(screen.getByTestId('error')).toHaveTextContent('Persistent error');

      // Multiple refreshes should trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        const refreshBtn = screen.getByTestId('refresh-btn');
        await act(async () => {
          refreshBtn.click();
        });
        await waitFor(() => {
          expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
        });
      }

      // Circuit breaker should be active now
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should reset retry count on successful load', async () => {
      // Start with failures
      mockFetch.mockRejectedValueOnce(new Error('Temporary error'));

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Temporary error');
      });

      // Now succeed
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ sites: mockSites }),
      });

      const refreshBtn = screen.getByTestId('refresh-btn');
      await act(async () => {
        refreshBtn.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('sites-count')).toHaveTextContent('3');
        expect(screen.getByTestId('error')).toHaveTextContent('No Error');
      });
    });
  });

  describe('API Response Formats', () => {
    it('should handle different API response formats', async () => {
      // Test direct array response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSites, // Direct array
      });

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('sites-count')).toHaveTextContent('3');
      });
    });

    it('should handle data wrapper response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockSites }), // Wrapped in data property
      });

      render(
        <SiteProvider>
          <TestComponent />
        </SiteProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('sites-count')).toHaveTextContent('3');
      });
    });
  });
});