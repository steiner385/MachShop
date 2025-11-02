# Troubleshooting Guide

## Table of Contents

- [Common Issues](#common-issues)
- [Error Messages](#error-messages)
- [Debug Techniques](#debug-techniques)
- [Performance Issues](#performance-issues)
- [Accessibility Problems](#accessibility-problems)
- [State Management Issues](#state-management-issues)
- [Build and Deployment](#build-and-deployment)
- [Getting Help](#getting-help)

## Common Issues

### Extension Not Loading

**Symptoms**: Extension doesn't appear in the application

**Possible Causes**:
1. Invalid manifest file
2. Missing required permissions
3. Entry point not found
4. Build errors

**Solutions**:

```bash
# Check manifest validation
npm run validate-manifest

# Verify build output
npm run build
ls -la dist/

# Check console for errors
# Open browser DevTools (F12) and look for errors
```

**Manifest Issues**:
```json
// ❌ Invalid manifest
{
  "id": "my-extension",
  "version": "1.0.0"
  // Missing required fields
}

// ✅ Valid manifest
{
  "$schema": "https://machshop.dev/schemas/extension-manifest-v2.json",
  "manifestVersion": 2,
  "id": "my-extension",
  "version": "1.0.0",
  "name": "My Extension",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "entryPoint": "dist/index.js",
  "permissions": []
}
```

### Component Not Rendering

**Symptoms**: Component exists but doesn't display

**Common Causes**:

1. **Missing Return Statement**
```typescript
// ❌ No return
function MyComponent() {
  const data = fetchData();
  <div>{data}</div>; // Missing return!
}

// ✅ With return
function MyComponent() {
  const data = fetchData();
  return <div>{data}</div>;
}
```

2. **Conditional Rendering Issues**
```typescript
// ❌ Returns undefined
function MyComponent({ show }) {
  if (!show) {
    return; // Returns undefined
  }
  return <div>Content</div>;
}

// ✅ Returns null
function MyComponent({ show }) {
  if (!show) {
    return null;
  }
  return <div>Content</div>;
}
```

3. **Missing Key Props**
```typescript
// ❌ Missing keys in list
{items.map(item => (
  <div>{item.name}</div>
))}

// ✅ With unique keys
{items.map(item => (
  <div key={item.id}>{item.name}</div>
))}
```

### Permission Denied Errors

**Symptoms**: "Permission denied" errors when accessing features

**Debug Steps**:

```typescript
// Add debug logging
import { usePermission } from '@machshop/extension-sdk';

function DebugPermissions() {
  const { permissions, hasPermission } = usePermissionContext();

  console.log('Available permissions:', permissions);
  console.log('Has edit permission:', hasPermission('content.edit'));

  return (
    <div>
      <h3>Debug Info</h3>
      <pre>{JSON.stringify(permissions, null, 2)}</pre>
    </div>
  );
}
```

**Solutions**:

1. **Update Manifest Permissions**
```json
{
  "permissions": [
    "storage.read",
    "storage.write",
    "api.user.read",
    "content.edit"  // Add missing permission
  ]
}
```

2. **Check Server-Side Permissions**
```typescript
// Ensure server grants the same permissions
// Check API responses for permission data
```

3. **Verify Role Assignment**
```typescript
// Check user's role includes required permissions
const { userRole } = useRole();
console.log('User role:', userRole);
console.log('Role permissions:', ROLE_PERMISSIONS[userRole]);
```

### Hook Errors

**Symptoms**: "Invalid hook call" or "Hooks can only be called inside function components"

**Common Mistakes**:

```typescript
// ❌ Hook in class component
class MyComponent extends React.Component {
  render() {
    const data = useData(); // Error!
    return <div>{data}</div>;
  }
}

// ❌ Hook in regular function
function getData() {
  const data = useData(); // Error!
  return data;
}

// ❌ Conditional hook
function MyComponent({ condition }) {
  if (condition) {
    const data = useData(); // Error!
  }
  return <div>Content</div>;
}

// ✅ Hook in functional component
function MyComponent() {
  const data = useData();
  return <div>{data}</div>;
}

// ✅ Custom hook
function useCustomData() {
  const data = useData();
  return data;
}
```

### State Not Updating

**Symptoms**: UI doesn't update when state changes

**Common Causes**:

1. **Direct State Mutation**
```typescript
// ❌ Mutating state directly
const [items, setItems] = useState([]);

function addItem(item) {
  items.push(item); // Don't mutate!
  setItems(items);  // React won't detect change
}

// ✅ Creating new array
function addItem(item) {
  setItems([...items, item]);
}
```

2. **Stale Closure**
```typescript
// ❌ Stale closure
const [count, setCount] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setCount(count + 1); // Always uses initial count
  }, 1000);
  return () => clearInterval(interval);
}, []); // Empty deps

// ✅ Functional update
useEffect(() => {
  const interval = setInterval(() => {
    setCount(c => c + 1); // Always uses latest count
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

3. **Object/Array Reference**
```typescript
// ❌ Same reference
const [user, setUser] = useState({ name: 'John' });

function updateName(name) {
  user.name = name;
  setUser(user); // Same reference, no update
}

// ✅ New reference
function updateName(name) {
  setUser({ ...user, name });
}
```

## Error Messages

### "Cannot read property of undefined"

**Full Error**: `TypeError: Cannot read property 'X' of undefined`

**Common Causes**:
- Accessing properties before data loads
- Missing null checks
- Incorrect data structure

**Solutions**:

```typescript
// ❌ No null check
function UserProfile({ user }) {
  return <div>{user.name}</div>; // Error if user is undefined
}

// ✅ Optional chaining
function UserProfile({ user }) {
  return <div>{user?.name ?? 'Loading...'}</div>;
}

// ✅ Early return
function UserProfile({ user }) {
  if (!user) {
    return <div>Loading...</div>;
  }
  return <div>{user.name}</div>;
}

// ✅ Default props
function UserProfile({ user = { name: 'Guest' } }) {
  return <div>{user.name}</div>;
}
```

### "Maximum update depth exceeded"

**Full Error**: `Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.`

**Common Causes**:
- setState in render
- Infinite useEffect loop
- Event handler creating new function

**Solutions**:

```typescript
// ❌ setState in render
function BadComponent() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // Causes infinite loop
  return <div>{count}</div>;
}

// ❌ Missing dependencies
function BadComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(setData); // Runs on every render
  }); // Missing deps array

  return <div>{data}</div>;
}

// ✅ Proper useEffect
function GoodComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(setData);
  }, []); // Empty deps - runs once

  return <div>{data}</div>;
}

// ❌ Creating new function reference
function BadComponent() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Effect runs every render because onClick changes
  }, [{ onClick: () => setCount(count + 1) }]);
}

// ✅ Memoized callback
function GoodComponent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  useEffect(() => {
    // Effect runs once
  }, [handleClick]);
}
```

### "Objects are not valid as a React child"

**Full Error**: `Error: Objects are not valid as a React child (found: object with keys {x, y}). If you meant to render a collection of children, use an array instead.`

**Common Causes**:
- Trying to render an object
- Missing .map() in array rendering
- Incorrect return value

**Solutions**:

```typescript
// ❌ Rendering object
function BadComponent() {
  const user = { name: 'John', age: 30 };
  return <div>{user}</div>; // Error!
}

// ✅ Rendering object property
function GoodComponent() {
  const user = { name: 'John', age: 30 };
  return <div>{user.name}</div>;
}

// ✅ Stringify for debugging
function DebugComponent() {
  const user = { name: 'John', age: 30 };
  return <pre>{JSON.stringify(user, null, 2)}</pre>;
}

// ❌ Missing .map()
function BadList() {
  const items = [{ id: 1, name: 'Item 1' }];
  return <div>{items}</div>; // Error!
}

// ✅ Using .map()
function GoodList() {
  const items = [{ id: 1, name: 'Item 1' }];
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

### "Cannot find module"

**Full Error**: `Error: Cannot find module '@/components/Button'`

**Solutions**:

1. **Check Path Alias Configuration**
```typescript
// vite.config.ts
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});

// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

2. **Verify File Exists**
```bash
# Check if file exists
ls src/components/Button.tsx

# Check for case sensitivity
# Button.tsx vs button.tsx
```

3. **Check Import Extension**
```typescript
// ❌ With extension (may not work)
import { Button } from '@/components/Button.tsx';

// ✅ Without extension
import { Button } from '@/components/Button';
```

## Debug Techniques

### React DevTools

**Installation**:
- Chrome: [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- Firefox: [React DevTools](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

**Usage**:

1. **Inspect Component Props and State**
   - Open DevTools (F12)
   - Go to "Components" tab
   - Select component
   - View props, state, hooks

2. **Component Profiler**
   - Go to "Profiler" tab
   - Click record
   - Interact with app
   - Stop recording
   - Analyze render times

### Console Logging

```typescript
// Basic logging
console.log('Debug:', value);

// Grouped logs
console.group('User Data');
console.log('Name:', user.name);
console.log('Email:', user.email);
console.groupEnd();

// Table format
console.table(users);

// Conditional logging
if (process.env.NODE_ENV === 'development') {
  console.debug('Development only log');
}

// Custom logger
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};

logger.info('Extension initialized');
```

### Debug Component

```typescript
// Create debug component
function DebugPanel({ data, label = 'Debug' }) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <details style={{ margin: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
      <summary>{label}</summary>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}

// Usage
function MyComponent() {
  const [state, setState] = useState({});
  const { config } = useExtension();

  return (
    <div>
      <h1>My Component</h1>
      <DebugPanel data={state} label="Component State" />
      <DebugPanel data={config} label="Extension Config" />
    </div>
  );
}
```

### Network Debugging

```typescript
// Log API calls
async function fetchData() {
  console.log('Fetching data...');

  try {
    const response = await fetch('/api/data');
    console.log('Response status:', response.status);

    const data = await response.json();
    console.log('Response data:', data);

    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Intercept fetch
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  console.log('Fetch:', args[0]);
  const response = await originalFetch(...args);
  console.log('Response:', response.status, args[0]);
  return response;
};
```

### Error Boundaries

```typescript
// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

## Performance Issues

### Slow Rendering

**Symptoms**: UI feels sluggish, low frame rate

**Debug**:

```typescript
// Use React Profiler
import { Profiler } from 'react';

function App() {
  const onRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    console.log({
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
    });
  };

  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <MyComponent />
    </Profiler>
  );
}
```

**Solutions**:

```typescript
// 1. Memoize expensive components
const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // Expensive rendering logic
  return <div>{processData(data)}</div>;
});

// 2. Memoize expensive calculations
function MyComponent({ data }) {
  const processedData = useMemo(() => {
    return expensiveCalculation(data);
  }, [data]);

  return <div>{processedData}</div>;
}

// 3. Virtualize long lists
import { FixedSizeList } from 'react-window';

function LongList({ items }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>{items[index]}</div>
      )}
    </FixedSizeList>
  );
}
```

### Memory Leaks

**Symptoms**: Memory usage increases over time, app slows down

**Common Causes**:

```typescript
// ❌ Not cleaning up event listeners
function BadComponent() {
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    // Missing cleanup!
  }, []);
}

// ✅ Cleanup in useEffect
function GoodComponent() {
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
}

// ❌ Not clearing timers
function BadComponent() {
  useEffect(() => {
    setInterval(() => {
      console.log('Tick');
    }, 1000);
    // Missing cleanup!
  }, []);
}

// ✅ Clear timers
function GoodComponent() {
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Tick');
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);
}
```

## Accessibility Problems

### Missing ARIA Labels

**Detection**:
```bash
# Run axe accessibility testing
npm install --save-dev @axe-core/cli
npx axe http://localhost:3000
```

**Solutions**:
```typescript
// Add missing labels
<button aria-label="Close dialog">
  <XIcon />
</button>

<img src="/icon.png" alt="Settings icon" />

<input
  id="email"
  type="email"
  aria-label="Email address"
/>
```

### Keyboard Navigation Issues

**Testing**:
- Tab through all interactive elements
- Verify focus indicators are visible
- Test escape key closes modals
- Test arrow keys in lists

**Solutions**:
```typescript
// Ensure focusable elements have visible focus
button:focus {
  outline: 3px solid #1a73e8;
  outline-offset: 2px;
}

// Trap focus in modals
function Modal({ isOpen, onClose }) {
  const modalRef = useRef();

  useEffect(() => {
    if (!isOpen) return;

    const trapFocus = (e) => {
      if (e.key === 'Tab') {
        // Focus trap logic
      }
    };

    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [isOpen]);

  return <div ref={modalRef}>...</div>;
}
```

## State Management Issues

### State Out of Sync

**Debug**:
```typescript
// Log state changes
useEffect(() => {
  console.log('State updated:', state);
}, [state]);

// Use React DevTools to inspect state
```

**Solutions**:
```typescript
// Use reducer for complex state
function useComplexState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // All updates go through reducer
  const updateField = (field, value) => {
    dispatch({ type: 'UPDATE_FIELD', field, value });
  };

  return { state, updateField };
}
```

## Build and Deployment

### Build Failures

**Check build output**:
```bash
npm run build -- --verbose

# Check for TypeScript errors
npx tsc --noEmit

# Check for linting errors
npm run lint
```

### Deployment Issues

**Verify manifest**:
```bash
# Validate manifest
npm run validate-manifest

# Check file sizes
ls -lh dist/
```

## Getting Help

### Before Asking for Help

1. **Check Documentation**
   - [API Reference](./API_REFERENCE.md)
   - [Examples](./examples/)
   - [FAQ](./FAQ.md)

2. **Search Existing Issues**
   - [GitHub Issues](https://github.com/machshop/extensions/issues)

3. **Gather Information**
   - Extension version
   - SDK version
   - Error messages
   - Steps to reproduce
   - Browser and OS

### How to Ask for Help

```markdown
**Environment:**
- Extension SDK: 2.0.0
- React: 18.2.0
- Browser: Chrome 120
- OS: macOS 14

**Issue:**
Extension fails to load with error: "Cannot find module '@/components/Button'"

**Steps to Reproduce:**
1. Install extension
2. Navigate to dashboard
3. Extension fails to load

**Expected Behavior:**
Extension should load and display dashboard widget

**Actual Behavior:**
Console shows module not found error

**Additional Context:**
- Works in development mode
- Only fails in production build
- [Attached screenshot of error]
```

### Support Channels

1. **Documentation**: Check guides and API docs
2. **GitHub Issues**: Report bugs and request features
3. **Discord**: Community support and discussions
4. **Email**: support@machshop.dev for priority support
5. **Stack Overflow**: Tag questions with `machshop-extensions`

---

## Summary

When troubleshooting:

1. **Check Console**: Look for error messages first
2. **Use DevTools**: React DevTools for component inspection
3. **Debug Systematically**: Isolate the problem
4. **Check Common Issues**: Review this guide
5. **Search Documentation**: Check API docs and examples
6. **Ask for Help**: Provide complete information

Remember: Most issues have simple solutions. Take time to debug systematically before asking for help.
