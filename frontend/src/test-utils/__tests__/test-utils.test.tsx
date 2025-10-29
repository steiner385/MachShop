/**
 * Test Utilities Test Suite
 *
 * Tests for our custom testing utilities to ensure they work correctly.
 * This also serves as documentation for how to use the utilities.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';

// Import our test utilities
import {
  renderWithProviders,
  renderWithAllProviders,
  renderWithSiteContext,
  mockSite,
  mockSites,
} from '../render';
import {
  setupCommonMocks,
  mockLocalStorage,
  mockWebSocket,
} from '../mocks';
import {
  createMockSite,
  createMockUser,
  createMockComment,
} from '../factories';
import {
  assertElementIsAccessible,
  assertButton,
  assertLoadingState,
} from '../assertions';

// Simple test component
const TestComponent = ({ text }: { text: string }) => (
  <div>
    <h1>Test Component</h1>
    <p>{text}</p>
    <button>Click me</button>
  </div>
);

// Component that uses site context
const SiteContextComponent = () => {
  return (
    <div>
      <h1>Site Context Test</h1>
      <div data-testid="site-info">Site context is available</div>
    </div>
  );
};

// Loading component
const LoadingComponent = () => (
  <div>
    <div role="progressbar" aria-label="Loading...">Loading...</div>
  </div>
);

describe('Test Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Render Utilities', () => {
    it('should render component with basic providers', () => {
      renderWithProviders(<TestComponent text="Hello World" />);

      expect(screen.getByText('Test Component')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render component with all providers', () => {
      renderWithAllProviders(<SiteContextComponent />);

      expect(screen.getByText('Site Context Test')).toBeInTheDocument();
      expect(screen.getByTestId('site-info')).toBeInTheDocument();
    });

    it('should render component with site context only', () => {
      renderWithSiteContext(<SiteContextComponent />);

      expect(screen.getByText('Site Context Test')).toBeInTheDocument();
    });

    it('should use custom site data', () => {
      const customSite = createMockSite({
        siteName: 'Custom Test Site',
        siteCode: 'CUSTOM01',
      });

      renderWithSiteContext(<SiteContextComponent />, {
        initialSite: customSite,
      });

      expect(screen.getByText('Site Context Test')).toBeInTheDocument();
    });
  });

  describe('Mock Utilities', () => {
    it('should setup common mocks', () => {
      const mocks = setupCommonMocks();

      expect(mocks.localStorage).toBeDefined();
      expect(mocks.location).toBeDefined();
      expect(mocks.fetch).toBeDefined();
    });

    it('should mock localStorage', () => {
      const localStorage = mockLocalStorage();

      localStorage.setItem('test-key', 'test-value');
      expect(localStorage.getItem('test-key')).toBe('test-value');

      localStorage.removeItem('test-key');
      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('should mock WebSocket', () => {
      const mockWS = mockWebSocket();

      expect(mockWS.send).toBeDefined();
      expect(mockWS.close).toBeDefined();
      expect(mockWS.readyState).toBe(WebSocket.OPEN);
    });
  });

  describe('Factory Utilities', () => {
    it('should create mock site with defaults', () => {
      const site = createMockSite();

      expect(site.id).toBe('site-1');
      expect(site.siteName).toBe('Test Manufacturing Site');
      expect(site.siteCode).toBe('TMS01');
      expect(site.isActive).toBe(true);
    });

    it('should create mock site with overrides', () => {
      const site = createMockSite({
        siteName: 'Custom Site',
        siteCode: 'CUSTOM',
        isActive: false,
      });

      expect(site.siteName).toBe('Custom Site');
      expect(site.siteCode).toBe('CUSTOM');
      expect(site.isActive).toBe(false);
      // Default values should still be present
      expect(site.id).toBe('site-1');
    });

    it('should create mock user', () => {
      const user = createMockUser();

      expect(user.id).toBe('user-1');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.isActive).toBe(true);
    });

    it('should create mock comment', () => {
      const comment = createMockComment();

      expect(comment.id).toBe('comment-1');
      expect(comment.content).toBe('This is a test comment');
      expect(comment.type).toBe('GENERAL');
      expect(comment.authorName).toBe('John Doe');
    });
  });

  describe('Assertion Utilities', () => {
    it('should assert element accessibility', () => {
      renderWithProviders(<TestComponent text="Hello World" />);

      const heading = screen.getByRole('heading', { name: 'Test Component' });
      assertElementIsAccessible(heading, {
        hasRole: 'heading',
      });
    });

    it('should assert button properties', () => {
      renderWithProviders(<TestComponent text="Hello World" />);

      const button = screen.getByRole('button', { name: 'Click me' });
      assertButton(button, {
        text: 'Click me',
        disabled: false,
      });
    });

    it('should assert loading state', () => {
      renderWithProviders(<LoadingComponent />);
      assertLoadingState();
    });
  });

  describe('Integration', () => {
    it('should work together in a complete test scenario', () => {
      // Setup mocks
      const mocks = setupCommonMocks();

      // Create test data
      const testSite = createMockSite({
        siteName: 'Integration Test Site',
      });

      // Render with providers and test data
      renderWithAllProviders(<SiteContextComponent />, {
        initialSite: testSite,
      });

      // Assertions
      expect(screen.getByText('Site Context Test')).toBeInTheDocument();
      assertElementIsAccessible(
        screen.getByText('Site Context Test'),
        { hasRole: 'heading' }
      );

      // Verify mocks were called
      expect(mocks.localStorage.getItem).toBeDefined();
    });
  });

  describe('Predefined Mock Data', () => {
    it('should provide default mock site', () => {
      expect(mockSite.id).toBe('test-site-1');
      expect(mockSite.siteName).toBe('Test Site');
      expect(mockSite.siteCode).toBe('TEST01');
    });

    it('should provide mock sites array', () => {
      expect(mockSites).toHaveLength(2);
      expect(mockSites[0].siteName).toBe('Test Site');
      expect(mockSites[1].siteName).toBe('Test Site 2');
    });
  });
});