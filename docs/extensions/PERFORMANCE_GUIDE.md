# Performance Guide

## Table of Contents

- [Introduction](#introduction)
- [Performance Principles](#performance-principles)
- [Code Splitting and Lazy Loading](#code-splitting-and-lazy-loading)
- [Component Optimization](#component-optimization)
- [Query Optimization](#query-optimization)
- [Bundle Size Management](#bundle-size-management)
- [Performance Profiling](#performance-profiling)
- [Common Performance Pitfalls](#common-performance-pitfalls)
- [Monitoring and Metrics](#monitoring-and-metrics)
- [Best Practices](#best-practices)

## Introduction

Performance is critical for providing a great user experience. This guide covers techniques and best practices for building high-performance extensions that load quickly and respond smoothly to user interactions.

### Performance Goals

- **Initial Load**: < 2 seconds on 3G
- **Time to Interactive (TTI)**: < 3 seconds
- **First Contentful Paint (FCP)**: < 1.5 seconds
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms
- **Bundle Size**: < 200KB gzipped

### Core Web Vitals

Google's Core Web Vitals measure user-centric performance:

1. **LCP (Largest Contentful Paint)**: Loading performance
2. **FID (First Input Delay)**: Interactivity
3. **CLS (Cumulative Layout Shift)**: Visual stability

## Performance Principles

### RAIL Model

- **Response**: Process events in under 50ms
- **Animation**: Produce frames in under 10ms
- **Idle**: Maximize idle time
- **Load**: Deliver content in under 5 seconds

### Priority Hierarchy

1. **Critical**: Above-the-fold content, core functionality
2. **Important**: Below-the-fold content, secondary features
3. **Nice-to-have**: Analytics, non-essential features

### Optimization Strategy

```
1. Measure baseline performance
2. Identify bottlenecks
3. Implement optimizations
4. Measure improvements
5. Repeat
```

## Code Splitting and Lazy Loading

### Route-Based Code Splitting

```tsx
// src/routes.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));
const Analytics = lazy(() => import('./pages/Analytics'));

function LoadingFallback() {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}
```

### Component-Based Code Splitting

```tsx
// Lazy load heavy components
import { lazy, Suspense } from 'react';

const Chart = lazy(() => import('./components/Chart'));
const DataTable = lazy(() => import('./components/DataTable'));
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <Suspense fallback={<ChartSkeleton />}>
        <Chart data={chartData} />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <DataTable data={tableData} />
      </Suspense>
    </div>
  );
}
```

### Dynamic Imports

```tsx
// Import on user interaction
function DocumentEditor() {
  const [Editor, setEditor] = useState<React.ComponentType | null>(null);

  const loadEditor = async () => {
    const module = await import('./components/RichTextEditor');
    setEditor(() => module.default);
  };

  return (
    <div>
      {Editor ? (
        <Editor />
      ) : (
        <button onClick={loadEditor}>
          Open Editor
        </button>
      )}
    </div>
  );
}

// Import utilities on demand
async function exportToPDF() {
  const { generatePDF } = await import('./utils/pdf-generator');
  await generatePDF(data);
}

// Import libraries conditionally
async function loadChartLibrary() {
  if (needsAdvancedCharts) {
    return import('chart.js');
  } else {
    return import('./simple-chart');
  }
}
```

### Prefetching and Preloading

```tsx
// Prefetch routes on hover
import { useEffect } from 'react';

function Navigation() {
  const prefetchRoute = (path: string) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = path;
    document.head.appendChild(link);
  };

  return (
    <nav>
      <a
        href="/dashboard"
        onMouseEnter={() => prefetchRoute('/dashboard')}
      >
        Dashboard
      </a>
      <a
        href="/settings"
        onMouseEnter={() => prefetchRoute('/settings')}
      >
        Settings
      </a>
    </nav>
  );
}

// Preload critical resources
function App() {
  useEffect(() => {
    // Preload critical images
    const img = new Image();
    img.src = '/critical-image.jpg';

    // Preload fonts
    const font = new FontFace('CustomFont', 'url(/fonts/custom.woff2)');
    font.load().then(() => {
      document.fonts.add(font);
    });
  }, []);

  return <div>...</div>;
}
```

## Component Optimization

### React.memo

```tsx
// Memoize expensive components
import { memo } from 'react';

interface ListItemProps {
  id: string;
  title: string;
  description: string;
  onClick: (id: string) => void;
}

export const ListItem = memo(function ListItem({
  id,
  title,
  description,
  onClick,
}: ListItemProps) {
  console.log('ListItem rendered:', id);

  return (
    <div onClick={() => onClick(id)}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
});

// Custom comparison function
export const ComplexListItem = memo(
  function ComplexListItem({ item, onUpdate }) {
    return <div>{item.name}</div>;
  },
  (prevProps, nextProps) => {
    // Only re-render if item.id or item.updatedAt changed
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.updatedAt === nextProps.item.updatedAt
    );
  }
);
```

### useMemo

```tsx
import { useMemo } from 'react';

function DataProcessor({ data, filters }) {
  // Expensive computation - only recalculate when dependencies change
  const processedData = useMemo(() => {
    console.log('Processing data...');

    return data
      .filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          return item[key] === value;
        });
      })
      .map(item => ({
        ...item,
        formattedDate: new Date(item.date).toLocaleDateString(),
        total: item.price * item.quantity,
      }))
      .sort((a, b) => b.total - a.total);
  }, [data, filters]);

  return (
    <div>
      {processedData.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}

// Don't overuse useMemo for cheap operations
function BadExample({ firstName, lastName }) {
  // Bad: useMemo overhead is more expensive than the operation
  const fullName = useMemo(() => {
    return `${firstName} ${lastName}`;
  }, [firstName, lastName]);

  // Good: Just compute it directly
  const fullName = `${firstName} ${lastName}`;

  return <div>{fullName}</div>;
}
```

### useCallback

```tsx
import { useCallback, useState } from 'react';

function ParentComponent() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);

  // Memoize callback to prevent child re-renders
  const handleItemClick = useCallback((id: string) => {
    console.log('Item clicked:', id);
    // Handle click
  }, []); // No dependencies - stable reference

  const handleItemUpdate = useCallback((id: string, data: any) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, ...data } : item
      )
    );
  }, []); // setItems is stable, so no dependencies needed

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>

      {items.map(item => (
        <ListItem
          key={item.id}
          item={item}
          onClick={handleItemClick}
          onUpdate={handleItemUpdate}
        />
      ))}
    </div>
  );
}
```

### Virtualization

```tsx
// Use react-window for large lists
import { FixedSizeList } from 'react-window';

interface VirtualListProps {
  items: Array<{ id: string; name: string }>;
}

function VirtualList({ items }: VirtualListProps) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// Variable size list
import { VariableSizeList } from 'react-window';

function VariableList({ items }) {
  const getItemSize = (index: number) => {
    // Calculate dynamic height based on content
    return items[index].isExpanded ? 200 : 50;
  };

  const Row = ({ index, style }) => (
    <div style={style}>
      <h3>{items[index].title}</h3>
      {items[index].isExpanded && (
        <p>{items[index].description}</p>
      )}
    </div>
  );

  return (
    <VariableSizeList
      height={600}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
    >
      {Row}
    </VariableSizeList>
  );
}
```

### Debouncing and Throttling

```tsx
import { useCallback, useRef } from 'react';

// Debounce hook
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

// Usage
function SearchInput() {
  const [query, setQuery] = useState('');

  const searchAPI = async (searchTerm: string) => {
    const results = await fetch(`/api/search?q=${searchTerm}`);
    // Handle results
  };

  const debouncedSearch = useDebounce(searchAPI, 300);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  return <input value={query} onChange={handleChange} />;
}

// Throttle hook
function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
) {
  const inThrottle = useRef(false);

  return useCallback((...args: Parameters<T>) => {
    if (!inThrottle.current) {
      callback(...args);
      inThrottle.current = true;
      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }, [callback, limit]);
}

// Usage for scroll events
function InfiniteScroll() {
  const loadMore = () => {
    console.log('Loading more items...');
  };

  const throttledLoadMore = useThrottle(loadMore, 1000);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        throttledLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [throttledLoadMore]);

  return <div>...</div>;
}
```

## Query Optimization

### React Query Optimization

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Configure default query options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Prefetch data
function Dashboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch data that will likely be needed
    queryClient.prefetchQuery({
      queryKey: ['reports'],
      queryFn: fetchReports,
    });
  }, [queryClient]);

  return <div>...</div>;
}

// Parallel queries
function UserProfile({ userId }) {
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  const postsQuery = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => fetchPosts(userId),
  });

  const statsQuery = useQuery({
    queryKey: ['stats', userId],
    queryFn: () => fetchStats(userId),
  });

  // All queries run in parallel
  if (userQuery.isLoading || postsQuery.isLoading || statsQuery.isLoading) {
    return <Loading />;
  }

  return <div>...</div>;
}

// Dependent queries
function PostComments({ postId }) {
  const postQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => fetchPost(postId),
  });

  const commentsQuery = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId),
    enabled: !!postQuery.data, // Only run after post loads
  });

  return <div>...</div>;
}

// Optimistic updates
function TodoList() {
  const queryClient = useQueryClient();

  const updateTodo = useMutation({
    mutationFn: (todo: Todo) => updateTodoAPI(todo),
    onMutate: async (newTodo) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot previous value
      const previousTodos = queryClient.getQueryData(['todos']);

      // Optimistically update
      queryClient.setQueryData(['todos'], (old: Todo[]) =>
        old.map(todo => todo.id === newTodo.id ? newTodo : todo)
      );

      return { previousTodos };
    },
    onError: (err, newTodo, context) => {
      // Rollback on error
      queryClient.setQueryData(['todos'], context.previousTodos);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return <div>...</div>;
}
```

### GraphQL Optimization

```tsx
import { useQuery, gql } from '@apollo/client';

// Request only needed fields
const USER_QUERY = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
      # Don't request unnecessary fields
    }
  }
`;

// Use fragments for reusable fields
const USER_FRAGMENT = gql`
  fragment UserFields on User {
    id
    name
    email
    avatarUrl
  }
`;

const USERS_QUERY = gql`
  ${USER_FRAGMENT}
  query GetUsers {
    users {
      ...UserFields
    }
  }
`;

// Batch queries
const DASHBOARD_QUERY = gql`
  query GetDashboardData {
    user {
      id
      name
    }
    posts {
      id
      title
    }
    stats {
      totalViews
      totalLikes
    }
  }
`;

// Pagination
const POSTS_QUERY = gql`
  query GetPosts($cursor: String, $limit: Int!) {
    posts(cursor: $cursor, limit: $limit) {
      edges {
        node {
          id
          title
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function PostsList() {
  const { data, fetchMore } = useQuery(POSTS_QUERY, {
    variables: { limit: 20 },
  });

  const loadMore = () => {
    fetchMore({
      variables: {
        cursor: data.posts.pageInfo.endCursor,
      },
    });
  };

  return <div>...</div>;
}
```

### Caching Strategies

```tsx
// Local storage cache
function useCachedQuery<T>(key: string, fetcher: () => Promise<T>, ttl = 5 * 60 * 1000) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem(key);

    if (cached) {
      const { data, timestamp } = JSON.parse(cached);

      if (Date.now() - timestamp < ttl) {
        setData(data);
        setIsLoading(false);
        return;
      }
    }

    fetcher().then(result => {
      setData(result);
      setIsLoading(false);

      localStorage.setItem(key, JSON.stringify({
        data: result,
        timestamp: Date.now(),
      }));
    });
  }, [key]);

  return { data, isLoading };
}

// Memory cache
const cache = new Map<string, { data: any; timestamp: number }>();

function getCached<T>(key: string, fetcher: () => Promise<T>, ttl = 5 * 60 * 1000): Promise<T> {
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return Promise.resolve(cached.data);
  }

  return fetcher().then(data => {
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  });
}
```

## Bundle Size Management

### Analyzing Bundle Size

```bash
# Install bundle analyzer
npm install --save-dev @rollup/plugin-visualizer

# Run build with analysis
npm run build
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { visualizer } from '@rollup/plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@mui/material'],
        },
      },
    },
  },
});
```

### Tree Shaking

```tsx
// Good: Import only what you need
import { Button } from '@mui/material';
import { debounce } from 'lodash-es';

// Bad: Imports entire library
import * as MUI from '@mui/material';
import _ from 'lodash';

// Use ES modules for better tree shaking
import { format } from 'date-fns';

// Instead of CommonJS
const dateFns = require('date-fns');
```

### Library Alternatives

```tsx
// Replace heavy libraries with lighter alternatives

// Before: moment.js (67KB)
import moment from 'moment';
const date = moment().format('YYYY-MM-DD');

// After: date-fns (13KB with tree-shaking)
import { format } from 'date-fns';
const date = format(new Date(), 'yyyy-MM-dd');

// Before: lodash (71KB)
import _ from 'lodash';
const unique = _.uniq(array);

// After: native methods or lodash-es (tree-shakeable)
const unique = [...new Set(array)];

// Before: axios (13KB)
import axios from 'axios';
const response = await axios.get('/api/data');

// After: native fetch (0KB)
const response = await fetch('/api/data');
const data = await response.json();
```

### Asset Optimization

```tsx
// Image optimization
// Use appropriate image formats
// - WebP for photos (better compression)
// - SVG for icons and logos
// - PNG for images requiring transparency

// Lazy load images
function LazyImage({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

// Responsive images
function ResponsiveImage({ src, alt }) {
  return (
    <picture>
      <source
        srcSet={`${src}.webp`}
        type="image/webp"
      />
      <source
        srcSet={`${src}.jpg`}
        type="image/jpeg"
      />
      <img
        src={`${src}.jpg`}
        alt={alt}
        loading="lazy"
      />
    </picture>
  );
}

// Image size variants
function OptimizedImage({ name, alt }) {
  return (
    <img
      src={`/images/${name}-800w.jpg`}
      srcSet={`
        /images/${name}-400w.jpg 400w,
        /images/${name}-800w.jpg 800w,
        /images/${name}-1200w.jpg 1200w
      `}
      sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
      alt={alt}
      loading="lazy"
    />
  );
}
```

### Code Compression

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    cssMinify: true,
    reportCompressedSize: true,
  },
});
```

## Performance Profiling

### React DevTools Profiler

```tsx
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Dashboard />
    </Profiler>
  );
}
```

### Performance API

```tsx
// Measure component render time
function ComponentPerformance({ children }) {
  useEffect(() => {
    performance.mark('component-start');

    return () => {
      performance.mark('component-end');
      performance.measure(
        'component-render',
        'component-start',
        'component-end'
      );

      const measure = performance.getEntriesByName('component-render')[0];
      console.log('Render time:', measure.duration);

      performance.clearMarks();
      performance.clearMeasures();
    };
  });

  return <>{children}</>;
}

// Measure API response time
async function fetchData() {
  performance.mark('fetch-start');

  const response = await fetch('/api/data');
  const data = await response.json();

  performance.mark('fetch-end');
  performance.measure('fetch-duration', 'fetch-start', 'fetch-end');

  const measure = performance.getEntriesByName('fetch-duration')[0];
  console.log('API response time:', measure.duration);

  return data;
}

// User timing API
function trackUserAction(action: string) {
  performance.mark(`action-${action}-start`);

  return () => {
    performance.mark(`action-${action}-end`);
    performance.measure(
      `action-${action}`,
      `action-${action}-start`,
      `action-${action}-end`
    );

    const measure = performance.getEntriesByName(`action-${action}`)[0];

    // Send to analytics
    analytics.track('user-action', {
      action,
      duration: measure.duration,
    });
  };
}
```

### Lighthouse Audits

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://your-extension.com --view

# Run audit with specific categories
lighthouse https://your-extension.com \
  --only-categories=performance,accessibility \
  --view

# Generate report
lighthouse https://your-extension.com \
  --output=html \
  --output-path=./report.html
```

### Web Vitals Monitoring

```tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics({ name, delta, id }) {
  // Send to your analytics service
  analytics.track('web-vital', {
    metric: name,
    value: delta,
    id,
  });
}

function measureWebVitals() {
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}

// Call on app initialization
measureWebVitals();
```

## Common Performance Pitfalls

### Avoid Inline Functions

```tsx
// Bad: Creates new function on every render
function BadList({ items }) {
  return (
    <div>
      {items.map(item => (
        <Item
          key={item.id}
          onClick={() => handleClick(item.id)}
        />
      ))}
    </div>
  );
}

// Good: Stable function reference
function GoodList({ items }) {
  const handleClick = useCallback((id: string) => {
    console.log('Clicked:', id);
  }, []);

  return (
    <div>
      {items.map(item => (
        <Item
          key={item.id}
          onClick={handleClick}
          id={item.id}
        />
      ))}
    </div>
  );
}
```

### Avoid Creating Objects in Render

```tsx
// Bad: Creates new object on every render
function BadComponent({ user }) {
  return (
    <UserProfile
      style={{ margin: 10, padding: 20 }}
      user={user}
    />
  );
}

// Good: Stable reference
const profileStyle = { margin: 10, padding: 20 };

function GoodComponent({ user }) {
  return (
    <UserProfile
      style={profileStyle}
      user={user}
    />
  );
}

// Or use CSS classes
function BestComponent({ user }) {
  return (
    <UserProfile
      className="profile-container"
      user={user}
    />
  );
}
```

### Avoid Unnecessary Re-renders

```tsx
// Bad: Updates state unnecessarily
function BadCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(count + 1); // Stale closure
    }, 1000);

    return () => clearInterval(interval);
  }, []); // Missing dependency

  return <div>{count}</div>;
}

// Good: Use functional update
function GoodCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => c + 1); // Always has latest value
    }, 1000);

    return () => clearInterval(interval);
  }, []); // Correct dependencies

  return <div>{count}</div>;
}
```

### Optimize Context Usage

```tsx
// Bad: Single context with all state
const AppContext = createContext({
  user: null,
  theme: 'light',
  settings: {},
  // ... many more fields
});

// All consumers re-render when any value changes

// Good: Separate contexts by concern
const UserContext = createContext(null);
const ThemeContext = createContext('light');
const SettingsContext = createContext({});

// Components only re-render when their specific context changes

// Even better: Use composition
function App() {
  return (
    <UserProvider>
      <ThemeProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </ThemeProvider>
    </UserProvider>
  );
}
```

### Avoid Long Tasks

```tsx
// Bad: Blocking operation
function processLargeDataset(data) {
  return data.map(item => {
    // Expensive operation
    return heavyComputation(item);
  });
}

// Good: Break into chunks
async function processLargeDatasetAsync(data) {
  const chunkSize = 100;
  const results = [];

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);

    // Process chunk
    const chunkResults = chunk.map(item => heavyComputation(item));
    results.push(...chunkResults);

    // Yield to main thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
}

// Better: Use Web Worker
// worker.ts
self.onmessage = (e) => {
  const results = e.data.map(item => heavyComputation(item));
  self.postMessage(results);
};

// main.ts
const worker = new Worker('worker.ts');
worker.postMessage(data);
worker.onmessage = (e) => {
  const results = e.data;
  // Use results
};
```

## Monitoring and Metrics

### Custom Performance Monitoring

```tsx
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  mark(name: string) {
    performance.mark(name);
  }

  measure(name: string, startMark: string, endMark?: string) {
    performance.measure(name, startMark, endMark);

    const measure = performance.getEntriesByName(name)[0];

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(measure.duration);

    return measure.duration;
  }

  getMetrics(name: string) {
    const values = this.metrics.get(name) || [];

    return {
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      p95: this.percentile(values, 95),
    };
  }

  private percentile(values: number[], p: number) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  clear(name?: string) {
    if (name) {
      this.metrics.delete(name);
      performance.clearMarks(name);
      performance.clearMeasures(name);
    } else {
      this.metrics.clear();
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

// Usage
const monitor = new PerformanceMonitor();

function TrackedComponent() {
  useEffect(() => {
    monitor.mark('component-mount');

    return () => {
      monitor.measure('component-lifetime', 'component-mount');
      console.log(monitor.getMetrics('component-lifetime'));
    };
  }, []);

  return <div>...</div>;
}
```

### Real User Monitoring (RUM)

```tsx
interface PerformanceMetrics {
  navigationTiming: PerformanceNavigationTiming;
  resourceTiming: PerformanceResourceTiming[];
  webVitals: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
  };
}

function collectPerformanceMetrics(): PerformanceMetrics {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  return {
    navigationTiming: navigation,
    resourceTiming: resources,
    webVitals: {
      lcp: 0, // Collected via web-vitals library
      fid: 0,
      cls: 0,
      fcp: 0,
      ttfb: navigation.responseStart - navigation.requestStart,
    },
  };
}

function sendMetricsToBackend(metrics: PerformanceMetrics) {
  // Batch and send to analytics service
  fetch('/api/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metrics),
    keepalive: true, // Ensure request completes even if page closes
  });
}

// Collect metrics on page load
window.addEventListener('load', () => {
  setTimeout(() => {
    const metrics = collectPerformanceMetrics();
    sendMetricsToBackend(metrics);
  }, 0);
});
```

## Best Practices

### Performance Checklist

- [ ] Code splitting by route
- [ ] Lazy load heavy components
- [ ] Memoize expensive computations
- [ ] Virtualize long lists
- [ ] Optimize images (WebP, lazy loading)
- [ ] Minimize bundle size (< 200KB gzipped)
- [ ] Enable compression (gzip/brotli)
- [ ] Use CDN for static assets
- [ ] Implement caching strategy
- [ ] Monitor Core Web Vitals
- [ ] Profile with React DevTools
- [ ] Run Lighthouse audits
- [ ] Set performance budgets
- [ ] Test on slow networks (3G)
- [ ] Optimize critical rendering path

### Performance Budget

```json
{
  "budget": {
    "javascript": "200KB",
    "css": "50KB",
    "images": "500KB",
    "fonts": "100KB",
    "total": "1MB"
  },
  "metrics": {
    "fcp": "1.5s",
    "lcp": "2.5s",
    "tti": "3s",
    "tbt": "200ms",
    "cls": "0.1"
  }
}
```

### Continuous Monitoring

```typescript
// Setup CI/CD performance checks
// .github/workflows/performance.yml

name: Performance Check

on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://staging.example.com
          budgetPath: ./budget.json
          temporaryPublicStorage: true
```

---

## Summary

High performance requires:

1. **Code Splitting**: Load only what's needed
2. **Memoization**: Cache expensive computations
3. **Query Optimization**: Efficient data fetching
4. **Bundle Management**: Keep bundles small and optimized
5. **Profiling**: Measure and identify bottlenecks
6. **Avoid Pitfalls**: Follow React best practices
7. **Monitoring**: Track real user performance
8. **Performance Budget**: Set and enforce limits

Remember: Performance is a feature. Build it in from the start, measure continuously, and optimize based on real data.
