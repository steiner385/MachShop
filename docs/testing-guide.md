# Testing Guide for Manufacturing Execution System

## Overview

This guide provides comprehensive patterns and best practices for testing in the Manufacturing Execution System (MES). Our goal is to achieve **50% test coverage** while maintaining high-quality, maintainable tests.

## Testing Framework & Tools

### Backend Testing (Vitest)
- **Framework**: Vitest 1.6.1 with v8 coverage provider
- **Environment**: Node.js for backend services
- **Mocking**: `vi.mock()` for dependencies
- **Database**: Test PostgreSQL database with Prisma

### Frontend Testing (Vitest + React Testing Library)
- **Framework**: Vitest with jsdom environment
- **Testing Library**: React Testing Library for component testing
- **User Events**: `@testing-library/user-event` for interactions
- **Mocking**: MSW (Mock Service Worker) for API calls

## Coverage Targets

### Backend Services
- **Statements**: 70-80%
- **Branches**: 65-75%
- **Functions**: 75-85%
- **Lines**: 70-80%

### Frontend Components
- **Statements**: 60-70%
- **Branches**: 60-70%
- **Functions**: 65-75%
- **Lines**: 60-70%

## Backend Testing Patterns

### Service Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceName } from '../../services/ServiceName';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    model: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  })),
}));

describe('ServiceName', () => {
  let service: ServiceName;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    service = new ServiceName(mockPrisma);
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = { id: 'test-id' };
      const expectedOutput = { id: 'test-id', name: 'Test' };
      mockPrisma.model.findUnique.mockResolvedValue(expectedOutput);

      // Act
      const result = await service.methodName(input.id);

      // Assert
      expect(result).toEqual(expectedOutput);
      expect(mockPrisma.model.findUnique).toHaveBeenCalledWith({
        where: { id: input.id }
      });
    });

    it('should handle error case', async () => {
      // Arrange
      const errorMessage = 'Database error';
      mockPrisma.model.findUnique.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(service.methodName('invalid-id'))
        .rejects.toThrow(errorMessage);
    });

    it('should validate inputs', async () => {
      // Act & Assert
      await expect(service.methodName(''))
        .rejects.toThrow('Invalid input');
    });
  });
});
```

### Prisma Mocking Patterns

#### Complete Model Mock
```typescript
const createMockPrisma = () => ({
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  workOrder: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  // Include all models used by the service
});
```

#### Transaction Mocking
```typescript
mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
  return callback(mockPrisma);
});
```

### Error Handling Testing

```typescript
describe('error handling', () => {
  it('should handle database connection errors', async () => {
    mockPrisma.model.create.mockRejectedValue(
      new Error('Connection timeout')
    );

    await expect(service.create(validInput))
      .rejects.toThrow('Connection timeout');
  });

  it('should handle validation errors', async () => {
    const invalidInput = { /* invalid data */ };

    await expect(service.create(invalidInput))
      .rejects.toThrow('Validation failed');
  });

  it('should handle not found errors', async () => {
    mockPrisma.model.findUnique.mockResolvedValue(null);

    await expect(service.getById('non-existent-id'))
      .rejects.toThrow('Entity not found');
  });
});
```

## Frontend Testing Patterns

### Component Test Structure

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentName } from '../ComponentName';
import { renderWithProviders } from '@/test-utils';
import * as api from '@/api/module';

// Mock API calls
vi.mock('@/api/module', () => ({
  getData: vi.fn(),
  postData: vi.fn(),
}));

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    api.getData.mockImplementation(() => new Promise(() => {}));

    render(<ComponentName />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    api.getData.mockRejectedValue(new Error('API Error'));

    render(<ComponentName />);

    await waitFor(() => {
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });
  });
});
```

### Provider Wrapper Pattern

```typescript
// test-utils/index.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SiteProvider } from '@/contexts/SiteContext';
import { AuthProvider } from '@/contexts/AuthContext';

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SiteProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SiteProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllProviders, ...options });

export { customRender as render };
export * from '@testing-library/react';
```

### Form Testing Patterns

```typescript
describe('form interactions', () => {
  it('should handle form submission', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn();

    render(<FormComponent onSubmit={mockOnSubmit} />);

    // Fill form fields
    await user.type(screen.getByLabelText(/name/i), 'Test Name');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');

    // Submit form
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Verify submission
    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'Test Name',
      email: 'test@example.com'
    });
  });

  it('should show validation errors', async () => {
    const user = userEvent.setup();
    render(<FormComponent />);

    // Submit without filling required fields
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });
});
```

### API Integration Testing

```typescript
import { rest } from 'msw';
import { server } from '@/test-utils/server';

describe('API integration', () => {
  it('should fetch and display data', async () => {
    // Mock API response
    server.use(
      rest.get('/api/items', (req, res, ctx) => {
        return res(ctx.json({
          items: [{ id: '1', name: 'Test Item' }]
        }));
      })
    );

    render(<ItemList />);

    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
  });

  it('should handle API errors', async () => {
    server.use(
      rest.get('/api/items', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<ItemList />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load items')).toBeInTheDocument();
    });
  });
});
```

## Store Testing (Zustand)

```typescript
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '@/stores/authStore';

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('should handle login', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.login('user@example.com', 'password');
    });

    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle logout', () => {
    const { result } = renderHook(() => useAuthStore());

    // First login
    act(() => {
      result.current.login('user@example.com', 'password');
    });

    // Then logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

## Custom Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { usePresence } from '@/hooks/usePresence';

describe('usePresence', () => {
  it('should track user presence', () => {
    const { result } = renderHook(() => usePresence('user-123'));

    expect(result.current.isOnline).toBe(false);

    act(() => {
      result.current.setOnline();
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => usePresence('user-123'));

    // Unmount should not throw
    expect(() => unmount()).not.toThrow();
  });
});
```

## Testing Best Practices

### 1. Test Structure (AAA Pattern)
```typescript
it('should do something', () => {
  // Arrange - Set up test data and mocks
  const input = { id: 'test' };
  mockFunction.mockReturnValue(expectedValue);

  // Act - Execute the function under test
  const result = functionUnderTest(input);

  // Assert - Verify the results
  expect(result).toEqual(expected);
  expect(mockFunction).toHaveBeenCalledWith(input);
});
```

### 2. Descriptive Test Names
- ✅ `should create work order with valid input`
- ✅ `should throw error when required field is missing`
- ❌ `test create method`
- ❌ `should work`

### 3. Independent Tests
```typescript
describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    // Reset state before each test
    service = new ServiceName();
    vi.clearAllMocks();
  });

  // Each test should be independent
});
```

### 4. Mock Management
```typescript
// ✅ Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

// ✅ Mock at the right level
vi.mock('@/api/client', () => ({
  apiCall: vi.fn(),
}));

// ❌ Don't mock implementation details
// Mock the interface, not the internals
```

### 5. Error Testing
```typescript
// Test both success and failure cases
describe('methodName', () => {
  it('should succeed with valid input', () => {
    // Happy path test
  });

  it('should handle network errors', () => {
    // Error case test
  });

  it('should validate input parameters', () => {
    // Input validation test
  });
});
```

## Coverage Guidelines

### What to Test
- ✅ Business logic and calculations
- ✅ Error handling and validation
- ✅ User interactions and workflows
- ✅ API integration points
- ✅ State management logic

### What Not to Test
- ❌ Third-party library internals
- ❌ Simple getters/setters
- ❌ Configuration constants
- ❌ Type definitions

### Coverage Quality Over Quantity
```typescript
// ✅ Good coverage - tests meaningful behavior
it('should calculate total price with tax', () => {
  const result = calculateTotal(100, 0.08);
  expect(result).toBe(108);
});

// ❌ Poor coverage - tests trivial code
it('should return input value', () => {
  const result = identity(5);
  expect(result).toBe(5);
});
```

## Common Testing Patterns

### Async Testing
```typescript
// ✅ Use async/await
it('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});

// ✅ Use waitFor for DOM updates
it('should show loading state', async () => {
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });
});
```

### Error Boundary Testing
```typescript
it('should handle component errors', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

## Test File Organization

```
src/
├── tests/
│   ├── services/           # Backend service tests
│   │   ├── RoutingService.test.ts
│   │   └── QualityService.test.ts
│   ├── utils/              # Utility function tests
│   │   └── validation.test.ts
│   └── setup.ts            # Test setup configuration
│
frontend/src/
├── components/
│   └── Dashboard/
│       ├── Dashboard.tsx
│       └── __tests__/
│           └── Dashboard.test.tsx
├── stores/
│   └── __tests__/
│       └── authStore.test.ts
└── test-utils/             # Testing utilities
    ├── index.ts
    ├── server.ts           # MSW server setup
    └── factories.ts        # Test data factories
```

## Running Tests

### Development Commands
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- RoutingService.test.ts

# Run tests matching pattern
npm test -- --grep "should handle error"
```

### CI/CD Integration
- Tests run automatically on PR creation
- Coverage reports uploaded to Codecov
- Coverage thresholds enforced
- PR comments show coverage changes

## Debugging Tests

### Debug Failed Tests
```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run single test with debug
npm test -- --grep "specific test" --reporter=verbose
```

### Common Issues
1. **Async Tests Timing Out**: Use proper `await` and `waitFor`
2. **Mock Not Working**: Check mock placement and imports
3. **DOM Not Updated**: Use `waitFor` for async updates
4. **State Not Reset**: Clear mocks and reset state in `beforeEach`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

This guide is a living document. Update it as we discover new patterns and best practices during our 50% coverage initiative.