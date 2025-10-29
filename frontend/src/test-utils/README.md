# Frontend Testing Infrastructure

## Overview

This directory contains comprehensive testing utilities and infrastructure for the MES frontend application. The testing framework is built on **Vitest** and **React Testing Library** with extensive utilities for testing React components, hooks, contexts, and Zustand stores.

## Architecture

```
src/test-utils/
├── index.ts              # Main entry point - exports all utilities
├── render.tsx            # Provider wrappers and render helpers
├── mocks.ts              # API and external dependency mocking
├── factories.ts          # Mock data factories
├── hooks.ts              # Hook testing utilities
├── stores.ts             # Zustand store testing utilities
├── assertions.ts         # Custom assertion helpers
├── helpers.ts            # General testing helpers
└── __tests__/            # Tests for the test utilities themselves
```

## Quick Start

### Basic Component Testing

```typescript
import { renderWithProviders } from '@/test-utils';
import { screen } from '@testing-library/react';
import MyComponent from './MyComponent';

test('renders component correctly', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Hello World')).toBeInTheDocument();
});
```

### Testing with All Providers

```typescript
import { renderWithAllProviders } from '@/test-utils';

test('component with all providers', () => {
  renderWithAllProviders(<ComponentThatNeedsEverything />);
  // Component has access to Router, QueryClient, and SiteContext
});
```

### Hook Testing

```typescript
import { renderHookWithProviders } from '@/test-utils/hooks';
import { useMyHook } from './useMyHook';

test('hook behaves correctly', () => {
  const { result } = renderHookWithProviders(() => useMyHook());
  expect(result.current.value).toBe('expected');
});
```

## Core Utilities

### Render Helpers (`render.tsx`)

#### `renderWithProviders(ui, options)`
Renders components with common providers. Configurable options:
- `withRouter`: Include React Router (default: true)
- `withQueryClient`: Include React Query (default: true)
- `withSiteContext`: Include Site Context (default: false)
- `initialSite`: Mock site data
- `queryClient`: Custom query client

#### `renderWithAllProviders(ui, options)`
Renders with all providers enabled (Router + QueryClient + SiteContext).

#### `renderWithSiteContext(ui, options)`
Renders with only SiteContext provider.

### Mock Factories (`factories.ts`)

#### Site Data
```typescript
import { createMockSite, createMockSites } from '@/test-utils/factories';

const site = createMockSite({
  siteName: 'Custom Site',
  siteCode: 'CUSTOM01',
});
```

#### User Data
```typescript
import { createMockUser } from '@/test-utils/factories';

const user = createMockUser({
  name: 'John Doe',
  permissions: ['read', 'write', 'admin'],
  roles: ['user', 'admin'],
});
```

#### Comments & Collaboration
```typescript
import { createMockComment, createMockCollaborationEvent } from '@/test-utils/factories';

const comment = createMockComment({
  content: 'Test comment',
  type: 'GENERAL',
});
```

### API Mocking (`mocks.ts`)

#### Setup Common Mocks
```typescript
import { setupCommonMocks } from '@/test-utils/mocks';

beforeEach(() => {
  const mocks = setupCommonMocks();
  // mocks.localStorage, mocks.location, mocks.fetch are available
});
```

#### Mock All APIs
```typescript
import { mockAllAPIs } from '@/test-utils/mocks';

beforeEach(() => {
  mockAllAPIs(); // Mocks all API modules
});
```

#### Individual API Mocking
```typescript
import { mockEquipmentAPI, mockWorkOrderAPI } from '@/test-utils/mocks';

beforeEach(() => {
  mockEquipmentAPI();
  mockWorkOrderAPI();
});
```

### Store Testing (`stores.ts`)

#### Testing Zustand Stores
```typescript
import { createTestStore, createMockAuthStore } from '@/test-utils/stores';

test('auth store behavior', () => {
  const { mockStore, updateState } = createMockAuthStore({
    user: mockUser,
    isAuthenticated: true,
  });

  // Test store behavior
  expect(mockStore.isAuthenticated).toBe(true);

  // Update state
  updateState({ isAuthenticated: false });
  expect(mockStore.isAuthenticated).toBe(false);
});
```

#### Store Action Testing
```typescript
import { testStoreAction, waitForStoreState } from '@/test-utils/stores';

test('async store action', async () => {
  await testStoreAction(
    store,
    () => store.login(credentials),
    (state) => state.isAuthenticated === true
  );
});
```

### Hook Testing (`hooks.ts`)

#### Render Hooks with Providers
```typescript
import { renderHookWithProviders, renderHookWithAllProviders } from '@/test-utils/hooks';

test('hook with site context', () => {
  const { result } = renderHookWithSiteContext(() => useMyHook());
  expect(result.current.data).toBeDefined();
});
```

#### Wait for Hook States
```typescript
import { waitForHookToFinishLoading, waitForHookError } from '@/test-utils/hooks';

test('hook loading states', async () => {
  const { result } = renderHookWithProviders(() => useAsyncHook());

  await waitForHookToFinishLoading(result);
  expect(result.current.data).toBeDefined();
});
```

### Custom Assertions (`assertions.ts`)

#### Accessibility Testing
```typescript
import { assertElementIsAccessible } from '@/test-utils/assertions';

test('component accessibility', () => {
  renderWithProviders(<MyComponent />);
  const button = screen.getByRole('button');

  assertElementIsAccessible(button, {
    hasRole: 'button',
    hasLabel: 'Submit Form',
  });
});
```

#### Form Testing
```typescript
import { assertFormField, assertButton } from '@/test-utils/assertions';

test('form validation', () => {
  renderWithProviders(<MyForm />);

  assertFormField(screen.getByLabelText('Email'), {
    required: true,
    invalid: false,
  });

  assertButton(screen.getByRole('button', { name: 'Submit' }), {
    disabled: false,
  });
});
```

#### Component State Testing
```typescript
import { assertLoadingState, assertErrorState } from '@/test-utils/assertions';

test('loading and error states', () => {
  renderWithProviders(<MyComponent />);

  assertLoadingState(); // Looks for loading indicators

  // Trigger error
  fireEvent.click(screen.getByText('Cause Error'));
  assertErrorState('Something went wrong');
});
```

### Test Helpers (`helpers.ts`)

#### User Interactions
```typescript
import { fillForm, submitForm, testModalInteraction } from '@/test-utils/helpers';

test('form submission flow', async () => {
  renderWithProviders(<ContactForm />);

  await fillForm({
    'Name': 'John Doe',
    'Email': 'john@example.com',
  });

  await submitForm('Submit');

  expect(screen.getByText('Form submitted')).toBeInTheDocument();
});
```

#### Complex Interactions
```typescript
import { testTableSorting, testPagination, testDragAndDrop } from '@/test-utils/helpers';

test('table functionality', async () => {
  renderWithProviders(<DataTable />);

  await testTableSorting('Name', ['Alice', 'Bob', 'Charlie']);
  await testPagination(3);
});
```

## Testing Patterns

### 1. Component Testing Pattern

```typescript
describe('MyComponent', () => {
  beforeEach(() => {
    setupCommonMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyComponent />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### 2. Hook Testing Pattern

```typescript
describe('useMyHook', () => {
  beforeEach(() => {
    mockAllAPIs();
  });

  it('returns correct initial state', () => {
    const { result } = renderHookWithProviders(() => useMyHook());

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('handles async operations', async () => {
    const { result } = renderHookWithProviders(() => useMyHook());

    act(() => {
      result.current.fetchData();
    });

    await waitForHookToFinishLoading(result);
    expect(result.current.data).toBeDefined();
  });
});
```

### 3. Store Testing Pattern

```typescript
describe('MyStore', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore(myStoreCreator);
  });

  it('has correct initial state', () => {
    expect(store.getState().value).toBe('initial');
  });

  it('updates state correctly', () => {
    act(() => {
      store.getState().setValue('updated');
    });

    expect(store.getState().value).toBe('updated');
  });
});
```

### 4. Context Testing Pattern

```typescript
describe('MyContext', () => {
  const TestComponent = () => {
    const context = useMyContext();
    return <div data-testid="value">{context.value}</div>;
  };

  it('provides correct context value', () => {
    renderWithProviders(
      <MyProvider value="test">
        <TestComponent />
      </MyProvider>
    );

    expect(screen.getByTestId('value')).toHaveTextContent('test');
  });
});
```

## Best Practices

### 1. Test Organization

- **Group related tests** with `describe` blocks
- **Use descriptive test names** that explain what is being tested
- **Set up and tear down properly** with `beforeEach`/`afterEach`
- **Test one thing at a time** - focused, single-responsibility tests

### 2. Mocking Strategy

- **Mock external dependencies** (APIs, localStorage, etc.)
- **Use factory functions** for consistent test data
- **Mock at the module level** for APIs and services
- **Reset mocks** between tests to avoid state leakage

### 3. Assertions

- **Use semantic queries** (`getByRole`, `getByLabelText`)
- **Test user-visible behavior** rather than implementation details
- **Use custom assertions** for complex validation
- **Test accessibility** with proper ARIA attributes

### 4. Async Testing

- **Use `waitFor`** for asynchronous operations
- **Wrap state updates** in `act()`
- **Test loading states** and error conditions
- **Handle promises** properly with async/await

### 5. Performance

- **Use selective providers** - only include what you need
- **Mock heavy dependencies** to keep tests fast
- **Batch related assertions** when possible
- **Clean up resources** (timers, listeners) in teardown

## Debugging Tests

### Common Issues

1. **Act Warnings**
   ```typescript
   // Wrong
   result.current.setValue('new');

   // Correct
   act(() => {
     result.current.setValue('new');
   });
   ```

2. **Provider Missing**
   ```typescript
   // Error: useContext must be used within Provider
   // Solution: Use renderWithProviders or appropriate wrapper
   ```

3. **Async Race Conditions**
   ```typescript
   // Wrong
   expect(result.current.data).toBeDefined();

   // Correct
   await waitFor(() => {
     expect(result.current.data).toBeDefined();
   });
   ```

### Debug Utilities

```typescript
import { debugTestState, screen } from '@/test-utils/helpers';

test('debug failing test', () => {
  renderWithProviders(<MyComponent />);

  debugTestState('Before interaction');
  // Logs current DOM state

  screen.debug(); // React Testing Library debug
});
```

## Configuration

### Vitest Config

The testing setup is configured in `/frontend/vitest.config.ts`:

- **Test environment**: jsdom
- **Coverage**: c8 with 50% thresholds
- **Setup file**: `/src/tests/setup.ts`
- **Path mapping**: Matches TypeScript paths

### Coverage Targets

- **Statements**: 50%
- **Branches**: 50%
- **Functions**: 50%
- **Lines**: 50%

Current focus areas for achieving 25%+ coverage:
1. Core hooks (usePresence, useRealTimeCollaboration)
2. Context providers (SiteContext)
3. Zustand stores (AuthStore)
4. Critical UI components
5. API client modules

## Extending the Framework

### Adding New Test Utilities

1. **Create utility functions** in appropriate module
2. **Export from index.ts** for easy importing
3. **Add TypeScript types** for better DX
4. **Document usage** with examples
5. **Test the utilities** themselves

### Custom Assertions

```typescript
// In assertions.ts
export function assertMyCustomThing(element: HTMLElement, expected: string) {
  expect(element).toHaveAttribute('data-custom', expected);
  expect(element).toBeVisible();
}
```

### Factory Extensions

```typescript
// In factories.ts
export function createMockMyEntity(overrides: Partial<MyEntity> = {}): MyEntity {
  return {
    id: 'entity-1',
    name: 'Test Entity',
    ...overrides,
  };
}
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Accessibility Testing](https://testing-library.com/docs/guide-which-query)

This testing infrastructure provides a solid foundation for comprehensive frontend testing. The utilities are designed to be intuitive, reusable, and maintainable as the application grows.