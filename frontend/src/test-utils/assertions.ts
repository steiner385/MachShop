/**
 * Custom Assertions and Matchers
 *
 * Custom assertion helpers and jest matchers for testing
 * React components, hooks, and application-specific behavior.
 */

import { expect } from 'vitest';
import { screen, within } from '@testing-library/react';

/**
 * Assert that an element is visible and accessible
 */
export function assertElementIsAccessible(element: HTMLElement, options: {
  hasRole?: string;
  hasLabel?: string;
  hasDescription?: string;
} = {}) {
  // Element should be visible
  expect(element).toBeVisible();
  expect(element).toBeInTheDocument();

  // Check accessibility attributes if specified
  if (options.hasRole) {
    expect(element).toHaveAttribute('role', options.hasRole);
  }

  if (options.hasLabel) {
    expect(element).toHaveAccessibleName(options.hasLabel);
  }

  if (options.hasDescription) {
    expect(element).toHaveAccessibleDescription(options.hasDescription);
  }
}

/**
 * Assert that a form field is properly set up
 */
export function assertFormField(fieldElement: HTMLElement, options: {
  label?: string;
  required?: boolean;
  invalid?: boolean;
  value?: string;
  placeholder?: string;
}) {
  expect(fieldElement).toBeInTheDocument();

  if (options.label) {
    expect(fieldElement).toHaveAccessibleName(options.label);
  }

  if (options.required !== undefined) {
    if (options.required) {
      expect(fieldElement).toBeRequired();
    } else {
      expect(fieldElement).not.toBeRequired();
    }
  }

  if (options.invalid !== undefined) {
    if (options.invalid) {
      expect(fieldElement).toBeInvalid();
    } else {
      expect(fieldElement).toBeValid();
    }
  }

  if (options.value !== undefined) {
    expect(fieldElement).toHaveValue(options.value);
  }

  if (options.placeholder) {
    expect(fieldElement).toHaveAttribute('placeholder', options.placeholder);
  }
}

/**
 * Assert that a button is properly configured
 */
export function assertButton(buttonElement: HTMLElement, options: {
  text?: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: string;
} = {}) {
  expect(buttonElement).toBeInTheDocument();
  expect(buttonElement).toHaveRole('button');

  if (options.text) {
    expect(buttonElement).toHaveTextContent(options.text);
  }

  if (options.disabled !== undefined) {
    if (options.disabled) {
      expect(buttonElement).toBeDisabled();
    } else {
      expect(buttonElement).toBeEnabled();
    }
  }

  if (options.loading) {
    // Look for loading indicators
    expect(buttonElement).toHaveAttribute('aria-busy', 'true');
  }

  if (options.variant) {
    expect(buttonElement).toHaveClass(expect.stringContaining(options.variant));
  }
}

/**
 * Assert that a loading state is displayed correctly
 */
export function assertLoadingState(container: HTMLElement = document.body) {
  const loadingIndicators = [
    () => within(container).queryByText(/loading/i),
    () => within(container).queryByRole('progressbar'),
    () => within(container).queryByTestId('loading-spinner'),
    () => within(container).queryByLabelText(/loading/i),
  ];

  const foundIndicator = loadingIndicators.some(finder => finder());
  expect(foundIndicator).toBeTruthy();
}

/**
 * Assert that an error state is displayed correctly
 */
export function assertErrorState(errorMessage: string, container: HTMLElement = document.body) {
  const errorElement = within(container).getByRole('alert') ||
                      within(container).getByText(errorMessage);

  expect(errorElement).toBeInTheDocument();
  expect(errorElement).toBeVisible();
  expect(errorElement).toHaveTextContent(errorMessage);
}

/**
 * Assert that a table has the expected structure
 */
export function assertTable(tableElement: HTMLElement, options: {
  headers?: string[];
  rowCount?: number;
  hasCaption?: string;
} = {}) {
  expect(tableElement).toHaveRole('table');

  if (options.hasCaption) {
    const caption = within(tableElement).getByText(options.hasCaption);
    expect(caption).toBeInTheDocument();
  }

  if (options.headers) {
    options.headers.forEach(header => {
      const headerElement = within(tableElement).getByRole('columnheader', { name: header });
      expect(headerElement).toBeInTheDocument();
    });
  }

  if (options.rowCount !== undefined) {
    const rows = within(tableElement).getAllByRole('row');
    // Account for header row
    const dataRowCount = options.headers ? options.rowCount + 1 : options.rowCount;
    expect(rows).toHaveLength(dataRowCount);
  }
}

/**
 * Assert that a modal/dialog is properly configured
 */
export function assertModal(modalElement: HTMLElement, options: {
  title?: string;
  isOpen?: boolean;
  hasCloseButton?: boolean;
} = {}) {
  if (options.isOpen !== false) {
    expect(modalElement).toBeInTheDocument();
    expect(modalElement).toHaveRole('dialog');
  } else {
    expect(modalElement).not.toBeInTheDocument();
  }

  if (options.title && options.isOpen !== false) {
    expect(modalElement).toHaveAccessibleName(options.title);
  }

  if (options.hasCloseButton && options.isOpen !== false) {
    const closeButton = within(modalElement).getByRole('button', { name: /close|×/i });
    expect(closeButton).toBeInTheDocument();
  }
}

/**
 * Assert that a list has the expected items
 */
export function assertList(listElement: HTMLElement, expectedItems: string[]) {
  expect(listElement).toHaveRole('list');

  const listItems = within(listElement).getAllByRole('listitem');
  expect(listItems).toHaveLength(expectedItems.length);

  expectedItems.forEach((item, index) => {
    expect(listItems[index]).toHaveTextContent(item);
  });
}

/**
 * Assert that navigation is accessible
 */
export function assertNavigation(navElement: HTMLElement, expectedLinks: string[]) {
  expect(navElement).toHaveRole('navigation');

  expectedLinks.forEach(linkText => {
    const link = within(navElement).getByRole('link', { name: linkText });
    expect(link).toBeInTheDocument();
    expect(link).toBeVisible();
  });
}

/**
 * Assert that a component renders without errors
 */
export function assertNoRenderErrors(container: HTMLElement = document.body) {
  // Check for common error boundaries or error messages
  const errorTexts = [
    /something went wrong/i,
    /error boundary/i,
    /unexpected error/i,
    /failed to render/i,
  ];

  errorTexts.forEach(errorPattern => {
    expect(within(container).queryByText(errorPattern)).not.toBeInTheDocument();
  });
}

/**
 * Assert that real-time features are working
 */
export function assertRealTimeConnection(container: HTMLElement = document.body) {
  // Look for connection status indicators
  const connectionIndicators = [
    () => within(container).queryByText(/connected/i),
    () => within(container).queryByTestId('connection-status'),
    () => within(container).queryByLabelText(/connection/i),
  ];

  const foundIndicator = connectionIndicators.some(finder => finder());
  expect(foundIndicator).toBeTruthy();
}

/**
 * Assert that user presence is displayed
 */
export function assertUserPresence(container: HTMLElement = document.body, expectedUsers: string[] = []) {
  const presenceContainer = within(container).queryByTestId('user-presence') ||
                           within(container).queryByLabelText(/active users/i);

  if (expectedUsers.length > 0) {
    expect(presenceContainer).toBeInTheDocument();

    expectedUsers.forEach(username => {
      expect(within(presenceContainer!).getByText(username)).toBeInTheDocument();
    });
  }
}

/**
 * Assert that a tooltip is displayed correctly
 */
export function assertTooltip(triggerElement: HTMLElement, expectedTooltipText: string) {
  expect(triggerElement).toHaveAttribute('title', expectedTooltipText);
  // Or check for aria-describedby pointing to tooltip
  const describedBy = triggerElement.getAttribute('aria-describedby');
  if (describedBy) {
    const tooltip = document.getElementById(describedBy);
    expect(tooltip).toHaveTextContent(expectedTooltipText);
  }
}

/**
 * Assert that keyboard navigation works
 */
export function assertKeyboardNavigation(container: HTMLElement, focusableElements: HTMLElement[]) {
  focusableElements.forEach(element => {
    expect(element).toHaveAttribute('tabindex', expect.not.stringMatching('-1'));
  });

  // Check that elements can receive focus
  focusableElements.forEach(element => {
    element.focus();
    expect(element).toHaveFocus();
  });
}

/**
 * Assert that a component has proper ARIA attributes
 */
export function assertARIACompliance(element: HTMLElement, requiredAttributes: Record<string, string>) {
  Object.entries(requiredAttributes).forEach(([attribute, value]) => {
    expect(element).toHaveAttribute(attribute, value);
  });
}

/**
 * Assert that a data table is sortable
 */
export function assertSortableTable(tableElement: HTMLElement, sortableColumns: string[]) {
  sortableColumns.forEach(columnName => {
    const header = within(tableElement).getByRole('columnheader', { name: columnName });
    expect(header).toHaveAttribute('aria-sort');
    // Should be clickable
    expect(header).toHaveStyle('cursor: pointer') ||
    expect(within(header).queryByRole('button')).toBeInTheDocument();
  });
}

/**
 * Assert component performance (using performance markers)
 */
export function assertPerformance(componentName: string, maxRenderTime: number = 100) {
  // This would integrate with performance measurement tools
  const marks = performance.getEntriesByType('mark').filter(mark =>
    mark.name.includes(componentName)
  );

  if (marks.length >= 2) {
    const startMark = marks.find(mark => mark.name.includes('start'));
    const endMark = marks.find(mark => mark.name.includes('end'));

    if (startMark && endMark) {
      const renderTime = endMark.startTime - startMark.startTime;
      expect(renderTime).toBeLessThan(maxRenderTime);
    }
  }
}

/**
 * Create custom matcher for testing MES-specific functionality
 */
export const customMatchers = {
  toBeValidOEEValue(received: number) {
    const pass = received >= 0 && received <= 100;
    return {
      message: () => `expected ${received} to be a valid OEE value (0-100)`,
      pass,
    };
  },

  toBeValidWorkOrderStatus(received: string) {
    const validStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    const pass = validStatuses.includes(received);
    return {
      message: () => `expected ${received} to be a valid work order status`,
      pass,
    };
  },

  toHaveValidSiteCode(received: string) {
    const siteCodePattern = /^[A-Z]{2,4}\d{2}$/;
    const pass = siteCodePattern.test(received);
    return {
      message: () => `expected ${received} to match site code pattern (e.g., TMS01)`,
      pass,
    };
  },
};

// Extend expect with custom matchers
expect.extend(customMatchers);