/**
 * Site Context
 * Sprint 3: Frontend Site Context
 *
 * Provides multi-site management functionality for the MES application
 * Manages current site selection with localStorage persistence
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

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
 * Fetch sites from API
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

    const accessToken = authData?.state?.token;

    if (!accessToken) {
      console.log('[SiteContext] No access token in auth data, skipping site fetch');
      return [];
    }

    const response = await fetch('/api/v1/sites', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - auth token might be invalid/expired
        console.log('[SiteContext] Unauthorized - auth token invalid/expired');
        return [];
      }
      throw new Error(`Failed to fetch sites: ${response.statusText}`);
    }

    const data = await response.json();
    return data.sites || data.data || data;
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

  /**
   * Set current site and persist to localStorage
   */
  const setCurrentSite = useCallback((site: Site | null) => {
    setCurrentSiteState(site);
    saveCurrentSiteToStorage(site);
    console.log('[SiteContext] Current site changed:', site?.siteName || 'None');
  }, []);

  /**
   * Refresh sites from API
   */
  const refreshSites = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear cache to force fresh fetch
      localStorage.removeItem(SITES_CACHE_KEY);

      const sites = await loadSites();
      setAllSites(sites);

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
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sites';
      setError(errorMessage);
      console.error('[SiteContext] Error refreshing sites:', err);
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
   */
  useEffect(() => {
    const checkAndRefetchSites = async () => {
      // Only refetch if we don't have sites yet and auth is available
      if (allSites.length === 0 && !isLoading) {
        const token = localStorage.getItem('mes-auth-storage');
        if (token) {
          console.log('[SiteContext] Auth detected, refetching sites...');
          await refreshSites();
        }
      }
    };

    // Set up interval to check for auth availability
    const interval = setInterval(checkAndRefetchSites, 1000);

    // Also check immediately
    checkAndRefetchSites();

    // Stop checking after 10 seconds or when sites are loaded
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [allSites.length, isLoading, refreshSites]);

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
