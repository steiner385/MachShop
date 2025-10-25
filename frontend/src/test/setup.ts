/**
 * Test Setup Configuration
 * 
 * This file sets up console monitoring and quality checks for tests.
 * It ensures that React warnings, Ant Design deprecations, and other
 * frontend quality issues are caught during testing.
 */

import { expect, vi, beforeEach } from 'vitest';

// Store original console methods
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Track console warnings and errors during tests
const warnings: string[] = [];
const errors: string[] = [];

// Override console.warn to capture React and library warnings
console.warn = vi.fn((message: string, ...args: any[]) => {
  // Call original console.warn for debugging
  originalConsoleWarn(message, ...args);
  
  // Store warning for test assertions (excluding third-party warnings)
  if (typeof message === 'string') {
    // Ignore React Router future flag warnings
    if (message.includes('React Router Future Flag Warning')) {
      return;
    }
    
    // Ignore act() warnings from third-party components like Ant Design
    if (message.includes('An update to') && message.includes('inside a test was not wrapped in act')) {
      return;
    }
    
    // Ignore findDOMNode warnings from third-party libraries
    if (message.includes('Warning: findDOMNode is deprecated')) {
      return;
    }
    
    // Store other warnings for test assertions
    warnings.push(message);
    
    // Only fail tests on critical application-specific React warnings
    if (message.includes('Warning: A props object containing a "key" prop is being spread into JSX')) {
      throw new Error(`React Key Prop Warning: ${message}`);
    }
    
    if (message.includes('Warning: [antd:') && message.includes('deprecated')) {
      throw new Error(`Ant Design Deprecation Warning: ${message}`);
    }
    
    if (message.includes('Warning: Duplicated key')) {
      throw new Error(`React Duplicate Key Warning: ${message}`);
    }
  }
});

// Override console.error to capture critical errors
console.error = vi.fn((message: string, ...args: any[]) => {
  // Call original console.error for debugging
  originalConsoleError(message, ...args);
  
  // Store error for test assertions (excluding known third-party errors)
  if (typeof message === 'string') {
    // Ignore act() related errors from third-party components
    if (message.includes('An update to') && message.includes('inside a test was not wrapped in act')) {
      return;
    }
    
    // Ignore React Router warnings coming through as errors
    if (message.includes('React Router Future Flag Warning')) {
      return;
    }
    
    // Store other errors
    errors.push(message);
    
    // Only fail tests on actual React errors, not warnings
    if (message.includes('Error:') && !message.includes('Warning:')) {
      throw new Error(`React Error: ${message}`);
    }
  }
});

// Custom matchers for console monitoring
expect.extend({
  toHaveNoConsoleWarnings() {
    const warningCount = warnings.length;
    return {
      pass: warningCount === 0,
      message: () => 
        warningCount === 0 
          ? 'Expected console warnings, but none were found'
          : `Expected no console warnings, but found ${warningCount}: ${warnings.join(', ')}`
    };
  },
  
  toHaveNoConsoleErrors() {
    const errorCount = errors.length;
    return {
      pass: errorCount === 0,
      message: () => 
        errorCount === 0 
          ? 'Expected console errors, but none were found'
          : `Expected no console errors, but found ${errorCount}: ${errors.join(', ')}`
    };
  }
});

// Clear warnings and errors before each test
beforeEach(() => {
  warnings.length = 0;
  errors.length = 0;
});

// React Testing Library configuration
import '@testing-library/jest-dom';

// Mock window.matchMedia for Ant Design components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for Ant Design components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Add custom error types for better TypeScript support
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toHaveNoConsoleWarnings(): T;
      toHaveNoConsoleErrors(): T;
    }
  }
}

export { warnings, errors };