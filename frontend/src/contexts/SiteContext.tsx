/**
 * Site Context
 * Sprint 3: Frontend Site Context
 *
 * Provides multi-site management functionality for the MES application
 * Manages current site selection with localStorage persistence
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';

export interface Site {
  id: string;
  siteName: string;
  siteCode: string;
  location?: string;
  isActive: boolean;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SiteContextValue {
  // Current site state
  currentSite: Site | null;
  allSites: Site[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentSite: (site: Site | null) => void;
  refreshSites: () => Promise<void>;
  clearError: () => void;

  // Utilities
  getSiteById: (siteId: string) => Site | undefined;
  getSiteBySiteCode: (siteCode: string) => Site | undefined;
}

const SiteContext = createContext<SiteContextValue | null>(null);

const SITE_STORAGE_KEY = 'mes-current-site';
const SITES_CACHE_KEY = 'mes-all-sites';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

interface SiteProviderProps {
  children: ReactNode;
}

/**
 * Fetch sites from API with timeout and improved error handling
 */
const fetchSitesFromAPI = async (): Promise<Site[]> => {
  try {
    const token = localStorage.getItem('mes-auth-storage');
    if (!token) {
      // Return empty array if not authenticated yet (silent failure)
      console.log('[SiteContext] No auth token yet, skipping site fetch');
      return [];
    }

    // Parse the auth storage to get the token
    let authData;
    try {
      authData = JSON.parse(token);
    } catch (e) {
      console.log('[SiteContext] Invalid auth token format, skipping site fetch');
      return [];
    }

    // Try multiple possible token locations for robustness
    const accessToken = authData?.state?.token ||  // Zustand persist format
                        authData?.token ||          // Direct token format
                        (typeof authData === 'string' ? authData : null); // Token as string

    if (!accessToken) {
      console.log('[SiteContext] No access token in auth data, skipping site fetch');
      return [];
    }

    // Create AbortController for request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 5000); // 5 second timeout

    try {
      const response = await fetch('/api/v1/sites', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - auth token might be invalid/expired
          console.log('[SiteContext] Unauthorized - auth token invalid/expired');
          return [];
        }
        if (response.status >= 500) {
          // Server error - temporary, can retry
          console.log(`[SiteContext] Server error (${response.status}), will retry`);
          throw new Error(`Server error: ${response.status}`);
        }
        // Client error (4xx) - probably permanent, don't retry aggressively
        console.log(`[SiteContext] Client error (${response.status}), reducing retry frequency`);
        throw new Error(`Client error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[SiteContext] Successfully fetched sites:', data.sites?.length || 0);
      return data.sites || data.data || data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        console.log('[SiteContext] Request timeout - server may be unavailable');
        throw new Error('Request timeout');
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching sites:', error);
    // Don't throw - return empty array to allow app to continue
    return [];
  }
};

/**
 * Load sites from cache or API
 */
const loadSites = async (): Promise<Site[]> => {
  // Try to load from cache first
  try {
    const cached = localStorage.getItem(SITES_CACHE_KEY);
    if (cached) {
      const { sites, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      // Return cached data if it's fresh (< 10 minutes old)
      if (age < CACHE_DURATION && Array.isArray(sites) && sites.length > 0) {
        console.log('[SiteContext] Using cached sites');
        return sites;
      }
    }
  } catch (error) {
    console.warn('[SiteContext] Failed to load cached sites:', error);
  }

  // Fetch fresh data from API
  console.log('[SiteContext] Fetching sites from API');
  const sites = await fetchSitesFromAPI();

  // Cache the fresh data
  try {
    localStorage.setItem(SITES_CACHE_KEY, JSON.stringify({
      sites,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.warn('[SiteContext] Failed to cache sites:', error);
  }

  return sites;
};

/**
 * Load current site from localStorage
 */
const loadCurrentSiteFromStorage = (allSites: Site[]): Site | null => {
  try {
    const stored = localStorage.getItem(SITE_STORAGE_KEY);
    if (stored) {
      const siteData = JSON.parse(stored);
      // Validate that the stored site still exists in allSites
      const site = allSites.find(s => s.id === siteData.id);
      if (site) {
        console.log('[SiteContext] Restored site from localStorage:', site.siteName);
        return site;
      }
    }
  } catch (error) {
    console.warn('[SiteContext] Failed to load site from localStorage:', error);
  }
  return null;
};

/**
 * Save current site to localStorage
 */
const saveCurrentSiteToStorage = (site: Site | null): void => {
  try {
    if (site) {
      localStorage.setItem(SITE_STORAGE_KEY, JSON.stringify({
        id: site.id,
        siteName: site.siteName,
        siteCode: site.siteCode,
      }));
    } else {
      localStorage.removeItem(SITE_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('[SiteContext] Failed to save site to localStorage:', error);
  }
};

/**
 * SiteProvider Component
 * Manages site state and provides site context to the application
 */
export const SiteProvider: React.FC<SiteProviderProps> = ({ children }) => {
  const [currentSite, setCurrentSiteState] = useState<Site | null>(null);
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use ref to persist retry count across useEffect runs
  const retryCountRef = useRef(0);
  const consecutiveFailuresRef = useRef(0);
  const maxRetries = 10;
  const maxConsecutiveFailures = 3;

  // Detect if we're in test environment to reduce polling aggressiveness
  const isTestEnvironment =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' && window.location.port === '5173') ||
    process.env.NODE_ENV === 'test' ||
    typeof (globalThis as any).playwright !== 'undefined';

  /**
   * Set current site and persist to localStorage
   */
  const setCurrentSite = useCallback((site: Site | null) => {
    setCurrentSiteState(site);
    saveCurrentSiteToStorage(site);
    console.log('[SiteContext] Current site changed:', site?.siteName || 'None');
  }, []);

  /**
   * Refresh sites from API with failure tracking
   */
  const refreshSites = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear cache to force fresh fetch
      localStorage.removeItem(SITES_CACHE_KEY);

      const sites = await loadSites();
      setAllSites(sites);

      // Reset consecutive failures on successful fetch
      if (sites.length > 0) {
        consecutiveFailuresRef.current = 0;
        console.log('[SiteContext] Sites loaded successfully, consecutive failures reset');
      }

      // If current site is set, update it with fresh data
      if (currentSite) {
        const updatedSite = sites.find(s => s.id === currentSite.id);
        if (updatedSite) {
          setCurrentSiteState(updatedSite);
        } else {
          // Current site no longer exists, clear it
          setCurrentSite(null);
        }
      }
    } catch (err) {
      consecutiveFailuresRef.current++;
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sites';
      setError(errorMessage);
      console.error(`[SiteContext] Error refreshing sites (failure ${consecutiveFailuresRef.current}):`, err);
    } finally {
      setIsLoading(false);
    }
  }, [currentSite, setCurrentSite]);

  /**
   * Get site by ID
   */
  const getSiteById = useCallback((siteId: string): Site | undefined => {
    return allSites.find(s => s.id === siteId);
  }, [allSites]);

  /**
   * Get site by site code
   */
  const getSiteBySiteCode = useCallback((siteCode: string): Site | undefined => {
    return allSites.find(s => s.siteCode === siteCode);
  }, [allSites]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Initialize site context on mount
   */
  useEffect(() => {
    const initializeSites = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('[SiteContext] Initializing site context...');

        // Load all sites
        const sites = await loadSites();
        setAllSites(sites);

        if (sites.length === 0) {
          // No sites available yet - might be waiting for auth
          // Don't treat this as an error, just log it
          console.log('[SiteContext] No sites available yet (might be waiting for auth)');
          setIsLoading(false);
          return;
        }

        // Try to restore previous site selection
        const restoredSite = loadCurrentSiteFromStorage(sites);

        if (restoredSite) {
          setCurrentSiteState(restoredSite);
        } else {
          // Default to first active site
          const defaultSite = sites.find(s => s.isActive) || sites[0];
          setCurrentSiteState(defaultSite);
          saveCurrentSiteToStorage(defaultSite);
          console.log('[SiteContext] Defaulting to site:', defaultSite.siteName);
        }

        console.log('[SiteContext] Initialization complete. Sites loaded:', sites.length);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize sites';
        setError(errorMessage);
        console.error('[SiteContext] Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSites();
  }, []); // Run once on mount

  /**
   * Monitor auth changes and refetch sites when auth becomes available
   * Implements circuit breaker pattern for test friendliness
   */
  useEffect(() => {
    // Capture current refreshSites function to avoid stale closure
    const currentRefreshSites = refreshSites;

    const checkAndRefetchSites = async () => {
      // Circuit breaker: Stop polling after too many consecutive failures
      if (consecutiveFailuresRef.current >= maxConsecutiveFailures) {
        console.warn('[SiteContext] Circuit breaker: Too many consecutive failures, stopping polling');
        return;
      }

      // Only refetch if we don't have sites yet and auth is available
      if (allSites.length === 0 && !isLoading && retryCountRef.current < maxRetries) {
        const token = localStorage.getItem('mes-auth-storage');
        if (token) {
          try {
            const authData = JSON.parse(token);
            // Check if auth data has valid token structure
            const hasValidToken = authData?.state?.token ||
                                  authData?.token ||
                                  (typeof authData === 'string' && authData.length > 20);

            if (hasValidToken) {
              console.log(`[SiteContext] Auth detected, refetching sites... (attempt ${retryCountRef.current + 1}/${maxRetries})`);
              retryCountRef.current++;
              await currentRefreshSites();
            } else {
              console.log('[SiteContext] Auth storage found but token not ready yet, will retry...');
            }
          } catch (e) {
            // Invalid JSON, continue waiting
            console.log('[SiteContext] Auth storage format invalid, will retry...');
          }
        }
      } else if (retryCountRef.current >= maxRetries) {
        console.warn('[SiteContext] Max retries reached, stopping site fetch attempts');
      }
    };

    // Test-friendly interval calculation with longer delays in test environments
    const getInterval = () => {
      const baseInterval = isTestEnvironment ? 2000 : 500; // Longer base interval in tests

      if (retryCountRef.current < 3) return baseInterval;
      if (retryCountRef.current < 6) return baseInterval * 2;
      return baseInterval * 4; // Max interval: 8s in test, 2s in prod
    };

    // Max total polling time reduced in test environments
    const maxPollingTime = isTestEnvironment ? 10000 : 20000; // 10s in test, 20s in prod

    let interval: NodeJS.Timeout;
    const scheduleNextCheck = () => {
      // Don't schedule next check if circuit breaker is triggered
      if (consecutiveFailuresRef.current >= maxConsecutiveFailures) {
        console.log('[SiteContext] Circuit breaker active, not scheduling next check');
        return;
      }

      interval = setTimeout(async () => {
        await checkAndRefetchSites();
        // Only continue if sites not loaded, retries not exceeded, and circuit breaker not triggered
        if (allSites.length === 0 &&
            retryCountRef.current < maxRetries &&
            consecutiveFailuresRef.current < maxConsecutiveFailures) {
          scheduleNextCheck();
        }
      }, getInterval());
    };

    // Don't start aggressive polling in test environments if we already have failures
    if (isTestEnvironment && consecutiveFailuresRef.current >= 2) {
      console.log('[SiteContext] Test environment with failures detected, reducing polling aggressiveness');
      return;
    }

    // Start checking immediately (but not in test env with existing failures)
    checkAndRefetchSites();
    scheduleNextCheck();

    // Stop checking after maxPollingTime or when sites are loaded
    const timeout = setTimeout(() => {
      if (interval) {
        clearTimeout(interval);
        console.log(`[SiteContext] Polling timeout reached (${maxPollingTime}ms), stopping`);
      }
    }, maxPollingTime);

    return () => {
      if (interval) clearTimeout(interval);
      clearTimeout(timeout);
    };
  }, [allSites.length, isLoading, isTestEnvironment, refreshSites]);

  /**
   * Reset retry count when sites are successfully loaded
   */
  useEffect(() => {
    if (allSites.length > 0) {
      retryCountRef.current = 0;
      console.log('[SiteContext] Sites loaded successfully, retry count reset');
    }
  }, [allSites.length]);

  const contextValue: SiteContextValue = {
    currentSite,
    allSites,
    isLoading,
    error,
    setCurrentSite,
    refreshSites,
    clearError,
    getSiteById,
    getSiteBySiteCode,
  };

  return (
    <SiteContext.Provider value={contextValue}>
      {children}
    </SiteContext.Provider>
  );
};

/**
 * useSite Hook
 * Provides access to site context
 * @throws Error if used outside of SiteProvider
 */
export const useSite = (): SiteContextValue => {
  const context = useContext(SiteContext);

  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }

  return context;
};

// Export types
export type { SiteContextValue, SiteProviderProps };
