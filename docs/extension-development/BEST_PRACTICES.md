# MachShop Extension Best Practices

**Version**: 2.0.0

Proven patterns and practices for building high-quality MachShop extensions.

## Table of Contents

1. [Code Organization](#code-organization)
2. [Error Handling](#error-handling)
3. [Performance Optimization](#performance-optimization)
4. [Security](#security)
5. [Testing Strategy](#testing-strategy)
6. [Documentation](#documentation)
7. [Version Management](#version-management)
8. [Common Patterns](#common-patterns)

## Code Organization

### File Structure

Organize code by feature:

```
src/
├── components/          # React components
│   ├── ProductionDashboard/
│   │   ├── index.tsx
│   │   ├── ProductionDashboard.tsx
│   │   ├── ProductionStats.tsx
│   │   └── ProductionChart.tsx
│   └── WorkOrderForm/
│       ├── index.tsx
│       └── WorkOrderForm.tsx
├── hooks/              # Custom hooks
│   ├── useProductionData.ts
│   ├── useWorkOrderUpdates.ts
│   └── useFormValidation.ts
├── stores/             # Zustand stores
│   └── productionStore.ts
├── services/           # API clients
│   ├── api.ts
│   └── workOrderService.ts
├── types/              # TypeScript types
│   ├── index.ts
│   └── models.ts
├── utils/              # Utilities
│   ├── formatting.ts
│   └── validation.ts
└── constants/          # Constants
    └── index.ts
```

### Export Patterns

Use index.ts for clean imports:

```typescript
// src/hooks/index.ts
export { useProductionData } from './useProductionData';
export { useWorkOrderUpdates } from './useWorkOrderUpdates';

// Usage
import { useProductionData, useWorkOrderUpdates } from './hooks';
```

## Error Handling

### Try-Catch with Logging

Always log errors for debugging:

```typescript
// ✅ CORRECT
async function fetchData() {
  try {
    const data = await api.getData();
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.logger.error('Failed to fetch data', { error: message });
    throw error; // Re-throw after logging
  }
}

// ❌ WRONG: Silent failures
async function fetchData() {
  try {
    return await api.getData();
  } catch (error) {
    console.log('Error'); // No context
  }
}
```

### Error Boundaries

Wrap components with error boundaries:

```typescript
import { Component, ReactNode } from 'react';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('Error caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}

// Usage
export function MyExtension() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### API Error Handling

Handle API errors gracefully:

```typescript
// ✅ CORRECT: Specific error handling
async function submitForm(data) {
  try {
    const response = await apiClient.post('/submit', data);
    message.success('Submitted successfully');
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      // Validation error
      message.error('Invalid input: ' + error.response.data.message);
    } else if (error.response?.status === 401) {
      // Auth error
      redirectToLogin();
    } else if (error.response?.status === 500) {
      // Server error
      message.error('Server error. Please contact support.');
    } else {
      // Network error
      message.error('Network error. Please try again.');
    }
    context.logger.error('Submission failed', error);
  }
}
```

## Performance Optimization

### React Optimization

```typescript
// ✅ CORRECT: Memoized expensive calculations
export function DataTable({ items, sortBy }) {
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return aVal > bVal ? 1 : -1;
    });
  }, [items, sortBy]);

  return <Table dataSource={sortedItems} />;
}

// ✅ CORRECT: Stable callbacks
export function ProductionList({ onUpdate }) {
  const handleUpdate = useCallback((id) => {
    onUpdate(id);
  }, [onUpdate]);

  return <List onUpdate={handleUpdate} />;
}

// ✅ CORRECT: Memoized components
const ListItem = memo(({ item, onUpdate }) => {
  return <Item item={item} onUpdate={onUpdate} />;
});
```

### Network Optimization

```typescript
// ✅ CORRECT: Cache queries
const { data } = useQuery({
  queryKey: ['workorders'],
  queryFn: () => api.getWorkOrders(),
  staleTime: 5 * 60 * 1000, // 5 minute cache
  gcTime: 10 * 60 * 1000,    // Keep in memory 10 mins
});

// ✅ CORRECT: Batch requests
async function loadDashboard() {
  const [orders, equipment, materials] = await Promise.all([
    api.getWorkOrders(),
    api.getEquipment(),
    api.getMaterials(),
  ]);
  return { orders, equipment, materials };
}

// ✅ CORRECT: Pagination for large lists
<Table
  dataSource={items}
  pagination={{ pageSize: 20, total: 1000 }}
/>
```

### Bundle Size

```typescript
// ✅ CORRECT: Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));

export function Dashboard() {
  return (
    <Suspense fallback={<Spin />}>
      <HeavyChart />
    </Suspense>
  );
}

// ✅ CORRECT: Tree-shaking compatible imports
import { Button, Form } from 'antd'; // Only imports used components

// ❌ WRONG: Imports entire library
import * as antd from 'antd'; // Bloats bundle
```

## Security

### Input Validation

```typescript
// ✅ CORRECT: Validate all inputs
const validateWorkOrderId = (id: string): boolean => {
  // Check format (WO-12345)
  if (!/^WO-\d{5}$/.test(id)) {
    return false;
  }
  // Check length
  if (id.length > 20) {
    return false;
  }
  return true;
};

// ✅ CORRECT: Sanitize form inputs
const handleSubmit = (values) => {
  // Trim and validate
  const sanitized = {
    name: values.name.trim(),
    description: values.description?.trim() || '',
  };

  if (!sanitized.name) {
    throw new Error('Name required');
  }

  return api.submit(sanitized);
};
```

### XSS Prevention

```typescript
// ❌ WRONG: Dangerous HTML rendering
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ CORRECT: Safe text rendering
<div>{userInput}</div>

// ✅ CORRECT: Use libraries for HTML rendering
import DOMPurify from 'dompurify';
<div>{DOMPurify.sanitize(html)}</div>
```

### CSRF Protection

```typescript
// ✅ CORRECT: Use CSRF tokens in API client
apiClient.interceptors.request.use((config) => {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (token) {
    config.headers['X-CSRF-Token'] = token;
  }
  return config;
});
```

### Environment Variables

```typescript
// ✅ CORRECT: Use environment variables
const API_URL = process.env.REACT_APP_API_URL;
const API_KEY = process.env.REACT_APP_API_KEY;

// ❌ WRONG: Hard-coded secrets
const API_KEY = 'sk-1234567890abcdef'; // Exposed!
```

## Testing Strategy

### Unit Tests

```typescript
// src/__tests__/utils.test.ts
import { validateWorkOrderId } from '../utils/validation';

describe('Validation', () => {
  it('should accept valid work order ID', () => {
    expect(validateWorkOrderId('WO-12345')).toBe(true);
  });

  it('should reject invalid format', () => {
    expect(validateWorkOrderId('INVALID')).toBe(false);
  });

  it('should reject too long ID', () => {
    expect(validateWorkOrderId('WO-' + 'X'.repeat(30))).toBe(false);
  });
});
```

### Component Tests

```typescript
// src/__tests__/components/WorkOrderForm.test.tsx
import { render, screen, userEvent } from '@testing-library/react';
import { ExtensionContextProvider, createExtensionContext } from '@machshop/frontend-extension-sdk';
import WorkOrderForm from '../components/WorkOrderForm';

describe('WorkOrderForm', () => {
  const context = createExtensionContext({
    userPermissions: ['workorders:write'],
  });

  it('should submit valid form', async () => {
    const onSubmit = jest.fn();

    render(
      <ExtensionContextProvider value={context}>
        <WorkOrderForm onSubmit={onSubmit} />
      </ExtensionContextProvider>
    );

    const input = screen.getByLabelText('Work Order ID');
    await userEvent.type(input, 'WO-12345');

    const button = screen.getByText('Submit');
    await userEvent.click(button);

    expect(onSubmit).toHaveBeenCalledWith('WO-12345');
  });
});
```

### Integration Tests

```typescript
// Test with real API mocking
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/workorders', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 'WO-1', status: 'new' },
        { id: 'WO-2', status: 'in_progress' },
      ])
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('should load work orders', async () => {
  render(<WorkOrderList />);

  expect(await screen.findByText('WO-1')).toBeInTheDocument();
});
```

## Documentation

### Comment Code

Document complex logic:

```typescript
/**
 * Calculate production efficiency score
 *
 * Formula: (completed / total) * quality_factor
 *
 * @param completed - Number of completed items
 * @param total - Total items produced
 * @param qualityFactor - Quality adjustment (0-1)
 * @returns Efficiency score (0-100)
 */
function calculateEfficiency(
  completed: number,
  total: number,
  qualityFactor: number
): number {
  if (total === 0) return 0;
  return (completed / total) * qualityFactor * 100;
}
```

### README

Create comprehensive README:

```markdown
# My Production Extension

## Features
- Real-time production monitoring
- Equipment status tracking
- Performance analytics

## Installation
npm install

## Development
npm run dev

## Testing
npm run test

## Building
npm run build
```

### Type Documentation

```typescript
/**
 * Work Order data model
 */
interface WorkOrder {
  /** Unique work order identifier */
  id: string;

  /** Current status: new, in_progress, completed, on_hold, cancelled */
  status: 'new' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

  /** When order was created */
  createdAt: Date;

  /** Priority level 1-5 (1=lowest) */
  priority: number;
}
```

## Version Management

### Semantic Versioning

Follow semver: MAJOR.MINOR.PATCH

```json
{
  "version": "2.1.3"
}
```

- **MAJOR** (2): Breaking changes
- **MINOR** (1): New features
- **PATCH** (3): Bug fixes

### Changelog

```markdown
# Changelog

## [2.1.3] - 2024-12-15
### Fixed
- Fixed production chart calculation bug

## [2.1.2] - 2024-12-10
### Added
- New equipment status widget

## [2.1.1] - 2024-12-05
### Fixed
- Dark mode theme support
```

## Common Patterns

### Loading State Management

```typescript
// ✅ CORRECT: Three states pattern
const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
const [data, setData] = useState(null);
const [error, setError] = useState(null);

useEffect(() => {
  const loadData = async () => {
    setState('loading');
    try {
      const result = await api.fetch();
      setData(result);
      setState('success');
    } catch (err) {
      setError(err);
      setState('error');
    }
  };

  loadData();
}, []);

return state === 'loading' ? <Spinner /> :
       state === 'success' ? <Content data={data} /> :
       state === 'error' ? <Error error={error} /> :
       null;
```

### Controlled Form Component

```typescript
// ✅ CORRECT: Controlled input
export function WorkOrderForm() {
  const [formData, setFormData] = useState({ id: '', status: '' });

  const handleChange = useCallback((e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }, []);

  return (
    <Form onFinish={() => api.submit(formData)}>
      <Form.Item name="id">
        <Input
          value={formData.id}
          onChange={handleChange}
          placeholder="Work Order ID"
        />
      </Form.Item>
    </Form>
  );
}
```

### Data Fetching Pattern

```typescript
// ✅ CORRECT: React Query pattern
export function WorkOrdersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['workorders'],
    queryFn: () => api.getWorkOrders(),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error error={error} />;

  return <Table data={data} />;
}
```

### Modal Dialog Pattern

```typescript
// ✅ CORRECT: Modal state management
export function EditWorkOrder({ id }) {
  const [visible, setVisible] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    await api.updateWorkOrder(id, values);
    message.success('Updated');
    setVisible(false);
  };

  return (
    <>
      <Button onClick={() => setVisible(true)}>Edit</Button>
      <Modal
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleSubmit}>
          <Form.Item name="status" label="Status">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
```

## Checklist

Before releasing an extension:

- [ ] Code follows TypeScript strict mode
- [ ] Uses only Ant Design components
- [ ] All colors use design tokens
- [ ] All spacing uses design tokens
- [ ] WCAG 2.1 AA compliant
- [ ] Dark mode supported
- [ ] Error handling for all async operations
- [ ] Loading states for all data fetches
- [ ] Empty states for no data
- [ ] Input validation and sanitization
- [ ] No hard-coded configuration
- [ ] Tests for critical features
- [ ] Documentation complete
- [ ] README with setup instructions
- [ ] Bundle size < 500 KB
- [ ] Performance optimized (memoization, caching)
- [ ] No console logs in production
- [ ] Security best practices followed
- [ ] Version bumped appropriately
- [ ] Changelog updated
