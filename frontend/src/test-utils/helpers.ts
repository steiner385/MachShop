/**
 * General Test Helpers
 *
 * General utility functions for testing that don't fit into other
 * specific categories. Includes debugging helpers, wait utilities,
 * and common test patterns.
 */

import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, expect } from 'vitest';

/**
 * Wait for an element to appear with a custom timeout
 */
export async function waitForElement(
  selector: () => HTMLElement | null,
  timeout: number = 5000
): Promise<HTMLElement> {
  return waitFor(
    () => {
      const element = selector();
      if (!element) {
        throw new Error('Element not found');
      }
      return element;
    },
    { timeout }
  );
}

/**
 * Wait for an element to disappear
 */
export async function waitForElementToDisappear(
  selector: () => HTMLElement | null,
  timeout: number = 5000
): Promise<void> {
  return waitFor(
    () => {
      const element = selector();
      if (element) {
        throw new Error('Element still present');
      }
    },
    { timeout }
  );
}

/**
 * Wait for a specific text content to appear
 */
export async function waitForText(text: string | RegExp, timeout: number = 5000): Promise<HTMLElement> {
  return waitFor(
    () => {
      const element = screen.getByText(text);
      return element;
    },
    { timeout }
  );
}

/**
 * Create a user event instance with default options
 */
export function createUser() {
  return userEvent.setup({
    // Add any default options for user events
    advanceTimers: vi.advanceTimersByTime,
  });
}

/**
 * Fill form fields with data
 */
export async function fillForm(formData: Record<string, string>) {
  const user = createUser();

  for (const [fieldName, value] of Object.entries(formData)) {
    const field = screen.getByRole('textbox', { name: new RegExp(fieldName, 'i') }) ||
                  screen.getByLabelText(new RegExp(fieldName, 'i'));

    await user.clear(field);
    await user.type(field, value);
  }
}

/**
 * Submit a form by clicking the submit button
 */
export async function submitForm(submitButtonText: string | RegExp = /submit|save|create/i) {
  const user = createUser();
  const submitButton = screen.getByRole('button', { name: submitButtonText });
  await user.click(submitButton);
}

/**
 * Navigate through a multi-step form
 */
export async function navigateMultiStepForm(steps: Array<{
  stepName: string;
  formData?: Record<string, string>;
  nextButtonText?: string;
}>) {
  const user = createUser();

  for (const step of steps) {
    // Wait for step to be visible
    await waitForText(step.stepName);

    // Fill form data if provided
    if (step.formData) {
      await fillForm(step.formData);
    }

    // Click next button if not the last step
    if (step.nextButtonText) {
      const nextButton = screen.getByRole('button', { name: step.nextButtonText });
      await user.click(nextButton);
    }
  }
}

/**
 * Test table interactions (sorting, pagination, etc.)
 */
export async function testTableSorting(columnName: string, expectedOrder: string[]) {
  const user = createUser();

  // Find and click the column header
  const header = screen.getByRole('columnheader', { name: columnName });
  await user.click(header);

  // Wait for sorting to complete
  await waitFor(() => {
    const rows = screen.getAllByRole('row');
    // Skip header row
    const dataRows = rows.slice(1);

    expectedOrder.forEach((expectedText, index) => {
      expect(dataRows[index]).toHaveTextContent(expectedText);
    });
  });
}

/**
 * Test pagination
 */
export async function testPagination(totalPages: number) {
  const user = createUser();

  for (let page = 1; page <= totalPages; page++) {
    // Navigate to page
    const pageButton = screen.getByRole('button', { name: page.toString() });
    await user.click(pageButton);

    // Wait for page content to load
    await waitFor(() => {
      expect(screen.getByText(`Page ${page}`)).toBeInTheDocument();
    });
  }
}

/**
 * Test modal interactions
 */
export async function testModalInteraction(
  triggerButtonText: string,
  modalTitle: string,
  closeMethod: 'button' | 'escape' | 'backdrop' = 'button'
) {
  const user = createUser();

  // Open modal
  const triggerButton = screen.getByRole('button', { name: triggerButtonText });
  await user.click(triggerButton);

  // Verify modal is open
  const modal = await waitForElement(() => screen.getByRole('dialog'));
  expect(modal).toHaveAccessibleName(modalTitle);

  // Close modal based on method
  switch (closeMethod) {
    case 'button':
      const closeButton = screen.getByRole('button', { name: /close|×/i });
      await user.click(closeButton);
      break;
    case 'escape':
      await user.keyboard('{Escape}');
      break;
    case 'backdrop':
      // Click outside the modal content
      await user.click(modal);
      break;
  }

  // Verify modal is closed
  await waitForElementToDisappear(() => screen.queryByRole('dialog'));
}

/**
 * Test drag and drop functionality
 */
export async function testDragAndDrop(
  sourceSelector: string,
  targetSelector: string
) {
  const user = createUser();

  const sourceElement = screen.getByTestId(sourceSelector);
  const targetElement = screen.getByTestId(targetSelector);

  // Perform drag and drop
  await user.pointer([
    { keys: '[MouseLeft>]', target: sourceElement },
    { pointerName: 'mouse', target: targetElement },
    { keys: '[/MouseLeft]' },
  ]);
}

/**
 * Debug test state by logging useful information
 */
export function debugTestState(label: string = 'Debug') {
  console.log(`\n=== ${label} ===`);
  console.log('DOM:', document.body.innerHTML);

  // Log current URL if using router
  if (window.location) {
    console.log('URL:', window.location.href);
  }

  // Log React DevTools state if available
  if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('React DevTools available');
  }

  console.log('=================\n');
}

/**
 * Wait for async operations to complete
 */
export async function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Create a delay for testing timing-sensitive code
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test keyboard navigation through a set of elements
 */
export async function testKeyboardNavigation(elements: HTMLElement[]) {
  const user = createUser();

  for (let i = 0; i < elements.length; i++) {
    await user.tab();
    expect(elements[i]).toHaveFocus();
  }
}

/**
 * Test focus management (e.g., after modal closes)
 */
export async function testFocusManagement(
  action: () => Promise<void>,
  expectedFocusedElement: HTMLElement
) {
  await action();
  await waitFor(() => {
    expect(expectedFocusedElement).toHaveFocus();
  });
}

/**
 * Simulate network conditions for testing
 */
export function simulateNetworkConditions(condition: 'offline' | 'slow' | 'normal') {
  switch (condition) {
    case 'offline':
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      break;
    case 'slow':
      // Mock slow network responses
      vi.spyOn(global, 'fetch').mockImplementation(
        (...args: any[]) => new Promise(resolve => {
          setTimeout(() => {
            resolve(fetch(...args));
          }, 2000);
        })
      );
      break;
    case 'normal':
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      // Restore normal fetch if mocked
      if (vi.isMockFunction(global.fetch)) {
        (global.fetch as any).mockRestore();
      }
      break;
  }
}

/**
 * Test error boundaries
 */
export function triggerErrorBoundary(component: React.ComponentType<any>) {
  // Create a component that throws an error
  const ThrowError = () => {
    throw new Error('Test error for error boundary');
  };

  // This would be used in a test to verify error boundary behavior
  return ThrowError;
}

/**
 * Generate test data for lists
 */
export function generateTestData<T>(
  factory: (index: number) => T,
  count: number
): T[] {
  return Array.from({ length: count }, (_, index) => factory(index));
}

/**
 * Test infinite scroll or lazy loading
 */
export async function testInfiniteScroll(scrollContainer: HTMLElement, expectedItems: number) {
  // Scroll to bottom
  scrollContainer.scrollTop = scrollContainer.scrollHeight;

  // Wait for new items to load
  await waitFor(() => {
    const items = scrollContainer.querySelectorAll('[data-testid="list-item"]');
    expect(items).toHaveLength(expectedItems);
  });
}

/**
 * Test responsive behavior
 */
export function testResponsiveBreakpoint(breakpoint: number) {
  // Mock window dimensions
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: breakpoint,
  });

  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
}

/**
 * Cleanup helper for tests
 */
export function cleanupTest() {
  // Clear localStorage
  localStorage.clear();

  // Clear sessionStorage
  sessionStorage.clear();

  // Reset window location
  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, document.title, '/');
  }

  // Clear any remaining timers
  vi.clearAllTimers();

  // Reset all mocks
  vi.clearAllMocks();
}

/**
 * Setup test environment for each test
 */
export function setupTest() {
  // Setup default window dimensions
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  });

  // Mock console methods in test environment
  if (process.env.NODE_ENV === 'test') {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  }
}