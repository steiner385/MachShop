# Extension Framework v2.0 - Troubleshooting Guide & FAQ

**Framework Version**: 2.0.0
**Last Updated**: November 1, 2024
**Status**: Production Ready

## Table of Contents

1. [Troubleshooting Guide](#troubleshooting-guide)
2. [Common Issues](#common-issues)
3. [FAQ](#faq)
4. [Performance Issues](#performance-issues)
5. [Security Issues](#security-issues)
6. [Accessibility Issues](#accessibility-issues)
7. [Deployment Issues](#deployment-issues)
8. [Getting Help](#getting-help)

## Troubleshooting Guide

### Issue: Extension Won't Load

**Symptoms**:
- `Failed to load extension` error
- Extension doesn't appear in UI
- Console shows network errors

**Diagnosis Steps**:

1. **Verify Manifest File**
```bash
npm run validate:extension
```

Expected output:
```
✅ Manifest validation passed
✅ Component validation passed
✅ Navigation validation passed
```

2. **Check File Permissions**
```bash
ls -la manifest.json
# Should show read permissions for your user
```

3. **Review Error Logs**
```bash
# Check browser console for detailed errors
# Look for: "Failed to load extension: [reason]"
```

4. **Verify File Path**
```bash
# Ensure extension path is correct
file /path/to/extension/manifest.json
```

**Solution**:

```json
✅ Valid Manifest Example:
{
  "id": "my-extension",
  "name": "My Extension",
  "version": "1.0.0",
  "manifest_version": "2.0.0",
  "components": [],
  "navigation": []
}
```

If manifest is invalid:
- Add missing required fields
- Fix JSON syntax errors
- Verify field types and formats
- Ensure IDs are lowercase alphanumeric

### Issue: Component Not Rendering

**Symptoms**:
- Component registered but not visible
- Widget slot is empty
- Component appears in devtools but not on page

**Diagnosis Steps**:

1. **Verify Component Registration**
```typescript
const status = await sdk.getExtensionStatus(extensionId);
console.log('Extension status:', status);

const components = await sdk.getComponents(extensionId);
console.log('Registered components:', components);
```

2. **Check Slot Name**
```json
❌ Wrong:
{
  "id": "my-widget",
  "type": "widget",
  "slot": "non-existent-slot"
}

✅ Correct:
{
  "id": "my-widget",
  "type": "widget",
  "slot": "dashboard-main-slot"
}
```

3. **Verify Component Export**
```typescript
// ❌ Wrong - default export
export default MyComponent;

// ✅ Correct - also support named exports
export const MyComponent = () => {};
```

4. **Check Permissions**
```typescript
// Verify user has required permissions
const userPermissions = ['read:dashboard'];
const requiredPermissions = ['read:dashboard', 'read:sales'];

const hasAccess = requiredPermissions.every(
  p => userPermissions.includes(p)
);
console.log('User has access:', hasAccess);
```

5. **Review Browser Console**
```javascript
// Look for:
// - React errors
// - Module not found
// - Undefined component
// - Permission denied
```

**Solution**:

```typescript
// Example: Properly registered widget
{
  id: 'sales-widget',
  type: 'widget',
  slot: 'dashboard-main-slot',
  title: 'Sales Widget',
  permissions: ['read:dashboard'],
  component: SalesWidget
}

// Proper component definition
export const SalesWidget: React.FC = () => {
  if (!someData) return <div>Loading...</div>;
  return <div>{/* content */}</div>;
};
```

### Issue: State Not Updating

**Symptoms**:
- Store updates don't trigger re-renders
- Component shows stale data
- State mutations aren't working

**Diagnosis Steps**:

1. **Verify Store Creation**
```typescript
// ❌ Wrong - creating store in component
const MyComponent = () => {
  const store = create((set) => ({...}));
};

// ✅ Correct - create store outside component
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}));

const MyComponent = () => {
  const { count, increment } = useStore();
};
```

2. **Check Selector Dependencies**
```typescript
// ❌ Wrong - missing dependency
useEffect(() => {
  store.updateData();
  // Missing store in dependency array
}, []);

// ✅ Correct - proper dependencies
useEffect(() => {
  store.updateData();
}, [store]);
```

3. **Verify State Mutation**
```typescript
// ❌ Wrong - mutating state directly
store.setState((state) => {
  state.data.push(newItem);
  return state;
});

// ✅ Correct - immutable updates
store.setState((state) => ({
  data: [...state.data, newItem]
}));
```

4. **Review Zustand Devtools**
```typescript
// Enable devtools
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools((set) => ({...}))
);

// View in Redux DevTools browser extension
```

**Solution**:

```typescript
// Properly configured store
const useStore = create<StoreState>((set) => ({
  data: null,
  loading: false,

  fetchData: async () => {
    set({ loading: true });
    try {
      const data = await api.fetch();
      set({ data, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  }
}));

// Properly using store
const MyComponent = () => {
  const { data, loading, fetchData } = useStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div>Loading...</div>;
  return <div>{data}</div>;
};
```

### Issue: Permission Denied

**Symptoms**:
- Feature works locally but not in production
- User sees "Permission Denied" error
- Navigation item doesn't appear for some users

**Diagnosis Steps**:

1. **Check User Permissions**
```typescript
// Get current user permissions
const userPermissions = await sdk.getUserPermissions();
console.log('User permissions:', userPermissions);

// Check if user has required permission
const hasPermission = userPermissions.includes('read:dashboard');
console.log('Has read:dashboard?', hasPermission);
```

2. **Verify Manifest Permissions**
```json
{
  "id": "my-component",
  "type": "widget",
  "permissions": ["read:dashboard"]
}

// Ensure permission names match exactly (case-sensitive)
// Common permissions:
// - read:dashboard
// - read:sales
// - write:content
// - admin:system
```

3. **Check Permission Assignment**
```typescript
// Ensure admin has assigned permissions to user
// Ask admin to check user role in admin panel
```

4. **Review Audit Logs**
```bash
npm run logs:permission-denied
# Shows all permission denied events
```

**Solution**:

```typescript
// Graceful permission handling
const MyComponent = () => {
  const [hasPermission, setHasPermission] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const perms = await sdk.getUserPermissions();
        setHasPermission(perms.includes('read:dashboard'));
      } catch (error) {
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, []);

  if (loading) return <div>Checking permissions...</div>;
  if (!hasPermission) return <div>You don't have permission to view this</div>;

  return <div>{/* content */}</div>;
};
```

## Common Issues

### Issue: "Cannot find module" Error

**Cause**: Missing dependency installation

**Fix**:
```bash
# Install missing package
npm install @machshop/frontend-extension-sdk

# Or install all dependencies
npm install
```

### Issue: "Unexpected token" Error

**Cause**: JavaScript/TypeScript syntax error

**Fix**:
1. Check line number in error message
2. Verify JSX syntax
3. Check for missing semicolons or braces
4. Run `npm run build` for better error messages

### Issue: "Timeout" Error

**Cause**: Extension takes too long to load

**Fix**:
1. Check network speed
2. Optimize component initialization
3. Lazy load components
4. Check browser network tab for slow requests

### Issue: Memory Leak

**Cause**: Resources not properly cleaned up

**Fix**:
```typescript
// ❌ Wrong - no cleanup
useEffect(() => {
  const interval = setInterval(() => {
    updateData();
  }, 1000);
});

// ✅ Correct - cleanup function
useEffect(() => {
  const interval = setInterval(() => {
    updateData();
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

### Issue: CORS Error

**Cause**: Cross-origin request blocked

**Fix**:
```typescript
// ❌ Wrong
const response = await fetch('https://other-domain.com/api');

// ✅ Correct - use proxy or correct CORS headers
const response = await fetch('/api/proxy?url=https://other-domain.com/api');
```

## FAQ

### Q: How do I update my extension to a new version?

**A**: Follow the deployment procedure:

```bash
# 1. Update version in manifest.json
# 2. Update version in package.json
# 3. Build new version
npm run build

# 4. Deploy
npm run deploy -- --target production

# 5. If issues, rollback
npm run deploy:rollback --version 1.0.0
```

### Q: Can I have multiple extensions active at once?

**A**: Yes! The framework supports multiple concurrent extensions:

```typescript
// Load multiple extensions
const ext1 = await sdk.loadExtension(manifest1);
const ext2 = await sdk.loadExtension(manifest2);

// They operate independently
await sdk.activateExtension(ext1.id);
await sdk.activateExtension(ext2.id);
```

### Q: How do I debug my extension?

**A**: Use browser devtools:

```typescript
// Add debugging logs
const logger = Logger.getLogger('MyExtension');
logger.debug('Variable value:', myVar);

// Use browser devtools
// F12 → Console → Look for logs with [MyExtension] prefix

// Use Redux DevTools for state debugging
// F12 → Extensions → Redux DevTools
```

### Q: What's the maximum extension size?

**A**: Recommended limits:

```
- Uncompressed code: < 5MB
- Compressed (gzip): < 1MB
- Included assets: < 10MB
- Total deployment: < 20MB
```

If larger, consider:
- Code splitting
- Lazy loading
- External assets

### Q: Can I use external libraries?

**A**: Yes, with considerations:

```json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "moment": "^2.29.0"
  }
}
```

**Guidelines**:
- ✅ Use npm packages
- ✅ Pin versions
- ❌ Avoid large monoliths
- ❌ Don't bundle duplicate libraries

### Q: How do I handle errors gracefully?

**A**: Implement error boundaries and logging:

```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

export const MyComponent = () => (
  <ErrorBoundary
    FallbackComponent={ErrorFallback}
    onError={(error, errorInfo) => {
      logger.error('Component error', { error, errorInfo });
    }}
  >
    <RiskyComponent />
  </ErrorBoundary>
);
```

### Q: How do I test my extension locally?

**A**: Set up local development:

```bash
# 1. Create local development environment
npm run dev

# 2. Point framework to local extension
npm run dev -- --extension-path ./dist

# 3. Open in browser
# http://localhost:3000

# 4. Make changes and hot reload works
```

### Q: Can I override existing components?

**A**: Yes, using Component Override Framework:

```typescript
import { ComponentOverrideFramework } from '@machshop/component-override-framework';

const overrideFramework = new ComponentOverrideFramework();

await overrideFramework.registerComponentOverride({
  targetComponent: 'StandardTable',
  replacementComponent: MyCustomTable,
  priority: 100,
  fallback: StandardTable
});
```

### Q: How do I share data between extensions?

**A**: Use shared state management:

```typescript
import { getSharedStore } from '@machshop/state-management-framework';

// Extension A
const sharedStore = getSharedStore('dashboard');
sharedStore.setSalesData(data);

// Extension B
const sharedStore = getSharedStore('dashboard');
const salesData = sharedStore.getSalesData();
```

### Q: What are the performance targets?

**A**: Framework achieves:

```
- Extension initialization: < 2 seconds
- Component load: < 500ms per component
- Widget render: < 500ms
- Navigation query: < 100ms
- Memory per extension: ~6.5MB
```

## Performance Issues

### Issue: Slow Component Load

**Diagnosis**:
```typescript
// Measure component load time
const start = performance.now();
// load component
const end = performance.now();
console.log(`Load time: ${end - start}ms`);
```

**Solutions**:
1. **Lazy load components**
```typescript
const MyComponent = React.lazy(() => import('./MyComponent'));
```

2. **Optimize imports**
```typescript
// ❌ Wrong - imports entire library
import * as lodash from 'lodash';

// ✅ Correct - import only what's needed
import debounce from 'lodash/debounce';
```

3. **Cache API responses**
```typescript
const cache = new Map();

const fetchData = async (url) => {
  if (cache.has(url)) {
    return cache.get(url);
  }
  const data = await fetch(url).then(r => r.json());
  cache.set(url, data);
  return data;
};
```

## Security Issues

### Issue: XSS Vulnerability

**Cause**: Using innerHTML with user input

**Fix**:
```typescript
// ❌ Wrong - vulnerable
element.innerHTML = userInput;

// ✅ Correct - safe
element.textContent = userInput;

// ✅ Or sanitize HTML
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

### Issue: Hardcoded Secrets

**Cause**: API keys in code

**Fix**:
```typescript
// ❌ Wrong - hardcoded
const apiKey = 'sk_live_abc123';

// ✅ Correct - use environment variables
const apiKey = process.env.REACT_APP_API_KEY;
```

## Accessibility Issues

### Issue: Missing Alt Text

**Cause**: Images without alternatives

**Fix**:
```tsx
// ❌ Wrong
<img src="/logo.png" />

// ✅ Correct
<img src="/logo.png" alt="Company Logo" />
```

### Issue: Missing Form Labels

**Cause**: Inputs without associated labels

**Fix**:
```tsx
// ❌ Wrong
<input type="email" placeholder="Enter email" />

// ✅ Correct
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

## Deployment Issues

### Issue: Deployment Failed

**Steps**:
1. Check logs: `npm run logs:deployment`
2. Verify manifest: `npm run validate:extension`
3. Test locally: `npm run dev`
4. Retry deployment: `npm run deploy`

### Issue: Rollback Failed

**Steps**:
1. Check previous version: `npm run deployment:history`
2. Manually restore: `npm run deploy:rollback --version X.Y.Z`
3. Verify restoration: `npm run deployment:status`

## Getting Help

### Resources

- **Documentation**: See `docs/DEVELOPER_INTEGRATION_GUIDE.md`
- **API Reference**: See `docs/API_REFERENCE.md`
- **Examples**: Check `examples/` directory
- **Tests**: Review `src/__tests__/` for patterns

### Support

- **Issues**: Report on GitHub
- **Slack**: #extension-framework channel
- **Email**: framework-support@example.com
- **Office Hours**: Tuesday 2-3 PM EST

### Reporting Issues

Include in bug report:
```
1. Framework version
2. Extension ID and version
3. Error message and stack trace
4. Steps to reproduce
5. Expected vs actual behavior
6. Browser/environment details
```

Example:
```
Framework: 2.0.0
Extension: my-extension v1.0.0
Error: "Cannot find module '@machshop/sdk'"
Steps: npm install && npm build && npm deploy
Expected: Successful deployment
Actual: Build fails with module error
Environment: Node 18.0.0, npm 8.0.0
```

---

**Last Updated**: November 1, 2024
**Framework Version**: 2.0.0
