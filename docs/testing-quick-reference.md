# Testing Quick Reference

## 🚀 Quick Start Templates

### Backend Service Test Template
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceName } from '../../services/ServiceName';

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

const mockPrisma = {
  model: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    service = new ServiceName(mockPrisma);
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      mockPrisma.model.findUnique.mockResolvedValue(mockData);

      // Act
      const result = await service.methodName('test-id');

      // Assert
      expect(result).toEqual(mockData);
    });
  });
});
```

### Frontend Component Test Template
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ComponentName } from '../ComponentName';

vi.mock('@/api/module', () => ({
  apiFunction: vi.fn(),
}));

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);

    await user.click(screen.getByRole('button', { name: /click me/i }));

    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument();
    });
  });
});
```

## 🔧 Common Patterns

### Prisma Mocking
```typescript
// Single model mock
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    workOrder: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  })),
}));

// Transaction mock
mockPrisma.$transaction = vi.fn().mockImplementation(async (callback) => {
  return callback(mockPrisma);
});
```

### API Mocking (MSW)
```typescript
import { rest } from 'msw';
import { server } from '@/test-utils/server';

// In test
server.use(
  rest.get('/api/data', (req, res, ctx) => {
    return res(ctx.json({ data: mockData }));
  })
);
```

### Form Testing
```typescript
const user = userEvent.setup();

// Fill form
await user.type(screen.getByLabelText(/name/i), 'Test Name');
await user.selectOptions(screen.getByLabelText(/type/i), 'option1');
await user.click(screen.getByRole('button', { name: /submit/i }));

// Check results
expect(mockSubmit).toHaveBeenCalledWith({
  name: 'Test Name',
  type: 'option1'
});
```

### Async Testing
```typescript
// Wait for async updates
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Test loading states
expect(screen.getByText('Loading...')).toBeInTheDocument();
```

## 📋 Coverage Targets

| Type | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| Backend Services | 70-80% | 65-75% | 75-85% | 70-80% |
| Frontend Components | 60-70% | 60-70% | 65-75% | 60-70% |

## 🧪 Test Scenarios Checklist

### Backend Services
- [ ] Happy path (success cases)
- [ ] Error handling (network, validation, not found)
- [ ] Input validation (required fields, types, ranges)
- [ ] Business logic validation
- [ ] Database transaction handling
- [ ] External service integration

### Frontend Components
- [ ] Rendering with default props
- [ ] Rendering with various prop combinations
- [ ] User interactions (click, type, select)
- [ ] Form validation and submission
- [ ] Loading states
- [ ] Error states
- [ ] Accessibility (ARIA, keyboard navigation)

## 🎯 Common Queries

### React Testing Library Queries
```typescript
// Preferred queries (accessible)
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/email/i)
screen.getByText(/welcome/i)

// Fallback queries
screen.getByTestId('submit-button')
screen.getByDisplayValue('current value')

// Query variants
screen.getByText()    // Throws if not found
screen.queryByText()  // Returns null if not found
screen.findByText()   // Async, waits for element
```

### User Events
```typescript
const user = userEvent.setup();

await user.click(element)
await user.type(input, 'text')
await user.selectOptions(select, 'option1')
await user.upload(fileInput, file)
await user.keyboard('{Enter}')
await user.hover(element)
```

## ⚡ Quick Commands

```bash
# Run specific test file
npm test RoutingService.test.ts

# Run tests matching pattern
npm test -- --grep "should handle error"

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Debug mode
npm test -- --reporter=verbose
```

## 🚨 Common Gotchas

### ❌ Don't
```typescript
// Don't test implementation details
expect(component.state.loading).toBe(true);

// Don't use generic selectors
screen.getByTestId('button');

// Don't forget to await async operations
user.click(button); // Missing await

// Don't mock everything
vi.mock('./SomeComponent'); // Unnecessary
```

### ✅ Do
```typescript
// Test user-visible behavior
expect(screen.getByText('Loading...')).toBeInTheDocument();

// Use semantic queries
screen.getByRole('button', { name: /submit/i });

// Always await user interactions
await user.click(button);

// Mock external dependencies only
vi.mock('@/api/client');
```

## 🔍 Debugging

### Check What's Rendered
```typescript
import { screen } from '@testing-library/react';

// Debug current DOM
screen.debug();

// Debug specific element
screen.debug(screen.getByRole('button'));

// Get all elements
screen.logTestingPlaygroundURL();
```

### Mock Debugging
```typescript
// Check if mock was called
expect(mockFunction).toHaveBeenCalled();
expect(mockFunction).toHaveBeenCalledWith(expectedArgs);
expect(mockFunction).toHaveBeenCalledTimes(2);

// See all mock calls
console.log(mockFunction.mock.calls);
```

## 📁 File Locations

```
Backend Tests:     src/tests/services/ServiceName.test.ts
Frontend Tests:    frontend/src/components/Group/__tests__/Component.test.tsx
Store Tests:       frontend/src/stores/__tests__/store.test.ts
Hook Tests:        frontend/src/hooks/__tests__/hook.test.ts
Utils Tests:       src/tests/utils/utilName.test.ts
```

## 🏷️ Issue Labels

- `type: backend-test` - Backend service tests
- `type: frontend-test` - Frontend component tests
- `priority: P1-critical` - Mission critical
- `priority: P2-high` - High business value
- `coverage: 10%` - Milestone 1
- `epic: backend-phase1` - Simple services epic

---

💡 **Pro Tip**: Start with the issue templates in `.github/ISSUE_TEMPLATE/` for consistent test creation!