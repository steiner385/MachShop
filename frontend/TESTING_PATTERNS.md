# Frontend Component Testing Patterns & Best Practices

This document outlines the testing patterns and best practices established during the Epic 4: Frontend Component Testing - Phase 1 (Core) implementation.

## Overview

We've implemented comprehensive test suites for 25 core frontend components using Vitest + React Testing Library, achieving systematic test coverage across Foundation and Core Feature components.

## Testing Architecture

### Test Framework Stack
- **Testing Framework**: Vitest (v1.6.1)
- **Component Testing**: React Testing Library
- **User Interaction**: @testing-library/user-event
- **Mocking**: Vitest built-in mocking (vi.mock)
- **Coverage**: V8 provider with 50% threshold

### Test Organization Structure
```
src/components/
├── ComponentName/
│   ├── ComponentName.tsx
│   └── __tests__/
│       └── ComponentName.test.tsx
```

## Core Testing Patterns

### 1. Test File Structure

Every component test follows this consistent structure:

```typescript
/**
 * ComponentName Component Tests
 * Comprehensive test suite for [brief description]
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { renderWithProviders } from '@/test-utils/render';
import { ComponentName } from '../ComponentName';
// Import mocks and types

// Mock external dependencies
vi.mock('@/store/storeModule');
vi.mock('external-library');

describe('ComponentName', () => {
  // Mock data setup
  const mockData = { /* test data */ };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks
  });

  describe('Component Rendering', () => {
    // Basic rendering tests
  });

  describe('User Interactions', () => {
    // User event tests
  });

  describe('Data States', () => {
    // Loading, error, empty states
  });

  describe('Accessibility', () => {
    // A11y tests
  });
});
```

### 2. Component Categories Tested

#### Foundation Components (6 categories)
1. **Dashboard Components** - OEEMetricsCard, KPIDashboard, ProductionMetrics
2. **Layout Components** - MainLayout, Sidebar, Header
3. **Auth Components** - Login, ProtectedRoute, PermissionGate
4. **Error Handling Components** - ErrorBoundary, NotFound, ErrorDisplay
5. **Search Components** - GlobalSearch, SearchResults, SearchFilters
6. **Site Components** - SiteSelector, SiteConfiguration

#### Core Feature Components (5 categories)
7. **WorkOrder Components** - WorkOrderList, WorkOrderDetail, StatusUpdate
8. **Quality Components** - QualityDashboard, InspectionForm, NonConformance
9. **Material Components** - MaterialsList, InventoryTracker, LotManagement
10. **Equipment Components** - MaintenanceList, EquipmentStatus, OEETracking
11. **SPC Components** - ControlChart, CapabilityReport, RuleViolationAlert

### 3. Mock Patterns

#### Store Mocking Pattern
```typescript
// Mock store hook
vi.mock('@/store/componentStore');
const mockUseComponentStore = vi.mocked(useComponentStore);

// Default store state
const defaultStoreState = {
  data: mockData,
  loading: false,
  error: null,
  actions: {
    fetchData: vi.fn(),
    updateData: vi.fn(),
    clearErrors: vi.fn(),
  },
};

beforeEach(() => {
  mockUseComponentStore.mockReturnValue(defaultStoreState);
});
```

#### Router Mocking Pattern
```typescript
// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});
```

#### External Library Mocking
```typescript
// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  };
});
```

### 4. Test Data Patterns

#### Comprehensive Mock Data
```typescript
const mockItems = [
  {
    id: 'item-1',
    name: 'Primary Item',
    status: 'ACTIVE',
    // Include all relevant fields
    metadata: { /* complex nested data */ },
    relationships: ['rel-1', 'rel-2'],
  },
  {
    id: 'item-2',
    name: 'Secondary Item',
    status: 'INACTIVE',
    // Different state for variety
  },
];

const mockStatistics = {
  total: 25,
  active: 20,
  inactive: 5,
  percentageChange: 5.2,
};
```

#### Edge Case Data
```typescript
const mockEdgeCases = {
  emptyData: [],
  nullValues: { data: null, error: null },
  largeNumbers: { count: 999999, percentage: 99.99 },
  specialCharacters: { name: 'Test "Special" & <Characters>' },
};
```

### 5. User Interaction Testing

#### Standard User Event Pattern
```typescript
describe('User Interactions', () => {
  it('should handle search input and submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Component />);

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'test query');
    await user.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(mockSearchAction).toHaveBeenCalledWith('test query');
    });
  });
});
```

#### Complex Form Interactions
```typescript
it('should handle multi-step form submission', async () => {
  const user = userEvent.setup();
  renderWithProviders(<FormComponent />);

  // Step 1: Fill basic fields
  await user.type(screen.getByLabelText('Name'), 'Test Name');
  await user.selectOptions(screen.getByLabelText('Type'), 'option1');

  // Step 2: Navigate to next step
  await user.click(screen.getByRole('button', { name: /next/i }));

  // Step 3: Submit form
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(mockSubmitAction).toHaveBeenCalledWith({
      name: 'Test Name',
      type: 'option1',
    });
  });
});
```

### 6. State Testing Patterns

#### Loading States
```typescript
it('should show loading state during data fetch', async () => {
  mockUseStore.mockReturnValue({
    ...defaultState,
    loading: true,
  });

  renderWithProviders(<Component />);
  expect(screen.getByTestId('spinner')).toBeInTheDocument();
});
```

#### Error States
```typescript
it('should display error message on fetch failure', async () => {
  const errorMessage = 'Failed to load data';
  mockUseStore.mockReturnValue({
    ...defaultState,
    error: errorMessage,
  });

  renderWithProviders(<Component />);
  expect(screen.getByText(errorMessage)).toBeInTheDocument();
});
```

#### Empty States
```typescript
it('should show empty state when no data available', async () => {
  mockUseStore.mockReturnValue({
    ...defaultState,
    data: [],
  });

  renderWithProviders(<Component />);
  expect(screen.getByText('No items found')).toBeInTheDocument();
});
```

### 7. Accessibility Testing

#### Standard A11y Checks
```typescript
describe('Accessibility', () => {
  it('should have proper ARIA labels and roles', async () => {
    renderWithProviders(<Component />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Required Field')).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Component />);

    const firstButton = screen.getByRole('button', { name: /first/i });
    firstButton.focus();

    await user.keyboard('{Tab}');

    const secondButton = screen.getByRole('button', { name: /second/i });
    expect(secondButton).toHaveFocus();
  });
});
```

### 8. Coverage Expectations

#### Component Coverage Targets
- **Line Coverage**: 65%+ per component
- **Function Coverage**: 70%+ per component
- **Branch Coverage**: 60%+ per component
- **Statement Coverage**: 65%+ per component

#### Critical Path Coverage
- All user interaction paths
- All error handling paths
- All data state variations (loading, error, success, empty)
- All conditional rendering logic

### 9. Test Utilities Usage

#### Render Helper
```typescript
import { renderWithProviders } from '@/test-utils/render';

// Always use renderWithProviders for component testing
// It provides all necessary context providers
const { rerender, unmount } = renderWithProviders(<Component />);
```

#### Mock Factories
```typescript
// Use existing mock factories from test-utils
import { createMockWorkOrder, createMockUser } from '@/test-utils/render';

const mockWorkOrder = createMockWorkOrder({
  id: 'wo-1',
  status: 'IN_PROGRESS',
});
```

#### Custom Render Options
```typescript
// For components requiring specific provider configurations
renderWithProviders(<Component />, {
  initialState: { user: mockUser },
  route: '/custom-route',
});
```

### 10. Performance Testing Considerations

#### Large Dataset Testing
```typescript
it('should handle large datasets efficiently', async () => {
  const largeDataset = Array.from({ length: 1000 }, (_, i) =>
    createMockItem({ id: `item-${i}` })
  );

  mockUseStore.mockReturnValue({
    ...defaultState,
    data: largeDataset,
  });

  renderWithProviders(<Component />);

  // Verify virtualization or pagination
  expect(screen.getAllByTestId('item-row')).toHaveLength(50); // First page
});
```

### 11. Integration Testing Patterns

#### Component Communication
```typescript
it('should update parent component on child action', async () => {
  const mockOnUpdate = vi.fn();
  renderWithProviders(<ParentComponent onUpdate={mockOnUpdate} />);

  const childButton = screen.getByRole('button', { name: /child action/i });
  await user.click(childButton);

  expect(mockOnUpdate).toHaveBeenCalledWith(expectedData);
});
```

### 12. Best Practices Summary

#### Do's ✅
- Use `renderWithProviders` for all component tests
- Test user behavior, not implementation details
- Mock external dependencies consistently
- Include accessibility testing
- Test all data states (loading, error, success, empty)
- Use descriptive test names that explain expected behavior
- Group related tests in describe blocks
- Clear mocks between tests with `beforeEach`

#### Don'ts ❌
- Don't test internal component state directly
- Don't rely on CSS selectors or test IDs for critical functionality
- Don't mock React Testing Library utilities
- Don't test library code (React, Antd, etc.)
- Don't write overly complex test setup
- Don't skip error path testing
- Don't ignore TypeScript errors in tests

### 13. Common Patterns by Component Type

#### Dashboard Components
- Statistics rendering and formatting
- Real-time data updates
- Chart and visualization testing
- Responsive layout verification

#### Form Components
- Input validation testing
- Multi-step form navigation
- Submit/cancel behavior
- Field interdependencies

#### List Components
- Data display and formatting
- Sorting and filtering
- Pagination testing
- Item selection/actions

#### Modal/Dialog Components
- Open/close behavior
- Form submission within modals
- Backdrop click handling
- Escape key functionality

## Conclusion

These patterns ensure consistent, maintainable, and comprehensive test coverage across all frontend components. They provide a solid foundation for future development and maintain high code quality standards.

For questions or improvements to these patterns, refer to the component test files in the codebase for concrete examples.