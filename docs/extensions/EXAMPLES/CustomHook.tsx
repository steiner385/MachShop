/**
 * CustomHook - Reusable React hook examples
 *
 * This example demonstrates:
 * - Custom hook creation patterns
 * - Data fetching with caching
 * - Error handling in hooks
 * - Loading state management
 * - Automatic refetching
 * - TypeScript typing for hooks
 *
 * @example
 * const { data, loading, error, refetch } = useDataFetcher('/api/products');
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic API response type
 */
export interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Simple in-memory cache
 */
const cache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * useDataFetcher Hook
 *
 * A reusable hook for fetching data from an API with caching,
 * error handling, and loading states.
 *
 * @example
 * const { data, loading, error, refetch } = useDataFetcher<Product[]>('/api/products');
 *
 * if (loading) return <Spin />;
 * if (error) return <Alert type="error" message={error.message} />;
 * return <ProductList products={data} />;
 */
export function useDataFetcher<T = any>(
  url: string,
  options?: RequestInit
): ApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch data from API
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cached = cache.get(url);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setData(cached.data);
        setLoading(false);
        return;
      }

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: T = await response.json();

      // Update cache
      cache.set(url, {
        data: result,
        timestamp: Date.now(),
      });

      setData(result);
    } catch (err) {
      // Don't set error if request was aborted
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        console.error('Fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  /**
   * Fetch on mount and when URL changes
   */
  useEffect(() => {
    fetchData();

    // Cleanup: abort request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * usePagination Hook
 *
 * Manages pagination state and calculations
 *
 * @example
 * const {
 *   currentPage,
 *   pageSize,
 *   totalPages,
 *   goToPage,
 *   nextPage,
 *   prevPage,
 *   setPageSize
 * } = usePagination(100, 10);
 */
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export function usePagination(
  totalItems: number,
  initialPageSize: number = 10
): PaginationState {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  return {
    currentPage,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: handleSetPageSize,
    canGoNext: currentPage < totalPages,
    canGoPrev: currentPage > 1,
  };
}

/**
 * useDebounce Hook
 *
 * Debounces a value to prevent excessive updates
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   // This will only run 500ms after the user stops typing
 *   fetchSearchResults(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useLocalStorage Hook
 *
 * Manages state synchronized with localStorage
 *
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function (same API as useState)
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));

      // Dispatch event for cross-tab synchronization
      window.dispatchEvent(new Event('local-storage'));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

/**
 * useInterval Hook
 *
 * Declarative setInterval with automatic cleanup
 *
 * @example
 * useInterval(() => {
 *   // This runs every 1000ms
 *   fetchLatestData();
 * }, 1000);
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setInterval(() => savedCallback.current(), delay);

    return () => clearInterval(id);
  }, [delay]);
}

/**
 * useToggle Hook
 *
 * Simple boolean toggle state management
 *
 * @example
 * const [isOpen, toggleOpen] = useToggle(false);
 *
 * <Button onClick={toggleOpen}>Toggle</Button>
 * <Modal visible={isOpen} onCancel={toggleOpen}>...</Modal>
 */
export function useToggle(
  initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(v => !v);
  }, []);

  return [value, toggle, setValue];
}

/**
 * useWindowSize Hook
 *
 * Tracks window dimensions
 *
 * @example
 * const { width, height } = useWindowSize();
 *
 * return (
 *   <div>
 *     Window size: {width} x {height}
 *   </div>
 * );
 */
export interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    // Call handler immediately to update state with initial window size
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

/**
 * useOnClickOutside Hook
 *
 * Detects clicks outside of a referenced element
 *
 * @example
 * const menuRef = useRef<HTMLDivElement>(null);
 * useOnClickOutside(menuRef, () => {
 *   setMenuOpen(false);
 * });
 *
 * <div ref={menuRef}>Menu content</div>
 */
export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current;

      // Do nothing if clicking ref's element or descendent elements
      if (!el || el.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

/**
 * Example component using custom hooks
 */
export const CustomHookExample: React.FC = () => {
  // Data fetching hook
  const { data, loading, error, refetch } = useDataFetcher<any[]>('/api/data');

  // Pagination hook
  const pagination = usePagination(data?.length || 0, 10);

  // Debounce hook
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Local storage hook
  const [theme, setTheme] = useLocalStorage('theme', 'light');

  // Toggle hook
  const [isOpen, toggleOpen] = useToggle(false);

  // Window size hook
  const { width } = useWindowSize();

  return (
    <div>
      <h2>Custom Hooks Example</h2>
      <p>Window width: {width}px</p>
      <p>Theme: {theme}</p>
      <p>Search (debounced): {debouncedSearch}</p>
      {/* Add your UI here */}
    </div>
  );
};

export default CustomHookExample;
