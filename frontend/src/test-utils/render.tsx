/**
 * React Testing Library Render Utilities
 *
 * Custom render functions that wrap components with necessary providers
 * for consistent testing across the application.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SiteProvider } from '@/contexts/SiteContext';
import { Site } from '@/contexts/SiteContext';

// Mock site data for testing
export const mockSite: Site = {
  id: 'test-site-1',
  siteName: 'Test Site',
  siteCode: 'TEST01',
  location: 'Test Location',
  isActive: true,
  timezone: 'America/New_York',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
};

export const mockSites: Site[] = [
  mockSite,
  {
    id: 'test-site-2',
    siteName: 'Test Site 2',
    siteCode: 'TEST02',
    location: 'Test Location 2',
    isActive: true,
    timezone: 'America/Los_Angeles',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
];

// Create a new QueryClient for each test to ensure isolation
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Provider options
  withRouter?: boolean;
  withQueryClient?: boolean;
  withSiteContext?: boolean;

  // Site context options
  initialSite?: Site | null;
  availableSites?: Site[];
  siteContextValue?: Partial<any>; // For completely custom site context

  // Query client options
  queryClient?: QueryClient;

  // Custom wrapper component
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

/**
 * Custom render function that wraps components with common providers
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    withRouter = true,
    withQueryClient = true,
    withSiteContext = false,
    initialSite = mockSite,
    availableSites = mockSites,
    siteContextValue,
    queryClient,
    wrapper,
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult {
  let Wrapper: React.ComponentType<{ children: React.ReactNode }>;

  if (wrapper) {
    Wrapper = wrapper;
  } else {
    // Build the wrapper component with requested providers
    Wrapper = ({ children }) => {
      let element = <>{children}</>;

      // Wrap with SiteContext if requested
      if (withSiteContext) {
        if (siteContextValue) {
          // Use custom site context value (useful for testing error states, loading, etc.)
          const SiteContextMock = React.createContext(siteContextValue);
          element = (
            <SiteContextMock.Provider value={siteContextValue}>
              {element}
            </SiteContextMock.Provider>
          );
        } else {
          // Use real SiteProvider but with controlled initial state
          element = <SiteProvider>{element}</SiteProvider>;
        }
      }

      // Wrap with QueryClient if requested
      if (withQueryClient) {
        const testQueryClient = queryClient || createTestQueryClient();
        element = (
          <QueryClientProvider client={testQueryClient}>
            {element}
          </QueryClientProvider>
        );
      }

      // Wrap with Router if requested
      if (withRouter) {
        element = <BrowserRouter>{element}</BrowserRouter>;
      }

      return element;
    };
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Render with all common providers (router, query client, site context)
 */
export function renderWithAllProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  return renderWithProviders(ui, {
    withRouter: true,
    withQueryClient: true,
    withSiteContext: true,
    ...options,
  });
}

/**
 * Render with just React Router
 */
export function renderWithRouter(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  return renderWithProviders(ui, {
    withRouter: true,
    withQueryClient: false,
    withSiteContext: false,
    ...options,
  });
}

/**
 * Render with React Query
 */
export function renderWithQuery(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  return renderWithProviders(ui, {
    withRouter: false,
    withQueryClient: true,
    withSiteContext: false,
    ...options,
  });
}

/**
 * Render with Site Context
 */
export function renderWithSiteContext(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  return renderWithProviders(ui, {
    withRouter: false,
    withQueryClient: false,
    withSiteContext: true,
    ...options,
  });
}

/**
 * Create a custom wrapper for specific test needs
 */
export function createTestWrapper(options: CustomRenderOptions = {}) {
  return ({ children }: { children: React.ReactNode }) => {
    const { wrapper: CustomWrapper } = renderWithProviders(<>{children}</>, options);
    return CustomWrapper ? <CustomWrapper>{children}</CustomWrapper> : <>{children}</>;
  };
}

// Re-export everything from React Testing Library for convenience
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';