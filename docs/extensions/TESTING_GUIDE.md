# Testing Guide

## Table of Contents

- [Introduction](#introduction)
- [Testing Strategy](#testing-strategy)
- [Unit Testing](#unit-testing)
- [Component Testing](#component-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Accessibility Testing](#accessibility-testing)
- [Visual Regression Testing](#visual-regression-testing)
- [Test Coverage](#test-coverage)
- [Mock Data and Fixtures](#mock-data-and-fixtures)
- [Permission Testing](#permission-testing)
- [Best Practices](#best-practices)

## Introduction

Comprehensive testing ensures your extension is reliable, maintainable, and provides a great user experience. This guide covers all aspects of testing extensions, from unit tests to end-to-end scenarios.

### Testing Philosophy

- **Test behavior, not implementation**: Focus on what users experience
- **Write tests first**: TDD helps clarify requirements
- **Keep tests simple**: Each test should verify one thing
- **Make tests readable**: Tests are documentation
- **Test at the right level**: Use the appropriate testing layer

### Testing Pyramid

```
        /\
       /  \
      / E2E \          <- Few, slow, expensive
     /--------\
    /          \
   / Integration\     <- Some, medium speed
  /--------------\
 /                \
/   Unit Tests     \  <- Many, fast, cheap
--------------------
```

Target distribution:
- **70%** Unit tests
- **20%** Integration tests
- **10%** E2E tests

## Testing Strategy

### What to Test

#### Critical Paths
- User registration and authentication
- Core feature workflows
- Data persistence
- Permission checks
- Error handling

#### Edge Cases
- Empty states
- Maximum limits
- Invalid inputs
- Network failures
- Permission denied scenarios

#### Accessibility
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- ARIA attributes

### Test Organization

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── Button.stories.tsx
│   └── ...
├── hooks/
│   ├── usePermission.ts
│   └── usePermission.test.ts
├── utils/
│   ├── validation.ts
│   └── validation.test.ts
└── __tests__/
    ├── integration/
    │   └── workflow.test.ts
    └── e2e/
        └── user-journey.spec.ts
```

## Unit Testing

### Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
        '**/*.test.{ts,tsx}',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';

// Extend matchers
expect.extend(toHaveNoViolations);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### Testing Utilities

```typescript
// src/utils/validation.ts
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}
```

```typescript
// src/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, formatCurrency } from './validation';

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('@nodomain.com')).toBe(false);
    expect(validateEmail('spaces in@email.com')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(validateEmail('')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('should validate a strong password', () => {
    const result = validatePassword('SecurePass123');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject password that is too short', () => {
    const result = validatePassword('Short1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  it('should reject password without uppercase', () => {
    const result = validatePassword('nocapital123');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain an uppercase letter');
  });

  it('should reject password without lowercase', () => {
    const result = validatePassword('NOLOWER123');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain a lowercase letter');
  });

  it('should reject password without number', () => {
    const result = validatePassword('NoNumbers');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain a number');
  });

  it('should return multiple errors for weak password', () => {
    const result = validatePassword('weak');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('formatCurrency', () => {
  it('should format USD by default', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('should format different currencies', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
    expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should handle negative amounts', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
  });

  it('should round to 2 decimal places', () => {
    expect(formatCurrency(1234.567)).toBe('$1,234.57');
  });
});
```

### Testing Custom Hooks

```typescript
// src/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  return [storedValue, setValue];
}
```

```typescript
// src/hooks/useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('should return stored value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('stored');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
  });

  it('should handle complex objects', () => {
    const initialValue = { name: 'John', age: 30 };
    const { result } = renderHook(() => useLocalStorage('user', initialValue));

    act(() => {
      result.current[1]({ name: 'Jane', age: 25 });
    });

    expect(result.current[0]).toEqual({ name: 'Jane', age: 25 });
  });

  it('should handle localStorage errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock localStorage.getItem to throw error
    Storage.prototype.getItem = vi.fn(() => {
      throw new Error('QuotaExceeded');
    });

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    expect(result.current[0]).toBe('initial');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
```

### Testing Async Functions

```typescript
// src/api/users.ts
export async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
}

export async function createUser(data: { name: string; email: string }) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create user: ${response.statusText}`);
  }

  return response.json();
}
```

```typescript
// src/api/users.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchUser, createUser } from './users';

describe('fetchUser', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should fetch user successfully', async () => {
    const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const user = await fetchUser('1');

    expect(fetch).toHaveBeenCalledWith('/api/users/1');
    expect(user).toEqual(mockUser);
  });

  it('should throw error on failed fetch', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    await expect(fetchUser('999')).rejects.toThrow('Failed to fetch user: Not Found');
  });

  it('should handle network errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchUser('1')).rejects.toThrow('Network error');
  });
});

describe('createUser', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should create user successfully', async () => {
    const userData = { name: 'John Doe', email: 'john@example.com' };
    const mockResponse = { id: '1', ...userData };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const user = await createUser(userData);

    expect(fetch).toHaveBeenCalledWith('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    expect(user).toEqual(mockResponse);
  });
});
```

## Component Testing

### React Testing Library Setup

```typescript
// src/test/utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PermissionProvider } from '@/contexts/PermissionContext';

interface AllTheProvidersProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <ThemeProvider>
      <PermissionProvider>
        {children}
      </PermissionProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

### Basic Component Tests

```typescript
// src/components/Button/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'medium', isLoading = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`button button--${variant} button--${size}`}
        disabled={isLoading || props.disabled}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? 'Loading...' : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

```typescript
// src/components/Button/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { axe } from 'jest-axe';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick} disabled>Click me</Button>);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    render(<Button isLoading>Click me</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Loading...');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('should apply variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('button--primary');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('button--secondary');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('button--danger');
  });

  it('should apply size classes', () => {
    const { rerender } = render(<Button size="small">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('button--small');

    rerender(<Button size="medium">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('button--medium');

    rerender(<Button size="large">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('button--large');
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<Button>Accessible Button</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Form Component Tests

```typescript
// src/components/Form/LoginForm.tsx
import { useState } from 'react';
import { validateEmail } from '@/utils/validation';

interface LoginFormProps {
  onSubmit: (data: { email: string; password: string }) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ email, password });
      setErrors({});
    } catch (error) {
      setErrors({ submit: 'Login failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <div id="email-error" role="alert">
            {errors.email}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && (
          <div id="password-error" role="alert">
            {errors.password}
          </div>
        )}
      </div>

      {errors.submit && (
        <div role="alert">{errors.submit}</div>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  );
}
```

```typescript
// src/components/Form/LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should render form fields', () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('should show error for invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    expect(await screen.findByText(/invalid email format/i)).toBeInTheDocument();
  });

  it('should call onSubmit with valid data', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /log in/i });

    await user.type(emailInput, 'user@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });
  });

  it('should show loading state during submission', async () => {
    const handleSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log in/i })).not.toBeDisabled();
    });
  });

  it('should show error message on submission failure', async () => {
    const handleSubmit = vi.fn().mockRejectedValue(new Error('Login failed'));
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText(/login failed/i)).toBeInTheDocument();
  });
});
```

### Testing Components with Context

```typescript
// src/components/UserProfile/UserProfile.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { UserProfile } from './UserProfile';

function renderWithPermissions(ui: React.ReactElement, permissions: string[]) {
  return render(
    <PermissionProvider initialPermissions={permissions}>
      {ui}
    </PermissionProvider>
  );
}

describe('UserProfile', () => {
  it('should show edit button for users with edit permission', () => {
    renderWithPermissions(<UserProfile />, ['user.edit']);

    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  });

  it('should not show edit button without permission', () => {
    renderWithPermissions(<UserProfile />, ['user.view']);

    expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
  });

  it('should show delete button for admins only', () => {
    renderWithPermissions(<UserProfile />, ['user.delete']);

    expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
  });
});
```

## Integration Testing

Integration tests verify that multiple components work together correctly.

### Testing User Workflows

```typescript
// src/__tests__/integration/user-registration.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
import { server } from '@/test/mocks/server';
import { rest } from 'msw';

describe('User Registration Flow', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('should complete full registration flow', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Navigate to registration
    const registerLink = screen.getByRole('link', { name: /register/i });
    await user.click(registerLink);

    // Fill in registration form
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'SecurePass123');
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123');
    await user.type(screen.getByLabelText(/name/i), 'John Doe');

    // Accept terms
    await user.click(screen.getByLabelText(/accept terms/i));

    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
    });

    // Verify navigation to dashboard
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });
  });

  it('should handle registration errors', async () => {
    server.use(
      rest.post('/api/register', (req, res, ctx) => {
        return res(
          ctx.status(400),
          ctx.json({ error: 'Email already exists' })
        );
      })
    );

    const user = userEvent.setup();
    render(<App />);

    const registerLink = screen.getByRole('link', { name: /register/i });
    await user.click(registerLink);

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'SecurePass123');
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123');
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.click(screen.getByLabelText(/accept terms/i));

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });
});
```

### Testing API Integration

```typescript
// src/test/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/users/:id', (req, res, ctx) => {
    const { id } = req.params;

    return res(
      ctx.status(200),
      ctx.json({
        id,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      })
    );
  }),

  rest.post('/api/users', async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.status(201),
      ctx.json({
        id: '123',
        ...body,
      })
    );
  }),

  rest.post('/api/login', async (req, res, ctx) => {
    const { email, password } = await req.json();

    if (email === 'user@example.com' && password === 'password123') {
      return res(
        ctx.status(200),
        ctx.json({
          token: 'fake-jwt-token',
          user: {
            id: '1',
            email: 'user@example.com',
            name: 'John Doe',
          },
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({ error: 'Invalid credentials' })
    );
  }),
];
```

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
```

## End-to-End Testing

### Cypress Setup

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
  },
  env: {
    apiUrl: 'http://localhost:3001',
  },
});
```

```typescript
// cypress/support/commands.ts
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="submit-button"]').click();
    cy.url().should('include', '/dashboard');
  });
});

Cypress.Commands.add('seedDatabase', () => {
  cy.request('POST', `${Cypress.env('apiUrl')}/test/seed`);
});

Cypress.Commands.add('clearDatabase', () => {
  cy.request('POST', `${Cypress.env('apiUrl')}/test/clear`);
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      seedDatabase(): Chainable<void>;
      clearDatabase(): Chainable<void>;
    }
  }
}
```

### E2E Test Examples

```typescript
// cypress/e2e/user-journey.cy.ts
describe('Complete User Journey', () => {
  beforeEach(() => {
    cy.clearDatabase();
    cy.seedDatabase();
  });

  it('should allow user to register, login, and use extension', () => {
    // Registration
    cy.visit('/register');
    cy.get('[data-testid="name-input"]').type('John Doe');
    cy.get('[data-testid="email-input"]').type('john@example.com');
    cy.get('[data-testid="password-input"]').type('SecurePass123');
    cy.get('[data-testid="confirm-password-input"]').type('SecurePass123');
    cy.get('[data-testid="accept-terms"]').check();
    cy.get('[data-testid="submit-button"]').click();

    // Verify success
    cy.contains('Account created successfully').should('be.visible');
    cy.url().should('include', '/dashboard');

    // Logout
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();

    // Login again
    cy.login('john@example.com', 'SecurePass123');

    // Use extension features
    cy.get('[data-testid="create-item-button"]').click();
    cy.get('[data-testid="item-name"]').type('Test Item');
    cy.get('[data-testid="item-description"]').type('Test Description');
    cy.get('[data-testid="save-item"]').click();

    // Verify item was created
    cy.contains('Test Item').should('be.visible');

    // Edit item
    cy.get('[data-testid="edit-item"]').first().click();
    cy.get('[data-testid="item-name"]').clear().type('Updated Item');
    cy.get('[data-testid="save-item"]').click();

    // Verify update
    cy.contains('Updated Item').should('be.visible');
    cy.contains('Test Item').should('not.exist');
  });

  it('should handle errors gracefully', () => {
    cy.visit('/login');

    // Try invalid credentials
    cy.get('[data-testid="email-input"]').type('wrong@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="submit-button"]').click();

    // Verify error message
    cy.contains('Invalid credentials').should('be.visible');
    cy.url().should('include', '/login');
  });

  it('should be keyboard accessible', () => {
    cy.visit('/');

    // Tab through navigation
    cy.get('body').tab();
    cy.focused().should('have.attr', 'href', '/dashboard');

    cy.get('body').tab();
    cy.focused().should('have.attr', 'href', '/settings');

    // Press Enter to navigate
    cy.focused().type('{enter}');
    cy.url().should('include', '/settings');
  });
});
```

## Accessibility Testing

### Automated Accessibility Tests

```typescript
// src/components/Modal/Modal.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@/test/utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Modal } from './Modal';

expect.extend(toHaveNoViolations);

describe('Modal Accessibility', () => {
  it('should have no accessibility violations when open', async () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA attributes', () => {
    const { getByRole } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    const dialog = getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });
});
```

### Manual Accessibility Tests

```typescript
// cypress/e2e/accessibility.cy.ts
import 'cypress-axe';

describe('Accessibility', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('should have no accessibility violations on homepage', () => {
    cy.checkA11y();
  });

  it('should be keyboard navigable', () => {
    cy.get('body').tab();
    cy.focused().should('have.attr', 'href');

    cy.get('body').tab().tab().tab();
    cy.focused().type('{enter}');
  });

  it('should have sufficient color contrast', () => {
    cy.checkA11y(null, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
  });
});
```

## Visual Regression Testing

### Percy Setup

```typescript
// cypress/e2e/visual.cy.ts
describe('Visual Regression Tests', () => {
  it('should match homepage snapshot', () => {
    cy.visit('/');
    cy.percySnapshot('Homepage');
  });

  it('should match dashboard snapshot', () => {
    cy.login('user@example.com', 'password123');
    cy.visit('/dashboard');
    cy.percySnapshot('Dashboard');
  });

  it('should match modal snapshot', () => {
    cy.visit('/');
    cy.get('[data-testid="open-modal"]').click();
    cy.percySnapshot('Modal Open');
  });
});
```

## Test Coverage

### Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stories.{ts,tsx}',
        'src/test/**',
        'src/**/*.d.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

### Running Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Best Practices

1. **Aim for 80%+ coverage** but focus on meaningful tests
2. **Don't test implementation details**
3. **Cover edge cases** and error scenarios
4. **Test critical paths** thoroughly
5. **Ignore auto-generated code** from coverage

## Mock Data and Fixtures

### Creating Mock Data

```typescript
// src/test/fixtures/users.ts
import { User } from '@/types';

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: '1',
  email: 'user@example.com',
  name: 'John Doe',
  role: 'user',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

export const mockUsers: User[] = [
  createMockUser({ id: '1', name: 'John Doe', role: 'user' }),
  createMockUser({ id: '2', name: 'Jane Smith', role: 'admin' }),
  createMockUser({ id: '3', name: 'Bob Johnson', role: 'user' }),
];
```

```typescript
// src/test/fixtures/products.ts
export const createMockProduct = (overrides?: Partial<Product>): Product => ({
  id: '1',
  name: 'Test Product',
  description: 'A test product',
  price: 99.99,
  inStock: true,
  ...overrides,
});
```

### Using Factories

```typescript
// src/test/factories/userFactory.ts
import { faker } from '@faker-js/faker';
import { User } from '@/types';

export class UserFactory {
  static create(overrides?: Partial<User>): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: 'user',
      createdAt: faker.date.past(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<User>): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createAdmin(overrides?: Partial<User>): User {
    return this.create({ role: 'admin', ...overrides });
  }
}

// Usage in tests
const user = UserFactory.create();
const admin = UserFactory.createAdmin();
const users = UserFactory.createMany(10);
```

## Permission Testing

### Testing Permission Hooks

```typescript
// src/hooks/usePermission.test.ts
import { renderHook } from '@testing-library/react';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { usePermission } from './usePermission';

function wrapper({ children }) {
  return (
    <PermissionProvider initialPermissions={['user.view', 'user.edit']}>
      {children}
    </PermissionProvider>
  );
}

describe('usePermission', () => {
  it('should return true for granted permission', () => {
    const { result } = renderHook(() => usePermission('user.view'), { wrapper });
    expect(result.current.hasPermission).toBe(true);
  });

  it('should return false for denied permission', () => {
    const { result } = renderHook(() => usePermission('user.delete'), { wrapper });
    expect(result.current.hasPermission).toBe(false);
  });

  it('should handle multiple permissions', () => {
    const { result } = renderHook(
      () => usePermission(['user.view', 'user.edit']),
      { wrapper }
    );
    expect(result.current.hasPermission).toBe(true);
  });
});
```

### Testing RBAC Scenarios

```typescript
// src/__tests__/integration/permissions.test.tsx
describe('Role-Based Access Control', () => {
  it('should show admin features to admins only', () => {
    const adminWrapper = ({ children }) => (
      <PermissionProvider initialPermissions={['admin.access']}>
        {children}
      </PermissionProvider>
    );

    const userWrapper = ({ children }) => (
      <PermissionProvider initialPermissions={['user.view']}>
        {children}
      </PermissionProvider>
    );

    const { getByText } = render(<Dashboard />, { wrapper: adminWrapper });
    expect(getByText(/admin panel/i)).toBeInTheDocument();

    const { queryByText } = render(<Dashboard />, { wrapper: userWrapper });
    expect(queryByText(/admin panel/i)).not.toBeInTheDocument();
  });
});
```

## Best Practices

### Test Organization

1. **Group related tests** using describe blocks
2. **Use descriptive test names** that explain the expected behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Keep tests independent**: Each test should run in isolation
5. **Clean up after tests**: Reset state, clear mocks

### Writing Effective Tests

```typescript
// Good: Descriptive, focused test
it('should display error message when email is invalid', async () => {
  const user = userEvent.setup();
  render(<LoginForm onSubmit={vi.fn()} />);

  await user.type(screen.getByLabelText(/email/i), 'invalid-email');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(await screen.findByText(/invalid email format/i)).toBeInTheDocument();
});

// Bad: Vague, tests multiple things
it('should work correctly', async () => {
  render(<LoginForm onSubmit={vi.fn()} />);
  // ... lots of actions and assertions
});
```

### Common Patterns

```typescript
// Use data-testid sparingly, prefer accessible queries
// Good
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email/i);
screen.getByText(/welcome/i);

// Okay (when no better option)
screen.getByTestId('submit-button');

// Custom render with providers
function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  window.history.pushState({}, 'Test page', route);

  return render(ui, { wrapper: BrowserRouter });
}

// Reusable test utilities
async function fillLoginForm(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/password/i), password);
  await user.click(screen.getByRole('button', { name: /submit/i }));
}
```

### Performance Testing

```typescript
// Test rendering performance
it('should render large list efficiently', () => {
  const items = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
  }));

  const start = performance.now();
  render(<LargeList items={items} />);
  const end = performance.now();

  expect(end - start).toBeLessThan(100); // Should render in under 100ms
});
```

### Debugging Tests

```typescript
// Use screen.debug() to see rendered output
it('should render correctly', () => {
  render(<MyComponent />);
  screen.debug(); // Prints DOM to console
});

// Use logRoles to see available roles
it('should have correct roles', () => {
  const { container } = render(<MyComponent />);
  logRoles(container);
});

// Use prettyDOM for specific elements
it('should render button', () => {
  render(<MyComponent />);
  const button = screen.getByRole('button');
  console.log(prettyDOM(button));
});
```

---

## Summary

Effective testing requires:

1. **Comprehensive strategy**: Unit, integration, and E2E tests
2. **Right tool for the job**: Vitest for unit, React Testing Library for components, Cypress for E2E
3. **80%+ coverage**: Focus on meaningful tests, not just numbers
4. **Accessibility testing**: Automated and manual checks
5. **Mock data**: Reusable fixtures and factories
6. **Permission testing**: Verify RBAC scenarios
7. **CI/CD integration**: Run tests automatically
8. **Maintainable tests**: Clear, focused, and independent

Remember: Tests are documentation. Write them to help future developers understand your code's intended behavior.
